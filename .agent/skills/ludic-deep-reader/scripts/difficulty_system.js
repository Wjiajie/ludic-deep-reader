// ============ Difficulty System ============

import fs from 'fs';
import path from 'path';

export const DIFFICULTY_LEVELS = {
  BEGINNER: {
    id: 'beginner',
    name: '初学者',
    xpMultiplier: 0.5,
    manaRecovery: 40,
    hintsAvailable: true,
    thresholds: {
      terms: 3,           // 3 terms instead of 5
      propositions: 2,    // 2 propositions instead of 3
      arguments: 1
    }
  },
  APPRENTICE: {
    id: 'apprentice',
    name: '学徒',
    xpMultiplier: 0.75,
    manaRecovery: 30,
    hintsAvailable: true,
    thresholds: {
      terms: 4,
      propositions: 3,
      arguments: 1
    }
  },
  MASTER: {
    id: 'master',
    name: '大师',
    xpMultiplier: 1.0,
    manaRecovery: 25,
    hintsAvailable: false,
    thresholds: {
      terms: 5,
      propositions: 3,
      arguments: 1
    }
  },
  EXPERT: {
    id: 'expert',
    name: '专家',
    xpMultiplier: 1.5,
    manaRecovery: 20,
    hintsAvailable: false,
    thresholds: {
      terms: 7,           // 7 terms required
      propositions: 5,    // 5 propositions required
      arguments: 2        // 2 arguments required
    },
    // 主题阅读配置（仅 Expert 难度）
    syntopicalConfig: {
      enabled: true,
      minBooksForTopic: 2,  // 需要至少 2 本同主题书
      requirePhaseComplete: true  // 需要先完成分析阅读
    }
  }
};

/**
 * Get difficulty configuration by id
 */
export function getDifficulty(difficultyId) {
  return DIFFICULTY_LEVELS[difficultyId] || DIFFICULTY_LEVELS.MASTER;
}

/**
 * Calculate XP reward based on difficulty
 */
export function calculateXP(baseXP, difficultyId) {
  const config = getDifficulty(difficultyId);
  return Math.round(baseXP * config.xpMultiplier);
}

/**
 * Calculate mana recovery based on difficulty
 */
export function calculateManaRecovery(baseRecovery, difficultyId) {
  const config = getDifficulty(difficultyId);
  return config.manaRecovery;
}

/**
 * Check if hints are available for the difficulty
 */
export function isHintsAvailable(difficultyId) {
  const config = getDifficulty(difficultyId);
  return config.hintsAvailable;
}

/**
 * Get progress thresholds for current difficulty
 */
export function getProgressThresholds(difficultyId) {
  const config = getDifficulty(difficultyId);
  return config.thresholds;
}

// ============ Syntopical (主题阅读) System ============

/**
 * Check if syntopical reading is enabled for a difficulty
 */
export function isSyntopicalEnabled(difficultyId) {
  const config = getDifficulty(difficultyId);
  return config.syntopicalConfig?.enabled || false;
}

/**
 * Get syntopical config for a difficulty
 */
export function getSyntopicalConfig(difficultyId) {
  const config = getDifficulty(difficultyId);
  return config.syntopicalConfig || { enabled: false, minBooksForTopic: 2, requirePhaseComplete: true };
}

/**
 * Render difficulty selection menu
 */
export function renderDifficultyMenu() {
  const levels = Object.values(DIFFICULTY_LEVELS);

  let menu = `## 🎮 Select Your Difficulty Level\n\n`;
  menu += `Choose the challenge that suits your reading goals:\n\n`;

  levels.forEach((level, idx) => {
    const hasSyntopical = level.syntopicalConfig?.enabled ? '🔱' : '';
    menu += `### ${idx + 1}. ${level.name} (${level.id.toUpperCase()}) ${hasSyntopical}\n`;
    menu += `- XP Multiplier: ${level.xpMultiplier}x\n`;
    menu += `- Requirements: ${level.thresholds.terms} terms, ${level.thresholds.propositions} props\n`;
    menu += `- Hints: ${level.hintsAvailable ? 'Available' : 'Not Available'}\n`;
    if (level.syntopicalConfig?.enabled) {
      menu += `- 🌟 包含主题阅读 (Syntopical Reading)\n`;
    }
    menu += `\n`;
  });

  menu += `🔱 = 包含主题阅读（最高阶段）\n\n`;
  menu += `Reply with \`difficulty: [beginner|apprentice|master|expert]\` to start.\n`;
  menu += `\n---\n`;
  menu += `💡 输入 \`/debug\` 进入调试模式（可自由跳转任意阶段）\n`;
  return menu;
}

