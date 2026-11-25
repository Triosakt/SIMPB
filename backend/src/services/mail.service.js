
import nodemailer from "nodemailer";
import fs from "fs";
import path from "path";

let transporter; // undefined = belum dibuat, null = SMTP tidak dikonfigurasi

function getTransporter() {
  if (transporter !== undefined) return transporter;

  const { SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS } = process.env;

  if (!SMTP_HOST) {
    transporter = null;
    return transporter;
  }

  const port = Number(SMTP_PORT || 587);

  transporter = nodemailer.createTransport({
    host: SMTP_HOST,
    port,
    secure: port === 465,
    auth: SMTP_USER
      ? {
          user: SMTP_USER,
          pass: SMTP_PASS,
        }
      : undefined,
  });

  return transporter;
}

// Escape HTML untuk mencegah HTML injection
const escapeHtml = (value) =>
  String(value ?? "").replace(/[&<>"']/g, (c) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;",
  })[c]);

// Lokasi logo BAPETEN
function getLogoPath() {
  const logoPath = process.env.MAIL_LOGO_PATH
    ? path.resolve(process.env.MAIL_LOGO_PATH)
    : path.resolve(
        process.cwd(),
        "../frontend/public/img/logo.png"
      );

  return fs.existsSync(logoPath) ? logoPath : null;
}

