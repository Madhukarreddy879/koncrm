#!/bin/bash

# Setup Android SDK without Android Studio
# For Education CRM Mobile App

set -e

echo "🚀 Setting up Android SDK (without Android Studio)..."
echo ""

# Create SDK directory
echo "📁 Creating Android SDK directory..."
mkdir -p ~/Android/Sdk
cd ~/Android/Sdk

# Download command line tools
echo "⬇️  Downloading Android command line tools..."
wget -q --show-progress https://dl.google.com/android/repository/commandlinetools-linux-9477386_latest.zip

# Extract
echo "📦 Extracting..."
unzip -q commandlinetools-linux-*.zip
mkdir -p cmdline-tools/latest
mv cmdline-tools/* cmdline-tools/latest/ 2>/dev/null || true
rm commandlinetools-linux-*.zip

# Set environment variables temporarily
export ANDROID_HOME=$HOME/Android/Sdk
export PATH=$PATH:$ANDROID_HOME/cmdline-tools/latest/bin
export PATH=$PATH:$ANDROID_HOME/platform-tools
export PATH=$PATH:$ANDROID_HOME/build-tools/33.0.0

# Add to bashrc permanently
echo ""
echo "📝 Adding environment variables to ~/.bashrc..."
if ! grep -q "ANDROID_HOME" ~/.bashrc; then
    echo "" >> ~/.bashrc
    echo "# Android SDK" >> ~/.bashrc
    echo "export ANDROID_HOME=\$HOME/Android/Sdk" >> ~/.bashrc
    echo "export PATH=\$PATH:\$ANDROID_HOME/cmdline-tools/latest/bin" >> ~/.bashrc
    echo "export PATH=\$PATH:\$ANDROID_HOME/platform-tools" >> ~/.bashrc
    echo "export PATH=\$PATH:\$ANDROID_HOME/build-tools/33.0.0" >> ~/.bashrc
fi

# Accept licenses and install packages
echo ""
echo "📥 Installing SDK packages (this may take a few minutes)..."
yes | $ANDROID_HOME/cmdline-tools/latest/bin/sdkmanager --licenses 2>/dev/null
$ANDROID_HOME/cmdline-tools/latest/bin/sdkmanager "platform-tools" "platforms;android-33" "build-tools;33.0.0"

echo ""
echo "✅ Android SDK setup complete!"
echo ""
echo "📱 Next steps:"
echo "   1. Run: source ~/.bashrc"
echo "   2. Run: cd mobile"
echo "   3. Run: ./build-apk.sh"
echo ""
