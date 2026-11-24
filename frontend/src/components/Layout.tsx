import { NavLink, Outlet, useLocation } from "react-router-dom";
import { useEffect } from "react";
import { useMeta } from "../lib/api";

const NAV = [
  { to: "/", label: "Overview" },
  { to: "/modelling", label: "Preprocessing & Modelling" },
  { to: "/dashboard", label: "Dashboard" },
];

export default function Layout() {
  const { data } = useMeta();
  const { pathname } = useLocation();
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);

  return (
    <div className="min-h-screen">
      <header className="glass-soft sticky top-0 z-[1200] !border-x-0 !border-t-0">
        <div className="mx-auto flex h-14 max-w-[1440px] items-center gap-4 px-4 sm:px-6">
          <NavLink to="/" className="hidden shrink-0 whitespace-nowrap text-[15px] font-bold text-ink sm:block">
            Dashboard Cuaca di Indonesia
          </NavLink>
          <nav className="mx-auto flex gap-0.5 overflow-x-auto rounded-full bg-white/55 p-[3px] ring-1 ring-white/80">
            {NAV.map((n) => (
              <NavLink
                key={n.to}
                to={n.to}
                end
                className={({ isActive }) =>
                  `whitespace-nowrap rounded-full px-3.5 py-1.5 text-[13px] font-medium transition-all duration-150 ${
                    isActive ? "bg-gradient-to-b from-sky-500 to-brand-600 text-white shadow-[0_2px_8px_rgba(31,99,198,0.35)]" : "text-ink-2 hover:text-ink"
                  }`
                }
              >
                {n.label}
              </NavLink>
            ))}
          </nav>
          {data && (
            <p className="tabular hidden shrink-0 items-center gap-2 rounded-full bg-white/55 px-3 py-1.5 text-[12px] text-ink-2 ring-1 ring-white/80 md:flex">
              <span aria-hidden className="h-1.5 w-1.5 rounded-full bg-brand-600" />
              Data {new Date(data.meta.tanggal).toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" })}, pukul{" "}
              {data.meta.waktu.slice(0, 5)}
            </p>
          )}
        </div>
      </header>
      <main className="mx-auto max-w-[1440px] px-4 pb-8 pt-5 sm:px-6">
        <Outlet />
      </main>
      <footer className="border-t border-white/70 text-[12px] text-ink-3">
        <div className="mx-auto max-w-[1440px] px-4 py-4 sm:px-6">Projek Dashboard PSD Kelompok 3</div>
      </footer>
    </div>
  );
}
