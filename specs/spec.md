# Feature Specification: Coast-to-Coast Literacy Challenge

**Created**: 2026-06-25
**Updated**: 2026-06-25
**Status**: Draft for review
**Owner**: Chris Geiser (chris.geiser@ignite-reading.com)

## Summary

We are building a web app that lets our whole organization (~150 FTEs) collectively "run" or "walk" across the United States, coast to coast. Every mile someone logs moves one shared dot along an iconic cross-country route from the Pacific to the Atlantic, passing recognizable cities along the way. The goal is a single full crossing. When the team reaches the far coast, the challenge concludes, we announce how long it took, and we celebrate with a set of inclusive recognition boards that anyone can top. The point is connection and recognition, not a race.

Why these choices, in one line each: coast-to-coast mirrors our mission to improve early literacy for every student in the US, a walk/run honors the Recharge theme of stepping away from the desk, and a virtual app fits a virtual company.

## Goals

The app exists to let anyone log a walk or run in seconds, show the team moving together across a map toward one coast-to-coast finish, and celebrate every contribution no matter how small. A first-grader's worth of steps and a marathoner's long run both move the dot.

## Non-Goals

This is not a fitness tracker or a wellness surveillance tool, and it is not a single volume-based ranking. We do crown winners at the end, but only through inclusive categories anyone can win (consistency, streaks, and improvement). We are deliberately not building a "most miles" race, because that would privilege people who already run and make a hard-won short walk feel like it counts less. We are not exposing anyone's detailed health data.

## User Scenarios & Testing

### User Story 1 - Log my activity (Priority: P1)

As a team member, I open the app, enter how far I walked or ran, and immediately see my miles added to the team total and the dot move toward the coast.

**Why this priority**: This is the MVP. Without logging, nothing else exists. If we shipped only this plus a basic total, we would have a working challenge.

**Independent Test**: Open the app on a phone, enter a distance, confirm the team total increases by that amount and a confirmation appears.

**Acceptance Scenarios**:

1. **Given** I am on the log screen, **When** I enter 3 miles and submit, **Then** the team total increases by 3 miles and I see a confirmation celebrating my contribution.
2. **Given** I prefer steps, **When** I enter 6,000 steps, **Then** the app converts it to roughly 3 miles (2,000 steps per mile) and adds it.
3. **Given** I mistype an entry, **When** I review my recent activity, **Then** I can edit or delete my own entry.

### User Story 2 - See the team crossing the map (Priority: P1)

As a team member, I see a US map with our shared dot positioned by total team miles, the route ahead, the next milestone city, and how far we have left to the Atlantic.

**Why this priority**: The map is the emotional core. It turns individual logging into a shared journey toward one finish line and is the thing people will screenshot and share.

**Independent Test**: With a known team total, load the map and confirm the dot sits at the correct point on the route and names the next milestone with miles remaining.

**Acceptance Scenarios**:

1. **Given** the team has logged 520 miles, **When** I open the map, **Then** the dot sits at the Salt Lake City milestone and shows miles to the next stop.
2. **Given** we pass a milestone city, **When** I open the map, **Then** that milestone shows as reached with its celebration message.
3. **Given** the team reaches the final coast, **When** I open the map, **Then** I see a finish celebration with total elapsed time and the recognition boards.

### User Story 3 - Celebrate every contribution (Priority: P1)

As any team member, I feel recognized when I log, regardless of distance, and I can see the team's collective story building toward the coast.

**Why this priority**: Inclusive celebration is an explicit requirement and a core value. A challenge that only celebrated big numbers would undercut the Recharge spirit.

**Independent Test**: Log a very short distance (0.25 miles) and confirm the response is warm and affirming, not dismissive, and that it visibly contributes.

**Acceptance Scenarios**:

1. **Given** I log any distance, **When** the entry saves, **Then** I see an encouraging message that frames my contribution as meaningful (for example, tying it to the mission).
2. **Given** the team hits a milestone, **When** I open the app, **Then** I see a shared celebration moment for that milestone.
3. **Given** I want to see participation, **When** I view the activity feed, **Then** I see contributions from across the team presented as a collective effort rather than a volume ranking.

### User Story 4 - Get into the app (Priority: P1)

As a team member, I reach the app through our Google-authenticated link, enter my display name once, and start logging.

**Why this priority**: People need a low-friction way in. Access is gated by Google authentication at the perimeter (only signed-in org members can reach the site), so the app itself stays simple and does not wire up its own Google OAuth for now.

