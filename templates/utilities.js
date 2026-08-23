function scrollToBottom() {
    requestAnimationFrame(() => {
        chatScroll.scrollTop = chatScroll.scrollHeight;
    });
}

function escapeHtml(str) {
    const div = document.createElement("div");
    div.textContent = str == null ? "" : String(str);
    return div.innerHTML;
}

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

export {attachRipple, scrollToBottom, escapeHtml};