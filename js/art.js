/**
 * Shared Canvas 2D drawing helpers. No external assets.
 * Schematic art — richer than a wireframe, not a satellite photograph.
 */
import { eachRing } from "./coasts.js";
import { lonLatToXY, clamp, lerp, orthographic, greatCirclePoints } from "./geo.js";
import { airportByCode } from "./data.js";

export function fillSky(ctx, w, h, { top = "#143a5c", mid = "#0c2740", bot = "#071018" } = {}) {
  const g = ctx.createLinearGradient(0, 0, 0, h);
  g.addColorStop(0, top);
  g.addColorStop(0.55, mid);
  g.addColorStop(1, bot);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, w, h);
}

export function drawSoftClouds(ctx, w, h, t = 0) {
  ctx.save();
  for (let i = 0; i < 7; i++) {
    const x = ((i * 173 + t * 8) % (w + 200)) - 80;
    const y = 40 + (i * 53) % Math.max(80, h * 0.35);
    const s = 40 + (i % 3) * 18;
    ctx.globalAlpha = 0.08 + (i % 3) * 0.03;
    ctx.fillStyle = "#d7e7f5";
    puff(ctx, x, y, s);
  }
  ctx.restore();
}

function puff(ctx, x, y, s) {
  ctx.beginPath();
  ctx.arc(x, y, s, 0, Math.PI * 2);
  ctx.arc(x + s * 0.7, y + 4, s * 0.75, 0, Math.PI * 2);
  ctx.arc(x - s * 0.6, y + 6, s * 0.65, 0, Math.PI * 2);
  ctx.fill();
}

export function drawWater(ctx, w, h, view) {
  const g = ctx.createLinearGradient(0, 0, 0, h);
  g.addColorStop(0, "#0a3a58");
  g.addColorStop(0.45, "#0a4a6a");
  g.addColorStop(1, "#082033");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, w, h);
  ctx.save();
  ctx.globalAlpha = 0.12;
  ctx.strokeStyle = "#7ec8e3";
  ctx.lineWidth = 1;
  for (let i = 0; i < 14; i++) {
    const y = (h * (i + 1)) / 16;
    ctx.beginPath();
    for (let x = 0; x <= w; x += 12) {
      const yy = y + Math.sin((x + i * 40) / 48) * 2.2;
      if (x === 0) ctx.moveTo(x, yy);
      else ctx.lineTo(x, yy);
    }
    ctx.stroke();
  }
  ctx.restore();
}

export function drawLand(ctx, w, h, view) {
  ctx.save();
  ctx.fillStyle = "#1d4c3d";
  ctx.strokeStyle = "rgba(150, 220, 180, 0.28)";
  ctx.lineWidth = 1.2;
  eachRing((arr) => {
    ctx.beginPath();
    let started = false;
    for (let i = 0; i < arr.length; i += 2) {
      const { x, y } = lonLatToXY(arr[i], arr[i + 1], w, h, view);
      if (!started) { ctx.moveTo(x, y); started = true; }
      else ctx.lineTo(x, y);
    }
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
  });
  // a slightly lighter inland wash
  ctx.globalCompositeOperation = "source-atop";
  const shine = ctx.createLinearGradient(0, 0, 0, h);
  shine.addColorStop(0, "rgba(180, 220, 160, 0.16)");
  shine.addColorStop(1, "rgba(20, 40, 30, 0)");
  ctx.fillStyle = shine;
  ctx.fillRect(0, 0, w, h);
  ctx.restore();
}

export function drawGrid(ctx, w, h, view) {
  ctx.save();
  ctx.strokeStyle = "rgba(154,212,255,0.10)";
  ctx.lineWidth = 1;
  for (let lon = Math.ceil(view.lon0 / 10) * 10; lon <= view.lon1; lon += 10) {
    const a = lonLatToXY(lon, view.lat0, w, h, view);
    const b = lonLatToXY(lon, view.lat1, w, h, view);
    ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke();
  }
  for (let lat = Math.ceil(view.lat0 / 10) * 10; lat <= view.lat1; lat += 10) {
    const a = lonLatToXY(view.lon0, lat, w, h, view);
    const b = lonLatToXY(view.lon1, lat, w, h, view);
    ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke();
  }
  ctx.restore();
}

export function routeThumbLabelSize(label, fontSize = 16) {
  const text = String(label || "");
  let width = 0;
  for (const ch of text) width += /[㐀-鿿]/.test(ch) ? fontSize : fontSize * 0.55;
  return { w: width, h: fontSize };
}

/** Keep a city name fully inside a thumbnail so 「巴黎」 is not clipped. */
export function routeThumbLabelPos(x, y, label, w, h, { labelY = -16, fontSize = 16, pad = 10 } = {}) {
  const size = routeThumbLabelSize(label, fontSize);
  const half = size.w / 2;
  let lx = Math.min(w - pad - half, Math.max(pad + half, x));
  let ly = y + labelY;
  if (ly - size.h < pad) ly = Math.min(h - pad, y + size.h + 8);
  if (ly > h - pad) ly = h - pad;
  return { x: lx, y: ly, width: size.w, height: size.h };
}

