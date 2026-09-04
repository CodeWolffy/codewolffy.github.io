import { useEffect, useId, useRef, useState, useSyncExternalStore, type ReactNode } from 'react';
import { normalizeIframeUrl } from '../../utils/iframe-url';

const tokens = {
  accent: 'var(--ks-preview-accent, #2563eb)',
  accentBorder: 'var(--ks-preview-accent-border, #bfdbfe)',
  accentSurface: 'var(--ks-preview-accent-surface, #eff6ff)',
  border: 'var(--ks-preview-border, #e2e8f0)',
  codeBackground: 'var(--ks-preview-code-background, #f8fafc)',
  muted: 'var(--ks-preview-muted, #64748b)',
  mutedSurface: 'var(--ks-preview-muted-surface, #f8fafc)',
  surface: 'var(--ks-preview-surface, #ffffff)',
  text: 'var(--ks-preview-text, #0f172a)',
} as const;

const previewStyles = `
  .ks-mdx-preview {
    --ks-preview-accent: #2563eb;
    --ks-preview-accent-border: #bfdbfe;
    --ks-preview-accent-surface: #eff6ff;
    --ks-preview-border: #e2e8f0;
    --ks-preview-code-background: #f8fafc;
    --ks-preview-muted: #64748b;
    --ks-preview-muted-surface: #f8fafc;
    --ks-preview-surface: #ffffff;
    --ks-preview-text: #0f172a;
    color-scheme: light dark;
  }

  .ks-callout-info {
    --ks-callout-background: #eff6ff;
    --ks-callout-border: #bfdbfe;
    --ks-callout-text: #1e3a8a;
  }

  .ks-callout-tip {
    --ks-callout-background: #ecfdf5;
    --ks-callout-border: #a7f3d0;
    --ks-callout-text: #064e3b;
  }

  .ks-callout-warning {
    --ks-callout-background: #fffbeb;
    --ks-callout-border: #fde68a;
    --ks-callout-text: #78350f;
  }

  .ks-callout-danger {
    --ks-callout-background: #fef2f2;
    --ks-callout-border: #fecaca;
    --ks-callout-text: #7f1d1d;
  }

  @media (prefers-color-scheme: dark) {
    .ks-mdx-preview {
      --ks-preview-accent: #60a5fa;
      --ks-preview-accent-border: #1e3a8a;
      --ks-preview-accent-surface: rgba(23, 37, 84, 0.72);
      --ks-preview-border: #334155;
      --ks-preview-code-background: #020617;
      --ks-preview-muted: #94a3b8;
      --ks-preview-muted-surface: #111827;
      --ks-preview-surface: #0f172a;
      --ks-preview-text: #e2e8f0;
    }

    .ks-callout-info {
      --ks-callout-background: rgba(23, 37, 84, 0.72);
      --ks-callout-border: #1e3a8a;
      --ks-callout-text: #bfdbfe;
    }

    .ks-callout-tip {
      --ks-callout-background: rgba(2, 44, 34, 0.72);
      --ks-callout-border: #064e3b;
      --ks-callout-text: #a7f3d0;
    }

    .ks-callout-warning {
      --ks-callout-background: rgba(69, 26, 3, 0.72);
      --ks-callout-border: #78350f;
      --ks-callout-text: #fde68a;
    }

    .ks-callout-danger {
      --ks-callout-background: rgba(69, 10, 10, 0.72);
      --ks-callout-border: #7f1d1d;
      --ks-callout-text: #fecaca;
    }
  }

  div[role='listbox'],
  div[data-reach-menu-popover],
  [id^='headlessui-portal-root'] {
    z-index: 99999 !important;
  }
`;

function PreviewStyles() {
  return <style>{previewStyles}</style>;
}

