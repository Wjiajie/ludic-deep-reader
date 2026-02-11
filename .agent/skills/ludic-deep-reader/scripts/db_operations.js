import fs from 'fs';
import path from 'path';

/**
 * Initialize the database with required tables (JSON file based)
 * @param {string} dbPath - Path to JSON database file
 * @returns {Object} - Database connection object (shim)
 */
export function initDatabase(dbPath) {
  // Ensure directory exists
  const dir = path.dirname(dbPath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  const db = { path: dbPath };

  // Initialize file if not exists
  if (!fs.existsSync(dbPath)) {
    _writeDb(db, {
      books: [],
      chapters: [],
      game_states: [],
      inventory_terms: [],
      inventory_propositions: []
    });
  }

  return db;
}

// ============ Helper Functions ============

function _readDb(db) {
  try {
    if (!fs.existsSync(db.path)) {
      return {
        books: [],
        chapters: [],
        game_states: [],
        inventory_terms: [],
        inventory_propositions: []
      };
    }
    const content = fs.readFileSync(db.path, 'utf8');
    // Handle empty file case
    if (!content.trim()) {
      return {
        books: [],
        chapters: [],
        game_states: [],
        inventory_terms: [],
        inventory_propositions: []
      };
    }
    return JSON.parse(content);
  } catch (err) {
    console.error('Error reading DB:', err);
    throw err;
  }
}

function _writeDb(db, data) {
  fs.writeFileSync(db.path, JSON.stringify(data, null, 2), 'utf8');
}

// ============ Book Operations ============

export function insertBook(db, metadata) {
  const data = _readDb(db);

  // Map camelCase inputs to snake_case storage to match SQL schema
  const book = {
    id: metadata.id,
    title: metadata.title,
    author: metadata.author,
    language: metadata.language,
    chapter_count: metadata.chapterCount,
    cover_image_path: metadata.coverImage,
    markdown_dir: metadata.markdownDir,
    imported_at: metadata.importedAt || new Date().toISOString()
  };

  data.books.push(book);
  _writeDb(db, data);
  return metadata.id;
}

export function getBook(db, bookId) {
  const data = _readDb(db);
  return data.books.find(b => b.id === bookId);
}

export function listBooks(db) {
  const data = _readDb(db);
  // ORDER BY imported_at DESC
  return data.books.sort((a, b) => {
    return new Date(b.imported_at) - new Date(a.imported_at);
  });
}

export function deleteBook(db, bookId) {
  const data = _readDb(db);

  // Cascade delete logic
  data.books = data.books.filter(b => b.id !== bookId);
  data.chapters = data.chapters.filter(c => c.book_id !== bookId);
  data.game_states = data.game_states.filter(g => g.book_id !== bookId);
  data.inventory_terms = data.inventory_terms.filter(i => i.book_id !== bookId);
  data.inventory_propositions = data.inventory_propositions.filter(p => p.book_id !== bookId);

  _writeDb(db, data);
}

// ============ Chapter Operations ============

export function insertChapters(db, bookId, chapters) {
  const data = _readDb(db);

  for (const chapter of chapters) {
    data.chapters.push({
      book_id: bookId,
      chapter_index: chapter.index,
      title: chapter.title,
      file_path: chapter.filePath,
      word_count: chapter.wordCount
    });
  }

  _writeDb(db, data);
}

export function getChapter(db, bookId, chapterIndex) {
  const data = _readDb(db);
  return data.chapters.find(c => c.book_id === bookId && c.chapter_index === chapterIndex);
}

// ============ Game State Operations ============

export function saveGameState(db, bookId, state) {
  const data = _readDb(db);

  const existingIndex = data.game_states.findIndex(g => g.book_id === bookId);

  const newState = {
    book_id: bookId,
    current_phase: state.currentPhase,
    current_chapter: state.currentChapter,
    xp_total: state.xpTotal,
    mana: state.mana,
    level: state.level,
    active_quest_id: state.activeQuest,
    last_updated: new Date().toISOString()
  };

  if (existingIndex >= 0) {
    // Update existing
    data.game_states[existingIndex] = {
      ...data.game_states[existingIndex],
      ...newState
    };
  } else {
    // Insert new
    data.game_states.push(newState);
  }

  _writeDb(db, data);
}

export function getGameState(db, bookId) {
  const data = _readDb(db);
  return data.game_states.find(g => g.book_id === bookId);
}

// ============ Inventory Operations ============

export function addTerm(db, bookId, term) {
  const data = _readDb(db);

  data.inventory_terms.push({
    id: term.id,
    book_id: bookId,
    word: term.word,
    definition: term.definition,
    context: term.context,
    chapter_index: term.chapterIndex,
    created_at: term.createdAt || new Date().toISOString()
  });

  _writeDb(db, data);
}

export function addProposition(db, bookId, proposition) {
  const data = _readDb(db);

  data.inventory_propositions.push({
    id: proposition.id,
    book_id: bookId,
    statement: proposition.statement,
    source: proposition.source,
    chapter_index: proposition.chapterIndex,
    related_term_ids: proposition.relatedTermIds, // Store as array directly
    created_at: proposition.createdAt || new Date().toISOString()
  });

  _writeDb(db, data);
}

export function getTerms(db, bookId) {
  const data = _readDb(db);
  return data.inventory_terms
    .filter(t => t.book_id === bookId)
    .sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
}

export function getPropositions(db, bookId) {
  const data = _readDb(db);
  const props = data.inventory_propositions
    .filter(p => p.book_id === bookId)
    .sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

  // Map to match the previous SQL return structure which parsed the JSON string
  return props.map(p => ({
    ...p,
    relatedTermIds: p.related_term_ids || []
  }));
}

// ============ Arguments CRUD ============

export function addArgument(db, bookId, argument) {
  const data = _readDb(db);
  if (!data.inventory_arguments) data.inventory_arguments = [];

  data.inventory_arguments.push({
    id: argument.id || `arg_${Date.now()}`,
    book_id: bookId,
    premises: argument.premises || [],
    conclusion: argument.conclusion,
    chapter_index: argument.chapterIndex,
    related_proposition_ids: argument.relatedPropositionIds || [],
    strength: argument.strength || 'unverified',
    created_at: argument.createdAt || new Date().toISOString()
  });

  _writeDb(db, data);
}

export function getArguments(db, bookId) {
  const data = _readDb(db);
  if (!data.inventory_arguments) return [];
  return data.inventory_arguments
    .filter(a => a.book_id === bookId)
    .sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
}

// ============ Quests CRUD ============

export function addQuest(db, bookId, quest) {
  const data = _readDb(db);
  if (!data.quests) data.quests = [];

  data.quests.push({
    id: quest.id || `quest_${Date.now()}`,
    book_id: bookId,
    type: quest.type,
    title: quest.title,
    description: quest.description,
    target: quest.target || null,
    xp_reward: quest.xpReward || 10,
    mana_cost: quest.manaCost || 5,
    status: quest.status || 'active',
    chapter_index: quest.chapterIndex,
    created_at: quest.createdAt || new Date().toISOString(),
    completed_at: null
  });

  _writeDb(db, data);
}

export function getQuests(db, bookId, status = null) {
  const data = _readDb(db);
  if (!data.quests) return [];
  let quests = data.quests.filter(q => q.book_id === bookId);
  if (status) quests = quests.filter(q => q.status === status);
  return quests.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
}

export function updateQuestStatus(db, bookId, questId, status) {
  const data = _readDb(db);
  if (!data.quests) return;
  const quest = data.quests.find(q => q.id === questId && q.book_id === bookId);
  if (quest) {
    quest.status = status;
    if (status === 'completed') quest.completed_at = new Date().toISOString();
    _writeDb(db, data);
  }
}

// ============ Critiques CRUD ============

export function addCritique(db, bookId, critique) {
  const data = _readDb(db);
  if (!data.critiques) data.critiques = [];

  data.critiques.push({
    id: critique.id || `crit_${Date.now()}`,
    book_id: bookId,
    type: critique.type, // 'agreement', 'disagreement', 'suspend_judgment'
    content: critique.content,
    reasoning: critique.reasoning || '',
    chapter_index: critique.chapterIndex,
    related_argument_ids: critique.relatedArgumentIds || [],
    created_at: critique.createdAt || new Date().toISOString()
  });

  _writeDb(db, data);
}

export function getCritiques(db, bookId) {
  const data = _readDb(db);
  if (!data.critiques) return [];
  return data.critiques
    .filter(c => c.book_id === bookId)
    .sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
}

// ============ Partial Game State Update ============

export function updateGameStateField(db, bookId, field, value) {
  const data = _readDb(db);
  const state = data.game_states.find(s => s.book_id === bookId);
  if (state) {
    state[field] = value;
    _writeDb(db, data);
  }
}


// ============ Aliases & Helpers ============

export const addBook = insertBook;

export const initDb = initDatabase;

export function addChapter(db, bookId, chapter) {
  insertChapters(db, bookId, [chapter]);
}

export function initializeGameState(db, bookId) {
  saveGameState(db, bookId, {
    currentPhase: 'SCOUTING',
    currentChapter: 1,
    xpTotal: 0,
    mana: 100,
    level: 1,
    activeQuest: null
  });
}

