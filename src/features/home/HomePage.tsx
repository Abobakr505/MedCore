import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import {
  BookOpen,
  TrendingUp,
  Award,
  Wallet,
  Users,
  Receipt,
  GraduationCap,
  FileStack,
  Ticket,
  ArrowLeft,
  CheckCircle2,
  Sparkles,
  Clock3,
  CircleDollarSign,
  BarChart3,
} from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Skeleton } from "@/components/ui/Skeleton";
import { useAuth } from "@/contexts/AuthContext";
import { fetchTeacherCourses } from "@/services/teacherCourses";
import { fetchTeacherPayments } from "@/services/payments";
import { fetchDashboardStats, type DashboardStats } from "@/services/admin";
import type { Enrollment, Course } from "@/types";
import { CourseCard } from "@/features/courses/CourseCard";
import { formatCurrency } from "@/utils/format";
import { fetchStudentEnrollments, fetchLessonProgress, computeCourseProgress } from "@/services/enrollments";
import { fetchCourseSections } from "@/services/courses";
import { fetchStudentAttempts } from "@/services/quizzes";

const COLLEGE_LABELS = {
  medicine: "الطب",
  dentistry: "طب الأسنان",
  pharmacy: "الصيدلة",
} as const;

const ROLE_LABELS = {
  student: "طالب",
  teacher: "معلم",
  admin: "مدير",
} as const;

const ROLE_ACCENTS = {
  student: {
    badge: "bg-brand-500 text-brand-100 ring-brand-100",
    panel: "from-brand-600 via-brand-500 to-sky-500",
    chip: "bg-brand-600",
    glow: "shadow-brand-100",
  },
  teacher: {
    badge: "bg-brand-100 text-brand-900 ring-brand-100",
    panel: "from-brand-900 via-brand-500 to-brand-500",
    chip: "bg-brand-500",
    glow: "shadow-brand-100",
  },
  admin: {
    badge: "bg-slate-200 text-slate-700 ring-slate-300",
    panel: "from-slate-900 via-slate-800 to-slate-700",
    chip: "bg-slate-700",
    glow: "shadow-slate-200",
  },
} as const;

export default function HomePage() {
  const { profile } = useAuth();

  if (!profile) return null;
  if (profile.role === "admin") return <AdminHome />;
  if (profile.role === "teacher") return <TeacherHome />;
  return <StudentHome />;
}

