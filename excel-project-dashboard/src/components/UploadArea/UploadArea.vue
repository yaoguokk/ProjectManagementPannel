<template>
  <div class="upload-area" :class="{ 'is-dragover': isDragOver }">
    <input
      type="file"
      ref="fileInput"
      @change="handleFileChange"
      accept=".xlsx,.xls"
      class="file-input"
    />

    <div class="upload-content" @click="triggerFileInput" @dragover.prevent="handleDragOver" @dragleave.prevent="handleDragLeave" @drop.prevent="handleDrop">
      <div class="upload-icon">
        <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
        </svg>
      </div>

      <div class="upload-text">
        <h3 class="upload-title">{{ title }}</h3>
        <p class="upload-subtitle">{{ description }}</p>
        <p class="upload-hint">请上传文件名含"{{ ACCEPT_CONFIG[acceptType].keyword }}"的Excel文件</p>
      </div>

      <button class="upload-btn">
        选择文件
      </button>
    </div>

    <!-- 上传进度 -->
    <div v-if="isUploading" class="upload-progress">
      <div class="progress-bar">
        <div class="progress-fill" :style="{ width: uploadProgress + '%' }"></div>
      </div>
      <p class="progress-text">正在处理文件...</p>
    </div>

    <!-- 文件列表 -->
    <div v-if="uploadedFiles.length > 0" class="file-list">
      <h4 class="file-list-title">已上传文件</h4>
      <div v-for="file in uploadedFiles" :key="file.id" class="file-item">
        <div class="file-info">
          <svg xmlns="http://www.w3.org/2000/svg" class="file-icon" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          <div class="file-details">
            <span class="file-name">{{ file.name }}</span>
            <span class="file-size">{{ formatFileSize(file.size) }}</span>
          </div>
        </div>
        <div class="file-status">
          <span v-if="file.status === 'success'" class="status-success">
            <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
              <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd" />
            </svg>
            解析成功
          </span>
          <span v-else-if="file.status === 'error'" class="status-error">
            <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
              <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clip-rule="evenodd" />
            </svg>
            解析失败
          </span>
          <span v-else class="status-processing">
            <svg xmlns="http://www.w3.org/2000/svg" class="animate-spin h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
              <path fill-rule="evenodd" d="M4 2a1 1 0 011 1v2.101a7.002 7.002 0 0111.601 2.566 1 1 0 11-1.885.666A5.002 5.002 0 005.999 7H9a1 1 0 010 2H4a1 1 0 01-1-1V3a1 1 0 011-1zm.008 9.057a1 1 0 011.276.61A5.002 5.002 0 0014.001 13H11a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0v-2.101a7.002 7.002 0 01-11.601-2.566 1 1 0 01.61-1.276z" clip-rule="evenodd" />
            </svg>
            处理中
          </span>
        </div>
      </div>
    </div>

    <!-- 数据清洗规则说明 -->
    <div class="cleaning-rules">
      <h4 class="rules-title">数据清洗规则</h4>
      <ul class="rules-list">
        <li v-if="acceptType === 'business'" class="rule-item">
          <span class="rule-icon">✓</span>
          排除"立项方式"为"基于商机立项"的行
        </li>
        <li class="rule-item">
          <span class="rule-icon">✓</span>
          只保留项目状态为"待结算/已结算/待终验/待初验"的行
        </li>
        <li class="rule-item">
          <span class="rule-icon">✓</span>
          去除字符串前后空格
        </li>
        <li class="rule-item">
          <span class="rule-icon">✓</span>
          统一日期格式为 YYYY-MM-DD
        </li>
        <li class="rule-item">
          <span class="rule-icon">✓</span>
          清洗金额字段（去除¥、$、逗号等符号）
        </li>
        <li v-if="acceptType === 'self-funded'" class="rule-item">
          <span class="rule-icon">✓</span>
          投资总金额从万元转换为元（×10000）
        </li>
      </ul>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue';
import { useToast } from '../../composables/useToast';
import { parseExcelFile } from '../../utils/excelParser';
import { cleanExcelData, cleanSelfFundedData } from '../../utils/dataCleaner';

