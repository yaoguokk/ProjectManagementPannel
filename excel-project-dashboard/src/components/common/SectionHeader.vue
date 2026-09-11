<template>
  <!-- 区域标题：徽章 + 名称。颜色由 tone 决定（配色表见 constants/sectionTones.js） -->
  <div class="section-header">
    <span class="section-badge" :style="{ backgroundColor: toneColor }">{{ badge }}</span>
    <span class="section-title">{{ title }}</span>
  </div>
</template>

<script setup>
import { computed } from 'vue';
import { resolveSectionTone } from '../../constants/sectionTones';

const props = defineProps({
  badge: { type: String, default: '' },
  title: { type: String, default: '' },
  tone: { type: String, default: 'blue' },
});

const toneColor = computed(() => resolveSectionTone(props.tone));
</script>

<style scoped>
.section-header {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin-bottom: 1rem;
  padding-bottom: 0.75rem;
  border-bottom: 1px solid #f3f4f6;
}

.section-badge {
  width: 24px;
  height: 24px;
  border-radius: 6px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 0.75rem;
  font-weight: 700;
  color: white;
  flex-shrink: 0;
}

.section-title {
  font-size: 0.875rem;
  font-weight: 600;
  color: #374151;
}
</style>
