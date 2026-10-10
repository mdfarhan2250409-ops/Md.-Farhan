import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { CategoryItem } from '../../types';
import { CategoryIcon, ICON_OPTIONS } from '../CategoryIcon';
import { AdminImageUploadInput } from './AdminImageUploadInput';
import {
  Plus,
  Edit,
  Trash2,
  ExternalLink,
  Save,
  X,
  Sparkles,
  Layers,
  Image as ImageIcon,
  AlertTriangle,
  Tag,
  Hash,
  ArrowLeft,
  ArrowRight,
  RotateCcw,
  Check,
  Wand2,
  SlidersHorizontal,
  Monitor,
  Tablet,
  Smartphone,
  Grid3X3,
  Sliders
} from 'lucide-react';
import { Link } from 'react-router-dom';

const CATEGORY_TAG_SUGGESTIONS: Record<string, string[]> = {
  apps: ['Canva', 'Graphic Design', 'Pro APK', 'Brand Kit', 'AI Tools', 'CapCut', 'Video Editor', 'Mod APK', 'Pro Unlocked', 'No Watermark', 'Lightroom', 'Photo Editor', 'Adobe', 'Presets', 'Premium', 'Utility', 'VPN', 'Music', 'Productivity'],
  'landing-pages': ['SaaS', 'Agency', 'Crypto', 'Portfolio', 'Dark Mode', 'Tailwind', 'React', 'Elementor', 'Responsive', 'Hero UI', 'HTML5', 'Next.js', 'Figma', 'E-Commerce', 'Startup', 'Clean Design'],
  'ai-prompts': ['Midjourney', 'ChatGPT', 'Gemini', 'Photorealistic', '3D Render', 'Anime', 'Logo Design', 'Cinematic', 'Copywriting', 'Stable Diffusion', 'DALL-E 3', 'Hyperrealistic', 'Marketing', 'Avatar'],
  'lr-presets': ['Moody', 'Cyberpunk', 'Cinematic', 'Vintage', 'Urban', 'Portrait', 'Landscape', 'Warm Tone', 'DNG', 'XMP', 'Aesthetic', 'Street', 'Dark & Moody', 'Sunset', 'Travel', 'Wedding'],
};

