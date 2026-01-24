import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const blogDir = path.resolve(__dirname, '../src/content/blog');
const categoriesDir = path.resolve(__dirname, '../src/content/categories');
const tagsDir = path.resolve(__dirname, '../src/content/tags');

// Get existing categories and tags (filenames without extension)
// Keystatic relationship stores the slug (filename)
const categories = fs.readdirSync(categoriesDir)
    .filter(f => f.endsWith('.json'))
    .map(f => f.replace('.json', ''));

const tags = fs.readdirSync(tagsDir)
    .filter(f => f.endsWith('.json'))
    .map(f => f.replace('.json', ''));

console.log('Valid Categories:', categories);
console.log('Valid Tags:', tags);

const blogFiles = fs.readdirSync(blogDir).filter(f => f.endsWith('.mdx') || f.endsWith('.md'));

blogFiles.forEach(file => {
    const filePath = path.join(blogDir, file);
    let content = fs.readFileSync(filePath, 'utf-8');

    // Parse Frontmatter (Simple Regex)
    // Assuming frontmatter is bounded by ---
    const fmMatch = content.match(/^---\r?\n([\s\S]*?)\r?\n---/);
    if (!fmMatch) {
        console.log(`Skipping ${file}: No frontmatter found`);
        return;
    }

    let frontmatter = fmMatch[1];
    let newFrontmatter = frontmatter;
    let modified = false;

    // Migrate Category
    // Search for: category: "value" or category: value
    // We need to match the line.
    const categoryRegex = /^category:\s*(.+)$/m;
    const catMatch = frontmatter.match(categoryRegex);
    if (catMatch) {
        const rawValue = catMatch[1].trim();
        // Remove quotes if present
        const value = rawValue.replace(/^['"]|['"]$/g, '');

        // Check if it's already an object (starts with formatting) - simple check
        // If it strictly matches text, we migrate.
        // We replace the single line with the object syntax.

        // Determine mode
        const mode = categories.includes(value) ? 'existing' : 'custom';

        const newBlock = `category:
  discriminant: ${mode}
  value: ${value}`;

        // Only replace if it doesn't look like it's already migrated (check for discriminant)
        if (!frontmatter.includes(`discriminant: ${mode}`) || !frontmatter.includes(`value: ${value}`)) {
            newFrontmatter = newFrontmatter.replace(catMatch[0], newBlock);
            modified = true;
        }
    }

    // Migrate Tags
    // Tags are usually a list.
    /*
    tags:
      - tag1
      - tag2
    */
    // We need to parse valid YAML list items. 
    // This regex approach is brittle for lists. 
    // However, given the file count (3), maybe manually reading/writing is safer or we use a smarter replacement.

    // Let's use a robust replacement for tags list. 
    // We look for "tags:" and then subsequent lines starting with "- "
    const tagsBlockRegex = /^tags:\s*\r?\n((?:\s+-\s+.+\r?\n?)+)/m;
    const tagsMatch = frontmatter.match(tagsBlockRegex);

    if (tagsMatch) {
        const fullBlock = tagsMatch[0];
        const listContent = tagsMatch[1];

        const validLines = listContent.split(/\r?\n/).filter(l => l.trim().startsWith('-'));
        const newTagsLines = validLines.map(line => {
            const rawVal = line.replace(/^\s+-\s+/, '').trim();
            const val = rawVal.replace(/^['"]|['"]$/g, '');
            const mode = tags.includes(val) ? 'existing' : 'custom';

            // Keystatic array item object format in YAML
            return `  - discriminant: ${mode}
    value: ${val}`;
        });

        const newTagsBlock = `tags:\n${newTagsLines.join('\n')}`;
        // Verify we aren't double migrating?
        if (!fullBlock.includes('discriminant:')) {
            newFrontmatter = newFrontmatter.replace(fullBlock, newTagsBlock);
            modified = true;
        }
    }

    if (modified) {
        const newContent = content.replace(fmMatch[1], newFrontmatter);
        fs.writeFileSync(filePath, newContent, 'utf-8');
        console.log(`Migrated ${file}`);
    } else {
        console.log(`No changes needed for ${file}`);
    }
});
