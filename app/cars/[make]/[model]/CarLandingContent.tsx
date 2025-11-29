'use client';

import Link from 'next/link';
import { useMemo } from 'react';
import { useLanguage } from '@/lib/language-context';
import type { CarLandingPageConfig } from '@/lib/car-landing-pages';
import type { ListingStats } from './types';

interface CarLandingContentProps {
  config: CarLandingPageConfig;
  stats: ListingStats;
}

function formatIntegerWithSeparator(value: number, separator: string) {
  const rounded = Math.round(value);
  return rounded.toString().replace(/\B(?=(\d{3})+(?!\d))/g, separator);
}

function formatNumber(
  value: number | undefined,
  language: 'en' | 'is',
  fallback: string,
) {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    return fallback;
  }
  const separator = language === 'is' ? '.' : ',';
  return formatIntegerWithSeparator(value, separator);
}

function formatCurrency(
  value: number | undefined,
  language: 'en' | 'is',
  fallback: string,
) {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    return fallback;
  }
  const separator = language === 'is' ? '.' : ',';
  const formatted = formatIntegerWithSeparator(value, separator);
  return language === 'is' ? `${formatted} kr.` : `ISK ${formatted}`;
}

function formatDistance(
  value: number | undefined | null,
  language: 'en' | 'is',
  fallback: string,
  kmLabel: string,
) {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    return fallback;
  }
  return `${formatNumber(value, language, fallback)} ${kmLabel}`;
}

function formatDate(value: string | undefined, language: 'en' | 'is') {
  if (!value) {
    return null;
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, '0');
  const day = String(date.getUTCDate()).padStart(2, '0');
  if (language === 'is') {
    return `${day}.${month}.${year}`;
  }
  return `${year}-${month}-${day}`;
}

function formatTimestamp(value: string | undefined, language: 'en' | 'is') {
  if (!value) {
    return null;
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, '0');
  const day = String(date.getUTCDate()).padStart(2, '0');
  const hours = String(date.getUTCHours()).padStart(2, '0');
  const minutes = String(date.getUTCMinutes()).padStart(2, '0');
  if (language === 'is') {
    return `${day}.${month}.${year} kl. ${hours}:${minutes}`;
  }
  return `${year}-${month}-${day} ${hours}:${minutes} UTC`;
}

