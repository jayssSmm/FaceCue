export const state = {
    current: null,
    hasUploadedThisSession: false,
};


export const $ = (id) => document.getElementById(id);

export const screenSelect = $("screen-select");
export const screenPractice = $("screen-practice");
export const emotionGrid = $("emotion-grid");
export const chatMessages = $("chat-messages");
export const chatScroll = $("chat-scroll");
export const badgeEmoji = $("badge-emoji");
export const badgeName = $("badge-name");
export const fileInput = $("file-input");
export const uploadBtn = $("upload-btn");
export const textInput = $("text-input");
export const sendBtn = $("send-btn");
export const backBtn = $("back-btn");
export const newPracticeBtn = $("new-practice-btn");

export const EMOTIONS = [
    { key: "happy",    name: "Happy",    emoji: "😊", varName: "--happy",    softVarName: "--happy-soft" },
    { key: "sad",      name: "Sad",      emoji: "😢", varName: "--sad",      softVarName: "--sad-soft" },
    { key: "angry",    name: "Angry",    emoji: "😠", varName: "--angry",    softVarName: "--angry-soft" },
    { key: "fear",     name: "Fear",     emoji: "😨", varName: "--fear",     softVarName: "--fear-soft" },
    { key: "surprise", name: "Surprise", emoji: "😲", varName: "--surprise", softVarName: "--surprise-soft" },
    { key: "neutral",  name: "Neutral",  emoji: "😐", varName: "--neutral",  softVarName: "--neutral-soft" },
    { key: "disgust",  name: "Disgust",  emoji: "🤢", varName: "--disgust",  softVarName: "--disgust-soft" },
];