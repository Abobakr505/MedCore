import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { motion, AnimatePresence } from "framer-motion";
import {
  Plus,
  Settings2,
  Eye,
  EyeOff,
  Trash2,
  FileStack,
  Search,
  BookOpen,
  Users,
  CheckCircle2,
  FileClock,
  GraduationCap,
  Sparkles,
  CircleDollarSign,
  ArrowUpLeft,
  RefreshCw,
  LayoutGrid,
} from "lucide-react";

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

import {
  fetchTeacherCourses,
  createCourse,
  updateCourse,
  togglePublish,
  deleteCourse,
} from "@/services/teacherCourses";

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

  const [editStatus, setEditStatus] = useState<"draft" | "published">(
    "draft"
  );

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<
    "all" | "published" | "draft"
  >("all");

  const [collegeFilter, setCollegeFilter] = useState("all");
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<CourseFormValues>({
    resolver: zodResolver(courseSchema),
    defaultValues: {
      college: "medicine",
      price: 0,
    },
  });

  const {
    register: registerEdit,
    handleSubmit: handleEditSubmit,
    reset: resetEdit,
    formState: {
      errors: editErrors,
      isSubmitting: isEditSubmitting,
    },
  } = useForm<CourseFormValues>({
    resolver: zodResolver(courseSchema),
    defaultValues: {
      college: "medicine",
      price: 0,
    },
  });

  const load = async () => {
    if (!session?.user) return;

    setLoading(true);

    try {
      const data = await fetchTeacherCourses(session.user.id);
      setCourses(data);
    } catch {
      showToast("تعذّر تحميل الكورسات", "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session?.user?.id]);

  const stats = useMemo(() => {
    const total = courses.length;

    const published = courses.filter(
      (course) => course.is_published
    ).length;

    const drafts = courses.filter(
      (course) => !course.is_published
    ).length;

    const students = courses.reduce(
      (total, course) => total + Number(course.students_count ?? 0),
      0
    );

    const estimatedValue = courses.reduce(
      (total, course) =>
        total +
        Number(course.price ?? 0) *
          Number(course.students_count ?? 0),
      0
    );

    return {
      total,
      published,
      drafts,
      students,
      estimatedValue,
    };
  }, [courses]);

  const filteredCourses = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();

    return courses.filter((course) => {
      const matchesSearch =
        !normalizedSearch ||
        course.title.toLowerCase().includes(normalizedSearch) ||
        (course.description ?? "")
          .toLowerCase()
          .includes(normalizedSearch);

      const matchesStatus =
        statusFilter === "all" ||
        (statusFilter === "published" && course.is_published) ||
        (statusFilter === "draft" && !course.is_published);

      const matchesCollege =
        collegeFilter === "all" ||
        course.college === collegeFilter;

      return matchesSearch && matchesStatus && matchesCollege;
    });
  }, [courses, search, statusFilter, collegeFilter]);

  const onSubmit = async (values: CourseFormValues) => {
    if (!session?.user) return;

    try {
      await createCourse({
        teacherId: session.user.id,
        ...values,
      });

      showToast(
        "تم إنشاء الكورس كمسودة، أضف الأقسام والدروس ثم انشره",
        "success"
      );

      reset();
      setModalOpen(false);

      await load();
    } catch {
      showToast("تعذّر إنشاء الكورس", "error");
    }
  };

  const openEditModal = (course: Course) => {
    setEditingCourse(course);

    setEditStatus(
      course.is_published ? "published" : "draft"
    );

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

      showToast(
        "تم تحديث بيانات الكورس وحالة النشر",
        "success"
      );

      setEditModalOpen(false);
      setEditingCourse(null);

      resetEdit();

      await load();
    } catch {
      showToast("تعذّر تحديث الكورس", "error");
    }
  };

  const handleTogglePublish = async (course: Course) => {
    setActionLoading(course.id);

    try {
      await togglePublish(
        course.id,
        !course.is_published
      );

      showToast(
        course.is_published
          ? "تم إلغاء نشر الكورس"
          : "تم نشر الكورس بنجاح",
        "success"
      );

      await load();
    } catch {
      showToast(
        "تعذّر تحديث حالة النشر",
        "error"
      );
    } finally {
      setActionLoading(null);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;

    setActionLoading(deleteTarget.id);

    try {
      await deleteCourse(deleteTarget.id);

      showToast(
        "تم حذف الكورس بنجاح",
        "success"
      );

      setDeleteTarget(null);

      await load();
    } catch {
      showToast(
        "تعذّر حذف الكورس",
        "error"
      );
    } finally {
      setActionLoading(null);
    }
  };

  return (
    <div
      dir="rtl"
      className="space-y-6 pb-8"
    >
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -12 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative overflow-hidden rounded-3xl border border-slate-100 bg-white p-5 shadow-sm sm:p-7"
      >
        <div className="pointer-events-none absolute -left-16 -top-16 h-40 w-40 rounded-full bg-brand-500/10 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-20 right-1/3 h-40 w-40 rounded-full bg-emerald-400/10 blur-3xl" />

        <div className="relative flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <div className="mb-3 flex items-center gap-2">
              <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-brand-50 text-brand-500">
                <GraduationCap className="h-5 w-5" />
              </div>

              <Badge color="green">
                لوحة المدرّس
              </Badge>
            </div>

            <h1 className="text-2xl font-black tracking-tight text-brand-900 sm:text-3xl">
              كورساتي
            </h1>

            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">
              أنشئ كورساتك، أدر المحتوى، تابع الطلاب، وتحكم
              في حالة النشر من مكان واحد.
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <Button
              variant="outline"
              onClick={load}
              disabled={loading}
            >
              <RefreshCw
                className={`h-4 w-4 ${
                  loading ? "animate-spin" : ""
                }`}
              />
              تحديث
            </Button>

            <Button
              onClick={() => setModalOpen(true)}
            >
              <Plus className="h-4 w-4" />
              كورس جديد
            </Button>
          </div>
        </div>
      </motion.div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard
          icon={<BookOpen className="h-5 w-5" />}
          label="إجمالي الكورسات"
          value={stats.total}
          description="كل الكورسات الخاصة بك"
          iconClass="bg-brand-50 text-brand-500"
          delay={0}
        />

        <StatCard
          icon={<CheckCircle2 className="h-5 w-5" />}
          label="الكورسات المنشورة"
          value={stats.published}
          description="متاحة للطلاب"
          iconClass="bg-emerald-50 text-emerald-600"
          delay={0.05}
        />

        <StatCard
          icon={<FileClock className="h-5 w-5" />}
          label="المسودات"
          value={stats.drafts}
          description="تحتاج إلى استكمال"
          iconClass="bg-amber-50 text-amber-600"
          delay={0.1}
        />

        <StatCard
          icon={<Users className="h-5 w-5" />}
          label="إجمالي الطلاب"
          value={stats.students}
          description="إجمالي الاشتراكات"
          iconClass="bg-sky-50 text-sky-600"
          delay={0.15}
        />
      </div>

      {/* Summary banner */}
      {stats.total > 0 && (
        <motion.div
          initial={{ opacity: 0, scale: 0.98 }}
          animate={{ opacity: 1, scale: 1 }}
          className="relative overflow-hidden rounded-2xl border border-brand-100 bg-gradient-to-l from-brand-50 via-white to-emerald-50 p-5"
        >
          <div className="absolute -left-8 -top-8 h-28 w-28 rounded-full bg-brand-500/10 blur-2xl" />

          <div className="relative flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-start gap-3">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-white shadow-sm">
                <Sparkles className="h-5 w-5 text-brand-500" />
              </div>

              <div>
                <p className="font-bold text-brand-900">
                  أداء جيد! استمر في تطوير محتواك
                </p>

                <p className="mt-1 text-xs leading-5 text-slate-500">
                  لديك {stats.published} كورسات منشورة و{" "}
                  {stats.students} اشتراك إجمالي.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 text-sm">
              <CircleDollarSign className="h-4 w-4 text-brand-500" />

              <span className="text-slate-500">
                قيمة الاشتراكات التقريبية:
              </span>

              <span className="font-black text-brand-900">
                {formatCurrency(stats.estimatedValue)}
              </span>
            </div>
          </div>
        </motion.div>
      )}

      {/* Filters */}
      <Card className="overflow-hidden border-slate-100 p-4 shadow-sm">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />

            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="ابحث باسم الكورس أو الوصف..."
              className="h-11 w-full rounded-xl border border-slate-200 bg-slate-50 pr-10 pl-4 text-sm text-slate-700 outline-none transition focus:border-brand-400 focus:bg-white focus:ring-4 focus:ring-brand-500/10"
            />
          </div>

          <div className="grid grid-cols-2 gap-2 sm:flex">
            <button
              type="button"
              onClick={() => setStatusFilter("all")}
              className={`rounded-xl px-4 py-2.5 text-xs font-bold transition ${
                statusFilter === "all"
                  ? "bg-brand-500 text-white shadow-sm"
                  : "bg-slate-100 text-slate-500 hover:bg-slate-200"
              }`}
            >
              الكل ({courses.length})
            </button>

            <button
              type="button"
              onClick={() => setStatusFilter("published")}
              className={`rounded-xl px-4 py-2.5 text-xs font-bold transition ${
                statusFilter === "published"
                  ? "bg-emerald-500 text-white shadow-sm"
                  : "bg-slate-100 text-slate-500 hover:bg-slate-200"
              }`}
            >
              منشور ({stats.published})
            </button>

            <button
              type="button"
              onClick={() => setStatusFilter("draft")}
              className={`rounded-xl px-4 py-2.5 text-xs font-bold transition ${
                statusFilter === "draft"
                  ? "bg-amber-500 text-white shadow-sm"
                  : "bg-slate-100 text-slate-500 hover:bg-slate-200"
              }`}
            >
              مسودة ({stats.drafts})
            </button>
          </div>

          <div className="min-w-[170px]">
            <Select
              value={collegeFilter}
              onChange={(e) =>
                setCollegeFilter(e.target.value)
              }
            >
              <option value="all">كل الكليات</option>
              <option value="medicine">طب بشري</option>
              <option value="dentistry">طب أسنان</option>
              <option value="pharmacy">صيدلة</option>
            </Select>
          </div>
        </div>

        {(search ||
          statusFilter !== "all" ||
          collegeFilter !== "all") && (
          <div className="mt-3 flex items-center justify-between border-t border-slate-100 pt-3">
            <p className="text-xs text-slate-400">
              عرض {filteredCourses.length} من{" "}
              {courses.length} كورس
            </p>

            <button
              type="button"
              onClick={() => {
                setSearch("");
                setStatusFilter("all");
                setCollegeFilter("all");
              }}
              className="text-xs font-bold text-brand-500 hover:underline"
            >
              مسح الفلاتر
            </button>
          </div>
        )}
      </Card>

      {/* Courses */}
      {loading ? (
        <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div
              key={i}
              className="overflow-hidden rounded-3xl border border-slate-100 bg-white"
            >
              <Skeleton className="h-28 rounded-none" />
              <div className="space-y-3 p-5">
                <Skeleton className="h-5 w-3/4" />
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-1/2" />
                <Skeleton className="h-10 w-full" />
              </div>
            </div>
          ))}
        </div>
      ) : filteredCourses.length === 0 ? (
        <Card className="border-dashed border-slate-200 bg-slate-50/50 p-10">
          <EmptyState
            icon={
              search ||
              statusFilter !== "all" ||
              collegeFilter !== "all" ? (
                <Search className="h-6 w-6" />
              ) : (
                <FileStack className="h-6 w-6" />
              )
            }
            title={
              search ||
              statusFilter !== "all" ||
              collegeFilter !== "all"
                ? "لا توجد نتائج مطابقة"
                : "لم تنشئ أي كورس بعد"
            }
            action={
              search ||
              statusFilter !== "all" ||
              collegeFilter !== "all" ? (
                <Button
                  variant="secondary"
                  onClick={() => {
                    setSearch("");
                    setStatusFilter("all");
                    setCollegeFilter("all");
                  }}
                >
                  عرض كل الكورسات
                </Button>
              ) : (
                <Button
                  onClick={() => setModalOpen(true)}
                >
                  <Plus className="h-4 w-4" />
                  إنشاء أول كورس
                </Button>
              )
            }
          />
        </Card>
      ) : (
        <motion.div
          layout
          className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3"
        >
          <AnimatePresence mode="popLayout">
            {filteredCourses.map((course, index) => (
              <CourseCard
                key={course.id}
                course={course}
                index={index}
                actionLoading={actionLoading === course.id}
                onEdit={() => openEditModal(course)}
                onTogglePublish={() =>
                  handleTogglePublish(course)
                }
                onDelete={() =>
                  setDeleteTarget(course)
                }
              />
            ))}
          </AnimatePresence>
        </motion.div>
      )}

      {/* Create Modal */}
      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title="إنشاء كورس جديد"
        maxWidth="max-w-xl"
      >
        <form
          onSubmit={handleSubmit(onSubmit)}
          className="space-y-5"
        >
          <div className="rounded-2xl bg-brand-50 p-4">
            <div className="flex gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white text-brand-500 shadow-sm">
                <Sparkles className="h-5 w-5" />
              </div>

              <div>
                <p className="text-sm font-bold text-brand-900">
                  ابدأ كورسًا جديدًا
                </p>
                <p className="mt-1 text-xs leading-5 text-brand-700/70">
                  سيتم إنشاء الكورس كمسودة، ويمكنك بعدها إضافة
                  الأقسام والدروس والاختبارات.
                </p>
              </div>
            </div>
          </div>

          <Input
            label="عنوان الكورس"
            placeholder="مثال: أساسيات التشريح"
            error={errors.title?.message}
            {...register("title")}
          />

          <div>
            <label className="mb-1.5 block text-sm font-medium text-slate-700">
              وصف الكورس
            </label>

            <textarea
              rows={4}
              placeholder="اكتب وصفًا واضحًا يساعد الطالب على معرفة محتوى الكورس..."
              className="w-full resize-none rounded-xl bg-white border border-slate-300 px-4 py-3 text-sm outline-none transition focus:border-brand-500 focus:ring-4 focus:ring-brand-500/10"
              {...register("description")}
            />

            {errors.description && (
              <p className="mt-1 text-xs text-red-500">
                {errors.description.message}
              </p>
            )}
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <Select
              label="الكلية"
              {...register("college")}
            >
              <option value="medicine">
                طب بشري
              </option>
              <option value="dentistry">
                طب أسنان
              </option>
              <option value="pharmacy">
                صيدلة
              </option>
            </Select>

            <Input
              label="السعر (ر.س)"
              type="number"
              min="0"
              step="0.01"
              error={errors.price?.message}
              {...register("price")}
            />
          </div>

          <Button
            type="submit"
            className="w-full"
            isLoading={isSubmitting}
          >
            <Plus className="h-4 w-4" />
            إنشاء الكورس
          </Button>
        </form>
      </Modal>

      {/* Edit Modal */}
      <Modal
        open={editModalOpen}
        onClose={() => setEditModalOpen(false)}
        title="تعديل الكورس"
        maxWidth="max-w-xl"
      >
        <form
          onSubmit={handleEditSubmit(handleEdit)}
          className="space-y-5"
        >
          <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
            <p className="text-xs font-semibold text-slate-400">
              الكورس الحالي
            </p>

            <p className="mt-1 font-bold text-slate-800">
              {editingCourse?.title}
            </p>
          </div>

          <Input
            label="عنوان الكورس"
            error={editErrors.title?.message}
            {...registerEdit("title")}
          />

          <div>
            <label className="mb-1.5 block text-sm font-medium text-slate-700">
              الوصف
            </label>

            <textarea
              rows={4}
              className="w-full resize-none rounded-xl border border-slate-300 px-4 py-3 text-sm outline-none transition focus:border-brand-500 focus:ring-4 focus:ring-brand-500/10"
              {...registerEdit("description")}
            />

            {editErrors.description && (
              <p className="mt-1 text-xs text-red-500">
                {editErrors.description.message}
              </p>
            )}
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <Select
              label="الكلية"
              {...registerEdit("college")}
            >
              <option value="medicine">
                طب بشري
              </option>
              <option value="dentistry">
                طب أسنان
              </option>
              <option value="pharmacy">
                صيدلة
              </option>
            </Select>

            <Input
              label="السعر (ر.س)"
              type="number"
              min="0"
              step="0.01"
              error={editErrors.price?.message}
              {...registerEdit("price")}
            />
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-medium text-slate-700">
              حالة الكورس
            </label>

            <Select
              value={editStatus}
              onChange={(e) =>
                setEditStatus(
                  e.target.value as
                    | "draft"
                    | "published"
                )
              }
            >
              <option value="draft">
                مسودة
              </option>
              <option value="published">
                منشور
              </option>
            </Select>
          </div>

          <Button
            type="submit"
            className="w-full"
            isLoading={isEditSubmitting}
          >
            حفظ التعديلات
          </Button>
        </form>
      </Modal>

      {/* Delete Confirmation */}
      <ConfirmDialog
        open={!!deleteTarget}
        title="حذف الكورس"
        description={`سيتم حذف "${deleteTarget?.title}" نهائيًا مع كل أقسامه ودروسه. هذا الإجراء لا يمكن التراجع عنه.`}
        danger
        confirmLabel="حذف نهائي"
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Stat Card                                                                  */
/* -------------------------------------------------------------------------- */

