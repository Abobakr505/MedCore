// supabase/functions/create-vdocipher-video/index.ts
//
// ينشئ فيديو على VdoCipher ويرجع بيانات الرفع المباشر.
// الآن مع تحقق من المستخدم وصلاحيته على الدرس.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      ...corsHeaders,
      "Content-Type": "application/json",
    },
  });
}

const REQUIRED_UPLOAD_PARAMS = [
  "key",
  "policy",
  "x-amz-signature",
  "x-amz-algorithm",
  "x-amz-date",
  "x-amz-credential",
] as const;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return json({ error: "Method not allowed" }, 405);
  }

  try {
    // =========================
    // 1. Env
    // =========================
    const apiSecret = Deno.env.get("VDOCIPHER_API_SECRET");
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const folderId = Deno.env.get("VDOCIPHER_FOLDER_ID"); // اختياري

    if (!apiSecret) {
      console.error("VDOCIPHER_API_SECRET is missing");
      return json({ error: "Missing VDOCIPHER_API_SECRET" }, 500);
    }

    if (!supabaseUrl || !serviceKey) {
      console.error("Supabase env is missing");
      return json({ error: "Server is not configured correctly" }, 500);
    }

    // =========================
    // 2. Authenticate user
    // =========================
    const authHeader = req.headers.get("Authorization") ?? "";
    const token = authHeader.replace(/^Bearer\s+/i, "").trim();

    if (!token) {
      return json({ error: "Unauthorized" }, 401);
    }

    const admin = createClient(supabaseUrl, serviceKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    const {
      data: { user },
      error: userError,
    } = await admin.auth.getUser(token);

    if (userError || !user) {
      return json({ error: "Unauthorized" }, 401);
    }

    // =========================
    // 3. Body
    // =========================
    let body: any = null;
    try {
      body = await req.json();
    } catch {
      return json({ error: "Invalid JSON body" }, 400);
    }

    const lessonId = String(body?.lessonId ?? "").trim();

    if (!lessonId) {
      return json({ error: "lessonId is required" }, 400);
    }

    // =========================
    // 4. Authorization: المستخدم لازم يكون صاحب الكورس (أو أدمن)
    // =========================
    const { data: lesson, error: lessonError } = await admin
      .from("lessons")
      .select("id, course_sections!inner(course_id, courses!inner(teacher_id))")
      .eq("id", lessonId)
      .maybeSingle();

    if (lessonError) {
      console.error("Lesson lookup error:", lessonError);
      return json({ error: "Failed to verify lesson" }, 500);
    }

    if (!lesson) {
      return json({ error: "Lesson not found" }, 404);
    }

    const sectionRel: any = Array.isArray((lesson as any).course_sections)
      ? (lesson as any).course_sections[0]
      : (lesson as any).course_sections;

    const courseRel: any = Array.isArray(sectionRel?.courses)
      ? sectionRel.courses[0]
      : sectionRel?.courses;

    const teacherId: string | undefined = courseRel?.teacher_id;

    let allowed = teacherId === user.id;

    if (!allowed) {
      // عدّل اسم الجدول/العمود حسب مشروعك لو مختلف
      const { data: profile } = await admin
        .from("profiles")
        .select("role")
        .eq("id", user.id)
        .maybeSingle();

      allowed = profile?.role === "admin";
    }

    if (!allowed) {
      return json({ error: "Forbidden" }, 403);
    }

    // =========================
    // 5. Create video on VdoCipher
    // =========================
    const videoTitle = String(body?.title || lessonId || "untitled").slice(
      0,
      200,
    );

    const params = new URLSearchParams({ title: videoTitle });
    if (folderId) params.set("folderId", folderId);

    const vdoUrl = `https://www.vdocipher.com/api/videos?${params.toString()}`;

    console.log("Creating VdoCipher video", { lessonId, title: videoTitle });

    const vdoRes = await fetch(vdoUrl, {
      method: "PUT",
      headers: {
        Authorization: "Apisecret " + apiSecret,
        Accept: "application/json",
      },
    });

    const rawResponse = await vdoRes.text();

    console.log("VdoCipher status:", vdoRes.status);

    if (!vdoRes.ok) {
      console.error("VdoCipher API error:", vdoRes.status, rawResponse);

      let details: unknown = rawResponse;
      try {
        details = JSON.parse(rawResponse);
      } catch {
        // keep raw
      }

      // 502 عشان ما نخلطش خطأ VdoCipher (مثلاً 401) مع خطأ تسجيل دخول المستخدم
      return json(
        {
          error: "VdoCipher API error",
          vdocipherStatus: vdoRes.status,
          details,
        },
        502,
      );
    }

    let result: any;
    try {
      result = JSON.parse(rawResponse);
    } catch {
      console.error("Invalid JSON returned by VdoCipher");
      return json({ error: "VdoCipher returned invalid JSON" }, 502);
    }

    if (!result?.videoId) {
      return json(
        { error: "VdoCipher did not return videoId", response: result },
        502,
      );
    }

    const clientPayload = result?.clientPayload;

    if (!clientPayload) {
      return json(
        {
          error: "VdoCipher did not return clientPayload",
          videoId: result.videoId,
        },
        502,
      );
    }

    const uploadLink = clientPayload.uploadLink;

    if (!uploadLink) {
      return json(
        {
          error: "VdoCipher did not return uploadLink",
          videoId: result.videoId,
        },
        502,
      );
    }

    const uploadParameters: Record<string, string> = {
      key: clientPayload.key,
      policy: clientPayload.policy,
      "x-amz-signature": clientPayload["x-amz-signature"],
      "x-amz-algorithm": clientPayload["x-amz-algorithm"],
      "x-amz-date": clientPayload["x-amz-date"],
      "x-amz-credential": clientPayload["x-amz-credential"],
    };

    const missingParameters = REQUIRED_UPLOAD_PARAMS.filter(
      (name) => !uploadParameters[name],
    );

    if (missingParameters.length > 0) {
      console.error("Missing upload parameters:", missingParameters);

      return json(
        {
          error: "VdoCipher upload parameters are incomplete",
          videoId: result.videoId,
          missingParameters,
        },
        502,
      );
    }

    console.log("VdoCipher video created:", result.videoId);

    return json({
      success: true,
      videoId: result.videoId,
      uploadUrl: uploadLink,
      uploadParameters,
    });
  } catch (error) {
    console.error("create-vdocipher-video error:", error);

    return json(
      {
        error: error instanceof Error ? error.message : String(error),
      },
      500,
    );
  }
});