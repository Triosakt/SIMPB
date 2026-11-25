import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import {
  ArrowLeft,
  ArrowRight,
  CalendarDays,
  MapPin,
  Newspaper,
} from "lucide-react";
import SiteNavbar from "../components/SiteNavbar.jsx";
import api from "../api/client.js";
import SecureMedia from "../components/SecureMedia.jsx";
import "./public-news.css";

const LIST_PATH = "/informasi/berita";

function formatDate(value) {
  if (!value) return null;

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;

  return new Intl.DateTimeFormat("id-ID", {
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(date);
}

// Pecah isi berita menjadi paragraf agar enter di teks tampil sebagai jeda paragraf
function toParagraphs(text) {
  return String(text ?? "")
    .split(/\r?\n+/)
    .map((line) => line.trim())
    .filter(Boolean);
}

export default function PublicBeritaDetail() {
  const { slug } = useParams();

  const [berita, setBerita] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;

    setLoading(true);
    setError("");
    setBerita(null);

    api
      .get(`/berita/${encodeURIComponent(slug)}`)
      .then(({ data }) => {
        if (active) setBerita(data?.data || null);
      })
      .catch((err) => {
        if (!active) return;

        setError(
          err?.response?.status === 404
            ? "Berita tidak ditemukan atau belum dipublikasikan."
            : "Berita belum dapat dimuat. Silakan coba lagi."
        );
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [slug]);

  const date = berita
    ? formatDate(berita.tanggal_publikasi || berita.created_at)
    : null;

  const paragraphs = useMemo(() => toParagraphs(berita?.isi), [berita]);

  return (
    <div className="np-page min-h-screen bg-[#f4f8fc] text-slate-800">
      <SiteNavbar />

      {/* Hero */}
      <section className="np-detail-hero np-hero">
        <div className="np-grid" />

        <div className="np-container np-detail-inner">
          <Link to={LIST_PATH} className="np-back">
            <ArrowLeft size={16} /> Kembali ke daftar berita
          </Link>

          <div className="np-detail-heading">
            <span className="np-eyebrow">
              <Newspaper size={15} /> SIMPB BAPETEN · BERITA
            </span>

            <h1>{berita?.judul || "Informasi & Berita"}</h1>

            {berita && (date || berita.tempat) && (
              <div className="np-detail-meta">
                {date && (
                  <span>
                    <CalendarDays size={16} />
                    {date}
                  </span>
                )}

                {berita.tempat && (
                  <span>
                    <MapPin size={16} />
                    {berita.tempat}
                  </span>
                )}
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Konten */}
      <main className="np-container np-detail-main">
        {loading ? (
          <div className="np-message" role="status">
            Memuat berita...
          </div>
        ) : error || !berita ? (
          <div className="np-message" role="alert">
            <strong>Berita tidak tersedia</strong>
            <p>{error || "Berita tidak ditemukan."}</p>
            <Link to={LIST_PATH}>Kembali ke daftar berita</Link>
          </div>
        ) : (
          <article className="np-article">
            {berita.thumbnail && (
              <div className="np-article-media">
                <SecureMedia src={berita.thumbnail} alt={berita.judul} />
              </div>
            )}

            <div className="np-article-body">
              <span className="np-kicker">ARTIKEL BERITA</span>

              <div className="np-article-text">
                {paragraphs.length ? (
                  paragraphs.map((text, i) => <p key={i}>{text}</p>)
                ) : (
                  <p>Isi berita belum tersedia.</p>
                )}
              </div>

              <div className="np-article-end">
                <Link to={LIST_PATH}>
                  Lihat berita lainnya <ArrowRight size={17} />
                </Link>
              </div>
            </div>
          </article>
        )}
      </main>
    </div>
  );
}
