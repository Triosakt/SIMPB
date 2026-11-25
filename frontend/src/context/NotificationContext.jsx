import { createContext, useContext, useEffect, useState, useCallback } from "react";
import { io } from "socket.io-client";
import api, { API_BASE } from "../api/client.js";
import { useAuth } from "./AuthContext.jsx";

const NotificationContext = createContext(null);
export const useNotifications = () => useContext(NotificationContext);

export function NotificationProvider({ children }) {
  const { user } = useAuth();
  const [items, setItems] = useState([]);
  const [unread, setUnread] = useState(0);
  const [toast, setToast] = useState(null);
  const [socket, setSocket] = useState(null);

  const refresh = useCallback(async () => {
    const { data } = await api.get("/notifications");
    setItems(data.data || []);
    setUnread(Number(data.unread) || 0);
  }, []);

  useEffect(() => {
    if (!user) { setItems([]); setUnread(0); setSocket(null); return; }
    refresh().catch(() => {});
    const connection = io(API_BASE || window.location.origin, {
      auth: { token: localStorage.getItem("token") }
    });
    setSocket(connection);
    connection.on("notification:new", (n) => {
      setToast(n);
      setTimeout(() => setToast(null), 6000);
      refresh().catch(() => {});
    });
    return () => { connection.disconnect(); setSocket(null); };
  }, [user?.id, refresh]);

  const markRead = async (id) => {
    if (String(id).startsWith("live-")) { await refresh(); return; }
    await api.patch(`/notifications/${id}/read`);
    setItems((prev) => prev.map((n) => String(n.id) === String(id) ? { ...n, is_read: 1 } : n));
    setUnread((prev) => Math.max(0, prev - (items.find((n) => String(n.id) === String(id) && !Number(n.is_read)) ? 1 : 0)));
  };

  const markAllRead = async () => {
    await api.patch("/notifications/read-all");
    setItems((prev) => prev.map((n) => ({ ...n, is_read: 1 })));
    setUnread(0);
  };

  return (
    <NotificationContext.Provider value={{ items, unread, toast, setToast, refresh, markRead, markAllRead, socket }}>
      {children}
    </NotificationContext.Provider>
  );
}
