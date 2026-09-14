import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { BookOpen, PlayCircle } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Skeleton } from "@/components/ui/Skeleton";
import { EmptyState } from "@/components/ui/EmptyState";
import { Button } from "@/components/ui/Button";
import { useAuth } from "@/contexts/AuthContext";
import { fetchStudentEnrollments } from "@/services/enrollments";
import type { Enrollment } from "@/types";
import { getPublicUrl } from "@/lib/supabase";

export default function MyCoursesPage() {
  const { session } = useAuth();
  const [enrollments, setEnrollments] = useState<Enrollment[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!session?.user) return;
    fetchStudentEnrollments(session.user.id).then(setEnrollments).finally(() => setLoading(false));
  }, [session?.user?.id]);

  return (
    <div>
      <h1 className="text-2xl font-extrabold text-brand-900">كورساتي</h1>
      <div className="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {loading ? (
          Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-52 rounded-2xl" />)
        ) : enrollments.length === 0 ? (
          <div className="col-span-full">
            <EmptyState
              icon={<BookOpen className="w-6 h-6" />}
              title="لم تشترك في أي كورس بعد"
              action={<Link to="/courses"><Button>تصفّح الكورسات</Button></Link>}
            />
          </div>
        ) : (
          enrollments.map((e) => {
            const thumb = getPublicUrl("course-thumbnails", e.course?.thumbnail_path ?? null);
            return (
              <Card key={e.id} className="overflow-hidden">
                <div className="h-32 bg-gradient-to-br from-brand-500 to-brand-900">
                  {thumb && <img src={thumb} className="h-full w-full object-cover" />}
                </div>
                <div className="p-4">
                  <p className="font-bold text-slate-800 line-clamp-1">{e.course?.title}</p>
                  <p className="mt-1 text-xs text-slate-400">{e.course?.teacher?.full_name}</p>
                  <Link to={`/app/student/courses/${e.course_id}/learn`}>
                    <Button className="mt-4 w-full" size="sm">
                      <PlayCircle className="w-4 h-4" /> متابعة التعلّم
                    </Button>
                  </Link>
                </div>
              </Card>
            );
          })
        )}
      </div>
    </div>
  );
}
