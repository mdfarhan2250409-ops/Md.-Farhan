/**
 * Authoritative, machine-readable knowledge layer representing the real Online Task Lab (OTL) website.
 * Grounded strictly in actual components, routes, modals, buttons, forms, and workflows.
 */

export interface WebsiteAction {
  name: string;
  location: string;
  description: string;
}

export interface WebsiteSection {
  id: string;
  name: string;
  routeOrModal: string;
  purpose: string;
  elements: string[];
  actions: WebsiteAction[];
}

export const OTL_WEBSITE_STRUCTURE: {
  siteName: string;
  domainPurpose: string;
  pricingPolicy: string;
  downloadDelivery: string;
  officialTelegramChannel: string;
  officialTelegramGroup: string;
  sections: WebsiteSection[];
} = {
  siteName: 'Online Task Lab (OTL Hub)',
  domainPurpose: 'High-speed, verified free digital hub for mobile apps (Android MOD APKs), Lightroom VIP presets, CapCut Pro editing assets, and AI tools.',
  pricingPolicy: '100% FREE. Online Task Lab does not sell subscriptions or charge any payment for resource downloads. No credit card or fee is required.',
  downloadDelivery: 'Clean, VirusTotal-tested files delivered safely and directly via verified posts on our official Telegram channel (https://t.me/OnlineTaskLab).',
  officialTelegramChannel: 'https://t.me/OnlineTaskLab',
  officialTelegramGroup: 'https://t.me/OnlineTaskLabGroup',
  sections: [
    {
      id: 'header_nav',
      name: 'Navigation Header',
      routeOrModal: 'Sticky top bar across all pages',
      purpose: 'Global site navigation, search, notifications, and account access',
      elements: [
        'Brand Logo ("OTL Hub") - returns to Home / All resources on click',
        'Search button / quick bar (opens instant Search Modal or Cmd+K)',
        'Notification Bell with unread badges for newest resource releases',
        '"My Account" button (Desktop) / User Avatar (Mobile) - opens Auth Modal or User Profile Modal'
      ],
      actions: [
        { name: 'Sign In / Register', location: 'Top Right Header', description: 'Opens Auth Modal to login or create account' },
        { name: 'Search', location: 'Header & Hero', description: 'Opens Search Modal to find any APK, preset, or prompt' },
        { name: 'Notifications', location: 'Header Bell Icon', description: 'Displays latest platform updates and uploads' }
      ]
    },
    {
      id: 'auth_registration',
      name: 'Account Creation & Registration',
      routeOrModal: 'AuthModal (mode: "register")',
      purpose: 'User sign up with email/password or 1-click social authentication',
      elements: [
        'First Name and Last Name fields',
        'Username field (unique)',
        'Email Address field (disposable emails blocked for safety)',
        'Password and Confirm Password fields with real-time strength meter',
        '"Continue with Google" button (instant Google Sign-In popup via Firebase Auth)',
        '"Continue with GitHub" button',
        'Submit button ("Create Account" / "Sign Up")'
      ],
      actions: [
        { name: 'Email Registration', location: 'AuthModal > Create Account tab', description: 'Submits credentials and triggers 6-digit email OTP verification' },
        { name: 'Google Sign-In', location: 'AuthModal > Continue with Google', description: '1-click registration using Google account' }
      ]
    },
    {
      id: 'auth_login',
      name: 'User Sign In / Login',
      routeOrModal: 'AuthModal (mode: "login")',
      purpose: 'Access registered user dashboard, download history, and profile features',
      elements: [
        'Email or Username input field',
        'Password field with show/hide password toggle',
        '"Forgot Password?" link',
        '"Continue with Google" button',
        '"Continue with GitHub" button',
        'Submit button ("Sign In" / "Log In")',
        'Link to "Create Account" for new users'
      ],
      actions: [
        { name: 'Password Login', location: 'AuthModal > Sign In tab', description: 'Sign in using username/email and password' },
        { name: 'Google Login', location: 'AuthModal > Continue with Google', description: 'Sign in with Google OAuth popup' },
        { name: 'Password Recovery', location: 'AuthModal > Forgot Password?', description: 'Request 6-digit password reset OTP' }
      ]
    },
    {
      id: 'auth_otp_verification',
      name: 'Email OTP Verification',
      routeOrModal: 'AuthModal (mode: "verify-email" or "verify-reset-otp")',
      purpose: 'Two-step verification for email ownership and security',
      elements: [
        '6-digit numeric OTP code input box',
        'Display of target email address',
        '10-minute validity duration',
        '60-second countdown resend timer',
        '"Resend Code" button (activates when countdown finishes)',
        '"Verify & Activate" / "Confirm OTP" button'
      ],
      actions: [
        { name: 'Enter OTP', location: 'Verification Modal', description: 'Input the 6-digit numeric code received in email' },
        { name: 'Resend OTP', location: 'Verification Modal', description: 'Triggers a new 6-digit OTP code to the target email after 60 seconds' }
      ]
    },
    {
      id: 'product_catalog_downloads',
      name: 'Product Details & Free Download',
      routeOrModal: 'ProductDetailModal',
      purpose: 'View product specifications, version, safety certificate, and download link',
      elements: [
        'Product title, category, version number, and file size',
        'VirusTotal 100% Clean Verified badge (tested across 70+ antivirus engines)',
        'Key features, requirements (e.g. Android 8.0+), and install guide',
        'Official "Free Download" button linking directly to verified post on Telegram channel (https://t.me/OnlineTaskLab)'
      ],
      actions: [
        { name: 'Download Resource', location: 'ProductDetailModal > Free Download button', description: 'Opens the specific verified download post on Telegram' }
      ]
    },
    {
      id: 'support_system',
      name: 'AI Support & Problem Reporting',
      routeOrModal: 'FloatingAISupport (Bottom-Right Widget)',
      purpose: 'Live customer support, troubleshooting, human handoff, and persistent problem ticketing',
      elements: [
        'Floating Chat widget button (bottom-right)',
        'AI Assistant chat interface with multilingual response (Bangla, English, Banglish)',
        '"Talk to Human" button (immediate escalation to admin specialist)',
        '"Report Problem" button (creates persistent support issue/ticket #R-XXXX with conversation context and screenshot attachments)',
        'Active Report Status Banner (shows open, waiting for admin, or resolved state)'
      ],
      actions: [
        { name: 'Chat with AI', location: 'Chat Input', description: 'Ask questions about website, account, or products' },
        { name: 'Talk to Human', location: 'Chat Header / Quick Actions', description: 'Directly escalate inquiry to admin staff' },
        { name: 'Report Problem', location: 'Chat Header / Action Menu', description: 'File an official persistent support report with ticket tracking' }
      ]
    }
  ]
};

