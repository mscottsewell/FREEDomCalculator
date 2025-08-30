import { useState, useEffect } from 'react'
import { useKV } from '@github/spark/hooks'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts'

interface TVMData {
  periods: number
  interestRate: number
  presentValue: number
  payment: number
  futureValue: number
  solveFor: 'periods' | 'interestRate' | 'presentValue' | 'payment' | 'futureValue'
}

interface ChartDataPoint {
  period: number
  principal: number
  interest: number
}

export function TimeValueOfMoneyCalculator() {
  const [data, setData] = useKV<TVMData>('tvm-calculator', {
    periods: 20,
    interestRate: 7.5,
    presentValue: -10000,
    payment: -500,
    futureValue: 0,
    solveFor: 'futureValue'
  })

  const [result, setResult] = useState(null)
  const [error, setError] = useState('')
  const [chartData, setChartData] = useState([])

  const formatCurrency = (amount: number): string => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(Math.abs(amount))
  }

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

    try {
      const { periods: n, interestRate, presentValue: pv, payment: pmt, futureValue: fv, solveFor } = data!
      const rate = interestRate / 100

      switch (solveFor) {
        case 'futureValue': {
          let result: number
          if (rate === 0) {
            result = -(pv + pmt * n)
          } else {
            const factor = Math.pow(1 + rate, n)
            result = -(pv * factor + pmt * ((factor - 1) / rate))
          }
          setResult(result)
          break
        }

        case 'presentValue': {
          let result: number
          if (rate === 0) {
            result = -(fv + pmt * n)
          } else {
            const factor = Math.pow(1 + rate, n)
            result = -(fv + pmt * ((factor - 1) / rate)) / factor
          }
          setResult(result)
          break
        }

        case 'payment': {
          let result: number
          if (rate === 0) {
            result = -(pv + fv) / n
          } else {
            const factor = Math.pow(1 + rate, n)
            result = -(pv * factor + fv) / ((factor - 1) / rate)
          }
          setResult(result)
          break
        }

        case 'interestRate': {
          const result = solveForRate(n, pv, pmt, fv)
          if (isNaN(result)) {
            setError('Unable to solve for interest rate with given values')
          } else {
            setResult(result)
          }
          break
        }

        case 'periods': {
          const result = solveForPeriods(interestRate, pv, pmt, fv)
          if (isNaN(result) || result < 0) {
            setError('Unable to solve for periods with given values')
          } else {
            setResult(result)
          }
          break
        }
      }
    } catch (err) {
      setError('Calculation error. Please check your inputs.')
    }
  }

  const generateChartData = () => {
    try {
      const { periods: n, interestRate, presentValue: pv, payment: pmt } = data!
      const rate = interestRate / 100 // Use the rate as entered
      const totalPeriods = Math.floor(n) // Use periods as entered
      
      if (totalPeriods <= 0 || rate < 0) {
        setChartData([])
        return
      }

      const chartDataPoints: ChartDataPoint[] = []
      let currentPrincipal = Math.abs(pv)
      let totalInterest = 0

      for (let period = 0; period <= Math.min(totalPeriods, 100); period++) { // Cap at 100 periods for performance
        if (period === 0) {
          chartDataPoints.push({
            period,
            principal: currentPrincipal,
            interest: 0
          })
        } else if (rate === 0) {
          // Simple growth without compounding
          const monthlyPayment = Math.abs(pmt)
          currentPrincipal += monthlyPayment
          chartDataPoints.push({
            period,
            principal: currentPrincipal,
            interest: totalInterest
          })
        } else {
          // Compound growth
          const interestEarned = currentPrincipal * rate
          totalInterest += interestEarned
          currentPrincipal = currentPrincipal * (1 + rate) + Math.abs(pmt)
          
          chartDataPoints.push({
            period,
            principal: currentPrincipal - totalInterest,
            interest: totalInterest
          })
        }
      }

      setChartData(chartDataPoints)
    } catch (err) {
      setChartData([])
    }
  }

  useEffect(() => {
    calculate()
    generateChartData()
  }, [data])

  const updateData = (field: keyof TVMData, value: number | string) => {
    setData(current => {
      const safeCurrent: TVMData = {
        periods: current?.periods ?? 0,
        interestRate: current?.interestRate ?? 0,
        presentValue: current?.presentValue ?? 0,
        payment: current?.payment ?? 0,
        futureValue: current?.futureValue ?? 0,
        solveFor: current?.solveFor ?? 'futureValue',
      };
      return { ...safeCurrent, [field]: value };
    });
  }

  const formatResult = () => {
    if (result === null) return 'N/A'
    
    switch (data!.solveFor) {
      case 'interestRate':
        return `${result.toFixed(2)}%`
      case 'periods':
        return `${result.toFixed(1)} periods`
      default:
        return formatCurrency(result)
    }
  }

  const getInputValue = (field: keyof TVMData) => {
    if (data!.solveFor === field) return ''
    return data![field]
  }

  const getInputPlaceholder = (field: keyof TVMData, defaultPlaceholder: string) => {
    if (data!.solveFor === field) return ''
    return defaultPlaceholder
  }

  const isFieldDisabled = (field: keyof TVMData) => {
    return data!.solveFor === field
  }

  return (
    <div className="space-y-6">
      {/* Input Section */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
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
            onChange={(e) => updateData('periods', Number(e.target.value))}
            placeholder={getInputPlaceholder('periods', '20')}
            disabled={isFieldDisabled('periods')}
            className={isFieldDisabled('periods') ? 'bg-muted' : ''}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="interest-rate">Interest Rate (% per period)</Label>
          <Input
            id="interest-rate"
            type="number"
            step="0.1"
            value={getInputValue('interestRate')}
            onChange={(e) => updateData('interestRate', Number(e.target.value))}
            placeholder={getInputPlaceholder('interestRate', '7')}
            disabled={isFieldDisabled('interestRate')}
            className={isFieldDisabled('interestRate') ? 'bg-muted' : ''}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="present-value">Present Value (PV) - Cash Outflow Negative</Label>
          <Input
            id="present-value"
            type="number"
            value={getInputValue('presentValue')}
            onChange={(e) => updateData('presentValue', Number(e.target.value))}
            placeholder={getInputPlaceholder('presentValue', '-10000')}
            disabled={isFieldDisabled('presentValue')}
            className={isFieldDisabled('presentValue') ? 'bg-muted' : ''}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="payment">Payment (PMT) - Cash Outflow Negative</Label>
          <Input
            id="payment"
            type="number"
            value={getInputValue('payment')}
            onChange={(e) => updateData('payment', Number(e.target.value))}
            placeholder={getInputPlaceholder('payment', '-500')}
            disabled={isFieldDisabled('payment')}
            className={isFieldDisabled('payment') ? 'bg-muted' : ''}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="future-value">Future Value (FV)</Label>
          <Input
            id="future-value"
            type="number"
            value={getInputValue('futureValue')}
            onChange={(e) => updateData('futureValue', Number(e.target.value))}
            placeholder={getInputPlaceholder('futureValue', '0')}
            disabled={isFieldDisabled('futureValue')}
            className={isFieldDisabled('futureValue') ? 'bg-muted' : ''}
          />
        </div>
      </div>

      {/* Results and Instructions Section Side by Side */}
      <div className="flex flex-col md:flex-row gap-6">
        <Card className="w-full md:w-1/3">
          <CardHeader>
            <CardTitle className="text-xl">
              Result: {(() => {
                switch (data!.solveFor) {
                  case 'periods': return 'Periods (N)';
                  case 'interestRate': return 'Interest Rate (%)';
                  case 'presentValue': return 'Present Value (PV)';
                  case 'payment': return 'Payment (PMT)';
                  case 'futureValue': return 'Future Value (FV)';
                  default: return '';
                }
              })()}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {error ? (
              <div className="text-destructive font-semibold">{error}</div>
            ) : (
              <div className="text-3xl font-bold currency-blue">
                {formatResult()}
              </div>
            )}
          </CardContent>
        </Card>
        <Card className="w-full md:w-2/3">
          <CardHeader>
            <CardTitle className="text-xl">Instructions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 text-sm">
              <p><strong>Cash Flow Convention:</strong> Use negative values for cash outflows (money you pay) and positive values for cash inflows (money you receive).</p>
              <p><strong>Examples:</strong></p>
              <ul className="list-disc list-inside ml-4 space-y-1">
                <li>Initial investment: Use negative PV (e.g., -10000)</li>
                <li>Monthly deposits: Use negative PMT (e.g., -500)</li>
                <li>Loan principal received: Use positive PV</li>
                <li>Loan payments made: Use negative PMT</li>
              </ul>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Growth Visualization Chart */}
      {chartData.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Growth Visualization Over Time</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData}>
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
                        const principal = payload.find(p => p.dataKey === 'principal')?.value || 0;
                        const interest = payload.find(p => p.dataKey === 'interest')?.value || 0;
                        const total = principal + interest;
                        
                        return (
                          <div className="bg-white p-3 border border-gray-300 rounded shadow-lg">
                            <p className="font-semibold">{`Period ${label}`}</p>
                            <p className="text-blue-600">{`Principal: $${principal.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`}</p>
                            <p className="text-green-600">{`Interest Earned: $${interest.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`}</p>
                            <p className="font-bold border-t pt-1 mt-1">{`Total: $${total.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`}</p>
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                  <Area 
                    type="monotone" 
                    dataKey="principal" 
                    stackId="1"
                    stroke="#2563eb" 
                    fill="#3b82f6" 
                    fillOpacity={0.8}
                    name="principal"
                  />
                  <Area 
                    type="monotone" 
                    dataKey="interest" 
                    stackId="1"
                    stroke="#16a34a" 
                    fill="#22c55e" 
                    fillOpacity={0.8}
                    name="interest"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      )}

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Understanding the Time Value of Money</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm leading-relaxed">
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
          <CardTitle className="text-lg flex items-center gap-2">
            💡 Key Lesson
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-lg leading-relaxed font-medium">
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