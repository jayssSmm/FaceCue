(() => {
  "use strict";

  /* ----------------------------------------------------------
     DATA
  ----------------------------------------------------------- */
  const EMOTIONS = [
    { key: "happy",    name: "Happy",    emoji: "😊", varName: "--happy",    softVarName: "--happy-soft" },
    { key: "sad",      name: "Sad",      emoji: "😢", varName: "--sad",      softVarName: "--sad-soft" },
    { key: "angry",    name: "Angry",    emoji: "😠", varName: "--angry",    softVarName: "--angry-soft" },
    { key: "fear",     name: "Fear",     emoji: "😨", varName: "--fear",     softVarName: "--fear-soft" },
    { key: "surprise", name: "Surprise", emoji: "😲", varName: "--surprise", softVarName: "--surprise-soft" },
    { key: "neutral",  name: "Neutral",  emoji: "😐", varName: "--neutral",  softVarName: "--neutral-soft" },
    { key: "disgust",  name: "Disgust",  emoji: "🤢", varName: "--disgust",  softVarName: "--disgust-soft" },
  ];

  // Coaching message templates shown after an analysis card.
  const COACHING_TEMPLATES = [
    ({ target, detected, confidence, secondaryName, isMatch }) => `
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
  ];

  /* ----------------------------------------------------------
     STATE
  ----------------------------------------------------------- */
  const state = {
    current: null,
    hasUploadedThisSession: false,
  };

  /* ----------------------------------------------------------
     DOM SHORTCUTS
  ----------------------------------------------------------- */
  const $ = (id) => document.getElementById(id);

  const screenSelect = $("screen-select");
  const screenPractice = $("screen-practice");
  const emotionGrid = $("emotion-grid");
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
  const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];

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
  // Pure "go back to the picker" — no side effects, no arguments.
  function goToSelect() {
    screenPractice.classList.remove("is-active");
    screenSelect.classList.add("is-active");
  }

  // Starts a brand-new practice session for the given emotion.
  // Always shows the "Great choice!" intro — there is no history
  // branch anymore, so every entry into screen 2 goes through here.
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

    addAssistantText(`
      <p>Great choice! Today we're practicing <strong>${emo.name}</strong>.</p>
      <p>Upload a selfie showing the expression you'd like other people to perceive.</p>
      <p>When you're ready, press the upload button below.</p>
    `);
    showUploadEmptyState();

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
  // Fake "AI" analysis: randomly decides whether the detected
  // expression matches the target, then fabricates plausible numbers.
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
    if (!file || !state.current) return; //CHECKS IF file exists
    clearUploadEmptyState(); // remove add image if present

    const reader = new FileReader(); // reads file
    reader.onload = (e) => {
      addUserImage(e.target.result); // adds immage to dom
      state.hasUploadedThisSession = true;

      const typingNode = showTyping();

      const formData = new FormData();
      formData.append('image', file); // 'image' = whatever field name your server expects

      fetch('/post/image', {
        method: 'POST',
        body: formData,
        // no Content-Type header — browser sets the correct multipart boundary automatically
      })
        .then((res) => {
          if (!res.ok) {
            throw new Error(`Upload failed: ${res.status} ${res.statusText}`);
          }
          return res.json();
        })
        .then((json) => {
          hideTyping(typingNode);
          const analysis = generateAnalysis(json);
          addAnalysisCard(analysis);
        })
        .catch((err) => {
          hideTyping(typingNode);
          console.error('Image analysis failed:', err);
          // e.g. addAssistantText("Something went wrong analyzing that image — try again?");
        });
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

    /*const typingNode = showTyping();
    setTimeout(() => {
      hideTyping(typingNode);
      const intent = classifyIntent(text);
      const reply = pick(REPLY_POOL[intent]);
      addAssistantText(`<p>${reply}</p>`);
    }, randInt(900, 1500));*/
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
    bindEvents();
  }

  document.addEventListener("DOMContentLoaded", init);
})();