/**
 * Step-by-step account creation guide matching the real UI
 */
export function getAccountRegistrationSteps(replyLanguage: 'bangla' | 'english'): string {
  if (replyLanguage === 'bangla') {
    return `OTL-এ নতুন অ্যাকাউন্ট তৈরি করতে নিচের সহজ ধাপগুলো অনুসরণ করুন:

1. **Sign In অপশনে যান:** ওয়েবসাইটের ওপরের ডানদিকে **"My Account"** (বা মোবাইলে প্রোফাইল আইকন)-এ ক্লিক করুন।
2. **Create Account নির্বাচন করুন:** পপআপ উইন্ডো ওপেন হলে **"Create Account"** (বা Sign Up) ট্যাবে ক্লিক করুন।
3. **তথ্য পূরণ করুন:** আপনার First Name, Last Name, একটি ইউনিক Username, আপনার ইমেইল এবং পাসওয়ার্ড দিন।
4. **OTP ভেরিফিকেশন:** আপনার ইমেইলে একটি **৬ ডিজিটের ভেরিফিকেশন OTP** কোড যাবে। স্ক্রিনে কোডটি দিয়ে **"Verify & Activate"** বাটনে চাপুন।
5. **অথবা ১-ক্লিকে Google দিয়ে করুন:** কোনো পাসওয়ার্ড না দিয়ে তাৎক্ষণিক অ্যাকাউন্ট খুলতে **"Continue with Google"** বাটনে ক্লিক করুন।

আপনার অ্যাকাউন্ট তৈরি সম্পন্ন হয়ে যাবে!`;
  }

  return `To create an account on Online Task Lab (OTL), follow these steps:

1. **Open Sign In:** Click the **"My Account"** button in the top navigation bar (or the user profile icon on mobile).
2. **Switch to Create Account:** In the login popup, select the **"Create Account"** tab.
3. **Fill in Details:** Enter your First Name, Last Name, unique Username, Email Address, and choose a secure Password.
4. **Verify Email OTP:** A **6-digit verification code** will be sent to your email. Enter this code and click **"Verify & Activate"**.
5. **Or 1-Click with Google:** Alternatively, simply click **"Continue with Google"** to register instantly without typing a password.

Your OTL account will be created immediately!`;
}

/**
 * Step-by-step login guide matching the real UI
 */
