// services/videoPlayback.ts
import { supabase } from "@/lib/supabase";

/**
 * يجيب رابط مشاهدة HLS آمن ومؤقت من Bunny Stream
 * عبر Edge Function (التوكن بيتولّد سيرفر-سايد فقط)
 */
export async function getLessonPlaybackUrl(
  videoId: string
): Promise<string> {
  const { data, error } = await supabase.functions.invoke(
    "get-bunny-playback-url",
    { body: { videoId } }
  );

  if (error || !data?.url) {
    throw new Error("تعذّر تحميل رابط الفيديو");
  }

  return data.url as string;
}