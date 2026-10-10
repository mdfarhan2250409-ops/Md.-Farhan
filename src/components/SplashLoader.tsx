import React, { useEffect, useState } from 'react';
import { useApp } from '../context/AppContext';
import { motion, AnimatePresence } from 'motion/react';
import { ShieldCheck, Sparkles, Zap } from 'lucide-react';
import { OtlLogo } from './OtlLogo';

export const SplashLoader: React.FC = () => {
  const { splashSettings, isSplashLoaderVisible, setIsSplashLoaderVisible } = useApp();
  const [progress, setProgress] = useState(0);
  const [textIndex, setTextIndex] = useState(0);

  const duration = splashSettings.duration || 2600;

  useEffect(() => {
    if (!isSplashLoaderVisible) return;

    setProgress(0);
    setTextIndex(0);

    // Progress timer
    const intervalTime = 30;
    const totalSteps = duration / intervalTime;
    let step = 0;

    const timer = setInterval(() => {
      step++;
      const currentPct = Math.min(Math.round((step / totalSteps) * 100), 100);
      setProgress(currentPct);

      if (step >= totalSteps) {
        clearInterval(timer);
        setTimeout(() => {
          setIsSplashLoaderVisible(false);
        }, 400);
      }
    }, intervalTime);

    // Cycling text timer
    const textCycle = setInterval(() => {
      setTextIndex(prev => (prev + 1) % (splashSettings.loadingTexts.length || 1));
    }, Math.max(500, duration / (splashSettings.loadingTexts.length || 1)));

    return () => {
      clearInterval(timer);
      clearInterval(textCycle);
    };
  }, [isSplashLoaderVisible, duration, splashSettings.loadingTexts?.length]);

  if (!isSplashLoaderVisible || !splashSettings.enabled) return null;

  const currentText = splashSettings.loadingTexts[textIndex] || 'Initializing...';

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 1 }}
        exit={{ opacity: 0, scale: 1.05 }}
        transition={{ duration: 0.6, ease: 'easeInOut' }}
        className="fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-[#060B1E] text-white overflow-hidden"
      >
        {/* Galaxy Background Effects */}
        <div className="absolute inset-0 bg-gradient-to-tr from-[#0B1D51] via-[#060B1E] to-[#133E87] opacity-80" />
        <div className="absolute w-[500px] h-[500px] rounded-full bg-[#5DE2E7]/10 blur-[120px] animate-pulse" />
        <div className="absolute w-[350px] h-[350px] rounded-full bg-[#133E87]/30 blur-[90px] top-1/4 left-1/4" />

        <div className="relative z-10 flex flex-col items-center max-w-md px-6 text-center">
          {/* Logo with Outer Rotating Ring & Light Sweep */}
          <div className="relative mb-8 flex items-center justify-center">
            <OtlLogo size="xl" animate={true} />
          </div>

          {/* Title */}
          <h2 className="text-xl font-bold text-white tracking-wide mb-1">
            {splashSettings.titleText || 'Online Task Lab'}
          </h2>
          <p className="text-xs text-[#5DE2E7]/80 tracking-widest uppercase mb-6 flex items-center gap-1">
            <Sparkles className="w-3 h-3 text-[#5DE2E7]" />
            Premium Digital Resource Hub
          </p>

          {/* Animated Loading Text */}
          <div className="h-6 mb-4 flex items-center justify-center">
            <AnimatePresence mode="wait">
              <motion.span
                key={currentText}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                transition={{ duration: 0.25 }}
                className="text-xs font-medium text-slate-300 font-mono tracking-wide"
              >
                {currentText}
              </motion.span>
            </AnimatePresence>
          </div>

          {/* Progress Indicator Options */}
          {splashSettings.animationStyle === 'progress-bar' && (
            <div className="w-full bg-slate-900/80 rounded-full h-2 border border-[#5DE2E7]/20 p-0.5 overflow-hidden shadow-inner">
              <motion.div
                className="h-full rounded-full bg-gradient-to-r from-[#133E87] via-[#5DE2E7] to-cyan-300 shadow-[0_0_12px_#5DE2E7]"
                style={{ width: `${progress}%` }}
              />
            </div>
          )}

          {splashSettings.animationStyle === 'circular-ring' && (
            <div className="relative w-12 h-12 my-1">
              <svg className="w-full h-full transform -rotate-90">
                <circle
                  cx="24"
                  cy="24"
                  r="20"
                  className="text-slate-800"
                  strokeWidth="3"
                  stroke="currentColor"
                  fill="transparent"
                />
                <circle
                  cx="24"
                  cy="24"
                  r="20"
                  className="text-[#5DE2E7]"
                  strokeWidth="3"
                  strokeDasharray={125}
                  strokeDashoffset={125 - (125 * progress) / 100}
                  strokeLinecap="round"
                  stroke="currentColor"
                  fill="transparent"
                />
              </svg>
            </div>
          )}

          {splashSettings.animationStyle === 'dots' && (
            <div className="flex space-x-2 my-2">
              <motion.span
                animate={{ scale: [1, 1.4, 1] }}
                transition={{ repeat: Infinity, duration: 0.6 }}
                className="w-2.5 h-2.5 rounded-full bg-[#5DE2E7]"
              />
              <motion.span
                animate={{ scale: [1, 1.4, 1] }}
                transition={{ repeat: Infinity, duration: 0.6, delay: 0.2 }}
                className="w-2.5 h-2.5 rounded-full bg-[#5DE2E7]"
              />
              <motion.span
                animate={{ scale: [1, 1.4, 1] }}
                transition={{ repeat: Infinity, duration: 0.6, delay: 0.4 }}
                className="w-2.5 h-2.5 rounded-full bg-[#5DE2E7]"
              />
            </div>
          )}

          {/* Percentage */}
          <span className="text-[11px] font-mono text-[#5DE2E7] mt-3 font-semibold">
            {progress}%
          </span>
        </div>
      </motion.div>
    </AnimatePresence>
  );
};
