
/**
 * render_ui.js
 *
 * Generate interactive UI components using **Rich Markdown** for the chat interface.
 * Replaces HTML output with text-based UI (emojis, tables, ASCII art).
 */

// ============ Main UI Components ============

export function renderDashboard(state, book) {
  return {
    type: 'dashboard',
    markdown: `
# 🏰 ${book.title}

**👤 Level ${state.level}**  |  ${renderXPBarText(state.xpTotal, 1000)}  |  ${renderManaGaugeText(state.mana)}
**📍 Phase:** ${state.currentPhase}

---
`
  };
}

export function renderReadingView(chapter, state, inventory) {
  // Convert tools list to markdown list
  // Note: Actual interactive buttons aren't possible in pure markdown, 
  // so we list available commands/actions.

  return {
    type: 'reading-view',
    markdown: `
## 📖 ${chapter.title}

${chapter.content}

---
### 🛠️ Available Actions
- **🔍 Log Term**: define a key term
- **💎 Extract Proposition**: save a sentence found in text
- **⚡ Build Argument**: combine propositions
- **📝 Critique**: agree/disagree with author
`
  };
}

// ============ Progress Components ============

function renderXPBarText(current, max) {
  const width = 10;
  const filled = Math.round((current / max) * width);
  const empty = width - filled;
  return `XP: ${'🟩'.repeat(filled)}${'⬜'.repeat(empty)} ${current}/${max}`;
}

function renderManaGaugeText(current) {
  const width = 10;
  const filled = Math.round((current / 100) * width); // Assuming max mana is 100
  const empty = width - filled;
  const color = current > 50 ? '🔮' : (current > 20 ? '⚠️' : '💀');
  return `${color} Mana: ${'█'.repeat(filled)}${'░'.repeat(empty)} ${current}%`;
}

export function renderXPBar(xp, levelInfo) {
  return {
    type: 'xp-bar',
    markdown: renderXPBarText(xp, levelInfo.nextXpRequired)
  };
}

export function renderManaGauge(mana) {
  return {
    type: 'mana-gauge',
    markdown: renderManaGaugeText(mana)
  };
}

export function renderProgressIndicator(currentChapter, totalChapters, understandingPercent) {
  const percentage = Math.round((currentChapter / totalChapters) * 100);
  return {
    type: 'progress-indicator',
    markdown: `**Progress:** ${percentage}% (Ch ${currentChapter}/${totalChapters}) | **Understanding:** ${understandingPercent}%`
  };
}

// ============ Quest Components ============

export function renderQuestCard(quest) {
  return {
    type: 'quest-card',
    markdown: `
╭──────────────────────────────────────╮
│ ⚔️ **QUEST: ${quest.type}** 
│ 
│ ${quest.description}
│ 
│ 🏆 Reward: +${quest.xpReward} XP
╰──────────────────────────────────────╯
`
  };
}

export function renderQuestWithShards(quest, shards = []) {
  if (shards.length === 0) return renderQuestCard(quest);

  // Flat Mode (Standard Markdown) - Optimized for Clickable Links
  let flatContent = `${renderQuestCard(quest).markdown}\n\n---\n\n### 📜 智识碎片 (Wisdom Shards)\n\n`;

  shards.forEach((shard, idx) => {
    flatContent += `#### 💠 Shard #${idx + 1}\n\n`;
    flatContent += `> ${shard.text.trim()}\n\n`;
    flatContent += `*📍 Location: ${shard.metadata.chapterTitle || 'Unknown'}*\n`;
    if (shard.metadata.fileUri) {
      flatContent += `[**📖 阅读全卷 (Read Full Chapter)**](${shard.metadata.fileUri})\n`;
    }
    flatContent += `\n---\n`;
  });

  return {
    type: 'quest-with-shards',
    markdown: flatContent
  };
}

export function renderQuestComplete(result, xpGained) {
  return {
    type: 'quest-complete',
    markdown: `
✅ **QUEST COMPLETE!**
+${xpGained} XP
_${result.feedback}_
`
  };
}

