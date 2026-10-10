import {
  getAccountRegistrationSteps,
  getLoginSteps,
  getGoogleLoginSteps,
  getOtpTroubleshootingSteps,
  getPasswordResetSteps,
  getDownloadSteps,
  getPaymentClarification,
  getApkInstallTroubleshootingSteps,
  getDownloadTroubleshootingSteps,
  getAccountTroubleshootingSteps,
  getDownloadProblemGuidance,
  OTL_WEBSITE_STRUCTURE
} from './websiteKnowledge';
import { SupportReportCategory } from './types';

export type DetectedLanguage = 'bangla' | 'banglish' | 'english';

export type UserIntent =
  | 'greeting'
  | 'general_conversation'
  | 'ai_identity'
  | 'website_navigation'
  | 'account_help'
  | 'login_help'
  | 'registration_help'
  | 'password_help'
  | 'otp_help'
  | 'google_login_help'
  | 'product_information'
  | 'product_price'
  | 'product_features'
  | 'download_help'
  | 'download_problem'
  | 'payment_help'
  | 'technical_problem'
  | 'account_problem'
  | 'order_problem'
  | 'report_problem'
  | 'human_support_request'
  | 'image_analysis'
  | 'url_analysis'
  | 'unknown';

export interface IntentAnalysisResult {
  intent: UserIntent;
  language: DetectedLanguage;
  replyLanguage: 'bangla' | 'english';
  needsRAG: boolean;
  resolvedSubject?: string;
  directResponse?: string;
  suggestedAction?: 'none' | 'offer_human' | 'offer_report' | 'open_report_modal' | 'show_login' | 'show_register';
  reportData?: {
    category: SupportReportCategory;
    title: string;
    summary: string;
  };
}

/**
 * Detect language of incoming user prompt:
 * - 'bangla': Contains Bengali Unicode script ([\u0980-\u09FF])
 * - 'banglish': Latin script with common phonetic Bengali tokens/stems
 * - 'english': Standard English
 */
export function detectLanguage(text: string): DetectedLanguage {
  const trimmed = text.trim();
  if (!trimmed) return 'english';

  // 1. Check for Bengali Unicode characters
  if (/[\u0980-\u09FF]/.test(trimmed)) {
    return 'bangla';
  }

  const lower = trimmed.toLowerCase();

  // 2. High-confidence Banglish markers and phonetic tokens
  const banglishTokens = new Set([
    'kivabe', 'ki vabe', 'korbo', 'korchi', 'korte', 'koro', 'koren', 'korle',
    'hobey', 'hobe', 'pabo', 'pacchi', 'pawa', 'jabe', 'jachhi',
    'kemon', 'achen', 'acho', 'vai', 'bhai', 'bhaiya', 'bro', 'apni', 'tumi', 'apnader', 'amader', 'amar',
    'kotha', 'bolte', 'chai', 'bolo', 'bolun', 'bolsen',
    'ki', 'kintu', 'lagbe', 'asche', 'ashbe', 'kaj', 'kaj kore',
    'taka', 'dam', 'koto', 'mullo', 'khoroch',
    'eta', 'eita', 'ei', 'etar', 'eitar', 'ota', 'oita', 'otar', 'er',
    'dekhbo', 'dekte', 'khujchi', 'dhonnobad', 'shukriya', 'shomossha', 'somossa',
    'salam', 'assalamu', 'alaikum', 'naki', 'ache', 'nai', 'parbo', 'bhalo',
    'shathe', 'sathe', 'amake', 'ektu', 'dorkar', 'khuje', 'ashche', 'hocche', 'korechi'
  ]);

  const words = lower.split(/[\s,.-_?()!/]+/).filter(w => w.length > 1);
  let banglishCount = 0;
  for (const w of words) {
    if (banglishTokens.has(w)) banglishCount++;
  }

  if (banglishCount > 0 || /^(salam|kemon\s*acho|kemon\s*achen|ki\s*khobor|dam\s*koto|kivabe|otp\s*ashche)\b/i.test(lower)) {
    return 'banglish';
  }

  return 'english';
}

/**
 * Check if the message is a human handoff request
 */
export function isHumanHandoffRequest(text: string): boolean {
  const lower = text.toLowerCase().trim();

  // English triggers
  const englishHandoff = [
    'talk to human', 'talk with human', 'speak to human', 'human support', 'human agent',
    'real person', 'support person', 'customer care', 'connect with admin',
    'live agent', 'live support', 'human please', 'speak with person', 'talk to person'
  ];
  if (englishHandoff.some(k => lower.includes(k))) return true;

  // Bengali triggers
  if (/[\u0980-\u09FF]/.test(lower)) {
    if (
      lower.includes('মানুষ') ||
      lower.includes('এডমিন') ||
      lower.includes('এজেন্ট') ||
      lower.includes('সাপোর্ট টিম') ||
      lower.includes('কথা বলতে চাই') ||
      lower.includes('মানুষের সাথে')
    ) {
      return true;
    }
  }

  // Banglish triggers
  const banglishHandoff = [
    'manush', 'admin er sathe', 'admin er shathe', 'kotha bolte chai',
    'human chai', 'agent chai', 'live support chai', 'admin kothay', 'admin help'
  ];
  if (banglishHandoff.some(k => lower.includes(k))) return true;

  // Exact single-word triggers
  if (lower === 'human' || lower === 'admin' || lower === 'agent' || lower === 'মানুষ') {
    return true;
  }

  return false;
}

/**
 * Check if the message is asking about the AI's identity or capabilities
 */
export function isAIIdentityQuery(text: string): boolean {
  const lower = text.toLowerCase().trim().replace(/[!?.,;:-]+$/g, '');

  // English
  const englishIdentity = [
    'who are you', 'what is your name', "what's your name", 'what are you',
    'who created you', 'who made you', 'what can you do', 'how can you help',
    'tell me about yourself', 'about yourself', 'who r u', 'ur name', 'your name'
  ];
  if (englishIdentity.some(pattern => lower === pattern || lower.startsWith(pattern))) {
    return true;
  }

  // Bengali
  if (
    lower.includes('তোমার নাম কী') ||
    lower.includes('তোমার নাম কি') ||
    lower.includes('তুমি কে') ||
    lower.includes('তোমার পরিচয় কি') ||
    lower.includes('তোমার পরিচয় কি') ||
    lower.includes('কে তোমাকে বানিয়েছে') ||
    lower.includes('কে তোমাকে তৈরি করেছে') ||
    lower.includes('তুমি কী করতে পারো') ||
    lower.includes('তুমি কি করতে পারো') ||
    lower.includes('কীভাবে সাহায্য করতে পারো') ||
    lower.includes('তোমার কাজ কি')
  ) {
    return true;
  }

  // Banglish
  const banglishIdentity = [
    'tomar nam ki', 'tomar name ki', 'tumi k', 'tumi ke', 'tumi ki korte paro',
    'tumi ki koro', 'tomar kaj ki', 'who created you'
  ];
  if (banglishIdentity.some(pattern => lower.includes(pattern))) {
    return true;
  }

  return false;
}

