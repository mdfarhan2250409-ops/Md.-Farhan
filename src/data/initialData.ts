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
  Inquiry,
  ContactPageSettings,
  FloatingButtonsSettings,
  SocialMediaButton
} from '../types';

export const initialCategories: CategoryItem[] = [
  {
    id: 'apps',
    name: 'Mobile Apps',
    slug: 'apps',
    icon: 'Smartphone',
    banner: 'https://images.unsplash.com/photo-1512941937669-90a1b58e7e9c?auto=format&fit=crop&w=1200&q=80',
    description: 'Premium MOD APKs, unlocked pro mobile applications & utilities.',
    itemCount: 14,
    tags: ['Canva', 'Graphic Design', 'Pro APK', 'Brand Kit', 'AI Tools', 'CapCut', 'Video Editor', 'Mod APK', 'Pro Unlocked', 'No Watermark', 'Lightroom', 'Photo Editor', 'Adobe', 'Presets'],
    desktopColumns: 3,
    tabletColumns: 2,
    mobileColumns: 1,
    desktopItemsPerPage: 12,
    tabletItemsPerPage: 8,
    mobileItemsPerPage: 6
  },
  {
    id: 'landing-pages',
    name: 'Landing Pages',
    slug: 'landing-pages',
    icon: 'Layout',
    banner: 'https://images.unsplash.com/photo-1460925895917-afdab827c52f?auto=format&fit=crop&w=1200&q=80',
    description: 'Futuristic HTML5, React, Tailwind & Elementor landing page templates.',
    itemCount: 9,
    tags: ['SaaS', 'Agency', 'Crypto', 'Portfolio', 'Dark Mode', 'Tailwind', 'React', 'Elementor', 'Responsive', 'Hero UI'],
    desktopColumns: 3,
    tabletColumns: 2,
    mobileColumns: 1,
    desktopItemsPerPage: 12,
    tabletItemsPerPage: 8,
    mobileItemsPerPage: 6
  },
  {
    id: 'ai-prompts',
    name: 'AI Prompts',
    slug: 'ai-prompts',
    icon: 'Bot',
    banner: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=1200&q=80',
    description: 'Copy-paste Midjourney V6, ChatGPT 4o & Gemini production prompts.',
    itemCount: 18,
    tags: ['Midjourney', 'ChatGPT', 'Gemini', 'Photorealistic', '3D Render', 'Anime', 'Logo Design', 'Cinematic', 'Copywriting'],
    desktopColumns: 3,
    tabletColumns: 2,
    mobileColumns: 1,
    desktopItemsPerPage: 12,
    tabletItemsPerPage: 8,
    mobileItemsPerPage: 6
  },
  {
    id: 'lr-presets',
    name: 'Lightroom Presets',
    slug: 'lr-presets',
    icon: 'Sliders',
    banner: 'https://images.unsplash.com/photo-1542038784456-1ea8e935640e?auto=format&fit=crop&w=1200&q=80',
    description: 'Cinematic, Moody, Cyberpunk & Aesthetic DNG/XMP presets for Mobile & Desktop.',
    itemCount: 12,
    tags: ['Moody', 'Cyberpunk', 'Cinematic', 'Vintage', 'Urban', 'Portrait', 'Landscape', 'Warm Tone', 'DNG', 'XMP'],
    desktopColumns: 3,
    tabletColumns: 2,
    mobileColumns: 1,
    desktopItemsPerPage: 12,
    tabletItemsPerPage: 8,
    mobileItemsPerPage: 6
  },
];

