import {
  db,
  doc,
  getDoc,
  setDoc,
  updateDoc,
  collection,
  query,
  where,
  getDocs,
  limit,
  serverTimestamp
} from '../lib/firebase';
import { GuestProfile, GuestSession, GuestSessionEvent } from '../types';
import { supportService } from './supportService';

const GUEST_ID_KEY = 'otl_guest_id';
const LEGACY_SUPPORT_GUEST_ID_KEY = 'otl_support_guest_id';
const GUEST_SESSION_ID_KEY = 'otl_guest_session_id';
const GUEST_SESSION_LAST_ACTIVE_KEY = 'otl_guest_session_last_active';
const SESSION_TIMEOUT_MS = 30 * 60 * 1000; // 30 minutes inactivity timeout

function getCookie(name: string): string | null {
  if (typeof document === 'undefined') return null;
  const match = document.cookie.match(new RegExp('(^|;\\s*)(' + name + ')=([^;]*)'));
  return match ? decodeURIComponent(match[3]) : null;
}

function setCookie(name: string, val: string, days = 365) {
  if (typeof document === 'undefined') return;
  const expires = new Date(Date.now() + days * 864e5).toUTCString();
  document.cookie = `${name}=${encodeURIComponent(val)}; expires=${expires}; path=/; SameSite=Lax`;
}

// Extract human-readable device, browser and OS information
export function parseClientEnvironment(): {
  device: string;
  browser: string;
  os: string;
  userAgent: string;
  language: string;
  screenResolution: string;
  referrer: string;
} {
  if (typeof window === 'undefined') {
    return {
      device: 'Server',
      browser: 'Unknown',
      os: 'Unknown',
      userAgent: '',
      language: 'en',
      screenResolution: '0x0',
      referrer: 'direct'
    };
  }

  const ua = navigator.userAgent || '';
  let browser = 'Web Browser';
  if (/Edg/i.test(ua)) browser = 'Microsoft Edge';
  else if (/Chrome/i.test(ua)) browser = 'Google Chrome';
  else if (/Firefox/i.test(ua)) browser = 'Mozilla Firefox';
  else if (/Safari/i.test(ua) && !/Chrome/i.test(ua)) browser = 'Apple Safari';
  else if (/Opera|OPR/i.test(ua)) browser = 'Opera';

  let os = 'Unknown OS';
  if (/Windows/i.test(ua)) os = 'Windows';
  else if (/Android/i.test(ua)) os = 'Android';
  else if (/iPhone|iPad|iPod/i.test(ua)) os = 'iOS';
  else if (/Macintosh|Mac OS X/i.test(ua)) os = 'macOS';
  else if (/Linux/i.test(ua)) os = 'Linux';

  const isMobile = /Android|iPhone|iPad|iPod|Mobile/i.test(ua);
  const isTablet = /iPad|Tablet/i.test(ua);
  const deviceType = isTablet ? 'Tablet' : isMobile ? 'Mobile' : 'Desktop';
  const device = `${deviceType} (${browser} on ${os})`;

  return {
    device,
    browser,
    os,
    userAgent: ua,
    language: navigator.language || 'en',
    screenResolution: `${window.screen?.width || 0}x${window.screen?.height || 0}`,
    referrer: document.referrer && document.referrer !== '' ? document.referrer : 'direct'
  };
}

class GuestService {
  private currentGuestId: string | null = null;
  private currentSessionId: string | null = null;
  private sessionStartedAt: string | null = null;
  private isInitialized = false;
  private initPromise: Promise<string> | null = null;

  /**
   * Retrieves or creates a cryptographically secure, permanent Guest ID for the anonymous visitor.
   * Persists across localStorage and First-Party Cookies.
   */
  public getOrCreateGuestId(): string {
    if (this.currentGuestId) return this.currentGuestId;

    if (typeof window === 'undefined') {
      return 'gst_server';
    }

    let gid = localStorage.getItem(GUEST_ID_KEY);

    // Backward compatibility: Check if old support guest id exists
    if (!gid) {
      gid = localStorage.getItem(LEGACY_SUPPORT_GUEST_ID_KEY);
    }

    // Cookie fallback
    if (!gid) {
      gid = getCookie(GUEST_ID_KEY);
    }

    // If still not present, generate unique cryptographically backed Guest ID
    if (!gid || !gid.startsWith('gst_') && !gid.startsWith('guest_')) {
      const entropy = typeof crypto !== 'undefined' && crypto.getRandomValues
        ? Array.from(crypto.getRandomValues(new Uint8Array(6)))
            .map(b => b.toString(16).padStart(2, '0'))
            .join('')
        : Math.random().toString(36).substring(2, 10);

      gid = `gst_${Date.now().toString(36)}_${entropy}`;
    }

    // Guarantee persistence across both storage keys and cookies
    try {
      localStorage.setItem(GUEST_ID_KEY, gid);
      localStorage.setItem(LEGACY_SUPPORT_GUEST_ID_KEY, gid);
      setCookie(GUEST_ID_KEY, gid, 365);
    } catch {}

    this.currentGuestId = gid;
    return gid;
  }

