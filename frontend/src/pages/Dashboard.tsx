import { useMemo, useState, type ReactNode } from "react";
import { useInsights, useInterpolation, useMeta, useModel, usePoints, useProvinces, useRanking, useSummary, type MetricKey, type Point } from "../lib/api";
import { useFilters } from "../lib/store";
import { C, CLUSTER_COLORS, METRICS, METRIC_KEYS, axisStyle, baseChart, binIndex, binLabels, fmt, fmtMetric, rampStops, titleCase } from "../lib/theme";
import { Chart, ClusterDot, ErrorBox, Loading, Panel, PanelBar, PanelHeader, Pill, Ring, Section, Segmented } from "../components/ui";
import MapView from "../components/MapView";

const RANK_METRICS: MetricKey[] = ["suhu_C", "kecepatan_angin", "kelembapan", "tutupan_awan"];
const SHORT: Record<MetricKey, string> = { suhu_C: "Suhu", kelembapan: "Lembap", kecepatan_angin: "Angin", tutupan_awan: "Awan", tekanan: "Tekanan" };

const mean = (xs: number[]) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : NaN);

export default function Dashboard() {
  const f = useFilters();
  const model = useModel();
  const provinces = useProvinces();
  const points = usePoints(f.provinsi);
  const allPoints = usePoints(undefined);
  const summary = useSummary(f.provinsi);
  const insights = useInsights(f.provinsi);
  const check = useInterpolation(f.checkLoc);

  const clusterNames = useMemo(() => model.data?.clusters.map((c) => c.nama) ?? [], [model.data]);
  const s = summary.data;
  const wilayah = f.provinsi ?? "Indonesia";

  if (model.error) return <ErrorBox error={model.error} />;

  const totalCluster = model.data?.clusters.reduce((a, c) => a + c.jumlah, 0) || 1;

  return (
    <div className="space-y-7">
      <div className="space-y-4">
        {/* Judul + filter */}
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="text-[24px] font-bold leading-tight text-ink">Dashboard Cuaca</h1>
            <p className="text-[13px] text-ink-3">Kondisi cuaca {points.data ? `${points.data.length.toLocaleString("id-ID")} kecamatan` : "kecamatan"} di {wilayah}</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <select
              aria-label="Provinsi"
              value={f.provinsi ?? ""}
              onChange={(e) => f.setProvinsi(e.target.value || undefined)}
              className="glass h-9 min-w-[210px] rounded-full px-4 text-[13px] font-medium text-ink outline-none transition-colors hover:border-white/20 focus:border-brand-500"
            >
              <option value="">Semua provinsi</option>
              {provinces.data?.map((p) => (
                <option key={p.provinsi} value={p.provinsi}>
                  {p.provinsi} ({p.n})
                </option>
              ))}
            </select>
            <Segmented size="sm" label="Metrik" value={f.metric} onChange={f.setMetric} options={METRIC_KEYS.map((m) => ({ value: m, label: SHORT[m] }))} />
            {f.provinsi && (
              <button onClick={() => f.setProvinsi(undefined)} className="text-[12.5px] font-medium text-brand-700 hover:text-ink">
                Reset
              </button>
            )}
          </div>
        </div>

        {/* Baris 1: kartu cuaca utama + sorotan */}
        <div className="grid grid-cols-1 gap-4 xl:grid-cols-12 [&>*]:min-w-0">
          <HeroWeather s={s} wilayah={wilayah} clusterNames={clusterNames} className="xl:col-span-4" />
          <Panel className="xl:col-span-8">
            <PanelHeader title="Sorotan saat pengamatan" sub={`Rata-rata seluruh kecamatan di ${wilayah}`} />
            <div className="grid gap-3 md:grid-cols-3">
              <WindCard s={s} values={points.data?.map((p) => p.kecepatan_angin)} onClick={() => f.setMetric("kecepatan_angin")} />
              <HumidityGauge s={s} onClick={() => f.setMetric("kelembapan")} />
              <TempArc s={s} onClick={() => f.setMetric("suhu_C")} />
            </div>
            <div className="mt-3 grid gap-3 sm:grid-cols-3">
              <SmallStat label="Tutupan awan" value={s ? fmt(s.tutupan_awan, 0) : "–"} unit="%" note="Rata-rata langit tertutup awan" onClick={() => f.setMetric("tutupan_awan")} />
              <SmallStat label="Tekanan udara" value={s ? fmt(s.tekanan, 0) : "–"} unit="hPa" note="Tekanan permukaan laut" onClick={() => f.setMetric("tekanan")} />
              <SmallStat label="Sedang hujan" value={s ? fmt(s.pct_hujan, 1) : "–"} unit="%" note="Porsi kecamatan saat pengamatan" />
            </div>
          </Panel>
        </div>

        {/* Baris 2: peringkat + peta */}
        <div className="grid grid-cols-1 gap-4 xl:grid-cols-12 [&>*]:min-w-0">
          <div className="xl:col-span-4 xl:min-h-0">
            <Ranking />
          </div>
          <Panel pad={false} className="relative overflow-hidden xl:col-span-8">
            <PanelBar
              title="Peta kondisi cuaca"
              sub="Klik titik mana pun di peta untuk cek lokasi"
              right={
                <Segmented
                  size="sm"
                  label="Warna peta"
                  value={f.colorBy}
                  onChange={f.setColorBy}
                  options={[
                    { value: "cluster", label: "Zona" },
                    { value: "metric", label: METRICS[f.metric].label },
                  ]}
                />
              }
            />
            <div className="relative h-[460px] md:h-[500px]">
              {points.data && model.data ? (
                <>
                  <MapView
                    points={points.data}
                    colorBy={f.colorBy}
                    metric={f.metric}
                    clusterNames={clusterNames}
                    provinsi={f.provinsi}
                    check={check.data}
                    checkLoc={f.checkLoc}
                    focus={f.focus}
                    onPick={(lat, lon) => f.setCheckLoc({ lat, lon })}
                  />
                  <MapLegend
                    colorBy={f.colorBy}
                    metric={f.metric}
                    values={points.data.map((p) => (f.colorBy === "cluster" ? p.cluster : p[f.metric]))}
                    clusters={model.data.clusters}
                  />
                </>
              ) : (
                <div className="h-full p-3">
                  <Loading h={440} />
                </div>
              )}
            </div>
          </Panel>
        </div>

        {/* Baris 3: cek lokasi + distribusi */}
        <div className="grid grid-cols-1 gap-4 xl:grid-cols-12 [&>*]:min-w-0 xl:[&>*>*]:h-full">
          <div className="xl:col-span-4">
            <CheckLocation />
          </div>
          <div className="xl:col-span-8">
            <DistributionCard points={points.data} metric={f.metric} clusters={model.data?.clusters} wilayah={wilayah} />
          </div>
        </div>

        {/* Baris 4: tabel provinsi + komposisi dan rata-rata per zona */}
        <div className="grid grid-cols-1 gap-4 xl:grid-cols-12 [&>*]:min-w-0">
          <div className="xl:col-span-8">
            <ProvinceTable points={allPoints.data} names={clusterNames} selected={f.provinsi} onSelect={(p) => f.setProvinsi(p === f.provinsi ? undefined : p)} />
          </div>
          <div className="grid gap-4 sm:grid-cols-2 xl:col-span-4 xl:grid-cols-1">
            <ZoneDonut s={s} clusters={model.data?.clusters} />
            <ZoneBars points={points.data} all={allPoints.data} metric={f.metric} clusters={model.data?.clusters} filtered={!!f.provinsi} />
          </div>
        </div>
      </div>

      <Section title="Key Insight" desc={`Temuan otomatis untuk ${insights.data?.wilayah ?? wilayah}, menyesuaikan filter provinsi.`}>
        {insights.data ? (
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
            {insights.data.insights.map((it) => (
              <Panel key={it.judul} className="bg-gradient-to-b from-brand-50/70 to-surface">
                <h3 className="text-[13.5px] font-semibold text-brand-800">{it.judul}</h3>
                <p className="mt-1.5 text-[12.5px] leading-relaxed text-ink-2">{it.isi}</p>
              </Panel>
            ))}
          </div>
        ) : (
          <Loading h={150} />
        )}
      </Section>

      <Section title="Kesimpulan dan Rekomendasi">
        <div className="grid gap-4 lg:grid-cols-[1fr_1.5fr]">
          <Panel>
            <PanelHeader title="Kesimpulan" />
            <div className="space-y-3 text-[13px] leading-relaxed text-ink-2">
              <p>
                <b className="font-semibold text-ink">Cuaca kecamatan di Indonesia terbagi menjadi tiga zona.</b> Panas-Kering (
                {fmt(((model.data?.clusters[0]?.jumlah ?? 0) / totalCluster) * 100, 0)}%), Sejuk-Cerah, dan Lembap-Berawan, dengan suhu dan
                kelembapan sebagai pembeda paling kuat.
              </p>
              <p>
                <b className="font-semibold text-ink">Zona tidak mengikuti batas provinsi.</b> Satu provinsi dapat memiliki ketiga zona sekaligus,
                terutama provinsi bergunung seperti Jawa Timur, Bali, dan Papua Tengah, sehingga kebijakan cuaca sebaiknya dirancang per zona.
              </p>
              <p>
                <b className="font-semibold text-ink">Hujan terkonsentrasi di zona Lembap-Berawan.</b> Zona Panas-Kering hampir tidak mengalami
                hujan saat pengamatan, sejalan dengan musim kemarau.
              </p>
              <p>
                <b className="font-semibold text-ink">Interpolasi IDW cukup akurat untuk estimasi lokal.</b> Galat suhu sekitar{" "}
                {fmt(model.data?.idw.loocv["2"]?.suhu_C?.rmse, 1)} °C, sehingga dapat dipakai untuk memperkirakan kondisi di lokasi yang tidak
                memiliki data.
              </p>
            </div>
            <p className="mt-4 border-t border-line-2 pt-3 text-[12px] leading-relaxed text-ink-3">
              Keterbatasan: data hanya mewakili satu waktu pengamatan (siang hari, musim kemarau). Hasil cluster dapat berubah pada musim atau jam
              yang berbeda, sehingga analisis lanjutan sebaiknya memakai data deret waktu.
            </p>
          </Panel>
          <Panel pad={false} className="overflow-hidden">
            <PanelBar title="Rekomendasi per zona" sub={`Zona yang mencakup minimal 10% kecamatan di ${insights.data?.wilayah ?? wilayah}`} />
            {insights.data ? (
              insights.data.rekomendasi.map((r) => (
                <div key={r.cluster} className="border-t border-line-2 px-4 py-3.5 first:border-t-0">
                  <div className="mb-2 flex items-center justify-between gap-3">
                    <span className="inline-flex items-center gap-2 text-[13.5px] font-semibold text-ink">
                      <ClusterDot id={r.cluster} />
                      Zona {r.nama}
                    </span>
                    <Pill tone="neutral">{fmt(r.porsi * 100, 0)}% kecamatan</Pill>
                  </div>
                  <dl className="grid gap-x-5 gap-y-2 md:grid-cols-3">
                    {r.items.map((it) => (
                      <div key={it.sektor}>
                        <dt className="text-[12px] font-semibold text-brand-700">{it.sektor}</dt>
                        <dd className="mt-0.5 text-[12.5px] leading-relaxed text-ink-2">{it.isi}</dd>
                      </div>
                    ))}
                  </dl>
                </div>
              ))
            ) : (
              <div className="p-4">
                <Loading h={260} />
              </div>
            )}
          </Panel>
        </div>
      </Section>
    </div>
  );
}