export const initialResources: Resource[] = [
  // APPS
  {
    id: 'app-capcut-pro',
    title: 'CapCut Pro Mod APK (Unlocked All VIP)',
    slug: 'capcut-pro-mod-apk',
    category: 'apps',
    shortDescription: 'Full Unlocked Pro features, no watermark, 4K export & all AI effects enabled.',
    fullDescription: 'CapCut Pro MOD APK is the ultimate mobile video editing tool for creators. Enjoy all premium transitions, 3D zoom effects, auto captions, keyframe animation, velocity edits, and 4K 60FPS export without any watermarks or subscription fees.',
    thumbnail: 'https://images.unsplash.com/photo-1574717024653-61fd2cf4d44d?auto=format&fit=crop&w=600&q=80',
    version: 'v11.4.0',
    fileSize: '112 MB',
    downloadUrl: 'https://t.me/OnlineTaskLab/102',
    telegramUrl: 'https://t.me/OnlineTaskLab/102',
    tags: ['CapCut', 'Video Editor', 'Mod APK', 'Pro Unlocked', 'No Watermark'],
    isFeatured: true,
    isTrending: true,
    downloadsCount: 4820,
    telegramClicksCount: 5100,
    createdAt: '2026-08-01',
    apkVersion: '11.4.0 Pro Mod',
    requirements: 'Android 8.0 or higher',
    packageName: 'com.lemon.lvoverseas',
    screenshots: [
      'https://images.unsplash.com/photo-1574717024653-61fd2cf4d44d?auto=format&fit=crop&w=800&q=80',
      'https://images.unsplash.com/photo-1536240478700-b869070f9279?auto=format&fit=crop&w=800&q=80'
    ]
  },
  {
    id: 'app-lightroom-mobile-pro',
    title: 'Adobe Lightroom Mobile Premium (v9.3 Unlocked)',
    slug: 'adobe-lightroom-mobile-premium',
    category: 'apps',
    shortDescription: 'Selective edits, raw editing, geometry tools & unlimited preset import.',
    fullDescription: 'Unleash professional photo editing on your Android phone with Lightroom Mobile Premium. Unlocks mask brushes, selective healing, perspective correction, raw file processing, and cloud sync support.',
    thumbnail: 'https://images.unsplash.com/photo-1542038784456-1ea8e935640e?auto=format&fit=crop&w=600&q=80',
    version: 'v9.3.1',
    fileSize: '138 MB',
    downloadUrl: 'https://t.me/OnlineTaskLab/104',
    telegramUrl: 'https://t.me/OnlineTaskLab/104',
    tags: ['Lightroom', 'Photo Editor', 'Adobe', 'Presets', 'Pro APK'],
    isFeatured: true,
    isTrending: false,
    downloadsCount: 3290,
    telegramClicksCount: 3450,
    createdAt: '2026-08-03',
    apkVersion: '9.3.1 Premium',
    requirements: 'Android 7.0+',
    packageName: 'com.adobe.lrmobile'
  },
  {
    id: 'app-canva-pro-mod',
    title: 'Canva Pro APK (Premium Brand Kit Unlocked)',
    slug: 'canva-pro-apk-unlocked',
    category: 'apps',
    shortDescription: 'Access 100M+ premium graphics, background remover, brand kits & magic resize.',
    fullDescription: 'Get full access to Canva Pro design tools on your phone. Create social media posts, thumbnails, posters, presentation slides, and logos using 100,000+ premium templates and stock photos.',
    thumbnail: 'https://images.unsplash.com/photo-1626785774573-4b799315345d?auto=format&fit=crop&w=600&q=80',
    version: 'v2.248.0',
    fileSize: '45 MB',
    downloadUrl: 'https://t.me/OnlineTaskLab/106',
    telegramUrl: 'https://t.me/OnlineTaskLab/106',
    tags: ['Canva', 'Graphic Design', 'Pro APK', 'Brand Kit', 'AI Tools'],
    isFeatured: false,
    isTrending: true,
    downloadsCount: 2840,
    telegramClicksCount: 3100,
    createdAt: '2026-08-05',
    apkVersion: '2.248.0 Mod',
    requirements: 'Android 6.0+'
  },

  // LANDING PAGES
  {
    id: 'lp-cyberpunk-saas',
    title: 'Cyberpunk Dark Space SaaS Landing Page Template',
    slug: 'cyberpunk-dark-space-saas-landing-page',
    category: 'landing-pages',
    shortDescription: 'Next.js + Tailwind v4 glassmorphic SaaS landing page with particle background.',
    fullDescription: 'A modern, conversion-optimized dark space theme landing page template for AI startups, SaaS products, and digital agencies. Includes interactive pricing table, feature grid, glowing CTAs, testmonial sliders, and mobile menu.',
    thumbnail: 'https://images.unsplash.com/photo-1460925895917-afdab827c52f?auto=format&fit=crop&w=600&q=80',
    version: 'v2.1',
    fileSize: '14.2 MB',
    downloadUrl: 'https://t.me/OnlineTaskLab/201',
    telegramUrl: 'https://t.me/OnlineTaskLab/201',
    demoUrl: 'https://example.com/demo/cyberpunk-saas',
    tags: ['Tailwind', 'React', 'Space Theme', 'SaaS', 'Elementor Compatible'],
    isFeatured: true,
    isTrending: true,
    downloadsCount: 1950,
    telegramClicksCount: 2100,
    createdAt: '2026-08-02',
    demoLink: 'https://example.com/demo/cyberpunk-saas',
    documentationLink: 'https://t.me/OnlineTaskLab',
    previewImages: [
      'https://images.unsplash.com/photo-1460925895917-afdab827c52f?auto=format&fit=crop&w=800&q=80',
      'https://images.unsplash.com/photo-1551288049-bebda4e38f71?auto=format&fit=crop&w=800&q=80'
    ]
  },
  {
    id: 'lp-crypto-web3',
    title: 'Futuristic Web3 & Crypto Token Launch Landing Page',
    slug: 'futuristic-web3-crypto-landing-page',
    category: 'landing-pages',
    shortDescription: 'Glowing neon UI, roadmap timeline, tokenomics chart & live countdown.',
    fullDescription: 'High-converting Web3/Crypto token presale landing page equipped with interactive tokenomics visualizer, roadmap timeline, glassmorphic wallet connect UI modal, and Telegram community counter.',
    thumbnail: 'https://images.unsplash.com/photo-1639762681485-074b7f938ba0?auto=format&fit=crop&w=600&q=80',
    version: 'v1.0',
    fileSize: '8.8 MB',
    downloadUrl: 'https://t.me/OnlineTaskLab/203',
    telegramUrl: 'https://t.me/OnlineTaskLab/203',
    demoUrl: 'https://example.com/demo/web3-landing',
    tags: ['Web3', 'Crypto', 'Neon UI', 'HTML5', 'Tokenomics'],
    isFeatured: false,
    isTrending: true,
    downloadsCount: 1420,
    telegramClicksCount: 1600,
    createdAt: '2026-08-04'
  },

  // AI PROMPTS
  {
    id: 'prompt-mj-v6-cyberpunk',
    title: 'Midjourney V6 Photorealistic Cyberpunk Portrait Prompt',
    slug: 'midjourney-v6-photorealistic-cyberpunk-portrait-prompt',
    category: 'ai-prompts',
    shortDescription: 'Generates ultra-detailed 8K cinematic dark space cyberpunk character portraits.',
    fullDescription: 'This production-ready Midjourney V6 prompt generates stunning, hyper-realistic cyberpunk characters illuminated by cyan and magenta neon lights with intricate skin texture, volumetric rain mist, and volumetric glow.',
    thumbnail: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=600&q=80',
    version: 'V6.0 Master',
    fileSize: 'Txt Prompt',
    downloadUrl: 'https://t.me/OnlineTaskLab/301',
    telegramUrl: 'https://t.me/OnlineTaskLab/301',
    tags: ['Midjourney', 'Cyberpunk', '8K Portrait', 'Neon Art', 'AI Prompt'],
    isFeatured: true,
    isTrending: true,
    downloadsCount: 5210,
    telegramClicksCount: 5600,
    createdAt: '2026-08-01',
    aiModel: 'Midjourney V6',
    promptText: 'Ultra-realistic 8K photo of a futuristic hacker wearing a glassmorphic cyber visor, neon cyan and deep blue ambient reflections, volumetric fog, octane render, Hasselblad 85mm lens f/1.2, highly detailed facial features, cinematic lighting, dramatic background --ar 16:9 --style raw --v 6.0',
    negativePrompt: 'blurry, low quality, distorted hands, extra fingers, cartoon, 3d render, plastic skin, oversaturated'
  },
  {
    id: 'prompt-chatgpt-seo-master',
    title: 'ChatGPT 4o Ultimate SEO Article & Keyword Master Prompt',
    slug: 'chatgpt-4o-ultimate-seo-article-master-prompt',
    category: 'ai-prompts',
    shortDescription: 'Creates 2,500+ word rankable SEO articles with FAQ schemas & outline.',
    fullDescription: 'Copy and paste this system prompt into ChatGPT 4o or Gemini 1.5 to automatically outline, structure, and draft human-like rankable blog articles complete with table of contents, meta tags, and FAQ schema markups.',
    thumbnail: 'https://images.unsplash.com/photo-1677442136019-21780efad99a?auto=format&fit=crop&w=600&q=80',
    version: 'v4.2',
    fileSize: 'Txt Prompt',
    downloadUrl: 'https://t.me/OnlineTaskLab/304',
    telegramUrl: 'https://t.me/OnlineTaskLab/304',
    tags: ['ChatGPT 4o', 'SEO', 'Blogging', 'Copywriting', 'AI Assistant'],
    isFeatured: true,
    isTrending: false,
    downloadsCount: 3980,
    telegramClicksCount: 4200,
    createdAt: '2026-08-06',
    aiModel: 'ChatGPT 4o',
    promptText: 'Act as a Senior Content Strategist and SEO Master. Given the target keyword "[INSERT KEYWORD]", create an exhaustive, 2000-word article with H2/H3 headers, semantic LSI keywords integrated naturally, conversational tone, zero fluff, key takeaway bullet points, and an FAQ section with schema JSON output.'
  },

  // LIGHTROOM PRESETS
  {
    id: 'preset-cyber-neon-night',
    title: 'Cyber Neon Night Lightroom Preset Pack (DNG + XMP)',
    slug: 'cyber-neon-night-lightroom-preset-pack',
    category: 'lr-presets',
    shortDescription: 'Transforms night urban photos into electric cyan & deep cobalt cyberpunk aesthetics.',
    fullDescription: 'Perfect for night cityscapes, street photography, and portrait shoots under neon lights. Enhances shadows with deep navy tones while boosting cyan and violet highlights for a futuristic film look.',
    thumbnail: 'https://images.unsplash.com/photo-1519501025264-65ba15a82390?auto=format&fit=crop&w=600&q=80',
    version: 'v3.0 Pack',
    fileSize: '18.5 MB',
    downloadUrl: 'https://t.me/OnlineTaskLab/401',
    telegramUrl: 'https://t.me/OnlineTaskLab/401',
    tags: ['Lightroom', 'Presets', 'DNG', 'XMP', 'Cyberpunk', 'Night Street'],
    isFeatured: true,
    isTrending: true,
    downloadsCount: 4120,
    telegramClicksCount: 4500,
    createdAt: '2026-08-02',
    demoUrl: 'https://example.com/demo/cyber-neon-preset',
    beforeImage: 'https://images.unsplash.com/photo-1519501025264-65ba15a82390?auto=format&fit=crop&w=800&q=80&sat=-50&con=10',
    afterImage: 'https://images.unsplash.com/photo-1519501025264-65ba15a82390?auto=format&fit=crop&w=800&q=80',
    presetFormat: '.DNG',
    presetGallery: [
      {
        id: 'cyber-sample-2',
        label: 'Tokyo Shinjuku',
        beforeImage: 'https://images.unsplash.com/photo-1503899036084-c55cdd92da26?auto=format&fit=crop&w=800&q=80&sat=-60',
        afterImage: 'https://images.unsplash.com/photo-1503899036084-c55cdd92da26?auto=format&fit=crop&w=800&q=80'
      },
      {
        id: 'cyber-sample-3',
        label: 'Cyber Portrait',
        beforeImage: 'https://images.unsplash.com/photo-1509198397868-475647b2a1e5?auto=format&fit=crop&w=800&q=80&sat=-55',
        afterImage: 'https://images.unsplash.com/photo-1509198397868-475647b2a1e5?auto=format&fit=crop&w=800&q=80'
      },
      {
        id: 'cyber-sample-4',
        label: 'Neon Light Trails',
        beforeImage: 'https://images.unsplash.com/photo-1508739773434-c26b3d09e071?auto=format&fit=crop&w=800&q=80&sat=-50',
        afterImage: 'https://images.unsplash.com/photo-1508739773434-c26b3d09e071?auto=format&fit=crop&w=800&q=80'
      }
    ]
  },
  {
    id: 'preset-cinematic-moody-blue',
    title: 'Cinematic Moody Blue Lightroom Preset (Desktop & Mobile)',
    slug: 'cinematic-moody-blue-lightroom-preset',
    category: 'lr-presets',
    shortDescription: 'Warm skin tones paired with deep teal and blue matte atmospheric shadow tone.',
    fullDescription: 'Designed for travel, portrait, and outdoor lifestyle photography. Gives your photos a high-end editorial look featured in top fashion magazines and Instagram feeds.',
    thumbnail: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=600&q=80',
    version: 'v2.0',
    fileSize: '12.1 MB',
    downloadUrl: 'https://t.me/OnlineTaskLab/405',
    telegramUrl: 'https://t.me/OnlineTaskLab/405',
    demoUrl: 'https://example.com/demo/moody-blue-preset',
    tags: ['Moody Blue', 'Cinematic', 'Travel Preset', 'DNG Mobile'],
    isFeatured: false,
    isTrending: true,
    downloadsCount: 2950,
    telegramClicksCount: 3200,
    createdAt: '2026-08-04',
    beforeImage: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=800&q=80&sat=-40',
    afterImage: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=800&q=80',
    presetFormat: '.XMP',
    presetGallery: [
      {
        id: 'moody-sample-2',
        label: 'Travel Landscape',
        beforeImage: 'https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=800&q=80&sat=-50',
        afterImage: 'https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=800&q=80'
      },
      {
        id: 'moody-sample-3',
        label: 'Street Atmosphere',
        beforeImage: 'https://images.unsplash.com/photo-1477959858617-67f30bc75b82?auto=format&fit=crop&w=800&q=80&sat=-45',
        afterImage: 'https://images.unsplash.com/photo-1477959858617-67f30bc75b82?auto=format&fit=crop&w=800&q=80'
      },
      {
        id: 'moody-sample-4',
        label: 'Forest Mist',
        beforeImage: 'https://images.unsplash.com/photo-1448375240586-882707db888b?auto=format&fit=crop&w=800&q=80&sat=-50',
        afterImage: 'https://images.unsplash.com/photo-1448375240586-882707db888b?auto=format&fit=crop&w=800&q=80'
      },
      {
        id: 'moody-sample-5',
        label: 'Ocean Pier',
        beforeImage: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=800&q=80&sat=-40',
        afterImage: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=800&q=80'
      },
      {
        id: 'moody-sample-6',
        label: 'Coffee Lifestyle',
        beforeImage: 'https://images.unsplash.com/photo-1501339847302-ac426a4a7cbb?auto=format&fit=crop&w=800&q=80&sat=-45',
        afterImage: 'https://images.unsplash.com/photo-1501339847302-ac426a4a7cbb?auto=format&fit=crop&w=800&q=80'
      }
    ]
  },
];

