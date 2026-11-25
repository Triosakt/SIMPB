
import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import {
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  Clock3,
  AlertCircle,
  FileText,
  FolderTree,
  ChevronDown,
  ChevronUp,
  ShieldCheck,
  Building2,
  Info,
  Loader2,
} from "lucide-react";

import api, { errMsg, openPdf } from "../api/client.js";
import StatusBadge from "../components/StatusBadge.jsx";

// ===============================
// KONFIGURASI STATUS PERSETUJUAN
// ===============================

const STATUS = {
  approved: {
    label: "Disetujui",
    title: "Dokumen telah disetujui",
    description:
      "Dokumen ini telah melalui proses pemeriksaan dan mendapatkan persetujuan dari Admin Ortala.",
    badge: "bg-emerald-50 text-emerald-700 border-emerald-200",
    panel: "bg-emerald-50/70 border-emerald-200",
    icon: CheckCircle2,
    iconColor: "text-emerald-600",
  },

  pending: {
    label: "Menunggu Persetujuan",
    title: "Dokumen berhasil diajukan",
    description:
      "Peta proses bisnis Anda telah berhasil diunggah dan saat ini sedang menunggu pemeriksaan serta persetujuan dari Admin Ortala. Dokumen akan tersedia bagi pengguna lain setelah disetujui.",
    badge: "bg-amber-50 text-amber-700 border-amber-200",
    panel: "bg-amber-50/70 border-amber-200",
    icon: Clock3,
    iconColor: "text-amber-600",
  },

  rejected: {
    label: "Memerlukan Perbaikan",
    title: "Dokumen belum dapat disetujui",
    description:
      "Admin Ortala telah melakukan pemeriksaan, namun dokumen ini memerlukan perbaikan. Silakan periksa keterangan penolakan dan hubungi Admin Ortala untuk tindak lanjut.",
    badge: "bg-rose-50 text-rose-700 border-rose-200",
    panel: "bg-rose-50/70 border-rose-200",
    icon: AlertCircle,
    iconColor: "text-rose-600",
  },
};

