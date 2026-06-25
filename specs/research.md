# Research and Decisions: Coast-to-Coast Literacy Challenge

This is the decision log behind the plan. Each entry states what we chose, why, and what we passed on.

## Decision 1: Platform and data store, Apps Script + Google Sheets

Decision: Build the app as a Google Apps Script web app with a Google Sheet as the database.

Rationale: Access is gated by Google sign-in for free, since the web app deploys as "restricted to your Workspace domain." There are no extra accounts, no hosting bill, and a non-engineer can open the Sheet to see or fix data. Apps Script also hands us the signed-in user's identity, which we use for attribution. For ~150 people and a few thousand entries, Sheets is comfortably within limits.

Alternatives considered: A static single-page app with a Supabase database behind a Google-login layer (Cloudflare Access). This gives a slicker UI and easier animation, but it adds two free-tier accounts, a separate auth layer to configure, and more moving parts to maintain. Rejected for v1 on the "simplest for a non-engineer to run" principle. Firebase was also considered and rejected for the same reason (more setup, billing account required for some features).

## Decision 2: Map rendering, stylized SVG (not Google Maps or Mapbox)

Decision: Render the US as a stylized inline SVG. Draw the route as one SVG path. Place the dot with path.getPointAtLength(fraction * path.getTotalLength()), where fraction is team miles divided by goal miles. Place milestone markers at their own cumulative-mile fractions.

Rationale: The content is one fixed line and one moving dot, so we do not need pan, zoom, or real tiles. SVG needs no API key, no billing account, and no external tile provider. It animates smoothly, themes to Ignite colors, and the position math is a single built-in call. It is also the most reliable option, with no risk of a third-party quota or key expiring mid-challenge.

Alternatives considered: Google Maps JavaScript API embeds cleanly in an Apps Script page but requires a billing-enabled API key even when usage stays in the free tier, which is friction and a small ongoing risk. Mapbox requires an access token and account. Both add realism that this use case does not need. Documented as an optional later upgrade: if a real map is ever wanted, swap the Map.html SVG for a Maps/Mapbox view and reuse the same fraction-along-route logic with a polyline.

## Decision 3: Identity, use the signed-in Google user (drop the shared code)

Decision: Identify each participant by the email from Session.getActiveUser().getEmail(), and let them set a friendly display name once. Attribute all entries to that verified identity.

Rationale: The domain-restricted deployment already requires Google sign-in, so we get verified identity at no extra cost and without implementing OAuth ourselves (which Chris asked us to avoid). This is strictly better than the spec's original shared code: nobody can post as someone else, and there is no code to distribute or leak. It also makes the recognition boards trustworthy.

Alternatives considered: The shared team code from the spec (weaker, self-asserted, anyone could impersonate) and full app-level Google OAuth (unnecessary work, explicitly declined). This decision supersedes spec FR-008 and the "self-asserted attribution" caveat; see the spec-update note in plan.md.

## Decision 4: Step-to-mile conversion, 2,000 steps per mile (configurable)

Decision: Convert steps to miles at 2,000 steps per mile, stored as an editable value in the Config tab.

Rationale: 2,000 steps per mile is a widely used, easy-to-explain default that keeps walkers and runners on equal footing. Storing it in Config lets an admin adjust without code. We store one canonical unit (miles) on every entry so the total never depends on re-converting.

Alternatives considered: Per-user stride calibration (more accurate, far more friction, not worth it for a morale challenge). A fixed value buried in code (works, but not admin-editable).

## Decision 5: Plausibility guard, soft confirm above a threshold

Decision: If a single entry exceeds a configurable threshold (default 50 miles), the app asks the person to confirm before saving. It never blocks; it just double-checks.

Rationale: The honor system is the trust model, and the perimeter is colleagues only, so we do not need hard validation. A soft confirm catches fat-finger errors (typing steps into the miles field, for example) without making honest big efforts feel policed. Threshold lives in Config.

Alternatives considered: Hard caps (punitive, could reject a real ultra-runner) and no guard at all (one mistyped entry could rocket the dot across two states and spoil the shared total).

## Decision 6: Recognition board rules (inclusive by construction)

Decision: At completion, compute four boards, all from the Entries data:

- Most days active: count of distinct calendar dates a person logged on. Rewards showing up.
- Longest streak: longest run of consecutive active days.
- Most improved: see the locked formula below. Rewards growth, not starting fitness.
- First to log: earliest first-entry timestamp. A fun "out of the gate" nod.

There is no participation board and no overall participation metric, by decision. The challenge is collective, not a turnout contest, and we do not want to surface who did or did not take part.

