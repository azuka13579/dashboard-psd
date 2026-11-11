import { Elysia, t } from "elysia";
import { cors } from "@elysiajs/cors";
import { join } from "node:path";
import { existsSync } from "node:fs";
import { db, model, METRICS, isMetric, whereProv, type Row } from "./db";
import { interpolate } from "./spatial";
import { buildInsights } from "./insights";

const provQuery = t.Object({ provinsi: t.Optional(t.String()) });

function summary(provinsi?: string) {
  const w = whereProv(provinsi);
  const agg = db
    .query(
      `SELECT COUNT(*) n,
        AVG(suhu_C) suhu_C, MIN(suhu_C) suhu_min, MAX(suhu_C) suhu_max,
        AVG(kelembapan) kelembapan, AVG(kecepatan_angin) kecepatan_angin,
        AVG(tutupan_awan) tutupan_awan, AVG(tekanan) tekanan,
        AVG(kategori_cuaca = 'Rain') * 100 pct_hujan,
        MIN(latitude) lat_min, MAX(latitude) lat_max, MIN(longitude) lon_min, MAX(longitude) lon_max
       FROM kecamatan ${w.sql}`,
    )
    .get(w.params) as { n: number } & Record<string, number>;
  const clusters = db
    .query(`SELECT cluster, COUNT(*) n FROM kecamatan ${w.sql} GROUP BY cluster ORDER BY cluster`)
    .all(w.params) as { cluster: number; n: number }[];
  const cuaca = db
    .query(`SELECT kategori_cuaca kategori, COUNT(*) n FROM kecamatan ${w.sql} GROUP BY kategori_cuaca ORDER BY n DESC`)
    .all(w.params);
  return { ...agg, clusters, cuaca };
}

const app = new Elysia({ prefix: "/api" })
  .use(cors())
  .get("/meta", () => ({
    meta: model.meta,
    columns: model.columns,
    eda: model.eda,
    preprocessing: model.preprocessing,
    features: model.features,
    feature_labels: model.feature_labels,
  }))
  .get("/model", () => ({
    k: model.k,
    features: model.features,
    elbow: model.elbow,
    silhouette: model.silhouette,
    dbi: model.dbi,
    pca_var: model.pca_var,
    clusters: model.clusters,
    centroids: model.centroids,
    centroids_scaled: model.centroids_scaled,
    idw: model.idw,
  }))
  .get("/pca", () => db.query("SELECT pc1, pc2, cluster, kecamatan, provinsi FROM kecamatan").all())
  .get("/metrics", () => METRICS)
  .get("/provinces", () =>
    db
      .query(
        `SELECT provinsi, COUNT(*) n, AVG(suhu_C) suhu_C, AVG(kelembapan) kelembapan,
           AVG(kecepatan_angin) kecepatan_angin, AVG(tutupan_awan) tutupan_awan, AVG(tekanan) tekanan,
           AVG(kategori_cuaca = 'Rain') * 100 pct_hujan
         FROM kecamatan GROUP BY provinsi ORDER BY provinsi`,
      )
      .all(),
  )
  .get(
    "/points",
    ({ query }) => {
      const w = whereProv(query.provinsi);
      return db
        .query(
          `SELECT id_kecamatan id, kecamatan, provinsi, latitude lat, longitude lon, suhu_C, kelembapan,
             kecepatan_angin, tutupan_awan, tekanan, cuaca, kategori_cuaca, cluster
           FROM kecamatan ${w.sql}`,
        )
        .all(w.params);
    },
    { query: provQuery },
  )
  .get("/summary", ({ query }) => summary(query.provinsi), { query: provQuery })
  .get(
    "/ranking",
    ({ query, status }) => {
      const metric = query.metric ?? "suhu_C";
      if (!isMetric(metric)) return status(400, { error: `metric harus salah satu dari ${Object.keys(METRICS).join(", ")}` });
      const order = query.order === "bottom" ? "ASC" : "DESC";
      const n = Math.min(Math.max(Number(query.n ?? 10), 1), 50);
      const w = whereProv(query.provinsi);
      // nama kolom aman karena sudah divalidasi lewat whitelist METRICS
      return db
        .query(
          `SELECT kecamatan, provinsi, "${metric}" nilai, cluster, latitude lat, longitude lon
           FROM kecamatan ${w.sql} ORDER BY nilai ${order}, kecamatan LIMIT ${n}`,
        )
        .all(w.params);
    },
    {
      query: t.Object({
        metric: t.Optional(t.String()),
        order: t.Optional(t.Union([t.Literal("top"), t.Literal("bottom")])),
        n: t.Optional(t.Numeric()),
        provinsi: t.Optional(t.String()),
      }),
    },
  )
  .get(
    "/interpolate",
    ({ query, status }) => {
      const { lat, lon } = query;
      if (lat < -15 || lat > 10 || lon < 90 || lon > 145)
        return status(400, { error: "Koordinat berada di luar wilayah Indonesia" });
      return interpolate(lat, lon, query.k ?? model.idw.k, query.p ?? model.idw.p);
    },
    {
      query: t.Object({
        lat: t.Numeric(),
        lon: t.Numeric(),
        k: t.Optional(t.Numeric({ minimum: 3, maximum: 30 })),
        p: t.Optional(t.Numeric({ minimum: 1, maximum: 4 })),
      }),
    },
  )
  .get(
    "/insights",
    ({ query }) => {
      const scope = summary(query.provinsi);
      const national = query.provinsi ? summary() : scope;
      const w = whereProv(query.provinsi);
      const rows = db.query(`SELECT * FROM kecamatan ${w.sql}`).all(w.params) as Row[];
      return buildInsights(query.provinsi, scope, national, rows);
    },
    { query: provQuery },
  );

// Mode produksi: sajikan hasil build frontend dari ../frontend/dist
const DIST = join(import.meta.dir, "..", "..", "frontend", "dist");
const server = new Elysia()
  .use(app)
  .get("/*", ({ path }) => {
    if (!existsSync(DIST)) return new Response("Frontend belum di-build. Jalankan `bun run build` di folder frontend.", { status: 404 });
    const target = join(DIST, path);
    const file = Bun.file(target);
    const safe = target.startsWith(DIST) && path !== "/";
    return safe && file.size > 0 ? file : Bun.file(join(DIST, "index.html"));
  })
  .listen(Number(process.env.PORT ?? 3000));

console.log(`API berjalan di http://localhost:${server.server?.port}/api`);
