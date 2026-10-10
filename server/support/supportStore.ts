import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import {
  SupportConversation,
  SupportMessage,
  AIProviderConfig,
  KnowledgeDocument,
  AISettings,
  SupportStats,
  SupportReport,
  SupportReportCategory,
  SupportReportPriority,
  SupportReportStatus,
  ReportInternalNote,
  SupportAttachment,
  TTSSettings,
  TTSStats,
  TTSApiKeyEntry,
  TTSApiKeyPublicEntry
} from './types';
import { RAGEngine } from './ragEngine';
import { generateConversationTitle } from './conversationEngine';

const DATA_DIR = path.join(process.cwd(), '.data');
const STORE_FILE = path.join(DATA_DIR, 'support_store.json');

export function maskApiKey(key: string): string {
  if (!key) return '';
  const trimmed = key.trim();
  if (trimmed.length <= 8) return '••••••••';
  const suffix = trimmed.slice(-4);
  return `••••••••••••••••••••••${suffix}`;
}

const DEFAULT_TTS_SETTINGS: TTSSettings = {
  enabled: true,
  provider: 'elevenlabs',
  modelId: 'eleven_multilingual_v2', // Stable, fast multilingual model (Bengali & English)
  voiceId: '3AMU7jXQuQa3oRvRqUmb', // Viraj - Rich, Confident and Expressive
  voiceName: 'Viraj - Rich, Confident and Expressive',
  outputFormat: 'mp3_44100_128',
  language: 'auto',
  speed: 1.0,
  stability: 0.5,
  similarity: 0.75,
  style: 0.0,
  useSpeakerBoost: true,
  maxCharacters: 5000,
  enableCaching: true,
  browserFallback: true,
  apiKeyPool: []
};

const DEFAULT_TTS_STATS: TTSStats = {
  totalRequests: 0,
  successfulGenerations: 0,
  failedGenerations: 0,
  cachedPlays: 0,
  totalCharactersSynthesized: 0
};

const DEFAULT_AI_SETTINGS: AISettings = {
  botName: 'OTL Live Support',
  personality: 'Helpful, concise, technically accurate, friendly, and strictly grounded in official Online Task Lab facts.',
  welcomeMessage: 'Hi! How can I help you today?',
  systemInstruction: `You are the OTL Support Assistant.
Your primary responsibility is to answer the user's current message accurately and naturally.
Do not provide unsolicited information.
Do not provide a general introduction unless the user asks for it.
Do not list OTL services, products, categories, Telegram links, policies, or features unless relevant to the user's question.
Always understand the user's intent before retrieving website information.
For simple greetings or casual conversation, do not perform RAG retrieval.
For website/product-specific questions, use the website's current data and RAG context.
Never invent information.
If the required website information cannot be found, clearly say that it could not be found.
Respond in the same language as the user whenever possible.
If the user writes in Bangla or Banglish, reply in natural Bangla.
If the user writes in English, reply in English.
Keep responses concise and directly relevant to the user's question.
Never respond with a generic catalog-not-found message for greetings, casual conversation, acknowledgements, or unrelated messages.`,
  supportRules: `- For greetings: reply with 1 short greeting sentence.
- For simple questions or acknowledgments: reply in 1 to 3 concise sentences.
- Never list all OTL categories, products, or services unless specifically requested by the user.
- For product inquiries: provide only the requested product details (price, version, download method, or features).
- All downloads on Online Task Lab (OTL) are 100% FREE.
- Official Telegram Channel: https://t.me/OnlineTaskLab
- Official Telegram Discussion Group: https://t.me/OnlineTaskLabGroup`,
  enableHandoffKeywords: true,
  handoffKeywords: [
    'human',
    'admin',
    'agent',
    'real person',
    'support person',
    'live agent',
    'live support',
    'talk to human',
    'customer care',
    'manush',
    'admin er sathe kotha bolbo',
    'মানুষ',
    'এডমিন',
    'এজেন্ট',
    'কথা বলতে চাই'
  ],
  maxRetrievedChunks: 4,
  relevanceThreshold: 0.15,
  enableVision: true,
  enableFallback: true,
  rateLimitPerMinute: 20
};

const DEFAULT_PROVIDERS: AIProviderConfig[] = [
  {
    id: 'provider-groq-backup',
    name: 'Groq Cloud (Fast AI)',
    type: 'groq',
    model: 'qwen/qwen3.8-27b',
    visionModel: 'qwen/qwen3.8-27b',
    temperature: 0.3,
    maxOutputTokens: 1200,
    enabled: true,
    isActive: true,
    isFallback: false,
    updatedAt: new Date().toISOString()
  },
  {
    id: 'provider-otl-grounded',
    name: 'OTL Smart Assistant (Grounded Knowledge Base)',
    type: 'grounded_knowledge',
    model: 'grounded-kb-v2',
    visionModel: 'grounded-kb-v2',
    temperature: 0.2,
    maxOutputTokens: 1200,
    enabled: true,
    isActive: false,
    isFallback: true,
    updatedAt: new Date().toISOString()
  },
  {
    id: 'provider-gemini-primary',
    name: 'Google Gemini (Official)',
    type: 'gemini',
    model: 'gemini-3.8-flash',
    visionModel: 'gemini-3.8-flash',
    temperature: 0.3,
    maxOutputTokens: 1200,
    enabled: false,
    isActive: false,
    isFallback: false,
    updatedAt: new Date().toISOString()
  },
  {
    id: 'provider-openai-custom',
    name: 'Custom OpenAI-Compatible API',
    type: 'openai',
    model: 'gpt-4o-mini',
    visionModel: 'gpt-4o-mini',
    temperature: 0.3,
    maxOutputTokens: 1200,
    baseUrl: 'https://api.openai.com/v1',
    enabled: true,
    isActive: false,
    isFallback: false,
    updatedAt: new Date().toISOString()
  }
];

export class SupportStore {
  private conversations: Map<string, SupportConversation> = new Map();
  private messages: Map<string, SupportMessage[]> = new Map();
  private reports: Map<string, SupportReport> = new Map();
  private providers: Map<string, AIProviderConfig> = new Map();
  private settings: AISettings = { ...DEFAULT_AI_SETTINGS };
  private ttsSettings: TTSSettings = { ...DEFAULT_TTS_SETTINGS };
  private ttsStats: TTSStats = { ...DEFAULT_TTS_STATS };
  private ragEngine: RAGEngine;
  private rateLimits: Map<string, { count: number; resetAt: number }> = new Map();

  constructor() {
    this.ragEngine = new RAGEngine();
    this.init();
    // Non-blocking startup reconciliation (Test 7)
    setTimeout(() => {
      this.reconcileWebsiteData().catch(err => {
        console.warn('[SupportStore] Startup reconciliation notice:', err);
      });
    }, 2000);
  }

