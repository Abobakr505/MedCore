// supabase/functions/get-vdocipher-otp/index.ts
// يولّد OTP + playbackInfo مؤقتين لتشغيل فيديو محمي بـ DRM على VdoCipher.
// التوكن صالح لمرة تشغيل واحدة، ومدته قصيرة.

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { videoId } = await req.json();

    if (!videoId) {
      return json({ error: "videoId is required" }, 400);
    }

    const apiSecret = Deno.env.get("VDOCIPHER_API_SECRET");

    if (!apiSecret) {
      return json({ error: "Missing VDOCIPHER_API_SECRET" }, 500);
    }

    const vdoRes = await fetch(
      `https://dev.vdocipher.com/api/videos/${videoId}/otp`,
      {
        method: "POST",
        headers: {
          Authorization: `Apisecret ${apiSecret}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ ttl: 300 }),
      }
    );

    const text = await vdoRes.text();

    if (!vdoRes.ok) {
      console.error("VdoCipher OTP error:", vdoRes.status, text);
      return json({ error: `VdoCipher error: ${text}` }, 500);
    }

    const result = JSON.parse(text);

    // result = { otp, playbackInfo }
    return json({
      otp: result.otp,
      playbackInfo: result.playbackInfo,
    });
  } catch (err) {
    console.error("Caught error:", err);
    return json(
      { error: err instanceof Error ? err.message : String(err) },
      500
    );
  }
});

function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}