import SiteNavbar from "../components/SiteNavbar.jsx";
import { useState } from "react";
import {
  Link } from "react-router-dom";
import {
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  ArrowUpRight,
  Building2,
  CheckCircle2,
  Compass,
  FileCheck2,
  GitBranch,
  Layers3,
  Network,
  ShieldCheck,
  Sparkles,
  Workflow,
  ChevronDown,
  Menu,
  X
} from "lucide-react";
import "./tugas-ortala.css";

const responsibilities = [
  {
    number: "01",
    icon: Building2,
    title: "Penataan Organisasi",
    description:
      "Menyiapkan bahan penataan organisasi agar struktur, peran, dan hubungan kerja mendukung pelaksanaan tugas secara efektif.",
    tags: ["Struktur organisasi", "Penataan kelembagaan"],
  },
  {
    number: "02",
    icon: Compass,
    title: "Evaluasi Organisasi",
    description:
      "Menyiapkan bahan evaluasi organisasi sebagai dasar untuk menilai kesesuaian struktur dan mendukung perbaikan organisasi.",
    tags: ["Evaluasi", "Perbaikan berkelanjutan"],
  },
  {
    number: "03",
    icon: Workflow,
    title: "Penataan Tata Laksana",
    description:
      "Mendukung penataan cara kerja dan proses bisnis agar pelaksanaan tugas lebih terstruktur, jelas, dan terstandarisasi.",
    tags: ["Tata laksana", "Proses bisnis"],
  },
  {
    number: "04",
    icon: FileCheck2,
    title: "Standar Operasional Prosedur",
    description:
      "Menyiapkan bahan penyusunan SOP Administrasi Pemerintahan sebagai pedoman pelaksanaan kegiatan dan layanan.",
    tags: ["SOP AP", "Standarisasi"],
  },
  {
    number: "05",
    icon: Network,
    title: "Pemetaan Proses Bisnis",
    description:
      "Mendukung pemetaan proses bisnis untuk memperjelas alur kegiatan, keterkaitan fungsi, serta koordinasi antarunit kerja.",
    tags: ["Peta proses", "Kolaborasi"],
  },
  {
    number: "06",
    icon: Layers3,
    title: "Pengembangan Sistem Manajemen",
    description:
      "Mendukung pengembangan sistem manajemen melalui penataan proses kerja dan dokumentasi yang terintegrasi.",
    tags: ["Sistem manajemen", "Integrasi"],
  },
];


const units = [
  {
    number: "01",
    title: "Tim Organisasi",
    subtitle: "Organizational Development",
    icon: Building2,
    accent: "organization",
    description:
      "Menyiapkan bahan penataan dan evaluasi organisasi serta penyiapan penyusunan program reformasi birokrasi lembaga.",
    duties: [
      "Penyiapan bahan penataan organisasi",
      "Penyiapan bahan evaluasi organisasi",
      "Penyiapan penyusunan program reformasi birokrasi lembaga",
    ],
  },
  {
    number: "02",
    title: "Tim Tata Laksana",
    subtitle: "Business Process & Governance",
    icon: GitBranch,
    accent: "governance",
    description:
      "Menyiapkan bahan penyusunan SOP Administrasi Pemerintahan, pemetaan peta bisnis proses, dan pengembangan sistem manajemen.",
    duties: [
      "Penyiapan bahan penyusunan SOP Administrasi Pemerintahan",
      "Pemetaan peta bisnis proses",
      "Pengembangan sistem manajemen",
    ],
  },
];


function Reveal({ children, className = "" }) {
  return (
    <div className={`ortala-reveal ${className}`}>
      {children}
    </div>
  );
}

