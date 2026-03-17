/**
 * Prebuild script: copies issue images from raw_archives to public/archive-images/
 * so they can be served as static files.
 *
 * Usage: node copy-archive-images.mjs
 */
import { readFileSync, readdirSync, statSync, existsSync, mkdirSync, copyFileSync } from 'node:fs';
import { join, extname } from 'node:path';

const ARCHIVES_DIR = join(import.meta.dirname, '..', 'raw_archives');
const OUTPUT_DIR = join(import.meta.dirname, 'public', 'archive-images');

const IMAGE_EXTENSIONS = new Set(['.png', '.jpg', '.jpeg', '.gif', '.webp', '.svg']);

const dirs = readdirSync(ARCHIVES_DIR).filter(d => {
  const fullPath = join(ARCHIVES_DIR, d);
  return statSync(fullPath).isDirectory();
});

let copied = 0;
let skipped = 0;

for (const dir of dirs) {
  const srcDir = join(ARCHIVES_DIR, dir);
  const files = readdirSync(srcDir);
  const images = files.filter(f => IMAGE_EXTENSIONS.has(extname(f).toLowerCase()));

  if (images.length === 0) continue;

  const destDir = join(OUTPUT_DIR, dir);
  if (!existsSync(destDir)) mkdirSync(destDir, { recursive: true });

  for (const img of images) {
    const src = join(srcDir, img);
    const dest = join(destDir, img);
    if (existsSync(dest)) {
      skipped++;
      continue;
    }
    copyFileSync(src, dest);
    copied++;
  }
}

console.log(`Copied ${copied} images, skipped ${skipped} (already exist)`);
