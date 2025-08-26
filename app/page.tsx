'use client';

import { useState, useEffect } from 'react';
import { CarSearchForm } from '@/components/CarSearchForm';
import { PriceAnalysis } from '@/components/PriceAnalysis';
import { CarDeals } from '@/components/CarDeals';
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

export default function Home() {
  const [analysis, setAnalysis] = useState<CarAnalysis | null>(null);
  const [makes, setMakes] = useState<string[]>([]);
  const [searchedYear, setSearchedYear] = useState<string | null>(null);

  useEffect(() => {
    fetchMakes();
  }, []);

  const fetchMakes = async () => {
    // Get makes from price_models first
    const { data: modelMakes, error: modelError } = await supabase
      .from('price_models')
      .select('make_norm')
      .not('make_norm', 'is', null)
      .order('make_norm', { ascending: true });
    
    if (modelError) {
      console.log('Error fetching makes from price_models:', modelError);
      return;
    }

    if (modelMakes && modelMakes.length > 0) {
      // Capitalize first letter of each make
      const formattedMakes = [...new Set(modelMakes.map(item => {
        const make = item.make_norm as string;
        return make.charAt(0).toUpperCase() + make.slice(1);
      }))];
      setMakes(formattedMakes);
    } else {
      // Fallback to car_listings if no makes found in price_models
      const { data: listingMakes, error: listingError } = await supabase
        .from('car_listings')
        .select('make')
        .order('make', { ascending: true });
      
      if (!listingError && listingMakes) {
        const uniqueMakes = [...new Set(listingMakes.map(item => item.make as string))];
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

  const handleSearch = async (data: CarItem) => {
    try {
      setSearchedYear(data.year ?? 'all');

      // 1. Normalize make and model
      const make_norm = data.make.toLowerCase();
      const model_base = data.model.toLowerCase();

      // 2. Get the price model (try model-specific, then make-specific, then global)
      let priceModels: PriceModel[] | null = null;
      const { data: initialModels } = await supabase
        .from('price_models')
        .select('*')
        .eq('make_norm', make_norm)
        .eq('model_base', model_base)
        .limit(1);

      if (!initialModels || initialModels.length === 0) {
        const { data: makeModels } = await supabase
          .from('price_models')
          .select('*')
          .eq('make_norm', make_norm)
          .is('model_base', null)
          .limit(1);

        if (!makeModels || makeModels.length === 0) {
          const { data: globalModel } = await supabase
            .from('price_models')
            .select('*')
            .is('make_norm', null)
            .is('model_base', null)
            .limit(1);
          
          priceModels = globalModel;
        } else {
          priceModels = makeModels;
        }
      } else {
        priceModels = initialModels;
      }

      if (!priceModels || priceModels.length === 0) {
        console.error('No price models found');
        return;
      }

      const priceModel = priceModels[0];

      // 3. Get similar car listings (⚠️ do NOT filter by year; let UI decide)
      let similarCars: DbCarListing[] = [];
      try {
        const query = supabase
          .from('car_listings')
          .select('*')
          .ilike('make', make_norm)
          .ilike('model', `%${model_base}%`)
          .not('year', 'is', null); // Only valid years

        const { data: listings, error } = await query.order('scraped_at', { ascending: false });
        if (error) console.error('Supabase query error:', error);

        similarCars = (listings ?? []) as DbCarListing[];
      } catch (error) {
        console.error('Could not fetch similar listings:', error);
      }

      // 4. Calculate estimated price using the regression model
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

      // 5. Price range (±RMSE)
      const priceRange = {
        low: price - priceModel.rmse,
        high: price + priceModel.rmse
      };

      // 6. Curves for years we have data for
      const yearsWithData = [...new Set(similarCars.map((car) => car.year))];
      const kmRange: [number, number] = [0, 300000];
      const curves: { [year: string]: CarPricePoint[] } = {};
      yearsWithData.forEach((year) => {
        if (year) {
          const yearCurve = generateCurvePoints(priceModel.coef_json, year, kmRange);
          curves[year] = yearCurve;
        }
      });

      // 7. Format similar listings
      const similarListings: CarPricePoint[] = similarCars.map((car) => ({
        kilometers: car.kilometers,
        price: car.price,
        name: `${car.make} ${car.model}`,
        year: car.year,
        url: car.url
      }));

      // 8. Target car point
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
      
      <div className="grid md:grid-cols-2 gap-8">
        <div className="space-y-4">
          <CarSearchForm 
            onSearch={handleSearch}
            makes={makes}
          />
          <CarDeals />
        </div>
        
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
    </main>
  );
}
