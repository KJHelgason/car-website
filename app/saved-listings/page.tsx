'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/lib/auth-context';
import { getSavedListings, removeSavedListing } from '@/lib/saved-items';
import type { SavedListing } from '@/types/saved';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Heart, TrendingUp, ExternalLink } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

export default function SavedListingsPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [listings, setListings] = useState<SavedListing[]>([]);
  const [loading, setLoading] = useState(true);
  const [removingId, setRemovingId] = useState<number | null>(null);

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login?redirect=/saved-listings');
      return;
    }

    if (user) {
      fetchListings();
    }
  }, [user, authLoading, router]);

  const fetchListings = async () => {
    if (!user) return;
    
    setLoading(true);
    const data = await getSavedListings(user.id);
    setListings(data);
    setLoading(false);
  };

  const handleRemove = async (listingId: number) => {
    if (!user || !confirm('Remove this listing from saved?')) return;

    setRemovingId(listingId);
    const result = await removeSavedListing(user.id, listingId);
    setRemovingId(null);

    if (result.success) {
      setListings((prev) => prev.filter((l) => l.listing_id !== listingId));
    } else {
      alert('Failed to remove listing: ' + result.error);
    }
  };

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

  if (authLoading || (loading && !listings.length)) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Card>
          <CardHeader>
            <CardTitle>Saved Listings</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-64 bg-muted animate-pulse rounded" />
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-7xl">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Heart className="h-5 w-5" />
              Saved Listings
            </CardTitle>
            <span className="text-sm text-muted-foreground">
              {listings.length} {listings.length === 1 ? 'listing' : 'listings'}
            </span>
          </div>
        </CardHeader>
        <CardContent>
          {listings.length === 0 ? (
            <div className="text-center py-12">
              <Heart className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
              <h3 className="text-lg font-semibold mb-2">No saved listings yet</h3>
              <p className="text-muted-foreground mb-4">
                Click the heart icon on any listing to save it
              </p>
              <Link href="/">
                <Button>Browse Listings</Button>
              </Link>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {listings.map((listing) => {
                const displayName = listing.display_name || `${listing.make} ${listing.model}`;
                
                return (
                  <Card key={listing.id} className="overflow-hidden hover:shadow-lg transition-shadow">
                    <div className="relative h-48 bg-gray-100">
                      {listing.image_url ? (
                        <img
                          src={listing.image_url}
                          alt={displayName || 'Car'}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-gray-400">
                          <Heart className="h-12 w-12" />
                        </div>
                      )}
                    </div>

                    <div className="p-4 space-y-3">
                      <div>
                        <h3 className="font-semibold text-lg truncate">
                          {displayName}
                        </h3>
                        <p className="text-sm text-muted-foreground">
                          {listing.year} • {formatKm(listing.kilometers)}
                        </p>
                      </div>

                      <div className="text-xl font-bold text-primary">
                        {formatPrice(listing.price)}
                      </div>

                      <div className="flex flex-col gap-2">
                        {listing.url && (
                          <Link href={listing.url} target="_blank" rel="noopener noreferrer">
                            <Button variant="outline" size="sm" className="w-full gap-2">
                              <ExternalLink className="h-4 w-4" />
                              View Listing
                            </Button>
                          </Link>
                        )}
                        
                        {listing.make && listing.model && listing.year && (
                          <Link href={`/?make=${listing.make}&model=${listing.model}&year=${listing.year}`}>
                            <Button variant="outline" size="sm" className="w-full gap-2">
                              <TrendingUp className="h-4 w-4" />
                              Analyze Price
                            </Button>
                          </Link>
                        )}

                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleRemove(listing.listing_id)}
                          disabled={removingId === listing.listing_id}
                          className="text-destructive hover:text-destructive w-full"
                        >
                          <Heart className="h-4 w-4 mr-2 fill-current" />
                          Remove
                        </Button>
                      </div>
                    </div>
                  </Card>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

