import { useId, useState } from 'react';

export interface CodeGroupItem {
  label: string;
  language?: string;
  code: string;
}

export interface CodeGroupProps {
  items: CodeGroupItem[];
}

export function CodeGroup({ items = [] }: CodeGroupProps) {
  const [activeIndex, setActiveIndex] = useState(0);
  const id = useId();

  if (!items.length) return null;

  const activeItem = items[activeIndex] ?? items[0];

  const selectTab = (index: number) => {
    setActiveIndex(index);
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
    <div className="my-6 rounded-lg border border-border overflow-hidden bg-card">
      <div
        className="flex border-b border-border bg-muted/50 overflow-x-auto"
        role="tablist"
        aria-label="Code examples"
      >
        {items.map((item, index) => (
          <button
            key={`${item.label}-${index}`}
            id={`${id}-tab-${index}`}
            type="button"
            onClick={() => setActiveIndex(index)}
            onKeyDown={(event) => handleKeyDown(event, index)}
            role="tab"
            aria-selected={index === activeIndex}
            aria-controls={`${id}-panel`}
            tabIndex={index === activeIndex ? 0 : -1}
            className={`px-4 py-2 text-sm font-medium transition-colors whitespace-nowrap ${
              index === activeIndex
                ? 'bg-background text-foreground border-b-2 border-primary'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            {item.label}
          </button>
        ))}
      </div>
      <div
        id={`${id}-panel`}
        className="p-4 overflow-x-auto"
        role="tabpanel"
        aria-labelledby={`${id}-tab-${activeIndex}`}
        tabIndex={0}
      >
        <pre className="m-0 p-0 bg-transparent">
          <code
            className={`language-${activeItem.language || 'text'} text-sm font-mono block`}
            style={{ whiteSpace: 'pre' }}
          >
            {activeItem.code}
          </code>
        </pre>
      </div>
    </div>
  );
}
