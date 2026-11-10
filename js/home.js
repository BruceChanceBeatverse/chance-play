import { store } from "./store.js";
import { unlockAudio, talk, sfx, playParentTask } from "./audio.js";
import { el, screen, modeGlyph, starfield, secretParentHotspot } from "./ui.js";
import { MODE_META, WEEKDAY_THEME, TASK_BANK, SESSION_MINUTES, SESSION_WINDDOWN_MIN } from "./data.js";

export function renderHome(app, go) {
  store.ensureToday();
  const st = store.get();
  const day = store.weekdayShanghai();
  const theme = WEEKDAY_THEME[day];
  const s = screen();
  const sky = el("canvas", { class: "home-sky fill", "aria-hidden": "true" });
  const ui = el("div", { class: "home-ui" });
  const hello = el("div", { class: "hello", html: '你好，<em>Chance</em>' });
  const sub = el("div", { class: "hello-sub" }, theme.title + (st.endedToday ? " · 今天已经收过尾了" : ""));
  ui.append(hello, sub);

  const todayTask = pickTodayTask(day, st);
  const todayCard = el("div", { class: "today-card" },
    el("div", {},
      el("div", { class: "big" }, todayTask.zh),
      st.parentReplies.length ? el("div", { style: { color: "var(--mint)", marginTop: "6px" } }, "爸爸回过你一句") : null,
    ),
    el("button", { class: "go", onClick: () => startToday(go, todayTask) }, st.endedToday ? "再看看" : "开始"),
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
          talk("这张地图还没打开。先在飞行地图和速度大比拼里玩到第三级。");
          return;
        }
        go("mode", m.id);
      },
    },
      el("div", { class: "glyph" }, modeGlyph(m.id)),
      el("div", { class: "label" }, m.name),
      el("div", { class: "lvl" }, "第 " + (st.levels[m.id] || 1) + " 级"),
    );
    if (locked) tile.append(el("div", { class: "lock-badge" }, "🔒"));
    grid.append(tile);
  }
  ui.append(grid);

  const leftMin = Math.max(0, SESSION_MINUTES - (st.todayMinutes || 0));
  const foot = el("div", { class: "home-foot" },
    el("button", { class: "pill", onClick: () => go("cards") }, "🃏 我的世界卡  " + st.cards.length),
    el("div", { class: "time-left" }, st.endedToday ? "今天已经结束" : "大约还剩 " + Math.ceil(leftMin) + " 分钟"),
  );
  const secret = el("div", { class: "pill", style: { width: "56px", justifyContent: "center", opacity: "0.25" }, "aria-label": "家长入口" }, "·");
  secretParentHotspot(secret, () => go("parent"));
  foot.append(secret);
  ui.append(foot);

  s.append(sky, ui);
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
  // Exact level first, so a level-1 race day talks about bike vs car
  // on the way to school — not "滑雪去东京" which the L1 mode will not play.
  const exact = TASK_BANK.filter((t) => t.mode === mode && t.level === lv);
  const lower = TASK_BANK.filter((t) => t.mode === mode && t.level <= lv);
  const list = exact.length ? exact : (lower.length ? lower : TASK_BANK);
  const rec = st.parentTasks.find((p) => list.some((t) => t.id === p.taskId));
  const task = rec ? list.find((t) => t.id === rec.taskId) : list[(new Date().getDate()) % list.length];
  return task;
}

function startToday(go, task) {
  unlockAudio();
  playParentTask(task);
  const st = store.get();
  if (st.endedToday) {
    go("mode", task.mode);
    return;
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
  go("mode", task.mode);
}
