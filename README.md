# Mailtrap Inbox UI

A simple UI for your Mailtrap inbox that displays messages from the Mailtrap API. You can run it in a browser or as a desktop app with Electron.

## Quick start

### Option 1: Run as desktop app (Electron)

```bash
npm install
npm start
```

This opens a window. Enter your API token and Account ID in the header (or copy `config.example.js` to `config.js` and add them there).

### Option 2: Run in the browser

Open `index.html` in a browser (e.g. double-click or `open index.html` on macOS). For same-origin API calls you can use a simple static server:

```bash
npx serve .
```

Then open the URL shown (e.g. http://localhost:3000).

## Features

- **Message list** – Subject, sender, and date for each message; unread messages are bold.
- **Message detail** – From, to, sent time, size, and body viewer with HTML / Text / Raw tabs.
- **API token** – Enter and save your Mailtrap API token in the UI (stored in `localStorage`), or set it in `config.js` (local only, not committed).

## API

The app uses:

- `GET https://mailtrap.io/api/accounts/{accountId}/inboxes/{inboxId}/messages`  
  With header: `Api-Token: <your-token>`

Account and inbox IDs are in `config.js`. To use another inbox, change `accountId` and `inboxId` there.

## Security – what is never sent to GitHub

These are **not** committed (see `.gitignore`):

- **config.js** – Your API token, account ID, inbox ID, and any mailbox names you set. Copy from `config.example.js` and add your own values locally.
- **.env** and **.env.local** – Use these for tokens/IDs if you prefer; they are ignored by git.

The only config in the repo is **config.example.js**, which uses **placeholder values** (`123456`, `1234567`, empty token). No real account IDs, inbox IDs, or mailbox names are in the codebase.

- Do not commit `config.js` or any file containing real tokens or IDs.
- The token is sent only to Mailtrap’s API from your machine.

## Packaging as a standalone app

1. Install and build:

   ```bash
   npm install
   npm run dist:mac
   ```

   Output: **dist/Mailtrap Inbox.app** and **dist/Mailtrap Inbox-x.x.x.dmg**.

2. For detailed steps (macOS app, icon sizes, creating .icns), see **[docs/MACOS-APP-AND-ICONS.md](docs/MACOS-APP-AND-ICONS.md)**.
