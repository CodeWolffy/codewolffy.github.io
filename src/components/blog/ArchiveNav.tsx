import { useState, useEffect, useRef } from 'react';
import { Calendar, BarChart2, ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface ArchiveNavMonth {
  month: number;
  label: string;
  count: number;
  id: string;
}

export interface ArchiveNavYear {
  year: number;
  count: number;
  id: string;
  months: ArchiveNavMonth[];
}

interface ArchiveNavProps {
  years: ArchiveNavYear[];
  totalPosts: number;
  className?: string;
}

export function ArchiveNav({ years, totalPosts, className }: ArchiveNavProps) {
  const [activeId, setActiveId] = useState<string>('');
  // 默认仅展开第一个（最新）年份，显著降低初次加载的占用高度
  const [expandedYears, setExpandedYears] = useState<Record<number, boolean>>(() => {
    const init: Record<number, boolean> = {};
    years.forEach((y, idx) => {
      init[y.year] = idx === 0;
    });
    return init;
  });

  // 年度分布小卡片支持折叠
  const [showDistribution, setShowDistribution] = useState(true);

  const maxYearCount = Math.max(...years.map((y) => y.count), 1);
  const isUserScrollingRef = useRef(false);

  // 1. 视口滚动监听 (ScrollSpy)
  useEffect(() => {
    const targetIds: string[] = [];
    years.forEach((y) => {
      targetIds.push(y.id);
      y.months.forEach((m) => {
        targetIds.push(m.id);
      });
    });

    const observer = new IntersectionObserver(
      (entries) => {
        const intersecting = entries.filter((e) => e.isIntersecting);
        if (intersecting.length > 0) {
          const topOne = intersecting[0];
          const topId = topOne.target.id;
          setActiveId(topId);

          // 自动展开当前活跃年份
          const currentYearItem = years.find(
            (y) => y.id === topId || y.months.some((m) => m.id === topId)
          );
          if (currentYearItem) {
            setExpandedYears((prev) => {
              if (prev[currentYearItem.year]) return prev;
              return { ...prev, [currentYearItem.year]: true };
            });
          }
        }
      },
      {
        rootMargin: '-70px 0% -60% 0%',
        threshold: 0,
      }
    );

    targetIds.forEach((id) => {
      const el = document.getElementById(id);
      if (el) observer.observe(el);
    });

    return () => {
      targetIds.forEach((id) => {
        const el = document.getElementById(id);
        if (el) observer.unobserve(el);
      });
    };
  }, [years]);

  // 2. 智能联动：当 activeId 改变时，将导航项滚入右侧侧边栏视口（非点击跳转引起时）
  useEffect(() => {
    if (!activeId) return;

    if (!isUserScrollingRef.current) {
      const activeNavEl = document.getElementById(`nav-item-${activeId}`);
      if (activeNavEl) {
        activeNavEl.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
      }
    }
  }, [activeId]);

  const toggleYear = (year: number) => {
    setExpandedYears((prev) => ({
      ...prev,
      [year]: !prev[year],
    }));
  };

  const scrollToAnchor = (id: string, e: React.MouseEvent) => {
    e.preventDefault();
    const target = document.getElementById(id);
    if (!target) return;

    isUserScrollingRef.current = true;
    target.scrollIntoView({ behavior: 'smooth' });
    setActiveId(id);

    const url = new URL(window.location.href);
    url.hash = id;
    window.history.replaceState(null, '', url);

    setTimeout(() => {
      isUserScrollingRef.current = false;
    }, 600);
  };

  const isYearActive = (yearItem: ArchiveNavYear) => {
    if (activeId === yearItem.id) return true;
    return yearItem.months.some((m) => m.id === activeId);
  };

  return (
    <div className={cn('space-y-3.5 text-sm', className)}>
      {/* 1. 时间轴快速导航卡片 */}
      <nav
        aria-label="归档快速目录"
        className="rounded-xl border border-border/60 bg-card p-3.5 shadow-sm"
      >
        <div className="mb-2.5 flex items-center justify-between">
          <div className="flex items-center gap-2 font-bold text-foreground">
            <Calendar className="h-4 w-4 text-primary" />
            <span>时间导航</span>
          </div>
          <span className="text-xs text-muted-foreground/80 font-mono">共 {totalPosts} 篇</span>
        </div>

        <div className="space-y-1">
          {years.map((y) => {
            const yearActive = isYearActive(y);
            const isExpanded = expandedYears[y.year] ?? false;

            return (
              <div key={y.year} className="group/nav-year">
                <div
                  id={`nav-item-${y.id}`}
                  className={cn(
                    'flex items-center justify-between rounded-lg px-2.5 py-1.5 transition-colors',
                    yearActive
                      ? 'bg-primary/10 text-primary font-semibold'
                      : 'text-foreground/80 hover:bg-muted/70 hover:text-foreground'
                  )}
                >
                  <a
                    href={`#${y.id}`}
                    onClick={(e) => scrollToAnchor(y.id, e)}
                    className="flex flex-1 items-center gap-2 min-w-0"
                  >
                    <span
                      className={cn(
                        'h-1.5 w-1.5 rounded-full shrink-0 transition-all',
                        yearActive
                          ? 'bg-primary scale-125'
                          : 'bg-muted-foreground/50 group-hover/nav-year:bg-foreground'
                      )}
                    />
                    <span className="font-mono text-xs sm:text-sm tracking-tight">{y.year} 年</span>
                  </a>

                  <div className="flex items-center gap-1.5 shrink-0">
                    <span className="text-xs text-muted-foreground font-mono">{y.count} 篇</span>
                    {y.months.length > 0 && (
                      <button
                        type="button"
                        onClick={() => toggleYear(y.year)}
                        className="rounded p-0.5 text-muted-foreground hover:bg-muted hover:text-foreground transition-transform"
                        aria-label={`折叠/展开 ${y.year} 年月份目录`}
                      >
                        <ChevronDown
                          className={cn(
                            'h-3.5 w-3.5 transition-transform duration-200',
                            isExpanded ? 'rotate-0' : '-rotate-90'
                          )}
                        />
                      </button>
                    )}
                  </div>
                </div>

                {/* 月份子列表 */}
                {isExpanded && y.months.length > 0 && (
                  <div className="ml-4 mt-0.5 space-y-0.5 border-l border-border/60 pl-2">
                    {y.months.map((m) => {
                      const monthActive = activeId === m.id;
                      return (
                        <a
                          id={`nav-item-${m.id}`}
                          key={m.id}
                          href={`#${m.id}`}
                          onClick={(e) => scrollToAnchor(m.id, e)}
                          className={cn(
                            'flex items-center justify-between rounded px-2 py-1 text-xs transition-colors',
                            monthActive
                              ? 'bg-primary/15 text-primary font-medium'
                              : 'text-muted-foreground hover:bg-muted/60 hover:text-foreground'
                          )}
                        >
                          <span>{m.label}</span>
                          <span className="font-mono text-[0.7rem] text-muted-foreground/75">
                            {m.count}
                          </span>
                        </a>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </nav>

      {/* 2. 年度发文分布柱状条 */}
      <div className="rounded-xl border border-border/60 bg-card p-3.5 shadow-sm">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 font-bold text-foreground">
            <BarChart2 className="h-4 w-4 text-primary" />
            <span>年度发文分布</span>
          </div>
          <button
            type="button"
            onClick={() => setShowDistribution((prev) => !prev)}
            className="rounded p-0.5 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
            aria-label="展开或折叠发文分布"
          >
            <ChevronDown
              className={cn(
                'h-3.5 w-3.5 transition-transform duration-200',
                showDistribution ? 'rotate-0' : '-rotate-90'
              )}
            />
          </button>
        </div>

        {showDistribution && (
          <div className="mt-2.5 space-y-2">
            {years.map((y) => {
              const percentage = Math.round((y.count / maxYearCount) * 100);
              const isLatest = y.year === years[0]?.year;

              return (
                <div key={y.year} className="space-y-1">
                  <div className="flex items-center justify-between text-xs font-mono">
                    <span
                      className={cn(
                        isLatest ? 'font-bold text-foreground' : 'text-muted-foreground'
                      )}
                    >
                      {y.year}
                    </span>
                    <span className="text-muted-foreground">{y.count} 篇</span>
                  </div>
                  <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
                    <div
                      className={cn(
                        'h-full rounded-full transition-all duration-500',
                        isLatest ? 'bg-primary' : 'bg-primary/50'
                      )}
                      style={{ width: `${Math.max(percentage, 8)}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
