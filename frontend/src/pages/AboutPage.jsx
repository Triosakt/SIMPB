import SiteNavbar from "../components/SiteNavbar.jsx";
import {
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
} from "lucide-react";
import { Link } from "react-router-dom";
import "./about-page.css";

const principles = [
  {
    icon: Workflow,
    number: "01",
    title: "Proses yang terstruktur",
    description:
      "Membantu menyajikan alur proses bisnis secara lebih jelas, konsisten, dan mudah dipahami.",
  },
  {
    icon: FileCheck2,
    number: "02",
    title: "Dokumentasi terpusat",
    description:
      "Menyatukan akses ke dokumen proses bisnis, peta proses, CFM, dan SOP dalam satu sistem.",
  },
  {
    icon: Network,
    number: "03",
    title: "Kolaborasi antarunit",
    description:
      "Memudahkan pengguna memahami hubungan proses, tanggung jawab, dan keterkaitan pekerjaan.",
  },
];

const stages = [
  {
    icon: Compass,
    title: "Peta proses bisnis",
    description: "Gambaran menyeluruh proses bisnis organisasi.",
  },
  {
    icon: GitBranch,
    title: "Subproses dan CFM",
    description: "Rincian alur kerja dan keterlibatan fungsi terkait.",
  },
  {
    icon: FileCheck2,
    title: "Standar operasional prosedur",
    description: "Dokumentasi prosedur sebagai acuan pelaksanaan kerja.",
  },
];

