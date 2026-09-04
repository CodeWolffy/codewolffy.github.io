import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent,
  type PointerEvent,
} from 'react';
import {
  ChevronDown,
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
import { getFallbackMetadata, loadMp3Metadata, type Mp3Metadata } from '@/lib/mp3-metadata';
import { RecordCover } from './RecordCover';
import {
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
  getPlayerAnchorFromPosition,
  getPlayerAnchorStyle,
  getPlayerSurfaceStyle,
  isPointerInsidePlayer,
  isSameAnchor,
  persistPlaybackState,
  persistPlayerAnchor,
  readStoredPlaybackState,
  readStoredPlayerAnchor,
  readStoredVolume,
  resetPlayerDragStyle,
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

export function FloatingMusicPlayer({ tracks }: FloatingMusicPlayerProps) {
  const playerRef = useRef<HTMLDivElement>(null);
  const playerSurfaceRef = useRef<HTMLDivElement>(null);
  const audioRef = useRef<HTMLAudioElement>(null);
  const progressTrackRef = useRef<HTMLDivElement>(null);
  const volumeBtnRef = useRef<HTMLButtonElement>(null);
  const volumePanelRef = useRef<HTMLDivElement>(null);
  const activeTrackItemRef = useRef<HTMLButtonElement>(null);
  const isSeekingRef = useRef(false);
  const dragStateRef = useRef<PlayerDragState | null>(null);
  const playerAnchorRef = useRef<PlayerTransitionAnchor | null>(null);
  const suppressPlayerClickRef = useRef(false);
  const coverUrlsRef = useRef<Set<string>>(new Set());
  const metadataRequestsRef = useRef<Set<string>>(new Set());
  const metadataDebounceTimerRef = useRef<number | null>(null);
  const storedPlaybackState = useMemo(() => readStoredPlaybackState(), []);
  const pendingSeekTimeRef = useRef<number | null>(
    storedPlaybackState?.currentTime && storedPlaybackState.currentTime > 0
      ? storedPlaybackState.currentTime
      : null
  );
  const lastLoadedAudioRef = useRef<string | null>(null);
  const lastPersistTimeRef = useRef<number>(0);

  const [isCollapsed, setIsCollapsed] = useState(true);
  const [currentIndex, setCurrentIndex] = useState(() => {
    if (storedPlaybackState?.audio) {
      const idx = tracks.findIndex((t) => t.audio === storedPlaybackState.audio);
      if (idx >= 0) return idx;
    }
    return 0;
  });
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(() => {
    return storedPlaybackState?.currentTime && storedPlaybackState.currentTime > 0
      ? storedPlaybackState.currentTime
      : 0;
  });
  const [duration, setDuration] = useState(0);
  const [playMode, setPlayMode] = useState<PlayMode>(() => {
    return storedPlaybackState?.playMode || 'sequence';
  });
  const [isPlaylistOpen, setIsPlaylistOpen] = useState(false);
  const [volume, setVolume] = useState(readStoredVolume);
  const [isVolumeOpen, setIsVolumeOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [metadataByAudio, setMetadataByAudio] = useState<Record<string, Mp3Metadata>>({});
  const [metadataLoadingAudio, setMetadataLoadingAudio] = useState<string | null>(null);
  const [playerAnchor, setPlayerAnchor] = useState<PlayerTransitionAnchor | null>(
    readStoredPlayerAnchor
  );
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const updateIsMobile = () => {
      setIsMobile(window.innerWidth < 640);
    };

    updateIsMobile();
    window.addEventListener('resize', updateIsMobile);
    return () => window.removeEventListener('resize', updateIsMobile);
  }, []);

  const currentTrack = tracks[currentIndex];
  const currentAudio = currentTrack?.audio;
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
  const metadataLoading = metadataLoadingAudio === currentAudio;
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

  const requestTrackMetadata = useCallback(
    (audio: string, currentTracks: MusicTrack[]) => {
      if (!audio) return;

      // 清除上一次的防抖计时器
      if (metadataDebounceTimerRef.current !== null) {
        window.clearTimeout(metadataDebounceTimerRef.current);
      }

      // 如果已经缓存了此音频，则不需要再次请求
      if (metadataByAudio[audio]) return;

      // 已经有正在执行的请求了，避免重复请求
      if (metadataRequestsRef.current.has(audio)) return;

      // 延迟 200ms 发起元数据网络读取，防止连续切歌瞬间发起大量网络请求
      metadataDebounceTimerRef.current = window.setTimeout(() => {
        metadataDebounceTimerRef.current = null;

        if (metadataRequestsRef.current.has(audio)) return;
        metadataRequestsRef.current.add(audio);
        setMetadataLoadingAudio(audio);

        loadMp3Metadata(audio)
          .then((metadata) => {
            if (metadata.coverUrl?.startsWith('blob:')) {
              coverUrlsRef.current.add(metadata.coverUrl);
            }

            setMetadataByAudio((value) => {
              if (value[audio]) return value;

              const nextMetadata = { ...value, [audio]: metadata };

              // 统计当前带 blob: 封面的缓存项
              const itemsWithBlobCover = Object.entries(nextMetadata).filter(([, item]) =>
                item.coverUrl?.startsWith('blob:')
              );

              // 仅当包含 blob: 封面的歌曲数量超过 30 首时，才去清理最久未播放音频的封面图片
              // 清理时只注销 coverUrl，保留其余的文本数据（歌名、歌手、歌词等），确保体验不受损
              if (itemsWithBlobCover.length > 30) {
                // 找出距离当前播放位置最远的带有 blob 封面的歌曲进行清理
                const currentTrackIndex = currentTracks.findIndex((t) => t.audio === audio);

                if (currentTrackIndex !== -1) {
                  // 计算所有歌曲到当前播放歌曲的距离（环形距离）
                  const sortedByDistance = itemsWithBlobCover
                    .map(([key, item]) => {
                      const idx = currentTracks.findIndex((t) => t.audio === key);
                      let distance = 0;
                      if (idx !== -1) {
                        const rawDiff = Math.abs(idx - currentTrackIndex);
                        distance = Math.min(rawDiff, currentTracks.length - rawDiff);
                      }
                      return { key, item, distance };
                    })
                    .sort((a, b) => b.distance - a.distance); // 距离最远的排在最前面

                  const itemToPrune = sortedByDistance[0];
                  if (itemToPrune && itemToPrune.item.coverUrl) {
                    URL.revokeObjectURL(itemToPrune.item.coverUrl);
                    coverUrlsRef.current.delete(itemToPrune.item.coverUrl);

                    // 只把封面置空以防内存泄露，文字元数据（歌名、歌词）等全部保留
                    nextMetadata[itemToPrune.key] = {
                      ...itemToPrune.item,
                      coverUrl: undefined,
                    };
                  }
                }
              }

              return nextMetadata;
            });
          })
          .catch(() => {
            setMetadataByAudio((value) => (value[audio] ? value : { ...value, [audio]: {} }));
          })
          .finally(() => {
            setMetadataLoadingAudio((value) => (value === audio ? null : value));
          });
      }, 200);
    },
    // metadataByAudio 不再作为依赖，避免闭包陷阱。
    // metadataByAudio 的读取是在 setState 的回调中进行的，始终能获取最新值。
    // eslint-disable-next-line react-hooks/exhaustive-deps
    []
  );

  const commitPlayerAnchor = useCallback(
    (nextAnchor: PlayerTransitionAnchor, player = playerRef.current) => {
      playerAnchorRef.current = nextAnchor;
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

  useEffect(() => {
    if (currentIndex < tracks.length) return;
    setCurrentIndex(0);
  }, [currentIndex, tracks.length]);

  useEffect(() => {
    if (!currentAudio) return;
    requestTrackMetadata(currentAudio, tracks);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentAudio, requestTrackMetadata]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio || !currentAudio) return;

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
  }, [currentAudio]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    if (!isPlaying) {
      audio.pause();
      return;
    }

    if (!currentAudio) {
      setIsPlaying(false);
      return;
    }

    const nextSrc = resolveAudioSrc(currentAudio);
    if (audio.src !== nextSrc) {
      audio.src = nextSrc;
      audio.load();
    }

    requestTrackMetadata(currentAudio, tracks);

    if (pendingSeekTimeRef.current !== null && audio.readyState >= 1) {
      audio.currentTime = pendingSeekTimeRef.current;
      pendingSeekTimeRef.current = null;
    }

    audio.play().catch((err: unknown) => {
      if (err instanceof Error && err.name === 'AbortError') return;
      setIsPlaying(false);
      setError('音频暂时无法播放');
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentAudio, isPlaying, requestTrackMetadata]);

  useEffect(() => {
    const handleUnload = () => {
      if (!currentAudio) return;
      const audio = audioRef.current;
      const currentTime =
        audio && Number.isFinite(audio.currentTime) ? audio.currentTime : progress;
      persistPlaybackState({
        audio: currentAudio,
        currentTime: Math.max(0, Math.round(currentTime)),
        playMode,
      });
    };

    window.addEventListener('pagehide', handleUnload);
    window.addEventListener('beforeunload', handleUnload);
    return () => {
      window.removeEventListener('pagehide', handleUnload);
      window.removeEventListener('beforeunload', handleUnload);
    };
  }, [currentAudio, progress, playMode]);

  useEffect(() => {
    const audio = audioRef.current;
    if (audio) audio.volume = volume;

    const timer = window.setTimeout(() => {
      window.localStorage.setItem(MUSIC_VOLUME_STORAGE_KEY, volume.toString());
    }, VOLUME_PERSIST_DEBOUNCE_MS);

    return () => window.clearTimeout(timer);
  }, [volume]);

  useEffect(() => {
    const coverUrls = coverUrlsRef.current;

    return () => {
      if (metadataDebounceTimerRef.current !== null) {
        window.clearTimeout(metadataDebounceTimerRef.current);
      }
      coverUrls.forEach((coverUrl) => URL.revokeObjectURL(coverUrl));
      coverUrls.clear();
    };
  }, []);

  useEffect(() => {
    const handleDocumentPointerDown = (event: globalThis.PointerEvent) => {
      if (isCollapsed) return;

      const surface = playerSurfaceRef.current;
      const target = event.target as Node | null;
      const composedPath =
        typeof event.composedPath === 'function' ? event.composedPath() : undefined;

      if (!isPointerInsidePlayer(surface, target, composedPath)) {
        event.preventDefault();
        event.stopPropagation();

        const swallowEvent = (e: Event) => {
          e.preventDefault();
          e.stopPropagation();
          e.stopImmediatePropagation();
        };

        document.addEventListener('click', swallowEvent, { capture: true, once: true });
        document.addEventListener('touchend', swallowEvent, { capture: true, once: true });

        window.setTimeout(() => {
          document.removeEventListener('click', swallowEvent, { capture: true });
          document.removeEventListener('touchend', swallowEvent, { capture: true });
        }, 400);

        setCollapsedWithAnchor(true);
        setIsVolumeOpen(false);
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
  }, [isCollapsed, setCollapsedWithAnchor]);

  useEffect(() => {
    const player = playerRef.current;
    if (!player) return;

    if (isMobile && !isCollapsed) {
      clearPlayerAnchorStyle(player);
    } else if (playerAnchor) {
      applyPlayerAnchorStyle(player, playerAnchor);
    }
  }, [isMobile, isCollapsed, playerAnchor]);

  useEffect(() => {
    const handleResize = () => {
      const player = playerRef.current;
      const surface = playerSurfaceRef.current;
      if (!player || !surface) return;

      if (isMobile && !isCollapsed) return;

      const { width, height } = surface.getBoundingClientRect();
      const currentAnchor = playerAnchorRef.current;
      if (!currentAnchor) return;

      commitPlayerAnchor(clampPlayerAnchor(currentAnchor, width, height), player);
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [commitPlayerAnchor, isMobile, isCollapsed]);

  useEffect(() => {
    const player = playerRef.current;
    const surface = playerSurfaceRef.current;
    if (!player || !surface) return;

    const storedAnchor = readStoredPlayerAnchor();
    if (storedAnchor) {
      const { width, height } = surface.getBoundingClientRect();
      commitPlayerAnchor(clampPlayerAnchor(storedAnchor, width, height), player);
    }
  }, [commitPlayerAnchor]);

  useEffect(() => {
    if (!isPlaylistOpen || isCollapsed || isMobile) return;
    window.requestAnimationFrame(() => {
      const player = playerRef.current;
      const surface = playerSurfaceRef.current;
      const currentAnchor = playerAnchorRef.current;
      if (!player || !surface || !currentAnchor) return;

      const { width, height } = surface.getBoundingClientRect();
      commitPlayerAnchor(clampPlayerAnchor(currentAnchor, width, height), player);
    });
  }, [isPlaylistOpen, isCollapsed, isMobile, commitPlayerAnchor]);

  useEffect(() => {
    if (isCollapsed) return;
    const handleKeyDown = (event: globalThis.KeyboardEvent) => {
      if (event.key === 'Escape') {
        setCollapsedWithAnchor(true);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isCollapsed, setCollapsedWithAnchor]);

  useEffect(() => {
    if (isPlaylistOpen) {
      activeTrackItemRef.current?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
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
      currentTime: 0,
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

    audio.currentTime = 0;
    setProgress(0);
    if (isPlaying) {
      audio.play().catch((err: unknown) => {
        if (err instanceof Error && err.name === 'AbortError') return;
        setIsPlaying(false);
        setError('音频暂时无法播放');
      });
    }
  }, [isPlaying]);

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
    setIsPlaying((value) => {
      const nextPlaying = !value;
      if (!nextPlaying && currentAudio) {
        const audio = audioRef.current;
        const currentTime =
          audio && Number.isFinite(audio.currentTime) ? audio.currentTime : progress;
        persistPlaybackState({
          audio: currentAudio,
          currentTime: Math.max(0, Math.round(currentTime)),
          playMode,
        });
      }
      return nextPlaying;
    });
  };

  const handleSeek = useCallback(
    (value: number) => {
      const audio = audioRef.current;
      if (!audio || duration <= 0) return;

      const nextProgress = Math.min(duration, Math.max(0, value));
      audio.currentTime = nextProgress;
      setProgress(nextProgress);
      if (currentAudio) {
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
        currentTime: Math.round(progress),
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
    if (!player || !isCollapsed) return;

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
      {/* 移动端展开态背景遮罩，点击即收起 */}
      {!isCollapsed && (
        <div
          className="fixed inset-0 z-40 bg-black/25 backdrop-blur-[1px] transition-opacity duration-200 sm:hidden"
          style={{ touchAction: 'none' }}
          aria-hidden="true"
          onPointerDown={(e) => {
            e.preventDefault();
            e.stopPropagation();
          }}
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            setCollapsedWithAnchor(true);
          }}
        />
      )}

      <div
        ref={playerRef}
        className={cn(
          'music-player-shell fixed z-50',
          isCollapsed
            ? cn('h-0 w-0 overflow-visible', playerAnchor ? '' : 'right-4 bottom-24 md:right-6')
            : cn(
                // 移动端展开态：底部居中对齐，预留两侧与底部边距
                'max-sm:inset-x-0 max-sm:bottom-6 max-sm:top-auto max-sm:flex max-sm:justify-center max-sm:px-3 max-sm:pointer-events-none',
                // 桌面端展开态：锚点定位
                'sm:h-0 sm:w-0 sm:overflow-visible sm:block',
                !playerAnchor && 'sm:right-4 sm:bottom-24 md:sm:right-6'
              )
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
              : 'max-sm:relative max-sm:pointer-events-auto sm:absolute'
          )}
          style={isCollapsed || !isMobile ? getPlayerSurfaceStyle(playerAnchor) : undefined}
          onPointerDown={handlePlayerPointerDown}
          onPointerMove={handlePlayerPointerMove}
          onPointerUp={handlePlayerPointerEnd}
          onPointerCancel={handlePlayerPointerEnd}
        >
          {isCollapsed ? (
            <button
              type="button"
              onClick={handleCapsuleClick}
              className="group flex max-w-[15rem] touch-none items-center p-1.5 sm:px-2.5 sm:py-2 sm:gap-2 rounded-full border border-border/70 bg-card/95 text-left shadow-lg shadow-black/10 backdrop-blur transition-[border-color,box-shadow,background-color,color] duration-300 hover:border-primary/30 hover:shadow-xl active:cursor-grabbing dark:bg-card/90"
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
              <div className="hidden min-w-0 sm:block">
                <div className="truncate text-sm font-medium leading-tight text-foreground">
                  {displayTitle}
                </div>
                <div className="truncate text-xs text-muted-foreground">{displayArtist}</div>
              </div>
            </button>
          ) : (
            <section
              data-player-surface="true"
              className="w-[min(calc(100vw-2rem),22rem)] max-h-[min(38rem,calc(100dvh-3.5rem))] flex flex-col overflow-y-auto rounded-2xl border border-border/70 bg-card/95 p-3 pb-4 sm:p-3 sm:pb-3 shadow-2xl shadow-black/15 backdrop-blur dark:bg-card/90"
            >
              <div className="flex items-start gap-3">
                <div className="relative flex h-14 w-14 shrink-0 items-center justify-center rounded-xl bg-muted ring-1 ring-border/70">
                  <RecordCover
                    coverUrl={displayCover}
                    title={displayTitle}
                    isPlaying={isPlaying}
                    className="h-12 w-12 shadow-inner"
                    iconClassName="h-6 w-6"
                    centerClassName="h-2.5 w-2.5"
                  />
                  {isPlaying && (
                    <span className="pointer-events-none absolute inset-1 rounded-full ring-2 ring-primary/20" />
                  )}
                </div>

                <div className="min-w-0 flex-1">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <h2 className="truncate text-sm font-semibold text-foreground">
                        {displayTitle}
                      </h2>
                      <p className="truncate text-xs text-muted-foreground">
                        {displayArtist}
                        {displayAlbum ? ` · ${displayAlbum}` : ''}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setCollapsedWithAnchor(true)}
                      className="rounded-full p-1.5 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground active:scale-95 touch-manipulation"
                      aria-label="折叠音乐播放器"
                    >
                      <ChevronDown className="h-4 w-4" />
                    </button>
                  </div>

                  {metadataLoading && (
                    <p className="mt-1 text-xs text-muted-foreground">正在读取 MP3 信息...</p>
                  )}
                </div>
              </div>

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
                        {activeLyric?.text || (syncedLyrics.length > 0 ? '♪ 前奏中 ♪' : '等待歌词')}
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
                  <div
                    className="max-h-40 space-y-1 overflow-y-auto pr-1"
                    data-player-interactive="true"
                  >
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
                            isCurrentTrack && 'bg-primary/10 text-foreground ring-1 ring-primary/20'
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

              <div className="mt-3">
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
                className="mt-2.5 relative flex items-center justify-center select-none"
              >
                <div className="flex items-center justify-center gap-1.5 sm:gap-2">
                  <button
                    type="button"
                    data-player-interactive="true"
                    onClick={cyclePlayMode}
                    className="flex h-9 w-9 sm:h-8 sm:w-8 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-accent hover:text-foreground active:scale-95 touch-manipulation"
                    aria-label={`切换播放模式，当前：${activePlayMode.label}`}
                    title={activePlayMode.label}
                  >
                    <ActivePlayModeIcon className="h-4 w-4" />
                  </button>

                  <button
                    type="button"
                    data-player-interactive="true"
                    onClick={selectPreviousTrack}
                    disabled={!hasMultipleTracks && playMode !== 'single'}
                    className="flex h-9 w-9 sm:h-8 sm:w-8 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-accent hover:text-foreground active:scale-95 disabled:cursor-not-allowed disabled:opacity-40 disabled:active:scale-100 touch-manipulation"
                    aria-label="上一首"
                  >
                    <SkipBack className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    data-player-interactive="true"
                    onClick={togglePlayback}
                    className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-sm transition-transform hover:scale-105 active:scale-95 touch-manipulation"
                    aria-label={isPlaying ? '暂停音乐' : '播放音乐'}
                  >
                    {isPlaying ? (
                      <Pause className="h-4 w-4" />
                    ) : (
                      <Play className="ml-0.5 h-4 w-4" />
                    )}
                  </button>
                  <button
                    type="button"
                    data-player-interactive="true"
                    onClick={selectNextTrack}
                    disabled={!hasMultipleTracks && playMode !== 'single'}
                    className="flex h-9 w-9 sm:h-8 sm:w-8 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-accent hover:text-foreground active:scale-95 disabled:cursor-not-allowed disabled:opacity-40 disabled:active:scale-100 touch-manipulation"
                    aria-label="下一首"
                  >
                    <SkipForward className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    data-player-interactive="true"
                    onClick={() => {
                      setIsPlaylistOpen((value) => !value);
                      setIsVolumeOpen(false);
                    }}
                    disabled={!hasMultipleTracks}
                    className={cn(
                      'flex h-9 w-9 sm:h-8 sm:w-8 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-accent hover:text-foreground active:scale-95 disabled:cursor-not-allowed disabled:opacity-40 disabled:active:scale-100 touch-manipulation',
                      isPlaylistOpen && 'bg-accent text-foreground'
                    )}
                    aria-label={isPlaylistOpen ? '收起播放列表' : '展开播放列表'}
                    aria-expanded={isPlaylistOpen}
                  >
                    <Menu className="h-4 w-4" />
                  </button>
                </div>

                <div className="absolute right-0 top-1/2 -translate-y-1/2 flex items-center">
                  <button
                    ref={volumeBtnRef}
                    type="button"
                    data-player-interactive="true"
                    data-volume-trigger="true"
                    onClick={() => setIsVolumeOpen((value) => !value)}
                    className={cn(
                      'flex h-9 w-9 sm:h-8 sm:w-8 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-accent hover:text-foreground active:scale-95 touch-manipulation',
                      isVolumeOpen && 'bg-accent text-foreground'
                    )}
                    aria-label="调整音乐播放音量"
                    aria-expanded={isVolumeOpen}
                  >
                    <VolumeIcon className="h-4 w-4" />
                  </button>

                  {isVolumeOpen && (
                    <div
                      ref={volumePanelRef}
                      data-player-interactive="true"
                      className="absolute right-0 bottom-11 flex flex-col items-center gap-2 rounded-2xl border border-border/70 bg-card/95 px-3 py-3 shadow-xl shadow-black/15 backdrop-blur dark:bg-card/90"
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
                        className="h-24 w-1.5 cursor-pointer appearance-none rounded-full bg-muted accent-primary [direction:rtl] [writing-mode:vertical-lr]"
                        style={{
                          background: `linear-gradient(to top, var(--primary) 0%, var(--primary) ${volumePercent}%, var(--muted) ${volumePercent}%, var(--muted) 100%)`,
                        }}
                        aria-label="音乐播放音量"
                      />
                    </div>
                  )}
                </div>
              </div>

              {error && <p className="mt-2 text-center text-xs text-destructive">{error}</p>}
            </section>
          )}
        </div>
      </div>
    </>
  );
}
