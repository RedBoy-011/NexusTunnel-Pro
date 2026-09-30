import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import { AuthStatus, CliAuthInfo } from '../src/types.js';
import { logger } from './logger.js';
import { tunnelService } from './tunnel.js';

interface ActiveSession {
  sessionId: string;
  ip: string;
  createdAt: number;
  expiresAt: number;
  userAgent?: string;
}

interface AuthConfigFile {
  password: string;
  authRequired: boolean;
  updatedAt?: string;
}

class AuthService {
  private sessions: Map<string, ActiveSession> = new Map();
  private password: string = 'admin123';
  private authRequired: boolean = true;
  private sessionDurationHours: number = 72; // 3 days
  private configFilePath: string = path.resolve(process.cwd(), 'auth_config.json');

  constructor() {
    this.loadConfig();
    this.cleanupLoop();
  }

  private loadConfig() {
    try {
      if (fs.existsSync(this.configFilePath)) {
        const raw = fs.readFileSync(this.configFilePath, 'utf-8');
        const parsed: AuthConfigFile = JSON.parse(raw);
        if (parsed.password) this.password = parsed.password;
        if (parsed.authRequired !== undefined) this.authRequired = parsed.authRequired;
      } else {
        this.saveConfig();
      }
    } catch {
      // fallback to default
    }
  }

  private saveConfig() {
    try {
      const data: AuthConfigFile = {
        password: this.password,
        authRequired: this.authRequired,
        updatedAt: new Date().toISOString(),
      };
      fs.writeFileSync(this.configFilePath, JSON.stringify(data, null, 2), 'utf-8');
    } catch {
      // ignore
    }
  }

  public getStatus(clientIp?: string, sessionId?: string): AuthStatus {
    const isLocalhost =
      !clientIp ||
      clientIp === '127.0.0.1' ||
      clientIp === '::1' ||
      clientIp === 'localhost' ||
      clientIp.includes('127.0.0.1') ||
      clientIp.includes('::1') ||
      clientIp.endsWith('::1') ||
      clientIp.startsWith('127.') ||
      clientIp === '::ffff:127.0.0.1';

    let isAuthenticated = false;
    let loginMethod: 'localhost-bypass' | 'password' | 'none' = 'none';
    let sessionExpiry: string | undefined = undefined;

    // Check valid session
    if (sessionId && this.sessions.has(sessionId)) {
      const sess = this.sessions.get(sessionId)!;
      if (sess.expiresAt > Date.now()) {
        isAuthenticated = true;
        loginMethod = 'password';
        sessionExpiry = new Date(sess.expiresAt).toLocaleTimeString('fa-IR');
      } else {
        this.sessions.delete(sessionId);
      }
    }

    // Localhost bypass check (via SSH tunnel or local browser)
    if (!isAuthenticated && isLocalhost) {
      isAuthenticated = true;
      loginMethod = 'localhost-bypass';
    }

    return {
      authRequired: this.authRequired,
      isAuthenticated: !this.authRequired || isAuthenticated,
      sessionExpiry,
      loginMethod: !this.authRequired ? 'none' : loginMethod,
      hasPassword: !!this.password,
    };
  }

  public login(
    passwordInput: string,
    clientIp = '127.0.0.1',
    userAgent?: string
  ): { success: boolean; sessionId?: string; error?: string } {
    if (!this.authRequired) {
      const sessionId = `sess_${crypto.randomBytes(24).toString('hex')}`;
      return { success: true, sessionId };
    }

    if (!passwordInput) {
      return { success: false, error: 'لطفاً رمز عبور را وارد نمایید.' };
    }

    if (passwordInput.trim() !== this.password) {
      logger.addLog('WARN', 'AUTH', `تلاش ناموفق برای ورود با رمز عبور اشتباه از IP: ${clientIp}`);
      return { success: false, error: 'رمز عبور وارد شده نادرست است.' };
    }

    const sessionId = `sess_${crypto.randomBytes(24).toString('hex')}`;
    const expiresAt = Date.now() + this.sessionDurationHours * 3600 * 1000;

    this.sessions.set(sessionId, {
      sessionId,
      ip: clientIp,
      createdAt: Date.now(),
      expiresAt,
      userAgent,
    });

    logger.addLog('AUTH', 'AUTH', `ورود موفقیت‌آمیز به پنل با رمز عبور از IP: ${clientIp}`);
    return { success: true, sessionId };
  }

  public setPassword(newPassword: string): { success: boolean; message: string } {
    if (!newPassword || newPassword.trim().length < 3) {
      throw new Error('رمز عبور باید حداقل دارای ۳ کاراکتر باشد.');
    }
    this.password = newPassword.trim();
    this.saveConfig();
    logger.addLog('INFO', 'AUTH', `رمز عبور پنل مدیریت با موفقیت بروزرسانی شد.`);
    return { success: true, message: 'رمز عبور با موفقیت بروزرسانی شد.' };
  }

  public toggleAuth(enabled: boolean): { success: boolean; authRequired: boolean } {
    this.authRequired = Boolean(enabled);
    this.saveConfig();
    logger.addLog(
      'INFO',
      'AUTH',
      `وضعیت قفل ورود پنل به ${this.authRequired ? 'فعال (نیازمند رمز)' : 'غیرفعال (ورود آزاد)'} تغییر یافت.`
    );
    return { success: true, authRequired: this.authRequired };
  }

  public getCliAuthInfo(reqPort = 8080): CliAuthInfo {
    const tunnelCfg = tunnelService.getConfig();
    const publicIp =
      tunnelCfg.currentLocalIp && tunnelCfg.currentLocalIp !== '127.0.0.1'
        ? tunnelCfg.currentLocalIp
        : 'SERVER_IP';
    return {
      authRequired: this.authRequired,
      password: this.password,
      port: reqPort,
      publicIp,
      panelUrl: `http://${publicIp}:${reqPort}`,
    };
  }

  public logout(sessionId: string): boolean {
    return this.sessions.delete(sessionId);
  }

  private cleanupLoop() {
    setInterval(() => {
      const now = Date.now();
      for (const [id, sess] of this.sessions.entries()) {
        if (sess.expiresAt < now) {
          this.sessions.delete(id);
        }
      }
    }, 60000);
  }
}

export const authService = new AuthService();
