import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useEffect, useMemo, useState } from 'react';
import type { CarAnalysis } from '@/types/car';
import { Button } from '@/components/ui/button';
import { ArrowDownAZ, ArrowUpAZ, ArrowDownNarrowWide, ArrowUpNarrowWide } from 'lucide-react';
import { supabase } from '@/lib/supabase';

type CoefJson = {
  intercept: number;
  beta_age: number;
  beta_logkm: number;
  beta_age_logkm: number;
};

type PriceModelLike = CarAnalysis['priceModel'] & {
  make_norm?: string;
  model_base?: string;
  tier?: 'model_year' | 'model' | 'make' | 'global';
  year?: number;
};

type ExtendedCarPricePoint = {
  kilometers: number;
  price: number;
  name?: string;
  url?: string;
  year?: string;
  isTarget?: boolean;
  /** +% below estimate (positive = deal), negative = above estimate */
  priceDifference?: number;
};

interface SimilarCarListProps {
  analysis: CarAnalysis;
  onYearChange?: (year: number) => void;
  searchedYear?: string | null;
}

// ---- helpers ----
const parseCoef = (raw: unknown): CoefJson | null => {
  if (!raw) return null;
  const cj = typeof raw === 'string' ? JSON.parse(raw) : (raw as Partial<CoefJson>);
  return {
    intercept: Number((cj as CoefJson).intercept ?? 0),
    beta_age: Number((cj as CoefJson).beta_age ?? 0),
    beta_logkm: Number((cj as CoefJson).beta_logkm ?? 0),
    beta_age_logkm: Number((cj as CoefJson).beta_age_logkm ?? 0),
  };
};

const estimateFromCoef = (coef: CoefJson, yearNum: number, km: number): number => {
  const currentYear = new Date().getFullYear();
  const age = currentYear - yearNum;
  const logkm = Math.log(1 + Math.max(0, km));
  return (
    coef.intercept +
    coef.beta_age * age +
    coef.beta_logkm * logkm +
    coef.beta_age_logkm * (age * logkm)
  );
};

