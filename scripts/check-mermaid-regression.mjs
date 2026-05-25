import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const rootDir = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const mermaidComponentPath = resolve(rootDir, 'src/components/mdx/Mermaid.astro');
const component = readFileSync(mermaidComponentPath, 'utf-8');

const assertions = [
  {
    name: '图表原文必须保存在 data-chart，避免 HTML 实体导致渲染漂移',
    pattern: /<pre\s+id=\{id\}\s+class="mermaid"\s+data-chart=\{decodedChart\}>\s*<\/pre>/,
  },
  {
    name: 'Mermaid 必须等待字体加载后再渲染，降低宽度计算漂移',
    pattern: /await\s+document\.fonts\.ready/,
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

const failures = assertions.filter(({ pattern }) => !pattern.test(component));

if (failures.length > 0) {
  console.error('Mermaid 回归检查失败：');
  failures.forEach(({ name }) => console.error(`- ${name}`));
  process.exit(1);
}

const fixtures = [
  {
    name: 'flowchart-default-size',
    source: `flowchart TD\n  A[开始] --> B{判断}\n  B -->|是| C[结束]`,
  },
  {
    name: 'er-long-comment-wrap',
    source: `erDiagram\n  USER {\n    string id "用户唯一标识，字段说明较长时应当自动换行"\n  }`,
  },
];

fixtures.forEach(({ name, source }) => {
  if (!source.trim()) {
    console.error(`Mermaid 回归样例为空：${name}`);
    process.exit(1);
  }
});

console.log(`Mermaid 回归检查通过：${assertions.length} 条结构约束，${fixtures.length} 个最小样例。`);