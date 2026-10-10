import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import { KnowledgeDocument, KnowledgeChunk, WebsiteSyncStatus } from './types';
import { initialCategories, initialResources, initialContactSettings } from '../../src/data/initialData';

// Dynamic Firebase client SDK loader for server-side public Firestore access
let firebaseApp: any = null;
let firestoreDb: any = null;

async function getFirestoreClient() {
  if (firestoreDb) return firestoreDb;

  try {
    const configPath = path.join(process.cwd(), 'firebase-applet-config.json');
    if (!fs.existsSync(configPath)) return null;

    const cfg = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
    const { initializeApp, getApps } = await import('firebase/app');
    const { initializeFirestore, getFirestore } = await import('firebase/firestore');

    const appName = 'otl-support-server-sync';
    const apps = getApps();
    firebaseApp = apps.find(a => a.name === appName) || initializeApp({
      apiKey: cfg.apiKey,
      authDomain: cfg.authDomain,
      projectId: cfg.projectId,
      storageBucket: cfg.storageBucket,
      messagingSenderId: cfg.messagingSenderId,
      appId: cfg.appId
    }, appName);

    const dbId = cfg.firestoreDatabaseId && cfg.firestoreDatabaseId !== '(default)'
      ? cfg.firestoreDatabaseId
      : undefined;

    firestoreDb = dbId ? getFirestore(firebaseApp, dbId) : getFirestore(firebaseApp);

    return firestoreDb;
  } catch (err: any) {
    console.warn('[WebsiteSync] Notice: Client Firestore could not be initialized directly, falling back to authoritative local store:', err?.message || err);
    return null;
  }
}

export class WebsiteSyncEngine {
  private syncStatus: WebsiteSyncStatus = {
    lastSyncTime: '',
    totalProducts: 0,
    totalPages: 0,
    totalFaqs: 0,
    totalPolicies: 0,
    totalChunks: 0,
    failedItems: [],
    status: 'synced',
    indexedBreakdown: {
      products: 0,
      pages: 0,
      faqs: 0,
      categories: 0,
      custom: 0
    }
  };

  private cachedLiveResources: Map<string, any> = new Map();
  private removedResourceIdentifiers: Set<string> = new Set();
  private isSyncing = false;

  constructor() {
    // Seed initial resources into live cache
    initialResources.forEach(r => this.cachedLiveResources.set(r.id, r));
  }

  public getStatus(): WebsiteSyncStatus {
    return { ...this.syncStatus };
  }

  public getCachedResources(): any[] {
    return Array.from(this.cachedLiveResources.values());
  }

  /**
   * Fast live lookup for dynamic product validation
   */
  public isResourceActive(res: any): boolean {
    if (!res) return false;
    if (res.status === 'unpublished' || res.status === 'draft' || res.status === 'deleted') return false;
    if (res.isPublished === false || res.visibility === 'hidden') return false;
    return true;
  }

