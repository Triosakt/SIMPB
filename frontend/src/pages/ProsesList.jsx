import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  ArrowRight,
  CheckCircle2,
  Clock3,
  FileText,
  FolderKanban,
  Layers3,
  Search,
  ShieldCheck,
  SlidersHorizontal,
  Workflow,
  X,
  XCircle,
} from "lucide-react";
import api, { errMsg } from "../api/client.js";

const STATUS = {
  approved: {
    label: "Disetujui",
    description: "Telah diverifikasi Admin Ortala",
    icon: CheckCircle2,
    badge: "border-emerald-200 bg-emerald-50 text-emerald-700",
    iconColor: "text-emerald-600",
  },
  pending: {
    label: "Menunggu Persetujuan",
    description: "Menunggu pemeriksaan Admin Ortala",
    icon: Clock3,
    badge: "border-amber-200 bg-amber-50 text-amber-700",
    iconColor: "text-amber-600",
  },
  rejected: {
    label: "Ditolak",
    description: "Dokumen memerlukan perbaikan",
    icon: XCircle,
    badge: "border-rose-200 bg-rose-50 text-rose-700",
    iconColor: "text-rose-600",
  },
};

const number = (value) => Number(value || 0);

function SummaryCard({ icon: Icon, label, value, color }) {
  return (
    <div className="group relative overflow-hidden rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-lg sm:p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-medium text-slate-500 sm:text-sm">{label}</p>
          <p className="mt-2 text-3xl font-bold tracking-tight text-slate-900">
            {value}
          </p>
        </div>
        <span className={`rounded-xl p-3 ${color}`}>
          <Icon size={21} strokeWidth={1.8} />
        </span>
      </div>
    </div>
  );
}