export function getLoginSteps(replyLanguage: 'bangla' | 'english'): string {
  if (replyLanguage === 'bangla') {
    return `OTL-এ লগইন করতে এই ধাপগুলো অনুসরণ করুন:

1. ওয়েবসাইটের ওপরের ডানদিকে **"My Account"** বাটনে ক্লিক করুন।
2. আপনার নিবন্ধিত **Email বা Username** এবং **পাসওয়ার্ড** দিন।
3. **"Sign In"** বাটনে ক্লিক করুন।
4. অথবা সরাসরি **"Continue with Google"** বাটনে ক্লিক করে Google অ্যাকাউন্ট দিয়ে লগইন করতে পারেন।
5. পাসওয়ার্ড মনে না থাকলে পাসওয়ার্ড বক্সের নিচে **"Forgot Password?"**-এ ক্লিক করে ইমেইল OTP-র মাধ্যমে নতুন পাসওয়ার্ড সেট করতে পারেন।`;
  }

  return `To sign in to your OTL account:

1. Click the **"My Account"** button in the top header.
2. Enter your registered **Email or Username** and your **Password**.
3. Click **"Sign In"**.
4. Or click **"Continue with Google"** for instant 1-click authentication.
5. If you forgot your password, click **"Forgot Password?"** underneath the password field to reset it via email OTP.`;
}

/**
 * Step-by-step Google Sign-In guide matching the real UI
 */
export function getGoogleLoginSteps(replyLanguage: 'bangla' | 'english'): string {
  if (replyLanguage === 'bangla') {
    return `Google দিয়ে লগইন/অ্যাকাউন্ট খোলার নিয়ম:

1. ওপরের ডানদিকের **"My Account"** বাটনে ক্লিক করুন।
2. পপআপ উইন্ডোর মাঝামাঝি থাকা **"Continue with Google"** (Google লোগো সম্বলিত) বাটনে ক্লিক করুন।
3. আপনার ব্রাউজারে একটি Google একাউন্ট সিলেক্ট করার উইন্ডো আসবে—আপনার জিমেইল নির্বাচন করে পারমিশন দিন।
4. সাথে সাথে আপনার OTL অ্যাকাউন্ট লগইন হয়ে যাবে।

💡 **সমস্যা হলে করণীয়:** যদি ক্লিক করার পর কিছু না আসে, ব্রাউজারের পপআপ ব্লকার (Popup Blocker) বা থার্ড-পার্টি কুকি ব্লক বন্ধ আছে কিনা নিশ্চিত করুন। সমস্যা না মিটলে আমাদের জানান!`;
  }

  return `How to use Google Sign-In on OTL:

1. Click the **"My Account"** button in the top right header.
2. In the modal, click the **"Continue with Google"** button (featuring the Google icon).
3. A Google sign-in popup will open—select your Google account to authorize.
4. You will be logged in immediately without needing to remember a password.

💡 **Troubleshooting:** If the popup does not appear, check that your browser is not blocking popups or third-party authentication cookies. If issues persist, let me know or click "Report Problem".`;
}

/**
 * OTP Troubleshooting guide matching the real UI
 */
export function getOtpTroubleshootingSteps(replyLanguage: 'bangla' | 'english'): string {
  if (replyLanguage === 'bangla') {
    return `ইমেইলে OTP কোড না আসার প্রধান কারণ এবং সমাধান:

1. **Spam / Junk ফোল্ডার চেক করুন:** জিমেইলের **Spam**, **Junk** বা **Promotions** ফোল্ডার চেক করুন; কখনো কখনো ইমেইল সেখানে চলে যেতে পারে।
2. **ইমেইল বানানের নির্ভুলতা:** আপনি যে ইমেইল অ্যাড্রেসটি দিয়েছেন তাতে কোনো টাইপো বা ভুল বানান নেই তো?
3. **৬০ সেকেন্ড পর Resend:** কোড পাঠানোর পর ৬০ সেকেন্ডের একটি কাউন্টডাউন টাইমার থাকে। টাইমার শেষ হলে **"Resend Code"** বাটনে ক্লিক করে নতুন ওটিপি চেয়ে নিন।
4. **অস্থায়ী/ডিসপোজেবল ইমেইল নয়:** OTL সিকিউরিটি সিস্টেম কোনো ফেক বা টেম্পরারি ইমেইল গ্রহণ করে না। নিয়মিত ব্যবহারের জিমেইল দিন।
5. **কোডের মেয়াদ:** প্রতিটি OTP কোড **১০ মিনিট** পর্যন্ত কার্যকর থাকে।

এখনও কোড না পেলে বলুন—আপনি Login করছেন নাকি নতুন Account খুলছেন? অথবা ওপরে **"Report Problem"**-এ ক্লিক করে আমাদের সাপোর্ট টিমকে জানাতে পারেন।`;
  }

  return `Here is how to resolve Email OTP verification issues:

1. **Check Spam / Junk:** Look in your **Spam**, **Junk**, or **Promotions** folder, as automated emails can occasionally land there.
2. **Verify Email Spelling:** Confirm that your email address was entered without any typos.
3. **Wait for 60s Resend Timer:** After 60 seconds, the **"Resend Code"** button becomes clickable—click it to generate a fresh OTP.
4. **Use Real Email Domains:** OTL strictly blocks temporary/disposable email addresses for security. Use a valid personal Gmail/Outlook address.
5. **Code Validity:** Each 6-digit OTP code is active for **10 minutes**.

If you still do not receive it, let me know whether you are registering or resetting your password, or click **"Report Problem"** above!`;
}

