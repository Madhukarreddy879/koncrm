# Quick Rebuild with Enhanced Logging

## Changes Made

Added detailed logging to AuthService to see exactly what's happening during login.

## Rebuild

```bash
cd ~/crm/EducationCRM/android
./gradlew assembleRelease
adb uninstall com.educationcrm
adb install app/build/outputs/apk/release/app-release.apk
```

## Watch Logs

```bash
adb logcat | grep "AuthService"
```

## Test Login

Use: `priya.sharma` / `password123`

## What You Should See

```
[AuthService] Attempting login for: priya.sharma
[AuthService] Login response received: 200
[AuthService] Response data structure: {"data":{"access_token":"...","refresh_token":"..."}}
[AuthService] Tokens extracted, storing...
[AuthService] Login successful! Tokens stored.
```

If you see all these logs, login is working!

## If Login Works But Doesn't Navigate

The issue might be in the navigation logic. Check if tokens are being stored:

```bash
adb logcat | grep -E "AuthService|AsyncStorage"
```
