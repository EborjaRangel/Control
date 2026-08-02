/** Círculo verde con palomita blanca — estatus ALTA en cards de dirigente. */
export function DirigenteEstatusAltaIcon({ className = "" }: { className?: string }) {
  return (
    <span
      className={`inline-flex size-6 shrink-0 items-center justify-center rounded-full bg-success-text shadow-sm ${className}`.trim()}
      title="Alta"
      aria-label="Alta"
      role="img"
    >
      <svg className="size-3.5" viewBox="0 0 12 12" fill="none" aria-hidden>
        <path
          d="M2.25 6.1 4.85 8.7 9.85 3.45"
          stroke="#fff"
          strokeWidth="1.85"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </span>
  );
}
