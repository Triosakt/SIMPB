import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useNotifications } from "../context/NotificationContext.jsx";
import { useAuth } from "../context/AuthContext.jsx";

export default function NotifBell() {
  const { items, unread, markRead, markAllRead } = useNotifications();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(null);

  // SIMPB_NOTIF_NAV_V1: bedakan jenis dokumen dan maksud notifikasi.
  // Notifikasi lama hanya menyimpan type/title/message/sop_id, sehingga
  // untuk dokumen non-SOP belum tersedia ID detail yang dapat dipercaya.
  const targetFor = (n) => {
    const type = String(n.type || '').toLowerCase();
    const title = String(n.title || '').toLowerCase();
    const message = String(n.message || '').toLowerCase();
    const text = [type, title, message].join(' ');
    const isAdmin = user?.role === 'admin_ortala';
    const isSubmission = /pending|pengajuan|menunggu persetujuan|menunggu verifikasi|diajukan|submitted/.test(text)
      && !/disetujui|ditolak|dikembalikan|approved|rejected/.test(text);
    // Pengajuan baru milik Admin menuju antrean persetujuan.
    if (isAdmin && isSubmission) return '/dashboard/approval';
    // Keputusan untuk pengunggah menuju katalog jenis dokumennya.
    if (/standar[_ -]?pelayanan|standar_pending|standar_review/.test(text)) return '/standar-pelayanan';
    if (/peta proses|sub proses|cfm|proses|peta_|sub_|cfm_/.test(text)) return '/dashboard/manajemen-proses';
    if (/sop/.test(text)) return '/dashboard/sop';
    // Notifikasi lama tanpa metadata jenis: arahkan menurut peran.
    return isAdmin ? '/dashboard/approval' : '/dashboard';
  };

  const handleClick = async (n) => {
    if (busy !== null) return;
    setBusy(n.id);
    try {
      if (!Number(n.is_read)) {
        try { await markRead(n.id); }
        catch (error) { console.error("Gagal menandai notifikasi sudah dibaca", error); }
      }
      setOpen(false);
      navigate(targetFor(n));
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="relative">
      <button type="button" onClick={() => setOpen((v) => !v)}
        aria-label={`Notifikasi, ${unread} belum dibaca`}
        className="relative rounded-lg p-2 text-ink-soft hover:bg-surface-muted focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent">
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <path d="M18 8a6 6 0 1 0-12 0c0 7-3 9-3 9h18s-3-2-3-9M13.7 21a2 2 0 0 1-3.4 0" />
        </svg>
        {unread > 0 && <span className="absolute -right-0.5 -top-0.5 grid h-5 min-w-5 place-items-center rounded-full bg-red-600 px-1 text-[11px] font-semibold text-white">{unread > 9 ? "9+" : unread}</span>}
      </button>
      {open && (
        <div className="absolute right-0 z-30 mt-2 w-80 max-w-[90vw] overflow-hidden rounded-xl border border-line bg-white shadow-lg">
          <div className="flex items-center justify-between border-b border-line px-4 py-2.5">
            <span className="text-sm font-semibold">Notifikasi</span>
            {unread > 0 && <button type="button" onClick={() => markAllRead().catch(console.error)} className="text-xs font-medium text-accent hover:underline">Tandai semua dibaca</button>}
          </div>
          <ul className="max-h-80 divide-y divide-line overflow-y-auto">
            {items.length === 0 && <li className="px-4 py-6 text-center text-sm text-ink-soft">Belum ada notifikasi.</li>}
            {items.map((n) => (
              <li key={n.id}>
                <button type="button" disabled={busy !== null} onClick={() => handleClick(n)}
                  className={`block w-full px-4 py-3 text-left text-sm hover:bg-surface disabled:opacity-60 ${Number(n.is_read) ? "" : "bg-accent-soft/40"}`}>
                  <p className="font-medium">{n.title}</p>
                  <p className="mt-0.5 line-clamp-2 text-ink-soft">{n.message}</p>
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
