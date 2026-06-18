/**
 * iframe 视频地址规范化工具
 *
 * 统一处理 Bilibili、YouTube 等嵌入地址，确保：
 * - 协议相对地址补全为 https
 * - 禁用自动播放（autoplay=0）
 * - B 站追加宽屏、高清、关闭弹幕等参数
 * - 只允许明确支持的 iframe 来源
 */

export interface NormalizeIframeUrlOptions {
  /** 是否将 B 站播放器替换为移动端版本（默认 false） */
  isMobile?: boolean;
}

const ALLOWED_IFRAME_HOSTS = new Set([
  'player.bilibili.com',
  'www.bilibili.com',
  'www.youtube.com',
  'youtube.com',
  'www.youtube-nocookie.com',
  'giscus.app',
  'www.douyin.com',
  'douyin.com',
]);

function extractIframeSrc(input: string): string {
  const trimmed = input.trim();
  if (!trimmed.startsWith('<iframe')) return trimmed;
  return trimmed.match(/src=["']([^"']+)["']/i)?.[1]?.trim() ?? '';
}

function toAbsoluteHttpsUrl(input: string): URL | null {
  let url = extractIframeSrc(input);
  if (!url) return null;

  if (url.startsWith('//')) {
    url = `https:${url}`;
  }

  try {
    const parsed = new URL(url);
    if (parsed.protocol !== 'https:') return null;
    if (!ALLOWED_IFRAME_HOSTS.has(parsed.hostname.toLowerCase())) return null;
    return parsed;
  } catch {
    return null;
  }
}

/**
 * 规范化 iframe 的 src 地址
 * @param src 原始地址（可能包含协议相对地址、iframe 代码片段等）
 * @param options 可选配置
 * @returns 规范化后的地址；不在允许列表内时返回空字符串
 */
export function normalizeIframeUrl(src: string, options: NormalizeIframeUrlOptions = {}): string {
  const parsed = toAbsoluteHttpsUrl(src);
  if (!parsed) return '';

  const url = parsed.toString();

  try {
    if (parsed.hostname.endsWith('bilibili.com')) {
      return normalizeBilibiliUrl(url, options.isMobile ?? false);
    }

    if (parsed.hostname.endsWith('youtube.com') || parsed.hostname === 'www.youtube-nocookie.com') {
      return normalizeYouTubeUrl(url);
    }
  } catch {
    return '';
  }

  return url;
}

function setSearchParam(urlStr: string, key: string, value: string): string {
  const url = new URL(urlStr);
  url.searchParams.set(key, value);
  return url.toString();
}

function normalizeBilibiliUrl(url: string, isMobile: boolean): string {
  let result = url;

  // 移动端播放器替换
  if (isMobile && result.includes('player.bilibili.com/player.html')) {
    result = result.replace(
      'player.bilibili.com/player.html',
      'www.bilibili.com/blackboard/html5mobileplayer.html'
    );
  }

  // 禁用自动播放
  result = setSearchParam(result, 'autoplay', '0');

  // B 站宽屏、高清、关闭弹幕
  result = setSearchParam(result, 'as_wide', '1');
  result = setSearchParam(result, 'high_quality', '1');
  result = setSearchParam(result, 'danmaku', '0');

  return result;
}

function normalizeYouTubeUrl(url: string): string {
  return setSearchParam(url, 'autoplay', '0');
}
