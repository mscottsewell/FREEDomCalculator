/**
 * Chart color constants — must stay in sync with --chart-* vars in src/index.css.
 * Using constants (rather than getComputedStyle) keeps Recharts stroke/fill
 * props stable across renders and avoids DOM reads on every paint.
 */
export const CHART_COLORS = {
  emerald: 'oklch(0.72 0.13 72)',    // chart-1 — gold, growth/primary
  blue:    'oklch(0.52 0.16 20)',    // chart-2 — maroon, brand
  amber:   'oklch(0.70 0.17 55)',    // chart-3 — amber, principal
  red:     'oklch(0.57 0.22 27)',    // chart-4 — red, loss/cost
  violet:  'oklch(0.58 0.14 185)',   // chart-5 — teal, supplemental
} as const;
