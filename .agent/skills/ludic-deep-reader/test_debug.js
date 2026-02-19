/**
 * 测试脚本 - 调试模式功能测试
 *
 * 用法: node test_debug.js [命令]
 *
 * 示例:
 *   node test_debug.js /debug
 *   node test_debug.js /goto:SCOUTING
 *   node test_debug.js /goto:SYNTOPICAL
 *   node test_debug.js /goto:JUDGMENT
 *   node test_debug.js /set:XP:500
 */

import { initializeState, GAME_PHASES, generateQuest } from './scripts/game_engine.js';
import { renderQuestCard, renderSyntopicalUnlock } from './scripts/render_ui.js';
import { isSyntopicalEnabled, getSyntopicalConfig, DIFFICULTY_LEVELS } from './scripts/difficulty_system.js';

// 初始化测试状态
let currentState = initializeState();
let currentDifficulty = 'expert';

function print(msg) {
  console.log(msg || '');
}

function printSeparator() {
  console.log('─'.repeat(50));
}

// 解析命令行参数
const args = process.argv.slice(2);
let command = args.join(' ');

if (!command) {
  command = '/debug';
}

console.log('='.repeat(50));
console.log('🔧 Ludic Deep Reader - 调试模式测试');
console.log('='.repeat(50));
console.log();

// 测试状态初始化
console.log('📊 初始状态:');
console.log(`  Level: ${currentState.level}`);
console.log(`  XP: ${currentState.xpTotal}`);
console.log(`  Mana: ${currentState.mana}`);
console.log(`  Phase: ${currentState.currentPhase}`);
printSeparator();
console.log();

// 处理命令
console.log(`📝 执行命令: ${command}`);
console.log('-'.repeat(30));
console.log();

// /debug - 显示调试菜单
if (command === '/debug' || command === 'debug') {
  console.log('## 🔧 调试模式菜单');
  console.log();
  console.log('可用命令:');
  console.log('  /goto:SCOUTING   - 跳转到检视阅读');
  console.log('  /goto:HUNTING    - 跳转到分析阅读I (狩猎)');
  console.log('  /goto:ALCHEMY    - 跳转到分析阅读II (炼金)');
  console.log('  /goto:JUDGMENT   - 跳转到分析阅读III (审判)');
  console.log('  /goto:SYNTOPICAL - 跳转到主题阅读');
  console.log('  /set:XP:500      - 设置经验值');
  console.log('  /set:LEVEL:5     - 设置等级');
  console.log('  /status          - 查看当前状态');
  console.log();
  console.log('💡 当前阶段: ' + currentState.currentPhase);
}
// /goto:xxx - 跳转阶段
else if (command.startsWith('/goto:')) {
  const targetPhase = command.replace('/goto:', '').toUpperCase();
  const validPhases = ['SCOUTING', 'HUNTING', 'ALCHEMY', 'JUDGMENT', 'SYNTOPICAL'];

  if (validPhases.includes(targetPhase)) {
    currentState.currentPhase = targetPhase;
    currentState.currentChapter = 1;
    currentState.comboCount = 0;
    currentState.consecutiveFailures = 0;

    console.log(`✅ 成功跳转到阶段: ${targetPhase}`);

    // 显示阶段对应的任务
    const phaseNames = {
      SCOUTING: '🔍 检视阅读',
      HUNTING: '🎯 分析阅读I - 狩猎',
      ALCHEMY: '⚗️ 分析阅读II - 炼金',
      JUDGMENT: '⚖️ 分析阅读III - 审判',
      SYNTOPICAL: '🔱 主题阅读'
    };
    console.log();
    console.log(`📖 当前阶段: ${phaseNames[targetPhase]}`);

    // 模拟章节内容生成任务
    const mockChapter = {
      title: '测试章节',
      content: '这是用于测试的章节内容。'
    };

    const quest = generateQuest(currentState, mockChapter);
    console.log();
    console.log('🎯 生成的任务:');
    console.log('  类型: ' + quest.type);
    console.log('  描述: ' + quest.description);
    console.log('  XP奖励: +' + quest.xpReward);
  } else {
    console.log(`❌ 无效的阶段: ${targetPhase}`);
    console.log(`可用阶段: ${validPhases.join(', ')}`);
  }
}
// /set:xxx - 设置数值
else if (command.startsWith('/set:')) {
  const parts = command.replace('/set:', '').split(':');
  if (parts.length === 2) {
    const [key, value] = parts;

    if (key === 'XP' || key === 'xp') {
      currentState.xpTotal = parseInt(value) || 0;
      console.log(`✅ 设置 XP = ${currentState.xpTotal}`);
    } else if (key === 'LEVEL' || key === 'level') {
      currentState.level = parseInt(value) || 1;
      console.log(`✅ 设置 Level = ${currentState.level}`);
    } else if (key === 'MANA' || key === 'mana') {
      currentState.mana = Math.min(100, Math.max(0, parseInt(value) || 100));
      console.log(`✅ 设置 Mana = ${currentState.mana}`);
    } else {
      console.log(`❌ 未知设置项: ${key}`);
    }
  } else {
    console.log('❌ 格式错误，使用 /set:KEY:VALUE 格式');
  }
}
// /status - 查看状态
else if (command === '/status') {
  console.log('📊 当前状态:');
  console.log(`  Level: ${currentState.level}`);
  console.log(`  XP: ${currentState.xpTotal}`);
  console.log(`  Mana: ${currentState.mana}`);
  console.log(`  Phase: ${currentState.currentPhase}`);
  console.log(`  Chapter: ${currentState.currentChapter}`);
  console.log();
  console.log(`🎮 难度: ${currentDifficulty.toUpperCase()}`);
  console.log(`🔱 主题阅读可用: ${isSyntopicalEnabled(currentDifficulty)}`);
}
// 未知命令
else {
  console.log(`❌ 未知命令: ${command}`);
  console.log('输入 /debug 查看可用命令');
}

printSeparator();
console.log();

// 测试主题阅读 UI
if (command === '/goto:SYNTOPICAL' || command.includes('SYNTO')) {
  console.log('📱 主题阅读 UI 测试:');
  console.log();

  const mockTopics = [
    { topic: '学习方法', bookCount: 2, bookIds: ['book1', 'book2'] },
    { topic: '思维模型', bookCount: 2, bookIds: ['book3', 'book4'] }
  ];

  const unlockUI = renderSyntopicalUnlock(mockTopics);
  console.log(unlockUI.markdown);
}

console.log('✅ 测试完成！');
