import { pool } from "../config/db.js";
import path from "path";
import fs from "fs";
import { UPLOAD_ROOT } from "../middleware/upload.js";
import { emitToAdmins, emitToUnit } from "../services/socket.js";

function httpError(status, message) {
  const error = new Error(message);
  error.status = status;
  return error;
}

function validId(value) {
  return /^[1-9][0-9]*$/.test(String(value || ""));
}

async function getUnitConversation(unitId) {
  if (!unitId) throw httpError(403, "Akun belum terhubung dengan unit kerja");

  await pool.query(
    "INSERT INTO chat_conversations (unit_kerja_id) VALUES (?) ON DUPLICATE KEY UPDATE id = LAST_INSERT_ID(id)",
    [unitId]
  );

  const [rows] = await pool.query(
    "SELECT id, unit_kerja_id, last_message_at FROM chat_conversations WHERE unit_kerja_id = ?",
    [unitId]
  );

  return rows[0];
}

async function getMessages(conversationId) {
  const [rows] = await pool.query(
    `SELECT m.id, m.conversation_id, m.sender_id, m.sender_role,
            m.message, m.attachment_name, m.attachment_mime, m.attachment_size,
            m.created_at, m.read_by_admin_at, m.read_by_unit_at,
            u.name AS sender_name
     FROM chat_messages m
     JOIN users u ON u.id = m.sender_id
     WHERE m.conversation_id = ?
     ORDER BY m.id ASC
     LIMIT 500`,
    [conversationId]
  );
  return rows;
}

async function ensureConversationAccess(req, conversationId) {
  if (!validId(conversationId)) throw httpError(400, "ID percakapan tidak valid");

  const [rows] = await pool.query(
    "SELECT id, unit_kerja_id FROM chat_conversations WHERE id = ?",
    [conversationId]
  );

  const conversation = rows[0];
  if (!conversation) throw httpError(404, "Percakapan tidak ditemukan");

  if (
    req.user.role === "perwakilan_unit" &&
    String(conversation.unit_kerja_id) !== String(req.user.unit_kerja_id)
  ) {
    throw httpError(403, "Anda tidak memiliki akses ke percakapan ini");
  }

  return conversation;
}

async function markConversationRead(conversationId, role) {
  if (role === "admin_ortala") {
    await pool.query(
      "UPDATE chat_messages SET read_by_admin_at = NOW() WHERE conversation_id = ? AND sender_role = 'perwakilan_unit' AND read_by_admin_at IS NULL",
      [conversationId]
    );
  } else {
    await pool.query(
      "UPDATE chat_messages SET read_by_unit_at = NOW() WHERE conversation_id = ? AND sender_role = 'admin_ortala' AND read_by_unit_at IS NULL",
      [conversationId]
    );
  }
}


