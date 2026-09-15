import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return json({ error: "Unauthorized" }, 401);
    }

    const { lessonId } = await req.json();
    if (!lessonId) return json({ error: "lessonId is required" }, 400);

    const userClient = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: userData, error: userError } = await userClient.auth.getUser();
    if (userError || !userData.user) return json({ error: "Unauthorized" }, 401);

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
      .createSignedUrl(lesson.video_path, 60 * 10);

    if (signError || !signed) return json({ error: "Could not generate video URL" }, 500);

    return json({ url: signed.signedUrl }, 200);
  } catch (e) {
    console.error(e);
    return json({ error: "Internal error" }, 500);
  }
});

function json(body: unknown, status: number) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}