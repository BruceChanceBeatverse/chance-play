import { sfx, talk, stopTalk } from "./audio.js";
import { store } from "./store.js";
import { MODE_META, CARD_TEMPLATES, resolveCard } from "./data.js";
import { paintCardArt } from "./art.js";

export const root = () => document.getElementById("app");

export function el(tag, attrs = {}, ...children) {
  const node = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs || {})) {
    if (v == null || v === false) continue;
    if (k === "class") node.className = v;
    else if (k === "style" && typeof v === "object") Object.assign(node.style, v);
    else if (k.startsWith("on") && typeof v === "function") node.addEventListener(k.slice(2).toLowerCase(), v);
    else if (k === "html") node.innerHTML = v;
    else if (k === "text") node.textContent = v;
    else node.setAttribute(k, v === true ? "" : v);
  }
  for (const c of children.flat()) {
    if (c == null || c === false) continue;
    node.append(c.nodeType ? c : document.createTextNode(c));
  }
  return node;
}

export function clear(node) {
  stopTalk();
  node.replaceChildren();
  return node;
}

export function iconBtn(symbol, title, onClick) {
  return el("button", { class: "icon-btn", title, "aria-label": title, onClick: (e) => { sfx.tap(); onClick(e); } }, symbol);
}

export function topbar({ title, sub, onBack, extra } = {}) {
  const bar = el("div", { class: "topbar" });
  if (onBack) bar.append(iconBtn("←", "返回", onBack));
  if (title) {
    const chip = el("div", { class: "title-chip" }, title);
    if (sub) chip.append(el("span", { class: "sub" }, sub));
    bar.append(chip);
  }
  bar.append(el("div", { class: "spacer" }));
  if (extra) bar.append(extra);
  return bar;
}

export function hud(items) {
  const box = el("div", { class: "hud" + (items.length === 3 ? " cols-3" : "") });
  for (const it of items) {
    const v = el("div", { class: "v" + (it.tone ? " " + it.tone : "") }, it.value);
    box.append(el("div", { class: "stat" }, el("div", { class: "k" }, it.label), v));
    it._valueEl = v;
  }
  box.update = (vals) => {
    vals.forEach((v, i) => { if (items[i]?._valueEl) items[i]._valueEl.textContent = v; });
  };
  return box;
}

export function finishMode(onDone, goHome) {
  if (typeof onDone === "function") onDone();
  else goHome?.();
}

/** The 「去尺度之旅」 button must open the scale journey, not just return home. */
export function goToScaleJourney({ goZoom, onDone, goHome } = {}) {
  if (typeof goZoom === "function") {
    goZoom();
    return "zoom";
  }
  if (typeof onDone === "function") {
    onDone();
    return "done";
  }
  goHome?.();
  return "home";
}

export function promptBox(title, body, choices, onPick, opts = {}) {
  const dock = opts.dock ? " dock-" + opts.dock : " dock-bottom";
  const compact = opts.compact ? " compact" : "";
  const extra = opts.className ? " " + opts.className : "";
  const box = el("div", { class: "prompt" + dock + compact + extra },
    el("h2", { text: title }),
    body ? el("p", { text: body }) : null,
  );
  if (choices && choices.length) {
    const row = el("div", { class: "choices" });
    for (const c of choices) {
      const pictorial = Array.isArray(c.icons) && c.icons.length;
      const content = pictorial
        ? el("span", { class: "pictorial-row", "aria-hidden": "true" }, c.icons.join(" → "))
        : ((c.icon ? c.icon + " " : "") + c.label);
      row.append(el("button", {
        class: "choice" + (c.kind ? " " + c.kind : "") + (pictorial ? " pictorial" : ""),
        "aria-label": c.ariaLabel || c.label,
        onClick: () => { sfx.tap(); onPick(c); },
      }, content));
    }
    box.append(row);
  }
  return box;
}

export function toast(text, ms = 1800) {
  document.querySelectorAll(".toast").forEach((n) => n.remove());
  const t = el("div", { class: "toast", text });
  root().append(t);
  setTimeout(() => t.remove(), ms);
}

