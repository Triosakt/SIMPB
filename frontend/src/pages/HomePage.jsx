import SiteNavbar from "../components/SiteNavbar.jsx";
import "./homepage-motion.css";
import "./homepage-hypermotion.js";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  Activity,
  ArrowDownToLine,
  ArrowRight,
  ArrowUpRight,
  BarChart3,
  Bell,
  BookOpen,
  Building2,
  CalendarDays,
  CheckCircle2,
  Clock3,
  Eye,
  FileCheck2,
  FileText,
  Menu,
  Newspaper,
  Search,
  ShieldCheck,
  TrendingUp,
  Workflow,
  X,
  RefreshCw,
  ChevronDown,
} from "lucide-react";

import api, { downloadSop, openPdf, errMsg } from "../api/client.js";
import SecureMedia from "../components/SecureMedia.jsx";
import LiveChatWidget from "../components/LiveChatWidget.jsx";

const MAX_SOP = 100;

const PRIMARY = "#1769aa";
const PRIMARY_DARK = "#104b7a";
const PRIMARY_LIGHT = "#eaf3fb";

function getTitle(item) {
  return (
    item?.nama_sop ||
    item?.judul ||
    item?.title ||
    item?.nama ||
    "Dokumen SOP"
  );
}

function getNumber(item) {
  return (
    item?.nomor_sop ||
    item?.kode_sop ||
    item?.nomor ||
    item?.kode ||
    "Nomor belum tersedia"
  );
}

function getUnit(item) {
  return (
    item?.nama_unit ||
    item?.unit_kerja ||
    item?.nama_lembaga ||
    item?.nama_organisasi ||
    "Unit kerja"
  );
}

function getDocumentUnits(item) {
  const raw = item?.units;

  let units = [];
  if (Array.isArray(raw)) {
    units = raw;
  } else if (typeof raw === "string" && raw.trim()) {
    units = raw.split("||");
  } else {
    const unit = item?.nama_unit || item?.unit_kerja ||
      item?.nama_lembaga || item?.nama_organisasi;
    if (Array.isArray(unit)) {
      units = unit;
    } else if (typeof unit === "string" && unit.trim()) {
      units = [unit];
    } else if (unit && typeof unit === "object") {
      units = [unit.nama_unit || unit.nama || unit.name || ""];
    }
  }

  return [...new Set(
    units
      .map((unit) => {
        if (typeof unit === "string") return unit.trim();
        if (unit && typeof unit === "object") {
          return String(
            unit.nama_unit || unit.nama || unit.name || ""
          ).trim();
        }
        return "";
      })
      .filter((unit) => unit && unit !== "Unit kerja")
  )];
}

function getId(item) {
  return item?.id ?? item?.sop_id ?? item?.id_sop ?? null;
}

function getDateValue(item) {
  return (
    item?.approved_at ||
    item?.tanggal_publikasi ||
    item?.tanggal_terbit ||
    item?.created_at ||
    item?.updated_at ||
    item?.tanggal ||
    null
  );
}

function getTime(item) {
  const value = getDateValue(item);
  if (!value) return 0;

  const timestamp = new Date(value).getTime();
  return Number.isFinite(timestamp) ? timestamp : 0;
}

function formatDate(value) {
  if (!value) return "Tanggal belum tersedia";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Tanggal belum tersedia";

  return new Intl.DateTimeFormat("id-ID", {
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(date);
}

function formatNumber(value) {
  return new Intl.NumberFormat("id-ID").format(Number(value) || 0);
}

function getApprovalStatus(item) {
  return String(
    item?.approval_status ?? item?.status ?? item?.status_sop ?? ""
  )
    .trim()
    .toLowerCase();
}

function isApproved(item) {
  const approval = String(item?.approval_status ?? "")
    .trim()
    .toLowerCase();

  if (approval) return approval === "approved";

  return [
    "approved",
    "approve",
    "disetujui",
    "published",
    "publish",
    "terbit",
    "dipublikasikan",
    "aktif",
  ].includes(getApprovalStatus(item));
}

function isCurrentlyValid(item) {
  return (
    String(item?.status_berlaku ?? "Berlaku")
      .trim()
      .toLowerCase() === "berlaku"
  );
}

function extractRows(response) {
  const payload = response?.data ?? response;

  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.data)) return payload.data;
  if (Array.isArray(payload?.data?.data)) return payload.data.data;
  if (Array.isArray(payload?.rows)) return payload.rows;
  if (Array.isArray(payload?.items)) return payload.items;
  if (Array.isArray(payload?.results)) return payload.results;

  return [];
}

function getViews(item) {
  const value = Number(item?.view_count ?? 0);
  return Number.isFinite(value) && value >= 0 ? value : 0;
}

function getDownloads(item) {
  const value = Number(item?.download_count ?? 0);
  return Number.isFinite(value) && value >= 0 ? value : 0;
}

function getNewsDate(item) {
  return item?.tanggal_publikasi || item?.created_at || null;
}

function getAnnouncementDate(item) {
  return item?.tanggal_pengumuman || item?.created_at || null;
}

function getDocumentCategory(item) {
  const type = String(item?.jenis_sop || "").toLowerCase();

  if (type === "lembaga") return "SOP Lembaga";
  if (type === "unit_kerja") return "SOP Unit Kerja";

  return "Dokumen SOP";
}

function SectionHeading({
  eyebrow,
  title,
  description,
  action,
  actionTo = "/dashboard",
}) {
  return (
    <div className="mb-7 flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-end">
      <div>
        {eyebrow && (
          <span className="text-xs font-extrabold uppercase tracking-[0.18em] text-[#1769aa]">
            {eyebrow}
          </span>
        )}

        <h2 className="mt-2 text-2xl font-extrabold tracking-tight text-[#172b45] sm:text-3xl">
          {title}
        </h2>

        {description && (
          <p className="mt-2 max-w-2xl text-sm leading-7 text-slate-500">
            {description}
          </p>
        )}
      </div>

      {action && (
        <Link
          to={actionTo}
          className="inline-flex shrink-0 items-center gap-2 text-sm font-bold text-[#1769aa] transition hover:gap-3"
        >
          {action}
          <ArrowRight size={16} />
        </Link>
      )}
    </div>
  );
}

function EmptyState({
  icon: Icon = FileText,
  title,
  description,
  action,
  onAction,
}) {
  return (
    <div className="rounded-2xl border border-dashed border-[#d5e2ef] bg-white px-5 py-12 text-center">
      <div className="mx-auto mb-4 grid h-14 w-14 place-items-center rounded-2xl bg-[#eaf3fb] text-[#1769aa]">
        <Icon size={26} />
      </div>

      <h3 className="text-base font-bold text-[#172b45]">{title}</h3>
      <p className="mx-auto mt-2 mb-4 max-w-md text-sm leading-6 text-slate-500">
        {description}
      </p>

      {action && (
        <button
          type="button"
          onClick={onAction}
          className="inline-flex items-center justify-center gap-2 rounded-xl border border-[#d5e2ef] bg-white px-4 py-2.5 text-sm font-bold text-[#104b7a] transition hover:bg-[#eaf3fb]"
        >
          <RefreshCw size={15} />
          {action}
        </button>
      )}
    </div>
  );
}

function LoadingState({ text = "Memuat data..." }) {
  return (
    <div className="flex items-center justify-center gap-3 py-12 text-sm text-slate-500">
      <span className="h-5 w-5 animate-spin rounded-full border-2 border-[#d5e2ef] border-t-[#1769aa]" />
      {text}
    </div>
  );
}

function ErrorState({ message, onRetry }) {
  return (
    <div className="flex flex-col items-start justify-between gap-4 rounded-xl border border-red-200 bg-red-50 p-4 text-red-800 sm:flex-row sm:items-center">
      <div>
        <strong className="text-sm">Data belum dapat dimuat</strong>
        <p className="mt-1 break-words text-xs leading-6">{message}</p>
      </div>

      {onRetry && (
        <button
          type="button"
          onClick={onRetry}
          className="inline-flex shrink-0 items-center gap-2 rounded-lg border border-red-200 bg-white px-3 py-2 text-sm font-bold text-red-800 transition hover:bg-red-100"
        >
          <RefreshCw size={15} />
          Coba lagi
        </button>
      )}
    </div>
  );
}



