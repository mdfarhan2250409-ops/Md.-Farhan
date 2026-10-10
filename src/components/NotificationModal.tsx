import React, { useState, useEffect, useMemo } from 'react';
import { useApp } from '../context/AppContext';
import { motion, AnimatePresence } from 'motion/react';
import {
  Bell,
  X,
  CheckCheck,
  Sparkles,
  ExternalLink,
  Smartphone,
  Layout,
  Bot,
  Sliders,
  FolderOpen,
  Clock,
  Flame,
  ArrowRight
} from 'lucide-react';
import { Resource } from '../types';

const NOTIFS_SEEN_KEY = 'OTL_SEEN_NOTIFICATIONS_V2';

export const NotificationModal: React.FC = () => {
  const {
    isNotificationOpen,
    setIsNotificationOpen,
    resources,
    setActiveResourceModal,
    showToast
  } = useApp();

  // Helper to get item unique key
  const getItemKey = (res: { id: string; updatedAt?: string; createdAt?: string }) => {
    return `${res.id}_${res.updatedAt || res.createdAt || ''}`;
  };

  const [seenKeys, setSeenKeys] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem(NOTIFS_SEEN_KEY);
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const [activeFilter, setActiveFilter] = useState<'all' | '24h' | 'apps' | 'landing-pages' | 'ai-presets'>('all');

  // When modal is opened, mark all currently existing products as seen immediately like YouTube
  useEffect(() => {
    if (isNotificationOpen && resources.length > 0) {
      try {
        const allKeys = resources.map(r => getItemKey(r));
        localStorage.setItem(NOTIFS_SEEN_KEY, JSON.stringify(allKeys));
        setSeenKeys(allKeys);
      } catch (e) {
        console.warn('Failed to save seen notifications', e);
      }
    }
  }, [isNotificationOpen, resources]);

  // Helper to calculate relative time string and 24h status
  const getNotificationMeta = (res: Resource) => {
    const todayStr = new Date().toISOString().split('T')[0];
    let is24h = false;
    let timeLabel = 'Recent';

    if (res.createdAt) {
      const createdDate = new Date(res.createdAt);
      if (!isNaN(createdDate.getTime())) {
        const diffMs = Date.now() - createdDate.getTime();
        const diffHours = diffMs / (1000 * 60 * 60);

        if (diffHours >= 0 && diffHours <= 24) {
          is24h = true;
          if (diffHours < 1) {
            const diffMins = Math.max(1, Math.floor(diffMs / (1000 * 60)));
            timeLabel = `${diffMins}m ago`;
          } else {
            timeLabel = `${Math.floor(diffHours)}h ago`;
          }
        } else if (res.createdAt === todayStr) {
          is24h = true;
          timeLabel = 'Today';
        } else if (diffHours <= 48) {
          timeLabel = 'Yesterday';
        } else {
          const days = Math.floor(diffHours / 24);
          timeLabel = days <= 30 ? `${days}d ago` : res.createdAt;
        }
      }
    }

    return { is24h, timeLabel };
  };

  // Sort resources by newest first
  const sortedNotifications = useMemo(() => {
    return [...resources].sort((a, b) => {
      const timeA = new Date(a.createdAt || 0).getTime();
      const timeB = new Date(b.createdAt || 0).getTime();
      return timeB - timeA;
    });
  }, [resources]);

  // Filtered notifications
  const filteredNotifications = useMemo(() => {
    return sortedNotifications.filter(res => {
      if (activeFilter === 'all') return true;
      if (activeFilter === '24h') {
        const { is24h } = getNotificationMeta(res);
        return is24h;
      }
      if (activeFilter === 'apps') return res.category === 'apps';
      if (activeFilter === 'landing-pages') return res.category === 'landing-pages';
      if (activeFilter === 'ai-presets') return res.category === 'ai-prompts' || res.category === 'lr-presets';
      return true;
    });
  }, [sortedNotifications, activeFilter]);

  const count24h = useMemo(() => {
    return sortedNotifications.filter(res => getNotificationMeta(res).is24h).length;
  }, [sortedNotifications]);

  const handleOpenResource = (res: Resource) => {
    const key = getItemKey(res);
    if (!seenKeys.includes(key)) {
      const nextKeys = [...seenKeys, key];
      setSeenKeys(nextKeys);
      try {
        localStorage.setItem(NOTIFS_SEEN_KEY, JSON.stringify(nextKeys));
      } catch (e) {
        console.warn(e);
      }
    }
    setIsNotificationOpen(false);
    setActiveResourceModal(res);
  };

  const handleMarkAllRead = () => {
    const allKeys = sortedNotifications.map(r => getItemKey(r));
    setSeenKeys(allKeys);
    try {
      localStorage.setItem(NOTIFS_SEEN_KEY, JSON.stringify(allKeys));
    } catch (e) {
      console.warn(e);
    }
    showToast('✓ Marked all notifications as read');
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'apps':
        return <Smartphone className="w-3.5 h-3.5 text-emerald-400" />;
      case 'landing-pages':
        return <Layout className="w-3.5 h-3.5 text-cyan-400" />;
      case 'ai-prompts':
        return <Bot className="w-3.5 h-3.5 text-purple-400" />;
      case 'lr-presets':
        return <Sliders className="w-3.5 h-3.5 text-amber-400" />;
      default:
        return <FolderOpen className="w-3.5 h-3.5 text-blue-400" />;
    }
  };

  const getCategoryBadgeClass = (category: string) => {
    switch (category) {
      case 'apps':
        return 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30';
      case 'landing-pages':
        return 'bg-cyan-500/15 text-cyan-300 border-cyan-500/30';
      case 'ai-prompts':
        return 'bg-purple-500/15 text-purple-300 border-purple-500/30';
      case 'lr-presets':
        return 'bg-amber-500/15 text-amber-300 border-amber-500/30';
      default:
        return 'bg-blue-500/15 text-blue-300 border-blue-500/30';
    }
  };

  return (
    <AnimatePresence>
      {isNotificationOpen && (
        <div className="fixed inset-0 z-50 flex items-start justify-center sm:items-center p-0 sm:p-4">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setIsNotificationOpen(false)}
            className="fixed inset-0 bg-slate-950/80 backdrop-blur-md transition-opacity"
          />

          {/* Modal / Drawer Container */}
          <motion.div
            initial={{ opacity: 0, y: -20, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.96 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="relative w-full sm:max-w-xl max-h-[92vh] sm:max-h-[85vh] bg-[#070E24]/95 border-b sm:border border-white/15 sm:rounded-3xl shadow-[0_20px_60px_rgba(0,0,0,0.9),0_0_40px_rgba(93,226,231,0.15)] backdrop-blur-2xl flex flex-col overflow-hidden z-10"
          >
            {/* Header (YouTube Style) */}
            <div className="p-4 sm:p-5 border-b border-white/10 flex items-center justify-between bg-white/[0.02]">
              <div className="flex items-center space-x-3">
                <div className="w-9 h-9 rounded-2xl bg-gradient-to-tr from-[#133E87] to-cyan-500 flex items-center justify-center text-white shadow-[0_0_15px_rgba(93,226,231,0.4)]">
                  <Bell className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-base sm:text-lg font-bold text-white tracking-tight">
                      Notifications
                    </h2>
                    {count24h > 0 && (
                      <span className="px-2 py-0.5 text-[11px] font-black rounded-full bg-cyan-500/20 text-[#5DE2E7] border border-[#5DE2E7]/40">
                        {count24h} 24h new
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-slate-400">
                    Latest uploads, updates & products
                  </p>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center space-x-2">
                <button
                  onClick={handleMarkAllRead}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-xs font-semibold text-slate-300 hover:text-white border border-white/10 transition-all cursor-pointer"
                  title="Mark all as read"
                >
                  <CheckCheck className="w-3.5 h-3.5 text-[#5DE2E7]" />
                  <span className="hidden sm:inline">Mark read</span>
                </button>
                <button
                  onClick={() => setIsNotificationOpen(false)}
                  className="p-2 rounded-xl text-slate-400 hover:text-white bg-white/5 hover:bg-white/10 border border-white/10 transition cursor-pointer"
                  aria-label="Close Notifications"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Filter Tabs (YouTube style chips) */}
            <div className="px-4 py-2.5 border-b border-white/10 flex items-center gap-2 overflow-x-auto no-scrollbar bg-black/20">
              <button
                onClick={() => setActiveFilter('all')}
                className={`px-3 py-1 rounded-full text-xs font-bold whitespace-nowrap transition-all cursor-pointer ${
                  activeFilter === 'all'
                    ? 'bg-gradient-to-r from-[#133E87] to-cyan-500 text-white shadow-[0_0_12px_rgba(93,226,231,0.3)]'
                    : 'bg-white/5 text-slate-400 hover:text-slate-200 hover:bg-white/10 border border-white/5'
                }`}
              >
                All ({sortedNotifications.length})
              </button>

              <button
                onClick={() => setActiveFilter('24h')}
                className={`px-3 py-1 rounded-full text-xs font-bold whitespace-nowrap transition-all flex items-center gap-1 cursor-pointer ${
                  activeFilter === '24h'
                    ? 'bg-gradient-to-r from-cyan-600 to-blue-600 text-white shadow-[0_0_12px_rgba(93,226,231,0.4)]'
                    : 'bg-white/5 text-slate-400 hover:text-slate-200 hover:bg-white/10 border border-white/5'
                }`}
              >
                <Flame className="w-3 h-3 text-[#5DE2E7]" />
                <span>24h Uploads ({count24h})</span>
              </button>

              <button
                onClick={() => setActiveFilter('landing-pages')}
                className={`px-3 py-1 rounded-full text-xs font-bold whitespace-nowrap transition-all cursor-pointer ${
                  activeFilter === 'landing-pages'
                    ? 'bg-cyan-500/30 text-cyan-200 border border-cyan-400/50'
                    : 'bg-white/5 text-slate-400 hover:text-slate-200 hover:bg-white/10 border border-white/5'
                }`}
              >
                Landing Pages
              </button>

              <button
                onClick={() => setActiveFilter('apps')}
                className={`px-3 py-1 rounded-full text-xs font-bold whitespace-nowrap transition-all cursor-pointer ${
                  activeFilter === 'apps'
                    ? 'bg-emerald-500/30 text-emerald-200 border border-emerald-400/50'
                    : 'bg-white/5 text-slate-400 hover:text-slate-200 hover:bg-white/10 border border-white/5'
                }`}
              >
                Apps & Mods
              </button>

              <button
                onClick={() => setActiveFilter('ai-presets')}
                className={`px-3 py-1 rounded-full text-xs font-bold whitespace-nowrap transition-all cursor-pointer ${
                  activeFilter === 'ai-presets'
                    ? 'bg-purple-500/30 text-purple-200 border border-purple-400/50'
                    : 'bg-white/5 text-slate-400 hover:text-slate-200 hover:bg-white/10 border border-white/5'
                }`}
              >
                Prompts & Presets
              </button>
            </div>

            {/* Notification Items List */}
            <div className="flex-1 overflow-y-auto p-3 sm:p-4 space-y-2.5 divide-y divide-white/5">
              {filteredNotifications.length === 0 ? (
                <div className="py-14 px-4 text-center">
                  <div className="w-14 h-14 mx-auto mb-3 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center text-slate-400">
                    <Bell className="w-7 h-7 stroke-[1.5]" />
                  </div>
                  <h3 className="text-sm font-bold text-white mb-1">
                    No notifications right now
                  </h3>
                  <p className="text-xs text-slate-400 max-w-xs mx-auto">
                    {activeFilter === '24h'
                      ? 'No new items uploaded in the last 24 hours. Check back soon for fresh releases!'
                      : 'All caught up! Check back later for new resources and updates.'}
                  </p>
                </div>
              ) : (
                filteredNotifications.map((res, index) => {
                  const key = getItemKey(res);
                  const isRead = seenKeys.includes(key);
                  const { is24h, timeLabel } = getNotificationMeta(res);

                  return (
                    <motion.div
                      key={res.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.03 }}
                      onClick={() => handleOpenResource(res)}
                      className={`pt-2.5 first:pt-0 group relative p-3 rounded-2xl transition-all cursor-pointer flex items-start gap-3 border ${
                        !isRead
                          ? 'bg-white/[0.04] hover:bg-white/[0.08] border-[#5DE2E7]/25 shadow-[0_0_15px_rgba(93,226,231,0.06)]'
                          : 'bg-transparent hover:bg-white/[0.03] border-transparent'
                      }`}
                    >
                      {/* Left: Thumbnail Image (YouTube Video Style) */}
                      <div className="relative w-16 h-16 sm:w-20 sm:h-20 rounded-xl overflow-hidden bg-slate-900 border border-white/15 shrink-0">
                        <img
                          src={res.thumbnail}
                          alt={res.title}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                          loading="lazy"
                        />
                        {is24h && (
                          <div className="absolute top-1 left-1 px-1 py-0.2 rounded bg-cyan-500 text-slate-950 font-black text-[8px] uppercase tracking-wider shadow">
                            24h
                          </div>
                        )}
                      </div>

                      {/* Middle: Content */}
                      <div className="flex-1 min-w-0 pr-2">
                        <div className="flex items-center gap-1.5 mb-1 flex-wrap">
                          <span
                            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold border ${getCategoryBadgeClass(
                              res.category
                            )}`}
                          >
                            {getCategoryIcon(res.category)}
                            <span className="capitalize">{res.category.replace('-', ' ')}</span>
                          </span>

                          {is24h && (
                            <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-md text-[9px] font-black bg-[#5DE2E7]/20 text-[#5DE2E7] border border-[#5DE2E7]/30">
                              <Sparkles className="w-2.5 h-2.5" />
                              NEW
                            </span>
                          )}

                          <span className="text-[10px] text-slate-400 ml-auto flex items-center gap-1 font-medium">
                            <Clock className="w-3 h-3 text-slate-500" />
                            {timeLabel}
                          </span>
                        </div>

                        <h4
                          className={`text-xs sm:text-sm font-bold line-clamp-1 group-hover:text-[#5DE2E7] transition-colors ${
                            !isRead ? 'text-white' : 'text-slate-300'
                          }`}
                        >
                          {res.title}
                        </h4>

                        <p className="text-[11px] text-slate-400 line-clamp-2 mt-0.5 leading-relaxed">
                          {res.shortDescription || res.fullDescription}
                        </p>

                        <div className="mt-1.5 flex items-center gap-2 text-[10px] text-slate-400 font-medium">
                          {res.version && (
                            <span className="px-1.5 py-0.2 rounded bg-white/5 text-slate-300 border border-white/10 font-mono">
                              {res.version}
                            </span>
                          )}
                          {res.fileSize && <span>{res.fileSize}</span>}
                          <span className="text-[#5DE2E7] group-hover:underline flex items-center gap-0.5 ml-auto font-bold">
                            View product <ArrowRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
                          </span>
                        </div>
                      </div>

                      {/* Right: Unread indicator dot */}
                      {!isRead && (
                        <div
                          className="w-2 h-2 rounded-full bg-[#5DE2E7] shadow-[0_0_8px_#5DE2E7] shrink-0 mt-2"
                          title="Unread"
                        />
                      )}
                    </motion.div>
                  );
                })
              )}
            </div>

            {/* Footer */}
            <div className="p-3 sm:p-4 border-t border-white/10 bg-white/[0.02] flex items-center justify-between text-xs text-slate-400">
              <span>
                Showing {filteredNotifications.length} items
              </span>
              <button
                onClick={() => setIsNotificationOpen(false)}
                className="text-[#5DE2E7] hover:underline font-semibold cursor-pointer"
              >
                Done
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
