# Android Release Build Checklist

Use this checklist before building and distributing a release APK.

## Pre-Build Checklist

### Version Management
- [ ] Update `versionCode` in `app/build.gradle` (must increment)
- [ ] Update `versionName` in `app/build.gradle` (e.g., "1.0.1")
- [ ] Update CHANGELOG or release notes

### Environment Configuration
- [ ] Verify `.env.production` has correct API endpoints
- [ ] Verify `.env.production` has production API keys (if any)
- [ ] Remove any debug/test API keys

### Code Quality
- [ ] Run tests: `npm test`
- [ ] Fix all linting errors: `npm run lint`
- [ ] Remove console.log statements (ProGuard will remove them anyway)
- [ ] Remove debug code and comments

### Security
- [ ] Verify `keystore.properties` exists with correct credentials
- [ ] Verify `education-crm.keystore` exists in `android/app/`
- [ ] Ensure sensitive files are gitignored
- [ ] Review ProGuard rules for any new dependencies

## Build Process

### 1. Clean Build
```bash
cd android
./gradlew clean
```

### 2. Build Release APK
```bash
./gradlew assembleRelease
```

### 3. Verify Build Output
- [ ] Check APK exists: `app/build/outputs/apk/release/app-release.apk`
- [ ] Check APK size (should be optimized with ProGuard)
- [ ] Verify no build errors or warnings

### 4. Sign Verification
```bash
jarsigner -verify -verbose -certs app/build/outputs/apk/release/app-release.apk
```
- [ ] Verify signature is valid
- [ ] Verify certificate matches expected keystore

## Testing Checklist

### Installation Testing
- [ ] Install on physical device: `adb install app/build/outputs/apk/release/app-release.apk`
- [ ] Verify app installs without errors
- [ ] Verify app icon displays correctly
- [ ] Verify app name is correct

### Functional Testing
- [ ] Login functionality works
- [ ] API calls succeed (check network requests)
- [ ] Lead list loads and displays correctly
- [ ] Lead detail screen works
- [ ] Phone call initiation works
- [ ] Call recording works (if applicable)
- [ ] Follow-up scheduling works
- [ ] Stats screen displays correctly
- [ ] Logout works

### Performance Testing
- [ ] App launches within 3 seconds
- [ ] No crashes during normal usage
- [ ] Smooth scrolling in lead list
- [ ] No memory leaks (test with extended usage)
- [ ] Battery usage is reasonable

### Edge Cases
- [ ] Test with no network connection (offline mode)
- [ ] Test with slow network
- [ ] Test with invalid credentials
- [ ] Test with empty data states
- [ ] Test with large data sets

### Device Testing
- [ ] Test on Android 8.0 (minimum supported)
- [ ] Test on Android 10+ (call recording restrictions)
- [ ] Test on different screen sizes
- [ ] Test on low-end device (performance)
- [ ] Test on high-end device

## Post-Build Checklist

### Documentation
- [ ] Update release notes
- [ ] Document known issues
- [ ] Update user documentation if needed
- [ ] Update internal team documentation

### Distribution Preparation
- [ ] Rename APK with version: `education-crm-v1.0.0.apk`
- [ ] Calculate and document APK checksum (SHA256)
- [ ] Prepare installation instructions for telecallers
- [ ] Prepare rollback plan if needed

### Backup
- [ ] Back up keystore file to secure location
- [ ] Back up keystore passwords to password manager
- [ ] Back up signed APK for records

## Distribution

### Internal Testing
- [ ] Share APK with internal testers
- [ ] Provide installation instructions
- [ ] Collect feedback
- [ ] Fix critical issues before wider release

### Production Release
- [ ] Get approval from stakeholders
- [ ] Distribute to telecallers
- [ ] Monitor for crash reports
- [ ] Monitor user feedback
- [ ] Be ready for hotfix if needed

## Rollback Plan

If critical issues are found:
- [ ] Have previous version APK ready
- [ ] Document rollback procedure
- [ ] Communicate with users
- [ ] Fix issues and prepare new release

## Common Issues & Solutions

### Build Fails
- **Issue**: Keystore not found
  - **Solution**: Check `keystore.properties` path
  
- **Issue**: ProGuard errors
  - **Solution**: Add keep rules to `proguard-rules.pro`

### App Crashes
- **Issue**: Crashes on startup
  - **Solution**: Check ProGuard rules, test with `minifyEnabled false`
  
- **Issue**: Network requests fail
  - **Solution**: Verify `.env.production` configuration

### Installation Issues
- **Issue**: "App not installed"
  - **Solution**: Uninstall previous version first
  
- **Issue**: "Unknown sources" error
  - **Solution**: Enable "Install from unknown sources" in device settings

## Version History

| Version | Date | Changes | APK Size |
|---------|------|---------|----------|
| 1.0.0   | TBD  | Initial release | TBD |

## Notes

- Always test release builds before distribution
- Keep detailed records of each release
- Maintain changelog for user-facing changes
- Document any breaking changes
- Plan for gradual rollout if possible
