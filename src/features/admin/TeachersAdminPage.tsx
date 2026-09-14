import { useEffect, useState } from "react";
import { GraduationCap, Ban, CheckCircle2 } from "lucide-react";
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

export default function TeachersAdminPage() {
  const { showToast } = useToast();
  const [teachers, setTeachers] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    setTeachers(await fetchUsersByRole("teacher"));
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const toggleStatus = async (teacher: Profile) => {
    const newStatus = teacher.status === "suspended" ? "active" : "suspended";
    try {
      await updateUserStatus(teacher.id, newStatus);
      showToast(newStatus === "suspended" ? "تم إيقاف الحساب" : "تم تفعيل الحساب", "success");
      load();
    } catch {
      showToast("تعذّر تحديث الحالة", "error");
    }
  };

  return (
    <div>
      <h1 className="text-2xl font-extrabold text-brand-900">إدارة المعلمين</h1>
      <div className="mt-6 overflow-x-auto rounded-2xl border border-slate-100">
        {loading ? (
          <div className="p-6 space-y-3">{Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-10" />)}</div>
        ) : teachers.length === 0 ? (
          <EmptyState icon={<GraduationCap className="w-6 h-6" />} title="لا يوجد معلمون مسجّلون" />
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
              {teachers.map((t) => (
                <tr key={t.id}>
                  <td className="px-5 py-3 font-semibold text-slate-800">{t.full_name}</td>
                  <td className="px-5 py-3 text-slate-500">{t.email}</td>
                  <td className="px-5 py-3 text-slate-500">{COLLEGE_LABELS[t.college]}</td>
                  <td className="px-5 py-3 text-slate-400">{formatDate(t.created_at)}</td>
                  <td className="px-5 py-3"><Badge color={STATUS_COLORS[t.status]}>{STATUS_LABELS[t.status]}</Badge></td>
                  <td className="px-5 py-3">
                    <Button size="sm" variant={t.status === "suspended" ? "secondary" : "outline"} onClick={() => toggleStatus(t)}>
                      {t.status === "suspended" ? <CheckCircle2 className="w-3.5 h-3.5" /> : <Ban className="w-3.5 h-3.5 text-red-500" />}
                      {t.status === "suspended" ? "تفعيل" : "إيقاف"}
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
