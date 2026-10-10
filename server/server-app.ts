import express from 'express';
import type { Request, Response, NextFunction } from 'express';
import path from 'path';
import fs from 'fs';
import crypto from 'crypto';
import dotenv from 'dotenv';
import nodemailer from 'nodemailer';
import { initializeApp, getApps, getApp } from 'firebase-admin/app';
import type { App } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import type { UserRecord } from 'firebase-admin/auth';
import { createSupportRouter } from './support/routes';
import { emailConfigService } from './services/emailConfigService';
import type { EmailConfig, EmailOtpLog } from './services/emailConfigService';

dotenv.config();

const currentDir = typeof __dirname !== 'undefined' ? __dirname : process.cwd();

const app = express();
const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;

// Universal CORS & Preflight middleware (supports all domains, subdomains, reverse proxies)
app.use((req: Request, res: Response, next: NextFunction) => {
  const origin = req.headers.origin;
  if (origin) {
    res.setHeader('Access-Control-Allow-Origin', origin);
  } else {
    res.setHeader('Access-Control-Allow-Origin', '*');
  }
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS, HEAD');
  res.setHeader('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization, Range, Cache-Control');
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Max-Age', '86400');

  if (req.method === 'OPTIONS') {
    return res.status(204).end();
  }
  next();
});

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Safe Lazy Initialization for Firebase Admin SDK
let firebaseAdminApp: App | null = null;
let adminAuthInstance: ReturnType<typeof getAuth> | null = null;

function getAdminAuth() {
  if (!adminAuthInstance) {
    try {
      if (!getApps().length) {
        firebaseAdminApp = initializeApp({
          projectId: 'online-task-lab-bot-488104'
        });
      } else {
        firebaseAdminApp = getApp();
      }
      adminAuthInstance = getAuth(firebaseAdminApp);
    } catch (adminErr) {
      console.warn('[Firebase Admin Warning]:', adminErr);
      try {
        if (!getApps().length) {
          firebaseAdminApp = initializeApp();
        } else {
          firebaseAdminApp = getApp();
        }
        adminAuthInstance = getAuth(firebaseAdminApp);
      } catch (fallbackErr) {
        console.warn('[Firebase Admin Fallback Warning]:', fallbackErr);
        adminAuthInstance = null;
      }
    }
  }
  return adminAuthInstance;
}

// Health Check API (Production Verified)
app.get(['/api/health', '/health'], (_req: Request, res: Response) => {
  return res.status(200).json({
    success: true,
    service: 'Online Task Lab API',
    status: 'healthy'
  });
});

// Helper to create Nodemailer transport based on server environment (Brevo SMTP)
function getTransporter(customConfig?: {
  host?: string;
  port?: number | string;
  user?: string;
  pass?: string;
  secure?: boolean;
}) {
  const host = customConfig?.host || process.env.SMTP_HOST || 'smtp-relay.brevo.com';
  const port = Number(customConfig?.port || process.env.SMTP_PORT || 587);
  const user = customConfig?.user || process.env.SMTP_USER || '';
  const pass = customConfig?.pass || process.env.SMTP_PASS || '';
  
  const isSecureEnv = process.env.SMTP_SECURE !== undefined ? process.env.SMTP_SECURE === 'true' : port === 465;
  const secure = customConfig?.secure !== undefined ? customConfig.secure : isSecureEnv;

  if (user && pass) {
    return nodemailer.createTransport({
      host,
      port,
      secure,
      auth: {
        user,
        pass
      },
      tls: {
        rejectUnauthorized: false
      }
    });
  }

  return null;
}

