import { motion } from "framer-motion";
import {
  ShieldCheck,
  Target,
  Users,
  ArrowLeft,
  Sparkles,
  BookOpen,
  BrainCircuit,
  CheckCircle2,
  HeartPulse,
  GraduationCap,
  Stethoscope,
} from "lucide-react";
import { Link } from "react-router-dom";

const pillars = [
  {
    icon: Target,
    title: "رسالتنا",
    desc: "تبسيط الوصول إلى محتوى طبي عالي الجودة بطرق تعليمية مرنة ومريحة تساعدك على التعلم بثقة.",
  },
  {
    icon: ShieldCheck,
    title: "قيمنا",
    desc: "الدقة العلمية، الأمان، والشفافية في كل خطوة داخل المنصة، لأن جودة التعليم الطبي مسؤولية.",
  },
  {
    icon: Users,
    title: "مجتمعنا",
    desc: "نبني مجتمعًا يجمع الطلاب والمعلمين في بيئة تعليمية تساعد الجميع على التطور المستمر.",
  },
];

const stats = [
  { icon: BookOpen, value: "+300", label: "كورس متاح" },
  { icon: BrainCircuit, value: "+2,000", label: "ساعة تعليمية" },
  { icon: Sparkles, value: "4.8/5", label: "تقييم الطلاب" },
];

const benefits = [
  "محتوى طبي منظم وسهل الوصول",
  "تجربة تعليمية مصممة للطلاب",
  "متابعة واضحة لمستوى التقدم",
  "أدوات تساعد المعلمين على إدارة المحتوى",
];

const containerVariants = {
  hidden: {},
  visible: {
    transition: {
      staggerChildren: 0.1,
    },
  },
};

const itemVariants = {
  hidden: {
    opacity: 0,
    y: 30,
  },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.6,
      ease: [0.22, 1, 0.36, 1],
    },
  },
};

