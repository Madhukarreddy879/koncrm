# Call Recording with Accessibility Service

## Overview

This implementation uses Android's Accessibility Service to enable reliable automatic call recording. The service keeps the app process alive during phone calls and automatically starts/stops recording based on call state.

## How It Works

1. **Accessibility Service** (`CallRecordingAccessibilityService`) runs in the background
2. It listens for phone state changes (ringing, offhook, idle)
3. When a call connects (OFFHOOK), it automatically starts recording
4. When the call ends (IDLE), it stops recording
5. The recording uses multiple audio sources in order of preference:
   - `VOICE_CALL` - Best quality, captures both sides
   - `VOICE_COMMUNICATION` - Good for VoIP-style recording
   - `VOICE_RECOGNITION` - Sometimes works on certain devices
   - `MIC` - Fallback, requires speaker mode for best results

## Setup Instructions

### For Users

1. **First Launch**: The app will prompt you to enable the Accessibility Service
2. **Manual Setup**:
   - Go to **Settings > Accessibility**
   - Find **EducationCRM** in the list
   - Toggle it **ON**
   - Tap **Allow** when prompted

### For Developers

1. **Rebuild the app** after these changes:
   ```bash
   cd EducationCRM/android
   ./gradlew clean
   cd ..
   npx react-native run-android
   ```

2. **Test the recording**:
   - Enable the Accessibility Service
   - Make a phone call
   - Check the notification shows "Recording Call"
   - After the call, check if the recording file was created

## Files Changed/Added

### Android Native (Kotlin)
- `RecordingService.kt` - Enhanced to try multiple audio sources
- `CallRecordingAccessibilityService.kt` - NEW - Handles auto-recording
- `AccessibilityModule.kt` - NEW - React Native bridge
- `AccessibilityPackage.kt` - NEW - Package registration
- `MainApplication.kt` - Added AccessibilityPackage

### Android Resources
- `AndroidManifest.xml` - Added accessibility service and permissions
- `res/xml/accessibility_service_config.xml` - NEW - Service configuration
- `res/values/strings.xml` - Added service description

### React Native (TypeScript)
- `src/services/AccessibilityService.ts` - NEW - JS interface
- `src/components/AccessibilitySetupPrompt.tsx` - NEW - Setup UI
- `src/components/CallRecordingSettings.tsx` - NEW - Settings UI
- `src/managers/CallRecordingManager.ts` - Updated for accessibility mode
- `App.tsx` - Added accessibility check on launch

## Permissions Required

- `RECORD_AUDIO` - For recording
- `READ_PHONE_STATE` - To detect call state
- `READ_CALL_LOG` - To get phone numbers (Android 9+)
- `FOREGROUND_SERVICE` - For recording service
- `FOREGROUND_SERVICE_MICROPHONE` - For microphone access
- `BIND_ACCESSIBILITY_SERVICE` - For accessibility service

## Troubleshooting

### Recording doesn't capture other party's voice
- **Check audio source**: Look at the notification - if it says "MIC", the device doesn't support VOICE_CALL
- **Try speaker mode**: Put the call on speaker for better recording with MIC source
- **Device limitation**: Some manufacturers block VOICE_CALL audio source

### Service keeps stopping
- **Battery optimization**: Disable battery optimization for the app
- **Settings > Apps > EducationCRM > Battery > Unrestricted**

### Recording not starting automatically
- **Check accessibility service**: Make sure it's enabled in Settings
- **Check auto-record setting**: Make sure auto-record is enabled in app settings

## Device Compatibility

| Audio Source | Quality | Device Support |
|--------------|---------|----------------|
| VOICE_CALL | Best | ~60% of devices |
| VOICE_COMMUNICATION | Good | ~70% of devices |
| VOICE_RECOGNITION | Fair | ~80% of devices |
| MIC | Basic | 100% (needs speaker) |

The app automatically tries each source and remembers which one works on the device.
