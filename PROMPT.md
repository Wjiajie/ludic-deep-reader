# Ludic Deep Reader — Implementation Task & TODO

Based on the architecture design document `output/ludic-deep-reader/architecture_design.md`, complete the ludic-deep-reader skill. The script calls involved have defined interfaces in the `output/ludic-deep-reader/scripts/` directory; you only need to implement the specific logic for each interface. Do not add new function interfaces unless necessary. You can also refer to `ref/游戏化阅读技能设计文档.md` to understand the design purpose of this skill.

---

## Key Architecture Decisions

### 1. Frontend: Rich Markdown (in-chat rendering)

All UI output uses **Rich Markdown** rendered directly in the chat stream. No external web server or HTML pages.

**Implementation rules:**
- Use emoji-based progress bars: `🟩🟩🟩🟩🟩⬜⬜⬜⬜⬜ 50%`
- Use Markdown tables for status dashboards
- Use ASCII/Unicode box-drawing for panels and cards
- Use code blocks for structured data display
- All `render_ui.js` functions must return `{ type: string, markdown: string }` instead of HTML

**Example output format:**
```
⚔️ Quest: Define 'Virtù' in Chapter 1
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📊 XP: 120/200  Level 1 → Apprentice
🔮 Mana: ████████░░ 80/100
📖 Phase: 🔍 Scouting

| Item | Count |
|------|-------|
| 📜 Terms | 3 |
| 💎 Propositions | 1 |
| ⚡ Arguments | 0 |
```

### 2. Semantic Validation: Local Vector Embedding (no external API)

Use **`@huggingface/transformers`** (transformers.js) to run embedding models locally via ONNX Runtime. No API keys required.

**Tech stack:**
- **Embedding model**: `Xenova/all-MiniLM-L6-v2` (ONNX format, ~23MB, auto-downloaded on first use)
- **Embedding library**: `@huggingface/transformers` — runs ONNX models locally in Node.js
- **Vector storage**: `vectra` — file-backed, in-memory vector DB for Node.js (JSON index files)
- **Similarity metric**: Cosine similarity (built into vectra)

**Book Import Pipeline (user-initiated):**

The vectorization is triggered when the **user explicitly asks to read a specific book**. The full pipeline is:

1. **User specifies a book** → provides the EPUB file path
2. **EPUB splitting** → `process_epub.js` calls `libs/epub2MD` to convert EPUB into per-chapter Markdown files
3. **Chunking** → each chapter Markdown is split into semantic chunks (paragraphs / sections)
4. **Vectorization** → each chunk is embedded via `embedding_client.js` and stored into a per-book vectra index
5. **Ready** → the book is now searchable and the game state is initialized

**How semantic validation works (at query time):**
1. When a user submits an answer (term definition, proposition, etc.), the answer is embedded locally
2. Cosine similarity is computed against the stored ground-truth embeddings in the book's vector index
3. Score > 0.7 = valid, 0.5-0.7 = partial (with hints), < 0.5 = invalid

**Implementation target file**: `scripts/utils/embedding_client.js` (NEW)

```javascript
// Pseudo-code for the embedding client
import { pipeline } from '@huggingface/transformers';

let embedder = null;

export async function getEmbedding(text) {
  if (!embedder) {
    embedder = await pipeline('feature-extraction', 'Xenova/all-MiniLM-L6-v2');
  }
  const output = await embedder(text, { pooling: 'mean', normalize: true });
  return Array.from(output.data);
}

export function cosineSimilarity(vecA, vecB) {
  const dot = vecA.reduce((sum, a, i) => sum + a * vecB[i], 0);
  return dot; // vectors are already normalized
}
```

### 3. Data Persistence: JSON File (keep current approach)

Keep the current JSON-file-based persistence in `db_operations.js`. The SQLite schema in `database-schema.md` serves as reference but is NOT required for MVP. JSON is simpler and has no native dependency issues.

---

## TODO Checklist

### Phase 1: Core Infrastructure (Foundation)

- [ ] **1.1 Fix EPUB Processing** — `scripts/process_epub.js`
  - Integrate the real `libs/epub2MD` library instead of mock data
  - Implement actual EPUB → Markdown chapter splitting
  - Store chapter files to output directory and return real metadata
  - Implement chunk splitting: split each chapter Markdown into semantic chunks (by paragraph / heading)
  - Handle error cases (corrupted EPUB, empty chapters)

- [ ] **1.2 Add Local Embedding Client** — `scripts/utils/embedding_client.js` [NEW]
  - Install `@huggingface/transformers` and `vectra` as dependencies
  - Implement `getEmbedding(text)` using `Xenova/all-MiniLM-L6-v2`
  - Implement `cosineSimilarity(vecA, vecB)` utility
  - Implement `createIndex(bookId)` and `addToIndex(bookId, text, metadata)`
  - Implement `searchSimilar(bookId, queryText, topK)` for similarity matching
  - Handle first-run model download gracefully (progress feedback)
  - Add index persistence (save/load from disk per book)