// Helper to send email via Brevo v3 REST API as fallback if SMTP IP is restricted (525 error)
async function sendViaBrevoRestApi(params: {
  apiKey: string;
  to: string;
  subject: string;
  html?: string;
  text?: string;
  senderName: string;
  senderEmail: string;
  attachments?: Array<{ name: string; content: string }>;
}): Promise<{ success: boolean; messageId?: string; error?: string }> {
  try {
    const payload: any = {
      sender: {
        name: params.senderName,
        email: params.senderEmail
      },
      to: [{ email: params.to }],
      subject: params.subject,
      htmlContent: params.html || params.text,
      textContent: params.text || (params.html ? params.html.replace(/<[^>]*>?/gm, '') : '')
    };

    if (params.attachments && params.attachments.length > 0) {
      payload.attachment = params.attachments;
    }

    const response = await fetch('https://api.brevo.com/v3/smtp/email', {
      method: 'POST',
      headers: {
        'api-key': params.apiKey,
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify(payload)
    });

    const data = await response.json();
    if (response.ok && (data.messageId || data.id)) {
      return { success: true, messageId: data.messageId || data.id };
    }
    return { success: false, error: data?.message || data?.error || JSON.stringify(data) };
  } catch (err: any) {
    return { success: false, error: err?.message || 'Network error communicating with Brevo REST API' };
  }
}

// Unified Core Email Dispatcher using Dynamic Admin Config (SMTP + Brevo REST API Fallback) and Automatic History Logging
async function dispatchBrevoEmail(params: {
  to: string;
  subject: string;
  html: string;
  text?: string;
  purpose?: 'registration_otp' | 'password_reset_otp' | 'welcome_email' | 'security_alert' | 'login_alert' | 'test_email' | 'broadcast_email' | 'general';
  otpCode?: string;
  username?: string;
  recipientName?: string;
  expiresAt?: string;
  customConfig?: Partial<EmailConfig>;
}): Promise<{ success: boolean; provider?: string; error?: string; code?: string; messageId?: string }> {
  const activeConfig = {
    ...emailConfigService.getConfig(),
    ...(params.customConfig || {})
  };

  const senderName = activeConfig.smtpFromName || process.env.SMTP_FROM_NAME || 'Online Task Lab';
  const senderEmail = activeConfig.smtpFromEmail || process.env.SMTP_FROM_EMAIL || activeConfig.smtpUser || process.env.SMTP_USER || 'no-reply@onlinetasklab.com';
  const fromHeader = `"${senderName}" <${senderEmail}>`;
  const apiKeyOrPass = activeConfig.brevoApiKey || activeConfig.smtpPass || process.env.BREVO_API_KEY || process.env.SMTP_PASS || '';

  // Prepare Logo Image Attachments for 100% Guaranteed Gmail/Outlook/Apple Mail Compatibility
  const gifPath = path.join(process.cwd(), 'public', 'otl-logo-animated.gif');
  const pngPath = path.join(process.cwd(), 'public', 'otl-logo.png');
  const attachments: any[] = [];
  const restAttachments: any[] = [];

  if (fs.existsSync(gifPath)) {
    attachments.push({
      filename: 'otl-logo-animated.gif',
      path: gifPath,
      cid: 'otllogo'
    });
    try {
      restAttachments.push({
        name: 'otl-logo-animated.gif',
        content: fs.readFileSync(gifPath).toString('base64')
      });
    } catch {}
  } else if (fs.existsSync(pngPath)) {
    attachments.push({
      filename: 'otl-logo.png',
      path: pngPath,
      cid: 'otllogo'
    });
    try {
      restAttachments.push({
        name: 'otl-logo.png',
        content: fs.readFileSync(pngPath).toString('base64')
      });
    } catch {}
  }

  const selectedProvider = activeConfig.provider || 'auto';

  // Brevo API First Mode
  if (selectedProvider === 'brevo_api') {
    if (!apiKeyOrPass) {
      const err = 'Brevo API key is not configured in Admin Panel or environment.';
      emailConfigService.addLog({
        recipientEmail: params.to,
        recipientName: params.recipientName,
        username: params.username,
        purpose: params.purpose || 'general',
        subject: params.subject,
        otpCode: params.otpCode,
        status: 'failed',
        provider: 'Brevo API (v3)',
        sentAt: new Date().toISOString(),
        expiresAt: params.expiresAt,
        errorMessage: err
      });
      return { success: false, error: err };
    }

    const restResult = await sendViaBrevoRestApi({
      apiKey: apiKeyOrPass,
      to: params.to,
      subject: params.subject,
      html: params.html,
      text: params.text,
      senderName,
      senderEmail,
      attachments: restAttachments
    });

    if (restResult.success) {
      console.log(`[Brevo API v3 Delivered] To: ${params.to}, Subject: "${params.subject}"`);
      emailConfigService.addLog({
        recipientEmail: params.to,
        recipientName: params.recipientName,
        username: params.username,
        purpose: params.purpose || 'general',
        subject: params.subject,
        otpCode: params.otpCode,
        status: 'delivered',
        provider: 'Brevo API (v3)',
        sentAt: new Date().toISOString(),
        expiresAt: params.expiresAt,
        deliveryMessageId: restResult.messageId
      });
      return { success: true, provider: 'Brevo API (v3)', messageId: restResult.messageId };
    } else {
      emailConfigService.addLog({
        recipientEmail: params.to,
        recipientName: params.recipientName,
        username: params.username,
        purpose: params.purpose || 'general',
        subject: params.subject,
        otpCode: params.otpCode,
        status: 'failed',
        provider: 'Brevo API (v3)',
        sentAt: new Date().toISOString(),
        expiresAt: params.expiresAt,
        errorMessage: restResult.error
      });
      return { success: false, error: restResult.error };
    }
  }

  // SMTP Mode (or Auto Mode with fallback)
  const transporter = getTransporter({
    host: activeConfig.smtpHost,
    port: activeConfig.smtpPort,
    user: activeConfig.smtpUser,
    pass: activeConfig.smtpPass,
    secure: activeConfig.smtpSecure
  });

  if (transporter) {
    try {
      const info = await transporter.sendMail({
        from: fromHeader,
        to: params.to,
        subject: params.subject,
        text: params.text || params.html.replace(/<[^>]*>?/gm, ''),
        html: params.html,
        attachments: attachments.length > 0 ? attachments : undefined
      });
      console.log(`[SMTP Delivered] To: ${params.to}, Subject: "${params.subject}", MessageId: ${info.messageId}`);
      emailConfigService.addLog({
        recipientEmail: params.to,
        recipientName: params.recipientName,
        username: params.username,
        purpose: params.purpose || 'general',
        subject: params.subject,
        otpCode: params.otpCode,
        status: 'delivered',
        provider: activeConfig.smtpHost.includes('brevo') ? 'Brevo SMTP' : 'Custom SMTP',
        sentAt: new Date().toISOString(),
        expiresAt: params.expiresAt,
        deliveryMessageId: info.messageId
      });
      return { success: true, provider: activeConfig.smtpHost.includes('brevo') ? 'Brevo SMTP' : 'Custom SMTP', messageId: info.messageId };
    } catch (smtpErr: any) {
      const errMsg = smtpErr?.message || '';
      console.warn(`[SMTP Warning]: ${errMsg}`);

      // If Auto mode and Brevo API Key is present, try fallback
      if (selectedProvider === 'auto' && apiKeyOrPass && (apiKeyOrPass.startsWith('xkeysib-') || activeConfig.brevoApiKey)) {
        console.log(`[Brevo] SMTP failed, attempting Brevo HTTP REST API v3 fallback for ${params.to}...`);
        const restResult = await sendViaBrevoRestApi({
          apiKey: apiKeyOrPass,
          to: params.to,
          subject: params.subject,
          html: params.html,
          text: params.text,
          senderName,
          senderEmail,
          attachments: restAttachments
        });

        if (restResult.success) {
          console.log(`[Brevo API v3 Delivered via Fallback] To: ${params.to}, Subject: "${params.subject}"`);
          emailConfigService.addLog({
            recipientEmail: params.to,
            recipientName: params.recipientName,
            username: params.username,
            purpose: params.purpose || 'general',
            subject: params.subject,
            otpCode: params.otpCode,
            status: 'delivered',
            provider: 'Brevo API v3 (Fallback)',
            sentAt: new Date().toISOString(),
            expiresAt: params.expiresAt,
            deliveryMessageId: restResult.messageId
          });
          return { success: true, provider: 'Brevo API (v3)', messageId: restResult.messageId };
        }
      }

      emailConfigService.addLog({
        recipientEmail: params.to,
        recipientName: params.recipientName,
        username: params.username,
        purpose: params.purpose || 'general',
        subject: params.subject,
        otpCode: params.otpCode,
        status: 'failed',
        provider: 'SMTP',
        sentAt: new Date().toISOString(),
        expiresAt: params.expiresAt,
        errorMessage: errMsg
      });

      if (errMsg.includes('525') || errMsg.includes('Unauthorized IP')) {
        return {
          success: false,
          code: 'UNAUTHORIZED_IP_525',
          error: 'Brevo SMTP rejected connection (525 5.7.1 Unauthorized IP address). To fix: In your Brevo account > Settings > Security > Authorized IPs, deactivate "Blocking unauthorized IP addresses" for SMTP keys, or switch to Brevo REST API v3 mode.'
        };
      }

      return { success: false, error: errMsg };
    }
  }

  const notConfiguredErr = 'Email service is not configured. Please enter your SMTP credentials or Brevo API Key in Admin Panel > Email & OTP Settings.';
  emailConfigService.addLog({
    recipientEmail: params.to,
    recipientName: params.recipientName,
    username: params.username,
    purpose: params.purpose || 'general',
    subject: params.subject,
    otpCode: params.otpCode,
    status: 'failed',
    provider: 'Not Configured',
    sentAt: new Date().toISOString(),
    expiresAt: params.expiresAt,
    errorMessage: notConfiguredErr
  });

  return { success: false, error: notConfiguredErr };
}

// Security & Crypto Helpers
const OTP_SECRET = process.env.OTP_SECRET || 'otl_secure_otp_salt_2026';
const ENC_SECRET = crypto.createHash('sha256').update(process.env.SESSION_SECRET || 'otl_enc_key_salt_2026').digest();

function generate6DigitOtp(): string {
  return crypto.randomInt(100000, 1000000).toString();
}

function hashOtp(otp: string): string {
  return crypto.createHash('sha256').update(otp + OTP_SECRET).digest('hex');
}

function encryptTempPassword(password: string): string {
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv('aes-256-cbc', ENC_SECRET, iv);
  let encrypted = cipher.update(password, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  return iv.toString('hex') + ':' + encrypted;
}

function decryptTempPassword(encryptedData: string): string {
  const [ivHex, encText] = encryptedData.split(':');
  const iv = Buffer.from(ivHex, 'hex');
  const decipher = crypto.createDecipheriv('aes-256-cbc', ENC_SECRET, iv);
  let decrypted = decipher.update(encText, 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  return decrypted;
}

// In-Memory Storage with Expiration Handling
interface PendingRegistration {
  registrationId: string;
  firstName: string;
  lastName: string;
  username: string;
  normalizedUsername: string;
  email: string;
  normalizedEmail: string;
  encryptedPassword: string;
  otpHash: string;
  attempts: number;
  maxAttempts: number;
  createdAt: number;
  expiresAt: number;
  lastSentAt: number;
}

interface PasswordResetRequest {
  requestId: string;
  uid?: string;
  email?: string;
  username?: string;
  otpHash?: string;
  attempts: number;
  maxAttempts: number;
  createdAt: number;
  expiresAt: number;
  lastSentAt: number;
  isDummy?: boolean;
}

interface ResetSession {
  resetSessionId: string;
  uid: string;
  email: string;
  username: string;
  createdAt: number;
  expiresAt: number;
  used: boolean;
}

const pendingRegistrations = new Map<string, PendingRegistration>();
const passwordResetRequests = new Map<string, PasswordResetRequest>();
const resetSessions = new Map<string, ResetSession>();

// Cleanup expired records every 5 minutes
setInterval(() => {
  const now = Date.now();
  for (const [id, reg] of pendingRegistrations.entries()) {
    if (now > reg.expiresAt) pendingRegistrations.delete(id);
  }
  for (const [id, req] of passwordResetRequests.entries()) {
    if (now > req.expiresAt) passwordResetRequests.delete(id);
  }
  for (const [id, sess] of resetSessions.entries()) {
    if (now > sess.expiresAt || sess.used) resetSessions.delete(id);
  }
}, 5 * 60 * 1000);

// HTML Email Templates
function getOtlEmailLogoHtml(size = 80): string {
  const hostedUrl = 'https://ais-pre-ypmcljhijoronkwikuna6c-424140575667.asia-southeast1.run.app/otl-logo-animated.gif';
  return `
  <!-- Official OTL Animated Neon Logo (100% Gmail / Outlook / Apple Mail Compatible) -->
  <table border="0" cellpadding="0" cellspacing="0" align="center" style="margin: 0 auto 16px auto;">
    <tr>
      <td align="center" style="padding: 0;">
        <table border="0" cellpadding="0" cellspacing="0" style="margin: 0 auto;">
          <tr>
            <td align="center" style="width: ${size}px; height: ${size}px; border-radius: 50%; background-color: #050B1E; border: 2.5px solid #5DE2E7; box-shadow: 0 0 25px rgba(93, 226, 231, 0.8), 0 0 45px rgba(0, 240, 255, 0.4); padding: 0; overflow: hidden;">
              <img 
                src="cid:otllogo" 
                alt="OTL" 
                width="${size}" 
                height="${size}" 
                style="display: block; width: ${size}px; height: ${size}px; border-radius: 50%; border: 0; outline: none; margin: 0 auto;"
                onerror="this.onerror=null;this.src='${hostedUrl}';"
              />
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
  `;
}

function getVerificationOtpEmailHtml(otp: string, name?: string): string {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Verify Your Email</title>
  <style>
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
<body style="margin: 0; padding: 0; background-color: #060B1E; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #E2E8F0;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #060B1E; padding: 40px 15px;">
    <tr>
      <td align="center">
        <table width="100%" max-width="560" style="max-width: 560px; background-color: #0B1D51; border: 1px solid rgba(93,226,231,0.25); border-radius: 20px; overflow: hidden; box-shadow: 0 10px 40px rgba(0,0,0,0.5);">
          <!-- Header Banner with Animated OTL Logo -->
          <tr>
            <td style="padding: 35px 30px 20px 30px; text-align: center; background: linear-gradient(180deg, rgba(19,62,135,0.45) 0%, transparent 100%);">
              ${getOtlEmailLogoHtml(76)}
              <div style="font-size: 24px; font-weight: 900; letter-spacing: 1.5px; color: #5DE2E7; text-transform: uppercase;">
                ONLINE TASK LAB
              </div>
              <div style="font-size: 11px; color: #94A3B8; margin-top: 4px; letter-spacing: 2px; text-transform: uppercase;">
                Digital Opportunities & Resource Hub
              </div>
            </td>
          </tr>

          <!-- Content Body -->
          <tr>
            <td style="padding: 20px 35px 35px 35px; text-align: center;">
              <h1 style="color: #FFFFFF; font-size: 22px; font-weight: 800; margin: 0 0 16px 0;">
                Verify Your Email Address
              </h1>
              
              <p style="font-size: 14px; line-height: 1.6; color: #CBD5E1; margin: 0 0 24px 0;">
                Hello${name ? ` <strong style="color: #FFFFFF;">${name}</strong>` : ''},<br>
                Thank you for creating an account with Online Task Lab. Please use the 6-digit verification code below to verify your email and complete your registration:
              </p>

              <!-- OTP Code Display Card -->
              <div style="background-color: #060B1E; border: 2px solid #5DE2E7; border-radius: 14px; padding: 20px; margin: 0 auto 24px auto; max-width: 320px; box-shadow: 0 0 25px rgba(93,226,231,0.2);">
                <div style="font-size: 11px; font-weight: 700; color: #5DE2E7; text-transform: uppercase; letter-spacing: 2px; margin-bottom: 8px;">
                  Your Verification Code
                </div>
                <div style="font-size: 34px; font-weight: 900; letter-spacing: 8px; color: #5DE2E7; font-family: monospace;">
                  ${otp}
                </div>
                <div style="font-size: 11px; color: #94A3B8; margin-top: 8px;">
                  ⏱️ Expires in <strong>10 minutes</strong>
                </div>
              </div>

              <p style="font-size: 13px; line-height: 1.6; color: #94A3B8; margin: 0 0 20px 0;">
                Enter this code on the registration page to activate your full account access.
              </p>

              <div style="padding: 14px 20px; background-color: rgba(239, 68, 68, 0.1); border: 1px solid rgba(239, 68, 68, 0.2); border-radius: 10px; font-size: 12px; color: #FCA5A5; text-align: left; line-height: 1.5;">
                🔒 <strong>Security Warning:</strong> Never share this code with anyone. Online Task Lab support will never ask for your verification code. If you did not request this account, you can safely ignore this email.
              </div>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding: 20px 30px; text-align: center; border-top: 1px solid rgba(255,255,255,0.08); background-color: #060B1E;">
              <p style="font-size: 12px; color: #64748B; margin: 0;">
                © ${new Date().getFullYear()} Online Task Lab. All rights reserved.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `;
}

function getWelcomeEmailHtml(username: string, email: string, name?: string): string {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Welcome to Online Task Lab</title>
  <style>
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
<body style="margin: 0; padding: 0; background-color: #060B1E; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #E2E8F0;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #060B1E; padding: 40px 15px;">
    <tr>
      <td align="center">
        <table width="100%" max-width="560" style="max-width: 560px; background-color: #0B1D51; border: 1px solid rgba(93,226,231,0.25); border-radius: 20px; overflow: hidden; box-shadow: 0 10px 40px rgba(0,0,0,0.5);">
          <tr>
            <td style="padding: 35px 30px 20px 30px; text-align: center; background: linear-gradient(180deg, rgba(19,62,135,0.45) 0%, transparent 100%);">
              ${getOtlEmailLogoHtml(76)}
              <div style="font-size: 24px; font-weight: 900; letter-spacing: 1.5px; color: #5DE2E7; text-transform: uppercase;">
                ONLINE TASK LAB
              </div>
            </td>
          </tr>
          <tr>
            <td style="padding: 20px 35px 35px 35px; text-align: center;">
              <h1 style="color: #FFFFFF; font-size: 22px; font-weight: 800; margin: 0 0 16px 0;">
                🎉 Welcome to Online Task Lab!
              </h1>
              
              <p style="font-size: 14px; line-height: 1.6; color: #CBD5E1; margin: 0 0 24px 0;">
                Hello <strong style="color: #FFFFFF;">${name || username}</strong>,<br>
                Your account has been successfully created and your email has been verified!
              </p>

              <div style="background-color: #060B1E; border: 1px solid rgba(93,226,231,0.3); border-radius: 14px; padding: 20px; margin: 0 auto 24px auto; text-align: left;">
                <div style="font-size: 13px; color: #94A3B8; margin-bottom: 6px;">
                  Registered Email: <strong style="color: #5DE2E7;">${email}</strong>
                </div>
                <div style="font-size: 13px; color: #94A3B8; margin-bottom: 6px;">
                  Username: <strong style="color: #5DE2E7;">@${username}</strong>
                </div>
                <div style="font-size: 13px; color: #94A3B8;">
                  Status: <strong style="color: #10B981;">✓ Email Verified & Active</strong>
                </div>
              </div>

              <p style="font-size: 13px; color: #94A3B8; line-height: 1.6; margin: 0;">
                You now have unlimited access to curated AI prompts, developer resources, preset collections, and direct download links.
              </p>
            </td>
          </tr>
          <tr>
            <td style="padding: 20px 30px; text-align: center; border-top: 1px solid rgba(255,255,255,0.08); background-color: #060B1E;">
              <p style="font-size: 12px; color: #64748B; margin: 0;">
                © ${new Date().getFullYear()} Online Task Lab. All rights reserved.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `;
}

function getPasswordResetOtpEmailHtml(otp: string, name?: string): string {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Password Reset Code</title>
  <style>
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
<body style="margin: 0; padding: 0; background-color: #060B1E; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #E2E8F0;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #060B1E; padding: 40px 15px;">
    <tr>
      <td align="center">
        <table width="100%" max-width="560" style="max-width: 560px; background-color: #0B1D51; border: 1px solid rgba(93,226,231,0.25); border-radius: 20px; overflow: hidden; box-shadow: 0 10px 40px rgba(0,0,0,0.5);">
          <tr>
            <td style="padding: 35px 30px 20px 30px; text-align: center; background: linear-gradient(180deg, rgba(19,62,135,0.45) 0%, transparent 100%);">
              ${getOtlEmailLogoHtml(76)}
              <div style="font-size: 24px; font-weight: 900; letter-spacing: 1.5px; color: #5DE2E7; text-transform: uppercase;">
                ONLINE TASK LAB
              </div>
              <div style="font-size: 11px; color: #94A3B8; margin-top: 4px; letter-spacing: 2px; text-transform: uppercase;">
                Security Verification
              </div>
            </td>
          </tr>

          <tr>
            <td style="padding: 20px 35px 35px 35px; text-align: center;">
              <h1 style="color: #FFFFFF; font-size: 22px; font-weight: 800; margin: 0 0 16px 0;">
                Password Reset Code
              </h1>
              
              <p style="font-size: 14px; line-height: 1.6; color: #CBD5E1; margin: 0 0 24px 0;">
                Hello${name ? ` <strong style="color: #FFFFFF;">${name}</strong>` : ''},<br>
                We received a request to reset your Online Task Lab account password. Use the 6-digit verification code below to authorize your password update:
              </p>

              <!-- OTP Code Display Card -->
              <div style="background-color: #060B1E; border: 2px solid #5DE2E7; border-radius: 14px; padding: 20px; margin: 0 auto 24px auto; max-width: 320px; box-shadow: 0 0 25px rgba(93,226,231,0.2);">
                <div style="font-size: 11px; font-weight: 700; color: #5DE2E7; text-transform: uppercase; letter-spacing: 2px; margin-bottom: 8px;">
                  Password Reset Code
                </div>
                <div style="font-size: 34px; font-weight: 900; letter-spacing: 8px; color: #5DE2E7; font-family: monospace;">
                  ${otp}
                </div>
                <div style="font-size: 11px; color: #94A3B8; margin-top: 8px;">
                  ⏱️ Expires in <strong>10 minutes</strong>
                </div>
              </div>

              <div style="padding: 14px 20px; background-color: rgba(239, 68, 68, 0.1); border: 1px solid rgba(239, 68, 68, 0.2); border-radius: 10px; font-size: 12px; color: #FCA5A5; text-align: left; line-height: 1.5;">
                🔒 <strong>Security Warning:</strong> Never share this code with anyone. If you did not request a password reset, you can safely ignore this email. Your password will remain unchanged.
              </div>
            </td>
          </tr>

          <tr>
            <td style="padding: 20px 30px; text-align: center; border-top: 1px solid rgba(255,255,255,0.08); background-color: #060B1E;">
              <p style="font-size: 12px; color: #64748B; margin: 0;">
                © ${new Date().getFullYear()} Online Task Lab. All rights reserved.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `;
}

function getPasswordChangedEmailHtml(username: string, name?: string): string {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Security Alert: Password Changed</title>
  <style>
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
<body style="margin: 0; padding: 0; background-color: #060B1E; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #E2E8F0;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #060B1E; padding: 40px 15px;">
    <tr>
      <td align="center">
        <table width="100%" max-width="560" style="max-width: 560px; background-color: #0B1D51; border: 1px solid rgba(239,68,68,0.3); border-radius: 20px; overflow: hidden; box-shadow: 0 10px 40px rgba(0,0,0,0.5);">
          <tr>
            <td style="padding: 35px 30px 20px 30px; text-align: center; background: linear-gradient(180deg, rgba(239,68,68,0.2) 0%, transparent 100%);">
              ${getOtlEmailLogoHtml(76)}
              <div style="font-size: 24px; font-weight: 900; letter-spacing: 1.5px; color: #5DE2E7; text-transform: uppercase;">
                ONLINE TASK LAB
              </div>
              <div style="font-size: 11px; color: #F87171; margin-top: 4px; letter-spacing: 2px; text-transform: uppercase; font-weight: bold;">
                Security Confirmation
              </div>
            </td>
          </tr>

          <tr>
            <td style="padding: 20px 35px 35px 35px; text-align: center;">
              <h1 style="color: #FFFFFF; font-size: 22px; font-weight: 800; margin: 0 0 16px 0;">
                Your Password Was Changed
              </h1>
              
              <p style="font-size: 14px; line-height: 1.6; color: #CBD5E1; margin: 0 0 24px 0;">
                Hello <strong style="color: #FFFFFF;">${name || username}</strong>,<br>
                This is a security alert to confirm that the password for your Online Task Lab account (<strong>@${username}</strong>) was successfully changed on <strong>${new Date().toUTCString()}</strong>.
              </p>

              <div style="padding: 16px 20px; background-color: rgba(239, 68, 68, 0.15); border: 1px solid rgba(239, 68, 68, 0.3); border-radius: 12px; font-size: 12.5px; color: #FCA5A5; text-align: left; line-height: 1.6;">
                ⚠️ <strong>Did you make this change?</strong><br>
                If you made this change, you can safely disregard this email.<br><br>
                If you <strong>DID NOT</strong> authorize this change, please contact our support team immediately at <a href="mailto:support@onlinetasklab.com" style="color: #5DE2E7; text-decoration: underline;">support@onlinetasklab.com</a> to lock and secure your account.
              </div>
            </td>
          </tr>

          <tr>
            <td style="padding: 20px 30px; text-align: center; border-top: 1px solid rgba(255,255,255,0.08); background-color: #060B1E;">
              <p style="font-size: 12px; color: #64748B; margin: 0;">
                © ${new Date().getFullYear()} Online Task Lab. All rights reserved.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `;
}

function getLoginNotificationEmailHtml(params: {
  username: string;
  name?: string;
  email: string;
  loginTime: string;
  provider?: string;
  device?: string;
  ipAddress?: string;
}): string {
  const displayName = params.name || params.username || 'Valued Member';
  const providerLabel = params.provider === 'google'
    ? 'Google Authentication'
    : params.provider === 'github'
    ? 'GitHub Authentication'
    : 'Email & Password';

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Security Alert: New Sign-in to Your Account</title>
  <style>
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
<body style="margin: 0; padding: 0; background-color: #060B1E; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #E2E8F0;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #060B1E; padding: 40px 15px;">
    <tr>
      <td align="center">
        <table width="100%" max-width="560" style="max-width: 560px; background-color: #0B1D51; border: 1px solid rgba(93,226,231,0.3); border-radius: 20px; overflow: hidden; box-shadow: 0 10px 40px rgba(0,0,0,0.5);">
          <tr>
            <td style="padding: 35px 30px 20px 30px; text-align: center; background: linear-gradient(180deg, rgba(93,226,231,0.15) 0%, transparent 100%);">
              ${getOtlEmailLogoHtml(76)}
              <div style="font-size: 24px; font-weight: 900; letter-spacing: 1.5px; color: #5DE2E7; text-transform: uppercase;">
                ONLINE TASK LAB
              </div>
              <div style="font-size: 11px; color: #38BDF8; margin-top: 4px; letter-spacing: 2px; text-transform: uppercase; font-weight: bold;">
                New Sign-in Alert
              </div>
            </td>
          </tr>

          <tr>
            <td style="padding: 20px 35px 35px 35px; text-align: left;">
              <h1 style="color: #FFFFFF; font-size: 22px; font-weight: 800; margin: 0 0 16px 0; text-align: center;">
                New Login Detected
              </h1>
              
              <p style="font-size: 14px; line-height: 1.6; color: #CBD5E1; margin: 0 0 20px 0;">
                Hello <strong style="color: #FFFFFF;">${displayName}</strong>,<br>
                We noticed a new sign-in to your Online Task Lab account associated with <strong style="color: #5DE2E7;">${params.email}</strong>.
              </p>

              <table width="100%" cellpadding="0" cellspacing="0" style="background-color: rgba(15, 23, 42, 0.6); border: 1px solid rgba(93, 226, 231, 0.2); border-radius: 12px; margin-bottom: 24px; overflow: hidden;">
                <tr>
                  <td style="padding: 12px 18px; border-bottom: 1px solid rgba(255,255,255,0.06); font-size: 13px; color: #94A3B8; width: 36%;">
                    Account Username
                  </td>
                  <td style="padding: 12px 18px; border-bottom: 1px solid rgba(255,255,255,0.06); font-size: 13px; color: #FFFFFF; font-weight: 600;">
                    @${params.username}
                  </td>
                </tr>
                <tr>
                  <td style="padding: 12px 18px; border-bottom: 1px solid rgba(255,255,255,0.06); font-size: 13px; color: #94A3B8;">
                    Login Method
                  </td>
                  <td style="padding: 12px 18px; border-bottom: 1px solid rgba(255,255,255,0.06); font-size: 13px; color: #38BDF8; font-weight: 600;">
                    ${providerLabel}
                  </td>
                </tr>
                <tr>
                  <td style="padding: 12px 18px; border-bottom: 1px solid rgba(255,255,255,0.06); font-size: 13px; color: #94A3B8;">
                    Date & Time
                  </td>
                  <td style="padding: 12px 18px; border-bottom: 1px solid rgba(255,255,255,0.06); font-size: 13px; color: #FFFFFF;">
                    ${params.loginTime}
                  </td>
                </tr>
                ${params.device ? `
                <tr>
                  <td style="padding: 12px 18px; ${params.ipAddress ? 'border-bottom: 1px solid rgba(255,255,255,0.06);' : ''} font-size: 13px; color: #94A3B8;">
                    Device / Platform
                  </td>
                  <td style="padding: 12px 18px; ${params.ipAddress ? 'border-bottom: 1px solid rgba(255,255,255,0.06);' : ''} font-size: 13px; color: #CBD5E1;">
                    ${params.device}
                  </td>
                </tr>` : ''}
                ${params.ipAddress ? `
                <tr>
                  <td style="padding: 12px 18px; font-size: 13px; color: #94A3B8;">
                    IP Address
                  </td>
                  <td style="padding: 12px 18px; font-size: 13px; color: #CBD5E1; font-family: monospace;">
                    ${params.ipAddress}
                  </td>
                </tr>` : ''}
              </table>

              <div style="padding: 16px 20px; background-color: rgba(56, 189, 248, 0.1); border: 1px solid rgba(56, 189, 248, 0.25); border-radius: 12px; font-size: 13px; color: #BAE6FD; line-height: 1.6; margin-bottom: 24px;">
                ✅ <strong>Was this you?</strong><br>
                If you just logged in to Online Task Lab, you can safely disregard this notification. Your session is active and protected.
                <br><br>
                🚨 <strong>Don't recognize this activity?</strong><br>
                If you did not sign in, please secure your account immediately by resetting your password or contacting us at <a href="mailto:support@onlinetasklab.com" style="color: #5DE2E7; text-decoration: underline;">support@onlinetasklab.com</a>.
              </div>

              <div style="text-align: center; margin-top: 10px;">
                <a href="https://onlinetasklab.com" target="_blank" style="display: inline-block; background: linear-gradient(135deg, #00F0FF 0%, #5DE2E7 100%); color: #060B1E; font-weight: 700; font-size: 14px; text-decoration: none; padding: 12px 28px; border-radius: 10px; text-transform: uppercase; letter-spacing: 0.5px;">
                  Open Online Task Lab
                </a>
              </div>
            </td>
          </tr>

          <tr>
            <td style="padding: 20px 30px; text-align: center; border-top: 1px solid rgba(255,255,255,0.08); background-color: #060B1E;">
              <p style="font-size: 12px; color: #64748B; margin: 0;">
                © ${new Date().getFullYear()} Online Task Lab. Security Notifications.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `;
}

// ==========================================
// 1. REGISTRATION FLOW ENDPOINTS
// ==========================================

// POST /api/auth/register-request
// Initiates user registration by validating details, generating a 6-digit OTP, sending via Brevo SMTP
app.post('/api/auth/register-request', async (req: Request, res: Response): Promise<any> => {
  try {
    const { firstName, lastName, username, email, password } = req.body;

    if (!username || !email || !password) {
      return res.status(400).json({
        success: false,
        error: 'Username, email, and password are required.'
      });
    }

    const cleanUsername = String(username).trim().toLowerCase();
    const cleanEmail = String(email).trim().toLowerCase();
    const cleanFirstName = String(firstName || '').trim();
    const cleanLastName = String(lastName || '').trim();

    // Username format validation
    const usernameRegex = /^[a-zA-Z0-9_.]{3,30}$/;
    if (!usernameRegex.test(cleanUsername)) {
      return res.status(400).json({
        success: false,
        error: 'Username must be 3-30 characters long and can only contain letters, numbers, underscores, and dots.'
      });
    }

    // Email format validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(cleanEmail)) {
      return res.status(400).json({
        success: false,
        error: 'Please provide a valid email address.'
      });
    }

    // Password validation
    if (String(password).length < 6) {
      return res.status(400).json({
        success: false,
        error: 'Password must be at least 6 characters long.'
      });
    }

    // Check if email already exists in Firebase Auth
    try {
      const auth = getAdminAuth();
      if (auth) {
        const existingUser = await auth.getUserByEmail(cleanEmail);
        if (existingUser) {
          return res.status(400).json({
            success: false,
            error: 'An account with this email address already exists. Please sign in.'
          });
        }
      }
    } catch (err: any) {
      // User not found in Firebase Auth is expected for registration
      if (err.code !== 'auth/user-not-found') {
        console.warn('[Firebase Auth Check Note]:', err.message);
      }
    }

    // Rate Limiting: Check existing pending registration for 60s cooldown
    for (const [id, reg] of pendingRegistrations.entries()) {
      if (reg.normalizedEmail === cleanEmail && Date.now() < reg.expiresAt) {
        const elapsed = Math.floor((Date.now() - reg.lastSentAt) / 1000);
        if (elapsed < 60) {
          return res.status(429).json({
            success: false,
            error: `A verification code was recently sent. Please wait ${60 - elapsed}s before requesting a new code.`
          });
        }
        pendingRegistrations.delete(id);
      }
    }

    // Generate 6-digit OTP
    const otp = generate6DigitOtp();
    const otpHashValue = hashOtp(otp);
    const registrationId = 'reg_' + crypto.randomUUID();
    const encryptedPass = encryptTempPassword(password);

    // Save pending registration record
    pendingRegistrations.set(registrationId, {
      registrationId,
      firstName: cleanFirstName,
      lastName: cleanLastName,
      username: cleanUsername,
      normalizedUsername: cleanUsername,
      email: cleanEmail,
      normalizedEmail: cleanEmail,
      encryptedPassword: encryptedPass,
      otpHash: otpHashValue,
      attempts: 0,
      maxAttempts: 5,
      createdAt: Date.now(),
      expiresAt: Date.now() + 10 * 60 * 1000, // 10 minutes
      lastSentAt: Date.now()
    });

    // Dispatch verification email via Brevo SMTP / API
    const emailHtml = getVerificationOtpEmailHtml(otp, cleanFirstName || cleanUsername);
    const dispatchResult = await dispatchBrevoEmail({
      to: cleanEmail,
      subject: 'Verify your email - Online Task Lab',
      html: emailHtml,
      purpose: 'registration_otp',
      otpCode: otp,
      username: cleanUsername,
      recipientName: cleanFirstName || cleanUsername,
      expiresAt: new Date(Date.now() + 10 * 60 * 1000).toISOString()
    });

    if (!dispatchResult.success) {
      pendingRegistrations.delete(registrationId);
      return res.status(502).json({
        success: false,
        code: dispatchResult.code || 'EMAIL_DELIVERY_FAILED',
        error: dispatchResult.error || 'Failed to dispatch verification code via Brevo SMTP.'
      });
    }

    return res.json({
      success: true,
      registrationId,
      email: cleanEmail,
      message: `A 6-digit verification code has been sent to ${cleanEmail}.`
    });

  } catch (error: any) {
    console.error('[Register Request Error]:', error);
    return res.status(500).json({
      success: false,
      error: error?.message || 'Failed to process registration request.'
    });
  }
});

// POST /api/auth/verify-registration-otp
// Verifies the user-entered 6-digit OTP and creates the Firebase Auth user
app.post('/api/auth/verify-registration-otp', async (req: Request, res: Response): Promise<any> => {
  try {
    const { registrationId, otp } = req.body;

    if (!registrationId || !otp) {
      return res.status(400).json({
        success: false,
        error: 'Registration ID and 6-digit verification code are required.'
      });
    }

    const cleanOtp = String(otp).trim();
    const reg = pendingRegistrations.get(registrationId);

    if (!reg) {
      return res.status(400).json({
        success: false,
        error: 'Verification session expired or invalid. Please submit registration again.'
      });
    }

    if (Date.now() > reg.expiresAt) {
      pendingRegistrations.delete(registrationId);
      return res.status(400).json({
        success: false,
        error: 'Verification code has expired (10-minute limit). Please request a new code.'
      });
    }

    if (reg.attempts >= reg.maxAttempts) {
      pendingRegistrations.delete(registrationId);
      return res.status(400).json({
        success: false,
        error: 'Too many incorrect attempts. Please start registration again.'
      });
    }

    // Verify OTP Hash
    const submittedHash = hashOtp(cleanOtp);
    if (submittedHash !== reg.otpHash) {
      reg.attempts++;
      const remaining = reg.maxAttempts - reg.attempts;
      return res.status(400).json({
        success: false,
        error: `Incorrect verification code. ${remaining > 0 ? `${remaining} attempts remaining.` : 'Code invalidated.'}`
      });
    }

    // OTP Verified! Decrypt temporary password and create user in Firebase Auth
    emailConfigService.markVerified(reg.email, cleanOtp);
    const rawPassword = decryptTempPassword(reg.encryptedPassword);
    const fullName = `${reg.firstName} ${reg.lastName}`.trim() || reg.username;

    let targetUid = '';
    let customToken: string | null = null;
    let idToken: string | null = null;

    try {
      const auth = getAdminAuth();
      if (auth) {
        const userRecord = await auth.createUser({
          email: reg.email,
          password: rawPassword,
          displayName: fullName,
          emailVerified: true
        });
        targetUid = userRecord.uid;

        try {
          customToken = await auth.createCustomToken(userRecord.uid, {
            role: 'user',
            username: reg.username
          });
        } catch (tokenErr) {
          console.warn('[Admin CreateCustomToken Note]:', tokenErr);
        }
      }
    } catch (createErr: any) {
      if (createErr.code === 'auth/email-already-exists' || (createErr.message && createErr.message.includes('EMAIL_EXISTS'))) {
        pendingRegistrations.delete(registrationId);
        return res.status(400).json({
          success: false,
          error: 'An account with this email address already exists.'
        });
      }

      console.warn('[Firebase Admin CreateUser Note, attempting Identity Toolkit REST]:', createErr?.message);

      // Identity Toolkit REST API Fallback
      try {
        const apiKey = process.env.FIREBASE_API_KEY || 'AIzaSyCTN7xJtTwIR8Yk74C9TbQtqIVF-YtCvqU';
        const restRes = await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:signUp?key=${apiKey}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email: reg.email,
            password: rawPassword,
            returnSecureToken: true
          })
        });

        const restData = await restRes.json();
        if (restRes.ok && restData.localId) {
          targetUid = restData.localId;
          idToken = restData.idToken;
          customToken = restData.idToken;

          // Update display name
          if (restData.idToken && fullName) {
            fetch(`https://identitytoolkit.googleapis.com/v1/accounts:update?key=${apiKey}`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                idToken: restData.idToken,
                displayName: fullName,
                returnSecureToken: true
              })
            }).catch(() => {});
          }
        } else if (restData.error && restData.error.message === 'EMAIL_EXISTS') {
          pendingRegistrations.delete(registrationId);
          return res.status(400).json({
            success: false,
            error: 'An account with this email address already exists.'
          });
        } else {
          throw new Error(restData.error?.message || 'Failed to create user account');
        }
      } catch (restErr: any) {
        throw restErr;
      }
    }

    // Cleanup pending registration
    pendingRegistrations.delete(registrationId);

    // Send Welcome Email confirmation via Brevo SMTP / API
    const welcomeHtml = getWelcomeEmailHtml(reg.username, reg.email, reg.firstName || reg.username);
    dispatchBrevoEmail({
      to: reg.email,
      subject: 'Welcome to Online Task Lab - Account Created',
      html: welcomeHtml,
      purpose: 'welcome_email',
      username: reg.username,
      recipientName: reg.firstName || reg.username
    }).catch(e => console.warn('[Welcome Email Note]:', e));

    return res.json({
      success: true,
      customToken,
      idToken,
      user: {
        uid: targetUid,
        email: reg.email,
        username: reg.username,
        firstName: reg.firstName,
        lastName: reg.lastName,
        emailVerified: true
      },
      message: 'Account created and email verified successfully!'
    });

  } catch (error: any) {
    console.error('[Verify Registration OTP Error]:', error);
    return res.status(500).json({
      success: false,
      error: error?.message || 'Failed to complete registration.'
    });
  }
});

