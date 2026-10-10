import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useAuth } from '../context/AuthContext';
import { useApp } from '../context/AppContext';
import { OtlLogo } from './OtlLogo';
import {
  Mail,
  ShieldCheck,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  ArrowLeft,
  Home,
  HelpCircle,
  ExternalLink,
  Lock,
  Sparkles,
  Inbox,
  AlertTriangle
} from 'lucide-react';

export const VerifyEmailPage: React.FC = () => {
  const {
    currentUser,
    firebaseUser,
    isAuthenticated,
    pendingVerificationEmail,
    resendFirebaseVerificationEmail,
    checkAndRefreshEmailVerification,
    logout,
    setIsAuthModalOpen
  } = useAuth();

  const { setSelectedCategory, showToast } = useApp();

  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [resendCooldown, setResendCooldown] = useState(60);
  const [canResend, setCanResend] = useState(false);

  const displayEmail =
    currentUser?.email ||
    firebaseUser?.email ||
    pendingVerificationEmail ||
    'your registered email address';

  const isAlreadyVerified = !!(
    currentUser?.emailVerified ||
    firebaseUser?.emailVerified ||
    currentUser?.provider === 'google'
  );

  // 60-second countdown for resend button
  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (!canResend) {
      timer = setInterval(() => {
        setResendCooldown(prev => {
          if (prev <= 1) {
            clearInterval(timer);
            setCanResend(true);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [canResend]);

  // Check verification status strictly via Firebase Auth reload()
  const handleCheckStatus = async () => {
    setIsLoading(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    const result = await checkAndRefreshEmailVerification();
    setIsLoading(false);

    if (result.success && result.verified) {
      setSuccessMessage('🎉 Verification confirmed! Your email is verified.');
      showToast('Your account is now fully verified!');
      setTimeout(() => {
        setSelectedCategory('all');
        window.history.pushState({}, '', '/');
      }, 1500);
    } else if (result.success && !result.verified) {
      setErrorMessage(
        'Your email is not verified yet. Please open the verification link sent to your inbox or Spam/Junk folder, and then click this button again.'
      );
    } else {
      setErrorMessage(
        result.error || 'Verification email could not be delivered. Please check Spam/Junk or try again later.'
      );
    }
  };

  // Resend official Firebase verification email
  const handleResend = async () => {
    if (!canResend || isLoading) return;
    setIsLoading(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    const result = await resendFirebaseVerificationEmail(displayEmail);
    setIsLoading(false);

    if (result.success) {
      setSuccessMessage(
        `A fresh verification link has been dispatched to ${displayEmail} by Firebase. Please check your inbox and Spam folder.`
      );
      setCanResend(false);
      setResendCooldown(60);
      showToast('Verification email resent successfully!');
    } else {
      setErrorMessage(
        result.error || 'Verification email could not be delivered. Please check Spam/Junk or try again later.'
      );
    }
  };

  const handleReturnHome = () => {
    setSelectedCategory('all');
    window.history.pushState({}, '', '/');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div className="min-h-[85vh] py-12 px-4 sm:px-6 lg:px-8 flex items-center justify-center relative">
      {/* Background Decorative Lighting */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-[#133E87]/30 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-10 right-1/4 w-72 h-72 bg-[#5DE2E7]/10 rounded-full blur-3xl pointer-events-none" />

      <div className="w-full max-w-xl relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="rounded-3xl bg-[#0A1128]/95 border border-[#5DE2E7]/30 shadow-[0_0_50px_rgba(19,62,135,0.45)] backdrop-blur-xl overflow-hidden text-white"
        >
          {/* Header Banner */}
          <div className="p-6 sm:p-8 bg-gradient-to-b from-[#133E87]/40 via-[#0B1D51]/30 to-transparent border-b border-white/10 text-center relative">
            <div className="inline-block mb-3">
              <OtlLogo size="md" />
            </div>

            {isAlreadyVerified ? (
              <>
                <div className="mx-auto w-16 h-16 rounded-2xl bg-emerald-500/20 border border-emerald-500/50 flex items-center justify-center text-emerald-400 shadow-[0_0_25px_rgba(16,185,129,0.3)] mb-4">
                  <CheckCircle2 className="w-8 h-8" />
                </div>
                <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
                  Email Already Verified
                </h1>
                <p className="text-xs text-slate-300 mt-2 max-w-md mx-auto">
                  Your account (<span className="text-[#5DE2E7] font-semibold">{displayEmail}</span>) has been verified with Firebase Authentication.
                </p>
              </>
            ) : (
              <>
                <div className="mx-auto w-16 h-16 rounded-2xl bg-cyan-500/20 border border-[#5DE2E7]/50 flex items-center justify-center text-[#5DE2E7] shadow-[0_0_30px_rgba(93,226,231,0.35)] mb-4 relative">
                  <Mail className="w-8 h-8 animate-pulse" />
                  <div className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-cyan-400 text-slate-950 flex items-center justify-center text-[10px] font-black">
                    ✓
                  </div>
                </div>
                <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
                  Verify Your Email Address
                </h1>
                <p className="text-xs text-slate-300 mt-2 max-w-md mx-auto">
                  We have dispatched an official Firebase verification link to your registered email:
                </p>
                <div className="mt-2 py-1.5 px-4 rounded-xl bg-slate-950/80 border border-white/10 text-[#5DE2E7] font-mono font-bold text-xs inline-block max-w-full break-all shadow-inner">
                  {displayEmail}
                </div>
              </>
            )}
          </div>

          <div className="p-6 sm:p-8 space-y-6">
            {/* Feedback Notifications */}
            <AnimatePresence>
              {errorMessage && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="p-4 rounded-2xl bg-rose-500/20 border border-rose-500/40 text-rose-300 text-xs flex items-start gap-3"
                >
                  <AlertCircle className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <p className="font-bold">Verification Notice</p>
                    <p className="mt-0.5 text-rose-200/90 leading-relaxed">{errorMessage}</p>
                  </div>
                </motion.div>
              )}

              {successMessage && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="p-4 rounded-2xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 text-xs flex items-start gap-3"
                >
                  <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <p className="font-bold">Success</p>
                    <p className="mt-0.5 text-emerald-200/90 leading-relaxed">{successMessage}</p>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {isAlreadyVerified ? (
              <div className="space-y-4">
                <button
                  type="button"
                  onClick={handleReturnHome}
                  className="w-full py-3.5 rounded-xl bg-gradient-to-r from-[#133E87] via-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-extrabold text-xs flex items-center justify-center gap-2 shadow-[0_0_25px_rgba(93,226,231,0.35)] transition cursor-pointer"
                >
                  <Home className="w-4 h-4" />
                  <span>Return to Homepage & Explore Downloads</span>
                </button>
              </div>
            ) : (
              <>
                {/* 3-Step Verification Guide Card */}
                <div className="p-4 sm:p-5 rounded-2xl bg-slate-950/60 border border-white/10 space-y-3">
                  <div className="flex items-center gap-2 text-[#5DE2E7] font-bold text-xs">
                    <ShieldCheck className="w-4 h-4" />
                    <span>How to activate your account:</span>
                  </div>

                  <div className="grid grid-cols-1 gap-2.5 text-xs text-slate-300">
                    <div className="flex items-start gap-3 p-2.5 rounded-xl bg-white/5">
                      <div className="w-5 h-5 rounded-full bg-cyan-500/20 text-[#5DE2E7] font-bold flex items-center justify-center text-[11px] shrink-0">
                        1
                      </div>
                      <div>
                        <strong className="text-white">Check your Inbox</strong>
                        <p className="text-[11px] text-slate-400 mt-0.5">
                          Open the email with sender containing <span className="text-slate-200">Firebase</span> or <span className="text-slate-200">Online Task Lab</span>.
                        </p>
                      </div>
                    </div>

                    <div className="flex items-start gap-3 p-2.5 rounded-xl bg-white/5">
                      <div className="w-5 h-5 rounded-full bg-cyan-500/20 text-[#5DE2E7] font-bold flex items-center justify-center text-[11px] shrink-0">
                        2
                      </div>
                      <div>
                        <strong className="text-white">Check Spam / Junk Folder</strong>
                        <p className="text-[11px] text-slate-400 mt-0.5">
                          Automated email verification messages may occasionally land in your Spam or Promotional tabs.
                        </p>
                      </div>
                    </div>

                    <div className="flex items-start gap-3 p-2.5 rounded-xl bg-white/5">
                      <div className="w-5 h-5 rounded-full bg-cyan-500/20 text-[#5DE2E7] font-bold flex items-center justify-center text-[11px] shrink-0">
                        3
                      </div>
                      <div>
                        <strong className="text-white">Click the Link & Refresh</strong>
                        <p className="text-[11px] text-slate-400 mt-0.5">
                          Click the official link in your email, then click <span className="text-cyan-300 font-semibold">"Check Verification Status"</span> below.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Primary Action Buttons */}
                <div className="space-y-3 pt-2">
                  <button
                    type="button"
                    onClick={handleCheckStatus}
                    disabled={isLoading}
                    className="w-full py-3.5 rounded-xl bg-gradient-to-r from-[#133E87] via-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-extrabold text-xs flex items-center justify-center gap-2.5 shadow-[0_0_30px_rgba(93,226,231,0.4)] transition disabled:opacity-50 cursor-pointer"
                  >
                    <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
                    <span>{isLoading ? 'Checking Firebase Server...' : 'Check Verification Status'}</span>
                  </button>

                  <div className="flex flex-col sm:flex-row items-center gap-2.5 pt-1">
                    <button
                      type="button"
                      onClick={handleResend}
                      disabled={!canResend || isLoading}
                      className={`w-full sm:flex-1 py-2.5 px-4 rounded-xl border text-xs font-bold flex items-center justify-center gap-2 transition ${
                        canResend && !isLoading
                          ? 'bg-slate-900/80 hover:bg-slate-800 border-[#5DE2E7]/40 text-[#5DE2E7] shadow-md cursor-pointer'
                          : 'bg-slate-950/50 border-white/10 text-slate-500 cursor-not-allowed'
                      }`}
                    >
                      <Mail className="w-3.5 h-3.5" />
                      <span>
                        {canResend ? 'Resend Verification Email' : `Resend in ${resendCooldown}s`}
                      </span>
                    </button>

                    <button
                      type="button"
                      onClick={handleReturnHome}
                      className="w-full sm:flex-1 py-2.5 px-4 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-slate-300 hover:text-white text-xs font-bold flex items-center justify-center gap-2 transition cursor-pointer"
                    >
                      <Home className="w-3.5 h-3.5" />
                      <span>Back to Home</span>
                    </button>
                  </div>
                </div>

                {/* Account Switcher Footer */}
                <div className="pt-4 border-t border-white/10 flex items-center justify-between text-xs text-slate-400">
                  <span>Need to use a different account?</span>
                  <button
                    type="button"
                    onClick={async () => {
                      await logout();
                      setIsAuthModalOpen(true, 'login');
                    }}
                    className="text-[#5DE2E7] hover:underline font-bold transition cursor-pointer"
                  >
                    Sign in with another email
                  </button>
                </div>
              </>
            )}
          </div>
        </motion.div>
      </div>
    </div>
  );
};
