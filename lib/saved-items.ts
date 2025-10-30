'use client';

import { supabase } from './supabase';
import type { SavedSearch, SavedListing } from '@/types/saved';

// ==================== SAVED SEARCHES ====================

export async function getSavedSearches(userId: string, limit?: number): Promise<SavedSearch[]> {
  let query = supabase
    .from('saved_searches')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  if (limit) {
    query = query.limit(limit);
  }

  const { data, error } = await query;
  
  if (error) {
    console.error('Error fetching saved searches:', error);
    return [];
  }
  
  return data || [];
}

export async function saveSearch(
  userId: string,
  searchParams: {
    make?: string;
    model?: string;
    year?: number;
    min_price?: number;
    max_price?: number;
    min_km?: number;
    max_km?: number;
    search_type: 'price_analysis' | 'car_list';
    name?: string;
  }
): Promise<{ success: boolean; error?: string }> {
  const { error } = await supabase
    .from('saved_searches')
    .insert([
      {
        user_id: userId,
        ...searchParams,
      },
    ]);

  if (error) {
    console.error('Error saving search:', error);
    return { success: false, error: error.message };
  }

  return { success: true };
}

export async function deleteSavedSearch(searchId: number): Promise<{ success: boolean; error?: string }> {
  const { error } = await supabase
    .from('saved_searches')
    .delete()
    .eq('id', searchId);

  if (error) {
    console.error('Error deleting saved search:', error);
    return { success: false, error: error.message };
  }

  return { success: true };
}

// ==================== SAVED LISTINGS ====================

export async function getSavedListings(userId: string, limit?: number): Promise<SavedListing[]> {
  let query = supabase
    .from('saved_listings')
    .select(`
      id,
      user_id,
      listing_id,
      created_at,
      car_listings (
        make,
        model,
        year,
        price,
        kilometers,
        url,
        image_url,
        display_make,
        display_name
      )
    `)
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  if (limit) {
    query = query.limit(limit);
  }

  const { data, error } = await query;
  
  if (error) {
    console.error('Error fetching saved listings:', error);
    return [];
  }
  
  // Flatten the joined data
  return (data || []).map((item: any) => ({
    id: item.id,
    user_id: item.user_id,
    listing_id: item.listing_id,
    created_at: item.created_at,
    make: item.car_listings?.make,
    model: item.car_listings?.model,
    year: item.car_listings?.year,
    price: item.car_listings?.price,
    kilometers: item.car_listings?.kilometers,
    url: item.car_listings?.url,
    image_url: item.car_listings?.image_url,
    display_make: item.car_listings?.display_make,
    display_name: item.car_listings?.display_name,
  }));
}

export async function isListingSaved(userId: string, listingId: number): Promise<boolean> {
  const { data, error } = await supabase
    .from('saved_listings')
    .select('id')
    .eq('user_id', userId)
    .eq('listing_id', listingId)
    .maybeSingle();

  if (error) {
    console.error('Error checking if listing is saved:', error);
    return false;
  }

  return !!data;
}

export async function saveListing(
  userId: string,
  listingId: number
): Promise<{ success: boolean; error?: string }> {
  const { error } = await supabase
    .from('saved_listings')
    .insert([
      {
        user_id: userId,
        listing_id: listingId,
      },
    ]);

  if (error) {
    console.error('Error saving listing:', error);
    return { success: false, error: error.message };
  }

  return { success: true };
}

export async function removeSavedListing(
  userId: string,
  listingId: number
): Promise<{ success: boolean; error?: string }> {
  const { error } = await supabase
    .from('saved_listings')
    .delete()
    .eq('user_id', userId)
    .eq('listing_id', listingId);

  if (error) {
    console.error('Error removing saved listing:', error);
    return { success: false, error: error.message };
  }

  return { success: true };
}
