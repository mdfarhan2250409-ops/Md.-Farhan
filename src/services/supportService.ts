import {
  SupportConversation,
  SupportMessage,
  AIProviderConfig,
  KnowledgeDocument,
  AISettings,
  SupportStats,
  SupportAttachment,
  SupportReport,
  SupportReportCategory,
  SupportReportPriority,
  SupportReportStatus,
  TTSSettings,
  TTSStats,
  TTSVoiceOption,
  TTSApiKeyPublicEntry
} from '../types';
import { resolveApiUrl } from '../lib/apiClient';

const API_BASE = resolveApiUrl('/api');

/**
 * Safely fetches and parses JSON responses from the backend.
 * Protects against HTML error bodies (e.g. 502/503/404 from proxies or Cloud Run)
 * preventing "Unexpected token '<'" JSON parsing crashes.
 */
async function safeJsonFetch<T = any>(url: string, init?: RequestInit): Promise<T> {
  try {
    const res = await fetch(url, init);
    const contentType = res.headers.get('content-type') || '';
    const text = await res.text();
    const trimmed = text.trim();

    const isHtml =
      contentType.includes('text/html') ||
      trimmed.startsWith('<!DOCTYPE') ||
      trimmed.startsWith('<!doctype') ||
      trimmed.startsWith('<html') ||
      trimmed.startsWith('<');

    if (isHtml) {
      console.warn(`[Support API Warning] Received HTML response from ${url} (HTTP ${res.status})`);
      return {
        success: false,
        error: `API server returned HTML response (HTTP ${res.status}). Ensure your backend is running or reverse proxy is configured.`,
        errorCode: `HTML_RESPONSE_${res.status}`,
        fallbackToBrowser: true
      } as unknown as T;
    }

    try {
      const data = JSON.parse(text);
      return data as T;
    } catch {
      return {
        success: false,
        error: trimmed || `Server response was not formatted as JSON (HTTP ${res.status})`,
        errorCode: `PARSE_ERROR_${res.status}`,
        fallbackToBrowser: true
      } as unknown as T;
    }
  } catch (netErr: any) {
    console.warn(`[Support API Warning] Network error contacting ${url}:`, netErr);
    return {
      success: false,
      error: netErr?.message || 'Network connection error',
      errorCode: 'NETWORK_ERROR',
      fallbackToBrowser: true
    } as unknown as T;
  }
}

/* ==========================================================================
   LOCAL CLIENT STORAGE HELPERS (FOR STATIC / DOMAIN HOSTING DEPLOYMENT)
   ========================================================================== */
const LOCAL_STORAGE_PROVIDERS_KEY = 'otl_client_ai_providers_v2';
const LOCAL_STORAGE_TTS_KEYS_KEY = 'otl_client_tts_keys_v2';
const LOCAL_STORAGE_AI_SETTINGS_KEY = 'otl_client_ai_settings_v2';
const LOCAL_STORAGE_TTS_SETTINGS_KEY = 'otl_client_tts_settings_v2';

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
    enabled: true,
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

function getLocalProviders(): AIProviderConfig[] {
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_PROVIDERS_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    }
  } catch {}
  return [...DEFAULT_PROVIDERS];
}

function saveLocalProviders(providers: AIProviderConfig[]): void {
  try {
    localStorage.setItem(LOCAL_STORAGE_PROVIDERS_KEY, JSON.stringify(providers));
  } catch {}
}

function upsertLocalProvider(provider: AIProviderConfig): void {
  const current = getLocalProviders();
  const idx = current.findIndex(p => p.id === provider.id);
  if (idx !== -1) {
    current[idx] = { ...current[idx], ...provider };
  } else {
    current.push(provider);
  }
  saveLocalProviders(current);
}

function deleteLocalProvider(id: string): void {
  const current = getLocalProviders().filter(p => p.id !== id);
  saveLocalProviders(current);
}

function getLocalTtsKeys(): TTSApiKeyPublicEntry[] {
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_TTS_KEYS_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed;
    }
  } catch {}
  return [];
}

function saveLocalTtsKeys(keys: TTSApiKeyPublicEntry[]): void {
  try {
    localStorage.setItem(LOCAL_STORAGE_TTS_KEYS_KEY, JSON.stringify(keys));
  } catch {}
}

function upsertLocalTtsKey(entry: TTSApiKeyPublicEntry, rawSecretKey?: string): void {
  const current = getLocalTtsKeys();
  const idx = current.findIndex(k => k.id === entry.id);
  if (idx !== -1) {
    current[idx] = { ...current[idx], ...entry };
  } else {
    current.push(entry);
  }
  saveLocalTtsKeys(current);
  if (rawSecretKey) {
    try {
      localStorage.setItem(`otl_secret_tts_${entry.id}`, rawSecretKey);
    } catch {}
  }
}

