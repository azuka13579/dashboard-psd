import { useMemo, useState } from "react";
import { useMeta, useProvinces, type MetricKey } from "../lib/api";
import { C, DICTIONARY, KATEGORI_LABEL, METRICS, METRIC_KEYS, axisStyle, baseChart, fmt } from "../lib/theme";
import { Chart, ErrorBox, KpiStrip, Loading, PageHeader, Panel, PanelHeader, Section, Segmented, Table } from "../components/ui";

const EDA_VARS: { key: string; label: string; unit: string }[] = [
  { key: "suhu_C", label: "Suhu", unit: "°C" },
  { key: "kelembapan_%", label: "Kelembapan", unit: "%" },
  { key: "tekanan_hPa", label: "Tekanan", unit: "hPa" },
  { key: "kecepatan_angin_m_s", label: "Angin", unit: "m/s" },
  { key: "tutupan_awan_%", label: "Awan", unit: "%" },
  { key: "arah_angin_derajat", label: "Arah angin", unit: "°" },
  { key: "rentang_suhu", label: "Rentang suhu", unit: "°C" },
  { key: "visibility_m", label: "Jarak pandang", unit: "m" },
];

const TUJUAN = [
  "Mengidentifikasi pola cuaca antar kecamatan di Indonesia melalui eksplorasi data.",
  "Membentuk zona iklim berdasarkan kemiripan suhu, kelembapan, tekanan, angin, dan tutupan awan dengan K-Means.",
  "Memperkirakan kondisi cuaca di lokasi tanpa data dengan interpolasi Inverse Distance Weighting.",
  "Menyusun rekomendasi sektoral (kesehatan, pertanian, kebencanaan) berdasarkan karakter tiap zona.",
];

