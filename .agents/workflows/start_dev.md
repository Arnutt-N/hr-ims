---
description: Start the full development environment (Backend & Frontend)
---

1. Start the Backend Server
// turbo
   - Run `start start_backend.bat`

2. Start the Frontend Server
// turbo
   - Run `start start_frontend.bat`

3. Start Cloudflare Tunnel (Optional for external access)
// turbo
   - Run `start start_tunnel.bat`
   - *Manual Command (if terminal fails):* `cloudflared tunnel --url http://localhost:3000`
   - Requires `cloudflared` on PATH. Install with `winget install --id Cloudflare.cloudflared -e`, `choco install cloudflared`, or `brew install cloudflared`. See `CLOUDFLARE-TUNNEL.md`. Do not use a repo-local binary.
