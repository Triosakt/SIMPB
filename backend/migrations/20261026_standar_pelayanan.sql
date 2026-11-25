-- Jalankan pada database ortala (backup database terlebih dahulu).
CREATE TABLE IF NOT EXISTS standar_pelayanan (
 id INT AUTO_INCREMENT PRIMARY KEY,
 nomor_standar VARCHAR(120) NOT NULL,
 nama_layanan VARCHAR(255) NOT NULL,
 tahun SMALLINT NOT NULL,
 unit_kerja_id BIGINT UNSIGNED NOT NULL,
 persyaratan TEXT NOT NULL,
 prosedur TEXT NOT NULL,
 jangka_waktu TEXT NOT NULL,
 biaya_tarif TEXT NOT NULL,
 produk_pelayanan TEXT NOT NULL,
 pengaduan TEXT NOT NULL,
 dasar_hukum TEXT NOT NULL,
 sarana_prasarana TEXT NOT NULL,
 kompetensi_pelaksana TEXT NOT NULL,
 pengawasan_internal TEXT NOT NULL,
 jumlah_pelaksana TEXT NOT NULL,
 jaminan_pelayanan TEXT NOT NULL,
 jaminan_keamanan TEXT NOT NULL,
 evaluasi_kinerja TEXT NOT NULL,
 file VARCHAR(500) NOT NULL,
 approval_status ENUM('pending','approved','rejected') NOT NULL DEFAULT 'pending',
 catatan_review TEXT NULL,
 uploaded_by BIGINT UNSIGNED NOT NULL,
 approved_by BIGINT UNSIGNED NULL,
 approved_at DATETIME NULL,
 view_count INT NOT NULL DEFAULT 0,
 download_count INT NOT NULL DEFAULT 0,
 created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
 updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
 INDEX idx_sp_status (approval_status),
 INDEX idx_sp_unit (unit_kerja_id)
);

CREATE TABLE IF NOT EXISTS standar_pelayanan_log (
 id INT AUTO_INCREMENT PRIMARY KEY,
 standar_id INT NOT NULL,
 action VARCHAR(30) NOT NULL,
 actor_id BIGINT UNSIGNED NOT NULL,
 catatan TEXT NULL,
 created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
 INDEX idx_sp_log (standar_id)
);