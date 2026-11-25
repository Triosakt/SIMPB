import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import api, { downloadSop, errMsg } from "../api/client.js";
import { useAuth } from "../context/AuthContext.jsx";
import StatusBadge from "../components/StatusBadge.jsx";
import { openPdf } from "../api/client.js";

export default function SopList() {
  const { user } = useAuth();
  const [params, setParams] = useSearchParams();
  const [units, setUnits] = useState([]);
  const [res, setRes] = useState({ data: [], meta: { page: 1, pages: 1, total: 0 } });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [relatedDetail,setRelatedDetail]=useState(null);
  const [relatedBusy,setRelatedBusy]=useState(false);
  const showRelated=async id=>{setRelatedBusy(true);setRelatedDetail(null);try{const {data}=await api.get(`/sop/${id}`);setRelatedDetail(data);}catch(e){alert(errMsg(e));}finally{setRelatedBusy(false);}};

  const f = Object.fromEntries(params);
  const set = (k, v) => { const p = new URLSearchParams(params); v ? p.set(k, v) : p.delete(k); p.delete("page"); setParams(p); };

  useEffect(() => { api.get("/unit-kerja").then((r) => setUnits(r.data)); }, []);
  useEffect(() => {
    setLoading(true); setError("");
    api.get("/sop", { params: f }).then((r) => setRes(r.data)).catch((e) => setError(errMsg(e))).finally(() => setLoading(false));
  }, [params]); // eslint-disable-line

  // Role 1 (Perwakilan Unit) hanya bisa VIEW + upload; download hanya SOP unitnya
  const canDownload = (s) => user.role !== "perwakilan_unit" || s.unit_kerja_id === user.unit_kerja_id;
  const dl = async (s) => { try { await downloadSop(s); } catch (e) { alert(errMsg(e)); } };

  return (
    <div className="mx-auto max-w-6xl space-y-4">
      <section className="relative overflow-hidden rounded-3xl text-white shadow-xl min-h-[180px] sm:min-h-[210px] px-6 py-7 sm:px-8 sm:py-8 flex flex-col justify-center">

        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 z-0 bg-cover bg-center bg-no-repeat"
          style={{
            backgroundImage:
              'linear-gradient(90deg, rgba(9,42,76,.96) 0%, rgba(16,75,122,.88) 52%, rgba(23,105,170,.70) 100%), url("/img/kantor.jpg")'
          }}
        />

        <div className="relative z-10 flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-xs font-bold uppercase tracking-widest text-cyan-100">Manajemen Dokumen</p>
            <h1 className="mt-2 text-2xl font-extrabold sm:text-3xl">Daftar SOP</h1>
            <p className="mt-2 max-w-xl text-sm leading-6 text-blue-100">
              Telusuri dan kelola dokumen Standar Operasional Prosedur.
            </p>
          </div>
          {user.role !== "user_biasa" && (
            <Link to="/dashboard/sop/upload" className="inline-flex items-center rounded-xl bg-white px-4 py-2.5 text-sm font-bold text-blue-950 transition hover:bg-cyan-50">
              Upload SOP
            </Link>
          )}
        </div>
      </section>

      <div className="panel grid gap-3 p-4 sm:grid-cols-2 lg:grid-cols-5">
        <input className="input lg:col-span-2" placeholder="Cari nomor atau nama SOP" aria-label="Cari" defaultValue={f.q || ""}
          onKeyDown={(e) => e.key === "Enter" && set("q", e.target.value)} onBlur={(e) => e.target.value !== (f.q || "") && set("q", e.target.value)} />
        <select className="input" aria-label="Jenis SOP" value={f.jenis || ""} onChange={(e) => set("jenis", e.target.value)}>
          <option value="">Semua jenis</option><option value="unit_kerja">SOP Unit Kerja</option><option value="lembaga">SOP Lembaga</option>
        </select>
        <select className="input" aria-label="Unit kerja" value={f.unit_kerja_id || ""} onChange={(e) => set("unit_kerja_id", e.target.value)}>
          <option value="">Semua unit kerja</option>{units.map((u) => <option key={u.id} value={u.id}>{u.nama_unit}</option>)}
        </select>
        <select className="input" aria-label="Status berlaku" value={f.status_berlaku || ""} onChange={(e) => set("status_berlaku", e.target.value)}>
          <option value="">Semua status</option><option value="Berlaku">Berlaku</option><option value="Tidak_Berlaku">Tidak berlaku</option>
        </select>
      </div>

      {error && <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-800">{error}</p>}

      <div className="panel overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead className="bg-surface-muted text-ink-soft">
            <tr><th className="px-4 py-3 font-medium">Nomor</th><th className="px-4 py-3 font-medium">Nama SOP</th><th className="px-4 py-3 font-medium">Pemilik</th>
              <th className="px-4 py-3 font-medium">Tahun</th><th className="px-4 py-3 font-medium">Status</th><th className="px-4 py-3" /></tr>
          </thead>
          <tbody className="divide-y divide-line">
            {loading && <tr><td colSpan="6" className="px-4 py-10 text-center text-ink-soft">Memuat data…</td></tr>}
            {!loading && res.data.length === 0 && <tr><td colSpan="6" className="px-4 py-10 text-center text-ink-soft">Tidak ada SOP yang cocok. Ubah kata kunci atau filter.</td></tr>}
            {res.data.map((s) => (
              <tr key={s.id} className="hover:bg-surface">
                <td className="whitespace-nowrap px-4 py-3 font-medium">{s.nomor_sop}</td>
                <td className="min-w-64 px-4 py-3">{s.nama_sop}</td>
                <td className="px-4 py-3">{s.nama_unit || s.nama_lembaga}<span className="block text-xs text-ink-soft">{s.jenis_sop === "lembaga" ? "Lembaga" : "Unit kerja"}</span></td>
                <td className="px-4 py-3">{s.tahun_terbit}</td>
                <td className="space-y-1 px-4 py-3"><StatusBadge status={s.approval_status} /><br /><StatusBadge status={s.status_berlaku} /></td>
                <td className="px-4 py-3 text-right">
                  <button className="btn-ghost" onClick={() => showRelated(s.id)} disabled={relatedBusy}>Dokumen Terkait</button>
                  {canDownload(s) && <button className="btn-ghost" onClick={() => dl(s)}>Unduh PDF</button>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {relatedDetail && <div role="dialog" aria-modal="true" aria-label="Dokumen terkait SOP" className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4" onClick={()=>setRelatedDetail(null)}><div className="max-h-[85vh] w-full max-w-2xl overflow-auto rounded-2xl bg-white p-6 shadow-2xl" onClick={e=>e.stopPropagation()}><div className="flex items-start justify-between gap-4"><div><h3 className="text-lg font-extrabold text-blue-950">Dokumen Terkait</h3><p className="text-sm text-slate-500">{relatedDetail.nomor_sop} — {relatedDetail.nama_sop}</p></div><button className="btn-ghost" onClick={()=>setRelatedDetail(null)}>Tutup</button></div><div className="mt-5 space-y-3">{(relatedDetail.dokumen_terkait||[]).length===0?<p className="text-sm text-slate-500">Belum ada dokumen terkait.</p>:relatedDetail.dokumen_terkait.map((d,i)=><div key={i} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-blue-100 bg-blue-50/40 p-3"><div><p className="text-xs font-bold uppercase text-blue-700">{d.document_type==='peta'?'Peta Proses':d.document_type==='sub'?'Sub Proses':'CFM'}</p><p className="text-sm font-semibold text-slate-900">{d.nomor} — {d.judul}</p></div>{d.file_pdf?<button className="btn-ghost" onClick={async()=>{try{await openPdf(`/proses/${d.document_type}/${d.document_id}/file`);}catch(e){alert(errMsg(e));}}}>Lihat PDF</button>:<span className="text-xs text-slate-500">PDF tidak tersedia</span>}</div>)}</div></div></div>}
      <div className="flex items-center justify-between text-sm text-ink-soft">
        <span>{res.meta.total} SOP</span>
        <div className="flex items-center gap-2">
          <button className="btn-ghost" disabled={res.meta.page <= 1} onClick={() => setParams({ ...f, page: res.meta.page - 1 })}>Sebelumnya</button>
          <span>Halaman {res.meta.page} dari {res.meta.pages || 1}</span>
          <button className="btn-ghost" disabled={res.meta.page >= res.meta.pages} onClick={() => setParams({ ...f, page: res.meta.page + 1 })}>Berikutnya</button>
        </div>
      </div>
    </div>
  );
}
