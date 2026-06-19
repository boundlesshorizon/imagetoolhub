/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { ImageFile, CropConfig, AspectRatioPreset } from '../types';
import { Crop, Download, ChevronRight, Maximize2 } from 'lucide-react';

interface CropToolProps {
  image: ImageFile;
  onUpdateImage: (newUrl: string, size: number) => void;
}

export default function CropTool({ image, onUpdateImage }: CropToolProps) {
  const [config, setConfig] = useState<CropConfig>({
    aspectRatio: 'custom',
    x: 0.1,
    y: 0.1,
    width: 0.8,
    height: 0.8,
  });

  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [dragOffset, setDragOffset] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [croppedPreviewUrl, setCroppedPreviewUrl] = useState<string>('');
  
  const containerRef = useRef<HTMLDivElement>(null);
  const imgRef = useRef<HTMLImageElement>(null);

  // Recalculate aspect-ratio locks whenever choice shifts
  const applyPresetRatio = (preset: AspectRatioPreset) => {
    let w = 0.8;
    let h = 0.8;

    if (preset !== 'custom') {
      const parts = preset.split(':').map(Number);
      const targetRatio = parts[0] / parts[1];
      const imageRatio = image.width / image.height;

      if (targetRatio > imageRatio) {
        // Limited by width
        w = 0.85;
        h = w / targetRatio * imageRatio;
      } else {
        // Limited by height
        h = 0.85;
        w = h * targetRatio / imageRatio;
      }
    }

    // Centering new box coordinates
    const x = (1 - w) / 2;
    const y = (1 - h) / 2;

    setConfig({
      aspectRatio: preset,
      x: parseFloat(x.toFixed(4)),
      y: parseFloat(y.toFixed(4)),
      width: parseFloat(w.toFixed(4)),
      height: parseFloat(h.toFixed(4)),
    });
  };

  // Draggable Box inside image bounds
  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!containerRef.current || !imgRef.current) return;
    setIsDragging(true);

    const rect = imgRef.current.getBoundingClientRect();
    const currX = e.clientX - rect.left;
    const currY = e.clientY - rect.top;

    // Convert pixel inputs to percentage
    const normX = currX / rect.width;
    const normY = currY / rect.top;

    setDragOffset({
      x: normX - config.x,
      y: normY - config.y,
    });
    
    // Set pointer capture to support dragging outside the elements properly
    e.currentTarget.setPointerCapture(e.pointerId);
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isDragging) return;
    if (!imgRef.current) return;

    const rect = imgRef.current.getBoundingClientRect();
    const clientX = e.clientX - rect.left;
    const clientY = e.clientY - rect.top;

    // Calculate next coordinates based on drag motion
    let nextX = (clientX / rect.width) - dragOffset.x;
    let nextY = (clientY / rect.height) - dragOffset.y;

    // Boundary locks
    nextX = Math.max(0, Math.min(1 - config.width, nextX));
    nextY = Math.max(0, Math.min(1 - config.height, nextY));

    setConfig((prev) => ({
      ...prev,
      x: parseFloat(nextX.toFixed(4)),
      y: parseFloat(nextY.toFixed(4)),
    }));
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    setIsDragging(false);
    e.currentTarget.releasePointerCapture(e.pointerId);
  };

  const generateCroppedImage = (): Promise<string> => {
    return new Promise((resolve) => {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.src = image.dataUrl;
      img.onload = () => {
        const canvas = document.createElement('canvas');
        
        // Exact pixel crop targets
        const sx = config.x * img.naturalWidth;
        const sy = config.y * img.naturalHeight;
        const sw = config.width * img.naturalWidth;
        const sh = config.height * img.naturalHeight;

        canvas.width = sw;
        canvas.height = sh;

        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve('');
          return;
        }

        ctx.drawImage(img, sx, sy, sw, sh, 0, 0, sw, sh);
        resolve(canvas.toDataURL(image.type));
      };
    });
  };

  const handleExportCrop = async () => {
    const croppedUrl = await generateCroppedImage();
    if (!croppedUrl) return;

    const link = document.createElement('a');
    link.href = croppedUrl;
    link.download = `cropped_${image.name}`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Re-adjust size sliders manually
  const adjustSizeSlider = (val: number, dimension: 'width' | 'height') => {
    const scale = val / 100;
    if (config.aspectRatio !== 'custom') {
      const parts = config.aspectRatio.split(':').map(Number);
      const aspect = parts[0] / parts[1];
      const imageRatio = image.width / image.height;

      if (dimension === 'width') {
        const nextW = scale;
        const nextH = (nextW / aspect) * imageRatio;
        if (nextW + config.x <= 1 && nextH + config.y <= 1) {
          setConfig((prev) => ({ ...prev, width: nextW, height: nextH }));
        }
      } else {
        const nextH = scale;
        const nextW = (nextH * aspect) / imageRatio;
        if (nextW + config.x <= 1 && nextH + config.y <= 1) {
          setConfig((prev) => ({ ...prev, width: nextW, height: nextH }));
        }
      }
    } else {
      if (dimension === 'width') {
        if (scale + config.x <= 1) setConfig((prev) => ({ ...prev, width: scale }));
      } else {
        if (scale + config.y <= 1) setConfig((prev) => ({ ...prev, height: scale }));
      }
    }
  };

  return (
    <div id="crop-tool-panel" className="grid grid-cols-1 lg:grid-cols-12 gap-8">
      {/* Settings Grid */}
      <div className="lg:col-span-5 space-y-6 bg-slate-900/40 p-6 rounded-2xl border border-slate-800">
        <div>
          <h3 className="text-sm font-semibold tracking-wider text-slate-400 uppercase mb-2">Social Crop Aspect</h3>
          <p className="text-xs text-slate-500">Clip dimensions dynamically to preserve specific platform visual profiles.</p>
        </div>

        {/* Preset Ratios */}
        <div className="space-y-2">
          <label className="text-xs font-semibold text-slate-300">Select Clipping Ratio</label>
          <div className="grid grid-cols-3 gap-2">
            {[
              { id: 'custom', label: 'Freeform' },
              { id: '1:1', label: 'Square (1:1)' },
              { id: '16:9', label: 'Widescreen' },
              { id: '9:16', label: 'Stories (9:16)' },
              { id: '4:5', label: 'Feed (4:5)' },
              { id: '2:3', label: 'Pinterest' }
            ].map((ratio) => (
              <button
                key={ratio.id}
                type="button"
                onClick={() => applyPresetRatio(ratio.id as AspectRatioPreset)}
                className={`py-2 px-1 text-[11px] font-semibold rounded-lg border transition-all ${
                  config.aspectRatio === ratio.id
                    ? 'bg-amber-500/10 text-amber-500 border-amber-500/40 shadow shadow-amber-500/5'
                    : 'bg-slate-950/40 text-slate-400 border-slate-800 hover:text-slate-300 hover:border-slate-700'
                }`}
              >
                {ratio.label}
              </button>
            ))}
          </div>
        </div>

        {/* Sizing Sliders for Custom Box Tuning */}
        <div className="space-y-4 pt-1 border-t border-slate-800/40">
          <div className="space-y-1.5">
            <div className="flex justify-between items-center text-xs text-slate-450 font-semibold">
              <span>Box Width</span>
              <span className="font-mono text-amber-500">{Math.round(config.width * 100)}%</span>
            </div>
            <input
              id="crop-width-slider"
              type="range"
              min="10"
              max="100"
              value={Math.round(config.width * 100)}
              onChange={(e) => adjustSizeSlider(parseInt(e.target.value), 'width')}
              className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-amber-500"
            />
          </div>

          {config.aspectRatio === 'custom' && (
            <div className="space-y-1.5">
              <div className="flex justify-between items-center text-xs text-slate-450 font-semibold">
                <span>Box Height</span>
                <span className="font-mono text-amber-500">{Math.round(config.height * 100)}%</span>
              </div>
              <input
                id="crop-height-slider"
                type="range"
                min="10"
                max="100"
                value={Math.round(config.height * 100)}
                onChange={(e) => adjustSizeSlider(parseInt(e.target.value), 'height')}
                className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-amber-500"
              />
            </div>
          )}

          {/* X Y Sliders fallback */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <span className="text-[10px] text-slate-500 uppercase font-mono block">Anchor X Offset</span>
              <input
                id="crop-x-slider"
                type="range"
                min="0"
                max={Math.max(0, 100 - Math.round(config.width * 100))}
                value={Math.round(config.x * 100)}
                onChange={(e) => setConfig((prev) => ({ ...prev, x: parseInt(e.target.value) / 100 }))}
                className="w-full h-1 bg-slate-800 accent-amber-500/70 cursor-pointer"
              />
            </div>
            <div className="space-y-1.5">
              <span className="text-[10px] text-slate-500 uppercase font-mono block">Anchor Y Offset</span>
              <input
                id="crop-y-slider"
                type="range"
                min="0"
                max={Math.max(0, 100 - Math.round(config.height * 100))}
                value={Math.round(config.y * 100)}
                onChange={(e) => setConfig((prev) => ({ ...prev, y: parseInt(e.target.value) / 100 }))}
                className="w-full h-1 bg-slate-800 accent-amber-500/70 cursor-pointer"
              />
            </div>
          </div>
        </div>

        {/* Execute button */}
        <button
          id="crop-apply-btn"
          type="button"
          onClick={handleExportCrop}
          className="w-full py-3 px-4 bg-amber-500 hover:bg-amber-600 text-slate-950 font-semibold rounded-xl text-xs flex items-center justify-center gap-2 transition-all cursor-pointer shadow-lg shadow-amber-500/10"
        >
          <Crop className="w-4 h-4" /> Clip & Download Crop Area
        </button>
      </div>

      {/* Visual Workspace canvas */}
      <div className="lg:col-span-7 flex flex-col justify-between">
        <div className="relative w-full aspect-video min-h-[300px] bg-slate-950/80 rounded-2xl border border-slate-800 flex items-center justify-center overflow-hidden select-none">
          {/* Background pattern */}
          <div className="absolute inset-0 bg-[linear-gradient(45deg,#13161d_25%,transparent_25%),linear-gradient(-45deg,#13161d_25%,transparent_25%),linear-gradient(45deg,transparent_75%,#13161d_75%),linear-gradient(-45deg,transparent_75%,#13161d_75%)] bg-[size:16px_16px] bg-[position:0_0,0_8px,8px_-8px,-8px_0]" />

          <div
            ref={containerRef}
            className="relative flex items-center justify-center max-w-[85%] max-h-[85%]"
            style={{ width: '100%', height: '100%' }}
          >
            <img
              ref={imgRef}
              src={image.dataUrl}
              alt="Interactive visual workspace"
              className="max-w-full max-h-full object-contain pointer-events-none rounded border border-slate-800/20"
              referrerPolicy="no-referrer"
            />

            {/* Draggable Bounding Crop Box Overlay */}
            <div
              id="interactive-crop-box"
              onPointerDown={handlePointerDown}
              onPointerMove={handlePointerMove}
              onPointerUp={handlePointerUp}
              className={`absolute border-2 border-dashed border-amber-500 bg-amber-500/10 cursor-move flex flex-col justify-between p-2 shadow-2xl transition-[opacity,border] ${
                isDragging ? 'border-amber-400 border-solid bg-amber-500/15' : ''
              }`}
              style={{
                left: `${config.x * 100}%`,
                top: `${config.y * 100}%`,
                width: `${config.width * 100}%`,
                height: `${config.height * 100}%`,
              }}
            >
              {/* Corner Handles indicators */}
              <div className="flex justify-between w-full">
                <div className="w-2.5 h-2.5 border-t-2 border-l-2 border-amber-500 -ml-2.5 -mt-2.5" />
                <div className="w-2.5 h-2.5 border-t-2 border-r-2 border-amber-500 -mr-2.5 -mt-2.5" />
              </div>

              {/* Inside Grid Center Indicator */}
              <div className="w-full flex justify-center items-center opacity-40">
                <Maximize2 className="w-3.5 h-3.5 text-amber-500" />
              </div>

              <div className="flex justify-between w-full">
                <div className="w-2.5 h-2.5 border-b-2 border-l-2 border-amber-500 -ml-2.5 -mb-2.5" />
                <div className="w-2.5 h-2.5 border-b-2 border-r-2 border-amber-500 -mr-2.5 -mb-2.5" />
              </div>
            </div>
          </div>
        </div>

        {/* Crop info guideline */}
        <p className="text-[11px] text-slate-500 text-center mt-3 flex items-center justify-center gap-1.5">
          <ChevronRight className="w-3 h-3 text-amber-500/60" /> Click and <strong>Drag the highlighted box</strong> across the canvas coordinates to adjust crop positioning.
        </p>
      </div>
    </div>
  );
}
