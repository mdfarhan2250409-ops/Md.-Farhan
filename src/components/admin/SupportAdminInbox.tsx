import React, { useState, useEffect, useRef, useMemo } from 'react';
import { supportService } from '../../services/supportService';
import { useAuth } from '../../context/AuthContext';
import {
  SupportConversation,
  SupportMessage,
  AIProviderConfig,
  KnowledgeDocument,
  AISettings,
  SupportStats,
  SupportAttachment,
  WebsiteSyncStatus,
  SupportReport,
  SupportReportCategory,
  SupportReportPriority,
  SupportReportStatus,
  TTSSettings,
  TTSStats,
  TTSVoiceOption,
  TTSApiKeyPublicEntry
} from '../../types';
import {
  MessageSquare,
  Search,
  CheckCircle2,
  Clock,
  User,
  Bot,
  Headphones,
  Sparkles,
  Send,
  Image as ImageIcon,
  RefreshCw,
  Plus,
  Trash2,
  Edit3,
  Zap,
  Sliders,
  Database,
  Filter,
  ShieldAlert,
  ArrowRight,
  ExternalLink,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  Users,
  AlertCircle,
  X,
  Globe,
  Layers,
  FileText,
  HelpCircle,
  Volume2,
  VolumeX,
  Play,
  Pause,
  Square,
  Radio,
  Eye,
  EyeOff,
  Key,
  Copy,
  Check
} from 'lucide-react';
import { OtlLogo } from '../OtlLogo';
import { ChatMessageContent } from '../support/ChatMessageContent';
import {
  VisitorChatGroup,
  getConversationDisplayTitle,
  groupConversationsByVisitor
} from '../../utils/supportGrouping';

export {
  type VisitorChatGroup,
  getConversationDisplayTitle,
  groupConversationsByVisitor
};

