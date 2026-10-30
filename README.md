# Piravi QR Check-In App ⚡

Mobile-first web application built with **Next.js (App Router)**, **Tailwind CSS**, and **Supabase** for college event QR check-ins. Designed specifically for multi-admin on-phone usage without logins.

---

## 🚀 Quick Start

### 1. Configure Environment Variables
Copy `.env.local.example` to `.env.local`:
```bash
cp .env.local.example .env.local
```
Fill in your Supabase project credentials in `.env.local`:
```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project-id.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here
```

### 2. Install Dependencies
```bash
npm install
```

### 3. Run Development Server
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) on your device or network browser (e.g. `http://<your-local-ip>:3000` on your phone).

### 4. Build for Production
```bash
npm run build
npm run start
```

---

## 🚢 Deploying to Vercel (Step-by-Step)

1. Push this folder to a GitHub repository:
   ```bash
   git init
   git add .
   git commit -m "Initial commit of Piravi QR Check-In"
   git branch -M main
   git remote add origin https://github.com/<your-username>/<your-repo-name>.git
   git push -u origin main
   ```
2. Go to [vercel.com](https://vercel.com) and click **"Add New Project"**.
3. Import your GitHub repository.
4. In the **Environment Variables** section, add:
   - `NEXT_PUBLIC_SUPABASE_URL`: Your Supabase URL
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`: Your Supabase Anon Key
5. Click **Deploy**. Vercel will build and deploy the app with HTTPS (required for camera access on mobile devices).
6. Share the generated Vercel URL with all volunteers. They can open it in Safari or Chrome and tap **"Add to Home Screen"** for full-screen PWA mode!

---

## 📱 Features

- **Direct Access (Zero Login)**: Opens straight to the camera scanner. Designed for simultaneous usage across multiple volunteer phones.
- **Volunteer Name Persistence**: Saves volunteer name in `localStorage` and sends it as `p_admin` on every scan.
- **Checkpoint Selector**: Remembers the chosen checkpoint in `localStorage` across reloads.
- **Live Rear Camera QR Scanner**: Fast, responsive scanning using `@yudiel/react-qr-scanner`.
- **Full-Screen Result Overlay (2s auto-dismiss or tap to dismiss)**:
  - 🟢 **Valid (Green)**: Valid check-in with participant ID.
  - 🔴 **Already Scanned (Red)**: Warning with timestamp and the name of who scanned first.
  - 🟠 **Invalid (Orange)**: Invalid QR warning.
- **Audio & Haptic Feedback**: Distinct Web Audio API dual-tone chimes/buzzers and vibration patterns (`navigator.vibrate`) for success, duplicate, and invalid scans.
- **2-Second Cooldown**: Prevents double-scanning or rapid duplicate triggers.
- **Manual ID Fallback**: Allows volunteers to manually type participant IDs (e.g., `vishnu8778`).
- **Supabase Realtime Sync**: Checkpoint counts and scan logs sync instantly across all devices without page refresh.
- **Live Dashboard (`/dashboard`)**:
  - Live per-checkpoint scan counts and progress bars.
  - Recent scans feed (last 50 scans) with participant ID, checkpoint name, time, and scanned by.
  - Participant ID lookup showing every checkpoint that specific person has checked into.
  - One-click CSV export of all scan records.

