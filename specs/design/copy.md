# UX Copy: Coast-to-Coast Literacy Challenge

Ready-to-use strings in Ignite Reading's voice. This is the internal-comms register, which is Ignite's warmest: joyful, mission-first, human, present tense. Exclamation points are welcome in moderation. No em dashes. Never use deficit language. Every small contribution is celebrated as real, never as "only a little."

Claude Code can lift these strings directly. Anything in [brackets] is a value to fill at runtime. Maps to tasks T016, T022, T023, T021, T028, T030, T025, T018, T032.

## Voice in one line

Warm, confident, joyful, and grounded in the mission: every student deserves a strong foundation in reading, and every mile here is someone taking care of themselves so they can keep doing that work.

## Log confirmations (rotate, all distance-inclusive)

Show one of these warm lines after any entry, short or long. None of them reference size in a way that makes a quarter mile feel less than a marathon. Rotate randomly.

- "Logged! You just moved the whole team east."
- "That's miles on the board. Thank you for stepping away and moving."
- "Every mile counts, and yours just did. The dot moved because of you."
- "Nice. We're a little closer to the Atlantic thanks to you."
- "Added! Small steps and long runs both get us there."
- "You moved us forward. That's the Recharge spirit."
- "On the map! Your miles are part of the team's story now."
- "Boom. The dot inched east. Keep taking care of you."

Optional: occasionally append a gentle mission tie, for example "Coast to coast, for every kid learning to read." Use sparingly so it stays meaningful.

## Milestone city lines (canonical, for Config_Route, task T032)

These replace the short placeholders in data-model.md. Warm, with a real nod to each city's literacy connection (full sourcing in spec.md Appendix A). Keep one per city.

