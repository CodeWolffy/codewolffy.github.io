import { expect, test, type Page } from '@playwright/test';
import { readFileSync } from 'node:fs';

declare global {
  interface Window {
    __siteMetrics?: { lcp: number; cls: number };
  }
}

async function openPage(page: Page, path: string) {
  const response = await page.goto(path);
  expect(response?.status()).toBe(200);
  await page.locator('astro-island[component-export="Header"]:not([ssr])').waitFor();
  await expect(page.locator('astro-island[client="load"][ssr]')).toHaveCount(0);
}

test.beforeEach(async ({ context }) => {
  // External comments, counters and social sites are outside this build's smoke tests.
  await context.route('**/*', (route) => {
    const { hostname } = new URL(route.request().url());
    return hostname === '127.0.0.1' ? route.continue() : route.abort();
  });
});

test('search keeps a skeleton while typing and never flashes intermediate result counts', async ({
  page,
}) => {
  await openPage(page, '/');
  await page.getByRole('button', { name: '展开搜索', exact: true }).click();
  const panel = page.getByRole('region', { name: '搜索结果' });
  await expect(panel.getByRole('status')).toBeVisible();
  const input = page.getByRole('searchbox', { name: '搜索文章' });
  await input.waitFor();

  await page.evaluate(() => {
    const target = document.getElementById('pagefind-results');
    if (!target) throw new Error('Missing #pagefind-results');
    const seenMessages: string[] = [];
    (window as Window & { __seenSearchMessages?: string[] }).__seenSearchMessages = seenMessages;
    const observer = new MutationObserver(() => {
      if (target.classList.contains('hidden')) return;
      const msg = target.querySelector('.pagefind-ui__message')?.textContent?.trim();
      if (msg && seenMessages.at(-1) !== msg) seenMessages.push(msg);
    });
    observer.observe(target, { childList: true, subtree: true, characterData: true });
    observer.observe(target, { attributes: true, attributeFilter: ['class'] });
  });

  await input.pressSequentially('Redis', { delay: 80 });
  await expect(
    page.getByRole('link', { name: 'Redis 为什么快？“单线程”解释远远不够', exact: true })
  ).toBeVisible();

  const messages = await page.evaluate(
    () => (window as Window & { __seenSearchMessages?: string[] }).__seenSearchMessages ?? []
  );
  expect(messages.length).toBeGreaterThan(0);
  expect(messages.every((msg) => msg.includes('Redis'))).toBe(true);
});

test('search survives navigation and restores the page after closing', async ({ page }) => {
  await openPage(page, '/');
  await page.getByRole('button', { name: '展开搜索', exact: true }).click();
  await page.getByRole('searchbox', { name: '搜索文章' }).fill('Redis');
  await page
    .getByRole('link', { name: 'Redis 为什么快？“单线程”解释远远不够', exact: true })
    .click();
  await expect(page).toHaveURL(/\/blog\/01-why-redis-is-fast\/$/);
  await expect(page.getByRole('heading', { level: 1 })).toHaveText(
    'Redis 为什么快？“单线程”解释远远不够'
  );
  await page.getByRole('button', { name: '展开搜索', exact: true }).click();
  const input = page.getByRole('searchbox', { name: '搜索文章' });
  await input.fill('Kafka');
  await expect(page.getByRole('region', { name: '搜索结果' })).toContainText('Kafka');
  await expect(page.locator('#pagefind-ui-css')).toHaveCount(1);
  await input.press('Escape');
  await expect(input).toHaveValue('');
  await input.press('Escape');
  await expect(page.getByRole('searchbox', { name: '搜索文章' })).toHaveCount(0);
  await expect(page.getByRole('button', { name: '展开搜索', exact: true })).toBeFocused();
  expect(await page.locator('html').evaluate((element) => element.style.overflow)).not.toBe(
    'hidden'
  );
});

