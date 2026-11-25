import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import api, { errMsg } from "../api/client.js";

const currentYear = new Date().getFullYear();

const initialForm = {
  keterangan_id: "",
  nomor_peta_proses: "",
  judul: "",
  tahun_terbit: String(currentYear),
};

export default function UploadPetaProses() {
  const navigate = useNavigate();

  const [form, setForm] = useState(initialForm);
  const [categories, setCategories] = useState([]);
  const [units, setUnits] = useState([]);
  const [selectedUnits, setSelectedUnits] = useState([]);
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;

    Promise.all([
      api.get("/keterangan"),
      api.get("/unit-kerja"),
    ])
      .then(([categoryResponse, unitResponse]) => {
        if (!active) return;

        setCategories(categoryResponse.data);
        setUnits(unitResponse.data);
      })
      .catch((e) => {
        if (active) setError(errMsg(e));
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, []);

  const setField = (event) => {
    const { name, value } = event.target;

    setForm((previous) => ({
      ...previous,
      [name]: value,
    }));
  };

  const toggleUnit = (id) => {
    setSelectedUnits((previous) =>
      previous.includes(id)
        ? previous.filter((item) => item !== id)
        : [...previous, id]
    );
  };

  const submit = async (event) => {
    event.preventDefault();
    setError("");

    if (!file) {
      setError("Pilih file PDF peta proses terlebih dahulu.");
      return;
    }

    if (file.type !== "application/pdf" || !file.name.toLowerCase().endsWith(".pdf")) {
      setError("File harus berformat PDF.");
      return;
    }

    if (file.size > 20 * 1024 * 1024) {
      setError("Ukuran PDF maksimal 20 MB.");
      return;
    }

    const data = new FormData();

    data.append("keterangan_id", form.keterangan_id);
    data.append("nomor_peta_proses", form.nomor_peta_proses.trim());
    data.append("judul", form.judul.trim());
    data.append("tahun_terbit", form.tahun_terbit);
    data.append("unit_kerja_ids", JSON.stringify(selectedUnits));
    data.append("file", file);

    setSaving(true);

    try {
      const response = await api.post("/proses/peta", data);
      navigate(`/dashboard/proses/${response.data.id}`);
    } catch (e) {
      setError(errMsg(e));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="mx-auto max-w-3xl space-y-5">
      <div>
        <Link
          to="/dashboard/proses"
          className="text-sm font-medium text-accent hover:underline"
        >
          ← Kembali ke peta proses
        </Link>

        <h1 className="mt-3 text-2xl font-bold text-primary">
          Upload Peta Proses
        </h1>

        <p className="mt-1 text-sm text-ink-soft">
          Tambahkan peta proses bisnis beserta dokumen PDF dan unit kerja
          yang terkait.
        </p>
      </div>

      {error && (
        <p
          role="alert"
          className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-800"
        >
          {error}
        </p>
      )}

      {loading ? (
        <p className="py-10 text-center text-ink-soft">
          Memuat kategori dan unit kerja…
        </p>
      ) : (
        <form onSubmit={submit} className="panel space-y-5 p-5">
          <div>
            <label className="label" htmlFor="nomor_peta_proses">
              Nomor peta proses *
            </label>
            <input
              id="nomor_peta_proses"
              name="nomor_peta_proses"
              className="input"
              value={form.nomor_peta_proses}
              onChange={setField}
              maxLength={255}
              placeholder="Contoh: PP-01"
              required
            />
          </div>

          <div>
            <label className="label" htmlFor="judul">
              Judul peta proses *
            </label>
            <input
              id="judul"
              name="judul"
              className="input"
              value={form.judul}
              onChange={setField}
              maxLength={255}
              placeholder="Masukkan judul peta proses"
              required
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="label" htmlFor="keterangan_id">
                Kategori proses *
              </label>
              <select
                id="keterangan_id"
                name="keterangan_id"
                className="input"
                value={form.keterangan_id}
                onChange={setField}
                required
              >
                <option value="">Pilih kategori</option>
                {categories.map((category) => (
                  <option key={category.id} value={category.id}>
                    {category.nama_keterangan}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="label" htmlFor="tahun_terbit">
                Tahun terbit *
              </label>
              <input
                id="tahun_terbit"
                name="tahun_terbit"
                type="number"
                className="input"
                min="1901"
                max="2155"
                value={form.tahun_terbit}
                onChange={setField}
                required
              />
            </div>
          </div>

          <div>
            <p className="label">Unit kerja terkait</p>
            <p className="mb-2 text-xs text-ink-soft">
              Pilih satu atau beberapa unit kerja. Bagian ini boleh dikosongkan.
            </p>

            {units.length === 0 ? (
              <p className="text-sm text-ink-soft">
                Belum ada unit kerja aktif.
              </p>
            ) : (
              <div className="grid max-h-56 gap-2 overflow-y-auto rounded-lg border border-line p-3 sm:grid-cols-2">
                {units.map((unit) => (
                  <label
                    key={unit.id}
                    className="flex cursor-pointer items-start gap-2 text-sm"
                  >
                    <input
                      type="checkbox"
                      className="mt-1"
                      checked={selectedUnits.includes(Number(unit.id))}
                      onChange={() => toggleUnit(Number(unit.id))}
                    />
                    <span>{unit.nama_unit}</span>
                  </label>
                ))}
              </div>
            )}
          </div>

          <div>
            <label className="label" htmlFor="file">
              Dokumen PDF *
            </label>
            <input
              id="file"
              type="file"
              className="input"
              accept=".pdf,application/pdf"
              onChange={(event) => setFile(event.target.files?.[0] || null)}
              required
            />
            <p className="mt-1 text-xs text-ink-soft">
              Format PDF, ukuran maksimal 20 MB.
            </p>

            {file && (
              <p className="mt-2 text-sm text-ink">
                File dipilih: {file.name}
              </p>
            )}
          </div>

          <div className="flex flex-wrap justify-end gap-2 border-t border-line pt-4">
            <Link to="/dashboard/proses" className="btn-ghost">
              Batal
            </Link>

            <button
              type="submit"
              className="btn-primary"
              disabled={saving}
            >
              {saving ? "Mengunggah…" : "Simpan Peta Proses"}
            </button>
          </div>
        </form>
      )}
    </div>
  );
}