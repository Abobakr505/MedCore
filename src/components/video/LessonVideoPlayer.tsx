import { useEffect, useState } from "react";
import { Loader2, AlertCircle } from "lucide-react";

interface LessonVideoPlayerProps {
  otp: string;
  playbackInfo: string;
  className?: string;
}

export default function LessonVideoPlayer({
  otp,
  playbackInfo,
  className = "",
}: LessonVideoPlayerProps) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    setError(null);

    if (!otp || !playbackInfo) {
      setError("تعذر تحميل بيانات التشغيل");
      setLoading(false);
    }
  }, [otp, playbackInfo]);

  const src = `https://player.vdocipher.com/v2/?otp=${encodeURIComponent(
    otp
  )}&playbackInfo=${encodeURIComponent(playbackInfo)}`;

  return (
    <div className={`relative aspect-video overflow-hidden rounded-3xl bg-black ${className}`}>
      {loading && !error && (
        <div className="pointer-events-none absolute inset-0 z-20 flex items-center justify-center bg-black">
          <Loader2 className="h-10 w-10 animate-spin text-white" />
        </div>
      )}

      {error && (
        <div className="absolute inset-0 z-30 flex flex-col items-center justify-center gap-3 bg-black/90 px-5 text-center">
          <AlertCircle className="h-10 w-10 text-red-400" />
          <p className="text-sm font-bold text-white">{error}</p>
        </div>
      )}

      {!error && (
        <iframe
          src={src}
          className="absolute inset-0 h-full w-full border-0"
          allow="encrypted-media; autoplay; fullscreen; picture-in-picture"
          allowFullScreen
          onLoad={() => setLoading(false)}
        />
      )}
    </div>
  );
}