test('keyboard search keeps Escape while the desktop music panel is open', async ({
  page,
}, testInfo) => {
  test.skip(
    testInfo.project.name !== 'desktop',
    'The mobile player intentionally blocks background shortcuts.'
  );
  await openPage(page, '/');
  await page.getByRole('button', { name: '展开音乐播放器', exact: true }).click();
  await expect(page.getByRole('button', { name: '折叠音乐播放器', exact: true })).toBeVisible();
  await page.keyboard.press('Control+k');
  const search = page.getByRole('searchbox', { name: '搜索文章' });
  await search.fill('Redis');
  await search.press('Escape');
  await expect(search).toHaveValue('');
  await expect(search).toBeFocused();
  await expect(page.getByRole('button', { name: '折叠音乐播放器', exact: true })).toBeVisible();
  await search.press('Escape');
  await expect(search).toHaveCount(0);
  await expect(page.getByRole('button', { name: '展开搜索', exact: true })).toBeFocused();
  const closePlayer = page.getByRole('button', { name: '折叠音乐播放器', exact: true });
  await closePlayer.focus();
  await closePlayer.press('Escape');
  await expect(page.getByRole('button', { name: '展开音乐播放器', exact: true })).toBeFocused();
});

test('Mermaid renders SVGs, changes theme and keeps fullscreen focus inside the dialog', async ({
  page,
}) => {
  await openPage(page, '/blog/dataschema/');
  const diagram = page.locator('.mermaid-container').first();
  await diagram.scrollIntoViewIfNeeded();
  await expect(page.locator('.mermaid[data-processed] svg')).toHaveCount(3);
  await page.getByRole('button', { name: 'Toggle theme', exact: true }).click();
  const theme = await page
    .locator('html')
    .evaluate((element) => (element.classList.contains('dark') ? 'dark' : 'light'));
  await expect(page.locator(`.mermaid[data-render-theme="${theme}"] svg`)).toHaveCount(3);
  const open = page.getByRole('button', { name: '全屏查看', exact: true }).first();
  await open.click();
  const modal = page.locator('dialog.mermaid-modal[open]');
  await expect(modal).toBeVisible();
  expect(await modal.evaluate((element) => element.contains(document.activeElement))).toBe(true);
  for (let index = 0; index < 6; index += 1) {
    await page.keyboard.press('Tab');
    expect(await modal.evaluate((element) => element.contains(document.activeElement))).toBe(true);
  }
  await page.keyboard.press('Escape');
  await expect(modal).toHaveCount(0);
  await expect(open).toBeFocused();
  expect(await page.locator('html').evaluate((element) => element.style.overflow)).not.toBe(
    'hidden'
  );
});

test('tag animations have a bounded delay and single-post tags remain available without indexing', async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await openPage(page, '/categories/');
  const entranceDuration = await page
    .locator('#main-content')
    .evaluate((el) => Number.parseFloat(getComputedStyle(el).animationDuration) || 0);
  expect(entranceDuration).toBeGreaterThan(0);
  expect(entranceDuration).toBeLessThanOrEqual(0.2);
  const delays = await page
    .locator('a[href^="/tags/"]')
    .evaluateAll((links) =>
      links.map((link) => Number.parseFloat(getComputedStyle(link).animationDelay) || 0)
    );
  expect(Math.max(...delays)).toBeLessThanOrEqual(0.25);
  await openPage(page, '/tags/IO%E5%A4%9A%E8%B7%AF%E5%A4%8D%E7%94%A8/');
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute('content', 'noindex,follow');
  await expect(page.locator('link[rel="canonical"]')).toHaveAttribute(
    'href',
    /^https:\/\/codewolffy\.pages\.dev\//
  );
});

test('mobile menu and music panel can close without retaining a scroll lock', async ({
  page,
}, testInfo) => {
  await openPage(page, '/');
  if (testInfo.project.name === 'mobile') {
    await page.getByRole('button', { name: '打开菜单', exact: true }).click();
    await expect(page.getByRole('navigation', { name: '移动端导航' })).toBeVisible();
    await page
      .getByRole('navigation', { name: '移动端导航' })
      .getByRole('link', { name: '归档', exact: true })
      .click();
    await expect(page).toHaveURL(/\/archives\/$/);
    await expect(page.getByRole('button', { name: '打开菜单', exact: true })).toBeVisible();
  }
  await page.getByRole('button', { name: '展开音乐播放器', exact: true }).click();
  await expect(page.getByRole('button', { name: '播放音乐', exact: true })).toBeVisible();
  await page.getByRole('button', { name: '折叠音乐播放器', exact: true }).click();
  await expect(page.getByRole('button', { name: '展开音乐播放器', exact: true })).toBeFocused();
  expect(await page.locator('html').evaluate((element) => element.style.overflow)).not.toBe(
    'hidden'
  );
  expect(await page.locator('body').evaluate((element) => element.style.position)).not.toBe(
    'fixed'
  );
});

