
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { importBook } from './scripts/import_book.js';
import { initializeState, awardXP, modifyMana, generateQuest, checkPhaseProgression, advancePhase } from './scripts/game_engine.js';
import { renderDashboard, renderReadingView, renderQuestCard, renderQuestComplete, renderQuestFailed, renderLevelUp } from './scripts/render_ui.js';
import { validateAnswer, validateBookClassification } from './scripts/validate_answer.js';


// Setup paths
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DATA_DIR = path.join(__dirname, 'data');
const DB_PATH = path.join(DATA_DIR, 'ludic_data.json');

// Ensure data directory exists
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

async function runDemo() {
  console.log("🎮 Ludic Deep Reader - Demo Start");

  // 1. Check for EPUB file argument
  const args = process.argv.slice(2);
  let bookId;

  if (args.length > 0 && fs.existsSync(args[0])) {
    const epubPath = args[0];
    console.log(`📚 Importing EPUB: ${epubPath}`);
    try {
      const result = await importBook(epubPath, DATA_DIR, DB_PATH, {
        onProgress: (stage, current, total) => {
          process.stdout.write(`\r[Import] ${stage}: ${current}/${total}   `);
        }
      });
      console.log("\r\n✨ Import Complete!");
      bookId = result.bookId;
    } catch (err) {
      console.error("\r\n❌ Import Failed:", err);
      return;
    }
  } else {
    // If no file provided, check if we have any books in DB
    // For demo purposes, we will fail if no book is found.
    // (In a real app, we'd list books)
    console.log("⚠️ No EPUB file provided. Usage: node demo.js <path-to-epub>");
    // Try to load the last imported book from DB if exists
    // (Simplified fetch from JSON)
    try {
      if (fs.existsSync(DB_PATH)) {
        const dbData = JSON.parse(fs.readFileSync(DB_PATH, 'utf8'));
        if (dbData.books && dbData.books.length > 0) {
          bookId = dbData.books[dbData.books.length - 1].id;
          console.log(`📂 Loaded existing book ID: ${bookId} ("${dbData.books[dbData.books.length - 1].title}")`);
        }
      }
    } catch (e) { /* ignore */ }

    if (!bookId) {
      console.error("❌ No books found in database. Please run with an EPUB file to start.");
      return;
    }
  }

  // 2. Initialize Game Session
  console.log("\n--- 🏁 Starting Game Session ---");

  // Create a mock context
  const context = {
    bookId,
    dataDir: DATA_DIR
  };

  // Initialize State (in memory for demo)
  let state = initializeState();

  // Mock Book & Inventory
  const book = { title: "Demo Book", description: "A classic text." }; // This should come from DB
  const inventory = {
    bookClassified: false,
    unityStatement: false,
    terms: [],
    propositions: [],
    arguments: []
  };

  // 3. Render Dashboard (SCOUTING Phase)
  console.log("\n[🖥️ UI Output]");
  console.log(renderDashboard(state, book).markdown);

  // 4. Generate Quest
  const chapterMock = { content: "This is a sample chapter content for quest generation logic testing." };
  const quest = generateQuest(state, chapterMock);
  console.log(renderQuestCard(quest).markdown);

  // 5. Simulate User Actions
  console.log("\n--- 🖱️ User Action: Classify Book ---");
  const userClassification = "Philosophy / Political Science"; // Right answer for The Prince

  // Validation (Mocking book content for validation for now if pure demo)
  // In real flow, validateBookClassification searches the index.
  const valResult = await validateBookClassification(
    userClassification,
    book,
    "This book discusses principalities, armies, and political power." // Mock context
  );

  if (valResult.valid) {
    inventory.bookClassified = true;
    const xpResult = awardXP(state, 'BOOK_CLASSIFIED');
    state = xpResult.state;
    console.log(renderQuestComplete(valResult, xpResult.xpGained).markdown);
    console.log(renderLevelUp({ newLevel: state.level, newTitle: "Novice" }).markdown);
  } else {
    state = modifyMana(state, -10, "Wrong Classification").state;
    console.log(renderQuestFailed(valResult, 10).markdown);
  }

  // 6. Check Phase Progression
  console.log("\n--- 🔄 Check Phase Progression ---");
  const progress = checkPhaseProgression(state, inventory);
  if (!progress.ready) {
    console.log(`⚠️ Cannot advance phase. Missing: ${progress.missing.join(', ')}`);
  } else {
    state = advancePhase(state);
    console.log(`🚀 Advanced to Phase: ${state.currentPhase}`);
  }

  // 7. Render Final Dashboard
  console.log("\n[🖥️ Final UI Output]");
  console.log(renderDashboard(state, book).markdown);
}

runDemo().catch(console.error);
