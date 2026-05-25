<template>
  <div class="project-type-filter">
    <div class="filter-group">
      <button
        @click="setProjectType('全部')"
        class="type-btn"
        :class="{ 'active': projectType === '全部' }"
      >
        全部
      </button>
      <button
        @click="setProjectType('经营项目')"
        class="type-btn"
        :class="{ 'active': projectType === '经营项目' }"
      >
        经营项目
      </button>
      <button
        @click="setProjectType('自筹项目')"
        class="type-btn"
        :class="{ 'active': projectType === '自筹项目' }"
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
    default: '全部'
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
  display: inline-flex;
  align-items: center;
  height: 2.25rem;
  padding: 0 1rem;
  border: 1px solid #d1d5db;
  border-radius: 0.25rem;
  background-color: white;
  font-size: 0.875rem;
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