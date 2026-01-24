
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const blogDir = path.resolve(__dirname, '../src/content/blog');
const categoriesDir = path.resolve(__dirname, '../src/content/categories');
const tagsDir = path.resolve(__dirname, '../src/content/tags');

// Helper to slugify
function slugify(text) {
    return text.toString().toLowerCase()
        .replace(/\s+/g, '-')           // Replace spaces with -
        .replace(/[^\w\-\u4e00-\u9fa5]+/g, '')       // Remove all non-word chars (allow chinese)
        .replace(/\-\-+/g, '-')         // Replace multiple - with single -
        .replace(/^-+/, '')             // Trim - from start of text
        .replace(/-+$/, '');            // Trim - from end of text
}

// Ensure directories exist
if (!fs.existsSync(categoriesDir)) fs.mkdirSync(categoriesDir, { recursive: true });
if (!fs.existsSync(tagsDir)) fs.mkdirSync(tagsDir, { recursive: true });

// Get existing slugs
const categorySlugs = new Set(fs.readdirSync(categoriesDir)
    .filter(f => f.endsWith('.json'))
    .map(f => f.replace('.json', '')));

const tagSlugs = new Set(fs.readdirSync(tagsDir)
    .filter(f => f.endsWith('.json'))
    .map(f => f.replace('.json', '')));

const blogFiles = fs.readdirSync(blogDir).filter(f => f.endsWith('.mdx') || f.endsWith('.md'));

blogFiles.forEach(file => {
    const filePath = path.join(blogDir, file);
    let content = fs.readFileSync(filePath, 'utf-8');
    const fmMatch = content.match(/^---\r?\n([\s\S]*?)\r?\n---/);
    if (!fmMatch) return;

    let frontmatter = fmMatch[1];
    let newFrontmatter = frontmatter;
    let modified = false;

    // 1. Fix Category
    // Look for object structure:
    /*
    category:
      discriminant: ...
      value: "Value"
    */
    // Or just "category: Value" if it wasn't migrated?
    // We want to extract "Value", ensure it exists in categories, and replace with "category: slug"

    // We can regex for the value line inside a category block
    const categoryBlockRegex = /category:\s*\r?\n\s+discriminant:\s*\w+\s*\r?\n\s+value:\s*(.+)/;
    const catMatch = frontmatter.match(categoryBlockRegex);

    if (catMatch) {
        const rawVal = catMatch[1].trim();
        const name = rawVal.replace(/^['"]|['"]$/g, '');
        const slug = slugify(name);

        // Create if missing
        if (!categorySlugs.has(slug)) {
            const newCatFile = path.join(categoriesDir, `${slug}.json`);
            fs.writeFileSync(newCatFile, JSON.stringify({ name: name }, null, 2));
            categorySlugs.add(slug);
            console.log(`Created Category: ${name} (${slug})`);
        }

        // Replace usage
        newFrontmatter = newFrontmatter.replace(catMatch[0], `category: ${slug}`);
        modified = true;
    }
    // Handle the case where I might have messed up and it's already a string but we want to ensure it's a slug? 
    // Assuming previously migrated files are currently objects. 
    // If files were NOT migrated (no discriminant), they are Strings.
    // If they are strings, they might be Names not Slugs?
    // My previous script checked `mode`. 
    // Let's assume if it is a single line `category: Val`, Val is likely a Name or Slug.
    // We should ensure it matches a slug.
    else {
        const simpleCatRegex = /^category:\s*(.+)$/m;
        const simpleMatch = frontmatter.match(simpleCatRegex);
        if (simpleMatch) {
            const rawVal = simpleMatch[1].trim();
            if (!rawVal.includes('discriminant')) {
                const name = rawVal.replace(/^['"]|['"]$/g, '');
                // If it's not a known slug, treat as name and slugify
                if (!categorySlugs.has(name)) {
                    const slug = slugify(name);
                    // If strict slug not found, create it?
                    // Wait, if it was "Project Dev", slug is "project-dev".
                    // If we change frontmatter to "project-dev", it's safer.
                    if (!categorySlugs.has(slug)) {
                        const newCatFile = path.join(categoriesDir, `${slug}.json`);
                        fs.writeFileSync(newCatFile, JSON.stringify({ name: name }, null, 2));
                        categorySlugs.add(slug);
                        console.log(`Created Category from String: ${name} (${slug})`);
                    }
                    const replacement = `category: ${slug}`;
                    if (replacement !== simpleMatch[0]) {
                        newFrontmatter = newFrontmatter.replace(simpleMatch[0], replacement);
                        modified = true;
                    }
                }
            }
        }
    }


    // 2. Fix Tags
    // Look for lists with discriminant
    /*
    tags:
      - discriminant: ...
        value: Val
    */
    // We want to flatten to:
    /*
    tags:
      - slug1
      - slug2
    */

    const tagsBlockRegex = /^tags:\s*\r?\n((?:\s+-\s+.+\r?\n?)+)/m;
    const tagsMatch = frontmatter.match(tagsBlockRegex);

    if (tagsMatch) {
        const fullBlock = tagsMatch[0];
        // Check if it has objects
        if (fullBlock.includes('discriminant:')) {
            const listContent = tagsMatch[1];
            // Split by "- discriminant" to find blocks?
            // Regex for values: `value: (.+)`
            const valueRegex = /value:\s*(.+)/g;
            let match;
            const newTags = [];

            while ((match = valueRegex.exec(listContent)) !== null) {
                const name = match[1].trim().replace(/^['"]|['"]$/g, '');
                const slug = slugify(name);

                if (!tagSlugs.has(slug)) {
                    const newTagFile = path.join(tagsDir, `${slug}.json`);
                    fs.writeFileSync(newTagFile, JSON.stringify({ name: name }, null, 2));
                    tagSlugs.add(slug);
                    console.log(`Created Tag: ${name} (${slug})`);
                }
                newTags.push(slug);
            }

            const newTagsBlock = `tags:\n${newTags.map(t => `  - ${t}`).join('\n')}`;
            newFrontmatter = newFrontmatter.replace(fullBlock, newTagsBlock);
            modified = true;
        }
    }

    if (modified) {
        const newContent = content.replace(fmMatch[1], newFrontmatter);
        fs.writeFileSync(filePath, newContent, 'utf-8');
        console.log(`Fixed ${file}`);
    }
});