  /**
   * Gets or initializes the visitor's current session.
   * Auto-refreshes if inactive for > 30 mins.
   */
  public getOrCreateSessionId(guestId: string): { sessionId: string; isNewSession: boolean } {
    if (typeof window === 'undefined') {
      return { sessionId: 'sess_server', isNewSession: false };
    }

    const now = Date.now();
    const existingSessionId = sessionStorage.getItem(GUEST_SESSION_ID_KEY);
    const lastActiveStr = sessionStorage.getItem(GUEST_SESSION_LAST_ACTIVE_KEY);
    const lastActive = lastActiveStr ? parseInt(lastActiveStr, 10) : 0;

    const isExpired = !lastActive || (now - lastActive > SESSION_TIMEOUT_MS);

    if (existingSessionId && !isExpired) {
      sessionStorage.setItem(GUEST_SESSION_LAST_ACTIVE_KEY, now.toString());
      this.currentSessionId = existingSessionId;
      return { sessionId: existingSessionId, isNewSession: false };
    }

    // Create a new session
    const newSessionId = `sess_${guestId.replace(/^gst_|^guest_/, '')}_${now.toString(36)}`;
    sessionStorage.setItem(GUEST_SESSION_ID_KEY, newSessionId);
    sessionStorage.setItem(GUEST_SESSION_LAST_ACTIVE_KEY, now.toString());
    this.currentSessionId = newSessionId;
    this.sessionStartedAt = new Date().toISOString();

    return { sessionId: newSessionId, isNewSession: true };
  }

  /**
   * Initializes the guest tracking lifecycle:
   * - Ensures Firestore `guestProfiles/{guestId}` exists or is updated
   * - Ensures Firestore `guestSessions/{sessionId}` exists or is updated
   */
  public async initGuestTracking(currentPath?: string): Promise<string> {
    if (this.initPromise) return this.initPromise;

    this.initPromise = (async () => {
      const guestId = this.getOrCreateGuestId();
      const currentPathClean = currentPath || (typeof window !== 'undefined' ? window.location.pathname : '/');
      const { sessionId, isNewSession } = this.getOrCreateSessionId(guestId);
      const clientEnv = parseClientEnvironment();
      const nowIso = new Date().toISOString();

      try {
        const guestDocRef = doc(db, 'guestProfiles', guestId);
        const guestDocSnap = await getDoc(guestDocRef);

        if (!guestDocSnap.exists()) {
          // Create new Guest Profile
          const initialProfile: GuestProfile = {
            id: guestId,
            guestId,
            createdAt: nowIso,
            lastActiveAt: nowIso,
            userAgent: clientEnv.userAgent,
            device: clientEnv.device,
            browser: clientEnv.browser,
            os: clientEnv.os,
            language: clientEnv.language,
            screenResolution: clientEnv.screenResolution,
            referrer: clientEnv.referrer,
            initialLandingPage: currentPathClean,
            currentLandingPage: currentPathClean,
            pageViewsCount: 1,
            sessionCount: 1,
            downloadsCount: 0,
            chatMessagesCount: 0,
            supportReportsCount: 0,
            linkedUserId: null,
            linkedUserEmail: null,
            linkedAt: null,
            status: 'active',
            lastSessionId: sessionId
          };
          await setDoc(guestDocRef, initialProfile);
        } else {
          // Existing Guest Profile: Update activity
          const existingData = guestDocSnap.data() as GuestProfile;
          const updates: Partial<GuestProfile> = {
            lastActiveAt: nowIso,
            currentLandingPage: currentPathClean,
            lastSessionId: sessionId,
            device: clientEnv.device
          };
          if (isNewSession) {
            updates.sessionCount = (existingData.sessionCount || 1) + 1;
          }
          await updateDoc(guestDocRef, updates);
        }

        // Initialize or update the Session Document in Firestore
        const sessionDocRef = doc(db, 'guestSessions', sessionId);
        const sessionSnap = await getDoc(sessionDocRef);

        if (!sessionSnap.exists()) {
          const initialSession: GuestSession = {
            id: sessionId,
            guestId,
            startedAt: nowIso,
            lastActiveAt: nowIso,
            durationSeconds: 0,
            landingPage: currentPathClean,
            exitPage: currentPathClean,
            pageViews: [currentPathClean],
            events: [
              {
                action: 'session_start',
                path: currentPathClean,
                details: `Session started on ${clientEnv.device}`,
                timestamp: nowIso
              }
            ],
            linkedUserId: null,
            isActive: true
          };
          await setDoc(sessionDocRef, initialSession);
        }

        this.isInitialized = true;
      } catch (err) {
        console.warn('[GuestService Warning] Error in initGuestTracking:', err);
      }

      return guestId;
    })();

    return this.initPromise;
  }