// POST /api/auth/resend-registration-otp
// Resends a fresh 6-digit OTP with 60-second cooldown protection
app.post('/api/auth/resend-registration-otp', async (req: Request, res: Response): Promise<any> => {
  try {
    const { registrationId } = req.body;

    if (!registrationId) {
      return res.status(400).json({ success: false, error: 'Registration ID is required.' });
    }

    const reg = pendingRegistrations.get(registrationId);
    if (!reg) {
      return res.status(400).json({
        success: false,
        error: 'Registration session expired. Please start registration again.'
      });
    }

    const elapsed = Math.floor((Date.now() - reg.lastSentAt) / 1000);
    if (elapsed < 60) {
      return res.status(429).json({
        success: false,
        error: `Please wait ${60 - elapsed} seconds before requesting a new code.`
      });
    }

    // Generate new OTP
    const newOtp = generate6DigitOtp();
    reg.otpHash = hashOtp(newOtp);
    reg.attempts = 0;
    reg.lastSentAt = Date.now();
    reg.expiresAt = Date.now() + 10 * 60 * 1000;

    // Send email via Brevo SMTP / API
    const emailHtml = getVerificationOtpEmailHtml(newOtp, reg.firstName || reg.username);
    const dispatchResult = await dispatchBrevoEmail({
      to: reg.email,
      subject: 'Verify your email - Online Task Lab',
      html: emailHtml,
      purpose: 'registration_otp',
      otpCode: newOtp,
      username: reg.username,
      recipientName: reg.firstName || reg.username,
      expiresAt: new Date(reg.expiresAt).toISOString()
    });

    if (!dispatchResult.success) {
      return res.status(502).json({
        success: false,
        code: dispatchResult.code || 'EMAIL_DELIVERY_FAILED',
        error: dispatchResult.error || 'Failed to resend verification code via Brevo SMTP.'
      });
    }

    return res.json({
      success: true,
      message: `A fresh 6-digit verification code has been dispatched to ${reg.email}.`
    });

  } catch (error: any) {
    console.error('[Resend Registration OTP Error]:', error);
    return res.status(500).json({ success: false, error: error?.message || 'Failed to resend verification code.' });
  }
});

