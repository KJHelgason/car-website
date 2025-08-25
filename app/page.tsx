'use client';

import { useState, useEffect } from 'react';
import { CarSearchForm } from '@/components/CarSearchForm';
import { PriceAnalysis } from '@/components/PriceAnalysis';
import { CarDeals } from '@/components/CarDeals';
import type { CarPricePoint, CarAnalysis, PriceModel } from '@/types/car';
import type { CarItem } from '@/types/form';
import { supabase } from '@/lib/supabase';

export default function Home() {
  const [analysis, setAnalysis] = useState<CarAnalysis | null>(null);
  const [makes, setMakes] = useState<string[]>([]);

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
        const make = item.make_norm;
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
        const uniqueMakes = [...new Set(listingMakes.map(item => item.make))];
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
      
      // Validate inputs
      if (year === null) {
        return NaN; // Silently return NaN for null years
      }
      
      if (!year || isNaN(parseInt(year))) {
        console.error('Invalid year format:', year);
        return NaN;
      }
      
      if (typeof kilometers !== 'number' || isNaN(kilometers)) {
        console.error('Invalid kilometers value:', kilometers);
        return NaN;
      }
      
      const age = currentYear - parseInt(year);
      const logKm = Math.log(1 + Math.max(0, kilometers)); // Ensure kilometers is not negative
      
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
      // 1. Normalize make and model
      const make_norm = data.make.toLowerCase();
      const model_base = data.model.toLowerCase();

      // 2. Get the price model (try model-specific, then make-specific, then global)
      let priceModels: PriceModel[] | null = null;
      const { data: initialModels, error: modelError } = await supabase
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
      console.log('Found price model:', priceModel);

      // 3. Get similar car listings
      let similarCars = [];
      try {
        // Build the query
        let query = supabase
          .from('car_listings')
          .select('*')
          .ilike('make', make_norm)
          .ilike('model', `%${model_base}%`)
          .not('year', 'is', null); // Only get listings with valid years

        // Add year filter only if a specific year is selected
        if (data.year !== 'all') {
          query = query.eq('year', data.year);
        }

        // Get the listings
        const { data: listings, error } = await query.order('scraped_at', { ascending: false });

        if (error) {
          console.error('Supabase query error:', error);
        }

        similarCars = listings ?? [];
        console.log('Found similar cars:', similarCars.length);
      } catch (error) {
        console.error('Could not fetch similar listings:', error);
      }

      // 4. Calculate estimated price using the regression model
      let price;
      if (data.year === 'all') {
        // If no specific year is selected, use the average year of similar listings
        const validYears = similarCars
          .map(car => car.year)
          .filter(year => year !== null)
          .map(year => parseInt(year));
        const averageYear = Math.round(validYears.reduce((a, b) => a + b, 0) / validYears.length);
        price = calculatePrice(priceModel.coef_json, averageYear.toString(), data.kilometers);
      } else {
        price = calculatePrice(priceModel.coef_json, data.year, data.kilometers);
      }
      
      // Ensure price is a valid number
      if (isNaN(price)) {
        console.error('Price calculation resulted in NaN:', {
          year: data.year,
          kilometers: data.kilometers,
          coefficients: priceModel.coef_json
        });
        return;
      }

      // 5. Calculate price range (±RMSE)
      const priceRange = {
        low: price - priceModel.rmse,
        high: price + priceModel.rmse
      };

      // 6. Get unique years from similar listings and generate curves
      const yearsWithData = [...new Set(similarCars.map(car => car.year))];
      const kmRange: [number, number] = [0, 300000];
      
      // Generate curves only for years we have data for
      const curves: { [year: string]: CarPricePoint[] } = {};
      yearsWithData.forEach(year => {
        const yearCurve = generateCurvePoints(priceModel.coef_json, year, kmRange);
        curves[year] = yearCurve;
      });

      // 7. Format similar listings for display
      const similarListings: CarPricePoint[] = similarCars.map(car => ({
        kilometers: car.kilometers,
        price: car.price,
        name: `${car.make} ${car.model}`,
        year: car.year,
        url: car.url
      }));

      console.log('Similar listings found:', similarCars.length, similarListings);

      // 8. Create target car point
      const targetCar: CarPricePoint = {
        kilometers: data.kilometers,
        price: data.price || price, // Use search price if provided, otherwise use estimated price
        searchPrice: data.price, // Store the search price separately
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
            onYearChange={(year) => {
              if (analysis) {
                // Update the estimated price with the new year
                const price = calculatePrice(analysis.priceModel.coef_json, year.toString(), analysis.targetCar.kilometers);
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
