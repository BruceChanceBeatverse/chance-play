import { store } from "../store.js";
import { talk, sfx } from "../audio.js";
import { el, screen, topbar, afterReveal, promptBox, offerContinue, markAnswer } from "../ui.js";
import { formatNumber } from "../geo.js";

export function renderElevator(app, { goHome, onDone } = {}) {
  const s = screen();
  s.classList.add("mode-elevator");
  const level = store.level("elevator");
  // Start at 1 (a single bead). Player multiplies/divides by 10.
  let exp = 0; // value = 10^exp, in "units" (a unit can be 1 metre, etc.)
  const minE = -2, maxE = ELEVATOR_MAX_EXP;
  let asked = false;
  let quizDone = false;
  let userDrove = false;

  s.append(topbar({ title: "十倍电梯", sub: "每按一次 ×10 或 ÷10", onBack: goHome }));
  const stage = el("div", { class: "stage", style: { display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: "18px" } });
  const num = el("div", { class: "big-num", style: { fontSize: "72px", color: "var(--gold)" } }, "1");
  const label = el("div", { style: { fontSize: "22px", color: "var(--muted)" } }, "颗珠子");
  const beads = el("div", { class: "beads" });
  const btns = el("div", { class: "lift-btns" },
    el("button", { class: "dn", "aria-label": "除以十" }, "÷10"),
    el("button", { class: "up", "aria-label": "乘以十" }, "×10"),
  );
  stage.append(num, label, beads, btns);
  s.append(stage);

  function render() {
    const value = Math.pow(10, exp);
    num.textContent = formatNumber(value);
    const names = {
      "-2": "0.01，百分之一，很小的一粒",
      "-1": "0.1，十分之一",
      "0": "1 颗珠子",
      "1": "一串 10",
      "2": "一块 100",
      "3": "一个 1000 的立方",
      "4": "一万",
      "5": "十万",
      "6": "一百万",
      "7": "一千万",
      "8": "一亿",
      "9": "十亿",
      "10": "一百亿",
    };
    label.textContent = names[String(exp)] || ("10 的 " + exp + " 次方");
    beads.replaceChildren();
    beads.classList.remove("pop");
    void beads.offsetWidth;
    beads.classList.add("pop");
    if (exp <= 0) {
      const unit = el("div", { class: "bead-unit big", style: exp < 0 ? { transform: "scale(" + Math.pow(0.5, -exp) + ")" } : {} });
      beads.append(unit);
    } else if (exp === 1) {
      const ten = el("div", { class: "bead-ten live" });
      for (let i = 0; i < 10; i++) ten.append(el("div", { class: "bead-unit" }));
      beads.append(ten);
    } else if (exp === 2) {
      const hun = el("div", { class: "bead-hundred live" });
      for (let r = 0; r < 10; r++) {
        const row = el("div", { class: "bead-ten-row" });
        for (let i = 0; i < 10; i++) row.append(el("div", { class: "bead-unit tiny" }));
        hun.append(row);
      }
      beads.append(hun);
    } else if (exp === 3) {
      const cube = el("div", { class: "bead-thousand live" });
      for (let i = 0; i < 3; i++) {
        const face = el("div", { class: "bead-hundred live face" });
        for (let r = 0; r < 10; r++) {
          const row = el("div", { class: "bead-ten-row" });
          for (let c = 0; c < 10; c++) row.append(el("div", { class: "bead-unit tiny" }));
          face.append(row);
        }
        cube.append(face);
      }
      beads.append(cube);
    } else if (exp === 4) {
      const row = el("div", { class: "bead-myriad", title: "10 个一千就是一万" });
      for (let i = 0; i < 10; i++) row.append(el("div", { class: "bead-thousand" }));
      beads.append(row, el("div", { class: "bead-million-caption" }, "10 个一千 = 10,000"));
    } else if (exp === 5) {
      const grid = el("div", { class: "bead-million" });
      for (let i = 0; i < 100; i++) grid.append(el("div", { class: "bead-k" }));
      beads.append(grid, el("div", { class: "bead-million-caption" }, "100 个一千 = 100,000"));
    } else if (exp === 6) {
      const grid = el("div", { class: "bead-million", "aria-label": "一百万" });
      for (let i = 0; i < 100; i++) grid.append(el("div", { class: "bead-wan" }));
      beads.append(grid, el("div", { class: "bead-million-caption" }, "100 个一万 = 1,000,000"));
    } else if (exp === 7) {
      const row = el("div", { class: "bead-stack-row", "aria-label": "一千万" });
      for (let i = 0; i < 10; i++) row.append(el("div", { class: "bead-block" }, "一百万"));
      beads.append(row, el("div", { class: "bead-million-caption" }, "10 个一百万 = 一千万"));
    } else if (exp === 8) {
      const grid = el("div", { class: "bead-million", "aria-label": "一亿" });
      for (let i = 0; i < 100; i++) grid.append(el("div", { class: "bead-block tiny" }, "百万"));
      beads.append(grid, el("div", { class: "bead-million-caption" }, "100 个一百万 = 一亿"));
    } else if (exp === 9) {
      const row = el("div", { class: "bead-stack-row", "aria-label": "十亿" });
      for (let i = 0; i < 10; i++) row.append(el("div", { class: "bead-block yi" }, "一亿"));
      beads.append(row, el("div", { class: "bead-million-caption" }, "10 个一亿 = 十亿"));
    } else {
      const grid = el("div", { class: "bead-million", "aria-label": "一百亿" });
      for (let i = 0; i < 100; i++) grid.append(el("div", { class: "bead-block tiny yi" }, "亿"));
      beads.append(grid, el("div", { class: "bead-million-caption" }, "100 个一亿 = 一百亿"));
    }
  }
  render();

  btns.querySelector(".up").addEventListener("click", () => {
    if (exp >= maxE) return;
    userDrove = true;
    exp += 1; sfx.tap(); render(); maybeAsk();
  });
  btns.querySelector(".dn").addEventListener("click", () => {
    if (exp <= minE) return;
    userDrove = true;
    exp -= 1; sfx.tap(); render();
  });

  // Already moving: slowly climb the powers of ten until the child takes over.
  const auto = setInterval(() => {
    if (userDrove || asked || exp >= 3) return;
    exp += 1;
    render();
  }, 2200);

  function maybeAsk() {
    if (asked || quizDone) return;
    const dock = (typeof window !== "undefined" && window.matchMedia && window.matchMedia("(orientation: landscape)").matches) ? "top" : "bottom";
    if (level <= 2 && exp >= 3) {
      asked = true;
      quizDone = true;
      const box = promptBox("从 1 到 1000，按了几次 ×10？", "每一次都乘 10。", [
        { label: "3 次", ok: true },
        { label: "2 次" },
        { label: "10 次" },
      ], (c) => {
        store.recordAnswer("elevator", !!c.ok);
        markAnswer(box, c, !!c.ok);
        const line = c.ok ? "对。1，10，100，1000，三次。" : "1 乘 10 是 10，再乘 10 是 100，再乘 10 是 1000。三次。";
        talk(line);
        setTimeout(() => {
          box.remove();
          afterReveal("elevator", () => offerContinue(s, {
            title: c.ok ? "对了" : "是 3 次",
            body: line,
            tone: c.ok ? "ok" : "no",
            goHome,
            actions: [
              { label: "再乘下去", kind: "ok", onClick: () => { asked = false; /* quizDone stays so the same question is not re-asked */ } },
              { label: "去尺度之旅", onClick: () => onDone?.() || goHome?.() },
            ],
          }));
        }, 900);
      }, { dock });
      s.append(box);
      talk("从 1 到 1000，按了几次乘 10？");
    } else if (level >= 3 && exp >= 2) {
      asked = true;
      quizDone = true;
      const height = store.get().profile.heightM;
      const box = promptBox("你的身高乘 10，再乘 10，大约到了哪？", "先想一想，再选。", [
        { label: "一座小山那么高", ok: height * 100 < 200 },
        { label: "去机场那么远", ok: false },
        { label: "还是你自己那么高", ok: false },
      ], (c) => {
        // 1.2 m * 100 = 120 m, close to Sheshan (~99 m) — "一座小山".
        const ok = height * 100 < 500;
        store.recordAnswer("elevator", ok && c.label.startsWith("一座"));
        box.remove();
        const line = "你的身高乘 100，大约是 " + formatNumber(Math.round(height * 100)) + " 米，接近一座小山。";
        talk(line);
        setTimeout(() => {
          box.remove();
          afterReveal("elevator", () => offerContinue(s, {
            title: "乘完 100",
            body: line,
            tone: "info",
            goHome,
            actions: [
              { label: "再乘下去", kind: "ok", onClick: () => { asked = false; } },
            ],
          }));
        }, 900);
      }, { dock });
      s.append(box);
    }
  }

  talk("这是蒙氏金珠的想法。1 颗珠子，乘 10 变成一串，再乘 10 变成一块 100。珠子会自己变大，你也可以按。");
  s._cleanup = () => clearInterval(auto);
  app.replaceChildren(s);
  store.markModePlayed("elevator");
}

