import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Alert, AlertDescription } from '@/components/ui/alert'
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts'
import { CalculateButton } from '@/components/ui/calculate-button'
import { Switch } from '@/components/ui/switch'
import {
  ShieldCheck,
  Warning,
  Trophy,
  X,
  Check,
  Umbrella,
  Sparkle,
} from '@phosphor-icons/react'
import { NumericOrEmpty, isValidNumber, toNumber } from '@/lib/calculator-validation'
import { formatCurrency, formatNumberWithCommas, parseFormattedNumber } from '@/lib/formatters'
import { CHART_COLORS } from '@/lib/chart-colors'
import { Gender, estimateTermPremium, estimateWholePremium } from '@/lib/insurance-rates'

interface InsuranceData {
  age: NumericOrEmpty
  coverage: NumericOrEmpty
  termPremium: NumericOrEmpty
  wholePremium: NumericOrEmpty
  investReturn: NumericOrEmpty
  years: NumericOrEmpty
  gender: Gender
}

interface ChartPoint {
  year: number
  age: number
  invested: number
}

interface Results {
  monthlyDifference: number
  totalDifferenceInvested: number
  buyTermInvestPot: number
  growthFromDifference: number
  wholeCashValue: number
  potAdvantage: number
  termTotalPaid: number
  wholeTotalPaid: number
  coverageMultiple: number
}

// Whole-life cash value is famously slow to build. This is a deliberately
// *generous* educational approximation: $0 for the first two years (front-loaded
// fees/commissions), then roughly 70% of cumulative premiums, trending toward
// ~100% only after decades. Real policies are often worse early on.
function approxWholeCashValue(annualWholePremium: number, year: number): number {
  if (year <= 2) return 0
  const cumulative = annualWholePremium * year
  const ramp = Math.min(1, 0.45 + 0.02 * year) // 0.49 at yr2 → ~1.0 by yr ~28
  return cumulative * Math.min(0.95, ramp) * 0.92
}

function compute(d: InsuranceData): { results: Results; chart: ChartPoint[] } {
  const age = toNumber(d.age)
  const coverage = toNumber(d.coverage)
  const termPremium = toNumber(d.termPremium) // monthly
  const wholePremium = toNumber(d.wholePremium) // monthly
  const investReturn = toNumber(d.investReturn)
  const years = toNumber(d.years)

  const monthlyDifference = Math.max(0, wholePremium - termPremium)
  const mRate = investReturn / 100 / 12
  const totalDifferenceInvested = monthlyDifference * 12 * years

  const fvDifference = (yrs: number) => {
    const n = yrs * 12
    if (n <= 0) return 0
    if (mRate === 0) return monthlyDifference * n
    return monthlyDifference * ((Math.pow(1 + mRate, n) - 1) / mRate)
  }

  const buyTermInvestPot = fvDifference(years)
  const growthFromDifference = Math.max(0, buyTermInvestPot - totalDifferenceInvested)
  const wholeCashValue = approxWholeCashValue(wholePremium * 12, years)
  const potAdvantage = buyTermInvestPot - wholeCashValue

  const chart: ChartPoint[] = []
  for (let y = 0; y <= years; y++) {
    chart.push({
      year: y,
      age: age + y,
      invested: fvDifference(y),
    })
  }

  return {
    results: {
      monthlyDifference,
      totalDifferenceInvested,
      buyTermInvestPot,
      growthFromDifference,
      wholeCashValue,
      potAdvantage,
      termTotalPaid: termPremium * 12 * years,
      wholeTotalPaid: wholePremium * 12 * years,
      coverageMultiple: termPremium > 0 ? wholePremium / termPremium : 0,
    },
    chart,
  }
}

const compactAxis = (v: number) => {
  if (Math.abs(v) >= 1_000_000) return `$${(v / 1_000_000).toFixed(1)}M`
  if (Math.abs(v) >= 1_000) return `$${Math.round(v / 1_000)}k`
  return `$${v}`
}

