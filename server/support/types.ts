export type ConversationStatus = 'ai_handling' | 'waiting_human' | 'human_handling' | 'resolved' | 'closed';

export type SenderType = 'user' | 'guest' | 'ai' | 'admin' | 'system';

export type AIProviderType = 'gemini' | 'groq' | 'openai' | 'grounded_knowledge';

export interface SupportAttachment {
  url: string;
  type: string; // 'image/png' | 'image/jpeg' | 'image/webp'
  name: string;
  size?: number;
  attachmentId?: string;
  storagePath?: string;
  createdAt?: string;
}

export interface SupportProductCard {
  id: string;
  title: string;
  price?: string;
  isFree?: boolean;
  status?: string;
  fileSize?: string;
  version?: string;
  thumbnail?: string;
  telegramUrl?: string;
  downloadUrl?: string;
  category?: string;
}

export interface SupportMessage {
  id: string;
  conversationId: string;
  senderType: SenderType;
  senderId: string;
  senderName: string;
  content: string;
  attachment?: SupportAttachment;
  attachments?: SupportAttachment[];
  productCard?: SupportProductCard;
  provider?: string;
  model?: string;
  ragSources?: {
    id: string;
    title: string;
    category?: string;
    score?: number;
    sourceType?: string;
    url?: string;
    snippet?: string;
  }[];
  createdAt: string;
}

export interface SupportConversation {
  id: string;
  title?: string;
  guestId?: string;
  userId?: string;
  userEmail?: string;
  userName: string;
  userAvatar?: string;
  status: ConversationStatus;
  assignedAdmin?: string;
  lastMessage: string;
  lastMessageAt: string;
  unreadCount: number; // unread for user/guest
  unreadAdminCount: number; // unread for admin
  createdAt: string;
  updatedAt: string;
  pageUrl?: string;
  userAgent?: string;
}

export interface AIProviderConfig {
  id: string;
  name: string;
  type: AIProviderType;
  model: string;
  visionModel?: string;
  apiKey?: string;
  baseUrl?: string;
  temperature: number;
  maxOutputTokens: number;
  enabled: boolean;
  isActive: boolean;
  isFallback: boolean;
  updatedAt: string;
}

export interface KnowledgeDocument {
  id: string;
  sourceType: 'product' | 'category' | 'faq' | 'policy' | 'page' | 'custom';
  sourceId: string;
  title: string;
  category: string;
  content: string;
  chunksCount: number;
  contentHash: string;
  url?: string;
  metadata?: {
    slug?: string;
    version?: string;
    fileSize?: string;
    price?: string;
    discountPrice?: string;
    downloadUrl?: string;
    telegramUrl?: string;
    demoUrl?: string;
    tags?: string[];
    isFeatured?: boolean;
    requirements?: string;
    packageName?: string;
    modInfo?: string;
    status?: string;
    isPublished?: boolean;
  };
  updatedAt: string;
  syncStatus?: 'synced' | 'pending' | 'failed' | 'inactive';
  syncError?: string | null;
  syncVersion?: number;
  retryCount?: number;
  lastIndexedAt?: string;
}

export interface KnowledgeChunk {
  id: string;
  documentId: string;
  sourceType: string;
  title: string;
  category: string;
  text: string;
  tokenEstimate: number;
  url?: string;
  embedding?: number[];
}

export interface WebsiteSyncStatus {
  lastSyncTime: string;
  totalProducts: number;
  totalPages: number;
  totalFaqs: number;
  totalPolicies: number;
  totalChunks: number;
  failedItems: string[];
  status: 'synced' | 'syncing' | 'error';
  errorMessage?: string;
  pendingRetries?: number;
  indexedBreakdown?: {
    products: number;
    pages: number;
    faqs: number;
    categories: number;
    custom: number;
  };
}

export interface AISettings {
  botName: string;
  personality: string;
  welcomeMessage: string;
  systemInstruction: string;
  supportRules: string;
  enableHandoffKeywords: boolean;
  handoffKeywords: string[];
  maxRetrievedChunks: number;
  relevanceThreshold: number;
  enableVision: boolean;
  enableFallback: boolean;
  rateLimitPerMinute: number;
}

