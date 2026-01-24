
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const blogDir = path.resolve(__dirname, '../src/content/blog');

const blogFiles = fs.readdirSync(blogDir).filter(f => f.endsWith('.mdx') || f.endsWith('.md'));

blogFiles.forEach(file => {
    const filePath = path.join(blogDir, file);
    let content = fs.readFileSync(filePath, 'utf-8');
    const fmMatch = content.match(/^---\r?\n([\s\S]*?)\r?\n---/);
    if (!fmMatch) return;

    let frontmatter = fmMatch[1];
    let newFrontmatter = frontmatter;
    let modified = false;

    // 1. Fix Category: String -> Object
    // Match `category: slug`
    const simpleCatRegex = /^category:\s*([^\r\n{]+)$/m;
    const catMatch = frontmatter.match(simpleCatRegex);

    if (catMatch) {
        const slug = catMatch[1].trim();
        // Skip if it looks like an object start (though regex above excludes {)
        // Convert to:
        // category:
        //   discriminant: existing
        //   value: slug
        const newBlock = `category:\n  discriminant: existing\n  value: ${slug}`;
        newFrontmatter = newFrontmatter.replace(catMatch[0], newBlock);
        modified = true;
    }

    // 2. Fix Tags: List of Strings -> List of Objects
    // Match tags block
    const tagsBlockRegex = /^tags:\s*\r?\n((?:\s+-\s+[^\r\n]+\r?\n?)+)/m;
    const tagsMatch = frontmatter.match(tagsBlockRegex);

    if (tagsMatch) {
        const fullBlock = tagsMatch[0];
        const listContent = tagsMatch[1];
        // Check if it's already objects (contains discriminant)
        if (!fullBlock.includes('discriminant:')) {
            const lines = listContent.split(/\r?\n/).filter(l => l.trim().startsWith('-'));
            const newItems = lines.map(line => {
                const val = line.trim().replace(/^-\s+/, '').trim();
                return `  - discriminant: existing\n    value: ${val}`;
            });
            const newTagsBlock = `tags:\n${newItems.join('\n')}`;
            newFrontmatter = newFrontmatter.replace(fullBlock, newTagsBlock);
            modified = true;
        }
    }

    if (modified) {
        const newContent = content.replace(fmMatch[1], newFrontmatter);
        fs.writeFileSync(filePath, newContent, 'utf-8');
        console.log(`Migrated ${file} to Hybrid format`);
    }
});
