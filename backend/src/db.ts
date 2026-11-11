import { Database } from "bun:sqlite";
import { join } from "node:path";

const DATA_DIR = join(import.meta.dir, "..", "data");

export const db = new Database(join(DATA_DIR, "weather.db"), { readonly: true });

export type Model = {
  meta: Record<string, string | number>;
  columns: { nama: string; dtype: string; missing: number; unique: number }[];
  eda: Record<string, unknown>;
  preprocessing: Record<string, unknown>;
  features: string[];
  feature_labels: string[];
  scaler_mean: number[];
  scaler_std: number[];
  k: number;
  centroids_scaled: number[][];
  centroids: number[][];
  elbow: { k: number; inertia: number; silhouette: number; dbi: number; chi: number }[];
  silhouette: number;
  dbi: number;
  pca_var: number[];
  clusters: {
    id: number;
    nama: string;
    deskripsi: string;
    jumlah: number;
    profil: Record<string, number>;
    kategori_cuaca: Record<string, number>;
  }[];
  idw: { k: number; p: number; loocv: Record<string, Record<string, { rmse: number; mae: number; std: number }>>; nn_mean_km: number; nn_median_km: number };
};

export const model: Model = await Bun.file(join(DATA_DIR, "model.json")).json();

export type Row = {
  id_kecamatan: number;
  provinsi: string;
  kecamatan: string;
  latitude: number;
  longitude: number;
  suhu_C: number;
  suhu_min_C: number;
  suhu_max_C: number;
  kelembapan: number;
  tekanan: number;
  cuaca: string;
  kategori_cuaca: string;
  kecepatan_angin: number;
  arah_angin_derajat: number;
  tutupan_awan: number;
  visibility_m: number;
  cluster: number;
  pc1: number;
  pc2: number;
};

/** Seluruh data dimuat ke memori sekali (±6.300 baris), dipakai untuk IDW. */
export const allRows = db.query("SELECT * FROM kecamatan").all() as Row[];

export const METRICS = {
  suhu_C: { label: "Suhu", unit: "°C" },
  kelembapan: { label: "Kelembapan", unit: "%" },
  kecepatan_angin: { label: "Kecepatan Angin", unit: "m/s" },
  tutupan_awan: { label: "Tutupan Awan", unit: "%" },
  tekanan: { label: "Tekanan Udara", unit: "hPa" },
} as const;
export type MetricKey = keyof typeof METRICS;
export const isMetric = (m: string): m is MetricKey => m in METRICS;

/** Klausa WHERE opsional untuk filter provinsi. */
export function whereProv(provinsi?: string): { sql: string; params: Record<string, string> } {
  return provinsi
    ? { sql: "WHERE provinsi = $prov", params: { $prov: provinsi } }
    : { sql: "", params: {} };
}
