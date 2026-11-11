import { store } from "./store.js";
import { talk, unlockAudio } from "./audio.js";
import { el, screen, toast } from "./ui.js";
import { AIRPORTS, TASK_BANK, MODE_META, airportByCode, routeDistanceKm } from "./data.js";
import { formatNumber, haversineKm } from "./geo.js";

export function renderParent(app, go) {
  const s = screen();
  s.classList.add("parent");
  const st = store.get();
  const wrap = el("div", {});
  wrap.append(
    el("button", { class: "icon-btn", onClick: () => go("home") }, "←"),
    el("h1", { text: "家长视图" }),
    el("p", { class: "note" }, "只有连点右下角小点五下才会进来。所有数据只存在这台 iPad 里，没有账号，也不会上传。"),
  );

  // Weekly report first, so it is not buried under the long task / settings list.
  wrap.append(el("h2", { text: "周日周报" }));
  wrap.append(weeklyReport(st));

  // Settings
  wrap.append(el("h2", { text: "声音和语言" }));
  const set = el("div", { class: "grid-2" });
  set.append(toggle("打开语音", st.settings.voiceOn, (v) => store.patch({ settings: { ...store.get().settings, voiceOn: v } })));
  set.append(toggle("中英双语朗读 / Speak Chinese and English", st.settings.bilingual, (v) => store.patch({ settings: { ...store.get().settings, bilingual: v } })));
  wrap.append(set);

  // Body
  wrap.append(el("h2", { text: "我的身体（请改成真实数字）" }));
  wrap.append(el("p", { class: "note" }, "身高默认 1.20 米、步长默认 0.50 米、家到学校默认 2 公里、去机场大约 40 公里，都是假设值。"));
  const body = el("div", { class: "grid-2" },
    numField("身高（米）", st.profile.heightM, (v) => patchProfile("heightM", v)),
    numField("步长（米）", st.profile.strideM, (v) => patchProfile("strideM", v)),
    numField("家到学校（公里）", st.profile.schoolKm, (v) => patchProfile("schoolKm", v)),
    numField("市区到机场大约（公里）", st.profile.cityAirportKm, (v) => patchProfile("cityAirportKm", v)),
  );
  wrap.append(body);

  // Speeds
  wrap.append(el("h2", { text: "单车和滑雪的速度（公里/小时，假设值可改）" }));
  const speeds = el("div", { class: "grid-2" });
  for (const r of st.racers) {
    speeds.append(numField(r.name, r.kmh, (v) => {
      store.update((s) => ({ ...s, racers: s.racers.map((x) => x.id === r.id ? { ...x, kmh: v } : x) }));
    }));
  }
  wrap.append(speeds);

  // Trips
  wrap.append(el("h2", { text: "我们的旅行" }));
  const tripList = el("div", {});
  function redrawTrips() {
    tripList.replaceChildren();
    for (const t of store.get().trips) {
      const km = routeDistanceKm(t.from, t.to);
      tripList.append(el("div", { class: "mini", style: { marginBottom: "8px" } },
        el("div", { class: "k" }, t.from + " → " + t.to),
        el("div", { class: "v" }, t.label + (km ? " · " + formatNumber(Math.round(km)) + " 公里" : "（机场代码没找到）")),
      ));
    }
  }
  redrawTrips();
  const fromIn = el("input", { placeholder: "出发机场，如 PVG", maxlength: "3", style: { textTransform: "uppercase" } });
  const toIn = el("input", { placeholder: "到达机场，如 HND", maxlength: "3", style: { textTransform: "uppercase" } });
  wrap.append(tripList, el("div", { class: "grid-2" },
    el("div", { class: "field" }, el("label", { text: "出发" }), fromIn),
    el("div", { class: "field" }, el("label", { text: "到达" }), toIn),
  ), el("div", { class: "btn-row" }, el("button", { class: "btn", onClick: () => {
    const a = String(fromIn.value || "").trim().toUpperCase();
    const b = String(toIn.value || "").trim().toUpperCase();
    if (!airportByCode(a) || !airportByCode(b)) {
      toast("请输入内置机场代码，例如 PVG、HND、CDG、NRT、KIX、LHR");
      return;
    }
    const A = airportByCode(a), B = airportByCode(b);
    store.update((s) => ({
      ...s,
      trips: [...s.trips, { id: a.toLowerCase() + "-" + b.toLowerCase() + "-" + Date.now(), from: a, to: b, label: A.city + " → " + B.city, note: "大圆航线，实际飞行会稍长。", featured: false }],
    }));
    redrawTrips();
    toast("航线已加上。在家长页可以看到，不会出现在小朋友的选飞行画面里。");
  } }, "加上这趟旅行")));
  const codes = Object.keys(AIRPORTS).join("、");
  wrap.append(el("p", { class: "note" }, "内置机场（离线）：" + codes));

  // Hikes / GPX
  wrap.append(el("h2", { text: "我爬过的山（导入 GPX）" }));
  wrap.append(el("p", { class: "note" }, "现在的三座山都是示例剖面，不是 Chance 的足迹。把手表或手机导出的 GPX 拖进来，会在本地解析。"));
  const hikeList = el("div", {});
  function redrawHikes() {
    hikeList.replaceChildren();
    for (const h of store.get().hikes) {
      hikeList.append(el("div", { class: "mini", style: { marginBottom: "8px" } },
        el("div", { class: "k" }, h.sample ? "示例" : "导入"),
        el("div", { class: "v" }, h.name + " · 最高 " + Math.round(h.peakM) + " 米"),
      ));
    }
  }
  redrawHikes();
  const file = el("input", { type: "file", accept: ".gpx,application/gpx+xml,text/xml" });
  file.addEventListener("change", async () => {
    const f = file.files?.[0];
    if (!f) return;
    try {
      const hike = parseGpx(await f.text(), f.name);
      store.update((s) => ({ ...s, hikes: [...s.hikes, hike] }));
      redrawHikes();
      toast("已经加上：" + hike.name + "。在家长页可以看到，不会出现在小朋友的选山画面里。");
    } catch (err) {
      toast("这个 GPX 读不出来：" + (err.message || err));
    }
  });
  wrap.append(hikeList, file);

  // Metrics
  wrap.append(el("h2", { text: "他最近玩得怎样" }));
  wrap.append(metricsBox(st));
  wrap.append(el("h2", { text: "本周录音「我发现……」" }));
  const recs = st.recordings.slice(-8).reverse();
  if (!recs.length) wrap.append(el("p", { class: "note" }, "还没有录音。"));
  for (const r of recs) {
    const a = el("audio", { controls: true, src: r.dataUrl, style: { width: "100%" } });
    wrap.append(el("div", { class: "mini", style: { marginBottom: "8px" } },
      el("div", { class: "k" }, new Date(r.at).toLocaleString("zh-CN", { timeZone: "Asia/Shanghai" }) + " " + (r.note || "")),
      a,
    ));
  }

  wrap.append(el("h2", { text: "爸爸回一句（今晚）" }));
  const reply = el("textarea", { rows: "3", placeholder: "写一句今晚要跟他说的话，会在他收尾时出现。" });
  wrap.append(reply, el("div", { class: "btn-row" }, el("button", { class: "btn", onClick: () => {
    const text = reply.value.trim();
    if (!text) return;
    store.addParentReply({ id: "p-" + Date.now(), at: Date.now(), forDate: store.todayKey(), text });
    toast("已留下，今晚收尾时他会看到");
    reply.value = "";
  } }, "留下这句")));

  wrap.append(el("h2", { text: "爸爸任务（可替换成你的录音）" }));
  wrap.append(el("p", { class: "note" }, "设计里希望录 60 条。现在先用旁白读这些句子。你选一条，按住录音，就会用你的声音替换。"));
  const taskSel = el("select", {});
  for (const t of TASK_BANK) taskSel.append(el("option", { value: t.id }, t.mode + " L" + t.level + " · " + t.zh));
  wrap.append(taskSel);
  const recBtn = el("button", { class: "btn ghost" }, "按住为这条录音");
  wrap.append(el("div", { class: "btn-row" }, recBtn));
  wireRecord(recBtn, async (dataUrl) => {
    store.update((s) => ({ ...s, parentTasks: [...s.parentTasks.filter((x) => x.taskId !== taskSel.value), { id: "pt-" + Date.now(), taskId: taskSel.value, dataUrl }] }));
    toast("这条任务已经换成你的声音");
  });

  // Backup
  wrap.append(el("h2", { text: "备份和隐私" }));
  wrap.append(el("p", { class: "note" }, "Safari 有时会清掉不常用网站的本地数据。请把这个页面加到主屏幕，并定期导出备份。"));
  const imp = el("input", { type: "file", accept: "application/json" });
  imp.addEventListener("change", async () => {
    const f = imp.files?.[0];
    if (!f) return;
    try { await store.importBackup(f); toast("备份已恢复"); renderParent(app, go); }
    catch { toast("这个备份文件读不出来"); }
  });
  wrap.append(el("div", { class: "btn-row" },
    el("button", { class: "btn", onClick: () => store.exportBackup() }, "导出备份"),
    el("label", { class: "btn ghost", style: { display: "inline-flex", alignItems: "center" } }, "导入备份", imp),
    el("button", { class: "btn warn", onClick: () => {
      if (confirm("确定清空这台设备上的全部进度？")) { store.resetAll(); renderParent(app, go); }
    } }, "清空本地数据"),
  ));

  wrap.append(el("h2", { text: "第一次给他玩之前" }));
  wrap.append(el("ul", {},
    el("li", { text: "把这个页面用 Safari 打开，点分享 → 添加到主屏幕。不要用浏览器标签长期挂着。" }),
    el("li", { text: "打开「引导式访问」（设置 → 辅助功能 → 引导式访问），把他锁在这个 App 里，并设时间上限。" }),
    el("li", { text: "第一次请你陪着玩。之后再让他自己玩。" }),
    el("li", { text: "改身高、步长，导入真实 GPX 和航线。示例山在他看来会像“不是我爬过的”。" }),
    el("li", { text: "我们没有真机 iPad 做过验收。请你用家里那台走一遍文末的真机清单。" }),
  ));

  wrap.append(el("h2", { text: "关于数字" }));
  wrap.append(el("p", { class: "note" },
    "航线距离用 WGS-84 椭球大地线（Vincenty）。上海→东京约 1,740 公里；上海→巴黎约 9,287 公里（设计稿写的 9,270 是更粗的近似，这里用更准的数字）。气温用 ICAO 标准大气：每升高 1 公里约降 6.5°C。光速、天文单位、Schwarzschild 半径都在代码注释里写了出处。速度和身高在改真实值之前都是假设。",
  ));

  s.append(wrap);
  app.replaceChildren(s);
}

