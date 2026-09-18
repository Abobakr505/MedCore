// Edge Function: login-with-rate-limit
// بيستقبل email + password، يتأكد إن الـ IP/الإيميل مش محظورين حاليًا،
// بعدين يعمل signInWithPassword بصلاحية service_role، ويسجل نتيجة المحاولة.
//
// Deploy:
//   supabase functions deploy login-with-rate-limit
//
// Env vars مطلوبة (بتتحط تلقائي في Supabase Edge Functions):
//   SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY

import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*", // غيّرها لدومين الموقع بتاعك في البروڤايدر لو حبيت تضيّقها
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const MAX_ATTEMPTS = 5;
const WINDOW_MINUTES = 15;

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function getClientIp(req: Request): string {
  // Supabase Edge Functions (بتشتغل على Deno Deploy) بتبعت الـ IP الحقيقي هنا
  const forwarded = req.headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0].trim();
  return req.headers.get("cf-connecting-ip") || "unknown";
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return json({ error: "Method not allowed" }, 405);
  }

  let payload: { email?: string; password?: string };
  try {
    payload = await req.json();
  } catch {
    return json({ error: "invalid_json", message: "طلب غير صالح" }, 400);
  }

  const email = (payload.email || "").trim().toLowerCase();
  const password = payload.password || "";

  if (!email || !password) {
    return json(
      { error: "missing_fields", message: "من فضلك أدخل البريد الإلكتروني وكلمة المرور" },
      400
    );
  }

  const ip = getClientIp(req);

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const admin = createClient(supabaseUrl, serviceRoleKey);

  // 1) هل الـ IP أو الإيميل محظورين دلوقتي؟
  const { data: rateData, error: rateError } = await admin.rpc(
    "check_login_rate_limit",
    {
      p_ip_address: ip,
      p_email: email,
      p_max_attempts: MAX_ATTEMPTS,
      p_window_minutes: WINDOW_MINUTES,
    }
  );

  if (rateError) {
    console.error("RATE LIMIT CHECK ERROR:", rateError);
    // لو فشل التحقق نفسه، منكسرش تجربة المستخدم - نكمل عادي لكن نسجل الخطأ
  } else {
    const result = rateData?.[0];
    if (result && !result.allowed) {
      const minutes = Math.ceil((result.retry_after_seconds || 0) / 60);
      return json(
        {
          error: "rate_limited",
          reason: result.reason,
          retry_after_seconds: result.retry_after_seconds,
          message:
            result.reason === "email_blocked"
              ? `تم حظر هذا الحساب مؤقتًا بسبب محاولات دخول فاشلة كثيرة. حاول بعد ${minutes} دقيقة.`
              : `تم حظر عنوانك مؤقتًا بسبب محاولات دخول فاشلة كثيرة. حاول بعد ${minutes} دقيقة.`,
        },
        429
      );
    }
  }

  // 2) نفّذ محاولة الدخول الفعلية
  const { data: signInData, error: signInError } =
    await admin.auth.signInWithPassword({ email, password });

  // 3) سجّل نتيجة المحاولة (نجاح/فشل) للـ IP والإيميل
  const { error: recordError } = await admin.rpc("record_login_attempt", {
    p_ip_address: ip,
    p_email: email,
    p_success: !signInError,
  });
  if (recordError) {
    console.error("RECORD ATTEMPT ERROR:", recordError);
  }

  if (signInError) {
    return json(
      {
        error: "invalid_credentials",
        message: translateAuthError(signInError.message),
      },
      401
    );
  }

  // نرجّع الـ session كاملة عشان الفرونت يعمل setSession بيها
  return json({
    session: signInData.session,
    user: signInData.user,
  });
});

function translateAuthError(message: string): string {
  const map: Record<string, string> = {
    "Invalid login credentials": "البريد الإلكتروني أو كلمة المرور غير صحيحة",
    "Email not confirmed": "يرجى تفعيل بريدك الإلكتروني أولاً من الرابط المُرسل إليك",
  };
  return map[message] || "حدث خطأ غير متوقع، يرجى المحاولة مرة أخرى";
}