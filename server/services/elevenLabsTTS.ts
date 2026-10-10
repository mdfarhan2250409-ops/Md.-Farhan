import fs from 'fs';
import path from 'path';
import crypto from 'crypto';

export interface TTSRequestInput {
  text: string;
  voiceId?: string;
  modelId?: string;
  speed?: number;
  stability?: number;
  similarity?: number;
  style?: number;
  useSpeakerBoost?: boolean;
  outputFormat?: string;
  languageCode?: string;
  apiKey?: string;
}

export interface TTSResult {
  success: boolean;
  audioBuffer?: Buffer;
  audioBase64?: string;
  mimeType: string;
  characterCount: number;
  latencyMs: number;
  cached: boolean;
  modelId: string;
  voiceId: string;
  detectedLanguage: 'bn' | 'en' | 'mixed';
  error?: string;
  errorCode?: string;
  warning?: string;
}

export interface TTSHealthResult {
  healthy: boolean;
  provider: string;
  message: string;
  tier?: string;
  characterCount?: number;
  characterLimit?: number;
  remainingCharacters?: number;
  model?: string;
  activeVoiceId?: string;
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

export interface TTSProvider {
  generateSpeech(input: TTSRequestInput): Promise<TTSResult>;
  testConnection(apiKey?: string): Promise<TTSHealthResult>;
  getAvailableVoices(apiKey?: string): Promise<TTSVoiceOption[]>;
}

// Curated high-quality multilingual voices (Viraj, Rudra, George, Charlie, Sarah)
export const CURATED_VOICES: TTSVoiceOption[] = [
  {
    voice_id: '3AMU7jXQuQa3oRvRqUmb',
    name: 'Viraj - Rich, Confident and Expressive',
    category: 'community',
    description: 'Rich, Confident and Expressive (Paid API / Auto-fallback)',
    isBengaliCapable: true,
    labels: { accent: 'indian', gender: 'male', use_case: 'expressive' }
  },
  {
    voice_id: 'vIdhHAZdn1bGjKe1dFw8',
    name: 'Rudra - Intense Documentary Narrator',
    category: 'community',
    description: 'Intense Documentary Narrator (Paid API / Auto-fallback)',
    isBengaliCapable: true,
    labels: { accent: 'indian', gender: 'male', use_case: 'narration' }
  },
  {
    voice_id: 'JBFqnCBsd6RMkjVDRZzb',
    name: 'George - Warm, Captivating Storyteller',
    category: 'premade',
    description: 'Warm & Natural Narrator (Free & Paid Ready)',
    isBengaliCapable: true,
    labels: { accent: 'multilingual', gender: 'male', use_case: 'narration' }
  },
  {
    voice_id: 'IKne3meq5aSn9XLyUdCD',
    name: 'Charlie - Deep, Confident and Energetic',
    category: 'premade',
    description: 'Deep, Confident and Energetic (Free & Paid Ready)',
    isBengaliCapable: true,
    labels: { accent: 'multilingual', gender: 'male', use_case: 'conversational' }
  },
  {
    voice_id: 'EXAVITQu4vr4xnSDxMaL',
    name: 'Sarah - Mature, Reassuring, Confident',
    category: 'premade',
    description: 'Clear & Reassuring Female (Free & Paid Ready)',
    isBengaliCapable: true,
    labels: { accent: 'multilingual', gender: 'female', use_case: 'support' }
  }
];

export class ElevenLabsTTSProvider implements TTSProvider {
  private cacheDir: string;
  private memoryCache: Map<string, { buffer: Buffer; mimeType: string; expiresAt: number }> = new Map();

  constructor() {
    this.cacheDir = path.join(process.cwd(), '.data', 'tts_cache');
    try {
      if (!fs.existsSync(this.cacheDir)) {
        fs.mkdirSync(this.cacheDir, { recursive: true });
      }
    } catch (e) {
      console.warn('[ElevenLabsTTS] Cache dir warning:', e);
    }
  }

