import { useState, type ReactNode } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { CalculateButton } from '@/components/ui/calculate-button'
import { NumericOrEmpty, isValidNumber, toNumber } from '@/lib/calculator-validation'
import { formatCurrency, formatNumberWithCommas, parseFormattedNumber } from '@/lib/formatters'
import { CHART_COLORS } from '@/lib/chart-colors'
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts'
import { Wallet, CurrencyDollar, PiggyBank, Users, Receipt, ShieldCheck, CaretDown } from '@phosphor-icons/react'
import {
  FilingStatus,
  STATE_TAX,
  STANDARD_DEDUCTION,
  LIMIT_401K,
  federalIncomeTax,
  socialSecurityTax,
  medicareTax,
  stateIncomeTax,
  dependentTaxCredits,
  marginalRate,
} from '@/lib/paycheck-tax-tables'

type PayMode = 'salary' | 'hourly'
type PayFrequency = 'annual' | 'monthly' | 'semimonthly' | 'biweekly' | 'weekly'

interface PaycheckData {
  // Income
  payMode: PayMode
  annualSalary: NumericOrEmpty
  hourlyRate: NumericOrEmpty
  hoursPerWeek: NumericOrEmpty
  weeksPerYear: NumericOrEmpty
  overtimeHoursPerWeek: NumericOrEmpty
  overtimeMultiplier: number
  payFrequency: PayFrequency
  filingStatus: FilingStatus
  stateCode: string
  // Pre-tax deductions
  retirement401kPercent: NumericOrEmpty
  healthPremiumMonthly: NumericOrEmpty
  dentalMonthly: NumericOrEmpty
  visionMonthly: NumericOrEmpty
  hsaMonthly: NumericOrEmpty
  fsaMonthly: NumericOrEmpty
  otherPreTaxMonthly: NumericOrEmpty
  // Dependents & adjustments
  childrenUnder17: NumericOrEmpty
  otherDependents: NumericOrEmpty
  extraFederalDeductions: NumericOrEmpty
  extraStateDeductions: NumericOrEmpty
  // After-tax deductions
  roth401kPercent: NumericOrEmpty
  otherAfterTaxMonthly: NumericOrEmpty
  additionalWithholding: NumericOrEmpty
}

const DEFAULTS: PaycheckData = {
  payMode: 'salary',
  annualSalary: 66000,
  hourlyRate: '',
  hoursPerWeek: '',
  weeksPerYear: 52,
  overtimeHoursPerWeek: 0,
  overtimeMultiplier: 1.5,
  payFrequency: 'monthly',
  filingStatus: 'single',
  stateCode: 'TN',
  retirement401kPercent: 10,
  healthPremiumMonthly: 0,
  dentalMonthly: 0,
  visionMonthly: 0,
  hsaMonthly: 0,
  fsaMonthly: 0,
  otherPreTaxMonthly: 0,
  childrenUnder17: 0,
  otherDependents: 0,
  extraFederalDeductions: 0,
  extraStateDeductions: 0,
  roth401kPercent: 0,
  otherAfterTaxMonthly: 0,
  additionalWithholding: 0,
}

const PERIODS_PER_YEAR: Record<PayFrequency, number> = {
  annual: 1, monthly: 12, semimonthly: 24, biweekly: 26, weekly: 52,
}

const FREQUENCY_OPTIONS: Array<{ value: PayFrequency; label: string }> = [
  { value: 'weekly', label: 'Weekly (52/yr)' },
  { value: 'biweekly', label: 'Every 2 weeks (26/yr)' },
  { value: 'semimonthly', label: 'Twice a month (24/yr)' },
  { value: 'monthly', label: 'Monthly (12/yr)' },
  { value: 'annual', label: 'Annual (1/yr)' },
]

const FREQUENCY_NOUN: Record<PayFrequency, string> = {
  annual: 'year', monthly: 'month', semimonthly: 'paycheck',
  biweekly: 'paycheck', weekly: 'week',
}

const FILING_OPTIONS: Array<{ value: FilingStatus; label: string }> = [
  { value: 'single', label: 'Single' },
  { value: 'marriedJoint', label: 'Married filing jointly' },
  { value: 'headOfHousehold', label: 'Head of household' },
]

// Multi-frequency net-pay summary rows (independent of the selected pay frequency).
const NET_PAY_FREQUENCIES: Array<{ label: string; periods: number }> = [
  { label: 'Weekly', periods: 52 },
  { label: 'Every 2 weeks', periods: 26 },
  { label: 'Twice a month', periods: 24 },
  { label: 'Monthly', periods: 12 },
]

// State options sorted alphabetically by full name for the Select.
const STATE_OPTIONS = Object.entries(STATE_TAX)
  .map(([code, info]) => ({ code, name: info.name }))
  .sort((a, b) => a.name.localeCompare(b.name))

