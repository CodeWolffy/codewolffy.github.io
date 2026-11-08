import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import mermaid from 'mermaid';

const rootDir = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const mermaidComponentPath = resolve(rootDir, 'src/components/mdx/Mermaid.astro');
const component = readFileSync(mermaidComponentPath, 'utf-8');
const renderer = readFileSync(resolve(rootDir, 'src/components/mdx/mermaid-renderer.ts'), 'utf-8');

const assertions = [
  {
    name: '图表原文必须保存在 data-chart，避免 HTML 实体导致渲染漂移',
    pattern: /<pre\s+id=\{id\}\s+class="mermaid"\s+data-chart=\{decodedChart\}>\s*<\/pre>/,
  },
  {
    name: 'Mermaid 必须等待字体加载后再渲染，降低宽度计算漂移',
    pattern: /await\s+doc\.fonts\.ready/,
    source: renderer,
  },
  {
    name: '全屏必须使用原生模态对话框，提供键盘焦点隔离',
    pattern: /<dialog\s+class="mermaid-modal"[\s\S]*?aria-label=/,
  },
  {
    name: 'E-R 图必须关闭 useMaxWidth，避免被容器强行压缩',
    pattern: /er:\s*\{[\s\S]*?useMaxWidth:\s*false/,
  },
  {
    name: '流程图必须关闭 useMaxWidth，避免默认宽度覆盖自定义缩放',
    pattern: /flowchart:\s*\{[\s\S]*?useMaxWidth:\s*false/,
  },
  {
    name: 'E-R 备注必须走换行归一化，避免长字段撑破布局',
    pattern: /const\s+normalizeErDiagram\s*=|function\s+normalizeErDiagram/,
  },
  {
    name: 'SVG 必须基于内容重新计算 viewBox，避免图形被裁切',
    pattern: /const\s+fitSvgViewport\s*=|function\s+fitSvgViewport/,
  },
  {
    name: '默认尺寸必须写入 baseWidth/baseHeight，保证缩放可逆',
    pattern: /dataset\.baseWidth[\s\S]*dataset\.baseHeight/,
  },
  {
    name: '图表滚动容器必须保留横向滚动能力',
    pattern: /\.mermaid-scroll-container\s*\{[\s\S]*?overflow:\s*auto/,
  },
  {
    name: 'E-R 表格样式必须隔离 prose table，避免文章表格样式串扰',
    pattern: /\.prose\s+\.mermaid\s+table[\s\S]*border-collapse:\s*separate/,
  },
];

const failures = assertions.filter(({ pattern, source = component }) => !pattern.test(source));

if (failures.length > 0) {
  console.error('Mermaid 回归检查失败：');
  failures.forEach(({ name }) => console.error(`- ${name}`));
  process.exit(1);
}

const fixtures = [
  {
    name: 'flowchart-branch',
    // Node has no browser DOM for Mermaid's HTML-label sanitizer. Exercise the
    // actual grammar here; browser smoke tests cover labels, layout and rendering.
    source: `flowchart TD\n  start --> decision\n  decision --> success\n  decision --> failure`,
    diagramType: 'flowchart-v2',
  },
  {
    name: 'er-long-comment-wrap',
    source: `erDiagram\n  USER {\n    string id "用户唯一标识，字段说明较长时应当自动换行"\n  }`,
    diagramType: 'er',
  },
  {
    name: 'sequence-message',
    source: `sequenceDiagram\n  Alice->>Bob: Hello\n  Bob-->>Alice: Accepted`,
    diagramType: 'sequence',
  },
];

mermaid.initialize({ startOnLoad: false, securityLevel: 'strict' });
for (const { name, source, diagramType } of fixtures) {
  try {
    const result = await mermaid.parse(source);
    if (!result || result.diagramType !== diagramType) {
      throw new Error(`预期 ${diagramType}，实际 ${result && result.diagramType}`);
    }
  } catch (error) {
    console.error(`Mermaid 回归样例解析失败：${name}`, error);
    process.exit(1);
  }
}

// Ensure this check is capable of rejecting invalid grammar rather than only
// detecting a diagram keyword or accepting nonempty fixture strings.
try {
  await mermaid.parse('flowchart TD\n  A -->');
  console.error('Mermaid 解析器未拒绝非法流程图样例');
  process.exit(1);
} catch {
  // Expected parser rejection.
}

console.log(
  `Mermaid 回归检查通过：${assertions.length} 条结构约束，${fixtures.length} 个样例已真实解析，非法语法已拒绝。`
);
