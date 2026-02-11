
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
