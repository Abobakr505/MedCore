import { useEffect, useState } from "react";
import { GraduationCap } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Skeleton } from "@/components/ui/Skeleton";
import { EmptyState } from "@/components/ui/EmptyState";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/lib/supabase";
import { ENROLLMENT_STATUS_LABELS } from "@/types";
import { formatDate } from "@/utils/format";

interface StudentRow {
  id: string;
  student_id: string;
  status: string;
  enrolled_at: string | null;
  student: { full_name: string; email: string } | null;
  course: { title: string } | null;
}

export default function TeacherStudentsPage() {
  const { session } = useAuth();
  const [rows, setRows] = useState<StudentRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!session?.user) return;
    (async () => {
      const { data } = await supabase
        .from("enrollments")
        .select("id, student_id, status, enrolled_at, student:profiles(full_name, email), course:courses!inner(title, teacher_id)")
        .eq("course.teacher_id", session.user.id)
        .order("enrolled_at", { ascending: false });
      setRows((data ?? []) as unknown as StudentRow[]);
      setLoading(false);
    })();
  }, [session?.user?.id]);

  return (
    <div>
      <h1 className="text-2xl font-extrabold text-brand-900">طلابي</h1>
      <div className="mt-6 overflow-x-auto rounded-2xl border border-slate-100">
        {loading ? (
          <div className="p-6 space-y-3">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-10" />)}</div>
        ) : rows.length === 0 ? (
          <EmptyState icon={<GraduationCap className="w-6 h-6" />} title="لا يوجد طلاب مشتركون بعد" />
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
                  <td className="px-5 py-3">
                    <p className="font-semibold text-slate-800">{r.student?.full_name}</p>
                    <p className="text-xs text-slate-400">{r.student?.email}</p>
                  </td>
                  <td className="px-5 py-3 text-slate-600">{r.course?.title}</td>
                  <td className="px-5 py-3 text-slate-400">{formatDate(r.enrolled_at)}</td>
                  <td className="px-5 py-3"><Badge color={r.status === "active" ? "green" : "slate"}>{ENROLLMENT_STATUS_LABELS[r.status]}</Badge></td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
