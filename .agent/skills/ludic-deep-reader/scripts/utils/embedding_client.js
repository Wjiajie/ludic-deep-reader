
import path from 'path';
import fs from 'fs';
import { LocalIndex } from 'vectra';

/**
 * embedding_client.js
 *
 * Local vector embedding and similarity search using:
 * - @huggingface/transformers (Xenova/all-MiniLM-L6-v2) for embedding
 * - vectra for file-backed in-memory vector storage and search
 *
 * No external API keys required — everything runs locally.
 */

// ============ Embedding Model ============

let embedder = null;
let transformersModule = null;

/**
 * Lazy-load the transformers pipeline. The model (~23MB) is
 * auto-downloaded on first use and cached locally.
 */
async function getEmbedder() {
    if (embedder) return embedder;

    if (!transformersModule) {
        // Dynamic import to avoid top-level await issues
        transformersModule = await import('@huggingface/transformers');
    }

    console.log('Loading embedding model (first run may download ~23MB)...');
    embedder = await transformersModule.pipeline(
        'feature-extraction',
        'Xenova/all-MiniLM-L6-v2',
        {
            dtype: 'fp32',
            progress_callback: (data) => {
                if (data.status === 'progress') {
                    const percent = data.progress ? (data.progress).toFixed(1) : 0;
                    if (data.file) {
                        process.stdout.write(`\r⬇️  Downloading ${data.file}: ${percent}%`);
                    }
                } else if (data.status === 'done') {
                    process.stdout.write(`\r✅ ${data.file} downloaded.\n`);
                }
            }
        }
    );
    console.log('Embedding model loaded.');
    return embedder;
}

/**
 * Generate an embedding vector for a text string.
 * @param {string} text - Input text to embed
 * @returns {Promise<number[]>} - Normalized embedding vector (384 dimensions)
 */
export async function getEmbedding(text) {
    const pipe = await getEmbedder();
    const output = await pipe(text, { pooling: 'mean', normalize: true });
    return Array.from(output.data);
}

/**
 * Compute cosine similarity between two normalized vectors.
 * @param {number[]} vecA - First embedding vector
 * @param {number[]} vecB - Second embedding vector
 * @returns {number} - Similarity score (-1 to 1, higher = more similar)
 */
export function cosineSimilarity(vecA, vecB) {
    if (vecA.length !== vecB.length) {
        throw new Error(`Vector dimensions must match: ${vecA.length} vs ${vecB.length}`);
    }
    let dot = 0;
    for (let i = 0; i < vecA.length; i++) {
        dot += vecA[i] * vecB[i];
    }
    return dot; // Vectors are already normalized, so dot product = cosine similarity
}

// ============ Vector Index Management ============

const indexCache = new Map();

/**
 * Get or create a vectra index for a specific book.
 * Indexes are stored on disk at `<dataDir>/<bookId>/vectra_index/`.
 *
 * @param {string} bookId - Unique book identifier
 * @param {string} dataDir - Base data directory
 * @returns {Promise<LocalIndex>} - Vectra LocalIndex instance
 */
export async function getIndex(bookId, dataDir) {
    const cacheKey = `${dataDir}:${bookId}`;
    if (indexCache.has(cacheKey)) {
        return indexCache.get(cacheKey);
    }

    const indexPath = path.join(dataDir, bookId, 'vectra_index');

    const index = new LocalIndex(indexPath);

    // Create the index if it doesn't exist
    if (!await index.isIndexCreated()) {
        await index.createIndex();
    }

    indexCache.set(cacheKey, index);
    return index;
}

/**
 * Add a text chunk to the vector index for a book.
 *
 * @param {string} bookId - Book identifier
 * @param {string} dataDir - Base data directory
 * @param {string} text - Text to embed and store
 * @param {Object} metadata - Metadata to store with the vector
 * @param {number} metadata.chapterIndex - Chapter index
 * @param {number} metadata.chunkIndex - Chunk index within chapter
 * @param {string} metadata.type - Chunk type ('heading', 'paragraph')
 * @returns {Promise<void>}
 */
export async function addToIndex(bookId, dataDir, text, metadata) {
    const index = await getIndex(bookId, dataDir);
    const vector = await getEmbedding(text);

    await index.insertItem({
        vector,
        metadata: {
            text,
            ...metadata,
        },
    });
}

/**
 * Batch-add multiple text chunks to the index.
 * More efficient than individual addToIndex calls.
 *
 * @param {string} bookId - Book identifier
 * @param {string} dataDir - Base data directory
 * @param {Array<{text: string, metadata: Object}>} items - Items to add
 * @param {Function} [onProgress] - Optional progress callback (current, total)
 * @returns {Promise<number>} - Number of items added
 */
export async function batchAddToIndex(bookId, dataDir, items, onProgress) {
    const index = await getIndex(bookId, dataDir);
    let added = 0;

    for (let i = 0; i < items.length; i++) {
        const { text, metadata } = items[i];

        if (!text || text.trim().length === 0) continue;

        try {
            const vector = await getEmbedding(text);
            await index.insertItem({
                vector,
                metadata: { text, ...metadata },
            });
            added++;
        } catch (err) {
            console.warn(`Failed to embed chunk ${i}: ${err.message}`);
        }

        if (onProgress) {
            onProgress(i + 1, items.length);
        }
    }

    return added;
}

/**
 * Search for similar texts in the book's vector index.
 *
 * @param {string} bookId - Book identifier
 * @param {string} dataDir - Base data directory
 * @param {string} queryText - Text to search for
 * @param {number} [topK=5] - Number of results to return
 * @returns {Promise<Array<{text: string, score: number, metadata: Object}>>}
 */
