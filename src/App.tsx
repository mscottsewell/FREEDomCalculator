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
    <div className="min-h-screen">
      {/* Header — sticky fintech gradient */}
      <header className="sticky top-0 z-40 overflow-hidden">
        <div
          className="absolute inset-0"
          style={{
            background: 'linear-gradient(135deg, oklch(0.20 0.09 162) 0%, oklch(0.20 0.08 20) 100%)',
          }}
        />
        <div
          className="absolute inset-0 opacity-[0.08]"
          style={{
            backgroundImage: 'radial-gradient(circle, white 1px, transparent 1px)',
            backgroundSize: '20px 20px',
          }}
        />
        <div className="container mx-auto px-4 sm:px-6 py-4 relative">
          <div className="flex items-center gap-3 sm:gap-4">
            <div className="w-11 h-11 sm:w-13 sm:h-13 rounded-2xl flex items-center justify-center overflow-hidden shrink-0 shadow-lg">
              <img
                src={collegeLogo}
                alt="FHU Bell Tower"
                className="w-full h-full object-contain"
              />
            </div>
            <div className="flex-1 min-w-0">
              <h1
                className="text-lg sm:text-2xl font-bold tracking-tight leading-tight"
                style={{
                  backgroundImage: 'linear-gradient(90deg, #ffffff 30%, oklch(0.88 0.15 162))',
                  WebkitBackgroundClip: 'text',
                  backgroundClip: 'text',
                  color: 'transparent',
                }}
              >
                Financial FREED-om Calculators
              </h1>
              <p className="text-white/50 text-xs sm:text-sm mt-0.5 truncate">
                Master your money. Build your future. <span className="opacity-100 text-white/80">💸</span>
              </p>
            </div>
            <span className="hidden sm:block text-white/70 text-xs shrink-0">
              by Mrs. Sewell
            </span>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="container mx-auto px-3 sm:px-6 py-3 sm:py-5">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="flex lg:grid lg:grid-cols-7 gap-1.5 w-full h-auto p-1.5 bg-card border shadow-sm rounded-2xl justify-start">
            {calculators.map((calc) => {
              const Icon = calc.icon
              const isActive = activeTab === calc.id
              return (
                <TabsTrigger
                  key={calc.id}
                  value={calc.id}
                  className="flex flex-col items-center gap-1.5 p-2 sm:p-3 h-auto shrink-0 min-w-[72px] sm:min-w-[88px] lg:min-w-0 rounded-xl data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-md transition-all duration-150"
                >
                  <Icon size={20} weight={isActive ? 'fill' : 'regular'} />
                  <span className="text-xs text-center leading-tight font-semibold">{calc.name}</span>
                </TabsTrigger>
              )
            })}
          </TabsList>

          {calculators.map((calc) => {
            const Component = calc.component
            return (
              <TabsContent key={calc.id} value={calc.id} className="mt-4">
                {calc.id === 'hp12c' ? (
                  <Suspense fallback={<div className="flex items-center justify-center p-8 text-muted-foreground">Loading calculator...</div>}>
                    <Component />
                  </Suspense>
                ) : (
                  <Card className="rounded-2xl border-border/60">
                    <CardContent className="pt-5">
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