export const initialSocialButtons: SocialMediaButton[] = [
  { id: 'sb-facebook', platform: 'facebook', name: 'Facebook', url: 'https://facebook.com/onlinetasklab', enabled: true },
  { id: 'sb-x', platform: 'twitter', name: 'X (Twitter)', url: 'https://x.com/onlinetasklab', enabled: true },
  { id: 'sb-linkedin', platform: 'linkedin', name: 'LinkedIn', url: 'https://linkedin.com/company/onlinetasklab', enabled: true },
  { id: 'sb-instagram', platform: 'instagram', name: 'Instagram', url: 'https://instagram.com/onlinetasklab', enabled: true },
  { id: 'sb-youtube', platform: 'youtube', name: 'YouTube', url: 'https://youtube.com/@onlinetasklab', enabled: true },
  { id: 'sb-telegram', platform: 'telegram', name: 'Telegram', url: 'https://t.me/OnlineTaskLab', enabled: true },
];

export const initialSiteSettings: SiteSettings = {
  websiteTitle: 'Online Task Lab (OTL) — Online Tasks & Digital Opportunities',
  tagline: 'Online Tasks • Mobile Apps • AI Prompts • Landing Pages • Lightroom Presets',
  logoText: 'OTL',
  footerText: '© 2026 Online Task Lab (OTL). Official Online Tasks & Digital Resource Platform. All rights reserved.',
  primaryColor: '#0B1D51',
  secondaryColor: '#133E87',
  accentColor: '#5DE2E7',
  telegramChannel: 'https://t.me/OnlineTaskLab',
  telegramGroup: 'https://t.me/OnlineTaskLabGroup',
  adminTelegram: 'https://t.me/OnlineTaskLabAdmin',
  contactEmail: 'contact@onlinetasklab.com',
  socialLinks: {
    youtube: 'https://youtube.com/@onlinetasklab',
    facebook: 'https://facebook.com/onlinetasklab',
    twitter: 'https://twitter.com/onlinetasklab',
    telegram: 'https://t.me/OnlineTaskLab'
  } as any,
  socialButtons: initialSocialButtons,
  customCss: ''
};

