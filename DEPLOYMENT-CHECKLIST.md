# Pre-Deployment Checklist

Before deploying your PWA to production, verify these items:

## ✅ Required Steps

- [x] PWA dependencies installed (`vite-plugin-pwa`, `workbox-window`)
- [x] Vite config updated with PWA plugin
- [x] HTML meta tags added for iOS and Windows
- [x] Manifest configuration in vite.config.ts
- [x] Service worker setup
- [x] Build scripts added to package.json

## 📋 Optional But Recommended

- [ ] Replace placeholder PNG icons with actual images
  - See `ICON-GENERATION.md` for instructions
  - Use online converter: https://svgtopng.com
  - Generate: 192x192, 512x512, 180x180
  
- [ ] Test PWA locally
  ```bash
  npm run pwa:build
  npm run pwa:preview
  ```

- [ ] Test installation on different devices
  - [ ] Desktop Chrome/Edge
  - [ ] iPhone/iPad Safari
  - [ ] Android Chrome
  - [ ] Windows PC

- [ ] Verify offline functionality
  - Install app
  - Disconnect internet
  - Test all calculators

## 🚀 Deployment

When ready to deploy:

```bash
npm run deploy
```

This will:
1. Build production version
2. Generate PWA assets
3. Deploy to GitHub Pages

## 🧪 Post-Deployment Testing

After deployment, visit: https://mscottsewell.github.io/FREEDomCalculator/

Test on each platform:
1. Look for install prompt/icon
2. Install the app
3. Verify it appears on home screen/start menu
4. Test offline mode
5. Check all calculators function properly

## 📱 Share Installation Instructions

Send users to:
- Live site: https://mscottsewell.github.io/FREEDomCalculator/
- Installation guide: `INSTALLATION.md` in the repository

## 🐛 Troubleshooting

If install option doesn't appear:
- Ensure HTTPS is enabled (GitHub Pages does this automatically)
- Clear browser cache
- Check browser console for errors
- Verify manifest.webmanifest is accessible

If offline doesn't work:
- Visit site online first (to cache assets)
- Check service worker is registered (DevTools → Application → Service Workers)
- Verify cache storage (DevTools → Application → Cache Storage)

## 📊 Success Metrics

Your PWA is working if:
- ✅ Install prompt appears in supported browsers
- ✅ App installs to home screen/desktop
- ✅ App runs in standalone mode (no browser UI)
- ✅ Works offline after first online visit
- ✅ Auto-updates when you deploy changes
- ✅ Icons display correctly on all platforms

---

**Current Status**: ✅ PWA Setup Complete - Ready to Deploy!

Just run `npm run deploy` when ready!
