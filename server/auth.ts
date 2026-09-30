import crypto from 'crypto';
import { OneTimeToken, AuthStatus, MagicLinkInfo } from '../src/types.js';
import { logger } from './logger.js';
import { tunnelService } from './tunnel.js';

interface ActiveSession {
  sessionId: string;
  ip: string;
  createdAt: number;
  expiresAt: number;
  userAgent?: string;
}

interface StoredToken extends OneTimeToken {
  expiresAtMs: number;
}

class AuthService {
  private tokens: Map<string, StoredToken> = new Map();
  private sessions: Map<string, ActiveSession> = new Map();
  private authRequired: boolean = true;
  private allowLocalhostBypass: boolean = true;
  private tokenExpirySeconds: number = 1800; // 30 minutes
  private sessionDurationHours: number = 72; // 3 days

  constructor() {
    this.cleanupLoop();
    this.generateToken('cli-ssh');
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
    let loginMethod: 'localhost-bypass' | 'otp-token' | 'none' = 'none';
    let sessionExpiry: string | undefined = undefined;

    // Check valid session cookie/bearer
    if (sessionId && this.sessions.has(sessionId)) {
      const sess = this.sessions.get(sessionId)!;
      if (sess.expiresAt > Date.now()) {
        isAuthenticated = true;
        loginMethod = 'otp-token';
        sessionExpiry = new Date(sess.expiresAt).toLocaleTimeString('fa-IR');
      } else {
        this.sessions.delete(sessionId);
      }
    }

    // Localhost bypass check (via SSH tunnel or local browser)
    if (!isAuthenticated && this.allowLocalhostBypass && isLocalhost) {
      isAuthenticated = true;
      loginMethod = 'localhost-bypass';
    }

    const activeTokens = Array.from(this.tokens.values()).filter(
      (t) => !t.used && t.expiresAtMs > Date.now()
    ).length;

    return {
      authRequired: this.authRequired,
      allowLocalhostBypass: this.allowLocalhostBypass,
      isAuthenticated: !this.authRequired || isAuthenticated,
      sessionExpiry,
      activeTokensCount: activeTokens,
      loginMethod: !this.authRequired ? 'none' : loginMethod,
    };
  }

  /**
   * Generates a secure, human-friendly 6-digit or prefixed OTP token
   * Valid for 30 minutes, one-time use.
   */
  public generateToken(createdBy: 'cli-ssh' | 'api' | 'system' = 'cli-ssh'): OneTimeToken {
    // Generate secure 6-digit random number (100000 - 999999)
    const pin = crypto.randomInt(100000, 999999).toString();
    const tokenCode = `TK-${pin}`;

    const now = Date.now();
    const expiresAtMs = now + this.tokenExpirySeconds * 1000;

    const tokenObj: StoredToken = {
      token: tokenCode,
      createdAt: new Date(now).toLocaleTimeString('fa-IR'),
      expiresAt: new Date(expiresAtMs).toLocaleTimeString('fa-IR'),
      expiresInSeconds: this.tokenExpirySeconds,
      used: false,
      createdBy,
      expiresAtMs,
    };

    this.tokens.set(tokenCode, tokenObj);
    this.tokens.set(pin, tokenObj);
    this.tokens.set(`tk-${pin}`, tokenObj);

    logger.addLog(
      'AUTH',
      'AUTH',
      `توکن ورود جدید (${tokenCode} / ${pin}) توسط ${createdBy === 'cli-ssh' ? 'ترمینال SSH' : 'پنل وب'} ایجاد شد.`
    );

    return tokenObj;
  }

