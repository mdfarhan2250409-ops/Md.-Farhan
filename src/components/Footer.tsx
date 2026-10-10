import React from 'react';
import { Link } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import { ExternalLink, Mail } from 'lucide-react';
import { ResourceCategory, SocialMediaButton } from '../types';
import { OtlLogo } from './OtlLogo';
import { BrandIcon } from './BrandIcons';
import { initialSocialButtons } from '../data/initialData';

export const getSocialBrandStyles = (platform: string) => {
  const p = platform.toLowerCase();
  switch (p) {
    case 'facebook':
      return {
        hoverClass: 'hover:bg-[#1877F2] hover:border-[#1877F2] hover:text-white hover:shadow-[0_0_18px_rgba(24,119,242,0.7)]',
        colorHex: '#1877F2'
      };
    case 'twitter':
    case 'x':
      return {
        hoverClass: 'hover:bg-black hover:border-white/60 hover:text-white hover:shadow-[0_0_18px_rgba(255,255,255,0.4)]',
        colorHex: '#000000'
      };
    case 'linkedin':
      return {
        hoverClass: 'hover:bg-[#0A66C2] hover:border-[#0A66C2] hover:text-white hover:shadow-[0_0_18px_rgba(10,102,194,0.7)]',
        colorHex: '#0A66C2'
      };
    case 'instagram':
      return {
        hoverClass: 'hover:bg-gradient-to-tr hover:from-[#F58529] hover:via-[#DD2A7B] hover:to-[#8134AF] hover:border-[#DD2A7B] hover:text-white hover:shadow-[0_0_18px_rgba(221,42,123,0.7)]',
        colorHex: '#E4405F'
      };
    case 'youtube':
      return {
        hoverClass: 'hover:bg-[#FF0000] hover:border-[#FF0000] hover:text-white hover:shadow-[0_0_18px_rgba(255,0,0,0.7)]',
        colorHex: '#FF0000'
      };
    case 'telegram':
    case 'tg':
      return {
        hoverClass: 'hover:bg-[#229ED9] hover:border-[#229ED9] hover:text-white hover:shadow-[0_0_18px_rgba(34,158,217,0.7)]',
        colorHex: '#229ED9'
      };
    case 'whatsapp':
    case 'wa':
      return {
        hoverClass: 'hover:bg-[#25D366] hover:border-[#25D366] hover:text-white hover:shadow-[0_0_18px_rgba(37,211,102,0.7)]',
        colorHex: '#25D366'
      };
    case 'discord':
      return {
        hoverClass: 'hover:bg-[#5865F2] hover:border-[#5865F2] hover:text-white hover:shadow-[0_0_18px_rgba(88,101,242,0.7)]',
        colorHex: '#5865F2'
      };
    case 'tiktok':
      return {
        hoverClass: 'hover:bg-black hover:border-[#00f2fe] hover:text-[#00f2fe] hover:shadow-[0_0_18px_rgba(0,242,254,0.7)]',
        colorHex: '#000000'
      };
    case 'github':
      return {
        hoverClass: 'hover:bg-[#24292e] hover:border-white/50 hover:text-white hover:shadow-[0_0_18px_rgba(255,255,255,0.4)]',
        colorHex: '#24292e'
      };
    default:
      return {
        hoverClass: 'hover:bg-[#5DE2E7] hover:border-[#5DE2E7] hover:text-slate-950 hover:shadow-[0_0_18px_rgba(93,226,231,0.7)]',
        colorHex: '#5DE2E7'
      };
  }
};

