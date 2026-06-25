# Tasks: Coast-to-Coast Literacy Challenge

**Date**: 2026-06-25 | **Spec**: spec.md | **Plan**: plan.md | **Status**: Ready for build

This is the build-ordered task list for Claude Code. Tasks are grouped by phase and user story. Each has an ID, an optional [P] for parallelizable work, a story label where relevant, and an exact file path. Files live in the `app/` Apps Script project described in plan.md. Server code is Apps Script (.gs); the client is HtmlService partials (.html).

Note on stack: this is a Google Apps Script web app with a Google Sheet database, deployed restricted to the Workspace domain (that is the access gate), a stylized SVG map (no map API key), and verified Google identity (no shared code). See research.md for the why behind each.

## Phase 1: Setup

- [ ] T001 Create the Apps Script project bound to a new Google Sheet named "Coast to Coast Challenge", and add the manifest in app/appsscript.json with runtimeVersion V8, a timeZone (confirm company timezone), and webapp access set to DOMAIN with executeAs USER_ACCESSING. Add app/.clasp.json if using clasp.
- [ ] T002 Implement setup() in app/Setup.gs to create the tabs Config_Settings, Config_Route, Entries, and Participants exactly per contracts/sheet-schema.md, and seed Config_Settings (goalMiles 2984, stepsPerMile 2000, plausibilityThresholdMiles 50, cachedTotalMiles 0, launchTimestamp placeholder, completionTimestamp blank, startCityLabel "San Francisco") plus the 11 route rows from data-model.md.
- [ ] T003 [P] Add admin-configurable input settings to Config_Settings in app/Setup.gs: quickAddMiles (default "1,2,3,5") for the quick-add chips (FR-018).
- [ ] T004 Deploy as a domain-restricted web app and confirm the page loads for a signed-in colleague and is unreachable otherwise.

## Phase 2: Foundational

**Blocks all user stories.**

- [ ] T005 Implement a Sheet data-access layer in app/Code.gs with header-indexed read/write helpers for Config (settings and route), Entries (read, append, update, delete), and Participants (read, upsert).
- [ ] T006 Implement identity helpers in app/Code.gs: read the signed-in email via Session.getActiveUser().getEmail(), upsert the Participant, and get/set the friendly display name (setDisplayName per contracts/api.md).
- [ ] T007 Implement progress math helpers in app/Code.gs: fractionComplete, currentSegment, nextMilestone and milesRemaining, milesToCoast, milestonesReached, isComplete, and elapsed.
- [ ] T008 Implement getState() in app/Code.gs returning the full shape in contracts/api.md (user, config, route, progress, myEntries, myTotalMiles, recentActivity).
- [ ] T009 Implement LockService-guarded total updates plus recomputeTotal() in app/Code.gs so cachedTotalMiles always reconciles to the sum of Entries.miles (spec SC-005).
- [ ] T010 Implement doGet() in app/Code.gs to serve app/Index.html, and build the page shell with three views (Map default, Log, Recognition) and simple nav in app/Index.html and app/Client.html.
- [ ] T011 [P] Build the stylized SVG US map in app/Map.html: the route as one path, 11 milestone markers at their cumulative-mile fractions, and the dot positioned with path.getPointAtLength(fractionComplete * path.getTotalLength()); wire rendering in app/Client.html.
- [ ] T012 [P] Add the Ignite theme tokens and a mobile-first layout in app/Styles.html.

**Checkpoint**: The map renders with the dot at the start (mile 0) and the next milestone labeled for a signed-in user.

## Phase 3: User Story 1 - Log my activity (Priority: P1)

**Goal**: Anyone can log a walk or run in seconds and see it move the dot and the team total. Includes effortless input (FR-018) and the private personal tally (FR-017).
**Independent Test**: On a phone, enter one number and submit; the team total and dot move, and the personal tally updates.

- [ ] T013 [US1] Implement logActivity() in app/Code.gs per contracts/api.md: validate input, convert steps to miles, run the NEEDS_CONFIRMATION plausibility flow, append the Entry, update the total under lock, set completionTimestamp if this entry reaches the goal, and return new progress plus celebrationMessage plus milestoneJustReached.
- [ ] T014 [US1] Implement updateEntry() and deleteEntry() in app/Code.gs, restricted to the caller's own entries (errors NOT_OWNER, NOT_FOUND), each recomputing the total under lock.
- [ ] T015 [US1] Build the Log view in app/Client.html: a large number field, a miles/steps toggle, and a submit button.
- [ ] T016 [US1] Implement effortless input (FR-018) in app/Client.html and app/Styles.html: default the date to today, remember and preselect the last-used unit, show the inline step-to-mile conversion as the user types, add one-tap quick-add chips from quickAddMiles, and make a same-day entry one number plus confirm.
- [ ] T017 [US1] Implement the private personal tally (FR-017) in app/Client.html: the caller's own total and recent entries with edit and delete, never ranked or compared.
- [ ] T018 [US1] Implement the plausibility confirm dialog in app/Client.html that triggers on NEEDS_CONFIRMATION and resends with confirmedOverThreshold true.

**Checkpoint**: Logging any distance, including a short one, moves the dot and total, the math reconciles, and each person sees their own running total.

## Phase 4: User Story 2 - See the team crossing the map (Priority: P1)

**Goal**: The shared map shows where the team is, what is next, and a real finish.
**Independent Test**: With a known total, the dot sits at the right point, names the next city with miles remaining, and reaching New York flips to the finish state.

