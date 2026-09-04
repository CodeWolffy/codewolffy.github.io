import fs from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';
import YAML from 'yaml';

const root = process.cwd();
const postsDirectory = path.join(root, 'src', 'content', 'blog');
const seriesDirectory = path.join(root, 'src', 'content', 'series');

const readDirectoryFiles = async (directory, extensions) => {
  try {
    return (await fs.readdir(directory, { withFileTypes: true }))
      .filter(
        (entry) => entry.isFile() && extensions.some((extension) => entry.name.endsWith(extension))
      )
      .map((entry) => entry.name)
      .sort();
  } catch (error) {
    if (error && error.code === 'ENOENT') return [];
    throw error;
  }
};

const postFiles = await readDirectoryFiles(postsDirectory, ['.md', '.mdx']);
const postsById = new Map();
for (const file of postFiles) {
  const id = file.replace(/\.mdx?$/, '');
  const source = await fs.readFile(path.join(postsDirectory, file), 'utf8');
  const frontmatterMatch = source.match(/^---\s*\r?\n([\s\S]*?)\r?\n---/);
  const data = frontmatterMatch ? YAML.parse(frontmatterMatch[1]) || {} : {};
  postsById.set(id, {
    id,
    file,
    title: typeof data.title === 'string' ? data.title : id,
  });
}

const issues = [];
const seriesFiles = await readDirectoryFiles(seriesDirectory, ['.json']);
const seriesById = new Map();
const managedPostOwners = new Map();

for (const file of seriesFiles) {
  const id = file.replace(/\.json$/, '');
  const data = JSON.parse(await fs.readFile(path.join(seriesDirectory, file), 'utf8'));
  const posts = Array.isArray(data.posts) ? data.posts : [];
  seriesById.set(id, { name: data.name || id, posts });

  const seenInSeries = new Set();
  posts.forEach((postId, index) => {
    const position = index + 1;
    if (typeof postId !== 'string' || !postId.trim()) {
      issues.push(`${file}: 第 ${position} 项不是有效的文章标识。`);
      return;
    }
    if (seenInSeries.has(postId)) {
      issues.push(`${file}: 文章 “${postId}” 在同一专栏中重复出现。`);
      return;
    }
    seenInSeries.add(postId);

    if (!postsById.has(postId)) {
      issues.push(`${file}: 第 ${position} 篇引用了不存在的文章 “${postId}”。`);
    }

    const existingOwner = managedPostOwners.get(postId);
    if (existingOwner) {
      issues.push(
        `${file}: 文章 “${postId}” 已在专栏 “${existingOwner.seriesId}” 中，不能重复加入多个专栏。`
      );
    } else {
      managedPostOwners.set(postId, { seriesId: id, order: position });
    }
  });
}

const seriesIds = new Set(seriesById.keys());

if (issues.length > 0) {
  console.error('专栏内容完整性检查失败：');
  issues.forEach((issue) => console.error(`- ${issue}`));
  process.exitCode = 1;
} else {
  console.log(`专栏内容完整性检查通过：${seriesIds.size} 个专栏，${postFiles.length} 篇文章。`);
}

for (const [id, series] of seriesById) {
  console.log(`\n${series.name} (${id})`);
  if (series.posts.length === 0) {
    console.log('  暂无文章；请在专栏后台添加文章。');
    continue;
  }
  series.posts.forEach((postId, index) => {
    const post = postsById.get(postId);
    console.log(`  ${index + 1}  ${post?.title || postId}  [${post?.file || postId}]`);
  });
  console.log(`  下一建议序号：${series.posts.length + 1}`);
}
