# AWS Architecture: Coast-to-Coast Literacy Challenge

> **SUPERSEDED (2026-07-08).** We chose to ship on a Google Sheet backend instead of AWS. See [sheet-backend.md](sheet-backend.md) for the live design. This document is kept for history and in case scale ever forces a move to AWS. Nothing here is being built.

**Date**: 2026-06-25 | **Status**: Superseded by sheet-backend.md | **Supersedes**: the Apps Script stack in plan.md and research.md Decisions 1 and 3

## Why this document exists

The stack changed. The app is moving to AWS behind perimeter authentication on an Ignite sub-domain, with a static prototype on GitHub Pages in the meantime. The Google Apps Script plus Sheets design was built around one thing: Google Workspace domain restriction giving us a free access gate and free verified identity. On AWS that rationale goes away, so the whole backend gets redesigned. This is the design to approve before we build.

Two honest tradeoffs up front, because they matter more than any box on a diagram:

- **We lose "a non-engineer can run it."** That was a core value in the spec (maintainable from a familiar spreadsheet, near-zero cost). AWS is a real operations surface: an account, IAM, infrastructure-as-code, deploys, monitoring, and a bill. Someone has to own that. If there is no engineering or DevOps owner, we should talk before committing, because this is the single biggest change.
- **Cost is low, not zero.** At ~150 users and a few thousand entries this lands in the low single digits of dollars a month on serverless, possibly near free-tier, but I will not promise free. Exact numbers are [DATA NEEDED] once we pick the pieces.

## What carries over from the spec, unchanged

The product does not change. Every distance celebrated equally, no individual miles ranking, the four inclusive boards, the team total always reconciling to the sum of entries, steps converting at 2,000 per mile, the 2,984-mile goal, mobile-first. The architecture below preserves all of it. The reconciliation guarantee in particular drove a specific database choice.

## Recommended architecture (serverless, two phases)

### Phase A: static prototype on GitHub Pages (now)

A self-contained static site. No server, no auth, browser-local data only.

- One built `index.html` plus `app.js`, `styles.css`, and the SVG map, served from a `/docs` folder or a `gh-pages` branch.
- A `dataClient` module backed by `localStorage`, seeded with demo entries so the dot moves, you can log, edit, and delete, and the personal tally works. Single viewer, no shared state (your choice).
- No identity, no real names. GitHub Pages is public by default (private Pages needs GitHub Enterprise Cloud), so this is internet-visible. Demo data only, nothing sensitive.

This gets you something clickable to share this week, and it is genuinely reusable, not throwaway, because the UI and the math are the same code we ship to AWS.

### Phase B: AWS (the real home)

A serverless web app behind perimeter auth. Five pieces:

1. **Static front end**: the same SPA, hosted on Amazon S3 (private bucket) behind CloudFront, locked down with Origin Access Control so the bucket is only reachable through CloudFront, not via public S3 URLs. [CloudFront OAC for S3](https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/private-content-restricting-access-to-s3.html)

