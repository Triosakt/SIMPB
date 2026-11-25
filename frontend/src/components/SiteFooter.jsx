import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import {
  ArrowUpRight,
  Globe,
  MapPin,
  FileText,
  Network,
  Workflow,
  ClipboardList,
  BookOpen,
  Info,
  Building2,
  Newspaper,
  Megaphone,
  BarChart3,
  ExternalLink,
  Home,
} from "lucide-react";

// ==========================================
// DATA KONTAK BAPETEN
// ==========================================

const CONTACT = {
  name: "Badan Pengawas Tenaga Nuklir",
  address: "Jl. Gajah Mada No. 8, Jakarta Pusat 10120, Indonesia",
  website: "https://www.bapeten.go.id/",
};

// ==========================================
// DATA NAVIGASI FOOTER DENGAN IKON
// ==========================================

const COLUMNS = [
  {
    title: "Dokumen",
    links: [
      {
        label: "Peta Proses",
        to: "/dokumen/peta",
        icon: Workflow,
      },
      {
        label: "Sub Proses",
        to: "/dokumen/sub",
        icon: Network,
      },
      {
        label: "Cross Functional Map",
        to: "/dokumen/cfm",
        icon: GitBranchIcon,
      },
      {
        label: "Standar Operasional Prosedur",
        to: "/dokumen/sop",
        icon: ClipboardList,
      },
      {
        label: "Standar Pelayanan",
        to: "/standar-pelayanan",
        icon: BookOpen,
      },
    ],
  },
  {
    title: "Informasi",
    links: [
      {
        label: "Tentang Kami",
        to: "/tentang",
        icon: Info,
      },
      {
        label: "Tugas Ortala",
        to: "/tentang/tugas-ortala",
        icon: Building2,
      },
      {
        label: "Berita",
        to: "/informasi/berita",
        icon: Newspaper,
      },
      {
        label: "Pengumuman",
        to: "/informasi/pengumuman",
        icon: Megaphone,
      },
      {
        label: "Statistik Publik",
        to: "/statistik-publik",
        icon: BarChart3,
      },
    ],
  },
  {
    title: "Tautan penting",
    links: [
      {
        label: "Website BAPETEN",
        href: CONTACT.website,
        icon: Globe,
      },
      {
        label: "Portal SIMPB",
        to: "/",
        icon: Home,
      },
    ],
  },
];

// Ikon Git Branch
function GitBranchIcon(props) {
  return <Network {...props} />;
}

// ==========================================
// DATA LOGO PROGRAM
// ==========================================

const PROGRAM_LOGOS = [
  {
    src: "/img/Logo_ahlak.png",
    alt: "Logo BerAKHLAK",
  },
  {
    src: "/img/melayani.png",
    alt: "Bangga Melayani Bangsa",
  },
  {
    src: "/img/bangga.webp",
    alt: "Bangga Buatan Indonesia",
  },
];

// ==========================================
// STYLE
// ==========================================

const focus =
  "rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300";

const linkClass = `
  group
  inline-flex
  items-center
  gap-2
  text-[12px]
  text-slate-200/80
  transition-colors
  hover:text-cyan-300
  ${focus}
`;

// ==========================================
// KOMPONEN LINK FOOTER
// ==========================================

function FooterLink({ item }) {
  const Icon = item.icon;

  const content = (
    <>
      {Icon && (
        <Icon
          size={13}
          strokeWidth={1.8}
          aria-hidden="true"
          className="shrink-0 text-cyan-300/80 transition-colors group-hover:text-cyan-300"
        />
      )}

      <span>{item.label}</span>

      {item.href && (
        <ExternalLink
          size={10}
          aria-hidden="true"
          className="shrink-0 opacity-50"
        />
      )}
    </>
  );

  return item.href ? (
    <a
      href={item.href}
      target="_blank"
      rel="noopener noreferrer"
      className={linkClass}
    >
      {content}
    </a>
  ) : (
    <Link to={item.to} className={linkClass}>
      {content}
    </Link>
  );
}

// ==========================================
// KOMPONEN ALAMAT
// ==========================================

function ContactRow({ icon: Icon, children }) {
  return (
    <li className="flex items-start gap-2">
      <Icon
        size={14}
        aria-hidden="true"
        className="mt-[2px] shrink-0 text-cyan-300"
      />
      <span>{children}</span>
    </li>
  );
}

// ==========================================
// KOMPONEN TIGA LOGO PROGRAM
// ==========================================

