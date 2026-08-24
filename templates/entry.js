import { attachRipple, scrollToBottom, escapeHtml } from "./src/utilities.js";
import { renderEmotionGrid } from "./src/render.js";
import {clearUploadEmptyState, cloneTpl, addUserText, addAssistantText, addUserImage, showTyping, hideTyping, showUploadEmptyState} from './src/messageRender.js'
import { goToSelect, startPractice } from "./src/screenTransion.js";
import { findEmotion, unknownEmotion, toPercent, buildAnalysis, addAnalysisCard, animateCount } from "./src/analysisCard.js";
import { state, $ } from "./state.js";

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
    renderEmotionGrid(EMOTIONS);
    bindEvents();
  }

  document.addEventListener("DOMContentLoaded", init);
})();