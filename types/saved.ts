export interface SavedSearch {
  id: number;
  user_id: string;
  make?: string;
  model?: string;
  year?: number;
  min_price?: number;
  max_price?: number;
  min_km?: number;
  max_km?: number;
  search_type: 'price_analysis' | 'car_list';
  created_at: string;
  name?: string; // Optional custom name for the search
}

export interface SavedListing {
  id: number;
  user_id: string;
  listing_id: number;
  created_at: string;
  // Joined fields from car_listings
  make?: string;
  model?: string;
  year?: number;
  price?: number;
  kilometers?: number;
  url?: string;
  image_url?: string;
  display_make?: string;
  display_name?: string;
}
