import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useAuth } from '../../context/AuthContext';
import { useApp } from '../../context/AppContext';
import { supportService } from '../../services/supportService';
import { guestService } from '../../services/guestService';
import {
  SupportConversation,
  SupportMessage,
  SupportAttachment,
  SupportReport,
  SupportReportCategory,
  SupportReportPriority
} from '../../types';
import {
  MessageSquare,
  X,
  Send,
  Image as ImageIcon,
  User,
  Bot,
  Headphones,
  ShieldCheck,
  Sparkles,
  ChevronDown,
  Minimize2,
  Maximize2,
  ExternalLink,
  Paperclip,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  Clock,
  ChevronRight,
  FileText,
  RotateCcw,
  Plus,
  AlertTriangle,
  Compass,
  Wrench,
  Volume2,
  VolumeX,
  Play,
  Pause,
  Square,
  Copy,
  Check,
  ThumbsUp,
  ThumbsDown,
  Share2,
  RefreshCw,
  MoreHorizontal,
  Edit2,
  Loader2,
  ChevronUp,
  Minus,
  Globe
} from 'lucide-react';
import { OtlLogo } from '../OtlLogo';
import { FullscreenSupportWorkspace } from './FullscreenSupportWorkspace';
import {
  ChatMessageContent,
  getCleanTextForClipboard,
  cleanTextForSpeechSynthesis,
  SupportContextAction
} from './ChatMessageContent';

