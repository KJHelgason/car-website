'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { TrendingUp } from 'lucide-react';
import type { CarItem } from '@/types/form';

interface PopularSearchesProps {
  onSearch: (data: CarItem) => void;
}

const popularCars = [
  { make: 'Toyota', model: 'Corolla', year: '2020', display: 'Toyota Corolla' },
  { make: 'Volkswagen', model: 'Golf', year: '2019', display: 'VW Golf' },
  { make: 'Mazda', model: 'CX-5', year: '2021', display: 'Mazda CX-5' },
  { make: 'Hyundai', model: 'Tucson', year: '2020', display: 'Hyundai Tucson' },
  { make: 'Toyota', model: 'RAV4', year: '2019', display: 'Toyota RAV4' },
  { make: 'Honda', model: 'Civic', year: '2020', display: 'Honda Civic' },
  { make: 'Nissan', model: 'Qashqai', year: '2019', display: 'Nissan Qashqai' },
  { make: 'Kia', model: 'Sportage', year: '2020', display: 'Kia Sportage' },
];

export function PopularSearches({ onSearch }: PopularSearchesProps) {
  return (
    <Card className="border shadow-sm gap-0">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg">
          <div className="p-2 bg-orange-100 rounded-lg">
            <TrendingUp className="h-4 w-4 text-orange-600" />
          </div>
          Popular Searches
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-2">
          {popularCars.map((car, index) => (
            <Button
              key={index}
              variant="ghost"
              size="sm"
              onClick={() => 
                onSearch({
                  make: car.make,
                  model: car.model,
                  year: 'all',
                  kilometers: 0,
                  price: 0,
                })
              }
              className="justify-start text-left h-auto py-3 px-4 hover:bg-blue-50 hover:text-blue-700 transition-colors cursor-pointer overflow-hidden"
            >
              <div className="flex items-center gap-2 w-full min-w-0">
                <div className="w-2 h-2 bg-blue-400 rounded-full flex-shrink-0"></div>
                <span className="text-sm font-medium truncate">{car.display}</span>
              </div>
            </Button>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
