const GISCUS_ORIGIN = 'https://giscus.app';
const LOAD_TIMEOUT_MS = 15000;

type CommentLoadResult = 'ready' | 'error';

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

/** Observe one mount of @giscus/react, whose iframe lives in an open shadow root. */
export function observeCommentLoading(
  container: HTMLElement,
  onResult: (result: CommentLoadResult) => void
): () => void {
  let active = true;

  const cancel = () => {
    active = false;
    window.clearTimeout(timeout);
    window.removeEventListener('message', handleMessage);
  };

  const finish = (result: CommentLoadResult) => {
    if (!active) return;
    cancel();
    if (container.isConnected) onResult(result);
  };

  const handleMessage = (event: MessageEvent<unknown>) => {
    if (!active || !container.isConnected || event.origin !== GISCUS_ORIGIN) return;

    const iframe = container.querySelector('giscus-widget')?.shadowRoot?.querySelector('iframe');
    if (!iframe?.contentWindow || event.source !== iframe.contentWindow) return;
    if (!isRecord(event.data) || !isRecord(event.data.giscus)) return;

    const message = event.data.giscus;
    // The component clears expired login sessions itself and reloads anonymously.
    if (message.signOut === true) return;
    if (typeof message.error === 'string' && message.error) {
      if (/Bad credentials|Invalid state value|State has expired/.test(message.error)) return;
      // An article without a discussion still has a usable editor for its first comment.
      finish(message.error.includes('Discussion not found') ? 'ready' : 'error');
      return;
    }

    // A load event can also mean a browser error page; resize messages include the
    // widget's loading screen. Metadata is emitted only after discussion data loads.
    if (
      isRecord(message.discussion) &&
      typeof message.discussion.id === 'string' &&
      message.discussion.id.length > 0
    ) {
      finish('ready');
    }
  };

  const timeout = window.setTimeout(() => finish('error'), LOAD_TIMEOUT_MS);
  window.addEventListener('message', handleMessage);
  return cancel;
}
