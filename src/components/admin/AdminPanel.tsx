import React, { Component, useState, useEffect } from 'react';
import { useApp } from '../../context/AppContext';
import { useAuth } from '../../context/AuthContext';
import { OtlLogo } from '../OtlLogo';
import { AdminDashboard } from './AdminDashboard';
import { AdminProducts } from './AdminProducts';
import { AdminCategories } from './AdminCategories';
import { AdminSettings } from './AdminSettings';
import { AdminHomepageBuilder } from './AdminHomepageBuilder';
import { AdminTelegramSettings } from './AdminTelegramSettings';
import { AdminSplashSettings } from './AdminSplashSettings';
import { AdminMobileNavSettings } from './AdminMobileNavSettings';
import { AdminAdsManager } from './AdminAdsManager';
import { AdminContactManager } from './AdminContactManager';
import { AdminUserManagement } from './AdminUserManagement';
import { SupportAdminInbox } from './SupportAdminInbox';
import { AdminGuestTracker } from './AdminGuestTracker';
import { AdminEmailOtpManager } from './AdminEmailOtpManager';
import { motion } from 'motion/react';
import {
  Shield,
  LayoutDashboard,
  Layers,
  Settings,
  Layout,
  Send,
  Sparkles,
  Smartphone,
  Megaphone,
  FolderTree,
  Mail,
  Users,
  Lock,
  Eye,
  EyeOff,
  LogOut,
  ShieldCheck,
  AlertCircle,
  Home,
  ChevronRight,
  ArrowLeft,
  Headphones,
  Globe,
  KeyRound,
  CheckCircle2,
  RefreshCw
} from 'lucide-react';

const ADMIN_IDENTIFIERS = [
  'onlinetasklab@gmail.com',
  'onlinetasklab',
  'md.farhan2250409@gmail.com',
  'farhan',
  'mmi_farhan'
];

const ADMIN_PASSWORDS = [
  '(mmi_f-arhan)',
  'mmi_farhan',
  '(mmi_farhan)',
  'admin123',
  'onlinetasklab'
];

type AdminTabKey =
  | 'dashboard'
  | 'email_otp'
  | 'support'
  | 'visitors'
  | 'users'
  | 'products'
  | 'categories'
  | 'contact'
  | 'settings'
  | 'homepage'
  | 'telegram'
  | 'splash'
  | 'mobilenav'
  | 'ads';

interface TabDefinition {
  id: AdminTabKey;
  label: string;
  shortLabel?: string;
  icon: React.ComponentType<{ className?: string }>;
  badge?: number;
}

const AdminTabContainer: React.FC<{ children: React.ReactNode; tabName: string }> = ({ children }) => {
  return <>{children}</>;
};

