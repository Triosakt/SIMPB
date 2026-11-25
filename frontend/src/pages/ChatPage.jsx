import { useCallback, useEffect, useState } from "react";
import { MessageCircle, Send, RefreshCw, UserRound, Building2 } from "lucide-react";
import api, { errMsg } from "../api/client.js";
import { useAuth } from "../context/AuthContext.jsx";
import { useNotifications } from "../context/NotificationContext.jsx";

const ADMIN = "admin_ortala";

function formatTime(value) {
  if (!value) return "";
  return new Date(value).toLocaleString("id-ID", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit"
  });
}

export default function ChatPage() {
  const { user } = useAuth();
  const { socket } = useNotifications();
  const isAdmin = user?.role === ADMIN;

  const [conversations, setConversations] = useState([]);
  const [selected, setSelected] = useState(null);
  const [messages, setMessages] = useState([]);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");

  const loadConversations = useCallback(async () => {
    if (!isAdmin) return;
    const response = await api.get("/chat/conversations");
    const rows = response.data.data || [];
    setConversations(rows);
    return rows;
  }, [isAdmin]);

  const loadMessages = useCallback(async (conversationId) => {
    try {
      setError("");
      let response;

      if (isAdmin) {
        response = await api.get(
          "/chat/conversations/" + conversationId + "/messages"
        );
      } else {
        response = await api.get("/chat/messages");
      }

      setMessages(response.data.data || []);

      if (isAdmin) {
        await api.patch("/chat/conversations/" + conversationId + "/read");
      } else {
        await api.patch("/chat/read");
      }

      return response.data;
    } catch (err) {
      setError(errMsg(err));
      throw err;
    }
  }, [isAdmin]);

  useEffect(() => {
    let active = true;

    async function initialize() {
      setLoading(true);
      setError("");

      try {
        if (isAdmin) {
          const rows = await loadConversations();
          if (!active) return;

          if (rows?.length) {
            setSelected((current) => {
              if (current && rows.some((item) => String(item.id) === String(current))) {
                return current;
              }
              return String(rows[0].id);
            });
          } else {
            setSelected(null);
            setMessages([]);
          }
        } else {
          const response = await api.get("/chat/messages");
          if (!active) return;
          setMessages(response.data.data || []);
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
  }, [isAdmin, loadConversations]);

  useEffect(() => {
    if (!isAdmin || !selected) return;

    loadMessages(selected).catch(() => {});
  }, [isAdmin, selected, loadMessages]);

  useEffect(() => {
    if (!socket) return;

    const handleMessage = async (incoming) => {
      if (!incoming) return;

      if (!isAdmin) {
        setMessages((previous) => {
          if (previous.some((item) => String(item.id) === String(incoming.id))) {
            return previous;
          }
          return [...previous, incoming];
        });
        api.patch("/chat/read").catch(() => {});
        return;
      }

      loadConversations().catch(() => {});

      if (selected && String(incoming.conversation_id) === String(selected)) {
        setMessages((previous) => {
          if (previous.some((item) => String(item.id) === String(incoming.id))) {
            return previous;
          }
          return [...previous, incoming];
        });

        api.patch("/chat/conversations/" + selected + "/read").catch(() => {});
      }
    };

    socket.on("chat:message", handleMessage);
    return () => socket.off("chat:message", handleMessage);
  }, [socket, isAdmin, selected, loadConversations]);

  const sendMessage = async (event) => {
    event.preventDefault();
    const content = message.trim();

    if (!content || sending) return;

    setSending(true);
    setError("");

    try {
      let response;

      if (isAdmin) {
        if (!selected) return;
        response = await api.post(
          "/chat/conversations/" + selected + "/messages",
          { message: content }
        );
      } else {
        response = await api.post("/chat/messages", { message: content });
      }

      const sent = response.data.data;

      setMessages((previous) => {
        if (previous.some((item) => String(item.id) === String(sent.id))) {
          return previous;
        }
        return [...previous, sent];
      });

      setMessage("");

      if (isAdmin) {
        loadConversations().catch(() => {});
      }
    } catch (err) {
      setError(errMsg(err));
    } finally {
      setSending(false);
    }
  };

  const activeConversation = conversations.find(
    (item) => String(item.id) === String(selected)
  );

  return (
    <div className="mx-auto max-w-7xl space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2 text-[#0876b9]">
            <MessageCircle size={22} />
            <span className="text-xs font-bold uppercase tracking-[0.18em]">
              Komunikasi Internal
            </span>
          </div>
          <h1 className="mt-2 text-2xl font-extrabold text-[#123957]">
            Live Chat
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            {isAdmin
              ? "Ruang komunikasi Admin Ortala dengan seluruh Perwakilan Unit Kerja."
              : "Sampaikan pertanyaan dan koordinasikan kebutuhan dokumen dengan Admin Ortala."}
          </p>
        </div>

        {isAdmin && (
          <button
            type="button"
            onClick={() => loadConversations().catch((err) => setError(errMsg(err)))}
            className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-600 shadow-sm transition hover:border-sky-300 hover:text-sky-700"
          >
            <RefreshCw size={16} />
            Perbarui
          </button>
        )}
      </div>

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <div className="grid min-h-[620px] overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-xl shadow-slate-200/60 lg:grid-cols-[320px_minmax(0,1fr)]">
        {isAdmin && (
          <aside className="border-b border-slate-200 bg-slate-50/80 lg:border-b-0 lg:border-r">
            <div className="border-b border-slate-200 px-5 py-5">
              <h2 className="font-bold text-[#173b5b]">Percakapan Unit</h2>
              <p className="mt-1 text-xs text-slate-500">
                {conversations.length} ruang percakapan
              </p>
            </div>

            <div className="max-h-[260px] overflow-y-auto p-3 lg:max-h-[540px]">
              {conversations.length === 0 && !loading && (
                <div className="px-4 py-10 text-center text-sm text-slate-400">
                  Belum ada unit yang memulai percakapan.
                </div>
              )}

              {conversations.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setSelected(String(item.id))}
                  className={
                    "mb-2 flex w-full items-start gap-3 rounded-2xl p-3 text-left transition " +
                    (String(selected) === String(item.id)
                      ? "bg-[#e2f3ff] ring-1 ring-sky-200"
                      : "hover:bg-white")
                  }
                >
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-[#0c83c7] to-[#174b83] text-white">
                    <Building2 size={19} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-bold text-[#173b5b]">
                      {item.nama_unit}
                    </p>
                    <p className="text-xs text-slate-500">
                      {item.singkatan || "Unit Kerja"}
                    </p>
                    <p className="mt-1 truncate text-xs text-slate-400">
                      {item.last_message || "Belum ada pesan"}
                    </p>
                  </div>
                  {Number(item.unread_count) > 0 && (
                    <span className="flex h-6 min-w-6 items-center justify-center rounded-full bg-sky-600 px-2 text-xs font-bold text-white">
                      {item.unread_count}
                    </span>
                  )}
                </button>
              ))}
            </div>
          </aside>
        )}

        <section className="flex min-h-[620px] min-w-0 flex-col">
          <div className="flex items-center gap-3 border-b border-slate-100 bg-white px-5 py-4">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-[#0c83c7] to-[#174b83] text-white shadow-lg shadow-sky-900/15">
              {isAdmin ? <Building2 size={20} /> : <MessageCircle size={20} />}
            </div>
            <div className="min-w-0">
              <h2 className="truncate font-bold text-[#173b5b]">
                {isAdmin
                  ? activeConversation?.nama_unit || "Pilih percakapan"
                  : "Admin Ortala"}
              </h2>
              <p className="text-xs text-slate-500">
                {isAdmin
                  ? activeConversation?.singkatan || "Pusat komunikasi unit kerja"
                  : "Layanan komunikasi internal SIMPB"}
              </p>
            </div>
            <span className="ml-auto flex items-center gap-1.5 text-xs font-semibold text-emerald-600">
              <span className="h-2 w-2 rounded-full bg-emerald-500" />
              Real-time
            </span>
          </div>

          <div className="flex-1 space-y-4 overflow-y-auto bg-[#f5f8fc] p-4 sm:p-6">
            {loading && (
              <div className="py-16 text-center text-sm text-slate-400">
                Memuat percakapan...
              </div>
            )}

            {!loading && isAdmin && !selected && (
              <div className="flex h-full min-h-[300px] flex-col items-center justify-center text-center">
                <MessageCircle size={42} className="text-slate-300" />
                <p className="mt-3 font-semibold text-slate-500">
                  Belum ada percakapan
                </p>
                <p className="mt-1 text-sm text-slate-400">
                  Percakapan akan muncul setelah unit kerja membuka Live Chat.
                </p>
              </div>
            )}

            {!loading && messages.length === 0 && (!isAdmin || selected) && (
              <div className="flex min-h-[300px] flex-col items-center justify-center text-center">
                <MessageCircle size={40} className="text-slate-300" />
                <p className="mt-3 font-semibold text-slate-500">
                  Belum ada pesan
                </p>
                <p className="mt-1 text-sm text-slate-400">
                  Mulai percakapan dengan mengirim pesan pertama.
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
                  <div className="max-w-[85%] sm:max-w-[72%]">
                    <div
                      className={
                        "mb-1 flex items-center gap-1.5 text-[11px] text-slate-400 " +
                        (mine ? "justify-end" : "justify-start")
                      }
                    >
                      {!mine && <UserRound size={12} />}
                      <span>{mine ? "Anda" : item.sender_name}</span>
                    </div>
                    <div
                      className={
                        "rounded-2xl px-4 py-3 shadow-sm " +
                        (mine
                          ? "rounded-br-md bg-gradient-to-br from-[#087fbe] to-[#15528d] text-white"
                          : "rounded-bl-md border border-slate-200 bg-white text-slate-700")
                      }
                    >
                      <p className="whitespace-pre-wrap break-words text-sm leading-relaxed">
                        {item.message}
                      </p>
                      <p
                        className={
                          "mt-2 text-right text-[10px] " +
                          (mine ? "text-white/65" : "text-slate-400")
                        }
                      >
                        {formatTime(item.created_at)}
                      </p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          <form onSubmit={sendMessage} className="border-t border-slate-100 bg-white p-4 sm:p-5">
            <div className="flex items-end gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-2 transition focus-within:border-sky-400 focus-within:ring-2 focus-within:ring-sky-100">
              <textarea
                value={message}
                onChange={(event) => setMessage(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter" && !event.shiftKey) {
                    event.preventDefault();
                    event.currentTarget.form.requestSubmit();
                  }
                }}
                maxLength={4000}
                rows={2}
                placeholder="Tulis pesan... (Enter untuk mengirim)"
                className="max-h-32 min-h-[44px] flex-1 resize-y bg-transparent px-3 py-2 text-sm text-slate-700 outline-none placeholder:text-slate-400"
                disabled={sending || (isAdmin && !selected)}
              />
              <button
                type="submit"
                disabled={sending || !message.trim() || (isAdmin && !selected)}
                className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-[#0786c7] to-[#15528d] text-white shadow-lg shadow-sky-900/20 transition hover:-translate-y-0.5 hover:shadow-xl disabled:cursor-not-allowed disabled:opacity-40"
                aria-label="Kirim pesan"
              >
                <Send size={18} />
              </button>
            </div>
            <p className="mt-2 text-right text-[10px] text-slate-400">
              Maksimal 4.000 karakter
            </p>
          </form>
        </section>
      </div>
    </div>
  );
}
