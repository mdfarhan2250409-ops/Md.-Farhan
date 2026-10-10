import fs from 'fs';
import path from 'path';
import crypto from 'crypto';

export interface EmailConfig {
  provider: 'auto' | 'smtp' | 'brevo_api';
  smtpHost: string;
  smtpPort: number;
  smtpUser: string;
  smtpPass: string;
  smtpSecure: boolean;
  smtpFromName: string;
  smtpFromEmail: string;
  brevoApiKey: string;
  updatedAt?: string;
  updatedBy?: string;
}

export interface EmailOtpLog {
  id: string;
  recipientEmail: string;
  recipientName?: string;
  username?: string;
  purpose: 'registration_otp' | 'password_reset_otp' | 'welcome_email' | 'security_alert' | 'login_alert' | 'test_email' | 'broadcast_email' | 'general';
  subject: string;
  otpCode?: string;
  status: 'delivered' | 'sent' | 'failed';
  provider: string;
  sentAt: string;
  timestamp: number;
  expiresAt?: string;
  verified?: boolean;
  verifiedAt?: string;
  errorMessage?: string;
  deliveryMessageId?: string;
}

const DATA_DIR = path.join(process.cwd(), 'data');
const CONFIG_FILE = path.join(DATA_DIR, 'email_config.json');
const LOGS_FILE = path.join(DATA_DIR, 'email_otp_logs.json');

class EmailConfigService {
  private config: EmailConfig;
  private logs: EmailOtpLog[] = [];
  private readonly MAX_LOGS = 1000;

  constructor() {
    this.ensureDataDir();
    this.config = this.loadConfig();
    this.logs = this.loadLogs();
  }

  private ensureDataDir(): void {
    try {
      if (!fs.existsSync(DATA_DIR)) {
        fs.mkdirSync(DATA_DIR, { recursive: true });
      }
    } catch (err) {
      console.warn('[EmailConfigService] Warning creating data dir:', err);
    }
  }

  private getDefaultConfig(): EmailConfig {
    const portNum = Number(process.env.SMTP_PORT || 587);
    const isSecure = process.env.SMTP_SECURE !== undefined
      ? process.env.SMTP_SECURE === 'true'
      : portNum === 465;

    return {
      provider: 'auto',
      smtpHost: process.env.SMTP_HOST || 'smtp-relay.brevo.com',
      smtpPort: portNum,
      smtpUser: process.env.SMTP_USER || '',
      smtpPass: process.env.SMTP_PASS || '',
      smtpSecure: isSecure,
      smtpFromName: process.env.SMTP_FROM_NAME || 'Online Task Lab',
      smtpFromEmail: process.env.SMTP_FROM_EMAIL || process.env.SMTP_USER || 'no-reply@onlinetasklab.com',
      brevoApiKey: process.env.BREVO_API_KEY || (process.env.SMTP_PASS?.startsWith('xkeysib-') ? process.env.SMTP_PASS : ''),
      updatedAt: new Date().toISOString()
    };
  }

  private loadConfig(): EmailConfig {
    try {
      if (fs.existsSync(CONFIG_FILE)) {
        const raw = fs.readFileSync(CONFIG_FILE, 'utf-8');
        const parsed = JSON.parse(raw);
        return {
          ...this.getDefaultConfig(),
          ...parsed
        };
      }
    } catch (err) {
      console.warn('[EmailConfigService] Could not read email_config.json, using defaults:', err);
    }
    const defaults = this.getDefaultConfig();
    this.saveConfig(defaults);
    return defaults;
  }

  private saveConfig(config: EmailConfig): void {
    try {
      this.ensureDataDir();
      fs.writeFileSync(CONFIG_FILE, JSON.stringify(config, null, 2), 'utf-8');
    } catch (err) {
      console.error('[EmailConfigService] Error saving email_config.json:', err);
    }
  }