export function drawCityGlow(ctx, x, y, label, { color = "#f5c84c", labelY = -16, labelAt } = {}) {
  const g = ctx.createRadialGradient(x, y, 2, x, y, 28);
  g.addColorStop(0, "rgba(255, 230, 160, 0.85)");
  g.addColorStop(0.4, "rgba(245, 200, 76, 0.28)");
  g.addColorStop(1, "rgba(245, 200, 76, 0)");
  ctx.fillStyle = g;
  ctx.beginPath(); ctx.arc(x, y, 28, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = "#f4efe4";
  ctx.beginPath(); ctx.arc(x, y, 6, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = color; ctx.lineWidth = 2; ctx.stroke();
  if (label) {
    ctx.font = "700 16px -apple-system, PingFang SC, sans-serif";
    ctx.textAlign = "center";
    ctx.fillStyle = "#f4efe4";
    const lx = labelAt?.x ?? x;
    const ly = labelAt?.y ?? (y + labelY);
    ctx.fillText(label, lx, ly);
  }
}

/** Pull-back sea beat: coastline, clouds, and waves. Land stays off the mid-canvas plane. */
export function drawSeaCloseup(ctx, w, h, { horizonY } = {}) {
  const hy = Number.isFinite(horizonY) ? horizonY : h * 0.46;
  const sky = ctx.createLinearGradient(0, 0, 0, hy);
  sky.addColorStop(0, "#081422");
  sky.addColorStop(0.35, "#2a5578");
  sky.addColorStop(0.72, "#7eabc4");
  sky.addColorStop(1, "#e4eef4");
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, w, Math.max(0, hy));

  // Soft sun on the left, above the hills, clear of the centered plane.
  const sunX = w * 0.18, sunY = Math.max(36, hy * 0.38);
  const sunG = ctx.createRadialGradient(sunX, sunY, 8, sunX, sunY, 70);
  sunG.addColorStop(0, "rgba(255, 236, 180, 0.95)");
  sunG.addColorStop(0.35, "rgba(255, 210, 130, 0.45)");
  sunG.addColorStop(1, "rgba(255, 200, 120, 0)");
  ctx.fillStyle = sunG;
  ctx.beginPath(); ctx.arc(sunX, sunY, 70, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = "rgba(255, 236, 190, 0.92)";
  ctx.beginPath(); ctx.arc(sunX, sunY, 18, 0, Math.PI * 2); ctx.fill();

  // Fixed clouds so a still frame stays stable (no time parameter).
  ctx.save();
  const clouds = [
    [0.08, 0.18, 36], [0.28, 0.14, 44], [0.62, 0.16, 40], [0.82, 0.22, 32], [0.48, 0.10, 28],
  ];
  ctx.fillStyle = "#e8f1f8";
  for (const [fx, fy, s] of clouds) {
    ctx.globalAlpha = 0.28;
    puff(ctx, w * fx, Math.max(22, hy * fy), s);
    ctx.globalAlpha = 0.16;
    puff(ctx, w * fx + s * 0.85, Math.max(22, hy * fy) + 6, s * 0.7);
  }
  ctx.restore();

  const water = ctx.createLinearGradient(0, hy, 0, h);
  water.addColorStop(0, "#c5e0e8");
  water.addColorStop(0.08, "#4a9bb3");
  water.addColorStop(0.45, "#17627c");
  water.addColorStop(1, "#0a2430");
  ctx.fillStyle = water;
  ctx.fillRect(0, hy, w, Math.max(0, h - hy));

  // Richer waves: denser near the horizon, a few foam crests.
  ctx.save();
  const band = Math.max(24, h - hy);
  for (let i = 0; i < 16; i++) {
    const y = hy + 8 + i * (band / 16);
    const amp = 2.2 + (i < 5 ? 3.2 : 1.6);
    ctx.strokeStyle = i % 3 === 0 ? "rgba(255,255,255,0.38)" : "rgba(180, 230, 240, 0.22)";
    ctx.lineWidth = i < 4 ? 2 : 1.2;
    ctx.beginPath();
    for (let x = 0; x <= w; x += 14) {
      const yy = y + Math.sin(x / 22 + i * 0.85) * amp + Math.sin(x / 70 + i) * 1.4;
      if (x === 0) ctx.moveTo(x, yy);
      else ctx.lineTo(x, yy);
    }
    ctx.stroke();
  }
  ctx.restore();

  // A low continuous coastline under the plane (stays well below it) plus
  // taller hills on both sides so the beat is not just a sliver and empty water.
  ctx.fillStyle = "#163828";
  ctx.beginPath();
  ctx.moveTo(0, hy + 18);
  ctx.lineTo(0, hy - 86);
  ctx.quadraticCurveTo(w * 0.08, hy - 130, w * 0.16, hy - 70);
  ctx.quadraticCurveTo(w * 0.24, hy - 36, w * 0.36, hy - 16);
  ctx.quadraticCurveTo(w * 0.5, hy - 8, w * 0.64, hy - 14);
  ctx.quadraticCurveTo(w * 0.78, hy - 22, w * 0.86, hy - 48);
  ctx.quadraticCurveTo(w * 0.93, hy - 80, w, hy - 64);
  ctx.lineTo(w, hy + 18);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = "#2a6a55";
  ctx.beginPath();
  ctx.moveTo(0, hy + 12);
  ctx.lineTo(0, hy - 44);
  ctx.quadraticCurveTo(w * 0.1, hy - 72, w * 0.2, hy - 28);
  ctx.quadraticCurveTo(w * 0.32, hy - 8, w * 0.48, hy - 2);
  ctx.quadraticCurveTo(w * 0.68, hy - 6, w * 0.8, hy - 18);
  ctx.quadraticCurveTo(w * 0.9, hy - 36, w, hy - 28);
  ctx.lineTo(w, hy + 12);
  ctx.closePath();
  ctx.fill();
  // Sandy/green beach along the waterline.
  ctx.fillStyle = "#c9b07a";
  ctx.beginPath();
  ctx.moveTo(0, hy + 10);
  ctx.quadraticCurveTo(w * 0.25, hy + 4, w * 0.5, hy + 8);
  ctx.quadraticCurveTo(w * 0.75, hy + 3, w, hy + 9);
  ctx.lineTo(w, hy + 16);
  ctx.lineTo(0, hy + 16);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = "rgba(244,239,228,0.55)";
  ctx.fillRect(0, hy + 1, w, 3);

  // Simple tree marks on the left hills only — keep the mid sky clear for the plane.
  ctx.fillStyle = "#0f2e22";
  for (const [fx, rise, r] of [[0.05, 54, 7], [0.09, 70, 8], [0.13, 42, 6], [0.88, 40, 6], [0.93, 52, 7]]) {
    const x = w * fx;
    const y = hy - rise;
    ctx.beginPath(); ctx.moveTo(x, y - r * 2.2); ctx.lineTo(x + r, y + r * 0.4); ctx.lineTo(x - r, y + r * 0.4); ctx.closePath(); ctx.fill();
  }

  ctx.strokeStyle = "rgba(244,239,228,0.55)";
  ctx.lineWidth = 1.5;
  ctx.beginPath(); ctx.moveTo(0, hy + 2); ctx.lineTo(w, hy + 2); ctx.stroke();
}

export function drawRoute(ctx, xy, progress) {
  if (!xy.length) return;
  ctx.save();
  ctx.lineJoin = "round";
  ctx.lineCap = "round";
  ctx.strokeStyle = "rgba(245,200,76,0.28)";
  ctx.lineWidth = 16;
  ctx.beginPath();
  xy.forEach((p, i) => i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y));
  ctx.stroke();
  ctx.strokeStyle = "#f5c84c";
  ctx.lineWidth = 3.5;
  ctx.beginPath();
  xy.forEach((p, i) => i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y));
  ctx.stroke();
  const ni = Math.floor(clamp(progress, 0, 1) * (xy.length - 1));
  ctx.strokeStyle = "#5ce1e6";
  ctx.lineWidth = 5;
  ctx.beginPath();
  for (let i = 0; i <= ni; i++) i ? ctx.lineTo(xy[i].x, xy[i].y) : ctx.moveTo(xy[i].x, xy[i].y);
  ctx.stroke();
  ctx.restore();
}

