#!/usr/bin/env node

/**
 * Deduplicates images referenced in raw_archives metadata.json files.
 *
 * 1. Scans all metadata.json for local image refs (./filename in links[].imageUrl and book.coverImageUrl)
 * 2. Computes SHA-256 hash for each referenced image, copies unique ones to images/<sha256>.<ext>
 * 3. Updates metadata.json to reference the new hash-based filenames
 * 4. Deletes original.html and unreferenced images from each issue folder
 * 5. Deletes raw_archives/issue-urls.txt
 *
 * Usage: node scripts/deduplicate-images.mjs [--dry-run]
 */

import { createHash } from 'node:crypto';
import {
  readFileSync,
  writeFileSync,
  readdirSync,
  statSync,
  existsSync,
  mkdirSync,
  copyFileSync,
  unlinkSync,
} from 'node:fs';
import { join, extname } from 'node:path';

const ARCHIVES_DIR = join(import.meta.dirname, '..', 'raw_archives');
const IMAGES_DIR = join(import.meta.dirname, '..', 'public', 'archive-images');
const DRY_RUN = process.argv.includes('--dry-run');

if (DRY_RUN) console.log('=== DRY RUN MODE ===\n');

// Step 1: Collect all referenced images from metadata.json files
const referencedByIssue = new Map(); // issueDir -> Set<filename>
const allRefs = []; // { issueDir, field, index, filename }

const issueDirs = readdirSync(ARCHIVES_DIR).filter((d) => {
  const p = join(ARCHIVES_DIR, d);
  return statSync(p).isDirectory();
});

for (const dir of issueDirs) {
  const metaPath = join(ARCHIVES_DIR, dir, 'metadata.json');
  if (!existsSync(metaPath)) continue;

  const meta = JSON.parse(readFileSync(metaPath, 'utf-8'));
  const refs = new Set();

  if (meta.links) {
    for (let i = 0; i < meta.links.length; i++) {
      const img = meta.links[i].imageUrl;
      if (img && img.startsWith('./')) {
        const filename = img.slice(2);
        refs.add(filename);
        allRefs.push({ issueDir: dir, field: 'links', index: i, filename });
      }
    }
  }

  if (meta.book && meta.book.coverImageUrl && meta.book.coverImageUrl.startsWith('./')) {
    const filename = meta.book.coverImageUrl.slice(2);
    refs.add(filename);
    allRefs.push({ issueDir: dir, field: 'book', index: null, filename });
  }

  referencedByIssue.set(dir, refs);
}

console.log(`Found ${allRefs.length} referenced images across ${referencedByIssue.size} issues`);

// Step 2: Hash each referenced image and build dedup map
const hashMap = new Map(); // hash.ext -> first source path
const fileToHash = new Map(); // "issueDir/filename" -> "hash.ext"
let uniqueCount = 0;
let dupCount = 0;

for (const ref of allRefs) {
  const key = `${ref.issueDir}/${ref.filename}`;
  if (fileToHash.has(key)) continue; // already processed this exact file

  const filePath = join(ARCHIVES_DIR, ref.issueDir, ref.filename);
  if (!existsSync(filePath)) {
    console.warn(`WARNING: Referenced image not found: ${filePath}`);
    continue;
  }

  const content = readFileSync(filePath);
  const hash = createHash('sha256').update(content).digest('hex');
  const ext = extname(ref.filename).toLowerCase();
  const hashName = `${hash}${ext}`;

  fileToHash.set(key, hashName);

  if (!hashMap.has(hashName)) {
    hashMap.set(hashName, filePath);
    uniqueCount++;
  } else {
    dupCount++;
  }
}

console.log(`Unique images: ${uniqueCount}, duplicates: ${dupCount}`);

// Step 3: Copy unique images to images/ directory
if (!DRY_RUN) {
  if (!existsSync(IMAGES_DIR)) mkdirSync(IMAGES_DIR, { recursive: true });
}

let copiedCount = 0;
for (const [hashName, sourcePath] of hashMap) {
  const destPath = join(IMAGES_DIR, hashName);
  if (!DRY_RUN) {
    if (!existsSync(destPath)) {
      copyFileSync(sourcePath, destPath);
      copiedCount++;
    }
  } else {
    copiedCount++;
  }
}
console.log(`Copied ${copiedCount} unique images to public/archive-images/`);

// Step 4: Update metadata.json files
let metaUpdated = 0;
for (const dir of issueDirs) {
  const metaPath = join(ARCHIVES_DIR, dir, 'metadata.json');
  if (!existsSync(metaPath)) continue;

  const raw = readFileSync(metaPath, 'utf-8');
  const meta = JSON.parse(raw);
  let changed = false;

  if (meta.links) {
    for (const link of meta.links) {
      if (link.imageUrl && link.imageUrl.startsWith('./')) {
        const filename = link.imageUrl.slice(2);
        const key = `${dir}/${filename}`;
        const hashName = fileToHash.get(key);
        if (hashName && link.imageUrl !== `./${hashName}`) {
          link.imageUrl = `./${hashName}`;
          changed = true;
        }
      }
    }
  }

  if (meta.book && meta.book.coverImageUrl && meta.book.coverImageUrl.startsWith('./')) {
    const filename = meta.book.coverImageUrl.slice(2);
    const key = `${dir}/${filename}`;
    const hashName = fileToHash.get(key);
    if (hashName && meta.book.coverImageUrl !== `./${hashName}`) {
      meta.book.coverImageUrl = `./${hashName}`;
      changed = true;
    }
  }

  if (changed) {
    if (!DRY_RUN) {
      writeFileSync(metaPath, JSON.stringify(meta, null, 2) + '\n');
    }
    metaUpdated++;
  }
}
console.log(`Updated ${metaUpdated} metadata.json files`);

// Step 5: Delete original.html and unreferenced images from each issue folder
const IMAGE_EXTENSIONS = new Set(['.png', '.jpg', '.jpeg', '.gif', '.webp', '.svg']);
let deletedFiles = 0;

for (const dir of issueDirs) {
  const dirPath = join(ARCHIVES_DIR, dir);
  const files = readdirSync(dirPath);
  const refs = referencedByIssue.get(dir) || new Set();

  // Build set of hash-named files that are now referenced
  const hashRefs = new Set();
  for (const origFilename of refs) {
    const key = `${dir}/${origFilename}`;
    const hashName = fileToHash.get(key);
    if (hashName) hashRefs.add(hashName);
  }

  for (const file of files) {
    if (file === 'metadata.json' || file === 'index.html') continue;

    let shouldDelete = false;

    if (file === 'original.html') {
      shouldDelete = true;
    } else if (IMAGE_EXTENSIONS.has(extname(file).toLowerCase())) {
      // Delete if not referenced (by original name or hash name)
      if (!refs.has(file) && !hashRefs.has(file)) {
        shouldDelete = true;
      }
    }

    if (shouldDelete) {
      if (!DRY_RUN) {
        unlinkSync(join(dirPath, file));
      }
      deletedFiles++;
    }
  }
}
console.log(`Deleted ${deletedFiles} unreferenced files`);

// Step 6: Delete issue-urls.txt
const issueUrlsPath = join(ARCHIVES_DIR, 'issue-urls.txt');
if (existsSync(issueUrlsPath)) {
  if (!DRY_RUN) {
    unlinkSync(issueUrlsPath);
  }
  console.log('Deleted issue-urls.txt');
}

console.log('\nDone!');
