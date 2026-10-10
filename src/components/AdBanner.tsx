import React from 'react';
import { useApp } from '../context/AppContext';
import { Send, ExternalLink, Sparkles } from 'lucide-react';

export const AdBanner: React.FC<{ type: 'homepage-banner' | 'sidebar-banner' | 'telegram-promo' }> = ({ type }) => {
  const { ads, recordTelegramClick } = useApp();

  const ad = ads.find(a => a.type === type && a.enabled);
  if (!ad) return null;

  const handleClick = () => {
    recordTelegramClick();
    window.open(ad.targetLink, '_blank');
  };

  if (type === 'homepage-banner') {
    return (
      <div
        onClick={handleClick}
        className="w-full my-6 p-4 rounded-2xl bg-gradient-to-r from-[#133E87] via-[#0B1D51] to-cyan-900/60 border border-[#5DE2E7]/40 cursor-pointer hover:border-[#5DE2E7] transition-all flex flex-col sm:flex-row items-center justify-between gap-4 shadow-[0_0_20px_rgba(93,226,231,0.2)] group"
      >
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[#5DE2E7]/20 border border-[#5DE2E7]/40 flex items-center justify-center shrink-0">
            <Sparkles className="w-5 h-5 text-[#5DE2E7]" />
          </div>
          <div>
            <div className="text-xs font-bold text-[#5DE2E7] uppercase tracking-wider">
              {ad.title}
            </div>
            <div className="text-xs sm:text-sm font-semibold text-white group-hover:text-[#5DE2E7] transition">
              {ad.text}
            </div>
          </div>
        </div>

        <button className="px-4 py-2 rounded-xl bg-[#5DE2E7] group-hover:bg-cyan-300 text-slate-950 font-extrabold text-xs shrink-0 flex items-center gap-1.5 transition">
          <span>Join Channel</span>
          <ExternalLink className="w-3.5 h-3.5" />
        </button>
      </div>
    );
  }

  return (
    <div
      onClick={handleClick}
      className="p-4 rounded-2xl glass-card border border-[#5DE2E7]/30 cursor-pointer hover:border-[#5DE2E7] transition group my-4"
    >
      {ad.imageUrl && (
        <img src={ad.imageUrl} alt={ad.title} className="w-full h-32 rounded-xl object-cover mb-2" />
      )}
      <div className="text-xs font-bold text-white group-hover:text-[#5DE2E7]">{ad.title}</div>
      <div className="text-[11px] text-slate-400 mt-0.5 flex items-center gap-1 text-[#5DE2E7]">
        <Send className="w-3 h-3 fill-current" /> Join Telegram Promo
      </div>
    </div>
  );
};
