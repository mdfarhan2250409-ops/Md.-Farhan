import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { SupportConversation } from '../../types';
import { OtlLogo } from '../OtlLogo';
import {
  Plus,
  Search,
  MessageSquare,
  Trash2,
  X,
  User,
  PanelLeftClose,
  PanelLeftOpen,
  Calendar,
  AlertCircle,
  SquarePen
} from 'lucide-react';

interface SupportSidebarProps {
  conversations: SupportConversation[];
  activeConversationId?: string;
  onSelectConversation: (id: string) => void;
  onNewChat: () => void;
  onDeleteConversation: (id: string) => void;
  searchQuery: string;
  onSearchChange: (q: string) => void;
  currentUser?: { name?: string; email?: string; userId?: string } | null;
  isAuthenticated: boolean;
  isMobileDrawerOpen?: boolean;
  onCloseMobileDrawer?: () => void;
  isCollapsed?: boolean;
  onToggleCollapse?: () => void;
}

export const SupportSidebar: React.FC<SupportSidebarProps> = ({
  conversations,
  activeConversationId,
  onSelectConversation,
  onNewChat,
  onDeleteConversation,
  searchQuery,
  onSearchChange,
  currentUser,
  isAuthenticated,
  isMobileDrawerOpen = false,
  onCloseMobileDrawer,
  isCollapsed = false,
  onToggleCollapse
}) => {
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  // Group conversations by date: Today, Yesterday, Previous 7 Days, Older
  const groupConversations = (list: SupportConversation[]) => {
    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
    const startOfYesterday = startOfToday - 86400000;
    const startOfSevenDaysAgo = startOfToday - 7 * 86400000;

    const groups: { [key: string]: SupportConversation[] } = {
      Today: [],
      Yesterday: [],
      'Previous 7 Days': [],
      Older: []
    };

    list.forEach(conv => {
      const convTime = new Date(conv.updatedAt || conv.createdAt).getTime();
      if (convTime >= startOfToday) {
        groups.Today.push(conv);
      } else if (convTime >= startOfYesterday) {
        groups.Yesterday.push(conv);
      } else if (convTime >= startOfSevenDaysAgo) {
        groups['Previous 7 Days'].push(conv);
      } else {
        groups.Older.push(conv);
      }
    });

    return groups;
  };

  // Intelligently format conversation title like ChatGPT based on topic
  const getDisplayConversationTitle = (conv: SupportConversation): string => {
    if (conv.title && conv.title.trim() && conv.title !== 'New Conversation') {
      return conv.title;
    }
    if (conv.lastMessage && conv.lastMessage.trim()) {
      const text = conv.lastMessage.trim();
      const isBengali = /[\u0980-\u09FF]/.test(text);
      const lower = text.toLowerCase();

      if (/(download|নামাবো|নামাতে|ডাউনলোড|apk|ইন্সটল|ইনস্টল)/i.test(lower)) {
        if (/capcut/i.test(lower)) return isBengali ? 'CapCut Pro ডাউনলোড' : 'CapCut Pro Download';
        if (/lightroom/i.test(lower)) return isBengali ? 'Lightroom Presets ডাউনলোড' : 'Lightroom Presets Download';
        if (/সমস্যা|না\s*হওয়া|হচ্ছে\s*না|কারণ|somossa|fail|error/i.test(lower)) {
          return isBengali ? 'অ্যাপ ডাউনলোড সমস্যা ও সমাধান' : 'App Download Troubleshooting';
        }
        return isBengali ? 'অ্যাপ ও রিসোর্স ডাউনলোড' : 'Download Assistance';
      }

      if (/otp/i.test(lower)) return isBengali ? 'OTP ভেরিফিকেশন সমস্যা' : 'OTP Verification Help';
      if (/(create\s*account|open\s*account|register|একাউন্ট|অ্যাকাউন্ট)/i.test(lower)) {
        return isBengali ? 'নতুন অ্যাকাউন্ট তৈরি' : 'How to Create an Account';
      }
      if (/(login|লগইন)/i.test(lower)) return isBengali ? 'অ্যাকাউন্ট লগইন সহায়তা' : 'Login Help';
      if (/(password|পাসওয়ার্ড)/i.test(lower)) return isBengali ? 'পাসওয়ার্ড রিসেট গাইড' : 'Password Reset Help';
      if (/(capcut)/i.test(lower)) return isBengali ? 'CapCut Pro Mod সহায়তা' : 'CapCut Pro Inquiry';
      if (/(lightroom)/i.test(lower)) return isBengali ? 'Lightroom Presets সহায়তা' : 'Lightroom Presets';
      if (/(canva)/i.test(lower)) return isBengali ? 'Canva Pro সংক্রান্ত' : 'Canva Pro Question';
      if (/(telegram|টেলিগ্রাম)/i.test(lower)) return isBengali ? 'টেলিগ্রাম চ্যানেল ও ডাউনলোড' : 'Telegram Channel';

      // Clean and truncate text
      const cleaned = text
        .replace(/^["'#*`]+|["'#*`]+$/g, '')
        .replace(/[!?।:;]+$/, '')
        .replace(/^(hello|hi|hey|ভাইয়া|ভাই|দয়া করে|প্লিজ|how to|what is)\s+/i, '')
        .trim();
      if (cleaned.length <= 32) return cleaned.charAt(0).toUpperCase() + cleaned.slice(1);
      const words = cleaned.split(/\s+/);
      if (words.length > 5) return words.slice(0, 5).join(' ') + '...';
      return cleaned.slice(0, 30) + '...';
    }
    return 'New Conversation';
  };

  // Filter conversations by search and exclude blank conversations where nothing was written
  const filteredList = conversations.filter(c => {
    // Only show conversations that have actual messages/activity
    const hasContent = Boolean(
      (c.lastMessage && c.lastMessage.trim()) ||
      (c.title && c.title !== 'New Conversation' && c.title.trim() !== '')
    );
    if (!hasContent) return false;

    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      (c.title && c.title.toLowerCase().includes(q)) ||
      (c.lastMessage && c.lastMessage.toLowerCase().includes(q)) ||
      c.id.toLowerCase().includes(q)
    );
  });

  const grouped = groupConversations(filteredList);

  const sidebarContent = (
    <div className="flex flex-col h-full bg-[#081226] border-r border-white/10 text-slate-200 select-none">
      {/* Top Header */}
      <div className="p-3.5 border-b border-white/10 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-2.5">
          <OtlLogo size={28} animate={true} />
          <div>
            <span className="text-xs font-black tracking-wider text-white uppercase">
              OTL Support
            </span>
            <span className="block text-[10px] text-cyan-400 font-medium">
              Conversations
            </span>
          </div>
        </div>

        <div className="flex items-center gap-1">
          {onToggleCollapse && (
            <button
              onClick={onToggleCollapse}
              className="hidden lg:flex p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/5 transition cursor-pointer"
              title={isCollapsed ? 'Expand Sidebar' : 'Collapse Sidebar'}
            >
              {isCollapsed ? (
                <PanelLeftOpen className="w-4 h-4" />
              ) : (
                <PanelLeftClose className="w-4 h-4" />
              )}
            </button>
          )}

          {onCloseMobileDrawer && (
            <button
              onClick={onCloseMobileDrawer}
              className="lg:hidden p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/5 transition cursor-pointer"
              title="Close Menu"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>
      </div>

      {/* Action Buttons & Search */}
      <div className="p-3 space-y-2.5 shrink-0">
        <button
          id="otl-btn-new-chat"
          onClick={() => {
            onNewChat();
            if (onCloseMobileDrawer) onCloseMobileDrawer();
          }}
          className="w-full py-2.5 px-3.5 rounded-xl bg-gradient-to-r from-[#133E87] to-[#0B1D51] hover:from-cyan-600 hover:to-[#133E87] border border-cyan-400/40 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-[0_0_15px_rgba(93,226,231,0.2)] hover:shadow-[0_0_20px_rgba(93,226,231,0.35)] transition cursor-pointer active:scale-[0.98]"
        >
          <Plus className="w-4 h-4 text-cyan-300" />
          <span>New Chat</span>
        </button>

        {/* Search Bar */}
        <div className="relative">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            id="otl-sidebar-search-input"
            type="text"
            value={searchQuery}
            onChange={e => onSearchChange(e.target.value)}
            placeholder="Search conversations..."
            className="w-full pl-8 pr-7 py-1.5 rounded-xl bg-slate-900/90 border border-white/10 focus:border-cyan-400 text-xs text-slate-200 placeholder-slate-400 focus:outline-none transition"
          />
          {searchQuery && (
            <button
              onClick={() => onSearchChange('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
            >
              <X className="w-3 h-3" />
            </button>
          )}
        </div>
      </div>

      {/* Conversation List */}
      <div className="flex-1 overflow-y-auto px-2.5 pb-3 space-y-4 scrollbar-thin text-xs">
        {filteredList.length === 0 ? (
          <div className="p-6 text-center text-slate-400 space-y-2">
            <MessageSquare className="w-6 h-6 mx-auto text-slate-400" />
            <p className="text-xs">
              {searchQuery ? 'No matching conversations' : 'No past conversations yet'}
            </p>
            {searchQuery && (
              <button
                onClick={() => onSearchChange('')}
                className="text-[11px] text-cyan-400 hover:underline cursor-pointer"
              >
                Clear search
              </button>
            )}
          </div>
        ) : (
          Object.entries(grouped).map(([category, convs]) => {
            if (convs.length === 0) return null;
            return (
              <div key={category} className="space-y-1">
                <div className="px-2 py-1 text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                  <Calendar className="w-2.5 h-2.5" />
                  <span>{category}</span>
                </div>

                <div className="space-y-0.5">
                  {convs.map(conv => {
                    const isActive = conv.id === activeConversationId;
                    const titleText = getDisplayConversationTitle(conv);
                    return (
                      <div
                        key={conv.id}
                        id={`conv-item-${conv.id}`}
                        className={`group relative rounded-xl transition flex items-center justify-between p-2.5 cursor-pointer ${
                          isActive
                            ? 'bg-cyan-950/60 border border-cyan-500/40 text-cyan-100 shadow-sm'
                            : 'hover:bg-white/5 text-slate-300 hover:text-white border border-transparent'
                        }`}
                        onClick={() => {
                          onSelectConversation(conv.id);
                          if (onCloseMobileDrawer) onCloseMobileDrawer();
                        }}
                      >
                        <div className="flex items-center gap-2.5 min-w-0 flex-1 pr-1.5">
                          <MessageSquare
                            className={`w-4 h-4 shrink-0 ${
                              isActive ? 'text-cyan-400' : 'text-slate-400 group-hover:text-slate-300'
                            }`}
                          />
                          <span
                            className={`text-xs font-medium truncate flex-1 ${
                              isActive ? 'text-white' : 'text-slate-200'
                            }`}
                            title={titleText}
                          >
                            {titleText}
                          </span>

                          {conv.unreadCount && conv.unreadCount > 0 ? (
                            <span className="inline-block px-1.5 py-0.5 rounded-full bg-cyan-500 text-slate-950 text-[9px] font-black shrink-0">
                              {conv.unreadCount}
                            </span>
                          ) : null}
                        </div>

                        {/* Delete Conversation Button */}
                        <div className="shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button
                            id={`delete-conv-${conv.id}`}
                            onClick={e => {
                              e.stopPropagation();
                              setConfirmDeleteId(conv.id);
                            }}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 transition cursor-pointer"
                            title="Delete conversation"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Bottom User / Session Bar */}
      <div className="p-3 border-t border-white/10 bg-slate-950/60 shrink-0 flex items-center justify-between gap-2 text-xs">
        <div className="flex items-center gap-2 min-w-0">
          <div className="w-7 h-7 rounded-full bg-cyan-500/20 border border-cyan-500/30 flex items-center justify-center text-cyan-300 font-bold shrink-0">
            {isAuthenticated && currentUser?.name ? (
              currentUser.name.charAt(0).toUpperCase()
            ) : (
              <User className="w-3.5 h-3.5" />
            )}
          </div>
          <div className="truncate">
            <span className="block font-bold text-slate-200 text-xs truncate">
              {isAuthenticated ? currentUser?.name || 'Registered User' : 'Guest Visitor'}
            </span>
            <span className="block text-[10px] text-slate-400 truncate">
              {isAuthenticated ? currentUser?.email || 'Logged In' : 'Temporary Session'}
            </span>
          </div>
        </div>

        <span
          className={`text-[9px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider shrink-0 ${
            isAuthenticated
              ? 'bg-emerald-500/20 border border-emerald-500/30 text-emerald-300'
              : 'bg-amber-500/20 border border-amber-500/30 text-amber-300'
          }`}
        >
          {isAuthenticated ? 'User' : 'Guest'}
        </span>
      </div>

      {/* Delete Confirmation Modal */}
      <AnimatePresence>
        {confirmDeleteId && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="w-full max-w-sm rounded-2xl bg-slate-900 border border-white/15 p-5 shadow-2xl space-y-4 text-slate-200"
            >
              <div className="flex items-center gap-3 text-rose-400">
                <div className="p-2 rounded-xl bg-rose-500/20 border border-rose-500/30">
                  <AlertCircle className="w-5 h-5 text-rose-400" />
                </div>
                <div>
                  <h3 className="font-bold text-sm text-white">Delete Conversation?</h3>
                  <p className="text-xs text-slate-400">This action cannot be undone.</p>
                </div>
              </div>

              <p className="text-xs text-slate-300 leading-relaxed">
                Are you sure you want to delete this conversation and all its messages from your history?
              </p>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  onClick={() => setConfirmDeleteId(null)}
                  className="px-3.5 py-1.5 rounded-xl bg-white/10 hover:bg-white/15 text-slate-300 text-xs font-semibold transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  onClick={() => {
                    if (confirmDeleteId) {
                      onDeleteConversation(confirmDeleteId);
                      setConfirmDeleteId(null);
                    }
                  }}
                  className="px-3.5 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold transition shadow cursor-pointer"
                >
                  Delete
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );

  // Mini rail sidebar when collapsed (ChatGPT-style)
  const miniSidebarContent = (
    <div className="flex flex-col h-full w-[60px] bg-[#081226] border-r border-white/10 text-slate-200 select-none items-center justify-between py-3.5">
      {/* Top group: OTL Logo (hover reveals expand icon), New Chat, Search, Messages */}
      <div className="flex flex-col items-center gap-3.5 w-full">
        {/* Top: OTL Animated Logo by default. On hover: shows the sidebar toggle/expand icon! */}
        <div className="relative group flex justify-center items-center w-full px-2">
          <button
            id="otl-mini-btn-expand"
            onClick={onToggleCollapse}
            className="w-10 h-10 rounded-xl flex items-center justify-center text-slate-300 hover:text-white hover:bg-white/10 transition-all cursor-pointer relative"
            title="Expand Sidebar"
          >
            {/* Default: Official Animated OTL Logo */}
            <div className="transition-all duration-200 group-hover:opacity-0 group-hover:scale-75 flex items-center justify-center pointer-events-none">
              <OtlLogo size={28} animate={true} />
            </div>

            {/* On Hover: Sidebar expand icon (red-marked button in screenshot) */}
            <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 group-hover:scale-100 transition-all duration-200 text-cyan-400 pointer-events-none">
              <PanelLeftOpen className="w-5 h-5" />
            </div>
          </button>

          {/* Floating Tooltip */}
          <span className="absolute left-full ml-3 px-2.5 py-1 rounded-lg bg-slate-900 border border-white/15 text-[11px] font-medium text-white whitespace-nowrap opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity z-50 shadow-xl">
            Expand sidebar
          </span>
        </div>

        {/* 1st Icon below logo: New Chat */}
        <div className="relative group flex justify-center items-center w-full px-2">
          <button
            id="otl-mini-btn-new-chat"
            onClick={onNewChat}
            className="w-10 h-10 rounded-xl flex items-center justify-center text-slate-300 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
            title="New Chat"
          >
            <SquarePen className="w-5 h-5 group-hover:text-cyan-400 transition-colors" />
          </button>
          <span className="absolute left-full ml-3 px-2.5 py-1 rounded-lg bg-slate-900 border border-white/15 text-[11px] font-medium text-white whitespace-nowrap opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity z-50 shadow-xl">
            New chat
          </span>
        </div>

        {/* 2nd Icon below logo: Search */}
        <div className="relative group flex justify-center items-center w-full px-2">
          <button
            id="otl-mini-btn-search"
            onClick={() => {
              if (onToggleCollapse) onToggleCollapse();
              setTimeout(() => {
                document.getElementById('otl-sidebar-search-input')?.focus();
              }, 150);
            }}
            className="w-10 h-10 rounded-xl flex items-center justify-center text-slate-300 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
            title="Search conversations"
          >
            <Search className="w-5 h-5 group-hover:text-cyan-400 transition-colors" />
          </button>
          <span className="absolute left-full ml-3 px-2.5 py-1 rounded-lg bg-slate-900 border border-white/15 text-[11px] font-medium text-white whitespace-nowrap opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity z-50 shadow-xl">
            Search
          </span>
        </div>

        {/* Note: 3rd icon in Screenshot 2 was explicitly crossed out with RED X - excluded */}

        {/* 4th Icon: Chat Conversations */}
        <div className="relative group flex justify-center items-center w-full px-2">
          <button
            id="otl-mini-btn-conversations"
            onClick={onToggleCollapse}
            className="w-10 h-10 rounded-xl flex items-center justify-center text-slate-300 hover:text-white hover:bg-white/10 transition-colors cursor-pointer relative"
            title="Conversations"
          >
            <MessageSquare className="w-5 h-5 group-hover:text-cyan-400 transition-colors" />
            {conversations.some(c => (c.unreadCount || 0) > 0) && (
              <span className="absolute top-2 right-2 w-2 h-2 rounded-full bg-cyan-400 ring-2 ring-[#081226]" />
            )}
          </button>
          <span className="absolute left-full ml-3 px-2.5 py-1 rounded-lg bg-slate-900 border border-white/15 text-[11px] font-medium text-white whitespace-nowrap opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity z-50 shadow-xl">
            Conversations
          </span>
        </div>
      </div>

      {/* Bottom: User Avatar / Guest Profile (like screenshot 2 bottom) */}
      <div className="relative group flex justify-center items-center w-full px-2 pt-2 border-t border-white/10">
        <div
          className="w-9 h-9 rounded-full bg-gradient-to-tr from-[#133E87] to-cyan-500 flex items-center justify-center text-white text-xs font-black shadow cursor-pointer ring-1 ring-white/10 group-hover:ring-cyan-400 transition-all"
          title={isAuthenticated ? currentUser?.name || 'Registered User' : 'Guest Visitor'}
        >
          {isAuthenticated && currentUser?.name ? (
            currentUser.name.charAt(0).toUpperCase()
          ) : (
            <User className="w-4 h-4" />
          )}
        </div>
        <span className="absolute left-full ml-3 px-2.5 py-1 rounded-lg bg-slate-900 border border-white/15 text-[11px] font-medium text-white whitespace-nowrap opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity z-50 shadow-xl">
          {isAuthenticated ? currentUser?.name || 'User' : 'Guest Visitor'}
        </span>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop Persistent Sidebar */}
      <div
        id="otl-support-desktop-sidebar"
        className={`hidden lg:block h-full shrink-0 transition-all duration-300 ${
          isCollapsed ? 'w-[60px]' : 'w-[280px] xl:w-[320px]'
        }`}
      >
        {isCollapsed ? miniSidebarContent : sidebarContent}
      </div>

      {/* Mobile Drawer */}
      <AnimatePresence>
        {isMobileDrawerOpen && (
          <div
            id="otl-support-mobile-drawer"
            className="lg:hidden fixed inset-0 z-50 flex"
          >
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={onCloseMobileDrawer}
              className="fixed inset-0 bg-black/60 backdrop-blur-xs"
            />

            {/* Sliding Drawer Container */}
            <motion.div
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 250 }}
              className="relative w-[85%] max-w-[320px] h-full shadow-2xl z-10"
            >
              {sidebarContent}
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
};
