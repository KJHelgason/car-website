'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowLeft, ArrowRight } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import type { CarItem } from '@/types/form';
import { formatPriceDifference } from '@/lib/utils';

interface DailyDealRow {
  id: number;              // daily_deals.id
  listing_id: number;      // original car_listings.id
  source: string | null;
  title: string | null;
  make: string;
  model: string;
  year: number;
  price: number;
  kilometers: number;
  url: string | null;
  description: string | null;
  scraped_at: string | null;

  // precomputed by backend script
  estimated_price: number;
  pct_below: number;     // positive = below estimate
  model_rmse: number | null;
  model_n: number | null;
  model_key: string | null;
  rank_score: number | null;

  // bookkeeping
  inserted_at: string | null;
  computed_at: string | null;
}

interface DailyDealsProps {
  limit?: number;                          // how many to show (max 10 coming from backend)
  onViewPriceAnalysis?: (data: CarItem) => void;
}

const fmtISK = (v: number) =>
  new Intl.NumberFormat('is-IS', {
    style: 'currency',
    currency: 'ISK',
    maximumFractionDigits: 0,
  }).format(v);

/** Canonicalize model name for the analysis payload (kept from your original) */
const canonicalizeModelForSearch = (raw: string): string => {
  const cleaned = raw
    .toLowerCase()
    .trim()
    .replace(/[\/_+]/g, ' ')
    .replace(/[^a-z0-9\s-]/g, ' ')
    .replace(/\s+/g, ' ');
  const first = cleaned.split(' ')[0] || '';
  return first || cleaned;
};

