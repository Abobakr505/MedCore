import {
  useEffect,
  useRef,
  useState,
  useCallback,
} from "react";
import {
  Play,
  Pause,
  Volume2,
  VolumeX,
  Maximize,
  Minimize,
  RotateCcw,
  RotateCw,
  Settings,
  Loader2,
} from "lucide-react";

/* -------------------------------------------------------------------------- */
/* Types                                                                      */
/* -------------------------------------------------------------------------- */

interface LessonVideoPlayerProps {
  src: string;
  onTimeUpdate?: (currentTime: number, duration: number) => void;
  onEnded?: () => void;
  disableRightClick?: boolean;
  className?: string;
}

const SPEED_OPTIONS = [0.5, 0.75, 1, 1.25, 1.5, 1.75, 2];

/* -------------------------------------------------------------------------- */
/* Helpers                                                                    */
/* -------------------------------------------------------------------------- */

function formatTime(seconds: number) {
  if (!isFinite(seconds) || seconds < 0) return "00:00";

  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);

  const mm = m.toString().padStart(2, "0");
  const ss = s.toString().padStart(2, "0");

  return h > 0 ? `${h}:${mm}:${ss}` : `${mm}:${ss}`;
}

/* -------------------------------------------------------------------------- */
/* Component                                                                  */
/* -------------------------------------------------------------------------- */

