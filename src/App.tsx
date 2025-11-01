import { useState, lazy, Suspense } from 'react'
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
import collegeLogo from '@/assets/images/FHU_COB.svg'

// Lazy load calculator components for better performance
const InflationCalculator = lazy(() => import('@/components/InflationCalculator').then(m => ({ default: m.InflationCalculator })))
const CompoundInterestCalculator = lazy(() => import('@/components/CompoundInterestCalculator').then(m => ({ default: m.CompoundInterestCalculator })))
const TimeValueOfMoneyCalculator = lazy(() => import('@/components/TimeValueOfMoneyCalculator').then(m => ({ default: m.TimeValueOfMoneyCalculator })))
const CreditCardCalculator = lazy(() => import('@/components/CreditCardCalculator').then(m => ({ default: m.CreditCardCalculator })))
const AutoLoanCalculator = lazy(() => import('@/components/AutoLoanCalculator').then(m => ({ default: m.AutoLoanCalculator })))
const MortgageCalculator = lazy(() => import('@/components/MortgageCalculator').then(m => ({ default: m.MortgageCalculator })))
const HP12cCalculator = lazy(() => import('@/components/HP12cCalculator').then(m => ({ default: m.HP12cCalculator })))

const calculators = [
  { id: 'inflation', name: 'Inflation', icon: TrendUp, component: InflationCalculator },
  { id: 'compound', name: 'Compound Interest', icon: Calculator, component: CompoundInterestCalculator },
  { id: 'timevalue', name: 'Time Value of Money', icon: Timer, component: TimeValueOfMoneyCalculator },
  { id: 'creditcard', name: 'Credit Card', icon: CreditCard, component: CreditCardCalculator },
  { id: 'autoloan', name: 'Auto Loan', icon: Car, component: AutoLoanCalculator },
  { id: 'mortgage', name: 'Mortgage', icon: House, component: MortgageCalculator },
  { id: 'hp12c', name: 'HP-12C', icon: Calculator, component: HP12cCalculator }
]

function App() {
  const [activeTab, setActiveTab] = useState('inflation')

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="bg-primary text-primary-foreground">
        <div className="container mx-auto px-4 py-3">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-white/10 rounded-lg flex items-center justify-center p-1">
              <img 
                src={collegeLogo} 
                alt="FHU College of Business Logo" 
                className="w-full h-full object-contain"
              />
            </div>
            <div>
              <h1 className="text-xl md:text-xl font-bold">
                Mrs. Sewell's Financial FREED-om Calculators
              </h1>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="container mx-auto px-8 py-4">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-1 h-auto p-1">
            {calculators.map((calc) => {
              const Icon = calc.icon
              return (
                <TabsTrigger
                  key={calc.id}
                  value={calc.id}
                  className="flex flex-col items-center gap-1 p-2 h-auto text-xs md:text-sm"
                >
                  <Icon size={24} />
                  <span className="text-center leading-tight font-bold">{calc.name}</span>
                </TabsTrigger>
              )
            })}
          </TabsList>

          {calculators.map((calc) => {
            const Component = calc.component
            return (
              <TabsContent key={calc.id} value={calc.id} className="mt-3">
                {calc.id === 'hp12c' ? (
                  <Suspense fallback={<div className="flex items-center justify-center p-8 text-muted-foreground">Loading calculator...</div>}>
                    <Component />
                  </Suspense>
                ) : (
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <calc.icon size={24} />
                        {calc.name} Calculator
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <Suspense fallback={<div className="flex items-center justify-center p-8 text-muted-foreground">Loading calculator...</div>}>
                        <Component />
                      </Suspense>
                    </CardContent>
                  </Card>
                )}
              </TabsContent>
            )
          })}
        </Tabs>
      </div>
    </div>
  )
}

export default App