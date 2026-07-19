# Daylight — self-hosted personal planner

This copy runs entirely on your Mac. It does not use Gmail, ChatGPT, OpenAI Sites, or any other account system. Tasks are stored in `data/daylight.db`, and the password is kept only as a one-way hash in a private settings file.

## Recommended: run directly on your Mac

This method does not use Docker or a virtual machine. It is suitable for this Apple Silicon Mac running macOS 13.

1. Install Node.js 22 or newer using the **macOS ARM64 installer** from [nodejs.org](https://nodejs.org/en/download).
2. After installation, close and reopen Terminal.
3. Open Terminal and change into this folder.
4. Run:

   ```bash
   ./setup-native-mac.sh
   ```

5. Choose a password when prompted. It is never displayed or saved in plain text.
6. When setup finishes, double-click `start-native-mac.command` to open Daylight.

Keep the small Terminal window open while using Daylight. Press **Control-C** in that window when you want to stop it.

## Optional: Docker or Podman

The included `Dockerfile`, `docker-compose.yml`, and `setup-mac.sh` remain available for newer systems. Podman Desktop can also run containers on macOS, but it requires a Linux virtual machine, so direct Node.js is lighter and simpler for this computer.

## Change the password

Run `./setup-native-mac.sh` again and choose a new password. Your tasks remain in the `data` folder. Existing browser sessions are signed out automatically.

## Backups

Use **Export a backup** inside Daylight for a portable JSON file. For a complete local backup:

1. Stop Daylight by pressing **Control-C** in its Terminal window.
2. Copy the entire `data` folder somewhere safe using Finder.
3. Start Daylight again by double-clicking `start-native-mac.command`.

## Access from a phone on trusted home Wi-Fi

The native starter binds Daylight only to this Mac for safety. To use it from a phone, edit `start-native-mac.command` and change `127.0.0.1` to `0.0.0.0`. Restart Daylight, find the Mac's local IP address in **System Settings → Wi-Fi → Details**, then open `http://YOUR-MAC-IP:3000` on the phone.

Do not configure router port forwarding. For safe access away from home, use a private VPN such as Tailscale or configure an HTTPS reverse proxy.

## Security notes

- Password verification uses scrypt and timing-safe comparison.
- Sessions use signed, HTTP-only, same-site cookies and expire after 30 days.
- Login attempts are rate-limited.
- The database and secret files are excluded from source control and container images.
- Set `COOKIE_SECURE=true` only after placing Daylight behind HTTPS.
