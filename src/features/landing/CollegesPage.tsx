import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import {
  Stethoscope,
  Bone,
  Pill,
  ArrowLeft,
  GraduationCap,
  Sparkles,
  BookOpen,
} from "lucide-react";

const COLLEGES = [
  {
    icon: Stethoscope,
    title: "طب بشري",
    value: "medicine",
    desc: "برامج شاملة تغطي كل مراحل دراسة الطب البشري من العلوم الأساسية إلى التخصصات السريرية.",
    courses: 120,
    topics: ["التشريح", "الفسيولوجي", "الجراحة", "الباطنة"],
  },
  {
    icon: Bone,
    title: "طب أسنان",
    value: "dentistry",
    desc: "كورسات متخصصة في طب الأسنان الترميمي، الجراحي، والتقويمي.",
    courses: 65,
    topics: ["الترميمي", "التقويم", "جراحة الفم", "اللبية"],
  },
  {
    icon: Pill,
    title: "صيدلة",
    value: "pharmacy",
    desc: "من علم الأدوية إلى الكيمياء الصيدلانية والصيدلة السريرية.",
    courses: 80,
    topics: ["علم الأدوية", "الكيمياء الصيدلانية", "الصيدلة السريرية"],
  },
];

const containerVariants = {
  hidden: {},
  visible: {
    transition: {
      staggerChildren: 0.12,
    },
  },
};

const cardVariants = {
  hidden: {
    opacity: 0,
    y: 35,
  },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.65,
      ease: [0.22, 1, 0.36, 1],
    },
  },
};

export default function CollegesPage() {
  return (
    <div className="relative min-h-screen overflow-hidden bg-gradient-to-b from-brand-50 via-white to-white pb-20">
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <motion.div
          animate={{ y: [0, -20, 0], x: [0, 20, 0] }}
          transition={{ duration: 9, repeat: Infinity, ease: "easeInOut" }}
          className="absolute -right-32 top-20 h-72 w-72 rounded-full bg-brand-300/20 blur-3xl"
        />

        <motion.div
          animate={{ y: [0, 25, 0], x: [0, -20, 0] }}
          transition={{ duration: 10, repeat: Infinity, ease: "easeInOut" }}
          className="absolute -left-32 top-[45%] h-80 w-80 rounded-full bg-cyan-300/10 blur-3xl"
        />
      </div>

      <div className="relative mx-auto max-w-6xl px-5 py-14 sm:px-6 sm:py-20">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 25 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7 }}
          className="text-center"
        >
          <span className="inline-flex items-center gap-2 rounded-full border border-brand-200 bg-white px-4 py-2 text-xs font-bold text-brand-700 shadow-sm">
            <GraduationCap className="h-4 w-4" />
            الكليات المدعومة
          </span>

          <h1 className="mx-auto mt-6 max-w-4xl text-4xl font-black leading-tight text-brand-900 sm:text-5xl lg:text-6xl">
            اختر كليتك
            <span className="block bg-gradient-to-l from-brand-500 to-cyan-500 bg-clip-text text-transparent">
              وابدأ رحلتك
            </span>
          </h1>

          <p className="mx-auto mt-5 max-w-2xl text-base leading-8 text-slate-600 sm:text-lg">
            محتوى مصمم خصيصًا لكل كلية، بترتيب يواكب خطتك الدراسية من أول
            محاضرة إلى آخر امتحان.
          </p>
        </motion.div>

        {/* Cards */}
        <motion.div
          initial="hidden"
          animate="visible"
          variants={containerVariants}
          className="mt-14 grid gap-6 md:grid-cols-3"
        >
          {COLLEGES.map((college) => {
            const Icon = college.icon;

            return (
              <motion.div key={college.value} variants={cardVariants}>
                <Link
                  to={`/courses?college=${college.value}`}
                  className="group relative flex h-full flex-col overflow-hidden rounded-[30px] border border-slate-100 bg-white p-7 shadow-sm shadow-slate-200/60 transition-all duration-300 hover:-translate-y-2 hover:border-brand-200 hover:shadow-2xl hover:shadow-brand-900/10"
                >
                  <div className="absolute -right-16 -top-16 h-40 w-40 rounded-full bg-brand-50 opacity-0 blur-3xl transition-opacity duration-500 group-hover:opacity-100" />

                  <div className="relative flex items-center justify-between">
                    <div className="grid h-16 w-16 place-items-center rounded-2xl bg-brand-50 text-brand-600 transition-all duration-300 group-hover:scale-110 group-hover:bg-brand-600 group-hover:text-white">
                      <Icon className="h-8 w-8" />
                    </div>

                    <div className="text-left">
                      <p className="text-2xl font-black text-brand-900">
                        {college.courses}+
                      </p>
                      <p className="text-xs text-slate-400">كورس متاح</p>
                    </div>
                  </div>

                  <h3 className="relative mt-7 text-2xl font-black text-slate-800">
                    {college.title}
                  </h3>

                  <p className="relative mt-3 text-sm leading-7 text-slate-500">
                    {college.desc}
                  </p>

                  <div className="relative mt-6 flex flex-wrap gap-2">
                    {college.topics.map((topic) => (
                      <span
                        key={topic}
                        className="rounded-full border border-brand-100 bg-brand-50 px-3 py-1.5 text-xs font-bold text-brand-600"
                      >
                        {topic}
                      </span>
                    ))}
                  </div>

                  <div className="relative mt-auto pt-7">
                    <div className="flex items-center justify-between border-t border-slate-100 pt-5">
                      <span className="inline-flex items-center gap-2 text-sm font-black text-brand-600">
                        استعرض الكورسات
                        <ArrowLeft className="h-4 w-4 transition-transform group-hover:-translate-x-1" />
                      </span>

                      <div className="grid h-9 w-9 place-items-center rounded-full bg-slate-50 transition-colors group-hover:bg-brand-50">
                        <BookOpen className="h-4 w-4 text-slate-400 group-hover:text-brand-600" />
                      </div>
                    </div>
                  </div>
                </Link>
              </motion.div>
            );
          })}
        </motion.div>

        {/* Bottom CTA */}
        <motion.div
          initial={{ opacity: 0, y: 25 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.7 }}
          className="relative mt-14 overflow-hidden rounded-[30px] bg-brand-900 p-7 text-white shadow-xl shadow-brand-900/20 sm:p-10"
        >
          <div className="absolute -right-20 -top-20 h-52 w-52 rounded-full bg-brand-400/20 blur-3xl" />

          <div className="relative flex flex-col items-start justify-between gap-6 md:flex-row md:items-center">
            <div>
              <div className="inline-flex items-center gap-2 text-brand-200">
                <Sparkles className="h-4 w-4" />
                <span className="text-xs font-bold">ابدأ الآن</span>
              </div>

              <h2 className="mt-2 text-2xl font-black sm:text-3xl">
                مستعد تطور مستواك الطبي؟
              </h2>

              <p className="mt-2 text-sm text-white/60">
                اختار تخصصك وابدأ في استكشاف المحتوى المناسب لك.
              </p>
            </div>

            <Link
              to="/courses"
              className="inline-flex shrink-0 items-center gap-2 rounded-2xl bg-white px-6 py-3.5 text-sm font-black text-brand-800 transition hover:-translate-y-0.5 hover:bg-brand-50"
            >
              تصفح كل الكورسات
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </div>
        </motion.div>
      </div>
    </div>
  );
}