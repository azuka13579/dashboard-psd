import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useMeta, useProvinces, type MetricKey } from "../lib/api";
import { C, DICTIONARY, KATEGORI_LABEL, METRICS, METRIC_KEYS, axisStyle, baseChart, fmt } from "../lib/theme";
import { Card, CardTitle, Chart, ErrorBox, Loading, Section, Segmented, Stat, Table } from "../components/ui";

const EDA_VARS: { key: string; label: string; unit: string }[] = [
  { key: "suhu_C", label: "Suhu", unit: "°C" },
  { key: "kelembapan_%", label: "Kelembapan", unit: "%" },
  { key: "tekanan_hPa", label: "Tekanan", unit: "hPa" },
  { key: "kecepatan_angin_m_s", label: "Angin", unit: "m/s" },
  { key: "tutupan_awan_%", label: "Awan", unit: "%" },
  { key: "arah_angin_derajat", label: "Arah Angin", unit: "°" },
  { key: "rentang_suhu", label: "Rentang Suhu", unit: "°C" },
  { key: "visibility_m", label: "Visibility", unit: "m" },
];

export default function Overview() {
  const { data, error, isLoading } = useMeta();
  const provinces = useProvinces();
  const [edaVar, setEdaVar] = useState("suhu_C");
  const [provMetric, setProvMetric] = useState<MetricKey>("suhu_C");

  const histOption = useMemo(() => {
    if (!data) return {};
    const h = data.eda.hist[edaVar] ?? [];
    const d = Math.abs(h[0]!.x1 - h[0]!.x0) < 1 ? 2 : 0;
    return {
      ...baseChart,
      tooltip: {
        ...baseChart.tooltip,
        trigger: "axis",
        axisPointer: { type: "shadow", shadowStyle: { color: "rgba(64,150,216,.08)" } },
        formatter: (p: any[]) => {
          const b = h[p[0].dataIndex]!;
          return `${fmt(b.x0, d)} – ${fmt(b.x1, d)}<br/><b>${b.n.toLocaleString("id-ID")}</b> kecamatan`;
        },
      },
      xAxis: { type: "category", data: h.map((b) => fmt((b.x0 + b.x1) / 2, d)), ...axisStyle, axisLabel: { ...axisStyle.axisLabel, hideOverlap: true } },
      yAxis: { type: "value", name: "Jumlah kecamatan", ...axisStyle },
      series: [{ type: "bar", data: h.map((b) => b.n), barCategoryGap: "8%", itemStyle: { color: C.navy700, borderRadius: [3, 3, 0, 0] } }],
    };
  }, [data, edaVar]);

  const corrOption = useMemo(() => {
    if (!data) return {};
    const { labels, matrix } = data.eda.corr;
    const cells = matrix.flatMap((row, i) => row.map((v, j) => [j, i, v]));
    return {
      ...baseChart,
      grid: { left: 8, right: 8, top: 8, bottom: 56, containLabel: true },
      tooltip: { ...baseChart.tooltip, formatter: (p: any) => `${labels[p.value[1]]} × ${labels[p.value[0]]}<br/>r = <b>${fmt(p.value[2], 2)}</b>` },
      xAxis: { type: "category", data: labels, ...axisStyle, axisLabel: { ...axisStyle.axisLabel, rotate: 40, fontSize: 10 }, splitLine: { show: false } },
      yAxis: { type: "category", data: labels, ...axisStyle, axisLabel: { ...axisStyle.axisLabel, fontSize: 10 }, inverse: true, splitLine: { show: false } },
      visualMap: {
        min: -1,
        max: 1,
        orient: "horizontal",
        left: "center",
        bottom: 0,
        itemHeight: 160,
        itemWidth: 10,
        calculable: false,
        text: ["+1", "-1"],
        textStyle: { color: C.ink3, fontSize: 11 },
        inRange: { color: [C.navy700, "#F2F4F7", C.amber] },
      },
      series: [
        {
          type: "heatmap",
          data: cells,
          label: { show: true, fontSize: 9, color: C.ink, formatter: (p: any) => (p.value[2] === 1 ? "" : fmt(p.value[2], 2)) },
          itemStyle: { borderColor: "#fff", borderWidth: 2 },
        },
      ],
    };
  }, [data]);

  const weatherOption = useMemo(() => {
    if (!data) return {};
    const entries = Object.entries(data.eda.cuaca).sort((a, b) => a[1] - b[1]);
    return {
      ...baseChart,
      grid: { left: 8, right: 40, top: 8, bottom: 8, containLabel: true },
      tooltip: { ...baseChart.tooltip, trigger: "item", formatter: (p: any) => `${p.name}<br/><b>${p.value.toLocaleString("id-ID")}</b> kecamatan` },
      xAxis: { type: "value", ...axisStyle, axisLabel: { show: false }, splitLine: { show: false } },
      yAxis: { type: "category", data: entries.map((e) => e[0]), ...axisStyle, axisLabel: { color: C.ink2, fontSize: 12 } },
      series: [
        {
          type: "bar",
          data: entries.map(([k, v]) => ({ value: v, itemStyle: { color: k.includes("hujan") ? C.navy700 : k.includes("cerah") ? C.amber : C.sky } })),
          barWidth: 14,
          itemStyle: { borderRadius: [0, 3, 3, 0] },
          label: { show: true, position: "right", color: C.ink2, fontSize: 11, formatter: (p: any) => p.value.toLocaleString("id-ID") },
        },
      ],
    };
  }, [data]);

  const provOption = useMemo(() => {
    if (!provinces.data) return {};
    const rows = [...provinces.data].sort((a, b) => a[provMetric] - b[provMetric]);
    const m = METRICS[provMetric];
    return {
      ...baseChart,
      grid: { left: 8, right: 48, top: 8, bottom: 8, containLabel: true },
      tooltip: {
        ...baseChart.tooltip,
        trigger: "item",
        formatter: (p: any) => `${p.name}<br/>${m.label}: <b>${fmt(p.value, m.digits)} ${m.unit}</b><br/>${rows[p.dataIndex]!.n} kecamatan`,
      },
      xAxis: { type: "value", ...axisStyle, scale: true, axisLabel: { show: false }, splitLine: { show: false } },
      yAxis: { type: "category", data: rows.map((r) => r.provinsi), ...axisStyle, axisLabel: { color: C.ink2, fontSize: 11 } },
      series: [
        {
          type: "bar",
          data: rows.map((r) => r[provMetric]),
          barWidth: 10,
          itemStyle: { color: m.warm ? C.amber : C.navy700, borderRadius: [0, 3, 3, 0] },
          label: { show: true, position: "right", color: C.ink3, fontSize: 10, formatter: (p: any) => fmt(p.value, m.digits) },
        },
      ],
    };
  }, [provinces.data, provMetric]);

  if (error) return <ErrorBox error={error} />;
  if (isLoading || !data) return <Loading h={600} />;

  const { meta, eda } = data;
  const desc = eda.describe[edaVar]!;
  const edaMeta = EDA_VARS.find((v) => v.key === edaVar)!;
  const kat = eda.kategori_cuaca;
  const totalKat = Object.values(kat).reduce((a, b) => a + b, 0);

  return (
    <div className="space-y-14">
      {/* 01 Project overview */}
      <Section no="01" title="Project Overview" id="overview">
        <div className="grid gap-5 lg:grid-cols-[1.5fr_1fr]">
          <Card className="bg-navy-900! border-navy-900! text-white">
            <p className="text-xs font-medium uppercase tracking-[0.14em] text-sky-500">Judul Proyek</p>
            <h1 className="mt-2 text-[28px] font-semibold leading-tight tracking-tight sm:text-[32px]">
              Zonasi Iklim Mikro Kecamatan di Indonesia Menggunakan K-Means Clustering dan Interpolasi Spasial IDW
            </h1>
            <p className="mt-4 max-w-2xl text-[15px] leading-relaxed text-white/75">
              Dashboard ini mengelompokkan {data.preprocessing.n_akhir.toLocaleString("id-ID")} kecamatan di {meta.n_provinsi} provinsi
              berdasarkan kondisi cuaca aktual, memetakan persebarannya, dan memperkirakan kondisi cuaca di lokasi tertentu
              melalui interpolasi spasial.
            </p>
            <div className="mt-6 flex flex-wrap gap-2 text-xs">
              {["Python · scikit-learn", "SQLite", "Bun + Elysia", "React + ECharts + Leaflet"].map((t) => (
                <span key={t} className="rounded border border-white/15 px-2 py-1 text-white/70">
                  {t}
                </span>
              ))}
            </div>
          </Card>
          <Card>
            <CardTitle title="Tujuan" />
            <ol className="space-y-3 text-sm text-ink-2">
              {[
                "Mengidentifikasi pola dan karakteristik cuaca antar kecamatan di Indonesia melalui eksplorasi data.",
                "Membentuk zona iklim kecamatan berdasarkan kemiripan suhu, kelembapan, tekanan, angin, dan tutupan awan dengan K-Means.",
                "Menyediakan estimasi kondisi cuaca untuk lokasi mana pun memakai interpolasi Inverse Distance Weighting.",
                "Menyusun rekomendasi sektoral (kesehatan, pertanian, kebencanaan) berdasarkan karakter tiap zona.",
              ].map((t, i) => (
                <li key={i} className="flex gap-3">
                  <span className="font-mono text-xs leading-5 text-sky-600">{String(i + 1).padStart(2, "0")}</span>
                  <span className="leading-relaxed">{t}</span>
                </li>
              ))}
            </ol>
          </Card>
        </div>
        <div className="grid gap-5 lg:grid-cols-3">
          <Card className="lg:col-span-2">
            <CardTitle title="Latar Belakang" />
            <div className="space-y-3 text-sm leading-relaxed text-ink-2">
              <p>
                Indonesia memiliki bentang wilayah lebih dari 5.000 km dengan topografi yang sangat beragam, mulai dari pesisir,
                dataran rendah, hingga pegunungan di atas 3.000 mdpl. Akibatnya, kondisi cuaca antar kecamatan pada waktu yang sama
                dapat berbeda jauh, bahkan di dalam satu provinsi.
              </p>
              <p>
                Informasi cuaca umumnya disajikan per kota atau per provinsi, sehingga variasi di tingkat kecamatan kurang terlihat.
                Padahal keputusan di sektor pertanian, kesehatan masyarakat, dan mitigasi bencana banyak diambil di tingkat lokal.
              </p>
              <p>
                Dengan mengelompokkan kecamatan yang memiliki karakter cuaca serupa, pemangku kepentingan dapat menyusun kebijakan
                per zona, bukan sekadar per batas administrasi.
              </p>
            </div>
          </Card>
          <Card>
            <CardTitle title="Alur Analisis" />
            <ol className="relative space-y-4 border-l border-line pl-5 text-sm">
              {[
                ["Data mentah", "CSV cuaca per kecamatan"],
                ["Notebook Python", "EDA, preprocessing, K-Means, evaluasi IDW"],
                ["SQLite + model.json", "Hasil cluster & parameter model"],
                ["Bun + Elysia API", "Filter, peringkat, interpolasi IDW"],
                ["React Dashboard", "Grafik interaktif dan peta"],
              ].map(([a, b]) => (
                <li key={a} className="relative">
                  <span className="absolute -left-[25px] top-1.5 h-2 w-2 rounded-full border-2 border-sky-500 bg-surface" />
                  <p className="font-medium text-ink">{a}</p>
                  <p className="text-xs text-ink-3">{b}</p>
                </li>
              ))}
            </ol>
          </Card>
        </div>
      </Section>

      {/* 02 Data overview */}
      <Section
        no="02"
        title="Data Overview"
        desc={`Data merupakan snapshot cuaca seluruh kecamatan pada satu waktu pengamatan. Setiap baris mewakili satu kecamatan.`}
      >
        <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
          <Stat label="Jumlah baris" value={meta.n_baris.toLocaleString("id-ID")} />
          <Stat label="Jumlah kolom" value={String(meta.n_kolom)} />
          <Stat label="Provinsi" value={String(meta.n_provinsi)} />
          <Stat label="Kecamatan" value={meta.n_kecamatan.toLocaleString("id-ID")} />
          <Stat label="Nilai hilang" value={String(data.columns.reduce((s, c) => s + c.missing, 0))} hint="hanya pada visibility_m" accent="amber" />
          <Stat label="Waktu" value={meta.waktu.slice(0, 5)} hint={meta.tanggal} accent="sky" />
        </div>
        <Card>
          <CardTitle title="Kamus Variabel" sub="Tipe data, jumlah nilai hilang, dan jumlah nilai unik per kolom" />
          <Table
            head={["Kolom", "Deskripsi", "Tipe", "Hilang", "Unik"]}
            align={["l", "l", "l", "r", "r"]}
            rows={data.columns.map((c) => [
              <code className="font-mono text-xs text-navy-800">{c.nama}</code>,
              <span className="text-ink-2">{DICTIONARY[c.nama] ?? "-"}</span>,
              <span className="font-mono text-xs text-ink-3">{c.dtype}</span>,
              c.missing ? <span className="font-medium text-amber-700">{c.missing}</span> : "0",
              c.unique.toLocaleString("id-ID"),
            ])}
          />
        </Card>
      </Section>

      {/* 03 EDA */}
      <Section no="03" title="Exploratory Data Analysis" desc="Distribusi tiap variabel, hubungan antar variabel, kondisi cuaca, dan perbandingan antar provinsi.">
        <Card>
          <CardTitle
            title={`Distribusi ${edaMeta.label}`}
            sub="Histogram 20 kelas untuk seluruh kecamatan"
            right={<Segmented size="sm" value={edaVar} onChange={setEdaVar} options={EDA_VARS.map((v) => ({ value: v.key, label: v.label }))} />}
          />
          <div className="grid gap-6 lg:grid-cols-[1fr_220px]">
            <Chart option={histOption} height={300} />
            <dl className="grid grid-cols-2 content-start gap-x-4 gap-y-3 border-line text-sm lg:grid-cols-1 lg:border-l lg:pl-6">
              {(
                [
                  ["Rata-rata", desc.mean],
                  ["Simpangan baku", desc.std],
                  ["Minimum", desc.min],
                  ["Kuartil 1", desc["25%"]],
                  ["Median", desc["50%"]],
                  ["Kuartil 3", desc["75%"]],
                  ["Maksimum", desc.max],
                ] as [string, number][]
              ).map(([k, v]) => (
                <div key={k} className="flex items-baseline justify-between gap-2">
                  <dt className="text-ink-3">{k}</dt>
                  <dd className="tabular font-medium text-ink">
                    {fmt(v, Math.abs(v) >= 1000 ? 0 : 2)} <span className="text-xs text-ink-3">{edaMeta.unit}</span>
                  </dd>
                </div>
              ))}
            </dl>
          </div>
        </Card>

        <div className="grid gap-5 lg:grid-cols-2">
          <Card>
            <CardTitle title="Matriks Korelasi Pearson" sub="Biru = korelasi negatif, amber = korelasi positif" />
            <Chart option={corrOption} height={420} />
          </Card>
          <Card>
            <CardTitle title="Kondisi Cuaca" sub="Jumlah kecamatan per deskripsi cuaca" />
            <div className="mb-4 grid grid-cols-3 gap-3">
              {Object.entries(kat).map(([k, v]) => (
                <div key={k} className="rounded-md bg-canvas px-3 py-2.5">
                  <p className="text-xs text-ink-3">{KATEGORI_LABEL[k] ?? k}</p>
                  <p className="tabular text-lg font-semibold text-navy-900">
                    {fmt((v / totalKat) * 100, 1)}
                    <span className="text-xs font-medium text-ink-3">%</span>
                  </p>
                </div>
              ))}
            </div>
            <Chart option={weatherOption} height={300} />
          </Card>
        </div>

        <Card>
          <CardTitle
            title="Perbandingan Antar Provinsi"
            sub="Rata-rata per provinsi, diurutkan dari nilai terendah"
            right={
              <Segmented
                size="sm"
                value={provMetric}
                onChange={setProvMetric}
                options={METRIC_KEYS.map((m) => ({ value: m, label: METRICS[m].label }))}
              />
            }
          />
          {provinces.data ? <Chart option={provOption} height={640} /> : <Loading h={640} />}
        </Card>

        <Card className="border-sky-500/30! bg-sky-50!">
          <CardTitle title="Temuan EDA" />
          <ul className="grid gap-3 text-sm leading-relaxed text-ink-2 md:grid-cols-2">
            <li><b className="text-ink">Suhu dan kelembapan berkorelasi negatif kuat (r = -0,70).</b> Wilayah yang lebih panas cenderung lebih kering, sehingga pola ini menjadi pemisah utama antar kelompok.</li>
            <li><b className="text-ink">suhu_min_C dan suhu_max_C hampir identik dengan suhu_C.</b> Ketiganya redundan, jadi cukup satu yang dipakai dalam pemodelan.</li>
            <li><b className="text-ink">rentang_suhu dan visibility_m hampir konstan.</b> Mayoritas bernilai 0 °C dan 10.000 m sehingga tidak membantu membedakan kecamatan.</li>
            <li><b className="text-ink">Suhu sekitar 5 °C muncul di dataran tinggi Papua.</b> Nilai ini valid secara geografis (pegunungan Jayawijaya), bukan kesalahan data.</li>
            <li><b className="text-ink">Hanya {fmt(((kat.Rain ?? 0) / totalKat) * 100, 1)}% kecamatan yang sedang hujan.</b> Sebagian besar wilayah cerah atau berawan, sesuai musim kemarau pada akhir Agustus.</li>
            <li><b className="text-ink">Sulawesi Tengah hanya memiliki 1 kecamatan.</b> Statistik untuk provinsi ini tidak representatif dan perlu dibaca hati-hati.</li>
          </ul>
        </Card>
        <div className="flex justify-end">
          <Link to="/modelling" className="rounded-md bg-navy-900 px-4 py-2 text-sm font-medium text-white hover:bg-navy-800">
            Lanjut ke Preprocessing & Modelling
          </Link>
        </div>
      </Section>
    </div>
  );
}
