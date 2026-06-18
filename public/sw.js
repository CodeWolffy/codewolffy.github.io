const CACHE_NAME = 'wolf-blog-v1';

// 预缓存：构建后的关键静态资源路径（在 install 时通过请求发现）
const PRECACHE_URLS = [
  '/',
  '/offline/',
  '/manifest.json',
  '/favicon.ico',
  '/icon-192x192.png',
  '/icon-512x512.png',
];

// 安装阶段：缓存核心页面与资源
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((cache) => cache.addAll(PRECACHE_URLS))
      .then(() => self.skipWaiting())
  );
});

// 激活阶段：清理旧版本缓存
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

// 判断请求是否为同一站点的导航请求
function isSameOriginNavigation(request) {
  return request.mode === 'navigate' && new URL(request.url).origin === self.location.origin;
}

// 判断是否为静态资源请求（CSS/JS/图片/字体）
function isStaticAsset(request) {
  const destination = request.destination;
  return ['style', 'script', 'image', 'font', 'manifest'].includes(destination);
}

// 获取离线 fallback 响应
function offlineResponse() {
  return caches.match('/offline/').then((response) => {
    if (response) return response;
    return new Response('离线模式暂不可用', {
      status: 503,
      statusText: 'Service Unavailable',
      headers: { 'Content-Type': 'text/plain; charset=utf-8' },
    });
  });
}

// 拦截 fetch 请求
self.addEventListener('fetch', (event) => {
  const { request } = event;

  // 跳过非 GET 请求、跨域请求以及浏览器扩展请求
  if (request.method !== 'GET' || !request.url.startsWith(self.location.origin)) {
    return;
  }

  if (isSameOriginNavigation(request)) {
    // 页面导航：优先网络，失败返回缓存或离线页
    event.respondWith(
      fetch(request)
        .then((response) => {
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
          return response;
        })
        .catch(() => caches.match(request).then((cached) => cached || offlineResponse()))
    );
    return;
  }

  if (isStaticAsset(request)) {
    // 静态资源：优先缓存，缓存缺失再请求并更新缓存
    event.respondWith(
      caches.match(request).then((cached) => {
        if (cached) return cached;
        return fetch(request).then((response) => {
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
          return response;
        });
      })
    );
    return;
  }

  // 其他同域请求：网络优先，失败回退缓存
  event.respondWith(fetch(request).catch(() => caches.match(request)));
});
