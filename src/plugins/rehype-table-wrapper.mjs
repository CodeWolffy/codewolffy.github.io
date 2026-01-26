import { visit } from 'unist-util-visit';

/**
 * Wraps tables in a div with class "table-wrapper" to allow horizontal scrolling.
 */
export function rehypeTableWrapper() {
  return (tree) => {
    visit(tree, 'element', (node, index, parent) => {
      if (node.tagName === 'table') {
        parent.children[index] = {
          type: 'element',
          tagName: 'div',
          properties: {
            className: ['table-wrapper'],
          },
          children: [node],
        };
      }
    });
  };
}
