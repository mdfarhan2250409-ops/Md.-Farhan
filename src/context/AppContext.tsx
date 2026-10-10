import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  Resource,
  CategoryItem,
  SiteSettings,
  HomepageBuilderSettings,
  SplashLoaderSettings,
  MobileNavSettings,
  Advertisement,
  SEOConfig,
  AnalyticsData,
  ResourceCategory,
  Inquiry,
  ContactPageSettings,
  SocialButton,
  FAQItem,
  ContactCategoryItem,
  FloatingButton,
  FloatingButtonsSettings
} from '../types';
import { DEFAULT_CONTACT_CATEGORIES } from '../lib/contactCategories';

import {
  initialCategories,
  initialResources,
  initialSiteSettings,
  initialHomepageBuilder,
  initialSplashSettings,
  initialMobileNavSettings,
  initialAds,
  initialSEO,
  initialAnalytics,
  initialInquiries,
  initialContactSettings,
  initialFloatingButtonsSettings,
  initialSocialButtons
} from '../data/initialData';
import {
  db,
  collection,
  doc,
  setDoc,
  updateDoc,
  deleteDoc,
  onSnapshot,
  query
} from '../lib/firebase';
import { supportService } from '../services/supportService';
import { guestService } from '../services/guestService';

interface AppContextType {
  // Data
  resources: Resource[];
  categories: CategoryItem[];
  siteSettings: SiteSettings;
  homepageBuilder: HomepageBuilderSettings;
  splashSettings: SplashLoaderSettings;
  mobileNavSettings: MobileNavSettings;
  ads: Advertisement[];
  seo: SEOConfig;
  analytics: AnalyticsData;
  inquiries: Inquiry[];
  contactSettings: ContactPageSettings;
  floatingButtonsSettings: FloatingButtonsSettings;

  // Active UI states
  selectedCategory: ResourceCategory | 'all';
  setSelectedCategory: (cat: ResourceCategory | 'all') => void;
  searchQuery: string;
  setSearchQuery: (q: string) => void;
  activeTag: string | null;
  setActiveTag: (tag: string | null) => void;
  sortBy: 'latest' | 'trending' | 'downloads' | 'title';
  setSortBy: (sort: 'latest' | 'trending' | 'downloads' | 'title') => void;

  // Modals
  activeResourceModal: Resource | null;
  setActiveResourceModal: (r: Resource | null) => void;
  isSearchModalOpen: boolean;
  setIsSearchModalOpen: (open: boolean) => void;
  isContactModalOpen: boolean;
  setIsContactModalOpen: (open: boolean) => void;
  isNotificationOpen: boolean;
  setIsNotificationOpen: (open: boolean) => void;
  telegramDownloadModalResource: Resource | null;
  setTelegramDownloadModalResource: (r: Resource | null) => void;
  
  // Admin Mode
  isAdminOpen: boolean;
  setIsAdminOpen: (open: boolean) => void;
  isVerifyEmailPageOpen: boolean;
  setIsVerifyEmailPageOpen: (open: boolean) => void;
  isMobileSidebarOpen: boolean;
  setIsMobileSidebarOpen: (open: boolean) => void;

  // Toast / Notification system
  toastMessage: string | null;
  showToast: (msg: string) => void;

  // 404 Route handling
  isNotFound: boolean;

  // Tracking
  recordDownload: (resourceId: string) => void;
  recordTelegramClick: (resourceId?: string) => void;

  // Actions for CRUD & Settings
  addResource: (resource: Omit<Resource, 'id' | 'createdAt' | 'downloadsCount' | 'telegramClicksCount'>) => void;
  updateResource: (id: string, updated: Partial<Resource>) => void;
  deleteResource: (id: string) => void;
  cloneResource: (id: string) => void;
  
  updateCategory: (id: ResourceCategory, updated: Partial<CategoryItem>) => void;
  addCategory: (cat: CategoryItem) => void;
  deleteCategory: (id: string) => void;

  updateSiteSettings: (settings: Partial<SiteSettings>) => void;
  updateHomepageBuilder: (builder: Partial<HomepageBuilderSettings>) => void;
  updateSplashSettings: (splash: Partial<SplashLoaderSettings>) => void;
  updateMobileNavSettings: (mobileNav: Partial<MobileNavSettings>) => void;
  updateAds: (ads: Advertisement[]) => void;
  updateSEO: (seo: Partial<SEOConfig>) => void;

  // Inquiry & Contact Manager Actions
  addInquiry: (inquiry: Omit<Inquiry, 'id' | 'createdAt' | 'status'>) => void;
  deleteInquiry: (id: string) => void;
  updateInquiryStatus: (id: string, status: 'unread' | 'read' | 'replied' | 'in_progress' | 'resolved') => void;
  replyToInquiry: (id: string, replyText: string, adminName?: string) => Promise<void>;

  updateContactSettings: (settings: Partial<ContactPageSettings>) => void;
  addSocialButton: (btn: Omit<SocialButton, 'id'>) => void;
  updateSocialButton: (id: string, updated: Partial<SocialButton>) => void;
  deleteSocialButton: (id: string) => void;

  addFaq: (faq: Omit<FAQItem, 'id'>) => void;
  updateFaq: (id: string, updated: Partial<FAQItem>) => void;
  deleteFaq: (id: string) => void;

  // Contact Category Management Actions
  addContactCategory: (cat: Omit<ContactCategoryItem, 'id'>) => void;
  updateContactCategory: (id: string, updated: Partial<ContactCategoryItem>) => void;
  deleteContactCategory: (id: string) => void;
  reorderContactCategories: (categories: ContactCategoryItem[]) => void;
  resetContactCategories: () => void;

  // Floating Buttons Actions
  updateFloatingButtonsSettings: (settings: Partial<FloatingButtonsSettings>) => void;
  addFloatingButton: (btn: Omit<FloatingButton, 'id' | 'order'>) => void;
  updateFloatingButton: (id: string, updated: Partial<FloatingButton>) => void;
  deleteFloatingButton: (id: string) => void;
  moveFloatingButton: (id: string, direction: 'up' | 'down') => void;

