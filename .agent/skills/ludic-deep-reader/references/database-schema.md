# Database Schema

SQLite schema for the Ludic Deep Reader skill.

## Tables

### books

Stores imported book metadata.

```sql
CREATE TABLE books (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    author TEXT,
    language TEXT DEFAULT 'en',
    chapter_count INTEGER NOT NULL,
    cover_image_path TEXT,
    markdown_dir TEXT NOT NULL,
    epub_path TEXT,
    imported_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

### chapters

Stores individual chapter information.

```sql
CREATE TABLE chapters (
    id TEXT PRIMARY KEY,
    book_id TEXT NOT NULL,
    chapter_index INTEGER NOT NULL,
    title TEXT,
    file_path TEXT NOT NULL,
    word_count INTEGER DEFAULT 0,
    FOREIGN KEY (book_id) REFERENCES books(id) ON DELETE CASCADE,
    UNIQUE(book_id, chapter_index)
);
```

### game_states

Stores user progress and game state per book.

```sql
CREATE TABLE game_states (
    book_id TEXT PRIMARY KEY,
    current_phase TEXT DEFAULT 'SCOUTING',
    current_chapter INTEGER DEFAULT 0,
    xp_total INTEGER DEFAULT 0,
    mana INTEGER DEFAULT 100,
    level INTEGER DEFAULT 1,
    active_quest_id TEXT,
    book_classification TEXT,
    unity_statement TEXT,
    combo_count INTEGER DEFAULT 0,
    last_updated DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (book_id) REFERENCES books(id) ON DELETE CASCADE
);
```

### terms

Stores collected terms (vocabulary).

```sql
CREATE TABLE terms (
    id TEXT PRIMARY KEY,
    book_id TEXT NOT NULL,
    word TEXT NOT NULL,
    definition TEXT NOT NULL,
    context TEXT,
    chapter_index INTEGER,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (book_id) REFERENCES books(id) ON DELETE CASCADE
);
```

### propositions

Stores extracted propositions.

```sql
CREATE TABLE propositions (
    id TEXT PRIMARY KEY,
    book_id TEXT NOT NULL,
    statement TEXT NOT NULL,
    source_text TEXT,
    chapter_index INTEGER,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (book_id) REFERENCES books(id) ON DELETE CASCADE
);
```

### arguments

Stores built logical arguments.

```sql
CREATE TABLE arguments (
    id TEXT PRIMARY KEY,
    book_id TEXT NOT NULL,
    conclusion TEXT NOT NULL,
    proposition_ids TEXT NOT NULL, -- JSON array of proposition IDs
    validity_score REAL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (book_id) REFERENCES books(id) ON DELETE CASCADE
);
```

### quests

Stores quest history.

```sql
CREATE TABLE quests (
    id TEXT PRIMARY KEY,
    book_id TEXT NOT NULL,
    quest_type TEXT NOT NULL,
    description TEXT,
    target TEXT,
    xp_reward INTEGER,
    status TEXT DEFAULT 'active', -- active, completed, failed
    score REAL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    completed_at DATETIME,
    FOREIGN KEY (book_id) REFERENCES books(id) ON DELETE CASCADE
);
```

### critiques

Stores user critiques of author arguments.

```sql
CREATE TABLE critiques (
    id TEXT PRIMARY KEY,
    book_id TEXT NOT NULL,
    critique_type TEXT NOT NULL, -- knowledge_gap, error, illogical, incomplete
    target_argument TEXT NOT NULL,
    evidence TEXT NOT NULL,
    validity_score REAL,
    verified_understanding BOOLEAN DEFAULT FALSE,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (book_id) REFERENCES books(id) ON DELETE CASCADE
);
```

## Indexes

```sql
CREATE INDEX idx_chapters_book ON chapters(book_id);
CREATE INDEX idx_terms_book ON terms(book_id);
CREATE INDEX idx_propositions_book ON propositions(book_id);
CREATE INDEX idx_arguments_book ON arguments(book_id);
CREATE INDEX idx_quests_book_status ON quests(book_id, status);
```

## Views

### book_progress

Combined view of book reading progress.

```sql
CREATE VIEW book_progress AS
SELECT
    b.id,
    b.title,
    b.chapter_count,
    gs.current_chapter,
    gs.current_phase,
    gs.xp_total,
    gs.level,
    (SELECT COUNT(*) FROM terms WHERE book_id = b.id) as terms_count,
    (SELECT COUNT(*) FROM propositions WHERE book_id = b.id) as propositions_count,
    (SELECT COUNT(*) FROM arguments WHERE book_id = b.id) as arguments_count,
    ROUND(gs.current_chapter * 100.0 / b.chapter_count, 1) as reading_percent
FROM books b
LEFT JOIN game_states gs ON b.id = gs.book_id;
```
