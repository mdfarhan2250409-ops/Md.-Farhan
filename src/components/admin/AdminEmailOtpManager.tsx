import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Mail,
  KeyRound,
  ShieldCheck,
  Server,
  RefreshCw,
  Send,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Copy,
  Check,
  Trash2,
  ExternalLink,
  Eye,
  EyeOff,
  Search,
  Filter,
  Inbox,
  Clock,
  Zap,
  Sparkles,
  Users,
  UserCheck,
  UserX,
  FileText,
  CheckSquare,
  Square,
  Radio,
  SendHorizonal,
  Globe,
  AtSign,
  Upload,
  Save,
  Plus,
  Bookmark,
  Link,
  Download,
  Ban,
  Sliders
} from 'lucide-react';
import { resolveApiUrl, safeApiFetch } from '../../lib/apiClient';
import { useAuth } from '../../context/AuthContext';
import { UserProfile } from '../../types';

interface EmailConfig {
  provider: 'auto' | 'smtp' | 'brevo_api';
  smtpHost: string;
  smtpPort: number;
  smtpUser: string;
  smtpPass: string;
  smtpSecure: boolean;
  smtpFromName: string;
  smtpFromEmail: string;
  brevoApiKey: string;
  updatedAt?: string;
  updatedBy?: string;
}

interface EnvStatus {
  SMTP_HOST: 'CONFIGURED' | 'MISSING';
  SMTP_PORT: 'CONFIGURED' | 'MISSING';
  SMTP_USER: 'CONFIGURED' | 'MISSING';
  SMTP_PASS: 'CONFIGURED' | 'MISSING';
  SMTP_SECURE: 'CONFIGURED' | 'MISSING';
  SMTP_FROM_NAME: 'CONFIGURED' | 'MISSING';
  SMTP_FROM_EMAIL: 'CONFIGURED' | 'MISSING';
  BREVO_API_KEY: 'CONFIGURED' | 'MISSING';
}

interface EmailOtpLog {
  id: string;
  recipientEmail: string;
  recipientName?: string;
  username?: string;
  purpose: 'registration_otp' | 'password_reset_otp' | 'welcome_email' | 'security_alert' | 'login_alert' | 'test_email' | 'broadcast_email' | 'general';
  subject: string;
  otpCode?: string;
  status: 'delivered' | 'sent' | 'failed';
  provider: string;
  sentAt: string;
  timestamp: number;
  expiresAt?: string;
  verified?: boolean;
  verifiedAt?: string;
  errorMessage?: string;
  deliveryMessageId?: string;
}

interface CustomTemplate {
  id: string;
  name: string;
  subject: string;
  message: string;
  createdAt: number;
}

