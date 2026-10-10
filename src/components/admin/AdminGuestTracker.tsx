import React, { useState, useEffect, useMemo } from 'react';
import {
  db,
  collection,
  query,
  orderBy,
  limit,
  onSnapshot,
  where,
  getDocs
} from '../../lib/firebase';
import { GuestProfile, GuestSession } from '../../types';
import { safeApiFetch } from '../../lib/apiClient';
import {
  Users,
  UserCheck,
  Globe,
  Clock,
  ExternalLink,
  Search,
  RefreshCw,
  Eye,
  MessageSquare,
  Download,
  AlertCircle,
  Laptop,
  Smartphone,
  Tablet,
  CheckCircle2,
  Copy,
  Check,
  ChevronRight,
  Filter,
  Activity,
  ArrowRight,
  Sparkles,
  X,
  SlidersHorizontal,
  RotateCcw,
  Calendar,
  FileText,
  Hash,
  Mail,
  User,
  Phone
} from 'lucide-react';

export const AdminGuestTracker: React.FC = () => {
  const [guests, setGuests] = useState<GuestProfile[]>([]);
  const [sessions, setSessions] = useState<GuestSession[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Quick search and status tab
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'linked' | 'has_chats' | 'has_downloads'>('all');

  // Advanced Search & Filter States
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
  const [filterGuestId, setFilterGuestId] = useState('');
  const [filterUserId, setFilterUserId] = useState('');
  const [filterEmail, setFilterEmail] = useState('');
  const [filterPhone, setFilterPhone] = useState('');
  const [filterName, setFilterName] = useState('');
  const [filterConversationId, setFilterConversationId] = useState('');
  const [filterReportId, setFilterReportId] = useState('');
  const [filterDateFrom, setFilterDateFrom] = useState('');
  const [filterDateTo, setFilterDateTo] = useState('');
  const [filterMinSessions, setFilterMinSessions] = useState('');
  const [filterMinMessages, setFilterMinMessages] = useState('');
  const [filterMinPageViews, setFilterMinPageViews] = useState('');
  const [filterDeviceType, setFilterDeviceType] = useState('all');
  const [filterBrowser, setFilterBrowser] = useState('all');
  const [filterOS, setFilterOS] = useState('all');
  const [sortBy, setSortBy] = useState<string>('lastActive_desc');

  // Cached Support Conversations & Reports for Deep Link Search
  const [supportConversations, setSupportConversations] = useState<any[]>([]);
  const [supportReports, setSupportReports] = useState<any[]>([]);

  // Selected Guest & Inspection Details
  const [selectedGuest, setSelectedGuest] = useState<GuestProfile | null>(null);
  const [inspectorTab, setInspectorTab] = useState<'overview' | 'sessions' | 'support'>('overview');
  const [selectedGuestSessions, setSelectedGuestSessions] = useState<GuestSession[]>([]);
  const [selectedGuestConversations, setSelectedGuestConversations] = useState<any[]>([]);
  const [selectedGuestReports, setSelectedGuestReports] = useState<any[]>([]);
  const [isLoadingGuestSessions, setIsLoadingGuestSessions] = useState(false);
  const [isLoadingSupportData, setIsLoadingSupportData] = useState(false);

  // Real-time listener for guest profiles & sessions
  useEffect(() => {
    setIsLoading(true);
    const qGuests = query(
      collection(db, 'guestProfiles'),
      orderBy('lastActiveAt', 'desc'),
      limit(150)
    );

    const unsubGuests = onSnapshot(
      qGuests,
      snapshot => {
        const list: GuestProfile[] = [];
        snapshot.forEach(docSnap => {
          list.push({ id: docSnap.id, ...(docSnap.data() as any) });
        });
        setGuests(list);
        setIsLoading(false);
      },
      err => {
        console.warn('[AdminGuestTracker] guestProfiles snapshot warning:', err);
        setIsLoading(false);
      }
    );

    const qSessions = query(
      collection(db, 'guestSessions'),
      orderBy('lastActiveAt', 'desc'),
      limit(100)
    );

    const unsubSessions = onSnapshot(
      qSessions,
      snapshot => {
        const list: GuestSession[] = [];
        snapshot.forEach(docSnap => {
          list.push({ id: docSnap.id, ...(docSnap.data() as any) });
        });
        setSessions(list);
      },
      err => {
        console.warn('[AdminGuestTracker] guestSessions snapshot warning:', err);
      }
    );

    // Also fetch support conversations & reports for cross-linking search
    safeApiFetch('/api/admin/support/conversations').then(res => {
      if (res.ok && res.data?.conversations) {
        setSupportConversations(res.data.conversations);
      }
    }).catch(() => {});

    safeApiFetch('/api/admin/support/reports').then(res => {
      if (res.ok && res.data?.reports) {
        setSupportReports(res.data.reports);
      }
    }).catch(() => {});

    return () => {
      unsubGuests();
      unsubSessions();
    };
  }, []);

  // Fetch full sessions, conversations, and reports for the inspected guest
  const inspectGuest = async (guest: GuestProfile) => {
    setSelectedGuest(guest);
    setIsLoadingGuestSessions(true);
    setIsLoadingSupportData(true);

    const effectiveGuestId = guest.guestId || guest.id;
    const effectiveUserId = guest.linkedUserId;

    // 1. Fetch sessions from Firestore
    try {
      const q = query(
        collection(db, 'guestSessions'),
        where('guestId', '==', effectiveGuestId),
        limit(50)
      );
      const snap = await getDocs(q);
      const sessionList: GuestSession[] = [];
      snap.forEach(d => {
        sessionList.push({ id: d.id, ...(d.data() as any) });
      });
      sessionList.sort((a, b) => new Date(b.startedAt).getTime() - new Date(a.startedAt).getTime());
      setSelectedGuestSessions(sessionList);
    } catch (err) {
      console.warn('[AdminGuestTracker] Error fetching guest sessions:', err);
    } finally {
      setIsLoadingGuestSessions(false);
    }

    // 2. Fetch Support Conversations for this Guest / Linked User
    try {
      const convRes = await safeApiFetch(
        `/api/support/conversations?guestId=${encodeURIComponent(effectiveGuestId)}${
          effectiveUserId ? `&userId=${encodeURIComponent(effectiveUserId)}` : ''
        }`
      );
      if (convRes.ok && convRes.data?.conversations) {
        setSelectedGuestConversations(convRes.data.conversations);
      } else {
        setSelectedGuestConversations([]);
      }
    } catch {
      setSelectedGuestConversations([]);
    }

    // 3. Fetch Support Reports for this Guest / Linked User
    try {
      const repRes = await safeApiFetch(
        `/api/admin/support/reports?guestId=${encodeURIComponent(effectiveGuestId)}${
          effectiveUserId ? `&userId=${encodeURIComponent(effectiveUserId)}` : ''
        }`
      );
      if (repRes.ok && repRes.data?.reports) {
        setSelectedGuestReports(repRes.data.reports);
      } else {
        setSelectedGuestReports([]);
      }
    } catch {
      setSelectedGuestReports([]);
    } finally {
      setIsLoadingSupportData(false);
    }
  };

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  // Reset all filters
  const resetFilters = () => {
    setSearchQuery('');
    setStatusFilter('all');
    setFilterGuestId('');
    setFilterUserId('');
    setFilterEmail('');
    setFilterPhone('');
    setFilterName('');
    setFilterConversationId('');
    setFilterReportId('');
    setFilterDateFrom('');
    setFilterDateTo('');
    setFilterMinSessions('');
    setFilterMinMessages('');
    setFilterMinPageViews('');
    setFilterDeviceType('all');
    setFilterBrowser('all');
    setFilterOS('all');
    setSortBy('lastActive_desc');
  };

  // Count active advanced filters
  const activeAdvancedFilterCount = useMemo(() => {
    let count = 0;
    if (filterGuestId.trim()) count++;
    if (filterUserId.trim()) count++;
    if (filterEmail.trim()) count++;
    if (filterPhone.trim()) count++;
    if (filterName.trim()) count++;
    if (filterConversationId.trim()) count++;
    if (filterReportId.trim()) count++;
    if (filterDateFrom.trim()) count++;
    if (filterDateTo.trim()) count++;
    if (filterMinSessions.trim()) count++;
    if (filterMinMessages.trim()) count++;
    if (filterMinPageViews.trim()) count++;
    if (filterDeviceType !== 'all') count++;
    if (filterBrowser !== 'all') count++;
    if (filterOS !== 'all') count++;
    return count;
  }, [
    filterGuestId,
    filterUserId,
    filterEmail,
    filterPhone,
    filterName,
    filterConversationId,
    filterReportId,
    filterDateFrom,
    filterDateTo,
    filterMinSessions,
    filterMinMessages,
    filterMinPageViews,
    filterDeviceType,
    filterBrowser,
    filterOS
  ]);

  // Map of conversation ID and report ID to guest IDs for deep search
  const convIdToGuestIdMap = useMemo(() => {
    const map = new Map<string, Set<string>>();
    supportConversations.forEach(c => {
      const gId = c.guestId || c.userId;
      if (gId) {
        if (!map.has(c.id.toLowerCase())) {
          map.set(c.id.toLowerCase(), new Set());
        }
        map.get(c.id.toLowerCase())!.add(gId);
      }
    });
    return map;
  }, [supportConversations]);

  const reportIdToGuestIdMap = useMemo(() => {
    const map = new Map<string, Set<string>>();
    supportReports.forEach(r => {
      const gId = r.guestId || r.userId;
      if (gId) {
        if (!map.has(r.id.toLowerCase())) {
          map.set(r.id.toLowerCase(), new Set());
        }
        map.get(r.id.toLowerCase())!.add(gId);
      }
    });
    return map;
  }, [supportReports]);

  // Filtered & Sorted list of guests
  const filteredGuests = useMemo(() => {
    return guests
      .filter(g => {
        const guestFullId = (g.guestId || g.id || '').toLowerCase();
        const linkedUid = (g.linkedUserId || '').toLowerCase();
        const linkedEmail = (g.linkedUserEmail || '').toLowerCase();
        const browserStr = (g.browser || '').toLowerCase();
        const deviceStr = (g.device || '').toLowerCase();
        const osStr = (g.os || '').toLowerCase();
        const landingStr = (g.currentLandingPage || g.initialLandingPage || '').toLowerCase();

        // 1. Quick Global Search Query
        if (searchQuery.trim()) {
          const q = searchQuery.toLowerCase().trim();
          const matchesGlobal =
            guestFullId.includes(q) ||
            linkedUid.includes(q) ||
            linkedEmail.includes(q) ||
            browserStr.includes(q) ||
            deviceStr.includes(q) ||
            osStr.includes(q) ||
            landingStr.includes(q);
          if (!matchesGlobal) return false;
        }

        // 2. Status Filter
        if (statusFilter === 'active') {
          if (g.status === 'linked' || g.linkedUserId) return false;
        } else if (statusFilter === 'linked') {
          if (g.status !== 'linked' && !g.linkedUserId) return false;
        } else if (statusFilter === 'has_chats') {
          if ((g.chatMessagesCount || 0) <= 0) return false;
        } else if (statusFilter === 'has_downloads') {
          if ((g.downloadsCount || 0) <= 0) return false;
        }

        // 3. Specific Advanced Filters
        if (filterGuestId.trim()) {
          if (!guestFullId.includes(filterGuestId.toLowerCase().trim())) return false;
        }
        if (filterUserId.trim()) {
          if (!linkedUid.includes(filterUserId.toLowerCase().trim())) return false;
        }
        if (filterEmail.trim()) {
          if (!linkedEmail.includes(filterEmail.toLowerCase().trim())) return false;
        }
        if (filterName.trim()) {
          const nameQ = filterName.toLowerCase().trim();
          const hasMatchingNameInConv = supportConversations.some(
            c => (c.guestId === g.guestId || c.userId === g.linkedUserId) && c.userName?.toLowerCase().includes(nameQ)
          );
          if (!hasMatchingNameInConv && !linkedEmail.includes(nameQ)) return false;
        }
        if (filterPhone.trim()) {
          const phoneQ = filterPhone.toLowerCase().trim();
          const hasMatchingPhoneInConv = supportConversations.some(
            c => (c.guestId === g.guestId || c.userId === g.linkedUserId) && c.userPhone?.toLowerCase().includes(phoneQ)
          );
          if (!hasMatchingPhoneInConv) return false;
        }
        if (filterConversationId.trim()) {
          const cid = filterConversationId.toLowerCase().trim();
          const matchingGuests = convIdToGuestIdMap.get(cid);
          if (!matchingGuests || (!matchingGuests.has(g.guestId) && !matchingGuests.has(g.linkedUserId || ''))) {
            // Check substring match
            const hasSubMatch = supportConversations.some(
              c => c.id.toLowerCase().includes(cid) && (c.guestId === g.guestId || c.userId === g.linkedUserId)
            );
            if (!hasSubMatch) return false;
          }
        }
        if (filterReportId.trim()) {
          const rid = filterReportId.toLowerCase().trim();
          const matchingGuests = reportIdToGuestIdMap.get(rid);
          if (!matchingGuests || (!matchingGuests.has(g.guestId) && !matchingGuests.has(g.linkedUserId || ''))) {
            const hasSubMatch = supportReports.some(
              r => r.id.toLowerCase().includes(rid) && (r.guestId === g.guestId || r.userId === g.linkedUserId)
            );
            if (!hasSubMatch) return false;
          }
        }

        // 4. Date Range Filters
        if (filterDateFrom.trim()) {
          const fromTime = new Date(filterDateFrom).getTime();
          const guestTime = new Date(g.lastActiveAt || g.createdAt).getTime();
          if (guestTime < fromTime) return false;
        }
        if (filterDateTo.trim()) {
          const toTime = new Date(filterDateTo + 'T23:59:59').getTime();
          const guestTime = new Date(g.createdAt).getTime();
          if (guestTime > toTime) return false;
        }

        // 5. Quantitative Metric Thresholds
        if (filterMinSessions.trim()) {
          const minS = parseInt(filterMinSessions, 10);
          if (!isNaN(minS) && (g.sessionCount || 1) < minS) return false;
        }
        if (filterMinMessages.trim()) {
          const minM = parseInt(filterMinMessages, 10);
          if (!isNaN(minM) && (g.chatMessagesCount || 0) < minM) return false;
        }
        if (filterMinPageViews.trim()) {
          const minP = parseInt(filterMinPageViews, 10);
          if (!isNaN(minP) && (g.pageViewsCount || 1) < minP) return false;
        }

        // 6. Device, Browser, and OS Filters
        if (filterDeviceType !== 'all') {
          const dev = (g.device || '').toLowerCase();
          if (filterDeviceType === 'mobile' && !dev.includes('mobile') && !dev.includes('phone') && !dev.includes('android') && !dev.includes('ios')) return false;
          if (filterDeviceType === 'tablet' && !dev.includes('tablet') && !dev.includes('ipad')) return false;
          if (filterDeviceType === 'desktop' && (dev.includes('mobile') || dev.includes('phone') || dev.includes('tablet') || dev.includes('ipad'))) return false;
        }
        if (filterBrowser !== 'all') {
          if (!browserStr.includes(filterBrowser.toLowerCase())) return false;
        }
        if (filterOS !== 'all') {
          if (!osStr.includes(filterOS.toLowerCase())) return false;
        }

        return true;
      })
      .sort((a, b) => {
        switch (sortBy) {
          case 'lastActive_asc':
            return new Date(a.lastActiveAt).getTime() - new Date(b.lastActiveAt).getTime();
          case 'firstVisit_desc':
            return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
          case 'firstVisit_asc':
            return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
          case 'sessions_desc':
            return (b.sessionCount || 1) - (a.sessionCount || 1);
          case 'messages_desc':
            return (b.chatMessagesCount || 0) - (a.chatMessagesCount || 0);
          case 'pageViews_desc':
            return (b.pageViewsCount || 1) - (a.pageViewsCount || 1);
          case 'downloads_desc':
            return (b.downloadsCount || 0) - (a.downloadsCount || 0);
          case 'lastActive_desc':
          default:
            return new Date(b.lastActiveAt).getTime() - new Date(a.lastActiveAt).getTime();
        }
      });
  }, [
    guests,
    searchQuery,
    statusFilter,
    filterGuestId,
    filterUserId,
    filterEmail,
    filterName,
    filterPhone,
    filterConversationId,
    filterReportId,
    filterDateFrom,
    filterDateTo,
    filterMinSessions,
    filterMinMessages,
    filterMinPageViews,
    filterDeviceType,
    filterBrowser,
    filterOS,
    sortBy,
    convIdToGuestIdMap,
    reportIdToGuestIdMap,
    supportConversations,
    supportReports
  ]);

  // High-level summary KPIs
  const totalGuests = guests.length;
  const linkedGuests = guests.filter(g => g.status === 'linked' || g.linkedUserId).length;
  const conversionRate = totalGuests > 0 ? ((linkedGuests / totalGuests) * 100).toFixed(1) : '0.0';
  const totalPageViews = guests.reduce((sum, g) => sum + (g.pageViewsCount || 0), 0);
  const totalDownloads = guests.reduce((sum, g) => sum + (g.downloadsCount || 0), 0);
  const totalChats = guests.reduce((sum, g) => sum + (g.chatMessagesCount || 0), 0);

  const getDeviceIcon = (deviceStr?: string) => {
    if (!deviceStr) return <Laptop className="w-4 h-4 text-slate-400" />;
    const d = deviceStr.toLowerCase();
    if (d.includes('mobile') || d.includes('phone') || d.includes('android') || d.includes('ios')) {
      return <Smartphone className="w-4 h-4 text-amber-400" />;
    }
    if (d.includes('tablet') || d.includes('ipad')) {
      return <Tablet className="w-4 h-4 text-purple-400" />;
    }
    return <Laptop className="w-4 h-4 text-[#5DE2E7]" />;
  };

  const formatRelativeTime = (isoString?: string) => {
    if (!isoString) return 'Unknown';
    try {
      const diffMs = Date.now() - new Date(isoString).getTime();
      const diffSecs = Math.floor(diffMs / 1000);
      if (diffSecs < 60) return 'Just now';
      const diffMins = Math.floor(diffSecs / 60);
      if (diffMins < 60) return `${diffMins}m ago`;
      const diffHours = Math.floor(diffMins / 60);
      if (diffHours < 24) return `${diffHours}h ago`;
      const diffDays = Math.floor(diffHours / 24);
      return `${diffDays}d ago`;
    } catch {
      return isoString.split('T')[0];
    }
  };

  return (
    <div className="space-y-6">
      {/* Header & Controls */}
      <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 p-5 rounded-2xl bg-slate-900/90 border border-[#5DE2E7]/30">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-2 rounded-xl bg-[#133E87]/60 border border-[#5DE2E7]/40 text-[#5DE2E7]">
              <Globe className="w-5 h-5" />
            </span>
            <div>
              <h2 className="text-lg font-black text-white flex items-center gap-2">
                Visitor Tracking & Guest Profiles
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                  Live Sync
                </span>
              </h2>
              <p className="text-xs text-slate-400">
                Track anonymous website visitors, AI Support journeys, activity funnels, and account link conversions
              </p>
            </div>
          </div>
        </div>

        {/* Search & Filter Bar */}
        <div className="flex flex-wrap items-center gap-2 w-full lg:w-auto">
          <div className="relative flex-1 sm:w-64">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Quick search ID, email, OS, path..."
              className="w-full pl-9 pr-3 py-2 rounded-xl bg-slate-950/80 border border-white/15 text-white text-xs placeholder-slate-500 focus:outline-none focus:border-[#5DE2E7]"
            />
          </div>

          <div className="flex items-center gap-1.5 overflow-x-auto">
            <button
              onClick={() => setStatusFilter('all')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition whitespace-nowrap ${
                statusFilter === 'all'
                  ? 'bg-gradient-to-r from-[#133E87] to-cyan-500 text-white'
                  : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
              }`}
            >
              All ({guests.length})
            </button>
            <button
              onClick={() => setStatusFilter('active')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition whitespace-nowrap ${
                statusFilter === 'active'
                  ? 'bg-gradient-to-r from-[#133E87] to-cyan-500 text-white'
                  : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
              }`}
            >
              Anonymous ({guests.filter(g => g.status !== 'linked' && !g.linkedUserId).length})
            </button>
            <button
              onClick={() => setStatusFilter('linked')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition whitespace-nowrap flex items-center gap-1 ${
                statusFilter === 'linked'
                  ? 'bg-gradient-to-r from-emerald-600 to-teal-500 text-white'
                  : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
              }`}
            >
              <UserCheck className="w-3 h-3 text-emerald-400" /> Linked ({linkedGuests})
            </button>

            <button
              onClick={() => setShowAdvancedFilters(prev => !prev)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition whitespace-nowrap ${
                showAdvancedFilters || activeAdvancedFilterCount > 0
                  ? 'bg-[#5DE2E7] text-slate-950 shadow-md shadow-[#5DE2E7]/20 font-black'
                  : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
              }`}
            >
              <SlidersHorizontal className="w-3.5 h-3.5" />
              <span>Filters</span>
              {activeAdvancedFilterCount > 0 && (
                <span className="w-4 h-4 rounded-full bg-slate-950 text-[#5DE2E7] text-[10px] flex items-center justify-center font-bold">
                  {activeAdvancedFilterCount}
                </span>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Advanced Filters Expandable Panel */}
      {showAdvancedFilters && (
        <div className="p-5 rounded-2xl bg-slate-900/95 border border-[#5DE2E7]/40 shadow-xl space-y-4 animate-in fade-in duration-200">
          <div className="flex items-center justify-between border-b border-white/10 pb-3">
            <h3 className="text-xs font-black uppercase tracking-wider text-[#5DE2E7] flex items-center gap-2">
              <Filter className="w-4 h-4" /> Multi-Field Visitor & Journey Query Matrix
            </h3>
            <button
              onClick={resetFilters}
              className="text-xs text-slate-400 hover:text-white flex items-center gap-1 transition"
            >
              <RotateCcw className="w-3 h-3" /> Reset All Filters
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 text-xs">
            {/* Guest ID */}
            <div>
              <label className="text-[11px] font-semibold text-slate-400 block mb-1 flex items-center gap-1">
                <Hash className="w-3 h-3 text-[#5DE2E7]" /> Guest ID
              </label>
              <input
                type="text"
                value={filterGuestId}
                onChange={e => setFilterGuestId(e.target.value)}
                placeholder="e.g. gst_172..."
                className="w-full px-3 py-1.5 rounded-lg bg-slate-950 border border-white/15 text-white placeholder-slate-600 focus:outline-none focus:border-[#5DE2E7]"
              />
            </div>

            {/* User ID */}
            <div>
              <label className="text-[11px] font-semibold text-slate-400 block mb-1 flex items-center gap-1">
                <User className="w-3 h-3 text-emerald-400" /> User UID
              </label>
              <input
                type="text"
                value={filterUserId}
                onChange={e => setFilterUserId(e.target.value)}
                placeholder="Linked User UID"
                className="w-full px-3 py-1.5 rounded-lg bg-slate-950 border border-white/15 text-white placeholder-slate-600 focus:outline-none focus:border-[#5DE2E7]"
              />
            </div>

            {/* Email */}
            <div>
              <label className="text-[11px] font-semibold text-slate-400 block mb-1 flex items-center gap-1">
                <Mail className="w-3 h-3 text-blue-400" /> Email
              </label>
              <input
                type="text"
                value={filterEmail}
                onChange={e => setFilterEmail(e.target.value)}
                placeholder="Linked User Email"
                className="w-full px-3 py-1.5 rounded-lg bg-slate-950 border border-white/15 text-white placeholder-slate-600 focus:outline-none focus:border-[#5DE2E7]"
              />
            </div>

            {/* Name / Phone */}
            <div>
              <label className="text-[11px] font-semibold text-slate-400 block mb-1 flex items-center gap-1">
                <User className="w-3 h-3 text-amber-400" /> Name / Phone
              </label>
              <div className="grid grid-cols-2 gap-1.5">
                <input
                  type="text"
                  value={filterName}
                  onChange={e => setFilterName(e.target.value)}
                  placeholder="Name"
                  className="w-full px-2 py-1.5 rounded-lg bg-slate-950 border border-white/15 text-white placeholder-slate-600 focus:outline-none focus:border-[#5DE2E7]"
                />
                <input
                  type="text"
                  value={filterPhone}
                  onChange={e => setFilterPhone(e.target.value)}
                  placeholder="Phone"
                  className="w-full px-2 py-1.5 rounded-lg bg-slate-950 border border-white/15 text-white placeholder-slate-600 focus:outline-none focus:border-[#5DE2E7]"
                />
              </div>
            </div>

            {/* Conversation ID */}
            <div>
              <label className="text-[11px] font-semibold text-slate-400 block mb-1 flex items-center gap-1">
                <MessageSquare className="w-3 h-3 text-purple-400" /> Support Conversation ID
              </label>
              <input
                type="text"
                value={filterConversationId}
                onChange={e => setFilterConversationId(e.target.value)}
                placeholder="conv_..."
                className="w-full px-3 py-1.5 rounded-lg bg-slate-950 border border-white/15 text-white placeholder-slate-600 focus:outline-none focus:border-[#5DE2E7]"
              />
            </div>

            {/* Report ID */}
            <div>
              <label className="text-[11px] font-semibold text-slate-400 block mb-1 flex items-center gap-1">
                <FileText className="w-3 h-3 text-amber-400" /> Support Report ID
              </label>
              <input
                type="text"
                value={filterReportId}
                onChange={e => setFilterReportId(e.target.value)}
                placeholder="R-1001..."
                className="w-full px-3 py-1.5 rounded-lg bg-slate-950 border border-white/15 text-white placeholder-slate-600 focus:outline-none focus:border-[#5DE2E7]"
              />
            </div>

            {/* Date Range: From / To */}
            <div>
              <label className="text-[11px] font-semibold text-slate-400 block mb-1 flex items-center gap-1">
                <Calendar className="w-3 h-3 text-teal-400" /> Date Range (From - To)
              </label>
              <div className="grid grid-cols-2 gap-1.5">
                <input
                  type="date"
                  value={filterDateFrom}
                  onChange={e => setFilterDateFrom(e.target.value)}
                  className="w-full px-2 py-1.5 rounded-lg bg-slate-950 border border-white/15 text-white focus:outline-none focus:border-[#5DE2E7]"
                />
                <input
                  type="date"
                  value={filterDateTo}
                  onChange={e => setFilterDateTo(e.target.value)}
                  className="w-full px-2 py-1.5 rounded-lg bg-slate-950 border border-white/15 text-white focus:outline-none focus:border-[#5DE2E7]"
                />
              </div>
            </div>

            {/* Metrics Thresholds: Sessions / Messages / Views */}
            <div>
              <label className="text-[11px] font-semibold text-slate-400 block mb-1 flex items-center gap-1">
                <Activity className="w-3 h-3 text-cyan-400" /> Min Sessions / Chats / Views
              </label>
              <div className="grid grid-cols-3 gap-1">
                <input
                  type="number"
                  min="0"
                  value={filterMinSessions}
                  onChange={e => setFilterMinSessions(e.target.value)}
                  placeholder="Sess ≥"
                  className="w-full px-1.5 py-1.5 rounded-lg bg-slate-950 border border-white/15 text-white text-[11px] placeholder-slate-600 focus:outline-none focus:border-[#5DE2E7]"
                />
                <input
                  type="number"
                  min="0"
                  value={filterMinMessages}
                  onChange={e => setFilterMinMessages(e.target.value)}
                  placeholder="Chats ≥"
                  className="w-full px-1.5 py-1.5 rounded-lg bg-slate-950 border border-white/15 text-white text-[11px] placeholder-slate-600 focus:outline-none focus:border-[#5DE2E7]"
                />
                <input
                  type="number"
                  min="0"
                  value={filterMinPageViews}
                  onChange={e => setFilterMinPageViews(e.target.value)}
                  placeholder="Views ≥"
                  className="w-full px-1.5 py-1.5 rounded-lg bg-slate-950 border border-white/15 text-white text-[11px] placeholder-slate-600 focus:outline-none focus:border-[#5DE2E7]"
                />
              </div>
            </div>

            {/* Device Type */}
            <div>
              <label className="text-[11px] font-semibold text-slate-400 block mb-1">Device Type</label>
              <select
                value={filterDeviceType}
                onChange={e => setFilterDeviceType(e.target.value)}
                className="w-full px-3 py-1.5 rounded-lg bg-slate-950 border border-white/15 text-white focus:outline-none focus:border-[#5DE2E7]"
              >
                <option value="all">All Devices</option>
                <option value="desktop">Desktop</option>
                <option value="mobile">Mobile (Phone)</option>
                <option value="tablet">Tablet</option>
              </select>
            </div>

            {/* Browser */}
            <div>
              <label className="text-[11px] font-semibold text-slate-400 block mb-1">Browser</label>
              <select
                value={filterBrowser}
                onChange={e => setFilterBrowser(e.target.value)}
                className="w-full px-3 py-1.5 rounded-lg bg-slate-950 border border-white/15 text-white focus:outline-none focus:border-[#5DE2E7]"
              >
                <option value="all">All Browsers</option>
                <option value="Chrome">Chrome</option>
                <option value="Firefox">Firefox</option>
                <option value="Safari">Safari</option>
                <option value="Edge">Edge</option>
                <option value="Opera">Opera</option>
              </select>
            </div>

            {/* OS */}
            <div>
              <label className="text-[11px] font-semibold text-slate-400 block mb-1">Operating System</label>
              <select
                value={filterOS}
                onChange={e => setFilterOS(e.target.value)}
                className="w-full px-3 py-1.5 rounded-lg bg-slate-950 border border-white/15 text-white focus:outline-none focus:border-[#5DE2E7]"
              >
                <option value="all">All OS</option>
                <option value="Windows">Windows</option>
                <option value="Android">Android</option>
                <option value="macOS">macOS</option>
                <option value="iOS">iOS</option>
                <option value="Linux">Linux</option>
              </select>
            </div>

            {/* Sort Options */}
            <div>
              <label className="text-[11px] font-semibold text-slate-400 block mb-1">Sort Results By</label>
              <select
                value={sortBy}
                onChange={e => setSortBy(e.target.value)}
                className="w-full px-3 py-1.5 rounded-lg bg-slate-950 border border-white/15 text-white font-medium focus:outline-none focus:border-[#5DE2E7]"
              >
                <option value="lastActive_desc">Last Active (Newest First)</option>
                <option value="lastActive_asc">Last Active (Oldest First)</option>
                <option value="firstVisit_desc">First Visit (Newest First)</option>
                <option value="firstVisit_asc">First Visit (Oldest First)</option>
                <option value="sessions_desc">Most Sessions</option>
                <option value="messages_desc">Most Support Messages</option>
                <option value="pageViews_desc">Most Page Views</option>
                <option value="downloads_desc">Most Downloads</option>
              </select>
            </div>
          </div>
        </div>
      )}

      {/* KPI Stats Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-4">
        <div className="p-4 rounded-2xl bg-slate-950/80 border border-white/10">
          <div className="flex items-center justify-between text-slate-400 text-xs mb-1">
            <span>Total Visitors</span>
            <Users className="w-4 h-4 text-[#5DE2E7]" />
          </div>
          <div className="text-2xl font-black text-white">{totalGuests}</div>
          <div className="text-[10px] text-cyan-400 mt-1">Unique Guest IDs</div>
        </div>

        <div className="p-4 rounded-2xl bg-slate-950/80 border border-white/10">
          <div className="flex items-center justify-between text-slate-400 text-xs mb-1">
            <span>Linked Accounts</span>
            <UserCheck className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-2xl font-black text-emerald-400">{linkedGuests}</div>
          <div className="text-[10px] text-emerald-300/80 mt-1">{conversionRate}% Conversion</div>
        </div>

        <div className="p-4 rounded-2xl bg-slate-950/80 border border-white/10">
          <div className="flex items-center justify-between text-slate-400 text-xs mb-1">
            <span>Total Page Views</span>
            <Eye className="w-4 h-4 text-blue-400" />
          </div>
          <div className="text-2xl font-black text-white">{totalPageViews.toLocaleString()}</div>
          <div className="text-[10px] text-slate-400 mt-1">Across all journeys</div>
        </div>

        <div className="p-4 rounded-2xl bg-slate-950/80 border border-white/10">
          <div className="flex items-center justify-between text-slate-400 text-xs mb-1">
            <span>Support Chats</span>
            <MessageSquare className="w-4 h-4 text-purple-400" />
          </div>
          <div className="text-2xl font-black text-white">{totalChats}</div>
          <div className="text-[10px] text-purple-300 mt-1">AI & Admin interactions</div>
        </div>

        <div className="p-4 rounded-2xl bg-slate-950/80 border border-white/10">
          <div className="flex items-center justify-between text-slate-400 text-xs mb-1">
            <span>Guest Downloads</span>
            <Download className="w-4 h-4 text-amber-400" />
          </div>
          <div className="text-2xl font-black text-white">{totalDownloads}</div>
          <div className="text-[10px] text-amber-300 mt-1">Resource engagement</div>
        </div>

        <div className="p-4 rounded-2xl bg-slate-950/80 border border-white/10">
          <div className="flex items-center justify-between text-slate-400 text-xs mb-1">
            <span>Active Sessions</span>
            <Activity className="w-4 h-4 text-teal-400" />
          </div>
          <div className="text-2xl font-black text-white">{sessions.length}</div>
          <div className="text-[10px] text-teal-300 mt-1">Recent session logs</div>
        </div>
      </div>

      {/* Main Content Area: Guest Table & Inspection Panel */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* Visitors Table (2 cols on xl) */}
        <div className="xl:col-span-2 space-y-4">
          <div className="p-4 sm:p-5 rounded-2xl bg-slate-950/90 border border-white/10 overflow-hidden">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Users className="w-4 h-4 text-[#5DE2E7]" />
                Visitor Profiles ({filteredGuests.length} of {guests.length})
              </h3>
              <span className="text-xs text-slate-400">
                Sorted: {sortBy.replace('_', ' ').toUpperCase()}
              </span>
            </div>

            {isLoading ? (
              <div className="p-12 text-center text-slate-400 text-xs">
                Loading visitor tracking data...
              </div>
            ) : filteredGuests.length === 0 ? (
              <div className="p-12 text-center text-slate-400 text-xs space-y-2">
                <p>No visitor records match your active search filters.</p>
                <button
                  onClick={resetFilters}
                  className="px-3 py-1.5 rounded-lg bg-slate-800 text-[#5DE2E7] hover:bg-slate-700 text-xs font-semibold"
                >
                  Clear All Filters
                </button>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs text-slate-300">
                  <thead className="bg-slate-900/90 text-slate-400 font-bold border-b border-white/10 uppercase tracking-wider text-[10px]">
                    <tr>
                      <th className="py-3 px-3">Guest ID</th>
                      <th className="py-3 px-3">Status / Linking</th>
                      <th className="py-3 px-3">Device & Browser</th>
                      <th className="py-3 px-3">Landing / Path</th>
                      <th className="py-3 px-3">Interactions</th>
                      <th className="py-3 px-3">Last Active</th>
                      <th className="py-3 px-3 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {filteredGuests.map(guest => {
                      const isLinked = guest.status === 'linked' || Boolean(guest.linkedUserId);
                      const isSelected = selectedGuest?.id === guest.id;

                      return (
                        <tr
                          key={guest.id}
                          onClick={() => inspectGuest(guest)}
                          className={`hover:bg-white/5 transition cursor-pointer ${
                            isSelected ? 'bg-[#133E87]/30 border-l-2 border-[#5DE2E7]' : ''
                          }`}
                        >
                          {/* Guest ID */}
                          <td className="py-3 px-3">
                            <div className="flex items-center gap-1.5">
                              <span className="font-mono font-semibold text-white">
                                {guest.guestId ? guest.guestId.slice(0, 14) + '...' : guest.id.slice(0, 14)}
                              </span>
                              <button
                                type="button"
                                onClick={e => {
                                  e.stopPropagation();
                                  copyToClipboard(guest.guestId || guest.id, guest.id);
                                }}
                                className="text-slate-500 hover:text-[#5DE2E7] transition p-0.5"
                                title="Copy full Guest ID"
                              >
                                {copiedId === guest.id ? (
                                  <Check className="w-3 h-3 text-emerald-400" />
                                ) : (
                                  <Copy className="w-3 h-3" />
                                )}
                              </button>
                            </div>
                            <div className="text-[10px] text-slate-500">
                              {guest.sessionCount || 1} session{(guest.sessionCount || 1) > 1 ? 's' : ''}
                            </div>
                          </td>

                          {/* Status / Linking */}
                          <td className="py-3 px-3">
                            {isLinked ? (
                              <div className="inline-flex flex-col">
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                                  <UserCheck className="w-3 h-3" /> Linked
                                </span>
                                {guest.linkedUserEmail && (
                                  <span className="text-[10px] text-slate-400 truncate max-w-[120px] mt-0.5" title={guest.linkedUserEmail}>
                                    {guest.linkedUserEmail}
                                  </span>
                                )}
                              </div>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-slate-800 text-slate-300 border border-white/10">
                                Anonymous
                              </span>
                            )}
                          </td>

                          {/* Device & Browser */}
                          <td className="py-3 px-3">
                            <div className="flex items-center gap-1.5">
                              {getDeviceIcon(guest.device)}
                              <span className="font-medium text-slate-200">
                                {guest.browser || 'Web Browser'}
                              </span>
                            </div>
                            <div className="text-[10px] text-slate-400">
                              {guest.os || 'Unknown OS'} • {guest.screenResolution || ''}
                            </div>
                          </td>

                          {/* Landing / Current Page */}
                          <td className="py-3 px-3 max-w-[140px] truncate">
                            <div className="text-slate-200 font-mono text-[11px] truncate" title={guest.currentLandingPage || guest.initialLandingPage}>
                              {guest.currentLandingPage || guest.initialLandingPage || '/'}
                            </div>
                            <div className="text-[10px] text-slate-500 flex items-center gap-1">
                              <span>Ref:</span>
                              <span className="truncate max-w-[80px]" title={guest.referrer}>
                                {guest.referrer === 'direct' ? 'Direct' : guest.referrer || 'direct'}
                              </span>
                            </div>
                          </td>

                          {/* Interactions */}
                          <td className="py-3 px-3">
                            <div className="flex items-center gap-2">
                              <span
                                className={`flex items-center gap-1 text-[11px] ${
                                  (guest.chatMessagesCount || 0) > 0 ? 'text-purple-400 font-bold' : 'text-slate-500'
                                }`}
                                title="Support chat messages"
                              >
                                <MessageSquare className="w-3 h-3" />
                                {guest.chatMessagesCount || 0}
                              </span>
                              <span
                                className={`flex items-center gap-1 text-[11px] ${
                                  (guest.downloadsCount || 0) > 0 ? 'text-amber-400 font-bold' : 'text-slate-500'
                                }`}
                                title="Downloads recorded"
                              >
                                <Download className="w-3 h-3" />
                                {guest.downloadsCount || 0}
                              </span>
                            </div>
                            <div className="text-[10px] text-slate-400 mt-0.5">
                              {guest.pageViewsCount || 1} views
                            </div>
                          </td>

                          {/* Last Active */}
                          <td className="py-3 px-3 text-slate-400 text-[11px] whitespace-nowrap">
                            <div className="flex items-center gap-1">
                              <Clock className="w-3 h-3 text-slate-500" />
                              {formatRelativeTime(guest.lastActiveAt)}
                            </div>
                          </td>

                          {/* Action */}
                          <td className="py-3 px-3 text-right">
                            <button
                              type="button"
                              onClick={e => {
                                e.stopPropagation();
                                inspectGuest(guest);
                              }}
                              className="px-2.5 py-1 rounded-lg bg-[#133E87] hover:bg-cyan-500 text-white font-bold text-[11px] flex items-center gap-1 ml-auto transition"
                            >
                              <Eye className="w-3 h-3" /> Inspect
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        {/* Detailed Guest Journey Inspector (1 col on xl) */}
        <div className="space-y-4">
          <div className="p-5 rounded-2xl bg-slate-950/95 border border-[#5DE2E7]/30 sticky top-6">
            {selectedGuest ? (
              <div className="space-y-4">
                {/* Header */}
                <div className="flex items-start justify-between gap-2 border-b border-white/10 pb-3">
                  <div>
                    <div className="flex items-center gap-1.5">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-[#5DE2E7]">
                        Visitor Identity & Support Hub
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      <h4 className="text-sm font-black text-white font-mono truncate max-w-[200px]">
                        {selectedGuest.guestId || selectedGuest.id}
                      </h4>
                      <button
                        onClick={() => copyToClipboard(selectedGuest.guestId || selectedGuest.id, 'inspector_id')}
                        className="text-slate-400 hover:text-white"
                        title="Copy Guest ID"
                      >
                        {copiedId === 'inspector_id' ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                      </button>
                    </div>
                  </div>
                  <button
                    onClick={() => setSelectedGuest(null)}
                    className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                {/* Tab Navigation */}
                <div className="grid grid-cols-3 gap-1 p-1 rounded-xl bg-slate-900 border border-white/10 text-xs">
                  <button
                    onClick={() => setInspectorTab('overview')}
                    className={`py-1.5 rounded-lg font-bold transition text-[11px] ${
                      inspectorTab === 'overview'
                        ? 'bg-[#133E87] text-white shadow-sm'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    Overview
                  </button>
                  <button
                    onClick={() => setInspectorTab('support')}
                    className={`py-1.5 rounded-lg font-bold transition text-[11px] flex items-center justify-center gap-1 ${
                      inspectorTab === 'support'
                        ? 'bg-[#133E87] text-white shadow-sm'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    <MessageSquare className="w-3 h-3" />
                    <span>Support ({selectedGuestConversations.length})</span>
                  </button>
                  <button
                    onClick={() => setInspectorTab('sessions')}
                    className={`py-1.5 rounded-lg font-bold transition text-[11px] flex items-center justify-center gap-1 ${
                      inspectorTab === 'sessions'
                        ? 'bg-[#133E87] text-white shadow-sm'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    <Activity className="w-3 h-3" />
                    <span>Sessions ({selectedGuestSessions.length})</span>
                  </button>
                </div>

                {/* TAB 1: OVERVIEW */}
                {inspectorTab === 'overview' && (
                  <div className="space-y-3 text-xs">
                    {/* Status & Linking Overview */}
                    <div className="p-3 rounded-xl bg-slate-900/90 border border-white/10 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-slate-400">Account Status:</span>
                        {selectedGuest.status === 'linked' || selectedGuest.linkedUserId ? (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 flex items-center gap-1">
                            <CheckCircle2 className="w-3 h-3" /> Linked to User Account
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-slate-800 text-slate-300 border border-white/10">
                            Anonymous Visitor
                          </span>
                        )}
                      </div>

                      {/* Linked Account Details */}
                      <div className="p-2.5 rounded-lg bg-slate-950/60 border border-white/5 space-y-1">
                        <div className="text-[10px] uppercase font-bold text-slate-400">Account Linking Info</div>
                        <div className="flex justify-between text-[11px]">
                          <span className="text-slate-400">Linked Account:</span>
                          <span className={selectedGuest.linkedUserId ? 'text-emerald-400 font-semibold' : 'text-slate-400'}>
                            {selectedGuest.linkedUserId ? 'Linked' : 'Not linked'}
                          </span>
                        </div>
                        <div className="flex justify-between text-[11px]">
                          <span className="text-slate-400">User ID:</span>
                          <span className="font-mono text-white truncate max-w-[170px]" title={selectedGuest.linkedUserId || 'Not linked'}>
                            {selectedGuest.linkedUserId || 'Not linked'}
                          </span>
                        </div>
                        <div className="flex justify-between text-[11px]">
                          <span className="text-slate-400">Account Email:</span>
                          <span className="text-white truncate max-w-[170px]" title={selectedGuest.linkedUserEmail || 'Not linked'}>
                            {selectedGuest.linkedUserEmail || 'Not linked'}
                          </span>
                        </div>
                        <div className="flex justify-between text-[11px]">
                          <span className="text-slate-400">Linked Date:</span>
                          <span className="text-slate-300">
                            {selectedGuest.linkedAt ? new Date(selectedGuest.linkedAt).toLocaleString() : 'Not linked'}
                          </span>
                        </div>
                      </div>

                      {/* Voluntary Contact Data */}
                      <div className="p-2.5 rounded-lg bg-slate-950/60 border border-white/5 space-y-1">
                        <div className="text-[10px] uppercase font-bold text-slate-400">Voluntary Information</div>
                        <div className="flex justify-between text-[11px]">
                          <span className="text-slate-400">Voluntary Name:</span>
                          <span className="text-white">
                            {selectedGuest.voluntaryName ||
                              selectedGuestConversations.find(c => c.userName && !c.userName.startsWith('Guest-'))?.userName ||
                              'Not provided'}
                          </span>
                        </div>
                        <div className="flex justify-between text-[11px]">
                          <span className="text-slate-400">Voluntary Email:</span>
                          <span className="text-white">
                            {selectedGuest.voluntaryEmail ||
                              selectedGuestReports.find(r => r.userEmail)?.userEmail ||
                              'Not provided'}
                          </span>
                        </div>
                        <div className="flex justify-between text-[11px]">
                          <span className="text-slate-400">Voluntary Phone:</span>
                          <span className="text-white">
                            {selectedGuest.voluntaryPhone ||
                              selectedGuestConversations.find(c => c.userPhone)?.userPhone ||
                              'Not provided'}
                          </span>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-2 pt-1 border-t border-white/5 text-[11px]">
                        <div>
                          <span className="text-slate-500 block">First Seen</span>
                          <span className="text-slate-200">{new Date(selectedGuest.createdAt).toLocaleString()}</span>
                        </div>
                        <div>
                          <span className="text-slate-500 block">Last Active</span>
                          <span className="text-slate-200">{new Date(selectedGuest.lastActiveAt).toLocaleString()}</span>
                        </div>
                      </div>
                    </div>

                    {/* Device & Client Metadata */}
                    <div className="p-3 rounded-xl bg-slate-900/90 border border-white/10 space-y-2">
                      <div className="text-[10px] uppercase font-bold tracking-wider text-slate-400 mb-1">
                        Client Environment & Pages
                      </div>
                      <div className="space-y-1 text-[11px]">
                        <div className="flex justify-between">
                          <span className="text-slate-400">Device:</span>
                          <span className="text-slate-200">{selectedGuest.device || 'Unknown'}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-400">Browser:</span>
                          <span className="text-white font-medium">{selectedGuest.browser || 'Unknown'}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-400">Operating System:</span>
                          <span className="text-white font-medium">{selectedGuest.os || 'Unknown'}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-400">Country:</span>
                          <span className="text-slate-200">{selectedGuest.country || 'Unknown'}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-400">Language:</span>
                          <span className="text-slate-200">{selectedGuest.language || 'Unknown'}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-400">Resolution:</span>
                          <span className="text-slate-200">{selectedGuest.screenResolution || 'Unknown'}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-400">First Page:</span>
                          <span className="text-slate-200 truncate max-w-[150px] font-mono text-[10px]" title={selectedGuest.initialLandingPage || 'Unknown'}>
                            {selectedGuest.initialLandingPage || 'Unknown'}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-400">Last Page:</span>
                          <span className="text-slate-200 truncate max-w-[150px] font-mono text-[10px]" title={selectedGuest.currentLandingPage || 'Unknown'}>
                            {selectedGuest.currentLandingPage || 'Unknown'}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-400">Initial Referrer:</span>
                          <span className="text-slate-200 truncate max-w-[150px]" title={selectedGuest.referrer}>
                            {selectedGuest.referrer || 'direct'}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Quantitative Funnel Summary */}
                    <div className="p-3 rounded-xl bg-slate-900/90 border border-white/10">
                      <div className="text-[10px] uppercase font-bold tracking-wider text-slate-400 mb-2">
                        Engagement Funnel & Support
                      </div>
                      <div className="grid grid-cols-4 gap-1.5 text-center">
                        <div className="p-2 rounded-lg bg-slate-950/60 border border-white/5">
                          <div className="text-base font-black text-white">{selectedGuest.sessionCount || 1}</div>
                          <div className="text-[8px] text-slate-400 uppercase">Sessions</div>
                        </div>
                        <div className="p-2 rounded-lg bg-slate-950/60 border border-white/5">
                          <div className="text-base font-black text-blue-400">{selectedGuest.pageViewsCount || 1}</div>
                          <div className="text-[8px] text-slate-400 uppercase">Views</div>
                        </div>
                        <div className="p-2 rounded-lg bg-slate-950/60 border border-white/5">
                          <div className="text-base font-black text-purple-400">{selectedGuestConversations.length}</div>
                          <div className="text-[8px] text-slate-400 uppercase">Chats</div>
                        </div>
                        <div className="p-2 rounded-lg bg-slate-950/60 border border-white/5">
                          <div className="text-base font-black text-amber-400">{selectedGuestReports.length}</div>
                          <div className="text-[8px] text-slate-400 uppercase">Reports</div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* TAB 2: SUPPORT CHATS & REPORTS */}
                {inspectorTab === 'support' && (
                  <div className="space-y-3 text-xs">
                    {/* Support Conversations List */}
                    <div>
                      <div className="flex items-center justify-between text-xs font-bold text-white mb-2">
                        <span className="flex items-center gap-1.5">
                          <MessageSquare className="w-3.5 h-3.5 text-purple-400" />
                          Support Chats ({selectedGuestConversations.length})
                        </span>
                      </div>

                      {isLoadingSupportData ? (
                        <div className="p-4 text-center text-slate-400 text-xs">Loading support history...</div>
                      ) : selectedGuestConversations.length === 0 ? (
                        <div className="p-4 text-center text-slate-400 text-xs rounded-xl bg-slate-900/50 border border-white/5">
                          No support chat conversations on record.
                        </div>
                      ) : (
                        <div className="space-y-2 max-h-[220px] overflow-y-auto pr-1">
                          {selectedGuestConversations.map(conv => (
                            <div key={conv.id} className="p-2.5 rounded-xl bg-slate-900 border border-white/10 space-y-1">
                              <div className="flex items-center justify-between">
                                <span className="font-mono text-[#5DE2E7] font-semibold text-[11px] truncate max-w-[130px]">
                                  {conv.id}
                                </span>
                                <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold uppercase ${
                                  conv.status === 'resolved' ? 'bg-emerald-500/20 text-emerald-300' :
                                  conv.status === 'human_handling' ? 'bg-purple-500/20 text-purple-300' :
                                  conv.status === 'waiting_human' ? 'bg-amber-500/20 text-amber-300' :
                                  'bg-blue-500/20 text-blue-300'
                                }`}>
                                  {conv.status.replace(/_/g, ' ')}
                                </span>
                              </div>
                              <div className="font-bold text-white text-xs truncate">
                                {conv.title || 'Support Conversation'}
                              </div>
                              <div className="text-[10px] text-slate-400 line-clamp-1">
                                {conv.lastMessage || 'No messages yet'}
                              </div>
                              <div className="flex items-center justify-between pt-1 text-[10px] text-slate-500 border-t border-white/5">
                                <span>{new Date(conv.lastMessageAt || conv.createdAt).toLocaleDateString()}</span>
                                <button
                                  onClick={() => copyToClipboard(conv.id, conv.id)}
                                  className="text-slate-400 hover:text-white flex items-center gap-0.5"
                                >
                                  {copiedId === conv.id ? <Check className="w-2.5 h-2.5 text-emerald-400" /> : <Copy className="w-2.5 h-2.5" />}
                                  <span>ID</span>
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Support Reports List */}
                    <div className="pt-2 border-t border-white/10">
                      <div className="flex items-center justify-between text-xs font-bold text-white mb-2">
                        <span className="flex items-center gap-1.5">
                          <FileText className="w-3.5 h-3.5 text-amber-400" />
                          Support Reports ({selectedGuestReports.length})
                        </span>
                      </div>

                      {isLoadingSupportData ? (
                        <div className="p-4 text-center text-slate-400 text-xs">Loading reports...</div>
                      ) : selectedGuestReports.length === 0 ? (
                        <div className="p-4 text-center text-slate-400 text-xs rounded-xl bg-slate-900/50 border border-white/5">
                          No support reports submitted.
                        </div>
                      ) : (
                        <div className="space-y-2 max-h-[180px] overflow-y-auto pr-1">
                          {selectedGuestReports.map(rep => (
                            <div key={rep.id} className="p-2.5 rounded-xl bg-slate-900 border border-white/10 space-y-1">
                              <div className="flex items-center justify-between">
                                <span className="font-mono text-amber-400 font-bold text-[11px]">
                                  {rep.id}
                                </span>
                                <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold uppercase ${
                                  rep.status === 'resolved' ? 'bg-emerald-500/20 text-emerald-300' :
                                  rep.status === 'open' ? 'bg-red-500/20 text-red-300' :
                                  'bg-amber-500/20 text-amber-300'
                                }`}>
                                  {rep.status}
                                </span>
                              </div>
                              <div className="font-bold text-white text-xs truncate">
                                {rep.title}
                              </div>
                              <div className="text-[10px] text-slate-400 line-clamp-1">
                                {rep.description}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* TAB 3: SESSIONS & JOURNEYS */}
                {inspectorTab === 'sessions' && (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-xs font-bold text-white">
                      <span className="flex items-center gap-1.5">
                        <Activity className="w-3.5 h-3.5 text-[#5DE2E7]" />
                        Session & Journey Timeline
                      </span>
                      <span className="text-[10px] text-slate-400">
                        {selectedGuestSessions.length} sessions logged
                      </span>
                    </div>

                    {isLoadingGuestSessions ? (
                      <div className="p-6 text-center text-slate-400 text-xs">
                        Loading session trail...
                      </div>
                    ) : selectedGuestSessions.length === 0 ? (
                      <div className="p-6 text-center text-slate-400 text-xs rounded-xl bg-slate-900/50 border border-white/5">
                        No active sessions recorded yet.
                      </div>
                    ) : (
                      <div className="space-y-3 max-h-[360px] overflow-y-auto pr-1">
                        {selectedGuestSessions.map((sess, sIdx) => {
                          const sessDuration = sess.durationSeconds || 0;
                          const durationMins = Math.floor(sessDuration / 60);
                          const durationSecs = sessDuration % 60;

                          return (
                            <div key={sess.id} className="p-3 rounded-xl bg-slate-900/90 border border-white/10 space-y-2 text-xs">
                              <div className="flex items-center justify-between text-[11px]">
                                <span className="font-mono text-[#5DE2E7] font-semibold">
                                  Session #{selectedGuestSessions.length - sIdx}
                                </span>
                                <span className="text-slate-400">
                                  {new Date(sess.startedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} • {durationMins > 0 ? `${durationMins}m ` : ''}{durationSecs}s
                                </span>
                              </div>

                              {/* Page view trail */}
                              {sess.pageViews && sess.pageViews.length > 0 && (
                                <div className="space-y-1">
                                  <span className="text-[10px] text-slate-500 uppercase font-bold">Page Navigation Path</span>
                                  <div className="flex flex-wrap items-center gap-1">
                                    {sess.pageViews.map((pv, pIdx) => (
                                      <React.Fragment key={pIdx}>
                                        <span className="px-1.5 py-0.5 rounded bg-slate-800 text-[10px] font-mono text-slate-300">
                                          {pv}
                                        </span>
                                        {pIdx < sess.pageViews.length - 1 && (
                                          <ArrowRight className="w-2.5 h-2.5 text-slate-600" />
                                        )}
                                      </React.Fragment>
                                    ))}
                                  </div>
                                </div>
                              )}

                              {/* Recorded events inside this session */}
                              {sess.events && sess.events.length > 0 && (
                                <div className="pt-1.5 border-t border-white/5 space-y-1">
                                  <span className="text-[10px] text-slate-500 uppercase font-bold">Session Events ({sess.events.length})</span>
                                  <div className="space-y-1 max-h-32 overflow-y-auto pr-1">
                                    {sess.events.map((ev, eIdx) => (
                                      <div key={eIdx} className="text-[10px] flex items-start gap-1.5 text-slate-300">
                                        <span className="w-1.5 h-1.5 rounded-full bg-[#5DE2E7] mt-1 shrink-0" />
                                        <div>
                                          <span className="font-bold text-white uppercase tracking-wider">{ev.action.replace(/_/g, ' ')}</span>
                                          {ev.details && <span className="text-slate-400 ml-1.5">({ev.details})</span>}
                                          {ev.path && <span className="text-cyan-300 ml-1.5 font-mono">[{ev.path}]</span>}
                                          <span className="text-slate-500 ml-1.5">{new Date(ev.timestamp).toLocaleTimeString()}</span>
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}
              </div>
            ) : (
              <div className="py-16 px-4 text-center space-y-3 text-slate-400">
                <div className="w-12 h-12 rounded-2xl bg-[#133E87]/40 border border-[#5DE2E7]/30 flex items-center justify-center mx-auto text-[#5DE2E7]">
                  <Globe className="w-6 h-6" />
                </div>
                <h4 className="text-sm font-bold text-white">Select a Visitor Profile</h4>
                <p className="text-xs text-slate-400 max-w-xs mx-auto">
                  Click any guest record from the table to inspect their complete journey trail, device environment, support interactions, and account linking status.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
