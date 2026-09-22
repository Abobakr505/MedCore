import { useEffect, useRef, useState } from "react";
import {
  Loader2,
  AlertCircle,
  Maximize,
  Minimize,
} from "lucide-react";

interface LessonVideoPlayerProps {
  src: string;
  onTimeUpdate?: (currentTime: number, duration: number) => void;
  onEnded?: () => void;
  disableRightClick?: boolean;
  className?: string;
  watermark?: React.ReactNode;
}

export default function LessonVideoPlayer({
  src,
  onTimeUpdate,
  onEnded,
  className = "",
  watermark,
}: LessonVideoPlayerProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const iframeRef = useRef<HTMLIFrameElement | null>(null);
  const durationRef = useRef(0);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);

  useEffect(() => {
    setLoading(true);
    setError(null);
    durationRef.current = 0;
  }, [src]);

  /*
   * استقبال رسائل Bunny Player
   */
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
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
            if (
              typeof data.duration === "number" &&
              data.duration > 0
            ) {
              durationRef.current = data.duration;
            }

            onTimeUpdate?.(
              data.currentTime,
              durationRef.current
            );
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

  /*
   * إخفاء loading بعد 8 ثوانٍ كحد أقصى
   */
  useEffect(() => {
    const timeout = setTimeout(() => {
      setLoading(false);
    }, 8000);

    return () => clearTimeout(timeout);
  }, [src]);

  /*
   * مراقبة حالة Fullscreen
   */
  useEffect(() => {
    const handleFullscreenChange = () => {
      const fullscreenElement = document.fullscreenElement;

      setIsFullscreen(
        fullscreenElement === containerRef.current
      );
    };

    document.addEventListener(
      "fullscreenchange",
      handleFullscreenChange
    );

    return () => {
      document.removeEventListener(
        "fullscreenchange",
        handleFullscreenChange
      );
    };
  }, []);

  /*
   * الدخول إلى Fullscreen للحاوية كاملة
   */
  const enterFullscreen = async () => {
    try {
      if (!containerRef.current) return;

      await containerRef.current.requestFullscreen();
    } catch (error) {
      console.error(
        "Fullscreen request failed:",
        error
      );
    }
  };

  /*
   * الخروج من Fullscreen
   */
  const exitFullscreen = async () => {
    try {
      if (document.fullscreenElement) {
        await document.exitFullscreen();
      }
    } catch (error) {
      console.error(
        "Exit fullscreen failed:",
        error
      );
    }
  };

  /*
   * تبديل Fullscreen
   */
  const toggleFullscreen = () => {
    if (document.fullscreenElement) {
      exitFullscreen();
    } else {
      enterFullscreen();
    }
  };

  return (
    <div
      ref={containerRef}
      className={`
        relative
        aspect-video
        overflow-hidden
        rounded-3xl
        bg-black
        ${isFullscreen ? "rounded-none" : ""}
        ${className}
      `}
    >
      {loading && !error && (
        <div className="pointer-events-none absolute inset-0 z-20 flex items-center justify-center bg-black">
          <Loader2 className="h-10 w-10 animate-spin text-white" />
        </div>
      )}

      {error && (
        <div className="absolute inset-0 z-30 flex flex-col items-center justify-center gap-3 bg-black/90 px-5 text-center">
          <AlertCircle className="h-10 w-10 text-red-400" />

          <p className="text-sm font-bold text-white">
            {error}
          </p>
        </div>
      )}

      <iframe
        ref={iframeRef}
        src={src}
        loading="lazy"
        className="absolute inset-0 h-full w-full border-0"
        allow="
          accelerometer;
          gyroscope;
          autoplay;
          encrypted-media;
          picture-in-picture;
        "
        onLoad={() => {
          setLoading(false);
        }}
      />

      {/* 
        Watermark
        أي عنصر يتم تمريره هنا سيظل داخل Fullscreen
      */}
      {watermark && (
        <div className="pointer-events-none absolute inset-0 z-20">
          {watermark}
        </div>
      )}

      {/* زر Fullscreen الخاص بنا */}
      <button
        type="button"
        onClick={toggleFullscreen}
        className="
          absolute
          bottom-4
          right-4
          z-30
          flex
          h-10
          w-10
          items-center
          justify-center
          rounded-lg
          bg-black/60
          text-white
          backdrop-blur
          transition
          hover:bg-black/80
        "
        aria-label={
          isFullscreen
            ? "الخروج من ملء الشاشة"
            : "ملء الشاشة"
        }
      >
        {isFullscreen ? (
          <Minimize className="h-5 w-5" />
        ) : (
          <Maximize className="h-5 w-5" />
        )}
      </button>
    </div>
  );
}