export default function LessonVideoPlayer({
  src,
  onTimeUpdate,
  onEnded,
  disableRightClick = true,
  className = "",
}: LessonVideoPlayerProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const hideControlsTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [playing, setPlaying] = useState(false);
  const [buffering, setBuffering] = useState(true);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [buffered, setBuffered] = useState(0);
  const [volume, setVolume] = useState(1);
  const [muted, setMuted] = useState(false);
  const [speed, setSpeed] = useState(1);
  const [showSpeedMenu, setShowSpeedMenu] = useState(false);
  const [fullscreen, setFullscreen] = useState(false);
  const [showControls, setShowControls] = useState(true);
  const [seeking, setSeeking] = useState(false);

  /* Play / pause */

  const togglePlay = useCallback(() => {
    const video = videoRef.current;
    if (!video) return;

    if (video.paused) {
      video.play();
    } else {
      video.pause();
    }
  }, []);

  /* Seek */

  const seekTo = useCallback((time: number) => {
    const video = videoRef.current;
    if (!video || !isFinite(video.duration)) return;

    video.currentTime = Math.min(
      Math.max(0, time),
      video.duration
    );
  }, []);

  const skip = useCallback(
    (delta: number) => {
      const video = videoRef.current;
      if (!video) return;
      seekTo(video.currentTime + delta);
    },
    [seekTo]
  );

  /* Speed */

  const changeSpeed = (value: number) => {
    const video = videoRef.current;
    if (!video) return;

    video.playbackRate = value;
    setSpeed(value);
    setShowSpeedMenu(false);
  };

  /* Volume */

  const changeVolume = (value: number) => {
    const video = videoRef.current;
    if (!video) return;

    video.volume = value;
    video.muted = value === 0;
    setVolume(value);
    setMuted(value === 0);
  };

  const toggleMute = () => {
    const video = videoRef.current;
    if (!video) return;

    video.muted = !video.muted;
    setMuted(video.muted);
  };

  /* Fullscreen */

  const toggleFullscreen = () => {
    const container = containerRef.current;
    if (!container) return;

    if (!document.fullscreenElement) {
      container.requestFullscreen?.();
    } else {
      document.exitFullscreen?.();
    }
  };

  useEffect(() => {
    const handler = () =>
      setFullscreen(Boolean(document.fullscreenElement));

    document.addEventListener("fullscreenchange", handler);
    return () =>
      document.removeEventListener("fullscreenchange", handler);
  }, []);

  /* Auto-hide controls */

  const resetHideTimer = useCallback(() => {
    setShowControls(true);

    if (hideControlsTimeout.current) {
      clearTimeout(hideControlsTimeout.current);
    }

    hideControlsTimeout.current = setTimeout(() => {
      if (videoRef.current && !videoRef.current.paused) {
        setShowControls(false);
        setShowSpeedMenu(false);
      }
    }, 2800);
  }, []);

  /* Video element events */

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const onPlay = () => setPlaying(true);
    const onPause = () => setPlaying(false);
    const onWaiting = () => setBuffering(true);
    const onPlaying = () => setBuffering(false);
    const onCanPlay = () => setBuffering(false);

    const onTime = () => {
      setCurrentTime(video.currentTime);
      onTimeUpdate?.(video.currentTime, video.duration || 0);

      if (video.buffered.length) {
        setBuffered(
          video.buffered.end(video.buffered.length - 1)
        );
      }
    };

    const onLoadedMeta = () => setDuration(video.duration || 0);
    const onEndedHandler = () => onEnded?.();

    video.addEventListener("play", onPlay);
    video.addEventListener("pause", onPause);
    video.addEventListener("waiting", onWaiting);
    video.addEventListener("playing", onPlaying);
    video.addEventListener("canplay", onCanPlay);
    video.addEventListener("timeupdate", onTime);
    video.addEventListener("loadedmetadata", onLoadedMeta);
    video.addEventListener("ended", onEndedHandler);

    return () => {
      video.removeEventListener("play", onPlay);
      video.removeEventListener("pause", onPause);
      video.removeEventListener("waiting", onWaiting);
      video.removeEventListener("playing", onPlaying);
      video.removeEventListener("canplay", onCanPlay);
      video.removeEventListener("timeupdate", onTime);
      video.removeEventListener("loadedmetadata", onLoadedMeta);
      video.removeEventListener("ended", onEndedHandler);
    };
  }, [onTimeUpdate, onEnded]);

  /* Keyboard shortcuts */

  useEffect(() => {
    const handleKey = (event: KeyboardEvent) => {
      if (!containerRef.current?.contains(document.activeElement) &&
          document.activeElement !== document.body) return;

      switch (event.key) {
        case " ":
        case "k":
          event.preventDefault();
          togglePlay();
          break;
        case "ArrowRight":
          skip(5);
          break;
        case "ArrowLeft":
          skip(-5);
          break;
        case "f":
          toggleFullscreen();
          break;
        case "m":
          toggleMute();
          break;
      }
    };

    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [togglePlay, skip]);

  const progressPct = duration ? (currentTime / duration) * 100 : 0;
  const bufferedPct = duration ? (buffered / duration) * 100 : 0;

  return (
    <div
      ref={containerRef}
      dir="ltr"
      onMouseMove={resetHideTimer}
      onTouchStart={resetHideTimer}
      className={`group relative aspect-video overflow-hidden rounded-3xl bg-black ${className}`}
    >
      <video
        ref={videoRef}
        src={src}
        playsInline
        onClick={togglePlay}
        onContextMenu={(e) => disableRightClick && e.preventDefault()}
        className="h-full w-full object-contain"
      />

      {/* Buffering spinner */}
      {buffering && (
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
          <Loader2 className="h-10 w-10 animate-spin text-white" />
        </div>
      )}

      {/* Center play button (paused state) */}
      {!playing && !buffering && (
        <button
          type="button"
          onClick={togglePlay}
          className="absolute inset-0 flex items-center justify-center bg-black/20 transition hover:bg-black/30"
        >
          <span className="flex h-16 w-16 items-center justify-center rounded-full bg-white/90 text-slate-900 shadow-xl">
            <Play className="ml-1 h-7 w-7" fill="currentColor" />
          </span>
        </button>
      )}

      {/* Controls bar */}
      <div
        className={`absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/85 via-black/40 to-transparent px-3 pb-3 pt-8 transition-opacity duration-300 ${
          showControls || !playing ? "opacity-100" : "opacity-0"
        }`}
      >
        {/* Seek bar */}
        <div
          className="group/seek relative mb-2 h-3 cursor-pointer"
          onClick={(event) => {
            const rect = event.currentTarget.getBoundingClientRect();
            const ratio = (event.clientX - rect.left) / rect.width;
            seekTo(ratio * duration);
          }}
        >
          <div className="absolute top-1/2 h-1.5 w-full -translate-y-1/2 rounded-full bg-white/25" />

          <div
            className="absolute top-1/2 h-1.5 -translate-y-1/2 rounded-full bg-white/40"
            style={{ width: `${bufferedPct}%` }}
          />

          <div
            className="absolute top-1/2 h-1.5 -translate-y-1/2 rounded-full bg-brand-500"
            style={{ width: `${progressPct}%` }}
          />

          <div
            className="absolute top-1/2 h-3.5 w-3.5 -translate-y-1/2 -translate-x-1/2 rounded-full bg-brand-500 opacity-0 shadow transition group-hover/seek:opacity-100"
            style={{ left: `${progressPct}%` }}
          />
        </div>

        <div className="flex items-center gap-3 text-white">
          <button type="button" onClick={togglePlay}>
            {playing ? (
              <Pause className="h-5 w-5" fill="currentColor" />
            ) : (
              <Play className="h-5 w-5" fill="currentColor" />
            )}
          </button>

          <button type="button" onClick={() => skip(-10)} title="رجوع 10 ثواني">
            <RotateCcw className="h-4.5 w-4.5" />
          </button>

          <button type="button" onClick={() => skip(10)} title="تقديم 10 ثواني">
            <RotateCw className="h-4.5 w-4.5" />
          </button>

          <div className="hidden items-center gap-2 sm:flex">
            <button type="button" onClick={toggleMute}>
              {muted || volume === 0 ? (
                <VolumeX className="h-4.5 w-4.5" />
              ) : (
                <Volume2 className="h-4.5 w-4.5" />
              )}
            </button>

            <input
              type="range"
              min={0}
              max={1}
              step={0.05}
              value={muted ? 0 : volume}
              onChange={(event) => changeVolume(Number(event.target.value))}
              className="h-1 w-20 accent-brand-500"
            />
          </div>

          <span className="text-xs font-medium tabular-nums text-white/80">
            {formatTime(currentTime)} / {formatTime(duration)}
          </span>

          <div className="flex-1" />

          {/* Speed */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setShowSpeedMenu((v) => !v)}
              className="flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-bold hover:bg-white/10"
            >
              <Settings className="h-4 w-4" />
              {speed}x
            </button>

            {showSpeedMenu && (
              <div className="absolute bottom-full left-1/2 mb-2 w-24 -translate-x-1/2 overflow-hidden rounded-xl bg-slate-900/95 py-1 shadow-xl">
                {SPEED_OPTIONS.map((option) => (
                  <button
                    key={option}
                    type="button"
                    onClick={() => changeSpeed(option)}
                    className={`block w-full px-3 py-1.5 text-center text-xs font-bold transition hover:bg-white/10 ${
                      option === speed ? "text-brand-400" : "text-white/80"
                    }`}
                  >
                    {option}x
                  </button>
                ))}
              </div>
            )}
          </div>

          <button type="button" onClick={toggleFullscreen}>
            {fullscreen ? (
              <Minimize className="h-4.5 w-4.5" />
            ) : (
              <Maximize className="h-4.5 w-4.5" />
            )}
          </button>
        </div>
      </div>
    </div>
  );
}