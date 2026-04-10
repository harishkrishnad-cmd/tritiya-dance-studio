#!/bin/bash
# ─────────────────────────────────────────────────────────────────
#  Tritiya Dance Studio — One-time EC2 Setup Script
#  Run this ONCE after launching a fresh Ubuntu 22.04 EC2 instance
#  Usage:  bash setup-ec2.sh
# ─────────────────────────────────────────────────────────────────
set -e

echo ""
echo "🪷  Tritiya Dance Studio — EC2 Setup"
echo "────────────────────────────────────"

# 1. System update
echo "==> Updating system packages..."
sudo apt-get update -y && sudo apt-get upgrade -y

# 2. Install Node.js 20
echo "==> Installing Node.js 20..."
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs

# 3. Install PM2 globally
echo "==> Installing PM2..."
sudo npm install -g pm2

# 4. Install Nginx
echo "==> Installing Nginx..."
sudo apt-get install -y nginx

# 5. Install git (usually pre-installed)
sudo apt-get install -y git

# 6. Create persistent data directory (DB lives here, never deleted)
echo "==> Creating persistent data directory..."
mkdir -p /home/ubuntu/data
chmod 755 /home/ubuntu/data

# 7. Clone the repo
echo "==> Cloning repository..."
cd /home/ubuntu
git clone https://github.com/harishkrishnad-cmd/tritiya-dance-studio.git
cd tritiya-dance-studio

# 8. Install dependencies & build
echo "==> Installing dependencies..."
npm install --production
cd client && npm install --include=dev && npm run build && cd ..

# 9. Start app with PM2
echo "==> Starting app with PM2..."
mkdir -p /home/ubuntu/data
pm2 start ecosystem.config.js --env production
pm2 save
pm2 startup systemd -u ubuntu --hp /home/ubuntu | tail -1 | sudo bash

# 10. Configure Nginx reverse proxy
echo "==> Configuring Nginx..."
sudo tee /etc/nginx/sites-available/tritiya > /dev/null <<'NGINX'
server {
    listen 80;
    server_name _;

    # Increase body size limit for image uploads (base64 can be large)
    client_max_body_size 20M;

    location / {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_cache_bypass $http_upgrade;
        proxy_read_timeout 60s;
    }
}
NGINX

sudo ln -sf /etc/nginx/sites-available/tritiya /etc/nginx/sites-enabled/
sudo rm -f /etc/nginx/sites-enabled/default
sudo nginx -t && sudo systemctl reload nginx
sudo systemctl enable nginx

echo ""
echo "✅  Setup complete!"
echo ""
echo "   App is live at: http://$(curl -s ifconfig.me)"
echo "   PM2 status:     pm2 status"
echo "   App logs:       pm2 logs tritiya"
echo "   Nginx logs:     sudo tail -f /var/log/nginx/error.log"
echo ""
echo "📌  Next steps:"
echo "   1. Point your domain to this IP (or use the IP directly)"
echo "   2. Add GitHub Secrets for auto-deploy (see below)"
echo "   3. Optionally set up HTTPS with: sudo certbot --nginx"
echo ""
echo "   GitHub Secrets to add (github.com → repo → Settings → Secrets):"
echo "   EC2_HOST  = $(curl -s ifconfig.me)"
echo "   EC2_USER  = ubuntu"
echo "   EC2_SSH_KEY = (paste your .pem private key content)"
echo ""
