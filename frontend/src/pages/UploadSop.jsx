import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  AlertCircle,
  ArrowLeft,
  Building2,
  CheckCircle2,
  FileText,
  FileUp,
  Landmark,
  Layers3,
  Loader2,
  Save,
  ShieldCheck,
  UploadCloud,
  X,
} from "lucide-react";

import api, { errMsg } from "../api/client.js";
import { useAuth } from "../context/AuthContext.jsx";
import MultiRelasiSop from "../components/MultiRelasiSop.jsx";

const INITIAL = {
  jenis_sop: "unit_kerja",
  unit_kerja_id: "",
  lembaga_id: "",
  nomor_sop: "",
  nama_sop: "",
  tahun_terbit: new Date().getFullYear(),
  peta_proses_id: "",
  catatan: "",
};

const MAX_SIZE = 20 * 1024 * 1024;

const inputClass =
  "w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 disabled:bg-slate-100";

const labelClass =
  "mb-2 block text-sm font-semibold text-slate-700";

const primaryButton =
  "inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-slate-900 via-blue-900 to-cyan-800 px-5 py-3 text-sm font-bold text-white shadow-lg shadow-blue-950/15 transition duration-200 hover:-translate-y-0.5 hover:shadow-xl disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:translate-y-0";

function Field({ label, required = false, hint, children }) {
  return (
    <div>
      <label className={labelClass}>
        {label}
        {required && <span className="ml-1 text-red-500">*</span>}
        {!required && (
          <span className="ml-1 font-normal text-slate-400">
            (opsional)
          </span>
        )}
      </label>

      {children}

      {hint && (
        <p className="mt-2 text-xs leading-5 text-slate-400">
          {hint}
        </p>
      )}
    </div>
  );
}

