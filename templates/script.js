/* ================================================================
   EMOTUNE — APP LOGIC
   Frontend-only simulation: no network calls, no AI. Every "AI"
   response below is randomly selected from hardcoded content pools
   so the app feels alive across repeated sessions.
   ================================================================ */

(() => {
  "use strict";

  /* ----------------------------------------------------------
     DATA
  ----------------------------------------------------------- */

  // Each emotion owns a CSS custom property pair (defined in style.css)
  // so badges, buttons and the confidence dial all re-tint together.
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

  // Coaching message templates, filled in after an "analysis".
  // Kept varied so repeated practice attempts don't feel robotic.
  const COACHING_TEMPLATES = [
    ({ target, detected, confidence, secondaryName, secondaryPct, isMatch }) => `
      <p>${isMatch ? "Nice attempt!" : "Good try!"}</p>
      <p>Your intended expression was <strong>${target}</strong>. ${
        isMatch
          ? `The AI read it as ${detected} too, but only at ${confidence}% confidence.`
          : `The AI actually read it closer to <strong>${detected}</strong>.`
      } It also picked up several <strong>${secondaryName}</strong> characteristics, suggesting your expression could be clearer.</p>
      <p>Try making the ${target.toLowerCase()} expression slightly more pronounced and take another photo.</p>
      <p class="disclaimer">Remember, this tool is designed for practice and learning. A facial expression classifier estimates how an expression may be perceived — it can't determine how someone truly feels.</p>
    `,
    ({ target, detected, confidence, secondaryName, isMatch }) => `
      <p>${isMatch ? "You're on the right track." : "Interesting result."}</p>
      <p>The classifier landed on <strong>${detected}</strong> at ${confidence}% confidence for a <strong>${target}</strong> attempt, with a hint of <strong>${secondaryName}</strong> mixed in.</p>
      <p>A common fix here is to engage more of the face at once — eyes, brows, and mouth together read more clearly than any single feature.</p>
      <p class="disclaimer">Keep in mind this is a practice estimate, not a judgment of how you actually feel.</p>
    `,
    ({ target, confidence, secondaryName, secondaryPct }) => `
      <p>Solid effort on <strong>${target}</strong>.</p>
      <p>Confidence came in at ${confidence}%, with ${secondaryPct}% of the read leaning toward <strong>${secondaryName}</strong>. That overlap is normal — a lot of expressions share muscle movement.</p>
      <p>Exaggerate the expression a touch more than feels natural, hold it for a beat, then snap the next photo.</p>
      <p class="disclaimer">This tool estimates perceived expression only — it isn't reading your actual emotional state.</p>
    `,
    ({ target, detected, confidence, isMatch }) => `
      <p>${isMatch ? "Getting there." : "Worth another go."}</p>
      <p>Target was <strong>${target}</strong>, detected as <strong>${detected}</strong> (${confidence}% confidence). ${
        isMatch
          ? "The core shape is right — now push the intensity up."
          : "The overall shape read as something else, so the intensity or which muscles you're using might need adjusting."
      }</p>
      <p>Try again in even, front-facing light so the AI has a clean view of your whole face.</p>
      <p class="disclaimer">A reminder: this is a learning tool, not a lie detector for emotion.</p>
    `,
    ({ target, secondaryName, secondaryPct, confidence }) => `
      <p>Here's your read for <strong>${target}</strong>.</p>
      <p>Confidence: ${confidence}%. Secondary signal: <strong>${secondaryName}</strong> at ${secondaryPct}%.</p>
      <p>Small adjustments to your eyes usually move the needle the most — they carry a surprising amount of the signal for most expressions.</p>
      <p class="disclaimer">Take this as directional feedback for practice, not a precise emotional readout.</p>
    `,
  ];

  // Follow-up conversation replies, grouped by rough intent.
  const REPLY_POOL = {
    why: [
      "The classifier weighs the eyes, brows and mouth together. If one area was more neutral than the rest, it can pull the overall read toward a blended result.",
      "Lighting and angle both affect this — shadows can flatten the muscle detail the model relies on, even when your expression is strong.",
      "Expressions that share muscle movement (like surprise and fear) often overlap in the model's output, which is likely what happened here.",
    ],
    improve: [
      "Push the intensity slightly past what feels natural — photos tend to compress expressiveness, so a bit of exaggeration reads better on camera.",
      "Try holding the expression for a second or two before the photo. Micro-expressions fade fast, and a held expression photographs more clearly.",
      "Bring your eyes into it, not just your mouth. A smile with flat eyes, for example, often gets read as less confident happiness.",
    ],
    confidence: [
      "Confidence reflects how strongly the detected features matched the target expression's typical pattern — higher isn't 'more real,' just a clearer signal.",
      "A lower confidence score usually means the expression was partially there but blended with another one, rather than being 'wrong.'",
    ],
    secondary: [
      "The secondary emotion is whatever pattern showed up next-most-strongly in the photo. A little bit of overlap is completely normal.",
      "Think of the secondary reading as background noise in the signal — it doesn't cancel out your main expression, just softens its clarity.",
    ],
    fallback: [
      "Good question — want to try another photo so we can compare the two readings side by side?",
      "That's part of what practice is for. Feel free to upload another attempt whenever you're ready.",
      "Fair point. Expression reading is more art than exact science — another attempt often clarifies things.",
      "Happy to keep exploring this with you. Upload a new photo any time to see how it compares.",
    ],
  };

  const FAKE_HISTORY = [
    { key: "happy", label: "Happy Practice",  date: "Yesterday",   confidence: 82 },
    { key: "sad",   label: "Sad Practice",    date: "2 days ago",  confidence: 64 },
    { key: "angry", label: "Angry Practice",  date: "Last week",   confidence: 71 },
  ];

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
  const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
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
     RENDER: SIDEBAR HISTORY
  ----------------------------------------------------------- */
  function renderHistoryList() {
    historyList.innerHTML = "";
    FAKE_HISTORY.forEach((item) => {
      const emo = emotionByKey(item.key);
      const li = document.createElement("li");
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "history-item";
      btn.dataset.key = item.key;
      btn.innerHTML = `
        <span class="history-emoji" aria-hidden="true">${emo.emoji}</span>
        <span class="history-meta">
          <span class="history-name">${item.label}</span>
          <span class="history-date">${item.date}</span>
        </span>
        <span class="history-badge">${item.confidence}%</span>
      `;
      btn.addEventListener("click", () => loadHistorySession(item));
      attachRipple(btn);
      li.appendChild(btn);
      historyList.appendChild(li);
    });
  }

  function setActiveHistoryItem(key) {
    state.activeHistoryKey = key;
    document.querySelectorAll(".history-item").forEach((el) => {
      el.classList.toggle("is-active", el.dataset.key === key);
    });
  }

  /* ----------------------------------------------------------
     SCREEN TRANSITIONS
  ----------------------------------------------------------- */
  function goToSelect() {
    screenPractice.classList.remove("is-active");
    screenSelect.classList.add("is-active");
    setActiveHistoryItem(null);
  }

  function startPractice(emo, { fromHistory = false } = {}) {
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

    if (!fromHistory) {
      setActiveHistoryItem(null);
      addAssistantText(`
        <p>Great choice! Today we're practicing <strong>${emo.name}</strong>.</p>
        <p>Upload a selfie showing the expression you'd like other people to perceive.</p>
        <p>When you're ready, press the upload button below.</p>
      `);
      showUploadEmptyState();
    }

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
    const isMatch = Math.random() < 0.65;
    let detected = targetEmo;
    if (!isMatch) {
      const others = EMOTIONS.filter((e) => e.key !== targetEmo.key);
      detected = pick(others);
    }
    const confidence = isMatch ? randInt(46, 91) : randInt(34, 58);

    const secondaryOptions = EMOTIONS.filter((e) => e.key !== detected.key);
    const secondary = pick(secondaryOptions);
    const secondaryPct = Math.max(12, Math.min(confidence - 6, randInt(15, 42)));

    return { target: targetEmo, detected, confidence, secondary, secondaryPct, isMatch };
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

        setTimeout(() => {
          const includeFull = true;
          const message = pick(COACHING_TEMPLATES)({
            target: analysis.target.name,
            detected: analysis.detected.name,
            confidence: analysis.confidence,
            secondaryName: analysis.secondary.name,
            secondaryPct: analysis.secondaryPct,
            isMatch: analysis.isMatch,
          });
          addAssistantText(message);
        }, 450);
      }, randInt(1700, 2200));
    };
    reader.readAsDataURL(file);
  }

  /* ----------------------------------------------------------
     TEXT CONVERSATION FLOW
  ----------------------------------------------------------- */
  function classifyIntent(text) {
    const t = text.toLowerCase();
    if (/why|wasn'?t|didn'?t/.test(t)) return "why";
    if (/improve|better|fix|change|tip/.test(t)) return "improve";
    if (/confidence|score|percent|%/.test(t)) return "confidence";
    if (/secondary|neutral|other emotion|blend/.test(t)) return "secondary";
    return "fallback";
  }

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
      const reply = pick(REPLY_POOL[intent]);
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
    backBtn.addEventListener("click", goToSelect);
    newPracticeBtn.addEventListener("click", goToSelect);
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
    renderHistoryList();
    bindEvents();
  }

  document.addEventListener("DOMContentLoaded", init);
})();