interface PaycheckResults {
  computed: boolean
  grossAnnual: number
  k401Annual: number
  roth401Annual: number
  hsaAnnual: number
  fsaAnnual: number
  premiumAnnual: number
  otherPreTaxAnnual: number
  otherAfterTaxAnnual: number
  savingsAnnual: number
  federalTaxBeforeCredits: number
  dependentCredits: number
  federalTax: number
  socialSec: number
  medicare: number
  stateTax: number
  totalTax: number
  withholdAnnual: number
  netAnnual: number
  periodsPerYear: number
  additionalPerPeriod: number
  netPerPeriodCash: number
  effectiveRate: number
  marginalRate: number
  monthlyTakeHome: number
  k401Capped: boolean
  stateName: string
  stateTier: 'none' | 'flat' | 'approx'
}

const EMPTY_RESULTS: PaycheckResults = {
  computed: false, grossAnnual: 0, k401Annual: 0, roth401Annual: 0, hsaAnnual: 0,
  fsaAnnual: 0, premiumAnnual: 0, otherPreTaxAnnual: 0, otherAfterTaxAnnual: 0,
  savingsAnnual: 0, federalTaxBeforeCredits: 0, dependentCredits: 0, federalTax: 0,
  socialSec: 0, medicare: 0, stateTax: 0, totalTax: 0, withholdAnnual: 0, netAnnual: 0,
  periodsPerYear: 26, additionalPerPeriod: 0, netPerPeriodCash: 0, effectiveRate: 0,
  marginalRate: 0, monthlyTakeHome: 0, k401Capped: false, stateName: '', stateTier: 'none',
}

const isPaycheckData = (v: unknown): v is PaycheckData => {
  if (typeof v !== 'object' || v === null) return false
  const o = v as Record<string, unknown>
  const numOk = (x: unknown) => x === '' || typeof x === 'number'
  return (
    (o.payMode === 'salary' || o.payMode === 'hourly') &&
    numOk(o.annualSalary) && numOk(o.hourlyRate) && numOk(o.hoursPerWeek) &&
    numOk(o.weeksPerYear) && numOk(o.overtimeHoursPerWeek) &&
    typeof o.overtimeMultiplier === 'number' &&
    (['annual', 'monthly', 'semimonthly', 'biweekly', 'weekly'] as const).includes(o.payFrequency as PayFrequency) &&
    (['single', 'marriedJoint', 'headOfHousehold'] as const).includes(o.filingStatus as FilingStatus) &&
    typeof o.stateCode === 'string' && o.stateCode in STATE_TAX &&
    numOk(o.retirement401kPercent) && numOk(o.roth401kPercent) &&
    numOk(o.healthPremiumMonthly) && numOk(o.dentalMonthly) && numOk(o.visionMonthly) &&
    numOk(o.hsaMonthly) && numOk(o.fsaMonthly) && numOk(o.otherPreTaxMonthly) &&
    numOk(o.childrenUnder17) && numOk(o.otherDependents) &&
    numOk(o.extraFederalDeductions) && numOk(o.extraStateDeductions) &&
    numOk(o.otherAfterTaxMonthly) && numOk(o.additionalWithholding)
  )
}

// Section heading shared across the grouped input form.
function SectionHeading({ icon: Icon, children }: { icon: typeof Wallet; children: ReactNode }) {
  return (
    <div className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
      <Icon size={16} weight="bold" className="text-primary" />
      {children}
    </div>
  )
}

// Collapsible input group — click the header to expand/collapse. Sections that
// already hold non-default values start open (computed by the caller).
function CollapsibleSection({
  icon: Icon, title, subtitle, defaultOpen = false, children,
}: {
  icon: typeof Wallet
  title: ReactNode
  subtitle?: string
  defaultOpen?: boolean
  children: ReactNode
}) {
  const [open, setOpen] = useState(defaultOpen)
  return (
    <section className="overflow-hidden rounded-xl border border-border/60 bg-card/40">
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        aria-expanded={open}
        className="flex w-full items-center justify-between gap-2 px-4 py-3 text-left transition-colors hover:bg-muted/40"
      >
        <span className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          <Icon size={16} weight="bold" className="text-primary" />
          {title}
          {subtitle && <span className="font-normal normal-case text-xs text-muted-foreground/80">{subtitle}</span>}
        </span>
        <CaretDown
          size={16}
          weight="bold"
          className={`shrink-0 text-muted-foreground transition-transform ${open ? 'rotate-180' : ''}`}
        />
      </button>
      {open && <div className="px-4 pb-4 pt-1">{children}</div>}
    </section>
  )
}

