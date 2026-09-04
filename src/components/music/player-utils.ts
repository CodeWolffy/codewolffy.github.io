import type { Mp3Metadata } from '@/lib/mp3-metadata';

export type PlayMode = 'sequence' | 'single' | 'shuffle';

export type PlayerPosition = {
  x: number;
  y: number;
};

export type PlayerDragState = {
  pointerId: number;
  startX: number;
  startY: number;
  originX: number;
  originY: number;
  width: number;
  height: number;
  visualX: number;
  visualY: number;
  frameId: number | null;
  moved: boolean;
};

export type PlayerTransitionAnchor = {
  horizontal: {
    edge: 'left' | 'right';
    offset: number;
  };
  vertical: {
    edge: 'top' | 'bottom';
    offset: number;
  };
};

export const PLAYER_EDGE_GAP = 16;
export const PLAYER_DRAG_THRESHOLD = 6;
export const MUSIC_VOLUME_STORAGE_KEY = 'blog-music-volume';
export const PLAYER_ANCHOR_STORAGE_KEY = 'blog-music-anchor';
export const MUSIC_PLAYBACK_STATE_STORAGE_KEY = 'blog-music-playback-state';
export const DEFAULT_VOLUME = 0.8;
export const VOLUME_PERSIST_DEBOUNCE_MS = 200;
export const PLAYBACK_STATE_PERSIST_INTERVAL_MS = 1000;

export type StoredPlaybackState = {
  audio?: string;
  currentTime?: number;
  playMode?: PlayMode;
};

export const clampVolume = (value: number) => Math.min(1, Math.max(0, value));

export const getPlayerViewportSize = () => {
  if (typeof window === 'undefined' || typeof document === 'undefined') {
    return { width: 1024, height: 768 };
  }
  const root = document.documentElement;

  return {
    width: root?.clientWidth || window.innerWidth,
    height: root?.clientHeight || window.innerHeight,
  };
};

export const readStoredVolume = () => {
  if (typeof window === 'undefined') return DEFAULT_VOLUME;
  const storedValue = window.localStorage.getItem(MUSIC_VOLUME_STORAGE_KEY);
  if (storedValue === null) return DEFAULT_VOLUME;
  const parsedValue = Number(storedValue);
  return Number.isFinite(parsedValue) ? clampVolume(parsedValue) : DEFAULT_VOLUME;
};

export const readStoredPlaybackState = (): StoredPlaybackState | null => {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.localStorage.getItem(MUSIC_PLAYBACK_STATE_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object') return null;

    const result: StoredPlaybackState = {};

    if (typeof parsed.audio === 'string' && parsed.audio.trim().length > 0) {
      result.audio = parsed.audio.trim();
    }

    if (
      typeof parsed.currentTime === 'number' &&
      Number.isFinite(parsed.currentTime) &&
      parsed.currentTime >= 0
    ) {
      result.currentTime = parsed.currentTime;
    }

    if (
      typeof parsed.playMode === 'string' &&
      ['sequence', 'single', 'shuffle'].includes(parsed.playMode)
    ) {
      result.playMode = parsed.playMode as PlayMode;
    }

    return result;
  } catch {
    return null;
  }
};

export const persistPlaybackState = (state: StoredPlaybackState) => {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(MUSIC_PLAYBACK_STATE_STORAGE_KEY, JSON.stringify(state));
  } catch {
    // Ignore storage errors
  }
};

export const formatTime = (seconds: number) => {
  if (!Number.isFinite(seconds) || seconds <= 0) return '0:00';
  const minutes = Math.floor(seconds / 60);
  const remainSeconds = Math.floor(seconds % 60)
    .toString()
    .padStart(2, '0');
  return `${minutes}:${remainSeconds}`;
};

export const resolveAudioSrc = (src: string) => {
  if (typeof window === 'undefined') return src;

  try {
    const url = new URL(src, window.location.href);
    if (['http:', 'https:'].includes(url.protocol)) {
      return url.href;
    }
    return src;
  } catch {
    return src;
  }
};

