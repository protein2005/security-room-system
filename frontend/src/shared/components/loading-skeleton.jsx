export function LoadingSkeleton({ className = "" }) {
  return <div className={`animate-pulse rounded-2xl bg-white/70 ${className}`.trim()} />;
}

export function LoadingCardGrid({ count = 4 }) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {Array.from({ length: count }).map((_, index) => (
        <div key={index} className="glass-panel p-5">
          <LoadingSkeleton className="h-4 w-24" />
          <LoadingSkeleton className="mt-5 h-8 w-20" />
          <LoadingSkeleton className="mt-4 h-3 w-40" />
        </div>
      ))}
    </div>
  );
}
