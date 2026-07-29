import { ref } from 'vue';
import { ToastType } from '../constants/projectStatus';

// Toast 是应用级 UI 状态：所有组件必须读写同一个引用。
const toast = ref({
  show: false,
  message: '',
  type: ToastType.INFO,
  duration: 3000
});

let hideTimer = null;

/**
 * Toast提示管理组合式函数
 * 提供全局Toast提示功能
 */
export const useToast = () => {
  /**
   * 显示成功提示
   * @param {string} message - 提示消息
   * @param {number} duration - 显示时长（毫秒）
   */
  const showSuccess = (message, duration = 3000) => {
    showToast(message, ToastType.SUCCESS, duration);
  };

  /**
   * 显示错误提示
   * @param {string} message - 提示消息
   * @param {number} duration - 显示时长（毫秒）
   */
  const showError = (message, duration = 3000) => {
    showToast(message, ToastType.ERROR, duration);
  };

  /**
   * 显示警告提示
   * @param {string} message - 提示消息
   * @param {number} duration - 显示时长（毫秒）
   */
  const showWarning = (message, duration = 3000) => {
    showToast(message, ToastType.WARNING, duration);
  };

  /**
   * 显示信息提示
   * @param {string} message - 提示消息
   * @param {number} duration - 显示时长（毫秒）
   */
  const showInfo = (message, duration = 3000) => {
    showToast(message, ToastType.INFO, duration);
  };

  /**
   * 通用Toast显示方法
   * @param {string} message - 提示消息
   * @param {string} type - 提示类型
   * @param {number} duration - 显示时长（毫秒）
   */
  const showToast = (message, type = ToastType.INFO, duration = 3000) => {
    if (hideTimer) {
      clearTimeout(hideTimer);
    }

    toast.value = {
      show: true,
      message,
      type,
      duration
    };

    // 自动隐藏
    hideTimer = setTimeout(() => {
      hideToast();
    }, duration);
  };

  /**
   * 隐藏Toast
   */
  const hideToast = () => {
    toast.value.show = false;
    if (hideTimer) {
      clearTimeout(hideTimer);
      hideTimer = null;
    }
  };

  return {
    toast,
    showSuccess,
    showError,
    showWarning,
    showInfo,
    showToast,
    hideToast
  };
};
