# API Contract: Client to Server

The client calls these server functions with google.script.run (async, returns via success handlers). All functions read the caller's identity from the server session, so the client never passes an email. The server is the only thing that writes miles, so the client cannot forge a distance.

Shapes below are described as plain JSON for clarity.

## getState()

Returns everything the UI needs to render on load.

Parameters: none.

Returns:
```json
{
  "user": { "email": "string", "displayName": "string|null" },
  "config": {
    "goalMiles": 2984,
    "stepsPerMile": 2000,
    "plausibilityThresholdMiles": 50,
    "startCityLabel": "string",
    "launchTimestamp": "ISO string"
  },
  "route": [ { "order": 1, "city": "string", "cumulativeMiles": 0, "celebrationMessage": "string", "sorTag": "home|sor|literary" } ],
  "progress": {
    "totalMiles": 0,
    "fractionComplete": 0.0,
    "nextMilestone": { "city": "string", "milesRemaining": 0 },
    "milesToCoast": 2984,
    "milestonesReached": ["string"],
    "isComplete": false,
    "elapsed": null
  },
  "myEntries": [ { "entryId": "string", "miles": 0, "inputType": "miles|steps", "inputValue": 0, "note": "string", "activityDate": "date", "createdAt": "ISO string" } ],
  "myTotalMiles": 0,
  "recentActivity": [ { "displayName": "string", "miles": 0, "activityDate": "date" } ]
}
```

Notes: If displayName is null, the client shows the one-time name prompt before allowing logging. recentActivity is a non-ranked shared feed (spec FR-011).

## setDisplayName(name)

Sets or updates the caller's friendly display name. Stored against the caller's verified email.

Parameters: `name` (string, required, trimmed, 1 to 40 chars).

Returns: `{ "ok": true, "displayName": "string" }`

Errors: `{ "ok": false, "error": "INVALID_NAME" }`

## logActivity(payload)

Validates, converts steps to miles if needed, writes one Entry, updates the cached total under a lock, and returns the new state plus a celebration message.

Parameters:
```json
{
  "inputType": "miles|steps",
  "inputValue": 3.0,
  "note": "optional string",
  "activityDate": "YYYY-MM-DD (optional, defaults to today)",
  "confirmedOverThreshold": false
}
```

Behavior:
- Reject if inputValue is missing or not a positive number: `{ "ok": false, "error": "INVALID_VALUE" }`.
- Compute miles (steps / stepsPerMile when inputType is steps).
- If miles > plausibilityThresholdMiles and confirmedOverThreshold is false, return `{ "ok": false, "error": "NEEDS_CONFIRMATION", "miles": 72.5 }` so the client can ask "Log 72.5 miles?" and resend with confirmedOverThreshold true.
- Otherwise append the Entry, update cachedTotalMiles under LockService, set completionTimestamp if this write reaches the goal.

Returns on success:
```json
{
  "ok": true,
  "entryId": "string",
  "milesLogged": 3.0,
  "celebrationMessage": "string, warm and inclusive, references the mission",
  "progress": { "...": "same shape as getState().progress" },
  "milestoneJustReached": { "city": "string", "celebrationMessage": "string" } 
}
```
milestoneJustReached is null unless this entry pushed the dot past a new city. If this entry completes the crossing, progress.isComplete is true and progress.elapsed is set.

## updateEntry(entryId, payload)

Edits one of the caller's own entries. Same validation as logActivity. Recomputes the cached total under a lock.

Parameters: `entryId` (string), plus the same fields as logActivity.

Returns: `{ "ok": true, "progress": { ... } }`

Errors: `NOT_FOUND`, `NOT_OWNER`, `INVALID_VALUE`.

## deleteEntry(entryId)

Deletes one of the caller's own entries and recomputes the cached total under a lock.

Parameters: `entryId` (string).

Returns: `{ "ok": true, "progress": { ... } }`

Errors: `NOT_FOUND`, `NOT_OWNER`.

## getRecognition()

Computes the inclusive boards. Intended for the completion view, but callable anytime (shows current standings).

Parameters: none.

Returns:
```json
{
  "isComplete": true,
  "elapsed": { "days": 0, "hours": 0 },
  "boards": [
    {
      "key": "most_days_active|longest_streak|most_improved|first_to_log",
      "title": "string",
      "rule": "short plain-language description",
      "rows": [ { "displayName": "string", "value": "number or string" } ]
    }
  ]
}
```
Four boards only. There is no participation board and no participation metric. No board ranks individuals by total miles (spec FR-013).

## Server-only helpers (not called by the client)

- recomputeTotal(): rebuilds cachedTotalMiles from the sum of Entries.miles (integrity, spec SC-005).
- doGet(): serves Index.html.

## Cross-cutting rules

Identity always comes from the server session, never the client. All writes take a LockService lock to keep cachedTotalMiles correct under concurrency. The client treats every server miles value as authoritative and never computes the team total itself.
