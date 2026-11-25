import multer from "multer";
import path from "path";
import fs from "fs";
import crypto from "crypto";

export const UPLOAD_ROOT = path.resolve(
  process.env.UPLOAD_DIR || "uploads"
);

const MAX_PDF_SIZE = 20 * 1024 * 1024;

const folders = {
  sop: path.join(UPLOAD_ROOT, "sop"),
  peta: path.join(UPLOAD_ROOT, "peta-proses"),
  sub: path.join(UPLOAD_ROOT, "sub-proses"),
  cfm: path.join(UPLOAD_ROOT, "cfm"),
  standar: path.join(UPLOAD_ROOT, "standar-pelayanan"),
};

Object.values(folders).forEach((dir) => {
  fs.mkdirSync(dir, { recursive: true });
});

function pdfFilter(_req, file, cb) {
  const extension = path.extname(file.originalname).toLowerCase();

  if (
    extension !== ".pdf" ||
    file.mimetype !== "application/pdf"
  ) {
    const error = new Error("Hanya file PDF yang diperbolehkan");
    error.status = 400;
    return cb(error);
  }

  cb(null, true);
}

function makeStorage(destination) {
  return multer.diskStorage({
    destination: (_req, _file, cb) => cb(null, destination),
    filename: (_req, _file, cb) => {
      cb(null, `${crypto.randomUUID()}.pdf`);
    },
  });
}

async function validatePdf(file) {
  const handle = await fs.promises.open(file.path, "r");

  try {
    const signature = Buffer.alloc(5);
    const { bytesRead } = await handle.read(
      signature,
      0,
      signature.length,
      0
    );

    return (
      bytesRead === 5 &&
      signature.toString("ascii") === "%PDF-"
    );
  } finally {
    await handle.close();
  }
}

function securePdfUpload(destination) {
  const uploader = multer({
    storage: makeStorage(destination),
    limits: {
      fileSize: MAX_PDF_SIZE,
      files: 1,
      fields: 50,
      fieldSize: 1024 * 1024,
      parts: 60,
    },
    fileFilter: pdfFilter,
  }).single("file");

  return (req, res, next) => {
    uploader(req, res, async (error) => {
      if (error) return next(error);
      if (!req.file) return next();

      try {
        const valid = await validatePdf(req.file);

        if (!valid) {
          const invalidFile = new Error(
            "Isi file tidak sesuai dengan format PDF"
          );
          invalidFile.status = 400;
          throw invalidFile;
        }

        next();
      } catch (validationError) {
        try {
          await fs.promises.unlink(req.file.path);
        } catch (cleanupError) {
          if (cleanupError.code !== "ENOENT") {
            console.error(
              "Gagal membersihkan upload:",
              cleanupError
            );
          }
        }

        req.file = undefined;
        next(validationError);
      }
    });
  };
}

export const uploadSopFile = securePdfUpload(folders.sop);

export const uploadPetaFile = securePdfUpload(folders.peta);

export const uploadSubProsesFile = securePdfUpload(folders.sub);

export const uploadCfmFile = securePdfUpload(folders.cfm);

export const uploadStandarFile = securePdfUpload(folders.standar);