export function renderQuestFailed(result, manaCost) {
  return {
    type: 'quest-failed',
    markdown: `
❌ **QUEST FAILED**
-${manaCost} Mana

**Hints:**
${result.hints.map(h => `- 💡 ${h}`).join('\n')}
`
  };
}

// ============ Inventory Components ============

export function renderTermsPanel(terms) {
  if (!terms || terms.length === 0) return { type: 'terms-panel', markdown: "*No terms collected yet.*" };

  const rows = terms.map((t, i) => `| ${i + 1} | **${t.word}** | ${t.definition} |`).join('\n');

  return {
    type: 'terms-panel',
    markdown: `
### 📜 Glossary
| # | Term | Definition |
|---|---|---|
${rows}
`
  };
}

export function renderPropositionsPanel(propositions) {
  if (!propositions || propositions.length === 0) return { type: 'propositions-panel', markdown: "*No propositions collected yet.*" };

  const rows = propositions.map((p, i) => `| ${i + 1} | ${p.statement} |`).join('\n');

  return {
    type: 'propositions-panel',
    markdown: `
### 💎 Propositions
| # | Statement |
|---|---|
${rows}
`
  };
}

export function renderArgumentBuilder(propositions, argumentList) {
  return {
    type: 'argument-builder',
    markdown: `
### ⚡ Argument Builder
Select propositions from your inventory to form an argument.
Format: \`build_argument premise:#1 premise:#2 conclusion:"..."\`
`
  };
}

// ============ Interactive Tools ============

export function renderTermDialog(selectedText, context) {
  return {
    type: 'term-dialog',
    markdown: `
**📝 Define Term**
Item: *${selectedText}*
Action: Please provide a definition for this term based on the context.
`
  };
}

export function renderClassificationQuiz(options, hint) {
  const optionList = options.map((opt, i) => `${i + 1}. ${opt}`).join('\n');
  return {
    type: 'classification-quiz',
    markdown: `
**🤔 Classification Quiz**
${hint}

${optionList}

Reply with the number or text of your choice.
`
  };
}

export function renderCritiqueInterface(critiqueTypes) {
  return {
    type: 'critique-interface',
    markdown: `
**⚖️ Critique Author**
Choose your stance:
${critiqueTypes.map(t => `- ${t}`).join('\n')}

Format: \`critique [type] [evidence]\`
`
  };
}

// ============ Feedback Components ============

export function renderLevelUp(levelUp) {
  return {
    type: 'level-up',
    markdown: `
🎉🎉🎉 **LEVEL UP!** 🎉🎉🎉
━━━━━━━━━━━━━━━━━━━━━━━━━━
Current Level: **${levelUp.newLevel}**
Title: **${levelUp.newTitle}**
━━━━━━━━━━━━━━━━━━━━━━━━━━
`
  };
}

export function renderComboStreak(comboCount, multiplier) {
  return {
    type: 'combo-streak',
    markdown: `🔥 **Context Streak: ${comboCount}** (XP x${multiplier})`
  };
}

export function renderRestPrompt(mana, message) {
  return {
    type: 'rest-prompt',
    markdown: `
⚠️ **MANA LOW (${mana}%)** ⚠️
${message}
*Suggested Action: Type \`rest\` to recover mana.*
`
  };
}

// ============ Vision Components ============

export function renderVisionReward(vision) {
  return {
    type: 'vision-reward',
    markdown: `
## ✨ 洞察视觉：显影完成

> **“你的思想已在以太中凝结成景。”**

![Vision Fragment](${vision.imagePath})
*“${vision.concept}”*

---
`
  };
}

export function renderVisionsGallery(visions) {
  if (!visions || visions.length === 0) {
    return { type: 'visions-gallery', markdown: "*你的视觉图库目前空空如也，请通过深度阅读来填充它。*" };
  }

  let gallery = `## 🖼️ 智识幻境图库 (Visions Gallery)\n\n`;

  visions.forEach((v, idx) => {
    gallery += `### 🍀 Fragment #${idx + 1}\n\n`;
    gallery += `![${v.concept}](${v.imagePath})\n\n`;
    gallery += `> **洞察主题**: ${v.concept}\n\n`;
    gallery += `*✨ 显影时间: ${v.timestamp}*\n\n`;
    gallery += `---\n\n`;
  });

  return {
    type: 'visions-gallery',
    markdown: gallery
  };
}