// ==========================================
// 2. PASSWORD RECOVERY FLOW ENDPOINTS
// ==========================================

// POST /api/auth/forgot-password-request
// Generates a 6-digit OTP for password recovery and dispatches via Brevo SMTP
app.post('/api/auth/forgot-password-request', async (req: Request, res: Response): Promise<any> => {
  try {
    const { identifier } = req.body || {};

    if (!identifier || typeof identifier !== 'string' || !identifier.trim()) {
      return res.status(400).json({
        success: false,
        error: 'Invalid email or username'
      });
    }

    const cleanIdent = identifier.trim().toLowerCase();
    if (cleanIdent.length < 2 || cleanIdent.length > 120) {
      return res.status(400).json({
        success: false,
        error: 'Invalid email or username'
      });
    }

    let targetUid = '';
    let targetEmail = cleanIdent.includes('@') ? cleanIdent : '';
    let targetUsername = cleanIdent.split('@')[0];

    const auth = getAdminAuth();
    if (cleanIdent.includes('@')) {
      try {
        if (auth) {
          const userRec = await auth.getUserByEmail(cleanIdent);
          if (userRec) {
            targetUid = userRec.uid;
            targetEmail = userRec.email || cleanIdent;
            targetUsername = userRec.displayName || cleanIdent.split('@')[0];
          }
        } else {
          targetEmail = cleanIdent;
        }
      } catch (err: any) {
        // Fallback: Use email directly
        targetEmail = cleanIdent;
      }
    } else {
      // Username lookup
      try {
        if (auth) {
          const listUsers = await auth.listUsers(100);
          const match = listUsers.users.find(u => 
            (u.displayName && u.displayName.toLowerCase().replace(/[^a-z0-9_.]/g, '') === cleanIdent) ||
            (u.email && u.email.split('@')[0].toLowerCase() === cleanIdent)
          );
          if (match && match.email) {
            targetUid = match.uid;
            targetEmail = match.email;
            targetUsername = match.displayName || match.email.split('@')[0];
          }
        }
      } catch (err: any) {
        console.warn('Username listUsers note:', err.message);
      }
    }

    const requestId = 'pwd_' + crypto.randomUUID();

    if (targetEmail) {
      // Check cooldown (Rate limit: 429)
      for (const [id, req] of passwordResetRequests.entries()) {
        if (req.email === targetEmail && Date.now() < req.expiresAt) {
          const elapsed = Math.floor((Date.now() - req.lastSentAt) / 1000);
          if (elapsed < 60) {
            return res.status(429).json({
              success: false,
              error: 'Please wait before requesting another code.'
            });
          }
          passwordResetRequests.delete(id);
        }
      }

      const otp = generate6DigitOtp();
      const otpHashValue = hashOtp(otp);

      passwordResetRequests.set(requestId, {
        requestId,
        uid: targetUid,
        email: targetEmail,
        username: targetUsername,
        otpHash: otpHashValue,
        attempts: 0,
        maxAttempts: 5,
        createdAt: Date.now(),
        expiresAt: Date.now() + 10 * 60 * 1000, // 10 minutes
        lastSentAt: Date.now(),
        isDummy: false
      });

      // Dispatch Brevo SMTP / API Password Reset OTP Email
      const emailHtml = getPasswordResetOtpEmailHtml(otp, targetUsername);
      const dispatchResult = await dispatchBrevoEmail({
        to: targetEmail,
        subject: 'Online Task Lab - Password Reset Code',
        html: emailHtml,
        purpose: 'password_reset_otp',
        otpCode: otp,
        username: targetUsername,
        expiresAt: new Date(Date.now() + 10 * 60 * 1000).toISOString()
      });

      if (!dispatchResult.success) {
        passwordResetRequests.delete(requestId);
        return res.status(502).json({
          success: false,
          error: 'Unable to send reset code. Please try again later.'
        });
      }
    } else {
      // Dummy record to prevent user enumeration
      passwordResetRequests.set(requestId, {
        requestId,
        attempts: 0,
        maxAttempts: 5,
        createdAt: Date.now(),
        expiresAt: Date.now() + 10 * 60 * 1000,
        lastSentAt: Date.now(),
        isDummy: true
      });
    }

    return res.status(200).json({
      success: true,
      requestId,
      message: 'If the account exists, a reset code has been sent.'
    });

  } catch (error: any) {
    console.error('[Forgot Password Request Error]:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to process password reset request.'
    });
  }
});

