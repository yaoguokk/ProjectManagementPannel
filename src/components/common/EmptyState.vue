<template>
  <div class="empty-state">
    <svg xmlns="http://www.w3.org/2000/svg" class="empty-icon" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
    </svg>
    <p class="empty-text">{{ text }}</p>
    <button
      v-if="showAction"
      @click="$emit('action')"
      class="empty-action"
    >
      {{ actionText }}
    </button>
  </div>
</template>

<script setup>
defineProps({
  text: {
    type: String,
    default: '暂无数据'
  },
  showAction: {
    type: Boolean,
    default: false
  },
  actionText: {
    type: String,
    default: '刷新'
  }
});

defineEmits(['action']);
</script>

<style scoped>
.empty-state {
  text-align: center;
  padding: 3rem;
}

.empty-icon {
  width: 64px;
  height: 64px;
  color: #9ca3af;
  margin-bottom: 1rem;
}

.empty-text {
  color: #6b7280;
  font-size: 0.875rem;
  margin-bottom: 1rem;
}

.empty-action {
  padding: 0.5rem 1rem;
  border: 1px solid #d1d5db;
  border-radius: 0.25rem;
  background-color: white;
  color: #374151;
  cursor: pointer;
  transition: all 0.2s;
}

.empty-action:hover {
  background-color: #f3f4f6;
}
</style>
