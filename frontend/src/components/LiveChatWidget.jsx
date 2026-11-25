import { useCallback, useEffect, useRef, useState } from "react";
import { MessageCircle, X, Send, Building2, UserRound, Minus, Paperclip, FileText, Image as ImageIcon } from "lucide-react";
import api, { errMsg } from "../api/client.js";
import { useAuth } from "../context/AuthContext.jsx";
import { useNotifications } from "../context/NotificationContext.jsx";

const ADMIN = "admin_ortala";
const UNIT = "perwakilan_unit";

function timeLabel(value) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleTimeString("id-ID", {
    hour: "2-digit",
    minute: "2-digit"
  });
}


function mergeChatMessages(previous, incoming, conversationId = null) {
  const merged = new Map();

  for (const item of previous || []) {
    if (
      conversationId === null ||
      String(item.conversation_id) === String(conversationId)
    ) {
      merged.set(String(item.id), item);
    }
  }

  for (const item of incoming || []) {
    merged.set(String(item.id), item);
  }

  return [...merged.values()].sort((a, b) => {
    const timeA = new Date(a.created_at).getTime() || 0;
    const timeB = new Date(b.created_at).getTime() || 0;
    return timeA - timeB || Number(a.id) - Number(b.id);
  });
}

export default function LiveChatWidget() {
  const { user } = useAuth();
  const { socket } = useNotifications();

  const isAdmin = user?.role === ADMIN;
  const isUnit = user?.role === UNIT;
  const allowed = isAdmin || isUnit;

  const [open, setOpen] = useState(false);
  const [conversations, setConversations] = useState([]);
  const [selected, setSelected] = useState(null);
  const [messages, setMessages] = useState([]);
  const [draft, setDraft] = useState("");
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const [chatToast, setChatToast] = useState(null);
  const [unitUnread, setUnitUnread] = useState(0);
  const bottomRef = useRef(null);
  const fileInputRef = useRef(null);
  const [attachment, setAttachment] = useState(null);
  const [previewUrl, setPreviewUrl] = useState("");
  const [attachmentUrls, setAttachmentUrls] = useState({});

  const loadConversations = useCallback(async () => {
    const response = await api.get("/chat/conversations");
    const rows = response.data.data || [];
    setConversations(rows);

    setSelected((current) => {
      if (current && rows.some((item) => String(item.id) === String(current))) {
        return current;
      }
      return rows.length ? String(rows[0].id) : null;
    });

    return rows;
  }, []);

  const loadMessages = useCallback(async (conversationId) => {
    if (!isAdmin && !isUnit) return;

    try {
      setError("");
      const response = isAdmin
        ? await api.get("/chat/conversations/" + conversationId + "/messages")
        : await api.get("/chat/messages");

      setMessages((previous) => mergeChatMessages(previous, response.data.data || [], conversationId));

      if (isAdmin) {
        await api.patch("/chat/conversations/" + conversationId + "/read");
      } else {
        await api.patch("/chat/read");
      }
    } catch (err) {
      setError(errMsg(err));
    }
  }, [isAdmin, isUnit]);

  useEffect(() => {
    if (!open || !allowed) return;

    let active = true;

    async function initialize() {
      setLoading(true);
      setError("");

      try {
        if (isAdmin) {
          const response = await api.get("/chat/conversations");
          if (!active) return;

          const rows = response.data.data || [];
          setConversations(rows);
          setSelected((current) => {
            if (current && rows.some((item) => String(item.id) === String(current))) {
              return current;
            }
            return rows.length ? String(rows[0].id) : null;
          });
        } else {
          const response = await api.get("/chat/messages");
          if (!active) return;
          setMessages((previous) => mergeChatMessages(previous, response.data.data || []));
          await api.patch("/chat/read");
        }
      } catch (err) {
        if (active) setError(errMsg(err));
      } finally {
        if (active) setLoading(false);
      }
    }

    initialize();

    return () => {
      active = false;
    };
  }, [open, allowed, isAdmin, isUnit]);

  useEffect(() => {
    if (!open || !isAdmin || !selected) return;
    loadMessages(selected);
  }, [open, isAdmin, selected, loadMessages]);

  useEffect(() => {
    if (!socket || !allowed) return;

    const handleRealtimeIncoming = (incoming) => {
      if (!incoming) return;

      if (isUnit) {
        if (open) {
          setMessages((previous) => {
            if (previous.some((item) => String(item.id) === String(incoming.id))) return previous;
            return [...previous, incoming];
          });
          api.patch("/chat/read").catch(() => {});
        } else {
          setUnitUnread((count) => count + 1);
          setChatToast({
            title: incoming.sender_name || "Admin Ortala",
            message: incoming.message || "Mengirim pesan baru"
          });
        }
        return;
      }

      if (isAdmin) {
        const active = open && selected &&
          String(incoming.conversation_id) === String(selected);

        if (active) {
          setMessages((previous) => {
            if (previous.some((item) => String(item.id) === String(incoming.id))) return previous;
            return [...previous, incoming];
          });
          api.patch("/chat/conversations/" + selected + "/read")
            .then(() => loadConversations())
            .catch(() => {});
        } else {
          setChatToast({
            title: incoming.sender_name || "Perwakilan Unit",
            message: incoming.message || "Mengirim pesan baru"
          });
          loadConversations().catch(() => {});
        }
      }
    };

    socket.on("chat:message", handleRealtimeIncoming);
    return () => socket.off("chat:message", handleRealtimeIncoming);
  }, [socket, allowed, open, isAdmin, isUnit, selected, loadConversations]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, open]);

  useEffect(() => {
    if (!attachment) {
      setPreviewUrl("");
      return;
    }

    const url = URL.createObjectURL(attachment);
    setPreviewUrl(url);

    return () => URL.revokeObjectURL(url);
  }, [attachment]);

  useEffect(() => {
    let active = true;
    const urls = {};

    async function loadAttachmentPreviews() {
      const items = messages.filter((item) => item.attachment_name);

      await Promise.all(items.map(async (item) => {
        try {
          const response = await api.get(
            "/chat/attachments/" + item.id,
            { responseType: "blob" }
          );

          if (!active) return;
          urls[item.id] = URL.createObjectURL(response.data);
          setAttachmentUrls((previous) => ({
            ...previous,
            [item.id]: urls[item.id]
          }));
        } catch {
          // Lampiran yang gagal dimuat tidak mengganggu pesan lainnya.
        }
      }));
    }

    loadAttachmentPreviews();

    return () => {
      active = false;
      Object.values(urls).forEach((url) => URL.revokeObjectURL(url));
    };
  }, [messages]);

  const sendMessage = async (event) => {
    event.preventDefault();
    const content = draft.trim();

    if ((!content && !attachment) || sending) return;
    if (isAdmin && !selected) return;

    setSending(true);
    setError("");

    try {
      const formData = new FormData();
      if (content) formData.append("message", content);
      if (attachment) formData.append("attachment", attachment);

      const response = isAdmin
        ? await api.post(
            "/chat/conversations/" + selected + "/messages",
            formData
          )
        : await api.post("/chat/messages", formData);

      const sent = response.data.data;

      setMessages((previous) => {
        if (previous.some((item) => String(item.id) === String(sent.id))) {
          return previous;
        }
        return [...previous, sent];
      });

      setDraft("");
      setAttachment(null);
      if (fileInputRef.current) fileInputRef.current.value = "";

      if (isAdmin) loadConversations().catch(() => {});
    } catch (err) {
      setError(errMsg(err));
    } finally {
      setSending(false);
    }
  };  if (!allowed) return null;

  const activeConversation = conversations.find(
    (item) => String(item.id) === String(selected)
  );

  const totalUnread = isAdmin
    ? conversations.reduce((total, item) => total + (Number(item.unread_count) || 0), 0)
    : unitUnread;

  return (
    <div className="fixed bottom-5 right-5 z-[80] flex flex-col items-end gap-3 sm:bottom-7 sm:right-7">
      {chatToast && !open && (
        <button
          type="button"
          onClick={() => {
            setOpen(true);
            setChatToast(null);
          }}
          className="w-[min(340px,calc(100vw-28px))] rounded-2xl border border-sky-100 bg-white p-4 text-left shadow-[0_12px_40px_rgba(5,35,70,0.22)]"
        >
          <span className="flex items-center gap-2 text-xs font-extrabold text-[#087fbe]">
            <MessageCircle size={16} />
            Pesan baru · {chatToast.title}
          </span>
          <span className="mt-2 block break-words text-xs text-slate-600">
            {chatToast.message}
          </span>
          <span className="mt-2 block text-[10px] font-bold text-sky-600">
            Klik untuk membuka Live Chat
          </span>
        </button>
      )}

      {open && (
        <section className="flex h-[min(600px,calc(100dvh-115px))] w-[min(390px,calc(100vw-28px))] flex-col overflow-hidden rounded-[25px] border border-white/70 bg-white shadow-[0_25px_80px_rgba(5,35,70,0.28)] ring-1 ring-slate-200/70">
          <header className="relative flex shrink-0 items-center gap-3 overflow-hidden bg-gradient-to-br from-[#071a35] via-[#104b7a] to-[#087fbe] px-4 py-4 text-white">
            <div className="pointer-events-none absolute -right-8 -top-12 h-36 w-36 rounded-full border-[20px] border-white/[0.06]" />
            <div className="relative flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-white/20 bg-white/15 shadow-inner">
              <MessageCircle size={22} />
            </div>
            <div className="relative min-w-0 flex-1">
              <h2 className="truncate text-sm font-extrabold tracking-wide">
                {isAdmin ? "Live Chat SIMPB" : "Hubungi Admin Ortala"}
              </h2>
              <p className="mt-1 flex items-center gap-1.5 text-[11px] text-blue-100">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-300 shadow-[0_0_8px_rgba(110,231,183,0.9)]" />
                Komunikasi internal
              </p>
            </div>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="relative rounded-xl p-2 text-white/80 transition hover:bg-white/15 hover:text-white"
              aria-label="Tutup live chat"
            >
              <Minus size={19} />
            </button>
          </header>

          {isAdmin && (
            <div className="shrink-0 border-b border-slate-100 bg-slate-50 px-3 py-2">
              <label className="mb-1 block text-[10px] font-bold uppercase tracking-wider text-slate-400">
                Pilih unit kerja
              </label>
              <select
                value={selected || ""}
                onChange={(event) => setSelected(event.target.value || null)}
                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-xs font-semibold text-[#173b5b] outline-none focus:border-sky-400"
              >
                <option value="">Pilih percakapan unit...</option>
                {conversations.map((item) => (
                  <option key={item.id} value={String(item.id)}>
                    {item.nama_unit} {item.singkatan ? "(" + item.singkatan + ")" : ""}
                    {Number(item.unread_count) > 0 ? " • Pesan baru" : ""}
                  </option>
                ))}
              </select>
            </div>
          )}

          <div className="flex min-h-0 flex-1 flex-col bg-[#f4f8fc]">
            <div className="flex-1 space-y-3 overflow-y-auto px-3 py-4">
              {loading && (
                <p className="py-8 text-center text-xs text-slate-400">
                  Memuat percakapan...
                </p>
              )}

              {!loading && isAdmin && !selected && (
                <div className="flex h-full flex-col items-center justify-center px-5 text-center">
                  <Building2 size={35} className="text-slate-300" />
                  <p className="mt-3 text-sm font-bold text-slate-500">
                    Belum ada percakapan
                  </p>
                  <p className="mt-1 text-xs leading-relaxed text-slate-400">
                    Percakapan unit akan muncul setelah Perwakilan Unit membuka Live Chat.
                  </p>
                </div>
              )}

              {!loading && messages.length === 0 && (!isAdmin || selected) && (
                <div className="flex min-h-[180px] flex-col items-center justify-center text-center">
                  <MessageCircle size={32} className="text-slate-300" />
                  <p className="mt-2 text-xs font-semibold text-slate-500">
                    Belum ada pesan
                  </p>
                  <p className="mt-1 text-[11px] text-slate-400">
                    Silakan mulai percakapan.
                  </p>
                </div>
              )}

              {messages.map((item) => {
                const mine = String(item.sender_id) === String(user?.id);

                return (
                  <div
                    key={item.id}
                    className={"flex " + (mine ? "justify-end" : "justify-start")}
                  >
                    <div className="max-w-[85%]">
                      {!mine && (
                        <p className="mb-1 ml-1 flex items-center gap-1 text-[10px] font-semibold text-slate-400">
                          <UserRound size={11} />
                          {item.sender_name || "Pengguna"}
                        </p>
                      )}
                      <div className={
                        "rounded-2xl px-3.5 py-2.5 shadow-sm " +
                        (mine
                          ? "rounded-br-md bg-gradient-to-br from-[#087fbe] to-[#15528d] text-white"
                          : "rounded-bl-md border border-slate-200 bg-white text-slate-700")
                      }>
                        {item.message && (
                          <p className="whitespace-pre-wrap break-words text-xs leading-relaxed">
                            {item.message}
                          </p>
                        )}

                        {item.attachment_name && (
                          <div className={item.message ? "mt-2" : ""}>
                            {item.attachment_mime?.startsWith("image/") ? (
                              attachmentUrls[item.id] ? (
                                <a
                                  href={attachmentUrls[item.id]}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="block"
                                >
                                  <img
                                    src={attachmentUrls[item.id]}
                                    alt={item.attachment_name}
                                    className="max-h-56 max-w-full rounded-xl object-contain"
                                  />
                                </a>
                              ) : (
                                <div className="flex items-center gap-2 rounded-xl bg-slate-100/20 px-3 py-4 text-[10px]">
                                  <ImageIcon size={17} />
                                  Memuat gambar...
                                </div>
                              )
                            ) : (
                              <a
                                href={attachmentUrls[item.id] || undefined}
                                target="_blank"
                                rel="noreferrer"
                                className={
                                  "flex items-center gap-2 rounded-xl border px-3 py-2 text-xs " +
                                  (mine
                                    ? "border-white/20 bg-white/10 text-white"
                                    : "border-slate-200 bg-slate-50 text-slate-700")
                                }
                              >
                                <FileText size={22} className="shrink-0" />
                                <span className="min-w-0 flex-1">
                                  <span className="block break-all font-semibold">
                                    {item.attachment_name}
                                  </span>
                                  <span className="text-[10px] opacity-70">
                                    PDF · {Number(item.attachment_size || 0) > 0
                                      ? (Number(item.attachment_size) / 1024 / 1024).toFixed(2) + " MB"
                                      : "Dokumen"}
                                  </span>
                                </span>
                              </a>
                            )}
                          </div>
                        )}
                        <p className={
                          "mt-1.5 text-right text-[9px] " +
                          (mine ? "text-white/65" : "text-slate-400")
                        }>
                          {timeLabel(item.created_at)}
                        </p>
                      </div>
                    </div>
                  </div>
                );
              })}
              <div ref={bottomRef} />
            </div>

            {error && (
              <p className="mx-3 mb-2 rounded-lg bg-red-50 px-3 py-2 text-[11px] text-red-600">
                {error}
              </p>
            )}

            <form onSubmit={sendMessage} className="shrink-0 border-t border-slate-100 bg-white p-3">
              <input
                ref={fileInputRef}
                type="file"
                accept=".jpg,.jpeg,.png,.webp,.pdf,image/jpeg,image/png,image/webp,application/pdf"
                className="hidden"
                onChange={(event) => {
                  const selectedFile = event.target.files?.[0];
                  if (!selectedFile) return;

                  const extension = selectedFile.name.split(".").pop().toLowerCase();
                  const allowedTypes = ["jpg", "jpeg", "png", "webp", "pdf"];

                  if (!allowedTypes.includes(extension)) {
                    setError("Format file harus JPG, JPEG, PNG, WebP, atau PDF.");
                    event.target.value = "";
                    return;
                  }

                  const isPdf = extension === "pdf";
                  const maxSize = isPdf ? 20 * 1024 * 1024 : 5 * 1024 * 1024;

                  if (selectedFile.size > maxSize) {
                    setError(isPdf
                      ? "Ukuran PDF maksimal 20 MB."
                      : "Ukuran gambar maksimal 5 MB."
                    );
                    event.target.value = "";
                    return;
                  }

                  if (
                    (isPdf && selectedFile.type !== "application/pdf") ||
                    (!isPdf && !["image/jpeg", "image/png", "image/webp"].includes(selectedFile.type))
                  ) {
                    setError("Jenis file tidak sesuai dengan format yang diizinkan.");
                    event.target.value = "";
                    return;
                  }

                  setError("");
                  setAttachment(selectedFile);
                }}
              />

              {attachment && (
                <div className="mb-2 flex items-center gap-3 rounded-xl border border-sky-100 bg-sky-50 p-2">
                  {attachment.type.startsWith("image/") ? (
                    <img
                      src={previewUrl}
                      alt="Preview lampiran"
                      className="h-14 w-14 rounded-lg object-cover"
                    />
                  ) : (
                    <FileText size={30} className="shrink-0 text-sky-700" />
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-xs font-bold text-slate-700">
                      {attachment.name}
                    </p>
                    <p className="text-[10px] text-slate-500">
                      {(attachment.size / 1024 / 1024).toFixed(2)} MB
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setAttachment(null);
                      if (fileInputRef.current) fileInputRef.current.value = "";
                    }}
                    className="rounded-lg p-2 text-slate-500 hover:bg-white"
                    aria-label="Hapus lampiran"
                  >
                    <X size={16} />
                  </button>
                </div>
              )}

              <div className="flex items-end gap-2 rounded-2xl border border-slate-200 bg-slate-50 p-1.5 focus-within:border-sky-400 focus-within:ring-2 focus-within:ring-sky-100">
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={sending || (isAdmin && !selected)}
                  className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-slate-500 transition hover:bg-sky-100 hover:text-sky-700 disabled:opacity-40"
                  aria-label="Lampirkan gambar atau PDF"
                  title="Lampirkan gambar atau PDF"
                >
                  <Paperclip size={18} />
                </button>
                <textarea
                  value={draft}
                  onChange={(event) => setDraft(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" && !event.shiftKey) {
                      event.preventDefault();
                      event.currentTarget.form.requestSubmit();
                    }
                  }}
                  rows={1}
                  maxLength={4000}
                  placeholder="Ketik pesan..."
                  className="max-h-24 min-h-[38px] flex-1 resize-y bg-transparent px-2.5 py-2 text-xs text-slate-700 outline-none placeholder:text-slate-400"
                  disabled={sending || (isAdmin && !selected)}
                />
                <button
                  type="submit"
                  disabled={sending || (!draft.trim() && !attachment) || (isAdmin && !selected)}
                  className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-[#0786c7] to-[#15528d] text-white shadow-md transition hover:-translate-y-0.5 disabled:opacity-40"
                  aria-label="Kirim pesan"
                >
                  <Send size={15} />
                </button>
              </div>
              <p className="mt-1.5 text-right text-[9px] text-slate-400">
                Gambar maks. 5 MB · PDF maks. 20 MB · Enter untuk mengirim
              </p>
            </form>
          </div>
        </section>
      )}

      <button
        type="button"
        onClick={() => {
          setOpen((value) => {
            if (!value && isUnit) setUnitUnread(0);
            return !value;
          });
          setChatToast(null);
        }}
        className="group relative flex h-[62px] w-[62px] items-center justify-center rounded-full bg-gradient-to-br from-[#078dce] via-[#1769aa] to-[#103b70] text-white shadow-[0_12px_35px_rgba(12,83,145,0.4)] ring-4 ring-white/80 transition duration-300 hover:-translate-y-1 hover:scale-105 hover:shadow-[0_18px_42px_rgba(12,83,145,0.48)]"
        aria-label={open ? "Tutup live chat" : "Buka live chat"}
      >
        <span className="absolute inset-0 rounded-full bg-white/10 opacity-0 transition group-hover:opacity-100" />
        {open ? <X size={25} /> : <MessageCircle size={27} />}
        {!open && (
          <>
            <span className="absolute right-0 top-0 h-3.5 w-3.5 rounded-full border-2 border-white bg-emerald-400" />
            {totalUnread > 0 && (
              <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-extrabold text-white ring-2 ring-white">
                {totalUnread > 99 ? "99+" : totalUnread}
              </span>
            )}
          </>
        )}
      </button>
    </div>
  );
}
