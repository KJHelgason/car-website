export interface PriceModel {
  id: number;
  make_norm: string | null;
  model_base: string | null;
  coef_json: {
    intercept: number;
    beta_age: number;
    beta_logkm: number;
    beta_age_logkm: number;
  };
  n_samples: number;
  r2: number;
  rmse: number;
  trained_at: string;
}

export interface CarListing {
  id: number;
  make: string;
  model: string;
  make_norm: string;
  model_base: string;
  year: string;
  kilometers: number;
  price: number;
  scraped_at: string;
  url?: string;
}

export interface CarPricePoint {
  kilometers: number;
  price: number;
  searchPrice?: number;
  isTarget?: boolean;
  isCurve?: boolean;
  name?: string;
  year?: string;
  yearRange?: string;
  url?: string;
}

export interface CarAnalysis {
  targetCar: CarPricePoint;
  similarListings: CarPricePoint[];
  priceCurves: {
    [year: string]: CarPricePoint[];
  };
  priceModel: PriceModel;
  estimatedPrice: number;
  priceRange: {
    low: number;
    high: number;
  };
}
