'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { CarSearchForm } from '@/components/CarSearchForm';
import { PriceAnalysis } from '@/components/PriceAnalysis';
import { CarDeals } from '@/components/CarDeals';
import { SimilarCarList } from '@/components/SimilarCarList';
import { CarListSearch } from '@/components/CarListSearch';
import { HeroSection } from '@/components/HeroSection';
import { PopularSearches } from '@/components/PopularSearches';
import { RecentListings } from '@/components/RecentListings';
import { SearchModeTabs } from '@/components/SearchModeTabs';
import { DailyDealsWithButton } from '@/components/DailyDealsWithButton';
import { useHeader } from '@/components/ClientHeader';
import type { CarPricePoint, CarAnalysis, PriceModel } from '@/types/car';
import type { CarItem } from '@/types/form';
import { supabase } from '@/lib/supabase';
import { trackPageView, trackSearch } from '@/lib/analytics';
import { TipsSystem } from '@/components/ui/tips';
import '@/app/tips.css';

interface DbCarListing {
  id: number;
  make: string;
  model: string;
  display_make?: string;
  display_name?: string;
  year: string;
  kilometers: number;
  price: number;
  url: string;
  scraped_at?: string;
  image_url?: string;
  source?: string;
}

const normalizeTwoWords = (s: string) =>
  s
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .split(/\s+/)
    .slice(0, 2)
    .join(' ');

const normalizeOneWord = (s: string) =>
  s
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .split(/\s+/)[0] ?? '';

interface HomeContentProps {
  activeListingCount: number | null;
}

