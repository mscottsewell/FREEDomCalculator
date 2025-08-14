import { useState, useEffect } from 'react'
import { useKV } from '@github/spark/hooks'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'

interface InflationData {
  currentAmount: number
  inflationRate: number
  years: number
}

interface ChartDataPoint {
  year: number
  purchasing_power: number
}

export function InflationCalculator() {
  const [data, setData] = useKV<InflationData>('inflation-calculator', {
    currentAmount: 10000,
    inflationRate: 3.5,
    years: 20
  })

  const [results, setResults] = useState({
    futureNominal: 0,
    realPurchasingPower: 0,
    powerLost: 0,
    percentageLost: 0
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
    if (!data.currentAmount || !data.inflationRate || !data.years) return

    const inflationFactor = Math.pow(1 + data.inflationRate / 100, data.years)
    const futureNominal = data.currentAmount * inflationFactor
    const realPurchasingPower = data.currentAmount / inflationFactor
    const powerLost = data.currentAmount - realPurchasingPower
    const percentageLost = ((powerLost / data.currentAmount) * 100)

    setResults({
      futureNominal,
      realPurchasingPower,
      powerLost,
      percentageLost
    })

    // Generate chart data
    const chartPoints: ChartDataPoint[] = []
    for (let year = 0; year <= data.years; year++) {
      const yearlyInflationFactor = Math.pow(1 + data.inflationRate / 100, year)
      const purchasing_power = data.currentAmount / yearlyInflationFactor
      chartPoints.push({
        year,
        purchasing_power
      })
    }
    setChartData(chartPoints)
  }

  useEffect(() => {
    calculate()
  }, [data])

  const updateData = (field: keyof InflationData, value: number) => {
    setData(current => ({ ...current, [field]: value }))
  }

  return (
    <div className="space-y-6">
      {/* Input Section */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="space-y-2">
          <Label htmlFor="current-amount">Current Amount ($)</Label>
          <Input
            id="current-amount"
            type="number"
            value={data.currentAmount}
            onChange={(e) => updateData('currentAmount', Number(e.target.value))}
            placeholder="10000"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="inflation-rate">Inflation Rate (%)</Label>
          <Input
            id="inflation-rate"
            type="number"
            step="0.1"
            value={data.inflationRate}
            onChange={(e) => updateData('inflationRate', Number(e.target.value))}
            placeholder="3.5"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="years">Number of Years</Label>
          <Input
            id="years"
            type="number"
            value={data.years}
            onChange={(e) => updateData('years', Number(e.target.value))}
            placeholder="20"
          />
        </div>
      </div>

      {/* Results Section */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Results</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex justify-between">
              <span>Future Nominal Value:</span>
              <span className="font-semibold currency-blue">
                {formatCurrency(results.futureNominal)}
              </span>
            </div>
            <hr className="border-t-2 border-gray-400 my-4" />
            <div className="flex justify-between">
              <span>Real Purchasing Power:</span>
              <span className="font-semibold currency-green">
                {formatCurrency(results.realPurchasingPower)}
              </span>
            </div>
            <div className="flex justify-between">
              <span>Purchasing Power Lost:</span>
              <span className="font-semibold currency-red">
                {formatCurrency(results.powerLost)}
              </span>
            </div>
            <div className="flex justify-between">
              <span>Percentage Lost:</span>
              <span className="font-semibold currency-red">
                {results.percentageLost.toFixed(1)}%
              </span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">What This Means</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-lg leading-relaxed">
              You would need {formatCurrency(results.futureNominal)} in {data.years} years to buy  
              what {formatCurrency(data.currentAmount)} can buy today. 
              <br/> <br/>
              With inflation at {data.inflationRate}% per year, your {formatCurrency(data.currentAmount)} today 
              will have the same purchasing power as {formatCurrency(results.realPurchasingPower)} in {data.years} years.
              This represents a loss of purchasing power of {results.percentageLost.toFixed(1)}%.
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Chart Section */}
      <Card>
        <CardHeader>
          <CardTitle>Purchasing Power Over Time</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-80 w-full ml-2">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData} margin={{ left: 20, right: 5, top: 5, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="year" fontSize={12} />
                <YAxis tickFormatter={(value) => formatCurrency(value)} fontSize={12} />
                <Tooltip 
                  formatter={(value: number) => [formatCurrency(value), 'Purchasing Power']}
                  labelFormatter={(label) => `Year ${label}`}
                />
                <Area 
                  type="monotone" 
                  dataKey="purchasing_power" 
                  stroke="oklch(0.60 0.20 15)" 
                  fill="oklch(0.60 0.20 15)" 
                  fillOpacity={0.6}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
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
                <strong>Inflation is the silent wealth killer.</strong> Even at modest rates like 3% annually, inflation significantly erodes your purchasing power over time. 
                This is why keeping money in low-yield savings accounts or "under the mattress" actually causes you to lose money in real terms. 
                To preserve and grow wealth, your investments must earn returns that exceed the inflation rate. Understanding inflation's impact 
                is crucial for making informed decisions about saving, investing, and financial planning.
          </p>
        </CardContent>
      </Card>
    </div>
  )
}