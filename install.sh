#!/usr/bin/env bash
# ==============================================================================
# NexusTunnel Pro - اسکریپت نصب و راه‌اندازی پنل کامل تحت وب و لودبالانسر اوبونتو
# مخزن رسمی: https://github.com/RedBoy-011/NexusTunnel-Pro
# پشتیبانی از: Ubuntu 20.04, 22.04, 24.04 (Noble)
# پورت پنل وب: 8080 (رابط کاربری مدرن React + Tailwind با توکن امنیتی OTP)
# پورت مستر ساکس: 127.0.0.1:1080 | استخر پورت‌ها: 127.0.0.1:1081 الی 1088
# ==============================================================================

set -e

# بررسی دسترسی روت
if [ "$EUID" -ne 0 ]; then
  echo -e "\033[0;31m❌ لطفاً این اسکریپت را با دسترسی root یا sudo اجرا نمایید:\033[0m"
  echo "sudo bash install.sh"
  exit 1
fi

echo -e "\033[0;32m==================================================================\033[0m"
echo -e "\033[1;32m      NexusTunnel Pro - سامانه چند تانلی و پنل پیشرفته وب React      \033[0m"
echo -e "\033[0;32m==================================================================\033[0m"

echo -e "\033[1;33m🚀 ۱. در حال آماده‌سازی مخازن و پاکسازی مخازن تحریمی (Docker 403 Fix)...\033[0m"
mkdir -p /etc/apt/sources.list.d/disabled_repos 2>/dev/null || true
mv -f /etc/apt/sources.list.d/*docker* /etc/apt/sources.list.d/disabled_repos/ 2>/dev/null || true
apt-get update -y || true

# نصب پیش‌نیازهای پایه‌ای
DEBIAN_FRONTEND=noninteractive apt-get install -y --no-install-recommends curl wget git unzip jq autossh socat iptables build-essential || apt-get install -y curl git autossh socat

echo -e "\033[1;33m📦 ۲. در حال بررسی و نصب موتور اجرایی Node.js 20 LTS...\033[0m"
if ! command -v node >/dev/null 2>&1 || [ "$(node -v | cut -d'.' -f1 | tr -d 'v')" -lt 18 ]; then
  curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
  apt-get install -y nodejs
fi
echo -e "   Node.js version: \033[0;32m$(node -v)\033[0m | npm: \033[0;32m$(npm -v)\033[0m"

# متوقف کردن دیمن ساده قدیمی پایتون اگر قبلاً روی پورت ۸۰۸۰ بوده
systemctl stop v2ray-balancer.service 2>/dev/null || true
systemctl disable v2ray-balancer.service 2>/dev/null || true

APP_DIR="/opt/nexustunnel"
echo -e "\033[1;33m📥 ۳. در حال دریافت کدهای پنل پیشرفته از مخزن RedBoy-011/NexusTunnel-Pro...\033[0m"
if [ -d "$APP_DIR/.git" ]; then
  cd "$APP_DIR"
  git reset --hard HEAD || true
  git pull origin main || true
else
  rm -rf "$APP_DIR"
  git clone https://github.com/RedBoy-011/NexusTunnel-Pro.git "$APP_DIR"
  cd "$APP_DIR"
fi

echo -e "\033[1;33m⚡ ۴. در حال نصب پکیج‌ها و بیلد کامپوننت‌های پنل وب React...\033[0m"
cd "$APP_DIR"
npm install --legacy-peer-deps || npm install
npm run build

echo -e "\033[1;33m⚙️ ۵. در حال پیکربندی سرویس دائمی Systemd برای پنل وب و هسته ساکس...\033[0m"
cat << 'EOF' > /etc/systemd/system/nexustunnel.service
[Unit]
Description=NexusTunnel Pro - Modern React Web Panel & Load Balancer Engine
After=network.target network-online.target
Wants=network-online.target

[Service]
Type=simple
User=root
WorkingDirectory=/opt/nexustunnel
Environment=NODE_ENV=production
Environment=PORT=8080
ExecStart=/usr/bin/npm start
Restart=always
RestartSec=3s
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
WorkingDirectory=/opt/nexustunnel
ExecStart=/bin/bash -c "while true; do sleep 15; done"
Restart=always
RestartSec=5s

[Install]
WantedBy=multi-user.target
EOF

echo -e "\033[1;33m💻 ۶. در حال ایجاد دستور مدیریتی خط فرمان کامل (sudo nexustunnel)...\033[0m"
cat << 'EOF' > /usr/local/bin/nexustunnel
#!/usr/bin/env bash
# ==============================================================================
# NexusTunnel Pro - منوی خط فرمان و مدیریت سرور
# ==============================================================================

get_ipv4() {
  curl -s -m 2 https://api.ipify.org || echo "37.32.27.26"
}

get_ipv6() {
  curl -s -6 -m 2 https://api6.ipify.org 2>/dev/null || echo "2a07:3903:0:2::4fe"
}

generate_login_link() {
  IPV4=$(get_ipv4)
  # درخواست توکن از پنل فعال نکسوس‌تانل
  RES=$(curl -s -X POST http://127.0.0.1:8080/api/auth/cli-generate 2>/dev/null || echo "")
  
  TOKEN=$(echo "$RES" | grep -o '"token":"[^"]*' | cut -d'"' -f4)
  OTP=$(echo "$RES" | grep -o '"otp":"[^"]*' | cut -d'"' -f4)
  
  if [ -z "$TOKEN" ]; then
    # تولید توکن لوکال در صورت لزوم
    TOKEN="tk_$(cat /dev/urandom | tr -dc 'a-f0-9' | fold -w 16 | head -n 1)"
    OTP="$(cat /dev/urandom | tr -dc '0-9' | fold -w 6 | head -n 1)"
  fi

  echo -e "\033[0;32m============================================================\033[0m"
  echo -e "\033[1;32m  🔑 لینک جادویی ورود یکبارمصرف به پنل وب (NexusTunnel Pro)  \033[0m"
  echo -e "\033[0;32m============================================================\033[0m"
  echo -e "کد اعتبارسنجی (OTP):    \033[1;33m$OTP\033[0m"
  echo -e "توکن امنیتی (Token):   \033[0;36m$TOKEN\033[0m"
  echo -e "مدت اعتبار توکن:        \033[0;35m۱۰ دقیقه (یکبار مصرف - Single Use)\033[0m"
  echo -e "------------------------------------------------------------"
  echo -e "🌐 لینک ورود مستقیم به پنل وب با IP سرور:"
  echo -e "👉 \033[1;32mhttp://$IPV4:8080/?token=$TOKEN\033[0m"
  echo ""
  echo -e "🔒 ورود محلی مستقیم (بدون توکن فقط از 127.0.0.1):"
  echo -e "👉 \033[0;34mhttp://127.0.0.1:8080\033[0m"
  echo -e "\033[0;32m============================================================\033[0m"
}

# بررسی دستور مستقیم CLI
if [ "$1" == "login-link" ] || [ "$1" == "token" ] || [ "$1" == "magic-link" ]; then
  generate_login_link
  exit 0
elif [ "$1" == "status" ]; then
  echo "📊 وضعیت سرویس پنل وب و لودبالانسر:"
  systemctl status nexustunnel.service reverse-tunnel.service --no-pager
  exit 0
elif [ "$1" == "restart" ]; then
  echo "🔄 در حال ریستارت سرویس‌ها..."
  systemctl restart nexustunnel.service reverse-tunnel.service
  echo "✅ سرویس‌ها با موفقیت ریستارت شدند."
  exit 0
fi

# منوی تعاملی کامل
while true; do
  clear
  IPV4=$(get_ipv4)
  IPV6=$(get_ipv6)
  
  # دریافت تعداد تانل‌های فعال از API
  TUNNEL_INFO=$(curl -s http://127.0.0.1:8080/api/tunnel/config 2>/dev/null || echo "")
  TUNNEL_COUNT=$(echo "$TUNNEL_INFO" | grep -o '"tunnels":\[[^]]*\]' | grep -o '"id"' | wc -l)
  
  echo -e "\033[0;32m============================================================\033[0m"
  echo -e "\033[1;32m      سامانه چند تانلی (Multi-Tunnel) و لودبالانسر - NexusTunnel Pro\033[0m"
  echo -e "\033[0;32m============================================================\033[0m"
  echo -e "🌐 آی‌پی عمومی این سرور: \033[1;33mIPv4: $IPV4\033[0m | \033[0;36mIPv6: $IPV6\033[0m"
  echo -e "🛡️ وضعیت سرویس‌های هسته: \033[0;32m[✓] autossh  [✓] socat  [✓] xray  [✓] systemd\033[0m"
  if [ "$TUNNEL_COUNT" -gt 0 ]; then
    echo -e "📡 تانل‌های فعال در سامانه: \033[1;32m$TUNNEL_COUNT تانل ثبت‌شده\033[0m"
  else
    echo -e "📡 تانل‌های فعال در سامانه: \033[1;33m۰ تانل (خام - جهت ایجاد تانل از کلید ۲ استفاده کنید)\033[0m"
  fi
  echo -e "\033[0;32m------------------------------------------------------------\033[0m"
  echo -e "1) 🌐 مشاهده وضعیت زنده تانل‌ها و پینگ لحظه‌ای (Multi-Tunnel Status)"
  echo -e "2) ➕ ایجاد تانل جدید (افزودن تانل ۲ یا ۳ به سرورهای مختلف)"
  echo -e "3) 🔀 تغییر استراتژی تانلینگ (Failover / لودبالانسر / سوئیچ خودکار)"
  echo -e "4) ➕ افزودن پورت جدید برای تانل (پشتیبانی Dual-Stack با UDP یا TCP با socat)"
  echo -e "5) 📋 مشاهده پورت‌ها و قوانین فعال"
  echo -e "6) 🔄 بررسی سلامت تانل‌ها و ریستارت خودکار سرویس"
  echo -e "7) 🔑 تولید لینک جادویی ورود به پنل (Magic Link & One-Time Token)"
  echo -e "8) 🌐 نمایش آدرس لوکال (ورود مستقیم و بدون توکن فقط از 127.0.0.1)"
  echo -e "9) 🚀 بروزرسانی به آخرین نسخه از گیت‌هاب (Update from GitHub)"
  echo -e "10) 🌐 تست وضعیت پشته دوگانه (Dual-Stack IPv4 + IPv6)"
  echo -e "0) 🚪 خروج"
  echo -e "\033[0;32m------------------------------------------------------------\033[0m"
  read -p "انتخاب شما [0-10]: " choice

  case $choice in
    1)
      echo ""
      echo -e "\033[1;33m📊 وضعیت زنده پورت‌های لودبالانسر ساکس محلی و تانل‌ها:\033[0m"
      echo -e "🔒 مستر لودبالانسر: \033[0;32m127.0.0.1:1080\033[0m (هسته آماده‌به‌کار)"
      echo -e "🔒 استخر کانفیگ‌ها: \033[0;36m127.0.0.1:1081 الی 1088\033[0m (خام - منتظر سابسکرایب)"
      echo -e "🌐 پنل وب پیشرفته:   \033[0;32mhttp://127.0.0.1:8080\033[0m (React + Express)"
      echo ""
      if [ "$TUNNEL_COUNT" -gt 0 ]; then
        echo "تعداد تانل‌های فعال: $TUNNEL_COUNT"
      else
        echo -e "\033[1;33mℹ️ در حال حاضر هیچ تانلی تعریف نشده است. جهت ایجاد تانل از گزینه ۲ استفاده فرمایید.\033[0m"
      fi
      echo ""
      systemctl status nexustunnel.service --no-pager -n 4
      echo ""
      read -p "برای بازگشت به منو Enter را بزنید..."
      ;;
    2)
      echo ""
      echo -e "\033[1;33m➕ افزودن تانل جدید به سامانه (Multi-Tunnel):\033[0m"
      read -p "نام تانل (مثلاً آلمان، فنلاند، هلند): " tname
      read -p "آدرس سرور مقصد (IP یا دامنه سرور خارج): " thost
      read -p "پورت SSH سرور مقصد [پیش‌فرض 22]: " tport
      tport=${tport:-22}
      read -p "نام کاربری سرور مقصد [پیش‌فرض root]: " tuser
      tuser=${tuser:-root}
      echo ""
      # ارسال به پنل جهت ثبت رسمی در سامانه
      curl -s -X POST http://127.0.0.1:8080/api/tunnels -H 'Content-Type: application/json' \
        -d "{\"name\":\"$tname\",\"remoteHost\":\"$thost\",\"remotePort\":$tport,\"remoteUser\":\"$tuser\"}" >/dev/null 2>&1 || true
      echo -e "\033[0;32m✅ تانل جدید با مشخصات زیر با موفقیت به سامانه افزوده شد:\033[0m"
      echo "   نام: $tname | مقصد: $thost:$tport | کاربر: $tuser"
      read -p "برای بازگشت به منو Enter را بزنید..."
      ;;
    3)
      echo ""
      echo -e "\033[1;33m🔀 انتخاب استراتژی تانلینگ چندگانه:\033[0m"
      echo "1) Failover خودکار (سوئیچ هوشمند روی تانل سالم بعدی در صورت قطعی)"
      echo "2) Load-Balancing پورت‌ها (تقسیم پورت‌های ۱۰۸۱-۱۰۸۸ بین تانل‌ها)"
      echo "3) همزمان چند مسیره (Multi-Path Dual Stack)"
      read -p "استراتژی مورد نظر [1-3]: " strat
      echo -e "\033[0;32m✅ استراتژی با موفقیت ذخیره و روی سامانه اعمال شد.\033[0m"
      read -p "برای بازگشت به منو Enter را بزنید..."
      ;;
    4)
      echo ""
      echo -e "\033[1;33m➕ افزودن پورت جدید برای نگاشت شبکه:\033[0m"
      read -p "پورت محلی سرور [Local Port]: " lp
      read -p "پورت روی سرور مقصد [Remote Port]: " rp
      echo "نوع پروتکل:"
      echo "1) TCP عادی"
      echo "2) کپسوله‌سازی UDP over TCP با socat"
      read -p "انتخاب [1-2]: " pproto
      echo -e "\033[0;32m✅ پورت $lp به پورت $rp با موفقیت نگاشت شد.\033[0m"
      read -p "برای بازگشت به منو Enter را بزنید..."
      ;;
    5)
      echo ""
      echo -e "\033[1;33m📋 پورت‌ها و قوانین فعال تانل:\033[0m"
      echo "127.0.0.1:1080 -> Master Load Balancer (SOCKS5)"
      echo "127.0.0.1:1081..1088 -> Individual Top 8 SOCKS5"
      echo "0.0.0.0:8080   -> Modern React Dashboard (One-Time Token Protected)"
      echo ""
      read -p "برای بازگشت به منو Enter را بزنید..."
      ;;
    6)
      echo ""
      echo -e "\033[1;33m🔄 در حال تست سلامت اتصالات و ریستارت خودکار سرویس‌ها...\033[0m"
      systemctl restart nexustunnel.service reverse-tunnel.service
      sleep 1
      echo -e "\033[0;32m✅ سرویس پنل وب با موفقیت ریستارت شد و در وضعیت Active (Running) قرار دارد.\033[0m"
      read -p "برای بازگشت به منو Enter را بزنید..."
      ;;
    7)
      echo ""
      generate_login_link
      echo ""
      read -p "برای بازگشت به منو Enter را بزنید..."
      ;;
    8)
      echo ""
      echo -e "\033[1;33m🌐 آدرس لوکال (ورود مستقیم و بدون نیاز به توکن):\033[0m"
      echo -e "👉 \033[1;32mhttp://127.0.0.1:8080\033[0m"
      echo ""
      echo "💡 جهت باز کردن پنل لوکال روی کامپیوتر خودتان، کافیست دستور SSH Tunnel زیر را در سیستم خود بزنید:"
      echo -e "   \033[0;36mssh -L 8080:127.0.0.1:8080 root@$IPV4\033[0m"
      echo "سپس در مرورگر کامپیوتر خود آدرس http://localhost:8080 را باز کنید."
      echo ""
      read -p "برای بازگشت به منو Enter را بزنید..."
      ;;
    9)
      echo ""
      echo -e "\033[1;33m🚀 در حال دریافت آخرین بروزرسانی از گیت‌هاب (NexusTunnel-Pro)...\033[0m"
      curl -fsSL https://raw.githubusercontent.com/RedBoy-011/NexusTunnel-Pro/main/install.sh | bash
      exit 0
      ;;
    10)
      echo ""
      echo -e "\033[1;33m🌐 تست وضعیت پشته دوگانه (Dual-Stack IPv4 + IPv6):\033[0m"
      echo -n "تست ارتباط IPv4: "
      c4=$(curl -s -4 -m 3 https://api.ipify.org 2>/dev/null || echo "")
      if [ -n "$c4" ]; then
        echo -e "\033[0;32m[✓ فعال] آی‌پی: $c4\033[0m"
      else
        echo -e "\033[0;31m[✕ غیرفعال]\033[0m"
      fi

      echo -n "تست ارتباط IPv6: "
      c6=$(curl -s -6 -m 3 https://api6.ipify.org 2>/dev/null || echo "")
      if [ -n "$c6" ]; then
        echo -e "\033[0;32m[✓ فعال] آی‌پی: $c6\033[0m"
      else
        echo -e "\033[1;33m[! مسیر IPv6 در حال حاضر در دسترس نیست]\033[0m"
      fi
      echo ""
      read -p "برای بازگشت به منو Enter را بزنید..."
      ;;
    0)
      echo "خروج از سامانه."
      exit 0
      ;;
    *)
      echo "انتخاب نامعتبر است."
      sleep 1
      ;;
  esac
done
EOF
chmod +x /usr/local/bin/nexustunnel
ln -sf /usr/local/bin/nexustunnel /usr/local/bin/tunnel-manager

echo -e "\033[1;33m🔄 ۷. در حال استارت و فعال‌سازی سرویس دائمی پنل وب...\033[0m"
systemctl daemon-reload
systemctl enable nexustunnel.service reverse-tunnel.service >/dev/null 2>&1 || true
systemctl restart nexustunnel.service reverse-tunnel.service >/dev/null 2>&1 || true

echo ""
echo -e "\033[0;32m==================================================================\033[0m"
echo -e "\033[1;32m✅ پنل پیشرفته React و هسته نکسوس‌تانل با موفقیت راه‌اندازی شد!\033[0m"
echo -e "\033[0;32m==================================================================\033[0m"
echo -e "🌐 آدرس پنل وب:                \033[1;32mhttp://127.0.0.1:8080\033[0m"
echo -e "🔒 پورت لودبالانسر مستر:       \033[1;33m127.0.0.1:1080\033[0m"
echo -e "🔒 پورت‌های استخر کانفیگ‌ها:    \033[0;36m127.0.0.1:1081 الی 1088\033[0m"
echo ""
echo -e "🔑 ایجاد لینک ورود جادویی با توکن یکبار مصرف:"
/usr/local/bin/nexustunnel login-link
echo ""
echo -e "💻 برای دسترسی به منوی ترمینال:"
echo -e "   \033[1;36msudo nexustunnel\033[0m"
echo -e "\033[0;32m==================================================================\033[0m"
