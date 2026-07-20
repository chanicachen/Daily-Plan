# Daylight — GitHub Pages edition

This is the static, ready-to-upload edition of Daylight. It includes `index.html` and runs entirely in one browser with no server, database, Gmail account, or GitHub OAuth App.

## Important privacy limitation

The password is a **convenience lock**, not genuine website security. Its salted PBKDF2 result is stored in the browser, but a technically knowledgeable person can inspect or erase browser storage and bypass the lock. Do not store highly sensitive information.

Tasks are stored in that browser's `localStorage`:

- Different browsers and devices have separate planners.
- Private/incognito windows usually erase tasks when closed.
- Clearing site data erases the password and tasks.
- Updating files in the GitHub repository normally leaves browser data intact as long as the Pages address does not change.
- Use **Export a backup** regularly. The JSON backup can be imported into another browser.

## Publish with GitHub Pages

1. Unzip this package.
2. Create a GitHub repository. A public repository works with GitHub Free; check your GitHub plan before relying on Pages from a private repository.
3. Upload **all contents inside** the `daylight-github-pages` folder to the top level of the repository. `index.html` must be at the repository root, not inside another folder.
4. Commit the uploaded files.
5. Open the repository's **Settings → Pages**.
6. Under **Build and deployment**, choose **Deploy from a branch**.
7. Select your main branch and the `/(root)` folder, then choose **Save**.
8. Wait for GitHub to display the published address, then open it.
9. On the first visit, create your convenience-lock password.

The package has no build step and no external dependencies. GitHub Pages serves `index.html`, `styles.css`, `app.js`, and the files under `assets/` directly.

## Features

- Year, month, week, and day views
- Create, edit, complete, delete, and reorder tasks
- Responsive layout for Mac, tablet, and phone browsers
- Local convenience lock with a per-browser salted password hash
- JSON export and import
- Light and dark appearance based on device settings
- No analytics, trackers, network APIs, or third-party scripts

## Change or recover the local lock

Use **Change local lock** in the sidebar after opening the planner. If you forget the password, choose **Reset this browser's local copy** on the lock screen. Resetting also deletes local tasks, so restore them afterward from an exported JSON backup.