  /**
   * Cleans text to prepare for speech synthesis:
   * - Strips Markdown asterisks, headers, code blocks, raw HTML
   * - Removes URLs and citation brackets
   * - Preserves natural punctuation (. , ! ? । )
   * - Strips internal system or RAG metadata
   * - Limits conversational speech to ~1200 characters at natural sentence boundary
   */
  public cleanTextForSpeech(rawText: string, maxChars: number = 1200): string {
    if (!rawText) return '';

    let text = rawText;

    // 1. Remove Markdown code blocks ```...```
    text = text.replace(/```[\s\S]*?```/g, ' ');

    // 2. Remove inline code `...`
    text = text.replace(/`([^`]+)`/g, '$1');

    // 3. Remove Markdown links [Label](URL) -> Label
    text = text.replace(/\[([^\]]+)\]\([^)]+\)/g, '$1');

    // 4. Remove standalone URLs (http/https/t.me)
    text = text.replace(/https?:\/\/\S+/gi, ' ');
    text = text.replace(/t\.me\/\S+/gi, ' ');

    // 5. Remove HTML tags <...>
    text = text.replace(/<[^>]+>/g, ' ');

    // 6. Remove bold/italic symbols (**, *, __, _)
    text = text.replace(/[*_]{1,3}([^*_]+)[*_]{1,3}/g, '$1');
    text = text.replace(/[*_]/g, ' ');

    // 7. Remove Markdown headings (#, ##, ###)
    text = text.replace(/^#{1,6}\s+/gm, '');

    // 8. Remove blockquotes and list markers (> , - , * , 1. )
    text = text.replace(/^>\s+/gm, '');
    text = text.replace(/^[-*+]\s+/gm, '');
    text = text.replace(/^\d+\.\s+/gm, '');

    // 9. Remove internal citation notation and action tags like [🔐 Login], [Source: ...], [1], [2]
    text = text.replace(/\[(?:🔐|📝|📥|✈️|🚨|👨‍💻|📸|Login|Sign In|Create Account|Download|Telegram|Report Issue|Human Support|Send Screenshot|লগইন|অ্যাকাউন্ট|একাউন্ট|ডাউনলোড|টেলিগ্রাম|রিপোর্ট|লাইভ সাপোর্ট|স্ক্রিনশট)[^\]]*\]/gi, ' ');
    text = text.replace(/\[\s*(?:source|doc|ref|\d+)[^\]]*\]/gi, ' ');

    // 10. Normalize emojis: remove decorative emojis that sound awkward when spoken
    text = text.replace(/[\u{1F300}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/gu, ' ');

    // 11. Normalize Bengali punctuation (Bengali Dari । to natural pause, commas)
    text = text.replace(/\s*।\s*/g, '। ');

    // 12. Collapse multiple whitespace and newlines
    text = text.replace(/\s+/g, ' ').trim();

    // 13. Smart conversational length truncation at natural sentence boundary
    if (text.length > maxChars) {
      const windowSlice = text.slice(0, maxChars);
      // Look for the last sentence ending punctuation: ।, ., ?, !
      const lastPunctuation = Math.max(
        windowSlice.lastIndexOf('।'),
        windowSlice.lastIndexOf('.'),
        windowSlice.lastIndexOf('?'),
        windowSlice.lastIndexOf('!')
      );

      if (lastPunctuation > maxChars * 0.6) {
        text = windowSlice.slice(0, lastPunctuation + 1).trim();
      } else {
        // Look for last space
        const lastSpace = windowSlice.lastIndexOf(' ');
        if (lastSpace > 0) {
          text = windowSlice.slice(0, lastSpace).trim() + '...';
        } else {
          text = windowSlice.trim() + '...';
        }
      }
    }

    return text;
  }

  /**
   * Detects the dominant language in the text:
   * - 'bn' (Bengali dominant)
   * - 'en' (English dominant)
   * - 'mixed' (Bengali + English bilingual, Banglish)
   */
  public detectLanguage(text: string): 'bn' | 'en' | 'mixed' {
    if (!text) return 'en';

    // Bengali Unicode block: \u0980 - \u09FF
    const bengaliMatches = text.match(/[\u0980-\u09FF]/g) || [];
    // English/Latin letters: a-z, A-Z
    const englishMatches = text.match(/[a-zA-Z]/g) || [];

    const bnCount = bengaliMatches.length;
    const enCount = englishMatches.length;

    if (bnCount === 0 && enCount === 0) return 'en';
    if (bnCount > 0 && enCount === 0) return 'bn';
    if (bnCount === 0 && enCount > 0) return 'en';

    const total = bnCount + enCount;
    const bnRatio = bnCount / total;

    if (bnRatio >= 0.85) return 'bn';
    if (bnRatio <= 0.15) return 'en';
    return 'mixed';
  }

  /**
   * Computes a safe cache hash for audio reuse
   */
  private getCacheKey(
    text: string,
    voiceId: string,
    modelId: string,
    speed: number,
    stability: number,
    similarity: number,
    style: number
  ): string {
    const raw = `${text}::${voiceId}::${modelId}::${speed.toFixed(2)}::${stability.toFixed(2)}::${similarity.toFixed(2)}::${style.toFixed(2)}`;
    return crypto.createHash('sha256').update(raw).digest('hex');
  }

  /**
   * Retrieves active API key from parameter, process.env, or config
   */
  public resolveApiKey(customKey?: string): string {
    if (customKey && customKey.trim() && !customKey.includes('••••')) {
      return customKey.trim();
    }
    return (process.env.ELEVENLABS_API_KEY || '').trim();
  }

  /**
   * Internal single HTTP request to ElevenLabs with specified model and timeout
   */
  private async executeHttpRequest(params: {
    apiKey: string;
    url: string;
    payload: Record<string, any>;
    timeoutMs: number;
    modelId: string;
    voiceId: string;
  }): Promise<{
    ok: boolean;
    status: number;
    buffer?: Buffer;
    mimeType?: string;
    error?: string;
    errorCode?: string;
    isTimeout?: boolean;
    rawError?: string;
  }> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), params.timeoutMs);

    try {
      const response = await fetch(params.url, {
        method: 'POST',
        headers: {
          'xi-api-key': params.apiKey,
          'Content-Type': 'application/json',
          'Accept': 'audio/mpeg'
        },
        body: JSON.stringify(params.payload),
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        let errorDetails = '';
        try {
          const errJson = await response.json();
          errorDetails = errJson?.detail?.message || errJson?.message || JSON.stringify(errJson);
        } catch {
          errorDetails = await response.text();
        }

        let errorCode = `HTTP_${response.status}`;
        let friendlyMessage = 'Voice playback is temporarily unavailable. You can still read the response.';

        if (response.status === 401) {
          errorCode = 'INVALID_API_KEY';
          friendlyMessage = 'ElevenLabs authentication failed. Please check the API key.';
        } else if (response.status === 402) {
          if (errorDetails.toLowerCase().includes('paid_plan_required') || errorDetails.toLowerCase().includes('library voices')) {
            errorCode = 'PAID_PLAN_REQUIRED';
            friendlyMessage = 'Free accounts cannot use library voices via API. Falling back to multilingual premade AI voice...';
          } else {
            errorCode = 'QUOTA_EXCEEDED';
            friendlyMessage = 'ElevenLabs character quota exceeded for this billing period.';
          }
        } else if (response.status === 429) {
          errorCode = 'RATE_LIMITED';
          friendlyMessage = 'Voice service is currently rate limited or quota exceeded. You can still read the response.';
        } else if (response.status === 404) {
          errorCode = 'VOICE_NOT_FOUND';
          friendlyMessage = `Voice ID "${params.voiceId}" not found on ElevenLabs. Please verify voice configuration.`;
        }

        console.warn(`[ElevenLabsTTS API Warning] Model: ${params.modelId}, Status ${response.status}:`, errorDetails);

        return {
          ok: false,
          status: response.status,
          error: friendlyMessage,
          errorCode,
          rawError: errorDetails
        };
      }

      const arrayBuffer = await response.arrayBuffer();
      const audioBuffer = Buffer.from(arrayBuffer);
      const mimeType = response.headers.get('content-type') || 'audio/mpeg';

      return {
        ok: true,
        status: 200,
        buffer: audioBuffer,
        mimeType
      };
    } catch (err: any) {
      clearTimeout(timeoutId);
      const isTimeout = err?.name === 'AbortError' || err?.code === 'ABORT_ERR';
      if (isTimeout) {
        console.warn(`[ElevenLabsTTS] Request timed out for model ${params.modelId} after ${params.timeoutMs}ms`);
      } else {
        console.warn(`[ElevenLabsTTS] Network warning for model ${params.modelId}:`, err?.message || err);
      }

      return {
        ok: false,
        status: isTimeout ? 504 : 500,
        error: isTimeout
          ? 'Voice generation timed out. You can still read the response.'
          : 'Network error connecting to ElevenLabs voice service.',
        errorCode: isTimeout ? 'TIMEOUT' : 'NETWORK_ERROR',
        isTimeout
      };
    }
  }

  /**
   * Generates Speech from text using ElevenLabs REST API with automatic model fallback
   */
  public async generateSpeech(input: TTSRequestInput): Promise<TTSResult> {
    const startTime = Date.now();
    const apiKey = this.resolveApiKey(input.apiKey);

    if (!apiKey) {
      return {
        success: false,
        mimeType: 'audio/mpeg',
        characterCount: 0,
        latencyMs: 0,
        cached: false,
        modelId: input.modelId || 'eleven_multilingual_v2',
        voiceId: input.voiceId || CURATED_VOICES[0].voice_id,
        detectedLanguage: 'en',
        error: 'ELEVENLABS_API_KEY is not configured on the server.',
        errorCode: 'MISSING_API_KEY'
      };
    }

    // Clean text and truncate if excessively long
    const cleanedText = this.cleanTextForSpeech(input.text, 1200);
    if (!cleanedText) {
      return {
        success: false,
        mimeType: 'audio/mpeg',
        characterCount: 0,
        latencyMs: 0,
        cached: false,
        modelId: input.modelId || 'eleven_multilingual_v2',
        voiceId: input.voiceId || CURATED_VOICES[0].voice_id,
        detectedLanguage: 'en',
        error: 'Text content is empty after cleaning.',
        errorCode: 'EMPTY_TEXT'
      };
    }

    const detectedLanguage = this.detectLanguage(cleanedText);

    // Primary model: defaults to eleven_multilingual_v2 for speed and multilingual stability
    const requestedModel = input.modelId || process.env.ELEVENLABS_MODEL_ID || 'eleven_multilingual_v2';
    // Voice selection: prioritize requested voice, then env, then default curated voice
    const voiceId = input.voiceId || process.env.ELEVENLABS_VOICE_ID || CURATED_VOICES[0].voice_id;
    const outputFormat = input.outputFormat || process.env.ELEVENLABS_OUTPUT_FORMAT || 'mp3_44100_128';

    const speed = Math.max(0.7, Math.min(1.3, input.speed ?? 1.0));
    const stability = Math.max(0.0, Math.min(1.0, input.stability ?? 0.5));
    const similarity = Math.max(0.0, Math.min(1.0, input.similarity ?? 0.75));
    const style = Math.max(0.0, Math.min(1.0, input.style ?? 0.0));
    const useSpeakerBoost = input.useSpeakerBoost !== false;

    // Check Cache
    const cacheKey = this.getCacheKey(cleanedText, voiceId, requestedModel, speed, stability, similarity, style);
    const cachedFile = path.join(this.cacheDir, `${cacheKey}.mp3`);

    // In-memory cache check
    const memEntry = this.memoryCache.get(cacheKey);
    if (memEntry && memEntry.expiresAt > Date.now()) {
      return {
        success: true,
        audioBuffer: memEntry.buffer,
        audioBase64: memEntry.buffer.toString('base64'),
        mimeType: memEntry.mimeType,
        characterCount: cleanedText.length,
        latencyMs: Date.now() - startTime,
        cached: true,
        modelId: requestedModel,
        voiceId,
        detectedLanguage
      };
    }

    // Disk cache check
    try {
      if (fs.existsSync(cachedFile)) {
        const fileBuffer = fs.readFileSync(cachedFile);
        this.memoryCache.set(cacheKey, {
          buffer: fileBuffer,
          mimeType: 'audio/mpeg',
          expiresAt: Date.now() + 1000 * 60 * 60 * 24 // 24h
        });

        return {
          success: true,
          audioBuffer: fileBuffer,
          audioBase64: fileBuffer.toString('base64'),
          mimeType: 'audio/mpeg',
          characterCount: cleanedText.length,
          latencyMs: Date.now() - startTime,
          cached: true,
          modelId: requestedModel,
          voiceId,
          detectedLanguage
        };
      }
    } catch (cacheReadErr) {
      console.warn('[ElevenLabsTTS] Cache read warning:', cacheReadErr);
    }

    const url = `https://api.elevenlabs.io/v1/text-to-speech/${encodeURIComponent(voiceId)}?output_format=${encodeURIComponent(outputFormat)}`;

