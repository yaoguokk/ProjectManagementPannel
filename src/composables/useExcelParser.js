import { ref } from 'vue';

/**
 * Excel文件解析组合式函数
 * @returns {Object} 解析相关方法和状态
 */
export const useExcelParser = () => {
  const loading = ref(false);
  const error = ref(null);

  /**
   * 解析Excel文件
   * @param {File} file - Excel文件
   * @returns {Promise<Object>} 解析后的数据
   */
  const parseFile = async (file) => {
    if (!file) {
      throw new Error('请选择Excel文件');
    }

    loading.value = true;
    error.value = null;

    try {
      // 这里需要导入xlsx库
      const { parseExcelFile } = await import('@/utils/excelParser');
      return await parseExcelFile(file);
    } catch (err) {
      error.value = err.message || '文件解析失败';
      throw err;
    } finally {
      loading.value = false;
    }
  };

  /**
   * 重置状态
   */
  const reset = () => {
    loading.value = false;
    error.value = null;
  };

  return {
    loading,
    error,
    parseFile,
    reset
  };
};
