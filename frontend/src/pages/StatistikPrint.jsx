import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Area, AreaChart, CartesianGrid, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Building2, CheckCircle2, Clock3, FileCheck2, Layers3, Printer, RefreshCw, XCircle } from "lucide-react";
import api, { errMsg } from "../api/client.js";
import { useAuth } from "../context/AuthContext.jsx";

const TYPES = [
  { key: "peta", label: "Peta Proses", short: "Peta", color: "#1769AA" },
  { key: "sub", label: "Sub Proses", short: "Sub", color: "#0D9488" },
  { key: "cfm", label: "Cross Functional Map", short: "CFM", color: "#7C3AED" },
  { key: "sop", label: "SOP", short: "SOP", color: "#D97706" },
];
const STATUS = [
  { key: "approved", label: "Disetujui", color: "#059669" },
  { key: "pending", label: "Menunggu", color: "#d97706" },
  { key: "rejected", label: "Ditolak", color: "#dc2626" },
];
const n = value => Number(value || 0);
const fmt = value => new Intl.NumberFormat("id-ID").format(n(value));
const pct = (part, whole) => n(whole) > 0 ? Math.round(n(part) / n(whole) * 100) : null;
const safe = value => value == null || String(value).trim() === "" ? "Tidak ditentukan" : String(value);
const tooltipStyle = { backgroundColor: "#fff", border: "1px solid #cbd5e1", borderRadius: 12, boxShadow: "0 12px 30px #0f172a20", fontSize: 12 };

function Reveal({ children, delay = 0, className = "" }) {
  const ref = useRef(null);
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    if (typeof IntersectionObserver === "undefined") { setVisible(true); return; }
    const observer = new IntersectionObserver(entries => {
      if (entries.some(entry => entry.isIntersecting)) { setVisible(true); observer.disconnect(); }
    }, { threshold: 0.06, rootMargin: "0px 0px 40px 0px" });
    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, []);
  return <div ref={ref} className={`simpb-reveal ${visible ? "is-visible" : ""} ${className}`} style={{ "--reveal-delay": `${delay}ms` }}>{children}</div>;
}

function Panel({ title, subtitle, accent = "#2563eb", children, className = "" }) {
  return <section className={`simpb-panel min-w-0 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6 ${className}`} style={{ "--panel-accent": accent }}>
    <div className="mb-5 flex items-start gap-3">
      <span className="mt-1 h-8 w-1 shrink-0 rounded-full" style={{ background: accent }} />
      <div className="min-w-0"><h2 className="text-base font-extrabold tracking-tight text-slate-950 sm:text-lg">{title}</h2><p className="mt-1 text-sm leading-6 text-slate-600">{subtitle}</p></div>
    </div>
    {children}
  </section>;
}

function Empty({ children = "Belum ada data untuk ditampilkan." }) {
  return <div className="grid min-h-44 place-items-center rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-5 text-center text-sm font-medium text-slate-600">{children}</div>;
}

function AnimatedNumber({ value }) {
  const [display, setDisplay] = useState(0);
  useEffect(() => {
    if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) { setDisplay(n(value)); return; }
    let frame, start;
    const target = n(value);
    const step = now => {
      if (start === undefined) start = now;
      const progress = Math.min(1, (now - start) / 750);
      setDisplay(Math.round(target * (1 - Math.pow(1 - progress, 3))));
      if (progress < 1) frame = requestAnimationFrame(step);
    };
    frame = requestAnimationFrame(step);
    return () => cancelAnimationFrame(frame);
  }, [value]);
  return <>{fmt(display)}</>;
}

