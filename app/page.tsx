import HomeClient from '@/app/home/HomeClient';
import { HomeNarrative } from '@/app/home/HomeNarrative';
import { CAR_LANDING_PAGES } from '@/lib/car-landing-pages';
import { supabase } from '@/lib/supabase';

export const revalidate = 600; // refresh homepage snapshot every 10 minutes

interface MarketSnapshot {
  totalActive: number | null;
  newLast24h: number | null;
  soldLast7d: number | null;
  averagePrice: number | null;
  topSearches: Array<{ make: string; model: string; count: number }>;
  generatedAt: string;
}

async function getMarketSnapshot(): Promise<MarketSnapshot> {
  const now = new Date();
  const twentyFourHoursAgoIso = new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString();
  const sevenDaysAgoIso = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();

  const [activeRes, newRes, soldRes, pricesRes, searchesRes] = await Promise.all([
    supabase
      .from('car_listings')
      .select('*', { count: 'exact', head: true })
      .eq('is_active', true),
    supabase
      .from('car_listings')
      .select('*', { count: 'exact', head: true })
      .eq('is_active', true)
      .gte('scraped_at', twentyFourHoursAgoIso),
    supabase
      .from('car_listings')
      .select('*', { count: 'exact', head: true })
      .eq('is_active', false)
      .gte('scraped_at', sevenDaysAgoIso),
    supabase
      .from('car_listings')
      .select('price')
      .eq('is_active', true)
      .not('price', 'is', null)
      .limit(500),
    supabase
      .from('search_analytics')
      .select('make, model')
      .gte('created_at', sevenDaysAgoIso)
      .order('created_at', { ascending: false })
      .limit(1000),
  ]);

  const averagePrice = pricesRes.data
    ? (() => {
        const prices = pricesRes.data
          .map((row) => row.price as number | null)
          .filter((value): value is number => typeof value === 'number' && Number.isFinite(value));
        if (prices.length === 0) {
          return null;
        }
        const sum = prices.reduce((acc, price) => acc + price, 0);
        return sum / prices.length;
      })()
    : null;

  const searchCounts = new Map<string, { make: string; model: string; count: number }>();
  (searchesRes.data || []).forEach((row) => {
    if (!row.make || !row.model) {
      return;
    }
    const key = `${row.make.toLowerCase()}|${row.model.toLowerCase()}`;
    if (!searchCounts.has(key)) {
      searchCounts.set(key, {
        make: row.make,
        model: row.model,
        count: 0,
      });
    }
    const item = searchCounts.get(key)!;
    item.count += 1;
  });

  const topSearches = Array.from(searchCounts.values())
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);

  return {
    totalActive: activeRes.count ?? null,
    newLast24h: newRes.count ?? null,
    soldLast7d: soldRes.count ?? null,
    averagePrice,
    topSearches,
    generatedAt: now.toISOString(),
  };
}

export default async function HomePage() {
  const featuredGuides = CAR_LANDING_PAGES.slice(0, 6);
  const totalGuideCount = CAR_LANDING_PAGES.length;
  const marketSnapshot = await getMarketSnapshot();

  return (
    <div className="flex flex-col">
      <HomeClient activeListingCount={marketSnapshot.totalActive} />
      <HomeNarrative
        marketSnapshot={marketSnapshot}
        featuredGuides={featuredGuides}
        totalGuideCount={totalGuideCount}
      />
    </div>
  );
}
