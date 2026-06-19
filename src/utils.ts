/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { WatermarkConfig, ResizeConfig } from './types';

// Format bytes to human readable string (KB, MB etc)
export function formatBytes(bytes: number, decimals = 2): string {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
}

// Convert a base64 or DataURL to a Blob object
export function dataURLtoBlob(dataUrl: string): Blob {
  const arr = dataUrl.split(',');
  const mime = arr[0].match(/:(.*?);/)?.[1] || 'image/png';
  const bstr = atob(arr[1]);
  let n = bstr.length;
  const u8arr = new Uint8Array(n);
  while (n--) {
    u8arr[n] = bstr.charCodeAt(n);
  }
  return new Blob([u8arr], { type: mime });
}

// Draw text or image watermark onto standard canvas
export function drawWatermark(
  ctx: CanvasRenderingContext2D,
  imgWidth: number,
  imgHeight: number,
  config: WatermarkConfig,
  logoImgElement: HTMLImageElement | null = null
) {
  ctx.save();

  if (config.type === 'text') {
    if (!config.text) return;
    const fontSz = Math.max(12, Math.round((config.fontSize / 400) * imgWidth));
    ctx.font = `${fontSz}px "${config.fontFamily || 'Inter'}", sans-serif`;
    ctx.fillStyle = config.fontColor;
    ctx.globalAlpha = config.opacity;
    ctx.textBaseline = 'middle';
    ctx.textAlign = 'center';

    const textMetrics = ctx.measureText(config.text);
    const textWidth = textMetrics.width;
    const textHeight = fontSz;

    let x = imgWidth / 2;
    let y = imgHeight / 2;

    const padX = textWidth / 2 + 20;
    const padY = textHeight / 2 + 20;

    switch (config.position) {
      case 'top-left':
        x = padX;
        y = padY;
        break;
      case 'top-center':
        x = imgWidth / 2;
        y = padY;
        break;
      case 'top-right':
        x = imgWidth - padX;
        y = padY;
        break;
      case 'center-left':
        x = padX;
        y = imgHeight / 2;
        break;
      case 'center':
        x = imgWidth / 2;
        y = imgHeight / 2;
        break;
      case 'center-right':
        x = imgWidth - padX;
        y = imgHeight / 2;
        break;
      case 'bottom-left':
        x = padX;
        y = imgHeight - padY;
        break;
      case 'bottom-center':
        x = imgWidth / 2;
        y = imgHeight - padY;
        break;
      case 'bottom-right':
        x = imgWidth - padX;
        y = imgHeight - padY;
        break;
      case 'custom':
        x = (config.offsetX / 100) * imgWidth;
        y = (config.offsetY / 100) * imgHeight;
        break;
    }

    ctx.fillText(config.text, x, y);
  } else if (config.type === 'image' && logoImgElement) {
    ctx.globalAlpha = config.opacity;
    
    // Scale watermark relative to target image width
    const maxW = imgWidth * 0.3 * config.imageWatermarkScale; 
    let w = logoImgElement.width;
    let h = logoImgElement.height;
    if (w > maxW) {
      const ratio = maxW / w;
      w = maxW;
      h = h * ratio;
    }

    let x = (imgWidth - w) / 2;
    let y = (imgHeight - h) / 2;

    const padX = 20;
    const padY = 20;

    switch (config.position) {
      case 'top-left':
        x = padX;
        y = padY;
        break;
      case 'top-center':
        x = (imgWidth - w) / 2;
        y = padY;
        break;
      case 'top-right':
        x = imgWidth - w - padX;
        y = padY;
        break;
      case 'center-left':
        x = padX;
        y = (imgHeight - h) / 2;
        break;
      case 'center':
        x = (imgWidth - w) / 2;
        y = (imgHeight - h) / 2;
        break;
      case 'center-right':
        x = imgWidth - w - padX;
        y = (imgHeight - h) / 2;
        break;
      case 'bottom-left':
        x = padX;
        y = imgHeight - h - padY;
        break;
      case 'bottom-center':
        x = (imgWidth - w) / 2;
        y = imgHeight - h - padY;
        break;
      case 'bottom-right':
        x = imgWidth - w - padX;
        y = imgHeight - h - padY;
        break;
      case 'custom':
        x = (config.offsetX / 100) * imgWidth - w / 2;
        y = (config.offsetY / 100) * imgHeight - h / 2;
        break;
    }

    ctx.drawImage(logoImgElement, x, y, w, h);
  }

  ctx.restore();
}

// Perform client-side chroma key (remove background color)
export function removeBackgroundColor(
  imgData: ImageData,
  targetColor: { r: number; g: number; b: number },
  tolerancePct: number
) {
  const data = imgData.data;
  const tolerance = (tolerancePct / 100) * 255;

  for (let i = 0; i < data.length; i += 4) {
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];
    
    // Calculate distance in RGB space
    const rDiff = r - targetColor.r;
    const gDiff = g - targetColor.g;
    const bDiff = b - targetColor.b;
    const distance = Math.sqrt(rDiff * rDiff + gDiff * gDiff + bDiff * bDiff);

    if (distance <= tolerance) {
      // Set to fully transparent alpha channel
      data[i + 3] = 0;
    }
  }
}

// Helper to calculate resized dimensions preserving aspect ratio
export function calculateTargetSize(
  origWidth: number,
  origHeight: number,
  config: ResizeConfig
): { width: number; height: number } {
  if (config.scaleType === 'percentage') {
    const coef = config.percentage / 100;
    return {
      width: Math.max(1, Math.round(origWidth * coef)),
      height: Math.max(1, Math.round(origHeight * coef)),
    };
  }

  const targetW = config.width;
  const targetH = config.height;

  if (config.maintainAspectRatio) {
    const ratio = origWidth / origHeight;
    // Base aspect ratio on width changes
    if (targetW !== origWidth) {
      return {
        width: Math.max(1, targetW),
        height: Math.max(1, Math.round(targetW / ratio)),
      };
    } else if (targetH !== origHeight) {
      return {
        width: Math.max(1, Math.round(targetH * ratio)),
        height: Math.max(1, targetH),
      };
    }
  }

  return {
    width: Math.max(1, targetW),
    height: Math.max(1, targetH),
  };
}
