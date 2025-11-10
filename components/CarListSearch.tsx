'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { supabase } from '@/lib/supabase';
import { trackSearch } from '@/lib/analytics';
import { FullCarList } from '@/components/FullCarList';
import type { CarItem } from '@/types/form';
import { useLanguage } from '@/lib/language-context';
import {
    Select,
    SelectContent,
    SelectGroup,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';

interface CarListingResult {
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
}

interface Props {
    makes: Array<{ make_norm: string; display_make: string }>;
    onViewPriceAnalysis?: (data: CarItem) => void;
    onSearchStateChange?: (hasResults: boolean) => void;
}

export function CarListSearch({ makes, onViewPriceAnalysis, onSearchStateChange }: Props) {
    const { t } = useLanguage();
    const router = useRouter();
    const searchParams = useSearchParams();
    const [results, setResults] = useState<CarListingResult[]>([]);
    const [loading, setLoading] = useState(false);
    const [models, setModels] = useState<string[]>([]);
    const [filters, setFilters] = useState({
        make: '',
        model: '',
        yearMin: '',
        yearMax: '',
        kmMin: '',
        kmMax: '',
        priceMin: '',
        priceMax: '',
    });
    const [totalCount, setTotalCount] = useState(0);
    const [isLoadingFromUrl, setIsLoadingFromUrl] = useState(false);

    // Fetch a large batch (500 results) for infinite scrolling
    const FETCH_SIZE = 500;

    const fetchResults = async (skipUrlUpdate = false) => {
        setLoading(true);
        try {
            let query = supabase
                .from('car_listings')
                .select('id, make, model, display_make, display_name, year, kilometers, price, url, scraped_at, image_url, source', { count: 'exact' })
                .eq('is_active', true)
                .order('scraped_at', { ascending: false });

            // Apply filters
            if (filters.make && filters.make !== '~') query = query.eq('make', filters.make);
            if (filters.make !== '~' && filters.model && filters.model !== '~')
                query = query.ilike('model', `%${filters.model}%`);
            if (filters.yearMin && filters.yearMin !== '~') query = query.gte('year', filters.yearMin);
            if (filters.yearMax && filters.yearMax !== '~') query = query.lte('year', filters.yearMax);
            if (filters.kmMin && filters.kmMin !== '~') query = query.gte('kilometers', filters.kmMin);
            if (filters.kmMax && filters.kmMax !== '~') query = query.lte('kilometers', filters.kmMax);
            if (filters.priceMin && filters.priceMin !== '~') query = query.gte('price', filters.priceMin);
            if (filters.priceMax && filters.priceMax !== '~') query = query.lte('price', filters.priceMax);

            // Fetch a large batch of results for infinite scrolling
            const { data, error, count } = await query.range(0, FETCH_SIZE - 1);

            if (error) throw error;

            setResults(data as CarListingResult[]);
            setTotalCount(count || 0);
            
            // Notify parent about search results
            onSearchStateChange?.((data?.length || 0) > 0);
            
            // Track range search analytics
            if (filters.make) {
                trackSearch({
                    make: filters.make,
                    model: filters.model || 'all',
                    year: filters.yearMin || filters.yearMax || 'all',
                    make_norm: filters.make.toLowerCase(),
                    model_base: filters.model ? filters.model.toLowerCase() : undefined,
                    results_count: data?.length || 0,
                });
            }
            
            // Update URL with range search parameters (skip if triggered by URL)
            if (filters.make && !skipUrlUpdate) {
                const params = new URLSearchParams();
                params.set('mode', 'range');
                params.set('make', filters.make);
                if (filters.model && filters.model !== '~') params.set('model', filters.model);
                if (filters.yearMin && filters.yearMin !== '~') params.set('yearMin', filters.yearMin);
                if (filters.yearMax && filters.yearMax !== '~') params.set('yearMax', filters.yearMax);
                if (filters.kmMin && filters.kmMin !== '~') params.set('kmMin', filters.kmMin);
                if (filters.kmMax && filters.kmMax !== '~') params.set('kmMax', filters.kmMax);
                if (filters.priceMin && filters.priceMin !== '~') params.set('priceMin', filters.priceMin);
                if (filters.priceMax && filters.priceMax !== '~') params.set('priceMax', filters.priceMax);
                
                router.push(`/?${params.toString()}`, { scroll: false });
            }
        } catch (error) {
            console.error('Error fetching results:', error);
            setResults([]);
        } finally {
            setLoading(false);
        }
    };

    const handleInputChange = (key: keyof typeof filters, value: string) => {
        setFilters(prev => ({ ...prev, [key]: value }));
        if (key === 'make' && value === '') setModels([]);
    };

    const fetchModels = async (make: string) => {
        const { data: modelData, error: modelError } = await supabase
            .from('price_models')
            .select('model_base, display_name')
            .eq('make_norm', make.toLowerCase())
            .not('model_base', 'is', null)
            .order('display_name', { ascending: true });

        if (modelError) return;

        if (modelData && modelData.length > 0) {
            setModels([...new Set(modelData.map(item => (item.display_name || item.model_base) as string))]);
            return;
        }

        const { data: listingModels, error: listingError } = await supabase
            .from('car_listings')
            .select('model')
            .eq('make', make)
            .eq('is_active', true)
            .order('model', { ascending: true });

        if (!listingError && listingModels) {
            setModels([...new Set(listingModels.map(item => item.model as string))]);
        }
    };

    useEffect(() => {
        if (filters.make) fetchModels(filters.make);
        else setModels([]);
    }, [filters.make]);

    // Load URL parameters on mount
    useEffect(() => {
        const mode = searchParams.get('mode');
        if (mode === 'range' && !isLoadingFromUrl) {
            setIsLoadingFromUrl(true);
            
            const urlFilters = {
                make: searchParams.get('make') || '',
                model: searchParams.get('model') || '',
                yearMin: searchParams.get('yearMin') || '',
                yearMax: searchParams.get('yearMax') || '',
                kmMin: searchParams.get('kmMin') || '',
                kmMax: searchParams.get('kmMax') || '',
                priceMin: searchParams.get('priceMin') || '',
                priceMax: searchParams.get('priceMax') || '',
            };
            
            // Only load if there's at least a make
            if (urlFilters.make) {
                setFilters(urlFilters);
                // The search will be triggered by the next useEffect when filters change
            }
        }
    }, [searchParams]);

    // Trigger search when filters are loaded from URL
    useEffect(() => {
        if (isLoadingFromUrl && filters.make) {
            fetchResults(true); // Skip URL update to prevent loop
            setIsLoadingFromUrl(false);
        }
    }, [filters, isLoadingFromUrl]);

    return (
        <div className="space-y-6">
            <div className="rounded-b-lg rounded-tr-lg border bg-card text-card-foreground shadow-sm p-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Make and Model Section */}
                    <div className="grid grid-cols-2 gap-4">
                        {/* Make */}
                        <div id="make" className="space-y-2">
                            <Label htmlFor="make-select">Car Make</Label>
                            <Select
                                value={filters.make || "~"}
                                onValueChange={(value) =>
                                    handleInputChange("make", value === "~" ? "" : value)
                                }
                            >
                                <SelectTrigger id="make-select" className="w-full">
                                    <SelectValue placeholder="Select Make" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectGroup>
                                        <SelectItem value="~">~</SelectItem>
                                        {makes.map(({ make_norm, display_make }) => (
                                            <SelectItem key={make_norm} value={make_norm}>
                                                {display_make}
                                            </SelectItem>
                                        ))}
                                    </SelectGroup>
                                </SelectContent>
                            </Select>
                        </div>

                        {/* Model */}
                        <div id="model" className="space-y-2">
                            <Label htmlFor="model-select">Car Model</Label>
                            <Select
                                disabled={!filters.make}
                                value={filters.model || "~"}
                                onValueChange={(value) =>
                                    handleInputChange("model", value === "~" ? "" : value)
                                }
                            >
                                <SelectTrigger id="model-select" className="w-full">
                                    <SelectValue placeholder="Select Model" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectGroup>
                                        <SelectItem value="~">~</SelectItem>
                                        {models.map((model) => (
                                            <SelectItem key={model} value={model}>
                                                {model}
                                            </SelectItem>
                                        ))}
                                    </SelectGroup>
                                </SelectContent>
                            </Select>
                        </div>
                    </div>

                    {/* Year Range Section */}
                    <div id="year" className="space-y-2">
                        <Label>{t('search.yearRange')}</Label>
                        <div className="flex gap-2">
                            <Select
                                value={filters.yearMin || "~"}
                                onValueChange={(value) =>
                                    handleInputChange("yearMin", value === "~" ? "" : value)
                                }
                            >
                                <SelectTrigger className="w-full">
                                    <SelectValue placeholder="From" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectGroup>
                                        <SelectItem value="~">~</SelectItem>
                                        {Array.from({ length: 40 }, (_, i) => new Date().getFullYear() - i).map(
                                            (year) => (
                                                <SelectItem key={year} value={year.toString()}>
                                                    {year}
                                                </SelectItem>
                                            )
                                        )}
                                    </SelectGroup>
                                </SelectContent>
                            </Select>

                            <Select
                                value={filters.yearMax || "~"}
                                onValueChange={(value) =>
                                    handleInputChange("yearMax", value === "~" ? "" : value)
                                }
                            >
                                <SelectTrigger className="w-full">
                                    <SelectValue placeholder="To" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectGroup>
                                        <SelectItem value="~">~</SelectItem>
                                        {Array.from({ length: 40 }, (_, i) => new Date().getFullYear() - i).map(
                                            (year) => (
                                                <SelectItem key={year} value={year.toString()}>
                                                    {year}
                                                </SelectItem>
                                            )
                                        )}
                                    </SelectGroup>
                                </SelectContent>
                            </Select>
                        </div>
                    </div>

                    {/* Kilometers Range Section */}
                    <div id="km-range" className="space-y-2">
                        <Label>{t('search.kilometersRange')}</Label>
                        <div className="flex gap-2">
                            <Select
                                value={filters.kmMin || "~"}
                                onValueChange={(value) =>
                                    handleInputChange("kmMin", value === "~" ? "" : value)
                                }
                            >
                                <SelectTrigger className="w-full">
                                    <SelectValue placeholder="From" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectGroup>
                                        <SelectItem value="~">~</SelectItem>
                                        {Array.from({ length: 50 }, (_, i) => (i + 1) * 10000).map((km) => (
                                            <SelectItem key={km} value={km.toString()}>
                                                {km.toLocaleString()} km
                                            </SelectItem>
                                        ))}
                                    </SelectGroup>
                                </SelectContent>
                            </Select>

                            <Select
                                value={filters.kmMax || "~"}
                                onValueChange={(value) =>
                                    handleInputChange("kmMax", value === "~" ? "" : value)
                                }
                            >
                                <SelectTrigger className="w-full">
                                    <SelectValue placeholder="To" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectGroup>
                                        <SelectItem value="~">~</SelectItem>
                                        {Array.from({ length: 50 }, (_, i) => (i + 1) * 10000).map((km) => (
                                            <SelectItem key={km} value={km.toString()}>
                                                {km.toLocaleString()} km
                                            </SelectItem>
                                        ))}
                                    </SelectGroup>
                                </SelectContent>
                            </Select>
                        </div>
                    </div>

                    {/* Price Range Section */}
                    <div id="price-range" className="space-y-2">
                        <Label>{t('search.priceRange')}</Label>
                        <div className="flex gap-2">
                            <Select
                                value={filters.priceMin || "~"}
                                onValueChange={(value) =>
                                    handleInputChange("priceMin", value === "~" ? "" : value)
                                }
                            >
                                <SelectTrigger className="w-full">
                                    <SelectValue placeholder="From" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectGroup>
                                        <SelectItem value="~">~</SelectItem>
                                        {Array.from({ length: 150 }, (_, i) => (i + 1) * 100000).map((price) => (
                                            <SelectItem key={price} value={price.toString()}>
                                                {price.toLocaleString()} ISK
                                            </SelectItem>
                                        ))}
                                    </SelectGroup>
                                </SelectContent>
                            </Select>

                            <Select
                                value={filters.priceMax || "~"}
                                onValueChange={(value) =>
                                    handleInputChange("priceMax", value === "~" ? "" : value)
                                }
                            >
                                <SelectTrigger className="w-full">
                                    <SelectValue placeholder="To" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectGroup>
                                        <SelectItem value="~">~</SelectItem>
                                        {Array.from({ length: 150 }, (_, i) => (i + 1) * 100000).map((price) => (
                                            <SelectItem key={price} value={price.toString()}>
                                                {price.toLocaleString()} ISK
                                            </SelectItem>
                                        ))}
                                    </SelectGroup>
                                </SelectContent>
                            </Select>
                        </div>
                    </div>
                </div>

                <div className="pt-6 flex justify-center">
                    <Button
                        id="submit"
                        onClick={() => fetchResults(true)}
                        disabled={loading}
                        className="w-full md:w-auto"
                    >
                        {loading ? 'Searching...' : 'Search Listings'}
                    </Button>
                </div>
            </div>

            {results.length > 0 && (
                <div className="col-span-full w-full space-y-4">
                    <FullCarList
                        listings={results}
                        onViewPriceAnalysis={onViewPriceAnalysis}
                        totalCount={totalCount}
                    />
                </div>
            )}
        </div>
    );
}
