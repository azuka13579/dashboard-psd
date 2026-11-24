import type { ReactNode } from "react";
import ReactECharts from "echarts-for-react";
import { CLUSTER_COLORS } from "../lib/theme";

type Tone = "light" | "dark";

/** Kartu dasar: putih, sudut membulat, bayangan lembut. */
export function Panel({ children, className = "", pad = true }: { children: ReactNode; className?: string; pad?: boolean }) {
  return (
    <div className={`glass rounded-3xl ${pad ? "p-5" : ""} ${className}`}>{children}</div>
  );
}

export function PanelHeader({ title, sub, right, className = "" }: { title: string; sub?: string; right?: ReactNode; className?: string }) {
  return (
    <div className={`mb-3 flex flex-wrap items-start justify-between gap-x-4 gap-y-2 ${className}`}>
      <div className="min-w-0">
        <h3 className="text-[14px] font-semibold text-ink">{title}</h3>
        {sub && <p className="mt-0.5 text-[12px] text-ink-3">{sub}</p>}
      </div>
      {right}
    </div>
  );
}

/** Header kartu untuk Panel pad={false}: judul di kiri, kontrol di kanan, garis tipis di bawah. */
export function PanelBar({ title, sub, right }: { title: string; sub?: string; right?: ReactNode }) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 border-b border-white/70 px-5 py-3.5">
      <div className="min-w-0">
        <h3 className="text-[14px] font-semibold text-ink">{title}</h3>
        {sub && <p className="text-[12px] text-ink-3">{sub}</p>}
      </div>
      {right}
    </div>
  );
}

/** Judul halaman sederhana di atas kanvas. */
export function PageHeader({ title, desc, right, children, flush }: { title: string; desc?: ReactNode; right?: ReactNode; children?: ReactNode; flush?: boolean }) {
  return (
    <div className={flush ? "mb-3" : "mb-5"}>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="max-w-3xl">
          <h1 className="text-[26px] font-semibold leading-tight tracking-tight text-ink">{title}</h1>
          {desc && <p className="mt-1 text-[13.5px] leading-relaxed text-ink-3">{desc}</p>}
        </div>
        {right}
      </div>
      {children && <div className="mt-4 space-y-4">{children}</div>}
    </div>
  );
}

/** Judul bagian di dalam halaman. */
export function Section({ title, desc, children, id, right }: { title: string; desc?: string; children: ReactNode; id?: string; right?: ReactNode }) {
  return (
    <section id={id} className="scroll-mt-28">
      <div className="mb-3 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="flex items-center gap-2.5 text-[16px] font-semibold text-ink">
            <span aria-hidden className="h-4 w-1 rounded-full bg-brand-600" />
            {title}
          </h2>
          {desc && <p className="mt-0.5 max-w-3xl pl-3.5 text-[12.5px] text-ink-3">{desc}</p>}
        </div>
        {right}
      </div>
      <div className="space-y-4">{children}</div>
    </section>
  );
}

export type Kpi = { label: string; value: string; unit?: string; hint?: string; accent?: "amber" | "sky" };

/** Deret kartu KPI kecil. */
export function KpiStrip({ items }: { items: Kpi[]; tone?: Tone }) {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-flow-col xl:auto-cols-fr xl:grid-cols-none">
      {items.map((k) => (
        <div key={k.label} className="glass rounded-2xl px-4 py-3">
          <p className="text-[12px] font-medium text-ink-3">{k.label}</p>
          <p className={`tabular mt-1 text-[26px] font-light leading-tight ${k.accent === "amber" ? "text-amber-700" : "text-ink"}`}>
            {k.value}
            {k.unit && <span className="ml-1 text-[12.5px] font-medium text-ink-3">{k.unit}</span>}
          </p>
          {k.hint && <p className="tabular mt-0.5 truncate text-[11.5px] text-ink-3">{k.hint}</p>}
        </div>
      ))}
    </div>
  );
}

/** Grup tombol berbentuk pil, pilihan aktif berupa chip putih. */
export function Segmented<T extends string>({
  value,
  options,
  onChange,
  size = "md",
  label,
}: {
  value: T;
  options: { value: T; label: string; badge?: string | number }[];
  onChange: (v: T) => void;
  size?: "sm" | "md";
  label?: string;
  tone?: Tone;
}) {
  return (
    <div role="radiogroup" aria-label={label} className="inline-flex flex-wrap gap-0.5 rounded-full bg-white/55 p-[3px] ring-1 ring-white/80 backdrop-blur-sm">
      {options.map((o) => {
        const active = value === o.value;
        return (
          <button
            key={o.value}
            role="radio"
            aria-checked={active}
            onClick={() => onChange(o.value)}
            className={`inline-flex items-center gap-1.5 rounded-full font-medium transition-all duration-150 ${size === "sm" ? "px-2.5 py-[3px] text-[12px]" : "px-3.5 py-1.5 text-[13px]"} ${
              active ? "bg-gradient-to-b from-sky-500 to-brand-600 text-white shadow-[0_2px_8px_rgba(31,99,198,0.35)]" : "text-ink-2 hover:text-ink"
            }`}
          >
            {o.label}
            {o.badge !== undefined && (
              <span className={`tabular rounded-full px-1.5 text-[10.5px] ${active ? "bg-brand-100 text-brand-700" : "bg-line text-ink-3"}`}>{o.badge}</span>
            )}
          </button>
        );
      })}
    </div>
  );
}

