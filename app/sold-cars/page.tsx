'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { supabase } from '@/lib/supabase';
import { TrendingDown, DollarSign, Package, BarChart3 } from 'lucide-react';

interface SoldCar {
  make: string;
  model: string;
  year: number;
  price: number;
  kilometers: number | null;
  url: string | null;
  image_url?: string | null;
  scraped_at: string;
}

interface SoldCarStats {
  totalSold: number;
  averagePrice: number;
  mostPopularMake: string;
  mostPopularModel: string;
}

export default function SoldCarsPage() {
  const [soldCars, setSoldCars] = useState<SoldCar[]>([]);
  const [stats, setStats] = useState<SoldCarStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [visibleCount, setVisibleCount] = useState(50);
  const [timePeriod, setTimePeriod] = useState<'daily' | 'weekly' | 'monthly'>('weekly');

  useEffect(() => {
    fetchSoldCars();
  }, []);

  const fetchSoldCars = async () => {
    setLoading(true);
    try {
      // Fetch cars marked as inactive (sold) with count
      const { data, error, count } = await supabase
        .from('car_listings')
        .select('make, model, year, price, kilometers, url, image_url, scraped_at', { count: 'exact' })
        .eq('is_active', false)
        .not('make', 'is', null)
        .not('model', 'is', null)
        .not('year', 'is', null)
        .not('price', 'is', null)
        .order('scraped_at', { ascending: false })
        .limit(1000);

      if (error) throw error;

      const soldCarsData = (data || []) as SoldCar[];
      setSoldCars(soldCarsData);

      // Calculate statistics
      if (soldCarsData.length > 0) {
        const totalSold = count || soldCarsData.length; // Use the actual count from database
        const averagePrice = soldCarsData.reduce((sum, car) => sum + car.price, 0) / soldCarsData.length;

        // Find most popular make and model
        const makeCounts = soldCarsData.reduce((acc, car) => {
          acc[car.make] = (acc[car.make] || 0) + 1;
          return acc;
        }, {} as Record<string, number>);

        const modelCounts = soldCarsData.reduce((acc, car) => {
          const key = `${car.make} ${car.model}`;
          acc[key] = (acc[key] || 0) + 1;
          return acc;
        }, {} as Record<string, number>);

        const mostPopularMake = Object.entries(makeCounts).sort(([, a], [, b]) => b - a)[0]?.[0] || 'N/A';
        const mostPopularModel = Object.entries(modelCounts).sort(([, a], [, b]) => b - a)[0]?.[0] || 'N/A';

        setStats({
          totalSold,
          averagePrice,
          mostPopularMake,
          mostPopularModel,
        });
      }
    } catch (error) {
      console.error('Error fetching sold cars:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatPrice = (price: number) =>
    new Intl.NumberFormat('is-IS', {
      style: 'currency',
      currency: 'ISK',
      maximumFractionDigits: 0,
    }).format(price);

  const formatDate = (dateStr: string | undefined) => {
    if (!dateStr) return 'Unknown';
    return new Date(dateStr).toLocaleDateString();
  };

  const loadMore = () => {
    setVisibleCount(prev => Math.min(prev + 50, soldCars.length));
  };

  if (loading) {
    return (
      <main className="container mx-auto p-4">
        <div className="space-y-6">
          <div className="h-10 bg-slate-200 animate-pulse rounded w-64" />
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-32 bg-slate-100 animate-pulse rounded-lg" />
            ))}
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="container mx-auto p-4">
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold text-slate-900 flex items-center gap-3">
            <TrendingDown className="h-8 w-8 text-red-600" />
            Sold Cars
          </h1>
          <p className="text-slate-600 mt-2">
            Historical data on cars that have been sold or are no longer listed
          </p>
        </div>

        {/* Statistics Cards */}
        {stats && (
          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-3 gap-4">
            <Card className="gap-0">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-slate-600 flex items-center gap-2">
                  <Package className="h-4 w-4" />
                  Total Sold
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.totalSold.toLocaleString()}</div>
              </CardContent>
            </Card>

            <Card className="gap-0">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-slate-600 flex items-center gap-2">
                  <DollarSign className="h-4 w-4" />
                  Average Price
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{formatPrice(stats.averagePrice)}</div>
              </CardContent>
            </Card>

            <Card className="gap-0">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-slate-600 flex items-center gap-2">
                  <TrendingDown className="h-4 w-4" />
                  Most Popular
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-sm font-bold">{stats.mostPopularModel}</div>
                <p className="text-xs text-slate-500 mt-1">{stats.mostPopularMake}</p>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Weekly Sales Trend */}
        {soldCars.length > 0 && (
          <Card className="pb-0">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <TrendingDown className="h-5 w-5" />
                  Cars Sold Over Time
                </CardTitle>
                <div className="flex gap-1 bg-slate-100 rounded-lg p-1">
                  <button
                    onClick={() => setTimePeriod('daily')}
                    className={`px-3 py-1 text-sm rounded-md transition-colors ${
                      timePeriod === 'daily'
                        ? 'bg-white text-slate-900 shadow-sm font-medium'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    Daily
                  </button>
                  <button
                    onClick={() => setTimePeriod('weekly')}
                    className={`px-3 py-1 text-sm rounded-md transition-colors ${
                      timePeriod === 'weekly'
                        ? 'bg-white text-slate-900 shadow-sm font-medium'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    Weekly
                  </button>
                  <button
                    onClick={() => setTimePeriod('monthly')}
                    className={`px-3 py-1 text-sm rounded-md transition-colors ${
                      timePeriod === 'monthly'
                        ? 'bg-white text-slate-900 shadow-sm font-medium'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    Monthly
                  </button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="relative pt-2">
                {(() => {
                  // Group cars by time period
                  const timeData = soldCars.reduce((acc, car) => {
                    if (car.scraped_at) {
                      const date = new Date(car.scraped_at);
                      let timeKey: string;
                      
                      if (timePeriod === 'daily') {
                        // Group by day
                        date.setHours(0, 0, 0, 0);
                        timeKey = date.toISOString().split('T')[0];
                      } else if (timePeriod === 'weekly') {
                        // Group by week (Sunday start)
                        const weekStart = new Date(date);
                        weekStart.setDate(date.getDate() - date.getDay());
                        weekStart.setHours(0, 0, 0, 0);
                        timeKey = weekStart.toISOString().split('T')[0];
                      } else {
                        // Group by month
                        timeKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-01`;
                      }
                      
                      acc[timeKey] = (acc[timeKey] || 0) + 1;
                    }
                    return acc;
                  }, {} as Record<string, number>);

                  // Sort by date and get data points (last 12)
                  const sortedData = Object.entries(timeData)
                    .sort(([a], [b]) => a.localeCompare(b))
                    .slice(-12);

                  if (sortedData.length === 0) return null;

                  const maxCount = Math.max(...sortedData.map(([, count]) => count), 1);
                  const padding = 0.05; // 5% padding on each side
                  const usableWidth = 1 - (padding * 2);

                  return (
                    <>
                      {/* Chart area */}
                      <div className="h-40 relative">
                        <svg className="w-full h-full" viewBox="0 0 1000 160" preserveAspectRatio="none">
                          {/* Line path */}
                          <polyline
                            points={sortedData.map(([, count], index) => {
                              const x = padding * 1000 + (index / Math.max(sortedData.length - 1, 1)) * usableWidth * 1000;
                              const y = 150 - (count / maxCount) * 140; // Leave 10px padding top, 10px bottom
                              return `${x},${y}`;
                            }).join(' ')}
                            fill="none"
                            stroke="rgb(37, 99, 235)"
                            strokeWidth="3"
                            className="transition-all duration-700"
                          />
                          
                          {/* Data points */}
                          {sortedData.map(([dateKey, count], index) => {
                            const x = padding * 1000 + (index / Math.max(sortedData.length - 1, 1)) * usableWidth * 1000;
                            const y = 150 - (count / maxCount) * 140;
                            
                            return (
                              <g key={dateKey}>
                                <circle
                                  cx={x}
                                  cy={y}
                                  r="5"
                                  fill="rgb(37, 99, 235)"
                                  className="transition-all duration-700"
                                />
                              </g>
                            );
                          })}
                        </svg>
                        
                        {/* Count labels above points */}
                        <div className="absolute inset-0 pointer-events-none">
                          {sortedData.map(([dateKey, count], index) => {
                            const xPercent = (padding + (index / Math.max(sortedData.length - 1, 1)) * usableWidth) * 100;
                            const yPercent = ((150 - (count / maxCount) * 140) / 160) * 100;
                            
                            return (
                              <div
                                key={dateKey}
                                className="absolute text-xs font-semibold text-slate-700"
                                style={{
                                  left: `${xPercent}%`,
                                  top: `${yPercent}%`,
                                  transform: 'translate(-50%, -150%)'
                                }}
                              >
                                {count}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                      
                      {/* Bottom border line above dates */}
                      <div className="border-t border-slate-300 mt-2"></div>
                      
                      {/* X-axis date labels aligned with points */}
                      <div className="relative h-12 mt-2">
                        {sortedData.map(([dateKey], index) => {
                          const xPercent = (padding + (index / Math.max(sortedData.length - 1, 1)) * usableWidth) * 100;
                          const date = new Date(dateKey);
                          
                          let formattedLabel = '';
                          if (timePeriod === 'daily') {
                            formattedLabel = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
                          } else if (timePeriod === 'weekly') {
                            formattedLabel = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
                          } else {
                            formattedLabel = date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
                          }
                          
                          return (
                            <div
                              key={dateKey}
                              className="absolute text-xs text-slate-600 whitespace-nowrap"
                              style={{
                                left: `${xPercent}%`,
                                transform: 'translateX(-50%)'
                              }}
                            >
                              {formattedLabel}
                            </div>
                          );
                        })}
                      </div>
                    </>
                  );
                })()}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Visualizations */}
        {soldCars.length > 0 && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Top Selling Makes */}
            <Card className="flex flex-col">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BarChart3 className="h-5 w-5" />
                  Top Selling Makes
                </CardTitle>
              </CardHeader>
              <CardContent className="flex-1 flex flex-col justify-end">
                <div className="space-y-3">
                  {Object.entries(
                    soldCars.reduce((acc, car) => {
                      acc[car.make] = (acc[car.make] || 0) + 1;
                      return acc;
                    }, {} as Record<string, number>)
                  )
                    .sort(([, a], [, b]) => b - a)
                    .slice(0, 10)
                    .map(([make, count], index) => {
                      const maxCount = Object.values(
                        soldCars.reduce((acc, car) => {
                          acc[car.make] = (acc[car.make] || 0) + 1;
                          return acc;
                        }, {} as Record<string, number>)
                      ).reduce((a, b) => Math.max(a, b), 0);
                      const percentage = (count / maxCount) * 100;
                      
                      return (
                        <div key={make} className="space-y-1">
                          <div className="flex items-center justify-between text-sm">
                            <span className="font-medium flex items-center gap-2">
                              <span className="text-slate-500 w-6">{index + 1}.</span>
                              {make}
                            </span>
                            <span className="text-slate-600 font-semibold">{count}</span>
                          </div>
                          <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                            <div
                              className="bg-blue-600 h-full rounded-full transition-all duration-500"
                              style={{ width: `${percentage}%` }}
                            />
                          </div>
                        </div>
                      );
                    })}
                </div>
              </CardContent>
            </Card>

            {/* Price Distribution */}
            <Card className="flex flex-col">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <DollarSign className="h-5 w-5" />
                  Price Distribution
                </CardTitle>
              </CardHeader>
              <CardContent className="flex-1 flex flex-col justify-end">
                <div className="relative pt-6 pl-12 pb-4">
                  {(() => {
                    const ranges = [
                      { label: '<1M', shortLabel: '<1M', min: 0, max: 1000000 },
                      { label: '1M-2M', shortLabel: '1-2M', min: 1000000, max: 2000000 },
                      { label: '2M-3M', shortLabel: '2-3M', min: 2000000, max: 3000000 },
                      { label: '3M-4M', shortLabel: '3-4M', min: 3000000, max: 4000000 },
                      { label: '4M-5M', shortLabel: '4-5M', min: 4000000, max: 5000000 },
                      { label: '5M-7M', shortLabel: '5-7M', min: 5000000, max: 7000000 },
                      { label: '7M-9M', shortLabel: '7-9M', min: 7000000, max: 9000000 },
                      { label: '9M-12M', shortLabel: '9-12M', min: 9000000, max: 12000000 },
                      { label: '12M-15M', shortLabel: '12-15M', min: 12000000, max: 15000000 },
                      { label: '>15M', shortLabel: '>15M', min: 15000000, max: Infinity },
                    ];

                    const distribution = ranges.map(range => ({
                      ...range,
                      count: soldCars.filter(
                        car => car.price >= range.min && car.price < range.max
                      ).length,
                    }));

                    const maxCount = Math.max(...distribution.map(d => d.count), 1);

                    return (
                      <>
                        {/* Y-axis label */}
                        <div className="absolute -left-8 top-1/2 -translate-y-1/2 -rotate-90 text-sm font-semibold text-slate-600">
                          Number of Cars
                        </div>
                        
                        {/* Horizontal grid lines */}
                        <div className="absolute left-12 right-0 -top-4 h-64 flex flex-col justify-between pointer-events-none">
                          {[0, 1, 2, 3, 4].map(i => (
                            <div key={i} className="w-full border-t border-slate-200" />
                          ))}
                        </div>
                        
                        {/* Chart area */}
                        <div className="h-64 flex justify-around gap-2 items-end relative z-10">
                          {distribution.map((range) => {
                            const heightPercentage = maxCount > 0 ? (range.count / maxCount) * 100 : 0;
                            
                            return (
                              <div key={range.label} className="flex-1 flex flex-col items-center">
                                {/* Bar container */}
                                <div className="w-full h-64 flex flex-col justify-end items-center relative">
                                  {/* Count label above bar */}
                                  {range.count > 0 && (
                                    <div className="text-xs font-semibold text-slate-700 mb-1">
                                      {range.count}
                                    </div>
                                  )}
                                  
                                  {/* Bar */}
                                  <div
                                    className="w-full bg-gradient-to-t from-blue-600 to-blue-400 rounded-t-lg transition-all duration-700 ease-out hover:from-blue-700 hover:to-blue-500 shadow-sm relative group"
                                    style={{ height: `${heightPercentage}%`, minHeight: range.count > 0 ? '8px' : '0' }}
                                  >
                                    {/* Tooltip on hover */}
                                    {range.count > 0 && (
                                      <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                                        <div className="bg-slate-900 text-white text-xs rounded py-1 px-2 whitespace-nowrap">
                                          {((range.count / soldCars.length) * 100).toFixed(1)}%
                                        </div>
                                      </div>
                                    )}
                                  </div>
                                </div>
                                
                                {/* Label - fixed height to prevent wrapping from affecting alignment */}
                                <div className="text-xs text-slate-600 font-medium mt-2 h-8 flex items-start justify-center">
                                  <span className="text-center">{range.shortLabel}</span>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                        
                        {/* X-axis label - positioned absolutely at bottom */}
                        <div className="absolute bottom-0 left-0 right-0 text-center text-sm font-semibold text-slate-600">
                          Price Range
                        </div>
                      </>
                    );
                  })()}
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Sold Cars List */}
        <Card>
          <CardHeader>
            <CardTitle>Recently Sold Vehicles</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {soldCars.slice(0, visibleCount).map((car, index) => (
                <div
                  key={`${car.make}-${car.model}-${index}`}
                  className="relative flex flex-col border rounded-lg hover:bg-gray-50 group overflow-hidden"
                >
                  {/* Car Image */}
                  <a
                    href={car.url || undefined}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-full h-40 bg-muted block"
                    onClick={(e) => {
                      if (!car.url) e.preventDefault();
                    }}
                  >
                    {car.image_url ? (
                      <img
                        src={car.image_url}
                        alt={`${car.year} ${car.make} ${car.model}`}
                        className="w-full h-full object-cover hover:opacity-90 transition-opacity"
                        onError={(e) => {
                          e.currentTarget.src = `https://placehold.co/400x300/e5e7eb/6b7280?text=${encodeURIComponent(car.make + ' ' + car.model)}`;
                        }}
                      />
                    ) : (
                      <div className="w-full h-full bg-muted flex items-center justify-center">
                        <span className="text-muted-foreground text-center px-4">
                          {car.make} {car.model}
                        </span>
                      </div>
                    )}
                  </a>

                  {/* Sold Badge */}
                  <div className="absolute top-2 right-2 bg-red-600 text-white px-2 py-1 rounded text-xs font-bold">
                    SOLD
                  </div>

                  {/* Car Info */}
                  <div className="flex-1 p-4 space-y-2">
                    <div className="space-y-1">
                      <a
                        href={car.url || undefined}
                        target="_blank"
                        rel="noopener noreferrer"
                        className={car.url ? "hover:text-blue-700 transition-colors" : "cursor-default"}
                        onClick={(e) => {
                          if (!car.url) e.preventDefault();
                        }}
                      >
                        <h3 className="font-semibold text-lg line-clamp-2">
                          {car.year} {car.make} {car.model}
                        </h3>
                      </a>
                      <p className="text-sm text-gray-600">
                        {car.kilometers ? `${car.kilometers.toLocaleString()} km` : 'Unknown km'}
                      </p>
                    </div>

                    <div className="space-y-1 text-xs text-gray-500">
                      <p>Listed: {formatDate(car.scraped_at)}</p>
                    </div>
                  </div>

                  {/* Price */}
                  <div className="px-4 pb-4">
                    <p className="font-bold text-lg">{formatPrice(car.price)}</p>
                  </div>

                  {/* Actions */}
                  {car.url && (
                    <div className="px-4 pb-4 pt-2 border-t">
                      <a
                        href={car.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm text-blue-600 hover:underline"
                      >
                        View archived listing
                      </a>
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* Load More Button */}
            {visibleCount < soldCars.length && (
              <div className="flex justify-center mt-6">
                <Button onClick={loadMore} variant="outline">
                  Load More ({soldCars.length - visibleCount} remaining)
                </Button>
              </div>
            )}

            {soldCars.length === 0 && (
              <div className="text-center py-12 text-slate-500">
                No sold cars found in the database.
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
