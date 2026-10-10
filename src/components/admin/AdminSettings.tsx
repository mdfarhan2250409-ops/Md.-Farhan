import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { AdminImageUploadInput } from './AdminImageUploadInput';
import { Save, Globe, Share2, Plus, Trash2, ArrowUp, ArrowDown, Eye, EyeOff, Sparkles, RotateCcw } from 'lucide-react';
import { SocialMediaButton, SocialPlatformType } from '../../types';
import { initialSocialButtons } from '../../data/initialData';
import { BrandIcon } from '../BrandIcons';
import { getSocialBrandStyles } from '../Footer';

const AVAILABLE_PLATFORMS: { key: SocialPlatformType; label: string }[] = [
  { key: 'facebook', label: 'Facebook' },
  { key: 'twitter', label: 'X (Twitter)' },
  { key: 'linkedin', label: 'LinkedIn' },
  { key: 'instagram', label: 'Instagram' },
  { key: 'youtube', label: 'YouTube' },
  { key: 'telegram', label: 'Telegram' },
  { key: 'whatsapp', label: 'WhatsApp' },
  { key: 'discord', label: 'Discord' },
  { key: 'tiktok', label: 'TikTok' },
  { key: 'github', label: 'GitHub' },
  { key: 'website', label: 'Website / Link' },
];

