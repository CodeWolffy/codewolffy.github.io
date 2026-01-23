import React from 'react';

interface CopyrightProps {
    title: string;
    url: string;
    author?: string;
}

export function Copyright({ title, url, author = "CodeWolffy" }: CopyrightProps) {
    return (
        <div className="my-8 p-4 rounded-lg bg-secondary/50 border border-border text-sm">
            <div className="flex flex-col gap-2">
                <div className="flex flex-col sm:flex-row gap-1 sm:gap-4">
                    <span className="font-semibold text-muted-foreground min-w-16">文章标题：</span>
                    <span className="font-medium">{title}</span>
                </div>
                <div className="flex flex-col sm:flex-row gap-1 sm:gap-4">
                    <span className="font-semibold text-muted-foreground min-w-16">文章作者：</span>
                    <span>{author}</span>
                </div>
                <div className="flex flex-col sm:flex-row gap-1 sm:gap-4">
                    <span className="font-semibold text-muted-foreground min-w-16">文章链接：</span>
                    <a href={url} className="text-primary hover:underline break-all">{url}</a>
                </div>
                <div className="flex flex-col sm:flex-row gap-1 sm:gap-4">
                    <span className="font-semibold text-muted-foreground min-w-16">版权声明：</span>
                    <span>
                        本博客所有文章除特别声明外，均采用 <a href="https://creativecommons.org/licenses/by-nc-sa/4.0/" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">CC BY-NC-SA 4.0</a> 许可协议。文章可能参考了其他优秀文章，如有侵权请联系删除。
                    </span>
                </div>
            </div>
        </div>
    );
}
