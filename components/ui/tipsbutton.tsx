'use client';

import { Button } from '@/components/ui/button';
import { HelpCircle } from 'lucide-react';

type Props = {
  startAtStep?: number;   // optional: open at a specific step (0-based)
  resetSeen?: boolean;    // optional: also clear the “seen” flag
  className?: string;
  variant?: 'default' | 'outline' | 'ghost' | 'secondary';
  size?: 'default' | 'sm' | 'lg' | 'icon';
};

export function TipsButton({
  startAtStep = 0,
  resetSeen = false,
  className,
  variant = 'outline',
  size = 'sm',
}: Props) {
  const openTips = () => {
    if (typeof window === 'undefined') return;
    window.dispatchEvent(
      new CustomEvent('open-tips', { detail: { step: startAtStep, resetSeen } })
    );
  };

  return (
    <Button onClick={openTips} variant={variant} size={size} className={className}>
      <HelpCircle className="h-4 w-4 mr-2" />
      Tips
    </Button>
  );
}
