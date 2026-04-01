#!/bin/bash
# ─── ARA Desktop — Vendor Setup Script ───────────────────────────────────────
# Run this once before building the .dmg to bundle OpenClaw into the app.
# Usage: ./scripts/setup-vendor.sh

set -e

VENDOR_DIR="$(dirname "$0")/../vendor/openclaw"
OPENCLAW_SRC="$(dirname "$0")/../../openclaw-src/openclaw-main"

echo "🔧 Setting up OpenClaw vendor bundle..."

mkdir -p "$VENDOR_DIR"

# Option 1: Copy from local source (if available)
if [ -d "$OPENCLAW_SRC" ]; then
  echo "📦 Copying OpenClaw from local source..."
  cp -r "$OPENCLAW_SRC"/* "$VENDOR_DIR/"
  cd "$VENDOR_DIR"
  npm install --production
  echo "✅ OpenClaw bundled from local source"
  exit 0
fi

# Option 2: Install from npm
echo "📦 Installing OpenClaw from npm..."
cd "$VENDOR_DIR"
npm init -y
npm install openclaw --save
echo "✅ OpenClaw installed from npm"