/**
 * Step-by-step password recovery guide matching the real UI
 */
export function getPasswordResetSteps(replyLanguage: 'bangla' | 'english'): string {
  if (replyLanguage === 'bangla') {
    return `পাসওয়ার্ড ভুলে গেলে যেভাবে রিসেট করবেন:

1. ওপরের **"My Account"** বাটনে ক্লিক করে লগইন উইন্ডো খুলুন।
2. পাসওয়ার্ড ইনপুট বক্সের নিচে **"Forgot Password?"** লিংকে ক্লিক করুন।
3. আপনার নিবন্ধিত Email বা Username দিয়ে **"Send Reset Code"** চাপুন।
4. আপনার ইমেইলে আসা **৬ ডিজিটের রিসেট OTP কোড** ইনপুট করুন।
5. এরপর আপনার পছন্দমতো **নতুন পাসওয়ার্ড** সেট করে নিশ্চিত করুন।`;
  }

  return `To reset your forgotten password:

1. Click the **"My Account"** button in the top header.
2. Click the **"Forgot Password?"** link right below the password field.
3. Enter your registered Email or Username and submit.
4. Check your email for a **6-digit reset OTP code** and enter it.
5. Enter and confirm your **new password**.`;
}

/**
 * Real download steps matching OTL delivery via verified Telegram channel
 */
export function getDownloadSteps(replyLanguage: 'bangla' | 'english', productTitle?: string): string {
  const item = productTitle ? `**${productTitle}**` : 'OTL-এর যেকোনো রিসোর্স (MOD APK, Presets, Prompts)';
  if (replyLanguage === 'bangla') {
    return `${item} সম্পূর্ণ ফ্রিতে ডাউনলোড করার নিয়ম:

1. **প্রোডাক্ট কার্ডে ক্লিক করুন:** হোমপেজ বা ক্যাটাগরি থেকে পছন্দের ফাইলটির ওপর ক্লিক করলে বিস্তারিত বিবরণী ওপেন হবে।
2. **ফ্রি ডাউনলোড বাটনে চাপুন:** পপআপে থাকা **"Free Download"** বাটনে ক্লিক করুন। এটি আপনাকে আমাদের অফিসিয়াল ভেরিফায়েড টেলিগ্রাম চ্যানেলের সরাসরি ডাউনলোড পোস্টে নিয়ে যাবে: [https://t.me/OnlineTaskLab](https://t.me/OnlineTaskLab)
3. **অ্যান্ড্রয়েড পারমিশন:** ফোন ব্রাউজার বা টেলিগ্রাম থেকে ইনস্টল করতে সেটিংস থেকে **"Install Unknown Apps"** অন করে দিন।
4. **১০০% নিরাপদ:** OTL-এর প্রতিটি ফাইল ৭০+ অ্যান্টিভাইরাস ইঞ্জিন (VirusTotal) দিয়ে স্ক্যান করা এবং সম্পূর্ণ নিরাপদ।`;
  }

  const enItem = productTitle ? `**${productTitle}**` : 'any resource on OTL (MOD APKs, Presets, Prompts)';
  return `To download ${enItem} for free:

1. **Click on the Resource Card:** Open the product from the Home feed or Category page to see the details modal.
2. **Click Free Download:** Tap the **"Free Download"** button, which directs you to the verified download post on our official Telegram channel: [https://t.me/OnlineTaskLab](https://t.me/OnlineTaskLab).
3. **Enable Unknown Apps:** On Android, ensure **"Install Unknown Apps"** is toggled ON in your Settings > Security.
4. **VirusTotal Verified:** Every file hosted by OTL is thoroughly tested across 70+ antivirus engines and confirmed 100% clean.`;
}

/**
 * Payment clarification - strictly explaining that OTL is 100% free
 */
export function getPaymentClarification(replyLanguage: 'bangla' | 'english'): string {
  if (replyLanguage === 'bangla') {
    return `⚠️ **গুরুত্বপূর্ণ তথ্য:** Online Task Lab (OTL)-এর সকল অ্যাপ, প্রিসেট, প্রম্পট এবং ডাউনলোড **সম্পূর্ণ ১০০% ফ্রি**! 

আমরা কোনো রিসোর্সের জন্য কোনো টাকা, সাবস্ক্রিপশন ফি বা পেমেন্ট নেই না।

আপনি যদি OTL-এর নামে কাউকে কোনো পেমেন্ট দিয়ে থাকেন, তবে আপনি কোনো প্রতারক/স্ক্যামারের শিকার হয়ে থাকতে পারেন। বিষয়টি বিস্তারিতভাবে আমাদের জানান অথবা ওপরের **"Report Problem"** বা **"Talk to Human"** বাটনে চাপুন—আমাদের সাপোর্ট টিম এটি তদন্ত করে আপনাকে সাহায্য করবে।`;
  }

  return `⚠️ **Important Notice:** All applications, presets, prompts, and downloads on Online Task Lab (OTL) are **100% FREE**!

We never charge any subscription, purchase fee, or credit card payment for downloads.

If you made a payment to an external individual claiming to represent OTL, you may have encountered an unauthorized third-party scammer. Please provide more details or click **"Report Problem"** or **"Talk to Human"** above so our administrative team can review and assist you immediately.`;
}

