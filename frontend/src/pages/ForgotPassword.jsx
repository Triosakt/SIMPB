import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import api, { errMsg } from "../api/client.js";

const STEPS = [
  { number: 1, label: "Email" },
  { number: 2, label: "Verifikasi" },
  { number: 3, label: "Kata Sandi" },
];

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const OTP_LENGTH = 6;
const RESEND_SECONDS = 60;
const NOTICE_DURATION_MS = 4000; // lama kotak hijau tampil
const emptyOtp = () => Array(OTP_LENGTH).fill("");

const primaryButton =
  "mt-5 flex w-full items-center justify-center gap-2 rounded-xl bg-[#17417d] px-4 py-3 text-sm font-semibold text-white shadow-md shadow-[#17417d]/15 transition hover:bg-[#102a56] focus:outline-none focus:ring-4 focus:ring-[#2563a6]/30 disabled:cursor-not-allowed disabled:opacity-60";

function Icon({ name, className = "h-5 w-5" }) {
  const icons = {
    mail: (
      <>
        <rect x="3" y="5" width="18" height="14" rx="2" />
        <path d="m3 7 9 6 9-6" />
      </>
    ),
    shield: (
      <>
        <path d="M12 22s8-4 8-11V5l-8-3-8 3v6c0 7 8 11 8 11Z" />
        <path d="m9 12 2 2 4-4" />
      </>
    ),
    lock: (
      <>
        <rect x="3" y="11" width="18" height="10" rx="2" />
        <path d="M7 11V7a5 5 0 0 1 10 0v4" />
        <path d="M12 15v2" />
      </>
    ),
    eye: (
      <>
        <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12Z" />
        <circle cx="12" cy="12" r="3" />
      </>
    ),
    eyeOff: (
      <>
        <path d="m3 3 18 18" />
        <path d="M10.6 10.6a2 2 0 0 0 2.8 2.8" />
        <path d="M9.9 5.2A11 11 0 0 1 12 5c6.5 0 10 7 10 7a15 15 0 0 1-3 3.8" />
        <path d="M6.2 6.2C3.5 8 2 12 2 12s3.5 7 10 7c1.2 0 2.3-.3 3.3-.7" />
      </>
    ),
    arrow: (
      <>
        <path d="M5 12h14" />
        <path d="m12 5 7 7-7 7" />
      </>
    ),
    back: (
      <>
        <path d="m12 19-7-7 7-7" />
        <path d="M19 12H5" />
      </>
    ),
    check: <path d="m5 12 4 4L19 6" />,
  };

  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      {icons[name]}
    </svg>
  );
}

function Spinner({ className = "h-4 w-4" }) {
  return (
    <svg
      className={`animate-spin ${className}`}
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
    >
      <circle
        cx="12"
        cy="12"
        r="10"
        stroke="currentColor"
        strokeWidth="3"
        className="opacity-25"
      />
      <path
        d="M22 12a10 10 0 0 0-10-10"
        stroke="currentColor"
        strokeWidth="3"
        strokeLinecap="round"
      />
    </svg>
  );
}

const PAGE_INFO = {
  1: {
    title: "Lupa Kata Sandi?",
    description:
      "Masukkan email akun SIMPB Anda untuk memulai proses pemulihan.",
    icon: "mail",
  },
  2: {
    title: "Verifikasi Email",
    description:
      "Masukkan kode OTP 6 digit untuk memverifikasi identitas Anda.",
    icon: "shield",
  },
  3: {
    title: "Buat Kata Sandi Baru",
    description:
      "Buat kata sandi baru untuk mendapatkan kembali akses ke akun Anda.",
    icon: "lock",
  },
  4: {
    title: "Kata Sandi Berhasil Diubah",
    description:
      "Kata sandi Anda sudah diperbarui. Silakan masuk dengan kata sandi baru.",
    icon: "check",
  },
};

