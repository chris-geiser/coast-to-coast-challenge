# Coast-to-Coast Literacy Challenge

An internal web app where the whole Ignite Reading team logs walks and runs, and every mile moves one shared dot across a stylized US map from the Bay Area to New York. One full crossing (2,984 miles) is the goal. Built on Google Apps Script with a Google Sheet as the database, so it lives behind our Workspace login and costs effectively nothing to run.

Full design package is in [specs/](specs/). This README covers how to stand it up and what is built so far.

## Stack

- Google Apps Script web app (one HTML page) + a bound Google Sheet for data.
- Deployed restricted to the Workspace domain. That Google sign-in is the only access gate; the app reads identity via `Session.getActiveUser().getEmail()`. No app-level OAuth, no shared code.
- Stylized inline SVG US map. The dot is positioned by team miles over goal along an SVG path. No map API key.
- No fitness-app sync, by decision ([research.md](specs/research.md) Decision 9).

## What is in `app/`

| File | Role |
|------|------|
| `appsscript.json` | Manifest: V8, `America/Los_Angeles`, web app access `DOMAIN`, `executeAs USER_ACCESSING`. |
| `Setup.gs` | `setup()` builds the four tabs and seeds settings + the 11 route rows. `resetForLaunch()` for launch day. |
| `Code.gs` | `doGet`, `getState`, `setDisplayName`, `logActivity`, `updateEntry`, `deleteEntry`, `getRecognition` (stub), plus the Sheet data layer, identity, progress math, and lock-guarded totals. |
| `Tests.gs` | `runTests()` math checks, `seedDemoData(n)` and `clearEntries()`. |
| `Index.html` | Page shell: Map and Log views, bottom nav, modals. |
| `Styles.html` | Ignite brand tokens, mobile-first CSS. |
| `Map.html` | The inline SVG US map, route, and dot. |
| `Client.html` | Client JS: calls the server and renders the views. |

## Stand it up (no-terminal paste path)

1. Create a new Google Sheet named **Coast to Coast Challenge**.
2. In the Sheet: Extensions, Apps Script. This creates a bound script.
3. For each file in `app/`, create a matching file in the Apps Script editor and paste the contents:
   - `.gs` files: create as Script files named `Code`, `Setup`, `Tests` (no extension shown in the editor).
   - `.html` files: create as HTML files named `Index`, `Styles`, `Client`, `Map`.
   - The manifest: in Project Settings, tick "Show appsscript.json", then paste `appsscript.json`.
4. Run `setup()` once from the editor and approve the permission prompt. Confirm the four tabs appear with the 11 route rows and the Config settings.

## Deploy behind Google sign-in

1. Deploy, New deployment, type Web app.
2. Execute as: **User accessing the web app**. Who has access: **your Workspace domain** (this is the gate).
3. Open the URL while signed in to your work account. You should see the map at mile zero.

## Validate

Run the checks in [specs/quickstart.md](specs/quickstart.md). Quick start for a demo: run `seedDemoData(120)` in `Tests.gs` to spread entries across people and dates so the dot moves, then `runTests()` to confirm the math, then `clearEntries()` before launch.

## Build status

Built so far (MVP): Phase 1 Setup, Phase 2 Foundational, User Story 1 (log, effortless input, personal tally, edit/delete, plausibility confirm), and the core of User Story 2 (dot moves, milestones reached on the map, next stop and miles to coast, smooth dot animation). A lightweight name gate is included because attribution needs it.

Deferred (next, after MVP review): the full finish/completion hero (US2 tail), milestone celebration cards and the collective activity feed (US3), the polished first-run name prompt and access documentation (US4), the four recognition boards (US5), and final polish (US8/Phase 8).

## Open items and placeholders

- `launchTimestamp` is intentionally blank. Set it in `Config_Settings` before launch.
- The prototype (`docs/`) uses the official Ignite Reading white logo, extracted from the brand sheet to `docs/ignite-logo-white.png`. The legacy `app/` Apps Script header still has a placeholder.
- The mission micro-facts in [specs/design/copy.md](specs/design/copy.md) are marked `[DATA NEEDED]`; confirm current figures with Marketing before showing them.
- The prototype uses the real continental US outline. The legacy `app/Map.html` still has the low-poly placeholder.
