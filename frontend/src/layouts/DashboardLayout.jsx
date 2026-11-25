import { useEffect, useState } from "react";
import { NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";
import {
  Activity, BookOpen, ChartNoAxesCombined, ChevronDown,
  ClipboardCheck, FileCheck2, Files, LayoutDashboard,
  LogOut, Menu, Network, Settings2, ShieldCheck,
  Upload, Users, X, Building2, House, Newspaper, Bell, MessageCircle
} from "lucide-react";
import { useAuth } from "../context/AuthContext.jsx";
import { useNotifications } from "../context/NotificationContext.jsx";
import NotifBell from "../components/NotifBell.jsx";
import ScrollToTop from "../components/ScrollToTop.jsx";
import SiteFooter from "../components/SiteFooter.jsx";
const UNIT = "perwakilan_unit";
const ADMIN = "admin_ortala";
const USER = "user_biasa";

const ROLE_LABEL = {
  [UNIT]: "Perwakilan Unit Kerja",
  [ADMIN]: "Administrator Ortala",
  [USER]: "Pengguna"
};

/* SIMPB_SIDEBAR_RAPI_V1 */
const NAV = [
  {
    to: "/",
    label: "Homepage",
    icon: House,
    roles: [UNIT, ADMIN, USER],
    end: true
  },
  {
    to: "/dashboard",
    label: "Dashboard",
    icon: LayoutDashboard,
    roles: [UNIT, ADMIN, USER],
    end: true
  },
  {
    to: "/dashboard/dokumen",
    label: "Daftar Dokumen",
    icon: BookOpen,
    roles: [UNIT, ADMIN]
  }
];

const GROUPS = [
  {
    id: "uploadUnit",
    label: "Upload Dokumen",
    icon: Upload,
    roles: [UNIT],
    items: [
      {
        to: "/dashboard/sop/upload",
        label: "Upload SOP",
        icon: Upload
      },
      {
        to: "/dashboard/proses/upload",
        label: "Peta Proses",
        icon: Network
      },
      {
        to: "/dashboard/proses/upload/sub",
        label: "Sub Proses",
        icon: FileCheck2
      },
      {
        to: "/dashboard/proses/upload/cfm",
        label: "Cross Functional Map (CFM)",
        icon: Files
      },
      {
        to: "/dashboard/standar-pelayanan?aksi=upload",
        label: "Standar Pelayanan",
        icon: ClipboardCheck
      }
    ]
  },
  {
    id: "dokumen",
    label: "Kelola Dokumen",
    icon: Files,
    roles: [ADMIN, UNIT],
    items: [
      {
        to: "/dashboard/manajemen-proses",
        label: "Manajemen Dokumen",
        icon: FileCheck2,
        roles: [ADMIN, UNIT]
      },
      {
        to: "/dashboard/approval",
        label: "Approval Dokumen",
        icon: ClipboardCheck,
        roles: [ADMIN]
      }
    ]
  },
  {
    id: "administrasi",
    label: "Administrasi",
    icon: Settings2,
    roles: [ADMIN],
    items: [
      {
        to: "/dashboard/organisasi",
        label: "Unit Kerja & Lembaga",
        icon: Building2
      },
      {
        to: "/dashboard/users",
        label: "Manajemen Pengguna",
        icon: Users
      }
    ]
  },
  {
    id: "informasi",
    label: "Informasi",
    icon: Newspaper,
    roles: [ADMIN],
    items: [
      {
        to: "/dashboard/berita",
        label: "Berita",
        icon: Newspaper
      },
      {
        to: "/dashboard/pengumuman",
        label: "Pengumuman",
        icon: Bell
      }
    ]
  }
];

const EXTRA_NAV = [
  {
    to: "/dashboard/statistik",
    label: "Statistik & Cetak",
    icon: ChartNoAxesCombined,
    roles: [UNIT, ADMIN]
  }
];

function NavItem({ item, closeMenu }) {
  const Icon = item.icon;

  return (
    <NavLink
      to={item.to}
      end={true}
      onClick={closeMenu}
      className={({ isActive }) =>
        `simp-nav-link group flex items-center gap-3 rounded-2xl px-3 py-3 text-[13px] font-medium transition-all duration-300 ${
          isActive
            ? "bg-gradient-to-r from-cyan-300 via-sky-300 to-blue-400 font-bold text-[#071a35] shadow-lg shadow-cyan-400/20 ring-1 ring-white/50"
            : "text-slate-200/80 hover:translate-x-1 hover:bg-white/[0.08] hover:text-white"
        }`
      }
    >
      <Icon size={18} strokeWidth={1.8} className="shrink-0 transition-transform duration-200 group-hover:scale-110" />
      <span>{item.label}</span>
    </NavLink>
  );
}

export default function DashboardLayout() {
  const { user, logout } = useAuth();
  const { toast, setToast } = useNotifications();
  const navigate = useNavigate();
  const location = useLocation();
  const [open, setOpen] = useState(false);
  const [expanded, setExpanded] = useState({
    daftarDokumen: [
      "/dashboard/sop",
      "/dashboard/proses",
      "/dashboard/standar-pelayanan"
    ].some(p => location.pathname === p || location.pathname.startsWith(p + "/")),
    uploadUnit: location.pathname.includes("/upload") ||
      new URLSearchParams(location.search).get("aksi") === "upload",
    dokumen: location.pathname.startsWith("/dashboard/manajemen-proses") ||
      location.pathname.startsWith("/dashboard/approval"),
    administrasi: location.pathname.startsWith("/dashboard/organisasi") ||
      location.pathname.startsWith("/dashboard/users"),
    informasi: location.pathname.startsWith("/dashboard/berita") ||
      location.pathname.startsWith("/dashboard/pengumuman")
  });

  useEffect(() => {
    setOpen(false);

    const path = location.pathname;
    const aksi = new URLSearchParams(location.search).get("aksi");

    setExpanded(prev => ({
      ...prev,
      daftarDokumen: [
        "/dashboard/sop",
        "/dashboard/proses",
        "/dashboard/standar-pelayanan"
      ].some(p => path === p || path.startsWith(p + "/")) && aksi !== "upload",
      uploadUnit: path.includes("/upload") || aksi === "upload",
      dokumen: path.startsWith("/dashboard/manajemen-proses") ||
        path.startsWith("/dashboard/approval"),
      administrasi: path.startsWith("/dashboard/organisasi") ||
        path.startsWith("/dashboard/users"),
      informasi: path.startsWith("/dashboard/berita") ||
        path.startsWith("/dashboard/pengumuman")
    }));
  }, [location.pathname, location.search]);

  const closeMenu = () => setOpen(false);
  const visibleNav = NAV.filter((item) => item.roles.includes(user.role));
  const visibleGroups = GROUPS.filter((group) => group.roles.includes(user.role));
  const visibleExtra = EXTRA_NAV.filter((item) => item.roles.includes(user.role));

  const currentPage = [
    ...NAV,
    ...GROUPS.flatMap((group) => group.items),
    ...EXTRA_NAV
  ].find((item) =>
    item.end
      ? location.pathname === item.to
      : location.pathname === item.to.split('?')[0] ||
        location.pathname.startsWith(`${item.to.split("?")[0]}/`)
  );

  return (
    <div className="min-h-screen bg-[#f4f7fb] lg:grid lg:grid-cols-[248px_minmax(0,1fr)]">
      {open && (
        <button
          type="button"
          aria-label="Tutup menu"
          className="no-print fixed inset-0 z-40 bg-slate-950/40 backdrop-blur-[2px] lg:hidden"
          onClick={closeMenu}
        />
      )}

      <aside
        className={`simp-sidebar no-print fixed inset-y-0 left-0 z-50 flex w-[248px] flex-col bg-gradient-to-b from-[#071a35] via-[#0b2d50] to-[#104b7a] px-4 py-5 shadow-2xl shadow-blue-950/30 transition-transform duration-300 ease-out lg:sticky lg:top-0 lg:h-screen lg:translate-x-0 lg:shadow-none ${
          open ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="simp-brand mb-8 flex items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.06] px-3 py-4 shadow-lg shadow-black/10 backdrop-blur-xl">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-gradient-to-br from-white to-blue-100 p-1 shadow-lg shadow-cyan-300/20 ring-1 ring-white/40">
            <img src="/img/logo.png" alt="Logo BAPETEN" className="h-full w-full object-contain" />
          </div>
          <div className="min-w-0 text-white">
            <p className="text-lg font-extrabold tracking-[0.12em]">SIMPB</p>
            <p className="text-[10px] font-medium uppercase tracking-[0.24em] text-cyan-300">BAPETEN</p>
          </div>
          <button
            type="button"
            onClick={closeMenu}
            className="ml-auto rounded-lg p-1.5 text-white/80 hover:bg-white/10 lg:hidden"
            aria-label="Tutup navigasi"
          >
            <X size={20} />
          </button>
        </div>

        <div className="mb-3 px-3 text-[10px] font-semibold uppercase tracking-[0.16em] text-cyan-300/60">
          Menu utama
        </div>

        <nav className="relative z-0 flex-1 space-y-1 overflow-y-auto overflow-x-hidden pr-1 [scrollbar-width:none] [-ms-overflow-style:none]">
          {visibleNav.map((item) => (
            <NavItem key={item.to} item={item} closeMenu={closeMenu} />
          ))}

          {visibleGroups.map((group) => {
            const Icon = group.icon;
            const isExpanded = expanded[group.id];
            const isActive = group.items.some(
              (item) =>
                location.pathname === item.to.split('?')[0] ||
                location.pathname.startsWith(`${item.to.split("?")[0]}/`)
            );

            return (
              <div key={group.id} className="relative pt-1">
                <button
                  type="button"
                  onClick={() =>
                    setExpanded((prev) => ({
                      ...prev,
                      [group.id]: !prev[group.id]
                    }))
                  }
                  aria-expanded={!!isExpanded}
                  className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm transition-colors ${
                    isActive
                      ? "bg-white/10 text-white"
                      : "text-slate-200/80 hover:translate-x-1 hover:bg-white/[0.08] hover:text-white"
                  }`}
                >
                  <Icon size={18} strokeWidth={1.8} className="shrink-0 transition-transform duration-200 group-hover:scale-110" />
                  <span className="flex-1">{group.label}</span>
                  <ChevronDown
                    size={16}
                    className={`transition-transform ${isExpanded ? "rotate-180" : ""}`}
                  />
                </button>

                {isExpanded && (
                  <div className="simp-submenu ml-4 mt-1 space-y-1 border-l border-cyan-300/20 pl-3">
                    {group.items.filter((item) => !item.roles || item.roles.includes(user.role)).map((item) => (
                      <NavItem
                        key={item.to}
                        item={item}
                        closeMenu={closeMenu}
                      />
                    ))}
                  </div>
                )}
              </div>
            );
          })}

          {visibleExtra.length > 0 && (
            <>
              
              {visibleExtra.map((item) => (
                <NavItem key={item.to} item={item} closeMenu={closeMenu} />
              ))}
            </>
          )}
        </nav>

        <div className="mt-4 rounded-2xl border border-white/10 bg-white/[0.05] px-3 py-4 shadow-inner shadow-white/[0.03]">
          <div className="flex items-center gap-2 text-white/80">
            <ShieldCheck size={16} />
            <span className="text-xs">Sistem Manajemen Proses Bisnis</span>
          </div>
          <p className="mt-2 text-[10px] text-blue-200/70">
            BAPETEN · SIMPB
          </p>
        </div>
      </aside>

      <div className="flex min-h-screen min-w-0 flex-col">
        {/* HEADER: tombol menu mobile, judul halaman, lonceng notifikasi, info pengguna, keluar */}
        <header className="no-print sticky top-0 z-30 flex h-[68px] items-center gap-3 border-b border-[#e5edf5] bg-white/95 px-4 backdrop-blur-md sm:px-7">
          <button
            type="button"
            className="rounded-xl p-2 text-[#36516b] transition hover:bg-[#eaf3fb] lg:hidden"
            onClick={() => setOpen(true)}
            aria-label="Buka menu"
          >
            <Menu size={22} />
          </button>

          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-[#173b5b] sm:text-base">
              {currentPage?.label || "SIMPB"}
            </p>

            <p className="hidden text-xs text-slate-500 sm:block">
              Sistem Informasi Manajemen Proses Bisnis
            </p>
          </div>

          <div className="ml-auto flex shrink-0 items-center gap-3 sm:gap-4">
            <NotifBell />

            <div className="hidden h-8 w-px bg-slate-200 sm:block" />

            <div className="hidden max-w-[190px] text-right sm:block">
              <p className="truncate text-sm font-semibold text-[#173b5b]">
                {user.name}
              </p>
              <p className="truncate text-xs text-slate-500">
                {ROLE_LABEL[user.role]}
              </p>
            </div>

            <button
              type="button"
              className="flex items-center gap-2 rounded-xl border border-slate-200 px-3 py-2 text-sm font-medium text-slate-600 transition hover:border-red-200 hover:bg-red-50 hover:text-red-600"
              onClick={() => {
                logout();
                navigate("/login");
              }}
              title="Keluar dari aplikasi"
            >
              <LogOut size={16} />
              <span className="hidden sm:inline">Keluar</span>
            </button>
          </div>
        </header>

        <main className="min-w-0 flex-1 p-4 sm:p-6 lg:p-7">
          <ScrollToTop />
          <Outlet />
        </main>

        <SiteFooter />
      </div>

      {toast && (
        <div
          role="status"
          className="no-print fixed bottom-4 right-4 z-[60] w-80 max-w-[90vw] rounded-2xl border border-slate-200 border-l-4 border-l-[#1769aa] bg-white p-4 shadow-xl"
        >
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-sm font-semibold text-[#173b5b]">{toast.title}</p>
              <p className="mt-1 text-sm text-slate-600">{toast.message}</p>
            </div>
            <button
              type="button"
              onClick={() => setToast(null)}
              className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
              aria-label="Tutup notifikasi"
            >
              <X size={16} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
