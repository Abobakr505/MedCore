// supabase/functions/create-vdocipher-video/index.ts
// ينشئ فيديو على VdoCipher ويرجع بيانات الرفع المباشر.
// المسموح: الأدمن (أي درس) أو المدرس صاحب الكورس.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const ADMIN_ROLES = ["admin"];

function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function first<T>(value: T | T[] | null | undefined): T | undefined {
  return Array.isArray(value) ? value[0] : (value ?? undefined);
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
    // 1. Env
    const apiSecret = Deno.env.get("VDOCIPHER_API_SECRET");
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const folderId = Deno.env.get("VDOCIPHER_FOLDER_ID"); // اختياري

    if (!apiSecret) return json({ error: "Missing VDOCIPHER_API_SECRET" }, 500);
    if (!supabaseUrl || !serviceKey) {
      return json({ error: "Server is not configured correctly" }, 500);
    }

    // 2. Authenticate
    const token = (req.headers.get("Authorization") ?? "")
      .replace(/^Bearer\s+/i, "")
      .trim();
    if (!token) return json({ error: "Unauthorized" }, 401);

    const admin = createClient(supabaseUrl, serviceKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    const {
      data: { user },
      error: userError,
    } = await admin.auth.getUser(token);
    if (userError || !user) return json({ error: "Unauthorized" }, 401);

    const { data: profile } = await admin
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .maybeSingle();
    const isAdmin = ADMIN_ROLES.includes(profile?.role ?? "");

    // 3. Body
    let body: any = null;
    try {
      body = await req.json();
    } catch {
      return json({ error: "Invalid JSON body" }, 400);
    }
    const lessonId = String(body?.lessonId ?? "").trim();
    if (!lessonId) return json({ error: "lessonId is required" }, 400);

    // 4. Authorization
    const { data: lesson, error: lessonError } = await admin
      .from("lessons")
      .select("id, course_sections!inner(course_id, courses!inner(teacher_id))")
      .eq("id", lessonId)
      .maybeSingle();

    if (lessonError) {
      console.error("Lesson lookup error:", lessonError);
      return json({ error: "Failed to verify lesson" }, 500);
    }
    if (!lesson) return json({ error: "Lesson not found" }, 404);

    if (!isAdmin) {
      const section = first<any>((lesson as any).course_sections);
      const course = first<any>(section?.courses);
      if (course?.teacher_id !== user.id) {
        return json({ error: "Forbidden" }, 403);
      }
    }

    // 5. Create video on VdoCipher
    const videoTitle = String(body?.title || lessonId || "untitled").slice(0, 200);
    const params = new URLSearchParams({ title: videoTitle });
    if (folderId) params.set("folderId", folderId);

    const vdoRes = await fetch(
      `https://www.vdocipher.com/api/videos?${params.toString()}`,
      {
        method: "PUT",
        headers: {
          Authorization: "Apisecret " + apiSecret,
          Accept: "application/json",
        },
      },
    );
    const rawResponse = await vdoRes.text();

    if (!vdoRes.ok) {
      console.error("VdoCipher API error:", vdoRes.status, rawResponse);
      let details: unknown = rawResponse;
      try {
        details = JSON.parse(rawResponse);
      } catch {
        // keep raw
      }
      return json(
        { error: "VdoCipher API error", vdocipherStatus: vdoRes.status, details },
        502,
      );
    }

    let result: any;
    try {
      result = JSON.parse(rawResponse);
    } catch {
      return json({ error: "VdoCipher returned invalid JSON" }, 502);
    }

    if (!result?.videoId) {
      return json({ error: "VdoCipher did not return videoId", response: result }, 502);
    }

    const clientPayload = result?.clientPayload;
    if (!clientPayload?.uploadLink) {
      return json(
        { error: "VdoCipher did not return upload data", videoId: result.videoId },
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
      return json(
        {
          error: "VdoCipher upload parameters are incomplete",
          videoId: result.videoId,
          missingParameters,
        },
        502,
      );
    }

    return json({
      success: true,
      videoId: result.videoId,
      uploadUrl: clientPayload.uploadLink,
      uploadParameters,
    });
  } catch (error) {
    console.error("create-vdocipher-video error:", error);
    return json({ error: error instanceof Error ? error.message : String(error) }, 500);
  }
});