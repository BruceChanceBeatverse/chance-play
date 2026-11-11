/**
 * Continuous scale-journey inventory: Planck length → observable universe.
 * Lengths are in metres. Numbers are standard approximations, cited in comments.
 * Anything not measured for Chance is flagged `assumption: true` and must be
 * labelled 「假设」 or 「示例」 in the UI. No family address or school name.
 */
import {
  EARTH_EQUATOR_KM, EARTH_MOON_KM, AU_KM, PROXIMA_LY, PROXIMA_KM,
  LIGHT_YEAR_KM, EARTH_MEAN_DIAMETER_KM, C_KM_S, SGR_A_SCHWARZSCHILD_KM,
  SUN_SCHWARZSCHILD_KM,
} from "./geo.js";
import {
  DEFAULT_PROFILE,
  EIFFEL_HEIGHT_M, DUOMO_MADONNINA_M, ORIENTAL_PEARL_M, JIN_MAO_M,
  SWFC_HEIGHT_M, SHANGHAI_TOWER_M, SCHLERN_PEZ_M, FUJI_HEIGHT_M,
  EVEREST_HEIGHT_M, CHANCE_HIKE_KM, CHANCE_HIKE_GAIN_M, SHESHAN_HEIGHT_M,
} from "./data.js";
import { englishForStop } from "./scale-en.js";

/** CODATA / SI: Planck length ℓP = √(ħG/c³) ≈ 1.616×10⁻³⁵ m. */
export const PLANCK_LENGTH_M = 1.616e-35;

/**
 * Particle-horizon diameter of the observable universe, a common classroom figure:
 * ~93 billion light-years ≈ 8.8×10²⁶ m. Radius ~46.5 billion ly ≈ 4.4×10²⁶ m.
 * (Not a precision cosmology result; labelled as 大约.)
 */
export const OBSERVABLE_UNIVERSE_DIAMETER_M = 8.8e26;
export const OBSERVABLE_UNIVERSE_RADIUS_M = 4.4e26;

/** Sun's equatorial diameter, NASA / IAU-compatible ≈ 1.3927×10⁶ km. */
export const SUN_DIAMETER_M = 1.3927e9;

/** Mean Earth diameter in metres. */
export const EARTH_DIAMETER_M = EARTH_MEAN_DIAMETER_KM * 1000;

/**
 * Named objects along the axis. Every order of magnitude from 10⁻³⁵ to 10²⁷
 * is still shown even when this list has no named object — see `allScaleStops`.
 *
 * `correlate` is the Chance-real hook, or an honest bridge to the last thing
 * he has actually felt (a flight, a mountain, a speed, or a placeholder).
 */
