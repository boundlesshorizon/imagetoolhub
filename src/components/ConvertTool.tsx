/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState } from 'react';
import { ImageFile } from '../types';
import { formatBytes } from '../utils';
import { RefreshCw, Download, Layers, ShieldAlert, CheckCircle } from 'lucide-react';

interface ConvertToolProps {
  image: ImageFile;
  onUpdateImage: (newUrl: string, size: number) => void;
}

export default function ConvertTool({ image }: ConvertToolProps) {
  const [targetType, setTargetType] = useState<'image/png' | 'image/jpeg' | 'image/webp'>('image/webp');
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [successMsg, setSuccessMsg] = useState<boolean>(false);

  const getExtension = (mime: string) => {
    if (mime === 'image/png') return 'png';
    if (mime === 'image/jpeg') return 'jpg';
    return 'webp';
  };

  const currentExt = getExtension(image.type);
  const targetExt = getExtension(targetType);

  const handleConvert = () => {
    setIsProcessing(true);
    setSuccessMsg(false);

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

      // If target is JPEG and original has alpha channel, flood canvas with white backdrop first
      if (targetType === 'image/jpeg') {
        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
      }

      ctx.drawImage(img, 0, 0);

      const convertedUrl = canvas.toDataURL(targetType, 0.95);
      
      const link = document.createElement('a');
      link.href = convertedUrl;
      link.download = `${image.name.substring(0, image.name.lastIndexOf('.')) || 'image'}.${targetExt}`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      setIsProcessing(false);
      setSuccessMsg(true);
      setTimeout(() => setSuccessMsg(false), 4000);
    };
  };

  // Check if original is PNG/WEBP conversion to JPEG which risks clipping custom transparency layers
  const isLossyTransparency = (image.type === 'image/png' || image.type === 'image/webp') && targetType === 'image/jpeg';

  return (
    <div id="convert-tool-panel" className="grid grid-cols-1 lg:grid-cols-12 gap-8">
      {/* Settings Options */}
      <div className="lg:col-span-5 space-y-6 bg-slate-900/40 p-6 rounded-2xl border border-slate-800">
        <div>
          <h3 className="text-sm font-semibold tracking-wider text-slate-400 uppercase mb-2">Transcoder & Formats</h3>
          <p className="text-xs text-slate-500">Transform file formats between PNG, JPG, and WEBP seamlessly using client-side pipelines.</p>
        </div>

        <div className="space-y-3">
          <label className="text-xs font-semibold text-slate-300">Set Destination Format</label>
          <div className="space-y-2">
            {[
              { type: 'image/webp', label: 'WEBP Image', desc: 'Modern high compression (supports transparency)' },
              { type: 'image/jpeg', label: 'JPEG Image', desc: 'Highly compatible photograph format (flattened white background)' },
              { type: 'image/png', label: 'PNG Image', desc: 'Lossless quality standard (supports transparent background)' }
            ].map((formatItem) => (
              <button
                key={formatItem.type}
                type="button"
                onClick={() => setTargetType(formatItem.type as any)}
                className={`w-full flex items-center justify-between text-left p-3.5 rounded-xl border transition-all ${
                  targetType === formatItem.type
                    ? 'bg-amber-500/10 border-amber-500/50 text-amber-500 shadow-sm shadow-amber-500/5'
                    : 'bg-slate-950/40 border-slate-800 text-slate-350 hover:bg-slate-950 hover:border-slate-700'
                }`}
              >
                <div>
                  <div className="text-xs font-bold">{formatItem.label}</div>
                  <div className="text-[10px] text-slate-500 mt-1">{formatItem.desc}</div>
                </div>
                <span className="font-mono text-[10px] uppercase bg-slate-900 px-2 py-0.5 rounded border border-slate-800">
                  .{formatItem.type.split('/')[1] === 'jpeg' ? 'jpg' : formatItem.type.split('/')[1]}
                </span>
              </button>
            ))}
          </div>
        </div>

        {isLossyTransparency && (
          <div className="p-3 bg-amber-500/5 text-amber-400 border border-amber-500/20 rounded-xl flex gap-2.5 items-start">
            <ShieldAlert className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
            <div className="text-[11px] leading-relaxed">
              <span className="font-bold">Transparency Flattening:</span> Transitioning transparent shapes into JPEG will flatten transparent background pixels into a <span className="font-semibold text-slate-200">Solid White</span> canvas. Use WebP or PNG format to preserve alpha overlays.
            </div>
          </div>
        )}

        {/* Action Button */}
        <div className="space-y-3">
          <button
            id="convert-trigger-btn"
            type="button"
            onClick={handleConvert}
            disabled={isProcessing || currentExt === targetExt}
            className="w-full py-3 px-4 bg-amber-500 hover:bg-amber-600 disabled:bg-slate-800 disabled:text-slate-500 text-slate-950 font-semibold rounded-xl text-xs flex items-center justify-center gap-2 transition-all cursor-pointer shadow-lg shadow-amber-500/10"
          >
            {isProcessing ? (
              <RefreshCw className="w-4 h-4 animate-spin" />
            ) : (
              <>
                <Layers className="w-4 h-4" /> Convert & Export Output
              </>
            )}
          </button>

          {currentExt === targetExt && (
            <p className="text-[10px] text-slate-500 text-center">
              Target extension matches current source format (. {currentExt}). Select a different output to proceed.
            </p>
          )}

          {successMsg && (
            <div className="p-2.5 bg-emerald-500/10 text-emerald-400 border border-emerald-500/25 rounded-lg flex items-center gap-2 justify-center text-[11px]">
              <CheckCircle className="w-4 h-4 shrink-0" /> Formatted file exported successfully! Check your downloads.
            </div>
          )}
        </div>
      </div>

      {/* Visual Canvas Panel */}
      <div className="lg:col-span-7 flex flex-col justify-between">
        <div className="relative w-full aspect-video min-h-[300px] bg-slate-950/80 rounded-2xl border border-slate-800 flex items-center justify-center overflow-hidden">
          {/* Background pattern */}
          <div className="absolute inset-0 bg-[linear-gradient(45deg,#13161d_25%,transparent_25%),linear-gradient(-45deg,#13161d_25%,transparent_25%),linear-gradient(45deg,transparent_75%,#13161d_75%),linear-gradient(-45deg,transparent_75%,#13161d_75%)] bg-[size:16px_16px] bg-[position:0_0,0_8px,8px_-8px,-8px_0]" />

          <img
            src={image.dataUrl}
            alt="Source transcoder canvas"
            className="absolute max-w-[85%] max-h-[85%] object-contain rounded-lg border border-slate-800 shadow-xl"
            referrerPolicy="no-referrer"
          />
        </div>

        {/* Live specs footprint comparison */}
        <div className="mt-4 p-4 rounded-xl border border-slate-800/80 bg-slate-900/20 flex flex-wrap justify-between items-center gap-4">
          <div className="flex items-center gap-4">
            <div className="bg-slate-900 px-3 py-1.5 rounded-lg border border-slate-850">
              <span className="text-[9px] text-slate-500 uppercase block font-mono font-bold">Input Format</span>
              <span className="text-xs font-mono font-bold text-slate-400 uppercase">{currentExt}</span>
            </div>
            
            <div className="text-slate-600 font-mono">→</div>

            <div className="bg-amber-500/10 px-3 py-1.5 rounded-lg border border-amber-550/20">
              <span className="text-[9px] text-amber-500 uppercase block font-mono font-bold">Output Format</span>
              <span className="text-xs font-mono font-extrabold text-amber-400 uppercase">{targetExt}</span>
            </div>
          </div>

          <div className="text-right">
            <span className="text-[10px] text-slate-500 block uppercase font-mono">Payload Weights</span>
            <span className="text-xs font-semibold text-slate-400 font-mono">{formatBytes(image.size)}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
