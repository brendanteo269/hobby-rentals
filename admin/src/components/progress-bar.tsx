/**
 * A thin progress bar. With `percent` it fills that far; without, it slides
 * back and forth, for work whose end is not known (a model reading a
 * conversation has no percentage to report). Announced to screen readers as a
 * progress indicator with the given label.
 */
export function ProgressBar({ percent, label }: { percent?: number; label: string }) {
  const determinate = percent !== undefined;
  return (
    <div
      role="progressbar"
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={determinate ? Math.round(percent) : undefined}
      className="h-1.5 w-full overflow-hidden rounded-full bg-stone"
    >
      <div
        className={`h-full rounded-full bg-ink ${determinate ? "transition-[width] duration-500" : "w-1/3 animate-indeterminate"}`}
        style={determinate ? { width: `${Math.max(0, Math.min(100, percent))}%` } : undefined}
      />
    </div>
  );
}
