# Implementation Plan: Coast-to-Coast Literacy Challenge

**Date**: 2026-06-25 | **Spec**: spec.md | **Status**: Draft for review

## Summary

Build a single, domain-restricted web app where ~150 colleagues log walks and runs, and every mile moves one shared dot across a stylized US map from the Bay Area to New York. The goal is one full crossing (2,984 miles). When the team reaches New York, the app locks completion, shows how long it took, and presents inclusive recognition boards. The whole thing runs on Google Apps Script with a Google Sheet as the database, so it sits naturally behind your Workspace login and costs effectively nothing to run.

The technical heart is simple: an Apps Script web app serves one HTML page, a handful of server functions read and write a Google Sheet, and the map is an inline SVG where the dot's position is just (team miles / goal miles) along a drawn route path.

## Technical Context

**Language/Runtime**: JavaScript on the Apps Script V8 runtime (server), plus HTML, CSS, and vanilla JS (client). No build step required.

**Primary Dependencies**: Google Apps Script built-in services only: HtmlService (serves the page), SpreadsheetApp (data), LockService (safe concurrent writes), Session (signed-in user identity), and Utilities. No third-party libraries, no npm, no map SDK. Optional: clasp for local development and version control.

**Storage**: One Google Sheet with tabs for Config (settings and route), Entries, and Participants. Team totals and progress are computed from Entries, with a small cached summary for speed. See data-model.md.

**Identity / Access**: The app is deployed as a web app restricted to your Google Workspace domain. Only signed-in colleagues can reach it, and Apps Script exposes the signed-in user's email via Session.getActiveUser().getEmail(). That gives verified attribution with zero extra OAuth work, so we drop the shared code from the spec (see research.md, Decision 3, and the spec-change note below).

**Testing**: Lightweight. A few server-side test functions for the math (step conversion, total, milestone position, board computations) plus the manual scenarios in quickstart.md. This is an internal celebration app, so the bar is correctness of the numbers, not a full test pyramid.

**Target Platform**: Modern mobile and desktop browsers. Mobile is the primary device, so the layout is mobile-first.

**Project Type**: Serverless web app hosted on Google infrastructure (Apps Script).

**Performance Goals**: getState returns in under ~1 second for ~150 users and a few thousand entries. Logging an activity completes in under ~2 seconds end to end.

**Constraints**: Near-zero cost, no extra SaaS accounts, runnable and maintainable by a non-engineer. Every participant must have a Workspace account (true here, since access is gated by it).

**Scale/Scope**: ~150 participants, likely a few thousand total entries across the challenge window. Well within Sheets and Apps Script limits.

## Map Approach (recommended)

Use a stylized SVG US map, not Google Maps or Mapbox, for v1. The route is a single drawn `<path>`; the dot is placed with `path.getPointAtLength(fraction * totalLength)` where fraction is team miles over goal miles. Milestone cities are markers at their own cumulative-mile fractions. This needs no API key, no billing account, no tile provider, animates smoothly, and themes cleanly to Ignite colors. Google Maps and Mapbox both require a billing-enabled key or token and add real complexity for a view that is fundamentally one line and one dot. They are documented as an optional later upgrade in research.md (Decision 2), not part of v1.

## Architecture at a Glance

The client is one HTML page with three views: Log, Map (default), and Recognition (revealed at completion). On load, the client calls a single `getState()` server function and renders everything from the result. Logging calls `logActivity()`, which validates, writes a row, updates the cached total under a lock, and returns the new state plus a celebration message. All server functions live in Code.gs and talk to the Sheet.

```text
Browser (one HTML page)
  | google.script.run (async calls)
  v
Apps Script (Code.gs)
  - doGet()         -> serves Index.html
  - getState()      -> reads Config + Entries, returns full UI state
  - logActivity()   -> validates, appends Entry, updates total (LockService)
  - updateEntry()   -> edits caller's own entry
  - deleteEntry()   -> deletes caller's own entry
  - getRecognition()-> computes inclusive boards (at/after completion)
  |
  v
Google Sheet (Config, Entries, Participants)
```

## Project Structure

A clasp-managed project so Claude Code can build and push it, with the Sheet created from a setup script.