2. **Authentication at the perimeter**: an Amazon Cognito user pool federated to your Google Workspace as the identity provider, so colleagues sign in with their existing Ignite Google accounts and nobody manages passwords. The SPA does the OAuth sign-in, receives a JWT, and the email comes from the verified token claim. This is the direct replacement for `Session.getActiveUser().getEmail()`. [Cognito identity federation](https://docs.aws.amazon.com/cognito/latest/developerguide/cognito-user-pools-identity-federation.html), [Google as a social IdP](https://docs.aws.amazon.com/cognito/latest/developerguide/cognito-user-pools-social-idp.html)

   Alternative if you want a hard edge gate where nothing loads until authenticated (closer in feel to the old domain restriction): put an Application Load Balancer in front with an `authenticate-oidc` action against Google. The ALB validates the session and forwards verified user info to the app in `X-AMZN-OIDC-*` headers. This implies a server target rather than a pure static site, so it is the heavier option. [ALB user authentication](https://docs.aws.amazon.com/elasticloadbalancing/latest/application/listener-authenticate-users.html). My recommendation is Cognito plus the SPA unless you specifically want the edge gate.

3. **API**: Amazon API Gateway (HTTP API) with a JWT authorizer that validates the Cognito token on every call, fronting AWS Lambda functions. The client never sends an email; the authorizer hands the verified identity to Lambda, exactly like the server-trusts-identity rule in the current contract. [HTTP API JWT authorizers](https://docs.aws.amazon.com/apigateway/latest/developerguide/http-api-jwt-authorizer.html)

4. **Database**: Amazon DynamoDB. Sketch of the design:
   - **Entries**: one item per logged activity. Partition by user for the personal tally (`PK = USER#<email>`, `SK = <createdAt>#<entryId>`), with a global secondary index keyed for time order so the collective feed, recompute, and recognition boards can read all entries.
   - **Team total**: a single progress item updated with an atomic `ADD` on every write. Atomic counters are race-safe, which is exactly what `LockService` was doing in the Apps Script version, so the team total stays correct under concurrency without an explicit lock. [Atomic counters and conditional writes](https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/WorkingWithItems.html), [concurrency best practices](https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/BestPractices_ImplementingVersionControl.html)
   - **Completion lock**: a conditional write sets the finish timestamp only if it is not already set, so the finish time locks once and victory-lap miles never change it (spec FR-007).
   - **Reconciliation (SC-005)**: a recompute Lambda sums the entries and corrects the counter, the same integrity backstop as `recomputeTotal()`. If we want an entry edit or delete to be transactional with the counter update, DynamoDB `TransactWriteItems` groups them into an all-or-nothing operation. [DynamoDB transactions](https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/transaction-apis.html)

5. **Config and route**: the goal, step rate, threshold, quick-add chips, and the 11 route rows live as config items in DynamoDB (or SSM Parameter Store), seeded once. Note the loss here: there is no Google Sheet for a non-engineer to edit. If editing config in a spreadsheet still matters to you, we can keep a Google Sheet as the admin-editable source and sync it into DynamoDB. Flagging it as a choice, not assuming it away.

Infrastructure as code via AWS CDK or AWS SAM so the whole stack is reproducible and not clicked together by hand. CloudWatch for logs and a couple of alarms.

## How identity and the spec change

This is a spec-level change, so I am flagging it rather than quietly editing:

- **FR-008** today says the app is reached only through Google Workspace domain restriction and does not implement OAuth. On AWS that becomes: access is gated at the perimeter by Cognito federated to Google; the app trusts the verified email from the JWT claim. Still no passwords, still verified identity, still no bespoke OAuth code in the app itself.
- **Privacy section**: unchanged posture. We still collect only verified email, a display name, and self-reported distances. No health data.
- **plan.md and research.md Decisions 1 and 3** describe the Apps Script and Sheets choice and the Google-identity mechanism. Both need a revision note pointing here.

I can make these edits once you approve the direction.

## What of the current code survives

Most of the front end and all of the math. The only thing truly coupled to Apps Script is the data-access layer.

| Current file | Fate |
|---|---|
| `Styles.html` | Reused as `styles.css`, unchanged tokens. |
| `Map.html` | Reused as the SVG, unchanged. |
| `Client.html` | Reused as `app.js`. The one change: `google.script.run.X()` calls move behind a `dataClient` interface. The prototype implements it with `localStorage`; AWS implements it with `fetch()` to API Gateway. Same UI code either way. |
| `Code.gs` math (progress, totals, milestone, recognition) | Ported once into a shared `progress.js` module used by both the prototype's local client and the Lambda backend. Write the math once, run it in both places. |
| `Code.gs` plumbing (HtmlService, SpreadsheetApp, LockService, Session, `include`) | Replaced by API Gateway plus Lambda plus DynamoDB plus Cognito. |
| `Setup.gs` | Replaced by a DynamoDB seeding script. |
| `appsscript.json` | Dropped. |

So the work to date is not wasted. The UI, the map, the copy, and the logic port forward; the Google plumbing is what gets swapped.

## Decisions (status as of 2026-06-25)

1. **AWS ownership**: DevOps owns the account, infrastructure-as-code, deploys, monitoring, and the database. Resolved; the blocker is cleared.
2. **Auth / identity provider**: Amazon Cognito, federated to the Ignite Google Workspace. Confirmed.
3. **Database**: owned by DevOps. Recommendation to hand them: DynamoDB, with an atomic-counter item for the team total and a time-ordered index for the feed and recompute. DevOps makes the final call on engine and table design.
4. **Config editing**: resolved. Chris edits the route cities, goal, step rate, quick-add buttons, and celebration copy in a Google Sheet, and DevOps wires a small sync so AWS (DynamoDB) picks up the changes. This preserves the spec's no-code-config goal (FR-015) and the familiar-spreadsheet workflow from the original design. DevOps owns the sync mechanism (for example, a scheduled Lambda reading the Sheet via the Sheets API, or a manual publish step).
5. **IaC tool**: DevOps's choice. Recommendation: AWS CDK in TypeScript, or AWS SAM. (Infrastructure-as-code means the AWS setup is defined in version-controlled files and deployed repeatably, not clicked together by hand in the console.)
6. **Region**: a domestic US region; the exact one is owned by DevOps (commonly us-east-1 in Virginia or us-west-2 in Oregon). No data-residency constraint beyond "in the US" noted. DevOps confirms.

Because DevOps owns items 1, 3, 5, and 6, those become a hand-off, not a blocker on Chris. I will package the AWS specifics (the DynamoDB design, the Cognito-to-Google federation setup, the IaC recommendation, and the region note) into a short DevOps hand-off so their team can stand up Phase B.

## What I would do next

All product decisions are resolved (2026-06-25): Cognito auth federated to Google Workspace, config edited in a Google Sheet synced into AWS, DynamoDB recommended to DevOps, and the public demo prototype approved. Remaining steps, pending Chris's go-ahead to start building:

1. Update spec.md (FR-008, FR-015, the privacy note), plan.md, and research.md to reflect AWS and the Sheet-synced config.
2. Build **Phase A**, the static prototype, for GitHub Pages (browser-local demo data, no auth, demo data only).
3. Produce the **DevOps hand-off** for Phase B: the DynamoDB design, the Cognito-to-Google federation setup, the config-Sheet sync, the IaC recommendation, and the region note.
4. Schedule Phase B with DevOps.