const ABSTRACT_CARDS = new Set(["c-mid", "c-times10"]);

/** Endpoint cards are awarded on arrival, not as a random quiz surprise. */
export const ENDPOINT_CARD_IDS = new Set(["c-planck", "c-universe"]);

export function maybeDropCard(mode, opts = {}) {
  const owned = new Set(store.get().cards.map((c) => c.id));
  let pool = CARD_TEMPLATES.filter((c) => c.mode === mode && !owned.has(c.id));
  if (Array.isArray(opts.allowOnly) && opts.allowOnly.length) {
    pool = pool.filter((c) => opts.allowOnly.includes(c.id));
  }
  if (!opts.allowEndpoints && !(opts.prefer && ENDPOINT_CARD_IDS.has(opts.prefer))) {
    pool = pool.filter((c) => !ENDPOINT_CARD_IDS.has(c.id));
  }
  if (opts.prefer) {
    const preferred = CARD_TEMPLATES.find((c) => c.id === opts.prefer && !owned.has(c.id));
    if (preferred && (opts.force || pool.some((c) => c.id === preferred.id) || preferred.mode === mode)) {
      pool = [preferred, ...pool.filter((c) => c.id !== preferred.id)];
    }
  }
  if (!pool.length) return null;
  // Occasional surprise, never promised. A little more often so a first
  // sitting can collect more than one or two cards.
  if (!opts.force && Math.random() > 0.72) return null;
  const personal = pool.filter((c) => !ABSTRACT_CARDS.has(c.id));
  // First card the child ever gets should be a personal world fact.
  let t;
  if (opts.prefer) {
    const preferred = pool.find((c) => c.id === opts.prefer);
    t = preferred || pool[0];
  } else if (store.get().cards.length === 0) {
    const anyPersonal = CARD_TEMPLATES.filter((c) => !ABSTRACT_CARDS.has(c.id) && !owned.has(c.id) && (opts.allowEndpoints || !ENDPOINT_CARD_IDS.has(c.id)));
    const preferMode = personal.length ? personal : anyPersonal;
    t = preferMode[0] || pool[0];
  } else {
    const src = personal.length ? personal : pool;
    t = src[Math.floor(Math.random() * src.length)];
  }
  const added = store.addCard(t);
  if (!added) return null;
  sfx.card();
  return t;
}

export function isRevealOpen(doc = typeof document !== "undefined" ? document : null) {
  return !!(doc && doc.querySelector && doc.querySelector(".reveal"));
}

export function dismissReveal(doc = typeof document !== "undefined" ? document : null) {
  if (!doc || !doc.querySelectorAll) return false;
  const wraps = [...doc.querySelectorAll(".reveal")];
  if (!wraps.length) return false;
  for (const wrap of wraps) {
    const done = wrap._onDone;
    wrap.remove();
    try { done?.(); } catch {}
  }
  return true;
}

export function cardFacePair(template) {
  const t = resolveCard(template) || template || {};
  const art = el("canvas", { class: "card-art", "aria-hidden": "true" });
  const front = el("div", { class: "card-face card-front" },
    art,
    el("div", { class: "k" }, "一张世界卡"),
    el("div", { class: "t" }, t.title || ""),
    el("div", { class: "v" }, t.value || ""),
    el("p", { class: "card-hint", text: "点卡片翻一面" }),
  );
  const back = el("div", { class: "card-face card-back" },
    el("div", { class: "k" }, "背面"),
    el("div", { class: "t" }, t.backTitle || "再看一眼"),
    el("p", { class: "card-back-note", text: t.back || "这是你世界里的一个数。再点可以翻回去。" }),
  );
  return { art, front, back, template: t };
}