  public findLiveResource(query: string): any | null {
    if (!query) return null;
    const q = query.toLowerCase().trim();

    // If query matches a removed/unpublished item, never return a substitute live resource
    if (this.isResourceUnpublished(q)) {
      return null;
    }

    // 1. Check exact ID or slug
    for (const res of this.cachedLiveResources.values()) {
      if (!this.isResourceActive(res)) continue;
      if (res.id.toLowerCase() === q || res.slug?.toLowerCase() === q) {
        return res;
      }
    }

    // 2. Check exact title match or high-confidence title containment
    for (const res of this.cachedLiveResources.values()) {
      if (!this.isResourceActive(res)) continue;
      const titleLower = res.title.toLowerCase();
      if (titleLower === q || (titleLower.length >= 6 && q.includes(titleLower))) {
        return res;
      }
    }

    // 3. Keyword token matching with stop word filtering and word boundaries
    const STOP_WORDS = new Set([
      'can', 'could', 'download', 'get', 'now', 'right', 'app', 'apk', 'file',
      'the', 'for', 'how', 'what', 'where', 'why', 'who', 'is', 'are', 'was',
      'with', 'and', 'please', 'link', 'give', 'want', 'tell', 'about', 'need',
      'price', 'cost', 'fee', 'pricing', 'version', 'features', 'info', 'details',
      'item', 'items', 'product', 'products',
      'kivabe', 'ki', 'ei', 'eta', 'eita', 'amake', 'free', 'mod', 'pro', 'latest',
      'dam', 'taka', 'koto', 'দাম', 'টাকা', 'কত', 'কিভাবে', 'ডাউনলোড'
    ]);

    const cleanTokens = q.split(/[^a-z0-9\u0980-\u09FF]+/).filter(t => t.length >= 3 && !STOP_WORDS.has(t));
    if (cleanTokens.length === 0) return null;

    let bestMatch: any = null;
    let maxMatches = 0;

    for (const res of this.cachedLiveResources.values()) {
      if (!this.isResourceActive(res)) continue;
      const resWords = new Set(
        `${res.title} ${res.slug} ${res.tags?.join(' ') || ''}`
          .toLowerCase()
          .split(/[^a-z0-9\u0980-\u09FF]+/)
          .filter(w => w.length >= 3)
      );

      let matchCount = 0;
      for (const t of cleanTokens) {
        if (resWords.has(t)) matchCount++;
      }

      const matchRatio = matchCount / cleanTokens.length;
      if ((matchRatio >= 0.6 || matchCount >= 2) && matchCount > maxMatches) {
        maxMatches = matchCount;
        bestMatch = res;
      }
    }

    return bestMatch;
  }

  /**
   * Check if a product exists but is unpublished/inactive or deleted
   */
  public isResourceUnpublished(query: string): boolean {
    if (!query) return false;
    const q = query.toLowerCase().trim();
    for (const removed of this.removedResourceIdentifiers) {
      if (q.includes(removed) || (removed.length > 4 && removed.includes(q))) {
        return true;
      }
    }
    for (const res of this.cachedLiveResources.values()) {
      const titleLower = (res.title || '').toLowerCase();
      if (res.id.toLowerCase() === q || res.slug?.toLowerCase() === q || titleLower.includes(q) || q.includes(titleLower)) {
        if (!this.isResourceActive(res)) {
          return true;
        }
      }
    }
    return false;
  }

  /**
   * Generates a deterministic content hash for incremental sync
   */
  public generateHash(content: string): string {
    return crypto.createHash('sha256').update(content).digest('hex');
  }