  private init() {
    try {
      if (!fs.existsSync(DATA_DIR)) {
        fs.mkdirSync(DATA_DIR, { recursive: true });
      }

      if (fs.existsSync(STORE_FILE)) {
        const raw = fs.readFileSync(STORE_FILE, 'utf-8');
        const data = JSON.parse(raw);

        if (data.ttsSettings) {
          this.ttsSettings = { ...DEFAULT_TTS_SETTINGS, ...data.ttsSettings };
          if (this.ttsSettings.modelId === 'eleven_v3') {
            this.ttsSettings.modelId = 'eleven_multilingual_v2';
          }
          if (this.ttsSettings.voiceId === 'vIdhHAZdn1bGjKe1dFw8') {
            this.ttsSettings.voiceName = 'Rudra - Intense Documentary Narrator';
          } else if (this.ttsSettings.voiceId === '3AMU7jXQuQa3oRvRqUmb') {
            this.ttsSettings.voiceName = 'Viraj - Rich, Confident and Expressive';
          } else {
            this.ttsSettings.voiceId = '3AMU7jXQuQa3oRvRqUmb';
            this.ttsSettings.voiceName = 'Viraj - Rich, Confident and Expressive';
          }

          // Ensure apiKeyPool exists and is properly formed
          if (!this.ttsSettings.apiKeyPool || !Array.isArray(this.ttsSettings.apiKeyPool)) {
            this.ttsSettings.apiKeyPool = [];
          }

          // Validate and sanitize existing pool entries
          this.ttsSettings.apiKeyPool.forEach((item, index) => {
            if (!item.id) item.id = `key-${index + 1}-${Date.now()}`;
            if (!item.label) item.label = `ElevenLabs Key #${index + 1}`;
            if (!item.maskedKey && item.key) item.maskedKey = maskApiKey(item.key);
            if (item.enabled === undefined) item.enabled = true;
            if (!item.status) item.status = 'available';
            if (!item.priority) item.priority = index + 1;
          });

          // Backward compatibility: If pool is empty, but customApiKey or ELEVENLABS_API_KEY exists, populate pool!
          if (this.ttsSettings.apiKeyPool.length === 0) {
            const custom = this.ttsSettings.customApiKey?.trim();
            const envKey = (process.env.ELEVENLABS_API_KEY || '').trim();
            const effectiveKey = (custom && !custom.includes('••••') && !custom.includes('Configured')) ? custom : envKey;
            if (effectiveKey) {
              const isEnv = effectiveKey === envKey && !custom;
              this.ttsSettings.apiKeyPool.push({
                id: isEnv ? 'key-env' : 'key-primary',
                label: isEnv ? 'Server Environment Key (ELEVENLABS_API_KEY)' : 'ElevenLabs Primary Key',
                key: effectiveKey,
                maskedKey: maskApiKey(effectiveKey),
                enabled: true,
                status: 'available',
                priority: 1,
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString()
              });
            }
          }
        }
        if (data.ttsStats) {
          this.ttsStats = { ...DEFAULT_TTS_STATS, ...data.ttsStats };
        }

        if (data.conversations && Array.isArray(data.conversations)) {
          data.conversations.forEach((c: SupportConversation) => this.conversations.set(c.id, c));
        }
        if (data.messages && typeof data.messages === 'object') {
          Object.entries(data.messages).forEach(([cId, msgs]) => {
            const thread = (msgs as SupportMessage[]).map(m => {
              const attachments = m.attachments && m.attachments.length > 0
                ? m.attachments
                : m.attachment
                ? [m.attachment]
                : undefined;
              const attachment = m.attachment || (attachments && attachments[0]) || undefined;
              return {
                ...m,
                attachment,
                attachments
              };
            });
            this.messages.set(cId, thread);
          });
        }

        // Clean up abandoned empty conversations where no user message was ever sent
        for (const [id, conv] of Array.from(this.conversations.entries())) {
          const thread = this.messages.get(id) || [];
          const hasUserMsg = thread.some(m => m.senderType === 'user' || m.senderType === 'guest');
          const hasContent = Boolean((conv.lastMessage && conv.lastMessage.trim()) || hasUserMsg);
          if (!hasContent) {
            this.conversations.delete(id);
            this.messages.delete(id);
          }
        }
        if (data.reports && Array.isArray(data.reports)) {
          data.reports.forEach((r: SupportReport) => this.reports.set(r.id, r));
        }
        if (data.providers && Array.isArray(data.providers) && data.providers.length > 0) {
          data.providers.forEach((p: AIProviderConfig) => {
            // Upgrade deprecated Gemini model names
            if (p.type === 'gemini') {
              if (!p.model || p.model.includes('2.5') || p.model.includes('2.0') || p.model.includes('1.5')) {
                p.model = 'gemini-3.8-flash';
              }
              if (!p.visionModel || p.visionModel.includes('2.5') || p.visionModel.includes('2.0') || p.visionModel.includes('1.5')) {
                p.visionModel = 'gemini-3.8-flash';
              }
              // If Gemini has no custom apiKey, deactivate it to prevent 403 access denied errors
              if (!p.apiKey || !p.apiKey.trim()) {
                p.isActive = false;
                p.enabled = false;
              }
            }
            // Upgrade Groq model to active supported model
            if (p.type === 'groq') {
              p.name = 'Groq Cloud (Fast AI)';
              if (!p.model || p.model.includes('llama') || p.model.includes('mixtral') || p.model.includes('gemma')) {
                p.model = 'qwen/qwen3.8-27b';
              }
              if (!p.visionModel || p.visionModel.includes('llama') || p.visionModel.includes('mixtral')) {
                p.visionModel = 'qwen/qwen3.8-27b';
              }
            }
            this.providers.set(p.id, p);
          });

          // Ensure provider-otl-grounded is always present
          if (!this.providers.has('provider-otl-grounded')) {
            this.providers.set('provider-otl-grounded', {
              id: 'provider-otl-grounded',
              name: 'OTL Smart Assistant (Grounded Knowledge Base)',
              type: 'grounded_knowledge',
              model: 'grounded-kb-v2',
              visionModel: 'grounded-kb-v2',
              temperature: 0.2,
              maxOutputTokens: 1200,
              enabled: true,
              isActive: false,
              isFallback: true,
              updatedAt: new Date().toISOString()
            });
          }

          // Ensure at least one provider with a verified key is active
          const active = Array.from(this.providers.values()).find(p => p.isActive && p.enabled && this.providerHasKey(p));
          if (!active) {
            for (const p of this.providers.values()) {
              p.isActive = false;
            }
            const groqProv = this.providers.get('provider-groq-backup');
            const groundedProv = this.providers.get('provider-otl-grounded');
            if (groqProv && this.providerHasKey(groqProv)) {
              groqProv.isActive = true;
              groqProv.enabled = true;
              if (groundedProv) groundedProv.isFallback = true;
              console.log('[SupportStore] Configured Groq Cloud as primary active AI provider.');
            } else if (groundedProv) {
              groundedProv.isActive = true;
              groundedProv.enabled = true;
              console.log('[SupportStore] Defaulted active AI provider to OTL Grounded Knowledge.');
            }
          }
          this.saveToFile();
        } else {
          DEFAULT_PROVIDERS.forEach(p => this.providers.set(p.id, p));
        }
        if (data.settings) {
          this.settings = { ...DEFAULT_AI_SETTINGS, ...data.settings };
        }
        if (data.knowledge && Array.isArray(data.knowledge) && data.knowledge.length > 0) {
          data.knowledge.forEach((doc: KnowledgeDocument) => this.ragEngine.addDocument(doc));
        }
      } else {
        // Seed default providers and save
        DEFAULT_PROVIDERS.forEach(p => this.providers.set(p.id, p));
        this.saveToFile();
      }
    } catch (err) {
      console.warn('[SupportStore Warning]: Could not load store file, initializing defaults:', err);
      DEFAULT_PROVIDERS.forEach(p => this.providers.set(p.id, p));
    }
  }