export const NAMED_SCALE_STOPS = [
  // ——— inward, smaller than anything he can feel ———
  {
    id: "planck", name: "普朗克长度", metres: PLANCK_LENGTH_M, kind: "quantum",
    shown: "大约 1.6×10⁻³⁵ 米",
    blurb: "目前能说的最小尺度。再小，现在的物理就说不清了。",
    correlate: "比你摸过的任何东西都小太多了。你能感觉到的最小的，是蚂蚁那么一点点。",
    source: "CODATA Planck length ≈ 1.616×10⁻³⁵ m",
    waystation: true, emoji: "✨",
  },
  {
    id: "quark", name: "夸克这么小", metres: 1e-18, kind: "particle",
    shown: "大约 10⁻¹⁸ 米",
    blurb: "比质子还小很多。最大的对撞机，也只能看到大约这一层。",
    correlate: "比蚂蚁小很多很多很多倍。你没有摸过这么小的东西。",
    source: "Order-of-magnitude LHC / quark confinement scale ~10⁻¹⁸ m",
    emoji: "⚛️",
  },
  {
    id: "nucleus", name: "原子核", metres: 1e-14, kind: "particle",
    shown: "大约 10⁻¹⁴ 米",
    blurb: "原子中间小小的核。大一点的原子核大约十几飞米。",
    correlate: "还是比蚂蚁小到没法比。下一步能叫出名字的，是原子。",
    source: "Heavy nuclei ~10 fm = 10⁻¹⁴ m",
    emoji: "🟡",
  },
  {
    id: "proton", name: "质子", metres: 1.7e-15, kind: "particle",
    shown: "大约 10⁻¹⁵ 米",
    blurb: "质子大约 1 到 2 飞米宽。原子核就是它们挤在一起。",
    correlate: "比你摸过的都小。记住这个名字就好：质子。",
    source: "Proton charge radius ~0.84 fm; diameter order 10⁻¹⁵ m",
    emoji: "🔴",
  },
  {
    id: "atom", name: "原子", metres: 1e-10, kind: "atom",
    shown: "大约 0.1 纳米",
    blurb: "一个原子大约 0.1 纳米。一百万分之一毫米。",
    correlate: "还是看不见。再放大很多很多倍，才能看到一粒沙。",
    source: "Typical atomic diameter ~0.1 nm = 1 Å",
    waystation: true, emoji: "⚛️",
  },
  {
    id: "dna", name: "DNA 有多粗", metres: 2e-9, kind: "molecule",
    shown: "大约 2 纳米",
    blurb: "DNA 双螺旋大约 2 纳米粗。比原子大一点，还是非常非常细。",
    correlate: "比蚂蚁细太多了。这是身体里的说明书，不是你能用手比的。",
    source: "B-DNA helix diameter ≈ 2 nm",
    emoji: "🧬",
  },
  {
    id: "membrane", name: "细胞膜", metres: 1e-8, kind: "molecule",
    shown: "大约 10 纳米",
    blurb: "包住细胞的那一层膜，大约 10 纳米厚。",
    correlate: "还是看不见。再放大，会碰到病毒那么大。",
    source: "Lipid bilayer ~4–10 nm",
    emoji: "🫧",
  },
  {
    id: "virus", name: "病毒那么小", metres: 1e-7, kind: "life",
    shown: "大约 100 纳米",
    blurb: "很多病毒大约 100 纳米。要用电子显微镜才看得到。",
    correlate: "比一粒沙还小很多。你看不见它，但它比原子大多了。",
    source: "Typical virus 20–300 nm; 100 nm is a mid example",
    emoji: "🦠",
  },
  {
    id: "lightwave", name: "光的波浪", metres: 5e-7, kind: "wave",
    shown: "大约 0.5 微米",
    blurb: "可见光的波长大约半微米。紫光更短，红光更长。",
    correlate: "光就在你身边，可是这一层还是比蚂蚁细很多。",
    source: "Visible light ~400–700 nm",
    emoji: "🌈",
  },
  {
    id: "bacteria", name: "细菌", metres: 2e-6, kind: "life",
    shown: "大约 2 微米",
    blurb: "常见细菌大约 1 到 2 微米长。",
    correlate: "还是要用显微镜。再放大一点，就是红细胞。",
    source: "E. coli typically ~1–2 μm long",
    emoji: "🦠",
  },
  {
    id: "cell", name: "红细胞", metres: 8e-6, kind: "life",
    shown: "大约 8 微米",
    blurb: "红细胞大约 8 微米宽。一滴血里有很多很多个。",
    correlate: "还是看不见。再放大，能看到头发丝那么粗。",
    source: "Human RBC diameter commonly ~8 μm",
    waystation: true, emoji: "🔴",
  },
  {
    id: "hair", name: "头发丝", metres: 8e-5, kind: "everyday",
    shown: "大约 0.08 毫米",
    blurb: "一根头发大约 50 到 100 微米粗。用手指能摸到，但看不清有多粗。",
    correlate: "这是你身上能摸到的细东西。比蚂蚁还细。",
    source: "Typical human hair 50–100 μm",
    emoji: "💇",
  },
  {
    id: "sand", name: "一粒沙", metres: 5e-4, kind: "everyday",
    shown: "大约 0.5 毫米",
    blurb: "一粒中等的沙子大约半毫米。细的更小，粗的可以到 2 毫米。",
    correlate: "沙在手指上能感觉到。比蚂蚁小，比头发丝粗。",
    source: "Wentworth medium sand 0.25–0.5 mm",
    waystation: true, emoji: "🟡",
  },
  {
    id: "ant", name: "蚂蚁", metres: 4e-3, kind: "everyday",
    shown: "大约 4 毫米",
    blurb: "一只小蚂蚁大约几毫米长。这是你能亲眼看见、用手指比的最小的活东西。",
    correlate: "看见过蚂蚁吗？往更小走，都要比蚂蚁再小很多很多倍。",
    source: "Typical small worker ant a few millimetres; 4 mm mid example",
    waystation: true, familiar: true, emoji: "🐜",
  },
  {
    id: "finger", name: "手指宽（示例）", metres: 0.015, kind: "everyday",
    shown: "大约 1.5 厘米",
    blurb: "一根手指大约一厘米多宽。这是示例，不是量过你的手。",
    correlate: "用你自己的手指比一比。再往上，就是你的身高。",
    assumption: true, emoji: "👆",
  },

  // ——— Chance-scale, lived experience ———
  {
    id: "me", name: "我的身高", metres: 1.20, kind: "me",
    shown: "大约 1.20 米（假设）",
    blurb: "这是现在的身高。还没有量过以前，先用假设值。",
    correlate: "一切从你自己开始。往外放大，往里缩小，都用你来比。",
    assumption: true, fromProfile: "heightM",
    waystation: true, familiar: true, emoji: "🧒",
  },
  {
    id: "room", name: "一间教室（示例）", metres: 10, kind: "everyday",
    shown: "大约 10 米",
    blurb: "一间教室大概十米长。这是示例，不是某一间真教室。",
    correlate: "大约是你身高的 8 倍（按现在的假设身高来算）。",
    assumption: true, emoji: "🏫",
  },
  {
    id: "bike-second", name: "自行车 1 秒（假设）", metres: 15 / 3.6, kind: "speed",
    shown: "大约 4 米",
    blurb: "自行车按假设的 15 公里/小时，1 秒大约走 4 米。",
    correlate: "差不多是你躺下来再多一点。速度都是假设，不是量过你的车。",
    assumption: true, lingerMode: "race", emoji: "🚲",
  },
  {
    id: "steps", name: "我走 100 步", metres: 50, kind: "me",
    shown: "大约 50 米（假设）",
    blurb: "用现在的步长走 100 步。步长还没量过，先用假设值。",
    correlate: "下楼真的走一次，就能换成你自己的数。",
    assumption: true, fromProfile: "strideM", times: 100,
    waystation: true, familiar: true, emoji: "👣",
  },
  {
    id: "sheshan", name: "附近一座小山", nameEn: "A small nearby hill", metres: SHESHAN_HEIGHT_M, kind: "mountain",
    shown: "大约 99 米", shownEn: "About 99 m",
    blurb: "上海附近一座大约 99 米的小山。只用来比一比大小，不是你爬过的山。",
    blurbEn: "A small hill near Shanghai, about 99 m. Only for comparing size, not a mountain you have climbed.",
    correlate: "米兰大教堂已经比这座小山高一点。外滩的楼、埃菲尔铁塔、富士山都比它高很多。",
    correlateEn: "The Milan Duomo is already a little taller. The Bund towers, the Eiffel Tower, and Fuji are all much taller.",
    contrastOnly: true, emoji: "⛰️",
    source: "Sheshan West Peak commonly ~98.8–99 m",
  },
  {
    id: "duomo", name: "米兰大教堂", nameEn: "Milan Cathedral", metres: DUOMO_MADONNINA_M, kind: "city",
    shown: "108.5 米", shownEn: "108.5 m",
    blurb: "到金色圣母像（Madonnina）的官方高度是 108.5 米。今年你在米兰认识了它。",
    blurbEn: "The official height to the golden Madonnina is 108.5 m. You got to know it in Milan this year.",
    correlate: "你看见过的埃菲尔铁塔，大约是它的三倍高。你一次能爬大约 900 米，比这座教堂高得多。",
    correlateEn: "The Eiffel Tower you have seen is about three times as high. The 900 m you can climb in one go is much taller than this cathedral.",
    familiar: true, waystation: true, emoji: "⛪",
    lingerMode: "compare",
    source: "Veneranda Fabbrica / duomomilano.it: 108.5 m to the Madonnina",
  },

  {
    id: "plane-second", name: "飞机 1 秒（假设）", metres: 850 / 3.6, kind: "speed",
    shown: "大约 236 米",
    blurb: "飞机按假设的 850 公里/小时，1 秒大约飞 236 米。",
    correlate: "比上海附近那座小山、比埃菲尔铁塔都要一下子更远。去东京的飞机，一眨眼就飞过一座小山那么远。",
    correlateEn: "Farther in one second than a small nearby hill or the Eiffel Tower is tall. The plane to Tokyo covers a small-hill height in a blink.",
    assumption: true, lingerMode: "race", emoji: "✈️",
  },
  {
    id: "kilometre", name: "1 公里", metres: 1000, kind: "everyday",
    shown: "1 公里",
    blurb: "1000 米就是 1 公里。走大概十几分钟（按走路来想）。",
    correlate: "你一次能爬大约 900 米，已经接近 1 公里。上海附近那座小山只有大约 99 米，只用来比一比。",
    correlateEn: "The 900 m you can climb in one go is already close to 1 km. A small hill near Shanghai is only about 99 m; it is just there for size.",
    lingerMode: "elevator",
    emoji: "📏",
  },

  {
    id: "eiffel", name: "埃菲尔铁塔", nameEn: "The Eiffel Tower", metres: EIFFEL_HEIGHT_M, kind: "city",
    shown: "330 米", shownEn: "330 m",
    blurb: "你去过巴黎，也看见过这座塔。带天线的官方高度是 330 米。",
    blurbEn: "You have been to Paris and seen this tower. The official height with its antenna is 330 m.",
    correlate: "比米兰大教堂高大约 3 倍，比东方明珠矮一点。",
    correlateEn: "About 3 times as high as the Milan Duomo, and a little shorter than the Oriental Pearl.",
    familiar: true, emoji: "🗼",
    lingerMode: "compare",
    source: "toureiffel.paris official height with antennas: 330 m (2022)",
  },
  {
    id: "jinmao", name: "金茂大厦", nameEn: "Jin Mao Tower", metres: JIN_MAO_M, kind: "city",
    shown: "420.5 米", shownEn: "420.5 m",
    blurb: "从外滩看过去的一座楼，大约 420.5 米。你每天都能看见。",
    blurbEn: "One of the towers you see from the Bund, about 420.5 m. You see it every day.",
    correlate: "比埃菲尔铁塔高一点，比东方明珠矮一点。",
    correlateEn: "A little taller than the Eiffel Tower, a little shorter than the Oriental Pearl.",
    familiar: true, emoji: "🏙️",
    source: "Jin Mao Tower 420.5 m",
  },
  {
    id: "oriental-pearl", name: "东方明珠", nameEn: "Oriental Pearl Tower", metres: ORIENTAL_PEARL_M, kind: "city",
    shown: "468 米", shownEn: "468 m",
    blurb: "从外滩看过去的陆家嘴三件套：东方明珠 468 米，金茂 420.5 米，环球金融中心 492 米，上海中心 632 米。你每天都能看见。",
    blurbEn: "The Lujiazui skyline from the Bund: the Oriental Pearl is 468 m, Jin Mao 420.5 m, the World Financial Center 492 m, and Shanghai Tower 632 m. You see them every day.",
    correlate: "东方明珠 468 米，金茂 420.5 米，环球金融中心 492 米，上海中心 632 米。比埃菲尔铁塔都高。",
    correlateEn: "The Oriental Pearl is 468 m, Jin Mao 420.5 m, the World Financial Center 492 m, and Shanghai Tower 632 m. All taller than the Eiffel Tower.",
    familiar: true, waystation: true, emoji: "🔮",
    lingerMode: "compare",
    source: "shanghai.gov.cn: Oriental Pearl Tower 468 m",
  },
  {
    id: "swfc", name: "环球金融中心", nameEn: "Shanghai World Financial Center", metres: SWFC_HEIGHT_M, kind: "city",
    shown: "492 米", shownEn: "492 m",
    blurb: "外滩三件套里的一座，官方高度 492 米。你每天都能看见。",
    blurbEn: "One of the Bund skyline towers, officially 492 m. You see it every day.",
    correlate: "比东方明珠再高一点，比上海中心矮一截。",
    correlateEn: "A little taller than the Oriental Pearl, and shorter than Shanghai Tower.",
    familiar: true, emoji: "🏙️",
    source: "SWFC official: 492 m",
  },
  {
    id: "shanghai-tower", name: "上海中心", nameEn: "Shanghai Tower", metres: SHANGHAI_TOWER_M, kind: "city",
    shown: "632 米", shownEn: "632 m",
    blurb: "外滩望过去最高的那座，官方高度 632 米。你每天都能看见。",
    blurbEn: "The tallest of the towers you see from the Bund, officially 632 m. You see it every day.",
    correlate: "比东方明珠高，比你一次能爬的 900 米还矮一点。",
    correlateEn: "Taller than the Oriental Pearl, and still a little shorter than the 900 m you can climb in one go.",
    familiar: true, emoji: "🏙️",
    source: "Shanghai Tower 632 m",
  },
  {
    id: "chance-climb", name: "你一次能爬的高度", nameEn: "The height you can climb in one go", metres: CHANCE_HIKE_GAIN_M, kind: "me",
    shown: "大约 900 米", shownEn: "About 900 m",
    blurb: "你一次能走大约 12 公里，还能爬升 800 到 1,000 米。这是你自己的本事，不是假设。",
    blurbEn: "You can hike about 12 km in one go, with 800 to 1,000 m of climbing. That is your own ability, not a guess.",
    correlate: "比上海中心还高一截，比斯西利亚尔的官方顶要矮。你在多洛米蒂爬过接近 1,000 米的山。",
    correlateEn: "A little taller than Shanghai Tower, and lower than Schlern's official top. You have climbed nearly 1,000 m in the Dolomites.",
    lingerMode: "hike", hikeId: "dolomites",
    familiar: true, emoji: "🥾",
    source: "Chance's lived hiking ability, mid of 800–1000 m",
  },
  {
    id: "chance-hike", name: "你一次能走的 12 公里", nameEn: "The 12 km you can hike in one go", metres: CHANCE_HIKE_KM * 1000, kind: "me",
    shown: "12 公里", shownEn: "12 km",
    blurb: "你一次能走大约 12 公里。这是你自己的本事，不是假设。",
    blurbEn: "You can hike about 12 km in one go. That is your own ability, not a guess.",
    correlate: "比开车去机场短，但已经是很长的一天。还可以爬升 800 到 1,000 米。",
    correlateEn: "Shorter than the drive to the airport, but already a long day. You can also climb 800 to 1,000 m.",
    lingerMode: "hike", hikeId: "dolomites",
    familiar: true, emoji: "🥾",
    source: "Chance's lived hiking ability: 12 km in one go",
  },
  {
    id: "schlern", name: "大板凳山", nameEn: "Schlern / Sciliar", metres: SCHLERN_PEZ_M, kind: "mountain",
    shown: "2,563 米", shownEn: "2,563 m",
    blurb: "这座平顶山在意大利南蒂罗尔的多洛米蒂，不在瑞士。官方最高点蒙特佩茨大约 2,563 米。你认识它。",
    blurbEn: "This table-top mountain is in the Dolomites of South Tyrol, Italy, not on the Swiss plateau. The official high point, Monte Pez, is about 2,563 m. You know it.",
    correlate: "比你一次能爬的高度高，比富士山矮。你在多洛米蒂爬过接近 1,000 米的山，我们没有说你走到了 2,563 米的顶。",
    correlateEn: "Higher than the 900 m you can climb in one go, and lower than Fuji. You have climbed nearly 1,000 m in the Dolomites; we are not saying you reached the 2,563 m summit.",
    familiar: true, emoji: "🏞️",
    source: "Schlern / Sciliar, Monte Pez 2,563 m, Seiser Alm / South Tyrol",
  },
  {
    id: "huangshan", name: "黄山莲花峰", nameEn: "Huangshan Lotus Peak", metres: 1864, kind: "mountain",
    shown: "1,864 米", shownEn: "1,864 m",
    blurb: "黄山最高峰莲花峰，官方大约 1,864 米。一座可以比一比的名山，不是你说过爬过的山。",
    blurbEn: "Lotus Peak, the high point of Huangshan, is officially about 1,864 m. A famous peak to compare, not one you have said you climbed.",
    correlate: "比斯西利亚尔矮一些，大约是富士山的一半。",
    correlateEn: "A little lower than Schlern, and about half as high as Fuji.",
    emoji: "⛰️",
    source: "Lotus Peak 1,864 m (commonly 1864 or 1864.8 m)",
  },
  {
    id: "fuji", name: "富士山", nameEn: "Mount Fuji", metres: FUJI_HEIGHT_M, kind: "mountain",
    shown: "3,776 米", shownEn: "3,776 m",
    blurb: "官方高度 3,776 米。你来过这座山。你记得它大概是三千八百米；官方数字比三千八百要少一点点。示例山路，还不是你自己走的足迹。",
    blurbEn: "The official height is 3,776 m. You've been here. You remember it as about 3,800 m. The official number is a little less than 3,800. This path is a sample trail, not your own GPS track.",
    correlate: "比斯西利亚尔高，大约是珠穆朗玛峰的一半不到。珠峰你认识，但没有爬过。",
    correlateEn: "Taller than Schlern, and a little less than half as high as Everest. You know Everest, but you have not climbed it.",
    lingerMode: "hike", hikeId: "fuji",
    waystation: true, familiar: true, emoji: "🗻",
    source: "GSI 3776.12 m, usually written 3776 m",
  },
  {
    id: "cruise", name: "飞机巡航高度", metres: 11000, kind: "flight",
    shown: "大约 11 公里",
    blurb: "去东京、去巴黎的飞机，巡航大约 10 到 12 公里高。外面大约零下 50 度。",
    correlate: "比富士山还高大约 3 倍。你在飞机座位上，就在大约这一层。",
    lingerMode: "flight", familiar: true, emoji: "✈️",
    source: "Typical jet cruise 10–12 km; ISA tropopause 11 km",
  },
  {
    id: "city", name: "开车去机场", metres: 40000, kind: "city",
    shown: "大约 40 公里（假设）",
    blurb: "从市区开车去浦东机场，大约 40 公里。这是假设，路上会更绕。",
    correlate: "比富士山高得多，但这是往旁边走的路，不是往上爬。",
    assumption: true, fromProfile: "cityAirportKm",
    waystation: true, familiar: true, emoji: "🏙️",
  },
  {
    id: "hsr-hour", name: "高铁 1 小时（假设）", metres: 350000, kind: "speed",
    shown: "大约 350 公里",
    blurb: "高铁按假设的 350 公里/小时，1 小时大约走 350 公里。",
    correlate: "还不到上海到东京的四分之一。去东京要再乘好几倍。",
    assumption: true, lingerMode: "race", emoji: "🚄",
  },
  {
    id: "tokyo", name: "上海 → 东京", metres: 1_740_300, kind: "flight",
    shown: "大约 1,740 公里",
    blurb: "大圆航线大约 1,740 公里。这是你坐过的那一趟。",
    correlate: "这是你飞过的路。骑车按假设速度要好多天，飞机大约两个多小时。",
    lingerMode: "flight", tripId: "pvg-hnd", invites: ["numberline"],
    waystation: true, familiar: true, emoji: "✈️",
    source: "PVG–HND WGS-84 geodesic ≈ 1,740 km",
  },
  {
    id: "paris", name: "上海 → 巴黎", metres: 9_287_100, kind: "flight",
    shown: "大约 9,287 公里",
    blurb: "大圆航线大约 9,287 公里。比去东京远大约 5.3 倍。",
    correlate: "你也坐过这趟更远的飞机。还不到地球一圈的四分之一。",
    lingerMode: "flight", tripId: "pvg-cdg", invites: ["numberline"],
    waystation: true, familiar: true, emoji: "✈️",
    source: "PVG–CDG WGS-84 geodesic ≈ 9,287 km",
  },
  {
    id: "athens", name: "上海 → 雅典", nameEn: "Shanghai → Athens", metres: 8_575_665, kind: "flight",
    shown: "大约 8,576 公里", shownEn: "about 8,576 km",
    blurb: "大圆航线大约 8,576 公里。这是你坐过的一趟。",
    blurbEn: "The great-circle route is about 8,576 km. This is a flight you have taken.",
    correlate: "比去东京远很多，比去巴黎稍近一点。",
    correlateEn: "Much farther than Tokyo, a little closer than Paris.",
    lingerMode: "flight", tripId: "pvg-ath", invites: ["numberline"],
    familiar: true, emoji: "✈️",
    source: "PVG–ATH WGS-84 geodesic ≈ 8,576 km",
  },
  {
    id: "santorini", name: "上海 → 圣托里尼", nameEn: "Shanghai → Santorini", metres: 8_540_321, kind: "flight",
    shown: "大约 8,540 公里", shownEn: "about 8,540 km",
    blurb: "大圆航线大约 8,540 公里。这是你坐过的一趟。",
    blurbEn: "The great-circle route is about 8,540 km. This is a flight you have taken.",
    correlate: "和去雅典差不多远，也是你坐过的飞机。",
    correlateEn: "About as far as Athens, and also a flight you have taken.",
    lingerMode: "flight", tripId: "pvg-jtr", invites: ["numberline"],
    familiar: true, emoji: "✈️",
    source: "PVG–JTR WGS-84 geodesic ≈ 8,540 km",
  },
  {
    id: "cologne", name: "上海 → 科隆", nameEn: "Shanghai → Cologne", metres: 8_901_836, kind: "flight",
    shown: "大约 8,902 公里", shownEn: "about 8,902 km",
    blurb: "大圆航线大约 8,902 公里。这是你坐过的一趟。",
    blurbEn: "The great-circle route is about 8,902 km. This is a flight you have taken.",
    correlate: "和去巴黎差不多远，也是你坐过的飞机。",
    correlateEn: "About as far as Paris, and also a flight you have taken.",
    lingerMode: "flight", tripId: "pvg-cgn", invites: ["numberline"],
    familiar: true, emoji: "✈️",
    source: "PVG–CGN WGS-84 geodesic ≈ 8,902 km",
  },
  {
    id: "lax", name: "上海 → 洛杉矶", nameEn: "Shanghai → Los Angeles", metres: 10_435_865, kind: "flight",
    shown: "大约 10,436 公里", shownEn: "about 10,436 km",
    blurb: "大圆航线大约 10,436 公里，要飞过太平洋。这是你坐过的一趟。",
    blurbEn: "The great-circle route is about 10,436 km, across the Pacific. This is a flight you have taken.",
    correlate: "比去巴黎还远一点，是从太平洋过去的。",
    correlateEn: "A little farther than Paris, going across the Pacific.",
    lingerMode: "flight", tripId: "pvg-lax", invites: ["numberline"],
    familiar: true, emoji: "✈️",
    source: "PVG–LAX WGS-84 geodesic ≈ 10,436 km",
  },
  {
    id: "earth-diameter", name: "地球有多宽", metres: EARTH_DIAMETER_M, kind: "earth",
    shown: "大约 12,742 公里",
    blurb: "地球从这边到那边，大约 12,742 公里。比上海到巴黎还长一点。",
    correlate: "去巴黎差不多已经是地球这么宽了。再走远一点，就是绕一圈。",
    source: "IUGG mean diameter = 2 × 6371.0088 km",
    emoji: "🌍",
  },
  {
    id: "earth", name: "地球一圈", metres: EARTH_EQUATOR_KM * 1000, kind: "earth",
    shown: "大约 40,075 公里",
    blurb: "沿着赤道走一圈大约 40,075 公里。",
    correlate: "大约是去巴黎的 4 倍多，大约是去东京的 23 倍。",
    waystation: true, emoji: "🌍",
    source: "WGS-84 equatorial circumference 2πa = 40,075.017 km",
  },

  // ——— outward, beyond flights ———
  {
    id: "moon", name: "地球 → 月亮", metres: EARTH_MOON_KM * 1000, kind: "space",
    shown: "大约 38.4 万公里",
    blurb: "平均大约 38.4 万公里。光要走 1.28 秒（常说约 1.3 秒）。",
    correlate: "比你飞过的巴黎还远大约 40 倍。光一眨眼就到，飞机可不行。",
    lingerMode: "cosmos",
    waystation: true, emoji: "🌙",
    source: "NASA mean Earth–Moon 384,400 km",
  },
  {
    id: "sun-size", name: "太阳有多宽", metres: SUN_DIAMETER_M, kind: "space",
    shown: "大约 139 万公里",
    blurb: "太阳的直径大约 139 万公里。能放下一百多个地球。",
    correlate: "比地球到月亮还宽。太阳本身就这么大。",
    source: "IAU-compatible solar equatorial diameter ≈ 1.3927×10⁶ km",
    emoji: "☀️",
  },
  {
    id: "sun", name: "地球 → 太阳", metres: AU_KM * 1000, kind: "space",
    shown: "大约 1.50 亿公里",
    blurb: "1 个天文单位，大约 1.496 亿公里。光要走 8 分 19 秒。",
    correlate: "比去巴黎远大约 1 万 6 千倍。光要走八分多钟。",
    lingerMode: "cosmos",
    waystation: true, emoji: "☀️",
    source: "IAU AU = 149,597,870.7 km; light time 8 min 19 s",
  },
  {
    id: "neptune", name: "到海王星", metres: 30 * AU_KM * 1000, kind: "space",
    shown: "大约 45 亿公里",
    blurb: "海王星大约在 30 个天文单位外，大约 45 亿公里。",
    correlate: "已经是太阳系的外圈。比地球到太阳远 30 倍。",
    source: "Neptune semi-major axis ≈ 30 AU",
    emoji: "🔵",
  },
  {
    id: "heliopause", name: "太阳系边缘", metres: 120 * AU_KM * 1000, kind: "space",
    shown: "大约 180 亿公里",
    blurb: "日球层顶大约 120 个天文单位，是太阳风能管到的大概边缘。",
    correlate: "比你飞过的任何路都远太多了。上一个能感觉的，还是去巴黎的飞机。",
    source: "Voyager heliopause ~120 AU (approximate)",
    emoji: "🌬️",
  },
  {
    id: "light-year", name: "1 光年", metres: LIGHT_YEAR_KM * 1000, kind: "space",
    shown: "大约 9.46 万亿公里",
    blurb: "光一年跑的路，就叫 1 光年。大约 9.46 万亿公里。",
    correlate: "飞机按假设速度，要几千万年。所以才用光来量。",
    lingerMode: "cosmos",
    waystation: true, emoji: "✨",
    source: "IAU light-year = 9,460,730,472,580.8 km",
  },
  {
    id: "proxima", name: "最近的恒星", metres: PROXIMA_KM * 1000, kind: "space",
    shown: "大约 4.25 光年",
    blurb: "比邻星大约 4.25 光年。光要走四年多才能到。",
    correlate: "比 1 光年再远 4 倍多。这是太阳以外最近的恒星。",
    lingerMode: "cosmos",
    waystation: true, emoji: "⭐",
    source: "Proxima Centauri ≈ 4.25 ly (Gaia, commonly 4.24–4.25)",
  },
  {
    id: "sirius", name: "天狼星", metres: 8.6 * LIGHT_YEAR_KM * 1000, kind: "space",
    shown: "大约 8.6 光年",
    blurb: "天上很亮的天狼星，大约 8.6 光年远。",
    correlate: "比最近的恒星再远大约 1 倍。夜里能看见的星星，都至少有好几光年。",
    source: "Sirius ≈ 8.6 ly",
    emoji: "⭐",
  },
  {
    id: "hundred-ly", name: "100 光年", metres: 100 * LIGHT_YEAR_KM * 1000, kind: "space",
    shown: "100 光年",
    blurb: "100 光年已经能装下附近好多星星。",
    correlate: "光要走一百年。你飞过的巴黎，在这一层里小到看不见。",
    emoji: "✨",
  },
  {
    id: "thousand-ly", name: "1,000 光年", metres: 1000 * LIGHT_YEAR_KM * 1000, kind: "space",
    shown: "1,000 光年",
    blurb: "一千光年，大约是银河系旋臂里的一小段。",
    correlate: "比邻星在这一层里，已经是很近的邻居。",
    emoji: "🌌",
  },
  {
    id: "milkyway", name: "银河系", metres: 1.05e5 * LIGHT_YEAR_KM * 1000, kind: "space",
    shown: "大约 10 万光年",
    blurb: "银河系从这边到那边，大约 10 万光年。我们住在其中一条旋臂上。",
    correlate: "比去巴黎远到没法用飞机比。光要走十万年才穿过银河。",
    waystation: true, emoji: "🌌",
    source: "Milky Way stellar disk diameter commonly ~100,000 ly (order of magnitude; some estimates 120–180k)",
  },
  {
    id: "andromeda", name: "仙女座星系", metres: 2.5e6 * LIGHT_YEAR_KM * 1000, kind: "space",
    shown: "大约 250 万光年",
    blurb: "最近的大星系仙女座，大约 250 万光年远。",
    correlate: "比整个银河系还远二十多倍。肉眼隐约能看成一个小斑点。",
    source: "Andromeda distance ~2.5 million ly",
    emoji: "🌌",
  },
  {
    id: "local-group", name: "本星系群", metres: 1e7 * LIGHT_YEAR_KM * 1000, kind: "space",
    shown: "大约 1,000 万光年",
    blurb: "银河系、仙女座和旁边的小星系，合起来叫本星系群，大约一千万光年宽。",
    correlate: "已经是好多座星系的家。比你飞过的路远太多了。",
    source: "Local Group diameter ~10 million ly (order of magnitude)",
    emoji: "🌌",
  },
  {
    id: "virgo", name: "室女座星系团", metres: 5.5e7 * LIGHT_YEAR_KM * 1000, kind: "space",
    shown: "大约 5,500 万光年",
    blurb: "室女座星系团大约五千万光年远，里面有一千多个星系。",
    correlate: "这是附近最大的星系团之一。上一个你能感觉的，还是去巴黎的飞机。",
    source: "Virgo cluster ~50–65 million ly; we use ~55 million ly",
    emoji: "🌌",
  },
  {
    id: "laniakea", name: "拉尼亚凯亚超星系团", metres: 5.2e8 * LIGHT_YEAR_KM * 1000, kind: "space",
    shown: "大约 5 亿光年",
    blurb: "我们的超星系团大约 5 亿光年宽，里面有大约 10 万个星系。",
    correlate: "已经大到只能用光年来数。再往外，就是能看到的整个宇宙。",
    source: "Laniakea diameter ~520 million ly (Tully et al. 2014, approximate)",
    emoji: "🌌",
  },

  {
    id: "water-molecule", name: "水分子", metres: 2.7e-10, kind: "molecule",
    shown: "大约 0.3 纳米",
    blurb: "一个水分子大约 0.3 纳米。比一个原子只大一点点。",
    correlate: "水你每天都摸得到，可是一个水分子还是看不见。",
    source: "Water molecule size ~0.27 nm",
    emoji: "💧",
  },
  {
    id: "white-cell", name: "白细胞", metres: 1.5e-5, kind: "life",
    shown: "大约 15 微米",
    blurb: "白细胞比红细胞稍大，大约 10 到 15 微米。",
    correlate: "还是要用显微镜。再放大，就到头发丝了。",
    source: "Typical leukocyte 10–15 μm",
    emoji: "⚪",
  },
  {
    id: "mite", name: "尘螨", metres: 3e-4, kind: "everyday",
    shown: "大约 0.3 毫米",
    blurb: "尘螨大约零点几毫米，刚刚要用放大镜。",
    correlate: "比一粒沙还小一点。你的床上也许有，但几乎看不见。",
    source: "Dust mite ~0.2–0.4 mm",
    emoji: "🪲",
  },
  {
    id: "rice", name: "一粒米（示例）", metres: 6e-3, kind: "everyday",
    shown: "大约 6 毫米",
    blurb: "一粒米大约半厘米长。这是示例。",
    correlate: "和蚂蚁差不多大，用手就能捏住。",
    assumption: true, emoji: "🍚",
  },
  {
    id: "coin", name: "一枚硬币（示例）", metres: 0.025, kind: "everyday",
    shown: "大约 2.5 厘米",
    blurb: "一枚常见硬币大约两厘米多宽。这是示例。",
    correlate: "比蚂蚁大，比你的手小。还没有量过你的手。",
    assumption: true, emoji: "🪙",
  },
  {
    id: "ball", name: "足球（示例）", metres: 0.22, kind: "everyday",
    shown: "大约 22 厘米",
    blurb: "一个足球大约 22 厘米宽。这是示例。",
    correlate: "比你的手大，比你的身高小。用你自己来比就好。",
    assumption: true, emoji: "⚽",
  },
  {
    id: "walk-second", name: "走路 1 秒（假设）", metres: 5 / 3.6, kind: "speed",
    shown: "大约 1.4 米",
    blurb: "走路按假设的 5 公里/小时，1 秒大约走 1.4 米。",
    correlate: "比自行车慢，大约是假设骑车速度的三分之一。不是量过你的步子。",
    assumption: true, lingerMode: "race", emoji: "🚶",
  },
  {
    id: "car-second", name: "汽车 1 秒（假设）", metres: 120 / 3.6, kind: "speed",
    shown: "大约 33 米",
    blurb: "汽车按假设的 120 公里/小时，1 秒大约走 33 米。",
    correlate: "差不多是走 100 步的一半（按假设步长）。",
    assumption: true, lingerMode: "race", emoji: "🚗",
  },
  {
    id: "tree", name: "一棵树（示例）", metres: 20, kind: "everyday",
    shown: "大约 20 米",
    blurb: "一棵比较高的树大约 20 米。这是示例。",
    correlate: "大约是你身高的十几倍（按假设身高）。比米兰大教堂、比外滩的楼都矮很多。",
    correlateEn: "About ten-something times your height (using the assumed height). Much shorter than the Duomo or the Bund towers.",
    assumption: true, emoji: "🌳",
  },
  {
    id: "everest", name: "珠穆朗玛峰", nameEn: "Mount Everest", metres: EVEREST_HEIGHT_M, kind: "mountain",
    shown: "8,849 米", shownEn: "8,849 m",
    blurb: "地球上最高的山。官方高度 8,848.86 米，常说 8,849 米。你认识它，但没有爬过。",
    blurbEn: "The highest mountain on Earth. Officially 8,848.86 m, commonly 8,849 m. You know it, but you have not climbed it.",
    correlate: "大约是富士山的 2 倍多高，还是比飞机巡航矮一点。",
    correlateEn: "A little more than twice as high as Fuji, and still a bit lower than a cruising plane.",
    source: "Everest 8848.86 m, commonly 8,849 m",
    emoji: "🏔️",
  },
  {
    id: "iss", name: "空间站那么高", metres: 400000, kind: "space",
    shown: "大约 400 公里",
    blurb: "国际空间站大约在 400 公里高的轨道上。",
    correlate: "比去机场还远十倍。但还不到上海到东京的四分之一。",
    source: "ISS typical altitude ~400 km",
    emoji: "🛰️",
  },
  {
    id: "plane-hour", name: "飞机 1 小时（假设）", metres: 850000, kind: "speed",
    shown: "大约 850 公里",
    blurb: "飞机按假设的 850 公里/小时，1 小时大约飞 850 公里。",
    correlate: "去东京大约 1,740 公里，差不多要飞两个多小时。",
    assumption: true, lingerMode: "race", familiar: true, emoji: "✈️",
  },
  {
    id: "light-second", name: "光 1 秒", metres: C_KM_S * 1000, kind: "space",
    shown: "大约 30 万公里",
    blurb: "光 1 秒大约跑 30 万公里。差一点就到月亮。",
    correlate: "月亮大约要 1.28 秒。你飞去巴黎要好多个小时，光只要一眨眼的很多很多倍里的一下。",
    lingerMode: "cosmos",
    waystation: false, emoji: "💡",
    source: "c = 299,792.458 km/s (exact SI)",
  },
  {
    id: "oort", name: "奥尔特云", metres: 1e15, kind: "space",
    shown: "大约 0.1 光年",
    blurb: "太阳系最外面的彗星云，大约 0.1 光年那么远，是大约值。",
    correlate: "已经快要用光年来量了。比海王星远得多。",
    source: "Inner Oort cloud order 10¹⁵ m / ~0.1 ly (very approximate)",
    emoji: "❄️",
  },
  {
    id: "vega", name: "织女星", metres: 25 * LIGHT_YEAR_KM * 1000, kind: "space",
    shown: "大约 25 光年",
    blurb: "织女星大约 25 光年远。夏天夜里很好认。",
    correlate: "比最近的恒星再远大约 6 倍。还是我们的邻居星星。",
    source: "Vega ≈ 25 ly",
    emoji: "⭐",
  },
  {
    id: "orion", name: "猎户座星云", metres: 1344 * LIGHT_YEAR_KM * 1000, kind: "space",
    shown: "大约 1,300 光年",
    blurb: "猎户座腰带下面的星云，大约 1,300 光年远。",
    correlate: "光要走一千多年。你看到的光，是很久很久以前出发的。",
    source: "Orion Nebula ~1,344 ly",
    emoji: "🌌",
  },
  {
    id: "lmc", name: "大麦哲伦云", metres: 1.63e5 * LIGHT_YEAR_KM * 1000, kind: "space",
    shown: "大约 16 万光年",
    blurb: "银河系旁边的一个伴星系，大约 16 万光年远。",
    correlate: "比银河系本身还远一点。已经是另一座星系了。",
    source: "Large Magellanic Cloud ~163,000 ly",
    emoji: "🌌",
  },
  {
    id: "filament", name: "宇宙网", metres: 1e9 * LIGHT_YEAR_KM * 1000, kind: "space",
    shown: "大约 10 亿光年",
    blurb: "星系会连成一条一条的长丝，大约十亿光年这么长的结构。",
    correlate: "比超星系团还大。再往外，就是能看到的整个宇宙。",
    source: "Cosmic-web filament scale ~hundreds of millions to a billion ly (order of magnitude)",
    emoji: "🕸️",
  },
  {
    id: "universe", name: "可观测宇宙", metres: OBSERVABLE_UNIVERSE_DIAMETER_M, kind: "universe",
    shown: "大约 930 亿光年",
    blurb: "我们能看到的宇宙，这边到那边大约 930 亿光年。再远的光，还没跑到地球。",
    correlate: "这是这条线的尽头。从普朗克长度一路走到这里。你能亲身感觉的，还是飞机、山和速度。",
    lingerMode: "cosmos",
    waystation: true, emoji: "🌀",
    source: "Particle-horizon diameter ~93 billion ly ≈ 8.8×10²⁶ m (classroom approximation)",
  },
];

