import { allRows, model, type Row } from "./db";

const R_EARTH = 6371;
const toRad = (d: number) => (d * Math.PI) / 180;

export function haversine(lat1: number, lon1: number, lat2: number, lon2: number) {
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return 2 * R_EARTH * Math.asin(Math.sqrt(a));
}

/** Batas jarak ke kecamatan terdekat; lebih dari ini dianggap di luar jangkauan data. */
const MAX_NEAREST_KM = 60;

/**
 * Inverse Distance Weighting: z(x) = Σ wᵢ·zᵢ / Σ wᵢ, dengan wᵢ = 1 / dᵢ^p,
 * memakai k tetangga terdekat berdasarkan jarak haversine.
 */
export function interpolate(lat: number, lon: number, k = model.idw.k, p = model.idw.p) {
  const nearest = allRows
    .map((r) => ({ r, d: haversine(lat, lon, r.latitude, r.longitude) }))
    .sort((a, b) => a.d - b.d)
    .slice(0, k);

  const values: Record<string, number> = {};
  for (const f of model.features) {
    if (nearest[0]!.d < 0.05) {
      values[f] = nearest[0]!.r[f as keyof Row] as number;
      continue;
    }
    let num = 0;
    let den = 0;
    for (const { r, d } of nearest) {
      const w = 1 / d ** p;
      num += w * (r[f as keyof Row] as number);
      den += w;
    }
    values[f] = num / den;
  }

  const cluster = predictCluster(values);
  const totalW = nearest.reduce((s, n) => s + 1 / Math.max(n.d, 0.05) ** p, 0);

  return {
    lat,
    lon,
    values,
    cluster,
    cluster_nama: model.clusters[cluster]!.nama,
    in_coverage: nearest[0]!.d <= MAX_NEAREST_KM,
    nearest: nearest.map(({ r, d }) => ({
      kecamatan: r.kecamatan,
      provinsi: r.provinsi,
      latitude: r.latitude,
      longitude: r.longitude,
      jarak_km: d,
      bobot: 1 / Math.max(d, 0.05) ** p / totalW,
      suhu_C: r.suhu_C,
      cluster: r.cluster,
    })),
    params: { k, p },
  };
}

/** Prediksi cluster dari centroid K-Means (setelah z-score dengan parameter scaler notebook). */
export function predictCluster(values: Record<string, number>) {
  const x = model.features.map((f, i) => (values[f]! - model.scaler_mean[i]!) / model.scaler_std[i]!);
  let best = 0;
  let bestDist = Infinity;
  model.centroids_scaled.forEach((c, j) => {
    const d = c.reduce((s, ci, i) => s + (x[i]! - ci) ** 2, 0);
    if (d < bestDist) {
      bestDist = d;
      best = j;
    }
  });
  return best;
}
