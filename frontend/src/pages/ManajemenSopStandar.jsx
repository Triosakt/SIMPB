import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  Eye,
  FileCheck2,
  Link2,
  Pencil,
  RefreshCw,
  Search,
  ShieldCheck,
  Trash2,
  Upload,
  X,
} from "lucide-react";
import api, { errMsg, openPdf } from "../api/client.js";
import Modal from "../components/Modal.jsx";

const PAGE_SIZE = 10;
const YEAR = new Date().getFullYear();

const clean = (value) => String(value ?? "").trim();

// Konfigurasi per jenis dokumen
const CONFIG = {
  sop: {
    label: "SOP",
    title: "Standar Operasional Prosedur",
    base: "/sop",
    upload: "/dashboard/sop/upload",
    full: "/dashboard/sop",
  },
  standar: {
    label: "Standar Pelayanan",
    title: "Standar Pelayanan",
    base: "/standar-pelayanan",
    upload: "/dashboard/standar-pelayanan?aksi=upload",
    full: "/dashboard/standar-pelayanan",
  },
};

const APPROVAL = {
  approved: { label: "Disetujui", cls: "bg-emerald-50 text-emerald-700" },
  pending: { label: "Menunggu", cls: "bg-amber-50 text-amber-700" },
  rejected: { label: "Ditolak", cls: "bg-rose-50 text-rose-700" },
};

const inputClass =
  "w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-cyan-500 focus:ring-4 focus:ring-cyan-500/10 disabled:cursor-not-allowed disabled:bg-slate-100";

const labelClass = "mb-1.5 block text-sm font-semibold text-slate-700";

const buttonSecondary =
  "inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 shadow-sm transition hover:border-slate-300 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50";

const buttonPrimary =
  "inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-slate-900 via-blue-900 to-cyan-800 px-4 py-2.5 text-sm font-semibold text-white shadow-lg shadow-blue-950/15 transition duration-200 hover:-translate-y-0.5 hover:shadow-xl disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:translate-y-0";

// Samakan bentuk data SOP dan Standar Pelayanan
function normalize(rows, type) {
  return (Array.isArray(rows) ? rows : []).map((r) =>
    type === "sop"
      ? {
          id: r.id,
          number: clean(r.nomor_sop),
          title: clean(r.nama_sop),
          year: clean(r.tahun_terbit),
          unit: clean(r.nama_unit || r.nama_lembaga),
          unitId: r.unit_kerja_id ?? "",
          approval: clean(r.approval_status),
          berlaku: clean(r.status_berlaku),
          hasFile: Boolean(r.file || r.file_pdf || r.has_file),
          note: clean(r.reject_reason || r.catatan_review),
        }
      : {
          id: r.id,
          number: clean(r.nomor_standar),
          title: clean(r.nama_layanan),
          year: clean(r.tahun),
          unit: clean(r.nama_unit),
          unitId: r.unit_kerja_id ?? "",
          approval: clean(r.approval_status),
          berlaku: "",
          hasFile: Boolean(r.file_pdf || r.file || r.has_file),
          note: clean(r.catatan_review),
        }
  );
}

async function loadRows(type) {
  if (type === "standar") {
    const res = await api.get("/standar-pelayanan");
    return res.data?.data || [];
  }

  // SOP: ambil semua halaman
  const first = await api.get("/sop", { params: { page: 1, limit: 100 } });
  const rows = [...(first.data?.data || [])];
  const pages = Number(first.data?.meta?.pages || 1);

  for (let page = 2; page <= pages; page++) {
    const res = await api.get("/sop", { params: { page, limit: 100 } });
    rows.push(...(res.data?.data || []));
  }

  return rows;
}

const relatedLabel = (t) =>
  t === "peta" ? "Peta Proses" : t === "sub" ? "Sub Proses" : "CFM";

