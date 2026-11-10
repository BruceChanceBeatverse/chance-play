/**
 * All content packs, default measurements, and copy.
 * Real-world numbers are sourced in comments. Anything Bruce has not measured
 * is marked ASSUMPTION and is editable in the parent view.
 */
import {
  distanceKm, EARTH_EQUATOR_KM, EARTH_MOON_KM, AU_KM, PROXIMA_LY, PROXIMA_KM,
  SUN_SCHWARZSCHILD_KM, SGR_A_SOLAR_MASSES, SGR_A_SCHWARZSCHILD_KM,
  LIGHT_MOON_S, LIGHT_SUN_S, LIGHT_YEAR_KM, ISA_LAPSE_C_PER_KM,
} from "./geo.js";

/**
 * Airport coordinates, decimal degrees, WGS-84.
 * Primary source: OurAirports (ourairports.com, public domain / open data)
 * cross-checked against commonly published AIP / Wikipedia values.
 * Only a compact offline table — no network lookup.
 */
export const AIRPORTS = {
  PVG: { icao: "ZSPD", name: "上海浦东", nameEn: "Shanghai Pudong", city: "上海", lat: 31.143378, lon: 121.805214 },
  SHA: { icao: "ZSSS", name: "上海虹桥", nameEn: "Shanghai Hongqiao", city: "上海", lat: 31.197875, lon: 121.33631 },
  PEK: { icao: "ZBAA", name: "北京首都", nameEn: "Beijing Capital", city: "北京", lat: 40.080101, lon: 116.584999 },
  PKX: { icao: "ZBAD", name: "北京大兴", nameEn: "Beijing Daxing", city: "北京", lat: 39.509945, lon: 116.41092 },
  CAN: { icao: "ZGGG", name: "广州白云", nameEn: "Guangzhou Baiyun", city: "广州", lat: 23.392401, lon: 113.298798 },
  SZX: { icao: "ZGSZ", name: "深圳宝安", nameEn: "Shenzhen Bao'an", city: "深圳", lat: 22.639299, lon: 113.810997 },
  HGH: { icao: "ZSHC", name: "杭州萧山", nameEn: "Hangzhou Xiaoshan", city: "杭州", lat: 30.236099, lon: 120.433998 },
  NKG: { icao: "ZSNJ", name: "南京禄口", nameEn: "Nanjing Lukou", city: "南京", lat: 31.742001, lon: 118.861999 },
  CTU: { icao: "ZUUU", name: "成都双流", nameEn: "Chengdu Shuangliu", city: "成都", lat: 30.578501, lon: 103.946999 },
  TFU: { icao: "ZUTF", name: "成都天府", nameEn: "Chengdu Tianfu", city: "成都", lat: 30.31252, lon: 104.44129 },
  XIY: { icao: "ZLXY", name: "西安咸阳", nameEn: "Xi'an Xianyang", city: "西安", lat: 34.447102, lon: 108.751999 },
  HND: { icao: "RJTT", name: "东京羽田", nameEn: "Tokyo Haneda", city: "东京", lat: 35.552258, lon: 139.779694 },
  NRT: { icao: "RJAA", name: "东京成田", nameEn: "Tokyo Narita", city: "东京", lat: 35.764702, lon: 140.386002 },
  KIX: { icao: "RJBB", name: "大阪关西", nameEn: "Osaka Kansai", city: "大阪", lat: 34.427299, lon: 135.244003 },
  ITM: { icao: "RJOO", name: "大阪伊丹", nameEn: "Osaka Itami", city: "大阪", lat: 34.7855, lon: 135.438004 },
  CTS: { icao: "RJCC", name: "札幌新千岁", nameEn: "Sapporo New Chitose", city: "札幌", lat: 42.7752, lon: 141.692001 },
  FUK: { icao: "RJFF", name: "福冈", nameEn: "Fukuoka", city: "福冈", lat: 33.585899, lon: 130.451004 },
  OKA: { icao: "ROAH", name: "那霸", nameEn: "Naha", city: "冲绳", lat: 26.195801, lon: 127.646004 },
  NGO: { icao: "RJGG", name: "名古屋中部", nameEn: "Nagoya Chubu", city: "名古屋", lat: 34.858398, lon: 136.804993 },
  ICN: { icao: "RKSI", name: "首尔仁川", nameEn: "Seoul Incheon", city: "首尔", lat: 37.469101, lon: 126.450996 },
  GMP: { icao: "RKSS", name: "首尔金浦", nameEn: "Seoul Gimpo", city: "首尔", lat: 37.5583, lon: 126.790001 },
  TPE: { icao: "RCTP", name: "台北桃园", nameEn: "Taipei Taoyuan", city: "台北", lat: 25.0777, lon: 121.232002 },
  TSA: { icao: "RCSS", name: "台北松山", nameEn: "Taipei Songshan", city: "台北", lat: 25.069401, lon: 121.552002 },
  HKG: { icao: "VHHH", name: "香港国际", nameEn: "Hong Kong", city: "香港", lat: 22.308901, lon: 113.915001 },
  MFM: { icao: "VMMC", name: "澳门", nameEn: "Macau", city: "澳门", lat: 22.149599, lon: 113.592003 },
  SIN: { icao: "WSSS", name: "新加坡樟宜", nameEn: "Singapore Changi", city: "新加坡", lat: 1.35019, lon: 103.994003 },
  BKK: { icao: "VTBS", name: "曼谷素万那普", nameEn: "Bangkok Suvarnabhumi", city: "曼谷", lat: 13.6811, lon: 100.747002 },
  SGN: { icao: "VVTS", name: "胡志明市", nameEn: "Ho Chi Minh", city: "胡志明市", lat: 10.8188, lon: 106.652 },
  HAN: { icao: "VVNB", name: "河内内排", nameEn: "Hanoi Noi Bai", city: "河内", lat: 21.221201, lon: 105.806999 },
  KUL: { icao: "WMKK", name: "吉隆坡", nameEn: "Kuala Lumpur", city: "吉隆坡", lat: 2.7456, lon: 101.709999 },
  CGK: { icao: "WIII", name: "雅加达", nameEn: "Jakarta Soekarno-Hatta", city: "雅加达", lat: -6.12557, lon: 106.655998 },
  MNL: { icao: "RPLL", name: "马尼拉", nameEn: "Manila", city: "马尼拉", lat: 14.5086, lon: 121.019997 },
  CDG: { icao: "LFPG", name: "巴黎戴高乐", nameEn: "Paris Charles de Gaulle", city: "巴黎", lat: 49.009724, lon: 2.547778 },
  ORY: { icao: "LFPO", name: "巴黎奥利", nameEn: "Paris Orly", city: "巴黎", lat: 48.723333, lon: 2.379444 },
  LHR: { icao: "EGLL", name: "伦敦希思罗", nameEn: "London Heathrow", city: "伦敦", lat: 51.4706, lon: -0.461941 },
  LGW: { icao: "EGKK", name: "伦敦盖特威克", nameEn: "London Gatwick", city: "伦敦", lat: 51.148102, lon: -0.190278 },
  AMS: { icao: "EHAM", name: "阿姆斯特丹", nameEn: "Amsterdam Schiphol", city: "阿姆斯特丹", lat: 52.308601, lon: 4.76389 },
  FRA: { icao: "EDDF", name: "法兰克福", nameEn: "Frankfurt", city: "法兰克福", lat: 50.033333, lon: 8.570556 },
  MUC: { icao: "EDDM", name: "慕尼黑", nameEn: "Munich", city: "慕尼黑", lat: 48.353802, lon: 11.7861 },
  ZRH: { icao: "LSZH", name: "苏黎世", nameEn: "Zurich", city: "苏黎世", lat: 47.464699, lon: 8.54917 },
  GVA: { icao: "LSGG", name: "日内瓦", nameEn: "Geneva", city: "日内瓦", lat: 46.238098, lon: 6.10895 },
  FCO: { icao: "LIRF", name: "罗马菲乌米奇诺", nameEn: "Rome Fiumicino", city: "罗马", lat: 41.800277, lon: 12.238889 },
  MXP: { icao: "LIMC", name: "米兰马尔彭萨", nameEn: "Milan Malpensa", city: "米兰", lat: 45.6306, lon: 8.72811 },
  BCN: { icao: "LEBL", name: "巴塞罗那", nameEn: "Barcelona", city: "巴塞罗那", lat: 41.2971, lon: 2.07846 },
  MAD: { icao: "LEMD", name: "马德里", nameEn: "Madrid Barajas", city: "马德里", lat: 40.471926, lon: -3.56264 },
  VIE: { icao: "LOWW", name: "维也纳", nameEn: "Vienna", city: "维也纳", lat: 48.110298, lon: 16.5697 },
  CPH: { icao: "EKCH", name: "哥本哈根", nameEn: "Copenhagen", city: "哥本哈根", lat: 55.6179, lon: 12.656 },
  ARN: { icao: "ESSA", name: "斯德哥尔摩", nameEn: "Stockholm Arlanda", city: "斯德哥尔摩", lat: 59.651901, lon: 17.9186 },
  HEL: { icao: "EFHK", name: "赫尔辛基", nameEn: "Helsinki", city: "赫尔辛基", lat: 60.3172, lon: 24.963301 },
  IST: { icao: "LTFM", name: "伊斯坦布尔", nameEn: "Istanbul", city: "伊斯坦布尔", lat: 41.275278, lon: 28.751944 },
  DXB: { icao: "OMDB", name: "迪拜", nameEn: "Dubai", city: "迪拜", lat: 25.2528, lon: 55.3644 },
  DOH: { icao: "OTHH", name: "多哈", nameEn: "Doha Hamad", city: "多哈", lat: 25.273056, lon: 51.608056 },
  SYD: { icao: "YSSY", name: "悉尼", nameEn: "Sydney", city: "悉尼", lat: -33.946098, lon: 151.177002 },
  MEL: { icao: "YMML", name: "墨尔本", nameEn: "Melbourne", city: "墨尔本", lat: -37.673302, lon: 144.843002 },
  AKL: { icao: "NZAA", name: "奥克兰", nameEn: "Auckland", city: "奥克兰", lat: -37.008099, lon: 174.792007 },
  LAX: { icao: "KLAX", name: "洛杉矶", nameEn: "Los Angeles", city: "洛杉矶", lat: 33.942501, lon: -118.407997 },
  SFO: { icao: "KSFO", name: "旧金山", nameEn: "San Francisco", city: "旧金山", lat: 37.618999, lon: -122.375 },
  JFK: { icao: "KJFK", name: "纽约肯尼迪", nameEn: "New York JFK", city: "纽约", lat: 40.639801, lon: -73.7789 },
  EWR: { icao: "KEWR", name: "纽约纽瓦克", nameEn: "Newark", city: "纽约", lat: 40.692501, lon: -74.168701 },
  ORD: { icao: "KORD", name: "芝加哥奥黑尔", nameEn: "Chicago O'Hare", city: "芝加哥", lat: 41.9786, lon: -87.9048 },
  SEA: { icao: "KSEA", name: "西雅图", nameEn: "Seattle Tacoma", city: "西雅图", lat: 47.449001, lon: -122.308998 },
  YVR: { icao: "CYVR", name: "温哥华", nameEn: "Vancouver", city: "温哥华", lat: 49.193901, lon: -123.183998 },
  YYZ: { icao: "CYYZ", name: "多伦多", nameEn: "Toronto Pearson", city: "多伦多", lat: 43.6772, lon: -79.6306 },
};

