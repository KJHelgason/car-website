'use client';

import { useState, useEffect } from 'react';
import { CarSearchForm } from '@/components/CarSearchForm';
import { PriceAnalysis } from '@/components/PriceAnalysis';
import { CarDeals } from '@/components/CarDeals';
import type { PriceModel, CarListing, CarPricePoint, CarAnalysis } from '@/types/car';
import type { CarItem } from '@/types/form';
import { supabase } from '@/lib/supabase';

export default function Home() {
  const [analysis, setAnalysis] = useState<CarAnalysis | null>(null);
  const [makes, setMakes] = useState<string[]>([]);
  // Models are now managed by the CarSearchForm component

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

  // Models are now fetched directly in the CarSearchForm component

  // Helper function to calculate price using regression model
  const calculatePrice = (
    coefficientsJson: string,
    year: string,
    kilometers: number
  ) => {
    const coefficients = JSON.parse(coefficientsJson);
    const currentYear = new Date().getFullYear();
    const age = currentYear - parseInt(year);
    const logKm = Math.log(1 + kilometers);
    
    return coefficients.intercept +
           coefficients.beta_age * age +
           coefficients.beta_logkm * logKm +
           coefficients.beta_age_logkm * (age * logKm);
  };

  // Helper function to generate points for the price curve
  const generateCurvePoints = (
    coefficientsJson: string,
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
        isCurve: true
      };
    });
  };

  const handleSearch = async (data: CarItem) => {
    try {
      // 1. Normalize make and model
      const make_norm = data.make.toLowerCase();
      const model_base = data.model.toLowerCase();

      // 2. Get the price model (try model-specific, then make-specific, then global)
      // Try to get model-specific first
      let { data: priceModels, error: modelError } = await supabase
        .from('price_models')
        .select('*')
        .eq('make_norm', make_norm)
        .eq('model_base', model_base)
        .limit(1);

      // If no model-specific, try make-specific
      if (!priceModels || priceModels.length === 0) {
        const { data: makeModels, error } = await supabase
          .from('price_models')
          .select('*')
          .eq('make_norm', make_norm)
          .is('model_base', null)
          .limit(1);
        
        if (!error) {
          priceModels = makeModels;
        }
      }

      // If still nothing, get global model
      if (!priceModels || priceModels.length === 0) {
        const { data: globalModel, error } = await supabase
          .from('price_models')
          .select('*')
          .is('make_norm', null)
          .is('model_base', null)
          .limit(1);
        
        if (!error) {
          priceModels = globalModel;
        }
      }

      if (!priceModels || priceModels.length === 0) {
        console.error('No price models found');
        return;
      }

      if (modelError || !priceModels || priceModels.length === 0) {
        console.error('Error fetching price model:', modelError);
        return;
      }

      const priceModel = priceModels[0];
      console.log('Found price model:', priceModel);

      // Parse the coefficients JSON string into an object
      const currentYear = new Date().getFullYear();
      const age = currentYear - parseInt(data.year);
      const logKm = Math.log(1 + data.kilometers);
      
      console.log('Input values:', {
        make: data.make,
        model: data.model,
        year: data.year,
        kilometers: data.kilometers,
        age,
        logKm
      });

      const coefficients = typeof priceModel.coef_json === 'string' 
        ? JSON.parse(priceModel.coef_json)
        : priceModel.coef_json;
      
      console.log('Parsed coefficients:', coefficients);

      // Calculate price components for debugging
      const basePrice = coefficients.intercept;
      const ageEffect = coefficients.beta_age * age;
      const kmEffect = coefficients.beta_logkm * logKm;
      const interactionEffect = coefficients.beta_age_logkm * (age * logKm);

      const calculatedPrice = basePrice + ageEffect + kmEffect + interactionEffect;
      
      // 3. Get similar car listings
      let similarCars = [];
      try {
        // Convert search terms to match database format
        const searchMake = data.make.toLowerCase();
        const searchModel = data.model.split(' ')[0].toLowerCase(); // First word of model
        
        console.log('Search parameters:', {
          make: searchMake,
          model: searchModel,
          year: data.year,
          make_original: data.make,
          model_original: data.model
        });
        
        // First, let's just get all cars with matching make to verify
        const { data: allListings } = await supabase
          .from('car_listings')
          .select('*')
          .ilike('make', searchMake)
          .order('scraped_at', { ascending: false });
        
        console.log('All cars with matching make:', allListings?.length, 'cars');
        if (allListings && allListings.length > 0) {
          console.log('Sample car:', {
            make: allListings[0].make,
            model: allListings[0].model,
            year: allListings[0].year
          });
        }

        // Now get cars with matching make, similar model, and same year
        const { data: listings, error } = await supabase
          .from('car_listings')
          .select('*')
          .ilike('make', searchMake)
          .ilike('model', `%${searchModel}%`)
          .eq('year', data.year)
          .order('scraped_at', { ascending: false });

        if (error) {
          console.error('Supabase query error:', error);
        }

        similarCars = listings ?? [];
        console.log('Found similar cars:', similarCars.length);
        if (similarCars.length > 0) {
          console.log('First similar car:', {
            make: similarCars[0].make,
            make_norm: similarCars[0].make_norm,
            model: similarCars[0].model,
            model_base: similarCars[0].model_base,
            year: similarCars[0].year
          });
        }
      } catch (error) {
        console.error('Could not fetch similar listings:', error);
      }

      console.log('Price components:', {
        basePrice,
        ageEffect,
        kmEffect,
        interactionEffect,
        total: calculatedPrice,
        similarCarsFound: similarCars.length
      });

      // 4. Calculate estimated price using the regression model
      const price = calculatePrice(priceModel.coef_json, data.year, data.kilometers);

      // 5. Calculate price range (±RMSE)
      const priceRange = {
        low: price - priceModel.rmse,
        high: price + priceModel.rmse
      };

      // 6. Generate curve points
      const kmRange: [number, number] = [0, 300000];
      const priceCurve = generateCurvePoints(priceModel.coef_json, data.year, kmRange);

      // 7. Format similar listings for display (if any)
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
        year: data.year
      };

      setAnalysis({
        targetCar,
        similarListings,
        priceCurve,
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
          <PriceAnalysis analysis={analysis} />
        )}
      </div>
    </main>
  );
}