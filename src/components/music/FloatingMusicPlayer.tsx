import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ChevronDown, Menu, Music2, Pause, Play, Repeat, Repeat1, Shuffle, SkipBack, SkipForward, Volume2, VolumeX } from 'lucide-react';
import { cn } from '@/lib/utils';
import { getFallbackMetadata, loadMp3Metadata, type Mp3Metadata } from '@/lib/mp3-metadata';

export type MusicTrack = {
  audio: string;
};

type FloatingMusicPlayerProps = {
  tracks: MusicTrack[];
};

type PlayMode = 'sequence' | 'single' | 'shuffle';

const playModeOptions: { value: PlayMode; label: string; Icon: typeof Repeat }[] = [
  { value: 'sequence', label: '顺序播放', Icon: Repeat },
  { value: 'single', label: '单曲循环', Icon: Repeat1 },
  { value: 'shuffle', label: '随机播放', Icon: Shuffle },
];

const MUSIC_VOLUME_STORAGE_KEY = 'blog-music-volume';
const defaultVolume = 0.8;

const clampVolume = (value: number) => Math.min(1, Math.max(0, value));

const readStoredVolume = () => {
  if (typeof window === 'undefined') return defaultVolume;
  const storedValue = window.localStorage.getItem(MUSIC_VOLUME_STORAGE_KEY);
  if (storedValue === null) return defaultVolume;
  const parsedValue = Number(storedValue);
  return Number.isFinite(parsedValue) ? clampVolume(parsedValue) : defaultVolume;
};

const formatTime = (seconds: number) => {
  if (!Number.isFinite(seconds) || seconds <= 0) return '0:00';
  const minutes = Math.floor(seconds / 60);
  const remainSeconds = Math.floor(seconds % 60)
    .toString()
    .padStart(2, '0');
  return `${minutes}:${remainSeconds}`;
};

const getActiveLyricIndex = (lyrics: NonNullable<Mp3Metadata['syncedLyrics']>, progress: number) => {
  const index = lyrics.findLastIndex((line) => progress >= line.time);
  return Math.max(index, 0);
};

