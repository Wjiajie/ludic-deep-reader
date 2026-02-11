
// ============ Constants ============

export const XP_TABLE = {
  BOOK_CLASSIFIED: 50,
  UNITY_STATEMENT: 30,
  TERM_DEFINED: 20,
  PROPOSITION_EXTRACTED: 25,
  ARGUMENT_BUILT: 50,
  VALID_CRITIQUE: 100,
  CHAPTER_COMPLETE: 75,
  COMBO_MULTIPLIER: 0.1 // +10% per combo streak
};

export const MANA_TABLE = {
  WRONG_ANSWER: -10,
  HINT_REQUEST: -15,
  PARTIAL_ANSWER: -5,
  REST_RECOVERY: 30,
  RESTATEMENT_SUCCESS: 15
};

export const LEVEL_THRESHOLDS = [
  { level: 1, title: 'Novice', xpRequired: 0 },
  { level: 2, title: 'Apprentice', xpRequired: 200 },
  { level: 3, title: 'Scholar', xpRequired: 500 },
  { level: 4, title: 'Master', xpRequired: 1000 },
  { level: 5, title: 'Sage', xpRequired: 2000 }
];

export const GAME_PHASES = {
  SCOUTING: 'SCOUTING',
  HUNTING: 'HUNTING',
  ALCHEMY: 'ALCHEMY',
  JUDGMENT: 'JUDGMENT'
};

export const LEVELS = LEVEL_THRESHOLDS;
export const PHASES = GAME_PHASES;
export const XP_REWARDS = XP_TABLE;
export const MANA_COSTS = MANA_TABLE;


// ============ State Management ============

export function initializeState() {
  return {
    level: 1,
    xpTotal: 0,
    mana: 100,
    currentPhase: GAME_PHASES.SCOUTING,
    comboCount: 0,
    consecutiveFailures: 0,
    inventory_visions: [],
    history: []
  };
}

// ============ XP & Level System ============

export function awardXP(state, actionType) {
  const baseXP = XP_TABLE[actionType] || 10;

  // Combo Bonus: 10% extra per streak count, capped at 2x (10 streak)
  const multiplier = 1 + Math.min(state.comboCount * XP_TABLE.COMBO_MULTIPLIER, 1);
  const xpGained = Math.round(baseXP * multiplier);

  const newState = {
    ...state,
    xpTotal: state.xpTotal + xpGained,
    comboCount: state.comboCount + 1, // Increment combo
    consecutiveFailures: 0 // Reset failures
  };

  // Check Level Up
  const levelUp = checkLevelUp(state.xpTotal, newState.xpTotal);
  if (levelUp) {
    newState.level = levelUp.newLevel;
    newState.mana = 100; // Full heal on level up
  }

  return {
    state: newState,
    xpGained,
    levelUp,
    message: `+${xpGained} XP ${state.comboCount > 0 ? `(x${multiplier.toFixed(1)} Combo!)` : ''}`
  };
}

function calculateLevel(xp) {
  for (let i = LEVEL_THRESHOLDS.length - 1; i >= 0; i--) {
    if (xp >= LEVEL_THRESHOLDS[i].xpRequired) {
      return LEVEL_THRESHOLDS[i];
    }
  }
  return LEVEL_THRESHOLDS[0];
}

function checkLevelUp(oldXP, newXP) {
  const oldLevel = calculateLevel(oldXP);
  const newLevel = calculateLevel(newXP);

  if (newLevel.level > oldLevel.level) {
    return {
      oldLevel: oldLevel.level,
      newLevel: newLevel.level,
      newTitle: newLevel.title
    };
  }
  return null;
}

// ============ Mana System ============

export function modifyMana(state, amount, reason) {
  let newMana = state.mana + amount;
  if (newMana > 100) newMana = 100;
  if (newMana < 0) newMana = 0;

  const newState = { ...state, mana: newMana };

  // If penalty (negative amount), reset combo
  if (amount < 0) {
    newState.comboCount = 0;
    newState.consecutiveFailures += 1;
  }

  return {
    state: newState,
    manaChange: amount,
    exhausted: newMana === 0,
    message: `Mana ${amount > 0 ? '+' : ''}${amount} (${reason})`
  };
}

// ============ Dynamic Quest Generation ============

/**
 * Generate a context-aware quest based on the current chapter content.
 * Uses DDA to adjust difficulty.
 */