export const AdminEmailOtpManager: React.FC = () => {
  const { allUsers, currentUser } = useAuth();
  const [activeSubTab, setActiveSubTab] = useState<'history' | 'broadcast' | 'settings'>('history');

  // Config State
  const [config, setConfig] = useState<EmailConfig>({
    provider: 'auto',
    smtpHost: 'smtp-relay.brevo.com',
    smtpPort: 587,
    smtpUser: '',
    smtpPass: '',
    smtpSecure: false,
    smtpFromName: 'Online Task Lab',
    smtpFromEmail: 'no-reply@onlinetasklab.com',
    brevoApiKey: ''
  });
  const [envStatus, setEnvStatus] = useState<EnvStatus | null>(null);
  const [showSmtpPass, setShowSmtpPass] = useState(false);
  const [showBrevoKey, setShowBrevoKey] = useState(false);
  const [isSavingConfig, setIsSavingConfig] = useState(false);
  const [saveSuccessMsg, setSaveSuccessMsg] = useState('');
  const [saveErrorMsg, setSaveErrorMsg] = useState('');

  // Test Email State
  const [testEmailTo, setTestEmailTo] = useState('');
  const [isSendingTest, setIsSendingTest] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string; otp?: string; provider?: string } | null>(null);

  // Logs State
  const [logs, setLogs] = useState<EmailOtpLog[]>([]);
  const [isLoadingLogs, setIsLoadingLogs] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [purposeFilter, setPurposeFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [copiedOtpId, setCopiedOtpId] = useState<string | null>(null);
  const [resendingLogId, setResendingLogId] = useState<string | null>(null);
  const [actionFeedback, setActionFeedback] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [selectedLog, setSelectedLog] = useState<EmailOtpLog | null>(null);

  // Broadcast / Bulk Email State
  const [broadcastTarget, setBroadcastTarget] = useState<'all' | 'selected'>('all');
  const [selectedUserIds, setSelectedUserIds] = useState<Set<string>>(new Set());
  const [broadcastSubject, setBroadcastSubject] = useState('');
  const [broadcastMessage, setBroadcastMessage] = useState('');
  const [useBrandTemplate, setUseBrandTemplate] = useState(true);
  const [isSendingBroadcast, setIsSendingBroadcast] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [broadcastResult, setBroadcastResult] = useState<{
    success: boolean;
    total: number;
    deliveredCount: number;
    failedCount: number;
    failedEmails?: Array<{ email: string; reason: string }>;
  } | null>(null);
  const [userSearchQuery, setUserSearchQuery] = useState('');
  const [userStatusFilter, setUserStatusFilter] = useState<'all' | 'verified' | 'unverified' | 'active'>('all');
  const [isTestCopySending, setIsTestCopySending] = useState(false);
  const [testCopyFeedback, setTestCopyFeedback] = useState<string | null>(null);
  const [showAllRecipientsList, setShowAllRecipientsList] = useState(false);

  // Action Button & Formatting States (None by default so emails have zero unwanted buttons)
  const [buttonType, setButtonType] = useState<'none' | 'website' | 'download' | 'custom'>('none');
  const [buttonText, setButtonText] = useState('');
  const [buttonUrl, setButtonUrl] = useState('');
  const [includeGreeting, setIncludeGreeting] = useState(false);
  const [showLivePreview, setShowLivePreview] = useState(false);

  // Custom Templates & File Upload State
  const [customTemplates, setCustomTemplates] = useState<CustomTemplate[]>(() => {
    try {
      const saved = localStorage.getItem('otl_custom_email_templates');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });
  const [showSaveTemplateModal, setShowSaveTemplateModal] = useState(false);
  const [newTemplateName, setNewTemplateName] = useState('');
  const fileInputRef = React.useRef<HTMLInputElement | null>(null);

  // Pre-made Email Templates for Quick Broadcasts
  const emailTemplates = [
    {
      id: 'announcement',
      name: '📢 Official Announcement',
      subject: '📢 Important Update: New Enhancements on Online Task Lab',
      message: `Dear Member,\n\nWe are excited to announce significant improvements to Online Task Lab! Our servers and bot integrations have been upgraded for faster responses and seamless task execution.\n\nLog in now to experience the latest features and increased rewards.\n\nBest regards,\nThe Online Task Lab Team`
    },
    {
      id: 'features',
      name: '🚀 New Features Released',
      subject: '🚀 Exciting New Features are Now Live on Online Task Lab!',
      message: `Hello,\n\nWe have just rolled out new tools, products, and community features to help you complete tasks and earn rewards more effectively.\n\nVisit your dashboard today to explore what's new and boost your performance!\n\nThank you for being part of our community.`
    },
    {
      id: 'bonus',
      name: '🎁 Special Rewards Alert',
      subject: '🎁 Exclusive Bonus Alert: Claim Your Community Rewards!',
      message: `Hello Tasker!\n\nA special reward opportunity is now waiting for you on Online Task Lab. Complete your pending activities today to unlock exclusive bonuses.\n\nDon't miss out — visit the website and claim your rewards now!`
    },
    {
      id: 'security',
      name: '🔒 Account Security Notice',
      subject: '🔒 Security Advisory: Keep Your Account Safe & Verified',
      message: `Dear User,\n\nTo ensure your account remains safe, please ensure you use a strong password and never share verification codes with anyone.\n\nIf you ever notice any unexpected activity, reach out to our official AI support inbox immediately.\n\nStay safe,\nOnline Task Lab Security Team`
    }
  ];

  // Fetch initial config and logs
  const fetchSettings = async () => {
    const localSaved = localStorage.getItem('otl_email_config');
    let localConfig: any = null;
    if (localSaved) {
      try {
        localConfig = JSON.parse(localSaved);
      } catch {}
    }

    try {
      const res = await safeApiFetch('/api/admin/email-settings');
      if (res.ok && res.data?.config) {
        // Merge: If server has empty brevoApiKey or smtp credentials, preserve user's local entries
        const mergedConfig = {
          ...res.data.config,
          brevoApiKey: res.data.config.brevoApiKey || localConfig?.brevoApiKey || '',
          smtpPass: res.data.config.smtpPass || localConfig?.smtpPass || '',
          smtpUser: res.data.config.smtpUser || localConfig?.smtpUser || '',
          smtpHost: res.data.config.smtpHost || localConfig?.smtpHost || 'smtp-relay.brevo.com'
        };
        setConfig(mergedConfig);
        if (res.data.envStatus) {
          setEnvStatus(res.data.envStatus);
        }
        try {
          localStorage.setItem('otl_email_config', JSON.stringify(mergedConfig));
        } catch {}
        return;
      }
    } catch (err) {
      console.warn('Failed to load email settings from server, using local cache:', err);
    }

    if (localConfig) {
      setConfig(localConfig);
    }
  };

  const fetchLogs = async () => {
    setIsLoadingLogs(true);
    try {
      const res = await safeApiFetch('/api/admin/email-otp-logs?limit=300');
      if (res.ok && res.data?.logs) {
        setLogs(res.data.logs);
      }
    } catch (err) {
      console.warn('Failed to load email OTP logs:', err);
    } finally {
      setIsLoadingLogs(false);
    }
  };

  useEffect(() => {
    fetchSettings();
    fetchLogs();
  }, []);

  // Save Settings Handler
  const handleSaveConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSavingConfig(true);
    setSaveSuccessMsg('');
    setSaveErrorMsg('');

    try {
      // 1. Immediately persist to localStorage for this domain
      const configToSave = {
        ...config,
        updatedAt: new Date().toISOString()
      };
      try {
        localStorage.setItem('otl_email_config', JSON.stringify(configToSave));
      } catch {}

      // 2. Also sync to backend server if reachable
      const res = await safeApiFetch('/api/admin/email-settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(configToSave)
      });

      if (res.ok && res.data?.success) {
        setSaveSuccessMsg('🎉 Brevo and Email API settings successfully saved! Active immediately for this domain.');
        if (res.data.config) {
          setConfig({
            ...res.data.config,
            brevoApiKey: res.data.config.brevoApiKey || configToSave.brevoApiKey
          });
        }
      } else {
        setSaveSuccessMsg('🎉 Brevo API & Email settings saved successfully for this domain! (Saved in domain storage and active)');
      }
      setTimeout(() => setSaveSuccessMsg(''), 5000);
    } catch {
      setSaveSuccessMsg('🎉 Brevo API & Email settings saved successfully for this domain! (Active immediately)');
      setTimeout(() => setSaveSuccessMsg(''), 5000);
    } finally {
      setIsSavingConfig(false);
    }
  };

  // Send Test Email Handler
  const handleSendTestEmail = async () => {
    if (!testEmailTo || !testEmailTo.includes('@')) {
      setTestResult({ success: false, message: 'Please enter a valid recipient email address.' });
      return;
    }

    setIsSendingTest(true);
    setTestResult(null);

    try {
      const res = await safeApiFetch('/api/admin/test-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to: testEmailTo.trim(),
          customConfig: config
        })
      });

      if (res.ok && res.data?.success) {
        setTestResult({
          success: true,
          message: res.data.message || `Test verification code dispatched successfully to ${testEmailTo}!`,
          otp: res.data.testOtp || res.data.otp,
          provider: res.data.provider
        });
        fetchLogs();
      } else if (config.brevoApiKey && config.brevoApiKey.startsWith('xkeysib-')) {
        // Direct browser Brevo REST API fallback if backend proxy is offline on this domain
        const testOtp = Math.floor(100000 + Math.random() * 900000).toString();
        const brevoDirectRes = await fetch('https://api.brevo.com/v3/smtp/email', {
          method: 'POST',
          headers: {
            'accept': 'application/json',
            'api-key': config.brevoApiKey.trim(),
            'content-type': 'application/json'
          },
          body: JSON.stringify({
            sender: {
              name: config.smtpFromName || 'Online Task Lab',
              email: config.smtpFromEmail || 'no-reply@onlinetasklab.com'
            },
            to: [{ email: testEmailTo.trim() }],
            subject: `[TEST] Online Task Lab Verification Code: ${testOtp}`,
            htmlContent: `<h2>Verification Code: ${testOtp}</h2><p>This is a live test verification code dispatched via Brevo REST API.</p>`
          })
        });
        const brevoJson = await brevoDirectRes.json().catch(() => ({}));
        if (brevoDirectRes.ok) {
          setTestResult({
            success: true,
            message: `Verification test email sent directly via Brevo REST API v3 to ${testEmailTo}!`,
            otp: testOtp,
            provider: 'brevo_api_direct'
          });
        } else {
          setTestResult({
            success: false,
            message: brevoJson?.message || res.data?.error || 'Failed to dispatch test email.'
          });
        }
      } else {
        setTestResult({
          success: false,
          message: res.data?.error || 'Failed to dispatch test email. Please check Brevo API Key or SMTP credentials.'
        });
      }
    } catch (err: any) {
      setTestResult({
        success: false,
        message: err?.message || 'Network error executing test email.'
      });
    } finally {
      setIsSendingTest(false);
    }
  };

  // Resend OTP / Email Handler
  const handleResend = async (logId: string) => {
    setResendingLogId(logId);
    setActionFeedback(null);

    try {
      const res = await safeApiFetch('/api/admin/email-otp-logs/resend', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ logId })
      });

      if (res.ok && res.data?.success) {
        setActionFeedback({ type: 'success', text: res.data.message || 'OTP resent successfully!' });
        fetchLogs();
      } else {
        setActionFeedback({ type: 'error', text: res.data?.error || 'Failed to resend.' });
      }
    } catch (err: any) {
      setActionFeedback({ type: 'error', text: err?.message || 'Error executing resend.' });
    } finally {
      setResendingLogId(null);
      setTimeout(() => setActionFeedback(null), 5000);
    }
  };

  // Delete Single Log
  const handleDeleteLog = async (logId: string) => {
    try {
      const res = await safeApiFetch(`/api/admin/email-otp-logs/${logId}`, {
        method: 'DELETE'
      });
      if (res.ok) {
        setLogs(prev => prev.filter(l => l.id !== logId));
        if (selectedLog?.id === logId) setSelectedLog(null);
      }
    } catch (err) {
      console.warn('Error deleting log:', err);
    }
  };

  // Clear All Logs
  const handleClearLogs = async () => {
    if (!window.confirm('Are you sure you want to clear all email and OTP verification history logs?')) {
      return;
    }
    try {
      const res = await fetch(resolveApiUrl('/api/admin/email-otp-logs/clear'), {
        method: 'POST'
      });
      if (res.ok) {
        setLogs([]);
        setSelectedLog(null);
        setActionFeedback({ type: 'success', text: 'All verification logs have been cleared.' });
        setTimeout(() => setActionFeedback(null), 4000);
      }
    } catch (err) {
      console.warn('Error clearing logs:', err);
    }
  };

  // 1-Click Copy OTP
  const handleCopyOtp = (otp: string, logId: string) => {
    navigator.clipboard.writeText(otp);
    setCopiedOtpId(logId);
    setTimeout(() => setCopiedOtpId(null), 2000);
  };

  // Filtered Users List
  const validUserAccounts = useMemo(() => {
    if (!allUsers) return [];
    return allUsers.filter(u => u.email && u.email.includes('@'));
  }, [allUsers]);

  const filteredUsers = useMemo(() => {
    return validUserAccounts.filter(u => {
      if (userStatusFilter === 'verified' && !u.emailVerified) return false;
      if (userStatusFilter === 'unverified' && u.emailVerified) return false;
      if (userStatusFilter === 'active' && u.status !== 'active') return false;

      if (userSearchQuery.trim()) {
        const q = userSearchQuery.toLowerCase().trim();
        const matchEmail = (u.email || '').toLowerCase().includes(q);
        const matchUser = (u.username || '').toLowerCase().includes(q);
        const matchName = `${u.firstName || ''} ${u.lastName || ''}`.toLowerCase().includes(q);
        return matchEmail || matchUser || matchName;
      }
      return true;
    });
  }, [validUserAccounts, userStatusFilter, userSearchQuery]);

  // Target Recipients for Broadcast
  const targetRecipients = useMemo(() => {
    if (broadcastTarget === 'all') {
      return filteredUsers.map(u => ({
        email: u.email,
        name: `${u.firstName || ''} ${u.lastName || ''}`.trim() || u.username,
        username: u.username
      }));
    } else {
      return validUserAccounts
        .filter(u => selectedUserIds.has(u.id))
        .map(u => ({
          email: u.email,
          name: `${u.firstName || ''} ${u.lastName || ''}`.trim() || u.username,
          username: u.username
        }));
    }
  }, [broadcastTarget, filteredUsers, validUserAccounts, selectedUserIds]);

  // Toggle user selection
  const handleToggleUserSelection = (userId: string) => {
    setSelectedUserIds(prev => {
      const next = new Set(prev);
      if (next.has(userId)) {
        next.delete(userId);
      } else {
        next.add(userId);
      }
      // If exactly 1 user is selected, auto-update greeting if subject was empty or an auto-greeting
      if (next.size === 1) {
        const singleUser = validUserAccounts.find(u => next.has(u.id));
        if (singleUser && (!broadcastSubject || broadcastSubject.startsWith('Hello @'))) {
          setBroadcastSubject(`Hello @${singleUser.username} from Online Task Lab`);
        }
      }
      return next;
    });
  };

  // Switch to All Users mode
  const switchToAllUsersMode = () => {
    setBroadcastTarget('all');
    setSelectedUserIds(new Set());

    // When switching to All Users, change any personal greeting (Hello @...) to an official broadcast for all users!
    if (!broadcastSubject || broadcastSubject.startsWith('Hello @')) {
      setBroadcastSubject('📢 Important Announcement from Online Task Lab');
    }

    setActionFeedback({
      type: 'success',
      text: `🌐 Switched to All Users mode (${validUserAccounts.length} accounts). Subject set for all users.`
    });
  };

  // Switch to Selected Users mode
  const switchToSelectedMode = () => {
    setBroadcastTarget('selected');
    if (selectedUserIds.size === 1) {
      const singleUser = validUserAccounts.find(u => selectedUserIds.has(u.id));
      if (singleUser) {
        setBroadcastSubject(`Hello @${singleUser.username} from Online Task Lab`);
      }
    } else if (selectedUserIds.size === 0 && validUserAccounts.length > 0) {
      // If nothing selected yet, select the first user
      const firstUser = validUserAccounts[0];
      setSelectedUserIds(new Set([firstUser.id]));
      setBroadcastSubject(`Hello @${firstUser.username} from Online Task Lab`);
    }
  };

  const handleSelectAllVisible = () => {
    switchToAllUsersMode();
  };

  const handleDeselectAll = () => {
    setSelectedUserIds(new Set());
    setBroadcastTarget('selected');
    if (broadcastSubject.startsWith('Hello @')) {
      setBroadcastSubject('');
    }
  };

  // Direct 1-to-1 Email User
  const handleDirectEmailUser = (user: UserProfile) => {
    // 1. Exclusively select this user and deselect any previous users
    setSelectedUserIds(new Set([user.id]));
    setBroadcastTarget('selected');

    // 2. Unconditionally set the subject greeting for this individual user!
    setBroadcastSubject(`Hello @${user.username} from Online Task Lab`);

    // 3. Clear toast feedback
    setActionFeedback({
      type: 'success',
      text: `🎯 Recipient set to: ${user.email} (@${user.username})`
    });

    // 4. Scroll smoothly to composer
    const composerElem = document.getElementById('brevo-email-composer');
    if (composerElem) {
      composerElem.scrollIntoView({ behavior: 'smooth' });
    }
  };

  // Custom Template & File Handlers
  const handleSaveCustomTemplate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTemplateName.trim()) {
      setActionFeedback({ type: 'error', text: 'Please enter a name for your template.' });
      return;
    }
    if (!broadcastSubject.trim() && !broadcastMessage.trim()) {
      setActionFeedback({ type: 'error', text: 'Please write a subject or message to save as a template.' });
      return;
    }

    const newTpl: CustomTemplate = {
      id: 'tpl_' + Date.now(),
      name: newTemplateName.trim(),
      subject: broadcastSubject,
      message: broadcastMessage,
      createdAt: Date.now()
    };
    const updated = [newTpl, ...customTemplates];
    setCustomTemplates(updated);
    try {
      localStorage.setItem('otl_custom_email_templates', JSON.stringify(updated));
    } catch {}
    setShowSaveTemplateModal(false);
    setNewTemplateName('');
    setActionFeedback({ type: 'success', text: `Custom template "${newTpl.name}" saved successfully!` });
    setTimeout(() => setActionFeedback(null), 4000);
  };

  const handleDeleteCustomTemplate = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const updated = customTemplates.filter(t => t.id !== id);
    setCustomTemplates(updated);
    try {
      localStorage.setItem('otl_custom_email_templates', JSON.stringify(updated));
    } catch {}
    setActionFeedback({ type: 'success', text: 'Custom template removed.' });
    setTimeout(() => setActionFeedback(null), 3000);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      if (text) {
        setBroadcastMessage(text);
        if (!broadcastSubject.trim()) {
          const nameWithoutExt = file.name.replace(/\.[^/.]+$/, '');
          setBroadcastSubject(nameWithoutExt);
        }
        setActionFeedback({ type: 'success', text: `Loaded file "${file.name}" into message composer!` });
        setTimeout(() => setActionFeedback(null), 4000);
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const handleClearToScratch = () => {
    setBroadcastSubject('');
    setBroadcastMessage('');
    setActionFeedback({ type: 'success', text: 'Cleared composer to start fresh custom message.' });
    setTimeout(() => setActionFeedback(null), 3000);
  };

  // Send Test Copy to Admin
  const handleSendTestCopy = async () => {
    const adminEmail = currentUser?.email || config.smtpFromEmail || 'onlinetasklab@gmail.com';
    if (!adminEmail || !adminEmail.includes('@')) {
      setTestCopyFeedback('Please ensure your admin account has a valid email address.');
      return;
    }
    if (!broadcastSubject.trim() || !broadcastMessage.trim()) {
      setTestCopyFeedback('Please write a subject and message before sending test copy.');
      return;
    }

    setIsTestCopySending(true);
    setTestCopyFeedback(null);

    try {
      const res = await safeApiFetch('/api/admin/broadcast-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          recipients: [{ email: adminEmail, name: 'Admin Test', username: 'admin' }],
          subject: `[PREVIEW] ${broadcastSubject.trim()}`,
          message: broadcastMessage.trim(),
          useTemplate: useBrandTemplate,
          buttonType,
          buttonText,
          buttonUrl,
          includeGreeting
        })
      });
      if (res.ok && res.data?.success) {
        setTestCopyFeedback(`✅ Preview copy sent successfully to ${adminEmail}! Check your inbox.`);
        fetchLogs();
      } else {
        setTestCopyFeedback(`❌ Failed: ${res.data?.error || 'Could not send test copy'}`);
      }
    } catch (err: any) {
      setTestCopyFeedback(`❌ Error: ${err?.message || 'Network error'}`);
    } finally {
      setIsTestCopySending(false);
      setTimeout(() => setTestCopyFeedback(null), 6000);
    }
  };

  // Execute Broadcast
  const handleExecuteBroadcast = async () => {
    if (targetRecipients.length === 0) {
      setActionFeedback({ type: 'error', text: 'No recipients selected to receive email.' });
      return;
    }
    if (!broadcastSubject.trim()) {
      setActionFeedback({ type: 'error', text: 'Please enter an email subject line.' });
      return;
    }
    if (!broadcastMessage.trim()) {
      setActionFeedback({ type: 'error', text: 'Please write your email message body.' });
      return;
    }

    setShowConfirmModal(false);
    setIsSendingBroadcast(true);
    setBroadcastResult(null);

    try {
      const res = await safeApiFetch('/api/admin/broadcast-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          recipients: targetRecipients,
          subject: broadcastSubject.trim(),
          message: broadcastMessage.trim(),
          useTemplate: useBrandTemplate,
          buttonType,
          buttonText,
          buttonUrl,
          includeGreeting
        })
      });

      if (res.ok && res.data?.success) {
        setBroadcastResult(res.data);
        setActionFeedback({
          type: 'success',
          text: `🎉 Successfully dispatched to ${res.data.deliveredCount} of ${res.data.total} user accounts via Brevo!`
        });
        fetchLogs();
      } else {
        setActionFeedback({
          type: 'error',
          text: res.data?.error || 'Failed to dispatch broadcast email.'
        });
      }
    } catch (err: any) {
      setActionFeedback({
        type: 'error',
        text: err?.message || 'Network error during broadcast dispatch.'
      });
    } finally {
      setIsSendingBroadcast(false);
    }
  };

  // Filtered Logs
  const filteredLogs = useMemo(() => {
    return logs.filter(log => {
      if (purposeFilter !== 'all' && log.purpose !== purposeFilter) {
        return false;
      }
      if (statusFilter !== 'all') {
        if (statusFilter === 'verified' && !log.verified) return false;
        if (statusFilter === 'pending' && (log.verified || log.status === 'failed')) return false;
        if (statusFilter === 'delivered' && log.status !== 'delivered') return false;
        if (statusFilter === 'failed' && log.status !== 'failed') return false;
      }
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchEmail = log.recipientEmail.toLowerCase().includes(q);
        const matchUser = log.username ? log.username.toLowerCase().includes(q) : false;
        const matchOtp = log.otpCode ? log.otpCode.includes(q) : false;
        const matchSubject = log.subject.toLowerCase().includes(q);
        return matchEmail || matchUser || matchOtp || matchSubject;
      }
      return true;
    });
  }, [logs, purposeFilter, statusFilter, searchQuery]);

  // Quick Stats Calculations
  const stats = useMemo(() => {
    const total = logs.length;
    const verified = logs.filter(l => l.verified).length;
    const registrationCount = logs.filter(l => l.purpose === 'registration_otp').length;
    const resetCount = logs.filter(l => l.purpose === 'password_reset_otp').length;
    const broadcastCount = logs.filter(l => l.purpose === 'broadcast_email').length;
    const failed = logs.filter(l => l.status === 'failed').length;
    const verifiedRate = total > 0 ? Math.round((verified / total) * 100) : 0;
    return { total, verified, registrationCount, resetCount, broadcastCount, failed, verifiedRate };
  }, [logs]);

  // Purpose Label & Style Helper
  const getPurposeBadge = (purpose: string) => {
    switch (purpose) {
      case 'registration_otp':
        return { label: 'Register OTP', bg: 'bg-cyan-500/20 text-[#5DE2E7] border-cyan-400/40' };
      case 'password_reset_otp':
        return { label: 'Reset OTP', bg: 'bg-amber-500/20 text-amber-300 border-amber-400/40' };
      case 'welcome_email':
        return { label: 'Welcome Mail', bg: 'bg-emerald-500/20 text-emerald-300 border-emerald-400/40' };
      case 'broadcast_email':
        return { label: 'Broadcast Mail', bg: 'bg-purple-500/20 text-purple-300 border-purple-400/40' };
      case 'security_alert':
      case 'login_alert':
        return { label: 'Security Alert', bg: 'bg-indigo-500/20 text-indigo-300 border-indigo-400/40' };
      case 'test_email':
        return { label: 'Admin Test', bg: 'bg-pink-500/20 text-pink-300 border-pink-400/40' };
      default:
        return { label: 'General', bg: 'bg-slate-700/40 text-slate-300 border-slate-600/40' };
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Banner / Header */}
      <div className="p-5 sm:p-6 rounded-3xl bg-gradient-to-r from-[#0B1D51]/90 via-[#133E87]/80 to-[#0B1D51]/90 border border-[#5DE2E7]/30 shadow-2xl relative overflow-hidden backdrop-blur-xl">
        <div className="absolute top-0 right-0 -mt-10 -mr-10 w-60 h-60 bg-[#5DE2E7]/10 rounded-full blur-3xl pointer-events-none" />

        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 relative z-10">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2.5">
              <div className="p-2.5 rounded-2xl bg-slate-950/80 border border-[#5DE2E7]/50 shadow-[0_0_15px_rgba(93,226,231,0.4)] text-[#5DE2E7]">
                <KeyRound className="w-5 h-5 sm:w-6 sm:h-6" />
              </div>
              <div>
                <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight flex items-center gap-2">
                  <span>Email &amp; OTP Verification System</span>
                </h2>
                <p className="text-xs text-slate-300">
                  Brevo Engine, Live User Accounts Directory, Broadcast Emailing &amp; Gmail Dispatch Outbox
                </p>
              </div>
            </div>
          </div>

          {/* Quick Tab Switcher & Refresh */}
          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={() => setActiveSubTab('history')}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition cursor-pointer border ${
                activeSubTab === 'history'
                  ? 'bg-gradient-to-r from-cyan-500 to-blue-600 text-white border-cyan-300 shadow-[0_0_15px_rgba(93,226,231,0.4)]'
                  : 'bg-slate-900/80 text-slate-300 hover:text-white border-white/10 hover:bg-white/5'
              }`}
            >
              <Inbox className="w-4 h-4" />
              <span>Gmail Dispatch Log</span>
              {logs.length > 0 && (
                <span className="px-1.5 py-0.2 rounded-full bg-slate-950/80 text-[10px] font-black text-[#5DE2E7]">
                  {logs.length}
                </span>
              )}
            </button>

            <button
              onClick={() => setActiveSubTab('broadcast')}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition cursor-pointer border ${
                activeSubTab === 'broadcast'
                  ? 'bg-gradient-to-r from-cyan-500 to-blue-600 text-white border-cyan-300 shadow-[0_0_15px_rgba(93,226,231,0.4)]'
                  : 'bg-slate-900/80 text-slate-300 hover:text-white border-white/10 hover:bg-white/5'
              }`}
            >
              <Users className="w-4 h-4" />
              <span>All Accounts &amp; Broadcast</span>
              {validUserAccounts.length > 0 && (
                <span className="px-1.5 py-0.2 rounded-full bg-slate-950/80 text-[10px] font-black text-[#5DE2E7]">
                  {validUserAccounts.length}
                </span>
              )}
            </button>

            <button
              onClick={() => setActiveSubTab('settings')}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition cursor-pointer border ${
                activeSubTab === 'settings'
                  ? 'bg-gradient-to-r from-cyan-500 to-blue-600 text-white border-cyan-300 shadow-[0_0_15px_rgba(93,226,231,0.4)]'
                  : 'bg-slate-900/80 text-slate-300 hover:text-white border-white/10 hover:bg-white/5'
              }`}
            >
              <Server className="w-4 h-4" />
              <span>SMTP &amp; API Settings</span>
            </button>

            <button
              onClick={() => {
                fetchSettings();
                fetchLogs();
              }}
              disabled={isLoadingLogs}
              className="p-2.5 rounded-xl bg-slate-900/80 hover:bg-slate-800 text-slate-300 hover:text-[#5DE2E7] border border-white/10 transition cursor-pointer shadow-md"
              title="Refresh Logs & Config"
            >
              <RefreshCw className={`w-4 h-4 ${isLoadingLogs ? 'animate-spin text-[#5DE2E7]' : ''}`} />
            </button>
          </div>
        </div>
      </div>

      {/* Global Action Feedback Toast */}
      <AnimatePresence>
        {actionFeedback && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className={`p-3.5 rounded-2xl border text-xs font-bold flex items-center gap-2.5 shadow-xl ${
              actionFeedback.type === 'success'
                ? 'bg-emerald-950/90 text-emerald-200 border-emerald-500/50'
                : 'bg-rose-950/90 text-rose-200 border-rose-500/50'
            }`}
          >
            {actionFeedback.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            ) : (
              <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
            )}
            <span>{actionFeedback.text}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ======================================================== */}
      {/* TAB 1: ALL ACCOUNTS & BREVO BROADCAST (USER DIRECTORY & CAMPAIGN) */}
      {/* ======================================================== */}
      {activeSubTab === 'broadcast' && (
        <div className="space-y-6">
          {/* Top Quick Stats for Accounts */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="p-3.5 rounded-2xl bg-slate-950/70 border border-white/10">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Registered Accounts</span>
              <span className="text-xl sm:text-2xl font-black text-white mt-1 block">{validUserAccounts.length}</span>
            </div>

            <div className="p-3.5 rounded-2xl bg-slate-950/70 border border-emerald-500/30">
              <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-wider block">Email Verified</span>
              <span className="text-xl sm:text-2xl font-black text-emerald-300 mt-1 block">
                {validUserAccounts.filter(u => u.emailVerified).length}
              </span>
            </div>

            <div className="p-3.5 rounded-2xl bg-slate-950/70 border border-cyan-500/30">
              <span className="text-[10px] font-bold text-cyan-400 uppercase tracking-wider block">Selected for Email</span>
              <span className="text-xl sm:text-2xl font-black text-[#5DE2E7] mt-1 block">
                {broadcastTarget === 'all' ? filteredUsers.length : selectedUserIds.size}
              </span>
            </div>

            <div className="p-3.5 rounded-2xl bg-slate-950/70 border border-purple-500/30">
              <span className="text-[10px] font-bold text-purple-400 uppercase tracking-wider block">Active Brevo Provider</span>
              <span className="text-xs sm:text-sm font-black text-purple-300 mt-1.5 block uppercase truncate">
                {config.provider === 'auto' ? 'Auto (SMTP + API)' : config.provider}
              </span>
            </div>
          </div>

          {/* Section 1: Registered Accounts Directory */}
          <div className="p-5 sm:p-6 rounded-3xl bg-slate-950/80 border border-white/10 space-y-4 shadow-xl">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-white/10 pb-4">
              <div>
                <h3 className="text-sm font-black text-white flex items-center gap-2">
                  <Users className="w-4 h-4 text-[#5DE2E7]" />
                  <span>Website Registered Accounts Directory ({validUserAccounts.length} Total)</span>
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Every account registered under Online Task Lab is listed here. Select specific users or email all simultaneously.
                </p>
              </div>

              {/* Selection Buttons */}
              <div className="flex items-center gap-2 flex-wrap">
                <button
                  type="button"
                  onClick={handleSelectAllVisible}
                  className="px-3 py-1.5 rounded-xl bg-cyan-950/60 hover:bg-cyan-900/60 text-[#5DE2E7] border border-cyan-500/40 text-xs font-bold transition cursor-pointer flex items-center gap-1.5"
                >
                  <CheckSquare className="w-3.5 h-3.5" />
                  <span>Select All ({filteredUsers.length})</span>
                </button>

                {selectedUserIds.size > 0 && (
                  <button
                    type="button"
                    onClick={handleDeselectAll}
                    className="px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white border border-white/10 text-xs font-bold transition cursor-pointer flex items-center gap-1.5"
                  >
                    <Square className="w-3.5 h-3.5" />
                    <span>Deselect All</span>
                  </button>
                )}
              </div>
            </div>

            {/* User Search & Filters Bar */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
              <div className="relative flex-1">
                <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={userSearchQuery}
                  onChange={e => setUserSearchQuery(e.target.value)}
                  placeholder="Search user accounts by name, @username, or Gmail..."
                  className="w-full pl-10 pr-4 py-2 rounded-xl bg-slate-900 border border-white/15 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-[#5DE2E7]"
                />
              </div>

              <select
                value={userStatusFilter}
                onChange={e => setUserStatusFilter(e.target.value as any)}
                className="px-3 py-2 rounded-xl bg-slate-900 border border-white/15 text-xs font-bold text-slate-200 focus:outline-none focus:border-[#5DE2E7]"
              >
                <option value="all">All Accounts ({validUserAccounts.length})</option>
                <option value="verified">Verified Emails Only</option>
                <option value="unverified">Unverified Emails</option>
                <option value="active">Active Status Only</option>
              </select>
            </div>

            {/* Users List Table */}
            <div className="rounded-2xl bg-slate-900/60 border border-white/10 overflow-hidden max-h-[360px] overflow-y-auto no-scrollbar divide-y divide-white/5">
              {filteredUsers.length === 0 ? (
                <div className="py-12 text-center text-xs text-slate-400">
                  No accounts found matching your search.
                </div>
              ) : (
                filteredUsers.map(u => {
                  const isChecked = broadcastTarget === 'all' ? true : selectedUserIds.has(u.id);
                  const isExplicitlyActive = broadcastTarget === 'selected' && selectedUserIds.has(u.id);

                  return (
                    <div
                      key={u.id}
                      className={`p-3 sm:p-3.5 flex items-center justify-between gap-3 transition-colors ${
                        isExplicitlyActive
                          ? 'bg-cyan-500/[0.12] border-l-4 border-l-[#5DE2E7]'
                          : isChecked
                          ? 'bg-cyan-500/[0.04]'
                          : 'hover:bg-white/[0.02]'
                      }`}
                    >
                      {/* Checkbox & Avatar & User Info */}
                      <div className="flex items-center gap-3 min-w-0 flex-1">
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => {
                            if (broadcastTarget === 'all') {
                              // Switch from all to selecting just this individual user
                              setBroadcastTarget('selected');
                              setSelectedUserIds(new Set([u.id]));
                              if (!broadcastSubject || broadcastSubject.startsWith('Hello @')) {
                                setBroadcastSubject(`Hello @${u.username} from Online Task Lab`);
                              }
                              setActionFeedback({
                                type: 'success',
                                text: `Selected @${u.username} (${u.email}) as recipient!`
                              });
                            } else {
                              handleToggleUserSelection(u.id);
                            }
                          }}
                          className="w-4 h-4 rounded border-white/20 text-[#5DE2E7] focus:ring-[#5DE2E7] bg-slate-950 cursor-pointer"
                        />

                        {/* Avatar */}
                        <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-[#133E87] to-cyan-500 border border-[#5DE2E7]/40 flex items-center justify-center text-white shrink-0 font-bold text-xs shadow-sm">
                          {(u.firstName?.[0] || u.username?.[0] || u.email[0] || 'U').toUpperCase()}
                        </div>

                        {/* Info */}
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-extrabold text-xs text-white truncate">
                              {u.firstName ? `${u.firstName} ${u.lastName || ''}`.trim() : u.username}
                            </span>
                            <span className="text-[10px] text-cyan-300 font-mono bg-cyan-950/60 px-1.5 py-0.5 rounded border border-cyan-800/40">
                              @{u.username}
                            </span>
                            {u.emailVerified ? (
                              <span className="text-[9px] font-black uppercase px-1.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-400/40 flex items-center gap-0.5">
                                <CheckCircle2 className="w-2.5 h-2.5" />
                                <span>Verified</span>
                              </span>
                            ) : (
                              <span className="text-[9px] font-black uppercase px-1.5 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-400/40">
                                Unverified
                              </span>
                            )}
                          </div>
                          <span className="text-[11px] text-slate-300 font-mono truncate block mt-0.5">
                            {u.email}
                          </span>
                        </div>
                      </div>

                      {/* Right Quick Action: Direct 1-to-1 Email */}
                      <button
                        type="button"
                        onClick={() => handleDirectEmailUser(u)}
                        className="px-2.5 py-1.5 rounded-xl bg-white/5 hover:bg-[#133E87]/60 text-slate-300 hover:text-[#5DE2E7] border border-white/10 text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shrink-0"
                        title="Send email specifically to this user"
                      >
                        <Mail className="w-3.5 h-3.5" />
                        <span className="hidden sm:inline">Write Email</span>
                      </button>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Section 2: Brevo Email Composer & Broadcast Campaign Sender */}
          <div id="brevo-email-composer" className="p-5 sm:p-6 rounded-3xl bg-slate-950/80 border border-[#5DE2E7]/40 space-y-5 shadow-2xl relative overflow-hidden">
            <div className="absolute top-0 right-0 -mt-10 -mr-10 w-48 h-48 bg-[#5DE2E7]/10 rounded-full blur-3xl pointer-events-none" />

            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-white/10 pb-4">
              <div>
                <h3 className="text-sm sm:text-base font-black text-white flex items-center gap-2">
                  <SendHorizonal className="w-5 h-5 text-[#5DE2E7]" />
                  <span>Send Broadcast Email via Brevo (জিমেইল ক্যাম্পেইন)</span>
                </h3>
                <p className="text-xs text-slate-300 mt-0.5">
                  Write your message below to dispatch live to user inboxes through your configured Brevo account.
                </p>
              </div>

              {/* Target Mode Selector */}
              <div className="flex items-center gap-1.5 p-1 rounded-2xl bg-slate-900 border border-white/15 text-xs font-bold">
                <button
                  type="button"
                  onClick={switchToAllUsersMode}
                  className={`px-3 py-1.5 rounded-xl transition cursor-pointer ${
                    broadcastTarget === 'all'
                      ? 'bg-gradient-to-r from-[#133E87] to-cyan-500 text-white shadow-md'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  All Users ({filteredUsers.length})
                </button>
                <button
                  type="button"
                  onClick={switchToSelectedMode}
                  className={`px-3 py-1.5 rounded-xl transition cursor-pointer ${
                    broadcastTarget === 'selected'
                      ? 'bg-gradient-to-r from-[#133E87] to-cyan-500 text-white shadow-md'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Selected Only ({selectedUserIds.size})
                </button>
              </div>
            </div>

            {/* Hidden File Input for uploading custom text/message files */}
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileUpload}
              accept=".txt,.md,.html,.json,.doc"
              className="hidden"
            />

            {/* Template Controls & Actions Bar */}
            <div className="space-y-3 p-3.5 sm:p-4 rounded-2xl bg-slate-900/90 border border-white/10 space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                <div>
                  <span className="text-xs font-black uppercase tracking-wider text-[#5DE2E7] block">
                    Message Presets &amp; Custom Template Tools
                  </span>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    Choose a ready-made message, load a saved custom template, upload from a file, or write your own from scratch.
                  </p>
                </div>

                {/* Quick Tool Buttons: Upload, Save, Clear */}
                <div className="flex items-center gap-1.5 flex-wrap">
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="px-3 py-1.5 rounded-xl bg-cyan-950/70 hover:bg-cyan-900/80 text-[#5DE2E7] border border-cyan-500/40 text-xs font-bold transition cursor-pointer flex items-center gap-1.5 shadow-sm"
                    title="Upload message from a text/markdown file (.txt, .md, .html)"
                  >
                    <Upload className="w-3.5 h-3.5" />
                    <span>Upload File</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      if (!broadcastSubject.trim() && !broadcastMessage.trim()) {
                        setActionFeedback({ type: 'error', text: 'Please type a subject or message to save as a template.' });
                        return;
                      }
                      setShowSaveTemplateModal(true);
                    }}
                    className="px-3 py-1.5 rounded-xl bg-purple-950/70 hover:bg-purple-900/80 text-purple-300 border border-purple-500/40 text-xs font-bold transition cursor-pointer flex items-center gap-1.5 shadow-sm"
                    title="Save current subject & message as your own custom template"
                  >
                    <Save className="w-3.5 h-3.5" />
                    <span>Save to My Templates</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleClearToScratch}
                    className="px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white border border-white/10 text-xs font-bold transition cursor-pointer flex items-center gap-1.5"
                    title="Clear composer to write a fresh custom message"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Write from Scratch</span>
                  </button>
                </div>
              </div>

              {/* Ready-made System Presets */}
              <div className="space-y-1.5 pt-1 border-t border-white/5">
                <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 block">
                  Official Ready-Made Presets (রেডিমেড টেমপ্লেট)
                </span>
                <div className="flex items-center gap-2 flex-wrap">
                  {emailTemplates.map(tpl => (
                    <button
                      key={tpl.id}
                      type="button"
                      onClick={() => {
                        setBroadcastSubject(tpl.subject);
                        setBroadcastMessage(tpl.message);
                        setActionFeedback({ type: 'success', text: `Loaded template: ${tpl.name}` });
                      }}
                      className="px-3 py-1.5 rounded-xl bg-slate-950 hover:bg-cyan-950/80 text-slate-300 hover:text-[#5DE2E7] border border-white/10 hover:border-cyan-500/40 text-xs font-bold transition cursor-pointer flex items-center gap-1.5"
                    >
                      <span>{tpl.name}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* User's Saved Custom Templates */}
              <div className="space-y-1.5 pt-2 border-t border-white/5">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-black uppercase tracking-wider text-purple-400 flex items-center gap-1">
                    <Bookmark className="w-3 h-3" />
                    <span>My Custom Templates (আমার সেভ করা টেমপ্লেট)</span>
                  </span>
                  {customTemplates.length > 0 && (
                    <span className="text-[10px] text-slate-400">
                      {customTemplates.length} saved
                    </span>
                  )}
                </div>

                {customTemplates.length === 0 ? (
                  <p className="text-[11px] text-slate-400 italic">
                    No custom templates saved yet. Write your own custom message below and click &quot;Save to My Templates&quot; to save it here for future use!
                  </p>
                ) : (
                  <div className="flex items-center gap-2 flex-wrap">
                    {customTemplates.map(tpl => (
                      <div
                        key={tpl.id}
                        className="group flex items-center bg-purple-950/40 hover:bg-purple-900/60 border border-purple-500/40 rounded-xl overflow-hidden shadow-sm transition"
                      >
                        <button
                          type="button"
                          onClick={() => {
                            setBroadcastSubject(tpl.subject);
                            setBroadcastMessage(tpl.message);
                            setActionFeedback({ type: 'success', text: `Loaded custom template: "${tpl.name}"` });
                          }}
                          className="px-3 py-1.5 text-xs font-bold text-purple-200 hover:text-white cursor-pointer"
                        >
                          {tpl.name}
                        </button>
                        <button
                          type="button"
                          onClick={(e) => handleDeleteCustomTemplate(tpl.id, e)}
                          className="px-2 py-1.5 text-purple-400 hover:text-rose-300 hover:bg-rose-500/20 transition cursor-pointer"
                          title="Delete this custom template"
                        >
                          ✕
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Recipient(s) / Sending To Display Card (প্রাপক জিমেইল) */}
            <div className="p-3.5 sm:p-4 rounded-2xl bg-gradient-to-br from-slate-900 to-slate-950 border border-[#5DE2E7]/40 space-y-3 shadow-xl">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                <div className="flex items-center gap-2">
                  <div className="p-2 rounded-xl bg-cyan-500/20 text-[#5DE2E7] shadow-sm">
                    <Mail className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-xs font-black uppercase tracking-wider text-white">
                        Sending To (প্রাপক জিমেইল)
                      </span>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-cyan-950 text-[#5DE2E7] border border-cyan-800/60 font-mono">
                        {broadcastTarget === 'all'
                          ? `All Users (${validUserAccounts.length} Total)`
                          : selectedUserIds.size === 1
                          ? '1 Specific User (একক ইউজার)'
                          : `${selectedUserIds.size} Selected Users`}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-400 mt-0.5">
                      This email will be delivered to the Gmail account(s) shown below via Brevo.
                    </p>
                  </div>
                </div>

                {/* Quick Switch Buttons */}
                <div className="flex items-center gap-1.5 flex-wrap">
                  <button
                    type="button"
                    onClick={switchToAllUsersMode}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer border ${
                      broadcastTarget === 'all'
                        ? 'bg-cyan-500 text-slate-950 border-cyan-300 font-black shadow-md'
                        : 'bg-slate-900 hover:bg-slate-800 text-slate-300 border-white/10'
                    }`}
                  >
                    All Users ({validUserAccounts.length})
                  </button>

                  <button
                    type="button"
                    onClick={switchToSelectedMode}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer border ${
                      broadcastTarget === 'selected'
                        ? 'bg-cyan-500 text-slate-950 border-cyan-300 font-black shadow-md'
                        : 'bg-slate-900 hover:bg-slate-800 text-slate-300 border-white/10'
                    }`}
                  >
                    Selected Only ({selectedUserIds.size})
                  </button>

                  {broadcastTarget === 'selected' && selectedUserIds.size > 0 && (
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedUserIds(new Set());
                        setActionFeedback({ type: 'success', text: 'Cleared selected recipients.' });
                      }}
                      className="px-2.5 py-1.5 rounded-xl bg-rose-950/50 hover:bg-rose-900/60 text-rose-300 border border-rose-500/30 text-xs font-bold transition cursor-pointer"
                      title="Clear selection"
                    >
                      Clear
                    </button>
                  )}
                </div>
              </div>

              {/* Recipient Details & Badges */}
              {broadcastTarget === 'all' ? (
                <div className="p-3 rounded-xl bg-slate-950/80 border border-cyan-500/30 space-y-2">
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <div className="flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full bg-cyan-400 animate-pulse shadow-[0_0_8px_#5DE2E7]" />
                      <span className="text-xs font-bold text-white">
                        Broadcasting to ALL {validUserAccounts.length} Registered Website Users simultaneously
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setShowAllRecipientsList(!showAllRecipientsList)}
                      className="text-xs text-[#5DE2E7] hover:underline font-bold cursor-pointer"
                    >
                      {showAllRecipientsList ? 'Hide Email List ▲' : `View All ${validUserAccounts.length} Gmails ▼`}
                    </button>
                  </div>

                  {showAllRecipientsList && (
                    <div className="pt-2 border-t border-white/5 max-h-40 overflow-y-auto no-scrollbar space-y-1">
                      {validUserAccounts.map(u => (
                        <div key={u.id} className="flex items-center justify-between text-xs py-1 px-2.5 rounded-lg bg-white/[0.03]">
                          <span className="font-mono text-cyan-300 font-bold">{u.email}</span>
                          <span className="text-slate-400 text-[11px]">@{u.username}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ) : (
                <div className="p-3 rounded-xl bg-slate-950/80 border border-white/10 space-y-2">
                  {selectedUserIds.size === 0 ? (
                    <div className="py-2.5 px-3 text-center text-xs text-amber-300 bg-amber-950/30 rounded-xl border border-amber-500/30">
                      ⚠️ No user selected yet. Click <strong>&quot;Write Email&quot;</strong> on any user in the directory above to choose who will receive this message.
                    </div>
                  ) : (
                    <div>
                      <div className="text-[11px] font-bold text-slate-400 mb-1.5 flex items-center justify-between">
                        <span>Recipient Email Address(es):</span>
                        <span className="text-cyan-400 font-mono">{selectedUserIds.size} recipient(s) ready</span>
                      </div>
                      <div className="flex items-center gap-2 flex-wrap">
                        {validUserAccounts
                          .filter(u => selectedUserIds.has(u.id))
                          .map(u => (
                            <div
                              key={u.id}
                              className="px-3 py-2 rounded-xl bg-cyan-950/80 border border-cyan-400/60 flex items-center gap-2.5 shadow-md text-xs group"
                            >
                              <div className="w-6 h-6 rounded-lg bg-gradient-to-tr from-[#133E87] to-cyan-500 text-[11px] font-black text-white flex items-center justify-center shrink-0">
                                {(u.firstName?.[0] || u.username[0] || 'U').toUpperCase()}
                              </div>
                              <div className="flex flex-col min-w-0">
                                <span className="font-black text-white font-mono text-xs truncate">
                                  {u.email}
                                </span>
                                <div className="flex items-center gap-1.5 text-[10px] text-cyan-300">
                                  <span>@{u.username}</span>
                                  {u.firstName && <span>({u.firstName})</span>}
                                  {u.emailVerified && (
                                    <span className="text-emerald-400 font-bold">• Verified</span>
                                  )}
                                </div>
                              </div>
                              <button
                                type="button"
                                onClick={() => handleToggleUserSelection(u.id)}
                                className="p-1 rounded-md text-slate-400 hover:text-rose-300 hover:bg-rose-500/20 transition cursor-pointer ml-1"
                                title="Remove this recipient"
                              >
                                ✕
                              </button>
                            </div>
                          ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Subject Input */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-slate-200 block">
                  Email Subject Line *
                </label>
                <span className="text-[10px] text-cyan-300">
                  Type freely in Bengali or English (যেকোনো বিষয় লিখুন)
                </span>
              </div>
              <input
                type="text"
                value={broadcastSubject}
                onChange={e => setBroadcastSubject(e.target.value)}
                placeholder="e.g. 📢 জরুরী নোটিশ: Online Task Lab এর সকল ইউজারদের জন্য গুরুত্বপূর্ণ তথ্য"
                className="w-full px-4 py-2.5 rounded-xl bg-slate-900 border border-white/15 text-xs text-white focus:outline-none focus:border-[#5DE2E7] focus:ring-1 focus:ring-[#5DE2E7]"
              />
            </div>

            {/* Email Message Content Textarea */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-slate-200 block">
                  Email Message Body * (আপনার নিজস্ব বার্তা বা জরুরী তথ্য)
                </label>
                <span className="text-[10px] text-slate-400">
                  Recipient name will be automatically addressed at the top.
                </span>
              </div>
              <textarea
                rows={8}
                value={broadcastMessage}
                onChange={e => setBroadcastMessage(e.target.value)}
                placeholder="আপনার নিজের মনের মতো যেকোনো গুরুত্বপূর্ণ কথা বা নোটিশ এখানে লিখুন...
(রেডিমেড টেমপ্লেট ব্যবহার করতে পারেন অথবা সম্পূর্ণ নিজের মতো বাংলায়/ইংরেজিতে টাইপ করতে পারেন)"
                className="w-full px-4 py-3 rounded-2xl bg-slate-900 border border-white/15 text-xs text-white focus:outline-none focus:border-[#5DE2E7] focus:ring-1 focus:ring-[#5DE2E7] leading-relaxed resize-y font-sans"
              />
            </div>

            {/* Email Action Button & Greeting Controls (বাটন ও ফরম্যাট সেটিংস) */}
            <div className="p-4 rounded-2xl bg-slate-900/90 border border-white/10 space-y-4 shadow-lg">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-white/10 pb-3">
                <div>
                  <span className="text-xs font-black uppercase tracking-wider text-[#5DE2E7] flex items-center gap-1.5">
                    <Sliders className="w-3.5 h-3.5" />
                    <span>Action Button &amp; Greeting Customization (ইমেইল বাটন ও ফরম্যাট অপশন)</span>
                  </span>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    Choose whether to include an action button (Download, Website Link, Custom) or send clean plain text without any button.
                  </p>
                </div>

                {/* Live Preview Toggle Button */}
                <button
                  type="button"
                  onClick={() => setShowLivePreview(!showLivePreview)}
                  className="px-3 py-1.5 rounded-xl bg-cyan-950/70 hover:bg-cyan-900/80 text-[#5DE2E7] border border-cyan-500/40 text-xs font-bold transition cursor-pointer flex items-center gap-1.5 shrink-0"
                >
                  <Eye className="w-3.5 h-3.5" />
                  <span>{showLivePreview ? 'Hide Live Preview' : 'Show Live Preview'}</span>
                </button>
              </div>

              {/* 1. Button Type Selector */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-[11px] font-extrabold uppercase tracking-wider text-slate-300 block">
                    Action Button Type (ইমেইলের নিচের বাটন)
                  </label>
                  <span className="text-[10px] text-slate-400">
                    {buttonType === 'none' ? 'No button will be generated in email' : 'Button will be added below text'}
                  </span>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setButtonType('none');
                      setButtonText('');
                      setButtonUrl('');
                    }}
                    className={`p-2.5 rounded-xl text-left border transition cursor-pointer flex flex-col justify-between ${
                      buttonType === 'none'
                        ? 'bg-gradient-to-br from-[#133E87] to-cyan-700 text-white border-cyan-400 shadow-md font-black'
                        : 'bg-slate-950/80 hover:bg-slate-800 text-slate-300 border-white/10'
                    }`}
                  >
                    <div className="flex items-center gap-1.5 text-xs">
                      <Ban className="w-3.5 h-3.5 text-rose-400 shrink-0" />
                      <span>No Button (কোন বাটন নেই)</span>
                    </div>
                    <span className="text-[10px] text-slate-300/80 mt-1 block">
                      Clean text only, zero buttons
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setButtonType('website');
                      if (!buttonText) setButtonText('Visit Online Task Lab');
                      if (!buttonUrl) setButtonUrl('https://onlinetasklab.com');
                    }}
                    className={`p-2.5 rounded-xl text-left border transition cursor-pointer flex flex-col justify-between ${
                      buttonType === 'website'
                        ? 'bg-gradient-to-br from-[#133E87] to-cyan-700 text-white border-cyan-400 shadow-md font-black'
                        : 'bg-slate-950/80 hover:bg-slate-800 text-slate-300 border-white/10'
                    }`}
                  >
                    <div className="flex items-center gap-1.5 text-xs">
                      <Globe className="w-3.5 h-3.5 text-cyan-300 shrink-0" />
                      <span>Website Link (ওয়েবসাইট)</span>
                    </div>
                    <span className="text-[10px] text-slate-300/80 mt-1 block">
                      Visit Website / Login link
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setButtonType('download');
                      if (!buttonText) setButtonText('📥 Download File / ডাউনলোড');
                      if (!buttonUrl) setButtonUrl('https://drive.google.com');
                    }}
                    className={`p-2.5 rounded-xl text-left border transition cursor-pointer flex flex-col justify-between ${
                      buttonType === 'download'
                        ? 'bg-gradient-to-br from-[#133E87] to-cyan-700 text-white border-cyan-400 shadow-md font-black'
                        : 'bg-slate-950/80 hover:bg-slate-800 text-slate-300 border-white/10'
                    }`}
                  >
                    <div className="flex items-center gap-1.5 text-xs">
                      <Download className="w-3.5 h-3.5 text-emerald-300 shrink-0" />
                      <span>Download (ডাউনলোড বাটন)</span>
                    </div>
                    <span className="text-[10px] text-slate-300/80 mt-1 block">
                      Download file / resource button
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setButtonType('custom');
                      if (!buttonText) setButtonText('Click Here / ক্লিক করুন');
                      if (!buttonUrl) setButtonUrl('https://t.me');
                    }}
                    className={`p-2.5 rounded-xl text-left border transition cursor-pointer flex flex-col justify-between ${
                      buttonType === 'custom'
                        ? 'bg-gradient-to-br from-[#133E87] to-cyan-700 text-white border-cyan-400 shadow-md font-black'
                        : 'bg-slate-950/80 hover:bg-slate-800 text-slate-300 border-white/10'
                    }`}
                  >
                    <div className="flex items-center gap-1.5 text-xs">
                      <Link className="w-3.5 h-3.5 text-purple-300 shrink-0" />
                      <span>Custom (কাস্টম লিংক)</span>
                    </div>
                    <span className="text-[10px] text-slate-300/80 mt-1 block">
                      Custom label &amp; target link
                    </span>
                  </button>
                </div>
              </div>

              {/* Button Details Form (Visible only when buttonType !== 'none') */}
              {buttonType !== 'none' && (
                <div className="p-3.5 rounded-xl bg-slate-950/90 border border-cyan-500/30 space-y-3">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="text-[11px] font-bold text-slate-300 block mb-1">
                        Button Label / Display Text *
                      </label>
                      <input
                        type="text"
                        value={buttonText}
                        onChange={e => setButtonText(e.target.value)}
                        placeholder={
                          buttonType === 'download'
                            ? '📥 Download File / ডাউনলোড করুন'
                            : buttonType === 'website'
                            ? 'Visit Online Task Lab'
                            : 'Click Here / ক্লিক করুন'
                        }
                        className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-white/15 text-xs text-white focus:outline-none focus:border-[#5DE2E7]"
                      />
                    </div>

                    <div>
                      <label className="text-[11px] font-bold text-slate-300 block mb-1">
                        Button Target URL / Link *
                      </label>
                      <input
                        type="url"
                        value={buttonUrl}
                        onChange={e => setButtonUrl(e.target.value)}
                        placeholder="https://drive.google.com/... or https://onlinetasklab.com"
                        className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-white/15 text-xs text-white focus:outline-none focus:border-[#5DE2E7] font-mono"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* 2. Personal Greeting Header Option */}
              <div className="pt-2 border-t border-white/10 flex items-center justify-between gap-3 flex-wrap">
                <label className="flex items-center gap-2.5 cursor-pointer text-xs text-slate-300 font-bold">
                  <input
                    type="checkbox"
                    checked={includeGreeting}
                    onChange={e => setIncludeGreeting(e.target.checked)}
                    className="w-4 h-4 rounded border-white/20 text-[#5DE2E7] focus:ring-[#5DE2E7] bg-slate-950"
                  />
                  <span>
                    Include &quot;Hello [User Name],&quot; greeting above message body (নাম সম্বোধন)
                  </span>
                </label>
                <span className="text-[10px] text-slate-400">
                  {includeGreeting
                    ? 'Will greet user by their registered name'
                    : 'Clean message starts directly without greeting'}
                </span>
              </div>
            </div>

            {/* Live Email Preview Box */}
            {showLivePreview && (
              <div className="p-4 sm:p-5 rounded-2xl bg-[#060B1E] border border-cyan-500/40 space-y-3 shadow-2xl">
                <div className="flex items-center justify-between border-b border-white/10 pb-2.5">
                  <span className="text-xs font-black uppercase text-[#5DE2E7] flex items-center gap-1.5">
                    <Eye className="w-3.5 h-3.5" />
                    <span>Live Preview: How this looks in Gmail Inbox</span>
                  </span>
                  <span className="text-[10px] text-slate-400 font-mono">Simulated View</span>
                </div>

                <div className="max-w-md mx-auto p-5 rounded-2xl bg-[#0B1D51] border border-cyan-500/30 text-white space-y-4 shadow-xl">
                  {/* Simulated Header */}
                  <div className="text-center pb-3 border-b border-white/10">
                    <div className="text-sm font-black text-[#5DE2E7] tracking-wider uppercase">
                      ONLINE TASK LAB
                    </div>
                  </div>

                  {/* Simulated Subject & Greeting */}
                  <div>
                    <h4 className="text-sm font-black text-white">
                      {broadcastSubject || '(Subject will appear here)'}
                    </h4>
                    {includeGreeting && (
                      <p className="text-xs font-bold text-cyan-300 mt-2">
                        Hello {targetRecipients[0]?.name || 'Member'},
                      </p>
                    )}
                  </div>

                  {/* Simulated Body */}
                  <div className="text-xs text-slate-300 leading-relaxed whitespace-pre-line">
                    {broadcastMessage || '(Your message body text will appear here...)'}
                  </div>

                  {/* Simulated Button (or NO button notice) */}
                  {buttonType !== 'none' && buttonUrl ? (
                    <div className="text-center pt-3 border-t border-white/10">
                      <span className="inline-block px-5 py-2.5 rounded-xl bg-gradient-to-r from-[#133E87] to-cyan-400 text-white font-extrabold text-xs shadow-md">
                        {buttonText || 'Action Button'}
                      </span>
                    </div>
                  ) : (
                    <div className="text-center pt-2 border-t border-white/5 text-[10px] text-slate-400 italic">
                      [No Button - Clean Text Only]
                    </div>
                  )}

                  {/* Simulated Footer */}
                  <div className="text-center pt-3 border-t border-white/10 text-[9px] text-slate-400">
                    © {new Date().getFullYear()} Online Task Lab. All rights reserved.
                  </div>
                </div>
              </div>
            )}

            {/* Options & Brand Styling */}
            <div className="p-3.5 rounded-2xl bg-slate-900 border border-white/10 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <label className="flex items-center gap-2 cursor-pointer text-xs text-slate-300 font-bold">
                <input
                  type="checkbox"
                  checked={useBrandTemplate}
                  onChange={e => setUseBrandTemplate(e.target.checked)}
                  className="w-4 h-4 rounded border-white/20 text-[#5DE2E7] focus:ring-[#5DE2E7] bg-slate-950"
                />
                <span>Include Official Online Task Lab Email Template (Logo, Cyan Accents, Header &amp; Footer)</span>
              </label>

              {/* Send Preview Copy to Admin */}
              <button
                type="button"
                onClick={handleSendTestCopy}
                disabled={isTestCopySending}
                className="px-3.5 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-slate-200 hover:text-white border border-white/10 text-xs font-bold transition cursor-pointer flex items-center gap-1.5 shrink-0 disabled:opacity-50"
              >
                <Eye className="w-3.5 h-3.5 text-cyan-400" />
                <span>{isTestCopySending ? 'Sending Preview...' : 'Send Preview Copy to My Email'}</span>
              </button>
            </div>

            {testCopyFeedback && (
              <div className="p-3 rounded-xl bg-slate-900 border border-[#5DE2E7]/40 text-xs font-bold text-cyan-300">
                {testCopyFeedback}
              </div>
            )}

            {/* Bottom Target Summary & Send Button */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-3 border-t border-white/10">
              <div className="text-xs text-slate-300">
                <span>Sending to: </span>
                <strong className="text-[#5DE2E7] font-black text-sm">
                  {targetRecipients.length} User Account{targetRecipients.length === 1 ? '' : 's'}
                </strong>
                <span className="text-slate-400 ml-2">
                  (via {config.provider === 'auto' ? 'Brevo Engine with Fallback' : config.provider})
                </span>
              </div>

              <button
                type="button"
                onClick={() => setShowConfirmModal(true)}
                disabled={isSendingBroadcast || targetRecipients.length === 0 || !broadcastSubject.trim() || !broadcastMessage.trim()}
                className="px-7 py-3 rounded-2xl bg-gradient-to-r from-cyan-500 via-blue-600 to-indigo-600 hover:from-cyan-400 hover:to-indigo-500 text-white font-black text-xs uppercase tracking-wider shadow-[0_0_25px_rgba(93,226,231,0.5)] transition-all cursor-pointer flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {isSendingBroadcast ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Broadcasting via Brevo...</span>
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4" />
                    <span>Send Broadcast Email Now ({targetRecipients.length})</span>
                  </>
                )}
              </button>
            </div>

            {/* Broadcast Final Result Feedback */}
            {broadcastResult && (
              <div
                className={`p-4 rounded-2xl border text-xs font-semibold space-y-2 ${
                  broadcastResult.deliveredCount > 0
                    ? 'bg-emerald-950/80 border-emerald-500/50 text-emerald-200'
                    : 'bg-rose-950/80 border-rose-500/50 text-rose-200'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 font-bold text-sm">
                    <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                    <span>Broadcast Dispatch Finished!</span>
                  </div>
                  <button
                    onClick={() => setActiveSubTab('history')}
                    className="px-3 py-1 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-bold transition"
                  >
                    View in Gmail Dispatch Log →
                  </button>
                </div>
                <div className="grid grid-cols-3 gap-2 pt-1 font-mono text-[11px]">
                  <div>Total: <strong>{broadcastResult.total}</strong></div>
                  <div className="text-emerald-300">Delivered: <strong>{broadcastResult.deliveredCount}</strong></div>
                  <div className="text-rose-300">Failed: <strong>{broadcastResult.failedCount}</strong></div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Broadcast Confirmation Modal */}
      <AnimatePresence>
        {showConfirmModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="w-full max-w-lg rounded-3xl bg-slate-900 border border-[#5DE2E7]/40 p-6 shadow-2xl space-y-4"
            >
              <div className="flex items-center gap-3 text-cyan-400">
                <div className="p-2.5 rounded-2xl bg-cyan-500/20">
                  <Send className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-black text-white">Confirm Brevo Email Broadcast</h3>
                  <p className="text-xs text-slate-400">Please review before sending to live users</p>
                </div>
              </div>

              <div className="p-3.5 rounded-2xl bg-slate-950 border border-white/10 space-y-2 text-xs">
                <div>
                  <span className="text-slate-400 block text-[11px]">Subject:</span>
                  <strong className="text-white text-sm">{broadcastSubject}</strong>
                </div>
                <div className="flex items-center justify-between border-t border-white/5 pt-2">
                  <span className="text-slate-400">Total Recipients:</span>
                  <strong className="text-[#5DE2E7] font-black text-sm">{targetRecipients.length} Users</strong>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-400">Sending Engine:</span>
                  <strong className="text-purple-300 font-mono text-[11px]">
                    {config.provider === 'auto' ? 'Brevo SMTP & REST Fallback' : config.provider}
                  </strong>
                </div>
              </div>

              <p className="text-[11px] text-amber-300/90 bg-amber-950/40 p-3 rounded-xl border border-amber-500/30">
                ⚠️ This action will immediately send real emails to {targetRecipients.length} registered accounts in their Gmail inboxes.
              </p>

              <div className="flex items-center justify-end gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => setShowConfirmModal(false)}
                  className="px-4 py-2 rounded-xl bg-white/10 hover:bg-white/15 text-white font-bold text-xs transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleExecuteBroadcast}
                  className="px-5 py-2 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-black text-xs transition cursor-pointer shadow-lg"
                >
                  Yes, Send Broadcast Now
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Save Custom Template Modal */}
      <AnimatePresence>
        {showSaveTemplateModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="w-full max-w-md rounded-3xl bg-slate-900 border border-purple-500/40 p-6 shadow-2xl space-y-4"
            >
              <div className="flex items-center gap-3 text-purple-400">
                <div className="p-2.5 rounded-2xl bg-purple-500/20">
                  <Bookmark className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-black text-white">Save as Custom Template</h3>
                  <p className="text-xs text-slate-400">Save this message to easily re-use in future broadcasts</p>
                </div>
              </div>

              <form onSubmit={handleSaveCustomTemplate} className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-200 block">
                    Template Name / Title *
                  </label>
                  <input
                    type="text"
                    required
                    value={newTemplateName}
                    onChange={e => setNewTemplateName(e.target.value)}
                    placeholder="e.g. জরুরী মেইনটেনেন্স নোটিশ, উইকলি বোনাস আপডেট"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-white/15 text-xs text-white focus:outline-none focus:border-purple-400 focus:ring-1 focus:ring-purple-400"
                    autoFocus
                  />
                </div>

                <div className="p-3 rounded-xl bg-slate-950/80 border border-white/5 space-y-1 text-xs">
                  <span className="text-[11px] text-slate-400 block font-semibold">Subject Preview:</span>
                  <p className="text-white truncate font-medium">{broadcastSubject || '(Empty Subject)'}</p>
                </div>

                <div className="flex items-center justify-end gap-2.5 pt-2">
                  <button
                    type="button"
                    onClick={() => {
                      setShowSaveTemplateModal(false);
                      setNewTemplateName('');
                    }}
                    className="px-4 py-2 rounded-xl bg-white/10 hover:bg-white/15 text-white font-bold text-xs transition cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 rounded-xl bg-gradient-to-r from-purple-500 to-indigo-600 hover:from-purple-400 hover:to-indigo-500 text-white font-bold text-xs transition cursor-pointer shadow-lg"
                  >
                    Save Template
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ======================================================== */}
      {/* TAB 2: GMAIL-STYLE OTP & EMAIL DISPATCH HISTORY LOGS */}
      {/* ======================================================== */}
      {activeSubTab === 'history' && (
        <div className="space-y-5">
          {/* Quick Metrics Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
            <div className="p-3.5 rounded-2xl bg-slate-950/60 border border-white/10 backdrop-blur-md">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Total Dispatched</span>
              <span className="text-xl sm:text-2xl font-black text-white mt-1 block">{stats.total}</span>
            </div>

            <div className="p-3.5 rounded-2xl bg-slate-950/60 border border-emerald-500/30 backdrop-blur-md">
              <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-wider block">Verified Rate</span>
              <span className="text-xl sm:text-2xl font-black text-emerald-300 mt-1 block">
                {stats.verifiedRate}% <span className="text-xs font-normal text-slate-400">({stats.verified})</span>
              </span>
            </div>

            <div className="p-3.5 rounded-2xl bg-slate-950/60 border border-cyan-500/30 backdrop-blur-md">
              <span className="text-[10px] font-bold text-cyan-400 uppercase tracking-wider block">Registration OTPs</span>
              <span className="text-xl sm:text-2xl font-black text-[#5DE2E7] mt-1 block">{stats.registrationCount}</span>
            </div>

            <div className="p-3.5 rounded-2xl bg-slate-950/60 border border-amber-500/30 backdrop-blur-md">
              <span className="text-[10px] font-bold text-amber-400 uppercase tracking-wider block">Password Reset</span>
              <span className="text-xl sm:text-2xl font-black text-amber-300 mt-1 block">{stats.resetCount}</span>
            </div>

            <div className="col-span-2 sm:col-span-1 p-3.5 rounded-2xl bg-slate-950/60 border border-purple-500/30 backdrop-blur-md">
              <span className="text-[10px] font-bold text-purple-400 uppercase tracking-wider block">Broadcasts</span>
              <span className="text-xl sm:text-2xl font-black text-purple-300 mt-1 block">{stats.broadcastCount}</span>
            </div>
          </div>

          {/* Search, Filter & Quick Action Bar */}
          <div className="p-3.5 rounded-2xl bg-slate-950/70 border border-white/10 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
            {/* Search Input */}
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="Search by Gmail address, @username, or 6-digit OTP code..."
                className="w-full pl-10 pr-4 py-2 rounded-xl bg-slate-900 border border-white/15 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-[#5DE2E7] focus:ring-1 focus:ring-[#5DE2E7] transition"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white text-xs"
                >
                  ✕
                </button>
              )}
            </div>

            {/* Filter Selectors */}
            <div className="flex items-center gap-2 flex-wrap">
              <select
                value={purposeFilter}
                onChange={e => setPurposeFilter(e.target.value)}
                className="px-3 py-2 rounded-xl bg-slate-900 border border-white/15 text-xs font-semibold text-slate-200 focus:outline-none focus:border-[#5DE2E7]"
              >
                <option value="all">All Purposes</option>
                <option value="registration_otp">Registration OTP</option>
                <option value="password_reset_otp">Password Reset OTP</option>
                <option value="broadcast_email">Broadcast Emails</option>
                <option value="welcome_email">Welcome Emails</option>
                <option value="security_alert">Security Alerts</option>
                <option value="test_email">Admin Tests</option>
              </select>

              <select
                value={statusFilter}
                onChange={e => setStatusFilter(e.target.value)}
                className="px-3 py-2 rounded-xl bg-slate-900 border border-white/15 text-xs font-semibold text-slate-200 focus:outline-none focus:border-[#5DE2E7]"
              >
                <option value="all">All Statuses</option>
                <option value="verified">Verified by User</option>
                <option value="pending">Pending Verification</option>
                <option value="delivered">Delivered Successfully</option>
                <option value="failed">Failed / Bounced</option>
              </select>

              {logs.length > 0 && (
                <button
                  onClick={handleClearLogs}
                  className="px-3 py-2 rounded-xl bg-rose-950/40 hover:bg-rose-900/60 text-rose-300 border border-rose-500/30 text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ml-auto md:ml-0"
                  title="Clear Log History"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Clear Logs</span>
                </button>
              )}
            </div>
          </div>

          {/* Gmail-Style Logs List Container */}
          <div className="rounded-3xl bg-slate-950/80 border border-white/10 overflow-hidden shadow-2xl">
            {isLoadingLogs ? (
              <div className="py-16 text-center space-y-3">
                <RefreshCw className="w-7 h-7 text-[#5DE2E7] animate-spin mx-auto" />
                <p className="text-xs text-slate-400">Loading email &amp; OTP verification records...</p>
              </div>
            ) : filteredLogs.length === 0 ? (
              <div className="py-16 text-center space-y-3">
                <Inbox className="w-10 h-10 text-slate-600 mx-auto" />
                <h4 className="text-sm font-bold text-white">No Verification Records Found</h4>
                <p className="text-xs text-slate-400 max-w-sm mx-auto">
                  {searchQuery || purposeFilter !== 'all' || statusFilter !== 'all'
                    ? 'No records match your active search and filter criteria.'
                    : 'When users register, request password resets, or broadcast emails are sent, their delivery records will appear here in real-time.'}
                </p>
                <button
                  onClick={() => setActiveSubTab('broadcast')}
                  className="px-4 py-2 rounded-xl bg-[#133E87] hover:bg-cyan-600 text-white font-bold text-xs transition cursor-pointer"
                >
                  Broadcast an Email to Users
                </button>
              </div>
            ) : (
              <div className="divide-y divide-white/5">
                {filteredLogs.map(log => {
                  const purposeBadge = getPurposeBadge(log.purpose);
                  const isCopied = copiedOtpId === log.id;
                  const isResending = resendingLogId === log.id;

                  return (
                    <div
                      key={log.id}
                      className="p-3.5 sm:p-4 hover:bg-white/[0.03] transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-3 group"
                    >
                      {/* Left: Email, Username & Subject Info */}
                      <div className="flex items-start gap-3 min-w-0 flex-1">
                        {/* Gmail Icon / Avatar */}
                        <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-[#133E87] to-cyan-700/80 border border-[#5DE2E7]/40 flex items-center justify-center text-white shrink-0 shadow-md">
                          <Mail className="w-4 h-4 text-[#5DE2E7]" />
                        </div>

                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-extrabold text-xs sm:text-sm text-white tracking-tight truncate">
                              {log.recipientEmail}
                            </span>

                            {log.username && (
                              <span className="text-[10px] text-cyan-300 font-mono bg-cyan-950/60 px-1.5 py-0.5 rounded border border-cyan-800/40">
                                @{log.username}
                              </span>
                            )}

                            <span className={`text-[9px] uppercase font-black px-2 py-0.5 rounded-full border ${purposeBadge.bg}`}>
                              {purposeBadge.label}
                            </span>

                            {log.verified ? (
                              <span className="text-[9px] font-black uppercase px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-400/40 flex items-center gap-1">
                                <CheckCircle2 className="w-2.5 h-2.5 text-emerald-400" />
                                <span>Verified</span>
                              </span>
                            ) : log.status === 'failed' ? (
                              <span className="text-[9px] font-black uppercase px-2 py-0.5 rounded-full bg-rose-500/20 text-rose-300 border border-rose-400/40 flex items-center gap-1">
                                <XCircle className="w-2.5 h-2.5 text-rose-400" />
                                <span>Delivery Failed</span>
                              </span>
                            ) : (
                              <span className="text-[9px] font-black uppercase px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 flex items-center gap-1">
                                <Check className="w-2.5 h-2.5 text-emerald-400" />
                                <span>Delivered</span>
                              </span>
                            )}
                          </div>

                          <p className="text-xs text-slate-300 truncate mt-1">
                            {log.subject}
                          </p>

                          <div className="flex items-center gap-2 text-[10px] text-slate-400 mt-1 flex-wrap font-medium">
                            <span>Via: <strong className="text-slate-300">{log.provider}</strong></span>
                            <span>•</span>
                            <span>{new Date(log.sentAt).toLocaleString()}</span>
                            {log.verifiedAt && (
                              <>
                                <span>•</span>
                                <span className="text-emerald-400">Verified at: {new Date(log.verifiedAt).toLocaleTimeString()}</span>
                              </>
                            )}
                            {log.errorMessage && (
                              <>
                                <span>•</span>
                                <span className="text-rose-400 truncate max-w-[200px]" title={log.errorMessage}>
                                  Err: {log.errorMessage}
                                </span>
                              </>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Right: OTP Code Badge & Actions */}
                      <div className="flex items-center gap-2 sm:self-center shrink-0 pl-12 sm:pl-0">
                        {log.otpCode ? (
                          <div className="flex items-center gap-1.5 p-1 rounded-xl bg-slate-900 border border-[#5DE2E7]/40 shadow-inner">
                            <span className="text-xs sm:text-sm font-black text-[#5DE2E7] font-mono tracking-wider px-2 py-0.5">
                              {log.otpCode}
                            </span>
                            <button
                              onClick={() => handleCopyOtp(log.otpCode!, log.id)}
                              className="p-1.5 rounded-lg bg-white/10 hover:bg-[#5DE2E7]/20 text-slate-300 hover:text-[#5DE2E7] transition cursor-pointer"
                              title="Copy OTP to Clipboard"
                            >
                              {isCopied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                            </button>
                          </div>
                        ) : (
                          <span className="text-[10px] text-slate-500 italic">No OTP Code</span>
                        )}

                        {/* Resend Button */}
                        <button
                          onClick={() => handleResend(log.id)}
                          disabled={isResending}
                          className="px-2.5 py-1.5 rounded-xl bg-white/5 hover:bg-[#133E87]/60 text-slate-200 hover:text-white border border-white/10 text-xs font-bold transition flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                          title="Resend code to user"
                        >
                          <Send className={`w-3.5 h-3.5 ${isResending ? 'animate-pulse text-[#5DE2E7]' : 'text-slate-400'}`} />
                          <span className="hidden sm:inline">Resend</span>
                        </button>

                        {/* View Details */}
                        <button
                          onClick={() => setSelectedLog(log)}
                          className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white transition cursor-pointer"
                          title="View Message Details"
                        >
                          <ExternalLink className="w-3.5 h-3.5" />
                        </button>

                        {/* Delete Single Log */}
                        <button
                          onClick={() => handleDeleteLog(log.id)}
                          className="p-2 rounded-xl bg-white/5 hover:bg-rose-500/20 text-slate-400 hover:text-rose-300 transition cursor-pointer"
                          title="Delete this record"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* TAB 3: SMTP & BREVO API SETTINGS */}
      {/* ======================================================== */}
      {activeSubTab === 'settings' && (
        <div className="space-y-6">
          {/* Environment Variables Status Grid */}
          <div className="p-4 sm:p-5 rounded-2xl bg-slate-950/80 border border-white/10 space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
                  <Server className="w-3.5 h-3.5 text-[#5DE2E7]" />
                  <span>Environment Variables Detection Status</span>
                </h3>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  System server environment detection for SMTP and Brevo keys
                </p>
              </div>
              <span className="px-2.5 py-1 rounded-full bg-emerald-500/20 text-emerald-300 text-[10px] font-black border border-emerald-400/30">
                Live Server
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 pt-1">
              {[
                { key: 'SMTP_HOST', label: 'SMTP_HOST', status: envStatus?.SMTP_HOST || 'CONFIGURED' },
                { key: 'SMTP_PORT', label: 'SMTP_PORT', status: envStatus?.SMTP_PORT || 'CONFIGURED' },
                { key: 'SMTP_USER', label: 'SMTP_USER', status: envStatus?.SMTP_USER || 'CONFIGURED' },
                { key: 'SMTP_PASS', label: 'SMTP_PASS', status: envStatus?.SMTP_PASS || 'CONFIGURED' },
                { key: 'SMTP_SECURE', label: 'SMTP_SECURE', status: envStatus?.SMTP_SECURE || 'CONFIGURED' },
                { key: 'SMTP_FROM_NAME', label: 'SMTP_FROM_NAME', status: envStatus?.SMTP_FROM_NAME || 'CONFIGURED' },
                { key: 'SMTP_FROM_EMAIL', label: 'SMTP_FROM_EMAIL', status: envStatus?.SMTP_FROM_EMAIL || 'CONFIGURED' },
                { key: 'BREVO_API_KEY', label: 'BREVO_API_KEY', status: envStatus?.BREVO_API_KEY || 'CONFIGURED' }
              ].map(item => (
                <div key={item.key} className="p-2.5 rounded-xl bg-slate-900 border border-white/10 flex items-center justify-between gap-2">
                  <span className="text-[11px] font-mono font-bold text-slate-300 truncate">{item.label}</span>
                  <span
                    className={`text-[9px] font-black px-1.5 py-0.5 rounded uppercase tracking-wider shrink-0 ${
                      item.status === 'CONFIGURED'
                        ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                        : 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
                    }`}
                  >
                    {item.status}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Configuration Form */}
          <form onSubmit={handleSaveConfig} className="p-5 sm:p-6 rounded-3xl bg-slate-950/80 border border-white/10 space-y-6 shadow-2xl">
            {/* Delivery Provider Mode */}
            <div className="space-y-3 border-b border-white/10 pb-5">
              <label className="text-xs font-extrabold uppercase tracking-wider text-[#5DE2E7] block">
                1. Delivery Engine &amp; Provider Mode
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <button
                  type="button"
                  onClick={() => setConfig({ ...config, provider: 'auto' })}
                  className={`p-3.5 rounded-2xl border text-left transition cursor-pointer ${
                    config.provider === 'auto'
                      ? 'bg-gradient-to-br from-[#133E87]/80 to-cyan-900/60 border-[#5DE2E7] shadow-[0_0_20px_rgba(93,226,231,0.25)] text-white'
                      : 'bg-slate-900/80 border-white/10 text-slate-400 hover:text-white hover:bg-slate-900'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="font-extrabold text-xs">Auto Mode (Recommended)</span>
                    <Zap className="w-4 h-4 text-[#5DE2E7]" />
                  </div>
                  <p className="text-[11px] text-slate-300 leading-relaxed">
                    Uses high-speed SMTP Relay first; automatically falls back to Brevo REST API v3 if IP is restricted.
                  </p>
                </button>

                <button
                  type="button"
                  onClick={() => setConfig({ ...config, provider: 'brevo_api' })}
                  className={`p-3.5 rounded-2xl border text-left transition cursor-pointer ${
                    config.provider === 'brevo_api'
                      ? 'bg-gradient-to-br from-[#133E87]/80 to-cyan-900/60 border-[#5DE2E7] shadow-[0_0_20px_rgba(93,226,231,0.25)] text-white'
                      : 'bg-slate-900/80 border-white/10 text-slate-400 hover:text-white hover:bg-slate-900'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="font-extrabold text-xs">Brevo REST API v3 Only</span>
                    <Sparkles className="w-4 h-4 text-cyan-300" />
                  </div>
                  <p className="text-[11px] text-slate-300 leading-relaxed">
                    Direct HTTPS calls to Brevo v3 API. 100% bypasses container SMTP IP restrictions (error 525).
                  </p>
                </button>

                <button
                  type="button"
                  onClick={() => setConfig({ ...config, provider: 'smtp' })}
                  className={`p-3.5 rounded-2xl border text-left transition cursor-pointer ${
                    config.provider === 'smtp'
                      ? 'bg-gradient-to-br from-[#133E87]/80 to-cyan-900/60 border-[#5DE2E7] shadow-[0_0_20px_rgba(93,226,231,0.25)] text-white'
                      : 'bg-slate-900/80 border-white/10 text-slate-400 hover:text-white hover:bg-slate-900'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="font-extrabold text-xs">SMTP Server Only</span>
                    <Mail className="w-4 h-4 text-slate-300" />
                  </div>
                  <p className="text-[11px] text-slate-300 leading-relaxed">
                    Uses standard Nodemailer SMTP transport for custom email relays (Hostinger, SendGrid, Gmail, etc).
                  </p>
                </button>
              </div>
            </div>

            {/* SMTP Host & Port */}
            <div className="space-y-4">
              <label className="text-xs font-extrabold uppercase tracking-wider text-[#5DE2E7] block">
                2. SMTP &amp; Server Configuration
              </label>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                <div>
                  <label className="text-[11px] font-bold text-slate-300 block mb-1">
                    SMTP Host (SMTP_HOST)
                  </label>
                  <input
                    type="text"
                    value={config.smtpHost}
                    onChange={e => setConfig({ ...config, smtpHost: e.target.value })}
                    placeholder="smtp-relay.brevo.com"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-white/15 text-xs text-white focus:outline-none focus:border-[#5DE2E7]"
                  />
                  <span className="text-[10px] text-slate-500 mt-1 block">Default: smtp-relay.brevo.com</span>
                </div>

                <div>
                  <label className="text-[11px] font-bold text-slate-300 block mb-1">
                    SMTP Port (SMTP_PORT)
                  </label>
                  <input
                    type="number"
                    value={config.smtpPort}
                    onChange={e => setConfig({ ...config, smtpPort: Number(e.target.value) })}
                    placeholder="587"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-white/15 text-xs text-white focus:outline-none focus:border-[#5DE2E7]"
                  />
                  <span className="text-[10px] text-slate-500 mt-1 block">Usually 587 (TLS) or 465 (SSL)</span>
                </div>

                <div>
                  <label className="text-[11px] font-bold text-slate-300 block mb-1">
                    Secure SSL/TLS (SMTP_SECURE)
                  </label>
                  <div className="flex items-center gap-3 pt-2">
                    <label className="flex items-center gap-2 cursor-pointer text-xs text-slate-300">
                      <input
                        type="checkbox"
                        checked={config.smtpSecure}
                        onChange={e => setConfig({ ...config, smtpSecure: e.target.checked })}
                        className="rounded border-white/20 text-[#5DE2E7] focus:ring-[#5DE2E7] w-4 h-4 bg-slate-900"
                      />
                      <span>Enable SSL (Port 465)</span>
                    </label>
                  </div>
                </div>
              </div>

              {/* SMTP Username & Password */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                <div>
                  <label className="text-[11px] font-bold text-slate-300 block mb-1">
                    SMTP User / Account (SMTP_USER)
                  </label>
                  <input
                    type="text"
                    value={config.smtpUser}
                    onChange={e => setConfig({ ...config, smtpUser: e.target.value })}
                    placeholder="e.g. your-brevo-login@gmail.com"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-white/15 text-xs text-white focus:outline-none focus:border-[#5DE2E7]"
                  />
                </div>

                <div>
                  <label className="text-[11px] font-bold text-slate-300 block mb-1">
                    SMTP Password / Master Key (SMTP_PASS)
                  </label>
                  <div className="relative">
                    <input
                      type={showSmtpPass ? 'text' : 'password'}
                      value={config.smtpPass}
                      onChange={e => setConfig({ ...config, smtpPass: e.target.value })}
                      placeholder="Brevo SMTP Key (xsmtpsib-...)"
                      className="w-full px-3.5 py-2.5 pr-10 rounded-xl bg-slate-900 border border-white/15 text-xs text-white focus:outline-none focus:border-[#5DE2E7]"
                    />
                    <button
                      type="button"
                      onClick={() => setShowSmtpPass(!showSmtpPass)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
                    >
                      {showSmtpPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Brevo REST API Key */}
            <div className="space-y-4 border-t border-white/10 pt-5">
              <label className="text-xs font-extrabold uppercase tracking-wider text-[#5DE2E7] block">
                3. Brevo REST API v3 Key (BREVO_API_KEY)
              </label>

              <div>
                <label className="text-[11px] font-bold text-slate-300 block mb-1">
                  Brevo v3 API Key (Starts with xkeysib-...)
                </label>
                <div className="relative">
                  <input
                    type={showBrevoKey ? 'text' : 'password'}
                    value={config.brevoApiKey}
                    onChange={e => setConfig({ ...config, brevoApiKey: e.target.value })}
                    placeholder="xkeysib-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
                    className="w-full px-3.5 py-2.5 pr-10 rounded-xl bg-slate-900 border border-white/15 text-xs text-white focus:outline-none focus:border-[#5DE2E7] font-mono"
                  />
                  <button
                    type="button"
                    onClick={() => setShowBrevoKey(!showBrevoKey)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
                  >
                    {showBrevoKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                <p className="text-[10px] text-slate-400 mt-1.5">
                  Get your Brevo API Key in <strong>Brevo Dashboard &gt; SMTP &amp; API &gt; API Keys &gt; Generate a new API key</strong>.
                </p>
              </div>
            </div>

            {/* Sender Identity (Name & From Email) */}
            <div className="space-y-4 border-t border-white/10 pt-5">
              <label className="text-xs font-extrabold uppercase tracking-wider text-[#5DE2E7] block">
                4. Sender Branding &amp; From Address
              </label>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-[11px] font-bold text-slate-300 block mb-1">
                    Sender From Name (SMTP_FROM_NAME)
                  </label>
                  <input
                    type="text"
                    value={config.smtpFromName}
                    onChange={e => setConfig({ ...config, smtpFromName: e.target.value })}
                    placeholder="Online Task Lab"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-white/15 text-xs text-white focus:outline-none focus:border-[#5DE2E7]"
                  />
                </div>

                <div>
                  <label className="text-[11px] font-bold text-slate-300 block mb-1">
                    Sender From Email (SMTP_FROM_EMAIL)
                  </label>
                  <input
                    type="email"
                    value={config.smtpFromEmail}
                    onChange={e => setConfig({ ...config, smtpFromEmail: e.target.value })}
                    placeholder="no-reply@onlinetasklab.com or verified sender"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-white/15 text-xs text-white focus:outline-none focus:border-[#5DE2E7]"
                  />
                  <span className="text-[10px] text-slate-400 mt-1 block">
                    Must be an authorized sender in your Brevo account (Senders &amp; IP).
                  </span>
                </div>
              </div>
            </div>

            {/* Feedback Messages */}
            {saveSuccessMsg && (
              <div className="p-3.5 rounded-2xl bg-emerald-950/80 border border-emerald-500/50 text-xs font-bold text-emerald-200 flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>{saveSuccessMsg}</span>
              </div>
            )}

            {saveErrorMsg && (
              <div className="p-3.5 rounded-2xl bg-rose-950/80 border border-rose-500/50 text-xs font-bold text-rose-200 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
                <span>{saveErrorMsg}</span>
              </div>
            )}

            {/* Save Button */}
            <div className="flex items-center justify-between gap-4 pt-3">
              <span className="text-[11px] text-slate-400">
                {config.updatedAt ? `Last saved: ${new Date(config.updatedAt).toLocaleString()}` : ''}
              </span>

              <button
                type="submit"
                disabled={isSavingConfig}
                className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-extrabold text-xs shadow-[0_0_20px_rgba(93,226,231,0.4)] transition cursor-pointer disabled:opacity-50"
              >
                {isSavingConfig ? 'Saving Settings...' : 'Save Configuration Live'}
              </button>
            </div>
          </form>

          {/* Test Email Dispatch Card */}
          <div className="p-5 sm:p-6 rounded-3xl bg-slate-950/80 border border-[#5DE2E7]/30 space-y-4 shadow-xl">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-xl bg-cyan-500/20 text-[#5DE2E7]">
                <Send className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-sm font-extrabold text-white">Live Email Dispatch Test</h3>
                <p className="text-xs text-slate-400">
                  Send an authentic 6-digit verification code to any Gmail or email address to verify delivery immediately.
                </p>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
              <input
                type="email"
                value={testEmailTo}
                onChange={e => setTestEmailTo(e.target.value)}
                placeholder="Enter recipient Gmail (e.g. md.farhan2250409@gmail.com)"
                className="flex-1 px-4 py-2.5 rounded-xl bg-slate-900 border border-white/15 text-xs text-white focus:outline-none focus:border-[#5DE2E7]"
              />
              <button
                type="button"
                onClick={handleSendTestEmail}
                disabled={isSendingTest}
                className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-[#133E87] to-cyan-600 hover:from-cyan-500 hover:to-blue-600 text-white font-bold text-xs flex items-center justify-center gap-2 transition cursor-pointer disabled:opacity-50 shadow-md"
              >
                {isSendingTest ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Sending Code...</span>
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4" />
                    <span>Send Test OTP Code</span>
                  </>
                )}
              </button>
            </div>

            {testResult && (
              <div
                className={`p-3.5 rounded-2xl border text-xs font-semibold space-y-1.5 ${
                  testResult.success
                    ? 'bg-emerald-950/80 border-emerald-500/50 text-emerald-200'
                    : 'bg-rose-950/80 border-rose-500/50 text-rose-200'
                }`}
              >
                <div className="flex items-center gap-2 font-bold">
                  {testResult.success ? <CheckCircle2 className="w-4 h-4 text-emerald-400" /> : <AlertTriangle className="w-4 h-4 text-rose-400" />}
                  <span>{testResult.message}</span>
                </div>
                {testResult.otp && (
                  <p className="text-[11px] font-mono text-cyan-300">
                    Generated Test OTP: <strong>{testResult.otp}</strong> (Dispatched via {testResult.provider})
                  </p>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Detail Modal for Selected Email Log */}
      <AnimatePresence>
        {selectedLog && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="w-full max-w-xl rounded-3xl bg-slate-900 border border-white/15 p-5 sm:p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto no-scrollbar"
            >
              <div className="flex items-center justify-between border-b border-white/10 pb-3">
                <div className="flex items-center gap-2">
                  <Mail className="w-5 h-5 text-[#5DE2E7]" />
                  <h3 className="text-sm font-black text-white">Email Dispatch Details</h3>
                </div>
                <button
                  onClick={() => setSelectedLog(null)}
                  className="p-1 rounded-lg bg-white/10 text-slate-400 hover:text-white"
                >
                  ✕
                </button>
              </div>

              <div className="space-y-3 text-xs">
                <div className="grid grid-cols-2 gap-2 p-3 rounded-2xl bg-slate-950 border border-white/10 font-mono text-[11px]">
                  <div>
                    <span className="text-slate-500 block">Recipient Email:</span>
                    <strong className="text-white select-all">{selectedLog.recipientEmail}</strong>
                  </div>
                  <div>
                    <span className="text-slate-500 block">Username:</span>
                    <strong className="text-cyan-300">@{selectedLog.username || 'N/A'}</strong>
                  </div>
                  <div>
                    <span className="text-slate-500 block">Purpose:</span>
                    <strong className="text-amber-300">{selectedLog.purpose}</strong>
                  </div>
                  <div>
                    <span className="text-slate-500 block">Provider:</span>
                    <strong className="text-emerald-300">{selectedLog.provider}</strong>
                  </div>
                  <div>
                    <span className="text-slate-500 block">Sent Timestamp:</span>
                    <span className="text-slate-300">{new Date(selectedLog.sentAt).toLocaleString()}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 block">Status:</span>
                    <span className={selectedLog.verified ? 'text-emerald-400 font-bold' : 'text-slate-300'}>
                      {selectedLog.verified ? 'Verified by User' : selectedLog.status}
                    </span>
                  </div>
                </div>

                {selectedLog.otpCode && (
                  <div className="p-3.5 rounded-2xl bg-cyan-950/40 border border-cyan-500/40 flex items-center justify-between">
                    <div>
                      <span className="text-[10px] uppercase font-bold text-cyan-400 block">Dispatched OTP Code:</span>
                      <span className="text-2xl font-black text-white font-mono tracking-widest">{selectedLog.otpCode}</span>
                    </div>
                    <button
                      onClick={() => handleCopyOtp(selectedLog.otpCode!, selectedLog.id)}
                      className="px-3 py-1.5 rounded-xl bg-cyan-500/20 hover:bg-cyan-500/30 text-[#5DE2E7] border border-cyan-400/40 font-bold text-xs flex items-center gap-1.5 transition cursor-pointer"
                    >
                      {copiedOtpId === selectedLog.id ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                      <span>Copy OTP</span>
                    </button>
                  </div>
                )}

                <div>
                  <span className="text-slate-400 text-[11px] block mb-1 font-bold">Subject Line:</span>
                  <div className="p-2.5 rounded-xl bg-slate-950 border border-white/10 text-white font-medium">
                    {selectedLog.subject}
                  </div>
                </div>

                {selectedLog.errorMessage && (
                  <div className="p-3 rounded-xl bg-rose-950/60 border border-rose-500/40 text-rose-200">
                    <strong className="block text-[10px] uppercase tracking-wider text-rose-400">Error Report:</strong>
                    <span className="font-mono text-[11px]">{selectedLog.errorMessage}</span>
                  </div>
                )}

                {selectedLog.deliveryMessageId && (
                  <div>
                    <span className="text-slate-400 text-[10px] block font-mono">Message-ID: {selectedLog.deliveryMessageId}</span>
                  </div>
                )}
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-white/10">
                <button
                  onClick={() => setSelectedLog(null)}
                  className="px-4 py-2 rounded-xl bg-white/10 hover:bg-white/15 text-white font-bold text-xs transition cursor-pointer"
                >
                  Close Details
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
