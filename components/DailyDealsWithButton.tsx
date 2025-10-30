'use client';

import { DailyDeals } from './DailyDeals';
import { Button } from './ui/button';
import { Zap } from 'lucide-react';
import { useHeader } from './ClientHeader';
import type { CarItem } from '@/types/form';

interface DailyDealsWithButtonProps {
  onViewPriceAnalysis?: (data: CarItem) => void;
}

export function DailyDealsWithButton({ onViewPriceAnalysis }: DailyDealsWithButtonProps) {
  const { openDealsDialog } = useHeader();

  return (
    <div className="space-y-3">
      <Button 
        onClick={openDealsDialog} 
        variant="outline" 
        className="cursor-pointer w-full gap-2 hover:bg-blue-50 hover:text-blue-700 hover:border-blue-300 transition-colors"
      >
        <Zap className="h-4 w-4" />
        Find More Deals
      </Button>
      <DailyDeals onViewPriceAnalysis={onViewPriceAnalysis} />
    </div>
  );
}
