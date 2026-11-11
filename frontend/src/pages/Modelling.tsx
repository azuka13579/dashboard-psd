import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useMeta, useModel, usePca } from "../lib/api";
import { C, CLUSTER_COLORS, KATEGORI_LABEL, METRICS, axisStyle, baseChart, fmt } from "../lib/theme";
import { Card, CardTitle, Chart, ClusterDot, ClusterLegend, ErrorBox, Loading, Section, Segmented, Stat, Table } from "../components/ui";

export default function Modelling() {
  const meta = useMeta();
  const model = useModel();
  const pca = usePca();
  const [idwP, setIdwP] = useState("2");

  const m = model.data;
  const pre = meta.data?.preprocessing;

  const elbowOption = useMemo(() => {
    if (!m) return {};
    return {
      ...baseChart,
      tooltip: { ...baseChart.tooltip, trigger: "axis", formatter: (p: any[]) => `K = ${p[0].name}<br/>Inertia: <b>${fmt(p[0].value, 0)}</b>` },
      xAxis: { type: "category", data: m.elbow.map((e) => e.k), name: "Jumlah cluster (K)", nameLocation: "middle", nameGap: 28, ...axisStyle },
      yAxis: { type: "value", ...axisStyle, scale: true },
      series: [
        {
          type: "line",
          data: m.elbow.map((e) => e.inertia),
          lineStyle: { width: 2, color: C.navy700 },
          itemStyle: { color: C.navy700 },
          symbolSize: 8,
          markPoint: {
            symbol: "circle",
            symbolSize: 16,
            itemStyle: { color: "transparent", borderColor: C.amber, borderWidth: 2.5 },
            data: [{ coord: [String(m.k), m.elbow.find((e) => e.k === m.k)!.inertia] }],
            label: { show: false },
          },
        },
      ],
    };
  }, [m]);

  const silOption = useMemo(() => {
    if (!m) return {};
    return {
      ...baseChart,
      tooltip: { ...baseChart.tooltip, trigger: "axis", formatter: (p: any[]) => `K = ${p[0].name}<br/>Silhouette: <b>${fmt(p[0].value, 3)}</b>` },
      xAxis: { type: "category", data: m.elbow.map((e) => e.k), name: "Jumlah cluster (K)", nameLocation: "middle", nameGap: 28, ...axisStyle },
      yAxis: { type: "value", ...axisStyle, min: 0 },
      series: [
        {
          type: "bar",
          data: m.elbow.map((e) => ({ value: e.silhouette, itemStyle: { color: e.k === m.k ? C.amber : "#C7D3E0" } })),
          barWidth: 18,
          itemStyle: { borderRadius: [3, 3, 0, 0] },
        },
      ],
    };
  }, [m]);

  const pcaOption = useMemo(() => {
    if (!m || !pca.data) return {};
    return {
      ...baseChart,
      grid: { left: 8, right: 16, top: 16, bottom: 32, containLabel: true },
      tooltip: { ...baseChart.tooltip, trigger: "item", formatter: (p: any) => `${p.data[2]}<br/><span style="color:${C.ink3}">${p.data[3]}</span><br/>Zona: ${m.clusters[p.seriesIndex]!.nama}` },
      xAxis: { type: "value", name: `PC1 (${fmt(m.pca_var[0]! * 100, 0)}% variansi)`, nameLocation: "middle", nameGap: 26, ...axisStyle },
      yAxis: { type: "value", name: `PC2 (${fmt(m.pca_var[1]! * 100, 0)}%)`, nameLocation: "middle", nameGap: 32, ...axisStyle },
      series: m.clusters.map((c) => ({
        name: c.nama,
        type: "scatter",
        symbolSize: 5,
        large: true,
        itemStyle: { color: CLUSTER_COLORS[c.id], opacity: 0.6 },
        emphasis: { itemStyle: { opacity: 1, borderColor: "#fff", borderWidth: 1 } },
        data: pca.data.filter((p) => p.cluster === c.id).map((p) => [p.pc1, p.pc2, p.kecamatan, p.provinsi]),
      })),
    };
  }, [m, pca.data]);

  const centroidOption = useMemo(() => {
    if (!m) return {};
    const labels = m.features.map((f) => METRICS[f].label);
    return {
      ...baseChart,
      grid: { left: 8, right: 16, top: 16, bottom: 8, containLabel: true },
      tooltip: {
        ...baseChart.tooltip,
        trigger: "axis",
        axisPointer: { type: "shadow", shadowStyle: { color: "rgba(64,150,216,.06)" } },
        formatter: (ps: any[]) =>
          `<b>${ps[0].name}</b><br/>` +
          ps.map((p) => `${p.marker} ${p.seriesName}: z = ${fmt(p.value, 2)} (${fmt(m.centroids[p.seriesIndex]![p.dataIndex]!, 1)})`).join("<br/>"),
      },
      xAxis: { type: "category", data: labels, ...axisStyle, axisLabel: { ...axisStyle.axisLabel, color: C.ink2, fontSize: 12 } },
      yAxis: { type: "value", name: "z-score centroid", ...axisStyle },
      series: m.clusters.map((c) => ({
        name: c.nama,
        type: "bar",
        barGap: "12%",
        barMaxWidth: 26,
        itemStyle: { color: CLUSTER_COLORS[c.id], borderRadius: 3 },
        data: m.centroids_scaled[c.id],
      })),
    };
  }, [m]);

  if (meta.error || model.error) return <ErrorBox error={meta.error ?? model.error} />;
  if (!m || !pre || !meta.data) return <Loading h={600} />;

  const loocv = m.idw.loocv[idwP]!;
  const totalRows = meta.data.meta.n_baris;

  const steps: { title: string; result: string; body: React.ReactNode }[] = [
    {
      title: "Pemeriksaan duplikat",
      result: `${pre.duplikat} duplikat`,
      body: <p>Setiap <code className="font-mono text-xs">id_kecamatan</code> diperiksa keunikannya. Tidak ditemukan kecamatan yang tercatat ganda.</p>,
    },
    {
      title: "Penanganan nilai hilang",
      result: `${Object.values(pre.missing_sebelum).reduce((a, b) => a + b, 0)} nilai diimputasi`,
      body: (
        <p>
          Kolom <code className="font-mono text-xs">visibility_m</code> memiliki {pre.missing_sebelum.visibility_m} nilai kosong dan diisi dengan
          median ({fmt(pre.imputasi.visibility_m, 0)} m). Median dipilih karena distribusinya sangat menceng. Setelah imputasi, nilai hilang
          tersisa {pre.missing_sesudah}.
        </p>
      ),
    },
    {
      title: "Validasi koordinat spasial",
      result: `${pre.koordinat_anomali} baris dibuang`,
      body: (
        <div className="space-y-3">
          <p>
            Sebagian kecamatan memiliki koordinat yang salah geocoding, misalnya kecamatan di Cirebon (Jawa Barat) yang titiknya jatuh di
            Sumatera Selatan, atau kecamatan di Surabaya yang jatuh di Laut Jawa. Sebuah titik dianggap anomali jika memenuhi salah satu
            aturan berikut:
          </p>
          <ul className="list-disc space-y-1 pl-5">
            <li>
              <b className="text-ink">Aturan provinsi ({pre.koordinat_anomali_aturan?.provinsi ?? "-"} titik):</b> tidak ada satu pun dari 10
              tetangga terdekatnya yang berasal dari provinsi yang sama, atau jaraknya ke pusat provinsi melebihi Q3 + 3×IQR.
            </li>
            <li>
              <b className="text-ink">Aturan kabupaten ({pre.koordinat_anomali_aturan?.kabupaten ?? "-"} titik):</b> jaraknya ke median lokasi
              kabupaten (4 digit pertama id_kecamatan) lebih dari 0,5° dan lebih dari 4 kali median jarak di kabupaten tersebut.
            </li>
          </ul>
          <p>
            Baris anomali dibuang agar peta, filter provinsi, dan interpolasi tidak menyesatkan. Sebagian kecil kesalahan yang terkumpul dalam
            satu kabupaten masih bisa lolos, sehingga validasi penuh membutuhkan data koordinat resmi kecamatan (BPS/BIG).
          </p>
          <Table
            head={["Provinsi tercatat", "Kecamatan", "Lintang", "Bujur"]}
            align={["l", "l", "r", "r"]}
            rows={pre.contoh_anomali.slice(0, 5).map((r) => [r.provinsi, r.kecamatan, fmt(r.latitude, 3), fmt(r.longitude, 3)])}
          />
        </div>
      ),
    },
    {
      title: "Deteksi outlier (IQR)",
      result: "Dideteksi, dipertahankan",
      body: (
        <div className="space-y-3">
          <p>
            Outlier dideteksi dengan aturan 1,5×IQR. Nilai ekstrem dipertahankan karena valid secara geografis (suhu rendah di pegunungan,
            angin kencang di pesisir) dan justru menjadi ciri zona iklim.
          </p>
          <div className="flex flex-wrap gap-2">
            {Object.entries(pre.outlier_iqr).map(([k, v]) => (
              <span key={k} className="rounded bg-canvas px-2 py-1 font-mono text-xs text-ink-2">
                {k}: <b className="text-ink">{v}</b>
              </span>
            ))}
          </div>
        </div>
      ),
    },
    {
      title: "Seleksi fitur",
      result: `${m.features.length} fitur terpilih`,
      body: (
        <div className="space-y-3">
          <div className="flex flex-wrap gap-2">
            {meta.data.feature_labels.map((f) => (
              <span key={f} className="rounded border border-sky-500/40 bg-sky-50 px-2 py-1 font-mono text-xs text-navy-800">
                {f}
              </span>
            ))}
          </div>
          <Table
            head={["Kolom tidak dipakai", "Alasan"]}
            rows={Object.entries(pre.dropped).map(([k, v]) => [<code className="font-mono text-xs text-ink-2">{k}</code>, <span className="text-ink-2">{v}</span>])}
          />
        </div>
      ),
    },
    {
      title: "Standardisasi",
      result: "StandardScaler",
      body: (
        <p>
          Kelima fitur diubah menjadi z-score <code className="font-mono text-xs">(x − μ) / σ</code>. Tanpa standardisasi, tekanan udara
          (±1.013 hPa) akan mendominasi perhitungan jarak Euclidean dibanding kecepatan angin (±3 m/s).
        </p>
      ),
    },
  ];

  return (
    <div className="space-y-14">
      {/* 04 Preprocessing */}
      <Section no="04" title="Data Preprocessing" desc="Tahapan pembersihan dan penyiapan data sebelum clustering. Seluruh proses dijalankan di notebook notebooks/clustering.ipynb.">
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          <Stat label="Data awal" value={totalRows.toLocaleString("id-ID")} unit="baris" />
          <Stat label="Dibuang" value={String(totalRows - pre.n_akhir)} unit="baris" hint={`${fmt(((totalRows - pre.n_akhir) / totalRows) * 100, 1)}% dari data`} accent="amber" />
          <Stat label="Data akhir" value={pre.n_akhir.toLocaleString("id-ID")} unit="baris" accent="sky" />
          <Stat label="Fitur model" value={String(m.features.length)} unit="variabel" />
        </div>
        <div className="grid gap-4 lg:grid-cols-2">
          {steps.map((s, i) => (
            <Card key={s.title} className={i === 2 || i === 4 ? "lg:col-span-2" : ""}>
              <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-3">
                  <span className="flex h-6 w-6 items-center justify-center rounded bg-navy-900 font-mono text-xs text-white">{i + 1}</span>
                  <h3 className="text-[15px] font-semibold">{s.title}</h3>
                </div>
                <span className="rounded bg-sky-50 px-2 py-0.5 text-xs font-medium text-navy-700">{s.result}</span>
              </div>
              <div className="text-sm leading-relaxed text-ink-2">{s.body}</div>
            </Card>
          ))}
        </div>
      </Section>

      {/* 05 Modelling */}
      <Section
        no="05"
        title="Modelling: K-Means Clustering"
        desc="K-Means mengelompokkan kecamatan berdasarkan jarak Euclidean pada lima fitur yang sudah distandardisasi. Nilai K dipilih dengan metode Elbow dan Silhouette."
      >
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          <Stat label="Jumlah cluster" value={String(m.k)} unit="zona" accent="amber" />
          <Stat label="Silhouette score" value={fmt(m.silhouette, 3)} hint="rentang -1 sampai 1, makin tinggi makin baik" />
          <Stat label="Davies-Bouldin" value={fmt(m.dbi, 3)} hint="makin rendah makin baik" />
          <Stat label="Variansi PCA 2D" value={fmt((m.pca_var[0]! + m.pca_var[1]!) * 100, 0)} unit="%" hint="dijelaskan oleh PC1 + PC2" accent="sky" />
        </div>
        <div className="grid gap-5 lg:grid-cols-2">
          <Card>
            <CardTitle title="Metode Elbow" sub="Inertia (within-cluster sum of squares) untuk K = 2 sampai 10" />
            <Chart option={elbowOption} height={260} />
          </Card>
          <Card>
            <CardTitle title="Silhouette Score" sub="Kualitas pemisahan cluster per nilai K" />
            <Chart option={silOption} height={260} />
          </Card>
        </div>
        <Card>
          <div className="grid gap-6 lg:grid-cols-[1fr_1.2fr]">
            <div>
              <CardTitle title="Mengapa K = 3?" />
              <div className="space-y-3 text-sm leading-relaxed text-ink-2">
                <p>
                  Penurunan inertia terbesar terjadi dari K = 2 ke K = 3, lalu penurunannya terus mengecil. K = 2 memang memiliki silhouette tertinggi, tetapi
                  hanya memisahkan wilayah "panas" dan "sejuk" sehingga kurang informatif.
                </p>
                <p>
                  K = 3 memisahkan wilayah sejuk menjadi dua karakter berbeda, yaitu yang cerah dan yang berawan atau hujan. Pembagian ini
                  relevan untuk rekomendasi kebencanaan dan pertanian, dengan silhouette yang tetap wajar ({fmt(m.silhouette, 2)}).
                </p>
              </div>
            </div>
            <Table
              head={["K", "Inertia", "Silhouette", "Davies-Bouldin", "Calinski-Harabasz"]}
              align={["l", "r", "r", "r", "r"]}
              rows={m.elbow.map((e) => [
                <span className={e.k === m.k ? "font-semibold text-amber-700" : ""}>{e.k}{e.k === m.k ? " (dipilih)" : ""}</span>,
                fmt(e.inertia, 0),
                fmt(e.silhouette, 3),
                fmt(e.dbi, 3),
                fmt(e.chi, 0),
              ])}
            />
          </div>
        </Card>

        <div className="grid gap-5 lg:grid-cols-2">
          <Card>
            <CardTitle title="Proyeksi PCA Hasil Cluster" sub="Setiap titik adalah satu kecamatan" right={<ClusterLegend clusters={m.clusters} />} />
            {pca.data ? <Chart option={pcaOption} height={360} /> : <Loading h={360} />}
          </Card>
          <Card>
            <CardTitle title="Profil Centroid" sub="Posisi pusat cluster dalam satuan z-score" right={<ClusterLegend clusters={m.clusters} />} />
            <Chart option={centroidOption} height={360} />
          </Card>
        </div>

        <div className="grid gap-5 lg:grid-cols-3">
          {m.clusters.map((c) => {
            const total = Object.values(c.kategori_cuaca).reduce((a, b) => a + b, 0);
            return (
              <Card key={c.id} className="relative overflow-hidden">
                <span className="absolute inset-x-0 top-0 h-1" style={{ background: CLUSTER_COLORS[c.id] }} />
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <ClusterDot id={c.id} size={12} />
                    <h3 className="text-base font-semibold">{c.nama}</h3>
                  </div>
                  <span className="tabular text-sm text-ink-3">{c.jumlah.toLocaleString("id-ID")} kecamatan</span>
                </div>
                <p className="mt-2 min-h-[60px] text-sm leading-relaxed text-ink-2">{c.deskripsi}</p>
                <dl className="mt-4 grid grid-cols-2 gap-x-4 gap-y-2 border-t border-line pt-4 text-sm">
                  {m.features.map((f) => (
                    <div key={f} className="flex justify-between gap-2">
                      <dt className="text-ink-3">{METRICS[f].label}</dt>
                      <dd className="tabular font-medium">
                        {fmt(c.profil[f], METRICS[f].digits)} <span className="text-xs text-ink-3">{METRICS[f].unit}</span>
                      </dd>
                    </div>
                  ))}
                </dl>
                <div className="mt-4">
                  <p className="mb-1.5 text-xs text-ink-3">Komposisi cuaca aktual</p>
                  <div className="flex h-2 gap-[2px] overflow-hidden rounded-sm">
                    {["Clear", "Clouds", "Rain"].map((k) => (
                      <span
                        key={k}
                        style={{ width: `${((c.kategori_cuaca[k] ?? 0) / total) * 100}%`, background: k === "Clear" ? C.amber : k === "Clouds" ? "#A9CCEC" : C.navy700 }}
                      />
                    ))}
                  </div>
                  <div className="mt-1.5 flex gap-3 text-xs text-ink-3">
                    {["Clear", "Clouds", "Rain"].map((k) => (
                      <span key={k} className="tabular">
                        {KATEGORI_LABEL[k]} {fmt(((c.kategori_cuaca[k] ?? 0) / total) * 100, 0)}%
                      </span>
                    ))}
                  </div>
                </div>
              </Card>
            );
          })}
        </div>

        <Card>
          <CardTitle
            title="Evaluasi Interpolasi Spasial (IDW)"
            sub={`Leave-One-Out Cross Validation dengan ${m.idw.k} tetangga terdekat. Dipakai pada fitur Cek Lokasimu di dashboard.`}
            right={
              <Segmented
                size="sm"
                value={idwP}
                onChange={setIdwP}
                options={Object.keys(m.idw.loocv).map((p) => ({ value: p, label: `Pangkat p = ${p}` }))}
              />
            }
          />
          <div className="grid gap-6 lg:grid-cols-[1.3fr_1fr]">
            <Table
              head={["Variabel", "RMSE", "MAE", "Simpangan baku data", "RMSE / std"]}
              align={["l", "r", "r", "r", "r"]}
              rows={m.features.map((f) => {
                const r = loocv[f]!;
                return [
                  METRICS[f].label,
                  `${fmt(r.rmse, 2)} ${METRICS[f].unit}`,
                  `${fmt(r.mae, 2)} ${METRICS[f].unit}`,
                  `${fmt(r.std, 2)} ${METRICS[f].unit}`,
                  <span className="font-medium text-navy-700">{fmt((r.rmse / r.std) * 100, 0)}%</span>,
                ];
              })}
            />
            <div className="space-y-3 text-sm leading-relaxed text-ink-2">
              <p className="rounded-md bg-canvas p-3 font-mono text-xs text-ink">
                ẑ(x) = Σ wᵢ·zᵢ / Σ wᵢ, &nbsp; wᵢ = 1 / dᵢᵖ
              </p>
              <p>
                Setiap kecamatan diprediksi dari {m.idw.k} tetangga terdekatnya tanpa memakai nilainya sendiri. Galat suhu (RMSE{" "}
                {fmt(m.idw.loocv["2"]!.suhu_C!.rmse, 2)} °C) jauh lebih kecil dari variasi suhu antar kecamatan ({fmt(m.idw.loocv["2"]!.suhu_C!.std, 2)} °C).
                Artinya cuaca memiliki autokorelasi spasial yang kuat dan IDW layak dipakai.
              </p>
              <p>
                Jarak rata-rata ke kecamatan terdekat adalah {fmt(m.idw.nn_mean_km, 1)} km (median {fmt(m.idw.nn_median_km, 1)} km). Pangkat
                p = 2 dipakai sebagai nilai default.
              </p>
            </div>
          </div>
        </Card>
        <div className="flex justify-end">
          <Link to="/dashboard" className="rounded-md bg-navy-900 px-4 py-2 text-sm font-medium text-white hover:bg-navy-800">
            Buka Dashboard Utama
          </Link>
        </div>
      </Section>
    </div>
  );
}