  public saveToFile() {
    try {
      if (!fs.existsSync(DATA_DIR)) {
        fs.mkdirSync(DATA_DIR, { recursive: true });
      }

      const payload = {
        conversations: Array.from(this.conversations.values()),
        messages: Object.fromEntries(this.messages.entries()),
        reports: Array.from(this.reports.values()),
        providers: Array.from(this.providers.values()),
        settings: this.settings,
        ttsSettings: this.ttsSettings,
        ttsStats: this.ttsStats,
        knowledge: this.ragEngine.getAllDocuments()
      };

      fs.writeFileSync(STORE_FILE, JSON.stringify(payload, null, 2), 'utf-8');
    } catch (err) {
      console.warn('[SupportStore Warning] Could not persist to disk:', err);
    }
  }

  // Rate Limiter
  public checkRateLimit(identifier: string): boolean {
    const now = Date.now();
    const entry = this.rateLimits.get(identifier);
    const limit = this.settings.rateLimitPerMinute || 20;

    if (!entry || now > entry.resetAt) {
      this.rateLimits.set(identifier, { count: 1, resetAt: now + 60000 });
      return true;
    }

    if (entry.count >= limit) {
      return false;
    }

    entry.count++;
    return true;
  }

  // Conversations
  public getOrCreateConversation(params: {
    guestId?: string;
    userId?: string;
    userName?: string;
    userEmail?: string;
    pageUrl?: string;
    userAgent?: string;
  }): { conversation: SupportConversation; isNew: boolean } {
    const { guestId, userId, userName, userEmail, pageUrl, userAgent } = params;

    // Search existing active conversation for user or guest
    let found: SupportConversation | undefined;
    for (const conv of this.conversations.values()) {
      if (userId && conv.userId === userId && conv.status !== 'closed') {
        found = conv;
        break;
      }
      if (!userId && guestId && conv.guestId === guestId && conv.status !== 'closed') {
        found = conv;
        break;
      }
    }

    if (found) {
      return { conversation: found, isNew: false };
    }

    // Create new conversation
    const newId = `conv_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;
    const now = new Date().toISOString();
    const name = userName || (userId ? 'Registered User' : `Guest-${guestId ? guestId.slice(0, 6) : 'Visitor'}`);

    const newConv: SupportConversation = {
      id: newId,
      title: 'New Conversation',
      guestId: !userId ? guestId : undefined,
      userId,
      userEmail,
      userName: name,
      status: 'ai_handling',
      lastMessage: '',
      lastMessageAt: now,
      unreadCount: 0,
      unreadAdminCount: 0,
      createdAt: now,
      updatedAt: now,
      pageUrl,
      userAgent
    };

    this.conversations.set(newId, newConv);
    this.messages.set(newId, []);
    this.saveToFile();

    return { conversation: newConv, isNew: true };
  }

  // Explicitly create a new conversation for user or guest
  public createNewConversation(params: {
    guestId?: string;
    userId?: string;
    userName?: string;
    userEmail?: string;
    pageUrl?: string;
    userAgent?: string;
    initialTitle?: string;
    forceNew?: boolean;
  }): SupportConversation {
    const { guestId, userId, userName, userEmail, pageUrl, userAgent, initialTitle, forceNew } = params;

    // Check if this user/guest ALREADY has an active empty generic conversation with nothing written in it
    if (!forceNew && (!initialTitle || initialTitle === 'New Conversation')) {
      for (const conv of this.conversations.values()) {
        const matchUser = userId && conv.userId === userId;
        const matchGuest = !userId && guestId && conv.guestId === guestId;
        if ((matchUser || matchGuest) && conv.status !== 'closed') {
          const thread = this.messages.get(conv.id) || [];
          const hasUserMsg = thread.some(m => m.senderType === 'user' || m.senderType === 'guest');
          const hasContent = Boolean((conv.lastMessage && conv.lastMessage.trim()) || hasUserMsg);
          if (!hasContent) {
            // Reuse existing empty conversation - do not create redundant blank chat boxes
            return conv;
          }
        }
      }
    }

    const newId = `conv_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;
    const now = new Date().toISOString();
    const name = userName || (userId ? 'Registered User' : `Guest-${guestId ? guestId.slice(0, 6) : 'Visitor'}`);

    const newConv: SupportConversation = {
      id: newId,
      title: initialTitle || 'New Conversation',
      guestId: !userId ? guestId : undefined,
      userId,
      userEmail,
      userName: name,
      status: 'ai_handling',
      lastMessage: '',
      lastMessageAt: now,
      unreadCount: 0,
      unreadAdminCount: 0,
      createdAt: now,
      updatedAt: now,
      pageUrl,
      userAgent
    };

    this.conversations.set(newId, newConv);
    this.messages.set(newId, []);
    this.saveToFile();

    return newConv;
  }

  // Get conversation list for a specific user or guest session
  public getUserConversations(params: {
    userId?: string;
    guestId?: string;
    search?: string;
  }): SupportConversation[] {
    const { userId, guestId, search } = params;
    let list: SupportConversation[] = [];

    for (const conv of this.conversations.values()) {
      const matchUser = Boolean(userId && conv.userId === userId);
      const matchGuest = Boolean(guestId && conv.guestId === guestId);
      if (matchUser || matchGuest) {
        const thread = this.messages.get(conv.id) || [];
        const hasUserMsg = thread.some(m => m.senderType === 'user' || m.senderType === 'guest');
        const hasContent = Boolean((conv.lastMessage && conv.lastMessage.trim()) || hasUserMsg);
        // Only list conversations in history if the user has actually written or exchanged messages
        if (hasContent) {
          list.push(conv);
        }
      }
    }

    // Auto-detect and populate topic title like ChatGPT if missing or default
    let hasUpdatedAnyTitle = false;
    for (const conv of list) {
      if (!conv.title || conv.title === 'New Conversation' || conv.title.trim() === '') {
        const thread = this.messages.get(conv.id) || [];
        const firstUserMsg = thread.find(m => m.senderType === 'user' || m.senderType === 'guest');
        const targetText = firstUserMsg?.content || conv.lastMessage;
        if (targetText && targetText.trim()) {
          const generated = generateConversationTitle(targetText);
          if (generated && generated !== 'New Conversation') {
            conv.title = generated;
            hasUpdatedAnyTitle = true;
          }
        }
      }
    }
    if (hasUpdatedAnyTitle) {
      this.saveToFile();
    }

    if (search && search.trim()) {
      const q = search.toLowerCase().trim();
      list = list.filter(conv => {
        if (conv.title && conv.title.toLowerCase().includes(q)) return true;
        if (conv.lastMessage && conv.lastMessage.toLowerCase().includes(q)) return true;
        if (conv.id.toLowerCase().includes(q)) return true;
        const msgs = this.messages.get(conv.id) || [];
        return msgs.some(m => m.content && m.content.toLowerCase().includes(q));
      });
    }

    // Sort by updatedAt descending
    return list.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
  }

