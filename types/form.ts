export interface CarItem {
  make: string;
  model: string;
  year: string;  // Can be 'all' or a specific year
  kilometers: number;
  price?: number;
}
