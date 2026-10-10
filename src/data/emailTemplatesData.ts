import { EmailTemplate, EmailSettings } from '../types';

export const initialEmailSettings: EmailSettings = {
  senderName: 'Online Task Lab (OTL Hub)',
  senderEmail: 'no-reply@onlinetasklab.com',
  replyToEmail: 'support@onlinetasklab.com',
  supportEmail: 'onlinetasklab@gmail.com',
  logoUrl: 'https://cdn-icons-png.flaticon.com/512/906/906343.png',
  brandName: 'Online Task Lab',
  brandColor: '#5DE2E7',
  secondaryColor: '#133E87',
  websiteUrl: 'https://onlinetasklab.com',
  apiKeyConfigured: false
};

export const initialEmailTemplates: EmailTemplate[] = [
  {
    id: 'tpl-email-verification',
    type: 'email-verification',
    name: 'Email Verification OTP',
    subject: 'Verify your email address — {{brand_name}}',
    heading: 'Verify Your Email Address',
    description: 'Hello {{first_name}},\n\nThank you for signing up for {{brand_name}}! Please use the 6-digit verification code below to verify your email address and activate your full account access.',
    otpBoxText: '{{otp}}',
    buttonText: 'Verify Email & Log In',
    buttonUrl: '{{website_url}}',
    footerText: 'If you did not create an account with {{brand_name}}, please ignore this email or contact support.',
    supportEmail: 'support@onlinetasklab.com',
    websiteUrl: 'https://onlinetasklab.com',
    logoUrl: '',
    brandName: 'Online Task Lab',
    backgroundColor: '#060B1E',
    containerColor: '#0B1D51',
    primaryColor: '#5DE2E7',
    textColor: '#E2E8F0',
    accentColor: '#133E87',
    borderRadius: '16px',
    fontSize: '14px',
    isActive: true,
    version: 1,
    updatedAt: new Date().toISOString()
  },
  {
    id: 'tpl-password-reset-otp',
    type: 'password-reset-otp',
    name: 'Password Reset OTP Code',
    subject: 'Reset your password — {{brand_name}}',
    heading: 'Reset Your Password',
    description: 'Hello {{first_name}},\n\nWe received a request to reset your password for your {{brand_name}} account (@{{username}}). Use the 6-digit verification code below to authorize your password update.',
    otpBoxText: '{{otp}}',
    buttonText: 'Reset Password',
    buttonUrl: '{{website_url}}',
    footerText: 'This verification code will expire in 10 minutes. If you did not request a password reset, please secure your account immediately.',
    supportEmail: 'support@onlinetasklab.com',
    websiteUrl: 'https://onlinetasklab.com',
    logoUrl: '',
    brandName: 'Online Task Lab',
    backgroundColor: '#060B1E',
    containerColor: '#0B1D51',
    primaryColor: '#5DE2E7',
    textColor: '#E2E8F0',
    accentColor: '#133E87',
    borderRadius: '16px',
    fontSize: '14px',
    isActive: true,
    version: 1,
    updatedAt: new Date().toISOString()
  },
  {
    id: 'tpl-welcome-email',
    type: 'welcome-email',
    name: 'Welcome to OTL Hub',
    subject: 'Welcome to {{brand_name}}! 🎉',
    heading: 'Welcome to {{brand_name}}',
    description: 'Hello {{first_name}},\n\nYour account (@{{username}}) is now fully activated! You now have unrestricted access to download premium Android mod APKs, curated AI prompts, high-converting landing page codes, and professional Lightroom presets.',
    buttonText: 'Explore Resources Feed',
    buttonUrl: '{{website_url}}',
    footerText: 'Join our official Telegram community for daily premium mod drops and 24/7 VIP assistance.',
    supportEmail: 'support@onlinetasklab.com',
    websiteUrl: 'https://onlinetasklab.com',
    logoUrl: '',
    brandName: 'Online Task Lab',
    backgroundColor: '#060B1E',
    containerColor: '#0B1D51',
    primaryColor: '#5DE2E7',
    textColor: '#E2E8F0',
    accentColor: '#133E87',
    borderRadius: '16px',
    fontSize: '14px',
    isActive: true,
    version: 1,
    updatedAt: new Date().toISOString()
  },
  {
    id: 'tpl-password-changed',
    type: 'password-changed',
    name: 'Security Alert: Password Changed',
    subject: 'Security Alert: Password Changed — {{brand_name}}',
    heading: 'Your Password Was Changed',
    description: 'Hello {{first_name}},\n\nThis is a security confirmation that the password for your account (@{{username}}) was successfully changed. If you made this change, you can safely disregard this email.',
    buttonText: 'Manage Account Security',
    buttonUrl: '{{website_url}}',
    footerText: 'If you DID NOT change your password, please contact support immediately to lock and recover your account.',
    supportEmail: 'support@onlinetasklab.com',
    websiteUrl: 'https://onlinetasklab.com',
    logoUrl: '',
    brandName: 'Online Task Lab',
    backgroundColor: '#060B1E',
    containerColor: '#0B1D51',
    primaryColor: '#EF4444',
    textColor: '#E2E8F0',
    accentColor: '#133E87',
    borderRadius: '16px',
    fontSize: '14px',
    isActive: true,
    version: 1,
    updatedAt: new Date().toISOString()
  },
  {
    id: 'tpl-account-suspended',
    type: 'account-suspended',
    name: 'Account Suspended Notice',
    subject: 'Notice: Account Suspended — {{brand_name}}',
    heading: 'Your Account Has Been Suspended',
    description: 'Hello {{first_name}},\n\nYour {{brand_name}} account (@{{username}}) has been temporarily suspended due to a violation of our community terms or security policy.',
    buttonText: 'Contact Support Desk',
    buttonUrl: 'mailto:support@onlinetasklab.com',
    footerText: 'If you believe this suspension is an error, please reach out to our administration team with your username.',
    supportEmail: 'support@onlinetasklab.com',
    websiteUrl: 'https://onlinetasklab.com',
    logoUrl: '',
    brandName: 'Online Task Lab',
    backgroundColor: '#060B1E',
    containerColor: '#0B1D51',
    primaryColor: '#F59E0B',
    textColor: '#E2E8F0',
    accentColor: '#133E87',
    borderRadius: '16px',
    fontSize: '14px',
    isActive: true,
    version: 1,
    updatedAt: new Date().toISOString()
  },
  {
    id: 'tpl-account-reactivated',
    type: 'account-reactivated',
    name: 'Account Reactivated Notice',
    subject: 'Good News: Your Account Has Been Reactivated — {{brand_name}}',
    heading: 'Your Account is Active Again',
    description: 'Hello {{first_name}},\n\nWe are pleased to inform you that your {{brand_name}} account (@{{username}}) has been reactivated. You can now log in and resume using all features and downloads.',
    buttonText: 'Log In to Your Account',
    buttonUrl: '{{website_url}}',
    footerText: 'Thank you for your patience and for being part of our community.',
    supportEmail: 'support@onlinetasklab.com',
    websiteUrl: 'https://onlinetasklab.com',
    logoUrl: '',
    brandName: 'Online Task Lab',
    backgroundColor: '#060B1E',
    containerColor: '#0B1D51',
    primaryColor: '#10B981',
    textColor: '#E2E8F0',
    accentColor: '#133E87',
    borderRadius: '16px',
    fontSize: '14px',
    isActive: true,
    version: 1,
    updatedAt: new Date().toISOString()
  },
  {
    id: 'tpl-login-notification',
    type: 'login-notification',
    name: 'Security Alert: New Sign-in',
    subject: 'Security Alert: New Sign-in to Your Account — {{brand_name}}',
    heading: 'New Sign-in Detected',
    description: 'Hello {{first_name}},\n\nWe detected a new sign-in to your {{brand_name}} account (@{{username}}). If this was you, no action is needed. If you did not sign in, please secure your account immediately.',
    buttonText: 'Open Online Task Lab',
    buttonUrl: '{{website_url}}',
    footerText: 'If you did not authorize this login, please reset your password immediately or contact our support team.',
    supportEmail: 'support@onlinetasklab.com',
    websiteUrl: 'https://onlinetasklab.com',
    logoUrl: '',
    brandName: 'Online Task Lab',
    backgroundColor: '#060B1E',
    containerColor: '#0B1D51',
    primaryColor: '#5DE2E7',
    textColor: '#E2E8F0',
    accentColor: '#133E87',
    borderRadius: '16px',
    fontSize: '14px',
    isActive: true,
    version: 1,
    updatedAt: new Date().toISOString()
  }
];