  resetToDefaults: () => void;
  triggerSplashLoaderPreview: () => void;
  isSplashLoaderVisible: boolean;
  setIsSplashLoaderVisible: (vis: boolean) => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

const LOCAL_STORAGE_KEY = 'OTL_APP_DATA_V2';

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Load initial state from LocalStorage or Defaults
  const [resources, setResources] = useState<Resource[]>(() => {
    try {
      // Also purge old V1 cache if present
      localStorage.removeItem('OTL_APP_DATA_V1_resources');
      localStorage.removeItem('OTL_APP_DATA_V1_categories');

      const saved = localStorage.getItem(`${LOCAL_STORAGE_KEY}_resources`);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          const cleaned = parsed.filter((r: any) => r.category !== 'pc-software' && !String(r.id).startsWith('pc-')).map((r: any) => {
            if (r.category === 'lr-presets' && (!r.presetGallery || r.presetGallery.length === 0)) {
              const init = initialResources.find(ir => ir.id === r.id);
              if (init?.presetGallery) {
                return { ...r, presetGallery: init.presetGallery };
              }
            }
            return r;
          });
          const existingIds = new Set(cleaned.map((r: any) => r.id));
          const missing = initialResources.filter(r => !existingIds.has(r.id));
          return missing.length > 0 ? [...cleaned, ...missing] : cleaned;
        }
      }
      return initialResources;
    } catch (e) {
      return initialResources;
    }
  });

  const [categories, setCategories] = useState<CategoryItem[]>(() => {
    try {
      const saved = localStorage.getItem(`${LOCAL_STORAGE_KEY}_categories`);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          const cleaned = parsed.filter((c: any) => c.id !== 'pc-software' && c.slug !== 'pc-software');
          return cleaned.map(c => {
            if (!c.tags || !Array.isArray(c.tags)) {
              const defaultCat = initialCategories.find(ic => ic.id === c.id || ic.slug === c.slug);
              return { ...c, tags: defaultCat?.tags || [] };
            }
            return c;
          });
        }
      }
      return initialCategories;
    } catch (e) {
      return initialCategories;
    }
  });

  const [siteSettings, setSiteSettings] = useState<SiteSettings>(() => {
    try {
      const saved = localStorage.getItem(`${LOCAL_STORAGE_KEY}_settings`);
      if (saved) {
        const parsed = JSON.parse(saved);
        return {
          ...initialSiteSettings,
          ...parsed,
          socialButtons: parsed.socialButtons && Array.isArray(parsed.socialButtons) && parsed.socialButtons.length > 0
            ? parsed.socialButtons
            : initialSocialButtons
        };
      }
      return initialSiteSettings;
    } catch (e) {
      return initialSiteSettings;
    }
  });

  const [homepageBuilder, setHomepageBuilder] = useState<HomepageBuilderSettings>(() => {
    try {
      const saved = localStorage.getItem(`${LOCAL_STORAGE_KEY}_homepage`);
      return saved ? JSON.parse(saved) : initialHomepageBuilder;
    } catch (e) {
      return initialHomepageBuilder;
    }
  });

  const [splashSettings, setSplashSettings] = useState<SplashLoaderSettings>(() => {
    try {
      const saved = localStorage.getItem(`${LOCAL_STORAGE_KEY}_splash`);
      return saved ? JSON.parse(saved) : initialSplashSettings;
    } catch (e) {
      return initialSplashSettings;
    }
  });

  const [mobileNavSettings, setMobileNavSettings] = useState<MobileNavSettings>(() => {
    try {
      const saved = localStorage.getItem(`${LOCAL_STORAGE_KEY}_mobilenav`);
      return saved ? JSON.parse(saved) : initialMobileNavSettings;
    } catch (e) {
      return initialMobileNavSettings;
    }
  });

  const [ads, setAds] = useState<Advertisement[]>(() => {
    try {
      const saved = localStorage.getItem(`${LOCAL_STORAGE_KEY}_ads`);
      return saved ? JSON.parse(saved) : initialAds;
    } catch (e) {
      return initialAds;
    }
  });

  const [seo, setSeo] = useState<SEOConfig>(() => {
    try {
      const saved = localStorage.getItem(`${LOCAL_STORAGE_KEY}_seo`);
      return saved ? JSON.parse(saved) : initialSEO;
    } catch (e) {
      return initialSEO;
    }
  });

  const [analytics, setAnalytics] = useState<AnalyticsData>(() => {
    try {
      const saved = localStorage.getItem(`${LOCAL_STORAGE_KEY}_analytics`);
      return saved ? JSON.parse(saved) : initialAnalytics;
    } catch (e) {
      return initialAnalytics;
    }
  });

  const [inquiries, setInquiries] = useState<Inquiry[]>(() => {
    try {
      const saved = localStorage.getItem(`${LOCAL_STORAGE_KEY}_inquiries`);
      return saved ? JSON.parse(saved) : initialInquiries;
    } catch (e) {
      return initialInquiries;
    }
  });

  const [contactSettings, setContactSettings] = useState<ContactPageSettings>(() => {
    try {
      const saved = localStorage.getItem(`${LOCAL_STORAGE_KEY}_contact_settings`);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (!parsed.categories || !Array.isArray(parsed.categories) || parsed.categories.length === 0) {
          parsed.categories = DEFAULT_CONTACT_CATEGORIES;
        }
        return parsed;
      }
      return initialContactSettings;
    } catch (e) {
      return initialContactSettings;
    }
  });

  const [floatingButtonsSettings, setFloatingButtonsSettings] = useState<FloatingButtonsSettings>(() => {
    try {
      const saved = localStorage.getItem(`${LOCAL_STORAGE_KEY}_floating_buttons`);
      return saved ? JSON.parse(saved) : initialFloatingButtonsSettings;
    } catch (e) {
      return initialFloatingButtonsSettings;
    }
  });

  // Router Hooks
  const navigate = useNavigate();
  const location = useLocation();

  // Helper to inspect initial URL before first render
  const getInitialPath = (): string => {
    if (typeof window === 'undefined') return '/';
    
    // Check query params for admin switch
    try {
      const searchParams = new URLSearchParams(window.location.search);
      if (searchParams.get('admin') === 'true' || searchParams.get('tab') === 'admin') {
        return '/admin';
      }
    } catch {}

    let p = window.location.pathname.toLowerCase();
    if (window.location.hash && window.location.hash.startsWith('#')) {
      const hp = window.location.hash.replace('#', '').toLowerCase();
      if (hp === 'admin' || hp === '/admin') return '/admin';
      if (hp && hp.startsWith('/')) p = hp;
      else if (hp) p = '/' + hp;
    }
    if (p.length > 1 && p.endsWith('/')) {
      p = p.slice(0, -1);
    }
    return p || '/';
  };

  const initialPath = getInitialPath();

  // Admin & Navigation States initialized from URL
  const [isAdminOpen, setIsAdminOpenState] = useState<boolean>(() => {
    const isAdminPath = (p: string) =>
      p === '/admin' || p === 'admin' ||
      p === '/admin-login' || p === 'admin-login' ||
      p === '/admin/login' || p === 'admin/login';
    return isAdminPath(initialPath);
  });

  const [isVerifyEmailPageOpen, setIsVerifyEmailPageOpenState] = useState<boolean>(() => {
    return initialPath === '/verify-email' || initialPath === 'verify-email';
  });

  const [selectedCategory, setSelectedCategoryState] = useState<ResourceCategory | 'all'>(() => {
    if (initialPath.startsWith('/category/')) {
      const cat = initialPath.replace('/category/', '') as ResourceCategory;
      return cat || 'all';
    }
    return 'all';
  });

  const [isSearchModalOpen, setIsSearchModalOpenState] = useState<boolean>(() => {
    return initialPath === '/search' || initialPath === 'search';
  });

  const [isContactModalOpen, setIsContactModalOpenState] = useState<boolean>(() => {
    return initialPath === '/contact' || initialPath === 'contact';
  });

  const [searchQuery, setSearchQuery] = useState<string>('');
  const [activeTag, setActiveTag] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<'latest' | 'trending' | 'downloads' | 'title'>('latest');

  // Modals & Navigation
  const [activeResourceModal, setActiveResourceModalState] = useState<Resource | null>(null);
  const [telegramDownloadModalResource, setTelegramDownloadModalResource] = useState<Resource | null>(null);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState<boolean>(false);
  const [isNotificationOpen, setIsNotificationOpen] = useState<boolean>(false);

  // 404 Route state
  const [isNotFound, setIsNotFound] = useState<boolean>(false);

  // Synchronize React state FROM browser URL address bar
  useEffect(() => {
    let path = location.pathname.toLowerCase();
    if (location.hash && location.hash.startsWith('#')) {
      const hp = location.hash.replace('#', '').toLowerCase();
      if (hp === 'admin' || hp === '/admin') path = '/admin';
      else if (hp && hp.startsWith('/')) path = hp;
      else if (hp) path = '/' + hp;
    }

    // Inspect window query params for deep linking admin
    if (typeof window !== 'undefined') {
      try {
        const searchParams = new URLSearchParams(window.location.search);
        if (searchParams.get('admin') === 'true' || searchParams.get('tab') === 'admin') {
          path = '/admin';
        }
        if (window.location.hash === '#admin' || window.location.hash === '#/admin') {
          path = '/admin';
        }
      } catch {}
    }

    if (path.length > 1 && path.endsWith('/')) {
      path = path.slice(0, -1);
    }

    if (path === '/' || path === '') {
      setSelectedCategoryState('all');
      setIsAdminOpenState(false);
      setIsVerifyEmailPageOpenState(false);
      setIsContactModalOpenState(false);
      setIsSearchModalOpenState(false);
      setActiveResourceModalState(null);
      setIsNotFound(false);
    } else if (path === '/verify-email' || path === 'verify-email') {
      setIsVerifyEmailPageOpenState(true);
      setIsAdminOpenState(false);
      setIsContactModalOpenState(false);
      setIsSearchModalOpenState(false);
      setActiveResourceModalState(null);
      setIsNotFound(false);
    } else if (
      path === '/admin' || path === 'admin' ||
      path === '/admin-login' || path === 'admin-login' ||
      path === '/admin/login' || path === 'admin/login'
    ) {
      setIsAdminOpenState(true);
      setIsVerifyEmailPageOpenState(false);
      setIsContactModalOpenState(false);
      setIsSearchModalOpenState(false);
      setActiveResourceModalState(null);
      setIsNotFound(false);
    } else if (path === '/contact' || path === 'contact') {
      setIsContactModalOpenState(true);
      setIsVerifyEmailPageOpenState(false);
      setIsAdminOpenState(false);
      setIsSearchModalOpenState(false);
      setActiveResourceModalState(null);
      setIsNotFound(false);
    } else if (path === '/search' || path === 'search') {
      setIsSearchModalOpenState(true);
      setIsVerifyEmailPageOpenState(false);
      setIsAdminOpenState(false);
      setIsContactModalOpenState(false);
      setActiveResourceModalState(null);
      setIsNotFound(false);
    } else if (path.startsWith('/category/')) {
      const catId = path.replace('/category/', '') as ResourceCategory;
      const matchedCat = categories.find(c => c.id.toLowerCase() === catId.toLowerCase() || c.slug.toLowerCase() === catId.toLowerCase());
      if (matchedCat || categories.length === 0) {
        setSelectedCategoryState(matchedCat ? matchedCat.id : catId);
        setIsAdminOpenState(false);
        setIsVerifyEmailPageOpenState(false);
        setIsContactModalOpenState(false);
        setIsSearchModalOpenState(false);
        setActiveResourceModalState(null);
        setIsNotFound(false);
      } else {
        setIsNotFound(true);
      }
    } else if (path.startsWith('/product/')) {
      const prodId = path.replace('/product/', '');
      setIsAdminOpenState(false);
      setIsVerifyEmailPageOpenState(false);
      setIsContactModalOpenState(false);
      setIsSearchModalOpenState(false);
      const found = resources.find(r => r.id.toLowerCase() === prodId);
      if (found) {
        setActiveResourceModalState(found);
        setIsNotFound(false);
      } else if (resources.length > 0) {
        setIsNotFound(true);
      }
    } else {
      setIsNotFound(true);
    }
  }, [location.pathname, location.hash, resources, categories]);

  // Synchronize browser URL address bar FROM user interaction actions
  const setSelectedCategory = (cat: ResourceCategory | 'all') => {
    setSelectedCategoryState(cat);
    setIsAdminOpenState(false);
    setIsVerifyEmailPageOpenState(false);
    setIsContactModalOpenState(false);
    setIsSearchModalOpenState(false);
    setActiveResourceModalState(null);
    setIsNotFound(false);

    if (cat === 'all') {
      navigate('/');
    } else {
      navigate(`/category/${cat}`);
    }
  };

  const setIsAdminOpen = (open: boolean) => {
    setIsAdminOpenState(open);
    setIsNotFound(false);
    if (open) {
      setIsVerifyEmailPageOpenState(false);
      setIsContactModalOpenState(false);
      setIsSearchModalOpenState(false);
      setActiveResourceModalState(null);
      navigate('/admin');
    } else {
      navigate(selectedCategory === 'all' ? '/' : `/category/${selectedCategory}`);
    }
  };

  const setIsVerifyEmailPageOpen = (open: boolean) => {
    setIsVerifyEmailPageOpenState(open);
    setIsNotFound(false);
    if (open) {
      setIsAdminOpenState(false);
      setIsContactModalOpenState(false);
      setIsSearchModalOpenState(false);
      setActiveResourceModalState(null);
      navigate('/verify-email');
    } else {
      navigate(selectedCategory === 'all' ? '/' : `/category/${selectedCategory}`);
    }
  };

  const setActiveResourceModal = (r: Resource | null) => {
    setActiveResourceModalState(r);
    setIsNotFound(false);

    if (r) {
      navigate(`/product/${r.id}`);
    } else {
      if (isAdminOpen) {
        navigate('/admin');
      } else if (selectedCategory !== 'all') {
        navigate(`/category/${selectedCategory}`);
      } else {
        navigate('/');
      }
    }
  };

  const setIsContactModalOpen = (open: boolean) => {
    setIsContactModalOpenState(open);
    setIsNotFound(false);

    if (open) {
      navigate('/contact');
    } else {
      if (isAdminOpen) {
        navigate('/admin');
      } else if (selectedCategory !== 'all') {
        navigate(`/category/${selectedCategory}`);
      } else {
        navigate('/');
      }
    }
  };

  const setIsSearchModalOpen = (open: boolean) => {
    setIsSearchModalOpenState(open);
    setIsNotFound(false);

    if (open) {
      navigate('/search');
    } else {
      if (isAdminOpen) {
        navigate('/admin');
      } else if (selectedCategory !== 'all') {
        navigate(`/category/${selectedCategory}`);
      } else {
        navigate('/');
      }
    }
  };


  // Splash Loader visibility logic
  const [isSplashLoaderVisible, setIsSplashLoaderVisible] = useState<boolean>(() => {
    if (!splashSettings.enabled) return false;
    if (splashSettings.showOnlyFirstVisit) {
      const hasVisited = sessionStorage.getItem('OTL_VISITED');
      if (hasVisited) return false;
      sessionStorage.setItem('OTL_VISITED', 'true');
    }
    return true;
  });

  // Toast System
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage(null);
    }, 3000);
  };

  // Firestore Real-Time Subscriptions
  useEffect(() => {
    // 1. Inquiries subscription (only if admin panel is open or admin authenticated)
    let unsubInquiries = () => {};
    const hasAdminCreds = isAdminOpen || (typeof window !== 'undefined' && localStorage.getItem('otl_admin_authenticated') === 'true');
    if (hasAdminCreds) {
      try {
        const qInquiries = query(collection(db, 'inquiries'));
        unsubInquiries = onSnapshot(qInquiries, (snapshot) => {
          if (!snapshot.empty) {
            const inqs: Inquiry[] = [];
            snapshot.forEach(docSnap => {
              inqs.push({ id: docSnap.id, ...docSnap.data() } as Inquiry);
            });
            setInquiries(inqs);
          }
        }, () => {
          // Gracefully suppress permission warning for non-admin viewers
        });
      } catch {}
    }

    // 2. Resources subscription
    const qResources = query(collection(db, 'resources'));
    const unsubResources = onSnapshot(qResources, (snapshot) => {
      const resList: Resource[] = [];
      if (!snapshot.empty) {
        snapshot.forEach(docSnap => {
          const data = docSnap.data();
          if (docSnap.id.startsWith('pc-') || data.category === 'pc-software' || (data.tags && Array.isArray(data.tags) && data.tags.includes('PC Software'))) {
            // Delete old pc-software item from Firestore
            deleteDoc(doc(db, 'resources', docSnap.id)).catch(() => {});
          } else {
            const resItem = { id: docSnap.id, ...data } as Resource;
            if (resItem.category === 'lr-presets' && (!resItem.presetGallery || resItem.presetGallery.length === 0)) {
              const init = initialResources.find(ir => ir.id === resItem.id);
              if (init?.presetGallery) {
                resItem.presetGallery = init.presetGallery;
              }
            }
            resList.push(resItem);
          }
        });
      }

      let finalResources: Resource[] = [];
      if (resList.length === 0) {
        // First run on empty database: seed default catalog
        initialResources.forEach((res) => {
          setDoc(doc(db, 'resources', res.id), res, { merge: true }).catch(() => {});
        });
        finalResources = initialResources;
      } else {
        finalResources = resList;
      }
      setResources(finalResources);
      // Auto-reconcile with RAG knowledge base
      supportService.reconcileWebsiteSync(finalResources).catch(err => {
        console.warn('[RAG Auto-Reconcile] Notice:', err);
      });
    }, (err) => {
      console.warn('Firestore resources error:', err);
      setResources(initialResources);
      supportService.reconcileWebsiteSync(initialResources).catch(() => {});
    });

    // 3. Global Settings subscription
    const unsubSettings = onSnapshot(doc(db, 'settings', 'global'), (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        if (data.siteSettings) {
          setSiteSettings({
            ...initialSiteSettings,
            ...data.siteSettings,
            socialButtons: data.siteSettings.socialButtons && Array.isArray(data.siteSettings.socialButtons) && data.siteSettings.socialButtons.length > 0
              ? data.siteSettings.socialButtons
              : initialSocialButtons
          });
        }
        if (data.homepageBuilder) setHomepageBuilder(data.homepageBuilder);
        if (data.contactSettings) {
          const cSettings = data.contactSettings;
          if (!cSettings.categories || !Array.isArray(cSettings.categories) || cSettings.categories.length === 0) {
            cSettings.categories = DEFAULT_CONTACT_CATEGORIES;
          }
          setContactSettings(cSettings);
        }
        if (data.floatingButtonsSettings) setFloatingButtonsSettings(data.floatingButtonsSettings);
        if (data.categories && Array.isArray(data.categories)) {
          const cleanedCats = data.categories.filter((c: any) => c.id !== 'pc-software' && c.slug !== 'pc-software').map((c: any) => {
            if (!c.tags || !Array.isArray(c.tags)) {
              const defaultCat = initialCategories.find(ic => ic.id === c.id || ic.slug === c.slug);
              return { ...c, tags: defaultCat?.tags || [] };
            }
            return c;
          });
          setCategories(cleanedCats);
          if (cleanedCats.length !== data.categories.length) {
            setDoc(doc(db, 'settings', 'global'), { categories: cleanedCats }, { merge: true }).catch(() => {});
          }
        }
        if (data.ads) setAds(data.ads);
        if (data.seo) setSeo(data.seo);
        if (data.analytics) setAnalytics(data.analytics);
      }
    }, (err) => console.warn('Firestore settings error:', err));

    return () => {
      unsubInquiries();
      unsubResources();
      unsubSettings();
    };
  }, []);

  // Sync state to local storage as fallback
  useEffect(() => {
    localStorage.setItem(`${LOCAL_STORAGE_KEY}_resources`, JSON.stringify(resources));
  }, [resources]);

  useEffect(() => {
    localStorage.setItem(`${LOCAL_STORAGE_KEY}_categories`, JSON.stringify(categories));
  }, [categories]);

  useEffect(() => {
    localStorage.setItem(`${LOCAL_STORAGE_KEY}_settings`, JSON.stringify(siteSettings));
  }, [siteSettings]);

  useEffect(() => {
    localStorage.setItem(`${LOCAL_STORAGE_KEY}_homepage`, JSON.stringify(homepageBuilder));
  }, [homepageBuilder]);

  useEffect(() => {
    localStorage.setItem(`${LOCAL_STORAGE_KEY}_splash`, JSON.stringify(splashSettings));
  }, [splashSettings]);

  useEffect(() => {
    localStorage.setItem(`${LOCAL_STORAGE_KEY}_mobilenav`, JSON.stringify(mobileNavSettings));
  }, [mobileNavSettings]);

  useEffect(() => {
    localStorage.setItem(`${LOCAL_STORAGE_KEY}_ads`, JSON.stringify(ads));
  }, [ads]);

  useEffect(() => {
    localStorage.setItem(`${LOCAL_STORAGE_KEY}_seo`, JSON.stringify(seo));
  }, [seo]);

  useEffect(() => {
    localStorage.setItem(`${LOCAL_STORAGE_KEY}_analytics`, JSON.stringify(analytics));
  }, [analytics]);

  useEffect(() => {
    localStorage.setItem(`${LOCAL_STORAGE_KEY}_inquiries`, JSON.stringify(inquiries));
  }, [inquiries]);

  useEffect(() => {
    localStorage.setItem(`${LOCAL_STORAGE_KEY}_contact_settings`, JSON.stringify(contactSettings));
  }, [contactSettings]);

  useEffect(() => {
    localStorage.setItem(`${LOCAL_STORAGE_KEY}_floating_buttons`, JSON.stringify(floatingButtonsSettings));
  }, [floatingButtonsSettings]);

  // Initialize Guest Tracking and Profile Lifecycle
  useEffect(() => {
    guestService.initGuestTracking(window.location.pathname).catch(err => {
      console.warn('[AppContext] Guest tracking init warning:', err);
    });
  }, []);

  // Track Page Views and Journey for Anonymous Guests
  useEffect(() => {
    if (location.pathname) {
      guestService.trackPageView(location.pathname).catch(err => {
        console.warn('[AppContext] Track page view warning:', err);
      });
    }
  }, [location.pathname]);

  // Firestore Sync Helper for Settings
  const syncSettingsDoc = async (field: string, value: any) => {
    try {
      await setDoc(doc(db, 'settings', 'global'), { [field]: value }, { merge: true });
    } catch (err) {
      console.error(`Error updating Firestore settings.${field}:`, err);
    }
  };

  // Analytics helper functions
  const recordDownload = (resourceId: string) => {
    guestService.trackEvent('download_click', { resourceId });
    setResources(prev =>
      prev.map(r => (r.id === resourceId ? { ...r, downloadsCount: r.downloadsCount + 1 } : r))
    );
    setAnalytics(prev => {
      const next = { ...prev, totalDownloads: prev.totalDownloads + 1 };
      syncSettingsDoc('analytics', next);
      return next;
    });
    const target = resources.find(r => r.id === resourceId);
    if (target) {
      setDoc(doc(db, 'resources', resourceId), { downloadsCount: (target.downloadsCount || 0) + 1 }, { merge: true }).catch(() => {});
    }
  };

  const recordTelegramClick = (resourceId?: string) => {
    guestService.trackEvent('telegram_click', { resourceId });
    if (resourceId) {
      setResources(prev =>
        prev.map(r => (r.id === resourceId ? { ...r, telegramClicksCount: r.telegramClicksCount + 1 } : r))
      );
      const target = resources.find(r => r.id === resourceId);
      if (target) {
        setDoc(doc(db, 'resources', resourceId), { telegramClicksCount: (target.telegramClicksCount || 0) + 1 }, { merge: true }).catch(() => {});
      }
    }
    setAnalytics(prev => {
      const next = { ...prev, telegramClicks: prev.telegramClicks + 1 };
      syncSettingsDoc('analytics', next);
      return next;
    });
  };

  // Resource Actions
  const addResource = async (newResData: Omit<Resource, 'id' | 'createdAt' | 'downloadsCount' | 'telegramClicksCount'>) => {
    const id = `res-${Date.now()}`;
    const newRes: Resource = {
      ...newResData,
      id,
      createdAt: new Date().toISOString().split('T')[0],
      downloadsCount: 0,
      telegramClicksCount: 0
    };
    setResources(prev => [newRes, ...prev]);
    showToast(`Added new resource: ${newRes.title}`);
    try {
      await setDoc(doc(db, 'resources', id), newRes);
    } catch (err) {
      console.error('Error saving resource to Firestore:', err);
    } finally {
      // Automatic RAG Knowledge Base Sync
      supportService.notifyResourceUpdate('create', newRes).catch(err => {
        console.warn('[RAG Auto-Sync] Create notification warning:', err);
      });
    }
  };

  const updateResource = async (id: string, updated: Partial<Resource>) => {
    let fullUpdatedResource: Resource | undefined;
    setResources(prev => {
      const next = prev.map(r => {
        if (r.id === id) {
          fullUpdatedResource = { ...r, ...updated };
          return fullUpdatedResource;
        }
        return r;
      });
      return next;
    });
    showToast('Resource updated successfully!');
    try {
      await setDoc(doc(db, 'resources', id), updated, { merge: true });
    } catch (err) {
      console.error('Error updating resource in Firestore:', err);
    } finally {
      // Automatic RAG Knowledge Base Sync
      if (fullUpdatedResource) {
        supportService.notifyResourceUpdate('update', fullUpdatedResource).catch(err => {
          console.warn('[RAG Auto-Sync] Update notification warning:', err);
        });
      }
    }
  };

  const deleteResource = async (id: string) => {
    const target = resources.find(r => r.id === id);
    setResources(prev => prev.filter(r => r.id !== id));
    showToast('Resource deleted.');
    try {
      await deleteDoc(doc(db, 'resources', id));
    } catch (err) {
      console.error('Error deleting resource from Firestore:', err);
    } finally {
      // Automatic RAG Knowledge Base Sync
      supportService.notifyResourceUpdate('delete', target || { id }).catch(err => {
        console.warn('[RAG Auto-Sync] Delete notification warning:', err);
      });
    }
  };

  const cloneResource = async (id: string) => {
    const found = resources.find(r => r.id === id);
    if (!found) return;
    const cloneId = `res-${Date.now()}`;
    const clone: Resource = {
      ...found,
      id: cloneId,
      title: `${found.title} (Copy)`,
      createdAt: new Date().toISOString().split('T')[0],
      downloadsCount: 0,
      telegramClicksCount: 0
    };
    setResources(prev => [clone, ...prev]);
    showToast(`Cloned resource: ${clone.title}`);
    try {
      await setDoc(doc(db, 'resources', cloneId), clone);
    } catch (err) {
      console.error('Error cloning resource to Firestore:', err);
    } finally {
      // Automatic RAG Knowledge Base Sync
      supportService.notifyResourceUpdate('create', clone).catch(err => {
        console.warn('[RAG Auto-Sync] Clone notification warning:', err);
      });
    }
  };

  // Category Actions
  const updateCategory = (id: ResourceCategory, updated: Partial<CategoryItem>) => {
    let updatedCat: CategoryItem | undefined;
    setCategories(prev => {
      const next = prev.map(c => {
        if (c.id === id) {
          updatedCat = { ...c, ...updated };
          return updatedCat;
        }
        return c;
      });
      syncSettingsDoc('categories', next);
      return next;
    });
    showToast('Category updated.');
    if (updatedCat) {
      supportService.notifyContentUpdate('category', 'update', updatedCat).catch(err => {
        console.warn('[RAG Auto-Sync] Category update notification warning:', err);
      });
    }
  };

  const addCategory = (cat: CategoryItem) => {
    setCategories(prev => {
      const next = [...prev, cat];
      syncSettingsDoc('categories', next);
      return next;
    });
    showToast(`Added category: ${cat.name}`);
    supportService.notifyContentUpdate('category', 'create', cat).catch(err => {
      console.warn('[RAG Auto-Sync] Category add notification warning:', err);
    });
  };

  const deleteCategory = (id: string) => {
    setCategories(prev => {
      const next = prev.filter(c => c.id !== id);
      syncSettingsDoc('categories', next);
      return next;
    });
    showToast('Category removed.');
    supportService.notifyContentUpdate('category', 'delete', { id }).catch(err => {
      console.warn('[RAG Auto-Sync] Category delete notification warning:', err);
    });
  };

  // Settings Actions
  const updateSiteSettings = (settings: Partial<SiteSettings>) => {
    setSiteSettings(prev => {
      const next = { ...prev, ...settings };
      syncSettingsDoc('siteSettings', next);
      return next;
    });
    showToast('Website Settings Saved!');
  };

  const updateHomepageBuilder = (builder: Partial<HomepageBuilderSettings>) => {
    setHomepageBuilder(prev => {
      const next = { ...prev, ...builder };
      syncSettingsDoc('homepageBuilder', next);
      return next;
    });
    showToast('Homepage Layout Saved!');
  };

  const updateSplashSettings = (splash: Partial<SplashLoaderSettings>) => {
    setSplashSettings(prev => {
      const next = { ...prev, ...splash };
      syncSettingsDoc('splashSettings', next);
      return next;
    });
    showToast('Splash Loader Settings Saved!');
  };

  const updateMobileNavSettings = (mobileNav: Partial<MobileNavSettings>) => {
    setMobileNavSettings(prev => {
      const next = { ...prev, ...mobileNav };
      syncSettingsDoc('mobileNavSettings', next);
      return next;
    });
    showToast('Mobile Navigation Settings Saved!');
  };

  const updateAds = (newAds: Advertisement[]) => {
    setAds(newAds);
    syncSettingsDoc('ads', newAds);
    showToast('Advertisements Saved!');
  };

  const updateSEO = (newSeo: Partial<SEOConfig>) => {
    setSeo(prev => {
      const next = { ...prev, ...newSeo };
      syncSettingsDoc('seo', next);
      return next;
    });
    showToast('SEO Configuration Saved!');
  };

  // Inquiry & Contact Manager Handlers (Chats / User inputs)
  const addInquiry = async (inquiryData: Omit<Inquiry, 'id' | 'createdAt' | 'status'>) => {
    const id = `inq-${Date.now()}`;
    const newInquiry: Inquiry = {
      ...inquiryData,
      id,
      createdAt: new Date().toISOString().split('T')[0],
      status: 'unread'
    };
    setInquiries(prev => [newInquiry, ...prev]);
    showToast('Your message has been sent and saved to Firebase!');
    guestService.trackEvent('inquiry_submitted', { details: `Inquiry ID: ${id}, Cat: ${inquiryData.category}` });
    try {
      await setDoc(doc(db, 'inquiries', id), newInquiry);
    } catch (err) {
      console.error('Error saving inquiry/message to Firestore:', err);
    }
  };

  const deleteInquiry = async (id: string) => {
    setInquiries(prev => prev.filter(i => i.id !== id));
    showToast('Inquiry deleted.');
    try {
      await deleteDoc(doc(db, 'inquiries', id));
    } catch (err) {
      console.error('Error deleting inquiry from Firestore:', err);
    }
  };

  const updateInquiryStatus = async (id: string, status: 'unread' | 'read' | 'replied' | 'in_progress' | 'resolved') => {
    setInquiries(prev => prev.map(i => (i.id === id ? { ...i, status } : i)));
    try {
      await setDoc(doc(db, 'inquiries', id), { status }, { merge: true });
    } catch (err) {
      console.error('Error updating inquiry status in Firestore:', err);
    }
  };

  const replyToInquiry = async (id: string, replyText: string, adminName: string = 'Admin') => {
    const adminRepliedAt = new Date().toISOString();
    const adminRepliedBy = adminName;
    const status = 'replied';

    setInquiries(prev =>
      prev.map(i =>
        i.id === id
          ? {
              ...i,
              adminReply: replyText,
              adminRepliedAt,
              adminRepliedBy,
              status
            }
          : i
      )
    );
    showToast('Admin reply sent to user!');
    try {
      await setDoc(
        doc(db, 'inquiries', id),
        {
          adminReply: replyText,
          adminRepliedAt,
          adminRepliedBy,
          status
        },
        { merge: true }
      );
    } catch (err) {
      console.error('Error saving admin reply to Firestore:', err);
    }
  };

  const updateContactSettings = (settings: Partial<ContactPageSettings>) => {
    setContactSettings(prev => {
      const next = { ...prev, ...settings };
      syncSettingsDoc('contactSettings', next);
      return next;
    });
    showToast('Contact Page Settings Updated!');
  };

  const addSocialButton = (btn: Omit<SocialButton, 'id'>) => {
    const newBtn: SocialButton = {
      ...btn,
      id: `soc-${Date.now()}`
    };
    setContactSettings(prev => {
      const next = { ...prev, socialButtons: [...prev.socialButtons, newBtn] };
      syncSettingsDoc('contactSettings', next);
      return next;
    });
    showToast(`Added ${newBtn.title} social button!`);
  };

  const updateSocialButton = (id: string, updated: Partial<SocialButton>) => {
    setContactSettings(prev => {
      const next = {
        ...prev,
        socialButtons: prev.socialButtons.map(b => (b.id === id ? { ...b, ...updated } : b))
      };
      syncSettingsDoc('contactSettings', next);
      return next;
    });
    showToast('Social button updated.');
  };

  const deleteSocialButton = (id: string) => {
    setContactSettings(prev => {
      const next = {
        ...prev,
        socialButtons: prev.socialButtons.filter(b => b.id !== id)
      };
      syncSettingsDoc('contactSettings', next);
      return next;
    });
    showToast('Social button removed.');
  };

  const addFaq = (faq: Omit<FAQItem, 'id'>) => {
    const newFaq: FAQItem = {
      ...faq,
      id: `faq-${Date.now()}`
    };
    setContactSettings(prev => {
      const next = { ...prev, faqs: [...prev.faqs, newFaq] };
      syncSettingsDoc('contactSettings', next);
      return next;
    });
    showToast('New FAQ added.');
    supportService.notifyContentUpdate('faq', 'create', newFaq).catch(() => {});
  };

  const updateFaq = (id: string, updated: Partial<FAQItem>) => {
    let updatedItem: FAQItem | undefined;
    setContactSettings(prev => {
      const next = {
        ...prev,
        faqs: prev.faqs.map(f => {
          if (f.id === id) {
            updatedItem = { ...f, ...updated };
            return updatedItem;
          }
          return f;
        })
      };
      syncSettingsDoc('contactSettings', next);
      return next;
    });
    showToast('FAQ updated.');
    if (updatedItem) {
      supportService.notifyContentUpdate('faq', 'update', updatedItem).catch(() => {});
    }
  };

  const deleteFaq = (id: string) => {
    setContactSettings(prev => {
      const next = {
        ...prev,
        faqs: prev.faqs.filter(f => f.id !== id)
      };
      syncSettingsDoc('contactSettings', next);
      return next;
    });
    showToast('FAQ removed.');
    supportService.notifyContentUpdate('faq', 'delete', { id }).catch(() => {});
  };

  // Contact Categories Handlers
  const addContactCategory = (cat: Omit<ContactCategoryItem, 'id'>) => {
    setContactSettings(prev => {
      const currentCats = prev.categories && prev.categories.length > 0 ? prev.categories : DEFAULT_CONTACT_CATEGORIES;
      const maxOrder = currentCats.length > 0 ? Math.max(...currentCats.map(c => c.order || 0)) : 0;
      const newId = `cat_${Date.now()}`;
      const emoji = cat.emoji || '💬';
      const cleanName = cat.name || cat.label.replace(/^[^\w\s\u0980-\u09FF]+\s*/, '').trim();
      const label = cat.label || `${emoji} ${cleanName}`;
      
      const newCategory: ContactCategoryItem = {
        id: newId,
        label,
        emoji,
        name: cleanName,
        enabled: cat.enabled !== undefined ? cat.enabled : true,
        order: cat.order || maxOrder + 1
      };

      const next = {
        ...prev,
        categories: [...currentCats, newCategory]
      };
      syncSettingsDoc('contactSettings', next);
      return next;
    });
    showToast('New Inquiry Category added!');
  };

  const updateContactCategory = (id: string, updated: Partial<ContactCategoryItem>) => {
    setContactSettings(prev => {
      const currentCats = prev.categories && prev.categories.length > 0 ? prev.categories : DEFAULT_CONTACT_CATEGORIES;
      const updatedCats = currentCats.map(c => {
        if (c.id === id) {
          const merged = { ...c, ...updated };
          if (updated.emoji || updated.name) {
            const emoji = updated.emoji || merged.emoji || '💬';
            const name = updated.name || merged.name || merged.label.replace(/^[^\w\s\u0980-\u09FF]+\s*/, '').trim();
            merged.emoji = emoji;
            merged.name = name;
            merged.label = `${emoji} ${name}`;
          }
          return merged;
        }
        return c;
      });

      const next = {
        ...prev,
        categories: updatedCats
      };
      syncSettingsDoc('contactSettings', next);
      return next;
    });
    showToast('Inquiry Category updated!');
  };

  const deleteContactCategory = (id: string) => {
    setContactSettings(prev => {
      const currentCats = prev.categories && prev.categories.length > 0 ? prev.categories : DEFAULT_CONTACT_CATEGORIES;
      const next = {
        ...prev,
        categories: currentCats.filter(c => c.id !== id)
      };
      syncSettingsDoc('contactSettings', next);
      return next;
    });
    showToast('Inquiry Category deleted.');
  };

  const reorderContactCategories = (newCategories: ContactCategoryItem[]) => {
    setContactSettings(prev => {
      const next = {
        ...prev,
        categories: newCategories
      };
      syncSettingsDoc('contactSettings', next);
      return next;
    });
    showToast('Category ordering saved.');
  };

  const resetContactCategories = () => {
    setContactSettings(prev => {
      const next = {
        ...prev,
        categories: DEFAULT_CONTACT_CATEGORIES
      };
      syncSettingsDoc('contactSettings', next);
      return next;
    });
    showToast('Inquiry Categories reset to defaults.');
  };

  // Floating Buttons Actions
  const updateFloatingButtonsSettings = (settings: Partial<FloatingButtonsSettings>) => {
    setFloatingButtonsSettings(prev => {
      const next = { ...prev, ...settings };
      syncSettingsDoc('floatingButtonsSettings', next);
      return next;
    });
    showToast('Floating Buttons Settings Updated!');
  };

  const addFloatingButton = (btn: Omit<FloatingButton, 'id' | 'order'>) => {
    setFloatingButtonsSettings(prev => {
      const maxOrder = prev.buttons.length > 0 ? Math.max(...prev.buttons.map(b => b.order || 0)) : 0;
      const newBtn: FloatingButton = {
        ...btn,
        id: `fb-${Date.now()}`,
        order: maxOrder + 1
      };
      const next = {
        ...prev,
        buttons: [...prev.buttons, newBtn]
      };
      syncSettingsDoc('floatingButtonsSettings', next);
      return next;
    });
    showToast('New floating button added!');
  };

  const updateFloatingButton = (id: string, updated: Partial<FloatingButton>) => {
    setFloatingButtonsSettings(prev => {
      const next = {
        ...prev,
        buttons: prev.buttons.map(b => (b.id === id ? { ...b, ...updated } : b))
      };
      syncSettingsDoc('floatingButtonsSettings', next);
      return next;
    });
    showToast('Floating button updated!');
  };

  const deleteFloatingButton = (id: string) => {
    setFloatingButtonsSettings(prev => {
      const next = {
        ...prev,
        buttons: prev.buttons.filter(b => b.id !== id)
      };
      syncSettingsDoc('floatingButtonsSettings', next);
      return next;
    });
    showToast('Floating button removed!');
  };

  const moveFloatingButton = (id: string, direction: 'up' | 'down') => {
    setFloatingButtonsSettings(prev => {
      const sorted = [...prev.buttons].sort((a, b) => a.order - b.order);
      const index = sorted.findIndex(b => b.id === id);
      if (index === -1) return prev;

      const targetIndex = direction === 'up' ? index - 1 : index + 1;
      if (targetIndex < 0 || targetIndex >= sorted.length) return prev;

      // Swap order properties
      const tempOrder = sorted[index].order;
      sorted[index].order = sorted[targetIndex].order;
      sorted[targetIndex].order = tempOrder;

      const next = {
        ...prev,
        buttons: sorted
      };
      syncSettingsDoc('floatingButtonsSettings', next);
      return next;
    });
    showToast(`Moved button ${direction === 'up' ? 'towards top' : 'towards bottom'}`);
  };

  const resetToDefaults = () => {
    setResources(initialResources);
    setCategories(initialCategories);
    setSiteSettings(initialSiteSettings);
    setHomepageBuilder(initialHomepageBuilder);
    setSplashSettings(initialSplashSettings);
    setMobileNavSettings(initialMobileNavSettings);
    setAds(initialAds);
    setSeo(initialSEO);
    setAnalytics(initialAnalytics);
    setInquiries(initialInquiries);
    setContactSettings(initialContactSettings);
    setFloatingButtonsSettings(initialFloatingButtonsSettings);

    // Push initial resources & configurations to Firestore
    initialResources.forEach((res) => {
      setDoc(doc(db, 'resources', res.id), res, { merge: true }).catch(() => {});
    });
    syncSettingsDoc('categories', initialCategories);
    syncSettingsDoc('siteSettings', initialSiteSettings);
    syncSettingsDoc('homepageBuilder', initialHomepageBuilder);
    syncSettingsDoc('splashSettings', initialSplashSettings);
    syncSettingsDoc('mobileNavSettings', initialMobileNavSettings);
    syncSettingsDoc('ads', initialAds);
    syncSettingsDoc('seo', initialSEO);
    syncSettingsDoc('analytics', initialAnalytics);
    syncSettingsDoc('contactSettings', initialContactSettings);
    syncSettingsDoc('floatingButtonsSettings', initialFloatingButtonsSettings);

    showToast('All settings & demo products reset to default content!');
  };

  const triggerSplashLoaderPreview = () => {
    setIsSplashLoaderVisible(true);
  };

  return (
    <AppContext.Provider
      value={{
        resources,
        categories,
        siteSettings,
        homepageBuilder,
        splashSettings,
        mobileNavSettings,
        ads,
        seo,
        analytics,
        inquiries,
        contactSettings,
        floatingButtonsSettings,
        selectedCategory,
        setSelectedCategory,
        searchQuery,
        setSearchQuery,
        activeTag,
        setActiveTag,
        sortBy,
        setSortBy,
        activeResourceModal,
        setActiveResourceModal,
        isSearchModalOpen,
        setIsSearchModalOpen,
        isContactModalOpen,
        setIsContactModalOpen,
        isNotificationOpen,
        setIsNotificationOpen,
        telegramDownloadModalResource,
        setTelegramDownloadModalResource,
        isAdminOpen,
        setIsAdminOpen,
        isVerifyEmailPageOpen,
        setIsVerifyEmailPageOpen,
        isMobileSidebarOpen,
        setIsMobileSidebarOpen,
        toastMessage,
        showToast,
        isNotFound,
        recordDownload,
        recordTelegramClick,
        addResource,
        updateResource,
        deleteResource,
        cloneResource,
        updateCategory,
        addCategory,
        deleteCategory,
        updateSiteSettings,
        updateHomepageBuilder,
        updateSplashSettings,
        updateMobileNavSettings,
        updateAds,
        updateSEO,
        addInquiry,
        deleteInquiry,
        updateInquiryStatus,
        replyToInquiry,
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
        resetContactCategories,
        updateFloatingButtonsSettings,
        addFloatingButton,
        updateFloatingButton,
        deleteFloatingButton,
        moveFloatingButton,
        resetToDefaults,
        triggerSplashLoaderPreview,
        isSplashLoaderVisible,
        setIsSplashLoaderVisible
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
};