/* ---------- Kartu cuaca utama dan sorotan ---------- */

type Sum = ReturnType<typeof useSummary>["data"];

const KONDISI: Record<string, string> = { Clear: "Cerah", Clouds: "Berawan", Rain: "Hujan" };

function HeroWeather({ s, wilayah, clusterNames, className = "" }: { s?: Sum; wilayah: string; clusterNames: string[]; className?: string }) {
  const meta = useMeta();
  if (!s) return <Loading h={300} />;
  const kond = [...s.cuaca].sort((a, b) => b.n - a.n)[0];
  const dom = [...s.clusters].sort((a, b) => b.n - a.n)[0];
  const tanggal = meta.data
    ? new Date(meta.data.meta.tanggal).toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" })
    : "";
  return (
    <div className={`glass relative overflow-hidden rounded-2xl p-5 ${className}`}>
      <div aria-hidden className="pointer-events-none absolute -left-16 -top-24 h-72 w-72 rounded-full bg-[radial-gradient(circle,rgba(52,198,182,0.22),transparent_65%)]" />
      <div aria-hidden className="pointer-events-none absolute -bottom-24 -right-10 h-64 w-64 rounded-full bg-[radial-gradient(circle,rgba(63,156,245,0.18),transparent_65%)]" />
      <div className="relative flex h-full flex-col">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-[12.5px] text-ink-3">Rata-rata suhu</p>
            <p className="tabular mt-1 text-[64px] font-light leading-none tracking-tight text-ink">
              {fmt(s.suhu_C, 1)}
              <span className="align-top text-[26px] font-normal text-ink-2">°C</span>
            </p>
          </div>
          {dom && <Ring value={(dom.n / s.n) * 100} label={clusterNames[dom.cluster]} size={86} />}
        </div>
        <p className="mt-3 text-[15px] font-medium text-ink">
          {kond ? `${KONDISI[kond.kategori] ?? kond.kategori} di ${fmt((kond.n / s.n) * 100, 0)}% kecamatan` : ""}
        </p>
        <p className="text-[12.5px] text-ink-3">
          Suhu {fmt(s.suhu_min, 1)} sampai {fmt(s.suhu_max, 1)} °C · cincin: porsi zona dominan
        </p>
        <div className="mt-auto space-y-1.5 border-t border-line pt-3 text-[13px] text-ink-2">
          <p className="flex justify-between gap-3">
            <span className="text-ink-3">Wilayah</span>
            <span className="font-medium text-ink">{wilayah}</span>
          </p>
          <p className="flex justify-between gap-3">
            <span className="text-ink-3">Kecamatan</span>
            <span className="tabular font-medium text-ink">{s.n.toLocaleString("id-ID")}</span>
          </p>
          <p className="flex justify-between gap-3">
            <span className="text-ink-3">Waktu</span>
            <span className="tabular font-medium text-ink">
              {tanggal}, {meta.data?.meta.waktu.slice(0, 5)}
            </span>
          </p>
        </div>
      </div>
    </div>
  );
}

