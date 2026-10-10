import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import {
  Save,
  Send,
  Plus,
  Trash2,
  ArrowUp,
  ArrowDown,
  Eye,
  EyeOff,
  Layers,
  Sparkles,
  Link,
  Tag,
  Pencil,
  Check,
  X
} from 'lucide-react';
import { FloatingButton } from '../../types';
import { BrandIcon } from '../BrandIcons';

export const AdminTelegramSettings: React.FC = () => {
  const {
    siteSettings,
    updateSiteSettings,
    floatingButtonsSettings,
    updateFloatingButtonsSettings,
    addFloatingButton,
    updateFloatingButton,
    deleteFloatingButton,
    moveFloatingButton
  } = useApp();

  const [telegramChannel, setTelegramChannel] = useState(siteSettings.telegramChannel);
  const [telegramGroup, setTelegramGroup] = useState(siteSettings.telegramGroup);
  const [adminTelegram, setAdminTelegram] = useState(siteSettings.adminTelegram);

  // New Floating Button Form State
  const [newTitle, setNewTitle] = useState('');
  const [newUrl, setNewUrl] = useState('');
  const [newIcon, setNewIcon] = useState<FloatingButton['icon']>('telegram');
  const [newColor, setNewColor] = useState<FloatingButton['color']>('cyan');
  const [newBadge, setNewBadge] = useState('');
  const [newEnabled, setNewEnabled] = useState(true);

  // Edit Button State
  const [editingBtnId, setEditingBtnId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editUrl, setEditUrl] = useState('');
  const [editIcon, setEditIcon] = useState<FloatingButton['icon']>('telegram');
  const [editColor, setEditColor] = useState<FloatingButton['color']>('cyan');
  const [editBadge, setEditBadge] = useState('');
  const [editEnabled, setEditEnabled] = useState(true);

  const handleSaveRouting = (e: React.FormEvent) => {
    e.preventDefault();
    updateSiteSettings({
      telegramChannel,
      telegramGroup,
      adminTelegram
    });
  };

  const handleAddButton = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim() || !newUrl.trim()) return;

    addFloatingButton({
      title: newTitle.trim(),
      url: newUrl.trim(),
      icon: newIcon,
      color: newColor,
      badgeText: newBadge.trim() || undefined,
      enabled: newEnabled
    });

    // Reset Form
    setNewTitle('');
    setNewUrl('');
    setNewBadge('');
    setNewEnabled(true);
  };

  const startEditing = (btn: FloatingButton) => {
    setEditingBtnId(btn.id);
    setEditTitle(btn.title);
    setEditUrl(btn.url);
    setEditIcon(btn.icon);
    setEditColor(btn.color || 'cyan');
    setEditBadge(btn.badgeText || '');
    setEditEnabled(btn.enabled);
  };

  const cancelEditing = () => {
    setEditingBtnId(null);
  };

  const handleSaveEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingBtnId || !editTitle.trim() || !editUrl.trim()) return;

    updateFloatingButton(editingBtnId, {
      title: editTitle.trim(),
      url: editUrl.trim(),
      icon: editIcon,
      color: editColor,
      badgeText: editBadge.trim() || undefined,
      enabled: editEnabled
    });

    setEditingBtnId(null);
  };

  const sortedButtons = [...(floatingButtonsSettings?.buttons || [])].sort(
    (a, b) => (a.order || 0) - (b.order || 0)
  );

  return (
    <div className="space-y-8 text-xs text-slate-200">
      
      {/* SECTION 1: Main Telegram Link Routing */}
      <form onSubmit={handleSaveRouting} className="p-5 rounded-3xl bg-slate-950/80 border border-white/10 space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-white/10">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-cyan-500/20 border border-cyan-500/40 flex items-center justify-center text-[#5DE2E7]">
              <Send className="w-4 h-4 fill-current" />
            </div>
            <div>
              <h3 className="text-sm font-extrabold text-white">Telegram Gateway Routing</h3>
              <p className="text-[11px] text-slate-400">Set primary channel, group, and admin support URLs</p>
            </div>
          </div>

          <button
            type="submit"
            className="px-4 py-2 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-extrabold flex items-center gap-2 shadow-[0_0_15px_rgba(93,226,231,0.3)] transition cursor-pointer"
          >
            <Save className="w-3.5 h-3.5" /> Save URLs
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="space-y-1">
            <label className="block text-slate-300 font-bold">Main Telegram Channel URL *</label>
            <input
              type="text"
              required
              value={telegramChannel}
              onChange={e => setTelegramChannel(e.target.value)}
              placeholder="https://t.me/OnlineTaskLab"
              className="w-full px-3 py-2.5 rounded-xl bg-slate-900 border border-white/10 text-white focus:outline-none focus:border-[#5DE2E7]"
            />
          </div>

          <div className="space-y-1">
            <label className="block text-slate-300 font-bold">Telegram Community Group URL</label>
            <input
              type="text"
              value={telegramGroup}
              onChange={e => setTelegramGroup(e.target.value)}
              placeholder="https://t.me/OnlineTaskLabGroup"
              className="w-full px-3 py-2.5 rounded-xl bg-slate-900 border border-white/10 text-white focus:outline-none focus:border-[#5DE2E7]"
            />
          </div>

          <div className="space-y-1">
            <label className="block text-slate-300 font-bold">Admin Direct Telegram Contact URL</label>
            <input
              type="text"
              value={adminTelegram}
              onChange={e => setAdminTelegram(e.target.value)}
              placeholder="https://t.me/OnlineTaskLabAdmin"
              className="w-full px-3 py-2.5 rounded-xl bg-slate-900 border border-white/10 text-white focus:outline-none focus:border-[#5DE2E7]"
            />
          </div>
        </div>
      </form>

      {/* SECTION 2: FLOATING ACTION BUTTONS MANAGER */}
      <div className="p-5 sm:p-6 rounded-3xl bg-slate-950/80 border border-[#5DE2E7]/30 space-y-6 shadow-[0_0_30px_rgba(11,29,81,0.5)]">
        
        {/* Header & Global Controls */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-white/10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-cyan-500/20 to-blue-600/20 border border-[#5DE2E7]/40 flex items-center justify-center text-[#5DE2E7]">
              <Layers className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-black text-white flex items-center gap-2">
                <span>Floating Action Buttons Manager</span>
                <span className="px-2 py-0.5 rounded-full bg-[#5DE2E7]/20 text-[#5DE2E7] text-[10px] font-extrabold uppercase">
                  {sortedButtons.filter(b => b.enabled).length} Active
                </span>
              </h3>
              <p className="text-slate-400 text-xs">
                Control floating buttons on the screen, add multiple buttons, edit details, reorder top vs bottom position.
              </p>
            </div>
          </div>

          {/* Master Toggle */}
          <div className="flex items-center gap-3 bg-slate-900 p-2 rounded-2xl border border-white/10 self-start sm:self-auto">
            <span className="font-bold text-slate-300 pl-1">Floating Buttons:</span>
            <button
              type="button"
              onClick={() =>
                updateFloatingButtonsSettings({ enabled: !floatingButtonsSettings.enabled })
              }
              className={`px-3 py-1.5 rounded-xl font-extrabold text-xs flex items-center gap-1.5 transition ${
                floatingButtonsSettings.enabled
                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                  : 'bg-red-500/20 text-red-300 border border-red-500/40'
              }`}
            >
              {floatingButtonsSettings.enabled ? (
                <>
                  <Eye className="w-3.5 h-3.5 text-emerald-400" /> Enabled
                </>
              ) : (
                <>
                  <EyeOff className="w-3.5 h-3.5 text-red-400" /> Disabled
                </>
              )}
            </button>
          </div>
        </div>

        {/* Global Layout Options (Position & Stack Direction) */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 rounded-2xl bg-slate-900/90 border border-white/10">
          <div>
            <label className="block text-slate-300 font-bold mb-1.5">
              Screen Alignment Position
            </label>
            <select
              value={floatingButtonsSettings.position}
              onChange={e =>
                updateFloatingButtonsSettings({
                  position: e.target.value as 'bottom-right' | 'bottom-left'
                })
              }
              className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-white/15 text-white focus:outline-none focus:border-[#5DE2E7]"
            >
              <option value="bottom-right">Bottom Right Corner (Default)</option>
              <option value="bottom-left">Bottom Left Corner</option>
            </select>
          </div>

          <div>
            <label className="block text-slate-300 font-bold mb-1.5">
              Top / Bottom Ordering Display Order
            </label>
            <select
              value={floatingButtonsSettings.stackDirection}
              onChange={e =>
                updateFloatingButtonsSettings({
                  stackDirection: e.target.value as 'bottom-to-top' | 'top-to-bottom'
                })
              }
              className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-white/15 text-white focus:outline-none focus:border-[#5DE2E7]"
            >
              <option value="bottom-to-top">
                Bottom-to-Top Stack (First Button at Bottom, Newest at Top)
              </option>
              <option value="top-to-bottom">
                Top-to-Bottom Stack (First Button at Top, Newest at Bottom)
              </option>
            </select>
          </div>
        </div>

        {/* Form: Add New Floating Button */}
        <form onSubmit={handleAddButton} className="p-4 rounded-2xl bg-slate-900 border border-[#5DE2E7]/20 space-y-4">
          <div className="flex items-center gap-2 text-white font-extrabold">
            <Plus className="w-4 h-4 text-[#5DE2E7]" />
            <span>Add New Floating Button</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <div className="space-y-1">
              <label className="text-slate-300 font-bold block">Button Label *</label>
              <input
                type="text"
                required
                value={newTitle}
                onChange={e => setNewTitle(e.target.value)}
                placeholder="e.g. Join VIP Telegram"
                className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-white/10 text-white placeholder-slate-500 focus:outline-none focus:border-[#5DE2E7]"
              />
            </div>

            <div className="space-y-1">
              <label className="text-slate-300 font-bold block">Target Link / URL *</label>
              <div className="relative">
                <Link className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="url"
                  required
                  value={newUrl}
                  onChange={e => setNewUrl(e.target.value)}
                  placeholder="https://t.me/..."
                  className="w-full pl-9 pr-3 py-2 rounded-xl bg-slate-950 border border-white/10 text-white placeholder-slate-500 focus:outline-none focus:border-[#5DE2E7]"
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-slate-300 font-bold block">Platform / Icon</label>
              <select
                value={newIcon}
                onChange={e => setNewIcon(e.target.value as any)}
                className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-white/10 text-white focus:outline-none focus:border-[#5DE2E7]"
              >
                <option value="telegram">Telegram (Send Arrow)</option>
                <option value="send">Send Icon</option>
                <option value="whatsapp">WhatsApp / Chat</option>
                <option value="message-circle">Message Circle</option>
                <option value="youtube">YouTube</option>
                <option value="facebook">Facebook</option>
                <option value="instagram">Instagram</option>
                <option value="discord">Discord / Community</option>
                <option value="globe">Website / Globe</option>
                <option value="custom">External Custom Link</option>
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-slate-300 font-bold block">Gradient Theme Color</label>
              <select
                value={newColor}
                onChange={e => setNewColor(e.target.value as any)}
                className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-white/10 text-white focus:outline-none focus:border-[#5DE2E7]"
              >
                <option value="cyan">Cyan / Electric Blue</option>
                <option value="emerald">Emerald Green</option>
                <option value="amber">Amber Gold</option>
                <option value="rose">Rose Red</option>
                <option value="indigo">Deep Indigo</option>
                <option value="purple">Vibrant Purple</option>
              </select>
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
            <div className="flex items-center gap-3">
              <div className="space-y-1">
                <label className="text-slate-300 font-bold block">Badge Tag (Optional)</label>
                <div className="relative">
                  <Tag className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={newBadge}
                    onChange={e => setNewBadge(e.target.value)}
                    placeholder="e.g. Live, 24/7, Hot"
                    className="pl-9 pr-3 py-1.5 rounded-xl bg-slate-950 border border-white/10 text-white text-xs placeholder-slate-500 focus:outline-none focus:border-[#5DE2E7]"
                  />
                </div>
              </div>

              <div className="flex items-center gap-2 pt-5">
                <input
                  type="checkbox"
                  id="newEnabledCheck"
                  checked={newEnabled}
                  onChange={e => setNewEnabled(e.target.checked)}
                  className="w-4 h-4 rounded bg-slate-950 border-white/20 text-[#5DE2E7] focus:ring-0"
                />
                <label htmlFor="newEnabledCheck" className="text-slate-300 font-bold cursor-pointer">
                  Enable Button Immediately
                </label>
              </div>
            </div>

            <button
              type="submit"
              className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-extrabold flex items-center gap-2 shadow-[0_0_20px_rgba(93,226,231,0.4)] transition cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Add Floating Button</span>
            </button>
          </div>
        </form>

        {/* List of Configured Floating Buttons */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-extrabold text-white flex items-center gap-2">
              <Layers className="w-4 h-4 text-[#5DE2E7]" />
              <span>Configured Floating Buttons ({sortedButtons.length})</span>
            </h4>
            <span className="text-slate-400 text-[11px]">
              Use <ArrowUp className="w-3 h-3 inline text-cyan-400" /> and <ArrowDown className="w-3 h-3 inline text-cyan-400" /> to order which button stays at the TOP vs BOTTOM
            </span>
          </div>

          {sortedButtons.length === 0 ? (
            <div className="p-8 text-center bg-slate-900/60 rounded-2xl border border-white/5 space-y-2">
              <Sparkles className="w-8 h-8 text-slate-500 mx-auto" />
              <p className="text-slate-400 font-bold">No floating buttons added yet.</p>
              <p className="text-slate-500 text-[11px]">Use the form above to add your first floating button.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {sortedButtons.map((btn, index) => {
                const isFirst = index === 0;
                const isLast = index === sortedButtons.length - 1;
                const isEditingThis = editingBtnId === btn.id;

                if (isEditingThis) {
                  return (
                    <form
                      key={btn.id}
                      onSubmit={handleSaveEdit}
                      className="p-4 rounded-2xl border border-[#5DE2E7] bg-slate-900 space-y-4 shadow-[0_0_25px_rgba(93,226,231,0.25)] animate-in fade-in duration-200"
                    >
                      <div className="flex items-center justify-between pb-2 border-b border-white/10">
                        <span className="font-extrabold text-[#5DE2E7] flex items-center gap-2 text-xs">
                          <Pencil className="w-4 h-4" /> Editing Button #{index + 1}: {btn.title}
                        </span>

                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={cancelEditing}
                            className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs flex items-center gap-1 transition"
                          >
                            <X className="w-3.5 h-3.5" /> Cancel
                          </button>
                          <button
                            type="submit"
                            className="px-4 py-1.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-white font-extrabold text-xs flex items-center gap-1.5 shadow-[0_0_15px_rgba(16,185,129,0.4)] transition"
                          >
                            <Check className="w-3.5 h-3.5" /> Save Changes
                          </button>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                        <div className="space-y-1">
                          <label className="text-slate-300 font-bold block">Button Label *</label>
                          <input
                            type="text"
                            required
                            value={editTitle}
                            onChange={e => setEditTitle(e.target.value)}
                            className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-white/15 text-white focus:outline-none focus:border-[#5DE2E7]"
                          />
                        </div>

                        <div className="space-y-1">
                          <label className="text-slate-300 font-bold block">Target Link / URL *</label>
                          <input
                            type="url"
                            required
                            value={editUrl}
                            onChange={e => setEditUrl(e.target.value)}
                            className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-white/15 text-white focus:outline-none focus:border-[#5DE2E7]"
                          />
                        </div>

                        <div className="space-y-1">
                          <label className="text-slate-300 font-bold block">Platform / Icon</label>
                          <select
                            value={editIcon}
                            onChange={e => setEditIcon(e.target.value as any)}
                            className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-white/15 text-white focus:outline-none focus:border-[#5DE2E7]"
                          >
                            <option value="telegram">Telegram (Send Arrow)</option>
                            <option value="send">Send Icon</option>
                            <option value="whatsapp">WhatsApp / Chat</option>
                            <option value="message-circle">Message Circle</option>
                            <option value="youtube">YouTube</option>
                            <option value="facebook">Facebook</option>
                            <option value="instagram">Instagram</option>
                            <option value="discord">Discord / Community</option>
                            <option value="globe">Website / Globe</option>
                            <option value="custom">External Custom Link</option>
                          </select>
                        </div>

                        <div className="space-y-1">
                          <label className="text-slate-300 font-bold block">Gradient Theme Color</label>
                          <select
                            value={editColor}
                            onChange={e => setEditColor(e.target.value as any)}
                            className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-white/15 text-white focus:outline-none focus:border-[#5DE2E7]"
                          >
                            <option value="cyan">Cyan / Electric Blue</option>
                            <option value="emerald">Emerald Green</option>
                            <option value="amber">Amber Gold</option>
                            <option value="rose">Rose Red</option>
                            <option value="indigo">Deep Indigo</option>
                            <option value="purple">Vibrant Purple</option>
                          </select>
                        </div>
                      </div>

                      <div className="flex items-center justify-between gap-3 pt-1">
                        <div className="flex items-center gap-3">
                          <div className="space-y-1">
                            <label className="text-slate-300 font-bold block">Badge Tag (Optional)</label>
                            <input
                              type="text"
                              value={editBadge}
                              onChange={e => setEditBadge(e.target.value)}
                              placeholder="e.g. Live, 24/7"
                              className="px-3 py-1.5 rounded-xl bg-slate-950 border border-white/15 text-white text-xs focus:outline-none focus:border-[#5DE2E7]"
                            />
                          </div>

                          <div className="flex items-center gap-2 pt-5">
                            <input
                              type="checkbox"
                              id={`editEnabled_${btn.id}`}
                              checked={editEnabled}
                              onChange={e => setEditEnabled(e.target.checked)}
                              className="w-4 h-4 rounded bg-slate-950 border-white/20 text-[#5DE2E7] focus:ring-0 cursor-pointer"
                            />
                            <label htmlFor={`editEnabled_${btn.id}`} className="text-slate-300 font-bold cursor-pointer">
                              Enabled
                            </label>
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={cancelEditing}
                            className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs transition"
                          >
                            Cancel
                          </button>
                          <button
                            type="submit"
                            className="px-5 py-2 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-white font-extrabold text-xs shadow-[0_0_15px_rgba(16,185,129,0.4)] transition"
                          >
                            Save Changes
                          </button>
                        </div>
                      </div>
                    </form>
                  );
                }

                return (
                  <div
                    key={btn.id}
                    className={`p-3.5 rounded-2xl border transition flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                      btn.enabled
                        ? 'bg-slate-900 border-white/15 hover:border-[#5DE2E7]/40'
                        : 'bg-slate-950/60 border-white/5 opacity-60'
                    }`}
                  >
                    {/* Left Info */}
                    <div className="flex items-center gap-3">
                      {/* Position / Order Indicator */}
                      <div className="flex flex-col items-center justify-center w-9 h-9 rounded-xl bg-slate-950 border border-white/10 text-[10px] font-black text-[#5DE2E7]">
                        <span>#{index + 1}</span>
                        <span className="text-[8px] text-slate-400 uppercase">
                          {isFirst ? 'TOP' : isLast ? 'BOT' : 'MID'}
                        </span>
                      </div>

                      {/* Icon Preview */}
                      <div className="p-2.5 rounded-xl bg-slate-950 border border-white/10 text-[#5DE2E7] flex items-center justify-center">
                        <BrandIcon name={btn.icon} className="w-4 h-4 text-[#5DE2E7]" />
                      </div>

                      <div className="space-y-0.5">
                        <div className="flex items-center gap-2">
                          <span className="font-extrabold text-white text-xs">{btn.title}</span>
                          {btn.badgeText && (
                            <span className="px-1.5 py-0.2 bg-amber-400/20 text-amber-300 border border-amber-400/40 rounded-full text-[9px] font-black uppercase">
                              {btn.badgeText}
                            </span>
                          )}
                          <span className="px-1.5 py-0.2 bg-slate-800 text-slate-300 rounded text-[9px] font-mono capitalize">
                            {btn.color || 'cyan'}
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-400 truncate max-w-xs sm:max-w-md">
                          {btn.url}
                        </p>
                      </div>
                    </div>

                    {/* Right Controls (Up, Down, Toggle, EDIT, Delete) */}
                    <div className="flex items-center gap-2 self-end sm:self-auto shrink-0">
                      {/* Move Up */}
                      <button
                        type="button"
                        disabled={isFirst}
                        onClick={() => moveFloatingButton(btn.id, 'up')}
                        className={`p-2 rounded-xl border text-xs font-bold transition flex items-center gap-1 ${
                          isFirst
                            ? 'bg-slate-950 text-slate-600 border-white/5 cursor-not-allowed'
                            : 'bg-slate-800 hover:bg-[#133E87] text-white border-white/10 hover:border-[#5DE2E7]/40 cursor-pointer'
                        }`}
                        title="Move Up (Towards Top)"
                      >
                        <ArrowUp className="w-3.5 h-3.5 text-[#5DE2E7]" />
                        <span className="hidden md:inline">Top</span>
                      </button>

                      {/* Move Down */}
                      <button
                        type="button"
                        disabled={isLast}
                        onClick={() => moveFloatingButton(btn.id, 'down')}
                        className={`p-2 rounded-xl border text-xs font-bold transition flex items-center gap-1 ${
                          isLast
                            ? 'bg-slate-950 text-slate-600 border-white/5 cursor-not-allowed'
                            : 'bg-slate-800 hover:bg-[#133E87] text-white border-white/10 hover:border-[#5DE2E7]/40 cursor-pointer'
                        }`}
                        title="Move Down (Towards Bottom)"
                      >
                        <ArrowDown className="w-3.5 h-3.5 text-[#5DE2E7]" />
                        <span className="hidden md:inline">Bottom</span>
                      </button>

                      {/* Toggle Enable */}
                      <button
                        type="button"
                        onClick={() => updateFloatingButton(btn.id, { enabled: !btn.enabled })}
                        className={`p-2 rounded-xl border transition ${
                          btn.enabled
                            ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40 hover:bg-emerald-500/30'
                            : 'bg-slate-950 text-slate-500 border-white/10 hover:text-white'
                        }`}
                        title={btn.enabled ? 'Disable button' : 'Enable button'}
                      >
                        {btn.enabled ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
                      </button>

                      {/* Edit Button */}
                      <button
                        type="button"
                        onClick={() => startEditing(btn)}
                        className="p-2 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border border-amber-500/30 transition cursor-pointer flex items-center gap-1"
                        title="Edit button details"
                      >
                        <Pencil className="w-3.5 h-3.5" />
                        <span className="hidden md:inline text-[11px] font-bold">Edit</span>
                      </button>

                      {/* Delete Button */}
                      <button
                        type="button"
                        onClick={() => deleteFloatingButton(btn.id)}
                        className="p-2 rounded-xl bg-red-500/10 hover:bg-red-500/20 text-red-300 border border-red-500/30 transition cursor-pointer"
                        title="Delete button"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
