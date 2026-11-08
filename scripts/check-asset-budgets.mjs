import { existsSync, readdirSync, statSync } from 'node:fs';
import { extname, join, relative, resolve } from 'node:path';
import budgets from '../src/config/asset-budgets.json' with { type: 'json' };

const imageRoot = resolve(process.cwd(), 'public/images');
const imageExtensions = new Set(['.avif', '.gif', '.jpeg', '.jpg', '.png', '.svg', '.webp']);
const maxImageBytes = budgets.maxImageFileBytes;
const maxTotalImageBytes = budgets.maxTotalImageBytes;
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

const musicRoot = resolve(process.cwd(), 'public/music');
function collectAudio(directory) {
  if (!existsSync(directory)) return [];
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const file = join(directory, entry.name);
    if (entry.isDirectory()) return collectAudio(file);
    return /\.(mp3|m4a|ogg|wav|flac)$/i.test(entry.name) ? [file] : [];
  });
}
const audio = collectAudio(musicRoot).map((file) => ({ file, bytes: statSync(file).size }));
const oversizedAudio = audio.filter(({ bytes }) => bytes > budgets.maxAudioFileBytes);
const totalAudioBytes = audio.reduce((total, { bytes }) => total + bytes, 0);
if (oversizedAudio.length || totalAudioBytes > budgets.maxTotalAudioBytes) {
  console.error('Audio asset budget exceeded.');
  for (const { file, bytes } of oversizedAudio) {
    console.error(`- ${relative(process.cwd(), file)}: ${(bytes / 1024 / 1024).toFixed(2)} MiB`);
  }
  console.error(`Total audio: ${(totalAudioBytes / 1024 / 1024).toFixed(2)} MiB`);
  process.exit(1);
}
console.log(
  `Audio asset budget passed: ${audio.length} files, ${(totalAudioBytes / 1024 / 1024).toFixed(2)} MiB total.`
);