    // Build payload helper
    const buildPayload = (mId: string) => {
      const payload: Record<string, any> = {
        text: cleanedText,
        model_id: mId,
        voice_settings: {
          stability,
          similarity_boost: similarity,
          style,
          use_speaker_boost: useSpeakerBoost,
          speed
        }
      };



      return payload;
    };

    // Determine primary and fallback models
    // For long text (>400 chars) on eleven_v3, eleven_multilingual_v2 is preferred for latency
    const primaryModel = requestedModel;
    const fallbackModel = primaryModel === 'eleven_multilingual_v2' ? 'eleven_flash_v2_5' : 'eleven_multilingual_v2';

    // Primary attempt timeout: 30s for v3, 20s for others
    const primaryTimeout = primaryModel === 'eleven_v3' ? 30000 : 20000;

    let res = await this.executeHttpRequest({
      apiKey,
      url,
      payload: buildPayload(primaryModel),
      timeoutMs: primaryTimeout,
      modelId: primaryModel,
      voiceId
    });

    let effectiveModelUsed = primaryModel;
    let effectiveVoiceUsed = voiceId;
    let warningNotice: string | undefined = undefined;

    // If primary voice encountered HTTP 402 (paid_plan_required for Voice Library voices like Viraj/Rudra)
    if (
      !res.ok &&
      (res.status === 402 ||
        res.errorCode === 'PAID_PLAN_REQUIRED' ||
        (res as any).rawError?.toLowerCase().includes('paid_plan_required') ||
        (res as any).rawError?.toLowerCase().includes('library voices'))
    ) {
      const fallbackVoiceId = voiceId === 'vIdhHAZdn1bGjKe1dFw8' ? 'IKne3meq5aSn9XLyUdCD' : 'JBFqnCBsd6RMkjVDRZzb';
      console.log(
        `[ElevenLabsTTS] Voice "${voiceId}" requires an ElevenLabs Paid plan for direct API calls. Automatically synthesizing with compatible AI voice "${fallbackVoiceId}" using model "${effectiveModelUsed}"...`
      );

      const voiceFallbackUrl = `https://api.elevenlabs.io/v1/text-to-speech/${encodeURIComponent(fallbackVoiceId)}?output_format=${encodeURIComponent(outputFormat)}`;
      const voiceFallbackRes = await this.executeHttpRequest({
        apiKey,
        url: voiceFallbackUrl,
        payload: buildPayload(effectiveModelUsed),
        timeoutMs: primaryTimeout,
        modelId: effectiveModelUsed,
        voiceId: fallbackVoiceId
      });

      if (voiceFallbackRes.ok && voiceFallbackRes.buffer) {
        res = voiceFallbackRes;
        effectiveVoiceUsed = fallbackVoiceId;
        warningNotice = 'Selected voice (Viraj/Rudra) is a Voice Library model requiring an ElevenLabs Paid API subscription. Speech synthesized using ElevenLabs AI Voice (George/Charlie Multilingual) with your chosen model.';
      }
    }

