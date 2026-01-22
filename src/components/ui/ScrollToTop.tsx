import * as React from 'react';

export function ScrollToTop() {
    const [isVisible, setIsVisible] = React.useState(false);
    const [progress, setProgress] = React.useState(0);

    React.useEffect(() => {
        const updateState = () => {
            // 更新可见性
            setIsVisible(window.scrollY > 300);

            // 更新阅读进度
            const scrollTop = window.scrollY;
            const docHeight = document.documentElement.scrollHeight - window.innerHeight;
            const scrollPercent = docHeight > 0 ? (scrollTop / docHeight) * 100 : 0;
            setProgress(Math.min(100, Math.max(0, scrollPercent)));
        };

        window.addEventListener('scroll', updateState, { passive: true });
        updateState();

        return () => window.removeEventListener('scroll', updateState);
    }, []);

    const scrollToTop = () => {
        window.scrollTo({
            top: 0,
            behavior: 'smooth'
        });
    };

    // 圆形进度条的 SVG 参数
    const size = 48;
    const strokeWidth = 3;
    const radius = (size - strokeWidth) / 2;
    const circumference = 2 * Math.PI * radius;
    const strokeDashoffset = circumference - (progress / 100) * circumference;

    return (
        <button
            onClick={scrollToTop}
            className={`fixed bottom-6 right-6 z-50 group
                transition-all duration-300 
                ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4 pointer-events-none'}`}
            aria-label="滚动到顶部"
            style={{ width: size, height: size }}
        >
            {/* 背景圆和进度环 */}
            <svg
                className="absolute inset-0 -rotate-90"
                width={size}
                height={size}
            >
                {/* 背景轨道 */}
                <circle
                    cx={size / 2}
                    cy={size / 2}
                    r={radius}
                    fill="none"
                    className="stroke-muted/30 dark:stroke-muted/20"
                    strokeWidth={strokeWidth}
                />
                {/* 进度条 - 使用蓝色渐变 */}
                <circle
                    cx={size / 2}
                    cy={size / 2}
                    r={radius}
                    fill="none"
                    stroke="url(#progressGradient)"
                    strokeWidth={strokeWidth}
                    strokeLinecap="round"
                    strokeDasharray={circumference}
                    strokeDashoffset={strokeDashoffset}
                    className="transition-all duration-150 ease-out"
                />
                {/* 渐变定义 */}
                <defs>
                    <linearGradient id="progressGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                        <stop offset="0%" stopColor="#3b82f6" />
                        <stop offset="100%" stopColor="#06b6d4" />
                    </linearGradient>
                </defs>
            </svg>

            {/* 中心背景圆 */}
            <div
                className="absolute inset-[4px] rounded-full bg-background dark:bg-card
                    shadow-sm group-hover:shadow-md transition-shadow duration-300
                    border border-border/30 dark:border-border/20"
            />

            {/* 箭头图标 */}
            <svg
                className="absolute inset-0 m-auto w-5 h-5 text-primary transition-transform duration-300 group-hover:-translate-y-0.5"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
            >
                <path d="M12 19V5" />
                <path d="M5 12l7-7 7 7" />
            </svg>
        </button>
    );
}