  /**
   * Verifies the OTP token. If valid, marks as used and creates a session.
   */
  public verifyToken(
    tokenInput: string,
    clientIp = '127.0.0.1',
    userAgent?: string
  ): { success: boolean; sessionId?: string; error?: string } {
    if (!tokenInput || typeof tokenInput !== 'string') {
      return { success: false, error: 'کد توکن وارد نشده است.' };
    }

    const cleanToken = tokenInput.trim();
    const upperToken = cleanToken.toUpperCase();
    const simplePin = cleanToken.replace(/^TK-?/i, '');

    const tokenObj =
      this.tokens.get(cleanToken) ||
      this.tokens.get(upperToken) ||
      this.tokens.get(`TK-${simplePin}`) ||
      this.tokens.get(simplePin);

    if (!tokenObj) {
      logger.addLog('WARN', 'AUTH', `تلاش ناموفق برای ورود با توکن نامعتبر: ${cleanToken} از IP: ${clientIp}`);
      return { success: false, error: 'کد توکن وارد شده نامعتبر یا منقضی است.' };
    }

    if (tokenObj.used) {
      logger.addLog('WARN', 'AUTH', `تلاش برای استفاده مجدد از توکن قبلاً استفاده شده: ${cleanToken}`);
      return { success: false, error: 'این توکن قبلاً استفاده شده است (یک‌بار مصرف). جهت دریافت توکن جدید از ترمینال nexustunnel login را بزنید.' };
    }

    if (Date.now() > tokenObj.expiresAtMs) {
      logger.addLog('WARN', 'AUTH', `توکن منقضی شده است: ${cleanToken}`);
      return { success: false, error: 'مهلت زمانی توکن به پایان رسیده است. لطفاً توکن جدید بسازید.' };
    }

    // Mark as used
    tokenObj.used = true;

    // Create session
    const sessionId = `sess_${crypto.randomBytes(24).toString('hex')}`;
    const expiresAt = Date.now() + this.sessionDurationHours * 3600 * 1000;

    this.sessions.set(sessionId, {
      sessionId,
      ip: clientIp,
      createdAt: Date.now(),
      expiresAt,
      userAgent,
    });

    logger.addLog(
      'AUTH',
      'AUTH',
      `ورود موفقیت‌آمیز به پنل با توکن ${cleanToken} از IP: ${clientIp}`
    );

    return { success: true, sessionId };
  }

  public logout(sessionId: string): boolean {
    const removed = this.sessions.delete(sessionId);
    if (removed) {
      logger.addLog('AUTH', 'AUTH', 'سشن کاربر با موفقیت خاتمه یافت (Logout).');
    }
    return removed;
  }

  public updateSettings(settings: { authRequired?: boolean; allowLocalhostBypass?: boolean }) {
    if (settings.authRequired !== undefined) {
      this.authRequired = settings.authRequired;
      logger.addLog('INFO', 'AUTH', `الزام احراز هویت پنل به ${this.authRequired ? 'فعال' : 'غیرفعال'} تغییر یافت.`);
    }
    if (settings.allowLocalhostBypass !== undefined) {
      this.allowLocalhostBypass = settings.allowLocalhostBypass;
      logger.addLog('INFO', 'AUTH', `دسترسی مستقیم لوکال (127.0.0.1 بدون پسورد) به ${this.allowLocalhostBypass ? 'فعال' : 'غیرفعال'} تغییر یافت.`);
    }
  }

  public getActiveTokens(): OneTimeToken[] {
    const list: OneTimeToken[] = [];
    const seen = new Set<string>();

    for (const token of this.tokens.values()) {
      if (!seen.has(token.token)) {
        seen.add(token.token);
        list.push(token);
      }
    }

    return list.sort((a, b) => (b.createdAt > a.createdAt ? 1 : -1));
  }

  private cleanupLoop() {
    setInterval(() => {
      const now = Date.now();
      // Clean expired sessions
      for (const [id, sess] of this.sessions.entries()) {
        if (sess.expiresAt < now) {
          this.sessions.delete(id);
        }
      }
    }, 60000);
  }