export async function searchSimilar(bookId, dataDir, queryText, topK = 5) {
    const index = await getIndex(bookId, dataDir);
    const queryVector = await getEmbedding(queryText);

    const results = await index.queryItems(queryVector, topK);

    return results.map((result) => ({
        text: result.item.metadata.text,
        score: result.score,
        metadata: result.item.metadata,
    }));
}

/**
 * Find the line number of a text chunk within a file.
 *
 * @param {string} filePath - Path to the Markdown file
 * @param {string} text - Text to find
 * @returns {number} - 1-indexed line number, or 1 if not found
 */
function findLineNumber(filePath, text) {
    if (!fs.existsSync(filePath)) return 1;

    const content = fs.readFileSync(filePath, 'utf-8');
    const lines = content.split('\n');

    // Clean the search text (take first line or first 50 chars for matching)
    const firstLineOfChunk = text.split('\n')[0].trim();
    if (!firstLineOfChunk) return 1;

    for (let i = 0; i < lines.length; i++) {
        if (lines[i].includes(firstLineOfChunk)) {
            return i + 1; // 1-indexed
        }
    }

    return 1;
}

/**
 * Enhanced search that also retrieves neighboring chunks for context.
 *
 * @param {string} bookId - Book identifier
 * @param {string} dataDir - Base data directory
 * @param {string} queryText - Text to search for
 * @param {number} [topK=5] - Number of results to return
 * @returns {Promise<Array<{text: string, score: number, metadata: Object}>>}
 */
export async function searchSimilarExpanded(bookId, dataDir, queryText, topK = 5) {
    const index = await getIndex(bookId, dataDir);
    const queryVector = await getEmbedding(queryText);

    // 1. Get initial similarities
    const results = await index.queryItems(queryVector, topK);
    if (results.length === 0) return [];

    // 2. Load all items to find neighbors
    const allItems = await index.listItems();

    // Group items by chapter for easy neighborhood lookup
    // Map<chapterIndex, Map<chunkIndex, text>>
    const chapterMap = new Map();
    for (const item of allItems) {
        const { chapterIndex, chunkIndex, text } = item.metadata;
        if (!chapterMap.get(chapterIndex)) {
            chapterMap.set(chapterIndex, new Map());
        }
        chapterMap.get(chapterIndex).set(chunkIndex, text);
    }

    // 3. Expand context for each result
    return results.map((result) => {
        const { chapterIndex, chunkIndex } = result.item.metadata;
        const chunksInChapter = chapterMap.get(chapterIndex);

        let expandedText = '';
        const prev = chunksInChapter ? chunksInChapter.get(chunkIndex - 1) : null;
        const curr = result.item.metadata.text;
        const next = chunksInChapter ? chunksInChapter.get(chunkIndex + 1) : null;

        if (prev) expandedText += prev + '\n\n';
        expandedText += curr;
        if (next) expandedText += '\n\n' + next;

        // Calculate file URI for the full chapter
        const paddedIndex = String(chapterIndex).padStart(3, '0');
        const chapterFile = path.resolve(dataDir, bookId, `chapter_${paddedIndex}.md`);

        // Find precise line number for the 'curr' chunk
        const line = findLineNumber(chapterFile, curr);
        const fileUri = `file:///${chapterFile.replace(/\\/g, '/')}${line > 1 ? '#L' + line : ''}`;

        return {
            text: expandedText,
            score: result.score,
            metadata: {
                ...result.item.metadata,
                fileUri
            },
            isExpanded: true
        };
    });
}

/**
 * Compute similarity score between a user answer and a reference text.
 * This is the main validation function used by validate_answer.js.
 *
 * @param {string} userAnswer - User's submitted answer
 * @param {string} referenceText - Ground truth / expected answer
 * @returns {Promise<{score: number, verdict: string}>}
 */
export async function computeSimilarity(userAnswer, referenceText) {
    const vecA = await getEmbedding(userAnswer);
    const vecB = await getEmbedding(referenceText);
    const score = cosineSimilarity(vecA, vecB);

    let verdict;
    if (score > 0.7) {
        verdict = 'valid';
    } else if (score > 0.5) {
        verdict = 'partial';
    } else {
        verdict = 'invalid';
    }

    return { score, verdict };
}

/**
 * Search the book index and return a similarity verdict for a user answer.
 * Finds the best matching chunk and uses that as the reference for scoring.
 *
 * @param {string} bookId - Book identifier
 * @param {string} dataDir - Base data directory
 * @param {string} userAnswer - User's submitted answer
 * @param {number} [topK=3] - Number of chunks to consider
 * @returns {Promise<{score: number, verdict: string, bestMatch: Object}>}
 */
export async function validateAgainstIndex(bookId, dataDir, userAnswer, topK = 3) {
    const results = await searchSimilar(bookId, dataDir, userAnswer, topK);

    if (results.length === 0) {
        return { score: 0, verdict: 'invalid', bestMatch: null };
    }

    const bestMatch = results[0];
    let verdict;
    if (bestMatch.score > 0.7) {
        verdict = 'valid';
    } else if (bestMatch.score > 0.5) {
        verdict = 'partial';
    } else {
        verdict = 'invalid';
    }

    return {
        score: bestMatch.score,
        verdict,
        bestMatch: {
            text: bestMatch.text,
            chapterIndex: bestMatch.metadata.chapterIndex,
            chunkIndex: bestMatch.metadata.chunkIndex,
        },
    };
}
