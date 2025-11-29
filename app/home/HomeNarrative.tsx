'use client';

import Link from 'next/link';
import { useLanguage } from '@/lib/language-context';
import type { CarLandingPageConfig } from '@/lib/car-landing-pages';

interface MarketSnapshotData {
  totalActive: number | null;
  newLast24h: number | null;
  soldLast7d: number | null;
  averagePrice: number | null;
  topSearches: Array<{ make: string; model: string; count: number }>;
  generatedAt: string;
}

interface HomeNarrativeProps {
  marketSnapshot: MarketSnapshotData;
  featuredGuides: CarLandingPageConfig[];
  totalGuideCount: number;
}

function formatIntegerWithSeparator(value: number, separator: string) {
  const rounded = Math.round(value);
  return rounded.toString().replace(/\B(?=(\d{3})+(?!\d))/g, separator);
}

function formatNumber(
  value: number | null,
  t: (key: string) => string,
  language: 'en' | 'is',
) {
  if (typeof value !== 'number' || Number.isNaN(value)) {
    return t('common.unknown');
  }
  const separator = language === 'is' ? '.' : ',';
  return formatIntegerWithSeparator(value, separator);
}

function formatCurrency(
  value: number | null,
  t: (key: string) => string,
  language: 'en' | 'is',
) {
  if (typeof value !== 'number' || Number.isNaN(value)) {
    return t('common.unknown');
  }
  const separator = language === 'is' ? '.' : ',';
  const formatted = formatIntegerWithSeparator(value, separator);
  return language === 'is' ? `${formatted} kr.` : `ISK ${formatted}`;
}

function formatTimestamp(isoString: string, language: 'en' | 'is') {
  const date = new Date(isoString);
  if (Number.isNaN(date.getTime())) {
    return isoString;
  }
  const iso = date.toISOString();
  const [dayPart, timePartWithZone] = iso.split('T');
  const timePart = timePartWithZone.slice(0, 5); // HH:MM in UTC
  const [year, month, day] = dayPart.split('-');
  if (language === 'is') {
    return `${day}.${month}.${year} kl. ${timePart}`;
  }
  return `${year}-${month}-${day} ${timePart} UTC`;
}

function getGuideSummary(text: string) {
  if (text.length <= 160) {
    return text;
  }
  return `${text.slice(0, 157)}...`;
}

