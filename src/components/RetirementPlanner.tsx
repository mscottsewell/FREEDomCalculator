import { useState, useEffect } from 'react'
import { useLocalStorage } from '@/hooks/useLocalStorage'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Alert, AlertDescription } from '@/components/ui/alert'
import {
  ComposedChart,
  Area,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts'
import { CalculateButton } from '@/components/ui/calculate-button'
import {
  Island,
  Rocket,
  HourglassHigh,
  CheckCircle,
  Sparkle,
  PiggyBank,
  TrendUp,
  Coins,
} from '@phosphor-icons/react'
import { NumericOrEmpty, isValidNumber, toNumber } from '@/lib/calculator-validation'
import { formatCurrency, formatNumberWithCommas, parseFormattedNumber } from '@/lib/formatters'
import { CHART_COLORS } from '@/lib/chart-colors'

interface RetirementData {
  currentAge: NumericOrEmpty
  retirementAge: NumericOrEmpty
  currentSavings: NumericOrEmpty
  monthlyContribution: NumericOrEmpty
  annualReturn: NumericOrEmpty
  annualIncrease: NumericOrEmpty
}

interface ChartPoint {
  age: number
  contributions: number
  growth: number
  waitBalance: number
}

interface Results {
  nestEgg: number
  totalContributed: number
  growth: number
  monthlyIncome: number
  waitYears: number
  nestEggWait: number
  waitDifference: number
  headStart: number
  firstMillionAge: number | null
}

function project(d: RetirementData): { results: Results; chart: ChartPoint[] } {
  const currentAge = toNumber(d.currentAge)
  const retirementAge = toNumber(d.retirementAge)
  const currentSavings = toNumber(d.currentSavings)
  const monthly = toNumber(d.monthlyContribution)
  const annualReturn = toNumber(d.annualReturn)
  const g = toNumber(d.annualIncrease) / 100

  const years = retirementAge - currentAge
  const mRate = annualReturn / 100 / 12

  // Month-by-month simulation. The monthly contribution starts at `monthly` and
  // steps up by `g` each full year (e.g. raises). Returns the balance and the
  // total amount contributed (principal) after `yrs` years. With g = 0 this
  // exactly reproduces the standard lump-sum + ordinary-annuity formulas.
  const simulate = (yrs: number) => {
    let balance = currentSavings
    let contributed = currentSavings
    const months = Math.max(0, Math.round(yrs * 12))
    for (let m = 0; m < months; m++) {
      const yearIndex = Math.floor(m / 12)
      const thisMonthly = monthly * Math.pow(1 + g, yearIndex)
      balance = balance * (1 + mRate) + thisMonthly
      contributed += thisMonthly
    }
    return { balance, contributed }
  }

  const final = simulate(years)
  const nestEgg = final.balance
  const totalContributed = final.contributed
  const growth = Math.max(0, nestEgg - totalContributed)
  const monthlyIncome = (nestEgg * 0.04) / 12

  const waitYears = Math.min(10, Math.max(1, years - 1))
  const nestEggWait = simulate(Math.max(0, years - waitYears)).balance
  const waitDifference = Math.max(0, nestEgg - nestEggWait)
  const headStart = nestEggWait > 0 ? nestEgg / nestEggWait : 0

  const chart: ChartPoint[] = []
  let firstMillionAge: number | null = null
  for (let y = 0; y <= years; y++) {
    const { balance, contributed } = simulate(y)
    const gr = Math.max(0, balance - contributed)
    const elapsed = y - waitYears
    const waitBalance = elapsed > 0 ? simulate(elapsed).balance : 0
    chart.push({ age: currentAge + y, contributions: contributed, growth: gr, waitBalance })
    if (firstMillionAge === null && balance >= 1_000_000) firstMillionAge = currentAge + y
  }

  return {
    results: {
      nestEgg,
      totalContributed,
      growth,
      monthlyIncome,
      waitYears,
      nestEggWait,
      waitDifference,
      headStart,
      firstMillionAge,
    },
    chart,
  }
}

const compactAxis = (v: number) => {
  if (Math.abs(v) >= 1_000_000) return `$${(v / 1_000_000).toFixed(1)}M`
  if (Math.abs(v) >= 1_000) return `$${Math.round(v / 1_000)}k`
  return `$${v}`
}

const actionSteps = [
  {
    title: 'Grab the free money first',
    body: 'If your job offers a 401(k) match, contribute enough to get all of it. A 100% match is an instant, guaranteed double — nothing else comes close.',
  },
  {
    title: 'Open a Roth IRA',
    body: 'You pay tax now (while your income is low) and every dollar of growth comes out tax-free later. Starting one in your 20s is a cheat code.',
  },
  {
    title: 'Automate it',
    body: 'Set an auto-transfer the day after payday. Pay Future You before you can spend it — you won’t miss what you never see.',
  },
  {
    title: 'Keep fees tiny',
    body: 'Low-cost, broad index funds keep more of the growth in your pocket. A 1% fee can quietly eat a quarter of your nest egg.',
  },
  {
    title: 'Level up 2% a year',
    body: 'Bump your contribution by about 2% each year or with every raise — it roughly keeps pace with inflation and then some. You’ll barely feel it now, but Future You will feel it a lot.',
  },
]

const isRetirementData = (v: unknown): v is RetirementData =>
  typeof v === 'object' && v !== null &&
  ['currentAge', 'retirementAge', 'currentSavings', 'monthlyContribution', 'annualReturn', 'annualIncrease'].every(k => {
    const x = (v as Record<string, unknown>)[k]
    return x === '' || typeof x === 'number'
  })

export function RetirementPlanner() {
  const [data, setData] = useLocalStorage<RetirementData>('retirement-planner', {
    currentAge: 20,
    retirementAge: 65,
    currentSavings: 1000,
    monthlyContribution: 200,
    annualReturn: 8,
    annualIncrease: 2,
  }, isRetirementData)
  const [results, setResults] = useState<Results | null>(null)
  const [chart, setChart] = useState<ChartPoint[]>([])
  const [error, setError] = useState('')

  const validate = (): string | null => {
    if (!isValidNumber(data.currentAge)) return 'Enter your current age'
    if (!isValidNumber(data.retirementAge)) return 'Enter a target retirement age'
    if (!isValidNumber(data.currentSavings)) return 'Enter your current savings (0 is fine!)'
    if (!isValidNumber(data.monthlyContribution)) return 'Enter a monthly contribution'
    if (!isValidNumber(data.annualReturn)) return 'Enter an expected annual return'
    if (!isValidNumber(data.annualIncrease)) return 'Enter an annual increase (0 is fine!)'

    const ca = toNumber(data.currentAge)
    const ra = toNumber(data.retirementAge)
    if (ca < 10 || ca > 90) return 'Current age should be between 10 and 90'
    if (ra <= ca) return 'Retirement age must be greater than your current age'
    if (ra > 100) return 'Retirement age should be 100 or less'
    if (toNumber(data.annualReturn) < 0) return 'Return can’t be negative'
    if (toNumber(data.annualIncrease) < 0) return 'Annual increase can’t be negative'
    if (toNumber(data.monthlyContribution) < 0) return 'Contribution can’t be negative'
    if (toNumber(data.currentSavings) < 0) return 'Savings can’t be negative'
    return null
  }

  const runCalc = (showErrors: boolean) => {
    const v = validate()
    if (v) {
      if (showErrors) setError(v)
      return
    }
    setError('')
    const out = project(data)
    setResults(out.results)
    setChart(out.chart)
  }

  // Live update so the page is never empty — friendly, no error nagging while typing
  useEffect(() => {
    runCalc(false)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data])

  const update = (field: keyof RetirementData, value: NumericOrEmpty | string) =>
    setData((c) => ({ ...c, [field]: value }))

  return (
    <div className="space-y-5 sm:space-y-6">
      {/* Hero banner */}
      <div
        className="relative overflow-hidden rounded-2xl p-4 sm:p-5 text-white"
        style={{ background: 'linear-gradient(135deg, oklch(0.32 0.15 162), oklch(0.16 0.09 162))' }}
      >
        <div
          className="pointer-events-none absolute inset-0 opacity-10"
          style={{ backgroundImage: 'radial-gradient(circle, white 1px, transparent 1px)', backgroundSize: '18px 18px' }}
        />
        <div className="relative flex items-start gap-3 sm:gap-4">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white/15 backdrop-blur">
            <Island size={24} weight="fill" />
          </div>
          <div>
            <h2 className="text-base sm:text-xl font-bold tracking-tight">Meet Future You 👋</h2>
            <p className="mt-0.5 text-xs sm:text-sm text-white/80 max-w-none">
              Your biggest money advantage isn’t a hot stock — it’s <strong>time</strong>. See what investing a
              little, starting <em>right now</em>, snowballs into by the time you kick back and retire.
            </p>
          </div>
        </div>
      </div>

      {/* Inputs */}
      <div className="grid grid-cols-2 lg:grid-cols-6 gap-4">
        <div className="space-y-2">
          <Label htmlFor="current-age">Current Age</Label>
          <Input
            id="current-age"
            type="number"
            value={data.currentAge}
            onChange={(e) => update('currentAge', e.target.value === '' ? '' : Number(e.target.value))}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="retirement-age">Retire At</Label>
          <Input
            id="retirement-age"
            type="number"
            value={data.retirementAge}
            onChange={(e) => update('retirementAge', e.target.value === '' ? '' : Number(e.target.value))}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="current-savings">Saved So Far ($)</Label>
          <Input
            id="current-savings"
            type="text"
            inputMode="numeric"
            value={formatNumberWithCommas(data.currentSavings)}
            onChange={(e) => update('currentSavings', parseFormattedNumber(e.target.value))}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="monthly-contribution">Monthly ($)</Label>
          <Input
            id="monthly-contribution"
            type="text"
            inputMode="numeric"
            value={formatNumberWithCommas(data.monthlyContribution)}
            onChange={(e) => update('monthlyContribution', parseFormattedNumber(e.target.value))}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="annual-increase">Yearly Raise (%)</Label>
          <div className="relative">
            <Input
              id="annual-increase"
              type="number"
              step="0.5"
              value={data.annualIncrease}
              onChange={(e) => update('annualIncrease', e.target.value === '' ? '' : Number(e.target.value))}
              className="pr-8"
            />
            <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none text-sm text-muted-foreground">
              %
            </div>
          </div>
        </div>
        <div className="space-y-2">
          <Label htmlFor="annual-return">Return (%)</Label>
          <div className="relative">
            <Input
              id="annual-return"
              type="number"
              step="0.1"
              value={data.annualReturn}
              onChange={(e) => update('annualReturn', e.target.value === '' ? '' : Number(e.target.value))}
              className="pr-8"
            />
            <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none text-sm text-muted-foreground">
              %
            </div>
          </div>
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
          {/* Hero result + stat trio */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 items-stretch">
          <Card className="overflow-hidden h-full">
            <CardContent className="py-4 sm:py-5 h-full flex items-center justify-center">
              <div className="flex flex-col items-center text-center gap-2">
                <span className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-3 py-1 text-xs font-bold uppercase tracking-wide text-primary">
                  <Rocket size={14} weight="fill" /> Future You at {toNumber(data.retirementAge)}
                </span>
                <div className="figure-hero text-gradient-brand text-4xl sm:text-6xl">
                  {formatCurrency(results.nestEgg)}
                </div>
                <p className="max-w-xl text-sm sm:text-base text-muted-foreground">
                  You’d put in <strong className="text-foreground">{formatCurrency(results.totalContributed)}</strong> over
                  the years{toNumber(data.annualIncrease) > 0 && (
                    <> (starting at {formatCurrency(toNumber(data.monthlyContribution))}/mo and stepping up{' '}
                    {toNumber(data.annualIncrease)}% a year)</>
                  )} — the other{' '}
                  <strong className="currency-green">{formatCurrency(results.growth)}</strong> is pure compound growth
                  doing the heavy lifting. 🚀
                </p>
                {results.firstMillionAge && (
                  <span className="mt-1 inline-flex items-center gap-1.5 rounded-full bg-accent/15 px-3 py-1 text-xs font-semibold text-accent-foreground">
                    <Sparkle size={14} weight="fill" /> You’d cross your first $1,000,000 around age{' '}
                    {results.firstMillionAge}
                  </span>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Stat trio */}
          <div className="grid grid-cols-1 gap-4 h-full justify-between">
            <Card>
              <CardContent className="pt-6 flex items-start gap-3">
                <PiggyBank size={26} weight="duotone" className="text-muted-foreground shrink-0" />
                <div>
                  <div className="text-xs font-bold uppercase tracking-wide text-muted-foreground">You contribute</div>
                  <div className="text-xl font-bold currency-orange">{formatCurrency(results.totalContributed)}</div>
                  <div className="text-xs text-muted-foreground mt-0.5">The part that comes from your pocket</div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6 flex items-start gap-3">
                <TrendUp size={26} weight="duotone" className="shrink-0" style={{ color: CHART_COLORS.emerald }} />
                <div>
                  <div className="text-xs font-bold uppercase tracking-wide text-muted-foreground">Compound growth</div>
                  <div className="text-xl font-bold currency-green">{formatCurrency(results.growth)}</div>
                  <div className="text-xs text-muted-foreground mt-0.5">Free money your money earned</div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6 flex items-start gap-3">
                <Coins size={26} weight="duotone" className="shrink-0" style={{ color: CHART_COLORS.blue }} />
                <div>
                  <div className="text-xs font-bold uppercase tracking-wide text-muted-foreground">Retirement income</div>
                  <div className="text-xl font-bold currency-blue">{formatCurrency(results.monthlyIncome)}/mo</div>
                  <div className="text-xs text-muted-foreground mt-0.5">Spendable at the safe 4% rule</div>
                </div>
              </CardContent>
            </Card>
          </div>
          </div>

          {/* Cost of waiting */}
          <Card className="border-destructive/30" style={{ background: 'color-mix(in oklch, var(--destructive) 5%, var(--card))' }}>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-destructive">
                <HourglassHigh size={20} weight="fill" /> The cost of hitting snooze
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="leading-relaxed">
                Wait just <strong>{results.waitYears} years</strong> to start and you’d retire with about{' '}
                <strong>{formatCurrency(results.nestEggWait)}</strong> instead — that’s{' '}
                <strong className="currency-red">{formatCurrency(results.waitDifference)} less</strong> for the exact same
                monthly amount.
                {results.headStart > 1 && (
                  <>
                    {' '}Starting today gives Future You a{' '}
                    <strong>{results.headStart.toFixed(1)}×</strong> head start. The best day to start was years ago — the
                    second best day is today. 💪
                  </>
                )}
              </p>
            </CardContent>
          </Card>

          {/* Chart */}
          <Card>
            <CardHeader>
              <CardTitle>Watch it snowball</CardTitle>
            </CardHeader>
            <CardContent>
              <div
                className="h-64 sm:h-80 w-full"
                role="img"
                aria-label={results ? `Retirement savings chart reaching ${formatCurrency(results.nestEgg)}` : 'Retirement savings projection chart'}
              >
                <ResponsiveContainer width="100%" height="100%">
                  <ComposedChart data={chart} margin={{ left: 10, right: 5, top: 5, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="age" fontSize={12} tickFormatter={(v) => `${v}`} />
                    <YAxis tickFormatter={compactAxis} fontSize={12} width={48} />
                    <Tooltip
                      formatter={(value: number, name: string) => [formatCurrency(value), name]}
                      labelFormatter={(label) => `Age ${label}`}
                    />
                    <Legend fontSize={12} />
                    <Area
                      type="monotone"
                      dataKey="contributions"
                      stackId="1"
                      stroke={CHART_COLORS.blue}
                      fill={CHART_COLORS.blue}
                      name="Your contributions"
                    />
                    <Area
                      type="monotone"
                      dataKey="growth"
                      stackId="1"
                      stroke={CHART_COLORS.emerald}
                      fill={CHART_COLORS.emerald}
                      name="Compound growth"
                    />
                    <Line
                      type="monotone"
                      dataKey="waitBalance"
                      stroke={CHART_COLORS.red}
                      strokeWidth={2}
                      strokeDasharray="5 4"
                      dot={false}
                      name={`If you wait ${results.waitYears} yrs`}
                    />
                  </ComposedChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          {/* Action checklist */}
          <Card className="bg-accent/5 border-accent/20">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">✅ What to do this week</CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-3">
                {actionSteps.map((step) => (
                  <li key={step.title} className="flex items-start gap-3">
                    <CheckCircle size={20} weight="fill" className="mt-0.5 shrink-0" style={{ color: CHART_COLORS.emerald }} />
                    <div>
                      <span className="font-semibold">{step.title}.</span>{' '}
                      <span className="text-muted-foreground">{step.body}</span>
                    </div>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>

          <p className="text-xs text-muted-foreground leading-relaxed">
            Educational estimate only. Assumes a steady average annual return compounded monthly, with monthly
            contributions made at month-end that step up by your “yearly raise” percentage at the start of each year;
            real markets bounce around year to year. The “4% rule” is a common rule-of-thumb for sustainable
            retirement withdrawals, not a guarantee. This isn’t individualized financial advice.
          </p>
        </>
      )}
    </div>
  )
}
