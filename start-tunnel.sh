#!/bin/bash
# Cloudflare Tunnel startup script.
# Requires cloudflared on PATH. See CLOUDFLARE-TUNNEL.md. Do not use a repo-local binary.

echo "🌐 Starting Cloudflare Tunnel..."
echo "   Make sure Next.js is running on http://localhost:3000"
echo ""

if ! command -v cloudflared >/dev/null 2>&1; then
  echo "❌ cloudflared is not installed or not on PATH."
  echo "   Install it on this machine, then retry. See CLOUDFLARE-TUNNEL.md."
  echo "   Windows: winget install --id Cloudflare.cloudflared -e"
  echo "   Or:      choco install cloudflared"
  echo "   macOS:   brew install cloudflared"
  echo "   Docs:    https://developers.cloudflare.com/cloudflare-one/connections/connect-networks/downloads/"
  exit 1
fi

exec cloudflared tunnel --url http://localhost:3000