export function airportByCode(code) {
  if (!code) return null;
  return AIRPORTS[String(code).trim().toUpperCase()] || null;
}

export function routeDistanceKm(from, to) {
  const a = airportByCode(from), b = airportByCode(to);
  if (!a || !b) return null;
  return distanceKm(a.lat, a.lon, b.lat, b.lon);
}

export const DEFAULT_TRIPS = [
  {
    id: "pvg-hnd",
    from: "PVG",
    to: "HND",
    label: "上海浦东 → 东京羽田",
    // WGS-84 geodesic ≈ 1,740.3 km (Air Miles Calculator / Vincenty).
    // Design page: 约 1,740 公里. We compute live from coordinates and
    // display the rounded kilometre (1,740).
    note: "大圆航线，实际飞行会稍长。",
    featured: true,
  },
  {
    id: "pvg-cdg",
    from: "PVG",
    to: "CDG",
    label: "上海浦东 → 巴黎戴高乐",
    // WGS-84 geodesic ≈ 9,287.1 km. Design page said 约 9,270 公里
    // (a coarser rounding). We use the geodesic and show 9,287 公里.
    note: "大圆航线，实际飞行会稍长。比去东京远大约 5.3 倍。",
    featured: true,
  },
];

/**
 * Speeds in km/h. These are labelled ASSUMPTIONS on screen and are editable.
 * - 自行车 15: typical leisure pace for a child on the flat (not a race).
 * - 滑雪 30: recreational downhill average, not a race time.
 * - 汽车 120: common passenger-car limit on many Chinese expressways.
 * - 高铁 350: CR400 Fuxing design/operating speed on some high-speed lines.
 * - 飞机 850: typical jet cruise true airspeed (Mach ~0.78–0.85 is ~800–900).
 * Race times assume a constant speed on the great-circle distance, with no
 * stops, no roads, no wind. That impossibility is a feature: it invites
 * "为什么骑车去不了东京？".
 */
