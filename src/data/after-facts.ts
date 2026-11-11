/* THE COURIER'S FACTS, AS DATA (docs/today-after-fifteen.md): how many there are, and where each
   was checked. The words themselves are strings (data/strings-after-facts.ts, keys af.fact.<n>
   and af.fact.<n>.foot, nine languages); this file is what the rules and the tests read.

   A reader gets them in order from NO. 1 (lib/after-fifteen-core chooseThing). Adding one: write
   it in all nine blocks, add its source here, and the count follows. Never reorder: a number a
   reader kept in their Lore must go on meaning the same fact.

   Every fact was checked against the page listed for it on 2026-11-11 (a fact that could not be
   confirmed was dropped, not softened: the robin and the Victorian postmen, the loudness of a
   wren's song, the sixty-one wrens in one nest box, the peregrine's dive, Santa's post office in
   Rovaniemi). NO. 2's sheet of paper is arithmetic, not the page's: an A4 sheet is a sixteenth of
   a square metre, so at 80 g/m² it weighs 5 g.

   Five were corrected the same day, after the native editors doubted them and the pages were
   read again word for word: NO. 46 named Tonga alone as first (the page says the tropics, "such
   as Tonga in July 1963 and Sierra Leone in February 1964"); NO. 36 said "for ten years" (trial
   perforations came at the end of 1850, official ones in 1854); NO. 39 counted 131 years "at sea"
   (1886 to 2018 is 131 years and some months, and the bottle lay ashore for much of it); NO. 17
   did not say whose motto it is; NO. 58 read as if Hook's being its writer were the point (he was
   a writer by trade). */

export const AFTER_FACT_SOURCES: readonly string[] = [
  "https://en.wikipedia.org/wiki/Penny_Black", // 1
  "https://en.wikipedia.org/wiki/Eurasian_wren", // 2
  "https://en.wikipedia.org/wiki/Susami,_Wakayama", // 3
  "https://en.wikipedia.org/wiki/The_Letters_of_Vincent_van_Gogh", // 4
  "https://en.wikipedia.org/wiki/Pillar_box", // 5
  "https://en.wikipedia.org/wiki/Arctic_tern", // 6
  "https://en.wikipedia.org/wiki/Lewis_Carroll", // 7
  "https://en.wikipedia.org/wiki/Japanese_postal_mark", // 8
  "https://en.wikipedia.org/wiki/Eurasian_wren", // 9
  "https://en.wikipedia.org/wiki/Pony_Express", // 10
  "https://en.wikipedia.org/wiki/Postage_stamps_and_postal_history_of_Great_Britain", // 11
  "https://en.wikipedia.org/wiki/Hummingbird", // 12
  "https://en.wikipedia.org/wiki/Airmail", // 13
  "https://en.wikipedia.org/wiki/Basel_Dove", // 14
  "https://en.wikipedia.org/wiki/Sanquhar", // 15
  "https://en.wikipedia.org/wiki/Pillar_box", // 16
  "https://en.wikipedia.org/wiki/United_States_Postal_Service_creed", // 17
  "https://en.wikipedia.org/wiki/Iron_gall_ink", // 18
  "https://en.wikipedia.org/wiki/Bar-tailed_godwit", // 19
  "https://en.wikipedia.org/wiki/Letterlocking", // 20
  "https://en.wikipedia.org/wiki/Letterlocking", // 21
  "https://en.wikipedia.org/wiki/Treskilling_Yellow", // 22
  "https://en.wikipedia.org/wiki/Rocket_mail", // 23
  "https://en.wikipedia.org/wiki/Farthing_(British_coin)", // 24
  "https://en.wikipedia.org/wiki/Floreana_Island", // 25
  "https://en.wikipedia.org/wiki/Jane_Austen", // 26
  "https://en.wikipedia.org/wiki/Common_swift", // 27
  "https://en.wikipedia.org/wiki/Paris_pneumatic_post", // 28
  "https://en.wikipedia.org/wiki/Christmas_card", // 29
  "https://en.wikipedia.org/wiki/Woodpecker", // 30
  "https://en.wikipedia.org/wiki/Envelope", // 31
  "https://en.wikipedia.org/wiki/Bridegroom%27s_Oak", // 32
  "https://en.wikipedia.org/wiki/Pencil", // 33
  "https://en.wikipedia.org/wiki/Hikkim", // 34
  "https://en.wikipedia.org/wiki/Juliet_Club", // 35
  "https://en.wikipedia.org/wiki/Postage_stamp_separation", // 36
  "https://en.wikipedia.org/wiki/Port_Lockroy", // 37
  "https://en.wikipedia.org/wiki/Quill", // 38
  "https://en.wikipedia.org/wiki/Message_in_a_bottle", // 39
  "https://en.wikipedia.org/wiki/Lyrebird", // 40
  "https://en.wikipedia.org/wiki/Inverted_Jenny", // 41
  "https://en.wikipedia.org/wiki/Japanese_New_Year", // 42
  "https://en.wikipedia.org/wiki/ZIP_Code", // 43
  "https://en.wikipedia.org/wiki/Owl", // 44
  "https://en.wikipedia.org/wiki/Crossed_letter", // 45
  "https://en.wikipedia.org/wiki/Self-adhesive_stamp", // 46
  "https://en.wikipedia.org/wiki/Frigatebird", // 47
  "https://en.wikipedia.org/wiki/Postscript", // 48
  "https://en.wikipedia.org/wiki/Pigeon_post", // 49
  "https://en.wikipedia.org/wiki/Postage_stamps_and_postal_history_of_Bhutan", // 50
  "https://en.wikipedia.org/wiki/Stationery", // 51
  "https://en.wikipedia.org/wiki/Cai_Lun", // 52
  "https://en.wikipedia.org/wiki/Mail", // 53
  "https://en.wikipedia.org/wiki/Postal_codes_in_Canada", // 54
  "https://en.wikipedia.org/wiki/Kiwi_(bird)", // 55
  "https://en.wikipedia.org/wiki/Flamingo", // 56
  "https://en.wikipedia.org/wiki/Wandering_albatross", // 57
  "https://en.wikipedia.org/wiki/Postcard", // 58
  "https://en.wikipedia.org/wiki/Ochopee_Post_Office", // 59
  "https://www.smithsonianmag.com/smart-news/what-happened-when-australian-city-gave-trees-email-addresses-180955851/", // 60
];

export const AFTER_FACT_COUNT = AFTER_FACT_SOURCES.length;
