import * as React from 'react';
import { Check, Copy } from 'lucide-react';

export function CopyCodeButton() {
    React.useEffect(() => {
        const codeBlocks = document.querySelectorAll('pre');

        codeBlocks.forEach((pre) => {
            // 避免重复添加按钮
            if (pre.querySelector('.copy-code-btn')) return;

            // 设置相对定位
            pre.style.position = 'relative';

            // 创建复制按钮 - 使用剪贴板图标样式
            const button = document.createElement('button');
            button.className = 'copy-code-btn absolute top-2 right-2 p-1.5 rounded-md hover:bg-secondary/50 text-muted-foreground hover:text-foreground transition-all opacity-0 group-hover:opacity-100';
            // 剪贴板图标 (clipboard)
            button.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><rect x="8" y="2" width="8" height="4" rx="1" ry="1"/><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/></svg>`;
            button.title = '复制代码';

            // 添加悬停显示效果
            pre.classList.add('group');
            button.style.opacity = '0';
            pre.addEventListener('mouseenter', () => button.style.opacity = '1');
            pre.addEventListener('mouseleave', () => button.style.opacity = '0');

            button.addEventListener('click', async () => {
                const code = pre.querySelector('code');
                const text = code ? code.innerText : pre.innerText;

                try {
                    await navigator.clipboard.writeText(text);
                    // 复制成功后显示勾选图标
                    button.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="text-green-500"><polyline points="20 6 9 17 4 12"/></svg>`;
                    button.title = '已复制！';

                    setTimeout(() => {
                        // 恢复剪贴板图标
                        button.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><rect x="8" y="2" width="8" height="4" rx="1" ry="1"/><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/></svg>`;
                        button.title = '复制代码';
                    }, 2000);
                } catch (err) {
                    console.error('复制失败:', err);
                }
            });

            pre.appendChild(button);
        });
    }, []);

    return null;
}

