import { GoogleGenAI } from '@google/genai';
import { AIProviderConfig, SupportAttachment } from './types';
import { analyzeIntent, formatItemNotFoundResponse } from './conversationEngine';
import { getDownloadProblemGuidance } from './websiteKnowledge';

export interface GenerateOptions {
  systemInstruction: string;
  userPrompt: string;
  chatHistory: { role: 'user' | 'model'; text: string }[];
  attachment?: SupportAttachment;
}

export interface GenerateResult {
  text: string;
  provider: string;
  model: string;
  usage?: { promptTokens?: number; candidatesTokens?: number };
}

export interface AIProviderAdapter {
  type: string;
  generate(config: AIProviderConfig, options: GenerateOptions): Promise<GenerateResult>;
  testConnection(config: AIProviderConfig): Promise<{ success: boolean; latencyMs: number; message: string }>;
  supportsVision(config: AIProviderConfig): boolean;
  hasValidKey(config: AIProviderConfig): boolean;
}

/**
 * Modern Google Gemini Adapter using official @google/genai SDK
 */
export class GeminiAdapter implements AIProviderAdapter {
  public type = 'gemini';

  public supportsVision(config: AIProviderConfig): boolean {
    return true; // Gemini 3.8 Flash natively supports vision
  }

  public hasValidKey(config: AIProviderConfig): boolean {
    if (config.apiKey && config.apiKey.trim()) return true;
    if (process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY.trim()) return true;
    return false;
  }

  private getClient(config: AIProviderConfig): GoogleGenAI {
    const apiKey = config.apiKey || process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error('Gemini API key is not configured. Please set a custom Gemini API key in AI Provider settings.');
    }
    return new GoogleGenAI({ apiKey });
  }

  private resolveModel(modelName?: string): string {
    if (!modelName || modelName.includes('2.5') || modelName.includes('2.0') || modelName.includes('1.5') || modelName === 'gemini-pro') {
      return 'gemini-3.8-flash';
    }
    return modelName;
  }

  public async generate(config: AIProviderConfig, options: GenerateOptions): Promise<GenerateResult> {
    const ai = this.getClient(config);
    const rawModel = (options.attachment && config.visionModel) ? config.visionModel : config.model;
    const modelName = this.resolveModel(rawModel);

    const contents: any[] = [];

    // Append previous dialogue turns if available
    if (options.chatHistory && options.chatHistory.length > 0) {
      for (const turn of options.chatHistory) {
        contents.push({
          role: turn.role,
          parts: [{ text: turn.text }]
        });
      }
    }

    // Prepare current user turn
    const userParts: any[] = [];

    // Multimodal screenshot/image support
    if (options.attachment && options.attachment.url) {
      let base64Data = '';
      let mimeType = options.attachment.type || 'image/jpeg';

      if (options.attachment.url.startsWith('data:')) {
        const parts = options.attachment.url.split(',');
        base64Data = parts[1] || '';
        const mimeMatch = parts[0].match(/data:(.*?);base64/);
        if (mimeMatch) mimeType = mimeMatch[1];
      } else {
        base64Data = options.attachment.url;
      }

      if (base64Data) {
        userParts.push({
          inlineData: {
            mimeType,
            data: base64Data
          }
        });
      }
    }

    userParts.push({ text: options.userPrompt });

    contents.push({
      role: 'user',
      parts: userParts
    });

    const response = await ai.models.generateContent({
      model: modelName,
      contents,
      config: {
        systemInstruction: options.systemInstruction,
        temperature: config.temperature ?? 0.3,
        maxOutputTokens: config.maxOutputTokens ?? 1200
      }
    });

    const text = response.text || 'I apologize, but I could not generate an answer right now.';
    return {
      text,
      provider: 'Gemini',
      model: modelName
    };
  }

  public async testConnection(config: AIProviderConfig): Promise<{ success: boolean; latencyMs: number; message: string }> {
    const start = Date.now();
    try {
      const ai = this.getClient(config);
      const model = this.resolveModel(config.model);
      const response = await ai.models.generateContent({
        model,
        contents: [{ role: 'user', parts: [{ text: 'Respond with "OK" if online.' }] }],
        config: { maxOutputTokens: 10, temperature: 0.1 }
      });
      const latencyMs = Date.now() - start;
      const reply = response.text?.trim() || 'OK';
      return {
        success: true,
        latencyMs,
        message: `Connected successfully to Gemini (${model}) in ${latencyMs}ms. Reply: "${reply}"`
      };
    } catch (err: any) {
      return {
        success: false,
        latencyMs: Date.now() - start,
        message: formatAIError('Google Gemini', err)
      };
    }
  }
}

