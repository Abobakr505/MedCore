// supabase/functions/get-vdocipher-otp/index.ts
//
// يطلّع OTP لتشغيل فيديو من VdoCipher مع علامة مائية برقم تليفون الطالب.
// - يتحقق من المستخدم
// - يتحقق من صلاحية المشاهدة (معاينة مجانية / مشترك / صاحب الكورس / أدمن)
// - الاشتراك الموقوف: يشاهد الدروس اللي اتنشرت قبل suspended_at فقط

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*", // الأفضل تحديد دومينك
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

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
    return json({ error: "Method not allowed" }, 405);
  }

  try {
    // =========================
    // 1) Env
    // =========================
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const apiSecret = Deno.env.get("VDOCIPHER_API_SECRET");

    if (!supabaseUrl || !anonKey || !serviceKey) {
      console.error("Supabase env is missing");
      return json({ error: "Server is not configured correctly" }, 500);
    }

    if (!apiSecret) {
      console.error("VDOCIPHER_API_SECRET is missing");
      return json({ error: "Missing VDOCIPHER_API_SECRET" }, 500);
    }

    // =========================
    // 2) التحقق من المستخدم
    // =========================
    const userClient = createClient(supabaseUrl, anonKey, {
      global: {
        headers: { Authorization: req.headers.get("Authorization") ?? "" },
      },
    });

    const {
      data: { user },
      error: authError,
    } = await userClient.auth.getUser();

    if (authError || !user) return json({ error: "Unauthorized" }, 401);

    // عميل بصلاحيات كاملة للقراءة من السيرفر فقط
    const admin = createClient(supabaseUrl, serviceKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    // =========================
    // 3) Body
    // =========================
    let body: any = null;
    try {
      body = await req.json();
    } catch {
      return json({ error: "Invalid JSON body" }, 400);
    }

    const videoId = String(body?.videoId ?? "").trim();
    if (!videoId) return json({ error: "videoId is required" }, 400);

    // =========================
    // 4) صلاحية المشاهدة
    // =========================
    const { data: lesson, error: lessonError } = await admin
      .from("lessons")
      .select(
        "id, created_at, is_preview, course_sections!inner(course_id, unlock_month, courses!inner(teacher_id))",
      )
      .eq("vdocipher_video_id", videoId)
      .maybeSingle();

    if (lessonError) {
      console.error("Lesson lookup error:", lessonError);
      return json({ error: "Failed to verify access" }, 500);
    }

    if (!lesson) return json({ error: "Video not found" }, 404);

    const section = first<any>((lesson as any).course_sections);
    const course = first<any>(section?.courses);
    const courseId: string | undefined = section?.course_id;

    const { data: profile } = await admin
      .from("profiles")
      .select("role, phone, full_name")
      .eq("id", user.id)
      .maybeSingle();

    const isAdmin = profile?.role === "admin";
    const isOwner = course?.teacher_id === user.id;

    let canWatch = isAdmin || isOwner || Boolean((lesson as any).is_preview);

    if (!canWatch && courseId) {
      const { data: enrollment, error: enrollError } = await admin
        .from("enrollments")
        .select("id, status, suspended_at")
        .eq("course_id", courseId)
        .eq("student_id", user.id) // عدّل اسم العمود لو مختلف (مثلاً user_id)
        .in("status", ["active", "suspended"])
        .limit(1)
        .maybeSingle();

      if (enrollError) {
        console.error("Enrollment lookup error:", enrollError);
        return json({ error: "Failed to verify enrollment" }, 500);
      }

      if (enrollment) {
        // الاشتراك الموقوف: ممنوع الدروس اللي اتنشرت بعد وقت الإيقاف
        const lessonCreatedAt = (lesson as any).created_at;

        const publishedAfterSuspension =
          enrollment.status === "suspended" &&
          enrollment.suspended_at &&
          lessonCreatedAt &&
          new Date(lessonCreatedAt).getTime() >
            new Date(enrollment.suspended_at).getTime();

        if (publishedAfterSuspension) {
          return json({ error: "Forbidden" }, 403);
        }

        canWatch = true;
      }
    }

    if (!canWatch) return json({ error: "Forbidden" }, 403);

    // TODO: تحقق أن القسم غير مقفل حسب section.unlock_month
    // ونظام التقسيط (الأقساط المعتمدة) بنفس منطق الواجهة.
    // ابعتلي جدول الأقساط/الدفع وأكمّله.

    // =========================
    // 5) العلامة المائية (الاسم + رقم التليفون)
    // =========================
    const name = String(profile?.full_name ?? "").trim();

    const phone = String(
      profile?.phone ||
        user.phone ||
        (user.user_metadata as any)?.phone ||
        "",
    ).trim();

    // الاسم - الرقم (ولو واحد منهم ناقص يعرض الموجود بس)
    const watermarkText =
      [name, phone].filter(Boolean).join(" - ") || user.email || user.id;

    const annotate = JSON.stringify([
      // متحرك
      {
        type: "rtext",
        text: watermarkText,
        alpha: "0.60",
        color: "0x3B82F6",
        size: "14",
        interval: "5000",
      },
      // ثابت خفيف في ركن الشاشة
      {
        type: "text",
        text: watermarkText,
        alpha: "0.25",
        x: "10",
        y: "10",
        color: "0xFFFFFF",
        size: "11",
      },
    ]);

    // =========================
    // 6) طلب OTP
    // =========================
    const vdoRes = await fetch(
      `https://dev.vdocipher.com/api/videos/${encodeURIComponent(videoId)}/otp`,
      {
        method: "POST",
        headers: {
          Authorization: `Apisecret ${apiSecret}`,
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify({
          ttl: 300,
          annotate,
          // تنبيه: forceHighestSecurity بيمنع التشغيل على أغلب متصفحات
          // الكمبيوتر. فعّله فقط لو عايز الطلاب يشاهدوا من الموبايل/Safari بس.
          // forceHighestSecurity: true,

          // يقفل التشغيل على موقعك فقط (ضع دومينك)
          // whitelisthref: "your-domain.com",
        }),
      },
    );

    const text = await vdoRes.text();

    if (!vdoRes.ok) {
      console.error("VdoCipher OTP error:", vdoRes.status, text);
      return json({ error: "Failed to generate OTP" }, 502);
    }

    let result: any;
    try {
      result = JSON.parse(text);
    } catch {
      console.error("Invalid JSON from VdoCipher:", text);
      return json({ error: "VdoCipher returned invalid JSON" }, 502);
    }

    return json({ otp: result.otp, playbackInfo: result.playbackInfo });
  } catch (err) {
    console.error("get-vdocipher-otp error:", err);

    return json(
      { error: err instanceof Error ? err.message : String(err) },
      500,
    );
  }
});