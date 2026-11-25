import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useParams } from "react-router-dom";
import {
  ArrowLeft,
  FileText,
  Search,
  RefreshCw,
  Building2,
  CalendarDays,
  CheckCircle2,
  Filter,
  X,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
} from "lucide-react";

import SiteNavbar from "../components/SiteNavbar.jsx";
import PublicStatisticsPage from "./PublicStatisticsPage.jsx";
import PublicAnnouncementPage from "./PublicAnnouncementPage.jsx";
import PublicNewsPage from "./PublicNewsPage.jsx";
import api, { openPdf, errMsg } from "../api/client.js";
import * as pdfjsLib from "pdfjs-dist";
import pdfWorker from "pdfjs-dist/build/pdf.worker.min.mjs?url";

pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorker;

const titles = {
  peta: "Peta Proses",
  sub: "Sub Proses",
  cfm: "Cross Functional Map (CFM)",
  sop: "Standar Operasional Prosedur (SOP)",
  berita: "Berita",
  pengumuman: "Pengumuman",
};

const PAGE_SIZE = 9;

// Ambil semua SOP (per 100 data) supaya tidak terbatas di halaman pertama API
async function fetchAllSop() {
  const limit = 100;
  const seen = new Set();
  let all = [];

  for (let page = 1; page <= 50; page++) {
    const res = await api.get(`/sop?page=${page}&limit=${limit}`);
    const rows = rowsOf(res);

    const fresh = rows.filter((r) => !seen.has(r.id));
    fresh.forEach((r) => seen.add(r.id));
    all = all.concat(fresh);

    // berhenti jika halaman terakhir atau API mengulang data yang sama
    if (rows.length < limit || fresh.length === 0) break;
  }

  return { data: all };
}

// Nomor halaman dengan elipsis, contoh: 1 … 4 5 6 … 12
function pageNumbers(current, total) {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);

  const pages = new Set([1, total, current - 1, current, current + 1]);
  const sorted = [...pages]
    .filter((n) => n >= 1 && n <= total)
    .sort((a, b) => a - b);

  const result = [];
  sorted.forEach((n, i) => {
    if (i > 0 && n - sorted[i - 1] > 1) result.push("...");
    result.push(n);
  });
  return result;
}

const docLabels = {
  sop: "SOP",
  peta: "Peta Proses",
  sub: "Sub Proses",
  cfm: "CFM",
};

const numberLabels = {
  sop: "Nomor SOP",
  peta: "Nomor Peta Proses",
  sub: "Nomor Sub Proses",
  cfm: "Nomor CFM",
};

const cardLabels = {
  sop: "Standar Operasional Prosedur",
  peta: "Peta Proses",
  sub: "Sub Proses",
  cfm: "Cross Functional Map",
};

function rowsOf(response) {
  const d = response?.data;

  return Array.isArray(d)
    ? d
    : Array.isArray(d?.data)
    ? d.data
    : Array.isArray(d?.rows)
    ? d.rows
    : [];
}

// Helper field (fallback jika nama field berbeda antar jenis dokumen)
const getYear = (x) => String(x.tahun_terbit || x.tahun || "");
const getUnitId = (x) => String(x.unit_kerja_id ?? "");

// Peta/Sub/CFM menyimpan pemilik proses di field "units", contoh: "BOU||Inspektorat"
const splitUnits = (x) =>
  String(x.units || "")
    .split("||")
    .map((u) => u.trim())
    .filter(Boolean);

// Status berlaku hanya ada pada data SOP
const hasStatus = (type) => type === "sop";
const getStatus = (x) => x.status_berlaku || x.status || "";
// Endpoint PDF per jenis dokumen
const getPdfPath = (type, x) => {
  if (type === "sop") return `/sop/${x.id}/view`;

  if (["peta", "sub", "cfm"].includes(type)) {
    // Jika backend menandai dokumen belum punya file, jangan tampilkan PDF
    if (x.has_file === false || x.file_pdf === false) return null;
    return `/proses/${type}/${x.id}/file`;
  }

  return null;
};
const statusLabel = (s) => String(s).replaceAll("_", " ");

