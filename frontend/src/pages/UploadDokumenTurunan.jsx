import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ArrowLeft, CheckCircle2, FileText, Loader2, UploadCloud, Workflow } from "lucide-react";
import api, { errMsg } from "../api/client.js";
import { useAuth } from "../context/AuthContext.jsx";

const fieldClass = "w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-800 outline-none transition focus:border-cyan-500 focus:ring-4 focus:ring-cyan-500/10 disabled:bg-slate-100";
const labelClass = "mb-2 block text-sm font-semibold text-slate-700";
const MAX_FILE = 20 * 1024 * 1024;

export default function UploadDokumenTurunan({ type = "sub" }) {
  const isCfm = type === "cfm";
  const title = isCfm ? "Cross Functional Map (CFM)" : "Sub Proses";
  const navigate = useNavigate();
  const { user } = useAuth();
  const isAdmin = user?.role === "admin_ortala";
  const [peta, setPeta] = useState([]);
  const [subs, setSubs] = useState([]);
  const [units, setUnits] = useState([]);
  const [selectedUnits, setSelectedUnits] = useState([]);
  const [form, setForm] = useState({ peta_proses_id: "", sub_proses_id: "", nomor: "", nama: "", tahun_terbit: String(new Date().getFullYear()) });
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    let active = true;
    async function load() {
      setLoading(true);
      try {
        const [petaRes, unitRes] = await Promise.all([api.get("/proses"), isAdmin ? api.get("/unit-kerja") : Promise.resolve({ data: [] })]);
        const allPeta = Array.isArray(petaRes.data) ? petaRes.data : [];
        // Backend hanya menerima induk approved untuk pengajuan Unit Kerja.
        const eligiblePeta = allPeta.filter((p) => !p.approval_status || p.approval_status === "approved");
        const details = isCfm ? await Promise.all(eligiblePeta.map(async (p) => {
          try { const r = await api.get(`/proses/peta/${p.id}`); return r.data; } catch { return null; }
        })) : [];
        const eligibleSubs = details.filter(Boolean).flatMap((p) => (p.sub_proses || []).filter((s) => !s.approval_status || s.approval_status === "approved").map((s) => ({ ...s, peta_proses_id: p.id })));
        if (active) {
          setPeta(eligiblePeta);
          setSubs(eligibleSubs);
          setUnits(Array.isArray(unitRes.data) ? unitRes.data : []);
        }
      } catch (e) { if (active) setError(errMsg(e)); }
      finally { if (active) setLoading(false); }
    }
    load();
    return () => { active = false; };
  }, [isAdmin, isCfm]);

  const availableSubs = useMemo(() => subs.filter((s) => String(s.peta_proses_id) === form.peta_proses_id), [subs, form.peta_proses_id]);
  const setField = (key, value) => setForm((old) => ({ ...old, [key]: value }));

  async function submit(event) {
    event.preventDefault();
    if (saving) return;
    setError("");
    if (!file) return setError("Silakan pilih dokumen PDF terlebih dahulu.");
    if (!file.name.toLowerCase().endsWith(".pdf") || (file.type && file.type !== "application/pdf")) return setError("File harus berformat PDF.");
    if (file.size > MAX_FILE) return setError("Ukuran PDF maksimal 20 MB.");
    if (isCfm && !form.sub_proses_id) return setError("Pilih Sub Proses induk yang sudah disetujui.");
    const data = new FormData();
    data.append("peta_proses_id", form.peta_proses_id);
    if (isCfm) data.append("sub_proses_id", form.sub_proses_id);
    data.append(isCfm ? "nomor_cfm" : "nomor_sub_proses", form.nomor.trim());
    data.append(isCfm ? "nama_cfm" : "nama_sub_proses", form.nama.trim());
    data.append("tahun_terbit", form.tahun_terbit);
    if (isAdmin) data.append("unit_kerja_ids", JSON.stringify(selectedUnits));
    data.append("file", file);
    setSaving(true);
    try {
      await api.post(isCfm ? "/proses/cfm" : "/proses/sub", data);
      setSuccess(true);
    } catch (e) { setError(errMsg(e)); }
    finally { setSaving(false); }
  }

  return (
    <div className="mx-auto max-w-4xl space-y-6 pb-12">
      <Link to="/dashboard/manajemen-proses" className="inline-flex items-center gap-2 text-sm font-semibold text-cyan-800 hover:underline"><ArrowLeft size={16} /> Kembali ke Manajemen Proses</Link>
      <header className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-950 via-blue-950 to-cyan-900 p-6 text-white shadow-xl sm:p-8">
        <div className="absolute -right-12 -top-16 h-48 w-48 rounded-full bg-cyan-400/20 blur-3xl" />
        <div className="relative flex items-start gap-4"><div className="rounded-2xl border border-white/20 bg-white/10 p-3">{isCfm ? <Workflow size={25} /> : <FileText size={25} />}</div><div><p className="text-xs font-semibold uppercase tracking-widest text-cyan-200">Pengajuan dokumen</p><h1 className="mt-1 text-2xl font-bold sm:text-3xl">Upload {title}</h1><p className="mt-2 text-sm leading-6 text-blue-100/80">Lengkapi informasi dan unggah PDF. {isAdmin ? "Dokumen yang diunggah Admin mengikuti ketentuan backend." : "Pengajuan akan diperiksa oleh Admin Ortala."}</p></div></div>
      </header>
      {success ? <section className="rounded-2xl border border-emerald-200 bg-emerald-50 p-6"><CheckCircle2 className="text-emerald-700" size={30} /><h2 className="mt-3 text-lg font-bold text-emerald-900">{isAdmin ? "Dokumen berhasil disimpan" : "Dokumen berhasil diajukan"}</h2><p className="mt-2 text-sm text-emerald-800">{isAdmin ? "Dokumen telah dikirim ke sistem." : "Pengajuan sedang menunggu pemeriksaan dan persetujuan Admin Ortala. Tidak perlu mengunggah ulang."}</p><button type="button" className="mt-5 rounded-xl bg-emerald-800 px-4 py-2 text-sm font-semibold text-white" onClick={() => navigate(`/dashboard/manajemen-proses?tab=${type}`)}>Lihat Manajemen Proses</button></section> : (
        <form onSubmit={submit} className="space-y-5 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-7">
          {error && <p role="alert" className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-800">{error}</p>}
          {loading ? <div className="flex items-center gap-2 py-10 text-sm text-slate-500"><Loader2 size={18} className="animate-spin" /> Memuat dokumen induk...</div> : <>
            <div><label className={labelClass} htmlFor="parent-peta">Peta Proses Induk *</label><select id="parent-peta" className={fieldClass} value={form.peta_proses_id} required onChange={(e) => setForm((old) => ({ ...old, peta_proses_id: e.target.value, sub_proses_id: "" }))}><option value="">Pilih peta proses yang disetujui</option>{peta.map((p) => <option key={p.id} value={p.id}>{p.nomor_peta_proses} — {p.judul}</option>)}</select>{!peta.length && <p className="mt-2 text-xs text-amber-700">Belum ada Peta Proses yang disetujui dan dapat dipilih.</p>}</div>
            {isCfm && <div><label className={labelClass} htmlFor="parent-sub">Sub Proses Induk *</label><select id="parent-sub" className={fieldClass} value={form.sub_proses_id} required disabled={!form.peta_proses_id} onChange={(e) => setField("sub_proses_id", e.target.value)}><option value="">Pilih sub proses yang disetujui</option>{availableSubs.map((s) => <option key={s.id} value={s.id}>{s.nomor_sub_proses} — {s.nama_sub_proses}</option>)}</select>{form.peta_proses_id && !availableSubs.length && <p className="mt-2 text-xs text-amber-700">Belum ada Sub Proses yang disetujui pada peta proses ini.</p>}</div>}
            <div className="grid gap-4 sm:grid-cols-2"><div><label className={labelClass} htmlFor="doc-number">Nomor {title} *</label><input id="doc-number" className={fieldClass} value={form.nomor} maxLength={100} required placeholder={isCfm ? "Contoh: CFM-01" : "Contoh: SP-01"} onChange={(e) => setField("nomor", e.target.value)} /></div><div><label className={labelClass} htmlFor="doc-year">Tahun Terbit *</label><input id="doc-year" type="number" min="1901" max="2155" required className={fieldClass} value={form.tahun_terbit} onChange={(e) => setField("tahun_terbit", e.target.value)} /></div></div>
            <div><label className={labelClass} htmlFor="doc-name">Nama {title} *</label><input id="doc-name" className={fieldClass} maxLength={255} required value={form.nama} placeholder={`Masukkan nama ${title}`} onChange={(e) => setField("nama", e.target.value)} /></div>
            {isAdmin ? <fieldset className="rounded-xl border border-slate-200 p-4"><legend className="px-1 text-sm font-semibold text-slate-700">Unit Kerja Terkait</legend><div className="grid max-h-44 gap-2 overflow-y-auto sm:grid-cols-2">{units.map((u) => <label key={u.id} className="flex items-center gap-2 text-sm text-slate-700"><input type="checkbox" checked={selectedUnits.includes(Number(u.id))} onChange={(e) => setSelectedUnits((old) => e.target.checked ? [...old, Number(u.id)] : old.filter((id) => id !== Number(u.id)))} />{u.nama_unit}</label>)}</div></fieldset> : <p className="rounded-xl bg-slate-50 p-4 text-sm text-slate-600">Unit kerja pengaju ditentukan otomatis berdasarkan akun yang sedang digunakan.</p>}
            <div><label className={labelClass} htmlFor="doc-file">Dokumen PDF *</label><label htmlFor="doc-file" className="flex cursor-pointer flex-col items-center gap-2 rounded-2xl border-2 border-dashed border-slate-200 bg-slate-50 p-7 text-center transition hover:border-cyan-400 hover:bg-cyan-50"><UploadCloud size={27} className="text-cyan-800" /><span className="text-sm font-semibold text-slate-700">{file ? file.name : "Pilih file PDF"}</span><span className="text-xs text-slate-500">Format PDF, maksimal 20 MB</span></label><input id="doc-file" type="file" accept=".pdf,application/pdf" className="sr-only" required onChange={(e) => setFile(e.target.files?.[0] || null)} /></div>
            <div className="flex flex-wrap justify-end gap-3 border-t border-slate-100 pt-5"><Link to="/dashboard/manajemen-proses" className="rounded-xl border border-slate-200 px-5 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-50">Batal</Link><button type="submit" disabled={saving || !peta.length || (isCfm && !availableSubs.length)} className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-slate-900 to-cyan-800 px-5 py-3 text-sm font-semibold text-white shadow-md transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:translate-y-0">{saving ? <Loader2 size={17} className="animate-spin" /> : <UploadCloud size={17} />}{saving ? "Mengunggah..." : isAdmin ? "Simpan Dokumen" : "Ajukan Dokumen"}</button></div>
          </>}
        </form>
      )}
    </div>
  );
}
