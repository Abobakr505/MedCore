const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

Deno.serve(async (req) => {
  // مهم جدًا: التعامل مع CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", {
      status: 200,
      headers: corsHeaders,
    });
  }

  if (req.method !== "POST") {
    return new Response(
      JSON.stringify({
        error: "Method not allowed",
      }),
      {
        status: 405,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
      }
    );
  }

  try {
    const body = await req.json();

    console.log("Delete Bunny request:", body);

    const { videoId } = body;

    if (!videoId) {
      return new Response(
        JSON.stringify({
          error: "videoId is required",
        }),
        {
          status: 400,
          headers: {
            ...corsHeaders,
            "Content-Type": "application/json",
          },
        }
      );
    }

    const libraryId = Deno.env.get("BUNNY_LIBRARY_ID");
    const apiKey = Deno.env.get("BUNNY_STREAM_API_KEY");

    console.log("Bunny library exists:", Boolean(libraryId));
    console.log("Bunny API key exists:", Boolean(apiKey));

    if (!libraryId || !apiKey) {
      return new Response(
        JSON.stringify({
          error: "Missing Bunny environment variables",
        }),
        {
          status: 500,
          headers: {
            ...corsHeaders,
            "Content-Type": "application/json",
          },
        }
      );
    }

    const bunnyUrl =
      `https://video.bunnycdn.com/library/${libraryId}/videos/${videoId}`;

    console.log("Deleting Bunny video:", bunnyUrl);

    const bunnyResponse = await fetch(bunnyUrl, {
      method: "DELETE",
      headers: {
        AccessKey: apiKey,
      },
    });

    console.log(
      "Bunny delete status:",
      bunnyResponse.status
    );

    if (!bunnyResponse.ok) {
      const errorText = await bunnyResponse.text();

      console.error(
        "Bunny delete error:",
        errorText
      );

      return new Response(
        JSON.stringify({
          error: errorText || "Failed to delete Bunny video",
          status: bunnyResponse.status,
        }),
        {
          status: 500,
          headers: {
            ...corsHeaders,
            "Content-Type": "application/json",
          },
        }
      );
    }

    return new Response(
      JSON.stringify({
        success: true,
        videoId,
      }),
      {
        status: 200,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
      }
    );
  } catch (error) {
    console.error(
      "Delete Bunny video error:",
      error
    );

    return new Response(
      JSON.stringify({
        error:
          error instanceof Error
            ? error.message
            : String(error),
      }),
      {
        status: 500,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
      }
    );
  }
});