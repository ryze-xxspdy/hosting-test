# RyzeBooth Improvements & Fixes

This document details all the improvements made to fix issues and enhance the Duo Booth experience for long-distance connections.

## Issues Fixed

### 1. **Black Screen for Long-Distance Connections**

**Problem:** When users are far apart, WebRTC connections sometimes fail to establish, leaving a black screen.

**Solutions Implemented:**

- **Added more STUN servers** to help devices find each other across restrictive networks
  - Now includes 6 STUN servers instead of 3
  - Covers Google, Cloudflare with multiple endpoints

- **Increased ICE server configuration** with additional servers for better NAT traversal

- **Configurable connection timeout** (15 seconds)
  - Shows user-friendly error message if connection takes too long
  - Gives users time to retry instead of hanging indefinitely

**For Production (Vercel Deployment):**
Add a TURN relay server for the most restrictive networks (some corporate/school firewalls):

```javascript
// In CONFIG.duoIceServers, add:
{
  urls: "turn:your-turn-server.com:3478",
  username: "username",
  credential: "password"
}
```

Popular free/cheap TURN server options:
- Twilio (STUN + TURN)
- Coturn (self-hosted)
- Metered (paid)

### 2. **Auto-Open Camera When Modal Opens**

**Problem:** Users had to manually tap "Start camera" after opening the Duo modal, creating extra friction.

**Solution:**

- Camera automatically starts when the Duo Booth modal opens
- Uses a separate preview stream so it doesn't interfere with the main camera
- Stops cleanly when the modal closes
- Functions added:
  - `startDuoPreviewCam()` - Initiates preview camera
  - `stopDuoPreviewCam()` - Cleans up preview camera

**User Experience:**
1. Tap "Duo Booth" → Camera instantly shows in modal
2. Choose connection method with camera preview visible
3. Connect and continue to Step 2

### 3. **Link-Based Connection with 5-Minute Expiry**

**Problem:** 6-character codes work but are difficult to share via video call or messaging in some cases.

**Solution:**

Added a second connection option: **Shareable Links**

**How it works:**

- **Host generates a link** that's valid for 5 minutes
- **Link includes a unique token** that can be shared via:
  - QR code (when printed or screenshotted)
  - Chat/messaging apps
  - Email
  - Voice chat (read token aloud)

- **Expiry countdown** shows remaining time
- **Auto-cleanup** - Link becomes invalid after 5 minutes or when already used

**Technical Details:**
- Token format: 12-character alphanumeric string
- Expiry: `Date.now() + (5 * 60 * 1000)` milliseconds
- Token stored in `S.duo.linkToken`
- Can be used immediately or shared for later use (within 5 min window)

**URL Format:**
```
https://your-booth-url.vercel.app/?duo=TOKEN123ABC
```

When someone visits this URL, they're automatically taken to the join screen with the token pre-filled.

### 4. **Camera Preview in Duo Modal**

**Problem:** Users couldn't verify their camera was working before selecting a connection method.

**Solution:**

- **Live camera preview** appears in the Duo Booth modal
- Shows user's own camera feed (self-facing or environment, matches their selection)
- Helps users confirm:
  - Camera is working
  - Lighting is acceptable
  - Background looks good
  - Mirror/flip settings are correct

**Implementation:**
- Video element ID: `duoModalCam`
- Separate stream from the main camera (no interference)
- Auto-plays when modal opens
- Stops when modal closes
- Shows user their actual camera will look to the partner

---

## File Changes Summary

### `app.js`

**New State Variables:**
- `S.duoConnectionMode` - Tracks "code" or "link" mode
- `S.duo.linkToken` - Stores the shareable link token
- `S.duo.linkExpiry` - Timestamp when link expires
- `S.duo.cameraReady` - Flag for remote camera status

**New Functions:**
- `startDuoPreviewCam()` - Auto-start camera preview in modal
- `stopDuoPreviewCam()` - Clean up preview camera
- `genLinkToken()` - Generate time-limited link tokens
- `duoLinkHost()` - Create 5-minute expiring host session
- `duoLinkJoin(token)` - Join with a link/token
- `updateLinkExpiry()` - Update countdown timer UI

**Enhanced Functions:**
- `openDuoModal()` - Now starts camera preview and checks URL params
- `showDuoView()` - Added support for "linkhost" and "linkjoin" views
- `duoHost()` / `duoJoin()` - Added connection timeout handling
- Improved ICE server configuration

**New CONFIG Options:**
```javascript
CONFIG.connectionTimeout = 15000  // milliseconds
```

### `index.html`

**Duo Modal Changes:**
- Added camera preview video element (`#duoModalCam`)
- Added link-based connection buttons
- Added "Link: Host" view with countdown timer
- Added "Link: Join" view for pasting tokens
- Better organization of connection methods
- Improved labels and hints

**New HTML Elements:**
- `#duoModalCam` - Video for camera preview
- `#duoLinkHostBtn` - Generate link button
- `#duoLinkJoinBtn` - Join with link button
- `#duoLinkHostView` - Host link UI
- `#duoLinkJoinView` - Join link UI
- `#duoLinkInput` - Input field for token
- `#duoLinkCopyBtn` - Copy link button
- `#duoLinkExpiry` - Timer display
- `#duoLinkConnectBtn` - Connect button

### `discord.js`

**No changes needed** - Backend relay works as-is

---

## Deployment to Vercel

### Prerequisites:
1. Node.js project with the updated files
2. Vercel account
3. (Optional) Discord webhook for photo relay

### Steps:

1. **Update your files:**
   - Replace `app.js` with the new version
   - Replace `index.html` with the new version
   - Keep `discord.js`, `vercel.json`, `strips.json` unchanged

2. **Push to GitHub:**
   ```bash
   git add .
   git commit -m "Improve Duo Booth: auto camera, link connections, better ICE servers"
   git push origin main
   ```

3. **Deploy:**
   - Go to Vercel dashboard
   - Click "Deployments" → "Redeploy" on your RyzeBooth project
   - OR: Let Vercel auto-deploy on push to main branch

4. **(Optional) Add TURN Server:**
   - Vercel Settings → Environment Variables
   - Add any additional ICE/TURN server configuration if needed
   - Redeploy

### Testing Long-Distance Connections:

1. **Test from two different locations:**
   - One person on mobile (4G/5G)
   - One person on desktop (different ISP)
   - One person on VPN (to simulate restrictive network)

2. **Monitor connection:**
   - Check browser console for errors (F12)
   - Watch for the 15-second timeout
   - Confirm both camera feeds appear

3. **Test Link Expiry:**
   - Host generates a link
   - Wait > 5 minutes
   - Try to join → should fail with "link expired" message

---

## Browser Compatibility

- **Modern Chrome/Edge:** ✅ Full support
- **Safari (iOS 15+):** ✅ Full support
  - Camera preview might need permissions
  - Link sharing works well via Share button
- **Firefox:** ✅ Full support
- **Opera:** ✅ Full support
- **Internet Explorer:** ❌ Not supported

**HTTPS Required:** All WebRTC features require HTTPS (Vercel provides this automatically)

---

## Known Limitations & Workarounds

### 1. **Restrictive Corporate/School Networks**
- **Issue:** Some firewalls block peer-to-peer video entirely
- **Solution:** Deploy a TURN relay server (see Production section above)
- **Workaround:** Users can tether to mobile hotspot instead

### 2. **Asymmetrical NAT**
- **Issue:** Some carrier networks use double-NAT that blocks video
- **Solution:** Same as above - requires TURN server
- **Symptom:** Data channel works but video never shows

### 3. **Mobile Battery Drain**
- **Issue:** Video streams and WebRTC use significant battery
- **Workaround:** Users should plug in their device during use

### 4. **Link Token Readability**
- **Issue:** 12-character tokens are hard to read aloud
- **Workaround:** Use QR code generation (add library if desired)
- **Enhancement:** Could display both token AND QR code

---

## Future Enhancements (Optional)

1. **QR Code Generation**
   - Display QR code alongside link token
   - Scan to auto-join

2. **Persistent Connections**
   - Allow links to persist beyond 5 minutes
   - Require passcode verification instead

3. **Connection Analytics**
   - Track success rate of connections
   - Log connection quality metrics
   - Help identify problematic networks

4. **Fallback WebRTC Configuration**
   - Detect connection failures
   - Auto-escalate to TURN-only mode
   - Retry with more aggressive settings

5. **Video Quality Settings**
   - Allow users to reduce quality on slow networks
   - Display bandwidth usage indicator

---

## Support & Troubleshooting

### Connection keeps timing out:
1. Verify both devices have internet
2. Check if behind VPN/corporate firewall
3. Try wireless instead of cellular
4. Try different network (mobile hotspot)

### Can see local camera but not partner:
1. Data channel is working (good sign!)
2. Likely a TURN server issue
3. Deploy a TURN relay server (see above)
4. Or ask user to switch networks

### Link expired message:
1. Normal after 5 minutes
2. Host should generate a new link
3. Rejoin with fresh link

### Black screen on first connect:
1. Give it 15 seconds to establish
2. Check browser console for errors
3. Verify browser permissions for camera/microphone
4. Try refreshing and reconnecting

---

## Technical Notes for Developers

### WebRTC Connection Flow:

```
User A (Host)              PeerJS Broker              User B (Guest)
    |                           |                           |
    +---> Creates peer ID ------>                           |
    |                    <------ Returns ID               |
    |                                                       |
    +---> Publishes connection ------>                      |
    |                                                       |
    |                          <----- Query for ID         |
    |                     Returns connection info -------> |
    |                                                       |
    +<========== WebRTC Data Channel ============+
    |                                                       |
    +<========== WebRTC Video Stream ============+
    |                                                       |

```

### ICE Gathering Process:

1. Local candidates (same network)
2. STUN candidates (public IP via STUN servers)
3. TURN candidates (relayed through TURN server - fallback)

Each candidate is tried; first successful connection wins.

### Link Token Lifecycle:

```
Generated -> Shareable -> Being Used -> Expires/Complete
   (T)         (T+5min)      (T+Xsec)      (X > 300sec)
```

Once used successfully, no need to wait for expiry.

---

## Credits & References

- **PeerJS:** https://peerjs.com - Simplified WebRTC library
- **MDN WebRTC:** https://developer.mozilla.org/en-US/docs/Web/API/WebRTC_API
- **Google STUN:** https://google.com - Free public STUN servers
- **Cloudflare STUN:** https://cloudflare.com - Alternative STUN servers
- **Vercel Edge Functions:** https://vercel.com/docs - Serverless hosting

---

## Version History

- **v2.0** (Current)
  - Added auto-camera preview in Duo modal
  - Added 5-minute link-based connections
  - Improved ICE server configuration
  - Enhanced error handling with timeouts

- **v1.0**
  - Original Duo Booth with 6-character codes
  - WebRTC peer-to-peer connections
  - Solo and Duo modes
  - Discord integration