export function DailyDeals({
  limit = 6,
  onViewPriceAnalysis,
}: DailyDealsProps) {
  const [deals, setDeals] = useState<DailyDealRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const scrollRef = useRef<HTMLDivElement>(null);
  const [index, setIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const hasDeals = deals.length > 0;

  // Smooth scroll helper
  const scrollToIndex = useCallback((targetIndex: number, smooth = true) => {
    const el = scrollRef.current;
    if (!el) return;
    const w = el.clientWidth;
    const targetLeft = targetIndex * w;

    if (Math.abs(el.scrollLeft - targetLeft) >= 1) {
      el.scrollTo({
        left: targetLeft,
        behavior: smooth ? 'smooth' : 'auto',
      });
    }
    setIndex(targetIndex);
  }, []);

  // Auto-rotate
  useEffect(() => {
    if (!hasDeals || isPaused || deals.length < 2) return;
    const timer = setInterval(() => {
      const nextIndex = (index + 1) % deals.length;
      scrollToIndex(nextIndex);
    }, 5000);
    return () => clearInterval(timer);
  }, [hasDeals, isPaused, deals.length, index, scrollToIndex]);

  // Keep index synced with manual scroll
  const onScroll = useCallback(
    (e: React.UIEvent<HTMLDivElement>) => {
      const el = e.currentTarget;
      const newIndex = Math.round(el.scrollLeft / el.clientWidth);
      if (newIndex !== index) {
        setIndex(newIndex);
      }
    },
    [index],
  );

  // Fetch from daily_deals (already curated & scored by backend)
  const fetchDeals = useCallback(async () => {
    setLoading(true);
    setErr(null);
    try {
      const { data, error } = await supabase
        .from('daily_deals')
        .select(
          `
          id, listing_id, source, title, make, model, year, price, kilometers, url, description, scraped_at,
          estimated_price, pct_below, model_rmse, model_n, model_key, rank_score, inserted_at, computed_at
        `,
        )
        .order('rank_score', { ascending: false, nullsFirst: false })
        .order('inserted_at', { ascending: false, nullsFirst: false })
        .limit(Math.max(1, limit));

      if (error) throw error;

      const rows = (data ?? []) as DailyDealRow[];
      setDeals(rows);
      setIndex(0);
      if (scrollRef.current) scrollRef.current.scrollTo({ left: 0, behavior: 'auto' });
    } catch (e) {
      console.error(e);
      setErr('Failed to load daily deals.');
      setDeals([]);
    } finally {
      setLoading(false);
    }
  }, [limit]);

  useEffect(() => {
    fetchDeals();
  }, [fetchDeals]);

  // Controls
  const next = useCallback(() => {
    if (!hasDeals) return;
    const nextIndex = Math.min(index + 1, deals.length - 1);
    scrollToIndex(nextIndex);
  }, [hasDeals, index, deals.length, scrollToIndex]);

  const prev = useCallback(() => {
    if (!hasDeals) return;
    const prevIndex = Math.max(index - 1, 0);
    scrollToIndex(prevIndex);
  }, [hasDeals, index, scrollToIndex]);

  // Simple badge to indicate source of results (now always from backend)
  const modeBadge = useMemo(() => {
    if (!hasDeals) return null;
    return (
      <span className="ml-2 inline-flex items-center rounded-full border px-2 py-0.5 text-xs bg-emerald-50 text-emerald-700 border-emerald-200">
        Curated
      </span>
    );
  }, [hasDeals]);

  const headerRight = useMemo(
    () => (
      <div className="flex items-center gap-2">
        <Button
          variant="ghost"
          size="icon"
          onClick={prev}
          disabled={!hasDeals || index === 0}
          aria-label="Previous deal"
        >
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
      </div>
    ),
    [hasDeals, index, deals.length, prev, next],
  );

  return (
    <Card className="w-full h-full gap-2 py-2">
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
          onMouseEnter={() => setIsPaused(true)}
          onMouseLeave={() => setIsPaused(false)}
          className="relative w-full overflow-x-auto scroll-smooth snap-x snap-mandatory"
          style={{ scrollbarWidth: 'none' }}
        >
          <div className="flex w-full">
            {loading && deals.length === 0 && (
              <div className="min-w-full snap-start">
                <div className="rounded-lg border p-4 h-40 animate-pulse" />
              </div>
            )}

            {!loading && !hasDeals && (
              <div className="min-w-full snap-start">
                <div className="rounded-lg border p-4">
                  <p className="text-sm text-slate-600">
                    {err ?? 'No standout deals were found.'}
                  </p>
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
                        {typeof d.kilometers === 'number'
                          ? `${d.kilometers.toLocaleString()} km`
                          : 'Unknown km'}
                      </p>
                      {/* Optional: show source */}
                      {d.source && (
                        <p className="text-xs text-slate-500 mt-1">
                          {d.source}
                        </p>
                      )}
                    </div>
                    <div className="text-right">
                      <p className="font-bold">{fmtISK(d.price)}</p>
                      {Number.isFinite(d.pct_below) ? (
                        <p className="text-sm text-green-600">
                          {formatPriceDifference(d.pct_below)}
                        </p>
                      ) : (
                        <p className="text-sm">Estimate unavailable</p>
                      )}
                      {Number.isFinite(d.estimated_price) && (
                        <p className="text-xs text-slate-500">
                          Est: {fmtISK(d.estimated_price)}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="mt-10.5 flex items-center justify-between gap-2">
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
                          const payload: CarItem = {
                            make: d.make,
                            model: canonicalizeModelForSearch(d.model),
                            year: d.year ? d.year.toString() : 'all',
                            kilometers:
                              typeof d.kilometers === 'number'
                                ? d.kilometers
                                : 0,
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

            {/* Optional placeholders while loading additional slides */}
            {loading &&
              deals.length > 0 &&
              Array.from({ length: Math.max(0, limit - deals.length) }).map(
                (_ , i) => (
                  <div key={`loading-${i}`} className="min-w-full snap-start px-1">
                    <div className="rounded-lg border p-4 h-full animate-pulse">
                      <div className="flex items-start justify-between gap-4">
                        <div className="w-2/3">
                          <div className="h-5 bg-slate-200 rounded w-3/4 mb-2" />
                          <div className="h-4 bg-slate-200 rounded w-1/2" />
                        </div>
                        <div className="w-1/3">
                          <div className="h-5 bg-slate-200 rounded w-full mb-2" />
                          <div className="h-4 bg-slate-200 rounded w-2/3" />
                        </div>
                      </div>
                    </div>
                  </div>
                ),
              )}
          </div>
        </div>

        {/* Dots */}
        {hasDeals && (
          <div className="mb-2 mt-4 flex justify-center gap-2">
            {deals.map((_, i) => (
              <button
                key={i}
                aria-label={`Go to slide ${i + 1}`}
                onClick={() => scrollToIndex(i)}
                className={`h-2 w-2 rounded-full transition ${
                  i === index
                    ? 'bg-slate-800'
                    : 'bg-slate-300 hover:bg-slate-400'
                }`}
              />
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