  /**
   * Normalize and build rich knowledge representation for a Resource/Product
   */
  public resourceToDocument(res: any): KnowledgeDocument {
    const rawPrice = res.price !== undefined && res.price !== null && res.price !== '' ? res.price : null;
    const displayPrice = rawPrice !== null
      ? (typeof rawPrice === 'number' ? `${rawPrice} BDT` : String(rawPrice).trim())
      : (res.isFree === false ? 'Paid' : '100% FREE (Online Task Lab verified free download)');
    const discountStr = res.discountPrice ? ` (Discount Price: ${res.discountPrice})` : '';

    const categoryName = res.category === 'apps' ? 'Mobile Apps (Android MOD APK)'
      : res.category === 'landing-pages' ? 'Landing Page Template'
      : res.category === 'ai-prompts' ? 'AI Prompt (Midjourney / ChatGPT / Gemini)'
      : res.category === 'lr-presets' ? 'Lightroom Preset (DNG / XMP)'
      : String(res.category || 'Digital Resource');

    const sections: string[] = [];
    sections.push(`PRODUCT TITLE: ${res.title}`);
    sections.push(`CATEGORY: ${categoryName}`);
    sections.push(`CURRENT VERSION: ${res.version || res.apkVersion || 'Latest verified build'}`);
    sections.push(`FILE SIZE: ${res.fileSize || 'Standard digital asset'}`);
    sections.push(`PRICING & LICENSE: ${displayPrice}${discountStr}`);
    sections.push(`OFFICIAL DOWNLOAD / TELEGRAM LINK: ${res.telegramUrl || res.downloadUrl || 'https://t.me/OnlineTaskLab'}`);
    
    if (res.demoUrl) {
      sections.push(`LIVE PREVIEW / DEMO LINK: ${res.demoUrl}`);
    }

    if (res.requirements) {
      sections.push(`SYSTEM REQUIREMENTS: ${res.requirements}`);
    }

    if (res.packageName) {
      sections.push(`ANDROID PACKAGE NAME: ${res.packageName}`);
    }

    const summaryText = res.shortDescription || res.description || '';
    if (summaryText) {
      sections.push(`SHORT SUMMARY / DESCRIPTION: ${summaryText}`);
    }

    if (res.fullDescription && res.fullDescription !== summaryText) {
      sections.push(`FULL SPECIFICATIONS & DETAILS: ${res.fullDescription}`);
    }

    if (res.tags && Array.isArray(res.tags) && res.tags.length > 0) {
      sections.push(`SEARCH TAGS & TOPICS: ${res.tags.join(', ')}`);
    }

    // Special category instructions
    if (res.category === 'apps') {
      sections.push(`HOW TO INSTALL THIS MOD APK:
1. Click the official Telegram download button to retrieve the verified APK file from https://t.me/OnlineTaskLab.
2. In Android Settings, ensure "Install Unknown Apps" is toggled ON for your browser or Telegram.
3. If Google Chrome shows "File might be harmful", tap "Download anyway" (standard Android security notice for non-Play Store APKs; all OTL files are 100% clean and VirusTotal tested).
4. Tap the downloaded APK to install. If you have the official Play Store version installed, uninstall it first to avoid signature conflicts.`);
    } else if (res.category === 'lr-presets') {
      sections.push(`HOW TO USE THIS LIGHTROOM PRESET:
1. Download the .DNG (for Lightroom Mobile) or .XMP (for Lightroom Desktop) file via the Telegram link.
2. Open Lightroom Mobile, import the downloaded DNG image.
3. Tap the three dots (···) in the top-right corner and choose "Copy Settings".
4. Open your own photo, tap (···), and choose "Paste Settings" to apply.`);
    } else if (res.category === 'ai-prompts') {
      sections.push(`HOW TO USE THIS AI PROMPT:
1. Copy the full master prompt text.
2. Paste into ChatGPT 4o, Claude 3.5, or Midjourney V6 depending on the prompt type.
3. Fill in the bracketed variables (such as topic or aspect ratio) to generate high-converting results.`);
    }

    const content = sections.join('\n\n');
    const contentHash = this.generateHash(content);

    return {
      id: `doc-prod-${res.id}`,
      sourceType: 'product',
      sourceId: res.id,
      title: res.title,
      category: categoryName,
      content,
      chunksCount: 0,
      contentHash,
      url: res.telegramUrl || res.downloadUrl || `/resource/${res.slug || res.id}`,
      metadata: {
        slug: res.slug,
        version: res.version || res.apkVersion,
        fileSize: res.fileSize,
        price: displayPrice,
        discountPrice: res.discountPrice ? String(res.discountPrice) : undefined,
        downloadUrl: res.downloadUrl,
        telegramUrl: res.telegramUrl,
        demoUrl: res.demoUrl,
        tags: res.tags,
        isFeatured: !!res.isFeatured,
        requirements: res.requirements,
        packageName: res.packageName,
        modInfo: res.shortDescription,
        status: res.status || 'published',
        isPublished: this.isResourceActive(res)
      },
      updatedAt: res.createdAt || new Date().toISOString(),
      syncStatus: 'synced',
      lastIndexedAt: new Date().toISOString()
    };
  }

