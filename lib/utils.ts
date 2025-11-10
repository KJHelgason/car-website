import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function getPriceDifferenceColor(priceDiff: number): string {
  if (priceDiff >= 10) return "text-green-600";
  if (priceDiff <= -10) return "text-red-600";
  return "text-yellow-600";
}

export function formatPriceDifference(
  priceDiff: number,
  t?: (key: string) => string
): string {
  if (!t) {
    // Fallback for backward compatibility
    return `${Math.abs(priceDiff).toFixed(1)}% ${priceDiff > 0 ? 'below' : 'above'} estimate`;
  }
  const direction = priceDiff > 0 ? t('deals.belowEstimate') : t('deals.aboveEstimate');
  return `${Math.abs(priceDiff).toFixed(1)}% ${direction}`;
}