// ============ Book Selection Components ============

/**
 * Render book selection menu for multi-book support
 */
export function renderBookSelectionMenu(books, currentBookId = null) {
  if (!books || books.length === 0) {
    return {
      type: 'book-selection',
      markdown: `## 📚 Book Selection\n\n*No books available. Import a book first.*`
    };
  }

  let menu = `## 📚 Select Your Book\n\n`;
  menu += `Choose a book to continue reading:\n\n`;

  books.forEach((book, idx) => {
    const isCurrent = currentBookId === book.id;
    const prefix = isCurrent ? '📖 **[CURRENT]**' : `**${idx + 1}.**`;
    menu += `${prefix} ${book.title}\n`;
    menu += `   by ${book.author}\n`;
    menu += `   Chapters: ${book.chapter_count} | Imported: ${new Date(book.imported_at).toLocaleDateString()}\n\n`;
  });

  menu += `Reply with \`select_book: [number]\` or \`select_book: [book_id]\` to switch.\n`;
  return {
    type: 'book-selection',
    markdown: menu
  };
}

/**
 * Render book switch confirmation
 */
export function renderBookSwitchConfirmation(currentBook, targetBook, hasUnsavedProgress = false) {
  let menu = `## 🔄 Switching Books\n\n`;
  menu += `From: **${currentBook.title}**\n`;
  menu += `To: **${targetBook.title}**\n\n`;

  if (hasUnsavedProgress) {
    menu += `⚠️ **Warning**: You have unsaved progress in the current book.\n\n`;
    menu += `Your progress will be saved before switching.\n\n`;
  }

  menu += `Reply \`confirm_switch\` to proceed, or \`cancel\` to stay.\n`;
  return {
    type: 'book-switch-confirm',
    markdown: menu
  };
}

// ============ Milestone Card Components ============

/**
 * Render milestones gallery for a book
 */
export function renderMilestonesGallery(milestones, bookTitle = '') {
  if (!milestones || milestones.length === 0) {
    return {
      type: 'milestones-gallery',
      markdown: `# 🏆 Milestone Gallery\n\n*${bookTitle ? `No milestones yet for "${bookTitle}".` : 'No milestones yet.'}*\n\n*Complete reading phases to earn milestone cards!`
    };
  }

  let gallery = `# 🏆 Milestone Gallery - ${bookTitle}\n\n`;
  gallery += `${milestones.length} milestone(s) achieved!\n\n`;

  milestones.forEach((m, idx) => {
    const phaseEmojis = { SCOUTING: '🔍', HUNTING: '🎯', ALCHEMY: '⚗️', JUDGMENT: '⚖️' };
    const emoji = phaseEmojis[m.phase] || '🏆';

    gallery += `## ${emoji} Milestone #${idx + 1}: ${m.phase}\n\n`;
    gallery += `**Difficulty**: ${m.difficulty_id?.toUpperCase() || 'N/A'}\n\n`;
    gallery += `**Earned**: ${new Date(m.created_at).toLocaleDateString('zh-CN')}\n\n`;

    if (m.stats) {
      gallery += `### 📊 Statistics\n\n`;
      if (m.stats.xp) gallery += `- XP: +${m.stats.xp}\n`;
      if (m.stats.terms) gallery += `- Terms: ${m.stats.terms}\n`;
      if (m.stats.propositions) gallery += `- Propositions: ${m.stats.propositions}\n`;
      if (m.stats.arguments) gallery += `- Arguments: ${m.stats.arguments}\n`;
    }
    gallery += `\n---\n\n`;
  });

  return {
    type: 'milestones-gallery',
    markdown: gallery
  };
}

/**
 * Render book summary display
 */
