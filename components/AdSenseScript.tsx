'use client';

import { useEffect } from 'react';

const ADSENSE_SRC =
  'https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-1682128968609505';

export function AdSenseScript() {
  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    const existing = document.querySelector<HTMLScriptElement>(`script[src="${ADSENSE_SRC}"]`);
    if (existing) {
      return;
    }

    const script = document.createElement('script');
    script.async = true;
    script.src = ADSENSE_SRC;
    script.crossOrigin = 'anonymous';

    document.head.appendChild(script);
  }, []);

  return null;
}
