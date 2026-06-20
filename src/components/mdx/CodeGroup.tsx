import { useState } from 'react';

interface CodeGroupItem {
  label: string;
  language?: string;
  code: string;
}

interface CodeGroupProps {
  items: CodeGroupItem[];
}

export function CodeGroup({ items = [] }: CodeGroupProps) {
  const [activeIndex, setActiveIndex] = useState(0);

  if (!items.length) return null;

  const activeItem = items[activeIndex] ?? items[0];

  return (
    <div className="my-6 rounded-lg border border-border overflow-hidden bg-card">
      <div className="flex border-b border-border bg-muted/50 overflow-x-auto">
        {items.map((item, index) => (
          <button
            key={index}
            type="button"
            onClick={() => setActiveIndex(index)}
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
      <div className="p-4 overflow-x-auto">
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
