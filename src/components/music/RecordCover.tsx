import { Music2 } from 'lucide-react';
import { cn } from '@/lib/utils';

type RecordCoverProps = {
  coverUrl?: string;
  title: string;
  isPlaying: boolean;
  className?: string;
  iconClassName?: string;
  centerClassName?: string;
};

export function RecordCover({
  coverUrl,
  title,
  isPlaying,
  className,
  iconClassName,
  centerClassName,
}: RecordCoverProps) {
  return (
    <div
      data-playing={isPlaying ? 'true' : undefined}
      className={cn(
        'music-record music-record--spinning relative flex items-center justify-center overflow-hidden rounded-full bg-muted',
        coverUrl ? 'music-record--has-cover' : 'music-record--fallback',
        className
      )}
    >
      {coverUrl ? (
        <>
          <img
            src={coverUrl}
            alt={title}
            className="h-full w-full rounded-full object-cover"
            loading="lazy"
            decoding="async"
          />
          <span className="pointer-events-none absolute inset-1 rounded-full border border-white/20" />
          <span className="pointer-events-none absolute inset-[24%] rounded-full border border-black/10 dark:border-white/10" />
          <span
            className={cn(
              'pointer-events-none absolute top-1/2 left-1/2 h-2 w-2 -translate-x-1/2 -translate-y-1/2 rounded-full bg-background/95 ring-1 ring-border/70',
              centerClassName
            )}
          />
        </>
      ) : (
        <Music2
          className={cn(
            'h-4 w-4 text-muted-foreground',
            isPlaying && 'text-primary',
            iconClassName
          )}
        />
      )}
    </div>
  );
}
