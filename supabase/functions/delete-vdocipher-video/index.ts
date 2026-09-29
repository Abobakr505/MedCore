// supabase/functions/delete-vdocipher-video/index.ts
// يحذف فيديو أو أكثر من VdoCipher.
// المسموح: الأدمن (أي فيديو) أو المدرس صاحب الكورس.
// الفيديو المحذوف مسبقًا (404) يعتبر نجاحًا.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const BATCH_SIZE = 50;
const ADMIN_ROLES = ["admin"];
const TEACHER_ROLES = ["teacher"];

function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function first<T>(value: T | T[] | null | undefined): T | undefined {
  return Array.isArray(value) ? value[0] : (value ?? undefined);
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders });
  }
  if (req.method !== "POST") {
    return json({ success: false, error: "Method not allowed" }, 405);
  }

  try {
    // 1. Env
    const apiSecret = Deno.env.get("VDOCIPHER_API_SECRET");
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!apiSecret) {
      return json({ success: false, error: "Missing VDOCIPHER_API_SECRET" }, 500);
    }
    if (!supabaseUrl || !serviceKey) {
      return json({ success: false, error: "Server is not configured correctly" }, 500);
    }

    // 2. Authenticate
    const token = (req.headers.get("Authorization") ?? "")
      .replace(/^Bearer\s+/i, "")
      .trim();
    if (!token) return json({ success: false, error: "Unauthorized" }, 401);

    const admin = createClient(supabaseUrl, serviceKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    const {
      data: { user },
      error: userError,
    } = await admin.auth.getUser(token);
    if (userError || !user) return json({ success: false, error: "Unauthorized" }, 401);

    const { data: profile } = await admin
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .maybeSingle();

    const role: string = profile?.role ?? "";
    const isAdmin = ADMIN_ROLES.includes(role);
    const isTeacher = TEACHER_ROLES.includes(role);

    if (!isAdmin && !isTeacher) {
      return json({ success: false, error: "Forbidden" }, 403);
    }

    // 3. Body
    let body: any = null;
    try {
      body = await req.json();
    } catch {
      return json({ success: false, error: "Invalid JSON body" }, 400);
    }

    const rawIds: unknown[] = Array.isArray(body?.videoIds)
      ? body.videoIds
      : body?.videoId
      ? [body.videoId]
      : [];

    const videoIds = Array.from(
      new Set(
        rawIds
          .filter((id): id is string => typeof id === "string" && id.trim().length > 0)
          .map((id) => id.trim()),
      ),
    );

    if (videoIds.length === 0) {
      return json({ success: false, error: "videoId or videoIds is required" }, 400);
    }

    // 4. Ownership check (للمدرس فقط - الأدمن يتجاوز)
    if (!isAdmin) {
      const { data: linked, error: linkedError } = await admin
        .from("lessons")
        .select("id, vdocipher_video_id, course_sections!inner(courses!inner(teacher_id))")
        .in("vdocipher_video_id", videoIds);

      if (linkedError) {
        console.error("Ownership lookup error:", linkedError);
        return json({ success: false, error: "Failed to verify ownership" }, 500);
      }

      for (const row of (linked ?? []) as any[]) {
        const section = first<any>(row.course_sections);
        const course = first<any>(section?.courses);
        if (course?.teacher_id !== user.id) {
          return json(
            { success: false, error: "Forbidden: video belongs to another teacher" },
            403,
          );
        }
      }
    }

    // 5. Delete from VdoCipher
    const deleted: string[] = [];
    const failed: { videoIds: string[]; vdoStatus: number; vdoResponse: string | null }[] = [];

    for (let i = 0; i < videoIds.length; i += BATCH_SIZE) {
      const batch = videoIds.slice(i, i + BATCH_SIZE);
      const deleteUrl =
        "https://dev.vdocipher.com/api/videos?videos=" +
        encodeURIComponent(batch.join(","));

      const vdoRes = await fetch(deleteUrl, {
        method: "DELETE",
        headers: {
          Authorization: "Apisecret " + apiSecret,
          Accept: "application/json",
        },
      });
      const responseText = await vdoRes.text();
      console.log("VdoCipher delete:", vdoRes.status, responseText);

      if (vdoRes.ok || vdoRes.status === 404) {
        deleted.push(...batch);
      } else {
        failed.push({
          videoIds: batch,
          vdoStatus: vdoRes.status,
          vdoResponse: responseText || null,
        });
      }
    }

    if (failed.length > 0) {
      return json(
        { success: false, error: "VdoCipher refused to delete some videos.", deleted, failed },
        502,
      );
    }

    return json({
      success: true,
      message: "Videos deleted from VdoCipher.",
      deletedCount: deleted.length,
      deleted,
    });
  } catch (error) {
    console.error("DELETE VDOCIPHER VIDEO ERROR:", error);
    return json(
      { success: false, error: error instanceof Error ? error.message : String(error) },
      500,
    );
  }
});