import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts'
import { CalculateButton } from '@/components/ui/calculate-button'
import { NumericOrEmpty, isValidNumber, toNumber, formatFieldName } from '@/lib/calculator-validation'
import { formatCurrency, formatNumberWithCommas, parseFormattedNumber } from '@/lib/formatters'
import { CHART_COLORS } from '@/lib/chart-colors'

interface TVMData {
  periods: NumericOrEmpty
  interestRate: NumericOrEmpty
  presentValue: NumericOrEmpty
  payment: NumericOrEmpty
  futureValue: NumericOrEmpty
  solveFor: 'periods' | 'interestRate' | 'presentValue' | 'payment' | 'futureValue'
}

interface ChartDataPoint {
  period: number
  principal: number
  interest: number
}

interface ProjectionInputs {
  periods: number
  interestRate: number
  presentValue: number
  payment: number
}

interface ProjectionSummary {
  totalPrincipal: number
  totalInterest: number
  totalFutureValue: number
}

function buildProjectionData({
  periods,
  interestRate,
  presentValue,
  payment,
}: ProjectionInputs): { chartData: ChartDataPoint[]; summary: ProjectionSummary | null } {
  const rate = interestRate / 100
  const totalPeriods = Math.floor(periods)

  if (totalPeriods <= 0 || rate < 0) {
    return { chartData: [], summary: null }
  }

  const chartDataPoints: ChartDataPoint[] = []
  const chartStep = Math.max(1, Math.ceil(totalPeriods / 120))
  let principalContribution = Math.abs(presentValue)
  let totalInterest = 0

  chartDataPoints.push({
    period: 0,
    principal: principalContribution,
    interest: 0,
  })

  for (let period = 1; period <= totalPeriods; period++) {
    if (rate === 0) {
      principalContribution += Math.abs(payment)
    } else {
      const currentValue = principalContribution + totalInterest
      const interestEarned = currentValue * rate
      totalInterest += interestEarned
      principalContribution += Math.abs(payment)
    }

    if (period % chartStep === 0 || period === totalPeriods) {
      chartDataPoints.push({
        period,
        principal: principalContribution,
        interest: totalInterest,
      })
    }
  }

  const summary = {
    totalPrincipal: principalContribution,
    totalInterest,
    totalFutureValue: principalContribution + totalInterest,
  }

  return { chartData: chartDataPoints, summary }
}

