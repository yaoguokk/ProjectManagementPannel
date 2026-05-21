<template>
  <div class="project-type-filter">
    <div class="filter-group">
      <button
        @click="setProjectType('all')"
        class="type-btn"
        :class="{ 'active': projectType === 'all' }"
      >
        全部
      </button>
      <button
        @click="setProjectType('business')"
        class="type-btn"
        :class="{ 'active': projectType === 'business' }"
      >
        经营项目
      </button>
      <button
        @click="setProjectType('self')"
        class="type-btn"
        :class="{ 'active': projectType === 'self' }"
      >
        自筹项目
      </button>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue';

const props = defineProps({
  projectType: {
    type: String,
    default: 'all'
  }
});

const emit = defineEmits(['update:projectType']);

const setProjectType = (type) => {
  emit('update:projectType', type);
};
</script>

<style scoped>
.project-type-filter {
  padding: 1rem;
  background-color: #f9fafb;
  border-radius: 0.5rem;
}

.filter-group {
  display: flex;
  gap: 0.5rem;
}

.type-btn {
  padding: 0.5rem 1rem;
  border: 1px solid #d1d5db;
  border-radius: 0.25rem;
  background-color: white;
  cursor: pointer;
  transition: all 0.2s;
}

.type-btn:hover {
  background-color: #f3f4f6;
}

.type-btn.active {
  background-color: #3b82f6;
  color: white;
  border-color: #3b82f6;
}
</style>