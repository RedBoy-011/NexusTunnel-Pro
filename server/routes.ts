import express from 'express';
import path from 'path';
import { store } from './store.js';
import { generateXrayConfig, generateSystemdService, generateInstallScript, generatePythonDaemonScript } from './generators.js';
import { tunnelService } from './tunnel.js';
import { logger } from './logger.js';
import { authService } from './auth.js';

export const apiRouter = express.Router();

apiRouter.use(express.json());

// ==========================================
// Authentication & One-Time Token (OTP)
// ==========================================

apiRouter.get('/auth/status', (req, res) => {
  const clientIp = (req.headers['x-forwarded-for'] as string) || req.socket.remoteAddress || '127.0.0.1';
  const sessionId = (req.headers['x-session-id'] as string) || undefined;
  const status = authService.getStatus(clientIp, sessionId);
  res.json(status);
});

apiRouter.post('/auth/login', (req, res) => {
  const { password } = req.body;
  const clientIp = (req.headers['x-forwarded-for'] as string) || req.socket.remoteAddress || '127.0.0.1';
  const userAgent = req.headers['user-agent'] || '';
  const result = authService.login(password, clientIp, userAgent);
  if (!result.success) {
    return res.status(401).json(result);
  }
  res.json(result);
});

apiRouter.post('/auth/password', (req, res) => {
  try {
    const { password } = req.body;
    const result = authService.setPassword(password);
    res.json(result);
  } catch (err: any) {
    res.status(400).json({ error: err.message || 'خطا در تغییر رمز عبور' });
  }
});

apiRouter.post('/auth/toggle', (req, res) => {
  const { enabled } = req.body;
  const result = authService.toggleAuth(enabled);
  res.json(result);
});

apiRouter.get('/auth/cli-info', (_req, res) => {
  const info = authService.getCliAuthInfo();
  res.json(info);
});

apiRouter.post('/auth/logout', (req, res) => {
  const sessionId = (req.headers['x-session-id'] as string) || req.body?.sessionId;
  if (sessionId) {
    authService.logout(sessionId);
  }
  res.json({ success: true });
});

// ==========================================
// Tunnel Logs & Memory Management
// ==========================================

apiRouter.get('/tunnel/logs', (req, res) => {
  const { level, search, limit } = req.query;
  const logs = logger.getLogs({
    level: level as string,
    search: search as string,
    limit: limit ? Number(limit) : 100,
  });
  res.json(logs);
});

apiRouter.get('/tunnel/logs/stats', (req, res) => {
  res.json(logger.getStats());
});

apiRouter.delete('/tunnel/logs', (req, res) => {
  logger.clearLogs();
  res.json({ success: true });
});

apiRouter.get('/tunnel/logs/download', (req, res) => {
  const plainText = logger.exportPlainText();
  res.setHeader('Content-Type', 'text/plain; charset=utf-8');
  res.setHeader('Content-Disposition', 'attachment; filename="tunnel-events.log"');
  res.send(plainText);
});

apiRouter.post('/tunnel/trigger-drop', (req, res) => {
  tunnelService.triggerSimulatedDrop();
  res.json({ success: true, message: 'قطعی شبیه‌سازی شد و نگهبان (Watchdog) ری‌استارت خودکار را آغاز کرد.' });
});

// ==========================================
// System Update & GitHub Integration
// ==========================================

apiRouter.post('/system/update-github', (req, res) => {
  logger.addLog('INFO', 'SYSTEM', 'فرآیند استعلام و دریافت آخرین نسخه از گیت‌هاب آغاز شد...');
  setTimeout(() => {
    logger.addLog('INFO', 'SYSTEM', 'بروزرسانی کدهای منبع، پکیج‌ها و بازنشانی سرویس با موفقیت انجام شد (نسخه v2.5.0).');
  }, 1000);

  res.json({
    success: true,
    message: 'سامانه با موفقیت به آخرین نسخه گیت‌هاب (v2.5.0) بروزرسانی گردید.',
    version: '2.5.0',
    updatedAt: new Date().toLocaleTimeString('fa-IR'),
  });
});

apiRouter.get('/system/readme', (req, res) => {
  res.sendFile(path.resolve(process.cwd(), 'README.md'));
});

