import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { Resource, ResourceCategory, PresetGalleryItem } from '../../types';
import { CategoryIcon } from '../CategoryIcon';
import { AdminImageUploadInput } from './AdminImageUploadInput';
import {
  Plus,
  Edit,
  Trash2,
  Copy,
  Check,
  X,
  Smartphone,
  Layout,
  Bot,
  Sliders,
  Image as ImageIcon,
  Images,
  Layers,
  Search,
  ExternalLink,
  Sparkles,
  Flame,
  ArrowRight,
  Filter
} from 'lucide-react';
import { Link } from 'react-router-dom';

export const AdminProducts: React.FC = () => {
  const { resources, categories, addResource, updateResource, deleteResource, cloneResource, resetToDefaults, showToast } = useApp();

  // Active Category Filter for Products view
  const [selectedAdminCategory, setSelectedAdminCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');

  const [isEditing, setIsEditing] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [productToDelete, setProductToDelete] = useState<Resource | null>(null);

  // Form states
  const [title, setTitle] = useState('');
  const [slug, setSlug] = useState('');
  const [category, setCategory] = useState<ResourceCategory>('apps');
  const [shortDescription, setShortDescription] = useState('');
  const [fullDescription, setFullDescription] = useState('');
  const [thumbnail, setThumbnail] = useState('');
  const [version, setVersion] = useState('v1.0');
  const [fileSize, setFileSize] = useState('10 MB');
  const [downloadUrl, setDownloadUrl] = useState('https://t.me/OnlineTaskLab');
  const [telegramUrl, setTelegramUrl] = useState('https://t.me/OnlineTaskLab');
  const [tagsInput, setTagsInput] = useState('');
  const [isFeatured, setIsFeatured] = useState(false);
  const [isTrending, setIsTrending] = useState(false);

  // Category specific fields
  const [apkVersion, setApkVersion] = useState('');
  const [requirements, setRequirements] = useState('');
  const [packageName, setPackageName] = useState('');
  const [modInfo, setModInfo] = useState('');
  const [demoUrl, setDemoUrl] = useState('');
  const [promptText, setPromptText] = useState('');
  const [aiModel, setAiModel] = useState<any>('Midjourney V6');
  const [beforeImage, setBeforeImage] = useState('');
  const [afterImage, setAfterImage] = useState('');
  const [presetFormat, setPresetFormat] = useState<any>('.DNG');
  const [presetGallery, setPresetGallery] = useState<PresetGalleryItem[]>([]);

  const openNewForm = () => {
    setIsEditing(true);
    setEditingId(null);
    setTitle('');
    setSlug('');
    // Pre-select active category if one is chosen, otherwise fallback to first available or 'apps'
    const defaultCat = selectedAdminCategory !== 'all' 
      ? selectedAdminCategory 
      : (categories[0]?.id || 'apps');
    setCategory(defaultCat);
    setShortDescription('');
    setFullDescription('');
    setThumbnail('https://images.unsplash.com/photo-1574717024653-61fd2cf4d44d?auto=format&fit=crop&w=600&q=80');
    setVersion('v1.0');
    setFileSize('25 MB');
    setDownloadUrl('https://t.me/OnlineTaskLab');
    setTelegramUrl('https://t.me/OnlineTaskLab');
    setTagsInput('Mod APK, Pro Unlocked, Premium');
    setIsFeatured(false);
    setIsTrending(false);
    setApkVersion('1.0.0 Pro Mod');
    setRequirements('Android 6.0+');
    setPackageName('com.mod.apk');
    setModInfo('Premium Unlocked / No Ads / Pro Features');
    setDemoUrl('');
    setPromptText('');
    setBeforeImage('');
    setAfterImage('');
    setPresetGallery([]);
  };

  const openEditForm = (res: Resource) => {
    setIsEditing(true);
    setEditingId(res.id);
    setTitle(res.title);
    setSlug(res.slug);
    setCategory(res.category);
    setShortDescription(res.shortDescription);
    setFullDescription(res.fullDescription);
    setThumbnail(res.thumbnail);
    setVersion(res.version);
    setFileSize(res.fileSize);
    setDownloadUrl(res.downloadUrl);
    setTelegramUrl(res.telegramUrl);
    setTagsInput(res.tags ? res.tags.join(', ') : '');
    setIsFeatured(res.isFeatured);
    setIsTrending(res.isTrending);

    setApkVersion(res.apkVersion || '');
    setRequirements(res.requirements || '');
    setPackageName(res.packageName || '');
    setModInfo(res.modInfo || '');
    setDemoUrl(res.demoUrl || '');
    setPromptText(res.promptText || '');
    setAiModel(res.aiModel || 'Midjourney V6');
    setBeforeImage(res.beforeImage || '');
    setAfterImage(res.afterImage || '');
    setPresetFormat(res.presetFormat || '.DNG');
    setPresetGallery(res.presetGallery && Array.isArray(res.presetGallery) ? [...res.presetGallery] : []);

    // Scroll smoothly to the edit form
    window.scrollTo({ top: 300, behavior: 'smooth' });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const tagsArr = tagsInput
      ? tagsInput.split(',').map(t => t.trim()).filter(Boolean)
      : [];

    const formData = {
      title,
      slug: slug || title.toLowerCase().replace(/\s+/g, '-').replace(/[^\w-]/g, ''),
      category,
      shortDescription,
      fullDescription: fullDescription || shortDescription,
      thumbnail,
      version,
      fileSize,
      downloadUrl,
      telegramUrl,
      tags: tagsArr,
      isFeatured,
      isTrending,
      apkVersion,
      requirements,
      packageName,
      modInfo,
      demoUrl,
      promptText,
      aiModel,
      beforeImage,
      afterImage,
      presetFormat,
      presetGallery: category === 'lr-presets' ? presetGallery : undefined
    };

    if (editingId) {
      updateResource(editingId, formData);
      showToast(`Product "${title}" updated successfully!`);
    } else {
      addResource(formData as any);
      showToast(`New product "${title}" added to ${category}!`);
    }

    setIsEditing(false);
  };

  const confirmDeleteProduct = () => {
    if (!productToDelete) return;
    deleteResource(productToDelete.id);
    showToast(`Product "${productToDelete.title}" deleted.`);
    setProductToDelete(null);
  };

  // Filtered resources according to Category & Search Query
  const filteredResources = resources.filter(res => {
    const matchesCategory = selectedAdminCategory === 'all' || res.category === selectedAdminCategory;
    const matchesSearch = !searchQuery.trim() || 
      res.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      res.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      res.shortDescription.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (res.tags && res.tags.some(t => t.toLowerCase().includes(searchQuery.toLowerCase())));
    return matchesCategory && matchesSearch;
  });

  const activeCategoryObj = categories.find(c => c.id === selectedAdminCategory);

  return (
    <div className="space-y-6 text-xs">
      
      {/* 1. TOP CATEGORY CARDS / TABS SELECTOR (Auto-updates when new categories are created) */}
      <div className="space-y-2">
        <div className="flex items-center justify-between px-1">
          <span className="text-slate-300 font-bold uppercase tracking-wider text-[11px] flex items-center gap-1.5">
            <Filter className="w-3.5 h-3.5 text-[#5DE2E7]" />
            <span>Filter Products by Category</span>
          </span>
          <span className="text-slate-400 text-[11px]">
            {categories.length} total categories active
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2.5">
          {/* "All Products" Card */}
          <button
            type="button"
            onClick={() => setSelectedAdminCategory('all')}
            className={`p-3.5 rounded-2xl border text-left transition-all relative overflow-hidden group flex flex-col justify-between ${
              selectedAdminCategory === 'all'
                ? 'bg-gradient-to-br from-[#133E87]/90 via-[#0B1D51] to-slate-900 border-[#5DE2E7] shadow-[0_0_20px_rgba(93,226,231,0.35)] ring-1 ring-[#5DE2E7]'
                : 'bg-slate-900/70 hover:bg-slate-900 border-white/10 hover:border-white/20'
            }`}
          >
            <div className="flex items-center justify-between w-full mb-2">
              <div className={`w-8 h-8 rounded-xl flex items-center justify-center border transition-transform group-hover:scale-105 ${
                selectedAdminCategory === 'all'
                  ? 'bg-[#5DE2E7]/20 border-[#5DE2E7] text-[#5DE2E7]'
                  : 'bg-white/5 border-white/10 text-slate-400'
              }`}>
                <Layers className="w-4 h-4" />
              </div>
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                selectedAdminCategory === 'all'
                  ? 'bg-[#5DE2E7] text-slate-950 font-black'
                  : 'bg-white/5 text-slate-300 border border-white/10'
              }`}>
                {resources.length}
              </span>
            </div>

            <div>
              <div className="font-extrabold text-white text-xs truncate">
                All Products
              </div>
              <div className="text-[10px] text-slate-400">
                View all items
              </div>
            </div>
          </button>

          {/* Dynamic Category Cards */}
          {categories.map(cat => {
            const count = resources.filter(r => r.category === cat.id).length;
            const isSelected = selectedAdminCategory === cat.id;

            return (
              <button
                key={cat.id}
                type="button"
                onClick={() => setSelectedAdminCategory(cat.id)}
                className={`p-3.5 rounded-2xl border text-left transition-all relative overflow-hidden group flex flex-col justify-between ${
                  isSelected
                    ? 'bg-gradient-to-br from-[#133E87]/90 via-[#0B1D51] to-slate-900 border-[#5DE2E7] shadow-[0_0_20px_rgba(93,226,231,0.35)] ring-1 ring-[#5DE2E7]'
                    : 'bg-slate-900/70 hover:bg-slate-900 border-white/10 hover:border-white/20'
                }`}
              >
                {/* Background faint banner image preview if available */}
                {cat.banner && (
                  <div
                    className="absolute inset-0 opacity-5 group-hover:opacity-10 transition-opacity bg-cover bg-center pointer-events-none"
                    style={{ backgroundImage: `url(${cat.banner})` }}
                  />
                )}

                <div className="flex items-center justify-between w-full mb-2 relative z-10">
                  <div className={`w-8 h-8 rounded-xl flex items-center justify-center border transition-transform group-hover:scale-105 ${
                    isSelected
                      ? 'bg-[#5DE2E7]/20 border-[#5DE2E7] text-[#5DE2E7]'
                      : 'bg-white/5 border-white/10 text-slate-400'
                  }`}>
                    <CategoryIcon name={cat.icon || cat.id} className="w-4 h-4" />
                  </div>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                    isSelected
                      ? 'bg-[#5DE2E7] text-slate-950 font-black'
                      : 'bg-white/5 text-slate-300 border border-white/10'
                  }`}>
                    {count}
                  </span>
                </div>

                <div className="relative z-10">
                  <div className="font-extrabold text-white text-xs truncate">
                    {cat.name}
                  </div>
                  <div className="text-[10px] text-slate-400 font-mono truncate">
                    /{cat.id}
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* 2. Top Header with Actions and Search */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-2xl bg-slate-900/60 border border-white/10">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-base font-extrabold text-white flex items-center gap-2">
              <span>Resource Products Manager</span>
            </h3>
            {activeCategoryObj && (
              <span className="px-2 py-0.5 rounded-lg bg-[#5DE2E7]/20 text-[#5DE2E7] border border-[#5DE2E7]/30 text-[10px] font-extrabold">
                {activeCategoryObj.name}
              </span>
            )}
          </div>
          <p className="text-xs text-slate-400 mt-0.5">
            {selectedAdminCategory === 'all'
              ? `Showing all ${filteredResources.length} products across ${categories.length} categories.`
              : `Showing ${filteredResources.length} product(s) in category "${activeCategoryObj?.name || selectedAdminCategory}". Click Edit on any product to modify.`}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Quick Search */}
          <div className="relative">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search products by title, tag or ID..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="pl-8 pr-3 py-2 rounded-xl bg-slate-950 border border-white/10 text-white placeholder-slate-500 focus:outline-none focus:border-[#5DE2E7] text-xs w-48 sm:w-56"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
              >
                <X className="w-3 h-3" />
              </button>
            )}
          </div>

          <button
            onClick={resetToDefaults}
            className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 border border-white/10 text-xs font-bold transition-all whitespace-nowrap"
            title="Reload all default demo products into system"
          >
            Restore Demo Products
          </button>

          <button
            onClick={openNewForm}
            className="px-4 py-2 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-bold text-xs flex items-center gap-1.5 shadow-[0_0_15px_rgba(93,226,231,0.3)] whitespace-nowrap"
          >
            <Plus className="w-4 h-4" />
            <span>Add New Resource</span>
          </button>
        </div>
      </div>

      {/* 3. Edit / Add Modal Form */}
      {isEditing && (
        <div className="p-5 rounded-2xl bg-slate-900 border border-[#5DE2E7]/40 shadow-[0_0_25px_rgba(93,226,231,0.2)] space-y-4 animate-in fade-in duration-150">
          <div className="flex items-center justify-between border-b border-white/10 pb-3">
            <h4 className="text-sm font-bold text-white flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-[#5DE2E7]" />
              <span>{editingId ? `Edit Product: ${title || editingId}` : 'Create New Digital Resource'}</span>
            </h4>
            <button onClick={() => setIsEditing(false)} className="p-1 rounded-lg bg-white/5 text-slate-400 hover:text-white">
              <X className="w-4 h-4" />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4 text-xs">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-slate-300 font-bold mb-1">Product Title *</label>
                <input
                  type="text"
                  required
                  value={title}
                  placeholder="e.g. Canva Pro Mod APK, Cyberpunk Landing Page..."
                  onChange={e => setTitle(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-white/10 text-white focus:outline-none focus:border-[#5DE2E7]"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-bold mb-1">Assigned Category *</label>
                <select
                  value={category}
                  onChange={e => setCategory(e.target.value as ResourceCategory)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-white/10 text-white focus:outline-none focus:border-[#5DE2E7] font-semibold"
                >
                  {categories.map(c => (
                    <option key={c.id} value={c.id}>
                      {c.name} ({c.id})
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-slate-300 font-bold mb-1">Version</label>
                <input
                  type="text"
                  value={version}
                  placeholder="e.g. v2.1.0"
                  onChange={e => setVersion(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl bg-slate-950 border border-white/10 text-white focus:outline-none focus:border-[#5DE2E7]"
                />
              </div>
              <div>
                <label className="block text-slate-300 font-bold mb-1">File Size</label>
                <input
                  type="text"
                  value={fileSize}
                  placeholder="e.g. 45 MB"
                  onChange={e => setFileSize(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl bg-slate-950 border border-white/10 text-white focus:outline-none focus:border-[#5DE2E7]"
                />
              </div>
            </div>

            {/* Thumbnail Image with Device Gallery & URL upload */}
            <AdminImageUploadInput
              label="Thumbnail Image URL / Device Photo"
              value={thumbnail}
              onChange={setThumbnail}
              placeholder="https://images.unsplash.com/... or click Device Gallery"
              helpText="Paste any image URL or click 'Device Gallery' to upload directly from your phone/computer gallery."
            />

            <div>
              <label className="block text-slate-300 font-bold mb-1">Short Description *</label>
              <textarea
                required
                rows={2}
                value={shortDescription}
                placeholder="Short summary displayed on product cards..."
                onChange={e => setShortDescription(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-white/10 text-white focus:outline-none focus:border-[#5DE2E7]"
              />
            </div>

            <div>
              <label className="block text-slate-300 font-bold mb-1">Full Description / Features / Changelog</label>
              <textarea
                rows={3}
                value={fullDescription}
                placeholder="Comprehensive details shown inside the product modal popup..."
                onChange={e => setFullDescription(e.target.value)}
                className="w-full px-3.5 py-2 rounded-xl bg-slate-950 border border-white/10 text-white focus:outline-none focus:border-[#5DE2E7]"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-slate-300 font-bold mb-1">Telegram Download Link *</label>
                <input
                  type="text"
                  required
                  value={downloadUrl}
                  placeholder="https://t.me/OnlineTaskLab/..."
                  onChange={e => setDownloadUrl(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl bg-slate-950 border border-white/10 text-white focus:outline-none focus:border-[#5DE2E7]"
                />
              </div>
              <div>
                <label className="block text-slate-300 font-bold mb-1">Telegram Post / Channel URL</label>
                <input
                  type="text"
                  value={telegramUrl}
                  placeholder="https://t.me/OnlineTaskLab"
                  onChange={e => setTelegramUrl(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl bg-slate-950 border border-white/10 text-white focus:outline-none focus:border-[#5DE2E7]"
                />
              </div>
            </div>

            {/* Tags Input (Dynamic Filter & Modal Badges) */}
            <div className="p-3.5 rounded-2xl bg-slate-950/90 border border-cyan-500/30 space-y-2">
              <div className="flex items-center justify-between">
                <label className="block text-cyan-300 font-bold">
                  Product Filter Tags (Comma-Separated) *
                </label>
                <span className="text-[10px] text-slate-400">Generates category filter tabs & badges</span>
              </div>
              <input
                type="text"
                value={tagsInput}
                onChange={e => setTagsInput(e.target.value)}
                placeholder="e.g. Canva, Graphic Design, Pro APK, Brand Kit, AI Tools"
                className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-white/10 text-white focus:outline-none focus:border-[#5DE2E7]"
              />
              {tagsInput && (
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {tagsInput
                    .split(',')
                    .map(t => t.trim())
                    .filter(Boolean)
                    .map((tag, idx) => (
                      <span
                        key={idx}
                        className="px-2 py-0.5 rounded-lg bg-cyan-500/10 text-cyan-300 text-[11px] font-medium border border-cyan-500/20"
                      >
                        #{tag}
                      </span>
                    ))}
                </div>
              )}
            </div>

            {/* Dynamic Custom Extra Fields based on category */}
            {category === 'apps' && (
              <div className="p-3.5 rounded-2xl bg-emerald-950/20 border border-emerald-500/30 space-y-3">
                <div className="font-bold text-emerald-400 flex items-center gap-1.5">
                  <Smartphone className="w-4 h-4" /> Mobile App (APK Details)
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-slate-300 font-bold mb-1">APK Version</label>
                    <input
                      type="text"
                      value={apkVersion}
                      onChange={e => setApkVersion(e.target.value)}
                      placeholder="e.g. v2.248.0 Pro"
                      className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-white/10 text-white focus:outline-none focus:border-emerald-400"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-300 font-bold mb-1">Android Requirements</label>
                    <input
                      type="text"
                      value={requirements}
                      onChange={e => setRequirements(e.target.value)}
                      placeholder="e.g. Android 6.0 and up"
                      className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-white/10 text-white focus:outline-none focus:border-emerald-400"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-300 font-bold mb-1">Package Name</label>
                    <input
                      type="text"
                      value={packageName}
                      onChange={e => setPackageName(e.target.value)}
                      placeholder="e.g. com.canva.editor"
                      className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-white/10 text-white focus:outline-none focus:border-emerald-400"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-slate-300 font-bold mb-1">MOD Features Info</label>
                  <input
                    type="text"
                    value={modInfo}
                    onChange={e => setModInfo(e.target.value)}
                    placeholder="e.g. Premium Brand Kit Unlocked, No Watermark, Ad-Free"
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-white/10 text-white focus:outline-none focus:border-emerald-400"
                  />
                </div>
              </div>
            )}

            {category === 'landing-pages' && (
              <div className="p-3.5 rounded-2xl bg-indigo-950/20 border border-indigo-500/30 space-y-3">
                <div className="font-bold text-indigo-400 flex items-center gap-1.5">
                  <Layout className="w-4 h-4" /> Landing Page Template Settings
                </div>
                <div>
                  <label className="block text-slate-300 font-bold mb-1">Live Preview Demo URL (Optional)</label>
                  <input
                    type="text"
                    value={demoUrl}
                    onChange={e => setDemoUrl(e.target.value)}
                    placeholder="https://example.com/demo/preview"
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-white/10 text-white focus:outline-none focus:border-indigo-400"
                  />
                  <span className="text-[10px] text-slate-400">Shows the 'LIVE PREVIEW DEMO' banner with 'Launch Demo' button in product modal</span>
                </div>
                <div>
                  <label className="block text-slate-300 font-bold mb-1">Tech Stack & Frameworks</label>
                  <input
                    type="text"
                    value={modInfo}
                    onChange={e => setModInfo(e.target.value)}
                    placeholder="e.g. React 19, Tailwind CSS, Framer Motion, HTML5"
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-white/10 text-white focus:outline-none focus:border-indigo-400"
                  />
                </div>
              </div>
            )}

            {category === 'ai-prompts' && (
              <div className="p-3.5 rounded-2xl bg-purple-950/20 border border-purple-500/30 space-y-3">
                <div className="font-bold text-purple-400 flex items-center gap-1.5">
                  <Bot className="w-4 h-4" /> AI Prompt Configuration
                </div>
                <div>
                  <label className="block text-slate-300 font-bold mb-1">AI Model Compatible</label>
                  <select
                    value={aiModel}
                    onChange={e => setAiModel(e.target.value as any)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-white/10 text-white focus:outline-none focus:border-purple-400"
                  >
                    <option value="Midjourney V6">Midjourney V6</option>
                    <option value="ChatGPT 4o">ChatGPT 4o</option>
                    <option value="Gemini 1.5 Pro">Gemini 1.5 Pro</option>
                    <option value="Claude 3.5 Sonnet">Claude 3.5 Sonnet</option>
                    <option value="Stable Diffusion XL">Stable Diffusion XL</option>
                    <option value="DALL-E 3">DALL-E 3</option>
                  </select>
                </div>
                <div>
                  <label className="block text-purple-300 font-bold mb-1">Exact AI Prompt Text (Copyable by user)</label>
                  <textarea
                    rows={3}
                    value={promptText}
                    onChange={e => setPromptText(e.target.value)}
                    placeholder="/imagine prompt: ultra-detailed cinematic 8k render..."
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-white/10 text-white font-mono text-[11px] focus:outline-none focus:border-purple-400"
                  />
                </div>
              </div>
            )}

            {category === 'lr-presets' && (
              <div className="p-3.5 rounded-2xl bg-amber-950/20 border border-amber-500/30 space-y-3">
                <div className="font-bold text-amber-400 flex items-center gap-1.5">
                  <Sliders className="w-4 h-4" /> Lightroom Preset Settings
                </div>
                <div>
                  <label className="block text-slate-300 font-bold mb-1">Live Preview Demo URL (Optional)</label>
                  <input
                    type="text"
                    value={demoUrl}
                    onChange={e => setDemoUrl(e.target.value)}
                    placeholder="https://example.com/demo/preset-preview"
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-white/10 text-white focus:outline-none focus:border-amber-400"
                  />
                  <span className="text-[10px] text-slate-400">Shows the 'LIVE PREVIEW DEMO' banner with 'Launch Demo' button in product modal</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-slate-300 font-bold mb-1">Preset Format</label>
                    <select
                      value={presetFormat}
                      onChange={e => setPresetFormat(e.target.value as any)}
                      className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-white/10 text-white focus:outline-none focus:border-amber-400"
                    >
                      <option value=".DNG">.DNG (Mobile & Desktop)</option>
                      <option value=".XMP">.XMP (Desktop Classic)</option>
                      <option value=".ZIP">.ZIP (Full Bundle)</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-slate-300 font-bold mb-1">Compatibility / Info</label>
                    <input
                      type="text"
                      value={modInfo}
                      onChange={e => setModInfo(e.target.value)}
                      placeholder="e.g. Lightroom CC / Mobile & Desktop, iOS & Android"
                      className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-white/10 text-white focus:outline-none focus:border-amber-400"
                    />
                  </div>
                </div>

                {/* Primary Before/After Pair */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="block text-amber-300 font-bold">
                      Before &amp; After Image Comparison (URLs / Device Uploads) — Main Preview
                    </label>
                    <span className="text-[10px] text-amber-400/80 font-semibold uppercase tracking-wider">
                      Primary Sample #1
                    </span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <AdminImageUploadInput
                      label="Before Image (Original)"
                      value={beforeImage}
                      onChange={setBeforeImage}
                      placeholder="Before Image URL (Original)..."
                      helpText="Original unedited photo"
                    />
                    <AdminImageUploadInput
                      label="After Image (Edited with Preset)"
                      value={afterImage}
                      onChange={setAfterImage}
                      placeholder="After Image URL (Preset Applied)..."
                      helpText="Photo edited with Lightroom preset"
                    />
                  </div>
                </div>

                {/* Additional Preset Comparison Gallery Items (Multiple Before/After pairs) */}
                <div className="pt-3 border-t border-amber-500/20 space-y-3">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div>
                      <div className="flex items-center gap-1.5 font-bold text-amber-300 text-sm">
                        <Images className="w-4 h-4 text-[#5DE2E7]" />
                        <span>Before &amp; After Gallery Images (Additional Samples)</span>
                        <span className="px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 text-[10px] font-extrabold border border-amber-500/30">
                          {presetGallery.length} Added
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-400 mt-0.5">
                        Add as many gallery comparison samples as you want. In the public product view, users can click any gallery image to switch the big screen slider and drag to compare Before and After!
                      </p>
                    </div>

                    {/* Add Gallery Image Pair Icon Button */}
                    <button
                      type="button"
                      onClick={() => {
                        setPresetGallery(prev => [
                          ...prev,
                          {
                            id: `sample-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
                            label: `Sample ${prev.length + 2}`,
                            beforeImage: '',
                            afterImage: ''
                          }
                        ]);
                      }}
                      className="px-3.5 py-2 rounded-xl bg-gradient-to-r from-[#133E87] to-cyan-600 hover:from-cyan-600 hover:to-[#5DE2E7] text-white hover:text-slate-950 font-bold text-xs flex items-center gap-2 transition-all shadow-[0_0_15px_rgba(93,226,231,0.25)] self-start sm:self-auto active:scale-95"
                    >
                      <Plus className="w-4 h-4 stroke-[3]" />
                      <span>Add Gallery Image</span>
                    </button>
                  </div>

                  {presetGallery.length === 0 ? (
                    <div className="p-4 rounded-xl bg-slate-950/60 border border-dashed border-amber-500/30 text-center text-slate-400 text-xs flex flex-col items-center justify-center gap-2">
                      <div className="w-9 h-9 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
                        <Images className="w-4 h-4" />
                      </div>
                      <span className="text-slate-300 font-medium">No additional gallery comparison images added yet.</span>
                      <span className="text-[11px] text-slate-500">
                        Click the &quot;+ Add Gallery Image&quot; button above to add as many Before &amp; After photo samples as you need.
                      </span>
                    </div>
                  ) : (
                    <div className="space-y-3.5 max-h-[600px] overflow-y-auto pr-1 scrollbar-thin">
                      {presetGallery.map((item, idx) => (
                        <div
                          key={item.id || idx}
                          className="p-3.5 rounded-xl bg-slate-950/80 border border-amber-500/30 space-y-3 shadow-inner relative group"
                        >
                          <div className="flex items-center justify-between gap-2 border-b border-white/10 pb-2.5">
                            <div className="flex items-center gap-2 flex-1">
                              <span className="px-2.5 py-0.5 rounded-md bg-[#5DE2E7]/20 text-[#5DE2E7] text-xs font-black border border-[#5DE2E7]/30">
                                Gallery #{idx + 2}
                              </span>
                              <input
                                type="text"
                                value={item.label || ''}
                                placeholder={`Label: e.g. Sample ${idx + 2} (Tokyo Night, Portrait, etc.)`}
                                onChange={e => {
                                  const updated = [...presetGallery];
                                  updated[idx] = { ...updated[idx], label: e.target.value };
                                  setPresetGallery(updated);
                                }}
                                className="px-3 py-1 text-xs rounded-lg bg-slate-900 border border-white/10 text-white focus:outline-none focus:border-[#5DE2E7] w-52 sm:w-72"
                              />
                            </div>

                            <button
                              type="button"
                              onClick={() => {
                                setPresetGallery(prev => prev.filter((_, i) => i !== idx));
                              }}
                              className="px-2.5 py-1 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-400 hover:text-red-300 transition text-xs flex items-center gap-1.5 border border-red-500/20"
                              title="Delete this gallery pair"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                              <span className="text-[11px] font-bold">Remove</span>
                            </button>
                          </div>

                          {/* Two-column layout matching primary comparison */}
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <AdminImageUploadInput
                              label={`Before Image (Original) — Sample #${idx + 2}`}
                              value={item.beforeImage || ''}
                              onChange={val => {
                                const updated = [...presetGallery];
                                updated[idx] = { ...updated[idx], beforeImage: val };
                                setPresetGallery(updated);
                              }}
                              placeholder="Before Image URL (Original unedited)..."
                              helpText="Original unedited photo"
                            />
                            <AdminImageUploadInput
                              label={`After Image (Edited with Preset) — Sample #${idx + 2}`}
                              value={item.afterImage || ''}
                              onChange={val => {
                                const updated = [...presetGallery];
                                updated[idx] = { ...updated[idx], afterImage: val };
                                setPresetGallery(updated);
                              }}
                              placeholder="After Image URL (Preset applied)..."
                              helpText="Photo edited with Lightroom preset"
                            />
                          </div>

                          {/* Live preview thumbnail badge */}
                          {(item.beforeImage || item.afterImage) && (
                            <div className="flex items-center gap-3 pt-1 text-[11px] text-slate-400 border-t border-white/5">
                              <span className="font-bold text-slate-300">Live Preview:</span>
                              {item.beforeImage && (
                                <div className="flex items-center gap-1.5">
                                  <img src={item.beforeImage} alt="Before" className="w-7 h-7 rounded object-cover border border-white/20" />
                                  <span className="text-slate-400">Before</span>
                                </div>
                              )}
                              {item.afterImage && (
                                <div className="flex items-center gap-1.5">
                                  <img src={item.afterImage} alt="After" className="w-7 h-7 rounded object-cover border border-[#5DE2E7]/50" />
                                  <span className="text-[#5DE2E7] font-semibold">After</span>
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}

            <div className="grid grid-cols-2 gap-3 pt-2">
              <label className="flex items-center gap-2 cursor-pointer text-slate-200">
                <input
                  type="checkbox"
                  checked={isFeatured}
                  onChange={e => setIsFeatured(e.target.checked)}
                  className="rounded text-[#5DE2E7]"
                />
                <span>Toggle Featured Item</span>
              </label>

              <label className="flex items-center gap-2 cursor-pointer text-slate-200">
                <input
                  type="checkbox"
                  checked={isTrending}
                  onChange={e => setIsTrending(e.target.checked)}
                  className="rounded text-[#5DE2E7]"
                />
                <span>Toggle Trending Item</span>
              </label>
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-white/10">
              <button
                type="button"
                onClick={() => setIsEditing(false)}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-5 py-2 rounded-xl bg-[#5DE2E7] hover:bg-[#4bcad0] text-slate-950 font-extrabold shadow-[0_0_15px_rgba(93,226,231,0.4)]"
              >
                {editingId ? 'Save Changes' : 'Publish Product'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* 4. Products Table (Filtered by Active Category Tab) */}
      <div className="rounded-2xl bg-slate-950/80 border border-white/10 overflow-hidden shadow-xl">
        <div className="p-3.5 bg-slate-900/90 border-b border-white/10 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="font-extrabold text-white text-xs">
              {selectedAdminCategory === 'all' ? 'All Resource Items' : `${activeCategoryObj?.name || selectedAdminCategory} Items`}
            </span>
            <span className="px-2 py-0.5 rounded-md bg-white/5 border border-white/10 text-[10px] text-slate-300 font-bold">
              {filteredResources.length} items found
            </span>
          </div>

          {selectedAdminCategory !== 'all' && (
            <Link
              to={`/category/${selectedAdminCategory}`}
              target="_blank"
              className="text-[11px] font-bold text-[#5DE2E7] hover:underline flex items-center gap-1"
            >
              <span>View Category Live Page</span>
              <ExternalLink className="w-3 h-3" />
            </Link>
          )}
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-300">
            <thead className="bg-slate-900 border-b border-white/10 text-white uppercase text-[10px] font-extrabold tracking-wider">
              <tr>
                <th className="p-3">Product</th>
                <th className="p-3">Category</th>
                <th className="p-3">Version / Size</th>
                <th className="p-3">Downloads</th>
                <th className="p-3">Status</th>
                <th className="p-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {filteredResources.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-slate-400">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <Layers className="w-8 h-8 text-slate-600" />
                      <p className="text-sm font-bold text-white">No products found in this category</p>
                      <p className="text-xs text-slate-500">
                        {searchQuery ? `No results match "${searchQuery}"` : 'Click "Add New Resource" to add the first item to this category.'}
                      </p>
                      <button
                        onClick={openNewForm}
                        className="mt-2 px-4 py-2 rounded-xl bg-[#5DE2E7] text-slate-950 font-bold"
                      >
                        Add Product Now
                      </button>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredResources.map(res => {
                  const catObj = categories.find(c => c.id === res.category);
                  return (
                    <tr key={res.id} className="hover:bg-white/5 transition-colors">
                      <td className="p-3 flex items-center gap-3">
                        <img
                          src={res.thumbnail}
                          alt={res.title}
                          className="w-10 h-10 rounded-xl object-cover border border-white/10 shrink-0"
                          onError={(e) => {
                            (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=100&q=80';
                          }}
                        />
                        <div>
                          <div className="font-bold text-white line-clamp-1">{res.title}</div>
                          <div className="text-[10px] text-slate-400 font-mono">ID: {res.id}</div>
                        </div>
                      </td>
                      <td className="p-3 capitalize font-semibold text-[#5DE2E7]">
                        <span className="flex items-center gap-1.5">
                          <CategoryIcon name={catObj?.icon || res.category} className="w-3.5 h-3.5" />
                          <span>{catObj?.name || res.category}</span>
                        </span>
                      </td>
                      <td className="p-3 text-slate-300">{res.version} ({res.fileSize})</td>
                      <td className="p-3 font-mono text-cyan-300">{(res.downloadsCount ?? 0).toLocaleString()}</td>
                      <td className="p-3">
                        <div className="flex items-center gap-1">
                          {res.isFeatured && <span className="px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 text-[10px] font-bold">Featured</span>}
                          {res.isTrending && <span className="px-1.5 py-0.5 rounded bg-red-500/20 text-red-300 text-[10px] font-bold">Trending</span>}
                          {!res.isFeatured && !res.isTrending && <span className="text-[10px] text-slate-500">Standard</span>}
                        </div>
                      </td>
                      <td className="p-3 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => openEditForm(res)}
                            className="p-2 rounded-xl bg-slate-800 hover:bg-[#5DE2E7] hover:text-slate-950 text-slate-200 transition"
                            title="Edit Product Details & Images"
                          >
                            <Edit className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => {
                              cloneResource(res.id);
                              showToast(`Cloned copy created for "${res.title}"`);
                            }}
                            className="p-2 rounded-xl bg-slate-800 hover:bg-blue-600 hover:text-white text-blue-300 transition"
                            title="Clone / Duplicate Product"
                          >
                            <Copy className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => setProductToDelete(res)}
                            className="p-2 rounded-xl bg-slate-800 hover:bg-red-500 hover:text-white text-red-400 transition"
                            title="Delete Product"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* 5. In-App Product Delete Confirmation Modal */}
      {productToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="w-full max-w-md p-6 rounded-2xl bg-slate-900 border border-red-500/40 shadow-[0_0_40px_rgba(239,68,68,0.25)] space-y-4">
            <div className="flex items-start gap-3.5">
              <div className="w-11 h-11 rounded-xl bg-red-500/20 border border-red-500/30 flex items-center justify-center shrink-0 text-red-400">
                <Trash2 className="w-5 h-5" />
              </div>
              <div className="space-y-1">
                <h4 className="text-base font-extrabold text-white">Delete Product?</h4>
                <p className="text-xs text-slate-300">
                  Are you sure you want to delete <span className="text-[#5DE2E7] font-bold">"{productToDelete.title}"</span>?
                </p>
              </div>
            </div>

            <p className="text-[11px] text-slate-400">
              This product will be permanently removed from the website, category pages, search results, and download links.
            </p>

            <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-white/10">
              <button
                type="button"
                onClick={() => setProductToDelete(null)}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold transition"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={confirmDeleteProduct}
                className="px-4 py-2 rounded-xl bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-500 hover:to-rose-500 text-white font-extrabold shadow-[0_0_15px_rgba(239,68,68,0.4)] transition flex items-center gap-1.5"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Delete Product</span>
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
