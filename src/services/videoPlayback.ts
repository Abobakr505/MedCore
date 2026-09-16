// services/videoPlayback.ts
import { supabase } from "@/lib/supabase";
import { getChunkPath } from "@/utils/videoChunking";

export async function buildLessonVideoBlobUrl(
  lessonId: string,
  chunkCount: number,
  onProgress?: (pct: number) => void
): Promise<string> {
  const parts: Blob[] = [];

  for (let i = 0; i < chunkCount; i++) {
    const path = getChunkPath(lessonId, i);

    const { data, error } = await supabase.storage
      .from("course-videos")
      .download(path);

    if (error || !data) {
      throw new Error(`تعذّر تحميل جزء الفيديو ${i + 1}`);
    }

    parts.push(data);
    onProgress?.(Math.round(((i + 1) / chunkCount) * 100));
  }

  const fullBlob = new Blob(parts, { type: "video/mp4" });
  return URL.createObjectURL(fullBlob);
}