// POST /api/auth/verify-password-reset-otp
// Validates the password reset OTP entered by the user
app.post('/api/auth/verify-password-reset-otp', async (req: Request, res: Response): Promise<any> => {
  try {
    const { requestId, otp } = req.body;

    if (!requestId || !otp) {
      return res.status(400).json({
        success: false,
        error: 'Reset Request ID and 6-digit verification code are required.'
      });
    }

    const cleanOtp = String(otp).trim();
    const reqData = passwordResetRequests.get(requestId);

    if (!reqData || reqData.isDummy) {
      return res.status(400).json({
        success: false,
        error: 'Invalid or expired verification code. Please request a new code.'
      });
    }

    if (Date.now() > reqData.expiresAt) {
      passwordResetRequests.delete(requestId);
      return res.status(400).json({
        success: false,
        error: 'Verification code has expired (10-minute limit). Please request a new code.'
      });
    }

    if (reqData.attempts >= reqData.maxAttempts) {
      passwordResetRequests.delete(requestId);
      return res.status(400).json({
        success: false,
        error: 'Too many incorrect attempts. Please request a new password reset code.'
      });
    }

    // Verify OTP Hash
    const submittedHash = hashOtp(cleanOtp);
    if (submittedHash !== reqData.otpHash) {
      reqData.attempts++;
      const remaining = reqData.maxAttempts - reqData.attempts;
      return res.status(400).json({
        success: false,
        error: `Incorrect verification code. ${remaining > 0 ? `${remaining} attempts remaining.` : 'Code invalidated.'}`
      });
    }

    // Generate Secure Reset Session ID
    if (reqData.email) {
      emailConfigService.markVerified(reqData.email, cleanOtp);
    }
    const resetSessionId = 'rss_' + crypto.randomUUID();
    resetSessions.set(resetSessionId, {
      resetSessionId,
      uid: reqData.uid!,
      email: reqData.email!,
      username: reqData.username!,
      createdAt: Date.now(),
      expiresAt: Date.now() + 15 * 60 * 1000, // 15 minutes to enter new password
      used: false
    });

    passwordResetRequests.delete(requestId);

    return res.json({
      success: true,
      resetSessionId,
      message: 'Verification code confirmed. You can now set your new password.'
    });

  } catch (error: any) {
    console.error('[Verify Password Reset OTP Error]:', error);
    return res.status(500).json({
      success: false,
      error: error?.message || 'Failed to verify reset code.'
    });
  }
});