export interface SupportStats {
  totalConversations: number;
  activeAiHandling: number;
  waitingForHuman: number;
  humanHandling: number;
  resolvedCount: number;
  totalMessages: number;
  totalKnowledgeDocs: number;
  totalKnowledgeChunks: number;
  activeProviderName: string;
  totalReports?: number;
  openReports?: number;
  waitingAdminReports?: number;
  resolvedReports?: number;
}

export type SupportReportCategory =
  | 'auth_login'
  | 'registration'
  | 'otp'
  | 'password'
  | 'google_auth'
  | 'download'
  | 'payment_billing'
  | 'technical'
  | 'account'
  | 'other';

export type SupportReportPriority = 'low' | 'medium' | 'high' | 'urgent';

export type SupportReportStatus =
  | 'open'
  | 'ai_investigating'
  | 'waiting_for_user'
  | 'waiting_for_admin'
  | 'admin_handling'
  | 'resolved'
  | 'closed';

export interface ReportInternalNote {
  id: string;
  adminEmail: string;
  note: string;
  createdAt: string;
}

export interface SupportReport {
  id: string; // e.g. R-1045
  conversationId: string;
  userId?: string;
  guestId?: string;
  userName?: string;
  userEmail?: string;
  title: string;
  description: string;
  aiAnalysis?: {
    summary: string;
    category: string;
    suspectedCause?: string;
    attemptedSteps?: string[];
    suggestedAction?: string;
  };
  category: SupportReportCategory;
  priority: SupportReportPriority;
  status: SupportReportStatus;
  assignedAdminId?: string;
  assignedAdminEmail?: string;
  assignedAdminName?: string;
  sourceMessageIds?: string[];
  attachments?: SupportAttachment[];
  resolutionMessage?: string;
  internalNotes?: ReportInternalNote[];
  resolvedAt?: string;
  closedAt?: string;
  reopenedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface TTSApiKeyEntry {
  id: string;
  label: string;
  key: string;
  maskedKey: string;
  enabled: boolean;
  status: 'available' | 'quota_exhausted' | 'rate_limited' | 'invalid' | 'cooldown' | 'disabled';
  lastTestedAt?: string;
  lastUsedAt?: string;
  lastError?: string;
  tier?: string;
  characterCount?: number;
  characterLimit?: number;
  remainingCharacters?: number;
  exhaustedAt?: number;
  priority: number;
  createdAt: string;
  updatedAt: string;
}

export interface TTSApiKeyPublicEntry {
  id: string;
  label: string;
  maskedKey: string;
  enabled: boolean;
  status: 'available' | 'quota_exhausted' | 'rate_limited' | 'invalid' | 'cooldown' | 'disabled';
  lastTestedAt?: string;
  lastUsedAt?: string;
  lastError?: string;
  tier?: string;
  characterCount?: number;
  characterLimit?: number;
  remainingCharacters?: number;
  priority: number;
  createdAt: string;
  updatedAt: string;
}

export interface TTSSettings {
  enabled: boolean;
  provider: 'elevenlabs' | 'browser';
  modelId: string; // default: 'eleven_v3'
  voiceId: string; // e.g. 'pNInz6obpgDQGcFmaJgB'
  voiceName?: string;
  outputFormat: string; // 'mp3_44100_128'
  language: 'auto' | 'bn' | 'en' | 'mixed';
  speed: number; // 0.7 - 1.3
  stability: number; // 0.0 - 1.0
  similarity: number; // 0.0 - 1.0
  style: number; // 0.0 - 1.0
  useSpeakerBoost: boolean;
  maxCharacters: number;
  enableCaching: boolean;
  browserFallback: boolean;
  apiKeyConfigured?: boolean;
  customApiKey?: string;
  apiKeyPool?: TTSApiKeyEntry[];
}

export interface TTSStats {
  totalRequests: number;
  successfulGenerations: number;
  failedGenerations: number;
  cachedPlays: number;
  totalCharactersSynthesized: number;
  lastUsedAt?: string;
  lastVoiceId?: string;
  lastModelId?: string;
}

export interface TTSVoiceOption {
  voice_id: string;
  name: string;
  category?: string;
  description?: string;
  preview_url?: string;
  labels?: Record<string, string>;
  isBengaliCapable?: boolean;
}