function Metric({ label, value, note, Icon, color }) {
  return <div className="simpb-metric relative h-full overflow-hidden rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5" style={{ "--panel-accent": color }}>
    <div className="absolute inset-x-0 top-0 h-1" style={{ background: color }} />
    <div className="flex items-start justify-between gap-2"><p className="text-sm font-bold text-slate-700">{label}</p><span className="rounded-xl p-2.5" style={{ background: color + "16", color }}><Icon size={20} /></span></div>
    <p className="mt-3 text-3xl font-black tabular-nums tracking-tight text-slate-950 sm:text-4xl"><AnimatedNumber value={value} /></p>
    <p className="mt-2 text-xs font-medium leading-5 text-slate-600">{note}</p>
  </div>;
}

function DataTable({ headers, rows }) {
  return <div className="w-full overflow-x-auto"><table className="w-full min-w-[520px] text-sm">
    <thead><tr className="border-b-2 border-slate-200 bg-slate-50 text-left text-slate-700">{headers.map((heading, index) => <th key={heading} className={`px-3 py-3 font-bold ${index ? "text-right" : ""}`}>{heading}</th>)}</tr></thead>
    <tbody>{rows.length ? rows.map((row, index) => <tr key={index} className="border-b border-slate-100 transition-colors hover:bg-blue-50/60">{row.map((cell, cellIndex) => <td key={cellIndex} className={`px-3 py-3 text-slate-800 ${cellIndex ? "text-right tabular-nums" : "font-semibold"}`}>{cell}</td>)}</tr>) : <tr><td colSpan={headers.length} className="py-8 text-center text-slate-500">Belum ada data</td></tr>}</tbody>
  </table></div>;
}

function Composition({ docs, total }) {
  const entries = docs.filter(doc => doc.total > 0);
  const largest = [...entries].sort((a, b) => b.total - a.total)[0];
  return <Panel title="Komposisi Dokumen" subtitle="Satu gambaran distribusi Peta Proses, Sub Proses, CFM, dan SOP." accent="#2563eb" className="h-full">
    {total ? <div className="grid items-center gap-5 sm:grid-cols-[minmax(0,220px)_minmax(0,1fr)] lg:grid-cols-1 xl:grid-cols-[minmax(0,200px)_minmax(0,1fr)]">
      <div className="relative mx-auto h-[220px] w-full max-w-[240px] min-w-0">
        <ResponsiveContainer width="100%" height="100%"><PieChart><Pie data={entries} dataKey="total" nameKey="label" innerRadius={65} outerRadius={93} paddingAngle={3} cornerRadius={5} animationDuration={900}>{entries.map(doc => <Cell key={doc.key} fill={doc.color} />)}</Pie><Tooltip contentStyle={tooltipStyle} formatter={value => [fmt(value), "Dokumen"]} /></PieChart></ResponsiveContainer>
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center"><b className="text-3xl font-black tabular-nums text-slate-950">{fmt(total)}</b><span className="text-xs font-semibold text-slate-500">Dokumen</span></div>
      </div>
      <div className="min-w-0 space-y-3">{docs.map(doc => <div key={doc.key} className="rounded-xl border border-slate-100 bg-slate-50 px-3 py-2.5">
        <div className="flex items-center justify-between gap-3"><div className="flex min-w-0 items-center gap-2"><span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: doc.color }} /><span className="text-xs font-bold leading-5 text-slate-700 sm:text-sm">{doc.label}</span></div><b className="shrink-0 text-sm tabular-nums text-slate-950">{fmt(doc.total)} <span className="font-medium text-slate-500">· {pct(doc.total, total)}%</span></b></div>
        <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-slate-200"><div className="simpb-grow h-full rounded-full" style={{ width: `${doc.total / total * 100}%`, background: doc.color }} /></div>
      </div>)}<p className="text-xs leading-5 text-slate-500">Kategori terbanyak: <b className="text-slate-700">{largest?.label}</b>.</p></div>
    </div> : <Empty>Belum ada dokumen pada pilihan ini.</Empty>}
  </Panel>;
}

