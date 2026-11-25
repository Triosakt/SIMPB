const fs = require("fs");
const path = require("path");

const file = path.join(
  process.cwd(),
  "frontend/src/pages/ManajemenProses.jsx"
);

if (!fs.existsSync(file)) {
  throw new Error("File tidak ditemukan: " + file);
}

let source = fs.readFileSync(file, "utf8");

const anchor = `  useEffect(() => {
    load();
  }, [load]);

  const rows = tab === "peta" ? peta : tab === "sub" ? subs : cfms;`;

if (!source.includes(anchor)) {
  throw new Error(
    "Posisi pemasangan tidak ditemukan. File tidak diubah."
  );
}

if (source.includes("loadExtraDocumentCounts")) {
  throw new Error("Patch statistik sudah pernah dipasang.");
}

const backup = file + ".backup-count-" + Date.now();
fs.copyFileSync(file, backup);

const replacement = `  useEffect(() => {
    load();
  }, [load]);

  // Ambil jumlah SOP dan Standar Pelayanan otomatis saat halaman dibuka.
  // Endpoint tetap menerapkan hak akses berdasarkan pengguna yang login.
  useEffect(() => {
    if (!user) return;

    let active = true;

    const loadExtraDocumentCounts = async () => {
      const results = await Promise.allSettled([
        api.get("/sop", {
          params: { page: 1, limit: 1 },
        }),
        api.get("/standar-pelayanan"),
      ]);

      if (!active) return;

      setExtraCounts((current) => {
        const next = { ...current };

        // SOP menggunakan total dari metadata pagination.
        if (results[0].status === "fulfilled") {
          const total = results[0].value.data?.meta?.total;

          if (total !== undefined && total !== null) {
            next.sop = Number(total);
          }
        }

        // Standar Pelayanan dihitung dari data yang terlihat oleh pengguna.
        if (results[1].status === "fulfilled") {
          const rows = results[1].value.data?.data;

          if (Array.isArray(rows)) {
            next.standar = rows.length;
          }
        }

        return next;
      });
    };

    loadExtraDocumentCounts();

    return () => {
      active = false;
    };
  }, [user?.id, user?.role]);

  const rows = tab === "peta" ? peta : tab === "sub" ? subs : cfms;`;

source = source.replace(anchor, replacement);

fs.writeFileSync(file, source, "utf8");

console.log("BERHASIL: Statistik SOP dan Standar Pelayanan dipasang.");
console.log("Backup:", backup);
console.log("File:", file);
