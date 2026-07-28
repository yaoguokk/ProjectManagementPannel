import { toPng } from 'html-to-image';

/**
 * 将 DOM 元素生成图片并叠加可选的标题/水印
 * @param {HTMLElement} element - 要截图的 DOM 元素
 * @param {Object} options - 配置项
 * @param {boolean} options.addTitle - 是否添加标题
 * @param {boolean} options.addTimestamp - 是否添加时间水印
 * @param {string} options.titleText - 标题文字
 * @returns {Promise<string>} base64 图片数据 URL
 */
export async function generateTableImage(element, options = {}) {
  const { addTitle = false, addTimestamp = false, titleText = '项目全景面板' } = options;

  // 1. 使用 html-to-image 生成基础图片
  const baseUrl = await toPng(element, {
    cacheBust: true,
    pixelRatio: 2, // 高清 2x
    backgroundColor: '#ffffff',
  });

  // 2. 如果不需叠加，直接返回
  if (!addTitle && !addTimestamp) {
    return baseUrl;
  }

  // 3. 用 Canvas 叠加标题/水印
  return await overlayOnCanvas(baseUrl, { addTitle, addTimestamp, titleText });
}

async function overlayOnCanvas(baseUrl, options) {
  const { addTitle, addTimestamp, titleText } = options;

  const img = new Image();
  img.src = baseUrl;
  await new Promise((resolve) => (img.onload = resolve));

  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');

  const titleHeight = addTitle ? 60 : 0;
  const watermarkHeight = addTimestamp ? 30 : 0;

  canvas.width = img.width;
  canvas.height = img.height + titleHeight + watermarkHeight;

  // 白色背景
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // 标题
  if (addTitle) {
    ctx.fillStyle = '#1e293b';
    ctx.font = `bold ${24 * 2}px -apple-system, "Microsoft YaHei", sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(titleText, canvas.width / 2, titleHeight / 2);
  }

  // 表格图片
  ctx.drawImage(img, 0, titleHeight);

  // 时间水印
  if (addTimestamp) {
    const now = new Date();
    const timeStr = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}-${String(now.getDate()).padStart(2,'0')} ${String(now.getHours()).padStart(2,'0')}:${String(now.getMinutes()).padStart(2,'0')}`;
    ctx.fillStyle = '#9ca3af';
    ctx.font = `${14 * 2}px -apple-system, "Microsoft YaHei", sans-serif`;
    ctx.textAlign = 'right';
    ctx.textBaseline = 'middle';
    ctx.fillText(timeStr, canvas.width - 20 * 2, titleHeight + img.height + watermarkHeight / 2);
  }

  return canvas.toDataURL('image/png');
}

/**
 * 下载图片
 * @param {string} dataUrl - base64 图片数据
 * @param {string} filename - 文件名
 */
export function downloadImage(dataUrl, filename) {
  const link = document.createElement('a');
  link.download = filename;
  link.href = dataUrl;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}
