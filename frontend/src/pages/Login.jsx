import { useEffect, useState } from "react";

import {
  Navigate,
  Link,
  useLocation,
  useNavigate,
} from "react-router-dom";

import { CheckCircle2, X } from "lucide-react";

import { useAuth } from "../context/AuthContext";
import { errMsg } from "../api/client";
function Icon({ name, className = "h-5 w-5" }) {
  const icons = {
    shield: (
      <>
        <path d="M12 22s8-4 8-11V5l-8-3-8 3v6c0 7 8 11 8 11Z" />
        <path d="m9 12 2 2 4-4" />
      </>
    ),
    user: (
      <>
        <circle cx="12" cy="8" r="4" />
        <path d="M4 21a8 8 0 0 1 16 0" />
      </>
    ),
    building: (
      <>
        <rect x="4" y="3" width="16" height="18" rx="1" />
        <path d="M9 21v-4h6v4M8 7h2m4 0h2M8 11h2m4 0h2M8 15h2m4 0h2" />
      </>
    ),
    mail: (
      <>
        <rect x="3" y="5" width="18" height="14" rx="3" />
        <path d="m4 7 8 6 8-6" />
      </>
    ),
    lock: (
      <>
        <rect x="4" y="10" width="16" height="11" rx="2" />
        <path d="M8 10V7a4 4 0 0 1 8 0v3" />
      </>
    ),
    eye: (
      <>
        <path d="M2 12s3.5-6 10-6 10 6 10 6-3.5 6-10 6S2 12 2 12Z" />
        <circle cx="12" cy="12" r="2.5" />
      </>
    ),
    eyeOff: (
      <>
        <path d="m3 3 18 18" />
        <path d="M10.6 6.2A10 10 0 0 1 12 6c6.5 0 10 6 10 6a14 14 0 0 1-3 3.7M6.2 6.3C3.5 8.2 2 12 2 12s3.5 6 10 6a10 10 0 0 0 3.2-.6" />
      </>
    ),
    arrow: (
      <>
        <path d="M5 12h14" />
        <path d="m13 6 6 6-6 6" />
      </>
    ),
    check: <path d="m5 12 4 4L19 6" />,
  };

  return (
    <svg
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

export default function Login() {
  const { user, login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  // NOTIFIKASI BERHASIL LOGOUT
  const [logoutToast, setLogoutToast] = useState(false);
  const from = location.state?.from?.pathname || "/";

    // MENAMPILKAN NOTIFIKASI SETELAH LOGOUT
  useEffect(() => {
    if (location.state?.logoutSuccess) {
      setLogoutToast(true);

      // Bersihkan state navigasi agar tidak muncul kembali
      // saat halaman Login dibuka ulang.
      navigate(location.pathname, {
        replace: true,
        state: {},
      });
    }
  }, [location.state, location.pathname, navigate]);

  // OTOMATIS MENGHILANGKAN NOTIFIKASI
  useEffect(() => {
    if (!logoutToast) return;

    const timer = setTimeout(() => {
      setLogoutToast(false);
    }, 4000);

    return () => clearTimeout(timer);
  }, [logoutToast]);
  
  const [form, setForm] = useState({
    email: "",
    password: "",
  });


  const [showPassword, setShowPassword] = useState(false);
  const [remember, setRemember] = useState(false);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  if (user) {
  return <Navigate to={from} replace />;
}

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError("");

    const email = form.email.trim();

    if (!email || !form.password) {
      setError("Email dan password wajib diisi.");
      return;
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setError("Masukkan alamat email yang valid.");
      return;
    }

    setBusy(true);

    try {
      await login(email, form.password);

      // Navigasi mengikuti alur autentikasi yang sudah ada.
      // Pengalihan berdasarkan role dapat ditangani oleh
      // AuthContext atau route guard aplikasi.
      navigate(from, { replace: true });
    } catch (err) {
      setError(errMsg(err));
    } finally {
      setBusy(false);
    }
  };

  return (
  <>
    {/* TOAST BERHASIL LOGOUT */}
    {logoutToast && (
      <div className="fixed right-5 top-5 z-[300] w-[calc(100%-40px)] max-w-[360px]">
        <div className="flex items-start gap-3 rounded-xl border border-green-200 bg-white p-4 shadow-xl">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-green-100 text-green-600">
            <CheckCircle2 size={22} />
          </div>

          <div className="min-w-0 flex-1">
            <p className="text-sm font-extrabold text-slate-800">
              Berhasil Keluar!
            </p>
            <p className="mt-1 text-xs leading-5 text-slate-500">
              Anda telah berhasil keluar dari akun SIMPB BAPETEN.
            </p>
          </div>

          <button
            type="button"
            onClick={() => setLogoutToast(false)}
            className="rounded-md p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
          >
            <X size={17} />
          </button>
        </div>
      </div>
    )}

    <main
      className="relative flex min-h-screen w-full items-center justify-center overflow-x-hidden bg-slate-100 bg-cover bg-center bg-no-repeat px-3 py-5 sm:px-6 sm:py-7"
      style={{ backgroundImage: "url('/img/bg.png')" }}
    >
      {/* Overlay background */}
      <div className="pointer-events-none absolute inset-0 bg-white/25" />

      <div className="relative z-10 mx-auto w-full max-w-[940px]">
        {/* Kartu login */}
        <section className="grid min-w-0 overflow-hidden rounded-2xl bg-white shadow-2xl shadow-slate-900/20 md:grid-cols-2">
          {/* PANEL INFORMASI BAPETEN */}
          <aside className="relative flex min-w-0 flex-col justify-center overflow-hidden bg-gradient-to-r from-[#102a56] via-[#17417d] to-[#2563a6] px-6 py-7 text-white sm:px-8 sm:py-9 lg:px-9 lg:py-10">
            {/* Dekorasi lingkaran */}
            <div className="pointer-events-none absolute -right-16 -top-20 h-48 w-48 rounded-full border-[26px] border-white/[0.09]" />
            <div className="pointer-events-none absolute -bottom-24 -left-20 h-52 w-52 rounded-full border-[30px] border-white/[0.08]" />

            {/* Foto gedung */}
            <img
              src="/img/gedung.jpeg"
              alt=""
              aria-hidden="true"
              className="pointer-events-none absolute inset-0 h-full w-full object-cover object-center opacity-100"
            />

            {/* Overlay foto */}
            <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-[#102a56]/95 via-[#17417d]/80 to-[#102a56]/95" />

            {/* Ornamen gelombang */}
            <div className="pointer-events-none absolute inset-0 z-[1] overflow-hidden">
              <div className="absolute -right-16 -top-20 h-64 w-64 rounded-full bg-blue-300/10 blur-3xl" />

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
                  fillOpacity="0.1"
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

            {/* Konten panel kiri */}
            <div className="relative z-10">
              <div className="mb-5 flex items-center gap-3">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-white/20 bg-white/10 backdrop-blur-sm">
                  <Icon name="shield" className="h-6 w-6" />
                </div>

                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-blue-100">
                    Badan Pengawas
                  </p>
                  <p className="text-sm font-bold tracking-wide">
                    Tenaga Nuklir
                  </p>
                </div>
              </div>

              <p className="mb-2 text-[10px] font-bold uppercase tracking-[0.2em] text-white/75">
                Sistem Informasi
              </p>

              <h1 className="text-2xl font-bold leading-tight sm:text-[28px]">
                Selamat Datang di
                <span className="mt-1 block">SIMPB BAPETEN</span>
              </h1>

              <p className="mt-3 max-w-sm text-sm leading-6 text-white/90">
                Sistem Informasi Manajemen Proses Bisnis untuk
                mendukung pengelolaan proses bisnis yang terstruktur,
                terintegrasi, dan akuntabel.
              </p>

              {/* Logo BAPETEN */}
              <div className="my-6 flex justify-center md:justify-start">
                <div className="flex h-28 w-28 items-center justify-center rounded-full border border-white/40 bg-white p-2.5 shadow-xl sm:h-32 sm:w-32">
                  <img
                    src="/img/Logo%20bapeten.png"
                    alt="Logo BAPETEN"
                    className="h-full w-full object-contain"
                  />
                </div>
              </div>

              {/* Nilai sistem */}
              <div className="flex flex-wrap gap-2">
                {["Terstruktur", "Terintegrasi", "Akuntabel"].map(
                  (text) => (
                    <span
                      key={text}
                      className="rounded-full border border-white/30 bg-white/10 px-3 py-1.5 text-[11px] font-medium backdrop-blur-sm"
                    >
                      {text}
                    </span>
                  )
                )}
              </div>

              {/* Alamat kantor */}
              <address className="mt-5 max-w-md text-[10px] leading-[1.7] text-white/75 not-italic">
                Jl. Gajah Mada No. 8, Petojo Utara, Gambir,
                Jakarta Pusat
                <br />
                Daerah Khusus Ibukota Jakarta 11120
              </address>
            </div>
          </aside>

          {/* PANEL FORM LOGIN */}
          <section className="flex min-w-0 items-center justify-center px-5 py-7 sm:px-8 sm:py-9 lg:px-9 lg:py-10">
            <div className="w-full max-w-[350px]">
              <div className="mb-5">
                <p className="mb-1.5 text-[10px] font-bold uppercase tracking-[0.18em] text-[#2563a6]">
                  Akses Sistem
                </p>

                <h2 className="text-2xl font-bold tracking-tight text-[#17417d] sm:text-[28px]">
  Masuk ke SIMPB
</h2>

<p className="mt-1.5 text-sm leading-5 text-slate-500">
  Masukkan email dan password akun Anda untuk melanjutkan.
</p>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">

                

                {/* Email */}
                <div>
                  <label
                    htmlFor="email"
                    className="mb-1.5 block text-xs font-semibold text-slate-700 sm:text-sm"
                  >
                    Email
                  </label>

                  <div className="flex min-w-0 items-center rounded-lg border border-slate-200 bg-slate-50 transition focus-within:border-[#608fa2] focus-within:bg-white focus-within:ring-2 focus-within:ring-[#608fa2]/15">
                    <span className="pl-3 text-slate-400">
                      <Icon name="mail" className="h-[17px] w-[17px]" />
                    </span>

                    <input
                      id="email"
                      type="email"
                      required
                      autoComplete="username"
                      placeholder="Masukkan alamat email"
                      value={form.email}
                      onChange={(event) =>
                        setForm({ ...form, email: event.target.value })
                      }
                      className="w-full min-w-0 bg-transparent px-2.5 py-3 text-sm text-slate-800 outline-none placeholder:text-slate-400"
                    />
                  </div>
                </div>

                {/* Password */}
                <div>
                  <label
                    htmlFor="password"
                    className="mb-1.5 block text-xs font-semibold text-slate-700 sm:text-sm"
                  >
                    Password
                  </label>

                  <div className="flex min-w-0 items-center rounded-lg border border-slate-200 bg-slate-50 transition focus-within:border-[#608fa2] focus-within:bg-white focus-within:ring-2 focus-within:ring-[#608fa2]/15">
                    <span className="pl-3 text-slate-400">
                      <Icon name="lock" className="h-[17px] w-[17px]" />
                    </span>

                    <input
                      id="password"
                      type={showPassword ? "text" : "password"}
                      required
                      autoComplete="current-password"
                      placeholder="Masukkan password"
                      value={form.password}
                      onChange={(event) =>
                        setForm({ ...form, password: event.target.value })
                      }
                      className="w-full min-w-0 bg-transparent px-2.5 py-3 text-sm text-slate-800 outline-none placeholder:text-slate-400"
                    />

                    <button
                      type="button"
                      aria-label={
                        showPassword
                          ? "Sembunyikan password"
                          : "Tampilkan password"
                      }
                      onClick={() => setShowPassword((value) => !value)}
                      className="mr-1 rounded-md p-2 text-slate-400 hover:bg-slate-200 hover:text-slate-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#608fa2]"
                    >
                      <Icon
                        name={showPassword ? "eyeOff" : "eye"}
                        className="h-[17px] w-[17px]"
                      />
                    </button>
                  </div>
                </div>

               {/* Ingat saya dan lupa password */}
<div className="flex flex-wrap items-center justify-between gap-2 text-xs">
  <label className="flex cursor-pointer items-center gap-2 text-slate-600">
    <input
      type="checkbox"
      checked={remember}
      onChange={(event) => setRemember(event.target.checked)}
      className="h-4 w-4 rounded accent-[#397f9f]"
    />
    Ingat saya
  </label>

  <Link
    to="/forgot-password"
    className="text-sm font-semibold text-[#2563a6] transition hover:text-[#102a56] hover:underline"
  >
    Lupa kata sandi?
  </Link>
</div>

                {/* Pesan error */}
                {error && (
                  <p
                    role="alert"
                    className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs leading-5 text-red-700"
                  >
                    {error}
                  </p>
                )}

                {/* Tombol login */}
                <button
                  type="submit"
                  disabled={busy}
                  className="group flex w-full items-center justify-center gap-2 rounded-lg bg-[#17417d] px-4 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-[#102a56] focus:outline-none focus-visible:ring-4 focus-visible:ring-[#2563a6]/30 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {busy ? "Memproses login..." : "Masuk"}

                  {!busy && (
                    <Icon
                      name="arrow"
                      className="h-4 w-4 transition-transform group-hover:translate-x-1"
                    />
                  )}
                </button>
              </form>

              {/* Informasi keamanan */}
              <div className="mt-5 border-t border-slate-100 pt-4">
                <div className="flex items-start gap-2">
                  <Icon
                    name="shield"
                    className="mt-0.5 h-4 w-4 shrink-0 text-green-600"
                  />

                  <p className="text-[10px] leading-4 text-slate-500">
                    Gunakan akun resmi sesuai kewenangan Anda di dalam
                    sistem.
                  </p>
                </div>
              </div>
            </div>
          </section>
        </section>

        {/* Footer */}
        <footer className="mt-3 text-center text-[10px] text-slate-600">
          © {new Date().getFullYear()} BAPETEN · SIMPB
        </footer>
      </div>
    </main>
    </>
  );
}