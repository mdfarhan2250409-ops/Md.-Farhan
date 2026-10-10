import React, { useState, useEffect, useRef } from 'react';
import { useApp } from '../context/AppContext';
import { motion, AnimatePresence } from 'motion/react';
import { FloatingButton } from '../types';
import { BrandIcon } from './BrandIcons';
import { initialFloatingButtonsSettings } from '../data/initialData';
import { X, MessageCircle, ChevronUp, Headphones, Headset, LifeBuoy } from 'lucide-react';

export const FloatingTelegramButton: React.FC = () => {
  const { floatingButtonsSettings, siteSettings, recordTelegramClick, isAdminOpen } = useApp();
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Close when clicking anywhere outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen]);

  if (isAdminOpen) {
    return null;
  }

  const effectiveSettings = floatingButtonsSettings || initialFloatingButtonsSettings;

  // Get active enabled buttons
  let activeButtons = (effectiveSettings?.buttons || [])
    .filter(b => b.enabled)
    .sort((a, b) => (a.order || 0) - (b.order || 0));

  // If no custom buttons exist yet, fallback to single default site channel or initial buttons
  if (activeButtons.length === 0) {
    if (siteSettings.telegramChannel) {
      activeButtons = [
        {
          id: 'default-tg',
          title: 'Join Telegram',
          url: siteSettings.telegramChannel,
          icon: 'telegram',
          enabled: true,
          color: 'cyan',
          badgeText: 'Live',
          order: 1
        }
      ];
    } else {
      activeButtons = (initialFloatingButtonsSettings.buttons || []).filter(b => b.enabled);
    }
  }

  if (activeButtons.length === 0) {
    activeButtons = [
      {
        id: 'default-tg',
        title: 'Support & Community',
        url: 'https://t.me/',
        icon: 'telegram',
        enabled: true,
        color: 'cyan',
        badgeText: 'Live',
        order: 1
      }
    ];
  }

  const getColorClasses = (color: string) => {
    switch (color) {
      case 'emerald':
        return 'from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 shadow-[0_0_20px_rgba(16,185,129,0.6)] hover:shadow-[0_0_35px_rgba(16,185,129,0.9)]';
      case 'amber':
        return 'from-amber-500 to-orange-600 hover:from-amber-400 hover:to-orange-500 shadow-[0_0_20px_rgba(245,158,11,0.6)] hover:shadow-[0_0_35px_rgba(245,158,11,0.9)]';
      case 'rose':
        return 'from-rose-500 to-pink-600 hover:from-rose-400 hover:to-pink-500 shadow-[0_0_20px_rgba(244,63,94,0.6)] hover:shadow-[0_0_35px_rgba(244,63,94,0.9)]';
      case 'indigo':
        return 'from-indigo-500 to-purple-600 hover:from-indigo-400 hover:to-purple-500 shadow-[0_0_20px_rgba(99,102,241,0.6)] hover:shadow-[0_0_35px_rgba(99,102,241,0.9)]';
      case 'purple':
        return 'from-purple-500 to-pink-600 hover:from-purple-400 hover:to-purple-500 shadow-[0_0_20px_rgba(168,85,247,0.6)] hover:shadow-[0_0_35px_rgba(168,85,247,0.9)]';
      case 'cyan':
      default:
        return 'from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 shadow-[0_0_20px_rgba(93,226,231,0.6)] hover:shadow-[0_0_35px_rgba(93,226,231,0.9)]';
    }
  };

  const handleButtonClick = (btn: FloatingButton) => {
    recordTelegramClick();
    window.open(btn.url, '_blank');
    setIsOpen(false);
  };

  const isLeft = effectiveSettings?.position === 'bottom-left';
  const posClass = isLeft
    ? 'bottom-[140px] md:bottom-[86px] left-4 md:left-6 items-start'
    : 'bottom-[140px] md:bottom-[86px] right-4 md:right-6 items-end';

  // Display buttons list (reverse so first appears near the trigger button when opening upwards)
  const displayButtons = [...activeButtons].reverse();

  return (
    <div
      ref={containerRef}
      className={`otl-floating-telegram-btn gap-2.5 ${isLeft ? 'pos-left items-start' : 'items-end'}`}
    >
      {/* Sub-Buttons Animated Expansion */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 15, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 15, scale: 0.9 }}
            transition={{ duration: 0.2 }}
            className="flex flex-col gap-2.5 items-end mb-1"
          >
            {displayButtons.map((btn, index) => (
              <motion.div
                key={btn.id}
                initial={{ scale: 0.5, opacity: 0, y: 10 }}
                animate={{ scale: 1, opacity: 1, y: 0 }}
                exit={{ scale: 0.5, opacity: 0, y: 10 }}
                transition={{ delay: index * 0.05 }}
              >
                <button
                  onClick={() => handleButtonClick(btn)}
                  className={`group relative flex items-center gap-2 p-3 sm:px-4 sm:py-2.5 rounded-full bg-gradient-to-r ${getColorClasses(
                    btn.color || 'cyan'
                  )} text-white font-extrabold text-xs transition-all hover:scale-105 cursor-pointer border border-white/20 shadow-xl`}
                  title={btn.title}
                >
                  {/* Ping Badge if present */}
                  {btn.badgeText && (
                    <span className="absolute -top-1 -right-1 flex h-3.5 w-3.5">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75" />
                      <span className="relative inline-flex rounded-full h-3.5 w-3.5 bg-amber-400 border border-slate-950" />
                    </span>
                  )}

                  <BrandIcon
                    name={btn.icon}
                    className="w-4 h-4 sm:w-5 sm:h-5 text-white group-hover:scale-110 transition-transform shrink-0"
                  />
                  <span className="inline-block tracking-wide whitespace-nowrap">{btn.title}</span>

                  {btn.badgeText && (
                    <span className="ml-1 px-1.5 py-0.5 bg-slate-950/60 rounded-full text-[9px] text-amber-300 border border-amber-400/40 uppercase tracking-wider font-black whitespace-nowrap">
                      {btn.badgeText}
                    </span>
                  )}
                </button>
              </motion.div>
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main Single Floating Toggle Button with Hover Expand Support Text */}
      <motion.button
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        onClick={() => setIsOpen(!isOpen)}
        className="relative group flex items-center p-1.5 rounded-full bg-gradient-to-r from-[#0B1D51] via-[#133E87] to-cyan-700/90 text-white border border-[#5DE2E7]/60 shadow-[0_0_25px_rgba(93,226,231,0.5),inset_0_0_12px_rgba(93,226,231,0.2)] hover:border-[#5DE2E7] hover:shadow-[0_0_35px_rgba(93,226,231,0.75),inset_0_0_16px_rgba(93,226,231,0.3)] active:scale-95 transition-all duration-300 ease-out cursor-pointer backdrop-blur-xl select-none"
        aria-label="Toggle Telegram and Support Menu"
      >
        {/* Pulse Dot Badge on Main Button when collapsed */}
        {!isOpen && (
          <span className="absolute -top-1 -right-1 flex h-4 w-4 sm:h-4.5 sm:w-4.5 pointer-events-none z-20">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-80" />
            <span className="relative inline-flex rounded-full h-4 w-4 sm:h-4.5 sm:w-4.5 bg-gradient-to-br from-amber-400 to-orange-500 border-2 border-slate-950 text-[9px] sm:text-[10px] font-black text-slate-950 items-center justify-center shadow-[0_0_10px_rgba(245,158,11,0.8)]">
              {activeButtons.length}
            </span>
          </span>
        )}

        {/* Ambient Pulsing Aura Layer */}
        <span className="absolute inset-0 rounded-full bg-cyan-400/20 blur-md animate-pulse pointer-events-none" />

        {/* Prominent Circular Icon Container (Exact match to bottom button size and animation) */}
        <div className="relative w-11 h-11 sm:w-12 sm:h-12 rounded-full bg-slate-950/80 border border-[#5DE2E7]/40 flex items-center justify-center shrink-0 shadow-[0_0_15px_rgba(93,226,231,0.35)] group-hover:scale-105 group-hover:border-[#5DE2E7] transition-all duration-300 overflow-hidden">
          {/* Animated Tech Glow Ring */}
          <div
            className="absolute inset-0 rounded-full border border-cyan-400/25 animate-spin pointer-events-none"
            style={{ animationDuration: '9s' }}
          />

          {/* Dynamic Animated Headphones Icon with Pulse Rhythm */}
          <motion.div
            animate={{
              rotate: isOpen ? 90 : 0,
              scale: isOpen ? 1.05 : [1, 1.08, 1]
            }}
            transition={{
              rotate: { duration: 0.25 },
              scale: isOpen ? { duration: 0.2 } : { repeat: Infinity, duration: 2.4, ease: 'easeInOut' }
            }}
            className="flex items-center justify-center z-10"
          >
            {isOpen ? (
              <X className="w-5 h-5 sm:w-6 sm:h-6 text-cyan-200" />
            ) : (
              <Headphones className="w-5 h-5 sm:w-6 sm:h-6 text-[#5DE2E7] drop-shadow-[0_0_10px_rgba(93,226,231,0.85)]" />
            )}
          </motion.div>

          {/* Live Online Dot */}
          {!isOpen && (
            <span className="absolute bottom-1 right-1 w-2 h-2 rounded-full bg-emerald-400 border border-[#060B1E] shadow-[0_0_6px_#34d399] animate-pulse" />
          )}
        </div>

        {/* Smooth Hover Expand Text */}
        <div
          className={`overflow-hidden whitespace-nowrap transition-all duration-300 ease-out flex items-center gap-2 pointer-events-none ${
            isOpen
              ? 'max-w-[170px] opacity-100 pl-3 pr-3.5'
              : 'max-w-0 opacity-0 group-hover:max-w-[170px] group-hover:opacity-100 group-hover:pl-3 group-hover:pr-3.5 group-focus-visible:max-w-[170px] group-focus-visible:opacity-100 group-focus-visible:pl-3 group-focus-visible:pr-3.5'
          }`}
        >
          <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse shrink-0 shadow-[0_0_8px_#5DE2E7]" />
          <span className="tracking-wide font-black text-xs sm:text-sm text-transparent bg-clip-text bg-gradient-to-r from-white via-cyan-100 to-cyan-300 drop-shadow-[0_0_8px_rgba(93,226,231,0.5)]">
            {isOpen ? 'Close Menu' : 'Support'}
          </span>
          {!isOpen && (
            <ChevronUp className="w-4 h-4 text-cyan-200 group-hover:-translate-y-0.5 transition-transform shrink-0" />
          )}
        </div>
      </motion.button>
    </div>
  );
};

