const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const libraryId = Deno.env.get("BUNNY_LIBRARY_ID");
const apiKey = Deno.env.get("BUNNY_STREAM_API_KEY");

console.log("libraryId value:", JSON.stringify(libraryId));
console.log("apiKey length:", apiKey?.length);
console.log("apiKey first 4 chars:", apiKey?.slice(0, 4));

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    console.log("Received body:", body);

    const { lessonId, title } = body;

    const libraryId = Deno.env.get("BUNNY_LIBRARY_ID");
    const apiKey = Deno.env.get("BUNNY_STREAM_API_KEY");

    console.log("libraryId exists:", Boolean(libraryId));
    console.log("apiKey exists:", Boolean(apiKey));

    if (!libraryId || !apiKey) {
      return new Response(
        JSON.stringify({ error: "Missing environment variables" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const createRes = await fetch(
      `https://video.bunnycdn.com/library/${libraryId}/videos`,
      {
        method: "POST",
        headers: { AccessKey: apiKey, "Content-Type": "application/json" },
        body: JSON.stringify({ title: title ?? lessonId ?? "untitled" }),
      }
    );

    console.log("Bunny response status:", createRes.status);

    if (!createRes.ok) {
      const errText = await createRes.text();
      console.log("Bunny error body:", errText);
      return new Response(
        JSON.stringify({ error: `Bunny error: ${errText}` }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const result = await createRes.json();
    const videoId = result.guid;

    const expiration = Math.floor(Date.now() / 1000) + 3600;
    const signatureInput = `${libraryId}${apiKey}${expiration}${videoId}`;
    const signature = await sha256Hex(signatureInput);

    return new Response(
      JSON.stringify({
        videoId,
        libraryId,
        expiration,
        signature,
        tusEndpoint: "https://video.bunnycdn.com/tusupload",
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("Caught error:", err);
    return new Response(
      JSON.stringify({
        error: err instanceof Error ? err.message : String(err),
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

async function sha256Hex(input: string) {
  const data = new TextEncoder().encode(input);
  const hash = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(hash))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}