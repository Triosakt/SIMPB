
/* SIMPB_PUBLIC_STANDAR_V2 */
import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  ArrowLeft,
  ArrowRight,
  Download,
  Eye,
  FileCheck2,
  FileText,
  Search,
  ShieldCheck,
  RotateCcw,
  Building2,
  CalendarDays,
} from "lucide-react";
import SiteNavbar from "../components/SiteNavbar.jsx";
import { api, errMsg, openPdf } from "../api/client.js";

const groups = [
  [
    "A. Penyampaian Pelayanan",
    [
      ["persyaratan", "Persyaratan"],
      ["prosedur", "Sistem, Mekanisme, dan Prosedur"],
      ["jangka_waktu", "Jangka Waktu Penyelesaian"],
      ["biaya_tarif", "Biaya/Tarif"],
      ["produk_pelayanan", "Produk Pelayanan"],
      ["pengaduan", "Penanganan Pengaduan, Saran, Masukan dan Apresiasi"],
    ],
  ],
  [
    "B. Pengelolaan Pelayanan",
    [
      ["dasar_hukum", "Dasar Hukum"],
      ["sarana_prasarana", "Sarana dan Prasarana/Fasilitas"],
      ["kompetensi_pelaksana", "Kompetensi Pelaksana"],
      ["pengawasan_internal", "Pengawasan Internal"],
      ["jumlah_pelaksana", "Jumlah Pelaksana"],
      ["jaminan_pelayanan", "Jaminan Pelayanan"],
      ["jaminan_keamanan", "Jaminan Keamanan dan Keselamatan Pelayanan"],
      ["evaluasi_kinerja", "Evaluasi Kinerja Pelaksana"],
    ],
  ],
];

