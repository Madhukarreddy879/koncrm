# Environment Configuration Quick Start

## First Time Setup

1. **Copy the example environment file:**
   ```bash
   cp .env.example .env
   ```

2. **Update the API URL in `.env`:**
   - For Android Emulator: `API_BASE_URL=http://10.0.2.2:4000/api`
   - For Physical Device: `API_BASE_URL=http://YOUR_IP:4000/api`

3. **Run the app:**
   ```bash
   npx react-native run-android
   ```

## Switching Environments

### Development
```bash
ENVFILE=.env.development npx react-native run-android
```

### Production
```bash
ENVFILE=.env.production npx react-native run-android --variant=release
```

## Finding Your Computer's IP Address

### Linux
```bash
ip addr show | grep "inet " | grep -v 127.0.0.1
```

### macOS
```bash
ifconfig | grep "inet " | grep -v 127.0.0.1
```

### Windows
```bash
ipconfig | findstr IPv4
```

## Troubleshooting

**Problem:** Environment variables not loading

**Solution:**
```bash
cd android && ./gradlew clean && cd ..
npx react-native run-android
```

**Problem:** Cannot connect to API

**Solution:**
- Check backend is running: `curl http://localhost:4000/api`
- Verify firewall allows connections
- For emulator, use `10.0.2.2` not `localhost`
- For device, ensure same WiFi network

## Verification

Check the Metro bundler logs when the app starts. You should see:
```
[App] Environment Configuration: { API_BASE_URL: 'http://10.0.2.2:4000/api' }
```

For detailed documentation, see [ENVIRONMENT_SETUP.md](./ENVIRONMENT_SETUP.md)
