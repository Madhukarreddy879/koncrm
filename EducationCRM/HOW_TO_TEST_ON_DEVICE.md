# How to Test on Physical Device - Simple Guide

## Method 1: Using USB Cable (Recommended - Easiest)

### Step 1: Enable Developer Options on Your Phone

1. **Open Settings** on your Android phone
2. **Scroll down to "About Phone"** (or "About Device")
3. **Find "Build Number"** (might be under "Software Information")
4. **Tap "Build Number" 7 times** rapidly
5. You'll see a message: "You are now a developer!"

### Step 2: Enable USB Debugging

1. **Go back to Settings**
2. **Find "Developer Options"** (usually near the bottom)
3. **Turn on "Developer Options"** (toggle at top)
4. **Scroll down and enable "USB Debugging"**
5. **Also enable "Install via USB"** (if available)

### Step 3: Connect Phone to Computer

1. **Connect your phone to computer** using USB cable
2. **On your phone**, you'll see a popup: "Allow USB debugging?"
3. **Check "Always allow from this computer"**
4. **Tap "OK"**

### Step 4: Verify Connection

Open terminal and run:
```bash
adb devices
```

You should see something like:
```
List of devices attached
ABC123XYZ    device
```

If you see "unauthorized", check your phone for the USB debugging popup.

### Step 5: Install the APK

Run this command:
```bash
adb install EducationCRM/android/app/build/outputs/apk/release/app-release.apk
```

**Wait for:** "Success" message (takes 10-30 seconds)

### Step 6: Launch the App

1. **Look for "EducationCRM" icon** on your phone
2. **Tap to open**
3. **Grant permissions** when asked (Phone, Microphone, etc.)
4. **Try logging in** with your credentials

---

## Method 2: Without USB Cable (Wireless)

### Option A: Using File Transfer

1. **Copy APK to your computer's shared folder** or upload to Google Drive/Dropbox
2. **On your phone:**
   - Open Google Drive/Dropbox app
   - Download the APK file
   - Tap the downloaded APK
   - If prompted, go to Settings → Security → Enable "Install Unknown Apps"
   - Tap "Install"

### Option B: Using Email

1. **Email the APK to yourself**
   - Attach: `EducationCRM/android/app/build/outputs/apk/release/app-release.apk`
2. **On your phone:**
   - Open the email
   - Download the attachment
   - Tap to install
   - Enable "Install Unknown Apps" if prompted

### Option C: Using ADB over WiFi (Advanced)

1. **First connect via USB** (follow Method 1 steps 1-4)
2. **Make sure phone and computer are on same WiFi**
3. **Run these commands:**
   ```bash
   # Get phone's IP address
   adb shell ip addr show wlan0 | grep inet
   
   # Enable TCP/IP mode
   adb tcpip 5555
   
   # Disconnect USB cable
   
   # Connect wirelessly (replace with your phone's IP)
   adb connect 192.168.1.XXX:5555
   
   # Now install
   adb install EducationCRM/android/app/build/outputs/apk/release/app-release.apk
   ```

---

## Troubleshooting

### Problem: "adb: command not found"

**Solution:**
```bash
# Check if Android SDK is installed
which adb

# If not found, you need to install Android SDK or use Method 2
```

### Problem: "No devices found"

**Solutions:**
1. Check USB cable is connected properly
2. Check USB debugging is enabled on phone
3. Try a different USB cable (some cables are charge-only)
4. Try a different USB port on computer
5. Restart ADB: `adb kill-server` then `adb start-server`

### Problem: "Device unauthorized"

**Solution:**
1. Check your phone screen for USB debugging popup
2. Tap "Always allow" and "OK"
3. If popup doesn't appear, disable and re-enable USB debugging

### Problem: "INSTALL_FAILED_UPDATE_INCOMPATIBLE"

**Solution:**
```bash
# Uninstall old version first
adb uninstall com.educationcrm

# Then install again
adb install EducationCRM/android/app/build/outputs/apk/release/app-release.apk
```

### Problem: "App won't install from file"

**Solution:**
1. Go to **Settings → Security**
2. Enable **"Install Unknown Apps"** or **"Unknown Sources"**
3. Select your browser/file manager and allow it
4. Try installing again

### Problem: "Insufficient storage"

**Solution:**
- Free up at least 200MB space on your phone
- Delete unused apps or clear cache

---

## Quick Testing Checklist

Once installed, test these quickly:

### 1. Launch (30 seconds)
- [ ] App opens without crash
- [ ] Login screen appears
- [ ] UI looks correct

### 2. Login (1 minute)
- [ ] Enter username and password
- [ ] Tap login button
- [ ] Successfully logs in
- [ ] Navigates to lead list

