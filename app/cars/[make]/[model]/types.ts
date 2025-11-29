export interface ListingRow {
  id: number;
  year: number;
  price: number;
  kilometers: number | null;
  url: string | null;
  scraped_at: string;
  source?: string | null;
}

export interface ListingStats {
  sampleSize: number;
  totalActive: number;
  avgPrice?: number;
  medianPrice?: number;
  priceRange?: [number, number];
  avgKm?: number;
  medianKm?: number;
  recentListings: ListingRow[];
  lastIndexed?: string;
  salesPastYear?: number;
}