export const DEFAULT_RACERS = [
  { id: "bike", name: "自行车", nameEn: "Bicycle", kmh: 15, color: "#7dffb3", emoji: "🚲" },
  { id: "ski", name: "滑雪", nameEn: "Ski", kmh: 30, color: "#9ad4ff", emoji: "🎿" },
  { id: "car", name: "汽车", nameEn: "Car", kmh: 120, color: "#ffd56a", emoji: "🚗" },
  { id: "hsr", name: "高铁", nameEn: "High-speed rail", kmh: 350, color: "#ff7a59", emoji: "🚄" },
  { id: "plane", name: "飞机", nameEn: "Aeroplane", kmh: 850, color: "#5ce1e6", emoji: "✈️" },
];

/**
 * Body defaults. BOTH are ASSUMPTIONS until Bruce types the real values.
 * Height 1.20 m: mid-range for a 6-year-old (WHO / typical growth charts
 * vary; this is only a placeholder).
 * Stride 0.50 m: a rough walking step length ≈ 0.4 × height. Must be measured
 * once on the stairs / hallway ("我走 100 步").
 */
export const DEFAULT_PROFILE = {
  name: "Chance",
  heightM: 1.20,
  strideM: 0.50,
  // ASSUMPTION: "家到学校" used as the shortest race track. Editable.
  schoolKm: 2,
  // 人民广场 (31.2337, 121.4753) to PVG, WGS-84 geodesic ≈ 33 km.
  // Road distance is longer (commonly cited ~40–50 km). We use 40 km as a
  // labelled "开车去机场大约" city-scale anchor, editable.
  cityAirportKm: 40,
};

