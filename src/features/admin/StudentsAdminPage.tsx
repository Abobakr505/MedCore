import { useEffect, useState } from "react";
import { Users, Ban, CheckCircle2 } from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Skeleton } from "@/components/ui/Skeleton";
import { EmptyState } from "@/components/ui/EmptyState";
import { useToast } from "@/contexts/ToastContext";
import { fetchUsersByRole, updateUserStatus } from "@/services/admin";
import type { Profile } from "@/types";
import { COLLEGE_LABELS } from "@/types";
import { formatDate } from "@/utils/format";

const STATUS_COLORS: Record<string, "green" | "red" | "amber"> = { active: "green", suspended: "red", pending_verification: "amber" };
const STATUS_LABELS: Record<string, string> = { active: "نشط", suspended: "موقوف", pending_verification: "بانتظار التفعيل" };

export default function StudentsAdminPage() {
  const { showToast } = useToast();
  const [students, setStudents] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    setStudents(await fetchUsersByRole("student"));
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

  const toggleStatus = async (student: Profile) => {
    const newStatus = student.status === "suspended" ? "active" : "suspended";
    try {
      await updateUserStatus(student.id, newStatus);
      showToast(newStatus === "suspended" ? "تم إيقاف الحساب" : "تم تفعيل الحساب", "success");
      load();
    } catch {
      showToast("تعذّر تحديث الحالة", "error");
    }
  };

  return (
    <div>
      <h1 className="text-2xl font-extrabold text-brand-900">إدارة الطلاب</h1>
      <div className="mt-6 overflow-x-auto rounded-2xl border border-slate-100">
        {loading ? (
          <div className="p-6 space-y-3">{Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-10" />)}</div>
        ) : students.length === 0 ? (
          <EmptyState icon={<Users className="w-6 h-6" />} title="لا يوجد طلاب مسجّلون" />
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-right text-xs font-bold text-slate-500">
              <tr>
                <th className="px-5 py-3">الاسم</th>
                <th className="px-5 py-3">البريد الإلكتروني</th>
                <th className="px-5 py-3">الكلية</th>
                <th className="px-5 py-3">تاريخ التسجيل</th>
                <th className="px-5 py-3">الحالة</th>
                <th className="px-5 py-3">إجراء</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {students.map((s) => (
                <tr key={s.id}>
                  <td className="px-5 py-3 font-semibold text-slate-800">{s.full_name}</td>
                  <td className="px-5 py-3 text-slate-500">{s.email}</td>
                  <td className="px-5 py-3 text-slate-500">{COLLEGE_LABELS[s.college]}</td>
                  <td className="px-5 py-3 text-slate-400">{formatDate(s.created_at)}</td>
                  <td className="px-5 py-3"><Badge color={STATUS_COLORS[s.status]}>{STATUS_LABELS[s.status]}</Badge></td>
                  <td className="px-5 py-3">
                    <Button size="sm" variant={s.status === "suspended" ? "secondary" : "outline"} onClick={() => toggleStatus(s)}>
                      {s.status === "suspended" ? <CheckCircle2 className="w-3.5 h-3.5" /> : <Ban className="w-3.5 h-3.5 text-red-500" />}
                      {s.status === "suspended" ? "تفعيل" : "إيقاف"}
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
