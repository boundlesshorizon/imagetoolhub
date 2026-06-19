/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { ImageFile, BgRemoverConfig } from '../types';
import { removeBackgroundColor, formatBytes } from '../utils';
import { Sparkles, MousePointer, Info, Cpu, ChevronRight, CheckCircle, Trash2, Download, RefreshCw } from 'lucide-react';

interface BgRemoverToolProps {
  image: ImageFile;
  onUpdateImage: (newUrl: string, size: number) => void;
}

export default function BgRemoverTool({ image, onUpdateImage }: BgRemoverToolProps) {
  const [config, setConfig] = useState<BgRemoverConfig>({
    mode: 'color_picker',
    tolerance: 15,
    targetColor: null,
    aiPolygon: null,
    aiSubjectName: null,
  });

  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [successMessage, setSuccessMessage] = useState<string>('');
  
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Re-draw canvas source whenever source image, coordinates or colors adjust
  const drawCutoutPreview = () => {
    if (!canvasRef.current) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.src = image.dataUrl;
    img.onload = () => {
      canvas.width = img.naturalWidth;
      canvas.height = img.naturalHeight;

      // Draw original image base
      ctx.drawImage(img, 0, 0);

      // Perform cutout based on mode selections
      if (config.mode === 'ai_outline' && config.aiPolygon && config.aiPolygon.length > 0) {
        // Draw masking polygon paths
        ctx.save();
        ctx.beginPath();
        
        // Start polygon trace using normalized width/height multipliers
        const first = config.aiPolygon[0];
        ctx.moveTo(first.x * canvas.width, first.y * canvas.height);
        
        for (let i = 1; i < config.aiPolygon.length; i++) {
          const pt = config.aiPolygon[i];
          ctx.lineTo(pt.x * canvas.width, pt.y * canvas.height);
        }
        ctx.closePath();

        // Clip the path to keep ONLY the inside subject bounds
        ctx.clip();

        // Re-draw image over the clipped canvas masking boundaries
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(img, 0, 0);
        ctx.restore();

      } else if (config.mode === 'color_picker' && config.targetColor) {
        // Pixel-level manual chroma eraser
        const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        removeBackgroundColor(imgData, config.targetColor, config.tolerance);
        ctx.putImageData(imgData, 0, 0);
      }
    };
  };

  useEffect(() => {
    drawCutoutPreview();
  }, [image, config]);

  // Click on image canvas to capture background RGB color bounds
  const handleCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (config.mode !== 'color_picker' || !canvasRef.current) return;
    const canvas = canvasRef.current;
    
    // Calculate accurate clicked coordinate relative to the actual natural image dimensions
    const rect = canvas.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const clickY = e.clientY - rect.top;

    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;

    const actualX = Math.floor(clickX * scaleX);
    const actualY = Math.floor(clickY * scaleY);

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Fetch RGB values from that exact pixel coordinate
    const pixel = ctx.getImageData(actualX, actualY, 1, 1).data;
    const targetColor = {
      r: pixel[0],
      g: pixel[1],
      b: pixel[2],
    };

    setConfig((prev) => ({
      ...prev,
      targetColor,
    }));
  };

  // Run AI segmentation background remover trace via Express Route + Gemini GenAI SDK
  const handleAiCutout = async () => {
    setIsLoading(true);
    setErrorMessage('');
    setSuccessMessage('');

    try {
      const response = await fetch('/api/ai/segment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          image: image.dataUrl,
          mimeType: image.type,
        }),
      });

      const data = await response.json();
      if (!data.success) {
        throw new Error(data.errorMessage || 'AI tracing rejected your canvas inputs.');
      }

      setConfig((prev) => ({
        ...prev,
        mode: 'ai_outline',
        aiPolygon: data.polygon,
        aiSubjectName: data.subjectName,
      }));

      setSuccessMessage(`Subject Detected: Identified "${data.subjectName || 'object'}" and carved path!`);
    } catch (err: any) {
      console.error(err);
      setErrorMessage(err.message || 'Connecting to Gemini model failed. Make sure your GEMINI_API_KEY is configured.');
    } finally {
      setIsLoading(false);
    }
  };

  // Extract cutout with absolute alpha transparency support
  const handleDownloadCutout = () => {
    if (!canvasRef.current) return;
    const canvas = canvasRef.current;
    
    // PNG format is required to support Alpha channel transparency!
    const dataUrl = canvas.toDataURL('image/png');
    
    const link = document.createElement('a');
    link.href = dataUrl;
    link.download = `cutout_${image.name.substring(0, image.name.lastIndexOf('.')) || 'photo'}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div id="remover-tool-panel" className="grid grid-cols-1 lg:grid-cols-12 gap-8">
      {/* Settings Column */}
      <div className="lg:col-span-5 space-y-6 bg-slate-900/40 p-6 rounded-2xl border border-slate-800">
        <div>
          <h3 className="text-sm font-semibold tracking-wider text-slate-400 uppercase mb-2">Subject Isolator</h3>
          <p className="text-xs text-slate-500">Isolate foreground subjects, erase backdrop colors, or extract PNG cutouts.</p>
        </div>

        {/* Dual Mode Switcher */}
        <div className="grid grid-cols-2 gap-2">
          <button
            id="mode-picker-btn"
            type="button"
            onClick={() => setConfig({ ...config, mode: 'color_picker' })}
            className={`py-2 px-3 text-xs font-semibold rounded-lg border transition-all flex items-center justify-center gap-1.5 ${
              config.mode === 'color_picker'
                ? 'bg-amber-500/10 text-amber-500 border-amber-500/45 shadow shadow-amber-500/5'
                : 'bg-slate-950/40 text-slate-400 border-slate-800 hover:text-slate-350 hover:border-slate-700'
            }`}
          >
            <MousePointer className="w-3.5 h-3.5" /> Chroma Eraser
          </button>
          <button
            id="mode-ai-btn"
            type="button"
            onClick={() => {
              if (config.aiPolygon) {
                setConfig({ ...config, mode: 'ai_outline' });
              } else {
                handleAiCutout();
              }
            }}
            className={`py-2 px-3 text-xs font-semibold rounded-lg border transition-all flex items-center justify-center gap-1.5 ${
              config.mode === 'ai_outline'
                ? 'bg-amber-500/10 text-amber-500 border-amber-500/45 shadow shadow-amber-500/5'
                : 'bg-slate-950/40 text-slate-400 border-slate-800 hover:text-slate-350 hover:border-slate-700'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5" /> AI Auto-Cutout
          </button>
        </div>

        {config.mode === 'color_picker' ? (
          /* Chroma Mode */
          <div className="space-y-4">
            <div className="p-3.5 bg-slate-950/60 rounded-xl border border-slate-850 text-xs text-slate-400 leading-relaxed flex gap-2.5">
              <Info className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
              <div>
                <strong className="text-slate-300">How to use:</strong> Choose <span className="font-semibold text-slate-200">Chroma Eraser</span>, hover over the image preview column, and <span className="font-semibold text-slate-200">Click on any background shade</span> to instantly melt it away into transparency layers.
              </div>
            </div>

            {config.targetColor && (
              <div className="p-4 bg-slate-950/50 rounded-xl border border-slate-850 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div
                    className="w-8 h-8 rounded-full border border-slate-800 shadow"
                    style={{ backgroundColor: `rgb(${config.targetColor.r}, ${config.targetColor.g}, ${config.targetColor.b})` }}
                  />
                  <div>
                    <span className="text-[10px] text-slate-500 font-mono block">Erase Target Color</span>
                    <span className="text-xs font-semibold font-mono text-slate-300">
                      RGB({config.targetColor.r}, {config.targetColor.g}, {config.targetColor.b})
                    </span>
                  </div>
                </div>
                <button
                  id="reset-color-btn"
                  type="button"
                  onClick={() => setConfig({ ...config, targetColor: null })}
                  className="p-1 px-2.5 bg-slate-900 border border-slate-800 hover:text-amber-500 hover:border-amber-500/20 text-[10px] uppercase font-bold text-slate-400 rounded-md transition-all cursor-pointer"
                >
                  Clear Selection
                </button>
              </div>
            )}

            {config.targetColor && (
              <div className="space-y-1.5">
                <div className="flex justify-between text-xs text-slate-450 font-semibold">
                  <span>Color Eraser Tolerance</span>
                  <span className="font-mono text-amber-500">{config.tolerance}%</span>
                </div>
                <input
                  id="chroma-tolerance-slider"
                  type="range"
                  min="3"
                  max="70"
                  value={config.tolerance}
                  onChange={(e) => setConfig({ ...config, tolerance: parseInt(e.target.value) })}
                  className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-amber-500"
                />
                <span className="text-[9px] text-slate-500 text-right mt-1 block">Increase if pixels around edges are lagging transparency.</span>
              </div>
            )}
          </div>
        ) : (
          /* AI Mode info */
          <div className="space-y-4">
            <div className="p-3.5 bg-amber-500/5 rounded-xl border border-amber-550/15 text-xs text-slate-400 leading-relaxed flex gap-2.5">
              <Cpu className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
              <div>
                <strong className="text-amber-400">Gemini-Vision Segmenter:</strong> Auto-Traces X/Y outlines forming tight polygon perimeter contours clockwise around prominent foreground targets, masking background regions with perfect clarity.
              </div>
            </div>

            {config.aiSubjectName && (
              <div className="p-3 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded-xl flex items-center gap-2 justify-center text-xs">
                <CheckCircle className="w-4 h-4" /> Detected subject: <strong>"{config.aiSubjectName.toUpperCase()}"</strong> ({config.aiPolygon?.length} tracing anchors)
              </div>
            )}

            {!config.aiPolygon && (
              <button
                id="ai-segment-btn"
                type="button"
                onClick={handleAiCutout}
                disabled={isLoading}
                className="w-full py-2.5 px-4 bg-amber-500 hover:bg-amber-600 disabled:bg-slate-800 disabled:text-slate-500 text-slate-950 font-semibold rounded-xl text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer shadow shadow-amber-500/10"
              >
                {isLoading ? (
                  <RefreshCw className="w-4 h-4 animate-spin" />
                ) : (
                  <>
                    <Cpu className="w-4 h-4" /> Initiate Gemini AI Perimeter Scan
                  </>
                )}
              </button>
            )}
          </div>
        )}

        {/* Error alerting */}
        {errorMessage && (
          <div className="p-3 bg-red-500/15 text-red-400 border border-red-500/25 rounded-xl text-xs leading-relaxed">
            {errorMessage}
          </div>
        )}

        {/* Action button */}
        <button
          id="remover-download-btn"
          type="button"
          onClick={handleDownloadCutout}
          disabled={isLoading || (config.mode === 'color_picker' && !config.targetColor) || (config.mode === 'ai_outline' && !config.aiPolygon)}
          className="w-full py-3 px-4 bg-amber-500 hover:bg-amber-600 disabled:bg-slate-800 disabled:text-slate-500 text-slate-950 font-semibold rounded-xl text-xs flex items-center justify-center gap-2 transition-all cursor-pointer shadow-lg shadow-amber-500/10"
        >
          <Download className="w-4 h-4" /> Download Transparent PNG Cutout
        </button>
      </div>

      {/* Visual Canvas screen */}
      <div className="lg:col-span-7 flex flex-col justify-between">
        <div
          ref={containerRef}
          className="relative w-full aspect-video min-h-[300px] bg-slate-950 rounded-2xl border border-slate-800 flex items-center justify-center overflow-hidden"
        >
          {/* Transparent Checkerboard grids */}
          <div className="absolute inset-0 bg-[linear-gradient(45deg,#1c212c_25%,transparent_25%),linear-gradient(-45deg,#1c212c_25%,transparent_25%),linear-gradient(45deg,transparent_75%,#1c212c_75%),linear-gradient(-45deg,transparent_75%,#1c212c_75%)] bg-[size:16px_16px] bg-[position:0_0,0_8px,8px_-8px,-8px_0] opacity-60" />

          {isLoading ? (
            /* Rotating loading state */
            <div className="absolute inset-0 bg-slate-950/80 backdrop-blur z-20 flex flex-col items-center justify-center space-y-4">
              <Cpu className="w-10 h-10 text-amber-500 animate-pulse text-amber-500" />
              <div className="text-center space-y-1">
                <h4 className="text-xs font-semibold text-slate-200">Gemini-Vision Framing...</h4>
                <p className="text-[10px] text-slate-500 font-mono">Tracing contours and mapping foreground anchors.</p>
              </div>
            </div>
          ) : null}

          {/* Canvas render core */}
          <canvas
            ref={canvasRef}
            onClick={handleCanvasClick}
            className={`max-w-[85%] max-h-[85%] object-contain rounded-lg border border-slate-800/80 z-10 transition-all ${
              config.mode === 'color_picker' ? 'cursor-crosshair hover:opacity-90' : ''
            }`}
          />

          {/* Dotted contour path visualization overlays on top of the container (Only for AI outlines) */}
          {config.mode === 'ai_outline' && config.aiPolygon && (
            <svg
              className="absolute inset-x-[7.5%] inset-y-[7.5%] w-[85%] h-[85%] z-20 pointer-events-none select-none"
              viewBox="0 0 1 1"
              preserveAspectRatio="none"
            >
              <polyline
                points={config.aiPolygon.map(pt => `${pt.x},${pt.y}`).join(' ')}
                className="fill-none stroke-amber-500/85 stroke-[0.005] animate-dash stroke-linecap-round"
                style={{ strokeDasharray: '0.015, 0.01' }}
              />
              {config.aiPolygon.map((pt, idx) => (
                <circle
                  key={idx}
                  cx={pt.x}
                  cy={pt.y}
                  r="0.004"
                  className="fill-amber-400 stroke-slate-950 stroke-[0.001] shadow"
                />
              ))}
            </svg>
          )}
        </div>

        {/* Informational footer guide lines */}
        <p className="text-[11px] text-slate-500 text-center mt-3 flex items-center justify-center gap-1.5">
          <ChevronRight className="w-3 h-3 text-amber-500/60" /> 
          {config.mode === 'color_picker' 
            ? 'Hover selector over custom background elements, and select RGB elements with high precision.'
            : 'Interactive glowing dotted paths trace out estimated visual boundaries returned by Gemini.'
          }
        </p>
      </div>
    </div>
  );
}