export function CarLandingContent({ config, stats }: CarLandingContentProps) {
  const { t, language } = useLanguage();
  const fallback = t('common.unknown');
  const kmLabel = t('common.km');
  const localizedCopy = useMemo(() => {
    const overrides = config.localized?.[language];
    return {
      heroTitle: overrides?.heroTitle ?? config.heroTitle,
      overview: overrides?.overview ?? config.overview,
      marketPosition: overrides?.marketPosition ?? config.marketPosition,
      buyerHighlights: overrides?.buyerHighlights ?? config.buyerHighlights,
      considerations: overrides?.considerations ?? config.considerations,
    };
  }, [config, language]);

  const formattedPriceRange = useMemo(() => {
    if (!stats.priceRange) {
      return fallback;
    }
    const [low, high] = stats.priceRange;
    return `${formatCurrency(low, language, fallback)} - ${formatCurrency(high, language, fallback)}`;
  }, [stats.priceRange, language, fallback]);

  const analysisHref = useMemo(() => {
    const params = new URLSearchParams({
      make: config.displayMake,
      model: config.displayModel,
      year: 'all',
      mode: 'analysis',
    });
    return `/?${params.toString()}`;
  }, [config.displayMake, config.displayModel]);

  const lastIndexedDisplay = formatTimestamp(stats.lastIndexed, language);

  return (
    <main className="container mx-auto px-4 py-10 max-w-5xl space-y-12">
      <nav className="text-sm text-muted-foreground">
        <Link href="/" className="hover:text-primary">
          {t('header.home')}
        </Link>{' '}
        /{' '}
        <span className="text-foreground">{config.displayMake} {config.displayModel}</span>
      </nav>

      <header className="space-y-6">
        <div className="space-y-2">
          <p className="uppercase text-xs tracking-wide text-blue-600 font-semibold">{t('carLanding.tag')}</p>
          <h1 className="text-4xl font-bold text-foreground">
            {localizedCopy.heroTitle}
          </h1>
        </div>
        <p className="text-lg leading-relaxed text-muted-foreground max-w-3xl">
          {localizedCopy.overview}
        </p>
        <p className="text-muted-foreground max-w-3xl">
          {localizedCopy.marketPosition}
        </p>
      </header>

      <section className="grid gap-4 md:grid-cols-2">
        <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-foreground mb-4">{t('carLanding.snapshot.title')}</h2>
          <dl className="space-y-3 text-sm text-muted-foreground">
            <div className="flex items-center justify-between">
              <dt>{t('carLanding.snapshot.totalActive')}</dt>
              <dd className="font-semibold text-foreground">{formatNumber(stats.totalActive, language, fallback)}</dd>
            </div>
            <div className="flex items-center justify-between">
              <dt>{t('carLanding.snapshot.avgPrice')}</dt>
              <dd className="font-semibold text-foreground">{formatCurrency(stats.avgPrice, language, fallback)}</dd>
            </div>
            <div className="flex items-center justify-between">
              <dt>{t('carLanding.snapshot.medianPrice')}</dt>
              <dd className="font-semibold text-foreground">{formatCurrency(stats.medianPrice, language, fallback)}</dd>
            </div>
            <div className="flex items-center justify-between">
              <dt>{t('carLanding.snapshot.priceSpread')}</dt>
              <dd className="font-semibold text-foreground">{formattedPriceRange}</dd>
            </div>
            <div className="flex items-center justify-between">
              <dt>{t('carLanding.snapshot.avgKm')}</dt>
              <dd className="font-semibold text-foreground">{formatDistance(stats.avgKm, language, fallback, kmLabel)}</dd>
            </div>
            <div className="flex items-center justify-between">
              <dt>{t('carLanding.snapshot.medianKm')}</dt>
              <dd className="font-semibold text-foreground">{formatDistance(stats.medianKm, language, fallback, kmLabel)}</dd>
            </div>
            <div className="flex items-center justify-between">
              <dt>{t('carLanding.snapshot.salesPastYear')}</dt>
              <dd className="font-semibold text-foreground">{formatNumber(stats.salesPastYear, language, fallback)}</dd>
            </div>
            <div className="text-xs text-muted-foreground/80">
              {t('carLanding.snapshot.footnote')}
            </div>
          </dl>
          {lastIndexedDisplay && (
            <p className="mt-4 text-xs text-muted-foreground/80">
              {t('carLanding.snapshot.lastIndexed', { timestamp: lastIndexedDisplay })}
            </p>
          )}
        </div>

        <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-foreground mb-4">{t('carLanding.whyTitle')}</h2>
          <ul className="space-y-2 text-sm text-muted-foreground list-disc pl-5">
            {localizedCopy.buyerHighlights.map((highlight) => (
              <li key={highlight} className="leading-relaxed">
                {highlight}
              </li>
            ))}
          </ul>
          <div className="mt-6">
            <h3 className="text-sm font-semibold text-foreground mb-2">{t('carLanding.considerationsTitle')}</h3>
            <ul className="space-y-2 text-sm text-muted-foreground list-disc pl-5">
              {localizedCopy.considerations.map((item) => (
                <li key={item} className="leading-relaxed">
                  {item}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      <section className="space-y-4">
        <h2 className="text-xl font-semibold text-foreground">{t('carLanding.recent.title')}</h2>
        {stats.recentListings.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            {t('carLanding.recent.empty')}
          </p>
        ) : (
          <div className="overflow-hidden rounded-xl border border-border bg-card shadow-sm">
            <table className="min-w-full text-sm">
              <thead className="bg-muted/30 text-left text-xs uppercase tracking-wide text-muted-foreground">
                <tr>
                  <th className="px-4 py-3">{t('carLanding.recent.table.listing')}</th>
                  <th className="px-4 py-3">{t('carLanding.recent.table.price')}</th>
                  <th className="px-4 py-3">{t('carLanding.recent.table.kilometres')}</th>
                  <th className="px-4 py-3">{t('carLanding.recent.table.source')}</th>
                  <th className="px-4 py-3">{t('carLanding.recent.table.posted')}</th>
                </tr>
              </thead>
              <tbody>
                {stats.recentListings.map((listing) => {
                  const posted = formatDate(listing.scraped_at, language) ?? fallback;
                  const kilometres = formatDistance(listing.kilometers, language, fallback, kmLabel);
                  const price = formatCurrency(listing.price, language, fallback);
                  const sourceLabel = listing.source && listing.source.trim().length > 0
                    ? listing.source
                    : t('carLanding.recent.sourceUnknown');
                  return (
                    <tr key={listing.id} className="border-t border-border/60">
                      <td className="px-4 py-3 text-foreground">
                        {listing.year} {config.displayMake} {config.displayModel}
                      </td>
                      <td className="px-4 py-3 font-semibold text-foreground">{price}</td>
                      <td className="px-4 py-3 text-muted-foreground">{kilometres}</td>
                      <td className="px-4 py-3 text-muted-foreground">
                        {listing.url ? (
                          <a
                            href={listing.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="hover:text-primary"
                          >
                            {sourceLabel}
                          </a>
                        ) : (
                          sourceLabel
                        )}
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">{posted}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
        <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
          <Link
            href={analysisHref}
            className="inline-flex items-center rounded-lg border border-primary px-4 py-2 text-primary hover:bg-primary/5"
          >
            {t('carLanding.cta.runAnalysis')}
          </Link>
          <span>
            {t('carLanding.cta.filters', {
              make: config.displayMake,
              model: config.displayModel,
            })}
          </span>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-2">
        <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-foreground mb-3">{t('carLanding.alternatives.title')}</h2>
          <ul className="space-y-2 text-sm text-muted-foreground list-disc pl-5">
            {config.competitorModels.map((modelName) => (
              <li key={modelName}>{modelName}</li>
            ))}
          </ul>
        </div>
        <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-foreground mb-3">{t('carLanding.advice.title')}</h2>
          <p className="text-sm text-muted-foreground leading-relaxed">
            {t('carLanding.advice.description')}
          </p>
          <Link
            href="/"
            className="mt-4 inline-flex w-fit items-center rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary/90"
          >
            {t('carLanding.advice.cta')}
          </Link>
        </div>
      </section>
    </main>
  );
}