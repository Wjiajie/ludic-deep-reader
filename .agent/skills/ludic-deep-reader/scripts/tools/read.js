
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
    const chapterArg = process.argv[2];

    if (chapterArg === undefined) {
        console.log('\n❌ Error: Please provide a chapter index.');
        console.log('Usage: node scripts/tools/read.js [chapter_index]\n');
        process.exit(1);
    }

    const chapterIndex = parseInt(chapterArg, 10);

    // 1. Get the current active book info
    let bookId;
    try {
        const ludicData = JSON.parse(fs.readFileSync(LUDIC_DATA_PATH, 'utf8'));
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
        console.error('❌ No imported books found.');
        process.exit(1);
    }

    // 2. Locate the chapter file
    const bookDir = path.join(DATA_DIR, bookId);
    const fileName = `chapter_${String(chapterIndex).padStart(3, '0')}.md`;
    const filePath = path.join(bookDir, fileName);

    if (!fs.existsSync(filePath)) {
        console.error(`❌ Chapter file not found: ${fileName} (Index: ${chapterIndex})`);
        process.exit(1);
    }

    // 3. Output the File URI
    try {
        const fileUri = `file:///${filePath.replace(/\\/g, '/')}`;

        console.log(`\n🔗 [Link Generated]`);
        console.log(`Chapter Index: ${chapterIndex}`);
        console.log(`Open in Editor: ${fileUri}\n`);

    } catch (err) {
        console.error('❌ Path generation failed:', err.message);
    }
}

main();
