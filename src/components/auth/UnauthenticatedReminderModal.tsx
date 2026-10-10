import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useAuth } from '../../context/AuthContext';
import { useApp } from '../../context/AppContext';
import { OtlLogo } from '../OtlLogo';
import {
  Sparkles,
  Lock,
  ArrowRight,
  X,
  ShieldCheck,
  DownloadCloud,
  Zap
} from 'lucide-react';

export const UnauthenticatedReminderModal: React.FC = () => {
  const {
    currentUser,
    isAuthenticated,
    isLoading,
    isAuthModalOpen,
    setIsAuthModalOpen
  } = useAuth();

  const { isAdminOpen } = useApp();

  const [isOpen, setIsOpen] = useState(false);
  const [secondsLeft, setSecondsLeft] = useState(60);

  // Determine if user is currently inside Admin panel or has admin privileges
  const isAdminEnvironment = Boolean(
    isAdminOpen ||
    currentUser?.role === 'admin' ||
    currentUser?.role === 'superadmin' ||
    (typeof window !== 'undefined' && window.location.pathname.startsWith('/admin'))
  );

  useEffect(() => {
    // If user is authenticated, loading, auth modal open, or inside admin panel: DO NOT PROMPT
    if (isAuthenticated || currentUser || isLoading || isAdminEnvironment) {
      setIsOpen(false);
      return;
    }

    // Trigger reminder for guest visitors exploring the website/dashboard
    const triggerReminder = () => {
      if (!isAuthModalOpen && !isAdminEnvironment) {
        setIsOpen(true);
      }
    };

    // First reminder after 45s, then every 60s
    const firstTimer = setTimeout(() => {
      triggerReminder();
    }, 45000);

    const recurringInterval = setInterval(() => {
      triggerReminder();
    }, 60000);

    return () => {
      clearTimeout(firstTimer);
      clearInterval(recurringInterval);
    };
  }, [isAuthenticated, currentUser, isLoading, isAuthModalOpen, isAdminEnvironment]);

  const handleCreateAccount = () => {
    setIsOpen(false);
    setIsAuthModalOpen(true, 'register');
  };

  const handleSignIn = () => {
    setIsOpen(false);
    setIsAuthModalOpen(true, 'login');
  };

  const handleDismiss = () => {
    setIsOpen(false);
  };

  const showReminder = isOpen && !isAuthenticated && !isAuthModalOpen && !isAdminEnvironment;

  return (
    <AnimatePresence>
      {showReminder && (
        <div className="fixed bottom-24 sm:bottom-6 left-4 sm:left-6 z-50 max-w-md w-[92vw] sm:w-[420px]">
          <motion.div
            initial={{ opacity: 0, y: 50, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            className="relative overflow-hidden rounded-3xl bg-[#0B1D51]/95 border-2 border-[#5DE2E7]/60 glass-panel text-white shadow-[0_0_50px_rgba(93,226,231,0.4)] p-5 backdrop-blur-xl"
          >
            {/* Top glowing strip */}
            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-cyan-400 via-[#5DE2E7] to-blue-500 animate-pulse" />

            {/* Close button */}
            <button
              onClick={handleDismiss}
              className="absolute top-3.5 right-3.5 p-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white transition"
              title="Remind in 1 minute"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="flex items-start gap-3.5">
              <div className="p-2.5 rounded-2xl bg-cyan-500/20 border border-[#5DE2E7]/40 text-[#5DE2E7] shrink-0 shadow-[0_0_15px_rgba(93,226,231,0.3)]">
                <Lock className="w-6 h-6 animate-bounce" />
              </div>

              <div className="space-y-1.5 pr-4">
                <div className="flex items-center gap-1.5">
                  <span className="text-[10px] uppercase font-black px-2 py-0.5 rounded-md bg-[#5DE2E7] text-slate-950 tracking-wider">
                    Account Required
                  </span>
                  <span className="text-[10px] text-cyan-300 font-semibold flex items-center gap-1">
                    <Sparkles className="w-3 h-3 text-amber-400" /> Free Access
                  </span>
                </div>

                <h4 className="text-sm font-black text-white leading-tight">
                  Unlock Unlimited Mod APKs & AI Prompts!
                </h4>

                <p className="text-xs text-slate-300 leading-relaxed">
                  You are browsing as a guest. Create a free account or sign in to enable all downloads, telegram drops & verified tools.
                </p>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="grid grid-cols-2 gap-2 mt-4 pt-2 border-t border-white/10">
              <button
                onClick={handleCreateAccount}
                className="py-2.5 px-3 rounded-xl bg-gradient-to-r from-[#133E87] via-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-extrabold text-xs flex items-center justify-center gap-1.5 shadow-md transition"
              >
                <span>Create Free Account</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>

              <button
                onClick={handleSignIn}
                className="py-2.5 px-3 rounded-xl bg-white/10 hover:bg-white/20 text-white font-bold text-xs flex items-center justify-center gap-1.5 border border-white/10 transition"
              >
                <span>Sign In</span>
              </button>
            </div>

            <div className="text-center mt-2.5">
              <button
                onClick={handleDismiss}
                className="text-[10px] text-slate-400 hover:text-slate-200 underline"
              >
                Remind me in 1 minute
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
