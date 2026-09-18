import { supabase } from "@/lib/supabase";
import type { Quiz, QuizQuestion, QuizAttempt } from "@/types";

export async function fetchCourseQuizzes(courseId: string) {
  const { data, error } = await supabase.from("quizzes").select("*").eq("course_id", courseId).order("created_at");
  if (error) throw error;
  return (data ?? []) as Quiz[];
}

/** أثناء أداء الاختبار: لا نطلب is_correct إطلاقًا من الـ select */
export async function fetchQuizForAttempt(quizId: string) {
  const { data: quiz, error: quizError } = await supabase.from("quizzes").select("*").eq("id", quizId).single();
  if (quizError) throw quizError;

  const { data: questions, error: qError } = await supabase
    .from("quiz_questions")
    .select("id, quiz_id, question, points, order_index, options:quiz_options(id, question_id, option_text)")
    .eq("quiz_id", quizId)
    .order("order_index");
  if (qError) throw qError;

  return { quiz: quiz as Quiz, questions: (questions ?? []) as unknown as QuizQuestion[] };
}

/** نسخة كاملة للمعلم (تتضمن is_correct) لأغراض بناء/تعديل الاختبار */
export async function fetchQuizForEditing(quizId: string) {
  const { data: questions, error } = await supabase
    .from("quiz_questions")
    .select("id, quiz_id, question, points, order_index, options:quiz_options(id, question_id, option_text, is_correct)")
    .eq("quiz_id", quizId)
    .order("order_index");
  if (error) throw error;
  return (questions ?? []) as unknown as QuizQuestion[];
}

export async function startQuizAttempt(quizId: string, studentId: string) {
  const { data, error } = await supabase
    .from("quiz_attempts")
    .insert({ quiz_id: quizId, student_id: studentId })
    .select()
    .single();
  if (error) throw error;
  return data as QuizAttempt;
}

export async function saveQuizAnswer(attemptId: string, questionId: string, selectedOptionId: string) {
  const { error } = await supabase
    .from("quiz_answers")
    .upsert(
      { attempt_id: attemptId, question_id: questionId, selected_option_id: selectedOptionId },
      { onConflict: "attempt_id,question_id" }
    );
  if (error) throw error;
}

/** التصحيح يتم بالكامل من RPC على السيرفر — لا حساب للنتيجة في الفرونت إند */
export async function submitQuizAttempt(attemptId: string) {
  const { data, error } = await supabase.rpc("submit_quiz_attempt", { p_attempt_id: attemptId });
  if (error) throw error;
  return data as { score: number; percentage: number; total_points: number };
}

export async function fetchStudentAttempts(studentId: string) {
  const { data, error } = await supabase
    .from("quiz_attempts")
    .select("*, quiz:quizzes(title, course_id, passing_score, courses:courses(title))")
    .eq("student_id", studentId)
    .not("submitted_at", "is", null)
    .order("submitted_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as unknown as QuizAttempt[];
}

// ===== إدارة الاختبارات (المعلم) =====

export async function createQuiz(params: {
  courseId: string;
  sectionId?: string | null;
  lessonId?: string | null;
  title: string;
  description: string;
  durationMinutes: number;
  passingScore: number;
}) {
  const { data, error } = await supabase
    .from("quizzes")
    .insert({
      course_id: params.courseId,
      section_id: params.sectionId ?? null,
      lesson_id: params.lessonId ?? null,
      title: params.title,
      description: params.description,
      duration_minutes: params.durationMinutes,
      passing_score: params.passingScore,
    })
    .select()
    .single();
  if (error) throw error;
  return data as Quiz;
}

export async function addQuestion(quizId: string, question: string, points: number, orderIndex: number) {
  const { data, error } = await supabase
    .from("quiz_questions")
    .insert({ quiz_id: quizId, question, points, order_index: orderIndex })
    .select()
    .single();
  if (error) throw error;
  return data as QuizQuestion;
}

export async function addOption(questionId: string, optionText: string, isCorrect: boolean) {
  const { error } = await supabase.from("quiz_options").insert({ question_id: questionId, option_text: optionText, is_correct: isCorrect });
  if (error) throw error;
}

export async function deleteQuestion(questionId: string) {
  const { error } = await supabase.from("quiz_questions").delete().eq("id", questionId);
  if (error) throw error;
}

export async function updateQuiz(params: {
  quizId: string;
  sectionId?: string | null;
  lessonId?: string | null;
  title: string;
  description: string;
  durationMinutes: number;
  passingScore: number;
}) {
  const { data, error } = await supabase
    .from("quizzes")
    .update({
      section_id: params.sectionId ?? null,
      lesson_id: params.lessonId ?? null,
      title: params.title,
      description: params.description,
      duration_minutes: params.durationMinutes,
      passing_score: params.passingScore,
    })
    .eq("id", params.quizId)
    .select()
    .single();

  if (error) throw error;

  return data as Quiz;
}