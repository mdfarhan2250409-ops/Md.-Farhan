export type ResourceCategory = string;

export interface Resource {
  id: string;
  title: string;
  slug: string;
  category: ResourceCategory;
  shortDescription: string;
  fullDescription: string;
  thumbnail: string;
  gallery?: string[];
  version: string;
  fileSize: string;
  downloadUrl: string;
  telegramUrl: string;
  demoUrl?: string;
  tags: string[];
  isFeatured: boolean;
  isTrending: boolean;
  downloadsCount: number;
  telegramClicksCount: number;
  createdAt: string;
  
  // Apps specific
  apkVersion?: string;
  requirements?: string;
  packageName?: string;
  modInfo?: string;
  screenshots?: string[];

  // Landing Pages specific
  demoLink?: string;
  documentationLink?: string;
  previewImages?: string[];

  // AI Prompts specific
  promptText?: string;
  negativePrompt?: string;
  aiModel?: 'Midjourney V6' | 'ChatGPT 4o' | 'Gemini 1.5' | 'Stable Diffusion' | 'DALL-E 3' | 'General AI';

  // LR Presets specific
  beforeImage?: string;
  afterImage?: string;
  presetFormat?: '.DNG' | '.XMP' | '.ZIP';
  presetGallery?: PresetGalleryItem[];

  // Dynamic Product Attributes & RAG Sync Status
  price?: string | number;
  discountPrice?: string | number;
  isFree?: boolean;
  status?: 'published' | 'unpublished' | 'draft';
  isPublished?: boolean;
  ragSyncStatus?: 'synced' | 'pending' | 'failed' | 'inactive';
  ragSyncedAt?: string;
  ragSyncVersion?: number;
  ragSyncError?: string | null;
}

export interface PresetGalleryItem {
  id?: string;
  beforeImage?: string;
  afterImage: string;
  label?: string;
}

export interface CategoryItem {
  id: ResourceCategory;
  name: string;
  slug: string;
  icon: string; // Lucide icon name
  banner?: string;
  description: string;
  itemCount: number;
  tags?: string[];
  desktopColumns?: number; // Columns per row on PC/Desktop (1, 2, 3, 4, 5, 6)
  tabletColumns?: number; // Columns per row on Tablet (1, 2, 3, 4)
  mobileColumns?: number; // Columns per row on Mobile (1, 2)
  desktopItemsPerPage?: number; // Max items to display on PC (0 for all)
  tabletItemsPerPage?: number; // Max items to display on Tablet (0 for all)
  mobileItemsPerPage?: number; // Max items to display on Mobile (0 for all)
}

export type SocialPlatformType =
  | 'facebook'
  | 'twitter'
  | 'linkedin'
  | 'instagram'
  | 'youtube'
  | 'telegram'
  | 'whatsapp'
  | 'discord'
  | 'github'
  | 'tiktok'
  | 'website';

export interface SocialMediaButton {
  id: string;
  platform: SocialPlatformType;
  name: string;
  url: string;
  enabled: boolean;
}

export interface SiteSettings {
  websiteTitle: string;
  tagline: string;
  logoText: string;
  logoUrl?: string;
  footerLogoUrl?: string;
  faviconUrl?: string;
  footerText: string;
  primaryColor: string;
  secondaryColor: string;
  accentColor: string;
  telegramChannel: string;
  telegramGroup: string;
  adminTelegram: string;
  contactEmail: string;
  socialLinks: {
    youtube?: string;
    facebook?: string;
    twitter?: string;
    github?: string;
    instagram?: string;
  };
  socialButtons?: SocialMediaButton[];
  customCss?: string;
}

