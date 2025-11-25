#!/bin/bash

# Script to start Phoenix backend for mobile app testing
# This ensures the backend is accessible from your phone

echo "🚀 Starting Education CRM Backend for Mobile Testing"
echo "====================================================="
echo ""

# Get current IP
CURRENT_IP=$(hostname -I | awk '{print $1}')
echo "📍 Your computer's IP: $CURRENT_IP"
echo ""

# Check if config is correct
if grep -q "ip: {0, 0, 0, 0}" config/dev.exs; then
    echo "✅ Backend configured to accept network connections"
else
    echo "⚠️  WARNING: Backend may not accept network connections"
    echo "   Run this to fix: sed -i 's/ip: {127, 0, 0, 1}/ip: {0, 0, 0, 0}/' config/dev.exs"
fi

echo ""
echo "🔧 Checking dependencies..."

# Check if deps are installed
if [ ! -d "deps" ] || [ ! -d "_build" ]; then
    echo "📦 Installing dependencies..."
    mix deps.get
fi

echo ""
echo "🗄️  Setting up database..."
mix ecto.create 2>/dev/null || echo "   Database already exists"
mix ecto.migrate

echo ""
echo "🌐 Backend will be accessible at:"
echo "   - From this computer: http://localhost:4000"
echo "   - From your phone: http://$CURRENT_IP:4000"
echo ""
echo "📱 Mobile app should use: http://$CURRENT_IP:4000/api"
echo ""
echo "⚠️  Make sure:"
echo "   1. Your phone is on the same WiFi network"
echo "   2. Firewall allows port 4000: sudo ufw allow 4000/tcp"
echo ""
echo "🔥 Starting Phoenix server..."
echo "   Press Ctrl+C to stop"
echo ""

# Start the server
mix phx.server
