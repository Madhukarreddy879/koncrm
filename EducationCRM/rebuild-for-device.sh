#!/bin/bash

# Quick rebuild script for physical device testing
# This rebuilds the APK with the correct backend URL

echo "🔧 Rebuilding APK for Physical Device Testing"
echo "=============================================="
echo ""

# Get computer's IP
COMPUTER_IP=$(hostname -I | awk '{print $1}')
echo "📍 Your computer's IP: $COMPUTER_IP"
echo ""

# Check if backend is running
echo "🔍 Checking if backend is running..."
if curl -s -o /dev/null -w "%{http_code}" http://$COMPUTER_IP:4000/api/health | grep -q "200\|404"; then
    echo "✅ Backend is accessible at http://$COMPUTER_IP:4000"
else
    echo "⚠️  WARNING: Backend not accessible at http://$COMPUTER_IP:4000"
    echo "   Make sure your Phoenix backend is running!"
    echo "   Run: mix phx.server"
    echo ""
    read -p "Continue anyway? (y/n) " -n 1 -r
    echo ""
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        exit 1
    fi
fi

echo ""
echo "🧹 Cleaning previous build..."
cd android
./gradlew clean

echo ""
echo "🔨 Building release APK..."
echo "   This will take 5-10 minutes..."
./gradlew assembleRelease

if [ $? -eq 0 ]; then
    echo ""
    echo "✅ Build successful!"
    echo ""
    echo "📦 APK Location:"
    echo "   android/app/build/outputs/apk/release/app-release.apk"
    echo ""
    
    # Get APK size
    APK_SIZE=$(du -h app/build/outputs/apk/release/app-release.apk | cut -f1)
    echo "📊 APK Size: $APK_SIZE"
    echo ""
    
    echo "📱 Next steps:"
    echo "   1. Connect your phone via USB"
    echo "   2. Run: adb devices (to verify connection)"
    echo "   3. Run: adb uninstall com.educationcrm (if already installed)"
    echo "   4. Run: adb install app/build/outputs/apk/release/app-release.apk"
    echo ""
    echo "🌐 Backend URL configured: http://$COMPUTER_IP:4000/api"
    echo ""
    
    # Ask if user wants to install now
    read -p "Install on connected device now? (y/n) " -n 1 -r
    echo ""
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        echo ""
        echo "📲 Installing on device..."
        
        # Check if device is connected
        if adb devices | grep -q "device$"; then
            # Uninstall old version
            echo "🗑️  Uninstalling old version..."
            adb uninstall com.educationcrm 2>/dev/null
            
            # Install new version
            echo "📥 Installing new version..."
            adb install app/build/outputs/apk/release/app-release.apk
            
            if [ $? -eq 0 ]; then
                echo ""
                echo "✅ Installation successful!"
                echo "🎉 Open EducationCRM app on your phone and test!"
            else
                echo ""
                echo "❌ Installation failed. Try manually:"
                echo "   adb install app/build/outputs/apk/release/app-release.apk"
            fi
        else
            echo "❌ No device connected. Connect your phone and run:"
            echo "   adb install app/build/outputs/apk/release/app-release.apk"
        fi
    fi
else
    echo ""
    echo "❌ Build failed! Check the errors above."
    exit 1
fi
