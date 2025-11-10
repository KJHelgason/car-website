'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/lib/auth-context';
import { getSavedListings } from '@/lib/saved-items';
import type { SavedListing } from '@/types/saved';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { Heart, TrendingUp } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useLanguage } from '@/lib/language-context';

interface SavedListingsDropdownProps {
  onClose?: () => void;
}

export function SavedListingsDropdown({ onClose }: SavedListingsDropdownProps) {
  const { user } = useAuth();
  const router = useRouter();
  const { t } = useLanguage();
  const [listings, setListings] = useState<SavedListing[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      setListings([]);
      setLoading(false);
      return;
    }

    const fetchListings = async () => {
      setLoading(true);
      const data = await getSavedListings(user.id, 5);
      setListings(data);
      setLoading(false);
    };

    fetchListings();
  }, [user]);

  if (!user) {
    return (
      <div className="p-4 text-center text-sm text-muted-foreground">
        <p>Please log in to view saved listings</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="p-4">
        <div className="space-y-2">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-24 bg-muted animate-pulse rounded" />
          ))}
        </div>
      </div>
    );
  }

  if (listings.length === 0) {
    return (
      <div className="p-4 text-center text-sm text-muted-foreground">
        <Heart className="h-8 w-8 mx-auto mb-2 opacity-50" />
        <p>{t('saved.noSavedListings')}</p>
        <p className="text-xs mt-1">{t('card.saveForLater')}</p>
      </div>
    );
  }

  const formatPrice = (price?: number) => {
    if (!price) return 'N/A';
    return new Intl.NumberFormat('is-IS', {
      style: 'currency',
      currency: 'ISK',
      maximumFractionDigits: 0,
    }).format(price);
  };

  const formatKm = (km?: number) => {
    if (!km) return 'N/A';
    return new Intl.NumberFormat('is-IS').format(km) + ' km';
  };

  return (
    <div className="w-96 max-w-md">
      <div className="p-2 space-y-2 max-h-96 overflow-y-auto">
        {listings.map((listing) => {
          const displayName = listing.display_name || `${listing.make} ${listing.model}`;
          
          return (
            <div
              key={listing.id}
              className="p-3 hover:bg-muted rounded-lg transition-colors border border-border"
            >
              <div className="flex gap-3">
                {/* Image */}
                <div className="relative w-24 h-20 flex-shrink-0 bg-gray-100 rounded overflow-hidden">
                  {listing.image_url ? (
                    <img
                      src={listing.image_url}
                      alt={displayName || 'Car'}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-gray-400">
                      <Heart className="h-6 w-6" />
                    </div>
                  )}
                </div>

                {/* Details */}
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-sm truncate">
                    {displayName}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {listing.year} • {formatKm(listing.kilometers)}
                  </div>
                  <div className="text-sm font-semibold text-primary mt-1">
                    {formatPrice(listing.price)}
                  </div>
                  
                  {/* Action buttons */}
                  <div className="flex gap-2 mt-2">
                    {listing.url && (
                      <Link href={listing.url} target="_blank" rel="noopener noreferrer">
                        <Button size="sm" variant="ghost" className="cursor-pointer h-7 text-xs">
                          View Listing
                        </Button>
                      </Link>
                    )}
                    {listing.make && listing.model && listing.year && (
                      <Button
                        size="sm"
                        variant="outline"
                        className="cursor-pointer h-7 text-xs gap-1"
                        onClick={() => {
                          const params = new URLSearchParams({
                            make: listing.make!,
                            model: listing.model!,
                            year: listing.year!.toString(),
                          });
                          router.push(`/?${params.toString()}`);
                          onClose?.();
                        }}
                      >
                        <TrendingUp className="h-3 w-3" />
                        Analyze
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
      
      <div className="border-t border-border p-2">
        <Link href="/saved-listings" className="block w-full">
          <Button variant="ghost" className="cursor-pointer w-full justify-center text-sm">
            See All Saved Listings
          </Button>
        </Link>
      </div>
    </div>
  );
}
