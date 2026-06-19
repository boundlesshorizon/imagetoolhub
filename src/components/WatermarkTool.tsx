/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { ImageFile, WatermarkConfig, WatermarkPosition } from '../types';
import { drawWatermark } from '../utils';
import { Type, Upload, Grid, Settings, Download, RefreshCw, Sparkles } from 'lucide-react';

interface WatermarkToolProps {
  image: ImageFile;
  onUpdateImage: (newUrl: string, size: number) => void;
}

export default function WatermarkTool({ image }: WatermarkToolProps) {
  const [config, setConfig] = useState<WatermarkConfig>({
    type: 'text',
    text: '© Image Tools Hub',
    fontSize: 24,
    fontColor: '#ffffff',
    fontFamily: 'Inter',
    opacity: 0.5,
    position: 'bottom-right',
    offsetX: 5,
    offsetY: 5,
    imageWatermarkUrl: null,
    imageWatermarkScale: 0.4,
  });

  const [logoImgElement, setLogoImgElement] = useState<HTMLImageElement | null>(null);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Load logo image when branding url shifts
  useEffect(() => {
    if (config.type === 'image' && config.imageWatermarkUrl) {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.src = config.imageWatermarkUrl;
      img.onload = () => {
        setLogoImgElement(img);
      };
    } else {
      setLogoImgElement(null);
    }
  }, [config.type, config.imageWatermarkUrl]);

  // Render composite image with the watermark drawn onto the canvas
  const drawCompositePreview = () => {
    if (!canvasRef.current) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const baseImg = new Image();
    baseImg.crossOrigin = 'anonymous';
    baseImg.src = image.dataUrl;
    baseImg.onload = () => {
      // Set canvas to display aspect ratio scaled coordinates
      const maxW = 800; // limit preview render size
      let w = baseImg.naturalWidth;
      let h = baseImg.naturalHeight;

      if (w > maxW) {
        const scale = maxW / w;
        w = maxW;
        h = h * scale;
      }

      canvas.width = w;
      canvas.height = h;

      // Draw original image base
      ctx.drawImage(baseImg, 0, 0, w, h);

      // Draw watermark layer
      drawWatermark(ctx, w, h, config, logoImgElement);
    };
  };

  // Re-draw preview whenever settings adjust
  useEffect(() => {
    drawCompositePreview();
  }, [image, config, logoImgElement]);

  // Handle Logo Uploading
  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      setConfig((prev) => ({
        ...prev,
        imageWatermarkUrl: event.target?.result as string,
      }));
    };
    reader.readAsDataURL(file);
  };

  const exportWatermarkedImage = () => {
    setIsProcessing(true);
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.src = image.dataUrl;
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = img.naturalWidth;
      canvas.height = img.naturalHeight;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        setIsProcessing(false);
        return;
      }

      ctx.drawImage(img, 0, 0);

      const drawHighResLogo = () => {
        drawWatermark(ctx, canvas.width, canvas.height, config, logoImgElement);
        const dataUrl = canvas.toDataURL(image.type);
        
        const link = document.createElement('a');
        link.href = dataUrl;
        link.download = `watermarked_${image.name}`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        setIsProcessing(false);
      };

      if (config.type === 'image' && config.imageWatermarkUrl) {
        const logo = new Image();
        logo.crossOrigin = 'anonymous';
        logo.src = config.imageWatermarkUrl;
        logo.onload = () => {
          drawWatermark(ctx, canvas.width, canvas.height, config, logo);
          const dataUrl = canvas.toDataURL(image.type);
          
          const link = document.createElement('a');
          link.href = dataUrl;
          link.download = `watermarked_${image.name}`;
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
          setIsProcessing(false);
        };
      } else {
        drawHighResLogo();
      }
    };
  };

  const POSITIONS: { id: WatermarkPosition; label: string }[] = [
    { id: 'top-left', label: 'Top-L' },
    { id: 'top-center', label: 'Top-C' },
    { id: 'top-right', label: 'Top-R' },
    { id: 'center-left', label: 'Mid-L' },
    { id: 'center', label: 'Center' },
    { id: 'center-right', label: 'Mid-R' },
    { id: 'bottom-left', label: 'Bot-L' },
    { id: 'bottom-center', label: 'Bot-C' },
    { id: 'bottom-right', label: 'Bot-R' },
    { id: 'custom', label: 'Custom' },
  ];

  return (
    <div id="watermark-tool-panel" className="grid grid-cols-1 lg:grid-cols-12 gap-8">
      {/* Brand Watermark Configs */}
      <div className="lg:col-span-5 space-y-6 bg-slate-900/40 p-6 rounded-2xl border border-slate-800">
        <div>
          <h3 className="text-sm font-semibold tracking-wider text-slate-400 uppercase mb-2">Copyright Overlay</h3>
          <p className="text-xs text-slate-500">Inject security brand seals, timestamps, or text licensing metadata in batches.</p>
        </div>

        {/* Text vs Image selector */}
        <div className="flex bg-slate-950 p-1 rounded-xl border border-slate-800">
          <button
            id="watermark-txt-btn"
            type="button"
            onClick={() => setConfig({ ...config, type: 'text' })}
            className={`flex-1 py-1.5 text-xs font-semibold rounded-lg flex items-center justify-center gap-1.5 transition-all ${
              config.type === 'text'
                ? 'bg-amber-500 text-slate-950 shadow'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Type className="w-3.5 h-3.5" /> Text Stamp
          </button>
          <button
            id="watermark-logo-btn"
            type="button"
            onClick={() => setConfig({ ...config, type: 'image' })}
            className={`flex-1 py-1.5 text-xs font-semibold rounded-lg flex items-center justify-center gap-1.5 transition-all ${
              config.type === 'image'
                ? 'bg-amber-500 text-slate-950 shadow'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Upload className="w-3.5 h-3.5" /> Image Logo
          </button>
        </div>

        {config.type === 'text' ? (
          /* Text stamp configs */
          <div className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-xs text-slate-400 font-semibold flex items-center gap-1">Watermark Content</label>
              <input
                id="watermark-text-input"
                type="text"
                value={config.text}
                onChange={(e) => setConfig({ ...config, text: e.target.value })}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-slate-100 focus:border-amber-500/40 focus:outline-none"
                placeholder="text markup"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs text-slate-400 font-semibold">Color Fill</label>
                <div className="flex gap-2">
                  <input
                    id="watermark-color-input"
                    type="color"
                    value={config.fontColor}
                    onChange={(e) => setConfig({ ...config, fontColor: e.target.value })}
                    className="w-8 h-8 rounded bg-transparent border border-slate-800 cursor-pointer p-0"
                  />
                  <input
                    type="text"
                    value={config.fontColor.toUpperCase()}
                    onChange={(e) => setConfig({ ...config, fontColor: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 roundedpx-2 text-xs font-mono text-slate-350 focus:outline-none focus:border-amber-500/30 text-center"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs text-slate-400 font-semibold">Typography Pairing</label>
                <select
                  id="watermark-font-select"
                  value={config.fontFamily}
                  onChange={(e: any) => setConfig({ ...config, fontFamily: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-slate-300 focus:border-amber-500/30 focus:outline-none"
                >
                  <option value="Inter">Classic Inter</option>
                  <option value="Space Grotesk">Tech Grotesk</option>
                  <option value="JetBrains Mono">Fira Mono</option>
                  <option value="Playfair Display">Editorial Serif</option>
                </select>
              </div>
            </div>

            <div className="space-y-1.5">
              <div className="flex justify-between text-xs text-slate-450 font-semibold">
                <span>Font Size Multiplier</span>
                <span className="font-mono text-amber-500">{config.fontSize}px</span>
              </div>
              <input
                id="watermark-size-slider"
                type="range"
                min="10"
                max="80"
                value={config.fontSize}
                onChange={(e) => setConfig({ ...config, fontSize: parseInt(e.target.value) })}
                className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-amber-500"
              />
            </div>
          </div>
        ) : (
          /* Branding Logo watermark configs */
          <div className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-xs text-slate-450 font-semibold">Upload Branding Emblem (.PNG recommended)</label>
              <div className="relative group flex flex-col items-center justify-center w-full h-24 border-2 border-dashed border-slate-800 hover:border-amber-550/30 hover:bg-slate-950/20 rounded-xl transition-all overflow-hidden cursor-pointer">
                <input
                  id="watermark-logo-uploader"
                  type="file"
                  accept="image/*"
                  onChange={handleLogoUpload}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                />
                <Upload className="w-5 h-5 text-slate-500 group-hover:text-amber-550/70 mb-1.5" />
                <span className="text-[10px] text-slate-500 group-hover:text-slate-400">
                  {config.imageWatermarkUrl ? 'Click to replace logo asset' : 'Click to select logo file'}
                </span>
                {config.imageWatermarkUrl && (
                  <span className="absolute top-2 right-2 flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                  </span>
                )}
              </div>
            </div>

            {config.imageWatermarkUrl && (
              <div className="space-y-1.5">
                <div className="flex justify-between text-xs text-slate-400 font-semibold">
                  <span>Logo Dimensions scale</span>
                  <span className="font-mono text-amber-500">{Math.round(config.imageWatermarkScale * 100)}%</span>
                </div>
                <input
                  id="watermark-logo-scale-slider"
                  type="range"
                  min="0.1"
                  max="1.5"
                  step="0.05"
                  value={config.imageWatermarkScale}
                  onChange={(e) => setConfig({ ...config, imageWatermarkScale: parseFloat(e.target.value) })}
                  className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-amber-500"
                />
              </div>
            )}
          </div>
        )}

        {/* Global opacity */}
        <div className="space-y-1.5">
          <div className="flex justify-between text-xs text-slate-400 font-semibold">
            <span>Watermark Transparency / Strength</span>
            <span className="font-mono text-amber-500">{Math.round(config.opacity * 100)}%</span>
          </div>
          <input
            id="watermark-opacity-slider"
            type="range"
            min="0.05"
            max="1.0"
            step="0.05"
            value={config.opacity}
            onChange={(e) => setConfig({ ...config, opacity: parseFloat(e.target.value) })}
            className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-amber-500"
          />
        </div>

        {/* Position Grid selector */}
        <div className="space-y-2">
          <label className="text-xs font-semibold text-slate-300 flex items-center gap-1">
            <Grid className="w-3.5 h-3.5" /> Anchor Positioning Grid
          </label>
          <div className="grid grid-cols-3 gap-1.5 bg-slate-950/60 p-2 rounded-xl border border-slate-850">
            {POSITIONS.map((pos) => (
              <button
                key={pos.id}
                type="button"
                onClick={() => setConfig({ ...config, position: pos.id })}
                className={`py-1.5 text-[10px] font-mono rounded-md border transition-all ${
                  config.position === pos.id
                    ? 'bg-amber-500/10 border-amber-500/40 text-amber-400'
                    : 'bg-transparent text-slate-500 border-none hover:text-slate-350'
                }`}
              >
                {pos.label}
              </button>
            ))}
          </div>
        </div>

        {/* Custom coordinates offset (Only visible when position === custom) */}
        {config.position === 'custom' && (
          <div className="grid grid-cols-2 gap-4 pt-1">
            <div className="space-y-1">
              <span className="text-[9px] text-slate-500 font-mono uppercase">Horizontal Offset (X)</span>
              <input
                id="offset-x-input"
                type="range"
                min="0"
                max="100"
                value={config.offsetX}
                onChange={(e) => setConfig({ ...config, offsetX: parseInt(e.target.value) })}
                className="w-full h-1 bg-slate-800 accent-amber-500"
              />
            </div>
            <div className="space-y-1">
              <span className="text-[9px] text-slate-500 font-mono uppercase">Vertical Offset (Y)</span>
              <input
                id="offset-y-input"
                type="range"
                min="0"
                max="100"
                value={config.offsetY}
                onChange={(e) => setConfig({ ...config, offsetY: parseInt(e.target.value) })}
                className="w-full h-1 bg-slate-800 accent-amber-500"
              />
            </div>
          </div>
        )}

        {/* Export Button */}
        <button
          id="watermark-apply-btn"
          type="button"
          onClick={exportWatermarkedImage}
          disabled={isProcessing || (config.type === 'image' && !config.imageWatermarkUrl)}
          className="w-full py-3 px-4 bg-amber-500 hover:bg-amber-600 disabled:bg-slate-800 disabled:text-slate-500 text-slate-950 font-semibold rounded-xl text-xs flex items-center justify-center gap-2 transition-all cursor-pointer shadow-lg shadow-amber-500/10"
        >
          {isProcessing ? (
            <RefreshCw className="w-4 h-4 animate-spin" />
          ) : (
            <>
              <Sparkles className="w-4 h-4" /> Download Stamped Image
            </>
          )}
        </button>
      </div>

      {/* Visual Canvas Workspace */}
      <div className="lg:col-span-7 flex flex-col justify-between">
        <div className="relative w-full aspect-video min-h-[300px] bg-slate-950/80 rounded-2xl border border-slate-800 flex items-center justify-center overflow-hidden">
          {/* Background pattern */}
          <div className="absolute inset-0 bg-[linear-gradient(45deg,#13161d_25%,transparent_25%),linear-gradient(-45deg,#13161d_25%,transparent_25%),linear-gradient(45deg,transparent_75%,#13161d_75%),linear-gradient(-45deg,transparent_75%,#13161d_75%)] bg-[size:16px_16px] bg-[position:0_0,0_8px,8px_-8px,-8px_0]" />

          <canvas
            ref={canvasRef}
            className="max-w-[85%] max-h-[85%] object-contain rounded-lg border border-slate-800 shadow-2xl bg-transparent"
          />
        </div>

        {/* Overlay guideline */}
        <div className="mt-4 p-4 rounded-xl border border-slate-800/80 bg-slate-900/20 text-center text-[11px] text-slate-500 flex items-center justify-center gap-2">
          <Settings className="w-4 h-4 text-amber-500 animate-spin-slow shrink-0" /> Watermarks are applied dynamically on drawing buffers, rendering original resolutions when downloading.
        </div>
      </div>
    </div>
  );
}
