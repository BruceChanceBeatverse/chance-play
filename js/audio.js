/**
 * Sound: Web Audio beeps (self-generated, no files) + speechSynthesis.
 * iOS Safari only unlocks audio after a user gesture — unlock() must be
 * called from the first tap. No network, no third-party voices.
 */
import { store } from "./store.js";

let ctx = null;
let unlocked = false;
let speaking = null;

function ac() {
  if (!ctx) {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return null;
    ctx = new AC();
  }
  return ctx;
}

export function unlockAudio() {
  const c = ac();
  if (!c) return;
  if (c.state === "suspended") c.resume();
  // Play a near-silent tick so iOS keeps the graph alive.
  const o = c.createOscillator();
  const g = c.createGain();
  g.gain.value = 0.0001;
  o.connect(g).connect(c.destination);
  o.start();
  o.stop(c.currentTime + 0.05);
  unlocked = true;
}

function tone(freq, dur, type = "sine", gain = 0.08, at = 0) {
  const c = ac();
  if (!c) return;
  if (c.state === "suspended") c.resume();
  const o = c.createOscillator();
  const g = c.createGain();
  o.type = type;
  o.frequency.value = freq;
  const t0 = c.currentTime + at;
  g.gain.setValueAtTime(0.0001, t0);
  g.gain.exponentialRampToValueAtTime(gain, t0 + 0.02);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  o.connect(g).connect(c.destination);
  o.start(t0);
  o.stop(t0 + dur + 0.02);
}

export const sfx = {
  tap() { tone(520, 0.07, "sine", 0.05); },
  whoosh() { tone(220, 0.4, "triangle", 0.04); tone(440, 0.35, "sine", 0.03, 0.05); },
  tick() { tone(880, 0.04, "sine", 0.03); },
  success() {
    tone(523.25, 0.16, "sine", 0.07);
    tone(659.25, 0.16, "sine", 0.07, 0.08);
    tone(783.99, 0.28, "sine", 0.08, 0.16);
  },
  soft() { tone(392, 0.18, "sine", 0.04); },
  card() {
    tone(659.25, 0.12, "sine", 0.06);
    tone(987.77, 0.22, "sine", 0.06, 0.1);
  },
  drop() { tone(196, 0.2, "triangle", 0.05); },
};

function pickVoice(lang) {
  const voices = speechSynthesis.getVoices() || [];
  const want = lang.startsWith("zh") ? "zh" : "en";
  const preferred = voices.filter((v) => (v.lang || "").toLowerCase().startsWith(want));
  const preferName = preferred.find((v) => /ting-ting|tingting|meijia|sin-ji|sinji|zh-cn|chinese/i.test(v.name + v.lang));
  return preferName || preferred[0] || null;
}

export function stopTalk() {
  try { speechSynthesis.cancel(); } catch {}
  speaking = null;
}

export function talk(zh, en) {
  const s = store.get().settings;
  if (!s.voiceOn) return Promise.resolve();
  stopTalk();
  const lines = [];
  if (zh) lines.push({ text: zh, lang: "zh-CN" });
  if (s.bilingual && en) lines.push({ text: en, lang: "en-US" });
  if (!lines.length) return Promise.resolve();
  return new Promise((resolve) => {
    const speakNext = (i) => {
      if (i >= lines.length) { speaking = null; resolve(); return; }
      const u = new SpeechSynthesisUtterance(lines[i].text);
      u.lang = lines[i].lang;
      u.rate = lines[i].lang.startsWith("zh") ? 1.0 : 0.95;
      u.pitch = 1.02;
      const v = pickVoice(lines[i].lang);
      if (v) u.voice = v;
      u.onend = () => speakNext(i + 1);
      u.onerror = () => speakNext(i + 1);
      speaking = u;
      speechSynthesis.speak(u);
    };
    // Voices may load asynchronously on Safari.
    if (speechSynthesis.getVoices().length === 0) {
      speechSynthesis.addEventListener("voiceschanged", () => speakNext(0), { once: true });
      // Fallback if the event never fires.
      setTimeout(() => { if (speaking === null && speechSynthesis.getVoices().length === 0) speakNext(0); }, 400);
    } else {
      speakNext(0);
    }
  });
}

if (typeof speechSynthesis !== "undefined") {
  speechSynthesis.getVoices();
  speechSynthesis.addEventListener?.("voiceschanged", () => speechSynthesis.getVoices());
}

export function isAudioUnlocked() { return unlocked; }

/** Play dad's recorded task if one exists; otherwise fall back to speechSynthesis. */
export function playParentTask(task) {
  if (!task) return Promise.resolve();
  const rec = store.get().parentTasks.find((p) => p.taskId === task.id && p.dataUrl);
  if (rec && rec.dataUrl) {
    stopTalk();
    return new Promise((resolve) => {
      try {
        const a = new Audio(rec.dataUrl);
        a.onended = () => resolve();
        a.onerror = () => { talk(task.zh, task.en).then(resolve); };
        const p = a.play();
        if (p && p.catch) p.catch(() => { talk(task.zh, task.en).then(resolve); });
      } catch {
        talk(task.zh, task.en).then(resolve);
      }
    });
  }
  return talk(task.zh, task.en);
}