  /**
   * Discover and compile static website pages into authoritative knowledge docs
   */
  private getWebsitePagesDocuments(): KnowledgeDocument[] {
    const docs: KnowledgeDocument[] = [
      {
        id: 'doc-page-about-platform',
        sourceType: 'page',
        sourceId: 'page-about',
        title: 'About Online Task Lab (OTL) & Digital Discovery Platform',
        category: 'Website Overview',
        url: '/',
        content: `ONLINE TASK LAB (OTL) - PLATFORM OVERVIEW:
Online Task Lab (https://onlinetasklab.com) is a high-speed digital discovery platform and community hub dedicated to digital creators, mobile video editors, photographers, marketers, and developers.
OTL provides 100% verified, clean Android MOD APKs, premium Lightroom presets (DNG/XMP), curated AI copywriting & generation prompts (ChatGPT 4o, Midjourney V6, Gemini), and responsive landing page templates.
Every download on Online Task Lab is completely free. We do not charge fees, require paid subscriptions, or enforce annoying ad loops.
All digital file delivery is conducted via the official verified Telegram channel: https://t.me/OnlineTaskLab.`,
        chunksCount: 0,
        contentHash: '',
        updatedAt: new Date().toISOString()
      },
      {
        id: 'doc-page-download-delivery',
        sourceType: 'page',
        sourceId: 'page-download',
        title: 'How to Download Resources on OTL (Telegram File Delivery)',
        category: 'Download Policy',
        url: '/#download-policy',
        content: `HOW TO DOWNLOAD ANY RESOURCE ON ONLINE TASK LAB:
1. Browse to any app, landing page, AI prompt, or Lightroom preset on Online Task Lab.
2. Click the direct "Download via Telegram" or "Instant Download" button.
3. You will be redirected directly to the specific post in the official Online Task Lab Telegram channel (https://t.me/OnlineTaskLab).
4. Tap the file in Telegram to save it instantly to your device.
Why Telegram? Delivering files via Telegram guarantees ultra-fast cloud download speeds, zero corrupted files, direct updates when a new version is released, and protects users from malicious third-party redirect ads.`,
        chunksCount: 0,
        contentHash: '',
        updatedAt: new Date().toISOString()
      },
      {
        id: 'doc-page-safety-virustotal',
        sourceType: 'page',
        sourceId: 'page-safety',
        title: 'Safety Guarantee, VirusTotal Testing & Android Harmful Warning',
        category: 'Security & Safety',
        url: '/#security',
        content: `OTL SAFETY & SECURITY GUARANTEE:
Is Online Task Lab safe? YES, 100%. Every single APK, preset, and template published on Online Task Lab undergoes strict testing:
1. VirusTotal Verification: Every APK is scanned through 70+ leading antivirus engines (including Kaspersky, Bitdefender, ESET, and Avast). No trojans, spyware, or keyloggers are tolerated.
2. Sandbox Testing: Modded apps are tested on clean Android virtual environments to verify that VIP features are unlocked and that no aggressive telemetry exists.
Why does Android say "File might be harmful"?
When downloading APKs outside of the Google Play Store, Android browsers (like Google Chrome) automatically display a generic prompt stating "File might be harmful. Do you want to download anyway?". This is standard Google policy for all third-party APK downloads. You can safely tap "Download anyway".
Troubleshooting "App Not Installed":
- If Android shows "App not installed", ensure you have uninstalled the original version of the app from Google Play first.
- Ensure your phone has at least 500 MB of free storage space.
- Verify your Android OS version meets the minimum requirements (usually Android 8.0+).`,
        chunksCount: 0,
        contentHash: '',
        updatedAt: new Date().toISOString()
      },
      {
        id: 'doc-page-contact-support',
        sourceType: 'page',
        sourceId: 'page-contact',
        title: 'Online Task Lab Official Contact, Telegram Support & Help Desk',
        category: 'Customer Support',
        url: '/contact',
        content: `OFFICIAL CONTACT & 24/7 SUPPORT CHANNELS:
If you need direct assistance, want to report a broken link, or wish to submit a custom Mod/Resource request:
- Official Telegram Broadcast Channel: https://t.me/OnlineTaskLab
- Official Telegram Community Discussion Group: https://t.me/OnlineTaskLabGroup
- Telegram Direct Admin Support: https://t.me/OnlineTaskLabAdmin
- Official Support Email: onlinetasklab@gmail.com
- Live AI Chat Support: Available 24/7 via the floating chat widget on our website.
- Requesting custom resources: You can submit custom requests for specific Android apps, AI prompts, or presets through the website Contact form or directly in our Telegram group. Requests are typically reviewed and fulfilled within 24 to 48 hours.`,
        chunksCount: 0,
        contentHash: '',
        updatedAt: new Date().toISOString()
      },
      {
        id: 'doc-page-pricing-refunds',
        sourceType: 'page',
        sourceId: 'page-pricing',
        title: '100% Free Platform Policy, Pricing & Refund Terms',
        category: 'Commercial Policy',
        url: '/#pricing',
        content: `PRICING, BILLING & REFUND POLICY:
Is Online Task Lab free?
Yes. ALL resources, MOD APKs, presets, AI prompts, and landing page code templates on Online Task Lab are 100% FREE of charge.
No Subscriptions: Users are never asked to enter credit cards, bank details, or crypto payments.
Refunds: Because all resources are free digital downloads, there are no financial transactions or refund mechanisms required.
If anyone claiming to represent Online Task Lab asks you for payment or money in exchange for standard OTL files, report them immediately to our official admin on Telegram at https://t.me/OnlineTaskLabAdmin.`,
        chunksCount: 0,
        contentHash: '',
        updatedAt: new Date().toISOString()
      },
      {
        id: 'doc-page-account-otp',
        sourceType: 'page',
        sourceId: 'page-account',
        title: 'User Accounts, Registration & Email OTP Verification',
        category: 'User Accounts',
        url: '/#account',
        content: `USER ACCOUNTS & REGISTRATION RULES:
- Guest Access: You can browse all categories and download all resources as a guest without creating an account.
- Free Member Accounts: Creating an account gives you a permanent User ID (e.g., OTL_1, OTL_2), download history tracking, personalized bookmarks, and priority Telegram community access.
- Email OTP Verification: To prevent spam and fake registrations, account creation requires verifying your email address with a 6-digit OTP (One-Time Password) code sent via our transactional email system.
- OTP valid period: 15 minutes. If you do not see the email, please check your Spam/Junk folder. You can request a new OTP after a 60-second cooldown.`,
        chunksCount: 0,
        contentHash: '',
        updatedAt: new Date().toISOString()
      }
    ];

    return docs.map(d => ({
      ...d,
      contentHash: this.generateHash(d.content)
    }));
  }