function SubCard({ title, children, onClick }: { title: string; children: ReactNode; onClick?: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={!onClick}
      className="glass-sub flex min-h-[190px] flex-col rounded-2xl p-4 text-left transition-colors duration-150 enabled:hover:bg-white/[0.06] disabled:cursor-default"
    >
      <p className="text-[13px] font-medium text-ink-2">{title}</p>
      {children}
    </button>
  );
}

/** Angin: batang sebaran kecepatan angin, batang yang memuat rata-rata disorot. */
function WindCard({ s, values, onClick }: { s?: Sum; values?: number[]; onClick: () => void }) {
  const B = 16;
  let bars: { h: number; hit: boolean }[] = [];
  if (values?.length && s) {
    const max = Math.max(...values);
    const w = max / B || 1;
    const c = new Array(B).fill(0) as number[];
    for (const v of values) c[Math.min(B - 1, Math.floor(v / w))]++;
    const top = Math.max(...c);
    const hit = Math.min(B - 1, Math.floor(s.kecepatan_angin / w));
    bars = c.map((n, i) => ({ h: Math.max(6, (n / top) * 100), hit: i === hit }));
  }
  return (
    <SubCard title="Kecepatan angin" onClick={onClick}>
      <div className="mt-3 flex h-[78px] items-end gap-[3px]">
        {bars.map((b, i) => (
          <span key={i} className={`flex-1 rounded-full ${b.hit ? "bg-brand-500" : "bg-white/15"}`} style={{ height: `${b.h}%` }} />
        ))}
      </div>
      <div className="mt-auto flex items-end justify-between pt-3">
        <p className="tabular text-[30px] font-semibold leading-none text-ink">
          {s ? fmt(s.kecepatan_angin, 2) : "–"}
          <span className="ml-1 text-[13px] font-normal text-ink-3">m/s</span>
        </p>
        <p className="text-right text-[11px] text-ink-3">sebaran 0 sampai maks.</p>
      </div>
    </SubCard>
  );
}

