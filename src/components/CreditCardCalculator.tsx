import { useState, useEffect } from 'react'
import { useKV } from '@github/spark/hooks'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'

interface CreditCardData {
  balance: number
  apr: number
  paymentType: 'minimum' | 'fixed'
  fixedPayment: number
}

interface PaymentSchedule {
  month: number
  payment: number
  principal: number
  interest: number
  balance: number
  year: number
}

interface ChartDataPoint {
  month: number
  principal: number
  interest: number
}

export function CreditCardCalculator() {
  const [data, setData] = useKV<CreditCardData>('creditcard-calculator', {
    balance: 5000,
    apr: 18.99,
    paymentType: 'minimum',
    fixedPayment: 150
  })

  const [results, setResults] = useState({
    monthsToPayoff: 0,
    totalInterest: 0,
    totalPaid: 0
  })

  const [schedule, setSchedule] = useState<PaymentSchedule[]>([])
  const [chartData, setChartData] = useState<ChartDataPoint[]>([])

  const formatCurrency = (amount: number): string => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount)
  }

  const calculate = () => {
    if (!data.balance || !data.apr) return

    const monthlyRate = data.apr / 100 / 12
    let balance = data.balance
    const paymentHistory: PaymentSchedule[] = []
    const chartPoints: ChartDataPoint[] = []
    let month = 0
    let totalInterest = 0

    while (balance > 0.01 && month < 600) { // Cap at 50 years to prevent infinite loops
      month++
      const interestPayment = balance * monthlyRate
      
      let payment: number
      if (data.paymentType === 'minimum') {
        // Interest + 1% of balance (minimum payment calculation)
        payment = Math.max(25, interestPayment + balance * 0.01) // Minimum $25 payment
      } else {
        payment = data.fixedPayment
      }

      // Don't pay more than the remaining balance
      payment = Math.min(payment, balance + interestPayment)
      
      const principalPayment = payment - interestPayment
      balance = Math.max(0, balance - principalPayment)
      
      totalInterest += interestPayment

      const year = Math.ceil(month / 12)
      paymentHistory.push({
        month,
        payment,
        principal: principalPayment,
        interest: interestPayment,
        balance,
        year
      })

      chartPoints.push({
        month,
        principal: principalPayment,
        interest: interestPayment
      })

      if (balance <= 0.01) break
    }

    setResults({
      monthsToPayoff: month,
      totalInterest,
      totalPaid: data.balance + totalInterest
    })

    setSchedule(paymentHistory)
    setChartData(chartPoints)
  }

  useEffect(() => {
    calculate()
  }, [data])

  const updateData = (field: keyof CreditCardData, value: number | string) => {
    setData(current => ({ ...current, [field]: value }))
  }

  // Group schedule by year for better display
  const yearlySchedule = schedule.reduce((acc, payment) => {
    if (!acc[payment.year]) {
      acc[payment.year] = {
        year: payment.year,
        totalPayment: 0,
        totalPrincipal: 0,
        totalInterest: 0,
        endBalance: 0,
        months: []
      }
    }
    acc[payment.year].totalPayment += payment.payment
    acc[payment.year].totalPrincipal += payment.principal
    acc[payment.year].totalInterest += payment.interest
    acc[payment.year].endBalance = payment.balance
    acc[payment.year].months.push(payment)
    return acc
  }, {} as Record<number, any>)

  return (
    <div className="space-y-6">
      {/* Input Section */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="space-y-2">
          <Label htmlFor="balance">Current Balance ($)</Label>
          <Input
            id="balance"
            type="number"
            value={data.balance}
            onChange={(e) => updateData('balance', Number(e.target.value))}
            placeholder="5000"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="apr">Annual Percentage Rate (%)</Label>
          <Input
            id="apr"
            type="number"
            step="0.01"
            value={data.apr}
            onChange={(e) => updateData('apr', Number(e.target.value))}
            placeholder="18.99"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="payment-type">Payment Method</Label>
          <Select value={data.paymentType} onValueChange={(value) => updateData('paymentType', value)}>
            <SelectTrigger id="payment-type">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="minimum">Interest + 1% of Balance</SelectItem>
              <SelectItem value="fixed">Fixed Payment Amount</SelectItem>
            </SelectContent>
          </Select>
        </div>
        {data.paymentType === 'fixed' && (
          <div className="space-y-2">
            <Label htmlFor="fixed-payment">Fixed Payment ($)</Label>
            <Input
              id="fixed-payment"
              type="number"
              value={data.fixedPayment}
              onChange={(e) => updateData('fixedPayment', Number(e.target.value))}
              placeholder="150"
            />
          </div>
        )}
      </div>

      {/* Results Section */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Payoff Summary</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="text-center">
            <div className="text-2xl font-bold currency-blue">
              {Math.ceil(results.monthsToPayoff / 12)} years {results.monthsToPayoff % 12} months
            </div>
            <div className="text-sm text-muted-foreground">Time to Payoff</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold currency-red">
              {formatCurrency(results.totalInterest)}
            </div>
            <div className="text-sm text-muted-foreground">Total Interest Paid</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold currency-blue">
              {formatCurrency(results.totalPaid)}
            </div>
            <div className="text-sm text-muted-foreground">Total Amount Paid</div>
          </div>
        </CardContent>
      </Card>

      {/* Chart Section */}
      <Card>
        <CardHeader>
          <CardTitle>Payment Breakdown Over Time</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-80 w-full ml-2">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData} margin={{ left: 20, right: 5, top: 5, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" fontSize={12} />
                <YAxis tickFormatter={(value) => formatCurrency(value)} fontSize={12} />
                <Tooltip 
                  formatter={(value: number, name: string) => [formatCurrency(value), name === 'principal' ? 'Principal' : 'Interest']}
                  labelFormatter={(label) => `Month ${label}`}
                />
                <Area 
                  type="monotone" 
                  dataKey="principal" 
                  stackId="1"
                  stroke="oklch(0.55 0.15 245)" 
                  fill="oklch(0.55 0.15 245)"
                  fillOpacity={0.8}
                />
                <Area 
                  type="monotone" 
                  dataKey="interest" 
                  stackId="1"
                  stroke="oklch(0.60 0.20 15)" 
                  fill="oklch(0.60 0.20 15)"
                  fillOpacity={0.8}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* Yearly Payment Schedule Table */}
      {schedule.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Yearly Payment Schedule</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-left table-header-shaded">Year</TableHead>
                    <TableHead className="text-right table-header-shaded">Total Payment</TableHead>
                    <TableHead className="text-right table-header-shaded">Total Principal</TableHead>
                    <TableHead className="text-right table-header-shaded">Total Interest</TableHead>
                    <TableHead className="text-right table-header-shaded">End Balance</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {Object.values(yearlySchedule).map((yearData: any) => (
                    <TableRow key={yearData.year}>
                      <TableCell className="font-medium">{yearData.year}</TableCell>
                      <TableCell className="text-right">{formatCurrency(yearData.totalPayment)}</TableCell>
                      <TableCell className="text-right">{formatCurrency(yearData.totalPrincipal)}</TableCell>
                      <TableCell className="text-right currency-red">{formatCurrency(yearData.totalInterest)}</TableCell>
                      <TableCell className="text-right">{formatCurrency(yearData.endBalance)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Monthly Payment Breakdown Table */}
      {schedule.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Monthly Payment Breakdown</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto max-h-96">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-left sticky top-0 bg-muted table-header-shaded">Month</TableHead>
                    <TableHead className="text-right sticky top-0 bg-muted table-header-shaded">Payment</TableHead>
                    <TableHead className="text-right sticky top-0 bg-muted table-header-shaded">Principal</TableHead>
                    <TableHead className="text-right sticky top-0 bg-muted table-header-shaded">Interest</TableHead>
                    <TableHead className="text-right sticky top-0 bg-muted table-header-shaded">Remaining Balance</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {schedule.map((payment, index) => (
                    <TableRow key={payment.month} className={index % 12 === 0 ? "bg-muted/30" : ""}>
                      <TableCell className="font-medium">
                        {payment.month}
                        {index % 12 === 0 && (
                          <span className="ml-2 text-xs text-muted-foreground">
                            (Year {payment.year})
                          </span>
                        )}
                      </TableCell>
                      <TableCell className="text-right">{formatCurrency(payment.payment)}</TableCell>
                      <TableCell className="text-right currency-blue">{formatCurrency(payment.principal)}</TableCell>
                      <TableCell className="text-right currency-red">{formatCurrency(payment.interest)}</TableCell>
                      <TableCell className="text-right">{formatCurrency(payment.balance)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Key Lesson Section */}
      <Card className="bg-accent/5 border-accent/20">
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            💡 Key Lesson
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-lg leading-relaxed font-medium">
              <strong>Credit cards can be wealth destroyers if mismanaged.</strong> Making only minimum payments keeps you trapped in a cycle of debt, 
              where most of your payment goes to interest rather than reducing the principal balance. High-interest debt is the opposite of compound interest - 
              working against you instead of for you. Always pay more than the minimum, and prioritize paying off high-interest debt before investing. 
              The "guaranteed return" from paying off an 18% credit card is better than most investment returns you'll find.
          </p>
        </CardContent>
      </Card>
    </div>
  )
}