export function showCard(template, onDone) {
  const { art, front, back, template: t } = cardFacePair(template);
  template = t;
  const card = el("div", { class: "card-drop flippable", "aria-label": "点卡片翻面" },
    el("div", { class: "card-inner" }, front, back),
  );
  bindCardFlip(card);
  const close = () => {
    if (!wrap.isConnected) return;
    wrap.remove();
    onDone?.();
  };
  const doneBtn = el("button", { class: "choice ok card-keep", onClick: (e) => {
    e.stopPropagation();
    close();
  } }, "收好");
  const wrap = el("div", { class: "reveal" }, card, doneBtn);
  wrap._onDone = onDone;
  // Backdrop dismiss: a card must not trap mode entry underneath it.
  wrap.addEventListener("click", (e) => {
    if (e.target === wrap) close();
  });
  root().append(wrap);
  requestAnimationFrame(() => paintCardArt(art, template));
  talk("一张世界卡。" + template.title + "，" + template.value + "。点卡片可以翻一面。");
}

/** Settled class list so a flipped card lands square, not in mid-flip perspective. */
export function cardFlipSettledClasses({ flipped = false } = {}) {
  return "card-drop flippable" + (flipped ? " flipped" : "") + " is-settled";
}

export function bindCardFlip(card) {
  if (!card || card._flipBound) return card;
  card._flipBound = true;
  card.classList.add("flippable");
  // Start settled so the first face is a flat rectangle, not a 3D sliver.
  card.classList.add("is-settled");
  let flipTimer = 0;
  const settle = (ev) => {
    const inner = card.querySelector(".card-inner");
    if (ev && ev.target && inner && ev.target !== inner) return;
    if (ev && ev.propertyName && ev.propertyName !== "transform") return;
    if (flipTimer) { clearTimeout(flipTimer); flipTimer = 0; }
    if (inner) inner.removeEventListener("transitionend", settle);
    card.classList.remove("is-flipping");
    card.classList.add("is-settled");
  };
  card.addEventListener("click", (e) => {
    if (e.target.closest && e.target.closest("button")) return;
    e.stopPropagation();
    const inner = card.querySelector(".card-inner");
    if (flipTimer) { clearTimeout(flipTimer); flipTimer = 0; }
    if (inner) inner.removeEventListener("transitionend", settle);
    card.classList.remove("is-settled");
    card.classList.add("is-flipping");
    void card.offsetWidth;
    card.classList.toggle("flipped");
    sfx.tap();
    if (inner) inner.addEventListener("transitionend", settle);
    // If transitions are disabled or the event is missed, still land square.
    flipTimer = setTimeout(() => settle(), 700);
  });
  return card;
}

/** Stay in the activity after a reveal. Do not dump to the hub. */
export function offerContinue(host, { title, body, tone = "info", actions = [], goHome, talk: spoken } = {}) {
  if (!host) return null;
  host.querySelectorAll(".continue-box").forEach((n) => n.remove());
  const box = el("div", { class: "prompt dock-bottom continue-box tone-" + tone });
  if (title) box.append(el("h2", { text: title }));
  if (body) box.append(el("p", { text: body }));
  const row = el("div", { class: "choices" });
  const all = actions.slice();
  if (goHome) all.push({ label: "回主页", onClick: goHome });
  for (const a of all) {
    row.append(el("button", {
      class: "choice" + (a.kind ? " " + a.kind : ""),
      onClick: () => { sfx.tap(); box.remove(); a.onClick?.(); },
    }, a.label));
  }
  box.append(row);
  host.append(box);
  if (spoken) talk(spoken);
  return box;
}

/** Mark right/wrong on a prompt, then continue without kicking to the menu. */
export function markAnswer(box, picked, ok) {
  if (!box) return;
  box.classList.add(ok ? "answer-ok" : "answer-no");
  box.querySelectorAll(".choice").forEach((btn) => {
    const isPicked = picked && (btn.getAttribute("aria-label") === (picked.ariaLabel || picked.label) || btn.textContent.includes(picked.label || "___none___"));
    if (isPicked) btn.classList.add(ok ? "is-right" : "is-wrong");
    if (picked && picked.ok && btn.getAttribute("aria-label") === (picked.ariaLabel || picked.label)) {
      /* already marked */
    }
  });
}


export function afterReveal(mode, onDone, opts = {}) {
  const card = maybeDropCard(mode, opts);
  if (card) showCard(card, onDone);
  else onDone?.();
}

