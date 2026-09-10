<template>
  <div class="column-selector" ref="selectorRef">
    <button
      @click="togglePanel"
      class="column-settings-btn"
      :class="{ 'is-active': isOpen }"
      title="列设置"
    >
      <svg xmlns="http://www.w3.org/2000/svg" class="gear-icon" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
      </svg>
      <span>列设置</span>
    </button>

    <!-- 下拉面板 -->
    <div v-if="isOpen" class="column-panel">
      <div class="panel-header">
        <input
          v-model="searchText"
          type="text"
          placeholder="搜索列名..."
          class="column-search"
        />
      </div>

      <div class="panel-actions">
        <button @click="selectDefault" class="action-btn action-default">默认</button>
        <button @click="selectAll" class="action-btn">全选</button>
        <button @click="deselectAll" class="action-btn">取消全选</button>
      </div>

      <div class="column-list">
        <label
          v-for="col in filteredColumns"
          :key="col"
          class="column-item"
        >
          <input
            type="checkbox"
            :checked="selectedColumns.includes(col)"
            @change="toggleColumn(col)"
            class="column-checkbox"
          />
          <span class="column-name">{{ col }}</span>
        </label>
        <div v-if="filteredColumns.length === 0" class="no-results">
          无匹配列名
        </div>
      </div>
    </div>

    <!-- 点击外部关闭遮罩 -->
    <div v-if="isOpen" class="overlay" @click="closePanel"></div>
  </div>
</template>

<script setup>
import { ref, computed, watch, onMounted, onBeforeUnmount } from 'vue';

const props = defineProps({
  availableColumns: {
    type: Array,
    required: true
  },
  selectedColumns: {
    type: Array,
    required: true
  },
  defaultColumns: {
    type: Array,
    required: true
  }
});

const emit = defineEmits(['update:selectedColumns']);

const isOpen = ref(false);
const searchText = ref('');
const selectorRef = ref(null);

const filteredColumns = computed(() => {
  if (!searchText.value) return props.availableColumns;
  const keyword = searchText.value.toLowerCase();
  return props.availableColumns.filter(col =>
    col.toLowerCase().includes(keyword)
  );
});

const togglePanel = () => {
  isOpen.value = !isOpen.value;
  if (isOpen.value) {
    searchText.value = '';
  }
};

const closePanel = () => {
  isOpen.value = false;
};

const toggleColumn = (col) => {
  const current = [...props.selectedColumns];
  const idx = current.indexOf(col);
  if (idx >= 0) {
    current.splice(idx, 1);
  } else {
    current.push(col);
  }
  emit('update:selectedColumns', current);
};

const selectDefault = () => {
  emit('update:selectedColumns', [...props.defaultColumns]);
};

const selectAll = () => {
  emit('update:selectedColumns', [...props.availableColumns]);
};

const deselectAll = () => {
  emit('update:selectedColumns', []);
};

const handleClickOutside = (e) => {
  if (selectorRef.value && !selectorRef.value.contains(e.target)) {
    closePanel();
  }
};

watch(isOpen, (open) => {
  if (open) {
    document.addEventListener('click', handleClickOutside);
  } else {
    document.removeEventListener('click', handleClickOutside);
  }
});

onBeforeUnmount(() => {
  document.removeEventListener('click', handleClickOutside);
});
</script>

<style scoped>
.column-selector {
  position: relative;
}

.column-settings-btn {
  display: flex;
  align-items: center;
  gap: 0.375rem;
  height: 2.25rem;
  padding: 0 0.75rem;
  border: 1px solid #d1d5db;
  border-radius: 0.375rem;
  background-color: white;
  color: #374151;
  font-size: 0.813rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
  white-space: nowrap;
  flex-shrink: 0;
}

.column-settings-btn:hover,
.column-settings-btn.is-active {
  background-color: #f3f4f6;
  border-color: #9ca3af;
}

.gear-icon {
  width: 1rem;
  height: 1rem;
}

.column-panel {
  position: absolute;
  top: calc(100% + 4px);
  right: 0;
  width: 340px;
  max-height: 480px;
  background-color: white;
  border: 1px solid #e5e7eb;
  border-radius: 0.5rem;
  box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05);
  z-index: 100;
  display: flex;
  flex-direction: column;
}

.panel-header {
  padding: 0.75rem;
  border-bottom: 1px solid #f3f4f6;
}

.column-search {
  width: 100%;
  padding: 0.5rem 0.75rem;
  border: 1px solid #e5e7eb;
  border-radius: 0.375rem;
  font-size: 0.813rem;
  color: #374151;
  outline: none;
  box-sizing: border-box;
}

.column-search:focus {
  border-color: #3b82f6;
  box-shadow: 0 0 0 2px rgba(59, 130, 246, 0.15);
}

.panel-actions {
  display: flex;
  gap: 0.5rem;
  padding: 0.5rem 0.75rem;
  border-bottom: 1px solid #f3f4f6;
}

.action-btn {
  height: 2.25rem;
  padding: 0 0.75rem;
  border: 1px solid #e5e7eb;
  border-radius: 0.25rem;
  background-color: white;
  color: #6b7280;
  font-size: 0.75rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.15s;
  white-space: nowrap;
  display: inline-flex;
  align-items: center;
  justify-content: center;
}

.action-btn:hover {
  background-color: #f3f4f6;
  color: #374151;
}

.action-default {
  color: #3b82f6;
  border-color: #3b82f6;
  font-weight: 600;
}

.action-default:hover {
  background-color: #eff6ff;
}

.column-list {
  flex: 1;
  overflow-y: auto;
  padding: 0.5rem 0;
  max-height: 320px;
}

.column-item {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.375rem 0.75rem;
  cursor: pointer;
  transition: background-color 0.1s;
  font-size: 0.813rem;
  color: #374151;
}

.column-item:hover {
  background-color: #f9fafb;
}

.column-checkbox {
  width: 1rem;
  height: 1rem;
  cursor: pointer;
  accent-color: #3b82f6;
  flex-shrink: 0;
}

.column-name {
  user-select: none;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.no-results {
  padding: 1.5rem;
  text-align: center;
  color: #9ca3af;
  font-size: 0.813rem;
}

.overlay {
  position: fixed;
  inset: 0;
  z-index: 99;
}
</style>
