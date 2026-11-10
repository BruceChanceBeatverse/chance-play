/**
 * Geodesy and atmosphere helpers.
 * Distances use the WGS-84 ellipsoid (Vincenty inverse).
 * Sources are cited next to each constant.
 */

// WGS-84 ellipsoid. NIMA / NGA Technical Report TR8350.2; EPSG:4326.
export const WGS84_A = 6378137.0;            // equatorial radius, metres
export const WGS84_F = 1 / 298.257223563;    // flattening
export const WGS84_B = WGS84_A * (1 - WGS84_F);

// Mean Earth radius used only for short hiking legs (km). Not for flight legs.
export const MEAN_EARTH_RADIUS_KM = 6371.0088; // IUGG mean radius, Moritz 1980

// WGS-84 equatorial circumference = 2 * π * a.
// 2 * Math.PI * 6378.137 = 40075.017 km. Page text said "约 40,000 公里".
export const EARTH_EQUATOR_KM = 40075.017;

// ICAO Standard Atmosphere (ICAO Doc 7488/3).
export const ISA_SEA_LEVEL_C = 15;
export const ISA_LAPSE_C_PER_KM = 6.5;       // 6.5 K/km up to the tropopause
export const ISA_TROPOPAUSE_KM = 11;
export const ISA_TROPOPAUSE_C = ISA_SEA_LEVEL_C - ISA_LAPSE_C_PER_KM * ISA_TROPOPAUSE_KM; // -56.5

// Speed of light (exact, SI).
export const C_KM_S = 299792.458;

// IAU 2012 definition of the astronomical unit.
export const AU_KM = 149597870.7;

// Mean Earth–Moon centre-to-centre distance. NASA Moon fact sheet (~384,400 km).
// Actual range roughly 356,500–406,700 km. We label this as the mean.
export const EARTH_MOON_KM = 384400;

// Light-travel times, derived: distance / c.
// Moon: 384400 / 299792.458 = 1.28222 s  → we show "1.28 秒（约 1.3 秒）".
// Sun:  AU / c = 499.0047838 s = 8 min 19.00 s.
// The design page rounded the Sun to "8 分 20 秒"; we show the exact 8 分 19 秒
// and mention the common rounding in the parent note.
export const LIGHT_MOON_S = EARTH_MOON_KM / C_KM_S;
export const LIGHT_SUN_S = AU_KM / C_KM_S;

// IAU light-year (Julian year of 365.25 days * c).
export const LIGHT_YEAR_KM = 9460730472580.8;

// Proxima Centauri distance ≈ 4.2465 ly (Gaia EDR3 / commonly cited 4.24–4.25).
// Design page said 4.2 ly. We use 4.25 ly and label it as a rounded figure.
export const PROXIMA_LY = 4.25;
export const PROXIMA_KM = PROXIMA_LY * LIGHT_YEAR_KM;

// Schwarzschild radius r_s = 2GM/c² for the Sun.
// G = 6.67430e-11 (CODATA 2018), M_sun = 1.98847e30 kg (IAU-compatible),
// c = 299792458 m/s → r_s ≈ 2.953 km. Design page said "约 3 公里".
export const SUN_SCHWARZSCHILD_KM = 2.953;

// Sagittarius A* mass. GRAVITY Collaboration 2022: (4.297 ± 0.012)×10^6 M_sun.
// Design page used "约 400 万个太阳" and "约 1200 万公里" (4e6 × 3 km).
// We use 4.30 million solar masses → r_s = 4.30e6 * 2.953 ≈ 12.70 million km.
export const SGR_A_SOLAR_MASSES = 4.30e6;
export const SGR_A_SCHWARZSCHILD_KM = SGR_A_SOLAR_MASSES * SUN_SCHWARZSCHILD_KM;

export function deg2rad(d) { return d * Math.PI / 180; }
export function rad2deg(r) { return r * 180 / Math.PI; }

/**
 * Vincenty inverse on WGS-84.
 * Vincenty, T. (1975). Direct and inverse solutions of geodesics
 * on the ellipsoid with application of nested equations.
 * Survey Review 23 (176): 88–93.
 * Returns kilometres, or null if the iteration fails (antipodal edge cases).
 */
