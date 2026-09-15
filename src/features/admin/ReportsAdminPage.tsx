import { useEffect, useMemo, useState } from "react";
import {
  BarChart3,
  Users,
  Wallet,
  FileStack,
  TrendingUp,
  UserRound,
  GraduationCap,
  ArrowUpLeft,
  CircleDollarSign,
  Activity,
} from "lucide-react";

import {
  ResponsiveContainer,
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from "recharts";

import { Card } from "@/components/ui/Card";
import { Skeleton } from "@/components/ui/Skeleton";

import {
  fetchDashboardStats,
  type DashboardStats,
  fetchMonthlyGrowth,
  fetchTeacherPerformance,
  type MonthlyStat,
  type TeacherPerformance,
} from "@/services/admin";

import { formatCurrency } from "@/utils/format";

export default function ReportsAdminPage() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [growth, setGrowth] = useState<MonthlyStat[]>([]);
  const [teachers, setTeachers] = useState<TeacherPerformance[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      fetchDashboardStats(),
      fetchMonthlyGrowth(6),
      fetchTeacherPerformance(6),
    ])
      .then(([s, g, t]) => {
        setStats(s);
        setGrowth(g);
        setTeachers(t);
      })
      .finally(() => setLoading(false));
  }, []);

  const totalUsers = stats
    ? stats.studentsCount + stats.teachersCount
    : 0;

  const averageRevenue =
    growth.length > 0
      ? growth.reduce((sum, item) => sum + Number(item.revenue || 0), 0) /
        growth.length
      : 0;

  const totalGrowthUsers = useMemo(
    () =>
      growth.reduce(
        (sum, item) => sum + Number(item.users || 0),
        0
      ),
    [growth]
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="relative overflow-hidden rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="absolute -left-20 -top-20 h-56 w-56 rounded-full bg-brand-500/10 blur-3xl" />
        <div className="absolute -bottom-24 right-20 h-56 w-56 rounded-full bg-emerald-500/5 blur-3xl" />

        <div className="relative flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-start gap-4">
            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-brand-50 text-brand-600 ring-1 ring-brand-100">
              <BarChart3 className="h-7 w-7" />
            </div>

            <div>
              <h1 className="text-2xl font-extrabold tracking-tight text-slate-900">
                التقارير والإحصائيات
              </h1>

              <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">
                نظرة شاملة على أداء المنصة، نمو المستخدمين، الإيرادات،
                وأداء المعلمين.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 rounded-2xl border border-slate-100 bg-slate-50 px-4 py-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white text-brand-600 shadow-sm">
              <Activity className="h-5 w-5" />
            </div>

            <div>
              <p className="text-xs font-medium text-slate-400">
                فترة التقرير
              </p>

              <p className="mt-0.5 text-sm font-extrabold text-slate-800">
                آخر 6 أشهر
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* KPI Cards */}
      {loading || !stats ? (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-36 rounded-2xl" />
          ))}
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard
            icon={<Users className="h-5 w-5" />}
            iconClass="bg-blue-50 text-blue-600"
            label="إجمالي المستخدمين"
            value={totalUsers}
            description={`${stats.studentsCount} طالب · ${stats.teachersCount} معلم`}
          />

          <StatCard
            icon={<CircleDollarSign className="h-5 w-5" />}
            iconClass="bg-emerald-50 text-emerald-600"
            label="إجمالي الإيرادات"
            value={formatCurrency(stats.revenue)}
            description="الإيرادات المعتمدة"
          />

          <StatCard
            icon={<FileStack className="h-5 w-5" />}
            iconClass="bg-amber-50 text-amber-600"
            label="الكورسات"
            value={stats.coursesCount}
            description="إجمالي الكورسات على المنصة"
          />

          <StatCard
            icon={<TrendingUp className="h-5 w-5" />}
            iconClass="bg-brand-50 text-brand-600"
            label="مستخدمون جدد"
            value={totalGrowthUsers}
            description="خلال آخر 6 أشهر"
          />
        </div>
      )}

      {/* Secondary Metrics */}
      <div className="grid gap-4 sm:grid-cols-2">
        <Card className="relative overflow-hidden p-5">
          <div className="absolute -left-8 -top-8 h-24 w-24 rounded-full bg-emerald-500/5 blur-2xl" />

          <div className="relative flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600">
                <Wallet className="h-5 w-5" />
              </div>

              <div>
                <p className="text-xs font-medium text-slate-400">
                  متوسط الإيرادات الشهرية
                </p>

                <p className="mt-1 text-xl font-extrabold text-slate-900">
                  {loading
                    ? "..."
                    : formatCurrency(averageRevenue)}
                </p>
              </div>
            </div>

            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-emerald-50 text-emerald-600">
              <ArrowUpLeft className="h-4 w-4" />
            </div>
          </div>
        </Card>

        <Card className="relative overflow-hidden p-5">
          <div className="absolute -left-8 -top-8 h-24 w-24 rounded-full bg-blue-500/5 blur-2xl" />

          <div className="relative flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
                <UserRound className="h-5 w-5" />
              </div>

              <div>
                <p className="text-xs font-medium text-slate-400">
                  نمو المستخدمين
                </p>

                <p className="mt-1 text-xl font-extrabold text-slate-900">
                  {loading ? "..." : totalGrowthUsers}
                </p>
              </div>
            </div>

            <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-bold text-blue-600">
              6 أشهر
            </span>
          </div>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid gap-6 xl:grid-cols-2">
        {/* User Growth */}
        <Card className="overflow-hidden p-6">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-50 text-brand-600">
                <TrendingUp className="h-5 w-5" />
              </div>

              <div>
                <h2 className="font-extrabold text-slate-800">
                  نمو المستخدمين
                </h2>

                <p className="mt-0.5 text-xs text-slate-400">
                  المستخدمون الجدد شهريًا
                </p>
              </div>
            </div>

            <span className="rounded-full bg-slate-50 px-3 py-1.5 text-[11px] font-bold text-slate-500">
              آخر 6 أشهر
            </span>
          </div>

          {loading ? (
            <Skeleton className="mt-6 h-72 rounded-2xl" />
          ) : growth.length === 0 ? (
            <ChartEmpty />
          ) : (
            <div className="mt-6 h-72" dir="ltr">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart
                  data={growth}
                  margin={{
                    top: 10,
                    right: 10,
                    left: -15,
                    bottom: 0,
                  }}
                >
                  <defs>
                    <linearGradient
                      id="usersGradient"
                      x1="0"
                      y1="0"
                      x2="0"
                      y2="1"
                    >
                      <stop
                        offset="0%"
                        stopColor="#14b8a6"
                        stopOpacity={0.25}
                      />
                      <stop
                        offset="100%"
                        stopColor="#14b8a6"
                        stopOpacity={0}
                      />
                    </linearGradient>
                  </defs>

                  <CartesianGrid
                    strokeDasharray="4 4"
                    stroke="#e2e8f0"
                    vertical={false}
                  />

                  <XAxis
                    dataKey="month"
                    tick={{
                      fontSize: 11,
                      fill: "#94a3b8",
                    }}
                    axisLine={false}
                    tickLine={false}
                  />

                  <YAxis
                    tick={{
                      fontSize: 11,
                      fill: "#94a3b8",
                    }}
                    axisLine={false}
                    tickLine={false}
                    allowDecimals={false}
                  />

                  <Tooltip
                    formatter={(value: any) => [
                      value as number,
                      "مستخدم جديد",
                    ]}
                    contentStyle={{
                      direction: "rtl",
                      fontSize: 12,
                      borderRadius: 14,
                      border: "1px solid #e2e8f0",
                      boxShadow:
                        "0 10px 30px rgba(15, 23, 42, 0.08)",
                    }}
                  />

                  <Line
                    type="monotone"
                    dataKey="users"
                    stroke="#14b8a6"
                    strokeWidth={3}
                    dot={{
                      r: 4,
                      strokeWidth: 2,
                      fill: "#ffffff",
                    }}
                    activeDot={{
                      r: 6,
                    }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}
        </Card>

        {/* Revenue */}
        <Card className="overflow-hidden p-6">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600">
                <Wallet className="h-5 w-5" />
              </div>

              <div>
                <h2 className="font-extrabold text-slate-800">
                  الإيرادات الشهرية
                </h2>

                <p className="mt-0.5 text-xs text-slate-400">
                  أداء الإيرادات خلال الفترة الأخيرة
                </p>
              </div>
            </div>

            <span className="rounded-full bg-emerald-50 px-3 py-1.5 text-[11px] font-bold text-emerald-600">
              الإيرادات
            </span>
          </div>

          {loading ? (
            <Skeleton className="mt-6 h-72 rounded-2xl" />
          ) : growth.length === 0 ? (
            <ChartEmpty />
          ) : (
            <div className="mt-6 h-72" dir="ltr">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={growth}
                  margin={{
                    top: 10,
                    right: 10,
                    left: -15,
                    bottom: 0,
                  }}
                >
                  <CartesianGrid
                    strokeDasharray="4 4"
                    stroke="#e2e8f0"
                    vertical={false}
                  />

                  <XAxis
                    dataKey="month"
                    tick={{
                      fontSize: 11,
                      fill: "#94a3b8",
                    }}
                    axisLine={false}
                    tickLine={false}
                  />

                  <YAxis
                    tick={{
                      fontSize: 11,
                      fill: "#94a3b8",
                    }}
                    axisLine={false}
                    tickLine={false}
                  />

                  <Tooltip
                    formatter={(value: any) => [
                      formatCurrency(Number(value)),
                      "الإيرادات",
                    ]}
                    contentStyle={{
                      direction: "rtl",
                      fontSize: 12,
                      borderRadius: 14,
                      border: "1px solid #e2e8f0",
                      boxShadow:
                        "0 10px 30px rgba(15, 23, 42, 0.08)",
                    }}
                  />

                  <Bar
                    dataKey="revenue"
                    fill="#10b981"
                    radius={[8, 8, 2, 2]}
                    maxBarSize={42}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </Card>
      </div>

      {/* Teachers Performance */}
      <Card className="overflow-hidden p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-purple-50 text-purple-600">
              <GraduationCap className="h-5 w-5" />
            </div>

            <div>
              <h2 className="font-extrabold text-slate-800">
                أداء المعلمين
              </h2>

              <p className="mt-0.5 text-xs text-slate-400">
                أفضل المعلمين من حيث الإيرادات
              </p>
            </div>
          </div>

          <span className="rounded-full bg-slate-50 px-3 py-1.5 text-[11px] font-bold text-slate-500">
            أعلى 6 معلمين
          </span>
        </div>

        {loading ? (
          <Skeleton className="mt-6 h-80 rounded-2xl" />
        ) : teachers.length === 0 ? (
          <div className="mt-6 flex min-h-72 items-center justify-center rounded-2xl bg-slate-50">
            <div className="text-center">
              <GraduationCap className="mx-auto h-8 w-8 text-slate-300" />

              <p className="mt-3 text-sm font-bold text-slate-500">
                لا توجد بيانات كافية بعد
              </p>

              <p className="mt-1 text-xs text-slate-400">
                ستظهر بيانات المعلمين عند توفر إيرادات مسجلة.
              </p>
            </div>
          </div>
        ) : (
          <div className="mt-6 h-80" dir="ltr">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={teachers}
                layout="vertical"
                margin={{
                  top: 5,
                  right: 20,
                  left: 10,
                  bottom: 5,
                }}
              >
                <CartesianGrid
                  strokeDasharray="4 4"
                  stroke="#e2e8f0"
                  horizontal={false}
                />

                <XAxis
                  type="number"
                  tick={{
                    fontSize: 11,
                    fill: "#94a3b8",
                  }}
                  axisLine={false}
                  tickLine={false}
                />

                <YAxis
                  type="category"
                  dataKey="name"
                  tick={{
                    fontSize: 11,
                    fill: "#64748b",
                  }}
                  axisLine={false}
                  tickLine={false}
                  width={110}
                />

                <Tooltip
                  formatter={(value: any, key: any) => [
                    key === "revenue"
                      ? formatCurrency(Number(value))
                      : value,
                    key === "revenue"
                      ? "الإيرادات"
                      : "عدد الطلاب",
                  ]}
                  contentStyle={{
                    direction: "rtl",
                    fontSize: 12,
                    borderRadius: 14,
                    border: "1px solid #e2e8f0",
                    boxShadow:
                      "0 10px 30px rgba(15, 23, 42, 0.08)",
                  }}
                />

                <Bar
                  dataKey="revenue"
                  fill="#8b5cf6"
                  radius={[0, 8, 8, 0]}
                  maxBarSize={28}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </Card>
    </div>
  );
}

function StatCard({
  icon,
  iconClass,
  label,
  value,
  description,
}: {
  icon: React.ReactNode;
  iconClass: string;
  label: string;
  value: React.ReactNode;
  description: string;
}) {
  return (
    <Card className="group relative overflow-hidden p-5 transition duration-300 hover:-translate-y-0.5 hover:shadow-lg">
      <div className="absolute -left-10 -top-10 h-28 w-28 rounded-full bg-slate-100/60 blur-2xl transition group-hover:scale-125" />

      <div className="relative">
        <div className="flex items-start justify-between">
          <div
            className={`flex h-11 w-11 items-center justify-center rounded-xl ${iconClass}`}
          >
            {icon}
          </div>

          <ArrowUpLeft className="h-4 w-4 text-slate-300 transition group-hover:text-brand-500" />
        </div>

        <p className="mt-5 text-xs font-semibold text-slate-400">
          {label}
        </p>

        <p className="mt-1 text-2xl font-extrabold tracking-tight text-slate-900">
          {value}
        </p>

        <p className="mt-1.5 text-xs text-slate-400">
          {description}
        </p>
      </div>
    </Card>
  );
}

function ChartEmpty() {
  return (
    <div className="mt-6 flex h-72 items-center justify-center rounded-2xl bg-slate-50">
      <div className="text-center">
        <BarChart3 className="mx-auto h-8 w-8 text-slate-300" />

        <p className="mt-3 text-sm font-bold text-slate-500">
          لا توجد بيانات كافية
        </p>

        <p className="mt-1 text-xs text-slate-400">
          ستظهر الإحصائيات هنا عند توفر بيانات جديدة.
        </p>
      </div>
    </div>
  );
}