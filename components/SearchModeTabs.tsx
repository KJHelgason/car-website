'use client';

import { TrendingUp, Search } from 'lucide-react';
import { useLanguage } from '@/lib/language-context';

interface SearchModeTabsProps {
  mode: 'analysis' | 'range';
  onModeChange: (mode: 'analysis' | 'range') => void;
}

export function SearchModeTabs({ mode, onModeChange }: SearchModeTabsProps) {
  const { t } = useLanguage();
  
  return (
    <div className="flex gap-1 mb-0">
      <button
        onClick={() => onModeChange('analysis')}
        className={`
          flex items-center gap-2 px-4 py-2.5 rounded-t-lg font-medium text-sm transition-all cursor-pointer focus:outline-none focus-visible:ring-0
          ${mode === 'analysis' 
            ? 'bg-white text-slate-900 border-t-2 border-x-2 border-slate-200 border-b-0' 
            : 'bg-slate-100 text-slate-600 hover:bg-slate-200 border-2 border-transparent border-b-slate-300'
          }
        `}
      >
        <TrendingUp className="h-4 w-4" />
        <span className="hidden sm:inline">{t('tabs.priceAnalysis')}</span>
        <span className="sm:hidden">{t('tabs.analysis')}</span>
      </button>
      
      <button
        onClick={() => onModeChange('range')}
        className={`
          flex items-center gap-2 px-4 py-2.5 rounded-t-lg font-medium text-sm transition-all cursor-pointer focus:outline-none focus-visible:ring-0
          ${mode === 'range' 
            ? 'bg-white text-slate-900 border-t-2 border-x-2 border-slate-200 border-b-0' 
            : 'bg-slate-100 text-slate-600 hover:bg-slate-200 border-2 border-transparent border-b-slate-300'
          }
        `}
      >
        <Search className="h-4 w-4" />
        <span className="hidden sm:inline">{t('tabs.searchListings')}</span>
        <span className="sm:hidden">{t('tabs.rangeSearch')}</span>
      </button>
    </div>
  );
}
