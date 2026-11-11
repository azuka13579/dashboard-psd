import type { MetricKey } from "./api";

/** Warna cluster (sudah divalidasi: lightness, chroma, separasi buta warna, kontras). */
export const CLUSTER_COLORS = ["#B97600", "#4096D8", "#2D5F96"] as const;

export const C = {
  navy: "#0F2A44",
  navy700: "#2D5F96",
  sky: "#4096D8",
  amber: "#B97600",
  ink: "#13202E",
  ink2: "#4B5A6A",
  ink3: "#7A8796",
  line: "#E2E7ED",
  grid: "#EEF1F5",
  surface: "#FFFFFF",
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

/** Ramp sekuensial satu hue (terang -> gelap). Suhu memakai amber, metrik lain memakai biru. */
const RAMPS = {
  warm: ["#F7EBD2", "#E9C27A", "#D29A2C", "#B97600", "#7A4D00"],
  cool: ["#E3EFFA", "#A9CCEC", "#6AA6DC", "#3478BC", "#1A4778"],
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

/** Opsi dasar ECharts agar seluruh grafik konsisten. */
export const baseChart = {
  textStyle: { fontFamily: "IBM Plex Sans, sans-serif", color: C.ink2 },
  grid: { left: 8, right: 16, top: 24, bottom: 8, containLabel: true },
  tooltip: {
    backgroundColor: "#fff",
    borderColor: C.line,
    borderWidth: 1,
    padding: [8, 10],
    textStyle: { color: C.ink, fontSize: 12 },
    extraCssText: "box-shadow:0 6px 18px rgba(15,42,68,.12);border-radius:6px;",
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
  latitude: "Lintang titik pusat kecamatan",
  longitude: "Bujur titik pusat kecamatan",
  suhu_C: "Suhu udara saat pengamatan (°C)",
  suhu_min_C: "Suhu minimum (°C)",
  suhu_max_C: "Suhu maksimum (°C)",
  rentang_suhu: "Selisih suhu maksimum dan minimum (°C)",
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
