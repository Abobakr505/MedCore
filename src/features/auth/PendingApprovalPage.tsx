import { motion, useReducedMotion } from "framer-motion";
import { Link } from "react-router-dom";
import { Mail, Paperclip } from "lucide-react";

export default function PendingApprovalPage() {
  return (
    <main
      dir="rtl"
      className="relative flex min-h-screen items-center justify-center px-4 py-10"
      style={{
        background: "linear-gradient(160deg, #EAF3FF 0%, #DCEEFF 45%, #EFF7FF 100%)",
        backgroundImage:
          "radial-gradient(rgba(29,78,216,0.06) 1px, transparent 1px), linear-gradient(160deg, #EAF3FF 0%, #DCEEFF 45%, #EFF7FF 100%)",
        backgroundSize: "16px 16px, cover",
      }}
    >
      {/* For production, move this @import into your global stylesheet or <head> instead of loading it per-page */}
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Reem+Kufi:wght@400..700&family=IBM+Plex+Sans+Arabic:wght@400;500;600;700&display=swap');
        .font-body { font-family: 'IBM Plex Sans Arabic', sans-serif; }
        .font-stamp { font-family: 'Reem Kufi', sans-serif; }
      `}</style>

      <div className="w-full max-w-sm">
        {/* Folder tab */}
        <div
          className="mr-7 flex h-8 w-28 items-end rounded-t-md pb-1 pr-3"
          style={{ background: "linear-gradient(90deg, #1D4ED8, #0EA5E9)" }}
        >
          <span className="font-body text-[11px] font-semibold tracking-wide text-white">
            Med Core
          </span>
        </div>

        {/* Case-file card */}
        <div className="relative border border-[#BFDBFE] bg-white/80 px-6 pb-8 pt-10 shadow-[5px_5px_0_0_rgba(29,78,216,0.08)] backdrop-blur-sm sm:px-8">
          <StampGraphic />

          <h1 className="font-body mt-6 text-center text-xl font-bold text-[#0F2A55]">
            تم استلام طلبك
          </h1>

          <p className="font-body mt-3 text-center text-[13.5px] leading-7 text-[#4A6285]">
            فريق الإدارة يراجع الآن بيانات حسابك كمعلم. سيتم تفعيل
            الحساب تلقائيًا فور الموافقة، وستتمكن من تسجيل الدخول
            بعدها مباشرة.
          </p>

          {/* Attached note, styled like a paperclipped memo */}
          <div className="relative mt-6 -rotate-1 border border-dashed border-[#BFDBFE] bg-[#EFF6FF] px-4 py-3">
            <Paperclip className="absolute -top-3 right-4 h-5 w-5 rotate-45 text-[#3B82F6]" />
            <p className="font-body text-[12px] leading-6 text-[#3F5D8A]">
              هذه المراجعة تضمن صحة بيانات المعلمين، وتحافظ على جودة
              المحتوى داخل المنصة.
            </p>
          </div>

          <Link
            to="/auth/login"
            className="font-body mt-7 flex h-12 w-full items-center justify-center rounded-md text-sm font-semibold text-white transition-[filter] hover:brightness-110 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1D4ED8]"
            style={{ background: "linear-gradient(90deg, #1D4ED8, #0EA5E9)" }}
          >
            الرجوع لتسجيل الدخول
          </Link>
        </div>

        <div className="font-body mt-4 flex items-center justify-center gap-2 text-[11px] text-[#6B87B3]">
          <Mail className="h-3.5 w-3.5" />
          ibrahimrezk1552006@gmail.com
        </div>
      </div>
    </main>
  );
}

function StampGraphic() {
  const prefersReducedMotion = useReducedMotion();

  return (
    <motion.div
      initial={
        prefersReducedMotion
          ? { opacity: 1, scale: 1, rotate: -8 }
          : { scale: 2.4, opacity: 0, rotate: -16 }
      }
      animate={{ scale: 1, opacity: 1, rotate: -8 }}
      transition={{ duration: 0.35, ease: [0.34, 1.56, 0.64, 1] }}
      className="mx-auto flex h-24 w-24 items-center justify-center"
    >
      <svg viewBox="0 0 120 120" className="h-24 w-24" aria-hidden="true">
        <defs>
          <filter id="inkRough" x="-20%" y="-20%" width="140%" height="140%">
            <feTurbulence
              type="fractalNoise"
              baseFrequency="0.9"
              numOctaves="2"
              seed="7"
              result="noise"
            />
            <feDisplacementMap in="SourceGraphic" in2="noise" scale="3.5" />
          </filter>
        </defs>
        <g filter="url(#inkRough)">
          <circle cx="60" cy="60" r="50" fill="none" stroke="#B33A1F" strokeWidth="3" />
          <circle cx="60" cy="60" r="41" fill="none" stroke="#B33A1F" strokeWidth="1.5" />
          <text
            x="60"
            y="58"
            textAnchor="middle"
            fill="#B33A1F"
            fontSize="17"
            fontWeight="700"
            className="font-stamp"
          >
            قيد
          </text>
          <text
            x="60"
            y="80"
            textAnchor="middle"
            fill="#B33A1F"
            fontSize="17"
            fontWeight="700"
            className="font-stamp"
          >
            المراجعة
          </text>
        </g>
      </svg>
    </motion.div>
  );
}