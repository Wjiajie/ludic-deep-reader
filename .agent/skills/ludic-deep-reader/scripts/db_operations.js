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
      inventory_propositions: [],
      book_topics: [],       // 书籍主题标签
      neutral_terms: []      // 中立术语（主题阅读用）
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
        inventory_propositions: [],
        book_topics: [],
        neutral_terms: []
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
        inventory_propositions: [],
        book_topics: [],
        neutral_terms: []
      };
    }
    const data = JSON.parse(content);
    // Ensure new fields exist for older databases
    if (!data.book_topics) data.book_topics = [];
    if (!data.neutral_terms) data.neutral_terms = [];
    return data;
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

export function saveGameState(db, bookId, state, difficultyId = 'master') {
  const data = _readDb(db);

  // Create unique key based on book_id + difficulty for per-difficulty storage
  const stateKey = `${bookId}_${difficultyId}`;

  const existingIndex = data.game_states.findIndex(g => g.state_key === stateKey);

  const newState = {
    state_key: stateKey,
    book_id: bookId,
    difficulty_id: difficultyId,
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

export function getGameState(db, bookId, difficultyId = 'master') {
  const data = _readDb(db);
  const stateKey = `${bookId}_${difficultyId}`;
  return data.game_states.find(g => g.state_key === stateKey);
}

export function getAllGameStatesForBook(db, bookId) {
  const data = _readDb(db);
  return data.game_states.filter(g => g.book_id === bookId);
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


// ============ Book Topics (主题标签) CRUD ============

/**
 * Add a topic tag to a book
 */
export function addBookTopic(db, bookId, topic) {
  const data = _readDb(db);
  if (!data.book_topics) data.book_topics = [];

  // Check if topic already exists for this book
  const existing = data.book_topics.find(t => t.book_id === bookId && t.topic === topic);
  if (existing) return existing.id;

  const topicEntry = {
    id: `topic_${Date.now()}`,
    book_id: bookId,
    topic,
    created_at: new Date().toISOString()
  };

  data.book_topics.push(topicEntry);
  _writeDb(db, data);
  return topicEntry.id;
}

/**
 * Get all topics for a book
 */
export function getBookTopics(db, bookId) {
  const data = _readDb(db);
  if (!data.book_topics) return [];
  return data.book_topics.filter(t => t.book_id === bookId);
}

/**
 * Get all books with a specific topic
 */
export function getBooksByTopic(db, topic) {
  const data = _readDb(db);
  if (!data.book_topics) return [];

  const topicEntries = data.book_topics.filter(t => t.topic === topic);
  const bookIds = [...new Set(topicEntries.map(t => t.book_id))];

  // Get full book info
  return bookIds.map(id => data.books.find(b => b.id === id)).filter(Boolean);
}

/**
 * Get all topics with book counts
 */
export function getAllTopicsWithCounts(db) {
  const data = _readDb(db);
  if (!data.book_topics) return [];

  const topicMap = {};
  data.book_topics.forEach(t => {
    if (!topicMap[t.topic]) {
      topicMap[t.topic] = { topic: t.topic, bookCount: 0, bookIds: [] };
    }
    if (!topicMap[t.topic].bookIds.includes(t.book_id)) {
      topicMap[t.topic].bookCount++;
      topicMap[t.topic].bookIds.push(t.book_id);
    }
  });

  return Object.values(topicMap).filter(t => t.bookCount >= 2);
}

// ============ Neutral Terms (中立术语) CRUD ============

/**
 * Add a neutral term for syntopical reading
 */
export function addNeutralTerm(db, topic, term) {
  const data = _readDb(db);
  if (!data.neutral_terms) data.neutral_terms = [];

  const neutralTerm = {
    id: term.id || `neutral_${Date.now()}`,
    topic,
    term: term.term,
    definition: term.definition,
    source_terms: term.sourceTerms || [],  // Array of {bookId, bookTitle, originalTerm}
    created_at: new Date().toISOString()
  };

  data.neutral_terms.push(neutralTerm);
  _writeDb(db, data);
  return neutralTerm.id;
}

/**
 * Get all neutral terms for a topic
 */
export function getNeutralTerms(db, topic) {
  const data = _readDb(db);
  if (!data.neutral_terms) return [];
  return data.neutral_terms.filter(t => t.topic === topic);
}

/**
 * Get all topics with neutral terms
 */
export function getTopicsWithNeutralTerms(db) {
  const data = _readDb(db);
  if (!data.neutral_terms) return [];

  const topicSet = new Set(data.neutral_terms.map(t => t.topic));
  return [...topicSet];
}

// ============ Aliases & Helpers ============

export const addBook = insertBook;

export const initDb = initDatabase;

export function addChapter(db, bookId, chapter) {
  insertChapters(db, bookId, [chapter]);
}

export function initializeGameState(db, bookId, difficultyId = 'master') {
  saveGameState(db, bookId, {
    currentPhase: 'SCOUTING',
    currentChapter: 1,
    xpTotal: 0,
    mana: 100,
    level: 1,
    activeQuest: null
  }, difficultyId);
}

// ============ Milestone Cards CRUD ============

export function addMilestoneCard(db, bookId, difficultyId, milestone) {
  const data = _readDb(db);
  if (!data.milestone_cards) data.milestone_cards = [];

  data.milestone_cards.push({
    id: milestone.id,
    book_id: bookId,
    difficulty_id: difficultyId,
    phase: milestone.phase,
    stats: milestone.stats,
    created_at: milestone.timestamp
  });

  _writeDb(db, data);
}

export function getMilestoneCards(db, bookId, difficultyId = null) {
  const data = _readDb(db);
  if (!data.milestone_cards) return [];

  let cards = data.milestone_cards.filter(m => m.book_id === bookId);
  if (difficultyId) cards = cards.filter(m => m.difficulty_id === difficultyId);
  return cards.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
}

// ============ Book Summary CRUD ============

export function addBookSummary(db, bookId, difficultyId, summary) {
  const data = _readDb(db);
  if (!data.book_summaries) data.book_summaries = [];

  data.book_summaries.push({
    id: summary.id,
    book_id: bookId,
    difficulty_id: difficultyId,
    summary_data: summary,
    created_at: summary.timestamp
  });

  _writeDb(db, data);
}

export function getBookSummaries(db, bookId = null) {
  const data = _readDb(db);
  if (!data.book_summaries) return [];

  let summaries = data.book_summaries;
  if (bookId) summaries = summaries.filter(s => s.book_id === bookId);
  return summaries.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
}

// ============ Difficulty Migration (Switching Difficulty) ============

/**
 * Migrate game state from one difficulty to another
 * Preserves progress but updates XP based on new difficulty multiplier
 */
export function migrateGameStateDifficulty(db, bookId, fromDifficultyId, toDifficultyId, state) {
  const data = _readDb(db);

  // Check if target difficulty state already exists
  const targetKey = `${bookId}_${toDifficultyId}`;
  const existingTarget = data.game_states.find(g => g.state_key === targetKey);

  if (existingTarget) {
    return {
      success: false,
      reason: 'Target difficulty game state already exists',
      existingState: existingTarget
    };
  }

  // Create new state for target difficulty
  const newState = {
    state_key: targetKey,
    book_id: bookId,
    difficulty_id: toDifficultyId,
    current_phase: state.currentPhase,
    current_chapter: state.currentChapter,
    xp_total: state.xpTotal, // Keep same XP amount
    mana: state.mana,
    level: state.level,
    active_quest_id: state.activeQuest,
    last_updated: new Date().toISOString(),
    migrated_from: fromDifficultyId,
    migrated_at: new Date().toISOString()
  };

  data.game_states.push(newState);
  _writeDb(db, data);

  return {
    success: true,
    newState,
    message: `Successfully migrated from ${fromDifficultyId} to ${toDifficultyId}`
  };
}

/**
 * Delete game state for a specific difficulty (used when reverting)
 */
export function deleteGameStateByDifficulty(db, bookId, difficultyId) {
  const data = _readDb(db);
  const stateKey = `${bookId}_${difficultyId}`;

  const beforeCount = data.game_states.length;
  data.game_states = data.game_states.filter(g => g.state_key !== stateKey);
  const deleted = beforeCount !== data.game_states.length;

  if (deleted) {
    _writeDb(db, data);
  }

  return {
    success: deleted,
    deleted
  };
}

