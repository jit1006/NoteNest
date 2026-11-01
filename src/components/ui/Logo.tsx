export default function Logo({ className = '' }: { className?: string }) {
  return (
    <span className={`inline-flex items-center gap-2.5 ${className}`}>
      <span
        aria-hidden="true"
        className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-brand-600 to-accent-600 shadow-glow"
      >
        <svg viewBox="0 0 24 24" className="h-5 w-5 text-white" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M4 20V6l8 9V4" />
          <path d="M12 15l8 5V4" opacity=".75" />
        </svg>
      </span>
      <span className="text-lg font-extrabold tracking-tight text-slate-900 dark:text-white">
        Note<span className="gradient-text">Nest</span>
      </span>
    </span>
  )
}
