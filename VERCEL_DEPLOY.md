# RyzeBooth Deployment to Vercel - Quick Guide

## What's Fixed in This Update

✅ **Black screen issue for long-distance connections** - More STUN servers + timeout handling  
✅ **Auto-open camera in Duo modal** - Camera starts instantly  
✅ **5-minute link-based connections** - Alternative to 6-char codes  
✅ **Camera preview in modal** - See yourself before connecting  

---

## 1. Prepare Your GitHub Repository

### Option A: Update Existing Repo

If you already have RyzeBooth on GitHub:

```bash
# Clone your existing repo
git clone https://github.com/YOUR_USERNAME/YOUR-REPO.git
cd YOUR-REPO

# Replace the main files with new versions
# Copy: app.js, index.html
# (discord.js, strips.json, vercel.json stay the same)

# Commit and push
git add .
git commit -m "Improve: auto camera, link connections, better ICE servers"
git push origin main
```

### Option B: Create New Repo

```bash
# Create new folder
mkdir ryzebooth-improved
cd ryzebooth-improved

# Initialize git
git init
git branch -M main

# Add all files
# Place: app.js, index.html, discord.js, strips.json, vercel.json here

# Commit
git add .
git commit -m "Initial RyzeBooth with improvements"

# Add GitHub remote and push
git remote add origin https://github.com/YOUR_USERNAME/ryzebooth.git
git push -u origin main
```

---

## 2. Deploy to Vercel

### Method A: Via Vercel Dashboard (Easiest)

1. Go to **https://vercel.com**
2. Log in with GitHub account
3. Click **"Add New Project"**
4. Select your RyzeBooth repository
5. Click **"Import"**
6. Framework: Select **"Other"**
7. Click **"Deploy"**

**Wait 1-2 minutes for deployment to complete**

### Method B: Vercel CLI

```bash
# Install Vercel CLI (if not already installed)
npm install -g vercel

# In your RyzeBooth directory
vercel

# Follow the prompts:
# - Log in with GitHub
# - Select project (create new if needed)
# - Confirm settings
# - Deploy
```

### Method C: Connect GitHub for Auto-Deployment

1. In Vercel dashboard for your project
2. Go to **Settings → Git**
3. Enable **"Automatically deploy on every push to main"**
4. Now every git push auto-deploys!

---

## 3. Configure Discord Webhook (Optional)

If you want photos to auto-send to Discord:

### Step 3a: Create Discord Webhook

1. Open your Discord server
2. Go to **Server Settings → Integrations → Webhooks**
3. Click **"New Webhook"**
4. Name it `"smora"` (or any name)
5. Click **"Copy Webhook URL"**

### Step 3b: Add to Vercel

1. Go to your Vercel project dashboard
2. Click **"Settings"**
3. Go to **"Environment Variables"**
4. Add new variable:
   - **Name:** `DISCORD_WEBHOOK`
   - **Value:** (Paste the webhook URL from Step 3a)
5. Select scope: **"All"** (or just Production if you prefer)
6. Click **"Add"**
7. Click **"Redeploy"** on your latest deployment

---

## 4. Test Your Deployment

### Single Device Test

```
Visit: https://YOUR-PROJECT.vercel.app
1. Click "Duo Booth"
2. Camera preview should appear instantly ✅
3. You should see both connection options:
   - Code: Host/Join (6-character codes)
   - Link: Host/Join (5-minute links) ✅
4. Go to Step 2 with solo mode
5. Take a photo
6. Try saving to device ✅
7. Check Discord if webhook configured ✅
```

### Two-Device Test (Best Test!)

**Device A (Host):**
- Visit https://YOUR-PROJECT.vercel.app
- Click "Duo Booth"
- Choose either:
  - **Code:** Host → Get code
  - **Link:** Host → Get link (copy it)
- See camera preview in modal ✅

**Device B (Guest):**
- Visit same URL
- Click "Duo Booth"
- Choose same method (Code or Link):
  - **Code:** Join → Enter code from Device A
  - **Link:** Join → Paste link from Device A
- Both camera previews show ✅

**Connection established** → "Connected" message appears ✅

**Device A:** Click "Continue" → Go to Step 2
**Both:** Start camera → Both see video feeds side-by-side ✅

