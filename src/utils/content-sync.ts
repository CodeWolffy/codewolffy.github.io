import fs from 'fs/promises';
import path from 'path';
import { parse as parseYaml } from 'yaml';

export interface SyncContentOptions {
  check?: boolean;
  strict?: boolean;
}

interface ExtractedTaxonomies {
  tags: Set<string>;
  categories: Set<string>;
}

const DEFINITION_FILENAME_SAFE_PATTERN = /[\\/:*?"<>|]/g;

function logScopedError(scope: string, message: string): void {
  console.error(`[${scope}] ${message}`);
}

function normalizeDefinitionName(name: string): string {
  return name.replace(DEFINITION_FILENAME_SAFE_PATTERN, '_');
}

function normalizeReferenceValue(value: unknown): string {
  if (value === null || value === undefined) return '';
  if (typeof value === 'string') return value.trim();

  if (typeof value === 'object') {
    const obj = value as Record<string, unknown>;
    if ('value' in obj) return normalizeReferenceValue(obj.value);
    if ('id' in obj) return normalizeReferenceValue(obj.id);
    if ('name' in obj) return normalizeReferenceValue(obj.name);
  }

  return '';
}

function collectReferenceValues(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value.map(normalizeReferenceValue).filter(Boolean);
  }

  const normalized = normalizeReferenceValue(value);
  return normalized ? [normalized] : [];
}