/** Kelembapan: gauge setengah lingkaran 0-100%. */
function HumidityGauge({ s, onClick }: { s?: Sum; onClick: () => void }) {
  const v = s ? Math.max(0, Math.min(100, s.kelembapan)) : 0;
  const R = 62;
  const len = Math.PI * R;
  return (
    <SubCard title="Kelembapan" onClick={onClick}>
      <div className="relative mx-auto mt-2 w-full max-w-[170px]">
        <svg viewBox="0 0 160 92" className="w-full">
          <defs>
            <linearGradient id="gHum" x1="0" x2="1">
              <stop offset="0" stopColor="#34C6B6" />
              <stop offset="1" stopColor="#3F9CF5" />
            </linearGradient>
          </defs>
          <path d={`M ${80 - R} 82 A ${R} ${R} 0 0 1 ${80 + R} 82`} fill="none" stroke="rgba(255,255,255,0.09)" strokeWidth="13" strokeLinecap="round" />
          <path
            d={`M ${80 - R} 82 A ${R} ${R} 0 0 1 ${80 + R} 82`}
            fill="none"
            stroke="url(#gHum)"
            strokeWidth="13"
            strokeLinecap="round"
            strokeDasharray={`${(v / 100) * len} ${len}`}
          />
          {[0, 50, 100].map((t) => {
            const a = Math.PI * (1 - t / 100);
            return (
              <text key={t} x={80 + (R - 22) * Math.cos(a)} y={82 - (R - 22) * Math.sin(a) + 3} textAnchor="middle" fontSize="8.5" fill="#7F8A99">
                {t}
              </text>
            );
          })}
        </svg>
      </div>
      <p className="tabular mt-auto text-center text-[30px] font-semibold leading-none text-ink">
        {s ? fmt(s.kelembapan, 0) : "–"}
        <span className="ml-1 text-[13px] font-normal text-ink-3">%</span>
      </p>
    </SubCard>
  );
}

/** Suhu: busur dari suhu minimum ke maksimum, titik menunjukkan rata-rata. */
function TempArc({ s, onClick }: { s?: Sum; onClick: () => void }) {
  const R = 60;
  const t = s && s.suhu_max > s.suhu_min ? (s.suhu_C - s.suhu_min) / (s.suhu_max - s.suhu_min) : 0.5;
  const a = Math.PI * (1 - t);
  const x = 80 + R * Math.cos(a);
  const y = 80 - R * Math.sin(a);
  return (
    <SubCard title="Rentang suhu" onClick={onClick}>
      <div className="relative mx-auto mt-2 w-full max-w-[180px]">
        <svg viewBox="0 0 160 96" className="w-full">
          <defs>
            <linearGradient id="gTemp" x1="0" x2="1">
              <stop offset="0" stopColor="#5C8DF0" />
              <stop offset="1" stopColor="#E2A33B" />
            </linearGradient>
          </defs>
          <path d={`M ${80 - R} 80 A ${R} ${R} 0 0 1 ${80 + R} 80`} fill="none" stroke="url(#gTemp)" strokeWidth="2" strokeDasharray="3 5" opacity="0.8" />
          <line x1={x} y1={y} x2={x} y2="80" stroke="rgba(226,163,59,0.35)" strokeWidth="1" />
          <circle cx={x} cy={y} r="9" fill="rgba(226,163,59,0.25)" />
          <circle cx={x} cy={y} r="5" fill="#E2A33B" />
          <rect x={80 - R - 7} y="78" width="14" height="4" rx="2" fill="#5C8DF0" />
          <rect x={80 + R - 7} y="78" width="14" height="4" rx="2" fill="#E2A33B" />
        </svg>
      </div>
      <div className="mt-auto flex items-end justify-between gap-2 pt-1 text-[11.5px]">
        <div>
          <p className="text-[#8fb2f7]">Terendah</p>
          <p className="tabular text-[14px] font-semibold text-ink">{s ? fmt(s.suhu_min, 1) : "–"} °C</p>
        </div>
        <div className="text-center">
          <p className="text-ink-3">Rata-rata</p>
          <p className="tabular text-[14px] font-semibold text-amber-700">{s ? fmt(s.suhu_C, 1) : "–"} °C</p>
        </div>
        <div className="text-right">
          <p className="text-amber-700">Tertinggi</p>
          <p className="tabular text-[14px] font-semibold text-ink">{s ? fmt(s.suhu_max, 1) : "–"} °C</p>
        </div>
      </div>
    </SubCard>
  );
}

function SmallStat({ label, value, unit, note, onClick }: { label: string; value: string; unit: string; note: string; onClick?: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={!onClick}
      className="glass-sub flex items-center justify-between gap-3 rounded-2xl px-4 py-3 text-left transition-colors duration-150 enabled:hover:bg-white/[0.06] disabled:cursor-default"
    >
      <div>
        <p className="text-[12.5px] text-ink-2">{label}</p>
        <p className="tabular mt-0.5 text-[24px] font-semibold leading-none text-ink">
          {value}
          <span className="ml-1 text-[12px] font-normal text-ink-3">{unit}</span>
        </p>
      </div>
      <p className="max-w-[120px] text-right text-[11px] leading-snug text-ink-3">{note}</p>
    </button>
  );
}

/* ---------- Peta ---------- */

