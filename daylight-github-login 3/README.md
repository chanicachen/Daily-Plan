# Daylight — GitHub sign-in edition

This edition runs on your Mac and requires an approved GitHub account before the planner opens. GitHub verifies identity; tasks remain in the local `data/daylight.db` database. GitHub access tokens are used only long enough to read the signed-in account's ID and username and are never written to disk or included in the Daylight session.

> This is a server application, not a GitHub Pages site. Keep GitHub Pages disabled. GitHub can store the source code, while Node.js on your Mac runs the private planner.

## 1. Create the GitHub OAuth App

1. Sign in to the GitHub account that will own the OAuth App.
2. Open **GitHub → Settings → Developer settings → OAuth Apps**.
3. Choose **New OAuth App** (or **Register a new application**).
4. Enter:
   - **Application name:** `Daylight Planner`
   - **Homepage URL:** `http://localhost:3000`
   - **Authorization callback URL:** `http://localhost:3000/api/auth/github/callback`
5. Choose **Register application**.
6. Copy the displayed **Client ID**.
7. Choose **Generate a new client secret** and copy the secret. Treat it like a password; never upload it to GitHub.

## 2. Set up Daylight on this Mac

1. Install Node.js 22.13 or newer using the **macOS ARM64 installer** from <https://nodejs.org/en/download>.
2. Reopen Terminal and change into this folder.
3. Run:

   ```bash
   chmod +x setup-native-mac.sh start-native-mac.command
   ./setup-native-mac.sh
   ```

4. Paste the Client ID, Client Secret, and the GitHub username that may open the planner.
5. Double-click `start-native-mac.command`.
6. Open <http://localhost:3000> and choose **Sign in with GitHub**.

Keep the small Terminal window open while using Daylight. Press **Control-C** to stop it.

## Allow more GitHub accounts

Open `.env.local` in a text editor and put comma-separated usernames in `ALLOWED_GITHUB_LOGINS`, for example:

```text
ALLOWED_GITHUB_LOGINS=first-user,second-user
```

Restart Daylight afterward. Every allowed account gets access to the same planner database.

## Upload the source to GitHub

Use a private repository and upload the contents of this folder. Do not enable **Settings → Pages**. The included `.gitignore` keeps `.env.local`, `.env`, the database, dependencies, and build output out of the repository.

If you clone a fresh copy onto another Mac, rerun `setup-native-mac.sh`. A fresh clone starts with a separate empty database unless you copy the `data` folder while Daylight is stopped.

## Backups

Use **Export a backup** inside Daylight for a portable JSON file. For a full backup, stop Daylight, copy the entire `data` folder, and then restart Daylight.

## Security notes

- OAuth uses a random, short-lived `state` cookie to protect the callback.
- The app asks GitHub only for the signed-in account's public identity; it does not request repository access.
- Authorization is enforced by a server-side username allowlist on pages and task APIs.
- Sessions use signed, HTTP-only, same-site cookies and expire after seven days.
- The OAuth client secret, session secret, and database are excluded from Git.
- For a public internet deployment, use HTTPS, set `APP_URL` to the HTTPS origin, set `COOKIE_SECURE=true`, and update the OAuth App's callback URL to match.
