import crypto from 'crypto';
import { KnowledgeDocument, KnowledgeChunk } from './types';
import { WebsiteSyncEngine } from './websiteSync';

export interface SyncRetryItem {
  id: string;
  sourceType: 'product' | 'category' | 'faq' | 'page';
  action: 'create' | 'update' | 'delete';
  item: any;
  retryCount: number;
  lastAttempt: string;
  error?: string;
}

const SEARCH_STOP_WORDS = new Set([
  'a', 'an', 'the', 'is', 'are', 'was', 'were', 'be', 'been', 'being',
  'for', 'in', 'on', 'at', 'to', 'of', 'and', 'or', 'with', 'by', 'from',
  'it', 'this', 'that', 'these', 'those', 'what', 'how', 'when', 'where',
  'why', 'who', 'which', 'can', 'could', 'would', 'should', 'do', 'does', 'did',
  'i', 'you', 'he', 'she', 'we', 'they', 'me', 'my', 'your', 'his', 'her', 'our',
  'not', 'no', 'non',
  'কি', 'কী', 'কে', 'কোন', 'কোথায়', 'কীভাবে', 'কিভাবে', 'কেন', 'কবে', 'এবং', 'বা', 'এর', 'দে'
]);

const GENERIC_INTENT_WORDS = new Set([
  'price', 'pricing', 'cost', 'fee', 'free', 'download', 'link', 'version', 'latest',
  'features', 'mod', 'apk', 'app', 'apps', 'file', 'info', 'information', 'details',
  'about', 'tell', 'give', 'get', 'product', 'item', 'dam', 'taka', 'koto', 'kivabe',
  'কিভাবে', 'দাম', 'টাকা', 'কত', 'ডাউনলোড', 'অ্যাপ', 'প্রোডাক্ট', 'রিসোর্স', 'সাহায্য'
]);

export class RAGEngine {
  private documents: Map<string, KnowledgeDocument> = new Map();
  private chunks: KnowledgeChunk[] = [];
  public websiteSync: WebsiteSyncEngine;
  private isInitialized = false;
  private retryQueue: SyncRetryItem[] = [];
  private retryInterval: NodeJS.Timeout | null = null;

  constructor() {
    this.websiteSync = new WebsiteSyncEngine();
    this.startRetryWorker();
    this.init();
  }

  private startRetryWorker() {
    if (this.retryInterval) return;
    this.retryInterval = setInterval(() => {
      this.processRetryQueue().catch(err => {
        console.warn('[RAG Engine] Retry worker error:', err);
      });
    }, 15000);
  }

  public async init(): Promise<void> {
    if (this.isInitialized) return;
    try {
      console.log('[RAG Engine] Bootstrapping automatic website knowledge base...');
      const result = await this.websiteSync.syncWebsiteData(Array.from(this.documents.values()));
      this.documents.clear();
      result.documents.forEach(d => this.documents.set(d.id, d));
      this.chunks = result.chunks;
      this.isInitialized = true;
      console.log(`[RAG Engine] Ready! ${this.documents.size} documents, ${this.chunks.length} chunks indexed.`);
    } catch (err) {
      console.error('[RAG Engine] Failed to initialize automatic sync:', err);
    }
  }

  /**
   * Rebuild or resynchronize website knowledge base
   */
  public async syncWithWebsite(force = false): Promise<{ docsCount: number; chunksCount: number }> {
    const existingCustomDocs = Array.from(this.documents.values()).filter(d => d.sourceType === 'custom');
    const result = await this.websiteSync.syncWebsiteData(existingCustomDocs);
    this.documents.clear();
    result.documents.forEach(d => this.documents.set(d.id, d));
    this.chunks = result.chunks;
    return {
      docsCount: this.documents.size,
      chunksCount: this.chunks.length
    };
  }

