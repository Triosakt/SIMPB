import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  Search, SlidersHorizontal, FolderOpen, Network,
  GitBranch, Workflow, FileText, ClipboardCheck,
  ArrowRight, RotateCcw, ChevronLeft, ChevronRight,
  Layers3, CalendarDays, Building2
} from "lucide-react";
import api from "../api/client.js";

const TYPES = {
  peta: { label: "Peta Proses", icon: Network },
  sub: { label: "Sub Proses", icon: GitBranch },
  cfm: { label: "CFM", icon: Workflow },
  sop: { label: "SOP", icon: FileText },
  standar: { label: "Standar Pelayanan", icon: ClipboardCheck }
};

const clean = value => String(value ?? "").trim();
const unitText = value =>
  Array.isArray(value) ? value.join(", ") : clean(value).replaceAll("||", ", ");

function normalizeProcess(rows, type) {
  return (Array.isArray(rows) ? rows : []).map(r => ({
    key: type + "-" + r.id,
    id: r.id,
    type,
    number: clean(r.nomor),
    title: clean(r.judul),
    year: clean(r.tahun_terbit),
    unit: unitText(r.units),
    category: clean(r.kategori || r.nama_peta_proses),
    status: clean(r.approval_status || "approved"),
    parentId: r.peta_proses_id || r.id,
    hasFile: Boolean(r.has_file)
  }));
}

function normalizeSop(rows) {
  return rows.map(r => ({
    key: "sop-" + r.id,
    id: r.id,
    type: "sop",
    number: clean(r.nomor_sop),
    title: clean(r.nama_sop),
    year: clean(r.tahun_terbit),
    unit: clean(r.nama_unit || r.nama_lembaga),
    category: clean(r.jenis_sop),
    status: clean(r.approval_status),
    hasFile: Boolean(r.file)
  }));
}

function normalizeStandar(rows) {
  return rows.map(r => ({
    key: "standar-" + r.id,
    id: r.id,
    type: "standar",
    number: clean(r.nomor_standar),
    title: clean(r.nama_layanan),
    year: clean(r.tahun),
    unit: clean(r.nama_unit),
    category: "Standar Pelayanan",
    status: clean(r.approval_status),
    hasFile: Boolean(r.file_pdf)
  }));
}

async function loadAllSop() {
  const first = await api.get("/sop", { params: { page: 1, limit: 100 } });
  const rows = [...(first.data?.data || [])];
  const pages = Number(first.data?.meta?.pages || 1);

  for (let page = 2; page <= pages; page++) {
    const response = await api.get("/sop", {
      params: { page, limit: 100 }
    });
    rows.push(...(response.data?.data || []));
  }

  return rows;
}

const selectClass =
  "w-full rounded-xl border border-slate-200 bg-white px-3 py-3 text-sm text-slate-700 outline-none transition focus:border-sky-500 focus:ring-2 focus:ring-sky-100";

