import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Clock, CheckCircle2, XCircle, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Skeleton } from "@/components/ui/Skeleton";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/contexts/ToastContext";
import { fetchQuizForAttempt, startQuizAttempt, saveQuizAnswer, submitQuizAttempt } from "@/services/quizzes";
import type { Quiz, QuizQuestion } from "@/types";

export default function QuizAttemptPage() {
  const { quizId } = useParams<{ quizId: string }>();
  const { session } = useAuth();
  const { showToast } = useToast();
  const navigate = useNavigate();

  const [quiz, setQuiz] = useState<Quiz | null>(null);
  const [questions, setQuestions] = useState<QuizQuestion[]>([]);
  const [attemptId, setAttemptId] = useState<string | null>(null);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<{ score: number; percentage: number; total_points: number } | null>(null);
  const [secondsLeft, setSecondsLeft] = useState<number | null>(null);

  useEffect(() => {
    if (!quizId || !session?.user) return;
    (async () => {
      const { quiz, questions } = await fetchQuizForAttempt(quizId);
      const attempt = await startQuizAttempt(quizId, session.user.id);
      setQuiz(quiz);
      setQuestions(questions);
      setAttemptId(attempt.id);
      setSecondsLeft(quiz.duration_minutes * 60);
      setLoading(false);
    })();
  }, [quizId, session?.user?.id]);

  useEffect(() => {
    if (secondsLeft === null || result) return;
    if (secondsLeft <= 0) {
      handleSubmit();
      return;
    }
    const t = setTimeout(() => setSecondsLeft((s) => (s ?? 1) - 1), 1000);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [secondsLeft, result]);

  const selectAnswer = async (questionId: string, optionId: string) => {
    if (!attemptId) return;
    setAnswers((prev) => ({ ...prev, [questionId]: optionId }));
    try {
      await saveQuizAnswer(attemptId, questionId, optionId);
    } catch {
      showToast("تعذّر حفظ إجابتك، حاول مرة أخرى", "error");
    }
  };

  const handleSubmit = async () => {
    if (!attemptId || submitting) return;
    setSubmitting(true);
    try {
      const res = await submitQuizAttempt(attemptId);
      setResult(res);
    } catch {
      showToast("تعذّر تسليم الاختبار", "error");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="mx-auto max-w-2xl px-6 py-12 space-y-4">
        <Skeleton className="h-8 w-1/2" />
        {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-28 rounded-2xl" />)}
      </div>
    );
  }

  if (result && quiz) {
    const passed = result.percentage >= quiz.passing_score;
    return (
      <div className="mx-auto max-w-lg px-6 py-20 text-center">
        <motion.div initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}>
          {passed ? <CheckCircle2 className="mx-auto h-16 w-16 text-emerald-500" /> : <XCircle className="mx-auto h-16 w-16 text-red-400" />}
          <h2 className="mt-4 text-2xl font-extrabold text-slate-800">{passed ? "أحسنت! لقد اجتزت الاختبار" : "لم تحقق درجة النجاح"}</h2>
          <p className="mt-2 text-slate-500">
            حصلت على {result.score} من {result.total_points} نقطة ({result.percentage}%)
          </p>
          <p className="mt-1 text-xs text-slate-400">درجة النجاح المطلوبة: {quiz.passing_score}%</p>
          <Button className="mt-6" onClick={() => navigate("/app/student/grades")}>
            عرض جميع الدرجات <ArrowLeft className="w-4 h-4" />
          </Button>
        </motion.div>
      </div>
    );
  }

  const minutes = Math.floor((secondsLeft ?? 0) / 60);
  const seconds = (secondsLeft ?? 0) % 60;

  return (
    <div className="mx-auto max-w-2xl px-6 py-10">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-xl font-extrabold text-brand-900">{quiz?.title}</h1>
        <span className="flex items-center gap-1.5 rounded-full bg-brand-50 px-3 py-1.5 text-sm font-bold text-brand-900">
          <Clock className="w-4 h-4" /> {minutes}:{seconds.toString().padStart(2, "0")}
        </span>
      </div>

      <div className="space-y-5">
        {questions.map((q, idx) => (
          <div key={q.id} className="rounded-2xl border border-slate-100 p-5">
            <p className="font-semibold text-slate-800">{idx + 1}. {q.question}</p>
            <div className="mt-3 space-y-2">
              {q.options?.map((opt) => (
                <label
                  key={opt.id}
                  className={`flex cursor-pointer items-center gap-3 rounded-xl border px-4 py-3 text-sm transition-colors ${
                    answers[q.id] === opt.id ? "border-brand-500 bg-brand-50" : "border-slate-200 hover:bg-slate-50"
                  }`}
                >
                  <input
                    type="radio"
                    name={q.id}
                    className="accent-brand-500"
                    checked={answers[q.id] === opt.id}
                    onChange={() => selectAnswer(q.id, opt.id)}
                  />
                  {opt.option_text}
                </label>
              ))}
            </div>
          </div>
        ))}
      </div>

      <Button className="mt-8 w-full" size="lg" isLoading={submitting} onClick={handleSubmit}>
        تسليم الاختبار
      </Button>
    </div>
  );
}
