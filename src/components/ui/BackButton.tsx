import { useSyncExternalStore } from 'react';
import { ArrowLeft } from 'lucide-react';

interface BackInfo {
  href: string;
  label: string;
}

function normalizeInternalPath(path: string): string {
  if (path === '/' || path === '') return '/';
  return path.endsWith('/') ? path : `${path}/`;
}

// 根据路径获取返回信息
function getBackInfoFromPath(path: string): BackInfo {
  if (path.startsWith('/archives')) {
    return { href: '/archives/', label: '返回归档' };
  } else if (path.startsWith('/tags/')) {
    const tag = path.split('/tags/')[1]?.split('/')[0] || '';
    return { href: normalizeInternalPath(path), label: `返回标签 #${decodeURIComponent(tag)}` };
  } else if (path.startsWith('/tags')) {
    return { href: '/tags/', label: '返回标签' };
  } else if (path === '/' || path === '') {
    return { href: '/', label: '返回首页' };
  }
  return { href: '/', label: '返回首页' };
}

function subscribeBackInfo() {
  return () => {};
}

function getBackInfoSnapshot(): BackInfo {
  if (typeof window === 'undefined') return { href: '/', label: '返回首页' };
  try {
    const previousPath = sessionStorage.getItem('blog_previous_path');
    if (previousPath) {
      return getBackInfoFromPath(previousPath);
    }
  } catch {
    // sessionStorage unavailable
  }
  return { href: '/', label: '返回首页' };
}

function getServerBackInfoSnapshot(): BackInfo {
  return { href: '/', label: '返回首页' };
}

export function BackButton() {
  const backInfo = useSyncExternalStore(
    subscribeBackInfo,
    getBackInfoSnapshot,
    getServerBackInfoSnapshot
  );

  return (
    <a
      href={backInfo.href}
      className="group mb-4 flex items-center text-lg font-bold text-foreground hover:text-primary transition-colors"
    >
      <span className="mr-2 inline-flex items-center transition-transform group-hover:-translate-x-1">
        <ArrowLeft className="h-5 w-5" strokeWidth={2.5} />
      </span>
      {backInfo.label}
    </a>
  );
}