export const Footer: React.FC = () => {
  const { siteSettings, categories, setSelectedCategory, setIsContactModalOpen } = useApp();

  const handleCategoryClick = (cat: ResourceCategory | 'all') => {
    setSelectedCategory(cat);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Determine social buttons to display
  const socialButtonsToDisplay: SocialMediaButton[] = (
    siteSettings.socialButtons && siteSettings.socialButtons.length > 0
      ? siteSettings.socialButtons
      : initialSocialButtons
  ).filter(btn => btn.enabled && btn.url && btn.url.trim() !== '');

  return (
    <footer className="mt-20 border-t border-white/10 bg-[#060B1E]/90 backdrop-blur-2xl text-slate-300 pt-12 pb-28 md:pb-12 px-4 sm:px-6 lg:px-8 relative z-10">
      <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-4 gap-8 mb-12">
        
        {/* Col 1: Brand Info */}
        <div className="space-y-4 md:col-span-1">
          <Link to="/" onClick={() => handleCategoryClick('all')} className="flex items-center space-x-2.5">
            <OtlLogo size="sm" animate={true} />
            <div>
              <span className="font-extrabold text-xl tracking-tight text-white">
                {siteSettings.logoText || 'OTL'}
              </span>
              <span className="text-[10px] text-[#5DE2E7] uppercase font-bold tracking-widest block -mt-1">
                Online Task Lab
              </span>
            </div>
          </Link>

          <p className="text-xs text-slate-400 leading-relaxed">
            Online Task Lab (OTL) is an online platform for discovering digital tasks, opportunities and useful resources — curated mobile apps, AI prompts, landing pages, and Lightroom presets.
          </p>

          {/* Social Media Channels Strip (Official Brand Colors & Floating Tooltips) */}
          {socialButtonsToDisplay.length > 0 && (
            <div className="pt-2">
              <div className="flex items-center gap-2.5 flex-wrap">
                {socialButtonsToDisplay.map((btn) => {
                  const brandStyle = getSocialBrandStyles(btn.platform);
                  return (
                    <a
                      key={btn.id}
                      href={btn.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      aria-label={btn.name}
                      className={`relative group w-9 h-9 sm:w-10 sm:h-10 rounded-full flex items-center justify-center bg-slate-900/90 border border-white/15 text-slate-400 transition-all duration-300 transform group-hover:scale-110 active:scale-95 shadow-md ${brandStyle.hoverClass}`}
                    >
                      <BrandIcon name={btn.platform} className="w-4 h-4 sm:w-4.5 sm:h-4.5 transition-transform duration-200 group-hover:scale-110" />

                      {/* Tooltip on Hover (Above button with pointer arrow) */}
                      <div className="absolute -top-9 left-1/2 -translate-x-1/2 px-2.5 py-0.5 rounded-md bg-slate-950/95 text-white text-[11px] font-bold whitespace-nowrap border border-white/20 shadow-2xl opacity-0 translate-y-1 group-hover:opacity-100 group-hover:translate-y-0 group-hover:-top-10 transition-all duration-200 pointer-events-none z-30 flex flex-col items-center">
                        <span>{btn.name}</span>
                        <div className="w-1.5 h-1.5 bg-slate-950 border-r border-b border-white/20 transform rotate-45 -mb-1 mt-0.5" />
                      </div>
                    </a>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Col 2: Quick Links */}
        <div>
          <h4 className="text-xs font-extrabold text-white uppercase tracking-wider mb-4 border-b border-white/10 pb-2">
            Quick Links
          </h4>
          <ul className="space-y-2 text-xs">
            <li>
              <Link to="/" onClick={() => handleCategoryClick('all')} className="hover:text-[#5DE2E7] transition">
                Homepage
              </Link>
            </li>
            <li>
              <Link to="/contact" onClick={() => setIsContactModalOpen(true)} className="hover:text-[#5DE2E7] transition">
                Contact & Support
              </Link>
            </li>
          </ul>
        </div>

        {/* Col 3: Resource Categories */}
        <div>
          <h4 className="text-xs font-extrabold text-white uppercase tracking-wider mb-4 border-b border-white/10 pb-2">
            Categories
          </h4>
          <ul className="space-y-2 text-xs">
            {categories.map(cat => (
              <li key={cat.id}>
                <Link
                  to={`/category/${cat.id}`}
                  onClick={() => handleCategoryClick(cat.id)}
                  className="hover:text-[#5DE2E7] transition flex items-center gap-1.5"
                >
                  <span>{cat.name}</span>
                </Link>
              </li>
            ))}
          </ul>
        </div>


        {/* Col 4: Telegram & Social */}
        <div>
          <h4 className="text-xs font-extrabold text-white uppercase tracking-wider mb-4 border-b border-white/10 pb-2">
            Official Telegram Network
          </h4>
          <ul className="space-y-2.5 text-xs">
            <li>
              <a
                href={siteSettings.telegramChannel}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1.5 text-cyan-300 hover:text-cyan-200 transition font-semibold"
              >
                <BrandIcon name="telegram" className="w-3.5 h-3.5 text-cyan-300" />
                <span>Telegram Official Channel</span>
              </a>
            </li>
            <li>
              <a
                href={siteSettings.telegramGroup}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1.5 text-slate-300 hover:text-white transition"
              >
                <ExternalLink className="w-3.5 h-3.5 text-[#5DE2E7]" />
                <span>Telegram Community Group</span>
              </a>
            </li>
            <li>
              <a
                href={siteSettings.adminTelegram}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1.5 text-slate-300 hover:text-white transition"
              >
                <ExternalLink className="w-3.5 h-3.5 text-[#5DE2E7]" />
                <span>Direct Support Contact</span>
              </a>
            </li>
            {siteSettings.contactEmail && (
              <li>
                <a
                  href={`mailto:${siteSettings.contactEmail}`}
                  className="flex items-center gap-1.5 text-slate-300 hover:text-[#5DE2E7] transition"
                >
                  <Mail className="w-3.5 h-3.5 text-[#5DE2E7]" />
                  <span>Email: {siteSettings.contactEmail}</span>
                </a>
              </li>
            )}
          </ul>
        </div>

      </div>

      <div className="max-w-7xl mx-auto border-t border-white/10 pt-6 flex items-center justify-center text-center text-xs text-slate-400">
        <p className="text-center">{siteSettings.footerText || '© 2026 Online Task Lab (OTL). All rights reserved.'}</p>
      </div>
    </footer>
  );
};
