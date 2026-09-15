import { useEffect, useState } from "react";

interface VideoWatermarkProps {
  phone: string;
  userId?: string;
  containerRef: React.RefObject<HTMLDivElement>;
}

export function VideoWatermark({ phone, userId, containerRef }: VideoWatermarkProps) {
  const [position, setPosition] = useState({ top: 10, left: 10 });
  const [time, setTime] = useState(() =>
    new Date().toLocaleTimeString("ar-EG", { hour: "2-digit", minute: "2-digit" })
  );

  // حركة عشوائية كل 4 ثواني (متطابقة مع التعليق الأصلي)
  useEffect(() => {
    const moveInterval = setInterval(() => {
      setPosition({
        top: Math.random() * 80 + 5, // % من الارتفاع
        left: Math.random() * 70 + 5, // % من العرض
      });
    }, 15000);

    return () => clearInterval(moveInterval);
  }, []);

  // تحديث الوقت كل دقيقة كافي لتحديد التوقيت التقريبي، وبيقلل إعادة الرسم بدون فايدة حقيقية
  useEffect(() => {
    const timeInterval = setInterval(() => {
      setTime(
        new Date().toLocaleTimeString("ar-EG", { hour: "2-digit", minute: "2-digit" })
      );
    }, 60_000);

    return () => clearInterval(timeInterval);
  }, []);

  const label = `${phone}${userId ? " · " + userId : ""} · ${time}`;

  return (
    <div
      ref={containerRef}
      className="pointer-events-none absolute z-20 select-none rounded-md bg-black/40 px-3 py-1.5 backdrop-blur-sm transition-all duration-[3000ms] ease-in-out"
      style={{
        top: `${position.top}%`,
        left: `${position.left}%`,
      }}
    >
      <p className="whitespace-nowrap text-xs font-bold text-white/90 sm:text-sm">
        {label}
      </p>
    </div>
  );
}