  /**
   * Discover and compile FAQs into knowledge docs
   */
  private getFaqDocuments(customFaqs?: any[]): KnowledgeDocument[] {
    const rawFaqs = customFaqs && customFaqs.length > 0 ? customFaqs : (initialContactSettings.faqs || []);
    return rawFaqs.map((faq, index) => {
      const content = `FREQUENTLY ASKED QUESTION:
QUESTION: ${faq.question}
OFFICIAL OTL ANSWER: ${faq.answer}`;
      const rawId = faq.id || `faq-${index}`;
      const docId = rawId.startsWith('doc-faq-') ? rawId : `doc-faq-${rawId}`;
      return {
        id: docId,
        sourceType: 'faq' as const,
        sourceId: rawId,
        title: `FAQ: ${faq.question}`,
        category: 'Frequently Asked Questions',
        url: '/contact#faq',
        content,
        chunksCount: 0,
        contentHash: this.generateHash(content),
        updatedAt: new Date().toISOString()
      };
    });
  }

  /**
   * Discover and compile Categories into knowledge docs
   */
  private getCategoryDocuments(customCategories?: any[]): KnowledgeDocument[] {
    const cats = customCategories && customCategories.length > 0 ? customCategories : initialCategories;
    return cats.map(cat => {
      const content = `OTL CATALOG CATEGORY:
CATEGORY NAME: ${cat.name}
SLUG: /category/${cat.slug}
DESCRIPTION: ${cat.description}
POPULAR TOPICS & TAGS: ${cat.tags?.join(', ') || 'All curated items'}
AVAILABLE ITEMS: Over ${cat.itemCount || 10} verified resources ready for free download.
HOW TO ACCESS: Visit https://onlinetasklab.com/#${cat.slug} or join our Telegram channel https://t.me/OnlineTaskLab.`;
      const rawId = cat.id || cat.slug;
      const docId = rawId.startsWith('doc-cat-') ? rawId : `doc-cat-${rawId}`;
      return {
        id: docId,
        sourceType: 'category' as const,
        sourceId: rawId,
        title: `Category: ${cat.name}`,
        category: 'Catalog Navigation',
        url: `/#${cat.slug}`,
        content,
        chunksCount: 0,
        contentHash: this.generateHash(content),
        updatedAt: new Date().toISOString()
      };
    });
  }

