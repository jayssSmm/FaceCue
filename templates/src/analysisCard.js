import { EMOTIONS, chatMessages, $ } from "../state.js";
import { cloneTpl } from "./messageRender.js";
import { scrollToBottom } from "./utilities.js";

export function findEmotion(label) {
    if (label == null) return null;
    const norm = String(label).trim().toLowerCase();
    return (
        EMOTIONS.find((e) => e.key === norm || e.name.toLowerCase() === norm) || null
    );
}

export function unknownEmotion(rawLabel) {
    return { key: String(rawLabel), name: String(rawLabel), emoji: "❓" };
}

export function toPercent(value) {
    const n = Number(value) || 0;
    return Math.round(n <= 1 ? n * 100 : n);
}


export function buildAnalysis(result, targetEmo) {
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

export function addAnalysisCard(analysis) {
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

export function animateCount(el, target) {
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