export const initialHomepageBuilder: HomepageBuilderSettings = {
  heroBadgeText: 'Official Platform • Online Task Lab (OTL)',
  heroLogoText: 'OTL',
  heroLogoUrl: '',
  heroTitle: 'Online Task Lab (OTL)',
  heroSubtitle: 'Online Task Lab (OTL) is an online platform for discovering digital tasks, opportunities and useful resources — curated mobile apps, AI prompts, landing pages, and Lightroom presets.',
  heroExploreBtnText: 'Explore Tasks & Resources',
  heroTelegramBtnText: 'Join Official Telegram Channel',
  heroTelegramBtnUrl: 'https://t.me/OnlineTaskLab',
  showHeroParticles: true,
  showFeaturedCategories: true,
  showTrendingSection: true,
  showLatestSection: true,
  homepageBannerEnabled: true,
  homepageBannerText: '🔥 Welcome to Online Task Lab (OTL) — Discover curated digital tasks & daily releases!',
  homepageBannerLink: 'https://t.me/OnlineTaskLab',
  stat1Value: '',
  stat1Label: 'TOTAL PRODUCTS',
  stat2Value: '',
  stat2Label: 'DOWNLOADS',
  stat3Value: '',
  stat3Label: 'TELEGRAM CLICKS',
  stat4Value: '100%',
  stat4Label: 'VERIFIED SAFE'
};