export function renderBookSummaryDisplay(summary) {
  let display = `# 📊 Book Summary: ${summary.summary_data?.bookTitle || 'Unknown'}\n\n`;

  const data = summary.summary_data;

  display += `## 📖 Book Information\n\n`;
  display += `- **Author**: ${data?.author || 'N/A'}\n`;
  display += `- **Difficulty Level**: ${data?.difficultyName || 'N/A'}\n`;
  display += `- **Completed**: ${new Date(data?.completionDate).toLocaleDateString('zh-CN')}\n`;
  display += `- **Final Level**: Level ${data?.levelAchieved || 1}\n`;
  display += `- **Total XP**: +${data?.totalXP || 0}\n\n`;

  display += `## 📊 Phase Stats\n\n`;

  const phases = [
    { name: 'Scouting (🔍)', key: 'SCOUTING' },
    { name: 'Hunting (🎯)', key: 'HUNTING' },
    { name: 'Alchemy (⚗️)', key: 'ALCHEMY' },
    { name: 'Judgment (⚖️)', key: 'JUDGMENT' }
  ];

  phases.forEach(p => {
    const stats = data?.phasesCompleted?.[p.key];
    if (stats) {
      display += `### ${p.name}\n`;
      display += `- XP: +${stats.xp || 0}\n`;
      if (stats.terms) display += `- Terms: ${stats.terms}\n`;
      if (stats.propositions) display += `- Propositions: ${stats.propositions}\n`;
      if (stats.arguments) display += `- Arguments: ${stats.arguments}\n`;
      display += `\n`;
    }
  });

  display += `---\n\n`;
  display += `*Generated at ${new Date(summary.created_at).toLocaleString('zh-CN')}*\n`;

  return {
    type: 'book-summary-display',
    markdown: display
  };
}

// ============ Difficulty Change Components ============

/**
 * Render difficulty switch confirmation
 */
export function renderDifficultySwitchConfirmation(fromDifficulty, toDifficulty, currentProgress) {
  let menu = `## 🔄 Changing Difficulty Level\n\n`;
  menu += `**From:** ${fromDifficulty.name} (${fromDifficulty.id.toUpperCase()})\n`;
  menu += `**To:** ${toDifficulty.name} (${toDifficulty.id.toUpperCase()})\n\n`;

  menu += `### 📊 What's Changing?\n\n`;
  menu += `| Property | Current | New |\n`;
  menu += `|----------|---------|-----|\n`;
  menu += `| XP Multiplier | ${fromDifficulty.xpMultiplier}x | ${toDifficulty.xpMultiplier}x |\n`;
  menu += `| Mana Recovery | ${fromDifficulty.manaRecovery} | ${toDifficulty.manaRecovery} |\n`;
  menu += `| Hints Available | ${fromDifficulty.hintsAvailable ? 'Yes' : 'No'} | ${toDifficulty.hintsAvailable ? 'Yes' : 'No'} |\n`;
  menu += `| Terms Required | ${fromDifficulty.thresholds.terms} | ${toDifficulty.thresholds.terms} |\n`;
  menu += `| Propositions Required | ${fromDifficulty.thresholds.propositions} | ${toDifficulty.thresholds.propositions} |\n`;
  menu += `| Arguments Required | ${fromDifficulty.thresholds.arguments} | ${toDifficulty.thresholds.arguments} |\n\n`;

  menu += `### 📈 Your Current Progress\n\n`;
  menu += `- XP: ${currentProgress.xpTotal || 0}\n`;
  menu += `- Level: ${currentProgress.level || 1}\n`;
  menu += `- Phase: ${currentProgress.phase || 'SCOUTING'}\n`;
  menu += `- Mana: ${currentProgress.mana || 100}%\n\n`;

  menu += `### ⚠️ Important Notes\n\n`;
  menu += `- Your current game state will be **preserved** (${fromDifficulty.name})\n`;
  menu += `- A **new game state** will be created for ${toDifficulty.name}\n`;
  menu += `- You can switch back anytime\n\n`;

  menu += `Reply:\n`;
  menu += `- \`confirm_change_difficulty\` to proceed\n`;
  menu += `- \`cancel\` to cancel\n\n`;

  return {
    type: 'difficulty-switch-confirm',
    markdown: menu
  };
}