    // If primary attempt timed out or encountered an API error, attempt immediate model fallback
    if (!res.ok && (res.isTimeout || res.status >= 500 || res.status === 429 || res.status === 400)) {
      console.log(
        `[ElevenLabsTTS] Primary model "${primaryModel}" did not succeed (${res.errorCode}), attempting high-speed fallback with "${fallbackModel}"...`
      );

      const fallbackRes = await this.executeHttpRequest({
        apiKey,
        url,
        payload: buildPayload(fallbackModel),
        timeoutMs: 18000,
        modelId: fallbackModel,
        voiceId: effectiveVoiceUsed
      });

      if (fallbackRes.ok && fallbackRes.buffer) {
        res = fallbackRes;
        effectiveModelUsed = fallbackModel;
      }
    }

    if (!res.ok || !res.buffer) {
      return {
        success: false,
        mimeType: 'audio/mpeg',
        characterCount: cleanedText.length,
        latencyMs: Date.now() - startTime,
        cached: false,
        modelId: primaryModel,
        voiceId,
        detectedLanguage,
        error: res.error || 'Voice playback is temporarily unavailable. You can still read the response.',
        errorCode: res.errorCode || 'GENERATION_FAILED'
      };
    }

    const audioBuffer = res.buffer;
    const audioBase64 = audioBuffer.toString('base64');
    const mimeType = res.mimeType || 'audio/mpeg';

