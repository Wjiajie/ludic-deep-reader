# Ludic Deep Reader: Architecture Design Document

## 1. Overview
The **Ludic Deep Reader** is an Agent Skill designed to transform the solitary act of reading into a gamified, interactive quest. Based on Mortimer Adler's *How to Read a Book*, it utilizes a Progressive Disclosure mechanism to guide users from superficial inspection to deep analytical understanding.

## 2. System Architecture

The system follows a layered architecture compliant with the Model Context Protocol (MCP).

```mermaid
graph TD
    User[User / MCP Client] <-->|Interaction & UI Events| UI[Presentation Layer]
    UI <-->|API Calls| Logic[Logic Layer (The Ludic Engine)]
    Logic <-->|Read/Write| Data[Data Layer (The Library Core)]
    Logic <-->|File Ops| FS[File System (Markdown/EPUB)]
```

### 2.1 Presentation Layer (Client Integration)
*   **Responsibility**: Renders the gamified interface and captures user intent.
*   **Components**:
    *   **Interactive UI**: Rendered via MCP `display_resource` or specific tool outputs. Includes Progress Bars (Reading & Understanding), HP/Mana Bars, and Dialogue Trees.
    *   **Narrative Wrapper**: Presents system messages as "The Keeper of the Codex".

### 2.2 Logic Layer (The Ludic Engine)
*   **Responsibility**: Manages the game state, validates user inputs, and orchestrates the reading flow.
*   **Modules**:
    *   **Game Loop Manager**: Implements the RAF (Read-Action-Feedback) loop.
    *   **XP/Mana Calculator**: Handles economy (Intellect Points) and fatigue (Mana).
    *   **Progressive Disclosure Controller**: Determines which tools/skills are active based on User Level and Book Phase.
    *   **Book Processor**: Wrapper around `epub2MD` to convert raw EPUBs into traversable Markdown nodes.

### 2.3 Data Layer (The Library Core)
*   **Responsibility**: Persistence of book data and user progress.
*   **Storage**:
    *   **SQLite Database**: Stores structural metadata, user profiles, game state (inventory, quest logs), and annotations.
    *   **File System**: Stores the converted Markdown files of the books for easy retrieval and chunking.

## 3. Data Schema (SQLite)

### Tables
*   **Books**: `id`, `title`, `author`, `total_pages`, `difficulty_rating`, `file_path`, `structure_json`
*   **Users**: `id`, `username`, `current_level`, `total_xp`, `current_mana`
*   **ReadingState**: `user_id`, `book_id`, `current_chapter`, `phase` (INSPECTION | ANALYSIS_1/2/3 | SYNTOPICAL), `completion_percentage`
*   **Quests**: `id`, `book_id`, `type` (TERM | PROPOSITION | ARGUMENT), `content`, `status` (ACTIVE | COMPLETED), `xp_reward`
*   **Inventory**: `user_id`, `item_type` (TERM_CARD | LOGIC_KEY), `content`

## 4. Technical Stack
*   **Runtime**: Node.js
*   **Protocol**: Model Context Protocol (MCP)
*   **Database**: SQLite (via `better-sqlite3` or similar)
*   **EPUB Processing**: `epub2MD` (Local library)

## 5. Interface Design
See `scripts/` directory for detailed function signatures.