/**
 * Render difficulty change menu (for switching during game)
 */
export function renderDifficultyChangeMenu(currentDifficultyId) {
  const levels = Object.values(DIFFICULTY_LEVELS);

  let menu = `## 🎮 Change Difficulty Level\n\n`;
  menu += `Current: **${getDifficulty(currentDifficultyId).name} (${currentDifficultyId.toUpperCase()})**\n\n`;
  menu += `Select a new difficulty level:\n\n`;

  levels.forEach((level, idx) => {
    const isCurrent = level.id === currentDifficultyId;
    const prefix = isCurrent ? '✅ **[CURRENT]**' : `${idx + 1}.`;
    menu += `${prefix} ${level.name} (${level.id.toUpperCase()})\n`;
    menu += `   XP: ${level.xpMultiplier}x | Terms: ${level.thresholds.terms} | Props: ${level.thresholds.propositions}\n\n`;
  });

  menu += `Reply with \`change_difficulty: [beginner|apprentice|master|expert]\` to switch.\n`;
  menu += `⚠️ **Note**: Switching difficulty will create a new game state for your current book.\n`;

  return menu;
}

// ============ Milestone Card System ============

/**
 * Generate a milestone card when a phase is completed
 */
export function generateMilestoneCard(phase, difficultyId, stats) {
  const config = getDifficulty(difficultyId);
  const phaseEmojis = {
    SCOUTING: '🔍',
    HUNTING: '🎯',
    ALCHEMY: '⚗️',
    JUDGMENT: '⚖️'
  };

  const phaseNames = {
    SCOUTING: 'Scouting Phase',
    HUNTING: 'Hunting Phase',
    ALCHEMY: 'Alchemy Phase',
    JUDGMENT: 'Judgment Phase'
  };

  return {
    id: `milestone_${Date.now()}`,
    phase,
    difficulty: difficultyId,
    emoji: phaseEmojis[phase] || '🏆',
    phaseName: phaseNames[phase] || phase,
    stats: {
      xp: stats.xpGained || 0,
      terms: stats.terms || 0,
      propositions: stats.propositions || 0,
      arguments: stats.arguments || 0
    },
    timestamp: new Date().toISOString()
  };
}

/**
 * Render milestone card as markdown
 */
export function renderMilestoneCard(milestone) {
  return {
    type: 'milestone-card',
    markdown: `
╔══════════════════════════════════════════════════╗
║  ${milestone.emoji} MILESTONE ACHIEVED! 🔱             ║
╠══════════════════════════════════════════════════╣
║                                                  ║
║  **${milestone.phaseName} Complete**              ║
║  Difficulty: **${milestone.difficulty.toUpperCase()}**                  ║
║  Time: ${new Date(milestone.timestamp).toLocaleString()} ║
║                                                  ║
╠══════════════════════════════════════════════════╣
║  📊 Statistics                                   ║
║  ─────────────────────────────────────────────  ║
║  🌟 XP Gained: +${milestone.stats.xp}                          ║
║  📜 Terms Collected: ${milestone.stats.terms}                         ║
║  💎 Propositions: ${milestone.stats.propositions}                         ║
║  ⚡ Arguments Built: ${milestone.stats.arguments}                        ║
║                                                  ║
╚══════════════════════════════════════════════════╝

*Keep pushing forward, reader!*
`
  };
}

// ============ Book Summary System ============

/**
 * Generate a book summary when the book is completed
 */
