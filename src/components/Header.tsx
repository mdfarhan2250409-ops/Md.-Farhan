import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import { useAuth } from '../context/AuthContext';
import { Search, Menu, Mail, User, Bell, ArrowLeft } from 'lucide-react';
import { ResourceCategory } from '../types';
import { OtlLogo } from './OtlLogo';
import { CategoryIcon } from './CategoryIcon';
import { AnimatedAvatar } from './common/AnimatedAvatar';

const NOTIFS_SEEN_KEY = 'OTL_SEEN_NOTIFICATIONS_V2';

export const Header: React.FC = () => {
  const {
    siteSettings,
    categories,
    selectedCategory,
    setSelectedCategory,
    setIsSearchModalOpen,
    setIsContactModalOpen,
    isNotificationOpen,
    setIsNotificationOpen,
    setIsMobileSidebarOpen,
    resources,
    isAdminOpen,
    setIsAdminOpen
  } = useApp();

  const {
    currentUser,
    isAuthenticated,
    setIsAuthModalOpen,
    setIsProfileModalOpen
  } = useAuth();

  // Calculate unread notifications count
  const [unreadCount, setUnreadCount] = useState<number>(0);

  // Helper to get item unique key
  const getItemKey = (res: { id: string; updatedAt?: string; createdAt?: string }) => {
    return `${res.id}_${res.updatedAt || res.createdAt || ''}`;
  };

  useEffect(() => {
    try {
      const saved = localStorage.getItem(NOTIFS_SEEN_KEY);
      const seenKeys: string[] = saved ? JSON.parse(saved) : [];
      const unread = resources.filter(r => !seenKeys.includes(getItemKey(r))).length;
      setUnreadCount(unread);
    } catch {
      setUnreadCount(0);
    }
  }, [resources, isNotificationOpen]);

  const handleOpenNotifications = () => {
    setIsNotificationOpen(true);
    // Mark all current products as seen immediately like YouTube
    try {
      const currentKeys = resources.map(r => getItemKey(r));
      localStorage.setItem(NOTIFS_SEEN_KEY, JSON.stringify(currentKeys));
      setUnreadCount(0);
    } catch (e) {
      console.warn('Failed to save seen notifications', e);
    }
  };

  const handleCategoryClick = (cat: ResourceCategory | 'all') => {
    setSelectedCategory(cat);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleAccountClick = () => {
    if (isAuthenticated && currentUser) {
      setIsProfileModalOpen(true);
    } else {
      setIsAuthModalOpen(true, 'login');
    }
  };

  return (
    <header className="sticky top-0 z-40 w-full glass-nav transition-all">
      <div className="px-3 sm:px-4 lg:px-8 py-3 sm:py-3.5">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-2 sm:gap-4">
        
        {/* Left: Hamburger (Tablet Only: sm to lg) & Brand Logo */}
        <div className="flex items-center space-x-2.5 sm:space-x-3 shrink-0">
          {/* Hamburger Menu Button (Visible only on Tablet: sm to lg, hidden on mobile < sm) */}
          <button
            onClick={() => setIsMobileSidebarOpen(true)}
            className="hidden sm:inline-flex lg:hidden p-2 sm:p-2.5 rounded-xl bg-slate-950/70 hover:bg-slate-900 text-slate-300 hover:text-white border border-white/15 hover:border-[#5DE2E7]/40 active:scale-95 transition-all cursor-pointer shadow-inner"
            aria-label="Open Navigation Menu"
            title="Navigation Menu"
          >
            <Menu className="w-5 h-5 text-slate-200" />
          </button>

          {/* Logo */}
          <Link
            to="/"
            onClick={() => handleCategoryClick('all')}
            className="flex items-center space-x-2 sm:space-x-2.5 cursor-pointer group"
          >
            <OtlLogo size="sm" animate={true} />
            <div>
              <div className="flex items-center space-x-1.5">
                <span className="font-extrabold text-lg sm:text-xl tracking-tight text-white group-hover:text-[#5DE2E7] transition-colors">
                  {siteSettings.logoText || 'OTL'}
                </span>
                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-[#5DE2E7]/20 text-[#5DE2E7] border border-[#5DE2E7]/30 uppercase tracking-widest">
                  Hub
                </span>
              </div>
              <span className="text-[9px] sm:text-[10px] text-slate-400 block -mt-1 tracking-wider">
                Online Task Lab
              </span>
            </div>
          </Link>
        </div>

        {/* Center: Navigation Menu (Desktop Only >= lg) */}
        <nav className="hidden lg:flex items-center space-x-1 bg-slate-900/40 p-1.5 rounded-2xl border border-white/10 overflow-x-auto max-w-[45vw] xl:max-w-[50vw] no-scrollbar">
          <Link
            to="/"
            onClick={() => handleCategoryClick('all')}
            className={`px-3 lg:px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all whitespace-nowrap ${
              selectedCategory === 'all'
                ? 'bg-gradient-to-r from-[#133E87] to-cyan-500/80 text-white shadow-[0_0_12px_rgba(93,226,231,0.4)]'
                : 'text-slate-300 hover:text-white hover:bg-white/5'
            }`}
          >
            Home
          </Link>

          {categories.map(cat => {
            const isActive = selectedCategory === cat.id;
            return (
              <Link
                key={cat.id}
                to={`/category/${cat.id}`}
                onClick={() => handleCategoryClick(cat.id)}
                className={`px-3 lg:px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all flex items-center gap-1.5 whitespace-nowrap ${
                  isActive
                    ? 'bg-gradient-to-r from-[#133E87] to-cyan-500/80 text-white shadow-[0_0_12px_rgba(93,226,231,0.4)]'
                    : 'text-slate-300 hover:text-white hover:bg-white/5'
                }`}
              >
                <CategoryIcon name={cat.icon || cat.id} className="w-3.5 h-3.5 text-[#5DE2E7]" />
                <span>{cat.name}</span>
              </Link>
            );
          })}

          <Link
            to="/contact"
            onClick={() => setIsContactModalOpen(true)}
            className="px-3 lg:px-3.5 py-1.5 rounded-xl text-xs font-semibold text-slate-300 hover:text-white hover:bg-white/5 transition-all flex items-center gap-1.5 whitespace-nowrap"
          >
            <Mail className="w-3.5 h-3.5 text-[#5DE2E7]" />
            Contact
          </Link>
        </nav>

        {/* Right: Actions (Search -> Notification Bell -> Profile/Account) */}
        <div className="flex items-center space-x-1.5 sm:space-x-2 lg:space-x-2.5 shrink-0">
          {/* 1. Search Bar (Hidden on Mobile < sm, visible on Tablet/Desktop >= sm) */}
          <Link
            to="/search"
            onClick={() => setIsSearchModalOpen(true)}
            className="hidden sm:flex px-2.5 sm:px-3 py-2 rounded-xl bg-slate-950/70 hover:bg-slate-900 text-slate-300 hover:text-white border border-white/15 hover:border-[#5DE2E7]/50 transition-all items-center gap-2 group shadow-inner w-36 md:w-40 lg:w-44 justify-between cursor-pointer"
            title="Search Resources"
          >
            <div className="flex items-center gap-1.5 overflow-hidden">
              <Search className="w-4 h-4 text-[#5DE2E7] group-hover:scale-110 transition-transform shrink-0" />
              <span className="text-xs text-slate-400 group-hover:text-slate-200 font-medium truncate">
                Search...
              </span>
            </div>
            <kbd className="hidden xl:inline-flex items-center px-1.5 py-0.5 text-[10px] font-mono text-slate-400 bg-white/5 rounded border border-white/10 group-hover:border-[#5DE2E7]/30 group-hover:text-[#5DE2E7]">
              ⌘K
            </kbd>
          </Link>

          {/* 2. Notification Bell (Visible across Mobile, Tablet & Desktop) */}
          <button
            onClick={handleOpenNotifications}
            className="relative p-2 sm:p-2.5 rounded-xl bg-slate-950/70 hover:bg-slate-900 text-slate-300 hover:text-white border border-white/15 hover:border-[#5DE2E7]/50 transition-all cursor-pointer group shadow-inner"
            aria-label="View Notifications"
            title="Latest uploads & notifications"
          >
            <Bell className="w-4 h-4 sm:w-4 sm:h-4 text-[#5DE2E7] group-hover:scale-110 transition-transform" />
            {unreadCount > 0 && (
              <span className="absolute -top-1 -right-1 min-w-[17px] h-[17px] px-1 rounded-full bg-gradient-to-r from-red-500 to-rose-600 text-white text-[9px] font-black flex items-center justify-center border-2 border-[#060B1E] shadow-[0_0_10px_rgba(239,68,68,0.7)]">
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}
          </button>

          {/* 3. Exit Admin Button (Only visible when user is currently inside Admin Panel via /admin) */}
          {isAdminOpen && (
            <>
              {/* Mobile Exit Admin */}
              <button
                onClick={() => setIsAdminOpen(false)}
                className="sm:hidden p-2 rounded-xl border transition-all cursor-pointer shadow-md bg-cyan-500/20 text-[#5DE2E7] border-[#5DE2E7]"
                title="Exit Admin Panel"
                aria-label="Exit Admin Panel"
              >
                <ArrowLeft className="w-4 h-4" />
              </button>

              {/* Desktop Exit Admin */}
              <button
                onClick={() => setIsAdminOpen(false)}
                className="hidden sm:flex px-2.5 sm:px-3 py-1.5 sm:py-2 rounded-xl text-xs font-bold items-center gap-1.5 transition-all shadow-md cursor-pointer border bg-white/10 hover:bg-white/20 text-white border-white/20"
                title="Exit to Main Website"
              >
                <ArrowLeft className="w-3.5 h-3.5 text-[#5DE2E7]" />
                <span>Exit Admin</span>
              </button>
            </>
          )}

          {/* 5. Account / User Profile Button (Hidden on Mobile < sm, visible on Tablet/Desktop >= sm) */}
          <button
            onClick={handleAccountClick}
            className={`hidden sm:flex px-2.5 sm:px-3 py-1.5 sm:py-2 rounded-xl text-xs font-bold items-center gap-2 transition-all shadow-md cursor-pointer ${
              isAuthenticated && currentUser
                ? 'bg-slate-950/80 hover:bg-[#133E87]/80 text-white border border-[#5DE2E7]/40 hover:border-[#5DE2E7] shadow-[0_0_15px_rgba(93,226,231,0.25)]'
                : 'bg-gradient-to-r from-[#133E87] to-cyan-700 hover:from-cyan-600 hover:to-blue-600 text-white border border-[#5DE2E7]/40 shadow-[0_0_15px_rgba(93,226,231,0.2)]'
            }`}
            title={isAuthenticated ? 'Open Account Center' : 'Sign In or Register'}
          >
            {isAuthenticated && currentUser ? (
              <>
                <AnimatedAvatar
                  photoURL={currentUser.photoURL}
                  name={currentUser.firstName || currentUser.username}
                  size="xs"
                  effect={currentUser.avatarAnimationEffect || 'cyber-cyan'}
                  showOnlineIndicator={false}
                  interactive={false}
                  shape="rounded-full"
                />
                <span className="inline-block max-w-[85px] md:max-w-[100px] truncate font-bold text-white">
                  {currentUser.firstName || currentUser.username || currentUser.name || 'Account'}
                </span>
              </>
            ) : (
              <>
                <div className="p-0.5 rounded-full bg-[#5DE2E7]/20 text-[#5DE2E7]">
                  <User className="w-3.5 h-3.5" />
                </div>
                <span>My Account</span>
              </>
            )}
          </button>
        </div>

      </div>
      </div>
    </header>
  );
};


