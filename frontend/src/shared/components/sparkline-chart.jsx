export function SparklineChart({ data = [], color = "#0f766e", label }) {
  if (!data.length) {
    return (
      <div className="rounded-2xl bg-white/70 px-4 py-8 text-center text-sm text-muted-foreground">
        {label ? `${label}: ` : ""}немає достатньо даних для графіка
      </div>
    );
  }

  const width = 480;
  const height = 140;
  const padding = 14;
  const values = data.map((item) => Number(item)).filter((item) => Number.isFinite(item));

  if (!values.length) {
    return (
      <div className="rounded-2xl bg-white/70 px-4 py-8 text-center text-sm text-muted-foreground">
        {label ? `${label}: ` : ""}немає числових значень
      </div>
    );
  }

  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;

  const points = values
    .map((value, index) => {
      const x = padding + (index / Math.max(values.length - 1, 1)) * (width - padding * 2);
      const y = height - padding - ((value - min) / range) * (height - padding * 2);
      return `${x},${y}`;
    })
    .join(" ");

  return (
    <div className="rounded-2xl border border-white/70 bg-white/85 p-3">
      <svg viewBox={`0 0 ${width} ${height}`} className="h-36 w-full overflow-visible">
        <polyline fill="none" stroke={color} strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" points={points} />
      </svg>
      <div className="mt-2 flex items-center justify-between text-xs text-muted-foreground">
        <span>min {min.toFixed(1)}</span>
        <span>max {max.toFixed(1)}</span>
      </div>
    </div>
  );
}
