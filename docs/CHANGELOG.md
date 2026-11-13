# Kindredly iOS: what changed, release by release

This file lists what a person using the app would notice in each App Store release, newest first.
Write the App Store What's New (`design/store/whats-new-*.json`, `design/store/asc-*.json`), the
in-app what's-new reel (`src/components/news-reel/`) and the guide reels
(`src/components/guide-reel/`) from it, so none of them leaves anything out.

## How to keep it current

- When a commit changes something a user would notice, add one line to **Unreleased** in that same
  commit, under New, Changed or Fixed. Write it in plain English, one line, about what the person
  sees, not how it was built.
- Leave out internal refactors, dev pages, tests, store assets and build plumbing.
- Tag a line `[switch: key]` when a remote switch can turn it on or off without a build (the web
  table `app_surfaces`, migration 0033). Tag it `[server: 00xx]` when it needs a web migration or
  endpoint before it works.
- If a later commit changes the same thing before the release, edit the line; don't add a second
  one. The list says what ships, not the history.
- When a build is cut, give Unreleased its App Store version, binary version, build numbers and
  date, and start a new empty Unreleased above it. Then check that every New line is in the store
  What's New, the news reel and the guide reel it belongs to, or is left out on purpose. List the
  gaps under **Not yet told** for that release.
- App Store versions and binary versions are different numbers. The binary version always stays
  above every published one, so an over-the-air update can never land on the wrong build.

| App Store | Binary | Builds | Code | Dates |
|---|---|---|---|---|
| 1.0.9 (TestFlight only so far) | 1.2.8 | 40– | `ios-1.2.3` | b40 built in the cloud 11-10 for testing: everything under Unreleased below; not submitted for review |
| 1.0.8 | 1.2.7 | 38–39 | `ios-1.2.3` up to dd98c4a | b38 uploaded 10-31, b39 11-01; **approved 11-09**; OTA 11-10 (group e4caa912, branch `ota-1.0.8-fixes` = dd98c4a + db822b9 + fdc364d) |
| 1.0.7 | 1.2.6 | 36–37 | `ios-1.2.3` | b36 built and uploaded 10-28 from a2f2159, not submitted; b37 adds the glass tab bar and the guest stamps fix |
| 1.0.6 | 1.2.5 | 35 | `ios-1.2.3` at b355ff6 | uploaded 10-25, expedited review, **live 10-25 03:03 Beijing** (Apple lookup) |
| 1.0.5 | 1.2.4 | 29–34 | `ios-1.2.3` up to b710f2f | b34 rejected for a launch crash, then approved and **released automatically 10-25** — it crashes at launch on every iOS 27 phone (built with Xcode 27 without the scene life cycle); 1.0.6 fixes it. Web launch-day deploy and 0035 the same day |
| 1.0.4 | 1.2.3 | 28 | `hotfix-1.0.4` (worktree `../kindredly-ios-hotfix`) | submitted 10-15, approved about 10-16 |
| 1.0.3 | 1.2.2 | 27 | `plan-c-sealed` at 0906ab5 | approved 10-13 |
| 1.0.2 | 1.2.1 | 25 | `plan-c-sealed` at 511a229 | built 09-26 (before this file) |

---

## Unreleased

