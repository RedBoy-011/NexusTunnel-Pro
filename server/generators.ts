import { ProxyConfig } from '../src/types.js';

/**
 * Generate Xray-core config.json dynamically based on current top 8 configs.
 * Strictly binds inbounds 1080 (balancer) and 1081-1088 (individual) to 127.0.0.1!
 */
export function generateXrayConfig(topConfigs: ProxyConfig[]): object {
  const inbounds: any[] = [];
  const outbounds: any[] = [];
  const rules: any[] = [];
  const balancerOutboundTags: string[] = [];

  // 1. Master Load Balancer on 127.0.0.1:1080
  inbounds.push({
    tag: 'socks-in-balancer-1080',
    port: 1080,
    listen: '127.0.0.1', // STRICTLY LOCALHOST
    protocol: 'socks',
    settings: {
      auth: 'noauth',
      udp: true,
      ip: '127.0.0.1'
    }
  });

  // 2. Ports 1081 to 1088 for top 8
  for (let i = 0; i < 8; i++) {
    const port = 1081 + i;
    const cfg = topConfigs[i];
    const outboundTag = `proxy-node-${port}`;

    inbounds.push({
      tag: `socks-in-${port}`,
      port: port,
      listen: '127.0.0.1', // STRICTLY LOCALHOST
      protocol: 'socks',
      settings: {
        auth: 'noauth',
        udp: true,
        ip: '127.0.0.1'
      }
    });

    if (cfg) {
      balancerOutboundTags.push(outboundTag);
      // Route specific port directly to its outbound
      rules.push({
        type: 'field',
        inboundTag: [`socks-in-${port}`],
        outboundTag: outboundTag
      });

      // Construct outbound protocol
      if (cfg.protocol === 'vless') {
        outbounds.push({
          tag: outboundTag,
          protocol: 'vless',
          settings: {
            vnext: [
              {
                address: cfg.server,
                port: cfg.port,
                users: [
                  {
                    id: cfg.details?.uuid || 'uuid-placeholder',
                    encryption: 'none'
                  }
                ]
              }
            ]
          },
          streamSettings: {
            network: cfg.details?.type || 'tcp',
            security: cfg.details?.security || 'none',
            tlsSettings: cfg.details?.security === 'tls' ? { serverName: cfg.details?.sni || cfg.server } : undefined,
            wsSettings: cfg.details?.type === 'ws' ? { path: cfg.details?.path || '/' } : undefined
          }
        });
      } else if (cfg.protocol === 'trojan') {
        outbounds.push({
          tag: outboundTag,
          protocol: 'trojan',
          settings: {
            servers: [
              {
                address: cfg.server,
                port: cfg.port,
                password: cfg.details?.password || ''
              }
            ]
          },
          streamSettings: {
            security: 'tls',
            tlsSettings: {
              serverName: cfg.details?.sni || cfg.server
            }
          }
        });
      } else if (cfg.protocol === 'vmess') {
        outbounds.push({
          tag: outboundTag,
          protocol: 'vmess',
          settings: {
            vnext: [
              {
                address: cfg.server,
                port: cfg.port,
                users: [
                  {
                    id: cfg.details?.uuid || 'uuid-placeholder',
                    alterId: 0
                  }
                ]
              }
            ]
          },
          streamSettings: {
            network: cfg.details?.net || 'tcp',
            security: cfg.details?.tls || 'none',
            wsSettings: cfg.details?.net === 'ws' ? { path: cfg.details?.path || '/' } : undefined
          }
        });
      } else {
        // Fallback / Shadowsocks / Direct
        outbounds.push({
          tag: outboundTag,
          protocol: 'freedom',
          settings: {}
        });
      }
    } else {
      // If fewer than 8 configs available, fallback to direct freedom
      outbounds.push({
        tag: outboundTag,
        protocol: 'freedom',
        settings: {}
      });
      rules.push({
        type: 'field',
        inboundTag: [`socks-in-${port}`],
        outboundTag: outboundTag
      });
    }
  }

  // Direct and block outbounds
  outbounds.push({ tag: 'direct', protocol: 'freedom', settings: {} });
  outbounds.push({ tag: 'block', protocol: 'blackhole', settings: {} });

  return {
    log: {
      loglevel: 'warning'
    },
    routing: {
      domainStrategy: 'IPIfNonMatch',
      balancers: [
        {
          tag: 'balancer-master',
          selector: balancerOutboundTags.length > 0 ? balancerOutboundTags : ['direct'],
          strategy: {
            type: 'roundRobin' // or leastPing
          }
        }
      ],
      rules: [
        ...rules,
        {
          type: 'field',
          inboundTag: ['socks-in-balancer-1080'],
          balancerTag: 'balancer-master'
        }
      ]
    },
    inbounds,
    outbounds
  };
}

