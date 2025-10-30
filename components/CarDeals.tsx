'use client';

import { useState, useEffect, useImperativeHandle, forwardRef } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { supabase } from '@/lib/supabase';
import type { CarItem } from '@/types/form';
import { X, RefreshCcw } from 'lucide-react';
import { useHeader } from '@/components/ClientHeader';

// ===== Types =====
interface CarDeal {
  id: number;
  make: string;
  model: string;
  year: number | null;
  kilometers: number | null;
  price: number;
  url?: string;
  image_url?: string;
  source?: string;
}

interface PriceModelRow {
  id?: number;
  tier?: 'model_year' | 'model' | 'make' | 'global';
  make_norm: string | null;
  model_base: string | null;
  year?: number | null;
  coef_json: string;
  rmse?: number | null;
  n_samples?: number | null;
}

type EnrichedDeal = CarDeal & {
  estimated_price?: number;
  price_difference_percent?: number;
  model_rmse?: number;
  model_n_samples?: number;   // pooled model sample size
  year_n_samples?: number;    // per-year count (make + first two model words)
  model_key?: string;         // make_norm|model_base (pooled)
  rank_score?: number;
};

type EnrichedWithEstimate = EnrichedDeal &
  Required<Pick<EnrichedDeal, 'estimated_price' | 'price_difference_percent'>>;

interface CarDealsProps {
  onViewPriceAnalysis?: (data: CarItem) => void;
}

// First two words, lowercase, strip punctuation — matches how we search “similar” models.
const toModelBase = (model: string) =>
  model
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 1)
    .join(' ')
    .trim();

