<template>
  <!-- 区域 A：数据导入（入口由数据集注册表生成，新增数据源自动出现一个新入口） -->
  <div class="upload-section">
    <SectionHeader :badge="section.badge" :title="section.title" :tone="section.tone" />
    <div class="upload-grid">
      <div v-for="option in uploadOptions" :key="option.type" class="upload-col">
        <UploadArea
          :accept-type="option.type"
          :title="option.uploadTitle"
          :description="UPLOAD_DESCRIPTION"
          @file-uploaded="handleFileUploaded"
          @file-error="handleFileError"
          @batch-done="handleBatchDone"
        />
      </div>
    </div>
  </div>
</template>

<script setup>
/**
 * A 区域容器
 *
 * 写数据只走 dataStore.setDataset，提示文案由 ACCEPT_CONFIG 注册表拼装，
 * 因此新增数据集（如「预算表」）时本组件零改动。
 * 整批上传结束后跳转到概览页，让用户立刻看到结果。
 */
import { useRoute, useRouter } from 'vue-router';
import { navLocation } from '../../utils/filterQuery';
import { buildImportMessage, datasetOptions } from '../../utils/uploadRouting';
import { useDataStore } from '../../stores/dataStore';
import { useToast } from '../../composables/useToast';
import SectionHeader from '../common/SectionHeader.vue';
import UploadArea from '../UploadArea/UploadArea.vue';

defineProps({
  section: { type: Object, required: true },
});

const UPLOAD_DESCRIPTION = '任一入口均可一次选择 1-3 个文件，按文件名自动分发';

const uploadOptions = datasetOptions();
const dataStore = useDataStore();
const router = useRouter();
const route = useRoute();
const { showSuccess, showError } = useToast();

const handleFileUploaded = (fileData) => {
  try {
    const { data, acceptType, fileName } = fileData;
    dataStore.setDataset(acceptType, data);
    showSuccess(buildImportMessage(acceptType, data, dataStore.datasets, fileName));
  } catch (error) {
    showError('导入数据失败：' + error.message);
  }
};

/**
 * 跳转必须等「整批」结束（batch-done），不能在每个文件成功后就跳：
 * UploadArea 是串行异步解析的，第一个文件成功即切走会卸载本组件，
 * 后续文件的 file-uploaded 事件会被 Vue 丢弃（emit 在已卸载实例上直接 return），
 * 表现为「一次选了 3 个台账，只有第一个的数据进了系统」。
 */
const handleBatchDone = ({ successCount } = {}) => {
  if (successCount > 0) {
    // 带上当前筛选条件：否则跳转会清掉 URL query，把已设的时间范围重置成默认
    router.push(navLocation({ name: 'overview' }, route.query));
  }
};

const handleFileError = (error) => {
  showError(error.message);
};
</script>

<style scoped>
.upload-section {
  background-color: white;
  border-radius: 0.5rem;
  box-shadow: 0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06);
  padding: 1.5rem;
}

.upload-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 1.25rem;
}

@media (max-width: 1100px) {
  .upload-grid {
    grid-template-columns: 1fr;
  }
}

.upload-col {
  min-width: 0;
}
</style>
