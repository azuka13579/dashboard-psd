import { useQuery } from "@tanstack/react-query";

export type MetricKey = "suhu_C" | "kelembapan" | "kecepatan_angin" | "tutupan_awan" | "tekanan";

export type ClusterInfo = {
  id: number;
  nama: string;
  deskripsi: string;
  jumlah: number;
  profil: Record<string, number>;
  kategori_cuaca: Record<string, number>;
};

export type Meta = {
  meta: { tanggal: string; waktu: string; n_baris: number; n_kolom: number; n_provinsi: number; n_kecamatan: number };
  columns: { nama: string; dtype: string; missing: number; unique: number }[];
  eda: {
    describe: Record<string, Record<string, number>>;
    hist: Record<string, { x0: number; x1: number; n: number }[]>;
    corr: { labels: string[]; matrix: number[][] };
    kategori_cuaca: Record<string, number>;
    cuaca: Record<string, number>;
  };
  preprocessing: {
    duplikat: number;
    missing_sebelum: Record<string, number>;
    missing_sesudah: number;
    imputasi: Record<string, number>;
    koordinat_anomali: number;
    koordinat_anomali_aturan?: { provinsi: number; kabupaten: number };
    koordinat_anomali_per_provinsi: Record<string, number>;
    contoh_anomali: { provinsi: string; kecamatan: string; latitude: number; longitude: number }[];
    outlier_iqr: Record<string, number>;
    dropped: Record<string, string>;
    n_akhir: number;
    scaler: string;
  };
  features: MetricKey[];
  feature_labels: string[];
};

export type ModelInfo = {
  k: number;
  features: MetricKey[];
  elbow: { k: number; inertia: number; silhouette: number; dbi: number; chi: number }[];
  silhouette: number;
  dbi: number;
  pca_var: number[];
  clusters: ClusterInfo[];
  centroids: number[][];
  centroids_scaled: number[][];
  idw: {
    k: number;
    p: number;
    loocv: Record<string, Record<string, { rmse: number; mae: number; std: number }>>;
    nn_mean_km: number;
    nn_median_km: number;
  };
};

export type Point = {
  id: number;
  kecamatan: string;
  provinsi: string;
  lat: number;
  lon: number;
  suhu_C: number;
  kelembapan: number;
  kecepatan_angin: number;
  tutupan_awan: number;
  tekanan: number;
  cuaca: string;
  kategori_cuaca: string;
  cluster: number;
};

export type Summary = {
  n: number;
  suhu_C: number;
  suhu_min: number;
  suhu_max: number;
  kelembapan: number;
  kecepatan_angin: number;
  tutupan_awan: number;
  tekanan: number;
  pct_hujan: number;
  lat_min: number;
  lat_max: number;
  lon_min: number;
  lon_max: number;
  clusters: { cluster: number; n: number }[];
  cuaca: { kategori: string; n: number }[];
};

export type ProvinceStat = { provinsi: string; n: number; pct_hujan: number } & Record<MetricKey, number>;
export type RankRow = { kecamatan: string; provinsi: string; nilai: number; cluster: number; lat: number; lon: number };

export type Interpolation = {
  lat: number;
  lon: number;
  values: Record<MetricKey, number>;
  cluster: number;
  cluster_nama: string;
  in_coverage: boolean;
  nearest: {
    kecamatan: string;
    provinsi: string;
    latitude: number;
    longitude: number;
    jarak_km: number;
    bobot: number;
    suhu_C: number;
    cluster: number;
  }[];
  params: { k: number; p: number };
};

export type Insights = {
  wilayah: string;
  insights: { judul: string; isi: string }[];
  rekomendasi: { cluster: number; nama: string; porsi: number; items: { sektor: string; isi: string }[] }[];
};

async function get<T>(path: string, params: Record<string, string | number | undefined> = {}): Promise<T> {
  const qs = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) if (v !== undefined && v !== "") qs.set(k, String(v));
  const res = await fetch(`/api${path}${qs.size ? `?${qs}` : ""}`);
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error ?? `Gagal memuat ${path} (${res.status})`);
  }
  return res.json();
}

const STATIC = { staleTime: Infinity };

export const useMeta = () => useQuery({ queryKey: ["meta"], queryFn: () => get<Meta>("/meta"), ...STATIC });
export const useModel = () => useQuery({ queryKey: ["model"], queryFn: () => get<ModelInfo>("/model"), ...STATIC });
export const usePca = () =>
  useQuery({ queryKey: ["pca"], queryFn: () => get<{ pc1: number; pc2: number; cluster: number; kecamatan: string; provinsi: string }[]>("/pca"), ...STATIC });
export const useProvinces = () => useQuery({ queryKey: ["provinces"], queryFn: () => get<ProvinceStat[]>("/provinces"), ...STATIC });
export const usePoints = (provinsi?: string) =>
  useQuery({ queryKey: ["points", provinsi], queryFn: () => get<Point[]>("/points", { provinsi }), ...STATIC });
export const useSummary = (provinsi?: string) =>
  useQuery({ queryKey: ["summary", provinsi], queryFn: () => get<Summary>("/summary", { provinsi }), ...STATIC });
export const useRanking = (metric: MetricKey, order: "top" | "bottom", provinsi?: string) =>
  useQuery({
    queryKey: ["ranking", metric, order, provinsi],
    queryFn: () => get<RankRow[]>("/ranking", { metric, order, provinsi, n: 10 }),
    ...STATIC,
  });
export const useInsights = (provinsi?: string) =>
  useQuery({ queryKey: ["insights", provinsi], queryFn: () => get<Insights>("/insights", { provinsi }), ...STATIC });
export const useInterpolation = (loc: { lat: number; lon: number } | null) =>
  useQuery({
    queryKey: ["interpolate", loc?.lat, loc?.lon],
    queryFn: () => get<Interpolation>("/interpolate", { lat: loc!.lat, lon: loc!.lon }),
    enabled: !!loc,
    ...STATIC,
  });