// ===== Component =====
export function CarDeals({ onViewPriceAnalysis }: CarDealsProps) {
  const [showDeals, setShowDeals] = useState(false);
  const [cheapestCars, setCheapestCars] = useState<CarDeal[]>([]);
  const [bestDeals, setBestDeals] = useState<EnrichedWithEstimate[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [preloaded, setPreloaded] = useState(false);
  const { registerDealsDialog } = useHeader();

  // NEW: cache timestamp + TTL
  const [lastLoadedAt, setLastLoadedAt] = useState<number | null>(null);
  const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

  // Register the openDeals function with the header (only once)
  useEffect(() => {
    registerDealsDialog(() => openDeals(false));
  }, [registerDealsDialog]);

  // Preload data after initial render
  useEffect(() => {
    const preloadData = async () => {
      // Don't preload if we already have fresh data
      if (hasFreshCache || preloaded) return;
      
      // Small delay to ensure critical page content loads first
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      try {
        await fetchDeals();
        setPreloaded(true);
      } catch (error) {
        console.error('Error preloading deals:', error);
      }
    };

    preloadData();
  }, []);

  const now = Date.now();
  const hasFreshCache =
    lastLoadedAt !== null &&
    now - lastLoadedAt < CACHE_TTL_MS &&
    (bestDeals.length > 0 || cheapestCars.length > 0);

  // Prevent auto-showing dialog when preloading
  useEffect(() => {
    if (bestDeals.length > 0 || cheapestCars.length > 0) {
      setIsLoading(false);
    }
  }, [bestDeals.length, cheapestCars.length]);

  const formatPrice = (price: number) =>
    new Intl.NumberFormat('is-IS', { style: 'currency', currency: 'ISK', maximumFractionDigits: 0 }).format(price);

  const calculatePrice = (coefficientsJson: string, year: string, kilometers: number) => {
    const coefficients = JSON.parse(coefficientsJson) as {
      intercept: number;
      beta_age: number;
      beta_logkm: number;
      beta_age_logkm: number;
    };
    const currentYear = new Date().getFullYear();
    const safeKm = Math.max(0, kilometers || 0);
    const age = currentYear - parseInt(year);
    const logKm = Math.log(1 + safeKm);

    return (
      coefficients.intercept +
      coefficients.beta_age * age +
      coefficients.beta_logkm * logKm +
      coefficients.beta_age_logkm * (age * logKm)
    );
  };

  // Open handler (uses cache unless force=true or stale)
  const openDeals = async (force = false) => {
    if (!force && (hasFreshCache || preloaded)) {
      setShowDeals(true);
      return;
    }
    setShowDeals(true); // Show dialog immediately with loading state
    await fetchDeals();
  };

  const fetchDeals = async () => {
    setIsLoading(true);
    try {
      // 1) Cheapest list
      const { data: cheapestData, error: cheapestError } = await supabase
        .from('car_listings')
        .select('*')
        .eq('is_active', true)
        .gt('price', 50000)
        .not('make', 'is', null)
        .not('make', 'eq', '')
        .not('make', 'ilike', 'unknown')
        .order('price', { ascending: true })
        .limit(50);
      if (cheapestError) throw cheapestError;

      // 2) All pooled price models
      const { data: priceModels, error: modelError } = await supabase
        .from('price_models')
        .select('*');
      if (modelError) throw modelError;

      // Index pooled models for instant lookup
      // Build maps after fetching price_models
      const perYearMap = new Map<string, PriceModelRow>();
      const modelMap = new Map<string, PriceModelRow>();
      const makeMap = new Map<string, PriceModelRow>();
      let globalModel: PriceModelRow | undefined;

      (priceModels ?? []).forEach((pm: PriceModelRow) => {
        if (pm.tier === 'model_year' && pm.make_norm && pm.model_base && pm.year != null) {
          perYearMap.set(`${pm.make_norm}|${pm.model_base}|${pm.year}`, pm);
        } else if (pm.tier === 'model' && pm.make_norm && pm.model_base) {
          modelMap.set(`${pm.make_norm}|${pm.model_base}`, pm);
        } else if (pm.tier === 'make' && pm.make_norm && !pm.model_base) {
          makeMap.set(pm.make_norm, pm);
        } else if (pm.tier === 'global' && !pm.make_norm && !pm.model_base) {
          globalModel = pm;
        }
      });

      const findBestModel = (make: string, model: string, year?: number): PriceModelRow | undefined => {
        const mk = make.toLowerCase();
        const mdBase = toModelBase(model); // now 2 words
        if (typeof year === 'number') {
          const hit = perYearMap.get(`${mk}|${mdBase}|${year}`);
          if (hit) return hit;
        }
        return modelMap.get(`${mk}|${mdBase}`) || makeMap.get(mk) || globalModel;
      };

      // 3) Pool for "Best Deals"
      const { data: dealsData, error: dealsError } = await supabase
        .from('car_listings')
        .select('*')
        .eq('is_active', true)
        .gt('price', 50000)
        .order('scraped_at', { ascending: false })
        .limit(200);
      if (dealsError) throw dealsError;

      const hasEstimate = (d: EnrichedDeal): d is EnrichedWithEstimate =>
        d.estimated_price !== undefined && d.price_difference_percent !== undefined;

      // Enrich and score
      const enriched: EnrichedWithEstimate[] =
        (dealsData ?? [])
          .filter((car): car is CarDeal & { year: number; kilometers: number } =>
            car &&
            typeof car.make === 'string' &&
            typeof car.model === 'string' &&
            typeof car.price === 'number' &&
            typeof car.year === 'number' &&
            typeof car.kilometers === 'number'
          )
          .map((car): EnrichedDeal => {
            const pooled = findBestModel(car.make, car.model, car.year ?? undefined);
            if (!pooled?.coef_json) return { ...car };

            const estimated = calculatePrice(pooled.coef_json, car.year.toString(), car.kilometers); // no clamp
            const pct = ((estimated - car.price) / estimated) * 100;

            const diff = estimated - car.price;
            //const pct = (diff / estimated) * 100;
            const rmse = pooled.rmse ?? null;
            const n = pooled.n_samples ?? null;
            const z = rmse && rmse > 0 ? diff / rmse : 0;
            const tScore = z * Math.sqrt(n && n > 0 ? n : 1);

            return {
              ...car,
              estimated_price: estimated,
              price_difference_percent: pct,
              model_rmse: rmse ?? undefined,
              model_n_samples: n ?? undefined,
              model_key: `${pooled.make_norm ?? 'global'}|${pooled.model_base ?? 'base'}`,
              rank_score: tScore
            };
          })
          .filter((car): car is EnrichedWithEstimate =>
            hasEstimate(car) &&
            car.price_difference_percent > 0 &&
            car.price_difference_percent <= 100
          )
          .sort((a, b) => {
            const rsA = a.rank_score ?? 0;
            const rsB = b.rank_score ?? 0;
            if (rsB !== rsA) return rsB - rsA;
            return (b.price_difference_percent ?? 0) - (a.price_difference_percent ?? 0);
          })
          .slice(0, 50);

      // ---- Year basis like search: same make + first two model words + same year ----
      // Build unique (make, modelBase) pairs and years needed per pair
      const pairYears = new Map<string, Set<number>>();
      for (const d of enriched) {
        if (typeof d.year !== 'number') continue;
        const mk = d.make.toLowerCase();
        const mdBase = toModelBase(d.model);
        const key = `${mk}|${mdBase}`;
        if (!pairYears.has(key)) pairYears.set(key, new Set());
        pairYears.get(key)!.add(d.year);
      }

      // Fetch counts in parallel, restricted to the needed years per pair
      type YearOnlyRow = { year: number | null };
      const perYearCountMap = new Map<string, Map<number, number>>(); // pair -> (year -> count)

      await Promise.all(
        Array.from(pairYears.entries()).map(async ([key, yearsSet]) => {
          const [mk, mdBase] = key.split('|');
          const years = Array.from(yearsSet);
          const { data } = await supabase
            .from('car_listings')
            .select('year')
            .eq('is_active', true)
            .ilike('make', mk)
            .ilike('model', `%${mdBase}%`)
            .in('year', years);

          const inner = new Map<number, number>();
          (data ?? []).forEach((r: YearOnlyRow) => {
            if (typeof r.year === 'number') {
              inner.set(r.year, (inner.get(r.year) ?? 0) + 1);
            }
          });
          for (const y of years) if (!inner.has(y)) inner.set(y, 0);
          perYearCountMap.set(key, inner);
        })
      );

      const withYearNs = enriched.map((d) => {
        if (typeof d.year !== 'number') return d;
        const key = `${d.make.toLowerCase()}|${toModelBase(d.model)}`;
        const n = perYearCountMap.get(key)?.get(d.year);
        return n != null ? { ...d, year_n_samples: n } : d;
      });

      setCheapestCars((cheapestData ?? []) as CarDeal[]);
      setBestDeals(withYearNs);
      setLastLoadedAt(Date.now());      // <-- cache timestamp
    } catch (error) {
      console.error('Error fetching deals:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Dismiss helpers
  const dismissBestDeal = (id: number) => setBestDeals(prev => prev.filter(d => d.id !== id));
  const dismissCheapest = (id: number) => setCheapestCars(prev => prev.filter(d => d.id !== id));

  return (
    <>
      <Dialog open={showDeals} onOpenChange={setShowDeals}>
        <DialogContent className="max-w-3xl h-[80vh] flex flex-col p-0">
          <DialogHeader className="px-6 py-4 flex items-center justify-between">
            <DialogTitle>Car Deals</DialogTitle>

            {/* Force refresh (ignores cache) */}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => openDeals(true)}
              className="gap-2"
              title="Refresh deals"
            >
              <RefreshCcw className="h-4 w-4" />
              Refresh
            </Button>
          </DialogHeader>

          <Tabs defaultValue="best-deals" className="flex-1 flex flex-col overflow-hidden">
            <TabsList className="grid w-full grid-cols-2 px-2">
              <TabsTrigger value="best-deals">
                Best Value Deals
              </TabsTrigger>
              <TabsTrigger value="cheapest">Cheapest Cars</TabsTrigger>
            </TabsList>

            <TabsContent value="best-deals" className="flex-1 overflow-auto px-6">
              <div className="space-y-4 py-4">
                {bestDeals.map((car) => (
                  <Card key={car.id} className="hover:bg-gray-50 relative">
                    {/* Dismiss */}
                    <button
                      type="button"
                      aria-label="Dismiss listing"
                      title="Dismiss listing"
                      onClick={() => dismissBestDeal(car.id)}
                      className="absolute top-2 right-2 p-1 rounded hover:bg-gray-100 cursor-pointer z-10"
                    >
                      <X className="h-4 w-4 text-gray-500" />
                    </button>

                    <CardContent className="p-0">
                      <div className="flex gap-4">
                        {/* Car Image */}
                        <div className="w-32 h-32 flex-shrink-0 relative">
                          {car.image_url ? (
                            <img
                              src={car.image_url}
                              alt={`${car.year} ${car.make} ${car.model}`}
                              className="w-full h-full object-cover rounded-l-lg"
                              onError={(e) => {
                                e.currentTarget.src = `https://placehold.co/200x200/e5e7eb/6b7280?text=${encodeURIComponent(car.make + ' ' + car.model)}`;
                              }}
                            />
                          ) : (
                            <div className="w-full h-full bg-muted flex items-center justify-center rounded-l-lg">
                              <span className="text-muted-foreground text-xs text-center px-2">
                                {car.make} {car.model}
                              </span>
                            </div>
                          )}
                          {/* Facebook Icon - positioned at bottom-right */}
                          {car.source === 'Facebook Marketplace' && (
                            <div className="absolute bottom-1 right-1 z-10 bg-white rounded-full p-1 shadow-md">
                              <svg className="w-3 h-3 text-[#1877F2]" fill="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                                <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
                              </svg>
                            </div>
                          )}
                        </div>

                        {/* Car Details */}
                        <div className="flex-1 p-4 flex flex-col gap-3">
                          <div className="flex justify-between items-start gap-4">
                            <div>
                              <h4 className="font-semibold">
                                {car.year ?? 'Unknown'} {car.make} {car.model}
                              </h4>
                              <p className="text-sm text-gray-600">
                                {car.kilometers != null
                                  ? `${car.kilometers.toLocaleString()} km`
                                  : 'Unknown km'}
                              </p>
                              {typeof car.year === 'number' && car.year_n_samples != null && (
                                <p className="text-xs text-gray-500">
                                  Based on {car.year_n_samples.toLocaleString()} cars from {car.year}
                                </p>
                              )}
                            </div>
                            <div className="text-right">
                              <p className="font-bold text-lg">{formatPrice(car.price)}</p>
                              <p className="text-sm text-green-600">
                                {car.price_difference_percent.toFixed(1)}% below estimate
                              </p>
                              <p className="text-xs text-gray-500">
                                Est: {formatPrice(car.estimated_price)}
                              </p>
                            </div>
                          </div>

                          <div className="flex items-center justify-between gap-3">
                            {car.url ? (
                              <a
                                href={car.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-sm text-blue-600 hover:underline"
                              >
                                View Listing →
                              </a>
                            ) : (
                              <span />
                            )}

                            <div className="flex gap-2">
                              <Button
                                variant="secondary"
                                size="sm"
                                className="cursor-pointer"
                                onClick={() => {
                                  if (!onViewPriceAnalysis) return;
                                  const payload: CarItem = {
                                    make: car.make,
                                    model: car.model, // full model; page.tsx normalizes
                                    year: car.year ? car.year.toString() : 'all',
                                    kilometers: car.kilometers ?? 0,
                                    price: car.price,
                                  };
                                  onViewPriceAnalysis(payload);
                                  setShowDeals(false);
                                }}
                              >
                                View Price Analysis
                              </Button>
                            </div>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </TabsContent>

            <TabsContent value="cheapest" className="flex-1 overflow-auto px-6">
              <div className="space-y-4 py-4">
                {cheapestCars.map((car) => (
                  <Card key={car.id} className="hover:bg-gray-50 relative">
                    <button
                      type="button"
                      aria-label="Dismiss listing"
                      title="Dismiss listing"
                      onClick={() => dismissCheapest(car.id)}
                      className="absolute top-2 right-2 p-1 rounded hover:bg-gray-100 cursor-pointer z-10"
                    >
                      <X className="h-4 w-4 text-gray-500" />
                    </button>

                    <CardContent className="p-0">
                      <div className="flex gap-4">
                        {/* Car Image */}
                        <div className="w-32 h-32 flex-shrink-0 relative">
                          {car.image_url ? (
                            <img
                              src={car.image_url}
                              alt={`${car.year} ${car.make} ${car.model}`}
                              className="w-full h-full object-cover rounded-l-lg"
                              onError={(e) => {
                                e.currentTarget.src = `https://placehold.co/200x200/e5e7eb/6b7280?text=${encodeURIComponent(car.make + ' ' + car.model)}`;
                              }}
                            />
                          ) : (
                            <div className="w-full h-full bg-muted flex items-center justify-center rounded-l-lg">
                              <span className="text-muted-foreground text-xs text-center px-2">
                                {car.make} {car.model}
                              </span>
                            </div>
                          )}
                          {/* Facebook Icon - positioned at bottom-right */}
                          {car.source === 'Facebook Marketplace' && (
                            <div className="absolute bottom-1 right-1 z-10 bg-white rounded-full p-1 shadow-md">
                              <svg className="w-3 h-3 text-[#1877F2]" fill="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                                <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
                              </svg>
                            </div>
                          )}
                        </div>

                        {/* Car Details */}
                        <div className="flex-1 p-4 flex justify-between items-start gap-4">
                          <div>
                            <h4 className="font-semibold">
                              {car.year ?? 'Unknown'} {car.make} {car.model}
                            </h4>
                            <p className="text-sm text-gray-600">
                              {car.kilometers != null
                                ? `${car.kilometers.toLocaleString()} km`
                                : 'Unknown km'}
                            </p>
                          </div>
                          <div className="text-right">
                            <p className="font-bold text-lg">{formatPrice(car.price)}</p>
                          </div>
                        </div>
                      </div>
                      {car.url && (
                        <div className="px-4 pb-4">
                          <a
                            href={car.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-sm text-blue-600 hover:underline"
                          >
                            View Listing →
                          </a>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            </TabsContent>
          </Tabs>
        </DialogContent>
      </Dialog>
    </>
  );
}