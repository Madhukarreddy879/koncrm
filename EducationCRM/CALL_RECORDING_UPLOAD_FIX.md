# Call Recording Upload Fix

## Problem

The accessibility service was recording calls successfully, but recordings weren't showing up in the app because they weren't being uploaded to the backend.

## Root Cause

The `CallRecordingAccessibilityService` was:
1. ✅ Detecting calls
2. ✅ Starting recording
3. ✅ Stopping recording when call ends
4. ❌ **NOT uploading the recording file**
5. ❌ **NOT associating recording with lead/call log**

## Solution

Created `CallRecordingEventService` to:
1. Listen for recording events from the accessibility service
2. Receive lead ID and call log ID from `CallRecordingManager`
3. Upload recordings automatically when calls end
4. Associate recordings with the correct lead and call log

## Changes Made

### New Files
- `src/services/CallRecordingEventService.ts` - Handles recording events and uploads

### Modified Files
- `src/managers/CallRecordingManager.ts` - Sets lead/call log IDs in event service
- `android/app/src/main/java/com/educationcrm/AccessibilityModule.kt` - Registers broadcast receivers

## How It Works Now

```
1. User taps call button
   ↓
2. CallRecordingManager.handleCallWithRecording()
   - Creates call log
   - Sets lead ID and call log ID in CallRecordingEventService
   ↓
3. Accessibility service detects call starts
   - Starts RecordingService
   - Broadcasts CALL_RECORDING_STARTED
   ↓
4. Call happens...
   ↓
5. Accessibility service detects call ends
   - Stops RecordingService
   - RecordingService broadcasts RECORDING_STOPPED with file details
   ↓
6. CallRecordingEventService receives RECORDING_STOPPED
   - Has lead ID and call log ID
   - Uploads recording via RecordingUploadService
   - Deletes local file after successful upload
   ↓
7. Recording appears in lead detail screen ✅
```

## Testing

1. **Rebuild the app**:
```bash
cd EducationCRM/android
./gradlew clean installDebug
```

2. **Make a test call**:
   - Go to a lead
   - Tap the phone icon
   - Make a call (can be short)
   - Return to the app

3. **Check the logs**:
```bash
adb logcat | grep -E "CallRecordingEvent|RecordingUpload"
```

You should see:
```
[CallRecordingEventService] Recording stopped with details
[CallRecordingEventService] Uploading recording...
[CallRecordingEventService] Upload progress: XX%
[CallRecordingEventService] Recording uploaded successfully
```

4. **Verify in UI**:
   - Go to the lead detail screen
   - Scroll to "Call Recordings" section
   - The recording should appear with playback controls

## Troubleshooting

### Recording not uploading

Check logs for:
```
[CallRecordingEventService] Missing lead or call log ID
```

This means the call wasn't initiated through the app (e.g., called from phone dialer directly).

### Upload fails

Check logs for:
```
[RecordingUploadService] Upload failed
```

Possible causes:
- Network issue
- Backend API issue
- File permissions

### Recording file is 0 bytes

The device doesn't support call recording. Check which audio source was used:
```
audioSource: MIC
```

If MIC, user needs to use speaker mode during calls.

## Next Steps

1. Test on multiple devices
2. Add UI indicator showing upload progress
3. Handle recordings made outside the app (from phone dialer)
4. Add retry mechanism for failed uploads
