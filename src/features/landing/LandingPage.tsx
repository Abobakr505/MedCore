import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import {
  Stethoscope,
  Pill,
  ToothbrushSparkles,
  ArrowLeft,
  ShieldCheck,
  Video,
  Award,
  Users,
  Star,
  CheckCircle2,
  Quote,
  LayoutDashboard,
  GraduationCap,
  BookOpen,
  Sparkles,
  BrainCircuit,
  PlayCircle,
  Clock3,
  TrendingUp,
  BadgeCheck,
  ChevronLeft,
  Activity,
  HeartPulse,
  Microscope,
} from "lucide-react";

import { Button } from "@/components/ui/Button";
import { useAuth } from "@/contexts/AuthContext";
import { fetchStudentEnrollments } from "@/services/enrollments";
import { fetchTeacherCourses } from "@/services/teacherCourses";
import type { Course, Enrollment } from "@/types";
import { fetchCourses } from "@/services/courses";

/* =========================================================
   Animation System
========================================================= */

const fadeUp = {
  hidden: {
    opacity: 0,
    y: 30,
  },
  show: (i = 0) => ({
    opacity: 1,
    y: 0,
    transition: {
      delay: i * 0.08,
      duration: 0.65,
      ease: [0.22, 1, 0.36, 1],
    },
  }),
};

const fadeScale = {
  hidden: {
    opacity: 0,
    scale: 0.94,
  },
  show: {
    opacity: 1,
    scale: 1,
    transition: {
      duration: 0.7,
      ease: [0.22, 1, 0.36, 1],
    },
  },
};

const stagger = {
  hidden: {},
  show: {
    transition: {
      staggerChildren: 0.08,
    },
  },
};

/* =========================================================
   Constants
========================================================= */

const COLLEGE_LABELS: Record<string, string> = {
  medicine: "طب بشري",
  dentistry: "طب أسنان",
  pharmacy: "صيدلة",
};

const ROLE_STYLES = {
  guest: {
    badge: "bg-white/80 text-slate-700 ring-slate-200",
    panel: "from-brand-600 via-brand-500 to-cyan-500",
    soft: "bg-brand-50 text-brand-700",
    accent: "text-brand-600",
    icon: Sparkles,
  },
  student: {
    badge: "bg-brand-50 text-brand-800 ring-brand-100",
    panel: "from-brand-600 via-brand-500 to-cyan-500",
    soft: "bg-brand-50 text-brand-700",
    accent: "text-brand-600",
    icon: BookOpen,
  },
  teacher: {
    badge: "bg-emerald-50 text-emerald-700 ring-emerald-200",
    panel: "from-emerald-600 via-teal-500 to-cyan-500",
    soft: "bg-emerald-50 text-emerald-700",
    accent: "text-emerald-600",
    icon: GraduationCap,
  },
  admin: {
    badge: "bg-slate-100 text-slate-700 ring-slate-200",
    panel: "from-slate-950 via-slate-800 to-slate-700",
    soft: "bg-slate-100 text-slate-700",
    accent: "text-slate-700",
    icon: LayoutDashboard,
  },
} as const;

/* =========================================================
   Main Page
========================================================= */

export default function LandingPage() {
  return (
    <main className="overflow-hidden bg-white text-slate-800">
      <HeroSection />
      <TrustBar />
      <CollegesSection />
      <AboutSection />
      <WhyMedCoreSection />
      <FeaturedCoursesSection />
      <HowItWorksSection />
      <TestimonialsSection />
      <ContactCta />
    </main>
  );
}

/* =========================================================
   Hero
========================================================= */

