import type { Mermaid } from 'mermaid';

type MermaidApi = Pick<Mermaid, 'initialize' | 'render'>;
export type MermaidTheme = 'light' | 'dark';

interface MermaidRendererOptions {
  document: Document;
  loadMermaid: () => Promise<MermaidApi>;
  configure: (mermaid: MermaidApi, theme: MermaidTheme) => void;
  normalizeChart: (chart: string) => string;
  onRendered: (element: HTMLElement, svg: SVGSVGElement, chart: string) => void;
  onError?: (error: unknown) => void;
}

/** Serialize Mermaid's global configuration and coalesce work without losing a newer page/theme. */
export function createMermaidRenderer(options: MermaidRendererOptions) {
  const doc = options.document;
  let generation = 0;
  let pending = false;
  let running: Promise<void> | undefined;
  let renderId = 0;

  const showError = (element: HTMLElement, error: unknown) => {
    const message = doc.createElement('div');
    message.className = 'mermaid-error';
    message.textContent = `渲染失败: ${error instanceof Error ? error.message : '未知错误'}`;
    element.replaceChildren(message);
  };

  const drain = async () => {
    while (pending) {
      pending = false;
      const currentGeneration = generation;
      const body = doc.body;
      const isCurrent = () =>
        generation === currentGeneration && doc.body === body && body.isConnected;
      const isCurrentElement = (element: HTMLElement) =>
        isCurrent() && element.isConnected && body.contains(element);

      try {
        await doc.fonts.ready;
        if (!isCurrent()) continue;
        const mermaid = await options.loadMermaid();
        if (!isCurrent()) continue;
        const theme: MermaidTheme = doc.documentElement.classList.contains('dark')
          ? 'dark'
          : 'light';
        options.configure(mermaid, theme);

        for (const element of doc.querySelectorAll<HTMLElement>('.mermaid')) {
          if (!isCurrent()) break;
          if (!isCurrentElement(element)) continue;
          if (element.dataset.processed && element.dataset.renderTheme === theme) continue;
          const source = element.getAttribute('data-chart') || '';
          if (!source.trim()) continue;

          try {
            const chart = options.normalizeChart(source);
            // A fresh ID prevents Mermaid from removing the visible SVG while replacing it.
            const id = `${element.id || 'mermaid'}-svg-${++renderId}`;
            const { svg } = await mermaid.render(id, chart);
            if (!isCurrentElement(element)) continue;
            element.innerHTML = svg;
            element.dataset.processed = 'true';
            element.dataset.renderTheme = theme;
            const svgElement = element.querySelector('svg');
            if (svgElement) options.onRendered(element, svgElement, chart);
          } catch (error) {
            if (!isCurrentElement(element)) continue;
            options.onError?.(error);
            showError(element, error);
            element.dataset.processed = 'true';
            element.dataset.renderTheme = theme;
          }
        }
      } catch (error) {
        if (!isCurrent()) continue;
        options.onError?.(error);
        // Keep toolbar/source access usable if loading the renderer itself fails.
        for (const element of doc.querySelectorAll<HTMLElement>('.mermaid')) {
          if (isCurrentElement(element) && !element.dataset.processed) showError(element, error);
        }
      }
    }
  };

  const start = (): Promise<void> => {
    running ??= drain().finally(() => {
      running = undefined;
      // A request can arrive after drain resolves but before this microtask runs.
      if (pending) return start();
    });
    return running;
  };

  return {
    request() {
      generation += 1;
      pending = true;
      return start();
    },
    invalidate() {
      generation += 1;
      pending = false;
    },
  };
}