test('home uses small responsive avatars and records a cold-page performance baseline', async ({
  page,
}, testInfo) => {
  await page.addInitScript(() => {
    const metrics = { lcp: 0, cls: 0 };
    Object.defineProperty(window, '__siteMetrics', { value: metrics });
    new PerformanceObserver((list) => {
      metrics.lcp = list.getEntries().at(-1)?.startTime ?? 0;
    }).observe({ type: 'largest-contentful-paint', buffered: true });
    new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        const shift = entry as PerformanceEntry & { hadRecentInput: boolean; value: number };
        if (!shift.hadRecentInput) metrics.cls += shift.value;
      }
    }).observe({ type: 'layout-shift', buffered: true });
  });
  await openPage(page, '/');
  await page.waitForLoadState('networkidle');
  const metrics = await page.evaluate(() => {
    const entries = performance.getEntriesByType('resource') as PerformanceResourceTiming[];
    const timing = window.__siteMetrics;
    if (!timing) throw new Error('Performance observers did not initialize.');
    return {
      ...timing,
      viewport: { width: innerWidth, height: innerHeight, dpr: devicePixelRatio },
      resources: entries.map(({ name, transferSize, decodedBodySize }) => ({
        name,
        transferSize,
        decodedBodySize,
      })),
      horizontalOverflow: document.documentElement.scrollWidth > innerWidth,
      avatarSources: [...document.querySelectorAll<HTMLImageElement>('aside picture img')].map(
        (image) => image.currentSrc
      ),
    };
  });
  expect(metrics.horizontalOverflow).toBe(false);
  expect(
    metrics.avatarSources.some((source) => source.includes('/images/generated/avatars/'))
  ).toBe(true);
  expect(metrics.resources.some(({ name }) => name.endsWith('/images/pages/avatar.jpg'))).toBe(
    false
  );
  await testInfo.attach(`home-performance-${testInfo.project.name}.json`, {
    body: Buffer.from(JSON.stringify(metrics, null, 2)),
    contentType: 'application/json',
  });
});

test('server modules and build configuration are not public assets', async ({ request }) => {
  for (const path of [
    '/server/entry.mjs',
    '/client/index.html',
    '/wrangler.toml',
    '/.build-target.json',
    '/_worker.js/server/entry.mjs',
  ]) {
    const response = await request.get(path);
    expect(response.status(), path).toBe(404);
  }
});

test('the Cloudflare build serves its CMS entry and correct audio ranges', async ({ request }) => {
  const { target: buildTarget } = JSON.parse(readFileSync('.astro/build-target.json', 'utf8'));
  test.skip(buildTarget !== 'cloudflare', 'GitHub Pages does not host the CMS or audio worker.');
  const cms = await request.get('/keystatic/');
  expect(cms.status()).toBe(200);
  expect(await cms.text()).toContain('keystatic');
  const track = `/music/${encodeURIComponent('程艾影-赵雷.mp3')}`;
  const range = await request.get(track, { headers: { Range: 'bytes=0-1023' } });
  expect(range.status()).toBe(206);
  expect((await range.body()).byteLength).toBe(1024);
  expect(range.headers()['content-range']).toMatch(/^bytes 0-1023\/\d+$/);
  const invalid = await request.get(track, { headers: { Range: 'bytes=999999999-' } });
  expect(invalid.status()).toBe(416);
  expect((await invalid.body()).byteLength).toBe(0);
  const head = await request.head(track, { headers: { Range: 'bytes=0-1023' } });
  expect(head.status()).toBe(200);
  expect(head.headers()['content-length']).not.toBe('0');
});

