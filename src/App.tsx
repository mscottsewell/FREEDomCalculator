import { useState, useRef, useEffect, useCallback } from 'react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Card, CardContent } from '@/components/ui/card'
import { 
  Calculator, 
  TrendUp, 
  Timer, 
  CreditCard, 
  Car, 
  House,
  Island,
  Wallet,
  CaretLeft,
  CaretRight
} from '@phosphor-icons/react'
import collegeLogo from '@/assets/images/BellTower.svg'

// Static imports — all calculators are bundled together. They share heavy deps
// (recharts) that load once regardless, so code-splitting buys little here, and
// static imports avoid the "Failed to fetch dynamically imported module" errors
// that React.lazy() dynamic imports trigger in the WebContainer dev sandbox.
import { RetirementPlanner } from '@/components/RetirementPlanner'
import { PaycheckCalculator } from '@/components/PaycheckCalculator'
import { InflationCalculator } from '@/components/InflationCalculator'
import { CompoundInterestCalculator } from '@/components/CompoundInterestCalculator'
import { TimeValueOfMoneyCalculator } from '@/components/TimeValueOfMoneyCalculator'
import { CreditCardCalculator } from '@/components/CreditCardCalculator'
import { AutoLoanCalculator } from '@/components/AutoLoanCalculator'
import { MortgageCalculator } from '@/components/MortgageCalculator'
import { HP12cCalculator } from '@/components/HP12cCalculator'

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
  { id: 'retirement', labels: { short: 'Future You', full: 'Future You' }, icon: Island, component: RetirementPlanner },
  { id: 'paycheck', labels: { short: 'Paycheck', full: 'Paycheck Estimator' }, icon: Wallet, component: PaycheckCalculator },
  { id: 'compound', labels: { short: 'Compound', full: 'Compound Interest' }, icon: Calculator, component: CompoundInterestCalculator },
  { id: 'inflation', labels: { short: 'Inflation', full: 'Inflation' }, icon: TrendUp, component: InflationCalculator },
  { id: 'timevalue', labels: { short: 'TVM', full: 'Time Value of Money' }, icon: Timer, component: TimeValueOfMoneyCalculator },
  { id: 'creditcard', labels: { short: 'Credit', full: 'Credit Card' }, icon: CreditCard, component: CreditCardCalculator },
  { id: 'autoloan', labels: { short: 'Auto Loan', full: 'Auto Loan' }, icon: Car, component: AutoLoanCalculator },
  { id: 'mortgage', labels: { short: 'Mortgage', full: 'Mortgage' }, icon: House, component: MortgageCalculator },
  { id: 'hp12c', labels: { short: 'HP-12C', full: 'HP-12C' }, icon: Calculator, component: HP12cCalculator }
]

function App() {
  const [activeTab, setActiveTab] = useState('retirement')
  const scrollerRef = useRef<HTMLDivElement>(null)
  const [canLeft, setCanLeft] = useState(false)
  const [canRight, setCanRight] = useState(false)

  // Recompute whether the tab strip can scroll further left/right.
  const updateArrows = useCallback(() => {
    const el = scrollerRef.current
    if (!el) return
    const { scrollLeft, scrollWidth, clientWidth } = el
    const maxScroll = scrollWidth - clientWidth
    setCanLeft(scrollLeft > 1)
    setCanRight(scrollLeft < maxScroll - 1)
  }, [])

  // Wire up scroll + resize listeners, and a ResizeObserver so the arrows stay
  // correct when the viewport changes or the tab labels show/hide at breakpoints.
  useEffect(() => {
    const el = scrollerRef.current
    if (!el) return
    updateArrows()
    el.addEventListener('scroll', updateArrows, { passive: true })
    window.addEventListener('resize', updateArrows)
    const ro = new ResizeObserver(updateArrows)
    ro.observe(el)
    if (el.firstElementChild) ro.observe(el.firstElementChild)
    return () => {
      el.removeEventListener('scroll', updateArrows)
      window.removeEventListener('resize', updateArrows)
      ro.disconnect()
    }
  }, [updateArrows])

  // Keep the selected tab visible — center it within the scroller when it changes.
  useEffect(() => {
    const el = scrollerRef.current
    if (!el) return
    const active = el.querySelector<HTMLElement>('[data-state="active"]')
    if (active) {
      const elRect = el.getBoundingClientRect()
      const aRect = active.getBoundingClientRect()
      const offset = aRect.left - elRect.left - (elRect.width - aRect.width) / 2
      el.scrollBy({ left: offset, behavior: 'smooth' })
    }
    const t = window.setTimeout(updateArrows, 300)
    return () => window.clearTimeout(t)
  }, [activeTab, updateArrows])

  const scrollByDir = (dir: -1 | 1) => {
    const el = scrollerRef.current
    if (!el) return
    el.scrollBy({ left: dir * Math.max(160, el.clientWidth * 0.7), behavior: 'smooth' })
  }

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
          <div
            className="top-nav"
            data-can-left={canLeft}
            data-can-right={canRight}
          >
            <div className="top-nav-scroller" ref={scrollerRef}>
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
            </div>

            {/* Edge fades — only visible when more tabs lie beyond that edge */}
            <div className="top-nav-fade top-nav-fade-left" aria-hidden="true" />
            <div className="top-nav-fade top-nav-fade-right" aria-hidden="true" />

            {/* Scroll arrows — rendered only when scrollable in that direction */}
            {canLeft && (
              <button
                type="button"
                className="top-nav-arrow top-nav-arrow-left"
                aria-label="Scroll tabs left"
                onClick={() => scrollByDir(-1)}
              >
                <CaretLeft size={16} weight="bold" />
              </button>
            )}
            {canRight && (
              <button
                type="button"
                className="top-nav-arrow top-nav-arrow-right"
                aria-label="Scroll tabs right"
                onClick={() => scrollByDir(1)}
              >
                <CaretRight size={16} weight="bold" />
              </button>
            )}
          </div>

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
                    <Component />
                  </>
                ) : (
                  <Card className="app-tab-card">
                    <CardContent className="app-tab-card-content">
                      <div className="mobile-tab-title">
                        <Icon size={18} weight="fill" />
                        <span>{calc.labels.full}</span>
                      </div>
                      <Component />
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
          AmyCalc.com - Amy Sewell-CFP®, &copy;2026
        </div>
      </footer>
    </div>
  )
}

export default App
