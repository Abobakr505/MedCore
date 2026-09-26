// src/services/videoPlayback.ts

import { supabase } from "@/lib/supabase";

export interface VdoCipherPlaybackData {
  otp: string;
  playbackInfo: string;
}

/**
 * جلب OTP + playbackInfo لتشغيل فيديو VdoCipher.
 *
 * الـ OTP والـ playbackInfo يتم توليدهما
 * من السيرفر عن طريق Supabase Edge Function.
 */
export async function getLessonPlaybackData(
  videoId: string
): Promise<VdoCipherPlaybackData> {
  if (!videoId) {
    throw new Error("معرّف الفيديو غير موجود");
  }

  const { data, error } = await supabase.functions.invoke(
    "get-vdocipher-otp",
    {
      body: {
        videoId,
      },
    }
  );

  if (error) {
    console.error("VdoCipher OTP Error:", error);
    throw new Error("تعذّر تحميل بيانات تشغيل الفيديو");
  }

  if (!data?.otp || !data?.playbackInfo) {
    console.error("Invalid VdoCipher response:", data);
    throw new Error("بيانات تشغيل الفيديو غير صالحة");
  }

  return {
    otp: data.otp,
    playbackInfo: data.playbackInfo,
  };
}

/**
 * Alias للتوافق مع الملفات القديمة التي تستورد:
 *
 * getLessonPlaybackUrl
 *
 * ملاحظة:
 * هذه الدالة لا ترجع URL مباشرًا.
 * ترجع OTP + playbackInfo الخاصة بـ VdoCipher.
 */
export async function getLessonPlaybackUrl(
  videoId: string
): Promise<VdoCipherPlaybackData> {
  return getLessonPlaybackData(videoId);
}