/** Waystations the child can skip to. */
export const SCALE_WAYSTATIONS = [
  { id: "planck", label: "普朗克", labelEn: "Planck" },
  { id: "ant", label: "蚂蚁", labelEn: "Ant" },
  { id: "me", label: "我", labelEn: "Me" },
  { id: "duomo", label: "米兰", labelEn: "Duomo" },
  { id: "oriental-pearl", label: "外滩", labelEn: "Bund" },
  { id: "fuji", label: "富士山", labelEn: "Fuji" },
  { id: "tokyo", label: "我的飞机", labelEn: "My plane" },
  { id: "universe", label: "宇宙", labelEn: "Universe" },
];

const LAST_FELT_SMALL = "蚂蚁";
const LAST_FELT_FAR = "上海到洛杉矶的飞机";

function bridgeForDecade(exp) {
  if (exp <= -3) {
    return "比你摸过的任何东西都小。你能感觉到的最小的，是" + LAST_FELT_SMALL + "。";
  }
  if (exp < 0) {
    return "已经接近你能看见的东西了。再往上一点点，就是蚂蚁和你的手指。";
  }
  if (exp <= 2) {
    return "用你的身高、你走的路、米兰大教堂和埃菲尔铁塔来比。";
  }
  if (exp <= 4) {
    return "用外滩的楼、你一次能爬的高度、斯西利亚尔和富士山来比。";
  }
  if (exp <= 7) {
    return "用你坐过的上海到东京、上海到巴黎、上海到洛杉矶、雅典、圣托里尼和科隆来比。";
  }
  return "比" + LAST_FELT_FAR + "还远。那是你飞过最远的路。";
}

