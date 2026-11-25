-- SIMPB MULTI RELASI SOP: jalankan pada database ortala, setelah backup database.
CREATE TABLE IF NOT EXISTS sop_dokumen_terkait (
 id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
 sop_id BIGINT UNSIGNED NOT NULL,
 document_type ENUM('peta','sub','cfm') NOT NULL,
 document_id BIGINT UNSIGNED NOT NULL,
 created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
 UNIQUE KEY uq_sop_document (sop_id,document_type,document_id),
 KEY idx_document (document_type,document_id)
);
INSERT IGNORE INTO sop_dokumen_terkait (sop_id,document_type,document_id)
 SELECT id,'peta',peta_proses_id FROM sop WHERE peta_proses_id IS NOT NULL;
INSERT IGNORE INTO sop_dokumen_terkait (sop_id,document_type,document_id)
 SELECT id,'sub',sub_proses_id FROM sop WHERE sub_proses_id IS NOT NULL;
INSERT IGNORE INTO sop_dokumen_terkait (sop_id,document_type,document_id)
 SELECT id,'cfm',cfm_id FROM sop WHERE cfm_id IS NOT NULL;
-- Kolom lama sengaja dipertahankan.
