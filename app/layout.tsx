import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
//import { Analytics as VercelAnalytics } from "@vercel/analytics/react";
import "./globals.css";
import Script from "next/script";
import CookieConsent from "@/components/CookieConsent";
import Footer from "@/components/Footer";
import { HeaderProvider } from "@/components/ClientHeader";
import { AuthProvider } from "@/lib/auth-context";
import { LanguageProvider } from "@/lib/language-context";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  metadataBase: new URL('https://bilaleiga.is'),
  title: "Allir Bilar - Find Your Perfect Car",
  description: "Browse and search car listings. Get accurate car price estimates and market analysis. Save your favorite listings and searches.",
  keywords: ["car prices", "car listings", "used cars", "car search", "car price estimate", "Iceland cars", "bílar", "bílaleit"],
  authors: [{ name: "Allir Bilar" }],
  openGraph: {
    title: "Allir Bilar - Find Your Perfect Car",
    description: "Browse and search car listings with price analysis",
    type: "website",
    locale: "en_US",
    alternateLocale: "is_IS",
    siteName: "Allir Bilar",
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  alternates: {
    canonical: 'https://bilaleiga.is',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const GA_ID = process.env.NEXT_PUBLIC_GA_ID;

  const structuredData = {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: 'Allir Bilar',
    url: 'https://bilaleiga.is',
    description: 'Browse and search car listings. Get accurate car price estimates and market analysis.',
    potentialAction: {
      '@type': 'SearchAction',
      target: {
        '@type': 'EntryPoint',
        urlTemplate: 'https://bilaleiga.is/?search={search_term_string}',
      },
      'query-input': 'required name=search_term_string',
    },
  };

  return (
    <html lang="en">
      <head>
        {/* Structured Data */}
        <Script
          id="structured-data"
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
        />
        
        <meta name="google-adsense-account" content="ca-pub-1682128968609505" />

        {/* Google Analytics (GA4) - static snippet */}
        {GA_ID && (
          <>
            <Script
              src={`https://www.googletagmanager.com/gtag/js?id=${GA_ID}`}
              strategy="afterInteractive"
            />
            <Script id="ga4-static" strategy="afterInteractive">
              {`
                window.dataLayer = window.dataLayer || [];
                function gtag(){dataLayer.push(arguments);}
                
                // Set default consent to denied
                gtag('consent', 'default', {
                  'analytics_storage': 'denied',
                  'ad_storage': 'denied',
                  'ad_user_data': 'denied',
                  'ad_personalization': 'denied',
                  'wait_for_update': 500
                });
                
                gtag('js', new Date());
                gtag('config', '${GA_ID}');
              `}
            </Script>
          </>
        )}
      </head>
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased flex flex-col min-h-screen`}>
        {/* Google AdSense - moved outside head to avoid data-nscript warning */}
        <Script
          id="adsense-script"
          strategy="afterInteractive"
          async
          src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-1682128968609505"
          crossOrigin="anonymous"
        />
        
        <AuthProvider>
          <LanguageProvider>
            <HeaderProvider>
              <div className="flex-1">
                {children}
              </div>
            </HeaderProvider>
            <Footer />
            <CookieConsent />
          </LanguageProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