  /**
   * Reconcile on startup or on demand against live resources
   */
  public async reconcileWithWebsite(liveResources?: any[]): Promise<{
    created: number;
    updated: number;
    deleted: number;
    unchanged: number;
    totalDocs: number;
  }> {
    let created = 0;
    let updated = 0;
    let deleted = 0;
    let unchanged = 0;

    const resources = liveResources || Array.from(this.websiteSync['cachedLiveResources'].values());
    const seenDocIds = new Set<string>();

    for (const res of resources) {
      const docId = `doc-prod-${res.id}`;
      seenDocIds.add(docId);
      const existing = this.documents.get(docId);

      const isActive = this.websiteSync.isResourceActive(res);
      if (!isActive) {
        if (existing) {
          this.handleResourceUpdate(res, 'delete');
          deleted++;
        }
        continue;
      }

      const resDoc = this.websiteSync.resourceToDocument(res);
      if (!existing) {
        this.handleResourceUpdate(res, 'create');
        created++;
      } else if (existing.contentHash !== resDoc.contentHash) {
        this.handleResourceUpdate(res, 'update');
        updated++;
      } else {
        unchanged++;
      }
    }

    console.log(`[RAG Engine Reconciliation] Completed. Created: ${created}, Updated: ${updated}, Deleted: ${deleted}, Unchanged: ${unchanged}`);

    // Prune stale product documents that no longer exist in live database
    for (const [docId, doc] of this.documents.entries()) {
      if (doc.sourceType === 'product' && !seenDocIds.has(docId)) {
        console.log(`[RAG Engine Reconciliation] Pruning deleted product from RAG: ${docId}`);
        this.documents.delete(docId);
        this.chunks = this.chunks.filter(c => c.documentId !== docId);
        deleted++;
      }
    }

    return {
      created,
      updated,
      deleted,
      unchanged,
      totalDocs: this.documents.size
    };
  }

  /**
   * Real-time update for a single resource (created, updated, deleted)
   * Ensures:
   * 1. Deterministic content hashing to avoid redundant re-chunking (Test 5)
   * 2. No duplicate chunks or documents (Test 4)
   * 3. Handles published vs unpublished/inactive (Test 3)
   * 4. Safe non-blocking failure recovery with retry queue (Test 6)
   */
  public handleResourceUpdate(
    resource: any,
    action: 'create' | 'update' | 'delete'
  ): { success: boolean; docId: string; status: string; chunksCount: number; contentHash?: string; error?: string } {
    const docId = `doc-prod-${resource.id}`;
    const existingDoc = this.documents.get(docId);

    try {
      // 1. Process document & chunks from websiteSync
      const { doc, chunks, status } = this.websiteSync.handleResourceUpdate(resource, action);

      // 2. If deleted or inactive/unpublished, remove from RAG
      if (action === 'delete' || status === 'deleted' || status === 'inactive' || !doc) {
        this.chunks = this.chunks.filter(c => c.documentId !== docId);
        this.documents.delete(docId);
        console.log(`[RAG Engine] Removed resource "${resource.title || resource.id}" from index (status: ${status || action}).`);
        return { success: true, docId, status: status || 'deleted', chunksCount: 0 };
      }

      // 3. Test 5: Content Hash Check - avoid redundant re-chunking if unchanged
      if (action === 'update' && existingDoc && existingDoc.contentHash === doc.contentHash) {
        console.log(`[RAG Engine] Resource "${doc.title}" contentHash unchanged (${doc.contentHash.slice(0, 8)}). Skipping chunk re-indexing.`);
        existingDoc.updatedAt = new Date().toISOString();
        existingDoc.lastIndexedAt = new Date().toISOString();
        existingDoc.syncStatus = 'synced';
        existingDoc.syncVersion = (existingDoc.syncVersion || 1) + 1;
        existingDoc.metadata = { ...existingDoc.metadata, ...doc.metadata };
        return { success: true, docId, status: 'synced', chunksCount: existingDoc.chunksCount, contentHash: doc.contentHash };
      }

      // 4. Content has changed or is new: Prune old chunks and index new chunks
      this.chunks = this.chunks.filter(c => c.documentId !== docId);
      doc.syncVersion = (existingDoc?.syncVersion || 0) + 1;
      doc.syncStatus = 'synced';
      doc.syncError = null;
      doc.retryCount = 0;
      doc.lastIndexedAt = new Date().toISOString();

      this.documents.set(doc.id, doc);
      this.chunks.push(...chunks);

      console.log(`[RAG Engine] Indexed resource "${doc.title}" (${chunks.length} chunks, hash: ${doc.contentHash.slice(0, 8)}).`);
      return { success: true, docId, status: 'synced', chunksCount: chunks.length, contentHash: doc.contentHash };
    } catch (err: any) {
      console.error(`[RAG Engine] Error syncing resource "${resource.title || resource.id}":`, err);

      // Test 6: Non-blocking error handling & enqueue for retry
      const errorMsg = err?.message || String(err);
      if (existingDoc) {
        existingDoc.syncStatus = 'failed';
        existingDoc.syncError = errorMsg;
        existingDoc.retryCount = (existingDoc.retryCount || 0) + 1;
      }

      this.enqueueRetry({
        id: docId,
        sourceType: 'product',
        action,
        item: resource,
        retryCount: (existingDoc?.retryCount || 0) + 1,
        lastAttempt: new Date().toISOString(),
        error: errorMsg
      });

      return { success: false, docId, status: 'failed', chunksCount: 0, error: errorMsg };
    }
  }

