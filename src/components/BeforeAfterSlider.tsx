import React, { useState, useRef, useCallback, useEffect } from 'react';
import { SlidersHorizontal } from 'lucide-react';

interface BeforeAfterSliderProps {
  beforeImage: string;
  afterImage: string;
  beforeLabel?: string;
  afterLabel?: string;
  className?: string;
}

export const BeforeAfterSlider: React.FC<BeforeAfterSliderProps> = ({
  beforeImage,
  afterImage,
  beforeLabel = 'BEFORE',
  afterLabel = 'AFTER (PRESET)',
  className = ''
}) => {
  const [sliderPosition, setSliderPosition] = useState(50);
  const [isDragging, setIsDragging] = useState(false);
  const [containerWidth, setContainerWidth] = useState<number>(0);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!containerRef.current) return;
    const updateWidth = () => {
      if (containerRef.current) {
        setContainerWidth(containerRef.current.clientWidth);
      }
    };
    updateWidth();

    const ro = new ResizeObserver(updateWidth);
    ro.observe(containerRef.current);
    return () => ro.disconnect();
  }, []);

  const handleMove = useCallback((clientX: number) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const x = clientX - rect.left;
    let percentage = (x / rect.width) * 100;
    if (percentage < 0) percentage = 0;
    if (percentage > 100) percentage = 100;
    setSliderPosition(percentage);
  }, []);

  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true);
    handleMove(e.clientX);
  };

  const handleMouseUp = () => setIsDragging(false);

  const handleMouseMove = useCallback(
    (e: React.MouseEvent) => {
      if (!isDragging) return;
      handleMove(e.clientX);
    },
    [isDragging, handleMove]
  );

  const handleTouchMove = useCallback(
    (e: React.TouchEvent) => {
      if (e.touches && e.touches[0]) {
        handleMove(e.touches[0].clientX);
      }
    },
    [handleMove]
  );

  return (
    <div
      ref={containerRef}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
      onTouchMove={handleTouchMove}
      className={`relative overflow-hidden select-none rounded-2xl border border-[#5DE2E7]/30 shadow-2xl cursor-ew-resize group ${className}`}
    >
      {/* After Image (Full background) */}
      <img
        src={afterImage}
        alt="After Preset"
        className="w-full h-full object-cover block pointer-events-none"
      />
      
      <span className="absolute top-3 right-3 z-10 px-2.5 py-1 rounded-lg bg-[#5DE2E7] text-slate-950 font-extrabold text-[10px] tracking-wider shadow-lg">
        {afterLabel}
      </span>

      {/* Before Image (Clipped overlay) */}
      <div
        className="absolute top-0 bottom-0 left-0 overflow-hidden pointer-events-none"
        style={{ width: `${sliderPosition}%` }}
      >
        <img
          src={beforeImage}
          alt="Before Preset"
          className="max-w-none h-full object-cover"
          style={{ width: containerWidth ? `${containerWidth}px` : '100%' }}
        />
        <span className="absolute top-3 left-3 z-10 px-2.5 py-1 rounded-lg bg-slate-950/80 text-white font-extrabold text-[10px] tracking-wider border border-white/20">
          {beforeLabel}
        </span>
      </div>

      {/* Divider Bar & Drag Knob */}
      <div
        className="absolute top-0 bottom-0 z-20 w-1 bg-[#5DE2E7] shadow-[0_0_15px_#5DE2E7] cursor-ew-resize flex items-center justify-center pointer-events-none"
        style={{ left: `${sliderPosition}%` }}
      >
        <div className="w-8 h-8 -ml-3.5 rounded-full bg-slate-950 border-2 border-[#5DE2E7] text-[#5DE2E7] flex items-center justify-center shadow-[0_0_15px_#5DE2E7] group-hover:scale-110 transition-transform">
          <SlidersHorizontal className="w-4 h-4" />
        </div>
      </div>
    </div>
  );
};
