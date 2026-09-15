import { useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useParams } from "react-router-dom";
import {
  Plus,
  Trash2,
  ClipboardList,
  CheckCircle2,
  Clock3,
  Target,
  FileQuestion,
  ArrowRight,
  MoreVertical,
  Trophy,
  CircleHelp,
  BarChart3,
  Sparkles,
  X,
} from "lucide-react";

import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Card } from "@/components/ui/Card";
import { Modal } from "@/components/ui/Modal";
import { Skeleton } from "@/components/ui/Skeleton";
import { EmptyState } from "@/components/ui/EmptyState";
import { useToast } from "@/contexts/ToastContext";
import {
  fetchCourseQuizzes,
  createQuiz,
  fetchQuizForEditing,
  addQuestion,
  addOption,
  deleteQuestion,
} from "@/services/quizzes";
import { fetchCourseSections } from "@/services/courses";
import type { CourseSection, Quiz, QuizQuestion } from "@/types";

type QuizScope = "course" | "section" | "lesson";

export default function QuizBuilderPage() {
  const { courseId } = useParams<{ courseId: string }>();
  const { showToast } = useToast();

  const [quizzes, setQuizzes] = useState<Quiz[]>([]);
  const [sections, setSections] = useState<CourseSection[]>([]);
  const [activeQuiz, setActiveQuiz] = useState<Quiz | null>(null);
  const [questions, setQuestions] = useState<QuizQuestion[]>([]);
  const [loading, setLoading] = useState(true);
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [quizForm, setQuizForm] = useState({
    title: "",
    description: "",
    scope: "course" as QuizScope,
    sectionId: "",
    lessonId: "",
    durationMinutes: 30,
    passingScore: 60,
  });

  const load = async () => {
    if (!courseId) return;

    setLoading(true);

    try {
      const list = await fetchCourseQuizzes(courseId);
      setQuizzes(list);
      setSections((await fetchCourseSections(courseId)) as CourseSection[]);
    } catch {
      showToast("تعذّر تحميل الاختبارات", "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [courseId]);

  const openQuiz = async (quiz: Quiz) => {
    try {
      setActiveQuiz(quiz);
      setQuestions(await fetchQuizForEditing(quiz.id));
    } catch {
      showToast("تعذّر تحميل أسئلة الاختبار", "error");
    }
  };

  const handleCreateQuiz = async () => {
    if (!courseId || !quizForm.title.trim()) {
      showToast("أدخل عنوان الاختبار", "error");
      return;
    }

    if (
      (quizForm.scope === "section" || quizForm.scope === "lesson") &&
      !quizForm.sectionId
    ) {
      showToast("اختر القسم المرتبط بالاختبار", "error");
      return;
    }

    if (quizForm.scope === "lesson" && !quizForm.lessonId) {
      showToast("اختر الدرس المرتبط بالاختبار", "error");
      return;
    }

    try {
      await createQuiz({
        courseId,
        title: quizForm.title,
        description: quizForm.description,
        durationMinutes: quizForm.durationMinutes,
        passingScore: quizForm.passingScore,
        sectionId:
          quizForm.scope === "section" || quizForm.scope === "lesson"
            ? quizForm.sectionId || null
            : null,
        lessonId: quizForm.scope === "lesson" ? quizForm.lessonId || null : null,
      });

      showToast("تم إنشاء الاختبار بنجاح", "success");

      setCreateModalOpen(false);

      setQuizForm({
        title: "",
        description: "",
        scope: "course",
        sectionId: "",
        lessonId: "",
        durationMinutes: 30,
        passingScore: 60,
      });

      load();
    } catch {
      showToast("تعذّر إنشاء الاختبار", "error");
    }
  };

  const totalQuestions = quizzes.length;

  if (loading) {
    return (
      <div className="space-y-5">
        <Skeleton className="h-24 rounded-3xl" />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-48 rounded-3xl" />
          ))}
        </div>
      </div>
    );
  }

  if (activeQuiz) {
    return (
      <QuizEditor
        quiz={activeQuiz}
        questions={questions}
        onBack={() => setActiveQuiz(null)}
        onRefresh={async () => {
          setQuestions(await fetchQuizForEditing(activeQuiz.id));
        }}
      />
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-brand-900 via-brand-900 to-brand-500 p-6 text-white shadow-lg">
        <div className="absolute -left-10 -top-10 h-40 w-40 rounded-full bg-white/10 blur-2xl" />
        <div className="absolute -bottom-16 right-10 h-44 w-44 rounded-full bg-white/10 blur-3xl" />

        <div className="relative flex flex-col justify-between gap-5 md:flex-row md:items-center">
          <div>
            <div className="mb-2 flex items-center gap-2 text-sm text-white/80">
              <ClipboardList className="h-4 w-4" />
              بنك الاختبارات
            </div>

            <h1 className="text-2xl font-black md:text-3xl">
              اختبارات الكورس
            </h1>

            <p className="mt-2 max-w-xl text-sm leading-6 text-white/80">
              أنشئ الاختبارات، أضف الأسئلة والاختيارات، وحدد مدة الاختبار
              ودرجة النجاح للطلاب.
            </p>
          </div>

          <Button
            onClick={() => setCreateModalOpen(true)}
            className="bg-brand-500 text-brand-700 hover:bg-brand-900"
          >
            <Plus className="h-4 w-4" />
            اختبار جديد
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard
          icon={<ClipboardList />}
          label="إجمالي الاختبارات"
          value={quizzes.length}
        />

        <StatCard
          icon={<FileQuestion />}
          label="الاختبارات النشطة"
          value={quizzes.length}
          tone="green"
        />

        <StatCard
          icon={<Clock3 />}
          label="متوسط المدة"
          value={
            quizzes.length
              ? `${Math.round(
                  quizzes.reduce((sum, q) => sum + q.duration_minutes, 0) /
                    quizzes.length
                )} د`
              : "0 د"
          }
        />

        <StatCard
          icon={<Target />}
          label="متوسط النجاح"
          value={
            quizzes.length
              ? `${Math.round(
                  quizzes.reduce((sum, q) => sum + q.passing_score, 0) /
                    quizzes.length
                )}%`
              : "0%"
          }
          tone="amber"
        />
      </div>

      {/* Quizzes */}
      {quizzes.length === 0 ? (
        <div className="rounded-3xl border border-dashed border-slate-200 bg-white p-10">
          <EmptyState
            icon={<ClipboardList className="h-7 w-7" />}
            title="لا توجد اختبارات بعد"
            action={
              <Button onClick={() => setCreateModalOpen(true)}>
                <Plus className="h-4 w-4" />
                إنشاء أول اختبار
              </Button>
            }
          />
        </div>
      ) : (
        <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
          {quizzes.map((quiz, index) => (
            <motion.div
              key={quiz.id}
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
            >
              <Card
                className="group relative cursor-pointer overflow-hidden p-0 transition-all duration-300 hover:-translate-y-1 hover:shadow-xl"
                onClick={() => openQuiz(quiz)}
              >
                <div className="h-1.5 bg-gradient-to-r from-brand-500 to-cyan-400" />

                <div className="p-5">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-brand-50 text-brand-600">
                      <ClipboardList className="h-5 w-5" />
                    </div>

                    <button
                      onClick={(e) => e.stopPropagation()}
                      className="rounded-lg p-2 text-slate-400 hover:bg-slate-100"
                    >
                      <MoreVertical className="h-4 w-4" />
                    </button>
                  </div>

                  <h3 className="mt-4 line-clamp-1 text-lg font-black text-slate-800">
                    {quiz.title}
                  </h3>

                  <p className="mt-1 min-h-[40px] line-clamp-2 text-sm leading-5 text-slate-400">
                    {quiz.description || "لا يوجد وصف لهذا الاختبار"}
                  </p>

                  <QuizScopeBadge quiz={quiz} sections={sections} />

                  <div className="mt-5 grid grid-cols-2 gap-2">
                    <MiniInfo
                      icon={<Clock3 />}
                      label="المدة"
                      value={`${quiz.duration_minutes} دقيقة`}
                    />

                    <MiniInfo
                      icon={<Target />}
                      label="النجاح"
                      value={`${quiz.passing_score}%`}
                    />
                  </div>

                  <div className="mt-4 flex items-center justify-between border-t border-slate-100 pt-4">
                    <span className="text-xs font-medium text-slate-400">
                      اضغط لإدارة الأسئلة
                    </span>

                    <span className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-50 text-slate-400 transition-all group-hover:bg-brand-50 group-hover:text-brand-500">
                      <ArrowRight className="h-4 w-4" />
                    </span>
                  </div>
                </div>
              </Card>
            </motion.div>
          ))}
        </div>
      )}

      {/* Create modal */}
      <Modal
        open={createModalOpen}
        onClose={() => setCreateModalOpen(false)}
        title="إنشاء اختبار جديد"
      >
        <div className="space-y-4">
          <Input
            label="عنوان الاختبار"
            value={quizForm.title}
            onChange={(e) =>
              setQuizForm({
                ...quizForm,
                title: e.target.value,
              })
            }
          />

          <Input
            label="الوصف"
            value={quizForm.description}
            onChange={(e) =>
              setQuizForm({
                ...quizForm,
                description: e.target.value,
              })
            }
          />

          <div className="grid grid-cols-2 gap-3">
            <Input
              label="المدة (دقيقة)"
              type="number"
              min={1}
              value={quizForm.durationMinutes}
              onChange={(e) =>
                setQuizForm({
                  ...quizForm,
                  durationMinutes: Number(e.target.value),
                })
              }
            />

            <Input
              label="درجة النجاح (%)"
              type="number"
              min={1}
              max={100}
              value={quizForm.passingScore}
              onChange={(e) =>
                setQuizForm({
                  ...quizForm,
                  passingScore: Number(e.target.value),
                })
              }
            />
          </div>

          <div className="rounded-2xl border border-slate-100 bg-slate-50/80 p-4">
            <div className="mb-3 flex items-center justify-between gap-3">
              <div>
                <p className="text-sm font-black text-slate-800">نطاق الاختبار</p>
                <p className="mt-1 text-xs text-slate-500">
                  حدّد أين يظهر الاختبار للطلاب
                </p>
              </div>

              <select
                value={quizForm.scope}
                onChange={(e) =>
                  setQuizForm({
                    ...quizForm,
                    scope: e.target.value as QuizScope,
                    sectionId: "",
                    lessonId: "",
                  })
                }
                className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-bold text-slate-700 outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/10"
              >
                <option value="course">كل الكورس</option>
                <option value="section">قسم محدد</option>
                <option value="lesson">درس محدد</option>
              </select>
            </div>

            {quizForm.scope !== "course" && (
              <select
                value={quizForm.sectionId}
                onChange={(e) =>
                  setQuizForm({
                    ...quizForm,
                    sectionId: e.target.value,
                    lessonId: "",
                  })
                }
                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-3 text-sm text-slate-700 outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/10"
              >
                <option value="">اختر القسم</option>
                {sections.map((section) => (
                  <option key={section.id} value={section.id}>
                    {section.title}
                  </option>
                ))}
              </select>
            )}

            {quizForm.scope === "lesson" && quizForm.sectionId && (
              <select
                value={quizForm.lessonId}
                onChange={(e) =>
                  setQuizForm({
                    ...quizForm,
                    lessonId: e.target.value,
                  })
                }
                className="mt-3 w-full rounded-xl border border-slate-200 bg-white px-3 py-3 text-sm text-slate-700 outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/10"
              >
                <option value="">اختر الدرس</option>
                {sections
                  .find((section) => section.id === quizForm.sectionId)
                  ?.lessons?.map((lesson) => (
                    <option key={lesson.id} value={lesson.id}>
                      {lesson.title}
                    </option>
                  ))}
              </select>
            )}
          </div>

          <div className="rounded-2xl bg-brand-50 p-4 text-sm text-brand-700">
            <div className="flex items-center gap-2 font-bold">
              <Sparkles className="h-4 w-4" />
              نصيحة
            </div>
            <p className="mt-1 text-xs leading-5 text-brand-600/80">
              اجعل الأسئلة متنوعة وواضحة، وحدد درجة نجاح مناسبة لمستوى الكورس.
            </p>
          </div>

          <Button className="w-full" onClick={handleCreateQuiz}>
            إنشاء الاختبار
          </Button>
        </div>
      </Modal>
    </div>
  );
}

function QuizEditor({
  quiz,
  questions,
  onBack,
  onRefresh,
}: {
  quiz: Quiz;
  questions: QuizQuestion[];
  onBack: () => void;
  onRefresh: () => void;
}) {
  const { showToast } = useToast();

  const [questionModalOpen, setQuestionModalOpen] = useState(false);
  const [questionText, setQuestionText] = useState("");
  const [points, setPoints] = useState(1);
  const [options, setOptions] = useState([
    { text: "", correct: false },
    { text: "", correct: false },
  ]);

  const totalPoints = useMemo(
    () => questions.reduce((sum, q) => sum + Number(q.points || 0), 0),
    [questions]
  );

  const addOptionField = () => {
    setOptions([...options, { text: "", correct: false }]);
  };

  const removeOptionField = (index: number) => {
    if (options.length <= 2) return;

    setOptions(options.filter((_, i) => i !== index));
  };

  const handleCreateQuestion = async () => {
    const validOptions = options.filter((o) => o.text.trim());

    if (!questionText.trim() || validOptions.length < 2) {
      showToast("أضف نص السؤال وخيارين على الأقل", "error");
      return;
    }

    if (!options.some((o) => o.correct)) {
      showToast("حدّد إجابة صحيحة واحدة على الأقل", "error");
      return;
    }

    try {
      const question = await addQuestion(
        quiz.id,
        questionText.trim(),
        points,
        questions.length
      );

      for (const opt of validOptions) {
        await addOption(question.id, opt.text.trim(), opt.correct);
      }

      setQuestionText("");
      setPoints(1);
      setOptions([
        { text: "", correct: false },
        { text: "", correct: false },
      ]);
      setQuestionModalOpen(false);

      showToast("تمت إضافة السؤال", "success");

      onRefresh();
    } catch {
      showToast("تعذّر إضافة السؤال", "error");
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteQuestion(id);
      showToast("تم حذف السؤال", "success");
      onRefresh();
    } catch {
      showToast("تعذّر حذف السؤال", "error");
    }
  };

  return (
    <div className="space-y-6">
      <button
        onClick={onBack}
        className="flex items-center gap-2 text-sm font-bold text-brand-600 hover:text-brand-700"
      >
        <ArrowRight className="h-4 w-4" />
        العودة لقائمة الاختبارات
      </button>

      <div className="relative overflow-hidden rounded-3xl bg-white p-6 shadow-sm ring-1 ring-slate-100">
        <div className="flex flex-col justify-between gap-5 md:flex-row md:items-center">
          <div>
            <div className="flex items-center gap-2 text-xs font-bold text-brand-500">
              <ClipboardList className="h-4 w-4" />
              محرر الاختبار
            </div>

            <h1 className="mt-2 text-2xl font-black text-slate-900">
              {quiz.title}
            </h1>

            <p className="mt-1 text-sm text-slate-400">
              {quiz.description || "إدارة أسئلة الاختبار والدرجات"}
            </p>
          </div>

          <Button onClick={() => setQuestionModalOpen(true)}>
            <Plus className="h-4 w-4" />
            سؤال جديد
          </Button>
        </div>

        <div className="mt-5 grid grid-cols-2 gap-3 md:grid-cols-4">
          <EditorStat
            icon={<FileQuestion />}
            value={questions.length}
            label="سؤال"
          />
          <EditorStat
            icon={<Target />}
            value={totalPoints}
            label="إجمالي النقاط"
          />
          <EditorStat
            icon={<Clock3 />}
            value={`${quiz.duration_minutes} د`}
            label="المدة"
          />
          <EditorStat
            icon={<Trophy />}
            value={`${quiz.passing_score}%`}
            label="درجة النجاح"
          />
        </div>
      </div>

      {questions.length === 0 ? (
        <div className="rounded-3xl border border-dashed border-slate-200 bg-white p-10">
          <EmptyState
            icon={<CircleHelp className="h-7 w-7" />}
            title="لم تتم إضافة أسئلة بعد"
            action={
              <Button onClick={() => setQuestionModalOpen(true)}>
                <Plus className="h-4 w-4" />
                إضافة أول سؤال
              </Button>
            }
          />
        </div>
      ) : (
        <div className="space-y-4">
          {questions.map((q, idx) => (
            <motion.div
              key={q.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
            >
              <Card className="overflow-hidden p-0">
                <div className="border-b border-slate-100 bg-slate-50/70 px-5 py-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex gap-3">
                      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-brand-100 text-sm font-black text-brand-600">
                        {idx + 1}
                      </div>

                      <div>
                        <p className="font-bold leading-6 text-slate-800">
                          {q.question}
                        </p>

                        <span className="mt-1 inline-flex items-center gap-1 text-xs text-slate-400">
                          <Target className="h-3.5 w-3.5" />
                          {q.points} نقطة
                        </span>
                      </div>
                    </div>

                    <button
                      onClick={() => handleDelete(q.id)}
                      className="rounded-xl p-2 text-red-400 transition hover:bg-red-50"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>

                <div className="space-y-2 p-5">
                  {q.options?.map((opt, optionIndex) => (
                    <div
                      key={opt.id}
                      className={`flex items-center gap-3 rounded-xl border px-4 py-3 text-sm ${
                        opt.is_correct
                          ? "border-cyan-200 bg-cyan-50 text-cyan-700"
                          : "border-slate-100 bg-white text-slate-500"
                      }`}
                    >
                      <span
                        className={`flex h-7 w-7 items-center justify-center rounded-lg text-xs font-bold ${
                          opt.is_correct
                            ? "bg-cyan-500 text-white"
                            : "bg-slate-100 text-slate-400"
                        }`}
                      >
                        {String.fromCharCode(65 + optionIndex)}
                      </span>

                      <span className="flex-1">{opt.option_text}</span>

                      {opt.is_correct && (
                        <CheckCircle2 className="h-4 w-4 shrink-0" />
                      )}
                    </div>
                  ))}
                </div>
              </Card>
            </motion.div>
          ))}
        </div>
      )}

      <Modal
        open={questionModalOpen}
        onClose={() => setQuestionModalOpen(false)}
        title="إضافة سؤال جديد"
        maxWidth="max-w-xl"
      >
        <div className="space-y-4">
          <Input
            label="نص السؤال"
            value={questionText}
            onChange={(e) => setQuestionText(e.target.value)}
            placeholder="اكتب السؤال هنا..."
          />

          <Input
            label="عدد النقاط"
            type="number"
            min={1}
            value={points}
            onChange={(e) => setPoints(Number(e.target.value))}
          />

          <div>
            <label className="mb-2 block text-sm font-bold text-slate-700">
              الاختيارات
            </label>

            <div className="space-y-2">
              <AnimatePresence initial={false}>
                {options.map((opt, i) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    className="flex items-center gap-2"
                  >
                    <input
                      type="checkbox"
                      checked={opt.correct}
                      onChange={() =>
                        setOptions(
                          options.map((o, j) =>
                            j === i
                              ? { ...o, correct: !o.correct }
                              : o
                          )
                        )
                      }
                      className="h-4 w-4 accent-brand-500"
                    />

                    <input
                      value={opt.text}
                      onChange={(e) =>
                        setOptions(
                          options.map((o, j) =>
                            j === i
                              ? { ...o, text: e.target.value }
                              : o
                          )
                        )
                      }
                      placeholder={`الخيار ${i + 1}`}
                      className="flex-1 rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-500/10"
                    />

                    {options.length > 2 && (
                      <button
                        type="button"
                        onClick={() => removeOptionField(i)}
                        className="rounded-lg p-2 text-slate-400 hover:bg-red-50 hover:text-red-500"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    )}
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>

            <button
              type="button"
              onClick={addOptionField}
              className="mt-3 text-xs font-bold text-brand-500 hover:text-brand-600"
            >
              + إضافة خيار آخر
            </button>
          </div>

          <Button className="w-full" onClick={handleCreateQuestion}>
            إضافة السؤال
          </Button>
        </div>
      </Modal>
    </div>
  );
}

function StatCard({
  icon,
  label,
  value,
  tone = "brand",
}: {
  icon: React.ReactNode;
  label: string;
  value: string | number;
  tone?: "brand" | "green" | "amber";
}) {
  const tones = {
    brand: "bg-brand-50 text-brand-500",
    green: "bg-cyan-50 text-cyan-500",
    amber: "bg-amber-50 text-amber-500",
  };

  return (
    <div className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
      <div className="flex items-center justify-between">
        <div className={`rounded-xl p-2 ${tones[tone]}`}>{icon}</div>
        <span className="text-xl font-black text-slate-800">{value}</span>
      </div>

      <p className="mt-3 text-xs font-medium text-slate-400">{label}</p>
    </div>
  );
}

function QuizScopeBadge({
  quiz,
  sections,
}: {
  quiz: Quiz;
  sections: CourseSection[];
}) {
  const section = sections.find((item) => item.id === quiz.section_id);
  const lesson = section?.lessons?.find((item) => item.id === quiz.lesson_id);

  const label = lesson
    ? `درس: ${lesson.title}`
    : section
      ? `قسم: ${section.title}`
      : "كل الكورس";

  return (
    <div className="mt-4 inline-flex max-w-full items-center gap-2 rounded-lg bg-brand-50 px-2.5 py-1.5 text-xs font-bold text-brand-700">
      <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-brand-500" />
      <span className="truncate">{label}</span>
    </div>
  );
}

function MiniInfo({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-xl bg-slate-50 p-3">
      <div className="flex items-center gap-1.5 text-slate-400">
        {icon}
        <span className="text-[10px]">{label}</span>
      </div>
      <p className="mt-1 text-xs font-bold text-slate-700">{value}</p>
    </div>
  );
}

function EditorStat({
  icon,
  value,
  label,
}: {
  icon: React.ReactNode;
  value: string | number;
  label: string;
}) {
  return (
    <div className="rounded-2xl bg-slate-50 p-3">
      <div className="flex items-center gap-2 text-brand-500">{icon}</div>
      <p className="mt-2 font-black text-slate-800">{value}</p>
      <p className="text-[11px] text-slate-400">{label}</p>
    </div>
  );
}