# Backend Connection Setup for Physical Device

## 🚨 Important: Current Issue

Your APK was built with this URL:
```
API_BASE_URL=http://10.0.2.2:4000/api
```

**Problem:** `10.0.2.2` only works for Android **emulator**, NOT physical devices!

For physical devices, you need your computer's actual IP address.

---

## ✅ Solution: Rebuild with Correct URL

### Step 1: Find Your Computer's IP Address

**Your computer's IP:** `10.18.82.68`

To verify or find it again:
```bash
# On Linux
hostname -I | awk '{print $1}'

# Or
ip addr show | grep "inet " | grep -v 127.0.0.1
```

### Step 2: Update .env File

Edit `EducationCRM/.env` and change the URL:

**Current (WRONG for physical device):**
```env
API_BASE_URL=http://10.0.2.2:4000/api
```

**Change to (CORRECT for physical device):**
```env
API_BASE_URL=http://10.18.82.68:4000/api
```

### Step 3: Rebuild the APK

After updating `.env`, rebuild:

```bash
cd EducationCRM/android
./gradlew clean
./gradlew assembleRelease
```

This will take about 5-10 minutes (faster than first build).

### Step 4: Reinstall on Device

```bash
# Uninstall old version
adb uninstall com.educationcrm

# Install new version
adb install android/app/build/outputs/apk/release/app-release.apk
```

---

## 🔍 How to Verify Backend Connection

### Check 1: Backend is Running

Make sure your Phoenix backend is running on port 4000:

```bash
# In your backend directory
mix phx.server
```

You should see:
```
[info] Running EducationCrmWeb.Endpoint with Bandit 1.x.x at 0.0.0.0:4000 (http)
```

### Check 2: Backend is Accessible from Network

Test if your backend is accessible from your network:

```bash
# From your computer
curl http://10.18.82.68:4000/api/health

# Or test the login endpoint
curl -X POST http://10.18.82.68:4000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"test","password":"test"}'
```

### Check 3: Firewall Allows Connections

Make sure your firewall allows connections on port 4000:

```bash
# Check if port is listening
sudo netstat -tlnp | grep 4000

# Or
sudo ss -tlnp | grep 4000
```

If you have a firewall, allow port 4000:

```bash
# UFW (Ubuntu)
sudo ufw allow 4000/tcp

# Firewalld (Fedora/CentOS)
sudo firewall-cmd --add-port=4000/tcp --permanent
sudo firewall-cmd --reload
```

---

## 📱 Different Scenarios

### Scenario 1: Testing on Physical Device (Current)

**Phone and computer on same WiFi network**

```env
# Use your computer's local IP
API_BASE_URL=http://10.18.82.68:4000/api
```

**Requirements:**
- ✅ Phone connected to same WiFi as computer
- ✅ Backend running on computer
- ✅ Firewall allows port 4000
- ✅ Computer IP is 10.18.82.68 (verify with `hostname -I`)

### Scenario 2: Testing on Android Emulator

```env
# Special IP that emulator uses to reach host
API_BASE_URL=http://10.0.2.2:4000/api
```

### Scenario 3: Production Deployment

```env
# Use your production server URL
API_BASE_URL=https://api.educationcrm.com/api
```

**Requirements:**
- ✅ Backend deployed to production server
- ✅ HTTPS enabled (required for production)
- ✅ Domain configured
- ✅ SSL certificate installed

### Scenario 4: Testing with Mobile Data (Not on WiFi)

**Option A: Use ngrok (Recommended for testing)**

```bash
# Install ngrok: https://ngrok.com/download

# Start ngrok tunnel
ngrok http 4000
```

You'll get a URL like: `https://abc123.ngrok.io`

Update `.env`:
```env
API_BASE_URL=https://abc123.ngrok.io/api
```

**Option B: Use your public IP (if you have one)**

Find your public IP:
```bash
curl ifconfig.me
```

Configure port forwarding on your router for port 4000, then:
```env
API_BASE_URL=http://YOUR_PUBLIC_IP:4000/api
```

---

## 🔧 Backend Configuration for Network Access

### Phoenix Config (config/dev.exs)

Make sure your Phoenix backend accepts connections from network:

