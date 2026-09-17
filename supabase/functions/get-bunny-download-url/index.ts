// supabase/functions/get-bunny-download-url/index.ts

import { encodeBase64 } from "https://deno.land/std@0.224.0/encoding/base64.ts";
import md5 from "https://esm.sh/md5@2.3.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods":
    "POST, OPTIONS",
};

Deno.serve(async (req) => {
  // =====================================
  // CORS
  // =====================================

  if (req.method === "OPTIONS") {
    return new Response("ok", {
      status: 200,
      headers: corsHeaders,
    });
  }

  // =====================================
  // POST only
  // =====================================

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
    // =====================================
    // Read request
    // =====================================

    const body = await req.json();

    const videoId = body?.videoId;

    console.log("=================================");
    console.log("GET BUNNY DOWNLOAD URL");
    console.log("Video ID:", videoId);
    console.log("=================================");

    if (!videoId || typeof videoId !== "string") {
      return json(
        {
          success: false,
          error: "videoId is required",
        },
        400
      );
    }

    // =====================================
    // Environment variables
    // =====================================

    const libraryId =
      Deno.env.get("BUNNY_LIBRARY_ID");

    const apiKey =
      Deno.env.get("BUNNY_STREAM_API_KEY");

    const securityKey =
      Deno.env.get("BUNNY_TOKEN_SECURITY_KEY");

    const pullZone =
      Deno.env.get("BUNNY_PULL_ZONE_HOSTNAME");

    console.log("Environment:", {
      hasLibraryId: !!libraryId,
      hasApiKey: !!apiKey,
      hasSecurityKey: !!securityKey,
      hasPullZone: !!pullZone,
      pullZone: pullZone ?? null,
    });

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

    if (!securityKey) {
      return json(
        {
          success: false,
          error:
            "Missing BUNNY_TOKEN_SECURITY_KEY",
        },
        500
      );
    }

    if (!pullZone) {
      return json(
        {
          success: false,
          error:
            "Missing BUNNY_PULL_ZONE_HOSTNAME",
        },
        500
      );
    }

    // =====================================
    // Get video information from Bunny
    // =====================================

    const bunnyApiUrl =
      `https://video.bunnycdn.com/library/` +
      `${libraryId}/videos/${videoId}`;

    console.log(
      "Bunny API URL:",
      bunnyApiUrl
    );

    const bunnyResponse = await fetch(
      bunnyApiUrl,
      {
        method: "GET",
        headers: {
          AccessKey: apiKey,
          Accept: "application/json",
        },
      }
    );

    const bunnyText =
      await bunnyResponse.text();

    console.log(
      "Bunny status:",
      bunnyResponse.status
    );

    console.log(
      "Bunny response:",
      bunnyText
    );

    if (!bunnyResponse.ok) {
      return json(
        {
          success: false,
          error:
            "Failed to get video from Bunny",
          bunnyStatus:
            bunnyResponse.status,
          bunnyResponse: bunnyText,
        },
        502
      );
    }

    // =====================================
    // Parse Bunny response
    // =====================================

    let video: any;

    try {
      video = JSON.parse(bunnyText);
    } catch {
      return json(
        {
          success: false,
          error:
            "Invalid JSON returned by Bunny",
          bunnyResponse: bunnyText,
        },
        502
      );
    }

    console.log(
      "Bunny video:",
      JSON.stringify(video, null, 2)
    );

    // =====================================
    // Video information
    // =====================================

    const status =
      video?.status ?? null;

    const encodeProgress =
      video?.encodeProgress ?? null;

    const availableResolutions =
      video?.availableResolutions ?? null;

    console.log(
      "Video status:",
      status
    );

    console.log(
      "Encode progress:",
      encodeProgress
    );

    console.log(
      "Available resolutions:",
      availableResolutions
    );

    // =====================================
    // Parse resolutions
    // =====================================

    let resolutions: string[] = [];

    if (
      typeof availableResolutions ===
      "string"
    ) {
      resolutions =
        availableResolutions
          .split(",")
          .map(
            (value: string) =>
              value.trim()
          )
          .filter(Boolean);
    }

    if (
      Array.isArray(
        availableResolutions
      )
    ) {
      resolutions =
        availableResolutions;
    }

    console.log(
      "Parsed resolutions:",
      resolutions
    );

    // =====================================
    // Choose resolution
    // =====================================

    const priority = [
      "2160p",
      "1440p",
      "1080p",
      "720p",
      "480p",
      "360p",
    ];

    let resolution = "720p";

    for (const item of priority) {
      if (resolutions.includes(item)) {
        resolution = item;
        break;
      }
    }

    console.log(
      "Selected resolution:",
      resolution
    );

    // =====================================
    // Expiration
    // =====================================

    const expires =
      Math.floor(
        Date.now() / 1000
      ) + 15 * 60;

    // =====================================
    // Bunny token path
    // =====================================

    const path =
      `/${videoId}/play_${resolution}.mp4`;

    console.log(
      "Token path:",
      path
    );

    console.log(
      "Token expires:",
      expires
    );

    // =====================================
    // Generate MD5 token
    // =====================================

    const tokenInput =
      `${securityKey}${path}${expires}`;

    console.log(
      "Generating Bunny token..."
    );

    const token =
      generateBunnyToken(tokenInput);

    console.log(
      "Token generated successfully"
    );

    // =====================================
    // Final URL
    // =====================================

    const downloadUrl =
      `https://${pullZone}${path}` +
      `?token=${encodeURIComponent(token)}` +
      `&expires=${expires}`;

    console.log(
      "Generated URL:",
      downloadUrl
    );

    // =====================================
    // Response
    // =====================================

    return json({
      success: true,

      videoId,

      status,

      encodeProgress,

      availableResolutions,

      selectedResolution:
        resolution,

      expires,

      url: downloadUrl,
    });
  } catch (error) {
    // =====================================
    // Error
    // =====================================

    console.error(
      "================================="
    );

    console.error(
      "GET BUNNY DOWNLOAD URL ERROR"
    );

    console.error(error);

    console.error(
      error instanceof Error
        ? error.stack
        : String(error)
    );

    console.error(
      "================================="
    );

    return json(
      {
        success: false,

        error:
          error instanceof Error
            ? error.message
            : String(error),

        stack:
          error instanceof Error
            ? error.stack ?? null
            : null,
      },
      500
    );
  }
});

// =====================================
// Generate Bunny MD5 token
// =====================================

function generateBunnyToken(
  input: string
): string {
  /*
   * md5() returns a hexadecimal string.
   *
   * Bunny requires the MD5 hash encoded
   * as URL-safe Base64.
   */

  const hex = md5(input);

  const bytes =
    new Uint8Array(
      hex.match(/.{2}/g)!.map(
        (byte) =>
          parseInt(byte, 16)
      )
    );

  const base64 =
    encodeBase64(bytes);

  return base64
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

// =====================================
// JSON helper
// =====================================

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