export function vincentyKm(lat1, lon1, lat2, lon2) {
  const a = WGS84_A, f = WGS84_F, b = WGS84_B;
  const φ1 = deg2rad(lat1), φ2 = deg2rad(lat2);
  const L = deg2rad(lon2 - lon1);
  const U1 = Math.atan((1 - f) * Math.tan(φ1));
  const U2 = Math.atan((1 - f) * Math.tan(φ2));
  const sinU1 = Math.sin(U1), cosU1 = Math.cos(U1);
  const sinU2 = Math.sin(U2), cosU2 = Math.cos(U2);
  let λ = L, λPrev, iter = 0;
  let sinλ, cosλ, sinσ, cosσ, σ, sinα, cos2α, cos2σm, C;
  do {
    sinλ = Math.sin(λ); cosλ = Math.cos(λ);
    const t1 = cosU2 * sinλ;
    const t2 = cosU1 * sinU2 - sinU1 * cosU2 * cosλ;
    sinσ = Math.sqrt(t1 * t1 + t2 * t2);
    if (sinσ === 0) return 0;
    cosσ = sinU1 * sinU2 + cosU1 * cosU2 * cosλ;
    σ = Math.atan2(sinσ, cosσ);
    sinα = (cosU1 * cosU2 * sinλ) / sinσ;
    cos2α = 1 - sinα * sinα;
    cos2σm = cos2α !== 0 ? cosσ - (2 * sinU1 * sinU2) / cos2α : 0;
    C = f / 16 * cos2α * (2 + f * (4 - 3 * cos2α));
    λPrev = λ;
    λ = L + (1 - C) * f * sinα * (
      σ + C * sinσ * (cos2σm + C * cosσ * (-1 + 2 * cos2σm * cos2σm))
    );
  } while (Math.abs(λ - λPrev) > 1e-12 && ++iter < 100);
  if (iter >= 100) return null;
  const u2 = cos2α * (a * a - b * b) / (b * b);
  const A = 1 + u2 / 16384 * (4096 + u2 * (-768 + u2 * (320 - 175 * u2)));
  const B = u2 / 1024 * (256 + u2 * (-128 + u2 * (74 - 47 * u2)));
  const Δσ = B * sinσ * (cos2σm + B / 4 * (
    cosσ * (-1 + 2 * cos2σm * cos2σm) -
    B / 6 * cos2σm * (-3 + 4 * sinσ * sinσ) * (-3 + 4 * cos2σm * cos2σm)
  ));
  return (b * A * (σ - Δσ)) / 1000;
}

/** Haversine, km, spherical mean radius. Used for short hike segments only. */
export function haversineKm(lat1, lon1, lat2, lon2) {
  const φ1 = deg2rad(lat1), φ2 = deg2rad(lat2);
  const dφ = φ2 - φ1, dλ = deg2rad(lon2 - lon1);
  const s = Math.sin(dφ / 2) ** 2 + Math.cos(φ1) * Math.cos(φ2) * Math.sin(dλ / 2) ** 2;
  return 2 * MEAN_EARTH_RADIUS_KM * Math.asin(Math.min(1, Math.sqrt(s)));
}

export function distanceKm(lat1, lon1, lat2, lon2) {
  return vincentyKm(lat1, lon1, lat2, lon2) ?? haversineKm(lat1, lon1, lat2, lon2);
}

/** Initial forward azimuth, degrees clockwise from north. */
export function initialBearing(lat1, lon1, lat2, lon2) {
  const φ1 = deg2rad(lat1), φ2 = deg2rad(lat2);
  const Δλ = deg2rad(lon2 - lon1);
  const y = Math.sin(Δλ) * Math.cos(φ2);
  const x = Math.cos(φ1) * Math.sin(φ2) - Math.sin(φ1) * Math.cos(φ2) * Math.cos(Δλ);
  return (rad2deg(Math.atan2(y, x)) + 360) % 360;
}

/**
 * Intermediate point on a great-circle (spherical) at fraction f in [0,1].
 * Used to draw the route. Distances themselves stay on the ellipsoid.
 */
export function interpolateGreatCircle(lat1, lon1, lat2, lon2, f) {
  if (f <= 0) return { lat: lat1, lon: lon1 };
  if (f >= 1) return { lat: lat2, lon: lon2 };
  const φ1 = deg2rad(lat1), λ1 = deg2rad(lon1);
  const φ2 = deg2rad(lat2), λ2 = deg2rad(lon2);
  const d = 2 * Math.asin(Math.min(1, Math.sqrt(
    Math.sin((φ2 - φ1) / 2) ** 2 +
    Math.cos(φ1) * Math.cos(φ2) * Math.sin((λ2 - λ1) / 2) ** 2
  )));
  if (d === 0) return { lat: lat1, lon: lon1 };
  const a = Math.sin((1 - f) * d) / Math.sin(d);
  const b = Math.sin(f * d) / Math.sin(d);
  const x = a * Math.cos(φ1) * Math.cos(λ1) + b * Math.cos(φ2) * Math.cos(λ2);
  const y = a * Math.cos(φ1) * Math.sin(λ1) + b * Math.cos(φ2) * Math.sin(λ2);
  const z = a * Math.sin(φ1) + b * Math.sin(φ2);
  return { lat: rad2deg(Math.atan2(z, Math.sqrt(x * x + y * y))), lon: rad2deg(Math.atan2(y, x)) };
}

export function greatCirclePoints(lat1, lon1, lat2, lon2, n = 128) {
  const pts = [];
  for (let i = 0; i <= n; i++) pts.push(interpolateGreatCircle(lat1, lon1, lat2, lon2, i / n));
  return pts;
}

