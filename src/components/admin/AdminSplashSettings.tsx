import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { Save, Eye, Sparkles } from 'lucide-react';

export const AdminSplashSettings: React.FC = () => {
  const { splashSettings, updateSplashSettings, triggerSplashLoaderPreview } = useApp();

  const [enabled, setEnabled] = useState(splashSettings.enabled);
  const [showOnlyFirstVisit, setShowOnlyFirstVisit] = useState(splashSettings.showOnlyFirstVisit);
  const [titleText, setTitleText] = useState(splashSettings.titleText);
  const [duration, setDuration] = useState(splashSettings.duration);
  const [animationStyle, setAnimationStyle] = useState(splashSettings.animationStyle);
  const [loadingTextsInput, setLoadingTextsInput] = useState(
    splashSettings.loadingTexts ? splashSettings.loadingTexts.join('\n') : ''
  );

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    const textsArr = loadingTextsInput.split('\n').map(t => t.trim()).filter(Boolean);
    updateSplashSettings({
      enabled,
      showOnlyFirstVisit,
      titleText,
      duration: Number(duration),
      animationStyle,
      loadingTexts: textsArr
    });
  };

  return (
    <form onSubmit={handleSave} className="space-y-4 text-xs">
      <div className="p-4 rounded-2xl bg-slate-950/80 border border-white/10 space-y-3">
        <div className="flex items-center justify-between border-b border-white/10 pb-2">
          <h3 className="text-sm font-extrabold text-white flex items-center gap-1.5">
            <Sparkles className="w-4 h-4 text-[#5DE2E7]" /> Animated Splash Loader Settings
          </h3>

          <button
            type="button"
            onClick={triggerSplashLoaderPreview}
            className="px-3 py-1.5 rounded-xl bg-[#133E87] hover:bg-cyan-500 text-white font-bold text-xs flex items-center gap-1 transition"
          >
            <Eye className="w-3.5 h-3.5 text-[#5DE2E7]" /> Live Preview
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
          <label className="flex items-center gap-2 cursor-pointer font-bold text-slate-200">
            <input
              type="checkbox"
              checked={enabled}
              onChange={e => setEnabled(e.target.checked)}
              className="rounded text-[#5DE2E7]"
            />
            <span>Enable Splash Loader Screen</span>
          </label>

          <label className="flex items-center gap-2 cursor-pointer font-bold text-slate-200">
            <input
              type="checkbox"
              checked={showOnlyFirstVisit}
              onChange={e => setShowOnlyFirstVisit(e.target.checked)}
              className="rounded text-[#5DE2E7]"
            />
            <span>Show Only On First Visit (Session)</span>
          </label>
        </div>

        <div>
          <label className="block text-slate-300 font-bold mb-1">Brand Title Text</label>
          <input
            type="text"
            value={titleText}
            onChange={e => setTitleText(e.target.value)}
            className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-white/10 text-white focus:outline-none focus:border-[#5DE2E7]"
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-slate-300 font-bold mb-1">Animation Style</label>
            <select
              value={animationStyle}
              onChange={e => setAnimationStyle(e.target.value as any)}
              className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-white/10 text-white focus:outline-none focus:border-[#5DE2E7]"
            >
              <option value="progress-bar">Glow Progress Bar (Recommended)</option>
              <option value="circular-ring">360° Circular Ring</option>
              <option value="dots">Animated Pulse Dots</option>
            </select>
          </div>

          <div>
            <label className="block text-slate-300 font-bold mb-1">Duration (Milliseconds)</label>
            <input
              type="number"
              value={duration}
              onChange={e => setDuration(Number(e.target.value))}
              className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-white/10 text-white focus:outline-none focus:border-[#5DE2E7]"
            />
          </div>
        </div>

        <div>
          <label className="block text-slate-300 font-bold mb-1">Cycling Status Messages (One per line)</label>
          <textarea
            rows={4}
            value={loadingTextsInput}
            onChange={e => setLoadingTextsInput(e.target.value)}
            className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-white/10 text-white focus:outline-none focus:border-[#5DE2E7] font-mono text-xs"
          />
        </div>
      </div>

      <button
        type="submit"
        className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 text-white font-extrabold flex items-center gap-2 shadow-lg cursor-pointer"
      >
        <Save className="w-4 h-4" /> Save Splash Loader Settings
      </button>
    </form>
  );
};
