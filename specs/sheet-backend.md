# Google Sheet backend: setup, deploy, cutover

This is the live backend for the Coast-to-Coast Literacy Challenge. A Google Apps Script web app sits in front of the challenge Sheet and the static frontend on GitHub Pages talks to it. It replaces the earlier AWS plan (see [aws-architecture.md](aws-architecture.md), now superseded).

Sheet: https://docs.google.com/spreadsheets/d/1h4ahaZaVYhpFIP15GN6X-rMNYHPN5TkR6YbKHeLUC_E/edit

## How it fits together

The frontend (`docs/`) never changes between the demo and the live build. It talks only to `window.dataClient`. Two implementations exist:

- `docs/data-local.js`, the browser-local demo, active by default.
- `docs/data-sheet.js`, the live client that calls the Apps Script web app.

Shared route, trivia, and celebration copy live in `docs/data-content.js` so both clients stay in sync. Progress math is in `docs/progress.js` and runs in the browser. The backend (`sheet-backend/Code.gs`) is a dumb, lock-guarded store: it holds entries and settings, and the team total is always the live sum of the entry rows, so it can never drift.

## What the Sheet holds

Three tabs, created for you by `setup()`:

- **Entries**: entryId, clientId, displayName, inputType, inputValue, miles, note, source, activityDate, createdAt. One row per logged activity. This is the source of truth for the total.
- **Participants**: clientId, displayName, joinedAt. Maps a browser to its chosen name.
- **Settings**: key/value. The editable knobs, seeded with goalMiles 2984, stepsPerMile 2000, plausibilityThresholdMiles 50, startCityLabel, launchTimestamp, quickAddMiles, and completionTimestamp. Change a value here and the app picks it up on the next load, no code change.

Route, city order, cumulative miles, and trivia stay in `docs/data-content.js`. That is narrative copy, not operational data, and nested trivia is miserable to edit in a Sheet. It can be promoted to a tab later if non-engineers need to edit it.

## One-time setup

1. Open the Sheet, then Extensions > Apps Script.
2. Delete any starter `Code.gs` content. Create a file named `Code.gs` and paste the contents of `sheet-backend/Code.gs` from this repo. (Optional: also create `appsscript.json` to match, via Project Settings > "Show appsscript.json".)
3. At the top of `Code.gs`, set `SHARED_SECRET` to a random string. Generate one however you like, for example a long random password. Keep it handy for the frontend step.
4. From the function dropdown, choose `setup` and click Run. Approve the permission prompt (it needs to edit this Sheet). This creates the three tabs and seeds Settings. Safe to re-run; it only adds what is missing.

## Deploy the web app

1. In the Apps Script editor, click Deploy > New deployment.
2. Type: Web app.
3. Description: "C2C challenge API" (anything).
4. Execute as: **Me**.
5. Who has access: **Anyone**. (This is the "open, no auth" choice. It means anyone with the URL can call the API. See risk note below.)
6. Deploy, approve the prompt, and copy the Web app URL. It ends in `/exec`.

If you change `Code.gs` later, use Deploy > Manage deployments > edit (pencil) > Version: New version, so the URL stays the same. A brand new deployment gives a new URL.

## Cut the frontend over

1. Open `docs/data-sheet.js`. Set `API_URL` to the `/exec` URL and `SHARED_SECRET` to the exact same string you put in `Code.gs`.
2. Open `docs/index.html`. In the script block near the bottom, comment out the `data-local.js` line and uncomment the `data-sheet.js` line. Bump the `?v=` number on the changed tags to bust the cache.
3. Commit and push. GitHub Pages serves the live build.

To go back to the demo at any time, flip those two script lines again.

## Test the live build

Load the page, enter a name, and log a mile. Confirm the dot moves and the miles-to-Atlantic number drops. Open the Sheet and confirm a new row appeared in Entries with your clientId and a Participants row with your name. Edit and delete that entry from the Log tab and confirm the row and the total update. Add the team total from the Entries miles column and confirm it matches the number the app shows.

## Known limits and the open-endpoint risk

- **Open by design.** "Who has access: Anyone" means the `/exec` URL is a public write API. The shared secret is a speed bump, not authentication. Anyone who reads the deployed frontend can see both the URL and the secret, so a determined person could POST junk miles. Mitigations: the Sheet makes any bad row visible and one-click deletable, you can rotate the secret and redeploy, and this is an internal fun challenge, not a system of record. If that risk becomes unacceptable, the fix is to gate access to your Google Workspace, which reintroduces a sign-in on the frontend.
- **Identity is per-browser.** With no login, a person on two devices looks like two people for "my entries" and edit/delete. Names still show correctly on the shared feed.
- **Scale.** Apps Script and Sheets have per-minute quotas. About 150 people logging a few times a day is comfortably under them. A launch-day rush is the only realistic pressure point; LockService will serialize writes so they queue rather than collide.
- **Milestone banner.** The celebration and milestone check on a single log use the server's authoritative before/after totals, so they are correct even under concurrent writes.

## Rollback

The demo build (`data-local.js`) is untouched and always works offline. Flipping the two script tags in `index.html` reverts instantly with no backend dependency.
