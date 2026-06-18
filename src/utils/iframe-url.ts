/**
 * iframe 视频地址规范化工具
 *
 * 统一处理 Bilibili、YouTube 等嵌入地址，确保：
 * - 协议相对地址补全为 https
 * - 禁用自动播放（autoplay=0）
 * - B 站追加宽屏、高清、关闭弹幕等参数
 * - 可选将 B 站播放器替换为移动端版本
 */

export interface NormalizeIframeUrlOptions {
  /** 是否将 B 站播放器替换为移动端版本（默认 false） */
  isMobile?: boolean;
}

/**
 * 规范化 iframe 的 src 地址
 * @param src 原始地址（可能包含协议相对地址、iframe 代码片段等）
 * @param options 可选配置
 * @returns 规范化后的地址
 */
export function normalizeIframeUrl(src: string, options: NormalizeIframeUrlOptions = {}): string {
  if (!src) return '';

  let url = src.trim();

  // 处理协议相对地址
  if (url.startsWith('//')) {
    url = `https:${url}`;
  }

  try {
    if (url.includes('bilibili.com')) {
      return normalizeBilibiliUrl(url, options.isMobile ?? false);
    }

    if (url.includes('youtube.com')) {
      return normalizeYouTubeUrl(url);
    }
  } catch {
    // URL 解析失败时返回原地址，避免破坏内容
    return url;
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
