# Testing Call Recording - Quick Guide

## Current Issue

The accessibility service is enabled but can't detect phone state because `READ_PHONE_STATE` permission wasn't granted at runtime.

## Fix Applied

Updated `App.tsx` to request `READ_PHONE_STATE` permission on app launch.

## Testing Steps

### 1. Uninstall and Reinstall

```bash
adb uninstall com.educationcrm
cd EducationCRM/android
./gradlew clean
cd ..
npx react-native run-android
```

### 2. Grant Permissions

When the app launches, it will request 3 permissions:
- ✅ **Phone** - To make calls
- ✅ **Microphone** - To record audio  
- ✅ **Phone State** - To detect when calls start/end

**IMPORTANT**: Grant ALL three permissions!

### 3. Enable Accessibility Service

- Tap "Open Settings" when prompted
- Find "EducationCRM" in the accessibility list
- Toggle it ON
- Tap "Allow"
- Return to the app

### 4. Make a Test Call

- Log in to the app
- Go to a lead
- Tap the phone icon to call
- **Look for the notification**: "Recording Call - Using: VOICE_CALL" (or VOICE_COMMUNICATION/MIC)

### 5. Check Logs

Run this in a separate terminal:
```bash
adb logcat | grep -E "CallRecordingService|RecordingService"
```

**What you should see:**
```
CallRecordingService: Call state changed: 2
CallRecordingService: Call started - initiating recording
RecordingService: Trying audio source: VOICE_CALL
RecordingService: Recording started with: VOICE_CALL
```

**When call ends:**
```
CallRecordingService: Call ended - stopping recording
RecordingService: Recording stopped. Duration: XX, Size: XXXX bytes
```

### 6. Verify Recording File

After the call:
```bash
adb shell ls -lh /data/data/com.educationcrm/cache/call_*.m4a
```

You should see a file with a size > 0 bytes.

## Expected Results

| Audio Source | What It Means |
|--------------|---------------|
| **VOICE_CALL** | ✅ Best! Captures both sides clearly |
| **VOICE_COMMUNICATION** | ✅ Good! Should capture both sides |
| **VOICE_RECOGNITION** | ⚠️ May work, test quality |
| **MIC** | ⚠️ Fallback - use speaker mode |

## Troubleshooting

### Still seeing "Failed to register telephony callback"?

1. Check permissions:
```bash
adb shell dumpsys package com.educationcrm | grep permission
```

Look for:
- `android.permission.READ_PHONE_STATE: granted=true`

2. If not granted, manually grant:
```bash
adb shell pm grant com.educationcrm android.permission.READ_PHONE_STATE
```

### No recording file created?

- Check if accessibility service is actually running:
```bash
adb shell settings get secure enabled_accessibility_services
```

Should include: `com.educationcrm/com.educationcrm.CallRecordingAccessibilityService`

### Recording file is 0 bytes or very small?

- Your device doesn't support VOICE_CALL audio source
- The app will fall back to MIC
- **Solution**: Use speaker mode during calls

## Success Criteria

✅ No "Failed to register telephony callback" error
✅ Logs show "Call started - initiating recording"
✅ Logs show "Recording started with: [AUDIO_SOURCE]"
✅ Recording file created with size > 100KB for a 30-second call
✅ Both sides of conversation audible in recording

## Next Steps After Success

1. Test on multiple devices to see which audio sources work
2. Add UI to show recording status during calls
3. Implement upload of recordings to backend
4. Add playback feature in lead detail screen
