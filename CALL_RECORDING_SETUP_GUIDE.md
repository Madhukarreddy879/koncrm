# Call Recording Setup Guide for Android 10+

## What Changed

The app now uses Android's native `VOICE_CALL` audio source (Android 10+) to capture actual phone call audio instead of just microphone input.

## Requirements

### Device Requirements
- ✅ Android 10 (API 29) or higher
- ✅ Device manufacturer must support call recording
- ✅ Device must not have call recording disabled in firmware

### Supported Manufacturers
Most modern Android devices support this, including:
- ✅ Google Pixel (Android 10+)
- ✅ Samsung Galaxy (Android 10+, some models)
- ✅ OnePlus (Android 10+)
- ✅ Xiaomi/Redmi (Android 10+, MIUI 12+)
- ✅ Realme (Android 10+)
- ⚠️ Some manufacturers may disable this feature

## Installation Steps

### 1. Rebuild the Android App

The native code has changed, so you need to rebuild:

```bash
cd EducationCRM/android
./gradlew clean
cd ..
npx react-native run-android
```

Or if using release build:
```bash
cd EducationCRM/android
./gradlew clean
./gradlew assembleRelease
```

### 2. Reinstall the App

**Important**: You must completely uninstall and reinstall the app for the changes to take effect.

```bash
# Uninstall old version
adb uninstall com.educationcrm

# Install new version
adb install android/app/build/outputs/apk/release/app-release.apk
```

Or simply:
```bash
npx react-native run-android
```

### 3. Grant Permissions

When you first run the app and try to make a call:
1. App will request **Phone** permission → Grant it
2. App will request **Microphone** permission → Grant it
3. App will request **Audio Recording** permission → Grant it

## Testing Call Recording

### Test 1: Basic Recording Test

1. Open the app
2. Navigate to a lead
3. Tap the phone icon to make a call
4. Wait 2 seconds for recording to start
5. Speak during the call
6. End the call
7. Return to the app
8. Check the recording:
   - Duration should match actual call time
   - Playback should include both sides of conversation

### Test 2: Check Logs

While testing, monitor logs to see which audio source is being used:

```bash
adb logcat | grep AudioRecorder
```

You should see:
```
AudioRecorder: Using VOICE_CALL audio source (Android 10+)
```

If you see:
```
AudioRecorder: Using MIC audio source (Android < 10)
```
Your device is running Android 9 or lower.

### Test 3: Verify Recording Quality

After making a test call:
1. Go to lead details
2. Find the call in "Call Recordings" section
3. Tap "Play Recording"
4. Listen for:
   - ✅ Your voice (outgoing audio)
   - ✅ Other person's voice (incoming audio)
   - ✅ Clear audio quality
   - ✅ Correct duration

## Troubleshooting

### Issue 1: Recording Still Only Captures Microphone

**Symptoms:**
- Only your voice is recorded
- Other person's voice is not captured
- Recording sounds like speakerphone

**Possible Causes:**

1. **Device doesn't support VOICE_CALL**
   ```bash
   # Check Android version
   adb shell getprop ro.build.version.sdk
   # Should be 29 or higher (Android 10+)
   ```

2. **Manufacturer disabled call recording**
   - Some manufacturers (especially in certain regions) disable this feature
   - Check device settings for built-in call recording feature
   - If device has built-in call recording, our app should work too

3. **App not rebuilt properly**
   ```bash
   # Clean and rebuild
   cd EducationCRM/android
   ./gradlew clean
   cd ..
   npx react-native run-android
   ```

4. **Old app version still installed**
   ```bash
   # Completely uninstall and reinstall
   adb uninstall com.educationcrm
   npx react-native run-android
   ```

### Issue 2: Recording Fails to Start

**Symptoms:**
- Error message when trying to record
- No recording file created

**Solutions:**

1. **Check permissions**
   ```bash
   adb shell dumpsys package com.educationcrm | grep permission
   ```
   Should show:
   - `android.permission.RECORD_AUDIO: granted=true`
   - `android.permission.CALL_PHONE: granted=true`

2. **Check logs for errors**
   ```bash
   adb logcat | grep -E "AudioRecorder|RECORDING_ERROR"
   ```

3. **Verify storage space**
   ```bash
   adb shell df /data
   ```

### Issue 3: Recording Duration Still Incorrect

**Symptoms:**
- Duration shows more than actual call time
- Recording starts before call connects

**Solution:**

The recording now starts 2 seconds after call initiation. If duration is still wrong:

1. **Check if recording started too early**
   - Look at logs for "Recording started" timestamp
   - Compare with "App went to background" timestamp

2. **Adjust delay in code**
   - Edit `CallRecordingManager.ts`
   - Change `setTimeout` delay from 2000ms to 3000ms or 4000ms

### Issue 4: No Audio in Recording

**Symptoms:**
- Recording file exists
- Duration is correct
- But playback has no audio or very quiet audio