const comparisonRows: { label: string; term: string; whole: string; termGood: boolean }[] = [
  {
    label: 'Cost for the same coverage',
    term: 'Low — often 5–15× cheaper',
    whole: 'Very high premiums',
    termGood: true,
  },
  {
    label: 'What it’s really for',
    term: 'Pure protection when people depend on you',
    whole: 'Protection bundled with a costly “investment”',
    termGood: true,
  },
  {
    label: 'Investment growth',
    term: 'You invest the difference & keep all the upside',
    whole: 'Low returns after fees & commissions',
    termGood: true,
  },
  {
    label: 'Fees & commissions',
    term: 'Minimal',
    whole: 'High, front-loaded (slow early cash value)',
    termGood: true,
  },
  {
    label: 'Flexibility',
    term: 'Cancel anytime, invest anywhere',
    whole: 'Surrender charges, hard to exit early',
    termGood: true,
  },
  {
    label: 'When you no longer need it',
    term: 'Coverage ends — but you’re self-insured by then',
    whole: 'You’ve overpaid for decades',
    termGood: true,
  },
]

export function LifeInsuranceCalculator() {
  const [data, setData] = useState<InsuranceData>({
    age: 20,
    coverage: 500000,
    termPremium: 25,
    wholePremium: 300,
    investReturn: 8,
    years: 30,
    gender: 'female',
  })
  const [autoEstimate, setAutoEstimate] = useState(true)
  const [results, setResults] = useState<Results | null>(null)
  const [chart, setChart] = useState<ChartPoint[]>([])
  const [error, setError] = useState('')

  // When auto-estimate is on, seed both premiums from the industry rate tables
  // whenever age, coverage, or gender changes. The student can still flip the
  // toggle off to type their own numbers.
  useEffect(() => {
    if (!autoEstimate) return
    if (!isValidNumber(data.age) || !isValidNumber(data.coverage)) return
    const age = toNumber(data.age)
    const coverage = toNumber(data.coverage)
    if (age <= 0 || coverage <= 0) return
    const term = estimateTermPremium(age, coverage, data.gender)
    const whole = estimateWholePremium(age, coverage, data.gender)
    setData((c) => {
      if (c.termPremium === term && c.wholePremium === whole) return c
      return { ...c, termPremium: term, wholePremium: whole }
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoEstimate, data.age, data.coverage, data.gender])

  const validate = (): string | null => {
    if (!isValidNumber(data.age)) return 'Enter your current age'
    if (!isValidNumber(data.coverage)) return 'Enter a coverage amount'
    if (!isValidNumber(data.termPremium)) return 'Enter the term premium'
    if (!isValidNumber(data.wholePremium)) return 'Enter the whole life premium'
    if (!isValidNumber(data.investReturn)) return 'Enter an expected investment return'
    if (!isValidNumber(data.years)) return 'Enter the comparison length in years'
    if (toNumber(data.years) <= 0) return 'Years must be greater than 0'
    if (toNumber(data.wholePremium) < toNumber(data.termPremium))
      return 'Whole life almost always costs more than term — double-check those premiums'
    if (toNumber(data.investReturn) < 0) return 'Return can’t be negative'
    return null
  }

  const runCalc = (showErrors: boolean) => {
    const v = validate()
    if (v) {
      if (showErrors) setError(v)
      return
    }
    setError('')
    const out = compute(data)
    setResults(out.results)
    setChart(out.chart)
  }

  useEffect(() => {
    runCalc(false)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data])

  const update = <K extends keyof InsuranceData>(field: K, value: InsuranceData[K]) =>
    setData((c) => ({ ...c, [field]: value }))

  return (
    <div className="space-y-5 sm:space-y-6">
      {/* Hero banner */}
      <div
        className="relative overflow-hidden rounded-2xl p-5 sm:p-6 text-white"
        style={{ background: 'linear-gradient(135deg, oklch(0.44 0.14 20), oklch(0.24 0.10 20))' }}
      >
        <div
          className="pointer-events-none absolute inset-0 opacity-10"
          style={{ backgroundImage: 'radial-gradient(circle, white 1px, transparent 1px)', backgroundSize: '18px 18px' }}
        />
        <div className="relative flex items-start gap-3 sm:gap-4">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-white/15 backdrop-blur">
            <Umbrella size={24} weight="fill" />
          </div>
          <div>
            <h2 className="text-lg sm:text-2xl font-bold tracking-tight">Term vs. Whole Life 🥊</h2>
            <p className="mt-1 text-sm sm:text-base text-white/80 max-w-2xl">
              A salesperson may push “permanent” whole life as an investment. Let’s test that claim with the classic
              strategy: <strong>buy cheap term and invest the difference</strong> — then watch the gap.
            </p>
          </div>
        </div>
      </div>

      {/* Inputs */}
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
        <div className="space-y-2">
          <Label htmlFor="ins-age">Current Age</Label>
          <Input
            id="ins-age"
            type="number"
            value={data.age}
            onChange={(e) => update('age', e.target.value === '' ? '' : Number(e.target.value))}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="ins-coverage">Coverage ($)</Label>
          <Input
            id="ins-coverage"
            type="text"
            inputMode="numeric"
            value={formatNumberWithCommas(data.coverage)}
            onChange={(e) => update('coverage', parseFormattedNumber(e.target.value))}
          />
        </div>
        <div className="space-y-2">
          <Label>Gender (for rate estimate)</Label>
          <div className="grid grid-cols-2 gap-2">
            {(['female', 'male'] as Gender[]).map((g) => {
              const active = data.gender === g
              return (
                <button
                  key={g}
                  type="button"
                  onClick={() => update('gender', g)}
                  className="h-11 rounded-lg border text-sm font-medium capitalize transition-colors"
                  style={
                    active
                      ? { background: 'var(--primary)', color: 'var(--primary-foreground)', borderColor: 'var(--primary)' }
                      : { background: 'var(--background)', borderColor: 'var(--border)' }
                  }
                >
                  {g}
                </button>
              )
            })}
          </div>
        </div>
        <div className="space-y-2">
          <Label htmlFor="ins-years">Compare Over (yrs)</Label>
          <Input
            id="ins-years"
            type="number"
            value={data.years}
            onChange={(e) => update('years', e.target.value === '' ? '' : Number(e.target.value))}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="ins-term" className="flex items-center justify-between">
            <span>Term Premium ($/mo)</span>
            {autoEstimate && <span className="text-[10px] font-medium uppercase tracking-wide text-accent-foreground/70">auto</span>}
          </Label>
          <Input
            id="ins-term"
            type="text"
            inputMode="numeric"
            value={formatNumberWithCommas(data.termPremium)}
            onChange={(e) => update('termPremium', parseFormattedNumber(e.target.value))}
            readOnly={autoEstimate}
            className={autoEstimate ? 'bg-muted/50 cursor-not-allowed' : ''}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="ins-whole" className="flex items-center justify-between">
            <span>Whole Life ($/mo)</span>
            {autoEstimate && <span className="text-[10px] font-medium uppercase tracking-wide text-accent-foreground/70">auto</span>}
          </Label>
          <Input
            id="ins-whole"
            type="text"
            inputMode="numeric"
            value={formatNumberWithCommas(data.wholePremium)}
            onChange={(e) => update('wholePremium', parseFormattedNumber(e.target.value))}
            readOnly={autoEstimate}
            className={autoEstimate ? 'bg-muted/50 cursor-not-allowed' : ''}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="ins-return">Invest Return (%)</Label>
          <div className="relative">
            <Input
              id="ins-return"
              type="number"
              step="0.1"
              value={data.investReturn}
              onChange={(e) => update('investReturn', e.target.value === '' ? '' : Number(e.target.value))}
              className="pr-8"
            />
            <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none text-sm text-muted-foreground">
              %
            </div>
          </div>
        </div>
      </div>

      {/* Auto-estimate toggle */}
      <div className="flex items-start gap-3 rounded-xl border border-accent/30 bg-accent/5 p-3 sm:p-4">
        <Sparkle size={20} weight="fill" className="mt-0.5 shrink-0 text-accent-foreground/80" />
        <div className="flex-1">
          <div className="flex items-center justify-between gap-3">
            <Label htmlFor="auto-estimate" className="cursor-pointer font-semibold">
              Estimate premiums from real 2024 industry rates
            </Label>
            <Switch id="auto-estimate" checked={autoEstimate} onCheckedChange={setAutoEstimate} />
          </div>
          <p className="mt-1 text-xs text-muted-foreground leading-relaxed">
            {autoEstimate ? (
              <>
                Premiums are auto-filled from published average monthly rates by age, coverage &amp; gender — term from
                Fidelity Life&apos;s 20-year level-term chart (LIMRA / Life Happens 2023 Barometer), whole life from
                Ethos&apos;s whole-life chart. Turn off to enter quotes you&apos;ve received yourself.
              </>
            ) : (
              <>Manual mode — type your own quoted premiums. Turn on to auto-fill realistic industry estimates.</>
            )}
          </p>
        </div>
      </div>

      <div className="flex flex-col gap-3">
        <CalculateButton onCalculate={() => runCalc(true)} />
        {error && (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}
      </div>

      {results && (
        <>
          {/* Verdict hero */}
          <Card className="overflow-hidden">
            <CardContent className="pt-6">
              <div className="flex flex-col items-center text-center gap-2">
                <span className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-3 py-1 text-xs font-bold uppercase tracking-wide text-primary">
                  <Trophy size={14} weight="fill" /> Buy term &amp; invest the difference
                </span>
                <div className="figure-hero text-gradient-brand text-4xl sm:text-6xl">
                  {formatCurrency(results.buyTermInvestPot)}
                </div>
                <p className="max-w-xl text-sm sm:text-base text-muted-foreground">
                  By investing the{' '}
                  <strong className="text-foreground">{formatCurrency(results.monthlyDifference)}/mo</strong> you’d save
                  vs. whole life, you could build this pot in {toNumber(data.years)} years — versus an estimated{' '}
                  <strong className="currency-red">{formatCurrency(results.wholeCashValue)}</strong> of whole-life cash
                  value.
                </p>
                <div className="mt-1 flex flex-wrap items-center justify-center gap-2 text-xs sm:text-sm">
                  <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-card px-3 py-1">
                    <ShieldCheck size={14} weight="fill" style={{ color: CHART_COLORS.emerald }} />
                    Term <strong className="text-foreground">{formatCurrency(toNumber(data.termPremium))}/mo</strong>
                  </span>
                  <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-card px-3 py-1">
                    <Warning size={14} weight="fill" className="text-destructive" />
                    Whole <strong className="text-foreground">{formatCurrency(toNumber(data.wholePremium))}/mo</strong>
                  </span>
                  <span className="text-muted-foreground">
                    for {formatCurrency(toNumber(data.coverage))} at age {toNumber(data.age)}
                    {autoEstimate && <> · <span className="text-accent-foreground/80">industry estimate</span></>}
                  </span>
                </div>
                {results.potAdvantage > 0 && (
                  <span className="mt-1 inline-flex items-center gap-1.5 rounded-full bg-accent/15 px-3 py-1 text-sm font-semibold text-accent-foreground">
                    <ShieldCheck size={16} weight="fill" /> That’s about {formatCurrency(results.potAdvantage)} more in
                    your pocket
                  </span>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Side by side */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Card className="border-2" style={{ borderColor: CHART_COLORS.emerald }}>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span className="flex items-center gap-2">
                    <ShieldCheck size={20} weight="fill" style={{ color: CHART_COLORS.emerald }} /> Term + Investing
                  </span>
                  <span className="rounded-full px-2 py-0.5 text-xs font-bold text-white" style={{ background: CHART_COLORS.emerald }}>
                    SMART
                  </span>
                </CardTitle>
              </CardHeader>
              <CardContent className="divide-y divide-border/40">
                <div className="flex justify-between py-2.5">
                  <span className="text-muted-foreground">Premiums paid</span>
                  <span className="font-semibold">{formatCurrency(results.termTotalPaid)}</span>
                </div>
                <div className="flex justify-between py-2.5">
                  <span className="text-muted-foreground">Invested the difference</span>
                  <span className="font-semibold currency-orange">{formatCurrency(results.totalDifferenceInvested)}</span>
                </div>
                <div className="flex justify-between py-2.5">
                  <span className="text-muted-foreground">Investment growth</span>
                  <span className="font-semibold currency-green">{formatCurrency(results.growthFromDifference)}</span>
                </div>
                <div className="flex justify-between py-2.5">
                  <span className="font-semibold">You walk away with</span>
                  <span className="font-bold currency-green">{formatCurrency(results.buyTermInvestPot)}</span>
                </div>
              </CardContent>
            </Card>

            <Card className="border-2 border-destructive/40">
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span className="flex items-center gap-2">
                    <Warning size={20} weight="fill" className="text-destructive" /> Whole / Permanent Life
                  </span>
                  <span className="rounded-full bg-destructive px-2 py-0.5 text-xs font-bold text-white">COSTLY</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="divide-y divide-border/40">
                <div className="flex justify-between py-2.5">
                  <span className="text-muted-foreground">Premiums paid</span>
                  <span className="font-semibold">{formatCurrency(results.wholeTotalPaid)}</span>
                </div>
                <div className="flex justify-between py-2.5">
                  <span className="text-muted-foreground">Costs vs. term</span>
                  <span className="font-semibold currency-red">{results.coverageMultiple.toFixed(1)}× more</span>
                </div>
                <div className="flex justify-between py-2.5">
                  <span className="text-muted-foreground">Est. cash value</span>
                  <span className="font-semibold currency-red">{formatCurrency(results.wholeCashValue)}</span>
                </div>
                <div className="flex justify-between py-2.5">
                  <span className="font-semibold">You walk away with</span>
                  <span className="font-bold currency-red">{formatCurrency(results.wholeCashValue)}</span>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Chart */}
          <Card>
            <CardHeader>
              <CardTitle>Your “invest the difference” pot grows</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-64 sm:h-80 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={chart} margin={{ left: 10, right: 5, top: 5, bottom: 5 }}>
                    <defs>
                      <linearGradient id="potFill" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor={CHART_COLORS.emerald} stopOpacity={0.7} />
                        <stop offset="100%" stopColor={CHART_COLORS.emerald} stopOpacity={0.08} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="age" fontSize={12} tickFormatter={(v) => `${v}`} />
                    <YAxis tickFormatter={compactAxis} fontSize={12} width={48} />
                    <Tooltip
                      formatter={(value: number) => [formatCurrency(value), 'Investment pot']}
                      labelFormatter={(label) => `Age ${label}`}
                    />
                    <Legend fontSize={12} />
                    <Area
                      type="monotone"
                      dataKey="invested"
                      stroke={CHART_COLORS.emerald}
                      strokeWidth={2}
                      fill="url(#potFill)"
                      name="Invest-the-difference pot"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          {/* Comparison table */}
          <Card>
            <CardHeader>
              <CardTitle>Head-to-head</CardTitle>
            </CardHeader>
            <CardContent className="px-0 sm:px-6">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left font-semibold p-3"></th>
                      <th className="text-left font-semibold p-3" style={{ color: CHART_COLORS.emerald }}>
                        Term + Invest
                      </th>
                      <th className="text-left font-semibold p-3 text-destructive">Whole Life</th>
                    </tr>
                  </thead>
                  <tbody>
                    {comparisonRows.map((row) => (
                      <tr key={row.label} className="border-b last:border-0">
                        <td className="p-3 font-medium align-top">{row.label}</td>
                        <td className="p-3 align-top">
                          <span className="flex items-start gap-1.5">
                            <Check size={16} weight="bold" className="mt-0.5 shrink-0" style={{ color: CHART_COLORS.emerald }} />
                            <span className="text-muted-foreground">{row.term}</span>
                          </span>
                        </td>
                        <td className="p-3 align-top">
                          <span className="flex items-start gap-1.5">
                            <X size={16} weight="bold" className="mt-0.5 shrink-0 text-destructive" />
                            <span className="text-muted-foreground">{row.whole}</span>
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>

          {/* Key lesson */}
          <Card className="bg-accent/5 border-accent/20">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">💡 The takeaway</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="leading-relaxed font-medium">
                Insurance and investing are two different jobs — bundling them is where whole life gets expensive. The
                low-cost play is to <strong>buy term</strong> for the years people actually depend on your income (raising
                kids, paying a mortgage) and <strong>invest the difference</strong> in low-cost index funds. By the time
                your term ends, you’re <em>self-insured</em>: the kids are grown, the house is paid, and your investments
                stand on their own. Whole life makes sense for a small set of niche situations — for most 20-somethings,
                it isn’t one of them.
              </p>
            </CardContent>
          </Card>

          <p className="text-xs text-muted-foreground leading-relaxed">
            Educational estimate only. Whole-life cash value is approximated (real policies vary widely and are often
            slower to build value early on); investment growth assumes a steady average return compounded monthly. Actual
            premiums depend on health, insurer, and policy. This isn’t individualized financial or insurance advice.
          </p>
        </>
      )}
    </div>
  )
}