export function FloatingMusicPlayer({ tracks }: FloatingMusicPlayerProps) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const coverUrlsRef = useRef<Set<string>>(new Set());
  const metadataRequestsRef = useRef<Set<string>>(new Set());
  const [isCollapsed, setIsCollapsed] = useState(true);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const [playMode, setPlayMode] = useState<PlayMode>('sequence');
  const [isPlaylistOpen, setIsPlaylistOpen] = useState(false);
  const [volume, setVolume] = useState(readStoredVolume);
  const [isVolumeOpen, setIsVolumeOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [metadataByAudio, setMetadataByAudio] = useState<Record<string, Mp3Metadata>>({});
  const [metadataLoadingAudio, setMetadataLoadingAudio] = useState<string | null>(null);

  const currentTrack = tracks[currentIndex];
  const currentAudio = currentTrack?.audio;
  const fallbackMetadata = useMemo(
    () => (currentAudio ? getFallbackMetadata(currentAudio) : { title: '未命名音乐', artist: '未知艺术家' }),
    [currentAudio]
  );
  const currentMetadata = currentAudio ? metadataByAudio[currentAudio] : undefined;
  const displayTitle = currentMetadata?.title || fallbackMetadata.title;
  const displayArtist = currentMetadata?.artist || fallbackMetadata.artist;
  const displayAlbum = currentMetadata?.album;
  const displayCover = currentMetadata?.coverUrl;
  const syncedLyrics = currentMetadata?.syncedLyrics ?? [];
  const activeLyricIndex = syncedLyrics.length > 0 ? getActiveLyricIndex(syncedLyrics, progress) : -1;
  const activeLyric = activeLyricIndex >= 0 ? syncedLyrics[activeLyricIndex] : undefined;
  const previousLyric = activeLyricIndex > 0 ? syncedLyrics[activeLyricIndex - 1] : undefined;
  const nextLyric = activeLyricIndex >= 0 ? syncedLyrics[activeLyricIndex + 1] : undefined;
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

  const requestTrackMetadata = useCallback((audio: string) => {
    if (!audio || metadataRequestsRef.current.has(audio)) return;

    metadataRequestsRef.current.add(audio);
    setMetadataLoadingAudio(audio);

    loadMp3Metadata(audio)
      .then((metadata) => {
        if (metadata.coverUrl?.startsWith('blob:')) {
          coverUrlsRef.current.add(metadata.coverUrl);
        }

        setMetadataByAudio((value) => (value[audio] ? value : { ...value, [audio]: metadata }));
      })
      .catch(() => {
        setMetadataByAudio((value) => (value[audio] ? value : { ...value, [audio]: {} }));
      })
      .finally(() => {
        setMetadataLoadingAudio((value) => (value === audio ? null : value));
      });
  }, []);

  useEffect(() => {
    if (currentIndex < tracks.length) return;
    setCurrentIndex(0);
  }, [currentIndex, tracks.length]);

  useEffect(() => {
    if (!currentAudio) return;
    requestTrackMetadata(currentAudio);
  }, [currentAudio, requestTrackMetadata]);

  useEffect(() => {
    if (isCollapsed) return;
    tracks.forEach((track) => requestTrackMetadata(track.audio));
  }, [isCollapsed, requestTrackMetadata, tracks]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio || !currentTrack) return;

    audio.src = currentTrack.audio;
    audio.load();
    setProgress(0);
    setDuration(0);
    setError(null);
  }, [currentTrack]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    if (!isPlaying) {
      audio.pause();
      return;
    }

    audio.play().catch(() => {
      setIsPlaying(false);
      setError('音频暂时无法播放');
    });
  }, [currentIndex, isPlaying]);

  useEffect(() => {
    const audio = audioRef.current;
    if (audio) audio.volume = volume;
    window.localStorage.setItem(MUSIC_VOLUME_STORAGE_KEY, volume.toString());
  }, [volume]);

  useEffect(() => {
    return () => {
      coverUrlsRef.current.forEach((coverUrl) => URL.revokeObjectURL(coverUrl));
      coverUrlsRef.current.clear();
    };
  }, []);

  if (!currentTrack) return null;

  const hasMultipleTracks = tracks.length > 1;
  const progressPercent = duration > 0 ? Math.min(100, (progress / duration) * 100) : 0;
  const hasLyrics = syncedLyrics.length > 0 || Boolean(currentMetadata?.lyrics);
  const volumePercent = Math.round(volume * 100);
  const VolumeIcon = volume === 0 ? VolumeX : Volume2;
  const activePlayMode = playModeOptions.find((option) => option.value === playMode) ?? playModeOptions[0];
  const ActivePlayModeIcon = activePlayMode.Icon;

  const selectTrack = (index: number, autoplay = true) => {
    if (!tracks[index]) return;
    setError(null);
    setIsVolumeOpen(false);
    setCurrentIndex(index);
    if (autoplay) setIsPlaying(true);
  };

  const getRandomTrackIndex = (currentTrackIndex: number) => {
    if (tracks.length <= 1) return currentTrackIndex;

    let nextIndex = currentTrackIndex;
    while (nextIndex === currentTrackIndex) {
      nextIndex = Math.floor(Math.random() * tracks.length);
    }

    return nextIndex;
  };

  const replayCurrentTrack = () => {
    const audio = audioRef.current;
    if (!audio) return;

    audio.currentTime = 0;
    setProgress(0);
    if (isPlaying) {
      audio.play().catch(() => {
        setIsPlaying(false);
        setError('音频暂时无法播放');
      });
    }
  };

  const selectPreviousTrack = () => {
    if (playMode === 'single') {
      replayCurrentTrack();
      return;
    }

    if (!hasMultipleTracks) return;
    setCurrentIndex((index) => (playMode === 'shuffle' ? getRandomTrackIndex(index) : (index - 1 + tracks.length) % tracks.length));
  };

  const selectNextTrack = () => {
    if (playMode === 'single') {
      replayCurrentTrack();
      return;
    }

    if (!hasMultipleTracks) return;
    setCurrentIndex((index) => (playMode === 'shuffle' ? getRandomTrackIndex(index) : (index + 1) % tracks.length));
  };

  const handleTrackEnded = () => {
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
    setIsPlaying((value) => !value);
  };

  const handleSeek = (value: number) => {
    const audio = audioRef.current;
    if (!audio || duration <= 0) return;
    audio.currentTime = value;
    setProgress(value);
  };

  const handleVolumeChange = (value: number) => {
    setVolume(clampVolume(value));
  };

  const cyclePlayMode = () => {
    const currentOptionIndex = playModeOptions.findIndex((option) => option.value === playMode);
    const nextOption = playModeOptions[(currentOptionIndex + 1) % playModeOptions.length] ?? playModeOptions[0];
    setPlayMode(nextOption.value);
    setIsVolumeOpen(false);
  };

  return (
    <div className="fixed right-4 bottom-24 z-50 md:right-6">
      <audio
        ref={audioRef}
        preload="metadata"
        onLoadedMetadata={(event) => setDuration(event.currentTarget.duration || 0)}
        onTimeUpdate={(event) => setProgress(event.currentTarget.currentTime || 0)}
        onEnded={handleTrackEnded}
        onError={() => {
          setIsPlaying(false);
          setError('音频暂时无法播放');
        }}
      />

      {isCollapsed ? (
        <button
          type="button"
          onClick={() => setIsCollapsed(false)}
          className="group flex max-w-[15rem] items-center gap-2 rounded-full border border-border/70 bg-card/95 px-2.5 py-2 text-left shadow-lg shadow-black/10 backdrop-blur transition-all duration-300 hover:-translate-y-0.5 hover:border-primary/30 hover:shadow-xl dark:bg-card/90"
          aria-label="展开音乐播放器"
        >
          <div className="relative flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-full bg-muted ring-1 ring-border/60">
            {displayCover ? (
              <img
                src={displayCover}
                alt={displayTitle}
                className={cn('h-full w-full object-cover', isPlaying && 'animate-spin [animation-duration:6s]')}
                loading="lazy"
                decoding="async"
              />
            ) : (
              <Music2 className={cn('h-4 w-4 text-muted-foreground', isPlaying && 'text-primary')} />
            )}
            {isPlaying && <span className="absolute inset-0 rounded-full ring-2 ring-primary/30" />}
          </div>
          <div className="hidden min-w-0 sm:block">
            <div className="truncate text-sm font-medium leading-tight text-foreground">{displayTitle}</div>
            <div className="truncate text-xs text-muted-foreground">{displayArtist}</div>
          </div>
        </button>
      ) : (
        <section className="w-[min(calc(100vw-2rem),21rem)] rounded-2xl border border-border/70 bg-card/95 p-3 shadow-2xl shadow-black/15 backdrop-blur dark:bg-card/90">
          <div className="flex items-start gap-3">
            <div className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-muted ring-1 ring-border/70">
              {displayCover ? (
                <img
                  src={displayCover}
                  alt={displayTitle}
                  className="h-full w-full object-cover"
                  loading="lazy"
                  decoding="async"
                />
              ) : (
                <Music2 className="h-6 w-6 text-muted-foreground" />
              )}
            </div>

            <div className="min-w-0 flex-1">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <h2 className="truncate text-sm font-semibold text-foreground">{displayTitle}</h2>
                  <p className="truncate text-xs text-muted-foreground">
                    {displayArtist}
                    {displayAlbum ? ` · ${displayAlbum}` : ''}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setIsCollapsed(true)}
                  className="rounded-full p-1 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
                  aria-label="折叠音乐播放器"
                >
                  <ChevronDown className="h-4 w-4" />
                </button>
              </div>

              {metadataLoading && <p className="mt-1 text-xs text-muted-foreground">正在读取 MP3 信息...</p>}
            </div>
          </div>

          {hasLyrics && (
            <div className="mt-3 rounded-xl border border-border/60 bg-background/60 px-3 py-2 text-center">
              {syncedLyrics.length > 0 ? (
                <div className="space-y-1" aria-live="polite">
                  <p className="line-clamp-1 min-h-5 text-xs leading-relaxed text-muted-foreground">
                    {previousLyric?.text || '\u00A0'}
                  </p>
                  <p className="line-clamp-1 min-h-6 text-sm font-medium leading-relaxed text-foreground">
                    {activeLyric?.text || '等待歌词'}
                  </p>
                  <p className="line-clamp-1 min-h-5 text-xs leading-relaxed text-muted-foreground">
                    {nextLyric?.text || '\u00A0'}
                  </p>
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
              <div className="max-h-40 space-y-1 overflow-y-auto pr-1">
                {playlistItems.map((track, index) => {
                  const isCurrentTrack = index === currentIndex;

                  return (
                    <button
                      key={track.audio}
                      type="button"
                      onClick={() => selectTrack(index)}
                      className={cn(
                        'flex w-full items-center gap-2 rounded-lg px-2 py-2 text-left transition-colors hover:bg-accent',
                        isCurrentTrack && 'bg-primary/10 text-foreground ring-1 ring-primary/20'
                      )}
                      aria-current={isCurrentTrack ? 'true' : undefined}
                    >
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center overflow-hidden rounded-md bg-muted ring-1 ring-border/50">
                        {track.coverUrl ? (
                          <img
                            src={track.coverUrl}
                            alt={track.title}
                            className="h-full w-full object-cover"
                            loading="lazy"
                            decoding="async"
                          />
                        ) : (
                          <Music2 className="h-4 w-4 text-muted-foreground" />
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="truncate text-xs font-medium text-foreground">{track.title}</div>
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
            <input
              type="range"
              min={0}
              max={duration || 0}
              step="0.1"
              value={duration ? progress : 0}
              onChange={(event) => handleSeek(Number(event.target.value))}
              className="h-1 w-full cursor-pointer appearance-none rounded-full bg-muted accent-primary"
              style={{
                background: `linear-gradient(to right, var(--primary) 0%, var(--primary) ${progressPercent}%, var(--muted) ${progressPercent}%, var(--muted) 100%)`,
              }}
              aria-label="音乐播放进度"
            />
            <div className="mt-1 flex justify-between text-[11px] text-muted-foreground">
              <span>{formatTime(progress)}</span>
              <span>{formatTime(duration)}</span>
            </div>
          </div>

          <div className="mt-2 relative flex items-center justify-center">
            <div className="flex items-center justify-center gap-2">
              <button
                type="button"
                onClick={cyclePlayMode}
                className="rounded-full p-2 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
                aria-label={`切换播放模式，当前：${activePlayMode.label}`}
                title={activePlayMode.label}
              >
                <ActivePlayModeIcon className="h-4 w-4" />
              </button>

              <button
                type="button"
                onClick={selectPreviousTrack}
                disabled={!hasMultipleTracks && playMode !== 'single'}
                className="rounded-full p-2 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground disabled:cursor-not-allowed disabled:opacity-40"
                aria-label="上一首"
              >
                <SkipBack className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={togglePlayback}
                className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-sm transition-transform hover:scale-105"
                aria-label={isPlaying ? '暂停音乐' : '播放音乐'}
              >
                {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="ml-0.5 h-4 w-4" />}
              </button>
              <button
                type="button"
                onClick={selectNextTrack}
                disabled={!hasMultipleTracks && playMode !== 'single'}
                className="rounded-full p-2 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground disabled:cursor-not-allowed disabled:opacity-40"
                aria-label="下一首"
              >
                <SkipForward className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={() => {
                  setIsPlaylistOpen((value) => !value);
                  setIsVolumeOpen(false);
                }}
                disabled={!hasMultipleTracks}
                className={cn(
                  'rounded-full p-2 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground disabled:cursor-not-allowed disabled:opacity-40',
                  isPlaylistOpen && 'bg-accent text-foreground'
                )}
                aria-label={isPlaylistOpen ? '收起播放列表' : '展开播放列表'}
                aria-expanded={isPlaylistOpen}
              >
                <Menu className="h-4 w-4" />
              </button>
            </div>

            <div className="absolute right-0">
              <button
                type="button"
                onClick={() => setIsVolumeOpen((value) => !value)}
                className={cn(
                  'rounded-full p-2 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground',
                  isVolumeOpen && 'bg-accent text-foreground'
                )}
                aria-label="调整音乐播放音量"
                aria-expanded={isVolumeOpen}
              >
                <VolumeIcon className="h-4 w-4" />
              </button>

              {isVolumeOpen && (
                <div className="absolute right-0 bottom-11 flex flex-col items-center gap-2 rounded-2xl border border-border/70 bg-card/95 px-3 py-3 shadow-xl shadow-black/15 backdrop-blur dark:bg-card/90">
                  <span className="text-[11px] tabular-nums text-muted-foreground">{volumePercent}%</span>
                  <input
                    type="range"
                    min={0}
                    max={1}
                    step="0.01"
                    value={volume}
                    onChange={(event) => handleVolumeChange(Number(event.target.value))}
                    className="h-24 w-2 cursor-pointer appearance-none rounded-full bg-muted accent-primary [direction:rtl] [writing-mode:vertical-lr]"
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
  );
}