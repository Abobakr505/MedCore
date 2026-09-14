import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import {
  Compass,
  ArrowRight,
  Home,
  Stethoscope,
  Plus,
} from "lucide-react";
import { Button } from "@/components/ui/Button";

export default function NotFoundPage() {
  return (
    <main className="relative flex min-h-[calc(100vh-80px)] items-center justify-center overflow-hidden bg-slate-50 px-6 py-16">
      {/* Background decorations */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -right-32 -top-32 h-96 w-96 rounded-full bg-brand-100/50 blur-3xl" />
        <div className="absolute -bottom-40 -left-40 h-[28rem] w-[28rem] rounded-full bg-cyan-100/40 blur-3xl" />

        <div className="absolute right-[12%] top-[18%] h-3 w-3 rounded-full bg-brand-300" />
        <div className="absolute bottom-[20%] left-[15%] h-2 w-2 rounded-full bg-cyan-400" />
        <div className="absolute left-[25%] top-[25%] h-2 w-2 rounded-full bg-brand-200" />

        {/* Medical plus symbols */}
        <Plus className="absolute right-[20%] top-[30%] h-8 w-8 rotate-12 text-brand-100" />
        <Plus className="absolute bottom-[25%] left-[20%] h-10 w-10 -rotate-12 text-cyan-100" />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: "easeOut" }}
        className="relative z-10 mx-auto flex w-full max-w-2xl flex-col items-center text-center"
      >
        {/* Icon */}
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: 0.15, duration: 0.5 }}
          className="relative mb-8"
        >
          <div className="absolute inset-0 rounded-[2rem] bg-brand-400/20 blur-2xl" />

          <div className="relative flex h-24 w-24 items-center justify-center rounded-[2rem] border border-brand-100 bg-white shadow-xl shadow-brand-900/5">
            <Compass className="h-11 w-11 text-brand-500" />

            <div className="absolute -right-2 -top-2 flex h-9 w-9 items-center justify-center rounded-full border-4 border-slate-50 bg-brand-500 text-white shadow-lg">
              <Stethoscope className="h-4 w-4" />
            </div>
          </div>
        </motion.div>

        {/* 404 */}
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.25, duration: 0.5 }}
          className="relative"
        >
          <h1 className=" text-[clamp(7rem,20vw,12rem)] font-black  text-brand-500">
            404
          </h1>

          <div className="absolute inset-x-0 bottom-2 mx-auto h-4 w-2/3 rounded-full bg-brand-500/10 blur-xl" />
        </motion.div>

        {/* Content */}
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4, duration: 0.5 }}
          className="mt-2"
        >
          <h2 className="text-2xl font-extrabold tracking-tight text-slate-900 sm:text-3xl">
            الصفحة غير موجودة
          </h2>

          <p className="mx-auto mt-3 max-w-md text-sm leading-7 text-slate-500 sm:text-base">
            يبدو أن الصفحة التي تبحث عنها غير موجودة أو ربما تم نقلها إلى
            مكان آخر.
          </p>
        </motion.div>

        {/* Actions */}
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5, duration: 0.5 }}
          className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row"
        >
          <Link to="/">
            <Button className="group min-w-[190px] gap-2 shadow-lg shadow-brand-500/20">
              <Home className="h-4 w-4" />
              الصفحة الرئيسية
              <ArrowRight className="h-4 w-4 transition-transform duration-300 group-hover:-translate-x-1" />
            </Button>
          </Link>

          <button
            type="button"
            onClick={() => window.history.back()}
            className="inline-flex h-10 items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white px-5 text-sm font-semibold text-slate-700 shadow-sm transition-all duration-300 hover:border-brand-200 hover:bg-brand-50 hover:text-brand-600"
          >
            <ArrowRight className="h-4 w-4" />
            العودة للصفحة السابقة
          </button>
        </motion.div>

        {/* Brand */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.7, duration: 0.5 }}
          className="mt-12 flex items-center gap-2 text-xs font-medium text-slate-400"
        >
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-brand-50 text-brand-500">
            <Stethoscope className="h-3.5 w-3.5" />
          </div>

          <span>
            Med <span className="text-brand-500">Core</span>
          </span>

          <span className="mx-1 h-1 w-1 rounded-full bg-slate-300" />

          <span>منصة التعليم الطبي</span>
        </motion.div>
      </motion.div>
    </main>
  );
}
