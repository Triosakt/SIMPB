import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Area, AreaChart, Bar, BarChart, CartesianGrid, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Activity, ArrowRight, BookOpen, CheckCircle2, Clock3, FileText, Layers3, Network, RefreshCw, Search, XCircle } from "lucide-react";
import api, { errMsg } from "../api/client.js";
import { useAuth } from "../context/AuthContext.jsx";
import StatusBadge from "../components/StatusBadge.jsx";

// DASHBOARD SIMPB TERPADU V1
const TYPES = [
  { key: "peta", name: "Peta Proses", short: "Peta", color: "#2563eb", Icon: Network, to: "/dashboard/proses" },
  { key: "sub", name: "Sub Proses", short: "Sub", color: "#16a34a", Icon: Layers3, to: "/dashboard/proses" },
  { key: "cfm", name: "Cross Functional Map", short: "CFM", color: "#9333ea", Icon: Activity, to: "/dashboard/proses" },
  { key: "sop", name: "SOP", short: "SOP", color: "#ea580c", Icon: BookOpen, to: "/dashboard/sop" },
];
const STATUS = [
  { key: "approved", name: "Disetujui", color: "#059669", Icon: CheckCircle2 },
  { key: "pending", name: "Menunggu", color: "#d97706", Icon: Clock3 },
  { key: "rejected", name: "Ditolak", color: "#dc2626", Icon: XCircle },
];
const number = value => Number(value || 0);
const fmt = value => new Intl.NumberFormat("id-ID").format(number(value));
const sum = (rows, key = "total") => (rows || []).reduce((total, row) => total + number(row[key]), 0);
const tooltipStyle = { border: "1px solid #cbd5e1", borderRadius: 12, fontSize: 12 };

function Panel({ title, subtitle, children, className = "" }) {
  return <section className={`min-w-0 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6 ${className}`}>
    <h2 className="text-lg font-extrabold text-slate-900">{title}</h2>
    {subtitle && <p className="mt-1 mb-5 text-sm leading-6 text-slate-500">{subtitle}</p>}
    {children}
  </section>;
}
function Empty({ children = "Belum ada data." }) {
  return <div className="grid min-h-40 place-items-center rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-5 text-center text-sm text-slate-500">{children}</div>;
}