function Trend({ docs, trend, years }) {
  return <Panel title="Tren Tahun Terbit" subtitle="Perkembangan jumlah dokumen berdasarkan tahun terbit." accent="#0891b2" className="h-full">
    {trend.length ? <>
      <div className="h-[290px] min-w-0"><ResponsiveContainer width="100%" height="100%"><AreaChart data={trend} margin={{ top: 12, right: 12, left: -18, bottom: 4 }}>
        <defs>{docs.map(doc => <linearGradient key={doc.key} id={`simpb-trend-${doc.key}`} x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor={doc.color} stopOpacity={0.28} /><stop offset="100%" stopColor={doc.color} stopOpacity={0.02} /></linearGradient>)}</defs>
        <CartesianGrid stroke="#e2e8f0" strokeDasharray="4 4" vertical={false} />
        <XAxis dataKey="year" tick={{ fill: "#475569", fontSize: 12 }} tickLine={false} axisLine={false} minTickGap={14} />
        <YAxis allowDecimals={false} width={35} tick={{ fill: "#475569", fontSize: 12 }} tickLine={false} axisLine={false} />
        <Tooltip contentStyle={tooltipStyle} formatter={(value, name) => [`${fmt(value)} dokumen`, name]} labelFormatter={year => `Tahun ${year}`} />
        {docs.map(doc => <Area key={doc.key} type="monotone" dataKey={doc.key} name={doc.label} stroke={doc.color} strokeWidth={3} fill={`url(#simpb-trend-${doc.key})`} dot={{ r: 3, fill: "#fff", strokeWidth: 2 }} activeDot={{ r: 5 }} animationDuration={1100} />)}
      </AreaChart></ResponsiveContainer></div>
      <div className="mt-3 flex flex-wrap justify-center gap-x-4 gap-y-2 border-t border-slate-100 pt-4">{docs.map(doc => <span key={doc.key} className="inline-flex items-center gap-2 text-xs font-bold text-slate-700"><i className="h-2.5 w-2.5 rounded-full" style={{ background: doc.color }} />{doc.short}</span>)}</div>
      <p className="mt-4 text-xs leading-5 text-slate-500">{years.length} tahun tercatat. Data tren SOP mengikuti cakupan API saat ini, yaitu SOP disetujui.</p>
    </> : <Empty>Belum ada data tahun terbit.</Empty>}
  </Panel>;
}

function PdfAvailability({ process }) {
  const total = process.reduce((sum, doc) => sum + doc.total, 0);
  const available = process.reduce((sum, doc) => sum + doc.withFile, 0);
  const percentage = pct(available, total);
  return <Panel title="Kelengkapan Berkas PDF" subtitle="Ketersediaan berkas pada Peta Proses, Sub Proses, dan CFM." accent="#0f766e" className="h-full">
    <div className="rounded-2xl border border-teal-100 bg-teal-50/70 p-4 sm:p-5"><div className="flex items-center justify-between gap-3"><div><p className="text-xs font-bold uppercase tracking-wider text-teal-800">PDF tersedia</p><p className="mt-2 text-4xl font-black tabular-nums text-slate-950">{percentage === null ? "—" : `${percentage}%`}</p><p className="mt-1 text-sm font-semibold text-slate-700">{fmt(available)} dari {fmt(total)} dokumen</p></div><span className="rounded-2xl border border-teal-200 bg-white p-4 text-teal-700"><FileCheck2 size={30} /></span></div><div className="mt-4 h-2.5 overflow-hidden rounded-full bg-teal-100"><div className="simpb-grow h-full rounded-full bg-teal-600" style={{ width: `${percentage ?? 0}%` }} /></div></div>
    <div className="mt-5 space-y-4">{process.map(doc => { const value = pct(doc.withFile, doc.total); return <div key={doc.key}><div className="mb-2 flex flex-wrap items-center justify-between gap-2 text-sm"><span className="inline-flex items-center gap-2 font-bold text-slate-700"><i className="h-2.5 w-2.5 rounded-full" style={{ background: doc.color }} />{doc.label}</span><b className="tabular-nums text-slate-900">{value === null ? "Belum ada dokumen" : `${fmt(doc.withFile)}/${fmt(doc.total)} · ${value}%`}</b></div><div className="h-2 overflow-hidden rounded-full bg-slate-100"><div className="simpb-grow h-full rounded-full" style={{ width: `${value ?? 0}%`, background: doc.color }} /></div></div>; })}</div>
    <p className="mt-5 rounded-xl border border-orange-100 bg-orange-50 p-3 text-xs leading-5 text-orange-900"><b>SOP:</b> data kelengkapan PDF belum tersedia dari endpoint statistik, sehingga tidak dihitung dalam persentase di atas.</p>
    {total > 0 && <p className="mt-3 text-xs font-semibold leading-5 text-slate-600">{available === total ? "Semua dokumen yang tercakup sudah memiliki PDF." : `${fmt(total - available)} dokumen yang tercakup belum memiliki PDF.`}</p>}
  </Panel>;
}

