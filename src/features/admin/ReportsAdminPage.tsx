import { useEffect, useState } from "react";
import { BarChart3, Users, Wallet, FileStack, TrendingUp } from "lucide-react";
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
import { fetchDashboardStats, type DashboardStats } from "@/services/admin";
import {
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

  return (
    <div>
      <h1 className="text-2xl font-extrabold text-brand-900">التقارير</h1>
      <p className="mt-1 text-sm text-slate-500">ملخص عام لأداء المنصة حتى الآن</p>

      {/* Summary cards */}
      {!stats ? (
        <div className="mt-6 grid gap-4 sm:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-32 rounded-2xl" />
          ))}
        </div>
      ) : (
        <div className="mt-6 grid gap-6 sm:grid-cols-3">
          <Card className="p-6">
            <Users className="h-6 w-6 text-brand-500" />
            <p className="mt-3 text-2xl font-extrabold text-slate-800">
              {stats.studentsCount + stats.teachersCount}
            </p>
            <p className="mt-1 text-sm text-slate-500">
              إجمالي المستخدمين ({stats.studentsCount} طالب، {stats.teachersCount} معلم)
            </p>
          </Card>
          <Card className="p-6">
            <Wallet className="h-6 w-6 text-emerald-500" />
            <p className="mt-3 text-2xl font-extrabold text-slate-800">
              {formatCurrency(stats.revenue)}
            </p>
            <p className="mt-1 text-sm text-slate-500">إجمالي الإيرادات المعتمدة</p>
          </Card>
          <Card className="p-6">
            <FileStack className="h-6 w-6 text-amber-500" />
            <p className="mt-3 text-2xl font-extrabold text-slate-800">{stats.coursesCount}</p>
            <p className="mt-1 text-sm text-slate-500">إجمالي الكورسات على المنصة</p>
          </Card>
        </div>
      )}

      {/* نمو المستخدمين والإيرادات */}
      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <Card className="p-6">
          <div className="flex items-center gap-2 text-slate-700">
            <TrendingUp className="h-5 w-5 text-brand-500" />
            <h2 className="font-bold">نمو المستخدمين الجدد (آخر 6 أشهر)</h2>
          </div>

          {loading ? (
            <Skeleton className="mt-4 h-64 rounded-xl" />
          ) : (
            <div className="mt-4 h-64" dir="ltr">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={growth}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis dataKey="month" tick={{ fontSize: 12 }} stroke="#94a3b8" />
                  <YAxis tick={{ fontSize: 12 }} stroke="#94a3b8" allowDecimals={false} />
                  <Tooltip
                    formatter={(value: number) => [value, "مستخدم جديد"]}
                    contentStyle={{ direction: "rtl", fontSize: 13, borderRadius: 12 }}
                  />
                  <Line
                    type="monotone"
                    dataKey="users"
                    stroke="#14b8a6"
                    strokeWidth={2.5}
                    dot={{ r: 4 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}
        </Card>

        <Card className="p-6">
          <div className="flex items-center gap-2 text-slate-700">
            <Wallet className="h-5 w-5 text-emerald-500" />
            <h2 className="font-bold">الإيرادات الشهرية (آخر 6 أشهر)</h2>
          </div>

          {loading ? (
            <Skeleton className="mt-4 h-64 rounded-xl" />
          ) : (
            <div className="mt-4 h-64" dir="ltr">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={growth}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis dataKey="month" tick={{ fontSize: 12 }} stroke="#94a3b8" />
                  <YAxis tick={{ fontSize: 12 }} stroke="#94a3b8" />
                  <Tooltip
                    formatter={(value: number) => [formatCurrency(value), "الإيرادات"]}
                    contentStyle={{ direction: "rtl", fontSize: 13, borderRadius: 12 }}
                  />
                  <Bar dataKey="revenue" fill="#10b981" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </Card>
      </div>

      {/* أداء المعلمين */}
      <Card className="mt-6 p-6">
        <div className="flex items-center gap-2 text-slate-700">
          <BarChart3 className="h-5 w-5 text-brand-500" />
          <h2 className="font-bold">أفضل المعلمين من حيث الإيرادات</h2>
        </div>

        {loading ? (
          <Skeleton className="mt-4 h-72 rounded-xl" />
        ) : teachers.length === 0 ? (
          <p className="mt-4 text-sm text-slate-400">لا توجد بيانات كافية بعد.</p>
        ) : (
          <div className="mt-4 h-72" dir="ltr">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={teachers} layout="vertical" margin={{ left: 20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" horizontal={false} />
                <XAxis type="number" tick={{ fontSize: 12 }} stroke="#94a3b8" />
                <YAxis
                  type="category"
                  dataKey="name"
                  tick={{ fontSize: 12 }}
                  stroke="#94a3b8"
                  width={110}
                />
                <Tooltip
                  formatter={(value: number, key: string) => [
                    key === "revenue" ? formatCurrency(value) : value,
                    key === "revenue" ? "الإيرادات" : "عدد الطلاب",
                  ]}
                  contentStyle={{ direction: "rtl", fontSize: 13, borderRadius: 12 }}
                />
                <Bar dataKey="revenue" fill="#14b8a6" radius={[0, 6, 6, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </Card>
    </div>
  );
}