    // Save to disk cache
    try {
      fs.writeFileSync(cachedFile, audioBuffer);
      this.memoryCache.set(cacheKey, {
        buffer: audioBuffer,
        mimeType,
        expiresAt: Date.now() + 1000 * 60 * 60 * 24
      });
    } catch (cacheWriteErr) {
      console.warn('[ElevenLabsTTS] Cache write warning:', cacheWriteErr);
    }

    return {
      success: true,
      audioBuffer,
      audioBase64,
      mimeType,
      characterCount: cleanedText.length,
      latencyMs: Date.now() - startTime,
      cached: false,
      modelId: effectiveModelUsed,
      voiceId: effectiveVoiceUsed,
      warning: warningNotice,
      detectedLanguage
    };
  }

  /**
   * Tests connection and queries subscription character quota
   */
  public async testConnection(customApiKey?: string): Promise<TTSHealthResult> {
    const apiKey = this.resolveApiKey(customApiKey);

    if (!apiKey) {
      return {
        healthy: false,
        provider: 'ElevenLabs',
        message: 'ELEVENLABS_API_KEY is not configured.'
      };
    }

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000);

      const res = await fetch('https://api.elevenlabs.io/v1/user/subscription', {
        headers: { 'xi-api-key': apiKey },
        signal: controller.signal
      });
      clearTimeout(timeoutId);