function MapLegend({ colorBy, metric, values, clusters }: { colorBy: "cluster" | "metric"; metric: MetricKey; values: number[]; clusters: { id: number; nama: string }[] }) {
  const rows =
    colorBy === "cluster"
      ? clusters.map((c) => ({ color: CLUSTER_COLORS[c.id]!, label: c.nama, n: values.filter((v) => v === c.id).length }))
      : binLabels(metric).map((label, i) => ({ color: rampStops(metric)[i]!, label, n: values.filter((v) => binIndex(metric, v) === i).length }));
  const title = colorBy === "cluster" ? "Zona iklim" : `${METRICS[metric].label} (${METRICS[metric].unit})`;
  return (
    <div className="absolute bottom-6 left-3 z-[1001] min-w-[165px] rounded-lg border border-line bg-[#171a20]/90 backdrop-blur-md px-3 py-2.5 shadow-[0_10px_24px_rgba(0,0,0,0.45)]">
      <p className="mb-1.5 text-[12px] font-semibold text-ink">{title}</p>
      <ul className="space-y-1">
        {rows.map((r) => (
          <li key={r.label} className="flex items-center gap-2 text-[12px] text-ink-2">
            <span aria-hidden className="h-2.5 w-2.5 shrink-0 rounded-full ring-1 ring-navy-900/20" style={{ background: r.color }} />
            <span className="tabular flex-1">{r.label}</span>
            <span className="tabular text-ink-3">{r.n.toLocaleString("id-ID")}</span>
          </li>
        ))}
      </ul>
      <p className="mt-1.5 border-t border-line-2 pt-1.5 text-[10.5px] text-ink-3">Angka kanan: jumlah kecamatan</p>
    </div>
  );
}

/* ---------- Grafik dan tabel ---------- */

function DistributionCard({ points, metric, clusters, wilayah }: { points?: Point[]; metric: MetricKey; clusters?: { id: number; nama: string }[]; wilayah: string }) {
  const m = METRICS[metric];
  const option = useMemo(() => {
    if (!points?.length || !clusters) return null;
    const vals = points.map((p) => p[metric]);
    const min = Math.min(...vals);
    const max = Math.max(...vals);
    const B = 16;
    const w = (max - min) / B || 1;
    const counts = clusters.map(() => new Array(B).fill(0) as number[]);
    for (const p of points) counts[p.cluster]![Math.min(B - 1, Math.floor((p[metric] - min) / w))]++;
    return {
      ...baseChart,
      grid: { left: 4, right: 8, top: 26, bottom: 4, containLabel: true },
      legend: { top: 0, right: 0, itemWidth: 8, itemHeight: 8, icon: "circle", textStyle: { fontSize: 11, color: C.ink2 } },
      tooltip: { ...baseChart.tooltip, trigger: "axis", axisPointer: { type: "shadow", shadowStyle: { color: "rgba(31,99,198,.06)" } } },
      xAxis: {
        type: "category",
        data: Array.from({ length: B }, (_, i) => fmt(min + w * (i + 0.5), m.digits === 0 ? 0 : 1)),
        ...axisStyle,
        axisLabel: { ...axisStyle.axisLabel, hideOverlap: true },
      },
      yAxis: { type: "value", ...axisStyle },
      series: clusters.map((c) => ({
        name: c.nama,
        type: "bar",
        stack: "z",
        barCategoryGap: "18%",
        itemStyle: { color: CLUSTER_COLORS[c.id] },
        data: counts[c.id],
      })),
    };
  }, [points, metric, clusters, m.digits]);
  return (
    <Panel>
      <PanelHeader title={`Distribusi ${m.label.toLowerCase()}`} sub={`Jumlah kecamatan per rentang nilai (${m.unit}) di ${wilayah}`} />
      {option ? <Chart option={option} height={250} /> : <Loading h={250} />}
    </Panel>
  );
}

function ZoneDonut({ s, clusters }: { s?: ReturnType<typeof useSummary>["data"]; clusters?: { id: number; nama: string }[] }) {
  const option = useMemo(() => {
    if (!s || !clusters) return null;
    return {
      ...baseChart,
      tooltip: { ...baseChart.tooltip, trigger: "item", formatter: (p: any) => `${p.name}<br/><b>${p.value.toLocaleString("id-ID")}</b> kecamatan (${fmt(p.percent, 1)}%)` },
      series: [
        {
          type: "pie",
          radius: ["64%", "88%"],
          padAngle: 2,
          itemStyle: { borderRadius: 4 },
          label: { show: false },
          data: clusters.map((c) => ({ name: c.nama, value: s.clusters.find((x) => x.cluster === c.id)?.n ?? 0, itemStyle: { color: CLUSTER_COLORS[c.id] } })),
        },
      ],
    };
  }, [s, clusters]);
  return (
    <Panel>
      <PanelHeader title="Komposisi zona" sub="Porsi kecamatan per cluster" />
      {option && s && clusters ? (
        <div className="flex items-center gap-3">
          <div className="relative w-[118px] shrink-0">
            <Chart option={option} height={118} />
            <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center leading-tight">
              <span className="tabular text-[16px] font-bold text-ink">{s.n.toLocaleString("id-ID")}</span>
              <span className="text-[10px] text-ink-3">kecamatan</span>
            </div>
          </div>
          <ul className="min-w-0 flex-1 space-y-2">
            {clusters.map((c) => {
              const n = s.clusters.find((x) => x.cluster === c.id)?.n ?? 0;
              return (
                <li key={c.id} className="text-[12px]">
                  <div className="flex items-center gap-1.5">
                    <ClusterDot id={c.id} size={8} />
                    <span className="font-medium text-ink">{c.nama}</span>
                  </div>
                  <p className="tabular pl-[14px] text-[11px] text-ink-3">
                    <b className="font-semibold text-ink">{fmt((n / s.n) * 100, 1)}%</b> · {n.toLocaleString("id-ID")} kec.
                  </p>
                </li>
              );
            })}
          </ul>
        </div>
      ) : (
        <Loading h={118} />
      )}
    </Panel>
  );
}