async function createChatMessage(req, conversation, role) {
  const message = String(req.body.message || "").trim();
  const file = req.file;

  if (!message && !file) {
    throw httpError(400, "Isi pesan atau pilih lampiran terlebih dahulu");
  }

  if (message.length > 4000) {
    throw httpError(400, "Pesan maksimal 4.000 karakter");
  }

  try {
    const [result] = await pool.query(
      `INSERT INTO chat_messages
        (conversation_id, sender_id, sender_role, message,
         attachment_path, attachment_name, attachment_mime, attachment_size)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        conversation.id,
        req.user.id,
        role,
        message || null,
        file?.relativePath || null,
        file ? path.basename(file.originalname).slice(0, 255) : null,
        file?.mimetype || null,
        file?.size || null,
      ]
    );

    await pool.query(
      "UPDATE chat_conversations SET last_message_at = NOW() WHERE id = ?",
      [conversation.id]
    );

    const [rows] = await pool.query(
      `SELECT m.id, m.conversation_id, m.sender_id, m.sender_role,
              m.message, m.attachment_name, m.attachment_mime,
              m.attachment_size, m.created_at,
              m.read_by_admin_at, m.read_by_unit_at,
              u.name AS sender_name
       FROM chat_messages m
       JOIN users u ON u.id = m.sender_id
       WHERE m.id = ?`,
      [result.insertId]
    );

    return rows[0];
  } catch (error) {
    if (file?.path) {
      try {
        await fs.promises.unlink(file.path);
      } catch (cleanupError) {
        if (cleanupError.code !== "ENOENT") {
          console.error("Gagal membersihkan lampiran:", cleanupError);
        }
      }
    }
    throw error;
  }
}


export async function unitConversation(req, res) {
  const conversation = await getUnitConversation(req.user.unit_kerja_id);
  res.json({ data: conversation });
}

export async function unitMessages(req, res) {
  const conversation = await getUnitConversation(req.user.unit_kerja_id);
  const messages = await getMessages(conversation.id);
  res.json({ data: messages, conversation });
}

export async function unitMarkRead(req, res) {
  const conversation = await getUnitConversation(req.user.unit_kerja_id);
  await markConversationRead(conversation.id, req.user.role);
  res.json({ message: "Pesan ditandai sudah dibaca" });
}

export async function unitSendMessage(req, res) {
  const conversation = await getUnitConversation(req.user.unit_kerja_id);
  const payload = await createChatMessage(req, conversation, "perwakilan_unit");

  emitToAdmins("chat:message", payload);
  res.status(201).json({ data: payload });
}

export async function adminConversations(req, res) {
  const [rows] = await pool.query(
    `SELECT c.id, c.unit_kerja_id, c.last_message_at,
            uk.nama_unit, uk.singkatan,
            (SELECT m.message FROM chat_messages m
             WHERE m.conversation_id = c.id ORDER BY m.id DESC LIMIT 1) AS last_message,
            (SELECT m.created_at FROM chat_messages m
             WHERE m.conversation_id = c.id ORDER BY m.id DESC LIMIT 1) AS last_message_created_at,
            (SELECT COUNT(*) FROM chat_messages m
             WHERE m.conversation_id = c.id
             AND m.sender_role = 'perwakilan_unit'
             AND m.read_by_admin_at IS NULL) AS unread_count
     FROM chat_conversations c
     JOIN unit_kerja uk ON uk.id = c.unit_kerja_id
     ORDER BY c.last_message_at IS NULL ASC, c.last_message_at DESC, uk.nama_unit ASC`
  );

  res.json({ data: rows });
}

export async function adminMessages(req, res) {
  const conversation = await ensureConversationAccess(req, req.params.id);
  const messages = await getMessages(conversation.id);
  res.json({ data: messages, conversation });
}

export async function adminMarkRead(req, res) {
  const conversation = await ensureConversationAccess(req, req.params.id);
  await markConversationRead(conversation.id, req.user.role);
  res.json({ message: "Pesan ditandai sudah dibaca" });
}

export async function adminSendMessage(req, res) {
  const conversation = await ensureConversationAccess(req, req.params.id);
  const payload = await createChatMessage(req, conversation, "admin_ortala");

  emitToUnit(conversation.unit_kerja_id, "chat:message", payload);
  res.status(201).json({ data: payload });
}

export async function getAttachment(req, res) {
  if (!validId(req.params.id)) {
    throw httpError(400, "ID lampiran tidak valid");
  }

  const [rows] = await pool.query(
    `SELECT id, conversation_id, attachment_path,
            attachment_name, attachment_mime
     FROM chat_messages
     WHERE id = ? AND attachment_path IS NOT NULL`,
    [req.params.id]
  );

  const attachment = rows[0];
  if (!attachment) throw httpError(404, "Lampiran tidak ditemukan");

  await ensureConversationAccess(req, attachment.conversation_id);

  const base = path.resolve(UPLOAD_ROOT);
  const fullPath = path.resolve(base, attachment.attachment_path);

  if (!fullPath.startsWith(base + path.sep)) {
    throw httpError(400, "Lokasi lampiran tidak valid");
  }

  try {
    await fs.promises.access(fullPath, fs.constants.R_OK);
  } catch {
    throw httpError(404, "File lampiran tidak ditemukan di server");
  }

  res.setHeader("Content-Type", attachment.attachment_mime);
  res.setHeader("Content-Disposition", "inline");
  res.setHeader("X-Content-Type-Options", "nosniff");

  return res.sendFile(fullPath);
}