  /**
   * Tracks navigation page views, records journey trail in session and profile
   */
  public async trackPageView(path: string): Promise<void> {
    if (typeof window === 'undefined' || !path) return;
    const guestId = this.getOrCreateGuestId();
    const { sessionId } = this.getOrCreateSessionId(guestId);
    const nowIso = new Date().toISOString();

    try {
      // 1. Update session document
      const sessionDocRef = doc(db, 'guestSessions', sessionId);
      const sessionSnap = await getDoc(sessionDocRef);
      if (sessionSnap.exists()) {
        const sData = sessionSnap.data() as GuestSession;
        const pageViews = Array.isArray(sData.pageViews) ? [...sData.pageViews] : [];
        if (pageViews[pageViews.length - 1] !== path) {
          pageViews.push(path);
        }

        const events = Array.isArray(sData.events) ? [...sData.events] : [];
        events.push({
          action: 'page_view',
          path,
          timestamp: nowIso
        });

        const startedMs = sData.startedAt ? new Date(sData.startedAt).getTime() : Date.now();
        const durationSeconds = Math.max(0, Math.floor((Date.now() - startedMs) / 1000));

        await updateDoc(sessionDocRef, {
          lastActiveAt: nowIso,
          exitPage: path,
          pageViews,
          events: events.slice(-50), // keep latest 50 events for efficiency
          durationSeconds
        });
      }

      // 2. Update guest profile document
      const guestDocRef = doc(db, 'guestProfiles', guestId);
      const guestSnap = await getDoc(guestDocRef);
      if (guestSnap.exists()) {
        const gData = guestSnap.data() as GuestProfile;
        await updateDoc(guestDocRef, {
          lastActiveAt: nowIso,
          currentLandingPage: path,
          pageViewsCount: (gData.pageViewsCount || 0) + 1
        });
      }
    } catch (err) {
      console.warn('[GuestService Warning] trackPageView error:', err);
    }
  }

  /**
   * Tracks an interaction event (downloads, chat messages, reports, clicks)
   */
  public async trackEvent(
    action: string,
    metadata?: { path?: string; resourceId?: string; details?: string }
  ): Promise<void> {
    const guestId = this.getOrCreateGuestId();
    const { sessionId } = this.getOrCreateSessionId(guestId);
    const nowIso = new Date().toISOString();

    const eventItem: GuestSessionEvent = {
      action,
      path: metadata?.path || (typeof window !== 'undefined' ? window.location.pathname : undefined),
      resourceId: metadata?.resourceId,
      details: metadata?.details,
      timestamp: nowIso
    };

    try {
      // Record event in session
      const sessionDocRef = doc(db, 'guestSessions', sessionId);
      const sessionSnap = await getDoc(sessionDocRef);
      if (sessionSnap.exists()) {
        const sData = sessionSnap.data() as GuestSession;
        const events = Array.isArray(sData.events) ? [...sData.events] : [];
        events.push(eventItem);
        await updateDoc(sessionDocRef, {
          lastActiveAt: nowIso,
          events: events.slice(-60)
        });
      }

      // Increment respective counters in Guest Profile
      const guestDocRef = doc(db, 'guestProfiles', guestId);
      const guestSnap = await getDoc(guestDocRef);
      if (guestSnap.exists()) {
        const gData = guestSnap.data() as GuestProfile;
        const profileUpdates: Partial<GuestProfile> = {
          lastActiveAt: nowIso
        };

        if (action === 'download_click') {
          profileUpdates.downloadsCount = (gData.downloadsCount || 0) + 1;
        } else if (action === 'chat_message_sent') {
          profileUpdates.chatMessagesCount = (gData.chatMessagesCount || 0) + 1;
        } else if (action === 'support_report_submitted') {
          profileUpdates.supportReportsCount = (gData.supportReportsCount || 0) + 1;
        }

        await updateDoc(guestDocRef, profileUpdates);
      }
    } catch (err) {
      console.warn('[GuestService Warning] trackEvent error:', err);
    }
  }

