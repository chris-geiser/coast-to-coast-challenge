# Data Model: Coast-to-Coast Literacy Challenge

The database is one Google Sheet with a few tabs. Distances are always stored in miles, so the running total never depends on re-converting steps. Times are stored as ISO timestamps in the Sheet's timezone.

## Tab: Config

A simple key/value tab plus the route. The route rows define the milestones and the goal (the last row's cumulative miles).

Settings (key/value):

| Key | Example value | Notes |
|-----|---------------|-------|
| launchTimestamp | 2026-07-15T09:00:00 | When the challenge starts; used for elapsed time |
| goalMiles | 2984 | One full crossing; equals the last milestone's cumulative miles |
| stepsPerMile | 2000 | Step-to-mile conversion (Decision 4) |
| plausibilityThresholdMiles | 50 | Single-entry soft-confirm threshold (Decision 5) |
| completionTimestamp | (blank until reached) | Set once when total first reaches goalMiles |
| cachedTotalMiles | 0 | Running team total, updated under lock (Decision 7) |
| startCityLabel | San Francisco / Bay Area | Display label for the start |

Route (one row per milestone, in order):

| order | city | cumulativeMiles | celebrationMessage | sorTag |
|-------|------|-----------------|--------------------|--------|
| 1 | San Francisco / Bay Area, CA | 0 | We start where Ignite started, Bay Area to the Atlantic. | home |
| 2 | Sacramento, CA | 87 | California's capital, where the 2025 Science of Reading law was signed. | sor |
| 3 | Reno, NV | 219 | Into Nevada. | literary |
| 4 | Salt Lake City, UT | 737 | Across the Great Basin. | literary |
| 5 | Cheyenne, WY | 1176 | Through the Rockies, onto the high plains. | literary |
| 6 | Omaha, NE | 1670 | Over the Missouri, past halfway. | literary |
| 7 | Des Moines, IA | 1804 | Heart of the heartland. | literary |
| 8 | Chicago, IL | 2136 | The Windy City, home of Shel Silverstein. | literary |
| 9 | Cleveland, OH | 2480 | Ohio now teaches reading by the science. | sor |
| 10 | Pittsburgh, PA | 2615 | Birthplace of much of the modern science of reading. | sor |
| 11 | New York, NY | 2984 | Coast to coast. We made it together. | sor |

The celebrationMessage and sorTag fields let the UI show the right copy and optionally style the four Science of Reading stops differently. Full sourced descriptions live in spec.md Appendix A.

## Tab: Entries

One row per logged activity. This is the source of truth; everything else can be recomputed from it.

| Field | Type | Notes |
|-------|------|-------|
| entryId | string (UUID) | Generated server-side |
| userEmail | string | From Session.getActiveUser().getEmail(); verified identity |
| displayName | string | Friendly name the user set |
| inputType | enum: miles \| steps | What the user entered |
| inputValue | number | The raw number they typed |
| miles | number | Canonical distance; if steps, inputValue / stepsPerMile |
| note | string | Optional short text |
| source | enum: manual \| (future: strava, etc.) | manual for v1 |
| activityDate | date | The day the activity happened (defaults to today) |
| createdAt | timestamp | When the row was written |

Validation rules: inputValue must be a positive number. miles is always derived and stored, never trusted from the client. If miles exceeds plausibilityThresholdMiles, the client must have confirmed (the server records it normally either way). A user may edit or delete only rows where userEmail equals their own.

## Derived / In-Memory State (not stored)

These are computed by getState() and returned to the client. They are not separate tabs.

- totalMiles: cachedTotalMiles (kept in sync with the sum of Entries.miles).
- fractionComplete: min(totalMiles / goalMiles, 1).
- currentSegment: the two milestones the dot sits between, by cumulative miles.
- nextMilestone: name and milesRemaining to the next city.
- milesToCoast: goalMiles minus totalMiles (floored at 0).
- milestonesReached: list of milestones whose cumulativeMiles <= totalMiles.
- isComplete: totalMiles >= goalMiles.
- elapsed: completionTimestamp minus launchTimestamp, when complete.
- myEntries: the calling user's recent entries (for edit/delete and a private personal tally).
- recentActivity: a collective, non-ranked feed of recent entries (name + distance + city-ish flavor), framed as shared effort.

## Recognition (computed at completion by getRecognition)

Computed from Entries, returned as a list of boards. Each board has a title, a short rule description, and ranked rows (displayName, value). Four boards: most days active, longest streak, most improved (locked formula in research.md Decision 6), and first to log. No participation board, and no overall participation metric, by decision.

## Integrity

cachedTotalMiles is updated under LockService on each write. A recomputeTotal() function rebuilds it from the sum of Entries.miles so the displayed total can always be reconciled to the entries exactly (spec SC-005).
