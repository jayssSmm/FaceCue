import { chatMessages } from "../state.js";
import { scrollToBottom } from "./utilities.js";
import { $ } from "../state.js";

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

export {clearUploadEmptyState, cloneTpl, addUserText, addAssistantText, addUserImage, showTyping, hideTyping, showUploadEmptyState}