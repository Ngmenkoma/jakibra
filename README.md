# Jakibra Essentials — PWA Setup Guide

## Files in this package

```
jakibra-pwa/
├── index.html          ← Your site (PWA tags already added)
├── manifest.json       ← PWA manifest (install + branding)
├── service-worker.js   ← Offline support + push notifications
├── icons/              ← Add your app icons here (see below)
└── README.md           ← This file
```

---

## Step 1 — Add your icons

You need PNG icons in the `/icons/` folder. Generate them free at:
👉 **https://realfavicongenerator.net**

Upload your Jakibra logo and download the package. You need these sizes:
- icon-72.png, icon-96.png, icon-128.png, icon-144.png
- icon-152.png, icon-192.png, icon-384.png, icon-512.png

---

## Step 2 — Deploy to HTTPS

PWAs **require HTTPS**. Recommended free options:

| Platform | How |
|---|---|
| **Vercel** | `vercel deploy` or drag & drop |
| **Netlify** | Drop your folder at netlify.com/drop |
| **GitHub Pages** | Push to a repo, enable Pages |

---

## Step 3 — Test your PWA

1. Open Chrome DevTools → **Application** tab
2. Check: ✅ Service Workers, ✅ Manifest, ✅ Icons
3. Run **Lighthouse** audit → PWA score should be 90+

---

## PWA Features included

| Feature | Status |
|---|---|
| Install to Home Screen | ✅ Custom install banner |
| Offline Support | ✅ Cache-first for pages & images |
| Push Notifications | ✅ With action buttons |
| iOS Support | ✅ Apple meta tags included |
| App Shortcuts | ✅ Menu, WhatsApp, Location |
| Offline Fallback Page | ✅ Shows WhatsApp link when offline |

---

## Sending Push Notifications (optional)

To send push notifications to installed users, you need a push server.
Use **web-push** (Node.js library) or a service like **Firebase Cloud Messaging (FCM)**.

Simple Node.js example:
```bash
npm install web-push
```

```js
const webpush = require('web-push');
webpush.sendNotification(subscription, JSON.stringify({
  title: '🍽️ Today\'s Special!',
  body: 'Grilled Tilapia Combo — GH₵ 60. Order now!',
  url: '/index.html#products'
}));
```

---

## Update the cache version

When you update your site, bump the cache version in `service-worker.js`:
```js
const CACHE_VERSION = 'v2'; // change this
```
This forces all users to get the latest version.
