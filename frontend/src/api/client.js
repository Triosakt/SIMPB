import axios from "axios";

export const API_BASE = import.meta.env.VITE_API_URL || "";

export const api = axios.create({
  baseURL: `${API_BASE}/api`,
});

// Tambahkan token autentikasi ke setiap request
api.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");

  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  return config;
});

// Token kedaluwarsa -> kembali ke login
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (
      error.response?.status === 401 &&
      !error.config?.url?.includes("/auth/login")
    ) {
      localStorage.removeItem("token");
      window.location.assign("/login");
    }

    return Promise.reject(error);
  }
);

// Pesan error
export const errMsg = (error) =>
  error.response?.data?.message ||
  "Terjadi kesalahan, coba lagi";

// Unduh PDF dengan header Authorization
export async function downloadSop(sop) {
  const res = await api.get(`/sop/${sop.id}/download`, {
    responseType: "blob",
  });

  const url = URL.createObjectURL(res.data);
  const link = document.createElement("a");

  link.href = url;
  link.download = `${(sop.nomor_sop || `SOP-${sop.id}`).replace(
    /[^\w-]/g,
    "_"
  )}.pdf`;

  document.body.appendChild(link);
  link.click();
  link.remove();

  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

// Buka PDF di tab baru
export async function openPdf(path) {
  const tab = window.open("", "_blank");

  try {
    const res = await api.get(path, {
      responseType: "blob",
    });

    const url = URL.createObjectURL(res.data);

    if (tab) {
      tab.location.href = url;
    } else {
      window.location.assign(url);
    }

    setTimeout(() => URL.revokeObjectURL(url), 60000);
  } catch (error) {
    tab?.close();

    // Ambil pesan jika respons error berbentuk Blob
    if (error.response?.data instanceof Blob) {
      try {
        error.response.data = JSON.parse(
          await error.response.data.text()
        );
      } catch {
        // Abaikan jika respons bukan JSON
      }
    }

    throw error;
  }
}

// Default export tetap tersedia jika dibutuhkan file lain
export default api;

// URL media publik: API origin, bukan alamat Vite di port 5173.
// Mengubah URL media lama menjadi endpoint API yang wajib login.
// Token tetap dikirim Axios melalui header Authorization.
export function secureMediaPath(value) {
  if (typeof value !== "string") return null;

  const prefix = "/uploads/informasi/";
  if (!value.startsWith(prefix)) return null;

  const match = /^\/uploads\/informasi\/(berita|pengumuman)\/([a-f0-9-]{36}\.(?:jpg|jpeg|png|webp|pdf))$/.exec(value);

  if (!match) return null;

  const [, kind, filename] = match;

  if (kind === "berita" && filename.endsWith(".pdf")) return null;
  if (kind === "pengumuman" && !filename.endsWith(".pdf")) return null;

  return `/media/informasi/${kind}/${filename}`;
}

// Membaca file media menggunakan JWT yang sudah tersedia.
export async function fetchSecureMedia(value, signal) {
  const endpoint = secureMediaPath(value);

  if (!endpoint) {
    throw new Error("Alamat media tidak valid.");
  }

  const response = await api.get(endpoint, {
    responseType: "blob",
    signal,
  });

  return response.data;
}

// Membuka gambar atau PDF media di tab baru.
export async function openSecureMedia(value) {
  const endpoint = secureMediaPath(value);

  if (!endpoint) {
    throw new Error("Alamat media tidak valid.");
  }

  return openPdf(endpoint);
}
