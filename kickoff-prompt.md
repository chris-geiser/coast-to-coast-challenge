# Claude Code Kickoff Prompt

Open Claude Code in the folder that contains the `specs/coast-to-coast-challenge/`
directory, start a fresh session, and paste the prompt below.

---

Build the Coast-to-Coast Literacy Challenge web app. The complete spec
package is in specs/. Read it before writing
any code, in this order: spec.md, plan.md, research.md, data-model.md,
contracts/api.md, contracts/sheet-schema.md, design/visual-direction.md,
design/copy.md, then tasks.md. tasks.md is your build order and
references the others.

Stack (already decided, do not change without asking):
- Google Apps Script web app + a Google Sheet as the database, managed
  with clasp, in an app/ folder.
- Deployed restricted to the Workspace domain. That Google sign-in is
  the only access gate. Read the signed-in identity via
  Session.getActiveUser().getEmail(). No app-level OAuth, no shared code.
- Stylized inline SVG US map, dot positioned by miles/goal along an SVG
  path. No Google Maps, Mapbox, or any paid map key.
- No fitness-app sync (research.md Decision 9 explains why).

How to work:
- Follow tasks.md phase by phase. Use the Ignite brand tokens and the
  exact strings in the design/ files. Bundle Roboto from the brand assets.
- Build Phase 1 (Setup) and Phase 2 (Foundational), then User Story 1
  and the core of User Story 2 so the dot moves and the team total
  reconciles. Then STOP and show me a working MVP before continuing to
  celebration, access niceties, and recognition.
- After each phase, run the relevant quickstart.md checks and tell me
  the result.

Hard rules to honor throughout:
- Every distance is celebrated equally. Never rank individuals by total
  miles. Recognition is only the four inclusive boards.
- The team total must always reconcile to the sum of entries. Guard
  writes with LockService.
- No pink text on the purple map (use yellow or white); no blue text on
  white.
- Steps convert at 2,000/mile (configurable). Goal is 2,984 miles.

Ask me before assuming anything that isn't in the spec, and flag any gap
you hit rather than guessing. Don't set the real launch date or publish
the mission stats marked [DATA NEEDED]; leave those as placeholders.

Start by reading the package and giving me a short plan for Phase 1 and 2.

---

## Why this prompt is shaped this way

It forces a read-first, check-in-before-coding flow (the last line), locks
the decisions we already made so Claude Code does not relitigate the stack,
restates the few non-negotiable values (inclusive recognition, total
reconciliation, contrast rules), and builds to an MVP checkpoint so you see
the dot move before the polish gets built.

## Before you launch publicly (human inputs, not code)

- Set the real launchTimestamp at the retreat.
- Confirm the mission stats marked [DATA NEEDED] in design/copy.md with
  Marketing.
- Read the eleven milestone lines once for tone before they go org-wide.
- Glance at the rendered SVG so each city pin sits at its cumulative-mile mark.