```elixir
config :education_crm, EducationCrmWeb.Endpoint,
  http: [ip: {0, 0, 0, 0}, port: 4000],  # Listen on all interfaces
  debug_errors: true,
  code_reloader: true,
  check_origin: false,  # Allow requests from mobile app
  watchers: []
```

### CORS Configuration

If you get CORS errors, add to your backend:

```elixir
# In your router pipeline
pipeline :api do
  plug :accepts, ["json"]
  plug CORSPlug, origin: "*"  # For development only!
end
```

---

## 🧪 Testing the Connection

### Test 1: From Your Computer

```bash
# Test health endpoint
curl http://10.18.82.68:4000/api/health

# Test login endpoint
curl -X POST http://10.18.82.68:4000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"telecaller1","password":"password123"}'
```

### Test 2: From Your Phone's Browser

Before installing the app, test in your phone's browser:

1. Open Chrome/Safari on your phone
2. Go to: `http://10.18.82.68:4000/api/health`
3. You should see a response (not an error)

If this doesn't work, the app won't work either!

### Test 3: Check App Logs

After installing the app, check logs while testing:

```bash
adb logcat | grep -E "API|Network|axios"
```

Look for:
- ✅ "API request to http://10.18.82.68:4000/api/..."
- ❌ "Network Error" or "Connection refused"

---

## 🐛 Troubleshooting

### Problem: "Network Error" in App

**Possible causes:**
1. Backend not running
2. Wrong IP address in .env
3. Phone not on same WiFi
4. Firewall blocking port 4000
5. Backend not listening on 0.0.0.0

**Solutions:**
```bash
# 1. Check backend is running
curl http://10.18.82.68:4000/api/health

# 2. Verify IP address
hostname -I

# 3. Check phone WiFi (same network as computer)

# 4. Allow firewall
sudo ufw allow 4000/tcp

# 5. Check backend config (should have ip: {0, 0, 0, 0})
```

### Problem: "Connection Refused"

**Backend not listening on network interface**

Fix in `config/dev.exs`:
```elixir
http: [ip: {0, 0, 0, 0}, port: 4000]  # Not {127, 0, 0, 1}
```

Restart backend after changing.

### Problem: "Timeout"

**Firewall is blocking**

```bash
# Check if port is open
telnet 10.18.82.68 4000

# If it doesn't connect, allow in firewall
sudo ufw allow 4000/tcp
```

### Problem: CORS Error

**Backend rejecting requests**

Add to backend router:
```elixir
plug CORSPlug, origin: "*"
```

Or configure properly:
```elixir
plug CORSPlug, 
  origin: ["http://localhost:8081", "http://10.18.82.68:4000"],
  credentials: true
```

---

## 📋 Quick Checklist

Before testing on physical device:

- [ ] Backend is running (`mix phx.server`)
- [ ] Backend listening on 0.0.0.0:4000 (not 127.0.0.1)
- [ ] Computer IP is correct (run `hostname -I`)
- [ ] `.env` file updated with correct IP
- [ ] APK rebuilt after .env change
- [ ] Firewall allows port 4000
- [ ] Phone on same WiFi as computer
- [ ] Can access backend from phone's browser

---

## 🚀 Quick Fix Commands

```bash
# 1. Get your IP
hostname -I

# 2. Update .env (replace with your IP)
echo "API_BASE_URL=http://10.18.82.68:4000/api" > EducationCRM/.env

# 3. Rebuild APK
cd EducationCRM/android
./gradlew clean assembleRelease

# 4. Reinstall on device
adb uninstall com.educationcrm
adb install app/build/outputs/apk/release/app-release.apk

# 5. Test backend from phone's browser
# Open: http://10.18.82.68:4000/api/health
```

---

## 💡 Pro Tips

1. **Use ngrok for easy testing** - No firewall or network config needed
2. **Test backend URL in phone's browser first** - Before installing app
3. **Keep backend logs visible** - Watch for incoming requests
4. **Use static IP** - Or your IP might change and break connection
5. **For production** - Always use HTTPS, never HTTP

---

## 📞 Need Help?

Common issues:
- Backend not accessible → Check firewall and backend config
- Wrong IP → Verify with `hostname -I`
- CORS errors → Add CORSPlug to backend
- Timeout → Check network connectivity

**Next steps:** Update your .env file and rebuild the APK!