/**
 * Render difficulty switch success message
 */
export function renderDifficultySwitchSuccess(toDifficulty, preserveOldState = true) {
  let menu = `✅ **Difficulty Changed Successfully!**\n\n`;
  menu += `You are now playing at **${toDifficulty.name} (${toDifficulty.id.toUpperCase()})** level.\n\n`;

  if (preserveOldState) {
    menu += `Your previous progress has been saved and can be restored anytime.\n\n`;
  }

  menu += `Good luck on your reading quest!\n`;

  return {
    type: 'difficulty-switch-success',
    markdown: menu
  };
}

// ============ Debug Mode UI ============

/**
 * Render debug mode notification
 */
export function renderDebugModeNotification(message) {
  return {
    type: 'debug-mode',
    markdown: `
🔧 **调试模式已激活**

${message || '使用以下命令进行调试：'}

---
${getDebugMenuContent()}
`
  };
}

/**
 * Render debug mode exit confirmation
 */
export function renderDebugModeExit() {
  return {
    type: 'debug-exit',
    markdown: `
✅ **已退出调试模式**

回到正常游戏流程。
`
  };
}

/**
 * Render debug goto result
 */
export function renderDebugGoto(phase, state) {
  const phaseNames = {
    SCOUTING: '🔍 检视阅读 (Scouting)',
    HUNTING: '🎯 分析阅读I - 狩猎 (Hunting)',
    ALCHEMY: '⚗️ 分析阅读II - 炼金 (Alchemy)',
    JUDGMENT: '⚖️ 分析阅读III - 审判 (Judgment)',
    SYNTOPICAL: '🔱 主题阅读 (Syntopical)'
  };

  return {
    type: 'debug-goto',
    markdown: `
✅ **调试跳转成功！**

**新阶段**: ${phaseNames[phase] || phase}

**当前状态**:
- Level: ${state.level}
- XP: ${state.xpTotal}
- Mana: ${state.mana}%
- Phase: ${state.currentPhase}

---
*调试模式下可以自由测试各阶段功能*
`
  };
}

/**
 * Get debug menu content (without markdown wrapper)
 */
function getDebugMenuContent() {
  return `
### 阶段跳转
- \`/goto:SCOUTING\` - 检视阅读
- \`/goto:HUNTING\` - 分析阅读I (狩猎)
- \`/goto:ALCHEMY\` - 分析阅读II (炼金)
- \`/goto:JUDGMENT\` - 分析阅读III (审判)
- \`/goto:SYNTOPICAL\` - 主题阅读

### 数值设置
- \`/set:XP:100\` - 设置经验值
- \`/set:LEVEL:5\` - 设置等级
- \`/set:MANA:80\` - 设置专注力
- \`/set:PHASE:SYNTOPICAL\` - 设置阶段

### 测试数据
- \`/debug:add_topics\` - 添加测试主题

### 退出
- \`/exit_debug\` - 退出调试模式
`;
}

// ============ Syntopical (主题阅读) UI Components ============

/**
 * Render syntopical unlock notification
 */
export function renderSyntopicalUnlock(topics, bookInfo) {
  if (!topics || topics.length === 0) {
    return {
      type: 'syntopical-unlock',
      markdown: `
## 🔱 主题阅读解锁条件

完成阅读的书籍中暂无可用于主题阅读的主题。

**条件要求**：
- 至少 2 本书标记为相同主题
- 或至少完成 2 本书的分析阅读阶段

继续阅读更多书籍来解锁主题阅读！
`
    };
  }

  let content = `## 🔱 主题阅读已解锁！\n\n`;
  content += `您已完成多本书的分析阅读，现在可以开始**主题阅读 (Syntopical Reading)**。\n\n`;
  content += `---\n\n`;
  content += `### 📚 可用主题\n\n`;

  topics.forEach((t, idx) => {
    content += `**${idx + 1}. ${t.topic}**\n`;
    content += `   - 涉及书籍: ${t.bookCount} 本\n`;
    content += `\n`;
  });

  content += `---\n\n`;
  content += `**玩法说明**：\n`;
  content += `- 您将担任"议长"角色\n`;
  content += `- 跨书籍建立中立术语体系\n`;
  content += `- 对比不同作者的观点\n`;
  content += `- 综合形成自己的理解\n\n`;
  content += `回复 \`start_syntopical: [主题]\` 开始主题阅读\n`;

  return {
    type: 'syntopical-unlock',
    markdown: content
  };
}

