/**
 * Industry-seeded life-insurance premium estimator (educational).
 *
 * These tables let the Term-vs-Whole calculator suggest *realistic* monthly
 * premiums from a person's age, coverage amount, and gender — instead of making
 * a student guess. Values are interpolated between the published anchor points.
 *
 * SOURCES (2024, healthy non-smoker, monthly premiums in USD):
 *  • Term — Fidelity Life "Term Life Insurance Rates Chart" (20-year level term),
 *    which draws on the LIMRA / Life Happens 2023 Insurance Barometer Study.
 *  • Whole — Ethos "Whole Life Insurance Rates by Age Chart" (traditional whole life).
 *
 * These are ballpark industry averages for education only — real quotes depend on
 * health, insurer, state, term length and underwriting.
 */

export type Gender = 'male' | 'female'

// Coverage anchor columns shared by every row of both tables.
const COVERAGE_ANCHORS = [100_000, 250_000, 500_000, 1_000_000]

// ── TERM (20-year level term, $/mo) ─────────────────────────────────────────
const TERM_AGES = [25, 30, 35, 40, 50, 60]
const TERM: Record<Gender, Record<number, number[]>> = {
  male: {
    25: [15, 30, 45, 75],
    30: [18, 35, 53, 88],
    35: [23, 45, 68, 113],
    40: [28, 55, 83, 138],
    50: [50, 100, 150, 250],
    60: [88, 175, 263, 438],
  },
  female: {
    25: [12, 25, 38, 63],
    30: [15, 28, 43, 70],
    35: [19, 35, 55, 90],
    40: [22, 45, 68, 110],
    50: [35, 70, 105, 175],
    60: [60, 120, 180, 300],
  },
}

// ── WHOLE / PERMANENT (traditional whole life, $/mo) ────────────────────────
const WHOLE_AGES = [30, 40, 50, 60]
const WHOLE: Record<Gender, Record<number, number[]>> = {
  male: {
    30: [89, 222, 444, 888],
    40: [133, 334, 667, 1335],
    50: [229, 573, 1146, 2293],
    60: [410, 1026, 2052, 4104],
  },
  female: {
    30: [80, 200, 399, 799],
    40: [121, 302, 605, 1209],
    50: [205, 513, 1025, 2050],
    60: [348, 869, 1738, 3476],
  },
}

function lerp(x: number, x0: number, x1: number, y0: number, y1: number): number {
  if (x1 === x0) return y0
  return y0 + (y1 - y0) * ((x - x0) / (x1 - x0))
}

/**
 * Piecewise-linear interpolation across sorted anchors. Beyond the ends it
 * extrapolates along the nearest segment; `dampLow` softens the slope when
 * extrapolating *below* the youngest anchor (real rates flatten out for the
 * very young rather than continuing to fall steeply), and `floor` keeps the
 * result realistic.
 */
function piecewise(
  x: number,
  xs: number[],
  ys: number[],
  opts: { dampLow?: number; floor?: number } = {}
): number {
  const { dampLow = 1, floor = 0 } = opts
  const n = xs.length
  if (x <= xs[0]) {
    const slope = (ys[1] - ys[0]) / (xs[1] - xs[0])
    return Math.max(floor, ys[0] - slope * (xs[0] - x) * dampLow)
  }
  if (x >= xs[n - 1]) {
    const slope = (ys[n - 1] - ys[n - 2]) / (xs[n - 1] - xs[n - 2])
    return Math.max(floor, ys[n - 1] + slope * (x - xs[n - 1]))
  }
  for (let i = 1; i < n; i++) {
    if (x <= xs[i]) return lerp(x, xs[i - 1], xs[i], ys[i - 1], ys[i])
  }
  return ys[n - 1]
}

// Interpolate a single age-row across the coverage columns.
function rateForCoverage(row: number[], coverage: number): number {
  return piecewise(coverage, COVERAGE_ANCHORS, row, { floor: 1 })
}

function estimate(
  table: Record<Gender, Record<number, number[]>>,
  ages: number[],
  age: number,
  coverage: number,
  gender: Gender,
  opts: { dampLow: number; floor: number }
): number {
  const byAge = ages.map((a) => rateForCoverage(table[gender][a], coverage))
  const raw = piecewise(age, ages, byAge, opts)
  return Math.max(opts.floor, Math.round(raw))
}

/** Estimated monthly TERM premium (20-yr level term, healthy non-smoker). */
export function estimateTermPremium(age: number, coverage: number, gender: Gender): number {
  return estimate(TERM, TERM_AGES, age, coverage, gender, { dampLow: 0.5, floor: 5 })
}

/** Estimated monthly WHOLE-life premium (traditional whole life). */
export function estimateWholePremium(age: number, coverage: number, gender: Gender): number {
  return estimate(WHOLE, WHOLE_AGES, age, coverage, gender, { dampLow: 0.6, floor: 20 })
}
