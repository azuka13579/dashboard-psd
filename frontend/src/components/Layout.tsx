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
      <header className="sticky top-0 z-[1200] h-14 border-b border-white/10 bg-navy-950 text-white">
        <div className="mx-auto flex h-full max-w-[1400px] items-center gap-4 px-4 sm:px-6 lg:gap-8">
          <NavLink to="/" className="flex shrink-0 items-center gap-2.5">
            <span className="hidden whitespace-nowrap text-[14px] font-bold sm:inline">Zonasi Iklim Kecamatan</span>
          </NavLink>
          <nav className="flex h-full gap-1 overflow-x-auto">
            {NAV.map((n) => (
              <NavLink
                key={n.to}
                to={n.to}
                end
                className={({ isActive }) =>
                  `relative flex h-full items-center whitespace-nowrap px-3 text-[13px] font-medium transition-colors duration-150 ${
                    isActive
                      ? "text-white after:absolute after:inset-x-3 after:bottom-0 after:h-[3px] after:rounded-t-full after:bg-sky-500"
                      : "text-sky-100/65 hover:text-white"
                  }`
                }
              >
                {n.label}
              </NavLink>
            ))}
          </nav>
          {data && (
            <p className="tabular ml-auto hidden shrink-0 rounded-full bg-white/8 px-3 py-1 text-[12px] text-sky-100/80 md:block">
              Data {new Date(data.meta.tanggal).toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" })}, pukul{" "}
              {data.meta.waktu.slice(0, 5)}
            </p>
          )}
        </div>
      </header>
      <main className="mx-auto max-w-[1400px] px-4 pb-8 pt-6 sm:px-6">
        <Outlet />
      </main>
      <footer className="bg-navy-950 text-[12px] text-sky-100/70">
        <div className="mx-auto max-w-[1400px] px-4 py-4 sm:px-6">Projek Dashboard PSD Kelompok 3</div>
      </footer>
    </div>
  );
}
