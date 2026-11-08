import fs from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';
import { pathToFileURL } from 'node:url';
import YAML from 'yaml';

export async function generatePostOptions(root = process.cwd()) {
  const postsDirectory = path.join(root, 'src', 'content', 'blog');
  const outputDirectory = path.join(root, 'src', 'generated');
  const outputFile = path.join(outputDirectory, 'post-options.json');

  const files = (await fs.readdir(postsDirectory, { withFileTypes: true }))
    .filter((entry) => entry.isFile() && /\.mdx?$/.test(entry.name))
    .map((entry) => entry.name)
    .sort();

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

  options.sort((a, b) => a.label.localeCompare(b.label, 'zh-CN') || a.value.localeCompare(b.value));
  const output = `${JSON.stringify(options, null, 2)}\n`;
  let previous;
  try {
    previous = await fs.readFile(outputFile, 'utf8');
  } catch (error) {
    if (error.code !== 'ENOENT') throw error;
  }
  const changed = previous !== output;
  if (changed) {
    await fs.mkdir(outputDirectory, { recursive: true });
    await fs.writeFile(outputFile, output, 'utf8');
  }
  return { changed, count: options.length };
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  const { count, changed } = await generatePostOptions();
  console.log(`文章选择项${changed ? '已更新' : '无变化'}：${count} 篇文章。`);
}