export default function KatalogDokumenPage() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [query, setQuery] = useState("");
  const [type, setType] = useState("");
  const [status, setStatus] = useState("");
  const [year, setYear] = useState("");
  const [unit, setUnit] = useState("");
  const [category, setCategory] = useState("");
  const [sort, setSort] = useState("newest");
  const [page, setPage] = useState(1);
  const [advancedOpen, setAdvancedOpen] = useState(false);

  useEffect(() => {
    let active = true;

    async function load() {
      setLoading(true);
      setError("");

      const results = await Promise.allSettled([
        api.get("/proses/katalog-dashboard"),
        loadAllSop(),
        api.get("/standar-pelayanan")
      ]);

      if (!active) return;

      const [process, sop, standar] = results;
      const documents = [];
      const failed = [];

      if (process.status === "fulfilled") {
        const data = process.value.data || {};
        documents.push(
          ...normalizeProcess(data.peta, "peta"),
          ...normalizeProcess(data.sub, "sub"),
          ...normalizeProcess(data.cfm, "cfm")
        );
      } else failed.push("dokumen proses bisnis");

      if (sop.status === "fulfilled") {
        documents.push(...normalizeSop(sop.value));
      } else failed.push("SOP");

      if (standar.status === "fulfilled") {
        documents.push(
          ...normalizeStandar(standar.value.data?.data || [])
        );
      } else failed.push("Standar Pelayanan");

      setRows(documents);

      if (failed.length) {
        setError(
          "Sebagian data gagal dimuat: " + failed.join(", ") +
          ". Hasil yang ditampilkan belum lengkap."
        );
      }

      setLoading(false);
    }

    load();
    return () => { active = false; };
  }, []);

  const years = useMemo(
    () => [...new Set(rows.map(r => r.year).filter(Boolean))]
      .sort((a, b) => Number(b) - Number(a)),
    [rows]
  );

  const units = useMemo(
    () => [...new Set(rows.flatMap(r =>
      r.unit.split(",").map(x => x.trim()).filter(Boolean)
    ))].sort((a, b) => a.localeCompare(b, "id")),
    [rows]
  );

  const categories = useMemo(
    () => [...new Set(rows.map(r => r.category).filter(Boolean))]
      .sort((a, b) => a.localeCompare(b, "id")),
    [rows]
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLocaleLowerCase("id");

    const result = rows.filter(r =>
      (!q || [
        r.number, r.title, r.unit, r.category,
        TYPES[r.type]?.label, r.year
      ].join(" ").toLocaleLowerCase("id").includes(q)) &&
      (!type || r.type === type) &&
      (!status || r.status === status) &&
      (!year || r.year === year) &&
      (!unit || r.unit.split(",").some(x => x.trim() === unit)) &&
      (!category || r.category === category)
    );

    result.sort((a, b) => {
      if (sort === "oldest") return Number(a.year || 0) - Number(b.year || 0);
      if (sort === "title") return a.title.localeCompare(b.title, "id");
      if (sort === "number") return a.number.localeCompare(b.number, "id");
      return Number(b.year || 0) - Number(a.year || 0);
    });

    return result;
  }, [rows, query, type, status, year, unit, category, sort]);

  useEffect(() => setPage(1), [
    query, type, status, year, unit, category, sort
  ]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / 3));
  const currentPage = Math.min(page, totalPages);
  const visible = filtered.slice((currentPage - 1) * 3, currentPage * 3);

  function reset() {
    setQuery("");
    setType("");
    setStatus("");
    setYear("");
    setUnit("");
    setCategory("");
    setSort("newest");
    setPage(1);
  }

  function detailUrl(r) {
    if (r.type === "peta") return "/dashboard/proses/" + r.id;
    if (r.type === "sub" || r.type === "cfm")
      return "/dashboard/proses/" + r.parentId;
    if (r.type === "sop") return "/dashboard/sop";
    return "/dashboard/standar-pelayanan";
  }

  return (
    <div className="mx-auto max-w-7xl space-y-6 pb-12">
      
<header className="relative isolate overflow-hidden rounded-[28px] bg-[#071a35] p-7 text-white shadow-xl shadow-blue-950/10 sm:p-10">

  {/* 1. Foto gedung */}
  <div
    aria-hidden="true"
    className="absolute inset-0 -z-20 bg-cover bg-center motion-reduce:animate-none animate-[bgzoom_20s_ease-in-out_infinite_alternate]"
    style={{
      backgroundImage: 'url("/img/kantor.jpg")',
      backgroundPosition: "center 5%",
    }}
  />

  {/* 2. Gradasi navy pekat dari kiri ke kanan */}
  <div
    aria-hidden="true"
    className="absolute inset-0 -z-10"
    style={{
      backgroundImage:
        "linear-gradient(100deg, rgba(7,26,53,0.96) 0%, rgba(7,26,53,0.88) 30%, rgba(11,45,80,0.72) 60%, rgba(16,75,122,0.48) 100%)",
    }}
  />

  {/* 3. Cahaya biru kanan atas */}
  <div
    aria-hidden="true"
    className="pointer-events-none absolute inset-0"
    style={{
      backgroundImage:
        "radial-gradient(60% 50% at 85% 15%, rgba(56,152,255,0.15) 0%, transparent 70%)",
    }}
  />

  {/* 4. Berkas cahaya diagonal */}
  <div
    aria-hidden="true"
    className="pointer-events-none absolute -inset-[20%] opacity-40 mix-blend-screen"
    style={{
      backgroundImage:
        "repeating-linear-gradient(115deg, transparent 0px, transparent 140px, rgba(96,165,250,0.12) 190px, transparent 260px)",
      maskImage: "linear-gradient(90deg, transparent 20%, black 70%)",
      WebkitMaskImage:
        "linear-gradient(90deg, transparent 20%, black 70%)",
    }}
  />

  {/* 5. Pola titik */}
  <div
    aria-hidden="true"
    className="pointer-events-none absolute inset-0 opacity-20"
    style={{
      backgroundImage:
        "radial-gradient(rgba(147,197,253,0.9) 1.2px, transparent 1.4px)",
      backgroundSize: "26px 26px",
      maskImage:
        "radial-gradient(ellipse 55% 60% at 80% 25%, black 10%, transparent 75%)",
      WebkitMaskImage:
        "radial-gradient(ellipse 55% 60% at 80% 25%, black 10%, transparent 75%)",
    }}
  />

  {/* 6. Fade navy bagian bawah */}
  <div
    aria-hidden="true"
    className="pointer-events-none absolute inset-x-0 bottom-0 h-40"
    style={{
      background:
        "linear-gradient(to top, rgba(7,26,53,0.55), transparent)",
    }}
  />

  {/* 7. Konten hero */}
  <div className="relative z-10 max-w-3xl">
    <p className="text-xs font-extrabold uppercase tracking-[.22em] text-cyan-200">
      BAPETEN · SIMPB DOCUMENT CENTER
    </p>

    <h1 className="mt-4 text-3xl font-black tracking-tight sm:text-4xl">
      Pusat Dokumen
    </h1>

    <p className="mt-3 text-sm leading-7 text-blue-100 sm:text-base">
      Satu tempat untuk menelusuri Peta Proses, Sub Proses,
      CFM, SOP, dan Standar Pelayanan.
    </p>

    <label className="mt-7 flex items-center gap-3 rounded-2xl border border-white/30 bg-white px-4 shadow-lg shadow-blue-950/10">
      <Search className="shrink-0 text-[#1769aa]" size={20} />

      <input
        aria-label="Cari seluruh dokumen"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Cari nomor, judul, unit kerja, atau kata kunci..."
        className="min-w-0 w-full bg-transparent py-4 text-sm text-slate-800 outline-none"
      />
    </label>
  </div>

  {/* 8. Ornamen lingkaran */}
  <div
    aria-hidden="true"
    className="pointer-events-none absolute -right-16 -top-24 h-72 w-72 rounded-full border border-white/10 bg-cyan-300/10 blur-2xl"
  />

</header>


      <section aria-label="Ringkasan jenis dokumen"
        className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
        {Object.entries(TYPES).map(([key, info]) => {
          const Icon = info.icon;
          const count = rows.filter(r => r.type === key).length;
          return (
            <button key={key} type="button"
              onClick={() => setType(type === key ? "" : key)}
              aria-pressed={type === key}
              className={`rounded-2xl border p-4 text-left shadow-sm transition duration-300 hover:-translate-y-1 hover:shadow-md ${
                type === key
                  ? "border-sky-400 bg-[#eaf5ff] ring-2 ring-sky-100"
                  : "border-[#dbe7f2] bg-white"
              }`}>
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#eaf3fb] text-[#1769aa]">
                <Icon size={20}/>
              </span>
              <p className="mt-4 text-2xl font-black text-[#092a4c]">
                {loading ? "…" : count}
              </p>
              <p className="mt-1 text-xs font-bold text-slate-600">{info.label}</p>
              </button>
            );
          })}
        </section>

        <section className="rounded-[26px] border border-[#dbe7f2] bg-white px-5 py-5 shadow-sm sm:px-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-[11px] font-extrabold uppercase tracking-[.18em] text-[#1769aa]">
              Penelusuran Terpadu
            </p>
            <h2 className="mt-1 text-xl font-black text-[#092a4c]">
              Jelajahi Dokumen
            </h2>
          </div>
          <button type="button" onClick={reset}
            className="inline-flex items-center gap-2 text-xs font-bold text-slate-500 transition hover:text-[#1769aa]">
            <RotateCcw size={14}/> Reset Filter
          </button>
        </div>

        <div className="mt-5 flex flex-wrap gap-2">
          {[["", "Semua"], ...Object.entries(TYPES).map(([key, info]) => [key, info.label])].map(([key, label]) => (
            <button key={key || "all"} type="button"
              onClick={() => setType(key)}
              aria-pressed={type === key}
              className={`rounded-full px-4 py-2 text-xs font-bold transition-all duration-200 ${
                type === key
                  ? "bg-[#104b7a] text-white shadow-md shadow-blue-900/15"
                  : "bg-[#f1f6fb] text-slate-600 hover:bg-[#e2effa] hover:text-[#104b7a]"
              }`}>
              {label}
            </button>
          ))}
        </div>

        <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-4">
          <button type="button"
            onClick={() => setAdvancedOpen(value => !value)}
            aria-expanded={advancedOpen}
            className="inline-flex items-center gap-2 rounded-full border border-[#dbe7f2] px-4 py-2.5 text-xs font-bold text-[#104b7a] transition hover:bg-[#f1f6fb]">
            <SlidersHorizontal size={15}/>
            {advancedOpen ? "Tutup Filter" : "Filter Lanjutan"}
            <span className="rounded-full bg-[#eaf3fb] px-2 py-0.5 text-[10px]">
              {[status, year, unit, category].filter(Boolean).length}
            </span>
          </button>

          <select aria-label="Urutkan dokumen"
            className="rounded-full border-0 bg-transparent px-3 py-2 text-xs font-semibold text-slate-600 outline-none focus:ring-2 focus:ring-sky-100"
            value={sort} onChange={e => setSort(e.target.value)}>
            <option value="newest">Tahun Terbaru</option>
            <option value="oldest">Tahun Terlama</option>
            <option value="title">Judul A–Z</option>
            <option value="number">Nomor Dokumen</option>
          </select>
        </div>

        {advancedOpen && (
          <div className="mt-4 grid gap-x-5 gap-y-4 rounded-2xl bg-[#f5f9fd] p-4 sm:grid-cols-2">
            {[
              {
                label: "Status Persetujuan",
                value: status,
                setter: setStatus,
                options: [
                  ["", "Semua Status"],
                  ["approved", "Disetujui"],
                  ["pending", "Menunggu"],
                  ["rejected", "Ditolak"]
                ]
              },
              {
                label: "Tahun Dokumen",
                value: year,
                setter: setYear,
                options: [["", "Semua Tahun"], ...years.map(x => [x, x])]
              },
              {
                label: "Unit Kerja",
                value: unit,
                setter: setUnit,
                options: [["", "Semua Unit Kerja"], ...units.map(x => [x, x])]
              },
              {
                label: "Kategori",
                value: category,
                setter: setCategory,
                options: [["", "Semua Kategori"], ...categories.map(x => [x, x])]
              }
            ].map(filter => (
              <label key={filter.label} className="block">
                <span className="mb-2 block text-[11px] font-bold text-slate-500">
                  {filter.label}
                </span>
                <select value={filter.value}
                  onChange={e => filter.setter(e.target.value)}
                  className="w-full rounded-xl border border-[#e0eaf3] bg-white px-3 py-2.5 text-sm text-[#173b5b] outline-none transition focus:border-sky-400 focus:ring-2 focus:ring-sky-100">
                  {filter.options.map(([value, label]) => (
                    <option key={value || "all"} value={value}>{label}</option>
                  ))}
                </select>
              </label>
            ))}
          </div>
        )}
      </section>

      {error && (
        <div role="alert" className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
          {error}
        </div>
      )}

      <section className="space-y-4">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="text-xs font-bold uppercase tracking-widest text-[#1769aa]">
              Katalog Terintegrasi
            </p>
            <h2 className="mt-1 text-2xl font-black text-[#092a4c]">
              Hasil Penelusuran
            </h2>
          </div>
          <span className="rounded-full border border-blue-100 bg-blue-50 px-4 py-2 text-xs font-bold text-[#104b7a]">
            {loading ? "Memuat..." : filtered.length + " dokumen ditemukan"}
          </span>
        </div>

        <div className="grid gap-4 lg:grid-cols-3">
          {visible.map(r => {
            const info = TYPES[r.type];
            const Icon = info.icon;
            return (
              <article key={r.key}
                className="group flex min-h-[300px] flex-col rounded-3xl border border-[#dbe7f2] bg-white p-6 shadow-sm transition duration-300 hover:-translate-y-1 hover:shadow-xl hover:shadow-blue-950/10">
                <div className="flex items-start justify-between gap-3">
                  <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#eaf3fb] text-[#1769aa]">
                    <Icon size={21}/>
                  </span>
                  <span className={`rounded-full px-3 py-1 text-[11px] font-bold ${
                    r.status === "approved"
                      ? "bg-emerald-50 text-emerald-700"
                      : r.status === "pending"
                      ? "bg-amber-50 text-amber-700"
                      : "bg-rose-50 text-rose-700"
                  }`}>
                    {r.status === "approved" ? "Disetujui" :
                     r.status === "pending" ? "Menunggu" : "Ditolak"}
                  </span>
                </div>

                <p className="mt-5 text-xs font-extrabold uppercase tracking-wider text-[#1769aa]">
                  {info.label} · {r.number || "Tanpa nomor"}
                </p>
                <h3 className="mt-2 text-lg font-black leading-snug text-[#092a4c]">
                  {r.title || "Dokumen tanpa judul"}
                </h3>

                <div className="mt-4 space-y-2 text-xs text-slate-500">
                  <p className="flex items-start gap-2">
                    <CalendarDays size={14} className="shrink-0"/>
                    {r.year || "Tahun belum tersedia"}
                  </p>
                  <p className="flex items-start gap-2">
                    <Building2 size={14} className="shrink-0"/>
                    {r.unit || "Unit kerja belum tercantum"}
                  </p>
                  {r.category && (
                    <p className="flex items-start gap-2">
                      <Layers3 size={14} className="shrink-0"/>
                      {r.category}
                    </p>
                  )}
                </div>

                <div className="mt-auto border-t border-slate-100 pt-5">
                  <Link to={detailUrl(r)}
                    className="inline-flex items-center gap-2 text-sm font-extrabold text-[#1769aa] hover:text-[#092a4c]">
                    {r.type === "sub" || r.type === "cfm"
                      ? "Lihat proses induk"
                      : r.type === "sop" || r.type === "standar"
                      ? "Buka daftar dokumen"
                      : "Lihat detail"}
                    <ArrowRight size={16}/>
                  </Link>
                </div>
              </article>
            );
          })}
        </div>

        {!loading && !visible.length && (
          <div className="rounded-3xl border border-dashed border-[#dbe7f2] bg-white p-12 text-center">
            <FolderOpen className="mx-auto text-slate-300" size={35}/>
            <p className="mt-4 font-bold text-[#092a4c]">
              Tidak ada dokumen yang sesuai.
            </p>
            <p className="mt-2 text-sm text-slate-500">
              Coba ubah kata kunci atau reset filter.
            </p>
          </div>
        )}

        {totalPages > 1 && (
          <div className="flex flex-wrap items-center justify-center gap-3 pt-4">
            <button type="button" disabled={currentPage === 1}
              onClick={() => setPage(p => Math.max(1, p - 1))}
              className="rounded-xl border bg-white p-3 disabled:opacity-40"
              aria-label="Halaman sebelumnya">
              <ChevronLeft size={18}/>
            </button>
            <span className="text-sm font-bold text-[#104b7a]">
              Halaman {currentPage} dari {totalPages}
            </span>
            <button type="button" disabled={currentPage === totalPages}
              onClick={() => setPage(p => Math.min(totalPages, p + 1))}
              className="rounded-xl border bg-white p-3 disabled:opacity-40"
              aria-label="Halaman berikutnya">
              <ChevronRight size={18}/>
            </button>
          </div>
        )}
      </section>
    </div>
  );
}