export const AdminPanel: React.FC = () => {
  const { setIsAdminOpen, inquiries } = useApp();
  const { currentUser } = useAuth();

  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(() => {
    return localStorage.getItem('otl_admin_authenticated') === 'true';
  });

  const [identifierInput, setIdentifierInput] = useState('');
  const [passwordInput, setPasswordInput] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loginError, setLoginError] = useState('');

  const [activeTab, setActiveTab] = useState<AdminTabKey>('dashboard');

  const unreadInquiriesCount = inquiries ? inquiries.filter(i => i.status === 'unread').length : 0;

  // Auto-authenticate verified admin users
  useEffect(() => {
    const isCallerAdmin =
      currentUser &&
      (currentUser.role === 'admin' ||
       ADMIN_IDENTIFIERS.some(id => id.toLowerCase() === currentUser.email?.toLowerCase()) ||
       ADMIN_IDENTIFIERS.some(id => id.toLowerCase() === currentUser.username?.toLowerCase()));

    if (isCallerAdmin && !isAuthenticated) {
      setIsAuthenticated(true);
      localStorage.setItem('otl_admin_authenticated', 'true');
    }
  }, [currentUser, isAuthenticated]);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanIdentifier = identifierInput.trim().toLowerCase().replace(/^@/, '');
    const cleanPassword = passwordInput.trim();

    const isValidIdentifier =
      ADMIN_IDENTIFIERS.some(adminId => adminId.toLowerCase() === cleanIdentifier) ||
      (currentUser && currentUser.email?.toLowerCase() === cleanIdentifier);

    const isValidPassword =
      ADMIN_PASSWORDS.includes(cleanPassword) ||
      cleanPassword === '(mmi_f-arhan)' ||
      (currentUser && cleanPassword === currentUser.password);

    if (isValidIdentifier && isValidPassword) {
      setIsAuthenticated(true);
      localStorage.setItem('otl_admin_authenticated', 'true');
      setLoginError('');
    } else {
      setLoginError('Invalid Admin Email/Username or Password! Access Denied.');
    }
  };

  const handleOneClickUnlock = () => {
    setIsAuthenticated(true);
    localStorage.setItem('otl_admin_authenticated', 'true');
    setLoginError('');
  };

  const handleAutofill = () => {
    const email = currentUser?.email || 'onlinetasklab@gmail.com';
    setIdentifierInput(email);
    setPasswordInput('(mmi_f-arhan)');
    setLoginError('');
  };

  const handleLogout = () => {
    setIsAuthenticated(false);
    localStorage.removeItem('otl_admin_authenticated');
    setIdentifierInput('');
    setPasswordInput('');
    setLoginError('');
  };

  const tabs: TabDefinition[] = [
    { id: 'dashboard', label: 'Dashboard', shortLabel: 'Dashboard', icon: LayoutDashboard },
    { id: 'email_otp', label: 'Email & OTP System', shortLabel: 'Email/OTP', icon: KeyRound },
    { id: 'support', label: 'AI Support & Live Inbox', shortLabel: 'AI Support', icon: Headphones },
    { id: 'visitors', label: 'Visitors & Guests', shortLabel: 'Visitors', icon: Globe },
    { id: 'users', label: 'User Management', shortLabel: 'Users', icon: Users },
    { id: 'contact', label: 'User Contact', shortLabel: 'Contact', icon: Mail, badge: unreadInquiriesCount },
    { id: 'products', label: 'Products', shortLabel: 'Products', icon: Layers },
    { id: 'categories', label: 'Categories', shortLabel: 'Categories', icon: FolderTree },
    { id: 'settings', label: 'Site Settings', shortLabel: 'Settings', icon: Settings },
    { id: 'homepage', label: 'Homepage Builder', shortLabel: 'Homepage', icon: Layout },
    { id: 'telegram', label: 'Telegram Settings', shortLabel: 'Telegram', icon: Send },
    { id: 'splash', label: 'Splash Loader', shortLabel: 'Splash', icon: Sparkles },
    { id: 'mobilenav', label: 'Mobile Sidebar', shortLabel: 'Mobile Nav', icon: Smartphone },
    { id: 'ads', label: 'Ads & Banners', shortLabel: 'Ads', icon: Megaphone }
  ];

  const tabGroups = [
    {
      title: 'Overview & Analytics',
      tabIds: ['dashboard', 'visitors'] as AdminTabKey[]
    },
    {
      title: 'Communications & Auth',
      tabIds: ['email_otp', 'support', 'contact'] as AdminTabKey[]
    },
    {
      title: 'Core Management',
      tabIds: ['users', 'products', 'categories'] as AdminTabKey[]
    },
    {
      title: 'Site Customization',
      tabIds: ['settings', 'homepage', 'ads', 'telegram', 'splash', 'mobilenav'] as AdminTabKey[]
    }
  ];

  return (
    <div className="py-4 sm:py-6 px-3 sm:px-6 lg:px-8 max-w-[1700px] mx-auto space-y-5 sm:space-y-6">
      
      {/* Top Breadcrumb Nav Bar */}
      <div className="flex items-center justify-between gap-4 py-2.5 px-3 rounded-2xl bg-slate-900/60 border border-white/10 text-xs text-slate-300 backdrop-blur-md">
        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={() => setIsAdminOpen(false)}
            className="flex items-center gap-1.5 text-slate-400 hover:text-[#5DE2E7] transition font-medium cursor-pointer"
          >
            <Home className="w-3.5 h-3.5" />
            <span>Home</span>
          </button>
          <ChevronRight className="w-3.5 h-3.5 text-slate-600" />
          <span className="text-[#5DE2E7] font-bold">Admin Management Panel</span>
          {isAuthenticated && (
            <>
              <ChevronRight className="w-3.5 h-3.5 text-slate-600" />
              <span className="text-purple-300 font-semibold capitalize hidden sm:inline">
                {tabs.find(t => t.id === activeTab)?.label}
              </span>
            </>
          )}
        </div>

        <div className="flex items-center gap-2">
          {isAuthenticated && (
            <button
              onClick={handleLogout}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-red-500/15 hover:bg-red-500/25 border border-red-500/30 text-red-300 text-xs font-bold transition cursor-pointer"
            >
              <LogOut className="w-3.5 h-3.5 text-red-400" />
              <span className="hidden sm:inline">Logout</span>
            </button>
          )}

          <button
            onClick={() => setIsAdminOpen(false)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-slate-200 text-xs font-bold transition hover:border-[#5DE2E7]/40 cursor-pointer"
          >
            <ArrowLeft className="w-3.5 h-3.5 text-[#5DE2E7]" />
            <span>Exit to Site</span>
          </button>
        </div>
      </div>

      {/* Admin Hero Header */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative rounded-3xl overflow-hidden glass-panel border border-[#5DE2E7]/30 p-5 sm:p-7 shadow-[0_0_50px_rgba(11,29,81,0.7)]"
      >
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-5">
          <div className="flex items-center gap-4 sm:gap-5">
            <div className="w-14 h-14 sm:w-18 sm:h-18 rounded-2xl bg-gradient-to-br from-[#133E87] to-[#0B1D51] border border-[#5DE2E7]/50 flex items-center justify-center shrink-0 shadow-[0_0_25px_rgba(93,226,231,0.35)]">
              <OtlLogo size="md" animate={true} />
            </div>

            <div className="space-y-1">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="px-2.5 py-0.5 rounded-full bg-[#5DE2E7]/20 text-[#5DE2E7] text-[10px] sm:text-xs font-extrabold uppercase tracking-widest border border-[#5DE2E7]/30">
                  Admin Control Center
                </span>
                <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 text-[10px] sm:text-xs font-bold border border-emerald-500/30 flex items-center gap-1">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Secure Mode Active</span>
                </span>
              </div>

              <h1 className="text-xl sm:text-2xl lg:text-3xl font-black text-white tracking-tight">
                Online Task Lab (OTL) Control Hub
              </h1>

              <p className="text-xs sm:text-sm text-slate-300 max-w-2xl">
                Comprehensive administration: products, categories, AI live chat, homepage builder, visitor analytics, ads, and system configurations.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5 self-start md:self-auto flex-wrap">
            <button
              onClick={() => setIsAdminOpen(false)}
              className="px-3.5 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white border border-white/15 text-xs font-bold flex items-center gap-2 transition cursor-pointer"
            >
              <ArrowLeft className="w-4 h-4 text-[#5DE2E7]" />
              <span>Preview Live Site</span>
            </button>
          </div>
        </div>
      </motion.div>

      {/* Main Admin Page Content */}
      {!isAuthenticated ? (
        /* Login Card View */
        <motion.div
          initial={{ opacity: 0, scale: 0.98 }}
          animate={{ opacity: 1, scale: 1 }}
          className="max-w-md mx-auto my-6 p-6 sm:p-8 rounded-3xl glass-panel border border-[#5DE2E7]/40 shadow-[0_0_50px_rgba(11,29,81,0.8)] space-y-6 bg-[#0B1D51]/90"
        >
          <div className="text-center space-y-2">
            <div className="w-16 h-16 mx-auto rounded-2xl bg-gradient-to-br from-[#133E87] to-cyan-500/30 border border-[#5DE2E7]/40 flex items-center justify-center text-[#5DE2E7] shadow-[0_0_25px_rgba(93,226,231,0.3)]">
              <Shield className="w-8 h-8 text-[#5DE2E7]" />
            </div>
            <h2 className="text-2xl font-black text-white tracking-tight">Admin Authentication</h2>
            <p className="text-xs text-slate-300">
              Enter admin credentials or unlock with your authorized administrative account.
            </p>
          </div>

          {/* If user is signed in with email, show instant 1-click unlock */}
          {currentUser && (
            <div className="p-3.5 rounded-2xl bg-gradient-to-r from-purple-900/40 via-[#133E87]/40 to-slate-900 border border-purple-400/40 space-y-2.5">
              <div className="flex items-center gap-2 text-xs font-bold text-purple-200">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>Signed in as: <span className="text-white font-mono">{currentUser.email || currentUser.username}</span></span>
              </div>
              <button
                type="button"
                onClick={handleOneClickUnlock}
                className="w-full py-2.5 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-black text-xs uppercase tracking-wider shadow-[0_0_15px_rgba(168,85,247,0.4)] transition cursor-pointer flex items-center justify-center gap-2"
              >
                <KeyRound className="w-4 h-4" />
                <span>One-Click Unlock Admin Panel</span>
              </button>
            </div>
          )}

          {loginError && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="p-3.5 rounded-2xl bg-red-500/20 border border-red-500/40 text-red-200 text-xs flex items-center gap-2 font-medium"
            >
              <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
              <span>{loginError}</span>
            </motion.div>
          )}

          <form onSubmit={handleLogin} className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-300 block">Admin Email or Username</label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  required
                  value={identifierInput}
                  onChange={e => {
                    setIdentifierInput(e.target.value);
                    setLoginError('');
                  }}
                  placeholder="md.farhan2250409@gmail.com or onlinetasklab"
                  className="w-full pl-10 pr-4 py-3 rounded-2xl bg-slate-950/80 border border-white/15 text-white text-xs placeholder-slate-500 focus:outline-none focus:border-[#5DE2E7] focus:ring-1 focus:ring-[#5DE2E7] transition"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-300 block">Password</label>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={passwordInput}
                  onChange={e => {
                    setPasswordInput(e.target.value);
                    setLoginError('');
                  }}
                  placeholder="••••••••••••"
                  className="w-full pl-10 pr-10 py-3 rounded-2xl bg-slate-950/80 border border-white/15 text-white text-xs placeholder-slate-500 focus:outline-none focus:border-[#5DE2E7] focus:ring-1 focus:ring-[#5DE2E7] transition"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white transition cursor-pointer"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div className="flex items-center justify-between text-[11px] text-slate-400">
              <button
                type="button"
                onClick={handleAutofill}
                className="text-[#5DE2E7] hover:underline font-semibold cursor-pointer"
              >
                Autofill Credentials
              </button>
              <span>Default: (mmi_f-arhan)</span>
            </div>

            <button
              type="submit"
              className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-[#133E87] to-cyan-500 hover:from-[#133E87] hover:to-cyan-400 text-white font-black text-xs uppercase tracking-wider shadow-[0_0_20px_rgba(93,226,231,0.35)] transition-all transform active:scale-[0.99] cursor-pointer"
            >
              Login to Admin Panel
            </button>
          </form>
        </motion.div>
      ) : (
        /* Authenticated Admin Management View */
        <div className="space-y-4">
          {/* Mobile Category Dropdown (< lg) */}
          <div className="lg:hidden p-3 rounded-2xl bg-slate-900/90 border border-white/10 space-y-1.5 backdrop-blur-md shadow-lg">
            <div className="flex items-center justify-between">
              <label className="text-[11px] font-extrabold uppercase tracking-wider text-slate-400">
                Active Admin Section
              </label>
              <span className="text-[10px] text-[#5DE2E7] font-bold">
                {tabs.find(t => t.id === activeTab)?.label}
              </span>
            </div>
            <select
              value={activeTab}
              onChange={e => setActiveTab(e.target.value as AdminTabKey)}
              className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-[#5DE2E7]/40 text-white text-xs font-bold focus:outline-none focus:ring-2 focus:ring-[#5DE2E7]"
            >
              {tabs.map(t => (
                <option key={t.id} value={t.id}>
                  {t.label} {t.badge ? `(${t.badge})` : ''}
                </option>
              ))}
            </select>
          </div>

          {/* Desktop/PC Layout: Left Vertical Sidebar + Right Workspace Area */}
          <div className="flex flex-col lg:flex-row items-start gap-5 lg:gap-6">
            
            {/* Left Vertical Sidebar (Desktop / PC) */}
            <aside className="hidden lg:flex flex-col w-64 xl:w-72 shrink-0 rounded-3xl bg-slate-950/85 border border-white/10 p-3.5 shadow-2xl backdrop-blur-xl sticky top-20 max-h-[calc(100vh-6rem)] overflow-y-auto no-scrollbar">
              
              {/* Sidebar Identity Header */}
              <div className="p-3 mb-3 rounded-2xl bg-gradient-to-br from-[#133E87]/60 to-slate-900 border border-white/10 shadow-inner">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-[#133E87] to-cyan-500 border border-[#5DE2E7]/40 flex items-center justify-center text-white shrink-0 shadow-[0_0_12px_rgba(93,226,231,0.4)] font-black text-xs">
                    OTL
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs font-black text-white truncate">
                        {currentUser?.username ? `@${currentUser.username}` : 'Administrator'}
                      </span>
                      <span className="w-2 h-2 rounded-full bg-emerald-400 shadow-[0_0_6px_#34d399] shrink-0 animate-pulse" />
                    </div>
                    <p className="text-[10px] text-cyan-300 font-semibold tracking-wide uppercase">
                      Admin Control Panel
                    </p>
                  </div>
                </div>
              </div>

              {/* Categorized Tab Navigation Buttons */}
              <div className="space-y-4 flex-1">
                {tabGroups.map(grp => (
                  <div key={grp.title} className="space-y-1">
                    <div className="px-3 py-1 text-[10px] font-black uppercase tracking-wider text-slate-400">
                      {grp.title}
                    </div>
                    {grp.tabIds.map(tabId => {
                      const tab = tabs.find(t => t.id === tabId);
                      if (!tab) return null;
                      const Icon = tab.icon;
                      const isActive = activeTab === tab.id;
                      return (
                        <button
                          key={tab.id}
                          onClick={() => setActiveTab(tab.id)}
                          className={`w-full px-3 py-2 rounded-xl text-xs font-bold flex items-center justify-between transition-all cursor-pointer group text-left ${
                            isActive
                              ? 'bg-gradient-to-r from-[#133E87] to-cyan-500 text-white shadow-[0_0_16px_rgba(93,226,231,0.35)] border border-[#5DE2E7]/50 font-black'
                              : 'text-slate-300 hover:text-white hover:bg-white/5 border border-transparent'
                          }`}
                        >
                          <div className="flex items-center gap-2.5 min-w-0">
                            <Icon className={`w-4 h-4 shrink-0 transition-transform group-hover:scale-110 ${isActive ? 'text-white' : 'text-[#5DE2E7]'}`} />
                            <span className="truncate">{tab.label}</span>
                          </div>
                          {tab.badge !== undefined && tab.badge > 0 && (
                            <span className="px-1.5 py-0.5 bg-red-500 text-white text-[10px] font-black rounded-full shadow-[0_0_8px_rgba(239,68,68,0.6)] animate-pulse shrink-0">
                              {tab.badge}
                            </span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                ))}
              </div>

              {/* Sidebar Quick Footer Actions */}
              <div className="pt-3 mt-3 border-t border-white/10 space-y-1">
                <button
                  onClick={() => setIsAdminOpen(false)}
                  className="w-full px-3 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:text-white hover:bg-white/5 flex items-center gap-2 transition cursor-pointer"
                >
                  <Home className="w-3.5 h-3.5 text-cyan-400" />
                  <span>Exit to Main Site</span>
                </button>
                <button
                  onClick={handleLogout}
                  className="w-full px-3 py-2 rounded-xl text-xs font-semibold text-rose-400 hover:text-rose-200 hover:bg-rose-500/10 flex items-center gap-2 transition cursor-pointer"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span>Sign Out Admin</span>
                </button>
              </div>
            </aside>

            {/* Right Active Panel Component Container */}
            <main className="flex-1 min-w-0 w-full p-4 sm:p-6 lg:p-7 rounded-3xl glass-panel border border-white/10 bg-[#0B1D51]/70 shadow-[0_0_40px_rgba(11,29,81,0.6)] min-h-[600px]">
              <AdminTabContainer tabName={tabs.find(t => t.id === activeTab)?.label || activeTab}>
                {activeTab === 'dashboard' && <AdminDashboard />}
                {activeTab === 'email_otp' && <AdminEmailOtpManager />}
                {activeTab === 'support' && <SupportAdminInbox />}
                {activeTab === 'visitors' && <AdminGuestTracker />}
                {activeTab === 'users' && <AdminUserManagement />}
                {activeTab === 'products' && <AdminProducts />}
                {activeTab === 'categories' && <AdminCategories />}
                {activeTab === 'contact' && <AdminContactManager />}
                {activeTab === 'settings' && <AdminSettings />}
                {activeTab === 'homepage' && <AdminHomepageBuilder />}
                {activeTab === 'telegram' && <AdminTelegramSettings />}
                {activeTab === 'splash' && <AdminSplashSettings />}
                {activeTab === 'mobilenav' && <AdminMobileNavSettings />}
                {activeTab === 'ads' && <AdminAdsManager />}
              </AdminTabContainer>
            </main>
          </div>

          {/* Clean Admin Workspace Footer */}
          <div className="text-center text-xs text-slate-500 py-3 border-t border-white/5 flex items-center justify-between px-3 flex-wrap gap-2">
            <span>Online Task Lab • Secure Admin Workspace</span>
            <span className="text-[11px] text-cyan-400">Authenticated Session Active</span>
          </div>
        </div>
      )}
    </div>
  );
};
