import { useState } from 'react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { 
  Calculator, 
  TrendUp, 
  Timer, 
  CreditCard, 
  Car, 
  House 
} from '@phosphor-icons/react'
import collegeLogo from '@/assets/images/FHU_COB.jpg'
import { InflationCalculator } from '@/components/InflationCalculator'
import { CompoundInterestCalculator } from '@/components/CompoundInterestCalculator'
import { TimeValueOfMoneyCalculator } from '@/components/TimeValueOfMoneyCalculator'
import { CreditCardCalculator } from '@/components/CreditCardCalculator'
import { AutoLoanCalculator } from '@/components/AutoLoanCalculator'
import { MortgageCalculator } from '@/components/MortgageCalculator'

const calculators = [
  { id: 'inflation', name: 'Inflation', icon: TrendUp, component: InflationCalculator },
  { id: 'compound', name: 'Compound Interest', icon: Calculator, component: CompoundInterestCalculator },
  { id: 'timevalue', name: 'Time Value of Money', icon: Timer, component: TimeValueOfMoneyCalculator },
  { id: 'creditcard', name: 'Credit Card', icon: CreditCard, component: CreditCardCalculator },
  { id: 'autoloan', name: 'Auto Loan', icon: Car, component: AutoLoanCalculator },
  { id: 'mortgage', name: 'Mortgage', icon: House, component: MortgageCalculator }
]

function App() {
  const [activeTab, setActiveTab] = useState('inflation')

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="bg-primary text-primary-foreground">
        <div className="container mx-auto px-4 py-6">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 bg-white/10 rounded-lg flex items-center justify-center p-1">
              <img 
                src={collegeLogo} 
                alt="FHU College of Business Logo" 
                className="w-full h-full object-contain"
              />
            </div>
            <div>
              <h1 className="text-2xl md:text-3xl font-bold">
                Mrs. Sewell's Financial FREEDom Calculators
              </h1>
              <p className="text-primary-foreground/80 text-sm md:text-base">
                Personal Finance Made Easy
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="container mx-auto px-8 py-6">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-2 md:grid-cols-6 gap-2 h-auto p-2">
            {calculators.map((calc) => {
              const Icon = calc.icon
              return (
                <TabsTrigger
                  key={calc.id}
                  value={calc.id}
                  className="flex flex-col items-center gap-2 p-3 h-auto text-xs md:text-sm"
                >
                  <Icon size={64} />
                  <span className="text-center leading-tight font-bold">{calc.name}</span>
                </TabsTrigger>
              )
            })}
          </TabsList>

          {calculators.map((calc) => {
            const Component = calc.component
            return (
              <TabsContent key={calc.id} value={calc.id} className="mt-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <calc.icon size={24} />
                      {calc.name} Calculator
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <Component />
                  </CardContent>
                </Card>
              </TabsContent>
            )
          })}
        </Tabs>
      </div>
    </div>
  )
}

export default App