
import fs from "node:fs";
import path from "node:path";
import { pool } from "../config/db.js";
import { UPLOAD_ROOT } from "../middleware/upload.js";
import { ROLES } from "../middleware/auth.js";

const MEDIA_ROOT = path.resolve(UPLOAD_ROOT, "informasi");

const TYPES = {
  berita: {
    column: "thumbnail",
    mime: {
      jpg: "image/jpeg",
      jpeg: "image/jpeg",
      png: "image/png",
      webp: "image/webp",
    },
  },
  pengumuman: {
    column: "file",
    mime: {
      pdf: "application/pdf",
    },
  },
};

export async function getInformasiMedia(req, res) {
  const { kind, filename } = req.params;
  const config = TYPES[kind];

  if (!config) {
    return res.status(404).json({ message: "Media tidak ditemukan." });
  }

  const match = /^([a-f0-9-]{36})\.([a-z]+)$/.exec(filename || "");
  const ext = match?.[2];

  if (!match || !config.mime[ext]) {
    return res.status(404).json({ message: "Media tidak ditemukan." });
  }

  const storedUrl = `/uploads/informasi/${kind}/${filename}`;
  const admin = req.user.role === ROLES.ADMIN;

  const visibility = kind === "berita"
    ? `status = 'published'
       AND (tanggal_publikasi IS NULL OR tanggal_publikasi <= CURDATE())`
    : `status = 'aktif'
       AND (tanggal_pengumuman IS NULL OR tanggal_pengumuman <= CURDATE())
       AND (tanggal_kadaluarsa IS NULL OR tanggal_kadaluarsa >= CURDATE())`;

  const sql = kind === "berita"
    ? `SELECT id FROM berita WHERE thumbnail = ? AND (${visibility}) LIMIT 1`
    : `SELECT id FROM pengumuman WHERE file = ? AND (${visibility}) LIMIT 1`;

  const adminSql = kind === "berita"
    ? "SELECT id FROM berita WHERE thumbnail = ? LIMIT 1"
    : "SELECT id FROM pengumuman WHERE file = ? LIMIT 1";

  const [rows] = await pool.query(admin ? adminSql : sql, [storedUrl]);

  if (!rows.length) {
    return res.status(404).json({ message: "Media tidak ditemukan." });
  }

  const fullPath = path.resolve(MEDIA_ROOT, kind, filename);
  const allowedDir = path.resolve(MEDIA_ROOT, kind);

  if (!fullPath.startsWith(allowedDir + path.sep)) {
    return res.status(404).json({ message: "Media tidak ditemukan." });
  }

  try {
    await fs.promises.access(fullPath, fs.constants.R_OK);
  } catch {
    return res.status(404).json({ message: "Berkas media tidak ditemukan." });
  }

  res.setHeader("Cache-Control", "private, no-store");
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("Content-Disposition", "inline");
  res.type(config.mime[ext]);

  return res.sendFile(fullPath);
}
