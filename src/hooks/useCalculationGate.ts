import { useEffect, useRef, useState } from 'react'

export function useCalculationGate<T>(inputs: T, calculate: () => void) {
  const [hasCalculated, setHasCalculated] = useState(false)
  const calculateRef = useRef(calculate)
  calculateRef.current = calculate

  useEffect(() => {
    if (hasCalculated) calculateRef.current()
  }, [inputs, hasCalculated])

  const requestCalculation = () => {
    if (hasCalculated) {
      calculateRef.current()
    } else {
      setHasCalculated(true)
    }
  }

  return { hasCalculated, requestCalculation }
}
