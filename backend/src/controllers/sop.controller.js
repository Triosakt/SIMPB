import fs from "fs";
import path from "path";
import { pool } from "../config/db.js";
import { ROLES } from "../middleware/auth.js";
import { UPLOAD_ROOT } from "../middleware/upload.js";
import { notifyAdmins, notifyUser } from "../services/notification.service.js";

const httpError = (status, message) => Object.assign(new Error(message), { status });

// Batasi data yang boleh dilihat tiap role
function visibility(user) {
  if (user.role === ROLES.ADMIN) return { sql: "1=1", params: [] };
  if (user.role === ROLES.UNIT)
    return { sql: "(s.approval_status = 'approved' OR s.uploaded_by = ?)", params: [user.id] };
  return { sql: "s.approval_status = 'approved'", params: [] };
}

// SIMPB_MULTI_RELASI_V2
const parseRelated = raw => {
 if(raw===undefined||raw===null||raw==='')return null;
 let value;try{value=typeof raw==='string'?JSON.parse(raw):raw;}catch{throw httpError(400,'Format dokumen terkait tidak valid');}
 if(!Array.isArray(value)||value.length>200)throw httpError(400,'Dokumen terkait harus berupa array (maksimal 200)');
 const seen=new Set();return value.map(x=>{const t=x?.document_type,id=Number(x?.document_id),key=t+':'+id;
 if(!['peta','sub','cfm'].includes(t)||!Number.isSafeInteger(id)||id<=0||seen.has(key))throw httpError(400,'Pilihan dokumen terkait tidak valid atau duplikat');seen.add(key);return {document_type:t,document_id:id};});
};
async function validateRelated(conn,related){
 for(const x of related){
  let sql=x.document_type==='peta'?"SELECT id FROM peta_proses WHERE id=? AND approval_status='approved'":x.document_type==='sub'?"SELECT sp.id FROM sub_proses sp JOIN peta_proses p ON p.id=sp.peta_proses_id WHERE sp.id=? AND sp.approval_status='approved' AND p.approval_status='approved'":"SELECT c.id FROM cfm c JOIN sub_proses sp ON sp.id=c.sub_proses_id JOIN peta_proses p ON p.id=c.peta_proses_id AND sp.peta_proses_id=p.id WHERE c.id=? AND c.approval_status='approved' AND sp.approval_status='approved' AND p.approval_status='approved'";
  const [rows]=await conn.query(sql,[x.document_id]);if(!rows.length)throw httpError(400,'Dokumen terkait tidak ditemukan atau belum disetujui: '+x.document_type+' #'+x.document_id);
 }
}
async function readRelated(sopId){
 const [rows]=await pool.query(`SELECT r.document_type,r.document_id,
 CASE r.document_type WHEN 'peta' THEN p.nomor_peta_proses WHEN 'sub' THEN sp.nomor_sub_proses ELSE c.nomor_cfm END AS nomor,
 CASE r.document_type WHEN 'peta' THEN p.judul WHEN 'sub' THEN sp.nama_sub_proses ELSE c.nama_cfm END AS judul,
 CASE r.document_type WHEN 'peta' THEN p.file_pdf WHEN 'sub' THEN sp.file_pdf ELSE c.file_pdf END AS file_pdf
 FROM sop_dokumen_terkait r LEFT JOIN peta_proses p ON r.document_type='peta' AND p.id=r.document_id
 LEFT JOIN sub_proses sp ON r.document_type='sub' AND sp.id=r.document_id
 LEFT JOIN cfm c ON r.document_type='cfm' AND c.id=r.document_id WHERE r.sop_id=? ORDER BY FIELD(r.document_type,'peta','sub','cfm'),r.id`,[sopId]);return rows;
}

const BASE_SELECT = `
  SELECT s.*, uk.nama_unit, lb.nama_lembaga, u.name AS uploaded_by_name
  FROM sop s
  LEFT JOIN unit_kerja uk ON uk.id = s.unit_kerja_id
  LEFT JOIN lembaga lb ON lb.id = s.lembaga_id
  LEFT JOIN users u ON u.id = s.uploaded_by`;