export function drawPlane(ctx, x, y, angle, scale = 1) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(angle);
  ctx.scale(scale, scale);
  ctx.shadowColor = "rgba(0,0,0,0.45)";
  ctx.shadowBlur = 12;
  ctx.shadowOffsetY = 6;
  ctx.fillStyle = "#f7f3ea";
  ctx.strokeStyle = "#3aa8b0";
  ctx.lineWidth = 1.8;
  ctx.beginPath();
  ctx.moveTo(26, 0);
  ctx.lineTo(-16, 8);
  ctx.lineTo(-12, 2.4);
  ctx.lineTo(-22, 2.4);
  ctx.lineTo(-24, 7);
  ctx.lineTo(-28, 7);
  ctx.lineTo(-26, 0);
  ctx.lineTo(-28, -7);
  ctx.lineTo(-24, -7);
  ctx.lineTo(-22, -2.4);
  ctx.lineTo(-12, -2.4);
  ctx.lineTo(-16, -8);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  ctx.shadowColor = "transparent";
  ctx.fillStyle = "#5ce1e6";
  ctx.beginPath();
  ctx.moveTo(4, 0); ctx.lineTo(-6, 18); ctx.lineTo(-11, 18); ctx.lineTo(-2, 0);
  ctx.moveTo(4, 0); ctx.lineTo(-6, -18); ctx.lineTo(-11, -18); ctx.lineTo(-2, 0);
  ctx.fill();
  ctx.fillStyle = "#1a3a50";
  ctx.beginPath(); ctx.ellipse(8, 0, 5, 2.2, 0, 0, Math.PI * 2); ctx.fill();
  ctx.restore();
}

