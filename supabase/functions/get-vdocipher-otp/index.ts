// supabase/functions/get-vdocipher-otp/index.ts
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*", // الأفضل تحديد دومينك
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // 1) التحقق من المستخدم
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      {
        global: {
          headers: { Authorization: req.headers.get("Authorization") ?? "" },
        },
      }
    );

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) return json({ error: "Unauthorized" }, 401);

    const { videoId } = await req.json();
    if (!videoId) return json({ error: "videoId is required" }, 400);

    // 2) TODO: تحقق أن الطالب مشترك في الكورس وأن القسم غير مقفل
    // (استعلم عن lessons / payments بنفس منطق الواجهة، لكن من السيرفر)

    const apiSecret = Deno.env.get("VDOCIPHER_API_SECRET");
    if (!apiSecret) return json({ error: "Missing VDOCIPHER_API_SECRET" }, 500);

    // 3) علامة مائية ديناميكية
    const annotate = JSON.stringify([
      {
        type: "rtext",
        text: user.email ?? user.id,
        alpha: "0.60",
        color: "0xFFFFFF",
        size: "14",
        interval: "5000",
      },
    ]);

    const vdoRes = await fetch(
      `https://dev.vdocipher.com/api/videos/${videoId}/otp`,
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
          // يمنع التشغيل على الأجهزة التي لا تضمن حظر التسجيل
          // (راجع الوثائق، وسيمنع أغلب متصفحات الكمبيوتر)
          forceHighestSecurity: true,
          // يقفل التشغيل على موقعك فقط (ضع دومينك)
          // whitelisthref: "your-domain.com",
        }),
      }
    );

    const text = await vdoRes.text();
    if (!vdoRes.ok) {
      console.error("VdoCipher OTP error:", vdoRes.status, text);
      return json({ error: "Failed to generate OTP" }, 502);
    }

    const result = JSON.parse(text);
    return json({ otp: result.otp, playbackInfo: result.playbackInfo });
  } catch (err) {
    console.error("Caught error:", err);
    return json({ error: err instanceof Error ? err.message : String(err) }, 500);
  }
});

function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
} 