# Cloudflare Tunnel Setup Guide

## Quick Start (Git Bash)

```bash
# Navigate to project directory
cd /d/02\ genAI/hr-ims

# Run tunnel (points to Next.js dev server on port 3000)
./cloudflared.exe tunnel --url http://localhost:3000
```

## What Happens
1. Cloudflared creates a temporary public URL (e.g., `https://random-name.trycloudflare.com`)
2. This URL is accessible from anywhere on the internet
3. Traffic is securely tunneled to your local Next.js server

## Requirements
- [x] `cloudflared.exe` in project root ✅
- [x] Next.js frontend running on `localhost:3000`
- [x] Backend running on `localhost:5000` (if needed)

## Notes
- The temporary URL changes each time you restart the tunnel
- For a permanent URL, you need a Cloudflare account and named tunnel
- The tunnel only exposes the frontend; backend API calls work via Next.js proxy

## Permanent Tunnel (Optional)
If you need a fixed URL:
```bash
# Login to Cloudflare (one-time)
./cloudflared.exe tunnel login

# Create a named tunnel
./cloudflared.exe tunnel create hr-ims

# Run with config
./cloudflared.exe tunnel run hr-ims
```
