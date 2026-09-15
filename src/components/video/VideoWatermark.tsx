import { useEffect, useRef, useState } from "react";

interface VideoWatermarkProps {
  phone: string;
  containerRef: React.RefObject<HTMLDivElement>;
}

export function VideoWatermark({ phone, containerRef }: VideoWatermarkProps) {
  const [position, setPosition] = useState({ top: 10, left: 10 });
  const [time, setTime] = useState(() => new Date().toLocaleTimeString("ar-EG"));

  // حركة عشوائية كل 4 ثواني
  useEffect(() => {
    const moveInterval = setInterval(() => {
      setPosition({
        top: Math.random() * 80 + 5, // % من الارتفاع
        left: Math.random() * 70 + 5, // % من العرض
      });
    }, 10000);

    return () => clearInterval(moveInterval);
  }, []);

  // تحديث الوقت كل ثانية (يمنع أي حد من عمل screenshot ثابت واستخدامه)
  useEffect(() => {
    const timeInterval = setInterval(() => {
      setTime(new Date().toLocaleTimeString("ar-EG"));
    }, 1000);

    return () => clearInterval(timeInterval);
  }, []);

  return (
    <div
      className="pointer-events-none absolute z-20 select-none rounded-md bg-black/40 px-3 py-1.5 backdrop-blur-sm transition-all duration-[3000ms] ease-in-out"
      style={{
        top: `${position.top}%`,
        left: `${position.left}%`,
      }}
    >
      <p className="whitespace-nowrap text-xs font-bold text-white/90 sm:text-sm">
        {phone} · {time}
      </p>
    </div>
  );
}