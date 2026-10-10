import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useAuth } from '../../context/AuthContext';
import { useApp } from '../../context/AppContext';
import { OtlLogo } from '../OtlLogo';
import { safeApiFetch } from '../../lib/apiClient';
import {
  X,
  User,
  Mail,
  Shield,
  Calendar,
  Clock,
  Download,
  LogOut,
  CheckCircle2,
  AlertTriangle,
  ExternalLink,
  ShieldAlert,
  Sparkles,
  KeyRound,
  FileText,
  Lock,
  Eye,
  EyeOff,
  Check,
  RefreshCw,
  Copy,
  MessageSquare,
  Send,
  Inbox,
  HelpCircle,
  MessageCircle,
  Tag,
  AlertCircle,
  ChevronDown,
  Camera,
  Upload,
  Trash2,
  Link as LinkIcon,
  Image as ImageIcon
} from 'lucide-react';
import { PasswordStrengthIndicator } from './PasswordStrengthIndicator';
import { getEffectiveContactCategories, getCategoryLabelById, cleanSubjectTitle } from '../../lib/contactCategories';
import { compressImageFile } from '../admin/AdminImageUploadInput';
import { AnimatedAvatar, EFFECT_OPTIONS } from '../common/AnimatedAvatar';
import type { AvatarAnimationEffect } from '../../types';

