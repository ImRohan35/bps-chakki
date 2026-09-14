# BPS Fresh Mills — Production Deployment Checklist & Operations Guide
Tagline: *“Freshly Milled. Naturally Good.”*  
Target Domain: `https://bpsfreshmills.in`  
Admin URL: `https://bpsfreshmills.in/admin`  
Delivery Boy URL: `https://bpsfreshmills.in/delivery`

---

## 1. Production Architecture Overview

```
                        [ Internet / DNS: bpsfreshmills.in ]
                                         │
                                         ▼
                      [ Nginx Reverse Proxy + Let's Encrypt SSL ]
                      Port 80 (HTTP -> 443 Redirect) | Port 443 (HTTPS)
                                         │
                   ┌─────────────────────┴─────────────────────┐
                   ▼                                           ▼
      [ Static Frontend SPA ]                       [ Node.js API Server ]
      `frontend/dist/index.html`                    Port 5000 (PM2 Daemon)
      Served by Nginx / Express                     `backend/server.js`
                                                               │
                                                               ▼
                                                  [ BPS Real JSON/DB Engine ]
                                                  `backend/data/*.json`
                                                  Auto-Backups in `backend/backups/`
```

---

## 2. Environment Variables Required (.env)

Ensure your production `.env` is created on your production server at `/var/www/bps-chakki/backend/.env`:

```ini
# Server Environment & Port
NODE_ENV=production
PORT=5000

# Security & Secrets (Generate strong secret: openssl rand -base64 48)
JWT_SECRET=your_super_strong_production_jwt_secret_key_here
ADMIN_EMAIL=bpsfreshmills@gmail.com
ADMIN_INITIAL_PASSWORD=replace_with_strong_password

# Production URLs & Routing
FRONTEND_URL=https://bpsfreshmills.in
CORS_ORIGIN=https://bpsfreshmills.in,https://www.bpsfreshmills.in

# Payment Model
PAYMENT_METHOD=Cash on Delivery (COD ONLY)

# Delivery Radius (Varanasi Mill Coordinates)
SHOP_LAT=25.4678
SHOP_LON=83.0564
MAX_DELIVERY_RADIUS_KM=15

# AI Business Assistant (Optional Gemini API key for natural language reasoning)
# The built-in deterministic engine provides 100% zero-hallucination answers even if blank.
GEMINI_API_KEY=

# Storage Provider ('local' | 's3' | 'cloudinary')
STORAGE_PROVIDER=local
AWS_S3_BUCKET=
AWS_REGION=ap-south-1
AWS_ACCESS_KEY_ID=
AWS_SECRET_ACCESS_KEY=
CLOUDINARY_URL=

# Database & Automated Backups
DATA_DIR=./data
BACKUP_DIR=./backups

# Email Notifications (Gmail SMTP)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=bpsfreshmills@gmail.com
SMTP_PASS=your_gmail_app_specific_password
EMAIL_FROM="BPS Fresh Mills" <bpsfreshmills@gmail.com>

# WhatsApp Cloud API (Meta for Developers)
WHATSAPP_PHONE_NUMBER_ID=
WHATSAPP_ACCESS_TOKEN=
WHATSAPP_BUSINESS_ACCOUNT_ID=
WHATSAPP_API_VERSION=v21.0
```

---

## 3. Remaining Deployment Steps (To Go Live on https://bpsfreshmills.in)

> [!WARNING]
> The application code and production bundle are 100% ready. However, the site is **NOT LIVE YET** until you complete the following physical server setup, domain DNS routing, and SSL certificate provisioning:

### Step 1: Point Your Domain DNS to Your Server IP
In your domain registrar (GoDaddy, Namecheap, Hostinger, Cloudflare):
- Add an **A Record**: Host `@` $\rightarrow$ Target: `<YOUR_SERVER_PUBLIC_IP>`
- Add a **CNAME Record**: Host `www` $\rightarrow$ Target: `bpsfreshmills.in`

### Step 2: Install Node.js & PM2 on Production Server (Ubuntu / Debian VPS)
```bash
# 1. Update packages
sudo apt update && sudo apt upgrade -y

# 2. Install Node.js 20 LTS & PM2
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs nginx certbot python3-certbot-nginx
sudo npm install -g pm2
```

### Step 3: Clone Code & Build Frontend
```bash
# 1. Clone repository to /var/www/bps-chakki
sudo mkdir -p /var/www/bps-chakki
sudo chown -R $USER:$USER /var/www/bps-chakki
git clone <YOUR_GIT_REPO_URL> /var/www/bps-chakki

# 2. Build Frontend
cd /var/www/bps-chakki/frontend
npm install
npm run build

# 3. Setup Backend
cd /var/www/bps-chakki/backend
npm install --production
cp .env.example .env
nano .env # Paste your production secrets
```

### Step 4: Configure Nginx Reverse Proxy (`/etc/nginx/sites-available/bpsfreshmills.in`)
```nginx
server {
    server_name bpsfreshmills.in www.bpsfreshmills.in;

    # Frontend Single Page App
    location / {
        root /var/www/bps-chakki/frontend/dist;
        try_files $uri $uri/ /index.html;
    }

    # Uploads Static Assets
    location /uploads/ {
        alias /var/www/bps-chakki/backend/uploads/;
        expires 7d;
        add_header Cache-Control "public, no-transform";
    }

    # Backend API Proxy
    location /api/ {
        proxy_pass http://127.0.0.1:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
```
Enable the site:
```bash
sudo ln -s /etc/nginx/sites-available/bpsfreshmills.in /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

### Step 5: Provision Free Let's Encrypt SSL Certificate
```bash
sudo certbot --nginx -d bpsfreshmills.in -d www.bpsfreshmills.in
```

### Step 6: Start Backend Daemon with PM2
```bash
cd /var/www/bps-chakki/backend
pm2 start server.js --name "bps-backend"
pm2 save
pm2 startup
```

---

## 4. Verification & Testing

Once running, verify each portal:
1. Customer Home: `https://bpsfreshmills.in`
2. Admin Dashboard: `https://bpsfreshmills.in/admin`
3. Delivery Portal: `https://bpsfreshmills.in/delivery`
4. Health Check: `https://bpsfreshmills.in/api/health`
5. AI Assistant: In Admin Panel, click **AI Assistant** tab and ask: *“Aaj kitni sale hui?”*
