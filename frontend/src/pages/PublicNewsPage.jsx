import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  ArrowRight,
  CalendarDays,
  CheckCircle2,
  Newspaper,
  RefreshCw,
  Search,
  Sparkles,
} from "lucide-react";
import SiteNavbar from "../components/SiteNavbar.jsx";
import api, { errMsg } from "../api/client.js";
import SecureMedia from "../components/SecureMedia.jsx";
import "./public-news.css";

const PER_PAGE = 6;
const LIST_ID = "daftar-berita";

// Ambil array berita dari beberapa kemungkinan bentuk respons API
function rowsOf(response) {
  const d = response?.data;

  if (Array.isArray(d)) return d;
  if (Array.isArray(d?.data)) return d.data;
  if (Array.isArray(d?.rows)) return d.rows;

  return [];
}

const titleOf = (x) => x.judul || x.nama_berita || "Berita SIMPB";

function dateOf(x) {
  const value = x.tanggal_publikasi || x.created_at;
  if (!value) return "";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";

  return new Intl.DateTimeFormat("id-ID", {
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(date);
}

const EXCERPT_MAX = 165;

// Potong di batas kata dan beri "…" agar tidak berhenti di tengah kata
function excerpt(x) {
  const text = String(x.ringkasan || x.deskripsi || x.isi || "")
    .replace(/<[^>]*>/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  if (text.length <= EXCERPT_MAX) return text;

  return `${text.slice(0, EXCERPT_MAX).replace(/\s+\S*$/, "")}…`;
}

const linkOf = (x) => `/berita/${encodeURIComponent(x.slug || x.id)}`;

const scrollToList = () =>
  document.getElementById(LIST_ID)?.scrollIntoView({ behavior: "smooth" });

function NewsMedia({ item, featured = false }) {
  return (
    <div className={featured ? "np-feature-media" : "np-card-media"}>
      {item.thumbnail ? (
        <SecureMedia src={item.thumbnail} alt={titleOf(item)} loading="lazy" />
      ) : (
        <div className="np-placeholder">
          <Newspaper size={featured ? 65 : 43} strokeWidth={1.4} />
          <span>SIMPB BAPETEN · NEWSROOM</span>
        </div>
      )}
    </div>
  );
}

function HeroArt() {
  return (
    <div className="np-art" aria-hidden="true">
      <div className="np-orbit np-orbit-a" />
      <div className="np-orbit np-orbit-b" />

      <div className="np-art-card">
        <div className="np-art-top">
          <div className="np-art-icon">
            <Newspaper size={36} strokeWidth={1.5} />
          </div>
          <span className="np-live">
            <i /> NEWSROOM
          </span>
        </div>

        <div className="np-art-lines">
          <i />
          <i />
          <i />
        </div>

        <div className="np-art-bottom">
          <span>SIMPB / INFORMATION HUB</span>
          <strong>Digital News Portal</strong>
        </div>
      </div>

      <div className="np-float np-float-one">
        <Newspaper size={19} /> Publikasi digital
      </div>
      <div className="np-float np-float-two">
        <CheckCircle2 size={18} /> Terintegrasi
      </div>
    </div>
  );
}

export default function PublicNewsPage() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(1);
  const [reloadKey, setReloadKey] = useState(0);

  // Satu sumber pemuatan data; "Coba lagi" cukup menaikkan reloadKey
  useEffect(() => {
    let active = true;

    setLoading(true);
    setError("");

    api
      .get("/berita?limit=100")
      .then((r) => {
        if (active) setItems(rowsOf(r));
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
  }, [reloadKey]);

  const keyword = query.trim().toLowerCase();

  const filtered = useMemo(
    () =>
      items.filter((x) =>
        `${titleOf(x)} ${excerpt(x)} ${x.tempat || ""}`
          .toLowerCase()
          .includes(keyword)
      ),
    [items, keyword]
  );

  // Berita utama hanya tampil saat tidak sedang mencari
  const featured = keyword ? null : filtered[0];
  const rest = featured ? filtered.slice(1) : filtered;

  const pages = Math.max(1, Math.ceil(rest.length / PER_PAGE));
  const current = Math.min(page, pages);
  const shown = rest.slice((current - 1) * PER_PAGE, current * PER_PAGE);

  const goToPage = (next) => {
    setPage(next);
    scrollToList();
  };

  return (
    <div className="np-page min-h-screen bg-[#f4f8fc] text-slate-800">
      <SiteNavbar />

      {/* Hero */}
      <section className="np-hero">
        <div className="np-grid" />
        <div className="np-glow np-glow-a" />
        <div className="np-glow np-glow-b" />

        <div className="np-container np-hero-inner">
          <div className="np-hero-layout">
            <div className="np-hero-copy">
              <div className="np-eyebrow">
                <Sparkles size={15} /> SIMPB BAPETEN <span className="np-sep" />{" "}
                PUSAT INFORMASI
              </div>

              <h1>
                Ruang informasi.
                <br />
                <span>Kabar yang terhubung.</span>
              </h1>

              <p>
                Temukan berita, publikasi, dan perkembangan terbaru BAPETEN
                melalui pengalaman digital yang tertata, informatif, dan mudah
                dijelajahi.
              </p>

              <div className="np-actions">
                <a href={`#${LIST_ID}`} className="np-primary">
                  Jelajahi berita <ArrowRight size={17} />
                </a>

                <span className="np-counter">
                  <Newspaper size={16} />
                  <strong>{items.length}</strong> berita tersedia
                </span>
              </div>

              <div className="np-trust">
                <span>
                  <CheckCircle2 size={16} /> Informasi terpusat
                </span>
                <span>
                  <CheckCircle2 size={16} /> Mudah ditelusuri
                </span>
              </div>
            </div>

            <HeroArt />
          </div>
        </div>

        <div className="np-hero-line" />
      </section>

      {/* Daftar berita */}
      <main id={LIST_ID} className="np-container np-main">
        <div className="np-heading">
          <div>
            <span className="np-kicker">PUBLIKASI & INFORMASI</span>
            <h2>Jelajahi berita terkini.</h2>
            <p>Informasi resmi yang tersedia pada portal SIMPB BAPETEN.</p>
          </div>

          <label className="np-search">
            <Search size={19} />
            <input
              aria-label="Cari berita"
              placeholder="Cari berita..."
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setPage(1);
              }}
            />
          </label>
        </div>

        {loading ? (
          <div className="np-message" role="status">
            <RefreshCw size={20} className="animate-spin" /> Memuat berita...
          </div>
        ) : error ? (
          <div className="np-message" role="alert">
            <span>{error}</span>
            <button type="button" onClick={() => setReloadKey((k) => k + 1)}>
              Coba lagi
            </button>
          </div>
        ) : (
          <>
            {featured && (
              <Link className="np-feature" to={linkOf(featured)}>
                <NewsMedia item={featured} featured />

                <div className="np-feature-copy">
                  <span className="np-kicker">BERITA UTAMA</span>
                  <h3>{titleOf(featured)}</h3>

                  {dateOf(featured) && (
                    <span className="np-date">
                      <CalendarDays size={16} />
                      {dateOf(featured)}
                    </span>
                  )}

                  <p>
                    {excerpt(featured) ||
                      "Baca informasi selengkapnya melalui portal SIMPB."}
                  </p>

                  <span className="np-read">
                    Baca berita utama <ArrowRight size={17} />
                  </span>
                </div>
              </Link>
            )}

            {rest.length > 0 && (
              <div className="np-cards">
                {shown.map((x, i) => (
                  <Link
                    className="np-card"
                    key={x.id ?? x.slug ?? i}
                    to={linkOf(x)}
                  >
                    <NewsMedia item={x} />

                    <div className="np-card-copy">
                      <span className="np-kicker">BERITA SIMPB</span>
                      <h3>{titleOf(x)}</h3>

                      {dateOf(x) && (
                        <span className="np-date">
                          <CalendarDays size={14} />
                          {dateOf(x)}
                        </span>
                      )}

                      <p>{excerpt(x) || "Lihat informasi selengkapnya."}</p>

                      <span className="np-read">
                        Baca selengkapnya <ArrowRight size={16} />
                      </span>
                    </div>
                  </Link>
                ))}
              </div>
            )}

            {filtered.length === 0 && (
              <div className="np-message">
                {items.length === 0
                  ? "Belum ada berita yang dipublikasikan."
                  : "Belum ada berita yang sesuai pencarian."}
              </div>
            )}

            {pages > 1 && (
              <div className="np-pagination">
                <button
                  type="button"
                  disabled={current === 1}
                  onClick={() => goToPage(current - 1)}
                >
                  Sebelumnya
                </button>

                <span>
                  {current} / {pages}
                </span>

                <button
                  type="button"
                  disabled={current === pages}
                  onClick={() => goToPage(current + 1)}
                >
                  Berikutnya
                </button>
              </div>
            )}
          </>
        )}
      </main>
    </div>
  );
}
