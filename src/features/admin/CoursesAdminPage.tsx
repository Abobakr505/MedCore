import { useEffect, useState } from "react";
import { FileStack, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { Skeleton } from "@/components/ui/Skeleton";
import { EmptyState } from "@/components/ui/EmptyState";
import { useToast } from "@/contexts/ToastContext";
import { fetchAllCoursesAdmin, adminDeleteCourse } from "@/services/admin";
import { COLLEGE_LABELS } from "@/types";
import { formatCurrency } from "@/utils/format";

export default function CoursesAdminPage() {
  const { showToast } = useToast();
  const [courses, setCourses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleteTarget, setDeleteTarget] = useState<any | null>(null);

  const load = async () => {
    setLoading(true);
    setCourses(await fetchAllCoursesAdmin());
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      await adminDeleteCourse(deleteTarget.id);
      showToast("تم حذف الكورس", "success");
      setDeleteTarget(null);
      load();
    } catch {
      showToast("تعذّر حذف الكورس", "error");
    }
  };

  return (
    <div>
      <h1 className="text-2xl font-extrabold text-brand-900">إدارة الكورسات</h1>
      <div className="mt-6 overflow-x-auto rounded-2xl border border-slate-100">
        {loading ? (
          <div className="p-6 space-y-3">{Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-10" />)}</div>
        ) : courses.length === 0 ? (
          <EmptyState icon={<FileStack className="w-6 h-6" />} title="لا توجد كورسات بعد" />
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-right text-xs font-bold text-slate-500">
              <tr>
                <th className="px-5 py-3">الكورس</th>
                <th className="px-5 py-3">المعلم</th>
                <th className="px-5 py-3">الكلية</th>
                <th className="px-5 py-3">السعر</th>
                <th className="px-5 py-3">الطلاب</th>
                <th className="px-5 py-3">الحالة</th>
                <th className="px-5 py-3">إجراء</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {courses.map((c) => (
                <tr key={c.id}>
                  <td className="px-5 py-3 font-semibold text-slate-800">{c.title}</td>
                  <td className="px-5 py-3 text-slate-500">{c.teacher?.full_name}</td>
                  <td className="px-5 py-3 text-slate-500">{COLLEGE_LABELS[c.college]}</td>
                  <td className="px-5 py-3 text-slate-500">{formatCurrency(c.price)}</td>
                  <td className="px-5 py-3 text-slate-500">{c.students_count}</td>
                  <td className="px-5 py-3"><Badge color={c.is_published ? "green" : "amber"}>{c.is_published ? "منشور" : "مسودة"}</Badge></td>
                  <td className="px-5 py-3">
                    <Button size="sm" variant="outline" onClick={() => setDeleteTarget(c)}><Trash2 className="w-3.5 h-3.5 text-red-500" /></Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <ConfirmDialog
        open={!!deleteTarget}
        title="حذف الكورس"
        description={`سيتم حذف "${deleteTarget?.title}" نهائيًا. هل أنت متأكد؟`}
        danger
        confirmLabel="حذف نهائي"
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
}