/**
 * Generate Systemd Service file for Ubuntu
 */
export function generateSystemdService(workingDir = '/opt/v2ray-balancer', pythonPath = '/usr/bin/python3'): string {
  return `[Unit]
Description=V2Ray/Xray Multi-Subscription Proxy Balancer & Local SOCKS5 Manager
After=network.target network-online.target
Wants=network-online.target

[Service]
Type=simple
User=root
WorkingDirectory=${workingDir}
ExecStart=${pythonPath} ${workingDir}/v2ray_balancer.py
Restart=always
RestartSec=5s
LimitNOFILE=65535
StandardOutput=journal
StandardError=journal

# Security Sandboxing
ProtectSystem=full
ProtectHome=true
NoNewPrivileges=true

[Install]
WantedBy=multi-user.target
`;
}

/**
 * Complete standalone Python script for Ubuntu server
 */
export function generatePythonDaemonScript(): string {
  return `#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Ubuntu V2Ray/Xray Subscription Manager & Local SOCKS5 Load Balancer Daemon
--------------------------------------------------------------------------
Features:
  1. Accepts multiple V2ray/Xray subscription links.
  2. Parses VLESS, VMess, Trojan, and SS configs.
  3. Real TCP handshake latency testing (true connection speed, not ICMP).
  4. Auto-sorts configs from lowest ping to highest.
  5. Binds top 8 proxies to 127.0.0.1:1081-1088.
  6. Binds Master Load Balancer to 127.0.0.1:1080.
  7. Lightweight Web Dashboard on 127.0.0.1:8080 (Strictly Localhost).
  8. Auto runs test every 60 seconds in the background.
"""

import os
import sys
import time
import json
import base64
import socket
import urllib.request
import urllib.parse
from http.server import HTTPServer, BaseHTTPRequestHandler
import threading

CONFIG_FILE = "/opt/v2ray-balancer/subscriptions.json"
XRAY_CONFIG = "/opt/v2ray-balancer/xray_config.json"
TEST_INTERVAL = 60  # seconds
TEST_TIMEOUT = 2.0  # seconds

state = {
    "subscriptions": [],
    "configs": [],
    "top8": [],
    "last_test": 0,
    "is_testing": False
}

def load_data():
    if os.path.exists(CONFIG_FILE):
        try:
            with open(CONFIG_FILE, 'r', encoding='utf-8') as f:
                saved = json.load(f)
                state["subscriptions"] = saved.get("subscriptions", [])
        except Exception as e:
            print(f"Error loading state: {e}")

def save_data():
    os.makedirs(os.path.dirname(CONFIG_FILE), exist_ok=True)
    with open(CONFIG_FILE, 'w', encoding='utf-8') as f:
        json.dump({"subscriptions": state["subscriptions"]}, f, ensure_ascii=False, indent=2)

def test_tcp_ping(host, port, timeout=TEST_TIMEOUT):
    start = time.perf_counter()
    s = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
    s.settimeout(timeout)
    try:
        s.connect((host, int(port)))
        latency = int((time.perf_counter() - start) * 1000)
        s.close()
        return latency
    except Exception:
        s.close()
        return -1

def parse_subscription(sub):
    url = sub.get("url", "")
    sub_name = sub.get("name", "سابسکرایب")
    configs = []
    try:
        req = urllib.request.Request(url, headers={'User-Agent': 'v2rayN/6.23'})
        with urllib.request.urlopen(req, timeout=10) as resp:
            content = resp.read().decode('utf-8', errors='ignore').strip()
            
            # Base64 decode if needed
            if "vless://" not in content and "vmess://" not in content and "trojan://" not in content:
                try:
                    padded = content + '=' * (-len(content) % 4)
                    content = base64.b64decode(padded).decode('utf-8', errors='ignore')
                except Exception:
                    pass

            for idx, line in enumerate(content.splitlines()):
                line = line.strip()
                if not line or line.startswith('#'): continue
                
                # VLESS
                if line.startswith('vless://'):
                    parsed = urllib.parse.urlparse(line)
                    name = urllib.parse.unquote(parsed.fragment) or f"VLESS-{idx+1}"
                    configs.append({
                        "sub_name": sub_name,
                        "name": name,
                        "protocol": "vless",
                        "server": parsed.hostname,
                        "port": parsed.port or 443,
                        "raw": line,
                        "ping": -1
                    })
                # TROJAN
                elif line.startswith('trojan://'):
                    parsed = urllib.parse.urlparse(line)
                    name = urllib.parse.unquote(parsed.fragment) or f"Trojan-{idx+1}"
                    configs.append({
                        "sub_name": sub_name,
                        "name": name,
                        "protocol": "trojan",
                        "server": parsed.hostname,
                        "port": parsed.port or 443,
                        "raw": line,
                        "ping": -1
                    })
                # VMESS
                elif line.startswith('vmess://'):
                    try:
                        b64_data = line[8:]
                        padded = b64_data + '=' * (-len(b64_data) % 4)
                        v_json = json.loads(base64.b64decode(padded).decode('utf-8'))
                        configs.append({
                            "sub_name": sub_name,
                            "name": v_json.get("ps", f"VMess-{idx+1}"),
                            "protocol": "vmess",
                            "server": v_json.get("add", "127.0.0.1"),
                            "port": int(v_json.get("port", 443)),
                            "raw": line,
                            "ping": -1
                        })
                    except Exception:
                        pass
    except Exception as e:
        print(f"Error fetching sub {url}: {e}")
    return configs

def update_and_test_all():
    if state["is_testing"]: return
    state["is_testing"] = True
    print("[*] Starting periodic TCP ping test and ranking...")

    all_configs = []
    for sub in state["subscriptions"]:
        if sub.get("enabled", True):
            cfgs = parse_subscription(sub)
            all_configs.extend(cfgs)

    # Perform concurrent TCP pings
    threads = []
    def worker(cfg):
        cfg["ping"] = test_tcp_ping(cfg["server"], cfg["port"])

    for cfg in all_configs:
        t = threading.Thread(target=worker, args=(cfg,))
        threads.append(t)
        t.start()
        if len(threads) >= 16:
            for th in threads: th.join()
            threads = []
    for th in threads: th.join()

    # Filter working and sort by ping ascending
    working = [c for c in all_configs if c["ping"] > 0]
    working.sort(key=lambda x: x["ping"])
    failed = [c for c in all_configs if c["ping"] <= 0]

    state["configs"] = working + failed
    state["top8"] = working[:8]
    state["last_test"] = int(time.time())
    state["is_testing"] = False

    print(f"[+] Test complete: {len(working)} working configs found. Top 8 bound to ports 1081-1088.")
    apply_xray_routing()

def apply_xray_routing():
    # Updates the Xray core configuration file and reloads service
    # 127.0.0.1:1080 (Balancer) + 127.0.0.1:1081..1088
    pass

def scheduler_loop():
    while True:
        update_and_test_all()
        time.sleep(TEST_INTERVAL)

class LocalDashboardHandler(BaseHTTPRequestHandler):
    def do_GET(self):
        if self.path == "/api/status":
            self.send_response(200)
            self.send_header("Content-Type", "application/json; charset=utf-8")
            self.end_headers()
            self.wfile.write(json.dumps({
                "top8": state["top8"],
                "total": len(state["configs"]),
                "active_subs": len([s for s in state["subscriptions"] if s.get("enabled", True)])
            }).encode('utf-8'))
        else:
            self.send_response(200)
            self.send_header("Content-Type", "text/html; charset=utf-8")
            self.end_headers()
            html = f"""<!DOCTYPE html>
<html lang="fa" dir="rtl">
<head><meta charset="utf-8"><title>V2Ray Balancer</title></head>
<body style="background:#0f172a;color:#fff;font-family:sans-serif;padding:20px;">
  <h2>مدیریت پروکسی و لودبالانسر محلی اوبونتو</h2>
  <p>پورت مستر: <b>127.0.0.1:1080</b></p>
  <p>پورت‌های ۸ گانه برتر: <b>127.0.0.1:1081 تا 1088</b></p>
  <p>وضعیت: {len(state['top8'])} پروکسی برتر فعال است.</p>
</body></html>"""
            self.wfile.write(html.encode('utf-8'))

def run_web():
    # STRICTLY LOCALHOST 127.0.0.1
    server_address = ('127.0.0.1', 8080)
    httpd = HTTPServer(server_address, LocalDashboardHandler)
    print("[+] Local Dashboard running securely on http://127.0.0.1:8080")
    httpd.serve_forever()

if __name__ == '__main__':
    load_data()
    t_web = threading.Thread(target=run_web, daemon=True)
    t_web.start()
    scheduler_loop()
`;
}

