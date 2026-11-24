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
      <header className="sticky top-0 z-[1200] border-b border-line bg-surface">
        <div className="mx-auto flex h-14 max-w-[1440px] items-center gap-4 px-4 sm:px-6">
          <NavLink to="/" className="hidden shrink-0 whitespace-nowrap text-[15px] font-bold text-ink sm:block">
            Dashboard Cuaca di Indonesia
          </NavLink>
          <nav className="mx-auto flex gap-0.5 overflow-x-auto rounded-full bg-[#eef1f6] p-[3px]">
            {NAV.map((n) => (
              <NavLink
                key={n.to}
                to={n.to}
                end
                className={({ isActive }) =>
                  `whitespace-nowrap rounded-full px-3.5 py-1.5 text-[13px] font-medium transition-all duration-150 ${
                    isActive ? "bg-surface text-brand-700 shadow-[0_1px_3px_rgba(16,40,80,0.14)]" : "text-ink-3 hover:text-ink"
                  }`
                }
              >
                {n.label}
              </NavLink>
            ))}
          </nav>
          {data && (
            <p className="tabular hidden shrink-0 items-center gap-2 rounded-full border border-line px-3 py-1.5 text-[12px] text-ink-2 md:flex">
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
      <footer className="border-t border-line bg-surface text-[12px] text-ink-3">
        <div className="mx-auto max-w-[1440px] px-4 py-4 sm:px-6">Projek Dashboard PSD Kelompok 3</div>
      </footer>
    </div>
  );
}
