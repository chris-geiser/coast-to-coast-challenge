# Quickstart: Build, Deploy, and Validate

Written so a non-engineer (with Claude Code's help) can stand this up and check it works. Two paths to create the project: the no-terminal path (all in the browser) and the clasp path (local files, version control). Use whichever you prefer.

## A. Create the project

No-terminal path:
1. Create a new Google Sheet named "Coast to Coast Challenge".
2. In the Sheet, open Extensions, Apps Script. This creates a bound script.
3. Paste in Code.gs, Setup.gs, Tests.gs and the HTML files (Index, Styles, Client, Map), then save.

clasp path (recommended if using Claude Code):
1. Install clasp and log in (`npm i -g @google/clasp`, then `clasp login`).
2. `clasp create --type sheets --title "Coast to Coast Challenge"`.
3. Put the app files in the project folder and `clasp push`.

## B. Seed the data

1. In the Apps Script editor, run the `setup()` function in Setup.gs once. Approve the permission prompt (it needs access to the Sheet).
2. Confirm the Sheet now has the tabs from contracts/sheet-schema.md, with the 11 route rows and the Config settings (goalMiles 2984, stepsPerMile 2000, plausibilityThresholdMiles 50). Set launchTimestamp to your retreat start.

## C. Deploy behind Google sign-in

1. In Apps Script, choose Deploy, New deployment, type Web app.
2. Set "Execute as" to User accessing the web app, and "Who has access" to your Workspace domain (this is the gate).
3. Deploy and copy the web app URL. Open it while signed in to your work account. You should see the map at mile zero.

## D. Validate against the spec (the important part)

Run these checks. Each maps to a success criterion or user story.

1. First-time entry under 60 seconds (SC-001): open the URL as a colleague, set a display name, log 3 miles. Confirm the dot and team total move. The name prompt should appear only once.
2. Steps convert correctly (FR-002): log 6,000 steps. Confirm it records as 3.0 miles.
3. Every distance is celebrated (SC-006, FR-010): log 0.25 miles. Confirm the message is warm and the total visibly increases. No "too small" tone anywhere.
4. Plausibility confirm (FR-012): try to log 500 miles. Confirm the app asks you to confirm before saving, and that confirming then saves it.
5. Edit and delete own entry (FR-009): edit the 3-mile entry to 4, confirm the total adjusts. Delete it, confirm the total adjusts back. Try this against someone else's entry conceptually: the server must reject it (NOT_OWNER).
6. Reconciliation (SC-005): after several entries, run `recomputeTotal()` and confirm cachedTotalMiles equals the sum of the Entries miles column exactly.
7. Milestone reached (US2): seed or log enough miles to pass Sacramento (87). Confirm Sacramento shows reached with its message, and the next milestone updates to Reno.
8. Completion and elapsed time (FR-007, SC-004): seed the total to 2,984. Confirm the app locks to the finish state, records completionTimestamp once, and shows elapsed time from launchTimestamp.
9. Inclusive recognition (SC-007, FR-013): with a seeded dataset where one person logs many short walks on many days and another logs a few long runs, confirm the short-walk person tops "most days active" or "longest streak". Confirm there is no individual most-miles board anywhere.
10. Mobile (FR-013/SC-008): open on a phone. Confirm logging is three taps or fewer and the map is readable.

## E. Seed data for testing

Tests.gs should include a `seedDemoData(n)` helper that writes a spread of entries across several people and dates so you can exercise milestones, completion, and the boards without waiting for real logging. Remove or clear demo data before launch (a `clearEntries()` helper).

## F. Launch checklist

Set the real launchTimestamp, clear any demo data and reset cachedTotalMiles to 0, confirm the deployment access is set to your domain (not "anyone"), glance at the SVG map once so each city pin lines up with its cumulative mile mark, and confirm the timezone in appsscript.json. Then share the URL.
