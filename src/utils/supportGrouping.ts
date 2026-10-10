import { SupportConversation } from '../../server/support/types';

export interface VisitorChatGroup {
  key: string;
  isGuest: boolean;
  userId?: string;
  guestId?: string;
  displayName: string;
  userEmail?: string;
  avatarLetter: string;
  totalChats: number;
  unreadAdminCount: number;
  hasWaitingHuman: boolean;
  hasHumanHandling: boolean;
  latestActivityAt: string;
  newChats: SupportConversation[];
  oldChats: SupportConversation[];
}

export function getConversationDisplayTitle(conv: SupportConversation): string {
  if (conv.title && conv.title.trim() && conv.title !== 'New Conversation') {
    return conv.title.trim();
  }
  if (conv.lastMessage && conv.lastMessage.trim()) {
    const text = conv.lastMessage.trim();
    const isBengali = /[\u0980-\u09FF]/.test(text);
    const lower = text.toLowerCase();

    if (/(capcut)/i.test(lower)) return isBengali ? 'CapCut Pro ডাউনলোড' : 'CapCut Pro Download';
    if (/(lightroom)/i.test(lower)) return isBengali ? 'Lightroom Presets ডাউনলোড' : 'Lightroom Presets';
    if (/(download|apk)/i.test(lower)) return isBengali ? 'রিসোর্স ডাউনলোড' : 'Download Inquiry';
    if (/otp/i.test(lower)) return isBengali ? 'OTP ভেরিফিকেশন' : 'OTP Verification';
    if (/(login|লগইন|password|পাসওয়ার্ড)/i.test(lower)) return isBengali ? 'লগইন / পাসওয়ার্ড' : 'Account & Login';

    const cleaned = text
      .replace(/^["'#*`]+|["'#*`]+$/g, '')
      .replace(/[!?।:;]+$/, '')
      .replace(/^(hello|hi|hey|ভাইয়া|ভাই|দয়া করে|প্লিজ|how to|what is)\s+/i, '')
      .trim();
    if (cleaned.length <= 26) return cleaned.charAt(0).toUpperCase() + cleaned.slice(1);
    const words = cleaned.split(/\s+/);
    if (words.length > 5) return words.slice(0, 5).join(' ') + '...';
    return cleaned.slice(0, 24) + '...';
  }
  return `Chat — ${new Date(conv.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
}

export function groupConversationsByVisitor(rawList: SupportConversation[]): VisitorChatGroup[] {
  if (!rawList || rawList.length === 0) return [];

  // 1. Build guestId -> userId map for any conversations where both are known
  const guestToUserMap = new Map<string, string>();
  rawList.forEach(c => {
    if (c.guestId && c.userId) {
      guestToUserMap.set(c.guestId, c.userId);
    }
  });

  const now = Date.now();
  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);
  const startOfTodayMs = startOfToday.getTime();

  const groupsMap = new Map<string, VisitorChatGroup>();

  rawList.forEach(conv => {
    // Visitor Key Resolution
    const effectiveUserId = conv.userId || (conv.guestId ? guestToUserMap.get(conv.guestId) : undefined);
    const isGuest = !effectiveUserId;
    const visitorKey = effectiveUserId
      ? `user_${effectiveUserId}`
      : conv.guestId
      ? `guest_${conv.guestId}`
      : `anon_${conv.id}`;

    let group = groupsMap.get(visitorKey);
    if (!group) {
      let displayName = 'Guest Visitor';
      if (effectiveUserId) {
        if (conv.userName && !conv.userName.startsWith('Guest') && conv.userName !== 'Visitor') {
          displayName = conv.userName;
        } else if (conv.userEmail) {
          displayName = conv.userEmail.split('@')[0];
        } else {
          displayName = `Member (${effectiveUserId.slice(0, 8)})`;
        }
      } else {
        const shortGid = conv.guestId ? conv.guestId.slice(0, 10) : conv.id.slice(0, 8);
        displayName = `Guest Visitor (${shortGid})`;
      }

      const avatarLetter = isGuest ? 'G' : (displayName[0] || 'U').toUpperCase();

      group = {
        key: visitorKey,
        isGuest,
        userId: effectiveUserId,
        guestId: conv.guestId,
        displayName,
        userEmail: conv.userEmail,
        avatarLetter,
        totalChats: 0,
        unreadAdminCount: 0,
        hasWaitingHuman: false,
        hasHumanHandling: false,
        latestActivityAt: conv.lastMessageAt || conv.updatedAt || conv.createdAt,
        newChats: [],
        oldChats: []
      };
      groupsMap.set(visitorKey, group);
    }

    // Update group-level metadata
    group.totalChats += 1;
    group.unreadAdminCount += conv.unreadAdminCount || 0;
    if (conv.status === 'waiting_human') group.hasWaitingHuman = true;
    if (conv.status === 'human_handling') group.hasHumanHandling = true;
    if (conv.guestId && !group.guestId) group.guestId = conv.guestId;
    if (conv.userEmail && !group.userEmail) group.userEmail = conv.userEmail;
    if (conv.userName && (!group.displayName || group.displayName.startsWith('Member (') || group.displayName.startsWith('Guest') || group.displayName === 'Visitor')) {
      if (!conv.userName.startsWith('Guest') && conv.userName !== 'Visitor') {
        group.displayName = conv.userName;
      }
    }

    // Latest activity timestamp
    const convTime = new Date(conv.lastMessageAt || conv.updatedAt || conv.createdAt).getTime();
    if (convTime > new Date(group.latestActivityAt).getTime()) {
      group.latestActivityAt = conv.lastMessageAt || conv.updatedAt || conv.createdAt;
      if (conv.userEmail && !group.userEmail) group.userEmail = conv.userEmail;
    }

    // Classify into NEW CHAT vs OLD CHAT
    // Deterministic Rule:
    // A conversation is classified as NEW CHAT if:
    // 1. It is currently active / awaiting attention (waiting_human or human_handling), OR
    // 2. Its latest interaction is from Today (since 00:00:00 local time) OR within the past 24 hours.
    // Otherwise, it is classified as OLD CHAT.
    const isNewChat =
      conv.status === 'waiting_human' ||
      conv.status === 'human_handling' ||
      convTime >= startOfTodayMs ||
      (now - convTime) <= 24 * 60 * 60 * 1000;

    if (isNewChat) {
      group.newChats.push(conv);
    } else {
      group.oldChats.push(conv);
    }
  });

  // Sort conversations within each group by latest message descending
  const result: VisitorChatGroup[] = [];
  groupsMap.forEach(grp => {
    grp.newChats.sort((a, b) => new Date(b.lastMessageAt || b.updatedAt).getTime() - new Date(a.lastMessageAt || a.updatedAt).getTime());
    grp.oldChats.sort((a, b) => new Date(b.lastMessageAt || b.updatedAt).getTime() - new Date(a.lastMessageAt || a.updatedAt).getTime());
    result.push(grp);
  });

  // Sort groups:
  // 1. Visitors with waiting_human first (urgent priority)
  // 2. Visitors with human_handling second
  // 3. Otherwise latestActivityAt descending
  result.sort((a, b) => {
    if (a.hasWaitingHuman && !b.hasWaitingHuman) return -1;
    if (!a.hasWaitingHuman && b.hasWaitingHuman) return 1;
    if (a.hasHumanHandling && !b.hasHumanHandling) return -1;
    if (!a.hasHumanHandling && b.hasHumanHandling) return 1;
    return new Date(b.latestActivityAt).getTime() - new Date(a.latestActivityAt).getTime();
  });

  return result;
}
