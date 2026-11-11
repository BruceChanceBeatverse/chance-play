import { store } from "./store.js";
import { unlockAudio, talk, sfx, playParentTask } from "./audio.js";
import { el, screen, modeGlyph, starfield, secretParentHotspot, toast } from "./ui.js";
import { MODE_META, WEEKDAY_THEME, TASK_BANK } from "./data.js";
import { bi, UI, levelCopy, homeFooterCopy } from "./i18n.js";

export function renderHome(app, go) {
  store.ensureToday();
  const st = store.get();
  const day = store.weekdayShanghai();
  const theme = WEEKDAY_THEME[day];
  const s = screen();
  const sky = el("canvas", { class: "home-sky fill", "aria-hidden": "true" });
  const ui = el("div", { class: "home-ui" });
  const hello = el("div", { class: "hello" }, bi({ zh: "你好，", en: "Hello, " }), el("em", {}, "Chance"));
  const sub = el("div", { class: "hello-sub" }, bi(theme.title, theme.titleEn));
  ui.append(hello, sub);

  const todayTask = pickTodayTask(day, st);
  const banner = todayTaskBanner(todayTask);
  const todayCard = el("div", { class: "today-card" },
    el("div", {},
      el("div", { class: "big" }, bi(banner.zh, banner.en)),
      st.parentReplies.length ? el("div", { style: { color: "var(--mint)", marginTop: "6px" } }, bi("爸爸回过你一句", "Dad sent you a reply")) : null,
    ),
    banner.showStart
      ? el("button", { class: "go", onClick: () => startToday(go, todayTask) }, bi("开始", "Start"))
      : el("div", { class: "hello-sub", style: { marginTop: "8px" } }, bi("想去哪一站，就点下面。", "Pick a stop below.")),
  );
  ui.append(todayCard);

  const grid = el("div", { class: "grid-modes" });
  for (const m of MODE_META) {
    const locked = m.unlockAfter && !store.cosmosUnlocked();
    const tile = el("button", {
      class: "mode-tile" + (m.featured ? " featured" : "") + (locked ? " locked" : ""),
      onClick: () => {
        unlockAudio(); sfx.tap();
        if (locked) {
          const msg = { zh: "这张地图还没打开。先走到月亮或太阳，或走完整条尺度之旅。", en: "This map is not open yet. Walk to the Moon or the Sun, or finish the scale journey." };
          talk(msg);
          toast(msg, 4200);
          showLockExplain(s, msg);
          return;
        }
        go("mode", m.id);
      },
    },
      el("div", { class: "glyph" }, modeGlyph(m.id)),
      el("div", { class: "label" }, bi(m.name, m.nameEn)),
      el("div", { class: "lvl" }, levelCopy(st.levels[m.id] || 1)),
    );
    if (locked) tile.append(el("div", { class: "lock-badge" }, "🔒"));
    grid.append(tile);
  }
  ui.append(grid);

  const foot = el("div", { class: "home-foot" },
    el("button", { class: "pill", onClick: () => go("cards") }, "🃏 ", UI.myCards, "  " + st.cards.length),
    el("div", { class: "time-left" }, homeFooterCopy(st)),
  );
  ui.append(foot);

  // Adult-only entry: a quiet corner, not next to any "day is over" copy,
  // and not a tempting extra pill in the footer.
  const secret = el("button", { class: "parent-secret", type: "button", "aria-label": "家长入口" });
  secretParentHotspot(secret, () => go("parent"));
  // After the sky canvas and home UI so the faint control is on top and actually receives taps.
  s.append(sky, ui, secret);
  const stop = starfield(sky);
  s._cleanup = stop;
  app.replaceChildren(s);

  if (!st.endedToday) {
    // Don't auto-talk over the child's choice every single return, only first landing of the day.
    if ((st.todayMinutes || 0) < 0.2) {
      talk("你好，Chance。").then(() => playParentTask(todayTask));
    }
  }
}

export function pickTodayTask(day, st) {
  const theme = WEEKDAY_THEME[day];
  const modes = theme.modes.filter((m) => m !== "explore" && m !== "teach");
  const mode = modes[0] || "flight";
  const lv = st.levels[mode] || 1;
  const done = new Set(st.todayCompletedTasks || []);
  // Exact level first, so a level-1 race day talks about bike vs car
  // on the way to school — not "滑雪去东京" which the L1 mode will not play.
  const exact = TASK_BANK.filter((t) => t.mode === mode && t.level === lv);
  const lower = TASK_BANK.filter((t) => t.mode === mode && t.level <= lv);
  const unusedExact = exact.filter((t) => !done.has(t.id));
  const unusedLower = lower.filter((t) => !done.has(t.id));
  const list = unusedExact.length ? unusedExact : unusedLower;
  if (!list.length) {
    return { id: "today-done", mode, zh: "今天的问题你会了。想去哪一站，你自己选。", done: true };
  }
  const rec = (st.parentTasks || []).find((p) => list.some((t) => t.id === p.taskId));
  const task = rec ? list.find((t) => t.id === rec.taskId) : list[(new Date().getDate()) % list.length];
  return task;
}

/** Once today's prompt has been answered, do not keep re-asking it on the home banner. */
export function todayTaskBanner(task) {
  if (task && task.done) {
    return { zh: task.zh, en: task.en || "", showStart: false, done: true };
  }
  return { zh: (task && task.zh) || "", en: (task && task.en) || "", showStart: true, done: false };
}

export function todayModeArg(task) {
  if (!task || task.done) return null;
  return { id: task.mode, taskId: task.id };
}

function startToday(go, task) {
  unlockAudio();
  if (task && task.done) {
    talk("今天的问题你会了。想去哪一站，你自己选。");
    return;
  }
  playParentTask(task);
  const st = store.get();
  if (st.endedToday) {
    // Old sessions may still have this flag; do not darken or shrink play.
    store.patch({ endedToday: false });
  }
  if (store.weekdayShanghai() === 0) {
    go("teach");
    return;
  }
  if (store.weekdayShanghai() === 6) {
    go("home"); // free explore — just stay and pick
    talk("今天自由探索。想去哪一站，你自己选。");
    return;
  }
  go("mode", todayModeArg(task));
}

function showLockExplain(host, msg) {
  host.querySelectorAll(".lock-explain").forEach((n) => n.remove());
  const box = el("div", { class: "lock-explain" },
    el("h2", {}, UI.lockedMap),
    el("p", {}, msg),
    el("button", { class: "choice ok", onClick: () => box.remove() }, UI.ok),
  );
  host.append(box);
}