export const FloatingAISupport: React.FC = () => {
  const { currentUser, isAuthenticated, setIsAuthModalOpen, requireAuth } = useAuth();
  const {
    isAdminOpen,
    floatingButtonsSettings,
    siteSettings,
    recordTelegramClick,
    setIsSearchModalOpen,
    resources,
    setTelegramDownloadModalResource
  } = useApp();

  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [conversationsList, setConversationsList] = useState<SupportConversation[]>([]);
  const [conversation, setConversation] = useState<SupportConversation | null>(null);
  const [messages, setMessages] = useState<SupportMessage[]>([]);
  const [inputText, setInputText] = useState('');
  const [attachment, setAttachment] = useState<SupportAttachment | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [isHandoffLoading, setIsHandoffLoading] = useState(false);
  const [errorBanner, setErrorBanner] = useState<string | null>(null);
  const [zoomedImage, setZoomedImage] = useState<string | null>(null);
  const [expandedSourcesMsgId, setExpandedSourcesMsgId] = useState<string | null>(null);
  const [latestSuggestedAction, setLatestSuggestedAction] = useState<string | null>(null);
  const [latestReportData, setLatestReportData] = useState<{ category: SupportReportCategory; title: string; summary: string } | null>(null);

  // Persistent Support Reports for this session
  const [reports, setReports] = useState<SupportReport[]>([]);
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);
  const [isSubmittingReport, setIsSubmittingReport] = useState(false);
  const [reportTitle, setReportTitle] = useState('');
  const [reportDescription, setReportDescription] = useState('');
  const [reportCategory, setReportCategory] = useState<SupportReportCategory>('technical');
  const [reportPriority, setReportPriority] = useState<SupportReportPriority>('medium');
  const [reportAttachment, setReportAttachment] = useState<SupportAttachment | null>(null);
  const [isReportAttachmentUploading, setIsReportAttachmentUploading] = useState(false);

  // Reopen report modal/state
  const [reopeningReportId, setReopeningReportId] = useState<string | null>(null);
  const [reopenReasonText, setReopenReasonText] = useState('');
  const [isReopening, setIsReopening] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const reportFileInputRef = useRef<HTMLInputElement>(null);
  const chatTextareaRef = useRef<HTMLTextAreaElement>(null);

  // Auto-resize chat textarea like WhatsApp, Telegram, Messenger
  useEffect(() => {
    const el = chatTextareaRef.current;
    if (!el) return;
    el.style.height = 'auto';
    const scrollHeight = el.scrollHeight;
    // Initial 1-line height is 40px, maximum auto-expand is 130px (~4-5 lines)
    const nextHeight = Math.min(Math.max(scrollHeight, 40), 130);
    el.style.height = `${nextHeight}px`;
  }, [inputText]);

  // ElevenLabs TTS & Message Actions State
  interface AudioPlayerState {
    messageId: string;
    status: 'generating' | 'playing' | 'paused' | 'stopped' | 'error';
    detectedLanguage?: 'bn' | 'en' | 'mixed';
    characterCount?: number;
    duration?: number;
    currentTime?: number;
    error?: string;
    isBrowserFallback?: boolean;
  }

  const [activeAudio, setActiveAudio] = useState<AudioPlayerState | null>(null);
  const [openMoreMenuMsgId, setOpenMoreMenuMsgId] = useState<string | null>(null);
  const [copiedMsgId, setCopiedMsgId] = useState<string | null>(null);
  const [likedMsgIds, setLikedMsgIds] = useState<Set<string>>(new Set());
  const [dislikedMsgIds, setDislikedMsgIds] = useState<Set<string>>(new Set());
  const [ttsPublicSettings, setTtsPublicSettings] = useState<{ enabled: boolean; browserFallback: boolean } | null>(null);
  const currentAudioRef = useRef<HTMLAudioElement | null>(null);

  // Load TTS public settings on mount
  useEffect(() => {
    supportService.getTtsSettings().then(s => {
      setTtsPublicSettings({ enabled: s.enabled, browserFallback: s.browserFallback });
    }).catch(() => {
      setTtsPublicSettings({ enabled: true, browserFallback: true });
    });
  }, []);

  // Stop audio playback when chat is closed or unmounted
  useEffect(() => {
    if (!isOpen) {
      stopAudioPlayback();
    }
  }, [isOpen]);

  const stopAudioPlayback = () => {
    if (currentAudioRef.current) {
      const audio = currentAudioRef.current;
      audio.onplay = null;
      audio.onpause = null;
      audio.onended = null;
      audio.onerror = null;
      audio.ontimeupdate = null;
      audio.onloadedmetadata = null;
      try {
        audio.pause();
        audio.currentTime = 0;
      } catch {}
      currentAudioRef.current = null;
    }
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
    setActiveAudio(prev => prev ? { ...prev, status: 'stopped', currentTime: 0 } : null);
  };

  const playBrowserSpeech = (text: string, msgId: string, langHint?: string) => {
    if (!('speechSynthesis' in window)) {
      setActiveAudio({
        messageId: msgId,
        status: 'error',
        error: 'Speech playback is not supported on this browser.'
      });
      return;
    }

    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    const voices = window.speechSynthesis.getVoices();
    if (langHint === 'bn') {
      const bnVoice = voices.find(v => v.lang.toLowerCase().includes('bn'));
      if (bnVoice) utterance.voice = bnVoice;
    }
    utterance.rate = 0.95;

    utterance.onstart = () => {
      setActiveAudio({
        messageId: msgId,
        status: 'playing',
        detectedLanguage: (langHint as any) || 'bn',
        isBrowserFallback: true
      });
    };

    utterance.onend = () => {
      setActiveAudio(prev => (prev?.messageId === msgId ? { ...prev, status: 'stopped', currentTime: 0 } : prev));
    };

    utterance.onerror = () => {
      setActiveAudio({
        messageId: msgId,
        status: 'error',
        error: 'Voice playback encountered an error.'
      });
    };

    window.speechSynthesis.speak(utterance);
  };

  const handleReadAloud = async (msg: SupportMessage) => {
    setOpenMoreMenuMsgId(null);

    // Toggle pause/play if same message
    if (activeAudio?.messageId === msg.id) {
      if (activeAudio.status === 'playing') {
        if (activeAudio.isBrowserFallback) {
          window.speechSynthesis.pause();
        } else if (currentAudioRef.current) {
          currentAudioRef.current.pause();
        }
        setActiveAudio(prev => prev ? { ...prev, status: 'paused' } : null);
        return;
      } else if (activeAudio.status === 'paused') {
        if (activeAudio.isBrowserFallback) {
          window.speechSynthesis.resume();
        } else if (currentAudioRef.current) {
          currentAudioRef.current.play().catch(() => {});
        }
        setActiveAudio(prev => prev ? { ...prev, status: 'playing' } : null);
        return;
      }
    }

    stopAudioPlayback();

    setActiveAudio({
      messageId: msg.id,
      status: 'generating'
    });

    try {
      const res = await supportService.generateSpeech({
        messageId: msg.id,
        text: msg.content
      });

      if (!res.success || !res.audioBase64) {
        if (res.fallbackToBrowser && ('speechSynthesis' in window)) {
          playBrowserSpeech(msg.content, msg.id, res.detectedLanguage);
          return;
        }

        setActiveAudio({
          messageId: msg.id,
          status: 'error',
          error: res.error || 'Voice playback is temporarily unavailable. You can still read the response.'
        });
        return;
      }

      const audio = new Audio(`data:${res.mimeType || 'audio/mpeg'};base64,${res.audioBase64}`);
      currentAudioRef.current = audio;

      audio.onloadedmetadata = () => {
        setActiveAudio(prev => prev?.messageId === msg.id ? {
          ...prev,
          duration: audio.duration
        } : prev);
      };

      audio.ontimeupdate = () => {
        setActiveAudio(prev => prev?.messageId === msg.id ? {
          ...prev,
          currentTime: audio.currentTime
        } : prev);
      };

      audio.onended = () => {
        setActiveAudio(prev => prev?.messageId === msg.id ? {
          ...prev,
          status: 'stopped',
          currentTime: 0
        } : prev);
      };

      audio.onerror = () => {
        if (!audio.src || audio.src === window.location.href) return;
        if (ttsPublicSettings?.browserFallback && ('speechSynthesis' in window)) {
          playBrowserSpeech(msg.content, msg.id, res.detectedLanguage);
        } else {
          setActiveAudio({
            messageId: msg.id,
            status: 'error',
            error: 'Playback error occurred. You can still read the response.'
          });
        }
      };

      await audio.play();

      setActiveAudio({
        messageId: msg.id,
        status: 'playing',
        detectedLanguage: res.detectedLanguage,
        characterCount: res.characterCount,
        duration: audio.duration || 0,
        currentTime: 0,
        isBrowserFallback: false
      });
    } catch (err: any) {
      if (ttsPublicSettings?.browserFallback && ('speechSynthesis' in window)) {
        playBrowserSpeech(msg.content, msg.id);
      } else {
        setActiveAudio({
          messageId: msg.id,
          status: 'error',
          error: 'Voice playback is temporarily unavailable. You can still read the response.'
        });
      }
    }
  };

  const handleCopyMessage = async (msgId: string, content: string) => {
    try {
      await navigator.clipboard.writeText(content);
      setCopiedMsgId(msgId);
      setTimeout(() => setCopiedMsgId(null), 2000);
    } catch {}
  };

  const handleLikeMessage = (msgId: string) => {
    setLikedMsgIds(prev => {
      const next = new Set(prev);
      if (next.has(msgId)) next.delete(msgId);
      else {
        next.add(msgId);
        setDislikedMsgIds(d => { const dNext = new Set(d); dNext.delete(msgId); return dNext; });
      }
      return next;
    });
  };

  const handleDislikeMessage = (msgId: string) => {
    setDislikedMsgIds(prev => {
      const next = new Set(prev);
      if (next.has(msgId)) next.delete(msgId);
      else {
        next.add(msgId);
        setLikedMsgIds(l => { const lNext = new Set(l); lNext.delete(msgId); return lNext; });
      }
      return next;
    });
  };

  const handleShareMessage = async (content: string) => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'OTL Live Support',
          text: content
        });
        return;
      } catch {}
    }
    try {
      await navigator.clipboard.writeText(content);
      setErrorBanner('Message copied to clipboard.');
      setTimeout(() => setErrorBanner(null), 2000);
    } catch {}
  };

  const handleRegenerate = (msgIndex: number) => {
    for (let i = msgIndex - 1; i >= 0; i--) {
      if (messages[i].senderType === 'user' || messages[i].senderType === 'guest') {
        handleSendMessage(messages[i].content);
        return;
      }
    }
  };

  const handleEditUserMessage = (content: string) => {
    setInputText(content);
    const inputEl = document.getElementById('otl-support-chat-input');
    if (inputEl) inputEl.focus();
  };

  const formatAudioTime = (secs: number) => {
    if (isNaN(secs) || secs === 0) return '0:00';
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  // Authoritative Guest ID management
  const getGuestId = (): string => {
    return guestService.getOrCreateGuestId();
  };

  // Load user conversation list (for history in workspace & switcher)
  const loadUserConversations = async (search?: string) => {
    try {
      const guestId = getGuestId();
      const convs = await supportService.getUserConversations({
        userId: currentUser?.userId,
        guestId,
        search
      });
      setConversationsList(convs);
    } catch (e) {
      console.warn('Failed to load user conversations:', e);
    }
  };

  // Select a conversation from sidebar/history
  const handleSelectConversation = async (convId: string) => {
    try {
      setErrorBanner(null);
      const res = await supportService.getConversation(convId);
      if (res.conversation) {
        setConversation(res.conversation);
        setMessages(res.messages || []);
        loadReports(res.conversation.id);
      }
    } catch (e: any) {
      setErrorBanner(e.message || 'Failed to load conversation.');
    }
  };

  // Check if current conversation has no user messages written
  const isCurrentChatEmpty = () => {
    if (!conversation) return true;
    const hasUserMsg = messages.some(m => m.senderType === 'user' || m.senderType === 'guest');
    const hasLastMsg = Boolean(conversation.lastMessage && conversation.lastMessage.trim());
    return !hasUserMsg && !hasLastMsg;
  };

  // Start a brand new conversation
  const handleNewChat = async () => {
    // If the user hasn't written or sent anything in the current chat box, do NOT open/create a new chat box!
    if (isCurrentChatEmpty() && conversation) {
      setErrorBanner(null);
      setTimeout(() => {
        const inputEl = (document.getElementById('otl-chat-input') || document.querySelector('textarea, input[type="text"]')) as HTMLElement | null;
        inputEl?.focus();
      }, 50);
      return;
    }

    try {
      setErrorBanner(null);
      const guestId = !isAuthenticated ? getGuestId() : undefined;
      const res = await supportService.createNewConversation({
        guestId,
        userId: currentUser?.userId,
        userName: currentUser
          ? `${currentUser.firstName || ''} ${currentUser.lastName || ''}`.trim() || currentUser.username
          : 'Guest Visitor',
        userEmail: currentUser?.email,
        pageUrl: window.location.href,
        initialTitle: 'New Conversation'
      });
      if (res.conversation) {
        setConversation(res.conversation);
        setMessages(res.messages || []);
        setReports([]);
        loadUserConversations();
        setTimeout(() => {
          const inputEl = (document.getElementById('otl-chat-input') || document.querySelector('textarea, input[type="text"]')) as HTMLElement | null;
          inputEl?.focus();
        }, 50);
      }
    } catch (e: any) {
      setErrorBanner(e.message || 'Failed to create new conversation.');
    }
  };

  // Delete a conversation
  const handleDeleteConversation = async (convId: string) => {
    try {
      const guestId = !isAuthenticated ? getGuestId() : undefined;
      await supportService.deleteConversation(convId, {
        userId: currentUser?.userId,
        guestId
      });
      setConversationsList(prev => prev.filter(c => c.id !== convId));
      if (conversation?.id === convId) {
        const remaining = conversationsList.filter(c => c.id !== convId);
        if (remaining.length > 0) {
          handleSelectConversation(remaining[0].id);
        } else {
          handleNewChat();
        }
      }
    } catch (e: any) {
      setErrorBanner(e.message || 'Failed to delete conversation.');
    }
  };

  // Helper for reopening report from Fullscreen or Floating
  const handleReopenReport = async (reportId: string, reason: string) => {
    if (!conversation) return;
    try {
      setErrorBanner(null);
      await supportService.reopenReport(reportId, reason || 'Issue recurred or was not resolved.');
      await loadReports(conversation.id);
      await loadConversation();
    } catch (err: any) {
      setErrorBanner(err.message || 'Failed to reopen report.');
    }
  };

  // Fetch reports for current conversation
  const loadReports = async (convId: string) => {
    try {
      const data = await supportService.getReportsForConversation(convId);
      setReports(data);
    } catch (e) {
      // Quiet fail for reports
    }
  };

  // Initialize or fetch conversation
  const loadConversation = async () => {
    try {
      setErrorBanner(null);
      const guestId = !isAuthenticated ? getGuestId() : undefined;
      const res = await supportService.getOrCreateConversation({
        guestId,
        userId: currentUser?.userId,
        userName: currentUser ? `${currentUser.firstName || ''} ${currentUser.lastName || ''}`.trim() || currentUser.username : 'Guest Visitor',
        userEmail: currentUser?.email,
        pageUrl: window.location.href
      });

      setConversation(res.conversation);
      setMessages(res.messages || []);

      if (res.conversation?.id) {
        loadReports(res.conversation.id);
        loadUserConversations();
      }

      // If user is now logged in and was previously a guest, link account
      if (isAuthenticated && currentUser && guestId && res.conversation.guestId === guestId) {
        supportService.linkAccount(res.conversation.id, guestId, {
          uid: currentUser.userId,
          email: currentUser.email,
          name: currentUser.username
        }).then(linked => {
          if (linked.conversation) setConversation(linked.conversation);
        }).catch(() => {});
      }
    } catch (err: any) {
      console.warn('[Support Widget Load Error]:', err);
      setErrorBanner('Could not establish chat session. Please retry.');
    }
  };

  // Poll for messages and reports when chat is open to receive human admin replies
  useEffect(() => {
    if (!isOpen || !conversation) return;

    const interval = setInterval(async () => {
      try {
        const res = await supportService.getConversation(conversation.id);
        if (res.conversation) setConversation(res.conversation);
        if (res.messages && res.messages.length !== messages.length) {
          setMessages(res.messages);
        }
        loadReports(conversation.id);
      } catch (e) {}
    }, 4000);

    return () => clearInterval(interval);
  }, [isOpen, conversation?.id, messages.length]);

  // Load session upon opening or user change
  useEffect(() => {
    if (isOpen) {
      loadUserConversations();
      if (!conversation) {
        loadConversation();
      }
    }
  }, [isOpen, isAuthenticated, currentUser?.userId]);

  // Auto-scroll to bottom
  useEffect(() => {
    if (isOpen && !isMinimized) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isSending, isOpen, isMinimized]);

  // Don't render floating widget inside the Admin Panel
  if (isAdminOpen) return null;

  // Handle file attachment selection
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setIsUploading(true);
      setErrorBanner(null);
      const uploaded = await supportService.uploadScreenshot(file);
      setAttachment(uploaded);
    } catch (err: any) {
      setErrorBanner(err.message || 'Image upload failed.');
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  // Send message
  const handleSendMessage = async (textToSend?: string) => {
    const text = (textToSend !== undefined ? textToSend : inputText).trim();
    if ((!text && !attachment) || isSending || !conversation) return;

    const currentAttachment = attachment;
    setInputText('');
    if (chatTextareaRef.current) {
      chatTextareaRef.current.style.height = '40px';
    }
    setAttachment(null);
    setErrorBanner(null);
    setIsSending(true);

    // Optimistically add user message to thread
    const tempUserMsg: SupportMessage = {
      id: `temp_${Date.now()}`,
      conversationId: conversation.id,
      senderType: isAuthenticated ? 'user' : 'guest',
      senderId: currentUser?.userId || 'guest',
      senderName: currentUser?.username || 'You',
      content: text || (currentAttachment ? '[Attached Screenshot]' : ''),
      attachment: currentAttachment || undefined,
      createdAt: new Date().toISOString()
    };
    setMessages(prev => [...prev, tempUserMsg]);
    guestService.trackEvent('chat_message_sent', { details: `Conv: ${conversation.id}` });

    try {
      const res = await supportService.sendMessage(conversation.id, {
        content: text,
        attachment: currentAttachment || undefined,
        senderType: isAuthenticated ? 'user' : 'guest',
        senderName: currentUser?.username || 'Visitor',
        senderId: currentUser?.userId
      });

      // Update messages with authoritative server records
      setMessages(prev => {
        const withoutTemp = prev.filter(m => m.id !== tempUserMsg.id);
        const next = [...withoutTemp, res.userMessage];
        if (res.aiMessage) next.push(res.aiMessage);
        return next;
      });

      // Update conversation state & technician suggestions
      setConversation(prev => prev ? { ...prev, status: res.status } : null);
      if (res.suggestedAction) {
        setLatestSuggestedAction(res.suggestedAction);
      }
      if (res.reportData) {
        setLatestReportData(res.reportData);
      }

      // Update conversations list so updated titles & times reflect immediately
      loadUserConversations();
    } catch (err: any) {
      setErrorBanner(err.message || 'Failed to send message.');
    } finally {
      setIsSending(false);
    }
  };

  // Request Human Handoff
  const handleRequestHandoff = async () => {
    if (!conversation || isHandoffLoading) return;
    try {
      setIsHandoffLoading(true);
      setErrorBanner(null);
      const res = await supportService.requestHandoff(conversation.id);
      setConversation(res.conversation);
      setMessages(res.messages);
    } catch (err: any) {
      setErrorBanner(err.message || 'Failed to escalate to human agent.');
    } finally {
      setIsHandoffLoading(false);
    }
  };

  // Contextual action button dispatcher (ChatGPT-style action triggers)
  const handleContextAction = (action: SupportContextAction) => {
    switch (action) {
      case 'login':
        setIsAuthModalOpen(true, 'login');
        break;
      case 'register':
        setIsAuthModalOpen(true, 'register');
        break;
      case 'download': {
        const recentProduct = [...messages].reverse().find(m => m.productCard)?.productCard;
        if (recentProduct) {
          const matched = resources.find(
            r => r.id === recentProduct.id || r.title.toLowerCase() === recentProduct.title.toLowerCase()
          );
          if (matched) {
            if (!requireAuth(() => setTelegramDownloadModalResource(matched), '🔒 Account Required: Please log in or create a free account to download this resource!')) {
              return;
            }
            setTelegramDownloadModalResource(matched);
            return;
          }
        }
        setIsSearchModalOpen(true);
        break;
      }
      case 'telegram': {
        const recentProduct = [...messages].reverse().find(m => m.productCard)?.productCard;
        recordTelegramClick?.();
        window.open(
          recentProduct?.telegramUrl || siteSettings?.telegramChannel || 'https://t.me/OnlineTaskLab',
          '_blank',
          'noopener,noreferrer'
        );
        break;
      }
      case 'report_issue': {
        if (latestReportData) {
          setReportCategory(latestReportData.category);
          setReportTitle(latestReportData.title);
          setReportDescription(latestReportData.summary);
        } else {
          const hasDownloadIssue = messages.some(
            m => m.content.toLowerCase().includes('download') || m.productCard
          );
          if (hasDownloadIssue) {
            setReportCategory('download');
            setReportTitle('Download Troubleshooting Issue');
          }
        }
        setIsReportModalOpen(true);
        break;
      }
      case 'human_support':
        handleRequestHandoff();
        break;
      case 'send_screenshot':
        fileInputRef.current?.click();
        break;
    }
  };

  // Upload screenshot for Support Report
  const handleReportAttachmentChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setIsReportAttachmentUploading(true);
      const uploaded = await supportService.uploadScreenshot(file);
      setReportAttachment(uploaded);
    } catch (err: any) {
      setErrorBanner(err.message || 'Report image upload failed.');
    } finally {
      setIsReportAttachmentUploading(false);
      if (reportFileInputRef.current) reportFileInputRef.current.value = '';
    }
  };

  // Submit Persistent Support Report
  const handleSubmitReport = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!conversation) return;
    if (!reportTitle.trim()) {
      setErrorBanner('Please enter an issue title.');
      return;
    }
    if (!reportDescription.trim()) {
      setErrorBanner('Please describe the issue in detail.');
      return;
    }

    try {
      setIsSubmittingReport(true);
      setErrorBanner(null);

      const guestId = !isAuthenticated ? getGuestId() : undefined;
      const userName = currentUser
        ? `${currentUser.firstName || ''} ${currentUser.lastName || ''}`.trim() || currentUser.username
        : 'Guest Visitor';

      const rep = await supportService.createReport({
        conversationId: conversation.id,
        userId: currentUser?.userId,
        guestId,
        userName,
        userEmail: currentUser?.email,
        title: reportTitle.trim(),
        description: reportDescription.trim(),
        category: reportCategory,
        priority: reportPriority,
        attachments: reportAttachment ? [reportAttachment] : []
      });

      guestService.trackEvent('support_report_submitted', {
        resourceId: rep.id,
        details: `Category: ${reportCategory}, Title: ${reportTitle.trim()}`
      });

      // Clear form
      setReportTitle('');
      setReportDescription('');
      setReportAttachment(null);
      setIsReportModalOpen(false);

      // Refresh reports and conversation
      await loadReports(conversation.id);
      await loadConversation();
    } catch (err: any) {
      setErrorBanner(err.message || 'Failed to file support report.');
    } finally {
      setIsSubmittingReport(false);
    }
  };

  // Reopen a resolved report
  const handleConfirmReopen = async () => {
    if (!reopeningReportId || !conversation) return;
    try {
      setIsReopening(true);
      setErrorBanner(null);
      await supportService.reopenReport(reopeningReportId, reopenReasonText || 'Issue recurred or was not resolved.');
      setReopeningReportId(null);
      setReopenReasonText('');
      await loadReports(conversation.id);
      await loadConversation();
    } catch (err: any) {
      setErrorBanner(err.message || 'Failed to reopen report.');
    } finally {
      setIsReopening(false);
    }
  };

  // Quick prompt suggestions
  const quickPrompts = [
    'How do I download resources on OTL?',
    'Are all MOD APKs safe from viruses?',
    'What features are in CapCut Pro?',
    'How do I install Lightroom Presets?'
  ];

  const isLeft = floatingButtonsSettings?.position === 'bottom-left';
  const togglePosClass = isLeft
    ? 'bottom-20 md:bottom-6 left-4 md:left-6'
    : 'bottom-20 md:bottom-6 right-4 md:right-6';

  const modalPosClass = isLeft
    ? 'bottom-4 left-4 md:bottom-6 md:left-6'
    : 'bottom-4 right-4 md:bottom-6 md:right-6';

  return (
    <>
      {/* Floating Toggle Button (Bottom, placed below Support button) */}
      <div
        className={`otl-floating-support-btn ${isLeft ? 'pos-left justify-start' : 'justify-end'}`}
        style={{ display: isOpen ? 'none' : 'flex' }}
      >
        <button
          type="button"
          onClick={async () => {
            setIsOpen(true);
            setIsMinimized(false);
            await handleNewChat();
          }}
          className="relative group flex items-center p-1.5 rounded-full bg-gradient-to-r from-[#0B1D51] via-[#133E87] to-cyan-700/90 text-white border border-[#5DE2E7]/60 shadow-[0_0_25px_rgba(93,226,231,0.5),inset_0_0_12px_rgba(93,226,231,0.2)] hover:border-[#5DE2E7] hover:shadow-[0_0_35px_rgba(93,226,231,0.75),inset_0_0_16px_rgba(93,226,231,0.3)] active:scale-95 transition-all duration-300 ease-out cursor-pointer backdrop-blur-xl select-none"
          aria-label="Open OTL Live Support"
        >
          {/* Pulse Glow Beacon */}
          <span className="absolute -top-1 -right-1 flex h-4 w-4 pointer-events-none z-20">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-80" />
            <span className="relative inline-flex rounded-full h-4 w-4 bg-cyan-400 border-2 border-slate-950 items-center justify-center shadow-[0_0_8px_#5DE2E7]">
              <Sparkles className="w-2.5 h-2.5 text-slate-950" />
            </span>
          </span>

          {/* Prominent Circular Logo */}
          <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-full bg-slate-950/80 border border-[#5DE2E7]/40 flex items-center justify-center shrink-0 shadow-[0_0_15px_rgba(93,226,231,0.35)] group-hover:scale-105 group-hover:border-[#5DE2E7] transition-all duration-300">
            <OtlLogo size={36} animate={true} />
          </div>

          {/* Smooth Hover Expand Text */}
          <div className="max-w-0 opacity-0 group-hover:max-w-[200px] group-hover:opacity-100 group-hover:pl-3 group-hover:pr-3.5 group-focus-visible:max-w-[200px] group-focus-visible:opacity-100 group-focus-visible:pl-3 group-focus-visible:pr-3.5 overflow-hidden whitespace-nowrap transition-all duration-300 ease-out flex items-center gap-2 pointer-events-none">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse shrink-0 shadow-[0_0_8px_#34d399]" />
            <span className="tracking-wide font-black text-xs sm:text-sm text-transparent bg-clip-text bg-gradient-to-r from-white via-cyan-100 to-cyan-300 drop-shadow-[0_0_8px_rgba(93,226,231,0.5)]">
              OTL Live Support
            </span>
          </div>
        </button>
      </div>

      {/* Main Support Chat Window Modal (Floating Mode) */}
      <AnimatePresence>
        {isOpen && !isFullscreen && (
          <motion.div
            initial={{ opacity: 0, y: 30, scale: 0.94 }}
            animate={{
              opacity: 1,
              y: 0,
              scale: 1,
              height: isMinimized ? '72px' : '620px'
            }}
            exit={{ opacity: 0, y: 30, scale: 0.94 }}
            transition={{ duration: 0.25 }}
            className={`fixed z-50 ${modalPosClass} w-[calc(100vw-32px)] sm:w-[420px] rounded-3xl overflow-hidden glass-panel border border-[#5DE2E7]/40 shadow-[0_0_50px_rgba(11,29,81,0.9)] flex flex-col bg-[#060B1E]/95 backdrop-blur-2xl transition-all ${
              isMinimized ? 'h-[72px]' : 'h-[620px] max-h-[85vh]'
            }`}
          >
            {/* Top Window Header */}
            <div className="p-3.5 sm:p-4 bg-gradient-to-r from-[#0B1D51] via-[#133E87] to-[#0B1D51] border-b border-white/10 flex items-center justify-between gap-3 shrink-0">
              <div
                onClick={() => handleNewChat()}
                className="flex items-center gap-3 cursor-pointer group"
                title="Click to start New Chat"
              >
                <div className="relative">
                  <div className="w-10 h-10 rounded-2xl bg-slate-950/70 border border-[#5DE2E7]/60 flex items-center justify-center text-[#5DE2E7] shadow-[0_0_15px_rgba(93,226,231,0.4)] group-hover:scale-105 transition-transform">
                    {conversation?.status === 'human_handling' ? (
                      <Headphones className="w-5 h-5 text-emerald-400" />
                    ) : (
                      <OtlLogo size={32} animate={true} />
                    )}
                  </div>
                  {/* Status Indicator Dot */}
                  <span
                    className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-slate-950 ${
                      conversation?.status === 'human_handling'
                        ? 'bg-emerald-400'
                        : conversation?.status === 'waiting_human'
                        ? 'bg-amber-400 animate-pulse'
                        : 'bg-[#5DE2E7]'
                    }`}
                  />
                </div>

                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm font-black text-white tracking-wide group-hover:text-cyan-300 transition-colors">
                      {conversation?.status === 'human_handling'
                        ? (conversation.assignedAdmin || 'Human Specialist')
                        : 'OTL Live Support'}
                    </h3>
                    <span
                      className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full uppercase tracking-wider border ${
                        conversation?.status === 'human_handling'
                          ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
                          : conversation?.status === 'waiting_human'
                          ? 'bg-amber-500/20 text-amber-300 border-amber-500/30'
                          : 'bg-[#5DE2E7]/20 text-[#5DE2E7] border-[#5DE2E7]/30'
                      }`}
                    >
                      {conversation?.status === 'human_handling'
                        ? 'Live Admin'
                        : conversation?.status === 'waiting_human'
                        ? 'Waiting Agent'
                        : 'RAG AI'}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-300 flex items-center gap-1">
                    <ShieldCheck className="w-3 h-3 text-cyan-400" />
                    <span>Verified Knowledge & Live Support</span>
                  </p>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-1">
                {/* New Chat Button */}
                <button
                  id="otl-btn-floating-new-chat"
                  onClick={() => handleNewChat()}
                  className="p-2 rounded-xl text-slate-400 hover:text-cyan-300 hover:bg-white/10 transition cursor-pointer"
                  title="Start New Chat"
                >
                  <Plus className="w-4 h-4" />
                </button>

                {/* Fullscreen Workspace Toggle */}
                <button
                  id="otl-btn-expand-fullscreen"
                  onClick={() => {
                    setIsFullscreen(true);
                    setIsMinimized(false);
                  }}
                  className="p-2 rounded-xl text-slate-400 hover:text-cyan-300 hover:bg-white/10 transition cursor-pointer"
                  title="Expand to Fullscreen Workspace"
                >
                  <Maximize2 className="w-4 h-4" />
                </button>

                {/* Close Button */}
                <button
                  id="otl-btn-close-floating"
                  onClick={() => setIsOpen(false)}
                  className="p-2 rounded-xl text-slate-400 hover:text-red-400 hover:bg-red-500/10 transition cursor-pointer"
                  title="Close"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Chat Body (when not minimized) */}
            {!isMinimized && (
              <>
                {/* Secondary Sub-Header / Handoff Banner */}
                <div className="px-3.5 py-2 bg-slate-950/80 border-b border-white/5 flex items-center justify-between gap-2 text-xs">
                  <div className="flex items-center gap-1.5 text-slate-400 text-[11px] truncate">
                    <Clock className="w-3 h-3 text-cyan-400 shrink-0" />
                    <span className="truncate">
                      {conversation?.status === 'waiting_human'
                        ? 'Support admin notified. Standing by...'
                        : conversation?.status === 'human_handling'
                        ? 'Live specialist connected'
                        : 'Instant AI answers grounded in site data'}
                    </span>
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0">
                    <button
                      onClick={() => setIsReportModalOpen(true)}
                      className="px-2 py-1 rounded-lg bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 text-amber-300 text-[11px] font-bold flex items-center gap-1 transition active:scale-95 cursor-pointer"
                      title="File an issue report that stays attached to your account"
                    >
                      <FileText className="w-3 h-3" />
                      <span>Report Issue</span>
                    </button>

                    {conversation?.status === 'ai_handling' && (
                      <button
                        onClick={handleRequestHandoff}
                        disabled={isHandoffLoading}
                        className="px-2 py-1 rounded-lg bg-[#5DE2E7]/10 hover:bg-[#5DE2E7]/20 border border-[#5DE2E7]/30 text-[#5DE2E7] text-[11px] font-bold flex items-center gap-1 transition active:scale-95 disabled:opacity-50 cursor-pointer"
                      >
                        <Headphones className="w-3 h-3" />
                        <span>{isHandoffLoading ? 'Wait...' : 'Human'}</span>
                      </button>
                    )}
                  </div>
                </div>

                {/* Persistent Support Reports Banner (if any report exists) */}
                {reports.length > 0 && (
                  <div className="px-3 py-2 bg-slate-900/90 border-b border-white/10 space-y-1.5">
                    {reports.slice(0, 2).map(rep => {
                      const isResolved = rep.status === 'resolved' || rep.status === 'closed';
                      return (
                        <div
                          key={rep.id}
                          className={`p-2 rounded-xl border flex items-center justify-between gap-2 text-[11px] ${
                            isResolved
                              ? 'bg-emerald-950/40 border-emerald-500/30 text-emerald-200'
                              : rep.status === 'admin_handling'
                              ? 'bg-cyan-950/40 border-cyan-500/30 text-cyan-200'
                              : 'bg-amber-950/40 border-amber-500/30 text-amber-200'
                          }`}
                        >
                          <div className="flex items-center gap-1.5 min-w-0">
                            <FileText className="w-3.5 h-3.5 shrink-0" />
                            <div className="min-w-0">
                              <div className="flex items-center gap-1.5">
                                <span className="font-bold text-white font-mono text-[10px]">#{rep.id}</span>
                                <span
                                  className={`px-1.5 py-0.2 rounded-full text-[9px] font-black uppercase ${
                                    isResolved
                                      ? 'bg-emerald-500/20 text-emerald-300'
                                      : rep.status === 'admin_handling'
                                      ? 'bg-cyan-500/20 text-cyan-300'
                                      : 'bg-amber-500/20 text-amber-300 animate-pulse'
                                  }`}
                                >
                                  {rep.status.replace(/_/g, ' ')}
                                </span>
                              </div>
                              <p className="truncate text-slate-300 text-[10px] font-medium">{rep.title}</p>
                            </div>
                          </div>

                          <div className="flex items-center gap-1 shrink-0">
                            {isResolved ? (
                              <button
                                onClick={() => {
                                  setReopeningReportId(rep.id);
                                  setReopenReasonText('');
                                }}
                                className="px-2 py-0.5 rounded-lg bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-500/40 text-emerald-300 font-bold text-[10px] flex items-center gap-1 transition cursor-pointer"
                              >
                                <RotateCcw className="w-2.5 h-2.5" />
                                <span>Reopen</span>
                              </button>
                            ) : (
                              <span className="text-[10px] text-slate-400 font-mono">Open</span>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* Error Banner */}
                {errorBanner && (
                  <div className="px-4 py-2 bg-red-500/20 border-b border-red-500/30 text-red-300 text-xs flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
                    <span className="flex-1">{errorBanner}</span>
                    <button onClick={() => setErrorBanner(null)} className="text-red-400 hover:text-white">
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                )}

                {/* Messages Scroll Area */}
                <div className="flex-1 overflow-y-auto p-4 space-y-4 text-xs scrollbar-thin">
                  {messages.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center text-center p-6 space-y-3 text-slate-400">
                      <div className="flex items-center justify-center my-1">
                        <OtlLogo size={56} animate={true} />
                      </div>
                      <h4 className="font-bold text-slate-200 text-sm">How can we help you?</h4>
                      <p className="text-xs text-slate-400 max-w-[260px]">
                        Ask any question in Bangla or English. We are here to assist you.
                      </p>
                    </div>
                  ) : (
                    messages.map((msg, idx) => {
                      const isUser = msg.senderType === 'user' || msg.senderType === 'guest';
                      const isAi = msg.senderType === 'ai';
                      const isAdminMsg = msg.senderType === 'admin';
                      const isSystem = msg.senderType === 'system';

                      if (isSystem) {
                        return (
                          <div key={msg.id} className="flex justify-center my-2">
                            <span className="px-3 py-1 rounded-full bg-white/5 border border-white/10 text-slate-400 text-[10px] font-medium text-center max-w-[90%]">
                              {msg.content}
                            </span>
                          </div>
                        );
                      }

                      return (
                        <div
                          key={msg.id}
                          className={`flex gap-2.5 ${isUser ? 'justify-end' : 'justify-start'}`}
                        >
                          {!isUser && (
                            <div
                              className={`w-7 h-7 rounded-xl flex items-center justify-center shrink-0 mt-0.5 ${
                                isAdminMsg
                                  ? 'bg-emerald-500/20 border border-emerald-500/40 text-emerald-300'
                                  : 'flex items-center justify-center'
                              }`}
                            >
                              {isAdminMsg ? (
                                <Headphones className="w-3.5 h-3.5" />
                              ) : (
                                <OtlLogo size={26} animate={true} />
                              )}
                            </div>
                          )}

                          <div
                            className={`max-w-[82%] space-y-1 ${
                              isUser ? 'items-end text-right' : 'items-start text-left'
                            }`}
                          >
                            {/* Sender Info */}
                            <div className="flex items-center gap-1.5 text-[10px] text-slate-400 px-1">
                              <span className="font-bold text-slate-300">
                                {msg.senderName === 'OTL AI Support' ? 'OTL Live Support' : msg.senderName}
                              </span>
                              <span>
                                {new Date(msg.createdAt).toLocaleTimeString([], {
                                  hour: '2-digit',
                                  minute: '2-digit'
                                })}
                              </span>
                            </div>

                            {/* Attachment Thumbnail if present */}
                            {msg.attachment && (
                              <div
                                onClick={() => setZoomedImage(msg.attachment!.url)}
                                className="cursor-pointer overflow-hidden rounded-2xl border border-white/20 hover:border-cyan-400 transition mb-1.5 shadow-lg group relative max-w-[220px]"
                              >
                                <img
                                  src={msg.attachment.url}
                                  alt={msg.attachment.name}
                                  className="w-full h-auto max-h-40 object-cover group-hover:scale-105 transition-transform"
                                  referrerPolicy="no-referrer"
                                />
                                <div className="p-1.5 bg-slate-950/80 text-[10px] text-slate-300 flex items-center justify-between">
                                  <span className="truncate">{msg.attachment.name}</span>
                                  <span className="text-cyan-400 font-bold ml-1">Click to Zoom</span>
                                </div>
                              </div>
                            )}

                            {/* Message Bubble */}
                            <div
                              className={`p-3 sm:p-3.5 rounded-2xl leading-relaxed ${
                                isUser
                                  ? 'bg-gradient-to-br from-[#133E87] to-cyan-600 text-white shadow-[0_0_15px_rgba(93,226,231,0.2)] rounded-tr-sm'
                                  : isAdminMsg
                                  ? 'bg-gradient-to-br from-emerald-950 to-slate-900 border border-emerald-500/40 text-emerald-100 rounded-tl-sm'
                                  : 'bg-slate-900/90 border border-white/10 text-slate-200 rounded-tl-sm'
                              }`}
                            >
                              <ChatMessageContent
                                content={msg.content}
                                isUser={isUser}
                                onActionClick={handleContextAction}
                              />
                            </div>

                            {/* RAG Source Citations if present */}
                            {isAi && msg.ragSources && msg.ragSources.length > 0 && (
                              <div className="pt-1">
                                <button
                                  onClick={() =>
                                    setExpandedSourcesMsgId(
                                      expandedSourcesMsgId === msg.id ? null : msg.id
                                    )
                                  }
                                  className="flex items-center gap-1 text-[10px] text-cyan-300/80 hover:text-cyan-300 transition font-medium cursor-pointer"
                                >
                                  <CheckCircle2 className="w-3 h-3 text-cyan-400" />
                                  <span>{msg.ragSources.length} Grounded Sources Used</span>
                                  <ChevronDown
                                    className={`w-3 h-3 transition-transform ${
                                      expandedSourcesMsgId === msg.id ? 'rotate-180' : ''
                                    }`}
                                  />
                                </button>

                                {expandedSourcesMsgId === msg.id && (
                                  <div className="mt-1.5 p-2 rounded-xl bg-slate-950/70 border border-cyan-500/20 space-y-1 text-[10px]">
                                    {msg.ragSources.map((s, idx) => (
                                      <div
                                        key={idx}
                                        className="flex items-center justify-between gap-2 text-slate-300"
                                      >
                                        <span className="truncate text-cyan-200">
                                          • {s.title} ({s.category || 'General'})
                                        </span>
                                        {s.score && (
                                          <span className="text-[9px] text-slate-400 font-mono">
                                            {Math.round(s.score * 100)}% match
                                          </span>
                                        )}
                                      </div>
                                    ))}
                                  </div>
                                )}
                              </div>
                            )}

                            {/* Audio Player Bar (ElevenLabs / Browser TTS) */}
                            {activeAudio?.messageId === msg.id && (
                              <div className="mt-2 p-2.5 rounded-xl bg-slate-950/95 border border-cyan-500/30 shadow-[0_0_15px_rgba(93,226,231,0.15)] text-xs space-y-1.5">
                                <div className="flex items-center justify-between gap-2">
                                  <div className="flex items-center gap-2 min-w-0">
                                    <div className="w-6 h-6 rounded-lg bg-cyan-500/20 text-cyan-300 flex items-center justify-center shrink-0">
                                      {activeAudio.status === 'generating' ? (
                                        <Loader2 className="w-3.5 h-3.5 animate-spin text-cyan-400" />
                                      ) : activeAudio.status === 'playing' ? (
                                        <Volume2 className="w-3.5 h-3.5 text-cyan-300 animate-pulse" />
                                      ) : (
                                        <VolumeX className="w-3.5 h-3.5 text-slate-400" />
                                      )}
                                    </div>
                                    <div className="truncate">
                                      <div className="text-[11px] font-bold text-cyan-200 flex items-center gap-1.5">
                                        <span>
                                          {activeAudio.status === 'generating'
                                            ? 'Generating Voice...'
                                            : activeAudio.status === 'playing'
                                            ? 'Reading Aloud'
                                            : activeAudio.status === 'paused'
                                            ? 'Paused'
                                            : 'Voice Playback'}
                                        </span>
                                        {activeAudio.detectedLanguage && (
                                          <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-cyan-950/80 border border-cyan-500/30 text-cyan-300 font-medium">
                                            {activeAudio.detectedLanguage === 'bn'
                                              ? 'বাংলা 🇧🇩'
                                              : activeAudio.detectedLanguage === 'mixed'
                                              ? 'Mixed 🌐'
                                              : 'English 🇬🇧'}
                                          </span>
                                        )}
                                        {activeAudio.isBrowserFallback && (
                                          <span className="text-[9px] px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 font-medium">
                                            Browser Voice
                                          </span>
                                        )}
                                      </div>
                                    </div>
                                  </div>

                                  <div className="flex items-center gap-1 shrink-0">
                                    {activeAudio.status !== 'generating' && (
                                      <>
                                        <button
                                          onClick={() => handleReadAloud(msg)}
                                          className="p-1 rounded-lg bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-300 transition cursor-pointer"
                                          title={activeAudio.status === 'playing' ? 'Pause' : 'Play'}
                                        >
                                          {activeAudio.status === 'playing' ? (
                                            <Pause className="w-3 h-3" />
                                          ) : (
                                            <Play className="w-3 h-3" />
                                          )}
                                        </button>
                                        <button
                                          onClick={stopAudioPlayback}
                                          className="p-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition cursor-pointer"
                                          title="Stop"
                                        >
                                          <Square className="w-3 h-3" />
                                        </button>
                                      </>
                                    )}
                                    <button
                                      onClick={() => {
                                        stopAudioPlayback();
                                        setActiveAudio(null);
                                      }}
                                      className="p-1 rounded-lg hover:bg-white/10 text-slate-400 hover:text-white transition cursor-pointer"
                                      title="Close"
                                    >
                                      <X className="w-3 h-3" />
                                    </button>
                                  </div>
                                </div>

                                {activeAudio.status === 'generating' && (
                                  <div className="flex items-center gap-2 text-[10px] text-cyan-300/80 pt-0.5">
                                    <div className="flex items-end gap-0.5 h-3">
                                      <span className="w-1 h-2 bg-cyan-400 animate-pulse" />
                                      <span className="w-1 h-3.5 bg-cyan-400 animate-pulse" />
                                      <span className="w-1 h-2.5 bg-cyan-400 animate-pulse" />
                                      <span className="w-1 h-3 bg-cyan-400 animate-pulse" />
                                    </div>
                                    <span>ElevenLabs AI Voice Synthesizing...</span>
                                  </div>
                                )}

                                {activeAudio.status === 'playing' && (
                                  <div className="flex items-center gap-2 pt-0.5">
                                    <div className="h-1 flex-1 bg-slate-800 rounded-full overflow-hidden">
                                      <div
                                        className="h-full bg-cyan-400 transition-all duration-200"
                                        style={{
                                          width: activeAudio.duration
                                            ? `${Math.min(
                                                100,
                                                ((activeAudio.currentTime || 0) / activeAudio.duration) * 100
                                              )}%`
                                            : '100%'
                                        }}
                                      />
                                    </div>
                                    <div className="text-[9px] font-mono text-slate-400 shrink-0">
                                      {formatAudioTime(activeAudio.currentTime || 0)} /{' '}
                                      {formatAudioTime(activeAudio.duration || 0)}
                                    </div>
                                  </div>
                                )}

                                {activeAudio.status === 'error' && (
                                  <div className="text-[10px] text-amber-300 flex items-start gap-1.5 bg-amber-500/10 p-2 rounded-lg border border-amber-500/20">
                                    <AlertTriangle className="w-3 h-3 shrink-0 mt-0.5" />
                                    <div className="flex-1">
                                      <p>{activeAudio.error}</p>
                                      {'speechSynthesis' in window && (
                                        <button
                                          onClick={() => playBrowserSpeech(cleanTextForSpeechSynthesis(msg.content), msg.id)}
                                          className="mt-1 text-[10px] text-cyan-300 underline font-bold hover:text-cyan-200 cursor-pointer"
                                        >
                                          Read with browser voice instead
                                        </button>
                                      )}
                                    </div>
                                  </div>
                                )}
                              </div>
                            )}

                            {/* Message Action Toolbar */}
                            <div
                              className={`flex items-center gap-0.5 pt-1 text-slate-400 relative ${
                                isUser ? 'justify-end' : 'justify-start'
                              }`}
                            >
                              {isAi && (
                                <>
                                  {/* Copy */}
                                  <button
                                    onClick={() => handleCopyMessage(msg.id, getCleanTextForClipboard(msg.content))}
                                    className="p-1 rounded-md hover:bg-white/10 hover:text-cyan-300 transition text-[11px] cursor-pointer"
                                    title={copiedMsgId === msg.id ? 'Copied!' : 'Copy response'}
                                  >
                                    {copiedMsgId === msg.id ? (
                                      <Check className="w-3.5 h-3.5 text-emerald-400" />
                                    ) : (
                                      <Copy className="w-3.5 h-3.5" />
                                    )}
                                  </button>

                                  {/* Like */}
                                  <button
                                    onClick={() => handleLikeMessage(msg.id)}
                                    className={`p-1 rounded-md transition text-[11px] cursor-pointer ${
                                      likedMsgIds.has(msg.id)
                                        ? 'bg-cyan-500/20 text-cyan-300'
                                        : 'hover:bg-white/10 hover:text-cyan-300'
                                    }`}
                                    title="Good response"
                                  >
                                    <ThumbsUp className="w-3.5 h-3.5" />
                                  </button>

                                  {/* Dislike */}
                                  <button
                                    onClick={() => handleDislikeMessage(msg.id)}
                                    className={`p-1 rounded-md transition text-[11px] cursor-pointer ${
                                      dislikedMsgIds.has(msg.id)
                                        ? 'bg-rose-500/20 text-rose-400'
                                        : 'hover:bg-white/10 hover:text-rose-400'
                                    }`}
                                    title="Poor response"
                                  >
                                    <ThumbsDown className="w-3.5 h-3.5" />
                                  </button>

                                  {/* Share */}
                                  <button
                                    onClick={() => handleShareMessage(getCleanTextForClipboard(msg.content))}
                                    className="p-1 rounded-md hover:bg-white/10 hover:text-cyan-300 transition text-[11px] cursor-pointer"
                                    title="Share message"
                                  >
                                    <Share2 className="w-3.5 h-3.5" />
                                  </button>

                                  {/* Regenerate */}
                                  <button
                                    onClick={() => handleRegenerate(idx)}
                                    className="p-1 rounded-md hover:bg-white/10 hover:text-cyan-300 transition text-[11px] cursor-pointer"
                                    title="Regenerate response"
                                  >
                                    <RefreshCw className="w-3.5 h-3.5" />
                                  </button>

                                  {/* Read Aloud Quick Button */}
                                  <button
                                    onClick={() => handleReadAloud(msg)}
                                    className={`p-1 rounded-md transition text-[11px] cursor-pointer flex items-center gap-1 ${
                                      activeAudio?.messageId === msg.id
                                        ? 'bg-cyan-500/20 text-cyan-300'
                                        : 'hover:bg-white/10 hover:text-cyan-300'
                                    }`}
                                    title="Read Aloud / শুনুন"
                                  >
                                    <Volume2 className="w-3.5 h-3.5" />
                                  </button>

                                  {/* More Menu (...) */}
                                  <div className="relative">
                                    <button
                                      onClick={() =>
                                        setOpenMoreMenuMsgId(
                                          openMoreMenuMsgId === msg.id ? null : msg.id
                                        )
                                      }
                                      className={`p-1 rounded-md transition text-[11px] cursor-pointer ${
                                        openMoreMenuMsgId === msg.id
                                          ? 'bg-white/15 text-white'
                                          : 'hover:bg-white/10 hover:text-white'
                                      }`}
                                      title="More actions"
                                    >
                                      <MoreHorizontal className="w-3.5 h-3.5" />
                                    </button>

                                    {/* Dropdown Menu */}
                                    {openMoreMenuMsgId === msg.id && (
                                      <div className="absolute left-0 bottom-full mb-1 w-44 rounded-xl bg-slate-900 border border-white/15 shadow-2xl p-1 z-30 text-xs space-y-0.5">
                                        <button
                                          onClick={() => handleReadAloud(msg)}
                                          className="w-full px-2.5 py-1.5 rounded-lg hover:bg-cyan-500/20 text-cyan-300 hover:text-cyan-200 text-left flex items-center gap-2 cursor-pointer font-medium"
                                        >
                                          <Volume2 className="w-3.5 h-3.5 text-cyan-400" />
                                          <span>Read Aloud / শুনুন</span>
                                        </button>
                                        <button
                                          onClick={() => {
                                            handleCopyMessage(msg.id, msg.content);
                                            setOpenMoreMenuMsgId(null);
                                          }}
                                          className="w-full px-2.5 py-1.5 rounded-lg hover:bg-white/10 text-slate-300 hover:text-white text-left flex items-center gap-2 cursor-pointer"
                                        >
                                          <Copy className="w-3.5 h-3.5" />
                                          <span>Copy Full Text</span>
                                        </button>
                                        <button
                                          onClick={() => {
                                            handleShareMessage(msg.content);
                                            setOpenMoreMenuMsgId(null);
                                          }}
                                          className="w-full px-2.5 py-1.5 rounded-lg hover:bg-white/10 text-slate-300 hover:text-white text-left flex items-center gap-2 cursor-pointer"
                                        >
                                          <Share2 className="w-3.5 h-3.5" />
                                          <span>Share Answer</span>
                                        </button>
                                      </div>
                                    )}
                                  </div>
                                </>
                              )}

                              {isUser && (
                                <>
                                  <button
                                    onClick={() => handleCopyMessage(msg.id, msg.content)}
                                    className="p-1 rounded-md hover:bg-white/10 hover:text-cyan-300 transition text-[11px] cursor-pointer"
                                    title={copiedMsgId === msg.id ? 'Copied!' : 'Copy'}
                                  >
                                    {copiedMsgId === msg.id ? (
                                      <Check className="w-3.5 h-3.5 text-emerald-400" />
                                    ) : (
                                      <Copy className="w-3.5 h-3.5" />
                                    )}
                                  </button>
                                  <button
                                    onClick={() => handleEditUserMessage(msg.content)}
                                    className="p-1 rounded-md hover:bg-white/10 hover:text-cyan-300 transition text-[11px] cursor-pointer"
                                    title="Edit message"
                                  >
                                    <Edit2 className="w-3.5 h-3.5" />
                                  </button>
                                </>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })
                  )}

                  {/* Typing Indicator */}
                  {isSending && (
                    <div className="flex gap-2 items-center text-slate-400 text-xs py-1">
                      <div className="w-7 h-7 flex items-center justify-center shrink-0">
                        <OtlLogo size={26} animate={true} />
                      </div>
                      <div className="px-3 py-2 rounded-2xl bg-slate-900 border border-white/10 flex items-center gap-1.5">
                        <span className="text-[11px] text-slate-300">Thinking...</span>
                        <div className="flex gap-1">
                          <span className="w-1.5 h-1.5 rounded-full bg-[#5DE2E7] animate-bounce" style={{ animationDelay: '0ms' }} />
                          <span className="w-1.5 h-1.5 rounded-full bg-[#5DE2E7] animate-bounce" style={{ animationDelay: '150ms' }} />
                          <span className="w-1.5 h-1.5 rounded-full bg-[#5DE2E7] animate-bounce" style={{ animationDelay: '300ms' }} />
                        </div>
                      </div>
                    </div>
                  )}

                  <div ref={messagesEndRef} />
                </div>

                {/* Quick Prompts Carousel (when less than 3 messages) */}
                {messages.length <= 2 && (
                  <div className="px-3 pb-2 flex gap-1.5 overflow-x-auto scrollbar-none shrink-0">
                    {quickPrompts.map((prompt, idx) => (
                      <button
                        key={idx}
                        onClick={() => handleSendMessage(prompt)}
                        className="px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-slate-300 hover:text-[#5DE2E7] text-[11px] font-medium whitespace-nowrap transition cursor-pointer shrink-0"
                      >
                        {prompt}
                      </button>
                    ))}
                  </div>
                )}

                {/* Attachment Preview (ChatGPT Thumbnail style) */}
                {attachment && (
                  <div className="px-3 pt-2 pb-1 bg-slate-950/90 border-t border-white/10 flex items-center justify-between shrink-0">
                    <div className="flex items-center gap-2.5">
                      <div className="relative group inline-block">
                        <img
                          src={attachment.url}
                          alt="attachment preview"
                          className="w-12 h-12 rounded-xl object-cover border border-cyan-400/50 shadow-md"
                          referrerPolicy="no-referrer"
                        />
                        <button
                          type="button"
                          onClick={() => setAttachment(null)}
                          className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-slate-950/90 border border-white/25 text-white flex items-center justify-center hover:bg-rose-600 transition shadow cursor-pointer"
                          title="Remove attachment"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                      <div className="text-left">
                        <div className="flex items-center gap-1.5">
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-cyan-500/20 text-[#5DE2E7] border border-[#5DE2E7]/40 shadow-xs">
                            👁️ AI Vision Enabled
                          </span>
                        </div>
                        <p className="text-[10px] text-slate-400 mt-0.5 truncate max-w-[200px]">{attachment.name}</p>
                      </div>
                    </div>
                  </div>
                )}

                {/* URL Detected Notice */}
                {/https?:\/\/[^\s]+/i.test(inputText) && (
                  <div className="px-3 py-1.5 bg-cyan-500/10 border-t border-[#5DE2E7]/20 flex items-center gap-2 text-[11px] text-cyan-300 shrink-0">
                    <Globe className="w-3.5 h-3.5 text-[#5DE2E7] shrink-0 animate-pulse" />
                    <span className="font-medium">Link Detected — AI will fetch & analyze the webpage content</span>
                  </div>
                )}

                {/* Contextual Technician Escalation Prompt (if problem is unresolved) */}
                {latestSuggestedAction === 'offer_report' && (
                  <div className="mx-3 mb-2 p-2.5 rounded-2xl bg-[#0B1D51]/90 border border-[#5DE2E7]/40 flex items-center justify-between gap-2 shadow-lg animate-fadeIn">
                    <div className="flex items-center gap-2 min-w-0">
                      <Wrench className="w-4 h-4 text-[#5DE2E7] shrink-0" />
                      <span className="text-[11px] text-slate-200 truncate font-medium">
                        Still having issues?
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <button
                        onClick={() => {
                          if (latestReportData) {
                            setReportTitle(latestReportData.title || 'Technical Issue');
                            setReportCategory(latestReportData.category || 'technical');
                            setReportDescription(latestReportData.summary || '');
                          }
                          setIsReportModalOpen(true);
                        }}
                        className="px-2.5 py-1 rounded-xl bg-[#5DE2E7] hover:bg-[#48cfd4] text-slate-950 font-black text-[10px] flex items-center gap-1 transition shadow cursor-pointer active:scale-95"
                      >
                        <FileText className="w-3 h-3" />
                        <span>File Report</span>
                      </button>
                      <button
                        onClick={handleRequestHandoff}
                        disabled={isHandoffLoading}
                        className="px-2 py-1 rounded-xl bg-white/10 hover:bg-white/15 text-slate-300 text-[10px] font-bold transition cursor-pointer active:scale-95"
                      >
                        Human
                      </button>
                      <button
                        onClick={() => setLatestSuggestedAction(null)}
                        className="p-1 text-slate-400 hover:text-white"
                        title="Dismiss"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                )}

                {/* Chat Input Footer */}
                <div className="p-2.5 sm:p-3 bg-slate-950/90 border-t border-white/10 shrink-0">
                  <div className="relative flex items-end gap-2">
                    {/* Hidden File Input */}
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/png,image/jpeg,image/webp"
                      onChange={handleFileChange}
                      className="hidden"
                    />

                    {/* Image Attachment Trigger */}
                    <button
                      id="otl-floating-attach-btn"
                      type="button"
                      disabled={isUploading}
                      onClick={() => fileInputRef.current?.click()}
                      className="h-10 w-10 flex items-center justify-center rounded-2xl bg-white/5 hover:bg-white/10 text-slate-400 hover:text-[#5DE2E7] border border-white/10 transition cursor-pointer disabled:opacity-50 shrink-0 mb-0.5"
                      title="Attach screenshot or photo"
                    >
                      <ImageIcon className="w-4 h-4" />
                    </button>

                    {/* Multi-line Auto-Expanding Textarea */}
                    <div className="flex-1 relative min-w-0">
                      <textarea
                        id="otl-support-chat-input"
                        ref={chatTextareaRef}
                        rows={1}
                        value={inputText}
                        onChange={e => setInputText(e.target.value)}
                        onKeyDown={e => {
                          if (e.key === 'Enter' && !e.shiftKey) {
                            e.preventDefault();
                            if ((inputText.trim() || attachment) && !isSending) {
                              handleSendMessage();
                            }
                          }
                        }}
                        placeholder="Ask anything... (Shift + Enter for new line)"
                        className="w-full bg-slate-900/90 border border-white/15 focus:border-[#5DE2E7] rounded-2xl px-3.5 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-[#5DE2E7] transition resize-none leading-relaxed overflow-y-auto max-h-[130px] scrollbar-thin block"
                      />
                    </div>

                    {/* Send Button */}
                    <button
                      id="otl-floating-send-btn"
                      onClick={() => handleSendMessage()}
                      disabled={(!inputText.trim() && !attachment) || isSending}
                      className="h-10 w-10 flex items-center justify-center rounded-2xl bg-gradient-to-r from-[#133E87] to-cyan-500 hover:from-[#133E87] hover:to-cyan-400 text-white font-bold transition-all shadow-[0_0_15px_rgba(93,226,231,0.4)] disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer shrink-0 mb-0.5 active:scale-95"
                      aria-label="Send message"
                      title="Send message (Enter)"
                    >
                      <Send className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Fullscreen Support Workspace (Modern App Mode) */}
      <AnimatePresence>
        {isOpen && isFullscreen && (
          <FullscreenSupportWorkspace
            conversation={conversation}
            conversationsList={conversationsList}
            messages={messages}
            inputText={inputText}
            isSending={isSending}
            isUploading={isUploading}
            attachment={attachment}
            reports={reports}
            errorBanner={errorBanner}
            copiedMsgId={copiedMsgId}
            likedMsgIds={likedMsgIds}
            dislikedMsgIds={dislikedMsgIds}
            expandedSourcesMsgId={expandedSourcesMsgId}
            openMoreMenuMsgId={openMoreMenuMsgId}
            activeAudio={activeAudio}
            currentUser={currentUser}
            isAuthenticated={isAuthenticated}
            latestSuggestedAction={latestSuggestedAction}
            latestReportData={latestReportData}
            isHandoffLoading={isHandoffLoading}
            onInputChange={setInputText}
            onSendMessage={handleSendMessage}
            onFileUpload={handleFileChange}
            onRemoveAttachment={() => setAttachment(null)}
            onSelectConversation={handleSelectConversation}
            onNewChat={handleNewChat}
            onDeleteConversation={handleDeleteConversation}
            onMinimize={() => setIsFullscreen(false)}
            onClose={() => {
              setIsOpen(false);
              setIsFullscreen(false);
            }}
            onOpenReportModal={() => setIsReportModalOpen(true)}
            onRequestHandoff={handleRequestHandoff}
            onReopenReport={handleReopenReport}
            onCopyMessage={handleCopyMessage}
            onLikeMessage={handleLikeMessage}
            onDislikeMessage={handleDislikeMessage}
            onShareMessage={handleShareMessage}
            onRegenerate={handleRegenerate}
            onEditUserMessage={handleEditUserMessage}
            onToggleSources={id => setExpandedSourcesMsgId(prev => prev === id ? null : id)}
            onToggleMoreMenu={id => setOpenMoreMenuMsgId(prev => prev === id ? null : id)}
            onReadAloud={handleReadAloud}
            onStopAudio={stopAudioPlayback}
            onCloseAudio={() => setActiveAudio(null)}
            onPlayBrowserSpeech={playBrowserSpeech}
            onZoomImage={url => setZoomedImage(url)}
            onClearError={() => setErrorBanner(null)}
            onDismissEscalation={() => setLatestSuggestedAction(null)}
            onActionClick={handleContextAction}
          />
        )}
      </AnimatePresence>

      {/* Support Report Modal Dialog */}
      <AnimatePresence>
        {isReportModalOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[9999] bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4"
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="w-full max-w-lg rounded-3xl bg-[#0B132B] border border-cyan-500/40 shadow-[0_0_50px_rgba(11,29,81,0.9)] overflow-hidden flex flex-col max-h-[90vh]"
            >
              {/* Modal Header */}
              <div className="p-4 bg-gradient-to-r from-[#0B1D51] to-[#133E87] border-b border-white/10 flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-300">
                    <FileText className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-sm font-black text-white">File Persistent Support Report</h3>
                    <p className="text-[10px] text-slate-300">Stays attached to your profile until resolved</p>
                  </div>
                </div>
                <button
                  onClick={() => setIsReportModalOpen(false)}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Modal Form */}
              <form onSubmit={handleSubmitReport} className="p-5 overflow-y-auto space-y-4 text-xs">
                {/* Category Selection */}
                <div>
                  <label className="block text-[11px] font-bold text-slate-300 uppercase tracking-wider mb-2">
                    Issue Category
                  </label>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {[
                      { id: 'technical', label: 'Technical Bug' },
                      { id: 'download', label: 'Download Issue' },
                      { id: 'account', label: 'Account / Login' },
                      { id: 'payment', label: 'Payment / BKash' },
                      { id: 'general', label: 'General / Other' }
                    ].map(cat => (
                      <button
                        key={cat.id}
                        type="button"
                        onClick={() => setReportCategory(cat.id as SupportReportCategory)}
                        className={`p-2 rounded-xl text-[11px] font-bold border transition text-left cursor-pointer ${
                          reportCategory === cat.id
                            ? 'bg-cyan-500/20 border-cyan-400 text-cyan-300'
                            : 'bg-white/5 border-white/10 text-slate-400 hover:bg-white/10'
                        }`}
                      >
                        {cat.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Priority Selection */}
                <div>
                  <label className="block text-[11px] font-bold text-slate-300 uppercase tracking-wider mb-1.5">
                    Priority
                  </label>
                  <div className="flex gap-2">
                    {(['low', 'medium', 'high', 'urgent'] as SupportReportPriority[]).map(p => (
                      <button
                        key={p}
                        type="button"
                        onClick={() => setReportPriority(p)}
                        className={`px-3 py-1.5 rounded-xl text-[11px] font-bold capitalize border transition cursor-pointer ${
                          reportPriority === p
                            ? p === 'urgent'
                              ? 'bg-rose-500/30 border-rose-500 text-rose-300'
                              : p === 'high'
                              ? 'bg-amber-500/30 border-amber-500 text-amber-300'
                              : 'bg-cyan-500/20 border-cyan-400 text-cyan-300'
                            : 'bg-white/5 border-white/10 text-slate-400'
                        }`}
                      >
                        {p}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Title */}
                <div>
                  <label className="block text-[11px] font-bold text-slate-300 uppercase tracking-wider mb-1.5">
                    Issue Title *
                  </label>
                  <input
                    type="text"
                    required
                    value={reportTitle}
                    onChange={e => setReportTitle(e.target.value)}
                    placeholder="e.g. Cannot download CapCut APK from Google Drive link"
                    className="w-full bg-slate-900/90 border border-white/15 focus:border-cyan-400 rounded-xl px-3 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none"
                  />
                </div>

                {/* Description */}
                <div>
                  <label className="block text-[11px] font-bold text-slate-300 uppercase tracking-wider mb-1.5">
                    Detailed Description *
                  </label>
                  <textarea
                    rows={4}
                    required
                    value={reportDescription}
                    onChange={e => setReportDescription(e.target.value)}
                    placeholder="Explain what happened, steps you took, or error messages received..."
                    className="w-full bg-slate-900/90 border border-white/15 focus:border-cyan-400 rounded-xl p-3 text-xs text-white placeholder-slate-500 focus:outline-none"
                  />
                </div>

                {/* Screenshot Upload */}
                <div>
                  <label className="block text-[11px] font-bold text-slate-300 uppercase tracking-wider mb-1.5">
                    Screenshot / Proof (Optional)
                  </label>
                  <input
                    ref={reportFileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleReportAttachmentChange}
                    className="hidden"
                  />
                  {reportAttachment ? (
                    <div className="p-2.5 rounded-xl bg-slate-900/90 border border-cyan-500/40 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <img
                          src={reportAttachment.url}
                          alt="preview"
                          className="w-10 h-10 rounded-lg object-cover border border-cyan-400"
                          referrerPolicy="no-referrer"
                        />
                        <span className="text-slate-300 text-xs truncate max-w-[200px]">{reportAttachment.name}</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => setReportAttachment(null)}
                        className="text-red-400 hover:text-red-300 text-xs font-bold"
                      >
                        Remove
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      disabled={isReportAttachmentUploading}
                      onClick={() => reportFileInputRef.current?.click()}
                      className="w-full p-3 rounded-xl border border-dashed border-white/20 hover:border-cyan-400 text-slate-400 hover:text-cyan-300 flex items-center justify-center gap-2 transition cursor-pointer"
                    >
                      <Paperclip className="w-4 h-4" />
                      <span>{isReportAttachmentUploading ? 'Uploading Image...' : 'Attach Error Screenshot'}</span>
                    </button>
                  )}
                </div>

                {/* Buttons */}
                <div className="pt-2 flex items-center justify-end gap-2 border-t border-white/10">
                  <button
                    type="button"
                    onClick={() => setIsReportModalOpen(false)}
                    className="px-4 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 font-bold transition cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmittingReport}
                    className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-black shadow-[0_0_20px_rgba(93,226,231,0.4)] disabled:opacity-50 transition cursor-pointer"
                  >
                    {isSubmittingReport ? 'Submitting Report...' : 'Submit Support Report'}
                  </button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Reopen Report Modal Dialog */}
      <AnimatePresence>
        {reopeningReportId && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[9999] bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4"
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="w-full max-w-md rounded-3xl bg-[#0B132B] border border-amber-500/40 p-5 space-y-4"
            >
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-300">
                  <RotateCcw className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-black text-white">Reopen Report #{reopeningReportId}</h3>
                  <p className="text-[10px] text-slate-400">Our support team will be immediately notified</p>
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-300 mb-1.5">
                  Reason for Reopening *
                </label>
                <textarea
                  rows={3}
                  value={reopenReasonText}
                  onChange={e => setReopenReasonText(e.target.value)}
                  placeholder="Explain why the issue was not solved or how it recurred..."
                  className="w-full bg-slate-900/90 border border-white/15 focus:border-amber-400 rounded-xl p-3 text-xs text-white placeholder-slate-500 focus:outline-none"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-white/10">
                <button
                  type="button"
                  onClick={() => setReopeningReportId(null)}
                  className="px-3.5 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 font-bold text-xs"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={isReopening}
                  onClick={handleConfirmReopen}
                  className="px-4 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-orange-600 text-slate-950 font-black text-xs disabled:opacity-50"
                >
                  {isReopening ? 'Reopening...' : 'Confirm Reopen'}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Modal Zoom for Screenshots */}
      <AnimatePresence>
        {zoomedImage && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setZoomedImage(null)}
            className="fixed inset-0 z-[10000] bg-slate-950/90 backdrop-blur-md flex items-center justify-center p-4 cursor-zoom-out"
          >
            <div className="relative max-w-4xl max-h-[90vh] overflow-hidden rounded-2xl border border-white/20 shadow-2xl">
              <img
                src={zoomedImage}
                alt="Enlarged screenshot"
                className="w-full h-auto max-h-[85vh] object-contain"
                referrerPolicy="no-referrer"
              />
              <button
                onClick={() => setZoomedImage(null)}
                className="absolute top-3 right-3 p-2 rounded-full bg-slate-950/80 text-white hover:text-red-400 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};
