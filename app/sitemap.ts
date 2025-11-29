import { MetadataRoute } from 'next';
import { CAR_LANDING_PAGES } from '@/lib/car-landing-pages';

export const dynamic = 'force-static';
export const revalidate = 3600; // Revalidate every hour

const baseUrl = 'https://bilaleiga.is';

const staticPages: Array<{ path: string; changeFrequency: MetadataRoute.Sitemap[number]['changeFrequency']; priority: number }> = [
  { path: '/', changeFrequency: 'daily', priority: 1 },
  { path: '/sold-cars', changeFrequency: 'daily', priority: 0.8 },
  { path: '/cars', changeFrequency: 'weekly', priority: 0.75 },
  { path: '/about', changeFrequency: 'weekly', priority: 0.6 },
  { path: '/contact', changeFrequency: 'monthly', priority: 0.5 },
  { path: '/privacy-policy', changeFrequency: 'yearly', priority: 0.3 },
  { path: '/terms', changeFrequency: 'yearly', priority: 0.3 },
];

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();

  const guideEntries: MetadataRoute.Sitemap = CAR_LANDING_PAGES.map((guide) => ({
    url: `${baseUrl}/cars/${guide.makeSlug}/${guide.modelSlug}`,
    lastModified: now,
    changeFrequency: 'weekly',
    priority: 0.7,
  }));

  const baseEntries: MetadataRoute.Sitemap = staticPages.map((entry) => ({
    url: `${baseUrl}${entry.path}`,
    lastModified: now,
    changeFrequency: entry.changeFrequency,
    priority: entry.priority,
  }));

  return [...baseEntries, ...guideEntries];
}
