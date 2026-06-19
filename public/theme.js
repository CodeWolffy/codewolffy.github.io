(() => {
  if (globalThis.__themeScriptApplied) return;
  globalThis.__themeScriptApplied = true;

  const getThemePreference = () => {
    if (typeof localStorage !== 'undefined' && localStorage.getItem('theme')) {
      return localStorage.getItem('theme');
    }
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  };

  const applyTheme = () => {
    const isDark = getThemePreference() === 'dark';
    document.documentElement.classList[isDark ? 'add' : 'remove']('dark');
  };

  // Apply theme on initial load
  applyTheme();

  if (typeof localStorage !== 'undefined') {
    const observer = new MutationObserver(() => {
      const isDark = document.documentElement.classList.contains('dark');
      localStorage.setItem('theme', isDark ? 'dark' : 'light');
    });
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['class'],
    });
  }

  // Preserve theme across View Transitions by copying dark class to new document
  document.addEventListener('astro:before-swap', (event) => {
    const isDark = document.documentElement.classList.contains('dark');
    event.newDocument.documentElement.classList[isDark ? 'add' : 'remove']('dark');
  });

  // Re-apply theme after View Transitions navigation (fallback)
  document.addEventListener('astro:after-swap', applyTheme);

  // 导航追踪：在导航前保存当前路径，用于"返回"按钮
  document.addEventListener('astro:before-preparation', () => {
    const currentPath = window.location.pathname;
    // 只在非文章页面时保存路径（避免文章页之间的跳转覆盖来源）
    if (!currentPath.startsWith('/blog/')) {
      sessionStorage.setItem('blog_previous_path', currentPath);
    }
  });
})();