export default function PublicStandarPelayananPage() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [query, setQuery] = useState("");
  const [year, setYear] = useState("");
  const [unit, setUnit] = useState("");
  const [status, setStatus] = useState("");

  const [selected, setSelected] = useState(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let active = true;

    async function loadData() {
      setLoading(true);
      setError("");

      try {
        const { data } = await api.get("/standar-pelayanan");

        if (active) {
          const result = Array.isArray(data)
            ? data
            : Array.isArray(data?.data)
              ? data.data
              : [];

          setRows(
            result.filter(
              (item) => item.approval_status === "approved"
            )
          );
        }
      } catch (e) {
        if (active) setError(errMsg(e));
      } finally {
        if (active) setLoading(false);
      }
    }

    loadData();

    return () => {
      active = false;
    };
  }, []);

  // Pilihan tahun dan unit diambil otomatis dari data
  const years = useMemo(() => {
    return [
      ...new Set(
        rows
          .map((item) => String(item.tahun || ""))
          .filter(Boolean)
      ),
    ].sort((a, b) => Number(b) - Number(a));
  }, [rows]);

  const units = useMemo(() => {
    return [
      ...new Set(
        rows
          .map((item) => item.nama_unit)
          .filter(Boolean)
      ),
    ].sort((a, b) => a.localeCompare(b));
  }, [rows]);

  // Filter katalog
  const filtered = useMemo(() => {
    return rows.filter((item) => {
      const keyword = query.trim().toLowerCase();

      const matchQuery =
        !keyword ||
        [
          item.nama_layanan,
          item.nomor_standar,
          item.nama_unit,
          item.tahun,
        ]
          .join(" ")
          .toLowerCase()
          .includes(keyword);

      const matchYear =
        !year || String(item.tahun) === year;

      const matchUnit =
        !unit || item.nama_unit === unit;

      const matchStatus =
        !status || item.approval_status === status;

      return (
        matchQuery &&
        matchYear &&
        matchUnit &&
        matchStatus
      );
    });
  }, [rows, query, year, unit, status]);

  function resetFilters() {
    setQuery("");
    setYear("");
    setUnit("");
    setStatus("");
  }

  async function download(item) {
    setBusy(true);
    setError("");

    try {
      const response = await api.get(
        `/standar-pelayanan/${item.id}/download`,
        { responseType: "blob" }
      );

      const url = URL.createObjectURL(response.data);
      const link = document.createElement("a");

      link.href = url;
      link.download =
        (item.nomor_standar || "standar-pelayanan").replace(
          /[^a-zA-Z0-9_-]/g,
          "_"
        ) + ".pdf";

      document.body.appendChild(link);
      link.click();
      link.remove();

      setTimeout(() => URL.revokeObjectURL(url), 60000);
    } catch (e) {
      setError(errMsg(e));
    } finally {
      setBusy(false);
    }
  }

  async function view(item) {
    setError("");

    try {
      await openPdf(
        `/standar-pelayanan/${item.id}/view`
      );
    } catch (e) {
      setError(errMsg(e));
    }
  }

  return (
    <div className="min-h-screen bg-[#f3f7fc] text-slate-800">
      <SiteNavbar />

      {/* HERO */}
      <section className="relative isolate overflow-hidden bg-gradient-to-r from-[#102a56] via-[#17417d] to-[#2563a6] text-white">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -right-20 -top-32 h-96 w-96 rounded-full border border-white/10 bg-blue-300/10 blur-2xl"
        />

        <div
          aria-hidden="true"
          className="pointer-events-none absolute -bottom-36 left-1/3 h-72 w-72 rounded-full bg-cyan-300/10 blur-3xl"
        />

        <div className="relative mx-auto flex max-w-[1200px] flex-wrap items-center justify-between gap-8 px-4 py-12 sm:px-6 sm:py-16 lg:px-8">
          <div className="max-w-3xl">
            <p className="flex items-center gap-2 text-xs font-extrabold uppercase tracking-[.18em] text-cyan-200">
              <ShieldCheck size={16} />
              SIMPB BAPETEN · Informasi Pelayanan Publik
            </p>

            <h1 className="mt-4 text-3xl font-black tracking-tight sm:text-5xl">
              Standar Pelayanan BAPETEN
            </h1>

            <p className="mt-5 max-w-2xl text-sm leading-7 text-blue-100 sm:text-base">
              Temukan informasi standar pelayanan BAPETEN,
              mulai dari persyaratan, prosedur, jangka waktu,
              biaya, hingga informasi pengelolaan pelayanan.
            </p>

            <Link
              to="/"
              className="mt-7 inline-flex items-center gap-2 rounded-xl border border-white/30 bg-white/10 px-5 py-3 text-sm font-bold text-white transition hover:bg-white/20"
            >
              <ArrowLeft size={16} />
              Kembali ke Beranda
            </Link>
          </div>

          <div
            aria-hidden="true"
            className="hidden h-48 w-48 items-center justify-center rounded-[2rem] border border-white/20 bg-white/10 shadow-2xl backdrop-blur-md lg:flex"
          >
            <div className="flex flex-col items-center gap-3">
              <FileCheck2 size={68} className="text-cyan-100" />
              <span className="text-xs font-extrabold tracking-[.2em] text-white">
                DOKUMEN RESMI
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* KATALOG */}
      <main className="mx-auto max-w-[1200px] px-4 py-10 sm:px-6 sm:py-14 lg:px-8">
        <div className="mb-7 flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-xs font-extrabold uppercase tracking-[.15em] text-[#2563a6]">
              Katalog Layanan
            </p>

            <h2 className="mt-2 text-2xl font-black text-[#102a56] sm:text-3xl">
              Dokumen Standar Pelayanan
            </h2>

            <p className="mt-2 text-sm text-slate-500">
              Daftar standar pelayanan yang telah disetujui dan
              dipublikasikan.
            </p>
          </div>

          <div className="rounded-xl border border-blue-100 bg-white px-4 py-3 shadow-sm">
            <p className="text-xs font-medium text-slate-500">
              Total dokumen tersedia
            </p>
            <p className="mt-1 text-2xl font-black text-[#17417d]">
              {rows.length}
            </p>
          </div>
        </div>

        {/* FILTER */}
        <section className="rounded-2xl border border-[#c8dcf5] bg-white p-5 shadow-[0_3px_12px_rgba(16,42,86,0.06)] sm:p-6">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-[2fr_1fr_1.5fr_1fr_auto] lg:items-end">
            {/* Nama layanan */}
            <div>
              <label className="mb-2 block text-sm font-extrabold uppercase tracking-wide text-[#17417d]">
                Nama Layanan
              </label>
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") e.currentTarget.blur();
                }}
                placeholder="Cari nama atau nomor standar..."
                className="h-12 w-full rounded-xl border border-[#c8dcf5] bg-[#f8fafc] px-4 text-sm text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-[#2563a6] focus:ring-4 focus:ring-blue-100"
              />
            </div>

            {/* Tahun */}
            <div>
              <label className="mb-2 block text-sm font-extrabold uppercase tracking-wide text-[#17417d]">
                Tahun
              </label>
              <select
                value={year}
                onChange={(e) => setYear(e.target.value)}
                className="h-12 w-full rounded-xl border border-[#c8dcf5] bg-[#f8fafc] px-4 text-sm text-slate-800 outline-none transition focus:border-[#2563a6] focus:ring-4 focus:ring-blue-100"
              >
                <option value="">— Semua Tahun —</option>
                {years.map((item) => (
                  <option key={item} value={item}>
                    {item}
                  </option>
                ))}
              </select>
            </div>

            {/* Unit pemilik */}
            <div>
              <label className="mb-2 block text-sm font-extrabold uppercase tracking-wide text-[#17417d]">
                Pemilik Layanan
              </label>
              <select
                value={unit}
                onChange={(e) => setUnit(e.target.value)}
                className="h-12 w-full rounded-xl border border-[#c8dcf5] bg-[#f8fafc] px-4 text-sm text-slate-800 outline-none transition focus:border-[#2563a6] focus:ring-4 focus:ring-blue-100"
              >
                <option value="">— Semua Unit —</option>
                {units.map((item) => (
                  <option key={item} value={item}>
                    {item}
                  </option>
                ))}
              </select>
            </div>

            {/* Status */}
            <div>
              <label className="mb-2 block text-sm font-extrabold uppercase tracking-wide text-[#17417d]">
                Status
              </label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                className="h-12 w-full rounded-xl border border-[#c8dcf5] bg-[#f8fafc] px-4 text-sm text-slate-800 outline-none transition focus:border-[#2563a6] focus:ring-4 focus:ring-blue-100"
              >
                <option value="">— Semua Status —</option>
                <option value="approved">Disetujui</option>
              </select>
            </div>

            {/* Tombol reset */}
            <button
              type="button"
              onClick={resetFilters}
              title="Reset filter"
              className="flex h-12 items-center justify-center gap-2 rounded-xl bg-[#17417d] px-5 text-sm font-bold text-white shadow-sm transition hover:bg-[#102a56] focus:outline-none focus:ring-4 focus:ring-blue-200"
            >
              <RotateCcw size={17} />
              <span className="lg:hidden">Reset</span>
            </button>
          </div>
        </section>

        {/* HASIL FILTER */}
        <div className="my-6 flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm text-slate-500">
            Menampilkan{" "}
            <span className="font-extrabold text-[#17417d]">
              {filtered.length}
            </span>{" "}
            dari {rows.length} dokumen
          </p>

          {(query || year || unit || status) && (
            <button
              type="button"
              onClick={resetFilters}
              className="text-sm font-bold text-[#2563a6] transition hover:text-[#102a56]"
            >
              Hapus semua filter
            </button>
          )}
        </div>

        {/* ERROR */}
        {error && (
          <div
            role="alert"
            className="mb-6 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700"
          >
            {error}
          </div>
        )}

        {/* LOADING */}
        {loading ? (
          <div className="rounded-2xl border border-[#dbe7f2] bg-white p-12 text-center">
            <div className="mx-auto h-9 w-9 animate-spin rounded-full border-4 border-blue-100 border-t-[#17417d]" />
            <p className="mt-4 text-sm font-medium text-slate-500">
              Memuat katalog standar pelayanan...
            </p>
          </div>
        ) : (
          <>
            {/* DAFTAR KARTU */}
            <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
              {filtered.map((item) => (
                <article
                  key={item.id}
                  className="group flex min-h-[290px] flex-col overflow-hidden rounded-2xl border border-[#dbe7f2] bg-white shadow-sm transition duration-300 hover:-translate-y-1 hover:border-blue-200 hover:shadow-xl"
                >
                  <div className="h-1.5 bg-gradient-to-r from-[#102a56] via-[#17417d] to-[#2563a6]" />

                  <div className="flex flex-1 flex-col p-6">
                    <div className="flex items-center justify-between gap-3">
                      <span className="grid h-11 w-11 place-items-center rounded-xl bg-[#eaf2fb] text-[#17417d]">
                        <FileText size={22} />
                      </span>

                      <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1.5 text-xs font-bold text-emerald-700">
                        <ShieldCheck size={14} />
                        Disetujui
                      </span>
                    </div>

                    <p className="mt-5 text-xs font-extrabold uppercase tracking-wide text-[#2563a6]">
                      {item.nomor_standar || "Nomor belum tersedia"}
                    </p>

                    <h3 className="mt-2 text-lg font-extrabold leading-7 text-[#102a56] transition group-hover:text-[#2563a6]">
                      {item.nama_layanan || "Nama layanan belum tersedia"}
                    </h3>

                    <div className="mt-4 space-y-2 border-t border-slate-100 pt-4">
                      <p className="flex items-center gap-2 text-sm text-slate-500">
                        <CalendarDays size={15} className="shrink-0 text-[#2563a6]" />
                        Tahun {item.tahun || "—"}
                      </p>

                      <p className="flex items-start gap-2 text-sm text-slate-500">
                        <Building2 size={15} className="mt-0.5 shrink-0 text-[#2563a6]" />
                        <span>{item.nama_unit || "Unit belum tersedia"}</span>
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={() => setSelected(item)}
                      className="mt-auto flex w-full items-center justify-between border-t border-slate-100 pt-5 text-sm font-extrabold text-[#2563a6] transition hover:text-[#102a56]"
                    >
                      Lihat detail layanan
                      <ArrowRight
                        size={17}
                        className="transition group-hover:translate-x-1"
                      />
                    </button>
                  </div>
                </article>
              ))}
            </div>

            {/* KOSONG */}
            {!filtered.length && (
              <div className="rounded-2xl border border-dashed border-[#c8dcf5] bg-white px-6 py-16 text-center">
                <div className="mx-auto grid h-16 w-16 place-items-center rounded-2xl bg-blue-50 text-[#2563a6]">
                  <Search size={28} />
                </div>

                <h3 className="mt-5 text-lg font-extrabold text-[#102a56]">
                  Dokumen tidak ditemukan
                </h3>

                <p className="mt-2 text-sm text-slate-500">
                  Tidak ada standar pelayanan yang sesuai dengan kata
                  kunci atau filter yang dipilih.
                </p>

                <button
                  type="button"
                  onClick={resetFilters}
                  className="mt-5 rounded-xl bg-[#17417d] px-5 py-2.5 text-sm font-bold text-white transition hover:bg-[#102a56]"
                >
                  Reset Filter
                </button>
              </div>
            )}
          </>
        )}

        {/* DETAIL DOKUMEN */}
        {selected && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center overflow-y-auto bg-slate-950/60 p-4 backdrop-blur-sm">
            <article className="my-auto max-h-[92vh] w-full max-w-5xl overflow-y-auto rounded-3xl bg-white shadow-2xl">
              {/* Header detail */}
              <div className="sticky top-0 z-10 flex flex-wrap items-center justify-between gap-4 border-b border-slate-100 bg-white px-5 py-5 sm:px-8">
                <div>
                  <p className="text-xs font-extrabold uppercase tracking-widest text-[#2563a6]">
                    SIMPB BAPETEN · Detail Standar Pelayanan
                  </p>
                  <h2 className="mt-1 text-lg font-black text-[#102a56] sm:text-xl">
                    Detail Dokumen
                  </h2>
                </div>

                <button
                  type="button"
                  onClick={() => setSelected(null)}
                  className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-bold text-slate-600 transition hover:bg-slate-50"
                >
                  Tutup
                </button>
              </div>

              <div className="p-5 sm:p-8">
                <div className="flex flex-wrap items-start justify-between gap-5 border-b border-slate-100 pb-7">
                  <div className="max-w-2xl">
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1.5 text-xs font-bold text-emerald-700">
                      <ShieldCheck size={14} />
                      Dokumen Disetujui
                    </span>

                    <p className="mt-5 text-xs font-extrabold uppercase tracking-wider text-[#2563a6]">
                      {selected.nomor_standar} · {selected.tahun}
                    </p>

                    <h2 className="mt-2 text-2xl font-black leading-tight text-[#102a56]">
                      {selected.nama_layanan}
                    </h2>

                    <p className="mt-3 flex items-center gap-2 text-sm text-slate-500">
                      <Building2 size={16} />
                      {selected.nama_unit || "Unit tidak tersedia"}
                    </p>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => view(selected)}
                      className="inline-flex items-center gap-2 rounded-xl border border-blue-200 px-4 py-2.5 text-sm font-bold text-[#17417d] transition hover:bg-blue-50"
                    >
                      <Eye size={16} />
                      Lihat PDF
                    </button>

                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => download(selected)}
                      className="inline-flex items-center gap-2 rounded-xl bg-[#17417d] px-4 py-2.5 text-sm font-bold text-white transition hover:bg-[#102a56] disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      <Download size={16} />
                      {busy ? "Mengunduh..." : "Unduh PDF"}
                    </button>
                  </div>
                </div>

                {/* Isi standar pelayanan */}
                {groups.map(([heading, fields]) => (
                  <section key={heading} className="mt-8">
                    <h3 className="mb-4 border-l-4 border-[#2563a6] pl-3 text-lg font-black text-[#17417d]">
                      {heading}
                    </h3>

                    <div className="divide-y divide-slate-100 rounded-xl border border-slate-100 px-4 sm:px-5">
                      {fields.map(([key, label], index) => (
                        <div
                          key={key}
                          className="grid gap-2 py-4 sm:grid-cols-[260px_1fr]"
                        >
                          <strong className="text-sm leading-6 text-slate-700">
                            {index + 1}. {label}
                          </strong>

                          <p className="whitespace-pre-wrap text-sm leading-7 text-slate-600">
                            {selected[key] || "Informasi belum tersedia."}
                          </p>
                        </div>
                      ))}
                    </div>
                  </section>
                ))}
              </div>

              <div className="border-t border-slate-100 bg-slate-50 px-5 py-4 text-xs text-slate-500 sm:px-8">
                SIMPB — Sistem Informasi Manajemen Proses Bisnis BAPETEN
              </div>
            </article>
          </div>
        )}
      </main>

      
    </div>
  );
}
