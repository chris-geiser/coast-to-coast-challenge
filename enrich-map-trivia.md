# Enrich the Map with Literacy Trivia (Claude Code brief)

Hand this file to Claude Code to add tap-to-reveal literacy trivia to the map. It is self-contained: the trivia data, the wiring instructions, and the acceptance checks are all here. It extends the existing package (data-model.md, contracts/sheet-schema.md, contracts/api.md, design/visual-direction.md, design/copy.md). Full sourcing also lives in design/map-trivia.md.

## What we are adding

Each milestone stop on the map already shows a celebration line. We are adding one or more short literacy facts per stop that appear when a user taps that stop. Facts are real and sourced. Some stops are city-specific, some are framed regionally (state) because the state has stronger, more mission-relevant material than the exact city.

## Build changes

1. Data model. Add a `triviaFacts` field to each route stop. Store it in the Config_Route tab as a JSON array string (one column), or a parallel tab if you prefer, keyed by stop order. Each fact has `text` and `source`. Update the Config_Route schema in contracts/sheet-schema.md and the seeding in Setup.gs.

2. Seeding. In Setup.gs, seed the facts below into each route row. Keep the existing celebrationMessage; triviaFacts is additional.

3. API. getState() already returns the route. Include `triviaFacts` in each route entry (see contracts/api.md getState route shape). No new endpoint needed.

4. UI (design/visual-direction.md, the map). Tapping a milestone pin opens its card: show the celebration line, then one trivia fact. If the stop has more than one fact, add a small "More" affordance that rotates to the next. Respect the contrast rule (no pink text on the purple map; use yellow or white). Keep cards short and mobile-friendly.

5. Feature the mission ties. The Science of Reading stops (Sacramento, Cleveland, Pittsburgh, New York) and Wyoming's first-grader books connect the journey to Ignite's mission and the First Grade Promise. Show those facts first for their stops, and consider a small spark or book glyph on those pins (already noted in the visual direction).

## Voice and accuracy rules

Keep facts to one or two sentences, warm and plain, in the internal-comms voice from design/copy.md. Do not invent or embellish. Every fact below is sourced; if Claude Code wants to add more, it must verify and cite, and must not fabricate names, dates, or numbers. Mark anything unverified as [DATA NEEDED] rather than guessing.

## The trivia data (ready to seed)

Tags: [City] uses the city's own fact, [Regional] uses a state fact because the city is thin, [Blend] uses both.