/**
 * Format provider errors into clean, human-readable explanations with actionable advice.
 */
export function formatAIError(providerName: string, err: any): string {
  const raw = err?.message || String(err || 'Unknown error');

  try {
    const jsonMatch = raw.match(/\{[\s\S]*"error"[\s\S]*\}/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
      if (parsed.error) {
        const code = parsed.error.code;
        const msg = parsed.error.message || '';
        const status = parsed.error.status;

        if (code === 403 || status === 'PERMISSION_DENIED' || msg.toLowerCase().includes('denied access')) {
          return `Access Denied (403): The project for this API key has been denied access by Google Cloud. Click "Configure" below to enter your personal Gemini API key (from Google AI Studio: https://aistudio.google.com/apikey), or switch to another provider like Groq Cloud.`;
        }
        if (code === 429 || status === 'RESOURCE_EXHAUSTED' || msg.toLowerCase().includes('quota') || msg.toLowerCase().includes('rate limit')) {
          return `Quota Exceeded (429): Rate limit reached for this API key. Please retry in a moment, or click "Configure" to supply a custom API key.`;
        }
        if (code === 404 || status === 'NOT_FOUND') {
          return `Model Not Found (404): ${msg || 'The requested model is not available for this key.'}`;
        }
        if (msg) {
          return `${providerName} API Error (${code || status || 'Error'}): ${msg}`;
        }
      }
    }
  } catch {
    // ignore json parsing errors
  }

  if (raw.toLowerCase().includes('403') || raw.toLowerCase().includes('denied access') || raw.includes('PERMISSION_DENIED')) {
    return `Access Denied (403): This API key was denied access. Click "Configure" to enter your own Gemini API key (from Google AI Studio: https://aistudio.google.com/apikey) or switch to Groq / OpenAI.`;
  }
  if (raw.toLowerCase().includes('429') || raw.toLowerCase().includes('quota') || raw.includes('RESOURCE_EXHAUSTED')) {
    return `Quota Exceeded (429): Rate limit reached for this key. Please wait a moment or click "Configure" to provide a custom API key.`;
  }
  if (raw.toLowerCase().includes('not configured')) {
    return `${providerName} is not configured: ${raw}. Click "Configure" to set up credentials.`;
  }

  return `${providerName} connection failed: ${raw}`;
}

/**
 * Groq AI Adapter for ultra-fast Llama and open-weights models
 */
export class GroqAdapter implements AIProviderAdapter {
  public type = 'groq';

  public supportsVision(config: AIProviderConfig): boolean {
    const model = (config.visionModel || config.model || '').toLowerCase();
    return (
      model.includes('qwen') ||
      model.includes('vision') ||
      model.includes('scenery') ||
      model.includes('llava')
    );
  }

  public hasValidKey(config: AIProviderConfig): boolean {
    return !!(config.apiKey || process.env.GROQ_API_KEY);
  }

  private getApiKey(config: AIProviderConfig): string {
    const key = config.apiKey || process.env.GROQ_API_KEY;
    if (!key) throw new Error('Groq API Key is not configured.');
    return key;
  }

  public resolveModel(modelName?: string): string {
    if (!modelName) return 'qwen/qwen3.8-27b';
    const lower = modelName.toLowerCase();
    // Modern Groq hosted open-weights models (retires older llama-3.3 / llama-3.1 / llama3)
    if (lower.includes('llama') || lower.includes('mixtral') || lower.includes('gemma')) {
      return 'qwen/qwen3.8-27b';
    }
    return modelName;
  }

