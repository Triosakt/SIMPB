import { Router } from "express";
import rateLimit from "express-rate-limit";
import { authenticate, authorize, ROLES } from "../middleware/auth.js";
import {
  uploadSopFile,
  uploadPetaFile,
  uploadSubProsesFile,
  uploadCfmFile,
} from "../middleware/upload.js";
import { asyncHandler as ah } from "../middleware/error.js";
import * as auth from "../controllers/auth.controller.js";
import * as sop from "../controllers/sop.controller.js";
import * as standar from "../controllers/standarPelayanan.controller.js";
import { uploadStandarFile } from "../middleware/upload.js";
import { uploadChatAttachment } from "../middleware/chatUpload.js";
import * as master from "../controllers/master.controller.js";
import * as proses from "../controllers/proses.controller.js";
import * as users from "../controllers/user.controller.js";
import * as stats from "../controllers/stats.controller.js";
import * as notif from "../controllers/notification.controller.js";
import * as chat from "../controllers/chat.controller.js";
import * as informasi from "../controllers/informasi.controller.js";
import { getInformasiMedia } from "../controllers/informasiMedia.controller.js";
import { uploadBerita, uploadPengumuman } from "../middleware/informasiUpload.js";

const { ADMIN, UNIT } = ROLES;
const router = Router();

// ---------- Auth (publik) ----------
const loginLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 20, standardHeaders: true });

// Lupa password: dibatasi lebih ketat karena memicu pengiriman email
const tooMany = { message: "Terlalu banyak percobaan. Coba lagi beberapa menit lagi." };
const resetRequestLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  standardHeaders: true,
  message: tooMany,
});
const resetStepLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 15,
  standardHeaders: true,
  message: tooMany,
});

router.post("/auth/login", loginLimiter, ah(auth.login));
router.post("/auth/register", loginLimiter, ah(auth.register));
router.post("/auth/forgot-password", resetRequestLimiter, ah(auth.requestPasswordReset));
router.post("/auth/verify-reset-otp", resetStepLimiter, ah(auth.verifyPasswordResetOtp));
router.post("/auth/reset-password", resetStepLimiter, ah(auth.resetPassword));

// Semua route di bawah wajib login
router.use(authenticate);
router.get(
  "/media/informasi/:kind(berita|pengumuman)/:filename",
  ah(getInformasiMedia)
);
router.get("/berita", ah(informasi.listBerita));
router.get("/berita/:slug", ah(informasi.detailBeritaPublik));
router.get("/pengumuman", ah(informasi.listPengumuman));
router.get("/pengumuman/:id", ah(informasi.detailPengumumanPublik));
// Semua operasi administrasi wajib autentikasi dan peran Admin Ortala.
router.get("/admin/berita", authorize(ADMIN), ah(informasi.adminListBerita));
router.post("/admin/berita", authorize(ADMIN), uploadBerita, ah(informasi.createBerita));
router.put("/admin/berita/:id", authorize(ADMIN), uploadBerita, ah(informasi.updateBerita));
router.delete("/admin/berita/:id", authorize(ADMIN), ah(informasi.deleteBerita));
router.get("/admin/pengumuman", authorize(ADMIN), ah(informasi.adminListPengumuman));
router.post("/admin/pengumuman", authorize(ADMIN), uploadPengumuman, ah(informasi.createPengumuman));
router.put("/admin/pengumuman/:id", authorize(ADMIN), uploadPengumuman, ah(informasi.updatePengumuman));
router.delete("/admin/pengumuman/:id", authorize(ADMIN), ah(informasi.deletePengumuman));
router.get("/auth/me", auth.me);

// ---------- SOP ----------
router.get("/sop", ah(sop.listSop));
router.get("/sop/:id", ah(sop.getSop));

// Membuka PDF: mencatat jumlah dilihat.
router.get("/sop/:id/view", ah(sop.viewSop));

// Mengunduh PDF: tetap mencatat jumlah unduhan.
router.get("/sop/:id/download", ah(sop.downloadSop));

router.post(
  "/sop",
  authorize(UNIT, ADMIN),
  uploadSopFile,
  ah(sop.createSop)
);

// Edit SOP: menerima JSON biasa, atau multipart bila ada PDF pengganti.
router.patch("/sop/:id", authorize(ADMIN), uploadSopFile, ah(sop.updateSop));
router.delete("/sop/:id", authorize(ADMIN), ah(sop.deleteSop));

router.post(
  "/sop/:id/:decision(approve|reject)",
  authorize(ADMIN),
  ah(sop.reviewSop)
);

