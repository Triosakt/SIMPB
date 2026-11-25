import multer from "multer";
import path from "path";
import fs from "fs";
import crypto from "crypto";
import { UPLOAD_ROOT } from "./upload.js";

const DESTINATION = path.join(UPLOAD_ROOT, "chat");
const MAX_IMAGE_SIZE = 5 * 1024 * 1024;
const MAX_PDF_SIZE = 20 * 1024 * 1024;

fs.mkdirSync(DESTINATION, { recursive: true });

const allowed = {
  ".jpg": ["image/jpeg"],
  ".jpeg": ["image/jpeg"],
  ".png": ["image/png"],
  ".webp": ["image/webp"],
  ".pdf": ["application/pdf"],
};

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, DESTINATION),
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, crypto.randomUUID() + ext);
  },
});

const uploader = multer({
  storage,
  limits: {
    fileSize: MAX_PDF_SIZE,
    files: 1,
    fields: 5,
    parts: 6,
  },
  fileFilter: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    const mimeTypes = allowed[ext];

    if (!mimeTypes || !mimeTypes.includes(file.mimetype)) {
      const error = new Error(
        "Lampiran hanya boleh JPG, JPEG, PNG, WebP, atau PDF."
      );
      error.status = 400;
      return cb(error);
    }

    cb(null, true);
  },
}).single("attachment");

async function validateSignature(file) {
  const handle = await fs.promises.open(file.path, "r");

  try {
    const buffer = Buffer.alloc(12);
    const { bytesRead } = await handle.read(buffer, 0, 12, 0);
    const ext = path.extname(file.originalname).toLowerCase();

    if (ext === ".pdf") {
      return bytesRead >= 5 && buffer.subarray(0, 5).toString() === "%PDF-";
    }

    if (ext === ".jpg" || ext === ".jpeg") {
      return bytesRead >= 3 &&
        buffer[0] === 0xff &&
        buffer[1] === 0xd8 &&
        buffer[2] === 0xff;
    }

    if (ext === ".png") {
      return bytesRead >= 8 &&
        buffer.subarray(0, 8).equals(
          Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])
        );
    }

    if (ext === ".webp") {
      return bytesRead >= 12 &&
        buffer.subarray(0, 4).toString() === "RIFF" &&
        buffer.subarray(8, 12).toString() === "WEBP";
    }

    return false;
  } finally {
    await handle.close();
  }
}

export function uploadChatAttachment(req, res, next) {
  uploader(req, res, async (error) => {
    if (error) {
      if (error.code === "LIMIT_FILE_SIZE") {
        error.status = 400;
        error.message = "Ukuran lampiran terlalu besar. Gambar maksimal 5 MB dan PDF maksimal 20 MB.";
      }
      return next(error);
    }

    if (!req.file) return next();

    const ext = path.extname(req.file.originalname).toLowerCase();
    const maxSize = ext === ".pdf" ? MAX_PDF_SIZE : MAX_IMAGE_SIZE;

    try {
      if (req.file.size > maxSize) {
        throw Object.assign(
          new Error(ext === ".pdf"
            ? "Ukuran PDF maksimal 20 MB."
            : "Ukuran gambar maksimal 5 MB."),
          { status: 400 }
        );
      }

      if (!(await validateSignature(req.file))) {
        throw Object.assign(
          new Error("Isi file tidak sesuai dengan format lampiran."),
          { status: 400 }
        );
      }

      req.file.relativePath = path.posix.join("chat", req.file.filename);
      next();
    } catch (validationError) {
      try {
        await fs.promises.unlink(req.file.path);
      } catch {}
      req.file = undefined;
      next(validationError);
    }
  });
}
