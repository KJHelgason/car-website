'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, ArrowRight, RefreshCcw } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import type { CarItem } from '@/types/form';
import { getPriceDifferenceColor, formatPriceDifference } from '@/lib/utils';

interface DealRow {
  id: number;
  make: string;
  model: string;
  year: number | null;
  kilometers: number | null;
  price: number;
  url: string | null;
  scraped_at: string | null;
}

interface PriceModelRow {
  tier?: 'model_year' | 'model' | 'make' | 'global';
  make_norm: string | null;
  model_base: string | null;
  coef_json: string | Record<string, unknown>;
  rmse?: number | null;
  n_samples?: number | null;
}

interface EnrichedDeal extends DealRow {
  estimated_price: number;
  pct_below: number;      // positive = below estimate
  model_rmse?: number;
  model_n?: number;
  model_key: string;
  rank_score: number;     // for sorting
}

type DisplayDeal =
  | (EnrichedDeal & { mode: 'daily' | 'extended' })
  | (DealRow & { mode: 'cheapest' });

interface DailyDealsProps {
  limit?: number;
  lookbackHours?: number;
  onViewPriceAnalysis?: (data: CarItem) => void;
  minPrice?: number;
}

/** 
 * Produce a broad, search-friendly model string.
 * - Lowercase
 * - Normalize separators (slashes/hyphens -> spaces)
 * - Keep only the first base token (e.g., "corolla" from "corolla t/s active hybrid")
 * This aligns with how your search widens using one-word/ two-word heuristics.
 */
const canonicalizeModelForSearch = (raw: string): string => {
  const cleaned = raw
    .toLowerCase()
    .trim()
    // turn slashes/underscores/plus into spaces; keep hyphens in tokens like "cx-5"
    .replace(/[\/_+]/g, ' ')
    // drop anything not letter/number/space/hyphen
    .replace(/[^a-z0-9\s-]/g, ' ')
    // collapse spaces
    .replace(/\s+/g, ' ');
  // split on spaces; first token is safest “base” model
  const first = cleaned.split(' ')[0] || '';
  return first || cleaned;
};

const toModelBase = (model: string) =>
  model
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, ' ')
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 1)
    .join(' ')
    .trim();

const fmtISK = (v: number) =>
  new Intl.NumberFormat('is-IS', {
    style: 'currency',
    currency: 'ISK',
    maximumFractionDigits: 0,
  }).format(v);

const safeCoef = (coef: string | Record<string, unknown>) => {
  const obj = typeof coef === 'string' ? JSON.parse(coef) : coef;
  return {
    intercept: Number((obj as Record<string, number>).intercept ?? 0),
    beta_age: Number((obj as Record<string, number>).beta_age ?? 0),
    beta_logkm: Number((obj as Record<string, number>).beta_logkm ?? 0),
    beta_age_logkm: Number((obj as Record<string, number>).beta_age_logkm ?? 0),
  };
};

const estimatePrice = (
  coefJson: string | Record<string, unknown>,
  year: number | null,
  km: number | null
) => {
  const coef = safeCoef(coefJson);
  const currentYear = new Date().getFullYear();
  const age = year ? currentYear - year : 0;
  const logKm = Math.log(1 + Math.max(0, km ?? 0));
  return (
    coef.intercept +
    coef.beta_age * age +
    coef.beta_logkm * logKm +
    coef.beta_age_logkm * (age * logKm)
  );
};

