// Badge art for achievements: the original app's emoji for each milestone
// (old-reference/src/achievements.ts) and a colour per group, so the
// achievements read as a wall of badges instead of rows of bars.
import type { AchievementGroup } from '@/data/achievements';

export const ACHIEVEMENT_EMOJI: Record<string, string> = {
  q1: '🌱', q100: '📝', q250: '✏️', q500: '📚', q1000: '🧠', q2500: '🚀', q5000: '🏛️', q10000: '🌌',
  right100: '✅', right1000: '💎', fresh500: '🔍', fresh1500: '🧩',
  s3: '🔥', s7: '🔥', s14: '⚡', s30: '🌋', s60: '🛡️', s100: '👑', s365: '🌞',
  d10: '📅', d50: '🗒️', d100: '🏅', day50: '💪', day100: '🏋️',
  l5: '⭐', l10: '🌟', l15: '✨', l25: '💫', l50: '🏆', l75: '🎖️', l100: '🥇', xp1k: '⚙️', xp10k: '🔋',
  perfect: '💯', acc80: '🎯', acc90: '🏹', improve: '📈', quiz10: '📋', quiz50: '📑', quiz200: '🗃️', pretest: '🧪',
  les1: '📖', les10: '🎓', les25: '📕', les50: '🏫', sec50: '📃', sec200: '📜', fc50: '🗂️', fc200: '🃏', fc500: '🎴', exam: '🗓️',
  fix10: '🩹', fix50: '🔧', fix200: '🛠️', fix500: '🦾',
  back: '🔙', wknd10: '🛋️', wknd30: '🌴', busy10: '⏱️', busy30: '🏗️', mon3: '🗓️', mon6: '🍂',
  ny: '🎆', val: '💘', xmas: '🎄', nye: '🥂',
  // This app's own milestones.
  'first-lesson': '📘', 'quiz-ace': '⚡', 'topic-complete': '🗺️', 'first-mastery': '🧬', 'consistent-reviewer': '🔁', 'apex-contender': '⛰️',
};

/** Badge colours (illustration colours, like the subject tiles), top → bottom. */
export const ACHIEVEMENT_COLORS: Record<AchievementGroup, readonly [string, string]> = {
  GRATEAPEX: ['#2D5BFF', '#0A1F5C'],
  Questions: ['#4F8BFF', '#2E5BDB'],
  Streaks: ['#FF8A3D', '#E2452B'],
  Levels: ['#A66BFF', '#6C3BE0'],
  Skill: ['#2FCB8C', '#14935F'],
  Lessons: ['#22C3D6', '#0E8BA8'],
  Mistakes: ['#FF6FA5', '#D63F79'],
  Habits: ['#FFC23D', '#E08E0B'],
  'Special days': ['#FF5D5D', '#C42B4B'],
};

export const LOCKED_COLORS: readonly [string, string] = ['#C3CAD8', '#8F99AD'];

export const achievementEmoji = (id: string) => ACHIEVEMENT_EMOJI[id] ?? '🏅';
