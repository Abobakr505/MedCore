import { supabase } from "@/lib/supabase";

export async function getSignedLessonVideoUrl(lessonId: string): Promise<string> {
  const { data, error } = await supabase.functions.invoke("get-lesson-video-url", {
    body: { lessonId },
  });
  if (error) throw error;
  if (!data?.url) throw new Error("تعذّر الحصول على رابط الفيديو");
  return data.url as string;
}
