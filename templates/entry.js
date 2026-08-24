import { attachRipple, scrollToBottom, escapeHtml } from "./src/utilities.js";
import { renderEmotionGrid } from "./src/render.js";
import {
  clearUploadEmptyState,
  cloneTpl,
  addUserText,
  addAssistantText,
  addUserImage,
  showTyping,
  hideTyping,
  showUploadEmptyState,
} from "./src/messageRender.js";
import { goToSelect, startPractice } from "./src/screenTransion.js";
import {
  findEmotion,
  unknownEmotion,
  toPercent,
  buildAnalysis,
  addAnalysisCard,
  animateCount,
} from "./src/analysisCard.js";
import { state, $, EMOTIONS } from "./state.js";
import {
  emotionGrid,
  fileInput,
  uploadBtn,
  textInput,
  sendBtn,
  backBtn,
  newPracticeBtn,
} from "./state.js";

(() => {
  "use strict";

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
      formData.append("image", file); 

      fetch("/post/image", {
        method: "POST",
        body: formData,
      })
        .then((res) => {
          if (!res.ok) {
            throw new Error(
              `/post/image failed: ${res.status} ${res.statusText}`,
            );
          }
          return res.json();
        })
        .then((analysisResult) => {
          return fetch("/response", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(analysisResult),
          })
            .then((res) => {
              if (!res.ok) {
                throw new Error(
                  `/response failed: ${res.status} ${res.statusText}`,
                );
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
