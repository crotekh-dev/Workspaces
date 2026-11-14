# Workspaces — PWA build

## Run locally
1. Extract the `WORKSPACES` folder.
2. Open it through a local web server (for example, VS Code Live Server).
3. Visit `index.html` through the server URL. Do not open the HTML file directly with `file://`.

## Install the app
- **Android / Chrome:** open Workspaces, then use the browser's Install app prompt or the Download app button in About.
- **Desktop Chromium browsers:** use the install icon in the address bar or the About page button.
- **iPhone / iPad:** in Safari, tap Share → Add to Home Screen.

PWA installation and service workers require HTTPS in production (localhost is allowed for development).

## Offline behavior
The service worker pre-caches the app pages, scripts, styles, images, manifest, and the local Font Awesome styles/fonts. Open the app online once so the cache can be populated. The app shell and local icons then remain available offline. Features that depend on external services or remote links still require an internet connection.

## Icons
The project now keeps only the Font Awesome minified stylesheet and the three local font files (solid, regular, and brands). The large JS bundles, metadata, documentation, and unused stylesheet variants have been removed. The retained font files are served locally and cached for offline use.