/**
 * Check if the message is a pure greeting
 */
export function isGreeting(text: string): boolean {
  const clean = text.toLowerCase().replace(/[!?.,;:-]+$/g, '').trim();

  // 1. English greetings
  const englishGreetings = [
    'hi', 'hello', 'hey', 'heya', 'hey there', 'hello there', 'hi there',
    'good morning', 'good afternoon', 'good evening', 'good day', 'howdy', 'yo', 'greetings'
  ];
  if (englishGreetings.includes(clean)) return true;

  const englishWordRegex = /^(hi|hello|hey|hey there|hi there)\b/i;
  if (englishWordRegex.test(clean) && clean.split(/\s+/).length <= 3 && !isSubstantiveQuery(clean)) {
    return true;
  }

  // 2. Bengali greetings
  const bengaliGreetings = [
    'হাই', 'হ্যালো', 'হে', 'আসসালামু আলাইকুম', 'সালাম', 'আসসালামুআলাইকুম',
    'কেমন আছেন', 'কেমন আছো', 'শুভ সকাল', 'শুভ অপরাহ্ন', 'শুভ সন্ধ্যা', 'নমস্কার', 'আদাব'
  ];
  if (bengaliGreetings.includes(clean)) return true;

  const bengaliGreetingRegex = /^(হাই|হ্যালো|হে|আসসালামু\s*আলাইকুম|সালাম|কেমন\s*আছেন|কেমন\s*আছো)/;
  if (bengaliGreetingRegex.test(clean) && clean.split(/\s+/).length <= 3 && !isSubstantiveQuery(clean)) {
    return true;
  }

  // 3. Banglish greetings
  const banglishGreetings = [
    'salam', 'assalamu alaikum', 'assalamualaikom', 'assalamualaikum',
    'kemon acho', 'kemon achen', 'ki khobor', 'kmn acho', 'kmn achen'
  ];
  if (banglishGreetings.includes(clean)) return true;

  return false;
}

/**
 * Check if the message is a simple conversational acknowledgment or closing
 */
export function isSimpleChat(text: string): boolean {
  const clean = text.toLowerCase().replace(/[!?.,;:-]+$/g, '').trim();

  const englishSimple = [
    'thanks', 'thank you', 'thx', 'ty', 'thank you so much', 'thanks a lot',
    'okay', 'ok', 'ok cool', 'okay cool', 'got it', 'great', 'nice', 'awesome',
    'super', 'good', 'understood', 'alright', 'all right', 'no problem',
    'bye', 'goodbye', 'see you', 'take care', 'perfect', 'cool'
  ];
  if (englishSimple.includes(clean)) return true;

  const bengaliSimple = [
    'ধন্যবাদ', 'অনেক ধন্যবাদ', 'থ্যাংকস', 'থ্যাঙ্কস', 'ঠিক আছে', 'আচ্ছা',
    'আচ্ছা ঠিক আছে', 'দারুণ', 'ভালো', 'সুন্দর', 'বিদায়', 'বাই', 'আলহামদুলিল্লাহ'
  ];
  if (bengaliSimple.includes(clean)) return true;

  const banglishSimple = [
    'dhonnobad', 'onek dhonnobad', 'thik ache', 'accha', 'accha thik ache',
    'onk valo', 'onek valo', 'valoi', 'bye', 'shukriya', 'alhamdulillah'
  ];
  if (banglishSimple.includes(clean)) return true;

  const gratitudeRegex = /\b(thanks?|thank\s*you|thx|ty|dhonnobad|shukriya)\b/i;
  const bengaliGratitudeRegex = /(ধন্যবাদ|থ্যাংকস|থ্যাঙ্কস|শুকরিয়া|আলহামদুলিল্লাহ)/;
  const ackRegex = /\b(ok|okay|alright|cool|great|awesome|got\s*it|thik\s*ache|accha|bye|goodbye)\b/i;
  const bengaliAckRegex = /(ঠিক\s*আছে|আচ্ছা|দারুণ|ভালো|সুন্দর|বিদায়|বাই)/;

  if (
    (gratitudeRegex.test(clean) || bengaliGratitudeRegex.test(clean) || ackRegex.test(clean) || bengaliAckRegex.test(clean)) &&
    clean.split(/\s+/).length <= 4 &&
    !isSubstantiveQuery(clean)
  ) {
    return true;
  }

  return false;
}

/**
 * Helper to test if a message contains substantive product, account, or website queries
 */
function isSubstantiveQuery(cleanText: string): boolean {
  return /\b(product|apk|app|preset|prompt|price|dam|cost|free|download|link|kivabe|how|what|features|taka|virustotal|safe|virus|login|register|otp|password|account|google|error|problem|somossa|report)\b/i.test(cleanText) ||
    /(প্রোডাক্ট|অ্যাপ|দাম|টাকা|ডাউনলোড|লিংক|ফ্রি|কীভাবে|ফিচার|লগইন|পাসওয়ার্ড|ওটিপি|একাউন্ট|সমস্যা|রিপোর্ট)/.test(cleanText);
}

/**
 * Resolve previous product context from recent conversation turns
 */
export function resolveContextSubject(recentTurns: { role: 'user' | 'model'; text: string }[], cachedResources?: any[]): string | undefined {
  if (!recentTurns || recentTurns.length === 0) return undefined;

  for (let i = recentTurns.length - 1; i >= 0; i--) {
    const turnText = recentTurns[i].text;
    if (!turnText) continue;

    if (cachedResources && cachedResources.length > 0) {
      for (const res of cachedResources) {
        if (res.title && turnText.toLowerCase().includes(res.title.toLowerCase())) {
          return res.title;
        }
      }
    }

    const knownNames = [
      'ChatGPT SEO Prompt', 'CapCut Pro', 'Lightroom Mobile VIP', 'Adobe Lightroom',
      'Remini Pro', 'Midjourney Prompt', 'PixelFlow', 'Canva Pro', 'PicsArt Gold'
    ];
    for (const name of knownNames) {
      if (turnText.toLowerCase().includes(name.toLowerCase())) {
        return name;
      }
    }
  }

  return undefined;
}

/**
 * Detects download problems across Bangla, English, Banglish and mixed phrases
 */
