import { JSDOM } from 'jsdom'
import { readFileSync, writeFileSync, readdirSync, statSync, existsSync } from 'fs'
import { join, basename } from 'path'

const ARCHIVES_DIR = join(import.meta.dirname, 'raw_archives')

// --- URL Utilities ---

function stripUtmParams (url) {
  try {
    const u = new URL(url)
    for (const key of [...u.searchParams.keys()]) {
      if (key.startsWith('utm_')) u.searchParams.delete(key)
    }
    // Also remove w/fit params from image URLs
    return u.toString()
  } catch {
    return url
  }
}

function cleanArticleUrl (url) {
  try {
    const u = new URL(url)
    for (const key of [...u.searchParams.keys()]) {
      if (key.startsWith('utm_') || key === 'w' || key === 'fit') {
        u.searchParams.delete(key)
      }
    }
    // Remove trailing ? if no params left
    let result = u.toString()
    if (result.endsWith('?')) result = result.slice(0, -1)
    return result
  } catch {
    return url
  }
}

function resolveLocalImage (remoteUrl, folderPath) {
  if (!remoteUrl) return null
  try {
    const u = new URL(remoteUrl)
    const filename = basename(u.pathname)
    const localPath = join(folderPath, filename)
    if (existsSync(localPath)) {
      return `./${filename}`
    }
  } catch { /* ignore */ }
  return null
}

// --- Date Parsing ---