  public async generate(config: AIProviderConfig, options: GenerateOptions): Promise<GenerateResult> {
    const apiKey = this.getApiKey(config);
    const baseUrl = config.baseUrl || 'https://api.groq.com/openai/v1';
    const rawModel = (options.attachment && config.visionModel) ? config.visionModel : config.model;
    let model = this.resolveModel(rawModel);

    const messages: any[] = [
      { role: 'system', content: options.systemInstruction }
    ];

    if (options.chatHistory) {
      for (const turn of options.chatHistory) {
        messages.push({
          role: turn.role === 'model' ? 'assistant' : 'user',
          content: turn.text
        });
      }
    }

    const hasVisionAttachment = Boolean(options.attachment && options.attachment.url && this.supportsVision(config));

    if (hasVisionAttachment && options.attachment) {
      messages.push({
        role: 'user',
        content: [
          { type: 'text', text: options.userPrompt },
          { type: 'image_url', image_url: { url: options.attachment.url } }
        ]
      });
    } else {
      messages.push({ role: 'user', content: options.userPrompt });
    }

    // On Groq on-demand tier, image tokens reduce output token budget. Cap at 500 when image is attached.
    const maxTokens = hasVisionAttachment
      ? Math.min(config.maxOutputTokens ?? 1200, 500)
      : (config.maxOutputTokens ?? 1200);

    let res = await fetch(`${baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model,
        messages,
        temperature: config.temperature ?? 0.3,
        max_tokens: maxTokens
      })
    });

    // If requested model was not found (404), seamlessly retry with verified high-speed model
    if (!res.ok && res.status === 404 && model !== 'qwen/qwen3.8-27b') {
      model = 'qwen/qwen3.8-27b';
      res = await fetch(`${baseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey}`
        },
        body: JSON.stringify({
          model,
          messages,
          temperature: config.temperature ?? 0.3,
          max_tokens: maxTokens
        })
      });
    }

    if (!res.ok) {
      const errorText = await res.text();
      throw new Error(`Groq API Error (${res.status}): ${errorText}`);
    }

    const data = await res.json();
    const text = data.choices?.[0]?.message?.content || 'No response received from Groq.';
    return {
      text,
      provider: 'Groq',
      model
    };
  }

  public async testConnection(config: AIProviderConfig): Promise<{ success: boolean; latencyMs: number; message: string }> {
    const start = Date.now();
    try {
      const apiKey = this.getApiKey(config);
      const baseUrl = config.baseUrl || 'https://api.groq.com/openai/v1';
      const model = this.resolveModel(config.model);

      const res = await fetch(`${baseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey}`
        },
        body: JSON.stringify({
          model,
          messages: [{ role: 'user', content: 'Respond with OK' }],
          max_tokens: 10
        })
      });

      const latencyMs = Date.now() - start;
      if (!res.ok) {
        const errorText = await res.text();
        return { success: false, latencyMs, message: formatAIError('Groq Cloud', new Error(`(${res.status}) ${errorText}`)) };
      }
      return { success: true, latencyMs, message: `Connected to Groq (${model}) in ${latencyMs}ms.` };
    } catch (err: any) {
      return { success: false, latencyMs: Date.now() - start, message: formatAIError('Groq Cloud', err) };
    }
  }
}

/**
 * Universal OpenAI-compatible Adapter (OpenAI, DeepSeek, LocalLLM, etc.)
 */
export class OpenAICompatibleAdapter implements AIProviderAdapter {
  public type = 'openai';

  public supportsVision(config: AIProviderConfig): boolean {
    const model = (config.visionModel || config.model || '').toLowerCase();
    return model.includes('vision') || model.includes('4o') || model.includes('4-turbo');
  }

  public hasValidKey(config: AIProviderConfig): boolean {
    return !!(config.apiKey || process.env.OPENAI_API_KEY);
  }

  private getApiKey(config: AIProviderConfig): string {
    const key = config.apiKey || process.env.OPENAI_API_KEY;
    if (!key) throw new Error('OpenAI / Custom API Key is not configured.');
    return key;
  }

  public async generate(config: AIProviderConfig, options: GenerateOptions): Promise<GenerateResult> {
    const apiKey = this.getApiKey(config);
    const baseUrl = config.baseUrl || 'https://api.openai.com/v1';
    const model = (options.attachment && config.visionModel) ? config.visionModel : config.model;

    const messages: any[] = [
      { role: 'system', content: options.systemInstruction }
    ];

    if (options.chatHistory) {
      for (const turn of options.chatHistory) {
        messages.push({
          role: turn.role === 'model' ? 'assistant' : 'user',
          content: turn.text
        });
      }
    }

    if (options.attachment && options.attachment.url && this.supportsVision(config)) {
      messages.push({
        role: 'user',
        content: [
          { type: 'text', text: options.userPrompt },
          { type: 'image_url', image_url: { url: options.attachment.url } }
        ]
      });
    } else {
      messages.push({ role: 'user', content: options.userPrompt });
    }

    const res = await fetch(`${baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model,
        messages,
        temperature: config.temperature ?? 0.3,
        max_tokens: config.maxOutputTokens ?? 1200
      })
    });

    if (!res.ok) {
      const errorText = await res.text();
      throw new Error(`OpenAI API Error (${res.status}): ${errorText}`);
    }

    const data = await res.json();
    const text = data.choices?.[0]?.message?.content || 'No response received.';
    return {
      text,
      provider: config.name || 'OpenAI-Compatible',
      model
    };
  }

  public async testConnection(config: AIProviderConfig): Promise<{ success: boolean; latencyMs: number; message: string }> {
    const start = Date.now();
    try {
      const apiKey = this.getApiKey(config);
      const baseUrl = config.baseUrl || 'https://api.openai.com/v1';
      const model = config.model || 'gpt-4o-mini';

      const res = await fetch(`${baseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey}`
        },
        body: JSON.stringify({
          model,
          messages: [{ role: 'user', content: 'Ping' }],
          max_tokens: 5
        })
      });

      const latencyMs = Date.now() - start;
      if (!res.ok) {
        const errorText = await res.text();
        return { success: false, latencyMs, message: formatAIError(config.name || 'OpenAI API', new Error(`(${res.status}) ${errorText}`)) };
      }
      return { success: true, latencyMs, message: `Connected to API endpoint in ${latencyMs}ms.` };
    } catch (err: any) {
      return { success: false, latencyMs: Date.now() - start, message: formatAIError(config.name || 'OpenAI API', err) };
    }
  }
}