function StatCard({
  icon,
  label,
  value,
  description,
  iconClass,
  delay,
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
  description: string;
  iconClass: string;
  delay: number;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay }}
      className="group rounded-2xl border border-slate-100 bg-white p-4 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md sm:p-5"
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-medium text-slate-400">
            {label}
          </p>

          <p className="mt-2 text-2xl font-black text-slate-900">
            {value}
          </p>

          <p className="mt-1 text-[11px] text-slate-400">
            {description}
          </p>
        </div>

        <div
          className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${iconClass}`}
        >
          {icon}
        </div>
      </div>
    </motion.div>
  );
}

/* -------------------------------------------------------------------------- */
/* Course Card                                                                */
/* -------------------------------------------------------------------------- */

function CourseCard({
  course,
  index,
  actionLoading,
  onEdit,
  onTogglePublish,
  onDelete,
}: {
  course: Course;
  index: number;
  actionLoading: boolean;
  onEdit: () => void;
  onTogglePublish: () => void;
  onDelete: () => void;
}) {
  const students = Number(
    course.students_count ?? 0
  );

  const price = Number(course.price ?? 0);

  return (
    <motion.div
      layout
      initial={{
        opacity: 0,
        y: 18,
      }}
      animate={{
        opacity: 1,
        y: 0,
      }}
      exit={{
        opacity: 0,
        scale: 0.97,
      }}
      transition={{
        delay: index * 0.04,
      }}
      className="group"
    >
      <Card className="h-full overflow-hidden border-slate-100 p-0 shadow-sm transition duration-300 hover:-translate-y-1 hover:shadow-xl">
        {/* Card Header */}
        <div className="relative overflow-hidden bg-gradient-to-br from-brand-900 via-brand-800 to-brand-600 px-5 py-5">
          <div className="absolute -left-8 -top-10 h-32 w-32 rounded-full bg-white/10 blur-2xl" />
          <div className="absolute -bottom-12 right-5 h-32 w-32 rounded-full bg-emerald-300/10 blur-2xl" />

          <div className="relative flex items-start justify-between gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-white/10 text-white backdrop-blur-sm">
              <BookOpen className="h-5 w-5" />
            </div>

            <Badge
              color={
                course.is_published
                  ? "green"
                  : "amber"
              }
            >
              {course.is_published
                ? "منشور"
                : "مسودة"}
            </Badge>
          </div>

          <div className="relative mt-6">
            <p className="mb-1 text-[11px] font-medium text-white/60">
              {COLLEGE_LABELS[course.college]}
            </p>

            <h2 className="line-clamp-2 min-h-[48px] text-lg font-black leading-6 text-white">
              {course.title}
            </h2>
          </div>
        </div>

        {/* Body */}
        <div className="p-5">
          <p className="line-clamp-2 min-h-[40px] text-xs leading-5 text-slate-400">
            {course.description ||
              "لا يوجد وصف لهذا الكورس حتى الآن."}
          </p>

          {/* Info */}
          <div className="mt-5 grid grid-cols-2 gap-2">
            <InfoBox
              icon={
                <Users className="h-4 w-4" />
              }
              label="الطلاب"
              value={students.toString()}
            />

            <InfoBox
              icon={
                <CircleDollarSign className="h-4 w-4" />
              }
              label="السعر"
              value={formatCurrency(price)}
            />
          </div>

          {/* Students indicator */}
          <div className="mt-4 rounded-xl bg-slate-50 p-3">
            <div className="flex items-center justify-between text-[11px]">
              <span className="font-semibold text-slate-500">
                الاشتراكات
              </span>

              <span className="font-black text-brand-700">
                {students} طالب
              </span>
            </div>

            <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-slate-200">
              <motion.div
                initial={{ width: 0 }}
                animate={{
                  width: `${Math.min(
                    Math.max(students * 5, 6),
                    100
                  )}%`,
                }}
                transition={{
                  duration: 0.8,
                  delay: 0.15,
                }}
                className="h-full rounded-full bg-brand-500"
              />
            </div>
          </div>

          {/* Main Action */}
          <Link
            to={`/app/teacher/courses/${course.id}/builder`}
            className="mt-4 block"
          >
            <Button
              variant="secondary"
              className="w-full"
            >
              <Settings2 className="h-4 w-4" />
              إدارة المحتوى
              <ArrowUpLeft className="mr-auto h-4 w-4 opacity-50" />
            </Button>
          </Link>

          {/* Secondary Actions */}
          <div className="mt-2 grid grid-cols-3 gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={onEdit}
              className="w-full"
              title="تعديل الكورس"
            >
              <Settings2 className="h-4 w-4" />
            </Button>

            <Button
              size="sm"
              variant="outline"
              onClick={onTogglePublish}
              disabled={actionLoading}
              className="w-full"
              title={
                course.is_published
                  ? "إلغاء النشر"
                  : "نشر الكورس"
              }
            >
              {course.is_published ? (
                <EyeOff className="h-4 w-4" />
              ) : (
                <Eye className="h-4 w-4" />
              )}
            </Button>

            <Button
              size="sm"
              variant="outline"
              onClick={onDelete}
              disabled={actionLoading}
              className="w-full"
              title="حذف الكورس"
            >
              <Trash2 className="h-4 w-4 text-red-500" />
            </Button>
          </div>

          {actionLoading && (
            <div className="mt-3 flex items-center justify-center gap-2 text-[11px] font-medium text-brand-500">
              <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-brand-200 border-t-brand-500" />
              جاري تحديث الكورس...
            </div>
          )}
        </div>
      </Card>
    </motion.div>
  );
}

/* -------------------------------------------------------------------------- */
/* Info Box                                                                   */
/* -------------------------------------------------------------------------- */

function InfoBox({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-xl border border-slate-100 bg-white p-3">
      <div className="flex items-center gap-2 text-slate-400">
        {icon}

        <span className="text-[10px] font-medium">
          {label}
        </span>
      </div>

      <p className="mt-1.5 truncate text-sm font-black text-slate-800">
        {value}
      </p>
    </div>
  );
}
