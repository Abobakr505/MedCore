import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
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

  const authHeader = req.headers.get("Authorization") ?? "";
  const token = authHeader.replace(/^Bearer\s+/i, "").trim();
  if (!token) return json({ error: "جلسة الدخول غير صالحة" }, 401);

  let payload: {
    password?: string;
    deviceIdentifier?: string;
    deviceName?: string;
  };
  try {
    payload = await req.json();
  } catch {
    return json({ error: "طلب غير صالح" }, 400);
  }

  const password = payload.password;
  const deviceIdentifier =
    typeof payload.deviceIdentifier === "string"
      ? payload.deviceIdentifier.trim()
      : "";
  const deviceName =
    typeof payload.deviceName === "string" ? payload.deviceName.trim() || null : null;

  if (
    typeof password !== "string" ||
    !password ||
    !deviceIdentifier ||
    deviceIdentifier.length > 200
  ) {
    return json({ error: "كلمة المرور ومعرّف الجهاز مطلوبان" }, 400);
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!supabaseUrl || !serviceRoleKey) {
    console.error("DEVICE RECOVERY: Missing Supabase environment variables");
    return json({ error: "الخدمة غير متاحة حاليًا" }, 500);
  }

  const admin = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const passwordVerifier = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const {
    data: { user },
    error: authError,
  } = await admin.auth.getUser(token);

  if (authError || !user?.email) {
    return json({ error: "جلسة الدخول غير صالحة. سجّل الدخول مرة أخرى." }, 401);
  }

  const email = user.email.trim().toLowerCase();
  const ip = getClientIp(req);
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
    console.error("DEVICE RECOVERY RATE LIMIT CHECK ERROR:", rateError);
    return json({ error: "تعذر التحقق من المحاولات. حاول لاحقًا." }, 503);
  }

  const rateResult = Array.isArray(rateData) ? rateData[0] : rateData;
  if (!rateResult) {
    console.error("DEVICE RECOVERY RATE LIMIT RETURNED NO RESULT");
    return json({ error: "تعذر التحقق من المحاولات. حاول لاحقًا." }, 503);
  }

  if (!rateResult.allowed) {
    const minutes = Math.ceil((rateResult.retry_after_seconds || 0) / 60);
    return json({
      success: false,
      reason: "rate_limited",
      message: `محاولات كثيرة. حاول بعد ${minutes} دقيقة.`,
    });
  }

  const { data: verified, error: passwordError } =
    await passwordVerifier.auth.signInWithPassword({ email, password });

  const { error: recordError } = await admin.rpc("record_login_attempt", {
    p_ip_address: ip,
    p_email: email,
    p_success: !passwordError && verified.user?.id === user.id,
  });

  if (recordError) {
    console.error("DEVICE RECOVERY ATTEMPT RECORD ERROR:", recordError);
    return json({ error: "تعذر تسجيل محاولة التأكيد. حاول لاحقًا." }, 500);
  }

  if (passwordError || verified.user?.id !== user.id) {
    return json({ success: false, reason: "invalid_password" });
  }

  const { data: recoveryResult, error: recoveryError } = await admin.rpc(
    "recover_user_device",
    {
      p_user_id: user.id,
      p_device_identifier: deviceIdentifier,
      p_device_name: deviceName,
    }
  );

  if (recoveryError) {
    console.error("DEVICE RECOVERY DATABASE ERROR:", recoveryError);
    return json({ error: "تعذر نقل ربط الجهاز. حاول مرة أخرى." }, 500);
  }

  return json(recoveryResult);
});
