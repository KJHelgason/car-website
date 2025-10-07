'use client';

import CookieConsentLib from 'react-cookie-consent';
import Link from 'next/link';

export default function CookieConsent() {
  const handleAccept = () => {
    // Enable Google Analytics when user accepts
    if (typeof window !== 'undefined' && window.gtag) {
      window.gtag('consent', 'update', {
        analytics_storage: 'granted',
        ad_storage: 'granted',
        ad_user_data: 'granted',
        ad_personalization: 'granted',
      });
    }
  };

  const handleDecline = () => {
    // Disable tracking when user declines
    if (typeof window !== 'undefined' && window.gtag) {
      window.gtag('consent', 'update', {
        analytics_storage: 'denied',
        ad_storage: 'denied',
        ad_user_data: 'denied',
        ad_personalization: 'denied',
      });
    }
  };

  return (
    <CookieConsentLib
      location="bottom"
      buttonText="Accept All"
      declineButtonText="Reject"
      cookieName="userCookieConsent"
      style={{
        background: 'hsl(var(--background))',
        borderTop: '1px solid hsl(var(--border))',
        color: 'hsl(var(--foreground))',
        padding: '1rem',
        alignItems: 'center',
        boxShadow: '0 -2px 10px rgba(0,0,0,0.1)',
      }}
      buttonStyle={{
        background: 'hsl(var(--primary))',
        color: 'hsl(var(--primary-foreground))',
        fontSize: '14px',
        padding: '10px 20px',
        borderRadius: '6px',
        border: 'none',
        cursor: 'pointer',
        fontWeight: '500',
      }}
      declineButtonStyle={{
        background: 'transparent',
        color: 'hsl(var(--muted-foreground))',
        fontSize: '14px',
        padding: '10px 20px',
        borderRadius: '6px',
        border: '1px solid hsl(var(--border))',
        cursor: 'pointer',
        marginRight: '10px',
      }}
      enableDeclineButton
      onAccept={handleAccept}
      onDecline={handleDecline}
      expires={365}
    >
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 max-w-6xl mx-auto">
        <div className="flex-1">
          <p className="text-sm">
            We use cookies to enhance your browsing experience, serve personalized ads or content, 
            and analyze our traffic. By clicking &quot;Accept All&quot;, you consent to our use of cookies.{' '}
            <Link href="/privacy-policy" className="underline hover:text-primary">
              Privacy Policy
            </Link>
          </p>
        </div>
      </div>
    </CookieConsentLib>
  );
}
