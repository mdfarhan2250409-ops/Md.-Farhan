import React, { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import {
  SITE_ORIGIN,
  BRAND_TITLE_SUFFIX,
  DEFAULT_SEO,
  CATEGORY_SEO_DATA,
  getOrganizationSchema,
  getWebSiteSchema,
  getBreadcrumbSchema,
  getProductSchema
} from '../lib/seoConfig';

/**
 * Helper to update or create a meta tag in document.head
 */
function setMetaTag(selector: string, attrName: string, attrVal: string, content: string) {
  let element = document.querySelector(selector) as HTMLMetaElement | null;
  if (!element) {
    element = document.createElement('meta');
    element.setAttribute(attrName, attrVal);
    document.head.appendChild(element);
  }
  element.setAttribute('content', content);
}

/**
 * Helper to update or create a link tag in document.head
 */
function setLinkTag(rel: string, href: string) {
  let element = document.querySelector(`link[rel="${rel}"]`) as HTMLLinkElement | null;
  if (!element) {
    element = document.createElement('link');
    element.setAttribute('rel', rel);
    document.head.appendChild(element);
  }
  element.setAttribute('href', href);
}

/**
 * Helper to inject or update JSON-LD script
 */
function setJsonLdScript(id: string, data: object) {
  let script = document.getElementById(id) as HTMLScriptElement | null;
  if (!script) {
    script = document.createElement('script');
    script.id = id;
    script.type = 'application/ld+json';
    document.head.appendChild(script);
  }
  script.textContent = JSON.stringify(data, null, 2);
}

export const SEOHead: React.FC = () => {
  const location = useLocation();
  const {
    seo,
    siteSettings,
    selectedCategory,
    categories,
    resources,
    activeResourceModal,
    isAdminOpen,
    isVerifyEmailPageOpen,
    isNotFound
  } = useApp();

  useEffect(() => {
    const pathname = location.pathname;

    // Determine current page type & state
    let pageTitle = seo?.metaTitle || DEFAULT_SEO.title;
    let pageDescription = seo?.metaDescription || DEFAULT_SEO.description;
    let pageKeywords = seo?.keywords || DEFAULT_SEO.keywords;
    let canonicalUrl = `${SITE_ORIGIN}/`;
    let isNoIndex = false;
    let ogType = 'website';
    let ogImage = DEFAULT_SEO.ogImage;
    const schemas: any[] = [getOrganizationSchema(), getWebSiteSchema()];

    // 1. Private Routes: Admin / Verify Email
    if (isAdminOpen || pathname.startsWith('/admin') || pathname.startsWith('/admin-login')) {
      pageTitle = `Admin Portal — ${BRAND_TITLE_SUFFIX}`;
      pageDescription = 'Online Task Lab (OTL) Administrator Access and Management Control Panel.';
      canonicalUrl = `${SITE_ORIGIN}/admin`;
      isNoIndex = true;
    } else if (isVerifyEmailPageOpen || pathname.startsWith('/verify-email')) {
      pageTitle = `Verify Email — ${BRAND_TITLE_SUFFIX}`;
      pageDescription = 'Account authentication and verification for Online Task Lab (OTL).';
      canonicalUrl = `${SITE_ORIGIN}/verify-email`;
      isNoIndex = true;
    } else if (isNotFound) {
      pageTitle = `Page Not Found — ${BRAND_TITLE_SUFFIX}`;
      pageDescription = 'The requested resource or page was not found on Online Task Lab (OTL).';
      canonicalUrl = `${SITE_ORIGIN}/404`;
      isNoIndex = true;
    }
    // 2. Product Detail (Route or Modal)
    else if (pathname.startsWith('/product/') || activeResourceModal) {
      let resource = activeResourceModal;
      if (!resource && pathname.startsWith('/product/')) {
        const prodId = pathname.replace('/product/', '').trim();
        resource = resources.find(r => r.id === prodId || r.slug === prodId) || null;
      }

      if (resource) {
        pageTitle = `${resource.title} — ${BRAND_TITLE_SUFFIX}`;
        pageDescription = `${resource.shortDescription} Download and explore verified resources on Online Task Lab (OTL).`;
        pageKeywords = `${resource.title}, ${resource.tags?.join(', ') || ''}, OTL, Online Task Lab, download`;
        canonicalUrl = `${SITE_ORIGIN}/product/${resource.id}`;
        ogType = 'article';
        ogImage = resource.thumbnail || DEFAULT_SEO.ogImage;

        const catName = categories.find(c => c.id === resource.category)?.name || resource.category;

        // Add Product schema & Breadcrumb
        schemas.push(getProductSchema(resource));
        schemas.push(
          getBreadcrumbSchema([
            { name: 'Home', url: '/' },
            { name: catName, url: `/category/${resource.category}` },
            { name: resource.title, url: `/product/${resource.id}` }
          ])
        );
      }
    }
    // 3. Category Page (Route or state)
    else if (pathname.startsWith('/category/') || (selectedCategory && selectedCategory !== 'all')) {
      const catId = pathname.startsWith('/category/')
        ? pathname.replace('/category/', '').trim()
        : selectedCategory;

      const catInfo = CATEGORY_SEO_DATA[catId];
      const categoryObj = categories.find(c => c.id === catId || c.slug === catId);
      const catDisplayName = categoryObj?.name || catInfo?.name || catId;

      pageTitle = catInfo ? catInfo.title : `${catDisplayName} Resources & Tasks — ${BRAND_TITLE_SUFFIX}`;
      pageDescription =
        catInfo?.description ||
        categoryObj?.description ||
        `Explore verified ${catDisplayName} tasks and digital resources on Online Task Lab (OTL).`;
      canonicalUrl = `${SITE_ORIGIN}/category/${catId}`;

      // Breadcrumb Schema
      schemas.push(
        getBreadcrumbSchema([
          { name: 'Home', url: '/' },
          { name: 'Categories', url: '/#featured-categories' },
          { name: catDisplayName, url: `/category/${catId}` }
        ])
      );
    }
    // 4. Contact Page
    else if (pathname === '/contact') {
      pageTitle = `Contact Online Task Lab (OTL) — Support & Inquiries`;
      pageDescription =
        'Get in touch with Online Task Lab (OTL) support, inquire about digital tasks, submit resources, or join our community.';
      canonicalUrl = `${SITE_ORIGIN}/contact`;

      schemas.push(
        getBreadcrumbSchema([
          { name: 'Home', url: '/' },
          { name: 'Contact & Support', url: '/contact' }
        ])
      );
    }
    // 5. Search Page (Internal search results noindexed per Google Search Central guidelines)
    else if (pathname === '/search') {
      isNoIndex = true;
      pageTitle = `Search Resources & Tasks — ${BRAND_TITLE_SUFFIX}`;
      pageDescription =
        'Search our database of digital tasks, apps, prompts, presets, and landing page resources on Online Task Lab (OTL).';
      canonicalUrl = `${SITE_ORIGIN}/`;
    }
    // 6. Homepage Default
    else {
      pageTitle = seo?.metaTitle || DEFAULT_SEO.title;
      pageDescription = seo?.metaDescription || DEFAULT_SEO.description;
      pageKeywords = seo?.keywords || DEFAULT_SEO.keywords;
      canonicalUrl = `${SITE_ORIGIN}/`;

      schemas.push({
        '@context': 'https://schema.org',
        '@type': 'WebPage',
        '@id': `${SITE_ORIGIN}/#webpage`,
        url: `${SITE_ORIGIN}/`,
        name: 'Online Task Lab (OTL) — Online Tasks & Digital Opportunities',
        isPartOf: {
          '@id': `${SITE_ORIGIN}/#website`
        },
        about: {
          '@id': `${SITE_ORIGIN}/#organization`
        },
        description: pageDescription
      });
    }

    // Apply document title
    document.title = pageTitle;

    // Apply Meta Tags
    setMetaTag('meta[name="description"]', 'name', 'description', pageDescription);
    setMetaTag('meta[name="keywords"]', 'name', 'keywords', pageKeywords);
    setMetaTag('meta[name="author"]', 'name', 'author', DEFAULT_SEO.author);

    // Apply Robots Directive
    const robotsContent = isNoIndex
      ? 'noindex, nofollow'
      : 'index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1';
    setMetaTag('meta[name="robots"]', 'name', 'robots', robotsContent);
    setMetaTag('meta[name="googlebot"]', 'name', 'googlebot', robotsContent);

    // Apply Canonical Link
    setLinkTag('canonical', canonicalUrl);

    // Apply Open Graph Tags
    setMetaTag('meta[property="og:type"]', 'property', 'og:type', ogType);
    setMetaTag('meta[property="og:url"]', 'property', 'og:url', canonicalUrl);
    setMetaTag('meta[property="og:title"]', 'property', 'og:title', pageTitle);
    setMetaTag('meta[property="og:description"]', 'property', 'og:description', pageDescription);
    setMetaTag('meta[property="og:image"]', 'property', 'og:image', ogImage);
    setMetaTag('meta[property="og:site_name"]', 'property', 'og:site_name', 'Online Task Lab');
    setMetaTag('meta[property="og:locale"]', 'property', 'og:locale', 'en_US');

    // Apply Twitter Tags
    setMetaTag('meta[name="twitter:card"]', 'name', 'twitter:card', 'summary_large_image');
    setMetaTag('meta[name="twitter:url"]', 'name', 'twitter:url', canonicalUrl);
    setMetaTag('meta[name="twitter:title"]', 'name', 'twitter:title', pageTitle);
    setMetaTag('meta[name="twitter:description"]', 'name', 'twitter:description', pageDescription);
    setMetaTag('meta[name="twitter:image"]', 'name', 'twitter:image', ogImage);

    // Inject Unified Schema.org Graph
    setJsonLdScript('otl-dynamic-schema', {
      '@context': 'https://schema.org',
      '@graph': schemas
    });
  }, [
    location.pathname,
    selectedCategory,
    activeResourceModal,
    isAdminOpen,
    isVerifyEmailPageOpen,
    isNotFound,
    seo,
    siteSettings,
    categories,
    resources
  ]);

  return null;
};