export async function listSop(req, res) {
  const { q, jenis, unit_kerja_id, lembaga_id, tahun, status_berlaku, approval_status } = req.query;
  const page = Math.max(1, Number(req.query.page) || 1);
  const limit = Math.min(100, Math.max(1, Number(req.query.limit) || 10));

  const vis = visibility(req.user);
  const where = [vis.sql];
  const params = [...vis.params];

  if (q) { where.push("(s.nama_sop LIKE ? OR s.nomor_sop LIKE ?)"); params.push(`%${q}%`, `%${q}%`); }
  if (jenis) { where.push("s.jenis_sop = ?"); params.push(jenis); }
  if (unit_kerja_id) { where.push("s.unit_kerja_id = ?"); params.push(unit_kerja_id); }
  if (lembaga_id) { where.push("s.lembaga_id = ?"); params.push(lembaga_id); }
  if (tahun) { where.push("s.tahun_terbit = ?"); params.push(tahun); }
  if (status_berlaku) { where.push("s.status_berlaku = ?"); params.push(status_berlaku); }
  if (approval_status && req.user.role !== ROLES.USER) {
    where.push("s.approval_status = ?"); params.push(approval_status);
  }

  const clause = `WHERE ${where.join(" AND ")}`;
  const [[{ total }]] = await pool.query(`SELECT COUNT(*) AS total FROM sop s ${clause}`, params);
  const [rows] = await pool.query(
    `${BASE_SELECT} ${clause} ORDER BY s.created_at DESC LIMIT ? OFFSET ?`,
    [...params, limit, (page - 1) * limit]
  );
  res.json({ data: rows, meta: { page, limit, total, pages: Math.ceil(total / limit) } });
}

export async function getSop(req, res) {
  const vis = visibility(req.user);
  const [rows] = await pool.query(`${BASE_SELECT} WHERE s.id = ? AND ${vis.sql}`, [req.params.id, ...vis.params]);
  if (!rows[0]) throw httpError(404, "SOP tidak ditemukan");
  const [logs] = await pool.query(
    `SELECT l.*, u.name AS actor_name FROM sop_approval_log l
     JOIN users u ON u.id = l.actor_id WHERE l.sop_id = ? ORDER BY l.created_at DESC`,
    [req.params.id]
  );
  const dokumen_terkait = await readRelated(req.params.id);
  res.json({ ...rows[0], history: logs, dokumen_terkait });
}

// Role 1 (Perwakilan Unit) upload -> status pending + notifikasi ke Admin Ortala
// Role 2 (Admin) upload -> langsung approved
export async function createSop(req, res) {
  const b = req.body;
  const removeFile = () => req.file && fs.unlink(req.file.path, () => {});

  if (!req.file) throw httpError(400, "File PDF SOP wajib diunggah");
  if (!b.nomor_sop || !b.nama_sop || !b.tahun_terbit) {
    removeFile();
    throw httpError(400, "Nomor SOP, nama SOP, dan tahun terbit wajib diisi");
  }

  const isAdmin = req.user.role === ROLES.ADMIN;
  let jenis = "unit_kerja", unitId = req.user.unit_kerja_id, lembagaId = null;

  if (isAdmin) {
    jenis = b.jenis_sop === "lembaga" ? "lembaga" : "unit_kerja";
    unitId = jenis === "unit_kerja" ? Number(b.unit_kerja_id) || null : null;
    lembagaId = jenis === "lembaga" ? Number(b.lembaga_id) || null : null;
  }
  if ((jenis === "unit_kerja" && !unitId) || (jenis === "lembaga" && !lembagaId)) {
    removeFile();
    throw httpError(400, jenis === "lembaga" ? "Lembaga wajib dipilih" : "Unit kerja tidak ditemukan pada akun ini");
  }

  const related = parseRelated(b.dokumen_terkait);
  const approval = isAdmin ? "approved" : "pending";
  const conn = await pool.getConnection();
  let r;
  try {
  await conn.beginTransaction();
  if (related) await validateRelated(conn, related);
  [r] = await conn.query(
    `INSERT INTO sop (jenis_sop, lembaga_id, unit_kerja_id, peta_proses_id, sub_proses_id, cfm_id,
       nomor_sop, nama_sop, tahun_terbit, status_berlaku, approval_status, file, uploaded_by,
       approved_by, approved_at)
     VALUES (?,?,?,?,?,?,?,?,?, 'Berlaku', ?, ?, ?, ?, ?)`,
    [jenis, lembagaId, unitId, b.peta_proses_id || null, b.sub_proses_id || null, b.cfm_id || null,
     b.nomor_sop, b.nama_sop, b.tahun_terbit, approval, `sop/${req.file.filename}`, req.user.id,
     isAdmin ? req.user.id : null, isAdmin ? new Date() : null]
  );
  await conn.query(
    "INSERT INTO sop_approval_log (sop_id, action, actor_id, catatan) VALUES (?,?,?,?)",
    [r.insertId, isAdmin ? "approved" : "submitted", req.user.id, b.catatan || null]
  );

  if (related) { for (const x of related) await conn.query("INSERT INTO sop_dokumen_terkait (sop_id,document_type,document_id) VALUES (?,?,?)",[r.insertId,x.document_type,x.document_id]); }
  await conn.commit();
  } catch (e) { await conn.rollback(); removeFile(); throw e; } finally { conn.release(); }

  if (!isAdmin) {
    const [[uk]] = await pool.query("SELECT nama_unit FROM unit_kerja WHERE id = ?", [unitId]);
    await notifyAdmins({
      type: "sop_uploaded",
      title: "SOP baru menunggu approval",
      message: `${uk?.nama_unit || "Unit kerja"} mengunggah "${b.nama_sop}" (${b.nomor_sop})`,
      sopId: r.insertId,
    });
  }
  res.status(201).json({ id: r.insertId, approval_status: approval });
}

