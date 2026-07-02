import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Calculator, ArrowSquareOut } from '@phosphor-icons/react'
import { Button } from '@/components/ui/button'

export function HP12cCalculator() {
  return (
    <div className="space-y-5 sm:space-y-6">
      {/* Hero banner */}
      <div
        className="relative overflow-hidden rounded-2xl p-4 sm:p-5 text-white"
        style={{ background: 'linear-gradient(135deg, oklch(0.38 0.04 250), oklch(0.20 0.03 250))' }}
      >
        <div
          className="pointer-events-none absolute inset-0 opacity-10"
          style={{ backgroundImage: 'radial-gradient(circle, white 1px, transparent 1px)', backgroundSize: '18px 18px' }}
        />
        <div className="relative flex items-start gap-3 sm:gap-4">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white/15 backdrop-blur">
            <Calculator size={24} weight="fill" />
          </div>
          <div>
            <h2 className="text-base sm:text-xl font-bold tracking-tight">The HP-12C, Reimagined 🧮</h2>
            <p className="mt-0.5 text-xs sm:text-sm text-white/80 max-w-none">
              The legendary financial calculator that's sat on bankers' desks since 1981. Master the keystrokes
              right here — <em>no purchase required</em>.
            </p>
          </div>
        </div>
      </div>

      {/* Iframe container with pop-out button */}
      <div className="relative w-full bg-white rounded-lg shadow-lg overflow-hidden" style={{ height: '1000px' }}>
        {/* Pop-out button in upper right corner */}
        <Button
          onClick={() => window.open('https://mscottsewell.github.io/HP12c/', '_blank', 'noopener,noreferrer')}
          className="absolute top-2 right-2 z-10 flex items-center gap-2"
          variant="secondary"
          size="sm"
        >
          <ArrowSquareOut size={16} />
          <span className="hidden sm:inline">Open in New Tab</span>
        </Button>
        
        <iframe
          src="https://mscottsewell.github.io/HP12c/"
          className="absolute top-0 left-0 w-full h-full border-0"
          title="HP-12C Financial Calculator Simulator"
          allow="fullscreen"
          sandbox="allow-scripts allow-same-origin"
          loading="lazy"
        />
      </div>

      {/* Key Lesson Section */}
      <Card className="bg-accent/5 border-accent/20">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            💡 About the HP-12C
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="leading-relaxed font-medium">
            <strong>The HP-12C has been the industry standard since 1981.</strong> Its Reverse Polish Notation (RPN) 
            system allows for efficient calculations without parentheses. Many finance professionals prefer it because 
            it matches the way financial problems are naturally solved—step by step. Learning RPN develops stronger 
            problem-solving skills and a deeper understanding of financial calculations. The HP-12C remains so popular 
            that it's still manufactured and sold today, over 40 years after its introduction.
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