export function drawGlobe(ctx, cx, cy, R, { lonC = 125, latC = 28, route = null } = {}) {
  const grd = ctx.createRadialGradient(cx - R * 0.35, cy - R * 0.4, R * 0.1, cx, cy, R);
  grd.addColorStop(0, "#6ec8d8");
  grd.addColorStop(0.45, "#1d6a86");
  grd.addColorStop(1, "#071018");
  ctx.beginPath(); ctx.arc(cx, cy, R, 0, Math.PI * 2); ctx.fillStyle = grd; ctx.fill();
  ctx.save();
  ctx.beginPath(); ctx.arc(cx, cy, R, 0, Math.PI * 2); ctx.clip();
  ctx.fillStyle = "#2f8a5a";
  eachRing((arr) => {
    ctx.beginPath();
    let started = false, visible = false;
    for (let i = 0; i < arr.length; i += 2) {
      const p = orthographic(arr[i], arr[i + 1], cx, cy, R, lonC, latC);
      if (!p) { started = false; continue; }
      visible = true;
      if (!started) { ctx.moveTo(p.x, p.y); started = true; }
      else ctx.lineTo(p.x, p.y);
    }
    if (visible) { ctx.closePath(); ctx.fill(); }
  });
  if (route && route.length) {
    ctx.strokeStyle = "#f5c84c";
    ctx.lineWidth = Math.max(2, R * 0.03);
    ctx.lineJoin = "round";
    ctx.lineCap = "round";
    ctx.beginPath();
    let started = false;
    for (const pt of route) {
      const q = orthographic(pt.lon, pt.lat, cx, cy, R, lonC, latC);
      if (!q) { started = false; continue; }
      if (!started) { ctx.moveTo(q.x, q.y); started = true; }
      else ctx.lineTo(q.x, q.y);
    }
    ctx.stroke();
  }
  const shade = ctx.createRadialGradient(cx + R * 0.3, cy, R * 0.2, cx, cy, R);
  shade.addColorStop(0, "rgba(0,0,0,0)");
  shade.addColorStop(1, "rgba(0,0,0,0.35)");
  ctx.fillStyle = shade;
  ctx.beginPath(); ctx.arc(cx, cy, R, 0, Math.PI * 2); ctx.fill();
  ctx.restore();
  ctx.strokeStyle = "rgba(180, 240, 255, 0.45)";
  ctx.lineWidth = 2;
  ctx.beginPath(); ctx.arc(cx, cy, R, 0, Math.PI * 2); ctx.stroke();
}

/** Paint a small illustrated scene onto a world-card canvas. */
/** Which picture a world card should use — never fall back to the Tokyo flight map. */
export function cardArtKind(id) {
  switch (id) {
    case "c-tokyo": return "route-hnd";
    case "c-paris":
    case "c-paris-flight": return "route-cdg";
    case "c-route": return "halfway-line";
    case "c-lapse": return "sky-alt";
    case "c-walk": return "racer-walk";
    case "c-bike": return "racer-bike";
    case "c-plane": return "racer-plane";
    case "c-hsr": return "hsr";
    case "c-sheshan": return "hill";
    case "c-huangshan": return "huangshan";
    case "c-fuji": return "fuji";
    case "c-earth": return "earth";
    case "c-moon": return "moon";
    case "c-sun": return "sun";
    case "c-ly": return "light-year";
    case "c-times10": return "beads";
    case "c-mid": return "number-mid";
    case "c-planck": return "planck";
    case "c-universe": return "universe";
    case "c-ant": return "ant";
    case "c-blackhole": return "blackhole";
    default: return "generic";
  }
}