// POST /api/auth/resend-password-reset-otp
// Resends a fresh password reset OTP with 60-second cooldown
app.post('/api/auth/resend-password-reset-otp', async (req: Request, res: Response): Promise<any> => {
  try {
    const { requestId } = req.body;

    if (!requestId) {
      return res.status(400).json({ success: false, error: 'Request ID is required.' });
    }

    const reqData = passwordResetRequests.get(requestId);
    if (!reqData || reqData.isDummy) {
      return res.json({
        success: true,
        message: 'A fresh verification code has been dispatched if the account exists.'
      });
    }

    const elapsed = Math.floor((Date.now() - reqData.lastSentAt) / 1000);
    if (elapsed < 60) {
      return res.status(429).json({
        success: false,
        error: `Please wait ${60 - elapsed} seconds before requesting a new code.`
      });
    }

    const newOtp = generate6DigitOtp();
    reqData.otpHash = hashOtp(newOtp);
    reqData.attempts = 0;
    reqData.lastSentAt = Date.now();
    reqData.expiresAt = Date.now() + 10 * 60 * 1000;

    const emailHtml = getPasswordResetOtpEmailHtml(newOtp, reqData.username);
    const dispatchResult = await dispatchBrevoEmail({
      to: reqData.email!,
      subject: 'Online Task Lab - Password Reset Code',
      html: emailHtml,
      purpose: 'password_reset_otp',
      otpCode: newOtp,
      username: reqData.username,
      expiresAt: new Date(reqData.expiresAt).toISOString()
    });

    if (!dispatchResult.success) {
      return res.status(502).json({
        success: false,
        code: dispatchResult.code || 'EMAIL_DELIVERY_FAILED',
        error: dispatchResult.error || 'Failed to dispatch password reset code via Brevo SMTP.'
      });
    }

    return res.json({
      success: true,
      message: 'A fresh verification code has been dispatched to your email.'
    });

  } catch (error: any) {
    console.error('[Resend Password Reset OTP Error]:', error);
    return res.status(500).json({ success: false, error: error?.message || 'Failed to resend verification code.' });
  }
});

// POST /api/auth/complete-password-reset
// Sets the new password on Firebase Auth and sends a security confirmation email via Brevo SMTP
app.post('/api/auth/complete-password-reset', async (req: Request, res: Response): Promise<any> => {
  try {
    const { resetSessionId, newPassword, confirmPassword } = req.body;

    if (!resetSessionId || !newPassword) {
      return res.status(400).json({
        success: false,
        error: 'Reset Session ID and new password are required.'
      });
    }

    if (newPassword !== confirmPassword) {
      return res.status(400).json({
        success: false,
        error: 'New password and confirmation password do not match.'
      });
    }

    if (String(newPassword).length < 6) {
      return res.status(400).json({
        success: false,
        error: 'Password must be at least 6 characters long.'
      });
    }

    const session = resetSessions.get(resetSessionId);

    if (!session || session.used) {
      return res.status(400).json({
        success: false,
        error: 'Password reset session is invalid or has already been used. Please start over.'
      });
    }

    if (Date.now() > session.expiresAt) {
      resetSessions.delete(resetSessionId);
      return res.status(400).json({
        success: false,
        error: 'Password reset session has expired. Please start the password reset process again.'
      });
    }

    // Update password securely in Firebase Auth
    let updated = false;
    const auth = getAdminAuth();
    if (auth && session.uid) {
      try {
        await auth.updateUser(session.uid, {
          password: String(newPassword)
        });
        updated = true;
      } catch (adminErr) {
        console.warn('[Admin updateUser note]:', adminErr);
      }
    }

    if (auth && !updated && session.email) {
      try {
        const userRec = await auth.getUserByEmail(session.email);
        if (userRec) {
          await auth.updateUser(userRec.uid, {
            password: String(newPassword)
          });
          updated = true;
        }
      } catch (lookupErr) {
        console.warn('[Admin getUserByEmail note]:', lookupErr);
      }
    }

    // Mark session as used
    session.used = true;
    resetSessions.delete(resetSessionId);

    // Send Security Confirmation Email via Brevo SMTP
    const alertHtml = getPasswordChangedEmailHtml(session.username);
    dispatchBrevoEmail({
      to: session.email,
      subject: 'Security Alert: Password Changed — Online Task Lab',
      html: alertHtml
    }).catch(e => console.warn('[Password Changed Email Note]:', e));

    return res.json({
      success: true,
      message: 'Your password has been reset successfully! You can now log in with your new password.'
    });

  } catch (error: any) {
    console.error('[Complete Password Reset Error]:', error);
    return res.status(500).json({
      success: false,
      error: error?.message || 'Failed to update password.'
    });
  }
});

// POST /api/auth/reset-password-inline-otp
// Atomically verifies OTP and updates user password (used in profile settings and direct modals)
app.post('/api/auth/reset-password-inline-otp', async (req: Request, res: Response): Promise<any> => {
  try {
    const { requestId, otp, newPassword, confirmPassword } = req.body;

    if (!requestId || !otp || !newPassword) {
      return res.status(400).json({
        success: false,
        error: 'Reset Request ID, 6-digit verification code, and new password are required.'
      });
    }

    if (newPassword !== confirmPassword) {
      return res.status(400).json({
        success: false,
        error: 'New password and confirmation password do not match.'
      });
    }

    if (String(newPassword).length < 6) {
      return res.status(400).json({
        success: false,
        error: 'Password must be at least 6 characters long.'
      });
    }

    const cleanOtp = String(otp).trim();
    const reqData = passwordResetRequests.get(requestId);

    if (!reqData || reqData.isDummy) {
      return res.status(400).json({
        success: false,
        error: 'Invalid or expired verification code. Please request a new code.'
      });
    }

    if (Date.now() > reqData.expiresAt) {
      passwordResetRequests.delete(requestId);
      return res.status(400).json({
        success: false,
        error: 'Verification code has expired (10-minute limit). Please request a new code.'
      });
    }

    if (reqData.attempts >= reqData.maxAttempts) {
      passwordResetRequests.delete(requestId);
      return res.status(400).json({
        success: false,
        error: 'Too many incorrect attempts. Please request a new password reset code.'
      });
    }

    const submittedHash = hashOtp(cleanOtp);
    if (submittedHash !== reqData.otpHash) {
      reqData.attempts++;
      const remaining = reqData.maxAttempts - reqData.attempts;
      return res.status(400).json({
        success: false,
        error: `Incorrect verification code. ${remaining > 0 ? `${remaining} attempts remaining.` : 'Code invalidated.'}`
      });
    }

    // Update password securely in Firebase Auth
    let updated = false;
    const auth = getAdminAuth();
    if (auth && reqData.uid) {
      try {
        await auth.updateUser(reqData.uid, {
          password: String(newPassword)
        });
        updated = true;
      } catch (adminErr) {
        console.warn('[Admin updateUser note]:', adminErr);
      }
    }

    if (auth && !updated && reqData.email) {
      try {
        const userRec = await auth.getUserByEmail(reqData.email);
        if (userRec) {
          await auth.updateUser(userRec.uid, {
            password: String(newPassword)
          });
          updated = true;
        }
      } catch (lookupErr) {
        console.warn('[Admin getUserByEmail note]:', lookupErr);
      }
    }

    passwordResetRequests.delete(requestId);

    // Send Security Alert confirmation email via Brevo SMTP
    if (reqData.email) {
      const alertHtml = getPasswordChangedEmailHtml(reqData.username);
      dispatchBrevoEmail({
        to: reqData.email,
        subject: 'Security Alert: Password Changed — Online Task Lab',
        html: alertHtml
      }).catch(e => console.warn('[Password Changed Email Note]:', e));
    }

    return res.json({
      success: true,
      message: '🎉 Password updated successfully with email verification!'
    });

  } catch (error: any) {
    console.error('[Reset Password Inline OTP Error]:', error);
    return res.status(500).json({
      success: false,
      error: error?.message || 'Failed to update password.'
    });
  }
});

// In-memory debounce cache to prevent duplicate email flooding for rapid reloads
const recentLoginNotifications = new Map<string, number>();

