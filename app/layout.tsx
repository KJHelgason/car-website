import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
//import { Analytics as VercelAnalytics } from "@vercel/analytics/react";
import "./globals.css";
import Script from "next/script";
import CookieConsent from "@/components/CookieConsent";
import Footer from "@/components/Footer";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Car Price Analysis - Free Car Price Estimates & Market Analysis",
  description: "Get accurate car price estimates and market analysis. Compare prices, find deals, and make informed decisions when buying or selling a car.",
  keywords: ["car prices", "car valuation", "car market analysis", "used cars", "car price estimate"],
  authors: [{ name: "Car Price Analysis" }],
  openGraph: {
    title: "Car Price Analysis - Free Car Price Estimates",
    description: "Get accurate car price estimates and market analysis",
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
        <div className="flex-1">
          {children}
        </div>
        <Footer />
        <CookieConsent />
      </body>
    </html>
  );
}
