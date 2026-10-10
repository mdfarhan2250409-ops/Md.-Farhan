import React, { useState, useMemo, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { ProductCard } from './ProductCard';
import { ResourceCategory } from '../types';
import {
  ArrowLeft,
  Home,
  ChevronRight,
  Search,
  Grid,
  List,
  ArrowUpDown,
  Sparkles,
  Flame,
  ShieldCheck,
  CheckCircle2,
  X
} from 'lucide-react';
import { AdBanner } from './AdBanner';
import { motion } from 'motion/react';
import { CategoryIcon } from './CategoryIcon';

export const CategoryPage: React.FC = () => {
  const {
    resources,
    categories,
    selectedCategory,
    setSelectedCategory,
    activeTag,
    setActiveTag,
    sortBy,
    setSortBy
  } = useApp();

  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

  // Find active category details
  const currentCategoryObj = categories.find(c => c.id === selectedCategory || c.slug === selectedCategory);
  const categoryName = currentCategoryObj?.name || selectedCategory.replace('-', ' ');
  const categoryDescription = currentCategoryObj?.description || `Explore our curated selection of verified ${categoryName} resources.`;
  const categoryBanner = currentCategoryObj?.banner || 'https://images.unsplash.com/photo-1512941937669-90a1b58e7e9c?auto=format&fit=crop&w=1200&q=80';

  // Filter resources for this specific category + search + tag
  const categoryResources = resources.filter(res => res.category === selectedCategory);

  // Responsive Device detection for layout & item limit
  const [windowWidth, setWindowWidth] = useState(() => (typeof window !== 'undefined' ? window.innerWidth : 1200));

  useEffect(() => {
    const handleResize = () => setWindowWidth(window.innerWidth);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const isMobile = windowWidth < 768;
  const isTablet = windowWidth >= 768 && windowWidth < 1024;

  // Responsive Grid Layout Settings from Category Config
  const desktopCols = currentCategoryObj?.desktopColumns || 3;
  const tabletCols = currentCategoryObj?.tabletColumns || 2;
  const mobileCols = currentCategoryObj?.mobileColumns || 1;

  // Items display limit based on active device (0 means show all)
  const itemsLimit = isMobile
    ? (currentCategoryObj?.mobileItemsPerPage ?? 0)
    : isTablet
    ? (currentCategoryObj?.tabletItemsPerPage ?? 0)
    : (currentCategoryObj?.desktopItemsPerPage ?? 0);

  const [showAllItems, setShowAllItems] = useState(false);

  const gridLayoutClass = useMemo(() => {
    if (viewMode === 'list') return 'space-y-3 sm:space-y-3.5';

    const mobClass = mobileCols === 2 ? 'grid-cols-2' : 'grid-cols-1';
    const tabClass = tabletCols === 1 ? 'md:grid-cols-1' : tabletCols === 3 ? 'md:grid-cols-3' : tabletCols === 4 ? 'md:grid-cols-4' : 'md:grid-cols-2';
    const deskClass = desktopCols === 1 ? 'lg:grid-cols-1' : desktopCols === 2 ? 'lg:grid-cols-2' : desktopCols === 4 ? 'lg:grid-cols-4' : desktopCols === 5 ? 'lg:grid-cols-5' : desktopCols === 6 ? 'lg:grid-cols-6' : 'lg:grid-cols-3';

    return `grid ${mobClass} ${tabClass} ${deskClass} gap-4 sm:gap-5 lg:gap-6`;
  }, [viewMode, desktopCols, tabletCols, mobileCols]);

  const filteredResources = categoryResources.filter(res => {
    const resTags = res.tags || [];
    const matchesSearch = searchQuery === '' ||
      res.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      res.shortDescription.toLowerCase().includes(searchQuery.toLowerCase()) ||
      resTags.some(t => t.toLowerCase().includes(searchQuery.toLowerCase()));

    let matchesTag = true;
    if (activeTag === 'featured') matchesTag = res.isFeatured;
    else if (activeTag === 'trending') matchesTag = res.isTrending;
    else if (activeTag) {
      const activeLower = activeTag.toLowerCase().trim();
      matchesTag = resTags.some(t => t.toLowerCase().trim() === activeLower) ||
        res.title.toLowerCase().includes(activeLower) ||
        res.shortDescription.toLowerCase().includes(activeLower);
    }

    return matchesSearch && matchesTag;
  });

  // Sort resources
  const sortedResources = [...filteredResources].sort((a, b) => {
    if (sortBy === 'downloads') return (b.downloadsCount || 0) - (a.downloadsCount || 0);
    if (sortBy === 'title') return a.title.localeCompare(b.title);
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
  });

  // Extract category specific tags (admin configured category tags prioritized)
  const allCategoryTags = (currentCategoryObj?.tags && currentCategoryObj.tags.length > 0)
    ? currentCategoryObj.tags
    : Array.from(new Set(categoryResources.flatMap(r => r.tags || [])));

  return (
    <div className="py-6 px-3 sm:px-6 lg:px-8 max-w-[1700px] mx-auto space-y-6">
      
      {/* Top Breadcrumb Nav Bar */}
      <div className="flex items-center justify-between gap-4 py-2 border-b border-white/10 text-xs text-slate-300">
        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={() => {
              setSelectedCategory('all');
              setActiveTag(null);
            }}
            className="flex items-center gap-1.5 text-slate-400 hover:text-[#5DE2E7] transition font-medium"
          >
            <Home className="w-3.5 h-3.5" />
            <span>Home</span>
          </button>
          <ChevronRight className="w-3.5 h-3.5 text-slate-600" />
          <span className="text-slate-400">Categories</span>
          <ChevronRight className="w-3.5 h-3.5 text-slate-600" />
          <span className="text-[#5DE2E7] font-bold capitalize">{categoryName}</span>
        </div>

        <button
          onClick={() => {
            setSelectedCategory('all');
            setActiveTag(null);
          }}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-slate-200 text-xs font-bold transition hover:border-[#5DE2E7]/40"
        >
          <ArrowLeft className="w-3.5 h-3.5 text-[#5DE2E7]" />
          <span>Back to All Resources</span>
        </button>
      </div>

      {/* Category Hero Banner Header */}
      <motion.div
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative rounded-3xl overflow-hidden glass-panel border border-[#5DE2E7]/30 p-6 sm:p-8 shadow-[0_0_40px_rgba(11,29,81,0.6)]"
      >
        {/* Background Image Overlay */}
        <div
          className="absolute inset-0 bg-cover bg-center opacity-20 pointer-events-none filter blur-sm scale-105"
          style={{ backgroundImage: `url(${categoryBanner})` }}
        />
        <div className="absolute inset-0 bg-gradient-to-r from-[#060B1E] via-[#0B1D51]/90 to-[#060B1E]/80 pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="flex items-start gap-4 sm:gap-5">
            {/* Category Icon Box */}
            <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-gradient-to-br from-[#133E87] to-[#0B1D51] border border-[#5DE2E7]/50 flex items-center justify-center shrink-0 shadow-[0_0_25px_rgba(93,226,231,0.35)]">
              <CategoryIcon name={currentCategoryObj?.icon || selectedCategory} className="w-7 h-7 sm:w-8 sm:h-8 text-[#5DE2E7]" />
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="px-2.5 py-0.5 rounded-full bg-[#5DE2E7]/20 text-[#5DE2E7] text-[10px] sm:text-xs font-extrabold uppercase tracking-widest border border-[#5DE2E7]/30">
                  Official Category Page
                </span>
                <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 text-[10px] sm:text-xs font-bold border border-emerald-500/30 flex items-center gap-1">
                  <ShieldCheck className="w-3 h-3 text-emerald-400" />
                  <span>Verified Safe</span>
                </span>
              </div>

              <h1 className="text-2xl sm:text-4xl font-black text-white tracking-tight capitalize">
                {categoryName} — Online Task Lab (OTL)
              </h1>

              <p className="text-xs sm:text-sm text-slate-300 max-w-2xl leading-relaxed">
                {categoryDescription}
              </p>
            </div>
          </div>

          {/* Quick Counter Badge */}
          <div className="flex md:flex-col items-center md:items-end justify-between border-t md:border-t-0 md:border-l border-white/10 pt-4 md:pt-0 md:pl-6 shrink-0 gap-2">
            <div className="text-left md:text-right">
              <span className="text-2xl sm:text-3xl font-black text-[#5DE2E7] block">
                {categoryResources.length}
              </span>
              <span className="text-xs text-slate-400 font-semibold uppercase tracking-wider">
                Total Resources
              </span>
            </div>
            <div className="flex items-center gap-1.5 text-[11px] text-cyan-300 bg-[#5DE2E7]/10 px-3 py-1 rounded-xl border border-[#5DE2E7]/20 font-semibold">
              <CheckCircle2 className="w-3.5 h-3.5 text-[#5DE2E7]" />
              <span>Direct Telegram Links</span>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Top Advertisement Banner */}
      <AdBanner position="top" />

      {/* Category Tabs Bar */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none">
        <button
          onClick={() => {
            setSelectedCategory('all');
            setActiveTag(null);
          }}
          className="px-4 py-2 rounded-2xl text-xs font-bold transition whitespace-nowrap bg-slate-900/80 hover:bg-slate-800 text-slate-300 border border-white/10"
        >
          All Resources
        </button>

        {categories.map(cat => {
          const isActive = cat.id === selectedCategory;
          return (
            <button
              key={cat.id}
              onClick={() => {
                setSelectedCategory(cat.id as ResourceCategory);
                setActiveTag(null);
                setSearchQuery('');
              }}
              className={`px-4 py-2 rounded-2xl text-xs font-bold transition whitespace-nowrap flex items-center gap-2 ${
                isActive
                  ? 'bg-gradient-to-r from-[#133E87] to-cyan-500 text-white shadow-[0_0_15px_rgba(93,226,231,0.4)] border border-[#5DE2E7]/50'
                  : 'bg-slate-900/80 hover:bg-slate-800 text-slate-300 border border-white/10'
              }`}
            >
              <span>{cat.name}</span>
            </button>
          );
        })}
      </div>

      {/* Main Controls Header Bar */}
      <div className="p-4 rounded-3xl glass-panel border border-white/10 space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          {/* Search Box inside Category */}
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder={`Search in ${categoryName}...`}
              className="w-full pl-10 pr-9 py-2 rounded-2xl bg-slate-950/70 border border-white/15 text-white placeholder-slate-400 text-xs focus:outline-none focus:border-[#5DE2E7] focus:ring-1 focus:ring-[#5DE2E7] transition"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Controls: Sort & Grid View Switcher */}
          <div className="flex items-center gap-3 justify-between lg:justify-end">
            {/* Sort Dropdown */}
            <div className="flex items-center gap-2 bg-slate-900/90 px-3.5 py-2 rounded-2xl border border-white/15 text-xs">
              <ArrowUpDown className="w-3.5 h-3.5 text-[#5DE2E7]" />
              <select
                value={sortBy}
                onChange={e => setSortBy(e.target.value as any)}
                className="bg-transparent text-white focus:outline-none cursor-pointer font-semibold text-xs"
              >
                <option value="latest" className="bg-slate-950">Latest Releases</option>
                <option value="downloads" className="bg-slate-950">Most Downloaded</option>
                <option value="title" className="bg-slate-950">Alphabetical (A-Z)</option>
              </select>
            </div>

            {/* View Mode Toggle */}
            <div className="flex items-center bg-slate-900/90 p-1 rounded-2xl border border-white/15">
              <button
                onClick={() => setViewMode('grid')}
                className={`p-2 rounded-xl transition ${
                  viewMode === 'grid' ? 'bg-[#5DE2E7] text-slate-950 font-bold' : 'text-slate-400 hover:text-white'
                }`}
                title="Grid View"
              >
                <Grid className="w-4 h-4" />
              </button>
              <button
                onClick={() => setViewMode('list')}
                className={`p-2 rounded-xl transition ${
                  viewMode === 'list' ? 'bg-[#5DE2E7] text-slate-950 font-bold' : 'text-slate-400 hover:text-white'
                }`}
                title="List View"
              >
                <List className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        {/* Category Specific Tags Filters */}
        <div className="flex flex-wrap items-center gap-2 pt-3 border-t border-white/10 text-xs">
          <span className="text-slate-400 font-semibold mr-1">Filter Tags:</span>
          <button
            onClick={() => setActiveTag(null)}
            className={`px-3 py-1 rounded-xl font-bold transition ${
              !activeTag
                ? 'bg-[#5DE2E7] text-slate-950 shadow-[0_0_10px_#5DE2E7]'
                : 'bg-white/5 hover:bg-white/10 text-slate-300 border border-white/10'
            }`}
          >
            All Items
          </button>
          <button
            onClick={() => setActiveTag(activeTag === 'featured' ? null : 'featured')}
            className={`px-3 py-1 rounded-xl font-bold transition flex items-center gap-1.5 ${
              activeTag === 'featured'
                ? 'bg-amber-400 text-slate-950 shadow-[0_0_10px_#fbbf24]'
                : 'bg-white/5 hover:bg-white/10 text-amber-300 border border-amber-400/30'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Featured</span>
          </button>
          <button
            onClick={() => setActiveTag(activeTag === 'trending' ? null : 'trending')}
            className={`px-3 py-1 rounded-xl font-bold transition flex items-center gap-1.5 ${
              activeTag === 'trending'
                ? 'bg-rose-500 text-white shadow-[0_0_10px_#f43f5e]'
                : 'bg-white/5 hover:bg-white/10 text-rose-300 border border-rose-500/30'
            }`}
          >
            <Flame className="w-3.5 h-3.5" />
            <span>Trending</span>
          </button>

          {allCategoryTags.map(tag => (
            <button
              key={tag}
              onClick={() => setActiveTag(activeTag === tag ? null : tag)}
              className={`px-3 py-1 rounded-xl font-semibold transition capitalize ${
                activeTag === tag
                  ? 'bg-cyan-500 text-white shadow-[0_0_10px_rgba(6,182,212,0.6)]'
                  : 'bg-white/5 hover:bg-white/10 text-slate-300 border border-white/10'
              }`}
            >
              #{tag}
            </button>
          ))}
        </div>
      </div>

      {/* Grid / List Display */}
      {sortedResources.length > 0 ? (
        <div className="space-y-6">
          <motion.div
            key={`${viewMode}-${desktopCols}-${tabletCols}-${mobileCols}`}
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.18, ease: 'easeOut' }}
            className={gridLayoutClass}
          >
            {(itemsLimit > 0 && !showAllItems
              ? sortedResources.slice(0, itemsLimit)
              : sortedResources
            ).map(res => (
              <ProductCard key={res.id} resource={res} viewMode={viewMode} />
            ))}
          </motion.div>

          {itemsLimit > 0 && sortedResources.length > itemsLimit && (
            <div className="pt-4 text-center">
              <button
                onClick={() => setShowAllItems(!showAllItems)}
                className="px-6 py-2.5 rounded-2xl bg-gradient-to-r from-[#133E87] to-cyan-500 hover:from-cyan-500 hover:to-blue-600 text-white font-black text-xs uppercase tracking-wider shadow-[0_0_20px_rgba(93,226,231,0.4)] transition cursor-pointer"
              >
                {showAllItems
                  ? 'Show Less (কম দেখান)'
                  : `Load More Resources (${sortedResources.length - itemsLimit} more)`}
              </button>
            </div>
          )}
        </div>
      ) : (
        <div className="py-16 text-center rounded-3xl glass-panel border border-white/10 space-y-4">
          <div className="w-16 h-16 mx-auto rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center text-slate-400">
            <Search className="w-8 h-8 text-[#5DE2E7]" />
          </div>
          <h3 className="text-xl font-bold text-white">No Resources Found</h3>
          <p className="text-xs text-slate-400 max-w-sm mx-auto">
            No matching files were found in <span className="text-[#5DE2E7] capitalize">{categoryName}</span> for your current filters.
          </p>
          <div className="pt-2 flex items-center justify-center gap-3">
            <button
              onClick={() => {
                setSearchQuery('');
                setActiveTag(null);
              }}
              className="px-4 py-2 rounded-xl bg-[#5DE2E7] text-slate-950 text-xs font-bold hover:bg-cyan-300 transition"
            >
              Clear Filters
            </button>
            <button
              onClick={() => {
                setSelectedCategory('all');
                setActiveTag(null);
              }}
              className="px-4 py-2 rounded-xl bg-white/10 text-white text-xs font-bold hover:bg-white/20 border border-white/10 transition"
            >
              Browse All Categories
            </button>
          </div>
        </div>
      )}

      {/* Bottom Ad Banner */}
      <AdBanner position="bottom" />
    </div>
  );
};