function HomeContent({ activeListingCount }: HomeContentProps) {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [analysis, setAnalysis] = useState<CarAnalysis | null>(null);
  const [makes, setMakes] = useState<Array<{ make_norm: string; display_make: string }>>([]);
  const [searchedYear, setSearchedYear] = useState<string | null>(null);
  const [hasRangeResults, setHasRangeResults] = useState(false);
  const [hasSearchedEver, setHasSearchedEver] = useState(false);
  const { searchMode, setSearchMode } = useHeader();
  const [lastSearch, setLastSearch] = useState<CarItem | null>(null);
  const [isLoadingFromUrl, setIsLoadingFromUrl] = useState(false);

  useEffect(() => {
    trackPageView('/');
  }, []);

  useEffect(() => {
    fetchMakes();
  }, []);

  useEffect(() => {
    const make = searchParams.get('make');
    const model = searchParams.get('model');
    const year = searchParams.get('year');
    const kilometers = searchParams.get('kilometers');
    const price = searchParams.get('price');
    const mode = searchParams.get('mode');

    const isRangeMode = mode === 'range';
    const hasRequiredParams = isRangeMode ? make : make && model && year;

    if (hasRequiredParams && !isLoadingFromUrl) {
      setIsLoadingFromUrl(true);

      if (isRangeMode) {
        setSearchMode('range');
      } else {
        setSearchMode('analysis');
        handleSearch(
          {
            make: make!,
            model: model!,
            year: year!,
            kilometers: kilometers ? parseInt(kilometers) : 0,
            price: price ? parseInt(price) : 0,
          },
          true
        );
      }
    }
  }, [searchParams, isLoadingFromUrl, setSearchMode]);

  const fetchMakes = async () => {
    const { data: modelMakes, error: modelError } = await supabase
      .from('price_models')
      .select('make_norm, display_make, model_base')
      .not('make_norm', 'is', null)
      .not('model_base', 'is', null)
      .order('display_make', { ascending: true });

    if (modelError) {
      console.log('Error fetching makes from price_models:', modelError);
      return;
    }

    if (modelMakes && modelMakes.length > 0) {
      const makeModelCount = modelMakes.reduce((acc, item) => {
        const key = item.make_norm;
        acc[key] = (acc[key] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

      const uniqueMakes = [...new Set(modelMakes.map((item) => item.make_norm))]
        .filter((make_norm) => makeModelCount[make_norm] > 0)
        .map((make_norm) => {
          const entry = modelMakes.find((item) => item.make_norm === make_norm);
          return {
            make_norm,
            display_make:
              entry?.display_make || make_norm.charAt(0).toUpperCase() + make_norm.slice(1),
          };
        });
      setMakes(uniqueMakes);
    } else {
      const { data: listingMakes, error: listingError } = await supabase
        .from('car_listings')
        .select('make, model')
        .eq('is_active', true)
        .not('model', 'is', null)
        .order('make', { ascending: true });

      if (!listingError && listingMakes) {
        const makeModelCount = listingMakes.reduce((acc, item) => {
          const make = (item.make as string).toLowerCase();
          acc[make] = (acc[make] || 0) + 1;
          return acc;
        }, {} as Record<string, number>);

        const uniqueMakes = [...new Set(
          listingMakes.map((item) => {
            const make = item.make as string;
            return {
              make_norm: make.toLowerCase(),
              display_make: make,
            };
          })
        )].filter((makeObj) => makeModelCount[makeObj.make_norm] > 0);

        setMakes(uniqueMakes);
      }
    }
  };

  const calculatePrice = (
    coefficientsJson: string | PriceModel['coef_json'],
    year: string,
    kilometers: number
  ) => {
    try {
      const coefficients = typeof coefficientsJson === 'string' ? JSON.parse(coefficientsJson) : coefficientsJson;
      const currentYear = new Date().getFullYear();

      if (year === null) return NaN;
      if (!year || isNaN(parseInt(year))) {
        return NaN;
      }
      if (typeof kilometers !== 'number' || isNaN(kilometers)) {
        return NaN;
      }

      const age = currentYear - parseInt(year);
      const logKm = Math.log(1 + Math.max(0, kilometers));

      if (!coefficients || typeof coefficients !== 'object') {
        return NaN;
      }

      return (
        coefficients.intercept +
        coefficients.beta_age * age +
        coefficients.beta_logkm * logKm +
        coefficients.beta_age_logkm * (age * logKm)
      );
    } catch (error) {
      return NaN;
    }
  };

  const generateCurvePoints = (
    coefficientsJson: string | PriceModel['coef_json'],
    year: string,
    kmRange: [number, number],
    points: number = 50
  ): CarPricePoint[] => {
    const step = (kmRange[1] - kmRange[0]) / (points - 1);
    return Array.from({ length: points }, (_, i) => {
      const km = kmRange[0] + step * i;
      return {
        kilometers: km,
        price: calculatePrice(coefficientsJson, year, km),
        isCurve: true,
        year,
      };
    });
  };

  const pickPriceModel = async (make_norm: string, modelTwo: string, modelOne: string) => {
    const { data: two } = await supabase
      .from('price_models')
      .select('*')
      .eq('make_norm', make_norm)
      .eq('model_base', modelTwo)
      .limit(1);
    if (two && two.length > 0) return two[0];

    const { data: one } = await supabase
      .from('price_models')
      .select('*')
      .eq('make_norm', make_norm)
      .eq('model_base', modelOne)
      .limit(1);
    if (one && one.length > 0) return one[0];

    const { data: makeOnly } = await supabase
      .from('price_models')
      .select('*')
      .eq('make_norm', make_norm)
      .is('model_base', null)
      .limit(1);
    if (makeOnly && makeOnly.length > 0) return makeOnly[0];

    const { data: global } = await supabase
      .from('price_models')
      .select('*')
      .is('make_norm', null)
      .is('model_base', null)
      .limit(1);
    return global ? global[0] : null;
  };

  const fetchListings = async (make_norm: string, modelPattern: string) => {
    const { data, error } = await supabase
      .from('car_listings')
      .select('*')
      .ilike('make', make_norm)
      .ilike('model', `%${modelPattern}%`)
      .eq('is_active', true)
      .not('year', 'is', null)
      .order('scraped_at', { ascending: false });
    if (error) {
      console.error('Supabase query error:', error);
      return [] as DbCarListing[];
    }
    return (data ?? []) as DbCarListing[];
  };

  const handleSearch = async (data: CarItem, skipUrlUpdate = false) => {
    try {
      setSearchedYear(data.year ?? 'all');
      setHasSearchedEver(true);
      setLastSearch(data);

      if (!skipUrlUpdate) {
        const params = new URLSearchParams();
        params.set('make', data.make);
        params.set('model', data.model);
        params.set('year', data.year || 'all');
        params.set('mode', 'analysis');
        if (data.kilometers) params.set('kilometers', data.kilometers.toString());
        if (data.price) params.set('price', data.price.toString());

        router.push(`/?${params.toString()}`, { scroll: false });
      }

      const make_norm = data.make.toLowerCase().trim();
      const model_two = normalizeTwoWords(data.model);
      const model_one = normalizeOneWord(data.model);

      const priceModel = await pickPriceModel(make_norm, model_two, model_one);
      if (!priceModel) {
        console.error('No price models found');
        return;
      }

      let similarCars = await fetchListings(make_norm, model_two);
      const MIN_RESULTS = 20;
      if (similarCars.length < MIN_RESULTS && model_one && model_one !== model_two) {
        const broader = await fetchListings(make_norm, model_one);
        if (broader.length > similarCars.length) {
          similarCars = broader;
        }
      }

      trackSearch({
        make: data.make,
        model: data.model,
        year: data.year,
        make_norm,
        model_base: model_two,
        results_count: similarCars.length,
      });

      if (isLoadingFromUrl) {
        setIsLoadingFromUrl(false);
      }

      let price: number;
      if (data.year === 'all') {
        const validYears = similarCars
          .map((car) => car.year)
          .filter((year): year is string => year !== null && year !== undefined)
          .map((year) => parseInt(year))
          .filter((n) => !isNaN(n));

        const averageYear =
          validYears.length > 0
            ? Math.round(validYears.reduce((a, b) => a + b, 0) / validYears.length)
            : new Date().getFullYear();

        price = calculatePrice(priceModel.coef_json, averageYear.toString(), data.kilometers);
      } else {
        price = calculatePrice(priceModel.coef_json, data.year, data.kilometers);
      }

      if (isNaN(price)) {
        return;
      }

      const priceRange = {
        low: price - priceModel.rmse,
        high: price + priceModel.rmse,
      };

      const yearsWithData = [...new Set(similarCars.map((car) => car.year))];
      const kmRange: [number, number] = [0, 300000];
      const curves: { [year: string]: CarPricePoint[] } = {};
      yearsWithData.forEach((year) => {
        if (year) {
          const yearCurve = generateCurvePoints(priceModel.coef_json, year, kmRange);
          curves[year] = yearCurve;
        }
      });

      const similarListings: CarPricePoint[] = similarCars.map((car) => ({
        id: car.id,
        kilometers: car.kilometers,
        price: car.price,
        name: `${car.display_make || car.make} ${car.display_name || car.model}`,
        year: car.year,
        url: car.url,
        image_url: car.image_url,
        source: car.source,
      }));

      const targetCar: CarPricePoint = {
        kilometers: data.kilometers,
        price: data.price || price,
        searchPrice: data.price,
        isTarget: true,
        name: `${data.make} ${data.model}`,
        year: data.year === 'all' ? undefined : data.year,
      };

      setAnalysis({
        targetCar,
        similarListings,
        priceCurves: curves,
        priceModel,
        estimatedPrice: price,
        priceRange,
      });
    } catch (error) {
      console.error('Unexpected error:', error);
    }
  };

  return (
    <main className="container mx-auto p-4">
      <div className="hidden">
        <CarDeals onViewPriceAnalysis={handleSearch} />
      </div>

      <TipsSystem
        mode={searchMode === 'range' ? 'search' : 'analysis'}
        hasSearched={searchMode === 'analysis' ? !!analysis : hasRangeResults}
      />

      {!hasSearchedEver && <HeroSection activeListingCount={activeListingCount} />}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <div>
            <div className="mb-0">
              <SearchModeTabs mode={searchMode} onModeChange={setSearchMode} />
            </div>

            <div className={searchMode === 'analysis' ? 'block' : 'hidden'}>
              <div className="space-y-6">
                <CarSearchForm onSearch={handleSearch} makes={makes} />

                {!analysis ? (
                  <>
                    <PopularSearches onSearch={handleSearch} />
                    <RecentListings onViewAnalysis={handleSearch} />
                  </>
                ) : (
                  <>
                    <PriceAnalysis
                      analysis={analysis}
                      searchedYear={searchedYear}
                      searchParams={lastSearch || undefined}
                      onYearChange={(year) => {
                        const price = calculatePrice(
                          analysis.priceModel.coef_json,
                          year.toString(),
                          analysis.targetCar.kilometers
                        );
                        setAnalysis({
                          ...analysis,
                          estimatedPrice: price,
                          priceRange: {
                            low: price - analysis.priceModel.rmse,
                            high: price + analysis.priceModel.rmse,
                          },
                        });
                      }}
                    />

                    <SimilarCarList
                      analysis={analysis}
                      searchedYear={searchedYear}
                      onViewPriceAnalysis={handleSearch}
                      onYearChange={(year) => {
                        const price = calculatePrice(
                          analysis.priceModel.coef_json,
                          year.toString(),
                          analysis.targetCar.kilometers
                        );
                        setAnalysis({
                          ...analysis,
                          estimatedPrice: price,
                          priceRange: {
                            low: price - analysis.priceModel.rmse,
                            high: price + analysis.priceModel.rmse,
                          },
                        });
                      }}
                    />
                  </>
                )}
              </div>
            </div>

            <div className={searchMode === 'range' ? 'block' : 'hidden'}>
              <div className="w-full space-y-6">
                <Suspense fallback={<div>Loading search...</div>}>
                  <CarListSearch
                    makes={makes}
                    onViewPriceAnalysis={(data) => {
                      setSearchMode('analysis');
                      handleSearch(data);
                    }}
                    onSearchStateChange={(hasResults) => {
                      setHasRangeResults(hasResults);
                      if (hasResults) setHasSearchedEver(true);
                    }}
                  />
                </Suspense>

                {!hasRangeResults && <RecentListings onViewAnalysis={handleSearch} />}
              </div>
            </div>
          </div>
        </div>

        <div className="lg:col-span-1">
          <div className="sticky top-20 space-y-6">
            <Suspense fallback={<div className="h-64 bg-slate-100 animate-pulse rounded-lg" />}>
              <DailyDealsWithButton onViewPriceAnalysis={handleSearch} />
            </Suspense>
          </div>
        </div>
      </div>
    </main>
  );
}

interface HomeClientProps {
  activeListingCount: number | null;
}

export default function HomeClient({ activeListingCount }: HomeClientProps) {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center">Loading...</div>}>
      <HomeContent activeListingCount={activeListingCount} />
    </Suspense>
  );
}
