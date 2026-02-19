
// ============ Constants ============

export const XP_TABLE = {
  BOOK_CLASSIFIED: 50,
  UNITY_STATEMENT: 30,
  TERM_DEFINED: 20,
  PROPOSITION_EXTRACTED: 25,
  ARGUMENT_BUILT: 50,
  VALID_CRITIQUE: 100,
  CHAPTER_COMPLETE: 75,
  // 主题阅读 (Syntopical) 奖励
  TOPIC_ANALYZED: 150,       // 分析一个主题
  NEUTRAL_TERM_CREATED: 80,  // 创建中立术语
  CROSS_BOOK_COMPARISON: 120, // 跨书籍对比
  SYNTHESIS_CREATED: 200,    // 创建综合
  TOPIC_COMPLETE: 300,       // 主题阅读完成
  COMBO_MULTIPLIER: 0.1      // +10% per combo streak
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
  JUDGMENT: 'JUDGMENT',
  SYNTOPICAL: 'SYNTOPICAL'  // 主题阅读 - 最高阶段
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

    case GAME_PHASES.SYNTOPICAL:
      type = 'SYNTHESIS';
      xpReward = 150;
      if (difficulty === 'EASY') {
        description = "Analyze the common themes across your completed books and identify one key topic.";
        target = "Topic Identification";
      } else {
        description = "Build a neutral terminology system by comparing terms from different books on the same topic.";
        target = "Neutral Term System";
      }
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

/**
 * Check if user has met progress requirements to advance to next phase
 * @param {Object} state - Current game state
 * @param {Object} inventory - User's inventory (terms, propositions, arguments)
 * @param {string} difficultyId - Current difficulty level ID
 * @returns {Object} { ready: boolean, missing: string[] }
 */
export function checkPhaseProgression(state, inventory, difficultyId = 'master') {
  const missing = [];
  const counts = {
    terms: inventory.terms ? inventory.terms.length : 0,
    props: inventory.propositions ? inventory.propositions.length : 0,
    args: inventory.arguments ? inventory.arguments.length : 0
  };

  // Get difficulty-specific thresholds
  const thresholds = getProgressThresholds ? getProgressThresholds(difficultyId) : {
    terms: 5,
    propositions: 3,
    arguments: 1
  };

  switch (state.currentPhase) {
    case GAME_PHASES.SCOUTING:
      if (!inventory.bookClassified) missing.push("Classify Book");
      if (!inventory.unityStatement) missing.push("Unity Statement");
      break;
    case GAME_PHASES.HUNTING:
      if (counts.terms < thresholds.terms) {
        missing.push(`Log ${thresholds.terms} Terms (Collected: ${counts.terms}/${thresholds.terms})`);
      }
      break;
    case GAME_PHASES.ALCHEMY:
      if (counts.props < thresholds.propositions) {
        missing.push(`Extract ${thresholds.propositions} Propositions (Collected: ${counts.props}/${thresholds.propositions})`);
      }
      if (counts.args < thresholds.arguments) {
        missing.push(`Build ${thresholds.arguments} Argument(s) (Built: ${counts.args}/${thresholds.arguments})`);
      }
      break;
  }

  return {
    ready: missing.length === 0,
    missing
  };
}

export function advancePhase(state, allowSyntopical = false) {
  const baseOrder = [GAME_PHASES.SCOUTING, GAME_PHASES.HUNTING, GAME_PHASES.ALCHEMY, GAME_PHASES.JUDGMENT];
  const order = allowSyntopical ? [...baseOrder, GAME_PHASES.SYNTOPICAL] : baseOrder;
  const idx = order.indexOf(state.currentPhase);
  if (idx < order.length - 1) {
    return { ...state, currentPhase: order[idx + 1] };
  }
  return state;
}

// ============ Debug Mode (调试模式) ============

/**
 * Check if user input is a debug command
 */
export function isDebugCommand(input) {
  if (!input) return false;
  const cmd = input.toLowerCase().trim();
  return cmd === '/debug' || cmd === 'debug' || cmd.startsWith('/debug');
}

/**
 * Process debug command and return debug menu or execute debug action
 */
export function processDebugCommand(input, currentState) {
  const cmd = input.toLowerCase().trim();

  // Show debug menu
  if (cmd === '/debug' || cmd === 'debug') {
    return {
      isDebugMode: true,
      showMenu: true,
      message: '已进入调试模式'
    };
  }

  // Parse debug commands: /goto:PHASE
  if (cmd.startsWith('/goto:')) {
    const targetPhase = cmd.replace('/goto:', '').toUpperCase();
    const validPhases = ['SCOUTING', 'HUNTING', 'ALCHEMY', 'JUDGMENT', 'SYNTOPICAL'];

    if (validPhases.includes(targetPhase)) {
      const newState = {
        ...currentState,
        currentPhase: targetPhase,
        currentChapter: 1,  // Reset to chapter 1
        comboCount: 0,
        consecutiveFailures: 0
      };

      return {
        isDebugMode: true,
        isGoto: true,
        targetPhase,
        newState,
        message: `✅ 已跳转到阶段: ${targetPhase}`
      };
    } else {
      return {
        isDebugMode: true,
        isGoto: false,
        error: `无效的阶段: ${targetPhase}。可用阶段: ${validPhases.join(', ')}`
      };
    }
  }

  // Parse debug commands: /set:XP:100 or /set:LEVEL:5
  if (cmd.startsWith('/set:')) {
    const parts = cmd.replace('/set:', '').split(':');
    if (parts.length === 2) {
      const [key, value] = parts;
      const newState = { ...currentState };

      if (key === 'XP' || key === 'xp') {
        newState.xpTotal = parseInt(value) || 0;
        // Check for level up
        const levelInfo = LEVEL_THRESHOLDS.find(l => newState.xpTotal >= l.xpRequired);
        if (levelInfo) newState.level = levelInfo.level;
      } else if (key === 'LEVEL' || key === 'level') {
        newState.level = parseInt(value) || 1;
      } else if (key === 'MANA' || key === 'mana') {
        newState.mana = Math.min(100, Math.max(0, parseInt(value) || 100));
      } else if (key === 'PHASE' || key === 'phase') {
        newState.currentPhase = value.toUpperCase();
      }

      return {
        isDebugMode: true,
        isSet: true,
        newState,
        message: `✅ 已设置 ${key} = ${value}`
      };
    }
  }

  // Debug command to add test books/topics for syntopical testing
  if (cmd === '/debug:add_topics') {
    return {
      isDebugMode: true,
      isAddTopics: true,
      message: '调试: 准备添加测试主题'
    };
  }

  return {
    isDebugMode: false,
    showMenu: false
  };
}

/**
 * Get debug menu markdown
 */
export function getDebugMenu() {
  return `
## 🔧 调试模式

当前可用调试命令：

### 阶段跳转
| 命令 | 功能 |
|------|------|
| \`/goto:SCOUTING\` | 跳转到检视阅读 |
| \`/goto:HUNTING\` | 跳转到分析阅读I (狩猎) |
| \`/goto:ALCHEMY\` | 跳转到分析阅读II (炼金) |
| \`/goto:JUDGMENT\` | 跳转到分析阅读III (审判) |
| \`/goto:SYNTOPICAL\` | 跳转到主题阅读 |

### 数值设置
| 命令 | 功能 |
|------|------|
| \`/set:XP:数值\` | 设置经验值 |
| \`/set:LEVEL:数值\` | 设置等级 |
| \`/set:MANA:数值\` | 设置专注力 (0-100) |
| \`/set:PHASE:阶段\` | 设置当前阶段 |

### 测试数据
| 命令 | 功能 |
|------|------|
| \`/debug:add_topics\` | 添加测试主题数据 |

### 退出
| 命令 | 功能 |
|------|------|
| \`/exit_debug\` | 退出调试模式 |

---
*调试模式下无前置条件限制*
`;
}

// ============ Syntopical (主题阅读) System ============

/**
 * Check if the user can unlock syntopical reading
 * @param {Object} gameState - Current game state
 * @param {Object} syntopicalConfig - Syntopical config from difficulty
 * @param {Array} completedBooks - List of books with JUDGMENT phase completed
 * @param {Object} topicBooks - Map of topic -> books that have that topic
 * @returns {Object} { canUnlock: boolean, reason: string, eligibleTopics: string[] }
 */
export function checkSyntopicalUnlock(gameState, syntopicalConfig, completedBooks, topicBooks = {}) {
  const { enabled, minBooksForTopic, requirePhaseComplete } = syntopicalConfig;

  if (!enabled) {
    return {
      canUnlock: false,
      reason: '主题阅读仅在 Expert 难度中可用',
      eligibleTopics: []
    };
  }

  if (gameState.currentPhase !== GAME_PHASES.JUDGMENT) {
    return {
      canUnlock: false,
      reason: '需要先完成分析阅读 (Judgment) 阶段',
      eligibleTopics: []
    };
  }

  // 检查是否有足够数量的同主题书籍
  const eligibleTopics = [];

  for (const [topic, books] of Object.entries(topicBooks)) {
    if (books.length >= minBooksForTopic) {
      eligibleTopics.push(topic);
    }
  }

  // 如果没有预设主题，检查已完成书籍数量
  if (eligibleTopics.length === 0) {
    const bookCount = completedBooks.length;
    if (bookCount < minBooksForTopic) {
      return {
        canUnlock: false,
        reason: `需要至少 ${minBooksForTopic} 本同主题书籍才能开启主题阅读。当前完成书籍: ${bookCount}`,
        eligibleTopics: []
      };
    }
    // 如果没有主题标签，只要有 >= 2 本完成的书也可以
    if (bookCount >= minBooksForTopic) {
      return {
        canUnlock: true,
        reason: '您已有多本完成的书籍，可以开始主题阅读',
        eligibleTopics: ['自动检测']
      };
    }
  }

  return {
    canUnlock: true,
    reason: eligibleTopics.length > 0
      ? `发现 ${eligibleTopics.length} 个可用的主题`
      : '满足主题阅读条件',
    eligibleTopics
  };
}

/**
 * Generate a syntopical quest for cross-book comparison
 * @param {Object} state - Current game state
 * @param {Array} books - Books involved in syntopical reading
 * @param {string} topic - Selected topic
 * @returns {Object} Quest object
 */
export function generateSyntopicalQuest(state, books, topic) {
  const id = `syntopical_${Date.now()}`;

  return {
    id,
    type: 'SYNTHESIS',
    phase: GAME_PHASES.SYNTOPICAL,
    topic,
    books: books.map(b => ({ id: b.id, title: b.title })),
    description: `主题阅读：建立"${topic}"的中立术语体系`,
    xpReward: XP_TABLE.TOPIC_ANALYZED,
    target: 'Cross-Book Analysis',
    difficulty: state.consecutiveFailures > 2 ? 'EASY' : 'NORMAL',
    createdAt: new Date().toISOString()
  };
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
