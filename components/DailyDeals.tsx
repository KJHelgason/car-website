'use client';

import { useCallback, useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { supabase } from '@/lib/supabase';
import type { CarItem } from '@/types/form';
import { formatPriceDifference } from '@/lib/utils';
import { SaveListingButton } from '@/components/SaveListingButton';

interface DailyDealRow {
  id: number;              // daily_deals.id
  listing_id: number;      // original car_listings.id
  source: string | null;
  title: string | null;
  make: string;
  model: string;
  display_make?: string;
  display_name?: string;
  year: number;
  price: number;
  kilometers: number;
  url: string | null;
  description: string | null;
  scraped_at: string | null;
  image_url?: string;      // car image

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

  const hasDeals = deals.length > 0;

  // Fetch from daily_deals (already curated & scored by backend)
  const fetchDeals = useCallback(async () => {
    setLoading(true);
    setErr(null);
    try {
      // First get the daily deals
      const { data: dealsData, error: dealsError } = await supabase
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

      if (dealsError) throw dealsError;

      // Get the listing_ids to fetch images and display names
      const listingIds = (dealsData ?? []).map((d) => d.listing_id);
      
      // Fetch images and display fields from car_listings
      const { data: listingsData, error: listingsError } = await supabase
        .from('car_listings')
        .select('id, image_url, display_make, display_name')
        .in('id', listingIds);

      if (listingsError) throw listingsError;

      // Create a map of listing_id to listing data
      const listingMap = new Map(
        (listingsData ?? []).map((l) => [l.id, l])
      );

      // Merge the data
      const rows = (dealsData ?? []).map((d) => {
        const listing = listingMap.get(d.listing_id);
        return {
          ...d,
          image_url: listing?.image_url || undefined,
          display_make: listing?.display_make || undefined,
          display_name: listing?.display_name || undefined,
        };
      }) as DailyDealRow[];

      setDeals(rows);
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

  return (
    <Card className="w-full">
      <CardHeader>
        <div className="flex items-center">
          <CardTitle>Daily Deals</CardTitle>
          {hasDeals && (
            <span className="ml-2 inline-flex items-center rounded-full border px-2 py-0.5 text-xs bg-emerald-50 text-emerald-700 border-emerald-200">
              Curated
            </span>
          )}
        </div>
      </CardHeader>

      <CardContent>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-1 gap-4">
          {loading && deals.length === 0 && (
            <>
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="rounded-lg border p-4 animate-pulse">
                  <div className="flex flex-col gap-4">
                    <div className="w-full h-32 bg-slate-200 rounded" />
                    <div className="flex-1">
                      <div className="h-5 bg-slate-200 rounded w-3/4 mb-2" />
                      <div className="h-4 bg-slate-200 rounded w-1/2" />
                    </div>
                  </div>
                </div>
              ))}
            </>
          )}

          {!loading && !hasDeals && (
            <div className="rounded-lg border p-4 sm:col-span-2 lg:col-span-1">
              <p className="text-sm text-slate-600">
                {err ?? 'No standout deals were found.'}
              </p>
            </div>
          )}

          {deals.map((d, index) => (
            <div 
              key={d.id} 
              className={`rounded-lg border overflow-hidden ${index >= 3 ? 'hidden sm:block' : ''} ${index >= 4 ? 'hidden lg:block' : ''}`}
            >
              <div className="flex flex-col">
                {/* Image - clickable, fills top, left, and right edges */}
                <div className="relative">
                  <a
                    href={d.url || undefined}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-full h-32 sm:h-36 bg-slate-100 block flex-shrink-0"
                    onClick={(e) => {
                      if (!d.url) e.preventDefault();
                    }}
                  >
                    {d.image_url ? (
                      <img
                        src={d.image_url}
                        alt={`${d.display_make || d.make} ${d.display_name || d.model}`}
                        className="w-full h-full object-cover hover:opacity-90 transition-opacity"
                        onError={(e) => {
                          e.currentTarget.style.display = 'none';
                          const placeholder = e.currentTarget.nextElementSibling as HTMLElement;
                          if (placeholder) placeholder.style.display = 'flex';
                        }}
                      />
                    ) : null}
                    <div
                      className="w-full h-full flex items-center justify-center bg-slate-200 text-slate-500 text-xs text-center p-2"
                      style={{ display: d.image_url ? 'none' : 'flex' }}
                    >
                      {d.display_make || d.make} {d.display_name || d.model}
                    </div>
                  </a>
                  {/* Save Button */}
                  <div className="absolute top-2 right-2">
                    <SaveListingButton listingId={d.listing_id} size="sm" />
                  </div>
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0 space-y-2 p-3 sm:p-4">
                  {/* Title and Price Row */}
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      {/* Title - clickable */}
                      <a
                        href={d.url || undefined}
                        target="_blank"
                        rel="noopener noreferrer"
                        className={d.url ? "hover:text-blue-700 transition-colors" : "cursor-default"}
                        onClick={(e) => {
                          if (!d.url) e.preventDefault();
                        }}
                      >
                        <h4 className="font-semibold text-sm leading-tight line-clamp-2">
                          {d.year ?? 'Unknown'} {d.display_make || d.make} {d.display_name || d.model}
                        </h4>
                      </a>
                      <p className="text-xs text-slate-600 mt-1 truncate">
                        {typeof d.kilometers === 'number'
                          ? `${d.kilometers.toLocaleString()} km`
                          : 'Unknown km'}
                      </p>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <p className="font-bold text-sm whitespace-nowrap">{fmtISK(d.price)}</p>
                      {Number.isFinite(d.pct_below) && (
                        <p className="text-xs text-green-600 font-medium whitespace-nowrap">
                          {formatPriceDifference(d.pct_below)}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex flex-col gap-2">
                    {d.url && (
                      <a
                        href={d.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs text-blue-600 hover:underline truncate"
                      >
                        View listing
                      </a>
                    )}
                    {onViewPriceAnalysis && (
                      <Button
                        size="sm"
                        variant="outline"
                        className="cursor-pointer w-full text-xs"
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
                        Analyze Price
                      </Button>
                    )}
                    
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