  /**
   * Real-time update for categories, FAQs, and pages
   */
  public handleContentUpdate(
    sourceType: 'category' | 'faq' | 'page',
    item: any,
    action: 'create' | 'update' | 'delete'
  ): { success: boolean; docId: string; status: string; chunksCount: number } {
    try {
      const { doc, chunks, status } = this.websiteSync.handleContentUpdate(sourceType, item, action);
      const rawId = item?.id ? String(item.id) : `item-${Date.now()}`;
      const docId = doc ? doc.id : (rawId.startsWith(`doc-${sourceType}-`) ? rawId : `doc-${sourceType}-${rawId}`);

      if (action === 'delete' || status === 'deleted' || !doc) {
        this.chunks = this.chunks.filter(c => c.documentId !== docId);
        this.documents.delete(docId);
        return { success: true, docId, status: 'deleted', chunksCount: 0 };
      }

      const existingDoc = this.documents.get(docId);
      if (action === 'update' && existingDoc && existingDoc.contentHash === doc.contentHash) {
        return { success: true, docId, status: 'synced', chunksCount: existingDoc.chunksCount };
      }

      this.chunks = this.chunks.filter(c => c.documentId !== docId);
      doc.syncVersion = (existingDoc?.syncVersion || 0) + 1;
      doc.syncStatus = 'synced';
      doc.lastIndexedAt = new Date().toISOString();

      this.documents.set(doc.id, doc);
      this.chunks.push(...chunks);

      return { success: true, docId, status: 'synced', chunksCount: chunks.length };
    } catch (err: any) {
      console.error(`[RAG Engine] Error updating content (${sourceType}):`, err);
      return { success: false, docId: item?.id || '', status: 'failed', chunksCount: 0 };
    }
  }

  /**
   * Enqueue item for background retry
   */
  private enqueueRetry(item: SyncRetryItem) {
    const existingIndex = this.retryQueue.findIndex(r => r.id === item.id);
    if (existingIndex >= 0) {
      this.retryQueue[existingIndex] = item;
    } else {
      this.retryQueue.push(item);
    }
  }

  /**
   * Process background retry queue
   */
  public async processRetryQueue(): Promise<{ retried: number; remaining: number }> {
    if (this.retryQueue.length === 0) return { retried: 0, remaining: 0 };

    const toProcess = [...this.retryQueue];
    this.retryQueue = [];
    let retried = 0;

    for (const item of toProcess) {
      if (item.retryCount > 3) {
        console.warn(`[RAG Retry Worker] Item ${item.id} exceeded max retries (3). Marking failed.`);
        continue;
      }

      console.log(`[RAG Retry Worker] Retrying item ${item.id} (attempt ${item.retryCount})...`);
      let result;
      if (item.sourceType === 'product') {
        result = this.handleResourceUpdate(item.item, item.action);
      } else {
        result = this.handleContentUpdate(item.sourceType, item.item, item.action);
      }

      if (result.success) {
        retried++;
      } else {
        item.retryCount++;
        item.lastAttempt = new Date().toISOString();
        this.retryQueue.push(item);
      }
    }

    return { retried, remaining: this.retryQueue.length };
  }

  public getRetryQueue(): SyncRetryItem[] {
    return this.retryQueue;
  }

  public getAllDocuments(): KnowledgeDocument[] {
    return Array.from(this.documents.values());
  }

  public getAllChunks(): KnowledgeChunk[] {
    return this.chunks;
  }

  public getDocument(id: string): KnowledgeDocument | undefined {
    return this.documents.get(id);
  }

  public addDocument(doc: Omit<KnowledgeDocument, 'chunksCount' | 'contentHash' | 'updatedAt'>): KnowledgeDocument {
    const contentHash = crypto.createHash('sha256').update(doc.content).digest('hex');
    const fullDoc: KnowledgeDocument = {
      ...doc,
      contentHash,
      chunksCount: 0,
      updatedAt: new Date().toISOString()
    };

    const newChunks = this.websiteSync.chunkDocument(fullDoc);
    fullDoc.chunksCount = newChunks.length;

    this.documents.set(fullDoc.id, fullDoc);
    this.chunks = this.chunks.filter(c => c.documentId !== fullDoc.id);
    this.chunks.push(...newChunks);

    return fullDoc;
  }

