/* SIMPB_STANDAR_TRANSACTION_V2 */
import fs from "node:fs";
import path from "node:path";
import { pool } from "../config/db.js";
import { ROLES } from "../middleware/auth.js";
import { UPLOAD_ROOT } from "../middleware/upload.js";
import { notifyAdmins, notifyUser } from "../services/notification.service.js";

const error = (status, message) =>
  Object.assign(new Error(message), { status });

const keys = [
  "persyaratan", "prosedur", "jangka_waktu", "biaya_tarif",
  "produk_pelayanan", "pengaduan", "dasar_hukum",
  "sarana_prasarana", "kompetensi_pelaksana",
  "pengawasan_internal", "jumlah_pelaksana",
  "jaminan_pelayanan", "jaminan_keamanan", "evaluasi_kinerja"
];

const base =
  "SELECT s.*, uk.nama_unit FROM standar_pelayanan s " +
  "LEFT JOIN unit_kerja uk ON uk.id=s.unit_kerja_id";

function visibility(user) {
  if (user.role === ROLES.ADMIN) return ["1=1", []];

  if (user.role === ROLES.UNIT) {
    return [
      "(s.approval_status='approved' OR " +
      "(s.unit_kerja_id=? AND s.uploaded_by=?))",
      [user.unit_kerja_id, user.id]
    ];
  }

  return ["s.approval_status='approved'", []];
}

function idOf(req) {
  const id = Number(req.params.id);
  if (!Number.isSafeInteger(id) || id < 1) {
    throw error(400, "ID tidak valid");
  }
  return id;
}

async function removeFile(file) {
  if (!file) return;
  try {
    await fs.promises.unlink(file);
  } catch (err) {
    if (err.code !== "ENOENT") {
      console.error("Gagal membersihkan file:", err);
    }
  }
}

async function notifySafely(fn) {
  try {
    await fn();
  } catch (err) {
    console.error("Notifikasi standar gagal:", err);
  }
}

function validateYear(value) {
  const year = Number(value);
  if (!Number.isInteger(year) || year < 1900 || year > 2200) {
    throw error(400, "Tahun tidak valid");
  }
  return year;
}

async function validUnit(conn, id) {
  if (!Number.isSafeInteger(id) || id < 1) {
    throw error(400, "Unit kerja tidak valid");
  }

  const [rows] = await conn.query(
    "SELECT id FROM unit_kerja WHERE id=?",
    [id]
  );

  if (!rows.length) throw error(400, "Unit kerja tidak ditemukan");
}

export async function list(req, res) {
  const [where, params] = visibility(req.user);
  const q = String(req.query.q || "").slice(0, 100);

  const [rows] = await pool.query(
    base + " WHERE " + where +
    (q ? " AND (s.nomor_standar LIKE ? OR s.nama_layanan LIKE ?)" : "") +
    " ORDER BY s.created_at DESC",
    [...params, ...(q ? ["%" + q + "%", "%" + q + "%"] : [])]
  );

  res.json({ data: rows });
}

export async function detail(req, res) {
  const [where, params] = visibility(req.user);
  const [rows] = await pool.query(
    base + " WHERE s.id=? AND " + where,
    [idOf(req), ...params]
  );

  if (!rows.length) throw error(404, "Dokumen tidak ditemukan");
  res.json(rows[0]);
}