export const initialSplashSettings: SplashLoaderSettings = {
  enabled: true,
  showOnlyFirstVisit: false,
  duration: 2600,
  titleText: 'Online Task Lab',
  loadingTexts: [
    'Initializing Space Network...',
    'Loading Premium Resources...',
    'Connecting Telegram Gateway...',
    'Preparing OTL Digital Hub...'
  ],
  animationStyle: 'progress-bar',
  glowColor: '#5DE2E7',
  progressBarColor: '#5DE2E7',
  backgroundColor: '#060B1E'
};

export const initialMobileNavSettings: MobileNavSettings = {
  enabled: true,
  position: 'fixed-left',
  glowActive: true,
  items: [
    { id: 'm-home', label: 'Home', icon: 'Home', link: '#home', categoryFilter: 'all' },
    { id: 'm-apps', label: 'Apps', icon: 'Smartphone', link: '#apps', categoryFilter: 'apps', badge: 'Hot' },
    { id: 'm-landing', label: 'Landing Pages', icon: 'Layout', link: '#landing-pages', categoryFilter: 'landing-pages' },
    { id: 'm-prompts', label: 'AI Prompts', icon: 'Bot', link: '#ai-prompts', categoryFilter: 'ai-prompts', badge: 'New' },
    { id: 'm-presets', label: 'LR Presets', icon: 'Sliders', link: '#lr-presets', categoryFilter: 'lr-presets' },
    { id: 'm-contact', label: 'Contact', icon: 'Mail', link: '#contact' },
    { id: 'm-telegram', label: 'Telegram', icon: 'Send', link: 'https://t.me/OnlineTaskLab', badge: 'Join' }
  ]
};