/**
 * 15-layer world axis, from the child outward and inward.
 * Lengths in metres so the zoom scale can be a single log10 axis.
 */
export const WORLD_LAYERS = [
  { id: "atom", dir: "in", n: 4, name: "原子", metres: 1e-10, how: "十倍电梯一直往下",
    // Typical atomic diameter order of magnitude (~0.1 nm = 1 Å).
    // A hydrogen atom Bohr radius is 5.29×10⁻¹¹ m; "an atom is about 0.1 nm"
    // is the usual order-of-magnitude figure (OpenStax / many textbooks).
    blurb: "大约 0.1 纳米。一百万分之一毫米。", power: -10 },
  { id: "cell", dir: "in", n: 3, name: "细胞", metres: 8e-6, how: "显微镜画面",
    // Human red blood cell diameter ≈ 7.5–8.7 μm, commonly ~8 μm.
    // (Turgeon, Clinical Hematology; standard histology texts.)
    blurb: "红细胞大约 8 微米宽。", power: -5 },
  { id: "sand", dir: "in", n: 2, name: "一粒沙", metres: 5e-4, how: "放大镜",
    // Wentworth scale: medium sand 0.25–0.5 mm; coarse up to 2 mm.
    // We take 0.5 mm as a typical "grain of sand" you can see.
    blurb: "大约半毫米。细的只有零点几毫米，粗的可以到 2 毫米。", power: -3 },
  { id: "ant", dir: "in", n: 1, name: "蚂蚁", metres: 4e-3, how: "放大镜",
    // Common small ants are a few millimetres long; 4 mm is a mid typical worker.
    blurb: "一只小蚂蚁大约几毫米长。", power: -2 },
  { id: "me", dir: "out", n: 1, name: "我的身高", metres: 1.20, how: "站着比一比",
    blurb: "这是现在的身高。", power: 0, fromProfile: "heightM" },
  { id: "steps", dir: "out", n: 2, name: "我走 100 步", metres: 50, how: "下楼真的走一次",
    blurb: "用你的步长走 100 步。", power: 1, fromProfile: "strideM", times: 100 },
  { id: "mountain", dir: "out", n: 3, name: "我爬过的山", metres: 100, how: "高度剖面",
    blurb: "用一座真实的山来量。示例里先放了上海佘山，大约 100 米高。", power: 2, fromHike: true },
  { id: "city", dir: "out", n: 4, name: "上海城市", metres: 40000, how: "坐车去机场",
    blurb: "从市区开车去浦东机场，大约 40 公里（假设，路上会更绕）。", power: 4, fromProfile: "cityAirportKm", km: true },
  { id: "tokyo", dir: "out", n: 5, name: "上海 → 东京", metres: 1_740_300, how: "我的飞行地图",
    blurb: "大圆航线大约 1,740 公里。这是 Chance 坐过的那一趟。", power: 6 },
  { id: "paris", dir: "out", n: 6, name: "上海 → 巴黎", metres: 9_287_100, how: "比东京远 5 倍多",
    blurb: "大圆航线大约 9,287 公里。比去东京远大约 5.3 倍。", power: 7 },
  { id: "earth", dir: "out", n: 7, name: "地球一圈", metres: EARTH_EQUATOR_KM * 1000, how: "绕地球飞一圈",
    blurb: "沿着赤道走一圈大约 40,075 公里。", power: 7 },
  { id: "moon", dir: "out", n: 8, name: "地球 → 月亮", metres: EARTH_MOON_KM * 1000, how: "光速快递",
    blurb: "平均大约 38.4 万公里。光要走 1.28 秒（常说约 1.3 秒）。", power: 8 },
  { id: "sun", dir: "out", n: 9, name: "地球 → 太阳", metres: AU_KM * 1000, how: "光速快递",
    blurb: "1 个天文单位，大约 1.496 亿公里。光要走 8 分 19 秒（常说约 8 分 20 秒）。", power: 11 },
  { id: "proxima", dir: "out", n: 10, name: "最近的恒星", metres: PROXIMA_KM * 1000, how: "光年 = 光一年跑的路",
    blurb: "比邻星大约 4.25 光年。光要走四年多才能到。", power: 16 },
  { id: "blackhole", dir: "out", n: 11, name: "黑洞（进阶）", metres: SGR_A_SCHWARZSCHILD_KM * 1000, how: "黑洞调节器",
    blurb: "太阳质量黑洞的半径大约 3 公里。银河系中心的人马座 A* 大约是 430 万个太阳质量，半径大约 1,270 万公里。", power: 10, advanced: true },
];

export const LAYER_BY_ID = Object.fromEntries(WORLD_LAYERS.map((l) => [l.id, l]));

/**
 * Sample hike profiles. These are SCHEMATIC, not Chance's GPS.
 * Elevation figures for the peaks are real; the path is a made-up but
 * physically plausible walk so the mode is playable before a GPX is imported.
 *
 * 佘山西峰：约 99 m（上海佘山国家森林公园西佘山，常用海拔约 98.8–99 m）。
 * 黄山莲花峰：1,864 m（黄山最高峰，官方/常见标注 1864 m 或 1864.8 m）。
 * 富士山：3,776 m（日本最高峰；国土地理院 3776.12 m，通常写作 3776 m）。
 */
