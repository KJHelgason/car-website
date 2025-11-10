'use client';

import { useState } from 'react';
import { useAuth } from '@/lib/auth-context';
import { saveSearch } from '@/lib/saved-items';
import { Button } from '@/components/ui/button';
import { Bookmark, BookmarkCheck } from 'lucide-react';
import { useLanguage } from '@/lib/language-context';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

interface SaveSearchButtonProps {
  searchParams: {
    make?: string;
    model?: string;
    year?: number;
    min_price?: number;
    max_price?: number;
    min_km?: number;
    max_km?: number;
    search_type: 'price_analysis' | 'car_list';
  };
  className?: string;
  variant?: 'default' | 'outline' | 'ghost';
  size?: 'default' | 'sm' | 'lg';
}

export function SaveSearchButton({
  searchParams,
  className,
  variant = 'outline',
  size = 'sm',
}: SaveSearchButtonProps) {
  const { user } = useAuth();
  const { t } = useLanguage();
  const [isOpen, setIsOpen] = useState(false);
  const [customName, setCustomName] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  const defaultName = [
    searchParams.make,
    searchParams.model,
    searchParams.year?.toString(),
  ]
    .filter(Boolean)
    .join(' ') || 'Unnamed Search';

  const handleSave = async () => {
    if (!user) {
      alert('Please log in to save searches');
      return;
    }

    setIsSaving(true);

    const result = await saveSearch(user.id, {
      ...searchParams,
      name: customName.trim() || defaultName,
    });

    setIsSaving(false);

    if (result.success) {
      setSaveSuccess(true);
      setTimeout(() => {
        setIsOpen(false);
        setSaveSuccess(false);
        setCustomName('');
      }, 1500);
    } else {
      alert('Failed to save search: ' + result.error);
    }
  };

  if (!user) {
    return null;
  }

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant={variant} size={size} className={className}>
          <Bookmark className="h-4 w-4 mr-2" />
          Save Search
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Save Search</DialogTitle>
          <DialogDescription>
            Save this search to quickly access it later
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="search-name">Search Name (optional)</Label>
            <Input
              id="search-name"
              placeholder={defaultName}
              value={customName}
              onChange={(e) => setCustomName(e.target.value)}
              disabled={isSaving || saveSuccess}
            />
          </div>

          <div className="text-sm text-muted-foreground space-y-1">
            <p>Search parameters:</p>
            <ul className="list-disc list-inside">
              {searchParams.make && <li>{t('saveSearch.make')}: {searchParams.make}</li>}
              {searchParams.model && <li>{t('saveSearch.model')}: {searchParams.model}</li>}
              {searchParams.year && <li>{t('search.year')}: {searchParams.year}</li>}
              {(searchParams.min_price || searchParams.max_price) && (
                <li>
                  {t('search.price')}: {searchParams.min_price || 0} -{' '}
                  {searchParams.max_price || '∞'} ISK
                </li>
              )}
              {(searchParams.min_km || searchParams.max_km) && (
                <li>
                  Kilometers: {searchParams.min_km || 0} -{' '}
                  {searchParams.max_km || '∞'} km
                </li>
              )}
            </ul>
          </div>

          <Button
            onClick={handleSave}
            disabled={isSaving || saveSuccess}
            className="w-full"
          >
            {saveSuccess ? (
              <>
                <BookmarkCheck className="h-4 w-4 mr-2" />
                Saved!
              </>
            ) : isSaving ? (
              'Saving...'
            ) : (
              <>
                <Bookmark className="h-4 w-4 mr-2" />
                Save
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
