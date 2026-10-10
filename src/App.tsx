import React, { useEffect } from 'react';
import { AppProvider, useApp } from './context/AppContext';
import { AuthProvider } from './context/AuthContext';
import { SpaceParticles } from './components/SpaceParticles';
import { SplashLoader } from './components/SplashLoader';
import { Header } from './components/Header';
import { MobileSidebarNav } from './components/MobileSidebarNav';
import { MobileBottomNav } from './components/MobileBottomNav';
import { HeroSection } from './components/HeroSection';
import { CategoryGrid } from './components/CategoryGrid';
import { ResourceFeed } from './components/ResourceFeed';
import { CategoryPage } from './components/CategoryPage';
import { ProductDetailModal } from './components/ProductDetailModal';
import { TelegramModal } from './components/TelegramModal';
import { SearchModal } from './components/SearchModal';
import { ContactModal } from './components/ContactModal';
import { NotificationModal } from './components/NotificationModal';
import { AuthModal } from './components/auth/AuthModal';
import { UserProfileModal } from './components/auth/UserProfileModal';
import { UnauthenticatedReminderModal } from './components/auth/UnauthenticatedReminderModal';
import { NotFoundPage } from './components/NotFoundPage';
import { FloatingTelegramButton } from './components/FloatingTelegramButton';
import { FloatingAISupport } from './components/support/FloatingAISupport';
import { Footer } from './components/Footer';
import { AdminPanel } from './components/admin/AdminPanel';
import { VerifyEmailPage } from './components/VerifyEmailPage';
import { SEOHead } from './components/SEOHead';
import { CustomCursor } from './components/CustomCursor';
import { motion, AnimatePresence } from 'motion/react';
import { CheckCircle2 } from 'lucide-react';

const MainLayout: React.FC = () => {
  const { toastMessage, homepageBuilder, siteSettings, selectedCategory, isAdminOpen, isVerifyEmailPageOpen, isNotFound } = useApp();

  // Dynamically update favicon if configured in admin settings
  useEffect(() => {
    if (siteSettings?.faviconUrl) {
      let favicon = document.querySelector("link[rel*='icon']") as HTMLLinkElement;
      if (!favicon) {
        favicon = document.createElement('link');
        favicon.rel = 'icon';
        document.head.appendChild(favicon);
      }
      favicon.href = siteSettings.faviconUrl;
    }
  }, [siteSettings]);

  // Scroll to top smoothly whenever category or admin page state changes
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [selectedCategory, isAdminOpen, isVerifyEmailPageOpen]);

  return (
    <div className="min-h-screen bg-[#060B1E] text-white flex flex-col relative selection:bg-[#5DE2E7] selection:text-slate-950 font-sans">
      {/* Professional Lightweight Custom Cursor & Click Ripple Layer */}
      <CustomCursor />

      {/* Comprehensive Dynamic SEO and Schema Engine */}
      <SEOHead />

      {/* Space Particle Canvas Backdrop */}
      {homepageBuilder.showHeroParticles && <SpaceParticles density={60} />}

      {/* Splash Screen Loader */}
      <SplashLoader />

      {/* Header Navbar */}
      <Header />

      {/* YouTube Style Mobile Sidebar Navigation */}
      <MobileSidebarNav />

      {/* Main Container */}
      <main className="flex-1 relative z-10 pb-16 md:pb-0">
        {isNotFound ? (
          <NotFoundPage />
        ) : isAdminOpen ? (
          <AdminPanel />
        ) : isVerifyEmailPageOpen ? (
          <VerifyEmailPage />
        ) : selectedCategory === 'all' ? (
          <>
            {/* Hero Section */}
            <HeroSection />

            {/* Featured Categories */}
            {homepageBuilder.showFeaturedCategories && <CategoryGrid />}

            {/* Resources Feed */}
            <ResourceFeed />
          </>
        ) : (
          <CategoryPage />
        )}
      </main>

      {/* Floating Bottom Navigation for Mobile */}
      {!isAdminOpen && <MobileBottomNav />}

      {/* Floating Telegram Action Button (Hidden in Admin Panel) */}
      {!isAdminOpen && <FloatingTelegramButton />}

      {/* Floating Production-Ready AI Support & Live Chat Widget */}
      {!isAdminOpen && <FloatingAISupport />}

      {/* Footer (Hidden in Admin Panel for clean workspace) */}
      {!isAdminOpen && <Footer />}

      {/* Modals & Overlays */}
      <ProductDetailModal />
      <TelegramModal />
      <SearchModal />
      <ContactModal />
      <NotificationModal />
      <AuthModal />
      <UserProfileModal />
      {!isAdminOpen && <UnauthenticatedReminderModal />}

      {/* System Toast Notification */}
      <AnimatePresence>
        {toastMessage && (
          <motion.div
            initial={{ opacity: 0, y: 30, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 30, scale: 0.9 }}
            className="fixed bottom-20 md:bottom-6 left-1/2 -translate-x-1/2 z-[10000] px-5 py-3 rounded-2xl bg-slate-950/90 border border-[#5DE2E7]/60 text-white font-bold text-xs shadow-[0_0_30px_rgba(93,226,231,0.5)] backdrop-blur-xl flex items-center gap-2.5"
          >
            <CheckCircle2 className="w-4 h-4 text-[#5DE2E7]" />
            <span>{toastMessage}</span>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default function App() {
  return (
    <AuthProvider>
      <AppProvider>
        <MainLayout />
      </AppProvider>
    </AuthProvider>
  );
}

