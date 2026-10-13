import type { FeedConfig, Market } from "@/lib/types";

/**
 * Markets, teams, and feeds. Source: ACN show list (Oct 2026).
 *
 * feeds:  every O&O feed. Inactive shows are included on purpose - their back
 *         catalogs are the archive this tool pulls from. Add YouTube channel
 *         feeds as { url, type: "video" } and article feeds as { url, type: "article" }.
 * teams:  anchors the trending-news search. terms = words that just mean
 *         "this team" (nickname, city); they are ignored as trend names so
 *         trends surface players, coaches, and storylines.
 * site:   market website. Its article RSS feed and YouTube channel are found
 *         automatically from the homepage. Extra YouTube channels:
 *         { url: "youtube:@Handle", type: "video" }. FAST channels (MRSS):
 *         { url: "https://.../mrss.xml", type: "fast" }.
 * trendSource "all": the market has no teams of its own and matches its
 *         content against every market's trends.
 */
const ARCHIVE = true;
const pod = (url: string, show: string, archived = false): FeedConfig => ({ url, type: "audio", show, archived });
/** YouTube channel by handle; resolved to the channel's RSS feed at ingest. */
const yt = (handle: string, show: string): FeedConfig => ({ url: `youtube:${handle}`, type: "video", show });

export const MARKETS: Market[] = [
  {
    slug: "dnvr",
    site: "https://thednvr.com",
    name: "DNVR",
    teams: [
      { name: "Denver Broncos", terms: ["broncos", "denver"] },
      { name: "Denver Nuggets", terms: ["nuggets", "nugs", "denver"] },
      { name: "Colorado Avalanche", terms: ["avalanche", "avs", "colorado"] },
      { name: "Colorado Rockies", terms: ["rockies", "colorado"] },
      { name: "Colorado Rapids", terms: ["rapids", "colorado"] },
      { name: "Colorado Buffaloes", terms: ["buffaloes", "buffs", "cu", "colorado"] },
      { name: "Colorado State Rams", terms: ["rams", "csu", "colorado", "state"] },
    ],
    feeds: [
      yt("@DNVR_Sports", "DNVR YouTube"),
    pod("https://feeds.simplecast.com/n_mZm2uL", "Broncos X's and O's with Dave Logan and Bennie Fowler"),
    pod("https://feeds.simplecast.com/UvRsLzkH", "DNVR Colorado Avalanche Podcast"),
    pod("https://feeds.simplecast.com/qilwAoi6", "DNVR Colorado Rapids Podcast"),
    pod("https://feeds.simplecast.com/NLesxExP", "DNVR Colorado Rockies Podcast"),
    pod("https://feeds.simplecast.com/g9sUytnS", "DNVR CSU Rams Podcast"),
    pod("https://feeds.simplecast.com/6b9EvGDp", "DNVR CU Buffs Podcast"),
    pod("https://feeds.simplecast.com/w3d46li7", "DNVR Denver Broncos Podcast"),
    pod("https://feeds.simplecast.com/7ZVpmuZp", "DNVR Denver Nuggets Podcast"),
    pod("https://feeds.simplecast.com/SGXZtmum", "No Lie Zone with Aqib Talib"),
    pod("https://feeds.simplecast.com/o_EAQAOy", "DNVR Rugby Podcast", ARCHIVE),
    pod("https://feeds.simplecast.com/UYfmOm_n", "That's Good Broncos", ARCHIVE),
    pod("https://feeds.simplecast.com/cOpuX_Q8", "DNVR Bets Daily", ARCHIVE),
    pod("https://feeds.simplecast.com/dD_ydntp", "DNVR Biz", ARCHIVE),
    pod("https://feeds.simplecast.com/KPwjnhO5", "DNVR Fantasy Podcast", ARCHIVE),
    pod("https://feeds.simplecast.com/xR16kwiR", "DNVR Gaming Podcast", ARCHIVE),
    pod("https://feeds.simplecast.com/MDdlTtEF", "DNVR Watches Podcast", ARCHIVE),
    ],
  },
  {
    slug: "chgo",
    site: "https://allchgo.com",
    name: "CHGO",
    teams: [
      { name: "Chicago Bears", terms: ["bears", "chicago"] },
      { name: "Chicago Bulls", terms: ["bulls", "chicago"] },
      { name: "Chicago Cubs", terms: ["cubs", "chicago", "wrigley"] },
      { name: "Chicago White Sox", terms: ["white", "sox", "chicago"] },
      { name: "Chicago Blackhawks", terms: ["blackhawks", "hawks", "chicago"] },
      { name: "Chicago Fire FC", terms: ["fire", "fc", "chicago"] },
      { name: "Chicago Sky", terms: ["sky", "chicago"] },
      { name: "Chicago Stars FC", terms: ["stars", "fc", "chicago"] },
    ],
    feeds: [
      yt("@CHGOSports", "CHGO YouTube"),
    pod("https://feeds.simplecast.com/oSbdDATR", "CHGO Chicago Bears Podcast"),
    pod("https://feeds.simplecast.com/TQ8kH_lX", "CHGO Chicago Blackhawks Podcast"),
    pod("https://feeds.simplecast.com/riMPKBGx", "CHGO Chicago Bulls Podcast"),
    pod("https://feeds.simplecast.com/UdlGZkcN", "CHGO Chicago Cubs Podcast"),
    pod("https://feeds.simplecast.com/3aQ_Qkn5", "CHGO Chicago Fire Podcast"),
    pod("https://feeds.simplecast.com/iKarHwD6", "CHGO Chicago Sky Podcast"),
    pod("https://feeds.simplecast.com/nOxhjZ9D", "CHGO Chicago Stars Podcast"),
    pod("https://feeds.simplecast.com/HNFV2iZx", "CHGO Chicago White Sox Podcast"),
    pod("https://feeds.simplecast.com/DxWJevnw", "Hoge & Jahns"),
    pod("https://feeds.simplecast.com/W8AokRyJ", "CHGO Bets Daily", ARCHIVE),
    pod("https://feeds.simplecast.com/OozXBR53", "CHGO Chicago Marathon Podcast", ARCHIVE),
    pod("https://feeds.simplecast.com/BIr493Lk", "The Chicago Sports Podcast", ARCHIVE),
    pod("https://feeds.simplecast.com/9wKz2mHf", "The Eighty Five with Cole Kmet", ARCHIVE),
    ],
  },
  {
    slug: "phly",
    site: "https://allphly.com",
    name: "PHLY",
    teams: [
      { name: "Philadelphia Eagles", terms: ["eagles", "philadelphia", "philly", "birds"] },
      { name: "Philadelphia 76ers", terms: ["76ers", "sixers", "philadelphia", "philly"] },
      { name: "Philadelphia Phillies", terms: ["phillies", "phils", "philadelphia", "philly"] },
      { name: "Philadelphia Flyers", terms: ["flyers", "philadelphia", "philly"] },
    ],
    feeds: [
      yt("@PHLY_Sports", "PHLY YouTube"),
    pod("https://feeds.simplecast.com/_5LM4XbK", "Brandon Graham Unblocked"),
    pod("https://feeds.simplecast.com/QbWKRxI6", "Exciting Mics with Cooper DeJean & Reed Blankenship"),
    pod("https://feeds.simplecast.com/7qsg0BQc", "House of Action with DeSean Jackson"),
    pod("https://feeds.simplecast.com/rR8B4DDE", "PHLY Philadelphia Eagles"),
    pod("https://feeds.simplecast.com/7BmPIfbz", "PHLY Philadelphia Flyers"),
    pod("https://feeds.simplecast.com/vWSpBERj", "PHLY Philadelphia Phillies"),
    pod("https://feeds.simplecast.com/guhJkPIz", "PHLY Philadelphia Sixers"),
    pod("https://feeds.simplecast.com/D_lnH4LC", "PHLY The Cheap Seats"),
    pod("https://feeds.simplecast.com/mCi2p_Jk", "The Anthony Gargano Podcast"),
    pod("https://feeds.simplecast.com/POawYa2U", "Billadelphia with Bill Matz", ARCHIVE),
    pod("https://feeds.simplecast.com/2kiIW93H", "PHLY Philadelphia Union", ARCHIVE),
    pod("https://feeds.simplecast.com/g6yhWEft", "PHLY Sports Interviews Podcast", ARCHIVE),
    pod("https://feeds.simplecast.com/JH7jBFpD", "PHLY Bets", ARCHIVE),
    ],
  },
  {
    slug: "phnx",
    site: "https://gophnx.com",
    name: "PHNX",
    teams: [
      { name: "Phoenix Suns", terms: ["suns", "phoenix"] },
      { name: "Arizona Cardinals", terms: ["cardinals", "cards", "arizona"] },
      { name: "Arizona Diamondbacks", terms: ["diamondbacks", "dbacks", "backs", "arizona"] },
      { name: "Phoenix Mercury", terms: ["mercury", "phoenix"] },
      { name: "Phoenix Rising FC", terms: ["rising", "fc", "phoenix"] },
      { name: "Arizona State Sun Devils", terms: ["sun", "devils", "asu", "arizona", "state"] },
      { name: "Arizona Wildcats", terms: ["wildcats", "arizona"] },
    ],
    feeds: [
      yt("@PHNX_Sports", "PHNX YouTube"),
    pod("https://feeds.simplecast.com/RC4_0PjT", "PHNX Arizona Diamondbacks"),
    pod("https://feeds.simplecast.com/stOiuixb", "PHNX Arizona Cardinals Podcast"),
    pod("https://feeds.simplecast.com/aGnDKsQL", "PHNX Mercury"),
    pod("https://feeds.simplecast.com/zqvZbctT", "PHNX Rising Football Podcast"),
    pod("https://feeds.simplecast.com/TckdR5Mc", "PHNX Sun Devils Podcast"),
    pod("https://feeds.simplecast.com/mVk3kCfc", "PHNX Suns"),
    pod("https://feeds.simplecast.com/ofvgD3sB", "Southwest Bias"),
    pod("https://feeds.simplecast.com/jLdYys_v", "AZ Wildcats Podcast", ARCHIVE),
    pod("https://feeds.simplecast.com/cu7673LY", "McKale Madness", ARCHIVE),
    pod("https://feeds.simplecast.com/jToEoc2V", "Outside Shots with Eddie Johnson", ARCHIVE),
    pod("https://feeds.simplecast.com/u8B_gZOi", "PHNX Bets Daily", ARCHIVE),
    pod("https://feeds.simplecast.com/QoMhugJt", "PHNX Fantasy Sports", ARCHIVE),
    pod("https://feeds.simplecast.com/x_PGqRMY", "PHNX Hockey Podcast", ARCHIVE),
    pod("https://feeds.simplecast.com/5VvcWqet", "PHNX The Focus", ARCHIVE),
    pod("https://feeds.simplecast.com/1Xv38dt6", "PHNX The Story", ARCHIVE),
      // PHNX Wildcats: no RSS feed on the show list yet.
    ],
  },
  {
    slug: "dlls",
    site: "https://alldlls.com",
    name: "DLLS",
    teams: [
      { name: "Dallas Cowboys", terms: ["cowboys", "dallas"] },
      { name: "Dallas Mavericks", terms: ["mavericks", "mavs", "dallas"] },
      { name: "Texas Rangers", terms: ["rangers", "texas"] },
      { name: "Dallas Stars", terms: ["stars", "dallas"] },
      { name: "TCU Horned Frogs", terms: ["tcu", "horned", "frogs"] },
    ],
    feeds: [
      yt("@DLLS_Sports", "DLLS YouTube"),
    pod("https://feeds.simplecast.com/eBUT2VMe", "ALL Horned Frogs Podcast"),
    pod("https://feeds.simplecast.com/4Fqey2NA", "DLLS Dallas Cowboys Podcast"),
    pod("https://feeds.simplecast.com/6IlLpATP", "DLLS Dallas Mavericks Podcast"),
    pod("https://feeds.simplecast.com/GeDcf9ue", "DLLS Dallas Stars Podcast"),
    pod("https://feeds.simplecast.com/rk9bGPyZ", "DLLS Texas Rangers Podcast"),
    pod("https://feeds.simplecast.com/QkyaKTyS", "The Jeff Cavanaugh Show"),
    pod("https://feeds.simplecast.com/NRiW4vof", "DLLS Dallas Wings Podcast", ARCHIVE),
    ],
  },
  {
    slug: "kcsn",
    site: "https://www.kcsn.com",
    name: "KCSN",
    // TODO: KCSN is a partner with no RSS feed on the show list. Add its feeds and teams.
    teams: [],
    feeds: [],
  },
  {
    slug: "creator",
    name: "Creator Network",
    trendSource: "all",
    teams: [],
    feeds: [
    pod("https://feeds.simplecast.com/1nWyKe1s", "Quita in the Morning"),
    pod("https://feeds.simplecast.com/cbbta5Vb", "The Commercial Break"),
    ],
  },
  {
    slug: "allcity",
    site: "https://allcitynetwork.com",
    name: "ALLCITY National",
    trendSource: "all",
    teams: [],
    feeds: [
    pod("https://feeds.simplecast.com/RNdRiRAt", "The ALL NBA Podcast"),
    pod("https://feeds.simplecast.com/O9sfYIPa", "The ALL NFL Podcast"),
    pod("https://feeds.simplecast.com/9_Hk7l5m", "ALL Nittany Lions Podcast", ARCHIVE),
    pod("https://feeds.simplecast.com/mtuEOfxE", "ALL Big Ten Podcast", ARCHIVE),
    pod("https://feeds.simplecast.com/D7lJ6Vno", "ALL Longhorns Podcast", ARCHIVE),
    pod("https://feeds.simplecast.com/2rnzVHU_", "ALL Purpose with Greg Dortch", ARCHIVE),
    pod("https://feeds.simplecast.com/_cH6VI_m", "ALL Utah Hockey Podcast", ARCHIVE),
    pod("https://feeds.simplecast.com/dq0VxIsI", "Big Drive Energy", ARCHIVE),
    pod("https://feeds.simplecast.com/FMbO6DNz", "Keeping it 1000", ARCHIVE),
    pod("https://feeds.simplecast.com/6zIZHH1_", "McChesney Unchained", ARCHIVE),
    pod("https://feeds.simplecast.com/PIy7zdBW", "That's Good Sports Podcast", ARCHIVE),
    pod("https://feeds.simplecast.com/idO01YLR", "The Whole Hard Truth", ARCHIVE),
    pod("https://feeds.simplecast.com/G3Zyc1Kc", "What Chaos!", ARCHIVE),
    ],
  },
];

export const MARKET_BY_SLUG = Object.fromEntries(MARKETS.map((m) => [m.slug, m]));

/** How many trends to keep per market, and how far back to look for news. */
export const TRENDS_PER_MARKET = 12;
export const NEWS_WINDOW = "2d";