**Independent Test**: Reach the app as a signed-in org member, set a display name, and log. Confirm the app is not reachable without passing the Google-authenticated perimeter.

**Acceptance Scenarios**:

1. **Given** I am a signed-in org member, **When** I open the link and enter my name, **Then** I reach the app and my future entries are attributed to that name.
2. **Given** I am not signed in to our Google workspace, **When** I try to open the link, **Then** I cannot reach the app.

### User Story 5 - End-of-challenge recognition (Priority: P2)

As a team member, when we complete the crossing, I see how long it took us and a set of inclusive recognition boards that celebrate showing up, not just speed or volume.

**Why this priority**: The finish is the payoff and the shareable moment for the org. It comes after the core logging and map (P1) but is essential to the "announce how long it took and crown winners" plan.

**Independent Test**: With a completed crossing in a test dataset, confirm the app shows elapsed time and correctly computed boards for each inclusive category.

**Acceptance Scenarios**:

1. **Given** the crossing completes, **When** I open the app, **Then** I see total elapsed time from launch to finish.
2. **Given** the crossing completes, **When** I view recognition, **Then** I see boards for inclusive categories: most consistent (most days active), longest streak, most improved, and first to log.
3. **Given** I logged even small distances regularly, **When** boards are shown, **Then** I can realistically appear on a board through consistency rather than volume.

### User Story 6 - Sync from a fitness app (Not planned)

Originally considered as an optional v2: connect Strava, Apple Health, Fitbit, or similar so distances flow in automatically. After investigating (research.md, Decision 9), we are not building this. The short version: the apps most walkers use (Apple Health on iPhone, Google Fit and Health Connect on Android) have no server API a web app can call, so reaching them would require building a native mobile app, which breaks the simple stack. The only providers with a usable web API are Strava (runner-centric, now paywalled and requiring app review beyond 10 users) and Fitbit (a small share of devices). Sync would therefore mostly help runners while the walkers the challenge is designed to include would still enter theirs by hand. That is the most work for the least benefit to the people we care about, so manual entry stays the single path, and we make it as fast as possible instead.

### Edge Cases

A few things the build needs to handle gracefully. Duplicate or accidental double submissions should be editable or deletable by the person who made them. Unrealistic single entries (for example, 500 miles in one day) should trigger a gentle confirmation prompt rather than silently inflating the total, since the honor system is the trust model here. Steps and miles must reconcile cleanly so the running total never disagrees with the sum of entries. When the team total reaches the final milestone, the app must lock the goal as complete, record the finish time, and switch to the celebration and recognition view rather than continuing past the coast. Any miles logged after completion should be welcomed as a victory lap but should not be required and should not change the finish time. Names that collide (two people named "Sam") should be distinguishable, for example by adding a last initial. Empty states (day one, zero miles) should still feel inviting, not broken.

## Requirements

### Functional Requirements

- **FR-001**: Users MUST be able to log an activity by entering either miles or steps.
- **FR-002**: System MUST convert steps to miles at a documented rate (default 2,000 steps = 1 mile) and store a single canonical distance unit.
- **FR-003**: System MUST add each logged distance to a single shared team total.
- **FR-004**: System MUST position one shared dot on a US coast-to-coast route based on the team total.
- **FR-005**: System MUST display the next milestone city and miles remaining, plus miles remaining to the final coast.
- **FR-006**: System MUST mark milestones as reached and show a celebration message for each.
- **FR-007**: System MUST treat one full crossing as the goal: when the team total reaches the final milestone distance, the system MUST lock completion, record the finish timestamp, and display total elapsed time from launch.
- **FR-008**: System MUST be reachable only through the org's Google-authenticated perimeter, and MUST capture a display name in-app. The app itself does NOT implement Google OAuth in this version.
- **FR-009**: Users MUST be able to view, edit, and delete their own entries.
- **FR-010**: System MUST present an inclusive, encouraging confirmation for any logged distance, including very short ones.
- **FR-011**: System MUST show a collective activity view that frames contributions as shared effort, not a volume ranking.
- **FR-012**: System MUST prompt for confirmation on entries above a configurable plausibility threshold before adding them.
- **FR-013**: System MUST present end-of-challenge recognition boards for inclusive categories only: most days active (consistency), longest streak, most improved, and first to log. The system MUST NOT present a total-miles ranking of individuals, and MUST NOT track or display participation rates (this is a collective challenge, not a turnout contest).
- **FR-014**: System MUST be usable on a phone screen as the primary device, and on desktop.
- **FR-015**: System SHOULD let an admin configure the route, milestones, target distance, and step conversion rate without code changes.
- **FR-016**: System will NOT integrate automatic fitness-app sync (Strava, Apple Health, Google Fit / Health Connect, Fitbit, Garmin). This is a deliberate decision, not a deferral; see research.md Decision 9 for the feasibility analysis. Manual entry is the only input method, and the UI MUST make it trivial to type in the number from whatever device or app a person already uses.
- **FR-017**: System MUST show each person their own private, non-ranked personal tally (their total miles and their recent entries), visible only to them. This is never compared to others and never shown as a leaderboard.
- **FR-018**: Effortless input. Since manual entry is the only path, the log flow MUST minimize friction. It MUST default the activity date to today, remember and preselect each person's last-used unit (miles or steps), persist identity and display name so they are never re-entered, show the step-to-mile conversion inline as the person types (for example "6,000 steps = 3.0 mi"), and offer a few one-tap quick-add chips for common distances (admin-configurable, for example 1, 2, 3, and 5 miles). A same-day entry MUST be achievable by entering one number and confirming.

