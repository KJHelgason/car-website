'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/lib/auth-context';
import { getSavedSearches } from '@/lib/saved-items';
import type { SavedSearch } from '@/types/saved';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { Search, Calendar, DollarSign } from 'lucide-react';
import { useLanguage } from '@/lib/language-context';

export function SavedSearchesDropdown() {
  const { user } = useAuth();
  const { t } = useLanguage();
  const [searches, setSearches] = useState<SavedSearch[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      setSearches([]);
      setLoading(false);
      return;
    }

    const fetchSearches = async () => {
      setLoading(true);
      const data = await getSavedSearches(user.id, 5);
      setSearches(data);
      setLoading(false);
    };

    fetchSearches();
  }, [user]);

  if (!user) {
    return (
      <div className="p-4 text-center text-sm text-muted-foreground">
        <p>Please log in to view saved searches</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="p-4">
        <div className="space-y-2">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-16 bg-muted animate-pulse rounded" />
          ))}
        </div>
      </div>
    );
  }

  if (searches.length === 0) {
    return (
      <div className="p-4 text-center text-sm text-muted-foreground">
        <Search className="h-8 w-8 mx-auto mb-2 opacity-50" />
        <p>{t('saved.noSavedSearches')}</p>
        <p className="text-xs mt-1">{t('saved.searchForCars')}</p>
      </div>
    );
  }

  const formatSearchLabel = (search: SavedSearch) => {
    if (search.name) return search.name;
    
    const parts: string[] = [];
    if (search.make) parts.push(search.make);
    if (search.model) parts.push(search.model);
    if (search.year) parts.push(search.year.toString());
    
    return parts.length > 0 ? parts.join(' ') : 'Unnamed Search';
  };

  const formatSearchDetails = (search: SavedSearch) => {
    const details: string[] = [];
    
    if (search.min_price || search.max_price) {
      const min = search.min_price ? `${(search.min_price / 1000).toFixed(0)}k` : '0';
      const max = search.max_price ? `${(search.max_price / 1000).toFixed(0)}k` : '∞';
      details.push(`${min} - ${max} ISK`);
    }
    
    if (search.min_km || search.max_km) {
      const min = search.min_km ? `${(search.min_km / 1000).toFixed(0)}k` : '0';
      const max = search.max_km ? `${(search.max_km / 1000).toFixed(0)}k` : '∞';
      details.push(`${min} - ${max} km`);
    }
    
    return details.join(' • ');
  };

  return (
    <div className="w-80 max-w-sm">
      <div className="p-2 space-y-1 max-h-96 overflow-y-auto">
        {searches.map((search) => (
          <Link
            key={search.id}
            href={
              search.search_type === 'price_analysis'
                ? `/?make=${search.make || ''}&model=${search.model || ''}&year=${search.year || ''}`
                : `/search?make=${search.make || ''}&model=${search.model || ''}`
            }
            className="block p-3 hover:bg-muted rounded-lg transition-colors"
          >
            <div className="flex items-start gap-3">
              <div className="p-2 bg-primary/10 rounded-lg">
                <Search className="h-4 w-4 text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-medium text-sm truncate">
                  {formatSearchLabel(search)}
                </div>
                {formatSearchDetails(search) && (
                  <div className="text-xs text-muted-foreground mt-1">
                    {formatSearchDetails(search)}
                  </div>
                )}
                <div className="text-xs text-muted-foreground mt-1">
                  {new Date(search.created_at).toLocaleDateString()}
                </div>
              </div>
            </div>
          </Link>
        ))}
      </div>
      
      <div className="border-t border-border p-2">
        <Link href="/saved-searches" className="block w-full">
          <Button variant="ghost" className="cursor-pointer w-full justify-center text-sm">
            See All Saved Searches
          </Button>
        </Link>
      </div>
    </div>
  );
}
