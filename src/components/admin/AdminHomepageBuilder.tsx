import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { AdminImageUploadInput } from './AdminImageUploadInput';
import { Save, Layout, Sparkles, Image, Link, BarChart3 } from 'lucide-react';

export const AdminHomepageBuilder: React.FC = () => {
  const { homepageBuilder, updateHomepageBuilder } = useApp();

  const [heroBadgeText, setHeroBadgeText] = useState(
    homepageBuilder.heroBadgeText || 'Telegram Driven Resource Hub • V1.0'
  );
  const [heroLogoText, setHeroLogoText] = useState(
    homepageBuilder.heroLogoText || 'OTL'
  );
  const [heroLogoUrl, setHeroLogoUrl] = useState(
    homepageBuilder.heroLogoUrl || ''
  );
  const [heroTitle, setHeroTitle] = useState(homepageBuilder.heroTitle);
  const [heroSubtitle, setHeroSubtitle] = useState(homepageBuilder.heroSubtitle);
  const [heroExploreBtnText, setHeroExploreBtnText] = useState(homepageBuilder.heroExploreBtnText);
  const [heroTelegramBtnText, setHeroTelegramBtnText] = useState(homepageBuilder.heroTelegramBtnText);
  const [heroTelegramBtnUrl, setHeroTelegramBtnUrl] = useState(
    homepageBuilder.heroTelegramBtnUrl || 'https://t.me/OnlineTaskLab'
  );

  // Stats controls
  const [stat1Value, setStat1Value] = useState(homepageBuilder.stat1Value || '');
  const [stat1Label, setStat1Label] = useState(homepageBuilder.stat1Label || 'TOTAL PRODUCTS');

  const [stat2Value, setStat2Value] = useState(homepageBuilder.stat2Value || '');
  const [stat2Label, setStat2Label] = useState(homepageBuilder.stat2Label || 'DOWNLOADS');

  const [stat3Value, setStat3Value] = useState(homepageBuilder.stat3Value || '');
  const [stat3Label, setStat3Label] = useState(homepageBuilder.stat3Label || 'TELEGRAM CLICKS');

  const [stat4Value, setStat4Value] = useState(homepageBuilder.stat4Value || '100%');
  const [stat4Label, setStat4Label] = useState(homepageBuilder.stat4Label || 'VERIFIED SAFE');

  const [homepageBannerEnabled, setHomepageBannerEnabled] = useState(homepageBuilder.homepageBannerEnabled);
  const [homepageBannerText, setHomepageBannerText] = useState(homepageBuilder.homepageBannerText);
  const [homepageBannerLink, setHomepageBannerLink] = useState(homepageBuilder.homepageBannerLink);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    updateHomepageBuilder({
      heroBadgeText,
      heroLogoText,
      heroLogoUrl,
      heroTitle,
      heroSubtitle,
      heroExploreBtnText,
      heroTelegramBtnText,
      heroTelegramBtnUrl,
      stat1Value,
      stat1Label,
      stat2Value,
      stat2Label,
      stat3Value,
      stat3Label,
      stat4Value,
      stat4Label,
      homepageBannerEnabled,
      homepageBannerText,
      homepageBannerLink
    });
  };

  return (
    <form onSubmit={handleSave} className="space-y-4 text-xs">
      <div className="p-4 rounded-2xl bg-slate-950/80 border border-white/10 space-y-3">
        <h3 className="text-sm font-extrabold text-white flex items-center gap-1.5 mb-2">
          <Layout className="w-4 h-4 text-[#5DE2E7]" /> Homepage Hero Section Builder
        </h3>

        {/* Hero Badge & Center Logo customization */}
        <div className="p-3 rounded-xl bg-slate-900/60 border border-white/5 space-y-3">
          <div className="font-bold text-slate-200 text-xs flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-[#5DE2E7]" /> Top Badge & Center Hero Logo Settings
          </div>

          <div>
            <label className="block text-slate-300 font-bold mb-1">
              Top Badge Text (e.g. Telegram Driven Resource Hub • V1.0)
            </label>
            <input
              type="text"
              value={heroBadgeText}
              onChange={e => setHeroBadgeText(e.target.value)}
              placeholder="Telegram Driven Resource Hub • V1.0"
              className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-white/10 text-white focus:outline-none focus:border-[#5DE2E7]"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-slate-300 font-bold mb-1">
                Center Logo Text (e.g. OTL)
              </label>
              <input
                type="text"
                value={heroLogoText}
                onChange={e => setHeroLogoText(e.target.value)}
                placeholder="OTL"
                className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-white/10 text-white focus:outline-none focus:border-[#5DE2E7]"
              />
            </div>

            <AdminImageUploadInput
              label="Center Custom Logo (URL / Device Gallery)"
              value={heroLogoUrl}
              onChange={setHeroLogoUrl}
              placeholder="https://example.com/logo.png or choose from device"
              helpText="Custom center emblem or brand logo on hero banner"
            />
          </div>
        </div>

        <div>
          <label className="block text-slate-300 font-bold mb-1">Hero Main Title</label>
          <input
            type="text"
            value={heroTitle}
            onChange={e => setHeroTitle(e.target.value)}
            className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-white/10 text-white focus:outline-none focus:border-[#5DE2E7]"
          />
        </div>

        <div>
          <label className="block text-slate-300 font-bold mb-1">Hero Subtitle</label>
          <textarea
            rows={2}
            value={heroSubtitle}
            onChange={e => setHeroSubtitle(e.target.value)}
            className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-white/10 text-white focus:outline-none focus:border-[#5DE2E7]"
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-slate-300 font-bold mb-1">Explore Button Text</label>
            <input
              type="text"
              value={heroExploreBtnText}
              onChange={e => setHeroExploreBtnText(e.target.value)}
              className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-white/10 text-white focus:outline-none focus:border-[#5DE2E7]"
            />
          </div>

          <div>
            <label className="block text-slate-300 font-bold mb-1">Telegram Button Text</label>
            <input
              type="text"
              value={heroTelegramBtnText}
              onChange={e => setHeroTelegramBtnText(e.target.value)}
              className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-white/10 text-white focus:outline-none focus:border-[#5DE2E7]"
            />
          </div>

          <div className="sm:col-span-2">
            <label className="block text-slate-300 font-bold mb-1 flex items-center gap-1">
              <Link className="w-3.5 h-3.5 text-[#5DE2E7]" /> Join Telegram Button Link URL *
            </label>
            <input
              type="text"
              required
              value={heroTelegramBtnUrl}
              onChange={e => setHeroTelegramBtnUrl(e.target.value)}
              placeholder="https://t.me/OnlineTaskLab"
              className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-white/10 text-white focus:outline-none focus:border-[#5DE2E7]"
            />
          </div>
        </div>
      </div>

      {/* Hero 4 Stat Cards Builder */}
      <div className="p-4 rounded-2xl bg-slate-950/80 border border-white/10 space-y-3">
        <h3 className="text-sm font-extrabold text-white flex items-center gap-1.5 mb-1">
          <BarChart3 className="w-4 h-4 text-[#5DE2E7]" /> Hero 4 Stat Cards Customization
        </h3>
        <p className="text-slate-400 text-[11px] mb-2">
          Customize the numbers/text and labels for the 4 stat boxes on the homepage. Leave value empty for automatic live calculation.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {/* Stat 1 */}
          <div className="p-3 rounded-xl bg-slate-900/60 border border-white/5 space-y-2">
            <span className="text-[#5DE2E7] font-bold text-[11px] uppercase block">Stat Card 1 (Total Products)</span>
            <div>
              <label className="block text-slate-400 text-[10px] mb-0.5">Custom Value (Leave blank for Auto count)</label>
              <input
                type="text"
                value={stat1Value}
                onChange={e => setStat1Value(e.target.value)}
                placeholder="Auto (e.g. 11+)"
                className="w-full px-3 py-1.5 rounded-lg bg-slate-900 border border-white/10 text-white focus:outline-none focus:border-[#5DE2E7]"
              />
            </div>
            <div>
              <label className="block text-slate-400 text-[10px] mb-0.5">Label Text</label>
              <input
                type="text"
                value={stat1Label}
                onChange={e => setStat1Label(e.target.value)}
                placeholder="TOTAL PRODUCTS"
                className="w-full px-3 py-1.5 rounded-lg bg-slate-900 border border-white/10 text-white focus:outline-none focus:border-[#5DE2E7]"
              />
            </div>
          </div>

          {/* Stat 2 */}
          <div className="p-3 rounded-xl bg-slate-900/60 border border-white/5 space-y-2">
            <span className="text-cyan-400 font-bold text-[11px] uppercase block">Stat Card 2 (Downloads)</span>
            <div>
              <label className="block text-slate-400 text-[10px] mb-0.5">Custom Value (Leave blank for Auto count)</label>
              <input
                type="text"
                value={stat2Value}
                onChange={e => setStat2Value(e.target.value)}
                placeholder="Auto (e.g. 43.2k+)"
                className="w-full px-3 py-1.5 rounded-lg bg-slate-900 border border-white/10 text-white focus:outline-none focus:border-[#5DE2E7]"
              />
            </div>
            <div>
              <label className="block text-slate-400 text-[10px] mb-0.5">Label Text</label>
              <input
                type="text"
                value={stat2Label}
                onChange={e => setStat2Label(e.target.value)}
                placeholder="DOWNLOADS"
                className="w-full px-3 py-1.5 rounded-lg bg-slate-900 border border-white/10 text-white focus:outline-none focus:border-[#5DE2E7]"
              />
            </div>
          </div>

          {/* Stat 3 */}
          <div className="p-3 rounded-xl bg-slate-900/60 border border-white/5 space-y-2">
            <span className="text-blue-400 font-bold text-[11px] uppercase block">Stat Card 3 (Telegram Clicks)</span>
            <div>
              <label className="block text-slate-400 text-[10px] mb-0.5">Custom Value (Leave blank for Auto count)</label>
              <input
                type="text"
                value={stat3Value}
                onChange={e => setStat3Value(e.target.value)}
                placeholder="Auto (e.g. 49.8k+)"
                className="w-full px-3 py-1.5 rounded-lg bg-slate-900 border border-white/10 text-white focus:outline-none focus:border-[#5DE2E7]"
              />
            </div>
            <div>
              <label className="block text-slate-400 text-[10px] mb-0.5">Label Text</label>
              <input
                type="text"
                value={stat3Label}
                onChange={e => setStat3Label(e.target.value)}
                placeholder="TELEGRAM CLICKS"
                className="w-full px-3 py-1.5 rounded-lg bg-slate-900 border border-white/10 text-white focus:outline-none focus:border-[#5DE2E7]"
              />
            </div>
          </div>

          {/* Stat 4 */}
          <div className="p-3 rounded-xl bg-slate-900/60 border border-white/5 space-y-2">
            <span className="text-amber-400 font-bold text-[11px] uppercase block">Stat Card 4 (Verified Safe)</span>
            <div>
              <label className="block text-slate-400 text-[10px] mb-0.5">Custom Value</label>
              <input
                type="text"
                value={stat4Value}
                onChange={e => setStat4Value(e.target.value)}
                placeholder="100%"
                className="w-full px-3 py-1.5 rounded-lg bg-slate-900 border border-white/10 text-white focus:outline-none focus:border-[#5DE2E7]"
              />
            </div>
            <div>
              <label className="block text-slate-400 text-[10px] mb-0.5">Label Text</label>
              <input
                type="text"
                value={stat4Label}
                onChange={e => setStat4Label(e.target.value)}
                placeholder="VERIFIED SAFE"
                className="w-full px-3 py-1.5 rounded-lg bg-slate-900 border border-white/10 text-white focus:outline-none focus:border-[#5DE2E7]"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Announcement Banner Box */}
      <div className="p-4 rounded-2xl bg-slate-950/80 border border-white/10 space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-extrabold text-white flex items-center gap-1.5">
            <Sparkles className="w-4 h-4 text-amber-400" /> Homepage VIP Announcement Banner
          </h3>
          <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold text-slate-300">
            <input
              type="checkbox"
              checked={homepageBannerEnabled}
              onChange={e => setHomepageBannerEnabled(e.target.checked)}
              className="rounded text-[#5DE2E7]"
            />
            <span>Enable Banner</span>
          </label>
        </div>

        {homepageBannerEnabled && (
          <div className="space-y-3 pt-2">
            <div>
              <label className="block text-slate-300 font-bold mb-1">Banner Announcement Text</label>
              <input
                type="text"
                value={homepageBannerText}
                onChange={e => setHomepageBannerText(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-white/10 text-white focus:outline-none focus:border-[#5DE2E7]"
              />
            </div>

            <div>
              <label className="block text-slate-300 font-bold mb-1">Banner Target Telegram Link</label>
              <input
                type="text"
                value={homepageBannerLink}
                onChange={e => setHomepageBannerLink(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-white/10 text-white focus:outline-none focus:border-[#5DE2E7]"
              />
            </div>
          </div>
        )}
      </div>

      <button
        type="submit"
        className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 text-white font-extrabold flex items-center gap-2 shadow-lg cursor-pointer"
      >
        <Save className="w-4 h-4" /> Save Homepage Layout
      </button>
    </form>
  );
};
