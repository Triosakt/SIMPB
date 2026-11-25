import { lazy, Suspense } from "react";
import ScrollToTop from "./components/ScrollToTop.jsx";

import { Navigate, Route, Routes } from "react-router-dom";

import ForgotPassword from "./pages/ForgotPassword";

import ProtectedRoute from "./routes/ProtectedRoute.jsx";


import { useLocation } from "react-router-dom";
import SiteFooter from "./components/SiteFooter.jsx";


















/* SIMPB_ROUTE_LAZY_V1 */
const PublicStatisticsPage = lazy(() => import("./pages/PublicStatisticsPage.jsx"));
const AboutPage = lazy(() => import("./pages/AboutPage.jsx"));
const TugasOrtalaPage = lazy(() => import("./pages/TugasOrtalaPage.jsx"));
const DashboardLayout = lazy(() => import("./layouts/DashboardLayout.jsx"));
const HomePage = lazy(() => import("./pages/HomePage.jsx"));
const PublicPortalPage = lazy(() => import("./pages/PublicPortalPage.jsx"));
const PublicBeritaDetail = lazy(() => import("./pages/PublicBeritaDetail.jsx"));
const Login = lazy(() => import("./pages/Login.jsx"));
const PublicPengumumanDetail = lazy(() => import("./pages/PublicPengumumanDetail.jsx"));
const Dashboard = lazy(() => import("./pages/Dashboard.jsx"));
const SopList = lazy(() => import("./pages/SopList.jsx"));
const UploadSop = lazy(() => import("./pages/UploadSop.jsx"));
const Approval = lazy(() => import("./pages/Approval.jsx"));
const StatistikPrint = lazy(() => import("./pages/StatistikPrint.jsx"));
/* SIMPB_KATALOG_TERPADU_V1 */
const KatalogDokumenPage = lazy(() => import("./pages/KatalogDokumenPage.jsx"));
const ProsesList = lazy(() => import("./pages/ProsesList.jsx"));
const ProsesDetail = lazy(() => import("./pages/ProsesDetail.jsx"));
const Users = lazy(() => import("./pages/Users.jsx"));
const Organisasi = lazy(() => import("./pages/Organisasi.jsx"));
const UploadPetaProses = lazy(() => import("./pages/UploadPetaProses.jsx"));
const UploadDokumenTurunan = lazy(() => import("./pages/UploadDokumenTurunan.jsx"));
const ManajemenProses = lazy(() => import("./pages/ManajemenProses.jsx"));
const BeritaPage = lazy(() => import("./pages/BeritaPage.jsx"));
const PengumumanPage = lazy(() => import("./pages/PengumumanPage.jsx"));
const InformasiFormPage = lazy(() => import("./pages/InformasiFormPage.jsx"));
const ChatPage = lazy(() => import("./pages/ChatPage.jsx"));

/* SIMPB_STANDAR_V1 */
const StandarPelayananPage = lazy(() => import("./pages/StandarPelayananPage.jsx"));
const PublicStandarPelayananPage = lazy(() => import("./pages/PublicStandarPelayananPage.jsx"));
const UNIT = "perwakilan_unit";
const ADMIN = "admin_ortala";

