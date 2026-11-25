import { pool } from "../config/db.js";
import { ROLES } from "../middleware/auth.js";

// Data untuk chart dashboard & laporan print. Perwakilan unit hanya melihat unitnya.
export async function summary(req, res) {
  const scoped = req.user.role === ROLES.UNIT;
  const scope = scoped ? "AND s.unit_kerja_id = ?" : "";
  const p = scoped ? [req.user.unit_kerja_id] : [];

  const publicOnly = req.user.role !== ROLES.ADMIN && req.user.role !== ROLES.UNIT;
  const [byStatus] = await pool.query(
    `SELECT s.approval_status AS status, COUNT(*) AS total FROM sop s WHERE 1=1 ${scope} ${publicOnly ? "AND s.approval_status = 'approved'" : ""} GROUP BY s.approval_status`, p);
  const [byYear] = await pool.query(
    `SELECT s.tahun_terbit AS tahun, COUNT(*) AS total FROM sop s
     WHERE s.approval_status = 'approved' ${scope} GROUP BY s.tahun_terbit ORDER BY s.tahun_terbit`, p);
  const [byUnit] = await pool.query(
    `SELECT COALESCE(uk.nama_unit, 'Lembaga') AS unit, COUNT(*) AS total FROM sop s
     LEFT JOIN unit_kerja uk ON uk.id = s.unit_kerja_id
     WHERE s.approval_status = 'approved' ${scope} GROUP BY unit ORDER BY total DESC LIMIT 15`, p);
  const [byJenis] = await pool.query(
    `SELECT s.jenis_sop AS jenis, COUNT(*) AS total FROM sop s
     WHERE s.approval_status = 'approved' ${scope} GROUP BY s.jenis_sop`, p);
  const [byBerlaku] = await pool.query(
    `SELECT s.status_berlaku AS status, COUNT(*) AS total FROM sop s
     WHERE s.approval_status = 'approved' ${scope} GROUP BY s.status_berlaku`, p);
  const [topDownload] = await pool.query(
    `SELECT s.id, s.nomor_sop, s.nama_sop, s.download_count FROM sop s
     WHERE s.approval_status = 'approved' ${scope} ORDER BY s.download_count DESC LIMIT 5`, p);

  res.json({ generated_at: new Date(), byStatus, byYear, byUnit, byJenis, byBerlaku, topDownload });
}

export async function processSummary(req, res) {
  const scoped = req.user.role === ROLES.UNIT;
  const publicOnly = req.user.role !== ROLES.ADMIN && !scoped;

  const documents = await Promise.all(
    [
      ["peta", "Peta Proses", "peta_proses"],
      ["sub", "Sub Proses", "sub_proses"],
      ["cfm", "Cross Functional Map", "cfm"],
    ].map(async ([type, label, table]) => {
      const relations = {
        peta: ["peta_proses_unit_kerja", "peta_proses_id"],
        sub: ["sub_proses_unit_kerja", "sub_proses_id"],
        cfm: ["cfm_unit_kerja", "cfm_id"],
      };

      const [relationTable, foreignKey] = relations[type];

      const where = scoped
         ? `WHERE (uploaded_by = ? OR EXISTS (
              SELECT 1 FROM ${relationTable} rel
              WHERE rel.${foreignKey} = ${table}.id
                AND rel.unit_kerja_id = ?
           ))`
         : publicOnly ? "WHERE approval_status = 'approved'" : "";

      const params = scoped
        ? [req.user.id, Number(req.user.unit_kerja_id || 0)]
        : [];

      const [statuses] = await pool.query(
        `SELECT approval_status AS status, COUNT(*) AS total
         FROM ${table} ${where}
         GROUP BY approval_status`,
        params
      );

      const [years] = await pool.query(
        `SELECT tahun_terbit AS tahun, COUNT(*) AS total
         FROM ${table} ${where}
         GROUP BY tahun_terbit
         ORDER BY tahun_terbit DESC`,
        params
      );

      const [[files]] = await pool.query(
        `SELECT COUNT(*) AS total,
          SUM(CASE WHEN file_pdf IS NOT NULL AND file_pdf <> ''
            THEN 1 ELSE 0 END) AS with_file
         FROM ${table} ${where}`,
        params
      );

      return {
        type,
        label,
        statuses,
        years,
        total: Number(files.total || 0),
        with_file: Number(files.with_file || 0),
      };
    })
  );

  res.json({
    generated_at: new Date(),
    scope: scoped ? "pengajuan_dan_unit_terkait" : publicOnly ? "dokumen_disetujui" : "seluruh_pengajuan",
    documents,
  });
}
// ============================================================
// STATISTIK DOKUMEN BERDASARKAN UNIT KERJA
// ============================================================
// Dokumen multi-unit dapat muncul di beberapa unit terkait,
// tetapi dihitung satu kali dalam total global statistik.

