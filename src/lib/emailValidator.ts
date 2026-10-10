/**
 * Online Task Lab - Real Email & Gmail Verification Engine
 * Validates authentic email domains, enforces strict Google/Gmail standards,
 * catches domain typos, and blocks temporary/disposable fake mail services.
 */

// Common disposable, temporary, and fake email providers
const DISPOSABLE_DOMAINS = new Set([
  '10minutemail.com',
  '10minutemail.net',
  '10minutemail.org',
  '10minutemail.co.uk',
  '10minutemail.de',
  '10mail.org',
  'tempmail.com',
  'temp-mail.org',
  'tempmail.net',
  'tempmailaddress.com',
  'tempinbox.com',
  'tempail.com',
  'tempm.com',
  'tmpmail.org',
  'tmpmail.net',
  'mailinator.com',
  'mailinator2.com',
  'mailin8r.com',
  'notmailinator.com',
  'guerrillamail.com',
  'guerrillamail.org',
  'guerrillamail.net',
  'guerrillamail.biz',
  'guerrillamail.de',
  'guerrillamailblock.com',
  'grr.la',
  'sharklasers.com',
  'spam4.me',
  'yopmail.com',
  'yopmail.fr',
  'yopmail.net',
  'trashmail.com',
  'trashmail.net',
  'trashmail.me',
  'trash-mail.com',
  'trash-mail.at',
  'dispostable.com',
  'getairmail.com',
  'fakeinbox.com',
  'fakemailgenerator.com',
  'fakemail.net',
  'fake-mail.org',
  'mohmal.com',
  'burnermail.io',
  'emailondeck.com',
  'crazymailing.com',
  'throwawaymail.com',
  'throwawayemailaddress.com',
  'maildrop.cc',
  'inboxbear.com',
  'mintemail.com',
  'nada.ltd',
  'getnada.com',
  'generator.email',
  'mytemp.email',
  'mytempemail.com',
  'mytrashmail.com',
  'emailfake.com',
  'disposablemail.com',
  'minutemailbox.com',
  'armyspy.com',
  'cuvox.de',
  'dayrep.com',
  'einrot.com',
  'fleckens.hu',
  'gustr.com',
  'jourrapide.com',
  'rhyta.com',
  'superrito.com',
  'teleworm.us',
  'mailnull.com',
  'dropmail.me',
  'binkmail.com',
  'bobmail.info',
  'chammy.info',
  'devnullmail.com',
  'letthemeatspam.com',
  'reallymymail.com',
  'reconmail.com',
  'safetymail.info',
  'sendspamhere.com',
  'sogetthis.com',
  'spambob.com',
  'spambob.net',
  'spambob.org',
  'spamevader.com',
  'spammotel.com',
  'spamthisplease.com',
  'suremail.info',
  'tradermail.info',
  'veryrealemail.com',
  'zippymail.info',
  'mailnesia.com',
  'trash-me.com',
  'jetable.org',
  'fastmail.fm',
  'wegwerfmail.de',
  'wegwerfemail.de',
  'noclickemail.com'
]);

// Common domain typos that users accidentally make when trying to type Gmail or other major providers
const DOMAIN_TYPOS: Record<string, string> = {
  'gamil.com': 'gmail.com',
  'gmial.com': 'gmail.com',
  'gmaill.com': 'gmail.com',
  'gmali.com': 'gmail.com',
  'gmai.com': 'gmail.com',
  'gmeil.com': 'gmail.com',
  'gmaul.com': 'gmail.com',
  'gmal.com': 'gmail.com',
  'gemail.com': 'gmail.com',
  'gmail.con': 'gmail.com',
  'gmail.cm': 'gmail.com',
  'gimail.com': 'gmail.com',
  'gmaild.com': 'gmail.com',
  'gmai.co': 'gmail.com',
  'gmaill.co': 'gmail.com',
  'gmail.co': 'gmail.com',
  'googlemail.con': 'googlemail.com',
  'yaho.com': 'yahoo.com',
  'yahooo.com': 'yahoo.com',
  'yaho.co': 'yahoo.com',
  'yahoo.con': 'yahoo.com',
  'hotmial.com': 'hotmail.com',
  'hotmai.com': 'hotmail.com',
  'hotmaill.com': 'hotmail.com',
  'hotmail.con': 'hotmail.com',
  'outlok.com': 'outlook.com',
  'outloo.com': 'outlook.com',
  'outlock.com': 'outlook.com',
  'outlook.con': 'outlook.com',
  'iclod.com': 'icloud.com',
  'iclou.com': 'icloud.com',
  'icloud.con': 'icloud.com'
};

// Known placeholder / fake user patterns
const FAKE_LOCAL_PARTS = new Set([
  'test',
  'fake',
  'admin',
  'user',
  'demo',
  'sample',
  'example',
  'asdf',
  'qwerty',
  '123456',
  '12345678',
  '111111',
  'aaaaaa',
  'abcdef',
  'noone',
  'none',
  'null',
  'temp',
  'xyz'
]);

export interface EmailValidationResult {
  isValid: boolean;
  isRealDomain: boolean;
  isGmail: boolean;
  cleanEmail: string;
  error?: string;
  suggestion?: string;
  details?: {
    username: string;
    domain: string;
  };
}

/**
 * Validates whether an email is a genuine, real email account.
 * Enforces Google's official Gmail account creation criteria and rejects fake/disposable providers.
 */