function UnitContribution({ rows, error }) {
  const [showAll, setShowAll] = useState(false);
  const active = [...rows].filter(row => n(row.total) > 0).sort((a, b) => n(b.total) - n(a.total));
  const max = Math.max(1, ...active.map(row => n(row.total)));
  const palette = ["#b45309", "#64748b", "#c2410c"];
  const move = event => {
    if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches || event.pointerType === "touch") return;
    const el = event.currentTarget, rect = el.getBoundingClientRect();
    const x = (event.clientX - rect.left) / rect.width - 0.5;
    const y = (event.clientY - rect.top) / rect.height - 0.5;
    el.style.setProperty("--rx", `${-y * 6}deg`);
    el.style.setProperty("--ry", `${x * 8}deg`);
  };
  const reset = event => { event.currentTarget.style.setProperty("--rx", "0deg"); event.currentTarget.style.setProperty("--ry", "0deg"); };
  return <Panel title="Kontribusi Unit Kerja" subtitle="Sebaran keterkaitan dokumen antarunit, bukan jumlah dokumen unik secara global." accent="#6366f1">
    <div className="mb-5 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-indigo-100 bg-indigo-50 p-4"><div><p className="text-xs font-bold uppercase tracking-wider text-indigo-700">Unit dengan dokumen terkait</p><p className="mt-1 text-2xl font-black tabular-nums text-slate-950">{fmt(active.length)} <span className="text-base font-semibold text-slate-500">/ {fmt(rows.length)} unit</span></p></div><Building2 className="text-indigo-600" size={28} /></div>
    {active.length ? <>
      <div className="grid gap-3 md:grid-cols-3">{active.slice(0, 3).map((row, index) => <div key={row.unit_kerja_id || row.unit} className="unit-card relative overflow-hidden rounded-2xl border border-slate-200 bg-white p-4" style={{ "--unit-color": palette[index], "--unit-delay": `${index * 100}ms` }} onPointerMove={move} onPointerLeave={reset}>
        <div className="flex items-start justify-between gap-2"><div className="min-w-0"><p className="text-[11px] font-extrabold uppercase tracking-wider text-slate-500">Peringkat {index + 1}</p><h3 className="mt-2 break-words font-black text-slate-950">{row.unit}</h3></div><span className="rounded-xl px-3 py-2 text-sm font-black" style={{ color: palette[index], background: palette[index] + "16" }}>#{index + 1}</span></div>
        <p className="mt-4 text-3xl font-black tabular-nums text-slate-950"><AnimatedNumber value={row.total} /> <span className="text-xs font-semibold text-slate-500">dokumen terkait</span></p>
        <div className="mt-3 flex h-2 overflow-hidden rounded-full bg-slate-100">{TYPES.map(type => <span key={type.key} title={`${type.label}: ${fmt(row[type.key])}`} style={{ width: `${n(row[type.key]) / Math.max(1, n(row.total)) * 100}%`, background: type.color }} />)}</div>
      </div>)}</div>
      <div className="mt-6 rounded-2xl border border-slate-200 bg-slate-50/70 p-4 sm:p-5"><div className="mb-5 flex flex-wrap items-start justify-between gap-3"><div><h3 className="font-extrabold text-slate-950">Sebaran Dokumen per Unit</h3><p className="mt-1 text-xs leading-5 text-slate-600">Batang berwarna menunjukkan jenis dokumen pada unit aktif.</p></div><div className="flex flex-wrap gap-x-3 gap-y-2">{TYPES.map(type => <span key={type.key} className="inline-flex items-center gap-1.5 text-[11px] font-bold text-slate-600"><i className="h-2.5 w-2.5 rounded-full" style={{ background: type.color }} />{type.short}</span>)}</div></div>
        <div className="space-y-5">{active.map((row, index) => <div key={row.unit_kerja_id || row.unit}><div className="mb-2 flex items-center justify-between gap-3"><span className="min-w-0 truncate text-sm font-bold text-slate-800" title={row.unit}>{index + 1}. {row.unit}</span><b className="shrink-0 text-sm tabular-nums text-slate-950">{fmt(row.total)}</b></div><div className="h-5 overflow-hidden rounded-lg bg-slate-200"><div className="simpb-grow flex h-full overflow-hidden rounded-lg" style={{ width: `${n(row.total) / max * 100}%` }}>{TYPES.map(type => n(row[type.key]) > 0 && <span key={type.key} title={`${type.label}: ${fmt(row[type.key])}`} className="flex h-full items-center justify-center overflow-hidden border-r border-white/20 text-[10px] font-black text-white last:border-0" style={{ width: `${n(row[type.key]) / n(row.total) * 100}%`, background: type.color }}>{fmt(row[type.key])}</span>)}</div></div></div>)}</div>
      </div>
      <div className="mt-5 overflow-hidden rounded-2xl border border-slate-200"><div className="flex flex-wrap items-center justify-between gap-3 p-4"><div><h3 className="font-extrabold text-slate-950">Rincian Unit Kerja</h3><p className="mt-1 text-xs text-slate-600">Data keterkaitan berdasarkan kategori</p></div><button type="button" onClick={() => setShowAll(value => !value)} className="simpb-no-print rounded-xl border border-indigo-200 bg-indigo-50 px-4 py-2 text-xs font-extrabold text-indigo-700 transition hover:bg-indigo-100">{showAll ? "Unit aktif saja" : "Tampilkan seluruh unit"}</button></div><DataTable headers={["Unit Kerja", "Peta", "Sub", "CFM", "SOP", "Total terkait"]} rows={(showAll ? rows : active).map(row => [row.unit, fmt(row.peta), fmt(row.sub), fmt(row.cfm), fmt(row.sop), <b key="total">{fmt(row.total)}</b>])} /></div>
      <p className="mt-4 text-xs leading-5 text-slate-500">Satu dokumen dapat terkait dengan beberapa unit. Karena itu, penjumlahan lintas unit bisa melebihi total dokumen unik.</p>
    </> : <Empty>{error || "Belum ada unit kerja yang memiliki dokumen terkait."}</Empty>}
  </Panel>;
}

