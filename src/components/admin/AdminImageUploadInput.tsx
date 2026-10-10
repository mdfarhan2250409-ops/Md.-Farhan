import React, { useRef, useState, useEffect } from 'react';
import {
  Image as ImageIcon,
  Upload,
  X,
  Check,
  Eye,
  Smartphone,
  AlertCircle,
  RefreshCw,
  Sliders,
  Maximize2,
  Crop,
  RotateCw,
  FlipHorizontal,
  Sparkles,
  Lock,
  Unlock,
  CheckCircle2
} from 'lucide-react';

interface AdminImageUploadInputProps {
  label?: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  required?: boolean;
  helpText?: string;
  maxDimension?: number; // default 1280px
  quality?: number; // default 0.85
  className?: string;
  previewHeight?: string;
}

/**
 * Utility to compress an image file to Base64 using HTML5 Canvas
 */
export const compressImageFile = (
  file: File,
  maxDimension = 1280,
  quality = 0.85
): Promise<{ dataUrl: string; sizeKb: number; width: number; height: number }> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Failed to read image file.'));
    reader.onload = (e) => {
      const img = new Image();
      img.onerror = () => reject(new Error('Failed to load image element.'));
      img.onload = () => {
        let { width, height } = img;

        if (width > maxDimension || height > maxDimension) {
          if (width > height) {
            height = Math.round((height * maxDimension) / width);
            width = maxDimension;
          } else {
            width = Math.round((width * maxDimension) / height);
            height = maxDimension;
          }
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');

        if (!ctx) {
          reject(new Error('Canvas context unavailable'));
          return;
        }

        // Draw image
        ctx.drawImage(img, 0, 0, width, height);

        // Export as JPEG
        const dataUrl = canvas.toDataURL('image/jpeg', quality);
        const sizeKb = Math.round((dataUrl.length * 3) / 4 / 1024);
        resolve({ dataUrl, sizeKb, width, height });
      };
      img.src = e.target?.result as string;
    };
    reader.readAsDataURL(file);
  });
};

/**
 * Utility to crop, resize, rotate and adjust dimensions on HTML5 Canvas
 */
export const processCustomImageResize = (
  imageUrl: string,
  options: {
    targetWidth: number;
    targetHeight: number;
    rotation: number;
    flipH: boolean;
    zoom: number;
    quality?: number;
  }
): Promise<{ dataUrl: string; sizeKb: number }> => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onerror = () => reject(new Error('Could not load image for resizing.'));
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = options.targetWidth;
      canvas.height = options.targetHeight;
      const ctx = canvas.getContext('2d');

      if (!ctx) {
        reject(new Error('Canvas context unavailable'));
        return;
      }

      ctx.fillStyle = '#0f172a';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      ctx.save();
      // Move to center for transformations
      ctx.translate(canvas.width / 2, canvas.height / 2);
      ctx.rotate((options.rotation * Math.PI) / 180);
      ctx.scale(options.flipH ? -1 : 1, 1);

      // Calculate scaling to cover canvas
      const scale = Math.max(
        canvas.width / img.width,
        canvas.height / img.height
      ) * (options.zoom / 100);

      const drawW = img.width * scale;
      const drawH = img.height * scale;

      ctx.drawImage(img, -drawW / 2, -drawH / 2, drawW, drawH);
      ctx.restore();

      const dataUrl = canvas.toDataURL('image/jpeg', options.quality || 0.88);
      const sizeKb = Math.round((dataUrl.length * 3) / 4 / 1024);
      resolve({ dataUrl, sizeKb });
    };
    img.src = imageUrl;
  });
};

