
// supabase/functions/create-vdocipher-video/index.ts

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods":
    "POST, OPTIONS",
};

Deno.serve(async (req) => {
  // CORS
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 204,
      headers: corsHeaders,
    });
  }

  // Only POST
  if (req.method !== "POST") {
    return json(
      {
        error: "Method not allowed",
      },
      405
    );
  }

  try {
    // =========================
    // Request body
    // =========================

    const body = await req.json();

    const lessonId = body?.lessonId;
    const title = body?.title;

    if (!lessonId) {
      return json(
        {
          error: "lessonId is required",
        },
        400
      );
    }

    // =========================
    // API Secret
    // =========================

    const apiSecret = Deno.env.get(
      "VDOCIPHER_API_SECRET"
    );

    if (!apiSecret) {
      console.error(
        "VDOCIPHER_API_SECRET is missing"
      );

      return json(
        {
          error:
            "Missing VDOCIPHER_API_SECRET",
        },
        500
      );
    }

    // =========================
    // Video title
    // =========================

    const videoTitle = String(
      title || lessonId || "untitled"
    );

    const encodedTitle =
      encodeURIComponent(videoTitle);

    // =========================
    // VdoCipher API URL
    // =========================

    const vdoUrl =
      "https://www.vdocipher.com/api/videos?title=" +
      encodedTitle;

    console.log(
      "================================="
    );

    console.log(
      "Creating VdoCipher video"
    );

    console.log(
      "lessonId:",
      lessonId
    );

    console.log(
      "title:",
      videoTitle
    );

    console.log(
      "VdoCipher URL:",
      vdoUrl
    );

    console.log(
      "================================="
    );

    // =========================
    // Create video
    // =========================

    const vdoRes = await fetch(
      vdoUrl,
      {
        method: "PUT",

        headers: {
          Authorization:
            "Apisecret " + apiSecret,

          Accept:
            "application/json",
        },
      }
    );

    // =========================
    // Read response
    // =========================

    const rawResponse =
      await vdoRes.text();

    console.log(
      "VdoCipher status:",
      vdoRes.status
    );

    // =========================
    // Handle VdoCipher error
    // =========================

    if (!vdoRes.ok) {
      console.error(
        "VdoCipher API error:",
        vdoRes.status
      );

      console.error(
        "VdoCipher response:",
        rawResponse
      );

      let details: unknown =
        rawResponse;

      try {
        details =
          JSON.parse(rawResponse);
      } catch {
        // Keep raw response
      }

      return json(
        {
          error:
            "VdoCipher API error",

          status:
            vdoRes.status,

          details,
        },
        vdoRes.status
      );
    }

    // =========================
    // Parse JSON
    // =========================

    let result: any;

    try {
      result =
        JSON.parse(rawResponse);
    } catch {
      console.error(
        "Invalid JSON returned by VdoCipher"
      );

      return json(
        {
          error:
            "VdoCipher returned invalid JSON",
        },
        500
      );
    }

    console.log(
      "VdoCipher parsed response:"
    );

    console.log(
      JSON.stringify(
        result,
        null,
        2
      )
    );

    // =========================
    // Validate videoId
    // =========================

    if (!result?.videoId) {
      return json(
        {
          error:
            "VdoCipher did not return videoId",

          response:
            result,
        },
        500
      );
    }

    // =========================
    // Validate clientPayload
    // =========================

    const clientPayload =
      result?.clientPayload;

    if (!clientPayload) {
      return json(
        {
          error:
            "VdoCipher did not return clientPayload",

          videoId:
            result.videoId,
        },
        500
      );
    }

    // =========================
    // Upload link
    // =========================

    const uploadLink =
      clientPayload.uploadLink;

    if (!uploadLink) {
      return json(
        {
          error:
            "VdoCipher did not return uploadLink",

          videoId:
            result.videoId,

          clientPayload:
            clientPayload,
        },
        500
      );
    }

    // =========================
    // Upload parameters
    // =========================

    const uploadParameters: Record<
      string,
      string
    > = {
      key:
        clientPayload.key,

      policy:
        clientPayload.policy,

      "x-amz-signature":
        clientPayload[
          "x-amz-signature"
        ],

      "x-amz-algorithm":
        clientPayload[
          "x-amz-algorithm"
        ],

      "x-amz-date":
        clientPayload[
          "x-amz-date"
        ],

      "x-amz-credential":
        clientPayload[
          "x-amz-credential"
        ],
    };

    // =========================
    // Check required parameters
    // =========================

    const requiredParameters = [
      "key",
      "policy",
      "x-amz-signature",
      "x-amz-algorithm",
      "x-amz-date",
      "x-amz-credential",
    ];

    const missingParameters =
      requiredParameters.filter(
        (name) =>
          !uploadParameters[name]
      );

    if (
      missingParameters.length > 0
    ) {
      console.error(
        "Missing upload parameters:",
        missingParameters
      );

      return json(
        {
          error:
            "VdoCipher upload parameters are incomplete",

          videoId:
            result.videoId,

          missingParameters,
        },
        500
      );
    }

    // =========================
    // Return upload data
    // =========================

    console.log(
      "VdoCipher video created successfully"
    );

    console.log(
      "videoId:",
      result.videoId
    );

    console.log(
      "uploadLink:",
      uploadLink
    );

    return json({
      success: true,

      videoId:
        result.videoId,

      uploadUrl:
        uploadLink,

      uploadParameters:
        uploadParameters,
    });
  } catch (error) {
    console.error(
      "================================="
    );

    console.error(
      "create-vdocipher-video error:"
    );

    console.error(error);

    console.error(
      "================================="
    );

    return json(
      {
        error:
          error instanceof Error
            ? error.message
            : String(error),
      },
      500
    );
  }
});

// =========================
// JSON helper
// =========================

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
