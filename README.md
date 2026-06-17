# Hesia

**v0.1.0** — Privacy-first, local-first Kanban and reflection companion with contextual AI.

Everything stays in your browser. No accounts, no cloud sync, no telemetry.

**Live app:** [https://aryagorjipour.github.io/hesia/](https://aryagorjipour.github.io/hesia/)

## Install on desktop or phone

Hesia is a Progressive Web App (PWA). You can install it like a native app:

1. Open the [live app](https://aryagorjipour.github.io/hesia/) in **Chrome** or **Edge**
2. Click the **install** icon in the address bar, or use the in-app prompt (Settings → App)
3. Hesia opens in its own window — pinned to your taskbar or dock

**iOS:** Safari → Share → Add to Home Screen

After the first visit, board, reports, and settings work offline. AI chat and weekly reflections need a connection.

## Features

- Daily Kanban board with planned work and flow wins
- Tags, categories, and weekly reports
- Local AI companion (bring your own API key)
- Encrypted export/import (ZIP, JSON, `.hesia`)
- LAN device sync via local WebSocket relay (ShareIt-style)
- 20 zen themes, workspace personalization
- Full PWA — installable and offline-capable

## Development

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

| Command | Description |
|---------|-------------|
| `npm run dev` | Development server |
| `npm run build` | Production build |
| `npm run build:pages` | Static export for GitHub Pages |
| `npm run start` | Production server |
| `npm run lint` | ESLint |
| `npm run sync:relay` | LAN WebSocket relay for device sync |
| `npm test` | Relay protocol tests |

## Device sync (LAN relay)

Sync Hesia data between devices on the same Wi‑Fi without cloud accounts. A desktop machine runs a tiny relay; phones and laptops connect, pick a nearby device, and transfer the same encrypted bundle used for export/import.

### 1. Start the relay on desktop

```bash
npm run sync:relay
```

The relay binds `0.0.0.0:8765` and prints a URL like `ws://192.168.x.x:8765`. Optional PIN: `HESIA_RELAY_PIN=1234 npm run sync:relay`.

### 2. Connect both devices

1. Open **Settings → Data & Privacy → Device sync** (or `/settings/data/sync`)
2. Set a **sync password** (required on both sides)
3. Enter the relay URL (or scan the QR on desktop)
4. Tap **Connect** on each device — nearby peers appear in the list
5. **Send data** on one device; **Accept** on the other

Signaling goes through the relay; your bundle is encrypted end-to-end over a WebRTC data channel. The relay never sees plaintext data.

### GitHub Pages + mixed content

The live app is served over **HTTPS**. Browsers block `ws://` connections from HTTPS pages. For phone ↔ laptop sync while using the hosted app, open Hesia over **HTTP on your LAN** (e.g. `npm run dev` or `npm run build && npm run start` on desktop, then visit `http://192.168.x.x:3000` on your phone). The device sync UI warns when this applies.

## GitHub Pages deployment

This repo deploys automatically to GitHub Pages on push to `main`.

1. Create a public repo named **`hesia`** under [@Aryagorjipour](https://github.com/Aryagorjipour)
2. Push this project to `main`
3. In repo **Settings → Pages**, set source to **GitHub Actions**
4. The deploy workflow publishes to `https://aryagorjipour.github.io/hesia/`

## Stack

Next.js 16 · React 19 · Tailwind 4 · Dexie · Zustand · Serwist PWA · Framer Motion

## Author

**Arya Gorjipour** — [github.com/Aryagorjipour](https://github.com/Aryagorjipour/)

## License

MIT — see [LICENSE](LICENSE)