export function isDownloadProblemQuery(text: string): boolean {
  if (!text) return false;
  const lower = text.toLowerCase().trim();

  // Explicit problem phrases
  const explicitDownloadProblemPatterns = [
    // Bangla
    /ডাউনলোড\s*(করতে\s*পারছি\s*না|হচ্ছে\s*না|ব্যর্থ|সমস্যা|কাজ\s*করছে\s*না|হয়\s*না|ফেইল্ড|কেন)/i,
    /ডাউনলোড\s*বাটন\s*(কাজ\s*করছে\s*না|ক্লিক\s*হচ্ছে\s*না|কাজ\s*করে\s*না)/i,
    /ডাউনলোড\s*লিংক\s*(কাজ\s*করছে\s*না|ভেঙে\s*গেছে|পাচ্ছি\s*না|ওপেন\s*হচ্ছে\s*না)/i,
    /কেন\s*ডাউনলোড\s*(করতে\s*পারছি\s*না|হচ্ছে\s*না|করা\s*যাচ্ছে\s*না)/i,
    /কেন\s*download\s*(করতে\s*পারছি\s*না|হচ্ছে\s*না|করা\s*যাচ্ছে\s*না)/i,
    /ডাউনলোড\s*(করতে\s*পারছি\s*না|হচ্ছে\s*না)\s*কেন/i,
    /download\s*(করতে\s*পারছি\s*না|হচ্ছে\s*না)\s*কেন/i,
    /কোনো\s*(অ্যাপ|app|ফাইল|রিসোর্স)\s*ডাউনলোড\s*(করতে\s*পারছি\s*না|হচ্ছে\s*না)/i,
    /অ্যাপ\s*ডাউনলোড\s*হচ্ছে\s*না/i,
    /ফাইল\s*ডাউনলোড\s*হচ্ছে\s*না/i,
    /একাউন্ট\s*(ছাড়া|নেই|না\s*থাকলে|ছাড়া\s*কি)\s*ডাউনলোড/i,
    /একাউন্ট\s*খুলেছি\s*কিন্তু\s*ডাউনলোড/i,
    /লগইন\s*করেছি\s*কিন্তু\s*ডাউনলোড/i,
    /বাটনে\s*ক্লিক\s*করলে\s*(কিছু\s*হচ্ছে\s*না|কাজ\s*করে\s*না|কাজ\s*হয়\s*না)/i,
    /টেলিগ্রাম\s*লিংক\s*(ওপেন\s*হচ্ছে\s*না|কাজ\s*করছে\s*না)/i,

    // English
    /why\s*(can't|cant|cannot)\s*(i|we)?\s*download/i,
    /(can't|cant|cannot|unable\s*to)\s*download/i,
    /download\s*(is\s*)?(failed|failing|broken|not\s*working|stuck|error|issue|problem)/i,
    /download\s*(button|btn|link)\s*(is\s*)?(not\s*working|broken|dead|inactive|disabled|doesn't\s*work)/i,
    /why\s*is\s*(the\s*)?download\s*not\s*working/i,
    /problem\s*downloading/i,
    /having\s*trouble\s*downloading/i,
    /download\s*error/i,
    /download\s*failed/i,
    /cannot\s*download\s*(the\s*)?(app|file|resource|apk)?/i,
    /can't\s*download\s*(the\s*)?(app|file|resource|apk)?/i,
    /unable\s*to\s*download/i,
    /why\s*can't\s*i\s*download/i,

    // Banglish
    /download\s*hocche\s*na/i,
    /download\s*hochhe\s*na/i,
    /download\s*hocce\s*na/i,
    /download\s*hoy\s*na/i,
    /download\s*keno\s*(hocche\s*na|hoy\s*na|korte\s*partesi\s*na|korte\s*parchi\s*na|korte\s*parsi\s*na)/i,
    /keno\s*download\s*(korte\s*partesi\s*na|korte\s*parchi\s*na|korte\s*parsi\s*na|hocche\s*na|hoy\s*na)/i,
    /download\s*korte\s*(partesi|parchi|parsi)\s*na/i,
    /download\s*button\s*(kaj\s*kore\s*na|kaj\s*korche\s*na|click\s*hoy\s*na)/i,
    /download\s*link\s*(kaj\s*kore\s*na|kaj\s*korche\s*na|broken|open\s*hoy\s*na)/i,
    /button\s*(e|te)?\s*click\s*korle\s*kichu\s*(hoy|hocche)\s*na/i,
    /amar\s*(app|file|ta)?\s*download\s*hocche\s*na/i,
    /kono\s*(app|file)\s*download\s*(korte\s*partesi\s*na|hocche\s*na)/i,
    /account\s*nei\s*(ami\s*ki)?\s*download\s*korte\s*parbo/i,
    /account\s*chara\s*(ki\s*)?download/i,
    /account\s*khulechi\s*kintu\s*download\s*hocche\s*na/i,
    /login\s*korechi\s*kintu\s*download\s*hocche\s*na/i,
    /telegram\s*(link|download)\s*(open\s*hocche\s*na|kaj\s*kore\s*na|error)/i,
    /app\s*download\s*(korte\s*partesi\s*na|hocche\s*na)/i,
    /file\s*download\s*(korte\s*partesi\s*na|hocche\s*na)/i
  ];

  for (const pattern of explicitDownloadProblemPatterns) {
    if (pattern.test(lower)) return true;
  }

  // Combined: mentions download AND problem / error / fail / why
  const mentionsDownload =
    /\b(download|ডাউনলোড)\b/i.test(lower) ||
    /download/i.test(lower);

  const mentionsNegativeOrProblem =
    /\b(fail|failed|error|problem|broken|can't|cant|cannot|unable|stuck|blocked)\b/i.test(lower) ||
    /(hocche\s*na|hochhe\s*na|hocce\s*na|hoy\s*na|partesi\s*na|parchi\s*na|parsi\s*na|kaj\s*kore\s*na|kaj\s*korche\s*na)/i.test(lower) ||
    /(হচ্ছে\s*না|করতে\s*পারছি\s*না|কাজ\s*করছে\s*না|ব্যর্থ|সমস্যা|ইরর|কেন)/i.test(lower) ||
    /why\s*(can't|cant|not)/i.test(lower);

  if (mentionsDownload && mentionsNegativeOrProblem) {
    return true;
  }

  return false;
}

/**
 * Main intent analyzer pipeline adhering to Intent-First Architecture (A - U categories)
 */
export function analyzeIntent(
  userPrompt: string,
  recentTurns: { role: 'user' | 'model'; text: string }[] = [],
  cachedResources: any[] = [],
  attachment?: any,
  extractedUrls?: string[]
): IntentAnalysisResult {
  const prompt = (userPrompt || '').trim();
  const lower = prompt.toLowerCase();
  const language = detectLanguage(prompt);
  const replyLanguage: 'bangla' | 'english' = (language === 'bangla' || language === 'banglish') ? 'bangla' : 'english';

  // ================= IMAGE ANALYSIS PRIORITY =================
  if (attachment && attachment.url) {
    return {
      intent: 'image_analysis',
      language,
      replyLanguage,
      needsRAG: true,
      resolvedSubject: prompt || 'User uploaded image/screenshot'
    };
  }

  // ================= URL / LINK ANALYSIS PRIORITY =================
  if (extractedUrls && extractedUrls.length > 0) {
    return {
      intent: 'url_analysis',
      language,
      replyLanguage,
      needsRAG: true,
      resolvedSubject: extractedUrls[0]
    };
  }

  // ================= A. GREETING (NO RAG) =================
  if (isGreeting(prompt)) {
    let directResponse = '';
    const isHowAreYou = /how are you|kemon\s*acho|kemon\s*achen|kmn\s*acho|kmn\s*achen|কেমন\s*আছো|কেমন\s*আছেন/i.test(lower);

    if (replyLanguage === 'bangla') {
      if (lower.includes('salam') || lower.includes('সালাম') || lower.includes('alaikum')) {
        directResponse = 'ওয়ালাইকুম আসসালাম! আমি OTL Live Support Assistant। কীভাবে সাহায্য করতে পারি? 😊';
      } else if (isHowAreYou) {
        directResponse = 'আমি ভালো আছি, ধন্যবাদ! আমি OTL Live Support Assistant। আপনাকে কীভাবে সাহায্য করতে পারি? 😊';
      } else {
        directResponse = 'হাই! আমি OTL Live Support Assistant। কীভাবে সাহায্য করতে পারি? 😊';
      }
    } else {
      if (isHowAreYou) {
        directResponse = "I'm doing great, thank you! I'm the OTL Live Support Assistant. How can I help you today? 😊";
      } else {
        directResponse = "Hi there! I'm the OTL Live Support Assistant. How can I help you today? 😊";
      }
    }

    return {
      intent: 'greeting',
      language,
      replyLanguage,
      needsRAG: false,
      directResponse
    };
  }

  // ================= B. GENERAL CONVERSATION (NO RAG) =================
  if (isSimpleChat(prompt)) {
    let directResponse = '';
    const isThanks = /thanks|thank\s*you|thx|ধন্যবাদ|dhonnobad|shukriya/i.test(lower);
    const isOk = /ok|okay|alright|ঠিক\s*আছে|আচ্ছা|thik\s*ache|accha/i.test(lower);

    if (replyLanguage === 'bangla') {
      if (isThanks) {
        directResponse = 'স্বাগতম! 😊 কোনো বিষয়ে সাহায্য লাগলে জানাবেন।';
      } else if (isOk) {
        directResponse = 'ঠিক আছে! আপনার কোনো প্রশ্ন বা সাহায্য লাগলে যেকোনো সময় জানান। 😊';
      } else {
        directResponse = 'ধন্যবাদ! ভালো থাকবেন। OTL-এর সাথে থাকার জন্য ধন্যবাদ! 😊';
      }
    } else {
      if (isThanks) {
        directResponse = "You're very welcome! 😊 Feel free to ask if you need anything else.";
      } else if (isOk) {
        directResponse = 'Alright! Let me know if you need help with anything on OTL.';
      } else {
        directResponse = 'Glad to assist you! Have a wonderful day. 😊';
      }
    }

    return {
      intent: 'general_conversation',
      language,
      replyLanguage,
      needsRAG: false,
      directResponse
    };
  }

  // ================= C. AI IDENTITY (NO RAG) =================
  if (isAIIdentityQuery(prompt)) {
    let directResponse = '';
    const isAskingName = /name|nam\s*ki|নাম\s*কী|নাম\s*কি|who are you|tumi\s*ke|tumi\s*k|তুমি\s*কে/i.test(lower);
    const isAskingCapabilities = /what can you do|ki korte paro|কী\s*করতে\s*পারো|কি\s*করতে\s*পারো|your job|kaj\s*ki/i.test(lower);

    if (replyLanguage === 'bangla') {
      if (isAskingName && !isAskingCapabilities) {
        directResponse = 'আমি OTL Live Support Assistant। 😊 আমি Online Task Lab প্ল্যাটফর্মের ইউজারদের সাহায্য করার জন্য নিয়োজিত।';
      } else if (isAskingCapabilities) {
        directResponse = 'আমি OTL ওয়েবসাইটের তথ্য, প্রোডাক্ট, অ্যাকাউন্ট, ডাউনলোড এবং বিভিন্ন সমস্যার বিষয়ে সাহায্য করতে পারি। আপনি আমাকে যেকোনো প্রশ্ন করতে পারেন!';
      } else {
        directResponse = 'আমি OTL Live Support Assistant। আমি Online Task Lab-এর অ্যান্ড্রয়েড অ্যাপ, প্রিসেট, প্রম্পট, অ্যাকাউন্ট ও টেকনিক্যাল বিষয়ে সাহায্য করতে পারি।';
      }
    } else {
      if (isAskingName && !isAskingCapabilities) {
        directResponse = "I am the OTL Live Support Assistant. 😊 I'm here to assist you with everything on the Online Task Lab platform.";
      } else if (isAskingCapabilities) {
        directResponse = "I can assist you with OTL website navigation, products, accounts, free downloads, and troubleshooting issues. Feel free to ask me anything!";
      } else {
        directResponse = "I'm the OTL Live Support Assistant, designed to help you navigate Online Task Lab, download resources, manage accounts, and solve problems.";
      }
    }

    return {
      intent: 'ai_identity',
      language,
      replyLanguage,
      needsRAG: false,
      directResponse
    };
  }

  // ================= T. HUMAN SUPPORT REQUEST (NO RAG) =================
  if (isHumanHandoffRequest(prompt)) {
    let directResponse = '';
    if (replyLanguage === 'bangla') {
      directResponse = 'আমি আপনার অনুরোধটি আমাদের এডমিন ও সাপোর্ট স্পেশালিস্টদের কাছে পাঠিয়ে দিয়েছি। একজন এডমিন শীঘ্রই এখানে উত্তর দেবেন। আপনি চাইলে আপনার সমস্যার বিস্তারিত এখানে লিখে রাখতে পারেন।';
    } else {
      directResponse = 'I have escalated your request to our human support team. A specialist will review your conversation and reply right here shortly. Feel free to leave any additional details in the meantime.';
    }

    return {
      intent: 'human_support_request',
      language,
      replyLanguage,
      needsRAG: false,
      directResponse,
      suggestedAction: 'offer_human'
    };
  }

  // ================= S. REPORT PROBLEM INTENT (NO RAG) =================
  const isReportIntent =
    /report\s*(a\s*)?problem|report\s*issue|file\s*report|somossa\s*report|problem\s*report|complain/i.test(lower) ||
    /সমস্যা\s*রিপোর্ট|একটি\s*সমস্যা\s*রিপোর্ট|রিপোর্ট\s*করতে\s*চাই|কমপ্লেইন/i.test(lower);

  if (isReportIntent) {
    let directResponse = '';
    if (replyLanguage === 'bangla') {
      directResponse = 'আপনি ওপরে থাকা **"Report Problem"** বাটনে ক্লিক করে সরাসরি একটি অফিসিয়াল সাপোর্ট রিপোর্ট তৈরি করতে পারেন। অথবা আপনি সমস্যার বিবরণ এবং স্ক্রিনশট এখানে দিলে আমি রিপোর্টটি ফাইল করে দেব।';
    } else {
      directResponse = 'You can click the **"Report Problem"** button above to file an official support ticket, or describe the issue and upload a screenshot here and I will create the report for you.';
    }

    return {
      intent: 'report_problem',
      language,
      replyLanguage,
      needsRAG: false,
      directResponse,
      suggestedAction: 'open_report_modal'
    };
  }

  // ================= J. GOOGLE LOGIN HELP (NO RAG) =================
  const isGoogleLogin =
    /google\s*(login|sign\s*in|account|auth)|continue\s*with\s*google/i.test(lower) ||
    /গুগল\s*(লগইন|সাইন\s*ইন|দিয়ে)/i.test(lower) ||
    /google\s*diye\s*login/i.test(lower);

  if (isGoogleLogin && (lower.includes('kivabe') || lower.includes('how') || lower.includes('problem') || lower.includes('error') || lower.includes('কাজ') || lower.includes('কাজ করছে না') || lower.includes('কিভাবে') || lower.includes('কোথায়'))) {
    return {
      intent: 'google_login_help',
      language,
      replyLanguage,
      needsRAG: false,
      directResponse: getGoogleLoginSteps(replyLanguage)
    };
  }

  // ================= I. OTP HELP (NO RAG) =================
  const isOtpHelp =
    /\b(otp|verification\s*code|verify\s*email)\b/i.test(lower) ||
    /ওটিপি|ভেরিফিকেশন\s*কোড|কোড\s*আসছে\s*না|otp\s*ashche\s*na|otp\s*pacchi\s*na/i.test(lower);

  if (isOtpHelp) {
    return {
      intent: 'otp_help',
      language,
      replyLanguage,
      needsRAG: false,
      directResponse: getOtpTroubleshootingSteps(replyLanguage),
      suggestedAction: 'offer_report'
    };
  }

  // ================= H. PASSWORD HELP (NO RAG) =================
  const isPasswordHelp =
    /forgot\s*password|reset\s*password|password\s*vule\s*gechi|pass\s*mone\s*nai/i.test(lower) ||
    /পাসওয়ার্ড\s*ভুলে\s*গেছি|পাসওয়ার্ড\s*রিসেট|পাসওয়ার্ড\s*মনে\s*নেই/i.test(lower);

  if (isPasswordHelp) {
    return {
      intent: 'password_help',
      language,
      replyLanguage,
      needsRAG: false,
      directResponse: getPasswordResetSteps(replyLanguage)
    };
  }

  // ================= G. REGISTRATION HELP / ACCOUNT HELP (NO RAG) =================
  const isRegistration =
    /create\s*account|new\s*account|sign\s*up|register|registration/i.test(lower) ||
    /নতুন\s*একাউন্ট|একাউন্ট\s*খুলবো|রেজিস্ট্রেশন|সাইন\s*আপ/i.test(lower) ||
    /notun\s*account|account\s*khulbo\s*kivabe|sign\s*up\s*kivabe/i.test(lower);

  if (isRegistration && !lower.includes('product') && !lower.includes('apk')) {
    return {
      intent: 'registration_help',
      language,
      replyLanguage,
      needsRAG: false,
      directResponse: getAccountRegistrationSteps(replyLanguage),
      suggestedAction: 'show_register'
    };
  }

  // ================= F. LOGIN HELP (NO RAG) =================
  const isLoginHelp =
    /how\s*to\s*(sign\s*in|login)|where\s*is\s*login|login\s*kothay|sign\s*in\s*kivabe/i.test(lower) ||
    /কীভাবে\s*লগইন|কিভাবে\s*লগইন|লগইন\s*কোথায়|সাইন\s*ইন/i.test(lower) ||
    /login\s*kivabe|sign\s*in\s*kivabe|login\s*korbo/i.test(lower);

  if (isLoginHelp && !lower.includes('product')) {
    return {
      intent: 'login_help',
      language,
      replyLanguage,
      needsRAG: false,
      directResponse: getLoginSteps(replyLanguage),
      suggestedAction: 'show_login'
    };
  }

  // ================= O. PAYMENT HELP (NO RAG) =================
  const isPayment =
    /\b(payment|taka|paid|bought|purchase|bkash|nagad|subscription|টাকা\s*দিয়েছি|পেমেন্ট)\b/i.test(lower);

  if (isPayment && (lower.includes('paini') || lower.includes('not received') || lower.includes('done') || lower.includes('korechi') || lower.includes('পেমেন্ট করেছি') || lower.includes('টাকা দিয়েছি') || lower.includes('how to pay'))) {
    return {
      intent: 'payment_help',
      language,
      replyLanguage,
      needsRAG: false,
      directResponse: getPaymentClarification(replyLanguage),
      suggestedAction: 'offer_report'
    };
  }

  // ================= D. WEBSITE NAVIGATION (NO RAG) =================
  const isWebsiteNav =
    /how\s*to\s*use\s*(this\s*)?(website|site)|home\s*page\s*e\s*ki|category\s*kothay|search\s*kothay/i.test(lower) ||
    /ওয়েবসাইট\s*কীভাবে\s*ব্যবহার|ক্যাটাগরি\s*কোথায়|সার্চ\s*কোথায়|হোম\s*পেজ/i.test(lower) ||
    /website\s*kivabe\s*use|site\s*kivabe/i.test(lower);

  if (isWebsiteNav) {
    let directResponse = '';
    if (replyLanguage === 'bangla') {
      directResponse = `Online Task Lab (OTL Hub) ব্যবহারের সহজ নিয়মাবলী:

1. **হোমপেজ ও ক্যাটাগরি:** ওপরের ন্যাভিগেশন বার থেকে Android Apps, Lightroom VIP Presets, CapCut Pro, Prompts ইত্যাদি ক্যাটাগরিতে ক্লিক করে ফিল্টার করতে পারেন।
2. **সার্চ বার:** ওপরের ডানদিকের সার্চ আইকন বা **⌘K** চাপলে সার্চ উইন্ডো আসবে—সেখানে যেকোনো অ্যাপের নাম লিখে তাৎক্ষণিক খুঁজে পাবেন।
3. **ফ্রি ডাউনলোড:** যে ফাইলটি চান তার ওপর ক্লিক করুন এবং **"Free Download"** বাটনে চাপলে সরাসরি আমাদের অফিসিয়াল ভেরিফায়েড টেলিগ্রাম চ্যানেল থেকে ডাউনলোড করতে পারবেন।
4. **অ্যাকাউন্ট ও হিস্ট্রি:** ওপরের **"My Account"** বাটনে ক্লিক করে লগইন বা রেজিস্ট্রেশন করতে পারেন।
5. **টেলিগ্রাম কমিউনিটি:** নিচে ডানদিকের টেলিগ্রাম আইকনে ক্লিক করে আমাদের ডিসকাশন গ্রুপে যোগ দিতে পারেন।`;
    } else {
      directResponse = `Here is how to navigate Online Task Lab (OTL Hub):

1. **Browse Categories:** Use the top header tabs or category cards to filter resources (Android MOD APKs, Lightroom VIP Presets, CapCut Pro assets, AI Prompts).
2. **Instant Search:** Click the Search bar or press **⌘K** to quickly find any specific app or tool.
3. **Free Downloads:** Click on any resource card to view details and safety scan, then click **"Free Download"** to get the file via our official Telegram channel.
4. **My Account:** Click **"My Account"** in the top right to log in, register, and manage your account.
5. **Community:** Join our verified discussion community using the floating Telegram button in the lower corner.`;
    }

    return {
      intent: 'website_navigation',
      language,
      replyLanguage,
      needsRAG: false,
      directResponse
    };
  }

  // ================= P & Q & R: TECHNICIAN TROUBLESHOOTING FLOW =================
  // Checks if the user is facing an installation failure, download failure, account failure, or general technical issue

  // 0. Website-Aware Download Problem Detection (Bangla, English, Banglish)
  if (isDownloadProblemQuery(prompt)) {
    let resolvedSubject: string | undefined;
    if (cachedResources && cachedResources.length > 0) {
      for (const res of cachedResources) {
        if (res.title && lower.includes(res.title.toLowerCase())) {
          resolvedSubject = res.title;
          break;
        }
      }
    }
    if (!resolvedSubject) {
      const knownNames = [
        'CapCut Pro', 'Lightroom Mobile VIP', 'Adobe Lightroom', 'ChatGPT SEO Prompt',
        'Remini Pro', 'Canva Pro', 'PicsArt Gold', 'PixelFlow'
      ];
      for (const name of knownNames) {
        if (lower.includes(name.toLowerCase())) {
          resolvedSubject = name;
          break;
        }
      }
    }
    if (!resolvedSubject) {
      resolvedSubject = resolveContextSubject(recentTurns, cachedResources);
    }

    return {
      intent: 'download_problem',
      language,
      replyLanguage,
      needsRAG: true,
      resolvedSubject,
      suggestedAction: 'offer_report',
      reportData: {
        category: 'download',
        title: 'Download Troubleshooting: ' + prompt.slice(0, 50),
        summary: prompt
      }
    };
  }

  const isApkInstallIssue =
    /\b(install\s*(error|problem|failed|hocche\s*na|korte\s*parchi\s*na)|can't\s*install|not\s*installing|parse\s*error|package\s*corrupt|play\s*protect|blocked)\b/i.test(lower) ||
    /ইনস্টল\s*(হচ্ছে\s*না|করতে\s*পারছি\s*না|ব্যর্থ|সমস্যা)|প্লে\s*প্রোটেক্ট/i.test(lower) ||
    /install\s*hocche\s*na|install\s*hoy\s*na/i.test(lower);

  const isDownloadIssue =
    /\b(download\s*(failed|error|problem|hocche\s*na|link\s*broken|link\s*expired)|can't\s*download|telegram\s*(link|error|open\s*hocche\s*na))\b/i.test(lower) ||
    /ডাউনলোড\s*(হচ্ছে\s*না|ব্যর্থ|সমস্যা|লিংক\s*কাজ\s*করছে\s*না)|টেলিগ্রাম\s*লিংক/i.test(lower) ||
    /link\s*kaj\s*kore\s*na|download\s*hoy\s*na|link\s*open\s*hoy\s*na/i.test(lower);

  const isAccountIssue =
    /\b(login\s*(failed|problem|error|hocche\s*na|korte\s*parchi\s*na)|account\s*(blocked|locked|problem)|sign\s*in\s*failed)\b/i.test(lower) ||
    /লগইন\s*(হচ্ছে\s*না|করতে\s*পারছি\s*না|সমস্যা)|একাউন্ট\s*সমস্যা/i.test(lower) ||
    /login\s*hoy\s*na|sign\s*in\s*hocche\s*na/i.test(lower);

  const isOtpIssue =
    /\b(otp\s*(asche\s*na|paini|not\s*received|problem|error)|verification\s*code\s*not\s*received)\b/i.test(lower) ||
    /ওটিপি\s*(আসছে\s*না|পাচ্ছি\s*না|পায়নি|সমস্যা)|ভেরিফিকেশন\s*কোড/i.test(lower);

  const isGeneralProblem =
    /\b(problem|error|failed|not working|crash|bug|stuck|কাজ করছে না|সমস্যা|ইরর|কাজ করে না|kaj kore na|hocche na|problem hocche)\b/i.test(lower);

  // 1. Specific APK Install Troubleshooting
  if (isApkInstallIssue) {
    return {
      intent: 'technical_problem',
      language,
      replyLanguage,
      needsRAG: false,
      directResponse: getApkInstallTroubleshootingSteps(replyLanguage),
      suggestedAction: 'offer_report',
      reportData: {
        category: 'technical',
        title: 'APK Installation Issue: ' + prompt.slice(0, 50),
        summary: prompt
      }
    };
  }

  // 2. Specific Download / Link Troubleshooting
  if (isDownloadIssue) {
    return {
      intent: 'download_help',
      language,
      replyLanguage,
      needsRAG: false,
      directResponse: getDownloadTroubleshootingSteps(replyLanguage),
      suggestedAction: 'offer_report',
      reportData: {
        category: 'download',
        title: 'Download / Link Issue: ' + prompt.slice(0, 50),
        summary: prompt
      }
    };
  }

  // 3. Specific OTP Troubleshooting
  if (isOtpIssue) {
    return {
      intent: 'otp_help',
      language,
      replyLanguage,
      needsRAG: false,
      directResponse: getOtpTroubleshootingSteps(replyLanguage),
      suggestedAction: 'offer_report',
      reportData: {
        category: 'account',
        title: 'OTP Delivery Issue: ' + prompt.slice(0, 50),
        summary: prompt
      }
    };
  }

  // 4. Specific Account / Login Troubleshooting
  if (isAccountIssue) {
    return {
      intent: 'account_problem',
      language,
      replyLanguage,
      needsRAG: false,
      directResponse: getAccountTroubleshootingSteps(replyLanguage),
      suggestedAction: 'offer_report',
      reportData: {
        category: 'account',
        title: 'Account / Login Problem: ' + prompt.slice(0, 50),
        summary: prompt
      }
    };
  }

  // 5. General Problem / Error Troubleshooting
  if (isGeneralProblem && !lower.includes('product') && !lower.includes('preset')) {
    let directResponse = '';
    if (replyLanguage === 'bangla') {
      directResponse = `🛠️ **টেকনিশিয়ান ডায়াগনসিস:** আপনার সমস্যার সমাধান করতে নিচের প্রাথমিক ধাপগুলো পরীক্ষা করুন:

১. **ব্রাউজার রিফ্রেশ ও ক্যাশ ক্লিয়ার:** ক্যাশ বা কুকিজ সমস্যার কারণে অনেক সময় স্ক্রিন লোড হতে দেরি হয়। ব্রাউজার রিফ্রেশ করুন।
২. **স্ক্রিনশট বা এরর কোড:** সমস্যাটি স্পষ্টভাবে বুঝতে একটি স্ক্রিনশট নিচে এটাচ করে পাঠান।
৩. **অফিশিয়াল রিপোর্ট দাখিল:** আপনি চাইলে আমি অবিলম্বে এটি আমাদের টেকনিক্যাল অ্যাডমিনদের কাছে একটি **Support Report** হিসেবে পাঠিয়ে দিতে পারি।

❓ **আপনি কি একটি অফিসিয়াল সাপোর্ট রিপোর্ট তৈরি করতে চান?** ওপরের **"Report Problem"** বাটনে চাপুন অথবা আমাকে বলুন, আমি এটি তৈরি করে দেব।`;
    } else {
      directResponse = `🛠️ **Technician Diagnostic:** Let's troubleshoot and diagnose this issue:

1. **Clear Browser Cache & Refresh:** Stale cache or network latency often causes temporary UI/loading glitches. Try a hard refresh.
2. **Provide Error Code / Screenshot:** If there is a specific error code or notification on screen, please attach a screenshot below.
3. **Escalate to Technician Staff:** If the issue persists, our technical team can review the system logs and resolve it for you.

❓ **Would you like me to file an official Support Report for our administrators?** You can click the **"Report Problem"** button above or tell me to file it for you.`;
    }

    return {
      intent: 'technical_problem',
      language,
      replyLanguage,
      needsRAG: false,
      directResponse,
      suggestedAction: 'offer_report',
      reportData: {
        category: 'technical',
        title: 'Technical Issue: ' + prompt.slice(0, 50),
        summary: prompt
      }
    };
  }

  // ================= CONTEXT RESOLUTION FOR PRODUCT QUERIES =================
  const resolvedSubject = resolveContextSubject(recentTurns, cachedResources);

  // ================= L. PRODUCT PRICE (REQUIRES RAG) =================
  const isPrice =
    /\b(dam|taka|cost|price|how much|free|pricing|মূল্য|টাকা|দাম|ফ্রি)\b/i.test(lower) ||
    /দাম\s*কত|টাকা\s*কত|মূল্য\s*কত|dam\s*koto|taka\s*koto|eta\s*ki\s*free/i.test(lower);

  if (isPrice) {
    return {
      intent: 'product_price',
      language,
      replyLanguage,
      resolvedSubject,
      needsRAG: true
    };
  }

  // ================= N. DOWNLOAD HELP (REQUIRES RAG IF SPECIFIC PRODUCT) =================
  const isDownload =
    /\b(download|link|kothay\s*pabo|kivabe\s*download|ডাউনলোড|কোথায়\s*পাব|লিংক)\b/i.test(lower) ||
    /download\s*kivabe|how\s*to\s*download|where\s*to\s*download/i.test(lower);

  if (isDownload) {
    return {
      intent: 'download_help',
      language,
      replyLanguage,
      resolvedSubject,
      needsRAG: true
    };
  }

  // ================= M. PRODUCT FEATURES (REQUIRES RAG) =================
  const isFeatures =
    /\b(features|specs|version|requirements|safety|safe|virus|virustotal|ফিচার|ভার্সন|নিরাপদ)\b/i.test(lower);

  if (isFeatures) {
    return {
      intent: 'product_features',
      language,
      replyLanguage,
      resolvedSubject,
      needsRAG: true
    };
  }

  // ================= K. PRODUCT INFORMATION (REQUIRES RAG) =================
  // If the prompt mentions app/mod/preset/prompt or specific title
  const isProductInfo =
    /\b(product|apk|app|mod|preset|lightroom|capcut|prompt|chatgpt|canva|remini)\b/i.test(lower) ||
    /(প্রোডাক্ট|অ্যাপ|মড|প্রিসেট)/.test(lower) ||
    resolvedSubject !== undefined;

  if (isProductInfo) {
    return {
      intent: 'product_information',
      language,
      replyLanguage,
      resolvedSubject,
      needsRAG: true
    };
  }

  // ================= U. GENERAL INQUIRY / FAQ / CATALOG FALLBACK =================
  const isTrivial = isGreeting(prompt) || isSimpleChat(prompt);
  return {
    intent: isTrivial ? 'unknown' : 'general_conversation',
    language,
    replyLanguage,
    resolvedSubject: resolvedSubject || (!isTrivial ? prompt : undefined),
    needsRAG: !isTrivial
  };
}

/**
 * Format not-found response when a specific requested item is missing from the catalog
 */
export function formatItemNotFoundResponse(itemQuery: string, replyLanguage: 'bangla' | 'english'): string {
  if (replyLanguage === 'bangla') {
    return `আমি OTL-এর বর্তমান ক্যাটালগে এই প্রোডাক্টটি খুঁজে পাচ্ছি না। আপনি আমাদের অফিসিয়াল টেলিগ্রাম গ্রুপে ফ্রিতে রিকোয়েস্ট করতে পারেন (https://t.me/OnlineTaskLabGroup) অথবা ওপরে "Talk to Human" এ ক্লিক করে আমাদের সাপোর্ট টিমের সাথে কথা বলতে পারেন।`;
  }
  return `I could not find this product in Online Task Lab's current catalog. You can submit a free request in our official Telegram community (https://t.me/OnlineTaskLabGroup), or click "Talk to Human" to speak directly with our team.`;
}

/**
 * Generate a clean, concise, human-friendly conversation title from the first user message (like ChatGPT)
 */
export function generateConversationTitle(text: string, intent?: UserIntent): string {
  const trimmed = (text || '').trim();
  if (!trimmed) return 'New Conversation';

  const isBengali = /[\u0980-\u09FF]/.test(trimmed);
  const lower = trimmed.toLowerCase();

  // 1. Download & Installation Queries
  if (/(download|নামাবো|নামাতে|ডাউনলোড|apk\s*install|ইনস্টল|ইন্সটল)/i.test(lower)) {
    if (/capcut/i.test(lower)) {
      return isBengali ? 'CapCut Pro ডাউনলোড' : 'CapCut Pro Download';
    }
    if (/lightroom/i.test(lower)) {
      return isBengali ? 'Lightroom Presets ডাউনলোড' : 'Lightroom Presets Download';
    }
    if (/সমস্যা|না\s*হওয়া|হচ্ছে\s*না|কারণ|somossa|error|fail|not\s*working/i.test(lower)) {
      return isBengali ? 'অ্যাপ ডাউনলোড সমস্যা ও সমাধান' : 'App Download Troubleshooting';
    }
    return isBengali ? 'অ্যাপ ও রিসোর্স ডাউনলোড' : 'Download Assistance';
  }

  // 2. OTP Issues
  if (/otp/i.test(lower)) {
    if (/asche\s*na|ashche\s*na|problem|error|পায়নি|পাচ্ছিনা|আসছে\s*না|সমস্যা|not\s*working|failed/i.test(lower)) {
      return isBengali ? 'OTP সমস্যা ও সমাধান' : 'OTP Problem & Verification';
    }
    return isBengali ? 'OTP ভেরিফিকেশন সহায়তা' : 'OTP Verification Help';
  }

  // 3. Account Creation & Registration
  if (/(create\s*account|open\s*account|register|registration|account\s*khulbo|account\s*kivabe|একাউন্ট\s*খুলব|অ্যাকাউন্ট\s*খুলব|নতুন\s*একাউন্ট|নতুন\s*অ্যাকাউন্ট)/i.test(lower)) {
    return isBengali ? 'নতুন অ্যাকাউন্ট তৈরি' : 'How to Create an Account';
  }

  // 4. Google Login
  if (/(google\s*login|google\s*sign\s*in|গুগল\s*লগইন)/i.test(lower)) {
    return isBengali ? 'Google লগইন সহায়তা' : 'Google Login Help';
  }

  // 5. Login Queries
  if (/(login|sign\s*in|log\s*in|লগইন)/i.test(lower)) {
    if (/problem|error|somossa|পারছি\s*না|সমস্যা|failed/i.test(lower)) {
      return isBengali ? 'অ্যাকাউন্ট লগইন সমস্যা' : 'Login Problem';
    }
    return isBengali ? 'অ্যাকাউন্ট লগইন সহায়তা' : 'Account Login Help';
  }

  // 6. Password Reset
  if (/(password|pass\s*bhule|পাসওয়ার্ড|reset\s*password|forgot\s*password)/i.test(lower)) {
    return isBengali ? 'পাসওয়ার্ড রিসেট গাইড' : 'Password Reset Help';
  }

  // 7. Pricing & Subscriptions
  if (/(দাম\s*কত|dam\s*koto|price|cost|price\s*koto|মূল্য|free|subscription|সাবস্ক্রিপশন|টাকা)/i.test(lower)) {
    if (/capcut/i.test(lower)) return isBengali ? 'CapCut Pro এর মূল্য' : 'CapCut Pro Price';
    if (/canva/i.test(lower)) return isBengali ? 'Canva Pro এর মূল্য' : 'Canva Pro Price';
    return isBengali ? 'প্রোডাক্ট মূল্য ও সাবস্ক্রিপশন' : 'Product Price Inquiry';
  }

  // 8. Human Support / Specialist
  if (/(human|manush|agent|support\s*team|এডমিন|admin|specialist|মানুষ|কথা\s*বলতে)/i.test(lower)) {
    return isBengali ? 'সাপোর্ট এজেন্টের সাহায্য' : 'Human Support Request';
  }

  // 9. Safety, Virus, Verification
  if (/(virus|safe|security|নিরাপদ|ভাইরাস|ম্যালওয়্যার|malware|virustotal)/i.test(lower)) {
    return isBengali ? 'অ্যাপ সুরক্ষা ও ভাইরাস টেস্ট' : 'MOD APK Safety & Verification';
  }

  // 10. Specific Catalog Products
  if (/capcut/i.test(lower)) return isBengali ? 'CapCut Pro Mod সহায়তা' : 'CapCut Pro Inquiry';
  if (/lightroom/i.test(lower)) return isBengali ? 'Lightroom Presets সহায়তা' : 'Lightroom Presets';
  if (/canva/i.test(lower)) return isBengali ? 'Canva Pro সংক্রান্ত' : 'Canva Pro Question';
  if (/prompt/i.test(lower)) return isBengali ? 'AI Prompts সহায়তা' : 'AI Prompts Inquiry';
  if (/telegram/i.test(lower)) return isBengali ? 'টেলিগ্রাম চ্যানেল ও ডাউনলোড' : 'Telegram Channel Links';

  // 11. Greetings
  if (/^(hi|hello|hey|salam|assalamu\s*alaikum|হাই|হ্যালো|সালাম)\b/i.test(lower)) {
    return isBengali ? 'সাধারণ শুভেচ্ছা' : 'Support Greeting';
  }

  // 12. Intent-based naming fallback
  if (intent === 'greeting') return isBengali ? 'সাধারণ শুভেচ্ছা' : 'Greeting';
  if (intent === 'account_help' || intent === 'registration_help') return isBengali ? 'নতুন অ্যাকাউন্ট তৈরি' : 'How to Create an Account';
  if (intent === 'login_help') return isBengali ? 'অ্যাকাউন্ট লগইন সহায়তা' : 'Login Help';
  if (intent === 'password_help') return isBengali ? 'পাসওয়ার্ড রিসেট গাইড' : 'Password Reset';
  if (intent === 'otp_help') return isBengali ? 'OTP ভেরিফিকেশন সমস্যা' : 'OTP Verification';
  if (intent === 'product_price') return isBengali ? 'প্রোডাক্ট মূল্য ও সাবস্ক্রিপশন' : 'Product Price';
  if (intent === 'download_help') return isBengali ? 'অ্যাপ ও রিসোর্স ডাউনলোড' : 'Download Help';
  if (intent === 'technical_problem') return isBengali ? 'টেকনিক্যাল সমস্যা ও সমাধান' : 'Technical Issue';
  if (intent === 'human_support_request') return isBengali ? 'সাপোর্ট এজেন্টের সাহায্য' : 'Human Support';

  // 13. Smart ChatGPT-Style Text Cleanser & Truncator
  let cleaned = trimmed
    .replace(/^["'#*`]+|["'#*`]+$/g, '')
    .replace(/[?!।:;]+$/, '')
    .trim();

  // Strip conversational conversational prefixes (e.g., "ভাইয়া", "কিভাবে", "Please tell me", etc.)
  cleaned = cleaned
    .replace(/^(hello|hi|hey|ভাইয়া|ভাই|দয়া করে|প্লিজ|বলুন তো|বলেন তো|how do i|how can i|can you tell me|please help me with)\s+/i, '')
    .trim();

  if (cleaned.length <= 34) {
    return cleaned.charAt(0).toUpperCase() + cleaned.slice(1);
  }

  const words = cleaned.split(/\s+/);
  if (words.length > 5) {
    return words.slice(0, 5).join(' ') + '...';
  }
  return cleaned.slice(0, 32) + '...';
}
