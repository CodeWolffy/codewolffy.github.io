import {
  useCallback,
  useEffect,
  useEffectEvent,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
  type KeyboardEvent,
  type PointerEvent,
} from 'react';
import {
  ChevronDown,
  Eye,
  EyeOff,
  Menu,
  Pause,
  Play,
  Repeat,
  Repeat1,
  Shuffle,
  SkipBack,
  SkipForward,
  Volume2,
  VolumeX,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { getFallbackMetadata } from '@/lib/mp3-metadata';
import { RecordCover } from './RecordCover';
import { useTrackMetadata } from './use-track-metadata';
import { usePlayerFocus } from './use-player-focus';
import {
  DEFAULT_VOLUME,
  MUSIC_VOLUME_STORAGE_KEY,
  PLAYBACK_STATE_PERSIST_INTERVAL_MS,
  PLAYER_DRAG_THRESHOLD,
  VOLUME_PERSIST_DEBOUNCE_MS,
  applyPlayerAnchorStyle,
  capturePointer,
  clampPlayerAnchor,
  clampPlayerPosition,
  clampVolume,
  clearPlayerAnchorStyle,
  formatTime,
  getActiveLyricIndex,
  getPlaybackTime,
  getPlayerAnchorFromPosition,
  getPlayerAnchorStyle,
  getPlayerSurfaceStyle,
  isPointerInsidePlayer,
  isSameAnchor,
  persistPlaybackState,
  persistPlayerAnchor,
  persistQuietMode,
  readStoredPlaybackState,
  readStoredPlayerAnchor,
  readStoredQuietMode,
  readStoredVolume,
  resetPlayerDragStyle,
  restorePlaybackState,
  resolveAudioSrc,
  type PlayMode,
  type PlayerDragState,
  type PlayerTransitionAnchor,
} from './player-utils';

export type MusicTrack = {
  audio: string;
};

type FloatingMusicPlayerProps = {
  tracks: MusicTrack[];
};

const playModeOptions: { value: PlayMode; label: string; Icon: typeof Repeat }[] = [
  { value: 'sequence', label: '列表循环', Icon: Repeat },
  { value: 'single', label: '单曲循环', Icon: Repeat1 },
  { value: 'shuffle', label: '随机播放', Icon: Shuffle },
];

const COMPACT_PLAYER_QUERY = '(max-width: 639px), (max-height: 500px) and (pointer: coarse)';

function subscribeMobile(callback: () => void) {
  if (typeof window === 'undefined') return () => {};
  const media = window.matchMedia(COMPACT_PLAYER_QUERY);
  media.addEventListener('change', callback);
  return () => media.removeEventListener('change', callback);
}

function getMobileSnapshot() {
  return typeof window !== 'undefined' && window.matchMedia(COMPACT_PLAYER_QUERY).matches;
}

function getServerMobileSnapshot() {
  return false;
}

export function FloatingMusicPlayer({ tracks }: FloatingMusicPlayerProps) {
  const playerRef = useRef<HTMLDivElement>(null);
  const playerSurfaceRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLElement>(null);
  const capsuleRef = useRef<HTMLButtonElement>(null);
  const audioRef = useRef<HTMLAudioElement>(null);
  const progressTrackRef = useRef<HTMLDivElement>(null);
  const volumeBtnRef = useRef<HTMLButtonElement>(null);
  const volumePanelRef = useRef<HTMLDivElement>(null);
  const activeTrackItemRef = useRef<HTMLButtonElement>(null);
  const isSeekingRef = useRef(false);
  const dragStateRef = useRef<PlayerDragState | null>(null);
  const suppressPlayerClickRef = useRef(false);
  const pendingSeekTimeRef = useRef<number | null>(null);
  const lastLoadedAudioRef = useRef<string | null>(null);
  const lastPersistTimeRef = useRef<number>(0);

  const [isRestored, setIsRestored] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(true);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const [playMode, setPlayMode] = useState<PlayMode>('sequence');
  const [isPlaylistOpen, setIsPlaylistOpen] = useState(false);
  const [volume, setVolume] = useState(DEFAULT_VOLUME);
  const [isVolumeOpen, setIsVolumeOpen] = useState(false);
  const [isQuietMode, setIsQuietMode] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [playerAnchor, setPlayerAnchor] = useState<PlayerTransitionAnchor | null>(null);
  const isMobile = useSyncExternalStore(
    subscribeMobile,
    getMobileSnapshot,
    getServerMobileSnapshot
  );

  const currentTrack = tracks[currentIndex];
  const currentAudio = currentTrack?.audio;
  const { metadataByAudio, metadataLoading, retryMetadata } = useTrackMetadata(
    currentAudio,
    isRestored && (!isCollapsed || isPlaying)
  );
  const fallbackMetadata = useMemo(
    () =>
      currentAudio
        ? getFallbackMetadata(currentAudio)
        : { title: '未命名音乐', artist: '未知艺术家' },
    [currentAudio]
  );
  const currentMetadata = currentAudio ? metadataByAudio[currentAudio] : undefined;
  const displayTitle = currentMetadata?.title || fallbackMetadata.title;
  const displayArtist = currentMetadata?.artist || fallbackMetadata.artist;
  const displayAlbum = currentMetadata?.album;
  const displayCover = currentMetadata?.coverUrl;
  const syncedLyrics = currentMetadata?.syncedLyrics ?? [];
  const activeLyricIndex =
    syncedLyrics.length > 0 ? getActiveLyricIndex(syncedLyrics, progress) : -1;
  const activeLyric = activeLyricIndex >= 0 ? syncedLyrics[activeLyricIndex] : undefined;
  const previousLyric = activeLyricIndex > 0 ? syncedLyrics[activeLyricIndex - 1] : undefined;
  const nextLyric = activeLyricIndex >= 0 ? syncedLyrics[activeLyricIndex + 1] : syncedLyrics[0];
  const playlistItems = useMemo(
    () =>
      tracks.map((track) => {
        const metadata = metadataByAudio[track.audio];
        const fallback = getFallbackMetadata(track.audio);

        return {
          audio: track.audio,
          title: metadata?.title || fallback.title,
          artist: metadata?.artist || fallback.artist,
          album: metadata?.album,
          coverUrl: metadata?.coverUrl,
        };
      }),
    [metadataByAudio, tracks]
  );

  // Keep the server and first client render identical; restore preferences after hydration.
  useEffect(() => {
    if (isRestored) return;
    const restored = restorePlaybackState(tracks, readStoredPlaybackState());
    pendingSeekTimeRef.current = restored.currentTime > 0 ? restored.currentTime : null;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- Browser storage must be restored after hydration.
    setCurrentIndex(restored.index);
    setProgress(restored.currentTime);
    setPlayMode(restored.playMode);
    setVolume(readStoredVolume());
    setPlayerAnchor(readStoredPlayerAnchor());
    setIsQuietMode(readStoredQuietMode());
    setIsRestored(true);
  }, [isRestored, tracks]);

  const commitPlayerAnchor = useCallback(
    (nextAnchor: PlayerTransitionAnchor, player = playerRef.current) => {
      if (player && (isCollapsed || !isMobile)) applyPlayerAnchorStyle(player, nextAnchor);
      persistPlayerAnchor(nextAnchor);

      setPlayerAnchor((anchor) =>
        anchor && isSameAnchor(anchor, nextAnchor) ? anchor : nextAnchor
      );
    },
    [isCollapsed, isMobile]
  );

  const setCollapsedWithAnchor = useCallback((nextCollapsed: boolean) => {
    setIsCollapsed(nextCollapsed);

    if (nextCollapsed) {
      setIsPlaylistOpen(false);
      setIsVolumeOpen(false);
    }
  }, []);

  if (currentIndex >= tracks.length && tracks.length > 0) {
    setCurrentIndex(0);
  }

  useEffect(() => {
    const audio = audioRef.current;
    if (!isRestored || !audio || !currentAudio) return;

    if (lastLoadedAudioRef.current !== null && lastLoadedAudioRef.current !== currentAudio) {
      pendingSeekTimeRef.current = null;
      setProgress(0);
      setDuration(0);
      setError(null);
    }
    lastLoadedAudioRef.current = currentAudio;

    const nextSrc = resolveAudioSrc(currentAudio);
    if (audio.src && audio.src !== nextSrc) {
      audio.pause();
      audio.removeAttribute('src');
      audio.load();
    }
  }, [currentAudio, isRestored]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!isRestored || !audio) return;

    if (!isPlaying || !currentAudio) {
      audio.pause();
      return;
    }

    const nextSrc = resolveAudioSrc(currentAudio);
    if (audio.src !== nextSrc) {
      audio.src = nextSrc;
      audio.load();
    }

    if (pendingSeekTimeRef.current !== null && audio.readyState >= 1) {
      audio.currentTime = pendingSeekTimeRef.current;
      pendingSeekTimeRef.current = null;
    }

    audio.play().catch((err: unknown) => {
      if (err instanceof Error && err.name === 'AbortError') return;
      setIsPlaying(false);
      setError('音频暂时无法播放');
    });
  }, [currentAudio, isPlaying, isRestored]);

  const savePlayback = useEffectEvent(() => {
    if (!currentAudio) return;
    persistPlaybackState({
      audio: currentAudio,
      currentTime: Math.round(
        getPlaybackTime(audioRef.current, pendingSeekTimeRef.current, progress)
      ),
      playMode,
    });
  });

  useEffect(() => {
    if (!isRestored) return;
    const handleUnload = () => savePlayback();
    const handleVisibility = () => {
      if (document.visibilityState === 'hidden') savePlayback();
    };
    window.addEventListener('pagehide', handleUnload);
    document.addEventListener('visibilitychange', handleVisibility);
    return () => {
      window.removeEventListener('pagehide', handleUnload);
      document.removeEventListener('visibilitychange', handleVisibility);
    };
  }, [isRestored]);

  useEffect(() => {
    if (!isRestored) return;
    const audio = audioRef.current;
    if (audio) audio.volume = volume;

    const timer = window.setTimeout(() => {
      try {
        window.localStorage.setItem(MUSIC_VOLUME_STORAGE_KEY, volume.toString());
      } catch {
        // Playback remains available when browser storage is blocked.
      }
    }, VOLUME_PERSIST_DEBOUNCE_MS);

    return () => window.clearTimeout(timer);
  }, [volume, isRestored]);

  useEffect(() => {
    const handleDocumentPointerDown = (event: globalThis.PointerEvent) => {
      if (isCollapsed) return;

      const surface = playerSurfaceRef.current;
      const target = event.target as Node | null;
      const composedPath =
        typeof event.composedPath === 'function' ? event.composedPath() : undefined;

      if (!isPointerInsidePlayer(surface, target, composedPath)) {
        // The modal backdrop handles its own click; desktop clicks retain their normal action.
        if (!isMobile) setCollapsedWithAnchor(true);
        return;
      }

      const isVolumeBtn = target instanceof Node && Boolean(volumeBtnRef.current?.contains(target));
      const isVolumePanel =
        target instanceof Node && Boolean(volumePanelRef.current?.contains(target));
      if (!isVolumeBtn && !isVolumePanel) {
        setIsVolumeOpen(false);
      }
    };

    document.addEventListener('pointerdown', handleDocumentPointerDown, { capture: true });
    return () =>
      document.removeEventListener('pointerdown', handleDocumentPointerDown, { capture: true });
  }, [isCollapsed, setCollapsedWithAnchor, isMobile]);

  useLayoutEffect(() => {
    const player = playerRef.current;
    const surface = playerSurfaceRef.current;
    if (!player || !surface) return;

    const positionPlayer = () => {
      if (isMobile && !isCollapsed) {
        clearPlayerAnchorStyle(player);
        return;
      }
      const { width, height } = surface.getBoundingClientRect();
      const preferredAnchor: PlayerTransitionAnchor = playerAnchor ?? {
        horizontal: { edge: 'right', offset: window.innerWidth >= 768 ? 24 : 16 },
        vertical: { edge: 'bottom', offset: 96 },
      };
      // Clamp both the default and dragged positions, without overwriting the user's saved anchor.
      applyPlayerAnchorStyle(player, clampPlayerAnchor(preferredAnchor, width, height));
    };

    positionPlayer();
    const observer = new ResizeObserver(positionPlayer);
    observer.observe(surface);
    window.addEventListener('resize', positionPlayer);
    window.visualViewport?.addEventListener('resize', positionPlayer);
    return () => {
      observer.disconnect();
      window.removeEventListener('resize', positionPlayer);
      window.visualViewport?.removeEventListener('resize', positionPlayer);
    };
  }, [isMobile, isCollapsed, playerAnchor]);

  const closePlayer = useCallback(() => setCollapsedWithAnchor(true), [setCollapsedWithAnchor]);
  const toggleQuietMode = useCallback(() => {
    setIsQuietMode((prev) => {
      const next = !prev;
      persistQuietMode(next);
      return next;
    });
  }, []);
  usePlayerFocus({
    isOpen: !isCollapsed,
    isModal: isMobile,
    panelRef,
    triggerRef: capsuleRef,
    onClose: closePlayer,
  });

  useEffect(() => {
    if (isPlaylistOpen) {
      activeTrackItemRef.current?.scrollIntoView({
        block: 'nearest',
        behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches
          ? 'instant'
          : 'smooth',
      });
    }
  }, [isPlaylistOpen, currentIndex]);

  const hasMultipleTracks = tracks.length > 1;
  const progressPercent = duration > 0 ? Math.min(100, (progress / duration) * 100) : 0;
  const hasLyrics = syncedLyrics.length > 0 || Boolean(currentMetadata?.lyrics);
  const volumePercent = Math.round(volume * 100);
  const VolumeIcon = volume === 0 ? VolumeX : Volume2;
  const activePlayMode =
    playModeOptions.find((option) => option.value === playMode) ?? playModeOptions[0];
  const ActivePlayModeIcon = activePlayMode.Icon;

  const selectTrack = (index: number, autoplay = true) => {
    const nextTrack = tracks[index];
    if (!nextTrack) return;
    setError(null);
    setIsVolumeOpen(false);
    setCurrentIndex(index);
    persistPlaybackState({
      audio: nextTrack.audio,
      currentTime:
        index === currentIndex
          ? Math.round(getPlaybackTime(audioRef.current, pendingSeekTimeRef.current, progress))
          : 0,
      playMode,
    });
    if (autoplay) setIsPlaying(true);
  };

  const getRandomTrackIndex = useCallback(
    (currentTrackIndex: number) => {
      if (tracks.length <= 1) return currentTrackIndex;

      let nextIndex = currentTrackIndex;
      while (nextIndex === currentTrackIndex) {
        nextIndex = Math.floor(Math.random() * tracks.length);
      }

      return nextIndex;
    },
    [tracks.length]
  );

  const replayCurrentTrack = useCallback(() => {
    const audio = audioRef.current;
    if (!audio) return;

    pendingSeekTimeRef.current = null;
    audio.currentTime = 0;
    setProgress(0);
    if (currentAudio) persistPlaybackState({ audio: currentAudio, currentTime: 0, playMode });
    if (isPlaying) {
      audio.play().catch((err: unknown) => {
        if (err instanceof Error && err.name === 'AbortError') return;
        setIsPlaying(false);
        setError('音频暂时无法播放');
      });
    }
  }, [isPlaying, currentAudio, playMode]);

  const selectPreviousTrack = useCallback(() => {
    if (playMode === 'single') {
      replayCurrentTrack();
      return;
    }

    if (!hasMultipleTracks) return;
    setCurrentIndex((index) =>
      playMode === 'shuffle'
        ? getRandomTrackIndex(index)
        : (index - 1 + tracks.length) % tracks.length
    );
  }, [getRandomTrackIndex, hasMultipleTracks, playMode, replayCurrentTrack, tracks.length]);

  const selectNextTrack = useCallback(() => {
    if (playMode === 'single') {
      replayCurrentTrack();
      return;
    }

    if (!hasMultipleTracks) return;
    setCurrentIndex((index) =>
      playMode === 'shuffle' ? getRandomTrackIndex(index) : (index + 1) % tracks.length
    );
  }, [getRandomTrackIndex, hasMultipleTracks, playMode, replayCurrentTrack, tracks.length]);

  const handleTrackEnded = () => {
    if (currentAudio) {
      persistPlaybackState({
        audio: currentAudio,
        currentTime: 0,
        playMode,
      });
    }

    if (playMode === 'single') {
      replayCurrentTrack();
      return;
    }

    if (hasMultipleTracks) {
      selectNextTrack();
      return;
    }

    setIsPlaying(false);
  };

  const togglePlayback = () => {
    setError(null);
    if (isPlaying && currentAudio) {
      persistPlaybackState({
        audio: currentAudio,
        currentTime: Math.round(
          getPlaybackTime(audioRef.current, pendingSeekTimeRef.current, progress)
        ),
        playMode,
      });
    } else {
      retryMetadata();
    }
    setIsPlaying((value) => !value);
  };

  const handleSeek = useCallback(
    (value: number) => {
      const audio = audioRef.current;
      if (!audio || duration <= 0) return;

      const nextProgress = Math.min(duration, Math.max(0, value));
      audio.currentTime = nextProgress;
      setProgress(nextProgress);
      if (currentAudio && !isSeekingRef.current) {
        persistPlaybackState({
          audio: currentAudio,
          currentTime: Math.round(nextProgress),
          playMode,
        });
      }
    },
    [duration, currentAudio, playMode]
  );

  useEffect(() => {
    if (typeof window === 'undefined' || !('mediaSession' in navigator)) return;

    if (!currentTrack) {
      navigator.mediaSession.metadata = null;
      return;
    }

    const artwork = displayCover
      ? [{ src: displayCover, sizes: '512x512', type: 'image/jpeg' }]
      : [];

    navigator.mediaSession.metadata = new MediaMetadata({
      title: displayTitle,
      artist: displayArtist,
      album: displayAlbum || '博客音乐胶囊',
      artwork,
    });

    navigator.mediaSession.playbackState = isPlaying ? 'playing' : 'paused';

    const playHandler = () => setIsPlaying(true);
    const pauseHandler = () => setIsPlaying(false);
    const prevHandler = () => selectPreviousTrack();
    const nextHandler = () => selectNextTrack();
    const seekHandler = (details: MediaSessionActionDetails) => {
      if (details.seekTime !== undefined && details.seekTime !== null) {
        handleSeek(details.seekTime);
      }
    };

    navigator.mediaSession.setActionHandler('play', playHandler);
    navigator.mediaSession.setActionHandler('pause', pauseHandler);
    navigator.mediaSession.setActionHandler('previoustrack', prevHandler);
    navigator.mediaSession.setActionHandler('nexttrack', nextHandler);
    try {
      navigator.mediaSession.setActionHandler('seekto', seekHandler);
    } catch (err) {
      void err;
    }

    return () => {
      if ('mediaSession' in navigator) {
        navigator.mediaSession.setActionHandler('play', null);
        navigator.mediaSession.setActionHandler('pause', null);
        navigator.mediaSession.setActionHandler('previoustrack', null);
        navigator.mediaSession.setActionHandler('nexttrack', null);
        try {
          navigator.mediaSession.setActionHandler('seekto', null);
        } catch (err) {
          void err;
        }
      }
    };
  }, [
    currentTrack,
    displayTitle,
    displayArtist,
    displayAlbum,
    displayCover,
    isPlaying,
    selectPreviousTrack,
    selectNextTrack,
    handleSeek,
  ]);

  const seekToClientX = (clientX: number) => {
    const track = progressTrackRef.current;
    if (!track || duration <= 0) return;

    const { left, width } = track.getBoundingClientRect();
    if (width <= 0) return;

    const ratio = Math.min(1, Math.max(0, (clientX - left) / width));
    handleSeek(ratio * duration);
  };

  const handleProgressPointerDown = (event: PointerEvent<HTMLDivElement>) => {
    if (duration <= 0) return;

    event.preventDefault();
    event.stopPropagation();
    isSeekingRef.current = true;
    try {
      event.currentTarget.setPointerCapture(event.pointerId);
    } catch {
      // 部分 WebView/浏览器在非活动指针上会拒绝捕获，不影响后续 seek。
    }
    seekToClientX(event.clientX);
  };

  const handleProgressPointerMove = (event: PointerEvent<HTMLDivElement>) => {
    if (!isSeekingRef.current) return;

    event.preventDefault();
    event.stopPropagation();
    seekToClientX(event.clientX);
  };

  const stopProgressSeeking = (event: PointerEvent<HTMLDivElement>) => {
    if (!isSeekingRef.current) return;

    event.preventDefault();
    event.stopPropagation();
    isSeekingRef.current = false;
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
    if (currentAudio) {
      persistPlaybackState({
        audio: currentAudio,
        currentTime: Math.round(
          getPlaybackTime(audioRef.current, pendingSeekTimeRef.current, progress)
        ),
        playMode,
      });
    }
  };

  const handleProgressKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (duration <= 0) return;

    const smallStep = 5;
    const largeStep = 30;

    if (event.key === 'ArrowLeft') {
      event.preventDefault();
      handleSeek(progress - smallStep);
      return;
    }

    if (event.key === 'ArrowRight') {
      event.preventDefault();
      handleSeek(progress + smallStep);
      return;
    }

    if (event.key === 'PageDown') {
      event.preventDefault();
      handleSeek(progress - largeStep);
      return;
    }

    if (event.key === 'PageUp') {
      event.preventDefault();
      handleSeek(progress + largeStep);
      return;
    }

    if (event.key === 'Home') {
      event.preventDefault();
      handleSeek(0);
      return;
    }

    if (event.key === 'End') {
      event.preventDefault();
      handleSeek(duration);
    }
  };

  const handleVolumeChange = (value: number) => {
    setVolume(clampVolume(value));
  };

  const handlePlayerPointerDown = (event: PointerEvent<HTMLDivElement>) => {
    const player = playerSurfaceRef.current;
    if (!player || !isCollapsed || !event.isPrimary || event.button !== 0) return;

    // Capture on the button immediately: fast movement must not lose the pointer,
    // while a stationary click must still target the capsule button.
    capturePointer(capsuleRef.current ?? event.currentTarget, event.pointerId);

    const { width, height, left, top } = player.getBoundingClientRect();

    dragStateRef.current = {
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      originX: left,
      originY: top,
      width,
      height,
      visualX: left,
      visualY: top,
      frameId: null,
      moved: false,
    };
  };

  const handlePlayerPointerMove = (event: PointerEvent<HTMLDivElement>) => {
    const dragState = dragStateRef.current;
    const player = playerSurfaceRef.current;
    if (!dragState || dragState.pointerId !== event.pointerId || !player) return;

    const deltaX = event.clientX - dragState.startX;
    const deltaY = event.clientY - dragState.startY;
    const moved = dragState.moved || Math.hypot(deltaX, deltaY) > PLAYER_DRAG_THRESHOLD;

    if (!moved) return;

    if (!dragState.moved) capturePointer(event.currentTarget, event.pointerId);

    dragState.moved = true;
    suppressPlayerClickRef.current = true;
    event.preventDefault();

    const nextPosition = clampPlayerPosition(
      {
        x: dragState.originX + deltaX,
        y: dragState.originY + deltaY,
      },
      dragState.width,
      dragState.height
    );

    dragState.visualX = nextPosition.x;
    dragState.visualY = nextPosition.y;

    if (dragState.frameId !== null) return;

    player.dataset.dragging = 'true';
    player.style.willChange = 'transform';
    dragState.frameId = window.requestAnimationFrame(() => {
      dragState.frameId = null;
      player.style.transform = `translate3d(${dragState.visualX - dragState.originX}px, ${
        dragState.visualY - dragState.originY
      }px, 0)`;
    });
  };

  const handlePlayerPointerEnd = (event: PointerEvent<HTMLDivElement>) => {
    const dragState = dragStateRef.current;
    const surface = playerSurfaceRef.current;
    const player = playerRef.current;
    if (!dragState || dragState.pointerId !== event.pointerId || !surface || !player) return;

    dragStateRef.current = null;
    if (dragState.frameId !== null) {
      window.cancelAnimationFrame(dragState.frameId);
    }
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
    if (capsuleRef.current?.hasPointerCapture(event.pointerId)) {
      capsuleRef.current.releasePointerCapture(event.pointerId);
    }

    if (dragState.moved) {
      const nextPosition = clampPlayerPosition(
        { x: dragState.visualX, y: dragState.visualY },
        dragState.width,
        dragState.height
      );
      const nextAnchor = getPlayerAnchorFromPosition(
        nextPosition,
        dragState.width,
        dragState.height
      );
      resetPlayerDragStyle(surface);
      commitPlayerAnchor(nextAnchor, player);

      window.setTimeout(() => {
        suppressPlayerClickRef.current = false;
      }, 0);
      return;
    }

    resetPlayerDragStyle(surface);
  };

  const handleCapsuleClick = () => {
    if (suppressPlayerClickRef.current) {
      suppressPlayerClickRef.current = false;
      return;
    }

    setCollapsedWithAnchor(false);
  };

  const cyclePlayMode = () => {
    const currentOptionIndex = playModeOptions.findIndex((option) => option.value === playMode);
    const nextOption =
      playModeOptions[(currentOptionIndex + 1) % playModeOptions.length] ?? playModeOptions[0];
    setPlayMode(nextOption.value);
    setIsVolumeOpen(false);
    if (currentAudio) {
      persistPlaybackState({
        audio: currentAudio,
        currentTime: Math.round(progress),
        playMode: nextOption.value,
      });
    }
  };

  if (!currentTrack) return null;

  return (
    <>
      {!isCollapsed && isMobile && (
        <div
          data-player-backdrop="true"
          className="fixed inset-0 z-[60] bg-black/25 backdrop-blur-[1px] touch-none"
          aria-hidden="true"
          onClick={closePlayer}
        />
      )}

      <div
        ref={playerRef}
        className={cn(
          'music-player-shell fixed z-[70]',
          !isCollapsed && isMobile
            ? 'music-player-shell--compact inset-x-0 flex justify-center pointer-events-none'
            : 'h-0 w-0 overflow-visible'
        )}
        style={
          isCollapsed || !isMobile
            ? playerAnchor
              ? getPlayerAnchorStyle(playerAnchor)
              : undefined
            : undefined
        }
      >
        <audio
          ref={audioRef}
          preload="none"
          onLoadedMetadata={(event) => {
            const dur = event.currentTarget.duration || 0;
            setDuration(dur);
            if (pendingSeekTimeRef.current !== null) {
              const targetTime =
                dur > 3 && pendingSeekTimeRef.current >= dur - 2 ? 0 : pendingSeekTimeRef.current;
              event.currentTarget.currentTime = targetTime;
              pendingSeekTimeRef.current = null;
              setProgress(targetTime);
            }
          }}
          onTimeUpdate={(event) => {
            if (isSeekingRef.current || pendingSeekTimeRef.current !== null) return;
            const current = event.currentTarget.currentTime || 0;
            setProgress(current);

            const now = Date.now();
            if (now - lastPersistTimeRef.current >= PLAYBACK_STATE_PERSIST_INTERVAL_MS) {
              lastPersistTimeRef.current = now;
              if (currentAudio) {
                persistPlaybackState({
                  audio: currentAudio,
                  currentTime: Math.round(current),
                  playMode,
                });
              }
            }
          }}
          onEnded={handleTrackEnded}
          onError={() => {
            if (!audioRef.current?.src) return;
            setIsPlaying(false);
            setError('音频暂时无法播放');
          }}
        />

        <div
          ref={playerSurfaceRef}
          data-player-surface="true"
          className={cn(
            'music-player-surface',
            isCollapsed
              ? 'absolute cursor-grab active:cursor-grabbing'
              : isMobile
                ? 'relative pointer-events-auto'
                : 'absolute'
          )}
          style={isCollapsed || !isMobile ? getPlayerSurfaceStyle(playerAnchor) : undefined}
          onPointerDown={handlePlayerPointerDown}
          onPointerMove={handlePlayerPointerMove}
          onPointerUp={handlePlayerPointerEnd}
          onPointerCancel={handlePlayerPointerEnd}
        >
          {isCollapsed ? (
            <button
              ref={capsuleRef}
              type="button"
              onClick={handleCapsuleClick}
              aria-haspopup="dialog"
              aria-expanded={false}
              className={cn(
                'group flex touch-none items-center rounded-full border border-border/70 bg-card/95 text-left shadow-lg shadow-black/10 backdrop-blur transition-[border-color,box-shadow,background-color,color,opacity] duration-300 hover:border-primary/30 hover:shadow-xl hover:opacity-100 active:cursor-grabbing dark:bg-card/90',
                isPlaying && !isQuietMode
                  ? 'max-w-[15rem] p-1.5 sm:px-2.5 sm:py-2 sm:gap-2'
                  : 'p-1 opacity-75',
                isQuietMode && 'opacity-45'
              )}
              aria-label="展开音乐播放器"
              title={
                isPlaying
                  ? `正在播放：${displayTitle} - ${displayArtist}`
                  : `音乐胶囊：${displayTitle}`
              }
            >
              <div className="relative flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-full bg-muted ring-1 ring-border/60">
                <RecordCover
                  coverUrl={displayCover}
                  title={displayTitle}
                  isPlaying={isPlaying}
                  className="h-full w-full"
                />
                {isPlaying && (
                  <span className="absolute inset-0 rounded-full ring-2 ring-primary/30" />
                )}
              </div>
              {isPlaying && !isQuietMode && (
                <div className="hidden min-w-0 sm:block">
                  <div className="truncate text-sm font-medium leading-tight text-foreground">
                    {displayTitle}
                  </div>
                  <div className="truncate text-xs text-muted-foreground">{displayArtist}</div>
                </div>
              )}
            </button>
          ) : (
            <section
              ref={panelRef}
              role="dialog"
              aria-label="音乐播放器"
              aria-modal={isMobile || undefined}
              tabIndex={-1}
              data-player-surface="true"
              className="music-player-panel flex flex-col overflow-hidden rounded-2xl border border-border/70 bg-card/95 p-3 shadow-2xl shadow-black/15 backdrop-blur outline-none dark:bg-card/90"
            >
              <div className="flex shrink-0 items-center gap-2">
                <div className="relative flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-muted ring-1 ring-border/70">
                  <RecordCover
                    coverUrl={displayCover}
                    title={displayTitle}
                    isPlaying={isPlaying}
                    className="h-11 w-11 shadow-inner"
                    iconClassName="h-6 w-6"
                    centerClassName="h-2.5 w-2.5"
                  />
                  {metadataLoading && !displayCover && (
                    <span
                      aria-hidden="true"
                      className="pointer-events-none absolute inset-0 animate-pulse rounded-xl bg-muted-foreground/15"
                    />
                  )}
                  {isPlaying && (
                    <span className="pointer-events-none absolute inset-1 rounded-full ring-2 ring-primary/20" />
                  )}
                </div>

                <div className="min-w-0 flex-1">
                  <div className="flex min-h-12 items-center justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <h2 className="truncate text-sm font-semibold leading-5 text-foreground">
                        {displayTitle}
                      </h2>
                      <p className="mt-0.5 flex h-4 items-center gap-1.5 text-xs leading-4 text-muted-foreground">
                        <span className="truncate">
                          {displayArtist}
                          {displayAlbum ? ` · ${displayAlbum}` : ''}
                        </span>
                        {metadataLoading && !displayAlbum && (
                          <>
                            <span
                              aria-hidden="true"
                              className="inline-block h-2.5 w-12 shrink-0 animate-pulse rounded-full bg-muted-foreground/20"
                            />
                            <span className="sr-only" role="status">
                              正在加载音乐信息
                            </span>
                          </>
                        )}
                      </p>
                    </div>
                    <div className="relative flex items-center gap-1 shrink-0">
                      <button
                        type="button"
                        data-player-interactive="true"
                        onClick={toggleQuietMode}
                        className={cn(
                          'relative flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-accent hover:text-foreground active:scale-95 touch-manipulation',
                          isQuietMode && 'bg-accent text-foreground'
                        )}
                        aria-label={isQuietMode ? '退出极简角标模式' : '启用极简角标模式'}
                        aria-pressed={isQuietMode}
                        title={
                          isQuietMode
                            ? '已启用极简角标：收起后仅留半透明小图标'
                            : '极简角标：收起后仅保留小图标不展歌名'
                        }
                      >
                        {isQuietMode ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>

                      <button
                        ref={volumeBtnRef}
                        type="button"
                        data-player-interactive="true"
                        data-volume-trigger="true"
                        onClick={() => setIsVolumeOpen((value) => !value)}
                        className={cn(
                          'relative flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-accent hover:text-foreground active:scale-95 touch-manipulation',
                          isVolumeOpen && 'bg-accent text-foreground'
                        )}
                        aria-label="调整音乐播放音量"
                        aria-expanded={isVolumeOpen}
                        title={`音量：${volumePercent}%`}
                      >
                        <VolumeIcon className="h-4 w-4" />
                      </button>

                      <button
                        type="button"
                        data-player-close="true"
                        onClick={closePlayer}
                        className="relative flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-accent hover:text-foreground active:scale-95 touch-manipulation"
                        aria-label="折叠音乐播放器"
                        title="收起播放器"
                      >
                        <ChevronDown className="h-4 w-4" />
                      </button>

                      {isVolumeOpen && (
                        <div
                          ref={volumePanelRef}
                          data-player-interactive="true"
                          className="absolute right-0 top-12 z-20 flex flex-col items-center gap-2 rounded-2xl border border-border/70 bg-card/95 px-3 py-3 shadow-xl shadow-black/15 backdrop-blur dark:bg-card/90"
                          style={{ touchAction: 'none' }}
                          onPointerDown={(e) => e.stopPropagation()}
                        >
                          <span className="text-[11px] tabular-nums text-muted-foreground">
                            {volumePercent}%
                          </span>
                          <input
                            type="range"
                            min={0}
                            max={1}
                            step="0.01"
                            value={volume}
                            onChange={(event) => handleVolumeChange(Number(event.target.value))}
                            className="h-24 w-11 cursor-pointer accent-primary [direction:rtl] [writing-mode:vertical-lr]"
                            aria-label="音乐播放音量"
                          />
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              <div className="min-h-0 max-h-72 overflow-y-auto overscroll-contain">
                {hasLyrics && (
                  <div className="mt-3 rounded-xl border border-border/60 bg-background/60 px-3 py-2 text-center">
                    {syncedLyrics.length > 0 ? (
                      <div className="space-y-1" aria-live="polite">
                        {previousLyric ? (
                          <button
                            type="button"
                            onClick={() => handleSeek(previousLyric.time)}
                            className="line-clamp-1 min-h-5 w-full cursor-pointer text-center text-xs leading-relaxed text-muted-foreground transition-colors hover:text-foreground"
                            title={`跳转到：${previousLyric.text}`}
                          >
                            {previousLyric.text}
                          </button>
                        ) : (
                          <p className="line-clamp-1 min-h-5 text-xs leading-relaxed text-muted-foreground select-none">
                            &nbsp;
                          </p>
                        )}
                        <p className="line-clamp-1 min-h-6 text-sm font-medium leading-relaxed text-foreground">
                          {activeLyric?.text ||
                            (syncedLyrics.length > 0 ? '♪ 前奏中 ♪' : '等待歌词')}
                        </p>
                        {nextLyric ? (
                          <button
                            type="button"
                            onClick={() => handleSeek(nextLyric.time)}
                            className="line-clamp-1 min-h-5 w-full cursor-pointer text-center text-xs leading-relaxed text-muted-foreground transition-colors hover:text-foreground"
                            title={`跳转到：${nextLyric.text}`}
                          >
                            {nextLyric.text}
                          </button>
                        ) : (
                          <p className="line-clamp-1 min-h-5 text-xs leading-relaxed text-muted-foreground select-none">
                            &nbsp;
                          </p>
                        )}
                      </div>
                    ) : (
                      <p className="line-clamp-3 whitespace-pre-line text-xs leading-relaxed text-muted-foreground">
                        {currentMetadata?.lyrics}
                      </p>
                    )}
                  </div>
                )}

                {hasMultipleTracks && isPlaylistOpen && (
                  <div className="mt-3 rounded-xl border border-border/60 bg-background/60 p-2">
                    <div className="mb-2 flex items-center justify-between px-1 text-[11px] text-muted-foreground">
                      <span>播放列表</span>
                      <span>{playlistItems.length} 首</span>
                    </div>
                    <div className="space-y-1" data-player-interactive="true">
                      {playlistItems.map((track, index) => {
                        const isCurrentTrack = index === currentIndex;

                        return (
                          <button
                            key={track.audio}
                            ref={isCurrentTrack ? activeTrackItemRef : undefined}
                            type="button"
                            onClick={() => selectTrack(index)}
                            className={cn(
                              'flex w-full items-center gap-2 rounded-lg px-2 py-2 text-left transition-colors hover:bg-accent',
                              isCurrentTrack &&
                                'bg-primary/10 text-foreground ring-1 ring-primary/20'
                            )}
                            aria-current={isCurrentTrack ? 'true' : undefined}
                          >
                            <RecordCover
                              coverUrl={track.coverUrl}
                              title={track.title}
                              isPlaying={isCurrentTrack && isPlaying}
                              className="h-8 w-8 shrink-0 rounded-md ring-1 ring-border/50"
                              iconClassName="h-4 w-4"
                              centerClassName="h-1.5 w-1.5"
                            />
                            <div className="min-w-0 flex-1">
                              <div className="truncate text-xs font-medium text-foreground">
                                {track.title}
                              </div>
                              <div className="truncate text-[11px] text-muted-foreground">
                                {track.artist}
                                {track.album ? ` · ${track.album}` : ''}
                              </div>
                            </div>
                            {isCurrentTrack && (
                              <span className="shrink-0 rounded-full bg-primary px-2 py-0.5 text-[10px] text-primary-foreground">
                                当前
                              </span>
                            )}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>

              <div className="shrink-0 pt-3">
                <div>
                  <div
                    ref={progressTrackRef}
                    role="slider"
                    data-player-interactive="true"
                    tabIndex={duration > 0 ? 0 : -1}
                    aria-label="音乐播放进度"
                    aria-valuemin={0}
                    aria-valuemax={Math.max(0, Math.round(duration))}
                    aria-valuenow={Math.round(progress)}
                    aria-valuetext={`${formatTime(progress)} / ${formatTime(duration)}`}
                    aria-disabled={duration <= 0}
                    onPointerDown={handleProgressPointerDown}
                    onPointerMove={handleProgressPointerMove}
                    onPointerUp={stopProgressSeeking}
                    onPointerCancel={stopProgressSeeking}
                    onKeyDown={handleProgressKeyDown}
                    className={cn(
                      'relative h-8 touch-none select-none rounded-full outline-none focus-visible:ring-2 focus-visible:ring-primary/50 focus-visible:ring-offset-2 focus-visible:ring-offset-background',
                      duration > 0 ? 'cursor-pointer' : 'cursor-not-allowed opacity-60'
                    )}
                  >
                    <div className="absolute top-1/2 right-0 left-0 h-1 -translate-y-1/2 overflow-hidden rounded-full bg-muted">
                      <div
                        className="h-full rounded-full bg-primary"
                        style={{ width: `${progressPercent}%` }}
                      />
                    </div>
                    <div
                      className="absolute top-1/2 flex h-7 w-7 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full"
                      style={{ left: `${progressPercent}%` }}
                    >
                      <span className="h-3 w-3 rounded-full bg-primary shadow-sm ring-2 ring-background" />
                    </div>
                  </div>
                  <div className="mt-1 flex justify-between text-[11px] text-muted-foreground">
                    <span>{formatTime(progress)}</span>
                    <span>{formatTime(duration)}</span>
                  </div>
                </div>

                <div
                  data-player-interactive="true"
                  data-player-controls="true"
                  className="mt-2 relative flex items-center justify-between gap-1 select-none"
                >
                  {/* 播放模式切换 */}
                  <button
                    type="button"
                    data-player-interactive="true"
                    onClick={cyclePlayMode}
                    className="relative flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-accent hover:text-foreground active:scale-95 touch-manipulation"
                    aria-label={`切换播放模式，当前：${activePlayMode.label}`}
                    title={activePlayMode.label}
                  >
                    <ActivePlayModeIcon className="h-4.5 w-4.5 sm:h-4 sm:w-4" />
                  </button>

                  {/* 核心播放控制：上一首、播放/暂停、下一首 */}
                  <div className="flex items-center gap-1 sm:gap-2">
                    <button
                      type="button"
                      data-player-interactive="true"
                      onClick={selectPreviousTrack}
                      disabled={!hasMultipleTracks && playMode !== 'single'}
                      className="relative flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-accent hover:text-foreground active:scale-95 disabled:cursor-not-allowed disabled:opacity-40 disabled:active:scale-100 touch-manipulation"
                      aria-label="上一首"
                    >
                      <SkipBack className="h-4.5 w-4.5 sm:h-4 sm:w-4" />
                    </button>

                    <button
                      type="button"
                      data-player-interactive="true"
                      onClick={togglePlayback}
                      className="relative inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-sm transition-transform hover:scale-105 active:scale-95 touch-manipulation"
                      aria-label={isPlaying ? '暂停音乐' : '播放音乐'}
                    >
                      {isPlaying ? (
                        <Pause className="h-5 w-5 sm:h-4.5 sm:w-4.5" />
                      ) : (
                        <Play className="ml-0.5 h-5 w-5 sm:h-4.5 sm:w-4.5" />
                      )}
                    </button>

                    <button
                      type="button"
                      data-player-interactive="true"
                      onClick={selectNextTrack}
                      disabled={!hasMultipleTracks && playMode !== 'single'}
                      className="relative flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-accent hover:text-foreground active:scale-95 disabled:cursor-not-allowed disabled:opacity-40 disabled:active:scale-100 touch-manipulation"
                      aria-label="下一首"
                    >
                      <SkipForward className="h-4.5 w-4.5 sm:h-4 sm:w-4" />
                    </button>
                  </div>

                  {/* 播放列表 */}
                  <button
                    type="button"
                    data-player-interactive="true"
                    onClick={() => {
                      setIsPlaylistOpen((value) => !value);
                      setIsVolumeOpen(false);
                    }}
                    disabled={!hasMultipleTracks}
                    className={cn(
                      'relative flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-accent hover:text-foreground active:scale-95 disabled:cursor-not-allowed disabled:opacity-40 disabled:active:scale-100 touch-manipulation',
                      isPlaylistOpen && 'bg-accent text-foreground'
                    )}
                    aria-label={isPlaylistOpen ? '收起播放列表' : '展开播放列表'}
                    aria-expanded={isPlaylistOpen}
                    title="播放列表"
                  >
                    <Menu className="h-4.5 w-4.5 sm:h-4 sm:w-4" />
                  </button>
                </div>

                {error && (
                  <p role="status" className="mt-2 text-center text-xs text-destructive">
                    {error}
                  </p>
                )}
              </div>
            </section>
          )}
        </div>
      </div>
    </>
  );
}
