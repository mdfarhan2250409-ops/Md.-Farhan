import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import {
  Mail,
  Send,
  Plus,
  Trash2,
  Edit2,
  CheckCircle,
  Eye,
  MessageCircle,
  Youtube,
  Facebook,
  Instagram,
  Twitter,
  Globe,
  HelpCircle,
  Sparkles,
  Save,
  Check,
  X,
  Tag,
  Filter,
  ArrowUp,
  ArrowDown,
  RotateCcw
} from 'lucide-react';
import { TikTokIcon } from '../icons/TikTokIcon';
import { SocialButton, FAQItem, ContactCategoryItem } from '../../types';
import { DEFAULT_CONTACT_CATEGORIES, getEffectiveContactCategories, getCategoryLabelById, cleanSubjectTitle } from '../../lib/contactCategories';

export const AdminContactManager: React.FC = () => {
  const {
    inquiries,
    deleteInquiry,
    updateInquiryStatus,
    replyToInquiry,
    contactSettings,
    updateContactSettings,
    addSocialButton,
    updateSocialButton,
    deleteSocialButton,
    addFaq,
    updateFaq,
    deleteFaq,
    addContactCategory,
    updateContactCategory,
    deleteContactCategory,
    reorderContactCategories,
    resetContactCategories
  } = useApp();

  const [activeSubTab, setActiveSubTab] = useState<'inquiries' | 'categories' | 'socials' | 'hero' | 'faqs'>('inquiries');

  // Dynamic Contact Categories
  const currentCategories = getEffectiveContactCategories(contactSettings?.categories, false);

  // Inquiry Filters
  const [inquiryFilter, setInquiryFilter] = useState<'all' | 'profile' | 'guest' | 'unread' | 'replied'>('all');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [selectedInquiryId, setSelectedInquiryId] = useState<string | null>(null);

  // Admin In-App Reply Form state
  const [replyInput, setReplyInput] = useState('');
  const [replyAdminName, setReplyAdminName] = useState('OTL Admin Desk');
  const [isSendingReply, setIsSendingReply] = useState(false);
  const [replySentSuccess, setReplySentSuccess] = useState(false);

  // Hero Form State
  const [heroForm, setHeroForm] = useState({
    modalTitle: contactSettings.modalTitle || 'Contact & Support Center',
    heroBadge: contactSettings.heroBadge || '24/7 Fast Telegram Support',
    heroTitle: contactSettings.heroTitle || 'Need Assistance or Custom Mod Requests?',
    heroSubtitle: contactSettings.heroSubtitle || 'Join our official Telegram Admin Desk for instant 1-on-1 support, broken link reports, or custom resource requests.',
    telegramButtonText: contactSettings.telegramButtonText || 'Chat Direct with Admin',
    telegramAdminUrl: contactSettings.telegramAdminUrl || 'https://t.me/OnlineTaskLabAdmin',
    formTitle: contactSettings.formTitle || 'Send an Email Inquiry',
    faqTitle: contactSettings.faqTitle || 'Frequently Asked Questions (FAQ)'
  });

  // Category Modal / Form State
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
  const [editingCategoryId, setEditingCategoryId] = useState<string | null>(null);
  const [categoryForm, setCategoryForm] = useState<{
    emoji: string;
    name: string;
    enabled: boolean;
  }>({
    emoji: '💎',
    name: '',
    enabled: true
  });

  // Social Button Modal / Form State
  const [isSocialModalOpen, setIsSocialModalOpen] = useState(false);
  const [editingSocialId, setEditingSocialId] = useState<string | null>(null);
  const [socialForm, setSocialForm] = useState<Omit<SocialButton, 'id'>>({
    platform: 'youtube',
    title: '',
    url: '',
    enabled: true,
    badgeText: 'Subscribe'
  });

  // FAQ Modal / Form State
  const [isFaqModalOpen, setIsFaqModalOpen] = useState(false);
  const [editingFaqId, setEditingFaqId] = useState<string | null>(null);
  const [faqForm, setFaqForm] = useState<{ question: string; answer: string }>({
    question: '',
    answer: ''
  });

  const unreadCount = inquiries.filter(i => i.status === 'unread').length;

  // Handle Save Hero Settings
  const handleSaveHero = (e: React.FormEvent) => {
    e.preventDefault();
    updateContactSettings(heroForm);
  };

  // Category Handlers
  const handleOpenNewCategory = () => {
    setEditingCategoryId(null);
    setCategoryForm({
      emoji: '💎',
      name: '',
      enabled: true
    });
    setIsCategoryModalOpen(true);
  };

  const handleEditCategory = (cat: ContactCategoryItem) => {
    setEditingCategoryId(cat.id);
    const emoji = cat.emoji || '💬';
    const name = cat.name || cat.label.replace(/^[^\w\s\u0980-\u09FF]+\s*/, '').trim();
    setCategoryForm({
      emoji,
      name,
      enabled: cat.enabled !== false
    });
    setIsCategoryModalOpen(true);
  };

  const handleSaveCategory = (e: React.FormEvent) => {
    e.preventDefault();
    if (!categoryForm.name.trim()) return;
    const emoji = categoryForm.emoji.trim() || '💬';
    const name = categoryForm.name.trim();
    const label = `${emoji} ${name}`;

    if (editingCategoryId) {
      updateContactCategory(editingCategoryId, {
        emoji,
        name,
        label,
        enabled: categoryForm.enabled
      });
    } else {
      addContactCategory({
        emoji,
        name,
        label,
        enabled: categoryForm.enabled
      });
    }
    setIsCategoryModalOpen(false);
  };

  const handleMoveCategory = (index: number, direction: 'up' | 'down') => {
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= currentCategories.length) return;
    const newCats = [...currentCategories];
    const temp = newCats[index];
    newCats[index] = newCats[targetIndex];
    newCats[targetIndex] = temp;
    const reordered = newCats.map((c, i) => ({ ...c, order: i + 1 }));
    reorderContactCategories(reordered);
  };

  // Social Button Handlers
  const handleOpenNewSocial = () => {
    setEditingSocialId(null);
    setSocialForm({
      platform: 'youtube',
      title: 'YouTube Channel',
      url: 'https://youtube.com/@onlinetasklab',
      enabled: true,
      badgeText: 'Subscribe'
    });
    setIsSocialModalOpen(true);
  };

  const handleEditSocial = (s: SocialButton) => {
    setEditingSocialId(s.id);
    setSocialForm({
      platform: s.platform,
      title: s.title,
      url: s.url,
      enabled: s.enabled,
      badgeText: s.badgeText || ''
    });
    setIsSocialModalOpen(true);
  };

  const handleSaveSocial = (e: React.FormEvent) => {
    e.preventDefault();
    if (!socialForm.title || !socialForm.url) return;

    if (editingSocialId) {
      updateSocialButton(editingSocialId, socialForm);
    } else {
      addSocialButton(socialForm);
    }
    setIsSocialModalOpen(false);
  };

  // FAQ Handlers
  const handleOpenNewFaq = () => {
    setEditingFaqId(null);
    setFaqForm({ question: '', answer: '' });
    setIsFaqModalOpen(true);
  };

  const handleEditFaq = (f: FAQItem) => {
    setEditingFaqId(f.id);
    setFaqForm({ question: f.question, answer: f.answer });
    setIsFaqModalOpen(true);
  };

  const handleSaveFaq = (e: React.FormEvent) => {
    e.preventDefault();
    if (!faqForm.question || !faqForm.answer) return;

    if (editingFaqId) {
      updateFaq(editingFaqId, faqForm);
    } else {
      addFaq(faqForm);
    }
    setIsFaqModalOpen(false);
  };

  const getPlatformIcon = (platform: SocialButton['platform']) => {
    switch (platform) {
      case 'youtube':
        return <Youtube className="w-5 h-5 text-red-500" />;
      case 'facebook':
        return <Facebook className="w-5 h-5 text-blue-500" />;
      case 'tiktok':
        return <TikTokIcon className="w-5 h-5 text-[#FE2C55]" />;
      case 'instagram':
        return <Instagram className="w-5 h-5 text-pink-500" />;
      case 'twitter':
        return <Twitter className="w-5 h-5 text-cyan-400" />;
      case 'telegram':
        return <Send className="w-5 h-5 text-sky-400" />;
      default:
        return <Globe className="w-5 h-5 text-[#5DE2E7]" />;
    }
  };

  return (
    <div className="space-y-6 text-white">
      {/* Top Banner Header */}
      <div className="p-6 rounded-2xl bg-gradient-to-r from-[#0B1D51] via-[#133E87] to-[#0B1D51] border border-[#5DE2E7]/30 flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-xl">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Mail className="w-6 h-6 text-[#5DE2E7]" />
            <h2 className="text-xl font-black tracking-tight text-white">Contact & Support Center Manager</h2>
          </div>
          <p className="text-xs text-slate-300">
            Control the Contact Modal, view user email inquiries, manage YouTube/Facebook/TikTok social buttons, and customize Telegram support links.
          </p>
        </div>

        {/* Sub Navigation Tabs */}
        <div className="flex flex-wrap items-center gap-2 bg-slate-950/60 p-1.5 rounded-xl border border-white/10 shrink-0">
          <button
            onClick={() => setActiveSubTab('inquiries')}
            className={`px-3.5 py-2 rounded-lg text-xs font-bold transition flex items-center gap-2 ${
              activeSubTab === 'inquiries'
                ? 'bg-[#5DE2E7] text-slate-950 shadow-md'
                : 'text-slate-300 hover:text-white hover:bg-white/5'
            }`}
          >
            <MessageCircle className="w-4 h-4" />
            <span>User Inquiries</span>
            {unreadCount > 0 && (
              <span className="px-1.5 py-0.5 rounded-full bg-red-500 text-white text-[10px] font-black animate-pulse">
                {unreadCount}
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveSubTab('categories')}
            className={`px-3.5 py-2 rounded-lg text-xs font-bold transition flex items-center gap-2 ${
              activeSubTab === 'categories'
                ? 'bg-[#5DE2E7] text-slate-950 shadow-md'
                : 'text-slate-300 hover:text-white hover:bg-white/5'
            }`}
          >
            <Tag className="w-4 h-4" />
            <span>Inquiry Categories ({currentCategories.length})</span>
          </button>

          <button
            onClick={() => setActiveSubTab('socials')}
            className={`px-3.5 py-2 rounded-lg text-xs font-bold transition flex items-center gap-2 ${
              activeSubTab === 'socials'
                ? 'bg-[#5DE2E7] text-slate-950 shadow-md'
                : 'text-slate-300 hover:text-white hover:bg-white/5'
            }`}
          >
            <Sparkles className="w-4 h-4" />
            <span>Social Buttons ({contactSettings.socialButtons?.length || 0})</span>
          </button>

          <button
            onClick={() => setActiveSubTab('hero')}
            className={`px-3.5 py-2 rounded-lg text-xs font-bold transition flex items-center gap-2 ${
              activeSubTab === 'hero'
                ? 'bg-[#5DE2E7] text-slate-950 shadow-md'
                : 'text-slate-300 hover:text-white hover:bg-white/5'
            }`}
          >
            <Send className="w-4 h-4" />
            <span>Support Hero Settings</span>
          </button>

          <button
            onClick={() => setActiveSubTab('faqs')}
            className={`px-3.5 py-2 rounded-lg text-xs font-bold transition flex items-center gap-2 ${
              activeSubTab === 'faqs'
                ? 'bg-[#5DE2E7] text-slate-950 shadow-md'
                : 'text-slate-300 hover:text-white hover:bg-white/5'
            }`}
          >
            <HelpCircle className="w-4 h-4" />
            <span>FAQ Manager</span>
          </button>
        </div>
      </div>

      {/* SUB-TAB 1: USER INQUIRIES */}
      {activeSubTab === 'inquiries' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 flex-wrap">
            <div>
              <h3 className="text-sm font-bold text-slate-200 uppercase tracking-wider flex items-center gap-2">
                <Mail className="w-4 h-4 text-[#5DE2E7]" />
                User Inquiries & Messages Desk ({inquiries.length})
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Manage contact requests from public visitors and direct support tickets from verified logged-in users.
              </p>
            </div>

            {/* Inquiries Filter Pills */}
            <div className="flex flex-wrap items-center gap-2">
              <div className="flex items-center gap-1.5 p-1 rounded-xl bg-slate-950/80 border border-white/10 text-xs overflow-x-auto">
                <button
                  type="button"
                  onClick={() => setInquiryFilter('all')}
                  className={`px-2.5 py-1.5 rounded-lg font-bold text-[11px] transition whitespace-nowrap ${
                    inquiryFilter === 'all'
                      ? 'bg-[#5DE2E7] text-slate-950 shadow'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  All ({inquiries.length})
                </button>
                <button
                  type="button"
                  onClick={() => setInquiryFilter('profile')}
                  className={`px-2.5 py-1.5 rounded-lg font-bold text-[11px] transition whitespace-nowrap flex items-center gap-1 ${
                    inquiryFilter === 'profile'
                      ? 'bg-cyan-500 text-white shadow'
                      : 'text-cyan-400 hover:text-cyan-300'
                  }`}
                >
                  <span>Profile Users</span>
                  <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-cyan-900/60 font-mono">
                    {inquiries.filter(i => i.isRegisteredUser || i.userId || i.source === 'profile').length}
                  </span>
                </button>
                <button
                  type="button"
                  onClick={() => setInquiryFilter('guest')}
                  className={`px-2.5 py-1.5 rounded-lg font-bold text-[11px] transition whitespace-nowrap ${
                    inquiryFilter === 'guest'
                      ? 'bg-[#5DE2E7] text-slate-950 shadow'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Guest Form ({inquiries.filter(i => !i.isRegisteredUser && !i.userId && i.source !== 'profile').length})
                </button>
                <button
                  type="button"
                  onClick={() => setInquiryFilter('unread')}
                  className={`px-2.5 py-1.5 rounded-lg font-bold text-[11px] transition whitespace-nowrap flex items-center gap-1 ${
                    inquiryFilter === 'unread'
                      ? 'bg-amber-500 text-slate-950 font-black shadow'
                      : 'text-amber-400 hover:text-amber-300'
                  }`}
                >
                  <span>Unread</span>
                  <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-amber-900/60 font-mono font-bold">
                    {inquiries.filter(i => i.status === 'unread').length}
                  </span>
                </button>
                <button
                  type="button"
                  onClick={() => setInquiryFilter('replied')}
                  className={`px-2.5 py-1.5 rounded-lg font-bold text-[11px] transition whitespace-nowrap ${
                    inquiryFilter === 'replied'
                      ? 'bg-emerald-500 text-slate-950 font-black shadow'
                      : 'text-emerald-400 hover:text-emerald-300'
                  }`}
                >
                  Replied ({inquiries.filter(i => i.status === 'replied').length})
                </button>
              </div>

              {/* Category Dropdown Filter */}
              <div className="flex items-center gap-1.5 bg-slate-950/80 border border-white/10 px-2.5 py-1 rounded-xl">
                <Tag className="w-3.5 h-3.5 text-[#5DE2E7]" />
                <select
                  value={categoryFilter}
                  onChange={e => setCategoryFilter(e.target.value)}
                  className="bg-transparent text-[11px] font-bold text-white focus:outline-none cursor-pointer"
                >
                  <option value="all" className="bg-slate-950 text-white">All Categories</option>
                  {currentCategories.map(cat => (
                    <option key={cat.id} value={cat.id} className="bg-slate-950 text-white">
                      {cat.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {(() => {
            const filteredInquiries = inquiries.filter(i => {
              if (inquiryFilter === 'profile' && !i.isRegisteredUser && !i.userId && i.source !== 'profile') return false;
              if (inquiryFilter === 'guest' && (i.isRegisteredUser || i.userId || i.source === 'profile')) return false;
              if (inquiryFilter === 'unread' && i.status !== 'unread') return false;
              if (inquiryFilter === 'replied' && i.status !== 'replied') return false;

              if (categoryFilter !== 'all') {
                const inqCatLabel = getCategoryLabelById(i.category || i.subject, currentCategories);
                const targetCatLabel = getCategoryLabelById(categoryFilter, currentCategories);
                if (inqCatLabel !== targetCatLabel) return false;
              }
              return true;
            });

            if (filteredInquiries.length === 0) {
              return (
                <div className="p-12 text-center rounded-2xl bg-slate-950/60 border border-white/10 text-slate-400">
                  <Mail className="w-10 h-10 mx-auto mb-3 text-slate-600" />
                  <p className="text-sm font-bold">No inquiries found for this filter!</p>
                  <p className="text-xs text-slate-500 mt-1">
                    Try switching filters or waiting for users to submit messages from their Profile or Contact page.
                  </p>
                </div>
              );
            }

            return (
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Inquiries List */}
                <div className="lg:col-span-1 space-y-2 max-h-[650px] overflow-y-auto pr-1">
                  {filteredInquiries.map(inq => {
                    const isFromProfile = inq.isRegisteredUser || inq.userId || inq.source === 'profile';
                    const categoryDisplayName = getCategoryLabelById(inq.category || inq.subject);
                    const cleanTitle = cleanSubjectTitle(inq.subject) || categoryDisplayName;

                    return (
                      <div
                        key={inq.id}
                        onClick={() => {
                          setSelectedInquiryId(inq.id);
                          setReplyInput(inq.adminReply || '');
                          if (inq.status === 'unread') {
                            updateInquiryStatus(inq.id, 'read');
                          }
                        }}
                        className={`p-4 rounded-2xl border transition cursor-pointer text-left ${
                          selectedInquiryId === inq.id
                            ? 'bg-[#133E87]/80 border-[#5DE2E7] shadow-lg'
                            : inq.status === 'unread'
                            ? 'bg-slate-950/90 border-amber-500/50 hover:border-amber-400'
                            : 'bg-slate-950/50 border-white/10 hover:border-white/20'
                        }`}
                      >
                        <div className="flex items-center justify-between gap-2 mb-1.5 flex-wrap">
                          <span className="text-[10px] font-mono text-slate-400">{inq.createdAt}</span>
                          <div className="flex items-center gap-1">
                            {isFromProfile && (
                              <span className="text-[9px] font-extrabold px-1.5 py-0.2 rounded bg-cyan-500/20 text-cyan-300 border border-cyan-500/40">
                                PROFILE USER
                              </span>
                            )}
                            <span
                              className={`text-[9px] font-black px-2 py-0.5 rounded-full ${
                                inq.status === 'unread'
                                  ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                                  : inq.status === 'replied'
                                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                                  : 'bg-slate-800 text-slate-400'
                              }`}
                            >
                              {inq.status.toUpperCase()}
                            </span>
                          </div>
                        </div>

                        {/* Category Label Pill */}
                        <div className="mb-1.5">
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-cyan-500/15 border border-[#5DE2E7]/40 text-[#5DE2E7] text-[10px] font-bold">
                            <Tag className="w-3 h-3 text-[#5DE2E7] shrink-0" />
                            <span className="truncate max-w-[210px]">{categoryDisplayName}</span>
                          </span>
                        </div>

                        <h4 className="text-xs font-bold text-white truncate mb-1">{cleanTitle}</h4>
                        
                        <div className="flex items-center gap-1.5 text-[11px] text-cyan-400 truncate mb-0.5">
                          {inq.username && (
                            <span className="font-bold text-white">@{inq.username}</span>
                          )}
                          <span>{inq.email}</span>
                        </div>

                        {inq.customId && (
                          <p className="text-[10px] text-emerald-400 font-mono font-medium truncate mb-1">
                            OTL ID: {inq.customId} {inq.priority ? `• [${inq.priority.toUpperCase()}]` : ''}
                          </p>
                        )}

                        {inq.telegramWhatsapp && (
                          <p className="text-[10px] text-sky-400 font-medium truncate mb-1">
                            TG/WA: {inq.telegramWhatsapp}
                          </p>
                        )}
                        <p className="text-[11px] text-slate-400 line-clamp-2">{inq.message}</p>
                      </div>
                    );
                  })}
                </div>

                {/* Selected Inquiry Detail View */}
                <div className="lg:col-span-2">
                  {selectedInquiryId ? (
                    (() => {
                      const activeInquiry = inquiries.find(i => i.id === selectedInquiryId);
                      if (!activeInquiry) return null;
                      const isProfileUser = activeInquiry.isRegisteredUser || activeInquiry.userId || activeInquiry.source === 'profile';
                      const activeCategoryLabel = getCategoryLabelById(activeInquiry.category || activeInquiry.subject);
                      const activeCleanTitle = cleanSubjectTitle(activeInquiry.subject) || activeCategoryLabel;

                      return (
                        <div className="p-6 rounded-2xl bg-slate-950/80 border border-white/10 space-y-5 text-left">
                          {/* Header */}
                          <div className="flex items-start justify-between border-b border-white/10 pb-4 gap-3 flex-wrap">
                            <div className="space-y-1.5">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="text-xs font-bold px-3 py-1 rounded-xl bg-gradient-to-r from-cyan-500/25 to-[#133E87]/50 text-[#5DE2E7] border border-[#5DE2E7]/40 flex items-center gap-1.5 shadow-sm">
                                  <Tag className="w-3.5 h-3.5 text-[#5DE2E7]" />
                                  <span>{activeCategoryLabel}</span>
                                </span>
                                {isProfileUser && (
                                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 border border-cyan-500/40">
                                    Verified User Profile Inquiry
                                  </span>
                                )}
                                {activeInquiry.priority && (
                                  <span
                                    className={`text-[9px] uppercase font-extrabold px-2 py-0.5 rounded border ${
                                      activeInquiry.priority === 'urgent'
                                        ? 'bg-rose-500/20 text-rose-300 border-rose-500/40'
                                        : activeInquiry.priority === 'high'
                                        ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                                        : 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40'
                                    }`}
                                  >
                                    Priority: {activeInquiry.priority}
                                  </span>
                                )}
                                <span className="text-[10px] text-slate-400 font-mono">ID: {activeInquiry.id}</span>
                              </div>
                              <h3 className="text-base font-black text-white mt-1">{activeCleanTitle}</h3>
                            </div>

                            <button
                              onClick={() => {
                                deleteInquiry(activeInquiry.id);
                                setSelectedInquiryId(null);
                              }}
                              className="p-2 rounded-xl bg-red-500/10 hover:bg-red-500/20 text-red-400 transition flex items-center gap-1.5 text-xs font-bold"
                            >
                              <Trash2 className="w-4 h-4" />
                              <span>Delete</span>
                            </button>
                          </div>

                          {/* Sender User Metadata Grid */}
                          <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 text-xs">
                            <div className="p-3 rounded-xl bg-slate-900/60 border border-white/5">
                              <span className="text-slate-400 block text-[10px] uppercase font-bold">Category</span>
                              <div className="text-[#5DE2E7] font-bold text-xs truncate mt-0.5">
                                {activeCategoryLabel}
                              </div>
                            </div>

                            <div className="p-3 rounded-xl bg-slate-900/60 border border-white/5">
                              <span className="text-slate-400 block text-[10px] uppercase font-bold">User Identity</span>
                              <div className="text-white font-bold truncate mt-0.5">
                                {activeInquiry.userName || activeInquiry.username || 'Guest Visitor'}
                              </div>
                              {activeInquiry.username && (
                                <span className="text-cyan-400 font-mono text-[11px]">@{activeInquiry.username}</span>
                              )}
                              {activeInquiry.customId && (
                                <div className="text-[10px] text-emerald-400 font-mono">{activeInquiry.customId}</div>
                              )}
                            </div>

                            <div className="p-3 rounded-xl bg-slate-900/60 border border-white/5">
                              <span className="text-slate-400 block text-[10px] uppercase font-bold">Email Address</span>
                              <a
                                href={`mailto:${activeInquiry.email}`}
                                className="text-cyan-400 font-bold hover:underline block truncate mt-0.5"
                              >
                                {activeInquiry.email}
                              </a>
                            </div>

                            <div className="p-3 rounded-xl bg-slate-900/60 border border-white/5">
                              <span className="text-slate-400 block text-[10px] uppercase font-bold">Direct Telegram / WA</span>
                              {activeInquiry.telegramWhatsapp ? (
                                <a
                                  href={
                                    activeInquiry.telegramWhatsapp.startsWith('@')
                                      ? `https://t.me/${activeInquiry.telegramWhatsapp.replace('@', '')}`
                                      : activeInquiry.telegramWhatsapp.startsWith('+')
                                      ? `https://wa.me/${activeInquiry.telegramWhatsapp.replace(/[^0-9]/g, '')}`
                                      : `https://t.me/${activeInquiry.telegramWhatsapp}`
                                  }
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-emerald-400 font-bold hover:underline block truncate mt-0.5"
                                >
                                  {activeInquiry.telegramWhatsapp}
                                </a>
                              ) : (
                                <span className="text-slate-500">Not provided</span>
                              )}
                            </div>
                          </div>

                          {/* Message Body */}
                          <div>
                            <span className="text-slate-400 block text-[10px] uppercase font-bold mb-2">User Message Content</span>
                            <div className="p-4 rounded-xl bg-slate-900/90 border border-white/10 text-xs text-slate-200 leading-relaxed whitespace-pre-wrap">
                              {activeInquiry.message}
                            </div>
                          </div>

                          {/* Direct In-App Admin Reply Box */}
                          <div className="p-4 rounded-2xl bg-gradient-to-r from-slate-900 via-cyan-950/40 to-slate-900 border border-[#5DE2E7]/30 space-y-3">
                            <div className="flex items-center justify-between flex-wrap gap-2">
                              <h4 className="text-xs font-bold text-[#5DE2E7] uppercase tracking-wider flex items-center gap-1.5">
                                <Send className="w-3.5 h-3.5" />
                                <span>In-App Admin Reply (Synced to User Profile in Real-time)</span>
                              </h4>
                              {activeInquiry.adminReply && (
                                <span className="text-[10px] font-bold text-emerald-400 bg-emerald-500/20 px-2 py-0.5 rounded-full border border-emerald-500/30">
                                  Already Replied on {activeInquiry.adminRepliedAt ? new Date(activeInquiry.adminRepliedAt).toLocaleDateString() : 'N/A'}
                                </span>
                              )}
                            </div>

                            <textarea
                              rows={3}
                              value={replyInput}
                              onChange={e => setReplyInput(e.target.value)}
                              placeholder={`Write your response to ${activeInquiry.userName || activeInquiry.email}. This will instantly display inside their user profile under Contact & Support...`}
                              className="w-full px-3 py-2.5 rounded-xl bg-slate-950 border border-white/10 focus:border-[#5DE2E7] text-xs text-white placeholder-slate-500 focus:outline-none leading-relaxed"
                            />

                            <div className="flex items-center justify-between flex-wrap gap-3 pt-1">
                              <div className="flex items-center gap-2">
                                <span className="text-[10px] text-slate-400">Reply As:</span>
                                <input
                                  type="text"
                                  value={replyAdminName}
                                  onChange={e => setReplyAdminName(e.target.value)}
                                  className="px-2.5 py-1 rounded-lg bg-slate-950 border border-white/10 text-xs text-white focus:outline-none focus:border-[#5DE2E7] w-36"
                                />
                              </div>

                              <button
                                type="button"
                                disabled={isSendingReply || !replyInput.trim()}
                                onClick={async () => {
                                  if (!replyInput.trim()) return;
                                  setIsSendingReply(true);
                                  await replyToInquiry(activeInquiry.id, replyInput.trim(), replyAdminName);
                                  setIsSendingReply(false);
                                  setReplySentSuccess(true);
                                  setTimeout(() => setReplySentSuccess(false), 4000);
                                }}
                                className="px-4 py-2 rounded-xl bg-gradient-to-r from-[#133E87] to-cyan-500 hover:from-cyan-400 hover:to-blue-500 text-white font-extrabold text-xs shadow-md transition disabled:opacity-40 flex items-center gap-2 cursor-pointer"
                              >
                                {isSendingReply ? (
                                  <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                ) : (
                                  <CheckCircle className="w-3.5 h-3.5 text-emerald-300" />
                                )}
                                <span>{activeInquiry.adminReply ? 'Update & Resend Reply' : 'Send Admin Reply to User'}</span>
                              </button>
                            </div>

                            {replySentSuccess && (
                              <p className="text-xs text-emerald-400 font-bold flex items-center gap-1.5">
                                <CheckCircle className="w-4 h-4" />
                                <span>Reply saved to Firebase and delivered to user profile!</span>
                              </p>
                            )}
                          </div>

                          {/* Status Change & Quick External Links */}
                          <div className="pt-2 border-t border-white/10 flex flex-wrap items-center justify-between gap-3">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="text-xs text-slate-400 font-bold">Mark Status:</span>
                              {(['unread', 'read', 'replied'] as const).map(statusKey => (
                                <button
                                  key={statusKey}
                                  onClick={() => updateInquiryStatus(activeInquiry.id, statusKey)}
                                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition uppercase text-[10px] ${
                                    activeInquiry.status === statusKey
                                      ? statusKey === 'unread'
                                        ? 'bg-amber-500 text-slate-950 font-black'
                                        : statusKey === 'replied'
                                        ? 'bg-emerald-500 text-slate-950 font-black'
                                        : 'bg-cyan-500 text-slate-950 font-black'
                                      : 'bg-white/5 hover:bg-white/10 text-slate-400'
                                  }`}
                                >
                                  {statusKey}
                                </button>
                              ))}
                            </div>

                            <a
                              href={`mailto:${activeInquiry.email}?subject=Re: ${encodeURIComponent(
                                activeInquiry.subject
                              )}`}
                              className="px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-slate-200 font-bold text-xs flex items-center gap-2 transition"
                            >
                              <Send className="w-3.5 h-3.5 text-cyan-400" />
                              <span>Reply via External Email</span>
                            </a>
                          </div>
                        </div>
                      );
                    })()
                  ) : (
                    <div className="p-12 text-center rounded-2xl bg-slate-950/60 border border-white/10 text-slate-400 h-full flex flex-col items-center justify-center">
                      <Eye className="w-10 h-10 mb-3 text-slate-600" />
                      <p className="text-sm font-bold">Select an inquiry from the list to view details & reply.</p>
                    </div>
                  )}
                </div>
              </div>
            );
          })()}
        </div>
      )}

      {/* SUB-TAB: CATEGORIES & TOPICS MANAGER */}
      {activeSubTab === 'categories' && (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h3 className="text-sm font-bold text-slate-200 uppercase tracking-wider flex items-center gap-2">
                <Tag className="w-4 h-4 text-[#5DE2E7]" />
                User Inquiry Categories & Topics ({currentCategories.length})
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Customize the inquiry options displayed in the User Profile Contact Desk. Add new categories, edit labels & icons, reorder, or delete.
              </p>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={() => {
                  if (window.confirm('Reset all categories back to default OTL categories?')) {
                    resetContactCategories();
                  }
                }}
                className="px-3 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white text-xs font-bold transition flex items-center gap-1.5 border border-white/10"
                title="Reset to default categories"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Reset Defaults</span>
              </button>

              <button
                type="button"
                onClick={handleOpenNewCategory}
                className="px-4 py-2 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 text-white font-extrabold text-xs flex items-center gap-2 shadow-lg hover:scale-105 transition"
              >
                <Plus className="w-4 h-4" />
                <span>Add New Category</span>
              </button>
            </div>
          </div>

          {/* Categories Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {currentCategories.map((cat, index) => {
              const inqCountForCat = inquiries.filter(i => {
                const label = getCategoryLabelById(i.category || i.subject, currentCategories);
                return label === cat.label || (i.category && i.category.toLowerCase() === cat.id.toLowerCase());
              }).length;

              return (
                <div
                  key={cat.id}
                  className={`p-4 rounded-2xl bg-slate-950/80 border transition flex flex-col justify-between gap-3 ${
                    cat.enabled !== false
                      ? 'border-white/10 hover:border-[#5DE2E7]/40'
                      : 'border-white/5 opacity-60'
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-cyan-500/20 to-blue-600/20 border border-[#5DE2E7]/30 flex items-center justify-center text-xl shrink-0">
                        {cat.emoji || '💬'}
                      </div>
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <h4 className="text-xs font-bold text-white">
                            {cat.name || cat.label}
                          </h4>
                          <span className="text-[9px] font-mono px-2 py-0.5 rounded bg-slate-900 border border-white/10 text-slate-400">
                            #{index + 1}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 mt-1 flex-wrap">
                          <span className="text-[10px] text-slate-400 font-mono">
                            ID: <code className="text-cyan-300">{cat.id}</code>
                          </span>
                          <span className="text-[10px] text-slate-500">•</span>
                          <span className="text-[10px] text-slate-400 font-medium">
                            {inqCountForCat} inquir{inqCountForCat === 1 ? 'y' : 'ies'}
                          </span>
                        </div>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() =>
                        updateContactCategory(cat.id, { enabled: cat.enabled === false ? true : false })
                      }
                      className={`px-2.5 py-1 rounded-lg text-[10px] font-black uppercase transition shrink-0 ${
                        cat.enabled !== false
                          ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                          : 'bg-slate-800 text-slate-500 border border-white/5'
                      }`}
                    >
                      {cat.enabled !== false ? 'Active' : 'Disabled'}
                    </button>
                  </div>

                  {/* Preview Banner */}
                  <div className="p-2.5 rounded-xl bg-slate-900/60 border border-white/5 flex items-center justify-between text-[11px]">
                    <span className="text-slate-400 font-medium">User Dropdown Preview:</span>
                    <span className="font-bold text-cyan-300">{cat.label}</span>
                  </div>

                  {/* Actions Row */}
                  <div className="flex items-center justify-between pt-1 border-t border-white/5">
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        disabled={index === 0}
                        onClick={() => handleMoveCategory(index, 'up')}
                        className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white transition disabled:opacity-30 disabled:cursor-not-allowed"
                        title="Move Up"
                      >
                        <ArrowUp className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        disabled={index === currentCategories.length - 1}
                        onClick={() => handleMoveCategory(index, 'down')}
                        className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white transition disabled:opacity-30 disabled:cursor-not-allowed"
                        title="Move Down"
                      >
                        <ArrowDown className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => handleEditCategory(cat)}
                        className="px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white transition text-xs font-bold flex items-center gap-1.5"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                        <span>Edit</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          if (currentCategories.length <= 1) {
                            alert('You must keep at least one inquiry category.');
                            return;
                          }
                          if (window.confirm(`Are you sure you want to delete category "${cat.name || cat.label}"?`)) {
                            deleteContactCategory(cat.id);
                          }
                        }}
                        className="p-1.5 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-400 transition"
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
        </div>
      )}

      {/* SUB-TAB 2: SOCIAL BUTTONS MANAGER */}
      {activeSubTab === 'socials' && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-slate-200 uppercase tracking-wider flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-[#5DE2E7]" />
                Social Media & Channels Manager
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Add YouTube, Facebook, TikTok, Instagram, Twitter, or custom channel buttons that display in the Contact Modal.
              </p>
            </div>

            <button
              onClick={handleOpenNewSocial}
              className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 text-white font-extrabold text-xs flex items-center gap-2 shadow-lg hover:scale-105 transition"
            >
              <Plus className="w-4 h-4" />
              <span>Add Social Button</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {contactSettings.socialButtons?.map(social => (
              <div
                key={social.id}
                className="p-4 rounded-2xl bg-slate-950/80 border border-white/10 hover:border-[#5DE2E7]/40 transition flex items-center justify-between gap-4"
              >
                <div className="flex items-center gap-3">
                  <div className="p-3 rounded-xl bg-white/5 border border-white/10">
                    {getPlatformIcon(social.platform)}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h4 className="text-xs font-bold text-white">{social.title}</h4>
                      {social.badgeText && (
                        <span className="text-[9px] font-extrabold px-2 py-0.5 rounded bg-cyan-500/20 text-[#5DE2E7]">
                          {social.badgeText}
                        </span>
                      )}
                    </div>
                    <a
                      href={social.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[11px] text-slate-400 hover:text-cyan-400 truncate max-w-[200px] block"
                    >
                      {social.url}
                    </a>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <button
                    onClick={() =>
                      updateSocialButton(social.id, { enabled: !social.enabled })
                    }
                    className={`px-2.5 py-1 rounded-lg text-[10px] font-black uppercase transition ${
                      social.enabled
                        ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                        : 'bg-slate-800 text-slate-500'
                    }`}
                  >
                    {social.enabled ? 'Active' : 'Disabled'}
                  </button>

                  <button
                    onClick={() => handleEditSocial(social)}
                    className="p-2 rounded-lg bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white transition"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                  </button>

                  <button
                    onClick={() => deleteSocialButton(social.id)}
                    className="p-2 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-400 transition"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* SUB-TAB 3: SUPPORT HERO SETTINGS */}
      {activeSubTab === 'hero' && (
        <form onSubmit={handleSaveHero} className="p-6 rounded-2xl bg-slate-950/80 border border-white/10 space-y-5">
          <div className="flex items-center justify-between border-b border-white/10 pb-4">
            <div>
              <h3 className="text-sm font-bold text-slate-200 uppercase tracking-wider">
                Contact Modal & Telegram Hero Box Configuration
              </h3>
              <p className="text-xs text-slate-400">
                Customize titles, badges, and the Telegram Admin redirect URL.
              </p>
            </div>

            <button
              type="submit"
              className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 text-white font-extrabold text-xs flex items-center gap-2 hover:scale-105 transition shadow-lg"
            >
              <Save className="w-4 h-4" />
              <span>Save Settings</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1">Modal Window Header Title</label>
              <input
                type="text"
                value={heroForm.modalTitle}
                onChange={e => setHeroForm({ ...heroForm, modalTitle: e.target.value })}
                className="w-full px-4 py-2.5 rounded-xl bg-slate-900 border border-white/10 text-xs text-white focus:border-[#5DE2E7] focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1">Hero Badge Text</label>
              <input
                type="text"
                value={heroForm.heroBadge}
                onChange={e => setHeroForm({ ...heroForm, heroBadge: e.target.value })}
                className="w-full px-4 py-2.5 rounded-xl bg-slate-900 border border-white/10 text-xs text-white focus:border-[#5DE2E7] focus:outline-none"
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-xs font-bold text-slate-300 mb-1">Hero Box Headline</label>
              <input
                type="text"
                value={heroForm.heroTitle}
                onChange={e => setHeroForm({ ...heroForm, heroTitle: e.target.value })}
                className="w-full px-4 py-2.5 rounded-xl bg-slate-900 border border-white/10 text-xs text-white focus:border-[#5DE2E7] focus:outline-none"
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-xs font-bold text-slate-300 mb-1">Hero Box Subtitle Description</label>
              <textarea
                rows={2}
                value={heroForm.heroSubtitle}
                onChange={e => setHeroForm({ ...heroForm, heroSubtitle: e.target.value })}
                className="w-full px-4 py-2.5 rounded-xl bg-slate-900 border border-white/10 text-xs text-white focus:border-[#5DE2E7] focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1">Telegram Button Label</label>
              <input
                type="text"
                value={heroForm.telegramButtonText}
                onChange={e => setHeroForm({ ...heroForm, telegramButtonText: e.target.value })}
                className="w-full px-4 py-2.5 rounded-xl bg-slate-900 border border-white/10 text-xs text-white focus:border-[#5DE2E7] focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1">Telegram Admin Handle / Link</label>
              <input
                type="text"
                value={heroForm.telegramAdminUrl}
                onChange={e => setHeroForm({ ...heroForm, telegramAdminUrl: e.target.value })}
                className="w-full px-4 py-2.5 rounded-xl bg-slate-900 border border-white/10 text-xs text-white focus:border-[#5DE2E7] focus:outline-none"
              />
            </div>
          </div>
        </form>
      )}

      {/* SUB-TAB 4: FAQ MANAGER */}
      {activeSubTab === 'faqs' && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-slate-200 uppercase tracking-wider flex items-center gap-2">
                <HelpCircle className="w-4 h-4 text-[#5DE2E7]" />
                Frequently Asked Questions (FAQ) Manager
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Manage questions and answers displayed at the bottom of the Contact Modal.
              </p>
            </div>

            <button
              onClick={handleOpenNewFaq}
              className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 text-white font-extrabold text-xs flex items-center gap-2 shadow-lg hover:scale-105 transition"
            >
              <Plus className="w-4 h-4" />
              <span>Add FAQ</span>
            </button>
          </div>

          <div className="space-y-3">
            {contactSettings.faqs?.map(faq => (
              <div
                key={faq.id}
                className="p-4 rounded-2xl bg-slate-950/80 border border-white/10 space-y-2"
              >
                <div className="flex items-center justify-between gap-4">
                  <h4 className="text-xs font-bold text-cyan-400">{faq.question}</h4>
                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      onClick={() => handleEditFaq(faq)}
                      className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white transition"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => deleteFaq(faq.id)}
                      className="p-1.5 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-400 transition"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
                <p className="text-xs text-slate-300 leading-relaxed bg-slate-900/60 p-3 rounded-xl border border-white/5">
                  {faq.answer}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* SOCIAL BUTTON MODAL */}
      {isSocialModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="w-full max-w-md p-6 rounded-2xl bg-[#0B1D51] border border-[#5DE2E7]/40 shadow-2xl text-white space-y-4">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-[#5DE2E7]" />
                {editingSocialId ? 'Edit Social Button' : 'Add New Social Button'}
              </h3>
              <button onClick={() => setIsSocialModalOpen(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveSocial} className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">Platform Category</label>
                <select
                  value={socialForm.platform}
                  onChange={e =>
                    setSocialForm({
                      ...socialForm,
                      platform: e.target.value as SocialButton['platform']
                    })
                  }
                  className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-white/10 text-xs text-white focus:outline-none"
                >
                  <option value="youtube">YouTube</option>
                  <option value="facebook">Facebook</option>
                  <option value="tiktok">TikTok</option>
                  <option value="instagram">Instagram</option>
                  <option value="twitter">Twitter / X</option>
                  <option value="telegram">Telegram</option>
                  <option value="custom">Custom Link</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">Button Title</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. YouTube Channel, Facebook Page"
                  value={socialForm.title}
                  onChange={e => setSocialForm({ ...socialForm, title: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-white/10 text-xs text-white focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">URL / Link</label>
                <input
                  type="text"
                  required
                  placeholder="https://youtube.com/@onlinetasklab"
                  value={socialForm.url}
                  onChange={e => setSocialForm({ ...socialForm, url: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-white/10 text-xs text-white focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">Badge Text (Optional)</label>
                <input
                  type="text"
                  placeholder="e.g. Subscribe, Follow, Join 50K+"
                  value={socialForm.badgeText}
                  onChange={e => setSocialForm({ ...socialForm, badgeText: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-white/10 text-xs text-white focus:outline-none"
                />
              </div>

              <div className="flex items-center gap-2 pt-2">
                <input
                  type="checkbox"
                  id="enabledCheck"
                  checked={socialForm.enabled}
                  onChange={e => setSocialForm({ ...socialForm, enabled: e.target.checked })}
                  className="rounded bg-slate-900 border-white/10 text-cyan-500"
                />
                <label htmlFor="enabledCheck" className="text-xs text-slate-300 font-bold">
                  Enable Button on Contact Page
                </label>
              </div>

              <div className="flex justify-end gap-2 pt-3">
                <button
                  type="button"
                  onClick={() => setIsSocialModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-xs text-slate-300 font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 text-white font-extrabold text-xs"
                >
                  Save Button
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* CATEGORY MODAL */}
      {isCategoryModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="w-full max-w-md p-6 rounded-2xl bg-[#0B1D51] border border-[#5DE2E7]/40 shadow-2xl text-white space-y-4">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Tag className="w-4 h-4 text-[#5DE2E7]" />
                {editingCategoryId ? 'Edit Inquiry Category' : 'Add New Inquiry Category'}
              </h3>
              <button onClick={() => setIsCategoryModalOpen(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveCategory} className="space-y-3">
              {/* Quick Emoji Pickers */}
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">Quick Select Emoji</label>
                <div className="flex flex-wrap gap-1.5 p-2 rounded-xl bg-slate-900/80 border border-white/10 max-h-24 overflow-y-auto">
                  {['💎', '📥', '⚠️', '🎨', '💡', '💬', '⚡', '🛡️', '🚀', '🎁', '🔧', '📞', '🤝', '📱', '🔑', '🌟', '❓', '⚙️', '🔒', '🔔'].map(emoji => (
                    <button
                      key={emoji}
                      type="button"
                      onClick={() => setCategoryForm({ ...categoryForm, emoji })}
                      className={`w-7 h-7 rounded-lg text-sm flex items-center justify-center transition ${
                        categoryForm.emoji === emoji
                          ? 'bg-cyan-500/30 border border-cyan-400 text-white scale-110 shadow'
                          : 'bg-white/5 hover:bg-white/15 text-slate-200'
                      }`}
                    >
                      {emoji}
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-4 gap-3">
                <div className="col-span-1">
                  <label className="block text-xs font-bold text-slate-300 mb-1">Emoji</label>
                  <input
                    type="text"
                    required
                    value={categoryForm.emoji}
                    onChange={e => setCategoryForm({ ...categoryForm, emoji: e.target.value })}
                    className="w-full px-3 py-2 text-center text-lg rounded-xl bg-slate-900 border border-white/10 text-white focus:outline-none focus:border-[#5DE2E7]"
                  />
                </div>
                <div className="col-span-3">
                  <label className="block text-xs font-bold text-slate-300 mb-1">Category Title / Name *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Account & Membership Support"
                    value={categoryForm.name}
                    onChange={e => setCategoryForm({ ...categoryForm, name: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-white/10 text-xs text-white focus:outline-none focus:border-[#5DE2E7]"
                  />
                </div>
              </div>

              {/* Live Preview */}
              <div className="p-3 rounded-xl bg-slate-950/80 border border-cyan-500/30 space-y-1">
                <span className="text-[10px] font-bold text-cyan-400 uppercase tracking-wider block">
                  Live Preview in User Profile Dropdown:
                </span>
                <div className="px-3 py-2 rounded-lg bg-slate-900 border border-white/10 text-xs font-bold text-white flex items-center gap-2">
                  <span>{categoryForm.emoji || '💬'}</span>
                  <span>{categoryForm.name || 'Category Name Preview'}</span>
                </div>
              </div>

              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="catEnabledCheck"
                  checked={categoryForm.enabled}
                  onChange={e => setCategoryForm({ ...categoryForm, enabled: e.target.checked })}
                  className="rounded bg-slate-900 border-white/10 text-cyan-500"
                />
                <label htmlFor="catEnabledCheck" className="text-xs text-slate-300 font-bold cursor-pointer">
                  Enable this category in User Contact Desk
                </label>
              </div>

              <div className="flex justify-end gap-2 pt-3">
                <button
                  type="button"
                  onClick={() => setIsCategoryModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-xs text-slate-300 font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 text-white font-extrabold text-xs"
                >
                  {editingCategoryId ? 'Update Category' : 'Create Category'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* FAQ MODAL */}
      {isFaqModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="w-full max-w-md p-6 rounded-2xl bg-[#0B1D51] border border-[#5DE2E7]/40 shadow-2xl text-white space-y-4">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <HelpCircle className="w-4 h-4 text-[#5DE2E7]" />
                {editingFaqId ? 'Edit FAQ Item' : 'Add FAQ Item'}
              </h3>
              <button onClick={() => setIsFaqModalOpen(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveFaq} className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">Question</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. How do I download files?"
                  value={faqForm.question}
                  onChange={e => setFaqForm({ ...faqForm, question: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-white/10 text-xs text-white focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">Answer</label>
                <textarea
                  rows={4}
                  required
                  placeholder="Explain the answer in detail..."
                  value={faqForm.answer}
                  onChange={e => setFaqForm({ ...faqForm, answer: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-white/10 text-xs text-white focus:outline-none"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3">
                <button
                  type="button"
                  onClick={() => setIsFaqModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-xs text-slate-300 font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 text-white font-extrabold text-xs"
                >
                  Save FAQ
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