function DocumentCard({ item }) {
  const status = STATUS[item.approval_status] || {
    label: "Status belum tersedia",
    description: "Informasi persetujuan belum tersedia",
    icon: Clock3,
    badge: "border-slate-200 bg-slate-100 text-slate-600",
    iconColor: "text-slate-500",
  };

  const StatusIcon = status.icon;

  return (
    <Link
      to={`/dashboard/proses/${item.id}`}
      className="group relative flex h-full flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white p-5 shadow-sm outline-none transition-all duration-300 hover:-translate-y-1 hover:border-blue-300 hover:shadow-xl hover:shadow-slate-200/70 focus-visible:ring-2 focus-visible:ring-blue-500 sm:p-6"
    >
      <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-blue-600 via-cyan-500 to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100" />

      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="rounded-lg border border-blue-100 bg-blue-50 px-3 py-1.5 text-xs font-bold tracking-wide text-blue-700">
          {item.nomor_peta_proses || "Tanpa Nomor"}
        </span>

        <span
          className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-semibold ${status.badge}`}
        >
          <StatusIcon size={13} strokeWidth={2.2} />
          {status.label}
        </span>
      </div>

      <div className="mt-5 flex flex-1 gap-3">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-600 transition-colors group-hover:bg-blue-50 group-hover:text-blue-600">
          <FolderKanban size={21} strokeWidth={1.8} />
        </div>

        <div className="min-w-0">
          <p className="mb-1 text-xs font-medium text-slate-400">
            {item.nama_keterangan || "Peta Proses"}
          </p>
          <h3 className="text-base font-bold leading-snug text-slate-800 transition-colors group-hover:text-blue-700">
            {item.judul}
          </h3>
          {item.tahun_terbit && (
            <p className="mt-2 text-xs text-slate-400">
              Tahun {item.tahun_terbit}
            </p>
          )}
        </div>
      </div>

      <div className="mt-6 grid grid-cols-3 gap-2 rounded-xl border border-slate-100 bg-slate-50/80 p-3">
        {[
          { icon: Layers3, value: item.jml_sub, label: "Sub Proses" },
          { icon: Workflow, value: item.jml_cfm, label: "CFM" },
          { icon: FileText, value: item.jml_sop, label: "SOP" },
        ].map(({ icon: Icon, value, label }) => (
          <div key={label} className="text-center">
            <Icon size={16} className="mx-auto mb-1 text-slate-400" />
            <p className="text-lg font-bold text-slate-800">{number(value)}</p>
            <p className="text-[10px] font-medium text-slate-500 sm:text-xs">
              {label}
            </p>
          </div>
        ))}
      </div>

      <div className="mt-5 flex items-center justify-between gap-3 border-t border-slate-100 pt-4">
        <span className={`flex items-center gap-1.5 text-xs ${status.iconColor}`}>
          <StatusIcon size={14} />
          {status.description}
        </span>

        <span className="inline-flex shrink-0 items-center gap-1 text-xs font-bold text-blue-600 transition-all group-hover:gap-2">
          Detail
          <ArrowRight size={15} />
        </span>
      </div>
    </Link>
  );
}

export default function ProsesList() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [q, setQ] = useState("");
  const [category, setCategory] = useState("all");
  const [status, setStatus] = useState("all");

  useEffect(() => {
    let active = true;

    api.get("/proses")
      .then(({ data }) => {
        if (active) setRows(Array.isArray(data) ? data : []);
      })
      .catch((e) => {
        if (active) setError(errMsg(e));
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, []);

  const categories = useMemo(
    () => [...new Set(rows.map((r) => r.nama_keterangan).filter(Boolean))],
    [rows]
  );

  const stats = useMemo(() => ({
    total: rows.length,
    approved: rows.filter((r) => r.approval_status === "approved").length,
    pending: rows.filter((r) => r.approval_status === "pending").length,
    rejected: rows.filter((r) => r.approval_status === "rejected").length,
  }), [rows]);

  const shown = useMemo(() => rows.filter((r) => {
    const keyword = `${r.nomor_peta_proses || ""} ${r.judul || ""}`.toLowerCase();

    return (
      keyword.includes(q.trim().toLowerCase()) &&
      (category === "all" || r.nama_keterangan === category) &&
      (status === "all" || r.approval_status === status)
    );
  }), [rows, q, category, status]);

  const groups = categories.filter((name) =>
    shown.some((r) => r.nama_keterangan === name)
  );

  const uncategorized = shown.filter((r) => !r.nama_keterangan);
  if (uncategorized.length) groups.push("");

  const resetFilters = () => {
    setQ("");
    setCategory("all");
    setStatus("all");
  };

  const hasFilters = q !== "" || category !== "all" || status !== "all";

  return (
    <div className="mx-auto max-w-7xl space-y-7 pb-12">
      {/* HEADER */}
      <header className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-950 via-slate-900 to-blue-950 text-white shadow-xl min-h-[180px] sm:min-h-[210px] px-6 py-7 sm:px-8 sm:py-8 flex flex-col justify-center">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 z-0 bg-cover bg-center bg-no-repeat"
          style={{
            backgroundImage:
              'linear-gradient(90deg, rgba(9,42,76,.96) 0%, rgba(16,75,122,.88) 52%, rgba(23,105,170,.70) 100%), url("/img/kantor.jpg")'
          }}
        />

        <div className="pointer-events-none absolute -right-16 -top-24 h-72 w-72 rounded-full border border-white/10 bg-blue-400/10 blur-2xl" />
        <div className="pointer-events-none absolute bottom-0 right-16 h-36 w-36 rounded-full bg-cyan-400/10 blur-3xl" />

        <div className="relative z-10 flex items-start justify-between gap-5">
          <div className="max-w-2xl">
            <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1.5 text-[11px] font-semibold uppercase tracking-widest text-blue-100">
              <ShieldCheck size={14} />
              Sistem Manajemen Proses Bisnis
            </div>

            <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
              Peta Proses Bisnis
            </h1>

            <p className="mt-3 max-w-xl text-sm leading-relaxed text-slate-300">
              Jelajahi dokumen proses bisnis, pantau status persetujuan,
              serta temukan Sub Proses, CFM, dan SOP yang saling terhubung.
            </p>
          </div>

          <div className="hidden rounded-2xl border border-white/10 bg-white/10 p-4 backdrop-blur sm:block">
            <FolderKanban size={30} strokeWidth={1.4} className="text-blue-200" />
          </div>
        </div>
      </header>

      {/* RINGKASAN */}
      <section className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <SummaryCard
          icon={FolderKanban}
          label="Total Dokumen"
          value={stats.total}
          color="bg-blue-50 text-blue-600"
        />
        <SummaryCard
          icon={CheckCircle2}
          label="Disetujui"
          value={stats.approved}
          color="bg-emerald-50 text-emerald-600"
        />
        <SummaryCard
          icon={Clock3}
          label="Menunggu"
          value={stats.pending}
          color="bg-amber-50 text-amber-600"
        />
        <SummaryCard
          icon={XCircle}
          label="Ditolak"
          value={stats.rejected}
          color="bg-rose-50 text-rose-600"
        />
      </section>

      {/* FILTER */}
      <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
        <div className="mb-4 flex items-center gap-2 text-sm font-bold text-slate-800">
          <SlidersHorizontal size={17} className="text-blue-600" />
          Cari & Filter Dokumen
        </div>

        <div className="grid gap-3 md:grid-cols-3">
          <div className="relative">
            <Search size={18} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Cari nomor atau judul..."
              aria-label="Cari peta proses"
              className="h-11 w-full rounded-xl border border-slate-200 bg-slate-50 pl-10 pr-4 text-sm text-slate-800 outline-none transition focus:border-blue-400 focus:bg-white focus:ring-4 focus:ring-blue-500/10"
            />
          </div>

          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            aria-label="Filter kategori"
            className="h-11 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm text-slate-700 outline-none transition focus:border-blue-400 focus:ring-4 focus:ring-blue-500/10"
          >
            <option value="all">Semua Kategori</option>
            {categories.map((name) => (
              <option key={name} value={name}>{name}</option>
            ))}
          </select>

          <select
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            aria-label="Filter status persetujuan"
            className="h-11 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm text-slate-700 outline-none transition focus:border-blue-400 focus:ring-4 focus:ring-blue-500/10"
          >
            <option value="all">Semua Status</option>
            <option value="approved">Disetujui</option>
            <option value="pending">Menunggu Persetujuan</option>
            <option value="rejected">Ditolak</option>
          </select>
        </div>

        <div className="mt-4 flex flex-wrap items-center justify-between gap-2">
          <p className="text-xs text-slate-500">
            Menampilkan <strong className="text-slate-800">{shown.length}</strong> dari{" "}
            <strong className="text-slate-800">{rows.length}</strong> dokumen
          </p>

          {hasFilters && (
            <button
              type="button"
              onClick={resetFilters}
              className="inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold text-blue-600 transition hover:bg-blue-50"
            >
              <X size={14} />
              Reset Filter
            </button>
          )}
        </div>
      </section>

      {/* ERROR */}
      {error && (
        <div role="alert" className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          {error}
        </div>
      )}

      {/* LOADING */}
      {loading && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="h-72 animate-pulse rounded-2xl border border-slate-200 bg-slate-100" />
          ))}
        </div>
      )}

      {/* EMPTY STATE */}
      {!loading && !error && shown.length === 0 && (
        <div className="flex flex-col items-center rounded-3xl border border-dashed border-slate-300 bg-white px-6 py-16 text-center">
          <div className="mb-4 rounded-2xl bg-slate-100 p-4 text-slate-400">
            <Search size={30} />
          </div>
          <h2 className="text-lg font-bold text-slate-800">
            {hasFilters ? "Dokumen tidak ditemukan" : "Belum ada dokumen"}
          </h2>
          <p className="mt-2 max-w-sm text-sm text-slate-500">
            {hasFilters
              ? "Coba gunakan kata kunci atau kombinasi filter yang berbeda."
              : "Dokumen peta proses yang dapat diakses akan ditampilkan di halaman ini."}
          </p>
          {hasFilters && (
            <button
              type="button"
              onClick={resetFilters}
              className="mt-5 rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-700"
            >
              Tampilkan Semua
            </button>
          )}
        </div>
      )}

      {/* DOKUMEN PER KATEGORI */}
      {!loading && !error && groups.map((group) => {
        const items = shown.filter((r) =>
          group ? r.nama_keterangan === group : !r.nama_keterangan
        );

        return (
          <section key={group || "lainnya"} className="space-y-4">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <span className="flex h-10 w-10 items-center justify-center rounded-xl border border-blue-100 bg-blue-50 text-blue-600">
                  <Layers3 size={19} />
                </span>
                <div>
                  <h2 className="font-bold text-slate-800">
                    {group || "Kategori Lainnya"}
                  </h2>
                  <p className="text-xs text-slate-500">
                    {items.length} dokumen tersedia
                  </p>
                </div>
              </div>

              <span className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-semibold text-slate-500">
                {items.length} Dokumen
              </span>
            </div>

            <div className="grid items-stretch gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {items.map((item) => (
                <DocumentCard key={item.id} item={item} />
              ))}
            </div>
          </section>
        );
      })}
    </div>
  );
}
