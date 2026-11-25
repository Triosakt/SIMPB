import crypto from "crypto";
import bcrypt from "bcryptjs";
import { pool } from "../config/db.js";
import { signToken } from "../middleware/auth.js";
import { sendOtpEmail } from "../services/mail.service.js";

const httpError = (status, message) =>
  Object.assign(new Error(message), { status });

const publicUser = (u) => ({
  id: u.id, name: u.name, email: u.email, role: u.role, unit_kerja_id: u.unit_kerja_id,
});

export async function login(req, res) {
  const { email, password } = req.body || {};
  if (!email || !password)
    return res.status(400).json({ message: "Email dan password wajib diisi" });

  const [rows] = await pool.query("SELECT * FROM users WHERE email = ?", [email]);
  const user = rows[0];
  // pesan sama untuk email salah / password salah agar tidak membocorkan akun
  if (!user || !user.is_active || !(await bcrypt.compare(password, user.password)))
    return res.status(401).json({ message: "Email atau password salah" });

  await pool.query("UPDATE users SET last_login_at = NOW() WHERE id = ?", [user.id]);
  res.json({ token: signToken(user), user: publicUser(user) });
}

// Registrasi publik hanya menghasilkan role user_biasa
export async function register(req, res) {
  const { name, email, password } = req.body || {};
  if (!name || !email || !password || password.length < 8)
    return res.status(400).json({ message: "Nama, email, dan password (min. 8 karakter) wajib diisi" });
  const hash = await bcrypt.hash(password, 12);
  const [r] = await pool.query(
    "INSERT INTO users (name, email, password, role) VALUES (?,?,?, 'user_biasa')",
    [name, email, hash]
  );
  res.status(201).json({ id: r.insertId });
}

export const me = (req, res) => res.json({ user: publicUser(req.user) });

/* =========================================================
   LUPA PASSWORD (OTP email)
   Alur: forgot-password -> verify-reset-otp -> reset-password
   ========================================================= */

const OTP_TTL_MINUTES = 10;
const RESET_TTL_MINUTES = 10;
const MAX_OTP_ATTEMPTS = 5;
const RESEND_COOLDOWN_SECONDS = 60;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const normalizeEmail = (value) => String(value || "").trim().toLowerCase();

// OTP hanya 6 digit, jadi di-HMAC dengan secret server (bukan hash polos)
const hashOtp = (userId, otp) =>
  crypto
    .createHmac("sha256", process.env.JWT_SECRET)
    .update(`${userId}:${otp}`)
    .digest("hex");

const hashToken = (token) =>
  crypto.createHash("sha256").update(token).digest("hex");

const safeEqualHex = (a, b) => {
  const bufA = Buffer.from(String(a), "hex");
  const bufB = Buffer.from(String(b), "hex");
  return bufA.length === bufB.length && crypto.timingSafeEqual(bufA, bufB);
};

// 1) Minta OTP. Jawaban selalu sama agar email terdaftar tidak bisa ditebak.
export async function requestPasswordReset(req, res) {
  const email = normalizeEmail(req.body?.email);
  if (!EMAIL_RE.test(email))
    throw httpError(400, "Format alamat email tidak valid");

  const generic = {
    message: "Jika email terdaftar, kode OTP telah dikirim.",
    expires_in: OTP_TTL_MINUTES * 60,
    resend_in: RESEND_COOLDOWN_SECONDS,
  };

  const [rows] = await pool.query(
    "SELECT id, name, email, is_active FROM users WHERE email = ?",
    [email]
  );
  const user = rows[0];
  if (!user || !user.is_active) return res.json(generic);

  // Cegah spam kirim ulang (cooldown per akun)
  const [recent] = await pool.query(
    `SELECT id FROM password_resets
     WHERE user_id = ? AND created_at > DATE_SUB(NOW(), INTERVAL ? SECOND)`,
    [user.id, RESEND_COOLDOWN_SECONDS]
  );
  if (recent.length) return res.json(generic);

  const otp = String(crypto.randomInt(0, 1000000)).padStart(6, "0");

  // Satu permintaan aktif per akun: permintaan lama dihapus
  await pool.query("DELETE FROM password_resets WHERE user_id = ?", [user.id]);
  await pool.query(
    `INSERT INTO password_resets (user_id, otp_hash, otp_expires_at)
     VALUES (?, ?, DATE_ADD(NOW(), INTERVAL ? MINUTE))`,
    [user.id, hashOtp(user.id, otp), OTP_TTL_MINUTES]
  );

  // Tidak di-await agar waktu respons sama untuk email terdaftar / tidak
  sendOtpEmail(user.email, user.name, otp).catch((err) =>
    console.error("[mail] Gagal mengirim OTP:", err.message)
  );

  res.json(generic);
}

