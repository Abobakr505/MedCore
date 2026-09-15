const VIDEO_CACHE_NAME = "medcore-video-cache-v2";

const DB_NAME = "medcore-offline-db";
const DB_VERSION = 1;
const STORE_NAME = "videos";

export interface OfflineVideoMeta {
  lessonId: string;
  url: string;
  cachedAt: number;
  size: number;
}

function getOfflineVideoUrl(lessonId: string) {
  return `/__medcore_video__/${encodeURIComponent(lessonId)}`;
}

/* -------------------------------------------------------------------------- */
/* IndexedDB                                                                  */
/* -------------------------------------------------------------------------- */

function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = () => {
      const db = request.result;

      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, {
          keyPath: "lessonId",
        });
      }
    };

    request.onsuccess = () => {
      resolve(request.result);
    };

    request.onerror = () => {
      reject(request.error);
    };
  });
}

async function saveMetadata(
  metadata: OfflineVideoMeta
): Promise<void> {
  const db = await openDatabase();

  await new Promise<void>((resolve, reject) => {
    const transaction = db.transaction(
      STORE_NAME,
      "readwrite"
    );

    transaction.objectStore(STORE_NAME).put(metadata);

    transaction.oncomplete = () => resolve();

    transaction.onerror = () => {
      reject(transaction.error);
    };
  });

  db.close();
}

async function getMetadata(
  lessonId: string
): Promise<OfflineVideoMeta | null> {
  const db = await openDatabase();

  const result = await new Promise<OfflineVideoMeta | null>(
    (resolve, reject) => {
      const transaction = db.transaction(
        STORE_NAME,
        "readonly"
      );

      const request = transaction
        .objectStore(STORE_NAME)
        .get(lessonId);

      request.onsuccess = () => {
        resolve(request.result ?? null);
      };

      request.onerror = () => {
        reject(request.error);
      };
    }
  );

  db.close();

  return result;
}

async function deleteMetadata(
  lessonId: string
): Promise<void> {
  const db = await openDatabase();

  await new Promise<void>((resolve, reject) => {
    const transaction = db.transaction(
      STORE_NAME,
      "readwrite"
    );

    transaction
      .objectStore(STORE_NAME)
      .delete(lessonId);

    transaction.oncomplete = () => resolve();

    transaction.onerror = () => {
      reject(transaction.error);
    };
  });

  db.close();
}

/* -------------------------------------------------------------------------- */
/* Cache                                                                      */
/* -------------------------------------------------------------------------- */

export async function isLessonAvailableOffline(
  lessonId: string
): Promise<boolean> {
  if (!("caches" in window)) {
    return false;
  }

  try {
    const cachedMeta = await getMetadata(lessonId);

    if (!cachedMeta) {
      return false;
    }

    const cache = await caches.open(
      VIDEO_CACHE_NAME
    );

    const requestUrl = getOfflineVideoUrl(lessonId);

    const response = await cache.match(requestUrl);

    if (!response) {
      await deleteMetadata(lessonId);
      return false;
    }

    return true;
  } catch {
    return false;
  }
}

export async function getOfflineVideoSource(
  lessonId: string
): Promise<string | null> {
  const available =
    await isLessonAvailableOffline(lessonId);

  if (!available) {
    return null;
  }

  return getOfflineVideoUrl(lessonId);
}

/* -------------------------------------------------------------------------- */
/* Download / Cache                                                           */
/* -------------------------------------------------------------------------- */

export async function downloadLessonForOffline(
  lessonId: string,
  signedUrl: string,
  onProgress?: (progress: number) => void
): Promise<void> {
  if (!("caches" in window)) {
    throw new Error(
      "المتصفح لا يدعم التخزين المحلي"
    );
  }

  if (!("serviceWorker" in navigator)) {
    throw new Error(
      "المتصفح لا يدعم Service Worker"
    );
  }

  /*
   * Download the signed URL.
   *
   * The signed URL is never used as the permanent
   * video URL. We cache it under our own stable URL.
   */
  const response = await fetch(signedUrl, {
    method: "GET",
  });

  if (!response.ok) {
    throw new Error(
      `تعذر تحميل الفيديو (${response.status})`
    );
  }

  const contentType =
    response.headers.get("content-type") ||
    "video/mp4";

  const contentLength =
    response.headers.get("content-length");

  let blob: Blob;

  /*
   * Stream download when Content-Length exists.
   * This allows us to display progress.
   */
  if (response.body && contentLength) {
    const total = Number(contentLength);

    if (Number.isFinite(total) && total > 0) {
      const reader =
        response.body.getReader();

      const chunks: BlobPart[] = [];

      let received = 0;

      while (true) {
        const { done, value } =
          await reader.read();

        if (done) {
          break;
        }

        if (value) {
          const chunk = new Uint8Array(value);
          chunks.push(chunk);

          received += chunk.byteLength;

          const progress = Math.min(
            100,
            Math.round(
              (received / total) * 100
            )
          );

          onProgress?.(progress);
        }
      }

      blob = new Blob(chunks, {
        type: contentType,
      });
    } else {
      blob = await response.blob();

      onProgress?.(100);
    }
  } else {
    blob = await response.blob();

    onProgress?.(100);
  }

  /*
   * Stable local URL.
   */
  const localUrl =
    getOfflineVideoUrl(lessonId);

  const cachedResponse = new Response(blob, {
    status: 200,
    headers: {
      "Content-Type": contentType,
      "Content-Length": String(blob.size),
      "Accept-Ranges": "bytes",
    },
  });

  const cache = await caches.open(
    VIDEO_CACHE_NAME
  );

  /*
   * Save under the lesson ID, NOT the signed URL.
   *
   * Therefore the signed URL can expire later
   * and the Offline copy still works.
   */
  await cache.put(
    localUrl,
    cachedResponse
  );

  await saveMetadata({
    lessonId,
    url: localUrl,
    cachedAt: Date.now(),
    size: blob.size,
  });

  onProgress?.(100);
}

/* -------------------------------------------------------------------------- */
/* Delete                                                                     */
/* -------------------------------------------------------------------------- */

export async function removeLessonOffline(
  lessonId: string
): Promise<void> {
  if ("caches" in window) {
    const cache = await caches.open(
      VIDEO_CACHE_NAME
    );

    await cache.delete(
      getOfflineVideoUrl(lessonId)
    );
  }

  await deleteMetadata(lessonId);
}

/* -------------------------------------------------------------------------- */
/* Storage information                                                        */
/* -------------------------------------------------------------------------- */

export async function getOfflineVideoMeta(
  lessonId: string
): Promise<OfflineVideoMeta | null> {
  return getMetadata(lessonId);
}

export async function getOfflineStorageEstimate() {
  if (!navigator.storage?.estimate) {
    return null;
  }

  return navigator.storage.estimate();
}

/* -------------------------------------------------------------------------- */
/* Clear all                                                                  */
/* -------------------------------------------------------------------------- */

export async function clearAllOfflineVideos() {
  if ("caches" in window) {
    await caches.delete(
      VIDEO_CACHE_NAME
    );
  }

  const db = await openDatabase();

  await new Promise<void>((resolve, reject) => {
    const transaction = db.transaction(
      STORE_NAME,
      "readwrite"
    );

    transaction.objectStore(STORE_NAME).clear();

    transaction.oncomplete = () => resolve();

    transaction.onerror = () => {
      reject(transaction.error);
    };
  });

  db.close();

  if ("serviceWorker" in navigator) {
    navigator.serviceWorker.controller?.postMessage({
      type: "CLEAR_MEDCORE_VIDEO_CACHE",
    });
  }
}
