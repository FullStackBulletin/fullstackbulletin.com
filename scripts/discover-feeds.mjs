// One-time script to discover RSS/Atom feed URLs for all recommended newsletters and creators.
// Cross-references an existing OPML export, uses platform heuristics, and fetches HTML <link> tags.
//
// Usage: node scripts/discover-feeds.mjs
import { readFileSync, writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));

// ---------------------------------------------------------------------------
// 1. Load site data (parse TS as text — simple enough for our exports)
// ---------------------------------------------------------------------------
const siteTs = readFileSync(join(__dirname, '..', 'src', 'data', 'site.ts'), 'utf-8');

function extractArray(varName) {
  const re = new RegExp(`export const ${varName}\\s*=\\s*(\\[)`, 's');
  const match = siteTs.match(re);
  if (!match) throw new Error(`Could not find ${varName} in site.ts`);
  const start = match.index + match[0].length - 1;
  let depth = 0;
  let end = start;
  for (let i = start; i < siteTs.length; i++) {
    if (siteTs[i] === '[') depth++;
    else if (siteTs[i] === ']') depth--;
    if (depth === 0) { end = i + 1; break; }
  }
  const raw = siteTs.slice(start, end);
  // Evaluate the JS array literal directly (safe since we control the source)
  return new Function(`return ${raw}`)();
}

const recommendedNewsletters = extractArray('recommendedNewsletters');
const recommendedCreators = extractArray('recommendedCreators');

// ---------------------------------------------------------------------------
// 2. Parse existing OPML for known feed URLs
// ---------------------------------------------------------------------------
const OPML_PATH = join(process.env.HOME, 'Downloads', 'Inoreader Feeds 20260318.xml');
const opmlKnown = new Map(); // normalised htmlUrl -> xmlUrl

try {
  const opmlXml = readFileSync(OPML_PATH, 'utf-8');
  const outlineRe = /<outline[^>]+xmlUrl="([^"]*)"[^>]+htmlUrl="([^"]*)"/g;
  const outlineRe2 = /<outline[^>]+htmlUrl="([^"]*)"[^>]+xmlUrl="([^"]*)"/g;
  for (const m of opmlXml.matchAll(outlineRe)) {
    opmlKnown.set(normalise(m[2]), m[1]);
  }
  for (const m of opmlXml.matchAll(outlineRe2)) {
    opmlKnown.set(normalise(m[1]), m[2]);
  }
  console.log(`Loaded ${opmlKnown.size} feeds from existing OPML`);
} catch {
  console.log('No existing OPML found, will rely on discovery only');
}

function normalise(url) {
  try {
    const u = new URL(url);
    return u.hostname.replace(/^www\./, '') + u.pathname.replace(/\/+$/, '');
  } catch {
    return url;
  }
}

// ---------------------------------------------------------------------------
// 3. Platform heuristics
// ---------------------------------------------------------------------------
function heuristicFeedUrl(siteUrl) {
  const u = new URL(siteUrl);
  const host = u.hostname;

  if (host.endsWith('.substack.com')) return siteUrl.replace(/\/$/, '') + '/feed';
  if (host.endsWith('.beehiiv.com')) return siteUrl.replace(/\/$/, '') + '/rss';
  if (host === 'medium.com') return 'https://medium.com/feed' + u.pathname;
  if (host === 'dev.to') return 'https://dev.to' + u.pathname.replace(/\/$/, '') + '/feed';

  return null;
}

// ---------------------------------------------------------------------------
// 4. HTML <link> discovery
// ---------------------------------------------------------------------------
async function discoverFromHtml(siteUrl) {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000);
    const res = await fetch(siteUrl, {
      signal: controller.signal,
      headers: { 'User-Agent': 'FullStackBulletin-FeedDiscovery/1.0' },
      redirect: 'follow',
    });
    clearTimeout(timeout);
    if (!res.ok) return null;
    const html = await res.text();
    // Look for <link rel="alternate" type="application/rss+xml" or atom+xml
    const linkRe = /<link[^>]+rel=["']alternate["'][^>]*>/gi;
    for (const m of html.matchAll(linkRe)) {
      const tag = m[0];
      if (/type=["']application\/(rss|atom)\+xml["']/i.test(tag)) {
        const hrefMatch = tag.match(/href=["']([^"']+)["']/);
        if (hrefMatch) {
          const href = hrefMatch[1];
          return new URL(href, siteUrl).href;
        }
      }
    }
  } catch {
    // fetch failed
  }
  return null;
}

// Common feed paths to try as last resort
const COMMON_PATHS = ['/feed', '/feed.xml', '/rss.xml', '/rss', '/atom.xml', '/index.xml', '/blog/feed', '/blog/rss.xml'];

async function tryCommonPaths(siteUrl) {
  const base = siteUrl.replace(/\/$/, '');
  for (const path of COMMON_PATHS) {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 5000);
      const res = await fetch(base + path, {
        method: 'HEAD',
        signal: controller.signal,
        headers: { 'User-Agent': 'FullStackBulletin-FeedDiscovery/1.0' },
        redirect: 'follow',
      });
      clearTimeout(timeout);
      const ct = res.headers.get('content-type') || '';
      if (res.ok && (ct.includes('xml') || ct.includes('rss') || ct.includes('atom'))) {
        return base + path;
      }
    } catch {
      // skip
    }
  }
  return null;
}