export const mdxEditorStyles = `
  div[data-keystatic-scroll-area] {
    --ks-preview-border: #e2e8f0;
    --ks-preview-code-background: #ecf4fa;
    --ks-preview-muted: #64748b;
    --ks-preview-muted-surface: #f8fafc;
    --ks-preview-text: #0f172a;
  }

  div[data-keystatic-scroll-area] div[contenteditable='true'] {
    box-sizing: border-box;
    color: var(--ks-preview-text);
    line-height: 1.7;
    margin-inline: auto;
    max-width: 880px;
    overflow-wrap: anywhere;
    padding-inline: clamp(12px, 2vw, 24px);
    width: 100%;
  }

  div[data-keystatic-scroll-area] div[contenteditable='true'] p {
    line-height: 1.7;
    margin-block: 0.4em;
  }

  div[data-keystatic-scroll-area] div[contenteditable='true'] h1,
  div[data-keystatic-scroll-area] div[contenteditable='true'] h2,
  div[data-keystatic-scroll-area] div[contenteditable='true'] h3,
  div[data-keystatic-scroll-area] div[contenteditable='true'] h4,
  div[data-keystatic-scroll-area] div[contenteditable='true'] h5,
  div[data-keystatic-scroll-area] div[contenteditable='true'] h6 {
    color: var(--ks-preview-text);
    font-weight: 650;
    line-height: 1.3;
    margin-block: 1.25em 0.5em;
  }

  div[data-keystatic-scroll-area] div[contenteditable='true'] h1 { font-size: 2em; }
  div[data-keystatic-scroll-area] div[contenteditable='true'] h2 { font-size: 1.5em; }
  div[data-keystatic-scroll-area] div[contenteditable='true'] h3 { font-size: 1.25em; }

  div[data-keystatic-scroll-area] div[contenteditable='true'] a {
    color: #2563eb;
    text-decoration: underline;
    text-underline-offset: 3px;
  }

  div[data-keystatic-scroll-area] div[contenteditable='true'] :not(pre) > code {
    background: var(--ks-preview-muted-surface);
    border: 1px solid var(--ks-preview-border);
    border-radius: 4px;
    font-size: 0.875em;
    padding: 0.15em 0.35em;
  }

  div[data-keystatic-scroll-area] div[contenteditable='true'] pre {
    background: var(--ks-preview-code-background) !important;
    border: 1px solid var(--ks-preview-border);
    border-radius: 12px;
    box-sizing: border-box;
    color: var(--ks-preview-text);
    margin-block: 0.75em;
    max-width: 100%;
    overflow-x: auto;
    padding: 16px;
  }

  div[data-keystatic-scroll-area] div[contenteditable='true'] pre code {
    background: transparent;
    border: 0;
    padding: 0;
  }

  div[data-keystatic-scroll-area] div[contenteditable='true'] img {
    border: 1px solid var(--ks-preview-border);
    border-radius: 8px;
    display: block;
    height: auto;
    margin: 1.5rem auto;
    max-height: 650px;
    max-width: 100%;
    object-fit: contain;
  }

  div[data-keystatic-scroll-area] div[contenteditable='true'] table {
    border-collapse: collapse;
    display: block;
    margin-block: 0.75em;
    max-width: 100%;
    overflow-x: auto;
    width: 100%;
  }

  div[data-keystatic-scroll-area] div[contenteditable='true'] td,
  div[data-keystatic-scroll-area] div[contenteditable='true'] th {
    border: 1px solid var(--ks-preview-border);
    min-width: 80px;
    padding: 8px 12px;
    text-align: left;
  }

  div[data-keystatic-scroll-area] div[contenteditable='true'] th {
    background: var(--ks-preview-muted-surface);
    font-weight: 600;
  }

  div[data-keystatic-scroll-area] div[contenteditable='true'] blockquote {
    border-left: 3px solid var(--ks-preview-border);
    color: var(--ks-preview-muted);
    margin-block: 0.75em;
    padding: 0.5rem 1rem;
  }

  div[data-keystatic-scroll-area] div[contenteditable='true'] hr {
    border: 0;
    border-top: 1px solid var(--ks-preview-border);
    margin-block: 1.5em;
  }

  @media (prefers-color-scheme: dark) {
    div[data-keystatic-scroll-area] {
      --ks-preview-border: #334155;
      --ks-preview-code-background: #020617;
      --ks-preview-muted: #94a3b8;
      --ks-preview-muted-surface: #111827;
      --ks-preview-text: #e2e8f0;
    }

    div[data-keystatic-scroll-area] div[contenteditable='true'] a {
      color: #60a5fa;
    }
  }
`;

type CodeGroupPreviewItem = {
  readonly label: string;
  readonly language: string;
  readonly code: string;
};