export const SAMPLE_HIKES = [
  {
    id: "sheshan",
    name: "上海佘山（示例）",
    sample: true,
    peakM: 99,
    color: "#7dffb3",
    // Schematic out-and-back, ~3.6 km, start near sea-level park.
    points: makeHillProfile({ lengthKm: 3.6, peakM: 99, peakAt: 0.55, startM: 8, bumps: [[0.25, 40, 0.08]] }),
  },
  {
    id: "huangshan",
    name: "黄山莲花峰（示例）",
    sample: true,
    peakM: 1864,
    color: "#ffd56a",
    points: makeHillProfile({ lengthKm: 14, peakM: 1864, peakAt: 0.72, startM: 600, bumps: [[0.35, 1400, 0.1], [0.5, 1600, 0.08]] }),
  },
  {
    id: "fuji",
    name: "富士山（示例）",
    sample: true,
    peakM: 3776,
    color: "#ff7a59",
    // Yoshida trail is roughly 6–8 km with ~1,400 m gain from the 5th station
    // (~2,300 m). Schematic only.
    points: makeHillProfile({ lengthKm: 7.5, peakM: 3776, peakAt: 0.92, startM: 2300, bumps: [[0.4, 2800, 0.1]] }),
  },
];

function makeHillProfile({ lengthKm, peakM, peakAt, startM, bumps = [] }) {
  const n = 80;
  const pts = [];
  for (let i = 0; i <= n; i++) {
    const t = i / n;
    const dist = t * lengthKm;
    // Smooth rise to the peak then a gentler descent (or continue to peak if near end).
    let elev;
    if (t <= peakAt) {
      const u = t / peakAt;
      elev = startM + (peakM - startM) * (u * u * (3 - 2 * u));
    } else {
      const u = (t - peakAt) / (1 - peakAt);
      const end = Math.max(startM, peakM * 0.55);
      elev = peakM + (end - peakM) * (u * u * (3 - 2 * u));
    }
    for (const [c, h, w] of bumps) {
      const g = Math.exp(-((t - c) * (t - c)) / (2 * w * w));
      elev = Math.max(elev, startM + (h - startM) * g);
    }
    // A little path roughness, deterministic.
    elev += Math.sin(t * 37.7) * Math.min(8, peakM * 0.004);
    pts.push({ distKm: dist, elevM: Math.max(0, elev) });
  }
  return pts;
}

export const MODE_META = [
  { id: "flight", name: "我的飞行地图", nameEn: "My flight map", icon: "plane", featured: true, weekday: 1 },
  { id: "race", name: "速度大比拼", nameEn: "Speed race", icon: "race", featured: true, weekday: 2 },
  { id: "hike", name: "爬山剖面", nameEn: "Mountain profile", icon: "mountain", weekday: 3 },
  { id: "zoom", name: "从我出发", nameEn: "Scale from me", icon: "zoom", weekday: 4 },
  { id: "numberline", name: "数轴航线", nameEn: "Number-line route", icon: "axis", weekday: 5 },
  { id: "compare", name: "谁更大谁更快", nameEn: "Which is bigger", icon: "compare", weekday: 5 },
  { id: "elevator", name: "十倍电梯", nameEn: "Times-ten lift", icon: "lift", weekday: 4 },
  { id: "cosmos", name: "宇宙延伸", nameEn: "Cosmos", icon: "cosmos", weekday: 6, unlockAfter: ["flight", "race"] },
];

export const WEEKDAY_THEME = {
  1: { modes: ["flight"], title: "今天飞一趟" },
  2: { modes: ["race"], title: "今天比速度" },
  3: { modes: ["hike"], title: "今天去爬山" },
  4: { modes: ["zoom", "elevator"], title: "今天看大小" },
  5: { modes: ["numberline", "compare"], title: "今天排一排" },
  6: { modes: ["explore"], title: "今天自由探索" },
  0: { modes: ["teach"], title: "今天你来当老师" },
};

/**
 * A built-in bank of dad-style tasks. These are TEXT for on-device speech.
 * Bruce can replace any of them with his own recording in the parent view.
 * 60 items, covering each playable mode and ladder step, half also have English.
 */