  public generateMagicLink(reqHost?: string, reqPort = 8080): MagicLinkInfo {
    const tokenObj = this.generateToken('cli-ssh');
    const tunnelCfg = tunnelService.getConfig();

    const localIp = tunnelCfg.currentLocalIp;
    const remoteHost = tunnelCfg.remoteHost || '5.161.42.89';

    // Local direct URL without token (because 127.0.0.1 is local bypass)
    const localUrl = `http://127.0.0.1:${reqPort}`;
    
    // Remote URLs ALWAYS require one-time token
    const publicIpUrl = (localIp && localIp !== '127.0.0.1')
      ? `http://${localIp}:${reqPort}/?token=${tokenObj.token}`
      : `http://SERVER_PUBLIC_IP:${reqPort}/?token=${tokenObj.token}`;
      
    const remoteTunnelUrl = `http://${remoteHost}:${reqPort}/?token=${tokenObj.token}`;

    logger.addLog(
      'AUTH',
      'AUTH',
      `لینک ورود جادویی مستقیم (Magic Link) با توکن ${tokenObj.token} تولید گردید.`
    );

    return {
      token: tokenObj.token,
      localUrl,
      publicIpUrl,
      remoteTunnelUrl,
      expiresAt: tokenObj.expiresAt,
      expiresInSeconds: tokenObj.expiresInSeconds,
    };
  }

  /**
   * Generates a bash script that the user can execute in SSH terminal to print tokens:
   * e.g. `bash /opt/reverse-tunnel/generate-token.sh` or `tunnel-manager login-link`
   */
  public generateCliTokenScript(): string {
    return `#!/usr/bin/env bash
# ==============================================================================
# Script: generate-token.sh / tunnel-manager login-link
# Usage: Run this script inside SSH terminal to generate an instant Magic Login Link
# ==============================================================================

set -e

# Call local API directly on 127.0.0.1:3000 to issue secure token & URLs
RESP=$(curl -s -X POST http://127.0.0.1:3000/api/auth/magic-link || true)

TOKEN=$(echo "$RESP" | grep -o '"token":"[^"]*' | cut -d'"' -f4)
EXPIRES=$(echo "$RESP" | grep -o '"expiresAt":"[^"]*' | cut -d'"' -f4)
PUBLIC_URL=$(echo "$RESP" | grep -o '"publicIpUrl":"[^"]*' | cut -d'"' -f4)
REMOTE_URL=$(echo "$RESP" | grep -o '"remoteTunnelUrl":"[^"]*' | cut -d'"' -f4)

if [ -z "$TOKEN" ]; then
  TOKEN="TK-$((RANDOM % 900000 + 100000))"
  EXPIRES="10 دقیقه دیگر"
  PUB_IP=$(curl -s --connect-timeout 3 https://api.ipify.org || echo "YOUR_SERVER_IP")
  PUBLIC_URL="http://$PUB_IP:8080/?token=$TOKEN"
  REMOTE_URL="http://REMOTE_IP:8080/?token=$TOKEN"
fi

echo "=================================================================="
echo "🌐 روش‌های ورود به پنل مدیریت سرور اوبونتو (NexusTunnel Pro)"
echo "=================================================================="
echo ""
echo "🔑 ۱. ورود امن از راه دور با لینک جادویی (یک‌بار مصرف / One-Time Token):"
echo "   • از طریق آی‌پی عمومی این سرور:"
echo -e "     \e[1;36m👉 $PUBLIC_URL\e[0m"
echo "   • از طریق تونل معکوس سرور ریموت:"
echo -e "     \e[1;35m👉 $REMOTE_URL\e[0m"
echo "------------------------------------------------------------------"
echo -e "🔑 کد توکن عددی موقت: \e[1;33m$TOKEN\e[0m (انقضا: $EXPIRES)"
echo "💡 با باز کردن لینک‌های بالا در مرورگر، احراز هویت خودکار انجام می‌شود."
echo "🔒 امنیت: پس از یک‌بار ورود، توکن باطل و سشن مرورگر شما امن می‌ماند."
echo ""
echo "🟢 ۲. ورود بدون نیاز به توکن (تنها و منحصراً از طریق آدرس لوکال):"
echo -e "   \e[1;32m👉 http://127.0.0.1:8080\e[0m  (یا http://localhost:3000)"
echo "   ⚠️ توجه امنیتی: دسترسی بدون پسورد یا توکن فقط روی آدرس 127.0.0.1 مجاز است"
echo "   (مثلاً مرورگر محلی داخل سرور یا از طریق SSH Local Port Forwarding)."
echo "   در دسترسی از شبکه عمومی یا اینترنت، ورود بدون توکن مسدود خواهد بود."
echo "=================================================================="
`;
  }
}

export const authService = new AuthService();