  public deleteDocument(id: string): boolean {
    const existed = this.documents.delete(id);
    if (existed) {
      this.chunks = this.chunks.filter(c => c.documentId !== id);
    }
    return existed;
  }

  /**
   * Multilingual and token-aware hybrid search
   */
  public search(
    query: string,
    options: {
      maxResults?: number;
      category?: string;
      sourceType?: string;
      minScore?: number;
    } = {}
  ): { chunk: KnowledgeChunk; score: number }[] {
    const { maxResults = 5, category, sourceType, minScore = 0.12 } = options;
    const cleanQuery = query.toLowerCase().trim();
    if (!cleanQuery) return [];

    // Extract Latin tokens and Bengali Unicode character sequences
    const allTokens = cleanQuery
      .split(/[\s,.-?()!]+/)
      .map(t => t.trim())
      .filter(t => t.length > 1);

    // Meaningful tokens with stop words removed for high-precision matching
    const meaningfulTokens = allTokens.filter(t => !SEARCH_STOP_WORDS.has(t));
    const subjectTokens = meaningfulTokens.filter(t => !GENERIC_INTENT_WORDS.has(t));
    const queryTokens = subjectTokens.length > 0 ? subjectTokens : (meaningfulTokens.length > 0 ? meaningfulTokens : allTokens);

    const scored: { chunk: KnowledgeChunk; score: number }[] = [];

    for (const chunk of this.chunks) {
      if (category && chunk.category.toLowerCase() !== category.toLowerCase()) {
        continue;
      }
      if (sourceType && chunk.sourceType !== sourceType) {
        continue;
      }

      const chunkText = chunk.text.toLowerCase();
      const chunkTitle = chunk.title.toLowerCase();

      // If specific subject tokens exist, require at least one subject token or exact phrase to match
      if (subjectTokens.length > 0) {
        const matchesSubject = chunkTitle.includes(cleanQuery) ||
          chunkText.includes(cleanQuery) ||
          subjectTokens.some(st => {
            if (st.length < 3) return false;
            if (chunkTitle.includes(st)) return true;
            if (st.length >= 5 && chunkText.includes(st)) return true;
            const regex = new RegExp(`\\b${st.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i');
            return regex.test(chunkText);
          });
        if (!matchesSubject) {
          continue;
        }
      }

      let score = 0;

      // Exact query phrase match (highest signal)
      if (chunkText.includes(cleanQuery)) {
        score += 2.0;
      }
      if (chunkTitle.includes(cleanQuery)) {
        score += 2.5;
      }

      // Token overlap scoring on meaningful query tokens
      let tokenMatches = 0;
      for (const token of queryTokens) {
        if (chunkTitle.includes(token)) {
          score += 0.5;
          tokenMatches++;
        } else if (chunkText.includes(token)) {
          score += 0.25;
          tokenMatches++;
        }
      }

      if (queryTokens.length > 0) {
        const matchRatio = tokenMatches / queryTokens.length;
        score += matchRatio * 0.8;
      }

      // Keyword intents
      if ((cleanQuery.includes('download') || cleanQuery.includes('link') || cleanQuery.includes('ডাউনলোড')) &&
          (chunkText.includes('download') || chunkText.includes('telegram'))) {
        score += 0.2;
      }

      if ((cleanQuery.includes('price') || cleanQuery.includes('cost') || cleanQuery.includes('free') || cleanQuery.includes('দাম') || cleanQuery.includes('টাকা')) &&
          (chunkText.includes('free') || chunkText.includes('pricing') || chunkText.includes('license'))) {
        score += 0.2;
      }

      if ((cleanQuery.includes('safe') || cleanQuery.includes('virus') || cleanQuery.includes('harmful') || cleanQuery.includes('নিরাপদ')) &&
          (chunkText.includes('virustotal') || chunkText.includes('security') || chunkText.includes('safe'))) {
        score += 0.25;
      }

      if (score >= minScore) {
        scored.push({ chunk, score: Number(score.toFixed(3)) });
      }
    }

    scored.sort((a, b) => b.score - a.score);
    return scored.slice(0, maxResults);
  }

  /**
   * Build Grounded Context incorporating dynamic live database data & RAG chunks
   */
  public buildGroundedContext(query: string, maxChunks = 4): {
    contextText: string;
    sources: {
      id: string;
      title: string;
      category?: string;
      score?: number;
      sourceType?: string;
      url?: string;
      snippet?: string;
    }[];
    liveResource: any | null;
    isUnpublished?: boolean;
  } {
    // 1. Check live database lookup for exact resource query
    const liveResource = this.websiteSync.findLiveResource(query);
    const isUnpublished = !liveResource && this.websiteSync.isResourceUnpublished(query);

    if (isUnpublished) {
      return {
        contextText: '',
        sources: [],
        liveResource: null,
        isUnpublished: true
      };
    }

    // 2. Perform hybrid RAG search over semantic chunks
    const results = this.search(query, { maxResults: maxChunks });

    const sources: {
      id: string;
      title: string;
      category?: string;
      score?: number;
      sourceType?: string;
      url?: string;
      snippet?: string;
    }[] = [];

    const contextSections: string[] = [];

    // If live resource identified, inject authoritative current record first
    if (liveResource) {
      const rawPrice = liveResource.price !== undefined && liveResource.price !== null && liveResource.price !== '' ? liveResource.price : null;
      const priceStr = rawPrice !== null
        ? (typeof rawPrice === 'number' ? `${rawPrice} BDT` : String(rawPrice).trim())
        : (liveResource.isFree === false ? 'Paid' : '100% FREE (Online Task Lab verified free download)');
      const discountStr = liveResource.discountPrice ? ` (Discount Price: ${liveResource.discountPrice})` : '';

      contextSections.push(`[AUTHORITATIVE CURRENT WEBSITE RECORD: ${liveResource.title.toUpperCase()}]
Item: ${liveResource.title}
Category: ${liveResource.category}
Price: ${priceStr}${discountStr}
Current Version: ${liveResource.version || liveResource.apkVersion || 'Latest verified'}
File Size: ${liveResource.fileSize || 'Standard'}
Official Download Link: ${liveResource.telegramUrl || liveResource.downloadUrl || 'https://t.me/OnlineTaskLab'}
Demo URL: ${liveResource.demoUrl || 'N/A'}
Requirements: ${liveResource.requirements || 'Standard'}
Description / Summary: ${liveResource.description || liveResource.shortDescription || liveResource.fullDescription || 'Verified unlocked'}
Features / Mod Info: ${liveResource.modInfo || (Array.isArray(liveResource.tags) ? liveResource.tags.join(', ') : '') || liveResource.shortDescription || liveResource.description || 'Verified unlocked'}
Safety: 100% VirusTotal tested and clean
Status: Published / Active`);

      sources.push({
        id: `live-${liveResource.id}`,
        title: liveResource.title,
        category: liveResource.category,
        score: 1.0,
        sourceType: liveResource.category === 'apps' ? 'Mobile App'
          : liveResource.category === 'landing-pages' ? 'Landing Page'
          : liveResource.category === 'ai-prompts' ? 'AI Prompt'
          : liveResource.category === 'lr-presets' ? 'Lightroom Preset'
          : 'Website Product',
        url: liveResource.telegramUrl || liveResource.downloadUrl || `/resource/${liveResource.slug}`,
        snippet: liveResource.shortDescription || `Download ${liveResource.title} from Online Task Lab.`
      });
    }

    // Add retrieved RAG chunks
    for (let i = 0; i < results.length; i++) {
      const r = results[i];
      // Avoid duplicate source if same as liveResource
      if (liveResource && r.chunk.documentId.includes(liveResource.id)) {
        continue;
      }

      contextSections.push(`[Grounding Source ${sources.length + 1}: ${r.chunk.title} (${r.chunk.category})]
${r.chunk.text}`);

      sources.push({
        id: r.chunk.documentId,
        title: r.chunk.title,
        category: r.chunk.category,
        score: r.score,
        sourceType: r.chunk.sourceType === 'product' ? 'Product'
          : r.chunk.sourceType === 'page' ? 'Website Page'
          : r.chunk.sourceType === 'faq' ? 'FAQ'
          : r.chunk.sourceType === 'category' ? 'Category'
          : 'Website Knowledge',
        url: r.chunk.url,
        snippet: r.chunk.text.substring(0, 140) + '...'
      });
    }

    const contextText = contextSections.length > 0
      ? contextSections.join('\n\n====================\n\n')
      : 'NO_SPECIFIC_KNOWLEDGE_FOUND';

    return {
      contextText,
      sources,
      liveResource,
      isUnpublished
    };
  }
}
