/**
 * 区域配色表
 *
 * 独立成文件（而不是放在 sections.js 或 SectionHeader.vue 里）：
 * 前者会与「Section 组件 → SectionHeader → sections.js」形成循环依赖，
 * 后者无法被测试断言。新增一种区域配色时只改这里即可。
 */
export const SECTION_TONES = {
  blue: '#3b82f6',
  violet: '#8b5cf6',
  emerald: '#10b981',
  amber: '#f59e0b',
  red: '#ef4444',
};

/** 区域未指定 tone（或 tone 不存在）时的兜底配色 */
export const DEFAULT_SECTION_TONE = 'blue';

/** 取色：未知 tone 回退到默认色，避免徽章透明 */
export const resolveSectionTone = (tone) =>
  SECTION_TONES[tone] || SECTION_TONES[DEFAULT_SECTION_TONE];
