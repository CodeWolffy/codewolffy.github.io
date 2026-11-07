import { useEffect, useMemo, useSyncExternalStore } from 'react';
import { loadMp3Metadata, type Mp3Metadata } from '@/lib/mp3-metadata';

const METADATA_DEBOUNCE_MS = 200;
const MAX_CACHED_TRACKS = 30;

type MetadataSnapshot = {
  metadataByAudio: Record<string, Mp3Metadata>;
  loadingAudio?: string;
};

const EMPTY_SNAPSHOT: MetadataSnapshot = { metadataByAudio: {} };
const getServerSnapshot = () => EMPTY_SNAPSHOT;

const releaseCover = (metadata: Mp3Metadata) => {
  if (metadata.coverUrl?.startsWith('blob:')) URL.revokeObjectURL(metadata.coverUrl);
};

// Keep request ownership and cache eviction independent of React renders.
export function createTrackMetadataController(load = loadMp3Metadata) {
  const cache = new Map<string, Mp3Metadata>();
  const listeners = new Set<() => void>();
  let snapshot = EMPTY_SNAPSHOT;
  let activeAudio: string | undefined;
  let enabled = false;
  let timer: ReturnType<typeof setTimeout> | undefined;
  let request: { audio: string; controller: AbortController } | undefined;

  const publish = (loadingAudio?: string, cacheChanged = false) => {
    if (!cacheChanged && snapshot.loadingAudio === loadingAudio) return;
    snapshot = {
      metadataByAudio: cacheChanged ? Object.fromEntries(cache) : snapshot.metadataByAudio,
      loadingAudio,
    };
    listeners.forEach((listener) => listener());
  };

  const cancel = () => {
    clearTimeout(timer);
    timer = undefined;
    const previousRequest = request;
    request = undefined;
    previousRequest?.controller.abort();
    publish();
  };

  const retry = () => {
    if (!enabled || !activeAudio || cache.has(activeAudio) || timer !== undefined || request) {
      return;
    }

    const audio = activeAudio;
    timer = setTimeout(() => {
      timer = undefined;
      const currentRequest = { audio, controller: new AbortController() };
      request = currentRequest;
      publish(audio);

      void (async () => {
        let cacheChanged = false;
        try {
          const metadata = await load(audio, currentRequest.controller.signal);
          if (request !== currentRequest || currentRequest.controller.signal.aborted) {
            releaseCover(metadata);
            return;
          }

          cache.set(audio, metadata);
          if (cache.size > MAX_CACHED_TRACKS) {
            const oldest = cache.entries().next().value;
            if (oldest) {
              cache.delete(oldest[0]);
              releaseCover(oldest[1]);
            }
          }
          cacheChanged = true;
        } catch {
          // Failed requests stay uncached. Retry only after an explicit trigger.
        } finally {
          if (request === currentRequest) {
            request = undefined;
            publish(undefined, cacheChanged);
          }
        }
      })();
    }, METADATA_DEBOUNCE_MS);
  };

  return {
    getSnapshot: () => snapshot,
    subscribe: (listener: () => void) => {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
    setActive: (audio: string | undefined, nextEnabled: boolean) => {
      if (activeAudio === audio && enabled === nextEnabled) return;
      cancel();
      activeAudio = audio;
      enabled = nextEnabled;

      const cached = audio ? cache.get(audio) : undefined;
      if (audio && cached) {
        cache.delete(audio);
        cache.set(audio, cached);
      }
      retry();
    },
    retry,
    dispose: () => {
      cancel();
      cache.forEach(releaseCover);
      cache.clear();
      activeAudio = undefined;
      enabled = false;
      publish(undefined, true);
    },
  };
}

export function useTrackMetadata(audio: string | undefined, enabled: boolean) {
  const controller = useMemo(() => createTrackMetadataController(), []);
  const snapshot = useSyncExternalStore(
    controller.subscribe,
    controller.getSnapshot,
    getServerSnapshot
  );

  useEffect(() => {
    controller.setActive(audio, enabled);
  }, [audio, enabled, controller]);

  useEffect(() => {
    window.addEventListener('online', controller.retry);
    return () => {
      window.removeEventListener('online', controller.retry);
      controller.dispose();
    };
  }, [controller]);

  return {
    metadataByAudio: snapshot.metadataByAudio,
    metadataLoading: enabled && Boolean(audio) && snapshot.loadingAudio === audio,
    retryMetadata: controller.retry,
  };
}