export default function ForgotPassword() {
  const [step, setStep] = useState(1);
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState(emptyOtp);
  const [resetToken, setResetToken] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);
  const [cooldown, setCooldown] = useState(0);
  const [busyText, setBusyText] = useState("");

  const otpRefs = useRef([]);

  const clearMessages = () => {
    setError("");
    setNotice("");
  };

  // Hitung mundur tombol "Kirim ulang kode"
  useEffect(() => {
    if (cooldown <= 0) return undefined;

    const timer = setTimeout(() => setCooldown((s) => s - 1), 1000);
    return () => clearTimeout(timer);
  }, [cooldown]);

  // Kotak hijau hilang otomatis setelah beberapa detik
  useEffect(() => {
    if (!notice) return undefined;

    const timer = setTimeout(() => setNotice(""), NOTICE_DURATION_MS);
    return () => clearTimeout(timer);
  }, [notice]);

  // Minta OTP ke server (dipakai tahap 1 dan kirim ulang)
  const requestOtp = async ({ resend = false } = {}) => {
    clearMessages();

    const normalizedEmail = email.trim();

    if (!normalizedEmail) {
      setError("Silakan masukkan alamat email Anda.");
      return;
    }

    if (!EMAIL_RE.test(normalizedEmail)) {
      setError("Format alamat email tidak valid.");
      return;
    }

    setBusyText(resend ? "Mengirim ulang kode..." : "Mengirim kode OTP...");
    setBusy(true);

    try {
      await api.post("/auth/forgot-password", { email: normalizedEmail });

      setEmail(normalizedEmail);
      setOtp(emptyOtp());
      setCooldown(RESEND_SECONDS);

      setNotice(
        resend
          ? "Permintaan kode baru telah diproses. Jika email terdaftar, kode OTP baru telah dikirim."
          : "Jika email terdaftar, kode OTP telah dikirim ke inbox Anda."
      );

      if (!resend) setStep(2);

      setTimeout(() => otpRefs.current[0]?.focus(), 50);
    } catch (err) {
      setError(errMsg(err));
    } finally {
      setBusy(false);
    }
  };

  const handleEmailSubmit = (e) => {
    e.preventDefault();
    requestOtp();
  };

  // Input OTP
  const handleOtpChange = (index, value) => {
    const digit = value.replace(/\D/g, "").slice(-1);
    const nextOtp = [...otp];

    nextOtp[index] = digit;
    setOtp(nextOtp);
    clearMessages();

    if (digit && index < OTP_LENGTH - 1) {
      otpRefs.current[index + 1]?.focus();
    }
  };

  const handleOtpKeyDown = (index, e) => {
    if (e.key === "Backspace" && !otp[index] && index > 0) {
      otpRefs.current[index - 1]?.focus();
    }

    if (e.key === "ArrowLeft" && index > 0) {
      otpRefs.current[index - 1]?.focus();
    }

    if (e.key === "ArrowRight" && index < OTP_LENGTH - 1) {
      otpRefs.current[index + 1]?.focus();
    }
  };

  const handleOtpPaste = (e) => {
    const pasted = e.clipboardData
      .getData("text")
      .replace(/\D/g, "")
      .slice(0, OTP_LENGTH);

    if (!pasted) return;

    e.preventDefault();

    const nextOtp = emptyOtp();
    pasted.split("").forEach((digit, index) => {
      nextOtp[index] = digit;
    });

    setOtp(nextOtp);
    clearMessages();

    otpRefs.current[Math.min(pasted.length, OTP_LENGTH - 1)]?.focus();
  };

  // Tahap 2: verifikasi OTP di server
  const handleVerifyOtp = async (e) => {
    e.preventDefault();
    clearMessages();

    if (otp.some((digit) => !digit)) {
      setError("Masukkan seluruh 6 digit kode OTP.");
      return;
    }

    setBusyText("Memverifikasi kode...");
    setBusy(true);

    try {
      const res = await api.post("/auth/verify-reset-otp", {
        email,
        otp: otp.join(""),
      });

      setResetToken(res.data?.resetToken || "");
      setStep(3);
    } catch (err) {
      setError(errMsg(err));
    } finally {
      setBusy(false);
    }
  };

  // Tahap 3: simpan kata sandi baru
  const handlePasswordSubmit = async (e) => {
    e.preventDefault();
    clearMessages();

    if (password.length < 8) {
      setError("Kata sandi harus terdiri dari minimal 8 karakter.");
      return;
    }

    if (password.length > 72) {
      setError("Kata sandi maksimal 72 karakter.");
      return;
    }

    if (password !== confirmPassword) {
      setError("Konfirmasi kata sandi tidak cocok.");
      return;
    }

    setBusyText("Menyimpan kata sandi...");
    setBusy(true);

    try {
      await api.post("/auth/reset-password", { resetToken, password });

      // Bersihkan data sensitif dari state
      setPassword("");
      setConfirmPassword("");
      setResetToken("");
      setStep(4);
    } catch (err) {
      setError(errMsg(err));
    } finally {
      setBusy(false);
    }
  };

  const currentInfo = PAGE_INFO[step];

  return (
    <main
      className="relative flex min-h-screen items-center justify-center overflow-hidden bg-cover bg-center bg-no-repeat p-4 sm:p-6"
      style={{ backgroundImage: "url('/img/bg.png')" }}
    >
      {/* OVERLAY BACKGROUND */}
      <div className="pointer-events-none absolute inset-0 bg-slate-950/20" />

      {/* KARTU UTAMA */}
      <section className="relative z-10 grid w-full max-w-5xl grid-cols-1 overflow-hidden rounded-2xl bg-white shadow-2xl shadow-slate-950/20 md:grid-cols-2">
        {/* PANEL INFORMASI BIRU */}
        <aside className="relative hidden min-w-0 flex-col justify-between overflow-hidden bg-gradient-to-r from-[#102a56] via-[#17417d] to-[#2563a6] px-8 py-9 text-white md:flex lg:px-10">
          {/* SILUET GEDUNG */}
          <img
            src="/img/gedung.jpeg"
            alt=""
            aria-hidden="true"
            className="pointer-events-none absolute inset-x-0 bottom-0 z-0 h-full w-full object-cover object-center"
          />

          {/* OVERLAY GRADASI */}
          <div className="pointer-events-none absolute inset-0 z-[1] bg-gradient-to-b from-[#102a56] via-[#17417d]/85 to-[#102a56]/90" />

          {/* ORNAMEN GELOMBANG */}
          <div className="pointer-events-none absolute inset-0 z-[2] overflow-hidden">
            <div className="absolute -right-16 -top-20 h-64 w-64 rounded-full bg-[#60a5fa]/10 blur-3xl" />

            <svg
              className="absolute inset-x-0 top-0 h-36 w-full"
              viewBox="0 0 600 150"
              preserveAspectRatio="none"
              fill="none"
              aria-hidden="true"
            >
              <path
                d="M0 0 H600 V45 C490 95 420 15 300 48 S100 100 0 55 Z"
                fill="#60a5fa"
                fillOpacity="0.09"
              />
              <path
                d="M0 55 C130 100 200 28 320 48 S490 90 600 35"
                stroke="white"
                strokeOpacity="0.16"
                strokeWidth="1.2"
              />
              <path
                d="M0 72 C120 115 230 48 350 67 S500 100 600 55"
                stroke="#93c5fd"
                strokeOpacity="0.15"
              />
            </svg>

            <svg
              className="absolute inset-x-0 bottom-0 h-44 w-full"
              viewBox="0 0 600 180"
              preserveAspectRatio="none"
              fill="none"
              aria-hidden="true"
            >
              <path
                d="M0 85 C120 145 220 25 350 75 S510 125 600 45 V180 H0 Z"
                fill="#60a5fa"
                fillOpacity="0.10"
              />
              <path
                d="M0 120 C130 165 260 70 390 105 S520 145 600 85"
                stroke="white"
                strokeOpacity="0.16"
                strokeWidth="1.2"
              />
              <path
                d="M0 145 C150 180 280 100 420 130 S540 155 600 115"
                stroke="#93c5fd"
                strokeOpacity="0.22"
              />
            </svg>
          </div>

          {/* KONTEN PANEL */}
          <div className="relative z-10">
            <p className="mb-2 text-[10px] font-bold uppercase tracking-[0.2em] text-white/80">
              Sistem Informasi
            </p>

            <h1 className="text-2xl font-bold leading-tight sm:text-[28px]">
              Pemulihan Akses
              <span className="mt-1 block">SIMPB BAPETEN</span>
            </h1>

            <p className="mt-3 max-w-sm text-sm leading-6 text-white/90">
              Ikuti langkah pemulihan akun untuk mendapatkan kembali akses ke
              Sistem Informasi Manajemen Proses Bisnis.
            </p>

            {/* LOGO BAPETEN */}
            <div className="my-6 flex justify-center md:justify-start">
              <div className="flex h-36 w-36 items-center justify-center rounded-full bg-white p-2.5 shadow-xl sm:h-40 sm:w-40 lg:h-44 lg:w-44">
                <img
                  src="/img/Logo%20bapeten.png"
                  alt="Logo BAPETEN"
                  className="h-full w-full object-contain"
                />
              </div>
            </div>

            {/* IDENTITAS SISTEM */}
            <div className="flex flex-wrap gap-2">
              {["Terstruktur", "Terintegrasi", "Akuntabel"].map((text) => (
                <span
                  key={text}
                  className="rounded-full border border-white/30 bg-white/10 px-3 py-1.5 text-[11px] font-medium backdrop-blur-sm sm:text-xs"
                >
                  {text}
                </span>
              ))}
            </div>

            {/* ALAMAT */}
            <address className="mt-4 max-w-md text-[9px] leading-[1.6] text-white/80 not-italic sm:text-[10px]">
              Jl. Gajah Mada No. 8, RT. 1/RW. 2, Petojo Utara, Gambir, Jakarta
              Pusat
              <br />
              Daerah Khusus Ibukota Jakarta 11120
            </address>
          </div>

          <p className="relative z-10 mt-6 text-[10px] text-white/70">
            Badan Pengawas Tenaga Nuklir · Republik Indonesia
          </p>
        </aside>

        {/* PANEL FORM */}
        <div className="flex min-w-0 flex-col justify-center px-5 py-7 sm:px-8 sm:py-8 lg:px-10">
          <div className="w-full max-w-md self-center">
            {/* IDENTITAS UNTUK HP */}
            <div className="mb-7 flex items-center gap-3 md:hidden">
              <img
                src="/img/Logo%20bapeten.png"
                alt="Logo BAPETEN"
                className="h-12 w-12 object-contain"
              />
              <div>
                <p className="text-sm font-bold text-[#102a56]">
                  SIMPB BAPETEN
                </p>
                <p className="text-xs text-slate-500">Pemulihan akun</p>
              </div>
            </div>

            {/* INDIKATOR PROGRES */}
            <div className="mb-8">
              <div className="flex items-start">
                {STEPS.map((item, index) => (
                  <div
                    key={item.number}
                    className={`flex min-w-0 items-start ${
                      index < STEPS.length - 1 ? "flex-1" : ""
                    }`}
                  >
                    <div className="flex shrink-0 flex-col items-center gap-2">
                      <div
                        className={`flex h-9 w-9 items-center justify-center rounded-full text-xs font-bold transition-colors ${
                          step >= item.number
                            ? "bg-[#17417d] text-white shadow-md shadow-[#17417d]/20"
                            : "bg-slate-100 text-slate-400"
                        }`}
                      >
                        {step > item.number ? (
                          <Icon name="check" className="h-4 w-4" />
                        ) : (
                          item.number
                        )}
                      </div>

                      <span
                        className={`whitespace-nowrap text-[10px] sm:text-xs ${
                          step === item.number
                            ? "font-semibold text-[#17417d]"
                            : "text-slate-400"
                        }`}
                      >
                        {item.label}
                      </span>
                    </div>

                    {index < STEPS.length - 1 && (
                      <div
                        className={`mx-2 mt-[17px] h-0.5 flex-1 rounded transition-colors ${
                          step > item.number ? "bg-[#17417d]" : "bg-slate-100"
                        }`}
                      />
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* AREA TAHAP */}
            <div className="relative min-h-[300px]">
              {/* LOADING: menutup area form selama proses berjalan */}
              {busy && (
                <div
                  role="status"
                  aria-live="polite"
                  className="absolute inset-0 z-20 flex flex-col items-center justify-center gap-3 rounded-xl bg-white/85 backdrop-blur-[1px]"
                >
                  <Spinner className="h-9 w-9 text-[#17417d]" />
                  <p className="text-sm font-semibold text-[#17417d]">
                    {busyText}
                  </p>
                </div>
              )}

              {/* JUDUL TAHAP */}
              <div className="mb-6">
                <div
                  className={`mb-4 flex h-11 w-11 items-center justify-center rounded-xl ${
                    step === 4
                      ? "bg-emerald-50 text-emerald-600"
                      : "bg-[#17417d]/10 text-[#17417d]"
                  }`}
                >
                  <Icon name={currentInfo.icon} className="h-6 w-6" />
                </div>

                <h2 className="text-2xl font-bold tracking-tight text-slate-800">
                  {currentInfo.title}
                </h2>

                <p className="mt-2 text-sm leading-6 text-slate-500">
                  {currentInfo.description}
                </p>
              </div>

              {/* PESAN ERROR */}
              {error && (
                <div
                  role="alert"
                  className="mb-4 rounded-xl border border-red-200 bg-red-50 px-3 py-2.5 text-xs leading-5 text-red-700"
                >
                  {error}
                </div>
              )}

              {/* PESAN INFO */}
              {notice && (
                <div
                  role="status"
                  className="mb-4 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2.5 text-xs leading-5 text-emerald-700"
                >
                  {notice}
                </div>
              )}

              {/* TAHAP 1: EMAIL */}
              {step === 1 && (
                <form onSubmit={handleEmailSubmit} noValidate>
                  <label
                    htmlFor="reset-email"
                    className="mb-2 block text-sm font-semibold text-slate-700"
                  >
                    Alamat Email
                  </label>

                  <div className="relative">
                    <Icon
                      name="mail"
                      className="absolute left-3.5 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400"
                    />

                    <input
                      id="reset-email"
                      name="email"
                      type="email"
                      autoComplete="email"
                      value={email}
                      onChange={(e) => {
                        setEmail(e.target.value);
                        clearMessages();
                      }}
                      placeholder="nama@email.com"
                      className="w-full rounded-xl border border-slate-200 bg-white py-3 pl-11 pr-4 text-sm text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-[#17417d] focus:ring-4 focus:ring-[#2563a6]/15"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={busy}
                    className={primaryButton}
                  >
                    {busy ? (
                      <>
                        <Spinner /> Mengirim kode...
                      </>
                    ) : (
                      <>
                        Kirim Kode OTP
                        <Icon name="arrow" className="h-4 w-4" />
                      </>
                    )}
                  </button>
                </form>
              )}

              {/* TAHAP 2: OTP */}
              {step === 2 && (
                <form onSubmit={handleVerifyOtp}>
                  <p className="mb-4 text-xs leading-5 text-slate-500">
                    Jika email ini terdaftar, kode verifikasi dikirim ke:
                    <span className="mt-1 block break-all font-semibold text-slate-700">
                      {email}
                    </span>
                  </p>

                  <label className="mb-3 block text-sm font-semibold text-slate-700">
                    Kode OTP
                  </label>

                  <div className="flex justify-between gap-2">
                    {otp.map((digit, index) => (
                      <input
                        key={index}
                        ref={(el) => {
                          otpRefs.current[index] = el;
                        }}
                        type="text"
                        inputMode="numeric"
                        autoComplete={index === 0 ? "one-time-code" : "off"}
                        aria-label={`Digit OTP ${index + 1}`}
                        maxLength={1}
                        value={digit}
                        onChange={(e) =>
                          handleOtpChange(index, e.target.value)
                        }
                        onKeyDown={(e) => handleOtpKeyDown(index, e)}
                        onPaste={handleOtpPaste}
                        className="h-11 w-full min-w-0 rounded-lg border border-slate-200 text-center text-base font-semibold text-slate-800 outline-none transition focus:border-[#17417d] focus:ring-2 focus:ring-[#2563a6]/15"
                      />
                    ))}
                  </div>

                  <p className="mt-3 text-xs leading-5 text-slate-400">
                    Kode berlaku 10 menit. Periksa juga folder spam.
                  </p>

                  <button
                    type="submit"
                    disabled={busy}
                    className={primaryButton}
                  >
                    {busy ? (
                      <>
                        <Spinner /> Memverifikasi...
                      </>
                    ) : (
                      <>
                        Verifikasi OTP
                        <Icon name="arrow" className="h-4 w-4" />
                      </>
                    )}
                  </button>

                  <div className="mt-3 flex items-center justify-between gap-3">
                    <button
                      type="button"
                      disabled={busy || cooldown > 0}
                      onClick={() => requestOtp({ resend: true })}
                      className="py-2 text-sm font-semibold text-[#17417d] transition hover:underline disabled:cursor-not-allowed disabled:text-slate-400 disabled:no-underline"
                    >
                      {cooldown > 0
                        ? `Kirim ulang kode (${cooldown}s)`
                        : "Kirim ulang kode"}
                    </button>

                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => {
                        setStep(1);
                        setOtp(emptyOtp());
                        setCooldown(0);
                        clearMessages();
                      }}
                      className="py-2 text-sm font-medium text-slate-500 transition hover:text-[#17417d]"
                    >
                      Ganti alamat email
                    </button>
                  </div>
                </form>
              )}

              {/* TAHAP 3: KATA SANDI BARU */}
              {step === 3 && (
                <form onSubmit={handlePasswordSubmit}>
                  <label
                    htmlFor="new-password"
                    className="mb-2 block text-sm font-semibold text-slate-700"
                  >
                    Kata Sandi Baru
                  </label>

                  <div className="relative">
                    <Icon
                      name="lock"
                      className="absolute left-3.5 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400"
                    />

                    <input
                      id="new-password"
                      type={showPassword ? "text" : "password"}
                      autoComplete="new-password"
                      value={password}
                      onChange={(e) => {
                        setPassword(e.target.value);
                        clearMessages();
                      }}
                      placeholder="Minimal 8 karakter"
                      className="w-full rounded-xl border border-slate-200 py-3 pl-11 pr-12 text-sm outline-none transition focus:border-[#17417d] focus:ring-4 focus:ring-[#2563a6]/15"
                    />

                    <button
                      type="button"
                      onClick={() => setShowPassword((previous) => !previous)}
                      aria-label={
                        showPassword
                          ? "Sembunyikan kata sandi"
                          : "Tampilkan kata sandi"
                      }
                      className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-[#17417d]"
                    >
                      <Icon
                        name={showPassword ? "eyeOff" : "eye"}
                        className="h-5 w-5"
                      />
                    </button>
                  </div>

                  <label
                    htmlFor="confirm-password"
                    className="mb-2 mt-5 block text-sm font-semibold text-slate-700"
                  >
                    Konfirmasi Kata Sandi
                  </label>

                  <input
                    id="confirm-password"
                    type={showPassword ? "text" : "password"}
                    autoComplete="new-password"
                    value={confirmPassword}
                    onChange={(e) => {
                      setConfirmPassword(e.target.value);
                      clearMessages();
                    }}
                    placeholder="Masukkan ulang kata sandi"
                    className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none transition focus:border-[#17417d] focus:ring-4 focus:ring-[#2563a6]/15"
                  />

                  <p className="mt-3 text-xs leading-5 text-slate-400">
                    Gunakan minimal 8 karakter dan hindari kata sandi yang
                    mudah ditebak.
                  </p>

                  <button
                    type="submit"
                    disabled={busy}
                    className={primaryButton}
                  >
                    {busy ? (
                      <>
                        <Spinner /> Menyimpan...
                      </>
                    ) : (
                      <>
                        Simpan Kata Sandi Baru
                        <Icon name="check" className="h-4 w-4" />
                      </>
                    )}
                  </button>
                </form>
              )}

              {/* TAHAP 4: SUKSES */}
              {step === 4 && (
                <Link
                  to="/login"
                  className={`${primaryButton} no-underline`}
                >
                  Masuk ke SIMPB
                  <Icon name="arrow" className="h-4 w-4" />
                </Link>
              )}
            </div>

            {/* KEMBALI KE LOGIN */}
            {step < 4 && (
              <div className="mt-5 border-t border-slate-100 pt-5">
                <Link
                  to="/login"
                  className="flex items-center justify-center gap-2 text-sm font-semibold text-slate-600 transition hover:text-[#17417d]"
                >
                  <Icon name="back" className="h-4 w-4" />
                  Kembali ke halaman login
                </Link>
              </div>
            )}

            <p className="mt-6 text-center text-[10px] leading-5 text-slate-400">
              Sistem Informasi Manajemen Proses Bisnis
              <br />
              BAPETEN · Hak cipta dilindungi
            </p>
          </div>
        </div>
      </section>
    </main>
  );
}
