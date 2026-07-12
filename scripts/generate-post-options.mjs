import fs from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';
import YAML from 'yaml';

const root = process.cwd();
const postsDirectory = path.join(root, 'src', 'content', 'blog');
const outputDirectory = path.join(root, 'src', 'generated');
const outputFile = path.join(outputDirectory, 'post-options.json');

const files = (await fs.readdir(postsDirectory, { withFileTypes: true }))
  .filter((entry) => entry.isFile() && /\.mdx?$/.test(entry.name))
  .map((entry) => entry.name);

const options = [];
for (const file of files) {
  const source = await fs.readFile(path.join(postsDirectory, file), 'utf8');
  const frontmatterMatch = source.match(/^---\s*\r?\n([\s\S]*?)\r?\n---/);
  if (!frontmatterMatch) continue;

  const data = YAML.parse(frontmatterMatch[1]) || {};
  const value = file.replace(/\.mdx?$/, '');
  const label = typeof data.title === 'string' && data.title.trim() ? data.title.trim() : value;
  options.push({ label, value });
}

options.sort((a, b) => a.label.localeCompare(b.label, 'zh-CN'));
await fs.mkdir(outputDirectory, { recursive: true });
await fs.writeFile(outputFile, `${JSON.stringify(options, null, 2)}\n`, 'utf8');
console.log(`已生成文章选择项：${options.length} 篇文章。`);