- [ ] **1.4 Book Import Pipeline Orchestration** — `scripts/process_epub.js` or new `scripts/import_book.js`
  - Orchestrate the full user-initiated import flow:
    1. User specifies a book (EPUB path) → call `processEpub()` to split into Markdown chapters
    2. Split chapters into semantic chunks (paragraphs/sections)
    3. Call `embedding_client.js` to vectorize all chunks and store in per-book vectra index
    4. Insert book metadata and chapters into DB via `db_operations.js`
    5. Initialize game state (Phase: SCOUTING, XP: 0, Mana: 100)
  - Return a ready-to-play book object with vectorized index path

- [ ] **1.3 Complete DB Operations** — `scripts/db_operations.js`
  - Add `addArgument(db, bookId, argument)` and `getArguments(db, bookId)`
  - Add `addQuest(db, bookId, quest)` and `getQuests(db, bookId)`
  - Add `updateQuestStatus(db, bookId, questId, status)`
  - Add `addCritique(db, bookId, critique)` and `getCritiques(db, bookId)`
  - Add `updateGameStateField(db, bookId, field, value)` for partial updates (combo_count, book_classification, unity_statement)

### Phase 2: Semantic Validation (Intelligence)

- [ ] **2.1 Rewrite validate_answer.js** — Replace all mock validators with embedding-based logic
  - `validateAnswer()`: Use embedding similarity instead of Jaccard index
  - `validateBookClassification()`: Compare user classification against book metadata keywords
  - `validateUnityStatement()`: Embed user statement and compare with book summary/TOC embeddings
  - `validateTermDefinition()`: Embed user definition and compare with contextual embedding of the term's surrounding text
  - `validateProposition()`: Embed proposition and check similarity against source paragraph
  - `validateArgumentChain()`: Verify logical coherence between premise embeddings and conclusion
  - `validateCritique()`: Ensure critique references actual book content (embedding match)

- [ ] **2.2 Implement Understanding Verification** — `validate_answer.js`
  - `generateVerificationQuestions()`: Extract key sentences from chapter, create fill-in / rephrasing questions
  - `evaluateUnderstandingVerification()`: Use embedding similarity to score answers against source text

### Phase 3: Game Engine Enhancement (Depth)

- [ ] **3.1 Dynamic Quest Generation** — `scripts/game_engine.js`
  - `generateQuest()`: Use chapter content to generate contextual quests (not static templates)
  - Generate phase-appropriate tasks based on actual paragraph/section content
  - Track quest history to avoid repeating similar quests

- [ ] **3.2 Combo & DDA Systems** — `scripts/game_engine.js`
  - Add `combo_count` tracking to game state
  - Implement combo streak logic: 3 consecutive correct → 2x XP multiplier
  - Implement Dynamic Difficulty Adjustment (DDA):
    - Track consecutive failures per user
    - After 2 failures: provide extra hints
    - After 3 failures: reduce task difficulty (e.g., proposition → keyword identification)
    - After rest: reset difficulty

### Phase 4: UI Rendering (Experience)

- [ ] **4.1 Rewrite render_ui.js** — All functions output Rich Markdown instead of HTML
  - `renderDashboard()`: Emoji progress bars + Markdown table for stats
  - `renderReadingView()`: Chapter text with inline tool prompts
  - `renderXPBar()`: `🟩🟩🟩⬜⬜ 60/100 XP`
  - `renderManaGauge()`: Color-coded emoji gauge `🔮 ████░░ 60%`
  - `renderQuestCard()`: Bordered quest description with reward info
  - `renderQuestComplete()`: Celebration message with XP breakdown
  - `renderQuestFailed()`: Failure message with hints list
  - `renderTermsPanel()`: Numbered glossary table
  - `renderPropositionsPanel()`: Propositions as ordered list
  - `renderArgumentBuilder()`: Step-by-step argument building prompt
  - `renderTermDialog()`: Inline prompt for term definition input
  - `renderClassificationQuiz()`: Numbered choice list
  - `renderCritiqueInterface()`: Structured critique submission prompt
  - `renderLevelUp()`: Celebration banner with ASCII art
  - `renderComboStreak()`: Streak counter with fire emoji
  - `renderRestPrompt()`: Warning message with rest instruction

### Phase 5: Integration & Demo (Polish)

- [ ] **5.1 Update demo.js** — End-to-end flow with real data
  - Replace mock EPUB with a real test EPUB file
  - Demonstrate full cycle: upload → scouting → hunting → alchemy → judgment
  - Show Rich Markdown output at each stage

- [ ] **5.2 Update package.json** — Add all dependencies
  - `@huggingface/transformers`
  - `vectra`
  - `fs-extra` (already present)

- [ ] **5.3 Update SKILL.md** — Reflect Rich Markdown output format
  - Update UI section to describe Markdown rendering approach
  - Add embedding model info to technical requirements
  - Document first-run model download behavior

### Phase 6: Advanced Features (Stretch Goals)

- [ ] **6.1 Domain Adapters** — Fiction/History mode switching
  - Fiction: Terms → Characters, Propositions → Events, Arguments → Narrative Arcs
  - History: Add timeline construction, cause-effect chain validation
  - Implement adapter pattern in `game_engine.js`

- [ ] **6.2 Boss Battle System** — Chapter/book-end challenges
  - Design Boss dialogue tree structure
  - Implement "Tribunal of Truth" critique flow
  - Require understanding verification before critique unlock

- [ ] **6.3 Syntopical Reading** — Multi-book comparison (future)
  - Cross-book term alignment
  - Multi-book proposition comparison
  - "Grand Council" debate simulation
