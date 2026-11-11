import { create } from "zustand";
import type { MetricKey } from "./api";

type Filters = {
  provinsi: string | undefined;
  metric: MetricKey;
  colorBy: "cluster" | "metric";
  /** Lokasi yang dicek pengguna (klik peta / GPS / input manual). */
  checkLoc: { lat: number; lon: number } | null;
  /** Titik yang disorot (mis. dari daftar peringkat). */
  focus: { lat: number; lon: number; label: string } | null;
  setProvinsi: (p: string | undefined) => void;
  setMetric: (m: MetricKey) => void;
  setColorBy: (c: "cluster" | "metric") => void;
  setCheckLoc: (l: { lat: number; lon: number } | null) => void;
  setFocus: (f: Filters["focus"]) => void;
};

export const useFilters = create<Filters>((set) => ({
  provinsi: undefined,
  metric: "suhu_C",
  colorBy: "cluster",
  checkLoc: null,
  focus: null,
  setProvinsi: (provinsi) => set({ provinsi, focus: null }),
  setMetric: (metric) => set({ metric }),
  setColorBy: (colorBy) => set({ colorBy }),
  setCheckLoc: (checkLoc) => set({ checkLoc }),
  setFocus: (focus) => set({ focus }),
}));
