/**
 * 2026 U.S. payroll-tax tables for the Paycheck Estimator (educational).
 *
 * Everything here is TAX YEAR 2026. When updating for a new year, change the
 * numbers AND the source list AND the TAX_YEAR constant together.
 *
 * SOURCES (accessed 2026-07-02):
 *  • Federal brackets & standard deduction — IRS Rev. Proc. 2025-32
 *    (https://www.irs.gov/pub/irs-drop/rp-25-32.pdf) as summarized by
 *    IRS Newsroom "tax inflation adjustments for tax year 2026"
 *    (https://www.irs.gov/newsroom/irs-releases-tax-inflation-adjustments-for-tax-year-2026-including-amendments-from-the-one-big-beautiful-bill)
 *    and Tax Foundation "2026 Tax Brackets"
 *    (https://taxfoundation.org/data/all/federal/2026-tax-brackets/).
 *  • Social Security wage base ($184,500) — SSA 2026 COLA fact sheet
 *    (https://www.ssa.gov/oact/cola/cbb.html).
 *  • Medicare rates & Additional Medicare thresholds — IRS Topic 560
 *    (https://www.irs.gov/taxtopics/tc560).
 *  • 401(k) elective-deferral limit ($24,500) — IRS Notice 2025-67
 *    (https://www.irs.gov/pub/irs-drop/n-25-67.pdf).
 *  • State rates — Tax Foundation "2026 State Income Tax Rates and Brackets"
 *    (https://taxfoundation.org/data/all/state/state-income-tax-rates-2026/,
 *    published February 17, 2026; data as of January 1, 2026).
 *    Progressive states are approximated by a single flat rate (see StateTaxInfo);
 *    this is an ESTIMATE ONLY and each such state is flagged in the UI.
 *  • Child Tax Credit ($2,200/child under 17) & Credit for Other Dependents
 *    ($500), with the 5%-of-AGI phase-out above $200k ($400k joint) — One Big
 *    Beautiful Bill Act as summarized by the IRS Child Tax Credit page
 *    (https://www.irs.gov/credits-deductions/individuals/child-tax-credit) and
 *    the Tax Policy Center (https://taxpolicycenter.org/briefing-book/what-child-tax-credit).
 *    Modeled here as NON-refundable only (no ACTM refundable portion).
 *
 * Simplifications (must stay documented in the calculator UI):
 *  – Standard deduction only (no itemizing; the only credits modeled are the
 *    child / other-dependent credits — no EITC, education, or care credits).
 *  – No local/city income taxes. No SDI/SUI employee taxes.
 *  – State tax = flat/approximated rate on (gross − pre-tax deductions);
 *    state-specific deductions/exemptions and state-level dependent credits are ignored.
 */
export const TAX_YEAR = 2026

export type FilingStatus = 'single' | 'marriedJoint' | 'headOfHousehold'

// Marginal brackets: [lower bound of bracket, rate]. Applied progressively (§4.2).
// Upper bound of bracket i is (lower bound of bracket i+1); last bracket is unbounded.
export const FEDERAL_BRACKETS: Record<FilingStatus, Array<[number, number]>> = {
  single: [
    [0, 0.10], [12_400, 0.12], [50_400, 0.22], [105_700, 0.24],
    [201_775, 0.32], [256_225, 0.35], [640_600, 0.37],
  ],
  marriedJoint: [
    [0, 0.10], [24_800, 0.12], [100_800, 0.22], [211_400, 0.24],
    [403_550, 0.32], [512_450, 0.35], [768_700, 0.37],
  ],
  headOfHousehold: [
    [0, 0.10], [17_700, 0.12], [67_450, 0.22], [105_700, 0.24],
    [201_775, 0.32], [256_200, 0.35], [640_600, 0.37],
  ],
}

export const STANDARD_DEDUCTION: Record<FilingStatus, number> = {
  single: 16_100,
  marriedJoint: 32_200,
  headOfHousehold: 24_150,
}

export const FICA = {
  socialSecurityRate: 0.062,
  socialSecurityWageBase: 184_500,
  medicareRate: 0.0145,
  additionalMedicareRate: 0.009,
  additionalMedicareThreshold: {
    single: 200_000, marriedJoint: 250_000, headOfHousehold: 200_000,
  } as Record<FilingStatus, number>,
}