export const AdminImageUploadInput: React.FC<AdminImageUploadInputProps> = ({
  label,
  value,
  onChange,
  placeholder = 'https://images.unsplash.com/... or upload from device',
  required = false,
  helpText,
  maxDimension = 1280,
  quality = 0.85,
  className = '',
  previewHeight = 'h-10'
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [showFullPreview, setShowFullPreview] = useState(false);
  const [activeTab, setActiveTab] = useState<'preview' | 'resize'>('preview');

  // Image dimension states
  const [origDimensions, setOrigDimensions] = useState<{ width: number; height: number } | null>(null);
  const [targetWidth, setTargetWidth] = useState<number>(800);
  const [targetHeight, setTargetHeight] = useState<number>(500);
  const [aspectRatioPreset, setAspectRatioPreset] = useState<string>('16:9');
  const [lockRatio, setLockRatio] = useState<boolean>(true);
  const [zoomLevel, setZoomLevel] = useState<number>(100);
  const [rotationAngle, setRotationAngle] = useState<number>(0);
  const [isFlipH, setIsFlipH] = useState<boolean>(false);
  const [appliedSuccess, setAppliedSuccess] = useState(false);

  // Load natural image dimensions when value changes
  useEffect(() => {
    if (!value) {
      setOrigDimensions(null);
      return;
    }
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      setOrigDimensions({ width: img.naturalWidth || img.width, height: img.naturalHeight || img.height });
      if (!targetWidth || !targetHeight) {
        setTargetWidth(Math.min(img.naturalWidth || 800, 1200));
        setTargetHeight(Math.min(img.naturalHeight || 500, 800));
      }
    };
    img.src = value;
  }, [value]);

  // Determine if the current value is a device-uploaded Base64 data URI
  const isBase64 = Boolean(value && value.startsWith('data:image/'));
  const approxSizeKb = isBase64 ? Math.round((value.length * 3) / 4 / 1024) : null;

  const handleFileSelection = async (file: File) => {
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setErrorMessage('Please select a valid image file (PNG, JPG, WEBP, GIF, SVG).');
      return;
    }

    try {
      setIsProcessing(true);
      setErrorMessage(null);
      const { dataUrl, width, height } = await compressImageFile(file, maxDimension, quality);
      onChange(dataUrl);
      setOrigDimensions({ width, height });
      setTargetWidth(width);
      setTargetHeight(height);
    } catch (err: any) {
      console.error('Image upload error:', err);
      setErrorMessage('Failed to process image. Please try another image.');
    } finally {
      setIsProcessing(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      handleFileSelection(files[0]);
    }
  };

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
    const files = e.dataTransfer.files;
    if (files && files.length > 0) {
      handleFileSelection(files[0]);
    }
  };

  // Preset aspect ratio selector handler
  const handlePresetSelect = (preset: string, w: number, h: number) => {
    setAspectRatioPreset(preset);
    setTargetWidth(w);
    setTargetHeight(h);
  };

  // Width change handler maintaining ratio if locked
  const handleWidthChange = (w: number) => {
    setTargetWidth(w);
    if (lockRatio && origDimensions && origDimensions.width > 0) {
      const ratio = origDimensions.height / origDimensions.width;
      setTargetHeight(Math.round(w * ratio));
    }
  };

  // Height change handler maintaining ratio if locked
  const handleHeightChange = (h: number) => {
    setTargetHeight(h);
    if (lockRatio && origDimensions && origDimensions.height > 0) {
      const ratio = origDimensions.width / origDimensions.height;
      setTargetWidth(Math.round(h * ratio));
    }
  };

  // Apply custom resize, crop & zoom
  const handleApplyResize = async () => {
    if (!value) return;
    try {
      setIsProcessing(true);
      const { dataUrl } = await processCustomImageResize(value, {
        targetWidth,
        targetHeight,
        rotation: rotationAngle,
        flipH: isFlipH,
        zoom: zoomLevel,
        quality
      });
      onChange(dataUrl);
      setAppliedSuccess(true);
      setTimeout(() => {
        setAppliedSuccess(false);
        setActiveTab('preview');
      }, 1200);
    } catch (err) {
      console.error('Resize error:', err);
      setErrorMessage('Could not apply resize on this image URL due to CORS or format restrictions.');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className={`space-y-1.5 ${className}`}>
      {label && (
        <div className="flex items-center justify-between">
          <label className="block text-slate-300 font-bold text-xs flex items-center gap-1.5">
            <ImageIcon className="w-3.5 h-3.5 text-[#5DE2E7]" />
            <span>{label}</span>
            {required && <span className="text-red-400">*</span>}
          </label>
          <div className="flex items-center gap-2">
            {origDimensions && (
              <span className="text-[10px] text-slate-400 bg-white/5 border border-white/10 px-1.5 py-0.5 rounded">
                {origDimensions.width}×{origDimensions.height}px
              </span>
            )}
            {isBase64 && approxSizeKb && (
              <span className="text-[10px] text-cyan-300 bg-cyan-950/60 border border-cyan-500/30 px-2 py-0.5 rounded-md flex items-center gap-1">
                <Smartphone className="w-2.5 h-2.5" />
                <span>Device Upload (~{approxSizeKb} KB)</span>
              </span>
            )}
          </div>
        </div>
      )}

      {/* Hidden native file input targeting device gallery/files */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleInputChange}
        className="hidden"
        aria-label="Upload image from device gallery"
      />

      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={`flex flex-col sm:flex-row items-stretch sm:items-center gap-2 p-1.5 rounded-2xl bg-slate-950 border transition-all ${
          isDragging
            ? 'border-[#5DE2E7] bg-cyan-950/30 ring-2 ring-[#5DE2E7]/40'
            : 'border-white/10 hover:border-white/20'
        }`}
      >
        {/* Direct Image URL Text Input */}
        <div className="relative flex-1 min-w-0">
          <input
            type="text"
            required={required && !value}
            value={value}
            placeholder={placeholder}
            onChange={(e) => {
              setErrorMessage(null);
              onChange(e.target.value);
            }}
            className="w-full px-3 py-2 text-xs bg-transparent text-white placeholder-slate-500 focus:outline-none"
          />
          {value && (
            <button
              type="button"
              onClick={() => {
                onChange('');
                setErrorMessage(null);
                setOrigDimensions(null);
              }}
              title="Clear Image"
              className="absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded-md text-slate-400 hover:text-red-400 hover:bg-white/5 transition"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Action Controls: Device Gallery, Resize/Edit, & Preview Thumbnail */}
        <div className="flex items-center gap-1.5 shrink-0 px-1 pb-1 sm:pb-0">
          {/* Button to directly open Device Gallery */}
          <button
            type="button"
            disabled={isProcessing}
            onClick={() => fileInputRef.current?.click()}
            className="px-3 py-2 rounded-xl bg-gradient-to-r from-[#133E87] to-cyan-600 hover:from-[#1b4b9b] hover:to-cyan-500 text-white font-bold text-xs flex items-center gap-1.5 shadow-sm transition disabled:opacity-50 whitespace-nowrap cursor-pointer"
            title="Open device photo gallery or choose file from device"
          >
            {isProcessing ? (
              <>
                <RefreshCw className="w-3.5 h-3.5 animate-spin text-[#5DE2E7]" />
                <span className="text-[11px]">Processing...</span>
              </>
            ) : (
              <>
                <Upload className="w-3.5 h-3.5 text-[#5DE2E7]" />
                <span className="text-[11px]">Device Gallery</span>
              </>
            )}
          </button>

          {/* Sizing & Custom Edit Button */}
          {value && (
            <button
              type="button"
              onClick={() => {
                setActiveTab('resize');
                setShowFullPreview(true);
              }}
              className="px-2.5 py-2 rounded-xl bg-slate-900 hover:bg-cyan-950/60 border border-white/10 hover:border-cyan-500/40 text-cyan-300 font-bold text-xs flex items-center gap-1.5 transition whitespace-nowrap"
              title="Edit image display size, aspect ratio, crop and dimensions"
            >
              <Crop className="w-3.5 h-3.5 text-[#5DE2E7]" />
              <span className="text-[11px] hidden md:inline">Size & Crop</span>
            </button>
          )}

          {/* Thumbnail preview badge / zoom trigger */}
          {value && (
            <div
              onClick={() => {
                setActiveTab('preview');
                setShowFullPreview(true);
              }}
              className={`relative ${previewHeight} w-11 rounded-xl overflow-hidden border border-cyan-500/40 cursor-pointer group shrink-0 bg-slate-900 shadow-[0_0_10px_rgba(93,226,231,0.2)]`}
              title="Click to view full preview & size settings"
            >
              <img
                src={value}
                alt="Preview"
                className="w-full h-full object-cover group-hover:scale-110 transition duration-200"
                onError={(e) => {
                  (e.currentTarget as HTMLImageElement).style.display = 'none';
                }}
              />
              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition flex items-center justify-center text-white">
                <Eye className="w-3.5 h-3.5 text-[#5DE2E7]" />
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Error Feedback */}
      {errorMessage && (
        <p className="text-[11px] text-red-400 flex items-center gap-1 mt-1 font-medium">
          <AlertCircle className="w-3.5 h-3.5 shrink-0" />
          <span>{errorMessage}</span>
        </p>
      )}

      {/* Helper text */}
      {helpText && !errorMessage && (
        <p className="text-[10px] text-slate-400 mt-0.5">{helpText}</p>
      )}

      {/* Full Preview & Interactive Size / Crop Modal Popup */}
      {showFullPreview && value && (
        <div
          onClick={() => setShowFullPreview(false)}
          className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-3 sm:p-4 overflow-y-auto"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="max-w-2xl w-full bg-slate-900 border border-cyan-500/40 rounded-3xl p-4 sm:p-6 shadow-2xl space-y-4 animate-in fade-in zoom-in-95 duration-150 my-auto"
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-xl bg-cyan-500/10 border border-cyan-500/30 text-[#5DE2E7]">
                  <ImageIcon className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white flex items-center gap-2">
                    <span>Image Preview & Display Size Settings</span>
                  </h3>
                  <p className="text-[11px] text-slate-400">
                    Manage how this image will be framed and displayed across the website
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowFullPreview(false)}
                className="p-1.5 rounded-xl text-slate-400 hover:text-white bg-white/5 hover:bg-white/10 transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Navigation Tabs: Quick Preview vs Size & Crop Editor */}
            <div className="flex items-center gap-2 p-1 bg-slate-950 rounded-xl border border-white/10">
              <button
                type="button"
                onClick={() => setActiveTab('preview')}
                className={`flex-1 py-1.5 px-3 rounded-lg text-xs font-bold transition flex items-center justify-center gap-1.5 ${
                  activeTab === 'preview'
                    ? 'bg-gradient-to-r from-cyan-500 to-blue-600 text-white shadow-md'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <Eye className="w-3.5 h-3.5" />
                <span>Standard Preview</span>
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('resize')}
                className={`flex-1 py-1.5 px-3 rounded-lg text-xs font-bold transition flex items-center justify-center gap-1.5 ${
                  activeTab === 'resize'
                    ? 'bg-gradient-to-r from-cyan-500 to-blue-600 text-white shadow-md'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <Crop className="w-3.5 h-3.5" />
                <span>Size, Aspect Ratio & Crop Editor</span>
              </button>
            </div>

            {/* TAB 1: Standard Preview */}
            {activeTab === 'preview' && (
              <div className="space-y-4">
                <div className="rounded-2xl overflow-hidden bg-slate-950 border border-white/10 p-2 flex flex-col items-center justify-center min-h-[220px] max-h-[360px] relative">
                  <img
                    src={value}
                    alt="Full preview"
                    className="max-h-[340px] max-w-full object-contain rounded-xl shadow-lg"
                  />
                  {origDimensions && (
                    <div className="absolute bottom-4 right-4 bg-slate-900/90 backdrop-blur-sm border border-white/15 px-2.5 py-1 rounded-lg text-[10px] font-mono text-cyan-300 shadow">
                      {origDimensions.width} × {origDimensions.height} px
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center">
                  <div className="p-2.5 rounded-xl bg-slate-950 border border-white/5">
                    <span className="text-[10px] text-slate-400 block">Original Width</span>
                    <span className="text-xs font-mono font-bold text-white">
                      {origDimensions ? `${origDimensions.width} px` : 'Auto'}
                    </span>
                  </div>
                  <div className="p-2.5 rounded-xl bg-slate-950 border border-white/5">
                    <span className="text-[10px] text-slate-400 block">Original Height</span>
                    <span className="text-xs font-mono font-bold text-white">
                      {origDimensions ? `${origDimensions.height} px` : 'Auto'}
                    </span>
                  </div>
                  <div className="p-2.5 rounded-xl bg-slate-950 border border-white/5">
                    <span className="text-[10px] text-slate-400 block">Source Format</span>
                    <span className="text-xs font-bold text-cyan-400">
                      {isBase64 ? 'Device Upload' : 'Web URL'}
                    </span>
                  </div>
                  <div className="p-2.5 rounded-xl bg-slate-950 border border-white/5">
                    <span className="text-[10px] text-slate-400 block">Est. File Size</span>
                    <span className="text-xs font-mono font-bold text-emerald-400">
                      {approxSizeKb ? `~${approxSizeKb} KB` : 'Optimized'}
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* TAB 2: Interactive Resize, Ratio & Crop Editor */}
            {activeTab === 'resize' && (
              <div className="space-y-4">
                {/* Live Transformed Canvas Preview */}
                <div className="rounded-2xl overflow-hidden bg-slate-950 border border-cyan-500/30 p-3 flex flex-col items-center justify-center min-h-[220px] max-h-[300px] relative">
                  <div
                    className="relative overflow-hidden rounded-xl border border-dashed border-cyan-400/60 shadow-2xl transition-all duration-200 flex items-center justify-center bg-slate-900"
                    style={{
                      width: `${Math.min(targetWidth * 0.35, 340)}px`,
                      height: `${Math.min(targetHeight * 0.35, 220)}px`,
                      maxWidth: '100%'
                    }}
                  >
                    <img
                      src={value}
                      alt="Crop transformed preview"
                      className="w-full h-full object-cover transition-transform duration-150"
                      style={{
                        transform: `scale(${zoomLevel / 100}) rotate(${rotationAngle}deg) scaleX(${isFlipH ? -1 : 1})`,
                      }}
                    />
                    <div className="absolute top-1.5 left-1.5 bg-black/70 backdrop-blur-sm px-1.5 py-0.5 rounded text-[9px] font-mono text-cyan-300 border border-white/10">
                      Preview: {targetWidth} × {targetHeight}
                    </div>
                  </div>
                </div>

                {/* Aspect Ratio Preset Buttons */}
                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold text-slate-300 block">
                    Target Aspect Ratio & Screen Preset:
                  </label>
                  <div className="grid grid-cols-3 sm:grid-cols-6 gap-1.5">
                    {[
                      { label: '16:9 Banner', w: 1200, h: 675, key: '16:9' },
                      { label: '4:3 Standard', w: 800, h: 600, key: '4:3' },
                      { label: '1:1 Square', w: 500, h: 500, key: '1:1' },
                      { label: '3:2 Photo', w: 900, h: 600, key: '3:2' },
                      { label: '9:16 Story', w: 600, h: 1066, key: '9:16' },
                      { label: '21:9 Ultra', w: 1260, h: 540, key: '21:9' }
                    ].map((preset) => (
                      <button
                        key={preset.key}
                        type="button"
                        onClick={() => handlePresetSelect(preset.key, preset.w, preset.h)}
                        className={`p-1.5 rounded-xl text-[10px] font-bold border transition text-center ${
                          aspectRatioPreset === preset.key
                            ? 'bg-cyan-500/20 border-cyan-400 text-[#5DE2E7]'
                            : 'bg-slate-950 border-white/10 text-slate-400 hover:text-white hover:border-white/20'
                        }`}
                      >
                        {preset.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Custom Dimensions (Width x Height) */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3 rounded-2xl bg-slate-950 border border-white/10">
                  <div className="space-y-1">
                    <label className="text-[11px] font-bold text-slate-300 flex items-center justify-between">
                      <span>Width (px)</span>
                      <span className="text-[10px] text-cyan-400 font-mono">{targetWidth}px</span>
                    </label>
                    <input
                      type="number"
                      min={100}
                      max={2560}
                      value={targetWidth}
                      onChange={(e) => handleWidthChange(parseInt(e.target.value) || 100)}
                      className="w-full px-3 py-1.5 text-xs bg-slate-900 border border-white/10 rounded-xl text-white font-mono focus:border-cyan-400 focus:outline-none"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[11px] font-bold text-slate-300 flex items-center justify-between">
                      <span>Height (px)</span>
                      <span className="text-[10px] text-cyan-400 font-mono">{targetHeight}px</span>
                    </label>
                    <input
                      type="number"
                      min={100}
                      max={2560}
                      value={targetHeight}
                      onChange={(e) => handleHeightChange(parseInt(e.target.value) || 100)}
                      className="w-full px-3 py-1.5 text-xs bg-slate-900 border border-white/10 rounded-xl text-white font-mono focus:border-cyan-400 focus:outline-none"
                    />
                  </div>
                </div>

                {/* Zoom, Rotation & Flip Controls */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-400 flex items-center justify-between">
                      <span>Zoom Scale</span>
                      <span className="text-cyan-400">{zoomLevel}%</span>
                    </label>
                    <input
                      type="range"
                      min={50}
                      max={200}
                      value={zoomLevel}
                      onChange={(e) => setZoomLevel(parseInt(e.target.value))}
                      className="w-full accent-cyan-400 h-1.5 bg-slate-950 rounded-lg cursor-pointer"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-400 flex items-center justify-between">
                      <span>Rotate Angle</span>
                      <span className="text-cyan-400">{rotationAngle}°</span>
                    </label>
                    <button
                      type="button"
                      onClick={() => setRotationAngle((prev) => (prev + 90) % 360)}
                      className="w-full py-1.5 px-3 rounded-xl bg-slate-950 hover:bg-slate-800 border border-white/10 text-xs font-bold text-slate-300 hover:text-white flex items-center justify-center gap-1.5 transition"
                    >
                      <RotateCw className="w-3 h-3 text-[#5DE2E7]" />
                      <span>Rotate 90°</span>
                    </button>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-400 block">Flip Horizontal</label>
                    <button
                      type="button"
                      onClick={() => setIsFlipH((prev) => !prev)}
                      className={`w-full py-1.5 px-3 rounded-xl border text-xs font-bold flex items-center justify-center gap-1.5 transition ${
                        isFlipH
                          ? 'bg-cyan-500/20 border-cyan-400 text-[#5DE2E7]'
                          : 'bg-slate-950 border-white/10 text-slate-300 hover:text-white'
                      }`}
                    >
                      <FlipHorizontal className="w-3 h-3" />
                      <span>{isFlipH ? 'Flipped' : 'Normal'}</span>
                    </button>
                  </div>
                </div>

                {/* Apply Button */}
                <div className="pt-2">
                  <button
                    type="button"
                    disabled={isProcessing}
                    onClick={handleApplyResize}
                    className="w-full py-2.5 px-4 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-[0_0_20px_rgba(16,185,129,0.3)] transition disabled:opacity-50 cursor-pointer"
                  >
                    {appliedSuccess ? (
                      <>
                        <CheckCircle2 className="w-4 h-4 text-white animate-bounce" />
                        <span>Resized & Saved Successfully!</span>
                      </>
                    ) : isProcessing ? (
                      <>
                        <RefreshCw className="w-4 h-4 animate-spin" />
                        <span>Rendering Image Canvas...</span>
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-4 h-4 text-white" />
                        <span>Apply & Save Resized Dimensions ({targetWidth} × {targetHeight} px)</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            )}

            {/* Modal Bottom Footer Actions */}
            <div className="flex flex-col sm:flex-row items-center justify-between text-[11px] text-slate-300 pt-2 border-t border-white/10 gap-2">
              <span className="truncate max-w-[280px] text-slate-400 font-mono text-[10px]">
                {isBase64 ? `Device Photo (${approxSizeKb} KB)` : value}
              </span>
              <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="px-3.5 py-2 rounded-xl bg-[#133E87] hover:bg-cyan-600 text-white font-bold transition flex items-center gap-1.5 text-xs shadow"
                >
                  <Upload className="w-3.5 h-3.5 text-[#5DE2E7]" />
                  Change
                </button>
                <button
                  type="button"
                  onClick={() => setShowFullPreview(false)}
                  className="px-4 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white font-bold transition text-xs"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

