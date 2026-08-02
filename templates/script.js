(() => {
  "use strict";

  const EMOTIONS = [
    { key: "happy",    name: "Happy",    emoji: "😊", varName: "--happy",    softVarName: "--happy-soft" },
    { key: "sad",      name: "Sad",      emoji: "😢", varName: "--sad",      softVarName: "--sad-soft" },
    { key: "angry",    name: "Angry",    emoji: "😠", varName: "--angry",    softVarName: "--angry-soft" },
    { key: "fear",     name: "Fear",     emoji: "😨", varName: "--fear",     softVarName: "--fear-soft" },
    { key: "surprise", name: "Surprise", emoji: "😲", varName: "--surprise", softVarName: "--surprise-soft" },
    { key: "neutral",  name: "Neutral",  emoji: "😐", varName: "--neutral",  softVarName: "--neutral-soft" },
    { key: "disgust",  name: "Disgust",  emoji: "🤢", varName: "--disgust",  softVarName: "--disgust-soft" },
  ];

  const emotionByKey = (key) => EMOTIONS.find((e) => e.key === key);

  /* ----------------------------------------------------------
     STATE
  ----------------------------------------------------------- */
  const state = {
    current: null,
    hasUploadedThisSession: false,
    activeHistoryKey: null,
  };

  /* ----------------------------------------------------------
     DOM SHORTCUTS
  ----------------------------------------------------------- */
  const $ = (id) => document.getElementById(id);

  const screenSelect = $("screen-select");
  const screenPractice = $("screen-practice");
  const emotionGrid = $("emotion-grid");
  const historyList = $("history-list");
  const chatMessages = $("chat-messages");
  const chatScroll = $("chat-scroll");
  const badgeEmoji = $("badge-emoji");
  const badgeName = $("badge-name");
  const fileInput = $("file-input");
  const uploadBtn = $("upload-btn");
  const textInput = $("text-input");
  const sendBtn = $("send-btn");
  const backBtn = $("back-btn");
  const newPracticeBtn = $("new-practice-btn");

  /* ----------------------------------------------------------
     UTILITIES
  ----------------------------------------------------------- */
  const randInt = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;

  function scrollToBottom() {
    requestAnimationFrame(() => {
      chatScroll.scrollTop = chatScroll.scrollHeight;
    });
  }

  // Small ripple effect for buttons — purely decorative, self-cleaning.
  function attachRipple(el) {
    el.style.position = el.style.position || "relative";
    el.addEventListener("click", (e) => {
      const rect = el.getBoundingClientRect();
      const ripple = document.createElement("span");
      const size = Math.max(rect.width, rect.height) * 1.4;
      ripple.className = "ripple";
      ripple.style.width = ripple.style.height = `${size}px`;
      ripple.style.left = `${(e.clientX ?? rect.left + rect.width / 2) - rect.left - size / 2}px`;
      ripple.style.top = `${(e.clientY ?? rect.top + rect.height / 2) - rect.top - size / 2}px`;
      el.appendChild(ripple);
      ripple.addEventListener("animationend", () => ripple.remove());
    });
  }

  // Generates a small SVG data-URI "photo" so history sessions have
  // something to display without needing real uploaded images.
  function placeholderPhoto(emo) {
    const svg = `
      <svg xmlns="http://www.w3.org/2000/svg" width="220" height="220">
        <defs>
          <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stop-color="var(${emo.varName})" stop-opacity="0.85"/>
            <stop offset="1" stop-color="var(${emo.varName})" stop-opacity="0.55"/>
          </linearGradient>
        </defs>
        <rect width="220" height="220" rx="16" fill="#EDEBF6"/>
        <rect width="220" height="220" rx="16" fill="url(#g)"/>
        <text x="50%" y="54%" font-size="72" text-anchor="middle" dominant-baseline="middle">${emo.emoji}</text>
      </svg>`;
    // Resolve the CSS variable to a concrete colour since data URIs render
    // outside document style context.
    const resolved = getComputedStyle(document.documentElement).getPropertyValue(emo.varName).trim() || "#5D3FD3";
    const finalSvg = svg.replace(new RegExp(`var\\(${emo.varName}\\)`, "g"), resolved);
    return `data:image/svg+xml;utf8,${encodeURIComponent(finalSvg)}`;
  }

  /* ----------------------------------------------------------
     RENDER: EMOTION GRID (Screen 1)
  ----------------------------------------------------------- */
  function renderEmotionGrid() {
    emotionGrid.innerHTML = "";
    EMOTIONS.forEach((emo, i) => {
      const card = document.createElement("button");
      card.type = "button";
      card.className = "emotion-card";
      card.style.setProperty("--card-color", `var(${emo.varName})`);
      card.style.setProperty("--card-soft", `var(${emo.softVarName})`);
      card.style.animationDelay = `${i * 45}ms`;
      card.setAttribute("aria-label", `Practice ${emo.name}`);
      card.innerHTML = `
        <span class="emotion-card-emoji" aria-hidden="true">${emo.emoji}</span>
        <span class="emotion-card-name">${emo.name}</span>
      `;
      card.addEventListener("click", () => startPractice(emo));
      attachRipple(card);
      emotionGrid.appendChild(card);
    });
  }

  /* ----------------------------------------------------------
     SCREEN TRANSITIONS
  ----------------------------------------------------------- */
  function goToSelect(emo) {
    screenPractice.classList.remove("is-active");
    addAssistantText(`
        <p>Great choice! Today we're practicing <strong>${emo.name}</strong>.</p>
        <p>Upload a selfie showing the expression you'd like other people to perceive.</p>
        <p>When you're ready, press the upload button below.</p>
      `);
    screenSelect.classList.add("is-active");
  }

  function startPractice(emo) {
    state.current = emo;
    state.hasUploadedThisSession = false;

    // Tint the whole practice screen to this emotion's identity colour.
    screenPractice.style.setProperty("--current", `var(${emo.varName})`);
    screenPractice.style.setProperty("--current-soft", `var(${emo.softVarName})`);

    badgeEmoji.textContent = emo.emoji;
    badgeName.textContent = emo.name;

    chatMessages.innerHTML = "";
    textInput.value = "";
    sendBtn.disabled = true;

    screenSelect.classList.remove("is-active");
    screenPractice.classList.add("is-active");

    scrollToBottom();
    textInput.focus({ preventScroll: true });
  }

  /* ----------------------------------------------------------
     MESSAGE RENDERING
  ----------------------------------------------------------- */
  function cloneTpl(id) {
    return document.getElementById(id).content.firstElementChild.cloneNode(true);
  }

  function addAssistantText(html) {
    const node = cloneTpl("tpl-assistant-text");
    node.querySelector(".msg-bubble-assistant").innerHTML = html;
    chatMessages.appendChild(node);
    scrollToBottom();
    return node;
  }

  function addUserText(text) {
    const node = cloneTpl("tpl-user-text");
    node.querySelector(".msg-bubble-user").textContent = text;
    chatMessages.appendChild(node);
    scrollToBottom();
    return node;
  }

  function addUserImage(src) {
    const node = cloneTpl("tpl-user-image");
    node.querySelector(".msg-image").src = src;
    chatMessages.appendChild(node);
    scrollToBottom();
    return node;
  }

  function showTyping() {
    const node = cloneTpl("tpl-typing");
    chatMessages.appendChild(node);
    scrollToBottom();
    return node;
  }

  function hideTyping(node) {
    if (node && node.parentNode) node.remove();
  }

  function showUploadEmptyState() {
    const div = document.createElement("div");
    div.className = "empty-state";
    div.id = "upload-empty-state";
    div.innerHTML = `
      <div class="empty-state-icon" aria-hidden="true">📷</div>
      <div class="empty-state-title">No photo yet</div>
      <div class="empty-state-sub">Upload a selfie below to get your first expression reading.</div>
    `;
    chatMessages.appendChild(div);
    scrollToBottom();
  }

  function clearUploadEmptyState() {
    const el = $("upload-empty-state");
    if (el) el.remove();
  }

  /* ----------------------------------------------------------
     ANALYSIS CARD
  ----------------------------------------------------------- */
  function generateAnalysis(targetEmo) {

  }

  function addAnalysisCard(analysis) {
    const node = cloneTpl("tpl-analysis-card");
    const { target, detected, confidence, secondary, secondaryPct } = analysis;

    node.querySelector(".stat-target .stat-emoji").textContent = target.emoji;
    node.querySelector(".stat-target .stat-text").textContent = target.name;

    node.querySelector(".stat-detected .stat-emoji").textContent = detected.emoji;
    node.querySelector(".stat-detected .stat-text").textContent = detected.name;

    node.querySelector(".stat-confidence").textContent = `${confidence}%`;

    node.querySelector(".stat-secondary .stat-emoji").textContent = secondary.emoji;
    node.querySelector(".stat-secondary .stat-text").textContent = secondary.name;
    node.querySelector(".stat-secondary-pct").textContent = `${secondaryPct}%`;

    chatMessages.appendChild(node);
    scrollToBottom();

    // Animate the dial in on next frame so the transition actually fires.
    const dialValue = node.querySelector(".dial-value");
    const dialPercent = node.querySelector(".dial-percent");
    const circumference = 263.9;
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        dialValue.style.strokeDashoffset = String(circumference * (1 - confidence / 100));
      });
    });
    animateCount(dialPercent, confidence);

    return node;
  }

  function animateCount(el, target) {
    const duration = 1000;
    const start = performance.now();
    function tick(now) {
      const progress = Math.min(1, (now - start) / duration);
      const eased = 1 - Math.pow(1 - progress, 3);
      el.textContent = `${Math.round(eased * target)}%`;
      if (progress < 1) requestAnimationFrame(tick);
    }
    requestAnimationFrame(tick);
  }

  /* ----------------------------------------------------------
     UPLOAD FLOW
  ----------------------------------------------------------- */
  function handleFile(file) {
    if (!file || !state.current) return;
    clearUploadEmptyState();

    const reader = new FileReader();
    reader.onload = (e) => {
      addUserImage(e.target.result);
      state.hasUploadedThisSession = true;

      const typingNode = showTyping();
      setTimeout(() => {
        hideTyping(typingNode);
        const analysis = generateAnalysis(state.current);
        addAnalysisCard(analysis);

      }, randInt(1700, 2200));
    };
    reader.readAsDataURL(file);
  }

  /* ----------------------------------------------------------
     TEXT CONVERSATION FLOW
  ----------------------------------------------------------- */

  function handleSend() {
    const text = textInput.value.trim();
    if (!text) return;

    addUserText(text);
    textInput.value = "";
    sendBtn.disabled = true;

    const typingNode = showTyping();
    setTimeout(() => {
      hideTyping(typingNode);
      const intent = classifyIntent(text);
      addAssistantText(`<p>${reply}</p>`);
    }, randInt(900, 1500));
  }

  /* ----------------------------------------------------------
     HISTORY SESSION LOADING (fake conversations)
  ----------------------------------------------------------- */
  function loadHistorySession(item) {
    const emo = emotionByKey(item.key);
    startPractice(emo, { fromHistory: true });
    setActiveHistoryItem(item.key);

    addAssistantText(`
      <p>Great choice! Today we're practicing <strong>${emo.name}</strong>.</p>
      <p>Upload a selfie showing the expression you'd like other people to perceive.</p>
      <p>When you're ready, press the upload button below.</p>
    `);

    addUserImage(placeholderPhoto(emo));

    const analysis = generateAnalysis(emo);
    analysis.confidence = item.confidence;
    addAnalysisCard(analysis);

    const message = pick(COACHING_TEMPLATES)({
      target: analysis.target.name,
      detected: analysis.detected.name,
      confidence: analysis.confidence,
      secondaryName: analysis.secondary.name,
      secondaryPct: analysis.secondaryPct,
      isMatch: analysis.isMatch,
    });
    addAssistantText(message);
    state.hasUploadedThisSession = true;
  }

  /* ----------------------------------------------------------
     EVENT BINDINGS
  ----------------------------------------------------------- */
  function bindEvents() {
    backBtn.addEventListener("click", ()=>goToSelect(emo));
    newPracticeBtn.addEventListener("click", ()=>goToSelect(emo));
    attachRipple(backBtn);
    attachRipple(newPracticeBtn);
    attachRipple(uploadBtn);
    attachRipple(sendBtn);

    uploadBtn.addEventListener("click", () => fileInput.click());
    fileInput.addEventListener("change", (e) => {
      const file = e.target.files && e.target.files[0];
      handleFile(file);
      fileInput.value = ""; // allow re-selecting the same file later
    });

    textInput.addEventListener("input", () => {
      sendBtn.disabled = textInput.value.trim().length === 0;
    });
    textInput.addEventListener("keydown", (e) => {
      if (e.key === "Enter" && !sendBtn.disabled) handleSend();
    });
    sendBtn.addEventListener("click", handleSend);
  }

  /* ----------------------------------------------------------
     INIT
  ----------------------------------------------------------- */
  function init() {
    renderEmotionGrid();
    bindEvents();
  }

  document.addEventListener("DOMContentLoaded", init);
})();