  /**
   * Split document into overlapping semantic chunks
   */
  public chunkDocument(doc: KnowledgeDocument, chunkSize = 450, overlap = 80): KnowledgeChunk[] {
    const chunks: KnowledgeChunk[] = [];
    const text = doc.content;

    if (text.length <= chunkSize) {
      chunks.push({
        id: `${doc.id}-chunk-0`,
        documentId: doc.id,
        sourceType: doc.sourceType,
        title: doc.title,
        category: doc.category,
        text,
        tokenEstimate: Math.ceil(text.length / 4),
        url: doc.url
      });
      return chunks;
    }

    let start = 0;
    let chunkIndex = 0;

    while (start < text.length) {
      let end = start + chunkSize;
      if (end >= text.length) {
        end = text.length;
      } else {
        // Break on paragraph or sentence boundary
        const nextBreak = text.indexOf('\n\n', end - 50);
        if (nextBreak !== -1 && nextBreak <= end + 50) {
          end = nextBreak;
        } else {
          const nextPeriod = text.indexOf('. ', end - 30);
          if (nextPeriod !== -1 && nextPeriod <= end + 30) {
            end = nextPeriod + 1;
          }
        }
      }

      const chunkText = text.substring(start, end).trim();
      if (chunkText.length > 30) {
        chunks.push({
          id: `${doc.id}-chunk-${chunkIndex}`,
          documentId: doc.id,
          sourceType: doc.sourceType,
          title: doc.title,
          category: doc.category,
          text: chunkText,
          tokenEstimate: Math.ceil(chunkText.length / 4),
          url: doc.url
        });
        chunkIndex++;
      }

      if (end >= text.length) break;
      start = end - overlap;
    }

    return chunks;
  }