function formatError(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

function safeDefinitionFilename(name: string): string {
  return `${normalizeDefinitionName(name)}.json`;
}

function parseFrontmatter(content: string, filePath = ''): Record<string, unknown> {
  const match = content.match(/^---\r?\n([\s\S]*?)\r?\n---(?:\r?\n|$)/);
  if (!match) return {};

  try {
    const parsed = parseYaml(match[1]);
    return parsed && typeof parsed === 'object' ? (parsed as Record<string, unknown>) : {};
  } catch (error) {
    const source = filePath ? ` in ${filePath}` : '';
    throw new Error(`Failed to parse frontmatter${source}: ${formatError(error)}`);
  }
}

function extractTagsAndCategories(
  content: string,
  filePath = '',
  reportError: (message: string) => void = (message) => logScopedError('ContentSync', message)
): ExtractedTaxonomies {
  const tags = new Set<string>();
  const categories = new Set<string>();

  try {
    const data = parseFrontmatter(content, filePath);

    collectReferenceValues(data.tags).forEach((tag) => tags.add(tag));
    collectReferenceValues(data.category).forEach((category) => categories.add(category));
  } catch (error) {
    reportError(formatError(error));
  }

  return { tags, categories };
}

export async function syncContent(
  rootDir: string,
  options: SyncContentOptions = {}
): Promise<void> {
  const checkOnly = options.check === true;
  const strict = options.strict === true || checkOnly;
  const errors: string[] = [];
  const BLOG_DIR = path.resolve(rootDir, 'src/content/blog');
  const TAGS_DIR = path.resolve(rootDir, 'src/content/tags');
  const CATEGORIES_DIR = path.resolve(rootDir, 'src/content/categories');

  // Ensure directories exist
  if (!checkOnly) {
    await fs.mkdir(TAGS_DIR, { recursive: true });
    await fs.mkdir(CATEGORIES_DIR, { recursive: true });
  }

  const reportError = (message: string) => {
    errors.push(message);
    logScopedError('ContentSync', message);
  };

  async function getFiles(dir: string): Promise<string[]> {
    try {
      const dirents = await fs.readdir(dir, { withFileTypes: true });
      return dirents
        .filter((dirent) => dirent.isFile() && dirent.name.endsWith('.mdx'))
        .map((dirent) => path.join(dir, dirent.name));
    } catch (e) {
      reportError(`Error reading directory ${dir}: ${formatError(e)}`);
      return [];
    }
  }

  console.log('[AutoSync] Scanning content...');

  const blogFiles = await getFiles(BLOG_DIR);
  const allTags = new Set<string>();
  const allCategories = new Set<string>();

  // 并发读取和处理所有 MDX 文章文件
  await Promise.all(
    blogFiles.map(async (file) => {
      try {
        const content = await fs.readFile(file, 'utf-8');
        const { tags, categories } = extractTagsAndCategories(content, file, reportError);
        tags.forEach((t) => allTags.add(t));
        categories.forEach((c) => allCategories.add(c));
      } catch (e) {
        reportError(`Error reading blog file ${file}: ${formatError(e)}`);
      }
    })
  );

  // Helper to check existing files and detect casing mismatches
  const existsInDir = async (dir: string, tagName: string): Promise<boolean> => {
    try {
      const files = await fs.readdir(dir);
      let caseInsensitiveMatch: { file: string; name: string } | null = null;

      for (const file of files) {
        if (!file.endsWith('.json')) continue;
        try {
          const filePath = path.join(dir, file);
          const content = JSON.parse(await fs.readFile(filePath, 'utf-8')) as { name?: string };
          const fileName = file.replace('.json', '');
          const safeTagName = tagName.replace(/[\\/:*?"<>|]/g, '_');

          // 1. Exact match (case-sensitive) - preferred
          if (content.name === tagName) return true;
          if (fileName === safeTagName) return true;

          // 2. Case-insensitive match - record it but keep looking for an exact match
          if (fileName.toLowerCase() === safeTagName.toLowerCase()) {
            caseInsensitiveMatch = { file, name: content.name ?? fileName };
          }
        } catch (e) {
          const message = `Error reading definition file ${path.join(dir, file)}: ${formatError(e)}`;
          if (strict) reportError(message);
          else logScopedError('ContentSync', message);
        }
      }

      if (caseInsensitiveMatch) {
        console.warn(
          `[AutoSync] Casing mismatch detected: "${tagName}" in posts does not match existing definition "${caseInsensitiveMatch.name}" (${caseInsensitiveMatch.file}). Skipping creation to avoid duplicates.`
        );
        return true;
      }
    } catch (e) {
      const message = `Error reading definition directory ${dir}: ${formatError(e)}`;
      if (strict) reportError(message);
      else logScopedError('ContentSync', message);
    }
    return false;
  };

  let changes = 0;

  // Sync Tags
  for (const tag of allTags) {
    if (!(await existsInDir(TAGS_DIR, tag))) {
      const safeFilename = safeDefinitionFilename(tag);
      const targetPath = path.join(TAGS_DIR, safeFilename);

      if (checkOnly) {
        reportError(`Missing tag definition: ${tag} (${path.relative(rootDir, targetPath)})`);
        continue;
      }

      console.log(`[AutoSync] Creating missing tag: ${tag}`);
      await fs.writeFile(targetPath, JSON.stringify({ name: tag }, null, 2));
      changes++;
    }
  }

  // Sync Categories
  for (const category of allCategories) {
    if (!(await existsInDir(CATEGORIES_DIR, category))) {
      const safeFilename = safeDefinitionFilename(category);
      const targetPath = path.join(CATEGORIES_DIR, safeFilename);

      if (checkOnly) {
        reportError(
          `Missing category definition: ${category} (${path.relative(rootDir, targetPath)})`
        );
        continue;
      }

      console.log(`[AutoSync] Creating missing category: ${category}`);
      await fs.writeFile(targetPath, JSON.stringify({ name: category }, null, 2));
      changes++;
    }
  }

  if (errors.length > 0 && strict) {
    throw new Error(`[ContentSync] Found ${errors.length} content consistency issue(s).`);
  }

  if (changes > 0) {
    console.log(`[AutoSync] Complete. Created ${changes} new definitions.`);
  }
}

export async function pruneContent(rootDir: string, dryRun = false): Promise<void> {
  const BLOG_DIR = path.resolve(rootDir, 'src/content/blog');
  const TAGS_DIR = path.resolve(rootDir, 'src/content/tags');
  const CATEGORIES_DIR = path.resolve(rootDir, 'src/content/categories');

  const reportError = (message: string) => logScopedError('ContentCleanup', message);

  async function getMdxFiles(dir: string): Promise<string[]> {
    try {
      const dirents = await fs.readdir(dir, { withFileTypes: true });
      return dirents
        .filter((dirent) => dirent.isFile() && dirent.name.endsWith('.mdx'))
        .map((dirent) => path.join(dir, dirent.name));
    } catch (e) {
      reportError(`Error reading blog directory ${dir}: ${formatError(e)}`);
      return [];
    }
  }

  async function getJsonFiles(dir: string): Promise<string[]> {
    try {
      // Only process directories if they exist
      try {
        await fs.access(dir);
      } catch {
        return [];
      }
      const dirents = await fs.readdir(dir, { withFileTypes: true });
      return dirents
        .filter((dirent) => dirent.isFile() && dirent.name.endsWith('.json'))
        .map((dirent) => dirent.name);
    } catch (e) {
      reportError(`Error reading definition directory ${dir}: ${formatError(e)}`);
      return [];
    }
  }

  console.log('[ContentCleanup] Scanning usage...');

  const blogFiles = await getMdxFiles(BLOG_DIR);
  const usedTags = new Set<string>();
  const usedCategories = new Set<string>();

  for (const file of blogFiles) {
    let content = '';

    try {
      content = await fs.readFile(file, 'utf-8');
    } catch (e) {
      reportError(`Error reading blog file ${file}: ${formatError(e)}`);
      continue;
    }

    const { tags, categories } = extractTagsAndCategories(content, file, reportError);
    tags.forEach((t) => usedTags.add(t));
    categories.forEach((c) => usedCategories.add(c));
  }

  // Create lowercase sets for case-insensitive comparison
  const usedTagsLower = new Set([...usedTags].map((t) => t.toLowerCase()));
  const usedCategoriesLower = new Set([...usedCategories].map((c) => c.toLowerCase()));

  // Check Tags
  const definedTagFiles = await getJsonFiles(TAGS_DIR);
  for (const file of definedTagFiles) {
    try {
      const filePath = path.join(TAGS_DIR, file);
      const content = JSON.parse(await fs.readFile(filePath, 'utf-8')) as { name?: string };
      const tagName = content.name;

      if (!tagName) continue;

      // Check both exact match and case-insensitive match
      const isUsed = usedTags.has(tagName) || usedTagsLower.has(tagName.toLowerCase());

      if (!isUsed) {
        if (dryRun) {
          console.log(`[DryRun] Would delete unused tag: ${tagName} (${file})`);
        } else {
          console.log(`[ContentCleanup] Deleting unused tag: ${tagName} (${file})`);
          await fs.unlink(filePath);
        }
      }
    } catch (e) {
      reportError(`Error processing tag file ${file}: ${formatError(e)}`);
    }
  }

  // Check Categories
  const definedCategoryFiles = await getJsonFiles(CATEGORIES_DIR);
  for (const file of definedCategoryFiles) {
    try {
      const filePath = path.join(CATEGORIES_DIR, file);
      const content = JSON.parse(await fs.readFile(filePath, 'utf-8')) as { name?: string };
      const catName = content.name;

      if (!catName) continue;

      // Check both exact match and case-insensitive match
      const isUsed = usedCategories.has(catName) || usedCategoriesLower.has(catName.toLowerCase());

      if (!isUsed) {
        if (dryRun) {
          console.log(`[DryRun] Would delete unused category: ${catName} (${file})`);
        } else {
          console.log(`[ContentCleanup] Deleting unused category: ${catName} (${file})`);
          await fs.unlink(filePath);
        }
      }
    } catch (e) {
      reportError(`Error processing category file ${file}: ${formatError(e)}`);
    }
  }

  console.log('[ContentCleanup] Cleanup complete.');
}