function parseDate (dateStr) {
  const trimmed = dateStr.trim()
  const d = new Date(trimmed)
  if (isNaN(d.getTime())) return null
  const year = d.getFullYear()
  const month = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

// --- Title/Issue Number Parsing ---

function parseSubject (subjectText) {
  const text = subjectText.trim()
  let issueNumber = null
  let title = text

  // Try patterns: "#458" (anywhere), "issue 7:"
  const hashMatch = text.match(/#(\d+)/)
  if (hashMatch) {
    issueNumber = parseInt(hashMatch[1], 10)
  }
  const issueMatch = text.match(/issue\s+(\d+)/i)
  if (!issueNumber && issueMatch) {
    issueNumber = parseInt(issueMatch[1], 10)
  }

  // Try "FullstackBulletin N:" or "Fullstack Bulletin N:" pattern
  if (!issueNumber) {
    const fbMatch = text.match(/[Ff]ullstack\s*[Bb]ulletin\s+(\d+)/i)
    if (fbMatch) issueNumber = parseInt(fbMatch[1], 10)
  }

  // Extract the title part (after the issue number marker)
  // Remove emoji prefix, issue number patterns, and suffixes
  title = text
    .replace(/^[\p{Emoji_Presentation}\p{Extended_Pictographic}\s]+/u, '')
    .replace(/^#\d+[:\s]*[–—-]?\s*/i, '')
    .replace(/^issue\s+\d+[:\s]+/i, '')
    .replace(/^[Ff]ullstack\s*[Bb]ulletin\s+\d+[:\s]*/i, '')
    .replace(/\s*[–—]\s*FullStack Bulletin\s*#\d+.*/i, '')
    .replace(/\s*[–—]\s*Fullstack Bulletin\s*/i, '')
    .trim()

  if (!title) title = text

  return { issueNumber, title }
}

// --- Text Extraction Helpers ---

function textContent (el) {
  return el ? el.textContent.trim() : null
}

function htmlToMarkdown (el) {
  if (!el) return null
  const result = walkNode(el)
  return result.trim() || null
}

function walkNode (node) {
  if (node.nodeType === 3 /* TEXT_NODE */) {
    return node.textContent
  }
  if (node.nodeType !== 1 /* ELEMENT_NODE */) return ''

  const tag = node.tagName.toLowerCase()

  if (tag === 'br') return '\n'

  // Strip "Read Article" / "View Repository" links
  if (tag === 'a') {
    const text = node.textContent.trim()
    if (/^(Read Article|View Repository|Watch video|Read more)$/i.test(text)) {
      return ''
    }
    const href = node.getAttribute('href')
    const childText = walkChildren(node).trim()
    if (href && childText) {
      return `[${childText}](${stripUtmParams(href)})`
    }
    return childText
  }

  if (tag === 'strong' || tag === 'b') {
    const inner = walkChildren(node).trim()
    return inner ? `**${inner}**` : ''
  }

  if (tag === 'em' || tag === 'i') {
    const inner = walkChildren(node).trim()
    return inner ? `*${inner}*` : ''
  }

  if (tag === 'code') {
    const inner = walkChildren(node).trim()
    return inner ? `\`${inner}\`` : ''
  }

  return walkChildren(node)
}

function walkChildren (node) {
  let result = ''
  for (const child of node.childNodes) {
    result += walkNode(child)
  }
  return result
}

function cleanTitle (title) {
  let cleaned = title
    .replace(/^fullstack\s*bulletin\s*(issue\s*)?\d*\s*[:#\-–—]\s*/i, '')
    .replace(/\s*[-–—]\s*fullstack\s*bulletin\s*(#\d+)?\s*$/i, '')
    .replace(/\s*[-–—]\s*fullstack$/i, '')
    .replace(/^\s*[️🔥🎉⚡💡🚀✨📚🎯]*\s*/, '')
  return cleaned.trim()
}

function getTextBetween (parentEl, startEl, endSelector) {
  // Get text content between two elements within parent
  const walker = parentEl.ownerDocument.createTreeWalker(parentEl, 4 /* NodeFilter.SHOW_TEXT */)
  let collecting = !startEl
  let text = ''
  let node
  while ((node = walker.nextNode())) {
    if (startEl && node.parentElement === startEl) {
      collecting = true
      continue
    }
    if (collecting) {
      text += node.textContent
    }
  }
  return text.trim()
}

// --- Template Detection ---

function detectTemplate (emailBodyContent) {
  const html = emailBodyContent.innerHTML

  if (html.includes('data-block-id') || html.includes('mceText')) {
    return 'mce-mailchimp'
  }
  if (html.includes('Thumbnail Left, Text Right : BEGIN') || html.includes('class="mcnImage"')) {
    return 'old-mailchimp'
  }
  return 'buttondown-markdown'
}

// --- Old Mailchimp Parser ---

function parseOldMailchimp (emailBodyContent, folderPath) {
  const html = emailBodyContent.innerHTML
  const doc = emailBodyContent.ownerDocument

  // Quote: find td with bgcolor="#fee775"
  let quote = null
  const quoteTd = emailBodyContent.querySelector('td[bgcolor="#fee775"]')
  if (quoteTd) {
    const emEl = quoteTd.querySelector('em span, em')
    const quoteText = emEl ? textContent(emEl).replace(/^[\u201c"\u201e\u00ab]|[\u201d"\u201f\u00bb]$/g, '').trim() : null

    // Author row: second tr in the table inside the yellow td
    const rows = quoteTd.querySelectorAll('table tr')
    let authorName = null
    let authorTitle = null
    let authorUrl = null
    if (rows.length >= 2) {
      const authorTd = rows[1].querySelector('td')
      if (authorTd) {
        const authorLink = authorTd.querySelector('strong a, strong span a')
        if (authorLink) {
          authorName = textContent(authorLink)
          authorUrl = authorLink.getAttribute('href') || null
        }
        // Author title: text after the author link, after comma
        const fullText = textContent(authorTd)
        const commaIdx = fullText.lastIndexOf(',')
        if (commaIdx !== -1) {
          authorTitle = fullText.slice(commaIdx + 1).trim()
        }
      }
    }

    if (quoteText) {
      quote = {
        text: quoteText,
        author: authorName,
        authorTitle: authorTitle || null,
        authorUrl: authorUrl || null
      }
    }
  }

  // Intro: find "Newsletter Title: START" comment
  let intro = null
  const introMatch = html.match(/<!-- Newsletter Title: START -->([\s\S]*?)<!-- Newsletter Title: END -->/)
  if (introMatch) {
    const fragment = JSDOM.fragment(introMatch[1])
    const h1 = fragment.querySelector('h1')
    if (h1) {
      // Remove img elements to get just text
      h1.querySelectorAll('img').forEach(img => img.remove())
      const text = htmlToMarkdown(h1)
      if (text && text.length > 5) {
        intro = text
      }
    }
  }

  // Articles: find all "Thumbnail Left, Text Right : BEGIN" blocks
  const links = []
  const articleRegex = /<!-- Thumbnail Left, Text Right : BEGIN -->([\s\S]*?)<!-- Thumbnail Left, Text Right : END -->/g
  let match
  let articleIndex = 0
  while ((match = articleRegex.exec(html)) !== null) {
    const fragment = JSDOM.fragment(match[1])

    // Image: img.mcnImage in the 33% column
    const img = fragment.querySelector('img.mcnImage, img[class*="mcnImage"]')
    const remoteImageUrl = img ? img.getAttribute('src') : null
    const imageUrl = resolveLocalImage(remoteImageUrl, folderPath) || (remoteImageUrl ? cleanArticleUrl(remoteImageUrl) : null)

    // Title: h2 > strong > span > a (with utm_content=title or just the main link)
    const titleLink = fragment.querySelector('h2 a')
    const title = titleLink ? textContent(titleLink) : null
    const rawUrl = titleLink ? titleLink.getAttribute('href') : null
    const url = rawUrl ? stripUtmParams(rawUrl) : null

    // Description: div with text-align left
    const descDiv = fragment.querySelector('div[style*="text-align: left"], div[style*="text-align:left"]')
    const description = descDiv ? htmlToMarkdown(descDiv) : null

    if (title && url) {
      links.push({
        title,
        url,
        description: description || null,
        imageUrl: imageUrl || null,
        featured: articleIndex === 0
      })
    }
    articleIndex++
  }

  // Fallback for early old Mailchimp issues without "Thumbnail Left" markers
  if (links.length === 0) {
    const allTitleLinks = emailBodyContent.querySelectorAll('a[href*="utm_content=title"]')
    const seenUrls = new Set()
    let fallbackIdx = 0
    for (const titleLink of allTitleLinks) {
      const rawUrl = titleLink.getAttribute('href')
      const url = stripUtmParams(rawUrl)
      if (seenUrls.has(url)) continue
      seenUrls.add(url)

      const title = textContent(titleLink)

      // Try to find image in nearby elements
      let imageUrl = null
      const parentTd = titleLink.closest('td')
      if (parentTd) {
        const parentRow = parentTd.closest('tr')
        if (parentRow) {
          // Look in preceding row for mcnImage
          let prevRow = parentRow.previousElementSibling
          for (let i = 0; i < 3 && prevRow; i++) {
            const img = prevRow.querySelector('.mcnImage, img')
            if (img) {
              const remoteSrc = img.getAttribute('src')
              imageUrl = resolveLocalImage(remoteSrc, folderPath) || (remoteSrc ? cleanArticleUrl(remoteSrc) : null)
              break
            }
            prevRow = prevRow.previousElementSibling
          }
        }
      }

      // Description: look for text in the same container
      let description = null
      if (parentTd) {
        const descDiv = parentTd.querySelector('div[style*="text-align"]')
        if (descDiv) description = htmlToMarkdown(descDiv)
      }

      links.push({
        title,
        url,
        description: description || null,
        imageUrl: imageUrl || null,
        featured: fallbackIdx === 0
      })
      fallbackIdx++
    }
  }

  // Book: "Book: START" to "Book: END"
  let book = null
  const bookMatch = html.match(/<!-- Book: START -->([\s\S]*?)<!-- Book: END -->/)
  if (bookMatch) {
    const fragment = JSDOM.fragment(bookMatch[1])

    // Title: strong > span
    const titleEl = fragment.querySelector('strong span')
    const bookTitle = titleEl ? textContent(titleEl) : null

    // Author: em > span
    const authorEl = fragment.querySelector('em span')
    const bookAuthor = authorEl ? textContent(authorEl) : null

    // Cover image: img with alt="book cover" or img.mcnImage in the book section
    const coverImg = fragment.querySelector('img[alt="book cover"], img.mcnImage')
    const remoteCoverUrl = coverImg ? coverImg.getAttribute('src') : null
    const coverImageUrl = resolveLocalImage(remoteCoverUrl, folderPath) || (remoteCoverUrl ? cleanArticleUrl(remoteCoverUrl) : null)

    // Description
    const descEl = fragment.querySelector('.book-description, div.book-description')
    const bookDescription = descEl ? textContent(descEl) : null

    // Amazon links
    let amazonUs = null
    let amazonUk = null
    const allLinks = fragment.querySelectorAll('a[href]')
    for (const link of allLinks) {
      const href = link.getAttribute('href')
      if (href && href.includes('amazon.com/dp/')) amazonUs = stripUtmParams(href)
      if (href && href.includes('amazon.co.uk/dp/')) amazonUk = stripUtmParams(href)
    }

    if (bookTitle) {
      book = {
        title: bookTitle,
        author: bookAuthor || null,
        description: bookDescription || null,
        coverImageUrl: coverImageUrl || null,
        amazonUs: amazonUs || null,
        amazonUk: amazonUk || null
      }
    }
  }

  return { quote, intro, links, book, additionalLinks: null, sponsor: null }
}

// --- MCE Mailchimp Parser ---

function parseMceMailchimp (emailBodyContent, folderPath) {
  // Quote: find mceText div with em/strong containing quote text, inside a bg #fefdec cell
  let quote = null
  const allMceText = emailBodyContent.querySelectorAll('.mceText')
  for (const block of allMceText) {
    // Check if this block is inside a yellow-ish background cell
    const parentTd = block.closest('td')
    const bgColor = parentTd ? (parentTd.getAttribute('style') || '') : ''
    const isYellowBg = bgColor.includes('#fefdec') || bgColor.includes('fefdec')

    if (isYellowBg) {
      const emStrong = block.querySelector('em strong, em')
      const quoteP = block.querySelector('p')
      if (emStrong && quoteP) {
        const rawQuote = textContent(emStrong)
        if (rawQuote && /^[\u201c"\u201e\u00ab]/.test(rawQuote)) {
          const quoteText = rawQuote.replace(/^[\u201c"\u201e\u00ab]|[\u201d"\u201f\u00bb]$/g, '').trim()

          // Author: look in same block or next sibling p for "— Author"
          const paragraphs = block.querySelectorAll('p')
          let authorName = null
          let authorTitle = null
          let authorUrl = null
          for (const p of paragraphs) {
            const pText = textContent(p)
            if (pText.startsWith('—') || pText.startsWith('–') || pText.startsWith('-')) {
              const authorLink = p.querySelector('a')
              if (authorLink) {
                authorName = textContent(authorLink)
                authorUrl = authorLink.getAttribute('href') || null
              }
              // Title after comma
              const commaIdx = pText.lastIndexOf(',')
              if (commaIdx !== -1) {
                authorTitle = pText.slice(commaIdx + 1).trim()
              }
              break
            }
          }

          quote = {
            text: quoteText,
            author: authorName || null,
            authorTitle: authorTitle || null,
            authorUrl: authorUrl || null
          }
          break
        }
      }
    }
  }

  // Intro: mceText blocks before the quote or first article, not in yellow bg
  let intro = null
  const introTexts = []
  for (const block of allMceText) {
    const parentTd = block.closest('td')
    const bgColor = parentTd ? (parentTd.getAttribute('style') || '') : ''
    const isYellowBg = bgColor.includes('#fefdec') || bgColor.includes('fefdec')
    if (isYellowBg) break
    // Skip "view in browser" blocks
    const plainText = textContent(block)
    if (!plainText || plainText.includes('View this email in your browser')) continue
    // Stop if we hit an article link
    if (block.querySelector('a[href*="utm_content=title"]')) break
    const mdText = htmlToMarkdown(block)
    if (mdText && mdText.length > 10) introTexts.push(mdText)
  }
  if (introTexts.length > 0) {
    intro = introTexts.join('\n\n')
  }

  // Articles: find links with utm_content=title in mceText blocks
  const links = []
  const seenUrls = new Set()
  let firstArticle = true

  for (const block of allMceText) {
    const titleLink = block.querySelector('a[href*="utm_content=title"]')
    if (!titleLink) continue

    // Skip if this is inside the additional links section (inside ul/li)
    if (titleLink.closest('ul') || titleLink.closest('li')) continue

    const rawUrl = titleLink.getAttribute('href')
    const url = stripUtmParams(rawUrl)
    if (seenUrls.has(url)) continue
    seenUrls.add(url)

    const title = textContent(titleLink)

    // Description: text between em-dash separator and "Read article" link
    // Uses htmlToMarkdown to preserve rich formatting (links, bold, code)
    const p = titleLink.closest('p')
    let description = null
    if (p) {
      const fullMd = htmlToMarkdown(p)
      // Search for em-dash with regular or non-breaking spaces
      const dashPattern = /[\s\u00a0][—–][\s\u00a0]/
      const dashMatch = dashPattern.exec(fullMd)
      if (dashMatch) {
        const afterDash = dashMatch.index + dashMatch[0].length
        description = fullMd.slice(afterDash).trim()
        // Clean up any trailing whitespace or empty content
        if (description && description.length < 3) description = null
      }
    }

    // Image: look for preceding image block with matching article URL
    let imageUrl = null
    const parentTd = block.closest('td')
    if (parentTd) {
      const parentTr = parentTd.closest('tr')
      if (parentTr) {
        let prevTr = parentTr.previousElementSibling
        // Search up to 2 previous rows for an image link matching this article's URL
        for (let i = 0; i < 2 && prevTr; i++) {
          const imgLink = prevTr.querySelector('a[href*="utm_content=image"]')
          const img = prevTr.querySelector('img.imageDropZone, img[data-block-id]')
          if (img) {
            // Only match if the image link points to the same article
            if (imgLink) {
              const imgLinkUrl = stripUtmParams(imgLink.getAttribute('href'))
              if (imgLinkUrl === url) {
                const remoteSrc = img.getAttribute('src')
                imageUrl = resolveLocalImage(remoteSrc, folderPath) || (remoteSrc ? cleanArticleUrl(remoteSrc) : null)
              }
            } else {
              // No link wrapping the image; only assign to first article
              if (firstArticle) {
                const remoteSrc = img.getAttribute('src')
                imageUrl = resolveLocalImage(remoteSrc, folderPath) || (remoteSrc ? cleanArticleUrl(remoteSrc) : null)
              }
            }
            break
          }
          prevTr = prevTr.previousElementSibling
        }
      }
    }

    links.push({
      title,
      url,
      description: description || null,
      imageUrl: imageUrl || null,
      featured: firstArticle
    })
    firstArticle = false
  }

  // Book: find h2 > strong inside a yellow bg mceText, followed by "by Author"
  let book = null
  for (const block of allMceText) {
    const parentTd = block.closest('td')
    const bgColor = parentTd ? (parentTd.getAttribute('style') || '') : ''
    const isYellowBg = bgColor.includes('#fefdec') || bgColor.includes('fefdec')
    if (!isYellowBg) continue

    const h2 = block.querySelector('h2 strong')
    if (!h2) continue

    const bookTitle = textContent(h2)
    const pAfterH2 = block.querySelector('p')
    let bookAuthor = null
    if (pAfterH2) {
      const authorText = textContent(pAfterH2)
      const byMatch = authorText.match(/^by\s+(.+)/i)
      if (byMatch) bookAuthor = byMatch[1].trim()
    }

    // Skip if this is the "Book of the week" heading without actual title
    if (bookTitle.toLowerCase().includes('book of the week')) continue

    // Find book description in nearby mceText blocks
    let bookDescription = null
    let coverImageUrl = null
    let amazonUs = null
    let amazonUk = null

    // Look through sibling rows for description, image, and buttons
    const bookRow = block.closest('tr')
    let nextRow = bookRow ? bookRow.nextElementSibling : null
    while (nextRow) {
      const nextTd = nextRow.querySelector('td')
      const nextBg = nextTd ? (nextTd.getAttribute('style') || '') : ''
      if (!nextBg.includes('#fefdec') && !nextBg.includes('fefdec')) break

      // Description
      const descBlock = nextRow.querySelector('.mceText p')
      if (descBlock && !bookDescription) {
        const text = textContent(descBlock)
        if (text && !text.startsWith('by ') && text.length > 20) {
          bookDescription = text
        }
      }

      // Cover image
      const img = nextRow.querySelector('img')
      if (img && !coverImageUrl) {
        const remoteSrc = img.getAttribute('src')
        coverImageUrl = resolveLocalImage(remoteSrc, folderPath) || (remoteSrc ? cleanArticleUrl(remoteSrc) : null)
      }

      // Amazon links
      const amazonLinks = nextRow.querySelectorAll('a[href*="amazon"]')
      for (const al of amazonLinks) {
        const href = al.getAttribute('href')
        if (href.includes('amazon.com/dp/') && !amazonUs) amazonUs = stripUtmParams(href)
        if (href.includes('amazon.co.uk/dp/') && !amazonUk) amazonUk = stripUtmParams(href)
      }

      nextRow = nextRow.nextElementSibling
    }

    if (bookTitle) {
      book = {
        title: bookTitle,
        author: bookAuthor || null,
        description: bookDescription || null,
        coverImageUrl: coverImageUrl || null,
        amazonUs: amazonUs || null,
        amazonUk: amazonUk || null
      }
      break
    }
  }

  // Additional links: h3 followed by ul > li > a
  let additionalLinks = null
  for (const block of allMceText) {
    const h3 = block.querySelector('h3')
    const ul = block.querySelector('ul')
    if (h3 && ul) {
      const items = ul.querySelectorAll('li a[href]')
      if (items.length > 0) {
        additionalLinks = []
        for (const item of items) {
          additionalLinks.push({
            title: textContent(item),
            url: stripUtmParams(item.getAttribute('href'))
          })
        }
      }
      break
    }
  }

  return { quote, intro, links, book, additionalLinks, sponsor: null }
}

// --- Buttondown Markdown Parser ---

function parseButtondownMarkdown (emailBodyContent, folderPath) {
  const children = emailBodyContent.children
  const elements = [...emailBodyContent.querySelectorAll(':scope > *')]

  // Find HR positions to delimit sections
  const hrIndices = []
  for (let i = 0; i < elements.length; i++) {
    if (elements[i].tagName === 'HR') hrIndices.push(i)
  }

  // Intro: all <p> elements before first <hr/>
  let intro = null
  if (hrIndices.length > 0) {
    const introTexts = []
    for (let i = 0; i < hrIndices[0]; i++) {
      if (elements[i].tagName === 'P') {
        introTexts.push(htmlToMarkdown(elements[i]))
      }
    }
    if (introTexts.filter(Boolean).length > 0) {
      intro = introTexts.filter(Boolean).join('\n\n')
    }
  }

  // Quote: blockquote between hr elements
  let quote = null
  for (let i = 0; i < elements.length; i++) {
    if (elements[i].tagName === 'BLOCKQUOTE') {
      const p = elements[i].querySelector('p')
      if (p) {
        const fullText = textContent(p)
        // Parse: "Quote text"\n- Author, Title
        const quoteMatch = fullText.match(/["""](.+?)["""]\s*[-–—]\s*(.+)/s)
        if (quoteMatch) {
          const quoteText = quoteMatch[1].trim()
          const attribution = quoteMatch[2].trim()
          const commaIdx = attribution.indexOf(',')
          let authorName = attribution
          let authorTitle = null
          if (commaIdx !== -1) {
            authorName = attribution.slice(0, commaIdx).trim()
            authorTitle = attribution.slice(commaIdx + 1).trim()
          }

          // Check for author link
          const authorLink = p.querySelector('a')
          let authorUrl = null
          if (authorLink) {
            authorUrl = authorLink.getAttribute('href')
            // If name wasn't parsed correctly from text, get it from link
            if (!authorName || authorName === attribution) {
              authorName = textContent(authorLink)
            }
          }

          quote = {
            text: quoteText,
            author: authorName || null,
            authorTitle: authorTitle || null,
            authorUrl: authorUrl || null
          }
        }
      }
      break
    }
  }

  // Articles and additional links
  const links = []
  let additionalLinks = null
  let book = null
  let inAdditionalLinks = false
  let firstArticle = true

  for (let i = 0; i < elements.length; i++) {
    const el = elements[i]

    // Book section: h1 or h2 containing "book of the week"
    if ((el.tagName === 'H1' || el.tagName === 'H2') &&
        textContent(el).toLowerCase().includes('book of the week')) {
      book = parseButtondownBook(elements, i, folderPath)
      continue
    }

    // Additional links: h3 heading followed by ul
    if (el.tagName === 'H3') {
      // Check if next element is a ul
      const next = elements[i + 1]
      if (next && next.tagName === 'UL') {
        inAdditionalLinks = true
        additionalLinks = []
        const items = next.querySelectorAll('li a[href]')
        for (const item of items) {
          additionalLinks.push({
            title: textContent(item),
            url: stripUtmParams(item.getAttribute('href'))
          })
        }
        i++ // skip the ul
        continue
      }
    }

    // Articles: p elements with utm_content=title links (not inside ul)
    if (el.tagName === 'P') {
      const titleLink = el.querySelector('a[href*="utm_content=title"]')
      if (!titleLink) continue

      const title = textContent(titleLink)
      const rawUrl = titleLink.getAttribute('href')
      const url = stripUtmParams(rawUrl)

      // Description: text after em-dash (uses htmlToMarkdown for rich formatting)
      const fullMd = htmlToMarkdown(el)
      let description = null
      const dashPattern = /[\s\u00a0][—–][\s\u00a0]/
      const dashMatch = fullMd ? dashPattern.exec(fullMd) : null
      if (dashMatch) {
        const afterDash = dashMatch.index + dashMatch[0].length
        description = fullMd.slice(afterDash).trim()
        if (description && description.length < 3) description = null
      }

      // Fallback: period-separated descriptions (e.g., "[**Title**](url). Description text...")
      if (!description && fullMd) {
        const periodPattern = /\]\([^)]+\)\.\s+/
        const periodMatch = periodPattern.exec(fullMd)
        if (periodMatch) {
          const afterPeriod = periodMatch.index + periodMatch[0].length
          description = fullMd.slice(afterPeriod).trim()
          if (description && description.length < 3) description = null
        }
      }

      // Featured image: check previous element for image
      let imageUrl = null
      if (firstArticle && i > 0) {
        const prev = elements[i - 1]
        if (prev && prev.tagName === 'P') {
          const img = prev.querySelector('img')
          if (img) {
            const remoteSrc = img.getAttribute('src')
            imageUrl = resolveLocalImage(remoteSrc, folderPath) || (remoteSrc ? cleanArticleUrl(remoteSrc) : null)
          }
        }
      }

      links.push({
        title,
        url,
        description: description || null,
        imageUrl: imageUrl || null,
        featured: firstArticle
      })
      firstArticle = false
    }
  }

  return { quote, intro, links, book, additionalLinks, sponsor: null }
}

function parseButtondownBook (elements, startIdx, folderPath) {
  let title = null
  let author = null
  let description = null
  let coverImageUrl = null
  let amazonUs = null
  let amazonUk = null

  for (let i = startIdx + 1; i < Math.min(startIdx + 8, elements.length); i++) {
    const el = elements[i]
    if (el.tagName === 'HR') break

    if (el.tagName === 'P') {
      // Title/author link: <a><strong>Title, by Author</strong></a>
      const link = el.querySelector('a')
      const strong = el.querySelector('strong')

      if (link && !title) {
        // Use the full text of the paragraph/link, not just <strong>
        // Author may be outside <strong> tag: <a><strong>Title</strong>, by Author</a>
        // or: <a><strong>Title, by Author</strong></a>
        const linkText = textContent(link)
        const fullElText = textContent(el)
        // Prefer the paragraph text over just link text, for "by" outside the link
        const text = fullElText.includes(', by ') ? fullElText : linkText
        // Match ", by Author" — use last occurrence of ", by " to handle commas in titles
        const byIdx = text.lastIndexOf(', by ')
        if (byIdx !== -1) {
          title = text.slice(0, byIdx).trim()
          author = text.slice(byIdx + 5).trim()
        } else {
          title = strong ? textContent(strong) : linkText
        }
      }

      // Cover image
      const img = el.querySelector('img')
      if (img && !coverImageUrl) {
        const remoteSrc = img.getAttribute('src')
        coverImageUrl = resolveLocalImage(remoteSrc, folderPath) || (remoteSrc ? cleanArticleUrl(remoteSrc) : null)
      }

      // Description: plain text paragraph (no links, no images)
      if (!link && !img && !description) {
        const text = textContent(el)
        if (text && text.length > 20) {
          description = text
        }
      }

      // Amazon links
      const allLinks = el.querySelectorAll('a[href*="amazon"]')
      for (const al of allLinks) {
        const href = al.getAttribute('href')
        if (href.includes('amazon.com') && !amazonUs) amazonUs = stripUtmParams(href)
        if (href.includes('amazon.co.uk') && !amazonUk) amazonUk = stripUtmParams(href)
      }
    }
  }

  if (!title) return null
  return { title, author, description, coverImageUrl, amazonUs, amazonUk }
}

// --- Main Parser ---

function parseIssue (folderPath, slug) {
  const htmlPath = join(folderPath, 'original.html')
  if (!existsSync(htmlPath)) return null

  const html = readFileSync(htmlPath, 'utf-8')
  const dom = new JSDOM(html)
  const doc = dom.window.document

  // Outer wrapper metadata (common to all templates)
  const dateEl = doc.querySelector('date')
  const date = dateEl ? parseDate(textContent(dateEl)) : null

  const subjectEl = doc.querySelector('h1.subject')
  const subjectText = subjectEl ? textContent(subjectEl) : ''
  let { issueNumber, title } = parseSubject(subjectText)

  // Fallback: extract issue number from slug (e.g., "458-an-interactive-intro-to-crdts")
  if (!issueNumber) {
    const slugMatch = slug.match(/^(\d+)-/)
    if (slugMatch) issueNumber = parseInt(slugMatch[1], 10)
  }

  const emailBodyContent = doc.querySelector('.email-body-content')
  if (!emailBodyContent) {
    console.error(`  No .email-body-content found in ${slug}`)
    return null
  }

  const templateType = detectTemplate(emailBodyContent)

  let parsed
  switch (templateType) {
    case 'old-mailchimp':
      parsed = parseOldMailchimp(emailBodyContent, folderPath)
      break
    case 'mce-mailchimp':
      parsed = parseMceMailchimp(emailBodyContent, folderPath)
      break
    case 'buttondown-markdown':
      parsed = parseButtondownMarkdown(emailBodyContent, folderPath)
      break
  }

  // Clean the title (strip issue prefixes/suffixes, leading emoji)
  title = cleanTitle(title) || title

  return {
    issueNumber,
    title,
    slug,
    date,
    templateType,
    intro: parsed.intro || null,
    quote: parsed.quote || null,
    links: parsed.links || [],
    book: parsed.book || null,
    additionalLinks: parsed.additionalLinks || null,
    sponsor: parsed.sponsor || null
  }
}

// --- CLI Runner ---

const args = process.argv.slice(2)
const dryRun = args.includes('--dry-run')
const folderIdx = args.indexOf('--folder')
const singleFolder = folderIdx !== -1 ? args[folderIdx + 1] : null

let folders
if (singleFolder) {
  folders = [singleFolder]
} else {
  folders = readdirSync(ARCHIVES_DIR).filter(f => {
    if (f === 'issue-urls.txt') return false
    const full = join(ARCHIVES_DIR, f)
    return statSync(full).isDirectory()
  })
}

let processed = 0
let failed = 0
const templateCounts = { 'old-mailchimp': 0, 'mce-mailchimp': 0, 'buttondown-markdown': 0 }

for (const folder of folders) {
  const folderPath = join(ARCHIVES_DIR, folder)
  if (!statSync(folderPath).isDirectory()) continue

  try {
    const result = parseIssue(folderPath, folder)
    if (!result) {
      console.error(`  SKIP: ${folder} (no original.html or no email-body-content)`)
      failed++
      continue
    }

    templateCounts[result.templateType]++

    if (dryRun) {
      console.log(`[DRY RUN] ${folder} → ${result.templateType}, #${result.issueNumber}, ${result.links.length} links`)
    } else {
      const outPath = join(folderPath, 'metadata.json')
      writeFileSync(outPath, JSON.stringify(result, null, 2) + '\n')
      console.log(`  OK: ${folder} → ${result.templateType}, #${result.issueNumber}, ${result.links.length} links`)
    }
    processed++
  } catch (err) {
    console.error(`  FAIL: ${folder} → ${err.message}`)
    failed++
  }
}

console.log(`\n--- Summary ---`)
console.log(`Processed: ${processed}`)
console.log(`Failed: ${failed}`)
console.log(`Templates: old-mailchimp=${templateCounts['old-mailchimp']}, mce-mailchimp=${templateCounts['mce-mailchimp']}, buttondown-markdown=${templateCounts['buttondown-markdown']}`)
