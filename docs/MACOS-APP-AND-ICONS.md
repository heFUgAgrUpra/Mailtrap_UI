# Creating the macOS app and icons

## 1. Install build tools

From the project root:

```bash
npm install
npm install --save-dev electron-builder
```

You already have `assets/mailtrap-icon.png`. electron-builder will use it for the app icon on macOS (it can use a 1024×1024 or 512×512 PNG and will generate the required `.icns` when building on macOS).

---

## 2. (Optional) Create a proper macOS .icns icon

macOS expects an **.icns** file (icon set) for the best result. You can generate it from your PNG on a Mac:

### Option A: Use a 1024×1024 PNG (recommended)

1. Resize your icon to **1024×1024** pixels (e.g. in Preview, or use an online tool).
2. Create an iconset folder:

   ```bash
   mkdir -p assets/mailtrap-icon.iconset
   ```

3. Export the required sizes (run from project root; requires `sips`, built into macOS):

   ```bash
   for size in 16 32 64 128 256 512; do
     sips -z $size $size assets/mailtrap-icon.png --out assets/mailtrap-icon.iconset/icon_${size}x${size}.png
     sips -z $((size*2)) $((size*2)) assets/mailtrap-icon.png --out assets/mailtrap-icon.iconset/icon_${size}x${size}@2x.png
   done
   ```

4. Generate the .icns file:

   ```bash
   iconutil -c icns assets/mailtrap-icon.iconset -o assets/mailtrap-icon.icns
   ```

5. In `package.json` under `build.mac`, set:

   ```json
   "icon": "assets/mailtrap-icon.icns"
   ```

### Option B: Use PNG only

You can keep using `assets/mailtrap-icon.png`. electron-builder will use it when building on macOS. For best quality, use at least **512×512** or **1024×1024**.

---

## 3. Build the macOS app

From the project root:

```bash
npm run dist:mac
```

Or build everything (macOS + Windows if on Windows):

```bash
npm run dist
```

Output will be in the **dist** folder:

- **Mailtrap Inbox.app** – the application bundle (also inside the .dmg)
- **Mailtrap Inbox-x.x.x.dmg** – disk image for distribution
- **Mailtrap Inbox-x.x.x-mac.zip** – zip for distribution

---

## 4. Run the built app

- Open **dist/Mailtrap Inbox.app**, or
- Open **dist/Mailtrap Inbox-x.x.x.dmg** and drag the app to Applications.

---

## 5. Icon sizes reference (macOS)

| Use              | Size        |
|------------------|------------|
| App icon (Retina)| 1024×1024  |
| App icon         | 512×512    |
| Dock (Retina)     | 512×512    |
| Dock             | 256×256    |
| Toolbar / small  | 16×16–64×64|

The `.icns` format bundles all of these. Using a single 1024×1024 PNG with electron-builder is enough for a correct app icon if you skip the manual .icns step.

---

## Quick checklist

1. [ ] `npm install` and `npm install --save-dev electron-builder`
2. [ ] Icon at `assets/mailtrap-icon.png` (512×512 or 1024×1024)
3. [ ] (Optional) Generate `assets/mailtrap-icon.icns` and point `build.mac.icon` to it
4. [ ] Run `npm run dist:mac`
5. [ ] Test **dist/Mailtrap Inbox.app** or the .dmg
