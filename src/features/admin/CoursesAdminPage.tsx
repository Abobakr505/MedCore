import { useEffect, useState } from "react";
import {
FileStack,
Trash2,
BookOpen,
Users,
CircleDollarSign,
Search,
GraduationCap,
Eye,
} from "lucide-react";

import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { Skeleton } from "@/components/ui/Skeleton";
import { EmptyState } from "@/components/ui/EmptyState";

import { useToast } from "@/contexts/ToastContext";
import {
fetchAllCoursesAdmin,
adminDeleteCourse,
} from "@/services/admin";

import { COLLEGE_LABELS } from "@/types";
import { formatCurrency } from "@/utils/format";

export default function CoursesAdminPage() {
const { showToast } = useToast();

const [courses, setCourses] = useState<any[]>([]);
const [loading, setLoading] = useState(true);
const [deleteTarget, setDeleteTarget] = useState<any | null>(null);
const [search, setSearch] = useState("");

const load = async () => {
setLoading(true);


try {
  const data = await fetchAllCoursesAdmin();
  setCourses(data);
} catch {
  showToast("تعذّر تحميل الكورسات", "error");
} finally {
  setLoading(false);
}


};

useEffect(() => {
load();
}, []);

const handleDelete = async () => {
if (!deleteTarget) return;


try {
  await adminDeleteCourse(deleteTarget.id);

  showToast("تم حذف الكورس بنجاح", "success");
  setDeleteTarget(null);

  await load();
} catch {
  showToast("تعذّر حذف الكورس", "error");
}


};

const filteredCourses = courses.filter((course) => {
const query = search.trim().toLowerCase();


if (!query) return true;

return (
  course.title?.toLowerCase().includes(query) ||
  course.teacher?.full_name?.toLowerCase().includes(query) ||
  COLLEGE_LABELS[course.college]?.toLowerCase().includes(query)
);


});

const publishedCount = courses.filter((c) => c.is_published).length;
const draftCount = courses.filter((c) => !c.is_published).length;

const totalStudents = courses.reduce(
(sum, course) => sum + Number(course.students_count || 0),
0
);

return ( <div className="space-y-6">
{/* Header */} <div className="relative overflow-hidden rounded-3xl border border-slate-200 bg-white p-6 shadow-sm"> <div className="absolute -right-16 -top-16 h-40 w-40 rounded-full bg-brand-500/10 blur-3xl" /> <div className="absolute -bottom-20 left-20 h-40 w-40 rounded-full bg-amber-500/10 blur-3xl" />


    <div className="relative flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
      <div className="flex items-center gap-4">
        <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-brand-50 text-brand-600">
          <BookOpen className="h-7 w-7" />
        </div>

        <div>
          <h1 className="text-2xl font-extrabold tracking-tight text-slate-900">
            إدارة الكورسات
          </h1>

          <p className="mt-1 text-sm text-slate-500">
            إدارة ومتابعة جميع الكورسات الموجودة على المنصة
          </p>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-2 sm:gap-3">
        <div className="min-w-[90px] rounded-2xl border border-slate-100 bg-slate-50 px-4 py-3 text-center">
          <p className="text-xl font-extrabold text-slate-900">
            {loading ? "—" : courses.length}
          </p>
          <p className="mt-0.5 text-[11px] font-medium text-slate-400">
            إجمالي الكورسات
          </p>
        </div>

        <div className="min-w-[90px] rounded-2xl border border-emerald-100 bg-emerald-50 px-4 py-3 text-center">
          <p className="text-xl font-extrabold text-emerald-700">
            {loading ? "—" : publishedCount}
          </p>
          <p className="mt-0.5 text-[11px] font-medium text-emerald-600">
            منشورة
          </p>
        </div>

        <div className="min-w-[90px] rounded-2xl border border-amber-100 bg-amber-50 px-4 py-3 text-center">
          <p className="text-xl font-extrabold text-amber-700">
            {loading ? "—" : draftCount}
          </p>
          <p className="mt-0.5 text-[11px] font-medium text-amber-600">
            مسودات
          </p>
        </div>
      </div>
    </div>
  </div>

  {/* Quick stats */}
  <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
    <Card className="group relative overflow-hidden border-slate-200 p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
      <div className="absolute -left-8 -top-8 h-24 w-24 rounded-full bg-blue-500/5 blur-2xl transition group-hover:bg-blue-500/10" />

      <div className="relative flex items-center gap-4">
        <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
          <Users className="h-5 w-5" />
        </div>

        <div>
          <p className="text-2xl font-extrabold text-slate-900">
            {loading ? "—" : totalStudents}
          </p>
          <p className="text-sm text-slate-500">
            إجمالي اشتراكات الطلاب
          </p>
        </div>
      </div>
    </Card>

    <Card className="group relative overflow-hidden border-slate-200 p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
      <div className="absolute -left-8 -top-8 h-24 w-24 rounded-full bg-emerald-500/5 blur-2xl" />

      <div className="relative flex items-center gap-4">
        <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600">
          <CircleDollarSign className="h-5 w-5" />
        </div>

        <div>
          <p className="text-2xl font-extrabold text-slate-900">
            {loading ? "—" : courses.length}
          </p>
          <p className="text-sm text-slate-500">
            كورسات متاحة للإدارة
          </p>
        </div>
      </div>
    </Card>

    <Card className="group relative overflow-hidden border-slate-200 p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md sm:col-span-2 lg:col-span-1">
      <div className="absolute -left-8 -top-8 h-24 w-24 rounded-full bg-violet-500/5 blur-2xl" />

      <div className="relative flex items-center gap-4">
        <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-violet-50 text-violet-600">
          <GraduationCap className="h-5 w-5" />
        </div>

        <div>
          <p className="text-2xl font-extrabold text-slate-900">
            {loading ? "—" : new Set(courses.map((c) => c.teacher_id)).size}
          </p>
          <p className="text-sm text-slate-500">
            معلمون لديهم كورسات
          </p>
        </div>
      </div>
    </Card>
  </div>

  {/* Search */}
  <Card className="border-slate-200 p-3 shadow-sm">
    <div className="relative">
      <Search className="absolute right-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />

      <input
        type="text"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder="ابحث باسم الكورس أو المعلم أو الكلية..."
        className="w-full rounded-xl border border-transparent bg-slate-50 py-3 pr-11 pl-4 text-sm text-slate-700 outline-none transition placeholder:text-slate-400 focus:border-brand-300 focus:bg-white focus:ring-4 focus:ring-brand-500/10"
      />
    </div>
  </Card>

  {/* Courses */}
  <Card className="overflow-hidden border-slate-200 p-0 shadow-sm">
    <div className="flex flex-col gap-2 border-b border-slate-100 bg-slate-50/70 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <h2 className="font-extrabold text-slate-800">
          قائمة الكورسات
        </h2>
        <p className="mt-0.5 text-xs text-slate-400">
          {loading
            ? "جاري تحميل البيانات..."
            : `${filteredCourses.length} كورس`}
        </p>
      </div>

      <div className="flex items-center gap-2 text-xs text-slate-400">
        <FileStack className="h-4 w-4" />
        عرض جميع الكورسات
      </div>
    </div>

    {loading ? (
      <div className="space-y-3 p-5">
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="h-16 rounded-xl" />
        ))}
      </div>
    ) : filteredCourses.length === 0 ? (
      <div className="py-12">
        <EmptyState
          icon={<BookOpen className="h-6 w-6" />}
          title={search ? "لا توجد نتائج" : "لا توجد كورسات بعد"}
        />
      </div>
    ) : (
      <>
        {/* Desktop table */}
        <div className="hidden overflow-x-auto md:block">
          <table className="w-full text-sm">
            <thead className="border-b border-slate-100 bg-slate-50/70 text-right text-xs font-bold text-slate-500">
              <tr>
                <th className="px-5 py-4">الكورس</th>
                <th className="px-5 py-4">المعلم</th>
                <th className="px-5 py-4">الكلية</th>
                <th className="px-5 py-4">السعر</th>
                <th className="px-5 py-4">الطلاب</th>
                <th className="px-5 py-4">الحالة</th>
                <th className="px-5 py-4 text-center">إجراء</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-100">
              {filteredCourses.map((c) => (
                <tr
                  key={c.id}
                  className="group transition hover:bg-slate-50/70"
                >
                  <td className="px-5 py-4">
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-brand-600">
                        <BookOpen className="h-4 w-4" />
                      </div>

                      <div className="min-w-0">
                        <p className="max-w-[230px] truncate font-extrabold text-slate-800">
                          {c.title}
                        </p>
                        <p className="mt-0.5 text-[11px] text-slate-400">
                          Course
                        </p>
                      </div>
                    </div>
                  </td>

                  <td className="px-5 py-4">
                    <div className="flex items-center gap-2">
                      <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-100 text-xs font-bold text-slate-500">
                        {c.teacher?.full_name?.charAt(0) || "م"}
                      </div>

                      <span className="font-medium text-slate-600">
                        {c.teacher?.full_name || "غير محدد"}
                      </span>
                    </div>
                  </td>

                  <td className="px-5 py-4 text-slate-500">
                    {COLLEGE_LABELS[c.college] || "غير محدد"}
                  </td>

                  <td className="px-5 py-4">
                    <span className="font-bold text-slate-700">
                      {formatCurrency(c.price)}
                    </span>
                  </td>

                  <td className="px-5 py-4">
                    <div className="flex items-center gap-1.5 text-slate-500">
                      <Users className="h-4 w-4" />
                      {c.students_count || 0}
                    </div>
                  </td>

                  <td className="px-5 py-4">
                    <Badge
                      color={c.is_published ? "green" : "amber"}
                    >
                      {c.is_published ? "منشور" : "مسودة"}
                    </Badge>
                  </td>

                  <td className="px-5 py-4">
                    <div className="flex items-center justify-center gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        title="حذف الكورس"
                        onClick={() => setDeleteTarget(c)}
                        className="border-red-100 hover:border-red-200 hover:bg-red-50"
                      >
                        <Trash2 className="h-3.5 w-3.5 text-red-500" />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Mobile cards */}
        <div className="space-y-3 p-3 md:hidden">
          {filteredCourses.map((c) => (
            <div
              key={c.id}
              className="rounded-2xl border border-slate-100 bg-white p-4 transition hover:border-slate-200 hover:shadow-sm"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex min-w-0 items-center gap-3">
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-brand-600">
                    <BookOpen className="h-5 w-5" />
                  </div>

                  <div className="min-w-0">
                    <p className="truncate font-extrabold text-slate-800">
                      {c.title}
                    </p>

                    <p className="mt-1 text-xs text-slate-400">
                      {c.teacher?.full_name || "معلم غير محدد"}
                    </p>
                  </div>
                </div>

                <Badge color={c.is_published ? "green" : "amber"}>
                  {c.is_published ? "منشور" : "مسودة"}
                </Badge>
              </div>

              <div className="mt-4 grid grid-cols-3 gap-2">
                <div className="rounded-xl bg-slate-50 p-2.5">
                  <p className="text-[10px] text-slate-400">الكلية</p>
                  <p className="mt-1 truncate text-xs font-bold text-slate-600">
                    {COLLEGE_LABELS[c.college] || "—"}
                  </p>
                </div>

                <div className="rounded-xl bg-slate-50 p-2.5">
                  <p className="text-[10px] text-slate-400">السعر</p>
                  <p className="mt-1 text-xs font-bold text-slate-600">
                    {formatCurrency(c.price)}
                  </p>
                </div>

                <div className="rounded-xl bg-slate-50 p-2.5">
                  <p className="text-[10px] text-slate-400">الطلاب</p>
                  <p className="mt-1 text-xs font-bold text-slate-600">
                    {c.students_count || 0}
                  </p>
                </div>
              </div>

              <div className="mt-3 flex justify-end border-t border-slate-100 pt-3">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setDeleteTarget(c)}
                  className="border-red-100 text-red-500 hover:bg-red-50"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  حذف الكورس
                </Button>
              </div>
            </div>
          ))}
        </div>
      </>
    )}
  </Card>

  {/* Delete dialog */}
  <ConfirmDialog
    open={!!deleteTarget}
    title="حذف الكورس"
    description={`سيتم حذف "${deleteTarget?.title}" نهائيًا. هذا الإجراء لا يمكن التراجع عنه.`}
    danger
    confirmLabel="حذف نهائي"
    onConfirm={handleDelete}
    onCancel={() => setDeleteTarget(null)}
  />
</div>


);
}
