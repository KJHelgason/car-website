import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
//import { Analytics as VercelAnalytics } from "@vercel/analytics/react";
import "./globals.css";
import Script from "next/script";
import CookieConsent from "@/components/CookieConsent";
import Footer from "@/components/Footer";
import { HeaderProvider } from "@/components/ClientHeader";
import { AuthProvider } from "@/lib/auth-context";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Allir Bilar - Find Your Perfect Car",
  description: "Browse and search car listings. Get accurate car price estimates and market analysis. Save your favorite listings and searches.",
  keywords: ["car prices", "car listings", "used cars", "car search", "car price estimate"],
  authors: [{ name: "Allir Bilar" }],
  openGraph: {
    title: "Allir Bilar - Find Your Perfect Car",
    description: "Browse and search car listings with price analysis",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const GA_ID = process.env.NEXT_PUBLIC_GA_ID;

  return (
    <html lang="en">
      <head>
        {/* Google AdSense */}
        <Script
          id="adsense-script"
          strategy="afterInteractive"
          async
          src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-1682128968609505"
          crossOrigin="anonymous"
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
        <AuthProvider>
          <HeaderProvider>
            <div className="flex-1">
              {children}
            </div>
          </HeaderProvider>
          <Footer />
          <CookieConsent />
        </AuthProvider>
      </body>
    </html>
  );
}