/**
 * Technician Troubleshooting Guide for APK Installation Failure / Parse Error / Play Protect
 */
export function getApkInstallTroubleshootingSteps(replyLanguage: 'bangla' | 'english'): string {
  if (replyLanguage === 'bangla') {
    return `🛠️ **টেকনিশিয়ান ট্রাবলশুটিং গাইড: APK ইনস্টল না হলে যা করবেন**

১. **পুরনো ভার্সন আনইনস্টল করুন:** আপনার ফোনে এই অ্যাপটির কোনো পূর্ববর্তী বা অফিশিয়াল প্লে-স্টোর ভার্সন ইনস্টল থাকলে সেটি প্রথমে আনইনস্টল করুন (একই প্যাকেজ নামের ২টি অ্যাপ একসাথে ইনস্টল হতে পারে না)।
২. **অজানা সোর্স পারমিশন দিন:** ফোনের **Settings ➔ Apps ➔ Special App Access ➔ Install Unknown Apps**-এ গিয়ে আপনার ব্রাউজার বা ফাইল ম্যানেজারের পারমিশন চালু করুন।
৩. **স্টোরেজ খালি করুন:** আপনার ডিভাইসের ইন্টারনাল মেমোরিতে কমপক্ষে ১ জিবি খালি জায়গা নিশ্চিত করুন।
৪. **Google Play Protect নোটিশ:** যদি Play Protect ব্লক করে, **"Details" / "More info" ➔ "Install anyway (unsafe)"** সিলেক্ট করুন। (OTL-এর প্রতিটি APK VirusTotal-এ সম্পূর্ণ নিরাপদ প্রমাণিত, তবে মডিফায়েড সিগনেচারের কারণে এমন ওয়ার্নিং দেখাতে পারে)।
৫. **অ্যান্ড্রয়েড ভার্সন চেক:** নিশ্চিত করুন আপনার ফোনের অ্যান্ড্রয়েড ভার্সন অ্যাপটির জন্য উপযুক্ত (যেমন অ্যান্ড্রয়েড ৮.০ বা তার বেশি)।

❓ **এই ধাপগুলো কি আপনার সমস্যার সমাধান করেছে?** যদি এখনও সমস্যা থেকে থাকে, ওপরের **"Report Problem"** বাটনে ক্লিক করে একটি রিপোর্ট দিন অথবা আমাদের **"Talk to Human"** টিমের সাহায্য নিন।`;
  }

  return `🛠️ **Technician Troubleshooting Guide: APK Installation Failure**

1. **Uninstall Existing Versions:** If an official or older version of the same app is already installed, uninstall it first. Conflicting package signatures will prevent installation.
2. **Enable Unknown Sources:** Navigate to **Settings ➔ Apps ➔ Special app access ➔ Install unknown apps** on your Android device and allow permission for Chrome / your File Manager.
3. **Check Free Storage:** Ensure you have at least 1 GB of free internal device memory.
4. **Bypass Play Protect Warning:** If Google Play Protect flags the app, tap **"Details" / "More details" ➔ "Install anyway (unsafe)"**. OTL APKs are 100% VirusTotal-tested and clean, but modified keys trigger false-positive warnings.
5. **Verify Android OS Compatibility:** Verify that your phone meets the minimum OS requirement (e.g., Android 8.0+).

❓ **Did these steps resolve your issue?** If it is still not working, click **"Report Problem"** above to file a technician ticket or click **"Talk to Human"** for a specialist.`;
}

/**
 * Technician Troubleshooting Guide for Download Issues / Broken Links / Telegram Links
 */
