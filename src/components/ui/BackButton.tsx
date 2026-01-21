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
            className="group mb-8 flex items-center text-sm font-medium text-muted-foreground hover:text-primary transition-colors"
        >
            <span className="mr-2">←</span>
            {backInfo.label}
        </a>
    );
}
