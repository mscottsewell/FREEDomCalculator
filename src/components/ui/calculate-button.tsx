import { Lightning } from '@phosphor-icons/react';
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
      variant="gradient"
      className="w-full h-12 font-bold text-base gap-2"
      size="lg"
    >
      <Lightning size={20} weight="fill" />
      Calculate
    </Button>
  );
}