function ZoneBars({ points, all, metric, clusters, filtered }: { points?: Point[]; all?: Point[]; metric: MetricKey; clusters?: { id: number; nama: string }[]; filtered: boolean }) {
  const m = METRICS[metric];
  const option = useMemo(() => {
    if (!points || !all || !clusters) return null;
    const avg = (ps: Point[], id: number) => mean(ps.filter((p) => p.cluster === id).map((p) => p[metric]));
    const short = clusters.map((c) => c.nama.split("-")[0]);
    const series: object[] = [];
    if (filtered)
      series.push({ name: "Nasional", type: "bar", barGap: "15%", barMaxWidth: 18, itemStyle: { color: "rgba(255,255,255,0.22)", borderRadius: [3, 3, 0, 0] }, data: clusters.map((c) => +avg(all, c.id).toFixed(2)) });
    series.push({
      name: filtered ? "Wilayah terpilih" : "Indonesia",
      type: "bar",
      barMaxWidth: 18,
      itemStyle: { borderRadius: [3, 3, 0, 0] },
      label: { show: true, position: "top", fontSize: 10, color: C.ink2, formatter: (p: any) => (Number.isFinite(p.value) ? fmt(p.value, m.digits) : "") },
      data: clusters.map((c) => {
        const v = avg(points, c.id);
        return { value: Number.isFinite(v) ? +v.toFixed(2) : null, itemStyle: { color: CLUSTER_COLORS[c.id] } };
      }),
    });
    return {
      ...baseChart,
      grid: { left: 4, right: 4, top: filtered ? 26 : 18, bottom: 4, containLabel: true },
      legend: filtered ? { top: 0, right: 0, itemWidth: 8, itemHeight: 8, icon: "circle", textStyle: { fontSize: 10.5, color: C.ink2 } } : undefined,
      tooltip: { ...baseChart.tooltip, trigger: "axis", valueFormatter: (v: number) => (v == null ? "-" : `${fmt(v, m.digits)} ${m.unit}`) },
      xAxis: { type: "category", data: short, ...axisStyle, axisLabel: { ...axisStyle.axisLabel, color: C.ink2 } },
      yAxis: { type: "value", ...axisStyle, axisLabel: { ...axisStyle.axisLabel, fontSize: 10 } },
      series,
    };
  }, [points, all, metric, clusters, filtered, m.digits, m.unit]);
  return (
    <Panel>
      <PanelHeader title={`Rata-rata ${SHORT[metric].toLowerCase()} per zona`} sub={filtered ? "Wilayah terpilih dibanding nasional" : `Dalam ${m.unit}`} />
      {option ? <Chart option={option} height={140} /> : <Loading h={140} />}
    </Panel>
  );
}

type SortKey = MetricKey | "hujan" | "n";

