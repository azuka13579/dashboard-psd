import { useMemo, useState } from "react";
import { useInsights, useInterpolation, useModel, usePoints, useProvinces, useRanking, useSummary, type MetricKey } from "../lib/api";
import { useFilters } from "../lib/store";
import { C, CLUSTER_COLORS, KATEGORI_LABEL, METRICS, METRIC_KEYS, binIndex, binLabels, fmt, fmtMetric, rampStops, titleCase } from "../lib/theme";
import { ClusterDot, ErrorBox, KpiStrip, Loading, PageHeader, Panel, PanelBar, PanelHeader, Section, Segmented } from "../components/ui";
import MapView from "../components/MapView";

const RANK_METRICS: MetricKey[] = ["suhu_C", "kecepatan_angin", "kelembapan", "tutupan_awan"];
const RANK_LABEL: Record<string, string> = { suhu_C: "Suhu", kecepatan_angin: "Angin", kelembapan: "Lembap", tutupan_awan: "Awan" };
const KAT_COLOR: Record<string, string> = { Clear: C.amber, Clouds: C.sky, Rain: C.navy700 };

export default function Dashboard() {
  const f = useFilters();
  const model = useModel();
  const provinces = useProvinces();
  const points = usePoints(f.provinsi);
  const summary = useSummary(f.provinsi);
  const insights = useInsights(f.provinsi);
  const check = useInterpolation(f.checkLoc);

  const clusterNames = useMemo(() => model.data?.clusters.map((c) => c.nama) ?? [], [model.data]);
  const s = summary.data;
  const wilayah = f.provinsi ?? "Indonesia";

  if (model.error) return <ErrorBox error={model.error} />;

  const totalCluster = model.data?.clusters.reduce((a, c) => a + c.jumlah, 0) || 1;

  return (
    <div className="space-y-10">
      {/* <div>
        <PageHeader
          flush
          title="Dashboard Cuaca Kecamatan"
          desc="Pilih provinsi dan metrik untuk menyaring peta, ringkasan, peringkat, dan insight. Klik titik mana pun di peta untuk memperkirakan cuaca di lokasi tersebut."
        /> */}

        {/* Filter bar: tetap terlihat saat menggulir */}
        <div className="bleed-surface z-[1100] mb-4 border-b border-line py-2.5 shadow-[0_1px_0_var(--color-line)] md:sticky md:top-14">
          <div className="flex flex-wrap items-center gap-x-5 gap-y-2">
            <label className="flex items-center gap-2">
              <span className="text-[12px] font-medium text-ink-3">Provinsi</span>
              <select
                value={f.provinsi ?? ""}
                onChange={(e) => f.setProvinsi(e.target.value || undefined)}
                className="h-8 min-w-[210px] rounded-md border border-line bg-surface px-2.5 text-[13px] text-ink outline-none transition-colors hover:border-navy-700/40 focus:border-sky-500"
              >
                <option value="">Semua provinsi</option>
                {provinces.data?.map((p) => (
                  <option key={p.provinsi} value={p.provinsi}>
                    {p.provinsi} ({p.n})
                  </option>
                ))}
              </select>
            </label>
            <div className="flex items-center gap-2">
              <span className="text-[12px] font-medium text-ink-3">Metrik</span>
              <Segmented label="Metrik" value={f.metric} onChange={f.setMetric} options={METRIC_KEYS.map((m) => ({ value: m, label: METRICS[m].label }))} size="sm" />
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[12px] font-medium text-ink-3">Warna peta</span>
              <Segmented
                label="Warna peta"
                value={f.colorBy}
                onChange={f.setColorBy}
                size="sm"
                options={[
                  { value: "cluster", label: "Zona cluster" },
                  { value: "metric", label: "Nilai metrik" },
                ]}
              />
            </div>
            {f.provinsi && (
              <button onClick={() => f.setProvinsi(undefined)} className="text-[13px] font-medium text-sky-600 hover:text-navy-700">
                Reset filter
              </button>
            )}
          </div>
        </div>

        <div className="mb-4">
          {s ? (
            <KpiStrip
              items={[
                { label: "Kecamatan", value: s.n.toLocaleString("id-ID"), hint: wilayah },
                { label: "Rata-rata suhu", value: fmt(s.suhu_C, 1), unit: "°C", hint: `${fmt(s.suhu_min, 1)} sampai ${fmt(s.suhu_max, 1)} °C`, accent: "amber" },
                { label: "Kelembapan", value: fmt(s.kelembapan, 0), unit: "%" },
                { label: "Kecepatan angin", value: fmt(s.kecepatan_angin, 2), unit: "m/s" },
                { label: "Tutupan awan", value: fmt(s.tutupan_awan, 0), unit: "%" },
                { label: "Sedang hujan", value: fmt(s.pct_hujan, 1), unit: "%", hint: "dari jumlah kecamatan" },
              ]}
            />
          ) : (
            <Loading h={74} />
          )}
        </div>

        <div className="space-y-4">
          {/* Peringkat | Peta | Cek lokasi */}
          <div className="grid gap-4 xl:h-[620px] xl:grid-cols-[280px_1fr_290px]">
            <Ranking />
            <Panel pad={false} className="flex h-[520px] flex-col overflow-hidden xl:h-full">
              <PanelBar
                title={`Peta ${wilayah}`}
                sub={points.data ? `${points.data.length.toLocaleString("id-ID")} kecamatan, klik peta untuk cek lokasi` : "Memuat titik"}
                right={
                  <span className="rounded bg-white/10 px-2 py-0.5 text-[12px] text-sky-100/85">
                    Warna titik: {f.colorBy === "cluster" ? "zona cluster" : `${METRICS[f.metric].label.toLowerCase()} (${METRICS[f.metric].unit})`}
                  </span>
                }
              />
              <div className="relative flex-1">
                {points.data && model.data && (
                  <MapLegend
                    colorBy={f.colorBy}
                    metric={f.metric}
                    values={points.data.map((p) => (f.colorBy === "cluster" ? p.cluster : p[f.metric]))}
                    clusters={model.data.clusters}
                  />
                )}
                {points.data && model.data ? (
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
                ) : (
                  <div className="h-full p-3">
                    <Loading h={480} />
                  </div>
                )}
              </div>
            </Panel>
            <CheckLocation />
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <Panel>
              <PanelHeader title="Komposisi zona iklim" sub={`Proporsi kecamatan per cluster di ${wilayah}`} />
              {s && model.data ? (
                <div className="space-y-3">
                  <div className="flex h-2.5 gap-[2px] overflow-hidden rounded-sm">
                    {s.clusters.map((c) => (
                      <span key={c.cluster} style={{ width: `${(c.n / s.n) * 100}%`, background: CLUSTER_COLORS[c.cluster] }} />
                    ))}
                  </div>
                  <table className="w-full text-[13px]">
                    <tbody>
                      {model.data.clusters.map((ci) => {
                        const n = s.clusters.find((c) => c.cluster === ci.id)?.n ?? 0;
                        return (
                          <tr key={ci.id} className="border-b border-line-2 last:border-0">
                            <td className="py-1.5">
                              <span className="inline-flex items-center gap-2 font-medium">
                                <ClusterDot id={ci.id} />
                                {ci.nama}
                              </span>
                            </td>
                            <td className="tabular py-1.5 text-right text-ink-3">{n.toLocaleString("id-ID")} kec.</td>
                            <td className="tabular w-16 py-1.5 text-right font-semibold">{fmt((n / s.n) * 100, 1)}%</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              ) : (
                <Loading h={110} />
              )}
            </Panel>
            <Panel>
              <PanelHeader title="Kondisi cuaca saat pengamatan" sub={`Kategori cuaca utama di ${wilayah}`} />
              {s ? (
                <div className="space-y-3">
                  <div className="flex h-2.5 gap-[2px] overflow-hidden rounded-sm">
                    {["Clear", "Clouds", "Rain"].map((k) => {
                      const n = s.cuaca.find((c) => c.kategori === k)?.n ?? 0;
                      return n ? <span key={k} style={{ width: `${(n / s.n) * 100}%`, background: KAT_COLOR[k] }} /> : null;
                    })}
                  </div>
                  <table className="w-full text-[13px]">
                    <tbody>
                      {["Clear", "Clouds", "Rain"].map((k) => {
                        const n = s.cuaca.find((c) => c.kategori === k)?.n ?? 0;
                        return (
                          <tr key={k} className="border-b border-line-2 last:border-0">
                            <td className="py-1.5">
                              <span className="inline-flex items-center gap-2 font-medium">
                                <span aria-hidden className="h-[9px] w-[9px] rounded-[3px]" style={{ background: KAT_COLOR[k] }} />
                                {KATEGORI_LABEL[k]}
                              </span>
                            </td>
                            <td className="tabular py-1.5 text-right text-ink-3">{n.toLocaleString("id-ID")} kec.</td>
                            <td className="tabular w-16 py-1.5 text-right font-semibold">{fmt((n / s.n) * 100, 1)}%</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              ) : (
                <Loading h={110} />
              )}
            </Panel>
          </div>
        </div>
      </div>

      <Section title="Key Insight" desc={`Temuan otomatis untuk ${insights.data?.wilayah ?? wilayah}, menyesuaikan filter provinsi.`}>
        <div className="overflow-hidden rounded-lg bg-navy-900 shadow-[0_2px_8px_rgba(15,42,68,0.18)]">
          {insights.data ? (
            <dl className="grid gap-px bg-white/10 md:grid-cols-2 xl:grid-cols-3">
              {insights.data.insights.map((it, i, arr) => (
                <div
                  key={it.judul}
                  className={`bg-navy-900 px-4 py-3.5 ${arr.length % 2 === 1 && i === arr.length - 1 ? "md:col-span-2 xl:col-span-1" : ""} ${
                    arr.length % 3 === 2 && i === arr.length - 1 ? "xl:col-span-2" : ""
                  }`}
                >
                  <dt className="text-[13.5px] font-semibold text-white">{it.judul}</dt>
                  <dd className="mt-1 text-[13px] leading-relaxed text-sky-100/80">{it.isi}</dd>
                </div>
              ))}
            </dl>
          ) : (
            <div className="p-4">
              <Loading h={180} tone="dark" />
            </div>
          )}
        </div>
      </Section>

      <Section title="Kesimpulan dan Rekomendasi">
        <div className="grid gap-4 lg:grid-cols-[1fr_1.5fr]">
          <Panel>
            <PanelHeader title="Kesimpulan" />
            <div className="space-y-3 text-[13.5px] leading-relaxed text-ink-2">
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
            <p className="mt-4 border-t border-line-2 pt-3 text-[12.5px] leading-relaxed text-ink-3">
              Keterbatasan: data hanya mewakili satu waktu pengamatan (siang hari, musim kemarau). Hasil cluster dapat berubah pada musim atau jam
              yang berbeda, sehingga analisis lanjutan sebaiknya memakai data deret waktu.
            </p>
          </Panel>
          <Panel pad={false} className="overflow-hidden">
            <PanelBar title="Rekomendasi per zona" sub={`Zona yang mencakup minimal 10% kecamatan di ${insights.data?.wilayah ?? wilayah}`} />
            {insights.data ? (
              insights.data.rekomendasi.map((r) => (
                <div key={r.cluster} className="border-t border-line-2 px-4 py-3.5 first:border-t-0 odd:bg-navy-50/60">
                  <div className="mb-2 flex items-center justify-between gap-3">
                    <span className="inline-flex items-center gap-2 text-[13.5px] font-semibold text-ink">
                      <ClusterDot id={r.cluster} />
                      Zona {r.nama}
                    </span>
                    <span className="tabular text-[12px] text-ink-3">{fmt(r.porsi * 100, 0)}% kecamatan</span>
                  </div>
                  <dl className="grid gap-x-5 gap-y-2 md:grid-cols-3">
                    {r.items.map((it) => (
                      <div key={it.sektor}>
                        <dt className="text-[12px] font-semibold text-navy-700">{it.sektor}</dt>
                        <dd className="mt-0.5 text-[13px] leading-relaxed text-ink-2">{it.isi}</dd>
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

/** Legenda di pojok peta: arti warna titik beserta jumlah kecamatan di tiap kelas. */
function MapLegend({
  colorBy,
  metric,
  values,
  clusters,
}: {
  colorBy: "cluster" | "metric";
  metric: MetricKey;
  values: number[];
  clusters: { id: number; nama: string }[];
}) {
  const rows =
    colorBy === "cluster"
      ? clusters.map((c) => ({ color: CLUSTER_COLORS[c.id]!, label: c.nama, n: values.filter((v) => v === c.id).length }))
      : binLabels(metric).map((label, i) => ({
          color: rampStops(metric)[i]!,
          label,
          n: values.filter((v) => binIndex(metric, v) === i).length,
        }));
  const title = colorBy === "cluster" ? "Zona iklim" : `${METRICS[metric].label} (${METRICS[metric].unit})`;
  return (
    <div className="pointer-events-auto absolute bottom-6 left-2.5 z-[500] min-w-[170px] rounded-md border border-line bg-surface/95 px-3 py-2.5 shadow-[0_4px_14px_rgba(15,42,68,0.14)]">
      <p className="mb-1.5 text-[12px] font-semibold text-navy-900">{title}</p>
      <ul className="space-y-1">
        {rows.map((r) => (
          <li key={r.label} className="flex items-center gap-2 text-[12px] text-ink-2">
            <span aria-hidden className="h-3 w-3 shrink-0 rounded-full ring-1 ring-navy-900/25" style={{ background: r.color }} />
            <span className="tabular flex-1">{r.label}</span>
            <span className="tabular text-ink-3">{r.n.toLocaleString("id-ID")}</span>
          </li>
        ))}
      </ul>
      <p className="mt-1.5 border-t border-line-2 pt-1.5 text-[11px] text-ink-3">Angka kanan: jumlah kecamatan</p>
    </div>
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
    <Panel pad={false} className="flex flex-col xl:min-h-0">
      <PanelBar title={`Peringkat ${m.label.toLowerCase()}`} sub={`${order === "top" ? "10 tertinggi" : "10 terendah"} di ${f.provinsi ?? "Indonesia"}`} />
      <div className="flex min-h-0 flex-1 flex-col p-3">
      <div className="mb-2 flex flex-wrap gap-1.5">
        <Segmented
          size="sm"
          label="Urutan"
          value={order}
          onChange={setOrder}
          options={[
            { value: "top", label: "Top 10" },
            { value: "bottom", label: "Bottom 10" },
          ]}
        />
        <Segmented size="sm" label="Metrik peringkat" value={metric} onChange={f.setMetric} options={RANK_METRICS.map((k) => ({ value: k, label: RANK_LABEL[k]! }))} />
      </div>
      {!data ? (
        <Loading h={400} />
      ) : (
        <ol className="-mx-2 flex-1 overflow-y-auto">
          {data.map((r, i) => {
            const w = metric === "suhu_C" || metric === "kelembapan" ? ((r.nilai - min * 0.9) / (max - min * 0.9)) * 100 : (r.nilai / max) * 100;
            return (
              <li key={`${r.kecamatan}-${r.provinsi}`}>
                <button
                  onClick={() => f.setFocus({ lat: r.lat, lon: r.lon, label: r.kecamatan })}
                  className="group w-full rounded-md px-2 py-1.5 text-left transition-colors duration-150 hover:bg-canvas"
                >
                  <div className="flex items-baseline gap-2">
                    <span className="tabular w-4 text-right text-[11px] text-ink-3">{i + 1}</span>
                    <span className="flex-1 truncate text-[13px] font-medium group-hover:text-navy-700">{titleCase(r.kecamatan)}</span>
                    <span className="tabular text-[13px] font-semibold">{fmt(r.nilai, m.digits)}</span>
                    <span className="w-7 text-[11px] text-ink-3">{m.unit}</span>
                  </div>
                  <div className="ml-6 mt-1 flex items-center gap-2">
                    <div className="h-1 flex-1 rounded-full bg-line-2">
                      <div className="h-full rounded-full" style={{ width: `${Math.max(w, 2)}%`, background: CLUSTER_COLORS[r.cluster] }} />
                    </div>
                    <span className="w-24 truncate text-[11px] text-ink-3">{r.provinsi}</span>
                  </div>
                </button>
              </li>
            );
          })}
        </ol>
      )}
      <p className="mt-2 border-t border-line-2 pt-2 text-[11.5px] text-ink-3">Warna batang menunjukkan zona. Klik nama untuk melihat lokasinya di peta.</p>
      </div>
    </Panel>
  );
}

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
    if (Number.isFinite(la) && Number.isFinite(lo)) f.setCheckLoc({ lat: la, lon: lo });
    else setGeoErr("Isi lintang dan bujur dengan angka, misalnya -6.595 dan 106.816.");
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

  const input = "h-8 w-full rounded-md border border-line px-2.5 text-[13px] outline-none transition-colors hover:border-ink-3/50 focus:border-sky-500";

  return (
    <Panel pad={false} className="flex flex-col xl:min-h-0">
      <PanelBar title="Cek Lokasimu" sub="Estimasi cuaca dengan interpolasi spasial IDW" />
      <div className="flex flex-1 flex-col p-4 xl:min-h-0 xl:overflow-y-auto">
      <div className="space-y-2">
        <div className="grid grid-cols-2 gap-2">
          <input aria-label="Lintang" value={lat} onChange={(e) => setLat(e.target.value)} onKeyDown={(e) => e.key === "Enter" && submit()} placeholder="Lintang" className={input} />
          <input aria-label="Bujur" value={lon} onChange={(e) => setLon(e.target.value)} onKeyDown={(e) => e.key === "Enter" && submit()} placeholder="Bujur" className={input} />
        </div>
        <div className="grid grid-cols-2 gap-2">
          <button onClick={submit} className="h-8 rounded-md bg-navy-900 text-[13px] font-medium text-white transition-colors duration-150 hover:bg-navy-800">
            Cek koordinat
          </button>
          <button onClick={useGps} className="h-8 rounded-md border border-line text-[13px] font-medium text-navy-800 transition-colors duration-150 hover:bg-canvas">
            Lokasi saya
          </button>
        </div>
        {geoErr && <p className="text-[12px] text-amber-700">{geoErr}</p>}
      </div>

      <div className="mt-4 flex-1 border-t border-line-2 pt-3">
        {!f.checkLoc && (
          <div className="space-y-2 text-[13px] leading-relaxed text-ink-3">
            <p>Klik titik mana pun di peta, masukkan koordinat, atau gunakan lokasi perangkat.</p>
            <p>
              Nilai cuaca diperkirakan dari {model.data?.idw.k ?? 10} kecamatan terdekat dengan bobot 1/d². Zona iklim ditentukan dari centroid
              K-Means terdekat.
            </p>
          </div>
        )}
        {f.checkLoc && isFetching && <Loading h={280} />}
        {f.checkLoc && error && <p className="text-[13px] text-amber-700">{(error as Error).message}</p>}
        {data && !isFetching && (
          <div className="space-y-3">
            <div>
              <p className="tabular text-[12px] text-ink-3">
                {fmt(data.lat, 4)}, {fmt(data.lon, 4)}
              </p>
              <p className="mt-0.5 flex items-center gap-2 text-[15px] font-semibold text-navy-900">
                <ClusterDot id={data.cluster} size={10} />
                Zona {data.cluster_nama}
              </p>
              {!data.in_coverage && (
                <p className="mt-2 rounded-md bg-amber-50 px-2.5 py-1.5 text-[12px] leading-relaxed text-amber-700">
                  Kecamatan terdekat berjarak {fmt(data.nearest[0]!.jarak_km, 0)} km, jadi lokasi ini di luar jangkauan data dan estimasinya kurang andal.
                </p>
              )}
            </div>
            <dl className="grid grid-cols-2 overflow-hidden rounded-md border border-line-2">
              {(Object.keys(data.values) as MetricKey[]).map((k, i) => (
                <div key={k} className={`px-2.5 py-2 ${i % 2 === 0 ? "border-r border-line-2" : ""} ${i < 4 ? "border-b border-line-2" : ""}`}>
                  <dt className="text-[11.5px] text-ink-3">{METRICS[k].label}</dt>
                  <dd className="tabular text-[14px] font-semibold text-navy-900">{fmtMetric(k, data.values[k])}</dd>
                </div>
              ))}
            </dl>
            <div>
              <p className="mb-1 text-[12px] font-medium text-ink-3">Kecamatan acuan terdekat</p>
              <table className="w-full text-[12px]">
                <tbody>
                  {data.nearest.slice(0, 5).map((n) => (
                    <tr key={n.kecamatan + n.provinsi}>
                      <td className="py-0.5">
                        <span className="inline-flex max-w-[140px] items-center gap-1.5 truncate">
                          <ClusterDot id={n.cluster} size={7} />
                          {titleCase(n.kecamatan)}
                        </span>
                      </td>
                      <td className="tabular py-0.5 text-right text-ink-3">{fmt(n.jarak_km, 1)} km</td>
                      <td className="tabular w-10 py-0.5 text-right font-semibold">{fmt(n.bobot * 100, 0)}%</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <p className="mt-1 text-[11.5px] text-ink-3">Persentase adalah bobot IDW tiap kecamatan.</p>
            </div>
            <button onClick={() => f.setCheckLoc(null)} className="text-[12px] font-medium text-sky-600 hover:text-navy-700">
              Hapus titik
            </button>
          </div>
        )}
      </div>
      </div>
    </Panel>
  );
}
