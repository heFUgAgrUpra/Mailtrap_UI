# Mailtrap Inbox UI

A simple UI for your Mailtrap inbox that displays messages from the Mailtrap API. You can run it in a browser or as a desktop app with Electron.

## Quick start

### Option 1: Run as desktop app (Electron)

```bash
npm install
npm start
```

This opens a window with the inbox. A default API token is set so it works immediately; you can change it in the header.

### Option 2: Run in the browser

Open `index.html` in a browser (e.g. double-click or `open index.html` on macOS). For same-origin API calls you can use a simple static server:

```bash
npx serve .
```

Then open the URL shown (e.g. http://localhost:3000).

## Features

- **Message list** – Subject, sender, and date for each message; unread messages are bold.
- **Message detail** – From, to, sent time, size, and body viewer with HTML / Text / Raw tabs.
- **API token** – Enter and save your Mailtrap API token in the UI (stored in `localStorage`). A default token is set for development.

## API

The app uses:

- `GET https://mailtrap.io/api/accounts/{accountId}/inboxes/{inboxId}/messages`  
  With header: `Api-Token: <your-token>`

Account and inbox IDs are in `config.js`. To use another inbox, change `accountId` and `inboxId` there.

## Security

- Do not commit real API tokens. For production, use environment variables or a `.env` file and load the token in `config.js` instead of `defaultToken`.
- The token is sent only to Mailtrap’s API from your machine.

## Packaging as a standalone app

To build distributable executables (e.g. for macOS/Windows):

```bash
npm install --save-dev electron-builder
```

Add to `package.json`:

```json
"build": {
  "appId": "com.mailtrap.inbox",
  "productName": "Mailtrap Inbox",
  "directories": { "output": "dist" }
},
"scripts": {
  "pack": "electron-builder --dir",
  "dist": "electron-builder"
}
```

Then run `npm run dist` to create installers in the `dist` folder.
# Mailtrap_UI