// Dropdown filter dengan label dan ikon panah
function FilterSelect({ label, value, onChange, children }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-[11px] font-extrabold uppercase tracking-wider text-[#17417d]">
        {label}
      </span>

      <span className="relative block">
        <select
          value={value}
          onChange={onChange}
          className={`h-12 w-full cursor-pointer appearance-none rounded-xl border bg-white pl-4 pr-10 text-sm font-medium outline-none transition focus:border-[#2563a6] focus:ring-4 focus:ring-blue-100 ${
            value
              ? "border-[#245b96] text-[#102a56]"
              : "border-slate-200 text-slate-600 hover:border-[#9dbde0]"
          }`}
        >
          {children}
        </select>

        <ChevronDown
          size={18}
          className="pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2 text-[#245b96]"
        />
      </span>
    </label>
  );
}

// Cache thumbnail supaya PDF tidak dirender ulang
const thumbCache = new Map();

// Thumbnail halaman pertama PDF (dirender hanya saat kartu terlihat di layar)
function PdfThumb({ path }) {
  const ref = useRef(null);
  const [src, setSrc] = useState(thumbCache.get(path) || "");

  useEffect(() => {
    if (!path || src || !ref.current) return;

    let cancelled = false;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) return;
        observer.disconnect();

        (async () => {
          let pdf;
          try {
            const res = await api.get(path, { responseType: "arraybuffer" });
            pdf = await pdfjsLib.getDocument({ data: res.data }).promise;

            const page = await pdf.getPage(1);
            const base = page.getViewport({ scale: 1 });
            const viewport = page.getViewport({ scale: 640 / base.width });

            const canvas = document.createElement("canvas");
            canvas.width = viewport.width;
            canvas.height = viewport.height;

            const ctx = canvas.getContext("2d");
            ctx.fillStyle = "#ffffff";
            ctx.fillRect(0, 0, canvas.width, canvas.height);

            await page.render({ canvasContext: ctx, viewport }).promise;

            const url = canvas.toDataURL("image/jpeg", 0.85);
            thumbCache.set(path, url);
            if (!cancelled) setSrc(url);
          } catch (e) {
            // gagal: biarkan tampilan fallback (ikon)
          } finally {
            pdf?.destroy();
          }
        })();
      },
      { rootMargin: "200px" }
    );

    observer.observe(ref.current);

    return () => {
      cancelled = true;
      observer.disconnect();
    };
  }, [path, src]);

  return (
    <div ref={ref} className="absolute inset-0">
      {src && (
        <img
          src={src}
          alt=""
          className="h-full w-full bg-white object-cover object-top"
        />
      )}
    </div>
  );
}

