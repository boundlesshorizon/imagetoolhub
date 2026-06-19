/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { ImageFile, ToolMode } from './types';
import { formatBytes } from './utils';

// Import subcomponent workspace tools
import CompressTool from './components/CompressTool';
import ResizeTool from './components/ResizeTool';
import ConvertTool from './components/ConvertTool';
import CropTool from './components/CropTool';
import WatermarkTool from './components/WatermarkTool';
import BgRemoverTool from './components/BgRemoverTool';

// Import design icons
import {
  Sparkles,
  Upload,
  RefreshCw,
  Image as ImageIcon,
  Sliders,
  Crop,
  Layers,
  FileDown,
  Tags,
  Cpu,
  Trash2,
  Lock
} from 'lucide-react';

const DEMO_IMAGE_URL = 'https://images.unsplash.com/photo-1514888286974-6c03e2ca1dba?auto=format&fit=crop&q=80&w=1000'; // Cute cat portrait

export default function App() {
  const [activeImage, setActiveImage] = useState<ImageFile | null>(null);
  const [activeTool, setActiveTool] = useState<ToolMode>('compress');
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [isDemoLoading, setIsDemoLoading] = useState<boolean>(false);

  // Initialize with localstorage cached image if present for persistence
  useEffect(() => {
    const cached = localStorage.getItem('image_tools_hub_cached_image');
    if (cached) {
      try {
        const parsed = JSON.parse(cached);
        setActiveImage(parsed);
      } catch (e) {
        console.error('Failed reading cached storage presets:', e);
      }
    }
  }, []);

  const handleSetImage = (fileData: ImageFile) => {
    setActiveImage(fileData);
    // Persist to local cache for quick reloads
    try {
      localStorage.setItem('image_tools_hub_cached_image', JSON.stringify(fileData));
    } catch (e) {
      // Ignore storage size limits
      console.warn('Image payload exceeds standard localStorage limit ratios.');
    }
  };

  // Convert files into structured ImageFile schema
  const ingestFile = (file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const dataUrl = e.target?.result as string;
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.src = dataUrl;
      img.onload = () => {
        handleSetImage({
          id: `${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
          name: file.name,
          type: file.type || 'image/png',
          size: file.size,
          width: img.naturalWidth,
          height: img.naturalHeight,
          dataUrl,
        });
      };
    };
    reader.readAsDataURL(file);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) ingestFile(file);
  };

  // Drag-and-drop triggers
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) ingestFile(file);
  };

  // Fetch or trigger demo image loading
  const handleLoadDemo = async () => {
    setIsDemoLoading(true);
    try {
      const response = await fetch(DEMO_IMAGE_URL);
      const blob = await response.blob();
      
      const reader = new FileReader();
      reader.onloadend = () => {
        const dataUrl = reader.result as string;
        const img = new Image();
        img.crossOrigin = 'anonymous';
        img.src = dataUrl;
        img.onload = () => {
          handleSetImage({
            id: 'demo-cat',
            name: 'demo_feline_portrait.jpg',
            type: 'image/jpeg',
            size: blob.size,
            width: img.naturalWidth,
            height: img.naturalHeight,
            dataUrl,
          });
          setIsDemoLoading(false);
        };
      };
      reader.readAsDataURL(blob);
    } catch (err) {
      console.error('Failed loading demo catalog asset:', err);
      // Fallback fallback raw dataurl if cors blocks
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.src = DEMO_IMAGE_URL;
      img.onload = () => {
        handleSetImage({
          id: 'demo-cat',
          name: 'demo_feline_portrait.jpg',
          type: 'image/jpeg',
          size: 154200, // 150kb approximation
          width: img.naturalWidth,
          height: img.naturalHeight,
          dataUrl: DEMO_IMAGE_URL,
        });
        setIsDemoLoading(false);
      };
    }
  };

  const handleClearImage = () => {
    setActiveImage(null);
    localStorage.removeItem('image_tools_hub_cached_image');
  };

  const handleUpdateImage = (newUrl: string, size: number) => {
    if (!activeImage) return;
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.src = newUrl;
    img.onload = () => {
      handleSetImage({
        ...activeImage,
        size,
        width: img.naturalWidth,
        height: img.naturalHeight,
        dataUrl: newUrl,
      });
    };
  };

  // Switch rendering components dynamically
  const renderWorkspaceTool = () => {
    if (!activeImage) return null;
    switch (activeTool) {
      case 'compress':
        return <CompressTool image={activeImage} onUpdateImage={handleUpdateImage} />;
      case 'resize':
        return <ResizeTool image={activeImage} onUpdateImage={handleUpdateImage} />;
      case 'convert':
        return <ConvertTool image={activeImage} onUpdateImage={handleUpdateImage} />;
      case 'crop':
        return <CropTool image={activeImage} onUpdateImage={handleUpdateImage} />;
      case 'watermark':
        return <WatermarkTool image={activeImage} onUpdateImage={handleUpdateImage} />;
      case 'bg_remover':
        return <BgRemoverTool image={activeImage} onUpdateImage={handleUpdateImage} />;
      default:
        return <CompressTool image={activeImage} onUpdateImage={handleUpdateImage} />;
    }
  };

  // Tool categories Navigation Tabs definitions
  const TOOLS_TABS: { id: ToolMode; label: string; desc: string; icon: any }[] = [
    { id: 'compress', label: 'Compress', desc: 'Optimize weights', icon: Sliders },
    { id: 'resize', label: 'Resize', desc: 'Custom dimensions', icon: RefreshCw },
    { id: 'convert', label: 'Convert', desc: 'PNG / JPG / WEBP', icon: Layers },
    { id: 'crop', label: 'Crop Ratio', desc: 'Social clips', icon: Crop },
    { id: 'watermark', label: 'Watermark', desc: 'Brand security', icon: Tags },
    { id: 'bg_remover', label: 'AI Isolator', desc: 'Foreground cutout', icon: Cpu },
  ];

  return (
    <div className="min-h-screen bg-[#090b0f] text-slate-100 flex flex-col font-sans select-none selection:bg-amber-500/20 selection:text-amber-300">
      
      {/* Upper Navigation Header */}
      <header className="border-b border-slate-900 bg-slate-950/60 backdrop-blur sticky top-0 z-50 py-4 px-6 md:px-12 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-amber-500 rounded-xl flex items-center justify-center text-slate-950 font-extrabold shadow-md shadow-amber-500/10 hover:rotate-6 transition-transform">
            <span className="text-sm tracking-tighter">TH</span>
          </div>
          <div>
            <h1 className="text-base font-bold tracking-tight text-slate-100 flex items-center gap-1.5">
              <span>Image Tools Hub</span>
              <span className="text-[10px] uppercase tracking-widest bg-amber-550/10 text-amber-500 font-mono font-bold px-2 py-0.5 rounded-full border border-amber-500/20 shadow-inner">
                v2.5 Studio
              </span>
            </h1>
            <p className="text-[10px] text-slate-550 mt-0.5">Professional Web Image Compressor, Resizer, Culting & Transcoding Station.</p>
          </div>
        </div>

        {/* Global indicators if active image is present */}
        {activeImage && (
          <div className="flex items-center gap-3 bg-slate-950/80 p-1 px-3 border border-slate-900 rounded-xl">
            <div className="text-right">
              <span className="text-[9px] text-slate-650 block truncate max-w-[120px] font-medium">{activeImage.name}</span>
              <span className="text-[10px] font-mono font-semibold text-amber-500">
                {activeImage.width}×{activeImage.height}px • {formatBytes(activeImage.size)}
              </span>
            </div>
            
            <button
              id="clear-workspace-btn"
              type="button"
              onClick={handleClearImage}
              className="p-1 px-2.5 bg-red-500/10 border border-red-500/20 hover:bg-red-500 hover:text-slate-950 rounded-lg text-red-500 text-[10px] uppercase font-bold transition-all cursor-pointer"
            >
              <Trash2 className="w-3 h-3 inline-block mr-1 -mt-0.5" /> Reset
            </button>
          </div>
        )}
      </header>

      {/* Main Container Stage */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 md:p-8 flex flex-col justify-center">
        
        {!activeImage ? (
          /* Empty drop-zone template upload triggers */
          <div
            id="workspace-dropzone"
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            className={`max-w-2xl w-full mx-auto my-12 border-2 border-dashed rounded-3xl p-10 md:p-14 text-center transition-all bg-slate-950/20 flex flex-col items-center justify-center space-y-6 ${
              isDragging
                ? 'border-amber-500 bg-amber-500/5 shadow-2xl scale-[1.01]'
                : 'border-slate-800 hover:border-slate-700 hover:bg-slate-950/10'
            }`}
          >
            {/* Visual Icon cluster */}
            <div className="relative flex items-center justify-center">
              <div className="w-16 h-16 rounded-2xl bg-amber-500/5 border border-amber-550/20 flex items-center justify-center text-amber-500">
                <Upload className="w-7 h-7" />
              </div>
              <div className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-slate-900 border border-slate-800 flex items-center justify-center text-emerald-500">
                <Sparkles className="w-2.5 h-2.5 animate-pulse" />
              </div>
            </div>

            {/* Ingestion titles instructions */}
            <div className="space-y-2">
              <h2 className="text-xl font-bold tracking-tight text-slate-100">Drag & Drop Image Here</h2>
              <p className="text-xs text-slate-500 max-w-sm mx-auto leading-relaxed">
                Supports massive raw size ratios including PNG, JPEG, and WebP, processing and transcoding completely offline inside your browser.
              </p>
            </div>

            {/* Selection buttons */}
            <div className="flex flex-col sm:flex-row gap-3 pt-2">
              <label 
                id="manual-upload-label"
                className="py-3 px-6 bg-slate-900 hover:bg-slate-800 text-slate-100 border border-slate-800 text-xs font-semibold rounded-xl cursor-pointer transition-all flex items-center justify-center gap-2 shadow"
              >
                <Upload className="w-4 h-4" /> Browse Hard Drive
                <input
                  id="image-file-input"
                  type="file"
                  accept="image/*"
                  onChange={handleFileUpload}
                  className="hidden"
                />
              </label>

              <button
                id="load-demo-btn"
                type="button"
                onClick={handleLoadDemo}
                disabled={isDemoLoading}
                className="py-3 px-6 bg-amber-500 hover:bg-amber-600 disabled:bg-slate-800 text-slate-950 font-semibold rounded-xl text-xs flex items-center justify-center gap-2 transition-all cursor-pointer shadow-lg shadow-amber-500/5 animate-shimmer"
              >
                {isDemoLoading ? (
                  <RefreshCw className="w-4 h-4 animate-spin" />
                ) : (
                  <>
                    <Sparkles className="w-4 h-4" /> Try with Demo Cat
                  </>
                )}
              </button>
            </div>

            {/* Security disclaimer footer */}
            <p className="text-[10px] text-slate-600 flex items-center gap-1">
              <Lock className="w-3 h-3 text-slate-600" /> Private Studio: Your images never leave this machine. Tracing takes place inside secure local memory.
            </p>
          </div>
        ) : (
          /* Active image tools station */
          <div className="space-y-8 animate-fade-in">
            
            {/* Horizontal workspace tools tab switch navigation */}
            <div className="overflow-x-auto pb-2 scrollbar-none">
              <div className="flex border-b border-slate-900 gap-1.5 md:gap-3 min-w-max pb-1">
                {TOOLS_TABS.map((tab) => {
                  const Icon = tab.icon;
                  const isActive = activeTool === tab.id;
                  return (
                    <button
                      id={`tab-select-${tab.id}`}
                      key={tab.id}
                      type="button"
                      onClick={() => setActiveTool(tab.id)}
                      className={`py-3 px-4 rounded-xl text-xs font-semibold flex items-center gap-2.5 transition-all text-left border cursor-pointer ${
                        isActive
                          ? 'bg-amber-500/10 border-amber-500/40 text-amber-500'
                          : 'bg-transparent border-transparent text-slate-450 hover:text-slate-200'
                      }`}
                    >
                      <Icon className={`w-4 h-4 ${isActive ? 'text-amber-500' : 'text-slate-550'}`} />
                      <div>
                        <div className="font-bold leading-none">{tab.label}</div>
                        <div className="text-[9px] text-slate-600 font-medium mt-1">{tab.desc}</div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Active workspace workspace tool panel */}
            <div className="bg-slate-950/20 backdrop-blur rounded-3xl border border-slate-900 p-4 md:p-8 transition-transform">
              {renderWorkspaceTool()}
            </div>
          </div>
        )}
      </main>

      {/* Decorative Branding Status Footer */}
      <footer className="border-t border-slate-950 bg-slate-950/20 py-5 text-center text-[10px] text-slate-650 tracking-wider">
        Copyright © {new Date().getFullYear()} Image Tools Hub • Secured Visual Sandbox Server • Cloud Run Isolation
      </footer>
    </div>
  );
}