// Admin: setujui / tolak
export async function reviewSop(req, res) {
  const decision = req.params.decision; // 'approve' | 'reject'
  const { catatan } = req.body || {};
  if (decision === "reject" && !catatan)
    throw httpError(400, "Alasan penolakan wajib diisi");

  const [[sop]] = await pool.query("SELECT * FROM sop WHERE id = ?", [req.params.id]);
  if (!sop) throw httpError(404, "SOP tidak ditemukan");
  if (sop.approval_status !== "pending") throw httpError(409, "SOP ini tidak berstatus pending");

  const approved = decision === "approve";
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    await conn.query(
      `UPDATE sop SET approval_status = ?, approved_by = ?, approved_at = NOW(), reject_reason = ? WHERE id = ?`,
      [approved ? "approved" : "rejected", req.user.id, approved ? null : catatan, sop.id]
    );
    await conn.query(
      "INSERT INTO sop_approval_log (sop_id, action, actor_id, catatan) VALUES (?,?,?,?)",
      [sop.id, approved ? "approved" : "rejected", req.user.id, catatan || null]
    );
    await conn.commit();
  } catch (e) {
    await conn.rollback();
    throw e;
  } finally {
    conn.release();
  }

  await notifyUser(sop.uploaded_by, {
    type: approved ? "sop_approved" : "sop_rejected",
    title: approved ? "SOP disetujui" : "SOP ditolak",
    message: approved ? `"${sop.nama_sop}" telah disetujui` : `"${sop.nama_sop}" ditolak: ${catatan}`,
    sopId: sop.id,
  });
  res.json({ id: sop.id, approval_status: approved ? "approved" : "rejected" });
}

// Admin: ubah status berlaku / metadata

// Admin: ubah metadata SOP dan/atau ganti file PDF
export async function updateSop(req, res) {
  // Jika proses gagal, file baru yang sudah terunggah dihapus kembali
  const removeNewFile = () => req.file && fs.unlink(req.file.path, () => {});

  try {
    const [[current]] = await pool.query(
      "SELECT id, file FROM sop WHERE id = ?",
      [req.params.id]
    );

    if (!current) {
      throw httpError(404, "SOP tidak ditemukan");
    }

    const {
      nama_sop,
      nomor_sop,
      tahun_terbit,
      status_berlaku
    } = req.body || {};

    // Validasi status berlaku
    if (
      status_berlaku &&
      !["Berlaku", "Tidak_Berlaku"].includes(status_berlaku)
    ) {
      throw httpError(400, "Status berlaku tidak valid");
    }

    // File baru jika admin mengunggah PDF pengganti
    const newFile = req.file
      ? `sop/${req.file.filename}`
      : null;

    // Perbarui metadata dan file di database
    await pool.query(
      `UPDATE sop SET
         nama_sop = COALESCE(?, nama_sop),
         nomor_sop = COALESCE(?, nomor_sop),
         tahun_terbit = COALESCE(?, tahun_terbit),
         status_berlaku = COALESCE(?, status_berlaku),
         file = COALESCE(?, file)
       WHERE id = ?`,
      [
        nama_sop || null,
        nomor_sop || null,
        tahun_terbit || null,
        status_berlaku || null,
        newFile,
        current.id,
      ]
    );

    // Hapus PDF lama hanya setelah database berhasil diperbarui
    if (newFile && current.file) {
      fs.unlink(
        path.join(UPLOAD_ROOT, current.file),
        () => {}
      );
    }

    res.json({
      message: "SOP diperbarui",
      file_updated: Boolean(newFile),
    });

  } catch (e) {
    // Hapus file baru jika proses update gagal
    removeNewFile();
    throw e;
  }
}


