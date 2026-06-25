# Visual Direction: Coast-to-Coast Literacy Challenge

A thin, buildable design brief so Claude Code produces something on-brand, not generic. It uses Ignite Reading's real brand tokens (palette, type, treatments) pulled from the ignite-design brand system. This is the look layer for the app described in spec.md and plan.md. It maps to tasks T011 (map), T012 (theme), T016 (log UI), T021 (finish), T023 (celebration), and T028 (recognition).

This is direction, not pixel-perfect comps. The stack is a stylized SVG map in an Apps Script web app, mobile-first.

## Personality to convey

Joyful, rigorous, compassionate, bold, visionary. In practice for this app: confident purple grounds every screen, pink and yellow bring the energy and celebration, the journey feels like a warm shared road trip, and every contribution looks like it matters. This is internal comms, which is Ignite's warmest register, so lean joyful and human, not corporate.

## Design tokens (drop-in)

Use these exact values (Ignite brand source of truth). Bundle Roboto from the brand assets (assets/fonts) rather than a web font CDN.

```css
:root {
  /* Purple — primary brand / dark surfaces */
  --purple: #27004B;      /* hero/map background, headlines on light */
  --purple-600: #514F9C;  /* secondary fills, pills */
  --purple-300: #9A98CB;  /* muted: the route not yet traveled, dividers on dark */
  --purple-050: #F7F4FA;  /* soft section background */
  /* Pink — energy / accent / CTA (LIGHT backgrounds only) */
  --pink: #ED017F;        /* the dot, primary CTA, key numbers, checks */
  --pink-300: #F18DC1;
  --pink-050: #FDF5F5;
  /* Blue — data / freshness */
  --blue: #39C2D7;        /* stat circles, secondary data */
  /* Yellow — optimism / highlight / celebration (the accent on dark) */
  --yellow: #FFC854;      /* highlight word in hero, celebration glow, accent ON purple */
  /* Greys */
  --ink: #3D3C3C;         /* body text on light */
  --white: #FFFFFF;
  --font-base: "Roboto", "Liberation Sans", Arial, sans-serif;
  --radius-card: 14px;
  --radius-pill: 999px;
}
```

Type is Roboto only: Black (900) for the big numbers and hero headline (an italic tail on the kicker word is the signature move, for example "We made it together."), Bold (700) for section heads, Medium (500) for labels, Regular (400) for body.

## The one accessibility rule that bites here

Never put pink text on the purple map or any dark surface, it fails contrast. On purple, colored emphasis is yellow first, then white or blue. Pink is for light backgrounds only. Also never blue text on white. Body text is ink on light, white on dark. Before shipping, scan every purple area: if any text on it is pink, switch it to yellow or white. (This matters because the map is purple and the dot is pink, which is fine as a shape, but any label on the map must be yellow or white.)

## Screen by screen

### The map (primary screen, T011)

This is the emotional center, so give it room. A full-bleed deep purple (`--purple`) canvas, like Ignite's purple hero. The US is a stylized silhouette in a slightly lighter purple so it reads as a quiet basemap, not a data map.

The route is one drawn path from San Francisco to New York. Show the whole route as a thin muted line (`--purple-300`) for the distance not yet traveled, and overlay the traveled portion in a bright gradient from pink into yellow so progress literally lights up the country (ties to "light a spark"). The dot is a solid pink circle with a white ring, the brand's circle treatment (box-shadow: 0 0 0 6px #fff equivalent), so it pops on purple and feels like the hero marker. Position it with getPointAtLength as specified in the plan.

Milestone cities are small circular pins on the line. Not yet reached: hollow ring in `--purple-300`. Reached: filled, with the four Science of Reading stops (Sacramento, Cleveland, Pittsburgh, New York) filled in `--blue` (our "data/learning" color) and given a tiny book or spark glyph, and the literary stops filled in `--yellow`. This visually rewards the mission stops without a word. The start (San Francisco) and finish (New York) get a slightly larger pin.

Above or below the map, a compact status line in white with one yellow highlight: the team total in big Roboto Black, then "miles. Next stop: Reno, 132 to go." Keep the next-milestone and miles-to-coast readable at a glance on a phone.

When a milestone is reached, the pin animates (a quick pulse and a yellow ring burst) and a small card slides up with that city's celebration line (copy.md). Keep motion brief and gentle, joyful not frantic.

### Log screen (T016, the effortless-input screen)

This is the screen people touch most, so make it fast and friendly on a phone. White or `--purple-050` background, ink text. One big number field, large touch target, numeric keypad on mobile. A miles/steps toggle styled as two pills (`--radius-pill`), selected pill filled `--purple-600` white text. Inline under the field, show the live conversion in `--ink` with the number in pink: "6,000 steps = 3.0 mi." A row of quick-add chips (1, 2, 3, 5 mi) as outlined pills that fill pink on tap. Primary button is a solid pink "Add my miles" (pink on white passes contrast). Date defaults to today with a small, easy-to-miss-on-purpose "change date" link.

Keep it to one screen, no scrolling to submit. After submit, the celebration message (copy.md) appears as a warm toast or card with a touch of yellow, and the dot visibly moves.

### Personal tally (T017)

A quiet, private card on the log screen: "Your miles: 12.5" in Roboto Black, with a short list of recent entries (date, distance, edit/delete). Never a rank, never compared. Frame it as "yours," warm and personal.

### Celebration and milestone moments (T023)

Use yellow as the celebration color (optimism). A milestone card on a white or yellow band with the city line in purple, plus a tiny confetti or spark motif (subtle). For everyday log confirmations, a small affirming line with a spark, never a scolding or "that's small" tone. Joy here is authentic and tied to the mission, not hollow cheerleading.

### Finish state (T021)

When the team reaches New York, go full purple hero: a big yellow Roboto Black headline with an italic tail, for example "Coast to coast. *We made it together.*" Show elapsed time as a stat circle (blue) with a short caption, and a clear button into the recognition boards. This is the screenshot moment, so make it feel like an arrival.

### Recognition boards (T028)

Four boards (most days active, longest streak, most improved, first to log). Render each as a card (`--radius-card`) with a Bold purple title, a one-line plain-language rule in grey, and the rows. Use the stat-circle treatment for the top spot on each board (a blue or pink disc with the number). Keep all four visually equal in weight, no board looks more important than another, reinforcing that these are different ways to shine, not a single ranking. No miles ranking anywhere.

## Logo and naming

Use the white Ignite Reading logo on the purple screens (assets/logo/ignite-logo-white.png) and the purple logo on light screens. Always write "Ignite Reading," never "Ignite" or "Ignite!". Small footer lockup is enough; this is an internal tool, not a billboard.

## Motion

Gentle and brief. The dot eases along the path on update (a second or so). Milestone pulses are quick. Nothing loops or distracts. Respect prefers-reduced-motion: fall back to instant state changes.

## What to avoid

Generic dashboard styling (grey cards, default blue links, stock map tiles). Pink text on purple. Blue text on white. Anything that ranks people by volume. Deficit or "you only did a little" tones. Over-animation. A literal road-atlas map (the stylized silhouette is the point).

## Quick brand checklist before handoff is "done"

Purple grounds every screen; pink is the dot and the light-background CTA; yellow carries celebration and any emphasis on purple; blue marks the Science of Reading stops and stat circles. Roboto throughout, Black for big numbers. No contrast violations. The map lights up as the team progresses. The finish feels like an arrival worth screenshotting.
