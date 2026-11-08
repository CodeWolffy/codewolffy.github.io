import { syncContent } from '../src/utils/content-sync.ts';
import { generatePostOptions } from './generate-post-options.mjs';
import { generateAvatarImages } from './generate-avatar-images.mjs';
import { projectRoot } from './lib/commands.mjs';

await syncContent(projectRoot);
await generatePostOptions(projectRoot);
await generateAvatarImages(projectRoot);
