# Paycheck Estimator — Implementation Specification

**Status:** Ready to build. **Deliverable of this spec:** none of the code below exists yet; an implementer (human or model) builds it exactly as specified.
**Date:** 2026-07-02 (all tax figures are **tax year 2026**).
**Audience for the feature:** university students planning for their first job.
**Audience for this document:** an implementing agent that will not infer missing steps — everything is explicit.

---

## 0. What we're building, in one paragraph

A new calculator tab, **"Paycheck"**, that takes a gross salary (or hourly rate) and estimates **take-home pay** after federal income tax, Social Security, Medicare, a selected state's income tax, and optional pre-tax deductions (401(k) %, health premiums), plus optional extra withholding. It shows the results per pay period and annualized, an effective-tax-rate figure, a recharts breakdown of where every dollar goes, a monthly budget snapshot, and a "Key Lesson" explaining why the first paycheck is smaller than salary ÷ 12. It follows every existing convention in this repo: `NumericOrEmpty` inputs, validate-first flow, `CalculateButton`, `useLocalStorage`, shared formatters, no new dependencies.

---

## 1. Reference-implementation comparison

Two existing calculators were evaluated (fetched 2026-07-02):

| Aspect | [digitalcalculators.net/paycheck-calculator](https://digitalcalculators.net/paycheck-calculator/) | [easybudgetplanners.com/paycheck-calculator](https://easybudgetplanners.com/paycheck-calculator) |
|---|---|---|
| Income entry | Salary, hourly (rate × hrs/wk × 52), or raw gross-per-check | Salary or hourly, plus overtime hours at 1.5×/2.0× |
| Filing statuses | Single, MFJ, MFS, HoH | Single, MFJ, HoH |
| State handling | Rate-method picker (midpoint/low/high/custom) or "no state tax" | Full 50-state + DC selector |
| Pre-tax | Per-paycheck dollar amount (401k/HSA/insurance lumped) | Itemized: health/dental/vision, HSA, FSA, 401(k) % with limit warning |
| After-tax | Local tax %, additional deductions | Roth 401(k), loans, garnishments, union dues |
| Extras | YTD wages input (respects SS cap mid-year), worked example, scenario testing | Dependent tax credits, tooltips, FAQ, effective-vs-marginal explainer |
| Cited sources | IRS IR-2025-103, Rev. Proc. 2025-32 PDF, SSA wage-base page, SSA 2026 COLA fact sheet, IRS Topic 560 | States 2026 brackets and limits inline, fewer explicit citations |
| Disclaimers | Strong: "results are approximations… W-4 settings, credits, local rules" | Strong: "educational purposes only… not tax advice" |

**Cautionary note:** easybudgetplanners displayed a **stale 401(k) limit ($23,500 — the 2025 figure)** at fetch time; the correct 2026 elective-deferral limit is **$24,500** ([IRS newsroom](https://www.irs.gov/newsroom/401k-limit-increases-to-24500-for-2026-ira-limit-increases-to-7500), [Notice 2025-67](https://www.irs.gov/pub/irs-drop/n-25-67.pdf)). This is exactly why our data file must carry dated citations (§3).

**Adopt for our student audience:**
- Salary **and** hourly entry with pay-frequency selector (both sites; core need for first-job planning).
- Filing status limited to **Single, Married Filing Jointly, Head of Household** (easybudgetplanners' set — MFS is rare for students and adds a bracket table for little value).
- Full 50-state + DC `Select` (easybudgetplanners) but with our simplified three-tier rate model (§3.3) rather than per-state brackets.
- 401(k) as a **percent of gross** with the $24,500 limit warning (easybudgetplanners).
- Effective-vs-marginal rate explainer — perfect "Key Lesson" material.
- Strong dated citations in the data file (digitalcalculators' habit).

**Skip (scope creep for v1):**
- Overtime multipliers, YTD wages/mid-year SS-cap proration, after-tax deductions (Roth, garnishments), dependent tax credits, local tax %, itemized-deduction entry, MFS status. Each is listed in §8 as a possible v2 item. Rationale: a student modeling a first job has a single full-year salary; the marginal educational value of these inputs is low and each one doubles the explanation burden.

---

## 2. Feature scope & UX

### 2.1 Registry metadata

| Property | Value |
|---|---|
| `id` | `'paycheck'` |
| `labels.short` | `'Paycheck'` |
| `labels.full` | `'Paycheck Estimator'` |
| `icon` | `Wallet` from `@phosphor-icons/react` (confirmed to exist in the installed icon set; fallback if ever missing: `Money`) |
| Tab position | **Second**, immediately after `'retirement'` — "what will my job actually pay me" is the most immediately relatable question for the audience |
| Component | `PaycheckCalculator` in `src/components/PaycheckCalculator.tsx` |
| localStorage key | `'paycheck-calculator'` |

### 2.2 Inputs

State shape (persisted via `useLocalStorage<PaycheckData>('paycheck-calculator', DEFAULTS)`):

```ts
type PayMode = 'salary' | 'hourly'
type PayFrequency = 'annual' | 'monthly' | 'semimonthly' | 'biweekly' | 'weekly'
type FilingStatus = 'single' | 'marriedJoint' | 'headOfHousehold'

interface PaycheckData {
  payMode: PayMode                    // Select: "Annual salary" | "Hourly wage"
  annualSalary: NumericOrEmpty        // shown when payMode === 'salary'; text input w/ commas
  hourlyRate: NumericOrEmpty          // shown when payMode === 'hourly'; number input, step 0.25
  hoursPerWeek: NumericOrEmpty        // shown when payMode === 'hourly'; number input, default 40
  payFrequency: PayFrequency          // Select — controls the per-period OUTPUT display
  filingStatus: FilingStatus          // Select
  stateCode: string                   // Select, 50 states + 'DC'; default 'TN'
  retirement401kPercent: NumericOrEmpty  // % of gross, number input, default 5
  healthPremiumMonthly: NumericOrEmpty   // $/month pre-tax (Section 125), commas input, default 0
  additionalWithholding: NumericOrEmpty  // $/paycheck extra federal withholding, default 0
}

const DEFAULTS: PaycheckData = {
  payMode: 'salary', annualSalary: 55000, hourlyRate: 20, hoursPerWeek: 40,
  payFrequency: 'biweekly', filingStatus: 'single', stateCode: 'TN',
  retirement401kPercent: 5, healthPremiumMonthly: 0, additionalWithholding: 0,
}
```

Default state is **TN** (the app's home institution is in Tennessee, a no-income-tax state — itself a teaching moment the Key Lesson can reference).

Input conventions (copy the patterns from `CompoundInterestCalculator.tsx:188-265` exactly):
- Currency-like fields (`annualSalary`, `healthPremiumMonthly`, `additionalWithholding`): `type="text"`, `value={formatNumberWithCommas(...)}`, `onChange` through `parseFormattedNumber`.
- Percent/small-number fields (`hourlyRate`, `hoursPerWeek`, `retirement401kPercent`): `type="number"` with the `''`-preserving onChange (`e.target.value === '' ? '' : Number(e.target.value)`), `%`/unit suffix via the absolute-positioned span pattern where applicable.
- All `Select`s use `@/components/ui/select`; every input gets a `Label htmlFor` pairing.
- The grid: `grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4`. Show/hide the salary vs hourly fields by conditional render on `payMode` (same technique as `CreditCardCalculator`'s `paymentType` conditional fields).

### 2.3 Validation (validate-first, early return — the repo pattern)

Run in this order; set the first failing message into the `error` state and return:

1. `payMode === 'salary'`: `annualSalary` must be a valid number `> 0` and `≤ 10,000,000` ("Please enter an annual salary between $1 and $10,000,000").
2. `payMode === 'hourly'`: `hourlyRate` valid `> 0` and `≤ 5,000`; `hoursPerWeek` valid `> 0` and `≤ 100`.
3. `retirement401kPercent`: empty is allowed (treat as 0 via `toNumber`); if present, must be `≥ 0` and `≤ 100`.
4. `healthPremiumMonthly`, `additionalWithholding`: empty allowed (→ 0); if present `≥ 0`.
5. Cross-field: total annual pre-tax deductions must be `< gross` ("Pre-tax deductions can't exceed your gross pay").
6. Warning (non-blocking — render as a second, non-destructive `Alert` below results, do **not** abort): if `401(k) annual dollars > 24500`, show "Heads up: your 401(k) contribution exceeds the 2026 IRS limit of $24,500 — payroll would stop it there. We've capped it in this estimate." **and cap the value at $24,500 in the math.**

### 2.4 Outputs (results cards)

Two result cards side by side (`grid grid-cols-1 md:grid-cols-2 gap-6`), values from a `results` state object set by `calculate()`:

**Card 1 — "Your Paycheck" (per selected pay period, using `formatCurrency(x, true)` i.e. cents):**
| Row | Value |
|---|---|
| Gross pay | `grossAnnual / periodsPerYear` |
| 401(k) contribution | pre-tax, shown as a positive deduction |
| Health premium | pre-tax |
| Federal income tax | |
| Social Security (6.2%) | |
| Medicare (1.45%+) | |
| State income tax ({state name}) | show "$0 — {state} has no income tax 🎉" when tier is `none` |
| Additional withholding | only render the row if > 0 |
| **Net take-home** | bold, `currency-green` class like siblings |

**Card 2 — "The Big Picture" (annualized, whole dollars):**
| Row | Value |
|---|---|
| Gross annual income | |
| Total taxes | federal + SS + Medicare + state |
| Total pre-tax savings/benefits | 401(k) + premiums |
| Net annual take-home | |
| **Effective tax rate** | `totalTaxes / grossAnnual`, one decimal, e.g. "16.0%" |
| Monthly take-home | `netAnnual / 12` — bridges to the budget snapshot |

**Monthly budget snapshot** (third card, full width, below the chart): apply the 50/30/20 rule to monthly take-home: Needs `× 0.50`, Wants `× 0.30`, Savings & debt `× 0.20`, each as a labeled row with `formatCurrency`. One sentence of framing: "A common starting rule of thumb — adjust to your life."

### 2.5 Chart

A donut breakdown of annual gross using recharts `PieChart` (already in the bundle; `MortgageCalculator` does not use Pie but recharts exports it — no new dependency):

- Slices: Net take-home, Federal tax, Social Security, Medicare, State tax (omit when 0), 401(k), Health premiums (omit when 0), Additional withholding (omit when 0).
- Colors from `CHART_COLORS` in `@/lib/chart-colors` (net = `emerald`, taxes = `blue`/`orange`/`red` family, pre-tax = `violet` — implementer picks from the existing palette constants only; open that file and use what exists).
- Tooltip: `formatter={(v: number, name: string) => [formatCurrency(v), name]}`.
- Wrapper: `<div className="h-60 sm:h-80 w-full" role="img" aria-label={...}>` with a computed label like "Paycheck breakdown: {formatCurrency(netAnnual)} take-home from {formatCurrency(grossAnnual)} gross".
- Layout position: chart card sits in the same `md:grid-cols-5` split used by `CompoundInterestCalculator.tsx:278-346` (results 2 cols, chart 3 cols) — reuse that structure verbatim, with the "Big Picture" card stacked under "Your Paycheck".

### 2.6 Hero banner and Key Lesson

Hero banner: copy the exact structure of `CompoundInterestCalculator.tsx:165-185` (gradient div + dot pattern + icon chip + title/subtitle). Suggested copy:
- Title: `Your Salary ≠ Your Paycheck 💰`
- Subtitle: `That $55,000 offer letter doesn't mean $4,583 a month in your pocket. See where every dollar actually goes — before your first payday surprises you.`
- Gradient: `linear-gradient(135deg, oklch(0.42 0.14 160), oklch(0.22 0.09 160))` (green family — money; distinct from siblings' blue/orange).
- Icon: `Wallet` size 24 weight fill.

Key Lesson card (copy structure from `CompoundInterestCalculator.tsx:349-364`): title `💡 Key Lesson`, body explaining: (1) gross vs net, (2) FICA is 7.65% off the top for almost everyone and funds Social Security/Medicare, (3) marginal vs effective rate — "landing in the 22% bracket" does not mean paying 22% on everything, (4) pre-tax 401(k) dollars lower your tax bill today, so the take-home cost of saving $100 is less than $100.

**Disclaimer block (required, non-negotiable):** a muted paragraph directly under the results, plus one line in the Key Lesson card:
> *Estimates for education only. Actual withholding depends on your W-4, tax credits, local/city taxes, benefit plan details, and state rules we simplify here (see the note next to your state). Not tax advice.*

---

## 3. Data model — `src/lib/paycheck-tax-tables.ts`

New file mirroring the documentation pattern of `src/lib/insurance-rates.ts` (header comment with dated sources, then typed exported tables, then small pure lookup functions).

### 3.1 File header (copy-paste ready — implementer keeps citations verbatim)

```ts
/**
 * 2026 U.S. payroll-tax tables for the Paycheck Estimator (educational).
 *
 * Everything here is TAX YEAR 2026. When updating for a new year, change the
 * numbers AND the source list AND the TAX_YEAR constant together.
 *
 * SOURCES:
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
 *    (https://taxfoundation.org/data/all/state/state-income-tax-rates-2026/).
 *    Progressive states are approximated by a single flat rate (see StateTaxInfo);
 *    this is an ESTIMATE ONLY and each such state is flagged in the UI.
 *
 * Simplifications (must stay documented in the calculator UI):
 *  – Standard deduction only (no itemizing, no credits, no dependents).
 *  – No local/city income taxes. No SDI/SUI employee taxes.
 *  – State tax = flat/approximated rate on (gross − pre-tax deductions);
 *    state-specific deductions/exemptions are ignored.
 */
export const TAX_YEAR = 2026
```

### 3.2 Federal tables (numbers verified 2026-07-02; one flagged discrepancy)

```ts
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
    [403_550, 0.32], [512_450, 0.35], [768_700, 0.37],  // TODO(verify): IRS newsroom says $768,600, Tax Foundation says $768,700 — confirm against Rev. Proc. 2025-32 §2.01 table 3 and fix if needed
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
```

**Additional Medicare tax is IN SCOPE.** Decision and rationale: it costs ~4 lines of math, the threshold teaches "taxes have cliffs and caps", and without it a $250k test case is silently wrong. (Employers withhold the extra 0.9% above $200k regardless of filing status, but for an annual *estimate* we use the filing-status liability thresholds above — simpler to explain and matches year-end truth better.)

### 3.3 State model — decision and table

**Decision: all 50 states + DC via a three-tier flat-rate model.**

- Tier `none` (9 states): AK, FL, NV, NH, SD, TN, TX, WA, WY — $0 state income tax on wages (NH finished repealing its interest/dividends tax in 2025; WA taxes only capital gains, not wages).
- Tier `flat` (15 states in 2026): the state's actual statutory flat rate — exact, not approximated.
- Tier `approx` (remaining 26 states + DC, all graduated): a **single representative flat rate** chosen as the rate that applies at ~$50-80k taxable income for a single filer in that state (i.e., the bracket a typical graduate's salary lands in), NOT the top rate. Each `approx` state renders an inline note: *"{State} uses graduated brackets — this is a simplified estimate."*

**Why not full 50-state bracket tables:** ~27 sets of brackets × annual maintenance × state-specific deductions/exemptions that we would *still* be ignoring = large surface area for stale-data bugs (see the $23,500 error on a dedicated paycheck site, §1) with little educational gain for this audience. **Why not "pick your own rate":** students don't know their state's rate — that's the point of the tool.

```ts
export type StateTaxTier = 'none' | 'flat' | 'approx'
export interface StateTaxInfo { name: string; tier: StateTaxTier; rate: number }

// rate is the marginal/flat rate as a decimal; 0 for tier 'none'.
export const STATE_TAX: Record<string, StateTaxInfo> = {
  AK: { name: 'Alaska', tier: 'none', rate: 0 },
  FL: { name: 'Florida', tier: 'none', rate: 0 },
  NV: { name: 'Nevada', tier: 'none', rate: 0 },
  NH: { name: 'New Hampshire', tier: 'none', rate: 0 },
  SD: { name: 'South Dakota', tier: 'none', rate: 0 },
  TN: { name: 'Tennessee', tier: 'none', rate: 0 },
  TX: { name: 'Texas', tier: 'none', rate: 0 },
  WA: { name: 'Washington', tier: 'none', rate: 0 },
  WY: { name: 'Wyoming', tier: 'none', rate: 0 },
  // Flat-tax states — verified 2026 examples; implementer completes the set (15 total)
  // from https://taxfoundation.org/data/all/state/state-income-tax-rates-2026/ :
  KY: { name: 'Kentucky', tier: 'flat', rate: 0.035 },   // reduced from 4.0% for 2026
  NC: { name: 'North Carolina', tier: 'flat', rate: 0.0399 }, // reduced from 4.25% 1/1/2026
  MS: { name: 'Mississippi', tier: 'flat', rate: 0.040 }, // phase-down completed
  OH: { name: 'Ohio', tier: 'flat', rate: 0.0275 },       // flat as of 1/1/2026 (income > $26,050)
  // TODO(data): remaining flat states (AZ, CO, GA, IA, ID, IL, IN, LA, MI, PA, UT, …
  //   — confirm the exact 2026 list & rates from the Tax Foundation source above)
  // TODO(data): all graduated states as tier 'approx' with the representative rate
  //   at ~$50–80k single taxable income, from the same source. Examples of the
  //   expected shape (rates MUST be verified before shipping):
  //   CA: { name: 'California', tier: 'approx', rate: 0.08 },
  //   NY: { name: 'New York', tier: 'approx', rate: 0.055 },
  //   VA: { name: 'Virginia', tier: 'approx', rate: 0.0575 },
}
```

> **Definition of done for this table:** every US state + DC present (51 entries), zero `TODO(data)` markers remaining, every `flat` rate cross-checked against the Tax Foundation 2026 page (linked in the header) on the day of implementation, and the file's header source list updated with the access date.

### 3.4 Exported pure functions (unit-testable by hand)

```ts
/** Progressive federal tax on `taxableIncome` (already net of deductions; clamp ≥ 0 upstream). */
export function federalIncomeTax(taxableIncome: number, status: FilingStatus): number

/** Social Security employee tax: 6.2% of min(ficaWages, wage base). */
export function socialSecurityTax(ficaWages: number): number

/** Medicare 1.45% of all ficaWages + 0.9% of the amount above the status threshold. */
export function medicareTax(ficaWages: number, status: FilingStatus): number

/** State tax under the tier model: rate × max(0, stateTaxableIncome). */
export function stateIncomeTax(stateTaxableIncome: number, stateCode: string): number
```

No React imports in this file. All functions must return `0` for inputs `≤ 0` (never negative, never NaN).

---

## 4. Math specification

### 4.1 Gross and pre-tax pipeline (exact order — this ordering IS the spec)

```
grossAnnual   = payMode === 'salary' ? annualSalary
                                     : hourlyRate × hoursPerWeek × 52
k401Annual    = min(grossAnnual × retirement401kPercent/100, LIMIT_401K)   // capped, see §2.3(6)
premiumAnnual = healthPremiumMonthly × 12
preTaxAnnual  = k401Annual + premiumAnnual

// FICA: Section 125 health premiums are FICA-exempt; traditional 401(k) is NOT.
ficaWages     = grossAnnual − premiumAnnual

// Federal: both 401(k) and premiums reduce taxable income, then the standard deduction.
fedTaxable    = max(0, grossAnnual − preTaxAnnual − STANDARD_DEDUCTION[status])

// State (simplified model): pre-tax deductions reduce it; no state standard deduction.
stateTaxable  = max(0, grossAnnual − preTaxAnnual)
```

### 4.2 Taxes

```
federalTax = Σ over brackets i:  rateᵢ × ( min(fedTaxable, upperᵢ) − lowerᵢ )  for fedTaxable > lowerᵢ
socialSec  = 0.062 × min(ficaWages, 184_500)
medicare   = 0.0145 × ficaWages + 0.009 × max(0, ficaWages − threshold[status])
stateTax   = STATE_TAX[stateCode].rate × stateTaxable
totalTax   = federalTax + socialSec + medicare + stateTax
```

### 4.3 Net and per-period

```
periodsPerYear = { annual: 1, monthly: 12, semimonthly: 24, biweekly: 26, weekly: 52 }[payFrequency]
netAnnual        = grossAnnual − preTaxAnnual − totalTax
withholdAnnual   = additionalWithholding × periodsPerYear
netPerPeriodCash = (netAnnual − withholdAnnual) / periodsPerYear   // what hits the bank account
effectiveRate    = totalTax / grossAnnual                           // grossAnnual > 0 guaranteed by validation
monthlyTakeHome  = netAnnual / 12                                   // budget snapshot uses this (pre-extra-withholding)
```

Additional withholding is **not a tax** — the UI must label it "extra federal withholding (you get this back at refund time if overpaid)" and it must NOT be included in `totalTax` or `effectiveRate`.

### 4.4 Worked examples → acceptance assertions

The implementer must reproduce these **by hand from the formulas** before writing UI. Tolerance: ±$1 on annual figures, ±$0.05 on per-period (floating-point + rounding display only — do not round intermediates).

**Example A — baseline salary, no-tax state.** $60,000 salary, Single, TN, 0% 401(k), $0 premium, biweekly.
- fedTaxable = 60,000 − 16,100 = **43,900**
- federalTax = 0.10×12,400 + 0.12×(43,900−12,400) = 1,240 + 3,780 = **$5,020**
- socialSec = 0.062×60,000 = **$3,720**; medicare = 0.0145×60,000 = **$870**; stateTax = **$0**
- netAnnual = 60,000 − 9,610 = **$50,390**; effectiveRate = 9,610/60,000 = **16.0%**
- biweekly net = 50,390/26 = **$1,938.08**; monthly take-home = **$4,199.17**

**Example B — pre-tax deductions, flat-tax state.** $85,000 salary, Single, KY (flat 3.5%), 5% 401(k), $200/mo premium, monthly.
- k401 = 4,250; premium = 2,400; preTax = 6,650
- ficaWages = 85,000 − 2,400 = **82,600**; fedTaxable = 85,000 − 6,650 − 16,100 = **62,250**
- federalTax = 1,240 + 0.12×(50,400−12,400) + 0.22×(62,250−50,400) = 1,240 + 4,560 + 2,607 = **$8,407**
- socialSec = 0.062×82,600 = **$5,121.20**; medicare = 0.0145×82,600 = **$1,197.70**
- stateTaxable = 78,350; stateTax = 0.035×78,350 = **$2,742.25**
- totalTax = **$17,468.15**; netAnnual = 85,000 − 6,650 − 17,468.15 = **$60,881.85**
- effectiveRate = 17,468.15/85,000 = **20.6%**; monthly net = **$5,073.49**

**Example C — above the Social Security cap + Additional Medicare.** $250,000 salary, Single, TX, no pre-tax, annual view.
- fedTaxable = 233,900
- federalTax = 1,240 + 4,560 + 0.22×55,300 + 0.24×(201,775−105,700) + 0.32×(233,900−201,775)
  = 1,240 + 4,560 + 12,166 + 23,058 + 10,280 = **$51,304**
- socialSec = 0.062×**184,500** = **$11,439** (capped — NOT 0.062×250,000)
- medicare = 0.0145×250,000 + 0.009×(250,000−200,000) = 3,625 + 450 = **$4,075**
- netAnnual = 250,000 − 66,818 = **$183,182**; effectiveRate = **26.7%**

**Example D — hourly.** $20/hr, 40 hrs/week, Single, TN, no pre-tax, weekly view.
- grossAnnual = 20×40×52 = **$41,600**; fedTaxable = 25,500
- federalTax = 1,240 + 0.12×13,100 = **$2,812**; SS = **$2,579.20**; Medicare = **$603.20**
- netAnnual = **$35,605.60**; weekly net = 35,605.60/52 = **$684.72**; effectiveRate = **14.4%**

**Example E — edge cases (behavioral assertions):**
- Salary blank → error `Alert`, no results change.
- Salary $10,000, Single (below standard deduction): federalTax = **$0** (fedTaxable clamps to 0), SS = $620, Medicare = $145 — FICA still applies. This IS the lesson that FICA has no standard deduction.
- 401(k) 50% on $60,000 = $30,000 > $24,500 → capped at $24,500 + the non-blocking warning renders.
- Premiums $6,000/mo on $60,000 salary (72,000 > 60,000) → blocking error from validation rule 5.

---

## 5. Integration steps (exact, ordered)

Execute in order; each step compiles independently.

**Step 1 — data file.** Create `src/lib/paycheck-tax-tables.ts` per §3 (header, tables, four functions). Resolve every `TODO(data)` and the `TODO(verify)` bracket check. Run `npm run typecheck`.

**Step 2 — component.** Create `src/components/PaycheckCalculator.tsx`:
- Named export `export function PaycheckCalculator()` (all siblings use named exports — see `App.tsx:22-30` import style).
- Imports (all existing modules, **no new dependencies**):
  `useState` from react; `useLocalStorage` from `@/hooks/useLocalStorage`; `Card, CardContent, CardHeader, CardTitle` from `@/components/ui/card`; `Input` from `@/components/ui/input`; `Label` from `@/components/ui/label`; `Select, SelectContent, SelectItem, SelectTrigger, SelectValue` from `@/components/ui/select`; `Alert, AlertDescription` from `@/components/ui/alert`; `CalculateButton` from `@/components/ui/calculate-button`; `NumericOrEmpty, isValidNumber, toNumber` from `@/lib/calculator-validation`; `formatCurrency, formatNumberWithCommas, parseFormattedNumber` from `@/lib/formatters`; `CHART_COLORS` from `@/lib/chart-colors`; `PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend` from `recharts`; `Wallet` from `@phosphor-icons/react`; everything needed from `@/lib/paycheck-tax-tables`.
- Structure top-to-bottom: hero banner → input grid → `CalculateButton` + error `Alert` → results grid (cards + donut) → 401(k)-cap warning `Alert` (non-destructive variant) when applicable → monthly budget snapshot card → disclaimer paragraph → Key Lesson card. Sections 2.2–2.6 define each.
- Results live in `useState` (not persisted); inputs in `useLocalStorage` under key `'paycheck-calculator'`.

**Step 3 — registration.** In `src/App.tsx`:
1. Add to the static import block (after line 22, keeping the existing comment about why imports are static — do NOT convert anything to `React.lazy`):
   ```ts
   import { PaycheckCalculator } from '@/components/PaycheckCalculator'
   ```
2. Add `Wallet` to the existing `@phosphor-icons/react` import list (lines 4-15).
3. Insert into the `calculators` array (line 42+) **as the second element**, directly after the `retirement` entry:
   ```ts
   { id: 'paycheck', labels: { short: 'Paycheck', full: 'Paycheck Estimator' }, icon: Wallet, component: PaycheckCalculator },
   ```
   No other `App.tsx` changes: the generic `TabsContent` mapping (lines 192-218) renders any registered calculator automatically.

**Step 4 — verify** per §6. No changes to `vite.config.ts`, `index.html`, the PWA manifest, or routing are needed or permitted — the tab system is purely client-state and works under the `/FREEDomCalculator/` base as-is.

---

## 6. Acceptance criteria & verification

There is no test runner (confirmed: no `test` script in `package.json`) — verification is typecheck + build + manual assertions.

1. `npm run typecheck` passes (strict TS; **zero** `as any`, zero non-null `!` assertions in the new files).
2. `npm run build` succeeds; bundle warning may appear (pre-existing, see docs/CODE-REVIEW.md PERF-1) but no **new** errors.
3. `npm run dev` → Paycheck tab appears **second**, icon renders, tab switch works, no console errors.
4. Enter each worked example A–D from §4.4 and confirm every asserted number (±$1 annual / ±$0.05 per-period).
5. Example E behaviors: blank-input error, $10k FICA-only case, 401(k) cap warning, premium-exceeds-gross error.
6. Persistence: set salary to $75,000, switch state to CA, reload the page → both values retained (localStorage key `paycheck-calculator`).
7. Frequency sanity: with fixed inputs, weekly net × 52 ≈ biweekly net × 26 ≈ monthly net × 12 (within cents).
8. Every `approx`-tier state shows its "simplified estimate" note; every `none`-tier state shows the $0 celebration row; disclaimer paragraph is visible without scrolling past the fold of the results.
9. `npm run preview` after build: tab works under the `/FREEDomCalculator/` base path (no absolute-path asset references were added).
10. Data integrity: `paycheck-tax-tables.ts` has 51 state entries, no remaining `TODO` markers, and the header's source URLs + access date are current.

---

## 7. Task breakdown for implementing agents

Independently assignable; B and C depend on A's exported types compiling (A can stub rates with TODOs for B/C to start, but §6.10 gates final done).

| Task | Scope | Inputs | Outputs | Done when |
|---|---|---|---|---|
| **A — Tax data + math library** | `src/lib/paycheck-tax-tables.ts` only | §3 in full; source URLs in §3.1; the `TODO(verify)` MFJ-37% check against [Rev. Proc. 2025-32](https://www.irs.gov/pub/irs-drop/rp-25-32.pdf) | The complete data file + 4 pure functions | Hand-evaluating the four functions reproduces every number in §4.4 A–D; §6.10 satisfied; `npm run typecheck` passes |
| **B — Component UI + compute wiring** | `src/components/PaycheckCalculator.tsx` (no chart/lesson yet) | §2.2–2.4, §4.1–4.3; Task A's module | Working inputs, validation, results cards, persistence | Examples A–E verified in the browser; §6.6 persistence check passes |
| **C — Chart, budget snapshot, hero, Key Lesson, disclaimers** | Same component file | §2.5–2.6 | Donut chart with aria-label, 50/30/20 card, hero banner, lesson card, disclaimer text | Visual parity with sibling calculators at mobile (375px) and desktop widths; §6.8 |
| **D — Registration + full verification** | `src/App.tsx` (3-line change) + running §6 | §5 step 3; §6 checklist | Registered second tab; a filled-in §6 checklist pasted into the PR description | All 10 items in §6 pass; `npm run build` output committed to PR notes |

**Ground rules for all tasks:** no new npm dependencies; no changes to any file not named in the task's Scope; preserve static imports in `App.tsx`; use `@/` imports; follow the `NumericOrEmpty`/validate-first/formatters conventions everywhere (they are demonstrated end-to-end in `src/components/CompoundInterestCalculator.tsx` — read it first).

---

## 8. Explicit non-goals (v1) — recorded so nobody "helpfully" adds them

Overtime pay, bonuses/supplemental-wage withholding, MFS filing status, dependents/child tax credit, itemized deductions, HSA/FSA, Roth 401(k), after-tax deductions, local/city taxes, state standard deductions & credits, YTD/mid-year proration, W-4 allowance modeling, multi-job coordination. Each is a candidate for a future iteration only after a real request.