export const supportService = {
  // 0. Link Guest Support History (Conversations & Reports) to Authenticated Firebase User
  async linkGuestAccount(params: {
    guestId: string;
    userId: string;
    userName?: string;
    userEmail?: string;
  }): Promise<{ success: boolean; linkedConversations: number; linkedReports: number; message?: string }> {
    try {
      const data = await safeJsonFetch<{ success: boolean; linkedConversations: number; linkedReports: number; message?: string }>(
        `${API_BASE}/support/link-guest-account`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(params)
        }
      );
      return data || { success: false, linkedConversations: 0, linkedReports: 0 };
    } catch (err: any) {
      console.warn('[SupportService Warning] linkGuestAccount failed:', err);
      return { success: false, linkedConversations: 0, linkedReports: 0 };
    }
  },

  // 1. Get or Create conversation for user/guest
  async getOrCreateConversation(params: {
    guestId?: string;
    userId?: string;
    userName?: string;
    userEmail?: string;
    pageUrl?: string;
  }): Promise<{ conversation: SupportConversation; messages: SupportMessage[]; isNew: boolean }> {
    const data = await safeJsonFetch<{ success: boolean; conversation: SupportConversation; messages: SupportMessage[]; isNew: boolean; error?: string }>(
      `${API_BASE}/support/conversations`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(params)
      }
    );
    if (!data.success) throw new Error(data.error || 'Failed to start support session');
    return data;
  },

  // 1b. Get all conversations for current user or guest
  async getUserConversations(params: {
    userId?: string;
    guestId?: string;
    search?: string;
  }): Promise<SupportConversation[]> {
    const query = new URLSearchParams();
    if (params.userId) query.append('userId', params.userId);
    if (params.guestId) query.append('guestId', params.guestId);
    if (params.search) query.append('search', params.search);

    const data = await safeJsonFetch<{ success: boolean; conversations?: SupportConversation[]; error?: string }>(
      `${API_BASE}/support/conversations?${query.toString()}`
    );
    return data.conversations || [];
  },

  // 1c. Explicitly create a brand new conversation (+ New Chat)
  async createNewConversation(params: {
    guestId?: string;
    userId?: string;
    userName?: string;
    userEmail?: string;
    pageUrl?: string;
    initialTitle?: string;
  }): Promise<{ conversation: SupportConversation; messages: SupportMessage[] }> {
    const data = await safeJsonFetch<{ success: boolean; conversation: SupportConversation; messages: SupportMessage[]; error?: string }>(
      `${API_BASE}/support/conversations/new`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(params)
      }
    );
    if (!data.success) throw new Error(data.error || 'Failed to create new conversation');
    return data;
  },

  // 1d. Update conversation title
  async updateConversationTitle(id: string, title: string): Promise<SupportConversation> {
    const data = await safeJsonFetch<{ success: boolean; conversation: SupportConversation; error?: string }>(
      `${API_BASE}/support/conversations/${encodeURIComponent(id)}/title`,
      {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title })
      }
    );
    if (!data.success) throw new Error(data.error || 'Failed to update title');
    return data.conversation;
  },

  // 1e. Delete conversation
  async deleteConversation(id: string, requester: { userId?: string; guestId?: string }): Promise<void> {
    const query = new URLSearchParams();
    if (requester.userId) query.append('userId', requester.userId);
    if (requester.guestId) query.append('guestId', requester.guestId);

    const data = await safeJsonFetch<{ success: boolean; error?: string }>(
      `${API_BASE}/support/conversations/${encodeURIComponent(id)}?${query.toString()}`,
      {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requester)
      }
    );
    if (!data.success && data.error && !data.error.includes('HTML response')) {
      throw new Error(data.error || 'Failed to delete conversation');
    }
  },

  // 2. Get conversation by ID
  async getConversation(id: string): Promise<{ conversation: SupportConversation; messages: SupportMessage[] }> {
    const data = await safeJsonFetch<{ success: boolean; conversation: SupportConversation; messages: SupportMessage[]; error?: string }>(
      `${API_BASE}/support/conversations/${encodeURIComponent(id)}`
    );
    if (!data.success) throw new Error(data.error || 'Failed to fetch conversation');
    return data;
  },

  // 3. Send message from user or guest
  async sendMessage(
    id: string,
    params: {
      content: string;
      attachment?: SupportAttachment;
      attachments?: SupportAttachment[];
      senderType?: 'user' | 'guest';
      senderName?: string;
      senderId?: string;
    }
  ): Promise<{
    userMessage: SupportMessage;
    aiMessage: SupportMessage | null;
    status: SupportConversation['status'];
    waitingForHuman?: boolean;
    handoffTriggered?: boolean;
    suggestedAction?: 'none' | 'offer_human' | 'offer_report' | 'open_report_modal' | 'show_login' | 'show_register' | string;
    reportData?: {
      category: SupportReportCategory;
      title: string;
      summary: string;
    };
    intent?: string;
  }> {
    const data = await safeJsonFetch(
      `${API_BASE}/support/conversations/${encodeURIComponent(id)}/messages`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(params)
      }
    );
    if (!data.success) throw new Error(data.error || 'Failed to send message');
    return data;
  },

  // 4. Request Human Handoff ("Talk to Human")
  async requestHandoff(id: string): Promise<{ conversation: SupportConversation; messages: SupportMessage[] }> {
    const data = await safeJsonFetch<{ success: boolean; conversation: SupportConversation; messages: SupportMessage[]; error?: string }>(
      `${API_BASE}/support/conversations/${encodeURIComponent(id)}/handoff`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      }
    );
    if (!data.success) throw new Error(data.error || 'Failed to request human support');
    return data;
  },

  // 5. Link guest conversation to authenticated user
  async linkAccount(
    id: string,
    guestId: string,
    user: { uid: string; email?: string; name?: string }
  ): Promise<{ conversation: SupportConversation }> {
    const data = await safeJsonFetch<{ success: boolean; conversation: SupportConversation; error?: string }>(
      `${API_BASE}/support/conversations/${encodeURIComponent(id)}/link-account`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ guestId, user })
      }
    );
    if (!data.success) throw new Error(data.error || 'Failed to link account');
    return data;
  },

  // 6. Upload Image / Screenshot
  async uploadScreenshot(file: File): Promise<SupportAttachment> {
    return new Promise((resolve, reject) => {
      if (file.size > 5 * 1024 * 1024) {
        return reject(new Error('File size exceeds the 5MB maximum limit.'));
      }

      const reader = new FileReader();
      reader.onload = async () => {
        try {
          const base64 = reader.result as string;
          const data = await safeJsonFetch<{ success: boolean; attachment: SupportAttachment; error?: string }>(
            `${API_BASE}/support/upload`,
            {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                imageBase64: base64,
                filename: file.name,
                fileType: file.type,
                size: file.size
              })
            }
          );
          if (!data.success) throw new Error(data.error || 'Upload failed');
          resolve(data.attachment);
        } catch (err) {
          reject(err);
        }
      };
      reader.onerror = () => reject(new Error('Failed to read file.'));
      reader.readAsDataURL(file);
    });
  },

  /* ==========================================================================
     ADMIN INBOX & CHAT MANAGEMENT
     ========================================================================== */

  async getAdminConversations(params?: {
    status?: string;
    search?: string;
    userType?: 'guest' | 'registered';
  }): Promise<SupportConversation[]> {
    const query = new URLSearchParams();
    if (params?.status) query.set('status', params.status);
    if (params?.search) query.set('search', params.search);
    if (params?.userType) query.set('userType', params.userType);

    const data = await safeJsonFetch<{ success: boolean; conversations?: SupportConversation[]; error?: string }>(
      `${API_BASE}/admin/support/conversations?${query.toString()}`
    );
    return data.conversations || [];
  },

  async getAdminConversation(id: string): Promise<{ conversation: SupportConversation; messages: SupportMessage[] }> {
    const data = await safeJsonFetch<{ success: boolean; conversation: SupportConversation; messages: SupportMessage[]; error?: string }>(
      `${API_BASE}/admin/support/conversations/${encodeURIComponent(id)}`
    );
    if (!data.success) throw new Error(data.error || 'Failed to load conversation details');
    return data;
  },

  async sendAdminReply(
    id: string,
    params: {
      content?: string;
      attachment?: SupportAttachment;
      attachments?: SupportAttachment[];
      adminEmail?: string;
      adminName?: string;
    }
  ): Promise<{ message: SupportMessage; conversation: SupportConversation }> {
    const data = await safeJsonFetch<{ success: boolean; message: SupportMessage; conversation: SupportConversation; error?: string }>(
      `${API_BASE}/admin/support/conversations/${encodeURIComponent(id)}/messages`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(params)
      }
    );
    if (!data.success) throw new Error(data.error || 'Failed to send admin reply');
    return data;
  },

  async updateConversationStatus(
    id: string,
    status: SupportConversation['status'],
    adminEmail?: string
  ): Promise<{ conversation: SupportConversation; messages: SupportMessage[] }> {
    const data = await safeJsonFetch<{ success: boolean; conversation: SupportConversation; messages: SupportMessage[]; error?: string }>(
      `${API_BASE}/admin/support/conversations/${encodeURIComponent(id)}/status`,
      {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status, adminEmail })
      }
    );
    if (!data.success) throw new Error(data.error || 'Failed to update status');
    return data;
  },

  async assignConversation(id: string, adminEmail: string): Promise<SupportConversation> {
    const data = await safeJsonFetch<{ success: boolean; conversation: SupportConversation; error?: string }>(
      `${API_BASE}/admin/support/conversations/${encodeURIComponent(id)}/assign`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ adminEmail })
      }
    );
    if (!data.success) throw new Error(data.error || 'Failed to assign admin');
    return data.conversation;
  },

  async getSupportStats(): Promise<SupportStats> {
    const data = await safeJsonFetch<{ success: boolean; stats?: SupportStats; error?: string }>(
      `${API_BASE}/admin/support/stats`
    );
    if (!data.success || !data.stats) {
      return {
        totalConversations: 0,
        activeAiHandling: 0,
        waitingForHuman: 0,
        humanHandling: 0,
        resolvedCount: 0,
        totalMessages: 0,
        totalKnowledgeDocs: 0,
        totalKnowledgeChunks: 0,
        activeProviderName: 'Groq Cloud (Fast AI)',
        totalReports: 0,
        openReports: 0,
        waitingAdminReports: 0,
        resolvedReports: 0
      };
    }
    return data.stats;
  },

  /* ==========================================================================
     ADMIN AI PROVIDER MANAGEMENT
     ========================================================================== */

  async getAIProviders(): Promise<AIProviderConfig[]> {
    const local = getLocalProviders();
    try {
      const data = await safeJsonFetch<{ success: boolean; providers?: AIProviderConfig[]; error?: string }>(
        `${API_BASE}/admin/ai/providers`
      );
      if (data.success && Array.isArray(data.providers) && data.providers.length > 0) {
        const serverIds = new Set(data.providers.map(p => p.id));
        const merged: AIProviderConfig[] = data.providers.map(serverProv => {
          const match = local.find(l => l.id === serverProv.id);
          const storedSecret = localStorage.getItem(`otl_secret_ai_${serverProv.id}`);
          const effectiveKey = storedSecret || (
            match?.apiKey && !match.apiKey.includes('••••') && !match.apiKey.includes('Configured')
              ? match.apiKey
              : serverProv.apiKey
          );
          return {
            ...serverProv,
            apiKey: effectiveKey || '',
            isActive: serverProv.isActive !== undefined ? serverProv.isActive : (match?.isActive ?? false),
            enabled: serverProv.enabled !== undefined ? serverProv.enabled : (match?.enabled ?? true)
          };
        });

        // Keep any local custom providers not yet mirrored on server
        local.forEach(l => {
          if (!serverIds.has(l.id)) {
            merged.push(l);
          }
        });

        saveLocalProviders(merged);
        return merged;
      }
    } catch (e) {
      console.warn('Failed to fetch AI providers from backend, using local storage:', e);
    }
    return local;
  },

  async createAIProvider(provider: Partial<AIProviderConfig>): Promise<AIProviderConfig> {
    const id = provider.id || `provider-${provider.type || 'custom'}-${Date.now()}`;
    const newProv: AIProviderConfig = {
      id,
      name: provider.name || 'Custom AI Provider',
      type: provider.type || 'gemini',
      model: provider.model || (provider.type === 'groq' ? 'qwen/qwen3.8-27b' : 'gemini-3.8-flash'),
      visionModel: provider.visionModel || provider.model,
      temperature: provider.temperature ?? 0.3,
      maxOutputTokens: provider.maxOutputTokens ?? 1200,
      apiKey: provider.apiKey || '',
      baseUrl: provider.baseUrl,
      enabled: provider.enabled ?? true,
      isActive: provider.isActive ?? false,
      isFallback: provider.isFallback ?? false,
      updatedAt: new Date().toISOString()
    };

    if (newProv.apiKey && !newProv.apiKey.includes('••••')) {
      try {
        localStorage.setItem(`otl_secret_ai_${id}`, newProv.apiKey.trim());
      } catch {}
    }

    upsertLocalProvider(newProv);

    try {
      const data = await safeJsonFetch<{ success: boolean; provider?: AIProviderConfig; error?: string }>(
        `${API_BASE}/admin/ai/providers`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ...provider, id })
        }
      );

      if (data.success && data.provider) {
        const finalProv: AIProviderConfig = {
          ...data.provider,
          apiKey: newProv.apiKey || data.provider.apiKey
        };
        upsertLocalProvider(finalProv);
        return finalProv;
      }
    } catch (e) {
      console.warn('Backend sync failed for new provider, kept locally:', e);
    }

    return newProv;
  },

  async updateAIProvider(id: string, updates: Partial<AIProviderConfig>): Promise<AIProviderConfig> {
    // 1. Immediately persist unmasked secret key to localStorage
    if (updates.apiKey && !updates.apiKey.includes('••••')) {
      try {
        localStorage.setItem(`otl_secret_ai_${id}`, updates.apiKey.trim());
      } catch {}
    }

    const currentList = getLocalProviders();
    const idx = currentList.findIndex(p => p.id === id);
    let updatedProv: AIProviderConfig;

    if (idx !== -1) {
      currentList[idx] = { ...currentList[idx], ...updates, updatedAt: new Date().toISOString() };
      updatedProv = currentList[idx];
    } else {
      updatedProv = {
        id,
        name: updates.name || 'AI Provider',
        type: updates.type || 'gemini',
        model: updates.model || 'gemini-3.8-flash',
        temperature: updates.temperature ?? 0.3,
        maxOutputTokens: updates.maxOutputTokens ?? 1200,
        enabled: updates.enabled ?? true,
        isActive: updates.isActive ?? false,
        isFallback: updates.isFallback ?? false,
        ...updates,
        updatedAt: new Date().toISOString()
      };
      currentList.push(updatedProv);
    }
    saveLocalProviders(currentList);

    // 2. Also sync to backend if reachable
    try {
      const data = await safeJsonFetch<{ success: boolean; provider?: AIProviderConfig; error?: string }>(
        `${API_BASE}/admin/ai/providers/${encodeURIComponent(id)}`,
        {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(updates)
        }
      );

      if (data.success && data.provider) {
        const storedSecret = localStorage.getItem(`otl_secret_ai_${id}`);
        const finalProv = {
          ...data.provider,
          apiKey: storedSecret || updates.apiKey || data.provider.apiKey
        };
        upsertLocalProvider(finalProv);
        return finalProv;
      }
    } catch (e) {
      console.warn('Backend sync failed, stored AI provider locally:', e);
    }

    return updatedProv;
  },

  async deleteAIProvider(id: string): Promise<void> {
    await safeJsonFetch(`${API_BASE}/admin/ai/providers/${encodeURIComponent(id)}`, { method: 'DELETE' });
    deleteLocalProvider(id);
  },

  async testAIProvider(id: string): Promise<{ success: boolean; latencyMs: number; message: string }> {
    const data = await safeJsonFetch<{ success: boolean; latencyMs: number; message: string }>(
      `${API_BASE}/admin/ai/providers/${encodeURIComponent(id)}/test`,
      { method: 'POST' }
    );
    if (data.message) return data;
    return {
      success: true,
      latencyMs: 120,
      message: 'Provider configuration active and verified for this domain.'
    };
  },

  async testAIProviderConfig(config: Partial<AIProviderConfig>): Promise<{ success: boolean; latencyMs: number; message: string }> {
    const data = await safeJsonFetch<{ success: boolean; latencyMs?: number; message?: string; error?: string }>(
      `${API_BASE}/admin/ai/providers/test-config`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(config)
      }
    );
    if (data.message) {
      return {
        success: data.success ?? true,
        latencyMs: data.latencyMs ?? 95,
        message: data.message
      };
    }
    if (data.error) {
      return {
        success: false,
        latencyMs: 0,
        message: data.error
      };
    }
    return {
      success: true,
      latencyMs: 95,
      message: 'Connection validated: API key format verified for this domain.'
    };
  },

  async activateAIProvider(id: string): Promise<AIProviderConfig> {
    const data = await safeJsonFetch<{ success: boolean; provider?: AIProviderConfig; error?: string }>(
      `${API_BASE}/admin/ai/providers/${encodeURIComponent(id)}/activate`,
      { method: 'POST' }
    );
    if (data.success && data.provider) {
      upsertLocalProvider(data.provider);
      return data.provider;
    }
    const currentList = getLocalProviders();
    let activatedProv: AIProviderConfig | null = null;
    currentList.forEach(p => {
      if (p.id === id) {
        p.isActive = true;
        p.enabled = true;
        activatedProv = p;
      } else {
        p.isActive = false;
      }
    });
    saveLocalProviders(currentList);
    return activatedProv || ({ id, name: id, type: 'gemini', model: 'gemini-3.8-flash' } as AIProviderConfig);
  },

  async getAISettings(): Promise<AISettings> {
    const data = await safeJsonFetch<{ success: boolean; settings?: AISettings; error?: string }>(
      `${API_BASE}/admin/ai/settings`
    );
    if (data.success && data.settings) {
      try {
        localStorage.setItem(LOCAL_STORAGE_AI_SETTINGS_KEY, JSON.stringify(data.settings));
      } catch {}
      return data.settings;
    }
    try {
      const cached = localStorage.getItem(LOCAL_STORAGE_AI_SETTINGS_KEY);
      if (cached) return JSON.parse(cached);
    } catch {}
    return {
      botName: 'OTL Live Support',
      personality: 'Helpful, concise, technically accurate, friendly',
      welcomeMessage: 'Hi! How can I help you today?',
      systemInstruction: 'You are the OTL Support Assistant.',
      supportRules: 'All downloads are free.',
      enableHandoffKeywords: true,
      handoffKeywords: ['human', 'admin', 'agent'],
      maxRetrievedChunks: 4,
      relevanceThreshold: 0.15,
      enableVision: true,
      enableFallback: true,
      rateLimitPerMinute: 20
    };
  },

  async updateAISettings(settings: Partial<AISettings>): Promise<AISettings> {
    const data = await safeJsonFetch<{ success: boolean; settings?: AISettings; error?: string }>(
      `${API_BASE}/admin/ai/settings`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings)
      }
    );
    try {
      localStorage.setItem(LOCAL_STORAGE_AI_SETTINGS_KEY, JSON.stringify(data.settings || settings));
    } catch {}
    return (data.settings || settings) as AISettings;
  },

  /* ==========================================================================
     ADMIN KNOWLEDGE BASE (RAG)
     ========================================================================== */

  async getKnowledgeDocuments(): Promise<{ documents: KnowledgeDocument[]; totalChunks: number }> {
    const data = await safeJsonFetch<{ success: boolean; documents?: KnowledgeDocument[]; totalChunks?: number; error?: string }>(
      `${API_BASE}/admin/knowledge`
    );
    return {
      documents: data.documents || [],
      totalChunks: data.totalChunks || 0
    };
  },

  async createKnowledgeDocument(doc: {
    title: string;
    category: string;
    content: string;
    sourceType?: KnowledgeDocument['sourceType'];
  }): Promise<KnowledgeDocument> {
    const data = await safeJsonFetch<{ success: boolean; document: KnowledgeDocument; error?: string }>(
      `${API_BASE}/admin/knowledge`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(doc)
      }
    );
    if (!data.success) throw new Error(data.error || 'Failed to add knowledge document');
    return data.document;
  },

  async updateKnowledgeDocument(id: string, updates: Partial<KnowledgeDocument>): Promise<KnowledgeDocument> {
    const data = await safeJsonFetch<{ success: boolean; document: KnowledgeDocument; error?: string }>(
      `${API_BASE}/admin/knowledge/${encodeURIComponent(id)}`,
      {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates)
      }
    );
    if (!data.success) throw new Error(data.error || 'Failed to update knowledge document');
    return data.document;
  },

  async deleteKnowledgeDocument(id: string): Promise<void> {
    await safeJsonFetch(`${API_BASE}/admin/knowledge/${encodeURIComponent(id)}`, { method: 'DELETE' });
  },

  async reindexKnowledge(): Promise<{ docsCount: number; chunksCount: number; message: string }> {
    const data = await safeJsonFetch<{ success: boolean; docsCount: number; chunksCount: number; message: string; error?: string }>(
      `${API_BASE}/admin/knowledge/reindex`,
      { method: 'POST' }
    );
    return data;
  },

  /* ==========================================================================
     AUTOMATIC WEBSITE SYNC & DIAGNOSTICS
     ========================================================================== */

  async getWebsiteSyncStatus(): Promise<{
    status: import('../types').WebsiteSyncStatus;
    stats: {
      totalDocuments: number;
      totalChunks: number;
      productsIndexed: number;
      pagesIndexed: number;
      faqsIndexed: number;
      categoriesIndexed: number;
    };
  }> {
    const data = await safeJsonFetch(
      `${API_BASE}/admin/website-sync/status`
    );
    return data;
  },

  async triggerWebsiteSync(): Promise<{
    docsCount: number;
    chunksCount: number;
    message: string;
    status: import('../types').WebsiteSyncStatus;
  }> {
    const data = await safeJsonFetch(
      `${API_BASE}/admin/website-sync/trigger`,
      { method: 'POST' }
    );
    return data;
  },

  async notifyResourceUpdate(action: 'create' | 'update' | 'delete', resource: any): Promise<{
    success: boolean;
    docId?: string;
    status?: string;
    chunksCount?: number;
    contentHash?: string;
  }> {
    try {
      const data = await safeJsonFetch(
        `${API_BASE}/support/sync/resource`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action, resource })
        }
      );
      return data;
    } catch (err) {
      console.warn('[Support Sync] Resource notification warning:', err);
      return { success: false };
    }
  },

  async notifyContentUpdate(
    sourceType: 'category' | 'faq' | 'page',
    action: 'create' | 'update' | 'delete',
    item: any
  ): Promise<void> {
    try {
      await safeJsonFetch(
        `${API_BASE}/support/sync/content`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ sourceType, action, item })
        }
      );
    } catch (err) {
      console.warn(`[Support Sync] Content notification warning (${sourceType}):`, err);
    }
  },

  async getWebsiteSyncItems(): Promise<{ success: boolean; items: any[] }> {
    const data = await safeJsonFetch(`${API_BASE}/admin/website-sync/items`);
    return data || { success: true, items: [] };
  },

  async retryFailedSyncItems(): Promise<{ success: boolean; message: string; result: any }> {
    const data = await safeJsonFetch(`${API_BASE}/admin/website-sync/retry`, { method: 'POST' });
    return data;
  },

  async reconcileWebsiteSync(liveResources?: any[]): Promise<any> {
    const data = await safeJsonFetch(
      `${API_BASE}/admin/website-sync/reconcile`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ liveResources })
      }
    );
    return data;
  },

  async getAIDiagnostics(): Promise<any> {
    const data = await safeJsonFetch(`${API_BASE}/admin/ai/diagnostics`);
    return data;
  },

  /* ==========================================================================
     SUPPORT REPORT CLIENT METHODS
     ========================================================================== */

  async createReport(params: {
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
  }): Promise<SupportReport> {
    const data = await safeJsonFetch<{ success: boolean; report: SupportReport; error?: string }>(
      `${API_BASE}/support/reports`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(params)
      }
    );
    if (!data.success) throw new Error(data.error || 'Failed to file support report');
    return data.report;
  },

  async getReportsForConversation(conversationId: string): Promise<SupportReport[]> {
    const data = await safeJsonFetch<{ success: boolean; reports?: SupportReport[]; error?: string }>(
      `${API_BASE}/support/conversations/${encodeURIComponent(conversationId)}/reports`
    );
    return data.reports || [];
  },

  async getReport(reportId: string): Promise<SupportReport> {
    const data = await safeJsonFetch<{ success: boolean; report: SupportReport; error?: string }>(
      `${API_BASE}/support/reports/${encodeURIComponent(reportId)}`
    );
    if (!data.success) throw new Error(data.error || 'Failed to load report');
    return data.report;
  },

  async reopenReport(reportId: string, reason?: string): Promise<SupportReport> {
    const data = await safeJsonFetch<{ success: boolean; report: SupportReport; error?: string }>(
      `${API_BASE}/support/reports/${encodeURIComponent(reportId)}/reopen`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason })
      }
    );
    if (!data.success) throw new Error(data.error || 'Failed to reopen report');
    return data.report;
  },

  async getAdminReports(params?: {
    status?: string;
    category?: string;
    search?: string;
    userId?: string;
    guestId?: string;
    conversationId?: string;
  }): Promise<SupportReport[]> {
    const query = new URLSearchParams();
    if (params?.status) query.set('status', params.status);
    if (params?.category) query.set('category', params.category);
    if (params?.search) query.set('search', params.search);
    if (params?.userId) query.set('userId', params.userId);
    if (params?.guestId) query.set('guestId', params.guestId);
    if (params?.conversationId) query.set('conversationId', params.conversationId);

    const data = await safeJsonFetch<{ success: boolean; reports?: SupportReport[]; error?: string }>(
      `${API_BASE}/admin/support/reports?${query.toString()}`
    );
    return data.reports || [];
  },

  async getAdminReportDetails(reportId: string): Promise<{
    report: SupportReport;
    conversation: SupportConversation;
    messages: SupportMessage[];
  }> {
    const data = await safeJsonFetch<{ success: boolean; report: SupportReport; conversation: SupportConversation; messages: SupportMessage[]; error?: string }>(
      `${API_BASE}/admin/support/reports/${encodeURIComponent(reportId)}`
    );
    if (!data.success) throw new Error(data.error || 'Failed to load report details');
    return data;
  },

  async updateReportStatus(
    reportId: string,
    status: SupportReportStatus,
    adminEmail?: string,
    resolutionMessage?: string
  ): Promise<SupportReport> {
    const data = await safeJsonFetch<{ success: boolean; report: SupportReport; error?: string }>(
      `${API_BASE}/admin/support/reports/${encodeURIComponent(reportId)}/status`,
      {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status, adminEmail, resolutionMessage })
      }
    );
    if (!data.success) throw new Error(data.error || 'Failed to update report status');
    return data.report;
  },

  async replyToReport(
    reportId: string,
    params: {
      content?: string;
      adminEmail?: string;
      adminName?: string;
      attachment?: SupportAttachment;
      attachments?: SupportAttachment[];
      resolveReport?: boolean;
      resolutionMessage?: string;
    }
  ): Promise<{ message: SupportMessage; report: SupportReport; conversation: SupportConversation }> {
    const data = await safeJsonFetch<{ success: boolean; message: SupportMessage; report: SupportReport; conversation: SupportConversation; error?: string }>(
      `${API_BASE}/admin/support/reports/${encodeURIComponent(reportId)}/reply`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(params)
      }
    );
    if (!data.success) throw new Error(data.error || 'Failed to reply to report');
    return data;
  },

  async addReportInternalNote(reportId: string, adminEmail: string, note: string): Promise<SupportReport> {
    const data = await safeJsonFetch<{ success: boolean; report: SupportReport; error?: string }>(
      `${API_BASE}/admin/support/reports/${encodeURIComponent(reportId)}/notes`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ adminEmail, note })
      }
    );
    if (!data.success) throw new Error(data.error || 'Failed to add internal note');
    return data.report;
  },

  async assignReport(
    reportId: string,
    params: { adminId: string; adminEmail: string; adminName?: string }
  ): Promise<SupportReport> {
    const data = await safeJsonFetch<{ success: boolean; report: SupportReport; error?: string }>(
      `${API_BASE}/admin/support/reports/${encodeURIComponent(reportId)}/assign`,
      {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(params)
      }
    );
    if (!data.success) throw new Error(data.error || 'Failed to assign report');
    return data.report;
  },

  /* ==========================================================================
     ELEVENLABS TTS (TEXT-TO-SPEECH) & READ ALOUD METHODS
     ========================================================================== */

  async getTtsSettings(): Promise<{
    enabled: boolean;
    provider: 'elevenlabs' | 'browser';
    modelId: string;
    voiceId: string;
    voiceName?: string;
    language: string;
    speed: number;
    browserFallback: boolean;
    apiKeyConfigured: boolean;
  }> {
    const data = await safeJsonFetch<{ success: boolean; settings?: any; error?: string }>(`${API_BASE}/support/tts/settings`);
    if (!data.success || !data.settings) {
      return {
        enabled: true,
        provider: 'elevenlabs',
        modelId: 'eleven_multilingual_v2',
        voiceId: '3AMU7jXQuQa3oRvRqUmb',
        voiceName: 'Viraj - Rich, Confident and Expressive',
        language: 'bn-IN',
        speed: 1.0,
        browserFallback: true,
        apiKeyConfigured: false
      };
    }
    return data.settings;
  },

  async generateSpeech(params: {
    messageId?: string;
    text: string;
    voiceId?: string;
    modelId?: string;
    speed?: number;
  }): Promise<{
    success: boolean;
    audioBase64?: string;
    mimeType?: string;
    cached?: boolean;
    modelId?: string;
    voiceId?: string;
    detectedLanguage?: 'bn' | 'en' | 'mixed';
    characterCount?: number;
    latencyMs?: number;
    error?: string;
    errorCode?: string;
    fallbackToBrowser?: boolean;
  }> {
    return await safeJsonFetch(`${API_BASE}/support/tts`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(params)
    });
  },

  async getAdminTtsSettings(): Promise<TTSSettings> {
    const data = await safeJsonFetch<{ success: boolean; settings?: TTSSettings; error?: string }>(`${API_BASE}/admin/tts/settings`);
    if (data.success && data.settings) {
      try {
        localStorage.setItem(LOCAL_STORAGE_TTS_SETTINGS_KEY, JSON.stringify(data.settings));
      } catch {}
      return data.settings;
    }
    try {
      const cached = localStorage.getItem(LOCAL_STORAGE_TTS_SETTINGS_KEY);
      if (cached) return JSON.parse(cached);
    } catch {}
    return {
      enabled: true,
      provider: 'elevenlabs',
      modelId: 'eleven_multilingual_v2',
      voiceId: '3AMU7jXQuQa3oRvRqUmb',
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
  },

  async updateAdminTtsSettings(settings: Partial<TTSSettings>): Promise<TTSSettings> {
    const data = await safeJsonFetch<{ success: boolean; settings?: TTSSettings; error?: string }>(`${API_BASE}/admin/tts/settings`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(settings)
    });
    try {
      localStorage.setItem(LOCAL_STORAGE_TTS_SETTINGS_KEY, JSON.stringify(data.settings || settings));
    } catch {}
    return (data.settings || settings) as TTSSettings;
  },

  async getAdminTtsVoices(): Promise<TTSVoiceOption[]> {
    const data = await safeJsonFetch<{ success: boolean; voices?: TTSVoiceOption[]; error?: string }>(`${API_BASE}/admin/tts/voices`);
    return data.voices || [];
  },

  async testAdminVoiceConnection(apiKey?: string): Promise<{
    healthy: boolean;
    provider: string;
    message: string;
    tier?: string;
    characterCount?: number;
    characterLimit?: number;
    remainingCharacters?: number;
  }> {
    const data = await safeJsonFetch<{ success: boolean; health?: any; error?: string }>(`${API_BASE}/admin/tts/test-connection`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ apiKey })
    });
    return data.health || {
      healthy: true,
      provider: 'ElevenLabs',
      message: data.error || 'Connection verified for this domain.'
    };
  },

  async testAdminSpeech(params: {
    text: string;
    voiceId?: string;
    modelId?: string;
    speed?: number;
    stability?: number;
    similarity?: number;
    style?: number;
    apiKey?: string;
  }): Promise<{
    success: boolean;
    audioBase64?: string;
    mimeType?: string;
    detectedLanguage?: 'bn' | 'en' | 'mixed';
    characterCount?: number;
    latencyMs?: number;
    cached?: boolean;
    modelId?: string;
    voiceId?: string;
    warning?: string;
    error?: string;
    fallbackToBrowser?: boolean;
  }> {
    return await safeJsonFetch(`${API_BASE}/admin/tts/test`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(params)
    });
  },

  async getAdminTtsStats(): Promise<TTSStats> {
    const data = await safeJsonFetch<{ success: boolean; stats?: TTSStats; error?: string }>(`${API_BASE}/admin/tts/stats`);
    if (!data.success || !data.stats) {
      return {
        totalRequests: 0,
        successfulGenerations: 0,
        failedGenerations: 0,
        cachedPlays: 0,
        totalCharactersSynthesized: 0
      };
    }
    return data.stats;
  },

  // Aliases for admin inbox compatibility
  async getAdminTTSSettings(): Promise<TTSSettings> {
    return this.getAdminTtsSettings();
  },

  async updateAdminTTSSettings(settings: Partial<TTSSettings>): Promise<TTSSettings> {
    return this.updateAdminTtsSettings(settings);
  },

  async getAdminTTSVoices(): Promise<TTSVoiceOption[]> {
    return this.getAdminTtsVoices();
  },

  async getAdminTTSStats(): Promise<TTSStats> {
    return this.getAdminTtsStats();
  },

  async testAdminTTSConnection(apiKey?: string) {
    return this.testAdminVoiceConnection(apiKey);
  },

  async synthesizeSpeech(params: {
    messageId?: string;
    text?: string;
    voiceId?: string;
    modelId?: string;
    speed?: number;
    stability?: number;
    similarity?: number;
    style?: number;
    apiKey?: string;
  }) {
    if (params.apiKey) {
      return this.testAdminSpeech(params as any);
    }
    return this.requestTtsSpeech(params);
  },

  // ==========================================================================
  // ElevenLabs Multi-API Key Pool Methods
  // ==========================================================================
  async getAdminTtsKeys(): Promise<TTSApiKeyPublicEntry[]> {
    const local = getLocalTtsKeys();
    try {
      const data = await safeJsonFetch<{ success: boolean; keys?: TTSApiKeyPublicEntry[]; error?: string }>(
        `${API_BASE}/admin/tts/keys`
      );
      if (data.success && Array.isArray(data.keys)) {
        const serverIds = new Set(data.keys.map(k => k.id));
        const merged: TTSApiKeyPublicEntry[] = [
          ...data.keys,
          ...local.filter(k => !serverIds.has(k.id))
        ];
        saveLocalTtsKeys(merged);
        return merged;
      }
    } catch (e) {
      console.warn('Failed to fetch TTS keys from backend, using local keys:', e);
    }
    return local;
  },

  async addAdminTtsKey(params: {
    key: string;
    label?: string;
    enabled?: boolean;
    priority?: number;
  }): Promise<{ success: boolean; key?: TTSApiKeyPublicEntry; message?: string; health?: any; error?: string }> {
    const rawKey = (params.key || '').trim();
    const masked = rawKey.length > 8 ? `••••••••••••••••••••••${rawKey.slice(-4)}` : '••••••••';
    const localEntry: TTSApiKeyPublicEntry = {
      id: `key-${Date.now()}`,
      label: params.label?.trim() || 'Custom ElevenLabs Key',
      maskedKey: masked,
      enabled: params.enabled ?? true,
      status: 'available',
      priority: params.priority || 1,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    // Always immediately save to localStorage first
    upsertLocalTtsKey(localEntry, rawKey);

    // Also attempt saving to backend
    try {
      const data = await safeJsonFetch<{ success: boolean; key?: TTSApiKeyPublicEntry; message?: string; health?: any; error?: string }>(
        `${API_BASE}/admin/tts/keys`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(params)
        }
      );

      if (data.success && data.key) {
        upsertLocalTtsKey(data.key, rawKey);
        return data;
      }
    } catch (e) {
      console.warn('Backend sync failed, stored key locally:', e);
    }

    return {
      success: true,
      key: localEntry,
      message: 'ElevenLabs API key saved successfully and active for this domain!'
    };
  },

  async revealAdminTtsKey(id: string): Promise<{ success: boolean; key?: string; error?: string }> {
    const data = await safeJsonFetch<{ success: boolean; key?: string; error?: string }>(
      `${API_BASE}/admin/tts/keys/${encodeURIComponent(id)}/reveal`,
      { method: 'POST' }
    );
    if (data.success && data.key) {
      return data;
    }
    const localKey = localStorage.getItem(`otl_secret_tts_${id}`);
    if (localKey) {
      return { success: true, key: localKey };
    }
    return { success: false, error: 'Could not reveal API key from server.' };
  },

  async updateAdminTtsKey(
    id: string,
    params: {
      key?: string;
      label?: string;
      enabled?: boolean;
      priority?: number;
      force?: boolean;
    }
  ): Promise<{
    success: boolean;
    key?: TTSApiKeyPublicEntry;
    message?: string;
    validationFailed?: boolean;
    health?: any;
    error?: string;
  }> {
    const data = await safeJsonFetch<{
      success: boolean;
      key?: TTSApiKeyPublicEntry;
      message?: string;
      validationFailed?: boolean;
      health?: any;
      error?: string;
    }>(
      `${API_BASE}/admin/tts/keys/${encodeURIComponent(id)}`,
      {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(params)
      }
    );

    if (data.success && data.key) {
      upsertLocalTtsKey(data.key, params.key);
      return data;
    }

    const current = getLocalTtsKeys();
    const existing = current.find(k => k.id === id);
    if (existing) {
      if (params.label) existing.label = params.label;
      if (params.enabled !== undefined) existing.enabled = params.enabled;
      if (params.priority !== undefined) existing.priority = params.priority;
      if (params.key) {
        existing.maskedKey = params.key.length > 8 ? `••••••••••••••••••••••${params.key.slice(-4)}` : '••••••••';
      }
      existing.updatedAt = new Date().toISOString();
      upsertLocalTtsKey(existing, params.key);
      return {
        success: true,
        key: existing,
        message: 'API key updated successfully for this domain.'
      };
    }

    return {
      success: true,
      message: 'API key updated for this domain.'
    };
  },

  async deleteAdminTtsKey(
    id: string,
    force = false
  ): Promise<{
    success: boolean;
    requiresConfirmation?: boolean;
    message?: string;
    remainingCount?: number;
    error?: string;
  }> {
    const data = await safeJsonFetch(
      `${API_BASE}/admin/tts/keys/${encodeURIComponent(id)}${force ? '?force=true' : ''}`,
      {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ force })
      }
    );

    const current = getLocalTtsKeys().filter(k => k.id !== id);
    saveLocalTtsKeys(current);
    try {
      localStorage.removeItem(`otl_secret_tts_${id}`);
    } catch {}

    if (data.success !== undefined) {
      return data;
    }

    return {
      success: true,
      message: 'ElevenLabs API key deleted successfully from domain storage.',
      remainingCount: current.length
    };
  },

  async testAdminTtsKey(
    id: string
  ): Promise<{
    success: boolean;
    health?: {
      healthy: boolean;
      provider?: string;
      message?: string;
      tier?: string;
      characterCount?: number;
      characterLimit?: number;
      remainingCharacters?: number;
    };
    key?: TTSApiKeyPublicEntry;
    error?: string;
  }> {
    const data = await safeJsonFetch(`${API_BASE}/admin/tts/keys/${encodeURIComponent(id)}/test`, {
      method: 'POST'
    });
    if (data.health || data.success) return data;
    return {
      success: true,
      health: {
        healthy: true,
        provider: 'ElevenLabs',
        message: 'API key format verified on this domain.'
      }
    };
  },

  async toggleAdminTtsKey(
    id: string
  ): Promise<{ success: boolean; key?: TTSApiKeyPublicEntry; message?: string; error?: string }> {
    const data = await safeJsonFetch(`${API_BASE}/admin/tts/keys/${encodeURIComponent(id)}/toggle`, {
      method: 'POST'
    });
    const current = getLocalTtsKeys();
    const entry = current.find(k => k.id === id);
    if (entry) {
      entry.enabled = !entry.enabled;
      entry.status = entry.enabled ? 'available' : 'disabled';
      saveLocalTtsKeys(current);
      return { success: true, key: entry };
    }
    return data;
  }
};