export const LIMIT_401K = 24_500

// Dependent tax credits (One Big Beautiful Bill Act, tax year 2026).
export const CHILD_TAX_CREDIT = 2_200      // per qualifying child under 17 (non-refundable portion)
export const OTHER_DEPENDENT_CREDIT = 500  // per other dependent (permanent, non-refundable)
// Credits phase out by 5% of AGI (i.e. $50 per $1,000, rounded up) above these thresholds.
export const DEPENDENT_PHASEOUT_THRESHOLD: Record<FilingStatus, number> = {
  single: 200_000, marriedJoint: 400_000, headOfHousehold: 200_000,
}

export type StateTaxTier = 'none' | 'flat' | 'approx'
export interface StateTaxInfo { name: string; tier: StateTaxTier; rate: number }

// rate is the marginal/flat rate as a decimal; 0 for tier 'none'.
// For tier 'approx' (graduated states), rate is a single representative rate at
// ~$50–80k single taxable income — NOT the state's top marginal rate — and each
// such state is flagged as a simplified estimate in the UI.
export const STATE_TAX: Record<string, StateTaxInfo> = {
  // ── No wage income tax (9) ────────────────────────────────────────────────
  AK: { name: 'Alaska', tier: 'none', rate: 0 },
  FL: { name: 'Florida', tier: 'none', rate: 0 },
  NV: { name: 'Nevada', tier: 'none', rate: 0 },
  NH: { name: 'New Hampshire', tier: 'none', rate: 0 },
  SD: { name: 'South Dakota', tier: 'none', rate: 0 },
  TN: { name: 'Tennessee', tier: 'none', rate: 0 },
  TX: { name: 'Texas', tier: 'none', rate: 0 },
  WA: { name: 'Washington', tier: 'none', rate: 0 },
  WY: { name: 'Wyoming', tier: 'none', rate: 0 },

  // ── Single-rate (flat) states (15) — exact 2026 statutory rates ───────────
  AZ: { name: 'Arizona', tier: 'flat', rate: 0.025 },
  CO: { name: 'Colorado', tier: 'flat', rate: 0.044 },
  GA: { name: 'Georgia', tier: 'flat', rate: 0.0519 },
  ID: { name: 'Idaho', tier: 'flat', rate: 0.053 },
  IL: { name: 'Illinois', tier: 'flat', rate: 0.0495 },
  IN: { name: 'Indiana', tier: 'flat', rate: 0.0295 },
  IA: { name: 'Iowa', tier: 'flat', rate: 0.038 },
  KY: { name: 'Kentucky', tier: 'flat', rate: 0.035 },
  LA: { name: 'Louisiana', tier: 'flat', rate: 0.03 },
  MI: { name: 'Michigan', tier: 'flat', rate: 0.0425 },
  MS: { name: 'Mississippi', tier: 'flat', rate: 0.04 },
  NC: { name: 'North Carolina', tier: 'flat', rate: 0.0399 },
  OH: { name: 'Ohio', tier: 'flat', rate: 0.0275 },
  PA: { name: 'Pennsylvania', tier: 'flat', rate: 0.0307 },
  UT: { name: 'Utah', tier: 'flat', rate: 0.045 },

  // ── Graduated states approximated by a representative rate (26 + DC) ──────
  AL: { name: 'Alabama', tier: 'approx', rate: 0.05 },
  AR: { name: 'Arkansas', tier: 'approx', rate: 0.039 },
  CA: { name: 'California', tier: 'approx', rate: 0.08 },
  CT: { name: 'Connecticut', tier: 'approx', rate: 0.055 },
  DE: { name: 'Delaware', tier: 'approx', rate: 0.0555 },
  HI: { name: 'Hawaii', tier: 'approx', rate: 0.079 },
  KS: { name: 'Kansas', tier: 'approx', rate: 0.0558 },
  ME: { name: 'Maine', tier: 'approx', rate: 0.0675 },
  MD: { name: 'Maryland', tier: 'approx', rate: 0.0475 },
  MA: { name: 'Massachusetts', tier: 'approx', rate: 0.05 },
  MN: { name: 'Minnesota', tier: 'approx', rate: 0.068 },
  MO: { name: 'Missouri', tier: 'approx', rate: 0.047 },
  MT: { name: 'Montana', tier: 'approx', rate: 0.0565 },
  NE: { name: 'Nebraska', tier: 'approx', rate: 0.0455 },
  NJ: { name: 'New Jersey', tier: 'approx', rate: 0.055 },
  NM: { name: 'New Mexico', tier: 'approx', rate: 0.047 },
  NY: { name: 'New York', tier: 'approx', rate: 0.055 },
  ND: { name: 'North Dakota', tier: 'approx', rate: 0.0195 },
  OK: { name: 'Oklahoma', tier: 'approx', rate: 0.0425 },
  OR: { name: 'Oregon', tier: 'approx', rate: 0.0875 },
  RI: { name: 'Rhode Island', tier: 'approx', rate: 0.0475 },
  SC: { name: 'South Carolina', tier: 'approx', rate: 0.062 },
  VT: { name: 'Vermont', tier: 'approx', rate: 0.066 },
  VA: { name: 'Virginia', tier: 'approx', rate: 0.0575 },
  WV: { name: 'West Virginia', tier: 'approx', rate: 0.0482 },
  WI: { name: 'Wisconsin', tier: 'approx', rate: 0.053 },
  DC: { name: 'District of Columbia', tier: 'approx', rate: 0.065 },
}

