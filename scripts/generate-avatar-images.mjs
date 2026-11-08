import { createHash } from 'node:crypto';
import { readFile, readdir, mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';
import { parse } from 'yaml';

const outputDirectory = 'public/images/generated/avatars';
const manifestFile = 'src/generated/avatar-images.json';
const widths = [48, 96, 192, 256, 512];

async function writeIfChanged(file, bytes) {
  try {
    if ((await readFile(file)).equals(Buffer.from(bytes))) return false;
  } catch (error) {
    if (error.code !== 'ENOENT') throw error;
  }
  await mkdir(path.dirname(file), { recursive: true });
  await writeFile(file, bytes);
  return true;
}

/** Derive CMS-uploaded local avatars before dev/build; identical images share one URL set. */
export async function generateAvatarImages(root = process.cwd()) {
  const sources = new Set();
  const about = await readFile(path.join(root, 'src/content/pages/about.mdx'), 'utf8');
  const frontmatter = about.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  if (frontmatter) sources.add(parse(frontmatter[1])?.avatar);

  const friendsDirectory = path.join(root, 'src/content/friends');
  for (const file of (await readdir(friendsDirectory)).filter((file) => file.endsWith('.json'))) {
    const friend = JSON.parse(await readFile(path.join(friendsDirectory, file), 'utf8'));
    sources.add(friend.avatar || friend.avatarUrl);
  }

  const manifest = {};
  const generated = new Map();
  const publicRoot = path.resolve(root, 'public');
  let written = 0;
  for (const source of [...sources].filter((source) => typeof source === 'string').sort()) {
    if (!source.startsWith('/') || source.startsWith('//')) continue;
    const sourcePath = path.resolve(publicRoot, `.${decodeURIComponent(source.split(/[?#]/)[0])}`);
    if (!sourcePath.startsWith(`${publicRoot}${path.sep}`)) {
      throw new Error(`Avatar path is outside public: ${source}`);
    }
    const original = await readFile(sourcePath);
    const hash = createHash('sha256').update(original).digest('hex').slice(0, 16);
    if (!generated.has(hash)) {
      const metadata = await sharp(original).metadata();
      const rotated = (metadata.orientation ?? 1) >= 5;
      const sourceWidth = rotated ? metadata.height : metadata.width;
      const sourceHeight = rotated ? metadata.width : metadata.height;
      if (!sourceWidth || !sourceHeight)
        throw new Error(`Cannot read avatar dimensions: ${source}`);
      const sizes = [...new Set(widths.map((width) => Math.min(width, sourceWidth)))];
      const variants = { width: sourceWidth, height: sourceHeight, avif: [], webp: [], jpeg: [] };

      for (const width of sizes) {
        for (const format of ['avif', 'webp', 'jpeg']) {
          const extension = format === 'jpeg' ? 'jpg' : format;
          const filename = `${hash}-${width}.${extension}`;
          const bytes = await sharp(original)
            .rotate()
            .resize({ width, withoutEnlargement: true })
            .toFormat(format, { quality: format === 'avif' ? 50 : 80 })
            .toBuffer();
          if (await writeIfChanged(path.join(root, outputDirectory, filename), bytes)) written++;
          variants[format].push({ src: `/images/generated/avatars/${filename}`, width });
        }
      }
      generated.set(hash, variants);
    }
    manifest[source] = generated.get(hash);
  }
  if (await writeIfChanged(path.join(root, manifestFile), `${JSON.stringify(manifest, null, 2)}\n`))
    written++;
  return { sources: Object.keys(manifest).length, uniqueImages: generated.size, written };
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const result = await generateAvatarImages();
  console.log(
    `[avatars] ${result.sources} sources, ${result.uniqueImages} unique images, ${result.written} files updated.`
  );
}