/**
 * A simple cruise profile used when we do not have a real flight data recorder.
 * ASSUMPTION (labelled on screen): climb to 11 km over the first 15% of the
 * great-circle, cruise at 11 km, descend over the last 15%.
 * Typical jet cruise is 10–12 km; we pick the ICAO tropopause height of 11 km.
 */
export function flightAltitudeKm(progress, cruiseKm = 11) {
  const p = clamp(progress, 0, 1);
  if (p < 0.15) return cruiseKm * smoothstep(0, 0.15, p);
  if (p > 0.85) return cruiseKm * (1 - smoothstep(0.85, 1, p));
  return cruiseKm;
}

/** ICAO ISA temperature in °C at geometric height hKm. */
export function isaTempC(hKm) {
  const h = Math.max(0, hKm);
  if (h <= ISA_TROPOPAUSE_KM) return ISA_SEA_LEVEL_C - ISA_LAPSE_C_PER_KM * h;
  return ISA_TROPOPAUSE_C; // isothermal tropopause in the basic ISA layer
}

/** Hiking air temperature: 15°C at sea level minus 0.65°C per 100 m (same lapse). */
export function hikeTempC(elevM, seaLevelC = ISA_SEA_LEVEL_C) {
  return seaLevelC - (ISA_LAPSE_C_PER_KM / 1000) * elevM;
}

export function clamp(v, a, b) {
  if (!Number.isFinite(v)) return a;
  return Math.max(a, Math.min(b, v));
}
export function lerp(a, b, t) { return a + (b - a) * t; }
export function smoothstep(e0, e1, x) {
  const t = clamp((x - e0) / (e1 - e0), 0, 1);
  return t * t * (3 - 2 * t);
}

export function formatKm(km, digits = 0) {
  if (!Number.isFinite(km)) return "—";
  if (Math.abs(km) < 1e-9) return "0 公里";
  if (km >= 1e6) return (km / 1e6).toFixed(1).replace(/\.0$/, "") + " 百万公里";
  if (km >= 1000) return Math.round(km).toLocaleString("zh-CN") + " 公里";
  if (km >= 10) return km.toFixed(digits).replace(/\.0$/, "") + " 公里";
  if (km >= 1) return km.toFixed(1) + " 公里";
  if (km >= 0.001) return Math.round(km * 1000) + " 米";
  return (km * 1000).toPrecision(2) + " 米";
}

export function formatHours(h) {
  if (!Number.isFinite(h) || h < 0) return "—";
  if (h < 1) return Math.round(h * 60) + " 分钟";
  if (h < 48) {
    const hours = Math.floor(h);
    const mins = Math.round((h - hours) * 60);
    if (mins === 0) return hours + " 小时";
    if (mins === 60) return (hours + 1) + " 小时";
    return hours + " 小时 " + mins + " 分钟";
  }
  const days = h / 24;
  if (days < 14) return days.toFixed(1).replace(/\.0$/, "") + " 天";
  if (days < 60) return Math.round(days) + " 天";
  const months = days / 30.44;
  if (months < 18) return months.toFixed(1).replace(/\.0$/, "") + " 个月";
  const years = days / 365.25;
  return years.toFixed(1).replace(/\.0$/, "") + " 年";
}

export function formatTemp(c) {
  const n = Math.round(c);
  return (n > 0 ? "+" : "") + n + "°C";
}

export function formatNumber(n, digits = 0) {
  return Number(n).toLocaleString("zh-CN", { maximumFractionDigits: digits, minimumFractionDigits: digits });
}

/** Equirectangular projection helpers. */
export function lonLatToXY(lon, lat, w, h, view) {
  const { lon0, lon1, lat0, lat1 } = view;
  const x = ((lon - lon0) / (lon1 - lon0)) * w;
  const y = ((lat1 - lat) / (lat1 - lat0)) * h;
  return { x, y };
}

/** Orthographic globe projection. λ,φ in degrees, R in px, centre lon/lat. */
export function orthographic(lon, lat, cx, cy, R, lonC, latC) {
  const λ = deg2rad(lon - lonC);
  const φ = deg2rad(lat);
  const φ0 = deg2rad(latC);
  const cosc = Math.sin(φ0) * Math.sin(φ) + Math.cos(φ0) * Math.cos(φ) * Math.cos(λ);
  if (cosc < 0) return null;
  const x = cx + R * Math.cos(φ) * Math.sin(λ);
  const y = cy - R * (Math.cos(φ0) * Math.sin(φ) - Math.sin(φ0) * Math.cos(φ) * Math.cos(λ));
  return { x, y, cosc };
}

export function log10(x) { return Math.log(x) / Math.LN10; }
export function pow10(x) { return Math.pow(10, x); }

// Mean Earth diameter = 2 × IUGG mean radius (Moritz 1980) = 12,742.0176 km.
// Commonly rounded to 12,742 km. Equatorial diameter is 2a = 12,756.274 km.
export const EARTH_MEAN_DIAMETER_KM = 2 * MEAN_EARTH_RADIUS_KM;
