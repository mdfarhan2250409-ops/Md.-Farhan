import React from 'react';
import { Link } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import { OtlLogo } from './OtlLogo';
import { Home, ArrowLeft, Smartphone, Layout, Bot, Sliders } from 'lucide-react';

export const NotFoundPage: React.FC = () => {
  const { setSelectedCategory } = useApp();

  return (
    <div className="min-h-[70vh] flex items-center justify-center px-4 py-16 relative z-10">
      <div className="max-w-md w-full glass-panel rounded-3xl p-8 sm:p-10 border border-white/10 text-center relative overflow-hidden shadow-[0_0_50px_rgba(93,226,231,0.15)]">
        {/* Top Glow Accent */}
        <div className="absolute -top-24 left-1/2 -translate-x-1/2 w-48 h-48 bg-[#5DE2E7]/20 rounded-full blur-3xl pointer-events-none" />

        {/* Logo */}
        <div className="flex justify-center mb-6">
          <OtlLogo size="lg" animate={true} />
        </div>

        {/* 404 Title */}
        <div className="inline-block px-3 py-1 rounded-full bg-[#5DE2E7]/10 border border-[#5DE2E7]/30 text-[#5DE2E7] text-xs font-bold uppercase tracking-widest mb-3">
          Error 404
        </div>

        <h1 className="text-3xl sm:text-4xl font-extrabold text-white mb-2 tracking-tight">
          Page Not Found — Online Task Lab (OTL)
        </h1>
        <p className="text-slate-300 font-medium text-sm mb-1">
          পৃষ্ঠাটি পাওয়া যায়নি
        </p>

        <p className="text-slate-400 text-xs leading-relaxed mb-8">
          The page or resource you are looking for might have been removed, had its name changed, or is temporarily unavailable.
        </p>

        {/* Action Buttons */}
        <div className="space-y-3 mb-8">
          <Link
            to="/"
            onClick={() => setSelectedCategory('all')}
            className="w-full py-3 px-5 rounded-2xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-bold text-sm shadow-[0_0_20px_rgba(93,226,231,0.4)] transition-all flex items-center justify-center gap-2 group"
          >
            <Home className="w-4 h-4 group-hover:scale-110 transition-transform" />
            <span>Return to Homepage / হোমে ফিরুন</span>
          </Link>
        </div>

        {/* Category Quick Links */}
        <div className="border-t border-white/10 pt-6">
          <p className="text-xs text-slate-400 font-semibold mb-3 uppercase tracking-wider">
            Explore Categories:
          </p>
          <div className="flex flex-wrap justify-center gap-2">
            <Link
              to="/category/apps"
              onClick={() => setSelectedCategory('apps')}
              className="px-3 py-1.5 rounded-xl bg-slate-900/80 hover:bg-slate-800 border border-white/10 text-xs text-slate-300 hover:text-white transition-all flex items-center gap-1.5"
            >
              <Smartphone className="w-3.5 h-3.5 text-[#5DE2E7]" />
              Apps
            </Link>
            <Link
              to="/category/landing-pages"
              onClick={() => setSelectedCategory('landing-pages')}
              className="px-3 py-1.5 rounded-xl bg-slate-900/80 hover:bg-slate-800 border border-white/10 text-xs text-slate-300 hover:text-white transition-all flex items-center gap-1.5"
            >
              <Layout className="w-3.5 h-3.5 text-[#5DE2E7]" />
              Landing Pages
            </Link>
            <Link
              to="/category/ai-prompts"
              onClick={() => setSelectedCategory('ai-prompts')}
              className="px-3 py-1.5 rounded-xl bg-slate-900/80 hover:bg-slate-800 border border-white/10 text-xs text-slate-300 hover:text-white transition-all flex items-center gap-1.5"
            >
              <Bot className="w-3.5 h-3.5 text-[#5DE2E7]" />
              AI Prompts
            </Link>
            <Link
              to="/category/lr-presets"
              onClick={() => setSelectedCategory('lr-presets')}
              className="px-3 py-1.5 rounded-xl bg-slate-900/80 hover:bg-slate-800 border border-white/10 text-xs text-slate-300 hover:text-white transition-all flex items-center gap-1.5"
            >
              <Sliders className="w-3.5 h-3.5 text-[#5DE2E7]" />
              LR Presets
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};