---

## 5. Troubleshooting Deployment

### App shows blank/old version

**Solution:**
```bash
# Hard refresh browser
Ctrl+Shift+Del (Windows) or Cmd+Shift+Delete (Mac)
# Clear cache, close tab, revisit
```

### Camera not working

1. Browser may need permission
   - Check address bar for camera icon
   - Click → Allow camera access
2. HTTPS required
   - Vercel provides this automatically
   - Never works on HTTP only

### Discord webhook not working

1. Verify webhook URL is correct
   - Should start with: `https://discord.com/api/webhooks/`
2. Check webhook still exists in Discord server
   - Webhooks can be deleted
3. Look for errors in:
   - Browser console (F12)
   - Vercel function logs (see below)

### View Vercel Function Logs

1. Vercel dashboard for your project
2. Click **"Functions"**
3. Click **"api/discord"**
4. See recent logs and errors

### Link connections not working

Check that:
1. Both devices have internet
2. Not behind restrictive firewall
3. Browser allows camera/mic permissions
4. URLs parameter includes `?duo=TOKEN`

---

## 6. Production Recommendations

### For Best Long-Distance Experience:

1. **Add TURN Server** (if budget allows):
   ```
   Add to CONFIG.duoIceServers in app.js
   ```
   - Solves black screen for ~2-5% of users
   - Options: Twilio, Metered.ca, or self-hosted Coturn

2. **Monitor Performance:**
   - Check Vercel Analytics
   - Watch for connection failure patterns
   - Monitor function cold starts

3. **Update Admin Password:**
   - In `app.js`, change `CONFIG.adminPass`
   - Default: `"ryze2026"`
   - Only you should know it

4. **Customize Branding:**
   - Change `CONFIG.name` from "RyzeBooth" to your name
   - Update GitHub link in HTML
   - Change admin password

---

## 7. Custom Domain (Optional)

### Add Your Own Domain

1. Vercel dashboard → Your project
2. Go to **"Settings"**
3. Click **"Domains"**
4. Enter your domain (e.g., `photos.example.com`)
5. Follow instructions to update DNS

**Your booth will then be:**
```
https://photos.example.com
```

---

## 8. Environment Variables Summary

### Required
- None! The app works out of the box

### Optional
- `DISCORD_WEBHOOK` - Discord photo relay (as explained in Step 3)

---

## Quick Command Reference

```bash
# Install dependencies (if needed)
npm install

# Local development (requires Node 16+)
npm run dev
# OR
vercel dev

# Deploy
vercel --prod

# View logs
vercel logs --follow

# Check deployment status
vercel --inspect
```

---

## Common Questions

**Q: Will it work from far away?**  
A: Yes! New STUN servers and timeout handling fix most long-distance issues.

**Q: Can I use a 6-char code and link together?**  
A: Yes! Users can choose their preferred connection method each time.

**Q: Does the link expire?**  
A: Yes, after 5 minutes of generation. But once connected, users stay connected even after expiry.

**Q: Can I change the expiry time?**  
A: Yes! In `app.js`, look for `S.duo.linkExpiry = Date.now() + (5 * 60 * 1000)` and adjust the `5` to your preferred minutes.

**Q: Is this secure?**  
A: Yes:
- Codes/links are one-time use per session
- Video never leaves users' devices
- Runs peer-to-peer via WebRTC
- No server sees video content
- Discord webhook only sends static PNG image

**Q: Can I self-host instead of Vercel?**  
A: Yes! Any Node.js hosting works. Update `CONFIG.discordEndpoint` if path differs.

---

## Need Help?

### Check These First:
1. Browser console for errors (F12 → Console)
2. Vercel function logs (see Step 5)
3. Make sure HTTPS (not HTTP)
4. Try different browser
5. Try different network (mobile hotspot)

### For PeerJS Issues:
- Official docs: https://peerjs.com/docs
- Check if PeerJS CDN is loading (F12 → Network)

### For Vercel Issues:
- Status: https://www.vercelstatus.com
- Docs: https://vercel.com/docs
- Support: https://vercel.com/support

---

**You're all set! 🎉**

Visit **https://YOUR-PROJECT.vercel.app** and start taking photos!
