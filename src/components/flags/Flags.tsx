// Hand-authored SVG dive flags — the two international diver signals.
//
// Diver Down (recreational): red field, white diagonal stripe from the top of
//   the hoist to the bottom of the fly — "I have a diver down; keep clear."
// Alpha (commercial / surface-supplied): swallowtailed flag divided diagonally,
//   white above, blue below — "I have a diver down; keep well clear at slow
//   speed." Flown by vessels conducting commercial, military and SSA operations.

export interface FlagProps {
  className?: string;
  title?: string;
}

/** Fixed 3:2 ratio. Stroke/geometry numbers are deliberate — see file header. */
export function DiverDownFlag({ className, title = "Diver Down flag" }: FlagProps) {
  return (
    <svg
      viewBox="0 0 60 40"
      role="img"
      aria-label={title}
      className={className}
      xmlns="http://www.w3.org/2000/svg"
    >
      <rect width="60" height="40" fill="#C0271C" />
      <polygon points="0,0 60,40 63.1,35.4 3.1,-4.6" fill="#F5F9FC" />
    </svg>
  );
}

/** Swallowtail 3:2 with a quarter-length notch. */
export function AlphaFlag({ className, title = "Alpha flag" }: FlagProps) {
  return (
    <svg
      viewBox="0 0 60 40"
      role="img"
      aria-label={title}
      className={className}
      xmlns="http://www.w3.org/2000/svg"
    >
      <polygon points="0,0 60,40 0,40" fill="#1D5A94" />
      <polygon points="0,0 60,0 46,20 60,40" fill="#F5F9FC" />
    </svg>
  );
}

/**
 * Divechain brand mark — the two pennants flying together: recreational and
 * commercial divers, one standard (ERC-8260). "Two flags, one logbook."
 */
export function DivechainMark({ className, title = "Divechain" }: FlagProps) {
  return (
    <svg
      viewBox="0 0 64 32"
      role="img"
      aria-label={title}
      className={className}
      xmlns="http://www.w3.org/2000/svg"
    >
      <g transform="translate(2 4) rotate(-4 28 12)">
        <rect width="42" height="28" rx="2" fill="#C0271C" />
        <polygon points="0,0 42,28 44.2,24.8 2.2,-3.2" fill="#F5F9FC" />
      </g>
      <g transform="translate(30 0) rotate(5 17 16)">
        <polygon points="0,0 34,0 27,16 34,32 0,32" fill="#F5F9FC" />
        <polygon points="0,0 34,32 0,32" fill="#2F80C3" />
        <polygon
          points="0,0 34,0 27,16 34,32 0,32"
          fill="none"
          stroke="rgba(2,7,13,0.35)"
          strokeWidth="1"
        />
      </g>
    </svg>
  );
}

/**
 * Compact mark for tight spaces (favicon-style): diver-down square only.
 * Kept in sync with public/favicon.svg.
 */
export function DiverDownMark({ className, title = "Divechain" }: FlagProps) {
  return (
    <svg
      viewBox="0 0 40 40"
      role="img"
      aria-label={title}
      className={className}
      xmlns="http://www.w3.org/2000/svg"
    >
      <rect width="40" height="40" rx="8" fill="#02070d" />
      <rect x="6" y="6" width="28" height="28" rx="3" fill="#C0271C" />
      <polygon points="6,6 34,34 35.7,32.2 7.8,4.3" fill="#F5F9FC" />
    </svg>
  );
}