```text
specs/coast-to-coast-challenge/
  spec.md
  plan.md
  research.md
  data-model.md
  quickstart.md
  contracts/
    api.md            (client-server function contract)
    sheet-schema.md   (Sheet tabs and columns)

app/                         (the Apps Script project, pushed via clasp)
  .clasp.json                (links to the script ID)
  appsscript.json            (manifest: timezone, V8, webapp access = DOMAIN)
  Code.gs                    (doGet + all server functions)
  Setup.gs                   (one-time: build Sheet tabs, seed Config/route)
  Index.html                 (page shell, includes the partials below)
  Styles.html                (CSS, Ignite theme tokens, mobile-first)
  Client.html                (client JS: calls server, renders views)
  Map.html                   (inline SVG US map + route path + dot)
  Tests.gs                   (server-side checks for the math)
```

## Build Phases

The phases map to the spec's prioritized user stories so an MVP appears early and each step is independently testable.

Phase 1, Setup. Create the Apps Script project and Sheet, write Setup.gs to seed the Config tab with the route (11 cities, cumulative miles, goal 2,984), step conversion (2,000 per mile), and the plausibility threshold. Deploy as a domain-restricted web app. Exit check: the page loads for a signed-in colleague and shows an empty map at mile zero.

Phase 2, Foundational. Implement getState() and the SVG map rendering (route, milestones, dot at zero). Implement identity capture (read Google email, prompt once for a friendly display name, store it). Exit check: the map renders with the dot at the start and the next milestone labeled.

Phase 3, User Story 1 and 3 (Log + Celebrate, P1). Implement logActivity() with miles/steps input, step conversion, the plausibility confirm, the inclusive celebration message, own-entry edit/delete, and each person's private, non-ranked personal tally of their total and recent entries (FR-017). Update the cached total under LockService. Exit check: logging any distance moves the dot and the team total, short distances included, the math reconciles with the sum of entries, and a person can see their own running total without it being compared to anyone else.

Phase 4, User Story 2 (Map progress + completion, P1). Milestone reached states and messages, miles-remaining to next stop and to the coast, and completion lock with finish timestamp and elapsed time when the total reaches 2,984. Exit check: passing a milestone shows its celebration; reaching New York flips the app to the finish state.

Phase 5, User Story 5 (Recognition, P2). getRecognition() computes the four inclusive boards (most days active, longest streak, most improved, first to log) and the Recognition view renders them at completion. There is no participation board and no overall participation tracking, by decision. Exit check: the boards compute correctly on a seeded dataset, and someone who only logged short distances consistently can top at least one board.

Phase 6, Polish and launch. Empty states, mobile layout pass, Ignite theming, the per-city celebration copy from spec Appendix A, and a light admin note for editing Config. Exit check: quickstart.md scenarios all pass.

Fitness sync (spec User Story 6) is not being built, by decision rather than deferral (see research.md Decision 9). The apps most walkers use (Apple Health, Google Fit / Health Connect) have no web API our stack can call, and the two that do (Strava, Fitbit) skew to runners and a minority of devices, so manual entry stays the only path and we make it fast instead.

## Constitution Check

No project constitution exists, so there are no hard gates to clear. The plan does honor the spec's core values: it keeps recognition to inclusive categories only (no individual most-miles ranking), treats every distance as a real contribution, and avoids storing health data. These are carried as requirements, not afterthoughts.

## Complexity Tracking

| Choice | Why | Simpler or fancier alternative rejected because |
|--------|-----|-----------------------------------------------|
| Apps Script + Sheets | Native Google gating, free, non-engineer maintainable, gives verified identity for free | Supabase + static host adds accounts, a separate auth gate, and ops for little gain at this scale |
| Stylized SVG map | Keyless, free, on-brand, trivial dot math | Google Maps/Mapbox need a billing key or token and add complexity for one line and a dot |
| Cached total cell under LockService | Keeps getState fast and writes race-safe | Summing all rows every read is fine early but degrades; full DB transactions are overkill here |
| Google identity for attribution | Removes shared code, prevents posting as someone else, zero extra auth work | App-level Google OAuth (rejected by Chris) and a shared code (weaker, self-asserted) |

## Spec Reconciliation (applied)

These plan decisions are now reflected in spec.md: identity comes from the verified Google sign-in (no shared code), entries are attributed to the real person with a friendly display name, the start city is San Francisco (with Ignite's Oakland origin noted in the copy), and there is no department board and no overall participation tracking. The most-improved formula is locked (see research.md, Decision 6).

## Open Items Carried From Spec

No open items remain. The private, non-ranked personal tally is now a requirement (spec FR-017), and fitness sync is decided against (research.md Decision 9).

## Quality Gates

All decisions resolved in research.md. Data model covers every entity in the spec. The API contract defines every client-server call. Technical context has no blanks. Recognition stays inclusive by construction. The map needs no paid key.