export const clampPlayerPosition = (
  position: PlayerPosition,
  width: number,
  height: number
): PlayerPosition => {
  const viewport = getPlayerViewportSize();
  const maxX = Math.max(PLAYER_EDGE_GAP, viewport.width - width - PLAYER_EDGE_GAP);
  const maxY = Math.max(PLAYER_EDGE_GAP, viewport.height - height - PLAYER_EDGE_GAP);

  return {
    x: Math.min(maxX, Math.max(PLAYER_EDGE_GAP, position.x)),
    y: Math.min(maxY, Math.max(PLAYER_EDGE_GAP, position.y)),
  };
};

export const getPlayerAnchorFromPosition = (
  position: PlayerPosition,
  width: number,
  height: number
): PlayerTransitionAnchor => {
  const viewport = getPlayerViewportSize();
  const leftOffset = position.x;
  const rightOffset = viewport.width - position.x - width;
  const topOffset = position.y;
  const bottomOffset = viewport.height - position.y - height;

  return {
    horizontal:
      leftOffset <= rightOffset
        ? { edge: 'left', offset: leftOffset }
        : { edge: 'right', offset: rightOffset },
    vertical:
      topOffset <= bottomOffset
        ? { edge: 'top', offset: topOffset }
        : { edge: 'bottom', offset: bottomOffset },
  };
};

export const getAnchoredPlayerPosition = (
  anchor: PlayerTransitionAnchor,
  width: number,
  height: number
) => {
  const viewport = getPlayerViewportSize();

  return clampPlayerPosition(
    {
      x:
        anchor.horizontal.edge === 'right'
          ? viewport.width - width - anchor.horizontal.offset
          : anchor.horizontal.offset,
      y:
        anchor.vertical.edge === 'bottom'
          ? viewport.height - height - anchor.vertical.offset
          : anchor.vertical.offset,
    },
    width,
    height
  );
};

export const clampPlayerAnchor = (
  anchor: PlayerTransitionAnchor,
  width: number,
  height: number
): PlayerTransitionAnchor => {
  const viewport = getPlayerViewportSize();
  const position = getAnchoredPlayerPosition(anchor, width, height);

  return {
    horizontal:
      anchor.horizontal.edge === 'right'
        ? { edge: 'right', offset: viewport.width - position.x - width }
        : { edge: 'left', offset: position.x },
    vertical:
      anchor.vertical.edge === 'bottom'
        ? { edge: 'bottom', offset: viewport.height - position.y - height }
        : { edge: 'top', offset: position.y },
  };
};

export const applyPlayerAnchorStyle = (player: HTMLDivElement, anchor: PlayerTransitionAnchor) => {
  if (anchor.horizontal.edge === 'right') {
    player.style.right = `${anchor.horizontal.offset}px`;
    player.style.left = 'auto';
  } else {
    player.style.left = `${anchor.horizontal.offset}px`;
    player.style.right = 'auto';
  }

  if (anchor.vertical.edge === 'bottom') {
    player.style.bottom = `${anchor.vertical.offset}px`;
    player.style.top = 'auto';
  } else {
    player.style.top = `${anchor.vertical.offset}px`;
    player.style.bottom = 'auto';
  }
};

export const clearPlayerAnchorStyle = (player: HTMLElement) => {
  player.style.left = '';
  player.style.right = '';
  player.style.top = '';
  player.style.bottom = '';
};

export const readStoredPlayerAnchor = (): PlayerTransitionAnchor | null => {
  if (typeof window === 'undefined') return null;
  try {
    const stored = window.localStorage.getItem(PLAYER_ANCHOR_STORAGE_KEY);
    if (!stored) return null;
    const parsed = JSON.parse(stored);
    if (
      parsed &&
      parsed.horizontal &&
      (parsed.horizontal.edge === 'left' || parsed.horizontal.edge === 'right') &&
      Number.isFinite(parsed.horizontal.offset) &&
      parsed.horizontal.offset >= 0 &&
      parsed.vertical &&
      (parsed.vertical.edge === 'top' || parsed.vertical.edge === 'bottom') &&
      Number.isFinite(parsed.vertical.offset) &&
      parsed.vertical.offset >= 0
    ) {
      return clampPlayerAnchor(parsed as PlayerTransitionAnchor, 44, 44);
    }
  } catch {
    // Ignore storage parse errors
  }
  return null;
};

export const persistPlayerAnchor = (anchor: PlayerTransitionAnchor) => {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(PLAYER_ANCHOR_STORAGE_KEY, JSON.stringify(anchor));
  } catch {
    // Ignore storage errors
  }
};

