export type SkeletonVariant = "table" | "cards" | "list" | "block";

/** Placeholder shaped like the content being loaded, so the layout does not jump. */
export function Skeleton({
  variant = "list",
  rows = 5,
  label = "Cargando información…",
}: {
  variant?: SkeletonVariant;
  rows?: number;
  label?: string;
}) {
  return (
    <div
      className={`skeleton skeleton-${variant}`}
      role="status"
      aria-live="polite"
      aria-busy="true"
    >
      <span className="sr-only">{label}</span>
      {variant === "block" ? (
        <span className="skeleton-bone skeleton-fill" />
      ) : (
        Array.from({ length: rows }, (_, index) => (
          <div className="skeleton-row" key={index} aria-hidden="true">
            {variant !== "cards" && <span className="skeleton-bone skeleton-avatar" />}
            <span className="skeleton-bone skeleton-line" />
            <span className="skeleton-bone skeleton-line short" />
            {variant === "table" && <span className="skeleton-bone skeleton-pill" />}
          </div>
        ))
      )}
    </div>
  );
}

/** Fallback while a lazily loaded page is downloaded. */
export function PageSkeleton() {
  return (
    <main className="customers-content page-skeleton" aria-busy="true">
      <div className="page-skeleton-header" aria-hidden="true">
        <span className="skeleton-bone skeleton-overline" />
        <span className="skeleton-bone skeleton-title" />
        <span className="skeleton-bone skeleton-line" />
      </div>
      <Skeleton variant="table" rows={6} label="Cargando página…" />
    </main>
  );
}