export interface EmailRenderVariables {
  first_name?: string;
  last_name?: string;
  username?: string;
  email?: string;
  otp?: string;
  verification_link?: string;
  reset_link?: string;
  brand_name?: string;
  support_email?: string;
  website_url?: string;
  current_year?: string;
}

/**
 * Replaces dynamic variables like {{first_name}}, {{otp}}, {{brand_name}} in a string
 */
export function replaceEmailVariables(text: string, vars: EmailRenderVariables): string {
  if (!text) return '';
  const defaults: EmailRenderVariables = {
    first_name: 'Friend',
    last_name: '',
    username: 'user',
    email: 'user@example.com',
    otp: '482731',
    verification_link: 'https://onlinetasklab.com/verify',
    reset_link: 'https://onlinetasklab.com/reset',
    brand_name: 'Online Task Lab',
    support_email: 'support@onlinetasklab.com',
    website_url: 'https://onlinetasklab.com',
    current_year: new Date().getFullYear().toString()
  };

  const merged = { ...defaults, ...vars };

  let result = text;
  Object.entries(merged).forEach(([key, val]) => {
    const regex = new RegExp(`{{${key}}}`, 'g');
    result = result.replace(regex, val || '');
  });

  return result;
}

/**
 * Generates an email-client safe, responsive HTML table layout for sending via SMTP/API
 */