export const AdminSettings: React.FC = () => {
  const { siteSettings, updateSiteSettings } = useApp();

  const [websiteTitle, setWebsiteTitle] = useState(siteSettings.websiteTitle);
  const [tagline, setTagline] = useState(siteSettings.tagline);
  const [logoText, setLogoText] = useState(siteSettings.logoText);
  const [logoUrl, setLogoUrl] = useState(siteSettings.logoUrl || '');
  const [faviconUrl, setFaviconUrl] = useState(siteSettings.faviconUrl || '');
  const [footerText, setFooterText] = useState(siteSettings.footerText);
  const [contactEmail, setContactEmail] = useState(siteSettings.contactEmail);

  // Social Media Buttons State
  const [socialButtons, setSocialButtons] = useState<SocialMediaButton[]>(() => {
    if (siteSettings.socialButtons && siteSettings.socialButtons.length > 0) {
      return siteSettings.socialButtons;
    }
    return initialSocialButtons;
  });

  const handleAddSocialButton = () => {
    const newBtn: SocialMediaButton = {
      id: `sb-${Date.now()}`,
      platform: 'facebook',
      name: 'Facebook',
      url: 'https://',
      enabled: true
    };
    setSocialButtons(prev => [...prev, newBtn]);
  };

  const handleUpdateSocialButton = (id: string, updates: Partial<SocialMediaButton>) => {
    setSocialButtons(prev =>
      prev.map(btn => {
        if (btn.id === id) {
          const updated = { ...btn, ...updates };
          // If platform changed and name was default matching old platform, update name
          if (updates.platform && updates.platform !== btn.platform) {
            const foundPlatform = AVAILABLE_PLATFORMS.find(p => p.key === updates.platform);
            if (foundPlatform && (btn.name === '' || AVAILABLE_PLATFORMS.some(p => p.label === btn.name))) {
              updated.name = foundPlatform.label;
            }
          }
          return updated;
        }
        return btn;
      })
    );
  };

  const handleDeleteSocialButton = (id: string) => {
    setSocialButtons(prev => prev.filter(btn => btn.id !== id));
  };

  const handleMoveButton = (index: number, direction: 'up' | 'down') => {
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= socialButtons.length) return;
    setSocialButtons(prev => {
      const copy = [...prev];
      const temp = copy[index];
      copy[index] = copy[targetIndex];
      copy[targetIndex] = temp;
      return copy;
    });
  };

  const handleResetDefaults = () => {
    if (window.confirm('Reset social buttons to official default channels (Facebook, X, LinkedIn, Instagram, YouTube, Telegram)?')) {
      setSocialButtons(initialSocialButtons);
    }
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    updateSiteSettings({
      websiteTitle,
      tagline,
      logoText,
      logoUrl,
      faviconUrl,
      footerText,
      contactEmail,
      socialButtons
    });
  };

  return (
    <form onSubmit={handleSave} className="space-y-4 text-xs">
      <div className="p-4 rounded-2xl bg-slate-950/80 border border-white/10 space-y-4">
        <h3 className="text-sm font-extrabold text-white mb-2 flex items-center gap-2">
          <Globe className="w-4 h-4 text-[#5DE2E7]" /> Website Identity &amp; Branding Settings
        </h3>

        <div>
          <label className="block text-slate-300 font-bold mb-1">Website Title</label>
          <input
            type="text"
            value={websiteTitle}
            onChange={e => setWebsiteTitle(e.target.value)}
            className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-white/10 text-white focus:outline-none focus:border-[#5DE2E7]"
          />
        </div>

        <div>
          <label className="block text-slate-300 font-bold mb-1">Tagline</label>
          <input
            type="text"
            value={tagline}
            onChange={e => setTagline(e.target.value)}
            className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-white/10 text-white focus:outline-none focus:border-[#5DE2E7]"
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-slate-300 font-bold mb-1">Logo Abbreviation (Text)</label>
            <input
              type="text"
              value={logoText}
              onChange={e => setLogoText(e.target.value)}
              className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-white/10 text-white focus:outline-none focus:border-[#5DE2E7]"
            />
          </div>

          <div>
            <label className="block text-slate-300 font-bold mb-1">Contact Email</label>
            <input
              type="email"
              value={contactEmail}
              onChange={e => setContactEmail(e.target.value)}
              className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-white/10 text-white focus:outline-none focus:border-[#5DE2E7]"
            />
          </div>
        </div>

        {/* Website Logo & Favicon Image Uploads */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
          <AdminImageUploadInput
            label="Website Custom Header Logo (URL / Device Gallery)"
            value={logoUrl}
            onChange={setLogoUrl}
            placeholder="https://example.com/logo.png or upload from device"
            helpText="Custom brand logo displayed in top navigation bar"
          />

          <AdminImageUploadInput
            label="Website Favicon / Web App Icon (URL / Device Gallery)"
            value={faviconUrl}
            onChange={setFaviconUrl}
            placeholder="https://example.com/favicon.png or upload from device"
            helpText="Browser tab icon and mobile home-screen shortcut icon"
          />
        </div>

        <div>
          <label className="block text-slate-300 font-bold mb-1">Footer Copyright Text</label>
          <input
            type="text"
            value={footerText}
            onChange={e => setFooterText(e.target.value)}
            className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-white/10 text-white focus:outline-none focus:border-[#5DE2E7]"
          />
        </div>

        {/* Social Media Buttons (Footer Brand Bar) */}
        <div className="pt-3 border-t border-white/10 space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <h4 className="text-xs font-black text-white flex items-center gap-1.5 uppercase tracking-wider">
                <Share2 className="w-4 h-4 text-[#5DE2E7]" />
                <span>Footer Social Media Buttons</span>
              </h4>
              <p className="text-[11px] text-slate-400 mt-0.5">
                These icon buttons appear in the footer under your brand details. On hover, each button displays its official brand color and a floating name tooltip.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleResetDefaults}
                className="px-2.5 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white transition flex items-center gap-1 text-[11px] font-bold cursor-pointer"
                title="Reset to default social channels"
              >
                <RotateCcw className="w-3 h-3 text-slate-400" />
                <span>Reset Defaults</span>
              </button>

              <button
                type="button"
                onClick={handleAddSocialButton}
                className="px-3 py-1.5 rounded-lg bg-[#5DE2E7]/20 hover:bg-[#5DE2E7]/30 text-[#5DE2E7] hover:text-white border border-[#5DE2E7]/40 transition flex items-center gap-1 text-[11px] font-bold cursor-pointer shadow-sm"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Button</span>
              </button>
            </div>
          </div>

          {/* Interactive Live Preview Strip */}
          <div className="p-3 rounded-xl bg-slate-900/90 border border-white/10 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-[#5DE2E7] shrink-0" />
              <span className="text-[11px] font-bold text-slate-300">
                Live Preview (Hover to test official colors &amp; tooltip):
              </span>
            </div>

            <div className="flex items-center gap-2.5 flex-wrap">
              {socialButtons.filter(b => b.enabled).map((btn) => {
                const brandStyle = getSocialBrandStyles(btn.platform);
                return (
                  <div
                    key={btn.id}
                    className={`relative group w-8 h-8 sm:w-9 sm:h-9 rounded-full flex items-center justify-center bg-slate-950 border border-white/15 text-slate-400 transition-all duration-300 transform group-hover:scale-110 shadow-sm cursor-pointer ${brandStyle.hoverClass}`}
                    title={btn.name}
                  >
                    <BrandIcon name={btn.platform} className="w-4 h-4 transition-transform duration-200 group-hover:scale-110" />

                    {/* Tooltip on Hover */}
                    <div className="absolute -top-8 left-1/2 -translate-x-1/2 px-2 py-0.5 rounded-md bg-slate-950/95 text-white text-[10px] font-bold whitespace-nowrap border border-white/20 shadow-xl opacity-0 translate-y-1 group-hover:opacity-100 group-hover:translate-y-0 group-hover:-top-9 transition-all duration-200 pointer-events-none z-30 flex flex-col items-center">
                      <span>{btn.name || btn.platform}</span>
                      <div className="w-1.5 h-1.5 bg-slate-950 border-r border-b border-white/20 transform rotate-45 -mb-1 mt-0.5" />
                    </div>
                  </div>
                );
              })}
              {socialButtons.filter(b => b.enabled).length === 0 && (
                <span className="text-[11px] text-amber-400 italic">
                  No active social buttons. Click &quot;Add Button&quot; or enable one below.
                </span>
              )}
            </div>
          </div>

          {/* Buttons Editor List */}
          <div className="space-y-2 max-h-[380px] overflow-y-auto pr-1 scrollbar-thin">
            {socialButtons.map((btn, index) => {
              const brandStyle = getSocialBrandStyles(btn.platform);
              return (
                <div
                  key={btn.id}
                  className={`p-2.5 rounded-xl border transition-all flex flex-col sm:flex-row items-start sm:items-center gap-2.5 ${
                    btn.enabled
                      ? 'bg-slate-900/90 border-white/10'
                      : 'bg-slate-950/60 border-white/5 opacity-60'
                  }`}
                >
                  {/* Icon & Reorder Controls */}
                  <div className="flex items-center gap-1.5 shrink-0">
                    <div className="flex flex-col">
                      <button
                        type="button"
                        disabled={index === 0}
                        onClick={() => handleMoveButton(index, 'up')}
                        className="p-1 text-slate-400 hover:text-white disabled:opacity-20 transition"
                        title="Move Up"
                      >
                        <ArrowUp className="w-3 h-3" />
                      </button>
                      <button
                        type="button"
                        disabled={index === socialButtons.length - 1}
                        onClick={() => handleMoveButton(index, 'down')}
                        className="p-1 text-slate-400 hover:text-white disabled:opacity-20 transition"
                        title="Move Down"
                      >
                        <ArrowDown className="w-3 h-3" />
                      </button>
                    </div>

                    <div
                      className="w-8 h-8 rounded-full flex items-center justify-center border border-white/15 text-white shadow-inner"
                      style={{ backgroundColor: brandStyle.colorHex }}
                      title={`${btn.platform} official color: ${brandStyle.colorHex}`}
                    >
                      <BrandIcon name={btn.platform} className="w-4 h-4 text-white" />
                    </div>
                  </div>

                  {/* Platform selector */}
                  <div className="w-full sm:w-36 shrink-0">
                    <select
                      value={btn.platform}
                      onChange={e => handleUpdateSocialButton(btn.id, { platform: e.target.value as SocialPlatformType })}
                      className="w-full px-2.5 py-1.5 rounded-lg bg-slate-950 border border-white/15 text-white font-bold focus:outline-none focus:border-[#5DE2E7] text-[11px]"
                    >
                      {AVAILABLE_PLATFORMS.map(p => (
                        <option key={p.key} value={p.key} className="bg-slate-900 text-white">
                          {p.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Display Name / Tooltip Title */}
                  <div className="w-full sm:w-36 shrink-0">
                    <input
                      type="text"
                      placeholder="Tooltip Name"
                      value={btn.name}
                      onChange={e => handleUpdateSocialButton(btn.id, { name: e.target.value })}
                      className="w-full px-2.5 py-1.5 rounded-lg bg-slate-950 border border-white/15 text-white focus:outline-none focus:border-[#5DE2E7] text-[11px]"
                      title="Name shown in floating tooltip on hover"
                    />
                  </div>

                  {/* URL */}
                  <div className="w-full flex-1">
                    <input
                      type="url"
                      placeholder="https://your-profile-url..."
                      value={btn.url}
                      onChange={e => handleUpdateSocialButton(btn.id, { url: e.target.value })}
                      className="w-full px-2.5 py-1.5 rounded-lg bg-slate-950 border border-white/15 text-white focus:outline-none focus:border-[#5DE2E7] text-[11px]"
                    />
                  </div>

                  {/* Enabled Toggle & Delete */}
                  <div className="flex items-center gap-1.5 shrink-0 ml-auto sm:ml-0">
                    <button
                      type="button"
                      onClick={() => handleUpdateSocialButton(btn.id, { enabled: !btn.enabled })}
                      className={`px-2 py-1.5 rounded-lg text-[11px] font-bold flex items-center gap-1 transition cursor-pointer ${
                        btn.enabled
                          ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                          : 'bg-slate-800 text-slate-400 border border-white/10'
                      }`}
                      title={btn.enabled ? 'Click to hide from footer' : 'Click to show in footer'}
                    >
                      {btn.enabled ? (
                        <>
                          <Eye className="w-3.5 h-3.5" />
                          <span>Visible</span>
                        </>
                      ) : (
                        <>
                          <EyeOff className="w-3.5 h-3.5" />
                          <span>Hidden</span>
                        </>
                      )}
                    </button>

                    <button
                      type="button"
                      onClick={() => handleDeleteSocialButton(btn.id)}
                      className="p-1.5 rounded-lg bg-rose-500/10 hover:bg-rose-500/25 text-rose-400 hover:text-rose-300 border border-rose-500/20 transition cursor-pointer"
                      title="Delete Button"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <button
        type="submit"
        className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 text-white font-extrabold flex items-center gap-2 shadow-lg cursor-pointer hover:opacity-95 transition"
      >
        <Save className="w-4 h-4" /> Save Website Settings
      </button>
    </form>
  );
};