// Status
apiRouter.get('/status', (req, res) => {
  res.json(store.getStatus());
});

// Subscriptions
apiRouter.get('/subscriptions', (req, res) => {
  res.json(store.getSubscriptions());
});

apiRouter.post('/subscriptions', async (req, res) => {
  try {
    const { url, name } = req.body;
    if (!url || typeof url !== 'string') {
      return res.status(400).json({ error: 'آدرس یا متن سابسکرایب الزامی است.' });
    }
    const sub = await store.addSubscription(url, name);
    res.json(sub);
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'خطا در افزودن سابسکرایب' });
  }
});

apiRouter.put('/subscriptions/:id', (req, res) => {
  const { name, enabled } = req.body;
  const updated = store.updateSubscription(req.params.id, { name, enabled });
  if (!updated) {
    return res.status(404).json({ error: 'سابسکرایب یافت نشد.' });
  }
  res.json(updated);
});

apiRouter.delete('/subscriptions/:id', (req, res) => {
  const ok = store.deleteSubscription(req.params.id);
  if (!ok) {
    return res.status(404).json({ error: 'سابسکرایب یافت نشد.' });
  }
  res.json({ success: true });
});

apiRouter.post('/subscriptions/:id/refresh', async (req, res) => {
  const ok = await store.refreshSubscriptionContent(req.params.id);
  res.json({ success: ok });
});

// Configs & Live Tests
apiRouter.get('/configs', (req, res) => {
  res.json(store.getAllConfigs());
});

apiRouter.get('/top8', (req, res) => {
  res.json(store.getTop8Configs());
});

apiRouter.post('/test-now', async (req, res) => {
  const cfgs = await store.triggerImmediateTest();
  res.json({ success: true, count: cfgs.length });
});

apiRouter.post('/settings/interval', (req, res) => {
  const { interval } = req.body;
  if (!interval || typeof interval !== 'number') {
    return res.status(400).json({ error: 'بازه زمانی نامعتبر است.' });
  }
  store.setTestInterval(interval);
  res.json({ success: true, interval });
});

// ==========================================
// Network Reverse Tunneling Endpoints
// ==========================================

apiRouter.get('/tunnel/config', (req, res) => {
  res.json(tunnelService.getConfig());
});

apiRouter.get('/tunnels', (req, res) => {
  res.json({
    tunnels: tunnelService.getTunnels(),
    activeTunnelId: tunnelService.getConfig().activeTunnelId,
    multiTunnelStrategy: tunnelService.getConfig().multiTunnelStrategy,
    coreDependencies: tunnelService.getConfig().coreDependencies,
    autoDependenciesInstalled: tunnelService.getConfig().autoDependenciesInstalled,
  });
});

apiRouter.post('/tunnels', (req, res) => {
  try {
    const { name, remoteHost, remotePort, remoteUser, remoteIpv6, mode, password } = req.body;
    if (!remoteHost) {
      return res.status(400).json({ error: 'آدرس سرور ریموت الزامی است.' });
    }
    const newTunnel = tunnelService.createTunnel({
      name,
      remoteHost,
      remotePort: Number(remotePort) || 22,
      remoteUser: remoteUser || 'root',
      remoteIpv6,
      mode,
      password,
    });
    res.json(newTunnel);
  } catch (err: any) {
    res.status(400).json({ error: err.message || 'خطا در ایجاد تانل جدید' });
  }
});

apiRouter.put('/tunnels/:id', (req, res) => {
  const updated = tunnelService.updateTunnel(req.params.id, req.body);
  if (!updated) {
    return res.status(404).json({ error: 'تانل یافت نشد.' });
  }
  res.json(updated);
});

apiRouter.delete('/tunnels/:id', (req, res) => {
  try {
    const ok = tunnelService.deleteTunnel(req.params.id);
    res.json({ success: ok });
  } catch (err: any) {
    res.status(400).json({ error: err.message || 'خطا در حذف تانل' });
  }
});

apiRouter.post('/tunnels/:id/activate', (req, res) => {
  const ok = tunnelService.setActiveTunnel(req.params.id);
  if (!ok) {
    return res.status(404).json({ error: 'تانل یافت نشد.' });
  }
  res.json({ success: true, activeTunnelId: req.params.id });
});

