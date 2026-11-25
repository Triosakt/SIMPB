import { Server } from "socket.io";
import jwt from "jsonwebtoken";
import { pool } from "../config/db.js";

let io;

export function initSocket(httpServer) {
  io = new Server(httpServer, {
    cors: { origin: process.env.CLIENT_URL, credentials: true },
  });

  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth?.token;
      const payload = jwt.verify(token, process.env.JWT_SECRET);

      const [rows] = await pool.query(
        "SELECT id, name, email, role, unit_kerja_id, is_active FROM users WHERE id = ?",
        [payload.sub]
      );

      const user = rows[0];
      if (!user || !user.is_active) {
        return next(new Error("unauthorized"));
      }

      socket.data.user = user;
      next();
    } catch {
      next(new Error("unauthorized"));
    }
  });

  io.on("connection", (socket) => {
    const user = socket.data.user;
    socket.join("user:" + user.id);

    if (user.role === "admin_ortala") {
      socket.join("admins");
    }

    if (user.role === "perwakilan_unit" && user.unit_kerja_id) {
      socket.join("unit:" + user.unit_kerja_id);
    }
  });

  return io;
}

export const emitToAdmins = (event, payload) =>
  io?.to("admins").emit(event, payload);

export const emitToUnit = (unitId, event, payload) =>
  io?.to("unit:" + unitId).emit(event, payload);

export const emitToUser = (userId, event, payload) =>
  io?.to("user:" + userId).emit(event, payload);
