# ⚠️ IMPORTANT: Backend Connection Fix Required

## 🚨 Current Problem

Your APK was built with the **wrong backend URL** for physical devices!

**Current URL in APK:**
```
http://10.0.2.2:4000/api  ❌ (Only works for emulator)
```

**Correct URL for your physical device:**
```
http://10.18.82.68:4000/api  ✅ (Your computer's IP)
```

---

## ✅ Quick Fix (3 Steps)

### Step 1: I've Already Updated Your .env File

Your `.env` file now has the correct IP: `10.18.82.68`

### Step 2: Rebuild the APK

**Option A: Use the automated script (Easiest)**
```bash
./EducationCRM/rebuild-for-device.sh
```

This script will:
- Check if backend is running
- Clean and rebuild APK
- Optionally install on your device

**Option B: Manual rebuild**
```bash
cd EducationCRM/android
./gradlew clean
./gradlew assembleRelease
```

### Step 3: Reinstall on Device

```bash
# Uninstall old version
adb uninstall com.educationcrm

# Install new version
adb install android/app/build/outputs/apk/release/app-release.apk
```

---

## 🔍 Before Rebuilding - Check These

### 1. Is Your Backend Running?

```bash
# Start your Phoenix backend
cd /path/to/your/backend
mix phx.server
```

You should see:
```
[info] Running EducationCrmWeb.Endpoint with Bandit at 0.0.0.0:4000 (http)
```

### 2. Is Backend Accessible from Network?

Test from your computer:
```bash
curl http://10.18.82.68:4000/api/health
```

Should return a response (not "Connection refused")

### 3. Is Your Firewall Allowing Port 4000?

```bash
# Allow port 4000
sudo ufw allow 4000/tcp

# Or check if it's already allowed
sudo ufw status | grep 4000
```

### 4. Backend Config Correct?

Check `config/dev.exs` in your Phoenix backend:
```elixir
config :education_crm, EducationCrmWeb.Endpoint,
  http: [ip: {0, 0, 0, 0}, port: 4000],  # Must be 0.0.0.0, not 127.0.0.1
  check_origin: false  # Allow mobile app requests
```

---

## 📱 Testing After Rebuild

### 1. Test Backend from Phone's Browser First

Before installing the app:
1. Open Chrome on your phone
2. Go to: `http://10.18.82.68:4000/api/health`
3. Should see a response (not error)

**If this doesn't work, the app won't work either!**

### 2. Install and Test App

```bash
adb install android/app/build/outputs/apk/release/app-release.apk
```

### 3. Watch Logs While Testing

```bash
adb logcat | grep -E "API|Network|axios"
```

Look for successful API calls to `http://10.18.82.68:4000/api/...`

---

## 🎯 Quick Checklist

Before testing on physical device:

- [ ] Backend is running (`mix phx.server`)
- [ ] Backend accessible: `curl http://10.18.82.68:4000/api/health`
- [ ] Firewall allows port 4000
- [ ] Phone on same WiFi as computer
- [ ] `.env` updated (already done ✅)
- [ ] APK rebuilt with new URL
- [ ] Old app uninstalled
- [ ] New app installed

---

## 💡 Alternative: Use ngrok (No Network Config Needed)

If you're having network/firewall issues, use ngrok:

```bash
# Install ngrok from https://ngrok.com/download

# Start tunnel
ngrok http 4000
```

You'll get a URL like: `https://abc123.ngrok.io`

Update `.env`:
```env
API_BASE_URL=https://abc123.ngrok.io/api
```

Then rebuild APK.

**Advantage:** Works even if phone is on mobile data!

---

## 🚀 Ready to Rebuild?

Run this command:
```bash
./EducationCRM/rebuild-for-device.sh
```

Or manually:
```bash
cd EducationCRM/android
./gradlew clean assembleRelease
adb uninstall com.educationcrm
adb install app/build/outputs/apk/release/app-release.apk
```

---

## 📚 More Details

- Full guide: `BACKEND_CONNECTION_SETUP.md`
- Testing guide: `START_HERE_TESTING.md`
- Device setup: `HOW_TO_TEST_ON_DEVICE.md`

---

**Bottom line:** You need to rebuild the APK with the correct IP address before testing on a physical device!
