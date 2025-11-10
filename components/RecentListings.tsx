'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Clock, ExternalLink } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import type { CarItem } from '@/types/form';
import { formatPriceDifference } from '@/lib/utils';
import { SaveListingButton } from '@/components/SaveListingButton';
import { useLanguage } from '@/lib/language-context';

interface RecentListing {
  id: number;
  make: string;
  model: string;
  display_make?: string;
  display_name?: string;
  year: number;
  price: number;
  kilometers: number;
  url: string | null;
  image_url?: string | null;
  scraped_at: string;
  source?: string | null;
  estimated_price?: number;
  pct_below?: number;
}

interface RecentListingsProps {
  onViewAnalysis?: (data: CarItem) => void;
}

export function RecentListings({ onViewAnalysis }: RecentListingsProps) {
  const { t } = useLanguage();
  const [listings, setListings] = useState<RecentListing[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchRecentListings();
  }, []);

  const calculateEstimate = (coefJson: unknown, year: number, kilometers: number): number => {
    try {
      // Parse if it's a string
      const coef = typeof coefJson === 'string' ? JSON.parse(coefJson) : coefJson;
      
      const currentYear = new Date().getFullYear();
      const age = currentYear - year;
      const logKm = Math.log(1 + Math.max(0, kilometers));
      
      const result = coef.intercept +
        coef.beta_age * age +
        coef.beta_logkm * logKm +
        coef.beta_age_logkm * (age * logKm);
      
      return result;
    } catch (error) {
      console.error('Error in calculateEstimate:', error);
      return 0;
    }
  };

  const normalizeModel = (model: string): string => {
    return model
      .toLowerCase()
      .trim()
      .replace(/[^\w\s-]/g, '')
      .split(/\s+/)
      .slice(0, 2)
      .join(' ');
  };

  const fetchRecentListings = async () => {
    try {
      const { data, error } = await supabase
        .from('car_listings')
        .select('id, make, model, display_make, display_name, year, price, kilometers, url, image_url, scraped_at, source')
        .eq('is_active', true)
        .not('make', 'is', null)
        .not('model', 'is', null)
        .not('year', 'is', null)
        .not('price', 'is', null)
        .order('scraped_at', { ascending: false })
        .limit(6);

      if (error) throw error;

      // Normalize makes and models
      const normalizedListings = (data || []).map(listing => ({
        ...listing,
        make_norm: listing.make.toLowerCase().trim(),
        model_base: normalizeModel(listing.model)
      }));

      // Get unique make_norm values
      const uniqueMakes = [...new Set(normalizedListings.map(l => l.make_norm))];

      // Fetch price models for these makes
      const { data: priceModels } = await supabase
        .from('price_models')
        .select('make_norm, model_base, coef_json')
        .in('make_norm', uniqueMakes);

      // Create a map of model keys to price models
      const modelMap = new Map(
        (priceModels || []).map(pm => [`${pm.make_norm}|${pm.model_base}`, pm])
      );

      // Calculate estimates
      const listingsWithEstimates = normalizedListings.map(listing => {
        const modelKey = `${listing.make_norm}|${listing.model_base}`;
        const priceModel = modelMap.get(modelKey);
        
        let estimated_price: number | undefined;
        let pct_below: number | undefined;

        if (priceModel?.coef_json) {
          estimated_price = calculateEstimate(priceModel.coef_json, listing.year, listing.kilometers);
          if (estimated_price > 0) {
            pct_below = ((estimated_price - listing.price) / estimated_price) * 100;
          }
        }

        return {
          id: listing.id,
          make: listing.make,
          model: listing.model,
          display_make: listing.display_make,
          display_name: listing.display_name,
          year: listing.year,
          price: listing.price,
          kilometers: listing.kilometers,
          url: listing.url,
          image_url: listing.image_url,
          scraped_at: listing.scraped_at,
          source: listing.source,
          estimated_price,
          pct_below
        };
      });

      setListings(listingsWithEstimates);
    } catch (error) {
      console.error('Error fetching recent listings:', error);
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

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  };

  if (loading) {
    return (
      <Card className="border-0 shadow-md">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-lg">
            <div className="p-2 bg-green-100 rounded-lg">
              <Clock className="h-4 w-4 text-green-600" />
            </div>
            {t('recent.title')}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-20 bg-slate-100 animate-pulse rounded-lg" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border shadow-sm gap-0">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg">
          <div className="p-2 bg-green-100 rounded-lg">
            <Clock className="h-4 w-4 text-green-600" />
          </div>
          {t('recent.title')}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {listings.map((listing, index) => {
            // Debug logging
            console.log(`Listing ${index}:`, {
              make: listing.make,
              model: listing.model,
              source: listing.source,
              sourceType: typeof listing.source,
              hasFacebook: listing.source && listing.source.toLowerCase().includes('facebook'),
              exactMatch: listing.source === 'Facebook Marketplace'
            });
            
            return (
            <Card
              key={index}
              className="hover:bg-gray-50 transition-all py-0 overflow-hidden"
            >
              <div className="flex items-stretch">
                {/* Image - clickable, fills top, bottom, left edges */}
                <div className="relative flex-shrink-0 w-24 sm:w-32 overflow-hidden">
                  <a
                    href={listing.url || undefined}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block h-full relative"
                    onClick={(e) => {
                      if (!listing.url) e.preventDefault();
                    }}
                  >
                    <div className="w-full h-full bg-slate-100 hover:opacity-90 transition-opacity">
                      {listing.image_url ? (
                        <img
                          src={listing.image_url}
                          alt={`${listing.display_make || listing.make} ${listing.display_name || listing.model}`}
                          className="w-full h-full object-cover"
                          onError={(e) => {
                            e.currentTarget.style.display = 'none';
                            const placeholder = e.currentTarget.nextElementSibling as HTMLElement;
                            if (placeholder) placeholder.style.display = 'flex';
                          }}
                        />
                      ) : null}
                      <div
                        className="w-full h-full flex items-center justify-center bg-slate-200 text-slate-500 text-xs text-center p-2"
                        style={{ display: listing.image_url ? 'none' : 'flex' }}
                      >
                        {listing.display_make || listing.make} {listing.display_name || listing.model}
                      </div>
                    </div>
                  </a>
                  {/* Save Button */}
                  <div className="absolute top-2 right-2 z-20 pointer-events-auto">
                    <SaveListingButton listingId={listing.id} size="sm" />
                  </div>
                  {/* Facebook Icon - positioned at bottom-right */}
                  {listing.source && listing.source.toLowerCase().includes('facebook') && (
                    <div className="absolute bottom-2 right-2 z-20 bg-white rounded-full p-0.5 shadow-lg pointer-events-none">
                      <svg className="w-4.5 h-4.5 text-[#1877F2]" fill="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                        <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
                      </svg>
                    </div>
                  )}
                </div>

                {/* Content */}
                  <div className="flex-1 min-w-0 flex flex-col justify-between p-3 sm:p-4">
                    <div className="flex items-start justify-between gap-2 sm:gap-4">
                      <div className="min-w-0 flex-1">
                        {/* Title - clickable */}
                        <a
                          href={listing.url || undefined}
                          target="_blank"
                          rel="noopener noreferrer"
                          className={listing.url ? "hover:text-blue-700 transition-colors" : "cursor-default"}
                          onClick={(e) => {
                            if (!listing.url) e.preventDefault();
                          }}
                        >
                          <h4 className="font-semibold text-sm sm:text-base leading-tight">
                            {listing.year} {listing.display_make || listing.make} {listing.display_name || listing.model}
                          </h4>
                        </a>
                        <p className="text-xs sm:text-sm text-slate-600 mt-0.5">
                          {listing.kilometers !== null ? listing.kilometers.toLocaleString() : t('common.unknown')} {t('common.km')}
                        </p>
                        <p className="text-xs text-slate-400 mt-0.5">{formatDate(listing.scraped_at)}</p>
                      </div>
                      <div className="text-right flex-shrink-0">
                        <p className="font-bold text-sm sm:text-base whitespace-nowrap">
                          {formatPrice(listing.price)}
                        </p>
                        {Number.isFinite(listing.pct_below) && listing.pct_below !== undefined && (
                          <p className="text-xs text-green-600 font-medium whitespace-nowrap">
                            {formatPriceDifference(listing.pct_below, t)}
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center justify-between gap-2 mt-2">
                      {listing.url ? (
                        <a
                          href={listing.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs sm:text-sm text-blue-600 hover:underline"
                        >
                          {t('card.viewListing')}
                        </a>
                      ) : (
                        <span />
                      )}

                      {onViewAnalysis && (
                        <Button
                          size="sm"
                          variant="outline"
                          className="cursor-pointer text-xs"
                          onClick={() => {
                            onViewAnalysis({
                              make: listing.make,
                              model: listing.model,
                              year: listing.year.toString(),
                              kilometers: listing.kilometers,
                              price: listing.price,
                            });
                          }}
                        >
                          {t('search.analyze')}
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
            </Card>
          );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
