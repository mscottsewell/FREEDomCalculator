import { useState } from 'react'
import { useLocalStorage } from '@/hooks/useLocalStorage'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { CalculateButton } from '@/components/ui/calculate-button'
import { NumericOrEmpty, isValidNumber, toNumber } from '@/lib/calculator-validation'

interface MortgageData {
  homePrice: NumericOrEmpty
  downPaymentPercent: NumericOrEmpty
  interestRate: NumericOrEmpty
  loanTerm: NumericOrEmpty
}

interface YearlySchedule {
  year: number
  totalPayment: number
  totalPrincipal: number
  totalInterest: number
  endBalance: number
}

interface MonthlyPayment {
  month: number
  payment: number
  principal: number
  interest: number
  balance: number
}

export function MortgageCalculator() {
  const [data, setData] = useLocalStorage<MortgageData>('mortgage-calculator', {
    homePrice: 300000,
    downPaymentPercent: 10,
    interestRate: 7.0,
    loanTerm: 30
  })

  const [results, setResults] = useState({
    downPaymentAmount: 0,
    calculatedLoanAmount: 0,
    monthlyPayment: 0,
    totalInterest: 0,
    totalPaid: 0
  })

  const [yearlySchedule, setYearlySchedule] = useState<YearlySchedule[]>([])
  const [monthlySchedule, setMonthlySchedule] = useState<MonthlyPayment[]>([])

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

  // Format number with commas for display
  const formatNumberWithCommas = (value: NumericOrEmpty): string => {
    if (value === '' || value === null || value === undefined) return ''
    const num = typeof value === 'number' ? value : parseFloat(value.toString())
    if (isNaN(num)) return ''
    return new Intl.NumberFormat('en-US').format(num)
  }

  // Parse comma-formatted string back to number
  const parseFormattedNumber = (value: string): NumericOrEmpty => {
    if (value === '') return ''
    // Remove commas and parse
    const cleanValue = value.replace(/,/g, '')
    const num = parseFloat(cleanValue)
    return isNaN(num) ? '' : num
  }

  // Format percentage with % sign for display
  const formatPercentage = (value: NumericOrEmpty): string => {
    if (value === '' || value === null || value === undefined) return ''
    const num = typeof value === 'number' ? value : parseFloat(value.toString())
    if (isNaN(num)) return ''
    return `${num}%`
  }

  // Parse percentage string back to number
  const parsePercentage = (value: string): NumericOrEmpty => {
    if (value === '') return ''
    // Remove % sign and parse
    const cleanValue = value.replace(/%/g, '').trim()
    const num = parseFloat(cleanValue)
    return isNaN(num) ? '' : num
  }

  const validateInputs = (): string | null => {
    if (!isValidNumber(data?.homePrice)) return "Please enter a valid home price"
    if (!isValidNumber(data?.downPaymentPercent)) return "Please enter a valid down payment percentage"
    if (!isValidNumber(data?.interestRate)) return "Please enter a valid interest rate"
    if (!isValidNumber(data?.loanTerm)) return "Please enter a valid loan term"

    const homePrice = toNumber(data!.homePrice)
    const downPaymentPercent = toNumber(data!.downPaymentPercent)
    const interestRate = toNumber(data!.interestRate)
    const loanTerm = toNumber(data!.loanTerm)

    if (homePrice <= 0) return "Home price must be greater than 0"
    if (downPaymentPercent < 0) return "Down payment percentage cannot be negative"
    if (downPaymentPercent >= 100) return "Down payment percentage must be less than 100%"
    if (interestRate < 0) return "Interest rate cannot be negative"
    if (loanTerm <= 0) return "Loan term must be greater than 0"

    return null
  }

  const calculate = () => {
    const validationError = validateInputs()
    if (validationError) return

    const homePrice = toNumber(data!.homePrice)
    const downPaymentPercent = toNumber(data!.downPaymentPercent)
    const interestRate = toNumber(data!.interestRate)
    const loanTerm = toNumber(data!.loanTerm)

    // Calculate down payment amount and loan amount
    const downPaymentAmount = homePrice * (downPaymentPercent / 100)
    const calculatedLoanAmount = homePrice - downPaymentAmount

    const monthlyRate = interestRate / 100 / 12
    const numberOfPayments = loanTerm * 12

    // Calculate monthly payment using mortgage formula
    const monthlyPayment = (calculatedLoanAmount * monthlyRate * Math.pow(1 + monthlyRate, numberOfPayments)) /
                          (Math.pow(1 + monthlyRate, numberOfPayments) - 1)

    let balance = calculatedLoanAmount
    const monthlyPayments: MonthlyPayment[] = []
    const yearlyData: { [year: number]: YearlySchedule } = {}
    let totalInterest = 0

    for (let month = 1; month <= numberOfPayments; month++) {
      const interestPayment = balance * monthlyRate
      const principalPayment = monthlyPayment - interestPayment
      balance -= principalPayment
      totalInterest += interestPayment

      const currentYear = Math.ceil(month / 12)

      monthlyPayments.push({
        month,
        payment: monthlyPayment,
        principal: principalPayment,
        interest: interestPayment,
        balance: Math.max(0, balance)
      })

      // Aggregate yearly data
      if (!yearlyData[currentYear]) {
        yearlyData[currentYear] = {
          year: currentYear,
          totalPayment: 0,
          totalPrincipal: 0,
          totalInterest: 0,
          endBalance: 0
        }
      }
      
      yearlyData[currentYear].totalPayment += monthlyPayment
      yearlyData[currentYear].totalPrincipal += principalPayment
      yearlyData[currentYear].totalInterest += interestPayment
      yearlyData[currentYear].endBalance = Math.max(0, balance)
    }

    setResults({
      downPaymentAmount,
      calculatedLoanAmount,
      monthlyPayment,
      totalInterest,
      totalPaid: calculatedLoanAmount + totalInterest
    })

    setYearlySchedule(Object.values(yearlyData))
    setMonthlySchedule(monthlyPayments)
  }

  const updateData = (field: keyof MortgageData, value: NumericOrEmpty) => {
    setData(current => ({ ...current!, [field]: value }))
  }

  return (
    <div className="space-y-6">
      {/* Input Section */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="space-y-2">
          <Label htmlFor="home-price">Home Price ($)</Label>
          <Input
            id="home-price"
            type="text"
            value={formatNumberWithCommas(data?.homePrice ?? '')}
            onChange={(e) => {
              const parsedValue = parseFormattedNumber(e.target.value)
              updateData('homePrice', parsedValue)
            }}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="down-payment-percent">Down Payment (%)</Label>
          <div className="relative">
            <Input
              id="down-payment-percent"
              type="number"
              step="0.1"
              value={data?.downPaymentPercent ?? ''}
              onChange={(e) => updateData('downPaymentPercent', e.target.value === '' ? '' : Number(e.target.value))}
              className="pr-8"
            />
            <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none text-sm text-muted-foreground">
              %
            </div>
          </div>
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
      <CalculateButton onCalculate={calculate} />

      {/* Results Section */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Mortgage Summary</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          <div className="text-center">
            <div className="text-2xl font-bold currency-orange">
              {formatCurrencyNoDecimals(results.downPaymentAmount)}
            </div>
            <div className="text-sm text-muted-foreground">Down Payment</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold currency-blue">
              {formatCurrencyNoDecimals(results.calculatedLoanAmount)}
            </div>
            <div className="text-sm text-muted-foreground">Loan Amount</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold currency-blue">
              {formatCurrencyNoDecimals(results.monthlyPayment)}
            </div>
            <div className="text-sm text-muted-foreground">Monthly Payment</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold currency-red">
              {formatCurrencyNoDecimals(results.totalInterest)}
            </div>
            <div className="text-sm text-muted-foreground">Total Interest</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold currency-blue">
              {formatCurrencyNoDecimals(results.totalPaid)}
            </div>
            <div className="text-sm text-muted-foreground">Total Paid</div>
          </div>
        </CardContent>
      </Card>

      {/* Understanding Section */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Understanding Your Mortgage</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="leading-relaxed">
            For your {formatCurrencyNoDecimals(toNumber(data?.homePrice || 0))} home with a {toNumber(data?.downPaymentPercent || 0)}% down payment ({formatCurrency(results.downPaymentAmount)}),
            you'll need to finance {formatCurrencyNoDecimals(results.calculatedLoanAmount)} at {toNumber(data?.interestRate || 0)}% interest for {toNumber(data?.loanTerm || 0)} years. 
            Your monthly payment will be {formatCurrency(results.monthlyPayment)}. 
            <br /> 
            Over the life of the loan, you'll pay {formatCurrency(results.totalInterest)} in interest, making your total payments {formatCurrency(results.totalPaid)}. 
            <br />
            The interest represents {((results.totalInterest / results.totalPaid) * 100).toFixed(1)}% of your Total Purchase.
          </p>
        </CardContent>
      </Card>

      {/* Yearly Amortization Schedule */}
      {yearlySchedule.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Yearly Amortization Schedule</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto max-h-96 pr-2">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-left table-header-shaded">Year</TableHead>
                    <TableHead className="text-right table-header-shaded">Total Payment</TableHead>
                    <TableHead className="text-right table-header-shaded">Total Principal</TableHead>
                    <TableHead className="text-right table-header-shaded">Total Interest</TableHead>
                    <TableHead className="text-right pr-4 table-header-shaded">End Balance</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {yearlySchedule.map((yearData) => (
                    <TableRow key={yearData.year}>
                      <TableCell className="font-medium">{yearData.year}</TableCell>
                      <TableCell className="text-right">{formatCurrency(yearData.totalPayment)}</TableCell>
                      <TableCell className="text-right">{formatCurrency(yearData.totalPrincipal)}</TableCell>
                      <TableCell className="text-right currency-red">{formatCurrency(yearData.totalInterest)}</TableCell>
                      <TableCell className="text-right pr-4">{formatCurrency(yearData.endBalance)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Monthly Payment Breakdown */}
      {monthlySchedule.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Complete Monthly Payment Schedule</CardTitle>
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
                  {monthlySchedule.map((payment) => (
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
              <strong>Your home can be your best investment or your biggest financial mistake.</strong> A mortgage 
              gives you a place to live, providing shelter and stability. It can also potentially help you build wealth 
              over time through real estate appreciation. However, the total interest paid over 30 years often equals 
              or exceeds the original loan amount. Making extra principal payments early in the loan dramatically 
              reduces total interest costs. Buy what you can afford, not what the bank will lend you.
          </p>
        </CardContent>
      </Card>
    </div>
  )
}