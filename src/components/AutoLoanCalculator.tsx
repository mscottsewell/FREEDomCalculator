import { useState } from 'react'
import { useLocalStorage } from '@/hooks/useLocalStorage'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { CalculateButton } from '@/components/ui/calculate-button'
import { NumericOrEmpty, isValidNumber, toNumber, formatFieldName } from '@/lib/calculator-validation'
import { formatCurrency, formatNumberWithCommas, parseFormattedNumber } from '@/lib/formatters'

interface AutoLoanData {
  loanAmount: NumericOrEmpty
  interestRate: NumericOrEmpty
  loanTerm: NumericOrEmpty
}

interface PaymentSchedule {
  month: number
  payment: number
  principal: number
  interest: number
  balance: number
}

export function AutoLoanCalculator() {
  const [data, setData] = useLocalStorage<AutoLoanData>('autoloan-calculator', {
    loanAmount: 40000,
    interestRate: 8,
    loanTerm: 7
  })

  const [results, setResults] = useState({
    monthlyPayment: 0,
    totalInterest: 0,
    totalPaid: 0
  })

  const [schedule, setSchedule] = useState<PaymentSchedule[]>([])
  const [error, setError] = useState('')

  // Helper for currency without decimals
  const formatCurrencyNoDecimals = (amount: number) => formatCurrency(amount, false)
  // Helper for currency with decimals  
  const formatCurrencyWithDecimals = (amount: number) => formatCurrency(amount, true)

  const validateInputs = (): string | null => {
    if (!isValidNumber(data?.loanAmount)) return "Please enter a valid loan amount"
    if (!isValidNumber(data?.interestRate)) return "Please enter a valid interest rate"
    if (!isValidNumber(data?.loanTerm)) return "Please enter a valid loan term"

    const amount = toNumber(data!.loanAmount)
    const rate = toNumber(data!.interestRate)
    const term = toNumber(data!.loanTerm)

    if (amount <= 0) return "Loan amount must be greater than 0"
    if (rate < 0) return "Interest rate cannot be negative"
    if (term <= 0) return "Loan term must be greater than 0"

    return null
  }

  const calculate = () => {
    const validationError = validateInputs()
    if (validationError) {
      setError(validationError)
      return
    }

    setError('')

    const loanAmount = toNumber(data!.loanAmount)
    const interestRate = toNumber(data!.interestRate)
    const loanTerm = toNumber(data!.loanTerm)

    const monthlyRate = interestRate / 100 / 12
    const numberOfPayments = loanTerm * 12

    const monthlyPayment = monthlyRate === 0
      ? loanAmount / numberOfPayments
      : (loanAmount * monthlyRate * Math.pow(1 + monthlyRate, numberOfPayments)) /
        (Math.pow(1 + monthlyRate, numberOfPayments) - 1)

    let balance = loanAmount
    const paymentHistory: PaymentSchedule[] = []
    let totalInterest = 0

    for (let month = 1; month <= numberOfPayments; month++) {
      const interestPayment = monthlyRate === 0 ? 0 : balance * monthlyRate
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
      totalPaid: loanAmount + totalInterest
    })

    setSchedule(paymentHistory)
  }

  const updateData = (field: keyof AutoLoanData, value: NumericOrEmpty) => {
    setData(current => ({ ...current!, [field]: value }))
  }


  // Estimate depreciation: 20% first year, 15% each subsequent year
  let estimatedValue = toNumber(data?.loanAmount || 0);
  if (toNumber(data?.loanTerm || 0) > 0) {
    estimatedValue *= 0.8; // 20% loss first year
    if (toNumber(data?.loanTerm || 0) > 1) {
      estimatedValue *= Math.pow(0.85, toNumber(data?.loanTerm || 0) - 1); // 15% loss each subsequent year
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
            type="text"
            value={formatNumberWithCommas(data?.loanAmount ?? '')}
            onChange={(e) => {
              const parsedValue = parseFormattedNumber(e.target.value)
              updateData('loanAmount', parsedValue)
            }}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="interest-rate">Interest Rate (%)</Label>
          <div className="relative">
            <Input
              id="interest-rate"
              type="number"
              step="0.01"
              value={data?.interestRate ?? ''}
              onChange={(e) => updateData('interestRate', e.target.value === '' ? '' : Number(e.target.value))}
              className="pr-8"
            />
            <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none text-sm text-muted-foreground">
              %
            </div>
          </div>
        </div>
        <div className="space-y-2">
          <Label htmlFor="loan-term">Loan Term (Years)</Label>
          <Input
            id="loan-term"
            type="number"
            value={data?.loanTerm ?? ''}
            onChange={(e) => updateData('loanTerm', e.target.value === '' ? '' : Number(e.target.value))}
          />
        </div>
      </div>

      {/* Calculate Button */}
      <div className="flex flex-col gap-3">
        <CalculateButton onCalculate={calculate} />
        {error && (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}
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
                For your {formatCurrencyNoDecimals(toNumber(data?.loanAmount || 0))} auto loan at {toNumber(data?.interestRate || 0)}% interest for {toNumber(data?.loanTerm || 0)} years, 
                you'll pay <strong>{formatCurrencyNoDecimals(results.monthlyPayment)}</strong> per month.             
                <br/><br/>
                Over the life of the loan, you'll pay a total of <strong>{formatCurrencyNoDecimals(results.totalInterest)}</strong> in interest, 
                making your total cost <strong>{formatCurrencyNoDecimals(results.totalPaid)}</strong>. 
                <br/><br/>
                The interest adds <strong>{((results.totalInterest / toNumber(data?.loanAmount || 1)) * 100).toFixed(1)}%</strong> to the cost of your vehicle.
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
                      <TableCell className="text-right">{formatCurrencyWithDecimals(payment.payment)}</TableCell>
                      <TableCell className="text-right">{formatCurrencyWithDecimals(payment.principal)}</TableCell>
                      <TableCell className="text-right currency-red">{formatCurrencyWithDecimals(payment.interest)}</TableCell>
                      <TableCell className="text-right pr-4">{formatCurrencyWithDecimals(payment.balance)}</TableCell>
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