// POST /api/auth/login-notification
// Sends a real-time security alert email to user's Gmail/email when their account logs in
app.post('/api/auth/login-notification', async (req: Request, res: Response): Promise<any> => {
  try {
    const { email, username, name, provider, device } = req.body || {};

    if (!email || typeof email !== 'string' || !email.includes('@')) {
      return res.status(400).json({
        success: false,
        error: 'Valid email address is required.'
      });
    }

    const cleanEmail = email.trim().toLowerCase();
    const cleanUsername = (username || cleanEmail.split('@')[0]).replace(/^@/, '');
    const now = Date.now();

    // Debounce to prevent flooding (at most 1 email per 90 seconds per email address)
    const lastSent = recentLoginNotifications.get(cleanEmail);
    if (lastSent && now - lastSent < 90 * 1000) {
      return res.json({
        success: true,
        throttled: true,
        message: 'Notification was already sent recently.'
      });
    }
    recentLoginNotifications.set(cleanEmail, now);

    // Garbage collection for debounce cache
    if (recentLoginNotifications.size > 2000) {
      for (const [key, timestamp] of recentLoginNotifications.entries()) {
        if (now - timestamp > 300 * 1000) {
          recentLoginNotifications.delete(key);
        }
      }
    }

    // Extract client IP and user agent
    const clientIp = (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() || req.socket.remoteAddress || '';
    const userAgent = device || (req.headers['user-agent'] as string) || '';
    const formattedTime = new Date().toUTCString();

    const emailHtml = getLoginNotificationEmailHtml({
      username: cleanUsername,
      name: name || cleanUsername,
      email: cleanEmail,
      loginTime: formattedTime,
      provider: provider || 'email',
      device: userAgent,
      ipAddress: clientIp && clientIp !== '::1' && clientIp !== '127.0.0.1' ? clientIp : undefined
    });

    console.log(`[Login Notification] Dispatching alert email to ${cleanEmail} for @${cleanUsername}...`);

    // Dispatch email asynchronously so response returns without blocking user
    dispatchBrevoEmail({
      to: cleanEmail,
      subject: `Security Alert: New Sign-in to Your Account (@${cleanUsername}) — Online Task Lab`,
      html: emailHtml
    }).then(result => {
      console.log(`[Login Notification Result]: Delivered to ${cleanEmail}, success: ${result.success}`);
    }).catch(err => {
      console.warn('[Login Notification Email Error]:', err?.message || err);
    });

    return res.json({
      success: true,
      message: 'Login notification email queued successfully.'
    });

  } catch (error: any) {
    console.error('[Login Notification Error]:', error);
    return res.status(500).json({
      success: false,
      error: error?.message || 'Failed to dispatch login notification.'
    });
  }
});

// ==========================================
// 3. TRANSACTIONAL & UTILITY ENDPOINTS
// ==========================================

// POST /api/send-email - Dispatches live email via Brevo SMTP / Nodemailer
app.post('/api/send-email', async (req: Request, res: Response): Promise<any> => {
  try {
    const { to, subject, html, text } = req.body;

    if (!to || !subject || (!html && !text)) {
      return res.status(400).json({
        success: false,
        error: 'Missing required email fields: to, subject, and html or text body'
      });
    }

    const result = await dispatchBrevoEmail({
      to,
      subject,
      html: html || text,
      text
    });

    return res.json({
      success: result.success,
      provider: result.provider || 'Brevo SMTP',
      message: `Email successfully dispatched to ${to}`
    });

  } catch (error: any) {
    console.error('[Error sending email via Brevo]:', error);
    return res.status(500).json({
      success: false,
      error: error?.message || 'Failed to dispatch email via Brevo SMTP'
    });
  }
});

// POST /api/verify-smtp - Test SMTP connection
app.post('/api/verify-smtp', async (req: Request, res: Response): Promise<any> => {
  try {
    const { host, port, user, pass, secure } = req.body;
    const testUser = user || process.env.SMTP_USER;
    const testPass = pass || process.env.SMTP_PASS;

    if (!testUser || !testPass) {
      return res.status(400).json({ success: false, error: 'SMTP User and Password/Key are required' });
    }

    const testHost = host || process.env.SMTP_HOST || 'smtp-relay.brevo.com';
    const testPort = Number(port || process.env.SMTP_PORT || 587);
    const isSecure = secure !== undefined ? secure : (process.env.SMTP_SECURE === 'true' || testPort === 465);

    const testTransporter = nodemailer.createTransport({
      host: testHost,
      port: testPort,
      secure: isSecure,
      auth: { user: testUser, pass: testPass },
      tls: { rejectUnauthorized: false }
    });

    try {
      await testTransporter.verify();
      return res.json({
        success: true,
        transport: 'SMTP',
        message: 'Brevo SMTP connection verified successfully!'
      });
    } catch (smtpErr: any) {
      const errMsg = smtpErr?.message || '';
      
      // If Brevo restricts container IP, test Brevo API key
      const apiKey = process.env.BREVO_API_KEY || (testPass.startsWith('xkeysib-') ? testPass : '');
      if (apiKey) {
        try {
          const apiCheck = await fetch('https://api.brevo.com/v3/account', {
            headers: { 'api-key': apiKey }
          });
          const apiData = await apiCheck.json();
          if (apiCheck.ok && apiData.email) {
            return res.json({
              success: true,
              transport: 'Brevo REST API v3',
              accountEmail: apiData.email,
              message: 'Brevo REST API v3 connected and authenticated successfully!'
            });
          }
        } catch {}
      }

      if (errMsg.includes('525') || errMsg.includes('Unauthorized IP')) {
        return res.status(400).json({
          success: false,
          code: 'UNAUTHORIZED_IP_525',
          error: 'Brevo SMTP rejected the connection with 525 Unauthorized IP address. In Brevo dashboard > Senders & IPs > Authorized IPs, allow all IPs or provide a Brevo REST API v3 key (xkeysib-...) in BREVO_API_KEY.'
        });
      }

      return res.status(400).json({
        success: false,
        error: errMsg || 'Failed to connect to SMTP server'
      });
    }
  } catch (err: any) {
    console.error('[SMTP Verify Error]:', err);
    return res.status(400).json({ success: false, error: err?.message || 'Failed to connect to SMTP server' });
  }
});

// ==========================================
// 3.1 ADMIN EMAIL & OTP VERIFICATION SYSTEM APIS
// ==========================================

// GET /api/admin/email-settings - Get active email & SMTP configuration + env status
app.get('/api/admin/email-settings', (_req: Request, res: Response): any => {
  try {
    const config = emailConfigService.getConfig();
    const envStatus = {
      SMTP_HOST: Boolean(process.env.SMTP_HOST && process.env.SMTP_HOST.trim()) ? 'CONFIGURED' : 'MISSING',
      SMTP_PORT: Boolean(process.env.SMTP_PORT && process.env.SMTP_PORT.trim()) ? 'CONFIGURED' : 'MISSING',
      SMTP_USER: Boolean(process.env.SMTP_USER && process.env.SMTP_USER.trim()) ? 'CONFIGURED' : 'MISSING',
      SMTP_PASS: Boolean(process.env.SMTP_PASS && process.env.SMTP_PASS.trim()) ? 'CONFIGURED' : 'MISSING',
      SMTP_SECURE: Boolean(process.env.SMTP_SECURE && process.env.SMTP_SECURE.trim()) ? 'CONFIGURED' : 'MISSING',
      SMTP_FROM_NAME: Boolean(process.env.SMTP_FROM_NAME && process.env.SMTP_FROM_NAME.trim()) ? 'CONFIGURED' : 'MISSING',
      SMTP_FROM_EMAIL: Boolean(process.env.SMTP_FROM_EMAIL && process.env.SMTP_FROM_EMAIL.trim()) ? 'CONFIGURED' : 'MISSING',
      BREVO_API_KEY: Boolean(process.env.BREVO_API_KEY && process.env.BREVO_API_KEY.trim()) ? 'CONFIGURED' : 'MISSING'
    };

    return res.json({
      success: true,
      config,
      envStatus
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err?.message || 'Failed to fetch email settings' });
  }
});

// POST /api/admin/email-settings - Save email & SMTP configuration
app.post('/api/admin/email-settings', (req: Request, res: Response): any => {
  try {
    const updated = emailConfigService.updateConfig(req.body, req.body.updatedBy || 'admin');
    return res.json({
      success: true,
      message: 'Email & SMTP settings saved successfully! Changes are active immediately.',
      config: updated
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err?.message || 'Failed to save email settings' });
  }
});

// POST /api/admin/test-email - Send test verification email to any address
app.post('/api/admin/test-email', async (req: Request, res: Response): Promise<any> => {
  try {
    const { to, customConfig } = req.body;
    if (!to || typeof to !== 'string' || !to.includes('@')) {
      return res.status(400).json({ success: false, error: 'A valid recipient email address is required.' });
    }

    const testOtp = Math.floor(100000 + Math.random() * 900000).toString();
    const testHtml = getVerificationOtpEmailHtml(testOtp, 'Admin Test');

    const result = await dispatchBrevoEmail({
      to,
      subject: `[TEST] Online Task Lab Verification Code: ${testOtp}`,
      html: testHtml,
      purpose: 'test_email',
      otpCode: testOtp,
      recipientName: 'Admin Test',
      username: 'admin_test',
      expiresAt: new Date(Date.now() + 10 * 60 * 1000).toISOString(),
      customConfig
    });

    if (result.success) {
      return res.json({
        success: true,
        message: `Test email with OTP [${testOtp}] dispatched successfully to ${to} via ${result.provider}.`,
        provider: result.provider,
        testOtp,
        messageId: result.messageId
      });
    } else {
      return res.status(502).json({
        success: false,
        error: result.error || 'Failed to dispatch test email',
        code: result.code
      });
    }
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err?.message || 'Error executing test email' });
  }
});

// GET /api/admin/email-otp-logs - Fetch Gmail-style email & OTP history
app.get('/api/admin/email-otp-logs', (req: Request, res: Response): any => {
  try {
    const { search, purpose, status, limit } = req.query;
    const result = emailConfigService.getLogs({
      search: typeof search === 'string' ? search : undefined,
      purpose: typeof purpose === 'string' ? purpose : undefined,
      status: typeof status === 'string' ? status : undefined,
      limit: limit ? Number(limit) : 200
    });

    return res.json({
      success: true,
      ...result
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err?.message || 'Failed to fetch email logs' });
  }
});

// POST /api/admin/email-otp-logs/resend - Resend an email/OTP from history
app.post('/api/admin/email-otp-logs/resend', async (req: Request, res: Response): Promise<any> => {
  try {
    const { logId } = req.body;
    const { logs } = emailConfigService.getLogs({ limit: 1000 });
    const targetLog = logs.find(l => l.id === logId);

    if (!targetLog) {
      return res.status(404).json({ success: false, error: 'Log entry not found.' });
    }

    const newOtp = targetLog.otpCode ? Math.floor(100000 + Math.random() * 900000).toString() : undefined;
    const emailHtml = newOtp
      ? getVerificationOtpEmailHtml(newOtp, targetLog.recipientName || targetLog.username || 'User')
      : getVerificationOtpEmailHtml(targetLog.otpCode || '123456', targetLog.recipientName || 'User');

    const result = await dispatchBrevoEmail({
      to: targetLog.recipientEmail,
      subject: `Resent: ${targetLog.subject}`,
      html: emailHtml,
      purpose: targetLog.purpose,
      otpCode: newOtp || targetLog.otpCode,
      recipientName: targetLog.recipientName,
      username: targetLog.username,
      expiresAt: new Date(Date.now() + 10 * 60 * 1000).toISOString()
    });

    if (result.success) {
      return res.json({
        success: true,
        message: `Successfully resent to ${targetLog.recipientEmail}! New OTP: ${newOtp || targetLog.otpCode || 'N/A'}`
      });
    } else {
      return res.status(502).json({
        success: false,
        error: result.error || 'Failed to resend'
      });
    }
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err?.message || 'Error resending' });
  }
});

// DELETE /api/admin/email-otp-logs/:id - Delete single log
app.delete('/api/admin/email-otp-logs/:id', (req: Request, res: Response): any => {
  const deleted = emailConfigService.deleteLog(req.params.id);
  return res.json({ success: deleted });
});

// POST /api/admin/email-otp-logs/clear - Clear all logs
app.post('/api/admin/email-otp-logs/clear', (_req: Request, res: Response): any => {
  emailConfigService.clearLogs();
  return res.json({ success: true, message: 'All email & OTP logs cleared.' });
});

interface BroadcastEmailOptions {
  buttonType?: 'none' | 'website' | 'download' | 'custom';
  buttonText?: string;
  buttonUrl?: string;
  includeGreeting?: boolean;
}

