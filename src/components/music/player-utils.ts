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
export const DEFAULT_VOLUME = 0.8;
export const VOLUME_PERSIST_DEBOUNCE_MS = 200;

export const clampVolume = (value: number) => Math.min(1, Math.max(0, value));

export const getPlayerViewportSize = () => {
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
  if (typeof window === 'undefined') return position;

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

export const getActiveLyricIndex = (
  lyrics: NonNullable<Mp3Metadata['syncedLyrics']>,
  progress: number
) => {
  const index = lyrics.findLastIndex((line) => progress >= line.time);
  return Math.max(index, 0);
};
