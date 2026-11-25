import { useSearchParams, useNavigate } from "react-router-dom";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Activity,
  ArrowRight,
  CheckCircle2,
  ClipboardCheck,
  ClipboardList,
  FileCheck2,
  FileText,
  Files,
  Layers3,
  Plus,
  RefreshCw,
  Search,
  ShieldCheck,
  Sparkles,
  Trash2,
  Upload,
  X,
  Pencil,
  Eye, ExternalLink, Link2,
} from "lucide-react";
import api, { errMsg } from "../api/client.js";
import Modal from "../components/Modal.jsx";
import { useAuth } from "../context/AuthContext.jsx";
import ManajemenSopStandar from "./ManajemenSopStandar.jsx";

const TABS = [
  { id: "peta", label: "Peta Proses", short: "Peta", icon: Layers3 },
  { id: "sub", label: "Sub Proses", short: "Sub", icon: FileText },
  { id: "cfm", label: "Cross Functional Map", short: "CFM", icon: Files },
  { id: "sop", label: "Standar Operasional Prosedur", short: "SOP", icon: FileCheck2 },
  { id: "standar", label: "Standar Pelayanan", short: "Standar", icon: ClipboardCheck },
];

const YEAR = new Date().getFullYear();

function getDocumentUnits(row) {
  const value = row?.units;
  if (Array.isArray(value)) return value.filter(Boolean);
  if (typeof value === "string") {
    return value.split("||").map((name) => name.trim()).filter(Boolean);
  }
  return [];
}

function getDocumentUnitIds(row) {
  const value = row?.unit_kerja_ids;

  if (Array.isArray(value)) {
    return value.map(Number).filter(Number.isSafeInteger);
  }

  if (typeof value === "string") {
    return value.split(",").map(Number).filter(Number.isSafeInteger);
  }

  return [];
}

const EMPTY = {
  peta_proses_id: "",
  sub_proses_id: "",
  keterangan_id: "",
  nomor_peta_proses: "",
  judul: "",
  nomor_sub_proses: "",
  nama_sub_proses: "",
  nomor_cfm: "",
  nama_cfm: "",
  tahun_terbit: String(YEAR),
  unit_kerja_ids: [],
  file: null,
};

const inputClass =
  "w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-cyan-500 focus:ring-4 focus:ring-cyan-500/10 disabled:cursor-not-allowed disabled:bg-slate-100";

const labelClass = "mb-1.5 block text-sm font-semibold text-slate-700";

const buttonSecondary =
  "inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 shadow-sm transition hover:border-slate-300 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50";

const buttonPrimary =
  "inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-slate-900 via-blue-900 to-cyan-800 px-4 py-2.5 text-sm font-semibold text-white shadow-lg shadow-blue-950/15 transition duration-200 hover:-translate-y-0.5 hover:shadow-xl disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:translate-y-0";

function getTitle(type) {
  return TABS.find((item) => item.id === type)?.label || "Dokumen";
}

function getDocumentName(row, type) {
  if (type === "peta") return row.judul || row.nomor_peta_proses;
  if (type === "sub") return row.nama_sub_proses || row.nomor_sub_proses;
  return row.nama_cfm || row.nomor_cfm;
}

function getDocumentNumber(row, type) {
  if (type === "peta") return row.nomor_peta_proses;
  if (type === "sub") return row.nomor_sub_proses;
  return row.nomor_cfm;
}

function getBase(type) {
  if (type === "peta") return "/proses/peta";
  if (type === "sub") return "/proses/sub";
  return "/proses/cfm";
}

