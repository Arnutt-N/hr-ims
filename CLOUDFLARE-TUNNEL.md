# Cloudflare Tunnel Setup Guide

Optional public exposure for local development. The `cloudflared` client is installed on the machine. This repository does not ship the binary.

## Install cloudflared

Install once, then confirm it is on `PATH`:

```bash
cloudflared --version
```

Windows (pick one):

```bat
winget install --id Cloudflare.cloudflared -e
choco install cloudflared
```

`install-cf.bat` runs the winget command above. It does not download `cloudflared.exe` into this repo.

macOS:

```bash
brew install cloudflared
```

Linux and other builds: use the official packages or downloads at
<https://developers.cloudflare.com/cloudflare-one/connections/connect-networks/downloads/>.

Do not commit `cloudflared`, `cloudflared.exe`, or files under `.cloudflared/`.

## Quick Start

From the project root, with the Next.js dev server already on port 3000:

```bash
cloudflared tunnel --url http://localhost:3000
```

Windows shortcuts: `start_tunnel.bat` (cmd) or `./start-tunnel.sh` (Git Bash). Both call `cloudflared` on `PATH`.

## What Happens

1. Cloudflared creates a temporary public URL (for example `https://random-name.trycloudflare.com`)
2. That URL is reachable from the internet
3. Traffic is tunneled to the local Next.js server

## Requirements

- [x] `cloudflared` installed on this machine and available on `PATH`
- [x] Next.js frontend running on `localhost:3000`
- [x] Backend running if you need the Express API directly

## Notes

- The temporary URL changes each time you restart the tunnel
- A fixed hostname needs a Cloudflare account and a named tunnel
- The quick-start tunnel exposes the frontend; in-app API calls go through the Next.js app
- Login and named-tunnel commands write credentials outside the repo (usually `~/.cloudflared/`). Do not commit `cert.pem`, tunnel credential JSON, or a config that contains a tunnel token

## Permanent Tunnel (Optional)

```bash
cloudflared tunnel login
cloudflared tunnel create hr-ims
cloudflared tunnel run hr-ims
```

Keep the generated credential files and any config that holds a tunnel token out of git.
