<template>
  <div class="upload-area" @drop="handleDrop" @dragover.prevent @dragenter.prevent>
    <div v-if="!file" class="upload-placeholder">
      <div class="upload-icon">
        <svg xmlns="http://www.w3.org/2000/svg" class="h-16 w-16 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
        </svg>
      </div>
      <div class="upload-text">
        <h3 class="text-lg font-medium text-gray-900">拖拽Excel文件到此处</h3>
        <p class="text-sm text-gray-500">或点击选择文件</p>
      </div>
      <input
        type="file"
        @change="handleFileSelect"
        accept=".xlsx,.xls"
        class="hidden"
        ref="fileInput"
      />
      <button
        @click="triggerFileSelect"
        class="mt-4 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
      >
        选择文件
      </button>
    </div>

    <div v-else class="file-info">
      <div class="file-details">
        <div class="file-name">{{ file.name }}</div>
        <div class="file-size">{{ formatFileSize(file.size) }}</div>
      </div>
      <button
        @click="removeFile"
        class="remove-file text-red-600 hover:text-red-800"
      >
        <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
          <path fill-rule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clip-rule="evenodd" />
        </svg>
      </button>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue';
import { parseExcelFile } from '@/utils/excelParser';

const fileInput = ref(null);
const file = ref(null);
const emit = defineEmits(['file-selected']);

const triggerFileSelect = () => {
  fileInput.value.click();
};

const handleFileSelect = async (event) => {
  const selectedFile = event.target.files[0];
  if (selectedFile) {
    file.value = selectedFile;
    await processFile(selectedFile);
  }
};

const handleDrop = async (event) => {
  event.preventDefault();
  const droppedFile = event.dataTransfer.files[0];
  if (droppedFile) {
    file.value = droppedFile;
    await processFile(droppedFile);
  }
};

const processFile = async (selectedFile) => {
  try {
    const result = await parseExcelFile(selectedFile);
    emit('file-selected', result);
  } catch (error) {
    console.error('文件处理失败:', error);
    // 这里可以添加错误提示
  }
};

const removeFile = () => {
  file.value = null;
  if (fileInput.value) {
    fileInput.value.value = '';
  }
};

const formatFileSize = (bytes) => {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
};
</script>

<style scoped>
.upload-area {
  border: 2px dashed #cbd5e1;
  border-radius: 0.5rem;
  padding: 2rem;
  text-align: center;
  transition: all 0.3s ease;
  background-color: #f8fafc;
  min-height: 200px;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
}

.upload-area:hover {
  border-color: #3b82f6;
  background-color: #f1f5f9;
}

.upload-placeholder {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
}

.upload-icon {
  margin-bottom: 1rem;
}

.upload-text {
  margin-bottom: 1.5rem;
}

.file-info {
  display: flex;
  justify-content: space-between;
  align-items: center;
  width: 100%;
  padding: 1rem;
  background-color: #f1f5f9;
  border-radius: 0.5rem;
}

.file-details {
  display: flex;
  flex-direction: column;
}

.file-name {
  font-medium;
  color: #1f2937;
  margin-bottom: 0.25rem;
}

.file-size {
  font-smaller text-gray-500;
}

.remove-file {
  background: none;
  border: none;
  cursor: pointer;
  padding: 0.5rem;
}

.remove-file:hover {
  color: #dc2626;
}
</style>