export default function ManajemenProses() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  const isAdmin = user?.role === "admin_ortala";
  const isUnit = user?.role === "perwakilan_unit";
  const canSubmit = isAdmin || isUnit;

  const [tab, setTab] = useState(() => {
    const initial = searchParams.get("tab");
    return TABS.some((item) => item.id === initial) ? initial : "peta";
  });

  const [peta, setPeta] = useState([]);
  const [subs, setSubs] = useState([]);
  const [cfms, setCfms] = useState([]);
  const [units, setUnits] = useState([]);
  const [categories, setCategories] = useState([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [query, setQuery] = useState("");
  const [unitFilter, setUnitFilter] = useState("");
  const [form, setForm] = useState(null);
  const [formError, setFormError] = useState("");
  const [busy, setBusy] = useState(false);
  const [detail, setDetail] = useState(null);

  // Jumlah dokumen SOP dan Standar Pelayanan (dilaporkan oleh panel)
  const [extraCounts, setExtraCounts] = useState({ sop: null, standar: null });
  const handleCount = useCallback((type, count) => {
    setExtraCounts((current) =>
      current[type] === count ? current : { ...current, [type]: count }
    );
  }, []);

  // Tab SOP dan Standar Pelayanan ditangani panel terpisah
  const isExternal = tab === "sop" || tab === "standar";

  const load = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const [petaRes, unitRes, categoryRes] = await Promise.all([
        api.get("/proses"),
        api.get("/unit-kerja"),
        api.get("/keterangan"),
      ]);

      const petaRows = Array.isArray(petaRes.data) ? petaRes.data : [];

      setPeta(petaRows);
      setUnits(Array.isArray(unitRes.data) ? unitRes.data : []);
      setCategories(Array.isArray(categoryRes.data) ? categoryRes.data : []);

      // Satu detail yang gagal tidak boleh menggagalkan seluruh halaman.
      const details = await Promise.all(
        petaRows.map(async (item) => {
          try {
            const response = await api.get(`/proses/peta/${item.id}`);
            return response.data;
          } catch {
            return null;
          }
        })
      );

      const subRows = [];
      const cfmRows = [];

      details.filter(Boolean).forEach((detail) => {
        (detail.sub_proses || []).forEach((sub) => {
          subRows.push({
            ...sub,
            peta_proses_id: detail.id,
            nama_peta_proses: detail.judul,
          });

          (sub.cfm || []).forEach((cfm) => {
            cfmRows.push({
              ...cfm,
              peta_proses_id: detail.id,
              nama_peta_proses: detail.judul,
              sub_proses_id: sub.id,
              nama_sub_proses: sub.nama_sub_proses,
            });
          });
        });
      });

      setSubs(subRows);
      setCfms(cfmRows);
    } catch (e) {
      setError(errMsg(e));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  // Ambil jumlah SOP dan Standar Pelayanan otomatis saat halaman dibuka.
  // Endpoint tetap menerapkan hak akses berdasarkan pengguna yang login.
  useEffect(() => {
    if (!user) return;

    let active = true;

    const loadExtraDocumentCounts = async () => {
      const results = await Promise.allSettled([
        api.get("/sop", {
          params: { page: 1, limit: 1 },
        }),
        api.get("/standar-pelayanan"),
      ]);

      if (!active) return;

      setExtraCounts((current) => {
        const next = { ...current };

        // SOP menggunakan total dari metadata pagination.
        if (results[0].status === "fulfilled") {
          const total = results[0].value.data?.meta?.total;

          if (total !== undefined && total !== null) {
            next.sop = Number(total);
          }
        }

        // Standar Pelayanan dihitung dari data yang terlihat oleh pengguna.
        if (results[1].status === "fulfilled") {
          const rows = results[1].value.data?.data;

          if (Array.isArray(rows)) {
            next.standar = rows.length;
          }
        }

        return next;
      });
    };

    loadExtraDocumentCounts();

    return () => {
      active = false;
    };
  }, [user?.id, user?.role]);

  const rows = tab === "peta" ? peta : tab === "sub" ? subs : cfms;

  const shown = useMemo(() => {
    const q = query.trim().toLowerCase();

    return rows.filter((row) => {
      const documentUnits = getDocumentUnits(row);

      if (unitFilter && !documentUnits.includes(unitFilter)) {
        return false;
      }

      if (!q) return true;

      return [
        row.nomor_peta_proses,
        row.nomor_sub_proses,
        row.nomor_cfm,
        row.judul,
        row.nama_sub_proses,
        row.nama_cfm,
        row.nama_keterangan,
        row.nama_peta_proses,
        row.tahun_terbit,
        ...documentUnits,
      ].some((value) =>
        String(value ?? "").toLowerCase().includes(q)
      );
    });
  }, [rows, query, unitFilter]);

  const setField = (key, value) => {
    setForm((current) => ({ ...current, [key]: value }));
  };

  const openCreate = () => {
    if (!canSubmit) return;

    // SOP dan Standar Pelayanan memakai halaman unggah masing-masing
    if (tab === "sop") return navigate("/dashboard/sop/upload");
    if (tab === "standar") {
      return navigate("/dashboard/standar-pelayanan?aksi=upload");
    }

    const firstSub = subs[0];
    const firstPetaForSub = firstSub
      ? peta.find(
          (item) => String(item.id) === String(firstSub.peta_proses_id)
        )
      : null;

    const initialPeta =
      tab === "peta"
        ? ""
        : tab === "cfm"
          ? String(firstPetaForSub?.id || "")
          : String(peta[0]?.id || "");

    setForm({
      ...EMPTY,
      type: tab,
      peta_proses_id: initialPeta,
      sub_proses_id: tab === "cfm" ? String(firstSub?.id || "") : "",
      keterangan_id: String(categories[0]?.id || ""),
      unit_kerja_ids: [],
      file: null,
    });

    setFormError("");
    setNotice("");
    setError("");
  };

  const openEdit = (row) => {
    if (!isAdmin) return;

    let values;

    if (tab === "peta") {
      values = {
        keterangan_id: String(row.keterangan_id || ""),
        nomor_peta_proses: row.nomor_peta_proses || "",
        judul: row.judul || "",
        tahun_terbit: String(row.tahun_terbit || YEAR),
      };
    } else if (tab === "sub") {
      values = {
        peta_proses_id: String(row.peta_proses_id || ""),
        nomor_sub_proses: row.nomor_sub_proses || "",
        nama_sub_proses: row.nama_sub_proses || "",
        tahun_terbit: String(row.tahun_terbit || YEAR),
      };
    } else {
      values = {
        peta_proses_id: String(row.peta_proses_id || ""),
        sub_proses_id: String(row.sub_proses_id || ""),
        nomor_cfm: row.nomor_cfm || "",
        nama_cfm: row.nama_cfm || "",
        tahun_terbit: String(row.tahun_terbit || YEAR),
      };
    }

    setForm({
      ...EMPTY,
      ...values,
      id: row.id,
      type: tab,
      unit_kerja_ids: getDocumentUnitIds(row),
      file: null,
    });

    setFormError("");
    setNotice("");
    setError("");
  };

  const save = async (event) => {
    event.preventDefault();

    if (!canSubmit) return;
    if (form.id && !isAdmin) return;

    setBusy(true);
    setFormError("");
    setError("");

    try {
      const data = new FormData();

      const fields =
        form.type === "peta"
          ? ["keterangan_id", "nomor_peta_proses", "judul", "tahun_terbit"]
          : form.type === "sub"
            ? [
                "peta_proses_id",
                "nomor_sub_proses",
                "nama_sub_proses",
                "tahun_terbit",
              ]
            : [
                "peta_proses_id",
                "sub_proses_id",
                "nomor_cfm",
                "nama_cfm",
                "tahun_terbit",
              ];

      fields.forEach((key) => data.append(key, form[key] ?? ""));

      // Backend menentukan unit untuk pengajuan Unit Kerja.
      // Admin dapat mengatur unit yang terkait.
      if (isAdmin && form.unit_kerja_ids !== null) {
        data.append("unit_kerja_ids", JSON.stringify(form.unit_kerja_ids));
      }

      if (form.file) {
        data.append("file", form.file);
      }

      const base = getBase(form.type);

      if (form.id) {
        await api.patch(`${base}/${form.id}`, data);
      } else {
        await api.post(base, data);
      }

      setForm(null);

      setNotice(
        isUnit && !form.id
          ? "Pengajuan berhasil dikirim. Dokumen menunggu persetujuan Admin Ortala."
          : "Dokumen berhasil disimpan."
      );

      await load();
    } catch (e) {
      setFormError(errMsg(e));
    } finally {
      setBusy(false);
    }
  };

  const remove = async (row) => {
    if (!isAdmin) return;

    const name = getDocumentName(row, tab) || "dokumen ini";

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
      await api.delete(`${getBase(tab)}/${row.id}`);
      setNotice("Dokumen berhasil dihapus.");
      await load();
    } catch (e) {
      setError(errMsg(e));
    }
  };

  const selectedPeta = peta.find(
    (item) => String(item.id) === String(form?.peta_proses_id)
  );

  const availableSubs = subs.filter(
    (item) => String(item.peta_proses_id) === String(form?.peta_proses_id)
  );

  const totalCount = rows.length;
  const related = detail ? (() => {
    const { type, row } = detail;
    const same = (a,b) => String(a) === String(b);
    if (type === "peta") return [
      ...subs.filter(x => same(x.peta_proses_id,row.id)).map(x => ({type:"sub",row:x})),
      ...cfms.filter(x => same(x.peta_proses_id,row.id)).map(x => ({type:"cfm",row:x})),
    ];
    if (type === "sub") return [
      ...peta.filter(x => same(x.id,row.peta_proses_id)).map(x => ({type:"peta",row:x})),
      ...cfms.filter(x => same(x.sub_proses_id,row.id)).map(x => ({type:"cfm",row:x})),
    ];
    return [
      ...peta.filter(x => same(x.id,row.peta_proses_id)).map(x => ({type:"peta",row:x})),
      ...subs.filter(x => same(x.id,row.sub_proses_id)).map(x => ({type:"sub",row:x})),
    ];
  })() : [];
  const openPdf = async (type, row) => {
    try {
      const response = await api.get(`${getBase(type)}/${row.id}/file`, { responseType: "blob" });
      const url = URL.createObjectURL(new Blob([response.data], { type: "application/pdf" }));
      const viewer = window.open(url, "_blank", "noopener,noreferrer");
      if (!viewer) {
        const a = document.createElement("a"); a.href = url; a.download = `${getDocumentNumber(row,type) || "dokumen"}.pdf`; a.click();
      }
      setTimeout(() => URL.revokeObjectURL(url), 60000);
    } catch(e) { setError(errMsg(e)); setDetail(null); }
  };

  return (
    <div className="mx-auto max-w-7xl space-y-6 pb-8">
      {/* Header */}
      <section className="relative isolate overflow-hidden rounded-3xl bg-gradient-to-br from-slate-950 via-blue-950 to-cyan-900 text-white shadow-xl shadow-blue-950/10 min-h-[180px] sm:min-h-[210px] px-6 py-7 sm:px-8 sm:py-8 flex flex-col justify-center">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 z-0 bg-cover bg-center bg-no-repeat"
          style={{
            backgroundImage:
              'linear-gradient(90deg, rgba(9,42,76,.96) 0%, rgba(16,75,122,.88) 52%, rgba(23,105,170,.70) 100%), url("/img/kantor.jpg")'
          }}
        />

        <div className="pointer-events-none absolute -right-12 -top-20 -z-10 h-64 w-64 rounded-full bg-cyan-400/20 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-28 left-1/3 -z-10 h-56 w-56 rounded-full bg-blue-400/20 blur-3xl" />

        <div className="relative z-10 flex flex-col justify-between gap-6 sm:flex-row sm:items-center">
          <div className="max-w-2xl">
            <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1.5 text-xs font-semibold tracking-wide text-cyan-100 backdrop-blur">
              <Sparkles size={14} />
              SISTEM INFORMASI MANAJEMEN PROSES BISNIS
            </div>

            <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
              Manajemen Proses Bisnis
            </h1>

            <p className="mt-3 max-w-xl text-sm leading-6 text-blue-100/80 sm:text-base">
              Pusat pengelolaan dokumen Peta Proses, Sub Proses, Cross
              Functional Map, SOP, dan Standar Pelayanan dalam satu ruang
              kerja terpadu.
            </p>

            <div className="mt-5 flex flex-wrap items-center gap-3 text-xs text-blue-100/80">
              <span className="inline-flex items-center gap-1.5">
                <ShieldCheck size={15} />
                {isAdmin ? "Administrator Ortala" : isUnit ? "Pengajuan Unit Kerja" : "Katalog Dokumen"}
              </span>
              <span className="h-1 w-1 rounded-full bg-cyan-300" />
              <span className="inline-flex items-center gap-1.5">
                <Activity size={15} />
                Tahun {YEAR}
              </span>
            </div>
          </div>

          <div className="flex shrink-0 flex-wrap gap-2">
            <button
              type="button"
              className="inline-flex items-center gap-2 rounded-xl border border-white/20 bg-white/10 px-4 py-2.5 text-sm font-semibold text-white backdrop-blur transition hover:bg-white/20 disabled:opacity-50"
              onClick={load}
              disabled={loading}
            >
              <RefreshCw size={16} className={loading ? "animate-spin" : ""} />
              Perbarui
            </button>

            {canSubmit && (
              <button
                type="button"
                className="inline-flex items-center gap-2 rounded-xl bg-white px-4 py-2.5 text-sm font-bold text-slate-900 shadow-lg transition hover:-translate-y-0.5 hover:bg-cyan-50"
                onClick={openCreate}
              >
                <Plus size={17} />
                Ajukan Dokumen
              </button>
            )}
          </div>
        </div>
      </section>

      {/* Statistics */}
      <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
        {TABS.map((item, index) => {
          const Icon = item.icon;
          const count =
            item.id === "peta"
              ? peta.length
              : item.id === "sub"
                ? subs.length
                : item.id === "cfm"
                  ? cfms.length
                  : extraCounts[item.id];

          return (
            <button
              type="button"
              key={item.id}
              onClick={() => {
                setTab(item.id);
                setQuery("");
                setUnitFilter("");
                setError("");
                setNotice("");
              }}
              className={`group relative overflow-hidden rounded-2xl border p-5 text-left transition duration-200 hover:-translate-y-0.5 hover:shadow-lg ${
                tab === item.id
                  ? "border-cyan-300 bg-gradient-to-br from-cyan-50 to-white shadow-md shadow-cyan-900/5"
                  : "border-slate-200 bg-white hover:border-slate-300"
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                <div
                  className={`flex h-11 w-11 items-center justify-center rounded-xl transition ${
                    tab === item.id
                      ? "bg-gradient-to-br from-blue-900 to-cyan-700 text-white shadow-md"
                      : "bg-slate-100 text-slate-600 group-hover:bg-cyan-50 group-hover:text-cyan-800"
                  }`}
                >
                  <Icon size={21} />
                </div>
                <span className="rounded-lg bg-slate-100 px-2.5 py-1 text-xs font-bold text-slate-600">
                  0{index + 1}
                </span>
              </div>

              <div className="mt-4 flex items-end justify-between gap-3">
                <div>
                  <p className="text-sm font-medium text-slate-500">
                    {item.short === "SOP" ? "SOP" : item.label}
                  </p>
                  <p className="mt-1 text-3xl font-bold tracking-tight text-slate-900">
                    {loading || count == null ? "—" : count}
                  </p>
                  <p className="mt-1 text-xs text-slate-400">
                    Dokumen dalam katalog
                  </p>
                </div>
                <ArrowRight
                  size={18}
                  className={`mb-1 transition ${
                    tab === item.id
                      ? "translate-x-0 text-cyan-700"
                      : "-translate-x-1 text-slate-300 group-hover:translate-x-0 group-hover:text-cyan-700"
                  }`}
                />
              </div>
            </button>
          );
        })}
      </section>

      {/* Messages (tab Peta, Sub, CFM) */}
      {!isExternal && error && (
        <div
          role="alert"
          className="flex items-start gap-3 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-800"
        >
          <X size={18} className="mt-0.5 shrink-0" />
          <div className="min-w-0 flex-1">{error}</div>
          <button
            type="button"
            className="text-red-700 underline"
            onClick={load}
          >
            Coba lagi
          </button>
        </div>
      )}

      {!isExternal && notice && (
        <div
          role="status"
          className="flex items-start gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800"
        >
          <CheckCircle2 size={19} className="mt-0.5 shrink-0" />
          <p>{notice}</p>
        </div>
      )}

      {isUnit && !isExternal && (
        <div className="flex items-start gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm leading-6 text-amber-900">
          <ClipboardList size={19} className="mt-0.5 shrink-0" />
          <p>
            Dokumen yang diajukan akan menunggu persetujuan Admin Ortala.
            Katalog di bawah menampilkan dokumen yang sudah tersedia dan
            disetujui. Pembuatan Sub Proses atau CFM memerlukan Peta Proses
            induk yang sudah disetujui.
          </p>
        </div>
      )}

      {/* Panel SOP dan Standar Pelayanan */}
      {isExternal && (
        <ManajemenSopStandar
          key={tab}
          type={tab}
          isAdmin={isAdmin}
          units={units}
          onCount={handleCount}
        />
      )}

      {/* Document list (Peta, Sub, CFM) */}
      {!isExternal && (
      <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">

        {/* Header daftar dokumen */}
        <div className="relative flex min-h-[180px] flex-col justify-center overflow-hidden px-6 py-7 text-white sm:min-h-[210px] sm:px-8 sm:py-8">
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 bg-cover bg-center bg-no-repeat"
            style={{
              backgroundImage:
                'linear-gradient(90deg, rgba(9,42,76,.96) 0%, rgba(16,75,122,.88) 52%, rgba(23,105,170,.70) 100%), url("/img/kantor.jpg")'
            }}
          />

          <div className="relative z-10">
            <p className="text-xs font-bold uppercase tracking-widest text-cyan-100">
              Administrasi Dokumen
            </p>

            <h2 className="mt-2 text-2xl font-extrabold tracking-tight sm:text-3xl">
              {getTitle(tab)}
            </h2>

            <p className="mt-3 max-w-xl text-sm leading-6 text-blue-100">
              {isAdmin
                ? "Kelola dokumen dan lakukan perubahan administrasi."
                : isUnit
                  ? "Telusuri dokumen yang tersedia atau ajukan dokumen baru."
                  : "Telusuri dokumen proses bisnis yang telah disetujui."}
            </p>
          </div>
        </div>

        {/* Filter dan navigasi dokumen */}
        <div className="border-b border-slate-100 p-5 sm:p-6">
          <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-center">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
              <select
                className={`${inputClass} sm:w-52`}
                value={unitFilter}
                onChange={(event) => setUnitFilter(event.target.value)}
                aria-label="Filter berdasarkan unit kerja"
              >
                <option value="">Semua Unit Kerja</option>
                {units.map((unit) => (
                  <option key={unit.id} value={unit.nama_unit}>
                    {unit.nama_unit}
                  </option>
                ))}
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
                  onChange={(event) => setQuery(event.target.value)}
                  aria-label="Cari dokumen proses bisnis"
                />
              </div>

              <div className="whitespace-nowrap rounded-xl bg-slate-100 px-3.5 py-2.5 text-sm text-slate-600">
                <span className="font-bold text-slate-900">{shown.length}</span>{" "}
                dari {totalCount} dokumen
              </div>
            </div>
          </div>

          <div className="mt-5 flex gap-1 overflow-x-auto rounded-xl bg-slate-100/80 p-1">
            {TABS.map((item) => {
              const Icon = item.icon;

              return (
                <button
                  type="button"
                  key={item.id}
                  onClick={() => {
                    setTab(item.id);
                    setQuery("");
                    setUnitFilter("");
                    setError("");
                    setNotice("");
                  }}
                  className={`inline-flex shrink-0 items-center justify-center gap-2 rounded-lg px-3.5 py-2.5 text-sm font-semibold transition sm:flex-1 ${
                    tab === item.id
                      ? "bg-white text-blue-950 shadow-sm ring-1 ring-slate-200/70"
                      : "text-slate-500 hover:text-slate-900"
                  }`}
                >
                  <Icon size={16} />
                  {item.short}
                </button>
              );
            })}
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px] text-left text-sm">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50/80 text-xs uppercase tracking-wider text-slate-500">
                <th className="px-5 py-4 font-bold">Nomor</th>
                <th className="px-5 py-4 font-bold">Nama / Judul</th>
                {tab !== "peta" && (
                  <th className="px-5 py-4 font-bold">Peta Proses</th>
                )}
                {tab === "cfm" && (
                  <th className="px-5 py-4 font-bold">Sub Proses</th>
                )}
                <th className="px-5 py-4 font-bold">Unit Kerja Terkait</th>
                <th className="px-5 py-4 font-bold">Tahun</th>
                <th className="px-5 py-4 font-bold">Dokumen</th>
                <th className="px-5 py-4 text-right font-bold">Aksi</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-100">
              {loading && (
                <tr>
                  <td
                    colSpan={
                      tab === "cfm" ? 8 : tab === "sub" ? 7 : 6
                    }
                    className="px-5 py-16 text-center"
                  >
                    <div className="flex flex-col items-center gap-3 text-slate-500">
                      <RefreshCw
                        size={24}
                        className="animate-spin text-cyan-700"
                      />
                      <span>Memuat katalog dokumen...</span>
                    </div>
                  </td>
                </tr>
              )}

              {!loading && shown.length === 0 && (
                <tr>
                  <td
                    colSpan={
                      tab === "cfm" ? 8 : tab === "sub" ? 7 : 6
                    }
                    className="px-5 py-16 text-center"
                  >
                    <div className="mx-auto flex max-w-sm flex-col items-center">
                      <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100 text-slate-400">
                        <FileCheck2 size={26} />
                      </div>
                      <p className="mt-4 font-semibold text-slate-800">
                        {query ? "Dokumen tidak ditemukan" : "Belum ada dokumen"}
                      </p>
                      <p className="mt-1 text-sm text-slate-500">
                        {query
                          ? "Coba gunakan kata kunci atau nomor dokumen lain."
                          : "Dokumen yang tersedia akan ditampilkan di sini."}
                      </p>
                      {query && (
                        <button
                          type="button"
                          className="mt-3 text-sm font-semibold text-cyan-800 hover:underline"
                          onClick={() => setQuery("")}
                        >
                          Hapus pencarian
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              )}

              {!loading &&
                shown.map((row) => {
                  const nomor = getDocumentNumber(row, tab);
                  const name = getDocumentName(row, tab);

                  return (
                    <tr
                      key={row.id}
                      className="group transition-colors hover:bg-cyan-50/30"
                    >
                      <td className="px-5 py-4 align-top">
                        <span className="inline-flex rounded-lg border border-blue-100 bg-blue-50 px-2.5 py-1.5 font-semibold text-blue-900">
                          {nomor || "—"}
                        </span>
                      </td>

                      <td className="px-5 py-4 align-top">
                        <p className="font-semibold leading-5 text-slate-800">
                          {name || "—"}
                        </p>
                        {tab === "peta" && (
                          <p className="mt-1.5 text-xs text-slate-500">
                            {row.nama_keterangan || "Tanpa kategori"}
                          </p>
                        )}
                      </td>

                      {tab !== "peta" && (
                        <td className="px-5 py-4 align-top text-slate-600">
                          {row.nama_peta_proses || "—"}
                        </td>
                      )}

                      {tab === "cfm" && (
                        <td className="px-5 py-4 align-top text-slate-600">
                          {row.nama_sub_proses || "—"}
                        </td>
                      )}

                      <td className="px-5 py-4 align-top">
                        {getDocumentUnits(row).length ? (
                          <div className="flex max-w-64 flex-wrap gap-1.5">
                            {getDocumentUnits(row).slice(0, 2).map((name) => (
                              <span
                                key={name}
                                title={name}
                                className="rounded-lg border border-cyan-100 bg-cyan-50 px-2 py-1 text-xs font-semibold text-cyan-900"
                              >
                                {name}
                              </span>
                            ))}
                            {getDocumentUnits(row).length > 2 && (
                              <span
                                title={getDocumentUnits(row).slice(2).join(", ")}
                                className="rounded-lg bg-slate-100 px-2 py-1 text-xs font-semibold text-slate-600"
                              >
                                +{getDocumentUnits(row).length - 2} lainnya
                              </span>
                            )}
                          </div>
                        ) : (
                          <span className="text-xs italic text-slate-400">
                            Belum ditetapkan
                          </span>
                        )}
                      </td>

                      <td className="px-5 py-4 align-top text-slate-600">
                        {row.tahun_terbit || "—"}
                      </td>

                      <td className="px-5 py-4 align-top">
                        {row.has_file ? (
                          <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-100 bg-emerald-50 px-2.5 py-1.5 text-xs font-semibold text-emerald-700">
                            <CheckCircle2 size={13} />
                            PDF tersedia
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-2.5 py-1.5 text-xs font-medium text-slate-500">
                            Belum ada PDF
                          </span>
                        )}
                      </td>

                      <td className="px-5 py-4 text-right align-top">
                          <div className="inline-flex items-center gap-1">
                            <button type="button" title="Lihat detail dan dokumen terkait" aria-label={`Detail ${name || nomor}`} className="inline-flex items-center gap-1 rounded-lg px-2 py-2 text-xs font-bold text-cyan-800 hover:bg-cyan-50" onClick={() => setDetail({type:tab,row})}><Eye size={16}/> Detail</button>
                            {isAdmin && <>
                            <button
                              type="button"
                              title="Ubah dokumen"
                              aria-label={`Ubah ${name || nomor}`}
                              className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-slate-500 transition hover:bg-blue-50 hover:text-blue-800"
                              onClick={() => openEdit(row)}
                            >
                              <Pencil size={16} />
                            </button>
                            <button
                              type="button"
                              title="Hapus dokumen"
                              aria-label={`Hapus ${name || nomor}`}
                              className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-slate-500 transition hover:bg-red-50 hover:text-red-700"
                              onClick={() => remove(row)}
                            >
                              <Trash2 size={16} />
                            </button>
                            </>}
                          </div>
                        </td>
                    </tr>
                  );
                })}
            </tbody>
          </table>
        </div>

        <div className="flex flex-col gap-2 border-t border-slate-100 bg-slate-50/60 px-5 py-3 text-xs text-slate-500 sm:flex-row sm:items-center sm:justify-between">
          <span className="inline-flex items-center gap-1.5">
            <ShieldCheck size={14} className="text-cyan-800" />
            Akses dan perubahan dokumen mengikuti peran pengguna.
          </span>
          <span>Katalog Proses Bisnis · SIMPB BAPETEN</span>
        </div>
      </section>
      )}

      {detail && (
        <Modal title={`Detail ${getTitle(detail.type)}`} onClose={() => setDetail(null)}>
          <div className="max-h-[75vh] space-y-5 overflow-y-auto pr-1 text-sm text-slate-700">
            <div className="rounded-2xl bg-gradient-to-br from-slate-950 to-cyan-900 p-5 text-white">
              <p className="text-xs font-bold uppercase tracking-widest text-cyan-200">{getTitle(detail.type)}</p>
              <h3 className="mt-2 text-xl font-bold">{getDocumentName(detail.row,detail.type) || "—"}</h3>
              <p className="mt-2 text-sm text-cyan-100">{getDocumentNumber(detail.row,detail.type) || "Tanpa nomor"}</p>
            </div>
            <dl className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {[["Nomor",getDocumentNumber(detail.row,detail.type)],["Tahun terbit",detail.row.tahun_terbit],["Kategori",detail.row.nama_keterangan],["Peta Proses",detail.row.nama_peta_proses],["Sub Proses",detail.type === "cfm" ? detail.row.nama_sub_proses : null],["Status",detail.row.approval_status]].filter(([,v]) => v !== null && v !== undefined && v !== "").map(([k,v]) => <div key={k} className="rounded-xl border border-slate-200 p-3"><dt className="text-xs font-medium text-slate-500">{k}</dt><dd className="mt-1 font-semibold text-slate-900">{v}</dd></div>)}
            </dl>
            <section className="rounded-2xl border border-cyan-100 bg-cyan-50/50 p-4">
              <h4 className="font-bold text-slate-900">
                Unit Kerja Terkait
              </h4>
              <p className="mt-1 text-xs text-slate-500">
                Berdasarkan relasi unit kerja pada dokumen, bukan akun pengunggah.
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                {getDocumentUnits(detail.row).length ? (
                  getDocumentUnits(detail.row).map((name) => (
                    <span
                      key={name}
                      className="rounded-lg border border-cyan-200 bg-white px-3 py-2 text-xs font-semibold text-cyan-900"
                    >
                      {name}
                    </span>
                  ))
                ) : (
                  <span className="text-sm italic text-slate-500">
                    Belum ada unit kerja yang ditetapkan.
                  </span>
                )}
              </div>
            </section>

            {detail.row.has_file ? <button type="button" className={buttonPrimary} onClick={() => openPdf(detail.type,detail.row)}><ExternalLink size={16}/> Lihat PDF</button> : <p className="rounded-xl bg-slate-100 p-3 text-slate-500">PDF belum tersedia.</p>}
            <div className="border-t border-slate-200 pt-4">
              <h4 className="flex items-center gap-2 font-bold text-slate-900"><Link2 size={17}/> Dokumen Terkait ({related.length})</h4>
              <p className="mt-1 text-xs text-slate-500">Hubungan dokumen berdasarkan Peta Proses dan Sub Proses induk.</p>
              <div className="mt-3 space-y-2">{related.length ? related.map(item => <button key={`${item.type}-${item.row.id}`} type="button" onClick={() => setDetail(item)} className="flex w-full items-center justify-between gap-3 rounded-xl border border-slate-200 p-3 text-left transition hover:border-cyan-300 hover:bg-cyan-50"><span><span className="block text-xs font-bold text-cyan-800">{getTitle(item.type)} · {getDocumentNumber(item.row,item.type)}</span><span className="mt-1 block font-semibold text-slate-800">{getDocumentName(item.row,item.type)}</span></span><ArrowRight size={17}/></button>) : <p className="rounded-xl bg-slate-50 p-4 text-slate-500">Belum ada dokumen terkait dalam katalog.</p>}</div>
            </div>
          </div>
        </Modal>
      )}
      {/* Form modal */}
      {form && (
        <Modal
          title={`${form.id ? "Ubah" : "Ajukan"} ${getTitle(form.type)}`}
          onClose={() => !busy && setForm(null)}
        >
          <form
            onSubmit={save}
            className="max-h-[75vh] space-y-4 overflow-y-auto pr-1"
          >
            <div className="rounded-xl border border-cyan-100 bg-gradient-to-r from-cyan-50 to-blue-50 p-3.5">
              <div className="flex items-start gap-3">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-white text-cyan-800 shadow-sm">
                  {form.id ? <Pencil size={17} /> : <Upload size={17} />}
                </div>
                <div>
                  <p className="text-sm font-bold text-slate-800">
                    {form.id ? "Perubahan dokumen" : "Formulir pengajuan dokumen"}
                  </p>
                  <p className="mt-1 text-xs leading-5 text-slate-600">
                    {isUnit && !form.id
                      ? "Lengkapi informasi dan unggah PDF. Pengajuan akan diperiksa Admin Ortala."
                      : isAdmin
                        ? "Periksa kembali informasi sebelum menyimpan perubahan."
                        : "Lengkapi informasi dokumen dengan benar."}
                  </p>
                </div>
              </div>
            </div>

            {formError && (
              <div
                role="alert"
                className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm leading-5 text-red-800"
              >
                {formError}
              </div>
            )}

            {form.type === "peta" && (
              <>
                <div>
                  <label className={labelClass}>Kategori *</label>
                  <select
                    className={inputClass}
                    required
                    value={form.keterangan_id}
                    onChange={(event) =>
                      setField("keterangan_id", event.target.value)
                    }
                  >
                    <option value="">Pilih kategori</option>
                    {categories.map((item) => (
                      <option key={item.id} value={item.id}>
                        {item.nama_keterangan}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className={labelClass}>Nomor Peta Proses *</label>
                  <input
                    className={inputClass}
                    required
                    maxLength={100}
                    placeholder="Contoh: PP-01"
                    value={form.nomor_peta_proses}
                    onChange={(event) =>
                      setField("nomor_peta_proses", event.target.value)
                    }
                  />
                </div>

                <div>
                  <label className={labelClass}>Judul Peta Proses *</label>
                  <input
                    className={inputClass}
                    required
                    maxLength={255}
                    placeholder="Masukkan judul Peta Proses"
                    value={form.judul}
                    onChange={(event) => setField("judul", event.target.value)}
                  />
                </div>
              </>
            )}

            {form.type === "sub" && (
              <>
                <div>
                  <label className={labelClass}>Peta Proses Induk *</label>
                  <select
                    className={inputClass}
                    required
                    value={form.peta_proses_id}
                    onChange={(event) =>
                      setField("peta_proses_id", event.target.value)
                    }
                  >
                    <option value="">Pilih Peta Proses</option>
                    {peta.map((item) => (
                      <option key={item.id} value={item.id}>
                        {item.nomor_peta_proses} — {item.judul}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className={labelClass}>Nomor Sub Proses *</label>
                  <input
                    className={inputClass}
                    required
                    maxLength={100}
                    placeholder="Masukkan nomor Sub Proses"
                    value={form.nomor_sub_proses}
                    onChange={(event) =>
                      setField("nomor_sub_proses", event.target.value)
                    }
                  />
                </div>

                <div>
                  <label className={labelClass}>Nama Sub Proses *</label>
                  <input
                    className={inputClass}
                    required
                    maxLength={255}
                    placeholder="Masukkan nama Sub Proses"
                    value={form.nama_sub_proses}
                    onChange={(event) =>
                      setField("nama_sub_proses", event.target.value)
                    }
                  />
                </div>
              </>
            )}

            {form.type === "cfm" && (
              <>
                <div>
                  <label className={labelClass}>Peta Proses Induk *</label>
                  <select
                    className={inputClass}
                    required
                    value={form.peta_proses_id}
                    onChange={(event) => {
                      const nextPeta = event.target.value;
                      const nextSub = subs.find(
                        (item) =>
                          String(item.peta_proses_id) === String(nextPeta)
                      );

                      setForm((current) => ({
                        ...current,
                        peta_proses_id: nextPeta,
                        sub_proses_id: String(nextSub?.id || ""),
                      }));
                    }}
                  >
                    <option value="">Pilih Peta Proses</option>
                    {peta.map((item) => (
                      <option key={item.id} value={item.id}>
                        {item.nomor_peta_proses} — {item.judul}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className={labelClass}>Sub Proses Induk *</label>
                  <select
                    className={inputClass}
                    required
                    value={form.sub_proses_id}
                    onChange={(event) =>
                      setField("sub_proses_id", event.target.value)
                    }
                  >
                    <option value="">Pilih Sub Proses</option>
                    {availableSubs.map((item) => (
                      <option key={item.id} value={item.id}>
                        {item.nomor_sub_proses} — {item.nama_sub_proses}
                      </option>
                    ))}
                  </select>

                  {selectedPeta && availableSubs.length === 0 && (
                    <p className="mt-2 rounded-lg bg-amber-50 px-3 py-2 text-xs leading-5 text-amber-800">
                      Peta Proses ini belum memiliki Sub Proses yang tersedia
                      dan disetujui.
                    </p>
                  )}
                </div>

                <div>
                  <label className={labelClass}>Nomor CFM *</label>
                  <input
                    className={inputClass}
                    required
                    maxLength={100}
                    placeholder="Masukkan nomor CFM"
                    value={form.nomor_cfm}
                    onChange={(event) =>
                      setField("nomor_cfm", event.target.value)
                    }
                  />
                </div>

                <div>
                  <label className={labelClass}>Nama CFM *</label>
                  <input
                    className={inputClass}
                    required
                    maxLength={255}
                    placeholder="Masukkan nama CFM"
                    value={form.nama_cfm}
                    onChange={(event) =>
                      setField("nama_cfm", event.target.value)
                    }
                  />
                </div>
              </>
            )}

            <div>
              <label className={labelClass}>Tahun Terbit *</label>
              <input
                className={inputClass}
                type="number"
                min="1901"
                max="2155"
                required
                value={form.tahun_terbit}
                onChange={(event) =>
                  setField("tahun_terbit", event.target.value)
                }
              />
            </div>

            {isAdmin && (
              <fieldset className="rounded-xl border border-slate-200 p-4">
                <legend className="px-1 text-sm font-bold text-slate-800">
                  Unit Kerja Terkait
                </legend>
                <p className="mb-3 text-xs leading-5 text-slate-500">
                  Pilih unit yang terkait dengan dokumen. Pengaturan ini hanya
                  tersedia untuk Admin Ortala.
                </p>

                <div className="max-h-40 space-y-2 overflow-y-auto">
                  {units.map((unit) => (
                    <label
                      key={unit.id}
                      className="flex cursor-pointer items-center gap-3 rounded-lg px-2 py-2 text-sm text-slate-700 transition hover:bg-slate-50"
                    >
                      <input
                        type="checkbox"
                        className="h-4 w-4 accent-cyan-700"
                        checked={form.unit_kerja_ids.includes(Number(unit.id))}
                        onChange={(event) => {
                          const id = Number(unit.id);
                          const current = form.unit_kerja_ids;

                          setField(
                            "unit_kerja_ids",
                            event.target.checked
                              ? [...current, id]
                              : current.filter((value) => value !== id)
                          );
                        }}
                      />
                      <span>{unit.nama_unit}</span>
                    </label>
                  ))}

                  {units.length === 0 && (
                    <p className="text-sm text-slate-500">
                      Data unit kerja belum tersedia.
                    </p>
                  )}
                </div>
              </fieldset>
            )}

            {isUnit && !form.id && (
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-3.5">
                <p className="text-sm font-semibold text-slate-800">
                  Unit Kerja Pengaju
                </p>
                <p className="mt-1 text-xs leading-5 text-slate-500">
                  Unit kerja akan ditentukan oleh server berdasarkan akun yang
                  sedang digunakan.
                </p>
              </div>
            )}

            <div>
              <label className={labelClass}>
                Dokumen PDF {form.type === "peta" && !form.id ? "*" : ""}
              </label>
              <input
                className={inputClass}
                type="file"
                accept=".pdf,application/pdf"
                required={form.type === "peta" && !form.id}
                onChange={(event) =>
                  setField("file", event.target.files?.[0] || null)
                }
              />
              <p className="mt-1.5 text-xs leading-5 text-slate-500">
                Format PDF. Batas ukuran mengikuti konfigurasi unggah pada
                server. Pada pengajuan Peta Proses, PDF wajib disertakan.
              </p>
            </div>

            <div className="sticky bottom-0 flex flex-col-reverse gap-2 border-t border-slate-100 bg-white pt-4 sm:flex-row sm:justify-end">
              <button
                type="button"
                className={buttonSecondary}
                disabled={busy}
                onClick={() => setForm(null)}
              >
                Batal
              </button>

              <button
                type="submit"
                className={buttonPrimary}
                disabled={
                  busy ||
                  (form.type === "cfm" && availableSubs.length === 0) ||
                  (form.id && !isAdmin)
                }
              >
                {busy ? (
                  <>
                    <RefreshCw size={16} className="animate-spin" />
                    Menyimpan...
                  </>
                ) : (
                  <>
                    {form.id ? (
                      <CheckCircle2 size={16} />
                    ) : (
                      <Upload size={16} />
                    )}
                    {form.id ? "Simpan Perubahan" : "Kirim Pengajuan"}
                  </>
                )}
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}