export function CodeGroupContentView(props: {
  value: { readonly items: readonly CodeGroupPreviewItem[] };
}) {
  const [selectedIndex, setSelectedIndex] = useState(0);
  const id = useId();
  const items = props.value.items;

  if (!items.length) {
    return (
      <div
        className="ks-mdx-preview"
        style={{
          border: `1px dashed ${tokens.border}`,
          borderRadius: 8,
          color: tokens.muted,
          margin: '16px 0',
          padding: 24,
          textAlign: 'center',
        }}
      >
        <PreviewStyles />
        请添加至少一个代码块
      </div>
    );
  }

  const activeIndex = Math.min(selectedIndex, items.length - 1);
  const activeItem = items[activeIndex];

  const selectTab = (index: number) => {
    setSelectedIndex(index);
    document.getElementById(`${id}-tab-${index}`)?.focus();
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLButtonElement>, index: number) => {
    let nextIndex: number | undefined;

    if (event.key === 'ArrowRight') nextIndex = (index + 1) % items.length;
    if (event.key === 'ArrowLeft') nextIndex = (index - 1 + items.length) % items.length;
    if (event.key === 'Home') nextIndex = 0;
    if (event.key === 'End') nextIndex = items.length - 1;

    if (nextIndex !== undefined) {
      event.preventDefault();
      selectTab(nextIndex);
    }
  };

  return (
    <div
      className="ks-mdx-preview"
      style={{
        background: tokens.surface,
        border: `1px solid ${tokens.border}`,
        borderRadius: 8,
        color: tokens.text,
        margin: '16px 0',
        overflow: 'hidden',
      }}
    >
      <PreviewStyles />
      <div
        role="tablist"
        aria-label="代码示例"
        style={{
          background: tokens.mutedSurface,
          borderBottom: `1px solid ${tokens.border}`,
          display: 'flex',
          overflowX: 'auto',
        }}
      >
        {items.map((item, index) => (
          <button
            key={`${item.label}-${index}`}
            id={`${id}-tab-${index}`}
            type="button"
            role="tab"
            aria-controls={`${id}-panel`}
            aria-selected={index === activeIndex}
            tabIndex={index === activeIndex ? 0 : -1}
            onClick={() => setSelectedIndex(index)}
            onKeyDown={(event) => handleKeyDown(event, index)}
            style={{
              background: index === activeIndex ? tokens.surface : 'transparent',
              border: 0,
              borderBottom:
                index === activeIndex ? `2px solid ${tokens.accent}` : '2px solid transparent',
              color: index === activeIndex ? tokens.text : tokens.muted,
              cursor: 'pointer',
              fontSize: 13,
              fontWeight: 500,
              padding: '8px 16px',
              whiteSpace: 'nowrap',
            }}
          >
            {item.label || `代码块 ${index + 1}`}
          </button>
        ))}
      </div>
      <div
        id={`${id}-panel`}
        role="tabpanel"
        aria-labelledby={`${id}-tab-${activeIndex}`}
        tabIndex={0}
        style={{ background: tokens.codeBackground, overflowX: 'auto', padding: 16 }}
      >
        <div style={{ color: tokens.muted, fontSize: 11, marginBottom: 8 }}>
          语言：{activeItem.language || 'text'}
        </div>
        <pre
          style={{
            background: 'transparent',
            color: tokens.text,
            fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
            fontSize: 13,
            margin: 0,
            whiteSpace: 'pre',
          }}
        >
          <code>{activeItem.code}</code>
        </pre>
      </div>
    </div>
  );
}

type CalloutType = 'info' | 'tip' | 'warning' | 'danger';

const calloutVariants: Record<CalloutType, { defaultTitle: string; icon: string }> = {
  info: { defaultTitle: '信息', icon: 'ℹ️' },
  tip: { defaultTitle: '提示', icon: '💡' },
  warning: { defaultTitle: '警告', icon: '⚠️' },
  danger: { defaultTitle: '危险', icon: '🔥' },
};

export function CalloutContentView(props: {
  value: { type?: CalloutType; title?: string };
  children?: ReactNode;
}) {
  const type = props.value.type || 'info';
  const variant = calloutVariants[type];

  return (
    <div
      className={`ks-mdx-preview ks-callout-${type}`}
      style={{
        background: 'var(--ks-callout-background)',
        border: '1px solid var(--ks-callout-border)',
        borderRadius: 8,
        color: 'var(--ks-callout-text)',
        margin: '16px 0',
        padding: 16,
      }}
    >
      <PreviewStyles />
      <div style={{ display: 'flex', gap: 8, fontWeight: 600, marginBottom: 4 }}>
        <span aria-hidden="true">{variant.icon}</span>
        <span>{props.value.title || variant.defaultTitle}</span>
      </div>
      <div style={{ lineHeight: 1.625 }}>{props.children}</div>
    </div>
  );
}