export default function AboutPage() {
  return (
    <div className="relative min-h-screen overflow-hidden bg-gradient-to-b from-brand-50 via-white to-white pb-20">
      {/* Decorative background */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <motion.div
          animate={{
            x: [0, 30, 0],
            y: [0, -20, 0],
          }}
          transition={{
            duration: 9,
            repeat: Infinity,
            ease: "easeInOut",
          }}
          className="absolute -right-32 top-20 h-72 w-72 rounded-full bg-brand-300/20 blur-3xl"
        />

        <motion.div
          animate={{
            x: [0, -30, 0],
            y: [0, 20, 0],
          }}
          transition={{
            duration: 10,
            repeat: Infinity,
            ease: "easeInOut",
          }}
          className="absolute -left-32 top-[35%] h-80 w-80 rounded-full bg-cyan-300/10 blur-3xl"
        />

        <div
          className="absolute inset-0 opacity-[0.025]"
          style={{
            backgroundImage:
              "linear-gradient(to right, currentColor 1px, transparent 1px), linear-gradient(to bottom, currentColor 1px, transparent 1px)",
            backgroundSize: "48px 48px",
          }}
        />
      </div>

      <div className="relative mx-auto max-w-6xl px-5 py-14 sm:px-6 sm:py-20">
        {/* Hero */}
        <motion.section
          initial="hidden"
          animate="visible"
          variants={containerVariants}
          className="text-center"
        >
          <motion.div variants={itemVariants}>
            <span className="inline-flex items-center gap-2 rounded-full border border-brand-200 bg-white/80 px-4 py-2 text-xs font-bold text-brand-700 shadow-sm backdrop-blur">
              <HeartPulse className="h-4 w-4" />
              عن Med Core
            </span>
          </motion.div>

          <motion.h1
            variants={itemVariants}
            className="mx-auto mt-6 max-w-4xl text-4xl font-black leading-tight tracking-tight text-brand-900 sm:text-5xl lg:text-6xl"
          >
            التعليم الطبي
            <span className="block bg-gradient-to-l from-brand-500 to-cyan-500 bg-clip-text text-transparent">
              بطريقة أذكى وأبسط
            </span>
          </motion.h1>

          <motion.p
            variants={itemVariants}
            className="mx-auto mt-6 max-w-3xl text-base leading-8 text-slate-600 sm:text-lg"
          >
            Med Core منصة عربية متخصصة في التعليم الطبي، تجمع بين جودة المحتوى
            العلمي، تجربة التعلم المرنة، ومتابعة دقيقة لتقدم الطالب في كل مرحلة
            من رحلته الأكاديمية.
          </motion.p>

          <motion.div
            variants={itemVariants}
            className="mt-8 flex flex-col justify-center gap-3 sm:flex-row"
          >
            <Link
              to="/courses"
              className="group inline-flex items-center justify-center gap-2 rounded-2xl bg-brand-600 px-6 py-3.5 text-sm font-bold text-white shadow-lg shadow-brand-600/20 transition hover:-translate-y-0.5 hover:bg-brand-700"
            >
              اكتشف الكورسات
              <ArrowLeft className="h-4 w-4 transition-transform group-hover:-translate-x-1" />
            </Link>

            <Link
              to="/contact"
              className="inline-flex items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-6 py-3.5 text-sm font-bold text-slate-700 shadow-sm transition hover:-translate-y-0.5 hover:border-brand-200 hover:text-brand-600"
            >
              تواصل معنا
            </Link>
          </motion.div>
        </motion.section>

        {/* Intro visual */}
        <motion.div
          initial={{ opacity: 0, scale: 0.96, y: 25 }}
          whileInView={{ opacity: 1, scale: 1, y: 0 }}
          viewport={{ once: true, amount: 0.2 }}
          transition={{ duration: 0.7 }}
          className="relative mx-auto mt-16 max-w-5xl"
        >
          <div className="relative overflow-hidden rounded-[32px] border border-white/80 bg-gradient-to-br from-brand-900 via-brand-800 to-slate-950 p-7 shadow-2xl shadow-brand-900/20 sm:p-10">
            <div className="absolute -right-20 -top-20 h-56 w-56 rounded-full bg-brand-400/20 blur-3xl" />
            <div className="absolute -bottom-20 -left-20 h-56 w-56 rounded-full bg-cyan-400/10 blur-3xl" />

            <div className="relative grid items-center gap-8 md:grid-cols-[1fr_auto]">
              <div>
                <div className="mb-4 inline-flex rounded-2xl bg-white/10 p-3 text-brand-200">
                  <Stethoscope className="h-7 w-7" />
                </div>

                <h2 className="text-2xl font-black text-white sm:text-3xl">
                  نبني تجربة تعليمية تستحق ثقتك
                </h2>

                <p className="mt-3 max-w-2xl text-sm leading-7 text-white/65 sm:text-base">
                  هدفنا ليس فقط توفير الكورسات، بل بناء بيئة متكاملة تساعد
                  الطالب على التعلم، المتابعة، والتطور خطوة بخطوة.
                </p>
              </div>

              <div className="grid h-24 w-24 shrink-0 place-items-center rounded-[28px] border border-white/10 bg-white/10 shadow-inner backdrop-blur">
                <GraduationCap className="h-11 w-11 text-brand-200" />
              </div>
            </div>
          </div>
        </motion.div>

        {/* Pillars */}
        <motion.section
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.15 }}
          variants={containerVariants}
          className="mt-20"
        >
          <div className="mb-8">
            <p className="text-sm font-bold text-brand-600">ما الذي نؤمن به؟</p>
            <h2 className="mt-2 text-3xl font-black text-slate-900">
              مبادئ تقود كل ما نقوم به
            </h2>
          </div>

          <div className="grid gap-5 md:grid-cols-3">
            {pillars.map((item) => {
              const Icon = item.icon;

              return (
                <motion.div
                  key={item.title}
                  variants={itemVariants}
                  whileHover={{ y: -8 }}
                  className="group relative overflow-hidden rounded-[28px] border border-slate-100 bg-white p-7 shadow-sm shadow-slate-200/60 transition-shadow hover:shadow-xl hover:shadow-brand-900/10"
                >
                  <div className="absolute -right-10 -top-10 h-28 w-28 rounded-full bg-brand-50 opacity-0 blur-2xl transition-opacity duration-500 group-hover:opacity-100" />

                  <div className="relative">
                    <div className="grid h-14 w-14 place-items-center rounded-2xl bg-brand-50 text-brand-600 transition-all duration-300 group-hover:scale-110 group-hover:bg-brand-600 group-hover:text-white">
                      <Icon className="h-7 w-7" />
                    </div>

                    <h3 className="mt-6 text-xl font-black text-slate-800">
                      {item.title}
                    </h3>

                    <p className="mt-3 text-sm leading-7 text-slate-500">
                      {item.desc}
                    </p>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </motion.section>

        {/* Stats */}
        <motion.section
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.2 }}
          transition={{ duration: 0.7 }}
          className="relative mt-16 overflow-hidden rounded-[32px] bg-brand-900 p-6 shadow-2xl shadow-brand-900/20 sm:p-10"
        >
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.1),transparent_35%)]" />

          <div className="relative grid gap-4 sm:grid-cols-3">
            {stats.map((stat, index) => {
              const Icon = stat.icon;

              return (
                <motion.div
                  key={stat.label}
                  initial={{ opacity: 0, scale: 0.9 }}
                  whileInView={{ opacity: 1, scale: 1 }}
                  viewport={{ once: true }}
                  transition={{ delay: index * 0.1 }}
                  className="rounded-[24px] border border-white/10 bg-white/[0.06] p-6 text-center backdrop-blur"
                >
                  <div className="mx-auto grid h-12 w-12 place-items-center rounded-2xl bg-white/10 text-brand-200">
                    <Icon className="h-6 w-6" />
                  </div>

                  <p className="mt-4 text-3xl font-black text-white">
                    {stat.value}
                  </p>

                  <p className="mt-1 text-sm text-white/60">
                    {stat.label}
                  </p>
                </motion.div>
              );
            })}
          </div>
        </motion.section>

        {/* Why us */}
        <motion.section
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.15 }}
          transition={{ duration: 0.7 }}
          className="mt-16 overflow-hidden rounded-[32px] border border-slate-100 bg-white shadow-sm"
        >
          <div className="grid lg:grid-cols-[0.9fr_1.1fr]">
            <div className="relative overflow-hidden bg-gradient-to-br from-brand-700 to-brand-900 p-8 text-white sm:p-10">
              <div className="absolute -left-20 -top-20 h-56 w-56 rounded-full bg-brand-400/20 blur-3xl" />

              <div className="relative">
                <div className="grid h-14 w-14 place-items-center rounded-2xl bg-white/10">
                  <Sparkles className="h-7 w-7 text-brand-200" />
                </div>

                <p className="mt-7 text-sm font-bold text-brand-200">
                  لماذا Med Core؟
                </p>

                <h2 className="mt-2 text-3xl font-black leading-tight">
                  أكثر من مجرد منصة كورسات
                </h2>

                <p className="mt-4 text-sm leading-7 text-white/65">
                  نصمم كل جزء من التجربة ليكون واضحًا، سريعًا، ومفيدًا سواء
                  كنت طالبًا تبحث عن تطوير مستواك أو معلمًا يريد تقديم محتوى
                  احترافي.
                </p>
              </div>
            </div>

            <div className="p-7 sm:p-10">
              <div className="grid gap-4 sm:grid-cols-2">
                {benefits.map((benefit, index) => (
                  <motion.div
                    key={benefit}
                    initial={{ opacity: 0, x: 15 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: index * 0.08 }}
                    className="rounded-2xl border border-slate-100 bg-slate-50 p-5"
                  >
                    <CheckCircle2 className="h-5 w-5 text-brand-600" />
                    <p className="mt-3 text-sm font-bold leading-6 text-slate-700">
                      {benefit}
                    </p>
                  </motion.div>
                ))}
              </div>

              <div className="mt-7 grid gap-4 sm:grid-cols-2">
                <div className="rounded-2xl bg-brand-50 p-6">
                  <BookOpen className="h-6 w-6 text-brand-600" />
                  <h3 className="mt-4 font-black text-slate-800">للطالب</h3>
                  <p className="mt-2 text-sm leading-6 text-slate-600">
                    مسار تعلم منظم، متابعة واضحة، واكتساب المعرفة في أي وقت.
                  </p>
                </div>

                <div className="rounded-2xl bg-slate-50 p-6">
                  <Users className="h-6 w-6 text-brand-600" />
                  <h3 className="mt-4 font-black text-slate-800">للمعلم</h3>
                  <p className="mt-2 text-sm leading-6 text-slate-600">
                    أدوات تساعدك على تقديم وإدارة محتواك بشكل احترافي.
                  </p>
                </div>
              </div>

              <div className="mt-8">
                <Link
                  to="/contact"
                  className="group inline-flex items-center gap-2 text-sm font-black text-brand-600"
                >
                  تواصل معنا
                  <ArrowLeft className="h-4 w-4 transition-transform group-hover:-translate-x-1" />
                </Link>
              </div>
            </div>
          </div>
        </motion.section>
      </div>
    </div>
  );
}