// ---------------------------------------------------------------------------
// 5. Run discovery with concurrency limiting
// ---------------------------------------------------------------------------
async function discoverFeed(entry, category) {
  const siteUrl = entry.url;
  const normUrl = normalise(siteUrl);

  // Check OPML first
  for (const [key, feedUrl] of opmlKnown) {
    if (normUrl.includes(key) || key.includes(normUrl.split('/')[0])) {
      return { name: entry.name, siteUrl, feedUrl, category, source: 'opml' };
    }
  }

  // Try heuristic
  const heuristic = heuristicFeedUrl(siteUrl);
  if (heuristic) {
    return { name: entry.name, siteUrl, feedUrl: heuristic, category, source: 'heuristic' };
  }

  // Try HTML discovery
  const htmlFeed = await discoverFromHtml(siteUrl);
  if (htmlFeed) {
    return { name: entry.name, siteUrl, feedUrl: htmlFeed, category, source: 'html' };
  }

  // Try common paths
  const commonFeed = await tryCommonPaths(siteUrl);
  if (commonFeed) {
    return { name: entry.name, siteUrl, feedUrl: commonFeed, category, source: 'common-path' };
  }

  return { name: entry.name, siteUrl, feedUrl: null, category, source: 'not-found' };
}

// Concurrency limiter
async function withConcurrency(tasks, limit) {
  const results = [];
  const executing = new Set();
  for (const task of tasks) {
    const p = task().then((r) => { executing.delete(p); return r; });
    executing.add(p);
    results.push(p);
    if (executing.size >= limit) await Promise.race(executing);
  }
  return Promise.all(results);
}

// Better OPML matching: normalize both sides and match by hostname
function findInOpml(siteUrl) {
  const norm = normalise(siteUrl);
  const hostname = new URL(siteUrl).hostname.replace(/^www\./, '');

  // Exact normalized match
  for (const [key, feedUrl] of opmlKnown) {
    if (key === norm) return feedUrl;
  }
  // Hostname match
  for (const [key, feedUrl] of opmlKnown) {
    if (key.startsWith(hostname)) return feedUrl;
  }
  return null;
}

async function discoverFeedV2(entry, category) {
  const siteUrl = entry.url;

  // Check OPML first
  const opmlFeed = findInOpml(siteUrl);
  if (opmlFeed) {
    return { name: entry.name, siteUrl, feedUrl: opmlFeed, category, source: 'opml' };
  }

  // Try heuristic
  const heuristic = heuristicFeedUrl(siteUrl);
  if (heuristic) {
    return { name: entry.name, siteUrl, feedUrl: heuristic, category, source: 'heuristic' };
  }

  // Try HTML discovery
  const htmlFeed = await discoverFromHtml(siteUrl);
  if (htmlFeed) {
    return { name: entry.name, siteUrl, feedUrl: htmlFeed, category, source: 'html' };
  }

  // Try common paths
  const commonFeed = await tryCommonPaths(siteUrl);
  if (commonFeed) {
    return { name: entry.name, siteUrl, feedUrl: commonFeed, category, source: 'common-path' };
  }

  return { name: entry.name, siteUrl, feedUrl: null, category, source: 'not-found' };
}

console.log(`Discovering feeds for ${recommendedNewsletters.length} newsletters and ${recommendedCreators.length} creators...`);

const tasks = [
  ...recommendedNewsletters.map((e) => () => discoverFeedV2(e, 'newsletter')),
  ...recommendedCreators.map((e) => () => discoverFeedV2(e, 'creator')),
];

const results = await withConcurrency(tasks, 10);

// Report
const found = results.filter((r) => r.feedUrl);
const notFound = results.filter((r) => !r.feedUrl);

console.log(`\nFound ${found.length}/${results.length} feeds`);

if (notFound.length) {
  console.log('\nNo feed found for:');
  for (const r of notFound) {
    console.log(`  - ${r.name} (${r.siteUrl})`);
  }
}

console.log('\nBy source:');
const bySource = {};
for (const r of results) {
  bySource[r.source] = (bySource[r.source] || 0) + 1;
}
for (const [source, count] of Object.entries(bySource)) {
  console.log(`  ${source}: ${count}`);
}

// Write output (exclude source field)
const output = results
  .filter((r) => r.feedUrl)
  .map(({ name, siteUrl, feedUrl, category }) => ({ name, siteUrl, feedUrl, category }));

const outputPath = join(__dirname, '..', 'src', 'data', 'feeds.json');
writeFileSync(outputPath, JSON.stringify(output, null, 2) + '\n');
console.log(`\nWrote ${output.length} feeds to ${outputPath}`);