export default function UploadSop() {
  const navigate = useNavigate();
  const { user } = useAuth();

  const isAdmin = user?.role === "admin_ortala";

  const fileRef = useRef(null);

  const [form, setForm] = useState({ ...INITIAL });
  const [file, setFile] = useState(null);
  const [dragging, setDragging] = useState(false);

  const [units, setUnits] = useState([]);
  const [lembaga, setLembaga] = useState([]);
  const [peta, setPeta] = useState([]);
  const [katalog, setKatalog] = useState({peta:[],sub:[],cfm:[]});
  const [related, setRelated] = useState([]);

  const [loadingOptions, setLoadingOptions] = useState(true);
  const [optionsError, setOptionsError] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let active = true;

    async function loadOptions() {
      setLoadingOptions(true);
      setOptionsError("");

      try {
        const [unitResponse, lembagaResponse, petaResponse, katalogResponse] =
          await Promise.all([
            api.get("/unit-kerja"),
            api.get("/lembaga"),
            api.get("/peta-proses"),
            api.get("/proses/katalog?scope=sop") /* SIMPB_SOP_UNIT_SCOPE_V1 */,
          ]);

        if (!active) return;

        setUnits(
          Array.isArray(unitResponse.data)
            ? unitResponse.data
            : unitResponse.data?.data || []
        );

        setLembaga(
          Array.isArray(lembagaResponse.data)
            ? lembagaResponse.data
            : lembagaResponse.data?.data || []
        );

        setKatalog(katalogResponse.data || {peta:[],sub:[],cfm:[]});
        setPeta(
          Array.isArray(petaResponse.data)
            ? petaResponse.data
            : petaResponse.data?.data || []
        );
      } catch (err) {
        if (active) {
          setOptionsError(
            `Gagal memuat data pilihan: ${errMsg(err)}`
          );
        }
      } finally {
        if (active) setLoadingOptions(false);
      }
    }

    loadOptions();

    return () => {
      active = false;
    };
  }, []);

  const set = (key) => (event) => {
    setForm((current) => ({
      ...current,
      [key]: event.target.value,
    }));
  };

  const changeType = (type) => {
    setForm((current) => ({
      ...current,
      jenis_sop: type,
      unit_kerja_id: "",
      lembaga_id: "",
    }));
  };

  const myUnit = units.find(
    (unit) => String(unit.id) === String(user?.unit_kerja_id)
  );

  const validateFile = (selected) => {
    if (!selected) return;

    const isPdf =
      selected.type === "application/pdf" ||
      selected.name.toLowerCase().endsWith(".pdf");

    if (!isPdf) {
      setError("File harus berformat PDF.");
      setFile(null);
      if (fileRef.current) fileRef.current.value = "";
      return;
    }

    if (selected.size > MAX_SIZE) {
      setError("Ukuran file maksimal 20 MB.");
      setFile(null);
      if (fileRef.current) fileRef.current.value = "";
      return;
    }

    setError("");
    setFile(selected);
  };

  const pickFile = (event) => {
    validateFile(event.target.files?.[0]);
  };

  const removeFile = () => {
    setFile(null);
    if (fileRef.current) fileRef.current.value = "";
  };

  const submit = async (event) => {
    event.preventDefault();
    setError("");

    if (!file) {
      setError("Pilih file PDF SOP terlebih dahulu.");
      return;
    }

    if (loadingOptions || optionsError) {
      setError("Data pilihan belum berhasil dimuat.");
      return;
    }

    if (
      isAdmin &&
      form.jenis_sop === "unit_kerja" &&
      !form.unit_kerja_id
    ) {
      setError("Pilih unit kerja terlebih dahulu.");
      return;
    }

    if (
      isAdmin &&
      form.jenis_sop === "lembaga" &&
      !form.lembaga_id
    ) {
      setError("Pilih lembaga terlebih dahulu.");
      return;
    }

    const fd = new FormData();

    Object.entries(form).forEach(([key, value]) => {
      if (value !== "" && value !== null && value !== undefined) {
        fd.append(key, value);
      }
    });

    fd.append("dokumen_terkait", JSON.stringify(related));
    fd.append("file", file);

    setBusy(true);

    try {
      const { data } = await api.post("/sop", fd);

      navigate("/dashboard/sop", {
        state: {
          flash: data.approval_status,
        },
      });
    } catch (err) {
      setError(errMsg(err));
      window.scrollTo({ top: 0, behavior: "smooth" });
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="mx-auto max-w-7xl space-y-6 pb-12">
      {/* HEADER */}
      <section className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-slate-900 via-blue-900 to-cyan-800 text-white shadow-lg min-h-[180px] sm:min-h-[210px] px-6 py-7 sm:px-8 sm:py-8 flex flex-col justify-center">
        {/* Background foto kantor */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 z-0 bg-cover bg-center bg-no-repeat"
          style={{
            backgroundImage:
              'linear-gradient(90deg, rgba(9,42,76,.96) 0%, rgba(16,75,122,.88) 52%, rgba(23,105,170,.70) 100%), url("/img/kantor.jpg")'
          }}
        />

        <div className="pointer-events-none absolute -right-16 -top-20 h-64 w-64 rounded-full bg-cyan-300/10 blur-3xl" />

        <div className="relative z-10 flex flex-wrap items-start justify-between gap-5">
          <div className="flex items-start gap-4">
            <div className="grid h-14 w-14 shrink-0 place-items-center rounded-2xl border border-white/20 bg-white/10 shadow-inner">
              <FileUp size={27} />
            </div>

            <div>
              <p className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.16em] text-blue-100">
                <ShieldCheck size={15} />
                Administrasi Dokumen
              </p>

              <h1 className="mt-2 text-2xl font-extrabold tracking-tight sm:text-3xl">
                Upload SOP
              </h1>

              <p className="mt-3 max-w-xl text-sm leading-6 text-slate-200">
                {isAdmin
                  ? "SOP yang Anda unggah langsung berstatus disetujui."
                  : "Lengkapi informasi SOP dan unggah PDF. Dokumen akan dikirim kepada Admin Ortala untuk diperiksa dan disetujui."}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => navigate("/dashboard/sop")}
            disabled={busy}
            className="inline-flex items-center gap-2 rounded-xl border border-white/20 bg-white/10 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-white/20 disabled:opacity-50"
          >
            <ArrowLeft size={17} />
            Kembali ke Daftar
          </button>
        </div>
      </section>

      {/* INFORMASI */}
      <div className="flex items-start gap-3 rounded-2xl border border-blue-100 bg-blue-50 p-4">
        <CheckCircle2
          size={20}
          className="mt-0.5 shrink-0 text-blue-700"
        />

        <div>
          <p className="text-sm font-bold text-blue-950">
            {isAdmin
              ? "Pengunggahan oleh Admin Ortala"
              : "Pengajuan SOP Unit Kerja"}
          </p>

          <p className="mt-1 text-sm leading-6 text-blue-800">
            {isAdmin
              ? "Pastikan informasi dan file PDF sudah benar sebelum disimpan. Dokumen akan langsung disetujui sesuai aturan sistem."
              : "Setelah dikirim, SOP akan menunggu keputusan Admin Ortala sebelum tersedia bagi pengguna lain."}
          </p>
        </div>
      </div>

      {/* FORM */}
      <form
        onSubmit={submit}
        className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm"
      >
        <div className="border-b border-slate-100 p-5 sm:p-7">
          <div className="flex items-center gap-3">
            <div className="grid h-11 w-11 place-items-center rounded-xl bg-blue-50 text-blue-800">
              <FileText size={22} />
            </div>

            <div>
              <h2 className="text-lg font-bold text-slate-900">
                Informasi SOP
              </h2>
              <p className="mt-1 text-sm text-slate-500">
                Lengkapi data dokumen pada formulir berikut.
              </p>
            </div>
          </div>
        </div>

        <div className="space-y-7 p-5 sm:p-7">
          {error && (
            <div
              role="alert"
              className="flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800"
            >
              <AlertCircle size={19} className="shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {optionsError && (
            <div
              role="alert"
              className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800"
            >
              {optionsError}
              <p className="mt-1">
                Muat ulang halaman sebelum menyimpan dokumen.
              </p>
            </div>
          )}

          {/* JENIS SOP */}
          {isAdmin ? (
            <fieldset>
              <legend className={labelClass}>
                Jenis SOP <span className="text-red-500">*</span>
              </legend>

              <div className="grid gap-3 sm:grid-cols-2">
                {[
                  {
                    value: "unit_kerja",
                    title: "SOP Unit Kerja",
                    subtitle: "Dokumen untuk unit kerja",
                    icon: Building2,
                  },
                  {
                    value: "lembaga",
                    title: "SOP Lembaga",
                    subtitle: "Dokumen tingkat lembaga",
                    icon: Landmark,
                  },
                ].map((item) => {
                  const Icon = item.icon;
                  const selected = form.jenis_sop === item.value;

                  return (
                    <label
                      key={item.value}
                      className={`flex cursor-pointer items-center gap-4 rounded-2xl border p-4 transition-all duration-200 ${
                        selected
                          ? "border-blue-500 bg-blue-50 shadow-sm ring-2 ring-blue-500/10"
                          : "border-slate-200 bg-white hover:border-blue-200 hover:bg-slate-50"
                      }`}
                    >
                      <input
                        type="radio"
                        name="jenis_sop"
                        value={item.value}
                        checked={selected}
                        onChange={() => changeType(item.value)}
                        className="h-4 w-4 accent-blue-700"
                      />

                      <div
                        className={`grid h-11 w-11 shrink-0 place-items-center rounded-xl ${
                          selected
                            ? "bg-blue-100 text-blue-800"
                            : "bg-slate-100 text-slate-500"
                        }`}
                      >
                        <Icon size={22} />
                      </div>

                      <div>
                        <p className="text-sm font-bold text-slate-900">
                          {item.title}
                        </p>
                        <p className="mt-1 text-xs text-slate-500">
                          {item.subtitle}
                        </p>
                      </div>
                    </label>
                  );
                })}
              </div>

              <div className="mt-5">
                {form.jenis_sop === "unit_kerja" ? (
                  <Field label="Pilih Unit Kerja" required>
                    <select
                      required
                      className={inputClass}
                      value={form.unit_kerja_id}
                      onChange={set("unit_kerja_id")}
                      disabled={loadingOptions || busy}
                      aria-label="Pilih unit kerja"
                    >
                      <option value="">
                        {loadingOptions
                          ? "Memuat unit kerja..."
                          : "Pilih unit kerja"}
                      </option>

                      {units.map((unit) => (
                        <option key={unit.id} value={unit.id}>
                          {unit.nama_unit}
                        </option>
                      ))}
                    </select>
                  </Field>
                ) : (
                  <Field label="Pilih Lembaga" required>
                    <select
                      required
                      className={inputClass}
                      value={form.lembaga_id}
                      onChange={set("lembaga_id")}
                      disabled={loadingOptions || busy}
                      aria-label="Pilih lembaga"
                    >
                      <option value="">
                        {loadingOptions
                          ? "Memuat lembaga..."
                          : "Pilih lembaga"}
                      </option>

                      {lembaga.map((item) => (
                        <option key={item.id} value={item.id}>
                          {item.nama_lembaga}
                        </option>
                      ))}
                    </select>
                  </Field>
                )}
              </div>
            </fieldset>
          ) : (
            <Field label="Unit Kerja" required>
              <div className="flex items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
                <Building2 size={19} className="text-blue-800" />

                <span className="text-sm font-semibold text-slate-700">
                  {loadingOptions
                    ? "Memuat unit kerja..."
                    : myUnit?.nama_unit || "Unit kerja akun"}
                </span>
              </div>
            </Field>
          )}

          <div className="border-t border-slate-100" />

          {/* IDENTITAS */}
          <div>
            <h3 className="mb-5 flex items-center gap-2 text-base font-bold text-slate-900">
              <FileText size={19} className="text-blue-800" />
              Identitas Dokumen
            </h3>

            <div className="grid gap-5 sm:grid-cols-3">
              <div className="sm:col-span-2">
                <Field label="Nomor SOP" required>
                  <input
                    required
                    id="nomor"
                    className={inputClass}
                    placeholder="Contoh: 01 TAHUN 2026"
                    value={form.nomor_sop}
                    onChange={set("nomor_sop")}
                    disabled={busy}
                  />
                </Field>
              </div>

              <Field label="Tahun Terbit" required>
                <input
                  required
                  id="tahun"
                  type="number"
                  min="1990"
                  max="2100"
                  className={inputClass}
                  value={form.tahun_terbit}
                  onChange={set("tahun_terbit")}
                  disabled={busy}
                />
              </Field>

              <div className="sm:col-span-3">
                <Field label="Nama SOP" required>
                  <input
                    required
                    id="nama"
                    className={inputClass}
                    placeholder="Masukkan nama atau judul SOP"
                    value={form.nama_sop}
                    onChange={set("nama_sop")}
                    disabled={busy}
                  />
                </Field>
              </div>

              <div className="sm:col-span-3"><MultiRelasiSop katalog={katalog} value={related} onChange={setRelated} disabled={loadingOptions || busy}/></div>
            </div>
          </div>

          <div className="border-t border-slate-100" />

          {/* UPLOAD */}
          <div>
            <h3 className="mb-5 flex items-center gap-2 text-base font-bold text-slate-900">
              <UploadCloud size={20} className="text-blue-800" />
              Berkas SOP
            </h3>

            <Field
              label="File SOP"
              required
              hint="Format PDF dengan ukuran maksimal 20 MB."
            >
              <input
                ref={fileRef}
                id="file"
                type="file"
                accept=".pdf,application/pdf"
                onChange={pickFile}
                disabled={busy}
                className="sr-only"
              />

              <div
                onDragOver={(event) => {
                  event.preventDefault();
                  if (!busy) setDragging(true);
                }}
                onDragLeave={(event) => {
                  event.preventDefault();
                  setDragging(false);
                }}
                onDrop={(event) => {
                  event.preventDefault();
                  setDragging(false);
                  if (!busy) validateFile(event.dataTransfer.files?.[0]);
                }}
                className={`rounded-2xl border-2 border-dashed p-6 transition ${
                  dragging
                    ? "border-blue-500 bg-blue-100"
                    : file
                    ? "border-emerald-300 bg-emerald-50/50"
                    : "border-blue-200 bg-blue-50/40 hover:border-blue-400 hover:bg-blue-50"
                }`}
              >
                {file ? (
                  <div className="flex flex-wrap items-center gap-4">
                    <div className="grid h-14 w-14 shrink-0 place-items-center rounded-xl bg-emerald-100 text-emerald-700">
                      <FileText size={27} />
                    </div>

                    <div className="min-w-0 flex-1">
                      <p className="break-all text-sm font-bold text-slate-900">
                        {file.name}
                      </p>

                      <p className="mt-1 text-xs text-slate-500">
                        {(file.size / 1024 / 1024).toFixed(2)} MB · PDF siap diunggah
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={removeFile}
                      disabled={busy}
                      className="inline-flex items-center gap-2 rounded-lg border border-red-200 bg-white px-3 py-2 text-xs font-bold text-red-700 hover:bg-red-50 disabled:opacity-50"
                    >
                      <X size={15} />
                      Hapus
                    </button>
                  </div>
                ) : (
                  <div className="flex flex-col items-center text-center">
                    <div className="grid h-14 w-14 place-items-center rounded-2xl bg-blue-100 text-blue-700">
                      <UploadCloud size={28} />
                    </div>

                    <p className="mt-4 text-sm font-bold text-slate-800">
                      Pilih atau seret file PDF ke sini
                    </p>

                    <p className="mt-1 text-xs text-slate-500">
                      Pastikan dokumen sudah final sebelum diunggah.
                    </p>

                    <button
                      type="button"
                      onClick={() => fileRef.current?.click()}
                      disabled={busy}
                      className="mt-4 rounded-xl border border-blue-200 bg-white px-4 py-2.5 text-sm font-bold text-blue-800 transition hover:bg-blue-50 disabled:opacity-50"
                    >
                      Pilih File PDF
                    </button>
                  </div>
                )}
              </div>
            </Field>
          </div>

          {/* CATATAN */}
          <Field
            label="Catatan untuk Admin"
            hint="Gunakan kolom ini untuk memberikan informasi tambahan terkait pengajuan SOP."
          >
            <textarea
              id="catatan"
              rows={4}
              maxLength={500}
              className={`${inputClass} resize-y`}
              placeholder="Tambahkan catatan jika diperlukan..."
              value={form.catatan}
              onChange={set("catatan")}
              disabled={busy}
            />

            <p className="mt-1 text-right text-xs text-slate-400">
              {form.catatan.length}/500
            </p>
          </Field>
        </div>

        {/* FOOTER */}
        <div className="flex flex-wrap items-center justify-between gap-4 border-t border-slate-100 bg-slate-50/70 p-5 sm:p-7">
          <p className="text-xs text-slate-500">
            <span className="font-bold text-red-500">*</span>{" "}
            Wajib diisi
          </p>

          <div className="flex w-full flex-wrap justify-end gap-3 sm:w-auto">
            <button
              type="button"
              onClick={() => navigate("/dashboard/sop")}
              disabled={busy}
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-5 py-3 text-sm font-bold text-slate-700 transition hover:bg-slate-100 disabled:opacity-50"
            >
              <X size={17} />
              Batal
            </button>

            <button
              type="submit"
              disabled={busy || loadingOptions || Boolean(optionsError)}
              className={primaryButton}
            >
              {busy ? (
                <>
                  <Loader2 size={18} className="animate-spin" />
                  Mengunggah...
                </>
              ) : (
                <>
                  <Save size={18} />
                  {isAdmin ? "Simpan SOP" : "Kirim untuk Approval"}
                </>
              )}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}