function StudentHome() {
  const { profile, session } = useAuth();
  const [enrollments, setEnrollments] = useState<Enrollment[]>([]);
  const [avgProgress, setAvgProgress] = useState<number>(0);
  const [passedExamsCount, setPassedExamsCount] = useState<number>(0);
  const [totalExamsCount, setTotalExamsCount] = useState<number>(0);
  const [loading, setLoading] = useState(true);

  const firstName = profile?.full_name?.split(" ")[0] ?? "عزيزي";
  const collegeLabel = COLLEGE_LABELS[profile?.college ?? "medicine"];
  const accent = ROLE_ACCENTS.student;

  useEffect(() => {
    if (!session?.user) return;
    const userId = session.user.id;

    (async () => {
      try {
        const enrollmentsData = await fetchStudentEnrollments(userId);
        setEnrollments(enrollmentsData);

        // متوسط التقدم عبر كل الكورسات المسجَّل بها الطالب
        const progressValues: number[] = [];
        for (const e of enrollmentsData) {
          if (!e.course) continue;
          const sections = await fetchCourseSections(e.course.id);
          const lessons = sections.flatMap((s) => s.lessons ?? []);
          const progress = await fetchLessonProgress(userId, lessons.map((l) => l.id));
          const completed = progress.filter((p) => p.completed).length;
          progressValues.push(computeCourseProgress(lessons.length, completed));
        }
        const avg =
          progressValues.length > 0
            ? Math.round(progressValues.reduce((a, b) => a + b, 0) / progressValues.length)
            : 0;
        setAvgProgress(avg);

        // الاختبارات المجتازة من إجمالي المحاولات المسلَّمة
        const attempts = await fetchStudentAttempts(userId);
        const passed = attempts.filter((a) => a.percentage >= (a.quiz?.passing_score ?? 60)).length;
        setPassedExamsCount(passed);
        setTotalExamsCount(attempts.length);
      } catch (err) {
        console.error("StudentHome load error:", err);
      } finally {
        setLoading(false);
      }
    })();
  }, [session?.user?.id]);

  return (
    <div className="space-y-8">
      <motion.section
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        className={`relative overflow-hidden rounded-[32px] border border-brand-100 bg-gradient-to-br ${accent.panel} p-6 text-white bg-brand-500 shadow-soft ${accent.glow}`}
      >
        <div className="relative flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
          <div className="max-w-xl">
            <span className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-bold ring-1 ${accent.badge}`}>
              {ROLE_LABELS.student}
            </span>
            <h1 className="mt-4 text-3xl font-black leading-tight">أهلاً بعودتك، {firstName} 👋</h1>
            <p className="mt-3 text-sm text-white/80">
              متابعة مستمرة في تخصص {collegeLabel}، واستمرار في رحلتك التعليمية مع محتوى مُصمّم لدعم تقدمك اليومي.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2 text-sm">
            <span className="rounded-full bg-white/15 px-3 py-2 font-semibold text-white ring-1 ring-white/20">{collegeLabel}</span>
            <span className="rounded-full bg-white/15 px-3 py-2 font-semibold text-white ring-1 ring-white/20">
              {enrollments.length} كورس مسجّل
            </span>
          </div>
        </div>
      </motion.section>

      <section className="grid gap-3 md:grid-cols-3">
        {[
          { label: "كورساتي", href: "/app/student/courses", icon: BookOpen },
          { label: "تقدمي", href: "/app/student/progress", icon: TrendingUp },
          { label: "مدفوعاتي", href: "/app/student/payments", icon: Wallet },
        ].map(({ label, href, icon: Icon }) => (
          <Link key={label} to={href} className="rounded-[22px] border border-slate-200 bg-white p-4 shadow-soft transition hover:-translate-y-0.5 hover:shadow-md">
            <div className="flex items-center justify-between">
              <span className="text-sm font-bold text-slate-700">{label}</span>
              <div className="grid h-10 w-10 place-items-center rounded-xl bg-brand-50 text-brand-600">
                <Icon className="h-5 w-5" />
              </div>
            </div>
          </Link>
        ))}
      </section>

      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard icon={BookOpen} label="كورساتي" value={enrollments.length} color="blue" />
        <StatCard
          icon={TrendingUp}
          label="متوسط التقدّم"
          value={loading ? "—" : `${avgProgress}%`}
          color="green"
        />
        <StatCard
          icon={Award}
          label="الاختبارات المجتازة"
          value={loading ? "—" : `${passedExamsCount}/${totalExamsCount}`}
          color="amber"
        />
      </div>

      {/* شريط التقدم الإجمالي */}
      {!loading && (
        <motion.section
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="relative overflow-hidden rounded-[28px] border border-slate-200 bg-white p-6 shadow-soft"
        >
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h3 className="text-base font-extrabold text-slate-800">تقدّمك الإجمالي</h3>
              <p className="mt-1 text-xs text-slate-400">
                {avgProgress >= 80
                  ? "أداء رائع! أنت قريب جدًا من إتمام كورساتك"
                  : avgProgress >= 50
                  ? "استمر! أنت في منتصف الطريق"
                  : avgProgress > 0
                  ? "بداية جيدة، واصل التقدّم"
                  : "ابدأ رحلتك التعليمية الآن"}
              </p>
            </div>
            <span className="text-2xl font-black text-brand-600">{avgProgress}%</span>
          </div>

          <div className="relative h-4 w-full overflow-hidden rounded-full bg-slate-100">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${avgProgress}%` }}
              transition={{ duration: 1, ease: "easeOut" }}
              className="relative h-full rounded-full bg-gradient-to-r from-brand-500 via-brand-600 to-sky-500"
            >
              <div className="absolute inset-0 bg-[linear-gradient(110deg,transparent,rgba(255,255,255,0.4),transparent)] bg-[length:200%_100%] animate-[shimmer_2s_infinite]" />
            </motion.div>
          </div>

          <div className="mt-3 flex justify-between text-[11px] font-semibold text-slate-400">
            <span>0%</span>
            <span>50%</span>
            <span>100%</span>
          </div>
        </motion.section>
      )}

      <section className="rounded-[28px] border border-slate-200 bg-white/80 p-5 shadow-soft backdrop-blur-sm">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-extrabold text-slate-800">كورساتي الحالية</h2>
            <p className="mt-1 text-xs text-slate-500">تابع تقدمك واستمرارك في التعلم</p>
          </div>
          <Link to="/app/student/courses" className="inline-flex items-center gap-1 text-sm font-semibold text-brand-600 hover:text-brand-700">
            عرض الكل <ArrowLeft className="h-4 w-4" />
          </Link>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {loading ? (
            Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-56 rounded-[24px]" />)
          ) : enrollments.length === 0 ? (
            <Card className="col-span-full p-8 text-center text-sm text-slate-500">
              لم تشترك في أي كورس بعد. <Link to="/courses" className="font-semibold text-brand-500">تصفّح الكورسات الآن</Link>
            </Card>
          ) : (
            enrollments.slice(0, 6).map((e) => e.course && <CourseCard key={e.id} course={e.course as Course} />)
          )}
        </div>
      </section>
    </div>
  );
}