function patchProfile(k, v) {
  store.update((s) => ({ ...s, profile: { ...s.profile, [k]: v } }));
}

function toggle(label, value, on) {
  const box = el("label", { class: "field", style: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" } },
    el("span", { text: label }),
  );
  const i = el("input", { type: "checkbox" });
  i.checked = !!value;
  i.addEventListener("change", () => on(i.checked));
  box.append(i);
  return box;
}

function numField(label, value, on) {
  const i = el("input", { type: "number", step: "any", value: String(value) });
  i.addEventListener("change", () => {
    const v = Number(i.value);
    if (Number.isFinite(v) && v >= 0) on(v);
  });
  return el("div", { class: "field" }, el("label", { text: label }), i);
}

function metricsBox(st) {
  const box = el("div", { class: "stat-row" });
  const nl = st.numberlineErrors.slice(-20);
  const avg = nl.length ? nl.reduce((a, r) => a + r.error, 0) / nl.length : null;
  box.append(mini("数轴平均误差", avg == null ? "还没有" : (avg * 100).toFixed(0) + "% 的轴长"));
  const pred = st.predictions.slice(-20);
  const pr = pred.length ? pred.reduce((a, r) => a + Math.abs(Math.log(r.ratio || 1)), 0) / pred.length : null;
  box.append(mini("预测偏差", pr == null ? "还没有" : "大约 " + Math.exp(pr).toFixed(2) + " 倍"));
  const cmp = st.compareThreshold.slice(-20);
  const lastOk = [...cmp].reverse().find((c) => c.correct);
  box.append(mini("比较门槛", lastOk ? ("最近答对的差约 " + lastOk.ratio.toFixed(2) + " 倍") : "还没有"));
  for (const m of MODE_META) {
    box.append(mini(m.name, "第 " + (st.levels[m.id] || 1) + " 级"));
  }
  box.append(mini("今天时长", (st.todayMinutes || 0).toFixed(1) + " 分钟"));
  return box;
}

function mini(k, v) {
  return el("div", { class: "mini" }, el("div", { class: "k" }, k), el("div", { class: "v" }, v));
}

function weeklyReport(st) {
  const days = st.sessions || [];
  const fastest = Object.entries(st.levels).sort((a, b) => b[1] - a[1]).slice(0, 2);
  const stuck = Object.entries(st.levels).sort((a, b) => a[1] - b[1])[0];
  const names = Object.fromEntries(MODE_META.map((m) => [m.id, m.name]));
  return el("div", { class: "mini weekly-report" },
    el("p", {}, "进步最快：" + (fastest.map(([k, v]) => (names[k] || k) + " 第" + v + "级").join("、") || "还早")),
    el("p", {}, "可能卡住的：" + ((names[stuck?.[0]] || stuck?.[0]) + " 还在第" + stuck?.[1] + "级")),
    el("p", {}, "建议下周陪他玩：" + (names[stuck?.[0]] || "飞行地图") + "。第一次请你在家陪着。"),
    el("p", { class: "note" }, "这是根据本机记录自动写的，不是评测报告。会话条数：" + days.length),
  );
}

export function parseGpx(xml, filename) {
  const doc = new DOMParser().parseFromString(xml, "text/xml");
  if (doc.querySelector("parsererror")) throw new Error("不是合法的 XML");
  const trkpts = [...doc.querySelectorAll("trkpt")];
  if (trkpts.length < 3) throw new Error("轨迹点太少");
  const raw = trkpts.map((p) => ({
    lat: Number(p.getAttribute("lat")),
    lon: Number(p.getAttribute("lon")),
    elevM: Number((p.querySelector("ele") || {}).textContent || 0),
  })).filter((p) => Number.isFinite(p.lat) && Number.isFinite(p.lon));
  const points = [];
  let dist = 0;
  for (let i = 0; i < raw.length; i++) {
    if (i) dist += haversineKm(raw[i - 1].lat, raw[i - 1].lon, raw[i].lat, raw[i].lon);
    points.push({ distKm: dist, elevM: raw[i].elevM });
  }
  const peakM = Math.max(...points.map((p) => p.elevM));
  const nameNode = doc.querySelector("trk > name, name");
  const name = (nameNode && nameNode.textContent.trim()) || filename.replace(/\.gpx$/i, "") || "导入的山";
  return { id: "gpx-" + Date.now(), name, sample: false, peakM, color: "#9ad4ff", points };
}

function wireRecord(btn, onBlob) {
  let media, recorder, chunks = [];
  btn.addEventListener("pointerdown", async (e) => {
    e.preventDefault();
    unlockAudio();
    btn.textContent = "正在录…";
    try {
      media = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mime = MediaRecorder.isTypeSupported("audio/mp4") ? "audio/mp4" : "audio/webm";
      recorder = new MediaRecorder(media, { mimeType: mime });
      chunks = [];
      recorder.ondataavailable = (ev) => { if (ev.data.size) chunks.push(ev.data); };
      recorder.onstop = async () => {
        media.getTracks().forEach((t) => t.stop());
        const blob = new Blob(chunks, { type: recorder.mimeType });
        const dataUrl = await new Promise((res) => { const r = new FileReader(); r.onload = () => res(r.result); r.readAsDataURL(blob); });
        onBlob(dataUrl);
        btn.textContent = "按住为这条录音";
      };
      recorder.start();
    } catch {
      btn.textContent = "没有麦克风权限";
    }
  });
  const stop = () => { if (recorder && recorder.state === "recording") recorder.stop(); };
  btn.addEventListener("pointerup", stop);
  btn.addEventListener("pointercancel", stop);
}

export function parentSectionOrder() {
  return [
    "周日周报",
    "声音和语言",
    "我的身体（请改成真实数字）",
    "单车和滑雪的速度（公里/小时，假设值可改）",
    "我们的旅行",
    "我爬过的山（导入 GPX）",
    "他最近玩得怎样",
    "本周录音「我发现……」",
    "爸爸回一句（今晚）",
    "爸爸任务（可替换成你的录音）",
    "备份和隐私",
    "第一次给他玩之前",
    "关于数字",
  ];
}
