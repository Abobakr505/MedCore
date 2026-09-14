import { useEffect, useState } from "react";
import { ListChecks } from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { Skeleton } from "@/components/ui/Skeleton";
import { EmptyState } from "@/components/ui/EmptyState";
import { fetchAllEnrollments } from "@/services/enrollments";
import { ENROLLMENT_STATUS_LABELS } from "@/types";
import { formatDate } from "@/utils/format";

const STATUS_COLORS: Record<string, "green" | "amber" | "red" | "slate"> = {
  active: "green", pending: "amber", suspended: "red", cancelled: "slate",
};

export default function EnrollmentsAdminPage() {
  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAllEnrollments().then(setRows).finally(() => setLoading(false));
  }, []);

  return (
    <div>
      <h1 className="text-2xl font-extrabold text-brand-900">الاشتراكات</h1>
      <div className="mt-6 overflow-x-auto rounded-2xl border border-slate-100">
        {loading ? (
          <div className="p-6 space-y-3">{Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-10" />)}</div>
        ) : rows.length === 0 ? (
          <EmptyState icon={<ListChecks className="w-6 h-6" />} title="لا توجد اشتراكات بعد" />
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-right text-xs font-bold text-slate-500">
              <tr>
                <th className="px-5 py-3">الطالب</th>
                <th className="px-5 py-3">الكورس</th>
                <th className="px-5 py-3">تاريخ الاشتراك</th>
                <th className="px-5 py-3">الحالة</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {rows.map((r) => (
                <tr key={r.id}>
                  <td className="px-5 py-3 font-semibold text-slate-800">{r.student?.full_name}</td>
                  <td className="px-5 py-3 text-slate-500">{r.course?.title}</td>
                  <td className="px-5 py-3 text-slate-400">{formatDate(r.enrolled_at)}</td>
                  <td className="px-5 py-3"><Badge color={STATUS_COLORS[r.status]}>{ENROLLMENT_STATUS_LABELS[r.status]}</Badge></td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
