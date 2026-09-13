# BPS Fresh Mills 🌾

> **Freshly Milled. Naturally Good.**  
> Authentic stone-ground flours, multigrains, and health staples delivered fresh to your doorstep.

---

## 🌟 Overview

**BPS Fresh Mills** is a modern, full-stack e-commerce platform dedicated to providing 100% natural, freshly milled stone-ground flours (chakki atta). Built with performance, security, and exceptional user experience in mind.

---

## ✨ Features

### 🛒 Customer Experience
- **Fresh Flour Catalog:** Wide range of flours including Sharbati Atta, Diabetic Care Multigrain, MP Whole Wheat, and specialty flours.
- **Interactive Cart & Checkout:** Seamless, responsive cart drawer and checkout flow.
- **Real-Time Order Tracking:** Visual live timeline for every order (`/tracking?id=<ORDER_ID>`).
- **Pincode & Distance Serviceability:** Real-time distance and delivery charge calculator.
- **Automated Notifications:** Instant order confirmation alerts via WhatsApp and Email.
- **Theme Customization:** Full light/dark mode support with persistent user preferences.

### 🛡️ Management & Portals
- **Super Administrator Dashboard:** Comprehensive management of products, inventory, orders, customer inquiries, and store settings.
- **Delivery Agent Portal:** Dedicated portal for field agents to view deliveries, mark status updates, and track cash settlements.
- **Role-Based Access Control:** Secure JWT authentication with strict route protection.

---

## 🛠️ Technology Stack

- **Frontend:** React 18, Vite, React Router 6, Lucide Icons, Vanilla CSS Design System
- **Backend:** Node.js, Express.js, JWT, bcryptjs, Nodemailer, WhatsApp Cloud API
- **Database:** Fast localized document storage engine with automatic migration & seeding
- **Deployment:** Render (Full-stack single service), Vercel (Frontend alternative)

---

## 🚀 Quick Start (Local Development)

### 1. Clone the repository
```bash
git clone https://github.com/ImRohan35/bps-chakki.git
cd bps-chakki
```

### 2. Install Dependencies
```bash
# Install root, backend, and frontend dependencies
npm run install:all
```

### 3. Setup Environment Variables
Create a `.env` file in the `backend/` directory based on `backend/.env.example`:
```env
PORT=5000
NODE_ENV=development
JWT_SECRET=your_secret_jwt_key
ADMIN_EMAIL=bpsfreshmill@gmail.com
ADMIN_INITIAL_PASSWORD=bps@2005
```

### 4. Run Locally
```bash
# Start backend server
cd backend && npm run dev

# In another terminal, start frontend
cd frontend && npm run dev
```

The app will be accessible at:
- **Frontend:** `http://localhost:5173`
- **Backend API:** `http://localhost:5000/api`

---

## 🌐 Production Deployment

The project is pre-configured with `render.yaml` for 1-click deployment on [Render](https://render.com):

1. Connect this repository to Render as a **Web Service**.
2. Set Build Command: `npm run build`
3. Set Start Command: `npm start`
4. Configure required Environment Variables (`JWT_SECRET`, `ADMIN_EMAIL`, `ADMIN_INITIAL_PASSWORD`).

---

## 🔒 Privacy & Security

- Secrets, credentials, and customer personal information are never tracked or exposed in the repository.
- Sensitive databases and audit logs are excluded via `.gitignore`.
- Administrator accounts are initialized dynamically via secure server environment variables.

---

## 📄 License

All rights reserved © BPS Fresh Mills.