const props = defineProps({
  // 'business' | 'self-funded'
  acceptType: {
    type: String,
    required: true
  },
  title: {
    type: String,
    default: '拖拽 Excel 文件到此处或点击上传'
  },
  description: {
    type: String,
    default: '支持 .xlsx 和 .xls 格式'
  }
});

const emit = defineEmits(['file-uploaded', 'file-error']);

const fileInput = ref(null);
const isDragOver = ref(false);
const isUploading = ref(false);
const uploadProgress = ref(0);
const uploadedFiles = ref([]);

const { showToast } = useToast();

const ACCEPT_CONFIG = {
  'business': {
    keyword: '经营项目台账明细列表',
    skipRows: 0,
    cleaner: cleanExcelData,
    label: '经营项目'
  },
  'self-funded': {
    keyword: '自筹项目台账列表',
    skipRows: 1,
    cleaner: cleanSelfFundedData,
    label: '自筹项目'
  }
};

// 触发文件选择
const triggerFileInput = () => {
  fileInput.value.click();
};

// 处理文件选择
const handleFileChange = (event) => {
  const files = event.target.files;
  if (files.length > 0) {
    handleFile(files[0]);
  }
  // 清空 input，允许重复选择同一文件
  event.target.value = '';
};

// 处理拖拽
const handleDragOver = () => {
  isDragOver.value = true;
};

const handleDragLeave = () => {
  isDragOver.value = false;
};

const handleDrop = (event) => {
  isDragOver.value = false;
  const files = event.dataTransfer.files;
  if (files.length > 0) {
    // 检查文件类型
    const file = files[0];
    const validTypes = [
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/vnd.ms-excel',
      'application/vnd.ms-excel.sheet.binary.macroEnabled.12'
    ];

    if (!validTypes.includes(file.type) && !file.name.match(/\.(xlsx|xls)$/i)) {
      showToast('请上传 Excel 文件（.xlsx 或 .xls）', 'error');
      return;
    }

    handleFile(file);
  }
};

// 校验文件名是否匹配当前上传区域
const validateFileName = (fileName) => {
  const config = ACCEPT_CONFIG[props.acceptType];
  if (!fileName.includes(config.keyword)) {
    const otherType = props.acceptType === 'business' ? '自筹项目' : '经营项目';
    throw new Error(`文件名不匹配！${config.label}请上传含"${config.keyword}"的文件，当前文件名不含此关键词。如果是${otherType}表格，请上传到${otherType}区域`);
  }
};

// 处理文件上传
const handleFile = async (file) => {
  const config = ACCEPT_CONFIG[props.acceptType];
  const fileId = Date.now().toString();
  const fileObj = {
    id: fileId,
    name: file.name,
    size: file.size,
    status: 'processing'
  };

  uploadedFiles.value.push(fileObj);

  try {
    isUploading.value = true;
    uploadProgress.value = 0;

    // 校验文件名
    validateFileName(file.name);

    // 模拟进度
    const progressInterval = setInterval(() => {
      if (uploadProgress.value < 90) {
        uploadProgress.value += 10;
      }
    }, 200);

    // 解析 Excel 文件
    const result = await parseExcelFile(file, { skipRows: config.skipRows });

    // 应用数据清洗规则
    const cleanedData = config.cleaner(result.rawData, file.name);

    clearInterval(progressInterval);
    uploadProgress.value = 100;

    // 更新文件状态
    const fileIndex = uploadedFiles.value.findIndex(f => f.id === fileId);
    if (fileIndex > -1) {
      uploadedFiles.value[fileIndex].status = 'success';
    }

    // 发送解析结果
    emit('file-uploaded', {
      headers: result.headers,
      data: cleanedData,
      rawData: result.rawData,
      fileName: file.name,
      acceptType: props.acceptType
    });

    showToast(`${file.name} 解析成功，共 ${cleanedData.length} 条有效数据`, 'success');

  } catch (error) {
    // 更新文件状态
    const fileIndex = uploadedFiles.value.findIndex(f => f.id === fileId);
    if (fileIndex > -1) {
      uploadedFiles.value[fileIndex].status = 'error';
    }

    showToast(error.message, 'error');
    emit('file-error', error);
  } finally {
    isUploading.value = false;
    uploadProgress.value = 0;

    // 3秒后清理完成状态的文件
    setTimeout(() => {
      const index = uploadedFiles.value.findIndex(f => f.id === fileId);
      if (index > -1 && uploadedFiles.value[index].status === 'success') {
        uploadedFiles.value.splice(index, 1);
      }
    }, 3000);
  }
};

