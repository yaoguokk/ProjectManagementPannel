import { ref } from 'vue';

/**
 * 错误处理组合式函数
 * @returns {Object} 错误处理方法
 */
export const useErrorHandler = () => {
  const error = ref(null);
  const showErrorToast = ref(false);

  /**
   * 显示错误信息
   * @param {string} message - 错误信息
   */
  const showError = (message) => {
    error.value = message;
    showErrorToast.value = true;
    
    // 3秒后自动隐藏
    setTimeout(() => {
      showErrorToast.value = false;
      error.value = null;
    }, 3000);
  };

  /**
   * 隐藏错误信息
   */
  const hideError = () => {
    showErrorToast.value = false;
    error.value = null;
  };

  return {
    error,
    showErrorToast,
    showError,
    hideError
  };
};
