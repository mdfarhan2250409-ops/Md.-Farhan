/**
 * Centralized SEO Configuration & Structured Data Generator
 * Brand: Online Task Lab (OTL)
 * Official Canonical Origin: https://onlinetasklab.freedev.app
 */

export const SITE_ORIGIN = 'https://onlinetasklab.freedev.app';
export const BRAND_NAME = 'Online Task Lab';
export const BRAND_SHORT = 'OTL';
export const BRAND_TITLE_SUFFIX = 'Online Task Lab (OTL)';

export const DEFAULT_SEO = {
  title: 'Online Task Lab (OTL) — Online Tasks & Digital Opportunities',
  description:
    'Online Task Lab (OTL) is an online platform for discovering digital tasks, opportunities and useful resources — curated mobile apps, AI prompts, landing pages, and Lightroom presets.',
  keywords:
    'OTL, Online Task Lab, OnlineTaskLab, Online Task Lab website, OTL website, Online Task Lab official website, OTL online tasks, Online Task Lab tasks, digital resources, mobile apps, AI prompts, landing pages, Lightroom presets',
  canonical: `${SITE_ORIGIN}/`,
  ogImage: `${SITE_ORIGIN}/og-image.svg`,
  logoUrl: `${SITE_ORIGIN}/logo.svg`,
  author: 'Online Task Lab (OTL)',
  themeColor: '#0B1D51'
};

export const CATEGORY_SEO_DATA: Record<
  string,
  { title: string; description: string; name: string }
> = {
  apps: {
    name: 'Mobile Apps',
    title: 'Mobile Apps & Tasks — Online Task Lab (OTL)',
    description:
      'Explore verified, unlocked mobile apps, utility APKs, and productivity tools on Online Task Lab (OTL). Verified and safe digital tasks and resources.'
  },
  'landing-pages': {
    name: 'Landing Pages',
    title: 'Landing Pages & Templates — Online Task Lab (OTL)',
    description:
      'High-converting responsive landing page templates, SaaS themes, and Web3 templates designed and curated by Online Task Lab (OTL).'
  },
  'ai-prompts': {
    name: 'AI Prompts',
    title: 'AI Prompts & Digital Tools — Online Task Lab (OTL)',
    description:
      'Curated ChatGPT, Midjourney, and Gemini prompts for content creators, SEO masters, and digital tasks on Online Task Lab (OTL).'
  },
  'lr-presets': {
    name: 'Lightroom Presets',
    title: 'Lightroom Presets & Photo Resources — Online Task Lab (OTL)',
    description:
      'Professional DNG & XMP Lightroom presets for mobile and desktop photography curated by Online Task Lab (OTL).'
  }
};

/**
 * Organization Schema (JSON-LD)
 */
export function getOrganizationSchema() {
  return {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    '@id': `${SITE_ORIGIN}/#organization`,
    name: BRAND_NAME,
    alternateName: [BRAND_SHORT, 'OnlineTaskLab', 'Online Task Lab (OTL)'],
    url: `${SITE_ORIGIN}/`,
    logo: {
      '@type': 'ImageObject',
      url: `${SITE_ORIGIN}/logo.svg`,
      width: 200,
      height: 200
    },
    image: `${SITE_ORIGIN}/og-image.svg`,
    description:
      'Online Task Lab (OTL) is an online platform for discovering digital tasks, opportunities and useful resources.',
    sameAs: [
      'https://t.me/OnlineTaskLab',
      'https://youtube.com/@onlinetasklab',
      'https://facebook.com/onlinetasklab',
      'https://twitter.com/onlinetasklab'
    ],
    contactPoint: {
      '@type': 'ContactPoint',
      contactType: 'customer support',
      url: `${SITE_ORIGIN}/contact`,
      availableLanguage: ['English', 'Bengali']
    }
  };
}

/**
 * WebSite Schema (JSON-LD) with SearchAction
 */
export function getWebSiteSchema() {
  return {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    '@id': `${SITE_ORIGIN}/#website`,
    url: `${SITE_ORIGIN}/`,
    name: BRAND_NAME,
    alternateName: [BRAND_SHORT, 'OnlineTaskLab', 'Online Task Lab (OTL)'],
    description:
      'Online Task Lab (OTL) is an online platform for discovering digital tasks, opportunities and useful resources.',
    publisher: {
      '@id': `${SITE_ORIGIN}/#organization`
    },
    potentialAction: {
      '@type': 'SearchAction',
      target: {
        '@type': 'EntryPoint',
        urlTemplate: `${SITE_ORIGIN}/search?q={search_term_string}`
      },
      'query-input': 'required name=search_term_string'
    }
  };
}

/**
 * Breadcrumb Schema (JSON-LD)
 */
export function getBreadcrumbSchema(
  items: Array<{ name: string; url: string }>
) {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: item.name,
      item: item.url.startsWith('http') ? item.url : `${SITE_ORIGIN}${item.url}`
    }))
  };
}

/**
 * Resource / Product Item Schema (JSON-LD)
 */
export function getProductSchema(resource: {
  id: string;
  title: string;
  shortDescription: string;
  category: string;
  thumbnail: string;
  createdAt?: string;
  version?: string;
  fileSize?: string;
  downloadsCount?: number;
}) {
  const itemUrl = `${SITE_ORIGIN}/product/${resource.id}`;
  const isApp = resource.category === 'apps';

  if (isApp) {
    return {
      '@context': 'https://schema.org',
      '@type': 'SoftwareApplication',
      name: resource.title,
      operatingSystem: 'Android',
      applicationCategory: 'MultimediaApplication',
      description: resource.shortDescription,
      image: resource.thumbnail,
      url: itemUrl,
      softwareVersion: resource.version || 'Latest',
      fileSize: resource.fileSize || 'Variable',
      offers: {
        '@type': 'Offer',
        price: '0.00',
        priceCurrency: 'USD',
        availability: 'https://schema.org/InStock'
      },
      publisher: {
        '@id': `${SITE_ORIGIN}/#organization`
      }
    };
  }

  return {
    '@context': 'https://schema.org',
    '@type': 'CreativeWork',
    name: resource.title,
    headline: resource.title,
    description: resource.shortDescription,
    image: resource.thumbnail,
    url: itemUrl,
    datePublished: resource.createdAt || '2026-08-01',
    creator: {
      '@id': `${SITE_ORIGIN}/#organization`
    },
    publisher: {
      '@id': `${SITE_ORIGIN}/#organization`
    }
  };
}
