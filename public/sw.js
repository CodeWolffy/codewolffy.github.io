const CACHE_NAME = 'wolf-blog-v2';
const OFFLINE_URL = '/offline/';

// 预缓存：构建后的关键静态资源路径（在 install 时通过请求发现）
const PRECACHE_URLS = [
  '/',
  OFFLINE_URL,
  '/manifest.json',
  '/favicon.ico',
  '/icon-192x192.png',
  '/icon-512x512.png',
];

// 允许缓存的导航页面数量上限，防止动态页面无限膨胀
const MAX_CACHED_PAGES = 50;

// 不参与离线缓存的动态管理路径
function isBypassedRequest(request) {
  const url = new URL(request.url);
  return url.pathname.startsWith('/keystatic/') || url.pathname.startsWith('/api/keystatic/');
}

// 判断请求是否为同一站点的导航请求
function isSameOriginNavigation(request) {
  return request.mode === 'navigate' && new URL(request.url).origin === self.location.origin;
}

// 判断是否为静态资源请求（CSS/JS/图片/字体/Manifest）
function isStaticAsset(request) {
  const destination = request.destination;
  return ['style', 'script', 'image', 'font', 'manifest'].includes(destination);
}

// 仅缓存“成功”且“可安全缓存”的响应
function isCacheableResponse(response) {
  if (!response || response.type === 'error' || !response.ok) return false;
  // 跳过 Range 请求（如视频/音频分段），避免缓存不完整响应
  if (response.status === 206) return false;
  return true;
}

// 将响应放入缓存（不阻塞主响应）
function putCache(cacheName, request, response) {
  if (!isCacheableResponse(response)) return;
  const clone = response.clone();
  caches.open(cacheName).then((cache) => {
    cache.put(request, clone).catch((err) => {
      console.error('[SW] 缓存写入失败:', request.url, err);
    });
  });
}

// 获取离线 fallback 响应，确保返回 HTML
async function offlineResponse() {
  const cached = await caches.match(OFFLINE_URL);
  if (cached) return cached;
  return new Response(
    `<!doctype html>
<html lang="zh-CN">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>离线中 | 狼码纪</title></head>
<body style="font-family:system-ui,sans-serif;display:flex;align-items:center;justify-content:center;min-height:100vh;margin:0;background:#0f172a;color:#e2e8f0;">
  <div style="text-align:center;">
    <div style="font-size:3rem;margin-bottom:1rem;">📡</div>
    <h1 style="margin:0 0 .5rem;">当前处于离线状态</h1>
    <p style="margin:0 0 1.5rem;color:#94a3b8;">网络连接似乎中断了，请检查网络后刷新页面。</p>
    <button onclick="location.reload()" style="padding:.6rem 1.2rem;border:0;border-radius:.375rem;background:#3b82f6;color:#fff;cursor:pointer;font-size:1rem;">刷新页面</button>
  </div>
</body>
</html>`,
    {
      status: 503,
      statusText: 'Service Unavailable',
      headers: { 'Content-Type': 'text/html; charset=utf-8' },
    }
  );
}

// 清理超出上限的导航页面缓存（LRU 策略）
async function trimNavigationCache(cacheName) {
  const cache = await caches.open(cacheName);
  const requests = await cache.keys();
  const navigationRequests = requests.filter((req) => isSameOriginNavigation(req));
  if (navigationRequests.length <= MAX_CACHED_PAGES) return;

  // 按缓存时间升序，删除最旧的
  const entries = await Promise.all(
    navigationRequests.map(async (req) => {
      const res = await cache.match(req);
      return { request: req, timestamp: res?.headers?.get('sw-cached-at') || '0' };
    })
  );
  entries.sort((a, b) => Number(a.timestamp) - Number(b.timestamp));
  const toDelete = entries.slice(0, entries.length - MAX_CACHED_PAGES);
  await Promise.all(toDelete.map((entry) => cache.delete(entry.request)));
}

// 安装阶段：缓存核心页面与资源
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((cache) => cache.addAll(PRECACHE_URLS))
      .then(() => self.skipWaiting())
  );
});

// 激活阶段：清理旧版本缓存并接管客户端
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((cacheNames) =>
        Promise.all(
          cacheNames.filter((name) => name !== CACHE_NAME).map((name) => caches.delete(name))
        )
      )
      .then(() => self.clients.claim())
  );
});

// 拦截 fetch 请求
self.addEventListener('fetch', (event) => {
  const { request } = event;

  // 跳过非 GET 请求、跨域请求、后台管理请求以及浏览器扩展请求
  if (
    request.method !== 'GET' ||
    !request.url.startsWith(self.location.origin) ||
    isBypassedRequest(request)
  ) {
    return;
  }

  // 页面导航：Network First，失败或返回错误时回退缓存/离线页
  if (isSameOriginNavigation(request)) {
    event.respondWith(
      fetch(request)
        .then(async (response) => {
          if (isCacheableResponse(response)) {
            // 标记缓存时间，便于 LRU 清理
            const headers = new Headers(response.headers);
            headers.set('sw-cached-at', String(Date.now()));
            const marked = new Response(response.body, {
              status: response.status,
              statusText: response.statusText,
              headers,
            });
            putCache(CACHE_NAME, request, marked);
            await trimNavigationCache(CACHE_NAME);
            return response;
          }
          // HTTP 错误（404/500 等）：尝试读缓存，没有再返回离线页
          const cached = await caches.match(request);
          if (cached) return cached;
          return offlineResponse();
        })
        .catch(async () => {
          const cached = await caches.match(request);
          return cached || offlineResponse();
        })
    );
    return;
  }

  // 静态资源：Stale-While-Revalidate（优先缓存，后台更新）
  if (isStaticAsset(request)) {
    event.respondWith(
      caches.match(request).then(async (cached) => {
        const networkFetch = fetch(request)
          .then((response) => {
            putCache(CACHE_NAME, request, response);
            return response;
          })
          .catch(() => null);

        if (cached) {
          // 有缓存直接返回，后台静默更新
          networkFetch.catch(() => {});
          return cached;
        }

        // 无缓存则等网络，失败返回 500 占位，避免离线页污染资源请求
        const response = await networkFetch;
        if (response) return response;
        return new Response('Network error', {
          status: 408,
          statusText: 'Request Timeout',
          headers: { 'Content-Type': 'text/plain; charset=utf-8' },
        });
      })
    );
    return;
  }

  // 其他同域请求：网络优先，失败回退缓存，且只缓存成功响应
  event.respondWith(
    fetch(request)
      .then((response) => {
        putCache(CACHE_NAME, request, response);
        return response;
      })
      .catch(() => caches.match(request))
  );
});
