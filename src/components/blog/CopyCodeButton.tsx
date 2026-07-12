import { useEffect } from 'react';

export function CopyCodeButton() {
  useEffect(() => {
    const codeBlocks = document.querySelectorAll<HTMLElement>('.prose pre');

    codeBlocks.forEach((pre) => {
      // Mermaid 提供自己的复制工具栏，避免给图表预览和源码视图重复添加按钮。
      if (pre.closest('.mermaid-container, .mermaid-modal')) return;

      // 避免重复添加按钮
      if (pre.querySelector('.copy-code-btn')) return;

      // 创建复制按钮 - 使用剪贴板图标样式
      const button = document.createElement('button');
      button.className =
        'copy-code-btn absolute top-2 right-2 z-10 rounded-md bg-background/80 p-1.5 text-muted-foreground shadow-sm ring-1 ring-border/70 transition-colors hover:bg-secondary hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring';
      button.type = 'button';
      // 剪贴板图标 (clipboard)
      button.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><rect x="8" y="2" width="8" height="4" rx="1" ry="1"/><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/></svg>`;
      button.title = '复制代码';
      button.setAttribute('aria-label', '复制代码');

      button.addEventListener('click', async () => {
        const code = pre.querySelector('code');
        const text = code ? code.innerText : pre.innerText;

        try {
          await navigator.clipboard.writeText(text);
          // 复制成功后显示勾选图标
          button.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="text-green-500"><polyline points="20 6 9 17 4 12"/></svg>`;
          button.title = '已复制！';
          button.setAttribute('aria-label', '代码已复制');

          setTimeout(() => {
            // 恢复剪贴板图标
            button.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><rect x="8" y="2" width="8" height="4" rx="1" ry="1"/><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/></svg>`;
            button.title = '复制代码';
            button.setAttribute('aria-label', '复制代码');
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