  /**
   * Core Guest-to-Account Linking Logic:
   * When an anonymous visitor registers or logs in, links their Guest ID, support
   * conversations, reports, and activity logs to their authenticated Firebase User ID.
   */
  public async linkGuestToUser(
    userId: string,
    userEmail?: string | null,
    userName?: string | null
  ): Promise<{ success: boolean; linkedConversations: number; linkedReports: number }> {
    if (!userId) return { success: false, linkedConversations: 0, linkedReports: 0 };

    const guestId = this.getOrCreateGuestId();
    const cacheKey = `otl_linked_${guestId}_${userId}`;

    // Avoid duplicate execution if already linked in this session
    if (typeof window !== 'undefined' && sessionStorage.getItem(cacheKey)) {
      return { success: true, linkedConversations: 0, linkedReports: 0 };
    }

    const nowIso = new Date().toISOString();
    let linkedConvs = 0;
    let linkedReps = 0;

    try {
      // 1. Server-side Support Store conversation & report ownership linking
      const serverResult = await supportService.linkGuestAccount({
        guestId,
        userId,
        userName: userName || undefined,
        userEmail: userEmail || undefined
      });
      linkedConvs = serverResult.linkedConversations || 0;
      linkedReps = serverResult.linkedReports || 0;

      // 2. Update Firestore Guest Profile
      const guestDocRef = doc(db, 'guestProfiles', guestId);
      const guestSnap = await getDoc(guestDocRef);
      if (guestSnap.exists()) {
        await updateDoc(guestDocRef, {
          status: 'linked',
          linkedUserId: userId,
          linkedUserEmail: userEmail || null,
          linkedAt: nowIso,
          lastActiveAt: nowIso
        });
      } else {
        // Create it if was somehow not written
        const clientEnv = parseClientEnvironment();
        await setDoc(guestDocRef, {
          id: guestId,
          guestId,
          createdAt: nowIso,
          lastActiveAt: nowIso,
          userAgent: clientEnv.userAgent,
          device: clientEnv.device,
          language: clientEnv.language,
          screenResolution: clientEnv.screenResolution,
          referrer: clientEnv.referrer,
          initialLandingPage: '/',
          currentLandingPage: '/',
          pageViewsCount: 1,
          sessionCount: 1,
          downloadsCount: 0,
          chatMessagesCount: 0,
          supportReportsCount: 0,
          linkedUserId: userId,
          linkedUserEmail: userEmail || null,
          linkedAt: nowIso,
          status: 'linked',
          lastSessionId: this.currentSessionId || 'none'
        });
      }

      // 3. Update current session with linked user
      if (this.currentSessionId) {
        const sessionDocRef = doc(db, 'guestSessions', this.currentSessionId);
        const sessionSnap = await getDoc(sessionDocRef);
        if (sessionSnap.exists()) {
          const sData = sessionSnap.data() as GuestSession;
          const events = Array.isArray(sData.events) ? [...sData.events] : [];
          events.push({
            action: 'account_linked',
            details: `Guest ID linked to user @${userName || ''} (${userId})`,
            timestamp: nowIso
          });
          await updateDoc(sessionDocRef, {
            linkedUserId: userId,
            events: events.slice(-60)
          });
        }
      }

      // 4. Update the user document in Firestore to register this linked guest ID
      try {
        const userDocRef = doc(db, 'users', userId);
        const userSnap = await getDoc(userDocRef);
        if (userSnap.exists()) {
          const uData = userSnap.data();
          const existingGuests: string[] = Array.isArray(uData.linkedGuestIds) ? uData.linkedGuestIds : [];
          if (!existingGuests.includes(guestId)) {
            await updateDoc(userDocRef, {
              linkedGuestIds: [...existingGuests, guestId]
            });
          }
        }
      } catch (userDocErr) {
        console.warn('[GuestService Warning] Could not update user linkedGuestIds:', userDocErr);
      }

      if (typeof window !== 'undefined') {
        sessionStorage.setItem(cacheKey, 'true');
      }

      console.log(`[GuestService] Successfully linked guest ${guestId} to user ${userId}`);
      return { success: true, linkedConversations: linkedConvs, linkedReports: linkedReps };
    } catch (err) {
      console.error('[GuestService Error] linkGuestToUser failed:', err);
      return { success: false, linkedConversations: linkedConvs, linkedReports: linkedReps };
    }
  }
}

export const guestService = new GuestService();