export default function StatistikPrint() {
  const { user } = useAuth();
  const [data, setData] = useState(null);
  const [units, setUnits] = useState(null);
  const [error, setError] = useState("");
  const [unitError, setUnitError] = useState("");
  const [busy, setBusy] = useState(true);
  const [selected, setSelected] = useState("all");

  const load = useCallback(async () => {
    setBusy(true); setError(""); setUnitError("");
    try {
      const [summary, process] = await Promise.all([api.get("/stats/summary"), api.get("/stats/process-summary")]);
      setData({ s: summary.data, p: process.data });
    } catch (err) { setError(errMsg(err)); }
    try {
      const response = await api.get("/stats/unit-summary");
      setUnits(response.data);
    } catch (err) {
      setUnitError("Data kontribusi unit kerja belum dapat dimuat.");
      setUnits(null);
    }
    setBusy(false);
  }, []);
  useEffect(() => { load(); }, [load]);

  const docs = useMemo(() => {
    if (!data) return [];
    const process = TYPES.slice(0, 3).map(type => {
      const item = (data.p.documents || []).find(doc => doc.type === type.key) || {};
      return { ...type, total: n(item.total), withFile: n(item.with_file), years: item.years || [], status: Object.fromEntries(STATUS.map(status => [status.key, n(item.statuses?.find(row => row.status === status.key)?.total)])) };
    });
    const summary = data.s;
    return [...process, { ...TYPES[3], total: (summary.byStatus || []).reduce((sum, row) => sum + n(row.total), 0), withFile: null, years: summary.byYear || [], status: Object.fromEntries(STATUS.map(status => [status.key, n(summary.byStatus?.find(row => row.status === status.key)?.total)])) }];
  }, [data]);

  if (!data) return <div className="rounded-2xl bg-white p-12 text-center font-semibold text-slate-700">{busy ? "Memuat statistik SIMPB…" : <>{error || "Data tidak tersedia."} <button type="button" onClick={load} className="ml-2 text-blue-700 underline">Coba lagi</button></>}</div>;

  const { s, p } = data;
  const total = docs.reduce((sum, doc) => sum + doc.total, 0);
  const approved = docs.reduce((sum, doc) => sum + doc.status.approved, 0);
  const pending = docs.reduce((sum, doc) => sum + doc.status.pending, 0);
  const rejected = docs.reduce((sum, doc) => sum + doc.status.rejected, 0);
  const shown = selected === "all" ? docs : docs.filter(doc => doc.key === selected);
  const shownTotal = shown.reduce((sum, doc) => sum + doc.total, 0);
  const years = [...new Set(shown.flatMap(doc => doc.years.map(row => safe(row.tahun))))].sort((a, b) => a.localeCompare(b, "id", { numeric: true }));
  const trend = years.map(year => ({ year, ...Object.fromEntries(shown.map(doc => [doc.key, n(doc.years.find(row => safe(row.tahun) === year)?.total)])) }));
  const printed = new Date(p.generated_at || s.generated_at || Date.now()).toLocaleString("id-ID", { dateStyle: "long", timeStyle: "short" });

  return <div className="simpb-report mx-auto w-full max-w-7xl min-w-0 space-y-5 pb-14 text-slate-900 sm:space-y-6">
    <style>{`
      .simpb-report,.simpb-report *{box-sizing:border-box}
      .simpb-report .grid,.simpb-report .grid>*{min-width:0}
      .simpb-report .recharts-responsive-container{max-width:100%;min-width:0}
      .simpb-reveal{opacity:0;transform:translateY(22px);transition:opacity .65s ease,transform .65s cubic-bezier(.2,.75,.2,1);transition-delay:var(--reveal-delay,0ms)}
      .simpb-reveal.is-visible{opacity:1;transform:none}
      .simpb-panel,.simpb-metric{transition:box-shadow .3s ease,border-color .3s ease}
      .simpb-panel:hover,.simpb-metric:hover{border-color:var(--panel-accent,#94a3b8);box-shadow:0 12px 35px #0f172a12}
      .simpb-grow{transform-origin:left center;animation:simpb-grow 1s cubic-bezier(.16,1,.3,1) both}
      @keyframes simpb-grow{from{transform:scaleX(0)}to{transform:scaleX(1)}}
      .unit-card{--rx:0deg;--ry:0deg;transform:perspective(900px) rotateX(var(--rx)) rotateY(var(--ry));transition:transform .2s ease,border-color .3s ease,box-shadow .3s ease;animation:unit-appear .65s both;animation-delay:var(--unit-delay,0ms)}
      .unit-card:hover{border-color:var(--unit-color);box-shadow:0 16px 36px #0f172a17}
      @keyframes unit-appear{from{opacity:0}to{opacity:1}}
      @media(prefers-reduced-motion:reduce){.simpb-reveal,.simpb-grow,.unit-card,.simpb-panel,.simpb-metric{opacity:1!important;animation:none!important;transition:none!important;transform:none!important}}
      @media screen{.simpb-print-head{display:none!important}}
      @media print{
        @page{size:A4 portrait;margin:12mm}
        body{background:white!important}
        .simpb-no-print{display:none!important}
        .simpb-print-head{display:block!important}
        .simpb-report{max-width:none!important;padding:0!important}
        .simpb-reveal,.simpb-grow,.unit-card{opacity:1!important;animation:none!important;transition:none!important;transform:none!important}
        .simpb-panel,.simpb-metric{box-shadow:none!important;break-inside:avoid;page-break-inside:avoid}
        .simpb-report .grid{gap:10px!important}
        .recharts-wrapper *{animation:none!important;transition:none!important}
      }
    `}</style>

    <Reveal><header className="simpb-no-print relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#0b2146] via-[#174a89] to-[#087f9c] text-white shadow-xl min-h-[180px] sm:min-h-[210px] px-6 py-7 sm:px-8 sm:py-8 flex flex-col justify-center">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 z-0 bg-cover bg-center bg-no-repeat"
          style={{
            backgroundImage:
              'linear-gradient(90deg, rgba(9,42,76,.96) 0%, rgba(16,75,122,.88) 52%, rgba(23,105,170,.70) 100%), url("/img/kantor.jpg")'
          }}
        />

      <div className="pointer-events-none absolute -right-16 -top-24 h-72 w-72 rounded-full border border-white/20 bg-white/5" />
      <div className="relative flex flex-wrap items-start justify-between gap-5"><div className="min-w-0"><p className="text-xs font-extrabold uppercase tracking-[.2em] text-cyan-200">SIMPB BAPETEN · Analitik Terpadu</p><h1 className="mt-3 text-3xl font-black tracking-tight sm:text-4xl">Statistik & Cetak</h1><p className="mt-3 max-w-2xl text-sm leading-7 text-blue-50">Ringkasan dokumen, perkembangan tahun terbit, kelengkapan PDF, dan kontribusi unit kerja.</p><p className="mt-4 text-xs font-semibold text-cyan-100">Data diperbarui: {printed}</p></div><div className="flex flex-wrap gap-2"><button type="button" onClick={load} disabled={busy} className="inline-flex items-center gap-2 rounded-xl border border-white/40 bg-white/15 px-4 py-2.5 text-sm font-bold text-white transition hover:bg-white/25 disabled:opacity-50"><RefreshCw size={16} className={busy ? "animate-spin" : ""} />{busy ? "Memuat…" : "Perbarui"}</button><button type="button" onClick={() => window.print()} className="inline-flex items-center gap-2 rounded-xl bg-white px-4 py-2.5 text-sm font-extrabold text-blue-950 transition hover:bg-cyan-50"><Printer size={16} />Cetak / Simpan PDF</button></div></div>
    </header></Reveal>
    <header className="simpb-print-head border-b-2 border-slate-800 pb-3"><h1 className="text-xl font-black">Laporan Statistik SIMPB BAPETEN</h1><p className="text-xs">Dicetak {printed} · {user?.name || "Pengguna"}</p></header>
    {error && <div role="alert" className="rounded-xl border border-amber-300 bg-amber-50 p-4 text-sm text-amber-950">Pembaruan gagal: {error}. Data terakhir tetap ditampilkan.</div>}
    <Reveal><div className="grid grid-cols-2 gap-3 lg:grid-cols-4"><Metric label="Total Dokumen" value={total} note="Seluruh jenis dan status" Icon={Layers3} color="#2563eb" /><Metric label="Disetujui" value={approved} note={`${pct(approved, total) ?? "—"}% dari total`} Icon={CheckCircle2} color="#059669" /><Metric label="Menunggu" value={pending} note="Belum diputuskan" Icon={Clock3} color="#d97706" /><Metric label="Ditolak" value={rejected} note="Pengajuan ditolak" Icon={XCircle} color="#dc2626" /></div></Reveal>
    <Reveal><div className="simpb-no-print flex flex-wrap items-center gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"><label htmlFor="simpb-focus" className="text-sm font-extrabold text-slate-800">Fokus grafik</label><select id="simpb-focus" value={selected} onChange={event => setSelected(event.target.value)} className="min-w-0 rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-900 focus:border-blue-600 focus:outline-none"><option value="all">Seluruh dokumen</option>{TYPES.map(type => <option key={type.key} value={type.key}>{type.label}</option>)}</select><span className="text-xs leading-5 text-slate-600">Filter berlaku untuk komposisi dan tren. KPI serta rekap tetap menampilkan total global.</span></div></Reveal>
    <div className="grid items-stretch gap-5 lg:grid-cols-2"><Reveal className="h-full"><Composition docs={shown} total={shownTotal} /></Reveal><Reveal delay={80} className="h-full"><Trend docs={shown} trend={trend} years={years} /></Reveal></div>
    <div className="grid items-stretch gap-5 lg:grid-cols-2"><Reveal className="h-full"><PdfAvailability process={docs.filter(doc => doc.key !== "sop")} /></Reveal><Reveal delay={80} className="h-full"><Panel title="Catatan Pembacaan Statistik" subtitle="Informasi penting agar angka pada dashboard tidak disalahartikan." accent="#64748b" className="h-full"><div className="space-y-4 text-sm leading-6 text-slate-700"><div className="rounded-xl border border-slate-200 bg-slate-50 p-4"><b className="text-slate-900">Cakupan data</b><p className="mt-1">{p.scope === "seluruh_pengajuan" ? "Seluruh pengajuan dalam sistem." : "Data sesuai hak akses akun dan unit kerja terkait."} KPI dan rekap menghitung seluruh status dokumen.</p></div><div className="rounded-xl border border-slate-200 bg-slate-50 p-4"><b className="text-slate-900">Tren SOP</b><p className="mt-1">Data tahun SOP dari API saat ini hanya mencakup SOP yang disetujui. Tahun pada grafik adalah tahun terbit.</p></div><div className="rounded-xl border border-slate-200 bg-slate-50 p-4"><b className="text-slate-900">Dokumen lintas unit</b><p className="mt-1">Satu dokumen dihitung satu kali dalam total global, tetapi dapat muncul pada beberapa unit kerja yang terkait.</p></div></div></Panel></Reveal></div>
    <Reveal><UnitContribution rows={units?.units || []} error={unitError} /></Reveal>
    <Reveal><Panel title="Rekapitulasi Seluruh Dokumen" subtitle="Rincian resmi per kategori dan status, tanpa penggandaan dokumen multi-unit." accent="#1d4ed8"><DataTable headers={["Jenis Dokumen", "Disetujui", "Menunggu", "Ditolak", "Total"]} rows={[...docs.map(doc => [doc.label, fmt(doc.status.approved), fmt(doc.status.pending), fmt(doc.status.rejected), <b key="total">{fmt(doc.total)}</b>]), [<b key="label">TOTAL</b>, <b key="approved">{fmt(approved)}</b>, <b key="pending">{fmt(pending)}</b>, <b key="rejected">{fmt(rejected)}</b>, <b key="total">{fmt(total)}</b>]]} /></Panel></Reveal>
    <footer className="border-t border-slate-200 pt-4 text-xs leading-6 text-slate-600">SIMPB BAPETEN · Data diambil {printed}. Angka pada dashboard mengikuti cakupan data yang disediakan sistem.</footer>
  </div>;
}
