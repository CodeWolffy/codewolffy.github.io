import * as React from 'react';
import Giscus from '@giscus/react';

export function Comments() {
    const [theme, setTheme] = React.useState('light');

    React.useEffect(() => {
        const isDark = document.documentElement.classList.contains('dark');
        setTheme(isDark ? 'dark' : 'light');

        const observer = new MutationObserver((mutations) => {
            mutations.forEach((mutation) => {
                if (mutation.type === 'attributes' && mutation.attributeName === 'class') {
                    const isDark = document.documentElement.classList.contains('dark');
                    setTheme(isDark ? 'dark' : 'light');
                }
            });
        });

        observer.observe(document.documentElement, { attributes: true });

        return () => observer.disconnect();
    }, []);

    // 处理 GitHub 登录后保持在评论区位置
    // 原理：当用户在评论区可见时离开页面（去 GitHub 登录），保存位置标记
    // 返回后检测标记并恢复位置
    React.useEffect(() => {
        let isCommentsVisible = false;
        const STORAGE_KEY = 'giscus-scroll-position';

        // 监听评论区是否在视口中
        const commentsDiv = document.getElementById('comments-container');

        const intersectionObserver = new IntersectionObserver(
            (entries) => {
                isCommentsVisible = entries[0]?.isIntersecting || false;
            },
            { threshold: 0.1 }
        );

        if (commentsDiv) {
            intersectionObserver.observe(commentsDiv);
        }

        // 页面加载时检查是否需要恢复位置
        const savedPosition = sessionStorage.getItem(STORAGE_KEY);
        if (savedPosition) {
            sessionStorage.removeItem(STORAGE_KEY);
            // 等待页面布局稳定后滚动
            // 等待页面布局稳定后滚动 - 增加延时以避免移动端渲染冲突导致卡死
            setTimeout(() => {
                requestAnimationFrame(() => {
                    window.scrollTo({
                        top: parseInt(savedPosition, 10),
                        behavior: 'instant'
                    });
                });
            }, 300);
        }

        // 页面隐藏时（用户跳转到 GitHub 登录），保存滚动位置
        const handleVisibilityChange = () => {
            if (document.visibilityState === 'hidden' && isCommentsVisible) {
                sessionStorage.setItem(STORAGE_KEY, String(window.scrollY));
            }
        };

        document.addEventListener('visibilitychange', handleVisibilityChange);

        return () => {
            intersectionObserver.disconnect();
            document.removeEventListener('visibilitychange', handleVisibilityChange);
        };
    }, []);

    // "Smart Eager" Loading: 
    // Wait for the main thread to settle (useEffect runs after paint), then trigger "eager" loading.
    // This prevents the heavy iframe setup from blocking the initial page scroll/interaction.
    const [shouldLoad, setShouldLoad] = React.useState(false);
    React.useEffect(() => {
        const timer = setTimeout(() => setShouldLoad(true), 100);
        return () => clearTimeout(timer);
    }, []);

    return (
        <div
            id="comments-container"
            className="w-full mt-2 scroll-mt-20 min-h-[300px]"
            style={{ contain: 'content' }} // CSS Isolation: isolates layout calculations
        >
            {shouldLoad && (
                <Giscus
                    id="comments"
                    repo="CodeWolffy/codewolffy.github.io"
                    repoId="R_kgDOQ9k4Jg"
                    category="Announcements"
                    categoryId="DIC_kwDOQ9k4Js4C1Mb7"
                    mapping="pathname"
                    term="Welcome to my blog!"
                    reactionsEnabled="1"
                    emitMetadata="0"
                    inputPosition="bottom"
                    theme={theme}
                    lang="zh-CN"
                    loading="eager" // Load immediately once component is mounted
                />
            )}
        </div>
    );
}