function decadeName(exp) {
  return "10 的 " + exp + " 次方 米";
}

function decadeShown(exp) {
  if (exp === 0) return "1 米";
  if (exp === 3) return "1 公里";
  if (exp === 6) return "1,000 公里";
  if (exp === -3) return "1 毫米";
  if (exp === -6) return "1 微米";
  if (exp === -9) return "1 纳米";
  return "10 的 " + exp + " 次方 米";
}

function decadeBlurb(exp) {
  if (exp < -15) return "这一层还是非常非常小。比质子还小。";
  if (exp < -10) return "这一层还在原子里面，或刚出原子核。";
  if (exp < -3) return "这一层还要用显微镜，眼睛看不见。";
  if (exp < 0) return "这一层已经接近手指能感觉到的东西。";
  if (exp <= 7) return "这一层在你走的路和飞过的路附近。";
  if (exp <= 16) return "这一层已经到了太阳系，或刚出太阳系。";
  return "这一层要用光年来量。比你飞过的路远太多了。";
}

/**
 * Full playable inventory: every order of magnitude from 10⁻³⁵ to 10²⁷,
 * plus every named object (several per decade where it helps a 6-year-old).
 */

function decadeNameEn(exp) {
  return "10 to the " + exp + " metres";
}
function decadeShownEn(exp) {
  if (exp === 0) return "1 metre";
  if (exp === 3) return "1 kilometre";
  if (exp === 6) return "1,000 kilometres";
  if (exp === -3) return "1 millimetre";
  if (exp === -6) return "1 micrometre";
  if (exp === -9) return "1 nanometre";
  return "10 to the " + exp + " metres";
}
function decadeBlurbEn(exp) {
  if (exp < -15) return "This layer is still very, very small. Smaller than a proton.";
  if (exp < -10) return "This layer is still inside an atom, or just outside the nucleus.";
  if (exp < -3) return "This layer still needs a microscope. Your eyes cannot see it.";
  if (exp < 0) return "This layer is getting close to things your fingers can feel.";
  if (exp <= 7) return "This layer is near the walks you do and the flights you have taken.";
  if (exp <= 16) return "This layer is in the solar system, or just outside it.";
  return "This layer is measured in light-years. Much farther than any flight you have taken.";
}
function bridgeForDecadeEn(exp) {
  if (exp <= -3) return "Smaller than anything you have touched. The smallest thing you can feel is an ant.";
  if (exp < 0) return "Getting close to things you can see. A little higher, and you reach ants and your finger.";
  if (exp <= 2) return "Compare it with your height, the walks you do, the Duomo, and the Eiffel Tower.";
  if (exp <= 4) return "Compare it with the Bund towers, the height you can climb in one go, Schlern, and Fuji.";
  if (exp <= 7) return "Compare it with the flights you have taken from Shanghai to Tokyo, Paris, Los Angeles, Athens, Santorini, and Cologne.";
  return "Farther than the flight from Shanghai to Paris, the farthest you have flown.";
}

