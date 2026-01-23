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

    // 处理 GitHub 登录后自动滚动到评论区
    React.useEffect(() => {
        const scrollToComments = () => {
            const commentsDiv = document.getElementById('comments-container');
            if (commentsDiv) {
                // 使用 requestAnimationFrame 确保 DOM 渲染完成
                requestAnimationFrame(() => {
                    commentsDiv.scrollIntoView({ behavior: 'smooth', block: 'start' });
                });
            }
        };

        try {
            const referrer = document.referrer;
            const hash = window.location.hash;

            // 检测是否从 GitHub/Giscus 登录返回，或者 URL 包含 #comments
            const isFromAuth = referrer && (
                referrer.includes('giscus.app') ||
                referrer.includes('github.com') ||
                referrer.includes('api.github.com')
            );
            const hasCommentsHash = hash === '#comments' || hash === '#comments-container';

            if (isFromAuth || hasCommentsHash) {
                // 增加延时，等待 Giscus iframe 加载
                setTimeout(scrollToComments, 800);

                // 备用：监听 Giscus iframe 加载完成
                const observer = new MutationObserver((mutations, obs) => {
                    const iframe = document.querySelector('.giscus-frame');
                    if (iframe) {
                        setTimeout(scrollToComments, 200);
                        obs.disconnect();
                    }
                });

                observer.observe(document.body, { childList: true, subtree: true });

                // 5秒后停止监听，避免内存泄漏
                setTimeout(() => observer.disconnect(), 5000);
            }
        } catch (e) {
            console.error('Failed to handle auto-scroll:', e);
        }
    }, []);

    return (
        <div id="comments-container" className="w-full mt-10 scroll-mt-20">
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
                loading="eager"
            />
        </div>
    );
}
