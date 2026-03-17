import { readdir, readFile, writeFile, copyFile } from 'node:fs/promises'
import { join, basename } from 'node:path'
import { existsSync } from 'node:fs'

const RAW_ARCHIVES = 'raw_archives'

// Hardcoded source URLs for all 8 books
const BOOK_COVERS = {
  'Designing Interfaces': {
    url: 'https://fullstackbulletin.github.io/fullstack-books/covers/designing-interfaces-3-jenifer-tidwell-charles-brewer-aynne-valencia.jpg',
    filename: 'designing-interfaces.jpg',
  },
  'Elasticsearch: The Definitive Guide': {
    url: 'https://fullstackbulletin.github.io/fullstack-books/covers/elasticsearch-1-clinton-gormley-zachary-tong.jpg',
    filename: 'elasticsearch-the-definitive-guide.jpg',
  },
  'Cassandra: The Definitive Guide': {
    url: 'https://fullstackbulletin.github.io/fullstack-books/covers/cassandra-3-jeff-carpenter-eben-hewitt.jpg',
    filename: 'cassandra-the-definitive-guide.jpg',
  },
  'Node.js Design Patterns - Second Edition': {
    url: 'https://loige.co/_astro/nodejs-design-patterns-2nd-ed.DkHLEvH8_1rIQtS.jpg',
    filename: 'nodejs-design-patterns-second-edition.jpg',
  },
  'Build APIs You Won\'t Hate': {
    url: 'https://covers.openlibrary.org/b/isbn/0692232699-L.jpg',
    filename: 'build-apis-you-wont-hate.jpg',
  },
  'Learning PHP, MySQL & JavaScript': {
    url: 'https://covers.openlibrary.org/b/isbn/1491918667-L.jpg',
    filename: 'learning-php-mysql-javascript.jpg',
  },
  'The Mythical Man-Month': {
    url: 'https://covers.openlibrary.org/b/isbn/0201835959-L.jpg',
    filename: 'the-mythical-man-month.jpg',
  },
  'Getting Started with hapi.js': {
    url: 'https://covers.openlibrary.org/b/isbn/1785888188-L.jpg',
    filename: 'getting-started-with-hapijs.jpg',
  },
}

function matchBook(title) {
  // Try exact match first
  for (const [key, value] of Object.entries(BOOK_COVERS)) {
    if (title.includes(key) || key.includes(title.split(':')[0])) {
      return value
    }
  }
  // Normalize and try partial match
  const normalized = title.toLowerCase().replace(/[^a-z0-9]/g, '')
  for (const [key, value] of Object.entries(BOOK_COVERS)) {
    const normalizedKey = key.toLowerCase().replace(/[^a-z0-9]/g, '')
    if (normalized.includes(normalizedKey) || normalizedKey.includes(normalized)) {
      return value
    }
  }
  return null
}

async function downloadImage(url, destPath) {
  const response = await fetch(url, { redirect: 'follow' })
  if (!response.ok) {
    throw new Error(`Failed to download ${url}: ${response.status}`)
  }
  const buffer = Buffer.from(await response.arrayBuffer())
  await writeFile(destPath, buffer)
  return buffer
}

async function main() {
  const dirs = await readdir(RAW_ARCHIVES)
  const imageCache = new Map() // url -> buffer

  let fixedCount = 0
  const notFound = []

  for (const dir of dirs.sort()) {
    const metadataPath = join(RAW_ARCHIVES, dir, 'metadata.json')
    if (!existsSync(metadataPath)) continue

    const raw = await readFile(metadataPath, 'utf8')
    const metadata = JSON.parse(raw)

    if (!metadata.book?.coverImageUrl?.startsWith('http')) continue

    const bookTitle = metadata.book.title
    const match = matchBook(bookTitle)

    if (!match) {
      notFound.push({ dir, title: bookTitle, url: metadata.book.coverImageUrl })
      continue
    }

    const destPath = join(RAW_ARCHIVES, dir, match.filename)

    // Download or use cached image
    if (!imageCache.has(match.url)) {
      if (existsSync(destPath)) {
        // Already downloaded in a previous run
        imageCache.set(match.url, await readFile(destPath))
        console.log(`  [cached from disk] ${match.filename}`)
      } else {
        console.log(`  [downloading] ${match.url}`)
        const buffer = await downloadImage(match.url, destPath)
        imageCache.set(match.url, buffer)
      }
    } else if (!existsSync(destPath)) {
      // Write cached buffer to this issue's directory
      await writeFile(destPath, imageCache.get(match.url))
    }

    // Update metadata
    metadata.book.coverImageUrl = `./${match.filename}`
    await writeFile(metadataPath, JSON.stringify(metadata, null, 2) + '\n')
    fixedCount++
    console.log(`[fixed] ${dir} → ./${match.filename}`)
  }

  console.log(`\n--- Summary ---`)
  console.log(`Fixed: ${fixedCount}`)
  if (notFound.length > 0) {
    console.log(`Not found (${notFound.length}):`)
    for (const { dir, title, url } of notFound) {
      console.log(`  - ${dir}: "${title}" (${url})`)
    }
  }
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
