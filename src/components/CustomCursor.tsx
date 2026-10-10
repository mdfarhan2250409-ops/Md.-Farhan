import React, { useEffect, useRef, useState, useCallback } from 'react';

interface ClickRipple {
  id: number;
  x: number;
  y: number;
}

export const CustomCursor: React.FC = () => {
  const [isEnabled, setIsEnabled] = useState(false);
  const [ripples, setRipples] = useState<ClickRipple[]>([]);

  const dotRef = useRef<HTMLDivElement>(null);
  const ringRef = useRef<HTMLDivElement>(null);

  // Position and state tracking refs to avoid React re-renders during mouse movement
  const mousePos = useRef({ x: -200, y: -200 });
  const currentPos = useRef({ x: -200, y: -200 });
  const ringPos = useRef({ x: -200, y: -200 });
  const isVisible = useRef(false);
  const isHovered = useRef(false);
  const isTextTarget = useRef(false);
  const isMouseDown = useRef(false);
  const rafId = useRef<number | null>(null);
  const isRunning = useRef(false);

  // Check hardware and accessibility capabilities
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const finePointerMedia = window.matchMedia('(hover: hover) and (pointer: fine)');
    const reducedMotionMedia = window.matchMedia('(prefers-reduced-motion: reduce)');

    const evaluateCapability = () => {
      const isFine = finePointerMedia.matches;
      const isReduced = reducedMotionMedia.matches;
      setIsEnabled(isFine && !isReduced);
    };

    evaluateCapability();

    // Listen for capability changes (e.g. tablet dock/undock, accessibility settings toggle)
    try {
      finePointerMedia.addEventListener('change', evaluateCapability);
      reducedMotionMedia.addEventListener('change', evaluateCapability);
    } catch {
      // Fallback for older browsers
      finePointerMedia.addListener(evaluateCapability);
      reducedMotionMedia.addListener(evaluateCapability);
    }

    return () => {
      try {
        finePointerMedia.removeEventListener('change', evaluateCapability);
        reducedMotionMedia.removeEventListener('change', evaluateCapability);
      } catch {
        finePointerMedia.removeListener(evaluateCapability);
        reducedMotionMedia.removeListener(evaluateCapability);
      }
    };
  }, []);

  // Update styles directly on DOM nodes for zero-lag 60/120fps animation
  const updateCursorStyles = useCallback(() => {
    if (!dotRef.current || !ringRef.current) return;

    if (!isVisible.current) {
      dotRef.current.style.opacity = '0';
      ringRef.current.style.opacity = '0';
      return;
    }

    if (isTextTarget.current) {
      // When hovering over text inputs/textareas, keep dot minimal and transparent
      dotRef.current.style.opacity = '0.35';
      dotRef.current.style.transform = `translate3d(${currentPos.current.x}px, ${currentPos.current.y}px, 0) scale(0.6)`;
      ringRef.current.style.opacity = '0';
      ringRef.current.style.transform = `translate3d(${ringPos.current.x}px, ${ringPos.current.y}px, 0) scale(0.4)`;
    } else if (isHovered.current) {
      // Interactive element hovered: dot expands with glow and cyber aura ring
      const dotScale = isMouseDown.current ? 1.2 : 1.5;
      const ringScale = isMouseDown.current ? 0.9 : 1.35;
      dotRef.current.style.opacity = '1';
      dotRef.current.style.transform = `translate3d(${currentPos.current.x}px, ${currentPos.current.y}px, 0) scale(${dotScale})`;
      ringRef.current.style.opacity = '0.75';
      ringRef.current.style.transform = `translate3d(${ringPos.current.x}px, ${ringPos.current.y}px, 0) scale(${ringScale})`;
    } else {
      // Default rest/moving state
      const dotScale = isMouseDown.current ? 0.75 : 1;
      dotRef.current.style.opacity = '0.9';
      dotRef.current.style.transform = `translate3d(${currentPos.current.x}px, ${currentPos.current.y}px, 0) scale(${dotScale})`;
      ringRef.current.style.opacity = '0';
      ringRef.current.style.transform = `translate3d(${ringPos.current.x}px, ${ringPos.current.y}px, 0) scale(0.7)`;
    }
  }, []);

  // Smooth animation loop using requestAnimationFrame
  const startAnimationLoop = useCallback(() => {
    if (isRunning.current) return;
    isRunning.current = true;

    const animate = () => {
      // Interpolate dot position (fast & responsive)
      const dotDx = mousePos.current.x - currentPos.current.x;
      const dotDy = mousePos.current.y - currentPos.current.y;
      currentPos.current.x += dotDx * 0.32;
      currentPos.current.y += dotDy * 0.32;

      // Interpolate ring aura position (smooth trailing lag)
      const ringDx = mousePos.current.x - ringPos.current.x;
      const ringDy = mousePos.current.y - ringPos.current.y;
      ringPos.current.x += ringDx * 0.18;
      ringPos.current.y += ringDy * 0.18;

      updateCursorStyles();

      // Check if mouse has stopped moving and positions converged (sleep loop to save battery)
      const isStillMoving =
        Math.abs(dotDx) > 0.05 ||
        Math.abs(dotDy) > 0.05 ||
        Math.abs(ringDx) > 0.05 ||
        Math.abs(ringDy) > 0.05;

      if (isStillMoving || isMouseDown.current) {
        rafId.current = requestAnimationFrame(animate);
      } else {
        isRunning.current = false;
        rafId.current = null;
      }
    };

    rafId.current = requestAnimationFrame(animate);
  }, [updateCursorStyles]);

  // Remove individual click ripple upon animation completion
  const handleRippleEnd = useCallback((id: number) => {
    setRipples((prev) => prev.filter((r) => r.id !== id));
  }, []);

  // Event listeners for mouse tracking, hover detection, and click ripples
  useEffect(() => {
    if (!isEnabled) return;

    const handlePointerMove = (e: PointerEvent) => {
      // Ignore simulated pointer events from touch
      if (e.pointerType === 'touch') return;

      mousePos.current.x = e.clientX;
      mousePos.current.y = e.clientY;

      if (!isVisible.current) {
        isVisible.current = true;
        currentPos.current.x = e.clientX;
        currentPos.current.y = e.clientY;
        ringPos.current.x = e.clientX;
        ringPos.current.y = e.clientY;
      }

      startAnimationLoop();
    };

    const handlePointerEnter = () => {
      isVisible.current = true;
      startAnimationLoop();
    };

    const handlePointerLeave = () => {
      isVisible.current = false;
      updateCursorStyles();
    };

    const handlePointerDown = (e: PointerEvent) => {
      if (e.pointerType === 'touch') return;
      isMouseDown.current = true;

      // Spawn click ripple at exact click coordinates
      const newRipple: ClickRipple = {
        id: Date.now() + Math.random(),
        x: e.clientX,
        y: e.clientY
      };

      setRipples((prev) => [...prev.slice(-7), newRipple]);
      startAnimationLoop();
    };

    const handlePointerUp = (e: PointerEvent) => {
      if (e.pointerType === 'touch') return;
      isMouseDown.current = false;
      startAnimationLoop();
    };

    // Event delegation on document to detect hover on interactive elements
    const handleMouseOver = (e: MouseEvent) => {
      const target = e.target as HTMLElement | null;
      if (!target) return;

      const interactive = !!target.closest(
        'a, button, [role="button"], input, textarea, select, [tabindex]:not([tabindex="-1"]), .cursor-pointer, summary'
      );
      const isText = !!target.closest(
        'input[type="text"], input[type="password"], input[type="email"], input[type="search"], input[type="number"], textarea'
      );

      isHovered.current = interactive;
      isTextTarget.current = isText;
      startAnimationLoop();
    };

    const handleMouseOut = (e: MouseEvent) => {
      const related = e.relatedTarget as HTMLElement | null;
      if (!related || related === document.documentElement) {
        isHovered.current = false;
        isTextTarget.current = false;
        startAnimationLoop();
      }
    };

    window.addEventListener('pointermove', handlePointerMove, { passive: true });
    window.addEventListener('pointerdown', handlePointerDown, { passive: true });
    window.addEventListener('pointerup', handlePointerUp, { passive: true });
    document.addEventListener('mouseenter', handlePointerEnter);
    document.addEventListener('mouseleave', handlePointerLeave);
    document.addEventListener('mouseover', handleMouseOver, { passive: true });
    document.addEventListener('mouseout', handleMouseOut, { passive: true });

    return () => {
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerdown', handlePointerDown);
      window.removeEventListener('pointerup', handlePointerUp);
      document.removeEventListener('mouseenter', handlePointerEnter);
      document.removeEventListener('mouseleave', handlePointerLeave);
      document.removeEventListener('mouseover', handleMouseOver);
      document.removeEventListener('mouseout', handleMouseOut);

      if (rafId.current) {
        cancelAnimationFrame(rafId.current);
        rafId.current = null;
      }
      isRunning.current = false;
    };
  }, [isEnabled, startAnimationLoop, updateCursorStyles]);

  if (!isEnabled) {
    return null;
  }

  return (
    <div
      aria-hidden="true"
      className="fixed inset-0 pointer-events-none z-[99999] overflow-hidden select-none"
    >
      {/* Trailing Futuristic Aura Ring (Soft Cyan Glow) */}
      <div
        ref={ringRef}
        className="fixed top-0 left-0 w-8 h-8 -mt-4 -ml-4 rounded-full border border-[#5DE2E7]/40 bg-[#5DE2E7]/[0.08] shadow-[0_0_15px_rgba(93,226,231,0.25)] pointer-events-none will-change-transform transition-[border-color,box-shadow] duration-200"
        style={{
          transform: 'translate3d(-200px, -200px, 0)',
          opacity: 0
        }}
      />

      {/* Main Cursor Dot (OTL Neon Cyan Accent #5DE2E7) */}
      <div
        ref={dotRef}
        className="fixed top-0 left-0 w-2.5 h-2.5 -mt-[5px] -ml-[5px] rounded-full bg-[#5DE2E7] shadow-[0_0_10px_#5DE2E7,0_0_18px_rgba(93,226,231,0.5)] pointer-events-none will-change-transform transition-[background-color,box-shadow] duration-150"
        style={{
          transform: 'translate3d(-200px, -200px, 0)',
          opacity: 0
        }}
      />

      {/* Transient Click Ripples (Circular expanding OTL neon rings) */}
      {ripples.map((ripple) => (
        <div
          key={ripple.id}
          className="fixed top-0 left-0 w-11 h-11 -mt-[22px] -ml-[22px] rounded-full border border-[#5DE2E7] pointer-events-none animate-otl-ripple"
          style={{
            transform: `translate3d(${ripple.x}px, ${ripple.y}px, 0)`
          }}
          onAnimationEnd={() => handleRippleEnd(ripple.id)}
        />
      ))}
    </div>
  );
};
