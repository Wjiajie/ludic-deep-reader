
import { searchSimilarExpanded } from '../utils/embedding_client.js';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Constants
const SKILL_ROOT = path.join(__dirname, '..', '..');
const DATA_DIR = path.join(SKILL_ROOT, 'data');
const LUDIC_DATA_PATH = path.join(DATA_DIR, 'ludic_data.json');

async function main() {
    const query = process.argv.slice(2).join(' ');

    if (!query) {
        console.log('\n❌ Error: Please provide a search query.');
        console.log('Usage: node scripts/tools/search.js "your search query"\n');
        process.exit(1);
    }

    // 1. Get the current active book ID
    let bookId;
    try {
        const ludicData = JSON.parse(fs.readFileSync(LUDIC_DATA_PATH, 'utf8'));
        // Default to the first book or the most recently updated state
        if (ludicData.game_states && ludicData.game_states.length > 0) {
            bookId = ludicData.game_states[0].book_id;
        } else if (ludicData.books && ludicData.books.length > 0) {
            bookId = ludicData.books[0].id;
        }
    } catch (err) {
        console.error('❌ Failed to read ludic_data.json:', err.message);
        process.exit(1);
    }

    if (!bookId) {
        console.error('❌ No imported books found in ludic_data.json.');
        process.exit(1);
    }

    console.log(`\n🔎 Searching for: "${query}" in Book: ${bookId}...`);
    console.log('⏳ Loading model and searching index...\n');

    try {
        const results = await searchSimilarExpanded(bookId, DATA_DIR, query, 8);

        if (results.length === 0) {
            console.log('📭 No relevant content found.');
            return;
        }

        console.log('🎯 Search Results:\n');
        results.forEach((res, i) => {
            const score = (res.score * 100).toFixed(2);
            console.log(`[Match ${i + 1}] Similarity: ${score}%`);
            console.log(`📍 Chapter: ${res.metadata.chapterTitle || 'Unknown'}`);
            if (res.metadata.fileUri) {
                console.log(`🔗 Link: ${res.metadata.fileUri}`);
            }
            console.log(`---`);
            console.log(`${res.text.trim()}`);
            console.log(`---\n`);
        });

    } catch (err) {
        console.error('❌ Search failed:', err.message);
    }
}

main();
