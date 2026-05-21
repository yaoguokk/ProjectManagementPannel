import { ref } from 'vue';

/**
 * Toast提示组合式函数
 * @returns {Object} Toast相关方法
 */
export const useToast = () => {
  const show = ref(false);
  const message = ref('');
  const type = ref('info'); // 'success', 'error', 'warning', 'info'

  /**
   * 显示Toast
   * @param {string} msg - 提示信息
   * @param {string} toastType - 提示类型
   * @param {number} duration - 显示时长（毫秒）
   */
  const showToast = (msg, toastType = 'info', duration = 3000) => {
    message.value = msg;
    type.value = toastType;
    show.value = true;

    // 设置定时器关闭
    setTimeout(() => {
      show.value = false;
    }, duration);
  };

  /**
   * 显示成功提示
   * @param {string} msg - 提示信息
   * @param {number} duration - 显示时长
   */
  const showSuccess = (msg, duration = 3000) => {
    showToast(msg, 'success', duration);
  };

  /**
   * 显示错误提示
   * @param {string} msg - 提示信息
   * @param {number} duration - 显示时长
   */
  const showError = (msg, duration = 3000) => {
    showToast(msg, 'error', duration);
  };

  /**
   * 显示警告提示
   * @param {string} msg - 提示信息
   * @param {number} duration - 显示时长
   */
  const showWarning = (msg, duration = 3000) => {
    showToast(msg, 'warning', duration);
  };

  /**
   * 显示信息提示
   * @param {string} msg - 提示信息
   * @param {number} duration - 显示时长
   */
  const showInfo = (msg, duration = 3000) => {
    showToast(msg, 'info', duration);
  };

  /**
   * 隐藏Toast
   */
  const hideToast = () => {
    show.value = false;
  };

  return {
    show,
    message,
    type,
    showToast,
    showSuccess,
    showError,
    showWarning,
    showInfo,
    hideToast
  };
};
