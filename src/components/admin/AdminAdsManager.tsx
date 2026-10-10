import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { AdminImageUploadInput } from './AdminImageUploadInput';
import { Save, Megaphone } from 'lucide-react';

export const AdminAdsManager: React.FC = () => {
  const { ads, updateAds } = useApp();

  const [currentAds, setCurrentAds] = useState(ads);

  const toggleAd = (id: string) => {
    setCurrentAds(prev =>
      prev.map(a => (a.id === id ? { ...a, enabled: !a.enabled } : a))
    );
  };

  const updateAdField = (id: string, field: string, val: string) => {
    setCurrentAds(prev =>
      prev.map(a => (a.id === id ? { ...a, [field]: val } : a))
    );
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    updateAds(currentAds);
  };

  return (
    <form onSubmit={handleSave} className="space-y-4 text-xs">
      <div className="flex items-center justify-between">
        <h3 className="text-base font-extrabold text-white flex items-center gap-2">
          <Megaphone className="w-4 h-4 text-amber-400" /> Advertisement & Promo Banners Manager
        </h3>
      </div>

      <div className="space-y-3">
        {currentAds.map(ad => (
          <div key={ad.id} className="p-4 rounded-2xl bg-slate-950/80 border border-white/10 space-y-3">
            <div className="flex items-center justify-between">
              <span className="font-bold text-white uppercase text-xs tracking-wider">
                {ad.type.replace('-', ' ')} ({ad.id})
              </span>
              <label className="flex items-center gap-2 cursor-pointer text-xs text-slate-300">
                <input
                  type="checkbox"
                  checked={ad.enabled}
                  onChange={() => toggleAd(ad.id)}
                  className="rounded text-[#5DE2E7]"
                />
                <span>Active</span>
              </label>
            </div>

            <div>
              <label className="block text-slate-300 font-bold mb-1">Title</label>
              <input
                type="text"
                value={ad.title}
                onChange={e => updateAdField(ad.id, 'title', e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-white/10 text-white"
              />
            </div>

            {ad.text !== undefined && (
              <div>
                <label className="block text-slate-300 font-bold mb-1">Banner Text</label>
                <input
                  type="text"
                  value={ad.text}
                  onChange={e => updateAdField(ad.id, 'text', e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-white/10 text-white"
                />
              </div>
            )}

            {/* Ad Banner Image Upload */}
            <AdminImageUploadInput
              label="Banner Creative Image (URL / Device Gallery)"
              value={ad.imageUrl || ''}
              onChange={val => updateAdField(ad.id, 'imageUrl', val)}
              placeholder="https://... or click Device Gallery"
              helpText="Optional visual creative banner for this promotional slot"
            />

            <div>
              <label className="block text-slate-300 font-bold mb-1">Target Telegram Link</label>
              <input
                type="text"
                value={ad.targetLink}
                onChange={e => updateAdField(ad.id, 'targetLink', e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-white/10 text-white"
              />
            </div>
          </div>
        ))}
      </div>

      <button
        type="submit"
        className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 text-white font-extrabold flex items-center gap-2 shadow-lg cursor-pointer"
      >
        <Save className="w-4 h-4" /> Save Advertisements
      </button>
    </form>
  );
};