export function generateQuest(state, chapter) {
  const phase = state.currentPhase;
  const difficulty = state.consecutiveFailures > 2 ? 'EASY' : 'NORMAL';

  const id = `quest_${Date.now()}`;
  let type = 'GENERIC';
  let description = '';
  let xpReward = 10;
  let target = '';

  // Helper to pick a random paragraph
  const paragraphs = chapter.content.split(/\n\n+/).filter(p => p.length > 50);
  const randomPara = paragraphs[Math.floor(Math.random() * paragraphs.length)] || "the chapter text";
  const snippet = randomPara.substring(0, 100) + "...";

  switch (phase) {
    case GAME_PHASES.SCOUTING:
      type = 'SCOUT';
      xpReward = 20;
      if (difficulty === 'EASY') {
        description = "Read the first paragraph and identify one keyword.";
        target = "Keyword Identification";
      } else {
        description = "Read the chapter and summarize its main theme in one sentence.";
        target = "Unity Statement";
      }
      break;

    case GAME_PHASES.HUNTING:
      type = 'HUNT';
      xpReward = 40;
      if (difficulty === 'EASY') {
        description = `Find the definition of a word in this section: "${snippet}"`;
        target = "Term Definition";
      } else {
        description = "Identify and define 2 key terms that are central to this chapter's argument.";
        target = "Term Logging";
      }
      break;

    case GAME_PHASES.ALCHEMY:
      type = 'ALCHEMY';
      xpReward = 50;
      if (difficulty === 'EASY') {
        description = `Find one declarative sentence in this paragraph: "${snippet}"`;
        target = "Proposition Extraction";
      } else {
        description = "Construct an argument by linking 2 propositions found in this chapter.";
        target = "Argument Building";
      }
      break;

    case GAME_PHASES.JUDGMENT:
      type = 'JUDGE';
      xpReward = 100;
      description = "Critique the author's main argument in this chapter using specific evidence.";
      target = "Critique";
      break;
  }

  return {
    id,
    type,
    description,
    target,
    xpReward,
    difficulty,
    createdAt: new Date().toISOString()
  };
}

// ============ Phase Transition ============

export function checkPhaseProgression(state, inventory) {
  // Logic to determine if ready for next phase
  // Returns { ready: boolean, missing: string[] }

  const missing = [];
  const counts = {
    terms: inventory.terms ? inventory.terms.length : 0,
    props: inventory.propositions ? inventory.propositions.length : 0,
    args: inventory.arguments ? inventory.arguments.length : 0
  };

  switch (state.currentPhase) {
    case GAME_PHASES.SCOUTING:
      if (!inventory.bookClassified) missing.push("Classify Book");
      if (!inventory.unityStatement) missing.push("Unity Statement");
      break;
    case GAME_PHASES.HUNTING:
      if (counts.terms < 5) missing.push(`Log 5 Terms (Grid: ${counts.terms}/5)`);
      break;
    case GAME_PHASES.ALCHEMY:
      if (counts.props < 3) missing.push(`Extract 3 Propositions (Grid: ${counts.props}/3)`);
      if (counts.args < 1) missing.push(`Build 1 Argument (Grid: ${counts.args}/1)`);
      break;
  }

  return {
    ready: missing.length === 0,
    missing
  };
}

export function advancePhase(state) {
  const order = [GAME_PHASES.SCOUTING, GAME_PHASES.HUNTING, GAME_PHASES.ALCHEMY, GAME_PHASES.JUDGMENT];
  const idx = order.indexOf(state.currentPhase);
  if (idx < order.length - 1) {
    return { ...state, currentPhase: order[idx + 1] };
  }
  return state;
}

// ============ Vision System (Rewards) ============

/**
 * Award an "Insight Vision" fragment (AI generated image reward).
 * Usually triggered for Unity Statements or successful Critiques.
 */
export function awardVision(state, concept, imagePath) {
  const visionFragment = {
    id: `vision_${Date.now()}`,
    concept,
    imagePath,
    timestamp: new Date().toISOString()
  };

  const newState = {
    ...state,
    inventory_visions: [...(state.inventory_visions || []), visionFragment]
  };

  return {
    state: newState,
    vision: visionFragment,
    message: `✨ [Vision Acquired] Your insight has manifested: "${concept}"`
  };
}
