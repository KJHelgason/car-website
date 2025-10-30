'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/lib/auth-context';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Trash2, Search } from 'lucide-react';

interface SavedSearch {
  id: string;
  search_name: string;
  search_mode: string;
  make?: string;
  model?: string;
  year?: string;
  min_year?: string;
  max_year?: string;
  kilometers?: string;
  min_kilometers?: string;
  max_kilometers?: string;
  price?: string;
  min_price?: string;
  max_price?: string;
  created_at: string;
}

export default function SavedSearchesPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [searches, setSearches] = useState<SavedSearch[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login');
      return;
    }

    if (user) {
      loadSavedSearches();
    }
  }, [user, authLoading, router]);

  const loadSavedSearches = async () => {
    if (!user) return;

    setLoading(true);

    const { data, error } = await supabase
      .from('saved_searches')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (!error && data) {
      setSearches(data as SavedSearch[]);
    }

    setLoading(false);
  };

  const handleDelete = async (id: string) => {
    const { error } = await supabase
      .from('saved_searches')
      .delete()
      .eq('id', id);

    if (!error) {
      setSearches(searches.filter(s => s.id !== id));
    }
  };

  const buildSearchUrl = (search: SavedSearch) => {
    const params = new URLSearchParams();
    
    if (search.make) params.set('make', search.make);
    if (search.model) params.set('model', search.model);
    if (search.year) params.set('year', search.year);
    if (search.min_year) params.set('minYear', search.min_year);
    if (search.max_year) params.set('maxYear', search.max_year);
    if (search.kilometers) params.set('kilometers', search.kilometers);
    if (search.min_kilometers) params.set('minKilometers', search.min_kilometers);
    if (search.max_kilometers) params.set('maxKilometers', search.max_kilometers);
    if (search.price) params.set('price', search.price);
    if (search.min_price) params.set('minPrice', search.min_price);
    if (search.max_price) params.set('maxPrice', search.max_price);
    if (search.search_mode) params.set('mode', search.search_mode);
    
    return `/?${params.toString()}`;
  };

  if (authLoading || loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold mb-6">Saved Searches</h1>
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-32 bg-muted animate-pulse rounded-lg" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-6">Saved Searches</h1>
      
      {searches.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-muted-foreground text-lg mb-4">
            You haven&apos;t saved any searches yet.
          </p>
          <Link href="/" className="text-primary hover:underline">
            Create a search to get started
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {searches.map((search) => (
            <Card key={search.id}>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span className="truncate">{search.search_name}</span>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleDelete(search.id)}
                    className="text-destructive hover:text-destructive"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 text-sm text-muted-foreground mb-4">
                  <p><strong>Mode:</strong> {search.search_mode === 'analysis' ? 'Price Analysis' : 'Range Search'}</p>
                  {search.make && <p><strong>Make:</strong> {search.make}</p>}
                  {search.model && <p><strong>Model:</strong> {search.model}</p>}
                  {search.year && <p><strong>Year:</strong> {search.year}</p>}
                  {(search.min_year || search.max_year) && (
                    <p><strong>Year Range:</strong> {search.min_year || 'Any'} - {search.max_year || 'Any'}</p>
                  )}
                  {(search.min_price || search.max_price) && (
                    <p><strong>Price Range:</strong> {search.min_price || 'Any'} - {search.max_price || 'Any'}</p>
                  )}
                </div>
                <Button variant="outline" size="sm" className="w-full gap-2" asChild>
                  <Link href={buildSearchUrl(search)}>
                    <Search className="h-4 w-4" />
                    Run Search
                  </Link>
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
