import { attachRipple, scrollToBottom, escapeHtml } from "./utilities.js";

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

  const state = {
    current: null,
    hasUploadedThisSession: false,
  };


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

  function goToSelect() {
    screenPractice.classList.remove("is-active");
    screenSelect.classList.add("is-active");
  }

  function startPractice(emo) {
    state.current = emo;
    state.hasUploadedThisSession = false;

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

  function findEmotion(label) {
    if (label == null) return null;
    const norm = String(label).trim().toLowerCase();
    return (
      EMOTIONS.find((e) => e.key === norm || e.name.toLowerCase() === norm) || null
    );
  }

  function unknownEmotion(rawLabel) {
    return { key: String(rawLabel), name: String(rawLabel), emoji: "❓" };
  }

  function toPercent(value) {
    const n = Number(value) || 0;
    return Math.round(n <= 1 ? n * 100 : n);
  }


  function buildAnalysis(result, targetEmo) {
    const detected = findEmotion(result.label) || unknownEmotion(result.label);

    const labels = result.labels;
    const probs = result.all_probs;
    let entries = [];
    if (probs && labels && Array.isArray(labels)) {
      entries = Array.isArray(probs)
        ? labels.map((lab, i) => [lab, probs[i]])
        : Object.entries(probs);
    }

    // Confidence = probability of the TARGET emotion specifically.
    const targetEntry = entries.find(
      ([lab]) => String(lab).trim().toLowerCase() === targetEmo.key.toLowerCase()
        || String(lab).trim().toLowerCase() === targetEmo.name.toLowerCase()
    );
    // Fall back to the model's reported top-1 confidence only if we can't
    // find the target in the distribution at all (e.g. all_probs missing).
    const confidence = targetEntry ? toPercent(targetEntry[1]) : toPercent(result.confidence);

    // Secondary = next-highest probability EXCLUDING the target emotion.
    // When the target isn't the model's top pick, this naturally surfaces
    // the same class as `detected` — which is the useful, non-misleading
    // version of that same information.
    let secondary = null;
    let secondaryPct = 0;
    if (entries.length) {
      const sorted = [...entries].sort((a, b) => Number(b[1]) - Number(a[1]));
      const secondEntry = sorted.find(
        ([lab]) => String(lab).trim().toLowerCase() !== targetEmo.key.toLowerCase()
          && String(lab).trim().toLowerCase() !== targetEmo.name.toLowerCase()
      );
      if (secondEntry) {
        secondary = findEmotion(secondEntry[0]) || unknownEmotion(secondEntry[0]);
        secondaryPct = toPercent(secondEntry[1]);
      }
    }

    if (!secondary) {
      secondary = EMOTIONS.find((e) => e.key !== targetEmo.key) || EMOTIONS[0];
      secondaryPct = 0;
    }

    return { target: targetEmo, detected, confidence, secondary, secondaryPct };
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
     /post/image -> DDAMFN result -> /response (LLM) -> message
     The circle (analysis card) only renders once /response has settled
     (success OR failure) — never before. On /response failure we still
     show the circle using the /post/image numbers, just with no message.
  ----------------------------------------------------------- */
  function handleFile(file) {
    if (!file || !state.current) return;
    clearUploadEmptyState();

    const targetEmo = state.current;
    const reader = new FileReader();

    reader.onload = (e) => {
      addUserImage(e.target.result);
      state.hasUploadedThisSession = true;

      const typingNode = showTyping();

      const formData = new FormData();
      formData.append("image", file); // field name expected by /post/image

      fetch("/post/image", {
        method: "POST",
        body: formData,
        // no Content-Type header — browser sets the multipart boundary automatically
      })
        .then((res) => {
          if (!res.ok) {
            throw new Error(`/post/image failed: ${res.status} ${res.statusText}`);
          }
          return res.json();
        })
        .then((analysisResult) => {
          // analysisResult: { label, confidence, labels, tensor, all_probs }
          return fetch("/response", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(analysisResult),
          })
            .then((res) => {
              if (!res.ok) {
                throw new Error(`/response failed: ${res.status} ${res.statusText}`);
              }
              return res.json();
            })
            .then((responseJson) => {
              hideTyping(typingNode);
              addAnalysisCard(buildAnalysis(analysisResult, targetEmo));
              if (responseJson && responseJson.message) {
                addAssistantText(`<p>${escapeHtml(responseJson.message)}</p>`);
              }
            })
            .catch((err) => {
              // /response failed (or returned bad JSON) — still show the
              // circle using the numbers we already have from /post/image,
              // just without a coaching message underneath it.
              hideTyping(typingNode);
              console.error("Response generation failed:", err);
              addAnalysisCard(buildAnalysis(analysisResult, targetEmo));
            });
        })
        .catch((err) => {
          // /post/image itself failed — nothing to show a circle for.
          hideTyping(typingNode);
          console.error("Image analysis failed:", err);
        });
    };
    reader.readAsDataURL(file);
  }

  function handleSend() {
    const text = textInput.value.trim();
    if (!text) return;

    addUserText(text);
    textInput.value = "";
    sendBtn.disabled = true;
  }


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