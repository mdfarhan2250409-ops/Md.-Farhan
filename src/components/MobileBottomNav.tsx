import React from 'react';
import { useApp } from '../context/AppContext';
import { useAuth } from '../context/AuthContext';
import { motion } from 'motion/react';
import { Menu, Search, Home, Mail, User } from 'lucide-react';

export const MobileBottomNav: React.FC = () => {
  const {
    selectedCategory,
    setSelectedCategory,
    activeTag,
    setActiveTag,
    isSearchModalOpen,
    setIsSearchModalOpen,
    isContactModalOpen,
    setIsContactModalOpen,
    isMobileSidebarOpen,
    setIsMobileSidebarOpen,
    isAdminOpen,
    setIsAdminOpen,
    isVerifyEmailPageOpen,
    setIsVerifyEmailPageOpen
  } = useApp();

  const {
    currentUser,
    isAuthenticated,
    isAuthModalOpen,
    setIsAuthModalOpen,
    isProfileModalOpen,
    setIsProfileModalOpen
  } = useAuth();

  // Hide bottom nav inside admin panel view to keep admin workspace clean
  if (isAdminOpen) {
    return null;
  }

  // Active state calculations
  const isMenuTabActive = isMobileSidebarOpen;
  const isSearchTabActive = isSearchModalOpen;
  const isContactTabActive = isContactModalOpen;
  const isProfileTabActive = isAuthModalOpen || isProfileModalOpen;
  const isHomeTabActive =
    selectedCategory === 'all' &&
    activeTag === null &&
    !isMenuTabActive &&
    !isSearchTabActive &&
    !isContactTabActive &&
    !isProfileTabActive &&
    !isVerifyEmailPageOpen;

  // Handlers with smooth state coordination
  const handleMenuClick = () => {
    setIsMobileSidebarOpen(!isMobileSidebarOpen);
  };

  const handleSearchClick = () => {
    setIsMobileSidebarOpen(false);
    setIsSearchModalOpen(true);
  };

  const handleHomeClick = () => {
    setIsMobileSidebarOpen(false);
    setIsSearchModalOpen(false);
    setIsContactModalOpen(false);
    setIsAuthModalOpen(false);
    setIsProfileModalOpen(false);
    setIsVerifyEmailPageOpen(false);
    setSelectedCategory('all');
    setActiveTag(null);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleContactClick = () => {
    setIsMobileSidebarOpen(false);
    setIsContactModalOpen(true);
  };

  const handleProfileClick = () => {
    setIsMobileSidebarOpen(false);
    if (isAuthenticated && currentUser) {
      setIsProfileModalOpen(true);
    } else {
      setIsAuthModalOpen(true, 'login');
    }
  };

  return (
    <nav
      aria-label="Mobile Bottom Navigation"
      className="fixed bottom-3 inset-x-0 z-40 flex justify-center px-3.5 pointer-events-none md:hidden pb-[env(safe-area-inset-bottom,0px)]"
    >
      <div className="pointer-events-auto w-full max-w-[400px] bg-slate-950/85 backdrop-blur-xl border border-white/15 rounded-full px-2 py-1.5 flex items-center justify-between shadow-[0_12px_36px_rgba(0,0,0,0.8),0_0_24px_rgba(93,226,231,0.15)] ring-1 ring-white/5 relative">
        
        {/* 1. MENU */}
        <motion.button
          whileTap={{ scale: 0.88 }}
          onClick={handleMenuClick}
          className={`flex-1 flex flex-col items-center justify-center py-1 rounded-full transition-all relative ${
            isMenuTabActive ? 'text-[#5DE2E7]' : 'text-slate-400 hover:text-slate-200'
          }`}
          aria-label="Open Mobile Menu"
        >
          <div className={`p-1.5 rounded-full transition-all ${isMenuTabActive ? 'bg-[#5DE2E7]/15' : ''}`}>
            <Menu className={`w-5 h-5 transition-transform ${isMenuTabActive ? 'scale-110 stroke-[2.5]' : 'stroke-2'}`} />
          </div>
          <span className={`text-[10px] font-bold tracking-tight -mt-0.5 ${isMenuTabActive ? 'text-[#5DE2E7]' : 'text-slate-400'}`}>
            Menu
          </span>
          {isMenuTabActive && (
            <motion.span
              layoutId="nav-active-dot"
              className="w-1 h-1 rounded-full bg-[#5DE2E7] shadow-[0_0_8px_#5DE2E7] -mt-0.5"
            />
          )}
        </motion.button>

        {/* 2. SEARCH */}
        <motion.button
          whileTap={{ scale: 0.88 }}
          onClick={handleSearchClick}
          className={`flex-1 flex flex-col items-center justify-center py-1 rounded-full transition-all relative ${
            isSearchTabActive ? 'text-[#5DE2E7]' : 'text-slate-400 hover:text-slate-200'
          }`}
          aria-label="Search Resources"
        >
          <div className={`p-1.5 rounded-full transition-all ${isSearchTabActive ? 'bg-[#5DE2E7]/15' : ''}`}>
            <Search className={`w-5 h-5 transition-transform ${isSearchTabActive ? 'scale-110 stroke-[2.5]' : 'stroke-2'}`} />
          </div>
          <span className={`text-[10px] font-bold tracking-tight -mt-0.5 ${isSearchTabActive ? 'text-[#5DE2E7]' : 'text-slate-400'}`}>
            Search
          </span>
          {isSearchTabActive && (
            <motion.span
              layoutId="nav-active-dot"
              className="w-1 h-1 rounded-full bg-[#5DE2E7] shadow-[0_0_8px_#5DE2E7] -mt-0.5"
            />
          )}
        </motion.button>

        {/* 3. HOME (Center Prominent Button) */}
        <div className="relative px-1 -mt-5 flex flex-col items-center">
          <motion.button
            whileTap={{ scale: 0.88 }}
            onClick={handleHomeClick}
            className={`w-[52px] h-[52px] rounded-full flex items-center justify-center border-2 transition-all shadow-xl cursor-pointer ${
              isHomeTabActive
                ? 'bg-gradient-to-tr from-[#133E87] via-cyan-500 to-blue-600 border-white/60 text-white shadow-[0_0_24px_rgba(93,226,231,0.7)] ring-4 ring-[#5DE2E7]/20 scale-105'
                : 'bg-slate-900/95 border-white/20 text-slate-300 hover:text-white shadow-[0_4px_16px_rgba(0,0,0,0.5)]'
            }`}
            aria-label="Go to Homepage"
          >
            <Home
              className={`w-6 h-6 transition-transform ${
                isHomeTabActive ? 'text-white scale-110 stroke-[2.5]' : 'text-slate-300 stroke-2'
              }`}
            />
          </motion.button>
          <span
            className={`text-[10px] font-black tracking-tight mt-0.5 ${
              isHomeTabActive ? 'text-[#5DE2E7] drop-shadow-[0_0_8px_rgba(93,226,231,0.5)]' : 'text-slate-400'
            }`}
          >
            Home
          </span>
        </div>

        {/* 4. CONTACT */}
        <motion.button
          whileTap={{ scale: 0.88 }}
          onClick={handleContactClick}
          className={`flex-1 flex flex-col items-center justify-center py-1 rounded-full transition-all relative ${
            isContactTabActive ? 'text-[#5DE2E7]' : 'text-slate-400 hover:text-slate-200'
          }`}
          aria-label="Contact Support"
        >
          <div className={`p-1.5 rounded-full transition-all ${isContactTabActive ? 'bg-[#5DE2E7]/15' : ''}`}>
            <Mail className={`w-5 h-5 transition-transform ${isContactTabActive ? 'scale-110 stroke-[2.5]' : 'stroke-2'}`} />
          </div>
          <span className={`text-[10px] font-bold tracking-tight -mt-0.5 ${isContactTabActive ? 'text-[#5DE2E7]' : 'text-slate-400'}`}>
            Contact
          </span>
          {isContactTabActive && (
            <motion.span
              layoutId="nav-active-dot"
              className="w-1 h-1 rounded-full bg-[#5DE2E7] shadow-[0_0_8px_#5DE2E7] -mt-0.5"
            />
          )}
        </motion.button>

        {/* 5. PROFILE / USER */}
        <motion.button
          whileTap={{ scale: 0.88 }}
          onClick={handleProfileClick}
          className={`flex-1 flex flex-col items-center justify-center py-1 rounded-full transition-all relative ${
            isProfileTabActive ? 'text-[#5DE2E7]' : 'text-slate-400 hover:text-slate-200'
          }`}
          aria-label="Account"
        >
          <div className={`p-1.5 rounded-full transition-all ${isProfileTabActive ? 'bg-[#5DE2E7]/15' : ''}`}>
            <User className={`w-5 h-5 transition-transform ${isProfileTabActive ? 'scale-110 stroke-[2.5]' : 'stroke-2'}`} />
          </div>
          <span className={`text-[10px] font-bold tracking-tight -mt-0.5 ${isProfileTabActive ? 'text-[#5DE2E7]' : 'text-slate-400'}`}>
            You
          </span>
          {isProfileTabActive && (
            <motion.span
              layoutId="nav-active-dot"
              className="w-1 h-1 rounded-full bg-[#5DE2E7] shadow-[0_0_8px_#5DE2E7] -mt-0.5"
            />
          )}
        </motion.button>

      </div>
    </nav>
  );
};
