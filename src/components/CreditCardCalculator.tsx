import { useState } from "react";
import { useKV } from '@github/spark/hooks'
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { CalculateButton } from "@/components/ui/calculate-button";
import { NumericOrEmpty, isValidNumber, toNumber, formatFieldName } from "@/lib/calculator-validation";

interface CreditCardData {
  balance: NumericOrEmpty;
  apr: NumericOrEmpty;
  paymentType: "minimum" | "fixed";
  fixedPayment: NumericOrEmpty;
  minimumPayment: NumericOrEmpty;
}

interface PaymentSchedule {
  month: number;
  payment: number;
  principal: number;
  interest: number;
  balance: number;
  year: number;
}

interface ChartDataPoint {
  month: number;
  principal: number;
  interest: number;
}

export function CreditCardCalculator() {
  const [data, setData] = useKV<CreditCardData>("creditcard-calculator", {
    balance: 5000,
    apr: 29.99,
    paymentType: "minimum",
    fixedPayment: 150,
    minimumPayment: 15,
  });

  const [results, setResults] = useState({
    monthsToPayoff: 0,
    totalInterest: 0,
    totalPaid: 0,
  });

  const [schedule, setSchedule] = useState([]);
  const [chartData, setChartData] = useState([]);

  const formatCurrency = (amount: number): string => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount);
  };

  const formatCurrencyWholeDollars = (amount: number): string => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(Math.round(amount));
  };

  const calculate = () => {
    const validationError = validateInputs()
    if (validationError) return

    const balance = toNumber(data!.balance)
    const apr = toNumber(data!.apr)
    const fixedPayment = toNumber(data!.fixedPayment)
    const minimumPayment = toNumber(data!.minimumPayment)

    const monthlyRate = apr / 100 / 12;
    let currentBalance = balance;
    const paymentHistory: PaymentSchedule[] = [];
    const chartPoints: ChartDataPoint[] = [];
    let month = 0;
    let totalInterest = 0;

    while (currentBalance > 0.01 && month < 600) {
      // Cap at 50 years to prevent infinite loops
      month++;
      const interestPayment = currentBalance * monthlyRate;

      let payment: number;
      if (data!.paymentType === "minimum") {
        // Interest + 1% of balance (minimum payment calculation)
        payment = Math.max(
          minimumPayment,
          interestPayment + currentBalance * 0.01
        ); // Use user-defined minimum payment
      } else {
        payment = fixedPayment;
      }

      // Don't pay more than the remaining balance
      payment = Math.min(payment, currentBalance + interestPayment);

      const principalPayment = payment - interestPayment;
      currentBalance = Math.max(0, currentBalance - principalPayment);

      totalInterest += interestPayment;

      const year = Math.ceil(month / 12);
      paymentHistory.push({
        month,
        payment,
        principal: principalPayment,
        interest: interestPayment,
        balance: currentBalance,
        year,
      });

      chartPoints.push({
        month,
        principal: principalPayment,
        interest: interestPayment,
      });

      if (currentBalance <= 0.01) break;
    }

    setResults({
      monthsToPayoff: month,
      totalInterest,
      totalPaid: balance + totalInterest,
    });

    setSchedule(paymentHistory);
    setChartData(chartPoints);
  };

  const validateInputs = (): string | null => {
    if (!isValidNumber(data?.balance)) return "Please enter a valid balance"
    if (!isValidNumber(data?.apr)) return "Please enter a valid APR"
    
    const balance = toNumber(data!.balance)
    const apr = toNumber(data!.apr)
    
    if (balance <= 0) return "Balance must be greater than 0"
    if (apr < 0) return "APR cannot be negative"
    
    if (data?.paymentType === "fixed") {
      if (!isValidNumber(data?.fixedPayment)) return "Please enter a valid fixed payment amount"
      const fixedPayment = toNumber(data!.fixedPayment)
      if (fixedPayment <= 0) return "Fixed payment must be greater than 0"
    } else {
      if (!isValidNumber(data?.minimumPayment)) return "Please enter a valid minimum payment percentage"
      const minimumPayment = toNumber(data!.minimumPayment)
      if (minimumPayment <= 0) return "Minimum payment percentage must be greater than 0"
    }

    return null
  }

  const updateData = (field: keyof CreditCardData, value: NumericOrEmpty | string) => {
    setData((current) => {
      const safeCurrent = current || {
        balance: 5000,
        apr: 22.99,
        paymentType: "minimum",
        fixedPayment: 150,
        minimumPayment: 25,
      };
      return { ...safeCurrent, [field]: value };
    });
  };

  // Group schedule by year for better display
  const yearlySchedule = schedule.reduce((acc, payment) => {
    if (!acc[payment.year]) {
      acc[payment.year] = {
        year: payment.year,
        totalPayment: 0,
        totalPrincipal: 0,
        totalInterest: 0,
        endBalance: 0,
        months: [],
      };
    }
    acc[payment.year].totalPayment += payment.payment;
    acc[payment.year].totalPrincipal += payment.principal;
    acc[payment.year].totalInterest += payment.interest;
    acc[payment.year].endBalance = payment.balance;
    acc[payment.year].months.push(payment);
    return acc;
  }, {} as Record<number, any>);

  return (
    <div className="space-y-6">
      {/* Input Section */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="space-y-2">
          <Label htmlFor="balance">Current Balance ($)</Label>
          <Input
            id="balance"
            type="number"
            value={data!.balance}
            onChange={(e) => updateData("balance", e.target.value === '' ? '' : Number(e.target.value))}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="apr">Annual Percentage Rate (%)</Label>
          <Input
            id="apr"
            type="number"
            step="0.01"
            value={data!.apr}
            onChange={(e) => updateData("apr", e.target.value === '' ? '' : Number(e.target.value))}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="payment-type">Payment Method</Label>
          <Select
            value={data!.paymentType}
            onValueChange={(value) => updateData("paymentType", value)}
          >
            <SelectTrigger id="payment-type" className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="minimum">Interest + 1% of Balance</SelectItem>
              <SelectItem value="fixed">Fixed Payment Amount</SelectItem>
            </SelectContent>
          </Select>
        </div>
        {data!.paymentType === "minimum" && (
          <div className="space-y-2">
            <Label htmlFor="minimum-payment">Minimum Payment ($)</Label>
            <Input
              id="minimum-payment"
              type="number"
              value={data!.minimumPayment}
              onChange={(e) =>
                updateData("minimumPayment", e.target.value === '' ? '' : Number(e.target.value))
              }
            />
          </div>
        )}
        {data!.paymentType === "fixed" && (
          <div className="space-y-2">
            <Label htmlFor="fixed-payment">Fixed Payment ($)</Label>
            <Input
              id="fixed-payment"
              type="number"
              value={data!.fixedPayment}
              onChange={(e) =>
                updateData("fixedPayment", e.target.value === '' ? '' : Number(e.target.value))
              }
            />
          </div>
        )}
      </div>

      {/* Calculate Button */}
      <CalculateButton onCalculate={calculate} />

      {/* Results Section */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Payoff Summary</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="text-center">
            <div className="text-2xl font-bold currency-blue">
              {results.monthsToPayoff} months
            </div>
            <div className="text-sm text-muted-foreground">
              Months to Payoff
            </div>
          </div>{" "}
          <div className="text-center">
            <div className="text-2xl font-bold currency-red">
              {formatCurrencyWholeDollars(results.totalInterest)}
            </div>
            <div className="text-sm text-muted-foreground">
              Total Interest Paid
            </div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold currency-blue">
              {formatCurrencyWholeDollars(results.totalPaid)}
            </div>
            <div className="text-sm text-muted-foreground">
              Total Amount Paid
            </div>
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
              <AreaChart
                data={chartData}
                margin={{ left: 20, right: 5, top: 5, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" fontSize={12} />
                <YAxis
                  tickFormatter={(value) => formatCurrency(value)}
                  fontSize={12}
                />
                <Tooltip
                  formatter={(value: number, name: string) => [
                    formatCurrency(value),
                    name === "principal" ? "Principal" : "Interest",
                  ]}
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
                    <TableHead className="text-left table-header-shaded">
                      Year
                    </TableHead>
                    <TableHead className="text-right table-header-shaded">
                      Total Payment
                    </TableHead>
                    <TableHead className="text-right table-header-shaded">
                      Total Principal
                    </TableHead>
                    <TableHead className="text-right table-header-shaded">
                      Total Interest
                    </TableHead>
                    <TableHead className="text-right table-header-shaded">
                      End Balance
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {Object.values(yearlySchedule).map((yearData: any) => (
                    <TableRow key={yearData.year}>
                      <TableCell className="font-medium">
                        {yearData.year}
                      </TableCell>
                      <TableCell className="text-right">
                        {formatCurrency(yearData.totalPayment)}
                      </TableCell>
                      <TableCell className="text-right">
                        {formatCurrency(yearData.totalPrincipal)}
                      </TableCell>
                      <TableCell className="text-right currency-red">
                        {formatCurrency(yearData.totalInterest)}
                      </TableCell>
                      <TableCell className="text-right">
                        {formatCurrency(yearData.endBalance)}
                      </TableCell>
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
                    <TableHead className="text-left sticky top-0 bg-muted table-header-shaded">
                      Month
                    </TableHead>
                    <TableHead className="text-right sticky top-0 bg-muted table-header-shaded">
                      Payment
                    </TableHead>
                    <TableHead className="text-right sticky top-0 bg-muted table-header-shaded">
                      Principal
                    </TableHead>
                    <TableHead className="text-right sticky top-0 bg-muted table-header-shaded">
                      Interest
                    </TableHead>
                    <TableHead className="text-right sticky top-0 bg-muted table-header-shaded">
                      Remaining Balance
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {schedule.map((payment, index) => (
                    <TableRow
                      key={payment.month}
                      className={index % 12 === 0 ? "bg-muted/30" : ""}
                    >
                      <TableCell className="font-medium">
                        {payment.month}
                        {index % 12 === 0 && (
                          <span className="ml-2 text-xs text-muted-foreground">
                            (Year {payment.year})
                          </span>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        {formatCurrency(payment.payment)}
                      </TableCell>
                      <TableCell className="text-right currency-blue">
                        {formatCurrency(payment.principal)}
                      </TableCell>
                      <TableCell className="text-right currency-red">
                        {formatCurrency(payment.interest)}
                      </TableCell>
                      <TableCell className="text-right">
                        {formatCurrency(payment.balance)}
                      </TableCell>
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
            <strong>
              Credit cards can be wealth destroyers.
            </strong>{" "}
            If you only make the minimum payment, most of your money goes toward
            interest instead of reducing the principal balance. This keeps you
            trapped in a cycle of debt. High-interest credit card debt is like
            compound interest working in reverse. Instead of helping you grow
            your money, it drains it. If you have credit card debt, always pay
            more than the minimum and prioritize paying off high-interest
            balances first. The “guaranteed return” from paying off a credit
            card with a 25% interest rate may be one of the best investments you
            ever make.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
