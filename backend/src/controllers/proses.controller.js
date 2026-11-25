import { notifyAdmins, notifyUser } from "../services/notification.service.js";
/* NOTIFIKASI PROSES TERPASANG */
import fs from "fs";
import path from "path";
import { pool } from "../config/db.js";
import { ROLES } from "../middleware/auth.js";
import { UPLOAD_ROOT } from "../middleware/upload.js";

const httpError = (status, message) => Object.assign(new Error(message), { status });
const units = (s) => (s ? s.split("||") : []);

// Daftar peta proses + jumlah turunan, dikelompokkan di sisi klien per keterangan (Inti/Pendukung/Lainnya)
export async function list(req, res) {
  const role = req.user?.role;
  const isAdmin = role === ROLES.ADMIN;
  const isUnit = role === ROLES.UNIT;
  const visibility = isAdmin
    ? "1=1"
    : isUnit
      ? "(p.approval_status = 'approved' OR p.uploaded_by = ? OR EXISTS (SELECT 1 FROM peta_proses_unit_kerja pu WHERE pu.peta_proses_id = p.id AND pu.unit_kerja_id = ?))"
      : "p.approval_status = 'approved'";
  const params = isUnit && !isAdmin
    ? [req.user.id, Number(req.user.unit_kerja_id || 0)]
    : [];
  const [rows] = await pool.query(
    `SELECT p.id, p.keterangan_id, k.nama_keterangan, p.nomor_peta_proses, p.judul, p.tahun_terbit, p.approval_status,
            (p.file_pdf IS NOT NULL) AS has_file,
            (SELECT GROUP_CONCAT(DISTINCT uk.nama_unit ORDER BY uk.nama_unit SEPARATOR '||')
             FROM peta_proses_unit_kerja pu
             JOIN unit_kerja uk ON uk.id = pu.unit_kerja_id
             WHERE pu.peta_proses_id = p.id) AS units,
            (SELECT GROUP_CONCAT(DISTINCT pu.unit_kerja_id ORDER BY pu.unit_kerja_id)
             FROM peta_proses_unit_kerja pu
             WHERE pu.peta_proses_id = p.id) AS unit_kerja_ids,
            (SELECT GROUP_CONCAT(DISTINCT pu.unit_kerja_id ORDER BY pu.unit_kerja_id)
             FROM peta_proses_unit_kerja pu
             WHERE pu.peta_proses_id = p.id) AS unit_kerja_ids,
            (SELECT COUNT(*) FROM sub_proses sp WHERE sp.peta_proses_id = p.id AND (p.approval_status <> 'approved' OR sp.approval_status = 'approved')) AS jml_sub,
            (SELECT COUNT(*) FROM cfm c WHERE c.peta_proses_id = p.id AND (p.approval_status <> 'approved' OR (c.approval_status = 'approved' AND EXISTS (SELECT 1 FROM sub_proses sp WHERE sp.id = c.sub_proses_id AND sp.approval_status = 'approved')))) AS jml_cfm,
            (SELECT COUNT(*) FROM sop s WHERE s.peta_proses_id = p.id AND s.approval_status = 'approved') AS jml_sop
     FROM peta_proses p JOIN keterangan k ON k.id = p.keterangan_id
     WHERE ${visibility}
     ORDER BY p.keterangan_id, p.nomor_peta_proses`, params
  );
  res.json(rows);
}

// Detail: peta proses -> sub proses -> CFM, plus SOP yang sudah disetujui
export async function detail(req, res) {
  const id = req.params.id;
  const role = req.user?.role;
  const isAdmin = role === ROLES.ADMIN;
  const isUnit = role === ROLES.UNIT;
  const visibility = isAdmin
    ? "1=1"
    : isUnit
      ? "(p.approval_status = 'approved' OR p.uploaded_by = ? OR EXISTS (SELECT 1 FROM peta_proses_unit_kerja pu WHERE pu.peta_proses_id = p.id AND pu.unit_kerja_id = ?))"
      : "p.approval_status = 'approved'";
  const params = [
    id,
    ...(isUnit && !isAdmin
      ? [req.user.id, Number(req.user.unit_kerja_id || 0)]
      : []),
  ];
  const [[peta]] = await pool.query(
    `SELECT p.id, p.nomor_peta_proses, p.judul, p.tahun_terbit, p.approval_status, k.nama_keterangan, (p.file_pdf IS NOT NULL) AS has_file,
            (SELECT GROUP_CONCAT(uk.nama_unit ORDER BY uk.nama_unit SEPARATOR '||')
               FROM peta_proses_unit_kerja pu JOIN unit_kerja uk ON uk.id = pu.unit_kerja_id WHERE pu.peta_proses_id = p.id) AS units
     FROM peta_proses p JOIN keterangan k ON k.id = p.keterangan_id WHERE p.id = ? AND ${visibility}`, params);
  if (!peta) throw httpError(404, "Peta proses tidak ditemukan");

  const [subs] = await pool.query(
    `SELECT sp.id, sp.nomor_sub_proses, sp.nama_sub_proses, sp.tahun_terbit, (sp.file_pdf IS NOT NULL) AS has_file,
            (SELECT GROUP_CONCAT(uk.nama_unit ORDER BY uk.nama_unit SEPARATOR '||')
               FROM sub_proses_unit_kerja su JOIN unit_kerja uk ON uk.id = su.unit_kerja_id WHERE su.sub_proses_id = sp.id) AS units,
            (SELECT GROUP_CONCAT(DISTINCT su.unit_kerja_id ORDER BY su.unit_kerja_id)
             FROM sub_proses_unit_kerja su
             WHERE su.sub_proses_id = sp.id) AS unit_kerja_ids
     FROM sub_proses sp WHERE sp.peta_proses_id = ? AND sp.approval_status = 'approved' ORDER BY sp.nomor_sub_proses`, [id]);
  const [cfms] = await pool.query(
    `SELECT c.id, c.sub_proses_id, c.nomor_cfm, c.nama_cfm, c.tahun_terbit, (c.file_pdf IS NOT NULL) AS has_file,
            (SELECT GROUP_CONCAT(uk.nama_unit ORDER BY uk.nama_unit SEPARATOR '||')
               FROM cfm_unit_kerja cu JOIN unit_kerja uk ON uk.id = cu.unit_kerja_id WHERE cu.cfm_id = c.id) AS units,
            (SELECT GROUP_CONCAT(DISTINCT cu.unit_kerja_id ORDER BY cu.unit_kerja_id)
             FROM cfm_unit_kerja cu
             WHERE cu.cfm_id = c.id) AS unit_kerja_ids
     FROM cfm c JOIN sub_proses sp ON sp.id = c.sub_proses_id WHERE c.peta_proses_id = ? AND c.approval_status = 'approved' AND sp.approval_status = 'approved' ORDER BY c.nomor_cfm`, [id]);
  const [sops] = await pool.query(
    `SELECT s.id, s.sub_proses_id, s.cfm_id, s.nomor_sop, s.nama_sop, s.tahun_terbit, s.status_berlaku
     FROM sop s WHERE s.peta_proses_id = ? AND s.approval_status = 'approved' ORDER BY s.nomor_sop`, [id]);

  res.json({
    ...peta, units: units(peta.units),
    sub_proses: subs.map((s) => ({
      ...s, units: units(s.units),
      cfm: cfms.filter((c) => c.sub_proses_id === s.id).map((c) => ({
        ...c, units: units(c.units), sop: sops.filter((o) => o.cfm_id === c.id),
      })),
      sop: sops.filter((o) => o.sub_proses_id === s.id && !o.cfm_id), // SOP yang terkait sub proses saja
    })),
    sop_tanpa_sub: sops.filter((o) => !o.sub_proses_id),
  });
}