export async function create(req, res) {
  let conn;
  let committed = false;

  try {
    const body = req.body;
    const admin = req.user.role === ROLES.ADMIN;
    const unit = admin
      ? Number(body.unit_kerja_id)
      : Number(req.user.unit_kerja_id);

    const fields = ["nomor_standar", "nama_layanan", "tahun", ...keys];

    if (
      !req.file ||
      fields.some(k => !String(body[k] ?? "").trim())
    ) {
      throw error(
        400,
        "PDF, identitas dan seluruh 14 komponen wajib diisi"
      );
    }

    const year = validateYear(body.tahun);

    conn = await pool.getConnection();
    await conn.beginTransaction();

    await validUnit(conn, unit);

    const columns = [
      "nomor_standar", "nama_layanan", "tahun", "unit_kerja_id",
      ...keys, "file", "approval_status", "uploaded_by",
      "approved_by", "approved_at"
    ];

    const values = [
      String(body.nomor_standar).trim(),
      String(body.nama_layanan).trim(),
      year,
      unit,
      ...keys.map(k => String(body[k]).trim()),
      "standar-pelayanan/" + req.file.filename,
      admin ? "approved" : "pending",
      req.user.id,
      admin ? req.user.id : null,
      admin ? new Date() : null
    ];

    const [result] = await conn.query(
      "INSERT INTO standar_pelayanan (" +
      columns.join(",") + ") VALUES (" +
      columns.map(() => "?").join(",") + ")",
      values
    );

    await conn.query(
      "INSERT INTO standar_pelayanan_log " +
      "(standar_id,action,actor_id) VALUES (?,?,?)",
      [result.insertId, admin ? "approved" : "submitted", req.user.id]
    );

    await conn.commit();
    committed = true;

    if (!admin) {
      await notifySafely(() => notifyAdmins({
        type: "standar_pending",
        title: "Pengajuan Standar Pelayanan",
        message: body.nama_layanan + " menunggu persetujuan",
        sopId: null
      }));
    }

    return res.status(201).json({
      id: result.insertId,
      approval_status: admin ? "approved" : "pending"
    });
  } catch (err) {
    if (conn && !committed) {
      try { await conn.rollback(); } catch (e) {
        console.error("Rollback create gagal:", e);
      }
    }
    if (!committed) await removeFile(req.file?.path);
    throw err;
  } finally {
    if (conn) conn.release();
  }
}

export async function update(req, res) {
  let conn;
  let committed = false;
  let old;

  try {
    const id = idOf(req);
    const admin = req.user.role === ROLES.ADMIN;
    const updates = {};

    for (const key of ["nomor_standar", "nama_layanan", "tahun", ...keys]) {
      if (!Object.hasOwn(req.body, key)) continue;

      const value = String(req.body[key] ?? "").trim();
      if (!value) throw error(400, key + " tidak boleh kosong");

      updates[key] = key === "tahun" ? validateYear(value) : value;
    }

    if (req.file) {
      updates.file = "standar-pelayanan/" + req.file.filename;
    }

    conn = await pool.getConnection();
    await conn.beginTransaction();

    const [rows] = await conn.query(
      "SELECT * FROM standar_pelayanan WHERE id=? FOR UPDATE",
      [id]
    );

    old = rows[0];
    if (!old) throw error(404, "Dokumen tidak ditemukan");

    if (
      !admin &&
      !(
        Number(old.unit_kerja_id) === Number(req.user.unit_kerja_id) &&
        Number(old.uploaded_by) === Number(req.user.id) &&
        ["pending", "rejected"].includes(old.approval_status)
      )
    ) {
      throw error(403, "Tidak berhak mengubah dokumen ini");
    }

    if (admin && Object.hasOwn(req.body, "unit_kerja_id")) {
      const unit = Number(req.body.unit_kerja_id);
      await validUnit(conn, unit);
      updates.unit_kerja_id = unit;
    }

    if (!admin) {
      updates.approval_status = "pending";
      updates.catatan_review = null;
      updates.approved_by = null;
      updates.approved_at = null;
    }

    if (!Object.keys(updates).length) {
      await conn.rollback();
      return res.json({ message: "Tidak ada perubahan" });
    }

    await conn.query(
      "UPDATE standar_pelayanan SET " +
      Object.keys(updates).map(k => k + "=?").join(",") +
      " WHERE id=?",
      [...Object.values(updates), id]
    );

    await conn.query(
      "INSERT INTO standar_pelayanan_log " +
      "(standar_id,action,actor_id) VALUES (?,?,?)",
      [id, admin ? "updated" : "resubmitted", req.user.id]
    );

    await conn.commit();
    committed = true;

    if (!admin) {
      await notifySafely(() => notifyAdmins({
        type: "standar_pending",
        title: "Revisi Standar Pelayanan",
        message: old.nama_layanan + " menunggu persetujuan ulang",
        sopId: null
      }));
    }

    return res.json({ message: "Perubahan tersimpan" });
  } catch (err) {
    if (conn && !committed) {
      try { await conn.rollback(); } catch (e) {
        console.error("Rollback update gagal:", e);
      }
    }
    if (!committed) await removeFile(req.file?.path);
    throw err;
  } finally {
    if (conn) conn.release();

    // PDF lama dipertahankan untuk menghindari race condition saat file sedang dikirim.
  }
}