export function DetailsContentView(props: {
  value: { title: string; open: boolean };
  children?: ReactNode;
}) {
  return (
    <details
      className="ks-mdx-preview"
      open={props.value.open}
      style={{
        background: tokens.surface,
        border: `1px solid ${tokens.border}`,
        borderRadius: 8,
        color: tokens.text,
        margin: '16px 0',
        overflow: 'hidden',
      }}
    >
      <summary
        style={{
          background: tokens.mutedSurface,
          cursor: 'pointer',
          fontWeight: 500,
          padding: '12px 16px',
        }}
      >
        {props.value.title}
      </summary>
      <PreviewStyles />
      <div
        style={{
          borderTop: `1px solid ${tokens.border}`,
          color: tokens.text,
          lineHeight: 1.625,
          padding: 16,
        }}
      >
        {props.children}
      </div>
    </details>
  );
}

export function IframeContentView(props: { value: { src?: string; title?: string } }) {
  const rawSrc = props.value.src?.trim() || '';
  const extractedSrc = rawSrc.startsWith('<iframe')
    ? rawSrc.match(/src=["']([^"']+)["']/i)?.[1]?.trim() || ''
    : rawSrc;
  const previewSrc = normalizeIframeUrl(rawSrc);
  const containsIframeMarkup = rawSrc.startsWith('<iframe');
  const isInvalid = Boolean(rawSrc && !previewSrc);

  return (
    <div
      className="ks-mdx-preview"
      style={{
        background: tokens.surface,
        border: `1px solid ${tokens.border}`,
        borderRadius: 8,
        color: tokens.text,
        margin: '16px 0',
        overflow: 'hidden',
      }}
    >
      <PreviewStyles />
      <div
        style={{
          alignItems: 'center',
          background: tokens.mutedSurface,
          borderBottom: `1px solid ${tokens.border}`,
          color: tokens.muted,
          display: 'flex',
          fontSize: 12,
          justifyContent: 'space-between',
          padding: '8px 12px',
        }}
      >
        <span>🎥 视频嵌入预览</span>
        {containsIframeMarkup && <span>⚠️ 请仅保留 src 链接</span>}
      </div>

      {previewSrc ? (
        <div style={{ aspectRatio: '16 / 9', background: '#000', position: 'relative' }}>
          <iframe
            src={previewSrc}
            title={props.value.title || '嵌入视频'}
            allow="accelerometer; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share; fullscreen"
            allowFullScreen
            loading="lazy"
            sandbox="allow-same-origin allow-scripts allow-popups allow-presentation"
            referrerPolicy="strict-origin-when-cross-origin"
            style={{
              border: 0,
              height: '100%',
              inset: 0,
              pointerEvents: 'none',
              position: 'absolute',
              width: '100%',
            }}
          />
        </div>
      ) : (
        <div
          className={isInvalid ? 'ks-callout-danger' : undefined}
          role={isInvalid ? 'alert' : undefined}
          style={{
            background: isInvalid ? 'var(--ks-callout-background)' : tokens.surface,
            color: isInvalid ? 'var(--ks-callout-text)' : tokens.muted,
            padding: 28,
            textAlign: 'center',
          }}
        >
          <div aria-hidden="true" style={{ fontSize: 24, marginBottom: 8 }}>
            📺
          </div>
          {isInvalid ? '地址无效或来源不在安全白名单中' : '请在右侧输入视频地址'}
        </div>
      )}

      {containsIframeMarkup && extractedSrc && (
        <div
          className="ks-callout-warning"
          style={{
            background: 'var(--ks-callout-background)',
            borderTop: '1px solid var(--ks-callout-border)',
            color: 'var(--ks-callout-text)',
            fontSize: 12,
            padding: 12,
          }}
        >
          建议修改为：<code style={{ overflowWrap: 'anywhere' }}>{extractedSrc}</code>
        </div>
      )}

      {props.value.title && (
        <div
          style={{
            borderTop: `1px solid ${tokens.border}`,
            color: tokens.muted,
            fontSize: 13,
            padding: '8px 12px',
            textAlign: 'center',
          }}
        >
          {props.value.title}
        </div>
      )}
    </div>
  );
}