export default function ManajemenSopStandar({
  type,
  isAdmin,
  units = [],
  onCount,
}) {
  const cfg = CONFIG[type];

  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [query, setQuery] = useState("");
  const [unitFilter, setUnitFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [page, setPage] = useState(1);
  const [detail, setDetail] = useState(null);
  const [form, setForm] = useState(null);
  const [formError, setFormError] = useState("");
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      setRows(normalize(await loadRows(type), type));
    } catch (e) {
      setError(errMsg(e));
    } finally {
      setLoading(false);
    }
  }, [type]);

  useEffect(() => {
    load();
  }, [load]);

  // Laporkan jumlah dokumen ke kartu statistik induk
  useEffect(() => {
    if (!loading) onCount?.(type, rows.length);
  }, [loading, rows.length, type, onCount]);

  useEffect(() => {
    setPage(1);
  }, [query, unitFilter, statusFilter]);

  const unitNames = useMemo(
    () =>
      [...new Set(rows.map((r) => r.unit).filter(Boolean))].sort((a, b) =>
        a.localeCompare(b, "id")
      ),
    [rows]
  );

  const shown = useMemo(() => {
    const q = query.trim().toLowerCase();

    return rows.filter(
      (r) =>
        (!q ||
          [r.number, r.title, r.unit, r.year]
            .join(" ")
            .toLowerCase()
            .includes(q)) &&
        (!unitFilter || r.unit === unitFilter) &&
        (!statusFilter || r.approval === statusFilter)
    );
  }, [rows, query, unitFilter, statusFilter]);

  const totalPages = Math.max(1, Math.ceil(shown.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const visible = shown.slice(
    (currentPage - 1) * PAGE_SIZE,
    currentPage * PAGE_SIZE
  );

  const pdfPath = (item) => `${cfg.base}/${item.id}/view`;

  const viewPdf = async (path) => {
    try {
      await openPdf(path);
    } catch (e) {
      setError(errMsg(e));
      setDetail(null);
    }
  };

  const openDetail = async (item) => {
    setDetail({ item, related: [] });

    // Dokumen terkait hanya tersedia pada SOP (jika endpoint detail menyediakannya)
    if (type !== "sop") return;

    try {
      const res = await api.get(`/sop/${item.id}`);
      const found =
        res.data?.dokumen_terkait || res.data?.data?.dokumen_terkait || [];
      const related = Array.isArray(found) ? found : [];

      setDetail((current) =>
        current && current.item.id === item.id
          ? { ...current, related }
          : current
      );
    } catch {
      /* dokumen terkait bersifat tambahan, abaikan jika gagal */
    }
  };

  const openEdit = (item) => {
    if (!isAdmin) return;

    setForm({
      id: item.id,
      number: item.number,
      title: item.title,
      year: item.year || String(YEAR),
      unitId: item.unitId ? String(item.unitId) : "",
      berlaku: item.berlaku || "Berlaku",
      file: null,
    });

    setFormError("");
    setNotice("");
    setError("");
  };

  const save = async (event) => {
    event.preventDefault();
    if (!isAdmin || !form?.id) return;

    setBusy(true);
    setFormError("");

    try {
      if (type === "sop") {
        if (form.file) {
          // Ada PDF baru: kirim multipart/form-data
          const data = new FormData();
          data.append("nomor_sop", form.number);
          data.append("nama_sop", form.title);
          data.append("tahun_terbit", form.year);
          data.append("status_berlaku", form.berlaku);
          data.append("file", form.file);

          await api.patch(`${cfg.base}/${form.id}`, data);
        } else {
          // Tanpa PDF baru: tetap kirim JSON seperti sebelumnya
          await api.patch(`${cfg.base}/${form.id}`, {
            nomor_sop: form.number,
            nama_sop: form.title,
            tahun_terbit: form.year,
            status_berlaku: form.berlaku,
          });
        }
      } else {
        const data = new FormData();
        data.append("nomor_standar", form.number);
        data.append("nama_layanan", form.title);
        data.append("tahun", form.year);

        if (form.unitId) data.append("unit_kerja_id", form.unitId);
        if (form.file) data.append("file", form.file);

        await api.patch(`${cfg.base}/${form.id}`, data);
      }

      setForm(null);
      setNotice("Dokumen berhasil diperbarui.");
      await load();
    } catch (e) {
      setFormError(errMsg(e));
    } finally {
      setBusy(false);
    }
  };

  const remove = async (item) => {
    if (!isAdmin) return;

    const name = item.title || item.number || "dokumen ini";

    if (
      !window.confirm(
        `Hapus "${name}"?\n\nTindakan ini tidak dapat dibatalkan.`
      )
    ) {
      return;
    }

    setError("");
    setNotice("");

    try {
      await api.delete(`${cfg.base}/${item.id}`);
      setDetail(null);
      setNotice("Dokumen berhasil dihapus.");
      await load();
    } catch (e) {
      setError(errMsg(e));
    }
  };

  const colSpan = type === "sop" ? 8 : 7;

  return (
    <>
      {error && (
        <div
          role="alert"
          className="flex items-start gap-3 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-800"
        >
          <X size={18} className="mt-0.5 shrink-0" />
          <div className="min-w-0 flex-1">{error}</div>
          <button type="button" className="text-red-700 underline" onClick={load}>
            Coba lagi
          </button>
        </div>
      )}

      {notice && (
        <div
          role="status"
          className="flex items-start gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800"
        >
          <CheckCircle2 size={19} className="mt-0.5 shrink-0" />
          <p>{notice}</p>
        </div>
      )}

      <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
        {/* Header */}
        <div className="relative flex flex-col justify-center overflow-hidden px-6 py-7 text-white sm:px-8 sm:py-8">
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 bg-cover bg-center bg-no-repeat"
            style={{
              backgroundImage:
                'linear-gradient(90deg, rgba(9,42,76,.96) 0%, rgba(16,75,122,.88) 52%, rgba(23,105,170,.70) 100%), url("/img/kantor.jpg")',
            }}
          />

          <div className="relative z-10 flex flex-wrap items-center justify-between gap-4">
            <div>
              <p className="text-xs font-bold uppercase tracking-widest text-cyan-100">
                Administrasi Dokumen
              </p>
              <h2 className="mt-2 text-2xl font-extrabold tracking-tight sm:text-3xl">
                {cfg.title}
              </h2>
              <p className="mt-3 max-w-xl text-sm leading-6 text-blue-100">
                {isAdmin
                  ? "Lihat detail, ubah, atau hapus dokumen."
                  : "Telusuri dokumen yang tersedia."}
              </p>
            </div>

            
          </div>
        </div>

        {/* Filter */}
        <div className="border-b border-slate-100 p-5 sm:p-6">
          <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
            <select
              className={`${inputClass} sm:w-52`}
              value={unitFilter}
              onChange={(e) => setUnitFilter(e.target.value)}
              aria-label="Filter berdasarkan unit kerja"
            >
              <option value="">Semua Unit Kerja</option>
              {unitNames.map((name) => (
                <option key={name} value={name}>
                  {name}
                </option>
              ))}
            </select>

            <select
              className={`${inputClass} sm:w-48`}
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              aria-label="Filter status persetujuan"
            >
              <option value="">Semua Status</option>
              <option value="approved">Disetujui</option>
              <option value="pending">Menunggu</option>
              <option value="rejected">Ditolak</option>
            </select>

            <div className="relative min-w-0 sm:w-72">
              <Search
                size={17}
                className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
              />
              <input
                className={`${inputClass} pl-10`}
                placeholder="Cari dokumen..."
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                aria-label={`Cari ${cfg.label}`}
              />
            </div>

            <div className="whitespace-nowrap rounded-xl bg-slate-100 px-3.5 py-2.5 text-sm text-slate-600">
              <span className="font-bold text-slate-900">{shown.length}</span>{" "}
              dari {rows.length} dokumen
            </div>
          </div>
        </div>

        {/* Tabel */}
        <div className="overflow-x-auto">
          <table className="w-full min-w-[820px] text-left text-sm">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50/80 text-xs uppercase tracking-wider text-slate-500">
                <th className="px-5 py-4 font-bold">Nomor</th>
                <th className="px-5 py-4 font-bold">Nama / Judul</th>
                <th className="px-5 py-4 font-bold">Unit Kerja</th>
                <th className="px-5 py-4 font-bold">Tahun</th>
                <th className="px-5 py-4 font-bold">Persetujuan</th>
                {type === "sop" && (
                  <th className="px-5 py-4 font-bold">Berlaku</th>
                )}
                <th className="px-5 py-4 font-bold">Dokumen</th>
                <th className="px-5 py-4 text-right font-bold">Aksi</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-100">
              {loading && (
                <tr>
                  <td colSpan={colSpan} className="px-5 py-16 text-center">
                    <div className="flex flex-col items-center gap-3 text-slate-500">
                      <RefreshCw
                        size={24}
                        className="animate-spin text-cyan-700"
                      />
                      <span>Memuat dokumen...</span>
                    </div>
                  </td>
                </tr>
              )}

              {!loading && visible.length === 0 && (
                <tr>
                  <td colSpan={colSpan} className="px-5 py-16 text-center">
                    <div className="mx-auto flex max-w-sm flex-col items-center">
                      <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100 text-slate-400">
                        <FileCheck2 size={26} />
                      </div>
                      <p className="mt-4 font-semibold text-slate-800">
                        {query || unitFilter || statusFilter
                          ? "Dokumen tidak ditemukan"
                          : "Belum ada dokumen"}
                      </p>
                    </div>
                  </td>
                </tr>
              )}

              {!loading &&
                visible.map((item) => {
                  const approval = APPROVAL[item.approval];

                  return (
                    <tr
                      key={item.id}
                      className="transition-colors hover:bg-cyan-50/30"
                    >
                      <td className="px-5 py-4 align-top">
                        <span className="inline-flex rounded-lg border border-blue-100 bg-blue-50 px-2.5 py-1.5 font-semibold text-blue-900">
                          {item.number || "—"}
                        </span>
                      </td>

                      <td className="px-5 py-4 align-top font-semibold leading-5 text-slate-800">
                        {item.title || "—"}
                      </td>

                      <td className="px-5 py-4 align-top text-slate-600">
                        {item.unit || "—"}
                      </td>

                      <td className="px-5 py-4 align-top text-slate-600">
                        {item.year || "—"}
                      </td>

                      <td className="px-5 py-4 align-top">
                        <span
                          className={`inline-flex rounded-full px-2.5 py-1 text-xs font-bold ${
                            approval?.cls || "bg-slate-100 text-slate-600"
                          }`}
                        >
                          {approval?.label || item.approval || "—"}
                        </span>
                      </td>

                      {type === "sop" && (
                        <td className="px-5 py-4 align-top">
                          <span
                            className={`inline-flex rounded-full px-2.5 py-1 text-xs font-bold ${
                              item.berlaku === "Berlaku"
                                ? "bg-green-50 text-green-700"
                                : item.berlaku === "Tidak_Berlaku"
                                ? "bg-red-50 text-red-700"
                                : "bg-slate-100 text-slate-600"
                            }`}
                          >
                            {item.berlaku
                              ? item.berlaku.replaceAll("_", " ")
                              : "—"}
                          </span>
                        </td>
                      )}

                      <td className="px-5 py-4 align-top">
                        {item.hasFile ? (
                          <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-100 bg-emerald-50 px-2.5 py-1.5 text-xs font-semibold text-emerald-700">
                            <CheckCircle2 size={13} />
                            PDF tersedia
                          </span>
                        ) : (
                          <span className="inline-flex rounded-full bg-slate-100 px-2.5 py-1.5 text-xs font-medium text-slate-500">
                            Belum ada PDF
                          </span>
                        )}
                      </td>

                      <td className="px-5 py-4 text-right align-top">
                        <div className="inline-flex items-center gap-1">
                          <button
                            type="button"
                            title="Lihat detail"
                            aria-label={`Detail ${item.title || item.number}`}
                            className="inline-flex items-center gap-1 rounded-lg px-2 py-2 text-xs font-bold text-cyan-800 hover:bg-cyan-50"
                            onClick={() => openDetail(item)}
                          >
                            <Eye size={16} /> Detail
                          </button>

                          {isAdmin && (
                            <>
                              <button
                                type="button"
                                title="Ubah dokumen"
                                aria-label={`Ubah ${item.title || item.number}`}
                                className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-slate-500 transition hover:bg-blue-50 hover:text-blue-800"
                                onClick={() => openEdit(item)}
                              >
                                <Pencil size={16} />
                              </button>

                              <button
                                type="button"
                                title="Hapus dokumen"
                                aria-label={`Hapus ${item.title || item.number}`}
                                className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-slate-500 transition hover:bg-red-50 hover:text-red-700"
                                onClick={() => remove(item)}
                              >
                                <Trash2 size={16} />
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex flex-wrap items-center justify-center gap-3 border-t border-slate-100 px-5 py-4">
            <button
              type="button"
              disabled={currentPage === 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              className="rounded-xl border bg-white p-2.5 disabled:opacity-40"
              aria-label="Halaman sebelumnya"
            >
              <ChevronLeft size={18} />
            </button>

            <span className="text-sm font-bold text-[#104b7a]">
              Halaman {currentPage} dari {totalPages}
            </span>

            <button
              type="button"
              disabled={currentPage === totalPages}
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              className="rounded-xl border bg-white p-2.5 disabled:opacity-40"
              aria-label="Halaman berikutnya"
            >
              <ChevronRight size={18} />
            </button>
          </div>
        )}

        <div className="flex flex-col gap-2 border-t border-slate-100 bg-slate-50/60 px-5 py-3 text-xs text-slate-500 sm:flex-row sm:items-center sm:justify-between">
          <span className="inline-flex items-center gap-1.5">
            <ShieldCheck size={14} className="text-cyan-800" />
            Akses dan perubahan dokumen mengikuti peran pengguna.
          </span>
          <span>{cfg.title} · SIMPB BAPETEN</span>
        </div>
      </section>

      {/* Modal detail */}
      {detail && (
        <Modal
          title={`Detail ${cfg.label}`}
          onClose={() => setDetail(null)}
        >
          <div className="max-h-[75vh] space-y-5 overflow-y-auto pr-1 text-sm text-slate-700">
            <div className="rounded-2xl bg-gradient-to-br from-slate-950 to-cyan-900 p-5 text-white">
              <p className="text-xs font-bold uppercase tracking-widest text-cyan-200">
                {cfg.title}
              </p>
              <h3 className="mt-2 text-xl font-bold">
                {detail.item.title || "—"}
              </h3>
              <p className="mt-2 text-sm text-cyan-100">
                {detail.item.number || "Tanpa nomor"}
              </p>
            </div>

            <dl className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {[
                ["Nomor", detail.item.number],
                ["Tahun", detail.item.year],
                ["Unit Kerja", detail.item.unit],
                [
                  "Persetujuan",
                  APPROVAL[detail.item.approval]?.label || detail.item.approval,
                ],
                [
                  "Status Berlaku",
                  detail.item.berlaku?.replaceAll("_", " "),
                ],
                ["Catatan Review", detail.item.note],
              ]
                .filter(([, v]) => v)
                .map(([k, v]) => (
                  <div
                    key={k}
                    className="rounded-xl border border-slate-200 p-3"
                  >
                    <dt className="text-xs font-medium text-slate-500">{k}</dt>
                    <dd className="mt-1 font-semibold text-slate-900">{v}</dd>
                  </div>
                ))}
            </dl>

            <div className="flex flex-wrap gap-2">
              {detail.item.hasFile ? (
                <button
                  type="button"
                  className={buttonPrimary}
                  onClick={() => viewPdf(pdfPath(detail.item))}
                >
                  <ExternalLink size={16} /> Lihat PDF
                </button>
              ) : (
                <p className="rounded-xl bg-slate-100 p-3 text-slate-500">
                  PDF belum tersedia.
                </p>
              )}

              {type === "standar" && (
                <Link to={cfg.full} className={buttonSecondary}>
                  Buka rincian 14 komponen
                </Link>
              )}

              {/* Tombol "Ubah" dihapus dari detail; edit tersedia lewat ikon pensil di tabel */}
              {isAdmin && (
                <button
                  type="button"
                  className="inline-flex items-center justify-center gap-2 rounded-xl border border-red-200 bg-white px-4 py-2.5 text-sm font-semibold text-red-700 transition hover:bg-red-50"
                  onClick={() => remove(detail.item)}
                >
                  <Trash2 size={16} /> Hapus
                </button>
              )}
            </div>

            {type === "sop" && (
              <div className="border-t border-slate-200 pt-4">
                <h4 className="flex items-center gap-2 font-bold text-slate-900">
                  <Link2 size={17} /> Dokumen Terkait ({detail.related.length})
                </h4>

                <div className="mt-3 space-y-2">
                  {detail.related.length ? (
                    detail.related.map((d, i) => (
                      <div
                        key={i}
                        className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 p-3"
                      >
                        <div>
                          <p className="text-xs font-bold text-cyan-800">
                            {relatedLabel(d.document_type)} · {d.nomor}
                          </p>
                          <p className="mt-1 font-semibold text-slate-800">
                            {d.judul}
                          </p>
                        </div>

                        {d.file_pdf ? (
                          <button
                            type="button"
                            className={buttonSecondary}
                            onClick={() =>
                              viewPdf(
                                `/proses/${d.document_type}/${d.document_id}/file`
                              )
                            }
                          >
                            Lihat PDF
                          </button>
                        ) : (
                          <span className="text-xs text-slate-500">
                            PDF tidak tersedia
                          </span>
                        )}
                      </div>
                    ))
                  ) : (
                    <p className="rounded-xl bg-slate-50 p-4 text-slate-500">
                      Belum ada dokumen terkait.
                    </p>
                  )}
                </div>
              </div>
            )}
          </div>
        </Modal>
      )}

      {/* Modal ubah */}
      {form && (
        <Modal
          title={`Ubah ${cfg.label}`}
          onClose={() => !busy && setForm(null)}
        >
          <form
            onSubmit={save}
            className="max-h-[75vh] space-y-4 overflow-y-auto pr-1"
          >
            {formError && (
              <div
                role="alert"
                className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm leading-5 text-red-800"
              >
                {formError}
              </div>
            )}

            <div>
              <label className={labelClass}>
                {type === "sop" ? "Nomor SOP" : "Nomor Standar"} *
              </label>
              <input
                className={inputClass}
                required
                maxLength={100}
                value={form.number}
                onChange={(e) => setForm({ ...form, number: e.target.value })}
              />
            </div>

            <div>
              <label className={labelClass}>
                {type === "sop" ? "Nama SOP" : "Nama Layanan"} *
              </label>
              <input
                className={inputClass}
                required
                maxLength={255}
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
              />
            </div>

            <div>
              <label className={labelClass}>Tahun *</label>
              <input
                className={inputClass}
                type="number"
                min="1901"
                max="2155"
                required
                value={form.year}
                onChange={(e) => setForm({ ...form, year: e.target.value })}
              />
            </div>

            {type === "sop" && (
              <div>
                <label className={labelClass}>Status Berlaku</label>
                <select
                  className={inputClass}
                  value={form.berlaku}
                  onChange={(e) =>
                    setForm({ ...form, berlaku: e.target.value })
                  }
                >
                  <option value="Berlaku">Berlaku</option>
                  <option value="Tidak_Berlaku">Tidak Berlaku</option>
                </select>
              </div>
            )}

            {type === "standar" && (
              <div>
                <label className={labelClass}>Unit Kerja</label>
                <select
                  className={inputClass}
                  value={form.unitId}
                  onChange={(e) =>
                    setForm({ ...form, unitId: e.target.value })
                  }
                >
                  <option value="">Pilih unit kerja</option>
                  {units.map((unit) => (
                    <option key={unit.id} value={unit.id}>
                      {unit.nama_unit}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Unggah PDF kini tersedia untuk SOP dan Standar Pelayanan */}
            <div>
              <label className={labelClass}>Ganti Dokumen PDF (opsional)</label>
              <input
                className={inputClass}
                type="file"
                accept=".pdf,application/pdf"
                onChange={(e) =>
                  setForm({ ...form, file: e.target.files?.[0] || null })
                }
              />
              <p className="mt-1.5 text-xs leading-5 text-slate-500">
                Kosongkan jika PDF tidak diganti.
              </p>
            </div>

            {type === "sop" && (
              <p className="rounded-xl bg-blue-50 px-3 py-2 text-xs leading-5 text-blue-800">
                Yang dapat diubah: nomor, nama, tahun, status berlaku, dan file
                PDF. Unit kerja tidak diubah dari sini.
              </p>
            )}

            {type === "standar" && (
              <p className="rounded-xl bg-amber-50 px-3 py-2 text-xs leading-5 text-amber-800">
                Form ini hanya mengubah data utama. Untuk mengubah 14 komponen
                standar, gunakan halaman Standar Pelayanan.
              </p>
            )}

            <div className="sticky bottom-0 flex flex-col-reverse gap-2 border-t border-slate-100 bg-white pt-4 sm:flex-row sm:justify-end">
              <button
                type="button"
                className={buttonSecondary}
                disabled={busy}
                onClick={() => setForm(null)}
              >
                Batal
              </button>

              <button type="submit" className={buttonPrimary} disabled={busy}>
                {busy ? (
                  <>
                    <RefreshCw size={16} className="animate-spin" />
                    Menyimpan...
                  </>
                ) : (
                  <>
                    <CheckCircle2 size={16} />
                    Simpan Perubahan
                  </>
                )}
              </button>
            </div>
          </form>
        </Modal>
      )}
    </>
  );
}