export default function Dashboard() {
  const { user } = useAuth();
  const canSeeAllStats = user?.role === "admin_ortala" || user?.role === "perwakilan_unit";
  const isAdmin = user?.role === "admin_ortala";
  const isPublicViewer = !canSeeAllStats;
  const [data, setData] = useState(null);
  const [recent, setRecent] = useState([]);
  const [units, setUnits] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [unitError, setUnitError] = useState("");
  const [query, setQuery] = useState("");

  const load = useCallback(async () => {
    setLoading(true); setError(""); setUnitError("");
    const requests = [api.get("/stats/summary")];
    requests.push(api.get("/stats/process-summary"));
    const results = await Promise.allSettled(requests);
    const sop = results[0].status === "fulfilled" ? results[0].value.data : null;
    const process = results[1]?.status === "fulfilled" ? results[1].value.data : null;
    setData({ sop, process });
    if (!sop || !process) setError("Sebagian statistik belum dapat dimuat. Silakan coba Perbarui.");
    const extras = await Promise.allSettled([
      api.get("/sop", { params: { limit: 6 } }),
      ...(canSeeAllStats ? [api.get("/stats/unit-summary")] : []),
    ]);
    setRecent(extras[0].status === "fulfilled" && Array.isArray(extras[0].value.data?.data) ? extras[0].value.data.data : []);
    if (canSeeAllStats) {
      if (extras[1]?.status === "fulfilled") setUnits(extras[1].value.data?.units || []);
      else { setUnits([]); setUnitError("Kontribusi unit belum dapat dimuat."); }
    }
    setLoading(false);
  }, [canSeeAllStats]);

  useEffect(() => { load(); }, [load]);

  const docs = useMemo(() => TYPES.map(type => {
    if (type.key === "sop") {
      const s = data?.sop;
      return { ...type, available: Boolean(s), total: sum(s?.byStatus), years: s?.byYear || [], status: Object.fromEntries(STATUS.map(item => [item.key, number(s?.byStatus?.find(row => row.status === item.key)?.total)])) };
    }
    const process = data?.process?.documents?.find(item => item.type === type.key);
    return { ...type, available: Boolean(process), total: number(process?.total), years: process?.years || [], status: Object.fromEntries(STATUS.map(item => [item.key, number(process?.statuses?.find(row => row.status === item.key)?.total)])) };
  }), [data]);
  const available = docs.filter(doc => doc.available);
  const total = available.reduce((value, doc) => value + doc.total, 0);
  const statusTotal = key => available.reduce((value, doc) => value + doc.status[key], 0);
  const years = [...new Set(available.flatMap(doc => doc.years.map(row => String(row.tahun ?? "Tidak ditentukan"))))].sort((a, b) => a.localeCompare(b, "id", { numeric: true }));
  const trend = years.map(year => ({ year, ...Object.fromEntries(available.map(doc => [doc.key, number(doc.years.find(row => String(row.tahun ?? "Tidak ditentukan") === year)?.total)])) }));
  const composition = available.filter(doc => doc.total > 0);
  const activeUnits = [...units].filter(row => number(row.total) > 0).sort((a, b) => number(b.total) - number(a.total)).slice(0, 6);

  return <div className="mx-auto max-w-7xl space-y-6 pb-12 text-slate-900">
    <style>{`@media(prefers-reduced-motion:reduce){.simpb-dash *{animation:none!important;transition:none!important}}`}</style>
    <div className="simpb-dash space-y-6">
      <header className="relative flex min-h-[180px] items-center overflow-hidden rounded-3xl px-6 py-7 text-white shadow-xl sm:min-h-[210px] sm:px-8 sm:py-8">
        

<div aria-hidden="true" className="absolute inset-0 overflow-hidden">
  {/* 1. Foto gedung */}
  <div
    className="absolute inset-0 bg-cover bg-center motion-reduce:animate-none animate-[bgzoom_20s_ease-in-out_infinite_alternate]"
    style={{
      backgroundImage: 'url("/img/kantor.jpg")',
      backgroundPosition: "center 5%",
    }}
  />

  {/* 2. Gradasi navy lebih transparan */}
  {/* 2. Overlay gradasi navy dari kiri */}
<div
  className="absolute inset-0"
  style={{
    backgroundImage:
      "linear-gradient(100deg, rgba(7,26,53,0.96) 0%, rgba(7,26,53,0.88) 30%, rgba(11,45,80,0.72) 60%, rgba(16,75,122,0.48) 100%)",
  }}
/>

  {/* 3. Cahaya biru kanan atas */}
  <div
    className="absolute inset-0"
    style={{
      backgroundImage:
        "radial-gradient(60% 50% at 85% 15%, rgba(56,152,255,0.15) 0%, transparent 70%)",
    }}
  />

  {/* 4. Berkas cahaya diagonal */}
  <div
    className="absolute -inset-[20%] opacity-40 mix-blend-screen"
    style={{
      backgroundImage:
        "repeating-linear-gradient(115deg, transparent 0px, transparent 140px, rgba(96,165,250,0.12) 190px, transparent 260px)",
      maskImage: "linear-gradient(90deg, transparent 20%, black 70%)",
      WebkitMaskImage:
        "linear-gradient(90deg, transparent 20%, black 70%)",
    }}
  />

  {/* 5. Dot matrix */}
  <div
    className="absolute inset-0 opacity-20"
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

  {/* 6. Gelombang */}
  <svg
    className="absolute bottom-0 right-0 h-full w-[70%] opacity-30"
    viewBox="0 0 800 600"
    preserveAspectRatio="xMaxYMax slice"
    fill="none"
  >
    <defs>
      <linearGradient id="waveFade" x1="0" y1="0" x2="1" y2="0">
        <stop offset="0" stopColor="#38bdf8" stopOpacity="0" />
        <stop offset="0.5" stopColor="#38bdf8" stopOpacity="0.8" />
        <stop offset="1" stopColor="#60a5fa" stopOpacity="0.2" />
      </linearGradient>
    </defs>
    {[0, 1, 2, 3, 4, 5, 6].map((i) => (
      <path
        key={i}
        d={`M0 ${380 + i * 22} C 200 ${300 + i * 10}, 400 ${480 - i * 8}, 800 ${340 + i * 18}`}
        stroke="url(#waveFade)"
        strokeWidth="1"
      />
    ))}
  </svg>

  {/* 7. Fade navy bawah */}
  <div className="absolute inset-x-0 bottom-0 h-40 bg-gradient-to-t from-[#071a35]/55 to-transparent" />
</div>


        
        <div className="relative z-10 flex w-full flex-wrap items-center justify-between gap-5">
          <div><p className="text-xs font-bold uppercase tracking-widest text-cyan-100">Sistem Informasi Manajemen Proses Bisnis</p><h1 className="mt-2 text-2xl font-black sm:text-3xl">Dashboard SIMPB</h1><p className="mt-2 max-w-xl text-sm leading-6 text-blue-100">Halo, {user?.name?.split(" ")[0] || "Pengguna"}. {canSeeAllStats ? "Pantau Peta Proses, Sub Proses, CFM, dan SOP dalam satu ruang kerja." : "Jelajahi katalog proses bisnis dan SOP yang tersedia."}</p></div>
          <button type="button" onClick={load} disabled={loading} className="inline-flex items-center gap-2 rounded-xl border border-white/30 bg-white/15 px-4 py-2.5 text-sm font-bold text-white backdrop-blur transition hover:bg-white/25 disabled:opacity-60"><RefreshCw size={16} className={loading ? "animate-spin" : ""} />{loading ? "Memuat…" : "Perbarui Data"}</button>
        </div>
      </header>

      {error && <div role="alert" className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">{error}</div>}
      <section><h2 className="mb-3 text-xl font-extrabold">Ringkasan Jenis Dokumen</h2><div className="grid grid-cols-2 gap-3 lg:grid-cols-4">{docs.map(doc => <Link key={doc.key} to={doc.to} className="group relative overflow-hidden rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition duration-300 hover:-translate-y-1 hover:shadow-lg sm:p-5"><span className="absolute inset-x-0 top-0 h-1" style={{ background: doc.color }} /><div className="flex items-start justify-between gap-2"><p className="text-sm font-bold text-slate-700">{doc.name}</p><span className="rounded-xl p-2" style={{ color: doc.color, background: doc.color + "16" }}><doc.Icon size={20} /></span></div><p className="mt-4 text-3xl font-black tabular-nums">{doc.available ? fmt(doc.total) : "—"}</p><p className="mt-2 text-xs text-slate-500">{doc.available ? isPublicViewer ? "Dokumen disetujui" : "Total seluruh status" : loading ? "Memuat data…" : "Data belum tersedia"}</p><span className="mt-3 inline-flex items-center gap-1 text-xs font-bold" style={{ color: doc.color }}>Lihat dokumen <ArrowRight size={14} /></span></Link>)}</div>{isPublicViewer && <p className="mt-3 text-xs text-slate-500">Ringkasan ini hanya menghitung dokumen yang sudah disetujui dan dapat dilihat publik.</p>}</section>

      <form action="/dashboard/sop" className="flex flex-wrap gap-2 rounded-2xl border border-slate-200 bg-white p-3 shadow-sm"><div className="flex min-w-0 flex-1 items-center gap-2 px-2"><Search size={18} className="shrink-0 text-slate-400" /><input name="q" value={query} onChange={event => setQuery(event.target.value)} placeholder="Cari nomor atau nama SOP…" aria-label="Cari SOP" className="min-w-0 w-full bg-transparent py-2 text-sm outline-none" /></div><button className="rounded-xl bg-blue-700 px-5 py-2.5 text-sm font-bold text-white hover:bg-blue-800">Cari SOP</button><Link to="/dashboard/proses" className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-bold text-blue-800 hover:bg-blue-50">Katalog Proses Bisnis</Link></form>

      {available.length > 0 && <><section><h2 className="mb-3 text-xl font-extrabold">{isPublicViewer ? "Dokumen Publik" : "Status Persetujuan"}</h2><div className="grid grid-cols-2 gap-3 sm:grid-cols-3">{(isPublicViewer ? STATUS.filter(item => item.key === "approved") : STATUS).map(item => <div key={item.key} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"><div className="flex items-center gap-2 text-sm font-bold text-slate-700"><item.Icon size={18} style={{ color: item.color }} />{item.name}</div><p className="mt-3 text-3xl font-black tabular-nums">{fmt(statusTotal(item.key))}</p><p className="mt-1 text-xs text-slate-500">{total ? Math.round(statusTotal(item.key) / total * 100) : 0}% dari {fmt(total)} dokumen tercakup</p></div>)}</div>{isAdmin && statusTotal("pending") > 0 && <Link to="/dashboard/approval" className="mt-3 flex flex-wrap items-center justify-between gap-2 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-bold text-amber-900 hover:bg-amber-100"><span>{fmt(statusTotal("pending"))} dokumen menunggu persetujuan</span><span className="inline-flex items-center gap-1">Buka Approval <ArrowRight size={15} /></span></Link>}</section>
      <div className="grid gap-5 lg:grid-cols-2"><Panel title="Komposisi Dokumen" subtitle="Perbandingan seluruh jenis dokumen yang tersedia.">{composition.length ? <><div className="h-64"><ResponsiveContainer width="100%" height="100%"><PieChart><Pie data={composition} dataKey="total" nameKey="name" innerRadius={58} outerRadius={91} paddingAngle={3} animationDuration={900}>{composition.map(doc => <Cell key={doc.key} fill={doc.color} />)}</Pie><Tooltip contentStyle={tooltipStyle} formatter={value => [fmt(value), "Dokumen"]} /></PieChart></ResponsiveContainer></div><div className="space-y-3">{available.map(doc => <div key={doc.key}><div className="mb-1 flex items-center justify-between gap-2 text-sm"><span className="font-semibold">{doc.name}</span><b>{fmt(doc.total)} · {total ? Math.round(doc.total / total * 100) : 0}%</b></div><div className="h-2 overflow-hidden rounded-full bg-slate-100"><div className="h-full rounded-full transition-all duration-700" style={{ width: (total ? doc.total / total * 100 : 0) + "%", background: doc.color }} /></div></div>)}</div></> : <Empty />}</Panel>
      <Panel title="Tren Tahun Terbit" subtitle={isPublicViewer ? "Tren dokumen yang sudah disetujui berdasarkan tahun terbit." : "Peta/Sub/CFM seluruh status; SOP mengikuti API yang hanya mencakup SOP disetujui."}>{trend.length ? <><div className="h-72"><ResponsiveContainer width="100%" height="100%"><AreaChart data={trend} margin={{ top: 12, right: 12, left: -20, bottom: 4 }}><CartesianGrid stroke="#e2e8f0" strokeDasharray="4 4" vertical={false} /><XAxis dataKey="year" tick={{ fontSize: 11 }} /><YAxis allowDecimals={false} tick={{ fontSize: 11 }} /><Tooltip contentStyle={tooltipStyle} />{available.map(doc => <Area key={doc.key} type="monotone" dataKey={doc.key} name={doc.name} stroke={doc.color} fill={doc.color} fillOpacity={0.08} strokeWidth={2.5} animationDuration={1000} />)}</AreaChart></ResponsiveContainer></div><div className="mt-3 flex flex-wrap justify-center gap-4">{available.map(doc => <span key={doc.key} className="inline-flex items-center gap-2 text-xs font-bold"><i className="h-2.5 w-2.5 rounded-full" style={{ background: doc.color }} />{doc.short}</span>)}</div></> : <Empty />}</Panel></div></>}

      {canSeeAllStats && <Panel title="Kontribusi Unit Kerja" subtitle="Keterkaitan dokumen per unit; dokumen multi-unit dapat muncul di beberapa unit.">{unitError && <p className="mb-3 text-sm text-amber-700">{unitError}</p>}{activeUnits.length ? <div className="space-y-4">{activeUnits.map(row => <div key={row.unit_kerja_id}><div className="mb-2 flex items-center justify-between gap-2 text-sm"><span className="min-w-0 truncate font-semibold" title={row.unit}>{row.unit}</span><b>{fmt(row.total)}</b></div><div className="flex h-3 overflow-hidden rounded-full bg-slate-100">{TYPES.map(type => number(row[type.key]) > 0 && <span key={type.key} title={type.name + ": " + fmt(row[type.key])} style={{ width: (number(row[type.key]) / Math.max(1, number(row.total)) * 100) + "%", background: type.color }} />)}</div></div>)}<Link to="/dashboard/statistik" className="inline-flex items-center gap-1 text-sm font-bold text-blue-700 hover:underline">Lihat statistik lengkap <ArrowRight size={15} /></Link></div> : <Empty>{loading ? "Memuat kontribusi unit…" : "Belum ada kontribusi unit yang dapat ditampilkan."}</Empty>}</Panel>}

      <Panel title="SOP Terbaru" subtitle="Enam entri SOP terakhir dari katalog."><div className="mb-4 flex justify-end"><Link to="/dashboard/sop" className="inline-flex items-center gap-1 text-sm font-bold text-blue-700 hover:underline">Lihat semua SOP <ArrowRight size={15} /></Link></div>{recent.length ? <ul className="divide-y divide-slate-100">{recent.map(item => <li key={item.id} className="flex flex-wrap items-center justify-between gap-3 py-3"><div className="min-w-0"><p className="font-semibold text-slate-900">{item.nama_sop}</p><p className="mt-1 text-xs text-slate-500">{item.nomor_sop || "Tanpa nomor"} · {item.nama_unit || item.nama_lembaga || "Unit tidak ditentukan"}</p></div><StatusBadge status={item.approval_status} /></li>)}</ul> : <Empty>{loading ? "Memuat SOP terbaru…" : "Belum ada SOP untuk ditampilkan."}</Empty>}</Panel>
      <p className="text-xs leading-5 text-slate-500">Total global menghitung setiap dokumen satu kali dalam kategorinya. Statistik dan daftar mengikuti cakupan hak akses akun. User Biasa hanya melihat ringkasan dokumen disetujui; grafik tren SOP hanya mencakup SOP disetujui.</p>
    </div>
  </div>;
}