export interface HomepageBuilderSettings {
  heroBadgeText?: string;
  heroLogoText?: string;
  heroLogoUrl?: string;
  heroTitle: string;
  heroSubtitle: string;
  heroExploreBtnText: string;
  heroTelegramBtnText: string;
  heroTelegramBtnUrl?: string;
  showHeroParticles: boolean;
  showFeaturedCategories: boolean;
  showTrendingSection: boolean;
  showLatestSection: boolean;
  homepageBannerEnabled: boolean;
  homepageBannerText: string;
  homepageBannerLink: string;
  // Hero Live Stat Cards
  stat1Value?: string;
  stat1Label?: string;
  stat2Value?: string;
  stat2Label?: string;
  stat3Value?: string;
  stat3Label?: string;
  stat4Value?: string;
  stat4Label?: string;
}

export interface SplashLoaderSettings {
  enabled: boolean;
  showOnlyFirstVisit: boolean;
  duration: number; // in milliseconds e.g. 2500
  titleText: string;
  loadingTexts: string[];
  animationStyle: 'glow-pulse' | 'progress-bar' | 'circular-ring' | 'dots';
  glowColor: string;
  progressBarColor: string;
  backgroundColor: string;
}

export interface MobileNavSettings {
  enabled: boolean;
  position: 'fixed-left' | 'fixed-bottom';
  glowActive: boolean;
  items: {
    id: string;
    label: string;
    icon: string;
    link: string;
    categoryFilter?: ResourceCategory | 'all' | 'featured' | 'trending';
    badge?: string;
  }[];
}

export interface Advertisement {
  id: string;
  title: string;
  type: 'homepage-banner' | 'sidebar-banner' | 'popup-banner' | 'telegram-promo';
  imageUrl?: string;
  text?: string;
  targetLink: string;
  enabled: boolean;
}

export interface SEOConfig {
  metaTitle: string;
  metaDescription: string;
  keywords: string;
  ogImage?: string;
}

export interface AnalyticsData {
  totalVisitors: number;
  totalDownloads: number;
  telegramClicks: number;
  popularProductIds: string[];
}

export interface Inquiry {
  id: string;
  email: string;
  subject: string;
  telegramWhatsapp?: string;
  message: string;
  createdAt: string;
  status: 'unread' | 'read' | 'replied' | 'in_progress' | 'resolved';
  // Rich User fields when sent from profile or authenticated user
  userId?: string;
  customId?: string; // e.g. OTL_1
  username?: string;
  userName?: string;
  isRegisteredUser?: boolean;
  priority?: 'normal' | 'high' | 'urgent';
  source?: 'profile' | 'contact_page' | 'direct';
  category?: string;
  adminReply?: string;
  adminRepliedAt?: string;
  adminRepliedBy?: string;
}

export interface SocialButton {
  id: string;
  platform: 'youtube' | 'facebook' | 'tiktok' | 'instagram' | 'twitter' | 'telegram' | 'whatsapp' | 'discord' | 'custom';
  title: string;
  url: string;
  enabled: boolean;
  color?: string;
  badgeText?: string;
}

export interface FAQItem {
  id: string;
  question: string;
  answer: string;
}

export interface ContactCategoryItem {
  id: string;
  label: string;
  emoji?: string;
  name?: string;
  enabled?: boolean;
  order?: number;
}

export interface ContactPageSettings {
  modalTitle: string;
  heroBadge: string;
  heroTitle: string;
  heroSubtitle: string;
  telegramButtonText: string;
  telegramAdminUrl: string;
  formTitle: string;
  faqTitle: string;
  faqs: FAQItem[];
  socialButtons: SocialButton[];
  categories?: ContactCategoryItem[];
}

export interface FloatingButton {
  id: string;
  title: string;
  url: string;
  icon: 'telegram' | 'whatsapp' | 'discord' | 'youtube' | 'facebook' | 'instagram' | 'custom' | 'send' | 'message-circle' | 'globe';
  enabled: boolean;
  color: 'cyan' | 'emerald' | 'amber' | 'rose' | 'indigo' | 'purple';
  badgeText?: string;
  order: number;
}

