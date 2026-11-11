import type { ReactNode } from "react";
import ReactECharts from "echarts-for-react";
import { CLUSTER_COLORS } from "../lib/theme";

export function Card({ children, className = "", pad = true }: { children: ReactNode; className?: string; pad?: boolean }) {
  return (
    <div className={`rounded-lg border border-line bg-surface ${pad ? "p-5" : ""} ${className}`}>{children}</div>
  );
}

export function CardTitle({ title, sub, right }: { title: string; sub?: string; right?: ReactNode }) {
  return (
    <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
      <div>
        <h3 className="text-[15px] font-semibold text-ink">{title}</h3>
        {sub && <p className="mt-0.5 text-[13px] text-ink-3">{sub}</p>}
      </div>
      {right}
    </div>
  );
}

/** Judul bagian bernomor, mengikuti urutan 7 bagian laporan. */
export function Section({ no, title, desc, children, id }: { no: string; title: string; desc?: string; children: ReactNode; id?: string }) {
  return (
    <section id={id} className="scroll-mt-24">
      <div className="mb-5 flex items-baseline gap-3 border-b border-line pb-3">
        <span className="font-mono text-sm font-medium text-sky-600">{no}</span>
        <div>
          <h2 className="text-xl font-semibold tracking-tight text-navy-900">{title}</h2>
          {desc && <p className="mt-1 max-w-3xl text-sm text-ink-2">{desc}</p>}
        </div>
      </div>
      <div className="space-y-5">{children}</div>
    </section>
  );
}

export function Stat({ label, value, unit, hint, accent }: { label: string; value: string; unit?: string; hint?: string; accent?: "amber" | "sky" }) {
  const bar = accent === "amber" ? "bg-amber-600" : accent === "sky" ? "bg-sky-500" : "bg-navy-700";
  return (
    <div className="relative overflow-hidden rounded-lg border border-line bg-surface px-4 py-3.5">
      <span className={`absolute inset-y-0 left-0 w-[3px] ${bar}`} />
      <p className="text-xs font-medium uppercase tracking-wide text-ink-3">{label}</p>
      <p className="tabular mt-1.5 text-2xl font-semibold text-navy-900">
        {value}
        {unit && <span className="ml-1 text-sm font-medium text-ink-3">{unit}</span>}
      </p>
      {hint && <p className="tabular mt-0.5 text-xs text-ink-3">{hint}</p>}
    </div>
  );
}

export function Segmented<T extends string>({
  value,
  options,
  onChange,
  size = "md",
}: {
  value: T;
  options: { value: T; label: string }[];
  onChange: (v: T) => void;
  size?: "sm" | "md";
}) {
  return (
    <div className="inline-flex flex-wrap rounded-md border border-line bg-canvas p-0.5">
      {options.map((o) => (
        <button
          key={o.value}
          onClick={() => onChange(o.value)}
          className={`rounded-[5px] font-medium transition-colors ${size === "sm" ? "px-2.5 py-1 text-xs" : "px-3 py-1.5 text-[13px]"} ${
            value === o.value ? "bg-surface text-navy-900 shadow-sm ring-1 ring-line" : "text-ink-2 hover:text-navy-900"
          }`}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

export function Chart({ option, height = 280, onEvents }: { option: object; height?: number; onEvents?: Record<string, (p: any) => void> }) {
  return <ReactECharts option={option} style={{ height, width: "100%" }} notMerge lazyUpdate onEvents={onEvents} />;
}

export function ClusterDot({ id, size = 10 }: { id: number; size?: number }) {
  return <span className="inline-block shrink-0 rounded-full" style={{ width: size, height: size, background: CLUSTER_COLORS[id] }} />;
}

export function ClusterLegend({ clusters }: { clusters: { id: number; nama: string }[] }) {
  return (
    <div className="flex flex-wrap gap-x-4 gap-y-1.5">
      {clusters.map((c) => (
        <span key={c.id} className="inline-flex items-center gap-1.5 text-xs text-ink-2">
          <ClusterDot id={c.id} />
          {c.nama}
        </span>
      ))}
    </div>
  );
}

export function Loading({ h = 200 }: { h?: number }) {
  return <div className="animate-pulse rounded-lg bg-line/60" style={{ height: h }} />;
}

export function ErrorBox({ error }: { error: unknown }) {
  return (
    <div className="rounded-lg border border-amber-600/30 bg-amber-50 p-4 text-sm text-amber-700">
      {error instanceof Error ? error.message : "Terjadi kesalahan"}. Pastikan backend berjalan di port 3000.
    </div>
  );
}

export function Table({ head, rows, align }: { head: ReactNode[]; rows: ReactNode[][]; align?: ("l" | "r")[] }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-[13px]">
        <thead>
          <tr className="border-b border-line text-left text-xs uppercase tracking-wide text-ink-3">
            {head.map((h, i) => (
              <th key={i} className={`px-3 py-2 font-medium ${align?.[i] === "r" ? "text-right" : ""}`}>
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={i} className="border-b border-line/70 last:border-0 hover:bg-canvas/70">
              {r.map((c, j) => (
                <td key={j} className={`px-3 py-2 text-ink ${align?.[j] === "r" ? "tabular text-right" : ""}`}>
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
