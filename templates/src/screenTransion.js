import { state, screenPractice, screenSelect, badgeEmoji, badgeName, chatMessages, textInput, sendBtn, $ } from "../state.js";
import { addAssistantText, showUploadEmptyState } from "./messageRender.js";
import { scrollToBottom } from "./utilities.js";

export function goToSelect() {
    screenPractice.classList.remove("is-active");
    screenSelect.classList.add("is-active");
}

export function startPractice(emo) {
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