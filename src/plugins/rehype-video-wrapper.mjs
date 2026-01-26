import { visit } from 'unist-util-visit';

/**
 * Wraps iframes in a div with class "video-wrapper" to maintain aspect ratio.
 */
export function rehypeVideoWrapper() {
    return (tree) => {
        visit(tree, 'element', (node, index, parent) => {
            if (node.tagName === 'iframe') {
                const title = node.properties.title;

                // Construct the figure structure
                const figure = {
                    type: 'element',
                    tagName: 'figure',
                    properties: { className: ['my-4'] },
                    children: [
                        {
                            type: 'element',
                            tagName: 'div',
                            properties: { className: ['video-wrapper'] },
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
