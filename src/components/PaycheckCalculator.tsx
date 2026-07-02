import { useState } from 'react'
import { useLocalStorage } from '@/hooks/useLocalStorage'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { CalculateButton } from '@/components/ui/calculate-button'
import { NumericOrEmpty, isValidNumber, toNumber } from '@/lib/calculator-validation'
import { formatCurrency, formatNumberWithCommas, parseFormattedNumber } from '@/lib/formatters'
import { CHART_COLORS } from '@/lib/chart-colors'
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from 'recharts'
import { Wallet } from '@phosphor-icons/react'
import {
  FilingStatus,
  STATE_TAX,
  STANDARD_DEDUCTION,
  LIMIT_401K,
  federalIncomeTax,
  socialSecurityTax,
  medicareTax,
  stateIncomeTax,
} from '@/lib/paycheck-tax-tables'

type PayMode = 'salary' | 'hourly'
type PayFrequency = 'annual' | 'monthly' | 'semimonthly' | 'biweekly' | 'weekly'

interface PaycheckData {
  payMode: PayMode
  annualSalary: NumericOrEmpty
  hourlyRate: NumericOrEmpty
  hoursPerWeek: NumericOrEmpty
  payFrequency: PayFrequency
  filingStatus: FilingStatus
  stateCode: string
  retirement401kPercent: NumericOrEmpty
  healthPremiumMonthly: NumericOrEmpty
  additionalWithholding: NumericOrEmpty
}

