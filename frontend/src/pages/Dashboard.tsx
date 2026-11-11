import { useMemo, useState } from "react";
import { useInsights, useInterpolation, useModel, usePoints, useProvinces, useRanking, useSummary, type MetricKey } from "../lib/api";
import { useFilters } from "../lib/store";
import { C, CLUSTER_COLORS, KATEGORI_LABEL, METRICS, METRIC_KEYS, fmt, fmtMetric, rampStops, titleCase } from "../lib/theme";
import { Card, CardTitle, ClusterDot, ClusterLegend, ErrorBox, Loading, Section, Segmented, Stat } from "../components/ui";
import MapView from "../components/MapView";

const RANK_METRICS: MetricKey[] = ["suhu_C", "kecepatan_angin", "kelembapan", "tutupan_awan"];

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

  if (model.error) return <ErrorBox error={model.error} />;

  return (
    <div className="space-y-14">
     
        {/* Filter bar */}
        <div className="sticky top-[57px] z-[900] -mx-4 border-y border-line bg-canvas/95 px-4 py-3 backdrop-blur sm:-mx-6 sm:px-6">
          <div className="flex flex-wrap items-center gap-x-6 gap-y-3">
            <label className="flex items-center gap-2 text-sm">
              <span className="text-xs font-medium uppercase tracking-wide text-ink-3">Provinsi</span>
              <select
                value={f.provinsi ?? ""}
                onChange={(e) => f.setProvinsi(e.target.value || undefined)}
                className="min-w-[220px] rounded-md border border-line bg-surface px-3 py-1.5 text-sm text-ink outline-none focus:border-sky-500"
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
              <span className="text-xs font-medium uppercase tracking-wide text-ink-3">Metrik</span>
              <Segmented value={f.metric} onChange={f.setMetric} options={METRIC_KEYS.map((m) => ({ value: m, label: METRICS[m].label }))} size="sm" />
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-medium uppercase tracking-wide text-ink-3">Warna peta</span>
              <Segmented
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
              <button onClick={() => f.setProvinsi(undefined)} className="text-sm font-medium text-sky-600 hover:text-navy-700">
                Reset filter
              </button>
            )}
          </div>
        </div>

        {/* KPI */}
        <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
          {s ? (
            <>
              <Stat label="Kecamatan" value={s.n.toLocaleString("id-ID")} hint={f.provinsi ?? "Seluruh Indonesia"} />
              <Stat label="Rata-rata suhu" value={fmt(s.suhu_C, 1)} unit="°C" hint={`${fmt(s.suhu_min, 1)} sampai ${fmt(s.suhu_max, 1)} °C`} accent="amber" />
              <Stat label="Kelembapan" value={fmt(s.kelembapan, 0)} unit="%" accent="sky" />
              <Stat label="Kecepatan angin" value={fmt(s.kecepatan_angin, 2)} unit="m/s" accent="sky" />
              <Stat label="Tutupan awan" value={fmt(s.tutupan_awan, 0)} unit="%" accent="sky" />
              <Stat label="Sedang hujan" value={fmt(s.pct_hujan, 1)} unit="%" hint="dari jumlah kecamatan" />
            </>
          ) : (
            Array.from({ length: 6 }).map((_, i) => <Loading key={i} h={88} />)
          )}
        </div>

        {/* Ranking | Map | Cek lokasi */}
        <div className="grid gap-5 xl:grid-cols-[290px_1fr_300px] xl:h-[640px]">
          <Ranking />
          <Card pad={false} className="flex h-[560px] flex-col xl:h-full">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line px-5 py-3">
              <div>
                <h3 className="text-[15px] font-semibold">Peta {f.provinsi ?? "Indonesia"}</h3>
                <p className="text-xs text-ink-3">
                  {points.data ? `${points.data.length.toLocaleString("id-ID")} titik kecamatan` : "Memuat..."} · klik peta untuk cek lokasi
                </p>
              </div>
              {f.colorBy === "cluster" ? (
                <ClusterLegend clusters={model.data?.clusters ?? []} />
              ) : (
                <MetricLegend metric={f.metric} values={points.data?.map((p) => p[f.metric]) ?? []} />
              )}
            </div>
            <div className="relative flex-1 p-2">
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
                <Loading h={540} />
              )}
            </div>
          </Card>
          <CheckLocation />
        </div>

        {/* Cluster composition + weather */}
        <div className="grid gap-5 lg:grid-cols-2">
          <Card>
            <CardTitle title="Komposisi Zona Iklim" sub={`Proporsi kecamatan per cluster di ${f.provinsi ?? "Indonesia"}`} />
            {s && model.data ? (
              <div className="space-y-4">
                <div className="flex h-3 gap-[2px] overflow-hidden rounded-sm">
                  {s.clusters.map((c) => (
                    <span key={c.cluster} style={{ width: `${(c.n / s.n) * 100}%`, background: CLUSTER_COLORS[c.cluster] }} />
                  ))}
                </div>
                <div className="space-y-2.5">
                  {model.data.clusters.map((ci) => {
                    const n = s.clusters.find((c) => c.cluster === ci.id)?.n ?? 0;
                    return (
                      <div key={ci.id} className="flex items-center gap-3 text-sm">
                        <ClusterDot id={ci.id} />
                        <span className="w-36 font-medium">{ci.nama}</span>
                        <div className="h-1.5 flex-1 rounded-full bg-canvas">
                          <div className="h-full rounded-full" style={{ width: `${(n / s.n) * 100}%`, background: CLUSTER_COLORS[ci.id] }} />
                        </div>
                        <span className="tabular w-28 text-right text-ink-2">
                          {fmt((n / s.n) * 100, 1)}% <span className="text-ink-3">({n})</span>
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            ) : (
              <Loading h={120} />
            )}
          </Card>
          <Card>
            <CardTitle title="Kondisi Cuaca Saat Ini" sub="Kategori cuaca utama saat pengamatan" />
            {s ? (
              <div className="grid grid-cols-3 gap-3">
                {["Clear", "Clouds", "Rain"].map((k) => {
                  const n = s.cuaca.find((c) => c.kategori === k)?.n ?? 0;
                  const col = k === "Clear" ? C.amber : k === "Clouds" ? C.sky : C.navy700;
                  return (
                    <div key={k} className="rounded-md border border-line p-3">
                      <p className="text-xs text-ink-3">{KATEGORI_LABEL[k]}</p>
                      <p className="tabular mt-1 text-2xl font-semibold text-navy-900">{fmt((n / s.n) * 100, 0)}%</p>
                      <div className="mt-2 h-1 rounded-full bg-canvas">
                        <div className="h-full rounded-full" style={{ width: `${(n / s.n) * 100}%`, background: col }} />
                      </div>
                      <p className="tabular mt-1.5 text-xs text-ink-3">{n.toLocaleString("id-ID")} kecamatan</p>
                    </div>
                  );
                })}
              </div>
            ) : (
              <Loading h={120} />
            )}
          </Card>
        </div>

        {/* Insights */}
        <div>
          <h3 className="mb-3 text-[15px] font-semibold">Insight untuk {insights.data?.wilayah ?? "..."}</h3>
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
            {insights.data
              ? insights.data.insights.map((it, i) => (
                  <Card key={it.judul} className="relative">
                    <span className="font-mono text-xs text-sky-600">{String(i + 1).padStart(2, "0")}</span>
                    <h4 className="mt-1 text-sm font-semibold text-navy-900">{it.judul}</h4>
                    <p className="mt-2 text-[13px] leading-relaxed text-ink-2">{it.isi}</p>
                  </Card>
                ))
              : Array.from({ length: 5 }).map((_, i) => <Loading key={i} h={160} />)}
          </div>
        </div>
     

      <Section no="07" title="Kesimpulan dan Rekomendasi">
        <div className="grid gap-5 lg:grid-cols-[1fr_1.4fr]">
          <Card className="bg-navy-900! border-navy-900! text-white">
            <h3 className="text-[15px] font-semibold">Kesimpulan</h3>
            <ol className="mt-4 space-y-4 text-sm leading-relaxed text-white/80">
              <li>
                <b className="text-white">Cuaca kecamatan di Indonesia terbagi menjadi tiga zona.</b> Panas-Kering (
                {fmt(((model.data?.clusters[0]?.jumlah ?? 0) / (model.data?.clusters.reduce((a, c) => a + c.jumlah, 0) || 1)) * 100, 0)}%),
                Sejuk-Cerah, dan Lembap-Berawan. Suhu dan kelembapan menjadi pembeda paling kuat.
              </li>
              <li>
                <b className="text-white">Zona tidak mengikuti batas provinsi.</b> Satu provinsi dapat memiliki ketiga zona sekaligus, terutama
                provinsi bergunung seperti Jawa Timur, Bali, dan Papua Tengah. Kebijakan cuaca sebaiknya dirancang per zona.
              </li>
              <li>
                <b className="text-white">Hujan terkonsentrasi di zona Lembap-Berawan.</b> Zona Panas-Kering hampir tidak mengalami hujan saat
                pengamatan, sejalan dengan musim kemarau.
              </li>
              <li>
                <b className="text-white">Interpolasi IDW cukup akurat untuk estimasi lokal.</b> Galat suhu sekitar 1,3 °C, sehingga dapat dipakai
                untuk memperkirakan kondisi di lokasi yang tidak memiliki data.
              </li>
            </ol>
            <div className="mt-6 border-t border-white/15 pt-4 text-xs leading-relaxed text-white/55">
              Keterbatasan: data hanya mewakili satu waktu pengamatan (siang hari, musim kemarau). Hasil cluster dapat berubah pada musim
              atau jam yang berbeda, sehingga analisis lanjutan sebaiknya memakai data deret waktu.
            </div>
          </Card>
          <div className="space-y-4">
            <p className="text-sm text-ink-2">
              Rekomendasi untuk zona yang mencakup minimal 10% kecamatan di <b className="text-ink">{insights.data?.wilayah ?? "..."}</b>:
            </p>
            {insights.data?.rekomendasi.map((r) => (
              <Card key={r.cluster} className="relative overflow-hidden">
                <span className="absolute inset-y-0 left-0 w-1" style={{ background: CLUSTER_COLORS[r.cluster] }} />
                <div className="mb-3 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <ClusterDot id={r.cluster} />
                    <h4 className="font-semibold">Zona {r.nama}</h4>
                  </div>
                  <span className="tabular text-xs text-ink-3">{fmt(r.porsi * 100, 0)}% kecamatan</span>
                </div>
                <ul className="grid gap-3 md:grid-cols-3">
                  {r.items.map((it) => (
                    <li key={it.sektor} className="text-[13px] leading-relaxed text-ink-2">
                      <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-navy-700">{it.sektor}</span>
                      {it.isi}
                    </li>
                  ))}
                </ul>
              </Card>
            )) ?? <Loading h={300} />}
          </div>
        </div>
      </Section>
    </div>
  );
}

function MetricLegend({ metric, values }: { metric: MetricKey; values: number[] }) {
  if (!values.length) return null;
  const stops = rampStops(metric);
  const m = METRICS[metric];
  return (
    <div className="flex items-center gap-2 text-xs text-ink-3">
      <span className="tabular">{fmt(Math.min(...values), m.digits)}</span>
      <span className="h-2 w-32 rounded-sm" style={{ background: `linear-gradient(90deg, ${stops.join(",")})` }} />
      <span className="tabular">
        {fmt(Math.max(...values), m.digits)} {m.unit}
      </span>
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
    <Card className="flex flex-col xl:min-h-0 xl:overflow-y-auto">
      <CardTitle title={`Peringkat ${m.label}`} sub={`${order === "top" ? "10 tertinggi" : "10 terendah"} · ${f.provinsi ?? "Indonesia"}`} />
      <div className="mb-3 flex flex-wrap gap-2">
        <Segmented
          size="sm"
          value={order}
          onChange={setOrder}
          options={[
            { value: "top", label: "Top 10" },
            { value: "bottom", label: "Bottom 10" },
          ]}
        />
        <Segmented size="sm" value={metric} onChange={f.setMetric} options={RANK_METRICS.map((k) => ({ value: k, label: k === "suhu_C" ? "Suhu" : k === "kecepatan_angin" ? "Angin" : k === "kelembapan" ? "Lembap" : "Awan" }))} />
      </div>
      {!data ? (
        <Loading h={400} />
      ) : (
        <ol className="space-y-1">
          {data.map((r, i) => {
            // Untuk tekanan dsb. batang diskalakan relatif terhadap min agar perbedaan terlihat
            const w = metric === "suhu_C" || metric === "kelembapan" ? ((r.nilai - min * 0.9) / (max - min * 0.9)) * 100 : (r.nilai / max) * 100;
            return (
              <li key={`${r.kecamatan}-${r.provinsi}`}>
                <button
                  onClick={() => f.setFocus({ lat: r.lat, lon: r.lon, label: r.kecamatan })}
                  className="group w-full rounded-md px-2 py-1.5 text-left hover:bg-canvas"
                >
                  <div className="flex items-baseline gap-2">
                    <span className="tabular w-5 font-mono text-[11px] text-ink-3">{i + 1}</span>
                    <span className="flex-1 truncate text-[13px] font-medium group-hover:text-navy-700">{titleCase(r.kecamatan)}</span>
                    <span className="tabular text-[13px] font-semibold">{fmt(r.nilai, m.digits)}</span>
                    <span className="w-7 text-[11px] text-ink-3">{m.unit}</span>
                  </div>
                  <div className="ml-7 mt-1 flex items-center gap-2">
                    <div className="h-1 flex-1 rounded-full bg-canvas">
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
      <p className="mt-auto pt-3 text-[11px] text-ink-3">Warna batang menunjukkan zona cluster. Klik nama untuk melihat lokasi di peta.</p>
    </Card>
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
  };

  const useGps = () => {
    setGeoErr(null);
    if (!navigator.geolocation) return setGeoErr("Browser tidak mendukung geolokasi.");
    navigator.geolocation.getCurrentPosition(
      (p) => {
        const la = +p.coords.latitude.toFixed(5);
        const lo = +p.coords.longitude.toFixed(5);
        setLat(String(la));
        setLon(String(lo));
        f.setCheckLoc({ lat: la, lon: lo });
      },
      () => setGeoErr("Izin lokasi ditolak atau tidak tersedia."),
    );
  };

  return (
    <Card className="flex flex-col xl:min-h-0 xl:overflow-y-auto">
      <CardTitle title="Cek Lokasimu" sub="Estimasi cuaca dengan interpolasi spasial IDW" />
      <div className="space-y-2">
        <div className="grid grid-cols-2 gap-2">
          <input
            value={lat}
            onChange={(e) => setLat(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && submit()}
            placeholder="Lintang, mis. -6.595"
            className="rounded-md border border-line px-2.5 py-1.5 text-sm outline-none focus:border-sky-500"
          />
          <input
            value={lon}
            onChange={(e) => setLon(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && submit()}
            placeholder="Bujur, mis. 106.816"
            className="rounded-md border border-line px-2.5 py-1.5 text-sm outline-none focus:border-sky-500"
          />
        </div>
        <div className="grid grid-cols-2 gap-2">
          <button onClick={submit} className="rounded-md bg-navy-900 px-3 py-1.5 text-sm font-medium text-white hover:bg-navy-800">
            Cek koordinat
          </button>
          <button onClick={useGps} className="rounded-md border border-line px-3 py-1.5 text-sm font-medium text-navy-800 hover:bg-canvas">
            Lokasi saya
          </button>
        </div>
        {geoErr && <p className="text-xs text-amber-700">{geoErr}</p>}
      </div>

      <div className="mt-5 flex-1 border-t border-line pt-4">
        {!f.checkLoc && (
          <div className="flex h-full flex-col justify-center text-sm leading-relaxed text-ink-3">
            <p>Klik titik mana pun di peta, masukkan koordinat, atau gunakan lokasi perangkat.</p>
            <p className="mt-2">
              Nilai cuaca diperkirakan dari {model.data?.idw.k ?? 10} kecamatan terdekat dengan bobot 1/d². Zona iklim lokasi ditentukan dari
              centroid K-Means terdekat.
            </p>
          </div>
        )}
        {f.checkLoc && isFetching && <Loading h={300} />}
        {f.checkLoc && error && <p className="text-sm text-amber-700">{(error as Error).message}</p>}
        {data && !isFetching && (
          <div className="space-y-4">
            <div>
              <p className="tabular text-xs text-ink-3">
                {fmt(data.lat, 4)}, {fmt(data.lon, 4)}
              </p>
              <div className="mt-1 flex items-center gap-2">
                <ClusterDot id={data.cluster} size={12} />
                <p className="text-base font-semibold">Zona {data.cluster_nama}</p>
              </div>
              {!data.in_coverage && (
                <p className="mt-2 rounded bg-amber-50 px-2 py-1.5 text-xs text-amber-700">
                  Kecamatan terdekat berjarak {fmt(data.nearest[0]!.jarak_km, 0)} km. Lokasi berada di luar jangkauan data, jadi estimasi kurang
                  andal.
                </p>
              )}
            </div>
            <dl className="grid grid-cols-2 gap-2">
              {(Object.keys(data.values) as MetricKey[]).map((k) => (
                <div key={k} className="rounded-md bg-canvas px-2.5 py-2">
                  <dt className="text-[11px] text-ink-3">{METRICS[k].label}</dt>
                  <dd className="tabular text-[15px] font-semibold text-navy-900">{fmtMetric(k, data.values[k])}</dd>
                </div>
              ))}
            </dl>
            <div>
              <p className="mb-1.5 text-xs font-medium text-ink-3">Kecamatan acuan terdekat</p>
              <ul className="space-y-1">
                {data.nearest.slice(0, 5).map((n) => (
                  <li key={n.kecamatan + n.provinsi} className="flex items-center gap-2 text-[12px]">
                    <ClusterDot id={n.cluster} size={7} />
                    <span className="flex-1 truncate">{titleCase(n.kecamatan)}</span>
                    <span className="tabular text-ink-3">{fmt(n.jarak_km, 1)} km</span>
                    <span className="tabular w-10 text-right font-medium">{fmt(n.bobot * 100, 0)}%</span>
                  </li>
                ))}
              </ul>
              <p className="mt-1 text-[11px] text-ink-3">Persentase menunjukkan bobot IDW tiap kecamatan.</p>
            </div>
            <button onClick={() => f.setCheckLoc(null)} className="text-xs font-medium text-sky-600 hover:text-navy-700">
              Hapus titik
            </button>
          </div>
        )}
      </div>
    </Card>
  );
}