export const TASK_BANK = [
  { id: "t01", mode: "flight", level: 1, zh: "Chance，还记得我们飞去东京吗？今天用手指把飞机拖到东京。", en: "Chance, remember our flight to Tokyo? Drag the plane there with your finger." },
  { id: "t02", mode: "flight", level: 1, zh: "飞的时候看看四个数字：已经飞了多远、还要多久、有多高、外面多冷。", en: "Watch the four numbers as you fly: how far, how long left, how high, how cold outside." },
  { id: "t03", mode: "flight", level: 2, zh: "飞到一半的时候停一下。你猜，还要飞多久？", en: "Stop halfway. How much longer do you think we still have to fly?" },
  { id: "t04", mode: "flight", level: 2, zh: "飞得更高，外面会更冷还是更暖？先猜，再看。", en: "If we fly higher, will it be colder or warmer outside? Guess, then look." },
  { id: "t05", mode: "flight", level: 3, zh: "飞到四分之一和四分之三，两个地方的剩余时间是多少？", en: "What's the time left at one quarter, and at three quarters?" },
  { id: "t06", mode: "flight", level: 3, zh: "把去东京和去巴黎两条航线放在一起看，哪一条更长？", en: "Look at the Tokyo and Paris routes together. Which one is longer?" },
  { id: "t07", mode: "flight", level: 4, zh: "去巴黎比去东京远几倍？先猜一个大概的数。", en: "About how many times farther is Paris than Tokyo? Make a rough guess." },
  { id: "t08", mode: "flight", level: 4, zh: "如果飞机一直是现在这个速度，飞完地球一圈要多久？", en: "At this cruising speed, how long would a loop around the Earth take?" },
  { id: "t09", mode: "flight", level: 5, zh: "比较两条航线：高度和温度的变化规律是一样的吗？", en: "Compare the two routes: does height and temperature follow the same rule?" },
  { id: "t10", mode: "flight", level: 5, zh: "你能用自己的话说说：飞得越高，外面的气温怎样变？", en: "In your own words: as we fly higher, what happens to the outside temperature?" },
  { id: "t11", mode: "race", level: 3, zh: "今天看看滑雪去东京要几天？先猜，再看比赛。", en: "How many days would it take to ski to Tokyo? Guess, then watch the race." },
  { id: "t12", mode: "race", level: 1, zh: "自行车和汽车，谁先从家到学校？先选一个。", en: "Bike or car: who gets from home to school first? Pick one." },
  { id: "t13", mode: "race", level: 2, zh: "汽车和高铁去机场，谁更快？快多少？", en: "Car or high-speed train to the airport: who is faster, and by how much?" },
  { id: "t14", mode: "race", level: 2, zh: "飞机比自行车快多少倍？先想一个整数。", en: "How many times faster is the plane than the bike? Think of a whole number." },
  { id: "t15", mode: "race", level: 3, zh: "骑自行车去东京，要几个小时？先猜，再揭晓。", en: "How many hours to cycle to Tokyo? Guess, then reveal." },
  { id: "t16", mode: "race", level: 3, zh: "滑雪去巴黎，大概要几天？", en: "Roughly how many days to ski to Paris?" },
  { id: "t17", mode: "race", level: 4, zh: "如果只有 2 小时，汽车能走多远？和去学校比一比。", en: "In just 2 hours, how far can a car go? Compare that with the trip to school." },
  { id: "t18", mode: "race", level: 4, zh: "高铁 1 小时，飞机 1 小时，哪个走得更远？远多少？", en: "One hour on the high-speed train, one hour on the plane: who goes farther, and by how much?" },
  { id: "t19", mode: "race", level: 5, zh: "去东京要正好 5 小时，速度得是多少？", en: "To reach Tokyo in exactly 5 hours, how fast would you have to go?" },
  { id: "t20", mode: "race", level: 5, zh: "为什么骑自行车其实去不了东京？路上会遇到什么？", en: "Why can't you really cycle to Tokyo? What would you meet on the way?" },
  { id: "t21", mode: "hike", level: 1, zh: "在山上找出最高的地方，把小人拖到那儿。", en: "Find the highest point on the mountain and drag the little hiker there." },
  { id: "t22", mode: "hike", level: 1, zh: "从山脚走到山顶，走了多远？爬了多高？", en: "From the foot to the top: how far did we walk, and how high did we climb?" },
  { id: "t23", mode: "hike", level: 2, zh: "走到一半，现在有多高？外面大概几度？", en: "Halfway along, how high are we, and roughly how warm is it?" },
  { id: "t24", mode: "hike", level: 2, zh: "爬得越高，气温是升还是降？先猜再看。", en: "As we climb, does the temperature go up or down? Guess, then look." },
  { id: "t25", mode: "hike", level: 3, zh: "看这段坡，是陡还是缓？陡的地方高度涨得快。", en: "Look at this slope: steep or gentle? On a steep bit, height jumps faster." },
  { id: "t26", mode: "hike", level: 3, zh: "每升高 100 米，大约会凉一点。凉多少？", en: "For every 100 metres higher, it gets a little cooler. By how much?" },
  { id: "t27", mode: "hike", level: 4, zh: "佘山和黄山，哪座更高？高几倍？", en: "Sheshan or Huangshan: which is higher, and by how many times?" },
  { id: "t28", mode: "hike", level: 4, zh: "把富士山和黄山的剖面放在一起，差多少？", en: "Put Fuji and Huangshan side by side. What's the difference?" },
  { id: "t29", mode: "hike", level: 5, zh: "只看剖面，不看名字：这是哪一座山？", en: "Looking only at the shape, not the name: which mountain is this?" },
  { id: "t30", mode: "hike", level: 5, zh: "你能给爸爸讲讲，坡度快是什么意思吗？", en: "Can you tell Dad what it means when the slope is steep?" },
  { id: "t31", mode: "zoom", level: 1, zh: "从你的身高开始，向外放大。你能找到去东京的那一层吗？", en: "Start from your height and pinch out. Can you find the layer that's the flight to Tokyo?" },
  { id: "t32", mode: "zoom", level: 1, zh: "把蚂蚁、你自己、佘山、去东京，按从小到大排好。", en: "Put the ant, you, Sheshan and the flight to Tokyo in order from small to big." },
  { id: "t33", mode: "zoom", level: 2, zh: "捏拢，往里看。你的手和一粒沙，差多少？", en: "Pinch in. How much smaller is a grain of sand than your hand?" },
  { id: "t34", mode: "zoom", level: 2, zh: "从你走到机场，要经过几层 10 倍？", en: "From you to the trip to the airport, how many times-ten layers is that?" },
  { id: "t35", mode: "zoom", level: 3, zh: "去东京和去巴黎，差几个 10 倍？还是不到一个？", en: "Tokyo versus Paris: how many times-ten is the gap, or is it less than one?" },
  { id: "t36", mode: "zoom", level: 3, zh: "月亮比地球一圈远多少？先用层来数。", en: "How much farther is the Moon than one trip around the Earth? Count in layers." },
  { id: "t37", mode: "zoom", level: 4, zh: "从一粒沙放大到你的身高，经过哪些层？", en: "Zooming from a grain of sand to your height, which layers do you pass?" },
  { id: "t38", mode: "zoom", level: 4, zh: "太阳比月亮远很多。你能说出大概远几倍吗？", en: "The Sun is much farther than the Moon. About how many times farther?" },
  { id: "t39", mode: "zoom", level: 5, zh: "随便停在一层，估一估到最近的恒星还要放大多少。", en: "Stop on any layer and estimate how much more you'd zoom to reach the nearest star." },
  { id: "t40", mode: "zoom", level: 5, zh: "用你自己的话说：每一层都是用上一层的东西来量的。", en: "In your own words: each layer is measured with something from the layer before." },
  { id: "t41", mode: "numberline", level: 1, zh: "在 0 到 10 的航线上，把 5 放到中间。", en: "On a 0-to-10 route, put 5 in the middle." },
  { id: "t42", mode: "numberline", level: 1, zh: "0 是上海，10 是东京。7 应该在哪儿？", en: "0 is Shanghai, 10 is Tokyo. Where should 7 sit?" },
  { id: "t43", mode: "numberline", level: 2, zh: "0 到 100，50 在正中间。先放 50，再放 80。", en: "From 0 to 100, 50 is right in the middle. Place 50, then 80." },
  { id: "t44", mode: "numberline", level: 2, zh: "把你家到学校的距离，放到去机场的这条线上。", en: "Put the distance from home to school onto the line that goes to the airport." },
  { id: "t45", mode: "numberline", level: 3, zh: "0 到 100，这次中间没有数字。你能把 25 放对吗？", en: "0 to 100, and this time the midpoint isn't labelled. Can you place 25?" },
  { id: "t46", mode: "numberline", level: 3, zh: "去东京是 1,740 公里。一半的地方，是多少公里？", en: "Tokyo is 1,740 kilometres. What's the number at the halfway point?" },
  { id: "t47", mode: "numberline", level: 4, zh: "0 到 1000，把 100、250、500 放上去。", en: "On 0 to 1,000, place 100, 250 and 500." },
  { id: "t48", mode: "numberline", level: 4, zh: "10、100、1000 在一条十的幂航线上，间隔一样吗？", en: "On a powers-of-ten route, are 10, 100 and 1,000 equally spaced?" },
  { id: "t49", mode: "numberline", level: 5, zh: "把去东京和去巴黎放到 0 到 10,000 公里的线上。", en: "Place Tokyo and Paris on a 0 to 10,000 kilometre line." },
  { id: "t50", mode: "numberline", level: 5, zh: "地球一圈大约 40,000 公里。在这条线上，巴黎在哪儿？", en: "A loop of the Earth is about 40,000 kilometres. Where does Paris sit on that line?" },
  { id: "t51", mode: "compare", level: 1, zh: "两座山一闪：哪一座更高？差大约 2 倍。", en: "Two mountains flash: which is higher? They differ by about 2 times." },
  { id: "t52", mode: "compare", level: 1, zh: "自行车和汽车，谁更快？", en: "Bike or car: who is faster?" },
  { id: "t53", mode: "compare", level: 2, zh: "去东京和去巴黎，哪条航线更长？", en: "Tokyo or Paris: which route is longer?" },
  { id: "t54", mode: "compare", level: 2, zh: "高铁和飞机，谁更快？快几倍？", en: "High-speed train or plane: who is faster, and by how many times?" },
  { id: "t55", mode: "compare", level: 3, zh: "黄山和富士山，差得没那么多了。哪座更高？", en: "Huangshan and Fuji are closer than you think. Which is higher?" },
  { id: "t56", mode: "compare", level: 3, zh: "汽车 120 和高铁 350，快多少倍？先估再看。", en: "Car at 120 versus train at 350: how many times faster? Estimate, then look." },
  { id: "t57", mode: "compare", level: 4, zh: "两个很接近的速度，选出更快的那个，再说出大约几倍。", en: "Two close speeds: pick the faster one, then say about how many times faster." },
  { id: "t58", mode: "compare", level: 5, zh: "差一点点的两个数，你还能分出来吗？说说为什么。", en: "Two numbers that are almost the same: can you still tell them apart? Say why." },
  { id: "t59", mode: "elevator", level: 1, zh: "按一次 ×10。1 颗珠子变成一串 10。再按，变成 100。", en: "Press ×10. One bead becomes a ten-bar. Press again, and it's 100." },
  { id: "t60", mode: "elevator", level: 2, zh: "从你的身高乘 10、再乘 10，到了哪一层？", en: "Take your height times ten, then times ten again. Which layer is that?" },
  { id: "t61", mode: "elevator", level: 3, zh: "除以 10，从一座山走到蚂蚁要按几次？", en: "Divide by 10. How many presses from a mountain down to an ant?" },
  { id: "t62", mode: "elevator", level: 4, zh: "1、10、100、1000，哪一个最接近去机场的距离（米）？", en: "1, 10, 100, 1,000: which is closest to the airport trip, in metres?" },
  { id: "t63", mode: "cosmos", level: 3, zh: "光从月亮跑到地球，只要一秒多。你能按下开始，看这一秒吗？", en: "Light from the Moon takes just over one second. Press start and watch that second." },
  { id: "t64", mode: "cosmos", level: 3, zh: "光从太阳过来要 8 分 19 秒。想象我们等了这么久。", en: "Light from the Sun takes 8 minutes 19 seconds. Imagine waiting that long." },
  { id: "t65", mode: "cosmos", level: 4, zh: "最近的恒星，光要走四年多。这就是 1 光年的意思——光一年跑的路。", en: "Light from the nearest star takes a little over four years. A light-year is how far light travels in one year." },
  { id: "t66", mode: "cosmos", level: 4, zh: "拖一拖黑洞的质量。质量越大，半径就越大，而且是成正比的。", en: "Drag the black-hole mass. As the mass grows, the radius grows in proportion." },
];

