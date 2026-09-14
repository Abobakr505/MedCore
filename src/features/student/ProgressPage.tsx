import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { TrendingUp } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Skeleton } from "@/components/ui/Skeleton";
import { EmptyState } from "@/components/ui/EmptyState";
import { useAuth } from "@/contexts/AuthContext";
import { fetchStudentEnrollments, fetchLessonProgress, computeCourseProgress } from "@/services/enrollments";
import { fetchCourseSections } from "@/services/courses";

interface CourseProgressRow {
  courseId: string;
  title: string;
  progress: number;
  totalLessons: number;
  completedLessons: number;
}

export default function ProgressPage() {
  const { session } = useAuth();
  const [rows, setRows] = useState<CourseProgressRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!session?.user) return;
    (async () => {
      const enrollments = await fetchStudentEnrollments(session.user.id);
      const results: CourseProgressRow[] = [];
      for (const e of enrollments) {
        if (!e.course) continue;
        const sections = await fetchCourseSections(e.course.id);
        const lessons = sections.flatMap((s) => s.lessons ?? []);
        const progress = await fetchLessonProgress(session.user.id, lessons.map((l) => l.id));
        const completed = progress.filter((p) => p.completed).length;
        results.push({
          courseId: e.course.id,
          title: e.course.title,
          totalLessons: lessons.length,
          completedLessons: completed,
          progress: computeCourseProgress(lessons.length, completed),
        });
      }
      setRows(results);
      setLoading(false);
    })();
  }, [session?.user?.id]);

  return (
    <div>
      <h1 className="text-2xl font-extrabold text-brand-900">تقدّمي الدراسي</h1>
      <div className="mt-6 space-y-4">
        {loading ? (
          Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-20 rounded-2xl" />)
        ) : rows.length === 0 ? (
          <EmptyState icon={<TrendingUp className="w-6 h-6" />} title="لا يوجد تقدّم مسجّل بعد" />
        ) : (
          rows.map((row) => (
            <Card key={row.courseId} className="p-5">
              <div className="flex items-center justify-between">
                <Link to={`/app/student/courses/${row.courseId}/learn`} className="font-bold text-slate-800 hover:text-brand-500">{row.title}</Link>
                <span className="text-sm font-bold text-brand-500">{row.progress}%</span>
              </div>
              <div className="mt-3 h-2 w-full rounded-full bg-slate-100">
                <div className="h-2 rounded-full bg-brand-500 transition-all" style={{ width: `${row.progress}%` }} />
              </div>
              <p className="mt-2 text-xs text-slate-400">{row.completedLessons} من {row.totalLessons} دروس مكتملة</p>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
