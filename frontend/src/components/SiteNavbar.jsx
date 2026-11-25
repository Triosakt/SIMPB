import { useEffect, useRef, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import {
  ArrowUpRight,
  ChevronDown,
  LogOut,
  Menu,
  X,
  Shield,
  LayoutDashboard,
} from "lucide-react";
import { useAuth } from "../context/AuthContext.jsx";

const navGroups = [
  { label: "Tentang Kami", items: [
    { label: "Tentang Proses Bisnis", href: "/tentang" },
    { label: "Tugas Ortala", href: "/tentang/tugas-ortala" },
  ] },
  { label: "Dokumen", items: [
    { label: "Standar Pelayanan", href: "/standar-pelayanan" },
    { label: "Peta Proses", href: "/dokumen/peta" },
    { label: "Sub Proses", href: "/dokumen/sub" },
    { label: "Cross Functional Map (CFM)", href: "/dokumen/cfm" },
    { label: "Standar Operasional Prosedur (SOP)", href: "/dokumen/sop" },
  ] },
  { label: "Informasi", items: [
    { label: "Berita", href: "/informasi/berita" },
    { label: "Pengumuman", href: "/informasi/pengumuman" },
    { label: "Statistik", href: "/statistik-publik" },
  ] },
];

export default function SiteNavbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const desktopRef = useRef(null);
  const [desktopOpen, setDesktopOpen] = useState(null);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [mobileGroup, setMobileGroup] = useState(null);
  const canDashboard = ["admin_ortala", "perwakilan_unit"].includes(user?.role);

  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [logoutLoading, setLogoutLoading] = useState(false);

  useEffect(() => {
    setDesktopOpen(null);
    setMobileOpen(false);
    setMobileGroup(null);
  }, [location.pathname, location.hash]);

  useEffect(() => {
    function onPointerDown(event) {
      if (desktopRef.current && !desktopRef.current.contains(event.target)) setDesktopOpen(null);
    }
    function onKeyDown(event) {
      if (event.key === "Escape") {
        setDesktopOpen(null);
        setMobileOpen(false);
        setMobileGroup(null);
      }
    }
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, []);

  async function exit() {
  if (logoutLoading) return;

  try {
    setLogoutLoading(true);

    setDesktopOpen(null);
    setMobileOpen(false);
    setShowLogoutConfirm(false);

    await logout();

    navigate("/login", {
      replace: true,
      state: {
        logoutSuccess: true,
      },
    });
  } catch (error) {
    console.error("Gagal logout:", error);
    setShowLogoutConfirm(true);
  } finally {
    setLogoutLoading(false);
  }
}

  
return (
  <>
    {/* SPACER HEADER */}
    <div aria-hidden="true" className="h-[112px] shrink-0" />

    <header className="fixed inset-x-0 top-0 z-[100] isolate border-b border-[#e0e8f1] bg-white/95 shadow-sm backdrop-blur-xl">

 {/* TOP BAR */}
<div className="relative isolate overflow-hidden border-b border-white/10 bg-gradient-to-r from-[#071a35] via-[#0b2d50] to-[#104b7a] text-white">

  {/* EFEK CAHAYA BERGERAK */}
  <div
    aria-hidden="true"
    className="pointer-events-none absolute inset-0 z-0 animate-shimmer bg-gradient-to-r from-transparent via-white/15 to-transparent"
  />

  {/* EFEK KILAUAN HALUS */}
  <div
    aria-hidden="true"
    className="pointer-events-none absolute -top-10 left-0 h-20 w-full bg-cyan-300/[0.08] blur-2xl"
  />

  {/* KONTEN TOPBAR */}
  <div className="relative z-10 mx-auto flex min-h-[36px] max-w-[1200px] items-center justify-between gap-3 px-4 sm:px-6 lg:px-8">

    {/* IDENTITAS PORTAL */}
    <div className="flex min-w-0 items-center gap-2">
      <Shield
        size={15}
        className="shrink-0 text-cyan-300"
        strokeWidth={2.2}
      />

      <span className="truncate text-[10px] font-bold tracking-wide text-white sm:text-xs">
        Portal Resmi SIMPB BAPETEN
        <span className="hidden text-white/70 sm:inline">
          {" "}• Badan Pengawas Tenaga Nuklir
        </span>
      </span>
    </div>

    {/* INFORMASI KANAN */}
    <div className="hidden shrink-0 items-center gap-5 sm:flex">

      <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.06] px-3 py-1 text-[10px] font-bold text-slate-200 shadow-sm backdrop-blur-sm">
        <span className="h-1.5 w-1.5 rounded-full bg-cyan-300 shadow-[0_0_8px_rgba(103,232,249,0.8)]" />
        Portal Dokumentasi Terintegrasi
      </span>

      <a
        href="/informasi/berita"
        className="text-[11px] font-bold text-slate-200/80 transition hover:text-cyan-300"
      >
        Informasi Publik
      </a>

      <a
        href="/informasi/pengumuman"
        className="text-[11px] font-bold text-slate-200/80 transition hover:text-cyan-300"
      >
        Pengumuman
      </a>

    </div>
  </div>
</div>

      {/* MAIN NAVBAR */}
      <div className="mx-auto flex min-h-[76px] max-w-[1200px] items-center justify-between gap-3 px-4 sm:px-6 lg:px-8">

        {/* LOGO DAN IDENTITAS */}
        <Link
          to="/"
          onClick={() => {
            setDesktopOpen(null);
            setMobileOpen(false);
          }}
          className="flex min-w-0 shrink-0 items-center gap-3"
        >
          <img
            src="/img/logo.png"
            alt="Logo BAPETEN"
            className="h-11 w-11 shrink-0 object-contain"
          />

          <span className="min-w-0">
            <span className="block text-sm font-extrabold tracking-tight text-[#104b7a] sm:text-base">
              SIMPB BAPETEN
            </span>

            <span className="mt-0.5 block text-[9px] font-semibold tracking-[0.12em] text-slate-500 sm:text-[10px]">
              SISTEM INFORMASI PROSES BISNIS
            </span>
          </span>
        </Link>

        {/* NAVIGASI DESKTOP */}
        <nav
          ref={desktopRef}
          aria-label="Navigasi utama"
          className="hidden items-center gap-1 lg:flex"
        >
          <Link
            to="/"
            onClick={() => setDesktopOpen(null)}
            className="rounded-xl px-3 py-2.5 text-sm font-semibold text-slate-600 transition hover:bg-[#eaf3fb] hover:text-[#1769aa]"
          >
            Beranda
          </Link>

          {navGroups.map((group, index) => (
            <div key={group.label} className="relative">
              <button
                type="button"
                aria-haspopup="true"
                aria-expanded={desktopOpen === index}
                onClick={() =>
                  setDesktopOpen((current) =>
                    current === index ? null : index
                  )
                }
                className="inline-flex items-center gap-1.5 rounded-xl px-3 py-2.5 text-sm font-semibold text-slate-600 transition hover:bg-[#eaf3fb] hover:text-[#1769aa] aria-expanded:bg-[#eaf3fb] aria-expanded:text-[#104b7a]"
              >
                {group.label}

                <ChevronDown
                  size={15}
                  className={
                    "transition-transform duration-200 " +
                    (desktopOpen === index ? "rotate-180" : "")
                  }
                />
              </button>

              {desktopOpen === index && (
                <div
                  className={
                    "absolute top-full z-[110] mt-2 w-[270px] rounded-2xl border border-[#e0e8f1] bg-white p-2 shadow-2xl shadow-slate-900/15 " +
                    (index === navGroups.length - 1
                      ? "right-0"
                      : "left-0")
                  }
                >
                  {group.items.map((item) => (
                    <Link
                      key={item.href}
                      to={item.href}
                      onClick={() => setDesktopOpen(null)}
                      className="block rounded-xl px-3 py-3 text-sm font-medium leading-5 text-slate-600 transition hover:bg-[#eaf3fb] hover:text-[#1769aa]"
                    >
                      {item.label}
                    </Link>
                  ))}
                </div>
              )}
            </div>
          ))}

          {canDashboard && (
  <Link
    to="/dashboard"
    onClick={() => setDesktopOpen(null)}
    className="ml-1 inline-flex shrink-0 items-center gap-2 rounded-2xl border-2 border-[#d5f4ff] bg-gradient-to-r from-[#91eaf3] via-[#91d8f5] to-[#91bdf5] px-5 py-3 text-sm font-extrabold text-[#102b46] shadow-[0_4px_15px_rgba(56,189,248,0.20)] transition-all duration-300 hover:scale-[1.02] hover:from-[#a5f1f7] hover:via-[#a1e0fa] hover:to-[#a2cafa] hover:shadow-[0_6px_20px_rgba(56,189,248,0.35)]"
  >
    <LayoutDashboard size={18} strokeWidth={2.2} />
    Dashboard
  </Link>
)}

          {user && (
            <button
              type="button"
             onClick={() => setShowLogoutConfirm(true)}
              title="Keluar dari aplikasi"
              className="ml-1 inline-flex shrink-0 items-center gap-2 rounded-xl border border-slate-200 px-3 py-2.5 text-sm font-semibold text-slate-600 transition hover:border-red-200 hover:bg-red-50 hover:text-red-600"
            >
              <LogOut size={16} />
              Keluar
            </button>
          )}
        </nav>

        {/* TOMBOL MOBILE */}
        <button
          type="button"
          aria-label={mobileOpen ? "Tutup menu" : "Buka menu"}
          aria-expanded={mobileOpen}
          onClick={() => {
            setMobileOpen((value) => !value);
            setDesktopOpen(null);
          }}
          className="grid h-10 w-10 shrink-0 place-items-center rounded-xl border border-[#e0e8f1] text-[#104b7a] transition hover:bg-[#eaf3fb] lg:hidden"
        >
          {mobileOpen ? <X size={21} /> : <Menu size={21} />}
        </button>
      </div>

      {/* NAVIGASI MOBILE */}
      {mobileOpen && (
        <nav
          aria-label="Navigasi seluler"
          className="max-h-[calc(100dvh-112px)] overflow-y-auto border-t border-[#e0e8f1] bg-white px-4 py-3 shadow-xl lg:hidden"
        >
          <div className="mx-auto flex max-w-[1200px] flex-col gap-1">

            <Link
              to="/"
              onClick={() => setMobileOpen(false)}
              className="rounded-lg px-3 py-3 text-sm font-semibold text-slate-600 hover:bg-[#eaf3fb]"
            >
              Beranda
            </Link>

            {navGroups.map((group, index) => (
              <div key={group.label} className="rounded-xl">
                <button
                  type="button"
                  aria-expanded={mobileGroup === index}
                  onClick={() =>
                    setMobileGroup((current) =>
                      current === index ? null : index
                    )
                  }
                  className="flex w-full items-center justify-between rounded-xl px-3 py-3 text-left text-sm font-semibold text-slate-600 hover:bg-[#eaf3fb]"
                >
                  {group.label}

                  <ChevronDown
                    size={16}
                    className={
                      "transition-transform duration-200 " +
                      (mobileGroup === index ? "rotate-180" : "")
                    }
                  />
                </button>

                {mobileGroup === index && (
                  <div className="ml-3 space-y-1 border-l-2 border-[#d7e8f7] py-1 pl-3">
                    {group.items.map((item) => (
                      <Link
                        key={item.href}
                        to={item.href}
                        onClick={() => setMobileOpen(false)}
                        className="block rounded-lg px-3 py-2.5 text-sm text-slate-600 hover:bg-[#eaf3fb] hover:text-[#1769aa]"
                      >
                        {item.label}
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            ))}

            {canDashboard && (
              <Link
                to="/dashboard"
                onClick={() => setMobileOpen(false)}
                className="mt-2 inline-flex items-center justify-center gap-2 rounded-xl bg-[#1769aa] px-4 py-3 text-sm font-bold text-white"
              >
                Dashboard
                <ArrowUpRight size={15} />
              </Link>
            )}

            {user && (
              <button
                type="button"
                onClick={exit}
                className="mt-2 inline-flex items-center justify-center gap-2 rounded-xl border border-red-200 px-4 py-3 text-sm font-semibold text-red-600 hover:bg-red-50"
              >
                <LogOut size={16} />
                Keluar
              </button>
            )}
          </div>
        </nav>
      )}
    </header>
    
    
{/* MODAL KONFIRMASI LOGOUT */}
{showLogoutConfirm && (
  <div
    className="fixed inset-0 z-[200] flex items-center justify-center bg-slate-950/50 px-4 backdrop-blur-sm"
    onClick={() => {
      if (!logoutLoading) setShowLogoutConfirm(false);
    }}
  >
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="logout-title"
      className="w-full max-w-[400px] overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl"
      onClick={(e) => e.stopPropagation()}
    >
      {/* HEADER MODAL */}
      <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
        <div className="flex items-center gap-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-red-50 text-red-600">
            <LogOut size={18} />
          </div>

          <h2
            id="logout-title"
            className="text-base font-extrabold text-[#123b63]"
          >
            Konfirmasi Keluar
          </h2>
        </div>

        <button
          type="button"
          disabled={logoutLoading}
          onClick={() => setShowLogoutConfirm(false)}
          className="rounded-lg p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 disabled:opacity-50"
          aria-label="Tutup konfirmasi"
        >
          <X size={19} />
        </button>
      </div>

      {/* ISI MODAL */}
      <div className="px-6 py-6 text-center">
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-red-50 text-red-500">
          <LogOut size={29} />
        </div>

        <h3 className="text-lg font-bold text-slate-800">
          Apakah Anda yakin?
        </h3>

        <p className="mx-auto mt-2 max-w-[290px] text-sm leading-6 text-slate-500">
          Anda akan keluar dari akun SIMPB BAPETEN.
          Pastikan pekerjaan Anda sudah selesai.
        </p>
      </div>

      {/* TOMBOL AKSI */}
      <div className="flex gap-3 border-t border-slate-100 bg-slate-50 px-5 py-4">
        <button
          type="button"
          disabled={logoutLoading}
          onClick={() => setShowLogoutConfirm(false)}
          className="flex-1 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-bold text-slate-600 transition hover:bg-slate-100 disabled:opacity-50"
        >
          Batal
        </button>

        <button
          type="button"
          disabled={logoutLoading}
          onClick={exit}
          className="flex-1 inline-flex items-center justify-center gap-2 rounded-xl bg-red-600 px-4 py-2.5 text-sm font-bold text-white shadow-sm transition hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {logoutLoading ? (
            <>
              <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
              Memproses...
            </>
          ) : (
            <>
              <LogOut size={16} />
              Ya, Keluar
            </>
          )}
        </button>
      </div>
    </div>
  </div>
)}
</>
);

}
