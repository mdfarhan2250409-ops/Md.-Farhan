import React from 'react';
import { RefreshCw } from 'lucide-react';
import type { AvatarAnimationEffect } from '../../types';

export interface AnimatedAvatarProps {
  photoURL?: string | null;
  name?: string;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl';
  effect?: AvatarAnimationEffect;
  showOnlineIndicator?: boolean;
  interactive?: boolean;
  isUploading?: boolean;
  className?: string;
  shape?: 'rounded-2xl' | 'rounded-xl' | 'rounded-full';
  onClick?: () => void;
  title?: string;
  ariaLabel?: string;
  children?: React.ReactNode;
}

export const EFFECT_OPTIONS: {
  id: AvatarAnimationEffect;
  label: string;
  badge: string;
  colorName: string;
  haloColor: string;
  conicGradient: string;
  borderColors: string;
}[] = [
  {
    id: 'cyber-cyan',
    label: 'Cyber Cyan Pulse',
    badge: 'Popular',
    colorName: 'Cyan',
    haloColor: 'rgba(93, 226, 231, 0.45)',
    conicGradient: 'conic-gradient(from 0deg, #5DE2E7, #133E87, #38bdf8, #5DE2E7)',
    borderColors: 'border-[#5DE2E7]'
  },
  {
    id: 'cosmic-aurora',
    label: 'Cosmic Aurora',
    badge: 'Vibrant',
    colorName: 'Magenta / Purple',
    haloColor: 'rgba(236, 72, 153, 0.45)',
    conicGradient: 'conic-gradient(from 0deg, #ec4899, #8b5cf6, #06b6d4, #ec4899)',
    borderColors: 'border-pink-400'
  },
  {
    id: 'golden-vip',
    label: 'Golden VIP Glory',
    badge: 'Prestige',
    colorName: 'Royal Gold',
    haloColor: 'rgba(245, 158, 11, 0.5)',
    conicGradient: 'conic-gradient(from 0deg, #f59e0b, #d97706, #fef08a, #f59e0b)',
    borderColors: 'border-amber-400'
  },
  {
    id: 'emerald-matrix',
    label: 'Emerald Matrix',
    badge: 'Tech',
    colorName: 'Emerald Mint',
    haloColor: 'rgba(16, 185, 129, 0.45)',
    conicGradient: 'conic-gradient(from 0deg, #10b981, #059669, #6ee7b7, #10b981)',
    borderColors: 'border-emerald-400'
  },
  {
    id: 'flame-pulse',
    label: 'Ruby Flame Surge',
    badge: 'Intense',
    colorName: 'Crimson Orange',
    haloColor: 'rgba(249, 115, 22, 0.5)',
    conicGradient: 'conic-gradient(from 0deg, #f97316, #ef4444, #fb923c, #f97316)',
    borderColors: 'border-orange-400'
  },
  {
    id: 'none',
    label: 'Minimalist (No Effect)',
    badge: 'Clean',
    colorName: 'Neutral',
    haloColor: 'rgba(255, 255, 255, 0.1)',
    conicGradient: 'none',
    borderColors: 'border-white/20'
  }
];