export function validateRealEmail(rawEmail: string): EmailValidationResult {
  const cleanEmail = (rawEmail || '').trim().toLowerCase();

  if (!cleanEmail) {
    return {
      isValid: false,
      isRealDomain: false,
      isGmail: false,
      cleanEmail: '',
      error: 'Please enter your email address.'
    };
  }

  // 1. Basic structural and RFC regex check
  const basicEmailRegex = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)+$/;
  if (!basicEmailRegex.test(cleanEmail)) {
    return {
      isValid: false,
      isRealDomain: false,
      isGmail: false,
      cleanEmail,
      error: 'Please enter a valid email format (e.g., yourname@gmail.com).'
    };
  }

  const parts = cleanEmail.split('@');
  if (parts.length !== 2) {
    return {
      isValid: false,
      isRealDomain: false,
      isGmail: false,
      cleanEmail,
      error: 'Email address must contain exactly one "@" symbol.'
    };
  }

  const [username, domain] = parts;

  // 2. Validate Domain structure & TLD
  const domainParts = domain.split('.');
  if (domainParts.length < 2) {
    return {
      isValid: false,
      isRealDomain: false,
      isGmail: false,
      cleanEmail,
      error: 'Invalid email domain. Please enter a complete domain (e.g., gmail.com).'
    };
  }

  const tld = domainParts[domainParts.length - 1];
  if (!tld || tld.length < 2 || !/^[a-z]+$/.test(tld)) {
    return {
      isValid: false,
      isRealDomain: false,
      isGmail: false,
      cleanEmail,
      error: 'Invalid top-level domain (TLD). Please provide a valid domain ending.'
    };
  }

  // 3. Catch common domain typos
  if (DOMAIN_TYPOS[domain]) {
    const suggestedDomain = DOMAIN_TYPOS[domain];
    const suggestedEmail = `${username}@${suggestedDomain}`;
    return {
      isValid: false,
      isRealDomain: false,
      isGmail: suggestedDomain === 'gmail.com',
      cleanEmail,
      error: `Typo detected in "@${domain}". Did you mean "${suggestedEmail}"?`,
      suggestion: suggestedEmail
    };
  }

  // 4. Block known disposable, temporary, and fake mail providers
  if (DISPOSABLE_DOMAINS.has(domain)) {
    return {
      isValid: false,
      isRealDomain: false,
      isGmail: false,
      cleanEmail,
      error: 'Temporary or disposable email addresses are not allowed. Please use your real, permanent Gmail or personal email address.'
    };
  }

  // 5. Block obvious fake/placeholder single-word usernames
  if (FAKE_LOCAL_PARTS.has(username) || /^([a-z0-9])\1{4,}$/.test(username)) {
    return {
      isValid: false,
      isRealDomain: false,
      isGmail: domain === 'gmail.com',
      cleanEmail,
      error: `"${cleanEmail}" এটি একটি ফেক বা ডেমো ইমেইল। দয়া করে আপনার আসল ও সচল জিমেইল একাউন্ট ব্যবহার করুন (Please use a real, genuine Gmail account).`
    };
  }

  const isGmail = domain === 'gmail.com' || domain === 'googlemail.com';

  // 6. Strict Gmail Account Rules (Google Official Criteria)
  if (isGmail) {
    // Gmail usernames must be between 6 and 30 characters
    if (username.length < 6) {
      return {
        isValid: false,
        isRealDomain: true,
        isGmail: true,
        cleanEmail,
        error: `জিমেইল ইউজারনেম কমপক্ষে ৬ থেকে ৩০ অক্ষরের হতে হবে (বর্তমানে ${username.length} অক্ষর)। Please enter a valid Gmail username.`
      };
    }

    if (username.length > 30) {
      return {
        isValid: false,
        isRealDomain: true,
        isGmail: true,
        cleanEmail,
        error: 'জিমেইল ইউজারনেম ৩০ অক্ষরের বেশি হতে পারবে না (Gmail username cannot exceed 30 characters).'
      };
    }

    // Gmail usernames can only contain letters (a-z), numbers (0-9), and periods (.)
    const gmailUsernameRegex = /^[a-z0-9.]+$/;
    if (!gmailUsernameRegex.test(username)) {
      return {
        isValid: false,
        isRealDomain: true,
        isGmail: true,
        cleanEmail,
        error: 'জিমেইল এড্রেসে কোনো স্পেশাল চিহ্ন বা স্পেস ব্যবহার করা যাবে না (শুধু অক্ষর, সংখ্যা ও ডট অনুমোদিত)।'
      };
    }

    // Gmail cannot begin or end with a period
    if (username.startsWith('.') || username.endsWith('.')) {
      return {
        isValid: false,
        isRealDomain: true,
        isGmail: true,
        cleanEmail,
        error: 'জিমেইল এড্রেস ডট (.) দিয়ে শুরু বা শেষ হতে পারবে না।'
      };
    }

    // Gmail cannot have consecutive periods
    if (username.includes('..')) {
      return {
        isValid: false,
        isRealDomain: true,
        isGmail: true,
        cleanEmail,
        error: 'জিমেইল এড্রেসে পরপর দুটি ডট (..) থাকা যাবে না।'
      };
    }
  }

  return {
    isValid: true,
    isRealDomain: true,
    isGmail,
    cleanEmail,
    details: {
      username,
      domain
    }
  };
}