export function DailyDeals({
  limit = 5,
  lookbackHours = 24,
  onViewPriceAnalysis,
  minPrice = 50_000,
}: DailyDealsProps) {
  const [deals, setDeals] = useState<DisplayDeal[]>([]);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const scrollRef = useRef<HTMLDivElement>(null);
  const [index, setIndex] = useState(0);

  const buildModelIndexes = (rows: PriceModelRow[]) => {
    const modelMap = new Map<string, PriceModelRow>(); // model tier
    const makeMap = new Map<string, PriceModelRow>();  // make tier
    let globalModel: PriceModelRow | undefined;
    rows.forEach((pm) => {
      if (pm.tier === 'model' && pm.make_norm && pm.model_base) {
        modelMap.set(`${pm.make_norm}|${pm.model_base}`, pm);
      } else if (pm.tier === 'make' && pm.make_norm && !pm.model_base) {
        makeMap.set(pm.make_norm, pm);
      } else if (pm.tier === 'global' && !pm.make_norm && !pm.model_base) {
        globalModel = pm;
      }
    });
    const findBestModel = (make: string, model: string): PriceModelRow | undefined => {
      const mk = make.toLowerCase();
      const md = toModelBase(model);
      return modelMap.get(`${mk}|${md}`) || makeMap.get(mk) || globalModel;
    };
    return { findBestModel };
  };

  const enrichDeals = (
    rows: DealRow[],
    findBestModel: (make: string, model: string) => PriceModelRow | undefined
  ): EnrichedDeal[] => {
    const validRows = rows.filter(
      (r): r is DealRow =>
        !!r &&
        typeof r.make === 'string' &&
        typeof r.model === 'string' &&
        typeof r.price === 'number' &&
        typeof r.kilometers === 'number' &&
        r.kilometers !== null
    );

    const enriched = validRows
      .map((r) => {
        const pm = findBestModel(r.make, r.model);
        if (!pm?.coef_json) return null;

        let est = estimatePrice(pm.coef_json, r.year, r.kilometers);
        est = Math.max(est, r.price * 0.1); // guardrail

        const diff = est - r.price;
        const pct = est > 0 ? (diff / est) * 100 : 0;
        const rmse = typeof pm.rmse === 'number' ? pm.rmse : null;
        const n = typeof pm.n_samples === 'number' ? pm.n_samples : null;
        const z = rmse && rmse > 0 ? diff / rmse : 0;
        const tScore = z * Math.sqrt(n && n > 0 ? n : 1);

        const enrichedDeal: EnrichedDeal = {
          ...r,
          estimated_price: est,
          pct_below: pct,
          model_rmse: rmse ?? undefined,
          model_n: n ?? undefined,
          model_key: `${pm.make_norm ?? 'global'}|${pm.model_base ?? 'base'}`,
          rank_score: Number.isFinite(tScore) ? tScore : pct,
        };
        return enrichedDeal;
      })
      .filter((x): x is EnrichedDeal => x !== null && x.pct_below > 0 && x.pct_below <= 100)
      .sort((a, b) => (b.rank_score !== a.rank_score ? b.rank_score - a.rank_score : b.pct_below - a.pct_below));

    return enriched.slice(0, Math.max(1, limit));
  };

  const fetchWindow = async (hours: number) => {
    const since = new Date(Date.now() - hours * 60 * 60 * 1000).toISOString();
    const { data, error } = await supabase
      .from('car_listings')
      .select('id, make, model, year, kilometers, price, url, scraped_at')
      .gt('price', minPrice)
      .gte('scraped_at', since)
      .order('scraped_at', { ascending: false })
      .limit(600);
    if (error) throw error;
    return (data ?? []) as DealRow[];
  };

  const fetchCheapestRecent = async () => {
    const since7 = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
    const { data, error } = await supabase
      .from('car_listings')
      .select('id, make, model, year, kilometers, price, url, scraped_at')
      .gt('price', minPrice)
      .gte('scraped_at', since7)
      .order('price', { ascending: true })
      .limit(Math.max(10, limit * 2));
    if (error) throw error;
    return (data ?? []) as DealRow[];
  };

  const fetchDeals = useCallback(async () => {
    setLoading(true);
    setErr(null);
    try {
      const { data: models, error: pmErr } = await supabase.from('price_models').select('*');
      if (pmErr) throw pmErr;
      const { findBestModel } = buildModelIndexes(models ?? []);

      const dailyRows = await fetchWindow(lookbackHours);
      console.log('[DailyDeals] daily rows:', dailyRows.length);
      const dailyEnriched = enrichDeals(dailyRows, findBestModel);
      console.log('[DailyDeals] daily eligible deals:', dailyEnriched.length);

      if (dailyEnriched.length > 0) {
        setDeals(dailyEnriched.map((d) => ({ ...d, mode: 'daily' })));
        setIndex(0);
        if (scrollRef.current) scrollRef.current.scrollTo({ left: 0, behavior: 'auto' });
        return;
      }

      const extendedRows = await fetchWindow(24 * 7);
      console.log('[DailyDeals] extended rows:', extendedRows.length);
      const extendedEnriched = enrichDeals(extendedRows, findBestModel);
      console.log('[DailyDeals] extended eligible deals:', extendedEnriched.length);

      if (extendedEnriched.length > 0) {
        setDeals(extendedEnriched.map((d) => ({ ...d, mode: 'extended' })));
        setIndex(0);
        if (scrollRef.current) scrollRef.current.scrollTo({ left: 0, behavior: 'auto' });
        return;
      }

      const cheapest = await fetchCheapestRecent();
      console.log('[DailyDeals] cheapest fallback rows:', cheapest.length);

      const validCheapest = cheapest.filter((r) => typeof r.kilometers === 'number' && r.kilometers !== null);

      if (validCheapest.length > 0) {
        setDeals(
          validCheapest.slice(0, Math.max(1, limit)).map((r) => ({
            ...r,
            mode: 'cheapest' as const,
          }))
        );
        setIndex(0);
        if (scrollRef.current) scrollRef.current.scrollTo({ left: 0, behavior: 'auto' });
        return;
      }

      setDeals([]);
      setErr('No standout deals were found recently.');
    } catch (e) {
      console.error(e);
      setErr('Failed to load daily deals.');
      setDeals([]);
    } finally {
      setLoading(false);
    }
  }, [limit, lookbackHours, minPrice]);

  useEffect(() => {
    fetchDeals();
  }, [fetchDeals]);

  // Carousel helpers
  const slideTo = (i: number) => {
    if (!scrollRef.current) return;
    const container = scrollRef.current;
    const w = container.clientWidth;
    container.scrollTo({ left: i * w, behavior: 'smooth' });
    setIndex(i);
  };

  const next = () => slideTo(Math.min(index + 1, deals.length - 1));
  const prev = () => slideTo(Math.max(index - 1, 0));

  const onScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const el = e.currentTarget;
    const i = Math.round(el.scrollLeft / el.clientWidth);
    if (i !== index) setIndex(i);
  };

  const hasDeals = deals.length > 0;

  const modeBadge = useMemo(() => {
    if (!hasDeals) return null;
    const m = deals[0].mode;
    const label = m === 'daily' ? 'Last 24h' : m === 'extended' ? 'Last 7 days' : 'Cheapest recent';
    const variantClass =
      m === 'daily'
        ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
        : m === 'extended'
        ? 'bg-amber-50 text-amber-700 border-amber-200'
        : 'bg-slate-50 text-slate-700 border-slate-200';
    return (
      <span className={`ml-2 inline-flex items-center rounded-full border px-2 py-0.5 text-xs ${variantClass}`}>
        {label}
      </span>
    );
  }, [hasDeals, deals]);

  const headerRight = useMemo(
    () => (
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="icon" onClick={prev} disabled={!hasDeals || index === 0} aria-label="Previous deal">
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          onClick={next}
          disabled={!hasDeals || index === deals.length - 1}
          aria-label="Next deal"
        >
          <ArrowRight className="h-4 w-4" />
        </Button>
        <Button variant="ghost" size="icon" onClick={fetchDeals} aria-label="Refresh daily deals">
          <RefreshCcw className="h-4 w-4" />
        </Button>
      </div>
    ),
    [hasDeals, index, deals.length, fetchDeals]
  );

  return (
    <Card className="w-full h-full">
      <CardHeader className="flex flex-row items-center justify-between">
        <div className="flex items-center">
          <CardTitle>Daily Deals</CardTitle>
          {modeBadge}
        </div>
        {headerRight}
      </CardHeader>

      <CardContent>
        {/* Carousel viewport */}
        <div
          ref={scrollRef}
          onScroll={onScroll}
          className="relative w-full overflow-x-auto scroll-smooth snap-x snap-mandatory"
          style={{ scrollbarWidth: 'none' }}
        >
          <div className="flex w-full">
            {loading && (
              <div className="min-w-full snap-start">
                <div className="rounded-lg border p-4 h-40 animate-pulse" />
              </div>
            )}

            {!loading && !hasDeals && (
              <div className="min-w-full snap-start">
                <div className="rounded-lg border p-4">
                  <p className="text-sm text-slate-600">{err ?? 'No standout deals were found recently.'}</p>
                </div>
              </div>
            )}

            {deals.map((d) => (
              <div key={d.id} className="min-w-full snap-start px-1">
                <div className="rounded-lg border p-4 h-full">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <h4 className="font-semibold leading-tight">
                        {d.year ?? 'Unknown'} {d.make} {d.model}
                      </h4>
                      <p className="text-sm text-slate-600">
                        {typeof d.kilometers === 'number' ? `${d.kilometers.toLocaleString()} km` : 'Unknown km'}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-bold">{fmtISK(d.price)}</p>
                      {'estimated_price' in d ? (
                          <>
                      <p className="text-sm text-green-600">
                        {formatPriceDifference(d.pct_below)}
                      </p>
                      </>
                        ) : (
                          <p className="text-sm">Estimate unavailable</p>
                        )}
                      {'estimated_price' in d && <p className="text-xs text-slate-500">Est: {fmtISK(d.estimated_price)}</p>}
                    </div>
                  </div>

                  <div className="mt-3 flex items-center justify-between gap-2">
                    {d.url ? (
                      <a
                        href={d.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm text-blue-600 hover:underline"
                      >
                        View listing →
                      </a>
                    ) : (
                      <span />
                    )}

                    {onViewPriceAnalysis && (
                      <Button
                        size="sm"
                        variant="secondary"
                        className="cursor-pointer"
                        onClick={() => {
                          if (!onViewPriceAnalysis) return;
                          const payload: CarItem = {
                            make: d.make, // page.tsx lowercases/normalizes
                            model: canonicalizeModelForSearch(d.model), // <<< key fix
                            year: d.year ? d.year.toString() : 'all',
                            kilometers: typeof d.kilometers === 'number' ? d.kilometers : 0,
                            price: d.price,
                          };
                          onViewPriceAnalysis(payload);
                        }}
                      >
                        View Price Analysis
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Dots */}
        {hasDeals && (
          <div className="mt-3 flex justify-center gap-2">
            {deals.map((_, i) => (
              <button
                key={i}
                aria-label={`Go to slide ${i + 1}`}
                onClick={() => slideTo(i)}
                className={`h-2 w-2 rounded-full transition ${
                  i === index ? 'bg-slate-800' : 'bg-slate-300 hover:bg-slate-400'
                }`}
              />
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