// Membuat peta proses baru (khusus admin; akses dibatasi di route)
export async function createPeta(req, res) {
  const uploadedPath = req.file?.path;
  let connection;

  try {
    const {
      keterangan_id,
      nomor_peta_proses,
      judul,
      tahun_terbit,
      unit_kerja_ids,
    } = req.body || {};

    const kategoriId = Number(keterangan_id);
    const tahun = Number(tahun_terbit);
    const nomor = String(nomor_peta_proses || "").trim();
    const namaJudul = String(judul || "").trim();

    let unitIds = [];

    try {
      unitIds = unit_kerja_ids
        ? JSON.parse(unit_kerja_ids)
        : [];
    } catch {
      throw httpError(400, "Format unit kerja tidak valid");
    }

    if (!nomor || !namaJudul || !kategoriId || !tahun) {
      throw httpError(
        400,
        "Nomor peta, judul, kategori, dan tahun wajib diisi"
      );
    }

    if (!req.file) {
      throw httpError(400, "File PDF peta proses wajib diunggah");
    }

    if (
      !Number.isInteger(kategoriId) ||
      !Number.isInteger(tahun) ||
      tahun < 1901 ||
      tahun > 2155
    ) {
      throw httpError(400, "Kategori atau tahun terbit tidak valid");
    }

    if (!Array.isArray(unitIds)) {
      throw httpError(400, "Daftar unit kerja tidak valid");
    }

    unitIds = [...new Set(unitIds.map(Number))];
    const isUnitUpload = req.user.role === ROLES.UNIT;
    if (isUnitUpload) {
      if (!req.user.unit_kerja_id) throw httpError(403, "Akun belum terhubung ke unit kerja");
      unitIds = [Number(req.user.unit_kerja_id)];
    }

    if (unitIds.some((id) => !Number.isInteger(id) || id <= 0)) {
      throw httpError(400, "Pilihan unit kerja tidak valid");
    }

    connection = await pool.getConnection();
    await connection.beginTransaction();

    const [[kategori]] = await connection.query(
      "SELECT id FROM keterangan WHERE id = ?",
      [kategoriId]
    );

    if (!kategori) {
      throw httpError(400, "Kategori peta proses tidak ditemukan");
    }

    if (unitIds.length > 0) {
      const [units] = await connection.query(
        `SELECT id FROM unit_kerja
         WHERE is_active = 1 AND id IN (${unitIds.map(() => "?").join(",")})`,
        unitIds
      );

      if (units.length !== unitIds.length) {
        throw httpError(
          400,
          "Ada unit kerja yang tidak ditemukan atau sudah tidak aktif"
        );
      }
    }

    const filePath = `peta-proses/${path.basename(req.file.filename)}`;

    const [result] = await connection.query(
      `INSERT INTO peta_proses
       (keterangan_id, nomor_peta_proses, judul, tahun_terbit, file_pdf,
        approval_status, uploaded_by, approved_by, approved_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, IF(? = 1, NOW(), NULL))`,
      [kategoriId, nomor, namaJudul, tahun, filePath, isUnitUpload ? "pending" : "approved", req.user.id, isUnitUpload ? null : req.user.id, isUnitUpload ? 0 : 1]
    );

    if (unitIds.length > 0) {
      await connection.query(
        `INSERT INTO peta_proses_unit_kerja
         (peta_proses_id, unit_kerja_id)
         VALUES ${unitIds.map(() => "(?, ?)").join(", ")}`,
        unitIds.flatMap((unitId) => [result.insertId, unitId])
      );
    }

    await connection.commit();
    if (isUnitUpload) {
      try {
        await notifyAdmins({
          type: "process_submitted",
          title: "Pengajuan Peta Proses baru",
          message: `${req.user.name || "Perwakilan unit"} mengajukan Peta Proses: ${namaJudul} (${nomor}). Menunggu persetujuan Ortala.`,
          sopId: null
        });
      } catch (notificationError) {
        console.error("Gagal mengirim notifikasi pengajuan Peta Proses:", notificationError);
      }
    }

    res.status(201).json({
      message: "Peta proses berhasil diunggah",
      id: result.insertId,
    });
  } catch (error) {
    if (connection) {
      await connection.rollback();
    }

    if (uploadedPath) {
      await fs.promises.unlink(uploadedPath).catch(() => {});
    }

    throw error;
  } finally {
    connection?.release();
  }
}

