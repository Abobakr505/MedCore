const VIDEO_CACHE_NAME = "medcore-video-cache-v2";
const VIDEO_PREFIX = "/__medcore_video__/";

/*
 * MedCore Service Worker
 *
 * مسؤول عن اعتراض روابط الفيديو المحلية:
 *
 * /__medcore_video__/LESSON_ID
 *
 * وإرجاع الفيديو من Cache Storage.
 */

self.addEventListener("install", () => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener("fetch", (event) => {
  const request = event.request;

  if (request.method !== "GET") {
    return;
  }

  const url = new URL(request.url);

  if (!url.pathname.startsWith(VIDEO_PREFIX)) {
    return;
  }

  event.respondWith(handleVideoRequest(request));
});

async function handleVideoRequest(request) {
  const cache = await caches.open(VIDEO_CACHE_NAME);

  /*
   * First try the exact request.
   */
  let cached = await cache.match(request);

  /*
   * Also try without query parameters.
   */
  if (!cached) {
    const cleanUrl = new URL(request.url);
    cleanUrl.search = "";

    cached = await cache.match(cleanUrl.toString());
  }

  if (!cached) {
    return new Response(
      JSON.stringify({
        error: "VIDEO_NOT_AVAILABLE_OFFLINE",
      }),
      {
        status: 404,
        headers: {
          "Content-Type": "application/json",
        },
      }
    );
  }

  /*
   * For a normal request, return the cached video.
   */
  if (!request.headers.get("range")) {
    return cached;
  }

  /*
   * Handle HTTP Range requests so seeking inside the
   * offline video works more reliably.
   */
  try {
    return await createRangeResponse(cached, request);
  } catch {
    return cached;
  }
}

async function createRangeResponse(cachedResponse, request) {
  const range = request.headers.get("range");

  if (!range) {
    return cachedResponse;
  }

  const buffer = await cachedResponse.arrayBuffer();
  const total = buffer.byteLength;

  const match = range.match(/bytes=(\d+)-(\d*)/);

  if (!match) {
    return cachedResponse;
  }

  const start = Number(match[1]);

  let end = match[2] ? Number(match[2]) : total - 1;

  if (Number.isNaN(start) || start >= total) {
    return new Response(null, {
      status: 416,
      headers: {
        "Content-Range": `bytes */${total}`,
      },
    });
  }

  end = Math.min(end, total - 1);

  const chunk = buffer.slice(start, end + 1);

  return new Response(chunk, {
    status: 206,
    statusText: "Partial Content",
    headers: {
      "Content-Type":
        cachedResponse.headers.get("Content-Type") ||
        "video/mp4",

      "Content-Length": String(chunk.byteLength),

      "Content-Range":
        `bytes ${start}-${end}/${total}`,

      "Accept-Ranges": "bytes",

      "Cache-Control": "public, max-age=31536000",
    },
  });
}

/*
 * Allow the application to clear the entire video cache.
 */

self.addEventListener("message", (event) => {
  if (event.data?.type === "CLEAR_MEDCORE_VIDEO_CACHE") {
    event.waitUntil(
      caches.delete(VIDEO_CACHE_NAME)
    );
  }
});
