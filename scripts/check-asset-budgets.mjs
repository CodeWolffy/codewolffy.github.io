import { readdirSync, statSync } from 'node:fs';
import { extname, join, relative, resolve } from 'node:path';

const imageRoot = resolve(process.cwd(), 'public/images');
const imageExtensions = new Set(['.avif', '.gif', '.jpeg', '.jpg', '.png', '.svg', '.webp']);
const maxImageBytes = 1_500_000;
const maxTotalImageBytes = 12_000_000;
const legacyMasterImages = new Set([
  'public/images/posts/java-static-method/coverImage.png',
  'public/images/posts/for-foreach/coverImage.png',
  'public/images/posts/dataschema/coverImage.png',
  'public/images/posts/best-8-mcp-servers-for-developers/coverImage.png',
]);

function collectImages(directory) {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const fullPath = join(directory, entry.name);
    if (entry.isDirectory()) return collectImages(fullPath);
    return imageExtensions.has(extname(entry.name).toLowerCase()) ? [fullPath] : [];
  });
}

const images = collectImages(imageRoot)
  .map((file) => ({
    file,
    bytes: statSync(file).size,
  }))
  .filter(
    ({ file }) => !legacyMasterImages.has(relative(process.cwd(), file).replaceAll('\\', '/'))
  );
const oversized = images.filter(({ bytes }) => bytes > maxImageBytes);
const totalBytes = images.reduce((sum, { bytes }) => sum + bytes, 0);

if (oversized.length > 0 || totalBytes > maxTotalImageBytes) {
  console.error('Image asset budget exceeded.');
  for (const { file, bytes } of oversized) {
    console.error(`- ${relative(process.cwd(), file)}: ${(bytes / 1024 / 1024).toFixed(2)} MiB`);
  }
  console.error(`Total images: ${(totalBytes / 1024 / 1024).toFixed(2)} MiB`);
  process.exit(1);
}

console.log(
  `Image asset budget passed: ${images.length} files, ${(totalBytes / 1024 / 1024).toFixed(2)} MiB total.`
);
