'use client';

import { useState, useEffect, useRef, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Info, X } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

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

// Calculate optimal position for tooltip
function calculatePosition(targetElement: Element | null, tooltipWidth: number, tooltipHeight: number) {
  if (!targetElement) {
    // Center on screen if no target
    return {
      top: '50%',
      left: '50%',
      transform: 'translate(-50%, -50%)',
    };
  }

  const rect = targetElement.getBoundingClientRect();
  const viewportWidth = window.innerWidth;
  const viewportHeight = window.innerHeight;
  const padding = 16; // Space between tooltip and target
  const edgeMargin = 16; // Min space from screen edges

  // Try positions in order of preference: bottom, top, right, left
  const positions = [
    // Below target
    {
      top: rect.bottom + padding,
      left: rect.left + rect.width / 2 - tooltipWidth / 2,
      arrow: 'top' as const,
    },
    // Above target
    {
      top: rect.top - tooltipHeight - padding,
      left: rect.left + rect.width / 2 - tooltipWidth / 2,
      arrow: 'bottom' as const,
    },
    // Right of target
    {
      top: rect.top + rect.height / 2 - tooltipHeight / 2,
      left: rect.right + padding,
      arrow: 'left' as const,
    },
    // Left of target
    {
      top: rect.top + rect.height / 2 - tooltipHeight / 2,
      left: rect.left - tooltipWidth - padding,
      arrow: 'right' as const,
    },
  ];

  // Find first position that fits in viewport
  for (const pos of positions) {
    // Adjust horizontal position if needed
    let adjustedLeft = pos.left;
    if (adjustedLeft < edgeMargin) adjustedLeft = edgeMargin;
    if (adjustedLeft + tooltipWidth > viewportWidth - edgeMargin) {
      adjustedLeft = viewportWidth - tooltipWidth - edgeMargin;
    }

    // Adjust vertical position if needed
    let adjustedTop = pos.top;
    if (adjustedTop < edgeMargin) adjustedTop = edgeMargin;
    if (adjustedTop + tooltipHeight > viewportHeight - edgeMargin) {
      adjustedTop = viewportHeight - tooltipHeight - edgeMargin;
    }

    // Check if this position fits reasonably well
    const fitsHorizontally = adjustedLeft >= edgeMargin && adjustedLeft + tooltipWidth <= viewportWidth - edgeMargin;
    const fitsVertically = adjustedTop >= edgeMargin && adjustedTop + tooltipHeight <= viewportHeight - edgeMargin;

    if (fitsHorizontally && fitsVertically) {
      return {
        top: `${adjustedTop}px`,
        left: `${adjustedLeft}px`,
        arrow: pos.arrow,
      };
    }
  }

  // Fallback: center on screen
  return {
    top: '50%',
    left: '50%',
    transform: 'translate(-50%, -50%)',
    arrow: 'none' as const,
  };
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
  const [position, setPosition] = useState<{ top: string; left: string; transform?: string; arrow?: string }>({
    top: '50%',
    left: '50%',
    transform: 'translate(-50%, -50%)',
  });
  const tooltipRef = useRef<HTMLDivElement>(null);
  
  // Get the tips for the current mode only - memoize to prevent infinite loop
  const currentModeTips = tipsByMode[mode];
  // Then filter based on search state - memoize this too
  const tips = useMemo(
    () => currentModeTips.filter(tip => !tip.requiresSearch || hasSearched),
    [currentModeTips, hasSearched]
  );

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

  // Update position when tip changes or window resizes
  useEffect(() => {
    if (!showTips) {
      clearHighlights();
      return;
    }
    
    const updatePosition = () => {
      const tip = tips[currentTip];
      applyHighlight(tip?.highlight);
      
      if (tip?.highlight && tooltipRef.current) {
        const selector = tip.highlight.split(',')[0].trim(); // Use first selector
        const targetElement = document.querySelector(selector);
        
        // Scroll element into view on mobile (or if it's not visible)
        if (targetElement) {
          const rect = targetElement.getBoundingClientRect();
          const isInViewport = (
            rect.top >= 0 &&
            rect.left >= 0 &&
            rect.bottom <= window.innerHeight &&
            rect.right <= window.innerWidth
          );
          
          // On mobile or if element is not fully visible, scroll it into view
          if (!isInViewport || window.innerWidth < 768) {
            targetElement.scrollIntoView({
              behavior: 'smooth',
              block: 'center',
              inline: 'center'
            });
          }
        }
        
        // Wait a bit for scroll to complete before positioning tooltip
        setTimeout(() => {
          if (tooltipRef.current && targetElement) {
            const tooltipRect = tooltipRef.current.getBoundingClientRect();
            const newPos = calculatePosition(targetElement, tooltipRect.width, tooltipRect.height);
            setPosition(newPos);
          }
        }, 100);
      } else {
        // No highlight, center the tooltip
        setPosition({
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
        });
      }
    };

    // Initial position with slight delay to ensure DOM is ready
    const timeoutId = setTimeout(updatePosition, 0);

    // Debounce resize and scroll handlers
    let resizeTimeout: NodeJS.Timeout;
    const debouncedUpdate = () => {
      clearTimeout(resizeTimeout);
      resizeTimeout = setTimeout(updatePosition, 100);
    };

    // Update on window resize or scroll
    window.addEventListener('resize', debouncedUpdate);
    window.addEventListener('scroll', debouncedUpdate, true);
    
    return () => {
      clearTimeout(timeoutId);
      clearTimeout(resizeTimeout);
      clearHighlights();
      window.removeEventListener('resize', debouncedUpdate);
      window.removeEventListener('scroll', debouncedUpdate, true);
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

  if (!showTips || !tips.length) return null;

  const tip = tips[currentTip];

  return (
    <>
      {/* Semi-transparent backdrop without blocking clicks */}
      <div 
        className="fixed inset-0 pointer-events-none z-[9998]"
        style={{ backgroundColor: 'rgba(0, 0, 0, 0.2)' }}
      />
      
      {/* Floating tooltip */}
      <Card
        ref={tooltipRef}
        className="fixed z-[9999] shadow-2xl border-2 border-blue-500 pointer-events-auto max-w-[calc(100vw-2rem)] w-full sm:w-96"
        style={{
          top: position.top,
          left: position.left,
          transform: position.transform,
        }}
      >
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between gap-2">
            <div className="flex items-start gap-2 flex-1">
              <Info className="h-5 w-5 mt-0.5 text-blue-500 shrink-0" />
              <CardTitle className="text-lg">{tip.title}</CardTitle>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleSkipTips}
              className="h-8 w-8 p-0 shrink-0"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </CardHeader>
        
        <CardContent className="space-y-4 pt-0">
          <p className="text-sm text-slate-600">{tip.content}</p>
          
          {/* Progress indicator */}
          <div className="flex items-center gap-1">
            {tips.map((_, idx) => (
              <div
                key={idx}
                className={`h-1.5 flex-1 rounded-full transition-colors ${
                  idx === currentTip ? 'bg-blue-500' : idx < currentTip ? 'bg-blue-300' : 'bg-slate-200'
                }`}
              />
            ))}
          </div>
          
          {/* Navigation */}
          <div className="flex justify-between items-center pt-2">
            <span className="text-xs text-slate-500">
              {currentTip + 1} of {tips.length}
            </span>
            <div className="flex gap-2">
              <Button 
                variant="outline" 
                size="sm"
                onClick={handleBack} 
                disabled={currentTip === 0}
              >
                Back
              </Button>
              <Button 
                size="sm"
                onClick={handleNext}
              >
                {currentTip === tips.length - 1 ? 'Got it!' : 'Next'}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </>
  );
}
