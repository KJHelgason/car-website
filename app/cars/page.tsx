import Link from 'next/link';
import type { Metadata } from 'next';
import { CAR_LANDING_PAGES } from '@/lib/car-landing-pages';
import { supabase } from '@/lib/supabase';

export const revalidate = 1800; // cache buyer guide index for 30 minutes

export const metadata: Metadata = {
  title: 'Used car buyer guides for Iceland | Allir Bilar',
  description:
    'Browse curated buyer guidance for the most requested car makes and models in Iceland. Each guide blends pricing trends with local ownership tips.',
  alternates: {
    canonical: 'https://bilaleiga.is/cars',
  },
};

interface GuideGroup {
  make: string;
  models: {
    makeSlug: string;
    modelSlug: string;
    displayModel: string;
    overview: string;
    marketPosition: string;
  }[];
}

interface ModelDigest {
  make: string;
  makeSlug: string;
  model: string;
  modelSlug: string;
  active: number;
  averagePrice: number | null;
  newListings: number;
  soldLast7d: number;
}

interface GuidePageData {
  guideGroups: GuideGroup[];
  modelDigests: ModelDigest[];
  generatedAt: string;
}

function buildGuideGroups(): GuideGroup[] {
  const makeMap = new Map<string, GuideGroup>();

  CAR_LANDING_PAGES.forEach((guide) => {
    const key = guide.displayMake.toLowerCase();
    if (!makeMap.has(key)) {
      makeMap.set(key, {
        make: guide.displayMake,
        models: [],
      });
    }

    makeMap.get(key)?.models.push({
      makeSlug: guide.makeSlug,
      modelSlug: guide.modelSlug,
      displayModel: guide.displayModel,
      overview: guide.overview,
      marketPosition: guide.marketPosition,
    });
  });

  const groups = Array.from(makeMap.values());

  groups.forEach((group) => {
    group.models.sort((a, b) => a.displayModel.localeCompare(b.displayModel));
  });

  return groups.sort((a, b) => a.make.localeCompare(b.make));
}

async function buildModelDigests(): Promise<ModelDigest[]> {
  const now = new Date();
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

  const digests: ModelDigest[] = [];

  for (const config of CAR_LANDING_PAGES) {
    const { makeSlug, modelSlug, displayMake, displayModel, makeQuery, modelQuery } = config;

    const [activeRes, priceRes, newRes, soldRes] = await Promise.all([
      supabase
        .from('car_listings')
        .select('scraped_at')
        .eq('is_active', true)
        .ilike('make', makeQuery)
        .ilike('model', `%${modelQuery}%`)
        .limit(500),
      supabase
        .from('car_listings')
        .select('price')
        .eq('is_active', true)
        .ilike('make', makeQuery)
        .ilike('model', `%${modelQuery}%`)
        .not('price', 'is', null)
        .limit(500),
      supabase
        .from('car_listings')
        .select('scraped_at')
        .eq('is_active', true)
        .ilike('make', makeQuery)
        .ilike('model', `%${modelQuery}%`)
        .gte('scraped_at', sevenDaysAgo.toISOString())
        .limit(500),
      supabase
        .from('car_listings')
        .select('scraped_at')
        .eq('is_active', false)
        .ilike('make', makeQuery)
        .ilike('model', `%${modelQuery}%`)
        .gte('scraped_at', sevenDaysAgo.toISOString())
        .limit(500),
    ]);

    if (activeRes.error || priceRes.error || newRes.error || soldRes.error) {
      console.error('Failed to gather model digest metrics', {
        make: makeSlug,
        model: modelSlug,
        activeError: activeRes.error?.message,
        priceError: priceRes.error?.message,
        newError: newRes.error?.message,
        soldError: soldRes.error?.message,
      });
    }

    const priceRows = priceRes.data ?? [];
    const averagePrice = priceRows.length
      ? (() => {
          const prices = priceRows
            .map((row) => row.price as number | null)
            .filter((value): value is number => typeof value === 'number' && Number.isFinite(value));
          if (prices.length === 0) {
            return null;
          }
          const sum = prices.reduce((acc, price) => acc + price, 0);
          return sum / prices.length;
        })()
      : null;

    digests.push({
      make: displayMake,
      makeSlug,
      model: displayModel,
      modelSlug,
      active: activeRes.data?.length ?? 0,
      averagePrice,
      newListings: newRes.data?.length ?? 0,
      soldLast7d: soldRes.data?.length ?? 0,
    });
  }

  return digests.sort((a, b) => b.newListings - a.newListings);
}

async function getGuidePageData(): Promise<GuidePageData> {
  const [guideGroups, modelDigests] = await Promise.all([buildGuideGroups(), buildModelDigests()]);

  return {
    guideGroups,
    modelDigests,
    generatedAt: new Date().toISOString(),
  };
}

function formatCurrency(price: number | null) {
  if (typeof price !== 'number' || Number.isNaN(price)) {
    return 'N/A';
  }
  return new Intl.NumberFormat('is-IS', {
    style: 'currency',
    currency: 'ISK',
    maximumFractionDigits: 0,
  }).format(price);
}

