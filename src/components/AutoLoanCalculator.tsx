import { useState, useEffect } from 'react'
import { useKV } from '@github/spark/hooks'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'

interface AutoLoanData {
  loanAmount: number
  interestRate: number
  loanTerm: number
}

interface PaymentSchedule {
  month: number
  payment: number
  principal: number
  interest: number
  balance: number
}

export function AutoLoanCalculator() {
  const [data, setData] = useKV<AutoLoanData>('autoloan-calculator', {
    loanAmount: 75000,
    interestRate: 6.5,
    loanTerm: 7
  })

  const [results, setResults] = useState({
    monthlyPayment: 0,
    totalInterest: 0,
    totalPaid: 0
  })

  const [schedule, setSchedule] = useState<PaymentSchedule[]>([])

  const formatCurrency = (amount: number): string => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount)
  }

  const formatCurrencyNoDecimals = (amount: number): string => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount)
  }

  const calculate = () => {
    if (!data.loanAmount || !data.interestRate || !data.loanTerm) return

    const monthlyRate = data.interestRate / 100 / 12
    const numberOfPayments = data.loanTerm * 12

    // Calculate monthly payment using loan formula
    const monthlyPayment = (data.loanAmount * monthlyRate * Math.pow(1 + monthlyRate, numberOfPayments)) /
                          (Math.pow(1 + monthlyRate, numberOfPayments) - 1)

    let balance = data.loanAmount
    const paymentHistory: PaymentSchedule[] = []
    let totalInterest = 0

    for (let month = 1; month <= numberOfPayments; month++) {
      const interestPayment = balance * monthlyRate
      const principalPayment = monthlyPayment - interestPayment
      balance -= principalPayment
      totalInterest += interestPayment

      paymentHistory.push({
        month,
        payment: monthlyPayment,
        principal: principalPayment,
        interest: interestPayment,
        balance: Math.max(0, balance)
      })
    }

    setResults({
      monthlyPayment,
      totalInterest,
      totalPaid: data.loanAmount + totalInterest
    })

    setSchedule(paymentHistory)
  }

  useEffect(() => {
    calculate()
  }, [data])

  const updateData = (field: keyof AutoLoanData, value: number) => {
    setData(current => ({ ...current, [field]: value }))
  }


  // Estimate depreciation: 20% first year, 15% each subsequent year
  let estimatedValue = data.loanAmount;
  if (data.loanTerm > 0) {
    estimatedValue *= 0.8; // 20% loss first year
    if (data.loanTerm > 1) {
      estimatedValue *= Math.pow(0.85, data.loanTerm - 1); // 15% loss each subsequent year
    }
  }
  // Round down to nearest five hundred
  estimatedValue = Math.floor(estimatedValue / 500) * 500;

  return (
    <div className="space-y-6">
      {/* Input Section */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="space-y-2">
          <Label htmlFor="loan-amount">Loan Amount ($)</Label>
          <Input
            id="loan-amount"
            type="number"
            value={data.loanAmount}
            onChange={(e) => updateData('loanAmount', Number(e.target.value))}
            placeholder="25000"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="interest-rate">Interest Rate (%)</Label>
          <Input
            id="interest-rate"
            type="number"
            step="0.01"
            value={data.interestRate}
            onChange={(e) => updateData('interestRate', Number(e.target.value))}
            placeholder="5.5"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="loan-term">Loan Term (Years)</Label>
          <Input
            id="loan-term"
            type="number"
            value={data.loanTerm}
            onChange={(e) => updateData('loanTerm', Number(e.target.value))}
            placeholder="5"
          />
        </div>
      </div>

      {/* Results & Understanding Section Side by Side */}
      <div className="flex flex-col md:flex-row gap-6">
        <Card className="w-full md:w-1/2">
          <CardHeader>
            <CardTitle className="text-lg">Loan Summary</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-2">
            <div className="flex justify-between items-center py-1">
              <span className="text-muted-foreground text-left">Monthly Payment</span>
              <span className="text-2xl font-bold currency-blue text-right">{formatCurrencyNoDecimals(results.monthlyPayment)}</span>
            </div>
            <div className="flex justify-between items-center py-1">
              <span className="text-muted-foreground text-left">Total Interest</span>
              <span className="text-2xl font-bold currency-red text-right">{formatCurrencyNoDecimals(results.totalInterest)}</span>
            </div>
            <div className="flex justify-between items-center py-1">
              <span className="text-muted-foreground text-left">Total Amount Paid</span>
              <span className="text-2xl font-bold currency-blue text-right">{formatCurrencyNoDecimals(results.totalPaid)}</span>
            </div>
          </CardContent>
        </Card>
        <Card className="w-full md:w-1/2">
          <CardHeader>
            <CardTitle className="text-lg">Understanding Your Auto Loan</CardTitle>
          </CardHeader>
          <CardContent>
              <p className="text-base leading-relaxed">
                For your {formatCurrencyNoDecimals(data!.loanAmount)} auto loan at {data!.interestRate}% interest for {data!.loanTerm} years, 
                you'll pay <strong>{formatCurrencyNoDecimals(results.monthlyPayment)}</strong> per month.             
                <br/><br/>
                Over the life of the loan, you'll pay a total of <strong>{formatCurrencyNoDecimals(results.totalInterest)}</strong> in interest, 
                making your total cost <strong>{formatCurrencyNoDecimals(results.totalPaid)}</strong>. 
                <br/><br/>
                The interest adds <strong>{((results.totalInterest / data!.loanAmount) * 100).toFixed(1)}%</strong> to the cost of your vehicle.
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Amortization Schedule */}
      {schedule.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Complete Amortization Schedule</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto max-h-96 pr-2">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-left w-16 table-header-shaded">Month</TableHead>
                    <TableHead className="text-right table-header-shaded">Payment</TableHead>
                    <TableHead className="text-right table-header-shaded">Principal</TableHead>
                    <TableHead className="text-right table-header-shaded">Interest</TableHead>
                    <TableHead className="text-right pr-4 table-header-shaded">Balance</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {schedule.map((payment) => (
                    <TableRow key={payment.month}>
                      <TableCell className="font-medium">{payment.month}</TableCell>
                      <TableCell className="text-right">{formatCurrency(payment.payment)}</TableCell>
                      <TableCell className="text-right">{formatCurrency(payment.principal)}</TableCell>
                      <TableCell className="text-right currency-red">{formatCurrency(payment.interest)}</TableCell>
                      <TableCell className="text-right pr-4">{formatCurrency(payment.balance)}</TableCell>
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
              <strong>Cars are depreciating assets.</strong> Unlike a home that may appreciate, a car loses value when you drive it off the lot. 
              This makes the interest rate and loan term crucial factors if you borrow money to buy a car. 
              A longer loan term means you will have lower monthly payments but pay significantly more in interest. 
              Consider the total cost of ownership, not just the monthly payment, and remember that reliable transportation is the goal.
          </p>
        </CardContent>
      </Card>
    </div>
  )
}