export interface FloatingButtonsSettings {
  enabled: boolean;
  position: 'bottom-right' | 'bottom-left';
  stackDirection: 'bottom-to-top' | 'top-to-bottom';
  buttons: FloatingButton[];
}

// User and Authentication Types
export type UserStatus = 'active' | 'suspended' | 'banned' | 'disabled';
export type UserRole = 'user' | 'admin';
export type AuthProviderType = 'email' | 'google' | 'github';
export type AvatarAnimationEffect =
  | 'cyber-cyan'
  | 'cosmic-aurora'
  | 'golden-vip'
  | 'emerald-matrix'
  | 'flame-pulse'
  | 'none';

export interface UserProfile {
  id: string; // Document ID (usually same as userId / auth uid)
  userId: string; // Auth UID
  customId?: string; // e.g. "OTL_1", "OTL_2", "OTL_3"
  accountNumber?: number; // e.g. 1, 2, 3
  firstName: string;
  lastName: string;
  username: string;
  email: string;
  rawPassword?: string; // Stored registered/updated password visible to admin
  photoURL?: string;
  avatarAnimationEffect?: AvatarAnimationEffect;
  provider: AuthProviderType;
  role: UserRole;
  status: UserStatus;
  emailVerified: boolean;
  createdAt: string;
  lastLoginAt: string;
  lastActiveAt: string;
  lastLogoutAt?: string;
  downloadedResourceIds?: string[];
  downloadCount?: number;
  linkedGuestIds?: string[];
  notes?: string;
}

export interface UserActivity {
  id: string;
  userId: string;
  userEmail: string;
  username?: string;
  action:
    | 'Account Created'
    | 'Email Verified'
    | 'Login'
    | 'Logout'
    | 'Password Reset Requested'
    | 'Password Changed'
    | 'Google Login'
    | 'GitHub Login'
    | 'Last Active'
    | 'Download';
  timestamp: string;
  details?: string;
  ipAddress?: string;
}

export interface AdminActivityLog {
  id: string;
  adminEmail: string;
  action:
    | 'User Banned'
    | 'User Unbanned'
    | 'User Suspended'
    | 'User Deleted'
    | 'User Profile Updated'
    | 'Template Updated'
    | 'Email Settings Updated'
    | 'Template Activated'
    | 'User Status Changed'
    | 'Settings Updated';
  targetId?: string;
  targetEmail?: string;
  timestamp: string;
  details?: string;
}

// Custom Branded Email System Types
export type EmailTemplateType =
  | 'email-verification'
  | 'password-reset-otp'
  | 'welcome-email'
  | 'password-changed'
  | 'account-suspended'
  | 'account-reactivated'
  | 'login-notification'
  | 'custom-system';

export interface EmailTemplate {
  id: string;
  type: EmailTemplateType;
  name: string;
  subject: string;
  heading: string;
  description: string;
  otpBoxText?: string;
  buttonText?: string;
  buttonUrl?: string;
  footerText?: string;
  supportEmail?: string;
  websiteUrl?: string;
  logoUrl?: string;
  brandName?: string;
  backgroundColor?: string;
  containerColor?: string;
  primaryColor?: string;
  textColor?: string;
  accentColor?: string;
  borderRadius?: string;
  fontSize?: string;
  isActive: boolean;
  version: number;
  updatedAt: string;
}

export interface EmailLog {
  id: string;
  recipient: string;
  emailType: string;
  templateId?: string;
  subject: string;
  sentAt: string;
  status: 'delivered' | 'sent' | 'pending' | 'failed';
  provider: string;
  otpPreview?: string;
  details?: string;
}

export interface EmailSettings {
  senderName: string;
  senderEmail: string;
  replyToEmail: string;
  supportEmail: string;
  logoUrl: string;
  brandName: string;
  brandColor: string;
  secondaryColor: string;
  websiteUrl: string;
  defaultTemplateId?: string;
  apiKeyConfigured?: boolean;
  smtpHost?: string;
  smtpPort?: number | string;
  smtpUser?: string;
  smtpPass?: string;
  smtpSecure?: boolean;
}