function ApprovalBadge({ status }) {
  const config = STATUS[status];

  if (!config) {
    return (
      <span className="inline-flex rounded-full border border-line bg-surface-muted px-3 py-1 text-xs font-semibold text-ink-soft">
        Status belum tersedia
      </span>
    );
  }

  const Icon = config.icon;

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-semibold ${config.badge}`}
    >
      <Icon size={14} />
      {config.label}
    </span>
  );
}

function Units({ list }) {
  if (!list?.length) return null;

  return (
    <div className="mt-3 flex flex-wrap items-center gap-2">
      <Building2 size={14} className="text-ink-soft" />

      {list.map((unit) => (
        <span
          key={unit}
          className="rounded-lg border border-line bg-surface-muted px-2.5 py-1 text-xs font-medium text-ink-soft"
        >
          {unit}
        </span>
      ))}
    </div>
  );
}

function ApprovalNotice({ status, rejectReason }) {
  const config = STATUS[status];

  if (!config) return null;

  const Icon = config.icon;

  return (
    <div className={`rounded-2xl border p-4 sm:p-5 ${config.panel}`}>
      <div className="flex items-start gap-3">
        <div className="rounded-xl bg-white/80 p-2.5 shadow-sm">
          <Icon size={21} className={config.iconColor} />
        </div>

        <div className="min-w-0 flex-1">
          <h2 className="font-bold text-primary">{config.title}</h2>

          <p className="mt-1.5 text-sm leading-relaxed text-ink-soft">
            {config.description}
          </p>

          {status === "pending" && (
            <div className="mt-4 flex items-center gap-2 text-xs font-medium text-amber-800">
              <Info size={14} />
              Tidak perlu mengunggah ulang selama dokumen masih dalam proses pemeriksaan.
            </div>
          )}

          {status === "rejected" && rejectReason && (
            <div className="mt-4 rounded-xl border border-rose-200 bg-white/80 p-3">
              <p className="text-xs font-bold uppercase tracking-wide text-rose-700">
                Keterangan dari Admin Ortala
              </p>
              <p className="mt-1 text-sm text-primary">{rejectReason}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function SopRow({ s }) {
  return (
    <li className="flex flex-wrap items-center justify-between gap-3 py-3 text-sm">
      <div className="flex min-w-0 items-start gap-2">
        <FileText size={16} className="mt-0.5 shrink-0 text-accent" />

        <div className="min-w-0">
          <p className="font-semibold text-primary">{s.nomor_sop}</p>
          <p className="mt-0.5 text-ink-soft">{s.nama_sop}</p>
        </div>
      </div>

      <StatusBadge status={s.status_berlaku} />
    </li>
  );
}

export default function ProsesDetail() {
  const { id } = useParams();

  const [d, setD] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [open, setOpen] = useState({});

  useEffect(() => {
    let active = true;

    setD(null);
    setError("");
    setLoading(true);
    setOpen({});

    api
      .get(`/proses/peta/${id}`)
      .then((response) => {
        if (active) setD(response.data);
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
  }, [id]);

  const pdf = async (type, itemId) => {
    setError("");

    try {
      await openPdf(`/proses/${type}/${itemId}/file`);
    } catch (e) {
      setError(errMsg(e));
    }
  };

  // PDF hanya ditawarkan ketika dokumen sudah disetujui.
  // Pemeriksaan akses sesungguhnya tetap dilakukan backend.
  const PdfBtn = ({ type, itemId, has, status }) => {
    if (status === "pending") {
      return (
        <span className="inline-flex items-center gap-2 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-medium text-amber-700">
          <Clock3 size={15} />
          PDF menunggu persetujuan
        </span>
      );
    }

    if (status === "rejected") {
      return (
        <span className="inline-flex items-center gap-2 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-medium text-rose-700">
          <AlertCircle size={15} />
          PDF belum tersedia
        </span>
      );
    }

    if (status !== "approved") {
      return (
        <span className="text-xs text-ink-soft">
          Akses PDF belum tersedia
        </span>
      );
    }

    if (!has) {
      return (
        <span className="text-xs text-ink-soft">
          File PDF belum tersedia
        </span>
      );
    }

    return (
      <button
        type="button"
        onClick={() => pdf(type, itemId)}
        className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:opacity-90 hover:shadow-lg focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
      >
        <FileText size={16} />
        Buka PDF
        <ArrowRight size={15} />
      </button>
    );
  };

  if (loading) {
    return (
      <div className="flex min-h-[55vh] flex-col items-center justify-center gap-3">
        <Loader2 size={30} className="animate-spin text-accent" />
        <p className="text-sm text-ink-soft">
          Memuat informasi peta proses...
        </p>
      </div>
    );
  }

  if (!d) {
    return (
      <div className="mx-auto max-w-3xl py-10">
        <div className="panel space-y-4 p-6 text-center">
          <AlertCircle size={32} className="mx-auto text-ink-soft" />

          <h1 className="text-lg font-bold text-primary">
            Peta proses belum dapat ditampilkan
          </h1>

          <p className="text-sm text-ink-soft">
            {error || "Dokumen tidak tersedia atau akun Anda belum memiliki akses."}
          </p>

          <Link
            to="/dashboard/proses"
            className="inline-flex items-center gap-2 text-sm font-semibold text-accent hover:underline"
          >
            <ArrowLeft size={16} />
            Kembali ke daftar peta proses
          </Link>
        </div>
      </div>
    );
  }

  const subProses = d.sub_proses || [];
  const sopTanpaSub = d.sop_tanpa_sub || [];

  return (
    <div className="mx-auto max-w-6xl space-y-6 pb-12">
      {/* NAVIGASI */}
      <Link
        to="/dashboard/proses"
        className="inline-flex items-center gap-2 text-sm font-medium text-ink-soft transition-colors hover:text-accent"
      >
        <ArrowLeft size={16} />
        Semua peta proses
      </Link>

      {/* HEADER DOKUMEN */}
      <header className="panel overflow-hidden">
        <div className="h-1.5 bg-gradient-to-r from-blue-700 via-cyan-500 to-blue-300" />

        <div className="p-5 sm:p-7">
          <div className="flex flex-wrap items-start justify-between gap-5">
            <div className="min-w-0 flex-1 space-y-4">
              <div className="flex flex-wrap items-center gap-2">
                <span className="rounded-lg bg-surface-muted px-3 py-1.5 text-xs font-bold tracking-wide text-accent">
                  {d.nomor_peta_proses}
                </span>

                <ApprovalBadge status={d.approval_status} />
              </div>

              <div>
                <p className="text-xs font-semibold uppercase tracking-widest text-ink-soft">
                  {d.nama_keterangan} · Tahun {d.tahun_terbit}
                </p>

                <h1 className="mt-2 max-w-3xl text-2xl font-bold leading-tight text-primary sm:text-3xl">
                  {d.judul}
                </h1>

                <Units list={d.units} />
              </div>
            </div>

            <PdfBtn
              type="peta"
              itemId={d.id}
              has={d.has_file}
              status={d.approval_status}
            />
          </div>
        </div>
      </header>

      {/* INFORMASI STATUS */}
      <ApprovalNotice
        status={d.approval_status}
        rejectReason={d.reject_reason}
      />

      {error && (
        <p
          role="alert"
          className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
        >
          {error}
        </p>
      )}

      {/* SUB PROSES */}
      <section className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="rounded-xl bg-surface-muted p-2.5 text-accent">
              <FolderTree size={21} />
            </div>

            <div>
              <h2 className="text-lg font-bold text-primary">
                Sub Proses
              </h2>
              <p className="text-xs text-ink-soft">
                Rincian proses bisnis yang terhubung
              </p>
            </div>
          </div>

          <span className="rounded-full border border-line bg-surface px-3 py-1 text-xs font-semibold text-ink-soft">
            {subProses.length} Sub Proses
          </span>
        </div>

        {subProses.length === 0 && (
          <div className="panel flex flex-col items-center justify-center px-5 py-12 text-center">
            <div className="mb-4 rounded-2xl bg-surface-muted p-4">
              <FolderTree size={28} className="text-ink-soft" />
            </div>

            <h3 className="font-semibold text-primary">
              Belum ada sub proses
            </h3>

            <p className="mt-2 max-w-md text-sm leading-relaxed text-ink-soft">
              {d.approval_status === "pending"
                ? "Peta proses ini sedang menunggu persetujuan Admin Ortala. Sub proses yang tersedia akan ditampilkan di bagian ini sesuai status dan hak akses."
                : "Belum ada sub proses yang tercatat pada peta proses ini."}
            </p>
          </div>
        )}

        <div className="space-y-3">
          {subProses.map((sp) => {
            const isOpen = !!open[sp.id];
            const cfms = sp.cfm || [];
            const sops = sp.sop || [];

            const totalSop =
              sops.length +
              cfms.reduce((total, c) => total + (c.sop || []).length, 0);

            return (
              <article
                key={sp.id}
                className="panel overflow-hidden transition-all duration-200 hover:shadow-md"
              >
                <div className="flex flex-wrap items-start justify-between gap-4 p-4 sm:p-5">
                  <button
                    type="button"
                    className="min-w-0 flex-1 text-left"
                    aria-expanded={isOpen}
                    onClick={() =>
                      setOpen((previous) => ({
                        ...previous,
                        [sp.id]: !previous[sp.id],
                      }))
                    }
                  >
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-xs font-bold tracking-wide text-accent">
                        {sp.nomor_sub_proses}
                      </span>

                      {sp.approval_status && (
                        <ApprovalBadge status={sp.approval_status} />
                      )}
                    </div>

                    <h3 className="mt-2 font-semibold text-primary">
                      {sp.nama_sub_proses}
                    </h3>

                    <div className="mt-3 flex flex-wrap items-center gap-3 text-xs text-ink-soft">
                      <span>{cfms.length} CFM</span>
                      <span>{totalSop} SOP</span>

                      <span className="inline-flex items-center gap-1 font-semibold text-accent">
                        {isOpen ? (
                          <>
                            Sembunyikan rincian <ChevronUp size={14} />
                          </>
                        ) : (
                          <>
                            Lihat rincian <ChevronDown size={14} />
                          </>
                        )}
                      </span>
                    </div>
                  </button>

                  <PdfBtn
                    type="sub"
                    itemId={sp.id}
                    has={sp.has_file}
                    status={sp.approval_status}
                  />
                </div>

                {isOpen && (
                  <div className="space-y-5 border-t border-line bg-surface-muted/30 p-4 sm:p-5">
                    <Units list={sp.units} />

                    {sp.approval_status &&
                      sp.approval_status !== "approved" && (
                        <ApprovalNotice
                          status={sp.approval_status}
                          rejectReason={sp.reject_reason}
                        />
                      )}

                    {sops.length > 0 && (
                      <div>
                        <h4 className="text-sm font-bold text-primary">
                          SOP Sub Proses
                        </h4>

                        <ul className="mt-2 divide-y divide-line">
                          {sops.map((s) => (
                            <SopRow key={s.id} s={s} />
                          ))}
                        </ul>
                      </div>
                    )}

                    {cfms.length === 0 && sops.length === 0 && (
                      <p className="text-sm text-ink-soft">
                        Belum ada CFM atau SOP untuk sub proses ini.
                      </p>
                    )}

                    {cfms.map((c) => (
                      <div
                        key={c.id}
                        className="rounded-xl border border-line bg-surface p-4"
                      >
                        <div className="flex flex-wrap items-start justify-between gap-3">
                          <div className="min-w-0 flex-1">
                            <div className="flex flex-wrap items-center gap-2">
                              <p className="text-sm font-bold text-accent">
                                {c.nomor_cfm}
                              </p>

                              {c.approval_status && (
                                <ApprovalBadge status={c.approval_status} />
                              )}
                            </div>

                            <p className="mt-1 text-sm font-medium text-primary">
                              {c.nama_cfm}
                            </p>

                            <Units list={c.units} />
                          </div>

                          <PdfBtn
                            type="cfm"
                            itemId={c.id}
                            has={c.has_file}
                            status={c.approval_status}
                          />
                        </div>

                        {c.approval_status &&
                          c.approval_status !== "approved" && (
                            <div className="mt-4">
                              <ApprovalNotice
                                status={c.approval_status}
                                rejectReason={c.reject_reason}
                              />
                            </div>
                          )}

                        {(c.sop || []).length > 0 && (
                          <ul className="mt-4 divide-y divide-line border-t border-line">
                            {c.sop.map((s) => (
                              <SopRow key={s.id} s={s} />
                            ))}
                          </ul>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </article>
            );
          })}
        </div>
      </section>

      {/* SOP LANGSUNG */}
      {sopTanpaSub.length > 0 && (
        <section className="panel p-5">
          <div className="flex items-center gap-2">
            <ShieldCheck size={19} className="text-accent" />
            <h2 className="font-bold text-primary">
              SOP Langsung di Peta Proses
            </h2>
          </div>

          <ul className="mt-4 divide-y divide-line">
            {sopTanpaSub.map((s) => (
              <SopRow key={s.id} s={s} />
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