// Tampilkan PDF peta proses / sub proses / CFM (semua role yang login)
const TABLES = { peta: "peta_proses", sub: "sub_proses", cfm: "cfm" };
export async function file(req, res) {
  const table = TABLES[req.params.type];
  if (!table) throw httpError(404, "Jenis dokumen tidak ditemukan");
  const [[row]] = await pool.query(
    req.params.type === "peta"
      ? "SELECT p.file_pdf, p.approval_status, p.uploaded_by, p.approval_status AS parent_status, 'approved' AS sub_status FROM peta_proses p WHERE p.id = ?"
      : req.params.type === "sub"
      ? "SELECT sp.file_pdf, sp.approval_status, sp.uploaded_by, p.approval_status AS parent_status, 'approved' AS sub_status FROM sub_proses sp JOIN peta_proses p ON p.id = sp.peta_proses_id WHERE sp.id = ?"
      : "SELECT c.file_pdf, c.approval_status, c.uploaded_by, p.approval_status AS parent_status, sp.approval_status AS sub_status FROM cfm c JOIN peta_proses p ON p.id = c.peta_proses_id JOIN sub_proses sp ON sp.id = c.sub_proses_id AND sp.peta_proses_id = p.id WHERE c.id = ?",
    [req.params.id]
  );
  const publicApproved = row?.approval_status === "approved" && row.parent_status === "approved" && row.sub_status === "approved";
  const ownPending = req.user?.role === ROLES.UNIT && Number(row?.uploaded_by) === Number(req.user?.id);
  if (row && !publicApproved && req.user?.role !== ROLES.ADMIN && !ownPending) throw httpError(404, "Dokumen tidak ditemukan");
  if (!row?.file_pdf) throw httpError(404, "File PDF belum tersedia");

  const full = path.resolve(UPLOAD_ROOT, row.file_pdf);
  if (!full.startsWith(UPLOAD_ROOT + path.sep)) throw httpError(400, "Path file tidak valid");
  if (!fs.existsSync(full)) throw httpError(404, "File tidak ditemukan di server. Salin folder PDF lama ke backend/uploads.");

  res.setHeader("Content-Type", "application/pdf");
  res.setHeader("Content-Disposition", "inline");
  res.sendFile(full);
}



// SIMPB_KATALOG_DASHBOARD_ROLE_V1
// Dokumen approved terlihat oleh semua akun dashboard.
// Pengajuan non-approved: seluruhnya untuk Admin, milik pengunggah untuk Unit.
export async function katalogDashboard(req, res) {
  const role = req.user?.role;
  if (role !== ROLES.ADMIN && role !== ROLES.UNIT) {
    throw httpError(403, "Akses katalog dashboard ditolak");
  }

  const admin = role === ROLES.ADMIN;
  const own = Number(req.user.id);

  const petaWhere = admin
    ? "1=1"
    : "(p.approval_status='approved' OR p.uploaded_by=?)";
  const subWhere = admin
    ? "1=1"
    : "((sp.approval_status='approved' AND p.approval_status='approved') OR sp.uploaded_by=?)";
  const cfmWhere = admin
    ? "1=1"
    : "((c.approval_status='approved' AND sp.approval_status='approved' AND p.approval_status='approved') OR c.uploaded_by=?)";

  const [peta] = await pool.query(`
    SELECT p.id, p.id AS peta_proses_id,
      p.nomor_peta_proses AS nomor, p.judul, p.tahun_terbit,
      p.approval_status, k.nama_keterangan AS kategori,
      (SELECT GROUP_CONCAT(DISTINCT uk.nama_unit ORDER BY uk.nama_unit SEPARATOR '||')
       FROM peta_proses_unit_kerja pu
       JOIN unit_kerja uk ON uk.id=pu.unit_kerja_id
       WHERE pu.peta_proses_id=p.id) AS units,
      (p.file_pdf IS NOT NULL AND p.file_pdf <> '') AS has_file
    FROM peta_proses p
    LEFT JOIN keterangan k ON k.id=p.keterangan_id
    WHERE ${petaWhere}
    ORDER BY p.id DESC
  `, admin ? [] : [own]);

  const [sub] = await pool.query(`
    SELECT sp.id, sp.peta_proses_id,
      sp.nomor_sub_proses AS nomor, sp.nama_sub_proses AS judul,
      sp.tahun_terbit, sp.approval_status,
      p.judul AS nama_peta_proses,
      (SELECT GROUP_CONCAT(DISTINCT uk.nama_unit ORDER BY uk.nama_unit SEPARATOR '||')
       FROM sub_proses_unit_kerja su
       JOIN unit_kerja uk ON uk.id=su.unit_kerja_id
       WHERE su.sub_proses_id=sp.id) AS units,
      (sp.file_pdf IS NOT NULL AND sp.file_pdf <> '') AS has_file
    FROM sub_proses sp
    JOIN peta_proses p ON p.id=sp.peta_proses_id
    WHERE ${subWhere}
    ORDER BY sp.id DESC
  `, admin ? [] : [own]);

  const [cfm] = await pool.query(`
    SELECT c.id, c.peta_proses_id, c.sub_proses_id,
      c.nomor_cfm AS nomor, c.nama_cfm AS judul,
      c.tahun_terbit, c.approval_status,
      p.judul AS nama_peta_proses,
      (SELECT GROUP_CONCAT(DISTINCT uk.nama_unit ORDER BY uk.nama_unit SEPARATOR '||')
       FROM cfm_unit_kerja cu
       JOIN unit_kerja uk ON uk.id=cu.unit_kerja_id
       WHERE cu.cfm_id=c.id) AS units,
      (c.file_pdf IS NOT NULL AND c.file_pdf <> '') AS has_file
    FROM cfm c
    JOIN sub_proses sp ON sp.id=c.sub_proses_id
    JOIN peta_proses p ON p.id=c.peta_proses_id
      AND sp.peta_proses_id=p.id
    WHERE ${cfmWhere}
    ORDER BY c.id DESC
  `, admin ? [] : [own]);

  res.json({ peta, sub, cfm });
}

