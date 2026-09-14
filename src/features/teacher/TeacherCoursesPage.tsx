import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Plus, Settings2, Eye, EyeOff, Trash2, FileStack } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Modal } from "@/components/ui/Modal";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { Skeleton } from "@/components/ui/Skeleton";
import { EmptyState } from "@/components/ui/EmptyState";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/contexts/ToastContext";
import { fetchTeacherCourses, createCourse, updateCourse, togglePublish, deleteCourse } from "@/services/teacherCourses";
import type { Course } from "@/types";
import { COLLEGE_LABELS } from "@/types";
import { courseSchema, type CourseFormValues } from "@/utils/validation";
import { formatCurrency } from "@/utils/format";

export default function TeacherCoursesPage() {
  const { session } = useAuth();
  const { showToast } = useToast();
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Course | null>(null);
  const [editingCourse, setEditingCourse] = useState<Course | null>(null);
  const [editStatus, setEditStatus] = useState<"draft" | "published">("draft");

  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm<CourseFormValues>({
    resolver: zodResolver(courseSchema),
    defaultValues: { college: "medicine", price: 0 },
  });

  const {
    register: registerEdit,
    handleSubmit: handleEditSubmit,
    reset: resetEdit,
    formState: { errors: editErrors, isSubmitting: isEditSubmitting },
  } = useForm<CourseFormValues>({
    resolver: zodResolver(courseSchema),
    defaultValues: { college: "medicine", price: 0 },
  });

  const load = async () => {
    if (!session?.user) return;
    setLoading(true);
    setCourses(await fetchTeacherCourses(session.user.id));
    setLoading(false);
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session?.user?.id]);

  const onSubmit = async (values: CourseFormValues) => {
    if (!session?.user) return;
    try {
      await createCourse({ teacherId: session.user.id, ...values });
      showToast("تم إنشاء الكورس كمسودة، أضف الأقسام والدروس ثم انشره", "success");
      reset();
      setModalOpen(false);
      load();
    } catch {
      showToast("تعذّر إنشاء الكورس", "error");
    }
  };

  const openEditModal = (course: Course) => {
    setEditingCourse(course);
    setEditStatus(course.is_published ? "published" : "draft");
    resetEdit({
      title: course.title,
      description: course.description ?? "",
      college: course.college,
      price: Number(course.price),
    });
    setEditModalOpen(true);
  };

  const handleEdit = async (values: CourseFormValues) => {
    if (!editingCourse) return;

    try {
      await updateCourse(editingCourse.id, {
        title: values.title,
        description: values.description,
        college: values.college,
        price: values.price,
        status: editStatus,
        is_published: editStatus === "published",
      });

      showToast("تم تحديث بيانات الكورس وحالة النشر", "success");
      setEditModalOpen(false);
      setEditingCourse(null);
      resetEdit();
      load();
    } catch {
      showToast("تعذّر تحديث الكورس", "error");
    }
  };

  const handleTogglePublish = async (course: Course) => {
    try {
      await togglePublish(course.id, !course.is_published);
      showToast(course.is_published ? "تم إلغاء نشر الكورس" : "تم نشر الكورس بنجاح", "success");
      load();
    } catch {
      showToast("تعذّر تحديث حالة النشر", "error");
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      await deleteCourse(deleteTarget.id);
      showToast("تم حذف الكورس", "success");
      setDeleteTarget(null);
      load();
    } catch {
      showToast("تعذّر حذف الكورس", "error");
    }
  };

  return (
    <div>
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-extrabold text-brand-900">كورساتي</h1>
        <Button onClick={() => setModalOpen(true)}><Plus className="w-4 h-4" /> كورس جديد</Button>
      </div>

      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {loading ? (
          Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-48 rounded-2xl" />)
        ) : courses.length === 0 ? (
          <div className="col-span-full">
            <EmptyState icon={<FileStack className="w-6 h-6" />} title="لم تنشئ أي كورس بعد" action={<Button onClick={() => setModalOpen(true)}>إنشاء كورس</Button>} />
          </div>
        ) : (
          courses.map((c) => (
            <Card key={c.id} className="p-5">
              <div className="flex items-start justify-between">
                <Badge color={c.is_published ? "green" : "amber"}>{c.is_published ? "منشور" : "مسودة"}</Badge>
                <span className="text-xs text-slate-400">{COLLEGE_LABELS[c.college]}</span>
              </div>
              <p className="mt-3 font-bold text-slate-800 line-clamp-1">{c.title}</p>
              <p className="mt-1 text-sm font-semibold text-brand-500">{formatCurrency(c.price)}</p>
              <p className="mt-1 text-xs text-slate-400">{c.students_count} طالب مشترك</p>
              <div className="mt-4 flex gap-2">
                <Link to={`/app/teacher/courses/${c.id}/builder`} className="flex-1">
                  <Button variant="secondary" size="sm" className="w-full"><Settings2 className="w-4 h-4" /> إدارة المحتوى</Button>
                </Link>
                <Button size="sm" variant="outline" onClick={() => openEditModal(c)} title="تعديل">
                  <Settings2 className="w-4 h-4" />
                </Button>
                <Button size="sm" variant="outline" onClick={() => handleTogglePublish(c)} title={c.is_published ? "إلغاء النشر" : "نشر"}>
                  {c.is_published ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </Button>
                <Button size="sm" variant="outline" onClick={() => setDeleteTarget(c)} title="حذف">
                  <Trash2 className="w-4 h-4 text-red-500" />
                </Button>
              </div>
            </Card>
          ))
        )}
      </div>

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title="إنشاء كورس جديد">
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <Input label="عنوان الكورس" error={errors.title?.message} {...register("title")} />
          <div>
            <label className="block mb-1.5 text-sm font-medium text-slate-700">الوصف</label>
            <textarea rows={3} className="w-full rounded-xl border border-slate-300 px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-brand-500/30 focus:border-brand-500" {...register("description")} />
            {errors.description && <p className="mt-1 text-xs text-red-500">{errors.description.message}</p>}
          </div>
          <Select label="الكلية" {...register("college")}>
            <option value="medicine">طب بشري</option>
            <option value="dentistry">طب أسنان</option>
            <option value="pharmacy">صيدلة</option>
          </Select>
          <Input label="السعر (ر.س)" type="number" step="0.01" error={errors.price?.message} {...register("price")} />
          <Button type="submit" className="w-full" isLoading={isSubmitting}>إنشاء الكورس</Button>
        </form>
      </Modal>

      <Modal open={editModalOpen} onClose={() => setEditModalOpen(false)} title="تعديل الكورس">
        <form onSubmit={handleEditSubmit(handleEdit)} className="space-y-4">
          <Input label="عنوان الكورس" error={editErrors.title?.message} {...registerEdit("title")} />
          <div>
            <label className="block mb-1.5 text-sm font-medium text-slate-700">الوصف</label>
            <textarea rows={3} className="w-full rounded-xl border border-slate-300 px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-brand-500/30 focus:border-brand-500" {...registerEdit("description")} />
            {editErrors.description && <p className="mt-1 text-xs text-red-500">{editErrors.description.message}</p>}
          </div>
          <Select label="الكلية" {...registerEdit("college")}>
            <option value="medicine">طب بشري</option>
            <option value="dentistry">طب أسنان</option>
            <option value="pharmacy">صيدلة</option>
          </Select>
          <Input label="السعر (ر.س)" type="number" step="0.01" error={editErrors.price?.message} {...registerEdit("price")} />

          <div>
            <label className="block mb-1.5 text-sm font-medium text-slate-700">حالة الكورس</label>
            <Select value={editStatus} onChange={(e) => setEditStatus(e.target.value as "draft" | "published")}>
              <option value="draft">مسودة</option>
              <option value="published">منشور</option>
            </Select>
          </div>

          <Button type="submit" className="w-full" isLoading={isEditSubmitting}>حفظ التعديلات</Button>
        </form>
      </Modal>

      <ConfirmDialog
        open={!!deleteTarget}
        title="حذف الكورس"
        description={`سيتم حذف "${deleteTarget?.title}" نهائيًا مع كل أقسامه ودروسه. هل أنت متأكد؟`}
        danger
        confirmLabel="حذف نهائي"
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
}
