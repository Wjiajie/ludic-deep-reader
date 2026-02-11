
import path from 'path';
import { processEpub, splitIntoChunks } from './process_epub.js';
import { batchAddToIndex } from './utils/embedding_client.js';
import { initDb, addBook, addChapter, initializeGameState } from './db_operations.js';

/**
 * import_book.js
 *
 * Orchestrates the full user-initiated book import pipeline:
 *   1. User specifies an EPUB file path
 *   2. processEpub() splits the EPUB into per-chapter Markdown files
 *   3. Each chapter is chunked into semantic segments
 *   4. All chunks are vectorized and stored in a per-book vectra index
 *   5. Book metadata and chapters are written to the JSON database
 *   6. Game state is initialized (Phase: SCOUTING, XP: 0, Mana: 100)
 */

/**
 * Import a book from an EPUB file and prepare it for the reading game.
 *
 * @param {string} epubPath - Path to the EPUB file
 * @param {string} dataDir  - Base data directory for storing output
 * @param {string} dbPath   - Path to the JSON database file
 * @param {Object} [options] - Optional configuration
 * @param {Function} [options.onProgress] - Progress callback (stage, current, total)
 * @returns {Promise<{bookId: string, metadata: Object, chunkCount: number}>}
 */
export async function importBook(epubPath, dataDir, dbPath, options = {}) {
    const { onProgress } = options;
    const report = (stage, current, total) => {
        if (onProgress) onProgress(stage, current, total);
        else console.log(`[${stage}] ${current}/${total}`);
    };

    // ── Step 1: Parse EPUB and generate chapter Markdown files ──
    report('epub_parsing', 0, 1);
    const metadata = await processEpub(epubPath, dataDir);
    report('epub_parsing', 1, 1);

    const { id: bookId, chapters } = metadata;
    console.log(`📖 Parsed "${metadata.title}" — ${chapters.length} chapters`);

    // ── Step 2: Chunk all chapters into semantic segments ──
    report('chunking', 0, chapters.length);
    const allChunks = [];

    for (let i = 0; i < chapters.length; i++) {
        const chapter = chapters[i];
        const chunks = splitIntoChunks(chapter.content, { maxChunkSize: 500, minChunkSize: 50 });

        for (const chunk of chunks) {
            allChunks.push({
                text: chunk.text,
                metadata: {
                    chapterIndex: chapter.index,
                    chapterTitle: chapter.title,
                    chunkIndex: chunk.index,
                    type: chunk.type,
                },
            });
        }

        report('chunking', i + 1, chapters.length);
    }

    console.log(`🔪 Created ${allChunks.length} chunks from ${chapters.length} chapters`);

    // ── Step 3: Vectorize all chunks and store in vectra index ──
    report('vectorizing', 0, allChunks.length);

    const addedCount = await batchAddToIndex(bookId, dataDir, allChunks, (current, total) => {
        report('vectorizing', current, total);
    });

    console.log(`🧮 Vectorized ${addedCount} chunks into index for book ${bookId}`);

    // ── Step 4: Store book metadata and chapters in database ──
    report('db_write', 0, 1);
    const db = initDb(dbPath);

    addBook(db, {
        id: bookId,
        title: metadata.title,
        author: metadata.author,
        language: metadata.language,
        chapterCount: chapters.length,
        coverImage: metadata.coverImage || '',
        importedAt: metadata.importedAt,
    });

    for (const chapter of chapters) {
        addChapter(db, bookId, {
            index: chapter.index,
            title: chapter.title,
            content: chapter.content,
            wordCount: chapter.wordCount,
        });
    }

    // ── Step 5: Initialize game state ──
    initializeGameState(db, bookId);
    report('db_write', 1, 1);

    console.log(`✅ Book "${metadata.title}" imported successfully!`);
    console.log(`   Book ID: ${bookId}`);
    console.log(`   Chapters: ${chapters.length}`);
    console.log(`   Vector chunks: ${addedCount}`);
    console.log(`   Database: ${dbPath}`);

    return {
        bookId,
        metadata,
        chunkCount: addedCount,
    };
}