// Katalog Peta Proses dan CFM untuk homepage
export async function katalog(req, res) {
  // SIMPB_SOP_UNIT_SCOPE_V1: hanya pilihan Upload SOP yang dibatasi; katalog publik tetap sama.
  const sopScope = req.query.scope === "sop";
  const isAdmin = req.user?.role === "admin_ortala";
  if (sopScope && !isAdmin && req.user?.role !== "perwakilan_unit") {
    return res.status(403).json({ message: "Pilihan dokumen terkait hanya untuk akun unit kerja atau Admin Ortala." });
  }
  const unitId = Number(req.user?.unit_kerja_id);
  if (sopScope && !isAdmin && (!Number.isSafeInteger(unitId) || unitId <= 0)) {
    return res.status(403).json({ message: "Akun belum memiliki unit kerja yang valid." });
  }
  const scoped = sopScope && !isAdmin;
  const params = scoped ? [unitId] : [];
  const petaScope = scoped ? ` AND EXISTS (SELECT 1 FROM peta_proses_unit_kerja pu_scope WHERE pu_scope.peta_proses_id = p.id AND pu_scope.unit_kerja_id = ?)` : "";
  const subScope = scoped ? ` AND EXISTS (SELECT 1 FROM sub_proses_unit_kerja su_scope WHERE su_scope.sub_proses_id = sp.id AND su_scope.unit_kerja_id = ?) AND EXISTS (SELECT 1 FROM peta_proses_unit_kerja pu_scope WHERE pu_scope.peta_proses_id = p.id AND pu_scope.unit_kerja_id = ?)` : "";
  const cfmScope = scoped ? ` AND EXISTS (SELECT 1 FROM cfm_unit_kerja cu_scope WHERE cu_scope.cfm_id = c.id AND cu_scope.unit_kerja_id = ?) AND EXISTS (SELECT 1 FROM sub_proses_unit_kerja su_scope WHERE su_scope.sub_proses_id = sp.id AND su_scope.unit_kerja_id = ?) AND EXISTS (SELECT 1 FROM peta_proses_unit_kerja pu_scope WHERE pu_scope.peta_proses_id = p.id AND pu_scope.unit_kerja_id = ?)` : "";
  const [peta] = await pool.query(`
    SELECT
      p.id,
      p.nomor_peta_proses AS nomor,
      p.judul,
      p.tahun_terbit,
      k.nama_keterangan AS kategori,
      (
        SELECT GROUP_CONCAT(DISTINCT uk.nama_unit SEPARATOR '||')
        FROM peta_proses_unit_kerja pu
        JOIN unit_kerja uk ON uk.id = pu.unit_kerja_id
        WHERE pu.peta_proses_id = p.id
      ) AS units,
      (p.file_pdf IS NOT NULL AND p.file_pdf <> '') AS has_file
    FROM peta_proses p
    JOIN keterangan k ON k.id = p.keterangan_id
    WHERE p.approval_status = 'approved' ${petaScope}
    ORDER BY p.created_at DESC, p.id DESC
  `, params);


  const [sub] = await pool.query(`
    SELECT sp.id, sp.peta_proses_id, sp.nomor_sub_proses AS nomor,
      sp.nama_sub_proses AS judul, sp.tahun_terbit,
      p.judul AS nama_peta_proses,
      (SELECT GROUP_CONCAT(DISTINCT uk.nama_unit SEPARATOR '||')
       FROM sub_proses_unit_kerja su JOIN unit_kerja uk ON uk.id = su.unit_kerja_id
       WHERE su.sub_proses_id = sp.id) AS units,
      (sp.file_pdf IS NOT NULL AND sp.file_pdf <> '') AS has_file
    FROM sub_proses sp JOIN peta_proses p ON p.id = sp.peta_proses_id
    WHERE sp.approval_status = 'approved' AND p.approval_status = 'approved' ${subScope}
    ORDER BY sp.id DESC
  `, scoped ? [unitId, unitId] : []);

  const [cfm] = await pool.query(`
    SELECT
      c.id,
      c.peta_proses_id,
      c.sub_proses_id,
      c.nomor_cfm AS nomor,
      c.nama_cfm AS judul,
      c.tahun_terbit,
      p.judul AS nama_peta_proses,
      (
        SELECT GROUP_CONCAT(DISTINCT uk.nama_unit SEPARATOR '||')
        FROM cfm_unit_kerja cu
        JOIN unit_kerja uk ON uk.id = cu.unit_kerja_id
        WHERE cu.cfm_id = c.id
      ) AS units,
      (c.file_pdf IS NOT NULL AND c.file_pdf <> '') AS has_file
    FROM cfm c
    JOIN peta_proses p ON p.id = c.peta_proses_id
    JOIN sub_proses sp ON sp.id = c.sub_proses_id AND sp.peta_proses_id = p.id
    WHERE c.approval_status = 'approved' AND p.approval_status = 'approved' AND sp.approval_status = 'approved' ${cfmScope}
    ORDER BY c.id DESC
  `, scoped ? [unitId, unitId, unitId] : []);

  res.json({ peta, sub, cfm });
}
// ---------- Pengelolaan Peta Proses oleh Admin ----------

