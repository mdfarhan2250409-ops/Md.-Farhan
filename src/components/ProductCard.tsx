import React from 'react';
import { Link } from 'react-router-dom';
import { Resource } from '../types';
import { useApp } from '../context/AppContext';
import { useAuth } from '../context/AuthContext';
import {
  Download,
  Send,
  Copy,
  Eye,
  Sliders,
  Check,
  Smartphone,
  HardDrive
} from 'lucide-react';

export interface ProductCardProps {
  resource: Resource;
  viewMode?: 'grid' | 'list';
}

export const ProductCard: React.FC<ProductCardProps> = ({ resource, viewMode = 'grid' }) => {
  const {
    categories,
    setActiveResourceModal,
    setTelegramDownloadModalResource,
    recordTelegramClick,
    showToast
  } = useApp();

  const { requireAuth } = useAuth();

  const [copied, setCopied] = React.useState(false);

  const getCategoryBadge = () => {
    const foundCat = categories.find(c => c.id === resource.category);
    const catName = foundCat ? foundCat.name.toUpperCase() : resource.category.toUpperCase().replace('-', ' ');

    switch (resource.category) {
      case 'apps':
        return { label: (resource.modInfo?.toLowerCase().includes('mod') || resource.tags?.some(t => t.toLowerCase().includes('mod'))) ? 'MOD APK' : (foundCat ? foundCat.name.toUpperCase() : 'MOBILE APP'), color: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30' };
      case 'landing-pages':
        return { label: catName || 'LANDING PAGES', color: 'bg-indigo-500/20 text-indigo-300 border-indigo-500/30' };
      case 'ai-prompts':
        return { label: catName || 'AI PROMPTS', color: 'bg-purple-500/20 text-purple-300 border-purple-500/30' };
      case 'lr-presets':
        return { label: catName || 'PRESETS', color: 'bg-amber-500/20 text-amber-300 border-amber-500/30' };
      default:
        return { label: catName || 'RESOURCE', color: 'bg-cyan-500/20 text-cyan-300 border-cyan-500/30' };
    }
  };

  const badge = getCategoryBadge();

  const formattedVersion = resource.version
    ? resource.version.toLowerCase().startsWith('v')
      ? resource.version
      : `v${resource.version}`
    : 'v1.0';

  const handleCopyPrompt = (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    if (!requireAuth(undefined, '🔒 Account Required: Please log in or create an account to copy AI Prompts!')) {
      return;
    }
    if (resource.promptText) {
      navigator.clipboard.writeText(resource.promptText);
      setCopied(true);
      showToast('AI Prompt copied to clipboard!');
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleDownloadClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    if (!requireAuth(() => setTelegramDownloadModalResource(resource), '🔒 Account Required: Please log in or create a free account to download this resource!')) {
      return;
    }
    setTelegramDownloadModalResource(resource);
  };

  const handleTelegramClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    if (!requireAuth(() => {
      recordTelegramClick(resource.id);
      window.open(resource.telegramUrl || resource.downloadUrl, '_blank');
    }, '🔒 Account Required: Please sign in or create an account to access our Telegram downloads.')) {
      return;
    }
    recordTelegramClick(resource.id);
    window.open(resource.telegramUrl || resource.downloadUrl, '_blank');
  };

  // Horizontal Compact List View (Image 2 style)
  if (viewMode === 'list') {
    return (
      <Link
        to={`/product/${resource.id}`}
        onClick={() => setActiveResourceModal(resource)}
        className="group relative flex items-center justify-between gap-3 sm:gap-4 p-3 sm:p-4 rounded-2xl sm:rounded-3xl bg-[#060e24]/85 hover:bg-[#0b1d51]/70 border border-white/10 hover:border-[#5DE2E7]/40 shadow-sm hover:shadow-[0_0_25px_rgba(93,226,231,0.2)] backdrop-blur-md transition-all duration-200 hover:-translate-y-0.5 cursor-pointer overflow-hidden block select-none"
      >
        {/* Left: Thumbnail & Center Content */}
        <div className="flex items-center gap-3 sm:gap-4 min-w-0 flex-1">
          {/* Small cropped thumbnail */}
          <div className="relative w-12 h-12 sm:w-14 sm:h-14 md:w-16 md:h-16 rounded-xl sm:rounded-2xl overflow-hidden bg-slate-900 border border-white/10 shrink-0 shadow-inner">
            <img
              src={resource.thumbnail}
              alt={`${resource.title} — Online Task Lab (OTL)`}
              className="w-full h-full object-cover group-hover:scale-108 transition-transform duration-300"
              loading="lazy"
            />
          </div>

          {/* Center Details */}
          <div className="min-w-0 flex-1">
            {/* Title */}
            <h3 className="text-xs sm:text-sm md:text-base font-bold text-white group-hover:text-[#5DE2E7] transition-colors truncate leading-snug">
              {resource.title}
            </h3>

            {/* Short Description */}
            <p className="text-[11px] sm:text-xs text-slate-300 truncate mt-0.5 sm:mt-1 leading-normal opacity-90">
              {resource.shortDescription}
            </p>

            {/* Metadata: Category • Size • Version */}
            <div className="flex items-center flex-wrap gap-1.5 sm:gap-2 text-[10px] sm:text-xs mt-1 sm:mt-1.5">
              <span className="font-black text-[#5DE2E7] tracking-wider uppercase shrink-0">
                {badge.label}
              </span>
              <span className="text-slate-500 select-none">•</span>
              <span className="text-slate-300 font-medium shrink-0">
                {resource.fileSize || 'N/A'}
              </span>
              <span className="text-slate-500 select-none">•</span>
              <span className="text-slate-400 font-medium shrink-0">
                {formattedVersion}
              </span>
              {resource.isFeatured && (
                <>
                  <span className="text-slate-600 select-none hidden sm:inline">•</span>
                  <span className="hidden sm:inline-flex items-center gap-1 text-[10px] font-bold px-1.5 py-0.2 rounded-md bg-amber-400/15 text-amber-300 border border-amber-400/30">
                    ⭐ Featured
                  </span>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Right: Action Buttons */}
        <div className="flex items-center gap-2 shrink-0 pl-1">
          {resource.category === 'ai-prompts' && (
            <button
              onClick={handleCopyPrompt}
              className={`hidden sm:flex p-2.5 rounded-xl sm:rounded-2xl border text-xs font-semibold items-center justify-center transition-all ${
                copied
                  ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                  : 'bg-white/5 hover:bg-white/10 text-slate-300 border-white/15'
              }`}
              title="Copy AI Prompt"
              aria-label="Copy AI Prompt"
            >
              {copied ? <Check className="w-4 h-4 text-emerald-300" /> : <Copy className="w-4 h-4 text-[#5DE2E7]" />}
            </button>
          )}

          <button
            onClick={handleDownloadClick}
            className="w-10 h-10 sm:w-11 sm:h-11 md:w-12 md:h-12 rounded-xl sm:rounded-2xl bg-[#133E87] hover:bg-[#5DE2E7] text-white hover:text-slate-950 flex items-center justify-center shrink-0 border border-white/10 hover:border-[#5DE2E7] transition-all duration-200 shadow-[0_0_15px_rgba(19,62,135,0.4)] hover:shadow-[0_0_20px_rgba(93,226,231,0.55)] cursor-pointer"
            title={`Download ${resource.title}`}
            aria-label={`Download ${resource.title}`}
          >
            <Download className="w-4 h-4 sm:w-5 sm:h-5 shrink-0" />
          </button>
        </div>
      </Link>
    );
  }

  // Default Grid View (Image 1 / Existing card style)

  return (
    <Link
      to={`/product/${resource.id}`}
      onClick={() => setActiveResourceModal(resource)}
      className="group glass-card rounded-2xl border border-white/10 hover:border-[#5DE2E7]/40 p-3 sm:p-4 transition-all duration-300 hover:-translate-y-1.5 hover:shadow-[0_0_30px_rgba(93,226,231,0.25)] cursor-pointer flex flex-col justify-between relative overflow-hidden block"
    >
      {/* Top Media Thumbnail */}
      <div>
        <div className="relative aspect-video w-full rounded-xl overflow-hidden mb-3.5 bg-slate-900 border border-white/10">
          <img
            src={resource.thumbnail}
            alt={`${resource.title} — Online Task Lab (OTL)`}
            className="w-full h-full object-cover group-hover:scale-108 transition-transform duration-500"
            loading="lazy"
          />

          {/* Badges Overlay */}
          <div className="absolute top-2.5 left-2.5 flex flex-wrap gap-1.5">
            <span className={`text-[10px] font-extrabold px-2 py-0.5 rounded-md border backdrop-blur-md uppercase tracking-wider ${badge.color}`}>
              {badge.label}
            </span>
            {resource.isFeatured && (
              <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-md bg-amber-500/80 text-slate-950 shadow-md">
                ⭐ FEATURED
              </span>
            )}
          </div>

          <div className="absolute top-2.5 right-2.5">
            <span className="text-[10px] font-semibold px-2 py-0.5 rounded-md bg-slate-950/80 text-slate-200 border border-white/20 backdrop-blur-md flex items-center gap-1">
              <HardDrive className="w-3 h-3 text-[#5DE2E7]" />
              {resource.fileSize}
            </span>
          </div>

          {/* Hover Quick Preview Eye Overlay */}
          <div className="absolute inset-0 bg-slate-950/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center backdrop-blur-[2px]">
            <span className="px-3 py-1.5 rounded-xl bg-slate-900/90 text-white text-xs font-bold border border-[#5DE2E7]/50 flex items-center gap-1.5 shadow-lg">
              <Eye className="w-3.5 h-3.5 text-[#5DE2E7]" />
              View Details
            </span>
          </div>
        </div>

        {/* Title */}
        <h3 className="text-sm sm:text-base font-bold text-white group-hover:text-[#5DE2E7] transition-colors line-clamp-2 leading-snug mb-1.5">
          {resource.title}
        </h3>

        {/* Short Description */}
        <p className="text-xs text-slate-300 line-clamp-2 mb-3 leading-relaxed">
          {resource.shortDescription}
        </p>

        {/* Category Specific Indicators */}
        {resource.category === 'ai-prompts' && resource.promptText && (
          <div className="mb-3 p-2 rounded-xl bg-slate-950/60 border border-purple-500/20 text-[11px] text-purple-200 font-mono line-clamp-1 relative">
            <span className="opacity-80">"</span>
            {resource.promptText}
            <span className="opacity-80">"</span>
          </div>
        )}

        {resource.category === 'lr-presets' && (
          <div className="mb-3 flex items-center gap-1.5 text-[11px] text-amber-300 font-medium">
            <Sliders className="w-3.5 h-3.5" />
            <span>Format: {resource.presetFormat || '.DNG + .XMP'}</span>
          </div>
        )}

        {resource.category === 'apps' && (
          <div className="mb-3 flex flex-wrap items-center gap-1.5 text-[11px]">
            {resource.apkVersion && (
              <span className="text-emerald-300 font-medium flex items-center gap-1 bg-emerald-500/10 px-2 py-0.5 rounded-lg border border-emerald-500/20">
                <Smartphone className="w-3.5 h-3.5" />
                <span>Ver: {resource.apkVersion}</span>
              </span>
            )}
            {resource.modInfo && (
              <span className="text-cyan-300 font-semibold bg-cyan-500/10 px-2 py-0.5 rounded-lg border border-cyan-500/20">
                {resource.modInfo}
              </span>
            )}
          </div>
        )}
      </div>

      {/* Footer Meta & Action Buttons */}
      <div>
        <div className="flex items-center justify-between text-[11px] text-slate-400 border-t border-white/10 pt-2.5 mb-3 font-medium">
          <span>Ver: {resource.version}</span>
          <span>{(resource.downloadsCount ?? 0).toLocaleString()} Downloads</span>
        </div>

        <div className="grid grid-cols-2 gap-1.5 sm:gap-2">
          {/* Main Download Button */}
          <button
            onClick={handleDownloadClick}
            className="py-1.5 sm:py-2 px-2 sm:px-3 rounded-xl bg-gradient-to-r from-[#133E87] to-cyan-500 hover:from-[#133E87] hover:to-cyan-400 text-white font-bold text-[11px] sm:text-xs flex items-center justify-center gap-1 sm:gap-1.5 shadow-[0_0_15px_rgba(93,226,231,0.3)] transition-all"
          >
            <Download className="w-3.5 h-3.5 shrink-0" />
            <span className="truncate">Download</span>
          </button>

          {/* Quick Category Action OR Telegram Button */}
          {resource.category === 'ai-prompts' ? (
            <button
              onClick={handleCopyPrompt}
              className={`py-1.5 sm:py-2 px-2 sm:px-3 rounded-xl border text-[11px] sm:text-xs font-bold flex items-center justify-center gap-1 sm:gap-1.5 transition-all ${
                copied
                  ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                  : 'bg-white/5 hover:bg-white/10 text-slate-200 border-white/15'
              }`}
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-300 shrink-0" /> : <Copy className="w-3.5 h-3.5 text-[#5DE2E7] shrink-0" />}
              <span className="truncate">{copied ? 'Copied' : 'Copy'}</span>
            </button>
          ) : (
            <button
              onClick={handleTelegramClick}
              className="py-1.5 sm:py-2 px-2 sm:px-3 rounded-xl bg-slate-900/80 hover:bg-slate-800 text-slate-200 hover:text-white border border-[#5DE2E7]/30 text-[11px] sm:text-xs font-bold flex items-center justify-center gap-1 sm:gap-1.5 transition-all"
            >
              <Send className="w-3.5 h-3.5 text-[#5DE2E7] fill-current shrink-0" />
              <span className="truncate">Telegram</span>
            </button>
          )}
        </div>
      </div>
    </Link>
  );
};