/**
 * Render topic selection menu for syntopical reading
 */
export function renderTopicSelection(topics, currentBookTitle) {
  let content = `## 🔱 选择主题进行主题阅读\n\n`;
  content += `当前书籍: **${currentBookTitle}**\n\n`;
  content += `选择要与当前书籍进行对比的主题：\n\n`;

  topics.forEach((t, idx) => {
    content += `### ${idx + 1}. ${t.topic}\n`;
    content += `涉及书籍: ${t.bookCount} 本\n`;
    content += `书籍列表:\n`;
    t.bookIds.forEach((bookId, i) => {
      // Note: 需要额外查询获取书名
      content += `   - ${i + 1}. (Book ID: ${bookId})\n`;
    });
    content += `\n`;
  });

  content += `回复 \`select_topic: [数字或主题名]\` 来选择\n`;

  return {
    type: 'topic-selection',
    markdown: content
  };
}

/**
 * Render neutral term creation dialog
 */
export function renderNeutralTermDialog(topic, sourceTerms) {
  let content = `## ⚖️ 创建中立术语\n\n`;
  content += `**主题**: ${topic}\n\n`;
  content += `请对比以下来自不同书籍的术语，建立一个统一的中立定义：\n\n`;
  content += `---\n\n`;

  sourceTerms.forEach((st, idx) => {
    content += `### 📖 ${st.bookTitle}\n`;
    content += `**术语**: ${st.term}\n`;
    content += `**定义**: ${st.definition}\n\n`;
  });

  content += `---\n\n`;
  content += `### 📝 创建中立术语\n\n`;
  content += `请提供一个中性术语名称及其统一定义：\n\n`;
  content += `格式：\n`;
  content += `\`neutral_term: [术语] = [定义]\`\n\n`;
  content += `示例：\n`;
  content += `\`neutral_term: 主动阅读 = 读者主动与文本互动，通过提问、分析、评价来构建理解的阅读方式\`\n`;

  return {
    type: 'neutral-term-dialog',
    markdown: content
  };
}

/**
 * Render neutral terms table
 */
export function renderNeutralTermsTable(neutralTerms, topic) {
  if (!neutralTerms || neutralTerms.length === 0) {
    return {
      type: 'neutral-terms-table',
      markdown: `*暂无中立术语。请先创建中立术语来建立主题知识体系。*`
    };
  }

  let content = `## ⚖️ 中立术语体系 - ${topic}\n\n`;
  content += `| # | 中立术语 | 定义 | 来源 |\n`;
  content += `|---|---|---|---|\n`;

  neutralTerms.forEach((nt, idx) => {
    const sources = nt.source_terms ? nt.source_terms.length : 0;
    content += `| ${idx + 1} | **${nt.term}** | ${nt.definition.substring(0, 30)}... | ${sources} 个来源 |\n`;
  });

  content += `\n`;

  return {
    type: 'neutral-terms-table',
    markdown: content
  };
}

/**
 * Render cross-book comparison view
 */