export async function updatePeta(req, res) {
  const { keterangan_id, nomor_peta_proses, judul, tahun_terbit } = req.body || {};
  const id = req.params.id;
  const newFile = req.file
    ? `peta-proses/${path.basename(req.file.filename)}`
    : null;

  let conn;
  let committed = false;
  let previousFile = null;

  try {
    const unitIds = parseProcessUnits(req.body?.unit_kerja_ids);

    const year = tahun_terbit ? Number(tahun_terbit) : null;
    if (year !== null && (!Number.isInteger(year) || year < 1901 || year > 2155)) {
      throw httpError(400, "Tahun terbit tidak valid");
    }

    conn = await pool.getConnection();
    await conn.beginTransaction();

    const [[current]] = await conn.query(
      "SELECT * FROM peta_proses WHERE id = ? FOR UPDATE",
      [id]
    );
    if (!current) throw httpError(404, "Peta proses tidak ditemukan");

    previousFile = current.file_pdf;

    if (keterangan_id) {
      const [[kategori]] = await conn.query(
        "SELECT id FROM keterangan WHERE id = ?",
        [keterangan_id]
      );
      if (!kategori) throw httpError(400, "Kategori tidak ditemukan");
    }

    if (unitIds !== null) {
      await ensureProcessUnits(conn, unitIds);
    }

    await conn.query(
      `UPDATE peta_proses SET
        keterangan_id = COALESCE(?, keterangan_id),
        nomor_peta_proses = COALESCE(?, nomor_peta_proses),
        judul = COALESCE(?, judul),
        tahun_terbit = COALESCE(?, tahun_terbit),
        file_pdf = COALESCE(?, file_pdf)
       WHERE id = ?`,
      [
        keterangan_id || null,
        nomor_peta_proses || null,
        judul || null,
        year,
        newFile,
        id,
      ]
    );

    if (unitIds !== null) {
      await replaceProcessUnits(
        conn,
        "peta_proses_unit_kerja",
        "peta_proses_id",
        id,
        unitIds
      );
    }

    await conn.commit();
    committed = true;
  } catch (error) {
    if (conn && !committed) await conn.rollback();
    if (newFile && !committed) removeProcessFile(newFile);
    throw error;
  } finally {
    if (conn) conn.release();
  }

  if (newFile && previousFile) removeProcessFile(previousFile);
  res.json({ message: "Peta proses berhasil diperbarui" });
}

export async function deletePeta(req, res) {
  const id = req.params.id;
  const conn = await pool.getConnection();

  try {
    await conn.beginTransaction();

    const [[peta]] = await conn.query(
      "SELECT * FROM peta_proses WHERE id = ? FOR UPDATE",
      [id]
    );
    if (!peta) throw httpError(404, "Peta proses tidak ditemukan");

    const [[usage]] = await conn.query(
      `SELECT COUNT(DISTINCT s.id) AS total
       FROM sop s
       LEFT JOIN sub_proses sp ON sp.id = s.sub_proses_id
       LEFT JOIN cfm c ON c.id = s.cfm_id
       WHERE s.peta_proses_id = ?
          OR sp.peta_proses_id = ?
          OR c.peta_proses_id = ?`,
      [id, id, id]
    );

    if (Number(usage.total) > 0) {
      throw httpError(
        409,
        `Peta proses masih terkait dengan ${usage.total} SOP. Pindahkan relasi SOP terlebih dahulu.`
      );
    }

    const [subs] = await conn.query(
      "SELECT file_pdf FROM sub_proses WHERE peta_proses_id = ?",
      [id]
    );
    const [cfms] = await conn.query(
      "SELECT file_pdf FROM cfm WHERE peta_proses_id = ?",
      [id]
    );

    await conn.query("DELETE FROM peta_proses WHERE id = ?", [id]);
    await conn.commit();

    [peta.file_pdf, ...subs.map((x) => x.file_pdf), ...cfms.map((x) => x.file_pdf)]
      .filter(Boolean)
      .forEach(removeProcessFile);

    res.json({ message: "Peta proses berhasil dihapus" });
  } catch (error) {
    await conn.rollback();
    throw error;
  } finally {
    conn.release();
  }
}

function removeProcessFile(relativePath) {
  if (!relativePath) return;
  const full = path.resolve(UPLOAD_ROOT, relativePath);
  if (full.startsWith(UPLOAD_ROOT + path.sep)) {
    fs.unlink(full, () => {});
  }
}


// ---------- CRUD Sub Proses dan CFM (Admin) ----------

function parseProcessUnits(value) {
  if (value === undefined || value === null || value === "") return null;

  let parsed = value;
  if (typeof value === "string") {
    try {
      parsed = JSON.parse(value);
    } catch {
      throw httpError(400, "Format unit_kerja_ids harus berupa JSON array");
    }
  }

  if (!Array.isArray(parsed)) {
    throw httpError(400, "unit_kerja_ids harus berupa array");
  }

  const ids = [...new Set(parsed.map(Number))];
  if (ids.some((id) => !Number.isSafeInteger(id) || id <= 0)) {
    throw httpError(400, "Daftar unit kerja tidak valid");
  }
  return ids;
}

function validateProcessYear(value) {
  const year = Number(value);
  if (!Number.isInteger(year) || year < 1901 || year > 2155) {
    throw httpError(400, "Tahun terbit harus antara 1901 dan 2155");
  }
  return year;
}

async function replaceProcessUnits(conn, table, foreignKey, recordId, ids) {
  const allowed = {
    peta_proses_unit_kerja: ["peta_proses_id"],
    sub_proses_unit_kerja: ["sub_proses_id"],
    cfm_unit_kerja: ["cfm_id"],
  };
  if (!allowed[table]?.includes(foreignKey)) {
    throw httpError(500, "Konfigurasi relasi unit kerja tidak valid");
  }

  await conn.query(`DELETE FROM ${table} WHERE ${foreignKey} = ?`, [recordId]);
  if (!ids?.length) return;

  const placeholders = ids.map(() => "(?, ?)").join(", ");
  const values = ids.flatMap((unitId) => [recordId, unitId]);
  await conn.query(
    `INSERT INTO ${table} (${foreignKey}, unit_kerja_id) VALUES ${placeholders}`,
    values
  );
}

async function ensureProcessUnits(conn, ids) {
  if (!ids?.length) return;
  const placeholders = ids.map(() => "?").join(", ");
  const [rows] = await conn.query(
    `SELECT id FROM unit_kerja WHERE id IN (${placeholders})`,
    ids
  );
  if (rows.length !== ids.length) {
    throw httpError(400, "Satu atau lebih unit kerja tidak ditemukan");
  }
}

