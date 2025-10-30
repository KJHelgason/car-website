'use client';

import { useEffect, useState } from 'react';
import { Heart } from 'lucide-react';
import { useAuth } from '@/lib/auth-context';
import { saveListing, removeSavedListing, isListingSaved } from '@/lib/saved-items';
import { cn } from '@/lib/utils';

interface SaveListingButtonProps {
  listingId?: number;
  className?: string;
  size?: 'sm' | 'md' | 'lg';
}

export function SaveListingButton({ listingId, className, size = 'md' }: SaveListingButtonProps) {
  const { user } = useAuth();
  const [isSaved, setIsSaved] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!user || !listingId) {
      setIsSaved(false);
      return;
    }

    const checkSaved = async () => {
      const saved = await isListingSaved(user.id, listingId);
      setIsSaved(saved);
    };

    checkSaved();
  }, [user, listingId]);

  const handleToggle = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (!user || !listingId) {
      // Could show a login modal here
      alert('Please log in to save listings');
      return;
    }

    setLoading(true);

    try {
      if (isSaved) {
        const result = await removeSavedListing(user.id, listingId);
        if (result.success) {
          setIsSaved(false);
        }
      } else {
        const result = await saveListing(user.id, listingId);
        if (result.success) {
          setIsSaved(true);
        }
      }
    } catch (error) {
      console.error('Error toggling saved listing:', error);
    } finally {
      setLoading(false);
    }
  };

  // Don't render if no listing ID
  if (!listingId) {
    return null;
  }

  const sizeClasses = {
    sm: 'w-6 h-6',
    md: 'w-8 h-8',
    lg: 'w-10 h-10',
  };

  const iconSizes = {
    sm: 'h-3 w-3',
    md: 'h-4 w-4',
    lg: 'h-5 w-5',
  };

  return (
    <button
      onClick={handleToggle}
      disabled={loading}
      className={cn(
        'flex items-center justify-center rounded-full bg-white/90 backdrop-blur-sm shadow-md transition-all cursor-pointer',
        'hover:bg-gray-200 hover:scale-110 active:scale-95',
        loading && 'opacity-50 cursor-not-allowed',
        sizeClasses[size],
        className
      )}
      aria-label={isSaved ? 'Remove from saved' : 'Save listing'}
    >
      <Heart
        className={cn(
          'transition-colors',
          iconSizes[size],
          isSaved ? 'fill-red-500 text-red-500' : 'text-gray-600'
        )}
      />
    </button>
  );
}