function withStopEnglish(s) {
  const en = englishForStop(s);
  if (!en) return s;
  return {
    ...s,
    nameEn: s.nameEn || en.nameEn,
    blurbEn: s.blurbEn || en.blurbEn,
    correlateEn: s.correlateEn || en.correlateEn,
    shownEn: s.shownEn || en.shownEn,
  };
}

export function allScaleStops() {
  const named = NAMED_SCALE_STOPS.map(withStopEnglish);
  const byId = new Set(named.map((s) => s.id));
  const out = named.slice();
  for (let exp = -35; exp <= 27; exp++) {
    const has = named.some((s) => {
      const e = Math.log10(Math.max(1e-40, s.metres));
      return e >= exp - 0.5 && e < exp + 0.5;
    });
    if (has) continue;
    const id = "decade-" + exp;
    if (byId.has(id)) continue;
    out.push({
      id,
      name: decadeName(exp),
      nameEn: decadeNameEn(exp),
      metres: Math.pow(10, exp),
      kind: "decade",
      shown: decadeShown(exp),
      shownEn: decadeShownEn(exp),
      blurb: decadeBlurb(exp),
      blurbEn: decadeBlurbEn(exp),
      correlate: bridgeForDecade(exp),
      correlateEn: bridgeForDecadeEn(exp),
      generated: true,
      emoji: exp < 0 ? "🔹" : "🔷",
    });
  }
  out.sort((a, b) => a.metres - b.metres);
  return out;
}

