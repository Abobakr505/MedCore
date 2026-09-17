// supabase/functions/delete-bunny-video/index.ts

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods":
    "POST, OPTIONS",
};

Deno.serve(async (req) => {
  // =========================================
  // CORS
  // =========================================

  if (req.method === "OPTIONS") {
    return new Response("ok", {
      status: 200,
      headers: corsHeaders,
    });
  }

  if (req.method !== "POST") {
    return json(
      {
        success: false,
        error: "Method not allowed",
      },
      405
    );
  }

  try {
    // =========================================
    // Request
    // =========================================

    const body = await req.json();

    const videoId = body?.videoId;

    console.log("====================================");
    console.log("DELETE BUNNY VIDEO");
    console.log("Video ID:", videoId);
    console.log("====================================");

    if (!videoId || typeof videoId !== "string") {
      return json(
        {
          success: false,
          error: "videoId is required",
        },
        400
      );
    }

    // =========================================
    // Environment
    // =========================================

    const libraryId =
      Deno.env.get("BUNNY_LIBRARY_ID");

    const apiKey =
      Deno.env.get("BUNNY_STREAM_API_KEY");

    console.log(
      "Library ID exists:",
      Boolean(libraryId)
    );

    console.log(
      "API key exists:",
      Boolean(apiKey)
    );

    if (!libraryId) {
      return json(
        {
          success: false,
          error:
            "Missing BUNNY_LIBRARY_ID",
        },
        500
      );
    }

    if (!apiKey) {
      return json(
        {
          success: false,
          error:
            "Missing BUNNY_STREAM_API_KEY",
        },
        500
      );
    }

    // =========================================
    // Bunny API URL
    // =========================================

    const bunnyUrl =
      `https://video.bunnycdn.com/library/` +
      `${libraryId}/videos/${videoId}`;

    console.log(
      "Bunny DELETE URL:",
      bunnyUrl
    );

    // =========================================
    // DELETE from Bunny
    // =========================================

    const bunnyResponse = await fetch(
      bunnyUrl,
      {
        method: "DELETE",

        headers: {
          AccessKey: apiKey,
          Accept: "application/json",
        },
      }
    );

    console.log(
      "Bunny DELETE status:",
      bunnyResponse.status
    );

    const responseText =
      await bunnyResponse.text();

    console.log(
      "Bunny DELETE response:",
      responseText
    );

    // =========================================
    // Bunny deletion failed
    // =========================================

    if (!bunnyResponse.ok) {
      return json(
        {
          success: false,

          error:
            "Bunny refused to delete the video.",

          bunnyStatus:
            bunnyResponse.status,

          bunnyResponse:
            responseText,

          videoId,

          libraryId,
        },
        500
      );
    }

    // =========================================
    // Bunny deletion succeeded
    // =========================================

    console.log(
      "✅ Video deleted from Bunny successfully"
    );

    console.log(
      "Video ID:",
      videoId
    );

    // =========================================
    // Return success
    // =========================================

    return json({
      success: true,

      bunnyDeleted: true,

      videoId,

      bunnyStatus:
        bunnyResponse.status,

      message:
        "Video successfully deleted from Bunny Stream.",
    });
  } catch (error) {
    console.error(
      "===================================="
    );

    console.error(
      "DELETE BUNNY VIDEO ERROR"
    );

    console.error(error);

    console.error(
      "===================================="
    );

    return json(
      {
        success: false,

        error:
          error instanceof Error
            ? error.message
            : String(error),
      },
      500
    );
  }
});

// =========================================
// JSON helper
// =========================================

function json(
  data: unknown,
  status = 200
): Response {
  return new Response(
    JSON.stringify(data),
    {
      status,
      headers: {
        ...corsHeaders,
        "Content-Type":
          "application/json",
      },
    }
  );
}