import { useCallback, useEffect, useMemo, useState } from "react";
import {
  AlertCircle,
  Check,
  CheckCircle2,
  ChevronRight,
  ClipboardCheck,
  Clock3,
  FileCheck2,
  FileText,
  Files,
  Layers3,
  RefreshCw,
  Search,
  ShieldCheck,
  X,
  XCircle,
  Eye,
  Inbox,
  BookOpenCheck,
} from "lucide-react";
// SIMPB_APPROVAL_STANDAR_V1
import api, { openPdf, errMsg } from "../api/client.js";
import { useNotifications } from "../context/NotificationContext.jsx";

const TYPES = [
  { id: "all", label: "Semua Dokumen" },
  { id: "sop", label: "SOP", icon: FileCheck2 },
  { id: "peta", label: "Peta Proses", icon: Layers3 },
  { id: "sub", label: "Sub Proses", icon: FileText },
  { id: "cfm", label: "CFM", icon: Files },
  { id: "standar", label: "Standar Pelayanan", icon: BookOpenCheck },
];

const typeLabel = {
  sop: "SOP",
  peta: "Peta Proses",
  sub: "Sub Proses",
  cfm: "Cross Functional Map",
  standar: "Standar Pelayanan",
};

const rowKey = (doc) => `${doc.document_type}-${doc.id}`;

