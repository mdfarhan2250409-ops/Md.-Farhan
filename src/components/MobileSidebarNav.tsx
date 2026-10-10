import React from 'react';
import { Link } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import { useAuth } from '../context/AuthContext';
import { motion, AnimatePresence } from 'motion/react';
import { OtlLogo } from './OtlLogo';
import { BrandIcon } from './BrandIcons';
import { CategoryIcon } from './CategoryIcon';
import { AnimatedAvatar } from './common/AnimatedAvatar';
import {
  X,
  Home,
  Sparkles,
  Flame,
  Mail,
  User,
  ExternalLink
} from 'lucide-react';
import { ResourceCategory } from '../types';

export const MobileSidebarNav: React.FC = () => {
  const {
    siteSettings,
    categories,
    mobileNavSettings,
    isMobileSidebarOpen,
    setIsMobileSidebarOpen,
    selectedCategory,
    setSelectedCategory,
    setIsContactModalOpen,
    activeTag,
    setActiveTag
  } = useApp();

  const {
    currentUser,
    isAuthenticated,
    setIsAuthModalOpen,
    setIsProfileModalOpen
  } = useAuth();

  if (!mobileNavSettings.enabled) return null;

  const handleNavClick = (categoryFilter?: ResourceCategory | 'all' | 'featured' | 'trending', link?: string) => {
    setIsMobileSidebarOpen(false);

    if (link === '#account') {
      if (isAuthenticated && currentUser) {
        setIsProfileModalOpen(true);
      } else {
        setIsAuthModalOpen(true, 'login');
      }
      return;
    }

    if (link === '#contact') {
      setIsContactModalOpen(true);
      return;
    }

    if (link && link.startsWith('http')) {
      window.open(link, '_blank');
      return;
    }

    if (categoryFilter === 'featured') {
      setSelectedCategory('all');
      setActiveTag('featured');
    } else if (categoryFilter === 'trending') {
      setSelectedCategory('all');
      setActiveTag('trending');
    } else if (categoryFilter) {
      setSelectedCategory(categoryFilter);
      setActiveTag(null);
    }

    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <AnimatePresence>
      {isMobileSidebarOpen && (
        <>
          {/* Backdrop Overlay */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setIsMobileSidebarOpen(false)}
            className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md lg:hidden"
          />

          {/* Drawer Sidebar */}
          <motion.aside
            initial={{ x: '-100%' }}
            animate={{ x: 0 }}
            exit={{ x: '-100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 220 }}
            className="fixed top-0 left-0 bottom-0 z-50 w-[85%] max-w-[320px] bg-slate-950 border-r border-white/10 flex flex-col justify-between overflow-hidden lg:hidden"
          >
            {/* Top Bar */}
            <div className="p-4 border-b border-white/10 flex items-center justify-between shrink-0">
              <Link
                to="/"
                onClick={() => {
                  setIsMobileSidebarOpen(false);
                  setSelectedCategory('all');
                }}
                className="flex items-center space-x-2.5"
              >
                <OtlLogo size="sm" />
                <div>
                  <span className="font-extrabold text-base text-white tracking-tight">
                    {siteSettings.logoText || 'OTL'}
                  </span>
                  <span className="text-[9px] text-slate-400 block -mt-1">
                    Online Task Lab
                  </span>
                </div>
              </Link>

              <button
                onClick={() => setIsMobileSidebarOpen(false)}
                className="p-1.5 rounded-xl bg-white/5 text-slate-400 hover:text-white transition-colors"
                aria-label="Close menu"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* User Account / Profile Card (Always visible at top on Tab View and Mobile View) */}
            <div className="p-3 mx-4 mt-3 rounded-2xl bg-gradient-to-r from-[#133E87]/45 via-cyan-950/35 to-[#0B1D51]/55 border border-[#5DE2E7]/35 shadow-[0_4px_20px_rgba(0,0,0,0.4)] shrink-0">
              <button
                onClick={() => handleNavClick(undefined, '#account')}
                className="w-full flex items-center justify-between text-left group cursor-pointer"
                aria-label={isAuthenticated ? 'Open User Profile' : 'Sign in to Account'}
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  {isAuthenticated && currentUser ? (
                    <AnimatedAvatar
                      photoURL={currentUser.photoURL}
                      name={currentUser.firstName || currentUser.username}
                      size="sm"
                      effect={currentUser.avatarAnimationEffect || 'cyber-cyan'}
                      showOnlineIndicator={false}
                      interactive={false}
                      shape="rounded-xl"
                    />
                  ) : (
                    <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-[#133E87] to-cyan-500 flex items-center justify-center text-white text-xs font-black shrink-0 shadow-inner">
                      <User className="w-4 h-4 text-white" />
                    </div>
                  )}
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5">
                      <p className="text-xs font-bold text-white truncate">
                        {isAuthenticated && currentUser
                          ? `${currentUser.firstName || ''} ${currentUser.lastName || ''}`.trim() || currentUser.username || 'My Account'
                          : 'My Account'}
                      </p>
                    </div>
                    <p className="text-[10px] text-cyan-300 truncate">
                      {isAuthenticated && currentUser ? `@${currentUser.username}` : 'Tap to Login or Register'}
                    </p>
                  </div>
                </div>

                <div className="text-[10px] px-2.5 py-1 rounded-lg bg-white/10 group-hover:bg-[#5DE2E7]/20 text-white group-hover:text-[#5DE2E7] border border-white/10 group-hover:border-[#5DE2E7]/40 font-bold transition-all shrink-0 ml-2">
                  {isAuthenticated ? 'Profile' : 'Sign In'}
                </div>
              </button>
            </div>

            {/* Nav Links Body (Scrollable Middle Section) */}
            <div className="p-4 space-y-4 flex-1 min-h-0 overflow-y-auto no-scrollbar">
              <div className="text-[10px] uppercase tracking-widest text-[#5DE2E7]/70 font-bold px-3">
                Main Navigation
              </div>

              <div className="space-y-1">
                <button
                  onClick={() => handleNavClick('all')}
                  className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all ${
                    selectedCategory === 'all' && !activeTag
                      ? 'bg-gradient-to-r from-[#133E87] to-cyan-500/80 text-white shadow-[0_0_15px_rgba(93,226,231,0.4)] border border-[#5DE2E7]/40'
                      : 'text-slate-200 hover:bg-white/5 hover:text-white'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <Home className="w-4 h-4 text-[#5DE2E7]" />
                    <span>Home</span>
                  </div>
                </button>

                {categories.map(cat => {
                  const isActive = selectedCategory === cat.id && !activeTag;
                  return (
                    <button
                      key={cat.id}
                      onClick={() => handleNavClick(cat.id)}
                      className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all ${
                        isActive
                          ? 'bg-gradient-to-r from-[#133E87] to-cyan-500/80 text-white shadow-[0_0_15px_rgba(93,226,231,0.4)] border border-[#5DE2E7]/40'
                          : 'text-slate-200 hover:bg-white/5 hover:text-white'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <CategoryIcon name={cat.icon || cat.id} className="w-4 h-4 text-[#5DE2E7]" />
                        <span>{cat.name}</span>
                      </div>
                    </button>
                  );
                })}

                <div className="my-3 border-t border-white/10" />

                <div className="px-3 py-1 text-[10px] uppercase tracking-widest text-[#5DE2E7]/70 font-bold">
                  Highlights
                </div>

                <button
                  onClick={() => handleNavClick('featured')}
                  className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all ${
                    activeTag === 'featured'
                      ? 'bg-gradient-to-r from-[#133E87] to-cyan-500/80 text-white shadow-[0_0_15px_rgba(93,226,231,0.4)]'
                      : 'text-slate-200 hover:bg-white/5'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <Sparkles className="w-4 h-4 text-amber-400" />
                    <span>Featured Items</span>
                  </div>
                </button>

                <button
                  onClick={() => handleNavClick('trending')}
                  className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all ${
                    activeTag === 'trending'
                      ? 'bg-gradient-to-r from-[#133E87] to-cyan-500/80 text-white shadow-[0_0_15px_rgba(93,226,231,0.4)]'
                      : 'text-slate-200 hover:bg-white/5'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <Flame className="w-4 h-4 text-red-400" />
                    <span>Trending Now</span>
                  </div>
                </button>

                <button
                  onClick={() => handleNavClick(undefined, '#contact')}
                  className="w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-semibold text-slate-200 hover:bg-white/5 transition-all"
                >
                  <Mail className="w-4 h-4 text-[#5DE2E7]" />
                  <span>Contact Support</span>
                </button>

                <button
                  onClick={() => handleNavClick(undefined, '#account')}
                  className="w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-semibold text-slate-200 hover:bg-white/5 transition-all"
                >
                  <User className="w-4 h-4 text-[#5DE2E7]" />
                  <span>{isAuthenticated && currentUser ? 'My Account & Profile' : 'Sign In / Register'}</span>
                </button>
              </div>
            </div>

            {/* Bottom Actions */}
            <div className="p-3.5 border-t border-white/10 bg-slate-950/90 backdrop-blur-md shrink-0">
              <a
                href={siteSettings.telegramChannel}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-[0_0_20px_rgba(93,226,231,0.3)] transition-all"
              >
                <BrandIcon name="telegram" className="w-4 h-4 text-white" />
                <span>Join Official Telegram</span>
              </a>
            </div>
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  );
};

