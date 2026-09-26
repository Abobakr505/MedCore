const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods":
    "POST, OPTIONS",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 204,
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
    const body = await req.json();

    const videoId = body?.videoId;

    if (
      !videoId ||
      typeof videoId !== "string"
    ) {
      return json(
        {
          success: false,
          error: "videoId is required",
        },
        400
      );
    }

    const apiSecret =
      Deno.env.get("VDOCIPHER_API_SECRET");

    if (!apiSecret) {
      console.error(
        "VDOCIPHER_API_SECRET is missing"
      );

      return json(
        {
          success: false,
          error:
            "Missing VDOCIPHER_API_SECRET",
        },
        500
      );
    }

    /*
     * VdoCipher Delete API
     *
     * الصحيح:
     * DELETE /api/videos?videos=VIDEO_ID
     */
    const deleteUrl =
      "https://dev.vdocipher.com/api/videos?videos=" +
      encodeURIComponent(videoId);

    console.log(
      "Deleting VdoCipher video:",
      videoId
    );

    const vdoRes = await fetch(
      deleteUrl,
      {
        method: "DELETE",

        headers: {
          "Authorization":
            "Apisecret " + apiSecret,
          "Accept":
            "application/json",
          "Content-Type":
            "application/json",
        },
      }
    );

    const responseText =
      await vdoRes.text();

    console.log(
      "VdoCipher delete status:",
      vdoRes.status
    );

    console.log(
      "VdoCipher delete response:",
      responseText
    );

    if (!vdoRes.ok) {
      return json(
        {
          success: false,
          error:
            "VdoCipher refused to delete the video.",
          vdoStatus:
            vdoRes.status,
          vdoResponse:
            responseText || null,
          videoId,
        },
        500
      );
    }

    return json({
      success: true,
      videoId,
      message:
        "Video deleted from VdoCipher.",
      vdoStatus:
        vdoRes.status,
      vdoResponse:
        responseText || null,
    });
  } catch (error) {
    console.error(
      "DELETE VDOCIPHER VIDEO ERROR:",
      error
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