/** Progressive federal tax on `taxableIncome` (already net of deductions; clamp ≥ 0 upstream). */
export function federalIncomeTax(taxableIncome: number, status: FilingStatus): number {
  if (taxableIncome <= 0) return 0
  const brackets = FEDERAL_BRACKETS[status]
  let tax = 0
  for (let i = 0; i < brackets.length; i++) {
    const [lower, rate] = brackets[i]
    if (taxableIncome <= lower) break
    const upper = i + 1 < brackets.length ? brackets[i + 1][0] : Infinity
    const taxableInBracket = Math.min(taxableIncome, upper) - lower
    tax += rate * taxableInBracket
  }
  return tax
}

/** Social Security employee tax: 6.2% of min(ficaWages, wage base). */
export function socialSecurityTax(ficaWages: number): number {
  if (ficaWages <= 0) return 0
  return FICA.socialSecurityRate * Math.min(ficaWages, FICA.socialSecurityWageBase)
}

/** Medicare 1.45% of all ficaWages + 0.9% of the amount above the status threshold. */
export function medicareTax(ficaWages: number, status: FilingStatus): number {
  if (ficaWages <= 0) return 0
  const base = FICA.medicareRate * ficaWages
  const over = Math.max(0, ficaWages - FICA.additionalMedicareThreshold[status])
  return base + FICA.additionalMedicareRate * over
}

/** State tax under the tier model: rate × max(0, stateTaxableIncome). */
export function stateIncomeTax(stateTaxableIncome: number, stateCode: string): number {
  if (stateTaxableIncome <= 0) return 0
  const info = STATE_TAX[stateCode]
  if (!info) return 0
  return info.rate * stateTaxableIncome
}

/**
 * Non-refundable dependent credits: $2,200 per child under 17 + $500 per other
 * dependent, reduced by 5% of AGI (rounded up per $1,000) above the phase-out
 * threshold, floored at 0. `agi` is approximated by gross annual income here.
 */
export function dependentTaxCredits(
  childrenUnder17: number,
  otherDependents: number,
  status: FilingStatus,
  agi: number,
): number {
  const children = Math.max(0, Math.floor(childrenUnder17))
  const others = Math.max(0, Math.floor(otherDependents))
  const gross = children * CHILD_TAX_CREDIT + others * OTHER_DEPENDENT_CREDIT
  if (gross <= 0) return 0
  const over = Math.max(0, agi - DEPENDENT_PHASEOUT_THRESHOLD[status])
  const reduction = Math.ceil(over / 1_000) * 50
  return Math.max(0, gross - reduction)
}

/** The marginal bracket rate (as a decimal) applied to the top dollar of taxableIncome. */
export function marginalRate(taxableIncome: number, status: FilingStatus): number {
  const brackets = FEDERAL_BRACKETS[status]
  let rate = brackets[0][1]
  for (const [lower, r] of brackets) {
    if (taxableIncome > lower) rate = r
    else break
  }
  return rate
}
