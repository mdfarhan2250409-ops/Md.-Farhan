import express, { Request, Response, Router } from 'express';
import fs from 'fs';
import path from 'path';
import { SupportAttachment, SupportProductCard } from './types';
import { SupportStore } from './supportStore';
import { AIProviderManager } from './aiProviders';
import { analyzeIntent, formatItemNotFoundResponse, generateConversationTitle } from './conversationEngine';
import { extractUrlsFromText, fetchAndAnalyzeUrl } from './urlAnalyzer';
import { optimizeImageAttachment } from './imageOptimizer';
import { elevenLabsTTS, CURATED_VOICES } from '../services/elevenLabsTTS';

export function createSupportRouter(): Router {
  const router = express.Router();
  const store = new SupportStore();
  const providerManager = new AIProviderManager();

  // Helper to extract client identifier for rate limiting
  const getClientIp = (req: Request): string => {
    return (
      (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() ||
      req.socket.remoteAddress ||
      'unknown-client'
    );
  };

  /* ==========================================================================
     USER & GUEST SUPPORT ENDPOINTS
     ========================================================================== */

  // 0. Link Guest Support History (Conversations & Reports) to Authenticated Firebase User
  router.post('/support/link-guest-account', (req: Request, res: Response) => {
    try {
      const { guestId, userId, userName, userEmail } = req.body;
      if (!guestId || !userId) {
        return res.status(400).json({
          success: false,
          error: 'Both guestId and userId are required to link accounts'
        });
      }

      const result = store.linkGuestAccount(guestId, userId, userName, userEmail);
      return res.json({
        success: true,
        guestId,
        userId,
        linkedConversations: result.linkedConversations,
        linkedReports: result.linkedReports,
        message: `Successfully linked ${result.linkedConversations} conversations and ${result.linkedReports} reports to user account.`
      });
    } catch (err: any) {
      console.error('[Support API Error] linkGuestAccount:', err);
      return res.status(500).json({ success: false, error: err.message });
    }
  });

  // 1. Get List of Conversations for Current User or Guest
  router.get('/support/conversations', (req: Request, res: Response) => {
    try {
      const userId = req.query.userId as string | undefined;
      const guestId = req.query.guestId as string | undefined;
      const search = req.query.search as string | undefined;

      if (!userId && !guestId) {
        return res.json({ success: true, conversations: [] });
      }

      const conversations = store.getUserConversations({ userId, guestId, search });
      return res.json({
        success: true,
        conversations
      });
    } catch (err: any) {
      console.error('[Support API Error] getUserConversations:', err);
      return res.status(500).json({ success: false, error: err.message });
    }
  });

  // 2. Explicitly Create a Brand New Conversation (+ New Chat)
  router.post('/support/conversations/new', (req: Request, res: Response) => {
    try {
      const { guestId, userId, userName, userEmail, pageUrl, initialTitle } = req.body;
      const userAgent = req.headers['user-agent'];

      const conversation = store.createNewConversation({
        guestId,
        userId,
        userName,
        userEmail,
        pageUrl,
        userAgent,
        initialTitle
      });

      return res.json({
        success: true,
        conversation,
        messages: []
      });
    } catch (err: any) {
      console.error('[Support API Error] createNewConversation:', err);
      return res.status(500).json({ success: false, error: err.message });
    }
  });

  // 3. Get or Create Support Conversation (Existing active or new)
  router.post('/support/conversations', (req: Request, res: Response) => {
    try {
      const { guestId, userId, userName, userEmail, pageUrl } = req.body;
      const userAgent = req.headers['user-agent'];

      const { conversation, isNew } = store.getOrCreateConversation({
        guestId,
        userId,
        userName,
        userEmail,
        pageUrl,
        userAgent
      });

      const messages = store.getMessages(conversation.id);

      return res.json({
        success: true,
        conversation,
        messages,
        isNew
      });
    } catch (err: any) {
      console.error('[Support API Error] getOrCreateConversation:', err);
      return res.status(500).json({ success: false, error: err.message });
    }
  });

  // 4. Update Conversation Title
  router.patch('/support/conversations/:id/title', (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const { title } = req.body;
      if (!title || !title.trim()) {
        return res.status(400).json({ success: false, error: 'Title is required' });
      }
      const updated = store.updateConversationTitle(id, title.trim());
      if (!updated) {
        return res.status(404).json({ success: false, error: 'Conversation not found' });
      }
      return res.json({ success: true, conversation: updated });
    } catch (err: any) {
      return res.status(500).json({ success: false, error: err.message });
    }
  });

  // 5. Delete Conversation with Ownership Check
  router.delete('/support/conversations/:id', (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const userId = (req.query.userId || req.body?.userId) as string | undefined;
      const guestId = (req.query.guestId || req.body?.guestId) as string | undefined;

      const deleted = store.deleteConversation(id, { userId, guestId });
      if (!deleted) {
        return res.status(403).json({ success: false, error: 'Conversation not found or unauthorized' });
      }
      return res.json({ success: true, message: 'Conversation deleted successfully' });
    } catch (err: any) {
      return res.status(500).json({ success: false, error: err.message });
    }
  });

  // 6. Get Single Conversation Thread
  router.get('/support/conversations/:id', (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const conversation = store.getConversationById(id);
      if (!conversation) {
        return res.status(404).json({ success: false, error: 'Conversation not found' });
      }

      // Mark as read for user
      store.markAsRead(id, false);
      const messages = store.getMessages(id);

      return res.json({
        success: true,
        conversation,
        messages
      });
    } catch (err: any) {
      return res.status(500).json({ success: false, error: err.message });
    }
  });

  // 3. Send Message (User / Guest) with Mandatory RAG and AI Response
  router.post('/support/conversations/:id/messages', async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const { content, attachment, attachments, senderType = 'user', senderName, senderId } = req.body;

      if (!content && !attachment && (!attachments || (Array.isArray(attachments) && attachments.length === 0))) {
        return res.status(400).json({ success: false, error: 'Message content or attachment is required' });
      }

      // Rate limit check
      const clientIp = getClientIp(req);
      if (!store.checkRateLimit(clientIp)) {
        return res.status(429).json({
          success: false,
          error: 'You are sending messages too quickly. Please wait a moment before trying again.'
        });
      }

      const conversation = store.getConversationById(id);
      if (!conversation) {
        return res.status(404).json({ success: false, error: 'Conversation not found' });
      }

      // Pre-optimize image attachments if present (downscales large screenshots and compresses to clean JPEG)
      let processedAttachments: SupportAttachment[] = [];
      const incomingList: SupportAttachment[] = Array.isArray(attachments) && attachments.length > 0
        ? attachments
        : attachment
        ? [attachment]
        : [];

      for (const att of incomingList) {
        if (att && att.url) {
          const opt = await optimizeImageAttachment(att);
          processedAttachments.push(opt);
        }
      }

      const processedAttachment = processedAttachments.length > 0 ? processedAttachments[0] : undefined;

      // Extract any URLs present in the user content
      const extractedUrls = extractUrlsFromText(content || '');

      // Save the user/guest message with both attachment and attachments for complete compatibility
      const userMessage = store.addMessage(id, {
        senderType: senderType === 'guest' ? 'guest' : 'user',
        senderId: senderId || conversation.userId || conversation.guestId || 'anon',
        senderName: senderName || conversation.userName || 'Visitor',
        content: content || (processedAttachments.length > 0 ? '[Attached Screenshot/Image]' : ''),
        attachment: processedAttachment,
        attachments: processedAttachments.length > 0 ? processedAttachments : undefined
      });

      // Automatically generate title from first user message if title is missing or default
      if (!conversation.title || conversation.title === 'New Conversation' || conversation.title.trim() === '') {
        const generatedTitle = generateConversationTitle(content || '');
        if (generatedTitle && generatedTitle !== 'New Conversation') {
          store.updateConversationTitle(id, generatedTitle);
          conversation.title = generatedTitle;
        }
      }

      const aiSettings = store.getSettings();
      const lowerContent = (content || '').toLowerCase();

      // Check for attached active or resolved reports on this conversation
      const conversationReports = store.getReportsForConversation(id);
      const latestReport = conversationReports.length > 0 ? conversationReports[0] : null;

      if (latestReport && (latestReport.status === 'resolved' || latestReport.status === 'closed')) {
        const isProblemRecurring =
          /\b(still\s*not|again|abar|kaj\s*kore\s*na|problem\s*hocche|solved\s*hoyni|fix\s*hoyni|not\s*working|problem\s*ache)\b/i.test(lowerContent) ||
          /আবার\s*হচ্ছে|কাজ\s*করছে\s*না|সমাধান\s*হয়নি|ঠিক\s*হয়নি|সমস্যা\s*রয়েছে/i.test(lowerContent);

        if (isProblemRecurring) {
          store.updateReportStatus(latestReport.id, 'waiting_for_admin');
          store.updateConversationStatus(id, 'waiting_human');
          const reopenNotice = store.addMessage(id, {
            senderType: 'ai',
            senderId: 'bot-system',
            senderName: aiSettings.botName,
            content: `🔄 **Support Report #${latestReport.id} Reopened:** We have notified our administrative support team that the issue has persisted. A support agent will follow up with you directly.`
          });
          return res.json({
            success: true,
            userMessage,
            aiMessage: reopenNotice,
            status: 'waiting_human',
            reportReopened: true,
            reportId: latestReport.id
          });
        }
      }

      // If conversation is already handled by human or waiting for human, do not run AI
      if (conversation.status === 'human_handling' || conversation.status === 'waiting_human') {
        return res.json({
          success: true,
          userMessage,
          aiMessage: null,
          status: conversation.status,
          waitingForHuman: true
        });
      }

      // Build chat history turns (excluding system notices)
      const allMsgs = store.getMessages(id);
      const recentTurns = allMsgs
        .filter(m => m.id !== userMessage.id && (m.senderType === 'user' || m.senderType === 'guest' || m.senderType === 'ai'))
        .slice(-8)
        .map(m => ({
          role: (m.senderType === 'ai' ? 'model' : 'user') as 'model' | 'user',
          text: m.content
        }));

      // Gather knowledge documents for context resolution
      const ragEngine = store.getRAGEngine();
      const allDocs = ragEngine.getAllDocuments();
      const cachedResources = allDocs.map(d => ({ title: d.title }));

      // Authoritative authentication state determination
      const isAuthenticated = !!(
        conversation.userId ||
        (req.body && req.body.senderType === 'user') ||
        (req.body && req.body.senderId && req.body.senderId !== 'guest')
      );

      // =========================================================================
      // INTENT CLASSIFICATION FIRST (Before RAG or LLM Retrieval)
      // =========================================================================
      const intentAnalysis = analyzeIntent(content || '', recentTurns, cachedResources, processedAttachment, extractedUrls);
      console.log(`[Support Intent Engine] Intent: ${intentAnalysis.intent} | Language: ${intentAnalysis.language} | Needs RAG: ${intentAnalysis.needsRAG} | User Authenticated: ${isAuthenticated}`);

      // Check if user requested human handoff
      let triggeredHandoff = intentAnalysis.intent === 'human_support_request';
      if (!triggeredHandoff && aiSettings.enableHandoffKeywords && aiSettings.handoffKeywords.length > 0) {
        triggeredHandoff = aiSettings.handoffKeywords.some(keyword => lowerContent.includes(keyword.toLowerCase()));
      }

      if (triggeredHandoff) {
        // Escalate to human
        store.updateConversationStatus(id, 'waiting_human');
        const botNotice = store.addMessage(id, {
          senderType: 'ai',
          senderId: 'bot-system',
          senderName: aiSettings.botName,
          content: intentAnalysis.directResponse || 'I have escalated your request to our human support team. An admin specialist will review and reply directly here shortly.'
        });

        return res.json({
          success: true,
          userMessage,
          aiMessage: botNotice,
          status: 'waiting_human',
          handoffTriggered: true,
          intent: 'human_support_request'
        });
      }

      // =========================================================================
      // CASE 1: DIRECT RESPONSE (NO RAG REQUIRED)
      // For greetings, casual chat, AI identity, navigation, account/login steps,
      // OTP troubleshooting, password reset, payment policy, or technical troubleshooting
      // (Bypassed if user attached an image or sent a URL to analyze)
      // =========================================================================
      if (!intentAnalysis.needsRAG && intentAnalysis.directResponse && !processedAttachment && extractedUrls.length === 0) {
        const aiMessage = store.addMessage(id, {
          senderType: 'ai',
          senderId: 'bot-assistant',
          senderName: aiSettings.botName,
          content: intentAnalysis.directResponse,
          provider: 'OTL Grounded Knowledge Engine',
          model: 'intent-v2-direct'
        });

        return res.json({
          success: true,
          userMessage,
          aiMessage,
          status: conversation.status,
          intent: intentAnalysis.intent,
          suggestedAction: intentAnalysis.suggestedAction,
          reportData: intentAnalysis.reportData
        });
      }

      // =========================================================================
      // CASE 2: RAG & REAL-TIME URL / IMAGE ANALYSIS RETRIEVAL
      // =========================================================================
      const ragQuery = intentAnalysis.resolvedSubject || content || (processedAttachment ? 'screenshot analysis' : 'general query');
      const ragResult = ragEngine.buildGroundedContext(ragQuery, aiSettings.maxRetrievedChunks);

      // 2A. Real-Time SSRF-Protected URL Analysis
      let urlAnalysisContext = '';
      if (extractedUrls.length > 0) {
        console.log(`[URL Analyzer] Fetching and analyzing ${extractedUrls.length} URL(s) detected in user message...`);
        const urlFetchPromises = extractedUrls.slice(0, 2).map(u => fetchAndAnalyzeUrl(u));
        const urlResults = await Promise.all(urlFetchPromises);

        const urlBlocks: string[] = [];
        for (const uRes of urlResults) {
          if (uRes.success) {
            let matchedOtlNotice = '';
            if (uRes.isOtlUrl && uRes.otlResourceSlug) {
              const liveRes = ragEngine.websiteSync?.findLiveResource(uRes.otlResourceSlug);
              if (liveRes) {
                matchedOtlNotice = `\n[Verified OTL Catalog Item]: "${liveRes.title}" | Direct Free Download: Yes | Telegram: https://t.me/OnlineTaskLab | Safety: VirusTotal Verified`;
              }
            }

            urlBlocks.push(
              `=== ANALYZED WEBPAGE CONTENT (${uRes.url}) ===\n` +
              `Title: ${uRes.title || 'Untitled'}\n` +
              `Description: ${uRes.description || 'N/A'}\n` +
              `Status: HTTP ${uRes.statusCode || 200}${matchedOtlNotice}\n` +
              `Extracted Text Content:\n${uRes.fullCleanText}\n` +
              `=== END ANALYZED WEBPAGE CONTENT ===`
            );

            // Add source citation card for frontend
            ragResult.sources.push({
              id: `url-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
              title: uRes.title || uRes.url,
              sourceType: 'url',
              url: uRes.url,
              snippet: uRes.textSnippet || uRes.description || 'Verified web link content'
            });
          } else {
            urlBlocks.push(
              `=== WEBPAGE FETCH ATTEMPT (${uRes.url}) ===\n` +
              `Status: FAILED TO FETCH (${uRes.error || 'Network error'})\n` +
              `STRICT INSTRUCTION: The AI MUST NOT pretend it has opened or read this webpage. Inform the user directly that the link could not be fetched (${uRes.error}). Ask the user to upload a screenshot of the page or provide more details.\n` +
              `=== END FETCH ATTEMPT ===`
            );
          }
        }
        urlAnalysisContext = `\n\n=== REAL-TIME FETCHED WEBPAGE CONTENT ===\n${urlBlocks.join('\n\n')}\n=== END FETCHED WEBPAGE CONTENT ===\n`;
      }

      // 2B. Image / Screenshot Vision Instructions
      let imageAnalysisInstructions = '';
      if (processedAttachment && processedAttachment.url) {
        imageAnalysisInstructions = `\n\n=== ATTACHED SCREENSHOT / IMAGE GUIDANCE ===\n` +
          `The user has attached an image or screenshot.\n` +
          `1. Carefully inspect the visual details of the image (look for error dialogs, app UI, URLs, buttons, or error codes).\n` +
          `2. Transcribe or state the visible text/error clearly.\n` +
          `3. Correlate with Online Task Lab policies (e.g. Free Telegram downloads, APK installation "Install Unknown Apps" permission, login/OTP verification, Lightroom preset import, CapCut template usage).\n` +
          `4. Structure your diagnosis cleanly in Markdown:\n` +
          `   ### 🔍 ছবিতে যা দেখা যাচ্ছে\n` +
          `   ### 🛠️ সমস্যার সম্ভাব্য কারণ\n` +
          `   ### ✅ কী করবেন (সমাধান ধাপসমূহ)\n` +
          `5. Suggest [📸 Send Screenshot] or [🚨 Report Issue] if further technical investigation is needed.\n` +
          `=== END ATTACHED IMAGE GUIDANCE ===\n`;
      }

      // If the inquired item is unpublished or was removed, inform user immediately
      if (ragResult.isUnpublished) {
        const notAvailText = intentAnalysis.replyLanguage === 'bangla'
          ? `এই আইটেমটি বর্তমানে OTL ক্যাটালগ থেকে প্রত্যাহার বা মুছে ফেলা হয়েছে এবং আর ডাউনলোডের জন্য উপলভ্য নেই। আপনি আমাদের অফিসিয়াল টেলিগ্রাম গ্রুপে (https://t.me/OnlineTaskLabGroup) ফ্রিতে অনুরোধ জানাতে পারেন অথবা সাপোর্ট টিমের সাথে কথা বলতে পারেন।`
          : `This item is currently unpublished or has been removed from the Online Task Lab catalog and is no longer available for download. You can request it in our official Telegram group (https://t.me/OnlineTaskLabGroup) or contact our human support team.`;
        const aiMessage = store.addMessage(id, {
          senderType: 'ai',
          senderId: 'bot-assistant',
          senderName: aiSettings.botName,
          content: notAvailText,
          provider: 'OTL Catalog Engine',
          model: 'catalog-v2'
        });

        return res.json({
          success: true,
          userMessage,
          aiMessage,
          status: conversation.status,
          intent: intentAnalysis.intent,
          suggestedAction: 'offer_human'
        });
      }

      // If this was a pure product query with no image/URL and nothing was found in catalog, reply directly with friendly not-found response
      const isProductSearch = ['product_information', 'product_price', 'product_features', 'download_help'].includes(intentAnalysis.intent);
      if (isProductSearch && !processedAttachment && extractedUrls.length === 0 && ragResult.sources.length === 0 && !ragResult.liveResource) {
        const notFoundText = formatItemNotFoundResponse(ragQuery, intentAnalysis.replyLanguage);
        const aiMessage = store.addMessage(id, {
          senderType: 'ai',
          senderId: 'bot-assistant',
          senderName: aiSettings.botName,
          content: notFoundText,
          provider: 'OTL Catalog Engine',
          model: 'catalog-v2'
        });

        return res.json({
          success: true,
          userMessage,
          aiMessage,
          status: conversation.status,
          intent: intentAnalysis.intent,
          suggestedAction: 'offer_human'
        });
      }

      // Assemble Strict Grounded System Prompt
      const languageInstruction = intentAnalysis.replyLanguage === 'bangla'
        ? 'MANDATORY LANGUAGE: You MUST respond in fluent, natural Bengali (বাংলা).'
        : 'MANDATORY LANGUAGE: You MUST respond in English.';

      const fullSystemPrompt = `${aiSettings.systemInstruction}

=== USER LANGUAGE REQUIREMENT ===
${languageInstruction}

=== USER AUTHENTICATION STATE & REALITY ===
User Status: ${isAuthenticated ? 'LOGGED IN / AUTHENTICATED' : 'GUEST / NOT LOGGED IN'}
${intentAnalysis.intent === 'download_problem' ? `
=== MANDATORY DOWNLOAD TROUBLESHOOTING PROTOCOL ===
You are addressing a download issue on Online Task Lab (OTL).
Current User Status: ${isAuthenticated ? 'LOGGED IN / AUTHENTICATED' : 'GUEST / NOT LOGGED IN'}.
Website Reality & Hard Rules:
1. Online Task Lab strictly requires user authentication (registration or login) before any resource can be downloaded.
${!isAuthenticated ? `2. The user is a GUEST and NOT logged in.
- Inform them clearly that downloading apps, presets, and resources on Online Task Lab requires an account.
- Instruct them to create an account or log in first, and then return to download the file.
- Provide the real step-by-step instructions matching our site:
  a) Click "My Account" in the top navigation bar.
  b) Click "Create Account" (enter First Name, Last Name, Username, active Email, Password, then enter the 6-digit OTP code sent to their email) OR click "Continue with Google" for instant 1-click access without needing a password or OTP.
  c) Once logged in, navigate to the desired resource and click "Download" or "Free Download" to open the Telegram download delivery window.
- Append these action tags at the very end:
  [🔐 Login] [📝 Create Account] [📥 Download] [🚨 Report Issue]` : `2. The user is ALREADY LOGGED IN.
- DO NOT ask them to log in, register, or create an account.
- Provide targeted technical troubleshooting for this website:
  a) Browser Popup Blocker: OTL triggers downloads by opening verified Telegram posts in a new window. Mobile and desktop browsers often block popups. Enable "Always Allow Popups" for this site.
  b) Official Telegram App: All verified files are delivered via our official Telegram channel (https://t.me/OnlineTaskLab). Ensure the official Telegram app is installed and signed in on their device for 1-tap downloads.
  c) VPN & Network: If Telegram web links fail to load or stall, temporarily turn off active VPNs or switch between Wi-Fi and mobile data.
  d) Android Unknown Apps: On Android devices, enable "Install Unknown Apps" in phone Settings -> Apps -> Special App Access for APK files.
  e) Error Screenshot: Ask the user to send a screenshot of any error prompt.
- Append these action tags at the very end:
  [📥 Download] [✈️ Telegram] [📸 Send Screenshot] [🚨 Report Issue] [👨‍💻 Human Support]`}
${ragResult.liveResource ? `3. Specific Resource Inquired: "${ragResult.liveResource.title}" (Version: ${ragResult.liveResource.version || 'Latest'}, Size: ${ragResult.liveResource.fileSize || 'Standard'}, Status: ${ragResult.liveResource.isActive ? 'Active & Available' : 'Temporarily Unavailable'}).
- Ground your answer in this actual resource. Do not invent fake external URLs or fake pricing.` : ''}
` : ''}

=== MANDATORY RAG KNOWLEDGE BASE CONTEXT ===
${ragResult.contextText}
=== END KNOWLEDGE BASE ===
${urlAnalysisContext}${imageAnalysisInstructions}

=== SPECIFIC RULES ===
${aiSettings.supportRules}
- GROUNDING REQUIREMENT: Ground your factual answer in the OTL Knowledge Base, real-time fetched webpage content (if any URL is provided above), and attached image/screenshot (if any).
- WEBPAGE / LINK ANALYSIS: If real-time fetched webpage content is provided above under "REAL-TIME FETCHED WEBPAGE CONTENT", you HAVE full access to that webpage's content. Analyze it, summarize it, explain what is on the page, or answer the user's questions about it directly. NEVER say you cannot open, access, or inspect links when the fetched content is provided above.
- SCREENSHOT / IMAGE VISION: If an image or screenshot is attached, you HAVE visual inspection capabilities. Describe what you see in the image, transcribe errors, and provide relevant troubleshooting steps.
- CATALOG ITEMS NOT FOUND: When the user specifically searches for or asks for an OTL catalog product, app, or preset that is NOT in the knowledge base, state clearly that the requested item is not currently found in the Online Task Lab catalog and instruct the user that they can request it for free in the official Telegram group (https://t.me/OnlineTaskLabGroup) or click "Talk to Human".
- PRICING & GROUNDING: Always state the exact price and licensing indicated in the Knowledge Base / Live Database Record for that product. If a price is specified (e.g. 450 BDT, Paid, or numeric amount), state that exact price. If marked free or 0 BDT, state that it is 100% free.
- CONVERSATION HISTORY VS LIVE DATA: The Knowledge Base and Authoritative Current Website Record represent the latest, real-time database state. If prior messages in the conversation history mention an older price, older version, or previous information, you MUST disregard the older conversation history figures and strictly provide the latest price and details from the current Knowledge Base / Live Database Record.
- NO HALLUCINATION: You must NEVER invent or hallucinate non-existent products, features, versions, download links, or prices. If an item or feature is not present in the Knowledge Base or Authoritative Record, state truthfully that it is unavailable or not found in the OTL catalog.
- Telegram Channel Link: https://t.me/OnlineTaskLab
- Never give unsafe advice. Every OTL APK is pre-scanned and verified.

=== CHATGPT-STYLE RESPONSE FORMATTING INSTRUCTIONS ===
- Structure & Readability: Format responses clearly and professionally using Markdown.
- For simple greetings, small talk, or direct short questions: respond in 1-2 natural, friendly sentences without unnecessary headers or lists.
- For troubleshooting, guides, or multi-step answers:
  * Open with a friendly, direct 1-sentence answer.
  * Use clean Markdown headings (e.g. ### 🔍 সমস্যার কারণ, ### 🛠️ সমাধান ধাপসমূহ) to group sections.
  * Use numbered lists (1., 2., 3.) for sequential steps.
  * Use bullet points (- or *) for parallel points or features.
  * Bold key terms, button names, file names, or error codes (**like this**).
- Code & AI Prompts:
  * For programming code, use fenced code blocks with language: \`\`\`javascript, \`\`\`python, etc.
  * For AI image prompts or editing prompts, use fenced blocks: \`\`\`prompt ... \`\`\` so the user can easily copy.
- Contextual Action Buttons:
  * When a specific platform action is directly needed by the user, you may attach the relevant tag at the very end of your response:
    [🔐 Login] (if sign-in is required)
    [📝 Create Account] (if registration is required)
    [📥 Download] (if downloading a file/resource)
    [✈️ Telegram] (if directing to Telegram community/channel)
    [🚨 Report Issue] (if reporting an unresolved bug/issue)
    [👨‍💻 Human Support] (if escalating to human agent)
    [📸 Send Screenshot] (if asking user for a screenshot)
  * Never attach action buttons to simple greetings or general chit-chat.
- Tone: Helpful, calm, professional, and natural.`;

      // Get Primary and Fallback AI Provider
      const activeProvider = store.getActiveProvider();
      const fallbackProvider = aiSettings.enableFallback ? store.getFallbackProvider() : null;

      let aiResultText = '';
      let usedProvider = activeProvider.name;
      let usedModel = activeProvider.model;

      const startTime = Date.now();
      console.log(`[AI Support Diagnostic] Incoming query: "${(content || '').slice(0, 60)}" | User: ${conversation.userName || 'Guest'} | Retrieved chunks: ${ragResult.sources.length} | Live match: ${ragResult.liveResource?.title || 'None'}`);

      const effectiveUserPrompt = (content && content.trim())
        ? content
        : (processedAttachment
            ? (intentAnalysis.replyLanguage === 'bangla'
                ? 'অনুগ্রহ করে সংযুক্ত ছবিটি/স্ক্রিনশটটি বিশদভাবে দেখুন এবং কী সমস্যা বা তথ্য আছে তা বিশ্লেষণ করে আমাকে বিস্তারিত সমাধান জানান।'
                : 'Please examine the attached screenshot/image and answer my questions based on OTL policies.')
            : 'হ্যালো');

      try {
        const generation = await providerManager.executeWithFallback(
          activeProvider,
          fallbackProvider,
          {
            systemInstruction: fullSystemPrompt,
            userPrompt: effectiveUserPrompt,
            chatHistory: recentTurns,
            attachment: processedAttachment
          },
          store.getAllProviders()
        );
        aiResultText = generation.text;
        usedProvider = generation.provider;
        usedModel = generation.model;
      } catch (genError: any) {
        console.error('[AI Support Diagnostic Error]: Provider call failed, triggering Grounded Website Synthesis fallback:', genError?.message || genError);
        // Synthesize response directly using Grounded Knowledge Adapter grounded in live website data
        try {
          const groundedAdapter = providerManager.getAdapter('grounded_knowledge');
          const synth = await groundedAdapter.generate(
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
            {
              systemInstruction: fullSystemPrompt,
              userPrompt: content,
              chatHistory: recentTurns
            }
          );
          aiResultText = synth.text;
          usedProvider = 'OTL Smart Assistant (Website Catalog)';
          usedModel = 'grounded-kb-v2';
        } catch (synthErr: any) {
          console.error('[AI Support Fatal Diagnostic]: Synthesis error:', synthErr);
          aiResultText = intentAnalysis.replyLanguage === 'bangla'
            ? `👋 **Online Task Lab (OTL) সাপোর্ট:**\n\nOTL-এর সকল অ্যান্ড্রয়েড অ্যাপস, প্রিসেট ও প্রম্পট আমাদের টেলিগ্রাম চ্যানেল থেকে ফ্রিতে পাওয়া যায়:\n👉 **[https://t.me/OnlineTaskLab](https://t.me/OnlineTaskLab)**\n\nআপনি চাইলে ওপরে থাকা **"Talk to Human"** বাটনে ক্লিক করে সরাসরি আমাদের সাপোর্ট টিমের সাথে কথা বলতে পারেন।`
            : `👋 **Online Task Lab (OTL) Support:**\n\nAll verified OTL files, apps, and presets are delivered safely and freely via our official Telegram channel:\n👉 **[https://t.me/OnlineTaskLab](https://t.me/OnlineTaskLab)**\n\nIf you need immediate help with this request, click the **"Talk to Human"** button above to chat directly with our staff.`;
          usedProvider = 'OTL Knowledge Fallback';
          usedModel = 'offline-kb';
        }
      }

      console.log(`[AI Support Diagnostic] Completed in ${Date.now() - startTime}ms via ${usedProvider} (${usedModel})`);

      // If product was resolved or inquired, attach compact productCard
      let messageProductCard: SupportProductCard | undefined;
      const targetLive = ragResult.liveResource;
      if (targetLive && (intentAnalysis.intent === 'download_problem' || intentAnalysis.intent === 'download_help' || intentAnalysis.intent === 'product_information' || intentAnalysis.intent === 'product_price')) {
        messageProductCard = {
          id: targetLive.id,
          title: targetLive.title,
          price: targetLive.price || (targetLive.isFree ? '100% Free' : '0 BDT'),
          isFree: targetLive.isFree !== false,
          status: targetLive.status || (targetLive.isActive ? 'Active' : 'Unavailable'),
          fileSize: targetLive.fileSize,
          version: targetLive.version,
          thumbnail: targetLive.thumbnail,
          telegramUrl: targetLive.telegramUrl || 'https://t.me/OnlineTaskLab',
          downloadUrl: targetLive.downloadUrl,
          category: targetLive.category
        };
      }

      // Save AI Response in conversation
      const aiMessage = store.addMessage(id, {
        senderType: 'ai',
        senderId: 'ai-bot',
        senderName: aiSettings.botName,
        content: aiResultText,
        provider: usedProvider,
        model: usedModel,
        ragSources: ragResult.sources,
        productCard: messageProductCard
      });

      return res.json({
        success: true,
        userMessage,
        aiMessage,
        status: conversation.status,
        conversation: store.getConversationById(id),
        suggestedAction: intentAnalysis.suggestedAction,
        reportData: intentAnalysis.reportData
      });
    } catch (err: any) {
      console.error('[Support API Error] sendMessage:', err);
      return res.status(500).json({ success: false, error: err.message });
    }
  });

  // 4. User Requests Human Handoff ("Talk to Human" button)
  router.post('/support/conversations/:id/handoff', (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const conversation = store.getConversationById(id);
      if (!conversation) {
        return res.status(404).json({ success: false, error: 'Conversation not found' });
      }

      const updated = store.updateConversationStatus(id, 'waiting_human');
      const messages = store.getMessages(id);

      return res.json({
        success: true,
        conversation: updated,
        messages
      });
    } catch (err: any) {
      return res.status(500).json({ success: false, error: err.message });
    }
  });

  // 5. Link Guest Session to Authenticated User Account
  router.post('/support/conversations/:id/link-account', (req: Request, res: Response) => {
    try {
      const { guestId, user } = req.body;
      if (!guestId || !user || !user.uid) {
        return res.status(400).json({ success: false, error: 'Missing guestId or user information' });
      }

      const updated = store.linkGuestToUser(guestId, {
        uid: user.uid,
        email: user.email || '',
        name: user.name || user.username || ''
      });

      return res.json({
        success: true,
        conversation: updated
      });
    } catch (err: any) {
      return res.status(500).json({ success: false, error: err.message });
    }
  });

  // 6. Screenshot / Image Upload Endpoint
  router.post('/support/upload', async (req: Request, res: Response) => {
    try {
      const { imageBase64, filename, fileType, size } = req.body;

      if (!imageBase64) {
        return res.status(400).json({ success: false, error: 'No image provided' });
      }

      // Validation: Size limit 5MB
      if (size && size > 5 * 1024 * 1024) {
        return res.status(400).json({ success: false, error: 'File size exceeds maximum allowed 5 MB limit' });
      }

      // Validation: Allowed MIME types
      const allowedTypes = ['image/png', 'image/jpeg', 'image/jpg', 'image/webp', 'image/gif'];
      const type = fileType || 'image/png';
      if (!allowedTypes.includes(type.toLowerCase())) {
        return res.status(400).json({ success: false, error: 'Invalid file type. Only PNG, JPEG, and WebP are supported.' });
      }

      // Return validated base64 data URL for preview and multimodal AI input
      const dataUrl = imageBase64.startsWith('data:')
        ? imageBase64
        : `data:${type};base64,${imageBase64}`;

      // Automatically optimize image (resize down to max 1280px & compress to high-efficiency JPEG)
      const optimizedAttachment = await optimizeImageAttachment({
        url: dataUrl,
        type,
        name: filename || 'screenshot.jpg',
        size
      });

      // Also persist optimized image to disk in public/uploads/support for permanent storage
      let storagePath = '';
      try {
        const uploadsDir = path.join(process.cwd(), 'public', 'uploads', 'support');
        if (!fs.existsSync(uploadsDir)) {
          fs.mkdirSync(uploadsDir, { recursive: true });
        }
        const fileExt = (type === 'image/png') ? '.png' : (type === 'image/webp') ? '.webp' : '.jpg';
        const safeName = `att_${Date.now()}_${Math.random().toString(36).slice(2, 7)}${fileExt}`;
        const filePath = path.join(uploadsDir, safeName);
        let b64 = optimizedAttachment.url;
        if (b64.startsWith('data:')) {
          b64 = b64.split(',')[1] || '';
        }
        if (b64) {
          fs.writeFileSync(filePath, Buffer.from(b64, 'base64'));
          storagePath = `/uploads/support/${safeName}`;
        }
      } catch (saveErr) {
        console.warn('[Support Upload] Could not write image file to disk:', saveErr);
      }

      const attachmentId = `att_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
      const enrichedAttachment: SupportAttachment = {
        ...optimizedAttachment,
        attachmentId,
        storagePath: storagePath || undefined,
        createdAt: new Date().toISOString()
      };

      return res.json({
        success: true,
        attachment: enrichedAttachment
      });
    } catch (err: any) {
      return res.status(500).json({ success: false, error: err.message });
    }
  });

  /* ==========================================================================
     SUPPORT REPORT SYSTEM (PERSISTENT ISSUES & TICKETS)
     ========================================================================== */

  // Create a new persistent Support Report (User / AI triggered)
  router.post('/support/reports', (req: Request, res: Response) => {
    try {
      const {
        conversationId,
        userId,
        guestId,
        userName,
        userEmail,
        title,
        description,
        category,
        priority,
        aiAnalysis,
        attachments,
        sourceMessageIds
      } = req.body;

      if (!conversationId) {
        return res.status(400).json({ success: false, error: 'conversationId is required' });
      }

      if (!title || !description) {
        return res.status(400).json({ success: false, error: 'Title and description are required to submit a report' });
      }

      const report = store.createReport({
        conversationId,
        userId,
        guestId,
        userName,
        userEmail,
        title,
        description,
        category,
        priority,
        aiAnalysis,
        attachments,
        sourceMessageIds
      });

      // Post notification message in the chat conversation
      const botName = store.getSettings().botName || 'OTL Live Support';
      store.addMessage(conversationId, {
        senderType: 'ai',
        senderId: 'bot-system',
        senderName: botName,
        content: `📋 **Support Report #${report.id} Created:**\n**Title:** ${report.title}\n**Category:** ${report.category.toUpperCase()}\n\nOur administrative team has received this report and it remains attached to your profile. You will receive updates directly in this chat.`
      });

      // Update conversation status to waiting_human
      store.updateConversationStatus(conversationId, 'waiting_human');

      return res.json({
        success: true,
        report
      });
    } catch (err: any) {
      console.error('[Support API Error] createReport:', err);
      return res.status(500).json({ success: false, error: err.message });
    }
  });

  // Get reports attached to a specific conversation
  router.get('/support/conversations/:id/reports', (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const reports = store.getReportsForConversation(id);
      return res.json({
        success: true,
        reports
      });
    } catch (err: any) {
      return res.status(500).json({ success: false, error: err.message });
    }
  });

  // Get single report by ID (User / Public view)
  router.get('/support/reports/:id', (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const report = store.getReport(id);
      if (!report) {
        return res.status(404).json({ success: false, error: 'Report not found' });
      }
      return res.json({
        success: true,
        report
      });
    } catch (err: any) {
      return res.status(500).json({ success: false, error: err.message });
    }
  });

  // User reopens a resolved report
  router.post('/support/reports/:id/reopen', (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const { reason } = req.body;

      const report = store.getReport(id);
      if (!report) {
        return res.status(404).json({ success: false, error: 'Report not found' });
      }

      const updated = store.updateReportStatus(id, 'waiting_for_admin');
      if (updated && updated.conversationId) {
        store.updateConversationStatus(updated.conversationId, 'waiting_human');
        store.addMessage(updated.conversationId, {
          senderType: 'ai',
          senderId: 'bot-system',
          senderName: store.getSettings().botName,
          content: `🔄 **Report #${id} Reopened by User:** ${reason || 'Issue recurred or was not resolved.'} Our support team has been notified.`
        });
      }

      return res.json({
        success: true,
        report: updated
      });
    } catch (err: any) {
      return res.status(500).json({ success: false, error: err.message });
    }
  });

  /* ==========================================================================
     ADMIN SUPPORT INBOX & CHAT MANAGEMENT
     ========================================================================== */

  // 7. Get All Support Conversations (Filtered / Searched)
  router.get('/admin/support/conversations', (req: Request, res: Response) => {
    try {
      const { status, search, userType } = req.query;

      const conversations = store.getAllConversations({
        status: status as string,
        search: search as string,
        userType: userType as 'guest' | 'registered'
      });

      return res.json({
        success: true,
        conversations
      });
    } catch (err: any) {
      return res.status(500).json({ success: false, error: err.message });
    }
  });

  // 8. Get Single Conversation with Messages (Admin View)
  router.get('/admin/support/conversations/:id', (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const conversation = store.getConversationById(id);
      if (!conversation) {
        return res.status(404).json({ success: false, error: 'Conversation not found' });
      }

      // Mark unread for admin as 0
      store.markAsRead(id, true);
      const messages = store.getMessages(id);

      return res.json({
        success: true,
        conversation,
        messages
      });
    } catch (err: any) {
      return res.status(500).json({ success: false, error: err.message });
    }
  });

  // 9. Admin Sends Reply
  router.post('/admin/support/conversations/:id/messages', async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const { content, attachment, attachments, adminEmail, adminName } = req.body;

      if (!content && !attachment && (!attachments || (Array.isArray(attachments) && attachments.length === 0))) {
        return res.status(400).json({ success: false, error: 'Content or attachment is required' });
      }

      const conversation = store.getConversationById(id);
      if (!conversation) {
        return res.status(404).json({ success: false, error: 'Conversation not found' });
      }

      let processedAttachments: SupportAttachment[] = [];
      const incomingList: SupportAttachment[] = Array.isArray(attachments) && attachments.length > 0
        ? attachments
        : attachment
        ? [attachment]
        : [];

      for (const att of incomingList) {
        if (att && att.url) {
          const opt = await optimizeImageAttachment(att);
          processedAttachments.push(opt);
        }
      }

      const processedAttachment = processedAttachments.length > 0 ? processedAttachments[0] : undefined;

      // Add admin message
      const adminMessage = store.addMessage(id, {
        senderType: 'admin',
        senderId: adminEmail || 'admin',
        senderName: adminName || 'OTL Support Admin',
        content: content || '[Sent Image/File]',
        attachment: processedAttachment,
        attachments: processedAttachments.length > 0 ? processedAttachments : undefined
      });

      // Automatically assign admin and transition to human handling
      store.updateConversationStatus(id, 'human_handling', adminEmail);

      return res.json({
        success: true,
        message: adminMessage,
        conversation: store.getConversationById(id)
      });
    } catch (err: any) {
      return res.status(500).json({ success: false, error: err.message });
    }
  });

  // 10. Update Conversation Status (Take Over, Mark Waiting, Resolve, Close)
  router.patch('/admin/support/conversations/:id/status', (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const { status, adminEmail } = req.body;

      const updated = store.updateConversationStatus(id, status, adminEmail);
      const messages = store.getMessages(id);

      return res.json({
        success: true,
        conversation: updated,
        messages
      });
    } catch (err: any) {
      return res.status(500).json({ success: false, error: err.message });
    }
  });

  // 11. Assign Conversation to Admin
  router.post('/admin/support/conversations/:id/assign', (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const { adminEmail } = req.body;

      const conv = store.getConversationById(id);
      if (!conv) return res.status(404).json({ success: false, error: 'Conversation not found' });

      conv.assignedAdmin = adminEmail;
      store.saveToFile();

      return res.json({
        success: true,
        conversation: conv
      });
    } catch (err: any) {
      return res.status(500).json({ success: false, error: err.message });
    }
  });

  // 12. Support Stats for Admin Dashboard
  router.get('/admin/support/stats', (_req: Request, res: Response) => {
    try {
      const stats = store.getStats();
      return res.json({ success: true, stats });
    } catch (err: any) {
      return res.status(500).json({ success: false, error: err.message });
    }
  });

  /* ==========================================================================
     ADMIN REPORT MANAGEMENT
     ========================================================================== */

  // Get All Support Reports (with search, category, status filters)
  router.get('/admin/support/reports', (req: Request, res: Response) => {
    try {
      const { status, category, search, userId, guestId, conversationId } = req.query;

      const reports = store.getReports({
        status: status as string,
        category: category as string,
        search: search as string,
        userId: userId as string,
        guestId: guestId as string,
        conversationId: conversationId as string
      });

      return res.json({
        success: true,
        reports
      });
    } catch (err: any) {
      return res.status(500).json({ success: false, error: err.message });
    }
  });

  // Get Single Support Report with Attached Conversation Context
  router.get('/admin/support/reports/:id', (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const report = store.getReport(id);
      if (!report) {
        return res.status(404).json({ success: false, error: 'Report not found' });
      }

      const conversation = store.getConversationById(report.conversationId);
      const messages = store.getMessages(report.conversationId);

      return res.json({
        success: true,
        report,
        conversation,
        messages
      });
    } catch (err: any) {
      return res.status(500).json({ success: false, error: err.message });
    }
  });

  // Update Report Status
  router.patch('/admin/support/reports/:id/status', (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const { status, adminEmail, resolutionMessage } = req.body;

      const updated = store.updateReportStatus(id, status, adminEmail, resolutionMessage);
      if (!updated) {
        return res.status(404).json({ success: false, error: 'Report not found' });
      }

      // If status is resolved or closed, notify user in chat
      if (status === 'resolved' && updated.conversationId) {
        store.addMessage(updated.conversationId, {
          senderType: 'admin',
          senderId: adminEmail || 'support-admin',
          senderName: 'OTL Support Specialist',
          content: `✅ **Support Report #${id} Resolved:**\n${resolutionMessage || 'This issue has been marked as resolved by our support team. If you continue to experience problems, reply to this chat to reopen.'}`
        });
        store.updateConversationStatus(updated.conversationId, 'resolved', adminEmail);
      } else if (status === 'closed' && updated.conversationId) {
        store.updateConversationStatus(updated.conversationId, 'closed', adminEmail);
      }

      return res.json({
        success: true,
        report: updated
      });
    } catch (err: any) {
      return res.status(500).json({ success: false, error: err.message });
    }
  });

  // Admin replies to Report & Conversation simultaneously
  router.post('/admin/support/reports/:id/reply', (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const { content, adminEmail, adminName, attachment, resolveReport, resolutionMessage } = req.body;

      const report = store.getReport(id);
      if (!report) {
        return res.status(404).json({ success: false, error: 'Report not found' });
      }

      if (!content && !attachment && (!req.body.attachments || (Array.isArray(req.body.attachments) && req.body.attachments.length === 0))) {
        return res.status(400).json({ success: false, error: 'Reply content or attachment is required' });
      }

      const reportAttachments: SupportAttachment[] = Array.isArray(req.body.attachments) && req.body.attachments.length > 0
        ? req.body.attachments
        : attachment
        ? [attachment]
        : [];

      // 1. Post admin message to the conversation
      const adminMsg = store.addMessage(report.conversationId, {
        senderType: 'admin',
        senderId: adminEmail || 'admin',
        senderName: adminName || 'OTL Support Specialist',
        content: `[Re: Report #${id}]\n\n${content || '[Attachment Sent]'}`,
        attachment: reportAttachments[0] || undefined,
        attachments: reportAttachments.length > 0 ? reportAttachments : undefined
      });

      // 2. Update status
      let updatedReport: any = null;
      if (resolveReport) {
        updatedReport = store.updateReportStatus(id, 'resolved', adminEmail, resolutionMessage || content);
        store.updateConversationStatus(report.conversationId, 'resolved', adminEmail);
      } else {
        updatedReport = store.updateReportStatus(id, 'admin_handling', adminEmail);
        store.updateConversationStatus(report.conversationId, 'human_handling', adminEmail);
      }

      return res.json({
        success: true,
        message: adminMsg,
        report: updatedReport,
        conversation: store.getConversationById(report.conversationId)
      });
    } catch (err: any) {
      return res.status(500).json({ success: false, error: err.message });
    }
  });

  // Add Internal Staff Note to Report
  router.post('/admin/support/reports/:id/notes', (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const { adminEmail, note } = req.body;

      if (!note || !note.trim()) {
        return res.status(400).json({ success: false, error: 'Note content is required' });
      }

      const updated = store.addReportInternalNote(id, adminEmail || 'admin', note.trim());
      if (!updated) {
        return res.status(404).json({ success: false, error: 'Report not found' });
      }

      return res.json({
        success: true,
        report: updated
      });
    } catch (err: any) {
      return res.status(500).json({ success: false, error: err.message });
    }
  });

  // Assign Report to specific Admin
  router.patch('/admin/support/reports/:id/assign', (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const { adminId, adminEmail, adminName } = req.body;

      const updated = store.assignReport(id, adminId, adminEmail, adminName);
      if (!updated) {
        return res.status(404).json({ success: false, error: 'Report not found' });
      }

      return res.json({
        success: true,
        report: updated
      });
    } catch (err: any) {
      return res.status(500).json({ success: false, error: err.message });
    }
  });

  /* ==========================================================================
     ADMIN AI PROVIDER MANAGEMENT
     ========================================================================== */

  // 13. Get All AI Providers
  router.get('/admin/ai/providers', (_req: Request, res: Response) => {
    try {
      const providers = store.getAllProviders().map(p => ({
        ...p,
        // Mask API key for security
        apiKey: p.apiKey
          ? `${p.apiKey.slice(0, 6)}••••••••${p.apiKey.slice(-4)}`
          : (p.type === 'grounded_knowledge' ? 'Built-in (Zero-Key)' : '')
      }));

      return res.json({ success: true, providers });
    } catch (err: any) {
      return res.status(500).json({ success: false, error: err.message });
    }
  });

  // 14. Create AI Provider
  router.post('/admin/ai/providers', (req: Request, res: Response) => {
    try {
      const { name, type, model, visionModel, apiKey, baseUrl, temperature, maxOutputTokens, enabled, isFallback } = req.body;

      if (!name || !type || !model) {
        return res.status(400).json({ success: false, error: 'Name, type, and model are required' });
      }

      const created = store.addProvider({
        name,
        type,
        model,
        visionModel: visionModel || model,
        apiKey,
        baseUrl,
        temperature: Number(temperature) || 0.3,
        maxOutputTokens: Number(maxOutputTokens) || 1200,
        enabled: enabled ?? true,
        isActive: false,
        isFallback: !!isFallback
      });

      return res.json({ success: true, provider: created });
    } catch (err: any) {
      return res.status(500).json({ success: false, error: err.message });
    }
  });

  // 15. Update AI Provider
  router.patch('/admin/ai/providers/:id', (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const updates = req.body;

      // Don't overwrite key with masked stars or placeholder text
      if (
        updates.apiKey &&
        (updates.apiKey.includes('••••') ||
          updates.apiKey.includes('Configured via Server Environment') ||
          updates.apiKey.trim() === '')
      ) {
        delete updates.apiKey;
      }

      const updated = store.updateProvider(id, updates);
      return res.json({ success: true, provider: updated });
    } catch (err: any) {
      return res.status(500).json({ success: false, error: err.message });
    }
  });

  // 16. Delete AI Provider
  router.delete('/admin/ai/providers/:id', (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      store.deleteProvider(id);
      return res.json({ success: true, message: 'Provider deleted' });
    } catch (err: any) {
      return res.status(500).json({ success: false, error: err.message });
    }
  });

  // 17. Test AI Provider Connection
  router.post('/admin/ai/providers/:id/test', async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const provider = store.getAllProviders().find(p => p.id === id);
      if (!provider) {
        return res.status(404).json({ success: false, error: 'Provider not found' });
      }

      const adapter = providerManager.getAdapter(provider.type);
      const testResult = await adapter.testConnection(provider);

      return res.json({
        success: testResult.success,
        latencyMs: testResult.latencyMs,
        message: testResult.message
      });
    } catch (err: any) {
      return res.status(500).json({ success: false, error: err.message });
    }
  });

  // 17b. Test Arbitrary AI Provider Configuration (before saving)
  router.post('/admin/ai/providers/test-config', async (req: Request, res: Response) => {
    try {
      const { id, type, model, visionModel, apiKey, baseUrl, temperature, maxOutputTokens } = req.body;
      if (!type || !model) {
        return res.status(400).json({ success: false, error: 'Provider type and model are required.' });
      }

      let effectiveApiKey = (apiKey || '').trim();
      if (!effectiveApiKey || effectiveApiKey.includes('••••') || effectiveApiKey.includes('Server Environment')) {
        if (id) {
          const existing = store.getAllProviders().find(p => p.id === id);
          if (existing && existing.apiKey) {
            effectiveApiKey = existing.apiKey;
          }
        }
      }

      const tempConfig = {
        id: id || 'test-temp',
        name: 'Test Configuration',
        type,
        model,
        visionModel: visionModel || model,
        apiKey: effectiveApiKey,
        baseUrl,
        temperature: Number(temperature) || 0.3,
        maxOutputTokens: Number(maxOutputTokens) || 1200,
        enabled: true,
        isActive: false,
        isFallback: false,
        updatedAt: new Date().toISOString()
      };

      const adapter = providerManager.getAdapter(type);
      const testResult = await adapter.testConnection(tempConfig);

      return res.json({
        success: testResult.success,
        latencyMs: testResult.latencyMs,
        message: testResult.message
      });
    } catch (err: any) {
      return res.status(500).json({ success: false, error: err.message });
    }
  });

  // 18. Activate AI Provider as Primary
  router.post('/admin/ai/providers/:id/activate', (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const updated = store.updateProvider(id, { isActive: true, enabled: true });
      return res.json({ success: true, provider: updated });
    } catch (err: any) {
      return res.status(500).json({ success: false, error: err.message });
    }
  });

  // 19. Get AI Behavior Settings
  router.get('/admin/ai/settings', (_req: Request, res: Response) => {
    try {
      const settings = store.getSettings();
      return res.json({ success: true, settings });
    } catch (err: any) {
      return res.status(500).json({ success: false, error: err.message });
    }
  });

  // 20. Update AI Behavior Settings
  router.post('/admin/ai/settings', (req: Request, res: Response) => {
    try {
      const updates = req.body;
      const updated = store.updateSettings(updates);
      return res.json({ success: true, settings: updated });
    } catch (err: any) {
      return res.status(500).json({ success: false, error: err.message });
    }
  });

  /* ==========================================================================
     ADMIN KNOWLEDGE BASE (RAG)
     ========================================================================== */

  // 20b. Search Knowledge Base (RAG Search)
  router.get('/support/knowledge/search', (req: Request, res: Response) => {
    try {
      const q = String(req.query.q || '');
      const rag = store.getRAGEngine();
      const results = rag.search(q, { maxResults: 10 });
      return res.json({
        success: true,
        query: q,
        results
      });
    } catch (err: any) {
      return res.status(500).json({ success: false, error: err.message });
    }
  });

  // 21. Get All Knowledge Base Documents
  router.get('/admin/knowledge', (_req: Request, res: Response) => {
    try {
      const rag = store.getRAGEngine();
      const documents = rag.getAllDocuments();
      const chunksCount = rag.getAllChunks().length;

      return res.json({
        success: true,
        documents,
        totalChunks: chunksCount
      });
    } catch (err: any) {
      return res.status(500).json({ success: false, error: err.message });
    }
  });

  // 22. Add Custom Knowledge Document
  router.post('/admin/knowledge', (req: Request, res: Response) => {
    try {
      const { title, category, content, sourceType = 'custom', sourceId } = req.body;

      if (!title || !content) {
        return res.status(400).json({ success: false, error: 'Title and content are required' });
      }

      const id = `doc_${Date.now()}`;
      const created = store.saveKnowledgeDocument({
        id,
        sourceType,
        sourceId: sourceId || id,
        title,
        category: category || 'Custom Knowledge',
        content
      });

      return res.json({ success: true, document: created });
    } catch (err: any) {
      return res.status(500).json({ success: false, error: err.message });
    }
  });

  // 23. Update Knowledge Document
  router.patch('/admin/knowledge/:id', (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const { title, category, content, sourceType, sourceId } = req.body;

      const existing = store.getRAGEngine().getAllDocuments().find(d => d.id === id);
      if (!existing) {
        return res.status(404).json({ success: false, error: 'Document not found' });
      }

      const updated = store.saveKnowledgeDocument({
        id,
        title: title || existing.title,
        category: category || existing.category,
        content: content || existing.content,
        sourceType: sourceType || existing.sourceType,
        sourceId: sourceId || existing.sourceId
      });

      return res.json({ success: true, document: updated });
    } catch (err: any) {
      return res.status(500).json({ success: false, error: err.message });
    }
  });

  // 24. Delete Knowledge Document
  router.delete('/admin/knowledge/:id', (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      store.deleteKnowledgeDocument(id);
      return res.json({ success: true, message: 'Document removed from knowledge base' });
    } catch (err: any) {
      return res.status(500).json({ success: false, error: err.message });
    }
  });

  // 25. Trigger Full Knowledge Base Re-Index
  router.post('/admin/knowledge/reindex', async (_req: Request, res: Response) => {
    try {
      const result = await store.reindexAllKnowledge();
      return res.json({
        success: true,
        message: 'Website knowledge base re-indexed successfully',
        ...result
      });
    } catch (err: any) {
      return res.status(500).json({ success: false, error: err.message });
    }
  });

  /* ==========================================================================
     AUTOMATIC WEBSITE SYNC & DIAGNOSTICS
     ========================================================================== */

  // 26. Get Live Website Sync Status
  router.get('/admin/website-sync/status', (_req: Request, res: Response) => {
    try {
      const status = store.getWebsiteSyncStatus();
      const docs = store.getRAGEngine().getAllDocuments();
      const chunks = store.getRAGEngine().getAllChunks();

      return res.json({
        success: true,
        status,
        stats: {
          totalDocuments: docs.length,
          totalChunks: chunks.length,
          productsIndexed: status.indexedBreakdown.products,
          pagesIndexed: status.indexedBreakdown.pages,
          faqsIndexed: status.indexedBreakdown.faqs,
          categoriesIndexed: status.indexedBreakdown.categories
        }
      });
    } catch (err: any) {
      return res.status(500).json({ success: false, error: err.message });
    }
  });

  // 27. Trigger Manual Website Synchronization
  router.post('/admin/website-sync/trigger', async (_req: Request, res: Response) => {
    try {
      console.log('[Website Sync Route] Triggering on-demand website sync...');
      const result = await store.syncWebsiteKnowledge(true);
      const status = store.getWebsiteSyncStatus();

      return res.json({
        success: true,
        message: 'Website data synchronized successfully into RAG engine',
        docsCount: result.docsCount,
        chunksCount: result.chunksCount,
        status
      });
    } catch (err: any) {
      console.error('[Website Sync Route Error]:', err);
      return res.status(500).json({ success: false, error: err.message });
    }
  });

  // 28. Real-time resource webhook (called on resource create/update/delete)
  router.post('/support/sync/resource', (req: Request, res: Response) => {
    try {
      const { action, resource } = req.body;
      if (!resource || !action) {
        return res.status(400).json({ success: false, error: 'Resource and action required' });
      }

      const syncResult = store.handleResourceUpdate(resource, action);
      return res.json({
        success: syncResult.success,
        docId: syncResult.docId,
        status: syncResult.status,
        chunksCount: syncResult.chunksCount,
        contentHash: syncResult.contentHash,
        error: syncResult.error,
        message: `Resource "${resource.title || resource.id}" synchronized (${action}: ${syncResult.status})`
      });
    } catch (err: any) {
      return res.status(500).json({ success: false, error: err.message });
    }
  });

  // 28b. Real-time content webhook (called on Category/FAQ/Page create/update/delete)
  router.post('/support/sync/content', (req: Request, res: Response) => {
    try {
      const { sourceType, action, item } = req.body;
      if (!sourceType || !action || !item) {
        return res.status(400).json({ success: false, error: 'sourceType, action, and item are required' });
      }

      const result = store.handleContentUpdate(sourceType, item, action);
      return res.json({
        success: result.success,
        docId: result.docId,
        status: result.status,
        chunksCount: result.chunksCount,
        message: `${sourceType} item synchronized (${action})`
      });
    } catch (err: any) {
      return res.status(500).json({ success: false, error: err.message });
    }
  });

  // 28c. List all indexed Knowledge items with real-time sync metadata
  router.get('/admin/website-sync/items', (_req: Request, res: Response) => {
    try {
      const docs = store.getKnowledgeDocuments();
      return res.json({
        success: true,
        items: docs.map(d => ({
          id: d.id,
          sourceType: d.sourceType,
          sourceId: d.sourceId,
          title: d.title,
          category: d.category,
          url: d.url,
          chunksCount: d.chunksCount,
          contentHash: d.contentHash,
          syncStatus: d.syncStatus || 'synced',
          syncError: d.syncError || null,
          syncVersion: d.syncVersion || 1,
          retryCount: d.retryCount || 0,
          lastIndexedAt: d.lastIndexedAt || d.updatedAt,
          price: d.metadata?.price,
          isPublished: d.metadata?.isPublished !== false
        }))
      });
    } catch (err: any) {
      return res.status(500).json({ success: false, error: err.message });
    }
  });

  // 28d. Retry failed sync items
  router.post('/admin/website-sync/retry', async (_req: Request, res: Response) => {
    try {
      const result = await store.retryFailedItems();
      return res.json({
        success: true,
        message: `Processed retry queue. Retried: ${result.retried}, Remaining: ${result.remaining}`,
        result
      });
    } catch (err: any) {
      return res.status(500).json({ success: false, error: err.message });
    }
  });

  // 28e. Reconcile Website Data with Live DB
  router.post('/admin/website-sync/reconcile', async (req: Request, res: Response) => {
    try {
      const { liveResources } = req.body || {};
      const result = await store.reconcileWebsiteData(liveResources);
      return res.json({
        success: true,
        message: 'Website data reconciled successfully',
        result
      });
    } catch (err: any) {
      return res.status(500).json({ success: false, error: err.message });
    }
  });

  // 29. AI Diagnostics Endpoint
  router.get('/admin/ai/diagnostics', async (_req: Request, res: Response) => {
    try {
      const activeProvider = store.getActiveProvider();
      const fallbackProvider = store.getFallbackProvider();
      const allProviders = store.getAllProviders();
      const syncStatus = store.getWebsiteSyncStatus();

      const adapter = providerManager.getAdapter(activeProvider.type);
      const testResult = await adapter.testConnection(activeProvider);

      return res.json({
        success: true,
        activeProvider: {
          id: activeProvider.id,
          name: activeProvider.name,
          model: activeProvider.model,
          type: activeProvider.type,
          hasKey: providerManager.hasValidKey(activeProvider),
          health: testResult
        },
        fallbackProvider: fallbackProvider ? {
          id: fallbackProvider.id,
          name: fallbackProvider.name,
          model: fallbackProvider.model,
          type: fallbackProvider.type,
          hasKey: providerManager.hasValidKey(fallbackProvider)
        } : null,
        totalProviders: allProviders.length,
        websiteSync: syncStatus,
        ragStats: {
          documents: store.getRAGEngine().getAllDocuments().length,
          chunks: store.getRAGEngine().getAllChunks().length
        }
      });
    } catch (err: any) {
      return res.status(500).json({ success: false, error: err.message });
    }
  });

  /* ==========================================================================
     ELEVENLABS TTS (TEXT-TO-SPEECH) & READ ALOUD ENDPOINTS
     ========================================================================== */

  // 1. Client TTS Settings (Public check if enabled and voice info)
  router.get('/support/tts/settings', (_req: Request, res: Response) => {
    try {
      const s = store.getTtsSettings();
      return res.json({
        success: true,
        settings: {
          enabled: s.enabled,
          provider: s.provider,
          modelId: s.modelId,
          voiceId: s.voiceId,
          voiceName: s.voiceName,
          language: s.language,
          speed: s.speed,
          browserFallback: s.browserFallback,
          apiKeyConfigured: s.apiKeyConfigured
        }
      });
    } catch (err: any) {
      return res.status(500).json({ success: false, error: err.message });
    }
  });

  // 2. Generate Speech for AI Message Read Aloud
  router.post('/support/tts', async (req: Request, res: Response) => {
    try {
      const clientIp = getClientIp(req);
      if (!store.checkRateLimit(`tts:${clientIp}`)) {
        return res.status(429).json({
          success: false,
          error: 'Too many voice requests. Please slow down and try again shortly.',
          errorCode: 'RATE_LIMITED'
        });
      }

      const ttsSettings = store.getTtsSettings();
      if (!ttsSettings.enabled) {
        return res.status(403).json({
          success: false,
          error: 'Voice playback is currently disabled.',
          errorCode: 'TTS_DISABLED',
          fallbackToBrowser: ttsSettings.browserFallback
        });
      }

      const { messageId, text, voiceId, modelId, speed } = req.body;

      let speechText = text;
      // If messageId provided, verify and read from store message content if text is empty
      if (messageId && !speechText) {
        const msg = store.getMessageById(messageId);
        if (msg) {
          speechText = msg.content;
        }
      }

      if (!speechText || typeof speechText !== 'string' || !speechText.trim()) {
        return res.status(400).json({
          success: false,
          error: 'No text provided for speech synthesis.',
          errorCode: 'EMPTY_TEXT'
        });
      }

      // Retrieve eligible keys from pool
      const eligibleKeys = store.getEligibleTtsKeys();
      if (eligibleKeys.length === 0) {
        const pool = store.getTtsKeyPool(false);
        const isAllExhausted = pool.length > 0 && pool.some(k => k.status === 'quota_exhausted');
        return res.json({
          success: false,
          error: isAllExhausted
            ? 'ElevenLabs API limit reached. All configured API keys have exhausted their available limits. Please add another API key or wait for a quota reset.'
            : 'No ElevenLabs API key is configured. Add an API key to enable ElevenLabs voice features.',
          errorCode: isAllExhausted ? 'ALL_KEYS_EXHAUSTED' : 'API_KEY_NOT_CONFIGURED',
          fallbackToBrowser: ttsSettings.browserFallback
        });
      }

      // Enforce character limit
      const maxChars = ttsSettings.maxCharacters || 5000;
      if (speechText.length > maxChars) {
        speechText = speechText.slice(0, maxChars);
      }

      const effectiveVoiceId = (voiceId || ttsSettings.voiceId || '3AMU7jXQuQa3oRvRqUmb').trim();
      const effectiveModelId = modelId || ttsSettings.modelId || 'eleven_multilingual_v2';
      const effectiveSpeed = typeof speed === 'number' ? speed : (ttsSettings.speed || 1.0);

      const result = await elevenLabsTTS.generateSpeechWithPool(
        {
          text: speechText,
          voiceId: effectiveVoiceId,
          modelId: effectiveModelId,
          speed: effectiveSpeed,
          stability: ttsSettings.stability,
          similarity: ttsSettings.similarity,
          style: ttsSettings.style,
          useSpeakerBoost: ttsSettings.useSpeakerBoost,
          outputFormat: ttsSettings.outputFormat
        },
        eligibleKeys,
        {
          markQuotaExhausted: (id, reason) => store.markKeyQuotaExhausted(id, reason),
          markInvalid: (id, reason) => store.markKeyInvalid(id, reason),
          recordSuccess: (id) => store.recordKeyUsage(id)
        }
      );

      // Record analytics
      store.recordTtsUsage({
        success: result.success,
        cached: Boolean(result.cached),
        chars: result.characterCount,
        modelId: result.modelId,
        voiceId: result.voiceId
      });

      if (!result.success) {
        return res.json({
          success: false,
          error: result.error || 'Voice playback is temporarily unavailable. You can still read the response.',
          errorCode: result.errorCode || 'GENERATION_FAILED',
          fallbackToBrowser: ttsSettings.browserFallback
        });
      }

      return res.json({
        success: true,
        audioBase64: result.audioBase64,
        mimeType: result.mimeType,
        cached: result.cached,
        modelId: result.modelId,
        voiceId: result.voiceId,
        warning: result.warning,
        detectedLanguage: result.detectedLanguage,
        characterCount: result.characterCount,
        latencyMs: result.latencyMs
      });
    } catch (err: any) {
      console.error('[TTS API Error]:', err);
      return res.json({
        success: false,
        error: 'Voice playback encountered an error. You can still read the response.',
        errorCode: 'SERVER_ERROR',
        fallbackToBrowser: true
      });
    }
  });

  // 3. Admin Get Full TTS Settings
  router.get('/admin/tts/settings', (_req: Request, res: Response) => {
    try {
      const s = store.getTtsSettings();
      return res.json({
        success: true,
        settings: s
      });
    } catch (err: any) {
      return res.status(500).json({ success: false, error: err.message });
    }
  });

  // 4. Admin Update TTS Settings
  router.post('/admin/tts/settings', (req: Request, res: Response) => {
    try {
      const updates = req.body;
      const updated = store.updateTtsSettings(updates);
      return res.json({
        success: true,
        settings: updated,
        message: 'Voice / TTS settings updated successfully.'
      });
    } catch (err: any) {
      return res.status(500).json({ success: false, error: err.message });
    }
  });

  // 5. Admin Get Available Voices (from ElevenLabs account + curated)
  router.get('/admin/tts/voices', async (_req: Request, res: Response) => {
    try {
      const apiKey = store.getTtsInternalApiKey();
      const voices = await elevenLabsTTS.getAvailableVoices(apiKey);
      return res.json({
        success: true,
        voices
      });
    } catch (err: any) {
      return res.status(500).json({ success: false, error: err.message, voices: CURATED_VOICES });
    }
  });

  // 6. Admin Test Voice Connection & Subscription Quota
  router.post('/admin/tts/test-connection', async (req: Request, res: Response) => {
    try {
      const { apiKey: customKey } = req.body;
      const key = customKey && !customKey.includes('Configured') ? customKey : store.getTtsInternalApiKey();
      const health = await elevenLabsTTS.testConnection(key);
      return res.json({
        success: health.healthy,
        health
      });
    } catch (err: any) {
      return res.json({
        success: false,
        health: {
          healthy: false,
          provider: 'ElevenLabs',
          message: err.message
        }
      });
    }
  });

  // 7. Admin Test Speech Generation (Bengali, English, Mixed, Custom)
  router.post('/admin/tts/test', async (req: Request, res: Response) => {
    try {
      const { text, voiceId, modelId, speed, stability, similarity, style, apiKey: customKey } = req.body;
      if (!text || typeof text !== 'string') {
        return res.json({ success: false, error: 'Test text is required' });
      }

      const key = customKey && !customKey.includes('Configured') ? customKey : store.getTtsInternalApiKey();
      if (!key) {
        return res.json({ success: false, error: 'ElevenLabs API Key is not configured.' });
      }

      const settings = store.getTtsSettings();
      const targetVoiceId = (voiceId || settings.voiceId || '3AMU7jXQuQa3oRvRqUmb').trim();

      const result = await elevenLabsTTS.generateSpeech({
        text,
        voiceId: targetVoiceId,
        modelId: modelId || settings.modelId || 'eleven_multilingual_v2',
        speed: speed ?? settings.speed,
        stability: stability ?? settings.stability,
        similarity: similarity ?? settings.similarity,
        style: style ?? settings.style,
        apiKey: key
      });

      if (!result.success) {
        return res.json({
          success: false,
          error: result.error || 'Failed to synthesize test speech.',
          errorCode: result.errorCode,
          fallbackToBrowser: true
        });
      }

      return res.json({
        success: true,
        audioBase64: result.audioBase64,
        mimeType: result.mimeType,
        detectedLanguage: result.detectedLanguage,
        characterCount: result.characterCount,
        latencyMs: result.latencyMs,
        cached: result.cached,
        modelId: result.modelId,
        voiceId: result.voiceId,
        warning: result.warning
      });
    } catch (err: any) {
      return res.json({ success: false, error: err.message, fallbackToBrowser: true });
    }
  });

  // 8. Admin Get TTS Stats
  router.get('/admin/tts/stats', (_req: Request, res: Response) => {
    try {
      const stats = store.getTtsStats();
      return res.json({
        success: true,
        stats
      });
    } catch (err: any) {
      return res.status(500).json({ success: false, error: err.message });
    }
  });

  // ============================================================================
  // ElevenLabs API Key Pool Management Routes
  // ============================================================================

  // 9. Admin List All API Keys in Pool (with secret keys masked)
  router.get('/admin/tts/keys', (_req: Request, res: Response) => {
    try {
      const keys = store.getTtsKeyPool(false);
      return res.json({
        success: true,
        keys
      });
    } catch (err: any) {
      return res.status(500).json({ success: false, error: err.message });
    }
  });

  // 10. Admin Add New API Key to Pool
  router.post('/admin/tts/keys', async (req: Request, res: Response) => {
    try {
      const { key, label, enabled, priority } = req.body;
      if (!key || typeof key !== 'string' || !key.trim()) {
        return res.status(400).json({ success: false, error: 'API key is required.' });
      }

      const cleanKey = key.trim();
      // Test key connectivity and quota before or upon adding (non-blocking)
      let health: any = { healthy: true, provider: 'ElevenLabs', message: 'API key saved and active' };
      try {
        health = await elevenLabsTTS.testConnection(cleanKey);
      } catch (e: any) {
        health = { healthy: false, provider: 'ElevenLabs', message: e?.message || 'Verification skipped' };
      }

      const created = store.addTtsKey({
        key: cleanKey,
        label: label?.trim(),
        enabled: enabled ?? true,
        priority: typeof priority === 'number' ? priority : undefined
      });

      // Update with live health info
      try {
        store.updateKeyHealth(created.id, health);
      } catch {}

      const refreshed = (store.getTtsKeyPool(false) as any[]).find(k => k.id === created.id) || created;

      return res.json({
        success: true,
        key: refreshed,
        health,
        message: health.healthy
          ? 'ElevenLabs API key added and verified successfully!'
          : `ElevenLabs API key added. Status: ${health.message}`
      });
    } catch (err: any) {
      return res.status(500).json({ success: false, error: err.message });
    }
  });

  // 11. Admin Reveal Specific API Key (temporarily when requested)
  router.post('/admin/tts/keys/:id/reveal', (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const rawKey = store.revealTtsKey(id);
      return res.json({
        success: true,
        key: rawKey
      });
    } catch (err: any) {
      return res.status(404).json({ success: false, error: err.message });
    }
  });

  // 12. Admin Update / Edit Existing API Key
  router.patch('/admin/tts/keys/:id', async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const { key, label, enabled, priority, force } = req.body;

      let healthResult = null;
      if (key && !key.includes('••••') && !key.includes('Configured')) {
        try {
          const testRes = await elevenLabsTTS.testConnection(key.trim());
          healthResult = testRes;
          if (!testRes.healthy && !force) {
            return res.json({
              success: false,
              validationFailed: true,
              message: `Key validation warning: ${testRes.message}. You can choose to save anyway if this is intended.`,
              health: testRes
            });
          }
        } catch (e: any) {
          console.warn('ElevenLabs connection test error (non-fatal):', e);
        }
      }

      const updated = store.updateTtsKey(id, { key, label, enabled, priority }, Boolean(force));
      if (healthResult) {
        store.updateKeyHealth(id, healthResult);
      }

      const refreshed = (store.getTtsKeyPool(false) as any[]).find(k => k.id === id) || updated;

      return res.json({
        success: true,
        key: refreshed,
        message: 'ElevenLabs API key updated successfully.',
        health: healthResult
      });
    } catch (err: any) {
      return res.status(500).json({ success: false, error: err.message });
    }
  });

  // 13. Admin Delete API Key with Last-Key Safety Warning
  router.delete('/admin/tts/keys/:id', (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const force = req.query.force === 'true' || req.body?.force === true;
      const result = store.deleteTtsKey(id, force);

      if (!result.success && result.requiresConfirmation) {
        return res.json({
          success: false,
          requiresConfirmation: true,
          message: result.message
        });
      }

      return res.json({
        success: true,
        message: result.message,
        remainingCount: result.remainingCount
      });
    } catch (err: any) {
      return res.status(500).json({ success: false, error: err.message });
    }
  });

  // 14. Admin Test Individual API Key
  router.post('/admin/tts/keys/:id/test', async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const rawKey = store.revealTtsKey(id);
      const health = await elevenLabsTTS.testConnection(rawKey);

      store.updateKeyHealth(id, health);
      const refreshed = (store.getTtsKeyPool(false) as any[]).find(k => k.id === id);

      return res.json({
        success: health.healthy,
        health,
        key: refreshed
      });
    } catch (err: any) {
      return res.json({
        success: false,
        health: {
          healthy: false,
          provider: 'ElevenLabs',
          message: err.message
        }
      });
    }
  });

  // 15. Admin Toggle Key Enable / Disable
  router.post('/admin/tts/keys/:id/toggle', (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const updated = store.toggleTtsKey(id);
      return res.json({
        success: true,
        key: updated,
        message: `API key ${updated.enabled ? 'enabled' : 'disabled'} successfully.`
      });
    } catch (err: any) {
      return res.status(500).json({ success: false, error: err.message });
    }
  });

  return router;
}
