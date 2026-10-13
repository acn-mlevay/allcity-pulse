/** Lowercase, strip accents/HTML/punctuation, collapse whitespace. */
export function normalize(input: string): string {
  return input
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/<[^>]*>/g, " ")
    .replace(/&[a-z#0-9]+;/g, " ")
    .replace(/['\u2019]s\b/g, "")
    .replace(/['\u2019]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

export function stripHtml(input: string): string {
  return input
    .replace(/<[^>]*>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/\s+/g, " ")
    .trim();
}

/** Whole-phrase containment on normalized text. */
export function hasPhrase(normText: string, phrase: string): boolean {
  return ` ${normText} `.includes(` ${phrase} `);
}

export function titleCase(phrase: string): string {
  return phrase.replace(/\b[a-z]/g, (c) => c.toUpperCase());
}

/**
 * Words that never anchor a trend. English stopwords plus the verbs and filler
 * sports headlines are built from, so "Eagles trade Jalen Hurts to Jaguars"
 * yields "jalen hurts", not "eagles trade".
 */
export const STOPWORDS = new Set(
  `a about above after again against all am an and any are as at be because been before being below between both but by can
  could did do does doing down during each few for from further had has have having he her here hers him his how i if in into
  is it its itself just me more most my no nor not now of off on once only or other our out over own same she should so some
  such than that the their them then there these they this those through to too under until up very was we were what when
  where which while who whom why will with would you your yours vs v via per says said say report reports reportedly source
  sources according news update updates live watch video podcast show episode ep listen read latest breaking new top best
  first last next big huge major final early late full sign signs signed signing deal deals agree agrees agreed trade trades
  traded trading acquire acquires acquired release released releases waive waived cut cuts injury injured injuries return
  returns ruled status expected expects may might win wins won loss lose loses lost beat beats beating game games season
  seasons week weeks day days night today tonight tomorrow yesterday year years time takeaways things notes observations
  preview recap grades grade score scores highlights odds prediction predictions picks pick bet bets betting spread fantasy
  rumors rumor rumblings mailbag analysis takes take reaction reacts react look looks ranking rankings rank ranks power stock
  heres whats still back get gets got make makes made go goes going one two three four five six seven eight nine ten home
  away road team teams player players coach league fans fan nfl nba mlb nhl wnba ncaa espn`
    .split(/\s+/)
    .filter(Boolean)
);
