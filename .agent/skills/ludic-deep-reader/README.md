
# 🎮 Ludic Deep Reader (Demo)

This is a demonstration of the **Ludic Deep Reader** agent skill, showcasing:
- **EPUB Processing**: Real-time parsing and chunking.
- **Local AI**: Semantic vectorization using `transformers.js` (no API keys needed).
- **Gamification**: XP, Mana, Combos, and Dynamic Quests.
- **Rich UI**: Interactive Markdown-based interface.

## 🚀 Setup

1. **Install Dependencies**:
   ```bash
   npm install
   ```
   *(This will install `epub2md`, `@huggingface/transformers`, `vectra`, etc.)*

2. **Prepare an EPUB**:
   Place a valid `.epub` file in this directory (e.g., `test.epub`).

## ▶️ Run Demo

Run the demo script with your EPUB file:

```bash
node demo.js path/to/your/book.epub
```

### What to Expect:
1. **Import Phase**: The script will parse the EPUB, split it into chapters, chunk the text, and generate vector embeddings (this may take a moment on first run to download the model).
2. **Game Start**: You'll see the **Dashboard** with your stats (Level 1 Novice).
3. **Quest Generation**: A contextual quest will be generated based on a random chapter snippet.
4. **Interaction**: The demo simulates a user action (Classifying the book) and validates it against the vector index.
5. **Progression**: You'll see XP awards, Level Up notifications, and Phase advancement.

## 📁 Project Structure

- `demo.js`: Main entry point for this demo.
- `scripts/`:
  - `import_book.js`: Orchestrates the import pipeline.
  - `process_epub.js`: Handles EPUB parsing and chunking.
  - `utils/embedding_client.js`: Manages local embeddings and vector search.
  - `game_engine.js`: Core game logic (XP, Mana, Quests).
  - `render_ui.js`: Generates the Markdown UI.
  - `validate_answer.js`: Handles semantic validation.
  - `db_operations.js`: Manages the JSON database.
- `data/`: Stores the SQLite/JSON database and vector indices.
