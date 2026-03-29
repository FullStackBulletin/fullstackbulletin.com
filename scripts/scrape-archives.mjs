#!/usr/bin/env node

/**
 * Scrapes all FullStack Bulletin newsletter archives from Buttondown
 * and saves HTML + images into raw_archives/
 *
 * Usage: node scrape-archives.mjs [--concurrency N] [--start-page N] [--end-page N]
 */

import { mkdir, writeFile } from 'node:fs/promises'
import { join, basename, extname } from 'node:path'
import { JSDOM } from 'jsdom'

const BASE_URL = 'https://buttondown.com/fullstackbulletin/archive/'
const OUTPUT_DIR = join(import.meta.dirname, '..', 'archive')

// Parse CLI args
const args = process.argv.slice(2)
function getArg(name, defaultValue) {
  const idx = args.indexOf(`--${name}`)
  return idx !== -1 && args[idx + 1] ? Number(args[idx + 1]) : defaultValue
}
const CONCURRENCY = getArg('concurrency', 5)
const START_PAGE = getArg('start-page', 1)
const END_PAGE = getArg('end-page', Infinity)

// Rate-limiting fetch wrapper
const DELAY_MS = 500
let lastFetch = 0
async function rateLimitedFetch(url, retries = 3) {
  const now = Date.now()
  const wait = Math.max(0, DELAY_MS - (now - lastFetch))
  if (wait > 0) await sleep(wait)
  lastFetch = Date.now()

  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const res = await fetch(url, {
        headers: {
          'User-Agent': 'FullStackBulletin-Archiver/1.0 (personal backup)',
        },
      })
      if (res.status === 429) {
        const retryAfter = Number(res.headers.get('retry-after') || 5)
        console.warn(`  Rate limited, waiting ${retryAfter}s...`)
        await sleep(retryAfter * 1000)
        continue
      }
      if (!res.ok) throw new Error(`HTTP ${res.status} for ${url}`)
      return res
    } catch (err) {
      if (attempt === retries) throw err
      console.warn(`  Retry ${attempt}/${retries} for ${url}: ${err.message}`)
      await sleep(1000 * attempt)
    }
  }
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms))
}

// Discover all newsletter URLs from paginated archive pages
async function discoverIssueUrls() {
  const urls = []
  let page = START_PAGE

  while (page <= END_PAGE) {
    const pageUrl = page === 1 ? BASE_URL : `${BASE_URL}?page=${page}`
    console.log(`Fetching archive page ${page}: ${pageUrl}`)

    const res = await rateLimitedFetch(pageUrl)
    const html = await res.text()
    const dom = new JSDOM(html)
    const doc = dom.window.document

    // Find all links that point to individual newsletter issues
    const links = doc.querySelectorAll('a[href]')
    let foundOnPage = 0
    for (const link of links) {
      const href = link.getAttribute('href')
      // Match pattern: /fullstackbulletin/archive/<issue-slug>/
      // but NOT the archive index itself
      if (
        href &&
        href.includes('/fullstackbulletin/archive/') &&
        href !== '/fullstackbulletin/archive/' &&
        href !== BASE_URL
      ) {
        const fullUrl = href.startsWith('http')
          ? href
          : `https://buttondown.com${href}`
        if (!urls.includes(fullUrl)) {
          urls.push(fullUrl)
          foundOnPage++
        }
      }
    }

    console.log(`  Found ${foundOnPage} issues on page ${page}`)

    // Check for "Older archives" link to determine if there are more pages
    const hasOlderLink = [...links].some((l) => {
      const text = l.textContent?.trim().toLowerCase()
      const href = l.getAttribute('href')
      return (
        (text?.includes('older') || text?.includes('next')) &&
        href?.includes('page=')
      )
    })

    if (!hasOlderLink || foundOnPage === 0) {
      console.log(`  No more pages after page ${page}.`)
      break
    }

    page++
  }

  return urls
}

