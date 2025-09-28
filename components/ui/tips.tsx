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
  requiresSearch?: boolean; // Only show this tip after a search has been performed
}

export type SearchMode = 'analysis' | 'search';

const tipsByMode: Record<SearchMode, Tip[]> = {
  analysis: [
    {
      title: 'Price Analysis Mode',
      content: "Let's help you evaluate if a specific car's price is fair based on market data.",
    },
    {
      title: 'Select Car Details',
      content:
        "Start by selecting the make and model of the car you're interested in, along with its year.",
      highlight: '#make, #model, #year',
    },
    {
      title: 'Add Usage Details',
      content:
        'Enter the kilometers and price (if you have them). This helps us find comparable cars and evaluate the deal.',
      highlight: '#kilometers, #price',
    },
    {
      title: 'Submit Search',
      content:
        'Click the "Analyze Price" button to submit your search and see the results.',
      highlight: '#submit',
    },
    {
      title: 'Understanding Results',
      content:
        "We'll show you price estimates and similar listings. The graph helps visualize where your car sits in the market.",
      highlight: '#analysis-graph',
      requiresSearch: true
    },
    {
      title: 'Similar Cars',
      content:
        'Browse similar listings sorted by how good of a deal they are. Click any listing to see more details.',
      highlight: '#similar-cars',
      requiresSearch: true
    },
  ],
  search: [
    {
      title: 'Range Search Mode',
      content: 'Welcome to Range Search! Here you can find cars based on your criteria.',
    },
    {
      title: 'Using Filters',
      content:
        'Select a make and model to start your search. Leave blank to see all makes/models.',
      highlight: '#make, #model',
    },
    {
      title: 'Filter By Range',
      content:
        'You can filter by year, kilometers, and price ranges to narrow down the listings to your preferences. You can also leave fields blank to avoid filtering by that criterion.',
      highlight: '#year, #km-range, #price-range',
    },
    {
      title: 'Submit Search',
      content:
        'Click the "Search Listings" button to submit your search and see the results.',
      highlight: '#submit',
    },
    {
      title: 'Search Results',
      content:
        'After searching, you\'ll see matching cars sorted by relevance. Click any listing to see more details.',
      highlight: '#search-results',
      requiresSearch: true
    },
    {
      title: 'Combined Sorting',
      content:
        'Want to sort by multiple criteria? Keep clicking different sort buttons to add them to the sort chain.',
      highlight: '#sort-buttons',
      requiresSearch: true
    },
    {
      title: 'Quick Analysis',
      content:
        'Found an interesting car? Click "Analyze Price" on any listing to switch to Price Analysis mode and see how it compares.',
      highlight: '#analyze-price-button',
      requiresSearch: true
    },
  ],
};

// We use tipsByMode directly in the component

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

export function TipsSystem({ 
  mode = 'analysis',
  hasSearched = false 
}: { 
  mode?: SearchMode;
  hasSearched?: boolean;
}) {
  const [showTips, setShowTips] = useState(false);
  const [currentTip, setCurrentTip] = useState(0);
  
  // Get the tips for the current mode only
  const currentModeTips = tipsByMode[mode];
  // Then filter based on search state
  const tips = currentModeTips.filter(tip => !tip.requiresSearch || hasSearched);

  // Show tips for first-time users or first time in range mode
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const viewedKey = `carPriceTips_${mode}Viewed`;
    const viewed = localStorage.getItem(viewedKey);
    if (!viewed) setShowTips(true);
  }, [mode]);

  // OPEN on demand: listen for a global event
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const openHandler = (e: Event) => {
      const ce = e as CustomEvent<TipOpenDetail>;
      const detail = ce.detail ?? {};
      if (detail.resetSeen) {
        // Clear viewed state for current mode only
        localStorage.removeItem(`carPriceTips_${mode}Viewed`);
      }
      // Only show tips if there are any for this mode
      if (tips.length > 0) {
        const step = Math.max(0, Math.min(tips.length - 1, detail.step ?? 0));
        setCurrentTip(step);
        setShowTips(true);
      }
    };

    window.addEventListener('open-tips', openHandler as EventListener);
    return () => window.removeEventListener('open-tips', openHandler as EventListener);
  }, [mode, tips.length]);

  // Close tips when mode changes
  useEffect(() => {
    clearHighlights();
    setShowTips(false);
    setCurrentTip(0);
  }, [mode]);

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
  }, [showTips, currentTip, tips]);

  const closeAndRemember = () => {
    if (typeof window !== 'undefined') {
      localStorage.setItem(`carPriceTips_${mode}Viewed`, 'true');
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

  // Don't render anything if there are no tips for this mode
  if (!tips.length) return null;

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
