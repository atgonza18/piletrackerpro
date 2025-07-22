'use client';

import { useEffect, useState } from 'react';
import { usePathname, useSearchParams } from 'next/navigation';

export function NavigationEvents() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isLoading, setIsLoading] = useState(false);

  // When the route changes, show loading indicator and then hide it
  useEffect(() => {
    const url = pathname + searchParams.toString();
    
    // Custom event dispatcher for page changes
    const dispatchRouteChangeStart = () => {
      const event = new Event('routeChangeStart');
      window.dispatchEvent(event);
      setIsLoading(true);
    };
    
    const dispatchRouteChangeComplete = () => {
      const event = new Event('routeChangeComplete');
      window.dispatchEvent(event);
      setIsLoading(false);
    };

    // Simulate route change events
    dispatchRouteChangeStart();
    
    // Small delay to simulate loading
    const timeout = setTimeout(() => {
      dispatchRouteChangeComplete();
    }, 500);
    
    return () => clearTimeout(timeout);
  }, [pathname, searchParams]);

  return null;
} 