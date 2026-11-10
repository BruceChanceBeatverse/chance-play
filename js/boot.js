import { store } from "./store.js";
import { unlockAudio, stopTalk } from "./audio.js";
import { root, clear } from "./ui.js";
import { renderWelcome, renderFirstPlay } from "./firstplay.js";
import { renderHome } from "./home.js";
import { renderFlight } from "./modes/flight.js";
import { renderRace } from "./modes/race.js";
import { renderHike } from "./modes/hike.js";
import { renderZoom } from "./modes/zoom.js";
import { renderNumberline } from "./modes/numberline.js";
import { renderCompare } from "./modes/compare.js";
import { renderElevator } from "./modes/elevator.js";
import { renderCosmos } from "./modes/cosmos.js";
import { renderParent } from "./parent.js";
import { renderSessionEnd, renderTeach, renderCards, startSessionWatch, stopSessionWatch, shouldWindDown } from "./daily.js";

let currentCleanup = null;

function go(name, arg) {
  stopTalk();
  if (currentCleanup) { try { currentCleanup(); } catch {} currentCleanup = null; }
  const app = root();
  const cleanupOf = (node) => { currentCleanup = node && node._cleanup; };

  const goHome = () => {
    if (shouldWindDown() && !store.get().endedToday) return go("end");
    go("home");
  };
  const afterMode = () => {
    if (shouldWindDown() && !store.get().endedToday) go("end");
    else go("home");
  };

  if (name === "welcome") { renderWelcome(app, go); return; }
  if (name === "firstplay") { renderFirstPlay(app, go); cleanupOf(app.firstChild); return; }
  if (name === "home") {
    // Wind-down must also run when something calls go("home") directly,
    // not only when a mode's goHome callback is used.
    if (shouldWindDown() && !store.get().endedToday) { go("end"); return; }
    renderHome(app, go); cleanupOf(app.firstChild); return;
  }
  if (name === "parent") { renderParent(app, go); return; }
  if (name === "cards") { renderCards(app, go); return; }
  if (name === "end") { stopSessionWatch(); renderSessionEnd(app, go); return; }
  if (name === "teach") { renderTeach(app, go); return; }
  if (name === "mode") {
    const id = typeof arg === "string" ? arg : arg && arg.id;
    const opts = { goHome, onDone: afterMode };
    if (arg && typeof arg === "object") {
      if (arg.tripId) opts.tripId = arg.tripId;
      if (arg.hikeId) opts.hikeId = arg.hikeId;
    }
    if (id === "flight") renderFlight(app, opts);
    else if (id === "race") renderRace(app, opts);
    else if (id === "hike") renderHike(app, opts);
    else if (id === "zoom") renderZoom(app, opts);
    else if (id === "numberline") renderNumberline(app, opts);
    else if (id === "compare") renderCompare(app, opts);
    else if (id === "elevator") renderElevator(app, opts);
    else if (id === "cosmos") renderCosmos(app, opts);
    else go("home");
    cleanupOf(app.firstChild);
    return;
  }
  go("home");
}

function boot() {
  store.ensureToday();
  const st = store.get();
  startSessionWatch(() => go("end"));
  // First visit: no login, no tutorial — a plane to tap (needed to unlock iOS audio), then dad's voice.
  if (!st.firstPlayDone) go("welcome");
  else go("home");

  // Register the service worker for offline. Same-origin only, no external fetches.
  if ("serviceWorker" in navigator) {
    navigator.serviceWorker.register("./sw.js").catch(() => {});
  }

  // Global first-gesture unlock if the child skipped the welcome somehow.
  window.addEventListener("pointerdown", () => unlockAudio(), { once: true });
}

boot();

// Expose a tiny hook for Playwright tests. Not used by the child UI.
window.__chance = { go, store, unlockAudio };