export const getPlayerAnchorStyle = (anchor: PlayerTransitionAnchor) => ({
  left: anchor.horizontal.edge === 'left' ? `${anchor.horizontal.offset}px` : 'auto',
  right: anchor.horizontal.edge === 'right' ? `${anchor.horizontal.offset}px` : 'auto',
  top: anchor.vertical.edge === 'top' ? `${anchor.vertical.offset}px` : 'auto',
  bottom: anchor.vertical.edge === 'bottom' ? `${anchor.vertical.offset}px` : 'auto',
});

export const getPlayerSurfaceStyle = (anchor: PlayerTransitionAnchor | null) => ({
  left: anchor?.horizontal.edge === 'left' ? '0px' : 'auto',
  right: anchor?.horizontal.edge === 'left' ? 'auto' : '0px',
  top: anchor?.vertical.edge === 'top' ? '0px' : 'auto',
  bottom: anchor?.vertical.edge === 'top' ? 'auto' : '0px',
});

export const isSameAnchor = (a: PlayerTransitionAnchor, b: PlayerTransitionAnchor) => {
  return (
    a.horizontal.edge === b.horizontal.edge &&
    a.vertical.edge === b.vertical.edge &&
    a.horizontal.offset === b.horizontal.offset &&
    a.vertical.offset === b.vertical.offset
  );
};

export const resetPlayerDragStyle = (player: HTMLDivElement) => {
  player.style.transform = '';
  player.style.willChange = '';
  player.removeAttribute('data-dragging');
};

export const capturePointer = (target: HTMLDivElement, pointerId: number) => {
  try {
    if (!target.hasPointerCapture(pointerId)) {
      target.setPointerCapture(pointerId);
    }
  } catch {
    // Synthetic pointer events in tests may not have an active pointer to capture.
  }
};

export const isInteractiveDragTarget = (target: EventTarget | null) =>
  typeof HTMLElement !== 'undefined' &&
  target instanceof HTMLElement &&
  Boolean(
    target.closest(
      'button, a, input, textarea, select, [role="slider"], [data-player-interactive="true"]'
    )
  );

export const isPointerInsidePlayer = (
  surface: HTMLElement | null,
  target: EventTarget | null,
  composedPath?: EventTarget[]
): boolean => {
  if (!surface || !target) return false;

  // 1. 标准 DOM 包含判定
  if (typeof Node !== 'undefined' && target instanceof Node && surface.contains(target)) {
    return true;
  }

  // 2. 检查事件传播路径（即使 React 异步渲染脱卸节点，分发时的 composedPath 也完整保留）
  if (composedPath && Array.isArray(composedPath)) {
    if (composedPath.includes(surface)) {
      return true;
    }
    for (const item of composedPath) {
      if (typeof Element !== 'undefined' && item instanceof Element) {
        if (
          item.classList.contains('music-player-surface') ||
          item.classList.contains('music-player-shell') ||
          item.getAttribute('data-player-surface') === 'true' ||
          item.getAttribute('data-player-interactive') === 'true' ||
          item.getAttribute('data-player-controls') === 'true'
        ) {
          return true;
        }
      }
    }
  }

  // 3. 祖先选择器判定（Element 或 Text Node 的 parentElement）
  const isElement = typeof Element !== 'undefined' && target instanceof Element;
  const isNode = typeof Node !== 'undefined' && target instanceof Node;
  const element = isElement ? (target as Element) : isNode ? (target as Node).parentElement : null;

  if (element) {
    if (
      element.closest(
        '.music-player-surface, .music-player-shell, [data-player-surface="true"], [data-player-interactive="true"], [data-player-controls="true"]'
      )
    ) {
      return true;
    }

    // 4. 节点脱卸保护：若元素已脱离文档树（!element.isConnected），
    // 说明它是由于快速点击触发 React setState 导致重新挂载/更新而脱卸的旧节点，绝不能误判为外部点击
    if (!element.isConnected) {
      return true;
    }
  }

  return false;
};

export const getActiveLyricIndex = (
  lyrics: NonNullable<Mp3Metadata['syncedLyrics']>,
  progress: number
) => {
  return lyrics.findLastIndex((line) => progress >= line.time);
};
