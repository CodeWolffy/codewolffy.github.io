import { useEffect, useState } from 'react';

interface BackInfo {
    href: string;
    label: string;
}

// 根据路径获取返回信息
function getBackInfoFromPath(path: string): BackInfo {
    if (path.startsWith('/archives')) {
        return { href: '/archives', label: '返回归档' };
    } else if (path.startsWith('/tags/')) {
        const tag = path.split('/tags/')[1]?.split('/')[0] || '';
        return { href: path, label: `返回标签 #${decodeURIComponent(tag)}` };
    } else if (path.startsWith('/tags')) {
        return { href: '/tags', label: '返回标签' };
    } else if (path === '/' || path === '') {
        return { href: '/', label: '返回首页' };
    }
    return { href: '/', label: '返回首页' };
}

export function BackButton() {
    const [backInfo, setBackInfo] = useState<BackInfo>({ href: '/', label: '返回首页' });

    useEffect(() => {
        // 从 sessionStorage 读取上一页路径
        const previousPath = sessionStorage.getItem('blog_previous_path');

        if (previousPath) {
            setBackInfo(getBackInfoFromPath(previousPath));
        }
    }, []);

    return (
        <a
            href={backInfo.href}
            className="group mb-4 flex items-center text-lg font-bold text-foreground hover:text-primary transition-colors"
        >
            <span className="mr-2 inline-flex items-center transition-transform group-hover:-translate-x-1">
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-arrow-left">
                    <path d="m12 19-7-7 7-7" />
                    <path d="M19 12H5" />
                </svg>
            </span>
            {backInfo.label}
        </a>
    );
}
