/**
 * All child/parent data stays on this device (localStorage).
 * Nothing is uploaded. A manual JSON export/import is the only backup.
 */
import { DEFAULT_PROFILE, DEFAULT_TRIPS, DEFAULT_RACERS, SAMPLE_HIKES, MODE_META, resolveCard } from "./data.js";
import { cosmosUnlockFromScale } from "./i18n.js";

/** Homepage / store level. After the scale journey has been walked (including
 *  a waystation hop that reaches the universe), do not leave 尺度之旅 at 1
 *  while the footer says it was already walked. */
export function displayedModeLevel(state, mode) {
  const lv = Number(state && state.levels && state.levels[mode]) || 1;
  if (mode === "zoom" && state && state.scaleJourneyComplete && lv < 2) return 2;
  return lv;
}


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
    settings: { bilingual: true, voiceOn: true, reducedMotion: false },
    tomorrowQuestionId: "q1",
    lastTomorrowAt: null,
    cosmosIntroSeen: false,
    scaleVisited: [],
    scaleJourneyComplete: false,
    todayStartedAt: null,
    todayDate: null,
    todayMinutes: 0,
    todayModes: [],
    todayCompletedTasks: [],
    endedToday: false,
    weeklyReports: [],
  };
}


/** Keep parent-added trips, and fold in newly featured lived flights. */
export function mergeTrips(stored, pack = DEFAULT_TRIPS) {
  const prev = Array.isArray(stored) ? stored : [];
  const byId = new Map(prev.map((t) => [t.id, t]));
  const out = pack.map((d) => {
    const old = byId.get(d.id);
    if (!old) return { ...d };
    // Featured lived trips stay on the current pack (labels, notes). Parent
    // edits to from/to on those built-in ids are not kept so official routes stay official.
    if (d.featured) return { ...d };
    return { ...d, ...old };
  });
  for (const t of prev) {
    if (t && t.id && !out.some((x) => x.id === t.id)) out.push(t);
  }
  return out;
}

/** Keep parent-edited speeds, but always use the current consistent racer set. */
export function mergeRacers(stored, pack = DEFAULT_RACERS) {
  const prev = new Map((Array.isArray(stored) ? stored : []).map((r) => [r.id, r]));
  return pack.map((d) => {
    const old = prev.get(d.id);
    const row = { ...d };
    if (d.id === "bike") {
      // A stale store once labelled the bike 30 (the ski pace). Always keep 15.
      row.kmh = 15;
      return row;
    }
    if (old && Number.isFinite(Number(old.kmh)) && Number(old.kmh) > 0) {
      row.kmh = Number(old.kmh);
    }
    return row;
  });
}

const ASKED_SESSION_KEY = "chance-asked-session";
function loadAskedSession() {
  try {
    const raw = sessionStorage.getItem(ASKED_SESSION_KEY);
    const list = raw ? JSON.parse(raw) : [];
    return new Set(Array.isArray(list) ? list : []);
  } catch {
    return new Set();
  }
}
let askedSession = loadAskedSession();
function persistAskedSession() {
  try { sessionStorage.setItem(ASKED_SESSION_KEY, JSON.stringify([...askedSession])); } catch {}
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
    merged.trips = mergeTrips(parsed.trips, base.trips);
    merged.racers = mergeRacers(parsed.racers, base.racers);
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
    if (Array.isArray(merged.cards)) {
      merged.cards = merged.cards.map((c) => resolveCard(c) || c);
    }
    if (!Array.isArray(merged.todayCompletedTasks)) merged.todayCompletedTasks = [];
    if (!Array.isArray(merged.scaleVisited)) merged.scaleVisited = [];
    if (typeof merged.scaleJourneyComplete !== "boolean") merged.scaleJourneyComplete = false;
    // Child default is both languages together (voice + labels).
    if (merged.settings && merged.settings.bilingual == null) merged.settings.bilingual = true;
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
    askedSession = new Set();
    persistAskedSession();
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
        todayCompletedTasks: [],
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
  /** Finishing a full scale walk (Planck or universe) counts as a level. */
  recordJourneyComplete(mode) {
    const levels = { ...state.levels };
    const streaks = { ...state.streaks, [mode]: { ...(state.streaks[mode] || { correct: 0, wrong: 0 }), correct: 0, wrong: 0 } };
    let lv = levels[mode] || 1;
    if (lv < 5) lv += 1;
    levels[mode] = lv;
    state = { ...state, streaks, levels };
    persist();
    return lv;
  },
  completeTodayTask(taskId) {
    if (!taskId) return false;
    this.ensureToday();
    const prev = Array.isArray(state.todayCompletedTasks) ? state.todayCompletedTasks : [];
    if (prev.includes(taskId)) return false;
    state = { ...state, todayCompletedTasks: [...prev, taskId] };
    persist();
    return true;
  },
  isTodayTaskComplete(taskId) {
    return !!taskId && (state.todayCompletedTasks || []).includes(taskId);
  },
  level(mode) { return displayedModeLevel(state, mode); },
  cosmosUnlocked() {
    return cosmosUnlockFromScale(state);
  },
  markScaleStop(id) {
    if (!id) return false;
    const prev = Array.isArray(state.scaleVisited) ? state.scaleVisited : [];
    if (prev.includes(id)) return false;
    const scaleVisited = [...prev, id];
    const scaleJourneyComplete = state.scaleJourneyComplete || id === "universe";
    state = { ...state, scaleVisited, scaleJourneyComplete };
    persist();
    return true;
  },
  markScaleJourneyComplete() {
    const scaleVisited = Array.isArray(state.scaleVisited) ? state.scaleVisited.slice() : [];
    if (!scaleVisited.includes("universe")) scaleVisited.push("universe");
    if (state.scaleJourneyComplete && scaleVisited.length === (state.scaleVisited || []).length) return false;
    state = { ...state, scaleVisited, scaleJourneyComplete: true };
    persist();
    return true;
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
  hasAsked(key) {
    return !!key && askedSession.has(key);
  },
  rememberAsked(key) {
    if (!key) return;
    askedSession.add(key);
    persistAskedSession();
  },
  askedKeys() {
    return [...askedSession];
  },
  clearAsked() {
    askedSession = new Set();
    persistAskedSession();
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