  // Update conversation title
  public updateConversationTitle(id: string, title: string): SupportConversation | undefined {
    const conv = this.conversations.get(id);
    if (!conv) return undefined;
    conv.title = title.trim();
    conv.updatedAt = new Date().toISOString();
    this.saveToFile();
    return conv;
  }

  // Delete conversation with ownership verification
  public deleteConversation(
    id: string,
    requester: { userId?: string; guestId?: string; isAdmin?: boolean }
  ): boolean {
    const conv = this.conversations.get(id);
    if (!conv) return false;

    if (!requester.isAdmin) {
      if (conv.userId && requester.userId && conv.userId !== requester.userId) {
        return false;
      }
      if (conv.guestId && requester.guestId && conv.guestId !== requester.guestId) {
        return false;
      }
      if (!requester.userId && !requester.guestId) {
        return false;
      }
    }

    this.conversations.delete(id);
    this.messages.delete(id);
    this.saveToFile();
    return true;
  }

  // Link anonymous guest conversations & reports to authenticated Firebase User ID
  public linkGuestAccount(
    guestId: string,
    userId: string,
    userName?: string,
    userEmail?: string
  ): { linkedConversations: number; linkedReports: number } {
    if (!guestId || !userId) {
      return { linkedConversations: 0, linkedReports: 0 };
    }

    let linkedConversations = 0;
    let linkedReports = 0;

    // Link conversations
    for (const conv of this.conversations.values()) {
      if (conv.guestId === guestId) {
        if (!conv.userId || conv.userId !== userId) {
          conv.userId = userId;
          if (userName && (!conv.userName || conv.userName.startsWith('Guest') || conv.userName === 'Visitor' || conv.userName.startsWith('Member ('))) {
            conv.userName = userName;
          }
          if (userEmail && !conv.userEmail) {
            conv.userEmail = userEmail;
          }
          conv.updatedAt = new Date().toISOString();
          linkedConversations++;
        }
      }
    }

    // Link reports
    for (const report of this.reports.values()) {
      if (report.guestId === guestId) {
        if (!report.userId || report.userId !== userId) {
          report.userId = userId;
          if (userEmail) {
            report.userEmail = userEmail;
          }
          if (userName && (!report.userName || report.userName === 'Guest Visitor' || report.userName === 'Visitor')) {
            report.userName = userName;
          }
          report.updatedAt = new Date().toISOString();
          linkedReports++;
        }
      }
    }

    if (linkedConversations > 0 || linkedReports > 0) {
      this.saveToFile();
      console.log(`[SupportStore] Successfully linked guest (${guestId}) -> user (${userId}): ${linkedConversations} convs, ${linkedReports} reports.`);
    }

    return { linkedConversations, linkedReports };
  }

  public getConversationById(id: string): SupportConversation | undefined {
    return this.conversations.get(id);
  }

  public getMessages(conversationId: string): SupportMessage[] {
    const thread = this.messages.get(conversationId) || [];
    return thread.map(m => {
      const attachments = m.attachments && m.attachments.length > 0
        ? m.attachments
        : m.attachment
        ? [m.attachment]
        : undefined;
      const attachment = m.attachment || (attachments && attachments[0]) || undefined;
      return {
        ...m,
        attachment,
        attachments
      };
    });
  }

  public getMessageById(messageId: string): SupportMessage | undefined {
    for (const thread of this.messages.values()) {
      const found = thread.find(m => m.id === messageId);
      if (found) {
        const attachments = found.attachments && found.attachments.length > 0
          ? found.attachments
          : found.attachment
          ? [found.attachment]
          : undefined;
        const attachment = found.attachment || (attachments && attachments[0]) || undefined;
        return {
          ...found,
          attachment,
          attachments
        };
      }
    }
    return undefined;
  }

  public addMessage(
    conversationId: string,
    data: Omit<SupportMessage, 'id' | 'conversationId' | 'createdAt'>
  ): SupportMessage {
    const conv = this.conversations.get(conversationId);
    if (!conv) {
      throw new Error(`Conversation ${conversationId} not found`);
    }

    const now = new Date().toISOString();

    // Normalize attachment and attachments arrays
    let attachments: SupportAttachment[] | undefined = undefined;
    if (data.attachments && data.attachments.length > 0) {
      attachments = data.attachments.map((att, idx) => ({
        ...att,
        attachmentId: att.attachmentId || `att_${Date.now()}_${idx}`,
        createdAt: att.createdAt || now
      }));
    } else if (data.attachment) {
      attachments = [{
        ...data.attachment,
        attachmentId: data.attachment.attachmentId || `att_${Date.now()}_0`,
        createdAt: data.attachment.createdAt || now
      }];
    }
    const attachment = data.attachment || (attachments && attachments.length > 0 ? attachments[0] : undefined);

    const newMsg: SupportMessage = {
      id: `msg_${Date.now()}_${crypto.randomBytes(3).toString('hex')}`,
      conversationId,
      ...data,
      attachment,
      attachments,
      createdAt: now
    };

    const thread = this.messages.get(conversationId) || [];
    thread.push(newMsg);
    this.messages.set(conversationId, thread);

    // Update conversation metadata
    conv.lastMessage = newMsg.content;
    conv.lastMessageAt = now;
    conv.updatedAt = now;

    if (newMsg.senderType === 'user' || newMsg.senderType === 'guest') {
      conv.unreadAdminCount = (conv.unreadAdminCount || 0) + 1;
    } else if (newMsg.senderType === 'admin') {
      conv.unreadCount = (conv.unreadCount || 0) + 1;
      // If admin answers, automatically switch to human handling
      if (conv.status === 'ai_handling' || conv.status === 'waiting_human') {
        conv.status = 'human_handling';
      }
    }

    this.saveToFile();
    return newMsg;
  }