const ALUR = [
  ["Data mentah", "CSV cuaca per kecamatan"],
  ["Notebook Python", "EDA, preprocessing, K-Means, evaluasi IDW"],
  ["SQLite + model.json", "Hasil cluster dan parameter model"],
  ["API Bun + Elysia", "Filter, peringkat, interpolasi"],
  ["Dashboard React", "Grafik interaktif dan peta"],
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
      grid: { left: 4, right: 8, top: 28, bottom: 4, containLabel: true },
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
      series: [{ type: "bar", data: h.map((b) => b.n), barCategoryGap: "10%", itemStyle: { color: C.navy700, borderRadius: [3, 3, 0, 0] } }],
    };
  }, [data, edaVar]);

  const corrOption = useMemo(() => {
    if (!data) return {};
    const { labels, matrix } = data.eda.corr;
    const cells = matrix.flatMap((row, i) => row.map((v, j) => [j, i, v]));
    return {
      ...baseChart,
      grid: { left: 4, right: 4, top: 4, bottom: 48, containLabel: true },
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
        itemWidth: 9,
        calculable: false,
        text: ["+1", "-1"],
        textStyle: { color: C.ink3, fontSize: 11 },
        inRange: { color: [C.navy700, "#262A32", C.amber] },
      },
      series: [
        {
          type: "heatmap",
          data: cells,
          label: { show: true, fontSize: 9, color: C.ink, formatter: (p: any) => (p.value[2] === 1 ? "" : fmt(p.value[2], 2)) },
          itemStyle: { borderColor: "#171A20", borderWidth: 2 },
        },
      ],
    };
  }, [data]);

  const weatherOption = useMemo(() => {
    if (!data) return {};
    const entries = Object.entries(data.eda.cuaca).sort((a, b) => a[1] - b[1]);
    return {
      ...baseChart,
      grid: { left: 4, right: 44, top: 4, bottom: 4, containLabel: true },
      tooltip: { ...baseChart.tooltip, trigger: "item", formatter: (p: any) => `${p.name}<br/><b>${p.value.toLocaleString("id-ID")}</b> kecamatan` },
      xAxis: { type: "value", ...axisStyle, axisLabel: { show: false }, splitLine: { show: false } },
      yAxis: { type: "category", data: entries.map((e) => e[0]), ...axisStyle, axisLabel: { color: C.ink2, fontSize: 12 } },
      series: [
        {
          type: "bar",
          data: entries.map(([k, v]) => ({ value: v, itemStyle: { color: k.includes("hujan") ? C.navy700 : k.includes("cerah") ? C.amber : C.sky } })),
          barWidth: 12,
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
      grid: { left: 4, right: 44, top: 4, bottom: 4, containLabel: true },
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
          barWidth: 9,
          itemStyle: { color: m.warm ? C.amber : C.navy700, borderRadius: [0, 3, 3, 0] },
          label: { show: true, position: "right", color: C.ink3, fontSize: 10, formatter: (p: any) => fmt(p.value, m.digits) },
        },
      ],
    };
  }, [provinces.data, provMetric]);

  if (error) return <ErrorBox error={error} />;
  if (isLoading || !data) return <Loading h={600} />;

  const { meta, eda, preprocessing: pre } = data;
  const desc = eda.describe[edaVar]!;
  const edaMeta = EDA_VARS.find((v) => v.key === edaVar)!;
  const kat = eda.kategori_cuaca;
  const totalKat = Object.values(kat).reduce((a, b) => a + b, 0);
  const totalMissing = data.columns.reduce((s, c) => s + c.missing, 0);
  const missingCols = data.columns.filter((c) => c.missing > 0).map((c) => c.nama);

  return (
    <div className="space-y-10">
      <div>
        <PageHeader
          title="Zonasi Iklim Mikro Kecamatan di Indonesia"
       
        />
        <div className="mb-4">
          <KpiStrip
            items={[
              { label: "Kecamatan dianalisis", value: pre.n_akhir.toLocaleString("id-ID"), hint: `dari ${meta.n_baris.toLocaleString("id-ID")} baris data` },
              { label: "Provinsi", value: String(meta.n_provinsi) },
              { label: "Variabel cuaca", value: String(data.features.length), hint: "suhu, kelembapan, tekanan, angin, awan" },
              { label: "Metode", value: "K-Means", hint: "dan interpolasi spasial IDW", accent: "amber" },
              { label: "Waktu pengamatan", value: meta.waktu.slice(0, 5), hint: new Date(meta.tanggal).toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" }) },
            ]}
          />
        </div>
        <div className="grid gap-4 lg:grid-cols-[1.35fr_1fr]">
          <Panel>
            <PanelHeader title="Latar belakang" />
            <div className="max-w-[68ch] space-y-2.5 text-[14px] leading-relaxed text-ink-2">
              <p>
                Indonesia membentang lebih dari 5.000 km dengan topografi yang sangat beragam, dari pesisir dan dataran rendah hingga
                pegunungan di atas 3.000 mdpl. Akibatnya, kondisi cuaca antar kecamatan pada waktu yang sama dapat berbeda jauh, bahkan di
                dalam satu provinsi.
              </p>
              <p>
                Informasi cuaca umumnya disajikan per kota atau per provinsi, sehingga variasi di tingkat kecamatan kurang terlihat. Padahal
                keputusan di sektor pertanian, kesehatan masyarakat, dan mitigasi bencana banyak diambil di tingkat lokal.
              </p>
              <p>
                Dengan mengelompokkan kecamatan yang karakter cuacanya serupa, pemangku kepentingan dapat menyusun kebijakan per zona, bukan
                sekadar per batas administrasi.
              </p>
            </div>
            <div className="mt-4 border-t border-line-2 pt-3">
              <p className="mb-2 text-[12px] font-medium text-ink-3">Alur analisis</p>
              <div className="flex flex-wrap items-center gap-x-1.5 gap-y-1.5 text-[12.5px]">
                {ALUR.map(([a, b], i) => (
                  <span key={a} className="inline-flex items-center gap-1.5">
                    <span title={b} className="rounded-full bg-brand-50 px-2.5 py-0.5 text-brand-700 font-medium">
                      {a}
                    </span>
                    {i < ALUR.length - 1 && (
                      <svg aria-hidden width="12" height="12" viewBox="0 0 12 12" className="text-ink-3">
                        <path d="M4 2l4 4-4 4" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    )}
                  </span>
                ))}
              </div>
            </div>
          </Panel>
          <Panel>
            <PanelHeader title="Tujuan" />
            <ul className="space-y-2 text-[13.5px] leading-relaxed text-ink-2">
              {TUJUAN.map((t) => (
                <li key={t} className="flex gap-2.5">
                  <span aria-hidden className="mt-[7px] h-2 w-2 shrink-0 rounded-full bg-brand-600" />
                  {t}
                </li>
              ))}
            </ul>
          </Panel>
        </div>
      </div>

      <Section title="Data Overview" desc="Snapshot cuaca seluruh kecamatan pada satu waktu pengamatan. Satu baris mewakili satu kecamatan.">
        <KpiStrip
          items={[
            { label: "Jumlah baris", value: meta.n_baris.toLocaleString("id-ID") },
            { label: "Jumlah kolom", value: String(meta.n_kolom) },
            { label: "Provinsi", value: String(meta.n_provinsi) },
            { label: "Kecamatan", value: meta.n_kecamatan.toLocaleString("id-ID") },
            { label: "Nilai kosong", value: String(totalMissing), hint: totalMissing ? missingCols.join(", ") : "Semua kolom terisi" },
            { label: "Waktu pengamatan", value: meta.waktu.slice(0, 5), hint: new Date(meta.tanggal).toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" }) },
          ]}
        />
        <Panel>
          <PanelHeader title="Kamus variabel" sub="Tipe data, jumlah nilai kosong, dan jumlah nilai unik per kolom" />
          <Table
            dense
            head={["Kolom", "Deskripsi", "Tipe", "Kosong", "Unik"]}
            align={["l", "l", "l", "r", "r"]}
            rows={data.columns.map((c) => [
              <code className="font-mono text-[12px] text-brand-700">{c.nama}</code>,
              <span className="text-ink-2">{DICTIONARY[c.nama] ?? "-"}</span>,
              <span className="text-[12px] text-ink-3">{c.dtype}</span>,
              c.missing ? <span className="font-medium text-amber-700">{c.missing}</span> : "0",
              c.unique.toLocaleString("id-ID"),
            ])}
          />
        </Panel>
      </Section>

      <Section title="Exploratory Data Analysis" desc="Distribusi tiap variabel, hubungan antar variabel, kondisi cuaca, dan perbandingan antar provinsi.">
        <Panel>
          <PanelHeader
            title={`Distribusi ${edaMeta.label.toLowerCase()}`}
            sub="Histogram 20 kelas untuk seluruh kecamatan"
            right={<Segmented size="sm" label="Variabel" value={edaVar} onChange={setEdaVar} options={EDA_VARS.map((v) => ({ value: v.key, label: v.label }))} />}
          />
          <div className="grid gap-5 lg:grid-cols-[1fr_200px]">
            <Chart option={histOption} height={280} />
            <dl className="grid grid-cols-2 content-start gap-x-4 gap-y-2 text-[13px] lg:grid-cols-1 lg:border-l lg:border-line-2 lg:pl-5">
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
                  <dd className="tabular font-semibold text-ink">
                    {fmt(v, Math.abs(v) >= 1000 ? 0 : 2)} <span className="text-[11px] font-normal text-ink-3">{edaMeta.unit}</span>
                  </dd>
                </div>
              ))}
            </dl>
          </div>
        </Panel>

        <div className="grid gap-4 lg:grid-cols-2">
          <Panel>
            <PanelHeader title="Matriks korelasi Pearson" sub="Biru untuk korelasi negatif, amber untuk korelasi positif" />
            <Chart option={corrOption} height={400} />
          </Panel>
          <Panel>
            <PanelHeader title="Kondisi cuaca" sub="Jumlah kecamatan per deskripsi cuaca" />
            <div className="mb-3 grid grid-cols-3 divide-x divide-line-2 rounded-md bg-canvas">
              {Object.entries(kat).map(([k, v]) => (
                <div key={k} className="px-3 py-2">
                  <p className="text-[12px] text-ink-3">{KATEGORI_LABEL[k] ?? k}</p>
                  <p className="tabular text-[17px] font-semibold text-ink">
                    {fmt((v / totalKat) * 100, 1)}
                    <span className="text-[12px] font-medium text-ink-3">%</span>
                  </p>
                </div>
              ))}
            </div>
            <Chart option={weatherOption} height={320} />
          </Panel>
        </div>

        <Panel>
          <PanelHeader
            title="Perbandingan antar provinsi"
            sub="Rata-rata per provinsi, diurutkan dari nilai terendah"
            right={
              <Segmented size="sm" label="Metrik" value={provMetric} onChange={setProvMetric} options={METRIC_KEYS.map((m) => ({ value: m, label: METRICS[m].label }))} />
            }
          />
          {provinces.data ? <Chart option={provOption} height={600} /> : <Loading h={600} />}
        </Panel>
      </Section>
    </div>
  );
}