      if (!res.ok) {
        let errText = '';
        try {
          const errJson = await res.json();
          errText = errJson?.detail?.message || errJson?.message || JSON.stringify(errJson);
        } catch {
          errText = await res.text();
        }

        const is401 = res.status === 401 || errText.toLowerCase().includes('invalid_api_key');
        const isQuota =
          res.status === 402 ||
          res.status === 429 ||
          errText.toLowerCase().includes('quota') ||
          errText.toLowerCase().includes('character_limit_exceeded') ||
          errText.toLowerCase().includes('limit');

        if (is401) {
          return {
            healthy: false,
            provider: 'ElevenLabs',
            message: 'ElevenLabs API key is invalid.'
          };
        }

        if (isQuota) {
          return {
            healthy: false,
            provider: 'ElevenLabs',
            message: 'ElevenLabs API key quota/limit has been reached.'
          };
        }

        return {
          healthy: false,
          provider: 'ElevenLabs',
          message: `Connection failed with status ${res.status}: ${errText}`
        };
      }

      const sub = await res.json();
      const characterCount = sub.character_count ?? 0;
      const characterLimit = sub.character_limit ?? 0;
      const remaining = Math.max(0, characterLimit - characterCount);
      const tier = sub.tier || 'standard';

      if (remaining <= 0 && characterLimit > 0) {
        return {
          healthy: false,
          provider: 'ElevenLabs',
          tier,
          characterCount,
          characterLimit,
          remainingCharacters: 0,
          model: 'eleven_v3',
          message: `ElevenLabs API key quota/limit has been reached. Used: ${characterCount.toLocaleString()} / ${characterLimit.toLocaleString()} characters.`
        };
      }