export async function remove(req, res) {
  const id = idOf(req);
  let conn;
  let committed = false;
  let document;

  try {
    conn = await pool.getConnection();
    await conn.beginTransaction();

    const [rows] = await conn.query(
      "SELECT * FROM standar_pelayanan WHERE id=? FOR UPDATE",
      [id]
    );

    document = rows[0];

    if (!document) {
      throw error(404, "Dokumen tidak ditemukan");
    }

    // FK menggunakan ON DELETE RESTRICT, sehingga log harus dihapus dahulu.
    await conn.query(
      "DELETE FROM standar_pelayanan_log WHERE standar_id=?",
      [id]
    );

    await conn.query(
      "DELETE FROM standar_pelayanan WHERE id=?",
      [id]
    );

    await conn.commit();
    committed = true;

    // Hapus PDF hanya setelah transaksi database berhasil.
    const dir = path.resolve(UPLOAD_ROOT, "standar-pelayanan");
    const file = path.resolve(UPLOAD_ROOT, document.file || "");

    if (document.file && file.startsWith(dir + path.sep)) {
      await removeFile(file);
    }

    return res.json({
      message: "Dokumen Standar Pelayanan berhasil dihapus",
      id
    });
  } catch (err) {
    if (conn && !committed) {
      try {
        await conn.rollback();
      } catch (rollbackError) {
        console.error("Rollback delete Standar Pelayanan gagal:", rollbackError);
      }
    }

    throw err;
  } finally {
    if (conn) conn.release();
  }
}

export async function review(req, res) {
  const id = idOf(req);
  const status = req.params.decision === "approve"
    ? "approved"
    : "rejected";
  const note = String(req.body?.catatan ?? "").trim();

  if (status === "rejected" && !note) {
    throw error(400, "Alasan penolakan wajib diisi");
  }

  let conn;
  let committed = false;
  let old;

  try {
    conn = await pool.getConnection();
    await conn.beginTransaction();

    const [rows] = await conn.query(
      "SELECT * FROM standar_pelayanan WHERE id=? FOR UPDATE",
      [id]
    );

    old = rows[0];

    if (!old) throw error(404, "Dokumen tidak ditemukan");

    if (old.approval_status !== "pending") {
      throw error(409, "Dokumen tidak lagi berstatus pending");
    }

    await conn.query(
      "UPDATE standar_pelayanan SET " +
      "approval_status=?,catatan_review=?,approved_by=?,approved_at=? " +
      "WHERE id=?",
      [
        status,
        note || null,
        status === "approved" ? req.user.id : null,
        status === "approved" ? new Date() : null,
        id
      ]
    );

    await conn.query(
      "INSERT INTO standar_pelayanan_log " +
      "(standar_id,action,actor_id,catatan) VALUES (?,?,?,?)",
      [id, status, req.user.id, note || null]
    );

    await conn.commit();
    committed = true;
  } catch (err) {
    if (conn && !committed) {
      try { await conn.rollback(); } catch (e) {
        console.error("Rollback review gagal:", e);
      }
    }
    throw err;
  } finally {
    if (conn) conn.release();
  }

  await notifySafely(() => notifyUser(old.uploaded_by, {
    type: "standar_review",
    title: "Keputusan Standar Pelayanan",
    message:
      old.nama_layanan +
      (status === "approved" ? " disetujui" : " dikembalikan") +
      (note ? ": " + note : ""),
    sopId: null
  }));

  return res.json({ approval_status: status });
}

async function pdf(req, res, download) {
  const [where, params] = visibility(req.user);

  const [rows] = await pool.query(
    "SELECT s.* FROM standar_pelayanan s WHERE s.id=? AND " + where,
    [idOf(req), ...params]
  );

  const document = rows[0];
  if (!document) throw error(404, "Dokumen tidak ditemukan");

  const dir = path.resolve(UPLOAD_ROOT, "standar-pelayanan");
  const file = path.resolve(UPLOAD_ROOT, document.file || "");

  if (
    !file.startsWith(dir + path.sep) ||
    !fs.existsSync(file)
  ) {
    throw error(404, "PDF tidak ditemukan");
  }

  const column = download ? "download_count" : "view_count";

  await pool.query(
    "UPDATE standar_pelayanan SET " +
    column + "=" + column + "+1 WHERE id=?",
    [document.id]
  );

  res.setHeader("Cache-Control", "private, no-store");
  res.setHeader("X-Content-Type-Options", "nosniff");

  if (download) {
    return res.download(
      file,
      String(document.nomor_standar).replace(/[^\w-]/g, "_") + ".pdf"
    );
  }

  res.type("pdf");
  return res.sendFile(file);
}

export const view = (req, res) => pdf(req, res, false);
export const download = (req, res) => pdf(req, res, true);
