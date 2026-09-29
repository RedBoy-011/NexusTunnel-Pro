import { Subscription, ProxyConfig, SystemStatus } from '../src/types.js';
import { parseSubscriptionContent } from './parser.js';
import { testConfigsBatch } from './tester.js';

class SubscriptionStore {
  private subscriptions: Map<string, Subscription> = new Map();
  private subscriptionRawContent: Map<string, string> = new Map();
  private allConfigs: ProxyConfig[] = [];
  private testIntervalSeconds: number = 60;
  private timer: NodeJS.Timeout | null = null;
  private countdownTimer: NodeJS.Timeout | null = null;
  private secondsUntilNextTest: number = 60;
  private isTesting: boolean = false;
  private lastTestedAt: string | null = null;

  constructor() {
    this.seedDefaultSubscriptions();
    this.startScheduler();
  }

  private seedDefaultSubscriptions() {
    // Provide realistic sample subscriptions for testing and immediate exploration
    const sub1Id = 'sub_main_ir';
    const sub1Name = 'اشتراک آلمان و فنلاند (سرعت بالا)';
    const sampleVless1 = [
      'vless://b7a69cb8-0112-4f81-8094-11883394a1d2@1.1.1.1:443?type=tcp&security=tls#🇩🇪 آلمان - فرانکفورت 01',
      'vless://b7a69cb8-0112-4f81-8094-11883394a1d2@8.8.8.8:443?type=tcp&security=tls#🇫🇮 فنلاند - هلسینکی 02',
      'vless://b7a69cb8-0112-4f81-8094-11883394a1d2@1.0.0.1:443?type=tcp&security=tls#🇳🇱 هلند - آمستردام 03',
      'vless://b7a69cb8-0112-4f81-8094-11883394a1d2@9.9.9.9:443?type=tcp&security=tls#🇩🇪 آلمان - برلین 04',
      'trojan://pass123456@1.1.1.1:443?security=tls#🇬🇧 انگلستان - لندن 05',
      'vmess://eyJhZGQiOiIxLjAuMC4xIiwicG9ydCI6NDQzLCJpZCI6ImI3YTY5Y2I4LTAxMTItNGY4MS04MDk0LTExODgzMzk0YTFkMiIsImFpZCI6MCwibmV0Ijoid3MiLCJwYXRoIjoiL3ZtZXNzIiwicHMiOiLwn4em8J+HsCDZgdmG2YTYp9mG2K8gMDUifQ==',
      'ss://YWVzLTI1Ni1nY206cGFzc3dvcmRAMS4xLjEuMTo4Mzg4#🇸🇪 سوئد - استکهلم 06',
    ].join('\n');

    const sub2Id = 'sub_cdn_direct';
    const sub2Name = 'اشتراک کلودفلر کلین آی‌پی';
    const sampleVless2 = [
      'vless://6c934371-d602-4fc9-b68e-289569fa1e62@104.16.132.229:443?type=tcp&security=tls#⚡ کلودفلر CDN - سرور ۱',
      'vless://6c934371-d602-4fc9-b68e-289569fa1e62@104.16.133.229:443?type=tcp&security=tls#⚡ کلودفلر CDN - سرور ۲',
      'vless://6c934371-d602-4fc9-b68e-289569fa1e62@172.67.182.203:443?type=tcp&security=tls#⚡ کلودفلر CDN - سرور ۳',
      'trojan://cfpass@104.17.150.100:443?security=tls#⚡ تروجان CDN کلودفلر',
      'vless://6c934371-d602-4fc9-b68e-289569fa1e62@104.18.25.100:443?type=tcp&security=tls#⚡ کلودفلر CDN - سرور ۴',
      'vless://6c934371-d602-4fc9-b68e-289569fa1e62@198.41.200.1:443?type=tcp&security=tls#⚡ Anycast آی‌پی تمیز',
    ].join('\n');

    this.subscriptions.set(sub1Id, {
      id: sub1Id,
      name: sub1Name,
      url: 'https://sub.example.com/api/v1/client/subscribe?token=demo1',
      enabled: true,
      createdAt: new Date().toLocaleDateString('fa-IR'),
      configsCount: 7,
      activeCount: 7,
    });
    this.subscriptionRawContent.set(sub1Id, sampleVless1);

    this.subscriptions.set(sub2Id, {
      id: sub2Id,
      name: sub2Name,
      url: 'https://fast-v2ray.org/sub/cloud-direct',
      enabled: true,
      createdAt: new Date().toLocaleDateString('fa-IR'),
      configsCount: 6,
      activeCount: 6,
    });
    this.subscriptionRawContent.set(sub2Id, sampleVless2);

    this.refreshAllConfigs();
  }

