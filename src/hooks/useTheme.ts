import { useEffect, useState } from 'react';

export type Theme = 'light' | 'dark';

export function useTheme() {
  const [theme, setTheme] = useState<Theme>(() => {
    if (typeof document === 'undefined') return 'light';
    return document.documentElement.classList.contains('dark') ? 'dark' : 'light';
  });

  useEffect(() => {
    const syncTheme = () => {
      setTheme(document.documentElement.classList.contains('dark') ? 'dark' : 'light');
    };

    // Initial sync
    syncTheme();

    // Listen for View Transitions navigation
    document.addEventListener('astro:after-swap', syncTheme);

    // Listen for class changes on documentElement (for external theme changes)
    const observer = new MutationObserver((mutations) => {
      if (mutations.some((m) => m.attributeName === 'class')) {
        syncTheme();
      }
    });
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });

    return () => {
      document.removeEventListener('astro:after-swap', syncTheme);
      observer.disconnect();
    };
  }, []);

  return theme;
}