// 2) Verifikasi OTP -> menghasilkan resetToken sekali pakai
export async function verifyPasswordResetOtp(req, res) {
  const email = normalizeEmail(req.body?.email);
  const otp = String(req.body?.otp || "").trim();

  if (!EMAIL_RE.test(email) || !/^\d{6}$/.test(otp))
    throw httpError(400, "Email atau kode OTP tidak valid");

  const invalid = () =>
    httpError(400, "Kode OTP salah atau sudah kedaluwarsa");

  const [rows] = await pool.query(
    `SELECT pr.id, pr.user_id, pr.otp_hash
     FROM password_resets pr
     JOIN users u ON u.id = pr.user_id
     WHERE u.email = ?
       AND pr.otp_hash IS NOT NULL
       AND pr.otp_expires_at > NOW()
       AND pr.attempts < ?`,
    [email, MAX_OTP_ATTEMPTS]
  );
  const row = rows[0];
  if (!row) throw invalid();

  if (!safeEqualHex(row.otp_hash, hashOtp(row.user_id, otp))) {
    await pool.query(
      "UPDATE password_resets SET attempts = attempts + 1 WHERE id = ?",
      [row.id]
    );
    throw invalid();
  }

  // OTP dihanguskan, diganti token reset berumur pendek
  const resetToken = crypto.randomBytes(32).toString("hex");
  await pool.query(
    `UPDATE password_resets
     SET otp_hash = NULL,
         reset_token_hash = ?,
         reset_expires_at = DATE_ADD(NOW(), INTERVAL ? MINUTE)
     WHERE id = ?`,
    [hashToken(resetToken), RESET_TTL_MINUTES, row.id]
  );

  res.json({ resetToken });
}

// 3) Simpan kata sandi baru memakai resetToken
export async function resetPassword(req, res) {
  const token = String(req.body?.resetToken || "");
  const password = String(req.body?.password || "");

  if (!/^[a-f0-9]{64}$/.test(token))
    throw httpError(400, "Sesi pemulihan tidak valid atau sudah kedaluwarsa");

  // bcrypt hanya memakai 72 byte pertama
  if (password.length < 8 || password.length > 72)
    throw httpError(400, "Kata sandi harus terdiri dari 8 sampai 72 karakter");

  const [rows] = await pool.query(
    `SELECT id, user_id FROM password_resets
     WHERE reset_token_hash = ? AND reset_expires_at > NOW()`,
    [hashToken(token)]
  );
  const row = rows[0];
  if (!row)
    throw httpError(400, "Sesi pemulihan tidak valid atau sudah kedaluwarsa");

  const hash = await bcrypt.hash(password, 12);

  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    await conn.query("UPDATE users SET password = ? WHERE id = ?", [hash, row.user_id]);
    await conn.query("DELETE FROM password_resets WHERE user_id = ?", [row.user_id]);
    await conn.commit();
  } catch (e) {
    await conn.rollback();
    throw e;
  } finally {
    conn.release();
  }

  res.json({ message: "Kata sandi berhasil diubah. Silakan masuk kembali." });
}