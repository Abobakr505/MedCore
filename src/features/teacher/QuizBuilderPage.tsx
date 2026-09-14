import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { Plus, Trash2, ClipboardList, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Card } from "@/components/ui/Card";
import { Modal } from "@/components/ui/Modal";
import { Skeleton } from "@/components/ui/Skeleton";
import { EmptyState } from "@/components/ui/EmptyState";
import { useToast } from "@/contexts/ToastContext";
import { fetchCourseQuizzes, createQuiz, fetchQuizForEditing, addQuestion, addOption, deleteQuestion } from "@/services/quizzes";
import type { Quiz, QuizQuestion } from "@/types";

export default function QuizBuilderPage() {
  const { courseId } = useParams<{ courseId: string }>();
  const { showToast } = useToast();

  const [quizzes, setQuizzes] = useState<Quiz[]>([]);
  const [activeQuiz, setActiveQuiz] = useState<Quiz | null>(null);
  const [questions, setQuestions] = useState<QuizQuestion[]>([]);
  const [loading, setLoading] = useState(true);
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [quizForm, setQuizForm] = useState({ title: "", description: "", durationMinutes: 30, passingScore: 60 });

  const load = async () => {
    if (!courseId) return;
    setLoading(true);
    const list = await fetchCourseQuizzes(courseId);
    setQuizzes(list);
    setLoading(false);
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [courseId]);

  const openQuiz = async (quiz: Quiz) => {
    setActiveQuiz(quiz);
    setQuestions(await fetchQuizForEditing(quiz.id));
  };

  const handleCreateQuiz = async () => {
    if (!courseId || !quizForm.title.trim()) return;
    try {
      await createQuiz({ courseId, ...quizForm });
      showToast("تم إنشاء الاختبار", "success");
      setCreateModalOpen(false);
      setQuizForm({ title: "", description: "", durationMinutes: 30, passingScore: 60 });
      load();
    } catch {
      showToast("تعذّر إنشاء الاختبار", "error");
    }
  };

  if (loading) return <Skeleton className="h-64 rounded-2xl" />;

  if (activeQuiz) {
    return (
      <QuizEditor
        quiz={activeQuiz}
        questions={questions}
        onBack={() => setActiveQuiz(null)}
        onRefresh={async () => setQuestions(await fetchQuizForEditing(activeQuiz.id))}
      />
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-extrabold text-brand-900">اختبارات الكورس</h1>
        <Button onClick={() => setCreateModalOpen(true)}><Plus className="w-4 h-4" /> اختبار جديد</Button>
      </div>

      <div className="mt-6 grid gap-4 sm:grid-cols-2">
        {quizzes.length === 0 ? (
          <div className="col-span-full"><EmptyState icon={<ClipboardList className="w-6 h-6" />} title="لا توجد اختبارات بعد" /></div>
        ) : (
          quizzes.map((q) => (
            <Card key={q.id} className="cursor-pointer p-5 hover:shadow-md" onClick={() => openQuiz(q)}>
              <p className="font-bold text-slate-800">{q.title}</p>
              <p className="mt-1 text-xs text-slate-400">{q.duration_minutes} دقيقة · درجة النجاح {q.passing_score}%</p>
            </Card>
          ))
        )}
      </div>

      <Modal open={createModalOpen} onClose={() => setCreateModalOpen(false)} title="إنشاء اختبار جديد">
        <div className="space-y-4">
          <Input label="عنوان الاختبار" value={quizForm.title} onChange={(e) => setQuizForm({ ...quizForm, title: e.target.value })} />
          <Input label="الوصف" value={quizForm.description} onChange={(e) => setQuizForm({ ...quizForm, description: e.target.value })} />
          <div className="grid grid-cols-2 gap-3">
            <Input label="المدة (دقيقة)" type="number" value={quizForm.durationMinutes} onChange={(e) => setQuizForm({ ...quizForm, durationMinutes: Number(e.target.value) })} />
            <Input label="درجة النجاح (%)" type="number" value={quizForm.passingScore} onChange={(e) => setQuizForm({ ...quizForm, passingScore: Number(e.target.value) })} />
          </div>
          <Button className="w-full" onClick={handleCreateQuiz}>إنشاء</Button>
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
  const [options, setOptions] = useState([{ text: "", correct: false }, { text: "", correct: false }]);

  const addOptionField = () => setOptions([...options, { text: "", correct: false }]);

  const handleCreateQuestion = async () => {
    if (!questionText.trim() || options.filter((o) => o.text.trim()).length < 2) {
      showToast("أضف نص السؤال وخيارين على الأقل", "error");
      return;
    }
    if (!options.some((o) => o.correct)) {
      showToast("حدّد إجابة صحيحة واحدة على الأقل", "error");
      return;
    }
    try {
      const question = await addQuestion(quiz.id, questionText, points, questions.length);
      for (const opt of options.filter((o) => o.text.trim())) {
        await addOption(question.id, opt.text, opt.correct);
      }
      setQuestionText("");
      setPoints(1);
      setOptions([{ text: "", correct: false }, { text: "", correct: false }]);
      setQuestionModalOpen(false);
      onRefresh();
    } catch {
      showToast("تعذّر إضافة السؤال", "error");
    }
  };

  return (
    <div>
      <button onClick={onBack} className="mb-4 text-sm font-semibold text-brand-500 hover:underline">← العودة لقائمة الاختبارات</button>
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-extrabold text-brand-900">{quiz.title}</h1>
        <Button onClick={() => setQuestionModalOpen(true)}><Plus className="w-4 h-4" /> سؤال جديد</Button>
      </div>

      <div className="mt-6 space-y-4">
        {questions.map((q, idx) => (
          <Card key={q.id} className="p-5">
            <div className="flex items-start justify-between">
              <p className="font-semibold text-slate-800">{idx + 1}. {q.question} <span className="text-xs text-slate-400">({q.points} نقطة)</span></p>
              <button onClick={async () => { await deleteQuestion(q.id); onRefresh(); }} className="text-red-400 hover:text-red-500">
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
            <div className="mt-3 space-y-1.5">
              {q.options?.map((opt) => (
                <p key={opt.id} className={`flex items-center gap-2 rounded-lg px-3 py-1.5 text-sm ${opt.is_correct ? "bg-emerald-50 text-emerald-700" : "text-slate-500"}`}>
                  {opt.is_correct && <CheckCircle2 className="w-3.5 h-3.5" />} {opt.option_text}
                </p>
              ))}
            </div>
          </Card>
        ))}
      </div>

      <Modal open={questionModalOpen} onClose={() => setQuestionModalOpen(false)} title="إضافة سؤال جديد" maxWidth="max-w-xl">
        <div className="space-y-4">
          <Input label="نص السؤال" value={questionText} onChange={(e) => setQuestionText(e.target.value)} />
          <Input label="عدد النقاط" type="number" value={points} onChange={(e) => setPoints(Number(e.target.value))} />
          <div>
            <label className="mb-2 block text-sm font-medium text-slate-700">الخيارات (حدّد الإجابة الصحيحة)</label>
            <div className="space-y-2">
              {options.map((opt, i) => (
                <div key={i} className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={opt.correct}
                    onChange={() => setOptions(options.map((o, j) => (j === i ? { ...o, correct: !o.correct } : o)))}
                  />
                  <input
                    value={opt.text}
                    onChange={(e) => setOptions(options.map((o, j) => (j === i ? { ...o, text: e.target.value } : o)))}
                    placeholder={`الخيار ${i + 1}`}
                    className="flex-1 rounded-lg border border-slate-300 px-3 py-2 text-sm"
                  />
                </div>
              ))}
            </div>
            <button onClick={addOptionField} className="mt-2 text-xs font-semibold text-brand-500 hover:underline">+ إضافة خيار آخر</button>
          </div>
          <Button className="w-full" onClick={handleCreateQuestion}>إضافة السؤال</Button>
        </div>
      </Modal>
    </div>
  );
}
