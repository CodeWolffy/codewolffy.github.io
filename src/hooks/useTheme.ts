import { useSyncExternalStore } from 'react';

export type Theme = 'light' | 'dark';

function subscribeTheme(callback: () => void) {
  if (typeof document === 'undefined') return () => {};

  document.addEventListener('astro:after-swap', callback);

  const observer = new MutationObserver((mutations) => {
    if (mutations.some((m) => m.attributeName === 'class')) {
      callback();
    }
  });
  observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });

  return () => {
    document.removeEventListener('astro:after-swap', callback);
    observer.disconnect();
  };
}

function getThemeSnapshot(): Theme {
  return typeof document !== 'undefined' && document.documentElement.classList.contains('dark')
    ? 'dark'
    : 'light';
}

function getServerThemeSnapshot(): Theme {
  return 'light';
}

export function useTheme() {
  return useSyncExternalStore(subscribeTheme, getThemeSnapshot, getServerThemeSnapshot);
}