  /**
   * Master Website Data Discovery & Synchronization Pipeline
   */
  public async syncWebsiteData(existingCustomDocs: KnowledgeDocument[] = []): Promise<{
    documents: KnowledgeDocument[];
    chunks: KnowledgeChunk[];
    status: WebsiteSyncStatus;
  }> {
    if (this.isSyncing) {
      console.log('[WebsiteSync] Sync already in progress, returning current state');
    }
    this.isSyncing = true;
    this.syncStatus.status = 'syncing';

    const discoveredDocs: KnowledgeDocument[] = [];
    const failedItems: string[] = [];

    try {
      // 1. Fetch live Resources from Firestore or local fallback
      const resourceMap = new Map<string, any>();
      let loadedFromFirestore = false;
      let liveFaqs: any[] | null = null;
      let liveCategories: any[] | null = null;

      try {
        const db = await getFirestoreClient();
        if (db) {
          const { collection, getDocs, query, limit, doc, getDoc } = await import('firebase/firestore');
          const snap = await getDocs(query(collection(db, 'resources'), limit(200)));
          if (snap && snap.size > 0) {
            console.log(`[WebsiteSync] Successfully connected to live Firestore! Loaded ${snap.size} real-time resources.`);
            snap.forEach(docSnap => {
              const data = docSnap.data();
              resourceMap.set(docSnap.id, { ...data, id: docSnap.id });
            });
            loadedFromFirestore = true;
          }

          // Fetch live FAQs
          try {
            const contactSnap = await getDoc(doc(db, 'settings', 'contactSettings'));
            if (contactSnap.exists() && Array.isArray(contactSnap.data()?.faqs)) {
              liveFaqs = contactSnap.data().faqs;
            }
          } catch (cErr) {}

          // Fetch live Categories
          try {
            const catSnap = await getDocs(query(collection(db, 'categories'), limit(50)));
            if (catSnap && catSnap.size > 0) {
              const cats: any[] = [];
              catSnap.forEach(d => cats.push({ ...d.data(), id: d.id }));
              liveCategories = cats;
            }
          } catch (catErr) {}
        }
      } catch (fErr: any) {
        console.warn('[WebsiteSync] Live Firestore fetch notice (using cached catalog):', fErr?.message || fErr);
      }

      // If Firestore had no resources or couldn't be connected, fallback to initial default catalog
      if (!loadedFromFirestore) {
        initialResources.forEach(r => resourceMap.set(r.id, r));
      }

      // Update live cache
      this.cachedLiveResources = resourceMap;

      // 2. Transform all resources into KnowledgeDocuments
      for (const res of resourceMap.values()) {
        try {
          const doc = this.resourceToDocument(res);
          discoveredDocs.push(doc);
        } catch (rErr: any) {
          failedItems.push(res.id);
        }
      }

      // 3. Add Website Pages (About, Download, Security, Contact, Policy, Accounts)
      const pageDocs = this.getWebsitePagesDocuments();
      discoveredDocs.push(...pageDocs);

      // 4. Add Website FAQs (authoritative from live Firestore or initial)
      const faqDocs = this.getFaqDocuments(liveFaqs || undefined);
      discoveredDocs.push(...faqDocs);

      // 5. Add Website Categories (authoritative from live Firestore or initial)
      const catDocs = this.getCategoryDocuments(liveCategories || undefined);
      discoveredDocs.push(...catDocs);

      // 6. Retain any custom manual knowledge docs added by admin (supplemental guidance)
      for (const customDoc of existingCustomDocs) {
        if (customDoc.sourceType === 'custom' && !discoveredDocs.some(d => d.id === customDoc.id)) {
          discoveredDocs.push(customDoc);
        }
      }

      // 7. Generate all semantic chunks
      const allChunks: KnowledgeChunk[] = [];
      for (const doc of discoveredDocs) {
        const chunks = this.chunkDocument(doc);
        doc.chunksCount = chunks.length;
        allChunks.push(...chunks);
      }

      // Update status metrics
      this.syncStatus = {
        lastSyncTime: new Date().toISOString(),
        totalProducts: resourceMap.size,
        totalPages: pageDocs.length,
        totalFaqs: faqDocs.length,
        totalPolicies: 2,
        totalChunks: allChunks.length,
        failedItems,
        status: 'synced',
        indexedBreakdown: {
          products: resourceMap.size,
          pages: pageDocs.length,
          faqs: faqDocs.length,
          categories: catDocs.length,
          custom: existingCustomDocs.length
        }
      };

      console.log(`[WebsiteSync] Synchronization complete! ${discoveredDocs.length} total documents, ${allChunks.length} semantic chunks indexed.`);

      return {
        documents: discoveredDocs,
        chunks: allChunks,
        status: this.syncStatus
      };
    } catch (err: any) {
      console.error('[WebsiteSync] Sync failed with error:', err);
      this.syncStatus.status = 'error';
      this.syncStatus.errorMessage = err?.message || String(err);
      throw err;
    } finally {
      this.isSyncing = false;
    }
  }

  /**
   * Handle single resource real-time create/update/delete from AppContext
   */
  public handleResourceUpdate(
    resource: any,
    action: 'create' | 'update' | 'delete'
  ): { doc: KnowledgeDocument | null; chunks: KnowledgeChunk[]; status: 'synced' | 'inactive' | 'deleted' } {
    if (!resource || !resource.id) {
      return { doc: null, chunks: [], status: 'inactive' };
    }

    if (action === 'delete') {
      const cached = this.cachedLiveResources.get(resource.id);
      if (cached?.title) this.removedResourceIdentifiers.add(cached.title.toLowerCase().trim());
      if (resource?.title) this.removedResourceIdentifiers.add(resource.title.toLowerCase().trim());
      if (resource?.id) this.removedResourceIdentifiers.add(String(resource.id).toLowerCase().trim());
      this.cachedLiveResources.delete(resource.id);
      return { doc: null, chunks: [], status: 'deleted' };
    }

    const isActive = this.isResourceActive(resource);
    if (!isActive) {
      const cached = this.cachedLiveResources.get(resource.id);
      if (cached?.title) this.removedResourceIdentifiers.add(cached.title.toLowerCase().trim());
      if (resource?.title) this.removedResourceIdentifiers.add(resource.title.toLowerCase().trim());
      this.cachedLiveResources.delete(resource.id);
      return { doc: null, chunks: [], status: 'inactive' };
    }

    // Reactivated or published: remove from removed list
    if (resource?.title) this.removedResourceIdentifiers.delete(resource.title.toLowerCase().trim());
    if (resource?.id) this.removedResourceIdentifiers.delete(String(resource.id).toLowerCase().trim());

    this.cachedLiveResources.set(resource.id, resource);
    const doc = this.resourceToDocument(resource);
    const chunks = this.chunkDocument(doc);
    doc.chunksCount = chunks.length;
    doc.syncStatus = 'synced';
    doc.lastIndexedAt = new Date().toISOString();
    return { doc, chunks, status: 'synced' };
  }