/**
 * Offline-first, Grounded Knowledge Synthesis Engine for OTL
 * Uses verified platform facts, policies, product catalog, and conversational NLP.
 */
export function synthesizeKnowledgeResponse(options: GenerateOptions): string {
  const prompt = (options.userPrompt || '').trim();
  const sys = options.systemInstruction || '';

  // Extract RAG Context if present in system prompt
  let ragContext = '';
  const ragMatch = sys.match(/=== MANDATORY RAG KNOWLEDGE BASE CONTEXT ===([\s\S]*?)=== END KNOWLEDGE BASE ===/);
  if (ragMatch && ragMatch[1]) {
    ragContext = ragMatch[1].trim();
  }

  // Use intent analysis from conversationEngine
  const analysis = analyzeIntent(prompt, options.chatHistory);

  // 1. Direct conversational response (Greeting / Simple Chat / Gratitude)
  if (analysis.directResponse) {
    return analysis.directResponse;
  }

  // 2. Human Support / Admin Request
  if (analysis.intent === 'human_support_request') {
    if (analysis.replyLanguage === 'bangla') {
      return `আমাদের সাপোর্ট টিমের সাথে কথা বলতে ওপরের **"Talk to Human"** বাটনে ক্লিক করুন অথবা সরাসরি আমাদের টেলিগ্রাম কমিউনিটিতে যোগাযোগ করুন: [https://t.me/OnlineTaskLabGroup](https://t.me/OnlineTaskLabGroup)।`;
    }
    return `To speak directly with our team, please click the **"Talk to Human"** button at the top of this chat or reach out on Telegram: [https://t.me/OnlineTaskLabGroup](https://t.me/OnlineTaskLabGroup).`;
  }

  // 2b. Website-Aware Download Troubleshooting
  if (analysis.intent === 'download_problem') {
    const isAuth = /User Status:\s*LOGGED IN/i.test(sys);
    const titleMatch = ragContext.match(/(?:PRODUCT TITLE|Item):\s*([^\n\r]+)/i);
    const productTitle = titleMatch ? titleMatch[1].trim() : '';
    const versionMatch = ragContext.match(/(?:Current Version|CURRENT VERSION):\s*([^\n\r]+)/i);
    const extractedVersion = versionMatch ? versionMatch[1].trim() : '';
    const sizeMatch = ragContext.match(/(?:File Size|FILE SIZE):\s*([^\n\r]+)/i);
    const extractedSize = sizeMatch ? sizeMatch[1].trim() : '';

    const matchedProd = productTitle ? {
      id: 'res-matched',
      title: productTitle,
      version: extractedVersion,
      fileSize: extractedSize,
      isActive: true
    } : null;

    return getDownloadProblemGuidance({
      replyLanguage: analysis.replyLanguage,
      isAuthenticated: isAuth,
      product: matchedProd
    });
  }

  // 3. Grounded response using Authoritative Live Website Data & RAG Context
  if (ragContext && ragContext !== 'NO_SPECIFIC_KNOWLEDGE_FOUND' && ragContext.length > 20) {
    // Extract top relevant section
    const sections = ragContext
      .split(/(?:====================|---|\[Grounding Source \d+:|\[AUTHORITATIVE CURRENT WEBSITE RECORD:)/)
      .map(s => s.trim())
      .filter(s => s.length > 20);

    const topContent = sections.slice(0, 2).join('\n\n');

    const priceMatch = ragContext.match(/(?:Price|PRICING & LICENSE):\s*([^\n\r]+)/i);
    const extractedPrice = priceMatch ? priceMatch[1].trim() : '';

    const titleMatch = ragContext.match(/(?:PRODUCT TITLE|Item):\s*([^\n\r]+)/i);
    const productTitle = titleMatch ? titleMatch[1].trim() : '';

    const versionMatch = ragContext.match(/(?:Current Version|CURRENT VERSION):\s*([^\n\r]+)/i);
    const extractedVersion = versionMatch ? versionMatch[1].trim() : '';

    const descMatch = ragContext.match(/(?:Description \/ Summary|SHORT SUMMARY \/ DESCRIPTION|SHORT SUMMARY|FULL SPECIFICATIONS & DETAILS):\s*([^\n\r]+)/i);
    const extractedDesc = descMatch ? descMatch[1].trim() : '';

    const lowerPrompt = prompt.toLowerCase();
    const asksPrice = /\b(price|cost|dam|taka|মূল্য|দাম|টাকা)\b/i.test(lowerPrompt);
    const asksVersion = /\b(version|apkversion|ভার্সন|latest)\b/i.test(lowerPrompt);
    const asksDesc = /\b(description|summary|details|বিবরণ|বর্ণনা|বর্ননা)\b/i.test(lowerPrompt);

    // Both price and version asked
    if (asksPrice && asksVersion) {
      const priceText = extractedPrice || '100% FREE';
      const verText = extractedVersion || 'Latest verified';
      const descText = (asksDesc && extractedDesc) ? `\n\n**Description:** ${extractedDesc}` : '';
      if (analysis.replyLanguage === 'bangla') {
        const bnDesc = (asksDesc && extractedDesc) ? `\n\n**বিবরণ:** ${extractedDesc}` : '';
        return `${productTitle ? `**${productTitle}**-এর ` : ''}বর্তমান মূল্য **${priceText}** এবং সর্বশেষ ভার্সন হলো **${verText}**।${bnDesc}\n\n👉 অফিসিয়াল লিংক: [https://t.me/OnlineTaskLab](https://t.me/OnlineTaskLab)`;
      }
      return `The current price for ${productTitle ? `**${productTitle}**` : 'this product'} is **${priceText}** and the latest version is **${verText}**.${descText}\n\n👉 Official Link: [https://t.me/OnlineTaskLab](https://t.me/OnlineTaskLab)`;
    }

    // Specific Version inquiry
    if (asksVersion) {
      const verText = extractedVersion || 'Latest verified build';
      if (analysis.replyLanguage === 'bangla') {
        return `${productTitle ? `**${productTitle}**-এর ` : ''}বর্তমান সর্বশেষ ভার্সন হলো **${verText}**।\n\n👉 অফিসিয়াল লিংক: [https://t.me/OnlineTaskLab](https://t.me/OnlineTaskLab)`;
      }
      return `The current latest version for ${productTitle ? `**${productTitle}**` : 'this product'} is **${verText}**.\n\n👉 Official Link: [https://t.me/OnlineTaskLab](https://t.me/OnlineTaskLab)`;
    }

    // Specific Description inquiry
    if (asksDesc && extractedDesc) {
      if (analysis.replyLanguage === 'bangla') {
        return `${productTitle ? `**${productTitle}**-এর বিবরণ:` : 'প্রোডাক্টের বিবরণ:'}\n\n${extractedDesc}\n\n👉 অফিসিয়াল লিংক: [https://t.me/OnlineTaskLab](https://t.me/OnlineTaskLab)`;
      }
      return `The description for ${productTitle ? `**${productTitle}**` : 'this product'} is:\n\n${extractedDesc}\n\n👉 Official Link: [https://t.me/OnlineTaskLab](https://t.me/OnlineTaskLab)`;
    }

    if (analysis.intent === 'product_price') {
      if (extractedPrice && !extractedPrice.toLowerCase().includes('free') && !extractedPrice.includes('১০০% ফ্রি')) {
        if (analysis.replyLanguage === 'bangla') {
          return `${productTitle ? `**${productTitle}**-এর ` : ''}বর্তমান মূল্য **${extractedPrice}**।\n\n👉 অফিসিয়াল লিংক: [https://t.me/OnlineTaskLab](https://t.me/OnlineTaskLab)`;
        }
        return `The current price for ${productTitle ? `**${productTitle}**` : 'this product'} is **${extractedPrice}**.\n\n👉 Official Link: [https://t.me/OnlineTaskLab](https://t.me/OnlineTaskLab)`;
      } else {
        if (analysis.replyLanguage === 'bangla') {
          return `Online Task Lab (OTL)-এ ${productTitle ? `**${productTitle}** ` : ''}সম্পূর্ণ **১০০% ফ্রি**! কোনো ফি বা সাবস্ক্রিপশন প্রয়োজন নেই।\n\n👉 অফিসিয়াল টেলিগ্রাম চ্যানেল: [https://t.me/OnlineTaskLab](https://t.me/OnlineTaskLab)`;
        }
        return `This resource ${productTitle ? `(**${productTitle}**)` : ''} is **100% FREE** on Online Task Lab (OTL). No payment or subscription is required.\n\n👉 Official Telegram Channel: [https://t.me/OnlineTaskLab](https://t.me/OnlineTaskLab)`;
      }
    }

    if (analysis.intent === 'download_help') {
      if (analysis.replyLanguage === 'bangla') {
        return `OTL-এর রিসোর্সগুলো আমাদের অফিসিয়াল টেলিগ্রাম চ্যানেলের মাধ্যমে সরাসরি ফ্রিতে ডাউনলোড করা যায়:\n\n👉 ডাউনলোড লিংক: [https://t.me/OnlineTaskLab](https://t.me/OnlineTaskLab)\n\nটেলিগ্রাম চ্যানেলে গিয়ে ফাইলের পাশে ডাউনলোড আইকনে ক্লিক করুন।`;
      }
      return `You can download OTL resources directly and safely via our verified Telegram channel:\n\n👉 Download Link: [https://t.me/OnlineTaskLab](https://t.me/OnlineTaskLab)\n\nSimply click the download button inside Telegram to get the clean file.`;
    }

    if (analysis.intent === 'product_features') {
      if (analysis.replyLanguage === 'bangla') {
        return `OTL-এর প্রতিটি ফাইল ৭০+ অ্যান্টিভাইরাস ইঞ্জিন সমৃদ্ধ **VirusTotal** দিয়ে টেস্ট করা এবং শতভাগ নিরাপদ। অ্যান্ড্রয়েডে ইনস্টল করতে Settings থেকে "Install Unknown Apps" অপশনটি অন করুন।`;
      }
      return `Every file on OTL is thoroughly scanned with **VirusTotal** across 70+ antivirus engines and verified 100% safe. On Android, simply enable "Install Unknown Apps" in Settings to install.`;
    }

    // General product information
    if (analysis.replyLanguage === 'bangla') {
      return `${topContent}\n\n👉 ফ্রি ডাউনলোড লিংক: [https://t.me/OnlineTaskLab](https://t.me/OnlineTaskLab)`;
    }
    return `${topContent}\n\n👉 Free Download Link: [https://t.me/OnlineTaskLab](https://t.me/OnlineTaskLab)`;
  }

  // 4. If user asked a specific product query and it wasn't found in RAG
  if (analysis.intent === 'product_price' || analysis.intent === 'download_help' || analysis.intent === 'product_information' || analysis.intent === 'product_features') {
    return formatItemNotFoundResponse(prompt, analysis.replyLanguage);
  }

  // 5. Default natural conversational fallback
  if (analysis.replyLanguage === 'bangla') {
    return `আমি আপনাকে কীভাবে সাহায্য করতে পারি? কোনো অ্যাপ, প্রিসেট বা প্রম্পট সম্পর্কে জানার থাকলে জানাতে পারেন।`;
  }
  return `How can I assist you today? If you have questions about any app, preset, or prompt, feel free to ask!`;
}

/**
 * Built-in Grounded Knowledge Adapter
 */
export class GroundedKnowledgeAdapter implements AIProviderAdapter {
  public type = 'grounded_knowledge';

  public supportsVision(config: AIProviderConfig): boolean {
    return true;
  }

  public hasValidKey(config: AIProviderConfig): boolean {
    return true;
  }

  public async testConnection(config: AIProviderConfig): Promise<{ success: boolean; latencyMs: number; message: string }> {
    return {
      success: true,
      latencyMs: 8,
      message: 'OTL Grounded Knowledge Engine is active, verified, and running.'
    };
  }

  public async generate(config: AIProviderConfig, options: GenerateOptions): Promise<GenerateResult> {
    const text = synthesizeKnowledgeResponse(options);
    return {
      text,
      provider: 'OTL Smart Assistant',
      model: 'grounded-kb-v2'
    };
  }
}

/**
 * Provider Registry and Manager
 */
export class AIProviderManager {
  private adapters: Map<string, AIProviderAdapter> = new Map();
  private groundedAdapter: GroundedKnowledgeAdapter;

  constructor() {
    this.groundedAdapter = new GroundedKnowledgeAdapter();
    this.registerAdapter(new GeminiAdapter());
    this.registerAdapter(new GroqAdapter());
    this.registerAdapter(new OpenAICompatibleAdapter());
    this.registerAdapter(this.groundedAdapter);
  }

  public registerAdapter(adapter: AIProviderAdapter) {
    this.adapters.set(adapter.type.toLowerCase(), adapter);
  }

  public getAdapter(type: string): AIProviderAdapter {
    const adapter = this.adapters.get(type.toLowerCase());
    if (!adapter) {
      throw new Error(`AI Provider adapter "${type}" is not supported.`);
    }
    return adapter;
  }

  public hasValidKey(config: AIProviderConfig): boolean {
    try {
      const adapter = this.getAdapter(config.type);
      return adapter.hasValidKey(config);
    } catch {
      return false;
    }
  }

  public supportsVision(config: AIProviderConfig): boolean {
    try {
      const adapter = this.getAdapter(config.type);
      return adapter.supportsVision(config);
    } catch {
      return false;
    }
  }

  /**
   * Execute with primary provider, and auto-fallback if configured
   */
  public async executeWithFallback(
    primaryConfig: AIProviderConfig,
    fallbackConfig: AIProviderConfig | null,
    options: GenerateOptions,
    allConfigs?: AIProviderConfig[]
  ): Promise<GenerateResult> {
    const candidateQueue: AIProviderConfig[] = [];

    // Prioritize primary if it has a key
    if (this.hasValidKey(primaryConfig)) {
      candidateQueue.push(primaryConfig);
    }

    // Add fallback if it has a key and is different
    if (fallbackConfig && fallbackConfig.enabled && fallbackConfig.id !== primaryConfig.id && this.hasValidKey(fallbackConfig)) {
      if (!candidateQueue.some(c => c.id === fallbackConfig.id)) {
        candidateQueue.push(fallbackConfig);
      }
    }

    // If any other enabled providers have valid keys, queue them as robust safety nets
    if (allConfigs) {
      for (const cfg of allConfigs) {
        if (cfg.enabled && this.hasValidKey(cfg) && !candidateQueue.some(c => c.id === cfg.id)) {
          candidateQueue.push(cfg);
        }
      }
    }

    // If no candidate in queue, push primary anyway
    if (candidateQueue.length === 0) {
      candidateQueue.push(primaryConfig);
    }

    // If user provided an image attachment, prioritize vision-capable providers
    if (options.attachment && options.attachment.url) {
      candidateQueue.sort((a, b) => {
        const aVision = this.supportsVision(a) ? 1 : 0;
        const bVision = this.supportsVision(b) ? 1 : 0;
        return bVision - aVision;
      });

      // If no candidate supports vision, provide immediate clear guidance
      if (!candidateQueue.some(c => this.supportsVision(c))) {
        return {
          text: `⚠️ **ইমেজ বিশ্লেষণ সাময়িকভাবে অনুপলব্ধ:**\n\nবর্তমান সক্রিয় কোনো AI প্রোভাইডার ইমেজ বা স্ক্রিনশট বিশ্লেষণ সমর্থন করছে না। অনুগ্রহ করে সমস্যার বিবরণ টেক্সট আকারে লিখে জানান, অথবা আমাদের হিউম্যান সাপোর্ট টিমের সাহায্য নিন।\n\n[🚨 Report Issue] [👨‍💻 Human Support]`,
          provider: 'System Vision Checker',
          model: 'vision-unavailable'
        };
      }
    }

    for (let i = 0; i < candidateQueue.length; i++) {
      const providerConfig = candidateQueue[i];
      try {
        const adapter = this.getAdapter(providerConfig.type);
        const result = await adapter.generate(providerConfig, options);

        if (i > 0 && providerConfig.type !== 'grounded_knowledge') {
          return {
            ...result,
            text: `${result.text}\n\n*(Served via backup provider: ${providerConfig.name})*`
          };
        }
        return result;
      } catch (err: any) {
        // Provider unavailable or restricted; seamlessly try next provider in fallback queue
        const safeErr = err?.message || String(err);
        if (process.env.DEBUG_AI) {
          console.debug(`[AI Engine] Fallback from "${providerConfig.name}": ${safeErr}`);
        }
      }
    }

    // Seamlessly fall back to verified Grounded Knowledge Adapter so the chat never breaks
    return await this.groundedAdapter.generate(
      {
        id: 'provider-otl-grounded',
        name: 'OTL Smart Assistant',
        type: 'grounded_knowledge',
        model: 'grounded-kb-v2',
        temperature: 0.2,
        maxOutputTokens: 1200,
        enabled: true,
        isActive: false,
        isFallback: true,
        updatedAt: new Date().toISOString()
      },
      options
    );
  }
}
