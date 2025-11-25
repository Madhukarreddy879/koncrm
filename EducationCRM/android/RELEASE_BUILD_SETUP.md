# Android Release Build Setup

## Keystore Configuration

The release build is configured to use a signing keystore for production APKs.

### Keystore Details

- **Location**: `android/app/education-crm.keystore`
- **Alias**: `education-crm`
- **Algorithm**: RSA 2048-bit
- **Validity**: 10,000 days (~27 years)

### Keystore Properties File

The signing credentials are stored in `android/keystore.properties` (excluded from git):

```properties
storePassword=YOUR_STORE_PASSWORD
keyPassword=YOUR_KEY_PASSWORD
keyAlias=education-crm
storeFile=app/education-crm.keystore
```

**IMPORTANT**: 
- The `keystore.properties` file is gitignored for security
- Keep the keystore file and passwords secure
- Back up the keystore file in a secure location
- If you lose the keystore, you cannot update the app on Play Store

### Version Management

Update version in `android/app/build.gradle`:

```gradle
defaultConfig {
    versionCode 1        // Increment for each release (integer)
    versionName "1.0.0"  // User-visible version string
}
```

**Version Guidelines**:
- `versionCode`: Must be incremented for each Play Store release
- `versionName`: Semantic versioning (MAJOR.MINOR.PATCH)

## Building Release APK

### Prerequisites

1. Ensure `keystore.properties` exists with correct credentials
2. Ensure `education-crm.keystore` exists in `android/app/`

### Build Commands

```bash
# Clean previous builds
cd android
./gradlew clean

# Build release APK
./gradlew assembleRelease

# Output location:
# android/app/build/outputs/apk/release/app-release.apk
```

### Build Release Bundle (for Play Store)

```bash
cd android
./gradlew bundleRelease

# Output location:
# android/app/build/outputs/bundle/release/app-release.aab
```

## ProGuard Configuration

ProGuard is enabled for release builds to:
- Minify code (reduce APK size)
- Obfuscate code (basic security)
- Remove unused code

Configuration file: `android/app/proguard-rules.pro`

### Testing Release Build

Always test the release APK before distribution:

```bash
# Install release APK on device
adb install android/app/build/outputs/apk/release/app-release.apk

# Or use React Native CLI
npx react-native run-android --variant=release
```

### Common Issues

**Issue**: Build fails with "Keystore not found"
- **Solution**: Ensure `keystore.properties` exists and `storeFile` path is correct

**Issue**: ProGuard removes required classes
- **Solution**: Add keep rules to `proguard-rules.pro`

**Issue**: App crashes in release but works in debug
- **Solution**: Check ProGuard rules, test with `minifyEnabled false` temporarily

## Security Best Practices

1. **Never commit** `keystore.properties` or `*.keystore` files to git
2. **Back up** the keystore file in multiple secure locations
3. **Document** the keystore password in a secure password manager
4. **Rotate** signing keys periodically (requires Play App Signing)
5. **Use** Play App Signing for additional security layer

## Environment Configuration

The app uses `react-native-config` for environment variables:

- Development: `.env.development`
- Production: `.env.production`

Ensure the correct `.env` file is used when building:

```bash
# Build with production environment
ENVFILE=.env.production ./gradlew assembleRelease
```

## Distribution

### Internal Testing

1. Build release APK
2. Share APK file directly with testers
3. Testers must enable "Install from Unknown Sources"

### Play Store

1. Build release bundle (`.aab`)
2. Upload to Play Console
3. Configure release track (internal/alpha/beta/production)
4. Submit for review

## Troubleshooting

### Check Keystore Details

```bash
keytool -list -v -keystore android/app/education-crm.keystore -alias education-crm
```

### Verify APK Signature

```bash
jarsigner -verify -verbose -certs android/app/build/outputs/apk/release/app-release.apk
```

### Analyze APK Size

```bash
./gradlew assembleRelease
# Then use Android Studio's APK Analyzer or:
unzip -l android/app/build/outputs/apk/release/app-release.apk
```