  public updateConversationStatus(
    id: string,
    status: SupportConversation['status'],
    adminEmail?: string
  ): SupportConversation {
    const conv = this.conversations.get(id);
    if (!conv) throw new Error('Conversation not found');

    conv.status = status;
    conv.updatedAt = new Date().toISOString();
    if (adminEmail) {
      conv.assignedAdmin = adminEmail;
    }

    // System message notification in thread
    let systemNotice = '';
    if (status === 'waiting_human') {
      systemNotice = '🔔 You have requested human assistance. A support admin has been notified and will reply shortly.';
    } else if (status === 'human_handling') {
      systemNotice = `👨‍💼 Support specialist (${conv.assignedAdmin || 'Admin'}) has taken over this chat.`;
    } else if (status === 'resolved') {
      systemNotice = '✅ This support issue has been marked as resolved.';
    } else if (status === 'closed') {
      systemNotice = '🔒 This conversation has been closed. You may start a new chat anytime.';
    }

    if (systemNotice) {
      const sysMsg: SupportMessage = {
        id: `msg_${Date.now()}_sys`,
        conversationId: id,
        senderType: 'system',
        senderId: 'system',
        senderName: 'System',
        content: systemNotice,
        createdAt: new Date().toISOString()
      };
      const thread = this.messages.get(id) || [];
      thread.push(sysMsg);
      this.messages.set(id, thread);
    }

    this.saveToFile();
    return conv;
  }

  public markAsRead(id: string, forAdmin = false) {
    const conv = this.conversations.get(id);
    if (conv) {
      if (forAdmin) {
        conv.unreadAdminCount = 0;
      } else {
        conv.unreadCount = 0;
      }
      this.saveToFile();
    }
  }

  public linkGuestToUser(guestId: string, user: { uid: string; email: string; name: string }): SupportConversation | null {
    let linked: SupportConversation | null = null;
    for (const conv of this.conversations.values()) {
      if (conv.guestId === guestId && !conv.userId) {
        conv.userId = user.uid;
        conv.userEmail = user.email;
        conv.userName = user.name || conv.userName;
        conv.guestId = guestId; // Preserve guestId for linking traceability
        conv.updatedAt = new Date().toISOString();
        linked = conv;
      }
    }
    if (linked) this.saveToFile();
    return linked;
  }

  public getAllConversations(filter?: {
    status?: string;
    search?: string;
    userType?: 'guest' | 'registered';
  }): SupportConversation[] {
    let list = Array.from(this.conversations.values());

    if (filter?.status && filter.status !== 'all') {
      list = list.filter(c => c.status === filter.status);
    }

    if (filter?.userType === 'guest') {
      list = list.filter(c => !c.userId && !!c.guestId);
    } else if (filter?.userType === 'registered') {
      list = list.filter(c => !!c.userId);
    }

    if (filter?.search) {
      const q = filter.search.toLowerCase().trim();
      list = list.filter(
        c =>
          (c.userName && c.userName.toLowerCase().includes(q)) ||
          (c.userEmail && c.userEmail.toLowerCase().includes(q)) ||
          (c.guestId && c.guestId.toLowerCase().includes(q)) ||
          (c.userId && c.userId.toLowerCase().includes(q)) ||
          (c.title && c.title.toLowerCase().includes(q)) ||
          (c.lastMessage && c.lastMessage.toLowerCase().includes(q)) ||
          c.id.toLowerCase().includes(q) ||
          (this.messages.get(c.id) || []).some(m => m.content && m.content.toLowerCase().includes(q))
      );
    }

    // Sort by latest message date descending
    return list.sort((a, b) => new Date(b.lastMessageAt).getTime() - new Date(a.lastMessageAt).getTime());
  }

  // AI Providers
  public getAllProviders(): AIProviderConfig[] {
    return Array.from(this.providers.values());
  }

  // Helper to check if a provider has an API key configured
  public providerHasKey(prov: AIProviderConfig): boolean {
    if (prov.type === 'grounded_knowledge') return true;
    if (prov.type === 'groq' && (prov.apiKey || process.env.GROQ_API_KEY)) return true;
    if (prov.type === 'gemini' && (prov.apiKey || process.env.GEMINI_API_KEY)) return true;
    if (prov.type === 'openai' && (prov.apiKey || process.env.OPENAI_API_KEY)) return true;
    if (prov.apiKey && prov.apiKey.trim()) return true;
    return false;
  }

  public getActiveProvider(): AIProviderConfig {
    const all = Array.from(this.providers.values());

    // 1. Try currently active provider if it has a key
    const activeWithKey = all.find(p => p.isActive && p.enabled && this.providerHasKey(p));
    if (activeWithKey) return activeWithKey;

    // 2. Try any enabled provider with a key
    const anyWithKey = all.find(p => p.enabled && this.providerHasKey(p));
    if (anyWithKey) return anyWithKey;

    // 3. Fallback to active flag or first enabled
    const active = all.find(p => p.isActive && p.enabled);
    if (active) return active;

    return all.find(p => p.enabled) || all[0];
  }

  public getFallbackProvider(): AIProviderConfig | null {
    const all = Array.from(this.providers.values());
    const activeId = this.getActiveProvider().id;
    const fallback = all.find(p => p.isFallback && p.enabled && p.id !== activeId && this.providerHasKey(p));
    return fallback || null;
  }

  public updateProvider(id: string, updates: Partial<AIProviderConfig>): AIProviderConfig {
    let p = this.providers.get(id);
    if (!p) {
      // Auto-create provider if not present in memory
      p = {
        id,
        name: updates.name || 'AI Provider',
        type: updates.type || 'gemini',
        model: updates.model || 'gemini-3.8-flash',
        temperature: updates.temperature ?? 0.3,
        maxOutputTokens: updates.maxOutputTokens ?? 1200,
        enabled: updates.enabled ?? true,
        isActive: updates.isActive ?? false,
        isFallback: updates.isFallback ?? false,
        updatedAt: new Date().toISOString(),
        ...updates
      };
      this.providers.set(id, p);
    }

    if (updates.isActive) {
      for (const other of this.providers.values()) {
        other.isActive = other.id === id;
      }
    }

    Object.assign(p, updates, { updatedAt: new Date().toISOString() });
    this.saveToFile();
    return p;
  }

  public addProvider(config: Omit<AIProviderConfig, 'id' | 'updatedAt'>): AIProviderConfig {
    const id = `provider_${config.type}_${Date.now()}`;
    const newP: AIProviderConfig = {
      ...config,
      id,
      updatedAt: new Date().toISOString()
    };
    this.providers.set(id, newP);
    this.saveToFile();
    return newP;
  }

  public deleteProvider(id: string) {
    this.providers.delete(id);
    this.saveToFile();
  }

  // AI Settings
  public getSettings(): AISettings {
    return this.settings;
  }

  public updateSettings(updates: Partial<AISettings>): AISettings {
    this.settings = { ...this.settings, ...updates };
    this.saveToFile();
    return this.settings;
  }

  // Knowledge Base & Website Sync
  public getRagEngine(): RAGEngine {
    return this.ragEngine;
  }

  public getRAGEngine(): RAGEngine {
    return this.ragEngine;
  }

  public async syncWebsiteKnowledge(force = false): Promise<{ docsCount: number; chunksCount: number }> {
    const res = await this.ragEngine.syncWithWebsite(force);
    this.saveToFile();
    return res;
  }

