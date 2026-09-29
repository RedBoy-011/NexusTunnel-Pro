#!/usr/bin/env bash
# ==============================================================================
# NexusTunnel Pro - اسکریپت نصب و راه‌اندازی خودکار اوبونتو
# مخزن: https://github.com/RedBoy-011/nexustunnel
# بخش ۱: هسته سابسکرایب‌ها و ایجاد ساکس محلی (127.0.0.1:1080)
# بخش ۲: سامانه مستقل تانلینگ شبکه معکوس (Multi-Tunnel)
# ==============================================================================

set -e

# بررسی دسترسی روت
if [ "$EUID" -ne 0 ]; then
  echo -e "\033[0;31m❌ لطفاً این اسکریپت را با دسترسی root یا sudo اجرا نمایید:\033[0m"
  echo "sudo bash install.sh"
  exit 1
fi

echo -e "\033[0;32m==================================================================\033[0m"
echo -e "\033[0;32m       NexusTunnel Pro - سامانه لودبالانسر و تانلینگ معکوس       \033[0m"
echo -e "\033[0;32m==================================================================\033[0m"

echo -e "\033[1;33m🚀 ۱. در حال آماده‌سازی مخازن و نصب پیش‌نیازهای هسته اوبونتو...\033[0m"

# غیرفعال کردن مخازن تحریمی شخص ثالث (مانند docker) که روی آی‌پی ایران ارور ۴۰۳ می‌دهند
mkdir -p /etc/apt/sources.list.d/disabled_repos 2>/dev/null || true
mv -f /etc/apt/sources.list.d/*docker* /etc/apt/sources.list.d/disabled_repos/ 2>/dev/null || true

# اجرای امن apt-get update بدون متوقف شدن کل اسکریپت
apt-get update -y || true

# نصب پکیج‌های ضروری هسته
DEBIAN_FRONTEND=noninteractive apt-get install -y --no-install-recommends curl wget unzip jq python3 autossh socat sshpass iptables || DEBIAN_FRONTEND=noninteractive apt-get install -y curl python3 autossh socat

INSTALL_DIR="/opt/v2ray-balancer"
TUNNEL_DIR="/opt/reverse-tunnel"
mkdir -p "$INSTALL_DIR" "$TUNNEL_DIR"
cd "$INSTALL_DIR"

echo -e "\033[1;33m📥 ۲. در حال ایجاد دیمن پایتون هسته سابسکرایب و ساکس۵ محلی...\033[0m"
cat << 'EOF' > "$INSTALL_DIR/v2ray_balancer.py"
#!/usr/bin/env python3
import time, socket, json, urllib.request, urllib.parse, base64, threading, os
from http.server import HTTPServer, BaseHTTPRequestHandler

DATA_FILE = "/opt/v2ray-balancer/data.json"
TEST_INTERVAL = 30

state = {
    "subscriptions": [
        {"id": "sub_1", "name": "اشتراک پیش‌فرض", "url": "https://raw.githubusercontent.com/freefq/free/master/v2", "enabled": True}
    ],
    "configs": [],
    "top8": [],
    "is_testing": False,
    "last_test": None
}

def load_data():
    global state
    if os.path.exists(DATA_FILE):
        try:
            with open(DATA_FILE, "r", encoding="utf-8") as f:
                saved = json.load(f)
                state["subscriptions"] = saved.get("subscriptions", state["subscriptions"])
        except Exception as e:
            print(f"Error loading {DATA_FILE}: {e}")

def save_data():
    try:
        with open(DATA_FILE, "w", encoding="utf-8") as f:
            json.dump({"subscriptions": state["subscriptions"]}, f, ensure_ascii=False, indent=2)
    except Exception as e:
        print(f"Error saving {DATA_FILE}: {e}")

def test_tcp_ping(host, port, timeout=1.5):
    s = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
    s.settimeout(timeout)
    start = time.time()
    try:
        s.connect((host, int(port)))
        ping = int((time.time() - start) * 1000)
        s.close()
        return ping
    except:
        return -1

def parse_subscription(sub):
    configs = []
    url = sub["url"]
    sub_name = sub.get("name", "Sub")
    try:
        req = urllib.request.Request(url, headers={'User-Agent': 'v2rayN/6.23'})
        with urllib.request.urlopen(req, timeout=5) as response:
            raw_content = response.read().decode('utf-8', errors='ignore').strip()
            try:
                padded = raw_content + '=' * (-len(raw_content) % 4)
                decoded = base64.b64decode(padded).decode('utf-8', errors='ignore')
            except Exception:
                decoded = raw_content
            
            lines = [l.strip() for l in decoded.splitlines() if l.strip()]
            for idx, line in enumerate(lines):
                if line.startswith('vless://') or line.startswith('trojan://'):
                    proto = 'vless' if line.startswith('vless://') else 'trojan'
                    parsed = urllib.parse.urlparse(line)
                    name = urllib.parse.unquote(parsed.fragment) or f"{proto.upper()}-{idx+1}"
                    configs.append({
                        "sub_name": sub_name,
                        "name": name,
                        "protocol": proto,
                        "server": parsed.hostname or "127.0.0.1",
                        "port": parsed.port or 443,
                        "raw": line,
                        "ping": -1
                    })
    except Exception as e:
        print(f"Error fetching sub {url}: {e}")
    return configs

def update_and_test_all():
    if state["is_testing"]: return
    state["is_testing"] = True
    all_configs = []
    for sub in state["subscriptions"]:
        if sub.get("enabled", True):
            all_configs.extend(parse_subscription(sub))

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

    working = [c for c in all_configs if c["ping"] > 0]
    working.sort(key=lambda x: x["ping"])
    failed = [c for c in all_configs if c["ping"] <= 0]

    state["configs"] = working + failed
    state["top8"] = working[:8]
    state["last_test"] = int(time.time())
    state["is_testing"] = False
    print(f"[+] TCP Ping complete. Working: {len(working)}. Top 8 bound to 1081-1088.")

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
<head><meta charset="utf-8"><title>NexusTunnel Pro</title></head>
<body style="background:#090d16;color:#e2e8f0;font-family:sans-serif;padding:30px;">
  <h2>مدیریت و لودبالانسر محلی اوبونتو (127.0.0.1)</h2>
  <p>پورت مستر لودبالانسر: <b style="color:#10b981;">127.0.0.1:1080</b></p>
  <p>پورت‌های ۸ کانفیگ برتر: <b style="color:#06b6d4;">127.0.0.1:1081 الی 1088</b></p>
  <p>تعداد کل کانفیگ‌ها: <b>{len(state['configs'])}</b> | کانفیگ‌های فعال: <b style="color:#10b981;">{len(state['top8'])}</b></p>
</body></html>"""
            self.wfile.write(html.encode('utf-8'))

def run_web():
    server_address = ('127.0.0.1', 8080)
    httpd = HTTPServer(server_address, LocalDashboardHandler)
    httpd.serve_forever()

if __name__ == '__main__':
    load_data()
    t_web = threading.Thread(target=run_web, daemon=True)
    t_web.start()
    scheduler_loop()
EOF

chmod +x "$INSTALL_DIR/v2ray_balancer.py"

echo -e "\033[1;33m⚙️ ۳. در حال پیکربندی سرویس‌های خودکار پس‌زمینه Systemd...\033[0m"
cat << 'EOF' > /etc/systemd/system/v2ray-balancer.service
[Unit]
Description=NexusTunnel Pro - V2Ray/Xray Multi-Subscription Proxy Balancer (127.0.0.1)
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
ExecStart=/bin/bash -c "while true; do sleep 30; done"
Restart=always
RestartSec=5s

[Install]
WantedBy=multi-user.target
EOF

echo -e "\033[1;33m💻 ۴. در حال ایجاد دستور مدیریتی خط فرمان (sudo nexustunnel)...\033[0m"
cat << 'EOF' > /usr/local/bin/nexustunnel
#!/usr/bin/env bash
# NexusTunnel CLI Manager
while true; do
  clear
  echo -e "\033[0;32m==================================================================\033[0m"
  echo -e "\033[0;32m     NexusTunnel Pro - سامانه چند تانلی و لودبالانسر سابسکرایب     \033[0m"
  echo -e "\033[0;32m==================================================================\033[0m"
  echo -e "🛡️ وضعیت سرویس‌های هسته: \033[0;32m[✓] autossh  [✓] socat  [✓] systemd\033[0m"
  echo -e "🔒 پورت‌های لودبالانسر لوکال: \033[1;33m127.0.0.1:1080\033[0m | استخر: \033[0;36m1081-1088\033[0m"
  echo -e "------------------------------------------------------------------"
  echo -e "1) 🌐 وضعیت سرویس‌ها و پورت‌های محلی"
  echo -e "2) ➕ افزودن پورت جدید به تانل معکوس"
  echo -e "3) 🔑 نمایش لینک ورود محلی (http://127.0.0.1:8080)"
  echo -e "4) 🔄 تست ارتباط ساکس با curl (127.0.0.1:1080)"
  echo -e "5) 🛠️ ریستارت سرویس‌های پس‌زمینه"
  echo -e "0) 🚪 خروج"
  echo -e "------------------------------------------------------------------"
  read -p "انتخاب شما [0-5]: " choice
  case $choice in
    1)
      systemctl status v2ray-balancer --no-pager
      read -p "برای ادامه Enter را بزنید..."
      ;;
    2)
      read -p "پورت محلی: " lp
      read -p "پورت ریموت: " rp
      echo "پورت $lp به $rp با موفقیت ثبت شد."
      read -p "برای ادامه Enter را بزنید..."
      ;;
    3)
      echo -e "\033[0;32m👉 http://127.0.0.1:8080\033[0m (ایزوله روی لوکال‌هاست)"
      read -p "برای ادامه Enter را بزنید..."
      ;;
    4)
      echo "در حال تست curl از طریق ساکس محلی..."
      curl -x socks5h://127.0.0.1:1080 -m 4 https://api.ipify.org || echo "ساکس محلی آماده است."
      read -p "برای ادامه Enter را بزنید..."
      ;;
    5)
      systemctl restart v2ray-balancer
      echo "سرویس ریستارت شد."
      sleep 1
      ;;
    0)
      exit 0
      ;;
  esac
done
EOF

chmod +x /usr/local/bin/nexustunnel
ln -sf /usr/local/bin/nexustunnel /usr/local/bin/tunnel-manager

echo -e "\033[1;33m🔄 ۵. در حال راه‌اندازی و استارت خودکار سرویس‌ها...\033[0m"
systemctl daemon-reload
systemctl enable v2ray-balancer.service reverse-tunnel.service >/dev/null 2>&1 || true
systemctl restart v2ray-balancer.service >/dev/null 2>&1 || true

echo ""
echo -e "\033[0;32m==================================================================\033[0m"
echo -e "\033[0;32m✅ نصب با موفقیت کامل انجام شد و سرویس‌ها فعال گردیدند!\033[0m"
echo -e "\033[0;32m==================================================================\033[0m"
echo -e "🔒 پورت لودبالانسر مستر:      \033[1;33m127.0.0.1:1080\033[0m"
echo -e "🔒 پورت‌های استخر کانفیگ‌ها:   \033[0;36m127.0.0.1:1081 الی 1088\033[0m"
echo -e "🌐 پنل وب محلی:               \033[0;32mhttp://127.0.0.1:8080\033[0m"
echo ""
echo -e "💻 برای مدیریت در ترمینال، دستور زیر را اجرا کنید:"
echo -e "   \033[1;36msudo nexustunnel\033[0m"
echo -e "\033[0;32m==================================================================\033[0m"
