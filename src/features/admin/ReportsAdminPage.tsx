import { useEffect, useState } from "react";
import { BarChart3, Users, Wallet, FileStack } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Skeleton } from "@/components/ui/Skeleton";
import { fetchDashboardStats, type DashboardStats } from "@/services/admin";
import { formatCurrency } from "@/utils/format";

export default function ReportsAdminPage() {
  const [stats, setStats] = useState<DashboardStats | null>(null);

  useEffect(() => {
    fetchDashboardStats().then(setStats);
  }, []);

  return (
    <div>
      <h1 className="text-2xl font-extrabold text-brand-900">التقارير</h1>
      <p className="mt-1 text-sm text-slate-500">ملخص عام لأداء المنصة حتى الآن</p>

      {!stats ? (
        <div className="mt-6 grid gap-4 sm:grid-cols-3">{Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-32 rounded-2xl" />)}</div>
      ) : (
        <div className="mt-6 grid gap-6 sm:grid-cols-3">
          <Card className="p-6">
            <Users className="h-6 w-6 text-brand-500" />
            <p className="mt-3 text-2xl font-extrabold text-slate-800">{stats.studentsCount + stats.teachersCount}</p>
            <p className="mt-1 text-sm text-slate-500">إجمالي المستخدمين ({stats.studentsCount} طالب، {stats.teachersCount} معلم)</p>
          </Card>
          <Card className="p-6">
            <Wallet className="h-6 w-6 text-emerald-500" />
            <p className="mt-3 text-2xl font-extrabold text-slate-800">{formatCurrency(stats.revenue)}</p>
            <p className="mt-1 text-sm text-slate-500">إجمالي الإيرادات المعتمدة</p>
          </Card>
          <Card className="p-6">
            <FileStack className="h-6 w-6 text-amber-500" />
            <p className="mt-3 text-2xl font-extrabold text-slate-800">{stats.coursesCount}</p>
            <p className="mt-1 text-sm text-slate-500">إجمالي الكورسات على المنصة</p>
          </Card>
        </div>
      )}

      <Card className="mt-6 p-6">
        <div className="flex items-center gap-2 text-slate-500">
          <BarChart3 className="w-5 h-5" />
          <p className="text-sm">تقارير مفصّلة إضافية (رسوم بيانية للنمو الشهري، أداء كل معلم) يمكن إضافتها في مرحلة لاحقة بعد تجميع بيانات كافية.</p>
        </div>
      </Card>
    </div>
  );
}