export async function sendOtpEmail(to, name, otp) {
  const mailer = getTransporter();

  // Mode pengembangan tanpa SMTP
  if (!mailer) {
    if (process.env.NODE_ENV === "production") {
      throw new Error("SMTP belum dikonfigurasi (SMTP_HOST kosong)");
    }

    console.log(`[DEV] Kode OTP reset password untuk ${to}: ${otp}`);
    return;
  }

  const minutes = 10;
  const safeName = escapeHtml(name || "Pengguna SIMPB");
  const safeOtp = escapeHtml(otp);

  const logoPath = getLogoPath();

  // Logo dikirim sebagai gambar inline menggunakan CID
  const attachments = logoPath
    ? [
        {
          filename: "logo-bapeten.png",
          path: logoPath,
          cid: "bapeten-logo",
          contentType: "image/png",
        },
      ]
    : [];

  const logoHtml = logoPath
    ? `
      <img
        src="cid:bapeten-logo"
        alt="Logo BAPETEN"
        width="64"
        height="64"
        style="
          display:block;
          width:64px;
          height:64px;
          object-fit:contain;
          margin:0 auto 12px;
          background:#ffffff;
          border-radius:50%;
          padding:6px;
        "
      />
    `
    : `
      <div style="
        width:64px;
        height:64px;
        margin:0 auto 12px;
        border-radius:50%;
        background:#ffffff;
        color:#174b7a;
        font-size:13px;
        font-weight:bold;
        line-height:64px;
        text-align:center;
      ">
        BAPETEN
      </div>
    `;

  await mailer.sendMail({
    from: process.env.MAIL_FROM || process.env.SMTP_USER,
    to,

    subject: "Kode OTP Pemulihan Kata Sandi - SIMPB BAPETEN",

    text:
      `Halo ${name || "Pengguna SIMPB"},\n\n` +
      `Anda menerima permintaan pemulihan kata sandi akun SIMPB BAPETEN.\n\n` +
      `Kode verifikasi Anda: ${otp}\n\n` +
      `Kode berlaku selama ${minutes} menit. Jangan bagikan kode ini kepada siapa pun.\n\n` +
      `Jika Anda tidak meminta pemulihan kata sandi, abaikan email ini.\n\n` +
      `SIMPB BAPETEN\nBadan Pengawas Tenaga Nuklir`,

    attachments,

    html: `
<!DOCTYPE html>
<html lang="id">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <meta name="color-scheme" content="light" />
  <title>Verifikasi OTP SIMPB BAPETEN</title>
</head>

<body style="
  margin:0;
  padding:0;
  background-color:#f1f5f9;
  font-family:Arial,Helvetica,sans-serif;
  color:#1e293b;
">

  <table
    role="presentation"
    width="100%"
    cellpadding="0"
    cellspacing="0"
    border="0"
    style="background-color:#f1f5f9;padding:35px 12px;"
  >
    <tr>
      <td align="center">

        <table
          role="presentation"
          width="100%"
          cellpadding="0"
          cellspacing="0"
          border="0"
          style="
            max-width:520px;
            background-color:#ffffff;
            border-radius:16px;
            overflow:hidden;
            box-shadow:0 8px 30px rgba(15,40,70,0.08);
          "
        >

          <!-- HEADER -->
          <tr>
            <td align="center" style="
              padding:30px 25px 25px;
              background-color:#123b63;
              background-image:linear-gradient(
                135deg,
                #123b63 0%,
                #15558a 55%,
                #1b6fa5 100%
              );
              color:#ffffff;
            ">

              ${logoHtml}

              <h1 style="
                margin:0;
                font-size:21px;
                font-weight:800;
                letter-spacing:1px;
                color:#ffffff;
              ">
                SIMPB BAPETEN
              </h1>

              <p style="
                margin:8px 0 0;
                font-size:11px;
                line-height:18px;
                letter-spacing:1.2px;
                text-transform:uppercase;
                color:#dbeafe;
              ">
                Sistem Informasi Manajemen Proses Bisnis
              </p>

            </td>
          </tr>

          <!-- CONTENT -->
          <tr>
            <td style="padding:32px 28px 20px;">

              <p style="
                margin:0 0 12px;
                font-size:15px;
                line-height:24px;
                color:#334155;
              ">
                Halo <strong style="color:#123b63;">${safeName}</strong>,
              </p>

              <h2 style="
                margin:0 0 12px;
                font-size:21px;
                line-height:29px;
                color:#123b63;
              ">
                Verifikasi Pemulihan Kata Sandi
              </h2>

              <p style="
                margin:0;
                font-size:13px;
                line-height:23px;
                color:#64748b;
              ">
                Kami menerima permintaan untuk mengatur ulang kata sandi
                akun SIMPB BAPETEN Anda. Gunakan kode verifikasi berikut
                untuk melanjutkan proses.
              </p>

              <!-- OTP BOX -->
              <table
                role="presentation"
                width="100%"
                cellpadding="0"
                cellspacing="0"
                border="0"
                style="margin:27px 0 22px;"
              >
                <tr>
                  <td align="center" style="
                    padding:22px 12px;
                    border:1px solid #bfdbfe;
                    border-radius:12px;
                    background-color:#eff6ff;
                  ">

                    <p style="
                      margin:0 0 12px;
                      font-size:10px;
                      font-weight:bold;
                      letter-spacing:2px;
                      text-transform:uppercase;
                      color:#64748b;
                    ">
                      KODE VERIFIKASI ANDA
                    </p>

                    <p style="
                      margin:0;
                      font-size:34px;
                      line-height:42px;
                      font-weight:800;
                      letter-spacing:9px;
                      color:#174b7a;
                    ">
                      ${safeOtp}
                    </p>

                    <p style="
                      margin:12px 0 0;
                      font-size:11px;
                      color:#64748b;
                    ">
                      Berlaku selama ${minutes} menit
                    </p>

                  </td>
                </tr>
              </table>

              <!-- SECURITY NOTICE -->
              <table
                role="presentation"
                width="100%"
                cellpadding="0"
                cellspacing="0"
                border="0"
                style="margin-bottom:20px;"
              >
                <tr>
                  <td style="
                    padding:14px 15px;
                    border-left:4px solid #f59e0b;
                    border-radius:5px;
                    background-color:#fffbeb;
                  ">

                    <p style="
                      margin:0 0 5px;
                      font-size:12px;
                      font-weight:bold;
                      color:#92400e;
                    ">
                      Perhatian Keamanan
                    </p>

                    <p style="
                      margin:0;
                      font-size:11px;
                      line-height:19px;
                      color:#92400e;
                    ">
                      Jangan berikan kode OTP ini kepada siapa pun,
                      termasuk pihak yang mengaku sebagai administrator
                      atau petugas BAPETEN.
                    </p>

                  </td>
                </tr>
              </table>

              <p style="
                margin:0;
                font-size:12px;
                line-height:21px;
                color:#64748b;
              ">
                Jika Anda tidak meminta pemulihan kata sandi,
                abaikan email ini. Akun Anda tidak akan diubah
                melalui email ini tanpa proses verifikasi.
              </p>

            </td>
          </tr>

          <!-- FOOTER -->
          <tr>
            <td align="center" style="
              padding:21px 20px;
              background-color:#f8fafc;
              border-top:1px solid #e2e8f0;
            ">

              <p style="
                margin:0;
                font-size:12px;
                font-weight:bold;
                color:#174b7a;
              ">
                SIMPB BAPETEN
              </p>

              <p style="
                margin:6px 0 0;
                font-size:10px;
                line-height:17px;
                color:#64748b;
              ">
                Badan Pengawas Tenaga Nuklir
                <br />
                Email ini dikirim secara otomatis oleh sistem.
                Mohon tidak membalas email ini.
              </p>

              <p style="
                margin:14px 0 0;
                font-size:10px;
                color:#94a3b8;
              ">
                &copy; ${new Date().getFullYear()} SIMPB BAPETEN.
                Seluruh hak cipta dilindungi.
              </p>

            </td>
          </tr>

        </table>

      </td>
    </tr>
  </table>

</body>
</html>
`,
  });
}
