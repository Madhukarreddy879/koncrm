# 🔧 Fixes Applied - Rebuild Required

## ✅ Issues Fixed

### 1. API Response Structure Mismatch

**Problem:** The mobile app expected a different response structure than what the backend provides.

**Backend returns:**
```json
{
  "data": {
    "access_token": "...",
    "refresh_token": "...",
    "token_type": "Bearer",
    "expires_in": 900
  }
}
```

**Mobile app was expecting:**
```json
{
  "token": "...",
  "refresh_token": "...",
  "user": { ... }
}
```

**Fixed in:**
- `src/services/AuthService.ts` - Updated to use `access_token` from `data` object
- `src/services/ApiService.ts` - Updated token refresh to use correct structure

### 2. Added Debug Logging

Added console logs to show what API URL is being used when the app starts.

---

## 🚀 You Must Rebuild the APK

The code changes won't take effect until you rebuild and reinstall the app.

### Quick Rebuild:

```bash
cd EducationCRM/android
./gradlew assembleRelease
```

### Reinstall on Device:

```bash
# Uninstall old version
adb uninstall com.educationcrm

# Install new version
adb install app/build/outputs/apk/release/app-release.apk
```

---

## 🧪 Testing After Rebuild

### 1. Check Logs While App Starts

Connect your phone and watch logs:
```bash
adb logcat | grep -E "ApiService|AuthService"
```

You should see:
```
[ApiService] API_BASE_URL: http://10.138.166.68:4000/api
[ApiService] Config.API_BASE_URL: http://10.138.166.68:4000/api
```

### 2. Test Login

Use one of these valid usernames:
- `priya.sharma` / `password123`
- `rahul.kumar` / `password123`
- `anjali.reddy` / `password123`
- `admin` / `password123`

### 3. Watch for Errors

If you still get "Network error", check the logs for:
```bash
adb logcat | grep -i "error"
```

---

## 📋 Valid Test Credentials

From your database, these users exist:

| Username | Role | Password |
|----------|------|----------|
| admin | admin | password123 |
| priya.sharma | telecaller | password123 |
| rahul.kumar | telecaller | password123 |
| anjali.reddy | telecaller | password123 |
| vikram.singh | telecaller | password123 |
| sneha.patel | telecaller | password123 |
| arun.nair | telecaller | password123 |
| madhu.reddy | telecaller | password123 |

---

## ✅ Verification Checklist

Before testing:
- [ ] Backend is running (`mix phx.server`)
- [ ] Backend accessible: `curl http://10.138.166.68:4000/api/health`
- [ ] Phone on same WiFi as computer
- [ ] APK rebuilt with fixes
- [ ] Old app uninstalled
- [ ] New app installed
- [ ] Using valid credentials (not "telecaller1")

---

## 🐛 If Still Not Working

### Check 1: Verify API URL in Logs

```bash
adb logcat | grep "API_BASE_URL"
```

Should show: `http://10.138.166.68:4000/api`

If it shows `http://10.0.2.2:4000/api`, the .env wasn't picked up during build.

**Solution:**
```bash
cd EducationCRM/android
./gradlew clean
./gradlew assembleRelease
```

### Check 2: Test API from Phone's Browser

Open Chrome on phone and go to:
```
http://10.138.166.68:4000
```

Should see Phoenix welcome page. If not, network issue.

### Check 3: Watch Full Login Request

```bash
adb logcat | grep -E "API Request|API Response"
```

Should see:
```
[API Request] POST /auth/login
[API Response] POST /auth/login status: 200
```

---

## 🎯 Expected Behavior After Fix

1. **App opens** - No crash
2. **Enter credentials** - `priya.sharma` / `password123`
3. **Tap Sign In** - Loading indicator shows
4. **Success** - Navigates to lead list screen
5. **No errors** - No "Network error" message

---

## 💡 Quick Test Command

Run this to rebuild and reinstall in one go:

```bash
cd EducationCRM/android && \
./gradlew assembleRelease && \
adb uninstall com.educationcrm && \
adb install app/build/outputs/apk/release/app-release.apk && \
echo "✅ Done! Now test the app with: priya.sharma / password123"
```

---

## 📞 Summary

**What was wrong:**
- Mobile app expected `token` field, backend sends `access_token`
- Response wrapped in `data` object, app wasn't unwrapping it

**What was fixed:**
- Updated AuthService to extract `access_token` from `data.access_token`
- Updated token refresh logic
- Added debug logging

**What you need to do:**
1. Rebuild APK
2. Reinstall on phone
3. Test with valid credentials (e.g., `priya.sharma`)

---

**Ready to rebuild?** Run:
```bash
cd EducationCRM/android
./gradlew assembleRelease
adb uninstall com.educationcrm
adb install app/build/outputs/apk/release/app-release.apk
```
