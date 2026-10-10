import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useAuth } from '../../context/AuthContext';
import { OtlLogo } from '../OtlLogo';
import {
  X,
  Lock,
  Mail,
  User,
  Eye,
  EyeOff,
  CheckCircle2,
  AlertCircle,
  ArrowRight,
  Sparkles,
  RefreshCw,
  ShieldCheck,
  ArrowLeft,
  KeyRound,
  Check
} from 'lucide-react';
import { PasswordStrengthIndicator } from './PasswordStrengthIndicator';
import { validateRealEmail } from '../../lib/emailValidator';

export const AuthModal: React.FC = () => {
  const {
    isAuthModalOpen,
    setIsAuthModalOpen,
    authModalMode,
    setAuthModalMode,
    unauthenticatedAlertMessage,
    loginWithEmailOrUsername,
    registerWithEmail,
    verifyRegistrationOtp,
    resendRegistrationOtp,
    loginWithGoogle,
    loginWithGithub,
    requestPasswordReset,
    verifyPasswordResetOtp,
    resendPasswordResetOtp,
    completePasswordReset,
    pendingVerificationEmail,
    currentUser
  } = useAuth();

  // Form states for login
  const [identifier, setIdentifier] = useState(''); // Email or username
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  // Register fields
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // Verification 6-digit OTP fields
  const [registrationOtp, setRegistrationOtp] = useState('');
  const [resetOtpInput, setResetOtpInput] = useState('');

  // Forgot password & reset fields
  const [resetIdentifier, setResetIdentifier] = useState('');
  const [resetTargetEmail, setResetTargetEmail] = useState('');

  // Reset password (new password entry) fields
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmNewPassword, setShowConfirmNewPassword] = useState(false);

  // Email verification target and timer state
  const [targetVerificationEmail, setTargetVerificationEmail] = useState('');
  const [resendTimer, setResendTimer] = useState(60);
  const [canResend, setCanResend] = useState(false);

  // UI state
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Sync target verification email with pending auth states or currentUser email
  useEffect(() => {
    const activeTarget = pendingVerificationEmail || currentUser?.email || email || '';
    if (activeTarget) {
      setTargetVerificationEmail(activeTarget);
    }
  }, [pendingVerificationEmail, currentUser, email, authModalMode]);

  // Countdown timer for email OTP resend
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (authModalMode === 'verify-email' || authModalMode === 'verify-reset-otp') {
      setResendTimer(60);
      setCanResend(false);
      interval = setInterval(() => {
        setResendTimer(prev => {
          if (prev <= 1) {
            clearInterval(interval);
            setCanResend(true);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [authModalMode]);

  // Reset errors and inputs when mode changes
  useEffect(() => {
    setErrorMessage(null);
    setSuccessMessage(null);
  }, [authModalMode]);

  // Login handler
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!identifier.trim() || !password) {
      setErrorMessage('Please enter both your email/username and password.');
      return;
    }
    setIsLoading(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    const res = await loginWithEmailOrUsername(identifier, password);
    setIsLoading(false);
    if (!res.success) {
      setErrorMessage(res.error || 'Failed to sign in. Please verify your credentials.');
    }
  };

  // Register handler (dispatches 6-digit OTP to user inbox via Brevo SMTP)
  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);

    if (!firstName.trim() || !username.trim() || !email.trim() || !password) {
      setErrorMessage('Please fill in all required fields.');
      return;
    }

    // Username format check
    const usernameRegex = /^[a-zA-Z0-9_.]+$/;
    if (!usernameRegex.test(username.trim()) || username.length < 3 || username.length > 30) {
      setErrorMessage('Username must be 3-30 characters with letters, numbers, underscore, or period (no spaces).');
      return;
    }

    if (password.length < 6) {
      setErrorMessage('Password must be at least 6 characters long.');
      return;
    }

    if (password !== confirmPassword) {
      setErrorMessage('Passwords do not match.');
      return;
    }

    setIsLoading(true);
    const res = await registerWithEmail({
      firstName,
      lastName,
      username,
      email,
      password
    });
    setIsLoading(false);

    if (!res.success) {
      setErrorMessage(res.error || 'Registration failed.');
    } else {
      setSuccessMessage(res.message || `A 6-digit verification code has been dispatched to ${email.trim()}.`);
      setRegistrationOtp('');
    }
  };

  // Verify Registration OTP
  const handleVerifyRegistrationOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);

    if (!registrationOtp.trim() || registrationOtp.trim().length !== 6) {
      setErrorMessage('Please enter the full 6-digit verification code sent to your email.');
      return;
    }

    setIsLoading(true);
    const res = await verifyRegistrationOtp(registrationOtp.trim());
    setIsLoading(false);

    if (!res.success) {
      setErrorMessage(res.error || 'Invalid or expired verification code.');
    } else {
      setSuccessMessage('🎉 Email verified and account registered successfully!');
    }
  };

  // Resend Registration OTP
  const handleResendRegistrationOtp = async () => {
    if (!canResend || isLoading) return;
    setIsLoading(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    const res = await resendRegistrationOtp();
    setIsLoading(false);

    if (res.success) {
      setSuccessMessage(res.message || 'A new verification code has been sent to your email!');
      setResendTimer(60);
      setCanResend(false);
    } else {
      setErrorMessage(res.error || 'Failed to resend verification code.');
    }
  };

  // Google Sign-In
  const handleGoogleSignIn = async () => {
    setIsLoading(true);
    setErrorMessage(null);
    setSuccessMessage(null);
    const res = await loginWithGoogle();
    setIsLoading(false);
    if (!res.success) {
      setErrorMessage(res.error || 'Google sign in failed.');
    }
  };

  // GitHub Sign-In
  const handleGithubSignIn = async () => {
    setIsLoading(true);
    setErrorMessage(null);
    setSuccessMessage(null);
    const res = await loginWithGithub();
    setIsLoading(false);
    if (!res.success) {
      setErrorMessage(res.error || 'GitHub sign in failed.');
    }
  };

  // Request password reset (dispatches 6-digit reset OTP to email)
  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resetIdentifier.trim()) {
      setErrorMessage('Please enter your registered email or username.');
      return;
    }
    setIsLoading(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    const res = await requestPasswordReset(resetIdentifier.trim());
    setIsLoading(false);

    if (res.success) {
      setResetTargetEmail(res.email || resetIdentifier.trim());
      setSuccessMessage(res.message || 'A 6-digit password reset code has been dispatched to your email.');
      setResetOtpInput('');
    } else {
      setErrorMessage(res.error || 'Account not found. Please verify your email or username.');
    }
  };

  // Verify Password Reset OTP
  const handleVerifyResetOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);

    if (!resetOtpInput.trim() || resetOtpInput.trim().length !== 6) {
      setErrorMessage('Please enter the 6-digit password reset code from your email.');
      return;
    }

    setIsLoading(true);
    const res = await verifyPasswordResetOtp(resetOtpInput.trim());
    setIsLoading(false);

    if (!res.success) {
      setErrorMessage(res.error || 'Invalid or expired reset code.');
    } else {
      setSuccessMessage('Code verified! Please choose your new password below.');
    }
  };

  // Resend Password Reset OTP
  const handleResendResetOtp = async () => {
    if (!canResend || isLoading) return;
    setIsLoading(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    const res = await resendPasswordResetOtp();
    setIsLoading(false);

    if (res.success) {
      setSuccessMessage(res.message || 'A fresh reset code has been dispatched to your email.');
      setResendTimer(60);
      setCanResend(false);
    } else {
      setErrorMessage(res.error || 'Failed to resend reset code.');
    }
  };

  // Complete Password Reset with New Password
  const handleCompletePasswordReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);

    if (!newPassword) {
      setErrorMessage('Please enter your new password.');
      return;
    }
    if (newPassword.length < 6) {
      setErrorMessage('Password must be at least 6 characters long.');
      return;
    }
    if (newPassword !== confirmNewPassword) {
      setErrorMessage('Passwords do not match.');
      return;
    }

    setIsLoading(true);
    const res = await completePasswordReset(newPassword, confirmNewPassword);
    setIsLoading(false);

    if (res.success) {
      setSuccessMessage(res.message || '🎉 Password reset successfully! Redirecting to sign in...');
      setNewPassword('');
      setConfirmNewPassword('');
      setResetOtpInput('');
      setResetIdentifier('');
      setTimeout(() => {
        setAuthModalMode('login');
      }, 1600);
    } else {
      setErrorMessage(res.error || 'Failed to reset password. Please try again.');
    }
  };

  return (
    <AnimatePresence>
      {isAuthModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6 overflow-y-auto">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setIsAuthModalOpen(false)}
            className="fixed inset-0 bg-slate-950/80 backdrop-blur-md"
          />

          {/* Modal Card */}
          <motion.div
            initial={{ scale: 0.92, opacity: 0, y: 15 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.92, opacity: 0, y: 15 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="relative w-full max-w-md my-auto rounded-3xl bg-gradient-to-b from-[#0A1128] via-[#060B1E] to-[#040714] border border-cyan-500/20 shadow-[0_0_50px_rgba(19,62,135,0.45)] overflow-hidden text-white z-10"
          >
            {/* Ambient Background Glows */}
            <div className="absolute -top-24 -left-24 w-48 h-48 bg-[#133E87]/40 rounded-full blur-3xl pointer-events-none" />
            <div className="absolute -bottom-24 -right-24 w-48 h-48 bg-[#5DE2E7]/20 rounded-full blur-3xl pointer-events-none" />

            {/* Close Button */}
            <button
              onClick={() => setIsAuthModalOpen(false)}
              className="absolute top-4 right-4 p-2 rounded-full bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white transition z-20 cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="p-6 sm:p-8 relative z-10">
              {/* Logo & Header */}
              <div className="text-center mb-6">
                <div className="inline-block mb-3">
                  <OtlLogo size="md" />
                </div>

                <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight">
                  {authModalMode === 'login' && 'Welcome Back'}
                  {authModalMode === 'register' && 'Create Free Account'}
                  {authModalMode === 'verify-email' && 'Verify Your Email'}
                  {authModalMode === 'forgot-password' && 'Reset Your Password'}
                  {authModalMode === 'verify-reset-otp' && 'Enter Reset Code'}
                  {authModalMode === 'reset-password' && 'Create New Password'}
                </h2>
                <p className="text-xs text-slate-400 mt-1">
                  {authModalMode === 'login' && 'Sign in to access unlimited downloads & premium resources'}
                  {authModalMode === 'register' && 'Join thousands of creators, gamers & digital innovators'}
                  {authModalMode === 'verify-email' && 'Enter the 6-digit code delivered to your email inbox'}
                  {authModalMode === 'forgot-password' && 'Enter your email or username to receive a 6-digit reset code'}
                  {authModalMode === 'verify-reset-otp' && 'Enter the 6-digit reset code delivered to your email inbox'}
                  {authModalMode === 'reset-password' && 'Set a strong new password for your Online Task Lab account'}
                </p>
              </div>

              {/* Mode Switcher Tabs (Only for Login & Register) */}
              {(authModalMode === 'login' || authModalMode === 'register') && (
                <div className="grid grid-cols-2 p-1 rounded-2xl bg-[#060B1E]/80 border border-white/10 mb-5">
                  <button
                    type="button"
                    onClick={() => setAuthModalMode('login')}
                    className={`py-2 text-xs font-bold rounded-xl transition-all cursor-pointer ${
                      authModalMode === 'login'
                        ? 'bg-gradient-to-r from-[#133E87] to-cyan-600 text-white shadow-md'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    Sign In
                  </button>
                  <button
                    type="button"
                    onClick={() => setAuthModalMode('register')}
                    className={`py-2 text-xs font-bold rounded-xl transition-all cursor-pointer ${
                      authModalMode === 'register'
                        ? 'bg-gradient-to-r from-[#133E87] to-cyan-600 text-white shadow-md'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    Create Account
                  </button>
                </div>
              )}

              {/* Unauthenticated Alert Prompt */}
              {unauthenticatedAlertMessage && (
                <div className="mb-4 p-3 rounded-xl bg-cyan-500/10 border border-cyan-500/30 text-cyan-200 text-xs flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-[#5DE2E7] shrink-0" />
                  <span>{unauthenticatedAlertMessage}</span>
                </div>
              )}

              {/* Error & Success Notifications */}
              {errorMessage && (
                <div className="mb-4 p-3 rounded-xl bg-rose-500/20 border border-rose-500/40 text-rose-300 text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
                  <span>{errorMessage}</span>
                </div>
              )}
              {successMessage && (
                <div className="mb-4 p-3 rounded-xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 text-xs flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>{successMessage}</span>
                </div>
              )}

              {/* 1. LOGIN FORM */}
              {authModalMode === 'login' && (
                <form onSubmit={handleLogin} className="space-y-3.5">
                  {/* Google Sign-in Button */}
                  <button
                    type="button"
                    onClick={handleGoogleSignIn}
                    disabled={isLoading}
                    className="w-full py-2.5 px-4 rounded-xl bg-white text-slate-900 font-bold text-xs flex items-center justify-center gap-2.5 hover:bg-slate-100 transition shadow-md disabled:opacity-50 cursor-pointer"
                  >
                    <svg className="w-4 h-4" viewBox="0 0 24 24">
                      <path
                        fill="#4285F4"
                        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                      />
                      <path
                        fill="#34A853"
                        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                      />
                      <path
                        fill="#FBBC05"
                        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                      />
                      <path
                        fill="#EA4335"
                        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                      />
                    </svg>
                    <span>Continue with Google</span>
                  </button>

                  {/* GitHub Sign-in Button */}
                  <button
                    type="button"
                    onClick={handleGithubSignIn}
                    disabled={isLoading}
                    className="w-full py-2.5 px-4 rounded-xl bg-[#24292e] text-white font-bold text-xs flex items-center justify-center gap-2.5 hover:bg-[#2f363d] transition shadow-md border border-white/10 disabled:opacity-50 cursor-pointer"
                  >
                    <svg className="w-4 h-4 fill-white" viewBox="0 0 24 24">
                      <path
                        fillRule="evenodd"
                        clipRule="evenodd"
                        d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.53 1.032 1.53 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z"
                      />
                    </svg>
                    <span>Continue with GitHub</span>
                  </button>

                  <div className="flex items-center my-3">
                    <div className="flex-1 border-t border-white/10" />
                    <span className="px-3 text-[10px] text-slate-400 uppercase tracking-widest font-bold">Or with email/username</span>
                    <div className="flex-1 border-t border-white/10" />
                  </div>

                  {/* Email / Username Input */}
                  <div>
                    <label className="block text-[11px] font-bold text-slate-300 mb-1">Email or Username</label>
                    <div className="relative">
                      <User className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
                      <input
                        type="text"
                        required
                        value={identifier}
                        onChange={e => setIdentifier(e.target.value)}
                        placeholder="e.g. username_99 or yourname@gmail.com"
                        className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-950/70 border border-white/10 focus:border-[#5DE2E7] text-xs text-white placeholder-slate-500 focus:outline-none transition"
                      />
                    </div>
                  </div>

                  {/* Password Input */}
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="block text-[11px] font-bold text-slate-300">Password</label>
                      <button
                        type="button"
                        onClick={() => setAuthModalMode('forgot-password')}
                        className="text-[11px] text-[#5DE2E7] hover:underline font-semibold cursor-pointer"
                      >
                        Forgot Password?
                      </button>
                    </div>
                    <div className="relative">
                      <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
                      <input
                        type={showPassword ? 'text' : 'password'}
                        required
                        value={password}
                        onChange={e => setPassword(e.target.value)}
                        placeholder="Enter your password"
                        className="w-full pl-10 pr-10 py-2.5 rounded-xl bg-slate-950/70 border border-white/10 focus:border-[#5DE2E7] text-xs text-white placeholder-slate-500 focus:outline-none transition"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-3 text-slate-400 hover:text-white cursor-pointer"
                      >
                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  {/* Submit Button */}
                  <button
                    type="submit"
                    disabled={isLoading}
                    className="w-full mt-2 py-3 rounded-xl bg-gradient-to-r from-[#133E87] via-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-extrabold text-xs flex items-center justify-center gap-2 shadow-[0_0_20px_rgba(93,226,231,0.4)] transition disabled:opacity-50 cursor-pointer"
                  >
                    {isLoading ? (
                      <RefreshCw className="w-4 h-4 animate-spin" />
                    ) : (
                      <>
                        <span>Sign In to Account</span>
                        <ArrowRight className="w-4 h-4" />
                      </>
                    )}
                  </button>
                </form>
              )}

              {/* 2. REGISTRATION FORM */}
              {authModalMode === 'register' && (
                <form onSubmit={handleRegister} className="space-y-3">
                  {/* Google Sign-in */}
                  <button
                    type="button"
                    onClick={handleGoogleSignIn}
                    disabled={isLoading}
                    className="w-full py-2.5 px-4 rounded-xl bg-white text-slate-900 font-bold text-xs flex items-center justify-center gap-2.5 hover:bg-slate-100 transition shadow-md disabled:opacity-50 cursor-pointer"
                  >
                    <svg className="w-4 h-4" viewBox="0 0 24 24">
                      <path
                        fill="#4285F4"
                        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                      />
                      <path
                        fill="#34A853"
                        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                      />
                      <path
                        fill="#FBBC05"
                        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                      />
                      <path
                        fill="#EA4335"
                        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                      />
                    </svg>
                    <span>Sign Up with Google</span>
                  </button>

                  {/* GitHub Sign-in */}
                  <button
                    type="button"
                    onClick={handleGithubSignIn}
                    disabled={isLoading}
                    className="w-full py-2.5 px-4 rounded-xl bg-[#24292e] text-white font-bold text-xs flex items-center justify-center gap-2.5 hover:bg-[#2f363d] transition shadow-md border border-white/10 disabled:opacity-50 cursor-pointer"
                  >
                    <svg className="w-4 h-4 fill-white" viewBox="0 0 24 24">
                      <path
                        fillRule="evenodd"
                        clipRule="evenodd"
                        d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.53 1.032 1.53 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z"
                      />
                    </svg>
                    <span>Sign Up with GitHub</span>
                  </button>

                  <div className="flex items-center my-2">
                    <div className="flex-1 border-t border-white/10" />
                    <span className="px-3 text-[10px] text-[#5DE2E7] uppercase tracking-widest font-extrabold flex items-center gap-1">
                      <Sparkles className="w-3 h-3 text-[#5DE2E7]" />
                      Real Gmail Registration
                    </span>
                    <div className="flex-1 border-t border-white/10" />
                  </div>

                  <div className="p-2.5 rounded-xl bg-gradient-to-r from-[#133E87]/40 to-cyan-950/40 border border-[#5DE2E7]/30 text-[11px] text-cyan-200 flex items-center gap-2">
                    <ShieldCheck className="w-4 h-4 text-[#5DE2E7] shrink-0" />
                    <span>শুধুমাত্র আসল ও সচল ইমেইল দিয়ে একাউন্ট খুলুন। ভেরিফিকেশন কোড ইমেইলে পাঠানো হবে।</span>
                  </div>

                  <div className="grid grid-cols-2 gap-2.5">
                    <div>
                      <label className="block text-[10px] font-bold text-slate-300 mb-1">First Name *</label>
                      <input
                        type="text"
                        required
                        value={firstName}
                        onChange={e => setFirstName(e.target.value)}
                        placeholder="First Name"
                        className="w-full px-3 py-2 rounded-xl bg-slate-950/70 border border-white/10 focus:border-[#5DE2E7] text-xs text-white focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-slate-300 mb-1">Last Name</label>
                      <input
                        type="text"
                        value={lastName}
                        onChange={e => setLastName(e.target.value)}
                        placeholder="Last Name"
                        className="w-full px-3 py-2 rounded-xl bg-slate-950/70 border border-white/10 focus:border-[#5DE2E7] text-xs text-white focus:outline-none"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2.5">
                    <div>
                      <label className="block text-[10px] font-bold text-slate-300 mb-1">Username *</label>
                      <input
                        type="text"
                        required
                        value={username}
                        onChange={e => setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_.]/g, ''))}
                        placeholder="username_99"
                        className="w-full px-3 py-2 rounded-xl bg-slate-950/70 border border-white/10 focus:border-[#5DE2E7] text-xs text-white focus:outline-none"
                      />
                    </div>
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label className="block text-[10px] font-bold text-slate-300">Email Address *</label>
                        {email.trim() && (() => {
                          const val = validateRealEmail(email);
                          if (val.isValid) {
                            return (
                              <span className="text-[9px] text-emerald-400 font-bold flex items-center gap-0.5">
                                <CheckCircle2 className="w-2.5 h-2.5" />
                                {val.isGmail ? 'Real Gmail' : 'Valid Email'}
                              </span>
                            );
                          }
                          return null;
                        })()}
                      </div>
                      <input
                        type="email"
                        required
                        value={email}
                        onChange={e => setEmail(e.target.value)}
                        placeholder="yourname@gmail.com"
                        className={`w-full px-3 py-2 rounded-xl bg-slate-950/70 border text-xs text-white focus:outline-none transition ${
                          email.trim()
                            ? validateRealEmail(email).isValid
                              ? 'border-emerald-500/50 focus:border-emerald-400'
                              : 'border-rose-500/60 focus:border-rose-400'
                            : 'border-white/10 focus:border-[#5DE2E7]'
                        }`}
                      />
                    </div>
                  </div>

                  {/* Real-time Email Validation Hints & Typo Fix */}
                  {email.trim() && (() => {
                    const val = validateRealEmail(email);
                    if (!val.isValid && val.error) {
                      return (
                        <div className="p-2 rounded-xl bg-rose-950/40 border border-rose-500/30 text-[11px] text-rose-300 space-y-1">
                          <div className="flex items-start gap-1.5">
                            <AlertCircle className="w-3.5 h-3.5 text-rose-400 shrink-0 mt-0.5" />
                            <span>{val.error}</span>
                          </div>
                          {val.suggestion && (
                            <button
                              type="button"
                              onClick={() => setEmail(val.suggestion!)}
                              className="mt-1 inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-cyan-500/20 hover:bg-cyan-500/30 border border-cyan-400/40 text-[10px] font-bold text-cyan-300 cursor-pointer transition"
                            >
                              <Sparkles className="w-3 h-3 text-cyan-300" />
                              <span>Fix to: {val.suggestion}</span>
                            </button>
                          )}
                        </div>
                      );
                    }
                    return null;
                  })()}

                  {/* Password & Confirm Password */}
                  <div>
                    <label className="block text-[10px] font-bold text-slate-300 mb-1">Password * (min 6 chars)</label>
                    <div className="relative">
                      <input
                        type={showPassword ? 'text' : 'password'}
                        required
                        value={password}
                        onChange={e => setPassword(e.target.value)}
                        placeholder="Min. 6 characters"
                        className="w-full px-3 py-2 pr-9 rounded-xl bg-slate-950/70 border border-white/10 focus:border-[#5DE2E7] text-xs text-white focus:outline-none"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-2.5 top-2.5 text-slate-400 hover:text-white cursor-pointer"
                      >
                        {showPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-slate-300 mb-1">Confirm Password</label>
                    <div className="relative">
                      <input
                        type={showConfirmPassword ? 'text' : 'password'}
                        required
                        value={confirmPassword}
                        onChange={e => setConfirmPassword(e.target.value)}
                        placeholder="Re-enter password"
                        className="w-full px-3 py-2 pr-9 rounded-xl bg-slate-950/70 border border-white/10 focus:border-[#5DE2E7] text-xs text-white focus:outline-none"
                      />
                      <button
                        type="button"
                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                        className="absolute right-2.5 top-2.5 text-slate-400 hover:text-white cursor-pointer"
                      >
                        {showConfirmPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                      </button>
                    </div>
                  </div>

                  {/* Real-Time Visual Password Strength Bar & Checklist */}
                  <PasswordStrengthIndicator
                    password={password}
                    confirmPassword={confirmPassword}
                    showRequirements={true}
                  />

                  <button
                    type="submit"
                    disabled={isLoading}
                    className="w-full mt-2 py-3 rounded-xl bg-gradient-to-r from-[#133E87] via-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-extrabold text-xs flex items-center justify-center gap-2 shadow-[0_0_20px_rgba(93,226,231,0.4)] transition disabled:opacity-50 cursor-pointer"
                  >
                    {isLoading ? (
                      <RefreshCw className="w-4 h-4 animate-spin" />
                    ) : (
                      <>
                        <span>Send 6-Digit Verification Code</span>
                        <ArrowRight className="w-4 h-4" />
                      </>
                    )}
                  </button>
                </form>
              )}

              {/* 3. EMAIL VERIFICATION OTP FORM */}
              {authModalMode === 'verify-email' && (
                <div className="space-y-4 text-center">
                  {/* Glowing Envelope Header */}
                  <div className="relative mx-auto w-14 h-14 rounded-2xl bg-gradient-to-tr from-cyan-500/20 via-blue-600/20 to-indigo-500/20 border border-[#5DE2E7]/40 flex items-center justify-center shadow-[0_0_25px_rgba(93,226,231,0.25)]">
                    <Mail className="w-7 h-7 text-[#5DE2E7] animate-pulse" />
                    <div className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-cyan-500 flex items-center justify-center text-[10px] font-black text-slate-950 shadow-md">
                      ✓
                    </div>
                  </div>

                  <div>
                    <h3 className="text-base font-black text-white">Check Your Inbox</h3>
                    <p className="text-xs text-slate-300 mt-1 max-w-xs mx-auto">
                      A 6-digit verification code has been dispatched to:
                    </p>
                    <div className="mt-1.5 py-1.5 px-3 rounded-xl bg-slate-950/80 border border-white/10 text-[#5DE2E7] font-mono font-bold text-xs tracking-wide break-all inline-block max-w-full">
                      {targetVerificationEmail || 'your registered email'}
                    </div>
                  </div>

                  {/* 6-Digit OTP Form */}
                  <form onSubmit={handleVerifyRegistrationOtp} className="p-4 rounded-2xl bg-slate-950/60 border border-white/10 text-left space-y-3.5 text-xs">
                    <div className="font-bold text-cyan-300 flex items-center gap-1.5">
                      <KeyRound className="w-4 h-4 text-[#5DE2E7]" />
                      <span>Enter 6-Digit Verification Code</span>
                    </div>

                    <div>
                      <input
                        type="text"
                        maxLength={6}
                        required
                        value={registrationOtp}
                        onChange={e => setRegistrationOtp(e.target.value.replace(/[^0-9]/g, ''))}
                        placeholder="••••••"
                        autoFocus
                        className="w-full text-center tracking-[0.45em] font-mono font-black text-xl py-3 rounded-xl bg-slate-900 border border-white/15 focus:border-[#5DE2E7] text-white focus:outline-none placeholder:tracking-normal placeholder:font-sans placeholder:text-xs placeholder:text-slate-500"
                      />
                    </div>

                    <p className="text-[11px] text-slate-400 text-center">
                      Please check your Gmail / Email inbox as well as your <strong className="text-white">Spam / Junk</strong> folder.
                    </p>

                    <button
                      type="submit"
                      disabled={isLoading || registrationOtp.length !== 6}
                      className="w-full py-3 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-extrabold text-xs flex items-center justify-center gap-1.5 shadow-md transition disabled:opacity-40 cursor-pointer"
                    >
                      {isLoading ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                      <span>Verify & Complete Registration</span>
                    </button>
                  </form>

                  {/* Secondary Actions */}
                  <div className="flex items-center justify-between pt-2 text-xs">
                    <button
                      type="button"
                      onClick={() => setAuthModalMode('register')}
                      className="text-slate-400 hover:text-white flex items-center gap-1 cursor-pointer"
                    >
                      <ArrowLeft className="w-3.5 h-3.5" />
                      <span>Back to Register</span>
                    </button>

                    <button
                      type="button"
                      onClick={handleResendRegistrationOtp}
                      disabled={!canResend || isLoading}
                      className={`font-bold transition flex items-center gap-1.5 ${
                        canResend ? 'text-[#5DE2E7] hover:underline cursor-pointer' : 'text-slate-500 cursor-not-allowed'
                      }`}
                    >
                      <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
                      <span>{canResend ? 'Resend Code' : `Resend in ${resendTimer}s`}</span>
                    </button>
                  </div>
                </div>
              )}

              {/* 4. FORGOT PASSWORD (REQUEST 6-DIGIT RESET CODE VIA EMAIL) */}
              {authModalMode === 'forgot-password' && (
                <form onSubmit={handleForgotPassword} className="space-y-4">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-300 mb-1">Your Registered Email or Username</label>
                    <div className="relative">
                      <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
                      <input
                        type="text"
                        required
                        value={resetIdentifier}
                        onChange={e => setResetIdentifier(e.target.value)}
                        placeholder="Enter registered email or @username"
                        className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-950/70 border border-white/10 focus:border-[#5DE2E7] text-xs text-white focus:outline-none"
                      />
                    </div>
                    <p className="text-[10px] text-slate-400 mt-1.5">
                      Enter your email or username to receive a secure 6-digit password recovery code.
                    </p>
                  </div>

                  <button
                    type="submit"
                    disabled={isLoading}
                    className="w-full py-3 rounded-xl bg-gradient-to-r from-[#133E87] via-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-extrabold text-xs flex items-center justify-center gap-2 shadow-lg transition disabled:opacity-50 cursor-pointer"
                  >
                    {isLoading ? (
                      <RefreshCw className="w-4 h-4 animate-spin" />
                    ) : (
                      <>
                        <KeyRound className="w-4 h-4 text-[#5DE2E7]" />
                        <span>Send 6-Digit Reset Code</span>
                        <ArrowRight className="w-4 h-4" />
                      </>
                    )}
                  </button>

                  <div className="flex items-center justify-between pt-2 text-xs">
                    <button
                      type="button"
                      onClick={() => setAuthModalMode('login')}
                      className="text-slate-400 hover:text-white flex items-center gap-1 cursor-pointer"
                    >
                      <ArrowLeft className="w-3.5 h-3.5" />
                      <span>Back to Sign In</span>
                    </button>
                  </div>
                </form>
              )}

              {/* 5. VERIFY PASSWORD RESET OTP */}
              {authModalMode === 'verify-reset-otp' && (
                <div className="space-y-4 text-center">
                  <div className="relative mx-auto w-14 h-14 rounded-2xl bg-gradient-to-tr from-cyan-500/20 via-blue-600/20 to-indigo-500/20 border border-[#5DE2E7]/40 flex items-center justify-center shadow-[0_0_25px_rgba(93,226,231,0.25)]">
                    <KeyRound className="w-7 h-7 text-[#5DE2E7] animate-pulse" />
                  </div>

                  <div>
                    <h3 className="text-base font-black text-white">Enter Reset Code</h3>
                    <p className="text-xs text-slate-300 mt-1 max-w-xs mx-auto">
                      A 6-digit password recovery code was sent to:
                    </p>
                    <div className="mt-1.5 py-1.5 px-3 rounded-xl bg-slate-950/80 border border-white/10 text-[#5DE2E7] font-mono font-bold text-xs tracking-wide break-all inline-block max-w-full">
                      {resetTargetEmail || 'your email'}
                    </div>
                  </div>

                  <form onSubmit={handleVerifyResetOtp} className="p-4 rounded-2xl bg-slate-950/60 border border-white/10 text-left space-y-3.5 text-xs">
                    <div className="font-bold text-cyan-300 flex items-center gap-1.5">
                      <KeyRound className="w-4 h-4 text-[#5DE2E7]" />
                      <span>Enter 6-Digit Reset Code</span>
                    </div>

                    <div>
                      <input
                        type="text"
                        maxLength={6}
                        required
                        value={resetOtpInput}
                        onChange={e => setResetOtpInput(e.target.value.replace(/[^0-9]/g, ''))}
                        placeholder="••••••"
                        autoFocus
                        className="w-full text-center tracking-[0.45em] font-mono font-black text-xl py-3 rounded-xl bg-slate-900 border border-white/15 focus:border-[#5DE2E7] text-white focus:outline-none placeholder:tracking-normal placeholder:font-sans placeholder:text-xs placeholder:text-slate-500"
                      />
                    </div>

                    <p className="text-[11px] text-slate-400 text-center">
                      Please check your Gmail / Email inbox or <strong className="text-white">Spam / Junk</strong> folder.
                    </p>

                    <button
                      type="submit"
                      disabled={isLoading || resetOtpInput.length !== 6}
                      className="w-full py-3 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-extrabold text-xs flex items-center justify-center gap-1.5 shadow-md transition disabled:opacity-40 cursor-pointer"
                    >
                      {isLoading ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                      <span>Verify Code & Continue</span>
                    </button>
                  </form>

                  {/* Secondary Actions */}
                  <div className="flex items-center justify-between pt-2 text-xs">
                    <button
                      type="button"
                      onClick={() => setAuthModalMode('forgot-password')}
                      className="text-slate-400 hover:text-white flex items-center gap-1 cursor-pointer"
                    >
                      <ArrowLeft className="w-3.5 h-3.5" />
                      <span>Back</span>
                    </button>

                    <button
                      type="button"
                      onClick={handleResendResetOtp}
                      disabled={!canResend || isLoading}
                      className={`font-bold transition flex items-center gap-1.5 ${
                        canResend ? 'text-[#5DE2E7] hover:underline cursor-pointer' : 'text-slate-500 cursor-not-allowed'
                      }`}
                    >
                      <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
                      <span>{canResend ? 'Resend Code' : `Resend in ${resendTimer}s`}</span>
                    </button>
                  </div>
                </div>
              )}

              {/* 6. SET NEW PASSWORD (POST OTP VERIFICATION) */}
              {authModalMode === 'reset-password' && (
                <form onSubmit={handleCompletePasswordReset} className="space-y-3.5">
                  <div className="p-3 rounded-2xl bg-cyan-950/40 border border-cyan-500/30 text-xs text-cyan-200 flex items-center gap-2">
                    <ShieldCheck className="w-4 h-4 text-[#5DE2E7] shrink-0" />
                    <span>Identity verified. Please set your new secure password.</span>
                  </div>

                  {/* New Password */}
                  <div>
                    <label className="block text-[11px] font-bold text-slate-300 mb-1">
                      New Password *
                    </label>
                    <div className="relative">
                      <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
                      <input
                        type={showNewPassword ? 'text' : 'password'}
                        required
                        value={newPassword}
                        onChange={e => setNewPassword(e.target.value)}
                        placeholder="Enter your strong new password"
                        className="w-full pl-10 pr-9 py-2.5 rounded-xl bg-slate-950/70 border border-white/10 focus:border-[#5DE2E7] text-xs text-white focus:outline-none"
                      />
                      <button
                        type="button"
                        onClick={() => setShowNewPassword(!showNewPassword)}
                        className="absolute right-3 top-3 text-slate-400 hover:text-white cursor-pointer"
                      >
                        {showNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  {/* Confirm New Password */}
                  <div>
                    <label className="block text-[11px] font-bold text-slate-300 mb-1">
                      Confirm New Password *
                    </label>
                    <div className="relative">
                      <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
                      <input
                        type={showConfirmNewPassword ? 'text' : 'password'}
                        required
                        value={confirmNewPassword}
                        onChange={e => setConfirmNewPassword(e.target.value)}
                        placeholder="Re-enter your new password"
                        className="w-full pl-10 pr-9 py-2.5 rounded-xl bg-slate-950/70 border border-white/10 focus:border-[#5DE2E7] text-xs text-white focus:outline-none"
                      />
                      <button
                        type="button"
                        onClick={() => setShowConfirmNewPassword(!showConfirmNewPassword)}
                        className="absolute right-3 top-3 text-slate-400 hover:text-white cursor-pointer"
                      >
                        {showConfirmNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  {/* Real-time Password Strength Visual Bar & Live Validation Feedback */}
                  <PasswordStrengthIndicator
                    password={newPassword}
                    confirmPassword={confirmNewPassword}
                    showRequirements={true}
                  />

                  <button
                    type="submit"
                    disabled={isLoading}
                    className="w-full py-3 rounded-xl bg-gradient-to-r from-[#133E87] via-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-extrabold text-xs flex items-center justify-center gap-2 shadow-[0_0_20px_rgba(93,226,231,0.35)] transition disabled:opacity-50 cursor-pointer"
                  >
                    {isLoading ? (
                      <RefreshCw className="w-4 h-4 animate-spin" />
                    ) : (
                      <>
                        <ShieldCheck className="w-4 h-4" />
                        <span>Update & Set New Password</span>
                      </>
                    )}
                  </button>

                  <div className="flex items-center justify-between pt-2 text-xs">
                    <button
                      type="button"
                      onClick={() => setAuthModalMode('login')}
                      className="text-slate-400 hover:text-white flex items-center gap-1 cursor-pointer"
                    >
                      <ArrowLeft className="w-3.5 h-3.5" />
                      <span>Back to Sign In</span>
                    </button>
                  </div>
                </form>
              )}

            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