export const initialAds: Advertisement[] = [
  {
    id: 'ad-hero-top',
    title: 'OTL VIP Channel Promo',
    type: 'homepage-banner',
    text: '🚀 Exclusive Early Access & Mod Requests available in OTL VIP Group!',
    targetLink: 'https://t.me/OnlineTaskLabGroup',
    enabled: true
  },
  {
    id: 'ad-sidebar',
    title: 'Lightroom Presets Bundle 2026',
    type: 'sidebar-banner',
    imageUrl: 'https://images.unsplash.com/photo-1542038784456-1ea8e935640e?auto=format&fit=crop&w=600&q=80',
    targetLink: 'https://t.me/OnlineTaskLab',
    enabled: true
  }
];

export const initialSEO: SEOConfig = {
  metaTitle: 'Online Task Lab (OTL) — Online Tasks & Digital Opportunities',
  metaDescription: 'Online Task Lab (OTL) is an online platform for discovering digital tasks, opportunities and useful resources — curated mobile apps, AI prompts, landing pages, and Lightroom presets.',
  keywords: 'OTL, Online Task Lab, OnlineTaskLab, Online Task Lab website, OTL website, Online Task Lab official website, OTL online tasks, Online Task Lab tasks, digital resources, mobile apps, AI prompts, landing pages, Lightroom presets'
};

