import React, { useState, useEffect } from 'react';
import { useApp } from '../../context/AppContext';
import { useAuth } from '../../context/AuthContext';
import { db, collection, onSnapshot } from '../../lib/firebase';
import { Layers, Download, Send, Eye, ShieldCheck, Sparkles, RefreshCw, Users, UserCheck, Mail, Globe, ArrowRight } from 'lucide-react';

export const AdminDashboard: React.FC = () => {
  const { resources, analytics, categories, resetToDefaults, triggerSplashLoaderPreview } = useApp();
  const { allUsers, userActivities } = useAuth();
  const { currentUser } = useAuth();
  const [visitorStats, setVisitorStats] = useState({
    totalGuests: 0,
    linkedGuests: 0,
  });

  useEffect(() => {
    const isCallerAdmin = currentUser?.role === 'admin' || (typeof window !== 'undefined' && localStorage.getItem('otl_admin_authenticated') === 'true');
    if (!isCallerAdmin) return;

    try {
      const unsub = onSnapshot(collection(db, 'guestProfiles'), snap => {
        let linked = 0;
        snap.forEach(d => {
          const data = d.data();
          if (data.status === 'linked' || data.linkedUserId) linked++;
        });
        setVisitorStats({
          totalGuests: snap.size,
          linkedGuests: linked
        });
      }, err => {
        console.warn('[AdminDashboard] visitor listener warning:', err);
      });
      return () => unsub();
    } catch {}
  }, [currentUser?.role]);

  const totalProducts = resources.length;
  const featuredProducts = resources.filter(r => r.isFeatured).length;
  const trendingProducts = resources.filter(r => r.isTrending).length;
  const activeUsersCount = allUsers.filter(u => u.status === 'active').length;

  return (
    <div className="space-y-6">
      {/* Quick Action Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 p-4 rounded-2xl bg-slate-900/80 border border-[#5DE2E7]/30">
        <div>
          <h3 className="text-base font-extrabold text-white">OTL Control Center</h3>
          <p className="text-xs text-slate-400">Overview of site health, metrics, and quick actions</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={triggerSplashLoaderPreview}
            className="px-3.5 py-2 rounded-xl bg-[#133E87] hover:bg-cyan-500 text-white font-bold text-xs flex items-center gap-1.5 transition"
          >
            <Eye className="w-3.5 h-3.5 text-[#5DE2E7]" /> Test Splash Loader
          </button>
          <button
            onClick={resetToDefaults}
            className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs flex items-center gap-1.5 transition border border-white/10"
          >
            <RefreshCw className="w-3.5 h-3.5" /> Reset Demo Data
          </button>
        </div>
      </div>

      {/* Metrics Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-4">
        <div className="p-4 rounded-2xl bg-slate-950/80 border border-white/10">
          <div className="flex items-center justify-between text-slate-400 text-xs mb-2">
            <span>Total Users</span>
            <Users className="w-4 h-4 text-[#5DE2E7]" />
          </div>
          <div className="text-2xl font-black text-white">{allUsers.length}</div>
          <div className="text-[10px] text-emerald-400 mt-1">{activeUsersCount} Active</div>
        </div>

        <div className="p-4 rounded-2xl bg-slate-950/80 border border-white/10">
          <div className="flex items-center justify-between text-slate-400 text-xs mb-2">
            <span>Total Products</span>
            <Layers className="w-4 h-4 text-[#5DE2E7]" />
          </div>
          <div className="text-2xl font-black text-white">{totalProducts}</div>
          <div className="text-[10px] text-slate-400 mt-1">Across {categories.length} categories</div>
        </div>

        <div className="p-4 rounded-2xl bg-slate-950/80 border border-white/10">
          <div className="flex items-center justify-between text-slate-400 text-xs mb-2">
            <span>Total Downloads</span>
            <Download className="w-4 h-4 text-cyan-400" />
          </div>
          <div className="text-2xl font-black text-white">{(analytics?.totalDownloads ?? 0).toLocaleString()}</div>
          <div className="text-[10px] text-emerald-400 mt-1">↑ Active downloads</div>
        </div>

        <div className="p-4 rounded-2xl bg-slate-950/80 border border-white/10">
          <div className="flex items-center justify-between text-slate-400 text-xs mb-2">
            <span>Telegram Clicks</span>
            <Send className="w-4 h-4 text-blue-400" />
          </div>
          <div className="text-2xl font-black text-white">{(analytics?.telegramClicks ?? 0).toLocaleString()}</div>
          <div className="text-[10px] text-blue-400 mt-1">Channel conversions</div>
        </div>

        <div className="p-4 rounded-2xl bg-slate-950/80 border border-white/10">
          <div className="flex items-center justify-between text-slate-400 text-xs mb-2">
            <span>Featured / Trending</span>
            <Sparkles className="w-4 h-4 text-amber-400" />
          </div>
          <div className="text-2xl font-black text-white">{featuredProducts} / {trendingProducts}</div>
          <div className="text-[10px] text-amber-300 mt-1">Highlighted on Hero/Feed</div>
        </div>

        <div className="p-4 rounded-2xl bg-slate-950/80 border border-white/10">
          <div className="flex items-center justify-between text-slate-400 text-xs mb-2">
            <span>Auth Providers</span>
            <UserCheck className="w-4 h-4 text-purple-400" />
          </div>
          <div className="text-sm font-black text-white mt-1">
            Email & Google
          </div>
          <div className="text-[10px] text-slate-400 mt-1">With OTP Verification</div>
        </div>
      </div>

      {/* Visitor Tracking & Conversion Banner */}
      <div className="p-4 rounded-2xl bg-gradient-to-r from-slate-950 via-[#133E87]/40 to-slate-950 border border-[#5DE2E7]/30 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-[#133E87] text-[#5DE2E7] border border-[#5DE2E7]/40">
            <Globe className="w-5 h-5" />
          </div>
          <div>
            <div className="text-sm font-black text-white flex items-center gap-2">
              Guest Profiles & Visitor Funnel
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                Active Tracking
              </span>
            </div>
            <p className="text-xs text-slate-400">
              {visitorStats.totalGuests} anonymous visitors tracked • {visitorStats.linkedGuests} converted into registered accounts
            </p>
          </div>
        </div>

        <div className="flex items-center gap-6">
          <div className="text-right">
            <div className="text-lg font-black text-emerald-400">
              {visitorStats.totalGuests > 0 ? ((visitorStats.linkedGuests / visitorStats.totalGuests) * 100).toFixed(1) : 0}%
            </div>
            <div className="text-[10px] text-slate-400">Guest Conversion Rate</div>
          </div>
        </div>
      </div>

      {/* Category Distribution Breakdown */}
      <div className="p-5 rounded-2xl bg-slate-950/80 border border-white/10">
        <h4 className="text-xs font-bold text-white uppercase tracking-wider mb-4">
          Category Distribution
        </h4>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          {categories.map(cat => {
            const count = resources.filter(r => r.category === cat.id).length;
            return (
              <div key={cat.id} className="p-3 rounded-xl bg-slate-900 border border-white/5 flex items-center justify-between">
                <div>
                  <div className="text-xs font-bold text-white capitalize">{cat.name}</div>
                  <div className="text-[10px] text-slate-400">{count} Items</div>
                </div>
                <span className="text-xs font-bold px-2 py-0.5 rounded bg-[#5DE2E7]/20 text-[#5DE2E7]">
                  {count}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Recent Activity Log */}
      <div className="p-5 rounded-2xl bg-slate-950/80 border border-white/10">
        <h4 className="text-xs font-bold text-white uppercase tracking-wider mb-3">
          System Activity Logs
        </h4>
        <div className="space-y-2 text-xs font-mono text-slate-300">
          <div className="p-2 rounded bg-slate-900 border border-white/5 flex items-center justify-between">
            <span>[SYSTEM] App launched on Cloud Server with standard OTL database schema.</span>
            <span className="text-slate-500">Just now</span>
          </div>
          <div className="p-2 rounded bg-slate-900 border border-white/5 flex items-center justify-between">
            <span>[TELEGRAM] Main channel routing synchronized to @OnlineTaskLab.</span>
            <span className="text-slate-500">2 mins ago</span>
          </div>
          <div className="p-2 rounded bg-slate-900 border border-white/5 flex items-center justify-between">
            <span>[LOADER] Animated splash screen active on first visit.</span>
            <span className="text-slate-500">5 mins ago</span>
          </div>
        </div>
      </div>
    </div>
  );
};