test('homepage layout, article reading experience, and quiet music mode work cleanly', async ({
  page,
}, testInfo) => {
  await openPage(page, '/');
  const cardCount = await page.locator('#latest-posts ~ div article').count();
  expect(cardCount).toBe(7);
  expect(
    await page.locator('footer').evaluate((element) => getComputedStyle(element).position)
  ).toBe('relative');

  await openPage(page, '/blog/01-why-redis-is-fast/');
  await expect(page.locator('#post-comments-heading')).toHaveText('评论交流');
  await page.evaluate(() => window.scrollTo(0, 600));
  await expect(page.locator('#article-reading-progress-bar')).not.toHaveCSS(
    'transform',
    'matrix(0, 0, 0, 1, 0, 0)'
  );
  const articleMetrics = await page.evaluate(() => ({
    overflow: document.documentElement.scrollWidth > innerWidth,
    proseWidth: Math.round(document.querySelector('.prose')?.getBoundingClientRect().width ?? 0),
    usesRawAvatar: [...document.querySelectorAll('img')].some((img) =>
      img.currentSrc.endsWith('/images/pages/avatar.jpg')
    ),
  }));
  expect(articleMetrics.overflow).toBe(false);
  expect(articleMetrics.usesRawAvatar).toBe(false);
  if (testInfo.project.name === 'desktop') {
    expect(articleMetrics.proseWidth).toBeLessThanOrEqual(760);
  }

  await page.getByRole('button', { name: '展开音乐播放器', exact: true }).click();
  await expect(page.getByText('正在加载音乐信息…')).toHaveCount(0);
  await page.getByRole('button', { name: '启用极简角标模式', exact: true }).click();
  await page.reload();
  await page.locator('astro-island[component-export="Header"]:not([ssr])').waitFor();
  await expect(page.locator('astro-island[client="load"][ssr]')).toHaveCount(0);
  await page.getByRole('button', { name: '展开音乐播放器', exact: true }).click();
  await expect(page.getByRole('button', { name: '退出极简角标模式', exact: true })).toHaveAttribute(
    'aria-pressed',
    'true'
  );
});

test('async placeholders keep stable dimensions across view count, comments, and music player', async ({
  page,
}) => {
  let releaseVercount: (() => void) | undefined;
  const vercountGate = new Promise<void>((resolve) => {
    releaseVercount = resolve;
  });
  await page.route('https://events.vercount.one/js', async (route) => {
    await vercountGate;
    await route.fulfill({
      status: 200,
      contentType: 'application/javascript',
      body: 'document.getElementById("busuanzi_value_page_pv").textContent = "128";',
    });
  });

  const response = await page.goto('/blog/01-why-redis-is-fast/', {
    waitUntil: 'domcontentloaded',
  });
  expect(response?.status()).toBe(200);
  await page.locator('astro-island[component-export="Header"]:not([ssr])').waitFor();
  await expect(page.locator('astro-island[client="load"][ssr]')).toHaveCount(0);
  const pvContainer = page.locator('#busuanzi_container_page_pv');
  const pvValue = page.locator('#busuanzi_value_page_pv');
  await expect(pvContainer).toHaveAttribute('data-pv-state', 'loading');
  await expect(pvValue).toHaveText('');
  expect((await pvValue.boundingBox())?.width ?? 0).toBeGreaterThanOrEqual(36);
  releaseVercount?.();
  await expect(pvContainer).toHaveAttribute('data-pv-state', 'ready');
  await expect(pvValue).toHaveText('128');

  const commentsContainer = page.locator('#comments-container');
  await commentsContainer.scrollIntoViewIfNeeded();
  const commentsBox = await commentsContainer.boundingBox();
  expect(commentsBox?.height ?? 0).toBeGreaterThanOrEqual(300);
  await expect(commentsContainer.getByRole('status')).toBeVisible();

  await page.route('**/music/**', async (route) => {
    await new Promise((resolve) => setTimeout(resolve, 350));
    await route.continue();
  });
  await page.getByRole('button', { name: '展开音乐播放器', exact: true }).click();
  const playerPanel = page.getByRole('dialog', { name: '音乐播放器' });
  await expect(playerPanel).toBeVisible();
  const playerHeader = playerPanel.locator('> div').first();
  const initialBox = await playerHeader.boundingBox();
  await expect(playerPanel.getByText('正在加载音乐信息…')).toHaveCount(0);
  await page.waitForTimeout(700);
  const settledBox = await playerHeader.boundingBox();
  expect(Math.abs((initialBox?.height ?? 0) - (settledBox?.height ?? 0))).toBeLessThanOrEqual(1);
});