  public getWebsiteSyncStatus() {
    return this.ragEngine.websiteSync.getStatus();
  }

  public handleResourceUpdate(resource: any, action: 'create' | 'update' | 'delete') {
    const res = this.ragEngine.handleResourceUpdate(resource, action);
    this.saveToFile();
    return res;
  }

  public handleContentUpdate(sourceType: 'category' | 'faq' | 'page', item: any, action: 'create' | 'update' | 'delete') {
    const res = this.ragEngine.handleContentUpdate(sourceType, item, action);
    this.saveToFile();
    return res;
  }

  public async reconcileWebsiteData(liveResources?: any[]) {
    const res = await this.ragEngine.reconcileWithWebsite(liveResources);
    this.saveToFile();
    return res;
  }

  public getKnowledgeDocuments(): KnowledgeDocument[] {
    return this.ragEngine.getAllDocuments();
  }

  public async retryFailedItems() {
    const res = await this.ragEngine.processRetryQueue();
    this.saveToFile();
    return res;
  }

  public saveKnowledgeDocument(doc: Omit<KnowledgeDocument, 'chunksCount' | 'contentHash' | 'updatedAt'>): KnowledgeDocument {
    const fullDoc = this.ragEngine.addDocument(doc);
    this.saveToFile();
    return fullDoc;
  }

  public deleteKnowledgeDocument(id: string) {
    this.ragEngine.deleteDocument(id);
    this.saveToFile();
  }

  public async reindexAllKnowledge(): Promise<{ docsCount: number; chunksCount: number }> {
    const res = await this.ragEngine.syncWithWebsite(true);
    this.saveToFile();
    return res;
  }

  // Support Reports CRUD & Lifecycle Operations
  public createReport(data: {
    conversationId: string;
    userId?: string;
    guestId?: string;
    userName?: string;
    userEmail?: string;
    title: string;
    description: string;
    category?: SupportReportCategory;
    priority?: SupportReportPriority;
    aiAnalysis?: {
      summary: string;
      category: string;
      suspectedCause?: string;
      attemptedSteps?: string[];
      suggestedAction?: string;
    };
    attachments?: SupportAttachment[];
    sourceMessageIds?: string[];
  }): SupportReport {
    const reportCount = this.reports.size + 1001;
    const reportId = `R-${reportCount}`;
    const now = new Date().toISOString();

    const report: SupportReport = {
      id: reportId,
      conversationId: data.conversationId,
      userId: data.userId,
      guestId: data.guestId,
      userName: data.userName || 'Anonymous User',
      userEmail: data.userEmail,
      title: data.title || 'Technical Support Issue',
      description: data.description || '',
      category: data.category || 'technical',
      priority: data.priority || 'medium',
      status: 'waiting_for_admin',
      aiAnalysis: data.aiAnalysis,
      attachments: data.attachments || [],
      sourceMessageIds: data.sourceMessageIds || [],
      internalNotes: [],
      createdAt: now,
      updatedAt: now
    };

    this.reports.set(reportId, report);
    this.saveToFile();
    return report;
  }

  public getReport(reportId: string): SupportReport | null {
    return this.reports.get(reportId) || null;
  }

