/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect } from 'react';
import { ImageFile, ResizeConfig } from '../types';
import { calculateTargetSize, formatBytes } from '../utils';
import { RefreshCw, Download, AlertTriangle, Monitor, MoveRight } from 'lucide-react';

interface ResizeToolProps {
  image: ImageFile;
  onUpdateImage: (newUrl: string, size: number) => void;
}

// Preset Dimensions definition
const PRESETS = [
  { name: 'Instagram Square (1080p)', width: 1080, height: 1080 },
  { name: 'Instagram Stories / Reels', width: 1080, height: 1920 },
  { name: 'YouTube Thumbnail (720p)', width: 1280, height: 720 },
  { name: 'Twitter/X Header Banner', width: 1500, height: 500 },
  { name: 'Standard Full HD (1080p)', width: 1920, height: 1080 },
];

export default function ResizeTool({ image, onUpdateImage }: ResizeToolProps) {
  const [config, setConfig] = useState<ResizeConfig>({
    width: image.width,
    height: image.height,
    maintainAspectRatio: true,
    scaleType: 'pixels',
    percentage: 100,
  });

  const [resizedDimensions, setResizedDimensions] = useState({ width: image.width, height: image.height });
  const [previewDataUrl, setPreviewDataUrl] = useState<string>('');
  const [isProcessing, setIsProcessing] = useState<boolean>(false);

  // Synchronize target inputs when image file source changes
  useEffect(() => {
    setConfig({
      width: image.width,
      height: image.height,
      maintainAspectRatio: true,
      scaleType: 'pixels',
      percentage: 100,
    });
  }, [image]);

  // Recalculate aspect-ratio constraints when configuration changes
  useEffect(() => {
    const nextSize = calculateTargetSize(image.width, image.height, config);
    setResizedDimensions(nextSize);
  }, [config, image]);

  const handleWidthChange = (val: string) => {
    const num = parseInt(val) || 0;
    if (config.maintainAspectRatio) {
      const ratio = image.width / image.height;
      setConfig({
        ...config,
        width: num,
        height: Math.max(1, Math.round(num / ratio)),
      });
    } else {
      setConfig({ ...config, width: num });
    }
  };

  const handleHeightChange = (val: string) => {
    const num = parseInt(val) || 0;
    if (config.maintainAspectRatio) {
      const ratio = image.width / image.height;
      setConfig({
        ...config,
        height: num,
        width: Math.max(1, Math.round(num * ratio)),
      });
    } else {
      setConfig({ ...config, height: num });
    }
  };

  const handlePercentScale = (pct: number) => {
    setConfig({
      ...config,
      scaleType: 'percentage',
      percentage: pct,
    });
  };

  const applyPreset = (preset: { width: number; height: number }) => {
    setConfig({
      ...config,
      scaleType: 'pixels',
      width: preset.width,
      height: preset.height,
    });
  };

  const handleDownload = () => {
    setIsProcessing(true);
    // Draw onto canvas at new absolute dimensions and trigger trigger data export
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.src = image.dataUrl;
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = resizedDimensions.width;
      canvas.height = resizedDimensions.height;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        setIsProcessing(false);
        return;
      }

      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';
      ctx.drawImage(img, 0, 0, resizedDimensions.width, resizedDimensions.height);

      const resizedUrl = canvas.toDataURL(image.type);
      
      const link = document.createElement('a');
      link.href = resizedUrl;
      link.download = `resized_${image.name}`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      setIsProcessing(false);
    };
  };

  // Warning thresholds for pixelation quality drops
  const doesUpscale = resizedDimensions.width > image.width || resizedDimensions.height > image.height;

  return (
    <div id="resize-tool-panel" className="grid grid-cols-1 lg:grid-cols-12 gap-8">
      {/* Configuration Side */}
      <div className="lg:col-span-5 space-y-6 bg-slate-900/40 p-6 rounded-2xl border border-slate-800">
        <div>
          <h3 className="text-sm font-semibold tracking-wider text-slate-400 uppercase mb-2">Dimension Resizer</h3>
          <p className="text-xs text-slate-500">Fine-tune coordinates, scale visual ratios, and fit platform parameters.</p>
        </div>

        {/* Scalers select */}
        <div className="space-y-3">
          <label className="text-xs font-semibold text-slate-300">Scaling Unit Type</label>
          <div className="flex bg-slate-950 p-1 rounded-xl border border-slate-800">
            <button
              id="unit-pixels"
              type="button"
              onClick={() => setConfig({ ...config, scaleType: 'pixels' })}
              className={`flex-1 py-1.5 text-xs font-semibold rounded-lg transition-all ${
                config.scaleType === 'pixels'
                  ? 'bg-amber-500 text-slate-950 shadow'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Absolute Pixels
            </button>
            <button
              id="unit-percent"
              type="button"
              onClick={() => setConfig({ ...config, scaleType: 'percentage' })}
              className={`flex-1 py-1.5 text-xs font-semibold rounded-lg transition-all ${
                config.scaleType === 'percentage'
                  ? 'bg-amber-500 text-slate-950 shadow'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Percentage Scale
            </button>
          </div>
        </div>

        {config.scaleType === 'pixels' ? (
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs text-slate-400 font-mono">Width (px)</label>
              <input
                id="resize-width-input"
                type="number"
                value={config.width}
                onChange={(e) => handleWidthChange(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-slate-100 font-mono focus:border-amber-500/40 focus:outline-none"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs text-slate-400 font-mono">Height (px)</label>
              <input
                id="resize-height-input"
                type="number"
                value={config.height}
                onChange={(e) => handleHeightChange(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-slate-100 font-mono focus:border-amber-500/40 focus:outline-none"
              />
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="flex justify-between items-center text-xs text-slate-400 font-semibold">
              <span>Resize Factor</span>
              <span className="text-amber-500 font-bold">{config.percentage}%</span>
            </div>
            <input
              id="resize-percentage-slider"
              type="range"
              min="10"
              max="200"
              step="5"
              value={config.percentage}
              onChange={(e) => setConfig({ ...config, percentage: parseInt(e.target.value) })}
              className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-amber-500"
            />
            <div className="grid grid-cols-4 gap-1.5">
              {[25, 50, 75, 100].map((pct) => (
                <button
                  key={pct}
                  type="button"
                  onClick={() => handlePercentScale(pct)}
                  className="py-1 text-[10px] font-mono bg-slate-950 text-slate-400 rounded-md border border-slate-800 hover:text-slate-200 hover:border-slate-700"
                >
                  {pct}%
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Lock Aspect Ratio option */}
        <div className="flex items-center gap-2 py-1">
          <input
            id="aspect-ratio-checkbox"
            type="checkbox"
            checked={config.maintainAspectRatio}
            onChange={(e) => setConfig({ ...config, maintainAspectRatio: e.target.checked })}
            className="w-4 h-4 rounded border-slate-800 bg-slate-950 text-amber-500 accent-amber-500 cursor-pointer"
          />
          <label htmlFor="aspect-ratio-checkbox" className="text-xs text-slate-300 font-semibold select-none cursor-pointer">
            Lock Aspect Ratio ({ (image.width / image.height).toFixed(2) }:1)
          </label>
        </div>

        {/* Dimension presets */}
        <div className="space-y-2">
          <label className="text-xs font-semibold text-slate-300">Preset Standard Sizes</label>
          <div className="space-y-1.5">
            {PRESETS.map((preset, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => applyPreset(preset)}
                className="w-full flex items-center justify-between text-left p-2.5 text-xs rounded-lg transition-all bg-slate-950/60 border border-slate-850 hover:bg-slate-950 hover:border-slate-700 text-slate-350"
              >
                <span>{preset.name}</span>
                <span className="font-mono text-[10px] text-slate-500">{preset.width} × {preset.height}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Stretch warning */}
        {doesUpscale && (
          <div className="p-3 bg-amber-500/5 text-amber-400 border border-amber-550/20 rounded-xl flex gap-2.5 items-start">
            <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
            <div className="text-[11px] leading-relaxed">
              <span className="font-bold">Upscaling Alert:</span> Targeted size exceeds raw canvas dimensions ({image.width}×{image.height}px). Resizing upwards leads to visual pixel distortion and blur.
            </div>
          </div>
        )}

        {/* Action button */}
        <button
          id="resize-apply-btn"
          type="button"
          onClick={handleDownload}
          disabled={isProcessing}
          className="w-full py-3 px-4 bg-amber-500 hover:bg-amber-600 disabled:bg-slate-800 disabled:text-slate-500 text-slate-950 font-semibold rounded-xl text-xs flex items-center justify-center gap-2 transition-all cursor-pointer shadow-lg shadow-amber-500/10"
        >
          {isProcessing ? (
            <RefreshCw className="w-4 h-4 animate-spin" />
          ) : (
            <>
              <Download className="w-4 h-4" /> Download Resized Render
            </>
          )}
        </button>
      </div>

      {/* Preview Side */}
      <div className="lg:col-span-7 flex flex-col justify-between">
        <div className="relative w-full aspect-video min-h-[300px] bg-slate-950/80 rounded-2xl border border-slate-800 flex items-center justify-center overflow-hidden">
          {/* Background pattern */}
          <div className="absolute inset-0 bg-[linear-gradient(45deg,#13161d_25%,transparent_25%),linear-gradient(-45deg,#13161d_25%,transparent_25%),linear-gradient(45deg,transparent_75%,#13161d_75%),linear-gradient(-45deg,transparent_75%,#13161d_75%)] bg-[size:16px_16px] bg-[position:0_0,0_8px,8px_-8px,-8px_0]" />

          <img
            src={image.dataUrl}
            alt="Current resizing focus asset"
            className="absolute max-w-[85%] max-h-[85%] object-contain rounded-lg border border-slate-800/80 shadow-2xl transition-all"
            referrerPolicy="no-referrer"
          />
        </div>

        {/* Live specs footprint comparison */}
        <div className="mt-4 p-4 rounded-xl border border-slate-800/80 bg-slate-900/20 flex flex-wrap justify-between items-center gap-4">
          <div className="flex items-center gap-3">
            <div className="bg-slate-900 px-3 py-2 rounded-lg border border-slate-850 text-center">
              <div className="text-[10px] text-slate-500 uppercase font-mono tracking-wider font-semibold">Original Grid</div>
              <div className="text-xs font-semibold text-slate-300 font-mono mt-0.5">{image.width} × {image.height} px</div>
            </div>

            <MoveRight className="w-4 h-4 text-slate-600" />

            <div className="bg-amber-500/5 px-3 py-2 rounded-lg border border-amber-500/20 text-center">
              <div className="text-[10px] text-amber-500 uppercase font-mono tracking-wider font-bold">Planned Grid</div>
              <div className="text-xs font-bold text-amber-400 font-mono mt-0.5">{resizedDimensions.width} × {resizedDimensions.height} px</div>
            </div>
          </div>

          <div className="text-right">
            <span className="text-[10px] text-slate-500 block uppercase font-mono">Aspect Ratio Factor</span>
            <span className="text-xs font-semibold text-slate-350 font-mono">{(resizedDimensions.width / resizedDimensions.height).toFixed(3)} : 1</span>
          </div>
        </div>
      </div>
    </div>
  );
}