async function ensureProcessParent(conn, petaId, subId = null) {
  const [[peta]] = await conn.query(
    "SELECT id FROM peta_proses WHERE id = ?",
    [petaId]
  );
  if (!peta) throw httpError(400, "Peta proses tidak ditemukan");

  if (subId !== null) {
    const [[sub]] = await conn.query(
      "SELECT id FROM sub_proses WHERE id = ? AND peta_proses_id = ?",
      [subId, petaId]
    );
    if (!sub) {
      throw httpError(400, "Sub proses tidak ditemukan pada peta proses yang dipilih");
    }
  }
}

export async function createSubProses(req, res) {
  const body = req.body || {};
  const petaId = Number(body.peta_proses_id);
  const nomor = String(body.nomor_sub_proses || "").trim();
  const nama = String(body.nama_sub_proses || "").trim();
  const tahun = validateProcessYear(body.tahun_terbit);
  let unitIds = parseProcessUnits(body.unit_kerja_ids);
  const isUnitUpload = req.user.role === ROLES.UNIT;
  if (isUnitUpload) {
    if (!req.user.unit_kerja_id) throw httpError(403, "Akun belum terhubung ke unit kerja");
    unitIds = [Number(req.user.unit_kerja_id)];
  }

  if (!Number.isSafeInteger(petaId) || petaId <= 0 || !nomor || !nama) {
    throw httpError(400, "Peta proses, nomor, dan nama sub proses wajib diisi");
  }

  const conn = await pool.getConnection();
  let relativeFile = null;
  try {
    await conn.beginTransaction();
    await ensureProcessParent(conn, petaId);
    if (isUnitUpload) {
      const [parentRows] = await conn.query(
        "SELECT p.id FROM peta_proses p JOIN peta_proses_unit_kerja pu ON pu.peta_proses_id = p.id WHERE p.id = ? AND p.approval_status = ? AND pu.unit_kerja_id = ?",
        [petaId, "approved", Number(req.user.unit_kerja_id)]
      );
      if (!parentRows.length) throw httpError(403, "Peta proses belum disetujui atau bukan milik unit kerja Anda");
    }
    await ensureProcessUnits(conn, unitIds);

    if (req.file) relativeFile = `sub-proses/${path.basename(req.file.filename)}`;

    const [result] = await conn.query(
      `INSERT INTO sub_proses
       (peta_proses_id, nomor_sub_proses, nama_sub_proses, tahun_terbit, file_pdf, approval_status, uploaded_by, approved_by, approved_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, IF(? = 1, NOW(), NULL))`,
      [petaId, nomor, nama, tahun, relativeFile, isUnitUpload ? "pending" : "approved", req.user.id, isUnitUpload ? null : req.user.id, isUnitUpload ? 0 : 1]
    );

    if (unitIds !== null) {
      await replaceProcessUnits(conn, "sub_proses_unit_kerja", "sub_proses_id", result.insertId, unitIds);
    }

    await conn.commit();
    if (isUnitUpload) {
      try {
        await notifyAdmins({
          type: "process_submitted",
          title: "Pengajuan Sub Proses baru",
          message: `${req.user.name || "Perwakilan unit"} mengajukan Sub Proses: ${nama} (${nomor}). Menunggu persetujuan Ortala.`,
          sopId: null
        });
      } catch (notificationError) {
        console.error("Gagal mengirim notifikasi pengajuan Sub Proses:", notificationError);
      }
    }
    res.status(201).json({ id: result.insertId, message: "Sub proses berhasil ditambahkan" });
  } catch (error) {
    await conn.rollback();
    if (relativeFile) removeProcessFile(relativeFile);
    throw error;
  } finally {
    conn.release();
  }
}

export async function updateSubProses(req, res) {
  const id = req.params.id;
  const body = req.body || {};
  const conn = await pool.getConnection();
  let relativeFile = null;

  try {
    await conn.beginTransaction();
    const [[current]] = await conn.query(
      "SELECT * FROM sub_proses WHERE id = ? FOR UPDATE",
      [id]
    );
    if (!current) throw httpError(404, "Sub proses tidak ditemukan");

    const petaId = body.peta_proses_id === undefined
      ? Number(current.peta_proses_id)
      : Number(body.peta_proses_id);
    const nomor = body.nomor_sub_proses === undefined
      ? current.nomor_sub_proses
      : String(body.nomor_sub_proses).trim();
    const nama = body.nama_sub_proses === undefined
      ? current.nama_sub_proses
      : String(body.nama_sub_proses).trim();
    const tahun = body.tahun_terbit === undefined
      ? Number(current.tahun_terbit)
      : validateProcessYear(body.tahun_terbit);
    const unitIds = parseProcessUnits(body.unit_kerja_ids);

    if (!Number.isSafeInteger(petaId) || petaId <= 0 || !nomor || !nama) {
      throw httpError(400, "Peta proses, nomor, dan nama sub proses wajib valid");
    }

    await ensureProcessParent(conn, petaId);
    await ensureProcessUnits(conn, unitIds);

    if (req.file) relativeFile = `sub-proses/${path.basename(req.file.filename)}`;

    await conn.query(
      `UPDATE sub_proses SET peta_proses_id = ?, nomor_sub_proses = ?,
       nama_sub_proses = ?, tahun_terbit = ?, file_pdf = ?
       WHERE id = ?`,
      [petaId, nomor, nama, tahun, relativeFile || current.file_pdf, id]
    );

    if (unitIds !== null) {
      await replaceProcessUnits(conn, "sub_proses_unit_kerja", "sub_proses_id", id, unitIds);
    }

    await conn.commit();
    if (relativeFile && current.file_pdf) removeProcessFile(current.file_pdf);
    res.json({ message: "Sub proses berhasil diperbarui" });
  } catch (error) {
    await conn.rollback();
    if (relativeFile) removeProcessFile(relativeFile);
    throw error;
  } finally {
    conn.release();
  }
}

