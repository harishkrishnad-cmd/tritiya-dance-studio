#!/bin/bash
# Quick setup script for Bharatanatyam School Manager

echo ""
echo "🪷  Bharatanatyam Dance School Manager - Setup"
echo "================================================"
echo ""

# Check node
if ! command -v node &>/dev/null; then
  echo "❌  Node.js is not installed."
  echo "   Please install it from: https://nodejs.org/en/download"
  echo "   Then run this script again."
  exit 1
fi

echo "✅  Node.js $(node -v) found"

# Install deps
echo ""
echo "📦  Installing dependencies..."
npm install
cd server && npm install && cd ..
cd client && npm install && cd ..

# Copy env
if [ ! -f server/.env ]; then
  cp .env.example server/.env
  echo ""
  echo "📝  Created server/.env - please edit it with your email settings"
fi

echo ""
echo "✅  Setup complete!"
echo ""
echo "▶️   To start the app, run:"
echo "    npm run dev"
echo ""
echo "🌐  Then open: http://localhost:5173"
echo ""