  private loadLogs(): EmailOtpLog[] {
    try {
      if (fs.existsSync(LOGS_FILE)) {
        const raw = fs.readFileSync(LOGS_FILE, 'utf-8');
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          return parsed.slice(0, this.MAX_LOGS);
        }
      }
    } catch (err) {
      console.warn('[EmailConfigService] Could not read email_otp_logs.json:', err);
    }
    return [];
  }

  private saveLogs(): void {
    try {
      this.ensureDataDir();
      fs.writeFileSync(LOGS_FILE, JSON.stringify(this.logs, null, 2), 'utf-8');
    } catch (err) {
      console.error('[EmailConfigService] Error saving email_otp_logs.json:', err);
    }
  }

  public getConfig(): EmailConfig {
    return { ...this.config };
  }

  public updateConfig(newConfig: Partial<EmailConfig>, updatedBy: string = 'admin'): EmailConfig {
    this.config = {
      ...this.config,
      ...newConfig,
      smtpPort: newConfig.smtpPort !== undefined ? Number(newConfig.smtpPort) : this.config.smtpPort,
      smtpSecure: newConfig.smtpSecure !== undefined ? Boolean(newConfig.smtpSecure) : this.config.smtpSecure,
      updatedAt: new Date().toISOString(),
      updatedBy
    };
    this.saveConfig(this.config);
    console.log(`[EmailConfigService] Configuration updated by ${updatedBy}. Provider: ${this.config.provider}, Host: ${this.config.smtpHost}, User: ${this.config.smtpUser}`);
    return this.getConfig();
  }

  public addLog(entry: Omit<EmailOtpLog, 'id' | 'timestamp'>): EmailOtpLog {
    const newLog: EmailOtpLog = {
      ...entry,
      id: 'log_' + Date.now() + '_' + crypto.randomBytes(3).toString('hex'),
      timestamp: Date.now()
    };

    this.logs.unshift(newLog);
    if (this.logs.length > this.MAX_LOGS) {
      this.logs = this.logs.slice(0, this.MAX_LOGS);
    }
    this.saveLogs();
    return newLog;
  }

  public markVerified(email: string, otpCode?: string): boolean {
    let marked = false;
    const normalizedEmail = email.trim().toLowerCase();

    for (const log of this.logs) {
      if (log.recipientEmail.toLowerCase() === normalizedEmail) {
        if (!otpCode || log.otpCode === otpCode) {
          log.verified = true;
          log.verifiedAt = new Date().toISOString();
          marked = true;
          break;
        }
      }
    }

    if (marked) {
      this.saveLogs();
    }
    return marked;
  }

  public getLogs(filters?: {
    search?: string;
    purpose?: string;
    status?: string;
    limit?: number;
  }): { logs: EmailOtpLog[]; total: number; verifiedCount: number; failedCount: number } {
    let result = [...this.logs];

    if (filters?.purpose && filters.purpose !== 'all') {
      result = result.filter(l => l.purpose === filters.purpose);
    }

    if (filters?.status && filters.status !== 'all') {
      if (filters.status === 'verified') {
        result = result.filter(l => l.verified);
      } else {
        result = result.filter(l => l.status === filters.status);
      }
    }

    if (filters?.search && filters.search.trim()) {
      const q = filters.search.trim().toLowerCase();
      result = result.filter(l =>
        l.recipientEmail.toLowerCase().includes(q) ||
        (l.username && l.username.toLowerCase().includes(q)) ||
        (l.otpCode && l.otpCode.includes(q)) ||
        l.subject.toLowerCase().includes(q) ||
        l.provider.toLowerCase().includes(q)
      );
    }

    const total = this.logs.length;
    const verifiedCount = this.logs.filter(l => l.verified).length;
    const failedCount = this.logs.filter(l => l.status === 'failed').length;

    const limit = filters?.limit || 100;
    return {
      logs: result.slice(0, limit),
      total,
      verifiedCount,
      failedCount
    };
  }

  public deleteLog(id: string): boolean {
    const initialLen = this.logs.length;
    this.logs = this.logs.filter(l => l.id !== id);
    if (this.logs.length !== initialLen) {
      this.saveLogs();
      return true;
    }
    return false;
  }

  public clearLogs(): void {
    this.logs = [];
    this.saveLogs();
  }
}

export const emailConfigService = new EmailConfigService();