export default function TugasOrtalaPage() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const navGroups = [
    {
      label: "Tentang Kami",
      items: [
        { label: "Tentang Proses Bisnis", href: "/tentang" },
        { label: "Tugas Ortala", href: "/tentang/tugas-ortala" },
      ],
    },
    {
      label: "Dokumen",
      items: [
        { label: "Peta Proses", href: "/dashboard/proses" },
        { label: "Sub Proses", href: "/dashboard/proses" },
        { label: "Cross Functional Map (CFM)", href: "/#sop" },
        { label: "Standar Operasional Prosedur (SOP)", href: "/dashboard/sop" },
      ],
    },
    {
      label: "Informasi",
      items: [
        { label: "Berita", href: "/#informasi" },
        { label: "Pengumuman", href: "/#informasi" },
        { label: "Statistik", href: "/#statistik" },
      ],
    },
  ];

  return (
    <main className="ortala-page">
      <div className="ortala-topline" />
      {/* HOMEPAGE NAVBAR */}
      <SiteNavbar />

      <section className="ortala-hero">
        <div className="ortala-hero-grid" />
        <div className="ortala-hero-glow ortala-glow-one" />
        <div className="ortala-hero-glow ortala-glow-two" />

        <div className="ortala-hero-inner">
          <div className="ortala-hero-copy">
            <div className="ortala-eyebrow ortala-eyebrow-light">
              <span className="ortala-status-dot" />
              ORGANISASI & TATA LAKSANA
            </div>

            <h1>
              Organisasi yang tertata.
              <span> Proses yang bermakna.</span>
            </h1>

            <p>
              Mengenal peran Ortala dalam penataan organisasi, penguatan tata
              laksana, dan pengembangan proses bisnis di lingkungan BAPETEN.
            </p>

            <div className="ortala-hero-actions">
              <a href="#tugas-utama" className="ortala-button-primary">
                Jelajahi tugas
                <ArrowDown size={17} />
              </a>
              <a href="#struktur" className="ortala-button-ghost">
                Lihat struktur
                <ArrowRight size={17} />
              </a>
            </div>

            <div className="ortala-hero-note">
              <ShieldCheck size={18} />
              <span>Penataan organisasi · Tata laksana · Proses bisnis</span>
            </div>
          </div>

          <div className="ortala-visual" aria-label="Ilustrasi struktur organisasi dan proses bisnis">
            <div className="ortala-visual-orbit orbit-outer" />
            <div className="ortala-visual-orbit orbit-middle" />
            <div className="ortala-visual-orbit orbit-inner" />

            <div className="ortala-visual-axis axis-one" />
            <div className="ortala-visual-axis axis-two" />

            <div className="ortala-node node-top">
              <Sparkles size={17} />
              <span>STRATEGI</span>
            </div>

            <div className="ortala-core">
              <div className="ortala-core-shine" />
              <Network size={48} strokeWidth={1.25} />
              <strong>ORTALA</strong>
              <span>Organisasi & Tata Laksana</span>
              <div className="ortala-core-pulse" />
            </div>

            <div className="ortala-node node-left">
              <Building2 size={19} />
              <span>ORGANISASI</span>
            </div>

            <div className="ortala-node node-right">
              <Workflow size={19} />
              <span>TATA LAKSANA</span>
            </div>

            <div className="ortala-node node-bottom">
              <CheckCircle2 size={17} />
              <span>PROSES TERSTANDAR</span>
            </div>

            <div className="ortala-float-card float-card-one">
              <span className="ortala-float-icon">
                <GitBranch size={18} />
              </span>
              <span>
                <strong>Proses bisnis</strong>
                <small>Terstruktur & terhubung</small>
              </span>
              <span className="ortala-live-dot" />
            </div>

            <div className="ortala-float-card float-card-two">
              <span className="ortala-float-icon">
                <FileCheck2 size={18} />
              </span>
              <span>
                <strong>Dokumen SOP</strong>
                <small>Pedoman pelaksanaan</small>
              </span>
            </div>

            <div className="ortala-visual-caption">
              <span>01 — 02</span>
              <span>ORGANIZATION / GOVERNANCE</span>
            </div>
          </div>
        </div>

        <div className="ortala-hero-bottom">
          <span>BADAN PENGAWAS TENAGA NUKLIR</span>
          <span>STRUKTUR <i /> PROSES <i /> KOLABORASI</span>
        </div>
      </section>

      <section className="ortala-intro ortala-section">
        <Reveal>
          <div className="ortala-section-kicker">
            <span>01</span>
            <span>MANDAT & PERAN</span>
          </div>
          <div className="ortala-intro-grid">
            <h2>
              Fondasi tata kelola
              <span> yang lebih baik.</span>
            </h2>
            <div className="ortala-intro-text">
              <p className="ortala-lead">
                Kelompok Fungsi Organisasi dan Tata Laksana mempunyai tugas
                melaksanakan penataan organisasi dan tata laksana di
                lingkungan Badan Pengawas Tenaga Nuklir Republik Indonesia.
              </p>
              <p>
                Peran ini mendukung kejelasan struktur organisasi, konsistensi
                proses kerja, serta tersedianya pedoman dan dokumentasi proses
                bisnis yang dapat menjadi acuan bagi unit kerja.
              </p>
            </div>
          </div>
        </Reveal>

        <div className="ortala-principles">
          {[
            {
              number: "A",
              title: "Kejelasan peran",
              text: "Struktur dan tanggung jawab organisasi yang lebih jelas.",
              icon: Building2,
            },
            {
              number: "B",
              title: "Proses terstandar",
              text: "Alur kerja dan prosedur yang terdokumentasi.",
              icon: FileCheck2,
            },
            {
              number: "C",
              title: "Keterhubungan",
              text: "Hubungan proses dan koordinasi lintas unit kerja.",
              icon: Network,
            },
          ].map((item, index) => {
            const Icon = item.icon;
            return (
              <Reveal key={item.number} className={`ortala-principle delay-${index}`}>
                <article className="ortala-principle-card">
                  <div className="ortala-principle-top">
                    <span>{item.number}</span>
                    <Icon size={22} strokeWidth={1.7} />
                  </div>
                  <h3>{item.title}</h3>
                  <p>{item.text}</p>
                </article>
              </Reveal>
            );
          })}
        </div>
      </section>

      <section id="tugas-utama" className="ortala-duties">
        <div className="ortala-section ortala-duties-inner">
          <Reveal>
            <div className="ortala-section-kicker ortala-kicker-blue">
              <span>02</span>
              <span>RUANG LINGKUP</span>
            </div>
            <div className="ortala-heading-row">
              <div>
                <h2>Ruang lingkup tugas</h2>
                <p>
                  Area kerja yang mendukung penataan organisasi dan
                  pengembangan tata laksana.
                </p>
              </div>
              <div className="ortala-heading-symbol">
                <Layers3 size={28} />
              </div>
            </div>
          </Reveal>

          <div className="ortala-duty-grid">
            {responsibilities.map((item, index) => {
              const Icon = item.icon;
              return (
                <Reveal key={item.number} className={`ortala-duty-wrap delay-${index % 3}`}>
                  <article className="ortala-duty-card">
                    <div className="ortala-duty-card-top">
                      <span className="ortala-duty-number">{item.number}</span>
                      <span className="ortala-duty-icon">
                        <Icon size={23} strokeWidth={1.65} />
                      </span>
                    </div>
                    <h3>{item.title}</h3>
                    <p>{item.description}</p>
                    <div className="ortala-tags">
                      {item.tags.map((tag) => (
                        <span key={tag}>{tag}</span>
                      ))}
                    </div>
                    <div className="ortala-card-line" />
                  </article>
                </Reveal>
              );
            })}
          </div>
        </div>
      </section>

      <section id="struktur" className="ortala-structure ortala-section">
        <Reveal>
          <div className="ortala-section-kicker">
            <span>03</span>
            <span>STRUKTUR PELAKSANAAN</span>
          </div>
          <div className="ortala-structure-heading">
            <h2>Dua tim. Satu arah.</h2>
            <p>
              Penataan organisasi dan tata laksana saling melengkapi untuk
              mendukung proses kerja yang lebih terarah.
            </p>
          </div>
        </Reveal>

        
<Reveal className="ortala-org-chart">
  <div className="ortala-hierarchy">

    {/* PENGELOLA KEGIATAN */}
    <div className="ortala-person ortala-top-person">
      <img
        src="/img/satria-prahara.jpg"
        alt="Satria Prahara"
      />
      <div className="ortala-person-info">
        <strong>Pengelola Kegiatan</strong>
        <span>Satria Prahara</span>
      </div>
    </div>

    {/* PENGHUBUNG UTAMA */}
    <div className="ortala-hierarchy-connector">
      <span className="ortala-vertical-line" />
      <span className="ortala-horizontal-line" />
      <span className="ortala-left-line" />
      <span className="ortala-right-line" />
    </div>

    {/* DUA TIM */}
    <div className="ortala-team-grid">

      {/* TIM ORGANISASI */}
      <div className="ortala-team">

        <div className="ortala-person ortala-team-leader">
          <img
            src="/img/akhmad-aulia-nafish.jpg"
            alt="Akhmad Aulia Nafish"
          />
          <div className="ortala-person-info">
            <strong>Ketua Tim Organisasi</strong>
            <span>Akhmad Aulia Nafish</span>
          </div>
        </div>

        <div className="ortala-member-connector" />

        <div className="ortala-members">
          <div className="ortala-person ortala-member">
            <img
              src="/img/shabrina-ghassa.jpg"
              alt="Shabrina Ghassa"
            />
            <div className="ortala-person-info">
              <span>Shabrina Ghassa</span>
            </div>
          </div>
        </div>

      </div>

      {/* TIM TATA LAKSANA */}
      <div className="ortala-team">

        <div className="ortala-person ortala-team-leader">
          <img
            src="/img/yoga-gunara.jpg"
            alt="Yoga Gunara"
          />
          <div className="ortala-person-info">
            <strong>Ketua Tim Tata Laksana</strong>
            <span>Yoga Gunara</span>
          </div>
        </div>

        <div className="ortala-member-connector ortala-connector-double" />

        <div className="ortala-members ortala-members-double">

          <div className="ortala-person ortala-member">
            <img
              src="/img/muhammad-andiyaksa.jpg"
              alt="Muhammad Andiyaksa"
            />
            <div className="ortala-person-info">
              <span>Muhammad Andiyaksa</span>
            </div>
          </div>

          <div className="ortala-person ortala-member">
            <img
              src="/img/greta-marthauli.jpg"
              alt="Greta Marthauli"
            />
            <div className="ortala-person-info">
              <span>Greta Marthauli</span>
            </div>
          </div>

        </div>
      </div>

    </div>

    {/* KETERANGAN */}
    <div className="ortala-hierarchy-note">
      <ShieldCheck size={16} />
      <span>Struktur Kelompok Fungsi Organisasi dan Tata Laksana</span>
    </div>

  </div>
</Reveal>

      </section>

      <section className="ortala-workflow-section">
        <div className="ortala-section ortala-workflow-inner">
          <Reveal>
            <div className="ortala-section-kicker ortala-kicker-blue">
              <span>04</span>
              <span>EKOSISTEM PROSES BISNIS</span>
            </div>
            <div className="ortala-heading-row">
              <div>
                <h2>Dari struktur menuju proses.</h2>
                <p>
                  SIMPB membantu menghubungkan dokumentasi proses bisnis
                  dengan akses informasi yang lebih terintegrasi.
                </p>
              </div>
            </div>
          </Reveal>

          <div className="ortala-flow">
            {[
              {
                number: "01",
                title: "Peta Proses",
                desc: "Gambaran proses bisnis tingkat organisasi.",
                icon: Network,
                href: "/dashboard/proses",
              },
              {
                number: "02",
                title: "Sub Proses",
                desc: "Rincian alur kegiatan dalam proses bisnis.",
                icon: GitBranch,
                href: "/dashboard/proses",
              },
              {
                number: "03",
                title: "Cross Functional Map",
                desc: "Keterkaitan aktivitas dan peran lintas fungsi.",
                icon: Workflow,
                href: "/dashboard/proses",
              },
              {
                number: "04",
                title: "Standar Operasional Prosedur",
                desc: "Pedoman langkah kerja yang terdokumentasi.",
                icon: FileCheck2,
                href: "/dashboard/sop",
              },
            ].map((item, index) => {
              const Icon = item.icon;
              return (
                <Reveal key={item.number} className={`ortala-flow-wrap delay-${index}`}>
                  <Link to={item.href} className="ortala-flow-card">
                    <span className="ortala-flow-number">{item.number}</span>
                    <span className="ortala-flow-icon">
                      <Icon size={23} />
                    </span>
                    <h3>{item.title}</h3>
                    <p>{item.desc}</p>
                    <span className="ortala-flow-link">
                      Buka bagian <ArrowUpRight size={15} />
                    </span>
                  </Link>
                  {index < 3 && (
                    <span className="ortala-flow-connector">
                      <ArrowRight size={17} />
                    </span>
                  )}
                </Reveal>
              );
            })}
          </div>
        </div>
      </section>

      <section className="ortala-cta-section">
        <div className="ortala-cta">
          <div className="ortala-cta-pattern" />
          <div className="ortala-cta-content">
            <span className="ortala-cta-label">
              <Sparkles size={15} /> SIMPB BAPETEN
            </span>
            <h2>
              Kenali prosesnya.
              <span> Temukan dokumennya.</span>
            </h2>
            <p>
              Jelajahi dokumen proses bisnis sebagai bagian dari upaya
              membangun tata kelola yang terdokumentasi dan terintegrasi.
            </p>
            <div className="ortala-cta-actions">
              <Link to="/" className="ortala-cta-primary">
                Kembali ke beranda <ArrowRight size={17} />
              </Link>
              <Link to="/tentang" className="ortala-cta-secondary">
                Tentang SIMPB <ArrowUpRight size={16} />
              </Link>
            </div>
          </div>
          <div className="ortala-cta-emblem">
            <Network size={64} strokeWidth={1.1} />
            <span>TERINTEGRASI</span>
          </div>
        </div>
      </section>

      
    </main>
  );
}