      return {
        healthy: true,
        provider: 'ElevenLabs',
        tier,
        characterCount,
        characterLimit,
        remainingCharacters: remaining,
        model: 'eleven_v3',
        message: `Connected successfully! Tier: ${tier} • Available Quota: ${remaining.toLocaleString()} / ${characterLimit.toLocaleString()} characters`
      };
    } catch (err: any) {
      const isTimeout = err?.name === 'AbortError' || err?.code === 'ABORT_ERR';
      return {
        healthy: false,
        provider: 'ElevenLabs',
        message: isTimeout
          ? 'Unable to reach ElevenLabs: connection timed out. Please try again.'
          : 'Unable to reach ElevenLabs. Please check network connectivity and try again.'
      };
    }
  }

  /**
   * Generates Speech using a Pool of API Keys with automatic failover and quota exhaustion detection
   */
  public async generateSpeechWithPool(
    input: TTSRequestInput,
    keys: Array<{ id: string; key: string; label?: string; priority?: number }>,
    callbacks?: {
      markQuotaExhausted?: (id: string, reason: string) => void;
      markInvalid?: (id: string, reason: string) => void;
      recordSuccess?: (id: string) => void;
    }
  ): Promise<TTSResult & { usedKeyId?: string; exhaustedAllKeys?: boolean }> {
    if (!keys || keys.length === 0) {
      return {
        success: false,
        mimeType: 'audio/mpeg',
        characterCount: 0,
        latencyMs: 0,
        cached: false,
        modelId: input.modelId || 'eleven_multilingual_v2',
        voiceId: input.voiceId || CURATED_VOICES[0].voice_id,
        detectedLanguage: 'en',
        error: 'No ElevenLabs API key is configured. Add an API key to enable ElevenLabs voice features.',
        errorCode: 'NO_KEYS_CONFIGURED'
      };
    }

    let lastError = '';
    let lastErrorCode = '';
    let quotaExhaustedCount = 0;

    for (let i = 0; i < keys.length; i++) {
      const keyItem = keys[i];
      const singleResult = await this.generateSpeech({
        ...input,
        apiKey: keyItem.key
      });

      if (singleResult.success) {
        callbacks?.recordSuccess?.(keyItem.id);
        return {
          ...singleResult,
          usedKeyId: keyItem.id
        };
      }

      const errCode = singleResult.errorCode || '';
      const errMsg = (singleResult.error || '').toLowerCase();
      const isQuota =
        errCode === 'QUOTA_EXCEEDED' ||
        errCode === 'RATE_LIMITED' ||
        singleResult.errorCode === 'HTTP_402' ||
        singleResult.errorCode === 'HTTP_429' ||
        errMsg.includes('quota') ||
        errMsg.includes('rate limit') ||
        errMsg.includes('limit reached') ||
        errMsg.includes('character_limit');

      const isInvalid = errCode === 'INVALID_API_KEY' || singleResult.errorCode === 'HTTP_401' || errMsg.includes('authentication failed');

      if (isQuota) {
        quotaExhaustedCount++;
        console.warn(`[ElevenLabs Key Pool] Key #${i + 1} ("${keyItem.label || keyItem.id}") exhausted quota. Rotating to next eligible key...`);
        callbacks?.markQuotaExhausted?.(keyItem.id, singleResult.error || 'Quota exhausted');
        lastError = singleResult.error || 'Quota exhausted';
        lastErrorCode = errCode;
        continue; // Try next key
      } else if (isInvalid) {
        console.warn(`[ElevenLabs Key Pool] Key #${i + 1} ("${keyItem.label || keyItem.id}") is invalid (401). Rotating to next eligible key...`);
        callbacks?.markInvalid?.(keyItem.id, singleResult.error || 'Invalid API key');
        lastError = singleResult.error || 'Invalid API key';
        lastErrorCode = errCode;
        continue; // Try next key
      } else {
        // UNRELATED ERROR: Do NOT rotate keys for unrelated errors per Requirement 14
        console.log(`[ElevenLabs Key Pool] Unrelated error encountered on key "${keyItem.label || keyItem.id}" (${errCode}). Skipping key rotation.`);
        return {
          ...singleResult,
          usedKeyId: keyItem.id
        };
      }
    }

    // If all configured keys were exhausted
    if (quotaExhaustedCount > 0 && quotaExhaustedCount === keys.length) {
      return {
        success: false,
        mimeType: 'audio/mpeg',
        characterCount: 0,
        latencyMs: 0,
        cached: false,
        modelId: input.modelId || 'eleven_multilingual_v2',
        voiceId: input.voiceId || CURATED_VOICES[0].voice_id,
        detectedLanguage: 'en',
        error: 'ElevenLabs API limit reached. All configured API keys have exhausted their available limits. Please add another API key or wait for a quota reset.',
        errorCode: 'ALL_KEYS_EXHAUSTED',
        exhaustedAllKeys: true
      };
    }

    return {
      success: false,
      mimeType: 'audio/mpeg',
      characterCount: 0,
      latencyMs: 0,
      cached: false,
      modelId: input.modelId || 'eleven_multilingual_v2',
      voiceId: input.voiceId || CURATED_VOICES[0].voice_id,
      detectedLanguage: 'en',
      error: lastError || 'All configured ElevenLabs API keys are currently unavailable.',
      errorCode: lastErrorCode || 'ALL_KEYS_UNAVAILABLE'
    };
  }

  /**
   * Fetches available voices (only Viraj and Rudra as configured)
   */
  public async getAvailableVoices(_customApiKey?: string): Promise<TTSVoiceOption[]> {
    return CURATED_VOICES;
  }
}

export const elevenLabsTTS = new ElevenLabsTTSProvider();