function formatCount(value: number) {
  return value.toLocaleString('is-IS');
}

export default async function CarsLandingPage() {
  const { guideGroups, modelDigests, generatedAt } = await getGuidePageData();

  return (
    <main className="container mx-auto px-4 py-12 max-w-5xl space-y-10">
      <header className="space-y-4">
        <p className="text-xs font-semibold uppercase tracking-wide text-blue-600">Buyer guidance</p>
        <h1 className="text-3xl md:text-4xl font-bold text-foreground">Allir Bilar buyer guides</h1>
        <p className="text-base md:text-lg text-muted-foreground leading-relaxed max-w-3xl">
          These guides turn raw listing data into practical advice for Icelandic drivers. Each write-up highlights
          pricing trends, ownership considerations, and competing models so you can decide whether a vehicle fits
          your budget before you contact a seller.
        </p>
        <p className="text-sm text-muted-foreground max-w-3xl">
          We refresh the underlying datasets several times per day. When market conditions shift, the valuation
          dashboard linked in every guide updates alongside the copy.
        </p>
      </header>

      <section className="space-y-6">
        {guideGroups.map((group) => (
          <article key={group.make} className="rounded-xl border border-border bg-muted/10 p-6 shadow-sm space-y-4">
            <div className="flex items-start justify-between gap-4 flex-wrap">
              <div>
                <h2 className="text-2xl font-semibold text-foreground">{group.make}</h2>
                <p className="text-sm text-muted-foreground mt-1">
                  {group.models.length} {group.models.length === 1 ? 'model' : 'models'} covered in the Allir Bilar dataset.
                </p>
              </div>
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              {group.models.map((model) => (
                <div key={`${group.make}-${model.modelSlug}`} className="rounded-lg border border-border bg-background p-5 space-y-3">
                  <div className="space-y-1">
                    <h3 className="text-lg font-semibold text-foreground">
                      {group.make} {model.displayModel}
                    </h3>
                    <p className="text-sm text-muted-foreground leading-relaxed">
                      {model.overview.length > 180 ? `${model.overview.slice(0, 177)}...` : model.overview}
                    </p>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Market snapshot: {model.marketPosition}
                  </p>
                  <Link
                    href={`/cars/${model.makeSlug}/${model.modelSlug}`}
                    className="inline-flex w-fit items-center rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary/90"
                  >
                    Open guide
                  </Link>
                </div>
              ))}
            </div>
          </article>
        ))}
      </section>

      <section className="space-y-4">
        <div className="space-y-2">
          <h2 className="text-2xl font-semibold text-foreground">Segment pulse</h2>
          <p className="text-sm text-muted-foreground max-w-3xl">
            Recent activity across the models we cover. Use this table to prioritise which buyer guides to read first.
          </p>
        </div>
        <div className="overflow-x-auto rounded-xl border border-border bg-background shadow-sm">
          <table className="min-w-full text-sm">
            <thead className="bg-muted/40 text-left text-xs uppercase tracking-wide text-muted-foreground">
              <tr>
                <th className="px-4 py-3">Make &amp; model</th>
                <th className="px-4 py-3">Active listings*</th>
                <th className="px-4 py-3">Average asking price</th>
                <th className="px-4 py-3">New this week</th>
                <th className="px-4 py-3">Marked sold (7d)</th>
              </tr>
            </thead>
            <tbody>
              {modelDigests.map((digest) => (
                <tr key={`${digest.make}-${digest.model}`} className="border-t border-border/60">
                  <td className="px-4 py-3 text-foreground">
                    <Link href={`/cars/${digest.makeSlug}/${digest.modelSlug}`} className="hover:text-primary">
                      <span className="font-semibold">{digest.make}</span> {digest.model}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">{formatCount(digest.active)}</td>
                  <td className="px-4 py-3 text-muted-foreground">{formatCurrency(digest.averagePrice)}</td>
                  <td className="px-4 py-3 text-muted-foreground">{formatCount(digest.newListings)}</td>
                  <td className="px-4 py-3 text-muted-foreground">{formatCount(digest.soldLast7d)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="text-xs text-muted-foreground/80">
          * Snapshot generated {new Intl.DateTimeFormat('is-IS', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(generatedAt))} using Supabase listing data.
        </p>
      </section>

      <section className="rounded-xl border border-dashed border-primary/40 bg-primary/5 p-6 space-y-3">
        <h2 className="text-lg font-semibold text-primary uppercase tracking-wide">Need a model we have not covered yet?</h2>
        <p className="text-sm text-muted-foreground leading-relaxed max-w-3xl">
          The editorial roadmap follows user demand. Run a search, save the listings you care about, and send us feedback
          through the contact page. We prioritise new guides based on search volume and the number of alerts created for
          each make and model combination.
        </p>
        <Link
          href="/contact"
          className="inline-flex w-fit items-center rounded-md border border-primary px-4 py-2 text-sm font-semibold text-primary hover:bg-primary/5"
        >
          Request a guide
        </Link>
      </section>
    </main>
  );
}
