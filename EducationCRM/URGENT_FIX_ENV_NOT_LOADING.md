# 🚨 URGENT FIX: .env Not Loading

## Problem Identified

The logs show:
```
[ApiService] Config.API_BASE_URL: undefined
```

This means `react-native-config` is NOT loading your `.env` file, so it falls back to the emulator URL `http://10.0.2.2:4000/api`.

---

## ✅ Quick Fix Applied

I've **hardcoded your IP address** as the fallback in `ApiService.ts`:

```typescript
const API_BASE_URL = Config.API_BASE_URL || 'http://10.138.166.68:4000/api';
```

This is a **temporary workaround** to get you testing immediately.

---

## 🚀 Rebuild NOW

```bash
cd EducationCRM/android
./gradlew clean
./gradlew assembleRelease
adb uninstall com.educationcrm
adb install app/build/outputs/apk/release/app-release.apk
```

---

## ✅ After Rebuild - Verify

Watch logs when app starts:
```bash
adb logcat | grep "ApiService"
```

You should now see:
```
[ApiService] API_BASE_URL: http://10.138.166.68:4000/api
[ApiService] Using hardcoded fallback for physical device testing
```

---

## 🧪 Test Login

Use valid credentials:
- Username: `priya.sharma`
- Password: `password123`

Or:
- Username: `admin`  
- Password: `password123`

---

## 📝 Why .env Wasn't Loading

Possible reasons:
1. `react-native-config` needs additional setup for release builds
2. The `.env` file might need to be in `android/` folder too
3. Build cache issues

---

## 🔧 Proper Fix (Later)

To properly fix `react-native-config`, you can:

### Option 1: Copy .env to android folder
```bash
cp EducationCRM/.env EducationCRM/android/.env
```

### Option 2: Use BuildConfig instead

Add to `android/app/build.gradle` in `defaultConfig`:
```groovy
defaultConfig {
    // ... existing config
    buildConfigField "String", "API_BASE_URL", "\"http://10.138.166.68:4000/api\""
}
```

Then in code:
```typescript
import { BuildConfig } from 'react-native';
const API_BASE_URL = BuildConfig.API_BASE_URL;
```

### Option 3: Fix react-native-config

Check `android/settings.gradle` has:
```groovy
include ':react-native-config'
project(':react-native-config').projectDir = new File(rootProject.projectDir, '../node_modules/react-native-config/android')
```

---

## ⚠️ Important Note

The hardcoded IP `10.138.166.68` will only work:
- On your current WiFi network
- Until your computer's IP changes

If your IP changes, you'll need to:
1. Update the hardcoded IP in `ApiService.ts`
2. Rebuild the APK

---

## 🎯 Quick Rebuild Command

```bash
cd ~/crm/EducationCRM/android && \
./gradlew clean assembleRelease && \
adb uninstall com.educationcrm && \
adb install app/build/outputs/apk/release/app-release.apk && \
echo "✅ Done! Test with: priya.sharma / password123"
```

---

## ✅ Success Criteria

After rebuild, you should:
1. See correct URL in logs: `http://10.138.166.68:4000/api`
2. Be able to login with `priya.sharma` / `password123`
3. See lead list screen after login
4. No "Network error" message

---

**Rebuild now and test!** The hardcoded IP will work immediately.
