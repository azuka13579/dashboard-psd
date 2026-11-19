import { useMemo, useState, type ReactNode } from "react";
import { useMeta, useModel, usePca } from "../lib/api";
import { C, CLUSTER_COLORS, KATEGORI_LABEL, METRICS, axisStyle, baseChart, fmt } from "../lib/theme";
import { Chart, ClusterDot, ClusterLegend, ErrorBox, KpiStrip, Loading, PageHeader, Panel, PanelHeader, Section, Segmented, Table } from "../components/ui";

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
      grid: { left: 4, right: 12, top: 16, bottom: 28, containLabel: true },
      tooltip: { ...baseChart.tooltip, trigger: "axis", formatter: (p: any[]) => `K = ${p[0].name}<br/>Inertia: <b>${fmt(p[0].value, 0)}</b>` },
      xAxis: { type: "category", data: m.elbow.map((e) => e.k), name: "Jumlah cluster (K)", nameLocation: "middle", nameGap: 26, ...axisStyle },
      yAxis: { type: "value", ...axisStyle, scale: true },
      series: [
        {
          type: "line",
          data: m.elbow.map((e) => e.inertia),
          lineStyle: { width: 2, color: C.navy700 },
          itemStyle: { color: C.navy700 },
          symbolSize: 7,
          markPoint: {
            symbol: "circle",
            symbolSize: 15,
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
      grid: { left: 4, right: 12, top: 16, bottom: 28, containLabel: true },
      tooltip: { ...baseChart.tooltip, trigger: "axis", formatter: (p: any[]) => `K = ${p[0].name}<br/>Silhouette: <b>${fmt(p[0].value, 3)}</b>` },
      xAxis: { type: "category", data: m.elbow.map((e) => e.k), name: "Jumlah cluster (K)", nameLocation: "middle", nameGap: 26, ...axisStyle },
      yAxis: { type: "value", ...axisStyle, min: 0 },
      series: [
        {
          type: "bar",
          data: m.elbow.map((e) => ({ value: e.silhouette, itemStyle: { color: e.k === m.k ? C.amber : "#C7D3E0" } })),
          barWidth: 16,
          itemStyle: { borderRadius: [3, 3, 0, 0] },
        },
      ],
    };
  }, [m]);

  const pcaOption = useMemo(() => {
    if (!m || !pca.data) return {};
    return {
      ...baseChart,
      grid: { left: 4, right: 12, top: 12, bottom: 28, containLabel: true },
      tooltip: { ...baseChart.tooltip, trigger: "item", formatter: (p: any) => `${p.data[2]}<br/><span style="color:${C.ink3}">${p.data[3]}</span><br/>Zona ${m.clusters[p.seriesIndex]!.nama}` },
      xAxis: { type: "value", name: `PC1 (${fmt(m.pca_var[0]! * 100, 0)}% variansi)`, nameLocation: "middle", nameGap: 24, ...axisStyle },
      yAxis: { type: "value", name: `PC2 (${fmt(m.pca_var[1]! * 100, 0)}%)`, nameLocation: "middle", nameGap: 30, ...axisStyle },
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
      grid: { left: 4, right: 12, top: 12, bottom: 4, containLabel: true },
      tooltip: {
        ...baseChart.tooltip,
        trigger: "axis",
        axisPointer: { type: "shadow", shadowStyle: { color: "rgba(64,150,216,.06)" } },
        formatter: (ps: any[]) =>
          `<b>${ps[0].name}</b><br/>` +
          ps.map((p) => `${p.marker} ${p.seriesName}: z = ${fmt(p.value, 2)} (${fmt(m.centroids[p.seriesIndex]![p.dataIndex]!, 1)})`).join("<br/>"),
      },
      xAxis: { type: "category", data: labels, ...axisStyle, axisLabel: { ...axisStyle.axisLabel, color: C.ink2, fontSize: 11.5 } },
      yAxis: { type: "value", name: "z-score", ...axisStyle },
      series: m.clusters.map((c) => ({
        name: c.nama,
        type: "bar",
        barGap: "12%",
        barMaxWidth: 22,
        itemStyle: { color: CLUSTER_COLORS[c.id], borderRadius: 3 },
        data: m.centroids_scaled[c.id],
      })),
    };
  }, [m]);

  if (meta.error || model.error) return <ErrorBox error={meta.error ?? model.error} />;
  if (!m || !pre || !meta.data) return <Loading h={600} />;

  const loocv = m.idw.loocv[idwP]!;
  const totalRows = meta.data.meta.n_baris;
  const missingTotal = Object.values(pre.missing_sebelum).reduce((a, b) => a + b, 0);
  const code = (s: string) => <code className="font-mono text-[12px] text-navy-800">{s}</code>;

  const steps: { title: string; result: string; body: ReactNode }[] = [
    {
      title: "Pemeriksaan duplikat",
      result: `${pre.duplikat} duplikat`,
      body: <p>Keunikan setiap {code("id_kecamatan")} diperiksa. Tidak ada kecamatan yang tercatat ganda.</p>,
    },
    {
      title: "Penanganan nilai kosong",
      result: missingTotal ? `${missingTotal} nilai diimputasi` : "Tidak ada nilai kosong",
      body: missingTotal ? (
        <p>
          Nilai kosong pada {Object.keys(pre.missing_sebelum).map((k) => code(k))} diisi dengan median karena distribusinya menceng. Setelah
          imputasi, nilai kosong tersisa {pre.missing_sesudah}.
        </p>
      ) : (
        <p>Seluruh kolom sudah terisi pada data revisi, sehingga tidak ada imputasi. Kolom {code("rentang_suhu")} dihitung ulang dari suhu maksimum dikurangi suhu minimum.</p>
      ),
    },
    ...(pre.desimal_diperbaiki
      ? [
          {
            title: "Perbaikan format desimal koordinat",
            result: `${pre.desimal_diperbaiki} lintang dipulihkan`,
            body: (
              <div className="space-y-3">
                <p>
                  Pada file revisi, lintang kecamatan di sekitar khatulistiwa kehilangan angka nol di depan koma sehingga nilainya menjadi 10, 100,
                  atau 1.000 kali lipat. Titiknya bergeser ratusan kilometer, sebagian bahkan ke luar wilayah Indonesia. Baris yang lintangnya
                  tepat kelipatan 10ⁿ dari versi awal dipulihkan ke nilai semula, lalu ikut diperiksa pada langkah validasi koordinat.
                </p>
                {pre.contoh_desimal && (
                  <Table
                    dense
                    head={["Kecamatan", "Lintang di file", "Lintang dipulihkan"]}
                    align={["l", "r", "r"]}
                    rows={pre.contoh_desimal.map((r) => [r.kecamatan, fmt(r.sebelum, 4), fmt(r.sesudah, 4)])}
                  />
                )}
              </div>
            ),
          },
        ]
      : []),
    {
      title: "Validasi koordinat spasial",
      result: `${pre.koordinat_anomali} baris dibuang`,
      body: (
        <div className="space-y-3">
          <p>
            Sebagian kecamatan memiliki koordinat yang salah geocoding, misalnya kecamatan di Cirebon yang titiknya jatuh di Sumatera Selatan atau
            kecamatan di Surabaya yang jatuh di Laut Jawa. Titik dianggap anomali jika memenuhi salah satu aturan:
          </p>
          <ul className="list-disc space-y-1 pl-5">
            <li>
              <b className="font-semibold text-ink">Aturan provinsi ({pre.koordinat_anomali_aturan?.provinsi ?? "-"} titik):</b> tidak ada dari 10
              tetangga terdekat yang berasal dari provinsi yang sama, atau jarak ke pusat provinsi melebihi Q3 + 3×IQR.
            </li>
            <li>
              <b className="font-semibold text-ink">Aturan kabupaten ({pre.koordinat_anomali_aturan?.kabupaten ?? "-"} titik):</b> jarak ke median
              lokasi kabupaten lebih dari 0,5° dan lebih dari 4 kali median jarak di kabupaten tersebut.
            </li>
          </ul>
          <Table
            dense
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
        <div className="space-y-2.5">
          <p>
            Outlier dideteksi dengan aturan 1,5×IQR, tetapi tetap dipertahankan karena valid secara geografis (suhu rendah di pegunungan, angin
            kencang di pesisir) dan justru menjadi ciri zona iklim.
          </p>
          <div className="flex flex-wrap gap-1.5">
            {Object.entries(pre.outlier_iqr).map(([k, v]) => (
              <span key={k} className="rounded bg-canvas px-2 py-0.5 text-[12px] text-ink-2">
                {k} <b className="tabular font-semibold text-ink">{v}</b>
              </span>
            ))}
          </div>
        </div>
      ),
    },
    {
      title: "Seleksi fitur",
      result: `${m.features.length} fitur dipakai`,
      body: (
        <div className="space-y-3">
          <div className="flex flex-wrap gap-1.5">
            {meta.data.feature_labels.map((f) => (
              <span key={f} className="rounded border border-sky-500/40 bg-sky-50 px-2 py-0.5 font-mono text-[12px] text-navy-800">
                {f}
              </span>
            ))}
          </div>
          <Table dense head={["Kolom tidak dipakai", "Alasan"]} rows={Object.entries(pre.dropped).map(([k, v]) => [code(k), <span className="text-ink-2">{v}</span>])} />
        </div>
      ),
    },
    {
      title: "Standardisasi",
      result: "StandardScaler",
      body: (
        <p>
          Kelima fitur diubah menjadi z-score {code("(x − μ) / σ")}. Tanpa langkah ini, tekanan udara (sekitar 1.013 hPa) akan mendominasi jarak
          Euclidean dibanding kecepatan angin (sekitar 3 m/s).
        </p>
      ),
    },
  ];

  return (
    <div className="space-y-10">
      <div>
      <PageHeader
        title="Preprocessing & Modelling"
        desc="Penyiapan data dan pembentukan zona iklim dengan K-Means. Seluruh proses dijalankan di notebook notebooks/clustering.ipynb, lalu hasilnya disimpan ke SQLite."
      />
      <div>
        <KpiStrip
          items={[
            { label: "Data awal", value: totalRows.toLocaleString("id-ID"), unit: "baris" },
            { label: "Dibuang", value: String(totalRows - pre.n_akhir), unit: "baris", hint: `${fmt(((totalRows - pre.n_akhir) / totalRows) * 100, 1)}% dari data awal`, accent: "amber" },
            { label: "Data akhir", value: pre.n_akhir.toLocaleString("id-ID"), unit: "baris" },
            { label: "Fitur model", value: String(m.features.length), unit: "variabel" },
            { label: "Jumlah zona", value: String(m.k), unit: "cluster", hint: `silhouette ${fmt(m.silhouette, 3)}` },
          ]}
        />
      </div>
      </div>

      <Section title="Data Preprocessing" desc="Tahapan pembersihan dan penyiapan data sebelum clustering, berurutan dari atas ke bawah.">
        <Panel pad={false} className="overflow-hidden">
          <ol>
            {steps.map((s) => (
              <li key={s.title} className="grid border-b border-line-2 last:border-0 md:grid-cols-[230px_1fr]">
                <div className="bg-navy-50 px-4 py-3.5 md:border-r md:border-line-2">
                  <h3 className="text-[14px] font-semibold text-navy-900">{s.title}</h3>
                  <p className="mt-1 inline-block rounded bg-navy-900 px-1.5 py-0.5 text-[11.5px] font-medium text-white">{s.result}</p>
                </div>
                <div className="max-w-[85ch] px-4 py-3.5 text-[13.5px] leading-relaxed text-ink-2">{s.body}</div>
              </li>
            ))}
          </ol>
        </Panel>
      </Section>

      <Section
        title="Modelling: K-Means Clustering"
        desc="K-Means mengelompokkan kecamatan berdasarkan jarak Euclidean pada lima fitur yang sudah distandardisasi. Nilai K dipilih dengan metode Elbow dan Silhouette."
      >
        <KpiStrip
          items={[
            { label: "Jumlah cluster", value: String(m.k), unit: "zona" },
            { label: "Silhouette score", value: fmt(m.silhouette, 3), hint: "-1 sampai 1, makin tinggi makin baik" },
            { label: "Davies-Bouldin", value: fmt(m.dbi, 3), hint: "makin rendah makin baik" },
            { label: "Variansi PCA 2D", value: fmt((m.pca_var[0]! + m.pca_var[1]!) * 100, 0), unit: "%", hint: "dijelaskan PC1 dan PC2" },
          ]}
        />
        <div className="grid gap-4 lg:grid-cols-2">
          <Panel>
            <PanelHeader title="Metode Elbow" sub="Inertia (within-cluster sum of squares) untuk K = 2 sampai 10" />
            <Chart option={elbowOption} height={240} />
          </Panel>
          <Panel>
            <PanelHeader title="Silhouette score" sub="Kualitas pemisahan cluster untuk tiap nilai K" />
            <Chart option={silOption} height={240} />
          </Panel>
        </div>
        <Panel>
          <div className="grid gap-6 lg:grid-cols-[1fr_1.3fr]">
            <div>
              <PanelHeader title="Mengapa K = 3" />
              <div className="space-y-2.5 text-[13.5px] leading-relaxed text-ink-2">
                <p>
                  Penurunan inertia terbesar terjadi dari K = 2 ke K = 3, lalu penurunannya terus mengecil. K = 2 memang memiliki silhouette
                  tertinggi, tetapi hanya memisahkan wilayah panas dan sejuk sehingga kurang informatif.
                </p>
                <p>
                  K = 3 memisahkan wilayah sejuk menjadi dua karakter berbeda, yaitu yang cerah dan yang berawan atau hujan. Pembagian ini relevan
                  untuk rekomendasi kebencanaan dan pertanian, dengan silhouette yang tetap wajar ({fmt(m.silhouette, 2)}).
                </p>
              </div>
            </div>
            <Table
              dense
              head={["K", "Inertia", "Silhouette", "Davies-Bouldin", "Calinski-Harabasz"]}
              align={["l", "r", "r", "r", "r"]}
              rows={m.elbow.map((e) => [
                <span className={e.k === m.k ? "font-semibold text-amber-700" : ""}>
                  {e.k}
                  {e.k === m.k ? " (dipilih)" : ""}
                </span>,
                fmt(e.inertia, 0),
                fmt(e.silhouette, 3),
                fmt(e.dbi, 3),
                fmt(e.chi, 0),
              ])}
            />
          </div>
        </Panel>

        <div className="grid gap-4 lg:grid-cols-2">
          <Panel>
            <PanelHeader title="Proyeksi PCA hasil cluster" sub="Setiap titik adalah satu kecamatan" right={<ClusterLegend clusters={m.clusters} />} />
            {pca.data ? <Chart option={pcaOption} height={340} /> : <Loading h={340} />}
          </Panel>
          <Panel>
            <PanelHeader title="Profil centroid" sub="Posisi pusat cluster dalam satuan z-score" right={<ClusterLegend clusters={m.clusters} />} />
            <Chart option={centroidOption} height={340} />
          </Panel>
        </div>

        <Panel>
          <PanelHeader title="Karakteristik zona" sub="Rata-rata fitur dan komposisi cuaca aktual tiap cluster" />
          <div className="overflow-x-auto rounded-md border border-line-2 [&_td:first-child]:pl-3">
            <table className="w-full min-w-[640px] text-[13px]">
              <thead>
                <tr className="bg-navy-900 text-left text-white">
                  <th className="w-[180px] py-2.5 pl-3 pr-3 text-[12px] font-medium text-sky-100/75">Fitur</th>
                  {m.clusters.map((c) => (
                    <th key={c.id} className="px-3 py-2.5 text-right">
                      <span className="inline-flex items-center gap-1.5 font-semibold">
                        <ClusterDot id={c.id} onDark />
                        {c.nama}
                      </span>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                <tr className="border-b border-line-2">
                  <td className="py-2 pr-3 text-ink-2">Jumlah kecamatan</td>
                  {m.clusters.map((c) => (
                    <td key={c.id} className="tabular px-3 py-2 text-right font-semibold">
                      {c.jumlah.toLocaleString("id-ID")}
                    </td>
                  ))}
                </tr>
                {m.features.map((f) => (
                  <tr key={f} className="border-b border-line-2">
                    <td className="py-2 pr-3 text-ink-2">{METRICS[f].label}</td>
                    {m.clusters.map((c) => (
                      <td key={c.id} className="tabular px-3 py-2 text-right">
                        {fmt(c.profil[f], METRICS[f].digits)} <span className="text-[11px] text-ink-3">{METRICS[f].unit}</span>
                      </td>
                    ))}
                  </tr>
                ))}
                {(["Clear", "Clouds", "Rain"] as const).map((k) => (
                  <tr key={k} className="border-b border-line-2 last:border-0">
                    <td className="py-2 pr-3 text-ink-2">Sedang {KATEGORI_LABEL[k]!.toLowerCase()}</td>
                    {m.clusters.map((c) => {
                      const total = Object.values(c.kategori_cuaca).reduce((a, b) => a + b, 0);
                      return (
                        <td key={c.id} className="tabular px-3 py-2 text-right">
                          {fmt(((c.kategori_cuaca[k] ?? 0) / total) * 100, 0)}%
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <dl className="mt-4 grid gap-4 border-t border-line-2 pt-3 md:grid-cols-3">
            {m.clusters.map((c) => (
              <div key={c.id}>
                <dt className="flex items-center gap-1.5 text-[13px] font-semibold text-ink">
                  <ClusterDot id={c.id} />
                  {c.nama}
                </dt>
                <dd className="mt-1 text-[13px] leading-relaxed text-ink-2">{c.deskripsi}</dd>
              </div>
            ))}
          </dl>
        </Panel>

        <Panel>
          <PanelHeader
            title="Evaluasi interpolasi spasial (IDW)"
            sub={`Leave-One-Out Cross Validation dengan ${m.idw.k} tetangga terdekat, dipakai pada fitur Cek Lokasimu`}
            right={
              <Segmented
                size="sm"
                label="Pangkat IDW"
                value={idwP}
                onChange={setIdwP}
                options={Object.keys(m.idw.loocv).map((p) => ({ value: p, label: `p = ${p}` }))}
              />
            }
          />
          <div className="grid gap-6 lg:grid-cols-[1.3fr_1fr]">
            <Table
              dense
              head={["Variabel", "RMSE", "MAE", "Simpangan baku data", "RMSE / std"]}
              align={["l", "r", "r", "r", "r"]}
              rows={m.features.map((f) => {
                const r = loocv[f]!;
                return [
                  METRICS[f].label,
                  `${fmt(r.rmse, 2)} ${METRICS[f].unit}`,
                  `${fmt(r.mae, 2)} ${METRICS[f].unit}`,
                  `${fmt(r.std, 2)} ${METRICS[f].unit}`,
                  <span className="font-semibold text-navy-700">{fmt((r.rmse / r.std) * 100, 0)}%</span>,
                ];
              })}
            />
            <div className="space-y-2.5 text-[13.5px] leading-relaxed text-ink-2">
              <p className="rounded-md bg-navy-900 px-3 py-2.5 font-mono text-[12.5px] text-white">ẑ(x) = Σ wᵢ·zᵢ / Σ wᵢ, &nbsp; wᵢ = 1 / dᵢᵖ</p>
              <p>
                Setiap kecamatan diprediksi dari {m.idw.k} tetangga terdekatnya tanpa memakai nilainya sendiri. Galat suhu (RMSE{" "}
                {fmt(m.idw.loocv["2"]!.suhu_C!.rmse, 2)} °C) jauh lebih kecil dari variasi suhu antar kecamatan ({fmt(m.idw.loocv["2"]!.suhu_C!.std, 2)} °C),
                artinya cuaca memiliki autokorelasi spasial yang kuat dan IDW layak dipakai.
              </p>
              <p>
                Jarak rata-rata ke kecamatan terdekat {fmt(m.idw.nn_mean_km, 1)} km (median {fmt(m.idw.nn_median_km, 1)} km). Pangkat p = 2 dipakai
                sebagai nilai default.
              </p>
            </div>
          </div>
        </Panel>
      </Section>
    </div>
  );
}