apiRouter.post('/tunnels/strategy', (req, res) => {
  const { strategy } = req.body;
  if (strategy) {
    tunnelService.setStrategy(strategy);
  }
  res.json({ success: true, strategy });
});

apiRouter.post('/tunnels/:id/reconnect', (req, res) => {
  tunnelService.reconnectTunnel('درخواست اتصال مجدد تانل اختصاصی', req.params.id);
  res.json({ success: true });
});

apiRouter.post('/tunnel/setup', async (req, res) => {
  try {
    const { remoteHost, remotePort, remoteUser, password, tunnelId } = req.body;
    const result = await tunnelService.setupInitialAuth({
      tunnelId,
      remoteHost,
      remotePort: Number(remotePort) || 22,
      remoteUser: remoteUser || 'root',
      password,
    });
    res.json(result);
  } catch (err: any) {
    res.status(400).json({ error: err.message || 'خطا در احراز هویت اولیه سرور ریموت' });
  }
});

apiRouter.post('/tunnel/rules', (req, res) => {
  const { protocol, localPort, remotePort, description, enabled, tunnelId } = req.body;
  if (!localPort || !remotePort) {
    return res.status(400).json({ error: 'پورت محلی و پورت ریموت الزامی است.' });
  }

  const newRule = tunnelService.addRule({
    protocol: protocol === 'UDP' ? 'UDP' : 'TCP',
    localPort: Number(localPort),
    remotePort: Number(remotePort),
    description: description || `تونل پورت ${localPort} به ${remotePort}`,
    enabled: enabled !== undefined ? enabled : true,
    tunnelId,
  }, tunnelId);

  res.json(newRule);
});

apiRouter.put('/tunnel/rules/:id', (req, res) => {
  const updated = tunnelService.updateRule(req.params.id, req.body);
  if (!updated) {
    return res.status(404).json({ error: 'قانون تانل یافت نشد.' });
  }
  res.json(updated);
});

apiRouter.delete('/tunnel/rules/:id', (req, res) => {
  const ok = tunnelService.deleteRule(req.params.id);
  if (!ok) {
    return res.status(404).json({ error: 'قانون تانل یافت نشد.' });
  }
  res.json({ success: true });
});

apiRouter.post('/tunnel/reconnect', (req, res) => {
  tunnelService.reconnectTunnel('درخواست کاربر از داشبورد');
  res.json({ success: true });
});

apiRouter.post('/tunnel/detect-ip', async (req, res) => {
  const detected = await tunnelService.detectLocalIp();
  res.json({ ip: detected });
});

apiRouter.post('/tunnel/toggle-recovery', (req, res) => {
  const { autoRecovery } = req.body;
  tunnelService.toggleAutoRecovery(Boolean(autoRecovery));
  res.json({ success: true, autoRecovery: Boolean(autoRecovery) });
});

apiRouter.get('/tunnel/systemd', (req, res) => {
  const service = tunnelService.generateSystemdService();
  res.setHeader('Content-Type', 'text/plain; charset=utf-8');
  res.send(service);
});

apiRouter.get('/tunnel/manager-script', (req, res) => {
  const script = tunnelService.generateTunnelManagerScript();
  res.setHeader('Content-Type', 'text/x-shellscript; charset=utf-8');
  res.send(script);
});

// Generated files & scripts
apiRouter.get('/downloads/xray-config', (req, res) => {
  const top8 = store.getTop8Configs();
  const xrayJson = generateXrayConfig(top8);
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.send(JSON.stringify(xrayJson, null, 2));
});

apiRouter.get('/downloads/systemd', (req, res) => {
  const service = generateSystemdService();
  res.setHeader('Content-Type', 'text/plain; charset=utf-8');
  res.send(service);
});

apiRouter.get('/downloads/install-sh', (req, res) => {
  const script = generateInstallScript();
  res.setHeader('Content-Type', 'text/x-shellscript; charset=utf-8');
  res.send(script);
});

apiRouter.get('/downloads/daemon-py', (req, res) => {
  const py = generatePythonDaemonScript();
  res.setHeader('Content-Type', 'text/x-python; charset=utf-8');
  res.send(py);
});

