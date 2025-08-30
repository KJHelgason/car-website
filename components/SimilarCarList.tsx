import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useState, useEffect } from 'react';
import type { CarAnalysis } from '@/types/car';
import { Button } from '@/components/ui/button';
import { ArrowDownAZ, ArrowUpAZ, ArrowDownNarrowWide, ArrowUpNarrowWide } from 'lucide-react';

type ExtendedCarPricePoint = {
  kilometers: number;
  price: number;
  name?: string;
  url?: string;
  year?: string;
  isTarget?: boolean;
  priceDifference?: number;
  searchPrice?: number;
  isCurve?: boolean;
  yearRange?: string;
}

interface SimilarCarListProps {
  analysis: CarAnalysis;
  onYearChange?: (year: number) => void;
  searchedYear?: string | null;
}

export function SimilarCarList({ analysis, onYearChange, searchedYear }: SimilarCarListProps) {
  const { similarListings } = analysis;
  const [selectedYear, setSelectedYear] = useState<number | null>(null);
  const [availableYears, setAvailableYears] = useState<number[]>([]);
  const [filteredListings, setFilteredListings] = useState<ExtendedCarPricePoint[]>([]);
  const [sortBy, setSortBy] = useState<'value' | 'price'>('value');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [displayLimit, setDisplayLimit] = useState(10);

  // Format price for display
  const formatPrice = (price: number) => {
    if (!price || isNaN(price)) return 'N/A';
    return new Intl.NumberFormat('is-IS', {
      style: 'currency',
      currency: 'ISK',
      maximumFractionDigits: 0
    }).format(price);
  };

  // Get available years from similar listings and count cars per year
  useEffect(() => {
    // Count cars per year
    const yearCounts = similarListings.reduce((acc, listing) => {
      if (listing.year) {
        const year = parseInt(listing.year);
        acc[year] = (acc[year] || 0) + 1;
      }
      return acc;
    }, {} as Record<number, number>);

    // Get unique years and sort by year (descending)
    const years = Object.entries(yearCounts)
      .sort(([yearA, countA], [yearB, countB]) => {
        return parseInt(yearB) - parseInt(yearA); // Sort by year descending
      })
      .map(([year]) => parseInt(year));

    setAvailableYears(years);
    
    // Find the year with the most results
    if (years.length > 0) {
      const yearWithMostResults = Object.entries(yearCounts)
        .reduce((max, [year, count]) => {
          if (count > yearCounts[max]) {
            return parseInt(year);
          }
          return max;
        }, years[0]);
      setSelectedYear(yearWithMostResults);
    }
  }, [similarListings]);

  // Filter and sort listings when year changes
  useEffect(() => {
    let filtered: ExtendedCarPricePoint[] = [...similarListings].map(listing => ({ ...listing }));

    // Filter by selected year if any
    if (selectedYear) {
      filtered = filtered.filter(listing => {
        const listingYear = listing.year ? parseInt(listing.year) : null;
        return listingYear === selectedYear;
      });
    }

    // Calculate price differences based on the regression model for each car
    filtered = filtered.map(listing => {
      if (!listing.year || !analysis.priceModel.coef_json || !listing.kilometers) {
        return { ...listing, priceDifference: 0 } as ExtendedCarPricePoint;
      }

      // Calculate expected price for this specific car using the regression model
      const coefficients = typeof analysis.priceModel.coef_json === 'string' 
        ? JSON.parse(analysis.priceModel.coef_json) 
        : analysis.priceModel.coef_json;
      
      const currentYear = new Date().getFullYear();
      const age = currentYear - parseInt(listing.year);
      const logKm = Math.log(1 + Math.max(0, listing.kilometers));
      
      const expectedPrice = coefficients.intercept +
        coefficients.beta_age * age +
        coefficients.beta_logkm * logKm +
        coefficients.beta_age_logkm * (age * logKm);

      // Calculate how much cheaper/more expensive this car is compared to its expected price
      const priceDiff = expectedPrice ? ((expectedPrice - listing.price) / expectedPrice) * 100 : 0;
      
      return {
        ...listing,
        priceDifference: priceDiff
      };
    }) as ExtendedCarPricePoint[];
    
    // Sort based on current sort settings
    filtered.sort((a, b) => {
      const multiplier = sortOrder === 'desc' ? 1 : -1;
      
      if (sortBy === 'value') {
        return ((b.priceDifference || 0) - (a.priceDifference || 0)) * multiplier;
      } else {
        return (b.price - a.price) * multiplier;
      }
    });

    setFilteredListings(filtered);
    // Reset display limit when filters change
    setDisplayLimit(10);
  }, [selectedYear, similarListings, analysis.estimatedPrice, sortBy, sortOrder, analysis.priceModel.coef_json]);

  return (
    <Card className="w-full h-full flex flex-col">
      <CardHeader className="flex flex-row items-center justify-between flex-shrink-0">
        <div className="flex items-center gap-4">
          <CardTitle>Similar Cars</CardTitle>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                if (sortBy === 'value') {
                  setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
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
                  setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
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
            if (onYearChange) {
              onYearChange(newYear);
            }
          }}
        >
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Select Year" />
          </SelectTrigger>
          <SelectContent>
            <SelectGroup>
              {availableYears.map((year) => {
                // Count cars for this year
                const count = similarListings.filter(listing => {
                  const listingYear = listing.year ? parseInt(listing.year) : null;
                  return listingYear === year;
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
          {filteredListings.slice(0, displayLimit).map((car, index) => (
            <Card key={index} className="hover:bg-gray-50">
              <CardContent className="p-4">
                <div className="flex justify-between items-start gap-4">
                  <div>
                    <h4 className="font-semibold">{car.name}</h4>
                    <p className="text-sm text-gray-600">
                      {car.kilometers ? car.kilometers.toLocaleString() : 'Unknown'} km
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-lg">{formatPrice(car.price)}</p>
                    {car.priceDifference !== undefined && (
                      <p className={car.priceDifference > 0 ? "text-sm text-green-600" : "text-sm text-red-600"}>
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
                onClick={() => setDisplayLimit(prev => prev + 10)}
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