### 3. Basic Features (5 minutes)
- [ ] Lead list loads
- [ ] Can search leads
- [ ] Can open a lead
- [ ] Can tap phone number (opens dialer)
- [ ] Can see follow-ups
- [ ] Can see stats

### 4. Critical Test (2 minutes)
- [ ] Make a test call
- [ ] Try recording (may not work on Android 10+)
- [ ] Add a note to a lead
- [ ] Mark a follow-up complete

**If all above work → App is ready! ✅**

---

## Viewing Logs (If Something Goes Wrong)

### While phone is connected via USB:

```bash
# View all logs
adb logcat

# View only app logs
adb logcat | grep -i "educationcrm"

# Save logs to file
adb logcat > app_logs.txt
```

### To clear app data and start fresh:

```bash
adb shell pm clear com.educationcrm
```

---

## Multiple Devices Testing

### To test on multiple phones:

1. **Connect all phones via USB**
2. **Check connected devices:**
   ```bash
   adb devices
   ```
   
3. **Install on specific device:**
   ```bash
   # List devices first
   adb devices
   
   # Install on specific device (use device ID from above)
   adb -s ABC123XYZ install EducationCRM/android/app/build/outputs/apk/release/app-release.apk
   ```

---

## Testing on Different Android Versions

### Recommended Test Devices:

1. **Android 8 or 9** (older device)
   - Tests backward compatibility
   - Call recording should work

2. **Android 10 or 11** (mid-range)
   - Tests call recording limitations
   - Most common version

3. **Android 12+** (newer device)
   - Tests latest features
   - Scoped storage

### What to Check on Each:

- [ ] App installs successfully
- [ ] All permissions granted properly
- [ ] Call recording works (or shows limitation message)
- [ ] Performance is acceptable
- [ ] No crashes

---

## Quick Commands Reference

```bash
# Install APK
adb install EducationCRM/android/app/build/outputs/apk/release/app-release.apk

# Reinstall (keep data)
adb install -r EducationCRM/android/app/build/outputs/apk/release/app-release.apk

# Uninstall
adb uninstall com.educationcrm

# Clear app data
adb shell pm clear com.educationcrm

# View logs
adb logcat | grep -i "educationcrm"

# Check if device connected
adb devices

# Restart ADB
adb kill-server && adb start-server
```

---

## Video Recording Test Session (Optional)

To record your testing session:

```bash
# Start recording phone screen
adb shell screenrecord /sdcard/test_recording.mp4

# Do your testing...

# Stop recording (Ctrl+C)

# Pull video to computer
adb pull /sdcard/test_recording.mp4 ./test_recording.mp4
```

---

## Need Help?

### Common Questions:

**Q: How long does installation take?**
A: Usually 10-30 seconds via USB, 1-2 minutes via file transfer.

**Q: Do I need to uninstall the debug version first?**
A: Yes, if you have a debug version installed, uninstall it first.

**Q: Can I test without a computer?**
A: Yes! Use Method 2 (file transfer, email, or cloud storage).

**Q: Will this delete my data?**
A: No, unless you uninstall the app. Reinstalling keeps data.

**Q: Can I share this APK with my team?**
A: Yes! Just send them the APK file and they can install it.

---

## Success! What's Next?

Once you've tested and everything works:

1. ✅ Document any issues found
2. ✅ Test on at least 2-3 different devices
3. ✅ Test on different Android versions
4. ✅ Share APK with team for wider testing
5. ✅ Collect feedback
6. ✅ Fix any critical bugs
7. ✅ Prepare for production release

---

## Pro Tips

1. **Keep USB Debugging On** during testing for easy log access
2. **Test with Real Data** - use actual phone numbers and leads
3. **Test in Real Conditions** - try with poor network, low battery, etc.
4. **Take Screenshots** of any bugs you find
5. **Test Calls** with real phone numbers to verify call logging
6. **Test Recording** in a quiet place to check audio quality

---

## Emergency: App Crashes Immediately

If app crashes on launch:

1. **Check logs:**
   ```bash
   adb logcat | grep -E "AndroidRuntime|FATAL"
   ```

2. **Clear app data:**
   ```bash
   adb shell pm clear com.educationcrm
   ```

3. **Reinstall:**
   ```bash
   adb uninstall com.educationcrm
   adb install EducationCRM/android/app/build/outputs/apk/release/app-release.apk
   ```

4. **Check Android version** - must be 7.0 or higher

5. **Check available storage** - need at least 200MB free

---

**Ready to test? Start with Method 1 (USB Cable) - it's the easiest!** 🚀