export const SupportAdminInbox: React.FC = () => {
  const { currentUser } = useAuth();

  // Active Admin Sub-tab: 'inbox' | 'reports' | 'providers' | 'knowledge' | 'voice' | 'settings'
  const [activeTab, setActiveTab] = useState<'inbox' | 'reports' | 'providers' | 'knowledge' | 'voice' | 'settings'>('inbox');

  // Stats
  const [stats, setStats] = useState<SupportStats | null>(null);

  /* ================= INBOX STATE ================= */
  const [conversations, setConversations] = useState<SupportConversation[]>([]);
  const [selectedConversationId, setSelectedConversationId] = useState<string | null>(null);
  const [activeMessages, setActiveMessages] = useState<SupportMessage[]>([]);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [userTypeFilter, setUserTypeFilter] = useState<'all' | 'guest' | 'registered'>('all');
  const [replyText, setReplyText] = useState('');
  const [adminAttachment, setAdminAttachment] = useState<SupportAttachment | null>(null);
  const [isSendingReply, setIsSendingReply] = useState(false);
  const [isLoadingThread, setIsLoadingThread] = useState(false);
  const [zoomedImage, setZoomedImage] = useState<string | null>(null);
  const [expandedVisitorKeys, setExpandedVisitorKeys] = useState<Record<string, boolean>>({});

  /* ================= SUPPORT REPORTS STATE ================= */
  const [reports, setReports] = useState<SupportReport[]>([]);
  const [selectedReportId, setSelectedReportId] = useState<string | null>(null);
  const [selectedReportDetails, setSelectedReportDetails] = useState<{
    report: SupportReport;
    conversation: SupportConversation;
    messages: SupportMessage[];
  } | null>(null);
  const [reportStatusFilter, setReportStatusFilter] = useState<string>('all');
  const [reportCategoryFilter, setReportCategoryFilter] = useState<string>('all');
  const [reportSearchQuery, setReportSearchQuery] = useState<string>('');
  const [reportReplyText, setReportReplyText] = useState<string>('');
  const [reportResolutionText, setReportResolutionText] = useState<string>('');
  const [reportInternalNoteText, setReportInternalNoteText] = useState<string>('');
  const [isSubmittingReportReply, setIsSubmittingReportReply] = useState<boolean>(false);
  const [isResolvingReport, setIsResolvingReport] = useState<boolean>(false);
  const [isLoadingReportDetails, setIsLoadingReportDetails] = useState<boolean>(false);
  const [reportNotice, setReportNotice] = useState<string | null>(null);

  /* ================= AI PROVIDERS STATE ================= */
  const [providers, setProviders] = useState<AIProviderConfig[]>([]);
  const [editingProvider, setEditingProvider] = useState<Partial<AIProviderConfig> | null>(null);
  const [isProviderModalOpen, setIsProviderModalOpen] = useState(false);
  const [editingProviderShowSecret, setEditingProviderShowSecret] = useState(false);
  const [testResults, setTestResults] = useState<Record<string, { loading: boolean; message: string; success?: boolean }>>({});
  const [providerNotice, setProviderNotice] = useState<{ text: string; error?: boolean } | null>(null);
  const [modalTestResult, setModalTestResult] = useState<{ loading?: boolean; success?: boolean; message?: string } | null>(null);
  const [isTestingModalConfig, setIsTestingModalConfig] = useState(false);

  const openEditProvider = (prov: AIProviderConfig) => {
    const storedSecret = localStorage.getItem(`otl_secret_ai_${prov.id}`);
    const effectiveKey = storedSecret || (
      prov.apiKey?.includes('••••') || prov.apiKey?.includes('Configured via Server Environment')
        ? ''
        : prov.apiKey || ''
    );
    setEditingProvider({
      ...prov,
      apiKey: effectiveKey
    });
    setEditingProviderShowSecret(false);
    setModalTestResult(null);
    setIsProviderModalOpen(true);
  };

  /* ================= KNOWLEDGE BASE STATE ================= */
  const [documents, setDocuments] = useState<KnowledgeDocument[]>([]);
  const [totalChunks, setTotalChunks] = useState(0);
  const [knowledgeSearch, setKnowledgeSearch] = useState('');
  const [knowledgeTypeFilter, setKnowledgeTypeFilter] = useState<string>('all');
  const [editingDoc, setEditingDoc] = useState<Partial<KnowledgeDocument> | null>(null);
  const [isDocModalOpen, setIsDocModalOpen] = useState(false);
  const [isReindexing, setIsReindexing] = useState(false);
  const [websiteSyncStatus, setWebsiteSyncStatus] = useState<WebsiteSyncStatus | null>(null);
  const [isSyncingWebsite, setIsSyncingWebsite] = useState(false);

  /* ================= AI SETTINGS STATE ================= */
  const [aiSettings, setAiSettings] = useState<AISettings | null>(null);
  const [isSavingSettings, setIsSavingSettings] = useState(false);
  const [settingsSuccessNotice, setSettingsSuccessNotice] = useState<string | null>(null);

  /* ================= VOICE / TTS (ELEVENLABS) STATE ================= */
  const [ttsSettings, setTtsSettings] = useState<TTSSettings | null>(null);
  const [ttsVoices, setTtsVoices] = useState<TTSVoiceOption[]>([]);
  const [ttsStats, setTtsStats] = useState<TTSStats | null>(null);
  const [isSavingTts, setIsSavingTts] = useState(false);
  const [ttsNotice, setTtsNotice] = useState<{ text: string; error?: boolean } | null>(null);
  const [ttsTestResult, setTtsTestResult] = useState<{
    healthy?: boolean;
    message?: string;
    tier?: string;
    characterCount?: number;
    characterLimit?: number;
    remainingCharacters?: number;
  } | null>(null);
  const [isTestingTtsConnection, setIsTestingTtsConnection] = useState(false);

  /* ================= ELEVENLABS MULTI-API KEY POOL STATE ================= */
  const [keyPool, setKeyPool] = useState<TTSApiKeyPublicEntry[]>([]);
  const [isLoadingKeyPool, setIsLoadingKeyPool] = useState(false);
  const [isAddKeyModalOpen, setIsAddKeyModalOpen] = useState(false);
  const [newKeyInput, setNewKeyInput] = useState('');
  const [newKeyLabel, setNewKeyLabel] = useState('');
  const [newKeyPriority, setNewKeyPriority] = useState<number>(1);
  const [newKeyShowSecret, setNewKeyShowSecret] = useState(false);
  const [isAddingKey, setIsAddingKey] = useState(false);

  // Key revelation & clipboard state
  const [revealedKeys, setRevealedKeys] = useState<Record<string, string>>({});
  const [revealingKeyId, setRevealingKeyId] = useState<string | null>(null);
  const [copiedKeyId, setCopiedKeyId] = useState<string | null>(null);

  // Key testing & editing state
  const [testingKeyId, setTestingKeyId] = useState<string | null>(null);
  const [keyTestHealth, setKeyTestHealth] = useState<Record<string, any>>({});
  const [editingKey, setEditingKey] = useState<TTSApiKeyPublicEntry | null>(null);
  const [editKeyInput, setEditKeyInput] = useState('');
  const [editKeyLabel, setEditKeyLabel] = useState('');
  const [editKeyPriority, setEditKeyPriority] = useState<number>(1);
  const [editKeyShowSecret, setEditKeyShowSecret] = useState(false);
  const [isSavingKeyEdit, setIsSavingKeyEdit] = useState(false);

  // Delete modal state with safety check
  const [deleteCandidate, setDeleteCandidate] = useState<TTSApiKeyPublicEntry | null>(null);
  const [deleteRequiresConfirmation, setDeleteRequiresConfirmation] = useState(false);
  const [deleteWarningMessage, setDeleteWarningMessage] = useState<string | null>(null);
  const [isDeletingKey, setIsDeletingKey] = useState(false);
  const [poolNotice, setPoolNotice] = useState<{ text: string; error?: boolean } | null>(null);

  // Speech Testing Playground
  const [testSpeechText, setTestSpeechText] = useState('OTL Live Support এ আপনাকে স্বাগতম! আমি কীভাবে আপনাকে সাহায্য করতে পারি?');
  const [isGeneratingTestSpeech, setIsGeneratingTestSpeech] = useState(false);
  const [testSpeechAudio, setTestSpeechAudio] = useState<{
    audioBase64: string;
    mimeType: string;
    detectedLanguage: string;
    characterCount: number;
    latencyMs: number;
    cached?: boolean;
  } | null>(null);
  const [testSpeechAudioUrl, setTestSpeechAudioUrl] = useState<string | null>(null);
  const [isPlayingTestAudio, setIsPlayingTestAudio] = useState(false);
  const [testSpeechNotice, setTestSpeechNotice] = useState<{ text: string; error?: boolean } | null>(null);
  const testAudioPlayerRef = useRef<HTMLAudioElement | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const conversationListRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const replyTextareaRef = useRef<HTMLTextAreaElement>(null);

  // Auto-resize admin reply textarea
  useEffect(() => {
    const el = replyTextareaRef.current;
    if (!el) return;
    el.style.height = 'auto';
    const nextHeight = Math.min(Math.max(el.scrollHeight, 40), 140);
    el.style.height = `${nextHeight}px`;
  }, [replyText]);

  // Load initial data
  const loadStats = async () => {
    try {
      const data = await supportService.getSupportStats();
      setStats(data);
    } catch (e) {}
  };

  const loadReports = async () => {
    try {
      const data = await supportService.getAdminReports({
        status: reportStatusFilter === 'all' ? undefined : reportStatusFilter,
        category: reportCategoryFilter === 'all' ? undefined : reportCategoryFilter,
        search: reportSearchQuery || undefined
      });
      setReports(data);
      if (data.length > 0 && !selectedReportId) {
        setSelectedReportId(data[0].id);
      }
    } catch (e) {}
  };

  const loadReportDetails = async (id: string) => {
    try {
      setIsLoadingReportDetails(true);
      const data = await supportService.getAdminReportDetails(id);
      setSelectedReportDetails(data);
    } catch (e) {} finally {
      setIsLoadingReportDetails(false);
    }
  };

  const handleUpdateReportStatus = async (status: SupportReportStatus, resolutionMessage?: string) => {
    if (!selectedReportId) return;
    try {
      setIsResolvingReport(true);
      await supportService.updateReportStatus(
        selectedReportId,
        status,
        currentUser?.email || currentUser?.username || 'admin',
        resolutionMessage
      );
      setReportNotice(`Report #${selectedReportId} status updated to ${status.toUpperCase()}`);
      setTimeout(() => setReportNotice(null), 3500);
      await loadReports();
      await loadReportDetails(selectedReportId);
      await loadStats();
    } catch (err: any) {
      alert(`Failed to update report status: ${err.message}`);
    } finally {
      setIsResolvingReport(false);
    }
  };

  const handleReplyToReport = async (resolveAlso: boolean = false) => {
    if (!selectedReportId || (!reportReplyText.trim() && !adminAttachment)) return;
    try {
      setIsSubmittingReportReply(true);
      await supportService.replyToReport(selectedReportId, {
        content: reportReplyText.trim(),
        attachment: adminAttachment || undefined,
        adminEmail: currentUser?.email || 'support@otl.com',
        adminName: currentUser ? `${currentUser.firstName || ''} ${currentUser.lastName || ''}`.trim() || currentUser.username : 'Support Admin',
        resolveReport: resolveAlso,
        resolutionMessage: resolveAlso ? (reportResolutionText || reportReplyText) : undefined
      });

      setReportReplyText('');
      setReportResolutionText('');
      setAdminAttachment(null);
      setReportNotice(`Reply dispatched to user conversation successfully!`);
      setTimeout(() => setReportNotice(null), 3500);

      await loadReports();
      await loadReportDetails(selectedReportId);
      await loadStats();
    } catch (err: any) {
      alert(`Failed to send report reply: ${err.message}`);
    } finally {
      setIsSubmittingReportReply(false);
    }
  };

  const handleAddReportInternalNote = async () => {
    if (!selectedReportId || !reportInternalNoteText.trim()) return;
    try {
      await supportService.addReportInternalNote(
        selectedReportId,
        currentUser?.email || currentUser?.username || 'admin',
        reportInternalNoteText.trim()
      );
      setReportInternalNoteText('');
      await loadReportDetails(selectedReportId);
    } catch (err: any) {
      alert(`Failed to add internal note: ${err.message}`);
    }
  };

  const loadConversations = async () => {
    try {
      const data = await supportService.getAdminConversations({
        status: statusFilter,
        search: searchQuery,
        userType: userTypeFilter === 'all' ? undefined : userTypeFilter
      });
      setConversations(data);
      if (data.length > 0 && !selectedConversationId) {
        setSelectedConversationId(data[0].id);
      }
    } catch (e) {}
  };

  const loadThread = async (id: string) => {
    try {
      setIsLoadingThread(true);
      const data = await supportService.getAdminConversation(id);
      setActiveMessages(data.messages || []);
      // Also update in list
      setConversations(prev =>
        prev.map(c => (c.id === id ? { ...c, unreadAdminCount: 0 } : c))
      );
    } catch (e) {} finally {
      setIsLoadingThread(false);
    }
  };

  const loadProviders = async () => {
    try {
      const data = await supportService.getAIProviders();
      setProviders(data);
    } catch (e) {}
  };

  const loadKnowledge = async () => {
    try {
      const [docRes, syncRes] = await Promise.allSettled([
        supportService.getKnowledgeDocuments(),
        supportService.getWebsiteSyncStatus()
      ]);
      if (docRes.status === 'fulfilled') {
        setDocuments(docRes.value.documents);
        setTotalChunks(docRes.value.totalChunks);
      }
      if (syncRes.status === 'fulfilled') {
        setWebsiteSyncStatus(syncRes.value.status);
      }
    } catch (e) {}
  };

  const loadAISettings = async () => {
    try {
      const data = await supportService.getAISettings();
      setAiSettings(data);
    } catch (e) {}
  };

  const loadTTSSettings = async () => {
    try {
      const data = await supportService.getAdminTTSSettings();
      setTtsSettings(data);
    } catch (e) {}
  };

  const loadTTSVoices = async () => {
    try {
      const data = await supportService.getAdminTTSVoices();
      setTtsVoices(Array.isArray(data) ? data : (data as any)?.voices || []);
    } catch (e) {}
  };

  const loadTTSStats = async () => {
    try {
      const data = await supportService.getAdminTTSStats();
      setTtsStats(data);
    } catch (e) {}
  };

  const handleSaveTTSSettings = async (partial: Partial<TTSSettings>) => {
    try {
      setIsSavingTts(true);
      setTtsNotice(null);
      const updated = await supportService.updateAdminTTSSettings(partial);
      setTtsSettings(updated);
      setTtsNotice({ text: 'Voice (TTS) settings saved successfully!' });
      setTimeout(() => setTtsNotice(null), 4000);
      await loadTTSVoices();
    } catch (e: any) {
      setTtsNotice({ text: e?.message || 'Failed to save voice settings', error: true });
    } finally {
      setIsSavingTts(false);
    }
  };

  const handleTestTTSConnection = async () => {
    try {
      setIsTestingTtsConnection(true);
      setTtsTestResult(null);
      const res = await supportService.testAdminTTSConnection(
        ttsSettings?.apiKey && !ttsSettings.apiKey.includes('••••') ? ttsSettings.apiKey : undefined
      );
      setTtsTestResult(res);
      if (res.healthy) {
        await loadTTSVoices();
      }
      await loadKeyPool();
    } catch (e: any) {
      setTtsTestResult({
        healthy: false,
        message: e?.message || 'Connection test failed.'
      });
    } finally {
      setIsTestingTtsConnection(false);
    }
  };

  /* ================= ELEVENLABS KEY POOL HANDLERS ================= */
  const loadKeyPool = async () => {
    try {
      setIsLoadingKeyPool(true);
      const keys = await supportService.getAdminTtsKeys();
      setKeyPool(keys);
    } catch (e: any) {
      console.warn('Failed to load key pool:', e);
    } finally {
      setIsLoadingKeyPool(false);
    }
  };

  const handleAddKey = async () => {
    if (!newKeyInput.trim()) {
      setPoolNotice({ text: 'Please enter an ElevenLabs API key.', error: true });
      return;
    }
    try {
      setIsAddingKey(true);
      setPoolNotice(null);
      const res = await supportService.addAdminTtsKey({
        key: newKeyInput.trim(),
        label: newKeyLabel.trim() || undefined,
        priority: newKeyPriority,
        enabled: true
      });
      setPoolNotice({
        text: res.message || 'ElevenLabs API key successfully added and active for this domain!',
        error: false
      });
      setIsAddKeyModalOpen(false);
      setNewKeyInput('');
      setNewKeyLabel('');
      setNewKeyPriority(keyPool.length + 2);
      await loadKeyPool();
      await loadTTSSettings();
      await loadTTSVoices();
      setTimeout(() => setPoolNotice(null), 5000);
    } catch (err: any) {
      setPoolNotice({ text: err?.message || 'Error adding API key.', error: true });
    } finally {
      setIsAddingKey(false);
    }
  };

  const handleToggleRevealKey = async (keyId: string) => {
    if (revealedKeys[keyId]) {
      setRevealedKeys(prev => {
        const next = { ...prev };
        delete next[keyId];
        return next;
      });
      return;
    }

    try {
      setRevealingKeyId(keyId);
      const res = await supportService.revealAdminTtsKey(keyId);
      if (res.success && res.key) {
        setRevealedKeys(prev => ({ ...prev, [keyId]: res.key! }));
      } else {
        alert(res.error || 'Could not reveal API key.');
      }
    } catch (err: any) {
      alert(err?.message || 'Failed to reveal key.');
    } finally {
      setRevealingKeyId(null);
    }
  };

  const handleCopyKey = async (entry: TTSApiKeyPublicEntry) => {
    try {
      let keyToCopy = revealedKeys[entry.id];
      if (!keyToCopy) {
        const res = await supportService.revealAdminTtsKey(entry.id);
        if (res.success && res.key) {
          keyToCopy = res.key;
        }
      }
      if (keyToCopy) {
        await navigator.clipboard.writeText(keyToCopy);
        setCopiedKeyId(entry.id);
        setTimeout(() => setCopiedKeyId(null), 2500);
      }
    } catch {
      alert('Could not copy to clipboard.');
    }
  };

  const handleToggleKeyEnabled = async (id: string) => {
    try {
      const res = await supportService.toggleAdminTtsKey(id);
      if (res.success) {
        await loadKeyPool();
        await loadTTSSettings();
      }
    } catch (e: any) {
      alert(e?.message || 'Failed to toggle key status.');
    }
  };

  const handleTestIndividualKey = async (id: string) => {
    try {
      setTestingKeyId(id);
      const res = await supportService.testAdminTtsKey(id);
      if (res.health) {
        setKeyTestHealth(prev => ({ ...prev, [id]: res.health }));
      }
      await loadKeyPool();
      if (res.success) {
        await loadTTSVoices();
      }
    } catch (e: any) {
      setKeyTestHealth(prev => ({
        ...prev,
        [id]: { healthy: false, message: e?.message || 'Key test failed.' }
      }));
    } finally {
      setTestingKeyId(null);
    }
  };

  const handleOpenEditModal = (entry: TTSApiKeyPublicEntry) => {
    setEditingKey(entry);
    setEditKeyLabel(entry.label || '');
    setEditKeyPriority(entry.priority || 1);
    setEditKeyInput('');
    setEditKeyShowSecret(false);
  };

  const handleSaveEditKey = async () => {
    if (!editingKey) return;
    try {
      setIsSavingKeyEdit(true);
      const res = await supportService.updateAdminTtsKey(editingKey.id, {
        key: editKeyInput.trim() ? editKeyInput.trim() : undefined,
        label: editKeyLabel.trim() || undefined,
        priority: editKeyPriority
      });
      if (!res.success && res.validationFailed) {
        const proceed = window.confirm(`${res.message}\n\nDo you want to save this key anyway?`);
        if (proceed) {
          await supportService.updateAdminTtsKey(editingKey.id, {
            key: editKeyInput.trim() ? editKeyInput.trim() : undefined,
            label: editKeyLabel.trim() || undefined,
            priority: editKeyPriority,
            force: true
          });
        } else {
          setIsSavingKeyEdit(false);
          return;
        }
      }
      setEditingKey(null);
      await loadKeyPool();
      await loadTTSSettings();
      await loadTTSVoices();
    } catch (e: any) {
      alert(e?.message || 'Failed to save key updates.');
    } finally {
      setIsSavingKeyEdit(false);
    }
  };

  const handleInitiateDeleteKey = (entry: TTSApiKeyPublicEntry) => {
    const isLast = keyPool.length === 1 || (keyPool.filter(k => k.enabled).length === 1 && entry.enabled);
    setDeleteCandidate(entry);
    setDeleteRequiresConfirmation(isLast);
    setDeleteWarningMessage(
      isLast
        ? 'Warning: This is the last active ElevenLabs API key. Deleting it will leave the pool empty, causing speech synthesis to fallback to browser speech synthesis until another key is provided.'
        : `Are you sure you want to delete "${entry.label || entry.id}" from the pool?`
    );
  };

  const handleConfirmDeleteKey = async () => {
    if (!deleteCandidate) return;
    try {
      setIsDeletingKey(true);
      const res = await supportService.deleteAdminTtsKey(deleteCandidate.id, true);
      if (!res.success && res.requiresConfirmation) {
        setDeleteRequiresConfirmation(true);
        setDeleteWarningMessage(res.message || 'Confirmation required');
        return;
      }
      setDeleteCandidate(null);
      setDeleteWarningMessage(null);
      await loadKeyPool();
      await loadTTSSettings();
    } catch (e: any) {
      alert(e?.message || 'Failed to delete key.');
    } finally {
      setIsDeletingKey(false);
    }
  };

  const getAudioDataUrl = (base64: string, mimeType: string = 'audio/mpeg'): string => {
    const cleanBase64 = base64.replace(/^data:[^;]+;base64,/, '').replace(/\s+/g, '');
    return `data:${mimeType};base64,${cleanBase64}`;
  };

  const stopTestAudio = () => {
    if (testAudioPlayerRef.current) {
      const player = testAudioPlayerRef.current;
      player.onplay = null;
      player.onpause = null;
      player.onended = null;
      player.onerror = null;
      try {
        player.pause();
        player.currentTime = 0;
      } catch {}
      testAudioPlayerRef.current = null;
    }
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
    setIsPlayingTestAudio(false);
  };

  const playBrowserSpeech = (text: string) => {
    if (!('speechSynthesis' in window)) {
      throw new Error('Your browser does not support SpeechSynthesis.');
    }
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    const isBengali = /[\u0980-\u09FF]/.test(text);
    const voices = window.speechSynthesis.getVoices();
    if (isBengali) {
      const bnVoice = voices.find(v => v.lang.startsWith('bn') || v.lang.toLowerCase().includes('bengali'));
      if (bnVoice) utterance.voice = bnVoice;
    }
    utterance.rate = ttsSettings?.speed || 1.0;
    utterance.onend = () => setIsPlayingTestAudio(false);
    utterance.onerror = () => setIsPlayingTestAudio(false);
    window.speechSynthesis.speak(utterance);
    setIsPlayingTestAudio(true);
  };

  const handleGenerateTestSpeech = async () => {
    if (!testSpeechText.trim() || isGeneratingTestSpeech) return;
    try {
      setIsGeneratingTestSpeech(true);
      setTestSpeechNotice(null);

      // Stop any currently playing audio or speech cleanly
      stopTestAudio();

      const apiKey = ttsSettings?.apiKey && !ttsSettings.apiKey.includes('••••') && !ttsSettings.apiKey.includes('Configured') 
        ? ttsSettings.apiKey 
        : undefined;

      const res = await supportService.testAdminSpeech({
        text: testSpeechText.trim(),
        voiceId: ttsSettings?.voiceId,
        modelId: ttsSettings?.modelId,
        speed: ttsSettings?.speed,
        stability: ttsSettings?.stability,
        similarity: ttsSettings?.similarity,
        style: ttsSettings?.style,
        apiKey
      });

      if (!res.audioBase64) {
        if ('speechSynthesis' in window) {
          playBrowserSpeech(testSpeechText.trim());
          setTestSpeechNotice({
            text: res.error ? `${res.error} (Playing via browser voice fallback)` : 'ElevenLabs audio temporarily unavailable. Playing via browser voice.',
            error: false
          });
          return;
        }
        throw new Error(res.error || 'Failed to synthesize speech audio.');
      }

      setTestSpeechAudio({
        audioBase64: res.audioBase64,
        mimeType: res.mimeType || 'audio/mpeg',
        detectedLanguage: res.detectedLanguage || 'mixed',
        characterCount: res.characterCount || testSpeechText.length,
        latencyMs: res.latencyMs || 0,
        cached: res.cached
      });

      const audioUrl = getAudioDataUrl(res.audioBase64, res.mimeType || 'audio/mpeg');
      setTestSpeechAudioUrl(audioUrl);

      const audio = new Audio(audioUrl);
      testAudioPlayerRef.current = audio;

      audio.onplay = () => setIsPlayingTestAudio(true);
      audio.onpause = () => setIsPlayingTestAudio(false);
      audio.onended = () => setIsPlayingTestAudio(false);
      audio.onerror = () => {
        // If audio src was reset or unmounted, ignore
        if (!audio.src || audio.src === window.location.href) return;
        console.warn('[Audio Player] HTML5 audio error, falling back to browser speech synthesis');
        setIsPlayingTestAudio(false);
        if ('speechSynthesis' in window) {
          try {
            playBrowserSpeech(testSpeechText.trim());
            setTestSpeechNotice({
              text: 'Played using browser speech engine (Audio element fallback).',
              error: false
            });
          } catch {
            setTestSpeechNotice({
              text: 'Audio playback failed. Please check browser audio permissions.',
              error: true
            });
          }
        }
      };

      try {
        const playPromise = audio.play();
        if (playPromise !== undefined) {
          await playPromise;
          setIsPlayingTestAudio(true);
          setTestSpeechNotice({
            text: res.warning
              ? `${res.warning} Audio synthesized and playing now ♫`
              : 'Audio synthesized and playing successfully! ♫',
            error: false
          });
        }
      } catch (playErr: any) {
        console.warn('Autoplay restricted by browser policy:', playErr);
        setIsPlayingTestAudio(false);
        setTestSpeechNotice({
          text: res.warning
            ? `${res.warning} Audio synthesized! Click Play (▷) below to listen.`
            : 'Audio synthesized successfully! Autoplay was prevented by browser security. Click Play (▷) or use the player below to listen.',
          error: false
        });
      }

      await loadTTSStats();
    } catch (e: any) {
      const errMsg = e?.message || 'Speech generation failed';
      console.warn('[Speech Synthesis Note]:', errMsg);

      // Attempt Browser SpeechSynthesis as instant reliable fallback
      if ('speechSynthesis' in window) {
        try {
          playBrowserSpeech(testSpeechText.trim());
          setTestSpeechNotice({
            text: `Note: ${errMsg}. Playing through browser voice fallback instead.`,
            error: false
          });
        } catch {
          setTestSpeechNotice({ text: errMsg, error: true });
        }
      } else {
        setTestSpeechNotice({ text: errMsg, error: true });
      }
    } finally {
      setIsGeneratingTestSpeech(false);
    }
  };

  const togglePlayTestAudio = () => {
    // 1. If browser SpeechSynthesis is currently speaking
    if ('speechSynthesis' in window && window.speechSynthesis.speaking) {
      if (window.speechSynthesis.paused) {
        window.speechSynthesis.resume();
        setIsPlayingTestAudio(true);
      } else {
        window.speechSynthesis.pause();
        setIsPlayingTestAudio(false);
      }
      return;
    }

    // 2. If testAudioPlayerRef is already instantiated
    if (testAudioPlayerRef.current) {
      if (isPlayingTestAudio) {
        testAudioPlayerRef.current.pause();
        setIsPlayingTestAudio(false);
      } else {
        testAudioPlayerRef.current.play().then(() => {
          setIsPlayingTestAudio(true);
        }).catch(err => {
          console.warn('Audio play prevented:', err);
          setIsPlayingTestAudio(false);
        });
      }
      return;
    }

    // 3. If test audio URL is available
    if (testSpeechAudioUrl) {
      const audio = new Audio(testSpeechAudioUrl);
      testAudioPlayerRef.current = audio;
      audio.onplay = () => setIsPlayingTestAudio(true);
      audio.onpause = () => setIsPlayingTestAudio(false);
      audio.onended = () => setIsPlayingTestAudio(false);
      audio.onerror = () => {
        if (!audio.src || audio.src === window.location.href) return;
        setIsPlayingTestAudio(false);
        if ('speechSynthesis' in window) {
          playBrowserSpeech(testSpeechText.trim());
        }
      };
      audio.play().then(() => {
        setIsPlayingTestAudio(true);
      }).catch(err => {
        console.warn('Audio play prevented:', err);
        setIsPlayingTestAudio(false);
      });
      return;
    }

    // 4. Fallback to synthesizing
    handleGenerateTestSpeech();
  };

  useEffect(() => {
    loadStats();
    loadConversations();
    loadReports();
    loadProviders();
    loadKnowledge();
    loadAISettings();
    loadTTSSettings();
    loadTTSVoices();
    loadTTSStats();
    loadKeyPool();

    return () => {
      stopTestAudio();
    };
  }, []);

  // Reload reports when filters change
  useEffect(() => {
    loadReports();
  }, [reportStatusFilter, reportCategoryFilter, reportSearchQuery]);

  // Reload conversations when filters or search query change
  useEffect(() => {
    const handler = setTimeout(() => {
      loadConversations();
    }, 250);
    return () => clearTimeout(handler);
  }, [statusFilter, userTypeFilter, searchQuery]);

  // Load report details when selected report changes
  useEffect(() => {
    if (selectedReportId) {
      loadReportDetails(selectedReportId);
    }
  }, [selectedReportId]);

  // Refresh thread when conversation selection changes
  useEffect(() => {
    if (selectedConversationId) {
      loadThread(selectedConversationId);
    }
  }, [selectedConversationId]);

  // Polling for live inbox and reports updates
  useEffect(() => {
    const interval = setInterval(() => {
      loadConversations();
      loadReports();
      loadStats();
      if (selectedConversationId && activeTab === 'inbox') {
        supportService.getAdminConversation(selectedConversationId).then(res => {
          if (res.messages && res.messages.length !== activeMessages.length) {
            setActiveMessages(res.messages);
          }
        }).catch(() => {});
      }
      if (selectedReportId && activeTab === 'reports') {
        supportService.getAdminReportDetails(selectedReportId).then(res => {
          setSelectedReportDetails(res);
        }).catch(() => {});
      }
    }, 5000);
    return () => clearInterval(interval);
  }, [selectedConversationId, selectedReportId, activeTab, activeMessages.length]);

  // Scroll to bottom on new message within the container only (preventing page/window jumping)
  useEffect(() => {
    if (messagesContainerRef.current) {
      messagesContainerRef.current.scrollTo({
        top: messagesContainerRef.current.scrollHeight,
        behavior: 'smooth'
      });
    }
  }, [activeMessages]);

  // Filter and group conversations by visitor/user
  const filteredVisitorGroups = useMemo(() => {
    const groups = groupConversationsByVisitor(conversations);

    return groups
      .map(grp => {
        // 1. Filter by userType
        if (userTypeFilter === 'guest' && !grp.isGuest) return null;
        if (userTypeFilter === 'registered' && grp.isGuest) return null;

        // 2. Filter conversations by statusFilter if statusFilter !== 'all'
        let matchingNewChats = grp.newChats;
        let matchingOldChats = grp.oldChats;

        if (statusFilter !== 'all') {
          matchingNewChats = matchingNewChats.filter(c => c.status === statusFilter);
          matchingOldChats = matchingOldChats.filter(c => c.status === statusFilter);
        }

        // 3. Search query filter
        if (searchQuery.trim()) {
          const q = searchQuery.toLowerCase().trim();
          const visitorMatches =
            grp.displayName.toLowerCase().includes(q) ||
            (grp.userEmail && grp.userEmail.toLowerCase().includes(q)) ||
            (grp.userId && grp.userId.toLowerCase().includes(q)) ||
            (grp.guestId && grp.guestId.toLowerCase().includes(q)) ||
            grp.newChats.some(c => (c.guestId && c.guestId.toLowerCase().includes(q)) || (c.userId && c.userId.toLowerCase().includes(q)) || (c.userName && c.userName.toLowerCase().includes(q)) || (c.userEmail && c.userEmail.toLowerCase().includes(q))) ||
            grp.oldChats.some(c => (c.guestId && c.guestId.toLowerCase().includes(q)) || (c.userId && c.userId.toLowerCase().includes(q)) || (c.userName && c.userName.toLowerCase().includes(q)) || (c.userEmail && c.userEmail.toLowerCase().includes(q)));

          if (!visitorMatches) {
            matchingNewChats = matchingNewChats.filter(
              c =>
                c.id.toLowerCase().includes(q) ||
                (c.title && c.title.toLowerCase().includes(q)) ||
                (c.lastMessage && c.lastMessage.toLowerCase().includes(q)) ||
                getConversationDisplayTitle(c).toLowerCase().includes(q)
            );
            matchingOldChats = matchingOldChats.filter(
              c =>
                c.id.toLowerCase().includes(q) ||
                (c.title && c.title.toLowerCase().includes(q)) ||
                (c.lastMessage && c.lastMessage.toLowerCase().includes(q)) ||
                getConversationDisplayTitle(c).toLowerCase().includes(q)
            );
          }
        }

        const totalMatching = matchingNewChats.length + matchingOldChats.length;
        if (totalMatching === 0) return null;

        return {
          ...grp,
          newChats: matchingNewChats,
          oldChats: matchingOldChats,
          totalChats: totalMatching
        };
      })
      .filter((g): g is VisitorChatGroup => g !== null);
  }, [conversations, userTypeFilter, statusFilter, searchQuery]);

  // Keep selected visitor expanded and auto-select visible conversation if current is filtered out
  useEffect(() => {
    if (filteredVisitorGroups.length > 0) {
      const isVisible = selectedConversationId
        ? filteredVisitorGroups.some(g =>
            g.newChats.some(c => c.id === selectedConversationId) ||
            g.oldChats.some(c => c.id === selectedConversationId)
          )
        : false;

      if (!isVisible) {
        const firstGroup = filteredVisitorGroups[0];
        const firstConv = firstGroup.newChats[0] || firstGroup.oldChats[0];
        if (firstConv) {
          setSelectedConversationId(firstConv.id);
        }
      } else if (selectedConversationId) {
        const foundGroup = filteredVisitorGroups.find(g =>
          g.newChats.some(c => c.id === selectedConversationId) ||
          g.oldChats.some(c => c.id === selectedConversationId)
        );
        if (foundGroup && expandedVisitorKeys[foundGroup.key] === false) {
          setExpandedVisitorKeys(prev => ({ ...prev, [foundGroup.key]: true }));
        }
      }
    }
  }, [selectedConversationId, filteredVisitorGroups]);

  const toggleVisitorExpanded = (key: string) => {
    setExpandedVisitorKeys(prev => ({
      ...prev,
      [key]: prev[key] === undefined ? false : !prev[key]
    }));
  };

  const toggleAllVisitors = () => {
    const allExpanded = filteredVisitorGroups.every(g => expandedVisitorKeys[g.key] ?? true);
    const nextState: Record<string, boolean> = {};
    filteredVisitorGroups.forEach(g => {
      nextState[g.key] = !allExpanded;
    });
    setExpandedVisitorKeys(nextState);
  };

  const selectedConversation = conversations.find(c => c.id === selectedConversationId);
  const selectedVisitorGroup = selectedConversation
    ? filteredVisitorGroups.find(g =>
        g.newChats.some(c => c.id === selectedConversation.id) ||
        g.oldChats.some(c => c.id === selectedConversation.id)
      )
    : null;
  const isSelectedInNewChat = selectedConversation && selectedVisitorGroup
    ? selectedVisitorGroup.newChats.some(c => c.id === selectedConversation.id)
    : false;

  // Admin sends reply
  const handleSendReply = async () => {
    if ((!replyText.trim() && !adminAttachment) || !selectedConversationId || isSendingReply) return;

    try {
      setIsSendingReply(true);
      const res = await supportService.sendAdminReply(selectedConversationId, {
        content: replyText,
        attachment: adminAttachment || undefined,
        adminEmail: currentUser?.email || 'admin@onlinetasklab.com',
        adminName: currentUser?.username || 'Support Admin'
      });

      setActiveMessages(prev => [...prev, res.message]);
      setReplyText('');
      if (replyTextareaRef.current) {
        replyTextareaRef.current.style.height = '40px';
      }
      setAdminAttachment(null);
      loadConversations();
    } catch (err: any) {
      alert(`Failed to send reply: ${err.message}`);
    } finally {
      setIsSendingReply(false);
    }
  };

  // Status Change (e.g. Take over, Resolve, Re-assign AI)
  const handleStatusChange = async (status: SupportConversation['status']) => {
    if (!selectedConversationId) return;
    try {
      const res = await supportService.updateConversationStatus(
        selectedConversationId,
        status,
        currentUser?.email
      );
      setActiveMessages(res.messages);
      loadConversations();
    } catch (err: any) {
      alert(`Status update failed: ${err.message}`);
    }
  };

  // Handle Admin File Attachment
  const handleAttachmentChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const uploaded = await supportService.uploadScreenshot(file);
      setAdminAttachment(uploaded);
    } catch (err: any) {
      alert(err.message || 'Upload failed');
    } finally {
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  // Test AI Provider
  const handleTestProvider = async (id: string) => {
    setTestResults(prev => ({ ...prev, [id]: { loading: true, message: 'Testing connection...' } }));
    try {
      const res = await supportService.testAIProvider(id);
      setTestResults(prev => ({
        ...prev,
        [id]: { loading: false, success: res.success, message: res.message }
      }));
    } catch (err: any) {
      setTestResults(prev => ({
        ...prev,
        [id]: { loading: false, success: false, message: err.message }
      }));
    }
  };

  // Activate AI Provider
  const handleActivateProvider = async (id: string) => {
    try {
      setProviderNotice(null);
      await supportService.activateAIProvider(id);
      await loadProviders();
      await loadStats();
      setProviderNotice({ text: 'Active AI Provider changed successfully!' });
      setTimeout(() => setProviderNotice(null), 4000);
    } catch (err: any) {
      setProviderNotice({ text: `Could not activate provider: ${err.message}`, error: true });
    }
  };

  // Save AI Settings
  const handleSaveSettings = async () => {
    if (!aiSettings) return;
    try {
      setIsSavingSettings(true);
      await supportService.updateAISettings(aiSettings);
      setSettingsSuccessNotice('AI Support behavior and rules updated successfully!');
      setTimeout(() => setSettingsSuccessNotice(null), 4000);
    } catch (err: any) {
      alert(`Failed to save settings: ${err.message}`);
    } finally {
      setIsSavingSettings(false);
    }
  };

  // Reindex Knowledge Base
  const handleReindexKnowledge = async () => {
    try {
      setIsReindexing(true);
      const res = await supportService.reindexKnowledge();
      await loadKnowledge();
      await loadStats();
      alert(`RAG Re-indexed: ${res.docsCount} documents, ${res.chunksCount} semantic chunks.`);
    } catch (err: any) {
      alert(`Re-index failed: ${err.message}`);
    } finally {
      setIsReindexing(false);
    }
  };

  // Trigger Automatic Website Synchronization
  const handleTriggerWebsiteSync = async () => {
    try {
      setIsSyncingWebsite(true);
      const res = await supportService.triggerWebsiteSync();
      setWebsiteSyncStatus(res.status);
      await loadKnowledge();
      await loadStats();
      alert(`Website Knowledge Synchronized!\n\n${res.docsCount} documents and ${res.chunksCount} semantic chunks successfully retrieved from live products, pages, and catalog data.`);
    } catch (err: any) {
      alert(`Website sync failed: ${err.message}`);
    } finally {
      setIsSyncingWebsite(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Banner & KPI Stat Counters */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-gradient-to-r from-[#0B1D51]/90 via-[#133E87]/80 to-[#0B1D51]/90 p-5 rounded-3xl border border-[#5DE2E7]/30 shadow-[0_0_30px_rgba(11,29,81,0.5)]">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-2 rounded-xl bg-cyan-400/20 text-[#5DE2E7]">
              <Headphones className="w-6 h-6" />
            </span>
            <h2 className="text-xl font-black text-white tracking-wide">
              AI Support & Live Chat Platform
            </h2>
          </div>
          <p className="text-xs text-slate-300 mt-1">
            Active Provider: <span className="text-[#5DE2E7] font-bold">{stats?.activeProviderName || 'Google Gemini 2.5 Flash'}</span> • Grounded RAG Knowledge Base • WhatsApp-style Multi-Agent Inbox
          </p>
        </div>

        {/* Action Tabs Navigation */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => setActiveTab('inbox')}
            className={`px-4 py-2.5 rounded-2xl text-xs font-black flex items-center gap-2 transition cursor-pointer ${
              activeTab === 'inbox'
                ? 'bg-gradient-to-r from-cyan-500 to-blue-600 text-white shadow-[0_0_15px_rgba(93,226,231,0.4)]'
                : 'bg-white/5 hover:bg-white/10 text-slate-300 border border-white/10'
            }`}
          >
            <MessageSquare className="w-4 h-4" />
            <span>Live Inbox</span>
            {(stats?.waitingForHuman || 0) > 0 && (
              <span className="px-2 py-0.5 rounded-full bg-amber-500 text-slate-950 font-black text-[10px] animate-pulse">
                {stats?.waitingForHuman}
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveTab('reports')}
            className={`px-4 py-2.5 rounded-2xl text-xs font-black flex items-center gap-2 transition cursor-pointer ${
              activeTab === 'reports'
                ? 'bg-gradient-to-r from-amber-500 to-orange-600 text-slate-950 shadow-[0_0_15px_rgba(245,158,11,0.4)]'
                : 'bg-white/5 hover:bg-white/10 text-slate-300 border border-white/10'
            }`}
          >
            <FileText className="w-4 h-4" />
            <span>Support Reports</span>
            {(stats?.waitingAdminReports || 0) > 0 && (
              <span className="px-2 py-0.5 rounded-full bg-amber-400 text-slate-950 font-black text-[10px] animate-pulse">
                {stats?.waitingAdminReports}
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveTab('providers')}
            className={`px-4 py-2.5 rounded-2xl text-xs font-black flex items-center gap-2 transition cursor-pointer ${
              activeTab === 'providers'
                ? 'bg-gradient-to-r from-cyan-500 to-blue-600 text-white shadow-[0_0_15px_rgba(93,226,231,0.4)]'
                : 'bg-white/5 hover:bg-white/10 text-slate-300 border border-white/10'
            }`}
          >
            <Zap className="w-4 h-4" />
            <span>AI Providers & Models</span>
          </button>

          <button
            onClick={() => setActiveTab('knowledge')}
            className={`px-4 py-2.5 rounded-2xl text-xs font-black flex items-center gap-2 transition cursor-pointer ${
              activeTab === 'knowledge'
                ? 'bg-gradient-to-r from-cyan-500 to-blue-600 text-white shadow-[0_0_15px_rgba(93,226,231,0.4)]'
                : 'bg-white/5 hover:bg-white/10 text-slate-300 border border-white/10'
            }`}
          >
            <Database className="w-4 h-4" />
            <span>Knowledge Base (RAG)</span>
            <span className="px-2 py-0.5 rounded-full bg-cyan-950 text-cyan-300 font-mono text-[10px]">
              {stats?.totalKnowledgeChunks || 0} chunks
            </span>
          </button>

          <button
            onClick={() => {
              setActiveTab('voice');
              loadTTSSettings();
              loadTTSVoices();
              loadTTSStats();
            }}
            className={`px-4 py-2.5 rounded-2xl text-xs font-black flex items-center gap-2 transition cursor-pointer ${
              activeTab === 'voice'
                ? 'bg-gradient-to-r from-cyan-500 to-blue-600 text-white shadow-[0_0_15px_rgba(93,226,231,0.4)]'
                : 'bg-white/5 hover:bg-white/10 text-slate-300 border border-white/10'
            }`}
          >
            <Volume2 className="w-4 h-4" />
            <span>Voice & TTS</span>
            {ttsSettings?.enabled ? (
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            ) : (
              <span className="w-2 h-2 rounded-full bg-slate-600" />
            )}
          </button>

          <button
            onClick={() => setActiveTab('settings')}
            className={`px-4 py-2.5 rounded-2xl text-xs font-black flex items-center gap-2 transition cursor-pointer ${
              activeTab === 'settings'
                ? 'bg-gradient-to-r from-cyan-500 to-blue-600 text-white shadow-[0_0_15px_rgba(93,226,231,0.4)]'
                : 'bg-white/5 hover:bg-white/10 text-slate-300 border border-white/10'
            }`}
          >
            <Sliders className="w-4 h-4" />
            <span>AI Rules & Personality</span>
          </button>
        </div>
      </div>

      {/* Quick KPI Bar */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-7 gap-3">
        <div className="p-3.5 rounded-2xl bg-slate-900/60 border border-white/10 flex flex-col">
          <span className="text-[11px] text-slate-400 font-bold uppercase">Total Chats</span>
          <span className="text-xl font-black text-white mt-1">{stats?.totalConversations || 0}</span>
        </div>
        <div className="p-3.5 rounded-2xl bg-slate-900/60 border border-cyan-500/20 flex flex-col">
          <span className="text-[11px] text-cyan-300 font-bold uppercase">AI Handled</span>
          <span className="text-xl font-black text-cyan-400 mt-1">{stats?.activeAiHandling || 0}</span>
        </div>
        <div className="p-3.5 rounded-2xl bg-amber-950/30 border border-amber-500/40 flex flex-col">
          <span className="text-[11px] text-amber-300 font-bold uppercase">Waiting Human</span>
          <span className="text-xl font-black text-amber-400 mt-1">{stats?.waitingForHuman || 0}</span>
        </div>
        <div className="p-3.5 rounded-2xl bg-amber-950/40 border border-amber-500/50 flex flex-col">
          <span className="text-[11px] text-amber-300 font-bold uppercase">Open Reports</span>
          <span className="text-xl font-black text-amber-400 mt-1">{stats?.waitingAdminReports || 0}</span>
        </div>
        <div className="p-3.5 rounded-2xl bg-emerald-950/30 border border-emerald-500/40 flex flex-col">
          <span className="text-[11px] text-emerald-300 font-bold uppercase">Live Specialist</span>
          <span className="text-xl font-black text-emerald-400 mt-1">{stats?.humanHandling || 0}</span>
        </div>
        <div className="p-3.5 rounded-2xl bg-slate-900/60 border border-white/10 flex flex-col">
          <span className="text-[11px] text-slate-400 font-bold uppercase">Resolved Chats</span>
          <span className="text-xl font-black text-slate-300 mt-1">{stats?.resolvedCount || 0}</span>
        </div>
        <div className="p-3.5 rounded-2xl bg-slate-900/60 border border-white/10 flex flex-col">
          <span className="text-[11px] text-slate-400 font-bold uppercase">RAG Chunks</span>
          <span className="text-xl font-black text-[#5DE2E7] mt-1">{stats?.totalKnowledgeChunks || 0}</span>
        </div>
      </div>

      {/* =========================================================================
          TAB 1: WHATSAPP-STYLE LIVE INBOX
          ========================================================================= */}
      {activeTab === 'inbox' && (
        <div className="flex flex-col lg:flex-row h-[750px] max-h-[calc(100vh-220px)] min-h-[580px] rounded-3xl overflow-hidden border border-white/10 bg-slate-950 shadow-2xl divide-y lg:divide-y-0 lg:divide-x divide-white/10">
          {/* Left Column: Conversation Directory */}
          <div className="w-full lg:w-[380px] xl:w-[420px] shrink-0 flex flex-col h-full min-h-0 overflow-hidden bg-[#060B1E]">
            {/* Search & Filters Header */}
            <div className="shrink-0 p-3.5 border-b border-white/10 space-y-2.5 bg-[#060B1E]/95">
              <div className="relative">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && loadConversations()}
                  placeholder="Search user, message, id..."
                  className="w-full pl-9 pr-3 py-2 rounded-xl bg-slate-900/90 border border-white/10 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-[#5DE2E7]"
                />
              </div>

              {/* Status Filter Chips */}
              <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none pb-1">
                {[
                  { id: 'all', label: 'All' },
                  { id: 'waiting_human', label: 'Waiting' },
                  { id: 'human_handling', label: 'Live' },
                  { id: 'ai_handling', label: 'AI' },
                  { id: 'resolved', label: 'Resolved' }
                ].map(item => (
                  <button
                    key={item.id}
                    onClick={() => setStatusFilter(item.id)}
                    className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition whitespace-nowrap cursor-pointer ${
                      statusFilter === item.id
                        ? 'bg-[#5DE2E7] text-slate-950'
                        : 'bg-white/5 text-slate-400 hover:bg-white/10'
                    }`}
                  >
                    {item.label}
                  </button>
                ))}
              </div>

              {/* User Type Chips */}
              <div className="flex items-center gap-2 text-[10px]">
                <span className="text-slate-500 font-bold uppercase">Type:</span>
                {(['all', 'registered', 'guest'] as const).map(type => (
                  <button
                    key={type}
                    onClick={() => setUserTypeFilter(type)}
                    className={`capitalize px-2 py-0.5 rounded-md ${
                      userTypeFilter === type
                        ? 'bg-white/20 text-white font-bold'
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    {type}
                  </button>
                ))}
              </div>
            </div>

            {/* Directory Summary & Toggle */}
            <div className="flex items-center justify-between px-3.5 py-2 border-b border-white/5 bg-[#080E24] text-[11px] shrink-0">
              <div className="flex items-center gap-2 text-slate-400">
                <Users className="w-3.5 h-3.5 text-[#5DE2E7]" />
                <span>
                  <strong className="text-white font-mono">{filteredVisitorGroups.length}</strong> {filteredVisitorGroups.length === 1 ? 'Visitor' : 'Visitors'}
                </span>
                <span className="text-slate-600">•</span>
                <span>
                  <strong className="text-white font-mono">
                    {filteredVisitorGroups.reduce((acc, g) => acc + g.totalChats, 0)}
                  </strong> Chats
                </span>
              </div>
              {filteredVisitorGroups.length > 0 && (
                <button
                  onClick={toggleAllVisitors}
                  className="text-[10px] text-cyan-400 hover:text-cyan-300 font-semibold transition cursor-pointer"
                >
                  Toggle All
                </button>
              )}
            </div>

            {/* Grouped Visitor & Chat Directory List */}
            <div
              ref={conversationListRef}
              className="flex-1 min-h-0 overflow-y-auto overscroll-contain divide-y divide-white/10"
            >
              {filteredVisitorGroups.length === 0 ? (
                <div className="p-8 text-center text-slate-500 text-xs">
                  {searchQuery || statusFilter !== 'all' || userTypeFilter !== 'all'
                    ? 'No visitors or conversations match your filters.'
                    : 'No conversations found.'}
                </div>
              ) : (
                filteredVisitorGroups.map(group => {
                  const isExpanded =
                    expandedVisitorKeys[group.key] ??
                    (group.hasWaitingHuman ||
                      group.key === selectedVisitorGroup?.key ||
                      filteredVisitorGroups.length <= 4);
                  const isSelectedVisitor = selectedVisitorGroup?.key === group.key;

                  return (
                    <div
                      key={group.key}
                      className={`transition ${
                        isSelectedVisitor ? 'bg-white/[0.02]' : ''
                      }`}
                    >
                      {/* Visitor Row Header */}
                      <div
                        onClick={() => toggleVisitorExpanded(group.key)}
                        className={`p-3 transition cursor-pointer flex items-center justify-between gap-2.5 select-none ${
                          isSelectedVisitor
                            ? 'bg-[#133E87]/30 border-l-4 border-[#5DE2E7]'
                            : 'hover:bg-white/5 border-l-4 border-transparent'
                        }`}
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          {/* Visitor Avatar */}
                          <div className="relative shrink-0">
                            <div
                              className={`w-9 h-9 rounded-xl border flex items-center justify-center font-black text-xs ${
                                group.isGuest
                                  ? 'bg-gradient-to-br from-indigo-950/80 to-purple-950/80 border-indigo-500/40 text-indigo-300 shadow-sm'
                                  : 'bg-[#0B1D51] border-[#5DE2E7]/40 text-[#5DE2E7]'
                              }`}
                            >
                              {group.avatarLetter}
                            </div>
                            {group.hasWaitingHuman && (
                              <span
                                title="Waiting for human assistance"
                                className="absolute -top-1 -right-1 w-3 h-3 rounded-full bg-amber-500 border-2 border-[#060B1E] animate-pulse"
                              />
                            )}
                            {group.hasHumanHandling && !group.hasWaitingHuman && (
                              <span
                                title="Live human support active"
                                className="absolute -top-1 -right-1 w-3 h-3 rounded-full bg-emerald-500 border-2 border-[#060B1E]"
                              />
                            )}
                          </div>

                          {/* Visitor Identity Details */}
                          <div className="min-w-0">
                            <div className="flex items-center gap-1.5">
                              <h4 className="font-bold text-xs text-white truncate">
                                {group.displayName}
                              </h4>
                              <span
                                className={`px-1.5 py-0.2 rounded text-[9px] font-bold ${
                                  group.isGuest
                                    ? 'bg-purple-500/20 text-purple-300 border border-purple-500/30'
                                    : 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30'
                                }`}
                              >
                                {group.isGuest ? 'Guest' : 'Member'}
                              </span>
                            </div>

                            <div className="flex items-center gap-2 text-[10px] text-slate-400 mt-0.5">
                              {group.userEmail ? (
                                <span className="truncate max-w-[140px] text-slate-300">
                                  {group.userEmail}
                                </span>
                              ) : group.guestId ? (
                                <span className="font-mono text-[9.5px] text-slate-400 truncate max-w-[140px]">
                                  {group.guestId}
                                </span>
                              ) : (
                                <span className="text-slate-500">Anonymous</span>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Counts & Chevron */}
                        <div className="flex items-center gap-2 shrink-0">
                          <div className="text-right">
                            <span className="inline-block px-1.5 py-0.5 rounded-md bg-white/5 border border-white/10 text-[10px] font-mono text-slate-300">
                              {group.totalChats} {group.totalChats === 1 ? 'chat' : 'chats'}
                            </span>
                            {group.unreadAdminCount > 0 && (
                              <span className="block mt-0.5 text-[9px] font-bold text-[#5DE2E7] text-right">
                                {group.unreadAdminCount} new
                              </span>
                            )}
                          </div>
                          <div className="text-slate-400">
                            {isExpanded ? (
                              <ChevronDown className="w-4 h-4 text-slate-300" />
                            ) : (
                              <ChevronRight className="w-4 h-4 text-slate-400" />
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Expanded Section: NEW CHAT and OLD CHAT */}
                      {isExpanded && (
                        <div className="px-3 pb-3 pt-1 space-y-2.5 bg-black/25">
                          {/* NEW CHAT SECTION */}
                          {group.newChats.length > 0 && (
                            <div className="space-y-1">
                              <div className="px-2 py-0.5 text-[9.5px] font-black uppercase tracking-wider text-cyan-400 flex items-center justify-between">
                                <span className="flex items-center gap-1">
                                  <Sparkles className="w-3 h-3 text-cyan-400" />
                                  NEW CHAT
                                </span>
                                <span className="px-1.5 py-0.2 rounded-full bg-cyan-500/20 text-cyan-300 font-mono text-[9px]">
                                  {group.newChats.length}
                                </span>
                              </div>
                              <div className="space-y-1 pl-1 border-l border-cyan-500/20 ml-2">
                                {group.newChats.map(conv => {
                                  const isSelected = conv.id === selectedConversationId;
                                  const isWaitingHuman = conv.status === 'waiting_human';
                                  const isHumanHandling = conv.status === 'human_handling';
                                  const isResolved = conv.status === 'resolved';
                                  const title = getConversationDisplayTitle(conv);

                                  return (
                                    <button
                                      key={conv.id}
                                      onClick={e => {
                                        e.stopPropagation();
                                        setSelectedConversationId(conv.id);
                                      }}
                                      className={`w-full text-left p-2.5 rounded-xl transition flex items-start gap-2 cursor-pointer border ${
                                        isSelected
                                          ? 'bg-[#133E87]/70 border-[#5DE2E7] shadow-sm shadow-[#5DE2E7]/20 text-white'
                                          : 'bg-slate-900/60 hover:bg-white/5 border-white/5 text-slate-300'
                                      }`}
                                    >
                                      {/* Status Icon */}
                                      <div className="shrink-0 mt-0.5">
                                        <div
                                          className={`w-6 h-6 rounded-lg flex items-center justify-center text-[10px] ${
                                            isWaitingHuman
                                              ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 animate-pulse'
                                              : isHumanHandling
                                              ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                                              : isResolved
                                              ? 'bg-slate-800 text-slate-400 border border-white/10'
                                              : isSelected
                                              ? 'bg-[#5DE2E7]/20 text-[#5DE2E7]'
                                              : 'bg-white/5 text-slate-400'
                                          }`}
                                        >
                                          {isWaitingHuman ? (
                                            <AlertCircle className="w-3.5 h-3.5" />
                                          ) : isHumanHandling ? (
                                            <Headphones className="w-3.5 h-3.5" />
                                          ) : isResolved ? (
                                            <CheckCircle2 className="w-3.5 h-3.5" />
                                          ) : (
                                            <MessageSquare className="w-3.5 h-3.5" />
                                          )}
                                        </div>
                                      </div>

                                      {/* Content info */}
                                      <div className="flex-1 min-w-0">
                                        <div className="flex items-center justify-between gap-1 mb-0.5">
                                          <h5
                                            className={`text-xs font-bold truncate ${
                                              isSelected ? 'text-white' : 'text-slate-200'
                                            }`}
                                          >
                                            {title}
                                          </h5>
                                          <span className="text-[10px] text-slate-400 font-mono shrink-0">
                                            {new Date(
                                              conv.lastMessageAt || conv.updatedAt || conv.createdAt
                                            ).toLocaleTimeString([], {
                                              hour: '2-digit',
                                              minute: '2-digit'
                                            })}
                                          </span>
                                        </div>

                                        <p className="text-[11px] text-slate-400 truncate">
                                          {conv.lastMessage || 'No messages yet'}
                                        </p>

                                        <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
                                          <span
                                            className={`px-1.5 py-0.5 rounded text-[8.5px] font-black uppercase tracking-wider ${
                                              isWaitingHuman
                                                ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 animate-pulse'
                                                : isHumanHandling
                                                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                                                : isResolved
                                                ? 'bg-slate-800 text-slate-400'
                                                : 'bg-cyan-500/20 text-cyan-300'
                                            }`}
                                          >
                                            {conv.status.replace(/_/g, ' ')}
                                          </span>

                                          <span className="text-[9px] text-slate-500 font-mono">
                                            {conv.id.slice(0, 8)}
                                          </span>

                                          {conv.unreadAdminCount > 0 && (
                                            <span className="ml-auto px-1.5 py-0.2 rounded-full bg-[#5DE2E7] text-slate-950 font-black text-[9px]">
                                              {conv.unreadAdminCount} new
                                            </span>
                                          )}
                                        </div>
                                      </div>
                                    </button>
                                  );
                                })}
                              </div>
                            </div>
                          )}

                          {/* OLD CHAT SECTION */}
                          {group.oldChats.length > 0 && (
                            <div className="space-y-1">
                              <div className="px-2 py-0.5 text-[9.5px] font-black uppercase tracking-wider text-slate-400 flex items-center justify-between">
                                <span className="flex items-center gap-1">
                                  <Clock className="w-3 h-3 text-slate-400" />
                                  OLD CHAT
                                </span>
                                <span className="px-1.5 py-0.2 rounded-full bg-white/10 text-slate-300 font-mono text-[9px]">
                                  {group.oldChats.length}
                                </span>
                              </div>
                              <div className="space-y-1 pl-1 border-l border-white/10 ml-2">
                                {group.oldChats.map(conv => {
                                  const isSelected = conv.id === selectedConversationId;
                                  const isWaitingHuman = conv.status === 'waiting_human';
                                  const isHumanHandling = conv.status === 'human_handling';
                                  const isResolved = conv.status === 'resolved';
                                  const title = getConversationDisplayTitle(conv);

                                  return (
                                    <button
                                      key={conv.id}
                                      onClick={e => {
                                        e.stopPropagation();
                                        setSelectedConversationId(conv.id);
                                      }}
                                      className={`w-full text-left p-2.5 rounded-xl transition flex items-start gap-2 cursor-pointer border ${
                                        isSelected
                                          ? 'bg-[#133E87]/70 border-[#5DE2E7] shadow-sm shadow-[#5DE2E7]/20 text-white'
                                          : 'bg-slate-900/60 hover:bg-white/5 border-white/5 text-slate-300'
                                      }`}
                                    >
                                      {/* Status Icon */}
                                      <div className="shrink-0 mt-0.5">
                                        <div
                                          className={`w-6 h-6 rounded-lg flex items-center justify-center text-[10px] ${
                                            isWaitingHuman
                                              ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 animate-pulse'
                                              : isHumanHandling
                                              ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                                              : isResolved
                                              ? 'bg-slate-800 text-slate-400 border border-white/10'
                                              : isSelected
                                              ? 'bg-[#5DE2E7]/20 text-[#5DE2E7]'
                                              : 'bg-white/5 text-slate-400'
                                          }`}
                                        >
                                          {isWaitingHuman ? (
                                            <AlertCircle className="w-3.5 h-3.5" />
                                          ) : isHumanHandling ? (
                                            <Headphones className="w-3.5 h-3.5" />
                                          ) : isResolved ? (
                                            <CheckCircle2 className="w-3.5 h-3.5" />
                                          ) : (
                                            <MessageSquare className="w-3.5 h-3.5" />
                                          )}
                                        </div>
                                      </div>

                                      {/* Content info */}
                                      <div className="flex-1 min-w-0">
                                        <div className="flex items-center justify-between gap-1 mb-0.5">
                                          <h5
                                            className={`text-xs font-bold truncate ${
                                              isSelected ? 'text-white' : 'text-slate-200'
                                            }`}
                                          >
                                            {title}
                                          </h5>
                                          <span className="text-[10px] text-slate-400 font-mono shrink-0">
                                            {new Date(
                                              conv.lastMessageAt || conv.updatedAt || conv.createdAt
                                            ).toLocaleDateString([], {
                                              month: 'short',
                                              day: 'numeric'
                                            })}
                                          </span>
                                        </div>

                                        <p className="text-[11px] text-slate-400 truncate">
                                          {conv.lastMessage || 'No messages yet'}
                                        </p>

                                        <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
                                          <span
                                            className={`px-1.5 py-0.5 rounded text-[8.5px] font-black uppercase tracking-wider ${
                                              isWaitingHuman
                                                ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 animate-pulse'
                                                : isHumanHandling
                                                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                                                : isResolved
                                                ? 'bg-slate-800 text-slate-400'
                                                : 'bg-cyan-500/20 text-cyan-300'
                                            }`}
                                          >
                                            {conv.status.replace(/_/g, ' ')}
                                          </span>

                                          <span className="text-[9px] text-slate-500 font-mono">
                                            {conv.id.slice(0, 8)}
                                          </span>

                                          {conv.unreadAdminCount > 0 && (
                                            <span className="ml-auto px-1.5 py-0.2 rounded-full bg-[#5DE2E7] text-slate-950 font-black text-[9px]">
                                              {conv.unreadAdminCount} new
                                            </span>
                                          )}
                                        </div>
                                      </div>
                                    </button>
                                  );
                                })}
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Right Column: Active Conversation Chat Thread */}
          <div className="flex-1 min-w-0 flex flex-col h-full min-h-0 overflow-hidden bg-slate-950">
            {selectedConversation ? (
              <>
                {/* Thread Header */}
                <div className="p-4 bg-slate-900/90 border-b border-white/10 flex items-center justify-between gap-3 shrink-0">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-10 h-10 rounded-2xl bg-[#0B1D51] border border-[#5DE2E7]/40 flex items-center justify-center text-[#5DE2E7] font-black shrink-0">
                      {selectedVisitorGroup ? selectedVisitorGroup.avatarLetter : selectedConversation.isGuest ? 'G' : 'U'}
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="text-sm font-black text-white truncate">
                          {selectedVisitorGroup?.displayName || selectedConversation.userName || 'Visitor'}
                        </h3>
                        <span
                          className={`px-1.5 py-0.2 rounded text-[9px] font-bold ${
                            selectedVisitorGroup?.isGuest || selectedConversation.isGuest
                              ? 'bg-purple-500/20 text-purple-300 border border-purple-500/30'
                              : 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30'
                          }`}
                        >
                          {selectedVisitorGroup?.isGuest || selectedConversation.isGuest ? 'Guest' : 'Member'}
                        </span>
                        <span className="text-[10px] font-mono text-slate-400 truncate">
                          ({selectedConversation.userEmail || selectedConversation.guestId || selectedConversation.userId || 'N/A'})
                        </span>
                      </div>

                      {/* Active Conversation Title and Category */}
                      <div className="flex items-center gap-2 text-[11px] text-slate-300 mt-1 flex-wrap">
                        <span className="font-semibold text-[#5DE2E7]">
                          {selectedConversation.title || getConversationDisplayTitle(selectedConversation)}
                        </span>
                        <span className="text-slate-600">•</span>
                        <span
                          className={`px-1.5 py-0.2 rounded font-mono text-[9px] font-bold ${
                            isSelectedInNewChat
                              ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30'
                              : 'bg-white/10 text-slate-400 border border-white/10'
                          }`}
                        >
                          {isSelectedInNewChat ? 'NEW CHAT' : 'OLD CHAT'}
                        </span>
                        <span className="text-slate-600">•</span>
                        <span className="text-slate-400 font-mono text-[10px]">
                          ID: {selectedConversation.id}
                        </span>
                        <span className="text-slate-600">•</span>
                        <span className="flex items-center gap-1 text-slate-400">
                          <Clock className="w-3 h-3 text-cyan-400" />
                          {new Date(selectedConversation.createdAt).toLocaleString()}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Actions Header */}
                  <div className="flex items-center gap-2 shrink-0">
                    {selectedConversation.status !== 'human_handling' && (
                      <button
                        onClick={() => handleStatusChange('human_handling')}
                        className="px-3 py-1.5 rounded-xl bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-500/40 text-emerald-300 font-bold text-xs flex items-center gap-1.5 transition cursor-pointer"
                      >
                        <Headphones className="w-3.5 h-3.5" />
                        <span>Take Over</span>
                      </button>
                    )}

                    {selectedConversation.status !== 'resolved' && (
                      <button
                        onClick={() => handleStatusChange('resolved')}
                        className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 border border-white/10 text-slate-200 font-bold text-xs flex items-center gap-1.5 transition cursor-pointer"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                        <span>Resolve</span>
                      </button>
                    )}
                  </div>
                </div>

                {/* Messages Feed */}
                <div
                  ref={messagesContainerRef}
                  className="flex-1 min-h-0 overflow-y-auto overscroll-contain p-4 space-y-3.5 text-xs"
                >
                  {isLoadingThread ? (
                    <div className="h-full flex items-center justify-center text-slate-400">
                      <RefreshCw className="w-5 h-5 animate-spin mr-2 text-cyan-400" />
                      Loading messages...
                    </div>
                  ) : activeMessages.length === 0 ? (
                    <div className="h-full flex items-center justify-center text-slate-500">
                      No messages recorded in this conversation.
                    </div>
                  ) : (
                    activeMessages.map(msg => {
                      const isAdminMsg = msg.senderType === 'admin';
                      const isUser = msg.senderType === 'user' || msg.senderType === 'guest';
                      const isAi = msg.senderType === 'ai';
                      const isSystem = msg.senderType === 'system';

                      if (isSystem) {
                        return (
                          <div key={msg.id} className="flex justify-center my-2">
                            <span className="px-3 py-1 rounded-full bg-white/5 border border-white/10 text-slate-400 text-[10px]">
                              {msg.content}
                            </span>
                          </div>
                        );
                      }

                      return (
                        <div
                          key={msg.id}
                          className={`flex gap-3 ${isAdminMsg ? 'justify-end' : 'justify-start'}`}
                        >
                          {!isAdminMsg && (
                            <div className="w-8 h-8 rounded-xl bg-slate-900 border border-white/10 flex items-center justify-center shrink-0 mt-0.5">
                              {isAi ? <OtlLogo size={24} animate={true} /> : <User className="w-4 h-4 text-cyan-400" />}
                            </div>
                          )}

                          <div className={`max-w-[78%] space-y-1 ${isAdminMsg ? 'items-end text-right' : 'items-start text-left'}`}>
                            <div className="flex items-center gap-2 text-[10px] text-slate-400">
                              <span className="font-bold text-slate-300">
                                {isAdminMsg
                                  ? `${msg.senderName || 'Admin'} (You)`
                                  : isAi
                                  ? 'OTL Live Support'
                                  : msg.senderName || 'Visitor'}
                              </span>
                              <span>•</span>
                              <span>{new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                            </div>

                            <div
                              className={`p-3.5 rounded-2xl leading-relaxed ${
                                isAdminMsg
                                  ? 'bg-gradient-to-r from-emerald-600 to-teal-700 text-white rounded-tr-none shadow-md'
                                  : isAi
                                  ? 'bg-slate-900 border border-cyan-500/30 text-slate-200 rounded-tl-none'
                                  : 'bg-slate-900/90 border border-white/10 text-white rounded-tl-none'
                              }`}
                            >
                              <ChatMessageContent
                                content={msg.content}
                                isUser={isUser || isAdminMsg}
                              />

                              {/* Attached Screenshot */}
                              {((msg.attachments && msg.attachments.length > 0) || msg.attachment) && (
                                <div className="mt-2.5 flex flex-wrap gap-2">
                                  {(msg.attachments && msg.attachments.length > 0
                                    ? msg.attachments
                                    : msg.attachment
                                    ? [msg.attachment]
                                    : []
                                  ).map((att, i) => (
                                    <div key={i} className="relative group">
                                      <img
                                        src={att.url}
                                        alt={att.name || 'attachment'}
                                        onClick={() => setZoomedImage(att.url)}
                                        className="w-24 h-24 sm:w-28 sm:h-28 object-cover rounded-xl border border-white/20 cursor-zoom-in hover:opacity-90 hover:border-cyan-400 transition"
                                        referrerPolicy="no-referrer"
                                      />
                                      {att.name && (
                                        <span className="text-[10px] text-slate-400 block truncate max-w-[112px] mt-1">
                                          {att.name}
                                        </span>
                                      )}
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>

                            {/* Grounding Attribution / RAG Badges for AI message */}
                            {isAi && msg.ragSources && msg.ragSources.length > 0 && (
                              <div className="pt-1 text-[10px] text-cyan-400/80 font-mono">
                                <span>Grounded on: {msg.ragSources.map(s => s.title).join(', ')}</span>
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })
                  )}
                  <div ref={messagesEndRef} />
                </div>

                {/* Attachment Bar */}
                {adminAttachment && (
                  <div className="px-4 py-2 bg-slate-950 border-t border-white/10 flex items-center justify-between gap-3 text-xs shrink-0">
                    <div className="flex items-center gap-2">
                      <img
                        src={adminAttachment.url}
                        alt="attachment"
                        className="w-8 h-8 rounded-lg object-cover border border-emerald-400"
                        referrerPolicy="no-referrer"
                      />
                      <span className="text-slate-200">{adminAttachment.name}</span>
                    </div>
                    <button
                      onClick={() => setAdminAttachment(null)}
                      className="p-1 rounded-lg text-slate-400 hover:text-red-400"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                )}

                {/* Reply Footer Input */}
                <div className="p-3.5 bg-slate-900/90 border-t border-white/10 shrink-0">
                  <div className="flex items-end gap-2">
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/png,image/jpeg,image/webp"
                      onChange={handleAttachmentChange}
                      className="hidden"
                    />
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="p-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-slate-400 hover:text-emerald-400 border border-white/10 transition cursor-pointer mb-0.5 shrink-0"
                      title="Attach image/screenshot"
                    >
                      <ImageIcon className="w-4 h-4" />
                    </button>

                    <div className="flex-1 relative min-w-0">
                      <textarea
                        ref={replyTextareaRef}
                        rows={1}
                        value={replyText}
                        onChange={e => setReplyText(e.target.value)}
                        onKeyDown={e => {
                          if (e.key === 'Enter' && !e.shiftKey) {
                            e.preventDefault();
                            if ((replyText.trim() || adminAttachment) && !isSendingReply) {
                              handleSendReply();
                            }
                          }
                        }}
                        placeholder="Type official admin response to user... (Shift + Enter for new line)"
                        className="w-full bg-slate-950 border border-white/15 focus:border-emerald-500 rounded-xl px-4 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none resize-none leading-relaxed overflow-y-auto max-h-[140px] scrollbar-thin block"
                      />
                    </div>

                    <button
                      onClick={handleSendReply}
                      disabled={(!replyText.trim() && !adminAttachment) || isSendingReply}
                      className="px-5 py-2.5 h-10 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs flex items-center gap-2 transition cursor-pointer disabled:opacity-40 mb-0.5 shrink-0 active:scale-95"
                    >
                      <Send className="w-4 h-4" />
                      <span>{isSendingReply ? 'Sending...' : 'Reply'}</span>
                    </button>
                  </div>
                </div>
              </>
            ) : (
              <div className="h-full flex items-center justify-center text-slate-500 text-sm">
                Select a conversation from the left to view messages
              </div>
            )}
          </div>
        </div>
      )}

      {/* =========================================================================
          TAB 2: PERSISTENT SUPPORT REPORTS MANAGEMENT (ADMIN DESK)
          ========================================================================= */}
      {activeTab === 'reports' && (
        <div className="space-y-4">
          {reportNotice && (
            <div className="p-3 bg-emerald-500/20 border border-emerald-500/40 rounded-2xl text-emerald-300 text-xs flex items-center justify-between">
              <span>{reportNotice}</span>
              <button onClick={() => setReportNotice(null)} className="text-emerald-400 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>
          )}

          <div className="flex flex-col lg:flex-row h-[750px] max-h-[calc(100vh-220px)] min-h-[580px] rounded-3xl overflow-hidden border border-white/10 bg-slate-950 shadow-2xl divide-y lg:divide-y-0 lg:divide-x divide-white/10">
            {/* Left Column: Reports Registry */}
            <div className="w-full lg:w-[380px] xl:w-[420px] shrink-0 flex flex-col h-full min-h-0 overflow-hidden bg-[#060B1E]">
              {/* Filter Controls */}
              <div className="shrink-0 p-3.5 border-b border-white/10 space-y-2.5 bg-[#060B1E]/95">
                <div className="relative">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={reportSearchQuery}
                    onChange={e => setReportSearchQuery(e.target.value)}
                    placeholder="Search reports by title, user, id..."
                    className="w-full pl-9 pr-3 py-2 rounded-xl bg-slate-900/90 border border-white/10 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-400"
                  />
                </div>

                {/* Status Chips */}
                <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none pb-1">
                  {[
                    { id: 'all', label: 'All' },
                    { id: 'waiting_for_admin', label: 'Waiting Admin' },
                    { id: 'admin_handling', label: 'In Progress' },
                    { id: 'resolved', label: 'Resolved' },
                    { id: 'closed', label: 'Closed' }
                  ].map(item => (
                    <button
                      key={item.id}
                      onClick={() => setReportStatusFilter(item.id)}
                      className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition whitespace-nowrap cursor-pointer ${
                        reportStatusFilter === item.id
                          ? 'bg-amber-500 text-slate-950 font-black'
                          : 'bg-white/5 text-slate-400 hover:bg-white/10'
                      }`}
                    >
                      {item.label}
                    </button>
                  ))}
                </div>

                {/* Category Chips */}
                <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none pb-0.5">
                  {[
                    { id: 'all', label: 'All Categories' },
                    { id: 'technical', label: 'Technical' },
                    { id: 'download', label: 'Download' },
                    { id: 'account', label: 'Account' },
                    { id: 'payment', label: 'Payment' }
                  ].map(cat => (
                    <button
                      key={cat.id}
                      onClick={() => setReportCategoryFilter(cat.id)}
                      className={`px-2 py-0.5 rounded text-[10px] font-medium transition whitespace-nowrap ${
                        reportCategoryFilter === cat.id
                          ? 'bg-white/20 text-white font-bold'
                          : 'text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      {cat.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Reports List */}
              <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain divide-y divide-white/5 scrollbar-thin">
                {reports.length === 0 ? (
                  <div className="p-8 text-center text-slate-500 text-xs">
                    No support reports found.
                  </div>
                ) : (
                  reports.map(rep => {
                    const isSelected = rep.id === selectedReportId;
                    const isWaiting = rep.status === 'waiting_for_admin';
                    const isHandling = rep.status === 'admin_handling';
                    const isResolved = rep.status === 'resolved';

                    return (
                      <button
                        key={rep.id}
                        onClick={() => setSelectedReportId(rep.id)}
                        className={`w-full text-left p-3.5 transition flex items-start gap-3 cursor-pointer ${
                          isSelected
                            ? 'bg-[#133E87]/40 border-l-4 border-amber-400'
                            : 'hover:bg-white/5'
                        }`}
                      >
                        <div className="w-10 h-10 rounded-2xl bg-slate-900 border border-white/10 flex items-center justify-center shrink-0 text-amber-400">
                          <FileText className="w-5 h-5" />
                        </div>

                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-1 mb-0.5">
                            <span className="font-mono text-[10px] font-bold text-amber-400">#{rep.id}</span>
                            <span className="text-[10px] text-slate-400 font-mono">
                              {new Date(rep.createdAt).toLocaleDateString([], { month: 'short', day: 'numeric' })}
                            </span>
                          </div>

                          <h4 className="font-bold text-xs text-white truncate">{rep.title}</h4>

                          <p className="text-[11px] text-slate-400 truncate mt-0.5">
                            {rep.userName} {rep.userEmail ? `(${rep.userEmail})` : ''}
                          </p>

                          <div className="flex flex-wrap items-center gap-1.5 mt-2">
                            <span
                              className={`px-1.5 py-0.5 rounded text-[9px] font-black uppercase ${
                                isWaiting
                                  ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 animate-pulse'
                                  : isHandling
                                  ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40'
                                  : isResolved
                                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                                  : 'bg-slate-800 text-slate-400'
                              }`}
                            >
                              {rep.status.replace(/_/g, ' ')}
                            </span>

                            <span
                              className={`px-1.5 py-0.5 rounded text-[9px] font-black uppercase ${
                                rep.priority === 'urgent'
                                  ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
                                  : rep.priority === 'high'
                                  ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                                  : 'bg-white/5 text-slate-400'
                              }`}
                            >
                              {rep.priority}
                            </span>

                            <span className="text-[10px] text-slate-400 font-mono capitalize">
                              {rep.category}
                            </span>
                          </div>
                        </div>
                      </button>
                    );
                  })
                )}
              </div>
            </div>

            {/* Right Column: Detailed Report Inspection & Resolution Desk */}
            <div className="flex-1 min-w-0 flex flex-col h-full min-h-0 overflow-hidden bg-slate-950">
              {isLoadingReportDetails ? (
                <div className="h-full flex items-center justify-center text-slate-400">
                  <RefreshCw className="w-5 h-5 animate-spin mr-2 text-amber-400" />
                  Loading report details...
                </div>
              ) : selectedReportDetails ? (
                <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain p-5 space-y-5 scrollbar-thin">
                  {/* Report Card Header */}
                  <div className="p-4 rounded-2xl bg-gradient-to-r from-slate-900 to-[#0B1D51] border border-white/10 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs font-bold text-amber-400">
                          #{selectedReportDetails.report.id}
                        </span>
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider ${
                            selectedReportDetails.report.status === 'waiting_for_admin'
                              ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                              : selectedReportDetails.report.status === 'admin_handling'
                              ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40'
                              : selectedReportDetails.report.status === 'resolved'
                              ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                              : 'bg-slate-800 text-slate-400'
                          }`}
                        >
                          {selectedReportDetails.report.status.replace(/_/g, ' ')}
                        </span>
                        <span className="px-2 py-0.5 rounded bg-white/10 text-slate-300 text-[10px] font-bold uppercase">
                          {selectedReportDetails.report.priority} priority
                        </span>
                      </div>
                      <h3 className="text-base font-black text-white mt-1">
                        {selectedReportDetails.report.title}
                      </h3>
                      <p className="text-xs text-slate-400 mt-0.5">
                        Reported by <span className="text-white font-bold">{selectedReportDetails.report.userName}</span>
                        {selectedReportDetails.report.userEmail ? ` (${selectedReportDetails.report.userEmail})` : ''} •{' '}
                        {new Date(selectedReportDetails.report.createdAt).toLocaleString()}
                      </p>
                    </div>

                    {/* Status Actions */}
                    <div className="flex flex-wrap items-center gap-2">
                      {selectedReportDetails.report.status !== 'admin_handling' && selectedReportDetails.report.status !== 'resolved' && (
                        <button
                          disabled={isResolvingReport}
                          onClick={() => handleUpdateReportStatus('admin_handling')}
                          className="px-3 py-1.5 rounded-xl bg-cyan-500/20 hover:bg-cyan-500/30 border border-cyan-500/40 text-cyan-300 font-bold text-xs flex items-center gap-1.5 transition cursor-pointer"
                        >
                          <Headphones className="w-3.5 h-3.5" />
                          <span>Mark In Progress</span>
                        </button>
                      )}

                      {selectedReportDetails.report.status !== 'resolved' && (
                        <button
                          disabled={isResolvingReport}
                          onClick={() => handleUpdateReportStatus('resolved', 'Resolved by support team.')}
                          className="px-3.5 py-1.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs flex items-center gap-1.5 transition cursor-pointer"
                        >
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>Resolve Report</span>
                        </button>
                      )}

                      {selectedReportDetails.report.status === 'resolved' && (
                        <button
                          disabled={isResolvingReport}
                          onClick={() => handleUpdateReportStatus('closed')}
                          className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs transition cursor-pointer"
                        >
                          Close Ticket
                        </button>
                      )}
                    </div>
                  </div>

                  {/* AI Root Cause & Diagnostics Analysis (if attached) */}
                  {selectedReportDetails.report.aiDiagnostics && (
                    <div className="p-4 rounded-2xl bg-[#0B1D51]/50 border border-cyan-500/30 space-y-2">
                      <div className="flex items-center gap-2 text-cyan-300 font-black text-xs">
                        <Sparkles className="w-4 h-4 text-cyan-400" />
                        <span>AI Diagnostic & Troubleshooting Analysis</span>
                      </div>
                      <p className="text-xs text-slate-200 leading-relaxed">
                        {selectedReportDetails.report.aiDiagnostics.summary}
                      </p>
                      {selectedReportDetails.report.aiDiagnostics.suspectedCause && (
                        <div className="text-[11px] text-cyan-200/90 pt-1">
                          <span className="font-bold text-cyan-300">Suspected Root Cause:</span>{' '}
                          {selectedReportDetails.report.aiDiagnostics.suspectedCause}
                        </div>
                      )}
                      {selectedReportDetails.report.aiDiagnostics.suggestedAction && (
                        <div className="text-[11px] text-amber-200/90">
                          <span className="font-bold text-amber-300">Recommended Action:</span>{' '}
                          {selectedReportDetails.report.aiDiagnostics.suggestedAction}
                        </div>
                      )}
                    </div>
                  )}

                  {/* User Description & Attachments */}
                  <div className="p-4 rounded-2xl bg-slate-900/80 border border-white/10 space-y-3">
                    <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                      User Problem Description
                    </h4>
                    <p className="text-xs text-slate-200 leading-relaxed whitespace-pre-wrap">
                      {selectedReportDetails.report.description}
                    </p>

                    {selectedReportDetails.report.attachments && selectedReportDetails.report.attachments.length > 0 && (
                      <div className="pt-2">
                        <span className="text-[11px] font-bold text-slate-400 block mb-2">Attached Error Screenshots:</span>
                        <div className="flex flex-wrap gap-3">
                          {selectedReportDetails.report.attachments.map((att, idx) => (
                            <div key={idx} className="relative group">
                              <img
                                src={att.url}
                                alt={att.name || 'report screenshot'}
                                onClick={() => setZoomedImage(att.url)}
                                className="w-32 h-32 object-cover rounded-xl border border-white/20 cursor-zoom-in hover:opacity-90 transition"
                                referrerPolicy="no-referrer"
                              />
                              <span className="text-[10px] text-slate-400 block truncate max-w-[128px] mt-1">{att.name}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Internal Staff Notes */}
                  <div className="p-4 rounded-2xl bg-slate-900/60 border border-white/10 space-y-3">
                    <div className="flex items-center justify-between">
                      <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                        <ShieldAlert className="w-3.5 h-3.5 text-amber-400" />
                        <span>Internal Staff Notes (Invisible to user)</span>
                      </h4>
                      <span className="text-[10px] text-slate-500">
                        {selectedReportDetails.report.internalNotes?.length || 0} notes
                      </span>
                    </div>

                    {selectedReportDetails.report.internalNotes && selectedReportDetails.report.internalNotes.length > 0 ? (
                      <div className="space-y-2 max-h-40 overflow-y-auto">
                        {selectedReportDetails.report.internalNotes.map((note, idx) => (
                          <div key={idx} className="p-2.5 rounded-xl bg-slate-950 border border-white/5 text-xs text-slate-300">
                            <div className="flex items-center justify-between text-[10px] text-slate-500 mb-1">
                              <span className="font-bold text-amber-400/80">{note.adminEmail}</span>
                              <span>{new Date(note.createdAt).toLocaleString()}</span>
                            </div>
                            <p>{note.note}</p>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-xs text-slate-500 italic">No internal technician notes added yet.</p>
                    )}

                    <div className="flex gap-2 pt-1">
                      <input
                        type="text"
                        value={reportInternalNoteText}
                        onChange={e => setReportInternalNoteText(e.target.value)}
                        onKeyDown={e => e.key === 'Enter' && handleAddReportInternalNote()}
                        placeholder="Add internal note for team..."
                        className="flex-1 bg-slate-950 border border-white/10 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-400"
                      />
                      <button
                        onClick={handleAddReportInternalNote}
                        className="px-3.5 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-slate-200 font-bold text-xs transition cursor-pointer"
                      >
                        Add Note
                      </button>
                    </div>
                  </div>

                  {/* Reply to User Directly from Report */}
                  <div className="p-4 rounded-2xl bg-gradient-to-br from-slate-900 to-[#0A1A3A] border border-cyan-500/30 space-y-3">
                    <h4 className="text-xs font-bold text-cyan-300 uppercase tracking-wider flex items-center gap-1.5">
                      <Send className="w-3.5 h-3.5 text-cyan-400" />
                      <span>Reply to User (Dispatched to Chat & Profile)</span>
                    </h4>

                    <textarea
                      rows={3}
                      value={reportReplyText}
                      onChange={e => setReportReplyText(e.target.value)}
                      placeholder="Type your official response/solution to the user regarding this report..."
                      className="w-full bg-slate-950 border border-white/15 focus:border-cyan-400 rounded-xl p-3 text-xs text-white placeholder-slate-500 focus:outline-none"
                    />

                    <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
                      <div className="flex items-center gap-2">
                        <input
                          ref={fileInputRef}
                          type="file"
                          accept="image/*"
                          onChange={handleAttachmentChange}
                          className="hidden"
                        />
                        <button
                          type="button"
                          onClick={() => fileInputRef.current?.click()}
                          className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-slate-400 hover:text-cyan-300 border border-white/10 text-xs flex items-center gap-1.5 transition cursor-pointer"
                        >
                          <ImageIcon className="w-3.5 h-3.5" />
                          <span>Attach Screenshot</span>
                        </button>

                        {adminAttachment && (
                          <span className="text-[11px] text-cyan-300 truncate max-w-[150px]">
                            {adminAttachment.name}
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          disabled={!reportReplyText.trim() || isSubmittingReportReply}
                          onClick={() => handleReplyToReport(false)}
                          className="px-4 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white font-bold text-xs transition cursor-pointer disabled:opacity-40"
                        >
                          Send Message
                        </button>

                        <button
                          type="button"
                          disabled={!reportReplyText.trim() || isSubmittingReportReply}
                          onClick={() => handleReplyToReport(true)}
                          className="px-5 py-2 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-slate-950 font-black text-xs flex items-center gap-1.5 transition cursor-pointer disabled:opacity-40"
                        >
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>Send & Mark Resolved</span>
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="h-full flex items-center justify-center text-slate-500 text-sm">
                  Select a support report from the left to view details and resolution tools
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
          TAB 2: AI PROVIDERS & MODELS (PLUGGABLE SYSTEM)
          ========================================================================= */}
      {activeTab === 'providers' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between bg-slate-900/60 p-4 rounded-2xl border border-white/10">
            <div>
              <h3 className="text-base font-black text-white">Configured AI Providers</h3>
              <p className="text-xs text-slate-400">
                Switch or fallback seamlessly between Google Gemini, Groq Cloud, or custom OpenAI-compatible endpoints.
              </p>
            </div>
            <button
              onClick={() => {
                setEditingProvider({
                  name: '',
                  type: 'openai',
                  model: 'gpt-4o-mini',
                  visionModel: 'gpt-4o-mini',
                  temperature: 0.3,
                  maxOutputTokens: 1200,
                  enabled: true,
                  isActive: false,
                  isFallback: false
                });
                setIsProviderModalOpen(true);
              }}
              className="px-4 py-2 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 text-white text-xs font-bold flex items-center gap-2 transition cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Add AI Provider</span>
            </button>
          </div>

          {providerNotice && (
            <div
              className={`p-3 rounded-2xl text-xs flex items-center justify-between border ${
                providerNotice.error
                  ? 'bg-red-950/40 border-red-500/50 text-red-200'
                  : 'bg-emerald-950/40 border-emerald-500/50 text-emerald-200'
              }`}
            >
              <span>{providerNotice.text}</span>
              <button
                onClick={() => setProviderNotice(null)}
                className="text-xs font-bold hover:underline opacity-80"
              >
                Dismiss
              </button>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {providers.map(prov => {
              const testResult = testResults[prov.id];
              return (
                <div
                  key={prov.id}
                  className={`p-5 rounded-2xl bg-slate-950/80 border flex flex-col justify-between gap-4 transition ${
                    prov.isActive
                      ? 'border-[#5DE2E7] shadow-[0_0_20px_rgba(93,226,231,0.2)]'
                      : 'border-white/10'
                  }`}
                >
                  <div className="space-y-2.5">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <h4 className="text-sm font-black text-white flex items-center gap-2">
                          {prov.name}
                          {prov.isActive && (
                            <span className="px-2 py-0.5 rounded-full bg-[#5DE2E7]/20 text-[#5DE2E7] text-[10px] font-extrabold uppercase border border-[#5DE2E7]/40">
                              Active Primary
                            </span>
                          )}
                          {prov.isFallback && (
                            <span className="px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 text-[10px] font-extrabold uppercase border border-amber-500/40">
                              Backup Fallback
                            </span>
                          )}
                        </h4>
                        <span className="text-xs text-slate-400 font-mono uppercase">
                          Adapter: {prov.type}
                        </span>
                      </div>
                    </div>

                    <div className="p-3 rounded-xl bg-slate-900/90 border border-white/5 space-y-1 text-xs">
                      <div className="flex justify-between">
                        <span className="text-slate-400">Chat Model:</span>
                        <span className="text-slate-200 font-mono font-bold">{prov.model}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-400">Vision Model:</span>
                        <span className="text-slate-200 font-mono">{prov.visionModel || prov.model}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-400">Temperature:</span>
                        <span className="text-slate-200">{prov.temperature}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-slate-400">API Key:</span>
                        <span className={`font-mono text-[11px] ${prov.apiKey ? 'text-emerald-400' : 'text-amber-400/80'}`}>
                          {prov.apiKey || (prov.type === 'grounded_knowledge' ? 'Built-in (Zero-Key)' : 'Not configured')}
                        </span>
                      </div>
                    </div>

                    {/* Test result box */}
                    {testResult && (
                      <div
                        className={`p-3 rounded-xl text-xs border flex flex-col gap-2 ${
                          testResult.success
                            ? 'bg-emerald-950/40 border-emerald-500/40 text-emerald-300'
                            : 'bg-red-950/40 border-red-500/40 text-red-300'
                        }`}
                      >
                        <div className="leading-relaxed">{testResult.message}</div>
                        {!testResult.success && (
                          <div className="pt-1.5 flex items-center justify-between border-t border-red-500/20">
                            <span className="text-[11px] text-red-300/80">Key issue or access denied?</span>
                            <button
                              onClick={() => openEditProvider(prov)}
                              className="px-2.5 py-1 rounded-lg bg-red-500/20 hover:bg-red-500/30 text-white font-bold text-[11px] transition cursor-pointer flex items-center gap-1"
                            >
                              <Edit3 className="w-3 h-3" />
                              <span>Configure / Add Key</span>
                            </button>
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  <div className="pt-2 border-t border-white/5 flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => handleTestProvider(prov.id)}
                        disabled={testResult?.loading}
                        className="px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-slate-300 hover:text-cyan-300 text-xs font-bold transition flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                      >
                        <RefreshCw className={`w-3.5 h-3.5 ${testResult?.loading ? 'animate-spin' : ''}`} />
                        <span>{testResult?.loading ? 'Testing...' : 'Test Speed'}</span>
                      </button>

                      <button
                        onClick={() => openEditProvider(prov)}
                        className="px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-slate-300 hover:text-white text-xs font-bold transition flex items-center gap-1.5 cursor-pointer"
                        title="Edit model or configure API Key"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                        <span>Configure</span>
                      </button>
                    </div>

                    {!prov.isActive && (
                      <button
                        onClick={() => handleActivateProvider(prov.id)}
                        className="px-3 py-1.5 rounded-xl bg-[#5DE2E7]/20 hover:bg-[#5DE2E7]/30 border border-[#5DE2E7]/40 text-[#5DE2E7] text-xs font-bold transition cursor-pointer"
                      >
                        Set as Active
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* =========================================================================
          TAB 3: KNOWLEDGE BASE (AUTOMATIC WEBSITE DATA SYNC & RAG ENGINE)
          ========================================================================= */}
      {activeTab === 'knowledge' && (
        <div className="space-y-5">
          {/* Automatic Website Sync Status Banner */}
          <div className="p-5 rounded-2xl bg-gradient-to-r from-slate-900 via-slate-950 to-slate-900 border border-cyan-500/30 shadow-[0_0_25px_rgba(93,226,231,0.08)] space-y-4">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="flex items-start gap-3">
                <div className="p-2.5 rounded-xl bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 shrink-0">
                  <Globe className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="text-sm font-black text-white tracking-wide">
                      Automatic Website Knowledge Discovery & RAG Sync
                    </h3>
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-950/80 border border-emerald-500/30 text-[10px] font-bold text-emerald-400">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                      Live Website Grounding Active
                    </span>
                  </div>
                  <p className="text-xs text-slate-300 mt-1 max-w-2xl leading-relaxed">
                    The website itself is the primary source of truth. The AI Support agent automatically discovers and indexes live products, free download links, categories, FAQs, and policies without requiring manual data entry.
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <button
                  onClick={handleTriggerWebsiteSync}
                  disabled={isSyncingWebsite || isReindexing}
                  className="px-4 py-2 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white text-xs font-bold flex items-center gap-2 transition cursor-pointer shadow-[0_0_15px_rgba(93,226,231,0.3)] disabled:opacity-50"
                  title="Pull latest live products, pages, and policies into RAG memory"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isSyncingWebsite ? 'animate-spin' : ''}`} />
                  <span>{isSyncingWebsite ? 'Syncing Website...' : 'Sync Website Now'}</span>
                </button>
                <button
                  onClick={() => {
                    setEditingDoc({
                      title: '',
                      category: 'General',
                      content: '',
                      sourceType: 'custom'
                    });
                    setIsDocModalOpen(true);
                  }}
                  className="px-3.5 py-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-slate-300 hover:text-white text-xs font-bold flex items-center gap-1.5 transition cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Custom Entry</span>
                </button>
              </div>
            </div>

            {/* Indexed Breakdown Metric Strip */}
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5 pt-2 border-t border-white/5">
              <div className="p-2.5 rounded-xl bg-slate-900/80 border border-white/5 flex flex-col">
                <span className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider">Live Products</span>
                <span className="text-base font-black text-cyan-400 mt-0.5">
                  {websiteSyncStatus?.indexedBreakdown?.products ?? (documents.filter(d => d.sourceType === 'product').length || 10)}
                </span>
                <span className="text-[10px] text-slate-400">Apps & APK Tools</span>
              </div>
              <div className="p-2.5 rounded-xl bg-slate-900/80 border border-white/5 flex flex-col">
                <span className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider">Website Pages</span>
                <span className="text-base font-black text-blue-400 mt-0.5">
                  {websiteSyncStatus?.indexedBreakdown?.pages ?? (documents.filter(d => d.sourceType === 'page').length || 6)}
                </span>
                <span className="text-[10px] text-slate-400">Home, About, Hub</span>
              </div>
              <div className="p-2.5 rounded-xl bg-slate-900/80 border border-white/5 flex flex-col">
                <span className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider">FAQs & Guides</span>
                <span className="text-base font-black text-purple-400 mt-0.5">
                  {websiteSyncStatus?.indexedBreakdown?.faqs ?? (documents.filter(d => d.sourceType === 'faq' || d.sourceType === 'policy').length || 5)}
                </span>
                <span className="text-[10px] text-slate-400">Security & Telegram</span>
              </div>
              <div className="p-2.5 rounded-xl bg-slate-900/80 border border-white/5 flex flex-col">
                <span className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider">Categories</span>
                <span className="text-base font-black text-amber-400 mt-0.5">
                  {websiteSyncStatus?.indexedBreakdown?.categories ?? (documents.filter(d => d.sourceType === 'category').length || 8)}
                </span>
                <span className="text-[10px] text-slate-400">Catalog structure</span>
              </div>
              <div className="p-2.5 rounded-xl bg-slate-900/80 border border-white/5 flex flex-col col-span-2 sm:col-span-1">
                <span className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider">Total Chunks</span>
                <span className="text-base font-black text-emerald-400 mt-0.5">
                  {totalChunks}
                </span>
                <span className="text-[10px] text-slate-400">Vectorized units</span>
              </div>
            </div>

            {websiteSyncStatus?.lastSyncTime && (
              <div className="text-[11px] text-slate-400 flex items-center justify-between">
                <span>Last live sync: {new Date(websiteSyncStatus.lastSyncTime).toLocaleTimeString()} ({new Date(websiteSyncStatus.lastSyncTime).toLocaleDateString()})</span>
                <span className="text-cyan-400/80">Real-time sync on resource change: Active</span>
              </div>
            )}
          </div>

          {/* Search Box & Source Filter Tabs */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={knowledgeSearch}
                onChange={e => setKnowledgeSearch(e.target.value)}
                placeholder="Search indexed products, categories, pages, or guidelines..."
                className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-900 border border-white/10 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-[#5DE2E7]"
              />
            </div>

            {/* Filter Pills */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
              {[
                { id: 'all', label: 'All Sources' },
                { id: 'product', label: 'Products' },
                { id: 'page', label: 'Pages' },
                { id: 'faq', label: 'FAQs' },
                { id: 'category', label: 'Categories' },
                { id: 'custom', label: 'Custom' }
              ].map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setKnowledgeTypeFilter(tab.id)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition cursor-pointer ${
                    knowledgeTypeFilter === tab.id
                      ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40'
                      : 'bg-white/5 text-slate-400 hover:text-white border border-white/5'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>

          {/* Documents Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {documents
              .filter(d => {
                if (knowledgeTypeFilter !== 'all' && d.sourceType !== knowledgeTypeFilter) {
                  return false;
                }
                if (!knowledgeSearch.trim()) return true;
                const q = knowledgeSearch.toLowerCase();
                return (
                  d.title.toLowerCase().includes(q) ||
                  d.category.toLowerCase().includes(q) ||
                  d.content.toLowerCase().includes(q)
                );
              })
              .map(doc => {
                const isProduct = doc.sourceType === 'product';
                const isPage = doc.sourceType === 'page';
                const isFaq = doc.sourceType === 'faq' || doc.sourceType === 'policy';
                const isCategory = doc.sourceType === 'category';

                return (
                  <div
                    key={doc.id}
                    className="p-4 rounded-2xl bg-slate-950/80 border border-white/10 flex flex-col justify-between gap-3 hover:border-cyan-500/40 transition group"
                  >
                    <div className="space-y-2.5">
                      <div className="flex items-start justify-between gap-2">
                        <h4 className="text-sm font-bold text-white line-clamp-1 group-hover:text-cyan-300 transition">
                          {doc.title}
                        </h4>
                        <div className="flex items-center gap-1 shrink-0">
                          <span
                            className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                              isProduct
                                ? 'bg-emerald-950 text-emerald-300 border-emerald-800'
                                : isPage
                                ? 'bg-blue-950 text-blue-300 border-blue-800'
                                : isFaq
                                ? 'bg-purple-950 text-purple-300 border-purple-800'
                                : isCategory
                                ? 'bg-amber-950 text-amber-300 border-amber-800'
                                : 'bg-cyan-950 text-cyan-300 border-cyan-800'
                            }`}
                          >
                            {doc.sourceType?.toUpperCase() || 'DOCUMENT'}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 text-[11px] text-slate-400">
                        <span className="font-semibold text-slate-300">{doc.category}</span>
                        {isProduct && (
                          <>
                            <span>•</span>
                            <span className="text-emerald-400 font-bold">100% Free</span>
                          </>
                        )}
                      </div>

                      <p className="text-xs text-slate-300 line-clamp-4 leading-relaxed whitespace-pre-wrap">
                        {doc.content}
                      </p>
                    </div>

                    <div className="pt-2 border-t border-white/5 flex items-center justify-between text-[11px] text-slate-400">
                      <span className="flex items-center gap-1">
                        <Layers className="w-3 h-3 text-cyan-400" />
                        <span>{doc.chunksCount} chunks indexed</span>
                      </span>
                      <button
                        onClick={async () => {
                          if (confirm(`Remove "${doc.title}" from knowledge base?`)) {
                            await supportService.deleteKnowledgeDocument(doc.id);
                            loadKnowledge();
                          }
                        }}
                        className="p-1 text-slate-500 hover:text-red-400 transition"
                        title="Delete document"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                );
              })}
          </div>
        </div>
      )}

      {/* =========================================================================
          TAB 5: VOICE & TTS (ELEVENLABS) CONFIGURATION & PLAYGROUND
          ========================================================================= */}
      {activeTab === 'voice' && (
        <div className="space-y-6">
          {/* Notification Banner */}
          {ttsNotice && (
            <div
              className={`p-3.5 rounded-2xl text-xs font-bold flex items-center justify-between transition-all ${
                ttsNotice.error
                  ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                  : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
              }`}
            >
              <div className="flex items-center gap-2">
                {ttsNotice.error ? (
                  <AlertCircle className="w-4 h-4 text-rose-400" />
                ) : (
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                )}
                <span>{ttsNotice.text}</span>
              </div>
              <button
                onClick={() => setTtsNotice(null)}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          {/* Top Voice Header & Save */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-6 rounded-3xl bg-slate-950/80 border border-white/10">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center text-white shadow-lg">
                  <Volume2 className="w-4 h-4" />
                </div>
                <h3 className="text-base font-black text-white">ElevenLabs Voice & Text-to-Speech</h3>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-cyan-950 text-cyan-300 border border-cyan-800">
                  Multilingual v3
                </span>
              </div>
              <p className="text-xs text-slate-400">
                High-definition, expressive AI speech for OTL Live Support messages in Bengali (বাংলা), English, and Mixed language.
              </p>
            </div>

            <div className="flex items-center gap-3">
              <label className="flex items-center gap-2.5 px-3 py-2 rounded-xl bg-white/5 border border-white/10 cursor-pointer">
                <span className="text-xs font-bold text-slate-300">Voice Synthesis</span>
                <input
                  type="checkbox"
                  checked={ttsSettings?.enabled ?? true}
                  onChange={e => {
                    const enabled = e.target.checked;
                    setTtsSettings(prev => (prev ? { ...prev, enabled } : null));
                    handleSaveTTSSettings({ enabled });
                  }}
                  className="w-4 h-4 accent-[#5DE2E7] rounded cursor-pointer"
                />
              </label>

              <button
                onClick={() => ttsSettings && handleSaveTTSSettings(ttsSettings)}
                disabled={isSavingTts}
                className="px-5 py-2 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 text-white font-black text-xs transition cursor-pointer shadow-[0_0_15px_rgba(93,226,231,0.3)] disabled:opacity-50 flex items-center gap-1.5"
              >
                {isSavingTts ? (
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <CheckCircle2 className="w-3.5 h-3.5" />
                )}
                <span>Save Voice Settings</span>
              </button>
            </div>
          </div>

          {/* Voice Analytics & Cache Metrics */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="p-4 rounded-2xl bg-slate-900/60 border border-white/10">
              <span className="text-[11px] text-slate-400 font-bold uppercase">Total Audio Requests</span>
              <div className="text-xl font-black text-white mt-1">
                {ttsStats?.totalRequests || 0}
              </div>
              <span className="text-[10px] text-slate-500 mt-1 block">
                {ttsStats?.successfulPlays || 0} successfully played
              </span>
            </div>

            <div className="p-4 rounded-2xl bg-cyan-950/30 border border-cyan-500/30">
              <span className="text-[11px] text-cyan-300 font-bold uppercase">Synthesized Characters</span>
              <div className="text-xl font-black text-cyan-400 mt-1">
                {ttsStats?.totalCharactersSynthesized?.toLocaleString() || 0}
              </div>
              <span className="text-[10px] text-cyan-300/70 mt-1 block">
                {ttsStats?.cachedRequests || 0} served instantly from cache
              </span>
            </div>

            <div className="p-4 rounded-2xl bg-emerald-950/30 border border-emerald-500/30">
              <span className="text-[11px] text-emerald-300 font-bold uppercase">Cache Hit Rate</span>
              <div className="text-xl font-black text-emerald-400 mt-1">
                {ttsStats?.cacheHitRate || 0}%
              </div>
              <span className="text-[10px] text-emerald-300/70 mt-1 block">
                Zero-latency repeated requests
              </span>
            </div>

            <div className="p-4 rounded-2xl bg-purple-950/30 border border-purple-500/30">
              <span className="text-[11px] text-purple-300 font-bold uppercase">Characters Saved</span>
              <div className="text-xl font-black text-purple-400 mt-1">
                {ttsStats?.estimatedCharactersSaved?.toLocaleString() || 0}
              </div>
              <span className="text-[10px] text-purple-300/70 mt-1 block">
                Saved API character usage
              </span>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Left Column: API & Voice Parameters (7 cols) */}
            <div className="lg:col-span-7 space-y-6">
              {/* ElevenLabs API Key Pool Management Card */}
              <div className="p-5 rounded-3xl bg-slate-950/80 border border-white/10 space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-white/10">
                  <div>
                    <div className="flex items-center gap-2">
                      <Key className="w-4 h-4 text-cyan-400" />
                      <h4 className="text-sm font-black text-white">ElevenLabs API Key Pool</h4>
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-cyan-500/10 text-cyan-300 font-bold border border-cyan-500/20">
                        {keyPool.filter(k => k.enabled).length} / {keyPool.length} Active
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-400 mt-0.5">
                      Multi-key pool with automatic quota rotation, rate-limit cooldown, and instant failover.
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => {
                        setNewKeyInput('');
                        setNewKeyLabel('');
                        setNewKeyPriority(keyPool.length + 1);
                        setNewKeyShowSecret(false);
                        setIsAddKeyModalOpen(true);
                      }}
                      className="px-3 py-1.5 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white text-xs font-bold flex items-center gap-1.5 transition cursor-pointer shadow-[0_0_12px_rgba(93,226,231,0.3)]"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Add API Key</span>
                    </button>

                    <button
                      onClick={handleTestTTSConnection}
                      disabled={isTestingTtsConnection}
                      className="px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-cyan-300 border border-cyan-500/30 text-xs font-bold flex items-center gap-1.5 transition cursor-pointer disabled:opacity-50"
                      title="Test all available keys connection & refresh quota"
                    >
                      {isTestingTtsConnection ? (
                        <RefreshCw className="w-3 h-3 animate-spin text-cyan-400" />
                      ) : (
                        <Radio className="w-3 h-3 text-cyan-400" />
                      )}
                      <span>Test Pool</span>
                    </button>
                  </div>
                </div>

                {/* Pool Notification / Toast */}
                {poolNotice && (
                  <div
                    className={`p-3 rounded-2xl text-xs flex items-center justify-between gap-2 ${
                      poolNotice.error
                        ? 'bg-rose-950/50 border border-rose-500/40 text-rose-200'
                        : 'bg-emerald-950/50 border border-emerald-500/40 text-emerald-200'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      {poolNotice.error ? (
                        <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
                      ) : (
                        <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                      )}
                      <span>{poolNotice.text}</span>
                    </div>
                    <button
                      onClick={() => setPoolNotice(null)}
                      className="text-slate-400 hover:text-white text-xs"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}

                {/* Empty State: No keys in pool */}
                {keyPool.length === 0 && !isLoadingKeyPool && (
                  <div className="p-6 rounded-2xl bg-slate-900/60 border border-white/10 text-center space-y-3">
                    <div className="w-10 h-10 rounded-full bg-cyan-500/10 text-cyan-400 flex items-center justify-center mx-auto">
                      <Key className="w-5 h-5" />
                    </div>
                    <div>
                      <h5 className="text-xs font-bold text-white">No ElevenLabs API key is configured</h5>
                      <p className="text-[11px] text-slate-400 mt-1 max-w-sm mx-auto">
                        Add an API key to enable ElevenLabs voice features. The application continues functioning with browser speech fallback.
                      </p>
                    </div>
                    <button
                      onClick={() => {
                        setNewKeyInput('');
                        setNewKeyLabel('Primary Key');
                        setNewKeyPriority(1);
                        setNewKeyShowSecret(false);
                        setIsAddKeyModalOpen(true);
                      }}
                      className="px-4 py-2 rounded-xl bg-cyan-500 text-slate-950 text-xs font-black hover:bg-cyan-400 transition cursor-pointer"
                    >
                      + Add API Key
                    </button>
                  </div>
                )}

                {/* List of Keys in Pool */}
                {keyPool.length > 0 && (
                  <div className="space-y-3">
                    {keyPool.map((item, idx) => {
                      const isRevealed = Boolean(revealedKeys[item.id]);
                      const isTesting = testingKeyId === item.id;
                      const testHealth = keyTestHealth[item.id] || (item.characterLimit ? item : null);

                      return (
                        <div
                          key={item.id}
                          className={`p-3.5 rounded-2xl border transition-all ${
                            !item.enabled
                              ? 'bg-slate-950/40 border-white/5 opacity-65'
                              : item.status === 'quota_exhausted'
                              ? 'bg-amber-950/20 border-amber-500/30'
                              : item.status === 'invalid'
                              ? 'bg-rose-950/20 border-rose-500/30'
                              : 'bg-slate-900/90 border-white/10 hover:border-white/20'
                          }`}
                        >
                          {/* Row 1: Header (Label, Priority, Status Badges) */}
                          <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                            <div className="flex items-center gap-2">
                              <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-white/10 text-cyan-300 font-bold">
                                #{item.priority ?? idx + 1}
                              </span>
                              <span className="text-xs font-bold text-white">
                                {item.label || `API Key #${idx + 1}`}
                              </span>
                            </div>

                            <div className="flex items-center gap-1.5 flex-wrap">
                              {/* Status Badge */}
                              {item.status === 'available' && (
                                <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 font-bold flex items-center gap-1 border border-emerald-500/30">
                                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                                  Available
                                </span>
                              )}
                              {item.status === 'quota_exhausted' && (
                                <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 font-bold border border-amber-500/30">
                                  Quota Exhausted (15m cooldown)
                                </span>
                              )}
                              {item.status === 'rate_limited' && (
                                <span className="text-[10px] px-2 py-0.5 rounded-full bg-yellow-500/20 text-yellow-300 font-bold border border-yellow-500/30">
                                  Rate Limited
                                </span>
                              )}
                              {item.status === 'disabled' && (
                                <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-800 text-slate-400 font-bold border border-white/10">
                                  Disabled
                                </span>
                              )}
                              {item.status === 'invalid' && (
                                <span className="text-[10px] px-2 py-0.5 rounded-full bg-rose-500/20 text-rose-300 font-bold border border-rose-500/30">
                                  Invalid Key
                                </span>
                              )}

                              {/* Pool Enabled / Disabled */}
                              <span
                                className={`text-[10px] px-2 py-0.5 rounded-full font-bold border ${
                                  item.enabled
                                    ? 'bg-cyan-500/10 text-cyan-300 border-cyan-500/20'
                                    : 'bg-slate-900 text-slate-500 border-white/5'
                                }`}
                              >
                                {item.enabled ? 'Pool: Enabled' : 'Pool: Disabled'}
                              </span>
                            </div>
                          </div>

                          {/* Row 2: Masked Key Field + Show/Hide + Copy */}
                          <div className="flex items-center gap-2 bg-slate-950 p-2 rounded-xl border border-white/10">
                            <Key className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                            <span className="font-mono text-xs text-slate-200 flex-1 select-all break-all">
                              {isRevealed ? revealedKeys[item.id] : item.maskedKey}
                            </span>

                            {/* Show / Hide Toggle Button */}
                            <button
                              type="button"
                              onClick={() => handleToggleRevealKey(item.id)}
                              disabled={revealingKeyId === item.id}
                              className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white transition cursor-pointer"
                              title={isRevealed ? 'Hide secret key' : 'Show secret key'}
                            >
                              {revealingKeyId === item.id ? (
                                <RefreshCw className="w-3.5 h-3.5 animate-spin text-cyan-400" />
                              ) : isRevealed ? (
                                <EyeOff className="w-3.5 h-3.5 text-amber-400" />
                              ) : (
                                <Eye className="w-3.5 h-3.5" />
                              )}
                            </button>

                            {/* Copy Key Button */}
                            <button
                              type="button"
                              onClick={() => handleCopyKey(item)}
                              className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white transition cursor-pointer"
                              title="Copy key to clipboard"
                            >
                              {copiedKeyId === item.id ? (
                                <Check className="w-3.5 h-3.5 text-emerald-400" />
                              ) : (
                                <Copy className="w-3.5 h-3.5" />
                              )}
                            </button>
                          </div>

                          {/* Row 3: Live Health / Quota Stats */}
                          {testHealth && (
                            <div className="mt-2 text-[10px] text-slate-400 flex flex-wrap items-center gap-3 bg-white/[0.02] px-2.5 py-1.5 rounded-lg border border-white/5">
                              {testHealth.tier && (
                                <span>Tier: <strong className="text-white capitalize">{testHealth.tier}</strong></span>
                              )}
                              {typeof testHealth.characterCount === 'number' && (
                                <span>Used: <strong className="text-white">{testHealth.characterCount.toLocaleString()}</strong></span>
                              )}
                              {typeof testHealth.characterLimit === 'number' && (
                                <span>Limit: <strong className="text-white">{testHealth.characterLimit.toLocaleString()}</strong></span>
                              )}
                              {typeof testHealth.remainingCharacters === 'number' && (
                                <span>Remaining: <strong className="text-emerald-300">{testHealth.remainingCharacters.toLocaleString()}</strong></span>
                              )}
                              {item.lastUsedAt && (
                                <span>Last Used: <span className="text-slate-300">{new Date(item.lastUsedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span></span>
                              )}
                              {item.lastError && (
                                <span className="text-rose-300">Note: {item.lastError}</span>
                              )}
                            </div>
                          )}

                          {/* Row 4: Action Controls [Test] [Edit] [Enable/Disable] [Delete] */}
                          <div className="flex items-center justify-end gap-2 mt-2.5 pt-2 border-t border-white/5">
                            {/* Test Button */}
                            <button
                              type="button"
                              onClick={() => handleTestIndividualKey(item.id)}
                              disabled={isTesting}
                              className="px-2.5 py-1 rounded-lg bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white text-[11px] font-bold flex items-center gap-1 transition cursor-pointer disabled:opacity-50"
                            >
                              {isTesting ? (
                                <RefreshCw className="w-3 h-3 animate-spin text-cyan-400" />
                              ) : (
                                <Radio className="w-3 h-3 text-cyan-400" />
                              )}
                              <span>Test</span>
                            </button>

                            {/* Edit Button */}
                            <button
                              type="button"
                              onClick={() => handleOpenEditModal(item)}
                              className="px-2.5 py-1 rounded-lg bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white text-[11px] font-bold flex items-center gap-1 transition cursor-pointer"
                            >
                              <Edit3 className="w-3 h-3 text-blue-400" />
                              <span>Edit</span>
                            </button>

                            {/* Toggle Enable/Disable Button */}
                            <button
                              type="button"
                              onClick={() => handleToggleKeyEnabled(item.id)}
                              className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition cursor-pointer ${
                                item.enabled
                                  ? 'bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border border-amber-500/20'
                                  : 'bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-300 border border-emerald-500/20'
                              }`}
                            >
                              {item.enabled ? 'Disable' : 'Enable'}
                            </button>

                            {/* Delete Button */}
                            <button
                              type="button"
                              onClick={() => handleInitiateDeleteKey(item)}
                              className="px-2.5 py-1 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 hover:text-rose-300 text-[11px] font-bold flex items-center gap-1 transition cursor-pointer border border-rose-500/20"
                              title="Delete API key from pool"
                            >
                              <Trash2 className="w-3 h-3" />
                              <span>Delete</span>
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* Legacy single-key compatibility helper note */}
                <p className="text-[10px] text-slate-500 pt-1">
                  💡 <strong>Automatic Failover:</strong> When active keys exhaust their monthly character quota or reach concurrency limits, the system automatically rotates to the next available key and cools exhausted keys for 15 minutes before re-checking.
                </p>
              </div>

              {/* Voice Model & ID Selection */}
              <div className="p-5 rounded-3xl bg-slate-950/80 border border-white/10 space-y-4">
                <div className="flex items-center gap-2">
                  <Sliders className="w-4 h-4 text-cyan-400" />
                  <h4 className="text-sm font-black text-white">Voice Model & Selection</h4>
                </div>

                {/* Model ID Selection */}
                <div>
                  <label className="text-xs text-slate-300 block mb-1">
                    AI Speech Synthesis Model
                  </label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {[
                      {
                        id: 'eleven_multilingual_v2',
                        name: 'Eleven Multilingual v2',
                        badge: 'Recommended',
                        desc: 'Industry standard for 29+ languages (Bengali & English), reliable low latency'
                      },
                      {
                        id: 'eleven_flash_v2_5',
                        name: 'Eleven Flash v2.5',
                        badge: 'Ultra Fast',
                        desc: 'Ultra-low latency inference, best for rapid real-time conversation'
                      },
                      {
                        id: 'eleven_turbo_v2_5',
                        name: 'Eleven Turbo v2.5',
                        badge: 'High Speed',
                        desc: 'Optimized balance of high quality and quick response times'
                      },
                      {
                        id: 'eleven_v3',
                        name: 'Eleven Multilingual v3',
                        badge: 'High Fidelity',
                        desc: 'Deep emotional nuance for rich narration; auto-falls back if timed out'
                      }
                    ].map(m => (
                      <div
                        key={m.id}
                        onClick={() =>
                          setTtsSettings(prev => (prev ? { ...prev, modelId: m.id } : null))
                        }
                        className={`p-3 rounded-xl border transition cursor-pointer ${
                          ttsSettings?.modelId === m.id
                            ? 'bg-cyan-500/20 border-cyan-400 text-white'
                            : 'bg-slate-900/80 border-white/10 text-slate-300 hover:bg-white/5'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold">{m.name}</span>
                          <span className="text-[9px] px-1.5 py-0.5 rounded bg-white/10 font-medium text-cyan-300">
                            {m.badge}
                          </span>
                        </div>
                        <p className="text-[10px] text-slate-400 mt-1 leading-snug">{m.desc}</p>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Curated Voice Presets */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-xs text-slate-300 font-medium">
                      Select Curated Voice
                    </label>
                    <span className="text-[10px] text-cyan-400 font-semibold">4 Curated Multilingual Voices</span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    {[
                      {
                        id: '3AMU7jXQuQa3oRvRqUmb',
                        name: 'Viraj',
                        desc: 'Rich, Confident & Expressive (Bengali & English)',
                        badge: 'Paid / Auto-fallback'
                      },
                      {
                        id: 'vIdhHAZdn1bGjKe1dFw8',
                        name: 'Rudra',
                        desc: 'Intense Documentary Narrator (Bengali & English)',
                        badge: 'Paid / Auto-fallback'
                      },
                      {
                        id: 'JBFqnCBsd6RMkjVDRZzb',
                        name: 'George',
                        desc: 'Warm & Natural Storyteller (Free & Paid Ready)',
                        badge: 'Free & Paid Ready'
                      },
                      {
                        id: 'IKne3meq5aSn9XLyUdCD',
                        name: 'Charlie',
                        desc: 'Deep, Confident & Energetic (Free & Paid Ready)',
                        badge: 'Free & Paid Ready'
                      }
                    ].map(v => {
                      const isSelected = ttsSettings?.voiceId === v.id;
                      return (
                        <button
                          key={v.id}
                          type="button"
                          onClick={() =>
                            setTtsSettings(prev =>
                              prev ? { ...prev, voiceId: v.id, voiceName: `${v.name} - ${v.desc}` } : null
                            )
                          }
                          className={`p-3 rounded-xl border text-left transition-all cursor-pointer flex flex-col justify-between ${
                            isSelected
                              ? 'bg-gradient-to-br from-cyan-950/80 to-blue-950/60 border-cyan-400 text-cyan-200 shadow-[0_0_15px_rgba(93,226,231,0.25)] ring-1 ring-cyan-400/50'
                              : 'bg-slate-900/90 border-white/10 text-slate-300 hover:bg-slate-800/80 hover:border-white/20'
                          }`}
                        >
                          <div className="flex items-center justify-between gap-2">
                            <span className="font-bold text-xs text-white">{v.name}</span>
                            <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-white/5 text-cyan-300 border border-white/10">
                              {v.badge}
                            </span>
                          </div>
                          <div className="text-[11px] text-slate-400 mt-1 leading-snug">{v.desc}</div>
                          {isSelected && (
                            <div className="text-[9px] font-bold text-cyan-400 mt-2 flex items-center gap-1">
                              <span>✓ Selected Voice</span>
                            </div>
                          )}
                        </button>
                      );
                    })}
                  </div>
                  <p className="text-[10px] text-slate-400 mt-2 bg-slate-900/50 p-2 rounded-lg border border-white/5">
                    💡 <strong>Smart Voice Playback:</strong> ElevenLabs Library voices (Viraj & Rudra) work directly with paid ElevenLabs API keys. If using a free key, the engine automatically falls back to George/Charlie multilingual AI voice so speech audio always plays reliably.
                  </p>
                </div>

                {/* Voice ID manual input / dynamic voice select */}
                <div>
                  <label className="text-xs text-slate-300 block mb-1">
                    Voice ID (ElevenLabs Identifier)
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={ttsSettings?.voiceId || ''}
                      onChange={e =>
                        setTtsSettings(prev => (prev ? { ...prev, voiceId: e.target.value } : null))
                      }
                      placeholder="e.g. 3AMU7jXQuQa3oRvRqUmb or vIdhHAZdn1bGjKe1dFw8"
                      className="flex-1 px-3 py-2 rounded-xl bg-slate-900 border border-white/10 text-xs text-white font-mono"
                    />
                    {ttsVoices.length > 0 && (
                      <select
                        value={ttsSettings?.voiceId || ''}
                        onChange={e => {
                          if (e.target.value) {
                            const found = ttsVoices.find(v => v.voice_id === e.target.value);
                            setTtsSettings(prev =>
                              prev
                                ? {
                                    ...prev,
                                    voiceId: e.target.value,
                                    voiceName: found?.name || prev.voiceName
                                  }
                                : null
                            );
                          }
                        }}
                        className="px-3 py-2 rounded-xl bg-slate-900 border border-white/10 text-xs text-slate-300 cursor-pointer"
                      >
                        <option value="">Choose voice ({ttsVoices.length} models)</option>
                        {ttsVoices.map(v => (
                          <option key={v.voice_id} value={v.voice_id}>
                            {v.name}
                          </option>
                        ))}
                      </select>
                    )}
                  </div>
                </div>

                {/* Voice Fine-Tuning Sliders */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-white/10">
                  <div>
                    <div className="flex justify-between text-xs text-slate-300 mb-1">
                      <span>Speech Speed</span>
                      <span className="font-mono text-cyan-400">
                        {ttsSettings?.voiceSettings?.speed || 1.0}x
                      </span>
                    </div>
                    <input
                      type="range"
                      min={0.7}
                      max={1.4}
                      step={0.05}
                      value={ttsSettings?.voiceSettings?.speed ?? 1.0}
                      onChange={e => {
                        const speed = parseFloat(e.target.value);
                        setTtsSettings(prev =>
                          prev
                            ? {
                                ...prev,
                                voiceSettings: { ...prev.voiceSettings, speed }
                              }
                            : null
                        );
                      }}
                      className="w-full accent-[#5DE2E7]"
                    />
                  </div>

                  <div>
                    <div className="flex justify-between text-xs text-slate-300 mb-1">
                      <span>Stability</span>
                      <span className="font-mono text-cyan-400">
                        {ttsSettings?.voiceSettings?.stability || 0.5}
                      </span>
                    </div>
                    <input
                      type="range"
                      min={0.0}
                      max={1.0}
                      step={0.05}
                      value={ttsSettings?.voiceSettings?.stability ?? 0.5}
                      onChange={e => {
                        const stability = parseFloat(e.target.value);
                        setTtsSettings(prev =>
                          prev
                            ? {
                                ...prev,
                                voiceSettings: { ...prev.voiceSettings, stability }
                              }
                            : null
                        );
                      }}
                      className="w-full accent-[#5DE2E7]"
                    />
                  </div>

                  <div>
                    <div className="flex justify-between text-xs text-slate-300 mb-1">
                      <span>Similarity Boost</span>
                      <span className="font-mono text-cyan-400">
                        {ttsSettings?.voiceSettings?.similarity_boost || 0.75}
                      </span>
                    </div>
                    <input
                      type="range"
                      min={0.0}
                      max={1.0}
                      step={0.05}
                      value={ttsSettings?.voiceSettings?.similarity_boost ?? 0.75}
                      onChange={e => {
                        const similarity_boost = parseFloat(e.target.value);
                        setTtsSettings(prev =>
                          prev
                            ? {
                                ...prev,
                                voiceSettings: { ...prev.voiceSettings, similarity_boost }
                              }
                            : null
                        );
                      }}
                      className="w-full accent-[#5DE2E7]"
                    />
                  </div>

                  <div>
                    <div className="flex justify-between text-xs text-slate-300 mb-1">
                      <span>Style Exaggeration</span>
                      <span className="font-mono text-cyan-400">
                        {ttsSettings?.voiceSettings?.style || 0.0}
                      </span>
                    </div>
                    <input
                      type="range"
                      min={0.0}
                      max={1.0}
                      step={0.05}
                      value={ttsSettings?.voiceSettings?.style ?? 0.0}
                      onChange={e => {
                        const style = parseFloat(e.target.value);
                        setTtsSettings(prev =>
                          prev
                            ? {
                                ...prev,
                                voiceSettings: { ...prev.voiceSettings, style }
                              }
                            : null
                        );
                      }}
                      className="w-full accent-[#5DE2E7]"
                    />
                  </div>
                </div>

                {/* Fallback & Safety Options */}
                <div className="pt-2 border-t border-white/10 space-y-2">
                  <label className="flex items-center gap-2 cursor-pointer text-xs text-slate-300">
                    <input
                      type="checkbox"
                      checked={ttsSettings?.fallbackToBrowserSpeech ?? true}
                      onChange={e =>
                        setTtsSettings(prev =>
                          prev ? { ...prev, fallbackToBrowserSpeech: e.target.checked } : null
                        )
                      }
                      className="w-4 h-4 accent-[#5DE2E7] rounded cursor-pointer"
                    />
                    <span>
                      <strong>Browser SpeechSynthesis Fallback:</strong> If ElevenLabs API quota is exceeded or unavailable, automatically play via local device speech.
                    </span>
                  </label>

                  <label className="flex items-center gap-2 cursor-pointer text-xs text-slate-300">
                    <input
                      type="checkbox"
                      checked={ttsSettings?.voiceSettings?.use_speaker_boost ?? true}
                      onChange={e =>
                        setTtsSettings(prev =>
                          prev
                            ? {
                                ...prev,
                                voiceSettings: {
                                  ...prev.voiceSettings,
                                  use_speaker_boost: e.target.checked
                                }
                              }
                            : null
                        )
                      }
                      className="w-4 h-4 accent-[#5DE2E7] rounded cursor-pointer"
                    />
                    <span>
                      <strong>Speaker Boost:</strong> Boost voice clarity and reduce background artifacts.
                    </span>
                  </label>
                </div>
              </div>
            </div>

            {/* Right Column: Live Testing Playground (5 cols) */}
            <div className="lg:col-span-5 space-y-6">
              <div className="p-5 rounded-3xl bg-slate-950/80 border border-white/10 space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Headphones className="w-4 h-4 text-cyan-400" />
                    <h4 className="text-sm font-black text-white">Voice Testing Playground</h4>
                  </div>
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-cyan-950 text-cyan-300 border border-cyan-800">
                    Live Preview
                  </span>
                </div>

                {/* Quick Presets */}
                <div>
                  <label className="text-[11px] font-bold text-slate-400 block mb-1.5 uppercase">
                    Preset Prompts
                  </label>
                  <div className="flex flex-wrap gap-1.5">
                    <button
                      type="button"
                      onClick={() =>
                        setTestSpeechText('OTL Live Support এ আপনাকে স্বাগতম! আমি কীভাবে আপনাকে সাহায্য করতে পারি?')
                      }
                      className="px-2.5 py-1 rounded-lg bg-white/5 hover:bg-white/10 text-cyan-300 border border-cyan-500/20 text-xs font-medium cursor-pointer transition"
                    >
                      🇧🇩 বাংলা (Bengali)
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        setTestSpeechText(
                          'Welcome to One Time Locker Support! All our premium apps and games are completely safe and free to download.'
                        )
                      }
                      className="px-2.5 py-1 rounded-lg bg-white/5 hover:bg-white/10 text-cyan-300 border border-cyan-500/20 text-xs font-medium cursor-pointer transition"
                    >
                      🇬🇧 English
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        setTestSpeechText(
                          'হ্যালো! আপনি কি CapCut Pro MOD APK ডাউনলোড করতে কোনো সমস্যা ফেস করছেন? লিংক চেক করে দিচ্ছি।'
                        )
                      }
                      className="px-2.5 py-1 rounded-lg bg-white/5 hover:bg-white/10 text-cyan-300 border border-cyan-500/20 text-xs font-medium cursor-pointer transition"
                    >
                      🌐 Mixed (Banglish)
                    </button>
                  </div>
                </div>

                {/* Textarea */}
                <div>
                  <label className="text-xs text-slate-300 block mb-1">
                    Text to Synthesize & Test
                  </label>
                  <textarea
                    rows={4}
                    value={testSpeechText}
                    onChange={e => setTestSpeechText(e.target.value)}
                    placeholder="Enter Bengali or English text to test pronunciation..."
                    className="w-full px-3 py-2.5 rounded-xl bg-slate-900 border border-white/10 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-400 leading-relaxed"
                  />
                  <div className="flex items-center justify-between text-[10px] text-slate-500 mt-1">
                    <span>{testSpeechText.length} characters</span>
                    <span>Markdown & emojis will be stripped automatically</span>
                  </div>
                </div>

                {/* Generate Button */}
                <button
                  id="admin-tts-synthesize-play-btn"
                  type="button"
                  onClick={handleGenerateTestSpeech}
                  disabled={isGeneratingTestSpeech || !testSpeechText.trim()}
                  className="w-full py-3 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white text-xs font-black transition cursor-pointer shadow-[0_0_20px_rgba(93,226,231,0.35)] disabled:opacity-50 flex items-center justify-center gap-2 active:scale-[0.99]"
                >
                  {isGeneratingTestSpeech ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin text-white" />
                      <span>Synthesizing Voice Audio...</span>
                    </>
                  ) : isPlayingTestAudio ? (
                    <>
                      <Volume2 className="w-4 h-4 text-white animate-pulse" />
                      <span>Playing Audio (Click to Re-synthesize)</span>
                    </>
                  ) : (
                    <>
                      <Play className="w-4 h-4 fill-white" />
                      <span>Synthesize & Play Audio</span>
                    </>
                  )}
                </button>

                {/* Inline Test Speech Feedback / Notice */}
                {testSpeechNotice && (
                  <div
                    className={`p-3 rounded-xl text-xs flex items-center gap-2.5 transition-all ${
                      testSpeechNotice.error
                        ? 'bg-rose-950/60 border border-rose-500/40 text-rose-200'
                        : 'bg-cyan-950/60 border border-cyan-500/40 text-cyan-200'
                    }`}
                  >
                    {testSpeechNotice.error ? (
                      <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
                    ) : (
                      <CheckCircle2 className="w-4 h-4 text-cyan-400 shrink-0" />
                    )}
                    <span className="flex-1 leading-snug">{testSpeechNotice.text}</span>
                    <button
                      type="button"
                      onClick={() => setTestSpeechNotice(null)}
                      className="text-slate-400 hover:text-white text-[10px] underline ml-1 cursor-pointer shrink-0"
                    >
                      Dismiss
                    </button>
                  </div>
                )}

                {/* Audio Result & Player */}
                {testSpeechAudio && (
                  <div className="p-4 rounded-2xl bg-slate-900/90 border border-cyan-500/40 shadow-xl space-y-3 text-xs">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2.5">
                        <button
                          type="button"
                          onClick={togglePlayTestAudio}
                          className="w-10 h-10 rounded-full bg-cyan-400 hover:bg-cyan-300 text-slate-950 flex items-center justify-center hover:scale-105 active:scale-95 transition cursor-pointer shadow-[0_0_15px_rgba(93,226,231,0.5)] shrink-0"
                          title={isPlayingTestAudio ? 'Pause' : 'Play'}
                        >
                          {isPlayingTestAudio ? (
                            <Pause className="w-4 h-4 fill-slate-950" />
                          ) : (
                            <Play className="w-4 h-4 fill-slate-950 ml-0.5" />
                          )}
                        </button>
                        <div>
                          <div className="text-xs font-bold text-white flex items-center gap-1.5 flex-wrap">
                            <span>Test Audio Ready</span>
                            {testSpeechAudio.cached && (
                              <span className="text-[9px] px-1.5 py-0.5 rounded bg-purple-500/20 text-purple-300 font-bold">
                                Cached
                              </span>
                            )}
                            {isPlayingTestAudio && (
                              <span className="text-[9px] px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300 font-bold animate-pulse">
                                Playing Now ♫
                              </span>
                            )}
                          </div>
                          <div className="text-[10px] text-slate-400 mt-0.5">
                            Language: <strong className="text-cyan-300 uppercase">{testSpeechAudio.detectedLanguage}</strong> • Latency: {testSpeechAudio.latencyMs}ms
                          </div>
                        </div>
                      </div>

                      <span className="text-[10px] font-mono text-cyan-400 bg-cyan-950/60 px-2 py-0.5 rounded-md border border-cyan-500/20">
                        {testSpeechAudio.characterCount} chars
                      </span>
                    </div>

                    {/* Native Audio Controls for 100% Reliable Playback */}
                    {testSpeechAudioUrl && (
                      <div className="pt-1">
                        <audio
                          controls
                          src={testSpeechAudioUrl}
                          className="w-full h-8 rounded-lg accent-cyan-400 focus:outline-none"
                          onPlay={() => setIsPlayingTestAudio(true)}
                          onPause={() => setIsPlayingTestAudio(false)}
                          onEnded={() => setIsPlayingTestAudio(false)}
                        />
                      </div>
                    )}

                    {/* Playing wave indicator */}
                    {isPlayingTestAudio && (
                      <div className="flex items-center gap-1.5 h-3 pt-1 justify-center">
                        <span className="w-1 h-2 bg-cyan-400 animate-pulse rounded-full" />
                        <span className="w-1 h-3.5 bg-cyan-400 animate-pulse delay-75 rounded-full" />
                        <span className="w-1 h-2.5 bg-cyan-400 animate-pulse delay-150 rounded-full" />
                        <span className="w-1 h-4 bg-cyan-400 animate-pulse delay-200 rounded-full" />
                        <span className="w-1 h-2 bg-cyan-400 animate-pulse delay-100 rounded-full" />
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
          TAB 4: AI RULES, PERSONALITY & HANDOFF CONFIG
          ========================================================================= */}
      {activeTab === 'settings' && aiSettings && (
        <div className="max-w-4xl space-y-5 bg-slate-950/80 p-6 rounded-3xl border border-white/10">
          <div className="flex items-center justify-between border-b border-white/10 pb-4">
            <div>
              <h3 className="text-base font-black text-white">AI Support Behavior & Guardrails</h3>
              <p className="text-xs text-slate-400">
                Define the assistant's persona, mandatory support instructions, and automated human handoff triggers.
              </p>
            </div>

            <button
              onClick={handleSaveSettings}
              disabled={isSavingSettings}
              className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 text-white font-black text-xs transition cursor-pointer shadow-[0_0_15px_rgba(93,226,231,0.4)] disabled:opacity-50"
            >
              {isSavingSettings ? 'Saving...' : 'Save AI Configuration'}
            </button>
          </div>

          {settingsSuccessNotice && (
            <div className="p-3 rounded-xl bg-emerald-950/40 border border-emerald-500/40 text-emerald-300 text-xs flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>{settingsSuccessNotice}</span>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-bold text-slate-300 block mb-1">Bot Name</label>
              <input
                type="text"
                value={aiSettings.botName}
                onChange={e => setAiSettings({ ...aiSettings, botName: e.target.value })}
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-white/10 text-xs text-white focus:outline-none focus:border-[#5DE2E7]"
              />
            </div>

            <div>
              <label className="text-xs font-bold text-slate-300 block mb-1">Max Retrieved RAG Chunks</label>
              <input
                type="number"
                min={1}
                max={10}
                value={aiSettings.maxRetrievedChunks}
                onChange={e => setAiSettings({ ...aiSettings, maxRetrievedChunks: Number(e.target.value) || 4 })}
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-white/10 text-xs text-white focus:outline-none focus:border-[#5DE2E7]"
              />
            </div>
          </div>

          <div>
            <label className="text-xs font-bold text-slate-300 block mb-1">Welcome Greeting Message</label>
            <textarea
              rows={2}
              value={aiSettings.welcomeMessage}
              onChange={e => setAiSettings({ ...aiSettings, welcomeMessage: e.target.value })}
              className="w-full px-3.5 py-2 rounded-xl bg-slate-900 border border-white/10 text-xs text-white focus:outline-none focus:border-[#5DE2E7]"
            />
          </div>

          <div>
            <label className="text-xs font-bold text-slate-300 block mb-1">System Instruction (Persona & Grounding)</label>
            <textarea
              rows={5}
              value={aiSettings.systemInstruction}
              onChange={e => setAiSettings({ ...aiSettings, systemInstruction: e.target.value })}
              className="w-full px-3.5 py-2 rounded-xl bg-slate-900 border border-white/10 text-xs text-white focus:outline-none focus:border-[#5DE2E7] font-mono leading-relaxed"
            />
          </div>

          <div>
            <label className="text-xs font-bold text-slate-300 block mb-1">Support Policies & Strict Operational Rules</label>
            <textarea
              rows={4}
              value={aiSettings.supportRules}
              onChange={e => setAiSettings({ ...aiSettings, supportRules: e.target.value })}
              className="w-full px-3.5 py-2 rounded-xl bg-slate-900 border border-white/10 text-xs text-white focus:outline-none focus:border-[#5DE2E7] font-mono leading-relaxed"
            />
          </div>

          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-xs font-bold text-slate-300">Human Handoff Trigger Keywords (Comma separated)</label>
              <label className="flex items-center gap-2 text-xs text-slate-400 cursor-pointer">
                <input
                  type="checkbox"
                  checked={aiSettings.enableHandoffKeywords}
                  onChange={e => setAiSettings({ ...aiSettings, enableHandoffKeywords: e.target.checked })}
                  className="rounded border-white/20 text-[#5DE2E7]"
                />
                <span>Enable automatic keyword escalation</span>
              </label>
            </div>
            <input
              type="text"
              value={aiSettings.handoffKeywords.join(', ')}
              onChange={e =>
                setAiSettings({
                  ...aiSettings,
                  handoffKeywords: e.target.value.split(',').map(s => s.trim()).filter(Boolean)
                })
              }
              className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-white/10 text-xs text-white focus:outline-none focus:border-[#5DE2E7]"
            />
          </div>
        </div>
      )}

      {/* Modal: Add/Edit Knowledge Entry */}
      {isDocModalOpen && editingDoc && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-xl bg-slate-900 border border-white/10 rounded-2xl p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-black text-white">Add Knowledge Document</h3>
              <button onClick={() => setIsDocModalOpen(false)} className="text-slate-400 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div>
              <label className="text-xs text-slate-300 block mb-1">Document Title</label>
              <input
                type="text"
                value={editingDoc.title || ''}
                onChange={e => setEditingDoc({ ...editingDoc, title: e.target.value })}
                placeholder="e.g. CapCut Pro 11.2 MOD APK Installation Guide"
                className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-white/10 text-xs text-white"
              />
            </div>

            <div>
              <label className="text-xs text-slate-300 block mb-1">Category</label>
              <input
                type="text"
                value={editingDoc.category || ''}
                onChange={e => setEditingDoc({ ...editingDoc, category: e.target.value })}
                placeholder="e.g. Video Editor / Android"
                className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-white/10 text-xs text-white"
              />
            </div>

            <div>
              <label className="text-xs text-slate-300 block mb-1">Content / Facts</label>
              <textarea
                rows={6}
                value={editingDoc.content || ''}
                onChange={e => setEditingDoc({ ...editingDoc, content: e.target.value })}
                placeholder="Write clear, factual statements that the AI will use to answer customer questions..."
                className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-white/10 text-xs text-white leading-relaxed"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setIsDocModalOpen(false)}
                className="px-4 py-2 rounded-xl bg-white/5 text-slate-300 text-xs font-bold"
              >
                Cancel
              </button>
              <button
                onClick={async () => {
                  if (!editingDoc.title || !editingDoc.content) return alert('Title and content are required');
                  await supportService.createKnowledgeDocument({
                    title: editingDoc.title,
                    category: editingDoc.category || 'General',
                    content: editingDoc.content
                  });
                  setIsDocModalOpen(false);
                  loadKnowledge();
                  loadStats();
                }}
                className="px-4 py-2 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 text-white text-xs font-black"
              >
                Save & Index
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Add/Edit AI Provider */}
      {isProviderModalOpen && editingProvider && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-xl bg-slate-900 border border-white/10 rounded-2xl p-6 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-black text-white">
                  {editingProvider.id ? 'Configure AI Provider & API Key' : 'Add Pluggable AI Provider'}
                </h3>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  Configure model names, custom endpoint URL, and secret API key.
                </p>
              </div>
              <button onClick={() => setIsProviderModalOpen(false)} className="text-slate-400 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-slate-300 block mb-1">Provider Name</label>
                <input
                  type="text"
                  value={editingProvider.name || ''}
                  onChange={e => setEditingProvider({ ...editingProvider, name: e.target.value })}
                  placeholder="e.g. Google Gemini or Groq Llama"
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-white/10 text-xs text-white"
                />
              </div>
              <div>
                <label className="text-xs text-slate-300 block mb-1">Provider Type</label>
                <select
                  value={editingProvider.type || 'gemini'}
                  onChange={e => {
                    const newType = e.target.value as any;
                    const defaultModel =
                      newType === 'gemini'
                        ? 'gemini-3.8-flash'
                        : newType === 'groq'
                        ? 'llama-3.3-70b-versatile'
                        : newType === 'grounded_knowledge'
                        ? 'grounded-kb-v2'
                        : 'gpt-4o-mini';
                    setEditingProvider({
                      ...editingProvider,
                      type: newType,
                      model: defaultModel,
                      visionModel: defaultModel
                    });
                  }}
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-white/10 text-xs text-white"
                >
                  <option value="gemini">Google Gemini</option>
                  <option value="groq">Groq Cloud (Llama)</option>
                  <option value="openai">OpenAI / Compatible API</option>
                  <option value="grounded_knowledge">OTL Grounded Knowledge (Offline / Zero-Key)</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-slate-300 block mb-1">Chat Model Name</label>
                <input
                  type="text"
                  value={editingProvider.model || ''}
                  onChange={e => setEditingProvider({ ...editingProvider, model: e.target.value })}
                  placeholder="e.g. qwen/qwen3.8-27b, gemini-3.8-flash, gpt-4o-mini"
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-white/10 text-xs text-white font-mono"
                />
              </div>
              <div>
                <label className="text-xs text-slate-300 block mb-1">Vision Model Name</label>
                <input
                  type="text"
                  value={editingProvider.visionModel || ''}
                  onChange={e => setEditingProvider({ ...editingProvider, visionModel: e.target.value })}
                  placeholder="e.g. qwen/qwen3.8-27b or gemini-3.8-flash"
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-white/10 text-xs text-white font-mono"
                />
              </div>
            </div>

            {editingProvider.type === 'openai' && (
              <div>
                <label className="text-xs text-slate-300 block mb-1">Base URL (For OpenAI / Custom)</label>
                <input
                  type="text"
                  value={editingProvider.baseUrl || ''}
                  onChange={e => setEditingProvider({ ...editingProvider, baseUrl: e.target.value })}
                  placeholder="https://api.openai.com/v1"
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-white/10 text-xs text-white font-mono"
                />
                <p className="text-[10px] text-slate-500 mt-1">
                  Supports OpenRouter (https://openrouter.ai/api/v1), DeepSeek, Together, vLLM, or Ollama.
                </p>
              </div>
            )}

            {/* Provider Key Guidance Callout */}
            {editingProvider.type === 'gemini' && (
              <div className="p-3 rounded-xl bg-blue-950/40 border border-blue-500/30 text-[11px] text-blue-200 space-y-1.5">
                <div className="font-bold flex items-center gap-1.5 text-cyan-300">
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Google Gemini Free API Key</span>
                </div>
                <p>
                  If you encounter a 403 (access denied) error, enter your personal Gemini API key created from Google AI Studio. It is completely free and supports <code>gemini-3.8-flash</code>:
                </p>
                <a
                  href="https://aistudio.google.com/apikey"
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1 text-[#5DE2E7] hover:underline font-bold"
                >
                  <ExternalLink className="w-3 h-3" />
                  <span>Get Free Key at aistudio.google.com/apikey</span>
                </a>
              </div>
            )}

            {editingProvider.type === 'groq' && (
              <div className="p-3 rounded-xl bg-purple-950/40 border border-purple-500/30 text-[11px] text-purple-200 space-y-1.5">
                <div className="font-bold flex items-center gap-1.5 text-purple-300">
                  <Zap className="w-3.5 h-3.5" />
                  <span>Groq Cloud Ultra-Fast Inference</span>
                </div>
                <p>
                  Groq provides free high-speed API keys for open weights models like <code>qwen/qwen3.8-27b</code>:
                </p>
                <a
                  href="https://console.groq.com/keys"
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1 text-[#5DE2E7] hover:underline font-bold"
                >
                  <ExternalLink className="w-3 h-3" />
                  <span>Get Free Key at console.groq.com/keys</span>
                </a>
              </div>
            )}

            {editingProvider.type === 'openai' && (
              <div className="p-3 rounded-xl bg-emerald-950/40 border border-emerald-500/30 text-[11px] text-emerald-200 space-y-1.5">
                <div className="font-bold flex items-center gap-1.5 text-emerald-300">
                  <Bot className="w-3.5 h-3.5" />
                  <span>OpenAI & OpenRouter API Keys</span>
                </div>
                <p>
                  Compatible with OpenAI (<code>gpt-4o-mini</code>) or OpenRouter (<code>https://openrouter.ai/api/v1</code>):
                </p>
                <a
                  href="https://openrouter.ai/keys"
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1 text-[#5DE2E7] hover:underline font-bold"
                >
                  <ExternalLink className="w-3 h-3" />
                  <span>Get OpenRouter API Key</span>
                </a>
              </div>
            )}

            {editingProvider.type === 'grounded_knowledge' && (
              <div className="p-3 rounded-xl bg-cyan-950/40 border border-cyan-500/30 text-[11px] text-cyan-200 space-y-1.5">
                <div className="font-bold flex items-center gap-1.5 text-cyan-300">
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>OTL Grounded Knowledge Engine (Zero-Key Required)</span>
                </div>
                <p>
                  Operates 100% locally using verified OTL documentation, rules, APK catalog, and Telegram delivery links. Completely immune to 403 / 429 quota limits.
                </p>
              </div>
            )}

            {editingProvider.type !== 'grounded_knowledge' && (
              <div>
                <label className="text-xs text-slate-300 block mb-1">
                  API Key
                  <span className="text-slate-500 ml-1 font-normal">
                    {editingProvider.type === 'gemini' && '(Free key from Google AI Studio)'}
                    {editingProvider.type === 'groq' && '(Free ultra-fast key from console.groq.com)'}
                    {editingProvider.type === 'openai' && '(OpenAI, OpenRouter or DeepSeek key)'}
                  </span>
                </label>
                <div className="relative">
                  <input
                    type={editingProviderShowSecret ? 'text' : 'password'}
                    value={editingProvider.apiKey || ''}
                    onChange={e => setEditingProvider({ ...editingProvider, apiKey: e.target.value })}
                    placeholder={editingProvider.type === 'gemini' ? 'AIzaSy...' : editingProvider.type === 'groq' ? 'gsk_...' : 'sk-...'}
                    className="w-full px-3 py-2 pr-10 rounded-xl bg-slate-950 border border-white/10 text-xs text-white font-mono placeholder:text-slate-600 focus:border-cyan-400 focus:outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => setEditingProviderShowSecret(!editingProviderShowSecret)}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white transition"
                    title={editingProviderShowSecret ? 'Hide secret' : 'Show secret'}
                  >
                    {editingProviderShowSecret ? <EyeOff className="w-4 h-4 text-cyan-400" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                {editingProvider.apiKey && !editingProvider.apiKey.includes('••••') ? (
                  <p className="text-[10px] text-emerald-400 mt-1 flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3" />
                    <span>API Key entered & active for this domain. Click Save to apply.</span>
                  </p>
                ) : (
                  <p className="text-[10px] text-slate-400 mt-1">
                    Enter your API key or leave empty to use server environment variables (<code>GEMINI_API_KEY</code>, <code>GROQ_API_KEY</code>).
                  </p>
                )}
              </div>
            )}

            <div className="flex items-center gap-6">
              <label className="flex items-center gap-2 text-xs text-slate-300 cursor-pointer">
                <input
                  type="checkbox"
                  checked={editingProvider.enabled !== false}
                  onChange={e => setEditingProvider({ ...editingProvider, enabled: e.target.checked })}
                  className="rounded border-white/20 text-[#5DE2E7]"
                />
                <span>Enabled</span>
              </label>

              <label className="flex items-center gap-2 text-xs text-slate-300 cursor-pointer">
                <input
                  type="checkbox"
                  checked={editingProvider.isFallback || false}
                  onChange={e => setEditingProvider({ ...editingProvider, isFallback: e.target.checked })}
                  className="rounded border-white/20 text-[#5DE2E7]"
                />
                <span>Set as Backup / Fallback provider</span>
              </label>
            </div>

            {/* In-Modal Test Result Box */}
            {modalTestResult && (
              <div
                className={`p-3 rounded-xl text-xs border ${
                  modalTestResult.success
                    ? 'bg-emerald-950/40 border-emerald-500/40 text-emerald-300'
                    : 'bg-red-950/40 border-red-500/40 text-red-300'
                }`}
              >
                {modalTestResult.message}
              </div>
            )}

            <div className="flex items-center justify-between pt-3 border-t border-white/10">
              <button
                type="button"
                onClick={async () => {
                  if (!editingProvider.type || !editingProvider.model) {
                    setModalTestResult({ success: false, message: 'Please enter provider type and model name first.' });
                    return;
                  }
                  try {
                    setIsTestingModalConfig(true);
                    setModalTestResult(null);
                    const res = await supportService.testAIProviderConfig(editingProvider);
                    setModalTestResult({
                      success: res.success,
                      message: res.message
                    });
                  } catch (err: any) {
                    setModalTestResult({
                      success: false,
                      message: err.message || 'Connection test failed.'
                    });
                  } finally {
                    setIsTestingModalConfig(false);
                  }
                }}
                disabled={isTestingModalConfig}
                className="px-3.5 py-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-cyan-300 hover:text-white text-xs font-bold transition flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isTestingModalConfig ? 'animate-spin' : ''}`} />
                <span>{isTestingModalConfig ? 'Testing...' : 'Test Connection'}</span>
              </button>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => setIsProviderModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-white/5 text-slate-300 text-xs font-bold hover:bg-white/10 transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  onClick={async () => {
                    if (!editingProvider.name || !editingProvider.model) {
                      setModalTestResult({ success: false, message: 'Provider Name and Model are required.' });
                      return;
                    }
                    try {
                      const cleanKey = (editingProvider.apiKey || '').trim();
                      if (editingProvider.id && cleanKey && !cleanKey.includes('••••')) {
                        try {
                          localStorage.setItem(`otl_secret_ai_${editingProvider.id}`, cleanKey);
                        } catch {}
                      }

                      if (editingProvider.id) {
                        await supportService.updateAIProvider(editingProvider.id, editingProvider);
                        setProviderNotice({ text: `Provider "${editingProvider.name}" updated successfully and active for this domain!` });
                      } else {
                        const created = await supportService.createAIProvider(editingProvider);
                        if (created.id && cleanKey && !cleanKey.includes('••••')) {
                          try {
                            localStorage.setItem(`otl_secret_ai_${created.id}`, cleanKey);
                          } catch {}
                        }
                        setProviderNotice({ text: `Provider "${editingProvider.name}" created and API key saved for this domain!` });
                      }
                      setIsProviderModalOpen(false);
                      await loadProviders();
                      await loadStats();
                    } catch (err: any) {
                      setProviderNotice({ text: `Provider "${editingProvider.name}" saved locally for this domain.` });
                      setIsProviderModalOpen(false);
                      await loadProviders();
                    }
                  }}
                  className="px-4 py-2 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 text-white text-xs font-black hover:opacity-90 transition cursor-pointer"
                >
                  Save Provider
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Add ElevenLabs API Key */}
      {isAddKeyModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-slate-900 border border-white/10 rounded-2xl p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <div className="flex items-center gap-2">
                <Key className="w-4 h-4 text-cyan-400" />
                <h3 className="text-sm font-black text-white">Add ElevenLabs API Key</h3>
              </div>
              <button
                onClick={() => setIsAddKeyModalOpen(false)}
                className="text-slate-400 hover:text-white transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div>
              <label className="text-xs text-slate-300 block mb-1 font-semibold">
                Key Label (Optional)
              </label>
              <input
                type="text"
                value={newKeyLabel}
                onChange={e => setNewKeyLabel(e.target.value)}
                placeholder="e.g. Primary Key, Backup Account, Creator Tier"
                className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-white/10 text-xs text-white placeholder:text-slate-600 focus:border-cyan-400 focus:outline-none"
              />
            </div>

            <div>
              <label className="text-xs text-slate-300 block mb-1 font-semibold">
                API Key <span className="text-rose-400">*</span>
              </label>
              <div className="relative">
                <input
                  type={newKeyShowSecret ? 'text' : 'password'}
                  value={newKeyInput}
                  onChange={e => setNewKeyInput(e.target.value)}
                  placeholder="xi-... or sk_..."
                  className="w-full pl-3 pr-10 py-2 rounded-xl bg-slate-950 border border-white/10 text-xs text-white font-mono placeholder:text-slate-600 focus:border-cyan-400 focus:outline-none"
                />
                <button
                  type="button"
                  onClick={() => setNewKeyShowSecret(!newKeyShowSecret)}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white transition"
                  title={newKeyShowSecret ? 'Hide key' : 'Show key'}
                >
                  {newKeyShowSecret ? <EyeOff className="w-4 h-4 text-amber-400" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              <p className="text-[10px] text-slate-500 mt-1">
                Keys are encrypted server-side and automatically checked for quota/model access.
              </p>
            </div>

            <div>
              <label className="text-xs text-slate-300 block mb-1 font-semibold">
                Priority Order (Lower runs first)
              </label>
              <input
                type="number"
                min="1"
                max="99"
                value={newKeyPriority}
                onChange={e => setNewKeyPriority(parseInt(e.target.value, 10) || 1)}
                className="w-24 px-3 py-2 rounded-xl bg-slate-950 border border-white/10 text-xs text-white font-mono focus:border-cyan-400 focus:outline-none"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-white/10">
              <button
                type="button"
                onClick={() => setIsAddKeyModalOpen(false)}
                className="px-4 py-2 rounded-xl bg-white/5 text-slate-300 text-xs font-bold hover:bg-white/10 transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleAddKey}
                disabled={isAddingKey || !newKeyInput.trim()}
                className="px-4 py-2 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 text-white text-xs font-bold hover:from-cyan-400 hover:to-blue-500 transition cursor-pointer disabled:opacity-50 flex items-center gap-1.5"
              >
                {isAddingKey ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />}
                <span>Save Key</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Edit ElevenLabs API Key */}
      {editingKey && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-slate-900 border border-white/10 rounded-2xl p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <div className="flex items-center gap-2">
                <Edit3 className="w-4 h-4 text-blue-400" />
                <h3 className="text-sm font-black text-white">Edit ElevenLabs API Key</h3>
              </div>
              <button
                onClick={() => setEditingKey(null)}
                className="text-slate-400 hover:text-white transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div>
              <label className="text-xs text-slate-300 block mb-1 font-semibold">
                Key Label
              </label>
              <input
                type="text"
                value={editKeyLabel}
                onChange={e => setEditKeyLabel(e.target.value)}
                placeholder="e.g. Primary Key"
                className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-white/10 text-xs text-white placeholder:text-slate-600 focus:border-cyan-400 focus:outline-none"
              />
            </div>

            <div>
              <label className="text-xs text-slate-300 block mb-1 font-semibold">
                Replace Secret Key (Optional)
              </label>
              <div className="relative">
                <input
                  type={editKeyShowSecret ? 'text' : 'password'}
                  value={editKeyInput}
                  onChange={e => setEditKeyInput(e.target.value)}
                  placeholder={`Current: ${editingKey.maskedKey} (leave empty to keep)`}
                  className="w-full pl-3 pr-10 py-2 rounded-xl bg-slate-950 border border-white/10 text-xs text-white font-mono placeholder:text-slate-600 focus:border-cyan-400 focus:outline-none"
                />
                <button
                  type="button"
                  onClick={() => setEditKeyShowSecret(!editKeyShowSecret)}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white transition"
                  title={editKeyShowSecret ? 'Hide key' : 'Show key'}
                >
                  {editKeyShowSecret ? <EyeOff className="w-4 h-4 text-amber-400" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              <p className="text-[10px] text-slate-500 mt-1">
                Enter a new API key to replace the existing one, or leave blank to only update label/priority.
              </p>
            </div>

            <div>
              <label className="text-xs text-slate-300 block mb-1 font-semibold">
                Priority Order
              </label>
              <input
                type="number"
                min="1"
                max="99"
                value={editKeyPriority}
                onChange={e => setEditKeyPriority(parseInt(e.target.value, 10) || 1)}
                className="w-24 px-3 py-2 rounded-xl bg-slate-950 border border-white/10 text-xs text-white font-mono focus:border-cyan-400 focus:outline-none"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-white/10">
              <button
                type="button"
                onClick={() => setEditingKey(null)}
                className="px-4 py-2 rounded-xl bg-white/5 text-slate-300 text-xs font-bold hover:bg-white/10 transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveEditKey}
                disabled={isSavingKeyEdit}
                className="px-4 py-2 rounded-xl bg-gradient-to-r from-blue-500 to-indigo-600 text-white text-xs font-bold hover:from-blue-400 hover:to-indigo-500 transition cursor-pointer disabled:opacity-50 flex items-center gap-1.5"
              >
                {isSavingKeyEdit && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
                <span>Save Changes</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Delete API Key Confirmation with Last-Key Protection */}
      {deleteCandidate && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-slate-900 border border-white/10 rounded-2xl p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <div className="flex items-center gap-2">
                {deleteRequiresConfirmation ? (
                  <ShieldAlert className="w-5 h-5 text-amber-400" />
                ) : (
                  <Trash2 className="w-4 h-4 text-rose-400" />
                )}
                <h3 className="text-sm font-black text-white">
                  {deleteRequiresConfirmation ? 'Last Active Key Warning' : 'Delete ElevenLabs API Key'}
                </h3>
              </div>
              <button
                onClick={() => {
                  setDeleteCandidate(null);
                  setDeleteWarningMessage(null);
                }}
                className="text-slate-400 hover:text-white transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-2">
              <p className="text-xs text-slate-300">
                {deleteRequiresConfirmation ? (
                  <span className="text-amber-300 font-semibold block leading-relaxed">
                    This is the last configured ElevenLabs API key. Deleting it will disable ElevenLabs voice features until a new API key is added.
                  </span>
                ) : (
                  <span>Are you sure you want to delete this ElevenLabs API key?</span>
                )}
              </p>
              <div className="p-3 rounded-xl bg-slate-950 border border-white/10 flex items-center gap-2 font-mono text-xs text-slate-300">
                <Key className="w-3.5 h-3.5 text-slate-500" />
                <span>{deleteCandidate.label || deleteCandidate.id}</span>
                <span className="text-slate-500">({deleteCandidate.maskedKey})</span>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-white/10">
              <button
                type="button"
                onClick={() => {
                  setDeleteCandidate(null);
                  setDeleteWarningMessage(null);
                }}
                className="px-4 py-2 rounded-xl bg-white/5 text-slate-300 text-xs font-bold hover:bg-white/10 transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmDeleteKey}
                disabled={isDeletingKey}
                className={`px-4 py-2 rounded-xl text-white text-xs font-bold transition cursor-pointer disabled:opacity-50 flex items-center gap-1.5 ${
                  deleteRequiresConfirmation
                    ? 'bg-amber-600 hover:bg-amber-500'
                    : 'bg-rose-600 hover:bg-rose-500'
                }`}
              >
                {isDeletingKey && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
                <span>{deleteRequiresConfirmation ? 'Delete Anyway' : 'Delete'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Zoom for Screenshots */}
      {zoomedImage && (
        <div
          onClick={() => setZoomedImage(null)}
          className="fixed inset-0 z-[10000] bg-slate-950/90 backdrop-blur-md flex items-center justify-center p-4 cursor-zoom-out"
        >
          <div className="relative max-w-4xl max-h-[90vh] overflow-hidden rounded-2xl border border-white/20">
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
        </div>
      )}
    </div>
  );
};
