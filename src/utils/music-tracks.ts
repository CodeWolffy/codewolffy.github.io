import { getCollection } from 'astro:content';
import type { MusicTrack } from '@/components/music/FloatingMusicPlayer';

const discoveredMusicFiles = Object.keys(import.meta.glob('/public/music/**/*.mp3'));

const splitUrl = (value: string) => {
  const match = value.match(/^([^?#]*)(.*)$/);
  return {
    pathname: match?.[1] ?? value,
    suffix: match?.[2] ?? '',
  };
};

const encodePathname = (pathname: string) =>
  pathname
    .split('/')
    .map((segment) => {
      if (!segment) return segment;

      try {
        return encodeURIComponent(decodeURIComponent(segment));
      } catch {
        return encodeURIComponent(segment);
      }
    })
    .join('/');

const isMp3Url = (value: string) => /\.mp3(?:$|[?#])/i.test(value);

const toMusicUrl = (value: string) => {
  const trimmed = value.trim().replace(/\\/g, '/');
  if (!trimmed || !isMp3Url(trimmed)) return undefined;
  if (/^https?:\/\//i.test(trimmed)) return trimmed;

  const publicPath = trimmed.replace(/^\/?public\//, '');
  const absolutePath = publicPath.startsWith('/') ? publicPath : `/${publicPath}`;
  const { pathname, suffix } = splitUrl(absolutePath);

  return `${encodePathname(pathname)}${suffix}`;
};

const toPublicMusicUrl = (filePath: string) => toMusicUrl(filePath.replace(/^\/?public\//, ''));

const uniqueTracks = (files: string[]): MusicTrack[] => {
  const tracks = new Map<string, MusicTrack>();

  files.forEach((file) => {
    const audio = toMusicUrl(file);
    if (!audio) return;
    tracks.set(audio, { audio });
  });

  return Array.from(tracks.values());
};

export const getMusicTracks = async (): Promise<MusicTrack[]> => {
  const configuredFiles = (await getCollection('music')).flatMap((entry) => entry.data.files);

  const discoveredFiles = discoveredMusicFiles
    .map((filePath) => toPublicMusicUrl(filePath))
    .filter((file): file is string => Boolean(file))
    .sort((a, b) => a.localeCompare(b, 'zh-CN'));

  return uniqueTracks([...configuredFiles, ...discoveredFiles]);
};