function StatCard({ icon: Icon, label, value, description, color = "green" }) {
  const colorStyles = {
    green: "bg-[#eaf5eb] text-[#286b3c]",
    yellow: "bg-[#fff7e2] text-[#bd861d]",
    blue: "bg-[#e5f1fc] text-[#3475b5]",
  };

  return (
    <div className="flex min-w-0 items-center gap-3 rounded-xl border border-[#e1e8f0] bg-[#fcfdff] px-3 py-3 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-md sm:px-3.5">
      {/* IKON */}
      <div
        className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${colorStyles[color]}`}
      >
        <Icon size={21} strokeWidth={1.8} />
      </div>

      {/* INFORMASI */}
      <div className="min-w-0">
        <h3 className="text-xl font-extrabold leading-tight tracking-tight text-[#1c3825] sm:text-2xl">
          {value}
        </h3>

        <p className="mt-0.5 text-[11px] font-medium leading-4 text-slate-500 sm:text-xs">
          {description || label}
        </p>
      </div>
    </div>
  );
}



function SopCard({ item, index, onOpen, onDownload, busyId }) {
  const id = getId(item);
  const title = getTitle(item);
  const views = getViews(item);
  const downloads = getDownloads(item);
  const isBusy = String(busyId) === String(id);

  return (
    <article className="group relative flex h-full min-w-0 flex-col overflow-hidden rounded-2xl border border-[#e0e8f1] bg-white p-5 transition duration-200 hover:-translate-y-1 hover:border-[#bdd7f0] hover:shadow-xl hover:shadow-[#104b7a]/[0.06]">
      <span className="pointer-events-none absolute right-3 top-1 text-4xl font-black text-slate-100">
        {String(index + 1).padStart(2, "0")}
      </span>

      <div className="relative z-10 flex items-center justify-between gap-3">
        <div className="grid h-11 w-11 place-items-center rounded-xl bg-[#eaf3fb] text-[#1769aa]">
          <FileCheck2 size={23} />
        </div>

        <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-1.5 text-[10px] font-extrabold text-emerald-700">
          <CheckCircle2 size={13} />
          Berlaku
        </span>
      </div>

      <span className="relative z-10 mt-5 block text-[10px] font-extrabold uppercase tracking-wider text-[#1769aa]">
        {getDocumentCategory(item)}
      </span>

      <h3 className="relative z-10 mt-2 min-h-[4.5rem] line-clamp-3 break-words text-base font-bold leading-6 text-[#172b45]">
        {title}
      </h3>

      <p className="relative z-10 mt-1 min-h-4 line-clamp-1 break-words text-xs text-slate-500">
        {getNumber(item)}
      </p>

      <div className="relative z-10 mt-5 grid min-h-[3.5rem] content-start gap-3 text-xs text-slate-500">
        <span className="flex items-start gap-2">
          <Building2 size={14} className="mt-0.5 shrink-0" />
          <span className="line-clamp-2 break-words">{getUnit(item)}</span>
        </span>
        <span className="flex items-start gap-2">
          <CalendarDays size={14} className="mt-0.5 shrink-0" />
          {formatDate(getDateValue(item))}
        </span>
      </div>

      <div className="relative z-10 mt-auto flex min-h-[2.5rem] flex-wrap content-center gap-x-4 gap-y-2 border-t border-slate-100 pt-3 text-[10px] text-slate-500">
        <span className="flex items-center gap-1.5">
          <Eye size={14} />
          {formatNumber(views)} dilihat
        </span>
        <span className="flex items-center gap-1.5">
          <ArrowDownToLine size={14} />
          {formatNumber(downloads)} unduhan
        </span>
      </div>

      <div className="relative z-10 mt-4 flex gap-2">
        <button
          type="button"
          onClick={() => onOpen(item)}
          disabled={!id || isBusy}
          className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl bg-[#1769aa] px-3 py-3 text-xs font-extrabold text-white transition hover:bg-[#104b7a] disabled:cursor-not-allowed disabled:opacity-50"
        >
          <BookOpen size={16} />
          Buka SOP
        </button>

        <button
          type="button"
          onClick={() => onDownload(item)}
          disabled={!id || isBusy}
          title="Unduh SOP"
          aria-label={`Unduh ${title}`}
          className="grid h-11 w-11 shrink-0 place-items-center rounded-xl border border-[#e0e8f1] bg-white text-[#1769aa] transition hover:bg-[#eaf3fb] disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isBusy ? (
            <span className="h-4 w-4 animate-spin rounded-full border-2 border-[#d5e2ef] border-t-[#1769aa]" />
          ) : (
            <ArrowDownToLine size={18} />
          )}
        </button>
      </div>
    </article>
  );
}

function ProsesCard({ item, index, type, onOpenPdf }) {
  const isPeta = type === "peta";
  const isSub = type === "sub";
  const Icon = isPeta ? Workflow : Activity;

  const detailUrl = isPeta
    ? `/dashboard/proses/${item.id}`
    : `/dashboard/proses/${item.peta_proses_id}`;

  return (
    <article className="group relative min-w-0 overflow-hidden rounded-2xl border border-[#e0e8f1] bg-white p-5 transition duration-200 hover:-translate-y-1 hover:border-[#bdd7f0] hover:shadow-xl hover:shadow-[#104b7a]/[0.06]">
      <span className="pointer-events-none absolute right-3 top-1 text-4xl font-black text-slate-100">
        {String(index + 1).padStart(2, "0")}
      </span>

      <div className="relative z-10 flex items-center justify-between gap-3">
        <span className="grid h-11 w-11 place-items-center rounded-xl bg-[#eaf3fb] text-[#1769aa]">
          <Icon size={23} />
        </span>

        <span className="rounded-full bg-blue-50 px-3 py-1.5 text-[10px] font-extrabold text-[#1769aa]">
          {isPeta ? "Peta Proses" : isSub ? "Sub Proses" : "CFM"}
        </span>
      </div>

      <span className="relative z-10 mt-5 block text-[10px] font-extrabold uppercase tracking-wider text-[#1769aa]">
        {isPeta ? item.kategori || "Peta Proses" : isSub ? "Sub Proses" : "Cross Functional Map"}
      </span>

      <h3 className="relative z-10 mt-2 break-words text-base font-bold leading-6 text-[#172b45]">
        {item.judul}
      </h3>

      <p className="relative z-10 mt-1 break-words text-xs text-slate-500">
        {item.nomor || "Nomor belum tersedia"}
      </p>

      <div className="relative z-10 mt-5 grid gap-3 text-xs text-slate-500">
        <span className="flex items-start gap-2">
          <CalendarDays size={14} className="mt-0.5 shrink-0" />
          Tahun terbit: {item.tahun_terbit || "-"}
        </span>

        {!isPeta && (
          <span className="flex items-start gap-2">
            <Workflow size={14} className="mt-0.5 shrink-0" />
            <span className="break-words">
              {item.nama_peta_proses || "Peta proses terkait"}
            </span>
          </span>
        )}
      </div>

      <div className="relative z-10 mt-5 flex flex-wrap gap-2 border-t border-slate-100 pt-4">
        <Link
          to={detailUrl}
          className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl bg-[#1769aa] px-3 py-3 text-xs font-extrabold text-white transition hover:bg-[#104b7a]"
        >
          <BookOpen size={16} />
          Lihat Detail
        </Link>

        {Boolean(item.has_file) && (
          <button
            type="button"
            onClick={() => onOpenPdf(type, item.id)}
            className="inline-flex items-center justify-center gap-2 rounded-xl border border-[#d5e2ef] bg-white px-3 py-3 text-xs font-extrabold text-[#1769aa] transition hover:bg-[#eaf3fb]"
          >
            <FileText size={16} />
            PDF
          </button>
        )}
      </div>
    </article>
  );
}

function PanelHeading({ icon: Icon, title, description }) {
  return (
    <div className="mb-5 flex items-center justify-between gap-4">
      <div>
        <h3 className="font-bold text-[#172b45]">{title}</h3>
        <p className="mt-1 text-xs leading-5 text-slate-500">{description}</p>
      </div>
      <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-[#eaf3fb] text-[#1769aa]">
        <Icon size={21} />
      </span>
    </div>
  );
}

// Resolusi URL thumbnail berita publik melalui origin backend.


export default function HomePage() {
  const [sops, setSops] = useState([]);
  const [petaProses, setPetaProses] = useState([]);
  const [subDocuments, setSubDocuments] = useState([]);
  const [cfmDocuments, setCfmDocuments] = useState([]);

  const [documentType, setDocumentType] = useState("sop");
  const [documentPage, setDocumentPage] = useState(1);
  const DOCUMENTS_PER_PAGE = 3;
  const [prosesLoading, setProsesLoading] = useState(true);
  const [prosesError, setProsesError] = useState("");
  const [berita, setBerita] = useState([]);
  const [pengumuman, setPengumuman] = useState([]);



  const [sopLoading, setSopLoading] = useState(true);
  const [informasiLoading, setInformasiLoading] = useState(true);



  const [sopError, setSopError] = useState("");
  const [informasiError, setInformasiError] = useState("");

  const [search, setSearch] = useState("");
  const [activeTab, setActiveTab] = useState("terbaru");
  const [busyId, setBusyId] = useState(null);
  const [actionError, setActionError] = useState("");
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const loadSops = useCallback(async () => {
    setSopLoading(true);
    setSopError("");

    try {
      const response = await api.get(`/sop?page=1&limit=${MAX_SOP}`);
      setSops(extractRows(response));
    } catch (error) {
      setSopError(errMsg(error));
    } finally {
      setSopLoading(false);
    }
  }, []);

  const loadProsesKatalog = useCallback(async () => {
  setProsesLoading(true);
  setProsesError("");

  try {
    const response = await api.get("/proses/katalog");
    const data = response.data;

    setPetaProses(
      Array.isArray(data?.peta) ? data.peta : []
    );

    setSubDocuments(Array.isArray(data?.sub) ? data.sub : []);
    setCfmDocuments(Array.isArray(data?.cfm) ? data.cfm : []);
  } catch (error) {
    setProsesError(errMsg(error));
    setPetaProses([]);
    setSubDocuments([]);
    setCfmDocuments([]);
  } finally {
    setProsesLoading(false);
  }
      }, []);

  const handleOpenPdf = useCallback(async (type, id) => {
    setActionError("");
    try {
      await openPdf(`/proses/${type}/${id}/file`);
    } catch (error) {
      setActionError(errMsg(error));
    }
  }, []);

  const loadInformasi = useCallback(async () => {
    setInformasiLoading(true);
    setInformasiError("");

    const [beritaResult, pengumumanResult] = await Promise.allSettled([
      api.get("/berita?limit=20"),
      api.get("/pengumuman?limit=5"),
    ]);

    let hasError = false;

    if (beritaResult.status === "fulfilled") {
      setBerita(extractRows(beritaResult.value));
    } else {
      setBerita([]);
      hasError = true;
    }

    if (pengumumanResult.status === "fulfilled") {
      setPengumuman(extractRows(pengumumanResult.value));
    } else {
      setPengumuman([]);
      hasError = true;
    }

    if (hasError) {
      setInformasiError(
        "Sebagian informasi belum dapat dimuat. Periksa koneksi atau endpoint backend."
      );
    }

    setInformasiLoading(false);
  }, []);

  const reloadAll = useCallback(() => {
  loadSops();
  loadProsesKatalog();
  loadInformasi();
}, [loadSops, loadProsesKatalog, loadInformasi]);

useEffect(() => {
  loadSops();
  loadProsesKatalog();
  loadInformasi();
}, [loadSops, loadProsesKatalog, loadInformasi]);

  const approvedSops = useMemo(
    () => sops.filter((item) => isApproved(item) && isCurrentlyValid(item)),
    [sops]
  );

  const latestSops = useMemo(
    () =>
      [...approvedSops]
        .sort((a, b) => getTime(b) - getTime(a))
        .slice(0, 6),
    [approvedSops]
  );

  const popularSops = useMemo(
    () =>
      [...approvedSops]
        .sort((a, b) => getViews(b) - getViews(a))
        .slice(0, 6),
    [approvedSops]
  );

  const filteredSops = useMemo(() => {
    const keyword = search.trim().toLowerCase();
    const source = activeTab === "populer" ? popularSops : latestSops;

    if (!keyword) return source;

    return source.filter((item) => {
      const searchable = [
        getTitle(item),
        getNumber(item),
        getUnit(item),
        item?.tahun_terbit,
        item?.jenis_sop,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      return searchable.includes(keyword);
    });
  }, [activeTab, latestSops, popularSops, search]);

  const filteredPetaProses = useMemo(() => {
    const q = search.trim().toLowerCase();
    return petaProses.filter((item) =>
      !q || [item.judul, item.nomor, item.kategori, item.tahun_terbit]
        .filter(Boolean).join(" ").toLowerCase().includes(q)
    );
  }, [petaProses, search]);

  const filteredSubDocuments = useMemo(() => {
    const q = search.trim().toLowerCase();
    return subDocuments.filter(item => !q || [item.nomor, item.judul, item.nama_peta_proses, item.tahun_terbit].filter(Boolean).join(" ").toLowerCase().includes(q));
  }, [subDocuments, search]);
  const filteredCfmDocuments = useMemo(() => {
    const q = search.trim().toLowerCase();
    return cfmDocuments.filter((item) =>
      !q || [item.judul, item.nomor, item.nama_peta_proses, item.tahun_terbit]
        .filter(Boolean).join(" ").toLowerCase().includes(q)
    );
  }, [cfmDocuments, search]);

  const availableDocuments = useMemo(
    () => [...approvedSops, ...petaProses, ...subDocuments, ...cfmDocuments],
    [approvedSops, petaProses, subDocuments, cfmDocuments]
  );

  const totalDocuments = availableDocuments.length;

  // Aktivitas dilacak pada data SOP; Peta Proses dan CFM tidak
  // memiliki penghitung aktivitas pada struktur data saat ini.
  const totalViews = useMemo(
    () => approvedSops.reduce((total, item) => total + getViews(item), 0),
    [approvedSops]
  );

  const totalDownloads = useMemo(
    () => approvedSops.reduce((total, item) => total + getDownloads(item), 0),
    [approvedSops]
  );

  const documentUnitMap = useMemo(
    () =>
      availableDocuments.map((item) => ({
        item,
        units: getDocumentUnits(item),
      })),
    [availableDocuments]
  );

  const totalUnits = useMemo(() => {
    const units = new Set();
    documentUnitMap.forEach(({ units: itemUnits }) => {
      itemUnits.forEach((unit) => units.add(unit));
    });
    return units.size;
  }, [documentUnitMap]);

  const unitChartData = useMemo(() => {
    const counter = new Map();

    documentUnitMap.forEach(({ units }) => {
      units.forEach((unit) => {
        counter.set(unit, (counter.get(unit) || 0) + 1);
      });
    });

    return [...counter.entries()]
      .map(([unit, total]) => ({ unit, total }))
      .sort((a, b) => b.total - a.total)
      .slice(0, 6);
  }, [documentUnitMap]);

  const maxUnitCount = Math.max(
    1,
    ...unitChartData.map((item) => item.total)
  );

  const handleOpenSop = async (item) => {
    const id = getId(item);

    if (!id) {
      setActionError("ID dokumen SOP tidak ditemukan.");
      return;
    }

    setActionError("");

    try {
      await openPdf(`/sop/${id}/view`);
      window.setTimeout(() => {
        loadSops();
      }, 1000);
    } catch (error) {
      setActionError(errMsg(error));
    }
  };

  const handleDownloadSop = async (item) => {
    const id = getId(item);

    if (!id) {
      setActionError("ID dokumen SOP tidak ditemukan.");
      return;
    }

    setBusyId(id);
    setActionError("");

    try {
      await downloadSop({ ...item, id });
      await loadSops();
    } catch (error) {
      setActionError(errMsg(error));
    } finally {
      setBusyId(null);
    }
  };

  const navGroups = [
    {
      label: "Tentang Kami",
      items: [
        { label: "Tentang Proses Bisnis", href: "/tentang" },
        {
          label: "Tugas Ortala",
          href: "/tentang/tugas-ortala",
        },
      ],
    },
    {
      label: "Dokumen",
      items: [
        { label: "Peta Proses", href: "/dashboard/proses" },
        { label: "Sub Proses", href: "/dashboard/proses" },
        { label: "Cross Functional Map (CFM)", href: "#sop" },
        { label: "Standar Operasional Prosedur (SOP)", href: "/dashboard/sop" },
      ],
    },
    {
      label: "Informasi",
      items: [
        { label: "Berita", href: "#informasi" },
        { label: "Pengumuman", href: "#informasi" },
        { label: "Statistik", href: "#statistik" },
      ],
    },
  ];

  const navLinks = [
    { href: "#beranda", label: "Beranda" },
    { href: "#sop", label: "Katalog SOP" },
    { href: "#statistik", label: "Statistik" },
    { href: "#informasi", label: "Informasi" },
  ];

  return (
    <div className="min-h-screen bg-[#f4f7fb] font-sans text-[#172b45]">
      {/* HEADER */}
      <SiteNavbar />

      {/* HERO */}
      {/* HERO */}
<section
  id="beranda"
  className="relative scroll-mt-24 overflow-hidden bg-[#06182b] text-white"
>
  {/* VIDEO BACKGROUND */}
  <video
    className="absolute inset-0 h-full w-full object-cover"
    autoPlay
    loop
    muted
    playsInline
    preload="auto"
    aria-hidden="true"
  >
    <source src="/img/animasihero.mp4" type="video/mp4" />
  </video>

  {/* OVERLAY GRADIENT */}
  {/* OVERLAY GRADIENT */}
<div
  className="pointer-events-none absolute inset-0"
  style={{
    background: `
      linear-gradient(
        90deg,
        rgba(4, 15, 32, 0.85) 0%,
        rgba(4, 20, 42, 0.70) 25%,
        rgba(4, 25, 52, 0.45) 50%,
        rgba(4, 25, 52, 0.20) 75%,
        rgba(4, 25, 52, 0.05) 100%
      )
    `,
  }}
/>

  {/* DEKORASI LINGKARAN */}
  <div className="pointer-events-none absolute -right-24 -bottom-64 h-[440px] w-[440px] rounded-full border border-white/10 shadow-[0_0_0_50px_rgba(255,255,255,0.025),0_0_0_100px_rgba(255,255,255,0.02)]" />

  {/* KONTEN HERO */}
  <div className="relative z-10 mx-auto grid max-w-[1200px] items-center gap-10 px-4 py-14 sm:px-6 sm:py-16 md:grid-cols-[1.2fr_.8fr] md:gap-12 md:py-20 lg:px-8">
    {/* KOLOM KIRI */}
    <div>
      <span className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/[0.08] px-3 py-2 text-[10px] font-extrabold tracking-[0.15em] text-blue-100">
        <ShieldCheck size={14} />
        PORTAL DOKUMENTASI RESMI
      </span>

      <h1 className="mt-6 max-w-3xl text-4xl font-extrabold leading-[1.12] tracking-tight sm:text-5xl lg:text-6xl">
        Kelola proses bisnis.
        <br />
        <span className="text-[#a9d8ff]">
          Temukan SOP lebih mudah.
        </span>
      </h1>

      <p className="mt-5 max-w-xl text-sm leading-7 text-white/80 sm:text-base sm:leading-8">
        Akses dokumentasi proses bisnis BAPETEN melalui satu portal
        terintegrasi. Temukan SOP, lihat informasi terbaru, dan telusuri
        dokumentasi dengan lebih mudah.
      </p>

      <div className="mt-7 flex flex-wrap gap-3">
        <a
          href="#sop"
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#d5eaff] px-5 py-3.5 text-sm font-extrabold text-[#104b7a] transition hover:bg-white"
        >
          <Search size={16} />
          Jelajahi SOP
        </a>

        <a
          href="#informasi"
          className="inline-flex items-center justify-center gap-2 rounded-xl border border-white/25 bg-white/[0.08] px-5 py-3.5 text-sm font-bold text-white transition hover:bg-white/15"
        >
          Lihat informasi
          <ArrowRight size={16} />
        </a>
      </div>
    </div>

    {/* KOLOM KANAN */}
<div className="hidden items-center justify-center md:flex">
  <div className="w-full max-w-[360px] rotate-1 rounded-3xl border border-white/15 bg-white/[0.04] p-6 shadow-2xl shadow-black/5 backdrop-blur-[2px]">
    <div className="flex items-center justify-between gap-3 border-b border-white/10 pb-5">
      <span className="text-xs font-extrabold">
        Dokumentasi proses bisnis
      </span>

      <span className="rounded-full bg-blue-300/[0.08] px-3 py-1.5 text-[10px] font-bold text-blue-100">
        Terintegrasi
      </span>
    </div>

    {[
      {
        icon: Workflow,
        title: "Peta Proses",
        description: "Gambaran proses organisasi",
      },
      {
        icon: Activity,
        title: "Sub Proses dan CFM",
        description: "Hubungan antaraktivitas",
      },
      {
        icon: FileCheck2,
        title: "Standar Operasional Prosedur",
        description: "Dokumen yang mudah ditelusuri",
      },
    ].map((item) => {
      const Icon = item.icon;

      return (
        <div
          key={item.title}
          className="flex items-center gap-3 border-b border-white/[0.08] py-4 last:border-0 last:pb-0"
        >
          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-white/[0.05] text-blue-100">
            <Icon size={21} />
          </span>

          <span>
            <strong className="block text-xs">
              {item.title}
            </strong>

            <small className="mt-1 block text-[10px] text-white/60">
              {item.description}
            </small>
          </span>
        </div>
      );
    })}
  </div>
</div>
  </div>
</section>

      

{/* STATISTIK UTAMA */}
<section className="relative z-10 mx-auto -mt-5 max-w-[1200px] px-4 sm:-mt-7 sm:px-6 lg:px-8">
  <div className="rounded-2xl border border-[#dcefe1] bg-white p-4 shadow-[0_8px_25px_rgba(15,23,42,0.05)] sm:p-5">

    {/* HEADER STATISTIK */}
    <div className="mb-4 flex flex-col justify-between gap-3 border-b border-slate-100 pb-3 sm:flex-row sm:items-center">
      <div>
        <span className="text-[10px] font-extrabold uppercase tracking-[0.15em] text-[#34734a]">
          Ringkasan Sistem
        </span>

        <h2 className="mt-1 text-lg font-extrabold tracking-tight text-[#243247] sm:text-xl">
          Statistik Dokumentasi SIMPB
        </h2>
      </div>

      {/* SUMBER DATA */}
      <div className="inline-flex w-fit items-center gap-2 rounded-lg border border-[#c8e4cb] bg-[#edf7ee] px-3 py-2">
        <span className="h-2 w-2 rounded-full bg-[#34804b]" />
        <span className="text-[10px] font-semibold text-[#34734a] sm:text-xs">
          Sumber Data: SIMPB BAPETEN
        </span>
      </div>
    </div>

    {/* KARTU STATISTIK */}
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">

      <StatCard
        icon={FileText}
        label="Total dokumen"
        value={totalDocuments}
        description="Total dokumen"
        color="green"
      />

      <StatCard
        icon={Eye}
        label="Total dilihat"
        value={totalViews}
        description="Total dilihat"
        color="yellow"
      />

      <StatCard
        icon={ArrowDownToLine}
        label="Total unduhan"
        value={totalDownloads}
        description="Total unduhan"
        color="blue"
      />

      <StatCard
        icon={Building2}
        label="Unit kerja"
        value={totalUnits}
        description="Unit kerja terkait dokumen"
        color="green"
      />

    </div>
  </div>
</section>




 {/* ILUSTRASI VIDEO DOKUMENTASI */}
<section className="mt-3 overflow-hidden border-y border-[#dceaf7] bg-gradient-to-br from-[#f4f9ff] via-white to-[#e7f3ff]">
  <div className="mx-auto flex max-w-[1200px] flex-col items-center gap-6 px-4 py-8 sm:px-6 sm:py-10 md:flex-row md:justify-between md:gap-8 lg:px-8">

    {/* KOLOM KIRI: TEKS */}
    <div className="w-full max-w-md text-center md:text-left">
      <span className="inline-flex rounded-full border border-[#c9def2] bg-white px-3 py-1.5 text-[10px] font-extrabold uppercase tracking-[0.16em] text-[#1769aa]">
        Sistem Dokumentasi Terintegrasi
      </span>

      <h2 className="mt-4 text-2xl font-extrabold tracking-tight text-[#104b7a] sm:text-3xl">
        Satu Portal, Berbagai Dokumen Proses Bisnis
      </h2>

      <p className="mt-3 text-sm leading-7 text-slate-600">
        Jelajahi Peta Proses, CFM, SOP, dan Standar Pelayanan
        dalam satu sistem dokumentasi proses bisnis BAPETEN.
      </p>
    </div>

    {/* KOLOM KANAN: VIDEO ANIMASI */}
    <div className="flex w-full items-center justify-center md:w-[55%]">
      <div className="w-full max-w-[620px] overflow-hidden rounded-2xl border border-[#dceaf7] bg-white shadow-xl shadow-blue-900/10">
        <video
          className="block aspect-video h-auto w-full object-cover"
          autoPlay
          loop
          muted
          playsInline
          preload="metadata"
          aria-label="Animasi dokumentasi proses bisnis SIMPB BAPETEN"
        >
          <source
            src="/img/Animasi-home.mp4"
            type="video/mp4"
          />

          Browser Anda tidak mendukung pemutaran video.
        </video>
      </div>
    </div>

  </div>
</section>

      <main>
        {/* KATALOG SOP */}
        <section
          id="sop"
          className="mx-auto max-w-[1200px] scroll-mt-24 px-4 pt-12 sm:px-6 sm:pt-16 lg:px-8"
        >
          <SectionHeading
            eyebrow="Katalog dokumen"
            title="Katalog SOP, Peta Proses, Sub Proses, dan CFM"
            description="Temukan dokumen tata laksana dan proses bisnis BAPETEN melalui pencarian berdasarkan judul, nomor, kategori, atau unit terkait."
            action="Buka dashboard"
            actionTo="/dashboard"
          />

          <div className="mb-6 flex flex-wrap gap-2" role="tablist" aria-label="Kategori dokumen">
            {[
              { id: "sop", label: "SOP", icon: FileText, count: approvedSops.length },
              { id: "peta", label: "Peta Proses", icon: Workflow, count: petaProses.length },
              { id: "sub", label: "Sub Proses", icon: Activity, count: subDocuments.length },
              { id: "cfm", label: "CFM", icon: Activity, count: cfmDocuments.length },
            ].map(({ id, label, icon: Icon, count }) => (
              <button
                key={id}
                type="button"
                role="tab"
                aria-selected={documentType === id}
                onClick={() => {
                  setDocumentType(id);
                  setDocumentPage(1);
                  setSearch("");
                  setActionError("");
                }}
                className={`inline-flex items-center gap-2 rounded-xl border px-4 py-3 text-sm font-extrabold transition ${
                  documentType === id
                    ? "border-[#1769aa] bg-[#1769aa] text-white shadow-md shadow-[#1769aa]/15"
                    : "border-[#e0e8f1] bg-white text-[#1769aa] hover:bg-[#eaf3fb]"
                }`}
              >
                <Icon size={17} />
                {label}
                <span className={`rounded-full px-2 py-0.5 text-[10px] ${
                  documentType === id ? "bg-white/20 text-white" : "bg-[#eaf3fb] text-[#1769aa]"
                }`}>
                  {count}
                </span>
              </button>
            ))}
          </div>

          <div className="mb-6 flex flex-col gap-3 sm:flex-row">
            <label className="flex min-w-0 flex-1 items-center gap-3 rounded-xl border border-[#e0e8f1] bg-white px-4 text-slate-400 transition focus-within:border-[#1769aa] focus-within:ring-2 focus-within:ring-[#1769aa]/10">
              <Search size={18} />
              <input
                type="search"
                placeholder={
                  documentType === "sop"
                    ? "Cari nama SOP, nomor, atau unit kerja..."
                    : documentType === "peta"
                      ? "Cari nama atau nomor peta proses..."
                      : "Cari nama atau nomor CFM..."
                }
                value={search}
                onChange={(event) => {
                  setSearch(event.target.value);
                  setDocumentPage(1);
                }}
                aria-label="Cari dokumen"
                className="w-full min-w-0 border-0 bg-transparent py-3.5 text-sm text-[#172b45] outline-none placeholder:text-slate-400"
              />
            </label>

            {documentType === "sop" && (
              <div className="flex self-start rounded-xl border border-[#e0e8f1] bg-white p-1">
                <button
                  type="button"
                  onClick={() => setActiveTab("terbaru")}
                  aria-pressed={activeTab === "terbaru"}
                  className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-2.5 text-xs font-extrabold transition ${
                    activeTab === "terbaru" ? "bg-[#1769aa] text-white" : "text-slate-500 hover:bg-[#eaf3fb]"
                  }`}
                >
                  <Clock3 size={14} /> Terbaru
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab("populer")}
                  aria-pressed={activeTab === "populer"}
                  className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-2.5 text-xs font-extrabold transition ${
                    activeTab === "populer" ? "bg-[#1769aa] text-white" : "text-slate-500 hover:bg-[#eaf3fb]"
                  }`}
                >
                  <TrendingUp size={14} /> Populer
                </button>
              </div>
            )}
          </div>

          {actionError && (
            <div role="alert" className="mb-5 flex items-center justify-between gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
              <span>{actionError}</span>
              <button type="button" aria-label="Tutup pesan" onClick={() => setActionError("")} className="shrink-0">
                <X size={17} />
              </button>
            </div>
          )}

          {documentType === "sop" ? (
            sopLoading ? (
              <LoadingState text="Memuat katalog SOP..." />
            ) : sopError ? (
              <ErrorState message={sopError} onRetry={loadSops} />
            ) : filteredSops.length ? (
              <>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {filteredSops
                    .slice(
                      (documentPage - 1) * DOCUMENTS_PER_PAGE,
                      documentPage * DOCUMENTS_PER_PAGE
                    )
                    .map((item, index) => (
                    <SopCard
                      key={getId(item) ?? index}
                      item={item}
                      index={(documentPage - 1) * DOCUMENTS_PER_PAGE + index}
                      onOpen={handleOpenSop}
                      onDownload={handleDownloadSop}
                      busyId={busyId}
                    />
                  ))}
                </div>
                {filteredSops.length > DOCUMENTS_PER_PAGE && (
                  <div className="mt-5 flex flex-wrap items-center justify-center gap-3">
                    <button
                      type="button"
                      onClick={() => setDocumentPage((page) => Math.max(1, page - 1))}
                      disabled={documentPage === 1}
                      className="rounded-lg border border-[#d5e2ef] bg-white px-4 py-2 text-sm font-semibold text-[#1769aa] hover:bg-[#eaf3fb] disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      Sebelumnya
                    </button>
                    <span className="text-xs text-slate-500">
                      Halaman {documentPage} dari {Math.ceil(filteredSops.length / DOCUMENTS_PER_PAGE)}
                    </span>
                    <button
                      type="button"
                      onClick={() => setDocumentPage((page) => Math.min(Math.ceil(filteredSops.length / DOCUMENTS_PER_PAGE), page + 1))}
                      disabled={documentPage >= Math.ceil(filteredSops.length / DOCUMENTS_PER_PAGE)}
                      className="rounded-lg border border-[#d5e2ef] bg-white px-4 py-2 text-sm font-semibold text-[#1769aa] hover:bg-[#eaf3fb] disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      Selanjutnya
                    </button>
                  </div>
                )}
                <div className="mt-7 flex justify-center">
                  <Link to="/dashboard" className="inline-flex items-center gap-2 rounded-xl border border-[#d5e2ef] bg-white px-5 py-3 text-sm font-bold text-[#104b7a] transition hover:bg-[#eaf3fb]">
                    Lihat katalog selengkapnya <ArrowRight size={15} />
                  </Link>
                </div>
              </>
            ) : (
              <EmptyState
                icon={Search}
                title={search ? "SOP tidak ditemukan" : "Belum ada SOP yang tersedia"}
                description={search ? "Coba kata kunci lain." : "SOP yang disetujui dan masih berlaku akan muncul di sini."}
                action={search ? "Hapus pencarian" : undefined}
                onAction={() => setSearch("")}
              />
            )
          ) : prosesLoading ? (
            <LoadingState text="Memuat katalog proses bisnis..." />
          ) : prosesError ? (
            <ErrorState message={prosesError} onRetry={loadProsesKatalog} />
          ) : (documentType === "peta" ? filteredPetaProses : documentType === "sub" ? filteredSubDocuments : filteredCfmDocuments).length ? (
            <>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {(documentType === "peta" ? filteredPetaProses : documentType === "sub" ? filteredSubDocuments : filteredCfmDocuments)
                  .slice(
                    (documentPage - 1) * DOCUMENTS_PER_PAGE,
                    documentPage * DOCUMENTS_PER_PAGE
                  )
                  .map((item, index) => (
                  <ProsesCard
                    key={`${documentType}-${item.id ?? index}`}
                    item={item}
                    index={index}
                    type={documentType}
                    onOpenPdf={handleOpenPdf}
                  />
                ))}
              </div>
              <p className="mt-5 text-center text-xs text-slate-500">
                Menampilkan {Math.min(documentPage * DOCUMENTS_PER_PAGE, (documentType === "peta" ? filteredPetaProses : documentType === "sub" ? filteredSubDocuments : filteredCfmDocuments).length)} dari {(documentType === "peta" ? filteredPetaProses : documentType === "sub" ? filteredSubDocuments : filteredCfmDocuments).length} dokumen
              </p>
              {(documentType === "peta" ? filteredPetaProses : documentType === "sub" ? filteredSubDocuments : filteredCfmDocuments).length > DOCUMENTS_PER_PAGE && (
                <div className="mt-5 flex flex-wrap items-center justify-center gap-3">
                  <button
                    type="button"
                    onClick={() => setDocumentPage((page) => Math.max(1, page - 1))}
                    disabled={documentPage === 1}
                    className="rounded-lg border border-[#d5e2ef] bg-white px-4 py-2 text-sm font-semibold text-[#1769aa] hover:bg-[#eaf3fb] disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    Sebelumnya
                  </button>
                  <span className="text-xs text-slate-500">
                    Halaman {documentPage} dari {Math.ceil((documentType === "peta" ? filteredPetaProses : documentType === "sub" ? filteredSubDocuments : filteredCfmDocuments).length / DOCUMENTS_PER_PAGE)}
                  </span>
                  <button
                    type="button"
                    onClick={() => setDocumentPage((page) => Math.min(Math.ceil((documentType === "peta" ? filteredPetaProses : documentType === "sub" ? filteredSubDocuments : filteredCfmDocuments).length / DOCUMENTS_PER_PAGE), page + 1))}
                    disabled={documentPage >= Math.ceil((documentType === "peta" ? filteredPetaProses : documentType === "sub" ? filteredSubDocuments : filteredCfmDocuments).length / DOCUMENTS_PER_PAGE)}
                    className="rounded-lg border border-[#d5e2ef] bg-white px-4 py-2 text-sm font-semibold text-[#1769aa] hover:bg-[#eaf3fb] disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    Selanjutnya
                  </button>
                </div>
              )}
            </>
          ) : (
            <EmptyState
              icon={Search}
              title={search ? "Dokumen tidak ditemukan" : `Belum ada ${documentType === "peta" ? "Peta Proses" : documentType === "sub" ? "Sub Proses" : "dokumen CFM"}`}
              description={search ? "Coba kata kunci lain." : "Dokumen yang tersedia akan ditampilkan di bagian ini."}
              action={search ? "Hapus pencarian" : undefined}
              onAction={() => setSearch("")}
            />
          )}
        </section>

        {/* STATISTIK DOKUMENTASI */}
        {/* SIMPB_STANDAR_HOME_V2 */}
        <section aria-labelledby="simpb-standar-title" className="simpb-standar-section mx-auto w-full max-w-[1200px] px-4 sm:px-6 lg:px-8">
          <div className="simpb-standar-panel relative isolate overflow-hidden rounded-[24px] border border-[#dbe7f2] bg-gradient-to-br from-[#f8fbff] via-white to-[#eef6fd]">
            <div aria-hidden="true" className="simpb-standar-glow pointer-events-none absolute -right-12 -top-16 h-64 w-64 rounded-full bg-cyan-200/35 blur-3xl" />
            <div className="relative grid items-center gap-6 p-6 sm:p-8 lg:grid-cols-[minmax(0,1fr)_300px] lg:gap-8 lg:p-10">
              <div className="simpb-standar-copy min-w-0">
                <p className="mb-3 flex items-center gap-2 text-[11px] font-extrabold uppercase tracking-[.16em] text-[#1769aa]"><span aria-hidden="true" className="h-1.5 w-1.5 rounded-full bg-cyan-500" />Informasi Pelayanan Publik</p>
                <h2 id="simpb-standar-title" className="text-2xl font-black tracking-tight text-[#092a4c] sm:text-3xl">Standar Pelayanan BAPETEN</h2>
                <p className="mt-3 max-w-2xl text-sm leading-7 text-slate-600">Informasi persyaratan, prosedur, jangka waktu, biaya, produk pelayanan, dan pengaduan yang disajikan secara jelas dalam satu katalog.</p>
                <Link to="/standar-pelayanan" className="mt-5 inline-flex items-center gap-2 rounded-xl bg-[#1769aa] px-5 py-3 text-sm font-bold text-white shadow-sm transition duration-200 hover:bg-[#104b7a] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1769aa]">Jelajahi Standar Pelayanan <span aria-hidden="true">→</span></Link>
              </div>
              <div className="simpb-standar-visual relative mx-auto flex min-h-[205px] w-full max-w-[300px] items-center justify-center" aria-hidden="true">
                <div className="simpb-standar-orbit absolute h-44 w-44 rounded-full border border-[#c9e6f8]" />
                <div className="simpb-standar-sheet simpb-standar-sheet-back absolute left-[12%] top-[13%] h-36 w-28 rotate-[-13deg] rounded-xl border border-[#d5e5f2] bg-white/75 p-3 shadow-md"><div className="h-2 w-10 rounded-full bg-blue-100"/><div className="mt-4 h-1.5 w-full rounded-full bg-slate-100"/><div className="mt-2 h-1.5 w-3/4 rounded-full bg-slate-100"/></div>
                <div className="simpb-standar-sheet simpb-standar-sheet-mid absolute right-[11%] top-[14%] h-36 w-28 rotate-[12deg] rounded-xl border border-[#d5e5f2] bg-white/85 p-3 shadow-md"><div className="h-2 w-12 rounded-full bg-cyan-100"/><div className="mt-4 h-1.5 w-full rounded-full bg-slate-100"/><div className="mt-2 h-1.5 w-4/5 rounded-full bg-slate-100"/></div>
                <div className="simpb-standar-sheet simpb-standar-sheet-front relative z-10 flex h-44 w-36 flex-col rounded-2xl border border-[#bdddf3] bg-white p-4 shadow-[0_16px_38px_rgba(16,75,122,.14)]"><span className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#eaf5fd] text-[#1769aa]"><svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><path d="M7 3h8l4 4v14H5V3h2Z"/><path d="M15 3v5h4M8 12h8M8 16h5"/><path d="m14 17 2 2 4-4"/></svg></span><div className="mt-4 h-2 w-20 rounded-full bg-[#c5e2f6]"/><div className="mt-2 h-1.5 w-full rounded-full bg-slate-100"/><div className="mt-2 h-1.5 w-4/5 rounded-full bg-slate-100"/><div className="mt-auto flex items-center gap-1.5 text-[10px] font-extrabold text-[#1769aa]"><span className="h-2 w-2 rounded-full bg-emerald-400"/> 14 KOMPONEN</div></div>
              </div>
            </div>
          </div>
        </section>
        <section
          id="statistik"
          className="mx-auto max-w-[1200px] scroll-mt-24 px-4 pt-12 sm:px-6 sm:pt-16 lg:px-8"
        >

          <SectionHeading
            eyebrow="Pusat data SIMPB-BAPETEN"
            title="Statistik dokumentasi"
            description="Pantau perkembangan dokumen dan persebarannya di seluruh unit kerja."
          />

          {sopLoading ? (
            <LoadingState text="Menghitung statistik..." />
          ) : sopError ? (
            <ErrorState message={sopError} onRetry={loadSops} />
          ) : (
            <div className="space-y-6">

              {/* HERO TOTAL DOKUMEN */}
              <article className="relative isolate overflow-hidden rounded-[30px] bg-gradient-to-br from-[#082d50] via-[#10588b] to-[#167eae] p-6 text-white shadow-[0_22px_55px_rgba(13,65,105,0.20)] sm:p-9">
                <div className="pointer-events-none absolute -right-24 -top-32 h-80 w-80 rounded-full border-[45px] border-white/[0.045]" />
                
                <div className="relative grid gap-8 lg:grid-cols-[0.85fr_1.15fr] lg:items-center">

                  <div>
                    <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.16em] text-cyan-100">
                      <span className="h-2 w-2 rounded-full bg-cyan-300" />
                      Ringkasan keseluruhan
                    </div>
                    <p className="text-sm font-semibold text-blue-100">Total dokumen terdata</p>
                    <div className="mt-2 flex items-end gap-3">
                      <strong className="text-6xl font-black leading-none tracking-[-0.06em] tabular-nums sm:text-7xl">
                        {formatNumber(totalDocuments)}
                      </strong>
                      <span className="mb-1.5 text-xs font-medium text-blue-100/80">Dokumen</span>
                    </div>
                    <p className="mt-5 max-w-sm text-xs leading-6 text-blue-100/80">
                      Akumulasi seluruh jenis dokumen yang tercatat dalam katalog SIMPB-BAPETEN.
                    </p>
                  </div>

                  <div className="rounded-[23px] border border-white/20 bg-[#174f78] p-5 sm:p-6">
                    <div className="mb-5 flex items-center justify-between gap-3">
                      <div>
                        <p className="text-sm font-bold text-white">Komposisi dokumentasi</p>
                        <p className="mt-1 text-[11px] text-blue-100/75">Proporsi berdasarkan jenis dokumen</p>
                      </div>
                      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/10">
                        <FileText size={20} />
                      </div>
                    </div>

                    <div className="flex h-3.5 w-full overflow-hidden rounded-full">
                      {[
                        { value: approvedSops.length, color: "bg-blue-500" },
                        { value: petaProses.length, color: "bg-purple-500" },
                        { value: subDocuments.length, color: "bg-emerald-500" },
                        { value: cfmDocuments.length, color: "bg-orange-500" },
                      ].map((item, index) => (
                        <div
                          key={index}
                          className={item.color + " h-full transition-all duration-700"}
                          style={{ width: (totalDocuments > 0 ? (item.value / totalDocuments) * 100 : 0) + "%" }}
                        />
                      ))}
                    </div>

                    <div className="mt-5 grid grid-cols-2 gap-x-5 gap-y-4">
                      {[
                        { label: "SOP", value: approvedSops.length, color: "bg-cyan-300" },
                        { label: "Peta Proses", value: petaProses.length, color: "bg-sky-400" },
                        { label: "Sub Proses", value: subDocuments.length, color: "bg-teal-300" },
                        { label: "CFM", value: cfmDocuments.length, color: "bg-indigo-300" },
                      ].map((item) => (
                        <div key={item.label} className="flex items-center gap-2.5">
                          <span className={"h-2.5 w-2.5 shrink-0 rounded-full " + item.color} />
                          <div className="min-w-0">
                            <p className="text-[10px] font-medium text-blue-100/75">{item.label}</p>
                            <p className="mt-0.5 text-lg font-extrabold tabular-nums text-white">{formatNumber(item.value)}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </article>

              {/* ANALISIS DISTRIBUSI DAN JENIS */}
              <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1.08fr_0.92fr]">

                {/* DISTRIBUSI UNIT KERJA */}
                <article className="min-w-0 rounded-[26px] border border-[#e3edf5] bg-white p-5 shadow-[0_12px_38px_rgba(23,67,105,0.055)] sm:p-7">
                  <div className="mb-7 flex items-center justify-between gap-3">
                    <div>
                      <p className="mb-2 text-[10px] font-extrabold uppercase tracking-[0.15em] text-[#2685b8]">Analisis persebaran</p>
                      <h3 className="text-lg font-extrabold tracking-tight text-[#173957]">Dokumen per unit kerja</h3>
                      <p className="mt-1 text-xs leading-5 text-slate-500">Enam unit dengan jumlah dokumen terbanyak.</p>
                    </div>
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-[#edf6fc] text-[#1976aa]">
                      <BarChart3 size={23} />
                    </div>
                  </div>

                  {unitChartData.length > 0 ? (
                    <div className="space-y-5">
                      {unitChartData.map((item, index) => (
                        <div key={item.unit} className="group">
                          <div className="mb-2.5 flex items-center justify-between gap-3">
                            <div className="flex min-w-0 items-center gap-3">
                              <span className={"flex h-8 w-8 shrink-0 items-center justify-center rounded-xl text-[11px] font-black " + (index === 0 ? "bg-blue-100 text-blue-700 ring-1 ring-blue-200" : index === 1 ? "bg-purple-100 text-purple-700 ring-1 ring-purple-200" : index === 2 ? "bg-emerald-100 text-emerald-700 ring-1 ring-emerald-200" : "bg-slate-100 text-slate-600")}>
                                {String(index + 1).padStart(2, "0")}
                              </span>
                              <span title={item.unit} className="truncate text-sm font-bold text-[#344d65]">{item.unit}</span>
                            </div>
                            <span className="shrink-0 text-sm font-extrabold tabular-nums text-[#176da5]">
                              {formatNumber(item.total)}
                              <span className="ml-1 text-[10px] font-medium text-slate-400">dokumen</span>
                            </span>
                          </div>
                          <div className="ml-11 h-2.5 overflow-hidden rounded-full bg-[#edf2f7]">
                            <div
                              className={"h-full rounded-full transition-all duration-700 " + (index === 0 ? "bg-gradient-to-r from-blue-600 to-blue-400" : index === 1 ? "bg-gradient-to-r from-purple-600 to-purple-400" : index === 2 ? "bg-gradient-to-r from-emerald-600 to-emerald-400" : "bg-gradient-to-r from-slate-400 to-slate-300")}
                              style={{ width: ((item.total / maxUnitCount) * 100) + "%" }}
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="rounded-2xl bg-[#f7fafc] px-4 py-10 text-center text-sm text-slate-500">
                      Belum ada data statistik unit kerja.
                    </div>
                  )}
                </article>

                {/* RINCIAN JENIS DOKUMEN */}
                <article className="min-w-0 rounded-[26px] border border-[#e3edf5] bg-white p-5 shadow-[0_12px_38px_rgba(23,67,105,0.055)] sm:p-7">
                  <div className="mb-7">
                    <p className="mb-2 text-[10px] font-extrabold uppercase tracking-[0.15em] text-[#2685b8]">Rincian katalog</p>
                    <h3 className="text-lg font-extrabold tracking-tight text-[#173957]">Jenis dokumen</h3>
                    <p className="mt-1 text-xs leading-5 text-slate-500">Perbandingan jumlah setiap kategori dokumentasi.</p>
                  </div>

                  <div className="space-y-3">
                    {[
                      { label: "SOP", description: "Standar Operasional Prosedur", value: approvedSops.length, color: "bg-blue-600", tint: "bg-blue-50", text: "text-blue-700" },
                      { label: "Peta Proses", description: "Peta proses bisnis", value: petaProses.length, color: "bg-purple-600", tint: "bg-purple-50", text: "text-purple-700" },
                      { label: "Sub Proses", description: "Dokumen turunan proses", value: subDocuments.length, color: "bg-emerald-600", tint: "bg-emerald-50", text: "text-emerald-700" },
                      { label: "CFM", description: "Cross Functional Map", value: cfmDocuments.length, color: "bg-orange-500", tint: "bg-orange-50", text: "text-orange-700" },
                    ].map((item) => {
                      const percentage = totalDocuments > 0 ? (item.value / totalDocuments) * 100 : 0;

                      return (
                        <div key={item.label} className="flex items-center gap-3 rounded-2xl border border-[#edf1f5] p-3.5 transition-colors hover:border-[#d4e6f3] hover:bg-[#fbfdff]">
                          <div className={"flex h-11 w-11 shrink-0 items-center justify-center rounded-xl " + item.tint}>
                            <FileText size={19} className={item.text} />
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center justify-between gap-3">
                              <div className="min-w-0">
                                <p className="truncate text-sm font-extrabold text-[#29445e]">{item.label}</p>
                                <p className="mt-0.5 truncate text-[10px] text-slate-400">{item.description}</p>
                              </div>
                              <div className="shrink-0 text-right">
                                <p className="text-lg font-black leading-none tabular-nums text-[#183e5d]">{formatNumber(item.value)}</p>
                                <p className="mt-1 text-[10px] font-semibold text-slate-400">{Math.round(percentage)}%</p>
                              </div>
                            </div>
                            <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-[#edf2f6]">
                              <div className={"h-full rounded-full " + item.color} style={{ width: percentage + "%" }} />
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </article>
              </div>
            </div>
          )}
        </section>

        {/* BERITA DAN PENGUMUMAN */}
        <section
          id="informasi"
          className="mx-auto max-w-[1200px] scroll-mt-24 px-4 pt-12 sm:px-6 sm:pt-16 lg:px-8"
        >
          <SectionHeading
            eyebrow="Pusat informasi"
            title="Informasi dan berita"
            description="Ikuti berita terbaru dan pengumuman aktif yang tersedia di SIMPB-BAPETEN."
            action="Ke dashboard"
            actionTo="/dashboard"
          />

          {informasiError && (
            <div className="mb-5">
              <ErrorState message={informasiError} onRetry={loadInformasi} />
            </div>
          )}

          {informasiLoading ? (
            <LoadingState text="Memuat berita dan pengumuman..." />
          ) : (
            <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
              {/* BERITA */}
              <article id="simpb-berita" className="min-w-0 scroll-mt-28 rounded-2xl border border-[#e0e8f1] bg-white p-5 sm:p-6">
                <PanelHeading
                  icon={Newspaper}
                  title="Berita terbaru"
                  description="Informasi yang sudah dipublikasikan."
                />

                {berita.length > 0 ? (
                  <div className="max-h-[450px] overflow-y-auto overscroll-contain pr-2">
                    {berita.map((item, index) => (
                      <article
                        key={item.id ?? item.slug ?? index}
                        className="flex min-w-0 gap-3 border-b border-slate-100 py-4 first:pt-0 last:border-0 last:pb-0"
                      >
                        <div className="grid h-[76px] w-[83px] shrink-0 place-items-center overflow-hidden rounded-xl bg-[#eaf3fb] text-[#1769aa]">
                          {item.thumbnail ? (
                            <SecureMedia
                              src={item.thumbnail}
                              alt={item.judul || "Thumbnail berita"}
                              loading="lazy"
                              className="h-full w-full object-cover"
                            />
                          ) : (
                            <Newspaper size={25} />
                          )}
                        </div>

                        <div className="min-w-0 flex-1">
                          <span className="flex items-center gap-1.5 text-[10px] text-slate-500">
                            <CalendarDays size={12} />
                            {formatDate(getNewsDate(item))}
                          </span>

                          <h4 className="mt-2 break-words text-sm font-bold leading-5 text-[#172b45]">
                            {item.judul || "Berita"}
                          </h4>

                          {item.tempat && (
                            <p className="mt-1 text-xs text-slate-500">
                              {item.tempat}
                            </p>
                          )}

                          {item.slug && (
                            <Link
                              to={`/berita/${encodeURIComponent(item.slug)}`}
                              className="mt-2 inline-flex items-center gap-1 text-xs font-extrabold text-[#1769aa] hover:underline"
                            >
                              Baca berita
                              <ArrowRight size={13} />
                            </Link>
                          )}
                        </div>
                      </article>
                    ))}
                  </div>
                ) : (
                  <EmptyState
                    icon={Newspaper}
                    title="Belum ada berita"
                    description="Berita akan tampil setelah dipublikasikan dan tersedia melalui backend."
                  />
                )}
              </article>

              {/* PENGUMUMAN */}
              <article id="simpb-pengumuman" className="min-w-0 scroll-mt-28 rounded-2xl border border-[#e0e8f1] bg-white p-5 sm:p-6">
                <PanelHeading
                  icon={Bell}
                  title="Pengumuman aktif"
                  description="Informasi pengumuman yang masih berlaku."
                />

                {pengumuman.length > 0 ? (
                  <div className="grid gap-3">
                    {pengumuman.slice(0, 5).map((item, index) => (
                      <article
                        key={item.id ?? index}
                        className="flex min-w-0 gap-3 border-b border-slate-100 py-4 first:pt-0 last:border-0 last:pb-0"
                      >
                        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-amber-50 text-amber-700">
                          <Bell size={18} />
                        </span>

                        <div className="min-w-0 flex-1">
                          <span className="text-[10px] text-slate-500">
                            {formatDate(getAnnouncementDate(item))}
                          </span>

                          <h4 className="mt-1 break-words text-sm font-bold leading-6 text-[#172b45]">
                            {item.judul || "Pengumuman"}
                          </h4>
                          <Link
                            to={`/pengumuman/${encodeURIComponent(item.id)}`}
                            className="mt-2 inline-flex items-center gap-1 text-xs font-extrabold text-[#1769aa] hover:underline"
                          >
                            Baca pengumuman
                            <ArrowRight size={13} />
                          </Link>

                          {item.tanggal_kadaluarsa && (
                            <p className="mt-2 text-[10px] text-slate-500">
                              Berlaku sampai:{" "}
                              {formatDate(item.tanggal_kadaluarsa)}
                            </p>
                          )}
                        </div>
                      </article>
                    ))}
                  </div>
                ) : (
                  <EmptyState
                    icon={Bell}
                    title="Belum ada pengumuman aktif"
                    description="Pengumuman aktif yang belum kedaluwarsa akan tampil di bagian ini."
                  />
                )}
              </article>
            </div>
          )}
        </section>
      </main>

      
      <LiveChatWidget />
    </div>
  );
}
