import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { ProductCard } from './ProductCard';
import { ResourceCategory } from '../types';
import {
  Grid,
  List,
  Filter,
  Sparkles,
  Flame,
  ArrowUpDown,
  Layers
} from 'lucide-react';
import { AdBanner } from './AdBanner';
import { CategoryIcon } from './CategoryIcon';
import { motion } from 'motion/react';

export const ResourceFeed: React.FC = () => {
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

  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

  // Filter resources
  const filtered = resources.filter(res => {
    const categoryMatch = selectedCategory === 'all' || res.category === selectedCategory;
    let tagMatch = true;
    if (activeTag === 'featured') tagMatch = res.isFeatured;
    if (activeTag === 'trending') tagMatch = res.isTrending;

    return categoryMatch && tagMatch;
  });

  // Sort resources
  const sorted = [...filtered].sort((a, b) => {
    if (sortBy === 'downloads') return b.downloadsCount - a.downloadsCount;
    if (sortBy === 'title') return a.title.localeCompare(b.title);
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
  });

  return (
    <section id="resource-feed" className="py-8 px-3 sm:px-6 lg:px-8 max-w-[1700px] mx-auto scroll-mt-20">
      
      {/* Feed Header Controls Bar */}
      <div className="p-4 rounded-3xl glass-panel border border-white/10 mb-8 space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h2 className="text-xl sm:text-2xl font-black text-white flex items-center gap-2">
              <span className="capitalize">
                {selectedCategory === 'all' ? 'Online Task Lab (OTL) Resources & Tasks' : `${selectedCategory.replace('-', ' ')} — OTL`}
              </span>
              <span className="text-xs px-2.5 py-0.5 rounded-full bg-[#5DE2E7]/20 text-[#5DE2E7] font-bold border border-[#5DE2E7]/30">
                {sorted.length} Items
              </span>
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Verified digital tasks &amp; instant Telegram downloads • Online Task Lab Official
            </p>
          </div>

          {/* Right Controls: Sort & Grid View Toggle */}
          <div className="flex items-center gap-3 self-end md:self-auto">
            {/* Sort Dropdown */}
            <div className="flex items-center gap-1.5 bg-slate-900/80 px-3 py-1.5 rounded-xl border border-white/10 text-xs">
              <ArrowUpDown className="w-3.5 h-3.5 text-[#5DE2E7]" />
              <select
                value={sortBy}
                onChange={e => setSortBy(e.target.value as any)}
                className="bg-transparent text-white focus:outline-none cursor-pointer font-semibold"
              >
                <option value="latest" className="bg-slate-950">Latest Releases</option>
                <option value="downloads" className="bg-slate-950">Most Downloaded</option>
                <option value="title" className="bg-slate-950">Alphabetical (A-Z)</option>
              </select>
            </div>

            {/* View Switcher */}
            <div className="flex items-center bg-slate-900/80 p-1 rounded-xl border border-white/10">
              <button
                onClick={() => setViewMode('grid')}
                className={`p-1.5 rounded-lg transition ${
                  viewMode === 'grid' ? 'bg-[#5DE2E7] text-slate-950' : 'text-slate-400 hover:text-white'
                }`}
                title="Grid View"
              >
                <Grid className="w-4 h-4" />
              </button>
              <button
                onClick={() => setViewMode('list')}
                className={`p-1.5 rounded-lg transition ${
                  viewMode === 'list' ? 'bg-[#5DE2E7] text-slate-950' : 'text-slate-400 hover:text-white'
                }`}
                title="List View"
              >
                <List className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        {/* Filter Pills Bar */}
        <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-white/10 text-xs">
          <button
            onClick={() => {
              setSelectedCategory('all');
              setActiveTag(null);
            }}
            className={`px-3.5 py-1.5 rounded-xl font-bold transition ${
              selectedCategory === 'all' && !activeTag
                ? 'bg-[#5DE2E7] text-slate-950 shadow-[0_0_12px_#5DE2E7]'
                : 'bg-white/5 hover:bg-white/10 text-slate-300'
            }`}
          >
            All Resources
          </button>

          {categories.map(cat => {
            const isActive = selectedCategory === cat.id && !activeTag;
            return (
              <button
                key={cat.id}
                onClick={() => {
                  setSelectedCategory(cat.id);
                  setActiveTag(null);
                }}
                className={`px-3 py-1.5 rounded-xl font-bold transition flex items-center gap-1.5 whitespace-nowrap ${
                  isActive
                    ? 'bg-[#5DE2E7] text-slate-950 shadow-[0_0_12px_#5DE2E7]'
                    : 'bg-white/5 hover:bg-white/10 text-slate-300'
                }`}
              >
                <CategoryIcon name={cat.icon || cat.id} className="w-3.5 h-3.5" />
                <span>{cat.name}</span>
              </button>
            );
          })}

          <div className="h-4 w-[1px] bg-white/20 mx-1 hidden sm:block" />

          {/* Quick Filter Tag Buttons */}
          <button
            onClick={() => setActiveTag(activeTag === 'featured' ? null : 'featured')}
            className={`px-3 py-1.5 rounded-xl font-bold transition flex items-center gap-1.5 ${
              activeTag === 'featured'
                ? 'bg-amber-400 text-slate-950 shadow-[0_0_12px_#fbbf24]'
                : 'bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border border-amber-500/30'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5" /> Featured
          </button>

          <button
            onClick={() => setActiveTag(activeTag === 'trending' ? null : 'trending')}
            className={`px-3 py-1.5 rounded-xl font-bold transition flex items-center gap-1.5 ${
              activeTag === 'trending'
                ? 'bg-red-500 text-white shadow-[0_0_12px_#ef4444]'
                : 'bg-red-500/10 hover:bg-red-500/20 text-red-300 border border-red-500/30'
            }`}
          >
            <Flame className="w-3.5 h-3.5" /> Trending
          </button>
        </div>
      </div>

      {/* Ad Banner on top of Feed */}
      <AdBanner type="homepage-banner" />

      {/* Resources Display Grid */}
      {sorted.length === 0 ? (
        <div className="py-16 text-center glass-card rounded-3xl border border-white/10 p-8">
          <Layers className="w-12 h-12 text-slate-500 mx-auto mb-3" />
          <h3 className="text-lg font-bold text-white mb-1">No Resources Found</h3>
          <p className="text-xs text-slate-400 max-w-sm mx-auto mb-4">
            There are currently no items matching your selected category filter or tag.
          </p>
          <button
            onClick={() => {
              setSelectedCategory('all');
              setActiveTag(null);
            }}
            className="px-4 py-2 rounded-xl bg-[#5DE2E7] text-slate-950 font-bold text-xs"
          >
            Reset Filters
          </button>
        </div>
      ) : (
        <motion.div
          key={viewMode}
          initial={{ opacity: 0, y: 4 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.18, ease: 'easeOut' }}
          className={
            viewMode === 'grid'
              ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5 lg:gap-6'
              : 'space-y-3 sm:space-y-3.5'
          }
        >
          {sorted.map(res => (
            <ProductCard key={res.id} resource={res} viewMode={viewMode} />
          ))}
        </motion.div>
      )}
    </section>
  );
};