export const UserProfileModal: React.FC = () => {
  const {
    currentUser,
    isProfileModalOpen,
    setIsProfileModalOpen,
    logout,
    updateUserProfileData,
    requestPasswordReset,
    changeCurrentUserPassword
  } = useAuth();
  const { resources, inquiries, addInquiry, showToast, contactSettings } = useApp();

  const dynamicCategories = getEffectiveContactCategories(contactSettings?.categories, true);

  const [activeTab, setActiveTab] = useState<'profile' | 'downloads' | 'security' | 'contact'>('profile');
  const [firstName, setFirstName] = useState(currentUser?.firstName || '');
  const [lastName, setLastName] = useState(currentUser?.lastName || '');
  const [copiedId, setCopiedId] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Profile Avatar Upload & Management States
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
  const [avatarError, setAvatarError] = useState<string | null>(null);
  const [avatarSuccess, setAvatarSuccess] = useState<string | null>(null);
  const [showUrlInput, setShowUrlInput] = useState(false);
  const [customAvatarUrl, setCustomAvatarUrl] = useState('');
  const avatarFileInputRef = useRef<HTMLInputElement>(null);

  // User Contact / Support Form States
  const [contactSubject, setContactSubject] = useState('');
  const [contactCategory, setContactCategory] = useState(dynamicCategories[0]?.id || 'account_help');
  const [isCategoryDropdownOpen, setIsCategoryDropdownOpen] = useState(false);
  const categoryDropdownRef = useRef<HTMLDivElement>(null);
  const [contactPriority, setContactPriority] = useState<'normal' | 'high' | 'urgent'>('normal');
  const [contactTelegram, setContactTelegram] = useState('');
  const [contactMessage, setContactMessage] = useState('');
  const [contactSubmitting, setContactSubmitting] = useState(false);
  const [contactSuccess, setContactSuccess] = useState<string | null>(null);
  const [contactError, setContactError] = useState<string | null>(null);

  // Sync category if dynamic categories load or change
  useEffect(() => {
    if (dynamicCategories.length > 0 && !dynamicCategories.some(c => c.id === contactCategory)) {
      setContactCategory(dynamicCategories[0].id);
    }
  }, [dynamicCategories, contactCategory]);

  // Lock background body scrolling when profile modal is open
  useEffect(() => {
    if (isProfileModalOpen) {
      const originalOverflow = document.body.style.overflow;
      const originalTouchAction = document.body.style.touchAction;
      document.body.style.overflow = 'hidden';
      document.body.style.touchAction = 'none';

      return () => {
        document.body.style.overflow = originalOverflow;
        document.body.style.touchAction = originalTouchAction;
      };
    }
  }, [isProfileModalOpen]);

  // Click outside to close category dropdown
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (categoryDropdownRef.current && !categoryDropdownRef.current.contains(e.target as Node)) {
        setIsCategoryDropdownOpen(false);
      }
    };
    if (isCategoryDropdownOpen) {
      document.addEventListener('mousedown', handleOutsideClick);
    }
    return () => {
      document.removeEventListener('mousedown', handleOutsideClick);
    };
  }, [isCategoryDropdownOpen]);

  // Filter messages belonging to current user
  const userInquiries = (inquiries || []).filter(
    inq =>
      (currentUser && inq.userId === currentUser.id) ||
      (currentUser && currentUser.email && inq.email?.toLowerCase() === currentUser.email.toLowerCase())
  );
  const userUnreadRepliesCount = userInquiries.filter(i => i.adminReply && i.status === 'replied').length;

  const handleSendContactMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    setContactError(null);
    setContactSuccess(null);

    if (!contactSubject.trim()) {
      setContactError('Please enter a subject or title for your message.');
      return;
    }
    if (!contactMessage.trim()) {
      setContactError('Please enter your message or inquiry details.');
      return;
    }
    if (!currentUser) return;

    setContactSubmitting(true);
    try {
      const selectedCategoryItem = dynamicCategories.find(c => c.id === contactCategory);
      const categoryLabel = selectedCategoryItem ? selectedCategoryItem.label : getCategoryLabelById(contactCategory, dynamicCategories);

      await addInquiry({
        email: currentUser.email,
        subject: contactSubject.trim(),
        telegramWhatsapp: contactTelegram.trim() || undefined,
        message: contactMessage.trim(),
        userId: currentUser.id,
        customId: currentUser.customId || `ID: ${currentUser.id.substring(0, 8)}`,
        username: currentUser.username,
        userName: `${currentUser.firstName || ''} ${currentUser.lastName || ''}`.trim() || currentUser.username,
        isRegisteredUser: true,
        priority: contactPriority,
        source: 'profile',
        category: categoryLabel
      });

      setContactSuccess('🎉 Your message has been sent to OTL Admins! We will review and reply shortly.');
      setContactSubject('');
      setContactMessage('');
      setContactTelegram('');
      setTimeout(() => setContactSuccess(null), 6000);
    } catch (err: any) {
      setContactError(err?.message || 'Failed to dispatch message. Please try again.');
    } finally {
      setContactSubmitting(false);
    }
  };

  // Security & Password Change Form States
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [passwordMethod, setPasswordMethod] = useState<'old-password' | 'email-otp'>('old-password');
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');
  const [showOldPassword, setShowOldPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmNewPassword, setShowConfirmNewPassword] = useState(false);
  const [passwordChangeLoading, setPasswordChangeLoading] = useState(false);
  const [passwordChangeError, setPasswordChangeError] = useState<string | null>(null);
  const [passwordChangeSuccess, setPasswordChangeSuccess] = useState<string | null>(null);
  const [resetEmailSent, setResetEmailSent] = useState(false);
  const [resetEmailLoading, setResetEmailLoading] = useState(false);

  // Email OTP Reset Specific States
  const [otpCode, setOtpCode] = useState('');
  const [otpRequestId, setOtpRequestId] = useState<string | null>(null);
  const [otpCooldown, setOtpCooldown] = useState(0);
  const [otpSending, setOtpSending] = useState(false);
  const [otpSent, setOtpSent] = useState(false);
  const [otpResetLoading, setOtpResetLoading] = useState(false);

  // OTP Cooldown Timer Effect
  useEffect(() => {
    let timer: any;
    if (otpCooldown > 0) {
      timer = setInterval(() => {
        setOtpCooldown(prev => (prev > 0 ? prev - 1 : 0));
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [otpCooldown]);

  const handleSendResetEmail = async () => {
    if (!currentUser?.email) return;
    setResetEmailLoading(true);
    setPasswordChangeError(null);
    setPasswordChangeSuccess(null);
    const res = await requestPasswordReset(currentUser.email);
    setResetEmailLoading(false);
    if (res.success) {
      setResetEmailSent(true);
      setPasswordChangeSuccess('Official password reset link sent to ' + currentUser.email + '. Check your inbox!');
      setTimeout(() => setResetEmailSent(false), 8000);
    } else {
      setPasswordChangeError(res.error || 'Failed to dispatch reset email.');
    }
  };

  const handleSendOtpCode = async () => {
    if (!currentUser?.email) return;
    setOtpSending(true);
    setPasswordChangeError(null);
    setPasswordChangeSuccess(null);

    try {
      const { ok, data } = await safeApiFetch('/api/auth/forgot-password-request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ identifier: currentUser.email })
      });

      if (ok && data?.success && data?.requestId) {
        setOtpRequestId(data.requestId);
        setOtpSent(true);
        setOtpCooldown(60);
        setPasswordChangeSuccess(`🎉 6-digit reset code sent to ${currentUser.email}! Please check your inbox.`);
      } else {
        setPasswordChangeError(data?.error || 'Failed to send OTP code. Please try again.');
      }
    } catch (err: any) {
      setPasswordChangeError(err?.message || 'Network error while requesting OTP code.');
    } finally {
      setOtpSending(false);
    }
  };

  const handleResendOtpCode = async () => {
    if (!otpRequestId) {
      handleSendOtpCode();
      return;
    }
    if (otpCooldown > 0) return;

    setOtpSending(true);
    setPasswordChangeError(null);
    setPasswordChangeSuccess(null);

    try {
      const { ok, data } = await safeApiFetch('/api/auth/resend-password-reset-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ requestId: otpRequestId })
      });

      if (ok && data?.success) {
        setOtpCooldown(60);
        setPasswordChangeSuccess(`A fresh 6-digit code has been dispatched to ${currentUser?.email}.`);
      } else {
        setPasswordChangeError(data?.error || 'Failed to resend code.');
      }
    } catch (err: any) {
      setPasswordChangeError(err?.message || 'Network error while resending OTP.');
    } finally {
      setOtpSending(false);
    }
  };

  const handleResetWithOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordChangeError(null);
    setPasswordChangeSuccess(null);

    if (!otpRequestId) {
      setPasswordChangeError('Please click "Send 6-Digit OTP" first.');
      return;
    }
    const cleanOtp = otpCode.trim();
    if (!cleanOtp || cleanOtp.length !== 6) {
      setPasswordChangeError('Please enter the 6-digit verification code sent to your email.');
      return;
    }
    if (!newPassword) {
      setPasswordChangeError('Please enter your new password.');
      return;
    }
    if (newPassword.length < 6) {
      setPasswordChangeError('New password must be at least 6 characters long.');
      return;
    }
    if (newPassword !== confirmNewPassword) {
      setPasswordChangeError('New passwords do not match.');
      return;
    }

    setOtpResetLoading(true);
    try {
      const { ok, data } = await safeApiFetch('/api/auth/reset-password-inline-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          requestId: otpRequestId,
          otp: cleanOtp,
          newPassword,
          confirmPassword: confirmNewPassword
        })
      });

      if (ok && data?.success) {
        setPasswordChangeSuccess('🎉 Password reset successfully via email verification!');
        setOtpCode('');
        setNewPassword('');
        setConfirmNewPassword('');
        setOtpSent(false);
        setOtpRequestId(null);
        setIsChangingPassword(false);
        setTimeout(() => setPasswordChangeSuccess(null), 6000);
      } else {
        setPasswordChangeError(data?.error || 'Failed to verify code and reset password.');
      }
    } catch (err: any) {
      setPasswordChangeError(err?.message || 'Network error during password reset.');
    } finally {
      setOtpResetLoading(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordChangeError(null);
    setPasswordChangeSuccess(null);

    if (!oldPassword) {
      setPasswordChangeError('Please enter your current (old) password.');
      return;
    }
    if (!newPassword) {
      setPasswordChangeError('Please enter your new password.');
      return;
    }
    if (newPassword.length < 6) {
      setPasswordChangeError('New password must be at least 6 characters long.');
      return;
    }
    if (oldPassword === newPassword) {
      setPasswordChangeError('New password cannot be the same as your old password.');
      return;
    }
    if (newPassword !== confirmNewPassword) {
      setPasswordChangeError('New passwords do not match.');
      return;
    }

    setPasswordChangeLoading(true);
    const res = await changeCurrentUserPassword(newPassword, oldPassword);
    setPasswordChangeLoading(false);

    if (res.success) {
      setPasswordChangeSuccess('🎉 Password updated successfully!');
      setOldPassword('');
      setNewPassword('');
      setConfirmNewPassword('');
      setIsChangingPassword(false);
      setTimeout(() => setPasswordChangeSuccess(null), 5000);
    } else {
      setPasswordChangeError(res.error || 'Failed to update password.');
    }
  };

  React.useEffect(() => {
    if (currentUser) {
      setFirstName(currentUser.firstName || '');
      setLastName(currentUser.lastName || '');
    }
  }, [currentUser]);

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    const ok = await updateUserProfileData({
      firstName,
      lastName
    });
    setIsSaving(false);
    if (ok) {
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    }
  };

  const handleAvatarFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setAvatarError('Please select a valid image file (PNG, JPG, WEBP).');
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      setAvatarError('Image is too large. Please select a photo under 10MB.');
      return;
    }

    try {
      setIsUploadingAvatar(true);
      setAvatarError(null);
      setAvatarSuccess(null);

      // Compress avatar for optimal fast load and lightweight cloud storage (~20-45KB)
      const { dataUrl } = await compressImageFile(file, 400, 0.85);

      const ok = await updateUserProfileData({ photoURL: dataUrl });
      if (ok) {
        setAvatarSuccess('Profile picture updated successfully!');
        if (showToast) showToast('Profile picture updated!', 'success');
        setTimeout(() => setAvatarSuccess(null), 3500);
      } else {
        setAvatarError('Failed to save profile picture. Please try again.');
      }
    } catch (err: any) {
      console.error('Failed to process avatar:', err);
      setAvatarError(err?.message || 'Error processing selected image.');
    } finally {
      setIsUploadingAvatar(false);
      if (avatarFileInputRef.current) {
        avatarFileInputRef.current.value = '';
      }
    }
  };

  const handleSaveAvatarUrl = async () => {
    if (!customAvatarUrl.trim()) return;
    try {
      setIsUploadingAvatar(true);
      setAvatarError(null);
      setAvatarSuccess(null);
      const cleanUrl = customAvatarUrl.trim();
      const ok = await updateUserProfileData({ photoURL: cleanUrl });
      if (ok) {
        setAvatarSuccess('Profile picture updated from URL!');
        if (showToast) showToast('Profile picture updated!', 'success');
        setShowUrlInput(false);
        setCustomAvatarUrl('');
        setTimeout(() => setAvatarSuccess(null), 3500);
      } else {
        setAvatarError('Failed to update picture URL.');
      }
    } catch (err: any) {
      setAvatarError('Failed to update picture URL.');
    } finally {
      setIsUploadingAvatar(false);
    }
  };

  const handleRemoveAvatar = async () => {
    if (!currentUser?.photoURL) return;
    try {
      setIsUploadingAvatar(true);
      setAvatarError(null);
      setAvatarSuccess(null);
      const ok = await updateUserProfileData({ photoURL: '' });
      if (ok) {
        setAvatarSuccess('Profile picture removed.');
        if (showToast) showToast('Profile picture removed', 'info');
        setTimeout(() => setAvatarSuccess(null), 3500);
      } else {
        setAvatarError('Failed to remove profile picture.');
      }
    } catch (err: any) {
      setAvatarError('Failed to remove profile picture.');
    } finally {
      setIsUploadingAvatar(false);
    }
  };

  const downloadedResources = ((currentUser && currentUser.downloadedResourceIds) || [])
    .map(id => resources.find(r => r.id === id))
    .filter(Boolean);

  return (
    <AnimatePresence>
      {isProfileModalOpen && currentUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 overflow-hidden overscroll-contain">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={() => setIsProfileModalOpen(false)}
          className="fixed inset-0 bg-black/85 backdrop-blur-md"
        />

        {/* Modal Window */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 15 }}
          className="relative w-full max-w-2xl bg-[#0B1D51]/95 border border-[#5DE2E7]/40 glass-panel rounded-3xl text-white overflow-hidden shadow-[0_0_60px_rgba(11,29,81,0.95)] z-10 flex flex-col h-[90vh] max-h-[850px] overscroll-contain"
        >
          {/* Header Bar */}
          <div className="p-5 sm:p-6 border-b border-white/10 flex items-center justify-between bg-slate-950/60 shrink-0">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-cyan-500/10 border border-[#5DE2E7]/30 text-[#5DE2E7]">
                <User className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base sm:text-lg font-black text-white">My Account Center</h3>
                <p className="text-xs text-slate-400">Manage your profile, active downloads & credentials</p>
              </div>
            </div>

            <button
              onClick={() => setIsProfileModalOpen(false)}
              className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white transition"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* User Hero Banner */}
          <div className="p-5 sm:p-6 bg-gradient-to-r from-[#133E87]/60 via-[#0B1D51]/80 to-cyan-900/40 border-b border-white/10 shrink-0">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                {/* Avatar with Direct Upload / Change Camera Button */}
                <div className="relative group shrink-0">
                  <div className="relative group/avatar shrink-0">
                    <input
                      type="file"
                      ref={avatarFileInputRef}
                      accept="image/png, image/jpeg, image/webp, image/gif"
                      onChange={handleAvatarFileSelect}
                      className="hidden"
                    />

                    <div
                      onClick={() => avatarFileInputRef.current?.click()}
                      className="relative cursor-pointer focus:outline-none"
                    >
                      <AnimatedAvatar
                        photoURL={currentUser.photoURL}
                        name={currentUser.firstName || currentUser.username}
                        size="lg"
                        effect={currentUser.avatarAnimationEffect || 'cyber-cyan'}
                        isUploading={isUploadingAvatar}
                        showOnlineIndicator={true}
                        title="Change Profile Picture (Click to upload from Gallery/Device)"
                      >
                        {/* Camera icon hover overlay on desktop */}
                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover/avatar:opacity-100 flex items-center justify-center transition-opacity z-20 pointer-events-none">
                          <Camera className="w-5 h-5 text-white drop-shadow-md" />
                        </div>
                      </AnimatedAvatar>
                    </div>

                    {/* Corner Camera Button (Touch / Mobile Friendly) */}
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        avatarFileInputRef.current?.click();
                      }}
                      disabled={isUploadingAvatar}
                      className="absolute -bottom-1 -right-1 p-1.5 rounded-full bg-gradient-to-r from-[#133E87] via-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white border-2 border-[#0B1D51] shadow-[0_0_10px_rgba(93,226,231,0.6)] transition-all hover:scale-110 active:scale-90 cursor-pointer z-30"
                      title="Upload New Profile Photo"
                      aria-label="Upload New Profile Photo"
                    >
                      {isUploadingAvatar ? (
                        <RefreshCw className="w-3.5 h-3.5 animate-spin text-cyan-200" />
                      ) : (
                        <Camera className="w-3.5 h-3.5" />
                      )}
                    </button>
                  </div>
                </div>

                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <h4 className="text-lg font-bold text-white">
                      {currentUser.firstName} {currentUser.lastName}
                    </h4>
                    {/* User ID Badge */}
                    <span className="text-[11px] font-mono font-bold px-2 py-0.5 rounded-md bg-cyan-500/20 text-[#5DE2E7] border border-[#5DE2E7]/40 shadow-[0_0_10px_rgba(93,226,231,0.2)]">
                      {currentUser.customId || `ID: ${currentUser.id.substring(0, 8)}`}
                    </span>
                    {/* Role Badge */}
                    <span
                      className={`text-[10px] uppercase font-black px-2 py-0.5 rounded-md border ${
                        currentUser.role === 'admin'
                          ? 'bg-purple-500/20 text-purple-300 border-purple-500/40'
                          : 'bg-cyan-500/20 text-[#5DE2E7] border-[#5DE2E7]/40'
                      }`}
                    >
                      {currentUser.role === 'admin' ? 'Admin' : 'Member'}
                    </span>
                    {/* Status Badge */}
                    <span
                      className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded-md ${
                        currentUser.status === 'active'
                          ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                          : 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
                      }`}
                    >
                      {currentUser.status}
                    </span>
                  </div>
                  <p className="text-xs text-slate-300 font-mono mt-0.5">@{currentUser.username}</p>
                  <p className="text-xs text-slate-400">{currentUser.email}</p>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-2 w-full sm:w-auto">
                <button
                  onClick={logout}
                  className="flex-1 sm:flex-none px-3.5 py-2 rounded-xl bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 hover:text-white border border-rose-500/30 font-bold text-xs flex items-center justify-center gap-1.5 transition"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span>Log Out</span>
                </button>
              </div>
            </div>
          </div>

          {/* Navigation Tabs */}
          <div className="flex border-b border-white/10 px-5 sm:px-6 bg-slate-950/40 shrink-0">
            <button
              onClick={() => setActiveTab('profile')}
              className={`py-3 px-4 text-xs font-bold border-b-2 transition-all ${
                activeTab === 'profile'
                  ? 'border-[#5DE2E7] text-[#5DE2E7]'
                  : 'border-transparent text-slate-400 hover:text-white'
              }`}
            >
              Profile Details
            </button>
            <button
              onClick={() => setActiveTab('downloads')}
              className={`py-3 px-4 text-xs font-bold border-b-2 transition-all flex items-center gap-1.5 ${
                activeTab === 'downloads'
                  ? 'border-[#5DE2E7] text-[#5DE2E7]'
                  : 'border-transparent text-slate-400 hover:text-white'
              }`}
            >
              <span>Download History</span>
              <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-cyan-500/20 text-[#5DE2E7]">
                {currentUser.downloadCount || 0}
              </span>
            </button>
            <button
              onClick={() => setActiveTab('security')}
              className={`py-3 px-4 text-xs font-bold border-b-2 transition-all ${
                activeTab === 'security'
                  ? 'border-[#5DE2E7] text-[#5DE2E7]'
                  : 'border-transparent text-slate-400 hover:text-white'
              }`}
            >
              Security & Auth
            </button>
            <button
              onClick={() => setActiveTab('contact')}
              className={`py-3 px-4 text-xs font-bold border-b-2 transition-all flex items-center gap-1.5 ${
                activeTab === 'contact'
                  ? 'border-[#5DE2E7] text-[#5DE2E7]'
                  : 'border-transparent text-slate-400 hover:text-white'
              }`}
            >
              <MessageSquare className="w-3.5 h-3.5 text-[#5DE2E7]" />
              <span>Contact & Support</span>
              {userInquiries.length > 0 && (
                <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-cyan-500/20 text-[#5DE2E7] font-mono font-bold">
                  {userInquiries.length}
                </span>
              )}
            </button>
          </div>

          {/* Tab Content Body */}
          <div className="p-4 sm:p-6 overflow-y-auto flex-1 space-y-5 overscroll-contain touch-pan-y">
            {/* TAB 1: PROFILE */}
            {activeTab === 'profile' && (
              <form onSubmit={handleSaveProfile} className="space-y-4">
                {saveSuccess && (
                  <div className="p-3 rounded-xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 text-xs flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                    <span>Your profile updates have been saved successfully.</span>
                  </div>
                )}

                {/* Profile Picture / Avatar Management Card */}
                <div className="p-4 sm:p-5 rounded-2xl bg-slate-950/60 border border-white/10 space-y-3.5">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-slate-200 flex items-center gap-2">
                      <Camera className="w-4 h-4 text-[#5DE2E7]" />
                      <span>Profile Picture / Photo</span>
                    </label>

                    {currentUser.photoURL && (
                      <button
                        type="button"
                        onClick={handleRemoveAvatar}
                        disabled={isUploadingAvatar}
                        className="text-[11px] text-rose-400 hover:text-rose-300 font-bold flex items-center gap-1 hover:underline cursor-pointer transition disabled:opacity-40"
                      >
                        <Trash2 className="w-3 h-3" />
                        <span>Remove Picture</span>
                      </button>
                    )}
                  </div>

                  <div className="flex flex-col sm:flex-row items-center gap-5">
                    {/* Animated Avatar Preview */}
                    <div className="relative shrink-0">
                      <AnimatedAvatar
                        photoURL={currentUser.photoURL}
                        name={currentUser.firstName || currentUser.username}
                        size="xl"
                        effect={currentUser.avatarAnimationEffect || 'cyber-cyan'}
                        isUploading={isUploadingAvatar}
                        showOnlineIndicator={true}
                        title="Live Animated Avatar Preview"
                      />
                    </div>

                    {/* Actions & Info */}
                    <div className="flex-1 w-full space-y-2.5 text-left">
                      <div className="flex items-center gap-2 flex-wrap">
                        <button
                          type="button"
                          onClick={() => avatarFileInputRef.current?.click()}
                          disabled={isUploadingAvatar}
                          className="px-4 py-2 rounded-xl bg-gradient-to-r from-[#133E87] via-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-bold text-xs flex items-center gap-2 shadow-[0_0_15px_rgba(93,226,231,0.3)] transition-all active:scale-95 cursor-pointer disabled:opacity-50"
                        >
                          {isUploadingAvatar ? (
                            <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                          ) : (
                            <Upload className="w-3.5 h-3.5" />
                          )}
                          <span>Upload from Gallery / Device</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => setShowUrlInput(!showUrlInput)}
                          className="px-3.5 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white border border-white/10 text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer"
                        >
                          <LinkIcon className="w-3.5 h-3.5 text-[#5DE2E7]" />
                          <span>{showUrlInput ? 'Hide URL Input' : 'Use Image Link'}</span>
                        </button>
                      </div>

                      <p className="text-[11px] text-slate-400 leading-relaxed">
                        Select a photo from your device (JPG, PNG, WEBP, GIF). It will be automatically optimized with live glowing cyber aura, breathing motion, and shimmer glint animation!
                      </p>

                      {showUrlInput && (
                        <div className="flex items-center gap-2 pt-1">
                          <input
                            type="url"
                            value={customAvatarUrl}
                            onChange={e => setCustomAvatarUrl(e.target.value)}
                            placeholder="https://example.com/my-photo.jpg"
                            className="flex-1 px-3 py-2 rounded-xl bg-slate-900 border border-white/15 focus:border-[#5DE2E7] text-xs text-white focus:outline-none"
                          />
                          <button
                            type="button"
                            onClick={handleSaveAvatarUrl}
                            disabled={!customAvatarUrl.trim() || isUploadingAvatar}
                            className="px-4 py-2 rounded-xl bg-[#5DE2E7] hover:bg-cyan-400 text-slate-950 font-bold text-xs transition disabled:opacity-40 cursor-pointer"
                          >
                            Apply
                          </button>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Avatar Live Animation Effect Selector */}
                  <div className="mt-4 pt-4 border-t border-white/10">
                    <div className="flex items-center justify-between gap-2 mb-2.5 flex-wrap">
                      <div className="flex items-center gap-2">
                        <Sparkles className="w-4 h-4 text-[#5DE2E7] animate-pulse" />
                        <span className="text-xs font-bold text-white tracking-wide">
                          Live Profile Animation Style (প্রোফাইল লাইভ এনিমেশন)
                        </span>
                      </div>
                      <span className="text-[10px] text-cyan-300 font-semibold px-2 py-0.5 rounded-full bg-cyan-500/15 border border-cyan-500/30">
                        Active & Animated Everywhere
                      </span>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                      {EFFECT_OPTIONS.map((eff) => {
                        const currentEff = currentUser.avatarAnimationEffect || 'cyber-cyan';
                        const isSelected = currentEff === eff.id;
                        return (
                          <button
                            key={eff.id}
                            type="button"
                            onClick={async () => {
                              try {
                                await updateUserProfileData({ avatarAnimationEffect: eff.id });
                                setAvatarSuccess(`Animation style changed to ${eff.label}`);
                                setTimeout(() => setAvatarSuccess(null), 3000);
                              } catch (err) {
                                console.error('Failed to change avatar effect:', err);
                              }
                            }}
                            className={`px-3 py-2.5 rounded-xl text-left border text-xs transition-all flex items-center justify-between cursor-pointer ${
                              isSelected
                                ? 'bg-[#133E87]/80 border-[#5DE2E7] shadow-[0_0_15px_rgba(93,226,231,0.35)] text-white ring-1 ring-[#5DE2E7]/40'
                                : 'bg-white/5 border-white/10 hover:bg-white/10 text-slate-300 hover:text-white'
                            }`}
                          >
                            <div className="flex items-center gap-2 min-w-0">
                              <span
                                className="w-3.5 h-3.5 rounded-full shrink-0 border border-white/30"
                                style={{ background: eff.haloColor }}
                              />
                              <div className="min-w-0">
                                <span className="block truncate font-bold text-[11px]">{eff.label}</span>
                                <span className="block text-[9px] text-slate-400 truncate">{eff.colorName}</span>
                              </div>
                            </div>
                            {isSelected && <Check className="w-4 h-4 text-[#5DE2E7] shrink-0 ml-1" />}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {avatarSuccess && (
                    <div className="p-2.5 rounded-xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 text-xs flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                      <span>{avatarSuccess}</span>
                    </div>
                  )}

                  {avatarError && (
                    <div className="p-2.5 rounded-xl bg-rose-500/20 border border-rose-500/40 text-rose-300 text-xs flex items-center gap-2">
                      <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
                      <span>{avatarError}</span>
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-300 mb-1">First Name</label>
                    <input
                      type="text"
                      value={firstName}
                      onChange={e => setFirstName(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950/70 border border-white/10 focus:border-[#5DE2E7] text-xs text-white focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-300 mb-1">Last Name</label>
                    <input
                      type="text"
                      value={lastName}
                      onChange={e => setLastName(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950/70 border border-white/10 focus:border-[#5DE2E7] text-xs text-white focus:outline-none"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-300 mb-1">Username</label>
                    <input
                      type="text"
                      disabled
                      value={`@${currentUser.username}`}
                      className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950/40 border border-white/5 text-xs text-slate-400 cursor-not-allowed font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-300 mb-1">Email Address</label>
                    <input
                      type="text"
                      disabled
                      value={currentUser.email}
                      className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950/40 border border-white/5 text-xs text-slate-400 cursor-not-allowed"
                    />
                  </div>
                </div>

                {/* Permanent User ID (Read-only for regular users) */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                      <Lock className="w-3 h-3 text-slate-500" />
                      <span>User ID (Account Identifier)</span>
                    </label>
                    <span className="text-[10px] text-slate-500 font-medium">Permanent • Non-editable</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="relative flex-1">
                      <input
                        type="text"
                        disabled
                        value={currentUser.customId || currentUser.id}
                        className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950/40 border border-[#5DE2E7]/20 text-xs text-[#5DE2E7] font-mono font-bold cursor-not-allowed"
                      />
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        navigator.clipboard.writeText(currentUser.customId || currentUser.id);
                        setCopiedId(true);
                        setTimeout(() => setCopiedId(false), 2000);
                      }}
                      className="px-3.5 py-2.5 rounded-xl bg-cyan-500/15 hover:bg-cyan-500/25 border border-[#5DE2E7]/30 text-[#5DE2E7] text-xs font-bold flex items-center gap-1.5 transition"
                      title="Copy User ID"
                    >
                      {copiedId ? (
                        <>
                          <Check className="w-3.5 h-3.5 text-emerald-400" />
                          <span className="text-emerald-400">Copied</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3.5 h-3.5" />
                          <span>Copy ID</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>

                {/* Account Metadata Stats */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2">
                  <div className="p-3 rounded-xl bg-slate-950/50 border border-[#5DE2E7]/20">
                    <span className="text-[10px] text-slate-400 uppercase font-bold block">User ID</span>
                    <span className="text-xs text-[#5DE2E7] font-mono font-bold mt-0.5 block truncate">
                      {currentUser.customId || currentUser.id.substring(0, 10)}
                    </span>
                  </div>
                  <div className="p-3 rounded-xl bg-slate-950/50 border border-white/5">
                    <span className="text-[10px] text-slate-400 uppercase font-bold block">Joined Date</span>
                    <span className="text-xs text-white font-semibold mt-0.5 block">
                      {currentUser.createdAt ? new Date(currentUser.createdAt).toLocaleDateString() : 'N/A'}
                    </span>
                  </div>
                  <div className="p-3 rounded-xl bg-slate-950/50 border border-white/5">
                    <span className="text-[10px] text-slate-400 uppercase font-bold block">Last Active</span>
                    <span className="text-xs text-white font-semibold mt-0.5 block">
                      {currentUser.lastActiveAt ? new Date(currentUser.lastActiveAt).toLocaleDateString() : 'Just now'}
                    </span>
                  </div>
                  <div className="p-3 rounded-xl bg-slate-950/50 border border-white/5">
                    <span className="text-[10px] text-slate-400 uppercase font-bold block">Auth Method</span>
                    <span className="text-xs text-[#5DE2E7] font-semibold mt-0.5 capitalize block truncate">
                      {currentUser.provider} Sign-in
                    </span>
                  </div>
                </div>

                <div className="pt-2">
                  <button
                    type="submit"
                    disabled={isSaving}
                    className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-[#133E87] to-cyan-600 hover:from-cyan-500 hover:to-blue-600 text-white font-bold text-xs shadow-md transition disabled:opacity-50"
                  >
                    {isSaving ? 'Saving Changes...' : 'Save Profile Changes'}
                  </button>
                </div>
              </form>
            )}

            {/* TAB 2: DOWNLOAD HISTORY */}
            {activeTab === 'downloads' && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider">
                    Recent Downloads & Unlocks
                  </h4>
                  <span className="text-xs text-slate-400">Total: {currentUser.downloadCount || 0}</span>
                </div>

                {downloadedResources.length === 0 ? (
                  <div className="text-center py-10 border border-dashed border-white/10 rounded-2xl bg-slate-950/30">
                    <Download className="w-8 h-8 text-slate-500 mx-auto mb-2 opacity-50" />
                    <p className="text-xs text-slate-300 font-bold">No downloaded resources yet</p>
                    <p className="text-[11px] text-slate-500 mt-1">Explore our feed to download premium mods, prompts and assets!</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {downloadedResources.map((res: any) => (
                      <div
                        key={res.id}
                        className="p-3 rounded-xl bg-slate-950/60 border border-white/10 flex items-center justify-between hover:border-[#5DE2E7]/40 transition"
                      >
                        <div className="flex items-center gap-3">
                          <img
                            src={res.imageUrl}
                            alt={res.title}
                            className="w-10 h-10 rounded-lg object-cover"
                          />
                          <div>
                            <p className="text-xs font-bold text-white">{res.title}</p>
                            <p className="text-[10px] text-cyan-400 capitalize">{res.category}</p>
                          </div>
                        </div>

                        {res.downloadUrl && (
                          <a
                            href={res.downloadUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="px-3 py-1.5 rounded-lg bg-[#133E87] hover:bg-cyan-600 text-white text-xs font-bold flex items-center gap-1 transition"
                          >
                            <Download className="w-3.5 h-3.5" />
                            <span>Download</span>
                          </a>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* TAB 3: SECURITY */}
            {activeTab === 'security' && (
              <div className="space-y-4">
                <div className="p-4 rounded-2xl bg-slate-950/60 border border-white/10 space-y-3">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                      <Shield className="w-5 h-5" />
                    </div>
                    <div>
                      <h5 className="text-xs font-bold text-white">Email Verification Status</h5>
                      <p className="text-[11px] text-slate-400">
                        {currentUser.emailVerified
                          ? 'Your email address is verified with Firebase Authentication.'
                          : 'Your email address has not been verified yet.'}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-1">
                    <span
                      className={`text-[11px] font-bold px-2.5 py-1 rounded-lg ${
                        currentUser.emailVerified
                          ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                          : 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                      }`}
                    >
                      {currentUser.emailVerified ? 'Verified Account' : 'Verification Required'}
                    </span>

                    {!currentUser.emailVerified && (
                      <button
                        type="button"
                        onClick={() => {
                          setIsProfileModalOpen(false);
                          window.history.pushState({}, '', '/verify-email');
                          window.dispatchEvent(new PopStateEvent('popstate'));
                        }}
                        className="px-3 py-1.5 rounded-lg bg-gradient-to-r from-[#133E87] to-cyan-600 hover:from-cyan-500 hover:to-blue-600 text-white font-bold text-xs shadow-md transition"
                      >
                        Verify Email Now
                      </button>
                    )}
                  </div>
                </div>

                {/* Password & Credentials Management */}
                <div className="p-4 rounded-2xl bg-slate-950/60 border border-white/10 space-y-3">
                  <div className="flex items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-xl bg-cyan-500/10 text-[#5DE2E7] border border-[#5DE2E7]/30">
                        <KeyRound className="w-5 h-5" />
                      </div>
                      <div>
                        <h5 className="text-xs font-bold text-white">Password & Security</h5>
                        <p className="text-[11px] text-slate-400">
                          {currentUser.provider === 'google'
                            ? 'Managed securely through your Google Account.'
                            : currentUser.provider === 'github'
                            ? 'Managed securely through your GitHub Account.'
                            : 'Update your password or receive a secure reset link.'}
                        </p>
                      </div>
                    </div>

                    {currentUser.provider === 'email' && (
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={handleSendResetEmail}
                          disabled={resetEmailLoading || resetEmailSent}
                          className="px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white border border-white/10 text-xs font-bold transition flex items-center gap-1.5 disabled:opacity-50"
                        >
                          <RefreshCw className={`w-3.5 h-3.5 ${resetEmailLoading ? 'animate-spin' : ''}`} />
                          <span>{resetEmailSent ? 'Link Sent!' : 'Send Reset Link'}</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setIsChangingPassword(!isChangingPassword);
                            setPasswordChangeError(null);
                            setPasswordChangeSuccess(null);
                          }}
                          className="px-3 py-1.5 rounded-lg bg-gradient-to-r from-[#133E87] to-cyan-600 hover:from-cyan-500 hover:to-blue-600 text-white font-bold text-xs shadow-md transition"
                        >
                          {isChangingPassword ? 'Cancel' : 'Change Password'}
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Feedback alerts */}
                  {passwordChangeError && (
                    <div className="p-2.5 rounded-xl bg-rose-500/15 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2">
                      <AlertTriangle className="w-4 h-4 shrink-0" />
                      <span>{passwordChangeError}</span>
                    </div>
                  )}
                  {passwordChangeSuccess && (
                    <div className="p-2.5 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-xs flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 shrink-0" />
                      <span>{passwordChangeSuccess}</span>
                    </div>
                  )}

                  {/* Interactive Change / Reset Password Form */}
                  {isChangingPassword && currentUser.provider !== 'google' && (
                    <div className="pt-3 border-t border-white/10 space-y-4">
                      {/* Method Selector Tabs */}
                      <div className="grid grid-cols-2 gap-2 p-1 bg-slate-900/90 rounded-xl border border-white/10">
                        <button
                          type="button"
                          onClick={() => {
                            setPasswordMethod('old-password');
                            setPasswordChangeError(null);
                          }}
                          className={`py-2 px-3 rounded-lg text-xs font-bold transition flex items-center justify-center gap-2 cursor-pointer ${
                            passwordMethod === 'old-password'
                              ? 'bg-gradient-to-r from-[#133E87] to-cyan-700 text-white shadow-md border border-cyan-500/40'
                              : 'text-slate-400 hover:text-white hover:bg-white/5'
                          }`}
                        >
                          <KeyRound className="w-3.5 h-3.5" />
                          <span>Current Password</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setPasswordMethod('email-otp');
                            setPasswordChangeError(null);
                          }}
                          className={`py-2 px-3 rounded-lg text-xs font-bold transition flex items-center justify-center gap-2 cursor-pointer ${
                            passwordMethod === 'email-otp'
                              ? 'bg-gradient-to-r from-[#133E87] to-cyan-700 text-white shadow-md border border-cyan-500/40'
                              : 'text-slate-400 hover:text-white hover:bg-white/5'
                          }`}
                        >
                          <Mail className="w-3.5 h-3.5 text-cyan-400" />
                          <span>Email OTP Verify</span>
                          <span className="text-[9px] px-1.5 py-0.2 rounded bg-cyan-500/20 text-cyan-300 font-extrabold uppercase">New</span>
                        </button>
                      </div>

                      {/* MODE 1: OLD PASSWORD */}
                      {passwordMethod === 'old-password' && (
                        <form onSubmit={handleChangePassword} className="space-y-3">
                          {/* Old / Current Password */}
                          <div>
                            <label className="block text-[10px] font-bold text-slate-300 mb-1 flex items-center justify-between">
                              <span>Current Password * (পুরনো পাসওয়ার্ড)</span>
                              <span className="text-[10px] text-cyan-400 font-normal">Required to verify identity</span>
                            </label>
                            <div className="relative">
                              <Lock className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
                              <input
                                type={showOldPassword ? 'text' : 'password'}
                                required
                                value={oldPassword}
                                onChange={e => setOldPassword(e.target.value)}
                                placeholder="Enter your current (old) password"
                                className="w-full pl-9 pr-9 py-2 rounded-xl bg-slate-900 border border-white/10 focus:border-[#5DE2E7] text-xs text-white focus:outline-none placeholder:text-slate-500"
                              />
                              <button
                                type="button"
                                onClick={() => setShowOldPassword(!showOldPassword)}
                                className="absolute right-2.5 top-2 text-slate-400 hover:text-white cursor-pointer"
                              >
                                {showOldPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                              </button>
                            </div>
                          </div>

                          {/* New Password */}
                          <div>
                            <label className="block text-[10px] font-bold text-slate-300 mb-1">
                              New Password * (নতুন পাসওয়ার্ড - min 6 chars)
                            </label>
                            <div className="relative">
                              <Lock className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
                              <input
                                type={showNewPassword ? 'text' : 'password'}
                                required
                                value={newPassword}
                                onChange={e => setNewPassword(e.target.value)}
                                placeholder="Enter new password"
                                className="w-full pl-9 pr-9 py-2 rounded-xl bg-slate-900 border border-white/10 focus:border-[#5DE2E7] text-xs text-white focus:outline-none placeholder:text-slate-500"
                              />
                              <button
                                type="button"
                                onClick={() => setShowNewPassword(!showNewPassword)}
                                className="absolute right-2.5 top-2 text-slate-400 hover:text-white cursor-pointer"
                              >
                                {showNewPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                              </button>
                            </div>
                          </div>

                          {/* Confirm New Password */}
                          <div>
                            <label className="block text-[10px] font-bold text-slate-300 mb-1">
                              Confirm New Password * (নতুন পাসওয়ার্ড নিশ্চিত করুন)
                            </label>
                            <div className="relative">
                              <Lock className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
                              <input
                                type={showConfirmNewPassword ? 'text' : 'password'}
                                required
                                value={confirmNewPassword}
                                onChange={e => setConfirmNewPassword(e.target.value)}
                                placeholder="Re-enter new password"
                                className="w-full pl-9 pr-9 py-2 rounded-xl bg-slate-900 border border-white/10 focus:border-[#5DE2E7] text-xs text-white focus:outline-none placeholder:text-slate-500"
                              />
                              <button
                                type="button"
                                onClick={() => setShowConfirmNewPassword(!showConfirmNewPassword)}
                                className="absolute right-2.5 top-2 text-slate-400 hover:text-white cursor-pointer"
                              >
                                {showConfirmNewPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                              </button>
                            </div>
                          </div>

                          {/* Visual Real-time Password Strength Indicator */}
                          <PasswordStrengthIndicator
                            password={newPassword}
                            confirmPassword={confirmNewPassword}
                            showRequirements={true}
                          />

                          <div className="flex justify-end gap-2 pt-1">
                            <button
                              type="button"
                              onClick={() => {
                                setIsChangingPassword(false);
                                setOldPassword('');
                                setNewPassword('');
                                setConfirmNewPassword('');
                                setPasswordChangeError(null);
                              }}
                              className="px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-slate-300 text-xs font-bold cursor-pointer"
                            >
                              Cancel
                            </button>
                            <button
                              type="submit"
                              disabled={passwordChangeLoading}
                              className="px-4 py-1.5 rounded-lg bg-gradient-to-r from-[#133E87] via-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-extrabold text-xs shadow-md transition disabled:opacity-50 flex items-center gap-1.5 cursor-pointer"
                            >
                              {passwordChangeLoading ? (
                                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                              ) : (
                                <Check className="w-3.5 h-3.5" />
                              )}
                              <span>Save New Password</span>
                            </button>
                          </div>
                        </form>
                      )}

                      {/* MODE 2: EMAIL OTP VERIFICATION RESET */}
                      {passwordMethod === 'email-otp' && (
                        <div className="space-y-3.5">
                          {/* Info Banner */}
                          <div className="p-3 rounded-xl bg-cyan-950/40 border border-cyan-500/20 text-slate-300 text-xs flex items-start gap-2.5">
                            <Mail className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5" />
                            <div className="space-y-1">
                              <div className="font-semibold text-white">
                                Reset Password via Email Code
                              </div>
                              <p className="text-[11px] text-slate-300">
                                আপনার নিবন্ধিত ইমেইল <strong className="text-cyan-300 font-mono">{currentUser.email}</strong>-এ একটি ৬ ডিজিটের ওটিপি কোড পাঠানো হবে। কোড যাচাই করে সরাসরি নতুন পাসওয়ার্ড সেট করুন।
                              </p>
                            </div>
                          </div>

                          {!otpSent ? (
                            <div className="pt-1">
                              <button
                                type="button"
                                onClick={handleSendOtpCode}
                                disabled={otpSending}
                                className="w-full py-2.5 px-4 rounded-xl bg-gradient-to-r from-[#133E87] via-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-bold text-xs shadow-lg transition flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer"
                              >
                                {otpSending ? (
                                  <>
                                    <RefreshCw className="w-4 h-4 animate-spin text-cyan-200" />
                                    <span>Sending Verification Code...</span>
                                  </>
                                ) : (
                                  <>
                                    <Send className="w-4 h-4 text-cyan-300" />
                                    <span>Send 6-Digit OTP to {currentUser.email}</span>
                                  </>
                                )}
                              </button>
                            </div>
                          ) : (
                            <form onSubmit={handleResetWithOtp} className="space-y-3">
                              {/* OTP Sent status badge */}
                              <div className="flex items-center justify-between px-3 py-2 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 text-[11px]">
                                <div className="flex items-center gap-1.5 font-medium">
                                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                                  <span>OTP sent to {currentUser.email}</span>
                                </div>
                                <button
                                  type="button"
                                  onClick={handleResendOtpCode}
                                  disabled={otpCooldown > 0 || otpSending}
                                  className="text-cyan-300 hover:text-white font-bold flex items-center gap-1 disabled:opacity-50 text-[10px] cursor-pointer"
                                >
                                  <RefreshCw className={`w-3 h-3 ${otpSending ? 'animate-spin' : ''}`} />
                                  <span>{otpCooldown > 0 ? `Resend (${otpCooldown}s)` : 'Resend Code'}</span>
                                </button>
                              </div>

                              {/* 6-Digit OTP input */}
                              <div>
                                <label className="block text-[10px] font-bold text-slate-300 mb-1">
                                  6-Digit Verification Code * (ইমেইলের ৬ সংখ্যার ওটিপি কোড)
                                </label>
                                <div className="relative">
                                  <KeyRound className="w-3.5 h-3.5 text-cyan-400 absolute left-3 top-2.5" />
                                  <input
                                    type="text"
                                    maxLength={6}
                                    required
                                    value={otpCode}
                                    onChange={e => setOtpCode(e.target.value.replace(/[^0-9]/g, ''))}
                                    placeholder="Enter 6-digit code (e.g. 123456)"
                                    className="w-full pl-9 pr-4 py-2 rounded-xl bg-slate-900 border border-white/10 focus:border-[#5DE2E7] text-sm text-white font-mono tracking-widest focus:outline-none placeholder:text-slate-500 placeholder:tracking-normal placeholder:font-sans placeholder:text-xs"
                                  />
                                </div>
                              </div>

                              {/* New Password */}
                              <div>
                                <label className="block text-[10px] font-bold text-slate-300 mb-1">
                                  New Password * (নতুন পাসওয়ার্ড - min 6 chars)
                                </label>
                                <div className="relative">
                                  <Lock className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
                                  <input
                                    type={showNewPassword ? 'text' : 'password'}
                                    required
                                    value={newPassword}
                                    onChange={e => setNewPassword(e.target.value)}
                                    placeholder="Enter new password"
                                    className="w-full pl-9 pr-9 py-2 rounded-xl bg-slate-900 border border-white/10 focus:border-[#5DE2E7] text-xs text-white focus:outline-none placeholder:text-slate-500"
                                  />
                                  <button
                                    type="button"
                                    onClick={() => setShowNewPassword(!showNewPassword)}
                                    className="absolute right-2.5 top-2 text-slate-400 hover:text-white cursor-pointer"
                                  >
                                    {showNewPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                                  </button>
                                </div>
                              </div>

                              {/* Confirm New Password */}
                              <div>
                                <label className="block text-[10px] font-bold text-slate-300 mb-1">
                                  Confirm New Password * (নতুন পাসওয়ার্ড নিশ্চিত করুন)
                                </label>
                                <div className="relative">
                                  <Lock className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
                                  <input
                                    type={showConfirmNewPassword ? 'text' : 'password'}
                                    required
                                    value={confirmNewPassword}
                                    onChange={e => setConfirmNewPassword(e.target.value)}
                                    placeholder="Re-enter new password"
                                    className="w-full pl-9 pr-9 py-2 rounded-xl bg-slate-900 border border-white/10 focus:border-[#5DE2E7] text-xs text-white focus:outline-none placeholder:text-slate-500"
                                  />
                                  <button
                                    type="button"
                                    onClick={() => setShowConfirmNewPassword(!showConfirmNewPassword)}
                                    className="absolute right-2.5 top-2 text-slate-400 hover:text-white cursor-pointer"
                                  >
                                    {showConfirmNewPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                                  </button>
                                </div>
                              </div>

                              {/* Visual Password Strength Indicator */}
                              <PasswordStrengthIndicator
                                password={newPassword}
                                confirmPassword={confirmNewPassword}
                                showRequirements={true}
                              />

                              <div className="flex justify-end gap-2 pt-1">
                                <button
                                  type="button"
                                  onClick={() => {
                                    setIsChangingPassword(false);
                                    setOtpCode('');
                                    setNewPassword('');
                                    setConfirmNewPassword('');
                                    setOtpSent(false);
                                    setOtpRequestId(null);
                                    setPasswordChangeError(null);
                                  }}
                                  className="px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-slate-300 text-xs font-bold cursor-pointer"
                                >
                                  Cancel
                                </button>
                                <button
                                  type="submit"
                                  disabled={otpResetLoading || !otpCode.trim()}
                                  className="px-4 py-1.5 rounded-lg bg-gradient-to-r from-[#133E87] via-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-extrabold text-xs shadow-md transition disabled:opacity-50 flex items-center gap-1.5 cursor-pointer"
                                >
                                  {otpResetLoading ? (
                                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                                  ) : (
                                    <Check className="w-3.5 h-3.5" />
                                  )}
                                  <span>Verify Code & Reset Password</span>
                                </button>
                              </div>
                            </form>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* TAB 4: CONTACT & DIRECT SUPPORT */}
            {activeTab === 'contact' && (
              <div className="space-y-6">
                {/* Intro Header Banner */}
                <div className="p-4 rounded-2xl bg-gradient-to-r from-cyan-500/15 via-[#133E87]/30 to-blue-600/15 border border-[#5DE2E7]/30 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                  <div className="flex items-start gap-3">
                    <div className="p-2.5 rounded-xl bg-cyan-500/20 border border-[#5DE2E7]/40 text-[#5DE2E7] shrink-0 mt-0.5">
                      <MessageCircle className="w-5 h-5" />
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-white flex items-center gap-2 flex-wrap">
                        <span>Direct Support & Admin Inquiries</span>
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                          Verified User Desk
                        </span>
                      </h4>
                      <p className="text-xs text-slate-300 mt-0.5">
                        Send custom resource requests, report broken links, or ask account questions. All messages are securely linked to your account.
                      </p>
                    </div>
                  </div>
                </div>

                {/* Status Notifications */}
                {contactSuccess && (
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="p-3.5 rounded-2xl bg-emerald-950/60 border border-emerald-500/40 text-emerald-300 text-xs flex items-center gap-2 font-bold"
                  >
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                    <span>{contactSuccess}</span>
                  </motion.div>
                )}

                {contactError && (
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="p-3.5 rounded-2xl bg-rose-950/60 border border-rose-500/40 text-rose-300 text-xs flex items-center gap-2 font-medium"
                  >
                    <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
                    <span>{contactError}</span>
                  </motion.div>
                )}

                {/* Form Card */}
                <form onSubmit={handleSendContactMessage} className="p-4 sm:p-5 rounded-2xl bg-slate-950/60 border border-white/10 space-y-4 text-left">
                  <div className="flex items-center justify-between border-b border-white/5 pb-3 flex-wrap gap-2">
                    <h5 className="text-xs font-black text-[#5DE2E7] uppercase tracking-wider flex items-center gap-1.5">
                      <Send className="w-3.5 h-3.5" />
                      <span>Write Message to Admin</span>
                    </h5>
                    <div className="flex items-center gap-2 text-[11px] text-slate-400 font-mono">
                      <span>Sender:</span>
                      <span className="text-white font-bold">@{currentUser.username}</span>
                      <span className="text-[#5DE2E7] font-bold">({currentUser.customId || 'ID: ' + currentUser.id.substring(0, 6)})</span>
                    </div>
                  </div>

                  {/* Topic & Priority Row */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div ref={categoryDropdownRef} className="relative">
                      <label className="block text-[10px] font-bold text-slate-300 mb-1">
                        Inquiry Category / Topic *
                      </label>
                      <button
                        type="button"
                        id="user-inquiry-category-select-btn"
                        onClick={() => setIsCategoryDropdownOpen(prev => !prev)}
                        className={`w-full px-3 py-2 rounded-xl bg-slate-900 border text-xs text-white flex items-center justify-between transition cursor-pointer text-left ${
                          isCategoryDropdownOpen
                            ? 'border-[#5DE2E7] ring-1 ring-[#5DE2E7]/40 bg-slate-900 shadow-[0_0_15px_rgba(93,226,231,0.25)]'
                            : 'border-white/10 hover:border-[#5DE2E7]/50'
                        }`}
                        aria-haspopup="listbox"
                        aria-expanded={isCategoryDropdownOpen}
                      >
                        <span className="truncate pr-2 font-medium">
                          {dynamicCategories.find(cat => cat.id === contactCategory)?.label || 'Select Category...'}
                        </span>
                        <ChevronDown
                          className={`w-4 h-4 text-[#5DE2E7] shrink-0 transition-transform duration-200 ${
                            isCategoryDropdownOpen ? 'rotate-180 text-cyan-300' : ''
                          }`}
                        />
                      </button>

                      <AnimatePresence>
                        {isCategoryDropdownOpen && (
                          <motion.div
                            initial={{ opacity: 0, y: -4, scale: 0.98 }}
                            animate={{ opacity: 1, y: 0, scale: 1 }}
                            exit={{ opacity: 0, y: -4, scale: 0.98 }}
                            transition={{ duration: 0.15 }}
                            className="absolute left-0 right-0 top-full mt-1.5 z-50 bg-[#060b1e] border border-[#5DE2E7]/50 rounded-xl shadow-[0_12px_40px_rgba(0,0,0,0.95)] overflow-hidden max-h-60 overflow-y-auto py-1 backdrop-blur-2xl ring-1 ring-white/10"
                            role="listbox"
                          >
                            {dynamicCategories.map(cat => {
                              const isSelected = cat.id === contactCategory;
                              return (
                                <button
                                  key={cat.id}
                                  type="button"
                                  onClick={() => {
                                    setContactCategory(cat.id);
                                    setIsCategoryDropdownOpen(false);
                                  }}
                                  className={`w-full px-3 py-2.5 text-xs flex items-center justify-between transition text-left cursor-pointer border-b border-white/5 last:border-0 ${
                                    isSelected
                                      ? 'bg-cyan-500/20 text-[#5DE2E7] font-bold'
                                      : 'text-slate-200 hover:bg-white/10 hover:text-white'
                                  }`}
                                  role="option"
                                  aria-selected={isSelected}
                                >
                                  <span className="truncate pr-2">{cat.label}</span>
                                  {isSelected && <Check className="w-3.5 h-3.5 text-[#5DE2E7] shrink-0" />}
                                </button>
                              );
                            })}
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>

                    <div>
                      <label className="block text-[10px] font-bold text-slate-300 mb-1">
                        Priority Level
                      </label>
                      <div className="grid grid-cols-3 gap-1.5">
                        {(['normal', 'high', 'urgent'] as const).map(p => (
                          <button
                            key={p}
                            type="button"
                            onClick={() => setContactPriority(p)}
                            className={`py-1.5 rounded-lg text-[10px] font-bold uppercase transition border ${
                              contactPriority === p
                                ? p === 'urgent'
                                  ? 'bg-rose-500/30 text-rose-300 border-rose-500/60 shadow-[0_0_10px_rgba(244,63,94,0.3)]'
                                  : p === 'high'
                                  ? 'bg-amber-500/30 text-amber-300 border-amber-500/60 shadow-[0_0_10px_rgba(245,158,11,0.3)]'
                                  : 'bg-cyan-500/30 text-cyan-300 border-cyan-500/60 shadow-[0_0_10px_rgba(93,226,231,0.3)]'
                                : 'bg-slate-900/80 text-slate-400 border-white/5 hover:border-white/20'
                            }`}
                          >
                            {p}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Subject and Telegram/WhatsApp */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[10px] font-bold text-slate-300 mb-1">
                        Subject / Resource Title *
                      </label>
                      <input
                        type="text"
                        required
                        value={contactSubject}
                        onChange={e => setContactSubject(e.target.value)}
                        placeholder="e.g. Need assistance with Lightroom Preset #4"
                        className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-white/10 focus:border-[#5DE2E7] text-xs text-white focus:outline-none placeholder:text-slate-500"
                      />
                    </div>

                    <div>
                      <label className="block text-[10px] font-bold text-slate-300 mb-1">
                        Telegram / WhatsApp (Optional for fast reply)
                      </label>
                      <input
                        type="text"
                        value={contactTelegram}
                        onChange={e => setContactTelegram(e.target.value)}
                        placeholder="@username or +8801..."
                        className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-white/10 focus:border-[#5DE2E7] text-xs text-white focus:outline-none placeholder:text-slate-500"
                      />
                    </div>
                  </div>

                  {/* Message Details */}
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="block text-[10px] font-bold text-slate-300">
                        Detailed Message / Description *
                      </label>
                      <span className="text-[10px] text-slate-400 font-mono">
                        {contactMessage.length} characters
                      </span>
                    </div>
                    <textarea
                      required
                      rows={4}
                      value={contactMessage}
                      onChange={e => setContactMessage(e.target.value)}
                      placeholder="Please write your detailed request, feedback or problem here..."
                      className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-white/10 focus:border-[#5DE2E7] text-xs text-white focus:outline-none placeholder:text-slate-500 leading-relaxed"
                    />
                  </div>

                  {/* Submit Button & Notification Info */}
                  <div className="pt-2 space-y-3">
                    <div className="flex items-center gap-2 text-[11px] text-slate-300/90 flex-wrap">
                      <span className="text-sm">📧</span>
                      <span>Reply will be sent here & to</span>
                      <strong className="text-white font-mono bg-white/5 px-2 py-0.5 rounded-lg border border-white/10 break-all">
                        {currentUser.email}
                      </strong>
                    </div>

                    <div>
                      <button
                        type="submit"
                        disabled={contactSubmitting || !contactSubject.trim() || !contactMessage.trim()}
                        className="w-full sm:w-auto px-6 py-3 rounded-xl bg-gradient-to-r from-[#133E87] via-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-extrabold text-xs sm:text-sm flex items-center justify-center gap-2.5 shadow-[0_0_24px_rgba(93,226,231,0.35)] hover:shadow-[0_0_30px_rgba(93,226,231,0.5)] transition-all active:scale-[0.98] disabled:opacity-40 disabled:hover:shadow-none cursor-pointer"
                      >
                        {contactSubmitting ? (
                          <RefreshCw className="w-4 h-4 animate-spin" />
                        ) : (
                          <Send className="w-4 h-4" />
                        )}
                        <span>Submit Message to Admin</span>
                      </button>
                    </div>
                  </div>
                </form>

                {/* My Sent Messages & Admin Responses Section */}
                <div className="space-y-3 pt-2">
                  <div className="flex items-center justify-between">
                    <h5 className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                      <Inbox className="w-4 h-4 text-[#5DE2E7]" />
                      <span>My Sent Inquiries & Admin Replies ({userInquiries.length})</span>
                    </h5>
                  </div>

                  {userInquiries.length === 0 ? (
                    <div className="p-6 rounded-2xl bg-slate-950/40 border border-white/5 text-center space-y-2">
                      <div className="w-10 h-10 mx-auto rounded-xl bg-cyan-500/10 border border-[#5DE2E7]/20 flex items-center justify-center text-cyan-400">
                        <MessageSquare className="w-5 h-5" />
                      </div>
                      <p className="text-xs font-bold text-slate-300">No Messages Sent Yet</p>
                      <p className="text-[11px] text-slate-400 max-w-sm mx-auto">
                        Fill out the form above to reach OTL Admins directly. When admins reply, you will see their response right here.
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {userInquiries.map(inq => (
                        <div
                          key={inq.id}
                          className="p-4 rounded-2xl bg-slate-950/70 border border-white/10 hover:border-[#5DE2E7]/40 space-y-3 transition"
                        >
                          {/* Message Header */}
                          <div className="flex items-start justify-between gap-3 flex-wrap">
                            <div className="space-y-1">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-lg bg-cyan-500/15 border border-[#5DE2E7]/40 text-[#5DE2E7] flex items-center gap-1 shadow-sm">
                                  <Tag className="w-3 h-3 text-[#5DE2E7]" />
                                  <span>{getCategoryLabelById(inq.category || inq.subject)}</span>
                                </span>
                                {inq.priority && (
                                  <span
                                    className={`text-[9px] uppercase font-extrabold px-1.5 py-0.2 rounded border ${
                                      inq.priority === 'urgent'
                                        ? 'bg-rose-500/20 text-rose-300 border-rose-500/40'
                                        : inq.priority === 'high'
                                        ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                                        : 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40'
                                    }`}
                                  >
                                    {inq.priority}
                                  </span>
                                )}
                              </div>
                              <h6 className="text-xs font-bold text-white">{cleanSubjectTitle(inq.subject)}</h6>
                              <p className="text-[10px] text-slate-400 mt-0.5">
                                Sent on: {inq.createdAt} {inq.telegramWhatsapp && `• Contact: ${inq.telegramWhatsapp}`}
                              </p>
                            </div>

                            {/* Status Badge */}
                            <span
                              className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                                inq.status === 'replied' || inq.status === 'resolved'
                                  ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40 shadow-[0_0_10px_rgba(16,185,129,0.2)]'
                                  : inq.status === 'read' || inq.status === 'in_progress'
                                  ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40'
                                  : 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                              }`}
                            >
                              {inq.status === 'replied' || inq.status === 'resolved'
                                ? 'Replied & Resolved'
                                : inq.status === 'read' || inq.status === 'in_progress'
                                ? 'In Review'
                                : 'Pending Admin Review'}
                            </span>
                          </div>

                          {/* Message Body */}
                          <div className="p-3 rounded-xl bg-slate-900/80 border border-white/5 text-xs text-slate-200 leading-relaxed whitespace-pre-wrap">
                            {inq.message}
                          </div>

                          {/* Admin Reply Box if present */}
                          {inq.adminReply ? (
                            <motion.div
                              initial={{ opacity: 0, scale: 0.98 }}
                              animate={{ opacity: 1, scale: 1 }}
                              className="p-3.5 rounded-xl bg-gradient-to-r from-emerald-950/60 via-slate-900 to-cyan-950/60 border border-emerald-500/50 space-y-1.5 shadow-[0_0_15px_rgba(16,185,129,0.2)]"
                            >
                              <div className="flex items-center justify-between flex-wrap gap-2 text-[10px]">
                                <div className="flex items-center gap-1.5 text-emerald-400 font-bold">
                                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                                  <span>Official Admin Response ({inq.adminRepliedBy || 'OTL Support'})</span>
                                </div>
                                {inq.adminRepliedAt && (
                                  <span className="text-slate-400">
                                    {new Date(inq.adminRepliedAt).toLocaleString()}
                                  </span>
                                )}
                              </div>
                              <p className="text-xs text-emerald-100 whitespace-pre-wrap leading-relaxed">
                                {inq.adminReply}
                              </p>
                            </motion.div>
                          ) : (
                            <div className="text-[10px] text-slate-400 italic flex items-center gap-1">
                              <Clock className="w-3 h-3 text-amber-400" />
                              <span>Waiting for admin response. We usually reply within 24 hours.</span>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </motion.div>
      </div>
      )}
    </AnimatePresence>
  );
};
