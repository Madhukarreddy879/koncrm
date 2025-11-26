# Recording Troubleshooting Guide

## Issue: Recordings are not happening

### Possible Causes and Solutions:

## 1. Native Module Not Linked

**Symptom:** `AudioRecorderModule is undefined` error in logs

**Solution:**
```bash
# Clean and rebuild the Android app
cd EducationCRM/android
./gradlew clean
cd ..
npx react-native run-android
```

**Verify:** Check if `AudioRecorderPackage` is added to `MainApplication.kt`:
```kotlin
add(AudioRecorderPackage())
```

---

## 2. Missing Permissions

**Symptom:** `SecurityException` or permission denied errors

**Check AndroidManifest.xml has:**
```xml
<uses-permission android:name="android.permission.RECORD_AUDIO" />
```

**Runtime Permission:**
The app should request RECORD_AUDIO permission at runtime. Check `PermissionService.ts`.

**Test permissions:**
```bash
# Check if permission is granted
adb shell dumpsys package com.educationcrm | grep RECORD_AUDIO
```

---

## 3. Recording Not Starting

**Debug Steps:**

### A. Check Logcat for errors:
```bash
# Filter for AudioRecorder logs
adb logcat | grep AudioRecorder

# Or check all logs
adb logcat | grep -E "(AudioRecorder|RECORDING_ERROR)"
```

### B. Test the native module directly:

Add this to your `LeadDetailScreen.tsx` or create a test button:

```typescript
import testRecordingModule from '../test-recording';

// In your component
const testRecording = async () => {
  const success = await testRecordingModule();
  Alert.alert('Test Result', success ? 'Recording works!' : 'Recording failed');
};

// Add a button
<Button title="Test Recording" onPress={testRecording} />
```

### C. Check if MediaRecorder is available:
```bash
# Check device audio capabilities
adb shell getprop | grep audio
```

---

## 4. File Path Issues

**Symptom:** Recording starts but file is not created

**Check:**
1. Cache directory exists and is writable
2. File path is correct

**Test:**
```bash
# Check cache directory
adb shell ls -la /data/data/com.educationcrm/cache/

# Check if recording files exist
adb shell ls -la /data/data/com.educationcrm/cache/recording_*.m4a

# Check directory permissions
adb shell ls -ld /data/data/com.educationcrm/cache/
```

---

## 5. Recording Stops Immediately

**Symptom:** Recording indicator shows but stops right away

**Possible causes:**
- App state change listener stops recording too early
- Permission denied after starting
- MediaRecorder error

**Debug:**
```bash
# Watch logs in real-time while making a call
adb logcat -c && adb logcat | grep -E "(AudioRecorder|CallRecording|RecordingService)"
```

---

## 6. Recording Not Uploaded

**Symptom:** Recording works but doesn't appear in backend

**Check:**
1. Network connectivity
2. Backend API is accessible
3. Upload queue service

**Debug:**
```bash
# Check upload queue logs
adb logcat | grep -E "(UploadQueue|LeadService)"
```

**Verify backend:**
```bash
# Test backend health
curl http://localhost:4000/api/health

# Check if call log was created
# (Check backend logs or database)
```

---

## 7. Android 10+ Restrictions

**Issue:** Android 10+ has restrictions on background audio recording

**Note:** The current implementation records while the app is in foreground. When you make a call, the phone app comes to foreground, so recording might stop.

**Workaround:** The app uses `AppState` listener to detect when user returns and stops recording then.

---

## Quick Diagnostic Commands

```bash
# 1. Check if app is installed
adb shell pm list packages | grep educationcrm

# 2. Check permissions
adb shell dumpsys package com.educationcrm | grep -A 5 "granted=true"

# 3. Check for recording files
adb shell ls -la /data/data/com.educationcrm/cache/recording_*.m4a

# 4. Pull a recording to test
adb pull /data/data/com.educationcrm/cache/recording_1234567890.m4a

# 5. Check app logs
adb logcat -c && adb logcat *:E | grep educationcrm

# 6. Monitor in real-time
adb logcat | grep -E "(AudioRecorder|Recording|CallRecording)"
```

---

## Testing Checklist

- [ ] App rebuilt after adding native module
- [ ] RECORD_AUDIO permission in AndroidManifest.xml
- [ ] RECORD_AUDIO permission granted at runtime
- [ ] AudioRecorderModule is not undefined
- [ ] Cache directory exists and is writable
- [ ] No errors in logcat when starting recording
- [ ] Recording file is created in cache directory
- [ ] Recording file has non-zero size
- [ ] Backend API is accessible
- [ ] Call log is created in backend

---

## Expected Flow

1. User clicks call button
2. `CallRecordingManager.handleCallWithRecording()` called
3. Permissions checked
4. `RecordingService.startRecording()` called
5. Native `AudioRecorderModule.startRecording()` called
6. MediaRecorder starts recording to cache file
7. Phone dialer opens (app goes to background)
8. User makes call
9. User returns to app (app comes to foreground)
10. `AppState` listener detects app is active
11. `CallRecordingManager.stopRecording()` called
12. Recording file uploaded to backend
13. Local file deleted after successful upload

---

## Common Errors and Fixes

### Error: "AudioRecorderModule is undefined"
**Fix:** Rebuild the app

### Error: "Permission denied"
**Fix:** Grant RECORD_AUDIO permission in app settings

### Error: "No recording in progress"
**Fix:** This is normal if recording already stopped. Check logs to see why it stopped.

### Error: "Failed to start recording (IllegalStateException)"
**Fix:** MediaRecorder is in wrong state. Usually fixed by rebuilding.

### Error: "Failed to upload recording"
**Fix:** Check network and backend connectivity

---

## Need More Help?

1. Run the test script: `testRecordingModule()`
2. Collect logs: `adb logcat > recording-logs.txt`
3. Check if files are created: `adb shell ls -la /data/data/com.educationcrm/cache/`
4. Share the logs and file listing for further debugging