export async function deleteSubProses(req, res) {
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    const [[sub]] = await conn.query(
      "SELECT * FROM sub_proses WHERE id = ? FOR UPDATE",
      [req.params.id]
    );
    if (!sub) throw httpError(404, "Sub proses tidak ditemukan");

    const [[usage]] = await conn.query(
      `SELECT COUNT(DISTINCT s.id) AS total
       FROM sop s
       LEFT JOIN cfm c ON c.id = s.cfm_id
       WHERE s.sub_proses_id = ? OR c.sub_proses_id = ?`,
      [sub.id, sub.id]
    );
    if (Number(usage.total) > 0) {
      throw httpError(409, `Sub proses masih terkait dengan ${usage.total} SOP. Pindahkan relasi SOP terlebih dahulu.`);
    }

    const [cfms] = await conn.query(
      "SELECT id, file_pdf FROM cfm WHERE sub_proses_id = ?",
      [sub.id]
    );
    if (cfms.length) {
      const ids = cfms.map((row) => row.id);
      const placeholders = ids.map(() => "?").join(", ");
      const [[cfmUsage]] = await conn.query(
        `SELECT COUNT(*) AS total FROM sop WHERE cfm_id IN (${placeholders})`,
        ids
      );
      if (Number(cfmUsage.total) > 0) {
        throw httpError(409, "Sub proses memiliki CFM yang masih digunakan SOP");
      }
    }

    await conn.query("DELETE FROM sub_proses WHERE id = ?", [sub.id]);
    await conn.commit();

    [sub.file_pdf, ...cfms.map((row) => row.file_pdf)]
      .filter(Boolean).forEach(removeProcessFile);
    res.json({ message: "Sub proses berhasil dihapus" });
  } catch (error) {
    await conn.rollback();
    throw error;
  } finally {
    conn.release();
  }
}

export async function createCfm(req, res) {
  const body = req.body || {};
  const petaId = Number(body.peta_proses_id);
  const subId = Number(body.sub_proses_id);
  const nomor = String(body.nomor_cfm || "").trim();
  const nama = String(body.nama_cfm || "").trim();
  const tahun = validateProcessYear(body.tahun_terbit);
  let unitIds = parseProcessUnits(body.unit_kerja_ids);
  const isUnitUpload = req.user.role === ROLES.UNIT;
  if (isUnitUpload) {
    if (!req.user.unit_kerja_id) throw httpError(403, "Akun belum terhubung ke unit kerja");
    unitIds = [Number(req.user.unit_kerja_id)];
  }

  if (!Number.isSafeInteger(petaId) || petaId <= 0 ||
      !Number.isSafeInteger(subId) || subId <= 0 || !nomor || !nama) {
    throw httpError(400, "Peta proses, sub proses, nomor, dan nama CFM wajib diisi");
  }

  const conn = await pool.getConnection();
  let relativeFile = null;
  try {
    await conn.beginTransaction();
    await ensureProcessParent(conn, petaId, subId);
    if (isUnitUpload) {
      const unitId = Number(req.user.unit_kerja_id);
      const [parentRows] = await conn.query(
        "SELECT p.id FROM peta_proses p JOIN peta_proses_unit_kerja pu ON pu.peta_proses_id = p.id JOIN sub_proses sp ON sp.peta_proses_id = p.id JOIN sub_proses_unit_kerja su ON su.sub_proses_id = sp.id WHERE p.id = ? AND sp.id = ? AND p.approval_status = ? AND sp.approval_status = ? AND pu.unit_kerja_id = ? AND su.unit_kerja_id = ?",
        [petaId, subId, "approved", "approved", unitId, unitId]
      );
      if (!parentRows.length) throw httpError(403, "Peta proses atau sub proses belum disetujui atau bukan milik unit kerja Anda");
    }
    await ensureProcessUnits(conn, unitIds);

    if (req.file) relativeFile = `cfm/${path.basename(req.file.filename)}`;

    const [result] = await conn.query(
      `INSERT INTO cfm
       (peta_proses_id, sub_proses_id, nomor_cfm, nama_cfm, tahun_terbit, file_pdf, approval_status, uploaded_by, approved_by, approved_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, IF(? = 1, NOW(), NULL))`,
      [petaId, subId, nomor, nama, tahun, relativeFile, isUnitUpload ? "pending" : "approved", req.user.id, isUnitUpload ? null : req.user.id, isUnitUpload ? 0 : 1]
    );

    if (unitIds !== null) {
      await replaceProcessUnits(conn, "cfm_unit_kerja", "cfm_id", result.insertId, unitIds);
    }

    await conn.commit();
    if (isUnitUpload) {
      try {
        await notifyAdmins({
          type: "process_submitted",
          title: "Pengajuan CFM baru",
          message: `${req.user.name || "Perwakilan unit"} mengajukan CFM: ${nama} (${nomor}). Menunggu persetujuan Ortala.`,
          sopId: null
        });
      } catch (notificationError) {
        console.error("Gagal mengirim notifikasi pengajuan CFM:", notificationError);
      }
    }
    res.status(201).json({ id: result.insertId, message: "CFM berhasil ditambahkan" });
  } catch (error) {
    await conn.rollback();
    if (relativeFile) removeProcessFile(relativeFile);
    throw error;
  } finally {
    conn.release();
  }
}

