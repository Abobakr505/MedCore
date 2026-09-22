import { useEffect, useRef, useCallback, useState } from "react";

interface Options {
  onSuspiciousActivity: (reason: string) => void;
  onCoverChange?: (covered: boolean) => void;
  /** عدد مرات فقدان التركيز خلال نافذة زمنية قبل اعتباره مشبوهًا (مؤشر ثانوي فقط) */
  focusLossThreshold?: number;
  focusLossWindowMs?: number;
}

/**
 * كشف إشارات (وليس إثباتات) لتسجيل/مشاركة الشاشة، مع تغطية فورية للفيديو.
 *
 * ⚠️ حدود حقيقية غير قابلة للتجاوز (اقرأها قبل الاعتماد على هذا الهوك):
 * - لا يمكن كشف QuickTime / أدوات نظام التشغيل / كاميرا خارجية تصوّر الشاشة.
 * - لا يمكن كشف أو منع لقطة شاشة (PrintScreen / iOS / Android) في أغلب المتصفحات إطلاقًا،
 *   لأن نظام التشغيل ياخد اللقطة قبل ما الصفحة تاخد أي فرصة للتصرف.
 * - كل ما هنا "مؤشرات احتمالية" يمكن أن تعطي false positive (مستخدم بدّل تبويب فقط)
 *   أو false negative (تسجيل عبر أداة نظام لا يترك أي أثر في المتصفح).
 * - الحل الوحيد الحقيقي لمنع السكرين شوت هو DRM هاردوير (Widevine L1 / FairPlay)،
 *   وحتى هو غير مضمون على كل الأجهزة (لا يعمل على Widevine L3).
 * - هذا الهوك مكمّل للعلامة المائية، وليس بديلاً عنها.
 */
export function useScreenRecordingGuard({
  onSuspiciousActivity,
  onCoverChange,
  focusLossThreshold = 4,
  focusLossWindowMs = 30_000,
}: Options) {
  const [isCovered, setIsCovered] = useState(false);
  const focusLossTimestamps = useRef<number[]>([]);

  const setCovered = useCallback(
    (covered: boolean) => {
      setIsCovered(covered);
      onCoverChange?.(covered);
    },
    [onCoverChange]
  );

  const reportFocusLoss = useCallback(() => {
    const now = Date.now();
    focusLossTimestamps.current.push(now);
    focusLossTimestamps.current = focusLossTimestamps.current.filter(
      (t) => now - t < focusLossWindowMs
    );

    if (focusLossTimestamps.current.length >= focusLossThreshold) {
      onSuspiciousActivity("repeated_focus_loss");
      focusLossTimestamps.current = [];
    }
  }, [onSuspiciousActivity, focusLossThreshold, focusLossWindowMs]);

  useEffect(() => {
    // 1) getDisplayMedia (تسجيل/مشاركة شاشة عبر المتصفح نفسه) — هذا فعليًا قابل للمنع
    const originalGetDisplayMedia =
      navigator.mediaDevices?.getDisplayMedia?.bind(navigator.mediaDevices);

    if (typeof originalGetDisplayMedia === "function") {
      navigator.mediaDevices.getDisplayMedia = async () => {
        onSuspiciousActivity("getDisplayMedia_called");
        setCovered(true);
        throw new DOMException("Screen recording is not allowed", "NotAllowedError");
      };
    }

    // 2) getUserMedia بكاميرا — سياق إضافي فقط، ليس دليل تسجيل
    const originalGetUserMedia =
      navigator.mediaDevices?.getUserMedia?.bind(navigator.mediaDevices);

    if (typeof originalGetUserMedia === "function") {
      navigator.mediaDevices.getUserMedia = async (constraints) => {
        if (constraints?.video) {
          onSuspiciousActivity("camera_access_requested");
        }
        return originalGetUserMedia(constraints);
      };
    }

    // 3) تغطية فورية عند فقدان تركيز النافذة أو التبويب (يغطي "ألت-تاب" ونوافذ تسجيل كثيرة،
    //    لكن لا يوقف تصوير الشاشة بموبايل تاني أو أداة نظام لا تسحب التركيز)
const handleBlur = () => {
  // فقدان focus وحده ليس دليلًا على تسجيل الشاشة.
  // لا نغطي الفيديو ولا نوقفه هنا.
  reportFocusLoss();
};

const handleFocus = () => {
  // لا نفعل شيئًا عند عودة التركيز.
};

const handleVisibilityChange = () => {
  // visibilitychange أقوى من blur:
  // نغطي فقط عندما تصبح الصفحة مخفية فعلًا.
  if (document.visibilityState === "hidden") {
    setCovered(true);
  } else {
    setCovered(false);
  }
};

    window.addEventListener("blur", handleBlur);
    window.addEventListener("focus", handleFocus);
    document.addEventListener("visibilitychange", handleVisibilityChange);

    // 4) DevTools مفتوحة (مؤشر ضعيف، ممكن يعطي false positive مع بعض إعدادات المتصفح)
    let devtoolsOpen = false;
    const threshold = 160;
    const checkDevTools = () => {
      const widthDiff = window.outerWidth - window.innerWidth > threshold;
      const heightDiff = window.outerHeight - window.innerHeight > threshold;
      if ((widthDiff || heightDiff) && !devtoolsOpen) {
        devtoolsOpen = true;
        onSuspiciousActivity("devtools_possibly_open");
      } else if (!widthDiff && !heightDiff) {
        devtoolsOpen = false;
      }
    };
    const interval = setInterval(checkDevTools, 2000);

    return () => {
      if (typeof originalGetDisplayMedia === "function") {
        navigator.mediaDevices.getDisplayMedia = originalGetDisplayMedia;
      }
      if (typeof originalGetUserMedia === "function") {
        navigator.mediaDevices.getUserMedia = originalGetUserMedia;
      }
      window.removeEventListener("blur", handleBlur);
      window.removeEventListener("focus", handleFocus);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      clearInterval(interval);
    };
  }, [onSuspiciousActivity, reportFocusLoss, setCovered]);

  return { isCovered };
}