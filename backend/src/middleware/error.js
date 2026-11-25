import multer from "multer";

export const asyncHandler = (fn) => (req, res, next) =>
  Promise.resolve(fn(req, res, next)).catch(next);

export const notFound = (_req, res) =>
  res.status(404).json({
    message: "Endpoint tidak ditemukan",
  });

export const errorHandler = (err, req, res, _next) => {
  if (res.headersSent) {
    return _next(err);
  }

  if (err instanceof multer.MulterError) {
    if (err.code === "LIMIT_FILE_SIZE") {
      const isBerita = /^\/api\/admin\/berita(?:\/|$)/.test(
        req.originalUrl.split("?")[0]
      );

      return res.status(413).json({
        message: isBerita
          ? "Ukuran gambar maksimal 5 MB"
          : "Ukuran file maksimal 20 MB",
      });
    }

    const messages = {
      LIMIT_FILE_COUNT: "Jumlah file melebihi batas",
      LIMIT_UNEXPECTED_FILE: "Field atau jumlah file tidak sesuai",
      LIMIT_FIELD_COUNT: "Jumlah field formulir melebihi batas",
      LIMIT_FIELD_KEY: "Nama field formulir terlalu panjang",
      LIMIT_FIELD_VALUE: "Isi field formulir terlalu besar",
      LIMIT_PART_COUNT: "Jumlah bagian formulir melebihi batas",
    };

    return res.status(400).json({
      message: messages[err.code] || "Permintaan upload tidak valid",
    });
  }

  if (err.code === "ER_DUP_ENTRY") {
    return res.status(409).json({
      message: "Data sudah ada (duplikat)",
    });
  }

  const status = Number(err.status || err.statusCode);

  if (Number.isInteger(status) && status >= 400 && status < 500) {
    return res.status(status).json({
      message: err.message || "Permintaan tidak valid",
    });
  }

  console.error("Internal server error:", err);

  return res.status(500).json({
    message: "Terjadi kesalahan server",
  });
};