**Solutions:**

1. **Check if call was on speakerphone**
   - VOICE_CALL works best with regular earpiece
   - Try recording with phone to ear (not speakerphone)

2. **Check device audio settings**
   - Some devices have "Call recording" toggle in settings
   - Enable it if available

3. **Test with different phone numbers**
   - Some carriers may block call recording
   - Test with different numbers

### Issue 5: Permission Denied Error

**Symptoms:**
- Error: "Failed to start recording (Permission denied)"

**Solutions:**

1. **Manually grant permissions**
   ```bash
   adb shell pm grant com.educationcrm android.permission.RECORD_AUDIO
   adb shell pm grant com.educationcrm android.permission.CALL_PHONE
   ```

2. **Check app settings**
   - Go to: Settings → Apps → Education CRM → Permissions
   - Ensure all permissions are granted

3. **Reinstall app**
   - Uninstall completely
   - Reinstall and grant permissions when prompted

## Device-Specific Notes

### Samsung Devices
- Usually work well with VOICE_CALL
- May need to enable "Record calls" in Phone app settings
- Some regions have this disabled by law

### Xiaomi/Redmi (MIUI)
- MIUI 12+ supports call recording
- Enable in: Phone app → Settings → Call recording
- May need to disable "Call recording announcement"

### OnePlus (OxygenOS)
- Generally good support
- Check: Phone app → Settings → Call recording

### Google Pixel
- Excellent support on Android 10+
- Built-in call recording in Phone app
- Our app should work seamlessly

### Realme (Realme UI)
- Good support on Android 10+
- Enable in Phone app settings

## Legal Compliance

### Important Legal Notes

1. **Two-Party Consent**
   - Many jurisdictions require consent from both parties
   - Add consent notification in your app
   - Consider adding beep sound during recording

2. **Notification Requirement**
   - Some regions require audible notification
   - Consider adding periodic beep or announcement

3. **Data Storage**
   - Ensure recordings are stored securely
   - Implement data retention policies
   - Provide way for users to delete recordings

### Recommended Implementation

Add a consent dialog before first recording:

```typescript
Alert.alert(
  'Call Recording Notice',
  'This call will be recorded for quality and training purposes. By continuing, you consent to this recording.',
  [
    { text: 'Cancel', style: 'cancel' },
    { text: 'I Consent', onPress: () => startRecording() }
  ]
);
```

## Performance Tips

### Optimize Recording Quality

1. **Adjust bitrate based on needs**
   - Low quality: 32 kbps (smaller files)
   - Medium quality: 64 kbps (balanced)
   - High quality: 128 kbps (larger files)

2. **Use appropriate sample rate**
   - Voice calls: 16000 Hz (sufficient)
   - High quality: 44100 Hz (overkill for calls)

3. **Monitor storage usage**
   - Implement automatic cleanup of old recordings
   - Compress recordings after upload

### Battery Optimization

1. **Stop recording promptly**
   - Don't leave recorder running
   - Clean up resources immediately

2. **Upload in background**
   - Use WorkManager for uploads
   - Don't block UI thread

## Verification Checklist

Before deploying to production:

- [ ] Test on multiple device models
- [ ] Verify both sides of call are recorded
- [ ] Check recording duration accuracy
- [ ] Test with different call scenarios (incoming/outgoing)
- [ ] Verify upload functionality
- [ ] Test playback on different devices
- [ ] Check storage usage
- [ ] Verify permissions are requested properly
- [ ] Test error handling
- [ ] Ensure legal compliance (consent, notifications)

## Alternative: Server-Side Recording

If device-side recording proves unreliable, consider server-side VoIP recording:

### Twilio Implementation

```typescript
// Make call through Twilio
const call = await twilioClient.calls.create({
  to: phoneNumber,
  from: twilioNumber,
  record: true,
  recordingStatusCallback: 'https://your-server.com/recording-callback',
  recordingChannels: 'dual' // Records both sides separately
});
```

**Benefits:**
- 100% reliable across all devices
- Better quality
- Automatic transcription available
- Legal compliance features built-in
- Works on iOS too

**Costs:**
- ~$0.01 per minute for calls
- ~$0.0025 per minute for recording
- Storage costs

## Support

If you encounter issues:

1. **Check logs**
   ```bash
   adb logcat | grep -E "AudioRecorder|CallRecording|RecordingService"
   ```

2. **Verify device compatibility**
   - Android version: `adb shell getprop ro.build.version.sdk`
   - Manufacturer: `adb shell getprop ro.product.manufacturer`
   - Model: `adb shell getprop ro.product.model`

3. **Test with built-in recorder**
   - If device has built-in call recording, it should work
   - If built-in doesn't work, our app won't either

4. **Consider VoIP alternative**
   - For production reliability, use Twilio/Plivo
   - Guaranteed to work on all devices
