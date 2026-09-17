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
    console.log("Received videoId:", videoId);

    const libraryId = Deno.env.get("BUNNY_LIBRARY_ID");

    console.log("libraryId exists:", Boolean(libraryId));

    if (!libraryId) {
      return new Response(
        JSON.stringify({ error: "Missing BUNNY_LIBRARY_ID environment variable" }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    if (!videoId) {
      return new Response(
        JSON.stringify({ error: "videoId is required" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // رابط الـ embed player الرسمي بتاع Bunny
    // مضمون شغال بدون توكنز أو إعدادات CORS إضافية
const embedUrl = `https://player.mediadelivery.net/play/${libraryId}/${videoId}`;
    console.log("Generated embed URL:", embedUrl);

    return new Response(
      JSON.stringify({ url: embedUrl }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (err) {
    console.error("Caught error:", err);
    return new Response(
      JSON.stringify({
        error: err instanceof Error ? err.message : String(err),
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});