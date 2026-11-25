import multer from "multer";
import fs from "fs";
import path from "path";
import crypto from "crypto";
import { UPLOAD_ROOT } from "./upload.js";

const base = path.join(UPLOAD_ROOT, "informasi");
const folders = {
  berita: path.join(base, "berita"),
  pengumuman: path.join(base, "pengumuman"),
};

Object.values(folders).forEach(dir =>
  fs.mkdirSync(dir, { recursive: true })
);

const allowedImages = {
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".webp": "image/webp",
};

async function validSignature(file, kind) {
  const handle = await fs.promises.open(file.path, "r");

  try {
    const bytes = Buffer.alloc(12);
    const { bytesRead } = await handle.read(bytes, 0, 12, 0);

    if (kind === "pengumuman") {
      return bytesRead >= 5 &&
        bytes.subarray(0, 5).toString("ascii") === "%PDF-";
    }

    const ext = path.extname(file.filename).toLowerCase();

    if (ext === ".jpg" || ext === ".jpeg") {
      return bytesRead >= 3 &&
        bytes[0] === 0xff &&
        bytes[1] === 0xd8 &&
        bytes[2] === 0xff;
    }

    if (ext === ".png") {
      return bytesRead >= 8 &&
        bytes.subarray(0, 8).equals(
          Buffer.from("89504e470d0a1a0a", "hex")
        );
    }

    if (ext === ".webp") {
      return bytesRead >= 12 &&
        bytes.toString("ascii", 0, 4) === "RIFF" &&
        bytes.toString("ascii", 8, 12) === "WEBP";
    }

    return false;
  } finally {
    await handle.close();
  }
}

function uploader(kind) {
  const image = kind === "berita";

  const upload = multer({
    storage: multer.diskStorage({
      destination: (_req, _file, cb) =>
        cb(null, folders[kind]),

      filename: (_req, file, cb) =>
        cb(
          null,
          crypto.randomUUID() +
            path.extname(file.originalname).toLowerCase()
        ),
    }),

    limits: {
      fileSize: image ? 5 * 1024 * 1024 : 20 * 1024 * 1024,
      files: 1,
      fields: 50,
      fieldSize: 1024 * 1024,
      parts: 60,
    },

    fileFilter: (_req, file, cb) => {
      const ext = path.extname(file.originalname).toLowerCase();
      const allowed = image
        ? allowedImages
        : { ".pdf": "application/pdf" };

      if (allowed[ext] !== file.mimetype) {
        const error = new Error(
          image
            ? "Hanya JPG, PNG, atau WebP yang diperbolehkan."
            : "Hanya PDF yang diperbolehkan."
        );
        error.status = 400;
        return cb(error);
      }

      cb(null, true);
    },
  }).single("file");

  return (req, res, next) => {
    upload(req, res, async error => {
      if (error) return next(error);
      if (!req.file) return next();

      try {
        if (!(await validSignature(req.file, kind))) {
          const invalid = new Error(
            "Isi file tidak sesuai dengan format yang diizinkan."
          );
          invalid.status = 400;
          throw invalid;
        }

        next();
      } catch (error) {
        try {
          await fs.promises.unlink(req.file.path);
        } catch (cleanupError) {
          if (cleanupError.code !== "ENOENT") {
            console.error(
              "Gagal membersihkan file informasi:",
              cleanupError
            );
          }
        }

        req.file = undefined;
        next(error);
      }
    });
  };
}

export const uploadBerita = uploader("berita");
export const uploadPengumuman = uploader("pengumuman");
