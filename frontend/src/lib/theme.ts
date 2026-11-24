import type { MetricKey } from "./api";

/** Warna cluster untuk latar gelap: amber (Panas-Kering), toska (Sejuk-Cerah), biru (Lembap-Berawan). */
export const CLUSTER_COLORS = ["#E2A33B", "#34C6B6", "#5C8DF0"] as const;

export const C = {
  navy: "#0B0D10",
  navy700: "#5C8DF0",
  brand: "#3F9CF5",
  brandSoft: "rgba(63,156,245,0.35)",
  teal: "#34C6B6",
  sky: "#5AAEF8",
  amber: "#E2A33B",
  ink: "#EEF2F7",
  ink2: "#AEB8C6",
  ink3: "#7F8A99",
  line: "rgba(255,255,255,0.10)",
  grid: "rgba(255,255,255,0.06)",
  surface: "#171A20",
};

export const METRICS: Record<MetricKey, { label: string; unit: string; digits: number; warm?: boolean }> = {
  suhu_C: { label: "Suhu", unit: "°C", digits: 1, warm: true },
  kelembapan: { label: "Kelembapan", unit: "%", digits: 0 },
  kecepatan_angin: { label: "Kecepatan Angin", unit: "m/s", digits: 2 },
  tutupan_awan: { label: "Tutupan Awan", unit: "%", digits: 0 },
  tekanan: { label: "Tekanan Udara", unit: "hPa", digits: 0 },
};
export const METRIC_KEYS = Object.keys(METRICS) as MetricKey[];

export const fmt = (v: number | undefined, d = 1) =>
  v === undefined || Number.isNaN(v)
    ? "-"
    : v.toLocaleString("id-ID", { minimumFractionDigits: d, maximumFractionDigits: d });

export const fmtMetric = (m: MetricKey, v: number | undefined) => `${fmt(v, METRICS[m].digits)} ${METRICS[m].unit}`;

export const titleCase = (s: string) => s.toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase());

/** Ramp sekuensial satu hue untuk latar gelap: nilai rendah redup, nilai tinggi terang. */
const RAMPS = {
  warm: ["#5E4214", "#8E6118", "#BF8424", "#E2A33B", "#F7D58C"],
  cool: ["#1F3A66", "#2B5D9C", "#3F86D2", "#6AB0F5", "#B4DAFC"],
};

function hexToRgb(h: string) {
  const n = parseInt(h.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

export function rampColor(metric: MetricKey, t: number) {
  const ramp = METRICS[metric].warm ? RAMPS.warm : RAMPS.cool;
  const x = Math.min(Math.max(t, 0), 1) * (ramp.length - 1);
  const i = Math.min(Math.floor(x), ramp.length - 2);
  const f = x - i;
  const a = hexToRgb(ramp[i]!);
  const b = hexToRgb(ramp[i + 1]!);
  const c = a.map((v, j) => Math.round(v + (b[j]! - v) * f));
  return `rgb(${c[0]},${c[1]},${c[2]})`;
}
export const rampStops = (metric: MetricKey) => (METRICS[metric].warm ? RAMPS.warm : RAMPS.cool);

/**
 * Batas kelas warna peta per metrik (5 kelas). Dipilih dari sebaran data agar tiap kelas berisi
 * cukup banyak titik, dan dibulatkan supaya mudah dibaca di legenda.
 */
export const METRIC_BREAKS: Record<MetricKey, number[]> = {
  suhu_C: [22, 25, 28, 31],
  kelembapan: [55, 65, 75, 85],
  kecepatan_angin: [1, 2, 4, 6],
  tutupan_awan: [20, 40, 60, 80],
  tekanan: [1011, 1013, 1015, 1017],
};

export function binIndex(metric: MetricKey, v: number) {
  const b = METRIC_BREAKS[metric];
  let i = 0;
  while (i < b.length && v >= b[i]!) i++;
  return i;
}

export const binColor = (metric: MetricKey, v: number) => rampStops(metric)[binIndex(metric, v)]!;

/** Label rentang tiap kelas, mis. "< 22", "22 – 25", "≥ 31". */
export function binLabels(metric: MetricKey) {
  const b = METRIC_BREAKS[metric];
  const f = (x: number) => x.toLocaleString("id-ID");
  return [`< ${f(b[0]!)}`, ...b.slice(0, -1).map((x, i) => `${f(x)} – ${f(b[i + 1]!)}`), `≥ ${f(b[b.length - 1]!)}`];
}

/** Opsi dasar ECharts agar seluruh grafik konsisten. */
export const baseChart = {
  textStyle: { fontFamily: "Creato Display, sans-serif", color: C.ink2 },
  grid: { left: 8, right: 16, top: 24, bottom: 8, containLabel: true },
  tooltip: {
    backgroundColor: "rgba(23,26,32,0.96)",
    borderColor: C.line,
    borderWidth: 1,
    padding: [8, 10],
    textStyle: { color: C.ink, fontSize: 12 },
    extraCssText: "box-shadow:0 10px 24px rgba(0,0,0,.45);border-radius:10px;backdrop-filter:blur(8px);",
  },
};

export const axisStyle = {
  axisLine: { lineStyle: { color: C.line } },
  axisTick: { show: false },
  axisLabel: { color: C.ink3, fontSize: 11 },
  splitLine: { lineStyle: { color: C.grid } },
  nameTextStyle: { color: C.ink3, fontSize: 11 },
};

/** Kamus variabel untuk halaman Data Overview. */
export const DICTIONARY: Record<string, string> = {
  tanggal: "Tanggal pengamatan",
  waktu: "Jam pengamatan",
  id_kecamatan: "Kode wilayah kecamatan (Kemendagri)",
  provinsi: "Nama provinsi",
  kecamatan: "Nama kecamatan",
  latitude: "Lintang titik pusat kecamatan (kolom asli: lat_asli)",
  longitude: "Bujur titik pusat kecamatan (kolom asli: lng_asli)",
  suhu_C: "Suhu udara saat pengamatan (°C)",
  suhu_min_C: "Suhu minimum (°C)",
  suhu_max_C: "Suhu maksimum (°C)",
  rentang_suhu: "Selisih suhu maksimum dan minimum (°C), dihitung ulang",
  "kelembapan_%": "Kelembapan relatif (%)",
  tekanan_hPa: "Tekanan udara permukaan laut (hPa)",
  cuaca: "Deskripsi kondisi cuaca",
  cuaca_numerik: "Kode numerik deskripsi cuaca",
  kategori_cuaca: "Kategori cuaca utama (Clear, Clouds, Rain)",
  kategori_cuaca_numerik: "Kode numerik kategori cuaca",
  kecepatan_angin_m_s: "Kecepatan angin (m/s)",
  arah_angin_derajat: "Arah datang angin (derajat)",
  "tutupan_awan_%": "Persentase tutupan awan (%)",
  visibility_m: "Jarak pandang (meter)",
};

export const KATEGORI_LABEL: Record<string, string> = { Clear: "Cerah", Clouds: "Berawan", Rain: "Hujan" };
