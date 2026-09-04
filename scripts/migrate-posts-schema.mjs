import fs from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';
import YAML from 'yaml';

const rootDir = process.cwd();
const blogDir = path.join(rootDir, 'src', 'content', 'blog');

async function migratePosts() {
  const entries = await fs.readdir(blogDir, { withFileTypes: true });
  const mdxFiles = entries
    .filter((entry) => entry.isFile() && /\.mdx?$/.test(entry.name))
    .map((entry) => entry.name)
    .sort();

  console.log(`Found ${mdxFiles.length} posts in ${blogDir}`);

  let cleanedSeriesCount = 0;
  let normalizedCategoryCount = 0;
  let normalizedTagsCount = 0;
  let updatedFilesCount = 0;

  for (const filename of mdxFiles) {
    const filePath = path.join(blogDir, filename);
    const content = await fs.readFile(filePath, 'utf-8');

    const frontmatterMatch = content.match(/^---\r?\n([\s\S]*?)\r?\n---(?:\r?\n|$)/);
    if (!frontmatterMatch) {
      console.warn(`[Skip] No frontmatter in ${filename}`);
      continue;
    }

    const rawYaml = frontmatterMatch[1];
    const parsed = YAML.parse(rawYaml) || {};
    let hasChanges = false;

    // 1. Remove legacy series & seriesOrder
    if ('series' in parsed) {
      delete parsed.series;
      cleanedSeriesCount++;
      hasChanges = true;
    }
    if ('seriesOrder' in parsed) {
      delete parsed.seriesOrder;
      cleanedSeriesCount++;
      hasChanges = true;
    }

    // 2. Normalize category to string
    if (parsed.category) {
      if (typeof parsed.category === 'object') {
        const val = parsed.category.value;
        parsed.category = typeof val === 'string' && val.trim() ? val.trim() : undefined;
        normalizedCategoryCount++;
        hasChanges = true;
      } else if (typeof parsed.category === 'string') {
        parsed.category = parsed.category.trim();
      }
    }

    // 3. Normalize tags to string array
    if (Array.isArray(parsed.tags)) {
      let tagsChanged = false;
      const normalizedTags = [];
      for (const tag of parsed.tags) {
        if (typeof tag === 'string') {
          const trimmed = tag.trim();
          if (trimmed) normalizedTags.push(trimmed);
        } else if (tag && typeof tag === 'object' && 'value' in tag) {
          const val = typeof tag.value === 'string' ? tag.value.trim() : '';
          if (val) normalizedTags.push(val);
          tagsChanged = true;
        }
      }
      if (tagsChanged) {
        normalizedTagsCount++;
        hasChanges = true;
      }
      parsed.tags = normalizedTags;
    }

    if (hasChanges) {
      // Re-serialize frontmatter cleanly
      const body = content.slice(frontmatterMatch[0].length);
      const newYaml = YAML.stringify(parsed).trim();
      const newContent = `---\n${newYaml}\n---\n\n${body.replace(/^\r?\n+/, '')}`;
      await fs.writeFile(filePath, newContent, 'utf-8');
      updatedFilesCount++;
    }
  }

  console.log(`\nMigration completed:`);
  console.log(`- Total posts scanned: ${mdxFiles.length}`);
  console.log(`- Posts updated: ${updatedFilesCount}`);
  console.log(`- Cleaned legacy series/seriesOrder entries: ${cleanedSeriesCount}`);
  console.log(`- Normalized category objects: ${normalizedCategoryCount}`);
  console.log(`- Normalized tags objects: ${normalizedTagsCount}`);
}

migratePosts().catch((err) => {
  console.error('Migration failed:', err);
  process.exitCode = 1;
});