export function TimeValueOfMoneyCalculator() {
  const [data, setData] = useState<TVMData>({
    periods: 20,
    interestRate: 8,
    presentValue: -5000,
    payment: -6000,
    futureValue: 1000000,
    solveFor: 'futureValue'
  })

  const [result, setResult] = useState<number | null>(null)
  const [error, setError] = useState('')
  const [chartData, setChartData] = useState<ChartDataPoint[]>([])
  const [projectionSummary, setProjectionSummary] = useState<ProjectionSummary | null>(null)

  const formatCurrencyLocal = (amount: number): string => formatCurrency(Math.abs(amount))







  // Newton-Raphson method for solving interest rate
  const solveForRate = (n: number, pv: number, pmt: number, fv: number): number => {
    let rate = 0.1 // Initial guess
    const tolerance = 1e-6
    const maxIterations = 100

    for (let i = 0; i < maxIterations; i++) {
      if (rate === 0) {
        // Handle zero rate case
        const f = pv + pmt * n + fv
        if (Math.abs(f) < tolerance) return 0
        rate = 0.001 // Small non-zero value
        continue
      }

      const factor = Math.pow(1 + rate, n)
      const f = pv * factor + pmt * ((factor - 1) / rate) + fv
      const df = pv * n * Math.pow(1 + rate, n - 1) + 
                 pmt * (n * Math.pow(1 + rate, n - 1) / rate - (factor - 1) / (rate * rate))

      if (Math.abs(f) < tolerance) return rate * 100
      if (Math.abs(df) < tolerance) break

      rate = rate - f / df

      if (rate < -0.99) rate = -0.99 // Prevent rate from going below -100%
    }

    return rate * 100
  }

  // Newton-Raphson method for solving periods
  const solveForPeriods = (rate: number, pv: number, pmt: number, fv: number): number => {
    const r = rate / 100
    
    if (r === 0) {
      // Simple case when interest rate is 0
      if (pmt === 0) return NaN
      return -(pv + fv) / pmt
    }

    let n = 10 // Initial guess
    const tolerance = 1e-6
    const maxIterations = 100

    for (let i = 0; i < maxIterations; i++) {
      const factor = Math.pow(1 + r, n)
      const f = pv * factor + pmt * ((factor - 1) / r) + fv
      const df = pv * factor * Math.log(1 + r) + 
                 pmt * (factor * Math.log(1 + r) / r)

      if (Math.abs(f) < tolerance) return n
      if (Math.abs(df) < tolerance) break

      n = n - f / df

      if (n < 0) n = 0.1 // Keep periods positive
    }

    return n
  }

  const calculate = () => {
    setError('')
    setResult(null)
    setChartData([])
    setProjectionSummary(null)

    const validationError = validateInputs()
    if (validationError) {
      setError(validationError)
      return
    }

    try {
      const periods = toNumber(data?.periods ?? 0)
      const interestRate = toNumber(data?.interestRate ?? 0)
      const presentValue = toNumber(data?.presentValue ?? 0)
      const payment = toNumber(data?.payment ?? 0)
      const futureValue = toNumber(data?.futureValue ?? 0)
      const { solveFor } = data!
      const rate = interestRate / 100
      let solvedValue: number | null = null

      switch (solveFor) {
        case 'futureValue': {
          let result: number
          if (rate === 0) {
            result = -(presentValue + payment * periods)
          } else {
            const factor = Math.pow(1 + rate, periods)
            result = -(presentValue * factor + payment * ((factor - 1) / rate))
          }
          solvedValue = result
          break
        }

        case 'presentValue': {
          let result: number
          if (rate === 0) {
            result = -(futureValue + payment * periods)
          } else {
            const factor = Math.pow(1 + rate, periods)
            result = -(futureValue + payment * ((factor - 1) / rate)) / factor
          }
          solvedValue = result
          break
        }

        case 'payment': {
          let result: number
          if (rate === 0) {
            result = -(presentValue + futureValue) / periods
          } else {
            const factor = Math.pow(1 + rate, periods)
            result = -(presentValue * factor + futureValue) / ((factor - 1) / rate)
          }
          solvedValue = result
          break
        }

        case 'interestRate': {
          const result = solveForRate(periods, presentValue, payment, futureValue)
          if (isNaN(result)) {
            setError('Unable to solve for interest rate with given values')
            return
          } else {
            solvedValue = result
          }
          break
        }

        case 'periods': {
          const result = solveForPeriods(interestRate, presentValue, payment, futureValue)
          if (isNaN(result) || result < 0) {
            setError('Unable to solve for periods with given values')
            return
          } else {
            solvedValue = result
          }
          break
        }
      }

      if (solvedValue === null) return

      setResult(solvedValue)

      const projectionInputs: ProjectionInputs = {
        periods,
        interestRate,
        presentValue,
        payment,
      }

      if (solveFor === 'periods') projectionInputs.periods = solvedValue
      if (solveFor === 'interestRate') projectionInputs.interestRate = solvedValue
      if (solveFor === 'presentValue') projectionInputs.presentValue = solvedValue
      if (solveFor === 'payment') projectionInputs.payment = solvedValue

      const projection = buildProjectionData(projectionInputs)
      setChartData(projection.chartData)
      setProjectionSummary(projection.summary)
    } catch (err) {
      setError('Calculation error. Please check your inputs.')
    }
  }

  const validateInputs = (): string | null => {
    const requiredFields = ['periods', 'interestRate', 'presentValue', 'payment', 'futureValue'] as const
    const fieldsToValidate = requiredFields.filter(field => field !== data?.solveFor)

    for (const field of fieldsToValidate) {
      const value = data?.[field]
      if (!isValidNumber(value)) {
        return `Please enter a valid ${formatFieldName(field)}`
      }
    }

    return null
  }

  const updateData = (field: keyof TVMData, value: NumericOrEmpty | string) => {
    setData(current => {
      const safeCurrent: TVMData = {
        periods: current?.periods ?? '',
        interestRate: current?.interestRate ?? '',
        presentValue: current?.presentValue ?? '',
        payment: current?.payment ?? '',
        futureValue: current?.futureValue ?? '',
        solveFor: current?.solveFor ?? 'futureValue',
      };
      return { ...safeCurrent, [field]: value };
    });
    
    // Clear results when 'solve for' selector changes
    if (field === 'solveFor') {
      setResult(null);
      setError('');
      setChartData([]);
      setProjectionSummary(null);
    }
  }

  const formatResult = () => {
    if (result === null) return 'N/A'
    
    switch (data!.solveFor) {
      case 'interestRate':
        return `${result.toFixed(2)}%`
      case 'periods':
        return `${result.toFixed(1)} periods`
      default:
        return formatCurrencyLocal(result)
    }
  }

  const getInputValue = (field: keyof TVMData) => {
    if (data!.solveFor === field) return ''
    return data![field]
  }

  const isFieldDisabled = (field: keyof TVMData) => {
    return data!.solveFor === field
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Input Section */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <div className="space-y-2">
          <Label htmlFor="solve-for">Solve For</Label>
          <Select value={data!.solveFor} onValueChange={(value) => updateData('solveFor', value)}>
            <SelectTrigger id="solve-for">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="periods">Periods (N)</SelectItem>
              <SelectItem value="interestRate">Interest Rate (%)</SelectItem>
              <SelectItem value="presentValue">Present Value (PV)</SelectItem>
              <SelectItem value="payment">Payment (PMT)</SelectItem>
              <SelectItem value="futureValue">Future Value (FV)</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="periods">Number of Periods (N)</Label>
          <Input
            id="periods"
            type="number"
            value={getInputValue('periods')}
            onChange={(e) => updateData('periods', e.target.value === '' ? '' : Number(e.target.value))}
            disabled={isFieldDisabled('periods')}
            placeholder={isFieldDisabled('periods') ? 'Solving for Number of Periods (N)' : ''}
            className={isFieldDisabled('periods') ? 'input-solving' : ''}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="interest-rate">Interest Rate (% per period)</Label>
          <div className="relative">
            <Input
              id="interest-rate"
              type="number"
              step="0.1"
              value={getInputValue('interestRate')}
              onChange={(e) => updateData('interestRate', e.target.value === '' ? '' : Number(e.target.value))}
              disabled={isFieldDisabled('interestRate')}
              placeholder={isFieldDisabled('interestRate') ? 'Solving For Interest Rate' : ''}
              className={`${isFieldDisabled('interestRate') ? 'input-solving' : ''} pr-8`}
            />
            <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none text-sm text-muted-foreground">
              %
            </div>
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="present-value">Present Value (PV) - Cash Outflow Negative</Label>
          <Input
            id="present-value"
            type="text"
            value={formatNumberWithCommas(getInputValue('presentValue'))}
            onChange={(e) => updateData('presentValue', parseFormattedNumber(e.target.value))}
            disabled={isFieldDisabled('presentValue')}
            placeholder={isFieldDisabled('presentValue') ? 'Solving For Present Value (PV)' : ''}
            className={isFieldDisabled('presentValue') ? 'input-solving' : ''}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="payment">Payment (PMT) - Cash Outflow Negative</Label>
          <Input
            id="payment"
            type="text"
            value={formatNumberWithCommas(getInputValue('payment'))}
            onChange={(e) => updateData('payment', parseFormattedNumber(e.target.value))}
            disabled={isFieldDisabled('payment')}
            placeholder={isFieldDisabled('payment') ? 'Solving For Payment (PMT)' : ''}
            className={isFieldDisabled('payment') ? 'input-solving' : ''}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="future-value">Future Value (FV)</Label>
          <Input
            id="future-value"
            type="text"
            value={formatNumberWithCommas(getInputValue('futureValue'))}
            onChange={(e) => updateData('futureValue', parseFormattedNumber(e.target.value))}
            disabled={isFieldDisabled('futureValue')}
            placeholder={isFieldDisabled('futureValue') ? 'Solving For Future Value (FV)' : ''}
            className={isFieldDisabled('futureValue') ? 'input-solving' : ''}
          />
        </div>
      </div>

      {/* Calculate Button */}
      <CalculateButton onCalculate={calculate} />

      {/* Results and Instructions Section Side by Side */}
      <div className="flex flex-col md:flex-row gap-6">
        <Card className="w-full md:w-1/3">
          <CardHeader>
            <CardTitle>
              {(() => {
                switch (data!.solveFor) {
                  case 'periods': return 'Periods (N)';
                  case 'interestRate': return 'Interest Rate (%)';
                  case 'presentValue': return 'Present Value (PV)';
                  case 'payment': return 'Payment (PMT)';
                  case 'futureValue': return 'Future Value (FV)';
                  default: return 'Result';
                }
              })()}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-1">
            {error ? (
              <div className="text-destructive font-semibold">{error}</div>
            ) : (
              <>
                <div className="text-2xl font-semibold pb-2">
                  {formatResult()}
                </div>
                {projectionSummary && (
                  <div className="divide-y divide-border/40 border-t border-border/40">
                    <div className="py-2 flex justify-between items-baseline">
                      <span className="text-xs text-muted-foreground">Total Principal</span>
                      <span className="font-semibold text-sm" style={{ color: CHART_COLORS.blue }}>
                        {formatCurrencyLocal(projectionSummary.totalPrincipal)}
                      </span>
                    </div>
                    <div className="py-2 flex justify-between items-baseline">
                      <span className="text-xs text-muted-foreground">Interest Earned</span>
                      <span className="font-semibold text-sm" style={{ color: CHART_COLORS.emerald }}>
                        {formatCurrencyLocal(projectionSummary.totalInterest)}
                      </span>
                    </div>
                    <div className="py-2 flex justify-between items-baseline">
                      <span className="text-xs text-muted-foreground">Total Future Value</span>
                      <span className="font-semibold">
                        {formatCurrencyLocal(projectionSummary.totalFutureValue)}
                      </span>
                    </div>
                  </div>
                )}
              </>
            )}
          </CardContent>
        </Card>
        <Card className="w-full md:w-2/3">
          <CardContent>
            <div className="space-y-2">
              <p><strong>Cash Flow Convention:</strong> Use negative values for cash outflows (money you pay) and positive values for cash inflows (money you receive).</p><br />
              <p><strong>Investment Example:</strong></p>
              <ul className="list-disc list-inside ml-4 space-y-1">
                <li>PV: Initial investment: Use negative (e.g., -10,000)</li>
                <li>PMT: Additional investment per period: Use negative (e.g., -500)</li> 
                </ul>
              <p><strong>Loan Example:</strong></p>
              <ul className="list-disc list-inside ml-4 space-y-1">
                <li>PV: Amount of Loan: Use positive (e.g., 10,000)</li>
                <li>PMT: Total of Payments made per period: Use negative (e.g., -500)</li>
              </ul>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Growth Visualization Chart */}
      {chartData.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Growth Visualization Over Time</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64 sm:h-80 w-full ml-0 sm:ml-2">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData} margin={{ left: 20, right: 5, top: 5, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis 
                    dataKey="period" 
                    label={{ value: 'Periods (N)', position: 'insideBottom', offset: -5 }} 
                  />
                  <YAxis 
                    tickFormatter={(value) => `$${(value/1000).toFixed(0)}k`}
                    label={{ value: 'Amount', angle: -90, position: 'insideLeft' }} 
                  />
                  <Tooltip 
                    formatter={(value: number, name: string) => [
                      `$${value.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`,
                      name === 'principal' ? 'Principal' : 'Interest Earned'
                    ]}
                    labelFormatter={(period) => `Period ${period}`}
                    content={({ active, payload, label }) => {
                      if (active && payload && payload.length) {
                        const principal = payload.find(p => p.dataKey === 'principal')?.value as number || 0;
                        const interest = payload.find(p => p.dataKey === 'interest')?.value as number || 0;
                        const total = principal + interest;
                        
                        return (
                          <div className="bg-popover p-3 border border-border rounded-lg shadow-lg text-foreground">
                            <p className="font-semibold mb-1">{`Period ${label}`}</p>
                            <p style={{ color: CHART_COLORS.blue }}>{`Principal: $${principal.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`}</p>
                            <p style={{ color: CHART_COLORS.emerald }}>{`Interest Earned: $${interest.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`}</p>
                            <p className="font-semibold border-t border-border pt-1 mt-1">{`Total: $${total.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`}</p>
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                  <Legend />
                  <Area 
                    type="monotone" 
                    dataKey="principal" 
                    stackId="1"
                    stroke={CHART_COLORS.blue} 
                    fill={CHART_COLORS.blue} 
                    fillOpacity={0.8}
                    name="Principal"
                  />
                  <Area 
                    type="monotone" 
                    dataKey="interest" 
                    stackId="1"
                    stroke={CHART_COLORS.emerald} 
                    fill={CHART_COLORS.emerald}
                    fillOpacity={0.8}
                    name="Interest Earned"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      )}

        <Card>
          <CardHeader>
            <CardTitle>Understanding the Time Value of Money</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="leading-relaxed">
              The time value of money means a dollar today is worth more than a dollar in the future 
              because it can grow through interest or investment. This concept shows that the earlier 
              you start saving, the less you need to set aside to reach your goals. It helps you 
              calculate how much to save, based on a given interest rate, to meet future financial needs.
            </p>
          </CardContent>
        </Card>




      {/* Key Lesson Section */}
      <Card className="bg-accent/5 border-accent/20">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            💡 Key Lesson
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="leading-relaxed font-medium">
            <strong>Time is your most valuable financial asset.</strong> The time value of money is the foundation of all personal finance decisions. 
            Whether saving for retirement, a house, or any major purchase, understanding that money grows over time can motivate you to make smarter choices. 
            It explains why paying off high-interest debt quickly is crucial and why starting to save early is so powerful. 
            Master this concept, and you'll understand why wealthy people often say that "time is money."
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