  public getSubscriptions(): Subscription[] {
    return Array.from(this.subscriptions.values());
  }

  public async addSubscription(urlOrRaw: string, customName?: string): Promise<Subscription> {
    const isUrl = urlOrRaw.trim().startsWith('http://') || urlOrRaw.trim().startsWith('https://');
    const id = `sub_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    
    let content = '';
    let autoName = customName?.trim() || '';

    if (isUrl) {
      const trimmedUrl = urlOrRaw.trim();
      try {
        const parsedUrl = new URL(trimmedUrl);
        if (!autoName) {
          autoName = `سابسکرایب ${parsedUrl.hostname}`;
        }
      } catch {
        if (!autoName) autoName = `سابسکرایب جدید`;
      }

      // Fetch online content
      try {
        const resp = await fetch(trimmedUrl, {
          headers: {
            'User-Agent': 'v2rayN/6.23 ClashMeta/1.16 Sing-box/1.8'
          },
          signal: AbortSignal.timeout(10000)
        });
        
        if (!resp.ok) {
          throw new Error(`خطای دریافت سرور: وضعیت ${resp.status}`);
        }

        // Try extracting name from headers if not specified
        if (!customName) {
          const profileTitle = resp.headers.get('profile-title');
          if (profileTitle) {
            autoName = decodeURIComponent(profileTitle);
          }
        }

        content = await resp.text();
      } catch (err: any) {
        // If fetch fails, we still register the subscription and record error
        content = '';
      }
    } else {
      // Direct raw configs pasted by user
      content = urlOrRaw;
      if (!autoName) {
        autoName = `کانفیگ‌های دستی ${new Date().toLocaleTimeString('fa-IR')}`;
      }
    }

    const sub: Subscription = {
      id,
      name: autoName,
      url: urlOrRaw.trim(),
      enabled: true,
      createdAt: new Date().toLocaleDateString('fa-IR'),
      configsCount: 0,
      activeCount: 0,
    };

    this.subscriptions.set(id, sub);
    this.subscriptionRawContent.set(id, content);

    // Refresh and trigger ping test
    await this.refreshAllConfigs();
    this.triggerImmediateTest();

    return sub;
  }

  public updateSubscription(id: string, updates: { name?: string; enabled?: boolean }): Subscription | null {
    const existing = this.subscriptions.get(id);
    if (!existing) return null;

    if (updates.name !== undefined && updates.name.trim()) {
      existing.name = updates.name.trim();
    }
    if (updates.enabled !== undefined) {
      existing.enabled = updates.enabled;
    }

    this.subscriptions.set(id, existing);
    this.refreshAllConfigs();
    if (updates.enabled !== undefined) {
      this.triggerImmediateTest();
    }
    return existing;
  }

  public deleteSubscription(id: string): boolean {
    const res = this.subscriptions.delete(id);
    this.subscriptionRawContent.delete(id);
    this.refreshAllConfigs();
    this.triggerImmediateTest();
    return res;
  }

  public async refreshSubscriptionContent(id: string): Promise<boolean> {
    const sub = this.subscriptions.get(id);
    if (!sub || !sub.url.startsWith('http')) return false;

    try {
      const resp = await fetch(sub.url, {
        headers: { 'User-Agent': 'v2rayN/6.23' },
        signal: AbortSignal.timeout(10000)
      });
      if (resp.ok) {
        const text = await resp.text();
        this.subscriptionRawContent.set(id, text);
        await this.refreshAllConfigs();
        this.triggerImmediateTest();
        return true;
      }
    } catch {
      // Failed to update
    }
    return false;
  }

  private refreshAllConfigs() {
    const allParsed: ProxyConfig[] = [];

    for (const [subId, sub] of this.subscriptions.entries()) {
      if (!sub.enabled) continue;
      const raw = this.subscriptionRawContent.get(subId) || '';
      const configs = parseSubscriptionContent(raw, sub.id, sub.name);
      
      // Update sub count
      sub.configsCount = configs.length;
      allParsed.push(...configs);
    }

    // Preserve previous pings if any
    const existingMap = new Map(this.allConfigs.map(c => [c.rawUrl, c]));
    this.allConfigs = allParsed.map(cfg => {
      const prev = existingMap.get(cfg.rawUrl);
      if (prev && prev.ping > 0) {
        return {
          ...cfg,
          ping: prev.ping,
          status: prev.status,
          lastTestedAt: prev.lastTestedAt,
        };
      }
      return cfg;
    });

    this.recalculateRankingAndPorts();
  }

  public async triggerImmediateTest(): Promise<ProxyConfig[]> {
    if (this.isTesting) return this.allConfigs;
    this.isTesting = true;

    try {
      // Mark all as testing
      this.allConfigs.forEach(c => c.status = 'testing');
      
      const tested = await testConfigsBatch(this.allConfigs, 10, 2500);
      this.allConfigs = tested;
      this.lastTestedAt = new Date().toLocaleTimeString('fa-IR');
      this.recalculateRankingAndPorts();
    } finally {
      this.isTesting = false;
      this.secondsUntilNextTest = this.testIntervalSeconds;
    }

    return this.allConfigs;
  }

  private recalculateRankingAndPorts() {
    // Separate working configs with real ping > 0 from failed/unreachable
    const working = this.allConfigs.filter(c => c.ping > 0 && c.status === 'online');
    const failed = this.allConfigs.filter(c => c.ping <= 0 || c.status !== 'online');

    // Sort working by ping ASC (lowest ping first)
    working.sort((a, b) => a.ping - b.ping);

    // Assign top 8 to ports 1081 - 1088
    for (let i = 0; i < working.length; i++) {
      if (i < 8) {
        working[i].assignedPort = 1081 + i;
        working[i].isLoadBalanced = true;
      } else {
        working[i].assignedPort = undefined;
        working[i].isLoadBalanced = false;
      }
    }

    // Clear ports for failed
    for (const f of failed) {
      f.assignedPort = undefined;
      f.isLoadBalanced = false;
    }

    this.allConfigs = [...working, ...failed];

    // Update active count per subscription
    for (const sub of this.subscriptions.values()) {
      sub.activeCount = working.filter(c => c.subscriptionId === sub.id).length;
    }
  }

  public getAllConfigs(): ProxyConfig[] {
    return this.allConfigs;
  }

  public getTop8Configs(): ProxyConfig[] {
    return this.allConfigs.filter(c => c.assignedPort && c.assignedPort >= 1081 && c.assignedPort <= 1088);
  }

  public getStatus(): SystemStatus {
    const online = this.allConfigs.filter(c => c.ping > 0 && c.status === 'online').length;
    return {
      totalSubscriptions: this.subscriptions.size,
      activeSubscriptions: Array.from(this.subscriptions.values()).filter(s => s.enabled).length,
      totalConfigs: this.allConfigs.length,
      onlineConfigs: online,
      testInterval: this.testIntervalSeconds,
      lastTestTime: this.lastTestedAt,
      nextTestCountdown: this.secondsUntilNextTest,
      isTesting: this.isTesting,
      masterPort: 1080,
      poolPorts: [1081, 1082, 1083, 1084, 1085, 1086, 1087, 1088],
      loadBalancerAlgorithm: 'round-robin'
    };
  }

  public setTestInterval(seconds: number) {
    if (seconds >= 10 && seconds <= 600) {
      this.testIntervalSeconds = seconds;
      this.secondsUntilNextTest = seconds;
      this.startScheduler();
    }
  }

  private startScheduler() {
    if (this.timer) clearInterval(this.timer);
    if (this.countdownTimer) clearInterval(this.countdownTimer);

    this.secondsUntilNextTest = this.testIntervalSeconds;

    // Countdown second by second
    this.countdownTimer = setInterval(() => {
      if (this.secondsUntilNextTest > 0) {
        this.secondsUntilNextTest--;
      } else {
        this.secondsUntilNextTest = this.testIntervalSeconds;
      }
    }, 1000);

    // Run test on interval
    this.timer = setInterval(() => {
      this.triggerImmediateTest();
    }, this.testIntervalSeconds * 1000);
  }
}

export const store = new SubscriptionStore();
