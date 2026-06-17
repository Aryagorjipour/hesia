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