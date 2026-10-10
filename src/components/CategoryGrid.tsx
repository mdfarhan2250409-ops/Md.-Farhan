import React from 'react';
import { Link } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import { ArrowRight } from 'lucide-react';
import { ResourceCategory } from '../types';
import { CategoryIcon } from './CategoryIcon';

export const CategoryGrid: React.FC = () => {
  const { categories, resources, setSelectedCategory } = useApp();

  const getItemCount = (catId: ResourceCategory) => {
    return resources.filter(r => r.category === catId).length;
  };

  const handleCategorySelect = (catId: ResourceCategory) => {
    setSelectedCategory(catId);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <section className="py-10 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h2 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight flex items-center gap-2">
            <span>Online Task Lab Categories</span>
            <span className="text-xs px-2.5 py-0.5 rounded-full bg-[#5DE2E7]/20 text-[#5DE2E7] border border-[#5DE2E7]/30 font-semibold">
              Explore All
            </span>
          </h2>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            Browse through organized OTL digital tasks, apps, templates, and creative presets
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {categories.map((cat) => {
          const count = getItemCount(cat.id as ResourceCategory);
          return (
            <Link
              key={cat.id}
              to={`/category/${cat.id}`}
              onClick={() => handleCategorySelect(cat.id as ResourceCategory)}
              className="group glass-panel rounded-2xl p-5 border border-white/10 glass-panel-hover cursor-pointer relative overflow-hidden flex flex-col justify-between block"
            >
              {/* Background gradient image effect */}
              {cat.banner && (
                <div
                  className="absolute inset-0 opacity-10 group-hover:opacity-20 transition-opacity bg-cover bg-center"
                  style={{ backgroundImage: `url(${cat.banner})` }}
                />
              )}

              <div className="relative z-10">
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-[#133E87] to-[#0B1D51] border border-[#5DE2E7]/30 flex items-center justify-center mb-4 shadow-[0_0_15px_rgba(93,226,231,0.25)] group-hover:scale-110 transition-transform">
                  <CategoryIcon name={cat.icon || cat.id} className="w-6 h-6 text-[#5DE2E7]" />
                </div>

                <h3 className="text-lg font-bold text-white group-hover:text-[#5DE2E7] transition-colors mb-1">
                  {cat.name}
                </h3>

                <p className="text-xs text-slate-300 line-clamp-2 mb-4 leading-relaxed">
                  {cat.description}
                </p>
              </div>

              <div className="relative z-10 flex items-center justify-between pt-3 border-t border-white/10 mt-auto">
                <span className="text-xs font-semibold text-[#5DE2E7] bg-[#5DE2E7]/10 px-2.5 py-1 rounded-lg border border-[#5DE2E7]/20">
                  {count} {count === 1 ? 'Resource' : 'Resources'}
                </span>
                <span className="p-1.5 rounded-lg bg-white/5 group-hover:bg-[#5DE2E7] group-hover:text-slate-950 text-slate-300 transition-colors">
                  <ArrowRight className="w-3.5 h-3.5" />
                </span>
              </div>
            </Link>
          );
        })}
      </div>
    </section>
  );
};
