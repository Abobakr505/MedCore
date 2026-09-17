import { useEffect, useRef, useState } from "react";
import { Loader2, AlertCircle } from "lucide-react";

/* -------------------------------------------------------------------------- */
/* Types                                                                      */
/* -------------------------------------------------------------------------- */

interface LessonVideoPlayerProps {
  src: string; // رابط الـ embed اللي راجع من الـ edge function
  onTimeUpdate?: (currentTime: number, duration: number) => void;
  onEnded?: () => void;
  disableRightClick?: boolean;
  className?: string;
}

/* -------------------------------------------------------------------------- */
/* Component                                                                  */
/* -------------------------------------------------------------------------- */

export default function LessonVideoPlayer({
  src,
  onTimeUpdate,
  onEnded,
  className = "",
}: LessonVideoPlayerProps) {
  const iframeRef = useRef<HTMLIFrameElement | null>(null);
  const durationRef = useRef(0);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  /* إعادة ضبط الحالة كل مرة يتغيّر فيها مصدر الفيديو */
  useEffect(() => {
    setLoading(true);
    setError(null);
    durationRef.current = 0;
  }, [src]);

  /* استقبال أحداث اللاعب عن طريق postMessage (بروتوكول Player.js بتاع Bunny) */
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      // تأكد إن الرسالة جاية من Bunny فعلاً
      if (
        typeof event.origin !== "string" ||
        !event.origin.includes("mediadelivery.net")
      ) {
        return;
      }

      let data: any;

      try {
        data =
          typeof event.data === "string"
            ? JSON.parse(event.data)
            : event.data;
      } catch {
        return;
      }

      if (!data || typeof data !== "object") return;

      switch (data.event) {
        case "ready":
          setLoading(false);
          break;

        case "timeupdate":
          if (typeof data.currentTime === "number") {
            if (typeof data.duration === "number" && data.duration > 0) {
              durationRef.current = data.duration;
            }

            onTimeUpdate?.(data.currentTime, durationRef.current);
          }
          break;

        case "ended":
          onEnded?.();
          break;

        case "error":
          setError("تعذر تشغيل الفيديو. حاول تحديث الصفحة.");
          setLoading(false);
          break;

        default:
          break;
      }
    };

    window.addEventListener("message", handleMessage);

    return () => {
      window.removeEventListener("message", handleMessage);
    };
  }, [onTimeUpdate, onEnded]);

  /* احتياطي: لو حدث "ready" متجاش خلال 8 ثواني، شيل اللودينج برضه */
  useEffect(() => {
    const timeout = setTimeout(() => {
      setLoading(false);
    }, 8000);

    return () => clearTimeout(timeout);
  }, [src]);

  return (
    <div
      className={`relative aspect-video overflow-hidden rounded-3xl bg-black ${className}`}
    >
      {loading && !error && (
        <div className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center">
          <Loader2 className="h-10 w-10 animate-spin text-white" />
        </div>
      )}

      {error && (
        <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-3 bg-black/90 px-5 text-center">
          <AlertCircle className="h-10 w-10 text-red-400" />
          <p className="text-sm font-bold text-white">{error}</p>
        </div>
      )}

      <iframe
        ref={iframeRef}
        src={src}
        loading="lazy"
        className="absolute inset-0 h-full w-full border-0"
        allow="accelerometer;gyroscope;autoplay;encrypted-media;picture-in-picture;"
        allowFullScreen
        onLoad={() => {
          // بعض المتصفحات مابتبعتش "ready" فورًا، فده احتياطي إضافي
          setLoading(false);
        }}
      />
    </div>
  );
}