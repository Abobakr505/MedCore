import { Link } from "react-router-dom";
import {
  Stethoscope,
  Mail,
  Phone,
  MapPin,
  ArrowLeft,
  ShieldCheck,
  HeartPulse,
  GraduationCap,
  Sparkles,
  ChevronLeft,
} from "lucide-react";

const quickLinks = [
  { to: "/courses", label: "الكورسات" },
  { to: "/colleges", label: "الكليات" },
  { to: "/about", label: "عن المنصة" },
  { to: "/contact", label: "تواصل معنا" },
];

const collegeLinks = [
  { to: "/courses?college=medicine", label: "طب بشري" },
  { to: "/courses?college=dentistry", label: "طب أسنان" },
  { to: "/courses?college=pharmacy", label: "صيدلة" },
];

export function Footer() {
  return (
    <footer className="relative overflow-hidden bg-slate-950 text-white">
      {/* Background glow */}

      <div className="pointer-events-none absolute -right-40 top-0 h-96 w-96 rounded-full bg-brand-500/10 blur-3xl" />

      <div className="pointer-events-none absolute -left-40 bottom-0 h-96 w-96 rounded-full bg-cyan-500/10 blur-3xl" />

      <div
        className="pointer-events-none absolute inset-0 opacity-[0.025]"
        style={{
          backgroundImage:
            "linear-gradient(#ffffff 1px, transparent 1px), linear-gradient(90deg, #ffffff 1px, transparent 1px)",
          backgroundSize: "42px 42px",
        }}
      />

      <div className="relative mx-auto max-w-7xl px-5 sm:px-6 pt-6">
        {/* ================= TOP CTA ================= */}



        {/* ================= MAIN FOOTER ================= */}

        <div className="grid gap-12 pb-14 pt-4 sm:grid-cols-2 lg:grid-cols-[1.4fr_1fr_1fr_1.1fr]">
          {/* Brand */}

          <div>
            <Link
              to="/"
              className="group inline-flex items-center gap-3"
            >
              <div className="grid h-12 w-12 place-items-center rounded-2xl bg-brand-500 text-white shadow-lg shadow-brand-900/20 transition-transform group-hover:scale-105">
                < img src="/logo.png" alt="logo image 404" className="relative h-12 w-12 object-cover" />
              </div>

              <div>
                <span className="block text-xl font-black">
                  Med <span className="text-brand-400">Core</span>
                </span>

                <span className="mt-1 block text-[9px] font-bold tracking-[0.18em] text-slate-500">
                  MEDICAL LEARNING PLATFORM
                </span>
              </div>
            </Link>

            <p className="mt-6 max-w-sm text-sm leading-8 text-slate-400">
              منصة تعليمية طبية حديثة تساعد طلاب الطب وطب الأسنان والصيدلة على
              التعلم بطريقة منظمة، واضحة، وأكثر فعالية.
            </p>

            {/* Mini trust */}

            <div className="mt-6 flex flex-wrap gap-2">
              <TrustBadge
                icon={ShieldCheck}
                text="محتوى آمن"
              />

              <TrustBadge
                icon={GraduationCap}
                text="معلمون متخصصون"
              />
            </div>
          </div>

          {/* Quick Links */}

          <FooterColumn title="روابط سريعة">
            {quickLinks.map((link) => (
              <FooterLink
                key={link.to}
                to={link.to}
                label={link.label}
              />
            ))}
          </FooterColumn>

          {/* Colleges */}

          <FooterColumn title="التخصصات">
            {collegeLinks.map((link) => (
              <FooterLink
                key={link.to}
                to={link.to}
                label={link.label}
              />
            ))}
          </FooterColumn>

          {/* Contact */}

          <div>
            <h4 className="text-sm font-black text-white">
              تواصل معنا
            </h4>

            <div className="mt-5 space-y-4">
              <ContactItem
                icon={Mail}
                label="البريد الإلكتروني"
                value="support@medcore.app"
              />

              <ContactItem
                icon={Phone}
                label="الهاتف"
                value="+966 xxx xxx xxx"
              />

              <ContactItem
                icon={MapPin}
                label="الموقع"
                value="  سوهاج ، مصر "
              />
            </div>
          </div>
        </div>

        {/* ================= BOTTOM ================= */}

<div className="flex flex-col gap-5 border-t border-white/10 py-6 text-xs sm:flex-row sm:items-center sm:justify-between">
  <p className="text-slate-500">
    © {new Date().getFullYear()} Med Core. جميع الحقوق محفوظة.
  </p>

  <div className="flex flex-wrap items-center gap-5 text-slate-500">
    <Link to="/about" className="transition-colors hover:text-white">
      عن المنصة
    </Link>

    <Link to="/contact" className="transition-colors hover:text-white">
      الدعم
    </Link>

    <span className="flex items-center gap-1.5 text-slate-600">
      صُنع بـ
      <HeartPulse className="h-3.5 w-3.5 text-brand-500" />
      للتعليم الطبي
    </span>
  </div>
            
            <a
    href="https://bakrhasan.vercel.app/"
    target="_blank"
    rel="noopener noreferrer"
    className="group inline-flex items-center gap-2 rounded-full border border-white/10 bg-gradient-to-r from-brand-500/10 to-cyan-500/10 px-4 py-2 text-[11px] font-bold text-slate-400 transition-all hover:border-brand-400/30 hover:from-brand-500/20 hover:to-cyan-500/20 hover:text-white"
  >
    <Sparkles className="h-3.5 w-3.5 text-brand-400 transition-transform group-hover:rotate-12" />
    <span>
      تطوير <span className="text-brand-400">أبوبكر</span>
    </span>
  </a>
</div>
      </div>
    </footer>
  );
}

/* =========================================================
   Footer Components
========================================================= */

function FooterColumn({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <h4 className="text-sm font-black text-white">
        {title}
      </h4>

      <div className="mt-5 space-y-1">
        {children}
      </div>
    </div>
  );
}

function FooterLink({
  to,
  label,
}: {
  to: string;
  label: string;
}) {
  return (
    <Link
      to={to}
      className="group flex items-center justify-between rounded-xl py-2 text-sm text-slate-400 transition-all hover:bg-white/[0.03] hover:px-3 hover:text-white"
    >
      <span>{label}</span>

      <ChevronLeft className="h-3.5 w-3.5 opacity-0 transition-all group-hover:-translate-x-1 group-hover:opacity-100" />
    </Link>
  );
}

function TrustBadge({
  icon: Icon,
  text,
}: {
  icon: typeof ShieldCheck;
  text: string;
}) {
  return (
    <div className="inline-flex items-center gap-2 rounded-xl border border-white/5 bg-white/[0.03] px-3 py-2 text-[10px] font-bold text-slate-400">
      <Icon className="h-3.5 w-3.5 text-brand-400" />
      {text}
    </div>
  );
}

function ContactItem({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof Mail;
  label: string;
  value: string;
}) {
  return (
    <div className="group flex items-start gap-3">
      <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-white/[0.04] text-slate-400 transition-colors group-hover:bg-brand-500/10 group-hover:text-brand-400">
        <Icon className="h-4 w-4" />
      </div>

      <div>
        <p className="text-[10px] font-bold text-slate-600">
          {label}
        </p>

        <p className="mt-1 text-xs font-semibold text-slate-400 transition-colors group-hover:text-slate-300">
          {value}
        </p>
      </div>
    </div>
  );
}
