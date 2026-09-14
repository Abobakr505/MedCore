export function Skeleton({ className = "h-4 w-full" }: { className?: string }) {
  return <div className={`skeleton ${className}`} />;
}

export function CourseCardSkeleton() {
  return (
    <div className="rounded-2xl border border-slate-100 p-3 space-y-3">
      <Skeleton className="h-40 w-full rounded-xl" />
      <Skeleton className="h-4 w-3/4" />
      <Skeleton className="h-3 w-1/2" />
      <Skeleton className="h-8 w-full rounded-lg" />
    </div>
  );
}