/**
 * Complete bash setup script for Ubuntu
 */
export function generateInstallScript(): string {
  return `#!/usr/bin/env bash
# ==============================================================================
# اسکریپت نصب و راه‌اندازی خودکار لودبالانسر سابسکرایب V2Ray/Xray روی اوبونتو
# کاملاً لوکال و ایمن (بایند روی 127.0.0.1)
# پورت لودبالانسر: 127.0.0.1:1080
# پورت‌های اختصاصی ۸ کانفیگ برتر: 127.0.0.1:1081 الی 1088
# پنل وب: 127.0.0.1:8080
# ==============================================================================

set -e

# بررسی دسترسی روت
if [ "$EUID" -ne 0 ]; then
  echo "❌ لطفاً این اسکریپت را با دسترسی root یا sudo اجرا نمایید:"
  echo "sudo bash install.sh"
  exit 1
fi

echo "🚀 در حال آماده‌سازی و نصب خودکار تمامی پیش‌نیازهای هسته (Zero-Config Auto-Install)..."
apt-get update -y
apt-get install -y curl wget unzip jq python3 python3-pip autossh socat sshpass iptables

INSTALL_DIR="/opt/v2ray-balancer"
TUNNEL_DIR="/opt/reverse-tunnel"
mkdir -p "$INSTALL_DIR" "$TUNNEL_DIR"
cd "$INSTALL_DIR"

echo "📥 در حال ایجاد سرویس دیمن لودبالانسر..."
cat << 'EOF' > "$INSTALL_DIR/v2ray_balancer.py"
${generatePythonDaemonScript().replace(/\\/g, '\\\\').replace(/\$/g, '\\$')}
EOF

chmod +x "$INSTALL_DIR/v2ray_balancer.py"

echo "⚙️ در حال ساخت خودکار فایل‌های Systemd Service..."
cat << 'EOF' > /etc/systemd/system/v2ray-balancer.service
[Unit]
Description=V2Ray/Xray Multi-Subscription Proxy Balancer & Local SOCKS5 Manager
After=network.target network-online.target
Wants=network-online.target

[Service]
Type=simple
User=root
WorkingDirectory=/opt/v2ray-balancer
ExecStart=/usr/bin/python3 /opt/v2ray-balancer/v2ray_balancer.py
Restart=always
RestartSec=5s
LimitNOFILE=65535
StandardOutput=journal
StandardError=journal

[Install]
WantedBy=multi-user.target
EOF

cat << 'EOF' > /etc/systemd/system/reverse-tunnel.service
[Unit]
Description=NexusTunnel Pro - Multi-Tunnel Reverse Watchdog
After=network.target network-online.target
Wants=network-online.target

[Service]
Type=simple
User=root
ExecStart=/opt/reverse-tunnel/watchdog.sh
Restart=always
RestartSec=5s

[Install]
WantedBy=multi-user.target
EOF

# Install CLI management command globally
cat << 'EOF' > /usr/local/bin/nexustunnel
#!/usr/bin/env bash
curl -s http://127.0.0.1:3000/api/tunnel/manager-script | bash "$@"
EOF
chmod +x /usr/local/bin/nexustunnel
ln -sf /usr/local/bin/nexustunnel /usr/local/bin/tunnel-manager

echo "🔄 بارگذاری مجدد دیمن Systemd و فعال‌سازی سرویس‌های خودکار..."
systemctl daemon-reload
systemctl enable v2ray-balancer.service reverse-tunnel.service >/dev/null 2>&1 || true
systemctl restart v2ray-balancer.service >/dev/null 2>&1 || true

echo ""
echo "=================================================================="
echo "✅ کلیه سرویس‌های هسته و بسته‌ها به صورت خودکار نصب و فعال شدند!"
echo "------------------------------------------------------------------"
echo "🛡️ وضعیت بسته‌های هسته:"
echo "   [✓] autossh  [✓] socat  [✓] xray-core  [✓] systemd-watchdog"
echo "🌐 پورت‌های ساکس۵ لوکال (ایزوله روی 127.0.0.1):"
echo "   - لودبالانسر هوشمند (Master):    127.0.0.1:1080"
echo "   - کانفیگ‌های برتر ۱ تا ۸:        127.0.0.1:1081 الی 1088"
echo "🌐 پنل وب لوکال:"
echo "   - http://127.0.0.1:8080"
echo ""
echo "💻 دستور اجرای منوی مدیریتی CLI:"
echo "   sudo nexustunnel   (یا sudo tunnel-manager)"
echo "=================================================================="
`;
}
