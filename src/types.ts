/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type ToolMode = 'compress' | 'resize' | 'convert' | 'crop' | 'watermark' | 'bg_remover';

export interface ImageFile {
  id: string;
  name: string;
  type: string;
  size: number;
  width: number;
  height: number;
  dataUrl: string; // Original input
}

export interface CompressConfig {
  quality: number; // 0.1 to 1.0
  format: 'image/jpeg' | 'image/webp';
}

export interface ResizeConfig {
  width: number;
  height: number;
  maintainAspectRatio: boolean;
  scaleType: 'pixels' | 'percentage';
  percentage: number;
}

export type AspectRatioPreset = 'custom' | '1:1' | '16:9' | '9:16' | '4:5' | '2:3' | '3:2';

export interface CropConfig {
  aspectRatio: AspectRatioPreset;
  x: number; // normalized 0-1
  y: number; // normalized 0-1
  width: number; // normalized 0-1
  height: number; // normalized 0-1
}

export type WatermarkPosition = 
  | 'top-left' | 'top-center' | 'top-right'
  | 'center-left' | 'center' | 'center-right'
  | 'bottom-left' | 'bottom-center' | 'bottom-right'
  | 'custom';

export interface WatermarkConfig {
  type: 'text' | 'image';
  text: string;
  fontSize: number;
  fontColor: string;
  fontFamily: 'Inter' | 'Space Grotesk' | 'JetBrains Mono' | 'Playfair Display';
  opacity: number; // 0 to 1
  position: WatermarkPosition;
  offsetX: number; // percentage offset
  offsetY: number; // percentage offset
  imageWatermarkUrl: string | null;
  imageWatermarkScale: number; // 0.1 to 1.0
}

export interface BgRemoverConfig {
  mode: 'ai_outline' | 'color_picker';
  tolerance: number; // 0-100 for chroma key
  targetColor: { r: number; g: number; b: number } | null;
  aiPolygon: { x: number; y: number }[] | null;
  aiSubjectName: string | null;
}

export interface SegmentRequest {
  image: string; // base64
  mimeType: string;
}

export interface SegmentResponse {
  success: boolean;
  subjectName: string;
  polygon: { x: number; y: number }[];
  errorMessage?: string;
}
