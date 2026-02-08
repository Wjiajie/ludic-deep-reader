/**
 * game_engine.js
 *
 * Core game mechanics: XP calculation, level progression,
 * phase transitions, mana management, and quest system.
 */

// ============ Constants ============

export const XP_REWARDS = {
  BOOK_CLASSIFIED: 50,
  UNITY_STATEMENT: 30,
  TERM_DEFINED: 20,
  PROPOSITION_EXTRACTED: 25,
  ARGUMENT_BUILT: 50,
  VALID_CRITIQUE: 100,
  CHAPTER_COMPLETE: 75,
  COMBO_MULTIPLIER: 2
};

export const MANA_COSTS = {
  WRONG_ANSWER: -10,
  HINT_REQUEST: -15,
  PARTIAL_ANSWER: -20,
  REST_RECOVERY: 20,
  RESTATEMENT_SUCCESS: 15
};

export const LEVELS = [
  { level: 1, title: 'Novice', xpRequired: 0 },
  { level: 2, title: 'Apprentice', xpRequired: 200 },
  { level: 3, title: 'Scholar', xpRequired: 500 },
  { level: 4, title: 'Master', xpRequired: 1000 },
  { level: 5, title: 'Sage', xpRequired: 2000 }
];

export const PHASES = {
  SCOUTING: 'SCOUTING',
  HUNTING: 'HUNTING',
  ALCHEMY: 'ALCHEMY',
  JUDGMENT: 'JUDGMENT'
};

// ============ XP System ============

/**
 * Award XP for an action
 * @param {GameState} state - Current game state
 * @param {string} action - Action type from XP_REWARDS
 * @param {number} comboCount - Current combo count (optional)
 * @returns {XPResult} - Updated state and feedback
 */
export function awardXP(state, action, comboCount = 0) {
  // TODO: Implementation
  // 1. Calculate base XP from action
  // 2. Apply combo multiplier if applicable
  // 3. Check for level up
  // 4. Return updated state and feedback message
  throw new Error('Not implemented');
}

/**
 * Calculate level from total XP
 * @param {number} xp - Total XP
 * @returns {LevelInfo} - Current level information
 */
export function calculateLevel(xp) {
  // TODO: Implementation
  throw new Error('Not implemented');
}

/**
 * Check if user leveled up
 * @param {number} oldXP - Previous XP
 * @param {number} newXP - New XP
 * @returns {LevelUpResult|null} - Level up info or null
 */
export function checkLevelUp(oldXP, newXP) {
  // TODO: Implementation
  throw new Error('Not implemented');
}

// ============ Mana System ============

/**
 * Modify mana (can be positive or negative)
 * @param {GameState} state - Current game state
 * @param {number} amount - Mana change amount
 * @param {string} reason - Reason for change
 * @returns {ManaResult} - Updated state and feedback
 */
export function modifyMana(state, amount, reason) {
  // TODO: Implementation
  // 1. Apply mana change (clamp 0-100)
  // 2. Check for exhaustion (mana = 0)
  // 3. Return updated state and any warnings
  throw new Error('Not implemented');
}

/**
 * Check if user needs rest
 * @param {GameState} state - Current game state
 * @returns {boolean} - True if rest required
 */
export function needsRest(state) {
  // TODO: Implementation
  throw new Error('Not implemented');
}

/**
 * Apply rest recovery
 * @param {GameState} state - Current game state
 * @returns {GameState} - Updated state with recovered mana
 */
export function applyRest(state) {
  // TODO: Implementation
  throw new Error('Not implemented');
}

// ============ Phase System ============

/**
 * Check if user can advance to next phase
 * @param {GameState} state - Current game state
 * @param {Inventory} inventory - User's inventory
 * @returns {PhaseCheckResult} - Can advance and requirements status
 */
export function canAdvancePhase(state, inventory) {
  // TODO: Implementation
  // Check phase-specific requirements:
  // SCOUTING → HUNTING: book classified, unity statement, outline
  // HUNTING → ALCHEMY: 5+ terms defined
  // ALCHEMY → JUDGMENT: 3+ propositions, 1+ argument
  throw new Error('Not implemented');
}

/**
 * Advance to next phase
 * @param {GameState} state - Current game state
 * @returns {GameState} - Updated state with new phase
 */
export function advancePhase(state) {
  // TODO: Implementation
  throw new Error('Not implemented');
}

/**
 * Get available tools for current phase
 * @param {string} phase - Current phase
 * @returns {string[]} - Array of available tool names
 */
export function getAvailableTools(phase) {
  // TODO: Implementation
  const toolsByPhase = {
    SCOUTING: ['scan_structure', 'classify_book'],
    HUNTING: ['log_term', 'define_term'],
    ALCHEMY: ['extract_proposition', 'build_argument'],
    JUDGMENT: ['critique_argument', 'verify_understanding']
  };
  return toolsByPhase[phase] || [];
}

// ============ Quest System ============

/**
 * Generate a quest for current context
 * @param {GameState} state - Current game state
 * @param {ChapterContent} chapter - Current chapter content
 * @returns {Quest} - Generated quest
 */
export function generateQuest(state, chapter) {
  // TODO: Implementation
  // Generate contextual quest based on phase and progress
  throw new Error('Not implemented');
}

/**
 * Validate quest completion
 * @param {Quest} quest - Active quest
 * @param {UserSubmission} submission - User's answer
 * @returns {QuestResult} - Validation result
 */
export function validateQuest(quest, submission) {
  // TODO: Implementation
  throw new Error('Not implemented');
}

/**
 * Complete a quest and apply rewards
 * @param {GameState} state - Current game state
 * @param {Quest} quest - Completed quest
 * @param {QuestResult} result - Validation result
 * @returns {GameState} - Updated state with rewards
 */
export function completeQuest(state, quest, result) {
  // TODO: Implementation
  throw new Error('Not implemented');
}

// ============ Type Definitions ============

/**
 * @typedef {Object} XPResult
 * @property {GameState} state - Updated game state
 * @property {number} xpGained - XP gained
 * @property {string} message - Feedback message
 * @property {LevelUpResult|null} levelUp - Level up info if occurred
 */

/**
 * @typedef {Object} LevelInfo
 * @property {number} level - Current level
 * @property {string} title - Level title
 * @property {number} xpForNext - XP needed for next level
 * @property {number} progress - Progress percentage to next level
 */

/**
 * @typedef {Object} LevelUpResult
 * @property {number} oldLevel
 * @property {number} newLevel
 * @property {string} newTitle
 * @property {string[]} unlockedFeatures
 */

/**
 * @typedef {Object} ManaResult
 * @property {GameState} state - Updated game state
 * @property {number} manaChange - Actual mana change
 * @property {boolean} exhausted - True if mana hit zero
 * @property {string} message - Feedback message
 */

/**
 * @typedef {Object} PhaseCheckResult
 * @property {boolean} canAdvance - True if can advance
 * @property {Object} requirements - Status of each requirement
 * @property {string[]} missing - List of unmet requirements
 */

/**
 * @typedef {Object} Quest
 * @property {string} id - Quest ID
 * @property {string} type - Quest type
 * @property {string} description - Quest description
 * @property {string} target - What to find/do
 * @property {number} xpReward - XP reward on completion
 * @property {Object} validation - Validation criteria
 */

/**
 * @typedef {Object} QuestResult
 * @property {boolean} success - Whether quest completed successfully
 * @property {number} score - Score 0-100
 * @property {string} feedback - Detailed feedback
 * @property {string[]} hints - Hints if failed
 */