const DEFAULTS: PaycheckData = {
  payMode: 'salary',
  annualSalary: 55000,
  hourlyRate: 20,
  hoursPerWeek: 40,
  payFrequency: 'biweekly',
  filingStatus: 'single',
  stateCode: 'TN',
  retirement401kPercent: 5,
  healthPremiumMonthly: 0,
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

// State options sorted alphabetically by full name for the Select.
const STATE_OPTIONS = Object.entries(STATE_TAX)
  .map(([code, info]) => ({ code, name: info.name }))
  .sort((a, b) => a.name.localeCompare(b.name))

interface PaycheckResults {
  computed: boolean
  grossAnnual: number
  k401Annual: number
  premiumAnnual: number
  preTaxAnnual: number
  federalTax: number
  socialSec: number
  medicare: number
  stateTax: number
  totalTax: number
  netAnnual: number
  periodsPerYear: number
  additionalPerPeriod: number
  netPerPeriodCash: number
  effectiveRate: number
  monthlyTakeHome: number
  k401Capped: boolean
  stateName: string
  stateTier: 'none' | 'flat' | 'approx'
}

const EMPTY_RESULTS: PaycheckResults = {
  computed: false, grossAnnual: 0, k401Annual: 0, premiumAnnual: 0, preTaxAnnual: 0,
  federalTax: 0, socialSec: 0, medicare: 0, stateTax: 0, totalTax: 0, netAnnual: 0,
  periodsPerYear: 26, additionalPerPeriod: 0, netPerPeriodCash: 0, effectiveRate: 0,
  monthlyTakeHome: 0, k401Capped: false, stateName: '', stateTier: 'none',
}

const isPaycheckData = (v: unknown): v is PaycheckData => {
  if (typeof v !== 'object' || v === null) return false
  const o = v as Record<string, unknown>
  const numOk = (x: unknown) => x === '' || typeof x === 'number'
  return (
    (o.payMode === 'salary' || o.payMode === 'hourly') &&
    numOk(o.annualSalary) && numOk(o.hourlyRate) && numOk(o.hoursPerWeek) &&
    (['annual', 'monthly', 'semimonthly', 'biweekly', 'weekly'] as const).includes(o.payFrequency as PayFrequency) &&
    (['single', 'marriedJoint', 'headOfHousehold'] as const).includes(o.filingStatus as FilingStatus) &&
    typeof o.stateCode === 'string' && o.stateCode in STATE_TAX &&
    numOk(o.retirement401kPercent) && numOk(o.healthPremiumMonthly) && numOk(o.additionalWithholding)
  )
}

export function PaycheckCalculator() {
  const [data, setData] = useLocalStorage<PaycheckData>('paycheck-calculator', DEFAULTS, isPaycheckData)
  const [results, setResults] = useState<PaycheckResults>(EMPTY_RESULTS)
  const [error, setError] = useState('')

  const updateData = (field: keyof PaycheckData, value: NumericOrEmpty | string) => {
    setData(current => ({ ...current, [field]: value }))
  }

  const calculate = () => {
    // Validate-first, early-return on the first failing rule (§2.3).
    if (data.payMode === 'salary') {
      const salary = data.annualSalary
      if (!isValidNumber(salary) || salary <= 0 || salary > 10_000_000) {
        setError('Please enter an annual salary between $1 and $10,000,000')
        return
      }
    } else {
      const rate = data.hourlyRate
      const hours = data.hoursPerWeek
      if (!isValidNumber(rate) || rate <= 0 || rate > 5_000) {
        setError('Please enter an hourly wage between $1 and $5,000')
        return
      }
      if (!isValidNumber(hours) || hours <= 0 || hours > 100) {
        setError('Please enter hours per week between 1 and 100')
        return
      }
    }

    if (isValidNumber(data.retirement401kPercent) &&
      (data.retirement401kPercent < 0 || data.retirement401kPercent > 100)) {
      setError('401(k) contribution must be between 0% and 100%')
      return
    }
    if (isValidNumber(data.healthPremiumMonthly) && data.healthPremiumMonthly < 0) {
      setError('Health premium can\u2019t be negative')
      return
    }
    if (isValidNumber(data.additionalWithholding) && data.additionalWithholding < 0) {
      setError('Additional withholding can\u2019t be negative')
      return
    }

    // ── Gross and pre-tax pipeline (exact order per §4.1) ─────────────────────
    const grossAnnual = data.payMode === 'salary'
      ? toNumber(data.annualSalary)
      : toNumber(data.hourlyRate) * toNumber(data.hoursPerWeek) * 52

    const rawK401 = grossAnnual * toNumber(data.retirement401kPercent) / 100
    const k401Annual = Math.min(rawK401, LIMIT_401K)
    const k401Capped = rawK401 > LIMIT_401K
    const premiumAnnual = toNumber(data.healthPremiumMonthly) * 12
    const preTaxAnnual = k401Annual + premiumAnnual

    // Cross-field: pre-tax deductions must be less than gross (rule 5, blocking).
    if (preTaxAnnual >= grossAnnual) {
      setError('Pre-tax deductions can\u2019t exceed your gross pay')
      return
    }

    setError('')

    const status = data.filingStatus
    const ficaWages = grossAnnual - premiumAnnual
    const fedTaxable = Math.max(0, grossAnnual - preTaxAnnual - STANDARD_DEDUCTION[status])
    const stateTaxable = Math.max(0, grossAnnual - preTaxAnnual)

    const federalTax = federalIncomeTax(fedTaxable, status)
    const socialSec = socialSecurityTax(ficaWages)
    const medicare = medicareTax(ficaWages, status)
    const stateTax = stateIncomeTax(stateTaxable, data.stateCode)
    const totalTax = federalTax + socialSec + medicare + stateTax

    const periodsPerYear = PERIODS_PER_YEAR[data.payFrequency]
    const additionalPerPeriod = toNumber(data.additionalWithholding)
    const withholdAnnual = additionalPerPeriod * periodsPerYear
    const netAnnual = grossAnnual - preTaxAnnual - totalTax
    const netPerPeriodCash = (netAnnual - withholdAnnual) / periodsPerYear
    const effectiveRate = totalTax / grossAnnual
    const monthlyTakeHome = netAnnual / 12

    const stateInfo = STATE_TAX[data.stateCode]

    setResults({
      computed: true, grossAnnual, k401Annual, premiumAnnual, preTaxAnnual,
      federalTax, socialSec, medicare, stateTax, totalTax, netAnnual,
      periodsPerYear, additionalPerPeriod, netPerPeriodCash, effectiveRate,
      monthlyTakeHome, k401Capped, stateName: stateInfo.name, stateTier: stateInfo.tier,
    })
  }

  const periodNoun = FREQUENCY_NOUN[data.payFrequency]
  const per = (annual: number) => results.periodsPerYear > 0 ? annual / results.periodsPerYear : 0

  // Donut slices — omit zero-value slices; each carries its own color so
  // adjacent slices always differ (only 5 palette colors exist).
  const chartData = results.computed
    ? [
        { name: 'Net take-home', value: results.netAnnual, color: CHART_COLORS.emerald },
        { name: 'Federal tax', value: results.federalTax, color: CHART_COLORS.blue },
        { name: 'Social Security', value: results.socialSec, color: CHART_COLORS.amber },
        { name: 'Medicare', value: results.medicare, color: CHART_COLORS.red },
        { name: 'State tax', value: results.stateTax, color: CHART_COLORS.violet },
        { name: '401(k)', value: results.k401Annual, color: CHART_COLORS.blue },
        { name: 'Health premiums', value: results.premiumAnnual, color: CHART_COLORS.amber },
        { name: 'Additional withholding', value: results.additionalPerPeriod * results.periodsPerYear, color: CHART_COLORS.red },
      ].filter(slice => slice.value > 0)
    : []

  const monthly = results.monthlyTakeHome

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
              That $55,000 offer letter doesn&rsquo;t mean $4,583 a month in your pocket. See where every dollar
              actually goes &mdash; before your first payday surprises you.
            </p>
          </div>
        </div>
      </div>

      {/* Input Section */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <div className="space-y-2">
          <Label htmlFor="pay-mode">Pay Type</Label>
          <Select value={data.payMode} onValueChange={(value) => updateData('payMode', value)}>
            <SelectTrigger id="pay-mode">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="salary">Annual salary</SelectItem>
              <SelectItem value="hourly">Hourly wage</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {data.payMode === 'salary' && (
          <div className="space-y-2">
            <Label htmlFor="annual-salary">Annual Salary ($)</Label>
            <Input
              id="annual-salary"
              type="text"
              value={formatNumberWithCommas(data.annualSalary)}
              onChange={(e) => updateData('annualSalary', parseFormattedNumber(e.target.value))}
            />
          </div>
        )}

        {data.payMode === 'hourly' && (
          <>
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
            <div className="space-y-2">
              <Label htmlFor="hours-per-week">Hours per Week</Label>
              <Input
                id="hours-per-week"
                type="number"
                value={data.hoursPerWeek}
                onChange={(e) => updateData('hoursPerWeek', e.target.value === '' ? '' : Number(e.target.value))}
              />
            </div>
          </>
        )}

        <div className="space-y-2">
          <Label htmlFor="pay-frequency">Pay Frequency</Label>
          <Select value={data.payFrequency} onValueChange={(value) => updateData('payFrequency', value)}>
            <SelectTrigger id="pay-frequency">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {FREQUENCY_OPTIONS.map(o => (
                <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="filing-status">Filing Status</Label>
          <Select value={data.filingStatus} onValueChange={(value) => updateData('filingStatus', value)}>
            <SelectTrigger id="filing-status">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {FILING_OPTIONS.map(o => (
                <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="state-code">State</Label>
          <Select value={data.stateCode} onValueChange={(value) => updateData('stateCode', value)}>
            <SelectTrigger id="state-code">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {STATE_OPTIONS.map(o => (
                <SelectItem key={o.code} value={o.code}>{o.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="retirement-401k">401(k) Contribution (%)</Label>
          <div className="relative">
            <Input
              id="retirement-401k"
              type="number"
              step="1"
              value={data.retirement401kPercent}
              onChange={(e) => updateData('retirement401kPercent', e.target.value === '' ? '' : Number(e.target.value))}
              className="pr-8"
            />
            <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none text-sm text-muted-foreground">
              %
            </div>
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="health-premium">Health Premium ($/month)</Label>
          <Input
            id="health-premium"
            type="text"
            value={formatNumberWithCommas(data.healthPremiumMonthly)}
            onChange={(e) => updateData('healthPremiumMonthly', parseFormattedNumber(e.target.value))}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="additional-withholding">Extra Federal Withholding ($/paycheck)</Label>
          <Input
            id="additional-withholding"
            type="text"
            value={formatNumberWithCommas(data.additionalWithholding)}
            onChange={(e) => updateData('additionalWithholding', parseFormattedNumber(e.target.value))}
          />
        </div>
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
          {/* Results and Chart Section */}
          <div className="grid grid-cols-1 md:grid-cols-5 gap-6">
            <div className="md:col-span-2 space-y-6">
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
                  <div className="flex justify-between py-3">
                    <span className="text-muted-foreground">401(k) contribution:</span>
                    <span className="font-semibold currency-orange">&minus;{formatCurrency(per(results.k401Annual), true)}</span>
                  </div>
                  <div className="flex justify-between py-3">
                    <span className="text-muted-foreground">Health premium:</span>
                    <span className="font-semibold currency-orange">&minus;{formatCurrency(per(results.premiumAnnual), true)}</span>
                  </div>
                  <div className="flex justify-between py-3">
                    <span className="text-muted-foreground">Federal income tax:</span>
                    <span className="font-semibold currency-red">&minus;{formatCurrency(per(results.federalTax), true)}</span>
                  </div>
                  <div className="flex justify-between py-3">
                    <span className="text-muted-foreground">Social Security (6.2%):</span>
                    <span className="font-semibold currency-red">&minus;{formatCurrency(per(results.socialSec), true)}</span>
                  </div>
                  <div className="flex justify-between py-3">
                    <span className="text-muted-foreground">Medicare (1.45%+):</span>
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
                  <div className="flex justify-between py-3">
                    <span className="text-muted-foreground">Total pre-tax savings/benefits:</span>
                    <span className="font-semibold currency-orange">{formatCurrency(results.preTaxAnnual)}</span>
                  </div>
                  <div className="flex justify-between py-3">
                    <span className="text-muted-foreground">Net annual take-home:</span>
                    <span className="font-semibold currency-green">{formatCurrency(results.netAnnual)}</span>
                  </div>
                  <div className="flex justify-between py-3">
                    <span className="font-medium">Effective tax rate:</span>
                    <span className="font-bold currency-red">{(results.effectiveRate * 100).toFixed(1)}%</span>
                  </div>
                  <div className="flex justify-between py-3">
                    <span className="text-muted-foreground">Monthly take-home:</span>
                    <span className="font-semibold currency-green">{formatCurrency(monthly)}</span>
                  </div>
                </CardContent>
              </Card>
            </div>

            <div className="md:col-span-3">
              <Card>
                <CardHeader>
                  <CardTitle>Where Every Dollar Goes</CardTitle>
                </CardHeader>
                <CardContent>
                  <div
                    className="h-60 sm:h-80 w-full"
                    role="img"
                    aria-label={`Paycheck breakdown: ${formatCurrency(results.netAnnual)} take-home from ${formatCurrency(results.grossAnnual)} gross`}
                  >
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={chartData}
                          dataKey="value"
                          nameKey="name"
                          cx="50%"
                          cy="50%"
                          innerRadius="55%"
                          outerRadius="80%"
                          paddingAngle={1}
                        >
                          {chartData.map((slice) => (
                            <Cell key={slice.name} fill={slice.color} />
                          ))}
                        </Pie>
                        <Tooltip formatter={(v: number, name: string) => [formatCurrency(v), name]} />
                        <Legend fontSize={12} />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                  {results.stateTier === 'approx' && (
                    <p className="mt-2 text-xs text-muted-foreground">
                      {results.stateName} uses graduated brackets &mdash; this is a simplified estimate.
                    </p>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>

          {/* Non-blocking 401(k) cap warning */}
          {results.k401Capped && (
            <Alert className="w-full">
              <AlertDescription>
                Heads up: your 401(k) contribution exceeds the 2026 IRS limit of {formatCurrency(LIMIT_401K)} &mdash;
                payroll would stop it there. We&rsquo;ve capped it in this estimate.
              </AlertDescription>
            </Alert>
          )}

          {/* Monthly budget snapshot — 50/30/20 rule */}
          <Card>
            <CardHeader>
              <CardTitle>Monthly Budget Snapshot</CardTitle>
              <p className="text-sm text-muted-foreground">
                A common starting rule of thumb &mdash; adjust to your life.
              </p>
            </CardHeader>
            <CardContent className="divide-y divide-border/40">
              <div className="flex justify-between py-3">
                <span className="text-muted-foreground">Needs (50%):</span>
                <span className="font-semibold">{formatCurrency(monthly * 0.5)}</span>
              </div>
              <div className="flex justify-between py-3">
                <span className="text-muted-foreground">Wants (30%):</span>
                <span className="font-semibold">{formatCurrency(monthly * 0.3)}</span>
              </div>
              <div className="flex justify-between py-3">
                <span className="text-muted-foreground">Savings &amp; debt (20%):</span>
                <span className="font-semibold">{formatCurrency(monthly * 0.2)}</span>
              </div>
            </CardContent>
          </Card>

          {/* Disclaimer */}
          <p className="text-xs text-muted-foreground leading-relaxed">
            <em>
              Estimates for education only. Actual withholding depends on your W-4, tax credits, local/city taxes,
              benefit plan details, and state rules we simplify here (see the note next to your state). Not tax advice.
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
            <strong>Your gross salary is not your take-home pay.</strong> Before a dollar reaches your bank account,
            FICA takes <strong>7.65%</strong> right off the top for almost everyone &mdash; 6.2% for Social Security
            and 1.45% for Medicare &mdash; and it has no standard deduction, so it applies even at low incomes.
            Federal income tax is <em>marginal</em>: &ldquo;landing in the 22% bracket&rdquo; does <em>not</em> mean
            paying 22% on every dollar &mdash; only on the portion above that bracket&rsquo;s threshold, which is why
            your <em>effective</em> rate is lower. And pre-tax 401(k) dollars lower your taxable income today, so the
            take-home cost of saving $100 is actually less than $100. <em>Estimates for education only &mdash; not tax
            advice.</em>
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
