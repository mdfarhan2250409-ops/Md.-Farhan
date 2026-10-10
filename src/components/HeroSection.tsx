import React from 'react';
import { useApp } from '../context/AppContext';
import { Send, ArrowRight, Sparkles, Zap, Download, Users, Layers, ShieldCheck } from 'lucide-react';
import { motion } from 'motion/react';
import { OtlLogo } from './OtlLogo';

export const HeroSection: React.FC = () => {
  const { homepageBuilder, siteSettings, resources, categories, analytics } = useApp();

  const scrollToFeed = () => {
    const el = document.getElementById('resource-feed');
    if (el) {
      el.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <section className="relative pt-12 pb-20 px-4 sm:px-6 lg:px-8 text-center overflow-hidden">
      {/* Background Glow Lights */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[350px] bg-gradient-to-tr from-[#133E87]/40 via-[#5DE2E7]/20 to-transparent blur-[140px] pointer-events-none rounded-full" />

      <div className="relative z-10 max-w-4xl mx-auto flex flex-col items-center">
        
        {/* Animated Badge */}
        <motion.div
          initial={{ opacity: 0, y: -12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-slate-900/80 border border-[#5DE2E7]/40 backdrop-blur-xl mb-6 shadow-[0_0_20px_rgba(93,226,231,0.2)]"
        >
          <span className="flex h-2 w-2 rounded-full bg-[#5DE2E7] animate-ping" />
          <span className="text-xs font-semibold text-[#5DE2E7] tracking-wide flex items-center gap-1">
            <Sparkles className="w-3.5 h-3.5" />
            {homepageBuilder.heroBadgeText || 'Telegram Driven Resource Hub • V1.0'}
          </span>
        </motion.div>

        {/* Center Animated Official Logo */}
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.6 }}
          className="relative mb-6 flex justify-center cursor-pointer"
          onClick={scrollToFeed}
        >
          {homepageBuilder.heroLogoUrl ? (
            <div className="w-24 h-24 rounded-full glass-panel flex items-center justify-center p-2 shadow-[0_0_50px_rgba(93,226,231,0.4)] border border-[#5DE2E7]/50 hover:scale-105 transition-transform overflow-hidden">
              <img
                src={homepageBuilder.heroLogoUrl}
                alt="Online Task Lab (OTL) Official Logo"
                className="w-full h-full object-contain p-1 rounded-full"
                loading="lazy"
              />
            </div>
          ) : (
            <OtlLogo size="lg" animate={true} />
          )}
        </motion.div>

        {/* Main Brand Headline H1 */}
        <motion.h1
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.1 }}
          className="text-3xl sm:text-5xl lg:text-6xl font-black text-white tracking-tight mb-4 leading-tight"
        >
          {homepageBuilder.heroTitle || 'Online Task Lab (OTL)'}
        </motion.h1>

        {/* Brand Explanatory Subtitle */}
        <motion.p
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="text-base sm:text-lg text-slate-300 max-w-2xl mx-auto mb-5 leading-relaxed"
        >
          {homepageBuilder.heroSubtitle ||
            'Online Task Lab (OTL) is an online platform for discovering digital tasks, opportunities and useful resources.'}
        </motion.p>

        {/* Natural Brand Statement Pill */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.25 }}
          className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-[#5DE2E7]/10 border border-[#5DE2E7]/25 text-xs text-cyan-200 mb-8 max-w-xl mx-auto"
        >
          <span className="w-2 h-2 rounded-full bg-[#5DE2E7] animate-pulse shrink-0" />
          <span>Official website for Online Task Lab (OTL) — online tasks, tools &amp; downloads.</span>
        </motion.div>

        {/* Action Buttons */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.3 }}
          className="flex flex-wrap items-center justify-center gap-4 mb-12"
        >
          <button
            onClick={scrollToFeed}
            className="px-7 py-3.5 rounded-2xl bg-gradient-to-r from-[#133E87] via-cyan-500 to-[#5DE2E7] text-white font-extrabold text-sm flex items-center gap-2 shadow-[0_0_25px_rgba(93,226,231,0.5)] hover:shadow-[0_0_35px_rgba(93,226,231,0.8)] hover:scale-105 transition-all cursor-pointer"
          >
            <span>{homepageBuilder.heroExploreBtnText || 'Explore Resources'}</span>
            <ArrowRight className="w-4 h-4" />
          </button>

          <a
            href={homepageBuilder.heroTelegramBtnUrl || siteSettings.telegramChannel || 'https://t.me/OnlineTaskLab'}
            target="_blank"
            rel="noopener noreferrer"
            className="px-7 py-3.5 rounded-2xl bg-slate-900/80 hover:bg-slate-800 text-white font-bold text-sm border border-[#5DE2E7]/40 backdrop-blur-xl flex items-center gap-2.5 shadow-[0_0_20px_rgba(11,29,81,0.6)] hover:border-[#5DE2E7] transition-all hover:scale-105"
          >
            <Send className="w-4 h-4 text-[#5DE2E7] fill-current" />
            <span>{homepageBuilder.heroTelegramBtnText || 'Join Telegram Channel'}</span>
          </a>
        </motion.div>

        {/* Homepage Announcement Banner (Configurable in Admin) */}
        {homepageBuilder.homepageBannerEnabled && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5, delay: 0.4 }}
            className="w-full max-w-2xl mb-12 p-3 rounded-2xl bg-gradient-to-r from-[#133E87]/60 via-[#0B1D51]/80 to-[#133E87]/60 border border-[#5DE2E7]/40 backdrop-blur-xl flex items-center justify-between text-xs font-semibold text-slate-200 shadow-[0_0_20px_rgba(93,226,231,0.2)]"
          >
            <div className="flex items-center gap-2 truncate pr-2">
              <span className="flex h-2 w-2 rounded-full bg-amber-400 shrink-0" />
              <span className="truncate">{homepageBuilder.homepageBannerText}</span>
            </div>
            <a
              href={homepageBuilder.homepageBannerLink}
              target="_blank"
              rel="noopener noreferrer"
              className="px-3 py-1.5 rounded-xl bg-[#5DE2E7] hover:bg-cyan-300 text-slate-950 font-extrabold shrink-0 transition"
            >
              Join VIP
            </a>
          </motion.div>
        )}

        {/* Live OTL Stats Grid */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.5 }}
          className="w-full grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4 max-w-3xl"
        >
          <div className="glass-card p-4 rounded-2xl text-center border border-white/10 hover:border-[#5DE2E7]/40 transition">
            <div className="w-8 h-8 rounded-xl bg-[#5DE2E7]/10 border border-[#5DE2E7]/30 flex items-center justify-center mx-auto mb-2">
              <Layers className="w-4 h-4 text-[#5DE2E7]" />
            </div>
            <div className="text-xl sm:text-2xl font-black text-white">
              {homepageBuilder.stat1Value || `${resources.length}+`}
            </div>
            <div className="text-[11px] text-slate-400 font-medium uppercase tracking-wider">
              {homepageBuilder.stat1Label || 'Total Products'}
            </div>
          </div>

          <div className="glass-card p-4 rounded-2xl text-center border border-white/10 hover:border-[#5DE2E7]/40 transition">
            <div className="w-8 h-8 rounded-xl bg-cyan-500/10 border border-cyan-400/30 flex items-center justify-center mx-auto mb-2">
              <Download className="w-4 h-4 text-cyan-400" />
            </div>
            <div className="text-xl sm:text-2xl font-black text-white">
              {homepageBuilder.stat2Value || `${((analytics?.totalDownloads ?? 0) / 1000).toFixed(1)}k+`}
            </div>
            <div className="text-[11px] text-slate-400 font-medium uppercase tracking-wider">
              {homepageBuilder.stat2Label || 'Downloads'}
            </div>
          </div>

          <div className="glass-card p-4 rounded-2xl text-center border border-white/10 hover:border-[#5DE2E7]/40 transition">
            <div className="w-8 h-8 rounded-xl bg-blue-500/10 border border-blue-400/30 flex items-center justify-center mx-auto mb-2">
              <Users className="w-4 h-4 text-blue-400" />
            </div>
            <div className="text-xl sm:text-2xl font-black text-white">
              {homepageBuilder.stat3Value || `${((analytics?.telegramClicks ?? 0) / 1000).toFixed(1)}k+`}
            </div>
            <div className="text-[11px] text-slate-400 font-medium uppercase tracking-wider">
              {homepageBuilder.stat3Label || 'Telegram Clicks'}
            </div>
          </div>

          <div className="glass-card p-4 rounded-2xl text-center border border-white/10 hover:border-[#5DE2E7]/40 transition">
            <div className="w-8 h-8 rounded-xl bg-amber-500/10 border border-amber-400/30 flex items-center justify-center mx-auto mb-2">
              <ShieldCheck className="w-4 h-4 text-amber-400" />
            </div>
            <div className="text-xl sm:text-2xl font-black text-white">
              {homepageBuilder.stat4Value || '100%'}
            </div>
            <div className="text-[11px] text-slate-400 font-medium uppercase tracking-wider">
              {homepageBuilder.stat4Label || 'Verified Safe'}
            </div>
          </div>
        </motion.div>

      </div>
    </section>
  );
};