function HeroSection() {
  const { profile, session } = useAuth();

  const [studentCourses, setStudentCourses] = useState<Enrollment[]>([]);
  const [teacherCourses, setTeacherCourses] = useState<Course[]>([]);
  const [loadingProfileData, setLoadingProfileData] = useState(false);

  useEffect(() => {
    if (!session?.user || !profile) return;

    const loadRoleData = async () => {
      setLoadingProfileData(true);

      try {
        if (profile.role === "student") {
          const data = await fetchStudentEnrollments(session.user.id);
          setStudentCourses(data);
        }

        if (profile.role === "teacher") {
          const data = await fetchTeacherCourses(session.user.id);
          setTeacherCourses(data);
        }
      } finally {
        setLoadingProfileData(false);
      }
    };

    loadRoleData();
  }, [session?.user?.id, profile]);

  const firstName = profile?.full_name?.split(" ")[0] ?? "زائر";

  const collegeLabel = profile?.college
    ? COLLEGE_LABELS[profile.college]
    : "الطب";

  const isGuest = !profile;
  const role = profile?.role ?? "guest";

  const isStudent = role === "student";
  const isTeacher = role === "teacher";
  const isAdmin = role === "admin";

  const roleContent = useMemo(() => {
    if (isStudent) {
      return {
        badge: "طالب في Med Core",
        title: `أهلاً ${firstName}،\nنكمل رحلتك الطبية معًا`,
        description:
          "تابع كورساتك، راقب تقدمك، واكتشف محتوى جديد مصمم خصيصًا لتخصصك الطبي.",
        mainCta: {
          label: "كورساتي",
          to: "/app/student/courses",
        },
        secondaryCta: {
          label: "استكشف الكورسات",
          to: "/courses",
        },
        statLabel: "كورس مسجّل",
        statValue: studentCourses.length,
      };
    }

    if (isTeacher) {
      return {
        badge: "لوحة المعلم",
        title: `أهلاً ${firstName}،\nشارك خبرتك مع طلابك`,
        description:
          "أدر كورساتك، تابع طلابك، ونظّم محتواك التعليمي من مكان واحد.",
        mainCta: {
          label: "كورساتي",
          to: "/app/teacher/courses",
        },
        secondaryCta: {
          label: "إدارة المحتوى",
          to: "/app/teacher/courses",
        },
        statLabel: "كورس منشور",
        statValue: teacherCourses.length,
      };
    }

    if (isAdmin) {
      return {
        badge: "لوحة الإدارة",
        title: `أهلاً ${firstName}،\nكل شيء تحت سيطرتك`,
        description:
          "راقب الطلاب، المعلمين، الدورات والمدفوعات من لوحة تحكم موحدة وسريعة.",
        mainCta: {
          label: "لوحة التحكم",
          to: "/app/home",
        },
        secondaryCta: {
          label: "التقارير",
          to: "/app/admin/reports",
        },
        statLabel: "حالة المنصة",
        statValue: "مباشرة",
      };
    }

    return {
      badge: "منصة تعليمية طبية",
      title: "طوّر مستواك الطبي.\nوتعلّم بثقة أكبر.",
      description:
        "اكتشف كورسات متخصصة في الطب والطب الأسنان والصيدلة، مع محتوى منظم، متابعة واضحة، وتجربة تعليمية مصممة للطلاب العرب.",
      mainCta: {
        label: "ابدأ مجانًا",
        to: "/auth/register",
      },
      secondaryCta: {
        label: "استكشف المنصة",
        to: "/about",
      },
      statLabel: "طالب يثق بنا",
      statValue: "+5,000",
    };
  }, [
    firstName,
    isAdmin,
    isStudent,
    isTeacher,
    studentCourses.length,
    teacherCourses.length,
  ]);

  const roleStyle =
    ROLE_STYLES[role as keyof typeof ROLE_STYLES] ?? ROLE_STYLES.guest;

  const Icon = roleStyle.icon;

  return (
    <section className="relative isolate overflow-hidden bg-[#f7fbfa]">
      {/* Background */}
      <div className="absolute inset-0 -z-10">
        <div className="absolute -right-40 -top-40 h-[520px] w-[520px] rounded-full bg-brand-200/30 blur-3xl" />
        <div className="absolute -left-40 bottom-0 h-[500px] w-[500px] rounded-full bg-cyan-100/50 blur-3xl" />

        <div
          className="absolute inset-0 opacity-[0.035]"
          style={{
            backgroundImage:
              "linear-gradient(#0b7f69 1px, transparent 1px), linear-gradient(90deg, #0b7f69 1px, transparent 1px)",
            backgroundSize: "42px 42px",
          }}
        />
      </div>

      <div className="mx-auto grid max-w-7xl items-center gap-14 px-5 py-20 sm:px-6 md:py-28 lg:grid-cols-[1.05fr_.95fr] lg:gap-20">
        {/* Content */}
        <motion.div
          initial="hidden"
          animate="show"
          variants={stagger}
          className="relative z-10 text-center lg:text-right"
        >
          <motion.div variants={fadeUp}>
            <span
              className={`inline-flex items-center gap-2 rounded-full px-4 py-2 text-xs font-bold ring-1 shadow-sm backdrop-blur ${roleStyle.badge}`}
            >
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-brand-500 opacity-70" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-brand-500" />
              </span>

              {roleContent.badge}
            </span>
          </motion.div>

          <motion.h1
            variants={fadeUp}
            className="mx-auto mt-7 max-w-3xl text-4xl font-black leading-[1.2] tracking-tight text-slate-950 sm:text-5xl md:text-6xl lg:mx-0"
          >
            {roleContent.title.split("\n").map((line, index) => (
              <span
                key={index}
                className={`block ${
                  index === 1
                    ? "mt-2 bg-gradient-to-l from-brand-700 via-brand-500 to-cyan-500 bg-clip-text text-transparent"
                    : ""
                }`}
              >
                {line}
              </span>
            ))}
          </motion.h1>

          <motion.p
            variants={fadeUp}
            className="mx-auto mt-6 max-w-2xl text-base leading-8 text-slate-600 sm:text-lg lg:mx-0"
          >
            {roleContent.description}
          </motion.p>

          <motion.div
            variants={fadeUp}
            className="mt-8 flex flex-col justify-center gap-3 sm:flex-row lg:justify-start"
          >
            <Link to={roleContent.mainCta.to}>
              <Button
                size="lg"
                className="group h-13 w-full rounded-2xl px-7 shadow-lg shadow-brand-900/15 transition-all hover:-translate-y-1 hover:shadow-xl sm:w-auto"
              >
                {roleContent.mainCta.label}

                <ArrowLeft className="mr-2 h-4 w-4 transition-transform group-hover:-translate-x-1" />
              </Button>
            </Link>

            <Link to={roleContent.secondaryCta.to}>
              <Button
                size="lg"
                variant="outline"
                className="h-13 w-full rounded-2xl border-slate-200 bg-white/80 px-7 backdrop-blur transition-all hover:-translate-y-1 hover:border-brand-200 hover:bg-white sm:w-auto"
              >
                {roleContent.secondaryCta.label}
              </Button>
            </Link>
          </motion.div>

          {/* Stats */}
          <motion.div
            variants={fadeUp}
            className="mt-8 flex flex-wrap justify-center gap-3 lg:justify-start"
          >
            <StatPill
              value={roleContent.statValue}
              label={roleContent.statLabel}
            />

            {(isStudent || isTeacher || isAdmin) && (
              <StatPill value={collegeLabel} label="التخصص" />
            )}

            {!isGuest && (
              <div className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white/80 px-4 py-2 text-sm shadow-sm backdrop-blur">
                <Activity className="h-4 w-4 text-brand-500" />
                <span className="font-semibold text-slate-600">
                  حسابك نشط
                </span>
              </div>
            )}
          </motion.div>
        </motion.div>

        {/* Dashboard Preview */}
        <motion.div
          initial={{ opacity: 0, scale: 0.88, y: 30 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={{
            duration: 0.9,
            delay: 0.15,
            ease: [0.22, 1, 0.36, 1],
          }}
          className="relative mx-auto w-full max-w-[520px]"
        >
          {/* Floating decorations */}
          <FloatingIcon
            icon={HeartPulse}
            className="-right-4 top-10 sm:-right-8"
          />

          <FloatingIcon
            icon={Microscope}
            className="-bottom-4 left-3 sm:-left-8"
            delay={1.2}
          />

          <div className="absolute -inset-4 rounded-[3rem] bg-gradient-to-br from-brand-400/20 to-cyan-400/20 blur-2xl" />

          <div className="relative rounded-[2rem] border border-white/80 bg-white/90 p-3 shadow-[0_35px_100px_rgba(12,70,60,0.16)] backdrop-blur-xl sm:p-5">
            <div className="rounded-[1.5rem] border border-slate-100 bg-white p-5 sm:p-6">
              {/* Header */}
              <div className="flex items-center justify-between border-b border-slate-100 pb-5">
                <div className="flex items-center gap-3">
                  <div
                    className={`grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-gradient-to-br text-white shadow-lg ${roleStyle.panel}`}
                  >
                    <Icon className="h-5 w-5" />
                  </div>

                  <div className="min-w-0">
                    <p className="truncate font-black text-slate-800">
                      {isGuest
                        ? "تجربة التعلم الجديدة"
                        : isStudent
                        ? "كورساتي الحالية"
                        : isTeacher
                        ? "كورساتي المنشورة"
                        : "لوحة الإدارة"}
                    </p>

                    <p className="mt-1 truncate text-xs text-slate-400">
                      {isGuest
                        ? "كل ما تحتاجه في مكان واحد"
                        : `${collegeLabel} · متابعة مستمرة`}
                    </p>
                  </div>
                </div>

                <span
                  className={`rounded-full px-3 py-1 text-[10px] font-black ${roleStyle.soft}`}
                >
                  {isGuest
                    ? "جديد"
                    : loadingProfileData
                    ? "جارٍ"
                    : isStudent
                    ? "مستمر"
                    : isTeacher
                    ? "نشط"
                    : "متقدم"}
                </span>
              </div>

              {/* Content */}
              <div className="mt-5 space-y-3">
                {isGuest ? (
                  [
                    {
                      icon: Stethoscope,
                      label: "طب بشري",
                      value: "كورسات متقدمة",
                    },
                    {
                      icon: ToothbrushSparkles,
                      label: "طب أسنان",
                      value: "محتوى عملي",
                    },
                    {
                      icon: Pill,
                      label: "صيدلة",
                      value: "اختبارات فورية",
                    },
                  ].map((item, index) => (
                    <PreviewRow
                      key={item.label}
                      icon={item.icon}
                      label={item.label}
                      value={item.value}
                      index={index}
                    />
                  ))
                ) : loadingProfileData ? (
                  Array.from({ length: 3 }).map((_, index) => (
                    <div
                      key={index}
                      className="h-12 animate-pulse rounded-2xl bg-slate-100"
                    />
                  ))
                ) : isStudent ? (
                  studentCourses.slice(0, 3).map((item, index) => (
                    <PreviewRow
                      key={item.id}
                      icon={CheckCircle2}
                      label={item.course?.title ?? "كورس"}
                      value={`${index + 1} / ${Math.max(
                        studentCourses.length,
                        3
                      )}`}
                      index={index}
                    />
                  ))
                ) : isTeacher ? (
                  teacherCourses.slice(0, 3).map((course, index) => (
                    <PreviewRow
                      key={course.id}
                      icon={GraduationCap}
                      label={course.title}
                      value={`${course.students_count ?? 0} طالب`}
                      index={index}
                    />
                  ))
                ) : (
                  [
                    {
                      icon: Users,
                      label: "الطلاب النشطون",
                      value: "1,248",
                    },
                    {
                      icon: Award,
                      label: "المدفوعات",
                      value: "98%",
                    },
                    {
                      icon: BookOpen,
                      label: "الدورات النشطة",
                      value: "312",
                    },
                  ].map((item, index) => (
                    <PreviewRow
                      key={item.label}
                      icon={item.icon}
                      label={item.label}
                      value={item.value}
                      index={index}
                    />
                  ))
                )}
              </div>

              {/* Progress */}
              <div className="mt-6 rounded-2xl bg-slate-50 p-4">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold text-slate-600">
                    مستوى التقدم
                  </span>
                  <span className="font-black text-brand-600">
                    {isGuest
                      ? "58%"
                      : isStudent
                      ? "67%"
                      : isTeacher
                      ? "82%"
                      : "94%"}
                  </span>
                </div>

                <div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-200">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{
                      width: isGuest
                        ? "58%"
                        : isStudent
                        ? "67%"
                        : isTeacher
                        ? "82%"
                        : "94%",
                    }}
                    transition={{ duration: 1.3, delay: 0.5 }}
                    className="h-full rounded-full bg-gradient-to-l from-brand-500 to-cyan-400"
                  />
                </div>

                <div className="mt-3 flex items-center gap-2 text-xs text-slate-400">
                  <TrendingUp className="h-3.5 w-3.5 text-brand-500" />
                  تقدّم مستمر نحو أهدافك
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}

/* =========================================================
   Hero Helpers
========================================================= */

function StatPill({
  value,
  label,
}: {
  value: string | number;
  label: string;
}) {
  return (
    <div className="inline-flex items-center gap-2 rounded-full border border-brand-100 bg-white/80 px-4 py-2 text-sm shadow-sm backdrop-blur">
      <span className="font-black text-brand-700">{value}</span>
      <span className="text-slate-500">{label}</span>
    </div>
  );
}

function FloatingIcon({
  icon: Icon,
  className = "",
  delay = 0,
}: {
  icon: typeof HeartPulse;
  className?: string;
  delay?: number;
}) {
  return (
    <motion.div
      animate={{
        y: [0, -10, 0],
        rotate: [0, 3, 0],
      }}
      transition={{
        duration: 4,
        repeat: Infinity,
        delay,
        ease: "easeInOut",
      }}
      className={`absolute z-20 hidden h-14 w-14 place-items-center rounded-2xl border border-white bg-white shadow-xl sm:grid ${className}`}
    >
      <Icon className="h-6 w-6 text-brand-500" />
    </motion.div>
  );
}

function PreviewRow({
  icon: Icon,
  label,
  value,
  index,
}: {
  icon: typeof CheckCircle2;
  label: string;
  value: string;
  index: number;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, x: 15 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: 0.35 + index * 0.08 }}
      className="group flex items-center justify-between rounded-2xl border border-slate-100 bg-slate-50/70 px-4 py-3 transition-all hover:border-brand-100 hover:bg-brand-50/50"
    >
      <span className="flex min-w-0 items-center gap-3">
        <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-white shadow-sm">
          <Icon className="h-4 w-4 text-brand-500" />
        </span>

        <span className="truncate text-sm font-semibold text-slate-700">
          {label}
        </span>
      </span>

      <span className="mr-2 shrink-0 text-xs font-semibold text-slate-400">
        {value}
      </span>
    </motion.div>
  );
}