export const SCALE_STOP_COUNT = allScaleStops().length;
export const SCALE_MIN_M = PLANCK_LENGTH_M;
export const SCALE_MAX_M = OBSERVABLE_UNIVERSE_DIAMETER_M;

/** Resolve profile-dependent lengths. Never invent a measured personal value. */
export function resolveScaleStops(profile = DEFAULT_PROFILE, hikes = []) {
  return allScaleStops().map((s) => {
    const copy = { ...s };
    if (s.id === "me" && Number.isFinite(profile.heightM)) {
      copy.metres = profile.heightM;
      const assumed = Math.abs(profile.heightM - DEFAULT_PROFILE.heightM) < 1e-6;
      copy.shown = "大约 " + Number(profile.heightM).toFixed(2) + " 米" + (assumed ? "（假设）" : "");
      copy.shownEn = "About " + Number(profile.heightM).toFixed(2) + " m" + (assumed ? " (assumed)" : "");
      copy.blurb = assumed
        ? "这是现在的身高（假设）。还没有填过真实的数。"
        : "这是现在的身高，大约 " + Number(profile.heightM).toFixed(2) + " 米。";
      copy.blurbEn = assumed
        ? "This is the current height (assumed). A real number has not been filled in yet."
        : "This is the current height, about " + Number(profile.heightM).toFixed(2) + " m.";
      copy.assumption = assumed;
    }
    if (s.id === "steps" && Number.isFinite(profile.strideM)) {
      copy.metres = profile.strideM * 100;
      const assumed = Math.abs(profile.strideM - DEFAULT_PROFILE.strideM) < 1e-6;
      copy.shown = "大约 " + Math.round(profile.strideM * 100) + " 米" + (assumed ? "（假设）" : "");
      copy.assumption = assumed;
    }
    if (s.id === "city" && Number.isFinite(profile.cityAirportKm)) {
      copy.metres = profile.cityAirportKm * 1000;
      const assumed = Math.abs(profile.cityAirportKm - DEFAULT_PROFILE.cityAirportKm) < 1e-6;
      copy.shown = "大约 " + profile.cityAirportKm + " 公里" + (assumed ? "（假设）" : "");
      copy.assumption = assumed;
    }
    return copy;
  }).sort((a, b) => a.metres - b.metres);
}

