import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useApp } from '../context/AppContext';
import { motion, AnimatePresence } from 'motion/react';
import {
  Search,
  X,
  Tag,
  Download,
  SlidersHorizontal,
  Layers,
  ChevronLeft,
  ChevronRight,
  RotateCcw
} from 'lucide-react';
import { ResourceCategory } from '../types';
import { CategoryIcon } from './CategoryIcon';

export const SearchModal: React.FC = () => {
  const {
    isSearchModalOpen,
    setIsSearchModalOpen,
    resources,
    categories,
    setActiveResourceModal,
    setTelegramDownloadModalResource
  } = useApp();

  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCatFilter, setSelectedCatFilter] = useState<ResourceCategory | 'all'>('all');

  const categoryScrollRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  // Keyboard shortcut (Cmd+K / Ctrl+K) listener to toggle search modal
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setIsSearchModalOpen(prev => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [setIsSearchModalOpen]);

  // Compute category item counts dynamically
  const categoryCounts = useMemo(() => {
    const counts: Record<string, number> = { all: resources.length };
    resources.forEach(r => {
      counts[r.category] = (counts[r.category] || 0) + 1;
    });
    return counts;
  }, [resources]);

  // Handle horizontal scroll checks for smooth edge fade and chevron visibility
  const updateScrollButtons = useCallback(() => {
    const el = categoryScrollRef.current;
    if (!el) return;
    const hasOverflow = el.scrollWidth > el.clientWidth;
    setCanScrollLeft(el.scrollLeft > 6);
    setCanScrollRight(hasOverflow && el.scrollLeft < el.scrollWidth - el.clientWidth - 6);
  }, []);

  useEffect(() => {
    if (!isSearchModalOpen) return;
    const timer = setTimeout(updateScrollButtons, 60);
    const el = categoryScrollRef.current;
    if (el) {
      el.addEventListener('scroll', updateScrollButtons, { passive: true });
    }
    window.addEventListener('resize', updateScrollButtons);
    return () => {
      clearTimeout(timer);
      if (el) el.removeEventListener('scroll', updateScrollButtons);
      window.removeEventListener('resize', updateScrollButtons);
    };
  }, [isSearchModalOpen, categories, updateScrollButtons]);

  const handleScroll = (direction: 'left' | 'right') => {
    if (!categoryScrollRef.current) return;
    const offset = 220;
    categoryScrollRef.current.scrollBy({
      left: direction === 'left' ? -offset : offset,
      behavior: 'smooth'
    });
  };

  const popularTags = ['Mod APK', 'Midjourney', 'ChatGPT', 'Lightroom', 'Preset', 'Photoshop', 'SaaS', 'Pro Unlocked'];

  const filtered = resources.filter(res => {
    const matchesCategory = selectedCatFilter === 'all' || res.category === selectedCatFilter;
    const matchesQuery =
      res.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      res.shortDescription.toLowerCase().includes(searchTerm.toLowerCase()) ||
      res.tags.some(t => t.toLowerCase().includes(searchTerm.toLowerCase()));

    return matchesCategory && matchesQuery;
  });

  const handleSelectResource = (res: any) => {
    setIsSearchModalOpen(false);
    setActiveResourceModal(res);
  };

  return (
    <AnimatePresence>
      {isSearchModalOpen && (
        <div className="fixed inset-0 z-50 flex items-start justify-center pt-16 sm:pt-24 px-4 pb-10">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={() => setIsSearchModalOpen(false)}
          className="fixed inset-0 bg-black/80 backdrop-blur-md"
        />

        {/* Modal Body */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: -20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: -20 }}
          className="relative w-full max-w-2xl bg-[#0B1D51]/95 border border-[#5DE2E7]/40 glass-panel rounded-3xl text-white shadow-[0_0_50px_rgba(93,226,231,0.3)] z-10 overflow-hidden flex flex-col max-h-[85vh]"
        >
          {/* Top Search Bar Input */}
          <div className="p-4 border-b border-white/10 flex items-center gap-3 bg-slate-950/60">
            <Search className="w-5 h-5 text-[#5DE2E7] shrink-0" />
            <input
              type="text"
              autoFocus
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              placeholder="Search Apps, AI Prompts, Presets, Software, Templates..."
              className="w-full bg-transparent border-none text-white text-sm sm:text-base focus:outline-none placeholder-slate-400 font-medium"
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm('')}
                className="text-xs text-slate-400 hover:text-white px-2 py-1 rounded-lg bg-white/5 cursor-pointer"
              >
                Clear
              </button>
            )}
            <button
              onClick={() => setIsSearchModalOpen(false)}
              className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white transition cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Refined Category Filter Bar */}
          <div className="border-b border-white/10 bg-slate-950/40 flex flex-col">
            {/* Category Filter Header */}
            <div className="px-4 pt-2.5 pb-1 flex items-center justify-between text-xs text-slate-400">
              <div className="flex items-center gap-1.5 font-bold tracking-wide">
                <SlidersHorizontal className="w-3.5 h-3.5 text-[#5DE2E7]" />
                <span className="uppercase text-[11px] font-black text-slate-300">Filter By Category</span>
                {selectedCatFilter !== 'all' && (
                  <span className="ml-1.5 px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#5DE2E7]/15 text-[#5DE2E7] border border-[#5DE2E7]/30">
                    Active
                  </span>
                )}
              </div>

              <div className="flex items-center gap-2">
                {selectedCatFilter !== 'all' && (
                  <button
                    onClick={() => setSelectedCatFilter('all')}
                    className="flex items-center gap-1 text-[11px] text-slate-400 hover:text-[#5DE2E7] transition font-medium cursor-pointer"
                  >
                    <RotateCcw className="w-3 h-3" />
                    <span>Reset</span>
                  </button>
                )}

                {/* Desktop/Tablet Left/Right Scroll Chevrons */}
                {(canScrollLeft || canScrollRight) && (
                  <div className="hidden sm:flex items-center gap-1 ml-1">
                    <button
                      onClick={() => handleScroll('left')}
                      disabled={!canScrollLeft}
                      aria-label="Scroll categories left"
                      className="p-1 rounded-lg bg-white/5 hover:bg-white/15 disabled:opacity-20 disabled:cursor-not-allowed text-slate-300 transition"
                    >
                      <ChevronLeft className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => handleScroll('right')}
                      disabled={!canScrollRight}
                      aria-label="Scroll categories right"
                      className="p-1 rounded-lg bg-white/5 hover:bg-white/15 disabled:opacity-20 disabled:cursor-not-allowed text-slate-300 transition"
                    >
                      <ChevronRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* Category Pills Container with Soft Gradient Edge Fade */}
            <div className="relative px-3 sm:px-4 pb-2.5 pt-1">
              {/* Left Fade Mask */}
              {canScrollLeft && (
                <div className="pointer-events-none absolute left-0 top-0 bottom-2.5 w-8 bg-gradient-to-r from-[#0B1D51] to-transparent z-10" />
              )}

              {/* Scrollable Pills Row */}
              <div
                ref={categoryScrollRef}
                className="flex items-center gap-2 overflow-x-auto no-scrollbar scroll-smooth py-1"
              >
                {/* 'All Resources' Pill */}
                <button
                  onClick={() => setSelectedCatFilter('all')}
                  className={`px-3 py-1.5 rounded-xl font-bold text-xs whitespace-nowrap transition-all duration-200 flex items-center gap-1.5 shrink-0 select-none cursor-pointer ${
                    selectedCatFilter === 'all'
                      ? 'bg-gradient-to-r from-[#5DE2E7] to-cyan-400 text-slate-950 shadow-[0_0_15px_rgba(93,226,231,0.55)] scale-[1.02]'
                      : 'bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white border border-white/10 hover:border-[#5DE2E7]/40'
                  }`}
                >
                  <Layers className={`w-3.5 h-3.5 ${selectedCatFilter === 'all' ? 'text-slate-950' : 'text-[#5DE2E7]'}`} />
                  <span>All Resources</span>
                  <span
                    className={`text-[10px] px-1.5 py-0.5 rounded-full font-mono font-bold ${
                      selectedCatFilter === 'all'
                        ? 'bg-slate-950/20 text-slate-950'
                        : 'bg-white/10 text-slate-400'
                    }`}
                  >
                    {categoryCounts['all'] || 0}
                  </span>
                </button>

                {/* Individual Categories */}
                {categories.map(cat => {
                  const isSelected = selectedCatFilter === cat.id;
                  const count = categoryCounts[cat.id] || 0;
                  return (
                    <button
                      key={cat.id}
                      onClick={() => setSelectedCatFilter(cat.id)}
                      className={`px-3 py-1.5 rounded-xl font-bold text-xs whitespace-nowrap transition-all duration-200 flex items-center gap-1.5 shrink-0 select-none cursor-pointer ${
                        isSelected
                          ? 'bg-gradient-to-r from-[#5DE2E7] to-cyan-400 text-slate-950 shadow-[0_0_15px_rgba(93,226,231,0.55)] scale-[1.02]'
                          : 'bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white border border-white/10 hover:border-[#5DE2E7]/40'
                      }`}
                    >
                      <CategoryIcon
                        name={cat.icon || cat.id}
                        className={`w-3.5 h-3.5 ${isSelected ? 'text-slate-950' : 'text-[#5DE2E7]'}`}
                      />
                      <span>{cat.name}</span>
                      <span
                        className={`text-[10px] px-1.5 py-0.5 rounded-full font-mono font-bold ${
                          isSelected
                            ? 'bg-slate-950/20 text-slate-950'
                            : 'bg-white/10 text-slate-400'
                        }`}
                      >
                        {count}
                      </span>
                    </button>
                  );
                })}
              </div>

              {/* Right Fade Mask */}
              {canScrollRight && (
                <div className="pointer-events-none absolute right-0 top-0 bottom-2.5 w-8 bg-gradient-to-l from-[#0B1D51] to-transparent z-10" />
              )}
            </div>
          </div>

          {/* Quick Popular Tags */}
          <div className="px-4 py-2 bg-slate-950/60 border-b border-white/10 flex items-center gap-2 overflow-x-auto no-scrollbar">
            <span className="text-slate-400 text-[11px] font-bold uppercase tracking-wider flex items-center gap-1 shrink-0">
              <Tag className="w-3 h-3 text-[#5DE2E7]" />
              <span>Popular:</span>
            </span>
            <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5">
              {popularTags.map(tag => {
                const isTagActive = searchTerm.toLowerCase() === tag.toLowerCase();
                return (
                  <button
                    key={tag}
                    onClick={() => setSearchTerm(isTagActive ? '' : tag)}
                    className={`px-2.5 py-1 rounded-lg text-[11px] font-medium transition-all shrink-0 flex items-center gap-1 cursor-pointer ${
                      isTagActive
                        ? 'bg-[#5DE2E7]/25 text-[#5DE2E7] border border-[#5DE2E7] shadow-[0_0_10px_rgba(93,226,231,0.35)]'
                        : 'bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white border border-white/10 hover:border-white/20'
                    }`}
                  >
                    <span className="text-slate-500 font-bold">#</span>
                    <span>{tag}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Search Results List */}
          <div className="p-4 overflow-y-auto space-y-2 flex-1">
            <div className="text-xs text-slate-400 font-semibold mb-2 flex items-center justify-between">
              <span>FOUND {filtered.length} RESULTS</span>
              {searchTerm && <span>Key: "{searchTerm}"</span>}
            </div>

            {filtered.length === 0 ? (
              <div className="py-12 text-center text-slate-400 text-xs">
                No matching resources found for "{searchTerm}". Try searching for another keyword.
              </div>
            ) : (
              filtered.map(res => (
                <div
                  key={res.id}
                  onClick={() => handleSelectResource(res)}
                  className="p-3 rounded-2xl bg-white/5 hover:bg-white/10 border border-white/10 hover:border-[#5DE2E7]/40 cursor-pointer transition flex items-center justify-between gap-3 group"
                >
                  <div className="flex items-center gap-3 overflow-hidden">
                    <img
                      src={res.thumbnail}
                      alt={res.title}
                      className="w-12 h-12 rounded-xl object-cover shrink-0 border border-white/10 group-hover:scale-105 transition"
                    />
                    <div className="overflow-hidden">
                      <div className="text-xs font-bold text-white group-hover:text-[#5DE2E7] transition truncate">
                        {res.title}
                      </div>
                      <div className="text-[11px] text-slate-400 truncate mt-0.5">
                        {res.shortDescription}
                      </div>
                      <div className="flex items-center gap-2 text-[10px] text-slate-400 mt-1 font-mono">
                        <span className="text-[#5DE2E7] font-semibold uppercase">{res.category}</span>
                        <span>• {res.fileSize}</span>
                        <span>• {res.version}</span>
                      </div>
                    </div>
                  </div>

                  <button
                    onClick={e => {
                      e.stopPropagation();
                      setIsSearchModalOpen(false);
                      setTelegramDownloadModalResource(res);
                    }}
                    className="p-2 rounded-xl bg-[#133E87] hover:bg-[#5DE2E7] text-white hover:text-slate-950 transition shrink-0 cursor-pointer"
                    title="Download via Telegram"
                  >
                    <Download className="w-4 h-4" />
                  </button>
                </div>
              ))
            )}
          </div>
        </motion.div>
      </div>
      )}
    </AnimatePresence>
  );
};

