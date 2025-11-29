'use client';

import { Card, CardContent } from '@/components/ui/card';
import { TrendingUp, Search, Zap, BarChart3 } from 'lucide-react';
import { useLanguage } from '@/lib/language-context';

interface HeroSectionProps {
  activeListingCount: number | null;
}

function formatIntegerWithSeparator(value: number, separator: string) {
  const rounded = Math.round(value);
  return rounded.toString().replace(/\B(?=(\d{3})+(?!\d))/g, separator);
}

function formatActiveListings(
  count: number | null,
  fallback: string,
  language: 'en' | 'is',
) {
  if (typeof count !== 'number' || !Number.isFinite(count)) {
    return fallback;
  }
  const separator = language === 'is' ? '.' : ',';
  return formatIntegerWithSeparator(count, separator);
}

export function HeroSection({ activeListingCount }: HeroSectionProps) {
  const { t, language } = useLanguage();
  const activeListingsDisplay = formatActiveListings(activeListingCount, t('common.unknown'), language);
  const activeListingsLabel = typeof activeListingCount === 'number'
    ? `${activeListingsDisplay} ${t('common.activeListings').toLowerCase()}`
    : t('hero.listings');
  
  return (
    <div className="mb-6">
      {/* Hero Banner */}
      <div className="bg-gradient-to-br from-blue-600 via-blue-700 to-blue-900 text-white rounded-xl p-8 md:p-12 mb-6 shadow-lg">
        <div className="max-w-3xl">
          <h1 className="text-3xl md:text-5xl font-bold mb-4">
            {t('hero.title')}
          </h1>
          <p className="text-lg md:text-xl text-blue-100 mb-8">
            {t('hero.subtitle')}
          </p>
          
          {/* Feature Pills */}
          <div className="flex flex-wrap gap-3">
            <div className="bg-white/10 backdrop-blur-sm rounded-full px-4 py-2 flex items-center gap-2">
              <TrendingUp className="h-4 w-4" />
              <span className="text-sm font-medium">{t('hero.mlPriceEstimates')}</span>
            </div>
            <div className="bg-white/10 backdrop-blur-sm rounded-full px-4 py-2 flex items-center gap-2">
              <Zap className="h-4 w-4" />
              <span className="text-sm font-medium">{t('hero.dailyDeals')}</span>
            </div>
            <div className="bg-white/10 backdrop-blur-sm rounded-full px-4 py-2 flex items-center gap-2">
              <Search className="h-4 w-4" />
              <span className="text-sm font-medium capitalize">{activeListingsLabel}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Quick Stats Bar */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="border-0 shadow-sm hover:shadow-md transition-shadow">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <BarChart3 className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <div className="text-2xl font-bold text-slate-900">{activeListingsDisplay}</div>
                <div className="text-xs text-slate-500">{t('common.activeListings')}</div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-sm hover:shadow-md transition-shadow">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-100 rounded-lg">
                <TrendingUp className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <div className="text-2xl font-bold text-slate-900">90%</div>
                <div className="text-xs text-slate-500">{t('hero.coverage')}</div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-sm hover:shadow-md transition-shadow">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-yellow-100 rounded-lg">
                <Zap className="h-5 w-5 text-yellow-600" />
              </div>
              <div>
                <div className="text-2xl font-bold text-slate-900">50+</div>
                <div className="text-xs text-slate-500">{t('hero.carMakes')}</div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-sm hover:shadow-md transition-shadow">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-purple-100 rounded-lg">
                <Search className="h-5 w-5 text-purple-600" />
              </div>
              <div>
                <div className="text-2xl font-bold text-slate-900">Daily</div>
                <div className="text-xs text-slate-500">{t('hero.dailyUpdates')}</div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
