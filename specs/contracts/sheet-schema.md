# Sheet Schema (exact column order for builders)

The concrete column layout Setup.gs should create. Full field meanings are in data-model.md. Keep column order exactly as below so the server code can read by index.

## Spreadsheet: "Coast to Coast Challenge"

### Tab: Config_Settings
Row 1 headers: `key | value`. One row per setting:
launchTimestamp, goalMiles, stepsPerMile, plausibilityThresholdMiles, completionTimestamp, cachedTotalMiles, startCityLabel.

### Tab: Config_Route
Row 1 headers, then 11 data rows (see data-model.md for values):
`order | city | cumulativeMiles | celebrationMessage | sorTag`

### Tab: Entries
Row 1 headers, append-only:
`entryId | userEmail | displayName | inputType | inputValue | miles | note | source | activityDate | createdAt`

### Tab: Participants
Row 1 headers, one row per person (created on first display-name set):
`email | displayName | joinedAt`

## Manifest: appsscript.json (key fields)

```json
{
  "timeZone": "America/Los_Angeles",
  "runtimeVersion": "V8",
  "webapp": {
    "access": "DOMAIN",
    "executeAs": "USER_ACCESSING"
  }
}
```

`access: DOMAIN` restricts the app to your Workspace and is what gates it behind Google sign-in. `executeAs: USER_ACCESSING` ensures Session.getActiveUser().getEmail() returns the visitor's identity. Confirm the timeZone matches the company's primary timezone before launch.