export function generateBookSummary(book, gameState, allMilestones, difficultyId) {
  const config = getDifficulty(difficultyId);
  const totalXP = gameState.xpTotal;
  const completionDate = new Date().toISOString();

  return {
    id: `summary_${Date.now()}`,
    bookId: book.id,
    bookTitle: book.title,
    author: book.author,
    difficulty: difficultyId,
    difficultyName: config.name,
    levelAchieved: gameState.level,
    totalXP: totalXP,
    phasesCompleted: {
      SCOUTING: allMilestones.find(m => m.phase === 'SCOUTING')?.stats || null,
      HUNTING: allMilestones.find(m => m.phase === 'HUNTING')?.stats || null,
      ALCHEMY: allMilestones.find(m => m.phase === 'ALCHEMY')?.stats || null,
      JUDGMENT: allMilestones.find(m => m.phase === 'JUDGMENT')?.stats || null
    },
    completionDate,
    timestamp: new Date().toISOString()
  };
}

/**
 * Render book summary as markdown
 */
export function renderBookSummary(summary) {
  const preamble = `---
title: Reading Summary - ${summary.bookTitle}
author: Ludic Deep Reader
date: ${summary.completionDate}
difficulty: ${summary.difficultyName}
---

# 📚 深度阅读总结报告
# Deep Reading Summary Report

## 📖 Book Information

- **Title**: ${summary.bookTitle}
- **Author**: ${summary.author}
- **Difficulty Level**: ${summary.difficultyName} (${summary.difficulty.toUpperCase()})
- **Completion Date**: ${new Date(summary.completionDate).toLocaleString('zh-CN')}
- **Final Level**: Level ${summary.levelAchieved}

---

## 🌟 Overall Achievement

- **Total XP Earned**: +${summary.totalXP}
- **Reading Sessions**: ${Object.values(summary.phasesCompleted).filter(p => p !== null).length} phases completed

---

## 📊 Phase-by-Phase Breakdown

### 🔍 Phase 1: Scouting ( scouting phase )
${summary.phasesCompleted.SCOUTING ?
`- XP: +${summary.phasesCompleted.SCOUTING.xp || 0}
- Progress: Initial exploration complete`
: '*Not completed*'}

### 🎯 Phase 2: Hunting ( hunting phase )
${summary.phasesCompleted.HUNTING ? `
- XP: +${summary.phasesCompleted.HUNTING.xp || 0}
- Terms Collected: ${summary.phasesCompleted.HUNTING.terms || 0}
- Key terminology identified
` : '*Not completed*'}

### ⚗️ Phase 3: Alchemy ( alchemy phase )
${summary.phasesCompleted.ALCHEMY ? `
- XP: +${summary.phasesCompleted.ALCHEMY.xp || 0}
- Propositions: ${summary.phasesCompleted.ALCHEMY.propositions || 0}
- Arguments Built: ${summary.phasesCompleted.ALCHEMY.arguments || 0}
` : '*Not completed*'}

### ⚖️ Phase 4: Judgment ( judgment phase )
${summary.phasesCompleted.JUDGMENT ? `
- XP: +${summary.phasesCompleted.JUDGMENT.xp || 0}
- Critical thinking applied
` : '*Not completed*'}

---

## 🏆 Reflections & Key Takeaways

*"Reading this book at the ${summary.difficultyName} level has helped me develop deeper analytical capabilities and critical thinking skills."*

---

*Generated by Ludic Deep Reader*
*Generated at: ${new Date(summary.completionDate).toLocaleString('zh-CN')}*
`;

  return preamble;
}

/**
 * Save book summary to local file
 */
export function saveBookSummary(summary, outputDir = './summaries') {
  try {
    // Ensure output directory exists
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    // Generate safe filename
    const safeTitle = summary.bookTitle
      .replace(/[<>:"/\\|?*]/g, '_')
      .replace(/\s+/g, '_')
      .substring(0, 100);

    // Add difficulty and timestamp to filename
    const dateSuffix = new Date().toISOString().split('T')[0];
    const filename = `${safeTitle}_${summary.difficulty}_${dateSuffix}_summary.md`;
    const filePath = path.join(outputDir, filename);

    // Write summary to file
    fs.writeFileSync(filePath, renderBookSummary(summary), 'utf8');

    return {
      success: true,
      filePath,
      filename,
      summary
    };
  } catch (error) {
    console.error('Error saving book summary:', error);
    return {
      success: false,
      error: error.message,
      summary
    };
  }
}
