
-- SIMPB-BAPETEN
-- Perbaikan kompatibilitas tipe kolom dan foreign key.
-- Jalankan hanya setelah backup database diverifikasi.
-- DDL MySQL melakukan implicit commit; jangan menganggap
-- seluruh ALTER TABLE di bawah bersifat atomik sebagai satu paket.

ALTER TABLE standar_pelayanan
  MODIFY unit_kerja_id BIGINT UNSIGNED NOT NULL,
  MODIFY uploaded_by BIGINT UNSIGNED NOT NULL,
  MODIFY approved_by BIGINT UNSIGNED NULL;

ALTER TABLE standar_pelayanan_log
  MODIFY actor_id BIGINT UNSIGNED NOT NULL;

ALTER TABLE standar_pelayanan
  ADD CONSTRAINT fk_standar_unit
    FOREIGN KEY (unit_kerja_id)
    REFERENCES unit_kerja(id)
    ON DELETE RESTRICT,
  ADD CONSTRAINT fk_standar_uploader
    FOREIGN KEY (uploaded_by)
    REFERENCES users(id)
    ON DELETE RESTRICT,
  ADD CONSTRAINT fk_standar_approver
    FOREIGN KEY (approved_by)
    REFERENCES users(id)
    ON DELETE SET NULL;

ALTER TABLE standar_pelayanan_log
  ADD CONSTRAINT fk_standar_log_document
    FOREIGN KEY (standar_id)
    REFERENCES standar_pelayanan(id)
    ON DELETE RESTRICT,
  ADD CONSTRAINT fk_standar_log_actor
    FOREIGN KEY (actor_id)
    REFERENCES users(id)
    ON DELETE RESTRICT;

ALTER TABLE sop_dokumen_terkait
  ADD CONSTRAINT fk_sop_terkait_sop
    FOREIGN KEY (sop_id)
    REFERENCES sop(id)
    ON DELETE CASCADE;
