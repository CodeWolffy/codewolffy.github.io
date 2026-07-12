import { readdirSync, readFileSync } from 'node:fs';
import { dirname, extname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const rootDir = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const expectedComponents = [
  'Iframe',
  'Callout',
  'Mermaid',
  'Details',
  'LinkCard',
  'Steps',
  'CodeGroup',
];

const readProjectFile = (path) => readFileSync(resolve(rootDir, path), 'utf8');
const keystaticConfig = readProjectFile('keystatic.config.tsx');
const blogPage = readProjectFile('src/pages/blog/[...slug].astro');
const codeGroupIsland = readProjectFile('src/components/mdx/CodeGroupIsland.astro');
const exportUtils = readProjectFile('src/components/blog/export-utils.ts');
const failures = [];

const assert = (condition, message) => {
  if (!condition) failures.push(message);
};
const getKeystaticComponentSection = (component) => {
  const componentIndex = expectedComponents.indexOf(component);
  const start = keystaticConfig.indexOf(`${component}: block(`);
  if (start < 0) return '';

  const nextComponent = expectedComponents[componentIndex + 1];
  const end = nextComponent ? keystaticConfig.indexOf(`${nextComponent}: block(`, start) : -1;
  return keystaticConfig.slice(start, end > start ? end : undefined);
};

for (const component of expectedComponents) {
  assert(
    new RegExp(`\\b${component}:\\s*block\\(`).test(keystaticConfig),
    `Keystatic 未注册 ${component}`
  );

  const frontendPattern =
    component === 'CodeGroup'
      ? /\bCodeGroup:\s*CodeGroupIsland\b/
      : new RegExp(`(?:^|\\n)\\s*${component},`);
  assert(frontendPattern.test(blogPage), `文章展示页未注册 ${component}`);
}

const namedPreviewMappings = {
  Iframe: 'IframeContentView',
  LinkCard: 'LinkCardContentView',
  Steps: 'StepsContentView',
};
const previewImport = keystaticConfig.match(
  /import\s*{([\s\S]*?)}\s*from\s*['"]\.\/src\/components\/keystatic\/MdxContentPreviews['"]/
);

assert(previewImport, 'Keystatic 必须从 MdxContentPreviews 导入后台预览组件');
for (const [component, contentView] of Object.entries(namedPreviewMappings)) {
  assert(
    previewImport?.[1].split(',').some((name) => name.trim() === contentView),
    `Keystatic 必须从 MdxContentPreviews 导入 ${contentView}`
  );
  assert(
    new RegExp(`\\bContentView:\\s*${contentView}\\b`).test(
      getKeystaticComponentSection(component)
    ),
    `Keystatic 的 ${component} 必须映射到 ${contentView}`
  );
}

assert(
  /import\s+CodeGroupIsland\s+from\s+['"][^'"]*CodeGroupIsland\.astro['"]/.test(blogPage),
  '文章展示页必须通过 CodeGroupIsland 注册 CodeGroup'
);
assert(/\biframe:\s*Iframe\b/.test(blogPage), '文章展示页必须保留小写 iframe 的兼容映射');
assert(
  /<CodeGroup\s+\{\.\.\.props\}\s+client:load\s*\/>/.test(codeGroupIsland),
  'CodeGroupIsland 必须使用 client:load hydration'
);

const iframeExportStart = exportUtils.indexOf('export const fixIframesOutsideCodeBlocks');
const iframeExportEnd = exportUtils.indexOf('export const restoreMermaidBlocks');
const iframeExportBlock =
  iframeExportStart >= 0 && iframeExportEnd > iframeExportStart
    ? exportUtils.slice(iframeExportStart, iframeExportEnd)
    : '';
assert(iframeExportBlock.length > 0, '导出工具缺少 iframe 转换逻辑');
assert(
  /\/<iframe\\s\+[\s\S]*\/gi/.test(iframeExportBlock),
  '导出工具的 iframe 匹配必须使用不区分大小写的 gi 标志，以识别 <Iframe>'
);

const contentDir = resolve(rootDir, 'src/content/blog');
const contentFiles = [];
const collectContentFiles = (directory) => {
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    const fullPath = resolve(directory, entry.name);
    if (entry.isDirectory()) {
      collectContentFiles(fullPath);
    } else if (['.md', '.mdx'].includes(extname(entry.name))) {
      contentFiles.push(fullPath);
    }
  }
};

const stripFencedCodeBlocks = (source) => {
  const output = [];
  let fence = null;

  for (const line of source.split(/\r?\n/)) {
    if (fence) {
      const closingFence = new RegExp(`^ {0,3}\\${fence.marker}{${fence.length},}\\s*$`);
      if (closingFence.test(line)) fence = null;
      continue;
    }

    const openingFence = line.match(/^ {0,3}(`{3,}|~{3,})/);
    if (openingFence) {
      fence = { marker: openingFence[1][0], length: openingFence[1].length };
      continue;
    }

    output.push(line);
  }

  return output.join('\n');
};
const lowercaseIframePattern = /<\/?iframe(?=[\s/>])/;
const fencedIframeFixture = [
  '````mdx',
  '<iframe src="https://example.com/embed" />',
  '```',
  '````',
  '<Iframe src="https://example.com/embed" />',
  '~~~html',
  '<iframe src="https://example.com/embed" />',
  '~~~',
].join('\n');

assert(
  !lowercaseIframePattern.test(stripFencedCodeBlocks(fencedIframeFixture)),
  '小写 iframe 检查必须忽略 fenced code block 内的示例'
);
assert(
  lowercaseIframePattern.test(stripFencedCodeBlocks('<iframe src="https://example.com/embed" />')),
  '小写 iframe 检查必须识别 fenced code block 外的原生标签'
);

collectContentFiles(contentDir);
for (const file of contentFiles) {
  const source = readFileSync(file, 'utf8');
  const sourceOutsideCodeFences = stripFencedCodeBlocks(source);
  assert(
    !lowercaseIframePattern.test(sourceOutsideCodeFences),
    `内容中禁止使用小写 <iframe>：${file}`
  );
}

if (failures.length > 0) {
  console.error('MDX 自定义组件回归检查失败：');
  failures.forEach((failure) => console.error(`- ${failure}`));
  process.exit(1);
}

console.log(
  `MDX 自定义组件回归检查通过：${expectedComponents.length} 个组件链路，${contentFiles.length} 个内容文件。`
);
