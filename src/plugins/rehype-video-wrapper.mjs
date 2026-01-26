import { visit } from 'unist-util-visit';

/**
 * Wraps iframes in a div with class "video-wrapper" to maintain aspect ratio.
 * Also adds necessary fullscreen attributes for mobile compatibility.
 */
export function rehypeVideoWrapper() {
    return (tree) => {
        visit(tree, 'element', (node, index, parent) => {
            if (node.tagName === 'iframe') {
                const title = node.properties.title;

                // 添加全屏相关属性，确保移动端全屏功能正常
                node.properties.allow = 'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share; fullscreen; presentation';
                node.properties.allowFullscreen = true;
                node.properties.webkitallowfullscreen = 'true';
                node.properties.mozallowfullscreen = 'true';
                // 不设置 sandbox 属性，以确保全屏功能正常
                delete node.properties.sandbox;
                // iOS 相关属性
                node.properties.playsinline = 'true';

                // Construct the figure structure
                const figure = {
                    type: 'element',
                    tagName: 'figure',
                    properties: { className: ['my-4'] },
                    children: [
                        {
                            type: 'element',
                            tagName: 'div',
                            properties: { className: ['video-wrapper', 'video-container'] },
                            children: [node]
                        }
                    ]
                };

                // Add caption if title exists
                if (title) {
                    figure.children.push({
                        type: 'element',
                        tagName: 'figcaption',
                        properties: { className: ['text-center', 'text-sm', 'text-muted-foreground', 'mt-2'] },
                        children: [{ type: 'text', value: title }]
                    });
                }

                parent.children[index] = figure;
            }
        });
    };
}