function TeacherHome() {
  const { profile, session } = useAuth();
  const [courses, setCourses] = useState<Course[]>([]);
  const [pendingPayments, setPendingPayments] = useState(0);
  const [loading, setLoading] = useState(true);

  const firstName = profile?.full_name?.split(" ")[0] ?? "أستاذ";
  const collegeLabel = COLLEGE_LABELS[profile?.college ?? "medicine"];
  const accent = ROLE_ACCENTS.teacher;

  useEffect(() => {
    if (!session?.user) return;
    Promise.all([fetchTeacherCourses(session.user.id), fetchTeacherPayments(session.user.id, "pending")])
      .then(([c, p]) => {
        setCourses(c);
        setPendingPayments(p.length);
      })
      .finally(() => setLoading(false));
  }, [session?.user?.id]);

  const totalStudents = courses.reduce((sum, c) => sum + c.students_count, 0);
  const revenue = courses.reduce((sum, c) => sum + c.students_count * c.price, 0);

  return (
    <div className="space-y-8">
      <motion.section
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        className={`relative overflow-hidden rounded-[32px] border border-emerald-100 bg-gradient-to-br ${accent.panel} p-6 text-white shadow-soft ${accent.glow}`}
      >
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(255,255,255,0.18),transparent_24%)]" />
        <div className="relative flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
          <div className="max-w-xl">
            <span className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-bold ring-1 ${accent.badge}`}>
              {ROLE_LABELS.teacher}
            </span>
            <h1 className="mt-4 text-3xl font-black leading-tight">أهلاً بك، {firstName}</h1>
            <p className="mt-3 text-sm text-white/80">
              أنت تدير الآن محتوى تعليمك في تخصص {collegeLabel}، وتتابع أداء كورساتك بشكل مباشر عبر مؤشرات الأداء الفورية.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2 text-sm">
            <span className="rounded-full bg-white/15 px-3 py-2 font-semibold text-white ring-1 ring-white/20">{collegeLabel}</span>
            <span className="rounded-full bg-white/15 px-3 py-2 font-semibold text-white ring-1 ring-white/20">
              {courses.length} كورس منشور
            </span>
          </div>
        </div>
      </motion.section>

      <section className="grid gap-3 md:grid-cols-3">
        {[
          { label: "كورساتي", href: "/app/teacher/courses", icon: BookOpen },
          { label: "طلابي", href: "/app/teacher/students", icon: Users },
          { label: "المدفوعات", href: "/app/teacher/payments", icon: Wallet },
        ].map(({ label, href, icon: Icon }) => (
          <Link key={label} to={href} className="rounded-[22px] border border-slate-200 bg-white p-4 shadow-soft transition hover:-translate-y-0.5 hover:shadow-md">
            <div className="flex items-center justify-between">
              <span className="text-sm font-bold text-slate-700">{label}</span>
              <div className="grid h-10 w-10 place-items-center rounded-xl bg-emerald-50 text-emerald-600">
                <Icon className="h-5 w-5" />
              </div>
            </div>
          </Link>
        ))}
      </section>

      {loading ? (
        <div className="grid gap-4 sm:grid-cols-4">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-24 rounded-[22px]" />)}</div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard icon={FileStack} label="إجمالي الكورسات" value={courses.length} color="blue" />
          <StatCard icon={Users} label="إجمالي الطلاب" value={totalStudents} color="green" />
          <StatCard icon={Wallet} label="الإيرادات التقديرية" value={formatCurrency(revenue)} color="amber" />
          <StatCard icon={Receipt} label="مدفوعات بانتظار المراجعة" value={pendingPayments} color="red" href="/app/teacher/payments" />
        </div>
      )}

      <section className="rounded-[28px] border border-slate-200 bg-white/80 p-5 shadow-soft backdrop-blur-sm">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-extrabold text-slate-800">كورساتك</h2>
            <p className="mt-1 text-xs text-slate-500">إدارة محتوى الدروس وملف الـ students بشكل مركز</p>
          </div>
          <Link to="/app/teacher/courses" className="inline-flex items-center gap-1 text-sm font-semibold text-brand-600 hover:text-brand-700">
            إدارة الكورسات <ArrowLeft className="h-4 w-4" />
          </Link>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {courses.slice(0, 6).map((c) => (
            <Card key={c.id} className="p-4 transition-all duration-200 hover:-translate-y-1 hover:shadow-lg">
              <div className="flex items-start justify-between gap-3">
                <p className="line-clamp-1 font-bold text-slate-800">{c.title}</p>
                <span className={`rounded-full px-2.5 py-1 text-[10px] font-bold ${c.is_published ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700"}`}>
                  {c.is_published ? "منشور" : "مسودة"}
                </span>
              </div>
              <div className="mt-4 flex items-center justify-between text-xs text-slate-500">
                <span className="inline-flex items-center gap-1"><Users className="h-3.5 w-3.5" /> {c.students_count}</span>
                <span className="inline-flex items-center gap-1"><CircleDollarSign className="h-3.5 w-3.5" /> {formatCurrency(c.price)}</span>
              </div>
              <Link to="/app/teacher/courses" className="mt-4 inline-block text-sm font-semibold text-brand-500 hover:text-brand-700">إدارة الكورس</Link>
            </Card>
          ))}
        </div>
      </section>
    </div>
  );
}