export function generateEmailHtml(template: EmailTemplate, vars: EmailRenderVariables, settings?: EmailSettings): string {
  const brandName = vars.brand_name || template.brandName || settings?.brandName || 'Online Task Lab';
  const logoUrl = template.logoUrl || settings?.logoUrl || '';
  const subject = replaceEmailVariables(template.subject, vars);
  const heading = replaceEmailVariables(template.heading, vars);
  const description = replaceEmailVariables(template.description, vars).replace(/\n/g, '<br/>');
  const otpCode = vars.otp || '482731';
  const buttonText = template.buttonText ? replaceEmailVariables(template.buttonText, vars) : '';
  const buttonUrl = template.buttonUrl ? replaceEmailVariables(template.buttonUrl, vars) : 'https://onlinetasklab.com';
  const footerText = replaceEmailVariables(template.footerText || '', vars);
  const supportEmail = vars.support_email || template.supportEmail || settings?.supportEmail || 'support@onlinetasklab.com';
  const currentYear = new Date().getFullYear();

  const bg = template.backgroundColor || '#060B1E';
  const containerBg = template.containerColor || '#0B1D51';
  const primary = template.primaryColor || '#5DE2E7';
  const textColor = template.textColor || '#E2E8F0';

  const isOtpTemplate = template.type === 'email-verification' || template.type === 'password-reset-otp';

  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${subject}</title>
  <style>
    body, table, td, a { -webkit-text-size-adjust: 100%; -ms-text-size-adjust: 100%; }
    table, td { mso-table-lspace: 0pt; mso-table-rspace: 0pt; }
    img { -ms-interpolation-mode: bicubic; border: 0; height: auto; line-height: 100%; outline: none; text-decoration: none; }
    table { border-collapse: collapse !important; }
    body { height: 100% !important; margin: 0 !important; padding: 0 !important; width: 100% !important; background-color: ${bg}; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; }
    @keyframes otlGlowPulse {
      0% { transform: scale(1); box-shadow: 0 0 18px rgba(93,226,231,0.6), 0 0 35px rgba(0,240,255,0.3); }
      50% { transform: scale(1.05); box-shadow: 0 0 30px rgba(93,226,231,0.95), 0 0 50px rgba(0,240,255,0.6); }
      100% { transform: scale(1); box-shadow: 0 0 18px rgba(93,226,231,0.6), 0 0 35px rgba(0,240,255,0.3); }
    }
    .otl-logo-wrapper {
      animation: otlGlowPulse 3s ease-in-out infinite;
    }
  </style>
</head>
<body style="background-color: ${bg}; margin: 0; padding: 20px 10px; color: ${textColor};">
  <center>
    <table border="0" cellpadding="0" cellspacing="0" width="100%" style="max-width: 600px; background-color: ${containerBg}; border-radius: 16px; border: 1px solid rgba(93, 226, 231, 0.25); overflow: hidden; box-shadow: 0 10px 35px rgba(0,0,0,0.55);">
      <!-- Header / Animated Official OTL Logo -->
      <tr>
        <td align="center" style="padding: 34px 24px 22px; border-bottom: 1px solid rgba(255,255,255,0.08); background: linear-gradient(180deg, rgba(19, 62, 135, 0.45) 0%, rgba(11, 29, 81, 0.2) 100%);">
          <!-- Official OTL Animated Neon Logo -->
          <table border="0" cellpadding="0" cellspacing="0" align="center" style="margin: 0 auto 16px auto;">
            <tr>
              <td align="center" style="padding: 0;">
                <table border="0" cellpadding="0" cellspacing="0" style="margin: 0 auto;">
                  <tr>
                    <td align="center" style="width: 76px; height: 76px; border-radius: 50%; background-color: #050B1E; border: 2.5px solid #5DE2E7; box-shadow: 0 0 25px rgba(93, 226, 231, 0.8), 0 0 45px rgba(0, 240, 255, 0.4); padding: 0; overflow: hidden;">
                      <img 
                        src="/otl-logo-animated.gif" 
                        alt="OTL" 
                        width="76" 
                        height="76" 
                        style="display: block; width: 76px; height: 76px; border-radius: 50%; border: 0; outline: none; margin: 0 auto;"
                        onerror="this.onerror=null;this.src='https://ais-pre-ypmcljhijoronkwikuna6c-424140575667.asia-southeast1.run.app/otl-logo-animated.gif';"
                      />
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
          </table>

          <div style="font-size: 22px; font-weight: 800; color: #FFFFFF; letter-spacing: 0.5px;">
            ${brandName} <span style="font-size: 11px; background: rgba(93,226,231,0.2); color: ${primary}; border: 1px solid rgba(93,226,231,0.4); padding: 2px 6px; border-radius: 6px; text-transform: uppercase; vertical-align: middle; margin-left: 4px;">Hub</span>
          </div>
        </td>
      </tr>

      <!-- Body Content -->
      <tr>
        <td style="padding: 36px 32px 28px;">
          <h1 style="margin: 0 0 18px 0; font-size: 22px; font-weight: 700; color: #FFFFFF; text-align: center; letter-spacing: -0.3px;">
            ${heading}
          </h1>

          <div style="font-size: 15px; line-height: 1.6; color: ${textColor}; margin-bottom: 26px;">
            ${description}
          </div>

          ${isOtpTemplate ? `
          <!-- 6-Digit OTP Code Card -->
          <div style="text-align: center; margin: 28px 0; padding: 20px 16px; background: rgba(6, 11, 30, 0.8); border: 2px dashed ${primary}; border-radius: 14px;">
            <div style="font-size: 11px; text-transform: uppercase; font-weight: 700; color: ${primary}; letter-spacing: 2px; margin-bottom: 8px;">
              Your 6-Digit Verification Code
            </div>
            <div style="font-family: 'Courier New', Courier, monospace; font-size: 34px; font-weight: 900; letter-spacing: 8px; color: #FFFFFF; text-shadow: 0 0 15px rgba(93,226,231,0.6);">
              ${otpCode}
            </div>
            <div style="font-size: 12px; color: #94A3B8; margin-top: 8px;">
              Valid for 10 minutes • One-time use only
            </div>
          </div>
          ` : ''}

          ${buttonText ? `
          <!-- Action Button -->
          <table border="0" cellpadding="0" cellspacing="0" width="100%" style="margin: 28px 0;">
            <tr>
              <td align="center">
                <a href="${buttonUrl}" target="_blank" style="display: inline-block; padding: 14px 32px; background: linear-gradient(135deg, #133E87 0%, ${primary} 100%); color: #FFFFFF; font-size: 14px; font-weight: 800; text-decoration: none; border-radius: 12px; box-shadow: 0 4px 15px rgba(93,226,231,0.4); letter-spacing: 0.5px;">
                  ${buttonText}
                </a>
              </td>
            </tr>
          </table>
          ` : ''}

          ${footerText ? `
          <div style="font-size: 13px; color: #94A3B8; line-height: 1.5; padding: 16px; background: rgba(255,255,255,0.03); border-radius: 10px; border-left: 3px solid ${primary};">
            ${footerText}
          </div>
          ` : ''}
        </td>
      </tr>

      <!-- Footer -->
      <tr>
        <td style="padding: 24px 32px; border-top: 1px solid rgba(255,255,255,0.08); background: rgba(6, 11, 30, 0.6); text-align: center; font-size: 12px; color: #64748B;">
          <div style="color: #94A3B8; font-weight: 600; margin-bottom: 6px;">
            ${brandName} • Digital Resources Platform
          </div>
          <div>
            Need help? Contact <a href="mailto:${supportEmail}" style="color: ${primary}; text-decoration: none;">${supportEmail}</a>
          </div>
          <div style="margin-top: 10px; font-size: 11px; color: #475569;">
            © ${currentYear} ${brandName}. All rights reserved.
          </div>
        </td>
      </tr>
    </table>
  </center>
</body>
</html>
`;
}