export default function AboutPage() {
  return (
    <main className="about-page min-h-screen overflow-hidden bg-[#f4f7fb] text-[#172b45]">
      <SiteNavbar />

      <section className="about-hero relative isolate">
        <div className="about-grid absolute inset-0 -z-10" />
        <div className="about-glow about-glow-one" />
        <div className="about-glow about-glow-two" />

        <div className="mx-auto grid min-h-[650px] max-w-[1200px] items-center gap-8 px-5 py-16 sm:px-8 lg:grid-cols-[1.02fr_0.98fr] lg:gap-3 lg:py-20">
          <div className="about-hero-copy relative z-10">
            <div className="about-eyebrow">
              <Sparkles size={15} />
              <span>PROSES BISNIS · TERINTEGRASI · TERDOKUMENTASI</span>
            </div>

            <h1 className="mt-7 max-w-2xl text-4xl font-black leading-[1.08] tracking-[-0.045em] text-white sm:text-5xl lg:text-[66px]">
              Mengenal
              <span className="about-gradient block">SIMPB BAPETEN.</span>
              <span className="mt-2 block text-3xl font-bold leading-tight tracking-tight text-blue-100 sm:text-4xl lg:text-[43px]">
                Satu sistem, proses yang lebih terarah.
              </span>
            </h1>

            <p className="mt-6 max-w-xl text-base leading-8 text-blue-100/85 sm:text-lg">
              Sistem Informasi Proses Bisnis BAPETEN dirancang untuk membantu
              penyajian, penelusuran, dan pengelolaan dokumentasi proses bisnis
              melalui pengalaman digital yang terstruktur dan mudah diakses.
            </p>

            <div className="mt-9 flex flex-wrap gap-3">
              <Link to="/#sop" className="about-primary-button">
                Jelajahi dokumen
                <ArrowRight size={17} />
              </Link>
              <Link to="/dashboard" className="about-secondary-button">
                Buka dashboard
                <ArrowUpRight size={16} />
              </Link>
            </div>

            <div className="mt-11 flex flex-wrap gap-x-7 gap-y-4 border-t border-white/15 pt-6">
              {[
                "Terstruktur",
                "Terintegrasi",
                "Mudah ditelusuri",
              ].map((item) => (
                <div key={item} className="flex items-center gap-2 text-sm font-semibold text-blue-100">
                  <CheckCircle2 size={16} className="text-cyan-300" />
                  {item}
                </div>
              ))}
            </div>
          </div>

          <div className="about-scene" aria-label="Ilustrasi 3D jaringan proses bisnis">
            <div className="about-scene-stars" />
            <div className="about-orbit about-orbit-outer">
              <span className="about-orbit-node node-one" />
              <span className="about-orbit-node node-two" />
            </div>
            <div className="about-orbit about-orbit-middle">
              <span className="about-orbit-node node-three" />
            </div>
            <div className="about-orbit about-orbit-inner" />

            <div className="about-core-shadow" />
            <div className="about-core">
              <div className="about-core-top">
                <div className="about-core-icon">
                  <Network size={35} strokeWidth={1.5} />
                </div>
                <span className="about-core-status">
                  <span />
                  PROCESS SYSTEM
                </span>
              </div>
              <div className="about-core-lines">
                <span />
                <span />
                <span />
              </div>
              <div className="about-core-bottom">
                <div>
                  <span className="about-mini-label">SIMPB</span>
                  <strong>Business Process</strong>
                </div>
                <Layers3 size={23} className="text-cyan-300" />
              </div>
            </div>

            <div className="about-float-card about-card-top">
              <span className="about-float-icon">
                <Workflow size={20} />
              </span>
              <span>
                <strong>Peta Proses</strong>
                <small>Alur terstruktur</small>
              </span>
              <CheckCircle2 size={17} className="ml-auto text-cyan-300" />
            </div>

            <div className="about-float-card about-card-left">
              <span className="about-float-icon">
                <FileCheck2 size={20} />
              </span>
              <span>
                <strong>Dokumentasi</strong>
                <small>Informasi terpusat</small>
              </span>
            </div>

            <div className="about-float-card about-card-right">
              <span className="about-float-icon">
                <GitBranch size={20} />
              </span>
              <span>
                <strong>Integrasi</strong>
                <small>Keterkaitan proses</small>
              </span>
            </div>

            <div className="about-scene-caption">
              <span className="about-caption-line" />
              <span>DIGITAL PROCESS ECOSYSTEM</span>
            </div>
          </div>
        </div>

        <div className="about-hero-bottom" />
      </section>

      <section className="mx-auto max-w-[1200px] px-5 py-20 sm:px-8 lg:py-28">
        <div className="about-reveal grid gap-10 lg:grid-cols-[0.75fr_1.25fr] lg:gap-20">
          <div>
            <span className="about-section-label">TENTANG SIMPB</span>
            <h2 className="mt-4 text-3xl font-black leading-tight tracking-tight text-[#104b7a] sm:text-4xl">
              Menghubungkan proses, dokumentasi, dan informasi.
            </h2>
          </div>
          <div className="space-y-5 text-base leading-8 text-slate-600">
            <p>
              SIMPB merupakan portal informasi proses bisnis yang membantu
              pengguna menemukan gambaran proses organisasi dan dokumentasi
              pendukungnya melalui satu titik akses.
            </p>
            <p>
              Dengan penyajian informasi yang konsisten, peta proses, subproses,
              Cross Functional Map (CFM), dan Standar Operasional Prosedur (SOP)
              dapat dipahami sebagai bagian-bagian yang saling berkaitan.
            </p>
            <div className="about-info-note">
              <ShieldCheck size={23} />
              <p>
                <strong>Fokus utama:</strong> keteraturan dokumentasi,
                kemudahan akses informasi, dan kejelasan hubungan antarproses.
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="about-principles relative overflow-hidden py-20 sm:py-24">
        <div className="mx-auto max-w-[1200px] px-5 sm:px-8">
          <div className="about-reveal mx-auto max-w-2xl text-center">
            <span className="about-section-label">NILAI UTAMA</span>
            <h2 className="mt-4 text-3xl font-black tracking-tight text-[#104b7a] sm:text-4xl">
              Dirancang untuk kejelasan proses.
            </h2>
            <p className="mt-4 leading-7 text-slate-600">
              Informasi yang tersusun dengan baik membantu pengguna memahami
              dokumen dan hubungan kerja secara lebih menyeluruh.
            </p>
          </div>

          <div className="mt-12 grid gap-5 md:grid-cols-3">
            {principles.map((item, index) => {
              const Icon = item.icon;
              return (
                <article
                  key={item.number}
                  className="about-value-card about-reveal"
                  style={{ "--card-index": index }}
                >
                  <div className="flex items-start justify-between">
                    <div className="about-value-icon">
                      <Icon size={25} strokeWidth={1.7} />
                    </div>
                    <span className="about-value-number">{item.number}</span>
                  </div>
                  <h3 className="mt-7 text-xl font-extrabold text-[#104b7a]">
                    {item.title}
                  </h3>
                  <p className="mt-3 text-sm leading-7 text-slate-600">
                    {item.description}
                  </p>
                  <div className="about-card-accent" />
                </article>
              );
            })}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-[1200px] px-5 py-20 sm:px-8 lg:py-28">
        <div className="about-reveal">
          <span className="about-section-label">EKOSISTEM DOKUMEN</span>
          <h2 className="mt-4 max-w-2xl text-3xl font-black tracking-tight text-[#104b7a] sm:text-4xl">
            Dari gambaran besar hingga prosedur kerja.
          </h2>
          <p className="mt-4 max-w-2xl leading-7 text-slate-600">
            Dokumentasi proses bisnis dapat dipahami melalui tahapan yang
            saling terhubung.
          </p>
        </div>

        <div className="about-flow mt-12">
          {stages.map((stage, index) => {
            const Icon = stage.icon;
            return (
              <div
                className="about-flow-item about-reveal"
                key={stage.title}
                style={{ "--card-index": index }}
              >
                <div className="about-flow-connector">
                  <span>{String(index + 1).padStart(2, "0")}</span>
                  <div />
                </div>
                <div className="about-flow-content">
                  <div className="about-flow-icon">
                    <Icon size={25} />
                  </div>
                  <div>
                    <h3 className="font-extrabold text-[#104b7a]">
                      {stage.title}
                    </h3>
                    <p className="mt-2 text-sm leading-6 text-slate-600">
                      {stage.description}
                    </p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      <section className="px-5 pb-20 sm:px-8 lg:pb-28">
        <div className="about-cta about-reveal mx-auto max-w-[1200px]">
          <div className="about-cta-decoration">
            <Building2 size={140} strokeWidth={0.65} />
          </div>
          <div className="relative z-10 max-w-2xl">
            <span className="text-xs font-bold tracking-[0.2em] text-cyan-200">
              JELAJAHI SIMPB
            </span>
            <h2 className="mt-4 text-3xl font-black leading-tight tracking-tight text-white sm:text-4xl">
              Temukan dokumentasi proses bisnis yang kamu butuhkan.
            </h2>
            <p className="mt-4 leading-7 text-blue-100/85">
              Mulai dari katalog dokumen dan lanjutkan penelusuran melalui
              dashboard SIMPB.
            </p>
            <div className="mt-7 flex flex-wrap gap-3">
              <Link to="/#sop" className="about-primary-button">
                Lihat katalog
                <ArrowRight size={17} />
              </Link>
              <Link to="/dashboard" className="about-cta-link">
                Buka dashboard <ArrowUpRight size={16} />
              </Link>
            </div>
          </div>
        </div>
      </section>

      
    </main>
  );
}
