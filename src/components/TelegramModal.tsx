import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { useAuth } from '../context/AuthContext';
import { motion, AnimatePresence } from 'motion/react';
import { X, Download, ShieldCheck, Zap, CheckCircle2 } from 'lucide-react';
import { BrandIcon } from './BrandIcons';

export const TelegramModal: React.FC = () => {
  const {
    telegramDownloadModalResource,
    setTelegramDownloadModalResource,
    siteSettings,
    recordDownload,
    recordTelegramClick,
    showToast
  } = useApp();

  const { requireAuth, recordUserDownload } = useAuth();

  const [countdown, setCountdown] = useState(3);
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    if (!telegramDownloadModalResource) {
      setCountdown(3);
      setIsReady(false);
      return;
    }

    setCountdown(3);
    setIsReady(false);

    const timer = setInterval(() => {
      setCountdown(prev => {
        if (prev <= 1) {
          clearInterval(timer);
          setIsReady(true);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [telegramDownloadModalResource]);

  const resource = telegramDownloadModalResource;

  const handleOpenTelegramPost = () => {
    if (!resource) return;
    if (!requireAuth(undefined, '🔒 Account Required: Please log in or create an account to start your download!')) {
      return;
    }
    recordDownload(resource.id);
    recordTelegramClick(resource.id);
    recordUserDownload(resource.id);
    showToast('Redirecting to Telegram download post...');
    window.open(resource.telegramUrl || resource.downloadUrl, '_blank');
    setTelegramDownloadModalResource(null);
  };

  const handleJoinChannel = () => {
    recordTelegramClick();
    window.open(siteSettings.telegramChannel, '_blank');
  };

  return (
    <AnimatePresence>
      {resource && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={() => setTelegramDownloadModalResource(null)}
          className="fixed inset-0 bg-black/80 backdrop-blur-md"
        />

        {/* Modal Window */}
        <motion.div
          initial={{ opacity: 0, scale: 0.9, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.9, y: 20 }}
          className="relative w-full max-w-md bg-[#0B1D51] border border-[#5DE2E7]/40 glass-panel rounded-3xl p-6 text-white text-center shadow-[0_0_50px_rgba(93,226,231,0.3)] z-10 overflow-hidden"
        >
          {/* Top Close Button */}
          <button
            onClick={() => setTelegramDownloadModalResource(null)}
            className="absolute top-4 right-4 p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white transition"
          >
            <X className="w-5 h-5" />
          </button>

          {/* Animated Telegram Icon Header */}
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center mx-auto mb-4 shadow-[0_0_25px_rgba(93,226,231,0.5)] light-sweep-container">
            <BrandIcon name="telegram" className="w-8 h-8 text-white" />
          </div>

          <h3 className="text-xl font-black text-white mb-1">
            Telegram Download Link
          </h3>
          <p className="text-xs text-slate-300 max-w-xs mx-auto mb-4">
            You are downloading <strong className="text-[#5DE2E7]">{resource.title}</strong> ({resource.fileSize})
          </p>

          {/* Countdown timer / Ready Box */}
          <div className="mb-6 p-4 rounded-2xl bg-slate-950/80 border border-white/10">
            {!isReady ? (
              <div className="flex flex-col items-center">
                <span className="text-3xl font-black text-[#5DE2E7] font-mono animate-pulse mb-1">
                  00:0{countdown}
                </span>
                <span className="text-[11px] text-slate-400 font-medium">
                  Generating secure Telegram download link...
                </span>
              </div>
            ) : (
              <div className="flex items-center justify-center gap-2 text-emerald-400 font-bold text-xs">
                <CheckCircle2 className="w-4 h-4" />
                <span>Link Generated! Click below to open Telegram</span>
              </div>
            )}
          </div>

          {/* Telegram Channel Join Callout */}
          <div className="p-3.5 rounded-xl bg-gradient-to-r from-[#133E87]/50 to-cyan-500/10 border border-[#5DE2E7]/30 mb-6 text-left flex items-center gap-3">
            <Zap className="w-5 h-5 text-[#5DE2E7] shrink-0" />
            <div className="text-[11px] text-slate-300">
              <strong className="text-white block">Join OTL Channel First!</strong>
              Get instant update alerts & exclusive daily requests in Telegram.
            </div>
          </div>

          {/* Action Buttons */}
          <div className="space-y-2.5">
            <button
              onClick={handleOpenTelegramPost}
              disabled={!isReady}
              className={`w-full py-3.5 rounded-2xl font-extrabold text-xs flex items-center justify-center gap-2 transition-all ${
                isReady
                  ? 'bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white shadow-[0_0_25px_rgba(93,226,231,0.6)] cursor-pointer'
                  : 'bg-slate-800 text-slate-500 cursor-not-allowed border border-white/10'
              }`}
            >
              <Download className="w-4 h-4" />
              <span>{isReady ? 'Open Telegram Post to Download' : `Please wait ${countdown}s...`}</span>
            </button>

            <button
              onClick={handleJoinChannel}
              className="w-full py-3 rounded-2xl bg-slate-900/80 hover:bg-slate-800 text-slate-200 border border-white/15 text-xs font-bold flex items-center justify-center gap-2 transition"
            >
              <BrandIcon name="telegram" className="w-3.5 h-3.5 text-[#5DE2E7]" />
              <span>Join Main OTL Telegram Channel</span>
            </button>
          </div>

          <div className="mt-4 text-[10px] text-slate-400 flex items-center justify-center gap-1">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
            <span>Files hosted securely via Telegram Servers</span>
          </div>
        </motion.div>
      </div>
      )}
    </AnimatePresence>
  );
};
