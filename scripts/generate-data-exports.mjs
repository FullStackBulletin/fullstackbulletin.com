// Prebuild script: generates JSON (and Parquet) data exports from the archive.
// Reads all archive metadata.json files, merges them into a single JSON file
// at public/fullstackbulletin-archive.json, and optionally generates a Parquet export.
//
// Usage: node scripts/generate-data-exports.mjs
import { readdirSync, readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ARCHIVE_DIR = join(__dirname, '..', 'archive');
const OUTPUT_DIR = join(__dirname, '..', 'public');

if (!existsSync(OUTPUT_DIR)) mkdirSync(OUTPUT_DIR, { recursive: true });

// Read all metadata.json files
const issueDirs = readdirSync(ARCHIVE_DIR, { withFileTypes: true })
  .filter((d) => d.isDirectory())
  .map((d) => d.name);

const issues = [];

for (const dir of issueDirs) {
  const metadataPath = join(ARCHIVE_DIR, dir, 'metadata.json');
  if (!existsSync(metadataPath)) continue;

  try {
    const raw = readFileSync(metadataPath, 'utf-8');
    const data = JSON.parse(raw);
    issues.push(data);
  } catch {
    console.warn(`Warning: failed to parse ${metadataPath}, skipping`);
  }
}

// Sort by date descending
issues.sort((a, b) => (b.date || '').localeCompare(a.date || ''));

// Write JSON export
const jsonPath = join(OUTPUT_DIR, 'fullstackbulletin-archive.json');
writeFileSync(jsonPath, JSON.stringify(issues, null, 2));
console.log(`Generated ${jsonPath} (${issues.length} issues)`);

// Parquet export — optional, only if parquet-wasm is installed
try {
  const parquet = await import('parquet-wasm');

  // Flatten issues into a tabular format for Parquet
  const rows = [];
  for (const issue of issues) {
    for (const link of issue.links || []) {
      rows.push({
        issueNumber: issue.issueNumber,
        issueTitle: issue.title,
        issueDate: issue.date,
        linkTitle: link.title,
        linkUrl: link.url,
        linkDescription: link.description || '',
        linkFeatured: link.featured ? 1 : 0,
      });
    }
  }

  // Use Arrow + Parquet conversion
  const { tableFromArrays, tableToIPC } = await import('apache-arrow');
  const table = tableFromArrays({
    issueNumber: rows.map((r) => r.issueNumber),
    issueTitle: rows.map((r) => r.issueTitle),
    issueDate: rows.map((r) => r.issueDate),
    linkTitle: rows.map((r) => r.linkTitle),
    linkUrl: rows.map((r) => r.linkUrl),
    linkDescription: rows.map((r) => r.linkDescription),
    linkFeatured: rows.map((r) => r.linkFeatured),
  });

  const ipcBuffer = tableToIPC(table);
  const parquetBuffer = parquet.writeParquet(
    parquet.readIPCStream(ipcBuffer),
  );

  const parquetPath = join(OUTPUT_DIR, 'fullstackbulletin-archive.parquet');
  writeFileSync(parquetPath, parquetBuffer);
  console.log(`Generated ${parquetPath}`);
} catch {
  console.log(
    'Parquet export skipped (parquet-wasm/apache-arrow not installed). JSON export is available.',
  );
}
