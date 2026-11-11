/**
 * All child/parent data stays on this device (localStorage).
 * Nothing is uploaded. A manual JSON export/import is the only backup.
 */
import { DEFAULT_PROFILE, DEFAULT_TRIPS, DEFAULT_RACERS, SAMPLE_HIKES, MODE_META } from "./data.js";

const KEY = "chance-scale-v1";
const listeners = new Set();

function fresh() {
  const levels = {};
  const streaks = {};
  for (const m of MODE_META) {
    levels[m.id] = 1;
    streaks[m.id] = { correct: 0, wrong: 0 };
  }
  return {
    version: 1,
    profile: { ...DEFAULT_PROFILE },
    trips: DEFAULT_TRIPS.map((t) => ({ ...t })),
    racers: DEFAULT_RACERS.map((r) => ({ ...r })),
    hikes: SAMPLE_HIKES.map((h) => ({ ...h, points: h.points.map((p) => ({ ...p })) })),
    levels,
    streaks,
    predictions: [], // {mode, at, guessed, actual, ratio}
    numberlineErrors: [], // {range, target, placed, error, at}
    compareThreshold: [], // {ratio, correct, at}
    cards: [],
    recordings: [], // {id, at, duration, dataUrl, note}
    parentReplies: [],
    parentTasks: [], // {id, taskId, dataUrl} recorded over bank items
    sessions: [], // {date, start, minutes, modes, endedBy}
    firstPlayDone: false,
    settings: { bilingual: false, voiceOn: true, reducedMotion: false },
    tomorrowQuestionId: "q1",
    lastTomorrowAt: null,
    cosmosIntroSeen: false,
    todayStartedAt: null,
    todayDate: null,
    todayMinutes: 0,
    todayModes: [],
    endedToday: false,
    weeklyReports: [],
  };
}

let state = load();

function load() {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return fresh();
    const parsed = JSON.parse(raw);
    const base = fresh();
    const merged = { ...base, ...parsed, profile: { ...base.profile, ...(parsed.profile || {}) } };
    merged.levels = { ...base.levels, ...(parsed.levels || {}) };
    merged.streaks = { ...base.streaks, ...(parsed.streaks || {}) };
    merged.settings = { ...base.settings, ...(parsed.settings || {}) };
    if (!Array.isArray(merged.trips) || merged.trips.length === 0) merged.trips = base.trips;
    if (!Array.isArray(merged.racers) || merged.racers.length === 0) merged.racers = base.racers;
    if (!Array.isArray(merged.hikes) || merged.hikes.length === 0) merged.hikes = base.hikes;
    else {
      // Schematic sample mountains always take the current pack (official peaks,
      // trail-foot start). Parent-imported real tracks (sample: false) are kept.
      const byId = new Map(SAMPLE_HIKES.map((h) => [h.id, h]));
      merged.hikes = merged.hikes.map((h) => {
        const pack = byId.get(h.id);
        if (pack && (h.sample !== false)) {
          return { ...pack, points: pack.points.map((p) => ({ ...p })) };
        }
        return h;
      });
      for (const pack of SAMPLE_HIKES) {
        if (!merged.hikes.some((h) => h.id === pack.id)) {
          merged.hikes.push({ ...pack, points: pack.points.map((p) => ({ ...p })) });
        }
      }
    }
    return merged;
  } catch {
    return fresh();
  }
}

function persist() {
  try {
    localStorage.setItem(KEY, JSON.stringify(state));
  } catch (err) {
    // Safari may evict or refuse (private mode / quota). Keep going in memory.
    console.warn("storage write failed", err);
  }
  for (const fn of listeners) fn(state);
}