// Cover kartu dokumen: thumbnail PDF, fallback gradient + ikon
function DocCover({ label, year, pdfPath }) {
  return (
    <div className="relative h-52 overflow-hidden bg-gradient-to-br from-[#102a56] via-[#17417d] to-[#326eae]">
      <div className="absolute inset-0 flex items-center justify-center">
        <FileText size={64} strokeWidth={1.4} className="text-white/25" />
      </div>

      {pdfPath && <PdfThumb path={pdfPath} />}

      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-20 bg-gradient-to-t from-[#102a56]/85 to-transparent" />

      <span className="absolute left-4 top-4 rounded-lg bg-white/90 px-3 py-1.5 text-[11px] font-extrabold uppercase tracking-wide text-[#102a56] shadow-sm">
        {label}
      </span>

      {year && (
        <div className="absolute bottom-3 left-4 flex items-center gap-2 text-sm font-semibold text-white">
          <CalendarDays size={16} />
          {year}
        </div>
      )}
    </div>
  );
}

export default function PublicPortalPage({ kind }) {
  const { type } = useParams();

  const [items, setItems] = useState([]);
  const [units, setUnits] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Filter dokumen
  const [query, setQuery] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedYear, setSelectedYear] = useState("");
  const [selectedUnit, setSelectedUnit] = useState("");
  const [selectedStatus, setSelectedStatus] = useState("");
  const [page, setPage] = useState(1);

  const valid =
    kind === "dokumen"
      ? ["peta", "sub", "cfm", "sop"].includes(type)
      : kind === "informasi"
      ? ["berita", "pengumuman"].includes(type)
      : true;

  // Kembali ke halaman 1 jika filter atau kategori berubah
  useEffect(() => {
    setPage(1);
  }, [type, searchQuery, selectedYear, selectedUnit, selectedStatus]);

  // Mengambil data dokumen dan unit kerja
  useEffect(() => {
    let live = true;

    if (kind === "statistik") return;

    setLoading(true);
    setError("");
    setItems([]);
    setUnits([]);

    // Reset filter setiap pindah kategori
    setQuery("");
    setSearchQuery("");
    setSelectedYear("");
    setSelectedUnit("");
    setSelectedStatus("");

    const request =
      kind === "dokumen"
        ? type === "sop"
          ? Promise.all([fetchAllSop(), api.get("/unit-kerja")])
          : api.get("/proses/katalog")
        : kind === "informasi"
        ? api.get("/" + type + "?limit=100")
        : Promise.all([
            api.get("/sop?page=1&limit=100"),
            api.get("/proses/katalog"),
          ]);

    Promise.resolve(request)
      .then((result) => {
        if (!live) return;

        if (kind === "statistik") {
          const [s, p] = result;

          setItems([
            {
              name: "SOP",
              count: rowsOf(s).filter(
                (x) => x.approval_status === "approved"
              ).length,
            },
            {
              name: "Peta Proses",
              count: p.data?.peta?.length || 0,
            },
            {
              name: "Sub Proses",
              count: p.data?.sub?.length || 0,
            },
            {
              name: "CFM",
              count: p.data?.cfm?.length || 0,
            },
          ]);
        } else if (kind === "dokumen") {
          if (type === "sop") {
            const [sopResponse, unitResponse] = result;

            const approvedSop = rowsOf(sopResponse).filter(
              (x) => x.approval_status === "approved"
            );

            setItems(approvedSop);
            setUnits(rowsOf(unitResponse));
          } else {
            setItems(result.data?.[type] || []);
          }
        } else {
          setItems(rowsOf(result));
        }
      })
      .catch((e) => {
        if (live) setError(errMsg(e));
      })
      .finally(() => {
        if (live) setLoading(false);
      });

    return () => {
      live = false;
    };
  }, [kind, type]);

  // Daftar tahun otomatis berdasarkan data
  const years = useMemo(() => {
    return [...new Set(items.map(getYear).filter(Boolean))].sort(
      (a, b) => Number(b) - Number(a)
    );
  }, [items]);

  // Daftar status otomatis berdasarkan data
  const statusOptions = useMemo(() => {
    return [...new Set(items.map(getStatus).filter(Boolean))];
  }, [items]);

  // Daftar pemilik proses
  const unitOptions = useMemo(() => {
    // Peta/Sub/CFM: ambil daftar unit langsung dari data
    if (type !== "sop") {
      return [...new Set(items.flatMap(splitUnits))]
        .sort((a, b) => a.localeCompare(b))
        .map((name) => ({ id: name, nama_unit: name }));
    }

    if (units.length > 0) return units;

    const uniqueUnits = new Map();

    items.forEach((item) => {
      if (item.unit_kerja_id && item.nama_unit) {
        uniqueUnits.set(item.unit_kerja_id, {
          id: item.unit_kerja_id,
          nama_unit: item.nama_unit,
        });
      }
    });

    return Array.from(uniqueUnits.values());
  }, [type, units, items]);

  // Filter dokumen
  const shown = useMemo(() => {
    return items.filter((item) => {
      const keyword = searchQuery.trim().toLowerCase();

      const searchableText = [
        item.nomor,
        item.nomor_sop,
        item.nama_sop,
        item.nama_proses,
        item.judul,
        item.title,
        item.nama,
        item.nama_unit,
        item.units,
        item.nama_peta_proses,
        item.nama_lembaga,
        item.tahun_terbit,
        item.tahun,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      const matchSearch = !keyword || searchableText.includes(keyword);
      const matchYear = !selectedYear || getYear(item) === selectedYear;
      const matchUnit =
        !selectedUnit ||
        (type === "sop"
          ? getUnitId(item) === selectedUnit
          : splitUnits(item).includes(selectedUnit));
      const matchStatus =
        !hasStatus(type) ||
        !selectedStatus ||
        getStatus(item) === selectedStatus;

      return matchSearch && matchYear && matchUnit && matchStatus;
    });
  }, [type, items, searchQuery, selectedYear, selectedUnit, selectedStatus]);

  const totalPages = Math.max(1, Math.ceil(shown.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const startIndex = (currentPage - 1) * PAGE_SIZE;
  const paged = shown.slice(startIndex, startIndex + PAGE_SIZE);

  const goToPage = (n) => {
    setPage(n);
    document
      .getElementById("daftar-dokumen")
      ?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const title = titles[type] || "Halaman tidak ditemukan";

  const resetFilters = () => {
    setQuery("");
    setSearchQuery("");
    setSelectedYear("");
    setSelectedUnit("");
    setSelectedStatus("");
  };

  const activeFilterCount = [
    searchQuery.trim(),
    selectedYear,
    selectedUnit,
    hasStatus(type) ? selectedStatus : "",
  ].filter(Boolean).length;

  const selectedUnitName =
    unitOptions.find((u) => String(u.id) === selectedUnit)?.nama_unit ||
    selectedUnit;

  if (kind === "statistik") {
    return <PublicStatisticsPage />;
  }

  if (kind === "informasi" && type === "pengumuman") {
    return <PublicAnnouncementPage />;
  }

  if (kind === "informasi" && type === "berita") {
    return <PublicNewsPage />;
  }

  return (
    <div className="min-h-screen bg-[#f3f7fc] text-slate-800">
      <SiteNavbar />

      <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:py-10">
        {/* Kembali */}
        <Link
          to="/"
          className="inline-flex items-center gap-2 text-sm font-semibold text-[#245b96] transition hover:text-[#102a56]"
        >
          <ArrowLeft size={17} />
          Kembali ke Beranda
        </Link>

        {/* Hero */}
        <section className="relative mt-7 overflow-hidden rounded-3xl bg-gradient-to-r from-[#102a56] via-[#17417d] to-[#326eae] px-6 py-8 text-white shadow-lg sm:px-9 sm:py-9">
          <div className="pointer-events-none absolute -right-16 -top-24 h-64 w-64 rounded-full border-[35px] border-white/5" />
          <div className="pointer-events-none absolute -bottom-28 right-40 h-64 w-64 rounded-full bg-blue-300/10 blur-3xl" />

          <div className="relative z-10">
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-blue-100">
              SIMPB BAPETEN · Portal Dokumentasi
            </p>

            <h1 className="mt-3 text-2xl font-extrabold sm:text-3xl">
              {title}
            </h1>

            <p className="mt-2 max-w-2xl text-sm leading-6 text-blue-100">
              {kind === "dokumen"
                ? "Katalog dokumen resmi yang telah disetujui dan tersedia untuk diakses."
                : "Informasi resmi yang tersedia pada portal SIMPB BAPETEN."}
            </p>
          </div>
        </section>

        {!valid ? (
          <p className="mt-8 rounded-xl bg-white p-6">
            Kategori tidak ditemukan.
          </p>
        ) : (
          <>
            {/* FILTER DOKUMEN (SOP, Peta Proses, Sub Proses, CFM) */}
            {kind === "dokumen" ? (
              <section className="mt-7 overflow-hidden rounded-3xl border border-[#d6e4f5] bg-white shadow-[0_12px_32px_-16px_rgba(16,42,86,0.25)]">
                <div className="h-1.5 bg-gradient-to-r from-[#102a56] via-[#245b96] to-[#5aa3e0]" />

                <form
                  onSubmit={(e) => e.preventDefault()}
                  className="p-5 sm:p-7"
                >
                  {/* Judul filter */}
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-[#245b96] to-[#17417d] text-white shadow-md">
                        <Filter size={20} />
                      </div>

                      <div>
                        <h2 className="text-base font-extrabold text-[#102a56]">
                          Cari &amp; Filter Dokumen
                        </h2>
                        <p className="text-xs text-slate-500">
                          Hasil langsung menyesuaikan saat Anda mengetik atau
                          memilih filter.
                        </p>
                      </div>
                    </div>

                    {activeFilterCount > 0 && (
                      <button
                        type="button"
                        onClick={resetFilters}
                        className="inline-flex items-center gap-2 rounded-full border border-[#c5d8ee] bg-white px-4 py-2 text-xs font-bold text-[#245b96] transition hover:border-[#245b96] hover:bg-blue-50"
                      >
                        <RefreshCw size={14} />
                        Reset ({activeFilterCount})
                      </button>
                    )}
                  </div>

                  {/* Pencarian (langsung, tanpa tombol) */}
                  <div className="relative mt-5">
                    <Search
                      size={20}
                      className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-[#245b96]"
                    />

                    <input
                      type="text"
                      aria-label="Cari dokumen"
                      value={query}
                      onChange={(e) => {
                        setQuery(e.target.value);
                        setSearchQuery(e.target.value);
                      }}
                      placeholder={`Cari nama atau nomor ${
                        docLabels[type] || "dokumen"
                      }...`}
                      className="h-14 w-full rounded-2xl border border-slate-200 bg-slate-50 pl-12 pr-12 text-sm font-medium text-slate-800 outline-none transition placeholder:font-normal placeholder:text-slate-400 hover:border-[#9dbde0] focus:border-[#2563a6] focus:bg-white focus:ring-4 focus:ring-blue-100"
                    />

                    {query && (
                      <button
                        type="button"
                        aria-label="Hapus pencarian"
                        onClick={() => {
                          setQuery("");
                          setSearchQuery("");
                        }}
                        className="absolute right-3 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full text-slate-400 transition hover:bg-slate-200 hover:text-slate-700"
                      >
                        <X size={16} />
                      </button>
                    )}
                  </div>

                  {/* Dropdown filter */}
                  <div
                    className={`mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 ${
                      hasStatus(type) ? "lg:grid-cols-3" : "lg:grid-cols-2"
                    }`}
                  >
                    <FilterSelect
                      label="Tahun"
                      value={selectedYear}
                      onChange={(e) => setSelectedYear(e.target.value)}
                    >
                      <option value="">Semua Tahun</option>
                      {years.map((year) => (
                        <option key={year} value={year}>
                          {year}
                        </option>
                      ))}
                    </FilterSelect>

                    <FilterSelect
                      label="Pemilik Proses"
                      value={selectedUnit}
                      onChange={(e) => setSelectedUnit(e.target.value)}
                    >
                      <option value="">Semua Unit</option>
                      {unitOptions.map((unit) => (
                        <option key={unit.id} value={unit.id}>
                          {unit.nama_unit}
                        </option>
                      ))}
                    </FilterSelect>

                    {hasStatus(type) && (
                      <FilterSelect
                        label="Status"
                        value={selectedStatus}
                        onChange={(e) => setSelectedStatus(e.target.value)}
                      >
                        <option value="">Semua Status</option>
                        {statusOptions.map((st) => (
                          <option key={st} value={st}>
                            {statusLabel(st)}
                          </option>
                        ))}
                      </FilterSelect>
                    )}
                  </div>

                  {/* Filter aktif */}
                  {activeFilterCount > 0 && (
                    <div className="mt-5 flex flex-wrap items-center gap-2 border-t border-slate-100 pt-4">
                      <span className="text-xs font-semibold text-slate-500">
                        Filter aktif:
                      </span>

                      {searchQuery.trim() && (
                        <button
                          type="button"
                          onClick={() => {
                            setQuery("");
                            setSearchQuery("");
                          }}
                          className="inline-flex items-center gap-1.5 rounded-full bg-blue-50 px-3 py-1.5 text-xs font-bold text-[#245b96] transition hover:bg-blue-100"
                        >
                          “{searchQuery.trim()}”
                          <X size={13} />
                        </button>
                      )}

                      {selectedYear && (
                        <button
                          type="button"
                          onClick={() => setSelectedYear("")}
                          className="inline-flex items-center gap-1.5 rounded-full bg-blue-50 px-3 py-1.5 text-xs font-bold text-[#245b96] transition hover:bg-blue-100"
                        >
                          Tahun {selectedYear}
                          <X size={13} />
                        </button>
                      )}

                      {selectedUnit && (
                        <button
                          type="button"
                          onClick={() => setSelectedUnit("")}
                          className="inline-flex items-center gap-1.5 rounded-full bg-blue-50 px-3 py-1.5 text-xs font-bold text-[#245b96] transition hover:bg-blue-100"
                        >
                          {selectedUnitName}
                          <X size={13} />
                        </button>
                      )}

                      {hasStatus(type) && selectedStatus && (
                        <button
                          type="button"
                          onClick={() => setSelectedStatus("")}
                          className="inline-flex items-center gap-1.5 rounded-full bg-blue-50 px-3 py-1.5 text-xs font-bold text-[#245b96] transition hover:bg-blue-100"
                        >
                          {statusLabel(selectedStatus)}
                          <X size={13} />
                        </button>
                      )}
                    </div>
                  )}
                </form>
              </section>
            ) : (
              /* Pencarian untuk kategori lainnya */
              <div className="mt-7 flex items-center gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
                <Search size={18} className="text-[#1769aa]" />

                <input
                  aria-label="Cari"
                  className="w-full bg-transparent text-sm outline-none"
                  placeholder={"Cari " + title + "..."}
                  value={query}
                  onChange={(e) => {
                    setQuery(e.target.value);
                    setSearchQuery(e.target.value);
                  }}
                />
              </div>
            )}

            {/* Informasi jumlah dokumen */}
            {!loading && !error && (
              <div
                id="daftar-dokumen"
                className="mt-6 flex scroll-mt-24 flex-wrap items-center justify-between gap-2"
              >
                <div>
                  <h2 className="text-lg font-bold text-[#102a56]">
                    Daftar Dokumen
                  </h2>
                  <p className="mt-1 text-xs text-slate-500">
                    Dokumen yang tersedia pada portal SIMPB BAPETEN.
                  </p>
                </div>

                <span className="rounded-full border border-blue-100 bg-blue-50 px-4 py-2 text-xs font-bold text-[#245b96]">
                  {shown.length} Dokumen
                </span>
              </div>
            )}

            {/* Loading */}
            {loading ? (
              <div className="mt-8 flex min-h-40 items-center justify-center gap-3 rounded-2xl bg-white text-sm font-medium text-slate-500 shadow-sm">
                <RefreshCw
                  size={19}
                  className="animate-spin text-[#245b96]"
                />
                Memuat data dokumen...
              </div>
            ) : error ? (
              <div
                role="alert"
                className="mt-8 rounded-xl border border-red-200 bg-red-50 p-5 text-sm text-red-700"
              >
                {error}
              </div>
            ) : (
              <>
                {/* Kartu dokumen */}
                <div className="mt-5 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
                  {paged.map((x, i) => {
                    const owner =
                      splitUnits(x).join(", ") ||
                      x.nama_unit ||
                      x.nama_lembaga ||
                      "Pemilik proses belum tersedia";

                    const name =
                      x.nama_sop ||
                      x.nama_proses ||
                      x.judul ||
                      x.title ||
                      x.nama ||
                      x.nomor_sop ||
                      `Dokumen ${docLabels[type] || ""}`.trim();

                    const status = getStatus(x);
                    const pdfPath = getPdfPath(type, x);

                    return (
                      <article
                        key={x.id ?? i}
                        className="group flex flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition duration-300 hover:-translate-y-1 hover:border-blue-200 hover:shadow-lg"
                      >
                        {/* Cover */}
                        <DocCover
                          pdfPath={pdfPath}
                          label={cardLabels[type] || "Dokumen"}
                          year={getYear(x)}
                        />

                        <div className="flex flex-1 flex-col p-5">

                        {/* Nama dokumen */}
                        <h2 className="text-base leading-7 font-bold text-slate-800 transition group-hover:text-[#245b96]">
                          {name}
                        </h2>

                        {/* Nomor dokumen (SOP / Peta Proses / Sub Proses / CFM) */}
                        {(x.nomor_sop || x.nomor) && (
                          <p className="mt-2 text-xs font-medium text-slate-500">
                            {numberLabels[type] || "Nomor"}:{" "}
                            <span className="font-bold text-[#245b96]">
                              {x.nomor_sop || x.nomor}
                            </span>
                          </p>
                        )}

                        {/* Informasi dokumen */}
                        <div className="mt-4 space-y-3 border-t border-slate-100 pt-4">
                          <div className="flex items-start gap-2.5">
                            <Building2
                              size={17}
                              className="mt-0.5 shrink-0 text-[#245b96]"
                            />

                            <div>
                              <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">
                                Pemilik Proses
                              </p>
                              <p className="mt-1 text-sm font-semibold text-slate-700">
                                {owner}
                              </p>
                            </div>
                          </div>

                          {hasStatus(type) && (
<div className="flex items-center gap-2.5">
                            <CheckCircle2
                              size={17}
                              className="shrink-0 text-[#245b96]"
                            />

                            <div>
                              <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">
                                Status Dokumen
                              </p>

                              <span
                                className={`mt-1 inline-flex rounded-full px-2.5 py-1 text-[11px] font-bold ${
                                  status === "Berlaku"
                                    ? "bg-green-50 text-green-700"
                                    : status === "Tidak_Berlaku"
                                    ? "bg-red-50 text-red-700"
                                    : "bg-slate-100 text-slate-600"
                                }`}
                              >
                                {status
                                  ? statusLabel(status)
                                  : "Belum ditentukan"}
                              </span>
                            </div>
                          </div>
                          )}
                        </div>

                        {/* Tombol PDF */}
                        {pdfPath && (
                          <div className="mt-auto pt-5">
                            <button
                              type="button"
                              className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#245b96] px-4 py-3 text-sm font-bold text-white transition hover:bg-[#102a56] focus:outline-none focus:ring-4 focus:ring-blue-100"
                              onClick={async () => {
                                try {
                                  await openPdf(pdfPath);
                                } catch (e) {
                                  setError(errMsg(e));
                                }
                              }}
                            >
                              <FileText size={17} />
                              Lihat PDF
                            </button>
                          </div>
                        )}
                        </div>
                      </article>
                    );
                  })}
                </div>

                {/* Pagination */}
                {shown.length > PAGE_SIZE && (
                  <nav
                    aria-label="Navigasi halaman"
                    className="mt-8 flex flex-col items-center gap-3"
                  >
                    <div className="flex flex-wrap items-center justify-center gap-2">
                      <button
                        type="button"
                        onClick={() => goToPage(currentPage - 1)}
                        disabled={currentPage === 1}
                        aria-label="Halaman sebelumnya"
                        className="flex h-10 w-10 items-center justify-center rounded-xl border border-[#c5d8ee] bg-white text-[#245b96] transition hover:bg-blue-50 disabled:cursor-not-allowed disabled:opacity-40"
                      >
                        <ChevronLeft size={18} />
                      </button>

                      {pageNumbers(currentPage, totalPages).map((n, i) =>
                        n === "..." ? (
                          <span key={`dots-${i}`} className="px-1 text-slate-400">
                            …
                          </span>
                        ) : (
                          <button
                            key={n}
                            type="button"
                            onClick={() => goToPage(n)}
                            aria-current={n === currentPage ? "page" : undefined}
                            className={`h-10 min-w-10 rounded-xl border px-3 text-sm font-bold transition ${
                              n === currentPage
                                ? "border-[#245b96] bg-[#245b96] text-white"
                                : "border-[#c5d8ee] bg-white text-[#245b96] hover:bg-blue-50"
                            }`}
                          >
                            {n}
                          </button>
                        )
                      )}

                      <button
                        type="button"
                        onClick={() => goToPage(currentPage + 1)}
                        disabled={currentPage === totalPages}
                        aria-label="Halaman berikutnya"
                        className="flex h-10 w-10 items-center justify-center rounded-xl border border-[#c5d8ee] bg-white text-[#245b96] transition hover:bg-blue-50 disabled:cursor-not-allowed disabled:opacity-40"
                      >
                        <ChevronRight size={18} />
                      </button>
                    </div>

                    <p className="text-xs text-slate-500">
                      Menampilkan {startIndex + 1}–
                      {Math.min(startIndex + PAGE_SIZE, shown.length)} dari{" "}
                      {shown.length} dokumen
                    </p>
                  </nav>
                )}

                {/* Data kosong */}
                {shown.length === 0 && (
                  <div className="mt-6 rounded-2xl border border-dashed border-slate-300 bg-white px-5 py-14 text-center">
                    <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-blue-50 text-[#245b96]">
                      <Search size={25} />
                    </div>

                    <h3 className="mt-4 font-bold text-slate-700">
                      Dokumen tidak ditemukan
                    </h3>

                    <p className="mt-2 text-sm text-slate-500">
                      Tidak ada dokumen yang sesuai dengan pencarian
                      atau filter yang dipilih.
                    </p>

                    {kind === "dokumen" && (
                      <button
                        onClick={resetFilters}
                        className="mt-4 inline-flex items-center gap-2 rounded-lg bg-[#245b96] px-4 py-2 text-xs font-bold text-white transition hover:bg-[#102a56]"
                      >
                        <X size={14} />
                        Hapus Filter
                      </button>
                    )}
                  </div>
                )}
              </>
            )}
          </>
        )}
      </main>
    </div>
  );
}