/** Label pil kecil. */
export function Pill({ children, tone = "brand" }: { children: ReactNode; tone?: "brand" | "amber" | "neutral" }) {
  const cls = tone === "amber" ? "bg-amber-50 text-amber-700" : tone === "neutral" ? "bg-[#eef1f6] text-ink-2" : "bg-brand-50 text-brand-700";
  return <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11.5px] font-medium ${cls}`}>{children}</span>;
}

/** Cincin persentase (0-100). */
export function Ring({ value, size = 76, stroke = 7, label, tone = "dark" }: { value: number; size?: number; stroke?: number; label?: string; tone?: Tone }) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const v = Math.max(0, Math.min(100, value));
  const light = tone === "light";
  const gid = `ring-${size}-${stroke}`;
  return (
    <div className="relative shrink-0" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <defs>
          <linearGradient id={gid} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#22d3ee" />
            <stop offset="100%" stopColor="#1f63c6" />
          </linearGradient>
        </defs>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={light ? "rgba(31,99,198,0.12)" : "rgba(255,255,255,0.22)"} strokeWidth={stroke} />
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={light ? `url(#${gid})` : "#fff"} strokeWidth={stroke} strokeLinecap="round" strokeDasharray={`${(v / 100) * c} ${c}`} />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center leading-none">
        <span className={`tabular text-[15px] font-semibold ${light ? "text-ink" : "text-white"}`}>{v.toLocaleString("id-ID", { maximumFractionDigits: 1 })}%</span>
        {label && <span className={`mt-1 text-[9.5px] ${light ? "text-ink-3" : "text-white/75"}`}>{label}</span>}
      </div>
    </div>
  );
}

/** Histogram mini (sebaran nilai) untuk kartu KPI. */
export function MiniHist({ values, color, bins = 18, height = 34 }: { values: number[]; color: string; bins?: number; height?: number }) {
  if (values.length < 2) return <div style={{ height }} />;
  const min = Math.min(...values);
  const max = Math.max(...values);
  const w = (max - min) / bins || 1;
  const counts = new Array(bins).fill(0);
  for (const v of values) counts[Math.min(bins - 1, Math.floor((v - min) / w))]++;
  const top = Math.max(...counts);
  const W = 120;
  const pts = counts.map((n, i) => [(i / (bins - 1)) * W, height - 2 - (n / top) * (height - 4)]);
  const line = pts.map((p, i) => `${i ? "L" : "M"}${p[0]!.toFixed(1)},${p[1]!.toFixed(1)}`).join(" ");
  return (
    <svg viewBox={`0 0 ${W} ${height}`} preserveAspectRatio="none" className="w-full" style={{ height }} aria-hidden>
      <path d={`${line} L${W},${height} L0,${height} Z`} fill={color} opacity={0.12} />
      <path d={line} fill="none" stroke={color} strokeWidth={1.6} strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
    </svg>
  );
}

export function Chart({ option, height = 280, onEvents }: { option: object; height?: number; onEvents?: Record<string, (p: any) => void> }) {
  return <ReactECharts option={option} style={{ height, width: "100%" }} notMerge lazyUpdate onEvents={onEvents} />;
}

export function ClusterDot({ id, size = 9, onDark }: { id: number; size?: number; onDark?: boolean }) {
  return <span aria-hidden className={`inline-block shrink-0 rounded-full ${onDark ? "ring-1 ring-white/60" : ""}`} style={{ width: size, height: size, background: CLUSTER_COLORS[id] }} />;
}

export function ClusterLegend({ clusters, tone = "light" }: { clusters: { id: number; nama: string }[]; tone?: Tone }) {
  return (
    <div className="flex flex-wrap gap-x-3.5 gap-y-1">
      {clusters.map((c) => (
        <span key={c.id} className={`inline-flex items-center gap-1.5 text-[12px] ${tone === "dark" ? "text-white/85" : "text-ink-2"}`}>
          <ClusterDot id={c.id} onDark={tone === "dark"} />
          {c.nama}
        </span>
      ))}
    </div>
  );
}

export function Loading({ h = 200, tone = "light" }: { h?: number; tone?: Tone }) {
  return <div className={`animate-pulse rounded-lg ${tone === "dark" ? "bg-white/10" : "bg-white/55"}`} style={{ height: h }} />;
}

export function ErrorBox({ error }: { error: unknown }) {
  return (
    <div className="rounded-xl border border-amber-600/30 bg-amber-50 px-4 py-3 text-[13px] text-amber-700">
      {error instanceof Error ? error.message : "Terjadi kesalahan"}. Pastikan backend berjalan di port 3000, lalu muat ulang halaman.
    </div>
  );
}

export function Table({ head, rows, align, dense }: { head: ReactNode[]; rows: ReactNode[][]; align?: ("l" | "r")[]; dense?: boolean }) {
  const py = dense ? "py-1.5" : "py-2";
  return (
    <div className="overflow-x-auto rounded-2xl border border-white/70 bg-white/40">
      <table className="w-full text-[13px]">
        <thead>
          <tr className="bg-white/55 text-left text-[11.5px] uppercase tracking-wide text-ink-3">
            {head.map((h, i) => (
              <th key={i} className={`px-3 py-2 font-semibold ${align?.[i] === "r" ? "text-right" : ""}`}>
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={i} className="border-t border-white/70 transition-colors hover:bg-white/60">
              {r.map((c, j) => (
                <td key={j} className={`px-3 ${py} text-ink ${align?.[j] === "r" ? "tabular text-right" : ""}`}>
                  {c}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
