<template>
  <div class="empty-state">
    <div class="empty-icon">
      <svg xmlns="http://www.w3.org/2000/svg" class="h-16 w-16 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
      </svg>
    </div>
    <h3 class="empty-title">{{ title }}</h3>
    <p class="empty-description">{{ description }}</p>
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
  title: {
    type: String,
    default: '暂无数据'
  },
  description: {
    type: String,
    default: '当前没有符合条件的数据'
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
  padding: 3rem 2rem;
  background-color: white;
  border-radius: 0.5rem;
  box-shadow: 0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06);
}

.empty-icon {
  margin: 0 auto 1rem;
  color: #9ca3af;
}

.empty-title {
  font-size: 1.125rem;
  font-weight: 600;
  color: #374151;
  margin-bottom: 0.5rem;
}

.empty-description {
  font-size: 0.875rem;
  color: #6b7280;
  margin-bottom: 1.5rem;
}

.empty-action {
  padding: 0.5rem 1.5rem;
  background-color: #3b82f6;
  color: white;
  border: none;
  border-radius: 0.375rem;
  font-size: 0.875rem;
  font-weight: 500;
  cursor: pointer;
  transition: background-color 0.2s;
}

.empty-action:hover {
  background-color: #2563eb;
}
</style>