function formatDate(value) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleString("id-ID", {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

export default function Approval() {
  const { unread } = useNotifications();

  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [query, setQuery] = useState("");
  const [activeType, setActiveType] = useState("all");
  const [confirming, setConfirming] = useState(null);
  const [rejecting, setRejecting] = useState(null);
  const [reason, setReason] = useState("");
  const [busyKey, setBusyKey] = useState(null);
  const [pdfBusy, setPdfBusy] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const [sopResponse, prosesResponse, standarResponse] = await Promise.all([
        api.get("/sop", {
          params: { approval_status: "pending", limit: 100 },
        }),
        api.get("/proses/approval"),
        api.get("/standar-pelayanan"),
      ]);

      const sops = (sopResponse.data.data || []).map((item) => ({
        ...item,
        document_type: "sop",
        document_title: item.nama_sop,
        document_number: item.nomor_sop,
      }));

      const proses = (prosesResponse.data.data || []).map((item) => ({
        ...item,
        document_title: item.title,
      }));

      // Admin endpoint lists all statuses; only pending belongs in the approval queue.
      const standar = (standarResponse.data.data || [])
        .filter((item) => item.approval_status === "pending")
        .map((item) => ({
          ...item,
          document_type: "standar",
          document_title: item.nama_layanan,
          document_number: item.nomor_standar,
          tahun_terbit: item.tahun,
        }));
      setRows([...sops, ...proses, ...standar]);
    } catch (e) {
      setError(errMsg(e));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    if (unread) load();
  }, [unread, load]);

  const counts = useMemo(() => {
    const result = { all: rows.length, sop: 0, peta: 0, sub: 0, cfm: 0, standar: 0 };
    rows.forEach((doc) => {
      if (result[doc.document_type] !== undefined) {
        result[doc.document_type] += 1;
      }
    });
    return result;
  }, [rows]);

  const filtered = useMemo(() => {
    const keyword = query.trim().toLowerCase();

    return rows.filter((doc) => {
      if (activeType !== "all" && doc.document_type !== activeType) {
        return false;
      }

      if (!keyword) return true;

      return [
        doc.document_title,
        doc.document_number,
        doc.uploaded_by_name,
        doc.nama_unit,
        doc.nama_lembaga,
        doc.tahun_terbit,
        typeLabel[doc.document_type],
      ].some((value) =>
        String(value ?? "").toLowerCase().includes(keyword)
      );
    });
  }, [rows, query, activeType]);

  const decide = async (doc, decision, catatan = "") => {
    const key = rowKey(doc);
    setBusyKey(key);
    setError("");
    setNotice("");

    try {
      if (doc.document_type === "sop") {
        await api.post(`/sop/${doc.id}/${decision}`, { catatan });
      } else if (doc.document_type === "standar") {
        await api.post(`/standar-pelayanan/${doc.id}/${decision}`, { catatan });
      } else {
        await api.post(
          `/proses/${doc.document_type}/${doc.id}/${decision}`,
          { reject_reason: catatan }
        );
      }

      setRows((current) =>
        current.filter((item) => rowKey(item) !== key)
      );

      setNotice(
        `${typeLabel[doc.document_type]} ${doc.document_number || ""} berhasil ${
          decision === "approve" ? "disetujui" : "ditolak"
        }.`
      );

      setConfirming(null);
      setRejecting(null);
      setReason("");
    } catch (e) {
      setError(errMsg(e));
    } finally {
      setBusyKey(null);
    }
  };

  const openDocument = async (doc) => {
    const key = rowKey(doc);
    setPdfBusy(key);
    setError("");

    try {
      const endpoint =
        doc.document_type === "sop"
          ? `/sop/${doc.id}/view`
          : doc.document_type === "standar"
            ? `/standar-pelayanan/${doc.id}/view`
            : `/proses/${doc.document_type}/${doc.id}/file`;

      await openPdf(endpoint);
    } catch (e) {
      setError(errMsg(e));
    } finally {
      setPdfBusy(null);
    }
  };

  const closeModal = () => {
    if (busyKey) return;
    setConfirming(null);
    setRejecting(null);
    setReason("");
  };

  return (
    <div className="mx-auto max-w-7xl space-y-6 pb-10">
      {/* Header */}
      <section className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-slate-900 via-blue-900 to-cyan-800 text-white shadow-lg min-h-[180px] sm:min-h-[210px] px-6 py-7 sm:px-8 sm:py-8 flex flex-col justify-center">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 z-0 bg-cover bg-center bg-no-repeat"
          style={{
            backgroundImage:
              'linear-gradient(90deg, rgba(9,42,76,.96) 0%, rgba(16,75,122,.88) 52%, rgba(23,105,170,.70) 100%), url("/img/kantor.jpg")'
          }}
        />

        <div className="pointer-events-none absolute -right-12 -top-20 h-64 w-64 rounded-full bg-blue-400/10 blur-3xl" />

        <div className="relative flex flex-wrap items-start justify-between gap-5">
          <div className="max-w-2xl">
            <div className="mb-3 flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-blue-100">
              <ShieldCheck size={16} />
              Administrasi Persetujuan
            </div>

            <h1 className="text-2xl font-extrabold tracking-tight sm:text-3xl">
              Approval Dokumen
            </h1>

            <p className="mt-3 text-sm leading-6 text-slate-200">
              Periksa pengajuan dari Unit Kerja, tinjau PDF, lalu berikan
              keputusan secara terarah dan terdokumentasi.
            </p>
          </div>

          <button
            type="button"
            onClick={load}
            disabled={loading || Boolean(busyKey)}
            className="inline-flex items-center gap-2 rounded-xl border border-white/20 bg-white/10 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-white/20 disabled:opacity-50"
          >
            <RefreshCw size={16} className={loading ? "animate-spin" : ""} />
            Perbarui Data
          </button>
        </div>

        <div className="relative mt-7 flex items-center gap-3 rounded-2xl border border-white/10 bg-white/10 p-4">
          <div className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-white/15">
            <Clock3 size={22} />
          </div>
          <div>
            <p className="text-2xl font-extrabold tabular-nums">
              {loading ? "…" : counts.all}
            </p>
            <p className="text-xs text-slate-200">
              Dokumen menunggu keputusan
            </p>
          </div>
        </div>
      </section>

      {/* Ringkasan */}
      <section className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-5">
        {TYPES.filter((item) => item.id !== "all").map((item) => {
          const Icon = item.icon;

          return (
            <button
              key={item.id}
              type="button"
              onClick={() => setActiveType(item.id)}
              className={`rounded-2xl border p-4 text-left transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md ${
                activeType === item.id
                  ? "border-blue-500 bg-blue-50 ring-2 ring-blue-500/10"
                  : "border-slate-200 bg-white hover:border-blue-200"
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="grid h-10 w-10 place-items-center rounded-xl bg-slate-100 text-slate-700">
                  <Icon size={20} />
                </span>
                <ChevronRight size={17} className="text-slate-400" />
              </div>

              <p className="mt-4 text-3xl font-extrabold tabular-nums text-slate-900">
                {loading ? "—" : counts[item.id]}
              </p>
              <p className="mt-1 text-sm font-semibold text-slate-600">
                {item.label}
              </p>
              <p className="mt-1 text-xs text-slate-400">
                Menunggu pemeriksaan
              </p>
            </button>
          );
        })}
      </section>

      {/* Pesan */}
      {error && (
        <div role="alert" className="flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">
          <AlertCircle size={19} className="shrink-0" />
          <span className="flex-1">{error}</span>
          <button onClick={() => setError("")} aria-label="Tutup pesan">
            <X size={17} />
          </button>
        </div>
      )}

      {notice && (
        <div role="status" className="flex items-center gap-3 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800">
          <CheckCircle2 size={19} />
          <span className="flex-1">{notice}</span>
          <button onClick={() => setNotice("")} aria-label="Tutup pesan">
            <X size={17} />
          </button>
        </div>
      )}

      {/* Antrean */}
      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-100 p-5 sm:p-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="flex items-center gap-2 text-lg font-bold text-slate-900">
                <ClipboardCheck size={21} className="text-blue-800" />
                Daftar Pengajuan
              </h2>
              <p className="mt-2 text-sm leading-6 text-slate-500">
                Pilih jenis dokumen atau gunakan pencarian untuk menemukan pengajuan.
              </p>
            </div>

            <span className="rounded-full bg-slate-100 px-3 py-1.5 text-xs font-bold text-slate-600">
              {loading ? "Memuat…" : `${filtered.length} pengajuan`}
            </span>
          </div>

          <div className="mt-7 flex flex-wrap gap-3">
            {TYPES.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => setActiveType(item.id)}
                className={`rounded-xl px-3.5 py-2 text-xs font-bold transition ${
                  activeType === item.id
                    ? "bg-gradient-to-r from-slate-900 via-blue-900 to-cyan-800 text-white shadow-sm"
                    : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                }`}
              >
                {item.label}
                <span className="ml-2 opacity-70">
                  {counts[item.id]}
                </span>
              </button>
            ))}
          </div>

          <div className="relative mt-6">
            <Search size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Cari nomor, judul, pengunggah, atau unit kerja..."
              aria-label="Cari pengajuan"
              className="w-full rounded-xl border border-slate-200 bg-slate-50 py-3 pl-11 pr-4 text-sm outline-none transition focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-500/10"
            />
          </div>
        </div>

        <div className="px-5 py-8 sm:px-7 sm:py-10">
          {loading ? (
            <div className="space-y-3" role="status">
              {[1, 2, 3].map((item) => (
                <div key={item} className="animate-pulse rounded-xl border border-slate-100 p-5">
                  <div className="h-4 w-24 rounded bg-slate-200" />
                  <div className="mt-4 h-5 w-2/3 rounded bg-slate-200" />
                  <div className="mt-3 h-4 w-1/2 rounded bg-slate-100" />
                </div>
              ))}
              <span className="sr-only">Memuat antrean dokumen</span>
            </div>
          ) : rows.length === 0 && !error ? (
            <div className="flex flex-col items-center py-12 text-center">
              <div className="grid h-20 w-20 place-items-center rounded-3xl bg-emerald-50 text-emerald-600">
                <Inbox size={36} strokeWidth={1.6} />
              </div>

              <h3 className="mt-5 text-xl font-bold text-slate-900">
                Semua pengajuan sudah ditangani
              </h3>

              <p className="mt-2 max-w-md text-sm leading-6 text-slate-500">
                Saat ini tidak ada dokumen yang menunggu keputusan.
                Pengajuan baru dari Unit Kerja akan muncul di halaman ini.
              </p>

              <button
                type="button"
                onClick={load}
                className="mt-5 inline-flex items-center gap-2 rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-bold text-slate-700 transition hover:bg-slate-50"
              >
                <RefreshCw size={16} />
                Periksa Pengajuan Baru
              </button>
            </div>
          ) : filtered.length === 0 && !error ? (
            <div className="py-12 text-center">
              <Search size={34} className="mx-auto text-slate-300" />
              <h3 className="mt-4 font-bold text-slate-800">
                Tidak ada hasil yang cocok
              </h3>
              <p className="mt-2 text-sm text-slate-500">
                Coba ubah kata kunci atau pilih jenis dokumen lain.
              </p>
              <button
                type="button"
                onClick={() => {
                  setQuery("");
                  setActiveType("all");
                }}
                className="mt-4 text-sm font-bold text-blue-800 hover:underline"
              >
                Reset pencarian dan filter
              </button>
            </div>
          ) : (
            <ul className="space-y-6">
              {filtered.map((doc) => {
                const key = rowKey(doc);
                const isBusy = busyKey === key;
                const isPdfBusy = pdfBusy === key;

                return (
                  <li
  key={key}
  className="rounded-2xl border border-slate-200 p-5 sm:p-6 transition-all duration-200 hover:border-blue-200 hover:shadow-md"
>
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="rounded-lg bg-blue-50 px-2.5 py-1 text-xs font-bold text-blue-900">
                            {typeLabel[doc.document_type] || doc.document_type}
                          </span>
                          <span className="inline-flex items-center gap-1 rounded-lg bg-amber-50 px-2.5 py-1 text-xs font-bold text-amber-700">
                            <Clock3 size={12} />
                            Menunggu Review
                          </span>
                        </div>

                        <h3 className="mt-3 text-base font-bold leading-6 text-slate-900">
                          {doc.document_title || "(Tanpa judul)"}
                        </h3>

                        <p className="mt-1 text-sm font-semibold text-slate-600">
                          {doc.document_number || "Nomor belum tersedia"}
                          {doc.tahun_terbit ? ` · ${doc.tahun_terbit}` : ""}
                        </p>

                        <div className="mt-5 grid gap-4 rounded-xl bg-slate-50 p-4 text-sm sm:grid-cols-2">
                          <div>
                            <p className="text-xs text-slate-400">Diunggah oleh</p>
                            <p className="mt-1 font-semibold text-slate-700">
                              {doc.uploaded_by_name || "Pengguna"}
                            </p>
                          </div>
                          <div>
                            <p className="text-xs text-slate-400">Unit / Lembaga Pengaju</p>
                            <p className="mt-1 font-semibold text-slate-700">
                              {doc.nama_unit || doc.nama_lembaga || "Belum tersedia"}
                            </p>
                          </div>
                          {doc.created_at && (
                            <div className="sm:col-span-2">
                              <p className="text-xs text-slate-400">Waktu pengajuan</p>
                              <p className="mt-1 font-medium text-slate-700">
                                {formatDate(doc.created_at)}
                              </p>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-slate-100 pt-4">
                      <button
                        type="button"
                        onClick={() => openDocument(doc)}
                        disabled={isBusy || isPdfBusy}
                        className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-bold text-slate-700 transition hover:bg-slate-50 disabled:opacity-50"
                      >
                        <Eye size={17} />
                        {isPdfBusy ? "Membuka…" : "Periksa PDF"}
                      </button>

                      <div className="flex-1" />

                      <button
                        type="button"
                        onClick={() => {
                          setReason("");
                          setRejecting(doc);
                        }}
                        disabled={Boolean(busyKey)}
                        className="inline-flex items-center gap-2 rounded-xl border border-red-200 px-4 py-2.5 text-sm font-bold text-red-700 transition hover:bg-red-50 disabled:opacity-50"
                      >
                        <XCircle size={17} />
                        Tolak
                      </button>

                      <button
                        type="button"
                        onClick={() => setConfirming(doc)}
                        disabled={Boolean(busyKey)}
                        className="inline-flex items-center gap-2 rounded-xl bg-emerald-700 px-4 py-2.5 text-sm font-bold text-white transition hover:bg-emerald-800 disabled:opacity-50"
                      >
                        <Check size={17} />
                        Setujui
                      </button>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </section>

      {/* Panduan */}
      <section className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
        <h2 className="flex items-center gap-2 text-sm font-bold text-slate-800">
          <ShieldCheck size={18} className="text-blue-800" />
          Panduan Singkat Pemeriksaan
        </h2>
        <div className="mt-3 grid gap-3 text-sm text-slate-600 sm:grid-cols-3">
          <p><strong className="text-slate-800">1. Periksa PDF.</strong> Pastikan isi dan identitas dokumen sesuai.</p>
          <p><strong className="text-slate-800">2. Tentukan keputusan.</strong> Setujui jika sesuai atau tolak jika perlu perbaikan.</p>
          <p><strong className="text-slate-800">3. Berikan alasan.</strong> Jelaskan kekurangan dokumen saat melakukan penolakan.</p>
        </div>
      </section>

      {/* Modal Persetujuan */}
      {confirming && (
        <div
          className="fixed inset-0 z-50 grid place-items-center bg-slate-950/60 p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="approve-title"
        >
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl">
            <div className="grid h-12 w-12 place-items-center rounded-xl bg-emerald-50 text-emerald-700">
              <CheckCircle2 size={26} />
            </div>

            <h2 id="approve-title" className="mt-4 text-xl font-bold text-slate-900">
              Setujui dokumen ini?
            </h2>

            <p className="mt-2 text-sm leading-6 text-slate-600">
              Pastikan Anda telah memeriksa PDF dan informasi dokumen sebelum melanjutkan.
            </p>

            <div className="mt-4 rounded-xl bg-slate-50 p-3">
              <p className="text-xs font-bold text-slate-500">
                {typeLabel[confirming.document_type]}
              </p>
              <p className="mt-1 font-semibold text-slate-900">
                {confirming.document_title || "(Tanpa judul)"}
              </p>
              <p className="mt-1 text-xs text-slate-500">
                {confirming.document_number || "Nomor belum tersedia"}
              </p>
            </div>

            <div className="mt-5 flex justify-end gap-2">
              <button
                type="button"
                onClick={closeModal}
                disabled={Boolean(busyKey)}
                className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-bold text-slate-700"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={() => decide(confirming, "approve")}
                disabled={Boolean(busyKey)}
                className="rounded-xl bg-emerald-700 px-4 py-2.5 text-sm font-bold text-white disabled:opacity-50"
              >
                {busyKey ? "Memproses…" : "Ya, Setujui"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Penolakan */}
      {rejecting && (
        <div
          className="fixed inset-0 z-50 grid place-items-center bg-slate-950/60 p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="reject-title"
        >
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl">
            <div className="grid h-12 w-12 place-items-center rounded-xl bg-red-50 text-red-700">
              <XCircle size={26} />
            </div>

            <h2 id="reject-title" className="mt-4 text-xl font-bold text-slate-900">
              Tolak dokumen ini?
            </h2>

            <p className="mt-2 text-sm text-slate-600">
              {rejecting.document_title || "(Tanpa judul)"}
            </p>

            <label htmlFor="reject-reason" className="mt-5 block text-sm font-bold text-slate-700">
              Alasan penolakan *
            </label>

            <textarea
              id="reject-reason"
              autoFocus
              rows={4}
              value={reason}
              onChange={(event) => setReason(event.target.value)}
              placeholder="Contoh: Nomor dokumen belum sesuai, mohon diperbaiki..."
              className="mt-2 w-full resize-y rounded-xl border border-slate-200 p-3 text-sm outline-none focus:border-red-400 focus:ring-4 focus:ring-red-500/10"
            />

            <p className="mt-2 text-xs text-slate-500">
              Jelaskan alasan secara spesifik agar pengaju memahami bagian yang perlu diperbaiki.
            </p>

            <div className="mt-5 flex justify-end gap-2">
              <button
                type="button"
                onClick={closeModal}
                disabled={Boolean(busyKey)}
                className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-bold text-slate-700"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={() => decide(rejecting, "reject", reason.trim())}
                disabled={!reason.trim() || Boolean(busyKey)}
                className="rounded-xl bg-red-700 px-4 py-2.5 text-sm font-bold text-white disabled:cursor-not-allowed disabled:opacity-50"
              >
                {busyKey ? "Memproses…" : "Konfirmasi Penolakan"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
