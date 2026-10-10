import React, { useState, useMemo, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { UserProfile, UserStatus, UserActivity, AdminActivityLog, UserRole } from '../../types';
import { AdminImageUploadInput } from './AdminImageUploadInput';
import { motion, AnimatePresence } from 'motion/react';
import {
  Users,
  Search,
  Filter,
  Shield,
  ShieldAlert,
  ShieldCheck,
  UserCheck,
  UserX,
  Ban,
  Trash2,
  Clock,
  Calendar,
  Mail,
  User,
  LogIn,
  LogOut,
  Activity,
  AlertTriangle,
  Download,
  CheckCircle2,
  XCircle,
  Eye,
  EyeOff,
  RefreshCw,
  MoreVertical,
  ChevronDown,
  History,
  FileText,
  Sparkles,
  ExternalLink,
  ChevronRight,
  X,
  Edit3,
  Save,
  Copy,
  Check,
  KeyRound,
  Lock,
  Unlock
} from 'lucide-react';

export const AdminUserManagement: React.FC = () => {
  const {
    allUsers,
    userActivities,
    adminActivityLogs,
    updateUserStatus,
    adminUpdateUserProfile,
    adminChangeUserPassword,
    deleteUserAccount,
    currentUser
  } = useAuth();

  // Search & Filter States
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | UserStatus>('all');
  const [roleFilter, setRoleFilter] = useState<'all' | 'admin' | 'user'>('all');
  const [providerFilter, setProviderFilter] = useState<'all' | 'email' | 'google' | 'github'>('all');
  const [dateFilter, setDateFilter] = useState<'all' | 'today' | '7days' | '30days'>('all');
  const [sortBy, setSortBy] = useState<'newest' | 'oldest' | 'lastActive' | 'downloads'>('newest');

  // Table Password Visibility State
  const [showTablePasswordFor, setShowTablePasswordFor] = useState<Record<string, boolean>>({});
  const [copiedPasswordUser, setCopiedPasswordUser] = useState<string | null>(null);

  // Admin Change Password Modal State
  const [passwordModalUser, setPasswordModalUser] = useState<UserProfile | null>(null);
  const [newPasswordInput, setNewPasswordInput] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(true);
  const [showCurrentModalPassword, setShowCurrentModalPassword] = useState(false);
  const [passwordChangeLoading, setPasswordChangeLoading] = useState(false);
  const [passwordChangeError, setPasswordChangeError] = useState<string | null>(null);
  const [passwordChangeSuccess, setPasswordChangeSuccess] = useState<string | null>(null);

  // Selected User Modal / Detail Drawer
  const [selectedUser, setSelectedUser] = useState<UserProfile | null>(null);
  const [activeUserTab, setActiveUserTab] = useState<'details' | 'activity' | 'downloads'>('details');

  // User Edit State
  const [isEditingUser, setIsEditingUser] = useState(false);
  const [showEditPassword, setShowEditPassword] = useState(false);
  const [editFormData, setEditFormData] = useState({
    firstName: '',
    lastName: '',
    username: '',
    email: '',
    customId: '',
    status: 'active' as UserStatus,
    role: 'user' as UserRole,
    notes: '',
    password: ''
  });
  const [editLoading, setEditLoading] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);
  const [editSuccess, setEditSuccess] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState(false);

  // Random Password Generator
  const generateRandomPassword = () => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#$%&*';
    const uppers = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
    const lowers = 'abcdefghijkmnopqrstuvwxyz';
    const digits = '23456789';
    const symbols = '!@#$%&*';
    let pass = '';
    pass += uppers[Math.floor(Math.random() * uppers.length)];
    pass += lowers[Math.floor(Math.random() * lowers.length)];
    pass += digits[Math.floor(Math.random() * digits.length)];
    pass += symbols[Math.floor(Math.random() * symbols.length)];
    for (let i = 0; i < 6; i++) {
      pass += chars[Math.floor(Math.random() * chars.length)];
    }
    return pass.split('').sort(() => 0.5 - Math.random()).join('');
  };

  const toggleTablePassword = (userId: string) => {
    setShowTablePasswordFor(prev => ({
      ...prev,
      [userId]: !prev[userId]
    }));
  };

  const handleCopyPassword = (text: string, identifier: string) => {
    navigator.clipboard.writeText(text);
    setCopiedPasswordUser(identifier);
    setTimeout(() => setCopiedPasswordUser(null), 2000);
  };

  const openPasswordModal = (user: UserProfile) => {
    setPasswordModalUser(user);
    // If user already has a saved password, pre-fill it for editing. If not, leave empty for admin input.
    const initialPass = user.rawPassword || '';
    setNewPasswordInput(initialPass);
    setShowNewPassword(true);
    setShowCurrentModalPassword(true);
    setPasswordChangeError(null);
    setPasswordChangeSuccess(null);
  };

  const handleAdminChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!passwordModalUser) return;
    const cleanPass = newPasswordInput.trim();
    if (!cleanPass || cleanPass.length < 6) {
      setPasswordChangeError('Password must be at least 6 characters long.');
      return;
    }

    setPasswordChangeLoading(true);
    setPasswordChangeError(null);
    setPasswordChangeSuccess(null);

    const res = await adminChangeUserPassword(passwordModalUser.id, cleanPass);
    setPasswordChangeLoading(false);
    if (res.success) {
      setPasswordChangeSuccess(`Password for @${passwordModalUser.username} updated to "${cleanPass}" successfully!`);
      setPasswordModalUser(prev => prev ? { ...prev, rawPassword: cleanPass } : null);
      if (selectedUser && selectedUser.id === passwordModalUser.id) {
        setSelectedUser(prev => prev ? { ...prev, rawPassword: cleanPass } : null);
      }
    } else {
      setPasswordChangeError(res.error || 'Failed to update user password.');
    }
  };

  const startEditUser = (user: UserProfile) => {
    setSelectedUser(user);
    setActiveUserTab('details');
    setIsEditingUser(true);
    setEditFormData({
      firstName: user.firstName || '',
      lastName: user.lastName || '',
      username: user.username || '',
      email: user.email || '',
      customId: user.customId || '',
      photoURL: user.photoURL || '',
      status: user.status || 'active',
      role: user.role || 'user',
      notes: user.notes || '',
      password: user.rawPassword || ''
    });
    setShowEditPassword(false);
    setEditError(null);
    setEditSuccess(null);
  };

  const handleSaveUserEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUser) return;
    setEditLoading(true);
    setEditError(null);
    setEditSuccess(null);

    const res = await adminUpdateUserProfile(selectedUser.id, {
      firstName: editFormData.firstName || '',
      lastName: editFormData.lastName || '',
      username: editFormData.username || '',
      email: editFormData.email || '',
      customId: editFormData.customId || '',
      photoURL: editFormData.photoURL || '',
      status: editFormData.status,
      role: editFormData.role,
      notes: editFormData.notes || '',
      password: editFormData.password ? editFormData.password.trim() : undefined
    });

    setEditLoading(false);
    if (res.success) {
      setEditSuccess('User profile successfully updated!');
      setSelectedUser(prev => prev ? ({
        ...prev,
        firstName: (editFormData.firstName || '').trim(),
        lastName: (editFormData.lastName || '').trim(),
        username: (editFormData.username || '').trim().toLowerCase().replace(/^@/, ''),
        email: (editFormData.email || '').trim().toLowerCase(),
        customId: (editFormData.customId || '').trim(),
        photoURL: (editFormData.photoURL || '').trim(),
        status: editFormData.status,
        role: editFormData.role,
        notes: editFormData.notes || '',
        rawPassword: editFormData.password ? editFormData.password.trim() : prev.rawPassword
      }) : null);
      setTimeout(() => {
        setIsEditingUser(false);
        setEditSuccess(null);
      }, 1500);
    } else {
      setEditError(res.error || 'Failed to update user profile.');
    }
  };

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(true);
    setTimeout(() => setCopiedId(false), 2000);
  };

  // Action Confirmation Modals
  const [deleteConfirmUser, setDeleteConfirmUser] = useState<UserProfile | null>(null);
  const [statusChangeConfirm, setStatusChangeConfirm] = useState<{
    user: UserProfile;
    newStatus: UserStatus;
    reason?: string;
  } | null>(null);
  const [actionReason, setActionReason] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [feedbackMessage, setFeedbackMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Lock background body scrolling when user management modal is open
  useEffect(() => {
    if (selectedUser || passwordModalUser || statusChangeConfirm || deleteConfirmUser) {
      const originalOverflow = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      return () => {
        document.body.style.overflow = originalOverflow;
      };
    }
  }, [selectedUser, passwordModalUser, statusChangeConfirm, deleteConfirmUser]);

  // Active sub-tab in Admin User Management: 'users' or 'logs'
  const [viewMode, setViewMode] = useState<'users' | 'logs'>('users');

  // Statistics Calculations
  const stats = useMemo(() => {
    const total = allUsers.length;
    const active = allUsers.filter(u => u.status === 'active').length;
    const adminUsers = allUsers.filter(u => u.role === 'admin').length;
    const suspended = allUsers.filter(u => u.status === 'suspended').length;
    const banned = allUsers.filter(u => u.status === 'banned').length;
    const googleUsers = allUsers.filter(u => u.provider === 'google').length;
    const githubUsers = allUsers.filter(u => u.provider === 'github').length;
    const emailUsers = allUsers.filter(u => u.provider === 'email').length;

    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const newToday = allUsers.filter(u => new Date(u.createdAt) >= todayStart).length;

    return { total, active, adminUsers, suspended, banned, googleUsers, githubUsers, emailUsers, newToday };
  }, [allUsers]);

  // Filtered & Sorted Users
  const filteredUsers = useMemo(() => {
    return allUsers.filter(user => {
      // Search matching: name, username, email, customId, userId, accountNumber
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase().trim();
        const cleanQuery = query.replace(/[\s\-_#:]/g, '');

        const fullName = `${user.firstName || ''} ${user.lastName || ''}`.toLowerCase();
        const matchName = fullName.includes(query);
        const matchUsername = (user.username || '').toLowerCase().includes(query) || 
                              (user.username || '').toLowerCase().replace(/^@/, '').includes(query.replace(/^@/, ''));
        const matchEmail = (user.email || '').toLowerCase().includes(query);

        // Custom ID matching (e.g. OTL_1, OTL_2, etc.)
        const customIdLower = (user.customId || '').toLowerCase();
        const cleanCustomId = customIdLower.replace(/[\s\-_#:]/g, '');
        const matchCustomId = customIdLower.includes(query) || 
                              (cleanCustomId.length > 0 && cleanCustomId.includes(cleanQuery));

        // Account Number matching (e.g. 2, #2, otl2, otl_2)
        const matchAccountNum = user.accountNumber !== undefined && (
          user.accountNumber.toString() === query ||
          user.accountNumber.toString() === cleanQuery ||
          `otl${user.accountNumber}` === cleanQuery ||
          `otl_${user.accountNumber}`.includes(query)
        );

        // Document ID & Auth UID matching
        const userDocId = (user.id || '').toLowerCase();
        const cleanDocId = userDocId.replace(/[\s\-_#:]/g, '');
        const authUid = (user.userId || '').toLowerCase();
        const cleanAuthUid = authUid.replace(/[\s\-_#:]/g, '');
        const matchId = userDocId.includes(query) || 
                        authUid.includes(query) || 
                        (cleanDocId.length > 0 && cleanDocId.includes(cleanQuery)) || 
                        (cleanAuthUid.length > 0 && cleanAuthUid.includes(cleanQuery));

        const matchNotes = (user.notes || '').toLowerCase().includes(query);

        if (!matchName && !matchUsername && !matchEmail && !matchCustomId && !matchAccountNum && !matchId && !matchNotes) {
          return false;
        }
      }

      // Status filter
      if (statusFilter !== 'all' && user.status !== statusFilter) {
        return false;
      }

      // Role filter (Admin vs Regular User)
      if (roleFilter === 'admin' && user.role !== 'admin') {
        return false;
      }
      if (roleFilter === 'user' && user.role === 'admin') {
        return false;
      }

      // Provider filter
      if (providerFilter !== 'all' && user.provider !== providerFilter) {
        return false;
      }

      // Date filter
      if (dateFilter !== 'all') {
        const userDate = new Date(user.createdAt).getTime();
        const now = Date.now();
        if (dateFilter === 'today') {
          const today = new Date();
          today.setHours(0, 0, 0, 0);
          if (userDate < today.getTime()) return false;
        } else if (dateFilter === '7days') {
          if (now - userDate > 7 * 24 * 60 * 60 * 1000) return false;
        } else if (dateFilter === '30days') {
          if (now - userDate > 30 * 24 * 60 * 60 * 1000) return false;
        }
      }

      return true;
    }).sort((a, b) => {
      if (sortBy === 'newest') return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      if (sortBy === 'oldest') return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
      if (sortBy === 'lastActive') {
        const timeA = a.lastActiveAt ? new Date(a.lastActiveAt).getTime() : 0;
        const timeB = b.lastActiveAt ? new Date(b.lastActiveAt).getTime() : 0;
        return timeB - timeA;
      }
      if (sortBy === 'downloads') {
        return (b.downloadCount || 0) - (a.downloadCount || 0);
      }
      return 0;
    });
  }, [allUsers, searchQuery, statusFilter, roleFilter, providerFilter, dateFilter, sortBy]);

  // Handle Quick Admin Role Toggle
  const handleToggleAdminRole = async (targetUser: UserProfile) => {
    const newRole: UserRole = targetUser.role === 'admin' ? 'user' : 'admin';
    const isDemotingSelf = targetUser.id === currentUser?.id && newRole === 'user';
    if (isDemotingSelf) {
      const confirmSelf = window.confirm('Warning: You are about to remove Admin privileges from your current account. Do you wish to continue?');
      if (!confirmSelf) return;
    }

    setIsProcessing(true);
    const res = await adminUpdateUserProfile(targetUser.id, {
      role: newRole
    });
    setIsProcessing(false);

    if (res.success) {
      setFeedbackMessage({
        type: 'success',
        text: `Successfully ${newRole === 'admin' ? 'granted Administrator privileges to' : 'reverted to Regular User for'} ${targetUser.username || targetUser.email}!`
      });
      if (selectedUser?.id === targetUser.id) {
        setSelectedUser(prev => prev ? { ...prev, role: newRole } : null);
      }
    } else {
      setFeedbackMessage({
        type: 'error',
        text: res.error || 'Failed to update user role privilege.'
      });
    }
    setTimeout(() => setFeedbackMessage(null), 4000);
  };

  // Selected User's activities
  const selectedUserActivities = useMemo(() => {
    if (!selectedUser) return [];
    return userActivities.filter(act => act.userId === selectedUser.id || act.userEmail === selectedUser.email);
  }, [selectedUser, userActivities]);

  // Handlers
  const handleExecuteStatusChange = async () => {
    if (!statusChangeConfirm) return;
    setIsProcessing(true);
    const { user, newStatus } = statusChangeConfirm;
    const res = await updateUserStatus(user.id, newStatus, actionReason || undefined);
    setIsProcessing(false);
    setStatusChangeConfirm(null);
    setActionReason('');

    if (res.success) {
      setFeedbackMessage({ type: 'success', text: `Successfully updated ${user.username || user.email}'s status to ${newStatus}.` });
      if (selectedUser?.id === user.id) {
        setSelectedUser(prev => prev ? { ...prev, status: newStatus } : null);
      }
    } else {
      setFeedbackMessage({ type: 'error', text: res.error || 'Failed to update user status.' });
    }
    setTimeout(() => setFeedbackMessage(null), 4000);
  };

  const handleExecuteDelete = async () => {
    if (!deleteConfirmUser) return;
    setIsProcessing(true);
    const targetUser = deleteConfirmUser;
    const res = await deleteUserAccount(targetUser.id, `Deleted by admin (${currentUser?.email || 'admin'})`);
    setIsProcessing(false);
    setDeleteConfirmUser(null);

    if (res.success) {
      setFeedbackMessage({ type: 'success', text: `User ${targetUser.username || targetUser.email} has been permanently deleted.` });
      if (selectedUser?.id === targetUser.id) {
        setSelectedUser(null);
      }
    } else {
      setFeedbackMessage({ type: 'error', text: res.error || 'Failed to delete user.' });
    }
    setTimeout(() => setFeedbackMessage(null), 4000);
  };

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return 'Never';
    try {
      const date = new Date(dateStr);
      return date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch {
      return dateStr;
    }
  };

  const getStatusBadge = (status: UserStatus) => {
    switch (status) {
      case 'active':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
            Active
          </span>
        );
      case 'suspended':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-400"></span>
            Suspended
          </span>
        );
      case 'banned':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-red-500/20 text-red-300 border border-red-500/30">
            <Ban className="w-3 h-3" />
            Banned
          </span>
        );
      case 'disabled':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-slate-500/20 text-slate-300 border border-slate-500/30">
            <UserX className="w-3 h-3" />
            Disabled
          </span>
        );
      default:
        return null;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header with quick stats */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-[#133E87] to-cyan-500/30 border border-[#5DE2E7]/40 flex items-center justify-center text-[#5DE2E7] shadow-[0_0_15px_rgba(93,226,231,0.3)]">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight flex items-center gap-2">
                User Management Center
                <span className="text-xs px-2.5 py-0.5 rounded-full bg-[#5DE2E7]/20 text-[#5DE2E7] border border-[#5DE2E7]/30 font-bold">
                  {allUsers.length} Users Registered
                </span>
              </h2>
              <p className="text-xs text-slate-300">
                Manage all registered accounts, view real-time user activity timelines, manage security statuses, and review admin audit logs.
              </p>
            </div>
          </div>
        </div>

        {/* View Switcher Tabs */}
        <div className="flex items-center gap-2 p-1 rounded-2xl bg-slate-950/60 border border-white/10 self-start md:self-auto">
          <button
            onClick={() => setViewMode('users')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 ${
              viewMode === 'users'
                ? 'bg-gradient-to-r from-[#133E87] to-cyan-500 text-white shadow-[0_0_15px_rgba(93,226,231,0.3)]'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Users className="w-4 h-4" />
            <span>Users List</span>
          </button>
          <button
            onClick={() => setViewMode('logs')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 ${
              viewMode === 'logs'
                ? 'bg-gradient-to-r from-[#133E87] to-cyan-500 text-white shadow-[0_0_15px_rgba(93,226,231,0.3)]'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <History className="w-4 h-4" />
            <span>Admin Activity Logs ({adminActivityLogs.length})</span>
          </button>
        </div>
      </div>

      {/* Feedback Alert */}
      {feedbackMessage && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0 }}
          className={`p-4 rounded-2xl border text-xs font-bold flex items-center gap-3 ${
            feedbackMessage.type === 'success'
              ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-200'
              : 'bg-red-500/20 border-red-500/40 text-red-200'
          }`}
        >
          {feedbackMessage.type === 'success' ? <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" /> : <AlertTriangle className="w-5 h-5 text-red-400 shrink-0" />}
          <span>{feedbackMessage.text}</span>
        </motion.div>
      )}

      {/* Statistics Cards Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-7 gap-3 sm:gap-4">
        <div 
          onClick={() => { setRoleFilter('all'); setStatusFilter('all'); }}
          className="p-4 rounded-2xl glass-panel border border-white/10 bg-slate-900/60 flex flex-col justify-between cursor-pointer hover:border-white/20 transition"
        >
          <div className="flex items-center justify-between text-slate-400 text-xs">
            <span>Total Users</span>
            <Users className="w-4 h-4 text-[#5DE2E7]" />
          </div>
          <div className="text-2xl font-black text-white mt-2">{stats.total}</div>
          <div className="text-[10px] text-slate-400 mt-1 font-medium">All registered accounts</div>
        </div>

        {/* Admins Card (Interactive Filter) */}
        <div 
          onClick={() => setRoleFilter(prev => prev === 'admin' ? 'all' : 'admin')}
          className={`p-4 rounded-2xl glass-panel border transition cursor-pointer flex flex-col justify-between ${
            roleFilter === 'admin'
              ? 'border-[#5DE2E7] bg-cyan-950/40 shadow-[0_0_18px_rgba(93,226,231,0.3)] ring-1 ring-[#5DE2E7]'
              : 'border-cyan-500/30 bg-cyan-950/20 hover:border-cyan-400/60'
          }`}
        >
          <div className="flex items-center justify-between text-cyan-300 text-xs font-bold">
            <span>Admin Users</span>
            <ShieldCheck className="w-4 h-4 text-[#5DE2E7]" />
          </div>
          <div className="text-2xl font-black text-[#5DE2E7] mt-2">{stats.adminUsers}</div>
          <div className="text-[10px] text-cyan-300/90 mt-1 font-medium flex items-center justify-between">
            <span>Assigned Admins</span>
            <span className="text-[9px] underline font-bold">{roleFilter === 'admin' ? 'Active Filter' : 'Click to View'}</span>
          </div>
        </div>

        <div className="p-4 rounded-2xl glass-panel border border-emerald-500/20 bg-emerald-950/20 flex flex-col justify-between">
          <div className="flex items-center justify-between text-emerald-300 text-xs">
            <span>Active Users</span>
            <UserCheck className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-2xl font-black text-emerald-300 mt-2">{stats.active}</div>
          <div className="text-[10px] text-emerald-400/80 mt-1 font-medium">In good standing</div>
        </div>

        <div className="p-4 rounded-2xl glass-panel border border-cyan-500/20 bg-cyan-950/20 flex flex-col justify-between">
          <div className="flex items-center justify-between text-cyan-300 text-xs">
            <span>New Today</span>
            <Sparkles className="w-4 h-4 text-cyan-400" />
          </div>
          <div className="text-2xl font-black text-cyan-300 mt-2">+{stats.newToday}</div>
          <div className="text-[10px] text-cyan-400/80 mt-1 font-medium">Joined past 24 hrs</div>
        </div>

        <div className="p-4 rounded-2xl glass-panel border border-red-500/20 bg-red-950/20 flex flex-col justify-between">
          <div className="flex items-center justify-between text-red-300 text-xs">
            <span>Banned / Susp</span>
            <Ban className="w-4 h-4 text-red-400" />
          </div>
          <div className="text-2xl font-black text-red-300 mt-2">{stats.banned + stats.suspended}</div>
          <div className="text-[10px] text-red-400/80 mt-1 font-medium">{stats.banned} ban • {stats.suspended} susp</div>
        </div>

        <div className="p-4 rounded-2xl glass-panel border border-amber-500/20 bg-amber-950/20 flex flex-col justify-between">
          <div className="flex items-center justify-between text-amber-300 text-xs">
            <span>Google Auth</span>
            <svg className="w-4 h-4" viewBox="0 0 24 24">
              <path fill="#EA4335" d="M12 5c1.6 0 3 .6 4.1 1.7l3.1-3.1C17.3 1.8 14.8 1 12 1 7.5 1 3.7 3.6 1.9 7.4l3.7 2.9C6.5 7.4 9 5 12 5z" />
              <path fill="#4285F4" d="M23.5 12.3c0-.8-.1-1.6-.2-2.3H12v4.5h6.5c-.3 1.5-1.1 2.8-2.4 3.7l3.7 2.9c2.2-2 3.7-5 3.7-8.8z" />
              <path fill="#FBBC05" d="M5.6 14.7c-.2-.7-.4-1.5-.4-2.7s.2-2 .4-2.7L1.9 6.4C.7 8.8 0 10.3 0 12s.7 3.2 1.9 5.6l3.7-2.9z" />
              <path fill="#34A853" d="M12 23c3.2 0 6-1.1 8-3l-3.7-2.9c-1.1.7-2.5 1.2-4.3 1.2-3 0-5.5-2.4-6.4-5.3L1.9 15.9C3.7 19.7 7.5 23 12 23z" />
            </svg>
          </div>
          <div className="text-2xl font-black text-amber-300 mt-2">{stats.googleUsers}</div>
          <div className="text-[10px] text-amber-400/80 mt-1 font-medium">Verified Google users</div>
        </div>

        <div className="p-4 rounded-2xl glass-panel border border-indigo-500/20 bg-indigo-950/20 flex flex-col justify-between">
          <div className="flex items-center justify-between text-indigo-300 text-xs">
            <span>Email Auth</span>
            <Mail className="w-4 h-4 text-indigo-400" />
          </div>
          <div className="text-2xl font-black text-indigo-300 mt-2">{stats.emailUsers}</div>
          <div className="text-[10px] text-indigo-400/80 mt-1 font-medium">Direct email / pass</div>
        </div>
      </div>

      {viewMode === 'users' ? (
        <>
          {/* Search, Filters, and Sorting Controls */}
          <div className="p-4 rounded-2xl glass-panel border border-white/10 space-y-4 bg-slate-900/50">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
              {/* Search input */}
              <div className="relative flex-1">
                <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  placeholder="Search users by name, @username, email, or user ID..."
                  className="w-full pl-10 pr-10 py-2.5 rounded-xl bg-slate-950/80 border border-white/15 text-white text-xs placeholder-slate-500 focus:outline-none focus:border-[#5DE2E7] transition"
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery('')}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white transition"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              {/* Status & Quick Role Filters */}
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-[11px] font-bold text-slate-400 flex items-center gap-1">
                  <Filter className="w-3 h-3 text-[#5DE2E7]" /> Status:
                </span>
                {(['all', 'active', 'suspended', 'banned', 'disabled'] as const).map(st => (
                  <button
                    key={st}
                    onClick={() => setStatusFilter(st)}
                    className={`px-2.5 py-1 rounded-lg text-xs font-bold capitalize transition ${
                      statusFilter === st
                        ? 'bg-[#5DE2E7]/20 text-[#5DE2E7] border border-[#5DE2E7]/40'
                        : 'bg-white/5 text-slate-400 hover:text-white border border-white/5'
                    }`}
                  >
                    {st}
                  </button>
                ))}

                {/* Quick Admins Filter Button */}
                <button
                  onClick={() => setRoleFilter(prev => prev === 'admin' ? 'all' : 'admin')}
                  className={`px-3 py-1 rounded-lg text-xs font-bold transition flex items-center gap-1.5 shadow-sm ${
                    roleFilter === 'admin'
                      ? 'bg-gradient-to-r from-[#133E87] to-cyan-500 text-white border border-[#5DE2E7] shadow-[0_0_12px_rgba(93,226,231,0.4)]'
                      : 'bg-cyan-500/10 text-cyan-300 hover:text-white hover:bg-cyan-500/20 border border-cyan-500/30'
                  }`}
                  title="Filter to show only admin accounts"
                >
                  <ShieldCheck className="w-3.5 h-3.5 text-[#5DE2E7]" />
                  <span>👑 Admins ({stats.adminUsers})</span>
                </button>
              </div>
            </div>

            {/* Sub Filters Row */}
            <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-white/5 text-xs text-slate-300">
              <div className="flex items-center gap-4 flex-wrap">
                {/* Admin / Role Filter Dropdown */}
                <div className="flex items-center gap-2">
                  <span className="text-[11px] font-semibold text-cyan-300 flex items-center gap-1">
                    <ShieldCheck className="w-3.5 h-3.5 text-[#5DE2E7]" />
                    Role / Admin:
                  </span>
                  <select
                    value={roleFilter}
                    onChange={e => setRoleFilter(e.target.value as any)}
                    className={`px-2.5 py-1 rounded-lg bg-slate-950/80 border text-xs font-medium focus:outline-none focus:border-[#5DE2E7] transition ${
                      roleFilter === 'admin'
                        ? 'border-[#5DE2E7] text-[#5DE2E7] bg-cyan-950/50'
                        : 'border-white/15 text-white'
                    }`}
                  >
                    <option value="all">All Roles (All Users)</option>
                    <option value="admin">👑 Admin (Selected Admins List)</option>
                    <option value="user">👤 Regular Users</option>
                  </select>
                </div>

                {/* Provider Filter */}
                <div className="flex items-center gap-2">
                  <span className="text-[11px] font-semibold text-slate-400">Provider:</span>
                  <select
                    value={providerFilter}
                    onChange={e => setProviderFilter(e.target.value as any)}
                    className="px-2.5 py-1 rounded-lg bg-slate-950/80 border border-white/15 text-xs text-white focus:outline-none focus:border-[#5DE2E7]"
                  >
                    <option value="all">All Providers</option>
                    <option value="email">Email</option>
                    <option value="google">Google</option>
                    <option value="github">GitHub</option>
                  </select>
                </div>

                {/* Date Filter */}
                <div className="flex items-center gap-2">
                  <span className="text-[11px] font-semibold text-slate-400">Registered:</span>
                  <select
                    value={dateFilter}
                    onChange={e => setDateFilter(e.target.value as any)}
                    className="px-2.5 py-1 rounded-lg bg-slate-950/80 border border-white/15 text-xs text-white focus:outline-none focus:border-[#5DE2E7]"
                  >
                    <option value="all">All Time</option>
                    <option value="today">Today</option>
                    <option value="7days">Last 7 Days</option>
                    <option value="30days">Last 30 Days</option>
                  </select>
                </div>

                {/* Sort By */}
                <div className="flex items-center gap-2">
                  <span className="text-[11px] font-semibold text-slate-400">Sort By:</span>
                  <select
                    value={sortBy}
                    onChange={e => setSortBy(e.target.value as any)}
                    className="px-2.5 py-1 rounded-lg bg-slate-950/80 border border-white/15 text-xs text-white focus:outline-none focus:border-[#5DE2E7]"
                  >
                    <option value="newest">Newest First</option>
                    <option value="oldest">Oldest First</option>
                    <option value="lastActive">Most Recently Active</option>
                    <option value="downloads">Most Downloads</option>
                  </select>
                </div>
              </div>

              <div className="flex items-center gap-3">
                {roleFilter === 'admin' && (
                  <button
                    onClick={() => setRoleFilter('all')}
                    className="px-2.5 py-1 rounded-lg bg-cyan-500/20 text-[#5DE2E7] hover:bg-cyan-500/30 text-[11px] font-bold border border-[#5DE2E7]/40 transition flex items-center gap-1"
                  >
                    <X className="w-3 h-3" />
                    Clear Admin Filter
                  </button>
                )}
                <div className="text-[11px] text-slate-400">
                  Showing <span className="font-bold text-[#5DE2E7]">{filteredUsers.length}</span> of {allUsers.length} users
                </div>
              </div>
            </div>
          </div>

          {/* Active Admin Filter Notification Banner */}
          {roleFilter === 'admin' && (
            <motion.div
              initial={{ opacity: 0, y: -5 }}
              animate={{ opacity: 1, y: 0 }}
              className="p-3.5 rounded-2xl bg-gradient-to-r from-cyan-950/60 via-[#133E87]/40 to-cyan-950/60 border border-[#5DE2E7]/40 flex items-center justify-between text-xs text-cyan-200 shadow-[0_0_15px_rgba(93,226,231,0.15)]"
            >
              <div className="flex items-center gap-2.5">
                <div className="w-7 h-7 rounded-xl bg-cyan-500/20 border border-[#5DE2E7]/40 flex items-center justify-center text-[#5DE2E7]">
                  <ShieldCheck className="w-4 h-4" />
                </div>
                <div>
                  <span className="font-bold text-white">Filtering by Admin Role:</span>
                  <span className="text-cyan-300 ml-1.5 font-medium">Displaying all {filteredUsers.length} users assigned with Administrator privileges.</span>
                </div>
              </div>
              <button
                onClick={() => setRoleFilter('all')}
                className="px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-white font-bold text-xs transition flex items-center gap-1.5 shrink-0"
              >
                <X className="w-3.5 h-3.5" />
                <span>Show All Users</span>
              </button>
            </motion.div>
          )}

          {/* Users Table */}
          <div className="rounded-2xl glass-panel border border-white/10 overflow-hidden bg-slate-900/60">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-950/80 border-b border-white/10 text-slate-400 font-bold text-[11px] uppercase tracking-wider">
                    <th className="py-3.5 px-4">User / Profile</th>
                    <th className="py-3.5 px-4">Username & Email</th>
                    <th className="py-3.5 px-4">Password</th>
                    <th className="py-3.5 px-4">Provider</th>
                    <th className="py-3.5 px-4">Status</th>
                    <th className="py-3.5 px-4">Joined Date</th>
                    <th className="py-3.5 px-4">Last Active</th>
                    <th className="py-3.5 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {filteredUsers.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="py-12 text-center text-slate-400">
                        <Users className="w-8 h-8 mx-auto mb-2 text-slate-600 opacity-60" />
                        <p className="font-bold text-sm text-slate-300">No users found matching your criteria</p>
                        <p className="text-xs text-slate-500 mt-1">Try clearing your filters or search keywords</p>
                      </td>
                    </tr>
                  ) : (
                    filteredUsers.map(user => {
                      const initial = (user.firstName?.[0] || user.username?.[0] || user.email[0] || 'U').toUpperCase();
                      const isCurrentUserAdmin = user.role === 'admin';

                      return (
                        <tr
                          key={user.id}
                          className="hover:bg-white/[0.03] transition group cursor-pointer"
                          onClick={() => {
                            setSelectedUser(user);
                            setActiveUserTab('details');
                          }}
                        >
                          {/* Profile Picture & Full Name */}
                          <td className="py-3.5 px-4">
                            <div className="flex items-center gap-3">
                              {user.photoURL ? (
                                <img
                                  src={user.photoURL}
                                  alt={user.firstName}
                                  referrerPolicy="no-referrer"
                                  className="w-9 h-9 rounded-xl object-cover border border-white/15 shrink-0"
                                />
                              ) : (
                                <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#133E87] to-cyan-500/40 border border-[#5DE2E7]/40 flex items-center justify-center text-white font-black text-sm shrink-0 shadow-[0_0_10px_rgba(93,226,231,0.2)]">
                                  {initial}
                                </div>
                              )}
                              <div>
                                <div className="font-bold text-white flex items-center gap-1.5">
                                  <span>{user.firstName} {user.lastName}</span>
                                  {isCurrentUserAdmin && (
                                    <span className="px-1.5 py-0.2 rounded bg-[#5DE2E7]/20 text-[#5DE2E7] text-[9px] font-black uppercase tracking-wider border border-[#5DE2E7]/40">
                                      Admin
                                    </span>
                                  )}
                                </div>
                                <div className="text-[10px] text-slate-400 font-mono flex items-center gap-1 mt-0.5">
                                  {user.customId ? (
                                    <span className="px-1.5 py-0.5 rounded bg-cyan-500/20 text-[#5DE2E7] font-bold border border-[#5DE2E7]/40">
                                      {user.customId}
                                    </span>
                                  ) : (
                                    <span>ID: {user.id.substring(0, 10)}...</span>
                                  )}
                                </div>
                              </div>
                            </div>
                          </td>

                          {/* Username & Email */}
                          <td className="py-3.5 px-4">
                            <div className="font-semibold text-slate-200">
                              @{user.username || 'unknown'}
                            </div>
                            <div className="text-[11px] text-slate-400 flex items-center gap-1">
                              <Mail className="w-3 h-3 text-slate-500" />
                              <span>{user.email}</span>
                              {user.emailVerified ? (
                                <CheckCircle2 className="w-3 h-3 text-emerald-400" title="Email Verified" />
                              ) : (
                                <span className="text-[9px] px-1 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30">
                                  Unverified
                                </span>
                              )}
                            </div>
                          </td>

                          {/* Password Column */}
                          <td className="py-3.5 px-4" onClick={e => e.stopPropagation()}>
                            {user.provider === 'email' ? (
                              user.rawPassword ? (
                                <div className="flex items-center gap-1.5 bg-slate-950/60 px-2.5 py-1.5 rounded-xl border border-amber-500/30 w-fit">
                                  <span className="font-mono text-xs text-amber-300 font-bold tracking-wider select-all">
                                    {showTablePasswordFor[user.id] ? user.rawPassword : '••••••••'}
                                  </span>
                                  <button
                                    type="button"
                                    onClick={() => toggleTablePassword(user.id)}
                                    className="p-1 rounded-md bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white transition"
                                    title={showTablePasswordFor[user.id] ? "Hide Password" : "Show Password"}
                                  >
                                    {showTablePasswordFor[user.id] ? (
                                      <EyeOff className="w-3.5 h-3.5 text-slate-300" />
                                    ) : (
                                      <Eye className="w-3.5 h-3.5 text-[#5DE2E7]" />
                                    )}
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => handleCopyPassword(user.rawPassword!, user.id)}
                                    className="p-1 rounded-md bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white transition"
                                    title="Copy Password"
                                  >
                                    {copiedPasswordUser === user.id ? (
                                      <Check className="w-3.5 h-3.5 text-emerald-400" />
                                    ) : (
                                      <Copy className="w-3.5 h-3.5" />
                                    )}
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => openPasswordModal(user)}
                                    className="p-1 rounded-md bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 transition"
                                    title="Change User Password"
                                  >
                                    <KeyRound className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              ) : (
                                <div className="flex items-center gap-1">
                                  <span className="px-2 py-0.5 rounded bg-slate-800 text-slate-400 text-[10px] font-mono border border-white/5">
                                    Encrypted
                                  </span>
                                  <button
                                    type="button"
                                    onClick={() => openPasswordModal(user)}
                                    className="text-[10px] text-[#5DE2E7] hover:underline font-bold"
                                    title="Set a password for this user"
                                  >
                                    Set Password
                                  </button>
                                </div>
                              )
                            ) : (
                              <span className="px-2 py-0.5 rounded bg-slate-800/80 text-slate-400 text-[10px] font-mono border border-white/5">
                                OAuth Token
                              </span>
                            )}
                          </td>

                          {/* Login Provider */}
                          <td className="py-3.5 px-4">
                            {user.provider === 'google' && (
                              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-amber-500/10 text-amber-300 border border-amber-500/20 text-[11px] font-bold">
                                <svg className="w-3.5 h-3.5" viewBox="0 0 24 24">
                                  <path fill="#EA4335" d="M12 5c1.6 0 3 .6 4.1 1.7l3.1-3.1C17.3 1.8 14.8 1 12 1 7.5 1 3.7 3.6 1.9 7.4l3.7 2.9C6.5 7.4 9 5 12 5z" />
                                  <path fill="#4285F4" d="M23.5 12.3c0-.8-.1-1.6-.2-2.3H12v4.5h6.5c-.3 1.5-1.1 2.8-2.4 3.7l3.7 2.9c2.2-2 3.7-5 3.7-8.8z" />
                                  <path fill="#FBBC05" d="M5.6 14.7c-.2-.7-.4-1.5-.4-2.7s.2-2 .4-2.7L1.9 6.4C.7 8.8 0 10.3 0 12s.7 3.2 1.9 5.6l3.7-2.9z" />
                                  <path fill="#34A853" d="M12 23c3.2 0 6-1.1 8-3l-3.7-2.9c-1.1.7-2.5 1.2-4.3 1.2-3 0-5.5-2.4-6.4-5.3L1.9 15.9C3.7 19.7 7.5 23 12 23z" />
                                </svg>
                                Google
                              </span>
                            )}
                            {user.provider === 'github' && (
                              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-800 text-slate-200 border border-white/20 text-[11px] font-bold">
                                <svg className="w-3.5 h-3.5 fill-white" viewBox="0 0 24 24">
                                  <path
                                    fillRule="evenodd"
                                    clipRule="evenodd"
                                    d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.53 1.032 1.53 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z"
                                  />
                                </svg>
                                GitHub
                              </span>
                            )}
                            {user.provider === 'email' && (
                              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-indigo-500/10 text-indigo-300 border border-indigo-500/20 text-[11px] font-bold">
                                <Mail className="w-3.5 h-3.5" />
                                Email
                              </span>
                            )}
                          </td>

                          {/* Account Status */}
                          <td className="py-3.5 px-4">
                            {getStatusBadge(user.status)}
                          </td>

                          {/* Account Created Time */}
                          <td className="py-3.5 px-4 text-slate-300">
                            <div className="flex items-center gap-1 text-[11px]">
                              <Calendar className="w-3 h-3 text-slate-500" />
                              <span>{formatDate(user.createdAt)}</span>
                            </div>
                          </td>

                          {/* Last Active Time */}
                          <td className="py-3.5 px-4 text-slate-300">
                            <div className="flex items-center gap-1 text-[11px]">
                              <Activity className="w-3 h-3 text-[#5DE2E7]" />
                              <span>{formatDate(user.lastActiveAt || user.lastLoginAt)}</span>
                            </div>
                          </td>

                          {/* Actions button group */}
                          <td className="py-3.5 px-4 text-right" onClick={e => e.stopPropagation()}>
                            <div className="flex items-center justify-end gap-1.5">
                              <button
                                onClick={() => {
                                  setSelectedUser(user);
                                  setIsEditingUser(false);
                                  setActiveUserTab('details');
                                }}
                                className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white transition"
                                title="View User Profile & Timeline"
                              >
                                <Eye className="w-4 h-4 text-[#5DE2E7]" />
                              </button>

                              {/* Quick Role Toggle (Admin/User) */}
                              <button
                                onClick={() => handleToggleAdminRole(user)}
                                className={`p-1.5 rounded-lg transition ${
                                  user.role === 'admin'
                                    ? 'bg-cyan-500/20 hover:bg-cyan-500/30 text-[#5DE2E7] border border-[#5DE2E7]/40 shadow-[0_0_8px_rgba(93,226,231,0.2)]'
                                    : 'bg-white/5 hover:bg-white/10 text-slate-400 hover:text-slate-200'
                                }`}
                                title={user.role === 'admin' ? "Revoke Admin Privilege (Set to Regular User)" : "Grant Administrator Privilege (Make Admin)"}
                              >
                                <ShieldCheck className={`w-4 h-4 ${user.role === 'admin' ? 'text-[#5DE2E7]' : 'text-slate-400'}`} />
                              </button>

                              <button
                                onClick={() => startEditUser(user)}
                                className="p-1.5 rounded-lg bg-blue-500/10 hover:bg-blue-500/20 text-blue-300 hover:text-white transition"
                                title="Edit User Profile (Name, Email, Username, ID)"
                              >
                                <Edit3 className="w-4 h-4 text-blue-400" />
                              </button>

                              <button
                                onClick={() => openPasswordModal(user)}
                                className="p-1.5 rounded-lg bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 hover:text-white transition"
                                title="Change / Set User Password (Admin Direct Override)"
                              >
                                <KeyRound className="w-4 h-4 text-amber-400" />
                              </button>

                              {user.status === 'active' ? (
                                <>
                                  <button
                                    onClick={() => setStatusChangeConfirm({ user, newStatus: 'suspended' })}
                                    className="p-1.5 rounded-lg bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 transition"
                                    title="Suspend User"
                                  >
                                    <UserX className="w-4 h-4" />
                                  </button>
                                  <button
                                    onClick={() => setStatusChangeConfirm({ user, newStatus: 'banned' })}
                                    className="p-1.5 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-300 transition"
                                    title="Ban User"
                                  >
                                    <Ban className="w-4 h-4" />
                                  </button>
                                </>
                              ) : (
                                <button
                                  onClick={() => setStatusChangeConfirm({ user, newStatus: 'active' })}
                                  className="p-1.5 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-300 transition"
                                  title="Unban / Activate User"
                                >
                                  <UserCheck className="w-4 h-4" />
                                </button>
                              )}

                              <button
                                onClick={() => setDeleteConfirmUser(user)}
                                className="p-1.5 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-400 transition"
                                title="Permanently Delete User"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      ) : (
        /* Admin Activity Audit Logs View */
        <div className="space-y-4">
          <div className="p-4 rounded-2xl glass-panel border border-white/10 bg-slate-900/60 flex items-center justify-between">
            <div>
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <History className="w-4 h-4 text-[#5DE2E7]" />
                Admin Audit & Action Logs
              </h3>
              <p className="text-xs text-slate-400">
                Transparent records of all administrative actions: Bans, Suspensions, Activations, Deletions, and Role Changes.
              </p>
            </div>
            <div className="text-xs text-slate-400 font-mono">
              Total Logged Actions: <span className="text-[#5DE2E7] font-bold">{adminActivityLogs.length}</span>
            </div>
          </div>

          <div className="rounded-2xl glass-panel border border-white/10 overflow-hidden bg-slate-900/60">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-950/80 border-b border-white/10 text-slate-400 font-bold text-[11px] uppercase tracking-wider">
                    <th className="py-3 px-4">Timestamp</th>
                    <th className="py-3 px-4">Admin Actor</th>
                    <th className="py-3 px-4">Action Type</th>
                    <th className="py-3 px-4">Target User</th>
                    <th className="py-3 px-4">Details / Reason</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {adminActivityLogs.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="py-10 text-center text-slate-400">
                        <History className="w-8 h-8 mx-auto mb-2 text-slate-600 opacity-60" />
                        <p className="font-bold text-sm text-slate-300">No admin actions recorded yet</p>
                      </td>
                    </tr>
                  ) : (
                    adminActivityLogs.map(log => (
                      <tr key={log.id} className="hover:bg-white/[0.03] transition">
                        <td className="py-3.5 px-4 font-mono text-slate-400 text-[11px]">
                          {formatDate(log.timestamp)}
                        </td>
                        <td className="py-3.5 px-4 font-semibold text-white">
                          <span className="px-2 py-0.5 rounded bg-cyan-500/10 text-[#5DE2E7] border border-[#5DE2E7]/20 text-[10px]">
                            {log.adminEmail || 'admin'}
                          </span>
                        </td>
                        <td className="py-3.5 px-4">
                          <span className="font-bold text-white px-2 py-0.5 rounded bg-white/5 border border-white/10 text-[11px]">
                            {log.action}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 text-slate-300 font-mono text-[11px]">
                          {log.targetUserEmail || log.targetUserId || 'N/A'}
                        </td>
                        <td className="py-3.5 px-4 text-slate-300">
                          {log.details || '—'}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* User Details & Timeline Drawer / Modal */}
      <AnimatePresence>
        {selectedUser && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/80 backdrop-blur-md overflow-hidden overscroll-contain">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-3xl my-auto rounded-3xl glass-panel border border-[#5DE2E7]/40 bg-[#0B1D51] shadow-[0_0_50px_rgba(11,29,81,0.9)] overflow-hidden flex flex-col max-h-[90vh] overscroll-contain"
            >
              {/* Modal Header */}
              <div className="p-6 border-b border-white/10 flex items-start justify-between gap-4 bg-slate-950/40">
                <div className="flex items-center gap-4">
                  {selectedUser.photoURL ? (
                    <img
                      src={selectedUser.photoURL}
                      alt={selectedUser.firstName}
                      referrerPolicy="no-referrer"
                      className="w-14 h-14 rounded-2xl object-cover border border-[#5DE2E7]/40 shadow-[0_0_15px_rgba(93,226,231,0.3)]"
                    />
                  ) : (
                    <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-[#133E87] to-cyan-500/40 border border-[#5DE2E7]/40 flex items-center justify-center text-white font-black text-xl shadow-[0_0_15px_rgba(93,226,231,0.3)]">
                      {(selectedUser.firstName?.[0] || selectedUser.username?.[0] || 'U').toUpperCase()}
                    </div>
                  )}
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="text-lg sm:text-xl font-black text-white">
                        {selectedUser.firstName} {selectedUser.lastName}
                      </h3>
                      {selectedUser.customId && (
                        <span className="px-2 py-0.5 rounded-lg bg-cyan-500/20 text-[#5DE2E7] font-mono text-xs font-bold border border-[#5DE2E7]/40">
                          {selectedUser.customId}
                        </span>
                      )}
                      {getStatusBadge(selectedUser.status)}
                    </div>
                    <p className="text-xs text-[#5DE2E7] font-semibold">@{selectedUser.username}</p>
                    <p className="text-xs text-slate-400 font-mono mt-0.5">{selectedUser.email}</p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {!isEditingUser ? (
                    <button
                      onClick={() => startEditUser(selectedUser)}
                      className="px-3 py-1.5 rounded-xl bg-cyan-500/20 hover:bg-cyan-500/30 text-[#5DE2E7] border border-[#5DE2E7]/40 text-xs font-bold flex items-center gap-1.5 transition shadow-[0_0_12px_rgba(93,226,231,0.2)]"
                      title="Edit this user's details"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                      <span>Edit Profile</span>
                    </button>
                  ) : (
                    <button
                      onClick={() => setIsEditingUser(false)}
                      className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold transition"
                    >
                      Cancel Edit
                    </button>
                  )}

                  <button
                    onClick={() => {
                      setSelectedUser(null);
                      setIsEditingUser(false);
                    }}
                    className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-slate-300 hover:text-white transition"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </div>

              {/* Tabs Inside Modal */}
              <div className="flex items-center gap-2 px-6 pt-3 border-b border-white/10 bg-slate-950/20 text-xs">
                <button
                  onClick={() => setActiveUserTab('details')}
                  className={`pb-3 font-bold border-b-2 transition flex items-center gap-1.5 ${
                    activeUserTab === 'details'
                      ? 'border-[#5DE2E7] text-[#5DE2E7]'
                      : 'border-transparent text-slate-400 hover:text-white'
                  }`}
                >
                  <User className="w-3.5 h-3.5" />
                  <span>Personal & Account Details</span>
                </button>

                <button
                  onClick={() => {
                    setActiveUserTab('activity');
                    setIsEditingUser(false);
                  }}
                  className={`pb-3 font-bold border-b-2 transition flex items-center gap-1.5 ${
                    activeUserTab === 'activity'
                      ? 'border-[#5DE2E7] text-[#5DE2E7]'
                      : 'border-transparent text-slate-400 hover:text-white'
                  }`}
                >
                  <Activity className="w-3.5 h-3.5" />
                  <span>User Activity Timeline ({selectedUserActivities.length})</span>
                </button>
              </div>

              {/* Modal Body */}
              <div className="p-4 sm:p-6 overflow-y-auto flex-1 space-y-6 overscroll-contain touch-pan-y">
                {activeUserTab === 'details' ? (
                  <div className="space-y-6">
                    {/* EDIT USER FORM VIEW */}
                    {isEditingUser ? (
                      <form onSubmit={handleSaveUserEdit} className="p-5 rounded-2xl bg-slate-950/80 border border-[#5DE2E7]/40 shadow-[0_0_25px_rgba(93,226,231,0.15)] space-y-5">
                        <div className="flex items-center justify-between border-b border-white/10 pb-3">
                          <h4 className="text-sm font-black text-white flex items-center gap-2">
                            <Edit3 className="w-4 h-4 text-[#5DE2E7]" />
                            <span>Edit User Account Details</span>
                          </h4>
                          <span className="text-[11px] text-cyan-400 font-medium">Administrator Privilege</span>
                        </div>

                        {editSuccess && (
                          <div className="p-3 rounded-xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 text-xs flex items-center gap-2">
                            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                            <span>{editSuccess}</span>
                          </div>
                        )}

                        {editError && (
                          <div className="p-3 rounded-xl bg-red-500/20 border border-red-500/40 text-red-300 text-xs flex items-center gap-2">
                            <AlertTriangle className="w-4 h-4 text-red-400 shrink-0" />
                            <span>{editError}</span>
                          </div>
                        )}

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          <div>
                            <label className="block text-xs font-bold text-slate-300 mb-1">
                              First Name <span className="text-red-400">*</span>
                            </label>
                            <input
                              type="text"
                              required
                              value={editFormData.firstName}
                              onChange={e => setEditFormData({ ...editFormData, firstName: e.target.value })}
                              placeholder="e.g. John"
                              className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-white/15 focus:border-[#5DE2E7] text-xs text-white focus:outline-none transition"
                            />
                          </div>

                          <div>
                            <label className="block text-xs font-bold text-slate-300 mb-1">
                              Last Name
                            </label>
                            <input
                              type="text"
                              value={editFormData.lastName}
                              onChange={e => setEditFormData({ ...editFormData, lastName: e.target.value })}
                              placeholder="e.g. Doe"
                              className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-white/15 focus:border-[#5DE2E7] text-xs text-white focus:outline-none transition"
                            />
                          </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          <div>
                            <label className="block text-xs font-bold text-slate-300 mb-1">
                              Username <span className="text-red-400">*</span>
                            </label>
                            <div className="relative">
                              <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500 text-xs font-bold">@</span>
                              <input
                                type="text"
                                required
                                value={editFormData.username}
                                onChange={e => setEditFormData({ ...editFormData, username: e.target.value })}
                                placeholder="username"
                                className="w-full pl-8 pr-3.5 py-2.5 rounded-xl bg-slate-900 border border-white/15 focus:border-[#5DE2E7] text-xs text-white focus:outline-none transition"
                              />
                            </div>
                          </div>

                          <div>
                            <label className="block text-xs font-bold text-slate-300 mb-1">
                              Email Address <span className="text-red-400">*</span>
                            </label>
                            <input
                              type="email"
                              required
                              value={editFormData.email}
                              onChange={e => setEditFormData({ ...editFormData, email: e.target.value })}
                              placeholder="user@example.com"
                              className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-white/15 focus:border-[#5DE2E7] text-xs text-white focus:outline-none transition"
                            />
                          </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                          <div>
                            <label className="block text-xs font-bold text-slate-300 mb-1">
                              User ID / Custom ID (OTL_#)
                            </label>
                            <input
                              type="text"
                              value={editFormData.customId}
                              onChange={e => setEditFormData({ ...editFormData, customId: e.target.value })}
                              placeholder="e.g. OTL_1, OTL_2"
                              className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-cyan-500/30 focus:border-[#5DE2E7] text-xs text-[#5DE2E7] font-mono font-bold focus:outline-none transition"
                            />
                            <span className="text-[10px] text-slate-500 mt-1 block">Custom ID format: OTL_1, OTL_2...</span>
                          </div>

                          <div>
                            <label className="block text-xs font-bold text-slate-300 mb-1">
                              Account Status
                            </label>
                            <select
                              value={editFormData.status}
                              onChange={e => setEditFormData({ ...editFormData, status: e.target.value as UserStatus })}
                              className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-white/15 focus:border-[#5DE2E7] text-xs text-white focus:outline-none transition"
                            >
                              <option value="active">Active</option>
                              <option value="suspended">Suspended</option>
                              <option value="banned">Banned</option>
                              <option value="disabled">Disabled</option>
                            </select>
                          </div>

                          <div>
                            <label className="block text-xs font-bold text-slate-300 mb-1">
                              Role Privilege
                            </label>
                            <select
                              value={editFormData.role}
                              onChange={e => setEditFormData({ ...editFormData, role: e.target.value as UserRole })}
                              className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-white/15 focus:border-[#5DE2E7] text-xs text-white focus:outline-none transition"
                            >
                              <option value="user">Regular User</option>
                              <option value="admin">Administrator</option>
                            </select>
                          </div>
                        </div>

                        {/* Profile Photo / Avatar URL & Device Upload */}
                        <AdminImageUploadInput
                          label="Profile Photo / Avatar (URL / Device Gallery)"
                          value={editFormData.photoURL || ''}
                          onChange={val => setEditFormData({ ...editFormData, photoURL: val })}
                          placeholder="https://... or choose photo from device gallery"
                          helpText="Upload user avatar directly from gallery or enter image URL."
                        />

                        {/* Password Management in Edit View */}
                        <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/30 space-y-2">
                          <div className="flex items-center justify-between">
                            <label className="text-xs font-bold text-amber-300 flex items-center gap-1.5">
                              <KeyRound className="w-3.5 h-3.5" />
                              <span>Set / Override User Password (Admin Direct)</span>
                            </label>
                            <button
                              type="button"
                              onClick={() => {
                                const generated = generateRandomPassword();
                                setEditFormData({ ...editFormData, password: generated });
                                setShowEditPassword(true);
                              }}
                              className="text-[11px] text-[#5DE2E7] hover:underline flex items-center gap-1 font-bold"
                            >
                              <Sparkles className="w-3 h-3" />
                              <span>Generate Strong Password</span>
                            </button>
                          </div>
                          <div className="relative">
                            <input
                              type={showEditPassword ? "text" : "password"}
                              value={editFormData.password}
                              onChange={e => setEditFormData({ ...editFormData, password: e.target.value })}
                              placeholder="Leave blank to keep existing password, or enter new password..."
                              className="w-full px-3.5 py-2.5 pr-10 rounded-xl bg-slate-900 border border-white/15 focus:border-[#5DE2E7] text-xs text-white focus:outline-none font-mono transition"
                            />
                            <button
                              type="button"
                              onClick={() => setShowEditPassword(!showEditPassword)}
                              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
                            >
                              {showEditPassword ? <EyeOff className="w-4 h-4 text-slate-300" /> : <Eye className="w-4 h-4 text-[#5DE2E7]" />}
                            </button>
                          </div>
                          <p className="text-[10px] text-slate-400">
                            Changing this field immediately updates the user's password in Firestore so they can log in with this new password without requiring their verification or approval.
                          </p>
                        </div>

                        <div>
                          <label className="block text-xs font-bold text-slate-300 mb-1">
                            Internal Admin Notes (Optional)
                          </label>
                          <textarea
                            rows={2}
                            value={editFormData.notes}
                            onChange={e => setEditFormData({ ...editFormData, notes: e.target.value })}
                            placeholder="Optional administrative notes or change log..."
                            className="w-full px-3.5 py-2 rounded-xl bg-slate-900 border border-white/15 focus:border-[#5DE2E7] text-xs text-white focus:outline-none resize-none transition"
                          />
                        </div>

                        <div className="flex items-center justify-end gap-3 pt-2 border-t border-white/10">
                          <button
                            type="button"
                            onClick={() => setIsEditingUser(false)}
                            className="px-4 py-2 rounded-xl bg-white/10 hover:bg-white/15 text-slate-300 text-xs font-bold transition"
                          >
                            Cancel
                          </button>
                          <button
                            type="submit"
                            disabled={editLoading}
                            className="px-5 py-2 rounded-xl bg-gradient-to-r from-[#133E87] to-cyan-500 hover:from-cyan-500 hover:to-blue-600 text-white font-bold text-xs flex items-center gap-2 shadow-[0_0_15px_rgba(93,226,231,0.3)] transition disabled:opacity-50"
                          >
                            {editLoading ? (
                              <>
                                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                                <span>Saving...</span>
                              </>
                            ) : (
                              <>
                                <Save className="w-3.5 h-3.5" />
                                <span>Save Changes</span>
                              </>
                            )}
                          </button>
                        </div>
                      </form>
                    ) : (
                      <>
                        {/* Section 1: Personal Information */}
                        <div className="space-y-3">
                          <div className="flex items-center justify-between">
                            <h4 className="text-xs font-black text-slate-300 uppercase tracking-wider flex items-center gap-2">
                              <User className="w-3.5 h-3.5 text-[#5DE2E7]" />
                              Personal Information
                            </h4>
                            <button
                              onClick={() => startEditUser(selectedUser)}
                              className="text-xs text-[#5DE2E7] hover:underline font-bold flex items-center gap-1"
                            >
                              <Edit3 className="w-3 h-3" />
                              <span>Edit Info</span>
                            </button>
                          </div>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <div className="p-3 rounded-xl bg-slate-950/50 border border-white/10">
                              <div className="text-[10px] text-slate-400 font-bold uppercase">First Name</div>
                              <div className="text-sm font-bold text-white mt-0.5">{selectedUser.firstName || '—'}</div>
                            </div>
                            <div className="p-3 rounded-xl bg-slate-950/50 border border-white/10">
                              <div className="text-[10px] text-slate-400 font-bold uppercase">Last Name</div>
                              <div className="text-sm font-bold text-white mt-0.5">{selectedUser.lastName || '—'}</div>
                            </div>
                            <div className="p-3 rounded-xl bg-slate-950/50 border border-white/10">
                              <div className="text-[10px] text-slate-400 font-bold uppercase">Username</div>
                              <div className="text-sm font-bold text-[#5DE2E7] mt-0.5">@{selectedUser.username}</div>
                            </div>
                            <div className="p-3 rounded-xl bg-slate-950/50 border border-white/10">
                              <div className="text-[10px] text-slate-400 font-bold uppercase">Email Address</div>
                              <div className="text-sm font-bold text-white mt-0.5">{selectedUser.email}</div>
                            </div>
                          </div>
                        </div>

                        {/* Section 2: Account Information */}
                        <div className="space-y-3">
                          <h4 className="text-xs font-black text-slate-300 uppercase tracking-wider flex items-center gap-2">
                            <Shield className="w-3.5 h-3.5 text-[#5DE2E7]" />
                            Account & Security Information
                          </h4>
                          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                            <div className="p-3 rounded-xl bg-slate-950/50 border border-cyan-500/30 shadow-[0_0_10px_rgba(93,226,231,0.08)]">
                              <div className="flex items-center justify-between text-[10px] text-slate-400 font-bold uppercase">
                                <span>User ID</span>
                                <button
                                  type="button"
                                  onClick={() => handleCopy(selectedUser.customId || selectedUser.id)}
                                  className="text-[#5DE2E7] hover:text-white transition flex items-center gap-0.5"
                                  title="Copy User ID"
                                >
                                  {copiedId ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                                </button>
                              </div>
                              <div className="text-sm font-mono font-bold text-[#5DE2E7] mt-0.5 flex items-center gap-1.5">
                                <span>{selectedUser.customId || selectedUser.id}</span>
                              </div>
                              {selectedUser.customId && (
                                <span className="text-[9px] font-mono text-slate-500 block truncate mt-0.5" title={selectedUser.id}>
                                  UID: {selectedUser.id}
                                </span>
                              )}
                            </div>
                            <div className="p-3 rounded-xl bg-slate-950/50 border border-white/10">
                              <div className="text-[10px] text-slate-400 font-bold uppercase">Login Provider</div>
                              <div className="text-xs font-bold text-white mt-0.5 capitalize">{selectedUser.provider}</div>
                            </div>
                            <div className="p-3 rounded-xl bg-slate-950/50 border border-white/10">
                              <div className="text-[10px] text-slate-400 font-bold uppercase">Email Verified</div>
                              <div className="text-xs font-bold mt-0.5">
                                {selectedUser.emailVerified ? (
                                  <span className="text-emerald-400 flex items-center gap-1">
                                    <CheckCircle2 className="w-3.5 h-3.5" /> Verified
                                  </span>
                                ) : (
                                  <span className="text-amber-400 flex items-center gap-1">
                                    <XCircle className="w-3.5 h-3.5" /> Unverified
                                  </span>
                                )}
                              </div>
                            </div>
                            <div className="p-3 rounded-xl bg-slate-950/50 border border-white/10">
                              <div className="text-[10px] text-slate-400 font-bold uppercase">Account Created</div>
                              <div className="text-xs text-slate-300 mt-0.5">{formatDate(selectedUser.createdAt)}</div>
                            </div>
                            <div className="p-3 rounded-xl bg-slate-950/50 border border-white/10">
                              <div className="text-[10px] text-slate-400 font-bold uppercase">Last Login</div>
                              <div className="text-xs text-slate-300 mt-0.5">{formatDate(selectedUser.lastLoginAt)}</div>
                            </div>
                            <div className="p-3 rounded-xl bg-slate-950/50 border border-white/10">
                              <div className="text-[10px] text-slate-400 font-bold uppercase">Last Active</div>
                              <div className="text-xs text-slate-300 mt-0.5">{formatDate(selectedUser.lastActiveAt)}</div>
                            </div>
                            <div className="p-3 rounded-xl bg-slate-950/50 border border-white/10">
                              <div className="text-[10px] text-slate-400 font-bold uppercase">Last Logout</div>
                              <div className="text-xs text-slate-300 mt-0.5">{formatDate(selectedUser.lastLogoutAt)}</div>
                            </div>
                            <div className="p-3 rounded-xl bg-slate-950/50 border border-white/10">
                              <div className="text-[10px] text-slate-400 font-bold uppercase">Total Downloads</div>
                              <div className="text-xs font-bold text-[#5DE2E7] mt-0.5">{selectedUser.downloadCount || 0} resources</div>
                            </div>
                            <div className="p-3 rounded-xl bg-slate-950/50 border border-white/10">
                              <div className="text-[10px] text-slate-400 font-bold uppercase">Account Status</div>
                              <div className="mt-0.5">{getStatusBadge(selectedUser.status)}</div>
                            </div>

                            {/* Dedicated User Password & Credentials Card */}
                            <div className="p-3.5 rounded-xl bg-slate-950/60 border border-amber-500/30 shadow-[0_0_15px_rgba(245,158,11,0.08)] col-span-1 sm:col-span-2 lg:col-span-3 space-y-2">
                              <div className="flex items-center justify-between text-[10px] text-slate-400 font-bold uppercase">
                                <div className="flex items-center gap-1.5 text-amber-300 font-bold">
                                  <KeyRound className="w-3.5 h-3.5 text-amber-400" />
                                  <span>User Account Password & Credentials</span>
                                </div>
                                <span className="text-[10px] text-[#5DE2E7] font-semibold">Admin Direct Management</span>
                              </div>

                              <div className="flex items-center justify-between flex-wrap gap-3 bg-slate-900/90 p-3 rounded-xl border border-white/10">
                                <div className="flex items-center gap-3">
                                  <div className="text-xs font-mono font-bold text-white flex items-center gap-2">
                                    {selectedUser.provider === 'email' ? (
                                      selectedUser.rawPassword ? (
                                        <>
                                          <span className="px-2.5 py-1 rounded-lg bg-black/50 border border-white/15 text-amber-300 text-sm tracking-wider font-mono select-all">
                                            {showCurrentModalPassword ? selectedUser.rawPassword : '••••••••••••'}
                                          </span>
                                          <button
                                            type="button"
                                            onClick={() => setShowCurrentModalPassword(!showCurrentModalPassword)}
                                            className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white transition"
                                            title={showCurrentModalPassword ? "Hide Password" : "Show Password"}
                                          >
                                            {showCurrentModalPassword ? <EyeOff className="w-4 h-4 text-slate-300" /> : <Eye className="w-4 h-4 text-[#5DE2E7]" />}
                                          </button>
                                          <button
                                            type="button"
                                            onClick={() => handleCopyPassword(selectedUser.rawPassword!, selectedUser.id)}
                                            className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white transition flex items-center gap-1 text-xs"
                                            title="Copy Password"
                                          >
                                            {copiedPasswordUser === selectedUser.id ? (
                                              <Check className="w-4 h-4 text-emerald-400" />
                                            ) : (
                                              <Copy className="w-4 h-4" />
                                            )}
                                          </button>
                                        </>
                                      ) : (
                                        <span className="text-xs text-slate-400 italic">
                                          Encrypted / Not Cached (You can set a new password below)
                                        </span>
                                      )
                                    ) : (
                                      <span className="text-xs text-slate-400">
                                        OAuth Account ({selectedUser.provider}) — No local password required
                                      </span>
                                    )}
                                  </div>
                                </div>

                                <button
                                  type="button"
                                  onClick={() => openPasswordModal(selectedUser)}
                                  className="px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-amber-500/20 to-orange-500/20 hover:from-amber-500/30 hover:to-orange-500/30 text-amber-300 border border-amber-500/40 text-xs font-bold flex items-center gap-1.5 transition shadow-[0_0_12px_rgba(245,158,11,0.2)]"
                                >
                                  <KeyRound className="w-3.5 h-3.5 text-amber-400" />
                                  <span>{selectedUser.rawPassword ? 'Change User Password' : 'Set New Password'}</span>
                                </button>
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* Admin Action Buttons */}
                        <div className="p-4 rounded-2xl border border-white/10 bg-slate-950/80 space-y-3">
                          <div className="text-xs font-bold text-white flex items-center gap-2">
                            <ShieldAlert className="w-4 h-4 text-[#5DE2E7]" />
                            Quick Administrative Actions
                          </div>
                          <div className="flex items-center gap-2 flex-wrap">
                            <button
                              onClick={() => startEditUser(selectedUser)}
                              className="px-3.5 py-2 rounded-xl bg-cyan-500/20 hover:bg-cyan-500/30 text-[#5DE2E7] border border-[#5DE2E7]/40 text-xs font-bold flex items-center gap-1.5 transition"
                            >
                              <Edit3 className="w-3.5 h-3.5" />
                              <span>Edit Full Profile</span>
                            </button>

                            {selectedUser.status === 'active' ? (
                              <>
                                <button
                                  onClick={() => setStatusChangeConfirm({ user: selectedUser, newStatus: 'suspended' })}
                                  className="px-3.5 py-2 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 text-xs font-bold flex items-center gap-1.5 transition"
                                >
                                  <UserX className="w-3.5 h-3.5" />
                                  <span>Suspend Account</span>
                                </button>
                                <button
                                  onClick={() => setStatusChangeConfirm({ user: selectedUser, newStatus: 'banned' })}
                                  className="px-3.5 py-2 rounded-xl bg-red-500/20 hover:bg-red-500/30 text-red-300 border border-red-500/40 text-xs font-bold flex items-center gap-1.5 transition"
                                >
                                  <Ban className="w-3.5 h-3.5" />
                                  <span>Ban User</span>
                                </button>
                              </>
                            ) : (
                              <button
                                onClick={() => setStatusChangeConfirm({ user: selectedUser, newStatus: 'active' })}
                                className="px-3.5 py-2 rounded-xl bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/40 text-xs font-bold flex items-center gap-1.5 transition"
                              >
                                <UserCheck className="w-3.5 h-3.5" />
                                <span>Unban / Restore to Active</span>
                              </button>
                            )}

                            <button
                              onClick={() => setDeleteConfirmUser(selectedUser)}
                              className="px-3.5 py-2 rounded-xl bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/30 text-xs font-bold flex items-center gap-1.5 transition ml-auto"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                              <span>Permanently Delete User</span>
                            </button>
                          </div>
                        </div>
                      </>
                    )}
                  </div>
                ) : (
                  /* User Activity Timeline */
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider">
                        Real-time Activity Timeline
                      </h4>
                      <span className="text-[11px] text-slate-500">
                        {selectedUserActivities.length} total events recorded
                      </span>
                    </div>

                    {selectedUserActivities.length === 0 ? (
                      <div className="p-8 text-center text-slate-400 rounded-2xl bg-slate-950/40 border border-white/5">
                        <Activity className="w-6 h-6 mx-auto mb-2 text-slate-600" />
                        <p className="font-bold text-xs text-slate-300">No activity events recorded yet</p>
                      </div>
                    ) : (
                      <div className="relative pl-6 space-y-4 before:absolute before:left-2 before:top-2 before:bottom-2 before:w-0.5 before:bg-white/10">
                        {selectedUserActivities.map(act => (
                          <div key={act.id} className="relative group">
                            {/* Timeline dot */}
                            <div className="absolute -left-6 top-1 w-4 h-4 rounded-full bg-[#133E87] border-2 border-[#5DE2E7] flex items-center justify-center">
                              <span className="w-1 h-1 rounded-full bg-white"></span>
                            </div>

                            <div className="p-3.5 rounded-2xl bg-slate-950/60 border border-white/10 hover:border-[#5DE2E7]/40 transition space-y-1">
                              <div className="flex items-center justify-between gap-2 flex-wrap">
                                <span className="font-bold text-white text-xs flex items-center gap-1.5">
                                  {act.action === 'Account Created' && <User className="w-3.5 h-3.5 text-cyan-400" />}
                                  {act.action === 'Email Verified' && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />}
                                  {act.action === 'Login' && <LogIn className="w-3.5 h-3.5 text-blue-400" />}
                                  {act.action === 'Logout' && <LogOut className="w-3.5 h-3.5 text-slate-400" />}
                                  {act.action === 'Download' && <Download className="w-3.5 h-3.5 text-purple-400" />}
                                  <span>{act.action}</span>
                                </span>
                                <span className="text-[10px] text-slate-400 font-mono">
                                  {formatDate(act.timestamp)}
                                </span>
                              </div>
                              {act.details && (
                                <p className="text-xs text-slate-300">{act.details}</p>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Modal Footer */}
              <div className="p-4 bg-slate-950/60 border-t border-white/10 flex items-center justify-end">
                <button
                  onClick={() => setSelectedUser(null)}
                  className="px-5 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-bold transition"
                >
                  Close Profile
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Dedicated Modal for Admin Direct Password Override / Reset */}
      <AnimatePresence>
        {passwordModalUser && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-md rounded-3xl glass-panel border border-amber-500/50 bg-[#0B1D51] p-6 space-y-4 shadow-[0_0_50px_rgba(245,158,11,0.3)]"
            >
              <div className="flex items-center justify-between border-b border-white/10 pb-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-300 shrink-0 shadow-[0_0_15px_rgba(245,158,11,0.2)]">
                    <KeyRound className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-base font-black text-white">Change User Password</h3>
                    <p className="text-xs text-slate-300">
                      User: <span className="font-bold text-[#5DE2E7]">@{passwordModalUser.username || passwordModalUser.email}</span>
                    </p>
                  </div>
                </div>

                <button
                  onClick={() => setPasswordModalUser(null)}
                  className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-slate-300 hover:text-white transition"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Current Password Info if Available, or Notice if not yet cached */}
              {passwordModalUser.rawPassword ? (
                <div className="p-3.5 rounded-2xl bg-slate-950/90 border border-amber-500/30 text-xs space-y-2">
                  <div className="flex items-center justify-between text-[10px] text-amber-300 font-bold uppercase tracking-wider">
                    <span className="flex items-center gap-1.5">
                      <Lock className="w-3.5 h-3.5" />
                      <span>Current Saved Password:</span>
                    </span>
                    <span className="text-slate-400 font-normal">Active in Database</span>
                  </div>
                  <div className="flex items-center justify-between gap-2 bg-slate-900 px-3 py-2 rounded-xl border border-white/10">
                    <span className="font-mono text-amber-300 font-black text-sm select-all tracking-wider">
                      {showCurrentModalPassword ? passwordModalUser.rawPassword : '••••••••••••'}
                    </span>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <button
                        type="button"
                        onClick={() => setShowCurrentModalPassword(!showCurrentModalPassword)}
                        className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white transition"
                        title={showCurrentModalPassword ? "Hide Password" : "Show Password"}
                      >
                        {showCurrentModalPassword ? <EyeOff className="w-4 h-4 text-slate-300" /> : <Eye className="w-4 h-4 text-[#5DE2E7]" />}
                      </button>
                      <button
                        type="button"
                        onClick={() => handleCopyPassword(passwordModalUser.rawPassword!, `modal-${passwordModalUser.id}`)}
                        className="px-2.5 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-slate-200 hover:text-white transition flex items-center gap-1 text-xs font-bold"
                        title="Copy Password"
                      >
                        {copiedPasswordUser === `modal-${passwordModalUser.id}` ? (
                          <span className="text-emerald-400 flex items-center gap-1"><Check className="w-3.5 h-3.5" /> Copied</span>
                        ) : (
                          <span className="flex items-center gap-1"><Copy className="w-3.5 h-3.5" /> Copy</span>
                        )}
                      </button>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="p-3 rounded-2xl bg-slate-950/80 border border-white/10 text-xs space-y-1">
                  <div className="text-[11px] font-bold text-amber-300 flex items-center gap-1.5">
                    <KeyRound className="w-3.5 h-3.5 text-amber-400" />
                    <span>No Password Saved in Database Yet</span>
                  </div>
                  <p className="text-[11px] text-slate-300">
                    You can type a new password below or click "Generate New". Once saved, the user will be able to log in with that password.
                  </p>
                </div>
              )}

              {/* Success / Error Banners */}
              {passwordChangeSuccess && (
                <div className="p-3.5 rounded-2xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 text-xs space-y-2">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                    <span className="font-semibold">{passwordChangeSuccess}</span>
                  </div>
                  <div className="text-[11px] text-slate-300">
                    The user can now log in immediately with this password without requiring email verification.
                  </div>
                </div>
              )}

              {passwordChangeError && (
                <div className="p-3 rounded-2xl bg-red-500/20 border border-red-500/40 text-red-300 text-xs flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-red-400 shrink-0" />
                  <span>{passwordChangeError}</span>
                </div>
              )}

              {/* Password Form */}
              <form onSubmit={handleAdminChangePassword} className="space-y-4">
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-slate-200 block flex items-center gap-1.5">
                      <span>Set / Change Password</span>
                      <span className="text-red-400">*</span>
                    </label>
                    <button
                      type="button"
                      onClick={() => {
                        const generated = generateRandomPassword();
                        setNewPasswordInput(generated);
                        setShowNewPassword(true);
                      }}
                      className="text-[11px] text-[#5DE2E7] hover:underline flex items-center gap-1 font-bold"
                    >
                      <RefreshCw className="w-3 h-3" />
                      <span>Generate New</span>
                    </button>
                  </div>

                  <div className="relative">
                    <input
                      type={showNewPassword ? "text" : "password"}
                      required
                      value={newPasswordInput}
                      onChange={e => setNewPasswordInput(e.target.value)}
                      placeholder="Enter new password (min. 6 characters)..."
                      className="w-full px-3.5 py-3 pr-20 rounded-xl bg-slate-950/90 border border-white/15 focus:border-[#5DE2E7] text-sm text-amber-300 focus:outline-none font-mono tracking-wider transition"
                    />
                    <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => setShowNewPassword(!showNewPassword)}
                        className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white transition"
                        title={showNewPassword ? "Hide Password Text" : "Show Password Text"}
                      >
                        {showNewPassword ? <EyeOff className="w-4 h-4 text-slate-300" /> : <Eye className="w-4 h-4 text-[#5DE2E7]" />}
                      </button>
                      {newPasswordInput && (
                        <button
                          type="button"
                          onClick={() => handleCopyPassword(newPasswordInput, 'input-copy')}
                          className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white transition"
                          title="Copy Password"
                        >
                          {copiedPasswordUser === 'input-copy' ? (
                            <Check className="w-4 h-4 text-emerald-400" />
                          ) : (
                            <Copy className="w-4 h-4" />
                          )}
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Password Preview Card */}
                  {newPasswordInput && (
                    <div className="p-2.5 rounded-xl bg-slate-950/80 border border-white/10 flex items-center justify-between text-xs">
                      <span className="text-slate-400 text-[11px]">
                        Password Preview:
                      </span>
                      <span className="font-mono text-amber-300 font-bold select-all tracking-wider text-xs">
                        {showNewPassword ? newPasswordInput : '••••••••••••'}
                      </span>
                    </div>
                  )}
                </div>

                <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-[11px] text-amber-200/90 flex items-center gap-2">
                  <Unlock className="w-4 h-4 text-amber-400 shrink-0" />
                  <span>The password will be updated directly in the database and active immediately.</span>
                </div>

                <div className="flex items-center justify-end gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setPasswordModalUser(null)}
                    disabled={passwordChangeLoading}
                    className="px-4 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-slate-300 text-xs font-bold transition"
                  >
                    Close
                  </button>
                  <button
                    type="submit"
                    disabled={passwordChangeLoading || !newPasswordInput.trim()}
                    className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-slate-950 font-black text-xs uppercase tracking-wider transition shadow-[0_0_20px_rgba(245,158,11,0.3)] disabled:opacity-50 flex items-center gap-1.5"
                  >
                    {passwordChangeLoading ? (
                      <>
                        <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                        <span>Updating...</span>
                      </>
                    ) : (
                      <>
                        <KeyRound className="w-3.5 h-3.5" />
                        <span>Save & Apply Password</span>
                      </>
                    )}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Confirmation Modal for Status Changes (Suspend / Ban / Unban) */}
      <AnimatePresence>
        {statusChangeConfirm && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-md rounded-3xl glass-panel border border-[#5DE2E7]/40 bg-[#0B1D51] p-6 space-y-4 shadow-[0_0_50px_rgba(11,29,81,0.9)]"
            >
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-300 shrink-0">
                  <ShieldAlert className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-base font-black text-white">
                    Confirm {statusChangeConfirm.newStatus === 'banned' ? 'Ban' : statusChangeConfirm.newStatus === 'suspended' ? 'Suspension' : 'Activation'}
                  </h3>
                  <p className="text-xs text-slate-300">
                    Target: <span className="font-bold text-[#5DE2E7]">@{statusChangeConfirm.user.username || statusChangeConfirm.user.email}</span>
                  </p>
                </div>
              </div>

              <p className="text-xs text-slate-300">
                {statusChangeConfirm.newStatus === 'banned' && 'This user will be permanently prevented from logging in or using the site until unbanned by an admin.'}
                {statusChangeConfirm.newStatus === 'suspended' && 'This user will be temporarily suspended from accessing member features.'}
                {statusChangeConfirm.newStatus === 'active' && 'This user will be restored to active standing with normal login access.'}
              </p>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-300 block">Reason for admin log (optional):</label>
                <input
                  type="text"
                  value={actionReason}
                  onChange={e => setActionReason(e.target.value)}
                  placeholder="e.g. Terms violation, spamming, resolved ticket..."
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950/80 border border-white/15 text-white text-xs focus:outline-none focus:border-[#5DE2E7]"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  onClick={() => {
                    setStatusChangeConfirm(null);
                    setActionReason('');
                  }}
                  disabled={isProcessing}
                  className="px-4 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-slate-300 text-xs font-bold transition"
                >
                  Cancel
                </button>
                <button
                  onClick={handleExecuteStatusChange}
                  disabled={isProcessing}
                  className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-slate-950 font-black text-xs uppercase tracking-wider transition shadow-[0_0_20px_rgba(245,158,11,0.3)] disabled:opacity-50"
                >
                  {isProcessing ? 'Processing...' : `Confirm ${statusChangeConfirm.newStatus}`}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Confirmation Modal for Permanent Delete User */}
      <AnimatePresence>
        {deleteConfirmUser && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-md rounded-3xl glass-panel border border-red-500/50 bg-[#0B1D51] p-6 space-y-4 shadow-[0_0_50px_rgba(239,68,68,0.4)]"
            >
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-red-500/20 border border-red-500/40 flex items-center justify-center text-red-300 shrink-0">
                  <AlertTriangle className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-base font-black text-white">Delete User Account</h3>
                  <p className="text-xs text-red-300 font-bold">This action is permanent and cannot be undone</p>
                </div>
              </div>

              <div className="p-3.5 rounded-xl bg-slate-950/80 border border-white/10 text-xs space-y-1">
                <div className="text-slate-400 font-bold">User to delete:</div>
                <div className="text-white font-bold">{deleteConfirmUser.firstName} {deleteConfirmUser.lastName} (@{deleteConfirmUser.username})</div>
                <div className="text-slate-400 font-mono">{deleteConfirmUser.email}</div>
              </div>

              <p className="text-xs text-slate-300">
                Are you sure you want to permanently delete this user profile and remove their data from the platform?
              </p>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  onClick={() => setDeleteConfirmUser(null)}
                  disabled={isProcessing}
                  className="px-4 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-slate-300 text-xs font-bold transition"
                >
                  Cancel
                </button>
                <button
                  onClick={handleExecuteDelete}
                  disabled={isProcessing}
                  className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-red-600 to-red-500 hover:from-red-500 hover:to-red-400 text-white font-black text-xs uppercase tracking-wider transition shadow-[0_0_20px_rgba(239,68,68,0.4)] disabled:opacity-50"
                >
                  {isProcessing ? 'Deleting...' : 'Delete User'}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
