'use client';

import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Heart, ExternalLink } from 'lucide-react';
import { CarListing } from '@/types/car';
import { useAuth } from '@/lib/auth-context';
import { supabase } from '@/lib/supabase';
import { useLanguage } from '@/lib/language-context';

interface CarCardProps {
  car: CarListing;
  showSaveButton?: boolean;
  isSaved?: boolean;
  onSaveToggle?: () => void;
}

export default function CarCard({ car, showSaveButton = true, isSaved = false, onSaveToggle }: CarCardProps) {
  const { user } = useAuth();
  const { t } = useLanguage();
  const [saved, setSaved] = useState(isSaved);
  const [loading, setLoading] = useState(false);

  const handleSaveToggle = async () => {
    if (!user) {
      // Redirect to login
      window.location.href = '/login';
      return;
    }

    setLoading(true);

    if (saved) {
      // Remove from saved
      const { error } = await supabase
        .from('saved_listings')
        .delete()
        .eq('user_id', user.id)
        .eq('listing_id', car.id);

      if (!error) {
        setSaved(false);
        onSaveToggle?.();
      }
    } else {
      // Add to saved
      const { error } = await supabase
        .from('saved_listings')
        .insert({
          user_id: user.id,
          listing_id: car.id,
        });

      if (!error) {
        setSaved(true);
        onSaveToggle?.();
      }
    }

    setLoading(false);
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('is-IS', {
      style: 'currency',
      currency: 'ISK',
      minimumFractionDigits: 0,
    }).format(price);
  };

  const formatKilometers = (km: number) => {
    return new Intl.NumberFormat('is-IS').format(km) + ' km';
  };

  return (
    <Card className="overflow-hidden hover:shadow-lg transition-shadow">
      <div className="relative">
        {car.image_url ? (
          <img
            src={car.image_url}
            alt={`${car.make} ${car.model}`}
            className="w-full h-48 object-cover"
            onError={(e) => {
              // Fallback to placeholder if image fails to load
              e.currentTarget.src = `https://placehold.co/600x400/e5e7eb/6b7280?text=${encodeURIComponent(car.make + ' ' + car.model)}`;
            }}
          />
        ) : (
          <div className="w-full h-48 bg-muted flex items-center justify-center">
            <span className="text-muted-foreground text-lg">
              {car.make} {car.model}
            </span>
          </div>
        )}
        {showSaveButton && (
          <Button
            variant="ghost"
            size="icon"
            className="absolute top-2 right-2 bg-background/80 hover:bg-background"
            onClick={handleSaveToggle}
            disabled={loading}
          >
            <Heart
              className={`h-5 w-5 ${saved ? 'fill-red-500 text-red-500' : ''}`}
            />
          </Button>
        )}
      </div>
      <CardContent className="p-4">
        <h3 className="font-semibold text-lg mb-2">
          {car.make} {car.model}
        </h3>
        <div className="space-y-1 text-sm text-muted-foreground mb-3">
          <p>{t('card.year')}: {car.year}</p>
          <p>{t('card.mileage')}: {formatKilometers(car.kilometers)}</p>
          <p className="text-lg font-semibold text-foreground">{formatPrice(car.price)}</p>
        </div>
        {car.url && (
          <Button variant="outline" size="sm" className="w-full gap-2" asChild>
            <a href={car.url} target="_blank" rel="noopener noreferrer">
              View Listing
              <ExternalLink className="h-4 w-4" />
            </a>
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
