import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { motion } from "framer-motion";
import {
  Clock,
  CheckCircle2,
  XCircle,
  ArrowLeft,
  ArrowRight,
  ClipboardCheck,
  AlertTriangle,
  Trophy,
  RotateCcw,
  Circle,
} from "lucide-react";

import { Button } from "@/components/ui/Button";
import { Skeleton } from "@/components/ui/Skeleton";

import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/contexts/ToastContext";

import {
  fetchQuizForAttempt,
  startQuizAttempt,
  saveQuizAnswer,
  submitQuizAttempt,
} from "@/services/quizzes";

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

  const [result, setResult] = useState<{
    score: number;
    percentage: number;
    total_points: number;
  } | null>(null);

  const [secondsLeft, setSecondsLeft] = useState<number | null>(null);
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [showConfirm, setShowConfirm] = useState(false);

  useEffect(() => {
    if (!quizId || !session?.user) return;

    let mounted = true;

    (async () => {
      try {
        const data = await fetchQuizForAttempt(quizId);

        if (!mounted) return;

        const attempt = await startQuizAttempt(
          quizId,
          session.user.id
        );

        if (!mounted) return;

        setQuiz(data.quiz);
        setQuestions(data.questions);
        setAttemptId(attempt.id);
        setSecondsLeft(data.quiz.duration_minutes * 60);
      } catch {
        showToast("تعذّر تحميل الاختبار", "error");
      } finally {
        if (mounted) setLoading(false);
      }
    })();

    return () => {
      mounted = false;
    };
  }, [quizId, session?.user?.id]);

  useEffect(() => {
    if (secondsLeft === null || result || submitting) return;

    if (secondsLeft <= 0) {
      handleSubmit();
      return;
    }

    const timer = setTimeout(() => {
      setSecondsLeft((value) => (value ?? 1) - 1);
    }, 1000);

    return () => clearTimeout(timer);
  }, [secondsLeft, result, submitting]);

  const answeredCount = useMemo(
    () => Object.keys(answers).length,
    [answers]
  );

  const progress =
    questions.length > 0
      ? Math.round(
          ((currentQuestion + 1) / questions.length) * 100
        )
      : 0;

  const selectAnswer = async (
    questionId: string,
    optionId: string
  ) => {
    if (!attemptId) return;

    setAnswers((previous) => ({
      ...previous,
      [questionId]: optionId,
    }));

    try {
      await saveQuizAnswer(
        attemptId,
        questionId,
        optionId
      );
    } catch {
      showToast("تعذّر حفظ إجابتك، حاول مرة أخرى", "error");
    }
  };

  const handleSubmit = async () => {
    if (!attemptId || submitting || result) return;

    setSubmitting(true);

    try {
      const response = await submitQuizAttempt(attemptId);
      setResult(response);
    } catch {
      showToast("تعذّر تسليم الاختبار", "error");
    } finally {
      setSubmitting(false);
      setShowConfirm(false);
    }
  };

  if (loading) {
    return (
      <div className="mx-auto max-w-3xl space-y-5 px-4 py-10 sm:px-6">
        <Skeleton className="h-24 rounded-3xl" />

        {Array.from({ length: 3 }).map((_, index) => (
          <Skeleton key={index} className="h-48 rounded-3xl" />
        ))}
      </div>
    );
  }

  if (!quiz) return null;

  if (result) {
    const passed = result.percentage >= quiz.passing_score;

    return (
      <div className="flex min-h-full items-center justify-center px-4 py-12">
        <motion.div
          initial={{ opacity: 0, scale: 0.92, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          className="w-full max-w-lg overflow-hidden rounded-3xl border border-slate-100 bg-white text-center shadow-2xl"
        >
          <div
            className={`relative overflow-hidden p-8 ${
              passed
                ? "bg-gradient-to-br from-emerald-50 to-white"
                : "bg-gradient-to-br from-red-50 to-white"
            }`}
          >
            <div className="absolute -left-16 -top-16 h-40 w-40 rounded-full bg-white/70 blur-2xl" />

            <div className="relative">
              <div
                className={`mx-auto flex h-24 w-24 items-center justify-center rounded-full ${
                  passed
                    ? "bg-emerald-100 text-emerald-600"
                    : "bg-red-100 text-red-500"
                }`}
              >
                {passed ? (
                  <Trophy className="h-12 w-12" />
                ) : (
                  <XCircle className="h-12 w-12" />
                )}
              </div>

              <p
                className={`mt-5 text-xs font-black ${
                  passed
                    ? "text-emerald-600"
                    : "text-red-500"
                }`}
              >
                {passed ? "نتيجة رائعة 🎉" : "حاول مرة أخرى"}
              </p>

              <h2 className="mt-2 text-2xl font-black text-slate-900">
                {passed
                  ? "لقد اجتزت الاختبار بنجاح"
                  : "لم تحقق درجة النجاح"}
              </h2>

              <p className="mt-2 text-sm text-slate-400">
                {quiz.title}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-3 divide-x divide-slate-100 border-y border-slate-100 rtl:divide-x-reverse">
            <ResultStat
              label="درجتك"
              value={`${result.percentage}%`}
            />

            <ResultStat
              label="النقاط"
              value={`${result.score}`}
            />

            <ResultStat
              label="النجاح"
              value={`${quiz.passing_score}%`}
            />
          </div>

          <div className="p-6">
            <p className="text-sm leading-6 text-slate-500">
              حصلت على{" "}
              <strong className="text-slate-800">
                {result.score}
              </strong>{" "}
              من{" "}
              <strong className="text-slate-800">
                {result.total_points}
              </strong>{" "}
              نقطة.
            </p>

            <div className="mt-6 flex flex-col gap-3 sm:flex-row">
              <Button
                className="flex-1"
                onClick={() =>
                  navigate("/app/student/grades")
                }
              >
                عرض الدرجات
                <ArrowLeft className="h-4 w-4" />
              </Button>

              <Button
                variant="outline"
                className="flex-1"
                onClick={() =>
                  navigate("/app/student/quizzes")
                }
              >
                الاختبارات
              </Button>
            </div>
          </div>
        </motion.div>
      </div>
    );
  }

  const question = questions[currentQuestion];

  const minutes = Math.floor(
    (secondsLeft ?? 0) / 60
  );

  const seconds = (secondsLeft ?? 0) % 60;

  const isTimeLow =
    (secondsLeft ?? 0) <= 60;

  return (
    <div className="min-h-full bg-slate-50 pb-10">
      {/* Top bar */}
      <div className="sticky top-0 z-30 border-b border-slate-200 bg-white/95 shadow-sm backdrop-blur">
        <div className="mx-auto max-w-4xl px-4 py-4 sm:px-6">
          <div className="flex items-center justify-between gap-4">
            <div className="min-w-0">
              <p className="text-[10px] font-bold text-brand-500">
                اختبار
              </p>

              <h1 className="truncate text-sm font-black text-slate-900 sm:text-base">
                {quiz.title}
              </h1>
            </div>

            <div
              className={`flex shrink-0 items-center gap-2 rounded-2xl px-3 py-2 text-sm font-black ${
                isTimeLow
                  ? "bg-red-50 text-red-600"
                  : "bg-brand-50 text-brand-700"
              }`}
            >
              {isTimeLow && (
                <span className="h-2 w-2 animate-pulse rounded-full bg-red-500" />
              )}

              <Clock className="h-4 w-4" />

              {minutes}:{seconds
                .toString()
                .padStart(2, "0")}
            </div>
          </div>

          <div className="mt-4">
            <div className="mb-2 flex items-center justify-between text-[10px] font-bold text-slate-400">
              <span>
                السؤال {currentQuestion + 1} من{" "}
                {questions.length}
              </span>

              <span>{progress}%</span>
            </div>

            <div className="h-2 overflow-hidden rounded-full bg-slate-100">
              <motion.div
                className="h-full rounded-full bg-brand-500"
                animate={{ width: `${progress}%` }}
              />
            </div>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-4xl px-4 py-6 sm:px-6 sm:py-8">
        {/* Question navigation */}
        <div className="mb-5 overflow-hidden rounded-2xl border border-slate-100 bg-white p-3 shadow-sm">
          <div className="flex items-center gap-2 overflow-x-auto">
            {questions.map((item, index) => {
              const answered = Boolean(answers[item.id]);
              const active = index === currentQuestion;

              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() =>
                    setCurrentQuestion(index)
                  }
                  className={`flex h-9 min-w-9 shrink-0 items-center justify-center rounded-xl text-xs font-black transition ${
                    active
                      ? "bg-brand-500 text-white shadow-sm"
                      : answered
                      ? "bg-emerald-50 text-emerald-600"
                      : "bg-slate-50 text-slate-400 hover:bg-slate-100"
                  }`}
                >
                  {answered && !active ? (
                    <CheckCircle2 className="h-4 w-4" />
                  ) : (
                    index + 1
                  )}
                </button>
              );
            })}
          </div>

          <div className="mt-3 flex items-center justify-between border-t border-slate-100 pt-3 text-[10px] text-slate-400">
            <span>
              أجبت عن {answeredCount} من{" "}
              {questions.length}
            </span>

            <span className="flex items-center gap-1">
              <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
              تمت الإجابة
            </span>
          </div>
        </div>

        {/* Question */}
        {question && (
          <motion.div
            key={question.id}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.25 }}
          >
            <div className="overflow-hidden rounded-3xl border border-slate-100 bg-white shadow-sm">
              <div className="p-5 sm:p-7">
                <div className="flex items-start gap-4">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-sm font-black text-brand-600">
                    {currentQuestion + 1}
                  </div>

                  <div className="min-w-0 flex-1">
                    <p className="text-lg font-black leading-8 text-slate-900 sm:text-xl">
                      {question.question}
                    </p>

                    <p className="mt-2 text-xs text-slate-400">
                      اختر الإجابة الصحيحة
                    </p>
                  </div>
                </div>

                <div className="mt-7 space-y-3">
                  {question.options?.map(
                    (option, index) => {
                      const selected =
                        answers[question.id] ===
                        option.id;

                      return (
                        <button
                          key={option.id}
                          type="button"
                          onClick={() =>
                            selectAnswer(
                              question.id,
                              option.id
                            )
                          }
                          className={`group flex w-full items-center gap-4 rounded-2xl border p-4 text-right transition-all ${
                            selected
                              ? "border-brand-500 bg-brand-50 shadow-sm"
                              : "border-slate-200 bg-white hover:border-brand-200 hover:bg-slate-50"
                          }`}
                        >
                          <span
                            className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-xs font-black ${
                              selected
                                ? "bg-brand-500 text-white"
                                : "bg-slate-100 text-slate-500 group-hover:bg-brand-50 group-hover:text-brand-600"
                            }`}
                          >
                            {String.fromCharCode(
                              65 + index
                            )}
                          </span>

                          <span
                            className={`flex-1 text-sm font-semibold leading-6 ${
                              selected
                                ? "text-brand-900"
                                : "text-slate-700"
                            }`}
                          >
                            {option.option_text}
                          </span>

                          <span>
                            {selected ? (
                              <CheckCircle2 className="h-5 w-5 text-brand-500" />
                            ) : (
                              <Circle className="h-5 w-5 text-slate-200" />
                            )}
                          </span>
                        </button>
                      );
                    }
                  )}
                </div>
              </div>

              {/* Navigation */}
              <div className="flex flex-col-reverse gap-3 border-t border-slate-100 bg-slate-50/50 p-4 sm:flex-row sm:items-center sm:justify-between">
                <Button
                  variant="outline"
                  onClick={() =>
                    setCurrentQuestion(
                      (value) => Math.max(0, value - 1)
                    )
                  }
                  disabled={currentQuestion === 0}
                >
                  <ArrowRight className="h-4 w-4" />
                  السابق
                </Button>

                {currentQuestion <
                questions.length - 1 ? (
                  <Button
                    onClick={() =>
                      setCurrentQuestion(
                        (value) =>
                          Math.min(
                            questions.length - 1,
                            value + 1
                          )
                      )
                    }
                  >
                    التالي
                    <ArrowLeft className="h-4 w-4" />
                  </Button>
                ) : (
                  <Button
                    onClick={() =>
                      setShowConfirm(true)
                    }
                    isLoading={submitting}
                  >
                    <ClipboardCheck className="h-4 w-4" />
                    تسليم الاختبار
                  </Button>
                )}
              </div>
            </div>
          </motion.div>
        )}

        {/* Bottom warning */}
        <div className="mt-5 flex items-start gap-3 rounded-2xl border border-amber-100 bg-amber-50 p-4 text-xs text-amber-700">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />

          <p className="leading-6">
            يتم حفظ إجابتك تلقائيًا عند اختيارها. عند انتهاء الوقت سيتم
            تسليم الاختبار تلقائيًا.
          </p>
        </div>
      </div>

      {/* Confirmation */}
      {showConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl"
          >
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-50 text-amber-600">
              <AlertTriangle className="h-6 w-6" />
            </div>

            <h2 className="mt-5 text-xl font-black text-slate-900">
              هل أنت متأكد من التسليم؟
            </h2>

            <p className="mt-2 text-sm leading-6 text-slate-500">
              لقد أجبت عن{" "}
              <strong className="text-slate-800">
                {answeredCount}
              </strong>{" "}
              من أصل{" "}
              <strong className="text-slate-800">
                {questions.length}
              </strong>{" "}
              سؤالًا.
            </p>

            <div className="mt-6 flex gap-3">
              <Button
                className="flex-1"
                onClick={handleSubmit}
                isLoading={submitting}
              >
                نعم، سلّم الاختبار
              </Button>

              <Button
                variant="outline"
                className="flex-1"
                onClick={() =>
                  setShowConfirm(false)
                }
              >
                إلغاء
              </Button>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
}

function ResultStat({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="p-4">
      <p className="text-[10px] text-slate-400">
        {label}
      </p>

      <p className="mt-1 text-lg font-black text-slate-900">
        {value}
      </p>
    </div>
  );
}