export function SimilarCarList({ analysis, onYearChange, searchedYear }: SimilarCarListProps) {
  const { similarListings, priceModel } = analysis;

  const [selectedYear, setSelectedYear] = useState<number | null>(null);
  const [availableYears, setAvailableYears] = useState<number[]>([]);
  const [sortBy, setSortBy] = useState<'value' | 'price'>('value');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [displayLimit, setDisplayLimit] = useState(10);

  // Cache per-year coefficients so we only fetch once per year
  const [coefCache, setCoefCache] = useState<Record<number, CoefJson | null>>({});

  // Base pooled coefficients (model → make → global) come with the analysis.priceModel
  const baseCoef: CoefJson | null = useMemo(
    () => parseCoef((priceModel as unknown as { coef_json?: unknown })?.coef_json),
    [priceModel]
  );

  // Build year options & choose default year (most cars; respect searchedYear when available)
  useEffect(() => {
    const yearCounts = similarListings.reduce((acc, listing) => {
      if (listing.year) {
        const y = parseInt(listing.year);
        if (!Number.isNaN(y)) acc[y] = (acc[y] || 0) + 1;
      }
      return acc;
    }, {} as Record<number, number>);

    const years = Object.keys(yearCounts)
      .map((y) => parseInt(y))
      .filter((y) => !Number.isNaN(y))
      .sort((a, b) => b - a);

    setAvailableYears(years);

    if (years.length === 0) {
      setSelectedYear(null);
      return;
    }

    const yearWithMostResults = years.reduce((maxY, y) => (yearCounts[y] > yearCounts[maxY] ? y : maxY), years[0]);

    const hasSearched = searchedYear && searchedYear !== 'all' && !Number.isNaN(parseInt(searchedYear));
    if (hasSearched) {
      const y = parseInt(searchedYear as string);
      if (yearCounts[y] && yearCounts[y] > 0) {
        setSelectedYear(y);
        return;
      }
    }
    setSelectedYear(yearWithMostResults);
  }, [similarListings, searchedYear]);

  // Fetch per-year coefficients for selected year (model_year) if possible; cache result
  useEffect(() => {
    const pm = priceModel as PriceModelLike;
    if (!selectedYear || !pm?.make_norm || !pm?.model_base) return;
    if (Object.prototype.hasOwnProperty.call(coefCache, selectedYear)) return;

    let canceled = false;
    (async () => {
      const { data, error } = await supabase
        .from('price_models')
        .select('coef_json')
        .eq('tier', 'model_year')
        .eq('make_norm', pm.make_norm!)
        .eq('model_base', pm.model_base!)
        .eq('year', selectedYear)
        .maybeSingle();

      if (canceled) return;

      if (error || !data?.coef_json) {
        setCoefCache((prev) => ({ ...prev, [selectedYear]: null }));
        return;
      }

      const parsed = parseCoef(data.coef_json);
      setCoefCache((prev) => ({ ...prev, [selectedYear]: parsed }));
    })();

    return () => {
      canceled = true;
    };
  }, [selectedYear, priceModel, coefCache]);

  // Compute filtered + scored list using the unified formula and best-available coefficients
  const filteredListings: ExtendedCarPricePoint[] = useMemo(() => {
    const list: ExtendedCarPricePoint[] = similarListings
      .filter((l) => {
        if (!selectedYear) return true;
        const ly = l.year ? parseInt(l.year) : NaN;
        return !Number.isNaN(ly) && ly === selectedYear;
      })
      .map((l) => ({ ...l }));

    // pick coef for this year, fallback to base
    const yearCoef = selectedYear ? coefCache[selectedYear] : null;
    const coef = yearCoef ?? baseCoef;

    const scored = list.map((l) => {
      const yNum = l.year ? parseInt(l.year) : NaN;
      if (!coef || Number.isNaN(yNum) || typeof l.kilometers !== 'number' || typeof l.price !== 'number') {
        return { ...l, priceDifference: undefined } as ExtendedCarPricePoint;
      }
      const est = estimateFromCoef(coef, yNum, l.kilometers);
      if (!Number.isFinite(est) || est <= 0) return { ...l, priceDifference: undefined } as ExtendedCarPricePoint;
      const pct = ((est - l.price) / est) * 100; // positive => below estimate (deal)
      return { ...l, priceDifference: pct } as ExtendedCarPricePoint;
    });

    const sorted = scored.sort((a, b) => {
      const mult = sortOrder === 'desc' ? 1 : -1;
      if (sortBy === 'value') {
        const av = a.priceDifference ?? -Infinity;
        const bv = b.priceDifference ?? -Infinity;
        return (bv - av) * mult;
      }
      // sort by price
      return ((b.price ?? 0) - (a.price ?? 0)) * mult;
    });

    return sorted;
  }, [similarListings, selectedYear, coefCache, baseCoef, sortBy, sortOrder]);

  // Format price
  const formatPrice = (price: number) => {
    if (!price || Number.isNaN(price)) return 'N/A';
    return new Intl.NumberFormat('is-IS', {
      style: 'currency',
      currency: 'ISK',
      maximumFractionDigits: 0,
    }).format(price);
  };

  return (
    <Card id="similar-cars" className="w-full h-full flex flex-col">
      <CardHeader className="flex flex-row items-center justify-between flex-shrink-0">
        <div className="flex items-center gap-4">
          <CardTitle>Similar Cars</CardTitle>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                if (sortBy === 'value') {
                  setSortOrder((prev) => (prev === 'asc' ? 'desc' : 'asc'));
                } else {
                  setSortBy('value');
                  setSortOrder('desc');
                }
              }}
              className={`px-2 ${sortBy === 'value' ? 'bg-blue-50' : ''}`}
              title={`Sort by value ${sortBy === 'value' && sortOrder === 'desc' ? '(ascending)' : '(descending)'}`}
            >
              {sortBy === 'value' && sortOrder === 'desc' ? (
                <ArrowDownNarrowWide className="h-4 w-4" />
              ) : (
                <ArrowUpNarrowWide className="h-4 w-4" />
              )}
              <span className="ml-2">Value</span>
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                if (sortBy === 'price') {
                  setSortOrder((prev) => (prev === 'asc' ? 'desc' : 'asc'));
                } else {
                  setSortBy('price');
                  setSortOrder('desc');
                }
              }}
              className={`px-2 ${sortBy === 'price' ? 'bg-blue-50' : ''}`}
              title={`Sort by price ${sortBy === 'price' && sortOrder === 'desc' ? '(ascending)' : '(descending)'}`}
            >
              {sortBy === 'price' && sortOrder === 'desc' ? (
                <ArrowDownAZ className="h-4 w-4" />
              ) : (
                <ArrowUpAZ className="h-4 w-4" />
              )}
              <span className="ml-2">Price</span>
            </Button>
          </div>
        </div>

        <Select
          value={selectedYear?.toString()}
          onValueChange={(value) => {
            const newYear = parseInt(value);
            setSelectedYear(newYear);
            setDisplayLimit(10);
            onYearChange?.(newYear);
          }}
        >
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Select Year" />
          </SelectTrigger>
          <SelectContent>
            <SelectGroup>
              {availableYears.map((year) => {
                const count = similarListings.filter((listing) => {
                  const ly = listing.year ? parseInt(listing.year) : NaN;
                  return !Number.isNaN(ly) && ly === year;
                }).length;

                return (
                  <SelectItem key={year} value={year.toString()}>
                    {year} <span className="font-bold">({count})</span>
                  </SelectItem>
                );
              })}
            </SelectGroup>
          </SelectContent>
        </Select>
      </CardHeader>

      <CardContent className="flex-1 overflow-auto">
        <div className="space-y-4 pr-2">
          {filteredListings.slice(0, displayLimit).map((car, idx) => (
            <Card key={`${car.url ?? car.name ?? 'car'}-${idx}`} className="hover:bg-gray-50">
              <CardContent className="p-4">
                <div className="flex justify-between items-start gap-4">
                  <div>
                    <h4 className="font-semibold">{car.name}</h4>
                    <p className="text-sm text-gray-600">
                      {typeof car.kilometers === 'number' ? car.kilometers.toLocaleString() : 'Unknown'} km
                    </p>
                    {car.year && <p className="text-xs text-gray-500">Year: {car.year}</p>}
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-lg">{formatPrice(car.price)}</p>
                    {typeof car.priceDifference === 'number' && (
                      <p className={car.priceDifference > 0 ? 'text-sm text-green-600' : 'text-sm text-red-600'}>
                        {Math.abs(car.priceDifference).toFixed(1)}% {car.priceDifference > 0 ? 'below' : 'above'} estimate
                      </p>
                    )}
                  </div>
                </div>
                {car.url && (
                  <a
                    href={car.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-blue-600 hover:underline block mt-2"
                  >
                    View Listing →
                  </a>
                )}
              </CardContent>
            </Card>
          ))}

          {filteredListings.length > displayLimit && (
            <div className="flex justify-center pt-2">
              <Button
                variant="outline"
                onClick={() => setDisplayLimit((prev) => prev + 10)}
                className="w-full"
              >
                Show More ({filteredListings.length - displayLimit} remaining)
              </Button>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
