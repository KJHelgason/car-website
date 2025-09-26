'use client';

import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import type { CarItem } from '@/types/form';

interface CarListItem {
    make: string;
    model: string;
    year: number;
    kilometers: number | null;
    price: number;
    url: string | null;
    scraped_at: string | null;
}

interface FullCarListProps {
    listings: CarListItem[];
    onViewPriceAnalysis?: (data: CarItem) => void;
    totalCount?: number;
}

export function FullCarList({ listings, onViewPriceAnalysis, totalCount }: FullCarListProps) {
    const PAGE_SIZE = 50;
    const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);

    const handleLoadMore = () => {
        setVisibleCount((prev) => Math.min(prev + PAGE_SIZE, listings.length));
    };

    const visibleListings = listings.slice(0, visibleCount);

    return (
        <Card className="p-6 w-full">
            <div className="space-y-4">
                {/* Header */}
                <div className="flex justify-between items-center">
                    <Label className="text-lg font-semibold">Search Results</Label>
                    <span className="text-sm text-gray-500">
                        Showing {Math.min(visibleCount, totalCount || listings.length)} of {totalCount || listings.length} results
                    </span>
                </div>

                {/* Grid of listings */}
                <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                    {visibleListings.map((car, index) => (
                        <div
                            key={`${car.make}-${car.model}-${index}`}
                            className="relative flex flex-col h-[220px] p-4 border rounded-lg hover:bg-gray-50 group"
                        >
                            {/* Car Info Section */}
                            <div className="flex-1 space-y-2">
                                <div className="space-y-1">
                                    <h3 className="font-semibold text-lg line-clamp-2">
                                        {car.year} {car.make} {car.model}
                                    </h3>
                                    <p className="text-sm text-gray-600">
                                        {car.kilometers ? `${car.kilometers.toLocaleString()} km` : 'Unknown km'}
                                    </p>
                                </div>
                                
                                {car.scraped_at && (
                                    <p className="text-xs text-gray-400">
                                        Listed: {new Date(car.scraped_at).toLocaleDateString()}
                                    </p>
                                )}
                            </div>
                            
                            {/* Price positioned absolutely */}
                            <div className="absolute bottom-[68px] right-4">
                                <p className="font-bold text-lg">
                                    {new Intl.NumberFormat('is-IS', {
                                        style: 'currency',
                                        currency: 'ISK',
                                        maximumFractionDigits: 0,
                                    }).format(car.price)}
                                </p>
                            </div>

                            {/* Actions Section */}
                            <div className="pt-4 border-t space-y-2">
                                <div className="flex justify-between items-center gap-2">
                                    {car.url && (
                                        <a
                                            href={car.url}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="text-sm text-blue-600 hover:underline"
                                        >
                                            View listing →
                                        </a>
                                    )}
                                    {onViewPriceAnalysis && (
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={() => {
                                                window.scrollTo({ top: 0, behavior: 'smooth' });
                                                onViewPriceAnalysis({
                                                    make: car.make,
                                                    model: car.model,
                                                    year: car.year.toString(),
                                                    kilometers: car.kilometers || 0,
                                                    price: car.price,
                                                });
                                            }}
                                            className="ml-auto"
                                        >
                                            Analyze Price
                                        </Button>
                                    )}
                                </div>
                            </div>
                        </div>
                    ))}
                </div>

                {/* Load More button */}
                {visibleCount < listings.length && (
                    <div className="flex justify-center mt-4">
                        <Button onClick={handleLoadMore} variant="outline">
                            Load More
                        </Button>
                    </div>
                )}
            </div>
        </Card>
    );
}