function FooterLogos() {
  const logos = [
    {
      src: "/img/Logo_ahlak.png",
      alt: "Logo BerAKHLAK",
    },
    {
      src: "/img/melayani.png",
      alt: "Bangga Melayani Bangsa",
    },
    {
      src: "/img/bangga.webp",
      alt: "Bangga Buatan Indonesia",
    },
  ];

  return (
    <div className="mt-4 w-full max-w-[370px]">

      <style>{`
        @keyframes footerMarquee {
          from {
            transform: translateX(0);
          }
          to {
            transform: translateX(-50%);
          }
        }

        .footer-marquee-track {
          display: flex;
          width: max-content;
          animation: footerMarquee 16s linear infinite;
        }

        .footer-marquee:hover .footer-marquee-track {
          animation-play-state: paused;
        }

        @media (prefers-reduced-motion: reduce) {
          .footer-marquee-track {
            animation: none;
            transform: none;
          }
        }
      `}</style>

      {/* SHAPE PUTIH */}
      <div className="
        footer-marquee
        relative
        w-full
        overflow-hidden
        rounded-xl
        border border-white/60
        bg-white
        px-0
        py-2.5
        shadow-md
      ">

        {/* EFEK GRADASI SISI */}
        <div className="
          pointer-events-none
          absolute inset-y-0 left-0
          z-10 w-5
          bg-gradient-to-r
          from-white to-transparent
        " />

        <div className="
          pointer-events-none
          absolute inset-y-0 right-0
          z-10 w-5
          bg-gradient-to-l
          from-white to-transparent
        " />

        {/* ANIMASI LOGO */}
        <div className="footer-marquee-track">

          {/* LOGO PERTAMA */}
          <div className="flex shrink-0 items-center">
            {logos.map((logo) => (
              <div
                key={`first-${logo.src}`}
                className="
                  flex h-10 w-[115px]
                  shrink-0 items-center justify-center
                  border-r border-slate-200
                  px-3
                "
              >
                <img
                  src={logo.src}
                  alt={logo.alt}
                  loading="lazy"
                  className="
                    h-9 w-full
                    object-contain
                    transition-transform
                    duration-300
                    hover:scale-110
                  "
                />
              </div>
            ))}
          </div>

          {/* DUPLIKASI UNTUK LOOP MULUS */}
          <div
            className="flex shrink-0 items-center"
            aria-hidden="true"
          >
            {logos.map((logo) => (
              <div
                key={`second-${logo.src}`}
                className="
                  flex h-10 w-[115px]
                  shrink-0 items-center justify-center
                  border-r border-slate-200
                  px-3
                "
              >
                <img
                  src={logo.src}
                  alt=""
                  loading="lazy"
                  className="
                    h-9 w-full
                    object-contain
                    transition-transform
                    duration-300
                    hover:scale-110
                  "
                />
              </div>
            ))}
          </div>

        </div>
      </div>
    </div>
  );
}

// ==========================================
// MAIN FOOTER
// ==========================================

export default function SiteFooter() {
  const year = new Date().getFullYear();

  return (
    <footer className="
      mt-8
      border-t-2 border-cyan-300
      bg-[#123b63]
      text-white
    ">
      <div className="mx-auto max-w-[1100px] px-5 sm:px-6">

        {/* BAGIAN ATAS FOOTER */}
        <div className="
          grid gap-6 py-6
          md:grid-cols-[1.2fr_2fr]
          md:gap-8
        ">

          {/* IDENTITAS DAN ALAMAT */}
          <div>
            <div className="flex items-center gap-3">
              <img
                src="/img/logo.png"
                alt="Logo BAPETEN"
                className="
                  h-10 w-10 shrink-0
                  rounded-full bg-white p-1
                  object-contain
                "
              />

              <div className="leading-tight">
                <p className="text-sm font-bold">
                  {CONTACT.name}
                </p>

                <p className="mt-0.5 text-[11px] text-slate-300/80">
                  SIMPB · Sistem Informasi Manajemen Proses Bisnis
                </p>
              </div>
            </div>

            {/* ALAMAT DAN WEBSITE */}
            <address className="mt-3 not-italic">
              <ul className="
                space-y-1.5
                text-[12px]
                leading-snug
                text-slate-200/80
              ">
                <ContactRow icon={MapPin}>
                  {CONTACT.address}
                </ContactRow>

                <ContactRow icon={Globe}>
                  <a
                    href={CONTACT.website}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="transition-colors hover:text-cyan-300"
                  >
                    Website resmi BAPETEN
                  </a>
                </ContactRow>
              </ul>
            </address>

            {/* TIGA LOGO PROGRAM */}
            <FooterLogos />
          </div>

          {/* KOLOM NAVIGASI */}
          <nav
            aria-label="Navigasi footer"
            className="
              grid grid-cols-2
              content-start
              gap-x-5 gap-y-4
              sm:grid-cols-3
            "
          >
            {COLUMNS.map((col, i) => (
              <div
                key={col.title}
                className={
                  i === COLUMNS.length - 1
                    ? "col-span-2 sm:col-span-1"
                    : ""
                }
              >
                <h3 className="
                  mb-2.5
                  text-[13px]
                  font-semibold
                  text-white
                ">
                  {col.title}
                </h3>

                <ul className="space-y-2">
                  {col.links.map((item) => (
                    <li key={item.label}>
                      <FooterLink item={item} />
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </nav>
        </div>

        {/* COPYRIGHT */}
        <div className="
          flex flex-col items-center gap-2
          border-t border-white/15
          py-3
          sm:flex-row sm:justify-between
        ">
          <p className="
            text-center text-[11px]
            text-slate-300/70
            sm:text-left
          ">
            © {year} SIMPB BAPETEN. Seluruh hak cipta dilindungi.
          </p>

          <Link
            to="/tentang"
            className="
              inline-flex items-center gap-1
              text-xs font-semibold
              text-cyan-300
              transition-colors
              hover:text-white
              focus-visible:outline-none
              focus-visible:ring-2
              focus-visible:ring-cyan-300
            "
          >
            Tentang SIMPB
            <ArrowUpRight size={13} aria-hidden="true" />
          </Link>
        </div>

      </div>
    </footer>
  );
}