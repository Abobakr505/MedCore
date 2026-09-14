import { useEffect, useState } from "react";
import { Award } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Skeleton } from "@/components/ui/Skeleton";
import { EmptyState } from "@/components/ui/EmptyState";
import { useAuth } from "@/contexts/AuthContext";
import { fetchStudentAttempts } from "@/services/quizzes";
import type { QuizAttempt } from "@/types";
import { formatDateTime } from "@/utils/format";

export default function GradesPage() {
  const { session } = useAuth();
  const [attempts, setAttempts] = useState<QuizAttempt[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!session?.user) return;
    fetchStudentAttempts(session.user.id).then(setAttempts).finally(() => setLoading(false));
  }, [session?.user?.id]);

  return (
    <div>
      <h1 className="text-2xl font-extrabold text-brand-900">درجاتي</h1>
      <div className="mt-6 space-y-3">
        {loading ? (
          Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-20 rounded-2xl" />)
        ) : attempts.length === 0 ? (
          <EmptyState icon={<Award className="w-6 h-6" />} title="لم تؤدِ أي اختبار بعد" />
        ) : (
          attempts.map((a: any) => {
            const passed = (a.percentage ?? 0) >= (a.quiz?.passing_score ?? 60);
            return (
              <Card key={a.id} className="flex items-center justify-between p-5">
                <div>
                  <p className="font-bold text-slate-800">{a.quiz?.title}</p>
                  <p className="text-xs text-slate-400">{formatDateTime(a.submitted_at)}</p>
                </div>
                <div className="flex items-center gap-3">
                  <span className="font-extrabold text-brand-900">{a.percentage}%</span>
                  <Badge color={passed ? "green" : "red"}>{passed ? "ناجح" : "راسب"}</Badge>
                </div>
              </Card>
            );
          })
        )}
      </div>
    </div>
  );
}
