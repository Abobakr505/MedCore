import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ClipboardList, Clock } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Skeleton } from "@/components/ui/Skeleton";
import { EmptyState } from "@/components/ui/EmptyState";
import { useAuth } from "@/contexts/AuthContext";
import { fetchStudentEnrollments } from "@/services/enrollments";
import { fetchCourseQuizzes } from "@/services/quizzes";
import type { Quiz } from "@/types";

interface QuizRow extends Quiz {
  courseTitle: string;
}

export default function QuizzesListPage() {
  const { session } = useAuth();
  const [quizzes, setQuizzes] = useState<QuizRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!session?.user) return;
    (async () => {
      const enrollments = await fetchStudentEnrollments(session.user.id);
      const all: QuizRow[] = [];
      for (const e of enrollments) {
        if (!e.course) continue;
        const list = await fetchCourseQuizzes(e.course.id);
        list.forEach((q) => all.push({ ...q, courseTitle: e.course!.title }));
      }
      setQuizzes(all);
      setLoading(false);
    })();
  }, [session?.user?.id]);

  return (
    <div>
      <h1 className="text-2xl font-extrabold text-brand-900">الاختبارات المتاحة</h1>
      <div className="mt-6 space-y-4">
        {loading ? (
          Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-20 rounded-2xl" />)
        ) : quizzes.length === 0 ? (
          <EmptyState icon={<ClipboardList className="w-6 h-6" />} title="لا توجد اختبارات متاحة حاليًا" description="ستظهر هنا الاختبارات فور إضافتها من المعلم لكورساتك" />
        ) : (
          quizzes.map((q) => (
            <Card key={q.id} className="flex items-center justify-between p-5">
              <div>
                <p className="font-bold text-slate-800">{q.title}</p>
                <p className="text-xs text-slate-400">{q.courseTitle}</p>
              </div>
              <div className="flex items-center gap-4">
                <span className="flex items-center gap-1 text-xs text-slate-400"><Clock className="w-3.5 h-3.5" /> {q.duration_minutes} دقيقة</span>
                <Link to={`/app/student/quizzes/${q.id}`} className="rounded-lg bg-brand-500 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-900">
                  بدء الاختبار
                </Link>
              </div>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
