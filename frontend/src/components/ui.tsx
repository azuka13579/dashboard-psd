import type { ReactNode } from "react";
import ReactECharts from "echarts-for-react";
import { CLUSTER_COLORS } from "../lib/theme";

type Tone = "light" | "dark";

/** Panel dasar: permukaan putih dengan garis tipis. */
export function Panel({ children, className = "", pad = true }: { children: ReactNode; className?: string; pad?: boolean }) {
  return (
    <div className={`rounded-lg border border-line bg-surface shadow-[0_1px_2px_rgba(15,42,68,0.05)] ${pad ? "p-4" : ""} ${className}`}>{children}</div>
  );
}

export function PanelHeader({ title, sub, right, className = "" }: { title: string; sub?: string; right?: ReactNode; className?: string }) {
  return (
    <div className={`mb-3 flex flex-wrap items-start justify-between gap-x-4 gap-y-2 ${className}`}>
      <div className="min-w-0">
        <h3 className="text-[14px] font-semibold text-navy-900">{title}</h3>
        {sub && <p className="mt-0.5 text-[12.5px] text-ink-3">{sub}</p>}
      </div>
      {right}
    </div>
  );
}

/** Strip judul navy di bagian atas panel (dipakai dengan Panel pad={false}). */
export function PanelBar({ title, sub, right }: { title: string; sub?: string; right?: ReactNode }) {
  return (
    <div className="on-dark flex flex-wrap items-center justify-between gap-x-4 gap-y-2 rounded-t-[7px] bg-navy-900 px-4 py-2.5 text-white">
      <div className="min-w-0">
        <h3 className="text-[14px] font-semibold">{title}</h3>
        {sub && <p className="text-[12px] text-sky-100/75">{sub}</p>}
      </div>
      {right}
    </div>
  );
}

/** Pita judul halaman berwarna navy selebar layar. Children (KPI, filter) ikut di dalam pita. */
export function PageHeader({ title, desc, right, children, flush }: { title: string; desc?: ReactNode; right?: ReactNode; children?: ReactNode; flush?: boolean }) {
  return (
    <div className={`bleed-navy on-dark -mt-6 pb-5 pt-6 text-white ${flush ? "" : "mb-5"}`}>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="max-w-3xl">
          <h1 className="text-[22px] font-bold leading-tight">{title}</h1>
          {desc && <p className="mt-1.5 text-[13.5px] leading-relaxed text-sky-100/80">{desc}</p>}
        </div>
        {right}
      </div>
      {children && <div className="mt-5 space-y-4">{children}</div>}
    </div>
  );
}

/** Judul bagian di dalam halaman, dengan penanda navy kecil. */
export function Section({ title, desc, children, id, right }: { title: string; desc?: string; children: ReactNode; id?: string; right?: ReactNode }) {
  return (
    <section id={id} className="scroll-mt-28">
      <div className="mb-3 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="flex items-center gap-2.5 text-[17px] font-semibold text-navy-900">
            <span aria-hidden className="h-4 w-1 rounded-full bg-sky-500" />
            {title}
          </h2>
          {desc && <p className="mt-0.5 max-w-3xl pl-3.5 text-[13px] text-ink-3">{desc}</p>}
        </div>
        {right}
      </div>
      <div className="space-y-4">{children}</div>
    </section>
  );
}

export type Kpi = { label: string; value: string; unit?: string; hint?: string; accent?: "amber" | "sky" };

