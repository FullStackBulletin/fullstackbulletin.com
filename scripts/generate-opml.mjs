// Prebuild script: generates an OPML 2.0 file from src/data/feeds.json
// so visitors can subscribe to all recommended feeds in one click.
//
// Usage: node scripts/generate-opml.mjs
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const FEEDS_PATH = join(__dirname, '..', 'src', 'data', 'feeds.json');
const OUTPUT_DIR = join(__dirname, '..', 'public');
const OUTPUT_PATH = join(OUTPUT_DIR, 'fullstackbulletin-recommended-feeds.opml');

if (!existsSync(OUTPUT_DIR)) mkdirSync(OUTPUT_DIR, { recursive: true });

const feeds = JSON.parse(readFileSync(FEEDS_PATH, 'utf-8'));

const newsletters = feeds.filter((f) => f.category === 'newsletter');
const creators = feeds.filter((f) => f.category === 'creator');

function escapeXml(str) {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function outlineLine(feed) {
  const name = escapeXml(feed.name);
  return `        <outline text="${name}" title="${name}" type="rss" xmlUrl="${escapeXml(feed.feedUrl)}" htmlUrl="${escapeXml(feed.siteUrl)}"/>`;
}

const opml = `<?xml version="1.0" encoding="UTF-8"?>
<opml version="2.0">
  <head>
    <title>FullStack Bulletin - Recommended Feeds</title>
    <dateCreated>${new Date().toUTCString()}</dateCreated>
    <docs>https://fullstackbulletin.com</docs>
  </head>
  <body>
    <outline text="Newsletters and websites" title="Newsletters and websites">
${newsletters.map(outlineLine).join('\n')}
    </outline>
    <outline text="Creators" title="Creators">
${creators.map(outlineLine).join('\n')}
    </outline>
  </body>
</opml>
`;

writeFileSync(OUTPUT_PATH, opml);
console.log(`Generated ${OUTPUT_PATH} (${newsletters.length} newsletters, ${creators.length} creators)`);