/* =========================================================
   Trust Bar
========================================================= */

function TrustBar() {
  const items = [
    { icon: ShieldCheck, text: "محتوى تعليمي موثوق" },
    { icon: Video, text: "تعلم في أي وقت" },
    { icon: Award, text: "شهادات إتمام" },
    { icon: Users, text: "مجتمع طلابي" },
  ];

  return (
    <section className="border-y border-slate-100 bg-white">
      <div className="mx-auto grid max-w-7xl grid-cols-2 divide-x divide-slate-100 px-5 py-5 sm:px-6 md:grid-cols-4">
        {items.map((item, index) => (
          <motion.div
            key={item.text}
            initial={{ opacity: 0, y: 10 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: index * 0.08 }}
            className="flex items-center justify-center gap-2 px-3 py-2 text-center"
          >
            <item.icon className="h-4 w-4 shrink-0 text-brand-500" />
            <span className="text-xs font-bold text-slate-500 sm:text-sm">
              {item.text}
            </span>
          </motion.div>
        ))}
      </div>
    </section>
  );
}

/* =========================================================
   Colleges
========================================================= */

const COLLEGES = [
  {
    icon: Stethoscope,
    title: "طب بشري",
    desc: "من التشريح والفسيولوجي إلى الباطنة والجراحة.",
    value: "medicine",
    gradient: "from-brand-500 to-cyan-500",
  },
  {
    icon: ToothbrushSparkles,
    title: "طب أسنان",
    desc: "محتوى عملي ومنظم يساعدك على بناء أساس قوي.",
    value: "dentistry",
    gradient: "from-violet-500 to-brand-500",
  },
  {
    icon: Pill,
    title: "صيدلة",
    desc: "تعلم الأدوية والكيمياء الصيدلانية بشكل تطبيقي.",
    value: "pharmacy",
    gradient: "from-emerald-500 to-teal-500",
  },
];