export async function updateCfm(req, res) {
  const conn = await pool.getConnection();
  let relativeFile = null;

  try {
    await conn.beginTransaction();
    const [[current]] = await conn.query(
      "SELECT * FROM cfm WHERE id = ? FOR UPDATE",
      [req.params.id]
    );
    if (!current) throw httpError(404, "CFM tidak ditemukan");

    const body = req.body || {};
    const petaId = body.peta_proses_id === undefined
      ? Number(current.peta_proses_id)
      : Number(body.peta_proses_id);
    const subId = body.sub_proses_id === undefined
      ? Number(current.sub_proses_id)
      : Number(body.sub_proses_id);
    const nomor = body.nomor_cfm === undefined
      ? current.nomor_cfm
      : String(body.nomor_cfm).trim();
    const nama = body.nama_cfm === undefined
      ? current.nama_cfm
      : String(body.nama_cfm).trim();
    const tahun = body.tahun_terbit === undefined
      ? Number(current.tahun_terbit)
      : validateProcessYear(body.tahun_terbit);
    const unitIds = parseProcessUnits(body.unit_kerja_ids);

    if (!Number.isSafeInteger(petaId) || petaId <= 0 ||
        !Number.isSafeInteger(subId) || subId <= 0 || !nomor || !nama) {
      throw httpError(400, "Peta proses, sub proses, nomor, dan nama CFM wajib valid");
    }

    await ensureProcessParent(conn, petaId, subId);
    await ensureProcessUnits(conn, unitIds);

    if (req.file) relativeFile = `cfm/${path.basename(req.file.filename)}`;

    await conn.query(
      `UPDATE cfm SET peta_proses_id = ?, sub_proses_id = ?, nomor_cfm = ?,
       nama_cfm = ?, tahun_terbit = ?, file_pdf = ? WHERE id = ?`,
      [petaId, subId, nomor, nama, tahun, relativeFile || current.file_pdf, req.params.id]
    );

    if (unitIds !== null) {
      await replaceProcessUnits(conn, "cfm_unit_kerja", "cfm_id", req.params.id, unitIds);
    }

    await conn.commit();
    if (relativeFile && current.file_pdf) removeProcessFile(current.file_pdf);
    res.json({ message: "CFM berhasil diperbarui" });
  } catch (error) {
    await conn.rollback();
    if (relativeFile) removeProcessFile(relativeFile);
    throw error;
  } finally {
    conn.release();
  }
}

export async function deleteCfm(req, res) {
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    const [[cfm]] = await conn.query(
      "SELECT * FROM cfm WHERE id = ? FOR UPDATE",
      [req.params.id]
    );
    if (!cfm) throw httpError(404, "CFM tidak ditemukan");

    const [[usage]] = await conn.query(
      "SELECT COUNT(*) AS total FROM sop WHERE cfm_id = ?",
      [cfm.id]
    );
    if (Number(usage.total) > 0) {
      throw httpError(409, `CFM masih terkait dengan ${usage.total} SOP. Pindahkan relasi SOP terlebih dahulu.`);
    }

    await conn.query("DELETE FROM cfm WHERE id = ?", [cfm.id]);
    await conn.commit();

    if (cfm.file_pdf) removeProcessFile(cfm.file_pdf);
    res.json({ message: "CFM berhasil dihapus" });
  } catch (error) {
    await conn.rollback();
    throw error;
  } finally {
    conn.release();
  }
}


export async function listProcessApprovals(req, res) {
  const [peta] = await pool.query(
    `SELECT "peta" AS document_type, p.id,
            p.judul AS title, p.nomor_peta_proses AS document_number,
            p.tahun_terbit, p.file_pdf, p.uploaded_by,
            u.name AS uploaded_by_name
     FROM peta_proses p
     LEFT JOIN users u ON u.id = p.uploaded_by
     WHERE p.approval_status = ?`,
    ["pending"]
  );

  const [sub] = await pool.query(
    `SELECT "sub" AS document_type, sp.id,
            sp.nama_sub_proses AS title,
            sp.nomor_sub_proses AS document_number,
            sp.tahun_terbit, sp.file_pdf, sp.uploaded_by,
            u.name AS uploaded_by_name
     FROM sub_proses sp
     LEFT JOIN users u ON u.id = sp.uploaded_by
     WHERE sp.approval_status = ?`,
    ["pending"]
  );

  const [cfm] = await pool.query(
    `SELECT "cfm" AS document_type, c.id,
            c.nama_cfm AS title, c.nomor_cfm AS document_number,
            c.tahun_terbit, c.file_pdf, c.uploaded_by,
            u.name AS uploaded_by_name
     FROM cfm c
     LEFT JOIN users u ON u.id = c.uploaded_by
     WHERE c.approval_status = ?`,
    ["pending"]
  );

  res.json({ data: [...peta, ...sub, ...cfm] });
}

export async function reviewProcessDocument(req, res) {
  const tables = {
    peta: "peta_proses",
    sub: "sub_proses",
    cfm: "cfm"
  };

  const table = tables[req.params.type];
  const id = Number(req.params.id);
  const decision = req.params.decision;
  const body = req.body || {};
  const reason = String(body.reject_reason || body.catatan || "").trim();

  if (!table || !Number.isSafeInteger(id) || id <= 0) {
    throw httpError(400, "Jenis atau ID dokumen tidak valid");
  }
  if (decision !== "approve" && decision !== "reject") {
    throw httpError(400, "Keputusan approval tidak valid");
  }
  if (decision === "reject" && !reason) {
    throw httpError(400, "Alasan penolakan wajib diisi");
  }

  const [[documentOwner]] = await pool.query(
    `SELECT uploaded_by FROM ${table} WHERE id = ? AND approval_status = 'pending'`,
    [id]
  );
  const status = decision === "approve" ? "approved" : "rejected";
  const [result] = await pool.query(
    `UPDATE ${table}
     SET approval_status = ?, approved_by = ?, approved_at = NOW(),
         reject_reason = ?
     WHERE id = ? AND approval_status = ?`,
    [status, req.user.id, decision === "reject" ? reason : null, id, "pending"]
  );

  if (!result.affectedRows) {
    throw httpError(404, "Dokumen pending tidak ditemukan atau sudah diproses");
  }

  if (documentOwner?.uploaded_by) {
    try {
      const labels = { peta: "Peta Proses", sub: "Sub Proses", cfm: "CFM" };
      await notifyUser(documentOwner.uploaded_by, {
        type: decision === "approve" ? "process_approved" : "process_rejected",
        title: `${labels[req.params.type]} ${decision === "approve" ? "disetujui" : "ditolak"}`,
        message: decision === "approve"
          ? `Pengajuan ${labels[req.params.type]} Anda telah disetujui Admin Ortala.`
          : `Pengajuan ${labels[req.params.type]} Anda ditolak. Alasan: ${reason}`,
        sopId: null
      });
    } catch (notificationError) {
      console.error("Gagal mengirim notifikasi hasil review proses:", notificationError);
    }
  }

  res.json({
    message: decision === "approve"
      ? "Dokumen berhasil disetujui"
      : "Dokumen berhasil ditolak",
    id,
    approval_status: status
  });
}