export function paintCardArt(canvas, template = {}) {
  if (!canvas) return;
  const dpr = Math.min((typeof window !== "undefined" && window.devicePixelRatio) || 1, 2);
  const r = canvas.getBoundingClientRect();
  const w = Math.max(1, r.width || Number(canvas.getAttribute("width")) || 400);
  const h = Math.max(1, r.height || Number(canvas.getAttribute("height")) || 180);
  canvas.width = Math.round(w * dpr);
  canvas.height = Math.round(h * dpr);
  const ctx = canvas.getContext("2d");
  if (!ctx) return;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  const kind = cardArtKind(template.id || "");
  if (kind === "route-hnd") paintRouteThumb(ctx, w, h, "PVG", "HND", { lon0: 110, lon1: 150, lat0: 20, lat1: 46 });
  else if (kind === "route-cdg") paintRouteThumb(ctx, w, h, "PVG", "CDG", { lon0: 0, lon1: 140, lat0: 10, lat1: 60 });
  else if (kind === "halfway-line") paintHalfwayThumb(ctx, w, h);
  else if (kind === "sky-alt") paintSkyAlt(ctx, w, h);
  else if (kind === "racer-walk") paintRacerThumb(ctx, w, h, "🚶", "#c9f0a8");
  else if (kind === "racer-bike") paintRacerThumb(ctx, w, h, "🚲", "#7dffb3");
  else if (kind === "racer-plane") paintRacerThumb(ctx, w, h, "✈️", "#5ce1e6");
  else if (kind === "hsr") paintHsrThumb(ctx, w, h);
  else if (kind === "hill") paintHillThumb(ctx, w, h);
  else if (kind === "huangshan") paintHuangshanThumb(ctx, w, h);
  else if (kind === "fuji") paintFujiThumb(ctx, w, h);
  else if (kind === "earth") { fillSky(ctx, w, h); drawGlobe(ctx, w / 2, h / 2 + 6, Math.min(w, h) * 0.38, { lonC: 125, latC: 28 }); }
  else if (kind === "moon") paintMoonThumb(ctx, w, h);
  else if (kind === "sun") { fillSky(ctx, w, h, { top: "#1a1020", mid: "#2a1810", bot: "#071018" }); drawSun(ctx, w / 2, h / 2, Math.min(w, h) * 0.28); }
  else if (kind === "light-year") paintLightYearThumb(ctx, w, h);
  else if (kind === "beads") paintBeadsThumb(ctx, w, h);
  else if (kind === "number-mid") paintLineThumb(ctx, w, h);
  else if (kind === "planck") paintPlanckThumb(ctx, w, h);
  else if (kind === "universe") paintUniverseThumb(ctx, w, h);
  else if (kind === "ant") paintAntThumb(ctx, w, h);
  else if (kind === "blackhole") paintBlackholeThumb(ctx, w, h);
  else paintGenericThumb(ctx, w, h);
}

export function paintRouteThumb(ctx, w, h, fromCode, toCode, view) {
  const from = airportByCode(fromCode);
  const to = airportByCode(toCode);
  if (!from || !to) { fillSky(ctx, w, h); return; }
  const pts = greatCirclePoints(from.lat, from.lon, to.lat, to.lon, 48);
  drawWater(ctx, w, h, view);
  drawLand(ctx, w, h, view);
  const xy = pts.map((p) => lonLatToXY(p.lon, p.lat, w, h, view));
  drawRoute(ctx, xy, 0.55);
  const fromLab = routeThumbLabelPos(xy[0].x, xy[0].y, from.city, w, h);
  const toLab = routeThumbLabelPos(xy[xy.length - 1].x, xy[xy.length - 1].y, to.city, w, h);
  drawCityGlow(ctx, xy[0].x, xy[0].y, from.city, { labelAt: fromLab });
  drawCityGlow(ctx, xy[xy.length - 1].x, xy[xy.length - 1].y, to.city, { labelAt: toLab });
  const i = Math.floor(0.55 * (xy.length - 1));
  const here = xy[i], nxt = xy[Math.min(xy.length - 1, i + 1)];
  const ang = Math.atan2(nxt.y - here.y, nxt.x - here.x);
  drawPlane(ctx, here.x, here.y, ang, 1.05);
}

function paintSkyAlt(ctx, w, h) {
  const g = ctx.createLinearGradient(0, 0, 0, h);
  g.addColorStop(0, "#071018");
  g.addColorStop(0.5, "#143a5c");
  g.addColorStop(1, "#7dffb3");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, w, h);
  ctx.fillStyle = "#f4efe4";
  ctx.font = "700 18px -apple-system, PingFang SC, sans-serif";
  ctx.textAlign = "center";
  ctx.fillText("11 km  −56°C", w / 2, h * 0.28);
  ctx.fillText("地面  +15°C", w / 2, h * 0.82);
  drawPlane(ctx, w * 0.7, h * 0.3, -0.4, 1);
}

function paintRacerThumb(ctx, w, h, emoji, color) {
  const g = ctx.createLinearGradient(0, 0, 0, h);
  g.addColorStop(0, "#143a5c");
  g.addColorStop(1, "#071018");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, w, h);
  ctx.strokeStyle = "rgba(92,225,230,0.35)";
  ctx.lineWidth = 10;
  ctx.beginPath(); ctx.moveTo(16, h * 0.55); ctx.lineTo(w - 16, h * 0.55); ctx.stroke();
  ctx.fillStyle = color;
  ctx.beginPath(); ctx.arc(w * 0.55, h * 0.55, 18, 0, Math.PI * 2); ctx.fill();
  ctx.font = "28px -apple-system";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(emoji, w * 0.55, h * 0.55 + 2);
}

