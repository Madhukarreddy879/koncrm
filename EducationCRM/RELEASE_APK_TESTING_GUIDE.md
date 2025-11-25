# Release APK Testing Guide

## Build Information

**Build Date:** November 25, 2025
**APK Location:** `android/app/build/outputs/apk/release/app-release.apk`
**APK Size:** 85 MB
**Build Type:** Release (Signed)
**Target Android Versions:** 8.0+ (API 26+)

---

## Pre-Testing Checklist

### 1. APK Verification
- [x] Release APK built successfully
- [ ] APK signed with release keystore
- [ ] ProGuard/R8 code shrinking enabled
- [ ] APK size optimized (target: <100MB)

### 2. Device Requirements
- Android device running Android 8.0 (Oreo) or higher
- Minimum 2GB RAM recommended
- Active internet connection for API testing
- Phone call capability for testing call features
- Microphone access for recording features

---

## Installation Instructions

### Method 1: Direct Installation (Recommended for Testing)

1. **Transfer APK to Device:**
   ```bash
   # Using ADB
   adb install android/app/build/outputs/apk/release/app-release.apk
   
   # Or copy to device
   adb push android/app/build/outputs/apk/release/app-release.apk /sdcard/Download/
   ```

2. **Install on Device:**
   - Navigate to Downloads folder on device
   - Tap on `app-release.apk`
   - Allow installation from unknown sources if prompted
   - Follow installation prompts

### Method 2: Share via Cloud/Email
1. Upload APK to Google Drive, Dropbox, or email
2. Download on target device
3. Install as described above

---

## Comprehensive Testing Checklist

### Phase 1: Installation & Launch (Critical)

#### 1.1 Installation
- [ ] APK installs without errors
- [ ] App icon appears in launcher
- [ ] App name displays correctly as "EducationCRM"
- [ ] No installation warnings or errors

#### 1.2 First Launch
- [ ] App launches successfully
- [ ] Splash screen displays (if implemented)
- [ ] No crashes on first launch
- [ ] Login screen appears
- [ ] UI renders correctly (no broken layouts)

#### 1.3 Permissions
- [ ] App requests necessary permissions on first use
- [ ] Phone call permission prompt appears
- [ ] Microphone permission prompt appears
- [ ] Storage permission prompt appears (if needed)
- [ ] Permissions can be granted successfully

---

### Phase 2: Authentication (Critical)

#### 2.1 Login Functionality
- [ ] Username field accepts input
- [ ] Password field accepts input
- [ ] Password visibility toggle works
- [ ] Login button is responsive
- [ ] Loading indicator shows during authentication
- [ ] Error messages display for invalid credentials
- [ ] Successful login navigates to main screen

#### 2.2 API Connection
- [ ] App connects to backend API successfully
- [ ] JWT token is received and stored
- [ ] Network errors are handled gracefully
- [ ] Timeout errors show appropriate messages

**Test Credentials:**
```
Username: [Your test telecaller username]
Password: [Your test password]
```

---

### Phase 3: Core Features (Critical)

#### 3.1 Lead List Screen
- [ ] Lead list loads successfully
- [ ] Leads display with correct information (name, phone, status)
- [ ] Pull-to-refresh works
- [ ] Search functionality works
- [ ] Status filter chips work
- [ ] Pagination loads more leads on scroll
- [ ] Empty state displays when no leads
- [ ] Tapping a lead navigates to detail screen
- [ ] Priority indicators show for due follow-ups

#### 3.2 Lead Detail Screen
- [ ] Lead details load correctly
- [ ] All fields display properly (name, phone, email, etc.)
- [ ] Phone number is tappable
- [ ] Editable fields can be modified
- [ ] Status dropdown works
- [ ] Save button updates lead successfully
- [ ] Notes section displays interaction history
- [ ] Add note functionality works
- [ ] Schedule follow-up button works

#### 3.3 Call Functionality (Critical)
- [ ] Tapping phone number initiates call
- [ ] Native dialer opens with correct number
- [ ] Call permission is requested if not granted
- [ ] Call is logged in system after initiation
- [ ] Call outcome can be recorded
- [ ] Call timestamp is accurate