/** Portrait: ×10 / ÷10 sit at the bottom, question card just above with a gap.
 *  Landscape: question docks at the top, buttons stay in the bottom corners. */
/** Children may keep ×10 past one million (10^6) into 千万 / 亿 / 十亿 / 百亿. */
export const ELEVATOR_MAX_EXP = 10;

export const ELEVATOR_BTN_HEIGHT = 100;
export const ELEVATOR_BTN_BOTTOM = 16;
export const ELEVATOR_PROMPT_GAP = 20;
export const ELEVATOR_PROMPT_BOTTOM_PORTRAIT = ELEVATOR_BTN_BOTTOM + ELEVATOR_BTN_HEIGHT + ELEVATOR_PROMPT_GAP;

export function elevatorQuestionLayout(w, h, { promptHeight } = {}) {
  const portrait = h > w;
  const btn = {
    top: h - ELEVATOR_BTN_BOTTOM - ELEVATOR_BTN_HEIGHT,
    bottom: h - ELEVATOR_BTN_BOTTOM,
    height: ELEVATOR_BTN_HEIGHT,
  };
  if (!portrait) {
    const ph = promptHeight ?? 150;
    const prompt = { top: 88, bottom: 88 + ph };
    return { portrait: false, dock: "top", btn, prompt, gap: btn.top - prompt.bottom };
  }
  const ph = promptHeight ?? 180;
  const promptBottom = h - ELEVATOR_PROMPT_BOTTOM_PORTRAIT;
  const prompt = { top: promptBottom - ph, bottom: promptBottom };
  return { portrait: true, dock: "bottom", btn, prompt, gap: btn.top - prompt.bottom };
}