export function nearestScaleStop(stops, metres) {
  let best = stops[0], bestD = Infinity;
  const ls = Math.log10(Math.max(1e-40, metres));
  for (const s of stops) {
    const d = Math.abs(Math.log10(Math.max(1e-40, s.metres)) - ls);
    if (d < bestD) { bestD = d; best = s; }
  }
  return { stop: best, close: bestD < 0.22, delta: bestD };
}

/** Kid-facing length, including Planck and light-years. */
function niceNum(x) {
  if (x >= 100) return String(Math.round(x));
  if (x >= 10) return x.toFixed(0);
  if (x >= 1) return x.toFixed(1).replace(/\.0$/, "");
  return x.toFixed(2).replace(/0+$/, "").replace(/\.$/, "");
}

export function formatScaleMetres(m) {
  if (!Number.isFinite(m) || m <= 0) return "—";
  if (m < 1e-20) {
    const e = Math.log10(m);
    const n = Math.round(e);
    const coeff = m / Math.pow(10, n);
    return coeff.toFixed(1).replace(/\.0$/, "") + "×10" + sup(n) + " 米";
  }
  if (m < 1e-9) return niceNum(m * 1e15) + " 飞米";
  if (m < 1e-6) return niceNum(m * 1e9) + " 纳米";
  if (m < 1e-4) return niceNum(m * 1e6) + " 微米";
  if (m < 1) return niceNum(m * 1000) + " 毫米";
  if (m < 1000) return (m >= 10 ? m.toFixed(0) : m.toFixed(2)) + " 米";
  const km = m / 1000;
  // Keep 公里 through everyday distances. 10^9 m is 100 万公里, not "0 亿公里".
  if (km < 1e6) return Math.round(km).toLocaleString("zh-CN") + " 公里";
  if (km < 1e8) {
    const wan = km / 1e4;
    const wanText = Math.abs(wan - Math.round(wan)) < 0.05 ? String(Math.round(wan)) : wan.toFixed(1).replace(/\.0$/, "");
    return wanText + " 万公里";
  }
  const ly = m / (LIGHT_YEAR_KM * 1000);
  if (ly < 0.1) {
    const yi = km / 1e8;
    // Never round a small 亿 value down to 0.
    if (yi < 0.15) return (Math.round(yi * 100) / 100).toFixed(2).replace(/0+$/, "").replace(/\.$/, "") + " 亿公里";
    return (Math.abs(yi - Math.round(yi)) < 0.05 ? String(Math.round(yi)) : yi.toFixed(2).replace(/\.00$/, "")) + " 亿公里";
  }
  if (ly < 10) return ly.toFixed(2).replace(/\.00$/, "") + " 光年";
  if (ly < 1e8) return Math.round(ly).toLocaleString("zh-CN") + " 光年";
  const yi = ly / 1e8;
  return (Math.abs(yi - Math.round(yi)) < 0.5 ? String(Math.round(yi)) : yi.toFixed(1)) + " 亿光年";
}