export const AdminCategories: React.FC = () => {
  const { categories, resources, addCategory, updateCategory, deleteCategory, showToast } = useApp();

  const [isCreating, setIsCreating] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [categoryToDelete, setCategoryToDelete] = useState<{ id: string; name: string; count: number } | null>(null);

  // Form states
  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [description, setDescription] = useState('');
  const [icon, setIcon] = useState('Layers');
  const [banner, setBanner] = useState('');
  const [autoSlug, setAutoSlug] = useState(true);
  const [tags, setTags] = useState<string[]>([]);
  const [newTagInput, setNewTagInput] = useState('');
  const [editingTagIndex, setEditingTagIndex] = useState<number | null>(null);
  const [editingTagValue, setEditingTagValue] = useState('');

  // Device Layout & Responsive Display Counts (PC, Tablet, Mobile)
  const [desktopColumns, setDesktopColumns] = useState<number>(3);
  const [tabletColumns, setTabletColumns] = useState<number>(2);
  const [mobileColumns, setMobileColumns] = useState<number>(1);
  const [desktopItemsPerPage, setDesktopItemsPerPage] = useState<number>(12); // 0 = Show All
  const [tabletItemsPerPage, setTabletItemsPerPage] = useState<number>(8); // 0 = Show All
  const [mobileItemsPerPage, setMobileItemsPerPage] = useState<number>(6); // 0 = Show All

  const resetForm = () => {
    setName('');
    setSlug('');
    setDescription('');
    setIcon('Layers');
    setBanner('');
    setAutoSlug(true);
    setTags([]);
    setNewTagInput('');
    setEditingTagIndex(null);
    setEditingTagValue('');
    setDesktopColumns(3);
    setTabletColumns(2);
    setMobileColumns(1);
    setDesktopItemsPerPage(12);
    setTabletItemsPerPage(8);
    setMobileItemsPerPage(6);
    setIsCreating(false);
    setEditingId(null);
  };

  const handleNameChange = (val: string) => {
    setName(val);
    if (autoSlug && !editingId) {
      const generated = val
        .toLowerCase()
        .trim()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '');
      setSlug(generated);
    }
  };

  const startCreate = () => {
    resetForm();
    setIsCreating(true);
  };

  const startEdit = (cat: CategoryItem) => {
    resetForm();
    setEditingId(cat.id);
    setName(cat.name);
    setSlug(cat.slug || cat.id);
    setDescription(cat.description || '');
    setIcon(cat.icon || 'Layers');
    setBanner(cat.banner || '');
    setAutoSlug(false);
    setDesktopColumns(cat.desktopColumns ?? 3);
    setTabletColumns(cat.tabletColumns ?? 2);
    setMobileColumns(cat.mobileColumns ?? 1);
    setDesktopItemsPerPage(cat.desktopItemsPerPage ?? 12);
    setTabletItemsPerPage(cat.tabletItemsPerPage ?? 8);
    setMobileItemsPerPage(cat.mobileItemsPerPage ?? 6);

    // Initial tags from category or derived from resources
    if (cat.tags && Array.isArray(cat.tags) && cat.tags.length > 0) {
      setTags([...cat.tags]);
    } else {
      const existingProductTags = Array.from(
        new Set(resources.filter(r => r.category === cat.id).flatMap(r => r.tags || []))
      );
      if (existingProductTags.length > 0) {
        setTags(existingProductTags);
      } else if (CATEGORY_TAG_SUGGESTIONS[cat.id]) {
        setTags([...CATEGORY_TAG_SUGGESTIONS[cat.id]]);
      } else {
        setTags([]);
      }
    }
  };

  // Tag helper operations
  const handleAddTag = (rawTag?: string) => {
    const tagToAdd = (rawTag || newTagInput).trim().replace(/^#/, '');
    if (!tagToAdd) return;

    // Check comma separated
    if (tagToAdd.includes(',')) {
      const splitTags = tagToAdd.split(',').map(t => t.trim().replace(/^#/, '')).filter(Boolean);
      const unique = splitTags.filter(t => !tags.some(existing => existing.toLowerCase() === t.toLowerCase()));
      if (unique.length > 0) {
        setTags(prev => [...prev, ...unique]);
      }
      setNewTagInput('');
      return;
    }

    if (tags.some(existing => existing.toLowerCase() === tagToAdd.toLowerCase())) {
      showToast(`Tag "#${tagToAdd}" is already added.`);
      setNewTagInput('');
      return;
    }

    setTags(prev => [...prev, tagToAdd]);
    setNewTagInput('');
  };

  const handleRemoveTag = (indexToRemove: number) => {
    setTags(prev => prev.filter((_, idx) => idx !== indexToRemove));
    if (editingTagIndex === indexToRemove) {
      setEditingTagIndex(null);
      setEditingTagValue('');
    }
  };

  const handleStartEditTag = (index: number) => {
    setEditingTagIndex(index);
    setEditingTagValue(tags[index]);
  };

  const handleSaveEditTag = () => {
    if (editingTagIndex === null) return;
    const cleanValue = editingTagValue.trim().replace(/^#/, '');
    if (!cleanValue) {
      handleRemoveTag(editingTagIndex);
      return;
    }
    setTags(prev => prev.map((t, idx) => (idx === editingTagIndex ? cleanValue : t)));
    setEditingTagIndex(null);
    setEditingTagValue('');
  };

  const handleMoveTag = (index: number, direction: 'left' | 'right') => {
    const targetIndex = direction === 'left' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= tags.length) return;
    const newTags = [...tags];
    const temp = newTags[index];
    newTags[index] = newTags[targetIndex];
    newTags[targetIndex] = temp;
    setTags(newTags);
  };

  const handleExtractFromProducts = () => {
    const currentCatId = editingId || slug || 'apps';
    const catResources = resources.filter(r => r.category === currentCatId);
    const extracted = Array.from(new Set(catResources.flatMap(r => r.tags || []))) as string[];

    if (extracted.length === 0) {
      showToast('No existing product tags found for this category.');
      return;
    }

    const uniqueToAdd = extracted.filter((t: string) => !tags.some(existing => existing.toLowerCase() === t.toLowerCase()));
    if (uniqueToAdd.length === 0) {
      showToast('All product tags are already added.');
      return;
    }

    setTags(prev => [...prev, ...uniqueToAdd]);
    showToast(`Added ${uniqueToAdd.length} tags from existing resources!`);
  };

  const handleLoadSuggestions = () => {
    const currentCatId = editingId || slug || 'apps';
    const suggestions = CATEGORY_TAG_SUGGESTIONS[currentCatId] || CATEGORY_TAG_SUGGESTIONS['apps'];
    const uniqueToAdd = suggestions.filter(t => !tags.some(existing => existing.toLowerCase() === t.toLowerCase()));
    setTags(prev => [...prev, ...uniqueToAdd]);
    showToast(`Added ${uniqueToAdd.length} recommended tags!`);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      showToast('Category name is required');
      return;
    }

    const finalSlug = (slug.trim() || name.trim())
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');

    if (!finalSlug) {
      showToast('A valid slug/ID is required');
      return;
    }

    // Clean and normalize tags
    const cleanedTags = tags.map(t => t.trim().replace(/^#/, '')).filter(Boolean);

    if (editingId) {
      // Update existing category
      updateCategory(editingId, {
        name: name.trim(),
        slug: finalSlug,
        description: description.trim(),
        icon,
        banner: banner.trim() || 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=1200&q=80',
        tags: cleanedTags,
        desktopColumns: Number(desktopColumns) || 3,
        tabletColumns: Number(tabletColumns) || 2,
        mobileColumns: Number(mobileColumns) || 1,
        desktopItemsPerPage: Math.max(0, Number(desktopItemsPerPage) || 0),
        tabletItemsPerPage: Math.max(0, Number(tabletItemsPerPage) || 0),
        mobileItemsPerPage: Math.max(0, Number(mobileItemsPerPage) || 0)
      });
      showToast(`Category "${name}" and ${cleanedTags.length} filter tags saved!`);
    } else {
      // Check duplicate ID
      if (categories.some(c => c.id.toLowerCase() === finalSlug.toLowerCase())) {
        showToast('A category with this ID already exists. Please choose a different slug.');
        return;
      }

      const newCat: CategoryItem = {
        id: finalSlug,
        name: name.trim(),
        slug: finalSlug,
        description: description.trim() || `Explore the best curated ${name} resources on Online Task Lab.`,
        icon,
        banner: banner.trim() || 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=1200&q=80',
        itemCount: 0,
        tags: cleanedTags,
        desktopColumns: Number(desktopColumns) || 3,
        tabletColumns: Number(tabletColumns) || 2,
        mobileColumns: Number(mobileColumns) || 1,
        desktopItemsPerPage: Math.max(0, Number(desktopItemsPerPage) || 0),
        tabletItemsPerPage: Math.max(0, Number(tabletItemsPerPage) || 0),
        mobileItemsPerPage: Math.max(0, Number(mobileItemsPerPage) || 0)
      };

      addCategory(newCat);
      showToast(`Category "${name}" created with ${cleanedTags.length} filter tags!`);
    }

    resetForm();
  };

  const promptDelete = (cat: CategoryItem) => {
    const resourceCount = resources.filter(r => r.category === cat.id).length;
    setCategoryToDelete({
      id: cat.id,
      name: cat.name,
      count: resourceCount
    });
  };

  const confirmDelete = () => {
    if (!categoryToDelete) return;
    deleteCategory(categoryToDelete.id);
    if (editingId === categoryToDelete.id) resetForm();
    showToast(`Category "${categoryToDelete.name}" deleted.`);
    setCategoryToDelete(null);
  };

  return (
    <div className="space-y-6 text-xs">
      {/* Header with Title and Create Button */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-2xl bg-slate-900/60 border border-white/10">
        <div>
          <h3 className="text-base font-extrabold text-white flex items-center gap-2">
            <Layers className="w-5 h-5 text-[#5DE2E7]" />
            <span>Categories Management</span>
          </h3>
          <p className="text-xs text-slate-400 mt-0.5">
            Create, edit and manage website categories & their filter subcategory tags. Tags saved here automatically appear at the top of each category page.
          </p>
        </div>

        <button
          onClick={startCreate}
          className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-[#133E87] via-cyan-500 to-[#5DE2E7] hover:brightness-110 text-slate-950 font-extrabold flex items-center justify-center gap-2 shadow-[0_0_20px_rgba(93,226,231,0.4)] transition-all whitespace-nowrap"
        >
          <Plus className="w-4 h-4 text-slate-950" />
          <span>Create New Category</span>
        </button>
      </div>

      {/* Create / Edit Form Modal */}
      {(isCreating || editingId) && (
        <form
          onSubmit={handleSave}
          className="p-5 rounded-2xl bg-slate-900/95 border border-[#5DE2E7]/40 shadow-[0_0_35px_rgba(93,226,231,0.2)] space-y-5 animate-in fade-in duration-200"
        >
          <div className="flex items-center justify-between border-b border-white/10 pb-3">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-cyan-500/20 border border-cyan-400/40 flex items-center justify-center text-[#5DE2E7]">
                <Sparkles className="w-4 h-4" />
              </div>
              <div>
                <h4 className="font-extrabold text-sm text-white">
                  {editingId ? `Edit Category: ${name || editingId}` : 'Create New Category'}
                </h4>
                <p className="text-[11px] text-slate-400">
                  Configure category details, custom banner, and subcategory filter tags (#tags).
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={resetForm}
              className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white transition"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* BASIC INFO */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-slate-300 font-bold mb-1">
                Category Name <span className="text-red-400">*</span>
              </label>
              <input
                type="text"
                required
                placeholder="e.g. Mobile Apps, Landing Pages, AI Prompts"
                value={name}
                onChange={e => handleNameChange(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-white/10 text-white placeholder-slate-500 focus:outline-none focus:border-[#5DE2E7]"
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-slate-300 font-bold">
                  Slug / Unique ID <span className="text-red-400">*</span>
                </label>
                {!editingId && (
                  <button
                    type="button"
                    onClick={() => setAutoSlug(!autoSlug)}
                    className="text-[10px] text-[#5DE2E7] hover:underline"
                  >
                    {autoSlug ? 'Manual ID' : 'Auto generate'}
                  </button>
                )}
              </div>
              <input
                type="text"
                required
                disabled={!!editingId}
                placeholder="e.g. apps, landing-pages, ai-prompts"
                value={slug}
                onChange={e => {
                  setAutoSlug(false);
                  setSlug(e.target.value.toLowerCase().replace(/\s+/g, '-'));
                }}
                className={`w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border text-white font-mono text-xs focus:outline-none focus:border-[#5DE2E7] ${
                  editingId ? 'opacity-60 cursor-not-allowed border-white/5' : 'border-white/10'
                }`}
              />
              <p className="text-[10px] text-slate-400 mt-1">
                Page URL will be: <span className="text-[#5DE2E7] font-mono">/category/{slug || 'your-id'}</span>
              </p>
            </div>
          </div>

          <div>
            <label className="block text-slate-300 font-bold mb-1">Description</label>
            <textarea
              rows={2}
              placeholder="Short description displayed on category cards and hero banners..."
              value={description}
              onChange={e => setDescription(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-white/10 text-white placeholder-slate-500 focus:outline-none focus:border-[#5DE2E7]"
            />
          </div>

          {/* ======================================================== */}
          {/* CATEGORY FILTER TAGS / SUBCATEGORIES MANAGER SECTION */}
          {/* ======================================================== */}
          <div className="p-4 rounded-2xl bg-slate-950/90 border border-cyan-500/40 shadow-[0_0_20px_rgba(93,226,231,0.1)] space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-white/10 pb-2.5">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-cyan-500/20 border border-cyan-400/30 flex items-center justify-center text-cyan-300">
                  <Tag className="w-3.5 h-3.5" />
                </div>
                <div>
                  <h5 className="font-extrabold text-xs text-white flex items-center gap-1.5">
                    <span>Category Filter Tags & Subcategories</span>
                    <span className="px-2 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 text-[10px] font-mono border border-cyan-400/30">
                      {tags.length} Tags
                    </span>
                  </h5>
                  <p className="text-[10px] text-slate-400">
                    These #tags appear on this Category Page as filter buttons (e.g. #Canva, #Mod APK, #Video Editor).
                  </p>
                </div>
              </div>

              {/* Quick Helper Action Buttons */}
              <div className="flex items-center gap-1.5 flex-wrap">
                <button
                  type="button"
                  onClick={handleLoadSuggestions}
                  className="px-2.5 py-1 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-cyan-300 hover:text-white text-[10px] font-bold transition flex items-center gap-1"
                  title="Load suggested tags for this category"
                >
                  <Wand2 className="w-3 h-3 text-cyan-400" />
                  <span>Suggest Tags</span>
                </button>

                <button
                  type="button"
                  onClick={handleExtractFromProducts}
                  className="px-2.5 py-1 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-slate-300 hover:text-white text-[10px] font-bold transition flex items-center gap-1"
                  title="Auto-scan and import all tags from products inside this category"
                >
                  <SlidersHorizontal className="w-3 h-3 text-amber-400" />
                  <span>Sync from Products</span>
                </button>

                {tags.length > 0 && (
                  <button
                    type="button"
                    onClick={() => {
                      if (window.confirm('Clear all filter tags for this category?')) {
                        setTags([]);
                      }
                    }}
                    className="px-2 py-1 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-400 text-[10px] font-bold transition flex items-center gap-1"
                    title="Clear all tags"
                  >
                    <Trash2 className="w-3 h-3" />
                    <span>Clear All</span>
                  </button>
                )}
              </div>
            </div>

            {/* Tag Input Form Bar */}
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Hash className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-cyan-400" />
                <input
                  type="text"
                  placeholder="Type new category tag (e.g. Canva, CapCut, Pro Unlocked) and press Enter..."
                  value={newTagInput}
                  onChange={e => setNewTagInput(e.target.value)}
                  onKeyDown={e => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleAddTag();
                    }
                  }}
                  className="w-full pl-9 pr-3 py-2 rounded-xl bg-slate-900 border border-white/10 text-white placeholder-slate-500 text-xs focus:outline-none focus:border-[#5DE2E7]"
                />
              </div>

              <button
                type="button"
                onClick={() => handleAddTag()}
                className="px-4 py-2 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:brightness-110 text-white font-extrabold text-xs flex items-center gap-1.5 shrink-0 shadow-md transition"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Tag</span>
              </button>
            </div>

            {/* Render Category Tag Chips */}
            {tags.length > 0 ? (
              <div className="flex flex-wrap gap-2 p-3 rounded-xl bg-slate-900/80 border border-white/5 max-h-56 overflow-y-auto">
                {tags.map((tag, idx) => {
                  const isEditingThisTag = editingTagIndex === idx;

                  if (isEditingThisTag) {
                    return (
                      <div
                        key={idx}
                        className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-cyan-500/20 border border-cyan-400 text-white shadow"
                      >
                        <span className="text-cyan-400 font-bold text-xs">#</span>
                        <input
                          type="text"
                          autoFocus
                          value={editingTagValue}
                          onChange={e => setEditingTagValue(e.target.value)}
                          onKeyDown={e => {
                            if (e.key === 'Enter') {
                              e.preventDefault();
                              handleSaveEditTag();
                            } else if (e.key === 'Escape') {
                              setEditingTagIndex(null);
                            }
                          }}
                          className="w-28 bg-slate-950 px-2 py-0.5 rounded text-xs text-white border border-cyan-400 focus:outline-none font-semibold"
                        />
                        <button
                          type="button"
                          onClick={handleSaveEditTag}
                          className="p-1 rounded hover:bg-emerald-500/30 text-emerald-400"
                          title="Save tag"
                        >
                          <Check className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => setEditingTagIndex(null)}
                          className="p-1 rounded hover:bg-white/10 text-slate-400"
                          title="Cancel"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    );
                  }

                  return (
                    <div
                      key={idx}
                      className="group/tag flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-950/90 border border-white/10 hover:border-cyan-400/50 text-slate-200 transition-all shadow-sm"
                    >
                      <span className="text-cyan-400 font-bold text-xs">#{tag}</span>

                      {/* Reorder and Edit Actions */}
                      <div className="flex items-center gap-0.5 ml-1 opacity-70 group-hover/tag:opacity-100 transition">
                        <button
                          type="button"
                          disabled={idx === 0}
                          onClick={() => handleMoveTag(idx, 'left')}
                          className="p-0.5 text-slate-400 hover:text-cyan-300 disabled:opacity-20 disabled:hover:text-slate-400"
                          title="Move Left"
                        >
                          <ArrowLeft className="w-2.5 h-2.5" />
                        </button>

                        <button
                          type="button"
                          disabled={idx === tags.length - 1}
                          onClick={() => handleMoveTag(idx, 'right')}
                          className="p-0.5 text-slate-400 hover:text-cyan-300 disabled:opacity-20 disabled:hover:text-slate-400"
                          title="Move Right"
                        >
                          <ArrowRight className="w-2.5 h-2.5" />
                        </button>

                        <button
                          type="button"
                          onClick={() => handleStartEditTag(idx)}
                          className="p-0.5 text-slate-400 hover:text-amber-300"
                          title="Edit Tag"
                        >
                          <Edit className="w-2.5 h-2.5" />
                        </button>

                        <button
                          type="button"
                          onClick={() => handleRemoveTag(idx)}
                          className="p-0.5 text-slate-400 hover:text-red-400"
                          title="Remove Tag"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="p-4 rounded-xl bg-slate-900/40 border border-dashed border-white/10 text-center space-y-2">
                <p className="text-slate-400 text-xs">
                  No filter tags added yet for this category.
                </p>
                <div className="flex items-center justify-center gap-2">
                  <button
                    type="button"
                    onClick={handleLoadSuggestions}
                    className="px-3 py-1.5 rounded-lg bg-cyan-500/20 border border-cyan-500/40 text-cyan-300 font-bold text-xs hover:bg-cyan-500/30 transition flex items-center gap-1.5"
                  >
                    <Wand2 className="w-3.5 h-3.5" />
                    <span>Load Default Tags</span>
                  </button>
                  <button
                    type="button"
                    onClick={handleExtractFromProducts}
                    className="px-3 py-1.5 rounded-lg bg-white/5 border border-white/10 text-slate-300 font-bold text-xs hover:bg-white/10 transition"
                  >
                    Extract from Products
                  </button>
                </div>
              </div>
            )}

            {/* Live Preview of Tag Bar */}
            <div className="pt-2 border-t border-white/5">
              <span className="text-[10px] font-bold text-cyan-400 uppercase tracking-wider block mb-1.5">
                Live Preview in Category Page Filter Bar:
              </span>
              <div className="flex flex-wrap items-center gap-1.5 p-2.5 rounded-xl bg-slate-950/60 border border-white/5">
                <span className="px-2.5 py-0.5 rounded-lg bg-[#5DE2E7] text-slate-950 font-black text-[10px]">
                  All Items
                </span>
                <span className="px-2.5 py-0.5 rounded-lg bg-amber-400/20 text-amber-300 border border-amber-400/30 font-bold text-[10px]">
                  ⭐ Featured
                </span>
                <span className="px-2.5 py-0.5 rounded-lg bg-rose-500/20 text-rose-300 border border-rose-500/30 font-bold text-[10px]">
                  🔥 Trending
                </span>
                {tags.slice(0, 10).map((t, idx) => (
                  <span
                    key={idx}
                    className="px-2 py-0.5 rounded-lg bg-white/5 border border-white/10 text-slate-300 font-semibold text-[10px]"
                  >
                    #{t}
                  </span>
                ))}
                {tags.length > 10 && (
                  <span className="text-[10px] text-cyan-400 font-bold">
                    +{tags.length - 10} more
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Icon Selector Grid */}
          <div>
            <label className="block text-slate-300 font-bold mb-2 flex items-center justify-between">
              <span>Choose Icon</span>
              <span className="text-[11px] text-[#5DE2E7] flex items-center gap-1.5">
                Current: <CategoryIcon name={icon} className="w-4 h-4 inline" /> {icon}
              </span>
            </label>
            <div className="grid grid-cols-3 sm:grid-cols-6 md:grid-cols-8 gap-2 max-h-36 overflow-y-auto p-2 rounded-xl bg-slate-950 border border-white/10">
              {ICON_OPTIONS.map(opt => {
                const IconComponent = opt.icon;
                const isSelected = icon === opt.name;
                return (
                  <button
                    key={opt.name}
                    type="button"
                    onClick={() => setIcon(opt.name)}
                    className={`flex flex-col items-center justify-center p-2 rounded-xl border text-[10px] transition-all gap-1 ${
                      isSelected
                        ? 'bg-[#5DE2E7]/20 border-[#5DE2E7] text-white shadow-[0_0_10px_rgba(93,226,231,0.3)]'
                        : 'bg-slate-900 border-white/5 text-slate-400 hover:text-white hover:bg-slate-800'
                    }`}
                    title={opt.label}
                  >
                    <IconComponent className={`w-4 h-4 ${isSelected ? 'text-[#5DE2E7]' : 'text-slate-300'}`} />
                    <span className="truncate w-full text-center">{opt.name}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Banner URL with Device Gallery / Photo upload */}
          <div className="space-y-1.5">
            <AdminImageUploadInput
              label="Category Banner Image URL / Device Photo (Optional)"
              value={banner}
              onChange={setBanner}
              placeholder="https://images.unsplash.com/... or click Device Gallery"
              helpText="Enter image URL or upload directly from your device gallery. Used as backdrop hero on this category's page."
            />
            <div className="flex justify-end">
              <button
                type="button"
                onClick={() => setBanner('https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=1200&q=80')}
                className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white text-[10px] font-semibold transition"
              >
                Use Default Abstract Banner
              </button>
            </div>
          </div>

          {/* ======================================================== */}
          {/* DEVICE RESPONSIVE DISPLAY & LAYOUT SETTINGS (PC / TAB / MOBILE) */}
          {/* ======================================================== */}
          <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-br from-slate-950 via-[#060e24] to-slate-950 border border-[#5DE2E7]/40 shadow-[0_0_25px_rgba(93,226,231,0.12)] space-y-4">
            <div className="flex items-start justify-between gap-3 border-b border-white/10 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-[#133E87] to-cyan-500 flex items-center justify-center text-white shadow-md">
                  <Sliders className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="font-extrabold text-white text-sm flex items-center gap-2">
                    <span>ডিভাইস অনুযায়ী শো সেটিংস (PC, Tab & Mobile Layout)</span>
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#5DE2E7]/20 text-[#5DE2E7] font-bold border border-[#5DE2E7]/30">
                      Responsive
                    </span>
                  </h4>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    এই ক্যাটাগরির ভেতরে পিসিতে কয়টা অ্যাপ/আইটেম শো হবে, ট্যাবলেটে কয়টা এবং মোবাইলে কয়টা শো হবে তা এখান থেকে ঠিক করে দিন।
                  </p>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* 1. Desktop / PC Settings */}
              <div className="p-3.5 rounded-xl bg-slate-900/90 border border-blue-500/30 space-y-3 shadow-inner">
                <div className="flex items-center justify-between border-b border-white/10 pb-2">
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-lg bg-blue-500/20 text-blue-400 flex items-center justify-center">
                      <Monitor className="w-3.5 h-3.5" />
                    </div>
                    <div>
                      <h5 className="font-bold text-xs text-white">Desktop / PC</h5>
                      <span className="text-[10px] text-slate-400">কম্পিউটার বা ল্যাপটপ</span>
                    </div>
                  </div>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-blue-500/10 text-blue-300 border border-blue-500/20">
                    &ge;1024px
                  </span>
                </div>

                {/* PC Item Count */}
                <div>
                  <label className="block text-[11px] font-bold text-slate-300 mb-1">
                    পিসিতে কয়টা শো হবে (Item Limit):
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      min={0}
                      max={100}
                      value={desktopItemsPerPage}
                      onChange={e => setDesktopItemsPerPage(Math.max(0, parseInt(e.target.value) || 0))}
                      className="w-20 px-2.5 py-1.5 rounded-lg bg-slate-950 border border-white/15 text-white font-bold text-xs focus:outline-none focus:border-blue-400 text-center"
                    />
                    <span className="text-[11px] text-slate-400">
                      {desktopItemsPerPage === 0 ? 'সবগুলো শো হবে' : 'টি অ্যাপ/আইটেম'}
                    </span>
                  </div>

                  {/* Quick Preset Buttons for PC */}
                  <div className="flex flex-wrap gap-1 mt-2">
                    {[0, 6, 9, 12, 15, 18, 24].map(num => (
                      <button
                        key={num}
                        type="button"
                        onClick={() => setDesktopItemsPerPage(num)}
                        className={`px-2 py-0.5 rounded-md text-[10px] font-bold transition ${
                          desktopItemsPerPage === num
                            ? 'bg-blue-500 text-white shadow'
                            : 'bg-white/5 hover:bg-white/10 text-slate-400'
                        }`}
                      >
                        {num === 0 ? 'All (সব)' : num}
                      </button>
                    ))}
                  </div>
                  <p className="text-[10px] text-slate-500 mt-1">০ দিলে ক্যাটাগরির সবগুলো আইটেম শো হবে।</p>
                </div>

                {/* PC Grid Columns */}
                <div>
                  <label className="block text-[11px] font-bold text-slate-300 mb-1">
                    পিসিতে গ্রিড কলাম (Columns/Row):
                  </label>
                  <select
                    value={desktopColumns}
                    onChange={e => setDesktopColumns(parseInt(e.target.value) || 3)}
                    className="w-full px-2.5 py-1.5 rounded-lg bg-slate-950 border border-white/15 text-white text-xs font-semibold focus:outline-none focus:border-blue-400"
                  >
                    <option value={1} className="bg-slate-900">1 কলাম (ফুল উইডথ)</option>
                    <option value={2} className="bg-slate-900">2 কলাম (বড় কার্ড)</option>
                    <option value={3} className="bg-slate-900">3 কলাম (Default - আদর্শ)</option>
                    <option value={4} className="bg-slate-900">4 কলাম (কমপ্যাক্ট)</option>
                    <option value={5} className="bg-slate-900">5 কলাম</option>
                    <option value={6} className="bg-slate-900">6 কলাম</option>
                  </select>
                </div>
              </div>

              {/* 2. Tablet Settings */}
              <div className="p-3.5 rounded-xl bg-slate-900/90 border border-purple-500/30 space-y-3 shadow-inner">
                <div className="flex items-center justify-between border-b border-white/10 pb-2">
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-lg bg-purple-500/20 text-purple-400 flex items-center justify-center">
                      <Tablet className="w-3.5 h-3.5" />
                    </div>
                    <div>
                      <h5 className="font-bold text-xs text-white">Tablet / iPad</h5>
                      <span className="text-[10px] text-slate-400">ট্যাবলেট বা ট্যাব ডিভাইস</span>
                    </div>
                  </div>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-purple-500/10 text-purple-300 border border-purple-500/20">
                    768px-1023px
                  </span>
                </div>

                {/* Tablet Item Count */}
                <div>
                  <label className="block text-[11px] font-bold text-slate-300 mb-1">
                    ট্যাবলেটে কয়টা শো হবে (Item Limit):
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      min={0}
                      max={100}
                      value={tabletItemsPerPage}
                      onChange={e => setTabletItemsPerPage(Math.max(0, parseInt(e.target.value) || 0))}
                      className="w-20 px-2.5 py-1.5 rounded-lg bg-slate-950 border border-white/15 text-white font-bold text-xs focus:outline-none focus:border-purple-400 text-center"
                    />
                    <span className="text-[11px] text-slate-400">
                      {tabletItemsPerPage === 0 ? 'সবগুলো শো হবে' : 'টি অ্যাপ/আইটেম'}
                    </span>
                  </div>

                  {/* Quick Preset Buttons for Tablet */}
                  <div className="flex flex-wrap gap-1 mt-2">
                    {[0, 4, 6, 8, 10, 12, 16].map(num => (
                      <button
                        key={num}
                        type="button"
                        onClick={() => setTabletItemsPerPage(num)}
                        className={`px-2 py-0.5 rounded-md text-[10px] font-bold transition ${
                          tabletItemsPerPage === num
                            ? 'bg-purple-500 text-white shadow'
                            : 'bg-white/5 hover:bg-white/10 text-slate-400'
                        }`}
                      >
                        {num === 0 ? 'All (সব)' : num}
                      </button>
                    ))}
                  </div>
                  <p className="text-[10px] text-slate-500 mt-1">ট্যাবলেট স্ক্রিনের জন্য সর্বোচ্চ আইটেম সংখ্যা।</p>
                </div>

                {/* Tablet Grid Columns */}
                <div>
                  <label className="block text-[11px] font-bold text-slate-300 mb-1">
                    ট্যাবলেটে গ্রিড কলাম (Columns/Row):
                  </label>
                  <select
                    value={tabletColumns}
                    onChange={e => setTabletColumns(parseInt(e.target.value) || 2)}
                    className="w-full px-2.5 py-1.5 rounded-lg bg-slate-950 border border-white/15 text-white text-xs font-semibold focus:outline-none focus:border-purple-400"
                  >
                    <option value={1} className="bg-slate-900">1 কলাম (ফুল উইডথ)</option>
                    <option value={2} className="bg-slate-900">2 কলাম (Default - আদর্শ)</option>
                    <option value={3} className="bg-slate-900">3 কলাম (কমপ্যাক্ট)</option>
                    <option value={4} className="bg-slate-900">4 কলাম</option>
                  </select>
                </div>
              </div>

              {/* 3. Mobile Settings */}
              <div className="p-3.5 rounded-xl bg-slate-900/90 border border-emerald-500/30 space-y-3 shadow-inner">
                <div className="flex items-center justify-between border-b border-white/10 pb-2">
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
                      <Smartphone className="w-3.5 h-3.5" />
                    </div>
                    <div>
                      <h5 className="font-bold text-xs text-white">Mobile Devices</h5>
                      <span className="text-[10px] text-slate-400">স্মার্টফোন বা মোবাইল</span>
                    </div>
                  </div>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-300 border border-emerald-500/20">
                    &lt;768px
                  </span>
                </div>

                {/* Mobile Item Count */}
                <div>
                  <label className="block text-[11px] font-bold text-slate-300 mb-1">
                    মোবাইলে কয়টা শো হবে (Item Limit):
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      min={0}
                      max={100}
                      value={mobileItemsPerPage}
                      onChange={e => setMobileItemsPerPage(Math.max(0, parseInt(e.target.value) || 0))}
                      className="w-20 px-2.5 py-1.5 rounded-lg bg-slate-950 border border-white/15 text-white font-bold text-xs focus:outline-none focus:border-emerald-400 text-center"
                    />
                    <span className="text-[11px] text-slate-400">
                      {mobileItemsPerPage === 0 ? 'সবগুলো শো হবে' : 'টি অ্যাপ/আইটেম'}
                    </span>
                  </div>

                  {/* Quick Preset Buttons for Mobile */}
                  <div className="flex flex-wrap gap-1 mt-2">
                    {[0, 3, 4, 6, 8, 10, 12].map(num => (
                      <button
                        key={num}
                        type="button"
                        onClick={() => setMobileItemsPerPage(num)}
                        className={`px-2 py-0.5 rounded-md text-[10px] font-bold transition ${
                          mobileItemsPerPage === num
                            ? 'bg-emerald-500 text-white shadow'
                            : 'bg-white/5 hover:bg-white/10 text-slate-400'
                        }`}
                      >
                        {num === 0 ? 'All (সব)' : num}
                      </button>
                    ))}
                  </div>
                  <p className="text-[10px] text-slate-500 mt-1">মোবাইলে স্ক্রিনে সর্বোচ্চ কয়টি অ্যাপ শো হবে।</p>
                </div>

                {/* Mobile Grid Columns */}
                <div>
                  <label className="block text-[11px] font-bold text-slate-300 mb-1">
                    মোবাইলে গ্রিড কলাম (Columns/Row):
                  </label>
                  <select
                    value={mobileColumns}
                    onChange={e => setMobileColumns(parseInt(e.target.value) || 1)}
                    className="w-full px-2.5 py-1.5 rounded-lg bg-slate-950 border border-white/15 text-white text-xs font-semibold focus:outline-none focus:border-emerald-400"
                  >
                    <option value={1} className="bg-slate-900">1 কলাম (স্ক্রিনশট ১ এর মতো ফুল কার্ড - Recommended)</option>
                    <option value={2} className="bg-slate-900">2 কলাম (কমপ্যাক্ট ২-গ্রিড)</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Quick Summary Pill */}
            <div className="flex flex-wrap items-center justify-between gap-2 p-2.5 rounded-xl bg-slate-950/70 border border-white/5 text-[11px]">
              <span className="text-slate-400 font-medium">বর্তমানে কনফিগার করা লেআউট:</span>
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-blue-300 font-semibold flex items-center gap-1">
                  <Monitor className="w-3 h-3 text-blue-400" />
                  <span>PC: {desktopColumns} cols • {desktopItemsPerPage === 0 ? 'All' : `${desktopItemsPerPage} items`}</span>
                </span>
                <span className="text-purple-300 font-semibold flex items-center gap-1">
                  <Tablet className="w-3 h-3 text-purple-400" />
                  <span>Tab: {tabletColumns} cols • {tabletItemsPerPage === 0 ? 'All' : `${tabletItemsPerPage} items`}</span>
                </span>
                <span className="text-emerald-300 font-semibold flex items-center gap-1">
                  <Smartphone className="w-3 h-3 text-emerald-400" />
                  <span>Mob: {mobileColumns} col • {mobileItemsPerPage === 0 ? 'All' : `${mobileItemsPerPage} items`}</span>
                </span>
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-white/10">
            <button
              type="button"
              onClick={resetForm}
              className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:brightness-110 text-white font-extrabold flex items-center gap-2 shadow-[0_0_20px_rgba(93,226,231,0.3)] transition"
            >
              <Save className="w-4 h-4" />
              <span>{editingId ? 'Save Changes' : 'Publish Category'}</span>
            </button>
          </div>
        </form>
      )}

      {/* Active Categories List */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {categories.map(cat => {
          const count = resources.filter(r => r.category === cat.id).length;
          const currentTags = cat.tags || [];

          return (
            <div
              key={cat.id}
              className="p-4 rounded-2xl bg-slate-950/80 border border-white/10 hover:border-[#5DE2E7]/40 transition-all flex flex-col justify-between group relative overflow-hidden space-y-3"
            >
              {/* Subtle top banner preview */}
              {cat.banner && (
                <div
                  className="absolute inset-0 opacity-5 group-hover:opacity-10 transition-opacity bg-cover bg-center pointer-events-none"
                  style={{ backgroundImage: `url(${cat.banner})` }}
                />
              )}

              <div className="relative z-10 space-y-2.5">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#133E87] to-slate-900 border border-[#5DE2E7]/30 flex items-center justify-center shadow-[0_0_10px_rgba(93,226,231,0.2)]">
                      <CategoryIcon name={cat.icon || cat.id} className="w-5 h-5 text-[#5DE2E7]" />
                    </div>
                    <div>
                      <div className="font-extrabold text-white text-sm group-hover:text-[#5DE2E7] transition-colors">
                        {cat.name}
                      </div>
                      <div className="text-[10px] text-[#5DE2E7] font-mono">
                        /category/{cat.id}
                      </div>
                    </div>
                  </div>

                  <span className="px-2 py-0.5 rounded-md bg-white/5 border border-white/10 text-[10px] font-bold text-slate-300">
                    {count} {count === 1 ? 'item' : 'items'}
                  </span>
                </div>

                <p className="text-slate-400 text-xs line-clamp-2 leading-relaxed">
                  {cat.description || 'No description provided.'}
                </p>

                {/* Subcategory / Filter Tags preview chips on card */}
                <div className="pt-2 border-t border-white/5">
                  <div className="flex items-center justify-between text-[10px] text-slate-400 font-semibold mb-1.5">
                    <span className="flex items-center gap-1 text-cyan-300">
                      <Tag className="w-3 h-3" />
                      <span>Filter Subcategories ({currentTags.length}):</span>
                    </span>
                    <button
                      type="button"
                      onClick={() => startEdit(cat)}
                      className="text-[10px] text-[#5DE2E7] hover:underline font-bold"
                    >
                      + Manage
                    </button>
                  </div>

                  {currentTags.length > 0 ? (
                    <div className="flex flex-wrap gap-1 max-h-16 overflow-hidden">
                      {currentTags.slice(0, 6).map((t, tidx) => (
                        <span
                          key={tidx}
                          className="px-2 py-0.5 rounded-md bg-slate-900 border border-white/10 text-[10px] font-medium text-slate-300"
                        >
                          #{t}
                        </span>
                      ))}
                      {currentTags.length > 6 && (
                        <span className="px-1.5 py-0.5 rounded-md bg-cyan-500/10 border border-cyan-500/30 text-[10px] font-bold text-cyan-300">
                          +{currentTags.length - 6} more
                        </span>
                      )}
                    </div>
                  ) : (
                    <span className="text-[10px] text-slate-500 italic">
                      No custom tags set (auto-derived from items)
                    </span>
                  )}
                </div>

                {/* Device Display Badges */}
                <div className="pt-2 border-t border-white/5 flex flex-wrap items-center gap-1.5 text-[10px]">
                  <span className="flex items-center gap-1 px-2 py-0.5 rounded-md bg-blue-500/10 border border-blue-500/20 text-blue-300 font-semibold" title="PC Display: Columns & Count">
                    <Monitor className="w-3 h-3 text-blue-400" />
                    <span>PC: {cat.desktopColumns ?? 3} cols • {cat.desktopItemsPerPage ? `${cat.desktopItemsPerPage} items` : 'All'}</span>
                  </span>
                  <span className="flex items-center gap-1 px-2 py-0.5 rounded-md bg-purple-500/10 border border-purple-500/20 text-purple-300 font-semibold" title="Tablet Display: Columns & Count">
                    <Tablet className="w-3 h-3 text-purple-400" />
                    <span>Tab: {cat.tabletColumns ?? 2} cols • {cat.tabletItemsPerPage ? `${cat.tabletItemsPerPage} items` : 'All'}</span>
                  </span>
                  <span className="flex items-center gap-1 px-2 py-0.5 rounded-md bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 font-semibold" title="Mobile Display: Columns & Count">
                    <Smartphone className="w-3 h-3 text-emerald-400" />
                    <span>Mob: {cat.mobileColumns ?? 1} col • {cat.mobileItemsPerPage ? `${cat.mobileItemsPerPage} items` : 'All'}</span>
                  </span>
                </div>
              </div>

              <div className="relative z-10 pt-3 border-t border-white/10 flex items-center justify-between gap-2">
                <Link
                  to={`/category/${cat.id}`}
                  target="_blank"
                  className="flex items-center gap-1 text-[11px] font-bold text-[#5DE2E7] hover:underline"
                >
                  <span>View Page</span>
                  <ExternalLink className="w-3 h-3" />
                </Link>

                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => startEdit(cat)}
                    className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-[#5DE2E7] hover:text-slate-950 text-slate-300 transition text-xs font-bold flex items-center gap-1.5"
                    title="Edit Category & Tags"
                  >
                    <Edit className="w-3.5 h-3.5" />
                    <span>Edit</span>
                  </button>

                  <button
                    onClick={() => promptDelete(cat)}
                    className="p-1.5 rounded-xl bg-slate-800 hover:bg-red-500 hover:text-white text-slate-400 transition"
                    title="Delete Category"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* In-App Delete Confirmation Modal */}
      {categoryToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="w-full max-w-md p-6 rounded-2xl bg-slate-900 border border-red-500/40 shadow-[0_0_40px_rgba(239,68,68,0.25)] space-y-4">
            <div className="flex items-start gap-3.5">
              <div className="w-11 h-11 rounded-xl bg-red-500/20 border border-red-500/30 flex items-center justify-center shrink-0 text-red-400">
                <Trash2 className="w-5 h-5" />
              </div>
              <div className="space-y-1">
                <h4 className="text-base font-extrabold text-white">Delete Category?</h4>
                <p className="text-xs text-slate-300">
                  Are you sure you want to delete <span className="text-[#5DE2E7] font-bold">"{categoryToDelete.name}"</span>?
                </p>
              </div>
            </div>

            {categoryToDelete.count > 0 && (
              <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-start gap-2 text-amber-300 text-xs">
                <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>
                  <strong>Notice:</strong> There are currently <strong>{categoryToDelete.count}</strong> resource product(s) assigned to this category.
                </span>
              </div>
            )}

            <p className="text-[11px] text-slate-400">
              This action will remove the category from the header navigation, mobile sidebar menu, homepage category grid, filters, and dynamic category pages.
            </p>

            <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-white/10">
              <button
                type="button"
                onClick={() => setCategoryToDelete(null)}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold transition"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={confirmDelete}
                className="px-4 py-2 rounded-xl bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-500 hover:to-rose-500 text-white font-extrabold shadow-[0_0_15px_rgba(239,68,68,0.4)] transition flex items-center gap-1.5"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Delete Category</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
