/*
 * data-content.js - shared narrative content for the Coast-to-Coast Challenge.
 *
 * The route (cities, cumulative miles, celebration lines, and tap-to-reveal
 * trivia) and the rotating log-confirmation lines are copy, not operational
 * data, so they live here in the frontend and are single-sourced across every
 * data client. Both data-local.js (demo) and data-sheet.js (Google Sheet
 * backend) read from window.C2C_CONTENT, so trivia is only ever edited once.
 *
 * Operational knobs (goal, steps-per-mile, plausibility threshold, launch)
 * have defaults here but are overridden at runtime by the Settings tab that
 * getState() returns, so they stay editable in the Sheet without a code change.
 */
(function () {
  'use strict';

  var CONFIG = {
    goalMiles: 2984,
    stepsPerMile: 2000,
    plausibilityThresholdMiles: 50,
    startCityLabel: 'San Francisco / Bay Area',
    launchTimestamp: '2026-08-05T09:00:00',
    quickAddMiles: [1, 2, 3, 5]
  };

  var ROUTE = [
    { order: 1, city: 'San Francisco / Bay Area, CA', cumulativeMiles: 0,
      celebrationMessage: "And we're off! We start in the Bay Area, where Ignite Reading began. Every great story starts with the basics, and so does every great journey.", sorTag: 'home',
      triviaFacts: [
        { text: "Robert Frost, the only poet to win four Pulitzer Prizes, was born in San Francisco in 1874.", source: "https://www.poetryfoundation.org/poets/robert-frost" },
        { text: "City Lights, founded here in 1953, was the country's first all-paperback bookstore, and in 1957 it won the obscenity trial over Ginsberg's 'Howl,' a landmark for free expression.", source: "https://en.wikipedia.org/wiki/City_Lights_Bookstore" }
      ] },
    { order: 2, city: 'Sacramento, CA', cumulativeMiles: 87,
      celebrationMessage: "Sacramento, our first stop! 87 miles down, together.", sorTag: 'sor',
      triviaFacts: [
        { text: "California's capital, where the state signed its 2025 Science of Reading law (AB 1454), moving classrooms toward explicit, evidence-based reading instruction.", source: "https://edsource.org/2025/governor-newsom-signs-literacy-bill/742396" },
        { text: "Writer Joan Didion, one of America's most influential essayists, was born in Sacramento in 1934.", source: "https://www.britannica.com/biography/Joan-Didion" }
      ] },
    { order: 3, city: 'Reno, NV', cumulativeMiles: 219,
      celebrationMessage: "Over the Sierra Nevada and into Reno. The mountains are behind us.", sorTag: 'literary',
      triviaFacts: [
        { text: "Just outside Reno, in Virginia City, Samuel Clemens first signed his work 'Mark Twain' in 1863. One of America's greatest writers got his pen name in Nevada.", source: "https://www.history.com/this-day-in-history/mark-twain-begins-reporting-in-virginia-city" }
      ] },
    { order: 4, city: 'Salt Lake City, UT', cumulativeMiles: 737,
      celebrationMessage: "Salt Lake City! We've crossed the Great Basin. That is real distance, all of us together.", sorTag: 'literary',
      triviaFacts: [
        { text: "Utah is a surprising hotbed of children's and young-adult authors, including Shannon Hale and 'Fablehaven' author Brandon Mull.", source: "https://lasvegassun.com/news/2023/sep/04/an-unexpected-hotbed-of-ya-authors-utah/" },
        { text: "Author Brandon Mull says learning to read for fun as a kid changed the trajectory of his life.", source: "https://www.ksl.com/article/51455338/reading-changed-these-authors-lives-now-they-want-the-same-for-utahs-youth" }
      ] },
    { order: 5, city: 'Cheyenne, WY', cumulativeMiles: 1176,
      celebrationMessage: "Cheyenne, Wyoming. Through the Rockies and onto the high plains. Look how far we have come.", sorTag: 'literary',
      triviaFacts: [
        { text: "Through Wyoming Reads, every first-grader in the state gets a book of their own to keep, a nice echo of our First Grade Promise.", source: "https://library.wyo.gov/services/wyoming-residents/programs-for-literacy/" },
        { text: "Wyoming leads the entire US in library visits per person, and about 68% of residents hold a library card.", source: "https://library.wyo.gov/wyoming-leads-the-u-s-in-library-visits/" }
      ] },
    { order: 6, city: 'Omaha, NE', cumulativeMiles: 1670,
      celebrationMessage: "Omaha, and we are past halfway! Crossing the Missouri River with the whole team.", sorTag: 'literary',
      triviaFacts: [
        { text: "Omaha is home to bestselling young-adult author Rainbow Rowell ('Eleanor & Park,' 'Fangirl').", source: "https://nebraskaauthors.org/authors/rainbow-rowell" },
        { text: "Nebraska shaped Pulitzer winner Willa Cather, whose Great Plains novels like 'My Antonia' are American classics.", source: "https://www.willacather.org/about/willa-cather-biography" }
      ] },
    { order: 7, city: 'Des Moines, IA', cumulativeMiles: 1804,
      celebrationMessage: "Des Moines, the heart of the heartland. Steady steps, big progress.", sorTag: 'literary',
      triviaFacts: [
        { text: "Des Moines is the birthplace of bestselling author Bill Bryson.", source: "https://en.wikipedia.org/wiki/Bill_Bryson" },
        { text: "Nearby Iowa City was the first US UNESCO City of Literature and home to the country's oldest creative-writing MFA, the Iowa Writers' Workshop.", source: "https://stories.uiowa.edu/iowa-city-little-town-big-writing" }
      ] },
    { order: 8, city: 'Chicago, IL', cumulativeMiles: 2136,
      celebrationMessage: "Chicago! Hometown of Shel Silverstein, who helped millions of kids fall in love with words. Good company to keep.", sorTag: 'literary',
      triviaFacts: [
        { text: "Chicago is the birthplace of beloved children's poet Shel Silverstein ('Where the Sidewalk Ends,' 'The Giving Tree').", source: "https://chicagoliteraryhof.org/inductees/profile/shel-silverstein" },
        { text: "Chicago poet Gwendolyn Brooks was the first African American to win a Pulitzer Prize, in 1950.", source: "https://www.pulitzer.org/article/frost-williams-no-gwendolyn-brooks" }
      ] },
    { order: 9, city: 'Cleveland, OH', cumulativeMiles: 2480,
      celebrationMessage: "Cleveland, in a state that now teaches reading by the science. Two-thirds of the way there.", sorTag: 'sor',
      triviaFacts: [
        { text: "Ohio's 2023 law now requires evidence-based, phonics-first instruction statewide and bans the discredited three-cueing method.", source: "https://ohiocapitaljournal.com/2024/08/22/science-of-reading-curriculum-is-now-being-taught-in-all-ohio-school-districts/" },
        { text: "A teenage Langston Hughes found his voice at Cleveland's Central High, writing his first poems for the school magazine.", source: "https://case.edu/ech/articles/h/hughes-james-langston" }
      ] },
    { order: 10, city: 'Pittsburgh, PA', cumulativeMiles: 2615,
      celebrationMessage: "Pittsburgh, where much of the Science of Reading was built at the University of Pittsburgh. The home stretch.", sorTag: 'sor',
      triviaFacts: [
        { text: "The University of Pittsburgh's Learning Research and Development Center is where Charles Perfetti, Isabel Beck, and Margaret McKeown built much of the modern science of reading.", source: "https://en.wikipedia.org/wiki/Charles_Perfetti" },
        { text: "The first Carnegie library in the US opened in 1889 in Braddock, just outside Pittsburgh. Andrew Carnegie went on to fund more than 1,600 libraries nationwide.", source: "https://en.wikipedia.org/wiki/Braddock_Carnegie_Library" },
        { text: "Fred Rogers studied child development at the University of Pittsburgh, which shaped the learning-first spirit of 'Mister Rogers' Neighborhood.'", source: "https://www.pittwire.pitt.edu/pittwire/features-articles/mister-rogers-legacy-beyond-tv-screen" }
      ] },
    { order: 11, city: 'New York, NY', cumulativeMiles: 2984,
      celebrationMessage: "New York City. Coast to coast. We made it together, for every student learning to read.", sorTag: 'sor',
      triviaFacts: [
        { text: "New York City runs NYC Reads, the largest US school system to shift to Science of Reading curricula.", source: "https://www.chalkbeat.org/newyork/2024/09/06/what-to-know-about-nyc-reads-curriculum-mandate-for-schools/" },
        { text: "The New York Public Library is the second-largest public library in the country, with about 53 million items across 92 locations, all free to use.", source: "https://en.wikipedia.org/wiki/New_York_Public_Library" }
      ] }
  ];

  var CELEBRATIONS = [
    'Logged! You just moved the whole team east.',
    "That's miles on the board. Thank you for stepping away and moving.",
    'Every mile counts, and yours just did. The dot moved because of you.',
    "Nice. We're a little closer to the Atlantic thanks to you.",
    'Added! Small steps and long runs both get us there.',
    'You moved us forward. That is the Recharge spirit.',
    "On the map! Your miles are part of the team's story now.",
    'Boom. The dot inched east. Keep taking care of you.'
  ];

  window.C2C_CONTENT = { CONFIG: CONFIG, ROUTE: ROUTE, CELEBRATIONS: CELEBRATIONS };
})();
