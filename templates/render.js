import { attachRipple } from "./utilities.js";

const $ = (id) => document.getElementById(id);
const emotionGrid = $("emotion-grid");

export function renderEmotionGrid(emotions) {
    emotionGrid.innerHTML = "";
    emotions.forEach((emo, i) => {
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