  /**
   * Convert category item to KnowledgeDocument
   */
  public categoryToDocument(cat: any): KnowledgeDocument {
    const rawId = cat.id || cat.slug;
    const docId = rawId.startsWith('doc-cat-') ? rawId : `doc-cat-${rawId}`;
    const content = `OTL CATALOG CATEGORY:
CATEGORY NAME: ${cat.name}
SLUG: /category/${cat.slug}
DESCRIPTION: ${cat.description || 'Curated digital resources and tools'}
POPULAR TOPICS & TAGS: ${cat.tags?.join(', ') || 'All curated items'}
AVAILABLE ITEMS: Over ${cat.itemCount || 10} verified resources ready for free download.
HOW TO ACCESS: Visit https://onlinetasklab.com/#${cat.slug} or join our Telegram channel https://t.me/OnlineTaskLab.`;
    return {
      id: docId,
      sourceType: 'category',
      sourceId: rawId,
      title: `Category: ${cat.name}`,
      category: 'Catalog Navigation',
      url: `/#${cat.slug}`,
      content,
      chunksCount: 0,
      contentHash: this.generateHash(content),
      updatedAt: new Date().toISOString(),
      syncStatus: 'synced',
      lastIndexedAt: new Date().toISOString()
    };
  }

  /**
   * Convert FAQ item to KnowledgeDocument
   */
  public faqToDocument(faq: any, index?: number): KnowledgeDocument {
    const rawId = faq.id || (index !== undefined ? `faq-${index}` : `faq-${Date.now()}`);
    const docId = rawId.startsWith('doc-faq-') ? rawId : `doc-faq-${rawId}`;
    const content = `FREQUENTLY ASKED QUESTION:
QUESTION: ${faq.question}
OFFICIAL OTL ANSWER: ${faq.answer}`;
    return {
      id: docId,
      sourceType: 'faq',
      sourceId: rawId,
      title: `FAQ: ${faq.question}`,
      category: 'Frequently Asked Questions',
      url: '/contact#faq',
      content,
      chunksCount: 0,
      contentHash: this.generateHash(content),
      updatedAt: new Date().toISOString(),
      syncStatus: 'synced',
      lastIndexedAt: new Date().toISOString()
    };
  }

  /**
   * Handle real-time content updates for Categories, FAQs, and Pages
   */
  public handleContentUpdate(
    sourceType: 'category' | 'faq' | 'page',
    item: any,
    action: 'create' | 'update' | 'delete'
  ): { doc: KnowledgeDocument | null; chunks: KnowledgeChunk[]; status: 'synced' | 'deleted' } {
    if (!item) return { doc: null, chunks: [], status: 'deleted' };

    let doc: KnowledgeDocument | null = null;
    if (sourceType === 'category') {
      doc = this.categoryToDocument(item);
    } else if (sourceType === 'faq') {
      doc = this.faqToDocument(item);
    }

    if (action === 'delete' || !doc) {
      return { doc: null, chunks: [], status: 'deleted' };
    }

    const chunks = this.chunkDocument(doc);
    doc.chunksCount = chunks.length;
    doc.syncStatus = 'synced';
    doc.lastIndexedAt = new Date().toISOString();
    return { doc, chunks, status: 'synced' };
  }
}