function paintHillThumb(ctx, w, h) {
  fillSky(ctx, w, h, { top: "#7eb6e0", mid: "#b8d4c8", bot: "#2a6a55" });
  ctx.fillStyle = "#1d4c3d";
  ctx.beginPath();
  ctx.moveTo(0, h);
  ctx.lineTo(w * 0.45, h * 0.28);
  ctx.lineTo(w, h);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = "#f4efe4";
  ctx.beginPath();
  ctx.moveTo(w * 0.38, h * 0.38);
  ctx.lineTo(w * 0.45, h * 0.28);
  ctx.lineTo(w * 0.54, h * 0.4);
  ctx.closePath();
  ctx.fill();
}

function paintMoonThumb(ctx, w, h) {
  fillSky(ctx, w, h);
  drawGlobe(ctx, w * 0.32, h * 0.55, Math.min(w, h) * 0.32, { lonC: 130, latC: 28 });
  drawMoon(ctx, w * 0.78, h * 0.38, Math.min(w, h) * 0.16);
}

function paintBeadsThumb(ctx, w, h) {
  fillSky(ctx, w, h, { top: "#1a2a20", mid: "#0b1a28", bot: "#071018" });
  for (let r = 0; r < 4; r++) {
    for (let c = 0; c < 6; c++) {
      ctx.fillStyle = "#f5c84c";
      ctx.beginPath();
      ctx.arc(w * 0.2 + c * 18, h * 0.3 + r * 18, 7, 0, Math.PI * 2);
      ctx.fill();
    }
  }
}

function paintLineThumb(ctx, w, h) {
  fillSky(ctx, w, h, { top: "#173a5c", mid: "#0c2740", bot: "#0a3a30" });
  ctx.strokeStyle = "#f5c84c";
  ctx.lineWidth = 4;
  ctx.beginPath(); ctx.moveTo(20, h * 0.6); ctx.lineTo(w - 20, h * 0.6); ctx.stroke();
  ctx.fillStyle = "#f4efe4";
  ctx.font = "700 14px -apple-system, PingFang SC, sans-serif";
  ctx.textAlign = "center";
  ctx.fillText("0", 24, h * 0.6 + 22);
  ctx.fillText("50", w / 2, h * 0.6 + 22);
  ctx.fillText("100", w - 28, h * 0.6 + 22);
}

function paintHalfwayThumb(ctx, w, h) {
  fillSky(ctx, w, h, { top: "#173a5c", mid: "#0c2740", bot: "#0a3a30" });
  ctx.strokeStyle = "#f5c84c";
  ctx.lineWidth = 4;
  ctx.beginPath(); ctx.moveTo(20, h * 0.55); ctx.lineTo(w - 20, h * 0.55); ctx.stroke();
  ctx.fillStyle = "#f4efe4";
  ctx.font = "700 14px -apple-system, PingFang SC, sans-serif";
  ctx.textAlign = "center";
  ctx.fillText("上海", 36, h * 0.55 + 24);
  ctx.fillStyle = "#5ce1e6";
  ctx.beginPath(); ctx.arc(w / 2, h * 0.55, 8, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = "#f5c84c";
  ctx.fillText("870 公里", w / 2, h * 0.55 - 16);
  ctx.fillStyle = "#f4efe4";
  ctx.fillText("东京", w - 36, h * 0.55 + 24);
}

function paintHsrThumb(ctx, w, h) {
  const g = ctx.createLinearGradient(0, 0, 0, h);
  g.addColorStop(0, "#1a3350");
  g.addColorStop(1, "#0a1a12");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, w, h);
  ctx.strokeStyle = "rgba(244,239,228,0.55)";
  ctx.lineWidth = 5;
  ctx.beginPath(); ctx.moveTo(8, h * 0.72); ctx.lineTo(w - 8, h * 0.62); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(8, h * 0.82); ctx.lineTo(w - 8, h * 0.72); ctx.stroke();
  ctx.fillStyle = "#5ce1e6";
  ctx.beginPath();
  ctx.moveTo(w * 0.22, h * 0.62);
  ctx.lineTo(w * 0.78, h * 0.5);
  ctx.lineTo(w * 0.82, h * 0.62);
  ctx.lineTo(w * 0.2, h * 0.74);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = "#143a5c";
  for (let i = 0; i < 5; i++) ctx.fillRect(w * 0.32 + i * 18, h * 0.56, 10, 10);
  ctx.fillStyle = "#f4efe4";
  ctx.font = "700 16px -apple-system, PingFang SC, sans-serif";
  ctx.textAlign = "center";
  ctx.fillText("高铁", w / 2, h * 0.28);
}