export function fitCanvas(canvas) {
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  const r = canvas.getBoundingClientRect();
  const w = Math.max(1, Math.round(r.width * dpr));
  const h = Math.max(1, Math.round(r.height * dpr));
  if (canvas.width !== w || canvas.height !== h) {
    canvas.width = w; canvas.height = h;
  }
  const ctx = canvas.getContext("2d");
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  return { ctx, w: r.width, h: r.height, dpr };
}

export function bindDrag(elOrCanvas, handlers) {
  const target = elOrCanvas;
  const pt = (e) => {
    const t = e.touches ? e.touches[0] || e.changedTouches[0] : e;
    const r = target.getBoundingClientRect();
    if (!t || !Number.isFinite(t.clientX)) return { x: NaN, y: NaN, id: t && t.identifier };
    return { x: t.clientX - r.left, y: t.clientY - r.top, id: t.identifier };
  };
  let dragging = false;
  const onDown = (e) => {
    e.preventDefault();
    const p0 = pt(e);
    if (!Number.isFinite(p0.x)) return;
    dragging = true;
    handlers.down?.(p0, e);
  };
  const onMove = (e) => {
    if (!dragging && !e.touches) return;
    if (e.cancelable) e.preventDefault();
    const p0 = pt(e);
    if (!Number.isFinite(p0.x)) return;
    handlers.move?.(p0, e);
  };
  const onUp = (e) => {
    if (!dragging) return;
    dragging = false;
    const p0 = pt(e);
    handlers.up?.(p0, e);
  };
  target.addEventListener("pointerdown", onDown);
  window.addEventListener("pointermove", onMove);
  window.addEventListener("pointerup", onUp);
  window.addEventListener("pointercancel", onUp);
  return () => {
    target.removeEventListener("pointerdown", onDown);
    window.removeEventListener("pointermove", onMove);
    window.removeEventListener("pointerup", onUp);
    window.removeEventListener("pointercancel", onUp);
  };
}

export function bindPinch(el, onScale) {
  const pointers = new Map();
  let lastDist = 0;
  const dist = () => {
    const pts = [...pointers.values()];
    if (pts.length < 2) return 0;
    const dx = pts[0].x - pts[1].x, dy = pts[0].y - pts[1].y;
    return Math.hypot(dx, dy);
  };
  const pos = (e) => {
    const r = el.getBoundingClientRect();
    return { x: e.clientX - r.left, y: e.clientY - r.top };
  };
  const down = (e) => { el.setPointerCapture?.(e.pointerId); pointers.set(e.pointerId, pos(e)); lastDist = dist(); };
  const move = (e) => {
    if (!pointers.has(e.pointerId)) return;
    pointers.set(e.pointerId, pos(e));
    if (pointers.size === 2) {
      const d = dist();
      if (lastDist) onScale(d / lastDist, e);
      lastDist = d;
    }
  };
  const up = (e) => { pointers.delete(e.pointerId); lastDist = dist(); };
  el.addEventListener("pointerdown", down);
  el.addEventListener("pointermove", move);
  el.addEventListener("pointerup", up);
  el.addEventListener("pointercancel", up);
  const onWheel = (e) => {
    e.preventDefault();
    // Honour wheel magnitude so a Playwright deltaY of a few hundred
    // actually crosses layers (100 steps, mountain, Shanghai, Tokyo…).
    const mag = Math.max(1, Math.min(6, Math.abs(e.deltaY) / 80));
    onScale(e.deltaY < 0 ? Math.pow(1.6, mag) : Math.pow(1 / 1.6, mag), e);
  };
  el.addEventListener("wheel", onWheel, { passive: false });
  return () => {
    el.removeEventListener("pointerdown", down);
    el.removeEventListener("pointermove", move);
    el.removeEventListener("pointerup", up);
    el.removeEventListener("pointercancel", up);
    el.removeEventListener("wheel", onWheel);
  };
}

export function modeGlyph(id) {
  return {
    flight: "✈️", race: "🏁", hike: "⛰️", zoom: "🔎",
    numberline: "📏", compare: "⚖️", elevator: "🛗", cosmos: "🌌",
  }[id] || "⭐";
}