// 格式化文件大小
const formatFileSize = (bytes) => {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};
</script>

<style scoped>
.upload-area {
  background-color: white;
  border: 2px dashed #d1d5db;
  border-radius: 0.5rem;
  padding: 2rem;
  text-align: center;
  transition: all 0.3s ease;
  cursor: pointer;
}

.upload-area.is-dragover {
  border-color: #3b82f6;
  background-color: #eff6ff;
}

.file-input {
  display: none;
}

.upload-content {
  cursor: pointer;
}

.upload-icon {
  width: 24px;
  height: 24px;
  margin-bottom: 1rem;
  display: flex;
  align-items: center;
  justify-content: center;
}

.upload-title {
  font-size: 1.125rem;
  font-weight: 600;
  color: #374151;
  margin-bottom: 0.5rem;
}

.upload-subtitle {
  font-size: 0.875rem;
  color: #6b7280;
  margin-bottom: 0.5rem;
}

.upload-hint {
  font-size: 0.75rem;
  color: #f59e0b;
  margin-bottom: 1.5rem;
  max-width: 500px;
  margin-left: auto;
  margin-right: auto;
  line-height: 1.4;
}

.upload-btn {
  display: inline-flex;
  align-items: center;
  height: 2.25rem;
  padding: 0 1.5rem;
  background-color: #3b82f6;
  color: white;
  border: none;
  border-radius: 0.375rem;
  font-size: 0.875rem;
  font-weight: 500;
  transition: background-color 0.2s;
}

.upload-btn:hover {
  background-color: #2563eb;
}

.upload-progress {
  margin-top: 1.5rem;
}

.progress-bar {
  width: 100%;
  height: 4px;
  background-color: #e5e7eb;
  border-radius: 2px;
  overflow: hidden;
}

.progress-fill {
  height: 100%;
  background-color: #3b82f6;
  transition: width 0.3s ease;
}

.progress-text {
  margin-top: 0.5rem;
  font-size: 0.875rem;
  color: #6b7280;
}

.file-list {
  margin-top: 2rem;
  text-align: left;
}

.file-list-title {
  font-size: 1rem;
  font-weight: 600;
  color: #374151;
  margin-bottom: 1rem;
}

.file-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.75rem;
  background-color: #f9fafb;
  border-radius: 0.375rem;
  margin-bottom: 0.5rem;
}

.file-info {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.file-icon {
  width: 24px;
  height: 24px;
  color: #6b7280;
}

.file-details {
  display: flex;
  flex-direction: column;
}

.file-name {
  font-size: 0.875rem;
  font-weight: 500;
  color: #374151;
}

.file-size {
  font-size: 0.75rem;
  color: #9ca3af;
}

.file-status {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.875rem;
}

.status-success {
  color: #10b981;
}

.status-error {
  color: #ef4444;
}

.status-processing {
  color: #3b82f6;
}

.status-processing svg {
  animation: spin 1s linear infinite;
}

@keyframes spin {
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(360deg);
  }
}

/* 数据清洗规则样式 */
.cleaning-rules {
  margin-top: 2rem;
  padding: 1rem;
  background-color: #f8fafc;
  border-radius: 0.375rem;
  border-left: 4px solid #3b82f6;
}

.rules-title {
  font-size: 0.875rem;
  font-weight: 600;
  color: #374151;
  margin-bottom: 0.75rem;
}

.rules-list {
  list-style: none;
  padding: 0;
  margin: 0;
}

.rule-item {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.75rem;
  color: #6b7280;
  margin-bottom: 0.5rem;
}

.rule-item:last-child {
  margin-bottom: 0;
}

.rule-icon {
  width: 16px;
  height: 16px;
  background-color: #10b981;
  color: white;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 0.625rem;
  font-weight: bold;
  flex-shrink: 0;
}
</style>