export const TOMORROW_QUESTIONS = [
  { id: "q1", zh: "明天看看：骑自行车去东京要几天？", mode: "race" },
  { id: "q2", zh: "明天看看：飞到一半，还要飞多久？", mode: "flight" },
  { id: "q3", zh: "明天看看：爬得越高，外面是更冷还是更暖？", mode: "hike" },
  { id: "q4", zh: "明天看看：去巴黎比去东京远几倍？", mode: "flight" },
  { id: "q5", zh: "明天看看：从你的身高放大到一座山，要经过几层？", mode: "zoom" },
  { id: "q6", zh: "明天看看：飞机比自行车快多少倍？", mode: "race" },
  { id: "q7", zh: "明天看看：光从月亮到地球，要几秒？", mode: "cosmos" },
  { id: "q8", zh: "明天看看：0 到 100 的中间，是哪个数？", mode: "numberline" },
];

export const CARD_TEMPLATES = [
  { id: "c-tokyo", title: "上海到东京", value: "1,740 公里", mode: "flight" },
  { id: "c-paris", title: "上海到巴黎", value: "9,287 公里", mode: "flight" },
  { id: "c-lapse", title: "每升高 1 公里", value: "大约凉 6.5°C", mode: "flight" },
  { id: "c-bike", title: "自行车", value: "大约 15 公里/小时（假设）", mode: "race" },
  { id: "c-plane", title: "飞机巡航", value: "大约 850 公里/小时（假设）", mode: "race" },
  { id: "c-sheshan", title: "佘山", value: "大约 99 米高", mode: "hike" },
  { id: "c-route", title: "上海到东京", value: "1,740 公里", mode: "numberline" },
  { id: "c-earth", title: "地球一圈", value: "40,075 公里", mode: "zoom" },
  { id: "c-moon", title: "光到月亮", value: "1.28 秒", mode: "cosmos" },
  { id: "c-sun", title: "光到太阳", value: "8 分 19 秒", mode: "cosmos" },
  { id: "c-ly", title: "1 光年", value: "光一年跑的路", mode: "cosmos" },
  { id: "c-times10", title: "十倍电梯", value: "每按一次 ×10", mode: "elevator" },
  { id: "c-mid", title: "数轴中点", value: "0 到 100 的中间是 50", mode: "numberline" },
];

export const CONST = {
  EARTH_EQUATOR_KM, EARTH_MOON_KM, AU_KM, PROXIMA_LY, PROXIMA_KM,
  SUN_SCHWARZSCHILD_KM, SGR_A_SOLAR_MASSES, SGR_A_SCHWARZSCHILD_KM,
  LIGHT_MOON_S, LIGHT_SUN_S, LIGHT_YEAR_KM, ISA_LAPSE_C_PER_KM,
};

export const SESSION_MINUTES = 18;
export const SESSION_WINDDOWN_MIN = 15;