// ---------- Master data ----------
router.get("/unit-kerja", ah(master.listUnitKerja));
router.post("/unit-kerja", authorize(ADMIN), ah(master.createUnitKerja));
router.patch("/unit-kerja/:id", authorize(ADMIN), ah(master.updateUnitKerja));
router.get("/lembaga", ah(master.listLembaga));
router.post("/lembaga", authorize(ADMIN), ah(master.createLembaga));
router.patch("/lembaga/:id", authorize(ADMIN), ah(master.updateLembaga));
router.get("/peta-proses", ah(master.listPetaProses));
router.get("/keterangan", ah(master.listKeterangan));

// ---------- Peta proses > sub proses > CFM (referensi, semua role) ----------
router.post(
  "/proses/peta",
  authorize(UNIT, ADMIN),
  uploadPetaFile,
  ah(proses.createPeta)
);


router.patch("/proses/peta/:id", authorize(ADMIN), uploadPetaFile, ah(proses.updatePeta));
router.delete("/proses/peta/:id", authorize(ADMIN), ah(proses.deletePeta));
router.post("/proses/sub", authorize(UNIT, ADMIN), uploadSubProsesFile, ah(proses.createSubProses));
router.patch("/proses/sub/:id", authorize(ADMIN), uploadSubProsesFile, ah(proses.updateSubProses));
router.delete("/proses/sub/:id", authorize(ADMIN), ah(proses.deleteSubProses));
router.post("/proses/cfm", authorize(UNIT, ADMIN), uploadCfmFile, ah(proses.createCfm));
router.patch("/proses/cfm/:id", authorize(ADMIN), uploadCfmFile, ah(proses.updateCfm));
router.delete("/proses/cfm/:id", authorize(ADMIN), ah(proses.deleteCfm));
router.get("/proses/approval", authorize(ADMIN), ah(proses.listProcessApprovals));
router.post("/proses/:type(peta|sub|cfm)/:id/:decision(approve|reject)", authorize(ADMIN), ah(proses.reviewProcessDocument));
router.get("/proses", ah(proses.list));
router.get("/proses/katalog", ah(proses.katalog));
router.get("/proses/katalog-dashboard", authorize(ADMIN, UNIT), ah(proses.katalogDashboard));
router.get("/proses/peta/:id", ah(proses.detail));
router.get("/proses/:type(peta|sub|cfm)/:id/file", ah(proses.file));

// ---------- Manajemen user (Admin) ----------
router.get("/users", authorize(ADMIN), ah(users.listUsers));
router.post("/users", authorize(ADMIN), ah(users.createUser));
router.patch("/users/:id", authorize(ADMIN), ah(users.updateUser));

// ---------- Statistik & notifikasi ----------
router.get("/stats/summary", ah(stats.summary));

router.get(
  "/stats/unit-summary",
  authorize(ADMIN, UNIT, ROLES.USER),
  ah(stats.unitSummary)
);

router.get(
  "/stats/process-summary",
  ah(stats.processSummary)
);

// ---------- Live Chat (hanya Admin Ortala dan Perwakilan Unit) ----------
router.get("/chat/conversation", authorize(UNIT), ah(chat.unitConversation));
router.get("/chat/messages", authorize(UNIT), ah(chat.unitMessages));
router.post("/chat/messages", authorize(UNIT), uploadChatAttachment, ah(chat.unitSendMessage));
router.patch("/chat/read", authorize(UNIT), ah(chat.unitMarkRead));
router.get("/chat/attachments/:id", authorize(UNIT, ADMIN), ah(chat.getAttachment));
router.get("/chat/conversations", authorize(ADMIN), ah(chat.adminConversations));
router.get("/chat/conversations/:id/messages", authorize(ADMIN), ah(chat.adminMessages));
router.post("/chat/conversations/:id/messages", authorize(ADMIN), uploadChatAttachment, ah(chat.adminSendMessage));
router.patch("/chat/conversations/:id/read", authorize(ADMIN), ah(chat.adminMarkRead));

router.get("/notifications", ah(notif.myNotifications));
router.patch("/notifications/read-all", ah(notif.markAllRead));
router.patch("/notifications/:id/read", ah(notif.markRead));

// SIMPB_STANDAR_V1 — semua endpoint memerlukan autentikasi (router.use(authenticate) di atas)
router.get('/standar-pelayanan', ah(standar.list));
router.get('/standar-pelayanan/:id', ah(standar.detail));
router.get('/standar-pelayanan/:id/view', ah(standar.view));
router.get('/standar-pelayanan/:id/download', ah(standar.download));
router.post('/standar-pelayanan', authorize(UNIT, ADMIN), uploadStandarFile, ah(standar.create));
router.patch('/standar-pelayanan/:id', authorize(UNIT, ADMIN), uploadStandarFile, ah(standar.update));
router.post('/standar-pelayanan/:id/:decision(approve|reject)', authorize(ADMIN), ah(standar.review));
router.delete('/standar-pelayanan/:id', authorize(ADMIN), ah(standar.remove));
export default router;