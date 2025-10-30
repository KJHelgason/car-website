'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { Card } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { ArrowDownAZ, ArrowUpAZ, ArrowDownNarrowWide, ArrowUpNarrowWide, Calendar } from 'lucide-react';
import type { CarItem } from '@/types/form';
import { SaveListingButton } from '@/components/SaveListingButton';

interface CarListItem {
    id: number;
    make: string;
    model: string;
    display_make?: string;
    display_name?: string;
    year: number;
    kilometers: number | null;
    price: number;
    url: string | null;
    scraped_at: string | null;
    image_url?: string | null;
    source?: string | null;
}

interface FullCarListProps {
    listings: CarListItem[];
    onViewPriceAnalysis?: (data: CarItem) => void;
    totalCount?: number;
}

export function FullCarList({ listings, onViewPriceAnalysis, totalCount }: FullCarListProps) {
    const PAGE_SIZE = 32;
    const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
    const loadMoreRef = useRef<HTMLDivElement>(null);
    const [isLoading, setIsLoading] = useState(false);
    type SortField = 'name' | 'price' | 'km' | 'year' | 'date';
    type SortConfig = { field: SortField; order: 'asc' | 'desc' };
    const [activeSorts, setActiveSorts] = useState<SortConfig[]>([
        { field: 'date', order: 'desc' }
    ]);

    // Reset pagination when sorts change
    useEffect(() => {
        setVisibleCount(PAGE_SIZE);
    }, [activeSorts]);

    const loadMore = useCallback(() => {
        if (isLoading || visibleCount >= listings.length) return;
        
        setIsLoading(true);
        // Simulate async loading with a small delay for better UX
        setTimeout(() => {
            setVisibleCount((prev) => Math.min(prev + PAGE_SIZE, listings.length));
            setIsLoading(false);
        }, 100);
    }, [isLoading, visibleCount, listings.length]);

    // Intersection Observer for infinite scroll
    useEffect(() => {
        const observer = new IntersectionObserver(
            (entries) => {
                const target = entries[0];
                if (target.isIntersecting && visibleCount < listings.length) {
                    loadMore();
                }
            },
            {
                root: null,
                rootMargin: '100px', // Start loading 100px before reaching the bottom
                threshold: 0.1
            }
        );

        const currentRef = loadMoreRef.current;
        if (currentRef) {
            observer.observe(currentRef);
        }

        return () => {
            if (currentRef) {
                observer.unobserve(currentRef);
            }
        };
    }, [visibleCount, listings.length, loadMore]);

    const compareByField = (a: CarListItem, b: CarListItem, field: SortField, order: 'asc' | 'desc'): number => {
        const mult = order === 'desc' ? 1 : -1;
        
        switch (field) {
            case 'price':
                return (b.price - a.price) * mult;
            case 'km':
                const aKm = a.kilometers ?? Infinity;
                const bKm = b.kilometers ?? Infinity;
                return (bKm - aKm) * mult;
            case 'year':
                const aYear = parseInt(a.year.toString());
                const bYear = parseInt(b.year.toString());
                return (bYear - aYear) * mult;
            case 'date':
                const aDate = a.scraped_at ? new Date(a.scraped_at).getTime() : 0;
                const bDate = b.scraped_at ? new Date(b.scraped_at).getTime() : 0;
                return (bDate - aDate) * mult;
            case 'name':
                const aName = `${a.make} ${a.model}`.toLowerCase();
                const bName = `${b.make} ${b.model}`.toLowerCase();
                return aName.localeCompare(bName) * mult;
            default:
                return 0;
        }
    };

    const sortedListings = [...listings].sort((a, b) => {
        for (const sort of activeSorts) {
            const result = compareByField(a, b, sort.field, sort.order);
            if (result !== 0) return result;
        }
        return 0;
    });

    const visibleListings = sortedListings.slice(0, visibleCount);

    return (
        <Card className="p-6 w-full">
            <div className="space-y-4">
                {/* Header */}
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                    <div id="sort-buttons" className="flex flex-wrap items-center gap-2">
                        <Label className="text-lg font-semibold mr-2">Search Results</Label>
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                                const existingIndex = activeSorts.findIndex(s => s.field === 'year');
                                if (existingIndex === -1) {
                                    setActiveSorts(prev => [{ field: 'year', order: 'desc' }, ...prev]);
                                } else if (activeSorts[existingIndex].order === 'desc') {
                                    setActiveSorts(prev => 
                                        prev.map((s, i) => i === existingIndex ? { ...s, order: 'asc' } : s)
                                    );
                                } else {
                                    setActiveSorts(prev => prev.filter(s => s.field !== 'year'));
                                }
                            }}
                            className={`px-2 ${activeSorts.some(s => s.field === 'year') ? 'bg-blue-50' : ''}`}
                        >
                            <span>Year</span>
                            {activeSorts.some(s => s.field === 'year') && (
                                <span className="ml-1">
                                    {activeSorts.find(s => s.field === 'year')?.order === 'desc' ? '↓' : '↑'}
                                    {activeSorts.findIndex(s => s.field === 'year') + 1}
                                </span>
                            )}
                        </Button>

                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                                const existingIndex = activeSorts.findIndex(s => s.field === 'price');
                                if (existingIndex === -1) {
                                    setActiveSorts(prev => [...prev, { field: 'price', order: 'desc' }]);
                                } else if (activeSorts[existingIndex].order === 'desc') {
                                    setActiveSorts(prev => 
                                        prev.map((s, i) => i === existingIndex ? { ...s, order: 'asc' } : s)
                                    );
                                } else {
                                    setActiveSorts(prev => prev.filter(s => s.field !== 'price'));
                                }
                            }}
                            className={`px-2 ${activeSorts.some(s => s.field === 'price') ? 'bg-blue-50' : ''}`}
                        >
                            {activeSorts.some(s => s.field === 'price') ? (
                                activeSorts.find(s => s.field === 'price')?.order === 'desc' ? (
                                    <ArrowDownNarrowWide className="h-4 w-4" />
                                ) : (
                                    <ArrowUpNarrowWide className="h-4 w-4" />
                                )
                            ) : (
                                <ArrowUpNarrowWide className="h-4 w-4" />
                            )}
                            <span className="ml-2">Price {activeSorts.findIndex(s => s.field === 'price') + 1 || ''}</span>
                        </Button>
                        
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                                const existingIndex = activeSorts.findIndex(s => s.field === 'km');
                                if (existingIndex === -1) {
                                    setActiveSorts(prev => [...prev, { field: 'km', order: 'desc' }]);
                                } else if (activeSorts[existingIndex].order === 'desc') {
                                    setActiveSorts(prev => 
                                        prev.map((s, i) => i === existingIndex ? { ...s, order: 'asc' } : s)
                                    );
                                } else {
                                    setActiveSorts(prev => prev.filter(s => s.field !== 'km'));
                                }
                            }}
                            className={`px-2 ${activeSorts.some(s => s.field === 'km') ? 'bg-blue-50' : ''}`}
                        >
                            <span>KM</span>
                            {activeSorts.some(s => s.field === 'km') && (
                                <span className="ml-1">
                                    {activeSorts.find(s => s.field === 'km')?.order === 'desc' ? '↓' : '↑'}
                                    {activeSorts.findIndex(s => s.field === 'km') + 1}
                                </span>
                            )}
                        </Button>

                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                                const existingIndex = activeSorts.findIndex(s => s.field === 'name');
                                if (existingIndex === -1) {
                                    setActiveSorts(prev => [...prev, { field: 'name', order: 'asc' }]);
                                } else if (activeSorts[existingIndex].order === 'asc') {
                                    setActiveSorts(prev => 
                                        prev.map((s, i) => i === existingIndex ? { ...s, order: 'desc' } : s)
                                    );
                                } else {
                                    setActiveSorts(prev => prev.filter(s => s.field !== 'name'));
                                }
                            }}
                            className={`px-2 ${activeSorts.some(s => s.field === 'name') ? 'bg-blue-50' : ''}`}
                        >
                            {activeSorts.some(s => s.field === 'name') ? (
                                activeSorts.find(s => s.field === 'name')?.order === 'desc' ? (
                                    <ArrowDownAZ className="h-4 w-4" />
                                ) : (
                                    <ArrowUpAZ className="h-4 w-4" />
                                )
                            ) : (
                                <ArrowUpAZ className="h-4 w-4" />
                            )}
                            <span className="ml-2">Name {activeSorts.findIndex(s => s.field === 'name') + 1 || ''}</span>
                        </Button>

                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                                const existingIndex = activeSorts.findIndex(s => s.field === 'date');
                                if (existingIndex === -1) {
                                    setActiveSorts(prev => [...prev, { field: 'date', order: 'desc' }]);
                                } else if (activeSorts[existingIndex].order === 'desc') {
                                    setActiveSorts(prev => 
                                        prev.map((s, i) => i === existingIndex ? { ...s, order: 'asc' } : s)
                                    );
                                } else {
                                    setActiveSorts(prev => prev.filter(s => s.field !== 'date'));
                                }
                            }}
                            className={`px-2 ${activeSorts.some(s => s.field === 'date') ? 'bg-blue-50' : ''}`}
                        >
                            <Calendar className="h-4 w-4" />
                            {activeSorts.some(s => s.field === 'date') && (
                                <span className="ml-1">
                                    {activeSorts.find(s => s.field === 'date')?.order === 'desc' ? '↓' : '↑'}
                                    {activeSorts.findIndex(s => s.field === 'date') + 1}
                                </span>
                            )}
                        </Button>
                    </div>
                </div>

                {/* Grid of listings */}
                <div id="search-results" className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                    {visibleListings.map((car, index) => (
                        <div
                            key={`${car.make}-${car.model}-${index}`}
                            className="relative flex flex-col border rounded-lg hover:bg-gray-50 group overflow-hidden"
                        >
                            {/* Car Image - clickable */}
                            <div className="relative">
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
                                            alt={`${car.year} ${car.display_make || car.make} ${car.display_name || car.model}`}
                                            className="w-full h-full object-cover hover:opacity-90 transition-opacity"
                                            onError={(e) => {
                                                e.currentTarget.src = `https://placehold.co/400x300/e5e7eb/6b7280?text=${encodeURIComponent((car.display_make || car.make) + ' ' + (car.display_name || car.model))}`;
                                            }}
                                        />
                                    ) : (
                                        <div className="w-full h-full bg-muted flex items-center justify-center">
                                            <span className="text-muted-foreground text-center px-4">
                                                {car.display_make || car.make} {car.display_name || car.model}
                                            </span>
                                        </div>
                                    )}
                                </a>
                                {/* Save Button - positioned over image */}
                                <div className="absolute top-2 right-2 z-10">
                                    <SaveListingButton listingId={car.id} size="sm" />
                                </div>
                                {/* Facebook Icon - positioned at bottom-right */}
                                {car.source === 'Facebook Marketplace' && (
                                    <div className="absolute bottom-2 right-2 z-10 bg-white rounded-full p-1.5 shadow-md">
                                        <svg className="w-4 h-4 text-[#1877F2]" fill="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                                            <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
                                        </svg>
                                    </div>
                                )}
                            </div>

                            {/* Car Info Section */}
                            <div className="flex-1 p-4 space-y-2">
                                <div className="space-y-1">
                                    {/* Title - clickable */}
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
                                            {car.year} {car.display_make || car.make} {car.display_name || car.model}
                                        </h3>
                                    </a>
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
                            
                            {/* Price positioned at bottom */}
                            <div className="px-4">
                                <p className="font-bold text-lg">{new Intl.NumberFormat('is-IS', {
                                        style: 'currency',
                                        currency: 'ISK',
                                        maximumFractionDigits: 0,
                                    }).format(car.price)}
                                </p>
                            </div>

                            {/* Actions Section */}
                            <div className="px-4 pb-4 pt-2 border-t mt-2 space-y-2">
                                <div className="flex justify-between items-center gap-2">
                                    {car.url && (
                                        <a
                                            href={car.url}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="text-sm text-blue-600 hover:underline"
                                        >
                                            View listing
                                        </a>
                                    )}
                                    {onViewPriceAnalysis && (
                                        <Button
                                            id='analyze-price-button'
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

                {/* Infinite scroll trigger */}
                {visibleCount < listings.length && (
                    <div 
                        ref={loadMoreRef} 
                        className="flex justify-center mt-4 py-4"
                    >
                        {isLoading && (
                            <div className="text-sm text-slate-500">
                                Loading more...
                            </div>
                        )}
                    </div>
                )}
                
                {/* Show total count */}
                {visibleCount >= listings.length && listings.length > 0 && (
                    <div className="text-center mt-4 py-4 text-sm text-slate-500">
                        Showing all {listings.length} results
                    </div>
                )}
            </div>
        </Card>
    );
}