### 1. San Francisco, CA [City]
- "Robert Frost, the only poet to win four Pulitzer Prizes, was born in San Francisco in 1874." (source: https://www.poetryfoundation.org/poets/robert-frost)
- "City Lights, founded here in 1953, was the country's first all-paperback bookstore, and in 1957 it won the obscenity trial over Ginsberg's 'Howl,' a landmark for free expression." (source: https://en.wikipedia.org/wiki/City_Lights_Bookstore)

### 2. Sacramento, CA [City, Science of Reading]
- "California's capital, where the state signed its 2025 Science of Reading law (AB 1454), moving classrooms toward explicit, evidence-based reading instruction." (source: https://edsource.org/2025/governor-newsom-signs-literacy-bill/742396)
- "Writer Joan Didion, one of America's most influential essayists, was born in Sacramento in 1934." (source: https://www.britannica.com/biography/Joan-Didion)

### 3. Reno, NV [Regional: Nevada]
- "Just outside Reno, in Virginia City, Samuel Clemens first signed his work 'Mark Twain' in 1863. One of America's greatest writers got his pen name in Nevada." (source: https://www.history.com/this-day-in-history/mark-twain-begins-reporting-in-virginia-city)

### 4. Salt Lake City, UT [Regional: Utah]
- "Utah is a surprising hotbed of children's and young-adult authors, including Shannon Hale and 'Fablehaven' author Brandon Mull." (source: https://lasvegassun.com/news/2023/sep/04/an-unexpected-hotbed-of-ya-authors-utah/)
- "Author Brandon Mull says learning to read for fun as a kid changed the trajectory of his life." (source: https://www.ksl.com/article/51455338/reading-changed-these-authors-lives-now-they-want-the-same-for-utahs-youth)

### 5. Cheyenne, WY [Regional: Wyoming, First Grade Promise tie]
- "Wyoming leads the entire US in library visits per person, and about 68% of residents hold a library card." (source: https://library.wyo.gov/wyoming-leads-the-u-s-in-library-visits/)
- "Through Wyoming Reads, every first-grader in the state gets a book of their own to keep, a nice echo of our First Grade Promise." (source: https://library.wyo.gov/services/wyoming-residents/programs-for-literacy/)

### 6. Omaha, NE [Blend]
- "Omaha is home to bestselling young-adult author Rainbow Rowell ('Eleanor & Park,' 'Fangirl')." (source: https://nebraskaauthors.org/authors/rainbow-rowell)
- "Nebraska shaped Pulitzer winner Willa Cather, whose Great Plains novels like 'My Antonia' are American classics." (source: https://www.willacather.org/about/willa-cather-biography)

### 7. Des Moines, IA [Blend]
- "Des Moines is the birthplace of bestselling author Bill Bryson." (source: https://en.wikipedia.org/wiki/Bill_Bryson)
- "Nearby Iowa City was the first US UNESCO City of Literature and home to the country's oldest creative-writing MFA, the Iowa Writers' Workshop." (source: https://stories.uiowa.edu/iowa-city-little-town-big-writing)

### 8. Chicago, IL [City]
- "Chicago is the birthplace of beloved children's poet Shel Silverstein ('Where the Sidewalk Ends,' 'The Giving Tree')." (source: https://chicagoliteraryhof.org/inductees/profile/shel-silverstein)
- "Chicago poet Gwendolyn Brooks was the first African American to win a Pulitzer Prize, in 1950." (source: https://www.pulitzer.org/article/frost-williams-no-gwendolyn-brooks)

### 9. Cleveland, OH [City, Science of Reading]
- "Ohio's 2023 law now requires evidence-based, phonics-first instruction statewide and bans the discredited three-cueing method." (source: https://ohiocapitaljournal.com/2024/08/22/science-of-reading-curriculum-is-now-being-taught-in-all-ohio-school-districts/)
- "A teenage Langston Hughes found his voice at Cleveland's Central High, writing his first poems for the school magazine." (source: https://case.edu/ech/articles/h/hughes-james-langston)

### 10. Pittsburgh, PA [City, Science of Reading]
- "The University of Pittsburgh's Learning Research and Development Center is where Charles Perfetti, Isabel Beck, and Margaret McKeown built much of the modern science of reading." (source: https://en.wikipedia.org/wiki/Charles_Perfetti)
- "The first Carnegie library in the US opened in 1889 in Braddock, just outside Pittsburgh. Andrew Carnegie went on to fund more than 1,600 libraries nationwide." (source: https://en.wikipedia.org/wiki/Braddock_Carnegie_Library)
- "Fred Rogers studied child development at the University of Pittsburgh, which shaped the learning-first spirit of 'Mister Rogers' Neighborhood.'" (source: https://www.pittwire.pitt.edu/pittwire/features-articles/mister-rogers-legacy-beyond-tv-screen)

### 11. New York, NY [City, Science of Reading]
- "New York City runs NYC Reads, the largest US school system to shift to Science of Reading curricula." (source: https://www.chalkbeat.org/newyork/2024/09/06/what-to-know-about-nyc-reads-curriculum-mandate-for-schools/)
- "The New York Public Library is the second-largest public library in the country, with about 53 million items across 92 locations, all free to use." (source: https://en.wikipedia.org/wiki/New_York_Public_Library)

## Suggested data shape

For each Config_Route row, a `triviaFacts` JSON array:

```json
[
  { "text": "Wyoming leads the entire US in library visits per person...", "source": "https://library.wyo.gov/wyoming-leads-the-u-s-in-library-visits/" },
  { "text": "Through Wyoming Reads, every first-grader gets a book to keep...", "source": "https://library.wyo.gov/services/wyoming-residents/programs-for-literacy/" }
]
```

## Acceptance criteria

- Tapping any milestone shows its celebration line plus at least one trivia fact.
- Stops with multiple facts let the user see the others (rotate or "More").
- Science of Reading and First Grade Promise facts appear first on their stops (Sacramento, Cleveland, Pittsburgh, New York, Wyoming).
- Facts are short, readable on a phone, and follow the map contrast rule (no pink text on purple).
- No fabricated facts. Sources are preserved in the data, even if not shown in the UI.
