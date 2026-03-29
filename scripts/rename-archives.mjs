import { createHash } from 'node:crypto'
import { readFileSync, writeFileSync, readdirSync, statSync, renameSync, existsSync, rmSync } from 'node:fs'
import { join, basename } from 'node:path'

const ARCHIVES_DIR = join(import.meta.dirname, '..', 'archive')
const args = process.argv.slice(2)
const DRY_RUN = args.includes('--dry-run')
const VERBOSE = args.includes('--verbose')

// --- Utilities ---

function cleanTitle (title) {
  // Strip common prefixes:
  // "fullstackBulletin issue 10: Title" → "Title"
  // "FullstackBulletin issue 20: Title" → "Title"
  // "FullStack Bulletin #429 - Title" → "Title"
  // "Title - FullStack Bulletin #429" → "Title"
  // "Title - FullStack Bulletin" → "Title"
  // "️ Title" → "Title" (strip emoji)
  let cleaned = title
    .replace(/^fullstack\s*bulletin\s*(issue\s*)?\d*\s*[:#\-–—]\s*/i, '')
    .replace(/\s*[-–—]\s*fullstack\s*bulletin\s*(#\d+)?\s*$/i, '')
    .replace(/\s*[-–—]\s*fullstack$/i, '')
    .replace(/^\s*[️🔥🎉⚡💡🚀✨📚🎯]*\s*/, '') // strip leading emoji
  return cleaned.trim()
}

function slugify (text) {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // strip accents
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60)
    .replace(/-+$/, '')
}

function hashFile (filePath) {
  try {
    const content = readFileSync(filePath)
    return createHash('sha256').update(content).digest('hex')
  } catch {
    return null
  }
}

function extractLinkUrls (metadata) {
  if (!metadata.links || !Array.isArray(metadata.links)) return []
  return metadata.links.map(l => l.url).filter(Boolean).sort()
}

// --- Load all entries ---

console.log('Loading archive entries...')
const dirs = readdirSync(ARCHIVES_DIR).filter(d => {
  const fullPath = join(ARCHIVES_DIR, d)
  return statSync(fullPath).isDirectory() && existsSync(join(fullPath, 'metadata.json'))
})

const entries = dirs.map(dir => {
  const fullPath = join(ARCHIVES_DIR, dir)
  const metadata = JSON.parse(readFileSync(join(fullPath, 'metadata.json'), 'utf8'))
  const htmlHash = hashFile(join(fullPath, 'original.html'))
  const linkUrls = extractLinkUrls(metadata)
  return {
    dir,
    fullPath,
    metadata,
    htmlHash,
    linkUrls,
    date: metadata.date,
    issueNumber: metadata.issueNumber,
    title: metadata.title
  }
})

console.log(`Loaded ${entries.length} entries`)

// --- Sort by date ascending, then issueNumber as tiebreaker ---

entries.sort((a, b) => {
  const dateCmp = a.date.localeCompare(b.date)
  if (dateCmp !== 0) return dateCmp
  return a.issueNumber - b.issueNumber
})

// --- Detect and remove duplicates ---
// Group by (date, issueNumber) to find exact duplicates

// Group by (date, title) since issueNumber may have been reassigned
const groupKey = (e) => `${e.date}|${cleanTitle(e.title).toLowerCase()}`
const groups = new Map()
for (const entry of entries) {
  const key = groupKey(entry)
  if (!groups.has(key)) groups.set(key, [])
  groups.get(key).push(entry)
}

const deduped = []
const dropped = []
let droppedCount = 0

for (const [key, group] of groups) {
  if (group.length === 1) {
    deduped.push(group[0])
    continue
  }

  // Multiple folders for same date+title — detect duplicates
  if (VERBOSE) {
    console.log(`\nDuplicate group: ${key}`)
    for (const e of group) {
      console.log(`  ${e.dir} hash=${e.htmlHash?.slice(0, 12)}`)
    }
  }

  // Check if HTML hashes match
  const hashes = [...new Set(group.map(e => e.htmlHash).filter(Boolean))]
  let isDuplicate = hashes.length <= 1

  // If hashes differ, compare link URLs
  if (!isDuplicate) {
    const linkSets = group.map(e => JSON.stringify(e.linkUrls))
    const uniqueLinks = [...new Set(linkSets)]
    isDuplicate = uniqueLinks.length <= 1
  }

  if (isDuplicate) {
    // Keep the folder with the shorter name (drop the one with numeric suffix)
    const sorted = [...group].sort((a, b) => a.dir.length - b.dir.length)
    deduped.push(sorted[0])
    for (let i = 1; i < sorted.length; i++) {
      droppedCount++
      dropped.push(sorted[i])
      if (VERBOSE) console.log(`  DROPPING duplicate: ${sorted[i].dir}`)
    }
  } else {
    // Genuinely different content — keep all, mark extras as -bis
    deduped.push(group[0])
    for (let i = 1; i < group.length; i++) {
      group[i]._bis = true
      deduped.push(group[i])
    }
    console.log(`WARNING: Genuinely different content for ${key} — keeping ${group.length} entries`)
  }
}

console.log(`\nDropped ${droppedCount} duplicate folders`)
console.log(`Remaining entries: ${deduped.length}`)

// --- Re-sort after dedup ---
deduped.sort((a, b) => {
  const dateCmp = a.date.localeCompare(b.date)
  if (dateCmp !== 0) return dateCmp
  return a.issueNumber - b.issueNumber
})

// --- Assign sequential numbers and generate new folder names ---

const renames = []
let seq = 1

for (const entry of deduped) {
  const num = seq++
  const padded = String(num).padStart(3, '0')
  const titleSlug = slugify(cleanTitle(entry.title))
  const bisMarker = entry._bis ? '-bis' : ''
  const newDir = `${entry.date}-${padded}-${titleSlug}${bisMarker}`

  renames.push({
    oldDir: entry.dir,
    newDir,
    newNumber: num,
    entry
  })
}

console.log(`\nTotal issues after renaming: ${renames.length}`)

// --- Check for collisions ---

const newDirSet = new Set()
for (const r of renames) {
  if (newDirSet.has(r.newDir)) {
    console.error(`COLLISION: ${r.newDir} already used!`)
    process.exit(1)
  }
  newDirSet.add(r.newDir)
}

// --- Preview or execute ---

if (DRY_RUN) {
  console.log('\n=== DRY RUN (no changes will be made) ===\n')
  for (const r of renames) {
    const changed = r.oldDir !== r.newDir ? ' *' : ''
    console.log(`${r.oldDir} → ${r.newDir}${changed}`)
  }

  const unchanged = renames.filter(r => r.oldDir === r.newDir).length
  const changed = renames.filter(r => r.oldDir !== r.newDir).length
  console.log(`\n${changed} folders to rename, ${unchanged} already correct`)
} else {
  // Delete duplicate folders
  for (const entry of dropped) {
    const fullPath = join(ARCHIVES_DIR, entry.dir)
    if (existsSync(fullPath)) {
      rmSync(fullPath, { recursive: true })
      console.log(`Deleted duplicate: ${entry.dir}`)
    }
  }

  console.log('\nRenaming folders...')

  // Rename in two passes to avoid conflicts (rename to temp first)
  const tempSuffix = '__rename_temp__'

  // Pass 1: rename to temp names
  for (const r of renames) {
    if (r.oldDir === r.newDir) continue
    const oldPath = join(ARCHIVES_DIR, r.oldDir)
    const tempPath = join(ARCHIVES_DIR, r.newDir + tempSuffix)
    renameSync(oldPath, tempPath)
  }

  // Pass 2: rename from temp to final names + update metadata
  for (const r of renames) {
    if (r.oldDir === r.newDir) {
      // Still update metadata even if folder name doesn't change
      const metaPath = join(ARCHIVES_DIR, r.newDir, 'metadata.json')
      const metadata = JSON.parse(readFileSync(metaPath, 'utf8'))
      metadata.issueNumber = r.newNumber
      metadata.slug = r.newDir
      writeFileSync(metaPath, JSON.stringify(metadata, null, 2) + '\n')
      continue
    }

    const tempPath = join(ARCHIVES_DIR, r.newDir + tempSuffix)
    const newPath = join(ARCHIVES_DIR, r.newDir)
    renameSync(tempPath, newPath)

    // Update metadata.json
    const metaPath = join(newPath, 'metadata.json')
    const metadata = JSON.parse(readFileSync(metaPath, 'utf8'))
    metadata.issueNumber = r.newNumber
    metadata.slug = r.newDir
    writeFileSync(metaPath, JSON.stringify(metadata, null, 2) + '\n')

    if (VERBOSE) console.log(`  ${r.oldDir} → ${r.newDir}`)
  }

  const changed = renames.filter(r => r.oldDir !== r.newDir).length
  console.log(`Done! Renamed ${changed} folders, updated all metadata.json files.`)
}
