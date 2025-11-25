# Quick Test Reference Card

## 🚀 Installation

```bash
# Install via ADB
adb install android/app/build/outputs/apk/release/app-release.apk

# Or copy to device
adb push android/app/build/outputs/apk/release/app-release.apk /sdcard/Download/
```

## ✅ Critical Tests (Must Pass)

### 1. Launch & Login
- [ ] App launches without crash
- [ ] Login screen appears
- [ ] Can login with valid credentials
- [ ] Navigates to lead list after login

### 2. Lead Management
- [ ] Lead list loads and displays
- [ ] Can search leads
- [ ] Can filter by status
- [ ] Can open lead details
- [ ] Can update lead information
- [ ] Changes save successfully

### 3. Call Features
- [ ] Tapping phone number opens dialer
- [ ] Call is logged in system
- [ ] Can record call (or manual recording works)
- [ ] Recording uploads successfully
- [ ] Can playback recordings

### 4. Follow-ups
- [ ] Follow-up list displays
- [ ] Can create new follow-up
- [ ] Can mark follow-up complete
- [ ] Follow-ups grouped correctly (Overdue/Today/Upcoming)

### 5. Stats
- [ ] Stats screen loads
- [ ] Metrics display correctly
- [ ] Data refreshes on pull-to-refresh

## 🔍 Quick Checks

### Performance
- Launch time: **< 3 seconds** ⏱️
- API response: **< 2 seconds** 🌐
- Smooth scrolling: **60fps** 📱
- Memory usage: **< 200MB** 💾

### Compatibility
- Android 8.0+ ✓
- Different screen sizes ✓
- Portrait & landscape ✓

### Network
- Works with WiFi ✓
- Works with mobile data ✓
- Handles offline gracefully ✓
- Syncs when back online ✓

## 🐛 Common Issues to Check

1. **Call Recording on Android 10+**
   - May not work automatically
   - Manual recording should work
   - Check for limitation notice

2. **Permissions**
   - Phone permission required for calls
   - Microphone for recording
   - Storage for file access

3. **Network Errors**
   - Check API endpoint configuration
   - Verify internet connection
   - Check firewall/proxy settings

## 📊 Test Results Template

```
Device: _______________
Android: _______________
Date: _______________

✅ Installation: Pass / Fail
✅ Login: Pass / Fail
✅ Leads: Pass / Fail
✅ Calls: Pass / Fail
✅ Recording: Pass / Fail
✅ Follow-ups: Pass / Fail
✅ Stats: Pass / Fail
✅ Performance: Pass / Fail

Overall: Pass / Fail

Notes: _________________
```

## 🔧 Useful Commands

```bash
# View logs
adb logcat | grep -i "educationcrm"

# Clear app data
adb shell pm clear com.educationcrm

# Uninstall
adb uninstall com.educationcrm

# Check app info
adb shell dumpsys package com.educationcrm
```

## 📱 APK Info

- **Size:** 85 MB
- **Location:** `android/app/build/outputs/apk/release/app-release.apk`
- **Min Android:** 8.0 (API 26)
- **Target Android:** Latest

## 🎯 Priority Testing Order

1. **Critical** (Must work): Login, Leads, Calls
2. **High** (Should work): Recording, Follow-ups, Stats
3. **Medium** (Nice to have): Offline mode, Optimizations
4. **Low** (Can fix later): UI polish, Edge cases

## ✨ Success Criteria

- ✅ All critical tests pass
- ✅ No crashes during 30-min use
- ✅ Performance meets targets
- ✅ Works on Android 8.0+
- ✅ No data loss or corruption

## 📞 Support

For issues or questions, refer to:
- Full guide: `RELEASE_APK_TESTING_GUIDE.md`
- Build setup: `android/RELEASE_BUILD_SETUP.md`
- Checklist: `android/RELEASE_CHECKLIST.md`