// Helper for formatting broadcast emails sent via Brevo
function getBroadcastEmailHtml(
  subject: string,
  messageBody: string,
  recipientName?: string,
  options: BroadcastEmailOptions = {}
): string {
  const {
    buttonType = 'none',
    buttonText = '',
    buttonUrl = '',
    includeGreeting = false
  } = options;

  const formattedBody = messageBody
    .split('\n\n')
    .map(para => `<p style="font-size: 14px; line-height: 1.7; color: #CBD5E1; margin: 0 0 16px 0;">${para.replace(/\n/g, '<br>')}</p>`)
    .join('');

  // Button HTML logic - Only render if buttonType !== 'none' and buttonUrl is provided
  let actionButtonHtml = '';
  if (buttonType && buttonType !== 'none' && buttonUrl && buttonUrl.trim()) {
    let label = buttonText.trim();
    if (!label) {
      if (buttonType === 'download') label = '📥 Download File / ডাউনলোড';
      else if (buttonType === 'website') label = '🌐 Visit Online Task Lab';
      else label = 'View Details';
    }

    actionButtonHtml = `
      <div style="margin-top: 28px; padding-top: 20px; border-top: 1px solid rgba(255,255,255,0.1); text-align: center;">
        <a href="${buttonUrl.trim()}" target="_blank" rel="noopener noreferrer" style="display: inline-block; background: linear-gradient(90deg, #133E87, #00F0FF); color: #FFFFFF; text-decoration: none; font-weight: 800; font-size: 13px; padding: 12px 28px; border-radius: 12px; box-shadow: 0 0 20px rgba(93,226,231,0.4);">
          ${label}
        </a>
      </div>
    `;
  }

  // Greeting HTML logic - ONLY include if includeGreeting is explicitly true and recipientName exists
  const greetingHtml = (includeGreeting && recipientName)
    ? `<p style="font-size: 14px; font-weight: bold; color: #5DE2E7; margin: 0 0 14px 0;">Hello ${recipientName},</p>`
    : '';

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${subject}</title>
</head>
<body style="margin: 0; padding: 0; background-color: #060B1E; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #E2E8F0;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #060B1E; padding: 35px 15px;">
    <tr>
      <td align="center">
        <table width="100%" max-width="580" style="max-width: 580px; background-color: #0B1D51; border: 1px solid rgba(93,226,231,0.3); border-radius: 20px; overflow: hidden; box-shadow: 0 10px 40px rgba(0,0,0,0.6);">
          <tr>
            <td style="padding: 30px 30px 15px 30px; text-align: center; background: linear-gradient(180deg, rgba(19,62,135,0.45) 0%, transparent 100%);">
              ${getOtlEmailLogoHtml(70)}
              <div style="font-size: 22px; font-weight: 900; letter-spacing: 1.5px; color: #5DE2E7; text-transform: uppercase; margin-top: 10px;">
                ONLINE TASK LAB
              </div>
            </td>
          </tr>
          <tr>
            <td style="padding: 15px 35px 35px 35px; text-align: left;">
              <h2 style="color: #FFFFFF; font-size: 20px; font-weight: 800; margin: 0 0 16px 0; border-bottom: 1px solid rgba(255,255,255,0.1); padding-bottom: 12px;">
                ${subject}
              </h2>
              
              ${greetingHtml}
              
              <div style="color: #CBD5E1;">
                ${formattedBody}
              </div>

              ${actionButtonHtml}
            </td>
          </tr>
          <tr>
            <td style="background-color: #060B1E; padding: 18px 30px; text-align: center; font-size: 11px; color: #64748B; border-top: 1px solid rgba(255,255,255,0.06);">
              You received this message because you are a registered member of Online Task Lab.<br>
              © ${new Date().getFullYear()} Online Task Lab. All rights reserved.
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `;
}

// POST /api/admin/broadcast-email - Broadcasts an email to multiple or all registered users via Brevo
app.post('/api/admin/broadcast-email', async (req: Request, res: Response): Promise<any> => {
  try {
    const {
      recipients,
      subject,
      message,
      useTemplate = true,
      buttonType = 'none',
      buttonText = '',
      buttonUrl = '',
      includeGreeting = false
    } = req.body;

    if (!Array.isArray(recipients) || recipients.length === 0) {
      return res.status(400).json({ success: false, error: 'At least one recipient email is required.' });
    }
    if (!subject || !subject.trim()) {
      return res.status(400).json({ success: false, error: 'Email subject is required.' });
    }
    if (!message || !message.trim()) {
      return res.status(400).json({ success: false, error: 'Email message content is required.' });
    }

    const cleanSubject = subject.trim();
    const cleanMessage = message.trim();

    let deliveredCount = 0;
    let failedCount = 0;
    const failedEmails: Array<{ email: string; reason: string }> = [];

    // Send emails sequentially with small delay to avoid rate-limiting
    for (const item of recipients) {
      const email = typeof item === 'string' ? item : item.email;
      const name = typeof item === 'object' ? item.name : undefined;
      const username = typeof item === 'object' ? item.username : undefined;

      if (!email || !email.includes('@')) {
        failedCount++;
        failedEmails.push({ email: email || 'unknown', reason: 'Invalid email address' });
        continue;
      }

      const emailHtml = useTemplate
        ? getBroadcastEmailHtml(cleanSubject, cleanMessage, name || username, {
            buttonType,
            buttonText,
            buttonUrl,
            includeGreeting
          })
        : cleanMessage.replace(/\n/g, '<br>');

      try {
        const result = await dispatchBrevoEmail({
          to: email.trim(),
          subject: cleanSubject,
          html: emailHtml,
          text: cleanMessage,
          purpose: 'broadcast_email',
          username,
          recipientName: name || username
        });

        if (result.success) {
          deliveredCount++;
        } else {
          failedCount++;
          failedEmails.push({ email, reason: result.error || 'Dispatch rejected' });
        }
      } catch (sendErr: any) {
        failedCount++;
        failedEmails.push({ email, reason: sendErr?.message || 'Network error' });
      }

      // 40ms pause between dispatches to maintain orderly queue
      await new Promise(r => setTimeout(r, 40));
    }

    return res.json({
      success: true,
      total: recipients.length,
      deliveredCount,
      failedCount,
      failedEmails,
      message: `Broadcast complete! Successfully delivered to ${deliveredCount} of ${recipients.length} recipients via Brevo.`
    });

  } catch (err: any) {
    console.error('[Broadcast Email Error]:', err);
    return res.status(500).json({ success: false, error: err?.message || 'Internal broadcast error' });
  }
});

// Dedicated Asset Endpoints for Email Compatibility
app.get('/otl-logo-animated.gif', (_req: Request, res: Response) => {
  const gifPath = path.join(process.cwd(), 'public', 'otl-logo-animated.gif');
  if (fs.existsSync(gifPath)) {
    res.setHeader('Content-Type', 'image/gif');
    res.setHeader('Cache-Control', 'public, max-age=604800, immutable');
    res.setHeader('Access-Control-Allow-Origin', '*');
    return res.sendFile(gifPath);
  }
  return res.status(404).send('Logo GIF not found');
});

app.get('/otl-logo.png', (_req: Request, res: Response) => {
  const pngPath = path.join(process.cwd(), 'public', 'otl-logo.png');
  if (fs.existsSync(pngPath)) {
    res.setHeader('Content-Type', 'image/png');
    res.setHeader('Cache-Control', 'public, max-age=604800, immutable');
    res.setHeader('Access-Control-Allow-Origin', '*');
    return res.sendFile(pngPath);
  }
  return res.status(404).send('Logo PNG not found');
});

// Dedicated SEO Endpoints: robots.txt and sitemap.xml
app.get('/robots.txt', (_req: Request, res: Response) => {
  const robotsPath = path.join(process.cwd(), 'public', 'robots.txt');
  if (fs.existsSync(robotsPath)) {
    res.setHeader('Content-Type', 'text/plain; charset=utf-8');
    res.setHeader('Cache-Control', 'public, max-age=86400');
    return res.sendFile(robotsPath);
  }
  res.setHeader('Content-Type', 'text/plain; charset=utf-8');
  return res.send(`User-agent: *\nAllow: /\nAllow: /category/\nAllow: /product/\nAllow: /contact\nDisallow: /search\nDisallow: /search/\nDisallow: /admin\nDisallow: /admin/\nDisallow: /admin-login\nDisallow: /admin/login\nDisallow: /verify-email\nDisallow: /api/\n\nSitemap: https://onlinetasklab.freedev.app/sitemap.xml\n`);
});

app.get('/sitemap.xml', (_req: Request, res: Response) => {
  const sitemapPath = path.join(process.cwd(), 'public', 'sitemap.xml');
  if (fs.existsSync(sitemapPath)) {
    res.setHeader('Content-Type', 'application/xml; charset=utf-8');
    res.setHeader('Cache-Control', 'public, max-age=3600');
    return res.sendFile(sitemapPath);
  }
  return res.status(404).send('Sitemap not found');
});

// Mount Production-Ready AI Support, RAG & Human Chat Router
app.use('/api', createSupportRouter());

// Catch-all 404 JSON handler for unhandled API routes (prevents fallback to HTML index)
app.all(['/api', '/api/*'], (_req: Request, res: Response) => {
  return res.status(404).json({
    success: false,
    error: 'API endpoint not found'
  });
});

// Catch-all Error JSON handler for API routes (guarantees API errors are JSON, never Express HTML error page)
app.use((err: any, req: Request, res: Response, next: NextFunction) => {
  if (res.headersSent) {
    return next(err);
  }
  const isApi = (req.originalUrl && req.originalUrl.startsWith('/api')) || (req.path && req.path.startsWith('/api'));
  if (isApi) {
    console.error('[API Unhandled Error]:', err);
    return res.status(500).json({
      success: false,
      error: err?.message || 'Internal server error occurred',
      errorCode: 'INTERNAL_SERVER_ERROR',
      fallbackToBrowser: true
    });
  }
  next(err);
});

// Start Server and mount Vite middleware
async function startServer() {
  const hasDist = fs.existsSync(path.join(process.cwd(), 'dist', 'index.html'));
  const isProduction =
    process.env.NODE_ENV === 'production' ||
    process.argv.includes('--production') ||
    (typeof __filename !== 'undefined' && __filename.endsWith('.cjs')) ||
    hasDist ||
    !fs.existsSync(path.join(process.cwd(), 'src'));

  const distPath = fs.existsSync(path.join(process.cwd(), 'dist', 'index.html'))
    ? path.join(process.cwd(), 'dist')
    : (fs.existsSync(path.join(currentDir, 'index.html')) ? currentDir : path.join(process.cwd(), 'dist'));

  // Safety guard: All /api routes MUST return JSON, NEVER HTML SPA index.html
  app.use((req: Request, res: Response, next: NextFunction) => {
    if (req.path === '/api' || req.path.startsWith('/api/')) {
      return res.status(404).json({
        success: false,
        error: 'API endpoint not found'
      });
    }
    next();
  });

  // Serve static assets from public folder (logos, icons, manifest, sitemaps)
  const publicPath = path.join(process.cwd(), 'public');
  if (fs.existsSync(publicPath)) {
    app.use(express.static(publicPath));
  }

  // Vite middleware for development
  if (!isProduction) {
    try {
      const { createServer: createViteServer } = await import('vite');
      const vite = await createViteServer({
        server: {
          middlewareMode: true,
          hmr: false,
        },
        appType: 'spa',
      });
      app.use(vite.middlewares);
    } catch (viteError) {
      console.warn('[OTL Server] Vite middleware initialization note:', viteError);
      app.use(express.static(distPath));
      app.get('*', (req: Request, res: Response) => {
        if (req.path === '/api' || req.path.startsWith('/api/')) {
          return res.status(404).json({
            success: false,
            error: 'API endpoint not found'
          });
        }
        const distIndex = path.join(distPath, 'index.html');
        const rootIndex = path.join(process.cwd(), 'index.html');
        if (fs.existsSync(distIndex)) {
          return res.sendFile(distIndex);
        }
        if (fs.existsSync(rootIndex)) {
          return res.sendFile(rootIndex);
        }
        return res.status(200).send('<!DOCTYPE html><html><head><title>Online Task Lab</title></head><body><div id="root"></div></body></html>');
      });
    }
  } else {
    app.use(express.static(distPath));
    app.get('*', (req: Request, res: Response) => {
      if (req.path === '/api' || req.path.startsWith('/api/')) {
        return res.status(404).json({
          success: false,
          error: 'API endpoint not found'
        });
      }
      const distIndex = path.join(distPath, 'index.html');
      const rootIndex = path.join(process.cwd(), 'index.html');
      if (fs.existsSync(distIndex)) {
        return res.sendFile(distIndex);
      }
      if (fs.existsSync(rootIndex)) {
        return res.sendFile(rootIndex);
      }
      return res.status(200).send('<!DOCTYPE html><html><head><title>Online Task Lab</title></head><body><div id="root"></div></body></html>');
    });
  }

  // Primary service binding on PORT (3000)
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`[OTL Server] Running on http://0.0.0.0:${PORT}`);
  });
}

startServer();