### Privacy and Trust

Because the app sits behind the org's Google-authenticated perimeter, only signed-in colleagues can reach it. The app reads the signed-in Google identity, so each entry is tied to a verified person (no impersonation), with a friendly display name shown on top. The app collects only that identity, a display name, and self-reported distances. It should not store detailed health metrics. If fitness sync is added later, it must request the narrowest scope possible (distance only) and let people disconnect at any time.

### Key Entities

- **Participant**: A person in the challenge, identified by their signed-in Google identity. Attributes: verified email, friendly display name, join date, and derived recognition stats (days active, current and longest streak, improvement trend). No password and no app-level OAuth in this version.
- **Activity Entry**: One logged walk or run. Attributes: participant, raw input (miles or steps), canonical distance in miles, date and timestamp, source (manual or a named fitness app), optional note or photo.
- **Team Progress**: The single shared state. Attributes: cumulative total miles, current position along the route, milestones reached, completion state, launch timestamp, and finish timestamp once complete.
- **Route**: The coast-to-coast path. Attributes: ordered list of milestone stops, each with a name, location, cumulative distance from start, and a celebration message. Total crossing distance is the last milestone's cumulative value and serves as the goal.
- **Milestone**: A city on the route. Attributes: name, cumulative miles from start, short celebration message, reached state.
- **Recognition Board**: An end-of-challenge category. Attributes: category name, computation rule (for example, count of distinct active days), and ranked results. Categories are inclusive by design.

## Success Criteria

### Measurable Outcomes

- **SC-001**: A new person can go from opening the app to logging their first activity in under 60 seconds.
- **SC-002**: Logging a single activity takes under 20 seconds and no more than three taps or fields.
- **SC-003**: (Removed) We intentionally do not track an overall participation rate. The challenge is collective, not a turnout contest, so there is no signups-versus-FTE metric. ID retained so later requirements keep stable numbering.
- **SC-004**: The team completes one full coast-to-coast crossing (~2,984 miles), and the app reports the exact elapsed time from launch to finish.
- **SC-005**: The map and team total agree with the sum of all entries at all times (zero reconciliation errors).
- **SC-006**: 100% of logged distances, including the shortest, produce a positive confirmation and visibly move the total.
- **SC-007**: At completion, every inclusive recognition board computes correctly, and at least one board can be topped by a participant who logged only short distances consistently.
- **SC-008**: The app works on common phones and laptops with no install required (a shared, Google-gated link is enough).

## Open Questions

