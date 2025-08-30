'use client';

import { useState, useEffect } from 'react';
import { CarSearchForm } from '@/components/CarSearchForm';
import { PriceAnalysis } from '@/components/PriceAnalysis';
import { CarDeals } from '@/components/CarDeals';
import { SimilarCarList } from '@/components/SimilarCarList';
import type { CarPricePoint, CarAnalysis, PriceModel } from '@/types/car';
import type { CarItem } from '@/types/form';
import { supabase } from '@/lib/supabase';

// Minimal shape we read from Supabase for car_listings
interface DbCarListing {
  make: string;
  model: string;
  year: string;           // DB returns string; we parse to number where needed
  kilometers: number;
  price: number;
  url: string;
  scraped_at?: string;
}

// Normalize helpers
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

export default function Home() {
  const [analysis, setAnalysis] = useState<CarAnalysis | null>(null);
  const [makes, setMakes] = useState<Array<{ make_norm: string; display_make: string }>>([]);
  const [searchedYear, setSearchedYear] = useState<string | null>(null);

  useEffect(() => {
    fetchMakes();
  }, []);

  const fetchMakes = async () => {
    // Get makes from price_models first
    const { data: modelMakes, error: modelError } = await supabase
      .from('price_models')
      .select('make_norm, display_make')
      .not('make_norm', 'is', null)
      .order('display_make', { ascending: true });

    if (modelError) {
      console.log('Error fetching makes from price_models:', modelError);
      return;
    }

    if (modelMakes && modelMakes.length > 0) {
      // Create unique make entries with both normalized and display values
      const uniqueMakes = [...new Set(modelMakes.map(item => item.make_norm))].map(make_norm => {
        const entry = modelMakes.find(item => item.make_norm === make_norm);
        return {
          make_norm: make_norm,
          display_make: entry?.display_make || make_norm.charAt(0).toUpperCase() + make_norm.slice(1)
        };
      });
      setMakes(uniqueMakes);
    } else {
      // Fallback to car_listings if no makes found in price_models
      const { data: listingMakes, error: listingError } = await supabase
        .from('car_listings')
        .select('make')
        .order('make', { ascending: true });

      if (!listingError && listingMakes) {
        const uniqueMakes = [...new Set(listingMakes.map(item => {
          const make = item.make as string;
          return {
            make_norm: make.toLowerCase(),
            display_make: make
          };
        }))];
        setMakes(uniqueMakes);
      }
    }
  };

  // Helper function to calculate price using regression model
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
        console.error('Invalid year format:', year);
        return NaN;
      }
      if (typeof kilometers !== 'number' || isNaN(kilometers)) {
        console.error('Invalid kilometers value:', kilometers);
        return NaN;
      }

      const age = currentYear - parseInt(year);
      const logKm = Math.log(1 + Math.max(0, kilometers));

      if (!coefficients || typeof coefficients !== 'object') {
        console.error('Invalid coefficients:', coefficients);
        return NaN;
      }

      return coefficients.intercept +
        coefficients.beta_age * age +
        coefficients.beta_logkm * logKm +
        coefficients.beta_age_logkm * (age * logKm);
    } catch (error) {
      console.error('Error calculating price:', error);
      return NaN;
    }
  };

  // Helper function to generate points for the price curve
  const generateCurvePoints = (
    coefficientsJson: string | PriceModel['coef_json'],
    year: string,
    kmRange: [number, number],
    points: number = 50
  ): CarPricePoint[] => {
    const step = (kmRange[1] - kmRange[0]) / (points - 1);
    return Array.from({ length: points }, (_, i) => {
      const km = kmRange[0] + (step * i);
      return {
        kilometers: km,
        price: calculatePrice(coefficientsJson, year, km),
        isCurve: true,
        year: year
      };
    });
  };

  // Pick the best available price model: 2-word → 1-word → make-only → global
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

  // Fetch listings with a model pattern
  const fetchListings = async (make_norm: string, modelPattern: string) => {
    const { data, error } = await supabase
      .from('car_listings')
      .select('*')
      .ilike('make', make_norm)              // case-insensitive exact make
      .ilike('model', `%${modelPattern}%`)   // broad match on model
      .not('year', 'is', null)
      .order('scraped_at', { ascending: false });
    if (error) {
      console.error('Supabase query error:', error);
      return [] as DbCarListing[];
    }
    return (data ?? []) as DbCarListing[];
  };

  const handleSearch = async (data: CarItem) => {
    try {
      setSearchedYear(data.year ?? 'all');

      // Normalize search terms
      const make_norm = data.make.toLowerCase().trim();
      const model_two = normalizeTwoWords(data.model);
      const model_one = normalizeOneWord(data.model);

      // Choose a price model (try two-word, then one-word, then make-only, then global)
      const priceModel = await pickPriceModel(make_norm, model_two, model_one);
      if (!priceModel) {
        console.error('No price models found');
        return;
      }

      // Fetch listings: start with two-word; if too few, broaden to one-word
      let similarCars = await fetchListings(make_norm, model_two);
      const MIN_RESULTS = 20;     // threshold to broaden
      if (similarCars.length < MIN_RESULTS && model_one && model_one !== model_two) {
        const broader = await fetchListings(make_norm, model_one);
        if (broader.length > similarCars.length) {
          similarCars = broader;
        }
      }

      // Calculate estimated price using the regression model
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
        console.error('Price calculation resulted in NaN:', {
          year: data.year,
          kilometers: data.kilometers,
          coefficients: priceModel.coef_json
        });
        return;
      }

      // Price range (±RMSE)
      const priceRange = {
        low: price - priceModel.rmse,
        high: price + priceModel.rmse
      };

      // Curves for years we have data for
      const yearsWithData = [...new Set(similarCars.map((car) => car.year))];
      const kmRange: [number, number] = [0, 300000];
      const curves: { [year: string]: CarPricePoint[] } = {};
      yearsWithData.forEach((year) => {
        if (year) {
          const yearCurve = generateCurvePoints(priceModel.coef_json, year, kmRange);
          curves[year] = yearCurve;
        }
      });

      // Format similar listings
      const similarListings: CarPricePoint[] = similarCars.map((car) => ({
        kilometers: car.kilometers,
        price: car.price,
        name: `${car.make} ${car.model}`,
        year: car.year,
        url: car.url
      }));

      // Target car point
      const targetCar: CarPricePoint = {
        kilometers: data.kilometers,
        price: data.price || price,
        searchPrice: data.price,
        isTarget: true,
        name: `${data.make} ${data.model}`,
        year: data.year === 'all' ? undefined : data.year
      };

      setAnalysis({
        targetCar,
        similarListings,
        priceCurves: curves,
        priceModel,
        estimatedPrice: price,
        priceRange
      });

    } catch (error) {
      console.error('Unexpected error:', error);
    }
  };

  return (
    <main className="container mx-auto p-4">
      <h1 className="text-4xl font-bold mb-8 text-center">Car Price Analysis</h1>

      <div className="flex flex-col lg:flex-row gap-8 min-h-[calc(100vh-8rem)]">
        <div className="lg:w-1/2 space-y-4">
          <CarSearchForm
            onSearch={handleSearch}
            makes={makes}
          />
          <CarDeals onViewPriceAnalysis={handleSearch} />
          {analysis && (
            <PriceAnalysis
              analysis={analysis}
              searchedYear={searchedYear}
              onYearChange={(year) => {
                if (analysis) {
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
                      high: price + analysis.priceModel.rmse
                    }
                  });
                }
              }}
            />
          )}
        </div>

        <div className="lg:w-1/2 h-full">
          {analysis && (
            <SimilarCarList
              analysis={analysis}
              searchedYear={searchedYear}
              onYearChange={(year) => {
                if (analysis) {
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
                      high: price + analysis.priceModel.rmse
                    }
                  });
                }
              }}
            />
          )}
        </div>

      </div>
    </main>
  );
}