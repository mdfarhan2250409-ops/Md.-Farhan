import React from 'react';
import { motion } from 'motion/react';

interface OtlLogoProps {
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl' | number;
  animate?: boolean;
  className?: string;
  onClick?: () => void;
}

export const OtlLogo: React.FC<OtlLogoProps> = ({
  size = 'md',
  animate = true,
  className = '',
  onClick
}) => {
  let dim = 48;
  if (typeof size === 'number') dim = size;
  else if (size === 'xs') dim = 28;
  else if (size === 'sm') dim = 38;
  else if (size === 'md') dim = 48;
  else if (size === 'lg') dim = 96;
  else if (size === 'xl') dim = 120;

  return (
    <div
      onClick={onClick}
      className={`relative inline-flex items-center justify-center select-none ${onClick ? 'cursor-pointer' : ''} ${className}`}
      style={{ width: dim, height: dim }}
    >
      {/* Outer Neon Glow Aura Animation */}
      {animate && (
        <motion.div
          animate={{
            scale: [1, 1.12, 1],
            opacity: [0.4, 0.8, 0.4],
          }}
          transition={{
            duration: 2.8,
            repeat: Infinity,
            ease: 'easeInOut',
          }}
          className="absolute inset-0 rounded-full bg-[#5DE2E7] blur-md pointer-events-none"
        />
      )}

      {/* Main Logo Container */}
      <motion.div
        whileHover={animate ? { scale: 1.08, rotate: 3 } : {}}
        whileTap={animate ? { scale: 0.95 } : {}}
        transition={{ type: 'spring', stiffness: 350, damping: 18 }}
        className="relative z-10 w-full h-full flex items-center justify-center"
      >
        <svg
          viewBox="0 0 200 200"
          className="w-full h-full drop-shadow-[0_0_15px_rgba(93,226,231,0.65)]"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <defs>
            {/* Background Gradient */}
            <radialGradient id="otlBgGrad" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#0B1D51" />
              <stop offset="70%" stopColor="#050B1E" />
              <stop offset="100%" stopColor="#020612" />
            </radialGradient>

            {/* Cyan Border Gradient */}
            <linearGradient id="otlBorderGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#00F0FF" />
              <stop offset="50%" stopColor="#5DE2E7" />
              <stop offset="100%" stopColor="#0077FE" />
            </linearGradient>

            {/* OTL Text Fill Gradient */}
            <linearGradient id="otlTextGrad" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#70F3FF" />
              <stop offset="50%" stopColor="#00D2FF" />
              <stop offset="100%" stopColor="#0088FF" />
            </linearGradient>

            {/* Neon Glow Filter */}
            <filter id="otlGlowFilter" x="-30%" y="-30%" width="160%" height="160%">
              <feGaussianBlur stdDeviation="5" result="blur" />
              <feComposite in="SourceGraphic" in2="blur" operator="over" />
            </filter>
          </defs>

          {/* Outer Pulsing Border Circle */}
          <circle
            cx="100"
            cy="100"
            r="92"
            fill="url(#otlBgGrad)"
            stroke="url(#otlBorderGrad)"
            strokeWidth="7"
          />

          {/* Inner Accent Dashed Ring */}
          <circle
            cx="100"
            cy="100"
            r="80"
            stroke="#5DE2E7"
            strokeWidth="1.8"
            strokeOpacity="0.55"
            strokeDasharray="6 3"
          />

          {/* Core Fine Line */}
          <circle
            cx="100"
            cy="100"
            r="74"
            stroke="#00D2FF"
            strokeWidth="1"
            strokeOpacity="0.35"
          />

          {/* Animated Orbiting Neon Particle Ring */}
          {animate && (
            <motion.circle
              cx="100"
              cy="100"
              r="86"
              stroke="#00F0FF"
              strokeWidth="3.5"
              strokeDasharray="25 110"
              strokeLinecap="round"
              animate={{ rotate: 360 }}
              transition={{ duration: 5, repeat: Infinity, ease: 'linear' }}
              style={{ transformOrigin: '100px 100px' }}
            />
          )}

          {/* OTL Bold Official Text */}
          <text
            x="100"
            y="118"
            fontFamily="system-ui, -apple-system, sans-serif"
            fontSize="54"
            fontWeight="900"
            fill="url(#otlTextGrad)"
            textAnchor="middle"
            letterSpacing="2"
            filter="url(#otlGlowFilter)"
          >
            OTL
          </text>
        </svg>
      </motion.div>
    </div>
  );
};
