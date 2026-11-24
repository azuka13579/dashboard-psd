import { NavLink, Outlet, useLocation } from "react-router-dom";
import { useEffect } from "react";
import { useMeta } from "../lib/api";

const NAV = [
  { to: "/", label: "Overview", sub: "Proyek, data, EDA" },
  { to: "/modelling", label: "Modelling", sub: "Preprocessing & K-Means" },
  { to: "/dashboard", label: "Dashboard", sub: "Peta, insight, rekomendasi" },
];

export default function Layout() {
  const { data } = useMeta();
  const { pathname } = useLocation();
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);

  const tanggal = data
    ? new Date(data.meta.tanggal).toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" })
    : null;

  return (
    <div className="min-h-screen lg:flex">
      {/* Sidebar (layar lebar) */}
      <aside className="hidden lg:block lg:w-[232px] lg:shrink-0">
        <div className="glass sticky top-3 m-3 flex h-[calc(100vh-24px)] flex-col rounded-3xl p-4">
          <NavLink to="/" className="px-2 pb-5 pt-1">
            <p className="text-[18px] font-bold leading-tight text-ink">Cuaca Indonesia</p>
            <p className="mt-0.5 text-[12px] text-ink-3">Zonasi iklim kecamatan</p>
          </NavLink>
          <nav className="space-y-1">
            {NAV.map((n) => (
              <NavLink
                key={n.to}
                to={n.to}
                end
                className={({ isActive }) =>
                  `relative block rounded-2xl px-3 py-2.5 transition-colors duration-150 ${
                    isActive
                      ? "bg-white/[0.08] text-ink before:absolute before:-left-4 before:top-1/2 before:h-6 before:w-[3px] before:-translate-y-1/2 before:rounded-r-full before:bg-brand-500"
                      : "text-ink-3 hover:bg-white/[0.04] hover:text-ink"
                  }`
                }
              >
                <span className="block text-[14px] font-semibold">{n.label}</span>
                <span className="block text-[11.5px] text-ink-3">{n.sub}</span>
              </NavLink>
            ))}
          </nav>
          {tanggal && data && (
            <div className="glass-sub mt-auto rounded-2xl p-3">
              <p className="text-[11px] text-ink-3">Waktu pengamatan</p>
              <p className="tabular mt-0.5 text-[13.5px] font-semibold text-ink">{tanggal}</p>
              <p className="tabular text-[12px] text-ink-2">Pukul {data.meta.waktu.slice(0, 5)}</p>
              <p className="mt-2 border-t border-line pt-2 text-[11px] text-ink-3">Projek Dashboard PSD Kelompok 3</p>
            </div>
          )}
        </div>
      </aside>

      {/* Bar atas (layar kecil) */}
      <header className="sticky top-0 z-[1200] border-b border-line bg-[#0b0d10]/90 backdrop-blur-md lg:hidden">
        <div className="flex items-center gap-3 px-4 py-2.5">
          <span className="hidden text-[15px] font-bold text-ink sm:block">Cuaca Indonesia</span>
          <nav className="flex gap-1 overflow-x-auto rounded-full bg-white/[0.06] p-[3px]">
            {NAV.map((n) => (
              <NavLink
                key={n.to}
                to={n.to}
                end
                className={({ isActive }) =>
                  `whitespace-nowrap rounded-full px-3.5 py-1.5 text-[13px] font-medium transition-colors ${isActive ? "bg-white/[0.14] text-ink" : "text-ink-3"}`
                }
              >
                {n.label}
              </NavLink>
            ))}
          </nav>
        </div>
      </header>

      <main className="min-w-0 flex-1 px-4 pb-10 pt-5 sm:px-6 lg:pl-3 lg:pr-6">
        <div className="mx-auto max-w-[1480px]">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