export function screen() {
  return el("section", { class: "screen" });
}

let parentTaps = [];
export function secretParentHotspot(node, goParent) {
  // Five quick taps on the top-right corner (or this node) open the parent view.
  node.style.pointerEvents = "auto";
  node.addEventListener("click", () => {
    const now = Date.now();
    parentTaps = parentTaps.filter((t) => now - t < 2500);
    parentTaps.push(now);
    if (parentTaps.length >= 5) {
      parentTaps = [];
      goParent();
    }
  });
}

export function starfield(canvas, { shooting = true } = {}) {
  let stars = [];
  let raf = 0;
  let running = true;
  const resize = () => {
    const { ctx, w, h } = fitCanvas(canvas);
    const n = Math.min(220, Math.floor((w * h) / 9000));
    stars = Array.from({ length: n }, () => ({
      x: Math.random() * w,
      y: Math.random() * h,
      r: Math.random() * 1.4 + 0.3,
      a: Math.random(),
      s: 0.003 + Math.random() * 0.01,
    }));
    return { ctx, w, h };
  };
  let view = resize();
  const onResize = () => { view = resize(); };
  window.addEventListener("resize", onResize);
  const tick = () => {
    if (!running) return;
    const { ctx, w, h } = view;
    ctx.fillStyle = "#071018";
    ctx.fillRect(0, 0, w, h);
    // soft aurora
    const g = ctx.createRadialGradient(w * 0.7, h * 0.2, 20, w * 0.5, h * 0.4, w * 0.8);
    g.addColorStop(0, "rgba(50,120,150,0.18)");
    g.addColorStop(1, "rgba(7,16,24,0)");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, h);
    for (const s of stars) {
      s.a += s.s;
      const a = 0.35 + 0.65 * (0.5 + 0.5 * Math.sin(s.a * 6));
      ctx.fillStyle = `rgba(244,239,228,${a})`;
      ctx.beginPath();
      ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
      ctx.fill();
    }
    raf = requestAnimationFrame(tick);
  };
  raf = requestAnimationFrame(tick);
  return () => {
    running = false;
    cancelAnimationFrame(raf);
    window.removeEventListener("resize", onResize);
  };
}

export { MODE_META };


/** CSS-pixel question-card vs HUD geometry. Portrait uses a 2-column HUD
 *  when width is at most 900 (iPad Pro 11 portrait is 834). The halfway
 *  question must leave the HUD, including the 「还要多久」 label, fully visible. */
export const HUD_LAYOUT = {
  bottom: 22,
  statMinHeight: 92,
  gap: 12,
  promptBottomPortrait: 240,
  promptBottomLandscape: 118,
  twoColMaxWidth: 900,
  labelBand: 18,
};

export function questionHudLayout(w, h, { items = 4 } = {}) {
  const portrait = h > w;
  const columns = (w <= HUD_LAYOUT.twoColMaxWidth && items >= 4) ? 2 : Math.min(items, 4);
  const rows = Math.ceil(items / columns);
  const hudHeight = rows * HUD_LAYOUT.statMinHeight + Math.max(0, rows - 1) * HUD_LAYOUT.gap;
  const hudTop = h - HUD_LAYOUT.bottom - hudHeight;
  const promptBottomOffset = portrait ? HUD_LAYOUT.promptBottomPortrait : HUD_LAYOUT.promptBottomLandscape;
  const promptBottom = h - promptBottomOffset;
  return {
    portrait,
    columns,
    rows,
    hudHeight,
    hudTop,
    promptBottom,
    gap: hudTop - promptBottom,
    labelBottom: hudTop + HUD_LAYOUT.labelBand,
  };
}


export function playHint(text) {
  const node = el("div", { class: "play-hint", text, role: "status" });
  let gone = false;
  node.dismiss = () => {
    if (gone) return;
    gone = true;
    node.classList.add("gone");
    setTimeout(() => node.remove(), 400);
  };
  setTimeout(() => node.dismiss(), 8000);
  return node;
}