export function getDownloadTroubleshootingSteps(replyLanguage: 'bangla' | 'english'): string {
  if (replyLanguage === 'bangla') {
    return `🛠️ **টেকনিশিয়ান ট্রাবলশুটিং গাইড: ডাউনলোড বা টেলিগ্রাম লিংক সমস্যা**

১. **টেলিগ্রাম অ্যাপ ইনস্টল করুন:** টেলিগ্রাম লিংক সবচেয়ে দ্রুত ও সঠিকভাবে ওপেন করতে আপনার ফোনে অফিসিয়াল Telegram অ্যাপ ইনস্টল ও লগইন করা থাকতে হবে।
২. **ব্রাউজার পরিবর্তন করুন:** যদি বিল্ট-ইন ব্রাউজারে লিংক লোড না হয়, লিংকটি কপি করে **Google Chrome** ব্রাউজারে পেস্ট করে সরাসরি ওপেন করুন।
৩. **ইন্টারনেট সংযোগ চেক করুন:** ভিপিএন (VPN) চালু থাকলে তা সাময়িকভাবে বন্ধ করে দেখতে পারেন, অথবা ওয়াই-ফাই থেকে মোবাইল ডেটাতে সুইচ করুন।
৪. **চ্যানেল থেকে সরাসরি সংগ্রহ:** আপনি সরাসরি আমাদের অফিসিয়াল চ্যানেলে গিয়ে ফাইলটি সার্চ করতে পারেন: [https://t.me/OnlineTaskLab](https://t.me/OnlineTaskLab)

❓ **লিংকটি কি এখনও কাজ করছে না?** যদি ফাইলটি এক্সপায়ার হয়ে থাকে, ওপরের **"Report Problem"** বাটনে চাপুন—আমাদের অ্যাডমিন অবিলম্বে ডাউনলোড লিংকটি আপডেট করে দেবেন।`;
  }

  return `🛠️ **Technician Troubleshooting Guide: Download / Telegram Link Issue**

1. **Install Official Telegram App:** Telegram direct download links open most reliably when the official Telegram app is installed and logged in on your device.
2. **Switch Browser:** If the link does not open in an embedded webview, copy the URL and paste it directly into **Google Chrome**.
3. **Network & VPN Settings:** If you are using an active VPN or proxy, temporarily toggle it off as it may block Telegram web gateways.
4. **Direct Channel Access:** You can search for the resource directly in our official verified channel: [https://t.me/OnlineTaskLab](https://t.me/OnlineTaskLab)

❓ **Is the file or link still inaccessible?** Click **"Report Problem"** above to file a report with our team, and our administrators will update the download link immediately.`;
}

/**
 * Technician Troubleshooting Guide for Account & Login Issues
 */
export function getAccountTroubleshootingSteps(replyLanguage: 'bangla' | 'english'): string {
  if (replyLanguage === 'bangla') {
    return `🛠️ **টেকনিশিয়ান ট্রাবলশুটিং গাইড: অ্যাকাউন্ট ও লগইন সমস্যা**

১. **Google 1-Click লগইন ট্রাই করুন:** ইমেইল ও পাসওয়ার্ডে সমস্যা হলে "My Account" ➔ **"Continue with Google"** বাটনে চাপ দিয়ে সরাসরি গুগল অ্যাকাউন্ট দিয়ে লগইন করুন। এটি সবচেয়ে সহজ ও ঝামেলাহীন পদ্ধতি।
২. **পাসওয়ার্ড ভুল বা ভুলে যাওয়া:** যদি পাসওয়ার্ড মনে না থাকে, "My Account" ➔ "Login" ➔ **"Forgot password?"** লিংকে ক্লিক করুন। আপনার জিমেইলে একটি ৬-সংখ্যার OTP কোড যাবে, কোডটি বসিয়ে নতুন পাসওয়ার্ড সেট করে নিন।
৩. **ইমেইল OTP না পেলে:** জিমেইলের **Spam**, **Junk** বা **Promotions** ফোল্ডার চেক করুন। ৬০ সেকেন্ড অপেক্ষা করে **"Resend Code"** বাটনে চাপুন।
৪. **ব্রাউজার ক্যাশ ও কুকি ক্লিয়ার:** ব্রাউজারের হিস্ট্রি ও ক্যাশ ক্লিয়ার করে পেজটি একবার রিলোড করুন (বা Incognito / প্রাইভেট উইন্ডোতে চেষ্টা করুন)।
৫. **পপআপ ব্লকার বন্ধ রাখুন:** Google লগইনের ক্ষেত্রে ব্রাউজারের পপআপ ব্লকার বা থার্ড-পার্টি কুকিজ ব্লক বন্ধ থাকা নিশ্চিত করুন।

❓ **সমস্যা কি এখনও কাটেনি?** ওপরের **"Report Problem"** বাটনে ক্লিক করে একটি রিপোর্ট দিন অথবা আমাদের সাথে সরাসরি কথা বলতে **"Talk to Human"** অপশন ব্যবহার করুন।`;
  }

  return `🛠️ **Technician Troubleshooting Guide: Account & Login Issue**

1. **Try Google 1-Click Sign-In:** If email and password authentication fails, click "My Account" ➔ **"Continue with Google"** for instant, password-free login.
2. **Forgot Password:** Click "My Account" ➔ "Login" ➔ **"Forgot password?"**. Enter your registered email to receive a 6-digit OTP code, then choose a fresh password.
3. **Missing OTP Code:** Check your Gmail's **Spam**, **Junk**, or **Promotions** folder. Wait for the 60-second timer to finish, then click **"Resend Code"**.
4. **Clear Browser Cache & Cookies:** Stale session tokens can cause authentication loops. Clear your browser cache and cookies, or try an Incognito / Private browsing window.
5. **Disable Popup Blockers:** Ensure third-party cookies and popup blockers are not preventing Google authentication modals from opening.

❓ **Still having trouble accessing your account?** Click **"Report Problem"** above to notify our support administrators or select **"Talk to Human"** to get direct assistance.`;
}
/**
 * Website-Aware Progressive Download Troubleshooting Guidance
 * Strictly adheres to OTL website reality:
 * 1. Account / Login is MANDATORY to download any app or preset
 * 2. If visitor is not logged in: provides precise account creation & login steps (with OTP & Google 1-click)
 * 3. If user is already logged in: does NOT tell them to login; diagnoses popup blockers, Telegram app, VPN, error details
 * 4. Grounded in live product status from database if available
 */