#### 3.4 Call Recording (Important)
- [ ] Recording permission is requested
- [ ] Manual recording start/stop buttons appear
- [ ] Recording indicator shows when active
- [ ] Recording timer displays duration
- [ ] Recording stops successfully
- [ ] Recording uploads to server
- [ ] Upload progress indicator shows
- [ ] Failed uploads retry automatically
- [ ] Recordings appear in lead history
- [ ] Playback controls work (play/pause/seek)
- [ ] Audio quality is acceptable

**Note:** Call recording may not work on Android 10+ due to OS restrictions. Test fallback manual recording.

#### 3.5 Follow-up Management
- [ ] Follow-up list screen loads
- [ ] Follow-ups grouped by date (Overdue, Today, Upcoming)
- [ ] Follow-up cards display correct information
- [ ] Mark complete checkbox works
- [ ] Completed follow-ups update status
- [ ] Tapping follow-up navigates to lead detail
- [ ] Pull-to-refresh updates follow-up list

#### 3.6 Stats Screen
- [ ] Stats screen loads successfully
- [ ] Today's calls count displays
- [ ] Weekly calls count displays
- [ ] Total leads assigned displays
- [ ] Conversion rate displays correctly
- [ ] Pull-to-refresh updates stats
- [ ] All metrics are accurate

---

### Phase 4: Performance Testing (Important)

#### 4.1 App Performance
- [ ] App launches within 3 seconds
- [ ] Lead list scrolls smoothly (60fps)
- [ ] No lag when typing in search
- [ ] Screen transitions are smooth
- [ ] No memory leaks during extended use
- [ ] App doesn't crash after 30 minutes of use

#### 4.2 Network Performance
- [ ] API requests complete within 2 seconds
- [ ] Offline mode shows appropriate message
- [ ] App recovers when network restored
- [ ] Failed requests retry automatically
- [ ] Optimistic UI updates work correctly

#### 4.3 Battery & Resource Usage
- [ ] App doesn't drain battery excessively
- [ ] CPU usage is reasonable during idle
- [ ] Memory usage stays under 200MB
- [ ] No excessive background activity

---

### Phase 5: Edge Cases & Error Handling (Important)

#### 5.1 Network Scenarios
- [ ] App handles no internet connection gracefully
- [ ] App handles slow network (3G simulation)
- [ ] App handles intermittent connectivity
- [ ] Cached data displays when offline
- [ ] Queued actions sync when online

#### 5.2 Permission Scenarios
- [ ] App handles denied call permission
- [ ] App handles denied recording permission
- [ ] App shows appropriate messages for denied permissions
- [ ] App continues to function with limited permissions

#### 5.3 Data Scenarios
- [ ] App handles empty lead list
- [ ] App handles large lead lists (100+ items)
- [ ] App handles leads with missing data
- [ ] App handles special characters in names
- [ ] App handles long phone numbers
- [ ] App handles invalid phone numbers

#### 5.4 Session Management
- [ ] Token refresh works automatically
- [ ] Expired token triggers re-login
- [ ] Logout clears all cached data
- [ ] Multiple login attempts don't cause issues

---

### Phase 6: Android Version Compatibility (Critical)

Test on multiple Android versions if possible:

#### Android 8.0 (Oreo) - API 26
- [ ] App installs successfully
- [ ] All features work correctly
- [ ] No compatibility warnings

#### Android 9.0 (Pie) - API 28
- [ ] App installs successfully
- [ ] All features work correctly
- [ ] Call recording works (if supported)

#### Android 10 (Q) - API 29
- [ ] App installs successfully
- [ ] All features work correctly
- [ ] Call recording limitation notice shows
- [ ] Manual recording fallback works

#### Android 11+ (R+) - API 30+
- [ ] App installs successfully
- [ ] All features work correctly
- [ ] Scoped storage works correctly
- [ ] All permissions granted properly

---

### Phase 7: UI/UX Testing (Important)

#### 7.1 Visual Design
- [ ] All text is readable
- [ ] Colors are consistent
- [ ] Icons display correctly
- [ ] Buttons are properly sized
- [ ] Touch targets are adequate (min 48dp)
- [ ] No UI elements overlap
- [ ] Loading states are clear

#### 7.2 Responsiveness
- [ ] App works on different screen sizes
- [ ] Portrait orientation works
- [ ] Landscape orientation works (if supported)
- [ ] Keyboard doesn't hide input fields
- [ ] Scrolling works in all screens

#### 7.3 Accessibility
- [ ] Text size is adjustable
- [ ] Contrast ratios are sufficient
- [ ] Touch targets are accessible
- [ ] Error messages are clear