/** Strip KPI yang dibagi garis tipis. Tone "dark" untuk di atas pita navy. */
export function KpiStrip({ items, tone = "light" }: { items: Kpi[]; tone?: Tone }) {
  const dark = tone === "dark";
  return (
    <div
      className={`grid grid-cols-2 overflow-hidden rounded-lg sm:grid-cols-3 xl:grid-flow-col xl:auto-cols-fr xl:grid-cols-none ${
        dark ? "bg-navy-800 ring-1 ring-white/12" : "border border-line bg-surface"
      }`}
    >
      {items.map((k) => {
        const valueColor = dark ? (k.accent === "amber" ? "text-[#F2C46B]" : "text-white") : k.accent === "amber" ? "text-amber-700" : "text-navy-900";
        return (
          <div key={k.label} className={`border-b border-r px-4 py-3 xl:border-b-0 xl:last:border-r-0 ${dark ? "border-white/10" : "border-line-2"}`}>
            <p className={`text-[12px] font-medium ${dark ? "text-sky-100/70" : "text-ink-3"}`}>{k.label}</p>
            <p className={`tabular mt-1 text-[21px] font-semibold leading-tight ${valueColor}`}>
              {k.value}
              {k.unit && <span className={`ml-1 text-[13px] font-medium ${dark ? "text-sky-100/65" : "text-ink-3"}`}>{k.unit}</span>}
            </p>
            {k.hint && <p className={`tabular mt-0.5 truncate text-[12px] ${dark ? "text-sky-100/60" : "text-ink-3"}`}>{k.hint}</p>}
          </div>
        );
      })}
    </div>
  );
}

export function Segmented<T extends string>({
  value,
  options,
  onChange,
  size = "md",
  label,
  tone = "light",
}: {
  value: T;
  options: { value: T; label: string }[];
  onChange: (v: T) => void;
  size?: "sm" | "md";
  label?: string;
  tone?: Tone;
}) {
  const dark = tone === "dark";
  return (
    <div role="radiogroup" aria-label={label} className={`inline-flex flex-wrap rounded-md p-0.5 ${dark ? "bg-white/10" : "bg-navy-50"}`}>
      {options.map((o) => {
        const active = value === o.value;
        const cls = dark
          ? active
            ? "bg-white text-navy-900"
            : "text-sky-100/80 hover:text-white"
          : active
            ? "bg-navy-900 text-white shadow-[0_1px_2px_rgba(15,42,68,0.2)]"
            : "text-navy-800/80 hover:text-navy-900";
        return (
          <button
            key={o.value}
            role="radio"
            aria-checked={active}
            onClick={() => onChange(o.value)}
            className={`rounded-[5px] font-medium transition-colors duration-150 ${size === "sm" ? "px-2.5 py-1 text-[12px]" : "px-3 py-1.5 text-[13px]"} ${cls}`}
          >
            {o.label}
          </button>
        );
      })}
    </div>
  );
}

export function Chart({ option, height = 280, onEvents }: { option: object; height?: number; onEvents?: Record<string, (p: any) => void> }) {
  return <ReactECharts option={option} style={{ height, width: "100%" }} notMerge lazyUpdate onEvents={onEvents} />;
}

export function ClusterDot({ id, size = 9, onDark }: { id: number; size?: number; onDark?: boolean }) {
  return <span aria-hidden className={`inline-block shrink-0 rounded-[3px] ${onDark ? "ring-1 ring-white/60" : ""}`} style={{ width: size, height: size, background: CLUSTER_COLORS[id] }} />;
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
  return <div className={`animate-pulse rounded-md ${tone === "dark" ? "bg-white/10" : "bg-line-2"}`} style={{ height: h }} />;
}

export function ErrorBox({ error }: { error: unknown }) {
  return (
    <div className="rounded-lg border border-amber-600/30 bg-amber-50 px-4 py-3 text-[13px] text-amber-700">
      {error instanceof Error ? error.message : "Terjadi kesalahan"}. Pastikan backend berjalan di port 3000, lalu muat ulang halaman.
    </div>
  );
}

export function Table({ head, rows, align, dense }: { head: ReactNode[]; rows: ReactNode[][]; align?: ("l" | "r")[]; dense?: boolean }) {
  const py = dense ? "py-1.5" : "py-2";
  return (
    <div className="overflow-x-auto rounded-md border border-line-2">
      <table className="w-full text-[13px]">
        <thead>
          <tr className="bg-navy-50 text-left text-[12px] text-navy-800">
            {head.map((h, i) => (
              <th key={i} className={`px-3 py-2 font-semibold ${align?.[i] === "r" ? "text-right" : ""}`}>
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={i} className="border-t border-line-2 transition-colors hover:bg-navy-50/50">
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