export function HomeNarrative({ marketSnapshot, featuredGuides, totalGuideCount }: HomeNarrativeProps) {
  const { t, language } = useLanguage();

  const coverageHighlights = [
    {
      label: t('home.market.highlights.active.label'),
      value: formatNumber(marketSnapshot.totalActive, t, language),
      description: t('home.market.highlights.active.description'),
    },
    {
      label: t('home.market.highlights.reindex.label'),
      value: t('home.market.highlights.reindex.value'),
      description: t('home.market.highlights.reindex.description'),
    },
    {
      label: t('home.market.highlights.guides.label'),
      value: t('home.market.highlights.guides.value', { count: totalGuideCount }),
      description: t('home.market.highlights.guides.description'),
    },
  ];

  const methodologyPoints = [
    t('home.methodology.point1'),
    t('home.methodology.point2'),
    t('home.methodology.point3'),
    t('home.methodology.point4'),
  ];

  const differentiators = [
    t('home.methodology.diff1'),
    t('home.methodology.diff2'),
    t('home.methodology.diff3'),
  ];

  const formattedTimestamp = formatTimestamp(marketSnapshot.generatedAt, language);

  return (
    <>
      <section className="border-b border-border bg-muted/20">
        <div className="container mx-auto max-w-5xl px-4 py-12 space-y-8">
          <div className="space-y-3">
            <p className="uppercase text-xs font-semibold tracking-wide text-blue-600">
              {t('home.market.tag')}
            </p>
            <h1 className="text-3xl md:text-4xl font-bold text-foreground">
              {t('home.market.heading')}
            </h1>
            <p className="text-base md:text-lg text-muted-foreground leading-relaxed">
              {t('home.market.intro1')}
            </p>
            <p className="text-sm md:text-base text-muted-foreground leading-relaxed">
              {t('home.market.intro2')}
            </p>
          </div>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {coverageHighlights.map((item) => (
              <article key={item.label} className="rounded-lg border border-border bg-background p-4 shadow-sm">
                <p className="text-sm font-semibold text-foreground">{item.label}</p>
                <p className="mt-2 text-2xl font-bold text-primary">{item.value}</p>
                <p className="mt-2 text-sm text-muted-foreground leading-relaxed">{item.description}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="border-b border-border">
        <div className="container mx-auto max-w-5xl px-4 py-12 space-y-6">
          <div className="space-y-3">
            <h2 className="text-2xl font-semibold text-foreground">{t('home.methodology.heading')}</h2>
            <p className="text-sm md:text-base text-muted-foreground leading-relaxed">
              {t('home.methodology.description')}
            </p>
          </div>
          <ul className="space-y-2 text-sm md:text-base text-muted-foreground list-disc pl-5">
            {methodologyPoints.map((point) => (
              <li key={point} className="leading-relaxed">
                {point}
              </li>
            ))}
          </ul>
          <div className="rounded-lg border border-dashed border-primary/40 bg-primary/5 p-5">
            <h3 className="text-sm font-semibold text-primary uppercase tracking-wide">
              {t('home.methodology.differentiatorsTitle')}
            </h3>
            <ul className="mt-3 space-y-2 text-sm text-muted-foreground list-disc pl-5">
              {differentiators.map((item) => (
                <li key={item} className="leading-relaxed">
                  {item}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      <section className="border-b border-border bg-background">
        <div className="container mx-auto max-w-5xl px-4 py-12 space-y-5">
          <div className="space-y-3">
            <h2 className="text-2xl font-semibold text-foreground">{t('home.guides.heading')}</h2>
            <p className="text-sm md:text-base text-muted-foreground leading-relaxed">
              {t('home.guides.description')}
            </p>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            {featuredGuides.map((guide) => (
              <article
                key={`${guide.makeSlug}-${guide.modelSlug}`}
                className="flex flex-col rounded-lg border border-border bg-muted/10 p-5 shadow-sm"
              >
                <div className="space-y-2">
                  <p className="text-xs font-semibold uppercase tracking-wide text-blue-600">
                    {guide.displayMake}
                  </p>
                  <h3 className="text-xl font-semibold text-foreground">
                    {guide.displayMake} {guide.displayModel}
                  </h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    {getGuideSummary(guide.overview)}
                  </p>
                </div>
                <div className="mt-4 flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                  <span>{t('home.guides.marketFocus', { focus: guide.marketPosition })}</span>
                </div>
                <Link
                  href={`/cars/${guide.makeSlug}/${guide.modelSlug}`}
                  className="mt-4 inline-flex w-fit items-center rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary/90"
                >
                  {t('home.guides.cta')}
                </Link>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="border-b border-border">
        <div className="container mx-auto max-w-5xl px-4 py-12 space-y-6">
          <div className="space-y-3">
            <h2 className="text-2xl font-semibold text-foreground">{t('home.live.heading')}</h2>
            <p className="text-sm md:text-base text-muted-foreground leading-relaxed">
              {t('home.live.description')}
            </p>
          </div>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <article className="rounded-lg border border-border bg-background p-4 shadow-sm">
              <p className="text-sm font-semibold text-foreground">{t('home.live.activeLabel')}</p>
              <p className="mt-2 text-2xl font-bold text-primary">{formatNumber(marketSnapshot.totalActive, t, language)}</p>
              <p className="mt-2 text-xs text-muted-foreground">{t('home.live.activeHelp')}</p>
            </article>
            <article className="rounded-lg border border-border bg-background p-4 shadow-sm">
              <p className="text-sm font-semibold text-foreground">{t('home.live.newLabel')}</p>
              <p className="mt-2 text-2xl font-bold text-primary">{formatNumber(marketSnapshot.newLast24h, t, language)}</p>
              <p className="mt-2 text-xs text-muted-foreground">{t('home.live.newHelp')}</p>
            </article>
            <article className="rounded-lg border border-border bg-background p-4 shadow-sm">
              <p className="text-sm font-semibold text-foreground">{t('home.live.soldLabel')}</p>
              <p className="mt-2 text-2xl font-bold text-primary">{formatNumber(marketSnapshot.soldLast7d, t, language)}</p>
              <p className="mt-2 text-xs text-muted-foreground">{t('home.live.soldHelp')}</p>
            </article>
            <article className="rounded-lg border border-border bg-background p-4 shadow-sm">
              <p className="text-sm font-semibold text-foreground">{t('home.live.averageLabel')}</p>
              <p className="mt-2 text-2xl font-bold text-primary">{formatCurrency(marketSnapshot.averagePrice, t, language)}</p>
              <p className="mt-2 text-xs text-muted-foreground">{t('home.live.averageHelp')}</p>
            </article>
          </div>
          <div className="rounded-lg border border-border bg-muted/10 p-5">
            <h3 className="text-sm font-semibold text-foreground uppercase tracking-wide">
              {t('home.live.searchesTitle')}
            </h3>
            {marketSnapshot.topSearches.length === 0 ? (
              <p className="mt-3 text-sm text-muted-foreground">{t('home.live.searchesEmpty')}</p>
            ) : (
              <ol className="mt-3 space-y-2 text-sm text-muted-foreground">
                {marketSnapshot.topSearches.map((item, index) => (
                  <li key={`${item.make}-${item.model}`} className="flex items-center gap-3">
                    <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary">
                      {index + 1}
                    </span>
                    <span className="text-foreground font-medium">
                      {item.make} {item.model}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {t('home.live.searchCount', {
                        count: formatNumber(item.count, t, language),
                      })}
                    </span>
                  </li>
                ))}
              </ol>
            )}
            <p className="mt-3 text-xs text-muted-foreground/80">
              {t('home.live.snapshotFootnote', { timestamp: formattedTimestamp })}
            </p>
          </div>
        </div>
      </section>
    </>
  );
}