export function renderCrossBookComparison(books, topic, terms, propositions) {
  let content = `## 🔄 跨书籍对比 - ${topic}\n\n`;
  content += `参与书籍: ${books.length} 本\n\n`;
  content += `---\n\n`;

  // 按书籍分组展示术语
  content += `### 📜 术语对比\n\n`;
  books.forEach(book => {
    const bookTerms = terms.filter(t => t.bookId === book.id);
    content += `#### 📖 ${book.title}\n`;
    if (bookTerms.length === 0) {
      content += `*暂无收集的术语*\n\n`;
    } else {
      bookTerms.forEach(t => {
        content += `- **${t.word}**: ${t.definition.substring(0, 50)}...\n`;
      });
      content += `\n`;
    }
  });

  content += `---\n\n`;
  content += `### 💎 命题对比\n\n`;
  books.forEach(book => {
    const bookProps = propositions.filter(p => p.bookId === book.id);
    content += `#### 📖 ${book.title}\n`;
    if (bookProps.length === 0) {
      content += `*暂无收集的命题*\n\n`;
    } else {
      bookProps.slice(0, 3).forEach(p => {
        content += `> ${p.statement.substring(0, 60)}...\n`;
      });
      content += `\n`;
    }
  });

  content += `---\n\n`;
  content += `使用命令继续：\n`;
  content += `- \`add_neutral_term\` - 添加中立术语\n`;
  content += `- \`compare: [书籍1] vs [书籍2]\` - 对比两本书\n`;
  content += `- \`synthesize\` - 创建综合观点\n`;

  return {
    type: 'cross-book-comparison',
    markdown: content
  };
}

/**
 * Render synthesis creation prompt
 */
export function renderSynthesisPrompt(topic, neutralTerms) {
  let content = `## 🎯 创建综合观点\n\n`;
  content += `**主题**: ${topic}\n\n`;
  content += `基于以下中立术语，请创建你的综合观点：\n\n`;

  neutralTerms.forEach(nt => {
    content += `- **${nt.term}**: ${nt.definition}\n`;
  });

  content += `\n---\n\n`;
  content += `请回复 \`synthesis: [你的综合理解]\` 来完成主题阅读\n`;
  content += `格式建议：\n`;
  content += `1. 总结该主题的核心要点\n`;
  content += `2. 比较不同作者的观point异同\n`;
  content += `3. 提出你自己的见解\n`;

  return {
    type: 'synthesis-prompt',
    markdown: content
  };
}

/**
 * Render syntopical completion celebration
 */
export function renderSyntopicalComplete(topic, totalXP, stats) {
  return {
    type: 'syntopical-complete',
    markdown: `
🎉🎉🎉 **主题阅读完成！** 🎉🎉🎉
━━━━━━━━━━━━━━━━━━━━━━━━━━

**主题**: ${topic}

**收获**:
- 🌟 Total XP: +${totalXP}
- 📜 中立术语: ${stats.neutralTerms || 0}
- 🔄 跨书对比: ${stats.comparisons || 0}
- 🎯 综合观点: ${stats.syntheses || 1}

━━━━━━━━━━━━━━━━━━━━━━━━━━

*您已成功完成主题阅读，建立了对"${topic}"的跨书籍综合理解！*

*感谢您使用 Ludic Deep Reader！*
`
  };
}

/**
 * Render all difficulty states for current book
 */
export function renderDifficultyStatesOverview(bookId, bookTitle, allStates = []) {
  let menu = `## 🎮 Game States for "${bookTitle}"\n\n`;

  if (allStates.length === 0) {
    menu += `*No game states found. Start reading to create your first state.*\n\n`;
    return {
      type: 'difficulty-states-overview',
      markdown: menu
    };
  }

  menu += `You have the following saved progress:\n\n`;

  allStates.forEach((state, idx) => {
    const difficulty = state.difficulty_id || 'unknown';
    menu += `### ${idx + 1}. ${difficulty.toUpperCase()}\n\n`;
    menu += `- **Level:** ${state.level || 1}\n`;
    menu += `- **XP:** ${state.xp_total || 0}\n`;
    menu += `- **Phase:** ${state.current_phase || 'SCOUTING'}\n`;
    menu += `- **Chapter:** ${state.current_chapter || 1}\n`;
    menu += `- **Mana:** ${state.mana || 100}%\n`;
    menu += `- **Last Updated:** ${new Date(state.last_updated).toLocaleDateString('zh-CN')}\n\n`;
  });

  menu += `Use \`select_difficulty_state: [difficulty_id]\` to switch to a specific state.\n`;

  return {
    type: 'difficulty-states-overview',
    markdown: menu
  };
}