export function LinkCardContentView(props: {
  value: { title?: string; url?: string; description?: string };
}) {
  return (
    <div
      className="ks-mdx-preview"
      style={{
        background: tokens.surface,
        border: `1px solid ${tokens.border}`,
        borderRadius: 8,
        color: tokens.text,
        display: 'flex',
        gap: 12,
        margin: '16px 0',
        padding: 16,
      }}
    >
      <PreviewStyles />
      <svg
        aria-hidden="true"
        width="20"
        height="20"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        style={{ color: tokens.muted, flexShrink: 0, marginTop: 4 }}
      >
        <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
        <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
      </svg>
      <div style={{ minWidth: 0 }}>
        <div style={{ fontWeight: 500 }}>{props.value.title || '链接标题'}</div>
        {props.value.description && (
          <div style={{ color: tokens.muted, fontSize: 14, lineHeight: 1.6, marginTop: 4 }}>
            {props.value.description}
          </div>
        )}
        <div
          style={{
            color: tokens.muted,
            fontSize: 12,
            marginTop: 8,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}
        >
          {props.value.url || 'https://example.com'}
        </div>
      </div>
    </div>
  );
}

export function StepsContentView(props: {
  value: { items: readonly { title?: string; content?: string }[] };
}) {
  if (!props.value.items.length) {
    return (
      <div
        className="ks-mdx-preview"
        style={{
          border: `1px dashed ${tokens.border}`,
          borderRadius: 8,
          color: tokens.muted,
          margin: '16px 0',
          padding: 24,
          textAlign: 'center',
        }}
      >
        <PreviewStyles />
        请添加至少一个步骤
      </div>
    );
  }

  return (
    <div className="ks-mdx-preview" style={{ color: tokens.text, margin: '24px 0' }}>
      <PreviewStyles />
      {props.value.items.map((item, index) => (
        <div key={index} style={{ display: 'flex', gap: 16 }}>
          <div style={{ alignItems: 'center', display: 'flex', flexDirection: 'column' }}>
            <div
              style={{
                alignItems: 'center',
                background: tokens.accentSurface,
                border: `1px solid ${tokens.accentBorder}`,
                borderRadius: '50%',
                color: tokens.accent,
                display: 'flex',
                flexShrink: 0,
                fontSize: 14,
                fontWeight: 500,
                height: 32,
                justifyContent: 'center',
                width: 32,
              }}
            >
              {index + 1}
            </div>
            {index < props.value.items.length - 1 && (
              <div
                aria-hidden="true"
                style={{
                  background: tokens.border,
                  flex: 1,
                  marginBlock: 8,
                  minHeight: 20,
                  width: 1,
                }}
              />
            )}
          </div>
          <div
            style={{
              flex: 1,
              minWidth: 0,
              paddingBottom: index < props.value.items.length - 1 ? 24 : 0,
            }}
          >
            <div style={{ fontWeight: 500, marginBottom: 4 }}>
              {item.title || `步骤 ${index + 1}`}
            </div>
            {item.content && (
              <div
                style={{
                  color: tokens.muted,
                  fontSize: 14,
                  lineHeight: 1.6,
                  whiteSpace: 'pre-line',
                }}
              >
                {item.content}
              </div>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}

function subscribeDarkMode(callback: () => void) {
  if (typeof window === 'undefined') return () => {};
  const media = window.matchMedia('(prefers-color-scheme: dark)');
  media.addEventListener('change', callback);
  return () => media.removeEventListener('change', callback);
}

function getDarkModeSnapshot() {
  return typeof window !== 'undefined' && window.matchMedia('(prefers-color-scheme: dark)').matches;
}

function getServerDarkModeSnapshot() {
  return false;
}

function usePreferredDarkMode() {
  return useSyncExternalStore(subscribeDarkMode, getDarkModeSnapshot, getServerDarkModeSnapshot);
}

function sanitizeSvg(svg: string) {
  const documentNode = new DOMParser().parseFromString(svg, 'image/svg+xml');

  if (documentNode.querySelector('parsererror')) {
    throw new Error('Mermaid 返回了无效的 SVG');
  }

  documentNode
    .querySelectorAll('script, foreignObject, iframe, object, embed')
    .forEach((node) => node.remove());
  documentNode.querySelectorAll('*').forEach((node) => {
    for (const attribute of [...node.attributes]) {
      const name = attribute.name.toLowerCase();
      const value = attribute.value.trim().toLowerCase();

      if (name.startsWith('on')) node.removeAttribute(attribute.name);
      if ((name === 'href' || name === 'xlink:href') && value && !value.startsWith('#')) {
        node.removeAttribute(attribute.name);
      }
    }
  });

  return new XMLSerializer().serializeToString(documentNode.documentElement);
}

function getChartType(code: string) {
  const normalized = code.trim();
  if (normalized.startsWith('flowchart') || normalized.startsWith('graph')) return '流程图';
  if (normalized.startsWith('sequenceDiagram')) return '时序图';
  if (normalized.startsWith('pie')) return '饼图';
  if (normalized.startsWith('gantt')) return '甘特图';
  if (normalized.startsWith('classDiagram')) return '类图';
  if (normalized.startsWith('erDiagram')) return 'ER 图';
  if (normalized.startsWith('stateDiagram')) return '状态图';
  return '图表';
}

export function MermaidContentView(props: { value: { code?: { value?: string } } }) {
  const chart = props.value.code?.value?.trim() || '';
  const reactId = useId();
  const isDark = usePreferredDarkMode();
  const [svg, setSvg] = useState('');
  const [error, setError] = useState('');
  const [isRendering, setIsRendering] = useState(() => Boolean(chart));
  const renderSequence = useRef(0);
  const renderId = `ks-mermaid-${reactId.replace(/[^a-zA-Z0-9_-]/g, '')}`;
  const [prevChart, setPrevChart] = useState(chart);
  if (prevChart !== chart) {
    setPrevChart(chart);
    setSvg('');
    setError('');
    setIsRendering(Boolean(chart));
  }

  useEffect(() => {
    let cancelled = false;

    if (!chart) return;

    const currentRenderId = `${renderId}-${++renderSequence.current}`;
    const timer = window.setTimeout(async () => {
      try {
        const { default: mermaid } = await import('mermaid');
        mermaid.initialize({
          flowchart: { htmlLabels: false, useMaxWidth: true },
          securityLevel: 'strict',
          startOnLoad: false,
          suppressErrorRendering: true,
          theme: isDark ? 'dark' : 'default',
        });
        const result = await mermaid.render(currentRenderId, chart);

        if (!cancelled) setSvg(sanitizeSvg(result.svg));
      } catch (caughtError) {
        if (!cancelled) {
          const message = caughtError instanceof Error ? caughtError.message : String(caughtError);
          setError(message || 'Mermaid 图表渲染失败');
        }
      } finally {
        if (!cancelled) setIsRendering(false);
        document.getElementById(`d${currentRenderId}`)?.remove();
      }
    }, 250);

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
      document.getElementById(`d${currentRenderId}`)?.remove();
    };
  }, [chart, isDark, renderId]);

  return (
    <div
      className="ks-mdx-preview"
      style={{
        background: tokens.surface,
        border: `1px solid ${tokens.border}`,
        borderRadius: 8,
        color: tokens.text,
        overflow: 'hidden',
      }}
    >
      <PreviewStyles />
      <div
        style={{
          alignItems: 'center',
          background: tokens.mutedSurface,
          borderBottom: `1px solid ${tokens.border}`,
          color: tokens.muted,
          display: 'flex',
          fontSize: 12,
          justifyContent: 'space-between',
          padding: '8px 12px',
        }}
      >
        <span>📊 Mermaid {chart ? getChartType(chart) : '图表'}</span>
        {isRendering ? <span>渲染中…</span> : chart && !error ? <span>✓ 实时预览</span> : null}
      </div>

      {!chart ? (
        <div style={{ color: tokens.muted, padding: 24, textAlign: 'center' }}>
          <div aria-hidden="true" style={{ fontSize: 24, marginBottom: 8 }}>
            📊
          </div>
          <div>请在上方“图表代码”中输入 Mermaid 代码</div>
          <div style={{ fontSize: 11, marginTop: 12 }}>示例：flowchart TD; A--&gt;B;</div>
        </div>
      ) : error ? (
        <div
          className="ks-callout-danger"
          role="alert"
          style={{
            background: 'var(--ks-callout-background, #fef2f2)',
            color: 'var(--ks-callout-text, #991b1b)',
            padding: 16,
          }}
        >
          <div style={{ fontWeight: 600, marginBottom: 8 }}>Mermaid 语法或渲染错误</div>
          <pre
            style={{
              fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
              fontSize: 12,
              margin: 0,
              overflowX: 'auto',
              whiteSpace: 'pre-wrap',
            }}
          >
            {error}
          </pre>
        </div>
      ) : svg ? (
        <div
          aria-label={`Mermaid ${getChartType(chart)}预览`}
          style={{ overflowX: 'auto', padding: 16, textAlign: 'center' }}
          dangerouslySetInnerHTML={{ __html: svg }}
        />
      ) : (
        <div style={{ color: tokens.muted, padding: 24, textAlign: 'center' }}>正在渲染图表…</div>
      )}
    </div>
  );
}