// Download a single image and return the local filename
async function downloadImage(imageUrl, issueDir) {
  try {
    const res = await rateLimitedFetch(imageUrl)
    const buffer = Buffer.from(await res.arrayBuffer())

    // Build a clean filename from the URL
    const urlObj = new URL(imageUrl)
    let filename = basename(urlObj.pathname)
    // If the filename has no extension, try to infer from content-type
    if (!extname(filename)) {
      const ct = res.headers.get('content-type') || ''
      if (ct.includes('png')) filename += '.png'
      else if (ct.includes('jpeg') || ct.includes('jpg')) filename += '.jpg'
      else if (ct.includes('gif')) filename += '.gif'
      else if (ct.includes('webp')) filename += '.webp'
      else if (ct.includes('svg')) filename += '.svg'
      else filename += '.bin'
    }

    const filepath = join(issueDir, filename)
    await writeFile(filepath, buffer)
    return filename
  } catch (err) {
    console.warn(`    Failed to download image: ${imageUrl} — ${err.message}`)
    return null
  }
}

// Scrape a single newsletter issue
async function scrapeIssue(issueUrl) {
  // Extract slug from URL for folder naming
  const slug = issueUrl
    .replace(BASE_URL, '')
    .replace(/\/$/, '')

  const issueDir = join(OUTPUT_DIR, slug)
  await mkdir(issueDir, { recursive: true })

  console.log(`Scraping: ${slug}`)

  const res = await rateLimitedFetch(issueUrl)
  const html = await res.text()

  // Parse HTML to find all images
  const dom = new JSDOM(html)
  const doc = dom.window.document
  const images = doc.querySelectorAll('img[src]')

  const imageMap = new Map() // original URL -> local filename

  // Download images
  for (const img of images) {
    const src = img.getAttribute('src')
    if (!src || src.startsWith('data:')) continue

    const fullSrc = src.startsWith('http')
      ? src
      : `https://buttondown.com${src}`

    if (!imageMap.has(fullSrc)) {
      const localName = await downloadImage(fullSrc, issueDir)
      if (localName) {
        imageMap.set(fullSrc, localName)
      }
    }
  }

  // Save original HTML
  await writeFile(join(issueDir, 'original.html'), html)

  // Save a version with image paths rewritten to local files
  let localHtml = html
  for (const [originalUrl, localFile] of imageMap) {
    localHtml = localHtml.replaceAll(originalUrl, localFile)
  }
  await writeFile(join(issueDir, 'index.html'), localHtml)

  console.log(`  Saved ${slug} (${imageMap.size} images)`)
  return { slug, images: imageMap.size }
}

// Process issues with limited concurrency
async function processWithConcurrency(urls, concurrency) {
  const results = []
  let index = 0

  async function worker() {
    while (index < urls.length) {
      const i = index++
      try {
        results.push(await scrapeIssue(urls[i]))
      } catch (err) {
        console.error(`Failed to scrape ${urls[i]}: ${err.message}`)
        results.push({ slug: urls[i], error: err.message })
      }
    }
  }

  const workers = Array.from({ length: Math.min(concurrency, urls.length) }, worker)
  await Promise.all(workers)
  return results
}

// Main
async function main() {
  console.log('FullStack Bulletin Archive Scraper')
  console.log('==================================\n')

  await mkdir(OUTPUT_DIR, { recursive: true })

  // Step 1: Discover all issue URLs
  console.log('Step 1: Discovering newsletter issues...\n')
  const urls = await discoverIssueUrls()
  console.log(`\nFound ${urls.length} total issues.\n`)

  if (urls.length === 0) {
    console.log('No issues found. Exiting.')
    process.exit(0)
  }

  // Save the URL list for reference
  await writeFile(
    join(OUTPUT_DIR, 'issue-urls.txt'),
    urls.join('\n') + '\n'
  )

  // Step 2: Scrape each issue
  console.log('Step 2: Scraping individual issues...\n')
  const results = await processWithConcurrency(urls, CONCURRENCY)

  // Summary
  const successful = results.filter((r) => !r.error)
  const failed = results.filter((r) => r.error)
  const totalImages = successful.reduce((sum, r) => sum + r.images, 0)

  console.log('\n==================================')
  console.log('Scraping complete!')
  console.log(`  Issues scraped: ${successful.length}/${urls.length}`)
  console.log(`  Images downloaded: ${totalImages}`)
  if (failed.length > 0) {
    console.log(`  Failed: ${failed.length}`)
    for (const f of failed) {
      console.log(`    - ${f.slug}: ${f.error}`)
    }
  }
  console.log(`\nOutput saved to: ${OUTPUT_DIR}`)
}

main().catch((err) => {
  console.error('Fatal error:', err)
  process.exit(1)
})
