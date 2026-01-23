#!/bin/bash
# Cloudflare Tunnel Startup Script
# Run this in Git Bash from the project root

echo "🌐 Starting Cloudflare Tunnel..."
echo "   Make sure Next.js is running on http://localhost:3000"
echo ""

./cloudflared.exe tunnel --url http://localhost:3000
