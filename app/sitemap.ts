import { MetadataRoute } from 'next'

export const dynamic = 'force-static'
export const revalidate = 3600 // Revalidate every hour

export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl = 'https://bilaleiga.is'
  
  return [
    {
      url: baseUrl,
      lastModified: new Date(),
      changeFrequency: 'hourly',
      priority: 1,
    },
    {
      url: `${baseUrl}/sold-cars`,
      lastModified: new Date(),
      changeFrequency: 'daily',
      priority: 0.8,
    },
    {
      url: `${baseUrl}/saved-listings`,
      lastModified: new Date(),
      changeFrequency: 'weekly',
      priority: 0.5,
    },
    {
      url: `${baseUrl}/saved-searches`,
      lastModified: new Date(),
      changeFrequency: 'weekly',
      priority: 0.5,
    },
  ]
}
