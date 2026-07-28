<template>
  <Teleport to="body">
    <div v-if="visible" class="modal-overlay" @click.self="handleCancel">
      <div class="modal-container">
        <div class="modal-header">
          <h3>📷 生成分享图片</h3>
          <button class="close-btn" @click="handleCancel">×</button>
        </div>

        <div class="modal-body">
          <!-- 选项 -->
          <div class="options" v-if="!imageUrl">
            <label class="option-item">
              <input type="checkbox" v-model="options.addTitle" />
              <span>添加标题</span>
            </label>
            <label class="option-item">
              <input type="checkbox" v-model="options.addTimestamp" />
              <span>添加生成时间水印</span>
            </label>
          </div>

          <!-- 预览 -->
          <div class="preview-area" v-if="imageUrl">
            <img :src="imageUrl" alt="预览" class="preview-image" />
          </div>

          <!-- 加载状态 -->
          <div class="loading" v-if="generating">
            <div class="spinner"></div>
            <span>正在生成图片...</span>
          </div>
        </div>

        <div class="modal-footer">
          <button class="btn-cancel" @click="handleCancel" v-if="!generating">
            取消
          </button>
          <button
            class="btn-generate"
            @click="handleGenerate"
            v-if="!imageUrl"
            :disabled="generating"
          >
            生成预览
          </button>
          <button
            class="btn-download"
            @click="handleDownload"
            v-if="imageUrl"
          >
            📥 下载PNG
          </button>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<script setup>
import { ref, reactive } from 'vue';
import { generateTableImage, downloadImage } from '../../utils/imageExport';

const props = defineProps({
  tableRef: { type: Object, default: null },
  titleText: { type: String, default: '项目全景面板' },
});

const emit = defineEmits(['close']);

const visible = ref(true);
const generating = ref(false);
const imageUrl = ref(null);

const options = reactive({
  addTitle: false,
  addTimestamp: false,
});

async function handleGenerate() {
  if (!props.tableRef) return;
  generating.value = true;
  try {
    imageUrl.value = await generateTableImage(props.tableRef, {
      addTitle: options.addTitle,
      addTimestamp: options.addTimestamp,
      titleText: props.titleText,
    });
  } catch (err) {
    alert('生成图片失败: ' + err.message);
  } finally {
    generating.value = false;
  }
}

function handleDownload() {
  if (!imageUrl.value) return;
  const date = new Date().toISOString().slice(0, 10);
  downloadImage(imageUrl.value, `项目全景面板_${date}.png`);
  handleCancel();
}

function handleCancel() {
  visible.value = false;
  emit('close');
}
</script>

<style scoped>
.modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 9999;
}
.modal-container {
  background: #fff;
  border-radius: 12px;
  width: 90%;
  max-width: 800px;
  max-height: 90vh;
  display: flex;
  flex-direction: column;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
}
.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px 20px;
  border-bottom: 1px solid #e5e7eb;
}
.modal-header h3 {
  font-size: 16px;
  font-weight: 600;
  color: #1e293b;
  margin: 0;
}
.close-btn {
  background: none;
  border: none;
  font-size: 24px;
  color: #9ca3af;
  cursor: pointer;
  padding: 0 4px;
  line-height: 1;
}
.close-btn:hover { color: #374151; }

.modal-body {
  padding: 20px;
  overflow-y: auto;
  flex: 1;
}
.options {
  display: flex;
  gap: 24px;
  margin-bottom: 16px;
}
.option-item {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 14px;
  color: #374151;
  cursor: pointer;
}
.option-item input[type="checkbox"] {
  width: 16px;
  height: 16px;
  cursor: pointer;
}

.preview-area {
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  overflow: hidden;
  max-height: 60vh;
  overflow-y: auto;
}
.preview-image {
  width: 100%;
  display: block;
}

.loading {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
  padding: 40px;
  color: #6b7280;
}
.spinner {
  width: 32px;
  height: 32px;
  border: 3px solid #e5e7eb;
  border-top-color: #3b82f6;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}
@keyframes spin { to { transform: rotate(360deg); } }

.modal-footer {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  padding: 16px 20px;
  border-top: 1px solid #e5e7eb;
}
.btn-cancel,
.btn-generate,
.btn-download {
  height: 2.25rem;
  padding: 0 1.25rem;
  border-radius: 6px;
  font-size: 0.875rem;
  font-weight: 500;
  cursor: pointer;
  border: 1px solid;
  transition: all 0.2s;
  white-space: nowrap;
  display: inline-flex;
  align-items: center;
  justify-content: center;
}
.btn-cancel {
  background: #fff;
  border-color: #d1d5db;
  color: #374151;
}
.btn-cancel:hover { background: #f9fafb; }
.btn-generate {
  background: #3b82f6;
  border-color: #3b82f6;
  color: #fff;
}
.btn-generate:hover { background: #2563eb; }
.btn-generate:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
.btn-download {
  background: #16a34a;
  border-color: #16a34a;
  color: #fff;
}
.btn-download:hover { background: #15803d; }
</style>