function paintHuangshanThumb(ctx, w, h) {
  fillSky(ctx, w, h, { top: "#6aa0c8", mid: "#c5d8c4", bot: "#2a4a3a" });
  ctx.fillStyle = "#2a4a38";
  ctx.beginPath();
  ctx.moveTo(0, h);
  ctx.lineTo(w * 0.18, h * 0.48);
  ctx.lineTo(w * 0.32, h * 0.22);
  ctx.lineTo(w * 0.42, h * 0.4);
  ctx.lineTo(w * 0.55, h * 0.16);
  ctx.lineTo(w * 0.68, h * 0.38);
  ctx.lineTo(w * 0.86, h * 0.3);
  ctx.lineTo(w, h);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = "#3d6a50";
  ctx.beginPath();
  ctx.moveTo(w * 0.08, h);
  ctx.lineTo(w * 0.28, h * 0.55);
  ctx.lineTo(w * 0.5, h);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = "#d8e8e0";
  ctx.beginPath();
  ctx.moveTo(w * 0.5, h * 0.16);
  ctx.lineTo(w * 0.55, h * 0.08);
  ctx.lineTo(w * 0.62, h * 0.2);
  ctx.closePath();
  ctx.fill();
}

function paintFujiThumb(ctx, w, h) {
  fillSky(ctx, w, h, { top: "#6b9ad4", mid: "#d7e6f4", bot: "#3a6a4a" });
  ctx.fillStyle = "#2d4a3c";
  ctx.beginPath();
  ctx.moveTo(0, h);
  ctx.lineTo(w * 0.5, h * 0.12);
  ctx.lineTo(w, h);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = "#f4efe4";
  ctx.beginPath();
  ctx.moveTo(w * 0.38, h * 0.34);
  ctx.lineTo(w * 0.5, h * 0.12);
  ctx.lineTo(w * 0.62, h * 0.34);
  ctx.quadraticCurveTo(w * 0.5, h * 0.28, w * 0.38, h * 0.34);
  ctx.fill();
}

