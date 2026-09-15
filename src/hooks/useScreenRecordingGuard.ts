import { useEffect, useRef, useCallback } from "react";

interface Options {
  onSuspiciousActivity: (reason: string) => void;
  /** عدد مرات فقدان التركيز خلال نافذة زمنية قبل اعتباره مشبوهًا */
  focusLossThreshold?: number;
  focusLossWindowMs?: number;
}

/**
 * كشف إشارات (وليس إثباتات) لتسجيل/مشاركة الشاشة.
 *
 * ⚠️ حدود حقيقية غير قابلة للتجاوز:
 * - لا يمكن كشف QuickTime / أدوات نظام التشغيل / كاميرا خارجية تصوّر الشاشة.
 * - كل ما هنا "مؤشرات احتمالية" يمكن أن تعطي false positive (مستخدم بدّل تبويب فقط)
 *   أو false negative (تسجيل عبر أداة نظام لا يترك أي أثر في المتصفح).
 * - هذا الملف مكمّل للعلامة المائية أدناه، وليس بديلاً عنها.
 */
export function useScreenRecordingGuard({
  onSuspiciousActivity,
  focusLossThreshold = 4,
  focusLossWindowMs = 30_000,
}: Options) {
  const triggeredRef = useRef(false);
  const focusLossTimestamps = useRef<number[]>([]);

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
    triggeredRef.current = false;

    // 1) getDisplayMedia (تسجيل/مشاركة شاشة عبر المتصفح نفسه)
    const originalGetDisplayMedia =
      navigator.mediaDevices?.getDisplayMedia?.bind(navigator.mediaDevices);

    if (typeof originalGetDisplayMedia === "function") {
      navigator.mediaDevices.getDisplayMedia = async (...args) => {
        onSuspiciousActivity("getDisplayMedia_called");
        throw new DOMException("Screen recording is not allowed", "NotAllowedError");
      };
    }

    // 2) getUserMedia بكاميرا — بعض تطبيقات "تصوير الشاشة بكاميرا خارجية"
    //    لا تظهر هنا أصلاً، لكن نسجل محاولات وصول الكاميرا كسياق إضافي
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

    // 3) فقدان تركيز متكرر خلال فترة قصيرة (مؤشر ضعيف جدًا، استخدمه بحذر)
    const handleBlur = () => reportFocusLoss();
    window.addEventListener("blur", handleBlur);

    // 4) DevTools مفتوحة بشكل غير طبيعي (مؤشر إضافي ضعيف أيضًا)
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
      clearInterval(interval);
    };
  }, [onSuspiciousActivity, reportFocusLoss]);
}