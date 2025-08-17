import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { supabase } from '@/lib/supabase';

interface CarDeal {
  id: number;
  make: string;
  model: string;
  year: number | null;
  kilometers: number | null;
  price: number;
  url?: string;
  estimated_price?: number;
  price_difference_percent?: number;
}

export function CarDeals() {
  const [showDeals, setShowDeals] = useState(false);
  const [cheapestCars, setCheapestCars] = useState<CarDeal[]>([]);
  const [bestDeals, setBestDeals] = useState<CarDeal[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('is-IS', {
      style: 'currency',
      currency: 'ISK',
      maximumFractionDigits: 0
    }).format(price);
  };

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

  const fetchDeals = async () => {
    setIsLoading(true);
    try {
      // Fetch the 50 cheapest cars
      const { data: cheapestData, error: cheapestError } = await supabase
        .from('car_listings')
        .select('*')
        .order('price', { ascending: true })
        .limit(50);

      if (cheapestError) throw cheapestError;

      // Fetch price models to calculate estimated prices
      const { data: priceModels, error: modelError } = await supabase
        .from('price_models')
        .select('*');

      if (modelError) throw modelError;

      // Fetch more cars to ensure we get enough valid deals after calculations
      const { data: dealsData, error: dealsError } = await supabase
        .from('car_listings')
        .select('*')
        .order('scraped_at', { ascending: false })
        .limit(200);

      if (dealsError) throw dealsError;

      // Calculate estimated prices and find best deals
      const dealsWithEstimates = dealsData
        .filter((car): car is CarDeal & { year: number; kilometers: number } => 
          // Filter out any cars with missing required data
          car !== null && 
          typeof car.year === 'number' && 
          typeof car.kilometers === 'number' &&
          typeof car.make === 'string' &&
          typeof car.model === 'string'
        )
        .map((car) => {
          // Find the most specific price model
          let priceModel = priceModels.find(pm => 
            pm?.make_norm === car.make.toLowerCase() && pm?.model_base === car.model.toLowerCase()
          ) || priceModels.find(pm => 
            pm?.make_norm === car.make.toLowerCase() && !pm?.model_base
          ) || priceModels.find(pm => 
            !pm?.make_norm && !pm?.model_base
          );

          if (!priceModel || !priceModel.coef_json) return car;

          let estimated_price = calculatePrice(
            priceModel.coef_json,
            car.year.toString(),
            car.kilometers
          );

          // Ensure we don't have negative or unreasonably low estimated prices
          estimated_price = Math.max(estimated_price, car.price * 0.1); // Set minimum estimated price to 10% of actual price

          // Calculate how much cheaper the actual price is compared to estimated
          const price_difference_percent = ((estimated_price - car.price) / estimated_price) * 100;

          // Only consider it a deal if the car is cheaper than estimated and the difference makes sense
          if (price_difference_percent <= 0 || price_difference_percent > 100) return car;

          return {
            ...car,
            estimated_price,
            price_difference_percent
          };
        });

      // Sort by price difference and get top 25 deals
      const bestDealsData = dealsWithEstimates
        .filter(car => car.estimated_price && car.price_difference_percent)
        .sort((a, b) => (b.price_difference_percent || 0) - (a.price_difference_percent || 0))
        .slice(0, 50);

      setCheapestCars(cheapestData);
      setBestDeals(bestDealsData);
      setShowDeals(true);
    } catch (error) {
      console.error('Error fetching deals:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      <Button 
        variant="outline" 
        onClick={fetchDeals}
        className="w-full"
      >
        {isLoading ? 'Loading Deals...' : 'Find Deals'}
      </Button>

      <Dialog open={showDeals} onOpenChange={setShowDeals}>
        <DialogContent className="max-w-3xl h-[80vh] flex flex-col p-0">
          <DialogHeader className="px-6 py-4">
            <DialogTitle>Car Deals</DialogTitle>
          </DialogHeader>
          
          <Tabs defaultValue="best-deals" className="flex-1 flex flex-col overflow-hidden">
            <TabsList className="grid w-full grid-cols-2 px-2">
              <TabsTrigger value="best-deals">Best Value Deals</TabsTrigger>
              <TabsTrigger value="cheapest">Cheapest Cars</TabsTrigger>
            </TabsList>
            
            <TabsContent value="best-deals" className="flex-1 overflow-auto px-6">
              <div className="space-y-4 py-4">
                {bestDeals.map((car) => (
                  <Card key={car.id} className="hover:bg-gray-50">
                    <CardContent className="p-4">
                      <div className="flex justify-between items-start gap-4">
                        <div>
                          <h4 className="font-semibold">{car.year || 'Unknown'} {car.make} {car.model}</h4>
                          <p className="text-sm text-gray-600">{car.kilometers ? `${car.kilometers.toLocaleString()} km` : 'Unknown km'}</p>
                        </div>
                        <div className="text-right">
                          <p className="font-bold text-lg">{formatPrice(car.price)}</p>
                          {car.price_difference_percent !== undefined && (
                            <p className="text-sm text-green-600">
                              {car.price_difference_percent.toFixed(1)}% below estimate
                            </p>
                          )}
                          {car.estimated_price !== undefined && (
                            <p className="text-xs text-gray-500">
                              Est: {formatPrice(car.estimated_price)}
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
              </div>
            </TabsContent>

            <TabsContent value="cheapest" className="flex-1 overflow-auto px-6">
              <div className="space-y-4 py-4">
                {cheapestCars.map((car) => (
                  <Card key={car.id} className="hover:bg-gray-50">
                    <CardContent className="p-4">
                      <div className="flex justify-between items-start gap-4">
                        <div>
                          <h4 className="font-semibold">{car.year || 'Unknown'} {car.make} {car.model}</h4>
                          <p className="text-sm text-gray-600">{car.kilometers ? `${car.kilometers.toLocaleString()} km` : 'Unknown km'}</p>
                        </div>
                        <div className="text-right">
                          <p className="font-bold text-lg">
                            {formatPrice(car.price)}
                          </p>
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
              </div>
            </TabsContent>
          </Tabs>
        </DialogContent>
      </Dialog>
    </>
  );
}