export async function unitSummary(req, res) {
  const scoped = req.user.role === ROLES.UNIT;
  const publicOnly = req.user.role !== ROLES.ADMIN && !scoped;
  const unitId = Number(req.user.unit_kerja_id || 0);

  const definitions = [
    {
      type: "peta",
      table: "peta_proses",
      relation: "peta_proses_unit_kerja",
      foreignKey: "peta_proses_id",
    },
    {
      type: "sub",
      table: "sub_proses",
      relation: "sub_proses_unit_kerja",
      foreignKey: "sub_proses_id",
    },
    {
      type: "cfm",
      table: "cfm",
      relation: "cfm_unit_kerja",
      foreignKey: "cfm_id",
    },
  ];

  const [units] = await pool.query(
    `SELECT id, nama_unit
     FROM unit_kerja
     ${scoped ? "WHERE id = ?" : ""}
     ORDER BY nama_unit ASC`,
    scoped ? [unitId] : []
  );

  const results = units.map((u) => ({
    unit_kerja_id: Number(u.id),
    unit: u.nama_unit,
    peta: 0,
    sub: 0,
    cfm: 0,
    sop: 0,
    total: 0,
    approved: 0,
    pending: 0,
    rejected: 0,
  }));

  const index = new Map(
    results.map((row) => [row.unit_kerja_id, row])
  );

  for (const definition of definitions) {
    const { type, table, relation, foreignKey } = definition;

    const [rows] = await pool.query(
      `SELECT
         rel.unit_kerja_id,
         d.approval_status,
         COUNT(DISTINCT d.id) AS total
       FROM ${relation} rel
       INNER JOIN ${table} d
         ON d.id = rel.${foreignKey}
       ${scoped ? "WHERE rel.unit_kerja_id = ?" : publicOnly ? "WHERE d.approval_status = 'approved'" : ""}
       GROUP BY rel.unit_kerja_id, d.approval_status`,
      scoped ? [unitId] : []
    );

    for (const item of rows) {
      const target = index.get(Number(item.unit_kerja_id));
      if (!target) continue;

      const count = Number(item.total || 0);

      target[type] += count;
      target.total += count;

      if (Object.prototype.hasOwnProperty.call(target, item.approval_status)) {
        target[item.approval_status] += count;
      }
    }
  }

  const [sopRows] = await pool.query(
    `SELECT
       s.unit_kerja_id,
       s.approval_status,
       COUNT(DISTINCT s.id) AS total
     FROM sop s
     WHERE s.unit_kerja_id IS NOT NULL
       ${scoped ? "AND s.unit_kerja_id = ?" : publicOnly ? "AND s.approval_status = 'approved'" : ""}
     GROUP BY s.unit_kerja_id, s.approval_status`,
    scoped ? [unitId] : []
  );

  for (const item of sopRows) {
    const target = index.get(Number(item.unit_kerja_id));
    if (!target) continue;

    const count = Number(item.total || 0);

    target.sop += count;
    target.total += count;

    if (Object.prototype.hasOwnProperty.call(target, item.approval_status)) {
      target[item.approval_status] += count;
    }
  }

  res.json({
    generated_at: new Date(),
    scope: scoped ? "unit_kerja" : "seluruh_unit",
    units: results.sort((a, b) => b.total - a.total),
    note: "Total per unit merupakan jumlah keterkaitan dokumen. Dokumen multi-unit dapat tercatat pada lebih dari satu unit.",
  });
}
