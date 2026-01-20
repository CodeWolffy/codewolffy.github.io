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

    return (
        <div className="w-full mt-10">
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
                lang="en"
                loading="lazy"
            />
            <div className="text-center text-xs text-muted-foreground mt-2">
                * Note: Please configure your Giscus repo details in <code>src/components/blog/Comments.tsx</code>
            </div>
        </div>
    );
}
