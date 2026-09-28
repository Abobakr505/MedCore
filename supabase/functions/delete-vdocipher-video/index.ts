const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

// عدد الفيديوهات في الطلب الواحد لـ VdoCipher
const BATCH_SIZE = 50;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 204,
      headers: corsHeaders,
    });
  }

  if (req.method !== "POST") {
    return json(
      { success: false, error: "Method not allowed" },
      405
    );
  }

  try {
    const body = await req.json();

    // يدعم videoId واحد أو videoIds كمصفوفة
    const rawIds: unknown[] = Array.isArray(body?.videoIds)
      ? body.videoIds
      : body?.videoId
      ? [body.videoId]
      : [];

    const videoIds = Array.from(
      new Set(
        rawIds
          .filter(
            (id): id is string =>
              typeof id === "string" && id.trim().length > 0
          )
          .map((id) => id.trim())
      )
    );

    if (videoIds.length === 0) {
      return json(
        {
          success: false,
          error: "videoId or videoIds is required",
        },
        400
      );
    }

    const apiSecret = Deno.env.get("VDOCIPHER_API_SECRET");

    if (!apiSecret) {
      console.error("VDOCIPHER_API_SECRET is missing");

      return json(
        {
          success: false,
          error: "Missing VDOCIPHER_API_SECRET",
        },
        500
      );
    }

    const deleted: string[] = [];
    const failed: {
      videoIds: string[];
      vdoStatus: number;
      vdoResponse: string | null;
    }[] = [];

    for (let i = 0; i < videoIds.length; i += BATCH_SIZE) {
      const batch = videoIds.slice(i, i + BATCH_SIZE);

      /*
       * VdoCipher Delete API
       * DELETE /api/videos?videos=ID1,ID2,ID3
       */
      const deleteUrl =
        "https://dev.vdocipher.com/api/videos?videos=" +
        encodeURIComponent(batch.join(","));

      console.log("Deleting VdoCipher videos:", batch);

      const vdoRes = await fetch(deleteUrl, {
        method: "DELETE",
        headers: {
          Authorization: "Apisecret " + apiSecret,
          Accept: "application/json",
          "Content-Type": "application/json",
        },
      });

      const responseText = await vdoRes.text();

      console.log("VdoCipher delete status:", vdoRes.status);
      console.log("VdoCipher delete response:", responseText);

      if (vdoRes.ok) {
        deleted.push(...batch);
      } else {
        failed.push({
          videoIds: batch,
          vdoStatus: vdoRes.status,
          vdoResponse: responseText || null,
        });
      }
    }

    if (failed.length > 0) {
      return json(
        {
          success: false,
          error: "VdoCipher refused to delete some videos.",
          deleted,
          failed,
        },
        500
      );
    }

    return json({
      success: true,
      message: "Videos deleted from VdoCipher.",
      deletedCount: deleted.length,
      deleted,
    });
  } catch (error) {
    console.error("DELETE VDOCIPHER VIDEO ERROR:", error);

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

function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      ...corsHeaders,
      "Content-Type": "application/json",
    },
  });
}