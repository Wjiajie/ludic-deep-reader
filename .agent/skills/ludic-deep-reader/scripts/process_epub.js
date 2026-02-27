import path from 'path';
import fs from 'fs';
import { parseEpub } from 'epub2md';
import { randomUUID } from 'crypto';

function escapeRegExp(string) {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Process an EPUB file and extract its contents into per-chapter Markdown files.
 * Uses the epub2md library for EPUB parsing and Markdown conversion.
 *
 * @param {string} epubPath - Path to the EPUB file
 * @param {string} outputDir - Directory to store markdown chapter files
 * @returns {Promise<BookMetadata>} - Book metadata object
 */
export async function processEpub(epubPath, outputDir) {
  // 1. Validate input
  if (!fs.existsSync(epubPath)) {
    throw new Error(`EPUB file not found: ${epubPath}`);
  }

  // 2. Parse EPUB using epub2md
  const epub = await parseEpub(epubPath, { type: 'path' });

  // 3. Extract metadata
  const bookId = randomUUID();
  const markdownDir = path.join(outputDir, bookId);

  const metadata = {
    id: bookId,
    title: epub.info?.title || 'Unknown Title',
    author: Array.isArray(epub.info?.author)
      ? epub.info.author.join(', ')
      : (epub.info?.author || 'Unknown Author'),
    language: epub.info?.language || 'en',
    chapterCount: epub.sections ? epub.sections.length : 0,
    coverImage: '',
    importedAt: new Date().toISOString(),
    markdownDir,
    structure: epub.structure || [],
  };

  // 4. Create output directory
  if (!fs.existsSync(markdownDir)) {
    fs.mkdirSync(markdownDir, { recursive: true });
  }

  // 4.5. Extract images
  const assetsDir = path.join(markdownDir, 'assets');
  const imageFiles = [];
  try {
    const manifest = epub.getManifest();
    manifest.forEach(item => {
      if (item.href && item.href.match(/\.(jpg|jpeg|png|gif|svg|webp)$/i)) {
        try {
          const buffer = epub.resolve(item.href).asNodeBuffer();
          if (!fs.existsSync(assetsDir)) {
            fs.mkdirSync(assetsDir, { recursive: true });
          }
          const basename = path.basename(item.href);
          fs.writeFileSync(path.join(assetsDir, basename), buffer);
          imageFiles.push({ href: item.href, basename });
        } catch (e) {
          console.warn(`Failed to extract image: ${item.href}`, e.message);
        }
      }
    });
  } catch (e) {
    console.warn('Failed to parse epub manifest for images', e.message);
  }

  // 5. Convert sections to Markdown and save chapter files
  const chapters = [];
  if (epub.sections && epub.sections.length > 0) {
    epub.sections.forEach((section, index) => {
      const chapterData = sectionToMarkdown(section, index, epub.structure, imageFiles);
      const filePath = saveChapter(chapterData, markdownDir);
      chapters.push({ ...chapterData, filePath });
    });
  }

  metadata.chapters = chapters;
  return metadata;
}

/**
 * Extract table of contents structure from parsed EPUB
 * @param {Object} epub - Parsed EPUB object from epub2md
 * @returns {Array} - Hierarchical TOC structure
 */
export function extractTOC(epub) {
  if (!epub.structure) return [];

  const mapItem = (item) => ({
    title: item.name,
    sectionId: item.sectionId,
    path: item.path,
    playOrder: item.playOrder,
    children: item.children ? item.children.map(mapItem) : [],
  });

  return epub.structure.map(mapItem);
}

/**
 * Convert a single section to Markdown using epub2md's built-in converter.
 * @param {Section} section - EPUB section object (from epub2md)
 * @param {number} index - Chapter index
 * @param {Array} [structure] - Optional TOC structure for title lookup
 * @param {Array} [imageFiles] - Optional array of extracted image paths
 * @returns {ChapterMarkdown} - Converted markdown with metadata
 */
export function sectionToMarkdown(section, index, structure = [], imageFiles = []) {
  // Use epub2md's toMarkdown() method for conversion
  let content = '';
  try {
    content = section.toMarkdown ? section.toMarkdown() : (section.htmlString || '');
  } catch (e) {
    // Fallback to raw HTML if markdown conversion fails
    content = section.htmlString || '';
  }

  // Rewrite image links
  if (imageFiles && imageFiles.length > 0) {
    imageFiles.forEach(img => {
      const escapedBasename = escapeRegExp(img.basename);
      // Replace markdown images: ![alt](path/to/img.jpg) -> ![alt](assets/img.jpg)
      content = content.replace(new RegExp(`\\]\\([^)]*?${escapedBasename}\\)`, 'gi'), `](assets/${img.basename})`);
      // Replace HTML images: <img src="path/to/img.jpg"> -> <img src="assets/img.jpg">
      content = content.replace(new RegExp(`src="[^"]*?${escapedBasename}"`, 'gi'), `src="assets/${img.basename}"`);
    });
  }

  // Try to find a title from the TOC structure
  let title = `Chapter ${index + 1}`;
  if (structure && structure.length > 0) {
    const tocEntry = structure.find((item) => item.sectionId === section.id);
    if (tocEntry && tocEntry.name) {
      title = tocEntry.name;
    }
  }

  const wordCount = content.split(/\s+/).filter(w => w.length > 0).length;

  return {
    index,
    title,
    sectionId: section.id,
    content,
    wordCount,
  };
}

/**
 * Split chapter Markdown content into semantic chunks (by paragraph/heading).
 * Each chunk is a meaningful text segment suitable for vectorization.
 *
 * @param {string} markdownContent - Full chapter Markdown text
 * @param {Object} options - Chunking options
 * @param {number} [options.maxChunkSize=500] - Max characters per chunk
 * @param {number} [options.minChunkSize=50] - Min characters per chunk (skip smaller)
 * @returns {Array<{text: string, type: string, index: number}>} - Array of text chunks
 */
export function splitIntoChunks(markdownContent, options = {}) {
  const { maxChunkSize = 500, minChunkSize = 50 } = options;

  if (!markdownContent || markdownContent.trim().length === 0) {
    return [];
  }

  const chunks = [];
  let chunkIndex = 0;

  // Split by double newlines (paragraphs) or headings
  const blocks = markdownContent.split(/\n{2,}/);

  let currentChunk = '';
  let currentType = 'paragraph';

  for (const block of blocks) {
    const trimmed = block.trim();
    if (trimmed.length === 0) continue;

    // Detect block type
    const isHeading = /^#{1,6}\s/.test(trimmed);
    const blockType = isHeading ? 'heading' : 'paragraph';

    // If adding this block would exceed maxChunkSize, flush current chunk
    if (currentChunk.length > 0 && (currentChunk.length + trimmed.length > maxChunkSize || isHeading)) {
      if (currentChunk.length >= minChunkSize) {
        chunks.push({
          text: currentChunk.trim(),
          type: currentType,
          index: chunkIndex++,
        });
      }
      currentChunk = '';
    }

    // If this single block exceeds maxChunkSize, split by sentences
    if (trimmed.length > maxChunkSize) {
      const sentences = trimmed.split(/(?<=[.!?。！？\n])\s*/);
      let sentenceChunk = '';
      for (const sentence of sentences) {
        if (sentenceChunk.length + sentence.length > maxChunkSize && sentenceChunk.length >= minChunkSize) {
          chunks.push({
            text: sentenceChunk.trim(),
            type: blockType,
            index: chunkIndex++,
          });
          sentenceChunk = '';
        }
        sentenceChunk += (sentenceChunk ? ' ' : '') + sentence;
      }
      if (sentenceChunk.length >= minChunkSize) {
        chunks.push({
          text: sentenceChunk.trim(),
          type: blockType,
          index: chunkIndex++,
        });
      }
    } else {
      currentChunk += (currentChunk ? '\n\n' : '') + trimmed;
      currentType = blockType;
    }
  }

  // Flush remaining
  if (currentChunk.length >= minChunkSize) {
    chunks.push({
      text: currentChunk.trim(),
      type: currentType,
      index: chunkIndex++,
    });
  }

  return chunks;
}

/**
 * Save chapter markdown to file with frontmatter.
 * @param {ChapterMarkdown} chapter - Chapter data
 * @param {string} outputDir - Output directory
 * @returns {string} - Path to saved file
 */
export function saveChapter(chapter, outputDir) {
  const fileName = `chapter_${String(chapter.index).padStart(3, '0')}.md`;
  const filePath = path.join(outputDir, fileName);

  const fileContent = `---
title: "${chapter.title}"
index: ${chapter.index}
section_id: "${chapter.sectionId || ''}"
word_count: ${chapter.wordCount}
---

${chapter.content}
`;

  fs.writeFileSync(filePath, fileContent);
  return filePath;
}
