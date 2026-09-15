import { useEffect, useRef } from "react";

interface Options {
  onSuspiciousActivity: () => void;
}

/**
 * كشف محاولة تسجيل الشاشة عبر واجهة المتصفح (getDisplayMedia).
 *
 * لا يتم الاعتماد على visibilitychange لأنه يتطلق أيضًا عند
 * مجرد التنقل بين التبويبات بشكل طبيعي، ولا يمكن التفريق بينه
 * وبين تسجيل شاشة فعلي.
 *
 * تنبيه: هذا لا يكشف تسجيل الشاشة عبر أدوات نظام التشغيل
 * (QuickTime، Screenshot toolbar، إلخ) لأنها تعمل خارج نطاق
 * المتصفح تمامًا ولا توجد طريقة تقنية لكشفها من صفحة ويب.
 */
export function useScreenRecordingGuard({ onSuspiciousActivity }: Options) {
  const triggeredRef = useRef(false);

  useEffect(() => {
    triggeredRef.current = false;

    const originalGetDisplayMedia =
      navigator.mediaDevices?.getDisplayMedia?.bind(navigator.mediaDevices);

    if (originalGetDisplayMedia) {
      navigator.mediaDevices.getDisplayMedia = async (...args) => {
        if (!triggeredRef.current) {
          triggeredRef.current = true;
          onSuspiciousActivity();
        }

        throw new DOMException(
          "Screen recording is not allowed",
          "NotAllowedError"
        );
      };
    }

    return () => {
      if (originalGetDisplayMedia) {
        navigator.mediaDevices.getDisplayMedia = originalGetDisplayMedia;
      }
    };
  }, [onSuspiciousActivity]);
}