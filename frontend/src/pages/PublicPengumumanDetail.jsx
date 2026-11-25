import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { ArrowLeft, CalendarDays, Download, FileText } from "lucide-react";
import SiteNavbar from "../components/SiteNavbar.jsx";
import api, { openSecureMedia, errMsg } from "../api/client.js";

const tanggal = value => {
  if (!value) return null;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : new Intl.DateTimeFormat("id-ID", {day:"numeric",month:"long",year:"numeric"}).format(d);
};
export default function PublicPengumumanDetail() {
  const { id } = useParams();
  const [item,setItem] = useState(null);
  const [loading,setLoading] = useState(true);
  const [error,setError] = useState("");
  useEffect(() => {
    let live=true;setLoading(true);setError("");setItem(null);
    api.get("/pengumuman/"+encodeURIComponent(id)).then(({data}) => {
      if(live)setItem(data?.data||null);
    }).catch(e => {
      if(live)setError(e?.response?.status===404?"Pengumuman tidak ditemukan atau sudah tidak aktif.":"Pengumuman belum dapat dimuat.");
    }).finally(()=>{if(live)setLoading(false)});
    return ()=>{live=false};
  },[id]);
  const file=item&&item.file;
  return <div className="min-h-screen bg-[#f4f8fc] text-slate-800">
    <SiteNavbar/>
    <main className="mx-auto max-w-5xl px-4 pb-20 pt-10 sm:px-6">
      <Link to="/informasi/pengumuman" className="inline-flex items-center gap-2 text-sm font-semibold text-[#1769aa] hover:underline"><ArrowLeft size={17}/> Kembali ke daftar pengumuman</Link>
      {loading?<p className="mt-8 rounded-3xl bg-white p-8">Memuat pengumuman...</p>:error||!item?<div role="alert" className="mt-8 rounded-3xl bg-white p-8"><h1 className="text-xl font-bold text-[#104b7a]">Pengumuman tidak tersedia</h1><p className="mt-2">{error||"Pengumuman tidak ditemukan."}</p></div>:
      <article className="mt-7 overflow-hidden rounded-3xl border border-[#e0e8f1] bg-white shadow-lg shadow-blue-950/5">
        <div className="bg-gradient-to-r from-[#104b7a] to-[#1769aa] px-6 py-9 text-white sm:px-10 sm:py-12">
          <p className="flex items-center gap-2 text-xs font-bold uppercase tracking-[.2em] text-blue-100"><FileText size={16}/> Pengumuman SIMPB BAPETEN</p>
          <h1 className="mt-4 text-3xl font-extrabold leading-tight sm:text-4xl">{item.judul}</h1>
          <div className="mt-5 flex flex-wrap gap-5 text-sm text-blue-100"><span className="inline-flex items-center gap-2"><CalendarDays size={16}/> Diumumkan: {tanggal(item.tanggal_pengumuman)||"-"}</span>{item.tanggal_kadaluarsa&&<span>Berlaku sampai: {tanggal(item.tanggal_kadaluarsa)}</span>}</div>
        </div>
        <div className="px-6 py-9 sm:px-10 sm:py-12">
          <div className="whitespace-pre-wrap break-words text-[15px] leading-8 text-slate-700 sm:text-base">{item.deskripsi||"Tidak ada deskripsi tambahan."}</div>
          {file&&<div className="mt-8 rounded-2xl border border-blue-100 bg-[#f4f8fc] p-5"><p className="mb-3 text-sm font-semibold text-[#104b7a]">Lampiran pengumuman</p><button type="button" onClick={async()=>{try{await openSecureMedia(file)}catch(e){setError(errMsg(e))}}} className="inline-flex items-center gap-2 rounded-xl bg-[#1769aa] px-4 py-3 text-sm font-bold text-white hover:bg-[#104b7a]"><Download size={17}/> Lihat / unduh lampiran</button></div>}
        </div>
      </article>}
    </main>
  </div>;
}