export async function deleteSop(req, res) {
  const [[sop]] = await pool.query("SELECT file FROM sop WHERE id = ?", [req.params.id]);
  if (!sop) throw httpError(404, "SOP tidak ditemukan");
  const conn = await pool.getConnection();
  try { await conn.beginTransaction(); await conn.query("DELETE FROM sop_dokumen_terkait WHERE sop_id = ?",[req.params.id]); await conn.query("DELETE FROM sop WHERE id = ?",[req.params.id]); await conn.commit(); } catch(e) { await conn.rollback(); throw e; } finally { conn.release(); }
  if (sop.file) fs.unlink(path.join(UPLOAD_ROOT, sop.file), () => {});
  res.json({ message: "SOP dihapus" });
}

// Download: Admin & User Biasa. Perwakilan Unit hanya untuk SOP unitnya sendiri.
export async function downloadSop(req, res) {
  const vis = visibility(req.user);
  const [rows] = await pool.query(`SELECT s.* FROM sop s WHERE s.id = ? AND ${vis.sql}`, [req.params.id, ...vis.params]);
  const sop = rows[0];
  if (!sop || !sop.file) throw httpError(404, "File tidak ditemukan");
  if (req.user.role === ROLES.UNIT && sop.unit_kerja_id !== req.user.unit_kerja_id)
    throw httpError(403, "Perwakilan unit hanya dapat mengunduh SOP unitnya sendiri");

  const full = path.resolve(UPLOAD_ROOT, sop.file);
  if (!full.startsWith(UPLOAD_ROOT + path.sep) || !fs.existsSync(full))
    throw httpError(404, "File tidak ditemukan di server");

  await pool.query("UPDATE sop SET download_count = download_count + 1 WHERE id = ?", [sop.id]);
  res.download(full, `${sop.nomor_sop.replace(/[^\w-]/g, "_")}.pdf`);
}

// Membuka / melihat PDF SOP.
// Jumlah view bertambah, tetapi download_count tidak berubah.
export async function viewSop(req, res) {
  const vis = visibility(req.user);

  const [rows] = await pool.query(
    `SELECT s.*
     FROM sop s
     WHERE s.id = ? AND ${vis.sql}`,
    [req.params.id, ...vis.params]
  );

  const sop = rows[0];

  if (!sop || !sop.file) {
    throw httpError(404, "File SOP tidak ditemukan");
  }

  // Pertahankan pembatasan akses untuk perwakilan unit.
  if (
    req.user.role === ROLES.UNIT &&
    sop.unit_kerja_id !== req.user.unit_kerja_id
  ) {
    throw httpError(
      403,
      "Perwakilan unit hanya dapat membuka SOP unitnya sendiri"
    );
  }

  const full = path.resolve(UPLOAD_ROOT, sop.file);

  if (
    !full.startsWith(UPLOAD_ROOT + path.sep) ||
    !fs.existsSync(full)
  ) {
    throw httpError(404, "File SOP tidak ditemukan di server");
  }

  // Catat view hanya setelah file dinyatakan tersedia.
  await pool.query(
    "UPDATE sop SET view_count = view_count + 1 WHERE id = ?",
    [sop.id]
  );

  // Tampilkan PDF di browser, bukan langsung mengunduhnya.
  res.setHeader("Content-Type", "application/pdf");
  res.setHeader(
    "Content-Disposition",
    `inline; filename="${String(sop.nomor_sop).replace(/[^\w-]/g, "_")}.pdf"`
  );

  res.sendFile(full);
}
