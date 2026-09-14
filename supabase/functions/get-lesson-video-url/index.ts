// Supabase Edge Function: get-lesson-video-url
// انشرها عبر: supabase functions deploy get-lesson-video-url
//
// الغرض: توليد رابط فيديو موقّع (Signed URL) صالح لعدة دقائق فقط، بعد
// التحقق الصارم من أن الطالب مشترك فعليًا (enrollment.status = 'active')
// في الكورس الذي يتبعه الدرس، أو أن الدرس preview. لا يتم إرجاع video_path
// الخام أبدًا لأي طرف غير مصرح له.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";

const SUPABASE_URL = Deno.env.get("https://wijtjofukwoqrnmhbggh.supabase.co")!;
const SERVICE_ROLE_KEY = Deno.env.get("eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndpanRqb2Z1a3dvcXJubWhiZ2doIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4OTMxOTk5OCwiZXhwIjoyMTA0ODk1OTk4fQ.OqPrfve3WajzZaDmd_mWa4SsZaivFCP4XPmRMwJci5o")!;

Deno.serve(async (req) => {
  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return json({ error: "Unauthorized" }, 401);
    }

    const { lessonId } = await req.json();
    if (!lessonId) return json({ error: "lessonId is required" }, 400);

    // عميل مرتبط بتوكن المستخدم لمعرفة هويته
    const userClient = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: userData, error: userError } = await userClient.auth.getUser();
    if (userError || !userData.user) return json({ error: "Unauthorized" }, 401);

    // عميل بصلاحية service_role للقراءة/التوقيع المباشر
    const adminClient = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

    const { data: lesson, error: lessonError } = await adminClient
      .from("lessons")
      .select("id, video_path, is_preview, section_id, course_sections(course_id)")
      .eq("id", lessonId)
      .single();

    if (lessonError || !lesson || !lesson.video_path) {
      return json({ error: "Lesson not found or has no video" }, 404);
    }

    const courseId = (lesson as any).course_sections?.course_id;

    if (!lesson.is_preview) {
      const { data: enrollment } = await adminClient
        .from("enrollments")
        .select("id")
        .eq("course_id", courseId)
        .eq("student_id", userData.user.id)
        .eq("status", "active")
        .maybeSingle();

      if (!enrollment) {
        return json({ error: "Not enrolled in this course" }, 403);
      }
    }

    const { data: signed, error: signError } = await adminClient.storage
      .from("course-videos")
      .createSignedUrl(lesson.video_path, 60 * 10); // صالح 10 دقائق فقط

    if (signError || !signed) return json({ error: "Could not generate video URL" }, 500);

    return json({ url: signed.signedUrl }, 200);
  } catch (e) {
    return json({ error: "Internal error" }, 500);
  }
});

function json(body: unknown, status: number) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}