export function PaycheckCalculator() {
  const [data, setData] = useState<PaycheckData>(DEFAULTS)
  const [results, setResults] = useState<PaycheckResults>(EMPTY_RESULTS)
  const [error, setError] = useState('')

  const updateData = (field: keyof PaycheckData, value: NumericOrEmpty | string | number) => {
    setData(current => ({ ...current, [field]: value }))
  }

  const calculate = () => {
    // Validate-first, early-return on the first failing rule.
    if (data.payMode === 'salary') {
      const salary = data.annualSalary
      if (!isValidNumber(salary) || salary <= 0 || salary > 10_000_000) {
        setError('Please enter an annual salary between $1 and $10,000,000')
        return
      }
    } else {
      const rate = data.hourlyRate
      const hours = data.hoursPerWeek
      const weeks = data.weeksPerYear
      if (!isValidNumber(rate) || rate <= 0 || rate > 5_000) {
        setError('Please enter an hourly wage between $1 and $5,000')
        return
      }
      if (!isValidNumber(hours) || hours <= 0 || hours > 100) {
        setError('Please enter hours per week between 1 and 100')
        return
      }
      if (!isValidNumber(weeks) || weeks <= 0 || weeks > 52) {
        setError('Please enter weeks per year between 1 and 52')
        return
      }
      if (isValidNumber(data.overtimeHoursPerWeek) &&
        (data.overtimeHoursPerWeek < 0 || data.overtimeHoursPerWeek > 100)) {
        setError('Overtime hours per week must be between 0 and 100')
        return
      }
    }

    const pctFields: Array<[NumericOrEmpty, string]> = [
      [data.retirement401kPercent, '401(k) contribution'],
      [data.roth401kPercent, 'Roth 401(k) contribution'],
    ]
    for (const [value, label] of pctFields) {
      if (isValidNumber(value) && (value < 0 || value > 100)) {
        setError(`${label} must be between 0% and 100%`)
        return
      }
    }

    const nonNegFields: Array<[NumericOrEmpty, string]> = [
      [data.healthPremiumMonthly, 'Health premium'],
      [data.dentalMonthly, 'Dental premium'],
      [data.visionMonthly, 'Vision premium'],
      [data.hsaMonthly, 'HSA contribution'],
      [data.fsaMonthly, 'FSA contribution'],
      [data.otherPreTaxMonthly, 'Other pre-tax deduction'],
      [data.childrenUnder17, 'Children under 17'],
      [data.otherDependents, 'Other dependents'],
      [data.extraFederalDeductions, 'Extra federal deductions'],
      [data.extraStateDeductions, 'Extra state deductions'],
      [data.otherAfterTaxMonthly, 'Other after-tax deduction'],
      [data.additionalWithholding, 'Additional withholding'],
    ]
    for (const [value, label] of nonNegFields) {
      if (isValidNumber(value) && value < 0) {
        setError(`${label} can’t be negative`)
        return
      }
    }

    // ── Gross and pre-tax pipeline ────────────────────────────────────────────
    const weeks = toNumber(data.weeksPerYear)
    const otPay = toNumber(data.hourlyRate) * data.overtimeMultiplier * toNumber(data.overtimeHoursPerWeek)
    const grossAnnual = data.payMode === 'salary'
      ? toNumber(data.annualSalary)
      : (toNumber(data.hourlyRate) * toNumber(data.hoursPerWeek) + otPay) * weeks

    // Traditional + Roth 401(k) share the same $24,500 elective-deferral limit.
    // If the combined contributions exceed it, scale both down proportionally.
    const tradRaw = grossAnnual * toNumber(data.retirement401kPercent) / 100
    const rothRaw = grossAnnual * toNumber(data.roth401kPercent) / 100
    const totalDeferralRaw = tradRaw + rothRaw
    const k401Capped = totalDeferralRaw > LIMIT_401K
    const deferralScale = k401Capped && totalDeferralRaw > 0 ? LIMIT_401K / totalDeferralRaw : 1
    const k401Annual = tradRaw * deferralScale   // traditional (pre-tax for income tax)
    const roth401Annual = rothRaw * deferralScale // Roth (after-tax)

    const premiumAnnual = (toNumber(data.healthPremiumMonthly) + toNumber(data.dentalMonthly) + toNumber(data.visionMonthly)) * 12
    const hsaAnnual = toNumber(data.hsaMonthly) * 12
    const fsaAnnual = toNumber(data.fsaMonthly) * 12
    const otherPreTaxAnnual = toNumber(data.otherPreTaxMonthly) * 12
    const otherAfterTaxAnnual = toNumber(data.otherAfterTaxMonthly) * 12
    const extraFedDeduction = toNumber(data.extraFederalDeductions)
    const extraStateDeduction = toNumber(data.extraStateDeductions)

    // Pre-tax deductions that lower federal/state taxable income.
    const incomeTaxPreTax = k401Annual + premiumAnnual + hsaAnnual + fsaAnnual + otherPreTaxAnnual
    // FICA-exempt (Section 125 / HSA / commuter) deductions — traditional 401(k) is NOT exempt.
    const ficaExempt = premiumAnnual + hsaAnnual + fsaAnnual + otherPreTaxAnnual

    // Cross-field: pre-tax deductions must be less than gross.
    if (incomeTaxPreTax >= grossAnnual) {
      setError('Pre-tax deductions can’t exceed your gross pay')
      return
    }

    const status = data.filingStatus
    const ficaWages = grossAnnual - ficaExempt
    const fedTaxable = Math.max(0, grossAnnual - incomeTaxPreTax - STANDARD_DEDUCTION[status] - extraFedDeduction)
    const stateTaxable = Math.max(0, grossAnnual - incomeTaxPreTax - extraStateDeduction)

    const federalTaxBeforeCredits = federalIncomeTax(fedTaxable, status)
    const dependentCredits = dependentTaxCredits(
      toNumber(data.childrenUnder17), toNumber(data.otherDependents), status, grossAnnual,
    )
    const federalTax = Math.max(0, federalTaxBeforeCredits - dependentCredits)
    const socialSec = socialSecurityTax(ficaWages)
    const medicare = medicareTax(ficaWages, status)
    const stateTax = stateIncomeTax(stateTaxable, data.stateCode)
    const totalTax = federalTax + socialSec + medicare + stateTax

    const periodsPerYear = PERIODS_PER_YEAR[data.payFrequency]
    const additionalPerPeriod = toNumber(data.additionalWithholding)
    const withholdAnnual = additionalPerPeriod * periodsPerYear

    // Savings = retirement + health-savings contributions (pre- and after-tax).
    const savingsAnnual = k401Annual + roth401Annual + hsaAnnual + fsaAnnual
    // Take-home cash: gross minus pre-tax deductions, taxes, after-tax deductions,
    // Roth, and extra withholding.
    const netAnnual = grossAnnual - incomeTaxPreTax - totalTax - roth401Annual - otherAfterTaxAnnual - withholdAnnual

    if (netAnnual < 0) {
      setError('Your contributions and taxes exceed your gross pay — lower a deduction.')
      return
    }

    setError('')

    const netPerPeriodCash = netAnnual / periodsPerYear
    const effectiveRate = (federalTax + stateTax) / grossAnnual
    const monthlyTakeHome = netAnnual / 12

    const stateInfo = STATE_TAX[data.stateCode]

    setResults({
      computed: true, grossAnnual, k401Annual, roth401Annual, hsaAnnual, fsaAnnual,
      premiumAnnual, otherPreTaxAnnual, otherAfterTaxAnnual, savingsAnnual,
      federalTaxBeforeCredits, dependentCredits, federalTax, socialSec, medicare,
      stateTax, totalTax, withholdAnnual, netAnnual, periodsPerYear, additionalPerPeriod,
      netPerPeriodCash, effectiveRate, marginalRate: marginalRate(fedTaxable, status),
      monthlyTakeHome, k401Capped, stateName: stateInfo.name, stateTier: stateInfo.tier,
    })
  }

  const periodNoun = FREQUENCY_NOUN[data.payFrequency]
  const per = (annual: number) => results.periodsPerYear > 0 ? annual / results.periodsPerYear : 0

  // Donut slices — seven semantic groups that together sum to gross annual pay.
  // Zero-value groups are dropped so the legend only lists what actually applies.
  const chartData = results.computed
    ? [
        { name: 'Take-home pay',              value: results.netAnnual,                                                   color: 'oklch(0.60 0.18 145)' },
        { name: 'Federal income tax',         value: results.federalTax,                                                  color: CHART_COLORS.red },
        { name: 'State income tax',           value: results.stateTax,                                                    color: 'oklch(0.62 0.19 35)' },
        { name: 'Social Security & Medicare', value: results.socialSec + results.medicare,                                color: CHART_COLORS.amber },
        { name: 'Retirement & savings',       value: results.savingsAnnual,                                               color: CHART_COLORS.blue },
        { name: 'Insurance premiums',         value: results.premiumAnnual,                                               color: 'oklch(0.55 0.19 290)' },
        { name: 'Other deductions',           value: results.otherPreTaxAnnual + results.otherAfterTaxAnnual + results.withholdAnnual, color: 'oklch(0.62 0.03 260)' },
      ].filter(slice => slice.value > 0.5)
    : []
  const chartTotal = chartData.reduce((sum, s) => sum + s.value, 0)
  const pctOfGross = (v: number) => chartTotal > 0 ? Math.round((v / chartTotal) * 100) : 0

  // Currency-like text input (monthly $ deduction). Repeated shape → small helper.
  const moneyField = (id: string, label: string, field: keyof PaycheckData) => (
    <div className="space-y-2">
      <Label htmlFor={id}>{label}</Label>
      <Input
        id={id}
        type="text"
        value={formatNumberWithCommas(data[field] as NumericOrEmpty)}
        onChange={(e) => updateData(field, parseFormattedNumber(e.target.value))}
      />
    </div>
  )

  const percentField = (id: string, label: string, field: keyof PaycheckData) => (
    <div className="space-y-2">
      <Label htmlFor={id}>{label}</Label>
      <div className="relative">
        <Input
          id={id}
          type="number"
          step="1"
          value={data[field] as NumericOrEmpty}
          onChange={(e) => updateData(field, e.target.value === '' ? '' : Number(e.target.value))}
          className="pr-8"
        />
        <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none text-sm text-muted-foreground">
          %
        </div>
      </div>
    </div>
  )

  const countField = (id: string, label: string, field: keyof PaycheckData) => (
    <div className="space-y-2">
      <Label htmlFor={id}>{label}</Label>
      <Input
        id={id}
        type="number"
        min="0"
        step="1"
        value={data[field] as NumericOrEmpty}
        onChange={(e) => updateData(field, e.target.value === '' ? '' : Number(e.target.value))}
      />
    </div>
  )

  const selectBlock = (
    id: string,
    label: string,
    value: string,
    onValueChange: (v: string) => void,
    items: Array<{ value: string; label: ReactNode }>,
  ) => (
    <div className="space-y-2">
      <Label htmlFor={id}>{label}</Label>
      <Select value={value} onValueChange={onValueChange}>
        <SelectTrigger id={id}><SelectValue /></SelectTrigger>
        <SelectContent>
          {items.map(it => <SelectItem key={it.value} value={it.value}>{it.label}</SelectItem>)}
        </SelectContent>
      </Select>
    </div>
  )

  // Sections that already carry non-default values start expanded.
  const preTaxOpen = [
    data.retirement401kPercent, data.healthPremiumMonthly, data.dentalMonthly, data.visionMonthly,
    data.hsaMonthly, data.fsaMonthly, data.otherPreTaxMonthly,
  ].some(v => toNumber(v) > 0)
  const dependentsOpen = toNumber(data.childrenUnder17) > 0 || toNumber(data.otherDependents) > 0
  const exemptionsOpen = toNumber(data.extraFederalDeductions) > 0 || toNumber(data.extraStateDeductions) > 0
  const afterTaxOpen =
    toNumber(data.roth401kPercent) > 0 || toNumber(data.otherAfterTaxMonthly) > 0 || toNumber(data.additionalWithholding) > 0

  return (
    <div className="space-y-5 sm:space-y-6">
      {/* Hero banner */}
      <div
        className="relative overflow-hidden rounded-2xl p-4 sm:p-5 text-white"
        style={{ background: 'linear-gradient(135deg, oklch(0.42 0.14 160), oklch(0.22 0.09 160))' }}
      >
        <div
          className="pointer-events-none absolute inset-0 opacity-10"
          style={{ backgroundImage: 'radial-gradient(circle, white 1px, transparent 1px)', backgroundSize: '18px 18px' }}
        />
        <div className="relative flex items-start gap-3 sm:gap-4">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white/15 backdrop-blur">
            <Wallet size={24} weight="fill" />
          </div>
          <div>
            <h2 className="text-base sm:text-xl font-bold tracking-tight">Your Salary &ne; Your Paycheck 💰</h2>
            <p className="mt-0.5 text-xs sm:text-sm text-white/80 max-w-none">
              A $66,000 salary doesn't put $5,500 in your pocket each month. See where every dollar actually goes, <em>before</em> you are surprised by your first paycheck.
            </p>
          </div>
        </div>
      </div>

      {/* ── Income ─────────────────────────────────────────────────────────── */}
      <section className="space-y-3">
        <SectionHeading icon={CurrencyDollar}>Income</SectionHeading>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {/* Pay type + frequency share one block */}
          <div className="grid grid-cols-2 gap-3">
            {selectBlock('pay-mode', 'Pay Type', data.payMode, (v) => updateData('payMode', v), [
              { value: 'salary', label: 'Annual salary' },
              { value: 'hourly', label: 'Hourly wage' },
            ])}
            {selectBlock('pay-frequency', 'Pay Frequency', data.payFrequency, (v) => updateData('payFrequency', v),
              FREQUENCY_OPTIONS.map(o => ({ value: o.value, label: o.label })))}
          </div>

          {/* Wage input(s) */}
          {data.payMode === 'salary'
            ? moneyField('annual-salary', 'Annual Salary ($)', 'annualSalary')
            : (
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label htmlFor="hourly-rate">Hourly Wage ($)</Label>
                  <Input
                    id="hourly-rate"
                    type="number"
                    step="0.25"
                    value={data.hourlyRate}
                    onChange={(e) => updateData('hourlyRate', e.target.value === '' ? '' : Number(e.target.value))}
                  />
                </div>
                {countField('hours-per-week', 'Hours / Week', 'hoursPerWeek')}
              </div>
            )}

          {/* Filing status + state share one block */}
          <div className="grid grid-cols-2 gap-3">
            {selectBlock('filing-status', 'Filing Status', data.filingStatus, (v) => updateData('filingStatus', v),
              FILING_OPTIONS.map(o => ({ value: o.value, label: o.label })))}
            {selectBlock('state-code', 'State', data.stateCode, (v) => updateData('stateCode', v),
              STATE_OPTIONS.map(o => ({ value: o.code, label: o.name })))}
          </div>

          {/* Hourly-only extras: weeks + overtime */}
          {data.payMode === 'hourly' && (
            <>
              <div className="grid grid-cols-2 gap-3">
                {countField('weeks-per-year', 'Weeks / Year', 'weeksPerYear')}
                {countField('ot-hours', 'OT Hours / Week', 'overtimeHoursPerWeek')}
              </div>
              {selectBlock('ot-multiplier', 'Overtime Multiplier', String(data.overtimeMultiplier),
                (v) => updateData('overtimeMultiplier', Number(v)), [
                  { value: '1.5', label: '1.5× (time and a half)' },
                  { value: '2', label: '2× (double time)' },
                ])}
            </>
          )}
        </div>
      </section>

      {/* ── Collapsible deduction groups ───────────────────────────────────── */}
      <div className="space-y-3">
        <CollapsibleSection icon={PiggyBank} title="Pre-Tax Deductions" subtitle="(per month)" defaultOpen={preTaxOpen}>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {percentField('retirement-401k', '401(k) Contribution (%)', 'retirement401kPercent')}
            {moneyField('health-premium', 'Health Insurance ($/mo)', 'healthPremiumMonthly')}
            {moneyField('dental', 'Dental ($/mo)', 'dentalMonthly')}
            {moneyField('vision', 'Vision ($/mo)', 'visionMonthly')}
            {moneyField('hsa-monthly', 'HSA ($/mo)', 'hsaMonthly')}
            {moneyField('fsa-monthly', 'FSA ($/mo)', 'fsaMonthly')}
            {moneyField('other-pretax', 'Other Pre-Tax ($/mo)', 'otherPreTaxMonthly')}
          </div>
        </CollapsibleSection>

        <CollapsibleSection icon={Users} title="Dependents (Tax Credits)" defaultOpen={dependentsOpen}>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {countField('children', 'Children Under 17', 'childrenUnder17')}
            {countField('other-deps', 'Other Dependents', 'otherDependents')}
          </div>
        </CollapsibleSection>

        <CollapsibleSection icon={ShieldCheck} title="Additional Tax Exemptions" subtitle="(per year)" defaultOpen={exemptionsOpen}>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {moneyField('extra-fed', 'Extra Federal Deductions ($/yr)', 'extraFederalDeductions')}
            {moneyField('extra-state', 'Extra State Deductions ($/yr)', 'extraStateDeductions')}
          </div>
        </CollapsibleSection>

        <CollapsibleSection icon={Receipt} title="After-Tax Deductions" defaultOpen={afterTaxOpen}>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {percentField('roth-401k', 'Roth 401(k) Contribution (%)', 'roth401kPercent')}
            {moneyField('other-aftertax', 'Other After-Tax ($/mo)', 'otherAfterTaxMonthly')}
            {moneyField('additional-withholding', 'Extra Federal Withholding ($/paycheck)', 'additionalWithholding')}
          </div>
        </CollapsibleSection>
      </div>

      {/* Calculate Button */}
      <div className="flex flex-col gap-3">
        <CalculateButton onCalculate={calculate} />
        {error && (
          <Alert variant="destructive" className="w-full">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}
      </div>

      {results.computed && (
        <>
          {/* Your Paycheck + The Big Picture, side by side */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Card 1 — Your Paycheck (per selected period, with cents) */}
            <Card>
              <CardHeader>
                <CardTitle>Your Paycheck</CardTitle>
                <p className="text-sm text-muted-foreground">Per {periodNoun}</p>
              </CardHeader>
              <CardContent className="divide-y divide-border/40">
                <div className="flex justify-between py-3">
                  <span className="text-muted-foreground">Gross pay:</span>
                  <span className="font-semibold currency-blue">{formatCurrency(per(results.grossAnnual), true)}</span>
                </div>
                {results.k401Annual > 0 && (
                  <div className="flex justify-between py-3">
                    <span className="text-muted-foreground">401(k) contribution:</span>
                    <span className="font-semibold currency-orange">&minus;{formatCurrency(per(results.k401Annual), true)}</span>
                  </div>
                )}
                {results.hsaAnnual > 0 && (
                  <div className="flex justify-between py-3">
                    <span className="text-muted-foreground">HSA contribution:</span>
                    <span className="font-semibold currency-orange">&minus;{formatCurrency(per(results.hsaAnnual), true)}</span>
                  </div>
                )}
                {results.fsaAnnual > 0 && (
                  <div className="flex justify-between py-3">
                    <span className="text-muted-foreground">FSA contribution:</span>
                    <span className="font-semibold currency-orange">&minus;{formatCurrency(per(results.fsaAnnual), true)}</span>
                  </div>
                )}
                {results.premiumAnnual > 0 && (
                  <div className="flex justify-between py-3">
                    <span className="text-muted-foreground">Insurance premiums:</span>
                    <span className="font-semibold currency-orange">&minus;{formatCurrency(per(results.premiumAnnual), true)}</span>
                  </div>
                )}
                {results.otherPreTaxAnnual > 0 && (
                  <div className="flex justify-between py-3">
                    <span className="text-muted-foreground">Other pre-tax:</span>
                    <span className="font-semibold currency-orange">&minus;{formatCurrency(per(results.otherPreTaxAnnual), true)}</span>
                  </div>
                )}
                <div className="flex justify-between py-3">
                  <span className="text-muted-foreground">Federal income tax:</span>
                  <span className="font-semibold currency-red">&minus;{formatCurrency(per(results.federalTax), true)}</span>
                </div>
                <div className="flex justify-between py-3">
                  <span className="text-muted-foreground">Social Security ({results.grossAnnual > 0 ? (results.socialSec / results.grossAnnual * 100).toFixed(2) : '0.00'}% of gross):</span>
                  <span className="font-semibold currency-red">&minus;{formatCurrency(per(results.socialSec), true)}</span>
                </div>
                <div className="flex justify-between py-3">
                  <span className="text-muted-foreground">Medicare ({results.grossAnnual > 0 ? (results.medicare / results.grossAnnual * 100).toFixed(2) : '0.00'}% of gross):</span>
                  <span className="font-semibold currency-red">&minus;{formatCurrency(per(results.medicare), true)}</span>
                </div>
                <div className="flex justify-between py-3">
                  <span className="text-muted-foreground">State income tax ({results.stateName}):</span>
                  {results.stateTier === 'none' ? (
                    <span className="font-semibold currency-green">$0 &mdash; no income tax 🎉</span>
                  ) : (
                    <span className="font-semibold currency-red">&minus;{formatCurrency(per(results.stateTax), true)}</span>
                  )}
                </div>
                {results.roth401Annual > 0 && (
                  <div className="flex justify-between py-3">
                    <span className="text-muted-foreground">Roth 401(k) contribution:</span>
                    <span className="font-semibold currency-orange">&minus;{formatCurrency(per(results.roth401Annual), true)}</span>
                  </div>
                )}
                {results.otherAfterTaxAnnual > 0 && (
                  <div className="flex justify-between py-3">
                    <span className="text-muted-foreground">Other after-tax:</span>
                    <span className="font-semibold currency-red">&minus;{formatCurrency(per(results.otherAfterTaxAnnual), true)}</span>
                  </div>
                )}
                {results.additionalPerPeriod > 0 && (
                  <div className="flex justify-between py-3">
                    <span className="text-muted-foreground">Additional withholding:</span>
                    <span className="font-semibold currency-red">&minus;{formatCurrency(results.additionalPerPeriod, true)}</span>
                  </div>
                )}
                <div className="flex justify-between py-3">
                  <span className="font-medium">Net take-home:</span>
                  <span className="font-bold currency-green">{formatCurrency(results.netPerPeriodCash, true)}</span>
                </div>
              </CardContent>
            </Card>

            {/* Card 2 — The Big Picture (annualized, whole dollars) */}
            <Card>
              <CardHeader>
                <CardTitle>The Big Picture</CardTitle>
                <p className="text-sm text-muted-foreground">Annualized</p>
              </CardHeader>
              <CardContent className="divide-y divide-border/40">
                <div className="flex justify-between py-3">
                  <span className="text-muted-foreground">Gross annual income:</span>
                  <span className="font-semibold currency-blue">{formatCurrency(results.grossAnnual)}</span>
                </div>
                <div className="flex justify-between py-3">
                  <span className="text-muted-foreground">Total taxes:</span>
                  <span className="font-semibold currency-red">{formatCurrency(results.totalTax)}</span>
                </div>
                {results.dependentCredits > 0 && (
                  <div className="flex justify-between py-2 pl-4">
                    <span className="text-muted-foreground text-sm">Dependent tax credits applied:</span>
                    <span className="text-sm currency-green">
                      &minus;{formatCurrency(Math.min(results.dependentCredits, results.federalTaxBeforeCredits))}
                    </span>
                  </div>
                )}
                {results.k401Annual > 0 && (
                  <div className="flex justify-between py-2 pl-4">
                    <span className="text-muted-foreground text-sm italic">401(k) contribution:</span>
                    <span className="text-sm currency-orange">{formatCurrency(results.k401Annual)}</span>
                  </div>
                )}
                {results.roth401Annual > 0 && (
                  <div className="flex justify-between py-2 pl-4">
                    <span className="text-muted-foreground text-sm italic">Roth 401(k) contribution:</span>
                    <span className="text-sm currency-orange">{formatCurrency(results.roth401Annual)}</span>
                  </div>
                )}
                {results.hsaAnnual > 0 && (
                  <div className="flex justify-between py-2 pl-4">
                    <span className="text-muted-foreground text-sm italic">HSA contribution:</span>
                    <span className="text-sm currency-orange">{formatCurrency(results.hsaAnnual)}</span>
                  </div>
                )}
                {results.fsaAnnual > 0 && (
                  <div className="flex justify-between py-2 pl-4">
                    <span className="text-muted-foreground text-sm italic">FSA contribution:</span>
                    <span className="text-sm currency-orange">{formatCurrency(results.fsaAnnual)}</span>
                  </div>
                )}
                <div className="flex justify-between py-3">
                  <span className="text-muted-foreground">Total savings:</span>
                  <span className="font-semibold currency-orange">{formatCurrency(results.savingsAnnual)}</span>
                </div>
                <div className="flex justify-between py-3">
                  <span className="text-muted-foreground">Net annual take-home:</span>
                  <span className="font-semibold currency-green">{formatCurrency(results.netAnnual)}</span>
                </div>
                <div className="flex justify-between py-3">
                  <span className="text-muted-foreground">Effective tax rate:</span>
                  <span className="font-bold currency-red">{(results.effectiveRate * 100).toFixed(1)}%</span>
                </div>
                <div className="flex justify-between py-3">
                  <span className="text-muted-foreground">Marginal tax bracket:</span>
                  <span className="font-semibold">{(results.marginalRate * 100).toFixed(0)}%</span>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Net Pay Per Paycheck — same take-home shown across common frequencies */}
          <Card>
            <CardHeader>
              <CardTitle>Net Pay by Pay Frequency</CardTitle>
              <p className="text-sm text-muted-foreground">Your annual take-home, split different ways</p>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {NET_PAY_FREQUENCIES.map(f => (
                  <div key={f.label} className="rounded-xl border border-border/50 bg-muted/30 p-3 text-center">
                    <div className="text-xs uppercase tracking-wide text-muted-foreground">{f.label}</div>
                    <div className="mt-1 font-bold currency-green">{formatCurrency(results.netAnnual / f.periods, true)}</div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Where Every Dollar Goes — donut with a center total + labeled legend */}
          <Card>
            <CardHeader>
              <CardTitle>Where Every Dollar Goes</CardTitle>
              <p className="text-sm text-muted-foreground">Annual breakdown of your {formatCurrency(results.grossAnnual)} gross salary.</p>
            </CardHeader>
            <CardContent>
              <div
                className="grid gap-4 sm:grid-cols-2 sm:items-center"
                role="img"
                aria-label={`Paycheck breakdown: ${formatCurrency(results.netAnnual)} take-home from ${formatCurrency(results.grossAnnual)} gross`}
              >
                {/* Donut with take-home total in the center */}
                <div className="relative mx-auto h-56 w-full max-w-[16rem] sm:h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={chartData}
                        dataKey="value"
                        nameKey="name"
                        cx="50%"
                        cy="50%"
                        innerRadius="64%"
                        outerRadius="90%"
                        paddingAngle={1}
                        stroke="none"
                      >
                        {chartData.map((slice) => (
                          <Cell key={slice.name} fill={slice.color} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(v: number, name: string) => [`${formatCurrency(v)} (${pctOfGross(v)}%)`, name]} />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center text-center">
                    <span className="text-[0.7rem] uppercase tracking-wide text-muted-foreground">Take-home</span>
                    <span className="text-lg sm:text-xl font-bold currency-green">{formatCurrency(results.netAnnual)}</span>
                    <span className="text-[0.7rem] text-muted-foreground">{pctOfGross(results.netAnnual)}% of gross</span>
                  </div>
                </div>

                {/* Labeled legend — category, dollar amount, and share of gross */}
                <ul className="space-y-1.5">
                  {chartData.map((slice) => (
                    <li key={slice.name} className="flex items-center justify-between gap-3 border-b border-border/30 pb-1.5 text-sm last:border-0">
                      <span className="flex min-w-0 items-center gap-2">
                        <span className="h-3 w-3 shrink-0 rounded-sm" style={{ background: slice.color }} />
                        <span className="truncate text-muted-foreground">{slice.name}</span>
                      </span>
                      <span className="flex shrink-0 items-baseline gap-2">
                        <span className="font-semibold tabular-nums">{formatCurrency(slice.value)}</span>
                        <span className="w-9 text-right text-xs text-muted-foreground tabular-nums">{pctOfGross(slice.value)}%</span>
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
              {results.stateTier === 'approx' && (
                <p className="mt-3 text-xs text-muted-foreground">
                  {results.stateName} uses graduated brackets &mdash; this is a simplified estimate.
                </p>
              )}
            </CardContent>
          </Card>

          {/* Non-blocking 401(k) cap warning */}
          {results.k401Capped && (
            <Alert className="w-full">
              <AlertDescription>
                Heads up: your combined 401(k) and Roth 401(k) contributions exceed the 2026 IRS elective-deferral
                limit of {formatCurrency(LIMIT_401K)} &mdash; payroll would stop them there. We&rsquo;ve capped them
                in this estimate.
              </AlertDescription>
            </Alert>
          )}

          {/* Disclaimer */}
          <p className="text-xs text-muted-foreground leading-relaxed">
            <em>
              Not tax advice. Estimates for educational purposes only. Actual withholding depends on your W-4; state and local taxes; benefit plan details; and other factors.
            </em>
          </p>
        </>
      )}

      {/* Key Lesson Section */}
      <Card className="bg-accent/5 border-accent/20">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">💡 Key Lesson</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="leading-relaxed font-medium">
            <strong>Your gross salary is not the same as your take-home pay.</strong> Before your paycheck reaches 
            your bank account, your employer must withhold applicable federal, state, and local income taxes, 
            as well as Social Security and Medicare taxes (FICA). Employee benefit deductions may be taken either 
            before or after taxes. Pre-tax contributions, such as health insurance premiums, health savings accounts (HSAs), 
            flexible spending accounts (FSAs), and certain workplace retirement plan contributions, reduce your taxable 
            income today. As a result, the current cost of saving or contributing $100 is often less than $100. 
            In contrast, contributions to Roth 401(k) and Roth 403(b) plans are made with after-tax dollars, 
            but qualified withdrawals in retirement are generally tax-free. 
            <em> These estimates are for educational purposes only and should not be considered tax advice.</em>
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