export const store = {
  get() { return state; },
  on(fn) { listeners.add(fn); return () => listeners.delete(fn); },
  patch(partial) {
    state = { ...state, ...partial };
    persist();
  },
  update(fn) {
    state = fn(state) || state;
    persist();
  },
  resetAll() {
    state = fresh();
    persist();
  },
  exportBackup() {
    const blob = new Blob([JSON.stringify(state, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "chance-backup-" + new Date().toISOString().slice(0, 10) + ".json";
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 2000);
  },
  async importBackup(file) {
    const text = await file.text();
    const parsed = JSON.parse(text);
    if (!parsed || typeof parsed !== "object") throw new Error("备份文件不对");
    const base = fresh();
    state = { ...base, ...parsed, version: 1 };
    persist();
  },
  todayKey() {
    // Asia/Shanghai calendar date. The device is expected to be on this zone
    // at home; we also format with the zone so a travelling iPad stays honest.
    return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Shanghai", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());
  },
  weekdayShanghai() {
    const parts = new Intl.DateTimeFormat("en-US", { timeZone: "Asia/Shanghai", weekday: "short" }).format(new Date());
    return { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 }[parts] ?? new Date().getDay();
  },
  ensureToday() {
    const d = this.todayKey();
    if (state.todayDate !== d) {
      state = {
        ...state,
        todayDate: d,
        todayStartedAt: Date.now(),
        todayMinutes: 0,
        todayModes: [],
        endedToday: false,
      };
      persist();
    }
    return state;
  },
  addTodayMinutes(delta) {
    this.ensureToday();
    state = { ...state, todayMinutes: Math.max(0, (state.todayMinutes || 0) + delta) };
    persist();
  },
  markModePlayed(id) {
    this.ensureToday();
    if (!state.todayModes.includes(id)) {
      state = { ...state, todayModes: [...state.todayModes, id] };
      persist();
    }
  },
  recordAnswer(mode, correct) {
    const streaks = { ...state.streaks, [mode]: { ...(state.streaks[mode] || { correct: 0, wrong: 0 }) } };
    const levels = { ...state.levels };
    let lv = levels[mode] || 1;
    if (correct) {
      streaks[mode].correct += 1;
      streaks[mode].wrong = 0;
      if (streaks[mode].correct >= 2 && lv < 5) {
        lv += 1;
        streaks[mode].correct = 0;
      }
    } else {
      streaks[mode].wrong += 1;
      streaks[mode].correct = 0;
      if (streaks[mode].wrong >= 2 && lv > 1) {
        lv -= 1;
        streaks[mode].wrong = 0;
      }
    }
    levels[mode] = lv;
    state = { ...state, streaks, levels };
    persist();
    return lv;
  },
  level(mode) { return state.levels[mode] || 1; },
  cosmosUnlocked() {
    return (state.levels.flight || 1) >= 3 && (state.levels.race || 1) >= 3;
  },
  addCard(template) {
    if (state.cards.some((c) => c.id === template.id)) return false;
    state = { ...state, cards: [...state.cards, { ...template, at: Date.now() }] };
    persist();
    return true;
  },
  addPrediction(row) {
    state = { ...state, predictions: [...state.predictions, { ...row, at: Date.now() }] };
    persist();
  },
  addNumberlineError(row) {
    state = { ...state, numberlineErrors: [...state.numberlineErrors, { ...row, at: Date.now() }] };
    persist();
  },
  addCompare(row) {
    state = { ...state, compareThreshold: [...state.compareThreshold, { ...row, at: Date.now() }] };
    persist();
  },
  addRecording(rec) {
    state = { ...state, recordings: [...state.recordings, rec] };
    persist();
  },
  addParentReply(rec) {
    state = { ...state, parentReplies: [...state.parentReplies, rec] };
    persist();
  },
  recordSession({ endedBy } = {}) {
    this.ensureToday();
    const row = {
      date: this.todayKey(),
      start: state.todayStartedAt,
      minutes: state.todayMinutes || 0,
      modes: [...(state.todayModes || [])],
      endedBy: endedBy || "end",
    };
    const sessions = (state.sessions || []).filter((s) => s.date !== row.date);
    state = { ...state, sessions: [...sessions, row] };
    persist();
    return row;
  },
};

// Tick today's minutes while the tab is visible.
let lastTick = Date.now();
setInterval(() => {
  const now = Date.now();
  const dt = (now - lastTick) / 60000;
  lastTick = now;
  if (document.visibilityState === "visible" && !store.get().endedToday) {
    store.addTodayMinutes(dt);
  }
}, 15000);
document.addEventListener("visibilitychange", () => { lastTick = Date.now(); });