No blocking open questions remain. Resolutions: the route is San Francisco to New York (start stays in San Francisco; Ignite's origin in Oakland is noted in the start-city copy); identity is the verified Google sign-in (no shared code); overall participation is intentionally not tracked; the private, non-ranked personal tally is included (FR-017); and automatic fitness-app sync is not being built (FR-016, research.md Decision 9).

---

## Appendix A: Cross-Country Route (proposed)

A clean, iconic Pacific-to-Atlantic line from San Francisco to New York following common interstate driving routes (I-80 across the West and Midwest, then I-90 and I-76 corridors through the East), about 2,985 miles end to end, which is the goal distance for the single crossing. Each city is a celebration checkpoint that the dot passes through, so progress feels like a real road trip across the country. The crossing itself is the mission metaphor (reaching every student, coast to coast). On top of that, most stops carry a real literacy connection, four of them tied directly to the Science of Reading, which gives each milestone something genuine to celebrate. Those connections are listed under the distance table below.

Distances are real intercity driving distances, looked up and rounded to the nearest mile (sources listed below the table). They should still be sanity-checked against the final on-screen map path, since the rendered route geometry can differ slightly from road mileage.

| # | City | Segment miles | Cumulative miles |
|---|------|---------------|------------------|
| 1 | San Francisco, CA (Pacific start; Ignite began in Oakland) | 0 | 0 |
| 2 | Sacramento, CA | 87 | 87 |
| 3 | Reno, NV | 132 | 219 |
| 4 | Salt Lake City, UT | 518 | 737 |
| 5 | Cheyenne, WY | 439 | 1,176 |
| 6 | Omaha, NE | 494 | 1,670 |
| 7 | Des Moines, IA | 134 | 1,804 |
| 8 | Chicago, IL | 332 | 2,136 |
| 9 | Cleveland, OH | 344 | 2,480 |
| 10 | Pittsburgh, PA | 135 | 2,615 |
| 11 | New York, NY (Atlantic finish) | 369 | 2,984 |

Goal distance: 2,984 miles (round to ~3,000 for messaging). Segment sources: SF to Sacramento [87 mi](https://distancecalc.com/how-far-from-san-francisco-ca-to-sacramento-ca), Sacramento to Reno [132 mi](https://www.travelmath.com/drive-distance/from/Sacramento,+CA/to/Reno,+NV), Reno to Salt Lake City [518 mi](https://distancecalc.com/how-far-from-salt-lake-city-ut-to-reno-nv), Salt Lake City to Cheyenne [439 mi](https://distancecalc.com/how-far-from-salt-lake-city-ut-to-cheyenne-wy), Cheyenne to Omaha [494 mi](https://www.travelmath.com/distance/from/Cheyenne,+WY/to/Omaha,+NE), Omaha to Des Moines [134 mi](https://www.distance-cities.com/distance-omaha-ne-to-des-moines-ia), Des Moines to Chicago [332 mi](https://distancecalc.com/how-far-from-des-moines-ia-to-chicago-il), Chicago to Cleveland [344 mi](https://www.distance-cities.com/distance-chicago-il-to-cleveland-oh), Cleveland to Pittsburgh [135 mi](https://www.distance-cities.com/distance-cleveland-oh-to-pittsburgh-pa), Pittsburgh to New York [369 mi](https://www.travelmath.com/drive-distance/from/Pittsburgh,+PA/to/New+York,+NY).

### Celebrate at each stop (literacy connections)

One honest framing first. Four stops (Sacramento, Cleveland, Pittsburgh, and New York) carry a real, foundational Science of Reading connection. The others are author or literary ties, worth celebrating but not Science of Reading as such. Two stops (Reno and Cheyenne) are genuinely thin, so I kept them light rather than overselling. All connections are sourced so you can verify before using any of this publicly.

1. **San Francisco, CA** (home + literary): The start is home turf. We launch from San Francisco, the iconic Pacific edge, and Ignite Reading itself began just across the bay in Oakland, so the journey starts where the work started. San Francisco is also the birthplace of poet Robert Frost in 1874, the only poet to win four Pulitzer Prizes. Suggested line: "We start where Ignite started, Bay Area to the Atlantic." [Frost](https://www.poetryfoundation.org/poets/robert-frost) (Ignite origin in Oakland per company history; no external source needed.)
2. **Sacramento, CA** (Science of Reading): California's capital, where the state's 2025 literacy law (AB 1454) was signed, moving California toward explicit, systematic, evidence-based reading instruction. Also the birthplace of writer Joan Didion. [SoR law](https://edsource.org/2025/governor-newsom-signs-literacy-bill/742396), [Didion](https://www.britannica.com/biography/Joan-Didion)
3. **Reno, NV** (literary, lighter): Home of the Nevada Writers Hall of Fame at the University of Nevada, Reno. [source](https://library.unr.edu/nevada-writers-hall-of-fame)
4. **Salt Lake City, UT** (literacy advocate): Home of children's and YA author Shannon Hale, who tours schools across Utah to get kids reading. [source](https://kslnewsradio.com/utah/utah-read-shannon-hale/2276400/)
5. **Cheyenne, WY** (literary, lighter): A nod to Wyoming's literary tradition, including poet laureate Eugene Gagliano, who writes award-winning children's books. [source](https://www.wyohistory.org/blog/wyoming-poets-laureate)
6. **Omaha, NE** (author): Home of bestselling YA author Rainbow Rowell (Eleanor & Park, Fangirl). [source](https://nebraskaauthors.org/authors/rainbow-rowell)
7. **Des Moines, IA** (author): Birthplace of bestselling author Bill Bryson. [source](https://en.wikipedia.org/wiki/Bill_Bryson)
8. **Chicago, IL** (children's author): Birthplace of beloved children's poet Shel Silverstein (Where the Sidewalk Ends, The Giving Tree), a gateway to reading for millions of kids. [source](https://chicagoliteraryhof.org/inductees/profile/shel-silverstein)
9. **Cleveland, OH** (Science of Reading): Ohio's 2023 law (HB 33) now requires evidence-based, phonics-first instruction statewide and bans the discredited three-cueing method. Cleveland is also where a teenage Langston Hughes found his voice at Central High. [SoR law](https://ohiocapitaljournal.com/2024/08/22/science-of-reading-curriculum-is-now-being-taught-in-all-ohio-school-districts/), [Hughes](https://case.edu/ech/articles/h/hughes-james-langston)
10. **Pittsburgh, PA** (Science of Reading): Home of the University of Pittsburgh's Learning Research and Development Center, where Charles Perfetti (the most-cited reading researcher in education), Isabel Beck, and Margaret McKeown built much of the modern science of reading, from word recognition to robust vocabulary instruction. [Perfetti](https://en.wikipedia.org/wiki/Charles_Perfetti), [Beck](https://www.lrdc.pitt.edu/people/researcher-detail.cshtml?id=86)
11. **New York, NY** (Science of Reading): The country's publishing capital, and home of NYC Reads (2023), the largest US school system shifting to Science of Reading curricula. Suggested line: "Coast to coast. We made it together." [source](https://www.chalkbeat.org/newyork/2024/09/06/what-to-know-about-nyc-reads-curriculum-mandate-for-schools/)

Illustrative pacing only: if 150 people each log about 3 miles per week (450 miles/week), one crossing takes roughly 6 to 7 weeks. Launching at the retreat means the finish likely lands in late summer, which gives the org a clear, announceable result. These are estimates to set expectations, not commitments.

## Appendix B: Recommended Build (simplest Claude Code stack)

This is the HOW in brief. The full technical design lives in plan.md, research.md, data-model.md, and contracts/, which supersede this appendix.

The chosen stack is Google-native: a Google Apps Script web app serves one page, and a Google Sheet is the database. Deploying the web app restricted to the Workspace domain is what gates access behind Google sign-in, and Apps Script reads the signed-in user's identity for free, so there is no app-level OAuth and no shared code. The US map is a stylized inline SVG with the route drawn as one path; the dot's position is simply team miles divided by the goal along that path, so no map API key or billing account is needed. This keeps cost near zero and lets a non-engineer maintain the data in a familiar spreadsheet.

Manual entry is the core build. Recognition boards (FR-013) compute from stored entries at the finish, so they need no extra infrastructure. Fitness sync (FR-016) is a clearly separated later phase because each provider adds OAuth and API review overhead. Recommend shipping manual-only for the retreat, then deciding on sync based on real demand.

## Appendix C: What I'd flag (blunt feedback)

With the app behind Google auth, the login risk I flagged earlier is fully handled: only colleagues get in, and because the app reads the signed-in Google identity, every entry is tied to the real person, so there is no impersonation and no shared code to leak. The honor system on distances still applies, hence the plausibility prompt in FR-012, but the stakes are purely celebratory so that is acceptable. Keeping the boards to inclusive categories was the right call; the moment you add a "most miles" board, the quiet message becomes "more is better," which fights the whole premise. Switching to a city-to-city route also removed the biggest open dependency, since the route no longer waits on per-stop content. The distances are now real looked-up mileages (goal ~2,984 miles), so the dot's position will track honestly. The only remaining nuance is that the rendered map path can differ slightly from road mileage, so glance at the on-screen geometry once before launch to make sure a city's pin lines up with its cumulative-mile mark.

---

## Next Steps

If this spec looks right, the natural follow-ons are a `plan.md` (technical plan with the stack above made concrete) and a `tasks.md` (an executable, build-ordered task list for Claude Code). Say the word and I will draft those next.