1. San Francisco: "And we're off! We start in the Bay Area, where Ignite Reading began. Every great story starts with the basics, and so does every great journey."
2. Sacramento: "Sacramento, our first stop! 87 miles down, together." (The Science of Reading and state-capital detail now lives in the stop's tap-to-reveal trivia, so the celebration line stays warm and non-repetitive.)
3. Reno: "Over the Sierra Nevada and into Reno. The mountains are behind us."
4. Salt Lake City: "Salt Lake City! We've crossed the Great Basin. That is real distance, all of us together."
5. Cheyenne: "Cheyenne, Wyoming. Through the Rockies and onto the high plains. Look how far we have come."
6. Omaha: "Omaha, and we are past halfway! Crossing the Missouri River with the whole team."
7. Des Moines: "Des Moines, the heart of the heartland. Steady steps, big progress."
8. Chicago: "Chicago! Hometown of Shel Silverstein, who helped millions of kids fall in love with words. Good company to keep."
9. Cleveland: "Cleveland, in a state that now teaches reading by the science. Two-thirds of the way there."
10. Pittsburgh: "Pittsburgh, where much of the Science of Reading was built at the University of Pittsburgh. The home stretch."
11. New York: "New York City. Coast to coast. We made it together, for every student learning to read."

## Progress nudge (optional, e.g. weekly)

- "We're at [X] miles. Next stop: [city], just [Y] to go. Who's got a walk in them today?"
- "Halfway across the country! [X] miles down, [Y] to the Atlantic. Keep moving, team."

## Finish / arrival (task T021)

Headline (yellow, italic tail on the last phrase): "Coast to coast. *We made it together.*"

Subhead: "From the Bay Area to New York, [total] miles in [N] days. Every one of those miles was someone choosing to step away from the desk and move. That is the Recharge spirit, and it is the same energy we bring to every student learning to read."

Elapsed stat caption: "[N] days, coast to coast."

Button: "See who showed up" (into recognition).

## Recognition boards (task T028)

Keep all four equal in tone. Titles, one-line rules, and a winner blurb template.

- Title "Most Days Active" / rule "Showed up on the most days." / blurb "[Name] logged on [X] different days."
- Title "Longest Streak" / rule "The most days in a row." / blurb "[Name] kept it going [X] days straight."
- Title "Most Improved" / rule "Grew the most from their first week to their last." / blurb "[Name] grew their weekly miles the most. Growth, not speed."
- Title "First Out of the Gate" / rule "The very first to log a mile." / blurb "[Name] got us moving."

Header for the section: "Different ways to shine."

## Empty states (task T030)

- Team, day one (0 miles): "The journey starts here. Be the first to put us on the map. Log a walk, run, or ride and watch the dot leave the Bay Area."
- Personal tally, no entries yet: "No miles yet, and that is just fine. Your first walk, run, or ride counts, even a quick lap around the block. Add it above."
- Recent activity feed, empty: "Quiet so far. Someone has to go first. Could be you."

## First-run name prompt (task T025)

- Heading: "Welcome! Glad you're here."
- Body: "What should we call you? This is the name your teammates will see next to your miles."
- Field label: "Your name" (placeholder "e.g., Chris G.")
- Button: "Start moving"

## Welcome / onboarding (shown once after the name prompt; reopenable via the header About button)

Leads with the aspirational idea from the challenge kickoff: no one crosses the country alone, but together the team can, and that mirrors the mission (no one reaches every student alone). Non-competitive by design, no per-person target. Uses only safe facts (the ~3,000-mile route, Bay Area origin, Recharge framing). No growth stats, since those are [DATA NEEDED]. An optional Loom video appears above the text when `welcomeVideoUrl` is set in the Settings tab; otherwise it is text-only.

- Heading: "Welcome aboard!"
- Body:
  - "Crossing the country alone would be tough and lonely. But when each of us takes a walk, run, or ride, our team covers nearly 3,000 miles from the Bay Area to New York. Together, we achieve what none of us could alone."
  - "Some weeks you'll give more, some less. That's the point. When one of us slows down, another picks up the slack. No leaderboard, no comparisons. Every effort counts, big or small."
  - "Our mission is the same: no one reaches every student alone, but together we go the distance. The trip across the map is that promise, measured in miles."
  - "Tap Log to add your miles or steps, watch the dot move east, and check Recognition to see how we celebrate. It's Recharge time, so take care of yourself and thanks for pulling with the team."
- Button: "Let's go"

## Plausibility confirm (task T018)

When an entry is over the threshold:
- "Whoa, [X] miles in one go! Amazing if that's real. Want to double-check it isn't a typo, like steps typed in the miles box?"
- Buttons: "Yes, log it" / "Let me fix it"

## Microcopy and errors

- Primary log button: "Add my miles"
- Unit toggle: "Miles" / "Steps"
- Inline conversion: "[steps] steps = [miles] mi"
- Quick-add chips: "+1" "+2" "+3" "+5"
- Change date link: "Logged today. Change date"
- Nav: "Map" / "Log" / "Recognition"
- Invalid input: "Pop in a number above zero and we'll add it."
- Edit saved: "Updated. Your total adjusted."
- Delete confirm: "Remove this entry? Your total will adjust." Buttons "Remove" / "Keep it"
- Not signed in (rare, since the perimeter handles it): "Please open this with your Ignite Reading Google account to join the challenge."

## Optional mission micro-facts (use sparingly, verify before public use)

These are Ignite Reading's published figures (per the brand voice guidelines). Confirm they are current before showing them broadly, since stats get updated. [DATA NEEDED: confirm current figures with Marketing before launch.]

- "Ignite Reading students gain about 2.4 weeks of reading growth for every week of instruction."
- "On average, students gained 5.4 extra months of learning in a school year."
- "7 in 8 kids who are behind in reading at the end of first grade are still behind a year later. That's why the First Grade Promise exists."

A nice touch: when the team passes a Science of Reading stop (Sacramento, Cleveland, Pittsburgh, New York), pair the milestone line with one of these facts so the mission shows up right where the map already nods to it.

## Hashtag / share

If people screenshot and share internally, suggest #FirstGradePromise, which is Ignite's existing rallying hashtag.
