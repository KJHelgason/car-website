'use client';

import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Info } from 'lucide-react';

interface Tip {
  title: string;
  content: string;
  highlight?: string; // CSS selector(s) to highlight, comma-separated
}

const tips: Tip[] = [
  {
    title: 'Welcome to Car Price Analysis!',
    content:
      "Let's walk you through how to get the most out of our car price analysis tool.",
  },
  {
    title: 'Step 1: Select Car Make and Model',
    content:
      "Start by selecting the make and model of the car you're interested in. This helps us find similar cars for comparison.",
    highlight: '#make, #model',
  },
  {
    title: 'Step 2: Choose Year',
    content:
      "You can filter by year to see cars of a specific age, or leave it as 'All Years' to see the full market range.",
    highlight: '#year',
  },
  {
    title: 'Step 3: Add Details (Optional)',
    content:
      'If you have a specific car in mind, enter its kilometers and price. This lets us tell you if it’s a good deal compared to similar cars.',
    highlight: '#kilometers, #price',
  },
  {
    title: 'Step 4: Analyze',
    content:
      "Click 'Analyze Price' to see how your car compares to the market. We'll show you similar listings and tell you if the price is fair.",
    highlight: '#submit',
  },
];

type TipOpenDetail = {
  step?: number;       // start at a given step (0-based)
  resetSeen?: boolean; // if true, clear the “seen” flag before opening
};

function clearHighlights() {
  if (typeof document === 'undefined') return;
  document.querySelectorAll('.tip-highlight').forEach((el) => {
    el.classList.remove('tip-highlight');
  });
}

function applyHighlight(selector?: string) {
  clearHighlights();
  if (typeof document === 'undefined' || !selector) return;
  selector.split(',').forEach((s) => {
    const nodes = document.querySelectorAll(s.trim());
    nodes.forEach((el) => el.classList.add('tip-highlight'));
  });
}

export function TipsSystem() {
  const [showTips, setShowTips] = useState(false);
  const [currentTip, setCurrentTip] = useState(0);

  // Show only for first-time users on initial load
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const viewed = localStorage.getItem('carPriceTipsViewed');
    if (!viewed) setShowTips(true);
  }, []);

  // OPEN on demand: listen for a global event
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const openHandler = (e: Event) => {
      const ce = e as CustomEvent<TipOpenDetail>;
      const detail = ce.detail ?? {};
      if (detail.resetSeen) {
        localStorage.removeItem('carPriceTipsViewed');
      }
      const step = Math.max(0, Math.min(tips.length - 1, detail.step ?? 0));
      setCurrentTip(step);
      setShowTips(true);
    };

    window.addEventListener('open-tips', openHandler as EventListener);
    return () => window.removeEventListener('open-tips', openHandler as EventListener);
  }, []);

  // Apply highlight whenever step/dialog visibility changes
  useEffect(() => {
    if (!showTips) {
      clearHighlights();
      return;
    }
    applyHighlight(tips[currentTip]?.highlight);
    return () => {
      clearHighlights();
    };
  }, [showTips, currentTip]);

  const closeAndRemember = () => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('carPriceTipsViewed', 'true');
    }
    clearHighlights();
    setShowTips(false);
    setCurrentTip(0);
  };

  const handleSkipTips = () => closeAndRemember();
  const handleNext = () => {
    if (currentTip >= tips.length - 1) closeAndRemember();
    else setCurrentTip((p) => p + 1);
  };
  const handleBack = () => setCurrentTip((p) => Math.max(0, p - 1));

  if (!showTips) return null;

  const tip = tips[currentTip];

  return (
    <Dialog
      open={showTips}
      onOpenChange={(open) => {
        if (!open) closeAndRemember();
        else setShowTips(open);
      }}
    >
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{tip.title}</DialogTitle>
          <DialogDescription asChild>
            <div className="mt-1 flex items-start gap-2 text-slate-600">
              <Info className="h-4 w-4 mt-0.5 text-blue-500 shrink-0" />
              <p className="text-sm">{tip.content}</p>
            </div>
          </DialogDescription>
        </DialogHeader>

        <div className="mt-6 flex justify-between items-center">
          <Button variant="ghost" onClick={handleSkipTips}>
            Skip Tips
          </Button>
          <div className="flex gap-2">
            <Button variant="outline" onClick={handleBack} disabled={currentTip === 0}>
              Back
            </Button>
            <Button onClick={handleNext}>
              {currentTip === tips.length - 1 ? 'Got it!' : 'Next'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