function ProvinceTable({ points, names, selected, onSelect }: { points?: Point[]; names: string[]; selected?: string; onSelect: (p: string) => void }) {
  const [sort, setSort] = useState<SortKey>("suhu_C");
  const rows = useMemo(() => {
    if (!points) return [];
    const by = new Map<string, Point[]>();
    for (const p of points) by.set(p.provinsi, [...(by.get(p.provinsi) ?? []), p]);
    return [...by.entries()].map(([prov, ps]) => {
      const cnt = [0, 0, 0];
      for (const p of ps) cnt[p.cluster] = (cnt[p.cluster] ?? 0) + 1;
      const dom = cnt.indexOf(Math.max(...cnt));
      return {
        prov,
        n: ps.length,
        dom,
        hujan: (ps.filter((p) => p.kategori_cuaca === "Rain").length / ps.length) * 100,
        suhu_C: mean(ps.map((p) => p.suhu_C)),
        kelembapan: mean(ps.map((p) => p.kelembapan)),
        kecepatan_angin: mean(ps.map((p) => p.kecepatan_angin)),
        tutupan_awan: mean(ps.map((p) => p.tutupan_awan)),
        tekanan: mean(ps.map((p) => p.tekanan)),
      };
    });
  }, [points]);
  const sorted = [...rows].sort((a, b) => b[sort] - a[sort]);
  const metricCol: MetricKey = sort === "hujan" || sort === "n" ? "suhu_C" : sort;
  const mc = METRICS[metricCol];
  const vmax = Math.max(...rows.map((r) => r[metricCol]), 1);
  const vmin = Math.min(...rows.map((r) => r[metricCol]), 0);

  return (
    <Panel pad={false} className="flex flex-col overflow-hidden">
      <PanelBar
        title="Ringkasan per provinsi"
        sub="Klik baris untuk memfilter dashboard"
        right={
          <Segmented
            size="sm"
            label="Urutkan"
            value={sort}
            onChange={setSort}
            options={[
              { value: "suhu_C", label: "Suhu" },
              { value: "kelembapan", label: "Lembap" },
              { value: "kecepatan_angin", label: "Angin" },
              { value: "hujan", label: "Hujan" },
              { value: "n", label: "Jumlah" },
            ]}
          />
        }
      />
      {!points ? (
        <div className="p-4">
          <Loading h={420} />
        </div>
      ) : (
        <div className="max-h-[440px] overflow-auto">
          <table className="w-full text-[12.5px]">
            <thead className="sticky top-0 z-10 bg-white/[0.03] text-left text-[10.5px] uppercase tracking-wide text-ink-3">
              <tr>
                <th className="py-2 pl-4 pr-2 font-semibold">#</th>
                <th className="px-2 py-2 font-semibold">Provinsi</th>
                <th className="px-2 py-2 text-right font-semibold">Kec.</th>
                <th className="px-2 py-2 font-semibold">
                  {mc.label} ({mc.unit})
                </th>
                <th className="px-2 py-2 font-semibold">Zona dominan</th>
                <th className="py-2 pl-2 pr-4 text-right font-semibold">Hujan</th>
              </tr>
            </thead>
            <tbody>
              {sorted.map((r, i) => {
                const w = ((r[metricCol] - vmin * 0.92) / (vmax - vmin * 0.92)) * 100;
                const sel = r.prov === selected;
                return (
                  <tr
                    key={r.prov}
                    onClick={() => onSelect(r.prov)}
                    className={`cursor-pointer border-t border-line-2 transition-colors ${sel ? "bg-brand-50" : "hover:bg-white/[0.04]"}`}
                  >
                    <td className="tabular py-2 pl-4 pr-2 text-ink-3">{i + 1}</td>
                    <td className={`max-w-[150px] truncate px-2 py-2 font-medium ${sel ? "text-brand-700" : "text-ink"}`}>{r.prov}</td>
                    <td className="tabular px-2 py-2 text-right text-ink-2">{r.n}</td>
                    <td className="px-2 py-2">
                      <div className="flex items-center gap-2">
                        <div className="h-1.5 w-16 shrink-0 rounded-full bg-line-2">
                          <div className="h-full rounded-full" style={{ width: `${Math.max(4, w)}%`, background: mc.warm ? C.amber : C.brand }} />
                        </div>
                        <span className="tabular font-semibold">{fmt(r[metricCol], mc.digits)}</span>
                      </div>
                    </td>
                    <td className="px-2 py-2">
                      <span className="inline-flex items-center gap-1.5 text-ink-2">
                        <ClusterDot id={r.dom} size={8} />
                        <span className="truncate">{names[r.dom] ?? "-"}</span>
                      </span>
                    </td>
                    <td className="tabular py-2 pl-2 pr-4 text-right">
                      <span className={r.hujan >= 20 ? "font-semibold text-brand-700" : "text-ink-2"}>{fmt(r.hujan, 0)}%</span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </Panel>
  );
}

function Ranking() {
  const f = useFilters();
  const [order, setOrder] = useState<"top" | "bottom">("top");
  const metric = RANK_METRICS.includes(f.metric) ? f.metric : "suhu_C";
  const { data } = useRanking(metric, order, f.provinsi);
  const m = METRICS[metric];
  const max = data ? Math.max(...data.map((r) => Math.abs(r.nilai)), 0.0001) : 1;
  const min = data ? Math.min(...data.map((r) => r.nilai)) : 0;

  return (
    <Panel className="flex h-full flex-col">
      <PanelHeader
        title={`${order === "top" ? "Tertinggi" : "Terendah"}: ${m.label.toLowerCase()}`}
        sub={`10 kecamatan di ${f.provinsi ?? "Indonesia"}`}
        right={
          <Segmented
            size="sm"
            label="Urutan"
            value={order}
            onChange={setOrder}
            options={[
              { value: "top", label: "Top" },
              { value: "bottom", label: "Bottom" },
            ]}
          />
        }
      />
      {!data ? (
        <Loading h={250} />
      ) : (
        <ol className="-mx-1.5 max-h-[262px] space-y-0.5 overflow-y-auto xl:max-h-none xl:min-h-0 xl:flex-1">
          {data.map((r, i) => {
            const w = metric === "suhu_C" || metric === "kelembapan" ? ((r.nilai - min * 0.9) / (max - min * 0.9)) * 100 : (r.nilai / max) * 100;
            return (
              <li key={`${r.kecamatan}-${r.provinsi}`}>
                <button
                  onClick={() => f.setFocus({ lat: r.lat, lon: r.lon, label: r.kecamatan })}
                  className="group flex w-full items-center gap-2.5 rounded-lg px-1.5 py-1 text-left transition-colors duration-150 hover:bg-white/[0.04]"
                >
                  <span
                    className={`tabular flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[10.5px] font-semibold ${
                      i < 3 ? "bg-brand-600 text-white" : "bg-white/[0.06] text-ink-3"
                    }`}
                  >
                    {i + 1}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="flex items-baseline justify-between gap-2">
                      <span className="truncate text-[12.5px] font-medium text-ink group-hover:text-brand-700">{titleCase(r.kecamatan)}</span>
                      <span className="tabular shrink-0 text-[12.5px] font-semibold">
                        {fmt(r.nilai, m.digits)} <span className="text-[10.5px] font-normal text-ink-3">{m.unit}</span>
                      </span>
                    </span>
                    <span className="mt-0.5 flex items-center gap-2">
                      <span className="h-1 flex-1 rounded-full bg-line-2">
                        <span className="block h-full rounded-full" style={{ width: `${Math.max(w, 3)}%`, background: CLUSTER_COLORS[r.cluster] }} />
                      </span>
                      <span className="w-20 truncate text-right text-[10.5px] text-ink-3">{r.provinsi}</span>
                    </span>
                  </span>
                </button>
              </li>
            );
          })}
        </ol>
      )}
    </Panel>
  );
}

/* ---------- Cek Lokasimu (mengambang di atas peta pada layar lebar) ---------- */

function CheckLocation() {
  const f = useFilters();
  const { data, isFetching, error } = useInterpolation(f.checkLoc);
  const model = useModel();
  const [lat, setLat] = useState("");
  const [lon, setLon] = useState("");
  const [geoErr, setGeoErr] = useState<string | null>(null);

  const submit = () => {
    const la = parseFloat(lat.replace(",", "."));
    const lo = parseFloat(lon.replace(",", "."));
    if (Number.isFinite(la) && Number.isFinite(lo)) {
      setGeoErr(null);
      f.setCheckLoc({ lat: la, lon: lo });
    } else setGeoErr("Isi lintang dan bujur dengan angka, misalnya -6.595 dan 106.816.");
  };

  const useGps = () => {
    setGeoErr(null);
    if (!navigator.geolocation) return setGeoErr("Browser ini tidak mendukung geolokasi. Masukkan koordinat secara manual.");
    navigator.geolocation.getCurrentPosition(
      (p) => {
        const la = +p.coords.latitude.toFixed(5);
        const lo = +p.coords.longitude.toFixed(5);
        setLat(String(la));
        setLon(String(lo));
        f.setCheckLoc({ lat: la, lon: lo });
      },
      () => setGeoErr("Izin lokasi ditolak. Izinkan akses lokasi di browser atau masukkan koordinat secara manual."),
    );
  };

  const input = "h-8 w-full rounded-lg border border-line bg-surface px-2.5 text-[12.5px] outline-none transition-colors hover:border-brand-200 focus:border-brand-500";

  return (
    <div className="glass rounded-2xl p-4">
      <div className="mb-2 flex items-center justify-between">
        <h3 className="text-[13.5px] font-semibold text-ink">Cek Lokasimu</h3>
        <Pill>IDW</Pill>
      </div>
      <div className="space-y-2">
        <div className="grid grid-cols-2 gap-1.5">
          <input aria-label="Lintang" value={lat} onChange={(e) => setLat(e.target.value)} onKeyDown={(e) => e.key === "Enter" && submit()} placeholder="Lintang" className={input} />
          <input aria-label="Bujur" value={lon} onChange={(e) => setLon(e.target.value)} onKeyDown={(e) => e.key === "Enter" && submit()} placeholder="Bujur" className={input} />
          <button onClick={submit} className="h-8 rounded-lg bg-brand-600 px-3 text-[12.5px] font-semibold text-white transition-colors duration-150 hover:bg-brand-700">
            Cek koordinat
          </button>
          <button onClick={useGps} className="h-8 rounded-lg border border-line px-3 text-[12.5px] font-medium text-ink transition-colors duration-150 hover:bg-white/[0.04]">
            Lokasi saya
          </button>
        </div>
        {geoErr && <p className="text-[11.5px] text-amber-700">{geoErr}</p>}
      </div>

      <div className="mt-3 border-t border-line-2 pt-2.5">
        {!f.checkLoc && (
          <p className="text-[12px] leading-relaxed text-ink-3">
            Klik titik mana pun di peta. Cuaca diperkirakan dari {model.data?.idw.k ?? 10} kecamatan terdekat (bobot 1/d²), lalu zonanya ditentukan dari
            centroid K-Means terdekat.
          </p>
        )}
        {f.checkLoc && isFetching && <Loading h={200} />}
        {f.checkLoc && error && <p className="text-[12px] text-amber-700">{(error as Error).message}</p>}
        {data && !isFetching && (
          <div className="space-y-2.5">
            <div>
              <p className="tabular text-[11px] text-ink-3">
                {fmt(data.lat, 4)}, {fmt(data.lon, 4)}
              </p>
              <p className="flex items-center gap-1.5 text-[14px] font-semibold text-ink">
                <ClusterDot id={data.cluster} size={9} />
                Zona {data.cluster_nama}
              </p>
              {!data.in_coverage && (
                <p className="mt-1.5 rounded-lg bg-amber-50 px-2 py-1.5 text-[11.5px] leading-relaxed text-amber-700">
                  Kecamatan terdekat berjarak {fmt(data.nearest[0]!.jarak_km, 0)} km, jadi estimasi di lokasi ini kurang andal.
                </p>
              )}
            </div>
            <dl className="grid grid-cols-2 gap-1.5 sm:grid-cols-3">
              {(Object.keys(data.values) as MetricKey[]).map((k) => (
                <div key={k} className="rounded-lg bg-white/[0.04] px-2 py-1.5">
                  <dt className="text-[10.5px] text-ink-3">{METRICS[k].label}</dt>
                  <dd className={`tabular text-[13px] font-semibold ${METRICS[k].warm ? "text-amber-700" : "text-ink"}`}>{fmtMetric(k, data.values[k])}</dd>
                </div>
              ))}
            </dl>
            <div>
              <p className="mb-0.5 text-[11px] font-medium text-ink-3">Kecamatan acuan · bobot IDW</p>
              {data.nearest.slice(0, 4).map((n) => (
                <div key={n.kecamatan + n.provinsi} className="flex items-center gap-1.5 py-0.5 text-[11.5px]">
                  <ClusterDot id={n.cluster} size={7} />
                  <span className="flex-1 truncate">{titleCase(n.kecamatan)}</span>
                  <span className="tabular text-ink-3">{fmt(n.jarak_km, 1)} km</span>
                  <span className="tabular w-9 text-right font-semibold">{fmt(n.bobot * 100, 0)}%</span>
                </div>
              ))}
            </div>
            <button onClick={() => f.setCheckLoc(null)} className="text-[11.5px] font-medium text-brand-600 hover:text-brand-800">
              Hapus titik
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
