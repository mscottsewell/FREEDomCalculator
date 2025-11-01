import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Calculator, ArrowSquareOut } from '@phosphor-icons/react'
import { Button } from '@/components/ui/button'

export function HP12cCalculator() {
  return (
    <div className="space-y-4">
      {/* Iframe container with pop-out button */}
      <div className="relative w-full bg-white rounded-lg shadow-lg overflow-hidden" style={{ height: '1000px' }}>
        {/* Pop-out button in upper right corner */}
        <Button
          onClick={() => window.open('https://mscottsewell.github.io/HP12c/', '_blank')}
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
          loading="lazy"
        />
      </div>

      {/* Key Lesson Section */}
      <Card className="bg-accent/5 border-accent/20">
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            💡 About the HP-12C
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-lg leading-relaxed font-medium">
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