function AdminHome() {
  const [stats, setStats] = useState<DashboardStats | null>(null);

  useEffect(() => {
    fetchDashboardStats().then(setStats);
  }, []);

  return (
    <div className="space-y-8">
      <motion.section
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative overflow-hidden rounded-[32px] border border-slate-700 bg-gradient-to-br from-slate-900 via-slate-800 to-slate-700 p-6 text-white shadow-soft"
      >
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(255,255,255,0.12),transparent_24%)]" />
        <div className="relative flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
          <div className="max-w-xl">
            <span className="inline-flex items-center rounded-full bg-white/10 px-3 py-1 text-xs font-bold text-slate-100 ring-1 ring-white/15">
              {ROLE_LABELS.admin}
            </span>
            <h1 className="mt-4 text-3xl font-black leading-tight">لوحة الإدارة</h1>
            <p className="mt-3 text-sm text-slate-300">مؤشرات منصة تعليمية متكاملة تراقب التعلّم، الطلاب، المعلمين، الإيرادات، والدعم.</p>
          </div>

          <div className="flex flex-wrap items-center gap-2 text-sm">
            <span className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-2 text-white ring-1 ring-white/10">
              <BarChart3 className="h-4 w-4" /> الأداء العام
            </span>
          </div>
        </div>
      </motion.section>

      <section className="grid gap-3 md:grid-cols-3">
        {[
          { label: "الطلاب", href: "/app/admin/students", icon: GraduationCap },
          { label: "الكورسات", href: "/app/admin/courses", icon: FileStack },
          { label: "التقارير", href: "/app/admin/reports", icon: BarChart3 },
        ].map(({ label, href, icon: Icon }) => (
          <Link key={label} to={href} className="rounded-[22px] border border-slate-200 bg-white p-4 shadow-soft transition hover:-translate-y-0.5 hover:shadow-md">
            <div className="flex items-center justify-between">
              <span className="text-sm font-bold text-slate-700">{label}</span>
              <div className="grid h-10 w-10 place-items-center rounded-xl bg-slate-100 text-slate-700">
                <Icon className="h-5 w-5" />
              </div>
            </div>
          </Link>
        ))}
      </section>

      {!stats ? (
        <div className="grid gap-4 sm:grid-cols-3 lg:grid-cols-6">{Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-24 rounded-[22px]" />)}</div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
          <StatCard icon={GraduationCap} label="الطلاب" value={stats.studentsCount} color="blue" href="/app/admin/students" />
          <StatCard icon={Users} label="المعلمون" value={stats.teachersCount} color="green" href="/app/admin/teachers" />
          <StatCard icon={FileStack} label="الكورسات" value={stats.coursesCount} color="amber" href="/app/admin/courses" />
          <StatCard icon={Wallet} label="الإيرادات" value={formatCurrency(stats.revenue)} color="green" href="/app/admin/payments" />
          <StatCard icon={Receipt} label="مدفوعات معلّقة" value={stats.pendingPayments} color="red" href="/app/admin/payments" />
          <StatCard icon={Ticket} label="اشتراكات نشطة" value={stats.activeEnrollments} color="blue" href="/app/admin/enrollments" />
        </div>
      )}

      <section className="grid gap-4 md:grid-cols-3">
        <Card className="p-5">
          <div className="flex items-center gap-3 text-brand-700">
            <CheckCircle2 className="h-5 w-5" />
            <span className="font-bold">مؤشرات صحية</span>
          </div>
          <p className="mt-3 text-sm text-slate-500">النظام يعمل بشكل مستقر وتزداد مستويات النشاط بشكل منتظم.</p>
        </Card>

        <Card className="p-5">
          <div className="flex items-center gap-3 text-emerald-700">
            <Sparkles className="h-5 w-5" />
            <span className="font-bold">محتوى فعال</span>
          </div>
          <p className="mt-3 text-sm text-slate-500">المنصة تستثمر في تجربة تعلم أكثر تفاعلية واحترافية.</p>
        </Card>

        <Card className="p-5">
          <div className="flex items-center gap-3 text-amber-700">
            <Clock3 className="h-5 w-5" />
            <span className="font-bold">مراجعة متكررة</span>
          </div>
          <p className="mt-3 text-sm text-slate-500">المدفوعات والمشروعات قيد المتابعة بشكل دوري لضمان الاستقرار.</p>
        </Card>
      </section>
    </div>
  );
}

function StatCard({
  icon: Icon,
  label,
  value,
  color,
  href,
}: {
  icon: React.ElementType;
  label: string;
  value: string | number;
  color: "blue" | "green" | "amber" | "red";
  href?: string;
}) {
  const colors: Record<string, string> = {
    blue: "bg-brand-50 text-brand-600",
    green: "bg-emerald-50 text-emerald-600",
    amber: "bg-amber-50 text-amber-600",
    red: "bg-red-50 text-red-500",
  };

  const content = (
    <Card className="flex items-center gap-4 rounded-[22px] p-5 transition-all duration-200 hover:-translate-y-1 hover:shadow-lg">
      <div className={`grid h-12 w-12 shrink-0 place-items-center rounded-2xl ${colors[color]}`}>
        <Icon className="h-5 w-5" />
      </div>
      <div className="min-w-0">
        <p className="truncate text-xl font-black text-slate-800">{value}</p>
        <p className="truncate text-xs text-slate-400">{label}</p>
      </div>
    </Card>
  );

  return href ? <Link to={href}>{content}</Link> : content;
}
