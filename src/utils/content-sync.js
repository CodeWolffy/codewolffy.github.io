
import fs from 'fs/promises';
import path from 'path';

export async function syncContent(rootDir) {
    const BLOG_DIR = path.resolve(rootDir, 'src/content/blog');
    const TAGS_DIR = path.resolve(rootDir, 'src/content/tags');
    const CATEGORIES_DIR = path.resolve(rootDir, 'src/content/categories');

    // Ensure directories exist
    await fs.mkdir(TAGS_DIR, { recursive: true });
    await fs.mkdir(CATEGORIES_DIR, { recursive: true });

    async function getFiles(dir) {
        try {
            const dirents = await fs.readdir(dir, { withFileTypes: true });
            return dirents
                .filter(dirent => dirent.isFile() && dirent.name.endsWith('.mdx'))
                .map(dirent => path.join(dir, dirent.name));
        } catch (e) {
            console.error(`Error reading directory ${dir}:`, e);
            return [];
        }
    }

    async function readFileContent(filePath) {
        return await fs.readFile(filePath, 'utf-8');
    }

    function parseFrontmatter(content) {
        const match = content.match(/^---\n([\s\S]*?)\n---/);
        if (!match) return null;
        return match[1];
    }

    function extractTagsAndCategories(frontmatter) {
        const tags = new Set();
        const categories = new Set();

        if (!frontmatter) return { tags, categories };

        const lines = frontmatter.split('\n');
        let currentKey = null;
        let inList = false;

        for (let i = 0; i < lines.length; i++) {
            const line = lines[i];
            const trimmed = line.trim();

            if (!trimmed || trimmed.startsWith('#')) continue;

            // Detect Key
            const keyMatch = line.match(/^([a-zA-Z0-9_]+):/);
            if (keyMatch) {
                currentKey = keyMatch[1];
                inList = false;
            }

            const cleanValue = (val) => {
                if (!val) return '';
                return val.trim().replace(/^['"]|['"]$/g, '');
            };

            if (currentKey === 'tags') {
                if (trimmed.startsWith('- ')) {
                    inList = true;
                    const valuePart = trimmed.substring(2).trim();

                    if (!valuePart.startsWith('discriminant:') && !valuePart.includes(':')) {
                        const val = cleanValue(valuePart);
                        if (val && val !== 'discriminant' && val !== 'value') tags.add(val);
                    }
                    else if (valuePart.startsWith('value:')) {
                        const val = cleanValue(valuePart.substring(6));
                        if (val) tags.add(val);
                    }
                } else if (inList) {
                    if (trimmed.startsWith('value:')) {
                        const val = cleanValue(trimmed.substring(6));
                        if (val) tags.add(val);
                    }
                }
            } else if (currentKey === 'category') {
                if (trimmed.startsWith('value:')) {
                    const val = cleanValue(trimmed.substring(6));
                    if (val) categories.add(val);
                }
            }
        }

        return { tags, categories };
    }

    console.log('[AutoSync] Scanning content...');

    const blogFiles = await getFiles(BLOG_DIR);
    const allTags = new Set();
    const allCategories = new Set();

    for (const file of blogFiles) {
        const content = await readFileContent(file);
        const frontmatter = parseFrontmatter(content);
        const { tags, categories } = extractTagsAndCategories(frontmatter);

        tags.forEach(t => allTags.add(t));
        categories.forEach(c => allCategories.add(c));
    }

    // Helper to check existing files with robust case handling
    const existsInDir = async (dir, tagName) => {
        try {
            const files = await fs.readdir(dir);
            for (const file of files) {
                if (!file.endsWith('.json')) continue;
                try {
                    const filePath = path.join(dir, file);
                    const content = JSON.parse(await fs.readFile(filePath, 'utf-8'));

                    // 1. Check if the 'name' field matches exactly (Case Sensitive verification)
                    if (content.name === tagName) return true;

                    // 2. Check if the filename matches the sanitized tag name (Case Insensitive collision check)
                    // If we have 'Tag' but 'tag.json' exists, we consider it "found" to avoid overwriting/duplicating
                    // This relies on the assumption that we don't want 'Tag' and 'tag' to coexist as separate files on Windows
                    const safeTagName = tagName.replace(/[\\/:*?"<>|]/g, '_');
                    const fileBase = file.replace('.json', '');

                    if (fileBase.toLowerCase() === safeTagName.toLowerCase()) {
                        // Collision or Case-diff found. 
                        // We return true to say "it basically exists, don't create a new one".
                        // This implies we prefer the existing definition over the new variation.
                        return true;
                    }

                } catch (e) { }
            }
        } catch (e) { console.error(e); }
        return false;
    };

    let changes = 0;

    // Sync Tags
    for (const tag of allTags) {
        if (!await existsInDir(TAGS_DIR, tag)) {
            console.log(`[AutoSync] Creating missing tag: ${tag}`);
            const safeFilename = tag.replace(/[\\/:*?"<>|]/g, '_') + '.json';
            await fs.writeFile(path.join(TAGS_DIR, safeFilename), JSON.stringify({ name: tag }, null, 2));
            changes++;
        }
    }

    // Sync Categories
    for (const category of allCategories) {
        if (!await existsInDir(CATEGORIES_DIR, category)) {
            console.log(`[AutoSync] Creating missing category: ${category}`);
            const safeFilename = category.replace(/[\\/:*?"<>|]/g, '_') + '.json';
            await fs.writeFile(path.join(CATEGORIES_DIR, safeFilename), JSON.stringify({ name: category }, null, 2));
            changes++;
        }
    }

    if (changes > 0) {
        console.log(`[AutoSync] Complete. Created ${changes} new definitions.`);
    }
}

/**
 * @param {string} rootDir
 * @param {boolean} [dryRun=false]
 */
export async function pruneContent(rootDir, dryRun = false) {
    const BLOG_DIR = path.resolve(rootDir, 'src/content/blog');
    const TAGS_DIR = path.resolve(rootDir, 'src/content/tags');
    const CATEGORIES_DIR = path.resolve(rootDir, 'src/content/categories');

    /**
     * @param {string} dir
     */
    async function getMdxFiles(dir) {
        try {
            const dirents = await fs.readdir(dir, { withFileTypes: true });
            return dirents
                .filter(dirent => dirent.isFile() && dirent.name.endsWith('.mdx'))
                .map(dirent => path.join(dir, dirent.name));
        } catch (e) {
            console.error(`Error reading blog directory ${dir}:`, e);
            return [];
        }
    }

    /**
     * @param {string} dir
     */
    async function getJsonFiles(dir) {
        try {
            // Only process directories if they exist
            try {
                await fs.access(dir);
            } catch {
                return [];
            }
            const dirents = await fs.readdir(dir, { withFileTypes: true });
            return dirents
                .filter(dirent => dirent.isFile() && dirent.name.endsWith('.json'))
                .map(dirent => dirent.name);
        } catch (e) {
            console.error(`Error reading definition directory ${dir}:`, e);
            return [];
        }
    }

    /**
     * @param {string} filePath
     */
    async function readFileContent(filePath) {
        return await fs.readFile(filePath, 'utf-8');
    }

    /**
     * @param {string} content
     */
    function parseFrontmatter(content) {
        const match = content.match(/^---\n([\s\S]*?)\n---/);
        if (!match) return null;
        return match[1];
    }

    /**
     * @param {string} frontmatter
     */
    function extractTagsAndCategories(frontmatter) {
        /** @type {Set<string>} */
        const tags = new Set();
        /** @type {Set<string>} */
        const categories = new Set();

        if (!frontmatter) return { tags, categories };

        const lines = frontmatter.split('\n');
        let currentKey = null;
        let inList = false;

        for (let i = 0; i < lines.length; i++) {
            const line = lines[i];
            const trimmed = line.trim();

            if (!trimmed || trimmed.startsWith('#')) continue;

            const keyMatch = line.match(/^([a-zA-Z0-9_]+):/);
            if (keyMatch) {
                currentKey = keyMatch[1];
                inList = false;
            }

            // @ts-ignore
            const cleanValue = (val) => {
                if (!val) return '';
                return val.trim().replace(/^['"]|['"]$/g, '');
            };

            if (currentKey === 'tags') {
                if (trimmed.startsWith('- ')) {
                    inList = true;
                    const valuePart = trimmed.substring(2).trim();
                    if (!valuePart.startsWith('discriminant:') && !valuePart.includes(':')) {
                        const val = cleanValue(valuePart);
                        if (val && val !== 'discriminant' && val !== 'value') tags.add(val);
                    }
                    else if (valuePart.startsWith('value:')) {
                        const val = cleanValue(valuePart.substring(6));
                        if (val) tags.add(val);
                    }
                } else if (inList) {
                    if (trimmed.startsWith('value:')) {
                        const val = cleanValue(trimmed.substring(6));
                        if (val) tags.add(val);
                    }
                }
            } else if (currentKey === 'category') {
                if (trimmed.startsWith('value:')) {
                    const val = cleanValue(trimmed.substring(6));
                    if (val) categories.add(val);
                }
            }
        }
        return { tags, categories };
    }

    console.log('[ContentCleanup] Scanning usage...');

    const blogFiles = await getMdxFiles(BLOG_DIR);
    /** @type {Set<string>} */
    const usedTags = new Set();
    /** @type {Set<string>} */
    const usedCategories = new Set();

    for (const file of blogFiles) {
        const content = await readFileContent(file);
        const frontmatter = parseFrontmatter(content);
        if (frontmatter) {
            const { tags, categories } = extractTagsAndCategories(frontmatter);
            tags.forEach(t => usedTags.add(t));
            categories.forEach(c => usedCategories.add(c));
        }
    }

    // Check Tags
    const definedTagFiles = await getJsonFiles(TAGS_DIR);
    for (const file of definedTagFiles) {
        try {
            const filePath = path.join(TAGS_DIR, file);
            const content = JSON.parse(await fs.readFile(filePath, 'utf-8'));
            const tagName = content.name;

            if (!usedTags.has(tagName)) {
                if (dryRun) {
                    console.log(`[DryRun] Would delete unused tag: ${tagName} (${file})`);
                } else {
                    console.log(`[ContentCleanup] Deleting unused tag: ${tagName} (${file})`);
                    await fs.unlink(filePath);
                }
            }
        } catch (e) {
            console.error(`Error processing tag file ${file}:`, e);
        }
    }

    // Check Categories
    const definedCategoryFiles = await getJsonFiles(CATEGORIES_DIR);
    for (const file of definedCategoryFiles) {
        try {
            const filePath = path.join(CATEGORIES_DIR, file);
            const content = JSON.parse(await fs.readFile(filePath, 'utf-8'));
            const catName = content.name;

            if (!usedCategories.has(catName)) {
                if (dryRun) {
                    console.log(`[DryRun] Would delete unused category: ${catName} (${file})`);
                } else {
                    console.log(`[ContentCleanup] Deleting unused category: ${catName} (${file})`);
                    await fs.unlink(filePath);
                }
            }
        } catch (e) {
            console.error(`Error processing category file ${file}:`, e);
        }
    }

    console.log('[ContentCleanup] Cleanup complete.');
}
