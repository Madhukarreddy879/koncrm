# Environment Configuration Guide

This guide explains how to configure environment variables for the Education CRM mobile app.

## Overview

The app uses `react-native-config` to manage environment-specific configuration. This allows you to easily switch between development, staging, and production environments.

## Environment Files

The following environment files are available:

- `.env` - Default environment (used if no specific environment is selected)
- `.env.development` - Development environment configuration
- `.env.production` - Production environment configuration
- `.env.example` - Template file showing required variables

## Setup Instructions

### 1. Create Your Environment File

Copy the example file to create your local environment configuration:

```bash
cp .env.example .env
```

### 2. Configure API Base URL

Update the `API_BASE_URL` in your `.env` file:

**For Android Emulator:**
```
API_BASE_URL=http://10.0.2.2:4000/api
```

**For Physical Android Device:**
```
API_BASE_URL=http://YOUR_COMPUTER_IP:4000/api
```
Replace `YOUR_COMPUTER_IP` with your computer's local IP address (e.g., `192.168.1.100`)

**For Production:**
```
API_BASE_URL=https://api.educationcrm.com/api
```

### 3. Using Different Environments

#### Development Build
```bash
# Uses .env.development
ENVFILE=.env.development npx react-native run-android
```

#### Production Build
```bash
# Uses .env.production
ENVFILE=.env.production npx react-native run-android --variant=release
```

#### Default Build
```bash
# Uses .env
npx react-native run-android
```

## Accessing Environment Variables in Code

Import and use environment variables in your TypeScript/JavaScript code:

```typescript
import Config from 'react-native-config';

const apiUrl = Config.API_BASE_URL;
console.log('API URL:', apiUrl);
```

## Android Configuration

The environment variables are automatically integrated into the Android build through the `build.gradle` configuration. No additional setup is required.

## Security Notes

1. **Never commit `.env` files to version control** - They are already added to `.gitignore`
2. Keep `.env.example` updated with all required variables (without sensitive values)
3. For production builds, ensure sensitive values are properly secured
4. Use different API keys/secrets for each environment

## Troubleshooting

### Environment variables not loading

1. Clean the build:
   ```bash
   cd android && ./gradlew clean && cd ..
   ```

2. Rebuild the app:
   ```bash
   npx react-native run-android
   ```

### Cannot connect to API from emulator

- Ensure you're using `10.0.2.2` instead of `localhost` or `127.0.0.1`
- Check that your backend server is running on port 4000
- Verify firewall settings aren't blocking the connection

### Cannot connect to API from physical device

- Ensure your phone and computer are on the same network
- Use your computer's local IP address (not localhost)
- Check that your backend server is accessible from the network
- Verify firewall settings allow incoming connections

## Adding New Environment Variables

1. Add the variable to all environment files (`.env`, `.env.development`, `.env.production`)
2. Add the variable to `.env.example` with a placeholder value
3. Access the variable in code using `Config.VARIABLE_NAME`
4. Rebuild the app to apply changes

## Build Variants

For production builds with different configurations:

```bash
# Debug build with development config
ENVFILE=.env.development npx react-native run-android

# Release build with production config
ENVFILE=.env.production npx react-native run-android --variant=release
```
