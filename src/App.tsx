import { useState, lazy, Suspense } from 'react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Card, CardContent } from '@/components/ui/card'
import { 
  Calculator, 
  TrendUp, 
  Timer, 
  CreditCard, 
  Car, 
  House 
} from '@phosphor-icons/react'
import collegeLogo from '@/assets/images/BellTower.svg'

// Lazy load calculator components for better performance
const InflationCalculator = lazy(() => import('@/components/InflationCalculator').then(m => ({ default: m.InflationCalculator })))
const CompoundInterestCalculator = lazy(() => import('@/components/CompoundInterestCalculator').then(m => ({ default: m.CompoundInterestCalculator })))
const TimeValueOfMoneyCalculator = lazy(() => import('@/components/TimeValueOfMoneyCalculator').then(m => ({ default: m.TimeValueOfMoneyCalculator })))
const CreditCardCalculator = lazy(() => import('@/components/CreditCardCalculator').then(m => ({ default: m.CreditCardCalculator })))
const AutoLoanCalculator = lazy(() => import('@/components/AutoLoanCalculator').then(m => ({ default: m.AutoLoanCalculator })))
const MortgageCalculator = lazy(() => import('@/components/MortgageCalculator').then(m => ({ default: m.MortgageCalculator })))
const HP12cCalculator = lazy(() => import('@/components/HP12cCalculator').then(m => ({ default: m.HP12cCalculator })))

type CalculatorConfig = {
  id: string
  labels: {
    short: string
    full: string
  }
  icon: typeof Calculator
  component: typeof InflationCalculator
}

const calculators: CalculatorConfig[] = [
  { id: 'inflation', labels: { short: 'Inflation', full: 'Inflation' }, icon: TrendUp, component: InflationCalculator },
  { id: 'compound', labels: { short: 'Compound', full: 'Compound Interest' }, icon: Calculator, component: CompoundInterestCalculator },
  { id: 'timevalue', labels: { short: 'TVM', full: 'Time Value of Money' }, icon: Timer, component: TimeValueOfMoneyCalculator },
  { id: 'creditcard', labels: { short: 'Credit', full: 'Credit Card' }, icon: CreditCard, component: CreditCardCalculator },
  { id: 'autoloan', labels: { short: 'Auto Loan', full: 'Auto Loan' }, icon: Car, component: AutoLoanCalculator },
  { id: 'mortgage', labels: { short: 'Mortgage', full: 'Mortgage' }, icon: House, component: MortgageCalculator },
  { id: 'hp12c', labels: { short: 'HP-12C', full: 'HP-12C' }, icon: Calculator, component: HP12cCalculator }
]

function App() {
  const [activeTab, setActiveTab] = useState('inflation')

  return (
    <div className="app-shell">
      {/* Header — sticky fintech gradient */}
      <header className="app-header">
        <div className="app-shell-inner app-header-inner">
          <div className="app-brand-row">
            <div className="app-logo-wrap">
              <img
                src={collegeLogo}
                alt="FHU Bell Tower"
                className="app-logo-image"
              />
            </div>
            <div className="app-title-block">
              <h1 className="app-title">
                Financial FREED-om Calculators
              </h1>
              <p className="app-subtitle">
                Master your money. Build your future. <span>💸</span>
              </p>
            </div>
            <span className="app-byline">
              Amy Sewell, CFP®
            </span>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="app-shell-inner app-main">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="top-nav-tabs">
            {calculators.map((calc) => {
              const Icon = calc.icon
              const isActive = activeTab === calc.id
              return (
                <TabsTrigger
                  key={calc.id}
                  value={calc.id}
                  className="top-nav-tab"
                >
                  <Icon size={20} weight={isActive ? 'fill' : 'regular'} />
                  <span className="top-nav-label-short">{calc.labels.short}</span>
                  <span className="top-nav-label-full">{calc.labels.full}</span>
                </TabsTrigger>
              )
            })}
          </TabsList>

          {calculators.map((calc) => {
            const Component = calc.component
            const Icon = calc.icon
            return (
              <TabsContent key={calc.id} value={calc.id} className="mt-0">
                {calc.id === 'hp12c' ? (
                  <>
                    <div className="mobile-tab-title">
                      <Icon size={18} weight="fill" />
                      <span>{calc.labels.full}</span>
                    </div>
                    <Suspense fallback={<div className="flex items-center justify-center p-8 text-muted-foreground">Loading calculator...</div>}>
                      <Component />
                    </Suspense>
                  </>
                ) : (
                  <Card className="app-tab-card">
                    <CardContent className="app-tab-card-content">
                      <div className="mobile-tab-title">
                        <Icon size={18} weight="fill" />
                        <span>{calc.labels.full}</span>
                      </div>
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
      </main>
      <footer className="app-footer">
        <div className="app-shell-inner app-footer-inner">
          AmyCalc.com - Amy Sewell, &copy;2026
        </div>
      </footer>
    </div>
  )
}

export default App