---

### Phase 8: Security Testing (Important)

#### 8.1 Data Security
- [ ] JWT tokens stored securely
- [ ] Passwords not visible in logs
- [ ] API keys not exposed in APK
- [ ] HTTPS used for all API calls
- [ ] Certificate pinning works (if implemented)

#### 8.2 App Security
- [ ] APK is signed with release key
- [ ] ProGuard obfuscation applied
- [ ] No sensitive data in logs
- [ ] No debug information exposed

---

## Known Issues & Limitations

### Android 10+ Call Recording
**Issue:** Call recording may not work on Android 10 and above due to OS restrictions.

**Workaround:** 
- Use manual recording start/stop buttons
- Enable speaker mode for better recording quality
- Inform users about limitation in app

### Large APK Size (85MB)
**Current Size:** 85 MB

**Optimization Opportunities:**
1. Enable APK splits by ABI (can reduce to ~30MB per architecture)
2. Use Android App Bundle (AAB) for Play Store
3. Remove unused resources
4. Optimize images and assets
5. Enable resource shrinking

---

## Performance Benchmarks

### Target Metrics
- **App Launch:** < 3 seconds
- **API Response:** < 2 seconds
- **Lead List Load:** < 1 second
- **Search Response:** < 300ms (debounced)
- **Memory Usage:** < 200MB
- **Battery Drain:** < 5% per hour of active use

### Actual Results
- [ ] App Launch: _____ seconds
- [ ] API Response: _____ seconds
- [ ] Lead List Load: _____ seconds
- [ ] Search Response: _____ ms
- [ ] Memory Usage: _____ MB
- [ ] Battery Drain: _____ % per hour

---

## Bug Reporting Template

When reporting bugs, include:

```
**Bug Title:** [Short description]

**Severity:** Critical / High / Medium / Low

**Device Info:**
- Device Model: [e.g., Samsung Galaxy S21]
- Android Version: [e.g., Android 11]
- App Version: [from About screen]

**Steps to Reproduce:**
1. [First step]
2. [Second step]
3. [etc.]

**Expected Behavior:**
[What should happen]

**Actual Behavior:**
[What actually happens]

**Screenshots/Videos:**
[Attach if available]

**Logs:**
[Attach logcat if available]
```

---

## APK Distribution Checklist

### Internal Testing
- [ ] Test on at least 3 different devices
- [ ] Test on at least 2 different Android versions
- [ ] All critical features tested
- [ ] All known bugs documented
- [ ] Performance benchmarks met

### Pre-Production
- [ ] Release notes prepared
- [ ] User documentation updated
- [ ] Training materials ready
- [ ] Support team briefed
- [ ] Rollback plan prepared

### Production Release
- [ ] Final testing completed
- [ ] Stakeholder approval received
- [ ] Distribution method confirmed
- [ ] Installation instructions shared
- [ ] Support channels ready

---

## Next Steps After Testing

### If Testing Passes:
1. Document all test results
2. Create release notes
3. Prepare for distribution
4. Train telecaller team
5. Monitor initial rollout

### If Issues Found:
1. Document all bugs with severity
2. Prioritize critical issues
3. Fix and rebuild APK
4. Re-test affected areas
5. Repeat testing cycle

---

## Quick Test Commands

### Install APK via ADB
```bash
adb install -r android/app/build/outputs/apk/release/app-release.apk
```

### View Logs
```bash
adb logcat | grep -i "educationcrm"
```

### Check App Info
```bash
adb shell dumpsys package com.educationcrm
```

### Uninstall App
```bash
adb uninstall com.educationcrm
```

### Clear App Data
```bash
adb shell pm clear com.educationcrm
```

---

## Support & Resources

- **APK Location:** `android/app/build/outputs/apk/release/app-release.apk`
- **Build Configuration:** `android/app/build.gradle`
- **Release Setup:** `android/RELEASE_BUILD_SETUP.md`
- **Release Checklist:** `android/RELEASE_CHECKLIST.md`

---

## Testing Sign-Off

**Tester Name:** _________________
**Date:** _________________
**Device Used:** _________________
**Android Version:** _________________

**Overall Result:** ☐ Pass  ☐ Pass with Minor Issues  ☐ Fail

**Comments:**
_________________________________________________________________
_________________________________________________________________
_________________________________________________________________

**Approved for Distribution:** ☐ Yes  ☐ No

**Signature:** _________________