Most improved, locked formula: (average daily miles in the person's last active week) minus (average daily miles in their first active week), ranked descending. A person must have at least two distinct active weeks to qualify, which keeps the board meaningful and avoids a single-week fluke winning. "Week" is a calendar week in the deployment timezone. This is relative to each person's own baseline, so a walker who grows from short to slightly longer walks can win it, not just fast runners.

Rationale: None of these is won by raw volume, so they protect the "every distance counts" value while still crowning real winners. They all compute from data we already store, so no extra infrastructure.

Alternatives considered: A total-miles board (explicitly rejected in the spec, since it privileges existing runners and undercuts the premise). "Most improved" by absolute miles was rejected in favor of the relative measure above. A department participation board was considered and dropped, because tracking participation by team cuts against the collective spirit and requires maintaining a team roster.

## Decision 7: Concurrency, cached total under LockService

Decision: Keep a single cached "total miles" value (in Config or a small Progress area) and update it inside a LockService lock on every write. getState reads the cached value; a periodic or on-write recompute keeps it honest against the sum of Entries.

Rationale: Summing all rows on every read is fine at first but slows as entries grow, and concurrent writes could race. A lock around the append-and-increment keeps the total correct, and getState stays fast. We also expose a recompute function so the cached total can be rebuilt from Entries if anything ever drifts (satisfies the spec's zero-reconciliation-error criterion).

Alternatives considered: Recompute-on-every-read (simple, but slower over time and still race-prone on writes) and a full transactional database (overkill at this scale).

## Decision 8: Scope guardrails for v1

Decision: No photos and no fitness sync in v1, per the spec and the plan answers.

Rationale: Photos add file storage and moderation; sync adds OAuth per provider. Both are real features with real cost, and neither is needed to deliver the core experience of logging, watching the dot cross, and celebrating at the finish. Photos are a possible future phase. Fitness sync was investigated in depth and is a no-go (Decision 9).

## Decision 9: Fitness-app sync, do not build it (investigated, not deferred)

Decision: Do not build automatic fitness-app sync, for v1 or as a planned v2. Manual entry stays the single input path, and we make typing in a number from any device fast and friendly.

This was investigated rather than assumed, because the question is "do we even want this." The finding is that the integration landscape is actively hostile to the people this challenge is built for.

What the providers actually allow (June 2026):

- Apple Health: there is no cloud or server API. HealthKit data lives on the iPhone only. The single way to get it off the device is a native iOS app that reads HealthKit and uploads. A web app (our Apps Script) cannot read Apple Health at all. This matters because a large share of walkers track steps in Apple Health by default. [Apple: no backend API](https://www.themomentum.ai/blog/do-you-need-a-mobile-app-to-access-apple-health-data)
- Google Fit / Android: the Google Fit REST API is deprecated, closed to new sign-ups since May 1, 2024, and shuts down at the end of 2026. Its replacement, Health Connect, is on-device on Android and again needs a native Android app. So the Android phone-step path is also closed to a web app. [Google Fit migration](https://developer.android.com/health-and-fitness/health-connect/migration/fit)
- Strava: has a usable OAuth web API, but free API access is being replaced by a paid tier (a Strava subscription is required for the Standard developer tier), the Standard tier serves only up to 10 connected athletes, and going beyond 10 requires submitting the app for Strava's review. It is also runner-centric. [Strava developer update](https://communityhub.strava.com/insider-journal-9/an-update-to-our-developer-program-13428), [Strava rate limits and tiers](https://developers.strava.com/docs/rate-limits/)
- Fitbit: has a clean OAuth web API with free developer registration that returns steps and distance, but only Fitbit device owners benefit, which is a minority of any general workforce. [Fitbit Web API](https://dev.fitbit.com/build/reference/web-api/developer-guide/)
- Garmin: requires applying to a partner program, and the Garmin Connect Developer Program is currently on hold, so you cannot even sign up right now. Also a minority of devices. [Garmin Health API](https://developer.garmin.com/gc-developer-program/health-api/)

Why this is a no-go, not a maybe-later: the only providers with a web API our stack can call are Strava and Fitbit, which together skew to runners and a small slice of device owners. The apps the broad set of walkers actually use (Apple Health, Google Fit / Health Connect) cannot be reached without building and maintaining a native mobile app, which is a different and much larger project that breaks the "simple, non-engineer-maintainable" premise. So sync would deliver the most engineering complexity for the least benefit to exactly the people the challenge is designed to include, and it would quietly hand runners a convenience that walkers do not get, which cuts against the inclusivity goal.

Alternatives considered: a native iOS plus Android app to reach Apple Health and Health Connect (rejected: wrong scale and skillset for this, and ongoing app-store maintenance). A Strava-only "Connect" button (rejected for v1: paywall plus app review plus runner skew). A third-party aggregator like Thryve, Spike, or Validic that normalizes all providers behind one API (rejected: real per-month cost and vendor dependency for a short internal morale challenge). If there is ever loud, specific demand from the running crowd, a single optional Strava connect could be revisited as a true extra, but it is explicitly out of scope now.

Mitigation: make manual entry effortless. People glance at whatever watch or phone app they already use and type the number. That works for every device, every person, with no accounts to connect and nothing to maintain.
