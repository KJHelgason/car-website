import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { CAR_LANDING_PAGES, type CarLandingPageConfig } from '@/lib/car-landing-pages';
import { supabase } from '@/lib/supabase';
import { CarLandingContent } from './CarLandingContent';
import type { ListingRow, ListingStats } from './types';

export const revalidate = 3600;

const curatedConfigs = new Map(
  CAR_LANDING_PAGES.map((config) => [`${config.makeSlug}/${config.modelSlug}`, config])
);

function getConfig(make: string, model: string): CarLandingPageConfig | undefined {
  return curatedConfigs.get(`${make}/${model}`);
}

function calculateMedian(values: number[]): number | undefined {
  if (!values.length) {
    return undefined;
  }
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  if (sorted.length % 2 === 0) {
    return (sorted[mid - 1] + sorted[mid]) / 2;
  }
  return sorted[mid];
}

async function fetchListingStats(config: CarLandingPageConfig): Promise<ListingStats> {
  const { data, error, count } = await supabase
    .from('car_listings')
    .select('id, year, price, kilometers, url, scraped_at, source', { count: 'exact' })
    .eq('is_active', true)
    .ilike('make', config.makeQuery)
    .ilike('model', `%${config.modelQuery}%`)
    .gt('price', 0)
    .order('scraped_at', { ascending: false })
    .limit(200);

  if (error) {
    console.error(`Failed to load listings for ${config.displayMake} ${config.displayModel}:`, error.message);
    return {
      sampleSize: 0,
      totalActive: 0,
      recentListings: [],
    };
  }

  const listings = (data || []) as ListingRow[];
  const prices = listings.map((row) => row.price).filter((value) => Number.isFinite(value));
  const kilometreValues = listings
    .map((row) => (row.kilometers ?? NaN))
    .filter((value) => Number.isFinite(value)) as number[];

  let salesPastYear: number | undefined;
  try {
    const oneYearAgo = new Date();
    oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);
    const { count: soldCount, error: soldError } = await supabase
      .from('car_listings')
      .select('id', { count: 'exact', head: true })
      .eq('is_active', false)
      .ilike('make', config.makeQuery)
      .ilike('model', `%${config.modelQuery}%`)
      .gte('scraped_at', oneYearAgo.toISOString());
    if (!soldError) {
      salesPastYear = soldCount ?? undefined;
    }
  } catch (soldFetchError) {
    console.error('Sold car fetch failed:', soldFetchError);
  }

  const lastIndexed = listings.length ? listings[0].scraped_at : undefined;

  return {
    sampleSize: listings.length,
    totalActive: count ?? listings.length,
    avgPrice: prices.length ? prices.reduce((sum, price) => sum + price, 0) / prices.length : undefined,
    medianPrice: calculateMedian(prices),
    priceRange:
      prices.length
        ? [Math.min(...prices), Math.max(...prices)]
        : undefined,
    avgKm:
      kilometreValues.length
        ? kilometreValues.reduce((sum, km) => sum + km, 0) / kilometreValues.length
        : undefined,
    medianKm: calculateMedian(kilometreValues),
    recentListings: listings.slice(0, 8),
    lastIndexed,
    salesPastYear,
  };
}

export async function generateStaticParams() {
  return CAR_LANDING_PAGES.map((config) => ({
    make: config.makeSlug,
    model: config.modelSlug,
  }));
}

type RouteParams = Promise<{ make: string; model: string }>;

export async function generateMetadata({
  params,
}: {
  params: RouteParams;
}): Promise<Metadata> {
  const { make, model } = await params;
  const config = getConfig(make, model);
  if (!config) {
    return {};
  }

  const title = `${config.displayMake} ${config.displayModel} used car prices in Iceland`;
  const description = `${config.displayMake} ${config.displayModel} listings, current asking prices, kilometre trends, and buyer tips for the Icelandic market.`;

  return {
    title,
    description,
    alternates: {
      canonical: `https://bilaleiga.is/cars/${config.makeSlug}/${config.modelSlug}`,
    },
    openGraph: {
      title,
      description,
      type: 'article',
      url: `https://bilaleiga.is/cars/${config.makeSlug}/${config.modelSlug}`,
    },
  };
}

export default async function CarLandingPage({
  params,
}: {
  params: RouteParams;
}) {
  const { make, model } = await params;
  const config = getConfig(make, model);
  if (!config) {
    notFound();
  }

  const stats = await fetchListingStats(config);

  return <CarLandingContent config={config} stats={stats} />;
}
