export function CardSkeleton() {
  return (
    <div className="card p-5" aria-hidden="true">
      <div className="skeleton mb-4 h-5 w-24" />
      <div className="skeleton mb-2 h-5 w-3/4" />
      <div className="skeleton mb-1.5 h-3.5 w-full" />
      <div className="skeleton mb-5 h-3.5 w-5/6" />
      <div className="skeleton h-10 w-full" />
    </div>
  )
}

export function PageSkeleton() {
  return (
    <div className="container-page py-12" role="status" aria-live="polite" aria-label="Loading page">
      <div className="skeleton mb-4 h-8 w-64" />
      <div className="skeleton mb-10 h-4 w-96 max-w-full" />
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 3 }, (_, i) => (
          <CardSkeleton key={i} />
        ))}
      </div>
      <span className="sr-only">Loading…</span>
    </div>
  )
}