function paintLightYearThumb(ctx, w, h) {
  fillSky(ctx, w, h, { top: "#120818", mid: "#1a1028", bot: "#071018" });
  ctx.strokeStyle = "rgba(245,200,76,0.7)";
  ctx.lineWidth = 3;
  ctx.setLineDash([6, 8]);
  ctx.beginPath(); ctx.moveTo(16, h * 0.55); ctx.lineTo(w - 16, h * 0.55); ctx.stroke();
  ctx.setLineDash([]);
  ctx.fillStyle = "#fff4c2";
  ctx.shadowColor = "#f5c84c";
  ctx.shadowBlur = 16;
  ctx.beginPath(); ctx.arc(w * 0.22, h * 0.55, 8, 0, Math.PI * 2); ctx.fill();
  ctx.shadowBlur = 0;
  ctx.fillStyle = "#ff7a59";
  ctx.beginPath(); ctx.arc(w * 0.82, h * 0.55, 10, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = "#f4efe4";
  ctx.font = "700 16px -apple-system, PingFang SC, sans-serif";
  ctx.textAlign = "center";
  ctx.fillText("1 光年", w / 2, h * 0.32);
}

function paintPlanckThumb(ctx, w, h) {
  fillSky(ctx, w, h, { top: "#08060e", mid: "#12081a", bot: "#050308" });
  ctx.fillStyle = "#f5c84c";
  ctx.beginPath(); ctx.arc(w / 2, h / 2, 2.5, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = "rgba(92,225,230,0.35)";
  ctx.lineWidth = 1;
  ctx.beginPath(); ctx.arc(w / 2, h / 2, Math.min(w, h) * 0.28, 0, Math.PI * 2); ctx.stroke();
  ctx.fillStyle = "rgba(244,239,228,0.8)";
  ctx.font = "700 14px -apple-system, PingFang SC, sans-serif";
  ctx.textAlign = "center";
  ctx.fillText("很小很小", w / 2, h * 0.82);
}

function paintUniverseThumb(ctx, w, h) {
  fillSky(ctx, w, h, { top: "#050814", mid: "#101830", bot: "#071018" });
  for (let i = 0; i < 40; i++) {
    ctx.fillStyle = "rgba(244,239,228," + (0.25 + (i % 5) * 0.12) + ")";
    ctx.beginPath();
    ctx.arc((i * 47) % w, (i * 29) % h, 1.2 + (i % 3) * 0.6, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.strokeStyle = "rgba(92,225,230,0.45)";
  ctx.lineWidth = 2;
  ctx.beginPath(); ctx.arc(w / 2, h / 2, Math.min(w, h) * 0.36, 0, Math.PI * 2); ctx.stroke();
  ctx.fillStyle = "#f4efe4";
  ctx.font = "700 16px -apple-system, PingFang SC, sans-serif";
  ctx.textAlign = "center";
  ctx.fillText("宇宙", w / 2, h / 2 + 6);
}

function paintAntThumb(ctx, w, h) {
  fillSky(ctx, w, h, { top: "#3a5a38", mid: "#1e3a24", bot: "#102016" });
  ctx.fillStyle = "#1a1208";
  const x = w * 0.5, y = h * 0.55;
  ctx.beginPath(); ctx.ellipse(x - 22, y, 12, 8, 0, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.ellipse(x, y, 14, 9, 0, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.ellipse(x + 20, y - 2, 10, 7, 0, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = "#1a1208";
  ctx.lineWidth = 2;
  ctx.beginPath(); ctx.moveTo(x + 26, y - 6); ctx.lineTo(x + 38, y - 16); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(x + 26, y - 4); ctx.lineTo(x + 40, y - 8); ctx.stroke();
}

function paintBlackholeThumb(ctx, w, h) {
  fillSky(ctx, w, h, { top: "#120818", mid: "#08040c", bot: "#050308" });
  const cx = w / 2, cy = h * 0.52, rad = Math.min(w, h) * 0.22;
  ctx.strokeStyle = "#f5c84c";
  ctx.lineWidth = 8;
  ctx.beginPath(); ctx.ellipse(cx, cy, rad * 1.55, rad * 0.45, 0.15, 0, Math.PI * 2); ctx.stroke();
  ctx.fillStyle = "#000";
  ctx.beginPath(); ctx.arc(cx, cy, Math.max(10, rad), 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = "rgba(92,225,230,0.55)";
  ctx.lineWidth = 2;
  ctx.stroke();
}

function paintGenericThumb(ctx, w, h) {
  fillSky(ctx, w, h, { top: "#1a2a40", mid: "#0c1a28", bot: "#071018" });
  ctx.strokeStyle = "rgba(245,200,76,0.5)";
  ctx.lineWidth = 2;
  ctx.beginPath(); ctx.arc(w / 2, h / 2, Math.min(w, h) * 0.3, 0, Math.PI * 2); ctx.stroke();
  ctx.fillStyle = "#f5c84c";
  ctx.beginPath(); ctx.arc(w / 2, h / 2, 6, 0, Math.PI * 2); ctx.fill();
}

export function drawMoon(ctx, x, y, r) {
  const g = ctx.createRadialGradient(x - r * 0.3, y - r * 0.3, r * 0.1, x, y, r);
  g.addColorStop(0, "#f0ead8");
  g.addColorStop(1, "#a79c86");
  ctx.fillStyle = g;
  ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = "rgba(80,70,60,0.18)";
  ctx.beginPath(); ctx.arc(x - r * 0.25, y - r * 0.15, r * 0.18, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.arc(x + r * 0.2, y + r * 0.15, r * 0.12, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.arc(x + r * 0.05, y - r * 0.35, r * 0.1, 0, Math.PI * 2); ctx.fill();
}

export function drawSun(ctx, x, y, r) {
  const halo = ctx.createRadialGradient(x, y, r * 0.4, x, y, r * 1.8);
  halo.addColorStop(0, "rgba(255, 230, 120, 0.85)");
  halo.addColorStop(1, "rgba(255, 180, 40, 0)");
  ctx.fillStyle = halo;
  ctx.beginPath(); ctx.arc(x, y, r * 1.8, 0, Math.PI * 2); ctx.fill();
  const g = ctx.createRadialGradient(x, y, r * 0.1, x, y, r);
  g.addColorStop(0, "#fff4c2");
  g.addColorStop(1, "#f5c84c");
  ctx.fillStyle = g;
  ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill();
}

export function drawMountainPair(ctx, x, y, heightPx, { snow = true, color = "#2a6a55" } = {}) {
  ctx.save();
  ctx.translate(x, y);
  ctx.fillStyle = "#163328";
  ctx.beginPath();
  ctx.moveTo(-heightPx * 0.75, 8);
  ctx.lineTo(0, -heightPx);
  ctx.lineTo(heightPx * 0.85, 8);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.moveTo(-heightPx * 0.55, 8);
  ctx.lineTo(-heightPx * 0.1, -heightPx * 0.7);
  ctx.lineTo(heightPx * 0.35, 8);
  ctx.closePath();
  ctx.fill();
  if (snow && heightPx > 40) {
    ctx.fillStyle = "#f4efe4";
    ctx.beginPath();
    ctx.moveTo(-heightPx * 0.16, -heightPx * 0.62);
    ctx.lineTo(0, -heightPx);
    ctx.lineTo(heightPx * 0.18, -heightPx * 0.58);
    ctx.closePath();
    ctx.fill();
  }
  ctx.restore();
}

export function uniqueTimeLabels(labels) {
  const seen = new Set();
  for (const l of labels) {
    if (seen.has(l)) return false;
    seen.add(l);
  }
  return true;
}

export { lerp, clamp };
