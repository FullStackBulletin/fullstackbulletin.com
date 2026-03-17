/**
 * Prebuild script: copies deduplicated images from images/ to public/archive-images/
 * so they can be served as static files.
 *
 * Usage: node copy-archive-images.mjs
 */
import { readdirSync, existsSync, mkdirSync, copyFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const IMAGES_DIR = join(__dirname, '..', 'images');
const OUTPUT_DIR = join(__dirname, '..', 'public', 'archive-images');

if (!existsSync(OUTPUT_DIR)) mkdirSync(OUTPUT_DIR, { recursive: true });

const files = readdirSync(IMAGES_DIR);
let copied = 0;
let skipped = 0;

for (const file of files) {
  const src = join(IMAGES_DIR, file);
  const dest = join(OUTPUT_DIR, file);
  if (existsSync(dest)) {
    skipped++;
    continue;
  }
  copyFileSync(src, dest);
  copied++;
}

console.log(`Copied ${copied} images, skipped ${skipped} (already exist)`);
