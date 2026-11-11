import { NavLink, Outlet, useLocation } from "react-router-dom";
import { useEffect } from "react";
import { useMeta } from "../lib/api";

const NAV = [
  { to: "/", label: "Overview", sub: "Proyek, Data, EDA" },
  { to: "/modelling", label: "Preprocessing & Modelling", sub: "K-Means Clustering" },
  { to: "/dashboard", label: "Dashboard", sub: "Insight & Rekomendasi" },
];

export default function Layout() {
  const { data } = useMeta();
  const { pathname } = useLocation();
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);

  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-[1000] border-b border-navy-800 bg-navy-900 text-white">
        <div className="mx-auto flex max-w-[1440px] flex-wrap items-center gap-x-8 gap-y-2 px-4 py-3 sm:px-6">
          <div className="flex items-center gap-3">
            <img src="/favicon.svg" alt="" className="h-8 w-8" />
            <div className="leading-tight">
              <p className="text-[15px] font-semibold">Zonasi Iklim Kecamatan</p>
              <p className="text-xs text-white/60">Indonesia · K-Means Clustering</p>
            </div>
          </div>
          <nav className="flex flex-1 flex-wrap gap-1">
            {NAV.map((n, i) => (
              <NavLink
                key={n.to}
                to={n.to}
                end
                className={({ isActive }) =>
                  `rounded-md px-3 py-1.5 text-[13px] font-medium transition-colors ${
                    isActive ? "bg-white/12 text-white" : "text-white/65 hover:bg-white/6 hover:text-white"
                  }`
                }
              >
                <span className="mr-1.5 font-mono text-[11px] text-sky-500">0{i + 1}</span>
                {n.label}
              </NavLink>
            ))}
          </nav>
          {data && (
            <p className="tabular text-xs text-white/60">
              Snapshot {new Date(data.meta.tanggal).toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" })},{" "}
              {data.meta.waktu.slice(0, 5)}
            </p>
          )}
        </div>
      </header>
      <main className="mx-auto max-w-[1440px] px-4 py-8 sm:px-6">
        <Outlet />
      </main>
      <footer className="border-t border-line py-6 text-center text-xs text-ink-3">
        Projek Dashboard PSD · Notebook Python (scikit-learn) · API Bun + Elysia + SQLite · React
      </footer>
    </div>
  );
}
