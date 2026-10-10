import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { Save, Smartphone } from 'lucide-react';

export const AdminMobileNavSettings: React.FC = () => {
  const { mobileNavSettings, updateMobileNavSettings } = useApp();

  const [enabled, setEnabled] = useState(mobileNavSettings.enabled);
  const [position, setPosition] = useState(mobileNavSettings.position);
  const [glowActive, setGlowActive] = useState(mobileNavSettings.glowActive);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    updateMobileNavSettings({
      enabled,
      position,
      glowActive
    });
  };

  return (
    <form onSubmit={handleSave} className="space-y-4 text-xs">
      <div className="p-4 rounded-2xl bg-slate-950/80 border border-white/10 space-y-3">
        <h3 className="text-sm font-extrabold text-white flex items-center gap-1.5 mb-2">
          <Smartphone className="w-4 h-4 text-[#5DE2E7]" /> Mobile Floating Sidebar Navigation (YouTube Style)
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
          <label className="flex items-center gap-2 cursor-pointer font-bold text-slate-200">
            <input
              type="checkbox"
              checked={enabled}
              onChange={e => setEnabled(e.target.checked)}
              className="rounded text-[#5DE2E7]"
            />
            <span>Enable Mobile Fixed Navigation</span>
          </label>

          <label className="flex items-center gap-2 cursor-pointer font-bold text-slate-200">
            <input
              type="checkbox"
              checked={glowActive}
              onChange={e => setGlowActive(e.target.checked)}
              className="rounded text-[#5DE2E7]"
            />
            <span>Active Item Cyan Glow Effect</span>
          </label>
        </div>

        <div>
          <label className="block text-slate-300 font-bold mb-1">Sidebar Position</label>
          <select
            value={position}
            onChange={e => setPosition(e.target.value as any)}
            className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-white/10 text-white focus:outline-none focus:border-[#5DE2E7]"
          >
            <option value="fixed-left">Fixed Left Sidebar (YouTube App Style)</option>
            <option value="fixed-bottom">Fixed Bottom Bar</option>
          </select>
        </div>
      </div>

      <button
        type="submit"
        className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 text-white font-extrabold flex items-center gap-2 shadow-lg cursor-pointer"
      >
        <Save className="w-4 h-4" /> Save Mobile Navigation Settings
      </button>
    </form>
  );
};
