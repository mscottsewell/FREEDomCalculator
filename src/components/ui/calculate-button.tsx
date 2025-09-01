import React from 'react';
import { Button } from '@/components/ui/button';

interface CalculateButtonProps {
  onCalculate: () => void;
  disabled?: boolean;
}

export function CalculateButton({ 
  onCalculate, 
  disabled = false 
}: CalculateButtonProps) {
  return (
    <Button 
      onClick={onCalculate} 
      disabled={disabled}
      className="w-full"
      size="lg"
    >
      Calculate
    </Button>
  );
}