import path from 'path';
import { fileURLToPath } from 'url';
import { importBook } from './scripts/import_book.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

 async function main() {
    const epubPath = process.argv[2];
    if (!epubPath) {
        console.error('Usage: node import_cli.js <epub_path>');
        process.exit(1);
    }

    const dataDir = path.join(__dirname, 'data');
    const dbPath = path.join(dataDir, 'ludic_data.json');

    console.log(`📚 Importing book: ${epubPath}`);

    try {
        await importBook(epubPath, dataDir, dbPath, {
            onProgress: (stage, current, total) => {
                console.log(`  [${stage}] ${current}/${total}`);
            }
        });
        console.log('\n✅ Import complete!');
    } catch (error) {
        console.error('❌ Import failed:', error);
        process.exit(1);
    }
}

main();