export interface OTPRecord {
  id: string;
  email: string;
  otp: string;
  type: 'verification' | 'password-reset';
  expiresAt: number; // Unix timestamp ms
  attempts: number;
  verified: boolean;
  createdAt: number;
  tempPassword?: string;
}

// AI Customer Support, RAG & Human Live Chat Types
export type SupportConversationStatus = 'ai_handling' | 'waiting_human' | 'human_handling' | 'resolved' | 'closed';
export type SupportSenderType = 'user' | 'guest' | 'ai' | 'admin' | 'system';
export type SupportAIProviderType = 'gemini' | 'groq' | 'openai' | 'grounded_knowledge';

export interface SupportAttachment {
  url: string;
  type: string;
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
  senderType: SupportSenderType;
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
  status: SupportConversationStatus;
  assignedAdmin?: string;
  lastMessage: string;
  lastMessageAt: string;
  unreadCount: number;
  unreadAdminCount: number;
  createdAt: string;
  updatedAt: string;
  pageUrl?: string;
  userAgent?: string;
}

export interface AIProviderConfig {
  id: string;
  name: string;
  type: SupportAIProviderType;
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
  updatedAt: string;
  slug?: string;
  url?: string;
  version?: string;
  price?: string;
  isLive?: boolean;
  syncStatus?: 'synced' | 'pending' | 'failed' | 'inactive';
  syncError?: string | null;
  syncVersion?: number;
  retryCount?: number;
  lastIndexedAt?: string;
}

export interface WebsiteSyncStatus {
  lastSyncTime: string | null;
  isSyncing: boolean;
  totalSyncedItems: number;
  indexedBreakdown: {
    products: number;
    pages: number;
    faqs: number;
    categories: number;
    custom: number;
  };
  sources: {
    id: string;
    name: string;
    count: number;
    status: 'synced' | 'pending' | 'error';
    lastUpdated: string;
  }[];
  error: string | null;
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

// ============================================================================
// ElevenLabs TTS (Text-to-Speech) & Read Aloud Types
// ============================================================================
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
  apiKeyPool?: TTSApiKeyPublicEntry[];
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

// ============================================================================
// Guest Profile, Visitor Tracking & Account Linking Types
// ============================================================================
export interface GuestProfile {
  id?: string;
  guestId: string;
  createdAt: string;
  lastActiveAt: string;
  userAgent: string;
  device: string; // e.g. "Desktop (Chrome)", "Mobile (Safari)"
  browser?: string;
  os?: string;
  language: string;
  country?: string;
  screenResolution: string;
  referrer: string;
  initialLandingPage: string;
  currentLandingPage: string;
  pageViewsCount: number;
  sessionCount: number;
  downloadsCount: number;
  chatMessagesCount: number;
  supportReportsCount: number;
  voluntaryName?: string;
  voluntaryEmail?: string;
  voluntaryPhone?: string;
  linkedUserId?: string | null;
  linkedUserEmail?: string | null;
  linkedAt?: string | null;
  status: 'active' | 'linked' | 'merged' | 'expired';
  lastSessionId: string;
}

export interface GuestSessionEvent {
  action: string; // e.g. 'page_view', 'download_click', 'telegram_click', 'chat_message_sent', 'support_report_submitted', 'account_linked'
  path?: string;
  resourceId?: string;
  details?: string;
  timestamp: string;
}

export interface GuestSession {
  id: string;
  guestId: string;
  startedAt: string;
  lastActiveAt: string;
  durationSeconds: number;
  landingPage: string;
  exitPage: string;
  pageViews: string[];
  events: GuestSessionEvent[];
  linkedUserId?: string | null;
  isActive: boolean;
}