What the phone remembers is no longer lost when several screens write at once (owner, 2026-11-13, on his phone after signing out and in: "成了kindreds 的对话 每次…总是要播放一下成为kindreds 哪个动画", "wren 的消息显示xx 点进去还是那些老的", and on the simulator "meet mist 又跳出来了") [JS: can go over the air]
- "Meet Mist." (your first kindred's gift), a kindred's introduction, the count of Wren's posts you have seen, a room's letters you have read, the notices you have seen and other small things the phone keeps for you are each one record, changed by reading it, adding to it and writing it back. Two screens doing that in the same moment (most often right after a sign-in, when every screen opens together) both read the same old record, and the second write threw the first one's addition away: seen on the simulator as "Meet Mist." coming back on the next visit to Me. Every such change now waits its turn and stays on the account it began on, so a change begun before a sign-in can't read the guest's record and write it over the account's. "Meet Mist." also can't show on Kindreds and Me at once any more: the first to claim it shows it.

The app icon is Wren (owner, 2026-11-13, after the COO asked for the blue of the top social apps: "那就1了") [binary]
- The icon is Wren peeking up from the lower left of a cobalt tile: white, with her wing, a butter-yellow belly and a coral beak. In iOS's dark home screen she sits on a night navy; in the tinted one her body, belly, wing and beak stay apart in one colour. (It was the abstract orbit mark; the yellow-tile Wren of 2026-11-12 on branch `wren-icon` never shipped and is replaced by this one.)

One make of header key everywhere, pearl Next and Reply, and her own face on Me (owner, 2026-11-13: "想象你是苹果的设计水准 … 点的时候不能做出毛玻璃么 类似底导航那样的效果么", "日历那个没带点色彩?", "统一一下", "整体kindreds那种白色就很不错", "ok" to the pearl; of Me's card: "什么逻辑 … 这里的信使有表情同步么") [binary, except her face on Me's card: JS]
- The keys at the top of Notes, Kindreds and Me are one make: a white capsule with a thin line round it, like Kindreds' chips (flat, no shadow), the keys of a page sharing one capsule, with the system's own symbols at a toolbar's size and weight. Under a finger the tab bar's lens swells behind the key, a bright glass bubble standing a little past the capsule's edge; a key that is on (the calendar, the orbit) stays lit in indigo. Notes: search, the view, the calendar (three grey discs with drawings of our own before); the view symbol changes with the system's replace animation and a tick is felt; the calendar's header wears your latest day's mood colour this month (ink before the month's first page), and the three tiny mood squares inside it are gone. Kindreds: the orbit and search, as tall as the chips beside them (two outlined chips before). Me: Edit (pencil and word) and the gear (an outlined pill and circle before), and the same two in the bar the cover folds into (plain icons before). On the Duo's band each key is its own white disc.
- Notes' calendar is set as iOS sets a month (owner: "这个日历点开感觉又有点山寨了"): the title in sentence case on the left ("November 2026", system 20 semibold, no spaced typewriter capitals), the system's chevrons in the accent and its round close key, the weekday letters in the system font; every day its number over a round slot: a day with pages wears its newest page's face, round now (square tiles before), a past day without one is a quiet empty circle, the future has none and its weeks take only a line; today's number is white on a small accent capsule (it was boxed in a heavy indigo frame). The card has corners of 28, a hairline and a lighter shadow.
- Pressing a key at the top of a page shows: under the finger a breath of ink swells behind it, standing a little past the capsule's edge, as the tab bar's lens does (the first try drew a white bubble on the white key, which read as nothing pressed). Kindreds' filter chips (All, Kindreds, Pen pals) swell the same way under the finger instead of fading.
- Writing back from an unfolded long letter opens the same reply box as Today's Reply: "Replying to …", the field in your Letter font, emoji and send, and the corner key that grows it into a full page with the letter's opening quoted (owner: "长信 点了write back 还是老的这个reply"). It was the older bar with "REPLY AND A THREAD OPENS" over a pill.
- The launch is Wren peeking out of a letter (owner: the icon is the cobalt Wren now, "启动动画也需要一个与之对应的创意启动页"; then of the white letter round the white Wren "和wren撞色", "蓝鸟 peek 白信封"). On the icon's cobalt a white letter comes down, hops twice as if something were inside, its flap opens, and Wren, in her own indigo, rises out of it, opens her eyes, looks at you, and a butter ✦ pops by her head; then "kindredly" and its line. 1.85 s on the first open after an install or an update (a light tap as she comes out), 1.3 s from the flap on every other open, the last frame fading in under Reduce Motion. It was the egg hatching into the orbit mark on Post Blue. The splash before it is the plain cobalt (it was Post Blue). [binary; an older binary keeps the hatching mark]
- Sign-up's first screen opens out of that last frame on the same cobalt: the letter with Wren in it flies down onto the first card and becomes its stamp, a cobalt window with Wren peeking out of her letter, and every stamp of the brand in sign-up is that picture now. The sign-up screens' blue is the icon's cobalt (it was Post Blue). [binary]
- Settings: Appearance is one row ("Appearance › Lavender") and its own page, as Telegram and Grok do it (owner: "appearance 和front 不行合在一起 做个视频里的这种方案"; before that: "能不能小点 太大了夸张"). The page opens on a letter as Today shows one, with your pen name and today's postmark, set in the theme and the font you have chosen; under it the five appearances (System, Light, Dark, Lavender, Paper), then Font with its four faces in one row. A tap changes the letter and the whole page at once. On a binary without the page, Settings keeps the swatches and fonts on itself, as before. [binary for the page; the row only where the binary has it]
- Newsreader, chosen as the font, draws letters in Newsreader again on every Swift page: since 2026-10-26 the Swift pages read it as System (the default's change dropped its case), so only the React Native pages showed it. A New York stored before 2026-10-20 reads as Newsreader there too. [binary]
- "Moments you kept" is "Things you kept" (page title "Kept"), in all nine languages, and the end of the day's Keep says it keeps the thing there (it said "your Lore", a third name for the same page). It holds lines kept from letters and rooms and the facts kept from Wren at the end of the day, and a fact was never a moment (owner: "在设置里为啥叫moments you kept 什么叫法好"). [JS]
- Settings: the First Class card at the top goes away once you have tapped it (owner: "如果用户点了 就消失"); members never saw it. [binary for the native Settings; JS for the fallback page]
- After the day's last letter the old end of the day no longer flashes by (owner: "读完信后 怎么老的那个闪了一下 ？ 老的那个就不要了"): Wren no longer starts her flight into the window and her letter no longer rises for a moment before the new page. The last card leaves, Next and Reply fade, and the page takes the desk's place. If the page's record can't be read, the old end is drawn, still. [binary; with an older binary the old evening still starts under the page's arrival] [switch: afterfifteen]
- Wren's face in Kindreds looks out at you: front on, round and white with her butter belly, two big eyes, a small coral beak, blush, and on her head a feather ending in a butter ✦ (the official helper she is growing into), on a cobalt round like the other faces, and the same face fills the round at the top of her room (owner: "官方wren 的头像好难看没有背景而且和下面的头像不搭配", then of the icon's side view: "一点都不像官方的agent bot … 要个正脸可爱的", then "官方wren 头像点进去咋还是老的"). It was a small bird on a grey disc in both. [JS + a new picture: assets/wren-avatar.png; her room's header: binary]
- The tab bar is lower: the + is 42 (44) and rises 10 (14), so its top meets the bar's edge and only its collar crests it (owner: "底导航…太高了 把圈➕整体下移一些"). Opening it no longer drops the disc down into the row under your finger ("他砸自己向下弹"): it turns into the × where it is, and the glass grows up round it.
- The selected tab's whole icon is indigo, outline and all (owner: "底导图标点上后的蓝色变化是不是有点浅"); only its small accent was indigo before. Unselected icons stay grey.
- Today's Next and Reply are pearls of glass: a milky body, a soft light across the top, a bright rim and a closer soft shadow. On the white page the glass has nothing behind it to show, so this is what it reads as there (as iOS's own does on white). Same place, size and press.
- Me, her card: her face is the one her page opens on (hunger's; a doze after five quiet days at home; else where she is: content at home, curious at a door, delighted bringing a reply, listening while out). A tap on her is a poke, as on her page: the next of six faces for a moment, a little hop, a light tap felt; it no longer opens her page. Her name and badge, her journey and her flight log's lines all open her page, as Open does (the journey and the lines did nothing before); the looks under the hairline stay their own keys.

What's new, as one night (owner, 2026-11-13: "做的有创意一点 类似创意广告的思维做 别总是流水线似的") [JS: can go over the air onto 1.2.8; plays only while the switches meplanet and afterfifteen are on; the post that carries it is SQL the owner runs once 1.0.9 is live]
- Wren's post for 1.0.9 carries a card whose animation is one short night instead of a list: 11:47 pm on a home screen with the new icon, "just one more.", the tenth letter (someone who finally said no), the thumb tapping an empty desk, "that's 10. i'm wrecked.", Snack, Pat and Lights out on her bedtime page, her asleep on her planet as its lamps come on ("each light is someone your letter reached."), and dawn folding into the new icon: "new icon." / "it's me. checking if it's 8 yet." Under it, "Today has an ending now.", a paragraph on the ten letters, the three end-of-day pages, Me's planet and Kindreds' round and square faces, and See her planet. Nine languages.

Ten letters a day, and a letter comes once (owner, 2026-11-12: "每天15份读信是不是有点多", "10 很好", then "好多信重复被推荐") [OTA 11-12 to 1.0.8 / binary 1.2.7: group 03fbca68, branch `ota-1.0.8-day-ten` 4ae541f] [server: 0054] [switch: letteronce, for the second line]
- Today's desk holds ten letters a day instead of fifteen. The help page says ten in all nine languages, and the guide animation's desk is five by two. Your courier's count at the end of the day ("that's 10.") is always the real one, so it never goes past ten, and the lock screen's row of opened envelopes is ten long at most.
- A letter you have read never comes back to your desk, on the iPhone or on the web; one you only flicked past doesn't come back on this phone either. When the newest letters are all read, the desk reaches back up to two months for ones you haven't seen, and only then deals fewer than ten.
- One letter per writer on a desk: someone who wrote several today shows up once.

Today is flat: no lavender behind the buttons, no lavender edge on the letter (owner, 2026-11-12: "紫色的底哪里来的", then "去掉吧") [binary]
- The faint lavender glow at the foot of Today, behind Next, Wren, Reply and the tab bar, is gone on every iPhone: the page is one colour from the title to the tab bar.
- The letter no longer has a lavender edge showing to its right and under it. It is a flat sheet with a hairline round it, on Today's card, on Wren's letter when the day is done, on the loading and offline card, and when a long letter is unfolded (which is now centred: it kept 6 points clear on the right for that edge). In every theme; the dark theme had a grey edge there.

iPhone Duo, the folding iPhone (owner, 2026-11-12: "需要做完在模拟器看", then on the inner screen "要把整个屏都利用起来") [switch: duo; needs a binary; nothing changes on a phone that doesn't fold]
- On both of the Duo's screens the tab bar stands upright at the foot of the right edge, where the hand holding the phone has its thumb: the four icons in a capsule of their own, with the red details and the badge, and under them the black + on its own in the corner (owner, at the + half-way up the column: "感觉侧边很奇怪"). The + opens a card out of itself, to the left and up, with Write a letter and Daily note, and becomes the red × in the same corner. Pages keep out of that edge.
- On a page opened over the tabs (a letter, a conversation, writing a letter or a note, settings), the foot corner of that edge, where the + stands on the tabs, holds the way out: a back arrow, or the page's own ✕ on a page that rose from the bottom (which still asks before words are lost). The page's own arrow at the top left is still there. And while you write back on Today's inner screen, where the tab bar has stepped out, the same corner holds a ✕ that puts the reply away. [JS]
- A page's round keys stand in that edge too, over the tabs, instead of at the top of the page (owner: "日历和切换 grid/card 图标什么的自动切到侧边栏"): Notes' view and calendar (and its search on the inner screen), Kindreds' orbit and search, Me's Edit and settings. As many as fit under the clock (two on the outer screen, three on the inner); the rest stay where they were. Today has none.
- Half-folded (the two pages at an angle), Today's letter keeps to the left page and Next, Wren and Reply stand in the middle of the right one, so no line of the letter runs across the bend. Held upright and half-folded, like a small laptop, the letter is the upper half and the three stand in the lower one. Writing a letter, writing in the diary, a conversation, Wren's room and a letter with its reply do the same in that laptop posture: the whole page is the upper half, its bar just over the bend, and the lower half is left for the keyboard.
- On the inner screen, Settings, Edit profile and the other pages under Me keep to one column in the middle (no wider than 560), like every other single page; they stretched across the whole screen.
- Notes' month on the inner screen's left page fills the page (taller days, the cards' own mood faces once there is room) and lies flat on a hairline, instead of a phone-sized card floating in the middle with a shadow.
- An unfolded long letter on the inner screen keeps a reading width in the middle (about sixty characters a line), with Write back and the reply bar as wide as the letter.
- After the day's last letter on the inner screen, the day's page (the mailbox, the receipt or bedtime) keeps the left page at about a phone's width, and the whole right page is a window onto her game, as tall as the day's card (owner, 2026-11-13, of a small card floating there: "感觉很奇怪 … 没有满屏"): the sky she plays under at this hour (morning, day, evening or night, with the sun, or the moon and stars), the game's pillars and ground, and her flying in the gap, gently rising and falling (still with Reduce Motion). On the ground stand her game's words and the play button, and a tap anywhere on the window opens the game. When she can't play she sits on the ground asleep and the window says when she is back. Undo, while it is offered, hangs at the window's top. (Before the small card it was a mailbox 835 wide over one long strip.) A voice letter's player keeps a phone's length on the open sheet too.
- The unfold: when the phone comes flat open on Today, the letter's right half swings over from the left page, about the crease, and lands on the right one, as a folded letter is opened (about half a second; not with Reduce Motion, and not when the app is started already open).
- Opening the phone opens the letter: on the inner screen Today's letter lies open across the whole screen, with Next, Wren and Reply floating over its bottom edge on the right. Reply moves the letter to the left page and gives you the right page to write back on, from the letter's top to the keyboard.
- Reading one letter of a correspondence on the inner screen: their letter keeps the whole left page (with the letters before it, when unfolded), and the right page is a sheet to write back on, from its top to the keyboard. On a phone the reply bar sits under the letter and the keyboard squeezes the letter to a couple of lines.
- Writing a letter on the inner screen: the right page is the page you write on, as on a phone; the left page is the envelope the letter will travel in (your courier name, your frosted window, your star sign, today's date, "to: someone who writes like you", the stamp in its corner) with the stamp tray under it, open for good. A stamp tapped there is on the envelope at once, and the keyboard never has to go away for it. [the envelope shows no ♀ / ♂: a stranger never sees one]
- Writing a diary note on the inner screen: this month's mood calendar is the left page, today's square taking the mood as you pick it, and the note is the right page exactly as on a phone.
- Notes on the inner screen is the month on the left page and your notes on the right; a day tapped on the left takes the right to that day's note.
- Kindreds on the inner screen is the orbit on the left page, always open, and the list on the right. Tap someone and the list moves to the left page (the eye still opens the orbit there) while their conversation opens on the right page, with its own header and its composer at the foot; tap someone else and the right page changes, with no going back and forth; the conversation's back arrow closes it. The tab bar never leaves. Fold the phone and the conversation carries on full screen on the outer one; open it again and it is back beside the list. Wren's own room opens there too.
- Me on the inner screen is her planet as the whole left page (it turns under a finger) and you on the right: your face and name, her card and the tiles.
- On the outer screen Me's sky runs under the clock to the edge, with her planet, the moon and the stars in the middle of the page rather than under the clock; and every tab runs down to the bottom of the glass, with only a short fade over the home indicator (there is no tab bar along the bottom to fade into).
- Pages that are one list (Settings, the paywall, onboarding) sit as one column in the middle of the inner screen, no wider than 560, and a key never grows longer than it is on a phone: "Hatch my courier" stays its phone length there.

What the owner found on build 42 (2026-11-12) [the spacing and the onboarding marks need a binary; the rest is JS]
- Me no longer opens on guesses. It used to draw an egg, no day and a dash for your numbers until its first read came back from the network, then change under your eyes (a grown courier flashed as an egg with her journey strip; kindreds and notes appeared late). It now opens on what it knew last time, kept on the phone, and her stage is the one the rest of the app draws.
- A guest's courier is no longer an egg on Me after hatching: Me follows the app-wide stage, which knows a guest's bird has hatched.
- The Edit button no longer reads "jd.edit": the page loads the wording files it borrows from other screens.
- More room between Edit / the gear and her card (14, then 26, then 40 after the owner looked again: "还是和设置什么的贴的太近").
- Onboarding is drawn by SwiftUI by default: flat keys and soft shadows, no black edges. (The React Native run is kept as the fallback.)
- One look for a person's mark and star sign everywhere (owner, 2026-11-12: "信上也统一"): the she/he mark is white on a small pink or light-blue disc and the star sign is its emoji — in Kindreds, in a conversation's header, on a kindred's page, in the blocked list, on Me's pill and through onboarding (the pronoun chips, the birthday badge and its sentence, the envelope). Until now they were grey line drawings. Sentences that mention the symbols in running text ("Show ♂ to your kindreds") keep the plain symbol. [binary]

Gender is for kindreds only (owner, 2026-11-12: "信上就别显示性别了吧 只有成为kindreds 才能看见性别") [JS, except the kindred's page and the revealed header, which need a binary]
- A stranger is never shown with ♀ / ♂ any more: a letter on Today, the reader, a pen pal's row and conversation, the blocked list and every sample card show the courier name and the star sign only, and VoiceOver no longer says "she" / "he" for them. One rule in one place (lib/stranger-who `marks`), so no screen can show it by mistake.
- Kindreds see it: after the pen name on a kindred's row in Kindreds, in the kindreds chat's header, in a pen-pal chat's header once names are traded, and on the kindred's page. A kindred whose account is gone shows none.
- Onboarding's "This is you, to a stranger" card has no ♀ / ♂ and no switch for it (the star sign's switch stays); the envelope you stamp and send has none either. A new she / he user's mark is saved on, for kindreds.
- Words, nine languages: Edit profile's group is "WHAT OTHERS SEE" (was "ON YOUR LETTERS"), the switch is "Show ♀ to your kindreds", its note says only kindreds see it, after your pen name; the pronoun step says only people you trade names with see the mark; the one-time note and the YOU group's footer say the same. Three unused onboarding strings that promised the mark to strangers are deleted.
- The server side is written and tested, waiting for the owner to run it: web migration `0052_marks_kindreds_only.sql` makes `marks_for` answer ♀ / ♂ only to someone who has traded names with that person (and to themselves). Once run, every client stops showing a stranger's mark within 30 minutes, old App Store builds and the web included, with no release. Run in an embedded Postgres against stubbed tables: 21 checks (kindred on either side of the row, pen pal, no thread, self, a blocked pair, a deleted side, batches, no session, the 60-id limit, grants, re-run, and the owner's own check block).
- Web (not deployed): the profile page's switch reads "Show ♀ to your kindreds" with its new note in ten languages, the group is "What others see", and "YOU, TO A STRANGER" no longer wears the mark. The web still draws the old grey line marks; it shows none to kindreds yet.

The tab bar: a black + that opens blue, and the + stands proud (owner, 2026-11-12: "➕ 咱们的蓝色 换成…黑色设计", "➕发布那里是不是也可以做一个向上凸的"; that evening, after an afternoon of red accents: "底部导航还是蓝色适合我们 类似线上的版本", "发布的那个圈还是有点大", "一点之后变成蓝底白x") [binary; switch: tabraised for the raised + only]
- The + is a black disc with a white + (on the dark theme a light disc with a black +). Open, it turns into a white × on indigo. It was an indigo disc that went black when open.
- The + is 44 across with a bigger, bolder mark, and stands 5 points over the bar's top edge, with the bar's glass rising round it in one smooth swell. While the bar is open round Write a letter / Diary note the swell flattens and the × sits in the row; it rises again as the bar closes. The part of the + over the edge is pressed like the rest of it.
- The selected tab's detail and the count on Kindreds are indigo, as they are in the App Store version: nothing changes there.
- Opening Write a letter or Diary note from the + no longer stutters: the page used to stop a hundred points short of the top for half a second and then finish, because the bar under it was closing in the middle of the page's rise. The bar now closes once the page covers it. [JS]
- Diary note rises once, whole (owner, the same night: "点写日记…还是抖", "重复跳了两次页面的感觉"). The photo roll used to rise with "No photos yet." in it, then grey squares with their rings, then the pictures one by one, all while it was still moving; it now opens with its pictures already there (the + reads the roll's first page and pictures while it is open, only if the phone already allows the library). And Text note, Voice note, the camera and Next no longer raise a second page over the roll: the page to write on fades in where the roll stands, and still slides down when you close it. "No photos yet." only shows once the roll has really been read. [the fade and the empty line: JS; the pictures ready on the first frame: needs a binary]
- Write a letter no longer shakes the first time it is opened after the app starts: the page used to jump back down a few times on its way up while your courier's pictures for it were being drawn, because taking each picture made the whole screen redraw in the middle of the move. Her pictures are now taken without touching the screen (the same pixels, checked on all 253 of them), and are still taken ahead, a moment after the app opens and again when the + opens. On the simulator, with nothing taken ahead, Write a letter rises bottom to top in 0.3 s and Diary note's photo roll in 0.37 s, neither stepping back once. Her pictures on the SwiftUI screens are also a shade truer: they were labelled as wide-gamut colour they didn't hold, so she was drawn slightly too vivid there. [JS]

Small fixes (2026-11-13; the last two days' work read over again, every finding checked in the code before it was changed)
- A hatchling no longer carries a letter when she flies off the clock: her game's strip and window after the day's last letter drew her with an envelope at her feet (the drawing kept the letter whenever her hatchling shape was applied). [the strip and window: binary; her pictures elsewhere: JS]
- Today on every iPhone: the next letter rising after Next, a letter pulled down and Wren's letter's tag are drawn whole again. Since the Duo's unfold (b03fdd1) the card's slot clipped them: the rising letter showed no foot or corners, as if coming up from behind a line. [binary]
- A guest's end of the day is always the mailbox, as the pages were meant to be: a guest of three days or more was given the receipt on Sundays and bedtime after 8. And the page's countdown and sky are the clock's from its first frame, never the last showing's. [JS]
- Me: the stamps number on the cover counts every stamp you made that stands (it stopped at 2, the card's preview), and its "+" no longer says it opens your album; the notes number says "1 note" for one (nine languages); a look you put on stays where you tapped it, so a second tap there takes it off (it used to jump to the front and the next look slid under your thumb); a First Class piece she still wears after membership ends can be taken off from the shelf; VoiceOver can open her planet page from the cover (only a pull did); and the first visit to Me in a session no longer shows the old page of segments for a moment. [JS; the VoiceOver way in: binary]
- Diary note's photo roll is read again every time the + opens (a photo taken a moment ago is in it) and dropped when you leave the app; with access to selected photos only it is not read ahead, so iOS's own "Select more photos" question never comes up over the +. [JS]
- Make your own face: if she finished painting while iOS was asking about notifications, the page stays on her answer instead of closing on it unseen. [JS]
- Catch a line: a slip's words stop growing at Large, so with Reduce Motion and bigger text the slips no longer cover each other. [binary]
- iPhone Duo: a conversation open beside the Kindreds list is put away when you go to another tab (it went on underneath, marking a kindred's new letters seen, and was pushed over that tab when the phone folded); Settings and Me's other pages on the outer screen keep out of the band; the corner key rides above the keyboard (Today's reply ✕ was under it) and is not offered while a letter is going out; editing an older diary page paints its own day on the month beside it, not today's; the empty Kindreds page keeps to the column instead of running across the crease; a page's keys leave the band when the page goes; the stamp corner on the writing spread no longer opens a tray nobody sees; the dim behind a reply covers the whole window held upright; "Reply sent." stands over the band wherever the fold puts it; the long-letter reader no longer runs past the outer screen's edge; and a hinge the system can't read yet, with no other sign of folding, is treated as a phone, so an iPhone that doesn't fold can never get the folding layout. [mostly binary; the Kindreds, Me, corner key, diary and toast fixes: JS]

Kindreds before anyone is in it: catch a line (owner, 2026-11-12: "按2d的做", then "那个马赛克和称呼要用我们现在的") [binary; switch: kindredscatch]
- The empty Kindreds tab is something to do instead of something to read. The first lines of today's letters drift down across the empty orbit on slips of their topic's colour; tap one and its letter opens under the sky, with who wrote it as Today shows them (the courier name, the frosted window, the star sign; never ♀ / ♂) and two buttons: Let it go (the slips drift on) and Write back.
- Write back takes you to Today with that letter on top and its reply box open. It is the same letter and the same reply as on Today, so the day's fifteen, the five in flight and a guest's sign-up are exactly what they were; a letter you had passed today comes back when you catch it. Once you have written to someone, the tab is the usual orbit and list.
- The lines are only the letters on your own desk today (text letters with a writer; a voice letter has no line). Six at a time, in two columns that never cover each other; each visit to the tab starts further along the desk. With no desk yet today, on an older build, or with the switch off, the page is what it was (the orbit, "Nobody knows your name yet", the button).
- The big "Put someone in orbit" button is not on this version of the page: writing your own letter is the + in the tab bar.
- With Reduce Motion or VoiceOver the slips stand still in the same two columns.
- Type and colour follow the app's own rules (owner, the same day: "字体统一我的系统", "dark适配也要美观"): a slip's line and the opened letter are in your Letter font; names, buttons and the two lines under the sky are System; the topic is Today's own tag. In the light themes a slip is a pale paper of its topic's colour; in the dark theme it is the dark surface with a thin edge in that colour, so nothing turns muddy on black.
- Words in nine languages: "Letters are passing through. / Tap one before it drifts off.", "Let it go"; "Write back" is the app's own.

Kindreds' orbit: you in the middle, your kindreds beside you, strangers coming closer (owner, 2026-11-12: "最中心应该是我头像的小缩略 … 由小模糊慢慢变大的模糊到内环清晰小缩略", then "好 开工") [binary]
- The middle is your own face, round, with no ring round it (it was a small ink square).
- Your kindreds are back on the orbit, on a ring of their own just round you: their real faces, round and clear. At most eight, the ones you have heard from or written to most lately; they turn together, slowly, evenly spaced. A kindred with letters you have not read wears the indigo ring. A tap opens their room. (Since B3 a kindred left the orbit once names were traded.)
- Strangers are their frosted windows, as before, but small and faint far out and larger and solid as they come in: one size and one step of strength per letter of theirs. The window never sharpens (it is no photograph, and no stranger's face is shown before names are traded); the square becoming a round face is the trade itself. The your-turn ring stays at full strength however far out they are.
- Sizes and distances were then set by hand (owner: "你看着调整最合理的距离和大小"): strangers grow 1.4 units a ring, 5 for someone who has not written back up to 12 on the innermost ring (the innermost is 2.4 times the outermost; at 1 unit a ring next-door rings looked the same), then kindreds at 15 and you at 22. Each lane is as wide as the face that rides it, so the rings sit closer together on the way out. The rings are flatter (.70, were .78), which uses the band's width instead of leaving a fifth of it empty on each side. Nothing is cut off at the top or bottom any more. A small window's your-turn ring is 1pt, so the ring is never larger than what it rings. All of it is one value, `KOrbitLayout.standard`; `design/kindreds-orbit/orbit-sheet.swift` renders it with one, five and eight kindreds in both themes without a build.
- Shape says who is who: round = someone with a name (you, a kindred), square = a stranger.
- The React Native fallback keeps the old drawing (strangers only, the ink square).

The dark theme is neutral black (owner, 2026-11-12: "dark 模式看起来黑蓝色，为啥不和别的产品一样，类似 twitter") [binary: the Swift theme is generated code. The JS is safe over the air: an older binary keeps the old dark in both renderers]
- Why it looked black-blue: every grey in Midnight was mixed from the brand indigo (hue about 245°, a third saturated): the page #0F0E1C, cards #1A1830, dividers #2F2C4B. Now the page is true black and the greys carry no colour, as X, Instagram and iOS itself do: page #000000, cards #16181C, raised fills #202327, dividers #2F3336, text #E7E9EA / #B4B8BC / #8B8F94. The brand indigo (#8E89FF) stays where it means something: the main action, your own bubble, a selected state's text. Every text pair has the same contrast as before or more.
- The tinted fill (selected chips, notices, the glow under Today's letter) is a near-neutral grey with a trace of violet (#26272F) instead of a navy (#2E2A66); the hard drop behind an object (Today's letter, the Aura card, tickets) is the divider grey instead of a violet (#3A3580); the + tray's list and discs are lifted greys.
- The dark launch screen is black too, so the app no longer opens navy and turns black.
- The binary says which dark it carries (the KindredlyUI module's `themeRev`, 2 from this build), and the React Native screens follow it: on build 42 and older they keep the old colours even if this JS reaches them over the air, so a black page never sits beside a navy one.
- Checked page by page on the iPhone 17 simulator: 64 routes (the five tabs, every detail page, the sheets lab, the dev pages and the previews), then the + tray and the leave, language and sign-up sheets.
- Left alone on purpose: pictures with their own night (the courier's card and planet by the hour, the letter's flight, the voice and monthly report pages, the after-fifteen scenes, postcards). They are skies, not the theme.

Me's cover, smaller things (owner, 2026-11-12) [the numbers are JS; the hints and the planet page need a binary]
- No words on the cover any more ("Drag to spin", "Pull down for her planet" are gone): pulling down shows one small chevron that grows as you pull, and that is all. The planet is for finding.
- On her planet's page, pulling up past the end goes back to Me (a small chevron at the foot says so); the "My letters" row is gone, since TRACK already leads there.
- The two tiles under the cover count real things: stamps = the stamps you made yourself (a "+" when you have made none, which opens the stamp press), the postbox = your letters (a number from 1 up; nothing at all at 0, never a "0").

Settings, Export my journal with no notes yet (owner on build 42, 2026-11-12) [JS: can go over the air]
- With no notes of your own on this phone, the row used to do nothing when tapped, which read as broken. It now answers with the same sentence it shows: your journal lives only on this phone, and there is nothing to export yet.

Making your own face: one straight line (owner, 2026-11-11) [binary for the quiet painting page; the rest is JS and can go over the air]
- The flow is four steps with one thing to do at each: show Wren you (a photo, or a few words) → she paints (about twenty seconds) → pick the one you like of the three → "This is me". That is the last tap: there is no "done" page after it any more.
- From onboarding: while she paints there is nothing to decide — no "Don't wait on me" card and no question about notifications (onboarding asks that once, at its own screen). After "This is me" you go straight on to the next onboarding screen wearing the face; you are no longer sent back to the grid of faces to press "This is me" a second time.
- From Edit profile: after "This is me" the page closes on Edit profile with the new face on (a guest's too: it used to stay the old face until they signed in). The knock card stays here, where there is somewhere to go and wait, and "Knock when done" now leaves at once instead of asking for a second tap on Leave.
- If you leave while she paints (from onboarding: on to the next screen), Wren knocks when the face is done — a banner while you are in the app, now during onboarding as well, or a notification if you have left it — and the face you accept there becomes your face. If onboarding was already over by then, it is saved to your account directly.
- On an older binary (before 1.2.8) onboarding still shows the knock card; its "Knock when done" goes on to the next screen.

The courier's planet (owner sign-off 2026-11-11; branch `courier-planet`; **in 1.2.8 from build 42, ON by default** — the owner's word that night, to try it on his phone; a false row in app_surfaces turns it off) [switch: meplanet]
- Me is laid out anew, with no Courier / Aura / Stamps switch: the planet is the page's cover, over the top of the page. Under it, your name, a pill with your gender mark (blue, or pink) and your star sign, two numbers (kindreds, notes), Edit and the gear. Then her card, your writing aura and your writing report side by side, and First Class.
- The cover is a small planet you can turn with a finger; it never turns by itself, and its sky follows the hour. Every letter she has carried is a stamp on it, every stranger who has had one on their desk is a lamp near it (lit after dark), and a letter someone answered is postmarked. Wren lives on it and you can see what she is doing: asleep on top at home, flying round it with your letter while nobody has answered, waiting on its shoulder at someone's door, back on top with the reply set down beside her, or racing through two gates on her day off.
- Two small ways in sit on the cover: your stamps (the album) and a red postbox (your letters), each with its number. Your face is on the cover's corner; tapping it, or Edit, opens Edit profile.
- Pull the page down from the top and the cover stretches, the planet growing with it; let go and the planet page opens. Scroll up and the cover gives way to a bar with your name, the pen and the gear.
- The planet page: the planet larger (pinch, double tap or + − to zoom; closer in, each stamp shows its day), three figures (On the way, Carried, On desks) and one slip a letter — when it left, how many desks it has been on, where it stands. Swiping to a slip turns the planet to its stamp; tapping a stamp or turning the planet brings its slip. A letter with a reply opens on its own slip with Go to the Door. Track on her page opens it too. Her two sentences are not on it.
- Her card is her badge: her name, YOUR COURIER, the day she is on, and her standing on a small mound. While she is still growing it shows her journey (egg, hatch, fledge, grown: where she is, and what the next step takes); once she is grown the journey folds away. Under it, her flight log instead of her two sentences: PIP · FLIGHT LOG and Open (her page) or Play (her day off), then the run she is on a line at a time — when your letter left ("2H AGO"), how many strangers' desks it is on, waiting for an answer; at someone's door; back with a reply — with a yellow dot that breathes on the line she is at. She still says one line of her own when the log can't: the Post's letter, when she is hungry, on her day off. The card does not change with the hour.
- The looks on her card are six now (two free pieces and Moss, then two First Class colours and a First Class piece), and the way to all of them is an arrow with no words. Which six is not fixed: what she is wearing stays, a festival's looks come first while it lasts, then any look we put forward from the server, then the ones you reach for most on this phone, and the rest take turns by the week.
- Four of her looks sit under the log: one free piece, Moss (your first kindred), one First Class colour and one First Class piece. They change every Monday; what she is wearing stays; tapping the one she wears takes it off. All looks → opens her wardrobe.
- Your writing aura and your writing report are two tiles built alike, each with a first state: the aura's picture goes from a few waiting lines to a pencil drawing to ink to your own scene, with how many letters it still needs; the report is a card with a hole punched for every piece you write until the first one, then a sheet — ready (a yellow dot beside it), read (a tick, and when the next one comes), or one a month with First Class (a gold lock).
- Every block is white on a soft shadow; only the sky, the stamps, Wren and First Class's gold are coloured.
- First Class on this page: the boarding pass and the sealed report sit above her card and the Post's letter on its corner. While the pass or the sealed report is up, the report tile and the First Class card at the foot step aside (one large First Class thing to a page). The gold pull-tab on the right edge is not drawn on this page.
- Her page (Open) is unchanged, except that Track now opens the planet page.

Today, after fifteen (the owner's decisions of 2026-11-11; branch `today-after-fifteen`, on top of `courier-planet`, **in 1.2.8 from build 42, ON by default** (the owner's word, 2026-11-11 night; a false row in app_surfaces turns it off); nine languages) [switch: afterfifteen]
- When the day's last letter has gone past, Today becomes one of three pages until 8:00: the mailbox, a receipt, or bedtime. Which one: your first two days, the mailbox; a Sunday, the receipt with the week's totals; a desk finished after 8 in the evening, bedtime; otherwise the mailbox. A day with no letters at all keeps the old ending.
- The mailbox: your courier on a plain card with her count of the day; pull the cord and a shutter comes down with a Closed sign, when she is back, and a note taped under it. (It was a red mailbox round that card, with a slot to write a letter; the owner found it too much at night, "红色邮筒…晚上太吓人", so only its inside is left, on the app's own card colours, with no red in any theme. Writing after the day is the + as anywhere else.)
- The receipt: Print feeds it out of the printer line by line: letters read, written back, the topic you stayed on longest (only if the phone timed it), when she is back. Tear it off, then keep the stub or share the receipt as a picture. Nothing from anyone else's letter is in the picture.
- Bedtime: she sits in an opened envelope. Snack, Pat, then Lights out (locked until the first two). The room goes dark, she sleeps, and a card comes up over her. Seven dots show your last seven days. Skip bedtime three evenings running and evenings go back to the mailbox for a week.
- Each page carries one small thing you can Keep (it goes to your Lore): one of her facts, numbered from No. 1 (sixty to start, each checked against a source), or the line of the day: the opening of a letter you wrote back to, or of the one you stayed on longest. They take turns; the receipt always prints a fact. Heavy letters never give a line, and she adds nothing to someone's line.
- The phone now times how long a letter is on screen, for the line of the day and the receipt. The times stay on the phone for the day and are never sent.
- Under each page a strip opens Free Flight ("Fly a lap with {her name}"); for an egg or a wilted courier it says when she is back instead.
- For ten seconds after the day's last Next, Undo stands over the page and brings that letter back.
- One streak: a day counts when you finished the day's letters or wrote something. Bedtime's dots and First Class's boarding pass (seven days in a row) read the same days. With the switch off, the boarding pass counts writing only, as before.

Fixed with it (needs the binary)
- The long letter (Unfold): the ✕ beside Fold It Back is the app's close icon, the size every other closing page uses (it was a smaller typed ✕).
- Writing Aura details: Portrait / Dimensions / Habits is the same switch as everywhere else (a grey track with a white pill that slides); it was a purple track of its own. The purple grounds inside the page are neutral grey too (a dimension's number, your quoted sentence, the sentence a word came from, the pauses' bars, the note under the nine), and in the grid of nine the dimension on show is ringed in the pen colour instead of filled purple.

Changed with it (ships with or without the switch) [OTA]
- Wren says plainly when a letter is out: "your letter's out. no one has written back yet" / "i'll bring it the second someone does" (it used to be "still hunting for the right window"), in all nine languages, by day and by night.

Fixed after the first TestFlight build of 1.0.9 (b41, owner's notes 2026-11-10)
- Make your own face and the faces you already made are back in Edit profile on a new build without anyone switching them on. [switch: makeface, now on by default]
- Me: the look Wren is wearing is ringed in the pen colour, not a black frame.
- The courier's page always shows her wardrobe: it opens on Looks, and Looks / Dress switch the row (it no longer folds shut).
- Settings: the row for her name says "Courier's name", with her name beside it, in all nine languages.
- The + : the bar now really grows upward and shrinks back (it used to jump to its full height in one frame), and the two rows can no longer come down from the top of the screen.


New (owner's audit, 2026-11-10; all need the next binary unless tagged)
- ~~The journal book can be bought once, without First Class~~ — **not in 1.0.9** (owner, 11-13: the book stays First Class; pricing granularity is next version's question). The one-time purchase is built but switched off in code (`BOOK_SOLD_ALONE = false`, lib/iap-book-core): the app never asks for the "book" offering, so Make my book opens the paywall for a non-member. When it comes back: a non-member's tap offers "Just the book · {price} once" beside First Class; bought, it exports any month or year for good and restores with Restore purchases (App Store Connect + RevenueCat: SETUP.md §4b). [store: io.kindredly.app.journalbook, entitlement journal_book, offering book — don't attach it to the 1.0.9 submission]
- Your own stamps can leave the app (First Class): in the album, a stamp's sheet has Save as sticker (a PNG with a see-through ground, the toothed cut kept) and MADE BY YOU has Print a sheet (an A4 PDF at real stamp size with cut lines; only stamps that passed the check).
- Your journal, as a book (First Class): Settings → Export my journal opens a page with a live preview of your own book, this month or this year, set as a colourful zine (each day in its mood's colour, a calendar for every month, a month-end count where every number is counted from your pages, your photos, long pages running onto the next sheet), and a Save ink switch. Make my book writes an A5 PDF on the phone (nothing leaves it) and opens the share sheet; anyone can see the preview, members can export, and Just the words keeps the free text file one tap away. Words are English for now.
- Today: for five seconds after Next (or a swipe), an Undo capsule over the band brings that letter back. The day's last letter keeps its "Bring back the last letter" in Wren's note instead.
- Today: tapping a stranger's frosted face or name opens "Why can't I see who wrote this?" with how names get traded and a link to How It Works.
- Birthday: on your birthday the first card on Today is a letter from your courier, signed with the name you gave her; Reply opens her room. Once a year, decided on the phone, nothing sent anywhere.
- Birthday: that morning's 8 o'clock knock is her birthday line. [OTA]
- Birthday: a Birthday stamp (cake and one candle) is offered in the composer only on your own birthday, marked TODAY ONLY; a letter sent with it keeps it. [switch: birthdaystamp]
- Edit profile: an account with no birthday can set one, once (the same 18+ rule as onboarding; an under-18 date signs this phone out to onboarding's "Not yet.").
- Notes: a page can be edited (⋯ → Edit); the same page, date and place are kept.
- Notes: search your pages from the header (words and mood names; works in Chinese, Japanese and Korean).
- Settings: Export my journal saves every page's words as one text file through the share sheet; photos, voice and films stay in the app. [OTA]
- Kindreds: search for a correspondent by name or last line.
- Kindreds: tapping a face in the orbit opens that correspondence.
- Pen-pal letters: a long press can keep a letter in Moments you kept, as a kindred's room can.
- The + tray offers "Continue your draft" above Write a letter when an unsent letter exists (the newest one opens; a count shows when there are several).
- Mute a correspondence from its ⋯ (no pushes from it; the other person is never told). Built and OFF. [switch: threadmute] [server: thread_mutes table + the push sender must skip muted threads, see docs/thread-mute-server.md]

Fixed (owner's audit, 2026-11-10)
- Notes: after you say yes to the evening question, its "on" row no longer sits at the top of Notes for good. It shows once, as a receipt, and the switch now lives in Settings (a third row, only for readers who said yes). The card's small print says so in nine languages. [OTA]
- A kindred's page: the nine labels under How alike you write are no longer cut ("SENTENCE SH…").
- Kindreds: with the orbit folded, the faint watermark behind the chips is the dashed rings alone; grey squares no longer poke out above the chips.


Changed
- The last React Native a reader could see is now SwiftUI, each behind its own switch (2026-11-09 audit): the launch animation, the magic-link page, the onboarding's hatch / named chick / doorstep flight / first flight, the empty Kindreds tab, the wardrobe sheet, the Plush moment, Wren in compose / Notes / Make your own face, your own face on Me and Edit profile, the face-ready banner, the rating ask, the First Class receipt, the revealed pen-pal header, the reply crossing in the reader, every guide reel and the 1.0.5 release reel, and Free Flight (the courier page no longer turns back into React Native to play). Twenty on; the note's voice card, note films, the composer's photo viewer and Wren's post media stay off until a device pass. [binary]
- An unknown kindredly:// link lands on Today (or onboarding) instead of a blank "Unmatched route" page. [OTA]

Fixed
- Wren's room: the mood stamps guide's button opens the album instead of replaying the launch and dropping you on Today. [OTA]
- Signing in again no longer shows "Meet Mist." every time, and Notes no longer looks empty right after a sign-in: screens that opened in the same moment read the guest's copy on this phone instead of the account's. Nothing was deleted. [OTA]
- Today: tapping "Otis wants a look" opens the wardrobe; the slip used to take itself away first, so the sheet never opened. [OTA]

- Wren's desk shows a post's picture or short film under it (animated pictures play, films loop silently, still with Reduce Motion), with Open to the full file or the post's link. [OTA] [server: 0050]

---

## 1.0.8 (binary 1.2.7, builds 38–39), approved 2026-11-09

Over the air, 2026-11-10 (group e4caa912, from `ota-1.0.8-fixes`: the build's code dd98c4a plus two fixes, nothing else)
- Signing back in shows your own journal again, and "Meet …" no longer greets you on every sign-in (the storage bucket now switches the moment a session is known; nothing had been deleted). [OTA]
- The stamps guide's button in Wren's room opens your album instead of bouncing to the launch animation. [OTA]

Changed
- Settings reads larger: row names at 17 (iOS body size), sublines at 14, rows a little taller. [binary]
- Sign out asks first (what stays with your account; Stay / Sign out) and taps as it goes. Nine languages. [OTA]
- Settings' footer reads the App Store version off the binary (it said 1.0.5 on every build since). [OTA]
- A kindred always sees your face as it is now, not the one you had when you both signed (web 0049 follows your avatar onto every traded correspondence); Edit profile's note says so in nine languages. Pen names and signatures still stay as sent. [OTA for the note] [server: 0049]
- Kindreds: a new kindred's row no longer says "was Sunday Kite" under their name; their page keeps it as First met as. [OTA]
- In Midnight the cards with an ink edge are flat too: Today's letter card, Wren's letter, her speech bubble, Me's cards and the theme swatches get a hairline instead of the pale outline and hard shadow. The light themes keep theirs. [binary]
- Tapping a reply's notification opens the chat over the Kindreds list (Back goes to your chats); it used to open over whichever tab was last in front, often Me. [OTA]
- In Midnight the letter's #topic tag (Today, the unfolded letter, rooms, stamps) is flat: no pale outline or hard shadow. The light themes keep theirs. [binary]
- Make your own face: Wren draws three faces to choose from (each on its own background and top); tap one under the big face to see it, and "This is me" keeps that one (the other two are deleted). The face no longer stands on a hard purple shadow, just a hairline ring. [binary] [server: face.js choices + pick]
- Make your own face: while Wren paints, a reader who has never been asked gets a small card offering a knock ("Don't wait on me" · I'll watch · Knock when done, which turns the app's Notifications on and lets iOS ask); once allowed the foot is a clear "Leave — I'll knock" key (refused for good: Leave, and the face waits in Edit profile). A drawing that lands while the reader is elsewhere in the app drops a banner with the new face and See it; the lock-screen knock carries the face. Nine languages. [binary for the card; OTA for the banner]
- Make your own face: the dashed oval on "Use this photo?" is drawn round the face the photo actually has (found on the phone), not a fixed small oval in the middle; with no single face found there is no oval. [binary]
### New
- A rating ask, one of two picked at random for each reader and kept: a letter from Mark, the founder ("Leave us a star"), or Wren's nervous performance review with your real numbers ("Vouch for Wren"). Only right after a good moment (a reply came, a kindred was made, a month's report read), on Today when it is calm; both open the App Store's review page. Never again after the key, quiet 60 days after Not now, at most three times ever. Nine languages. Preview: kindredly:///rating-preview?v=letter|review. [OTA] [switch: ratingask, on by default; ratingask_letter / ratingask_review put everyone on one ask]
- The monthly writing report is new: eight cards about your month (your writing type, how many strangers' desks your letters reached, who wrote back, a line from your own letters that only you see, three #stickers about how you write, the hours you write at, the type you'd click with, and what's next), in two styles you can switch between, with a 9:16 story card to share and a link that lets friends compare. First Class members also see how they changed since last month. [switch: reportwrapped]

---

## 1.0.7 (binary 1.2.6, builds 36–37), 2026-10-28

Store What's New (owner, short): "Notes got a glow-up: photos, voice, moods, seals. Letters now tell you how close you are to sending. Wren throws a party every time she grows up. Skipped a letter by accident? She'll fetch it back. And till Nov 2 she's wearing a witch hat. Don't make it weird." Not told there on purpose: My kindreds, the report sample, the native redraws, and the features behind switches that are off (make your own face, the Swift onboarding).

New
- What's new: Wren's post for this release carries a big card (the reel, a paragraph and a "Press your first stamp" button), like the guide cards, in all nine languages. [OTA]
- An update prompt for builds the server flags: Wren flies in with a parcel and sits on it ("special delivery. it's me, but newer."), Update opens the App Store, Later leaves a slim "a parcel's waiting for you" banner on Today. Once per release, at most once a day, and never for the release the phone already has; a hard mode with no Later exists but stays off. Nine languages. [switch: update_prompt, update_force] [OTA]
- Halloween stamps: three free seasonal stamps (Spooky season, a jack-o'-lantern; Boo, a bedsheet ghost; Trick or treat, a wrapped sweet) sit first in the stamp tray with a small SEASONAL marker from Oct 24 to Nov 2 (local date). Outside those days they aren't offered, but letters stamped with them always show them. Nine languages. [binary] [switch: halloween]
- Halloween looks for Wren: a witch hat and a bedsheet ghost, free for everyone, from Oct 24 to Nov 2. In those days the looks row on Me shows Bare · Witch hat · Ghost · First Class and the wardrobe offers them first; after the season they aren't offered, but a Wren already wearing one keeps it on. Nine languages. [OTA] [switch: halloween]
- Seasons have one remote switch each: the app_surfaces key `halloween` is on with no row (so it works offline); a false row turns the Halloween stamps and looks off. [switch: halloween]
- Make your own face: a ＋ at the start of Edit profile's PICK A FACE row (FREE · ONCE, then 1ST CLASS) lets Wren paint you a face in the same style as the others from a photo or a few words (with tap-to-add word chips), in a floating card with an easel she paints on; you can leave while she works and she knocks when it's done. The first face is free (a refused photo or a dropped line doesn't count), more are First Class, under-18s use words only, the photo is never kept, and only a kindred ever sees the face. While it's on, the note under your face in Edit profile says which photo stays on the phone (one set as your face) and which is only used to paint (one given to Wren). The camera's permission text now names it, in nine languages. Nine languages. [binary] [switch: makeface, off by default] [server: 0047 + /api/face]
- The first-run onboarding can be drawn natively in SwiftUI: the same thirteen screens, words and steps, with flat keys and soft purple shadows under the cards instead of black edges; while it is off, people see the onboarding exactly as before. [binary] [switch: onboarding, off by default]

Changed
- The tab bar is glass (owner's G1, 10-28): a frosted capsule the screens show through, a lens that slides to the tab and stretches like a drop, swells under a finger and can be dragged along the bar; new icons (a pillar box, a sticky note, a speech bubble, a person) whose accent moves once when picked; the + is a 46 ind disc that turns into an ink ×. [binary]
- The Letter font now starts on System for everyone who never picked one, and System is the first tile in Settings → Font, before Newsreader. A font you chose stays.
- Writing a Notes page has a new bar: ＋ opens Photo, Video and Audio cards, a round mood capsule opens the four moods and their faces, and Seal it here turns ink as soon as there is something on the page (no counter). The page opens with the keyboard down and a blinking caret; sealing folds the page into a little note and presses the mood's face onto it as a seal (with a tap of haptics, "KEPT · OCT 26" under it), then goes back to Notes, where the new page pops in at the top. Nine languages. [binary] [switch: journalentry]
- The letter composer's bottom bar is new ("Let it travel"): + · paper · a dashed stamp slot · one capsule on the right that fills with lav as you write toward 20 (with "n/20" beside it), then says "Pick a stamp" (the slot hops; Wren says "Now pick a stamp for it."), then turns ink with a paper plane to send. A chosen stamp shows as its #topic capsule in the bar and as the stamp itself in the top-right corner; with a long topic the send capsule becomes just the plane. Stamps are picked from the full stamp tray where the keyboard was, as before (your own stamps in their tab): Halloween stamps first in their season under a SEASONAL tag, then FOR THIS LETTER, RECENTLY USED and each category, labelled, in rows of six. Nine languages. [binary]
- The Writing Aura room (Portrait, Dimensions, Habits) and its share card are drawn natively: the same words and counts, smoother paging through the nine dimensions, native sheets, and the share card's picture made on the phone. The Aura card (on Me and in the room) loses its outline and stands on a soft purple shadow; its "Write your first letter" button is a filled pen-blue capsule and its share key a soft one. [binary] [switch: aura, auracard]
- Wren's Journey (her page, from the courier card on Me) is drawn in SwiftUI: the same sky, perch, status band, tracking slip, journey, keepsakes, wardrobe and First Class card, with flatter controls (soft capsules for her stage facts and Track, Play without the black edge) and the two slips lifted on a soft purple shadow. Play still opens Free Flight as before. Nine languages. [binary] [switch: courier]
- The guides in Wren's room show today's product: courier names and frosted windows instead of mosaics and numbers, signing to trade names, Stamp Press, tomorrow's bag, the two notification switches. Their words are rewritten in all nine languages, and Wren understands questions about pen names, signing and pressing your own stamps in each. [OTA]
- The kindred ceremony (when both of you have signed) is drawn natively: the two signed cards, both sealed envelopes lifting at once, the frosted windows clearing onto the faces, the courier names struck through, the signatures drawing in with the pen names, and KINDREDS · date. Reduce Motion fades to the end state; VoiceOver says the outcome when it's done. [binary] [switch: ceremony]
- On every tab but Today, the + opens an ordinary iOS sheet ("Who's this one for?"): it rises from the bottom, drags down to close, and goes down before the letter or the note page slides in (it used to wander as it opened and slide down over the new page). [binary]
- On Wren's page, Looks and Dress sit above Recent keepsakes: what she wears comes before what she kept.
- When Wren fledges or grows up, the next time you open the app she has a moment: her old form shakes, feathers burst, her new form pops in, a stamp with the stage and the day lands under her, she says one line, and "Yay" closes it. Once per stage; nobody who grew up before this update is shown it. Nine languages for her two lines and the key.
- On Wren's page, the Journey shows her growing: her hatchling, fledgling and grown forms side by side, the stages she has reached in colour and the ones ahead as soft silhouettes; the next one has five envelopes that light up with your letters toward it (counted as yours, since growing up needs the other side too). The hatchling's fixed "1 letter to fledge" pill is gone. Nine languages for the one new line. [binary for the Swift page]
- The Notes photo roll's head matches the composers: the same ×, the album title in the system font ("Recents", not RECENT), and Next in the system font.
- The Notes photo roll's first row is three postage stamps exactly the size of a photo — Camera (acid green), Text note (pen blue), Voice note (pink) — perforated all round, framed, numbered 01–03, with the icon and the name. Camera takes a picture straight onto a new page. They replace the flat tiles with mono capitals. The camera's permission text now names journal pages as well as stamps, in nine languages. [binary: the Camera card and its permission text]
- Every page under Me is now native: Keepsakes and each keepsake (tiles on a soft purple shadow, a flat Share key), the pen-name and courier-name page, Blocked & reported, How Kindredly works and Write to us keep their words and steps and look like Settings around them. My kindreds is new: only the people you've traded names with, each on a signed card with their face, the ceremony's KINDREDS · date chip, unread letters and the last line, a tap opening the room; with none yet, Wren and one line on what a kindred is and how you get one (nine languages). [binary] [switch: keepsakes, keepsake, mykindreds, editfield, blocked, help, writetous]
- A kindred's page (tap their name in the room) can be drawn natively: the same face, name, signature, what their letters told you, how alike you write, the facts with the stamp it began under, the opening letter and TALK TO, on the same soft cards, with the ⋯ and touch-and-hold on the signature for Report or Block; while it is off, people see the page exactly as before. [binary] [switch: kindredpage]
- Wren's room (the chat with Wren, her news, the guide cards and the what's-new card) can be drawn natively: the same words, guides, chips and ⊕ tray (a picture, a bug, an idea), with the guide and what's-new animations playing as before; the ⊕ and the send arrow now have VoiceOver names. While it is off, the room is exactly as before. [binary] [switch: wrenroom]
- Wren's monthly night letter about how you write, Unsent (your drafts) and Lore (the lines you kept) can be drawn natively, with the same words, cards and steps: the night letter's keepsake card stands on a soft night-purple shadow and its close key is a drawn ×. Holding a draft or a kept line still asks before it goes, and VoiceOver offers the same as an action. [binary] [switch: report, voice, drafts, stampbook, lore]
- Three Notes pages can be drawn natively: one journal page (the mood, the date, the pictures with tap to view and hold to make it the cover, the words, the line that drifted out, the ⋯ menu), one day of pages (now on the same cards as the Notes tab, a voice page playing in place), and the photo roll the + opens (the three stamps, the pictures with their pick numbers, the albums sliding down). Same words and steps; while they are off, people see the pages exactly as before. [binary] [switch: noteentry, noteday, photoroll]
- Wren's introduction (the sheet a room or a pen-pal chat shows once, when names are traded) can be drawn natively: the same letter from her, the road of envelopes, the mosaic bursting under the green name sticker, the name typed on, the two faces bumping, KINDREDS · date and what she noticed, on the same timing and with the same Reduce Motion behaviour; with signatures it shows the ceremony's native ritual. The big name sticker stands on the soft purple shadow instead of a blur. While it is off, the sheet is exactly as before. [binary] [switch: introritual]
- A photo opened full screen, a kindred room's song shelf and the sheet where you sign your pen name to trade names can be drawn natively: the same dark stage with pinch, drag and tap to close; the same songs and Wren's line; the same faces, pen name, signature pad, Type it instead and SIGN AND SEND, opening and closing as before. While they are off, people see them exactly as before. [binary] [switch: lightbox, songshelf, signsheet]
- The sheets every screen shares can be drawn natively: the "leave this letter?" and other confirm sheets (the language list and the delete confirm too), the report / block card, the sign-up sheet a guest sees (with the system's own Sign in with Apple key) and the small toast line. Same words, keys, steps and timing; reporting and blocking send exactly what they sent before. While they are off, people see them exactly as before. [binary] [switch: leavesheet, reportsheet, signupsheet, toast]
- Three things over Today can be drawn natively: the unfolded letter (the same docket, letter, stamp with its keep/report menu, WRITE BACK and reply bar, which now rides the keyboard on its own), the first-arrival wardrobe slip (on a soft purple shadow instead of a black edge), and the update prompt's parcel (Wren flying in with it, the shake, the bow and flaps popping, the banner). Same words, steps and timing; while they are off, everything is exactly as before. [binary] [switch: letterreader, wardrobeslip, parcel]
- Three full-screen moments can be drawn natively, with the same words, beats, haptics and Reduce Motion: Wren growing up (the shake, the burst, her new form, the stamp, "Yay"), the one-time note about what strangers see (its two switches and Done, on a sheet without the dark rule along its top), and the first flight at the end of onboarding (the letter folding, the loop round the chart, the three envelopes back). While they are off, people see them exactly as before. [binary] [switch: growthmoment, identitynote, firstflight]
- Three pieces of the letter and Notes composers can be drawn natively: the voice recording bar, the voice card (play/pause, its bars and the time, wherever it shows: the composers, Notes pages, the chat, Today) and the send-off animation as a letter leaves (fold, seal, pickup, the flight across the globe, the arrival card), with the same words, colours in all four themes, timing, haptic tap and Reduce Motion; recording and playback stay as they are. While they are off, people see them exactly as before. [binary] [switch: recorder, audiocard, lettertravel]
- The courier card on Me (Wren's sky at this hour, the globe, the route, her line and the Open or Play button) and the Aura card's picture (on Me and in the aura room) can be drawn natively, looking and moving as before; Wren on the card is her own picture, and the card holds still under Reduce Motion. While they are off, both are exactly as before. [binary] [switch: couriercard, auraart]

Fixed
- A kindred room's send never hangs: after twenty seconds without an answer, or if anything in the send goes wrong, the key comes back, the words return to the field and the reader is told it didn't go; each such failure is recorded (events: send_failed) so the cause can be found (readers wrote the key "just greys out" for a week). [OTA]
- Me → Stamps no longer stands empty for a guest: MADE BY YOU and Make One show (the server refuses the stamp quota to an account-less caller; the phone now reads that as "needs an account"). [OTA]
- Allowing photos for the first time on the Notes photo roll shows the roll at once; it used to say "No photos yet." until the app was opened again.
- The Writing Aura card counts toward its first reading with three boxes, matching "0 of 3 letters"; it used to draw five under that line.
- In the Writing Aura room, a dimension still being read says "Still reading." once, with "A few more letters and this one fills in." under it; the line under it used to start with "Still reading." again.
- On a small iPhone, onboarding's "This is you, to a stranger." shows your whole courier name on the envelope (it used to end "Summery M…"), keeps the envelope's type its drawn size under Larger Text, and fades at the bottom while the card about signing is still below. [OTA for the React Native run; binary for the native one]
- Settings → Language writes Bahasa Indonesia with its capital I (the list used to show "Bahasa indonesia"). [OTA]
- Passing the day's last letter by mistake can be undone: Wren's note has the cards' ⋯ with "Bring back the last letter", which puts it back on the desk (and takes her "all read" off the lock screen). The undo used to live only in a card's ⋯, and a finished desk has no card. Nine languages (the existing words).
- Me → Aura's writing-report row answers every tap: before the first report it opens a sample (a report's shape, blurred, with "The first one comes at 10 pieces · 4 so far" over it, counting nothing as read), and once this month's is read it opens it again. It used to do nothing in both states. [binary for the Swift report; OTA for the row]

---

## 1.0.6 (binary 1.2.5, build 35), 2026-10-25

This is the iOS 27 launch fix, plus small fixes from the crash hunt. Everything in 1.0.5 comes
with it.

### Fixed
- The app opens on iOS 27. Build 34 of 1.0.5 quit at launch there, because iOS 27 requires the
  scene life cycle.
- If you opened the app by tapping a notification, it no longer opens the same letter a second
  time when iOS brings the app back.
- Swiping the app away just after launch no longer switches a screen (Me, in the crash log) back
  to its older look for the rest of the build.
- Onboarding's under-18 stop shows "Wrong year? Change it" on the first slip too.
- Stamp Press: Retake, or Retry after a refusal, while typing the #topic closes the keyboard first
  instead of risking a crash.

---

## 1.0.5 (binary 1.2.4, builds 29–34), 2026-10-20 → 10-23

This is the 10a overhaul: new identity, Stamp Press, letter papers, the Sparkle deck, one type
system, dark mode and most screens redrawn in SwiftUI. It includes all of 1.0.4.

**Remote switches in this build:**
- `identity`: on by default from 1.2.4. A `false` row turns it off from the next read.
- One `app_surfaces` key for each SwiftUI screen: `tabbar`, `today`, `kindreds`, `room`, `chat`,
  `reader`, `compose`, `me`, `settings`, `editprofile`, `notes`, `paywall` and `myletters`.
  - Every screen is Swift by default, and the server can send any one back to React Native.
  - If a screen crashes on two launches in a row, the phone sends it back by itself.
- Nothing else is remote.
  - The First Class offers are worked out on the phone.
  - Keeping strangers' stamps is a code flag, `KEEP_STAMPS_ON = false`.

**Server pieces it relies on:**
- Web migrations:
  - 0033: the remote switches
  - 0034: she/he mark and star sign
  - 0035: `sign_thread`, for drawn signatures (until it runs, names are traded the old typed way)
  - 0036: Cofounder seats and number
  - 0037: other people's member stamps
  - 0038: stamp quota
  - 0039: stamps for accounts only
  - 0041: letter paper
  - 0044: This or That picks
  - 0046: the icon badge
- The `stamp-check` moderation endpoint.

### New

**Make your own**
- **Stamp Press:** take a photo (camera at 0.5×, 1× or 2×) or choose one from your library, crop
  it, and press it into a perforated 3:4 stamp. Add a #topic, colours and a filter:
  - original, vivid and warm are free
  - golden, film and airy need First Class
  - gilt is for Cofounders
  - `[server: 0038, 0039, stamp-check]`
- Every pressed stamp is checked automatically before anyone else can see it. It shows in your
  album at once and goes on letters once it passes. Anyone can report a stamp from a letter.
- Only signed-in accounts can press stamps; a guest gets the sign-up sheet. A few are free, and
  more come with First Class (the server sets the number).
- The compose stamp tray has two tabs, official and yours. Me › Stamps shows Your stamps (the ones
  you made) and the Album.
- **Letter papers:** seven papers in the compose bar. `[server: 0041]`
  - plain and grid are free
  - airmail unlocks with your first kindred
  - kraft, receipt, sticky and riso need First Class
  - The reader sees the paper on the Today card and in the letter reader.

**Who you are to strangers** `[switch: identity]`
- A stranger shows as a frosted window, made from their id and never a blurred face. Each has a
  courier name in your language, the same on every screen and on the web.
- Two optional marks, she/he and star sign, each with its own switch in Edit profile. Existing
  users get a one-time note, where the she/he switch starts on for she or he. `[server: 0034]`
- **Trading names with signatures:** the door opens at five letters each way. You send your face,
  your pen name and a drawn signature (or type it instead). `[server: 0035]`
  - It never sends a legal name.
  - If you have no pen name yet, it asks for one first.
- **The new kindred ceremony:** the frosted windows clear to the faces each of you sent, the
  courier names are struck through, the signatures draw in, and it ends on KINDREDS · date.
  Long-press a signature to report it or block the person.
- The kindred page shows the name they signed and "first met as" their courier name. A kindred's
  row says "was {courier}" for 7 days.
- **New onboarding,** thirteen screens:
  1. the showcase
  2. one question per screen, with the egg
  3. the 18+ gate, before any account exists
  4. how strangers will see you
  5. a first letter of at least 20 characters, and its first stamp
  6. the hatch
  7. the account, or Not now
  8. the flight
  9. the knock
  - Pick a face has a Random dice.

**In kindred rooms**
- **Sky postcard:** the ✦ key opens a deck. Its Wave card sends a postcard of your sky: dawn, day,
  dusk or night, taken from your local hour only. Wave Back sets the two postcards side by side.
- **This or That:** 60 pairs in each language, with Another and Shuffle. You both pick blind, and
  the picks open together with Same! or Opposites. Discuss. `[server: 0044]`

**Look and type**
- **Fonts:** choose the Letter font in Settings: Newsreader, System (SF Pro), EB Garamond or SF Mono.
  - It applies to letters, replies, notes, Wren's lines and every field you write in.
  - Chat bubbles in kindred rooms stay System.
- **Appearance:** System, Light, Dark, Lavender or Paper, with full dark mode (Midnight) and a dark
  launch screen.
- These screens are redrawn in SwiftUI: the tab bar, Today, Kindreds, kindred rooms, pen-pal chat,
  the letter reader, compose, Me, Settings, Edit profile, Notes, First Class and My letters.
  `[switch: app_surfaces, one key per screen]`

**Today**
- One card at a time:
  - Drag up, or tap NEXT, to pass a letter. A passed letter can be brought back from the menu.
  - Tap REPLY to write back.
- Wren stands on the band and reacts. She leans in when you tap Unfold, hops when you tap her,
  sleeps from 21:00 to 08:00, wilts when she's hungry, and carries your reply off in her beak.
- Long letters fold. Unfold opens the reader, with Fold it back and Write back.
- **The day's end:** Wren's letter with the day's real counts, the window with Free Flight, and
  tomorrow's bag of three sealed envelopes with its opening time.
- Wren's arrival line goes away when you tap it, or by itself after 10 seconds.

**Everywhere else**
- **The + in the tab bar:**
  - On Today it opens two round buttons, Letter and Note. Free writers see how many letters they
    have left.
  - On every other tab it opens a sheet: "Who's this one for?"
- **Me:**
  - Counts under your name, which open peek trays.
  - Courier, Aura and Stamps as an iOS segmented control.
  - Wren's looks: Bare, Beanie, Scarf and a First Class tile.
  - A door to the monthly writing report.
- **New First Class page:** `[server: 0036]`
  - Yearly, Monthly and Lifetime, with the real saving.
  - A trial line only when the store confirms you're eligible.
  - The Cofounder card, with seats left and your number.
- After a purchase you get a receipt of three stickers. Start writing opens the composer.
- A member's avatar becomes a gold perforated stamp everywhere it is drawn, printed with 1ST or
  the Cofounder number. `[server: 0037 for other people's]`
- **First Class appears day by day:**
  - nothing on days 1–2
  - the Post's gold-edged letter from day 3
  - the boarding pass after seven days in a row
  - a sealed monthly writing report from day 30
- **Edit profile** is its own page:
  - your photo, or a Random face
  - faces offered by your pronoun
  - pronouns and birthday
  - your courier's name
- **50 redrawn faces:** 44 old faces become the closest new one, and six keep theirs.
- **Moods:** 34 new line faces in four groups. You can pick only a colour group.
- **Notes:**
  - New card layouts: words in three sizes by length, pictures in five tiers, and a voice bar
    that plays in place.
  - Grid is a waterfall.
  - A date chip follows the top note.
  - The calendar shows each day's mood face.
- **Notes' empty page:** you pick how today was. A draft card asks that mood's question, and the
  composer opens with it.
- **Two notification switches in Settings:** the 8 o'clock knock, and Notifications. Turning
  Notifications off takes this phone off every push.
- **Wren's reminders:**
  - The phone plans them at your local time: one a day, never a word from the journal.
  - The evening line is offered once, after your first journal page.
- **Her day off:** at noon, at most once a week, she invites you to Free Flight.
- **App icon badge:** it shows how many letters and messages you haven't read. `[server: 0046]`
- What's new plays as a reel in Wren's room, and her posts can open a guide.
- The pen-pal chat's band is back: YOU and their five cells under the header.

### Changed
- **A softer look:**
  - The black ink frames and hard shadows are gone from cards, sheets, menus, pen-pal letters,
    reply bars, Notes, Me and First Class.
  - Sheets are iOS-style floating cards with a round close.
- Buttons and titles use Apple's title case; labels stay in small capitals. There is now one back
  chevron everywhere.
- **Type:**
  - The interface is in System, and labels are in SF Mono.
  - Fraunces, Inter and IBM Plex Mono are gone, so the app is about 2.4 MB lighter.
  - The fonts are embedded, so launch no longer waits for them.
- **Reply bars:**
  - Today and pen-pal chat share one reply bar: a round field, an emoji key and a send circle.
  - In pen-pal chat, Return starts a new line and the send key sends.
- The kindred-room bar is ✦, the field, emoji and +. The keyboard's send key sends.
- Pen-pal letters are soft slips as wide as their words, with yours on the right.
- **Compose:**
  - It opens with the keyboard down, so you see the page and its paper first.
  - A chosen stamp shows as its #name pill.
  - The page looks as it does on the App Store again.
- **Stamps v3:**
  - The 36 stamps are redrawn as characters in a brighter palette.
  - The #topic tag is the solid pill again.
  - The postmark code is gone.
- The letter reader draws the opening letter on its paper.
- **Kindreds:**
  - Closest to you is gone.
  - Wren's pinned row shows her bird.
  - A failed load says you're offline instead of "all answered".
- Settings shows the App Store version and build, for example "1.0.5 (34)".
- First Class copy names only what it does: rooms that never close, voice letters and Wren's full
  wardrobe.
- Dates on the Courier page and on the kindreds band follow your language's format.
- Keeping strangers' stamps waits for a later version. Keep and From strangers are hidden.
- **Delete account:**
  - It also removes your stamp pictures.
  - It keeps your journal on the phone (1.0.4's build 28 deleted it).

### Fixed
- **Sending:**
  - When a send times out, the app checks whether the letter arrived before calling it a failure:
    no false "Couldn't send", and no second copy.
  - It shows "Still flying…", then "Sent. It's on its way."
- **Face and pen name:**
  - They no longer go missing after you sign out or switch accounts.
  - Accounts that lost them get them back from the phone's guest copy.
- Google sign-in's "PKCE code verifier not found" is fixed, by three changes.
- A fresh install no longer gets the old onboarding: identity is on unless the server says off.
- **Onboarding's age check:**
  - You have to turn the birthday wheel before Next.
  - An under-18 answer can be corrected once per phone.
- **Today:**
  - It no longer crashes when it shows Wren's letter (iOS 26.5).
  - Letters no longer drop off a kept desk just because they got older.
  - Her arrival only shows when there are letters.
- **Voice letters:**
  - A voice letter pauses when you swipe on or switch tabs.
  - Leaving a screen after a voice letter played no longer throws an error.
- **Drafts:**
  - Discard really discards, and Save as draft saves once.
  - A question you turned off is not sent.
- A send at zero letters left asks the server before refusing. This covers First Class writers
  whose membership check failed, and the start of a new day.
- Kindreds no longer flashes "Expired" for First Class members while it loads.
- Restore purchases says what happened, and updates your membership without a relaunch.
- Picking a language changes the language of notifications at once.
- When the Blocked list fails to load, it says so and tries again.
- Pip's notice no longer counts links as words.
- After onboarding, Wren never shows as an egg.
- "Yes, at 9" turns the evening line on at once and always releases its button.
- A stamp you just made shows at once, in the album and offline.
- A pen pal's row no longer says "was No. 8866".

### Not yet told
- **Store What's New** (`design/store/asc-1.0.5.json`):
  - It has Stamp Press, papers, This or That, the sky postcard and fonts.
  - It is missing the new identity (frosted windows, courier names, signed names), the new
    onboarding, the new Today, and Appearance and dark mode.
- **In-app reel** (`news-reel`, id `1.0.5`): it is still the three scenes made for 1.0.4, and none
  of 1.0.5's new features are in it.
  - the their-turn fold, which already shipped in 1.0.4
  - two switches
  - her day off
- **Guide reels:**
  - `stamps`: it says photo stamps aren't built.
  - `kindreds`: it shows No. 4481 and mosaic faces where it should show frosted windows, courier
    names and the signing.
  - `letters`: it shows the old + fan, no paper, and the shutter where Wren's letter now is.

---

## 1.0.4 (binary 1.2.3, build 28), approved about 2026-10-16

This is a hotfix built from 1.0.3's code, on branch `hotfix-1.0.4`. The store text is "Bug fixes
and improvements.", and there is no reel. It is the first build that can take over-the-air
updates.

### Changed
- Kindreds › All: pen pals waiting on the other side (the last letter is yours) fold into one row.
- A kindred's row shows how many letters you haven't read. A pen pal's row says YOUR TURN or THEIR
  TURN.

### Fixed
- In-app purchases work again. Local builds had been missing the store key since 1.0.2.
- The journal is never overwritten after a failed read, and it stays with its own account when you
  switch.
- Google sign-in uses each code only once, so "PKCE code verifier not found" comes up less often.
- Delete account's cleanup on the phone actually runs.
- Small fixes can now arrive as over-the-air updates (expo-updates), without App Review.

### On the branch after build 28
These are not in the binary. They can only go out as an over-the-air update from the hotfix
worktree; whether that update was published isn't recorded here. All of them are in 1.0.5.
- Delete account keeps the journal on the phone (84c2f33).
- Three Google sign-in PKCE fixes (b53d44a, e18287e, 3e2818d).

---

## 1.0.3 (binary 1.2.2, build 27), approved 2026-10-13

These are the changes since 1.0.2 (binary 1.2.1, build 25). The store text is in
`design/store/whats-new-1.0.3.json`: photos, long-press, the Kindreds list and Wren's guides.

### New
- Tap a photo to see it full screen, and pinch to zoom. This works in rooms, on Wren's desk and on
  sealed pages.
- **Long-press a line in a kindred's room:**
  - On their lines: Reply (which quotes it), Copy, Translate, Keep in lore and Report.
  - Your own line can be taken back within two minutes, and a note stays where it was.
  - Before names are traded: Copy, Translate and Report.
- **Long-press a Kindreds row:** Mark read or unread, Their page, Rekindle, Report and Block.
  Photos, songs and opened folds have menus too.
- **Wren's guides play as big animated cards:** letters, kindreds, aura, stamps, the sealed journal
  and the courier. Each has one button to the place it explains.
- A bar on Kindreds to turn notifications on. It asks iOS or opens Settings, and × hides it for
  two weeks.

### Changed
- **Kindreds is redone:**
  - It is one white list with All, Kindreds and Pen pals chips, and Wren pinned on top.
  - Each row has a round face and two lines of the last words, with a blue badge when it's your
    turn.
  - The count beside the title opens the letters waiting on you.
- **The horizon:**
  - It unfolds with a tap or a pull.
  - Folded, its ticks show how close each pen pal is to trading names.
  - Closest to you lists the three nearest.
- **Row states:**
  - Rows show a brass "trade names" at five letters each, CLOSES IN n DAYS, and Rekindle.
  - In its last week, a quiet room says what keeps it open.
  - The footnotes under the list are gone.
- "Strangers" are called "pen pals" everywhere.
- **Report and block say what really happens:**
  - Nobody reviews reports by hand, and three different reporters stop a writer.
  - A failed report says so.
  - Blocking hides the conversation for both of you and deletes nothing.
- Settings and the courier guide describe the knocks the server really sends. Your time zone is
  saved on your account.
- Names that read as translated are renamed in ja, ko, it, fr, es, id and pt, and de and id follow
  the web's terms.
- The one-tap "a reply is on its way" is gone.
- The Kindreds chips are a size larger, and long-pressable rows no longer fade under your finger.
- The privacy and terms copy describes what the product does.

### Fixed
- A voice letter left open for more than an hour plays again.
- Asking Wren waits at most 1.5 s for your session.
- A withdrawn letter ends its Live Activity on the lock screen.
- The Kindreds count stays on one line in long languages.
- The first-kindred popup calls the coats by their real names.
- Photos and voice letters load through links that expire after an hour, and Wren's AI requests
  say who is asking.