  public getReports(filter?: {
    status?: string;
    category?: string;
    search?: string;
    userId?: string;
    guestId?: string;
    conversationId?: string;
  }): SupportReport[] {
    let list = Array.from(this.reports.values());

    if (filter?.conversationId) {
      list = list.filter(r => r.conversationId === filter.conversationId);
    }
    if (filter?.userId) {
      list = list.filter(r => r.userId === filter.userId);
    }
    if (filter?.guestId) {
      list = list.filter(r => r.guestId === filter.guestId);
    }
    if (filter?.status && filter.status !== 'all') {
      list = list.filter(r => r.status === filter.status);
    }
    if (filter?.category && filter.category !== 'all') {
      list = list.filter(r => r.category === filter.category);
    }
    if (filter?.search) {
      const q = filter.search.toLowerCase();
      list = list.filter(
        r =>
          r.id.toLowerCase().includes(q) ||
          r.title.toLowerCase().includes(q) ||
          r.description.toLowerCase().includes(q) ||
          (r.userName && r.userName.toLowerCase().includes(q)) ||
          (r.userEmail && r.userEmail.toLowerCase().includes(q))
      );
    }

    // Sort newest first
    return list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  public updateReportStatus(
    reportId: string,
    status: SupportReportStatus,
    adminEmail?: string,
    resolutionMessage?: string
  ): SupportReport | null {
    const r = this.reports.get(reportId);
    if (!r) return null;

    r.status = status;
    r.updatedAt = new Date().toISOString();

    if (status === 'resolved') {
      r.resolvedAt = new Date().toISOString();
      if (resolutionMessage) r.resolutionMessage = resolutionMessage;
    } else if (status === 'closed') {
      r.closedAt = new Date().toISOString();
    } else if (status === 'open' || status === 'waiting_for_admin') {
      r.reopenedAt = new Date().toISOString();
    }

    if (adminEmail) {
      r.assignedAdminEmail = adminEmail;
    }

    this.saveToFile();
    return r;
  }

  public addReportInternalNote(reportId: string, adminEmail: string, note: string): SupportReport | null {
    const r = this.reports.get(reportId);
    if (!r) return null;

    if (!r.internalNotes) r.internalNotes = [];
    r.internalNotes.push({
      id: `note_${Date.now()}`,
      adminEmail,
      note,
      createdAt: new Date().toISOString()
    });
    r.updatedAt = new Date().toISOString();

    this.saveToFile();
    return r;
  }

  public assignReport(reportId: string, adminId: string, adminEmail: string, adminName?: string): SupportReport | null {
    const r = this.reports.get(reportId);
    if (!r) return null;

    r.assignedAdminId = adminId;
    r.assignedAdminEmail = adminEmail;
    if (adminName) r.assignedAdminName = adminName;
    r.updatedAt = new Date().toISOString();

    this.saveToFile();
    return r;
  }

  public getReportsForConversation(conversationId: string): SupportReport[] {
    return Array.from(this.reports.values())
      .filter(r => r.conversationId === conversationId)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  public getReportsForUserOrGuest(userId?: string, guestId?: string): SupportReport[] {
    return Array.from(this.reports.values())
      .filter(r => (userId && r.userId === userId) || (guestId && r.guestId === guestId))
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  // Stats
  public getStats(): SupportStats {
    const convs = Array.from(this.conversations.values());
    const reps = Array.from(this.reports.values());
    let totalMessages = 0;
    this.messages.forEach(m => (totalMessages += m.length));

    const activeProvider = this.getActiveProvider();

    return {
      totalConversations: convs.length,
      activeAiHandling: convs.filter(c => c.status === 'ai_handling').length,
      waitingForHuman: convs.filter(c => c.status === 'waiting_human').length,
      humanHandling: convs.filter(c => c.status === 'human_handling').length,
      resolvedCount: convs.filter(c => c.status === 'resolved').length,
      totalMessages,
      totalKnowledgeDocs: this.ragEngine.getAllDocuments().length,
      totalKnowledgeChunks: this.ragEngine.getAllChunks().length,
      activeProviderName: activeProvider ? `${activeProvider.name} (${activeProvider.model})` : 'None',
      totalReports: reps.length,
      openReports: reps.filter(r => r.status === 'open' || r.status === 'waiting_for_admin' || r.status === 'admin_handling').length,
      waitingAdminReports: reps.filter(r => r.status === 'waiting_for_admin').length,
      resolvedReports: reps.filter(r => r.status === 'resolved' || r.status === 'closed').length
    };
  }

  // ============================================================================
  // ElevenLabs TTS (Text-to-Speech) & Multi-API Key Pool System
  // ============================================================================
  public getTtsSettings(): TTSSettings {
    const hasEnvKey = Boolean(process.env.ELEVENLABS_API_KEY && process.env.ELEVENLABS_API_KEY.trim());
    const hasCustomKey = Boolean(this.ttsSettings.customApiKey && this.ttsSettings.customApiKey.trim());
    const pool = this.getTtsKeyPool(false);
    const hasActivePoolKey = pool.some(k => k.enabled && k.status !== 'disabled');

    return {
      ...this.ttsSettings,
      apiKeyConfigured: hasActivePoolKey || hasEnvKey || hasCustomKey,
      customApiKey: hasCustomKey ? 'Configured via Admin Panel ✓' : (hasEnvKey ? 'Configured via Server Environment ✓' : ''),
      apiKeyPool: pool as any
    };
  }

  public getTtsInternalApiKey(): string {
    const eligible = this.getEligibleTtsKeys();
    if (eligible.length > 0) {
      return eligible[0].key;
    }
    if (this.ttsSettings.customApiKey && this.ttsSettings.customApiKey.trim() && !this.ttsSettings.customApiKey.includes('••••') && !this.ttsSettings.customApiKey.includes('Configured')) {
      return this.ttsSettings.customApiKey.trim();
    }
    return (process.env.ELEVENLABS_API_KEY || '').trim();
  }

  public updateTtsSettings(updates: Partial<TTSSettings>): TTSSettings {
    if (updates.customApiKey !== undefined) {
      if (updates.customApiKey.includes('Configured') || updates.customApiKey.includes('••••')) {
        delete updates.customApiKey; // preserve existing secret
      } else if (updates.customApiKey.trim()) {
        // Synchronize single-key update into key pool
        const cleanKey = updates.customApiKey.trim();
        const pool = this.ttsSettings.apiKeyPool || [];
        const existing = pool.find(k => k.id === 'key-primary' || k.priority === 1);
        if (existing) {
          existing.key = cleanKey;
          existing.maskedKey = maskApiKey(cleanKey);
          existing.status = 'available';
          existing.exhaustedAt = undefined;
          existing.lastError = undefined;
          existing.updatedAt = new Date().toISOString();
        } else {
          pool.unshift({
            id: 'key-primary',
            label: 'ElevenLabs Primary Key',
            key: cleanKey,
            maskedKey: maskApiKey(cleanKey),
            enabled: true,
            status: 'available',
            priority: 1,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
          });
        }
        this.ttsSettings.apiKeyPool = pool;
      }
    }
    this.ttsSettings = { ...this.ttsSettings, ...updates };
    this.saveToFile();
    return this.getTtsSettings();
  }

  /**
   * Returns API key pool entries.
   * If includeSecrets is false (default), the secret raw key is stripped for security.
   */
  public getTtsKeyPool(includeSecrets = false): (TTSApiKeyEntry | TTSApiKeyPublicEntry)[] {
    const pool = this.ttsSettings.apiKeyPool || [];
    const sorted = [...pool].sort((a, b) => (a.priority || 0) - (b.priority || 0));
    if (includeSecrets) {
      return sorted;
    }
    return sorted.map(({ key, ...rest }) => rest as TTSApiKeyPublicEntry);
  }

  /**
   * Returns eligible keys for speech synthesis rotation, sorted by priority.
   * Automatically resets quota_exhausted keys after 15 minutes cooldown.
   */
  public getEligibleTtsKeys(): TTSApiKeyEntry[] {
    const pool = this.ttsSettings.apiKeyPool || [];
    const now = Date.now();
    const COOLDOWN_MS = 15 * 60 * 1000; // 15 min cooldown for quota reset

    let stateChanged = false;

    // Check automatic cooldown quota reset
    pool.forEach(item => {
      if (item.status === 'quota_exhausted' || item.status === 'rate_limited' || item.status === 'cooldown') {
        if (item.exhaustedAt && (now - item.exhaustedAt > COOLDOWN_MS)) {
          item.status = 'available';
          item.exhaustedAt = undefined;
          item.lastError = undefined;
          item.updatedAt = new Date().toISOString();
          stateChanged = true;
          console.log(`[ElevenLabs Key Pool] Key "${item.label || item.id}" cooldown period ended. Re-enabling for rotation.`);
        }
      }
    });

    if (stateChanged) {
      this.saveToFile();
    }

    // Filter eligible: enabled && status is available
    let eligible = pool.filter(k => k.enabled && (k.status === 'available' || !k.status));

    // If no available keys, but we have exhausted keys whose cooldown hasn't passed, check if ALL enabled keys are exhausted
    if (eligible.length === 0) {
      const allEnabled = pool.filter(k => k.enabled && k.status !== 'disabled' && k.status !== 'invalid');
      // If all configured keys are marked exhausted, allow trying the oldest exhausted key so quota resets take effect immediately
      if (allEnabled.length > 0) {
        allEnabled.sort((a, b) => (a.exhaustedAt || 0) - (b.exhaustedAt || 0));
        eligible = [allEnabled[0]];
      }
    }

    // Sort by priority ascending
    return eligible.sort((a, b) => (a.priority || 0) - (b.priority || 0));
  }

  /**
   * Adds a new API key to the pool
   */
  public addTtsKey(params: { key: string; label?: string; enabled?: boolean; priority?: number }): TTSApiKeyPublicEntry {
    const rawKey = (params.key || '').trim();
    if (!rawKey) {
      throw new Error('API key cannot be empty');
    }

    const pool = this.ttsSettings.apiKeyPool || [];
    const id = `key-${Date.now()}-${crypto.randomBytes(3).toString('hex')}`;
    const nextPriority = params.priority ?? (pool.length > 0 ? Math.max(...pool.map(k => k.priority || 0)) + 1 : 1);
    const label = params.label?.trim() || `ElevenLabs Key #${pool.length + 1}`;

    const newEntry: TTSApiKeyEntry = {
      id,
      label,
      key: rawKey,
      maskedKey: maskApiKey(rawKey),
      enabled: params.enabled ?? true,
      status: 'available',
      priority: nextPriority,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    pool.push(newEntry);
    this.ttsSettings.apiKeyPool = pool;
    this.saveToFile();

    const { key, ...publicEntry } = newEntry;
    return publicEntry;
  }

  /**
   * Updates an existing API key entry
   */
  public updateTtsKey(
    id: string,
    updates: Partial<{ key: string; label: string; enabled: boolean; priority: number }>,
    force = false
  ): TTSApiKeyPublicEntry {
    const pool = this.ttsSettings.apiKeyPool || [];
    const entry = pool.find(k => k.id === id);
    if (!entry) {
      throw new Error(`API key with ID "${id}" not found.`);
    }

    if (updates.key !== undefined) {
      const clean = updates.key.trim();
      if (!clean) {
        throw new Error('API key cannot be empty.');
      }
      if (!clean.includes('••••') && !clean.includes('Configured')) {
        entry.key = clean;
        entry.maskedKey = maskApiKey(clean);
        // Reset pool status upon key replacement
        entry.status = 'available';
        entry.exhaustedAt = undefined;
        entry.lastError = undefined;
      }
    }

    if (updates.label !== undefined && updates.label.trim()) {
      entry.label = updates.label.trim();
    }

    if (updates.enabled !== undefined) {
      entry.enabled = updates.enabled;
      if (!updates.enabled) {
        entry.status = 'disabled';
      } else if (entry.status === 'disabled') {
        entry.status = 'available';
      }
    }

    if (updates.priority !== undefined && typeof updates.priority === 'number') {
      entry.priority = updates.priority;
    }

    entry.updatedAt = new Date().toISOString();
    this.saveToFile();

    const { key, ...publicEntry } = entry;
    return publicEntry;
  }

  /**
   * Deletes an API key with last-key safety check
   */
  public deleteTtsKey(id: string, force = false): { success: boolean; requiresConfirmation?: boolean; message: string; remainingCount: number } {
    const pool = this.ttsSettings.apiKeyPool || [];
    const index = pool.findIndex(k => k.id === id);
    if (index === -1) {
      throw new Error(`API key with ID "${id}" not found.`);
    }

    // Safety check: is this the last key in the pool?
    const activeKeys = pool.filter(k => k.enabled);
    const isLastConfiguredKey = pool.length === 1;
    const isLastActiveKey = activeKeys.length === 1 && pool[index].enabled;

    if ((isLastConfiguredKey || isLastActiveKey) && !force) {
      return {
        success: false,
        requiresConfirmation: true,
        message: 'This is the last configured ElevenLabs API key. Deleting it will disable ElevenLabs API access until a new key is added.',
        remainingCount: pool.length
      };
    }

    pool.splice(index, 1);
    this.ttsSettings.apiKeyPool = pool;
    this.saveToFile();

    return {
      success: true,
      message: 'ElevenLabs API key deleted successfully from pool.',
      remainingCount: pool.length
    };
  }

  /**
   * Toggles enabled/disabled state of a key
   */
  public toggleTtsKey(id: string): TTSApiKeyPublicEntry {
    const pool = this.ttsSettings.apiKeyPool || [];
    const entry = pool.find(k => k.id === id);
    if (!entry) {
      throw new Error(`API key with ID "${id}" not found.`);
    }

    entry.enabled = !entry.enabled;
    entry.status = entry.enabled ? 'available' : 'disabled';
    entry.updatedAt = new Date().toISOString();
    this.saveToFile();

    const { key, ...publicEntry } = entry;
    return publicEntry;
  }

  /**
   * Reveals raw secret key for an authorized administrator request
   */
  public revealTtsKey(id: string): string {
    const pool = this.ttsSettings.apiKeyPool || [];
    const entry = pool.find(k => k.id === id);
    if (!entry) {
      throw new Error(`API key with ID "${id}" not found.`);
    }
    return entry.key;
  }

  /**
   * Marks key quota exhausted with timestamp for automatic cooldown reset
   */
  public markKeyQuotaExhausted(id: string, reason?: string): void {
    const pool = this.ttsSettings.apiKeyPool || [];
    const entry = pool.find(k => k.id === id);
    if (entry) {
      entry.status = 'quota_exhausted';
      entry.exhaustedAt = Date.now();
      entry.lastError = reason || 'Quota exhausted';
      entry.updatedAt = new Date().toISOString();
      this.saveToFile();
    }
  }

  /**
   * Marks key invalid (e.g. 401 unauthorized)
   */
  public markKeyInvalid(id: string, reason?: string): void {
    const pool = this.ttsSettings.apiKeyPool || [];
    const entry = pool.find(k => k.id === id);
    if (entry) {
      entry.status = 'invalid';
      entry.lastError = reason || 'Invalid API key';
      entry.updatedAt = new Date().toISOString();
      this.saveToFile();
    }
  }

  /**
   * Records usage timestamp when a key successfully generates audio
   */
  public recordKeyUsage(id: string): void {
    const pool = this.ttsSettings.apiKeyPool || [];
    const entry = pool.find(k => k.id === id);
    if (entry) {
      entry.lastUsedAt = new Date().toISOString();
      if (entry.status !== 'available') {
        entry.status = 'available';
      }
      entry.lastError = undefined;
      entry.updatedAt = new Date().toISOString();
      this.saveToFile();
    }
  }

  /**
   * Updates key subscription health test result
   */
  public updateKeyHealth(id: string, health: any): void {
    const pool = this.ttsSettings.apiKeyPool || [];
    const entry = pool.find(k => k.id === id);
    if (entry) {
      entry.lastTestedAt = new Date().toISOString();
      if (health.tier) entry.tier = health.tier;
      if (health.characterCount !== undefined) entry.characterCount = health.characterCount;
      if (health.characterLimit !== undefined) entry.characterLimit = health.characterLimit;
      if (health.remainingCharacters !== undefined) entry.remainingCharacters = health.remainingCharacters;

      if (health.healthy) {
        entry.status = 'available';
        entry.exhaustedAt = undefined;
        entry.lastError = undefined;
      } else {
        const msg = health.message || '';
        if (msg.includes('quota') || msg.includes('limit') || health.remainingCharacters === 0) {
          entry.status = 'quota_exhausted';
          entry.exhaustedAt = Date.now();
        } else if (msg.includes('invalid')) {
          entry.status = 'invalid';
        }
        entry.lastError = msg;
      }
      entry.updatedAt = new Date().toISOString();
      this.saveToFile();
    }
  }

  public getTtsStats(): TTSStats {
    return { ...this.ttsStats };
  }

  public recordTtsUsage(params: { success: boolean; cached: boolean; chars: number; modelId: string; voiceId: string }): void {
    this.ttsStats.totalRequests++;
    if (params.cached) {
      this.ttsStats.cachedPlays++;
    }
    if (params.success) {
      this.ttsStats.successfulGenerations++;
      this.ttsStats.totalCharactersSynthesized += params.chars;
    } else {
      this.ttsStats.failedGenerations++;
    }
    this.ttsStats.lastUsedAt = new Date().toISOString();
    this.ttsStats.lastModelId = params.modelId;
    this.ttsStats.lastVoiceId = params.voiceId;
    this.saveToFile();
  }
}
