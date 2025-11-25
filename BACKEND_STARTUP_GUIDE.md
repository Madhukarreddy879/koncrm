# Backend Startup Guide for Mobile Testing

## ✅ Configuration Fixed!

I've updated your backend configuration to accept network connections from your phone.

**Changed in `config/dev.exs`:**
```elixir
# Before (only localhost):
http: [ip: {127, 0, 0, 1}, port: 4000]

# After (accepts network connections):
http: [ip: {0, 0, 0, 0}, port: 4000]
```

---

## 🚀 Start Your Backend

### Option 1: Use the Automated Script (Recommended)

```bash
./start-backend-for-mobile.sh
```

This script will:
- Show your current IP address
- Check configuration
- Install dependencies if needed
- Set up database
- Start Phoenix server

### Option 2: Manual Start

```bash
# Install dependencies (first time only)
mix deps.get

# Set up database (first time only)
mix ecto.create
mix ecto.migrate

# Start server
mix phx.server
```

---

## 📍 Your Current Network Info

**Your Computer's IP:** `10.138.166.68`

**Backend will be accessible at:**
- From computer: `http://localhost:4000`
- From phone: `http://10.138.166.68:4000`

**Mobile app API URL:** `http://10.138.166.68:4000/api`

---

## ✅ Verify Backend is Running

### Test 1: From Your Computer

Open a new terminal and run:
```bash
curl http://10.138.166.68:4000/api/health
```

Or open in browser:
```
http://10.138.166.68:4000
```

### Test 2: From Your Phone's Browser

Before installing the app, test in your phone's browser:

1. Make sure phone is on **same WiFi** as computer
2. Open Chrome/Safari on phone
3. Go to: `http://10.138.166.68:4000`
4. You should see the Phoenix welcome page

**If this works, the mobile app will work too!**

---

## 🔍 What You Should See

When backend starts successfully:

```
[info] Running EducationCrmWeb.Endpoint with Bandit 1.x.x at 0.0.0.0:4000 (http)
[info] Access EducationCrmWeb.Endpoint at http://localhost:4000
[watch] build finished, watching for changes...
```

**Key indicator:** `at 0.0.0.0:4000` (not `127.0.0.1:4000`)

---

## 🐛 Troubleshooting

### Problem: "Address already in use"

Another process is using port 4000.

**Solution:**
```bash
# Find what's using port 4000
sudo lsof -i :4000

# Kill it (replace PID with actual process ID)
kill -9 PID

# Or use a different port
PORT=4001 mix phx.server
```

### Problem: "Database does not exist"

**Solution:**
```bash
mix ecto.create
mix ecto.migrate
```

### Problem: Can't access from phone

**Checklist:**
- [ ] Backend is running
- [ ] Phone on same WiFi as computer
- [ ] Using correct IP: `10.138.166.68`
- [ ] Firewall allows port 4000 (yours is inactive, so OK)
- [ ] Backend config has `ip: {0, 0, 0, 0}`

**Test from phone's browser first:**
```
http://10.138.166.68:4000
```

### Problem: IP address changed

Your IP might change if you reconnect to WiFi.

**Check current IP:**
```bash
hostname -I | awk '{print $1}'
```

**Update mobile app .env:**
```bash
echo "API_BASE_URL=http://NEW_IP:4000/api" > EducationCRM/.env
```

Then rebuild APK.

---

## 📱 Next Steps After Backend is Running

1. **Verify backend is accessible:**
   ```bash
   curl http://10.138.166.68:4000/api/health
   ```

2. **Rebuild mobile APK** (if not done yet):
   ```bash
   cd EducationCRM/android
   ./gradlew clean assembleRelease
   ```

3. **Install on phone:**
   ```bash
   adb install app/build/outputs/apk/release/app-release.apk
   ```

4. **Test the app!**

---

## 🔒 Security Note

**For Development Only:**

The configuration `ip: {0, 0, 0, 0}` allows any device on your network to access the backend. This is fine for development/testing.

**For Production:**

- Use proper authentication
- Enable HTTPS
- Use environment-specific configs
- Consider using a reverse proxy

---

## 💡 Pro Tips

### Keep Backend Running

Use `tmux` or `screen` to keep backend running in background:

```bash
# Install tmux
sudo apt install tmux

# Start tmux session
tmux new -s backend

# Run backend
mix phx.server

# Detach: Press Ctrl+B, then D
# Reattach: tmux attach -t backend
```

### Watch Logs

In another terminal:
```bash
tail -f _build/dev/lib/education_crm/priv/log/dev.log
```

### Test API Endpoints

```bash
# Health check
curl http://10.138.166.68:4000/api/health

# Login test
curl -X POST http://10.138.166.68:4000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"telecaller1","password":"password123"}'

# Get leads (with token)
curl http://10.138.166.68:4000/api/leads \
  -H "Authorization: Bearer YOUR_TOKEN"
```

---

## ✅ Quick Checklist

Before testing mobile app:

- [ ] Backend config updated (`ip: {0, 0, 0, 0}`)
- [ ] Dependencies installed (`mix deps.get`)
- [ ] Database created (`mix ecto.create`)
- [ ] Migrations run (`mix ecto.migrate`)
- [ ] Backend started (`mix phx.server`)
- [ ] Accessible from computer: `curl http://10.138.166.68:4000`
- [ ] Accessible from phone browser: `http://10.138.166.68:4000`
- [ ] Mobile app .env has correct IP
- [ ] Mobile APK rebuilt with new config

---

## 🚀 Ready to Start?

Run this command:
```bash
./start-backend-for-mobile.sh
```

Then verify it's accessible from your phone's browser before installing the app!