- [ ] T019 [US2] Render milestone reached states and their celebration messages on the map, and show the next milestone with miles remaining plus miles to the coast, in app/Map.html and app/Client.html.
- [ ] T020 [US2] Animate the dot smoothly along the path on each state update in app/Client.html.
- [ ] T021 [US2] Implement the completion state in app/Client.html: when progress.isComplete, lock to the finish view, show elapsed time from launch, and reveal the Recognition entry point.

**Checkpoint**: Passing a milestone shows its message; reaching the final coast shows the finish with elapsed time.

## Phase 5: User Story 3 - Celebrate every contribution (Priority: P1)

**Goal**: Every log feels recognized, and the team's shared story is visible without ranking by volume.
**Independent Test**: Logging 0.25 miles returns a warm, mission-tied message and visibly contributes.

- [ ] T022 [US3] Implement the inclusive celebration message in app/Code.gs (returned by logActivity): warm, mission-tied, and never dismissive of small distances.
- [ ] T023 [US3] Implement the milestone celebration moment in app/Client.html when milestoneJustReached is present.
- [ ] T024 [US3] Implement the collective, non-ranked recent-activity feed (FR-011) in app/Client.html, framed as shared effort.

**Checkpoint**: A 0.25-mile entry gets a genuinely warm response and moves the total.

## Phase 6: User Story 4 - Get into the app (Priority: P1)

**Goal**: Frictionless, gated entry with a one-time name.
**Independent Test**: A signed-in colleague sets a display name once and logs; a non-org user cannot reach the app.

- [ ] T025 [US4] Implement the first-run display-name prompt in app/Client.html, shown once when displayName is null, calling setDisplayName().
- [ ] T026 [US4] Verify and document the domain-restricted deployment (access DOMAIN, executeAs USER_ACCESSING) so only signed-in org members reach the app and identity resolves correctly.

**Checkpoint**: Name is asked once and never again; outsiders are blocked.

## Phase 7: User Story 5 - End-of-challenge recognition (Priority: P2)

**Goal**: At the finish, celebrate showing up with four inclusive boards.
**Independent Test**: On a seeded dataset, all four boards compute correctly and a consistent short-distance logger can top at least one.

- [ ] T027 [US5] Implement getRecognition() in app/Code.gs computing the four boards: most days active, longest streak, most improved (locked formula in research.md Decision 6), and first to log. No participation board, no total-miles board.
- [ ] T028 [US5] Build the Recognition view in app/Client.html, rendered at completion (and viewable as current standings before then).
- [ ] T029 [P] [US5] Add unit checks in app/Tests.gs for step conversion, total reconciliation, milestone position, and each board's math.

**Checkpoint**: Boards are correct and inclusive; volume alone never wins.

## Phase 8: Polish & Launch

- [ ] T030 [P] Implement empty and day-one states and name-collision display (add a last initial) in app/Client.html.
- [ ] T031 [P] Add seedDemoData(n) and clearEntries() helpers in app/Tests.gs for testing the boards and completion.
- [ ] T032 [P] Load the final per-city celebration copy from spec.md Appendix A into the Config_Route celebrationMessage cells via app/Setup.gs.
- [ ] T033 Run every validation scenario in quickstart.md and fix anything that fails.
- [ ] T034 Run the launch checklist: set the real launchTimestamp, clear demo data, reset cachedTotalMiles to 0, confirm deployment access is the domain (not "anyone"), confirm the timezone, and eyeball the SVG so each city pin lines up with its cumulative-mile mark.

## Dependencies & Execution Order

### Phase Dependencies
- Setup (Phase 1): no dependencies.
- Foundational (Phase 2): depends on Setup; blocks all user stories.
- User Stories (Phases 3 to 7): depend on Foundational. US3 (celebrate) builds on US1 (log). US2 completion view and US5 recognition both depend on the completion logic in US1/US2. US4 identity essentials live in Foundational (T006), so its phase is thin.
- Polish (Phase 8): depends on the desired user stories being complete.

### Parallel Opportunities
- Within Phase 2, T011 (map) and T012 (styles) can run alongside the server tasks.
- Within a user story phase, [P] tasks touch different files and can run together.
- T029, T030, T031, T032 are independent and parallelizable.

## Implementation Strategy

### MVP first
Complete Setup and Foundational, then User Story 1 (log + effortless input + personal tally) and the core of User Story 2 (dot moving, next milestone). At that point you have a usable, demoable challenge: people log, the dot crosses, the total reconciles. Stop and validate before building celebration polish, US4 niceties, and US5 recognition.

### Incremental delivery
Each later story adds value without breaking earlier ones: richer celebration (US3), one-time name and access confirmation (US4), and the finish-line recognition boards (US5). Fitness sync is intentionally not in this list (research.md Decision 9).

## Quality Gates (self-check before calling build done)
- Every FR maps to at least one task: FR-001/002 (T013, T016), FR-003 (T009, T013), FR-004/005/006 (T007, T011, T019), FR-007 (T013, T021), FR-008 (T026, T006), FR-009 (T014, T017), FR-010 (T022), FR-011 (T024), FR-012 (T013, T018), FR-013 (T027), FR-014 (T012, T016), FR-015 (T002, T003, T032), FR-016 (not built, by decision), FR-017 (T017), FR-018 (T016).
- Recognition stays inclusive (T027): no participation board, no individual miles ranking.
- The total always reconciles (T009, T029, T033).
- The app needs no paid map key and no shared code.