export default function App() {
  const location = useLocation();

const isDashboard = location.pathname.startsWith("/dashboard");

const hideFooter =
  isDashboard ||
  ["/login", "/forgot-password"].includes(location.pathname);
  return (
    <>
      <ScrollToTop />
    <Suspense fallback={<div role="status" className="flex min-h-[45vh] items-center justify-center bg-[#f4f8fc] px-6 text-sm font-semibold text-[#104b7a]">Memuat halaman SIMPB...</div>}><Routes>
      {/* Homepage hanya dapat diakses setelah login */}
      <Route
        path="/"
        element={
          <ProtectedRoute>
            <HomePage />
          </ProtectedRoute>
        }
      />

      <Route path="/dokumen/:type" element={<ProtectedRoute><PublicPortalPage kind="dokumen" /></ProtectedRoute>} />
      <Route path="/informasi/:type" element={<ProtectedRoute><PublicPortalPage kind="informasi" /></ProtectedRoute>} />
      <Route path="/statistik-publik" element={<ProtectedRoute><PublicStatisticsPage /></ProtectedRoute>} />
      <Route path="/berita/:slug" element={<ProtectedRoute><PublicBeritaDetail /></ProtectedRoute>} />
      <Route path="/pengumuman/:id" element={<ProtectedRoute><PublicPengumumanDetail /></ProtectedRoute>} />

      {/* Halaman login */}
      <Route path="/tentang" element={<AboutPage />} />
    <Route path="/tentang/tugas-ortala" element={<TugasOrtalaPage />} />
<Route path="/forgot-password" element={<ForgotPassword />} />
      <Route path="/login" element={<Login />} />
      <Route path="/standar-pelayanan" element={<ProtectedRoute><PublicStandarPelayananPage /></ProtectedRoute>} />

      {/* Seluruh area dashboard memerlukan autentikasi */}
      <Route
        path="/dashboard"
        element={
          <ProtectedRoute roles={[UNIT, ADMIN]}>
            <DashboardLayout />
          </ProtectedRoute>
        }
      >

                <Route
          path="manajemen-proses"
          element={
            <ProtectedRoute roles={[UNIT, ADMIN]}>
              <ManajemenProses />
            </ProtectedRoute>
          }
        />

        <Route
          path="proses/upload"
          element={
            <ProtectedRoute roles={[UNIT, ADMIN]}>
              <UploadPetaProses />
            </ProtectedRoute>
          }
        />
        
        <Route path="proses/upload/sub" element={<ProtectedRoute roles={[UNIT, ADMIN]}><UploadDokumenTurunan type="sub" /></ProtectedRoute>} />
        <Route path="proses/upload/cfm" element={<ProtectedRoute roles={[UNIT, ADMIN]}><UploadDokumenTurunan type="cfm" /></ProtectedRoute>} />

        <Route index element={<Dashboard />} />

        {/* Katalog dokumen */}
        <Route path="dokumen" element={<KatalogDokumenPage />} />
        <Route path="sop" element={<SopList />} />
        <Route path="standar-pelayanan" element={<StandarPelayananPage />} />

        {/* Unggah SOP: perwakilan unit dan admin Ortala */}
        <Route
          path="sop/upload"
          element={
            <ProtectedRoute roles={[UNIT, ADMIN]}>
              <UploadSop />
            </ProtectedRoute>
          }
        />

        {/* Persetujuan: khusus admin Ortala */}
        <Route
          path="approval"
          element={
            <ProtectedRoute roles={[ADMIN]}>
              <Approval />
            </ProtectedRoute>
          }
        />

        {/* Proses bisnis */}
        <Route path="proses" element={<ProsesList />} />
        <Route path="proses/:id" element={<ProsesDetail />} />

        {/* Pengelolaan pengguna dan organisasi */}
        <Route
          path="users"
          element={
            <ProtectedRoute roles={[ADMIN]}>
              <Users />
            </ProtectedRoute>
          }
        />

        <Route
          path="organisasi"
          element={
            <ProtectedRoute roles={[ADMIN]}>
              <Organisasi />
            </ProtectedRoute>
          }
        />

        {/* Informasi: khusus Admin Ortala */}
        <Route
          path="berita"
          element={
            <ProtectedRoute roles={[ADMIN]}>
              <BeritaPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="pengumuman"
          element={
            <ProtectedRoute roles={[ADMIN]}>
              <PengumumanPage />
            </ProtectedRoute>
          }
        />

        <Route path="berita/tambah" element={<ProtectedRoute roles={[ADMIN]}><InformasiFormPage type="berita" /></ProtectedRoute>} />
        <Route path="berita/:id/edit" element={<ProtectedRoute roles={[ADMIN]}><InformasiFormPage type="berita" /></ProtectedRoute>} />
        <Route path="pengumuman/tambah" element={<ProtectedRoute roles={[ADMIN]}><InformasiFormPage type="pengumuman" /></ProtectedRoute>} />
        <Route path="pengumuman/:id/edit" element={<ProtectedRoute roles={[ADMIN]}><InformasiFormPage type="pengumuman" /></ProtectedRoute>} />

        {/* Statistik */}
        <Route
          path="statistik"
          element={
            <ProtectedRoute roles={[ADMIN, UNIT]}>
              <StatistikPrint />
            </ProtectedRoute>
          }
        />
      </Route>

      {/* Rute tidak dikenal */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes></Suspense>
    {!hideFooter && <SiteFooter />}
    </>
  );
}
