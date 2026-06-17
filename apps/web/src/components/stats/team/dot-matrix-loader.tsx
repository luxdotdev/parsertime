const COLS = 7;
const ROWS = 3;

/**
 * Terminal-style dot-matrix loader: a small amber grid whose dots pulse in a
 * left-to-right diagonal sweep, with a mono caption. Used as the front-and-center
 * indicator while a timeframe change re-renders the dimmed team-stats content.
 */
export function DotMatrixLoader({ label }: { label: string }) {
  return (
    <div
      role="status"
      aria-live="polite"
      className="border-border bg-background/85 flex flex-col items-center gap-3 rounded-md border px-6 py-5 shadow-sm backdrop-blur-sm"
    >
      <div
        aria-hidden
        className="grid gap-1.5"
        style={{ gridTemplateColumns: `repeat(${COLS}, minmax(0, 1fr))` }}
      >
        {Array.from({ length: ROWS * COLS }).map((_, i) => {
          const col = i % COLS;
          const row = Math.floor(i / COLS);
          return (
            <span
              key={`${row}-${col}`}
              className="bg-primary animate-dot-matrix size-1.5 rounded-full opacity-[0.12] motion-reduce:animate-none motion-reduce:opacity-100"
              style={{ animationDelay: `${col * 0.1 + row * 0.05}s` }}
            />
          );
        })}
      </div>
      <p className="text-muted-foreground font-mono text-[11px] tracking-[0.18em] uppercase">
        {label}
        <span className="text-primary animate-dot-matrix ml-1 inline-block motion-reduce:animate-none">
          _
        </span>
      </p>
    </div>
  );
}
