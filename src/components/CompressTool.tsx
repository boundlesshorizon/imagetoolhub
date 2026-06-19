/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { ImageFile, CompressConfig } from '../types';
import { formatBytes } from '../utils';
import { Sliders, FileImage, Download, ChevronRight, Sparkles, Layers } from 'lucide-react';

interface CompressToolProps {
  image: ImageFile;
  onUpdateImage: (newUrl: string, size: number) => void;
}

export default function CompressTool({ image, onUpdateImage }: CompressToolProps) {
  const [config, setConfig] = useState<CompressConfig>({
    quality: 0.75,
    format: 'image/jpeg',
  });
  
  const [compressedDataUrl, setCompressedDataUrl] = useState<string>('');
  const [compressedSize, setCompressedSize] = useState<number>(0);
  const [swipePct, setSwipePct] = useState<number>(50);
  const [isSwiping, setIsSwiping] = useState<boolean>(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Perform compression in memory using HTML5 canvas
  useEffect(() => {
    if (!image) return;

    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.src = image.dataUrl;
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = img.naturalWidth;
      canvas.height = img.naturalHeight;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      ctx.drawImage(img, 0, 0);
      
      const quality = config.quality;
      const format = config.format;
      
      const compressed = canvas.toDataURL(format, quality);
      setCompressedDataUrl(compressed);

      // Estimate compressed size in bytes based on base64 content length
      const head = `data:${format};base64,`.length;
      const cleanBase64 = compressed.substring(head);
      const decodedLength = atob(cleanBase64).length;
      setCompressedSize(decodedLength);
    };
  }, [image, config]);

  const handleDownload = () => {
    if (!compressedDataUrl) return;
    const ext = config.format === 'image/webp' ? 'webp' : 'jpg';
    const link = document.createElement('a');
    link.href = compressedDataUrl;
    link.download = `compressed_${image.name.split('.')[0] || 'photo'}.${ext}`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handlePointerDown = () => {
    setIsSwiping(true);
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isSwiping && e.buttons !== 1) return;
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const pct = Math.max(0, Math.min(100, (x / rect.width) * 100));
    setSwipePct(pct);
  };

  const handlePointerUp = () => {
    setIsSwiping(false);
  };

  const reductionPct = image.size > 0 
    ? Math.max(0, Math.round(((image.size - compressedSize) / image.size) * 100))
    : 0;

  return (
    <div id="compress-tool-panel" className="grid grid-cols-1 lg:grid-cols-12 gap-8">
      {/* Settings Panel */}
      <div className="lg:col-span-4 space-y-6 bg-slate-900/40 p-6 rounded-2xl border border-slate-800/80">
        <div>
          <h3 className="text-sm font-semibold tracking-wider text-slate-400 uppercase mb-2">Compression Engine</h3>
          <p className="text-xs text-slate-500">Reduce payload weights, optimize page layouts, or clean storage spaces fast.</p>
        </div>

        {/* Compression Format */}
        <div className="space-y-2">
          <label className="text-xs font-semibold text-slate-300 flex items-center justify-between">
            <span>Target Output Format</span>
            <span className="text-[10px] text-slate-500 font-mono">JPG vs WEBP</span>
          </label>
          <div className="grid grid-cols-2 gap-2">
            <button
              id="format-jpg-btn"
              type="button"
              onClick={() => setConfig({ ...config, format: 'image/jpeg' })}
              className={`py-2 px-3 text-xs font-semibold rounded-lg border transition-all ${
                config.format === 'image/jpeg'
                  ? 'bg-amber-500/10 text-amber-500 border-amber-500/40 shadow-sm shadow-amber-500/5'
                  : 'bg-slate-950/40 text-slate-400 border-slate-800 hover:text-slate-300 hover:border-slate-700'
              }`}
            >
              Progressive JPEG
            </button>
            <button
              id="format-webp-btn"
              type="button"
              onClick={() => setConfig({ ...config, format: 'image/webp' })}
              className={`py-2 px-3 text-xs font-semibold rounded-lg border transition-all ${
                config.format === 'image/webp'
                  ? 'bg-amber-500/10 text-amber-500 border-amber-500/40 shadow-sm shadow-amber-500/5'
                  : 'bg-slate-950/40 text-slate-400 border-slate-800 hover:text-slate-300 hover:border-slate-700'
              }`}
            >
              Modern WEBP
            </button>
          </div>
        </div>

        {/* Quality Scale */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <label className="text-xs font-semibold text-slate-300">Compression Quality</label>
            <span className="text-xs font-bold text-amber-500 bg-amber-500/10 px-2 py-0.5 rounded font-mono">
              {Math.round(config.quality * 100)}%
            </span>
          </div>
          <input
            id="quality-slider"
            type="range"
            min="0.1"
            max="1.0"
            step="0.05"
            value={config.quality}
            onChange={(e) => setConfig({ ...config, quality: parseFloat(e.target.value) })}
            className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-amber-500"
          />
          <div className="flex justify-between text-[10px] text-slate-500 font-mono">
            <span>High Savings (10%)</span>
            <span>Balanced</span>
            <span>Max Quality (100%)</span>
          </div>
        </div>

        {/* Diagnostic Stats */}
        <div className="p-4 bg-slate-950/50 rounded-xl border border-slate-800/60 divide-y divide-slate-800/50">
          <div className="flex py-2.5 items-center justify-between">
            <span className="text-xs text-slate-400 flex items-center gap-1.5">
              <FileImage className="w-3.5 h-3.5 text-slate-500" /> Original Size
            </span>
            <span className="text-xs font-semibold text-slate-300 font-mono">{formatBytes(image.size)}</span>
          </div>
          <div className="flex py-2.5 items-center justify-between">
            <span className="text-xs text-slate-400 flex items-center gap-1.5">
              <Layers className="w-3.5 h-3.5 text-amber-500" /> Optimized Size
            </span>
            <span className="text-xs font-semibold text-amber-400 font-mono">{formatBytes(compressedSize)}</span>
          </div>
          {reductionPct > 0 && (
            <div className="flex py-2.5 items-center justify-between">
              <span className="text-xs text-slate-400 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-emerald-500" /> Byte Savings
              </span>
              <span className="text-xs font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded font-mono">
                -{reductionPct}% Redux
              </span>
            </div>
          )}
        </div>

        {/* Action button */}
        <button
          id="download-compressed-btn"
          type="button"
          onClick={handleDownload}
          disabled={!compressedDataUrl}
          className="w-full py-3 px-4 bg-amber-500 hover:bg-amber-600 disabled:bg-slate-800 disabled:text-slate-500 text-slate-950 font-semibold rounded-xl text-xs flex items-center justify-center gap-2 transition-all cursor-pointer shadow-lg shadow-amber-500/10"
        >
          <Download className="w-4 h-4" /> Download Optimized Image
        </button>
      </div>

      {/* Split/Swipe Comparison Canvas */}
      <div className="lg:col-span-8 flex flex-col justify-between">
        <div className="relative w-full aspect-video min-h-[300px] bg-slate-950/80 rounded-2xl border border-slate-800 flex items-center justify-center overflow-hidden group select-none">
          <div
            ref={containerRef}
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            onPointerLeave={handlePointerUp}
            className="relative max-w-full max-h-full aspect-square w-auto h-auto overflow-hidden cursor-ew-resize flex items-center justify-center"
            style={{ width: '100%', height: '100%' }}
          >
            {/* Background pattern */}
            <div className="absolute inset-0 bg-[linear-gradient(45deg,#13161d_25%,transparent_25%),linear-gradient(-45deg,#13161d_25%,transparent_25%),linear-gradient(45deg,transparent_75%,#13161d_75%),linear-gradient(-45deg,transparent_75%,#13161d_75%)] bg-[size:16px_16px] bg-[position:0_0,0_8px,8px_-8px,-8px_0]" />

            {/* Original Image (Left side base) */}
            <img
              src={image.dataUrl}
              alt="Original visual input placeholder"
              className="absolute max-w-full max-h-full object-contain select-none pointer-events-none"
              style={{ width: '100%', height: '100%' }}
              referrerPolicy="no-referrer"
            />
            <div className="absolute top-4 left-4 bg-slate-950/80 backdrop-blur border border-slate-800 text-[10px] text-slate-400 font-mono uppercase font-semibold px-2 py-0.5 rounded select-none pointer-events-none">
              Original ({formatBytes(image.size)})
            </div>

            {/* Compressed Image (Right side - clipped with polygon) */}
            {compressedDataUrl && (
              <div
                className="absolute inset-0 flex items-center justify-center select-none pointer-events-none"
                style={{
                  clipPath: `polygon(${swipePct}% 0%, 100% 0%, 100% 100%, ${swipePct}% 100%)`,
                  width: '100%',
                  height: '100%',
                }}
              >
                <img
                  src={compressedDataUrl}
                  alt="Optimized target preview output"
                  className="max-w-full max-h-full object-contain"
                  style={{ width: '100%', height: '100%' }}
                  referrerPolicy="no-referrer"
                />
              </div>
            )}
            <div className="absolute top-4 right-4 bg-amber-500/90 text-slate-950 text-[10px] uppercase font-mono font-bold px-2 py-0.5 rounded select-none pointer-events-none">
              Compressed ({formatBytes(compressedSize)})
            </div>

            {/* Swipe Line Divider */}
            <div
              className="absolute top-0 bottom-0 w-0.5 bg-amber-500 hover:bg-amber-400 cursor-ew-resize flex items-center justify-center pointer-events-none"
              style={{ left: `${swipePct}%` }}
            >
              <div className="w-7 h-7 bg-amber-500 rounded-full flex items-center justify-center text-slate-950 shadow-lg shadow-amber-500/20 transform -translate-x-1/2 pointer-events-auto">
                <Sliders className="w-3.5 h-3.5" />
              </div>
            </div>
          </div>
        </div>

        {/* Prompt on use */}
        <p className="text-[11px] text-slate-500 text-center mt-3 flex items-center justify-center gap-1.5">
          <ChevronRight className="w-3 h-3 text-amber-500/60" /> Horizontal slider compares the <strong>Original (Left)</strong> vs <strong>Compressed (Right)</strong> images at binary levels.
        </p>
      </div>
    </div>
  );
}