export function getDownloadProblemGuidance(params: {
  replyLanguage: 'bangla' | 'english';
  isAuthenticated: boolean;
  product?: {
    id: string;
    title: string;
    version?: string;
    fileSize?: string;
    status?: string;
    isActive?: boolean;
    telegramUrl?: string;
  } | null;
  userStatus?: string;
}): string {
  const { replyLanguage, isAuthenticated, product } = params;

  if (replyLanguage === 'bangla') {
    if (!isAuthenticated) {
      return `আপনার যদি Online Task Lab (OTL)-এ account খোলা বা লগইন করা না থাকে, তাহলে কোনো অ্যাপ বা রিসোর্স ডাউনলোড করা যাবে না। ওয়েবসাইটে ডাউনলোড চালু করতে প্রথমে একটি একাউন্ট তৈরি করুন অথবা আপনার বিদ্যমান একাউন্টে লগইন করুন। এরপর আবার ডাউনলোড বাটনে চাপুন।

### 📝 ধাপে ধাপে একাউন্ট তৈরি ও লগইন নির্দেশিকা:
১. **My Account-এ যান:** ওপরের নেভিগেশন বারের ডানদিকের **"My Account"** বাটনে ক্লিক করুন (অথবা নিচে থাকা [🔐 Login] বা [📝 Create Account] চাপুন)।
২. **Create Account ট্যাব:** আপনার First Name, Last Name, একটি ইউনিক Username এবং আপনার সচল Email এড্রেস প্রদান করুন।
৩. **পাসওয়ার্ড ও OTP যাচাইকরণ:** একটি শক্তিশালী পাসওয়ার্ড নির্বাচন করুন। আপনার ইমেইল ইনবক্সে একটি **৬-সংখ্যার ওটিপি (OTP) ভেরিফিকেশন কোড** পাঠানো হবে, সেটি সাবমিট করে একাউন্ট নিশ্চিত করুন।
৪. **অথবা Google Sign-In (সবচেয়ে দ্রুত ও সহজ):** কোনো পাসওয়ার্ড বা ইমেইল ওটিপি ছাড়াই instant একাউন্ট খুলতে **"Continue with Google"** বাটনে চাপুন।
৫. **ডাউনলোড শুরু করুন:** সফলভাবে লগইন হওয়ার পর যে অ্যাপ বা ফাইলটি ডাউনলোড করতে চান তার পেজে গিয়ে **"Download"** বা **"Free Download"** বাটনে চাপ দিন।

[🔐 Login] [📝 Create Account] [📥 Download] [🚨 Report Issue]`;
    }

    // Authenticated User
    const productInfoSection = product
      ? `📦 **অ্যাপ/ফাইল:** ${product.title} ${product.version ? `(ভার্সন: v${product.version})` : ''}\n` +
        `💾 **সাইজ:** ${product.fileSize || 'Standard'} | **স্ট্যাটাস:** ${product.isActive ? '✅ সক্রিয় ও ডাউনলোডের জন্য উন্মুক্ত' : '⚠️ সাময়িকভাবে অনুপলব্ধ'}\n\n`
      : '';

    return `আপনার OTL অ্যাকাউন্টটি সক্রিয় ও লগইন অবস্থায় রয়েছে। আপনি লগইন থাকা সত্ত্বেও ডাউনলোড না হওয়ার সম্ভাব্য কারণ এবং সমাধানের ধাপসমূহ নিচে দেওয়া হলো:

### 🛠️ টেকনিক্যাল ডায়াগনসিস ও ট্রাবলশুটিং ধাপ:
${productInfoSection}১. **ব্রাউজার পপআপ ব্লকার (Popup Blocker):** OTL-এর ডাউনলোড বাটনটিতে ক্লিক করলে টেলিগ্রাম ডাউনলোড উইন্ডো ওপেন হয়। ব্রাউজারের পপআপ ব্লকার সক্রিয় থাকলে এটি আটকে যেতে পারে। ব্রাউজারের অ্যাড্রেস বারে গিয়ে পপআপ 'Always Allow' বা অনুমোদন করুন।
২. **অফিসিয়াল টেলিগ্রাম অ্যাপ:** OTL-এর প্রতিটি ফাইল আমাদের ভেরিফায়েড Telegram চ্যানেল ([https://t.me/OnlineTaskLab](https://t.me/OnlineTaskLab)) থেকে নিরাপদে সরবরাহ করা হয়। আপনার ডিভাইসে অফিসিয়াল Telegram অ্যাপ ইনস্টল ও সাইন-ইন করা থাকলে ডাউনলোড লিংকে ক্লিক করলেই সরাসরি অ্যাপ ওপেন হবে।
৩. **ভিপিএন (VPN) ও অ্যাড-ব্লকার:** আপনার ডিভাইসে কোনো VPN বা অ্যাড-ব্লকার চালু থাকলে তা সাময়িকভাবে বন্ধ করুন অথবা মোবাইল ডেটা/ওয়াইফাই পরিবর্তন করে চেষ্টা করুন।
৪. **অ্যান্ড্রয়েড APK পারমিশন:** ডাউনলোড করা ফাইল ইনস্টল করতে আপনার ফোনের **Settings ➔ Apps ➔ Special App Access ➔ Install Unknown Apps** অপশনে পারমিশন চালু রাখুন।
৫. **স্ক্রিনশট বা এরর জানতে চাওয়া:** ডাউনলোড করার সময় কোনো নির্দিষ্ট এরর মেসেজ দেখাচ্ছে কি? সমস্যাটি স্পষ্ট বুঝতে নিচে একটি স্ক্রিনশট পাঠিয়ে দিন।

[📥 Download] [✈️ Telegram] [📸 Send Screenshot] [🚨 Report Issue] [👨‍💻 Human Support]`;
  }

  // English
  if (!isAuthenticated) {
    return `If you do not have an account or are not currently logged in on Online Task Lab (OTL), downloads cannot proceed. To download any app or resource, you must first create an account or sign in to your existing account.

### 📝 Step-by-Step Account Creation & Login Guide:
1. **Access My Account:** Click the **"My Account"** button in the top navigation bar (or use the [🔐 Login] / [📝 Create Account] buttons below).
2. **Select Create Account:** Fill in your First Name, Last Name, a unique Username, and your active Email address.
3. **Password & OTP Verification:** Set a secure password. A **6-digit verification OTP code** will be dispatched to your email—enter it to verify your account.
4. **Or Google Sign-In (Fastest 1-Click Method):** Click **"Continue with Google"** to instantly create an account and sign in without entering a password or waiting for an OTP.
5. **Start Downloading:** Once signed in, navigate to your desired app or file page and click the **"Download"** or **"Free Download"** button.

[🔐 Login] [📝 Create Account] [📥 Download] [🚨 Report Issue]`;
  }

  // Authenticated User
  const productInfoSectionEn = product
    ? `📦 **Resource:** ${product.title} ${product.version ? `(Version: v${product.version})` : ''}\n` +
      `💾 **Size:** ${product.fileSize || 'Standard'} | **Status:** ${product.isActive ? '✅ Active & Available' : '⚠️ Temporarily Unavailable'}\n\n`
    : '';

  return `Your OTL account is authenticated and active. Since you are already signed in, here is the technical diagnostic and step-by-step troubleshooting:

### 🛠️ Technical Diagnostic & Troubleshooting:
${productInfoSectionEn}1. **Browser Popup Blocker:** OTL triggers downloads by opening verified file links in a new window. Mobile browsers frequently block popups by default. Check your browser address bar and enable "Always allow popups" for this site.
2. **Official Telegram App:** All OTL verified files are delivered through our official Telegram channel ([https://t.me/OnlineTaskLab](https://t.me/OnlineTaskLab)). Having the official Telegram app installed and logged in on your device ensures instant one-tap file downloading.
3. **Network & VPN Settings:** If Telegram web links stall, temporarily turn off active VPNs or switch between Wi-Fi and mobile data.
4. **Android APK Permissions:** To install downloaded APK files, ensure **"Install Unknown Apps"** is enabled in your device **Settings ➔ Apps ➔ Special App Access**.
5. **Error Code / Screenshot:** If an error dialog is appearing on screen, please attach a screenshot using the button below.

[📥 Download] [✈️ Telegram] [📸 Send Screenshot] [🚨 Report Issue] [👨‍💻 Human Support]`;
}

export const getWebsiteAwareDownloadTroubleshooting = getDownloadProblemGuidance;