function CollegesSection() {
  return (
    <section className="relative bg-white px-5 py-24 sm:px-6">
      <div className="mx-auto max-w-7xl">
        <SectionHeader
          eyebrow="التخصصات الطبية"
          title="اختر تخصصك وابدأ من المكان الصحيح"
          description="محتوى تعليمي منظم يساعدك على المذاكرة والفهم وتحقيق نتائج أفضل."
        />

        <div className="mt-12 grid gap-6 md:grid-cols-3">
          {COLLEGES.map((college, index) => (
            <motion.div
              key={college.title}
              initial="hidden"
              whileInView="show"
              viewport={{ once: true, margin: "-80px" }}
              custom={index}
              variants={fadeUp}
            >
              <Link
                to={`/courses?college=${college.value}`}
                className="group relative block overflow-hidden rounded-[2rem] border border-slate-100 bg-white p-7 shadow-sm transition-all duration-500 hover:-translate-y-2 hover:border-brand-100 hover:shadow-[0_25px_70px_rgba(12,70,60,0.10)]"
              >
                <div className="absolute -right-16 -top-16 h-40 w-40 rounded-full bg-brand-50 transition-transform duration-500 group-hover:scale-150" />

                <div
                  className={`relative grid h-16 w-16 place-items-center rounded-2xl bg-gradient-to-br text-white shadow-lg ${college.gradient}`}
                >
                  <college.icon className="h-7 w-7" />
                </div>

                <h3 className="relative mt-6 text-xl font-black text-slate-900">
                  {college.title}
                </h3>

                <p className="relative mt-3 text-sm leading-7 text-slate-500">
                  {college.desc}
                </p>

                <div className="relative mt-6 flex items-center justify-between">
                  <span className="text-sm font-bold text-brand-600">
                    استعرض الكورسات
                  </span>

                  <span className="grid h-9 w-9 place-items-center rounded-full bg-brand-50 transition-all group-hover:bg-brand-500 group-hover:text-white">
                    <ArrowLeft className="h-4 w-4 transition-transform group-hover:-translate-x-1" />
                  </span>
                </div>
              </Link>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* =========================================================
   About
========================================================= */

function AboutSection() {
  const features = [
    "محتوى تعليمي منظم",
    "متابعة دقيقة للتقدم",
    "اختبارات وتقييمات",
    "دعم فني سريع",
  ];

  return (
    <section className="relative overflow-hidden bg-slate-950 px-5 py-24 text-white sm:px-6">
      <div className="absolute -right-40 top-0 h-96 w-96 rounded-full bg-brand-500/15 blur-3xl" />
      <div className="absolute -left-40 bottom-0 h-96 w-96 rounded-full bg-cyan-500/10 blur-3xl" />

      <div className="relative mx-auto grid max-w-7xl items-center gap-14 lg:grid-cols-2">
        <motion.div
          initial="hidden"
          whileInView="show"
          viewport={{ once: true }}
          variants={stagger}
        >
          <motion.span
            variants={fadeUp}
            className="inline-flex items-center gap-2 rounded-full border border-brand-400/20 bg-brand-400/10 px-4 py-2 text-xs font-bold text-brand-300"
          >
            <Sparkles className="h-4 w-4" />
            لماذا Med Core؟
          </motion.span>

          <motion.h2
            variants={fadeUp}
            className="mt-6 text-3xl font-black leading-tight sm:text-4xl"
          >
            أكثر من مجرد كورسات.
            <span className="mt-2 block text-brand-400">
              إنها بيئة تعليمية متكاملة.
            </span>
          </motion.h2>

          <motion.p
            variants={fadeUp}
            className="mt-6 max-w-xl text-base leading-8 text-slate-400"
          >
            بُنيت Med Core خصيصًا لتجعل رحلة طالب الكلية الطبية أكثر تنظيمًا
            ووضوحًا، بدايةً من اكتشاف الكورس وحتى متابعة تقدّمك وإنجازك.
          </motion.p>

          <motion.div
            variants={fadeUp}
            className="mt-8 grid grid-cols-1 gap-3 sm:grid-cols-2"
          >
            {features.map((feature) => (
              <div
                key={feature}
                className="flex items-center gap-3 rounded-2xl border border-white/5 bg-white/[0.04] p-4"
              >
                <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-brand-500/10">
                  <CheckCircle2 className="h-4 w-4 text-brand-400" />
                </span>

                <span className="text-sm font-semibold text-slate-300">
                  {feature}
                </span>
              </div>
            ))}
          </motion.div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, x: 40 }}
          whileInView={{ opacity: 1, x: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8 }}
          className="grid grid-cols-2 gap-4"
        >
          {[
            { icon: Users, label: "طالب مسجل", value: "+5,000" },
            { icon: Video, label: "ساعة تعليمية", value: "+2,000" },
            { icon: Award, label: "معلم متخصص", value: "+80" },
            { icon: Star, label: "متوسط التقييم", value: "4.8" },
          ].map((stat, index) => (
            <motion.div
              key={stat.label}
              whileHover={{ y: -5 }}
              transition={{ duration: 0.25 }}
              className={`rounded-3xl border border-white/10 bg-white/[0.04] p-6 text-center backdrop-blur ${
                index === 1 ? "mt-8" : ""
              } ${index === 2 ? "-mt-8" : ""}`}
            >
              <stat.icon className="mx-auto h-7 w-7 text-brand-400" />

              <p className="mt-4 text-3xl font-black">{stat.value}</p>

              <p className="mt-2 text-xs text-slate-500">{stat.label}</p>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}

/* =========================================================
   Why MedCore
========================================================= */

function WhyMedCoreSection() {
  const items = [
    {
      icon: ShieldCheck,
      title: "محتوى محمي",
      desc: "حماية أفضل للمحتوى التعليمي وتجربة مشاهدة مستقرة وآمنة.",
    },
    {
      icon: Video,
      title: "تعلم بدون تعقيد",
      desc: "واجهة بسيطة تساعدك على التركيز في المحتوى بدلًا من البحث عنه.",
    },
    {
      icon: BrainCircuit,
      title: "تعلّم أذكى",
      desc: "اختبارات وتقدم واضح يساعدانك على معرفة مستواك باستمرار.",
    },
  ];

  return (
    <section className="bg-[#f8fbfa] px-5 py-24 sm:px-6">
      <div className="mx-auto max-w-7xl">
        <SectionHeader
          eyebrow="مصممة لك"
          title="كل شيء تحتاجه في رحلة تعليمية واحدة"
          description="من أول درس وحتى آخر اختبار، Med Core تساعدك على التعلم بطريقة أكثر وضوحًا."
        />

        <div className="mt-12 grid gap-6 md:grid-cols-3">
          {items.map((item, index) => (
            <motion.div
              key={item.title}
              initial="hidden"
              whileInView="show"
              viewport={{ once: true }}
              custom={index}
              variants={fadeUp}
              whileHover={{ y: -8 }}
              className="group rounded-[2rem] border border-slate-100 bg-white p-8 shadow-sm transition-shadow hover:shadow-[0_25px_70px_rgba(12,70,60,0.08)]"
            >
              <div className="grid h-14 w-14 place-items-center rounded-2xl bg-brand-50 text-brand-500 transition-all duration-300 group-hover:bg-brand-500 group-hover:text-white group-hover:shadow-lg group-hover:shadow-brand-500/20">
                <item.icon className="h-7 w-7" />
              </div>

              <h3 className="mt-6 text-xl font-black text-slate-900">
                {item.title}
              </h3>

              <p className="mt-3 text-sm leading-7 text-slate-500">
                {item.desc}
              </p>

              <div className="mt-6 flex items-center gap-2 text-xs font-bold text-brand-600">
                <BadgeCheck className="h-4 w-4" />
                تجربة مصممة للطلاب
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* =========================================================
   Featured Courses
========================================================= */
function FeaturedCoursesSection() {
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;

    fetchCourses({ sort: "popular", page: 1, pageSize: 3 })
      .then(({ courses: fetchedCourses }) => {
        if (!active) return;
        setCourses(fetchedCourses);
      })
      .catch((error) => {
        console.error("[FeaturedCoursesSection] fetchCourses error:", error);
        if (active) setCourses([]);
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, []);

  type CollegeMeta = {
  icon: typeof Stethoscope;
  gradient: string;
  label: string;
};

const collegeMeta: Record<string, CollegeMeta> = {
  medicine: {
    icon: Stethoscope,
    gradient: "from-brand-500 to-cyan-500",
    label: "طب بشري",
  },
  dentistry: {
    icon: ToothbrushSparkles,
    gradient: "from-violet-500 to-brand-500",
    label: "طب أسنان",
  },
  pharmacy: {
    icon: Pill,
    gradient: "from-emerald-500 to-teal-500",
    label: "صيدلة",
  },
};
  return (
    <section className="bg-white px-5 py-24 sm:px-6">
      <div className="mx-auto max-w-7xl">
        <SectionHeader
          eyebrow="كورسات مختارة"
          title="ابدأ بأفضل الكورسات"
          description="اختر الكورس المناسب لك وابدأ التعلم بخطوات واضحة."
        />

        <div className="mt-12 grid gap-6 md:grid-cols-3">
          {loading ? (
            Array.from({ length: 3 }).map((_, index) => (
              <div
                key={index}
                className="h-[380px] animate-pulse rounded-[2rem] border border-slate-100 bg-slate-50"
              />
            ))
          ) : courses.length === 0 ? (
            <div className="col-span-full rounded-[2rem] border border-slate-100 bg-slate-50 p-10 text-center text-sm text-slate-400">
              لا توجد كورسات متاحة حاليًا
            </div>
          ) : (
            courses.map((course, index) => {
              const meta = collegeMeta[course.college as string];
              const Icon = meta?.icon ?? Stethoscope;
              const gradient = meta?.gradient ?? "from-brand-500 to-cyan-500";
              const collegeLabel = meta?.label ?? "تخصص طبي";
              const teacherName = course.teacher?.full_name;

              return (
                <motion.article
                  key={course.id}
                  initial="hidden"
                  whileInView="show"
                  viewport={{ once: true }}
                  custom={index}
                  variants={fadeUp}
                  whileHover={{ y: -8 }}
                  className="group overflow-hidden rounded-[2rem] border border-slate-100 bg-white shadow-sm transition-all hover:shadow-[0_25px_70px_rgba(12,70,60,0.10)]"
                >
                  <div
                    className={`relative flex h-52 items-center justify-center overflow-hidden bg-gradient-to-br ${gradient}`}
                  >
                    <div className="absolute -right-10 -top-10 h-40 w-40 rounded-full bg-white/10" />
                    <div className="absolute -bottom-16 -left-8 h-44 w-44 rounded-full bg-black/10" />

                    <motion.div
                      whileHover={{ scale: 1.12, rotate: 4 }}
                      className="relative grid h-20 w-20 place-items-center rounded-3xl border border-white/20 bg-white/10 text-white shadow-2xl backdrop-blur"
                    >
                      <Icon className="h-10 w-10" />
                    </motion.div>

                    <span className="absolute right-4 top-4 rounded-full bg-white/15 px-3 py-1 text-[10px] font-bold text-white backdrop-blur">
                      مميز
                    </span>
                  </div>

                  <div className="p-6">
                    <span className="text-xs font-bold text-brand-500">
                      {collegeLabel}
                    </span>

                    <h3 className="mt-2 text-lg font-black text-slate-900">
                      {course.title}
                    </h3>

                    {teacherName && (
                      <p className="mt-2 flex items-center gap-2 text-xs text-slate-400">
                        <GraduationCap className="h-4 w-4" />
                        {teacherName}
                      </p>
                    )}

                    <div className="mt-6 flex items-center justify-between border-t border-slate-100 pt-5">
                      <div>
                        <span className="text-xl font-black text-slate-900">
                          {course.price}
                        </span>
                        <span className="mr-1 text-xs text-slate-400">
                          ر.س
                        </span>
                      </div>

                      <Link
                        to={`/courses/${course.slug ?? course.id}`}
                        className="group/link inline-flex items-center gap-1 text-xs font-bold text-brand-600"
                      >
                        التفاصيل
                        <ChevronLeft className="h-4 w-4 transition-transform group-hover/link:-translate-x-1" />
                      </Link>
                    </div>
                  </div>
                </motion.article>
              );
            })
          )}
        </div>

        <div className="mt-12 text-center">
          <Link to="/courses">
            <Button
              variant="outline"
              className="rounded-2xl px-7 hover:border-brand-200 hover:bg-brand-50"
            >
              استعرض كل الكورسات
              <ArrowLeft className="mr-2 h-4 w-4" />
            </Button>
          </Link>
        </div>
      </div>
    </section>
  );
}
/* =========================================================
   How It Works
========================================================= */

function HowItWorksSection() {
  const steps = [
    {
      number: "01",
      icon: Users,
      title: "أنشئ حسابك",
      desc: "سجل بياناتك واختر تخصصك الطبي.",
    },
    {
      number: "02",
      icon: BookOpen,
      title: "اختر الكورس",
      desc: "تصفح الكورسات وشاهد التفاصيل.",
    },
    {
      number: "03",
      icon: ShieldCheck,
      title: "فعّل اشتراكك",
      desc: "أكمل عملية الدفع وارفع الإيصال.",
    },
    {
      number: "04",
      icon: PlayCircle,
      title: "ابدأ التعلم",
      desc: "شاهد الدروس وتابع تقدمك.",
    },
  ];

  return (
    <section className="bg-[#f8fbfa] px-5 py-24 sm:px-6">
      <div className="mx-auto max-w-7xl">
        <SectionHeader
          eyebrow="كيف تبدأ؟"
          title="أربع خطوات تفصلك عن بداية التعلم"
        />

        <div className="relative mt-14 grid gap-6 md:grid-cols-4">
          <div className="absolute right-[12%] left-[12%] top-12 hidden h-px bg-gradient-to-l from-transparent via-brand-200 to-transparent md:block" />

          {steps.map((step, index) => (
            <motion.div
              key={step.number}
              initial="hidden"
              whileInView="show"
              viewport={{ once: true }}
              custom={index}
              variants={fadeUp}
              className="relative rounded-[2rem] border border-slate-100 bg-white p-7 text-center shadow-sm"
            >
              <div className="relative mx-auto grid h-20 w-20 place-items-center rounded-full border-8 border-[#f8fbfa] bg-brand-50 text-brand-500 shadow-sm">
                <step.icon className="h-7 w-7" />

                <span className="absolute -right-2 -top-2 grid h-7 w-7 place-items-center rounded-full bg-brand-500 text-[9px] font-black text-white">
                  {step.number}
                </span>
              </div>

              <h3 className="mt-6 font-black text-slate-900">
                {step.title}
              </h3>

              <p className="mt-2 text-sm leading-6 text-slate-500">
                {step.desc}
              </p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* =========================================================
   Testimonials
========================================================= */

function TestimonialsSection() {
  const testimonials = [
    {
      name: "أحمد سالم",
      college: "طب بشري · سنة 3",
      text: "المحتوى مرتب جدًا والمتابعة سهّلت عليّ المذاكرة قبل الامتحانات.",
    },
    {
      name: "نور الهدى",
      college: "صيدلة · سنة 2",
      text: "الاختبارات بعد كل قسم فعلًا بتثبت المعلومة وبتخليني أعرف مستوايا.",
    },
    {
      name: "خالد يوسف",
      college: "طب أسنان · سنة 4",
      text: "الدعم الفني سريع جدًا، والمنصة بقت جزء أساسي من طريقة مذاكرتي.",
    },
  ];

  return (
    <section className="bg-white px-5 py-24 sm:px-6">
      <div className="mx-auto max-w-7xl">
        <SectionHeader
          eyebrow="تجارب الطلاب"
          title="طلاب Med Core يتكلمون عن تجربتهم"
        />

        <div className="mt-12 grid gap-6 md:grid-cols-3">
          {testimonials.map((testimonial, index) => (
            <motion.div
              key={testimonial.name}
              initial="hidden"
              whileInView="show"
              viewport={{ once: true }}
              custom={index}
              variants={fadeUp}
              whileHover={{ y: -6 }}
              className="relative rounded-[2rem] border border-slate-100 bg-[#f8fbfa] p-7 transition-all hover:shadow-xl hover:shadow-brand-900/5"
            >
              <div className="absolute right-6 top-6 opacity-10">
                <Quote className="h-14 w-14 text-brand-600" />
              </div>

              <div className="flex gap-1">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Star
                    key={i}
                    className="h-4 w-4 fill-current text-amber-400"
                  />
                ))}
              </div>

              <p className="relative mt-6 text-sm leading-8 text-slate-600">
                “{testimonial.text}”
              </p>

              <div className="mt-6 flex items-center gap-3">
                <div className="grid h-11 w-11 place-items-center rounded-full bg-gradient-to-br from-brand-500 to-cyan-500 font-black text-white">
                  {testimonial.name.charAt(0)}
                </div>

                <div>
                  <p className="text-sm font-black text-slate-900">
                    {testimonial.name}
                  </p>
                  <p className="mt-1 text-xs text-slate-400">
                    {testimonial.college}
                  </p>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* =========================================================
   CTA
========================================================= */

function ContactCta() {
  return (
    <section className="px-5 pb-24 sm:px-6">
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.7 }}
        className="relative mx-auto max-w-7xl overflow-hidden rounded-[2.5rem] bg-slate-950 px-6 py-16 text-center text-white sm:px-10 md:py-20"
      >
        <div className="absolute -right-32 -top-32 h-72 w-72 rounded-full bg-brand-500/20 blur-3xl" />
        <div className="absolute -bottom-40 -left-20 h-80 w-80 rounded-full bg-cyan-500/10 blur-3xl" />

        <div className="relative">
          <span className="inline-flex items-center gap-2 rounded-full border border-brand-400/20 bg-brand-400/10 px-4 py-2 text-xs font-bold text-brand-300">
            <Sparkles className="h-4 w-4" />
            مستعد تبدأ؟
          </span>

          <h2 className="mx-auto mt-6 max-w-2xl text-3xl font-black leading-tight sm:text-4xl">
            ابدأ رحلتك التعليمية
            <span className="block text-brand-400">من اليوم.</span>
          </h2>

          <p className="mx-auto mt-5 max-w-xl text-sm leading-7 text-slate-400 sm:text-base">
            انضم إلى مجتمع Med Core وابدأ في بناء معرفة طبية أقوى بطريقة
            منظمة ومريحة.
          </p>

          <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
            <Link to="/auth/register">
              <Button
                size="lg"
                className="h-13 w-full rounded-2xl bg-brand-500 px-8 font-black text-slate-950 hover:bg-brand-400 sm:w-auto"
              >
                إنشاء حساب مجاني
                <ArrowLeft className="mr-2 h-4 w-4" />
              </Button>
            </Link>

            <Link to="/contact">
              <Button
                size="lg"
                variant="outline"
                className="h-13 w-full rounded-2xl border-white/15 bg-white/5 px-8 text-white hover:bg-white/10 sm:w-auto"
              >
                تواصل معنا
              </Button>
            </Link>
          </div>
        </div>
      </motion.div>
    </section>
  );
}

/* =========================================================
   Shared Section Header
========================================================= */

function SectionHeader({
  eyebrow,
  title,
  description,
}: {
  eyebrow: string;
  title: string;
  description?: string;
}) {
  return (
    <motion.div
      initial="hidden"
      whileInView="show"
      viewport={{ once: true }}
      variants={fadeUp}
      className="mx-auto max-w-3xl text-center"
    >
      <span className="inline-flex items-center gap-2 rounded-full bg-brand-50 px-4 py-2 text-xs font-black text-brand-600">
        <span className="h-1.5 w-1.5 rounded-full bg-brand-500" />
        {eyebrow}
      </span>

      <h2 className="mt-5 text-3xl font-black tracking-tight text-slate-950 sm:text-4xl">
        {title}
      </h2>

      {description && (
        <p className="mt-4 text-sm leading-7 text-slate-500 sm:text-base">
          {description}
        </p>
      )}
    </motion.div>
  );
}
