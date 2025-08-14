import { useState, useEffect } from 'react'
import { useKV } from '@github/spark/hooks'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts'

interface CompoundData {
  principal: number
  interestRate: number
  years: number
  compoundingFrequency: number
  additionalDeposit: number
  depositFrequency: 'monthly' | 'annually'
}

interface ChartDataPoint {
  year: number
  principal: number
  interest: number
}

const compoundingOptions = [
  { value: 1, label: 'Annually' },
  { value: 2, label: 'Semi-annually' },
  { value: 4, label: 'Quarterly' },
  { value: 12, label: 'Monthly' },
  { value: 52, label: 'Weekly' },
  { value: 365, label: 'Daily' }
]

export function CompoundInterestCalculator() {
  const [data, setData] = useKV<CompoundData>('compound-calculator', {
    principal: 10000,
    interestRate: 7,
    years: 20,
    compoundingFrequency: 12,
    additionalDeposit: 500,
    depositFrequency: 'monthly'
  })

  const [results, setResults] = useState({
    finalAmount: 0,
    totalInterest: 0,
    totalDeposits: 0
  })

  const [chartData, setChartData] = useState<ChartDataPoint[]>([])

  const formatCurrency = (amount: number): string => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount)
  }

  const calculate = () => {
    if (!data.principal || !data.interestRate || !data.years) return

    const r = data.interestRate / 100
    const n = data.compoundingFrequency
    const t = data.years
    
    // Calculate compound interest on principal
    const principalGrowth = data.principal * Math.pow(1 + r / n, n * t)
    
    // Calculate additional deposits
    let depositContribution = 0
    if (data.additionalDeposit > 0) {
      if (data.depositFrequency === 'monthly') {
        // Monthly deposits compounded
        const monthlyRate = r / 12
        const months = t * 12
        if (monthlyRate === 0) {
          depositContribution = data.additionalDeposit * months
        } else {
          depositContribution = data.additionalDeposit * ((Math.pow(1 + monthlyRate, months) - 1) / monthlyRate)
        }
      } else {
        // Annual deposits
        const annualRate = r
        if (annualRate === 0) {
          depositContribution = data.additionalDeposit * t
        } else {
          depositContribution = data.additionalDeposit * ((Math.pow(1 + annualRate, t) - 1) / annualRate)
        }
      }
    }

    const finalAmount = principalGrowth + depositContribution
    const totalDeposits = data.principal + (data.depositFrequency === 'monthly' ? data.additionalDeposit * 12 * t : data.additionalDeposit * t)
    const totalInterest = finalAmount - totalDeposits

    setResults({
      finalAmount,
      totalInterest,
      totalDeposits
    })

    // Generate chart data
    const chartPoints: ChartDataPoint[] = []
    for (let year = 0; year <= t; year++) {
      const principalAtYear = data.principal * Math.pow(1 + r / n, n * year)
      
      let depositAtYear = 0
      if (data.additionalDeposit > 0 && year > 0) {
        if (data.depositFrequency === 'monthly') {
          const monthlyRate = r / 12
          const months = year * 12
          if (monthlyRate === 0) {
            depositAtYear = data.additionalDeposit * months
          } else {
            depositAtYear = data.additionalDeposit * ((Math.pow(1 + monthlyRate, months) - 1) / monthlyRate)
          }
        } else {
          const annualRate = r
          if (annualRate === 0) {
            depositAtYear = data.additionalDeposit * year
          } else {
            depositAtYear = data.additionalDeposit * ((Math.pow(1 + annualRate, year) - 1) / annualRate)
          }
        }
      }

      const totalAtYear = principalAtYear + depositAtYear
      const depositsAtYear = data.principal + (data.depositFrequency === 'monthly' ? data.additionalDeposit * 12 * year : data.additionalDeposit * year)
      const interestAtYear = totalAtYear - depositsAtYear

      chartPoints.push({
        year,
        principal: depositsAtYear,
        interest: Math.max(0, interestAtYear)
      })
    }
    setChartData(chartPoints)
  }

  useEffect(() => {
    calculate()
  }, [data])

  const updateData = (field: keyof CompoundData, value: number | string) => {
    setData(current => ({ ...current, [field]: value }))
  }

  return (
    <div className="space-y-6">
      {/* Input Section */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <div className="space-y-2">
          <Label htmlFor="principal">Principal Amount ($)</Label>
          <Input
            id="principal"
            type="number"
            value={data.principal}
            onChange={(e) => updateData('principal', Number(e.target.value))}
            placeholder="10000"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="interest-rate">Interest Rate (%)</Label>
          <Input
            id="interest-rate"
            type="number"
            step="0.1"
            value={data.interestRate}
            onChange={(e) => updateData('interestRate', Number(e.target.value))}
            placeholder="7"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="years">Years</Label>
          <Input
            id="years"
            type="number"
            value={data.years}
            onChange={(e) => updateData('years', Number(e.target.value))}
            placeholder="20"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="compounding">Compounding Frequency</Label>
          <Select value={data.compoundingFrequency.toString()} onValueChange={(value) => updateData('compoundingFrequency', Number(value))}>
            <SelectTrigger id="compounding">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {compoundingOptions.map(option => (
                <SelectItem key={option.value} value={option.value.toString()}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="additional-deposit">Additional Deposit ($)</Label>
          <Input
            id="additional-deposit"
            type="number"
            value={data.additionalDeposit}
            onChange={(e) => updateData('additionalDeposit', Number(e.target.value))}
            placeholder="500"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="deposit-frequency">Deposit Frequency</Label>
          <Select value={data.depositFrequency} onValueChange={(value) => updateData('depositFrequency', value)}>
            <SelectTrigger id="deposit-frequency">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="monthly">Monthly</SelectItem>
              <SelectItem value="annually">Annually</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Results and Chart Section */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Results</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex justify-between">
                <span>Final Amount:</span>
                <span className="font-semibold currency-blue">
                  {formatCurrency(results.finalAmount)}
                </span>
              </div>
              <div className="flex justify-between">
                <span>Total Interest Earned:</span>
                <span className="font-semibold currency-green">
                  {formatCurrency(results.totalInterest)}
                </span>
              </div>
              <div className="flex justify-between">
                <span>Total Deposits:</span>
                <span className="font-semibold currency-orange">
                  {formatCurrency(results.totalDeposits)}
                </span>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="lg:col-span-3">
          <Card>
            <CardHeader>
              <CardTitle>Growth Visualization</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-80 w-full ml-2">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={chartData} margin={{ left: 20, right: 5, top: 5, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="year" fontSize={12} />
                    <YAxis tickFormatter={(value) => formatCurrency(value)} fontSize={12} />
                    <Tooltip 
                      formatter={(value: number, name: string) => [formatCurrency(value), name === 'principal' ? 'Principal' : 'Interest']}
                      labelFormatter={(label) => `Year ${label}`}
                    />
                    <Legend fontSize={12} />
                    <Area 
                      type="monotone" 
                      dataKey="principal" 
                      stackId="1"
                      stroke="oklch(0.70 0.15 50)" 
                      fill="oklch(0.70 0.15 50)"
                      name="Principal"
                    />
                    <Area 
                      type="monotone" 
                      dataKey="interest" 
                      stackId="1"
                      stroke="oklch(0.65 0.18 142)" 
                      fill="oklch(0.65 0.18 142)"
                      name="Interest"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Key Lesson Section */}
      <Card className="bg-accent/5 border-accent/20">
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            💡 Key Lesson
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-lg leading-relaxed font-medium">
              <strong>Albert Einstien called compound interest "the eighth wonder of the world."</strong> 
              The earlier you start investing, the more time your money has to grow exponentially. 
              Even small amounts invested regularly can become substantial wealth over time due to compounding. The key is starting early and being consistent - 
              time in the market is more powerful than timing the market. A 25-year-old who saves $200/month will have significantly more at retirement than 
              a 35-year-old who saves $400/month, simply because of those extra 10 years of compound growth.
          </p>
        </CardContent>
      </Card>
    </div>
  )
}