export const initialAnalytics: AnalyticsData = {
  totalVisitors: 28450,
  totalDownloads: 43200,
  telegramClicks: 49800,
  popularProductIds: ['prompt-mj-v6-cyberpunk', 'app-capcut-pro', 'preset-cyber-neon-night']
};

export const initialInquiries: Inquiry[] = [
  {
    id: 'inq-1',
    email: 'user.demo@gmail.com',
    subject: 'Request for Adobe Illustrator MOD APK',
    telegramWhatsapp: '@user_demo_tg / +8801700000000',
    message: 'Hello Admin, can you please upload Adobe Illustrator Mobile version? Thank you!',
    createdAt: new Date().toISOString().split('T')[0],
    status: 'unread'
  },
  {
    id: 'inq-2',
    email: 'tanvir.dev@hotmail.com',
    subject: 'Broken Telegram link on Lightroom Preset',
    telegramWhatsapp: '@tanvir_dev',
    message: 'Hi OTL Team, the Telegram link for Cyber Neon Night Lightroom Preset seems to need a re-upload. Thanks!',
    createdAt: new Date(Date.now() - 86400000).toISOString().split('T')[0],
    status: 'read'
  }
];

export const initialContactSettings: ContactPageSettings = {
  modalTitle: 'Contact & Support Center',
  heroBadge: '24/7 Fast Telegram Support',
  heroTitle: 'Need Assistance or Custom Mod Requests?',
  heroSubtitle: 'Join our official Telegram Desk for instant 1-on-1 support, broken link reports, or custom resource requests.',
  telegramButtonText: 'Chat Direct Support',
  telegramAdminUrl: 'https://t.me/OnlineTaskLabAdmin',
  formTitle: 'Send an Email Inquiry',
  faqTitle: 'Frequently Asked Questions (FAQ)',
  socialButtons: [
    {
      id: 'soc-youtube',
      platform: 'youtube',
      title: 'YouTube Channel',
      url: 'https://youtube.com/@onlinetasklab',
      enabled: true,
      color: '#FF0000',
      badgeText: 'Subscribe'
    },
    {
      id: 'soc-facebook',
      platform: 'facebook',
      title: 'Facebook Page',
      url: 'https://facebook.com/onlinetasklab',
      enabled: true,
      color: '#1877F2',
      badgeText: 'Follow'
    },
    {
      id: 'soc-tiktok',
      platform: 'tiktok',
      title: 'TikTok Account',
      url: 'https://tiktok.com/@onlinetasklab',
      enabled: true,
      color: '#000000',
      badgeText: 'Watch Videos'
    },
    {
      id: 'soc-telegram',
      platform: 'telegram',
      title: 'Telegram Channel',
      url: 'https://t.me/OnlineTaskLab',
      enabled: true,
      color: '#229ED9',
      badgeText: 'Join 50K+'
    }
  ],
  faqs: [
    {
      id: 'faq-1',
      question: 'How do I download resources from Online Task Lab?',
      answer: 'Click the "Download via Telegram" button on any resource page. You will be redirected instantly to our secure Telegram Channel post containing the direct file.'
    },
    {
      id: 'faq-2',
      question: 'Are all Mobile Apps & Presets safe to install?',
      answer: 'Yes! Every file uploaded to OTL is thoroughly scanned with VirusTotal and tested on clean sandbox environments before publication.'
    },
    {
      id: 'faq-3',
      question: 'Can I request a custom MOD APK, AI Prompt, or Preset?',
      answer: 'Absolutely! Send us a message using the form below or contact our Support team directly on Telegram.'
    }
  ],
  categories: [
    { id: 'account_help', label: '💎 Account & Membership Support', emoji: '💎', name: 'Account & Membership Support', enabled: true, order: 1 },
    { id: 'resource_request', label: '📥 Custom Resource / Mod Request', emoji: '📥', name: 'Custom Resource / Mod Request', enabled: true, order: 2 },
    { id: 'download_issue', label: '⚠️ Broken Download / Link Issue', emoji: '⚠️', name: 'Broken Download / Link Issue', enabled: true, order: 3 },
    { id: 'preset_help', label: '🎨 Lightroom Presets / AI Prompts Help', emoji: '🎨', name: 'Lightroom Presets / AI Prompts Help', enabled: true, order: 4 },
    { id: 'bug_feedback', label: '💡 Bug Report & Feature Suggestion', emoji: '💡', name: 'Bug Report & Feature Suggestion', enabled: true, order: 5 },
    { id: 'general', label: '💬 General Message / Other', emoji: '💬', name: 'General Message / Other', enabled: true, order: 6 }
  ]
};

export const initialFloatingButtonsSettings: FloatingButtonsSettings = {
  enabled: true,
  position: 'bottom-right',
  stackDirection: 'bottom-to-top',
  buttons: [
    {
      id: 'fb-telegram-channel',
      title: 'Join Telegram',
      url: 'https://t.me/OnlineTaskLab',
      icon: 'telegram',
      enabled: true,
      color: 'cyan',
      badgeText: 'Live',
      order: 1
    },
    {
      id: 'fb-telegram-group',
      title: 'Telegram Group',
      url: 'https://t.me/OnlineTaskLabGroup',
      icon: 'telegram',
      enabled: true,
      color: 'indigo',
      badgeText: 'Chat',
      order: 2
    },
    {
      id: 'fb-admin-support',
      title: 'Direct Support',
      url: 'https://t.me/OnlineTaskLabAdmin',
      icon: 'send',
      enabled: true,
      color: 'rose',
      badgeText: '24/7',
      order: 3
    }
  ]
};

