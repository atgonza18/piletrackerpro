'use client';

import { useEffect, Suspense } from 'react';
import { usePathname, useSearchParams } from 'next/navigation';
import NProgress from 'nprogress';

// Configure NProgress for instant feedback
NProgress.configure({
  showSpinner: false,
  trickleSpeed: 100,
  minimum: 0.02,
  easing: 'ease',
  speed: 300,
});

function NavigationProgressInner() {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  useEffect(() => {
    // Complete progress bar immediately
    NProgress.done();
  }, [pathname, searchParams]);

  useEffect(() => {
    // Start progress bar on any link click
    const handleStart = () => {
      NProgress.start();
    };

    // Add event listener for all link clicks
    document.addEventListener('click', (e) => {
      const target = e.target as HTMLElement;
      const link = target.closest('a, button[type="button"]');
      if (link) {
        handleStart();
      }
    });

    return () => {
      NProgress.done();
    };
  }, []);

  return null;
}

export default function NavigationProgress() {
  return (
    <Suspense fallback={null}>
      <NavigationProgressInner />
    </Suspense>
  );
}