function sup(n) {
  const map = { "-": "⁻", "0": "⁰", "1": "¹", "2": "²", "3": "³", "4": "⁴", "5": "⁵", "6": "⁶", "7": "⁷", "8": "⁸", "9": "⁹" };
  return String(n).split("").map((c) => map[c] || c).join("");
}

const HEIGHT_STOP_IDS = new Set([
  "sheshan", "duomo", "eiffel", "jinmao", "oriental-pearl", "swfc", "shanghai-tower",
  "chance-climb", "schlern", "huangshan", "fuji", "everest",
]);

export function isOfficialHeightStop(stop) {
  if (!stop) return false;
  if (stop.officialHeight) return true;
  if (stop.kind === "mountain") return true;
  return HEIGHT_STOP_IDS.has(stop.id);
}

/** Official height in metres, never rounded to a whole kilometre. */
export function formatHeightMetres(m) {
  if (!Number.isFinite(Number(m))) return { zh: "—", en: "—" };
  const n = Number(m);
  const rounded = Math.abs(n - Math.round(n)) < 0.05 ? Math.round(n) : Math.round(n * 10) / 10;
  const zhNum = Number.isInteger(rounded) ? rounded.toLocaleString("zh-CN") : String(rounded);
  const enNum = Number.isInteger(rounded) ? rounded.toLocaleString("en-US") : String(rounded);
  return { zh: zhNum + " 米", en: enNum + " m" };
}

/** Kid-facing HUD line. Height stops keep the official metre figure (e.g. 3,776 米). */
export function prettyScaleAtStop(metres, stop, { close } = {}) {
  if (close && isOfficialHeightStop(stop)) {
    const h = formatHeightMetres(stop.metres);
    return { zh: "现在大约 " + h.zh, en: "About " + h.en };
  }
  return { zh: prettyScaleLine(metres), en: "" };
}

/** Scientific exponent n in m = c × 10^n, with 1 ≤ c < 10. */
export function scientificExponent(m) {
  if (!Number.isFinite(m) || m <= 0) return 0;
  return Math.floor(Math.log10(m) + 1e-12);
}

export function prettyScaleLine(m) {
  const human = formatScaleMetres(m);
  const e = Math.log10(Math.max(1e-40, m));
  // Use the scientific exponent, never Math.round: 8.8×10²⁶ is in the 10²⁶
  // decade, so a title saying 10²⁷ next to a 10²⁶ ring confuses a child.
  const n = scientificExponent(m);
  if (Math.abs(e - n) > 0.22) return "现在大约 " + human;
  if (n === 0) return "现在大约 " + human + "（靠近 1 米）";
  return "现在大约 " + human + "（10 的 " + n + " 次方 米）";
}

export function inventorySummary() {
  const stops = allScaleStops();
  const named = stops.filter((s) => !s.generated);
  return {
    total: stops.length,
    named: named.length,
    generated: stops.length - named.length,
    minM: stops[0].metres,
    maxM: stops[stops.length - 1].metres,
    decades: 27 - (-35) + 1,
  };
}