export const AnimatedAvatar: React.FC<AnimatedAvatarProps> = ({
  photoURL,
  name = 'User',
  size = 'md',
  effect = 'cyber-cyan',
  showOnlineIndicator = true,
  interactive = true,
  isUploading = false,
  className = '',
  shape = 'rounded-2xl',
  onClick,
  title,
  ariaLabel,
  children
}) => {
  // Size dimensions dictionary
  const sizeConfig = {
    xs: {
      container: 'w-6 h-6',
      text: 'text-[10px]',
      ringOffset: 'p-[1.5px]',
      dot: 'w-2 h-2 -bottom-0.5 -right-0.5'
    },
    sm: {
      container: 'w-8 h-8',
      text: 'text-xs',
      ringOffset: 'p-[2px]',
      dot: 'w-2.5 h-2.5 -bottom-0.5 -right-0.5'
    },
    md: {
      container: 'w-12 h-12',
      text: 'text-base',
      ringOffset: 'p-[2.5px]',
      dot: 'w-3.5 h-3.5 -bottom-1 -right-1'
    },
    lg: {
      container: 'w-14 h-14 sm:w-16 sm:h-16',
      text: 'text-xl sm:text-2xl',
      ringOffset: 'p-[3px]',
      dot: 'w-4 h-4 -bottom-1 -right-1'
    },
    xl: {
      container: 'w-16 h-16 sm:w-20 sm:h-20',
      text: 'text-2xl sm:text-3xl',
      ringOffset: 'p-[3.5px]',
      dot: 'w-4.5 h-4.5 -bottom-1.5 -right-1.5'
    },
    '2xl': {
      container: 'w-24 h-24 sm:w-28 sm:h-28',
      text: 'text-4xl',
      ringOffset: 'p-[4px]',
      dot: 'w-5 h-5 -bottom-2 -right-2'
    }
  }[size];

  const currentEffect = EFFECT_OPTIONS.find(e => e.id === effect) || EFFECT_OPTIONS[0];
  const isAnimated = effect !== 'none';
  const initialLetter = (name?.[0] || 'U').toUpperCase();

  return (
    <div
      onClick={onClick}
      title={title}
      aria-label={ariaLabel || `${name}'s Profile Avatar`}
      className={`relative inline-flex items-center justify-center shrink-0 select-none ${
        onClick ? 'cursor-pointer' : ''
      } ${interactive ? 'group' : ''} ${className}`}
    >
      {/* 1. Ambient Background Glowing Halo (Subtle Breathing Aura) */}
      {isAnimated && (
        <div
          className={`absolute -inset-1 ${shape} opacity-75 blur-md animate-avatar-halo pointer-events-none transition-opacity group-hover:opacity-100`}
          style={{
            background: currentEffect.haloColor,
            boxShadow: `0 0 25px ${currentEffect.haloColor}`
          }}
        />
      )}

      {/* 2. Outer Rotating Conic Gradient Ring */}
      <div
        className={`relative ${sizeConfig.container} ${sizeConfig.ringOffset} ${shape} overflow-hidden flex items-center justify-center transition-transform duration-300 ${
          interactive ? 'group-hover:scale-105 active:scale-95' : ''
        }`}
        style={{
          boxShadow: isAnimated ? `0 0 15px ${currentEffect.haloColor}` : 'none'
        }}
      >
        {isAnimated ? (
          <div
            className={`absolute inset-[-100%] animate-avatar-spin ${
              interactive ? 'group-hover:animate-avatar-spin-fast' : ''
            }`}
            style={{
              background: currentEffect.conicGradient
            }}
          />
        ) : (
          <div className={`absolute inset-0 border border-white/20 ${shape}`} />
        )}

        {/* 3. Inner Avatar Core (with Shimmer Light Sweep & Breathing Image) */}
        <div
          className={`relative w-full h-full ${shape} overflow-hidden bg-slate-950 flex items-center justify-center z-10`}
        >
          {photoURL ? (
            <img
              src={photoURL}
              alt={name}
              className={`w-full h-full object-cover transition-all duration-300 ${
                isAnimated ? 'animate-avatar-breathe' : ''
              } ${interactive ? 'group-hover:brightness-110' : ''}`}
            />
          ) : (
            <div
              className={`w-full h-full bg-gradient-to-tr from-[#0F2854] via-[#133E87] to-cyan-500 flex items-center justify-center text-white font-black tracking-tight ${sizeConfig.text} shadow-inner ${
                isAnimated ? 'animate-avatar-breathe' : ''
              }`}
            >
              {initialLetter}
            </div>
          )}

          {/* 4. Elegant Diagonal Light Shimmer Glint (Sweeps periodically) */}
          {isAnimated && (
            <div
              aria-hidden="true"
              className="absolute inset-0 pointer-events-none overflow-hidden z-20"
            >
              <div
                className="w-full h-full animate-avatar-shimmer"
                style={{
                  background:
                    'linear-gradient(135deg, transparent 25%, rgba(255, 255, 255, 0.65) 50%, transparent 75%)'
                }}
              />
            </div>
          )}

          {/* 5. Hover Darkening / Camera Icon Overlay if custom children passed */}
          {children}

          {/* 6. Uploading Spinner Overlay */}
          {isUploading && (
            <div className="absolute inset-0 bg-black/80 flex items-center justify-center z-30 backdrop-blur-xs">
              <RefreshCw className="w-5 h-5 text-[#5DE2E7] animate-spin drop-shadow-md" />
            </div>
          )}
        </div>
      </div>

      {/* 7. Live Online / Active Presence Radar Ping */}
      {showOnlineIndicator && (
        <div
          className={`absolute ${sizeConfig.dot} rounded-full bg-emerald-500 border-2 border-[#0B1D51] z-20 pointer-events-none shadow-sm flex items-center justify-center`}
          title="Active Member"
        >
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
        </div>
      )}
    </div>
  );
};

export default AnimatedAvatar;
