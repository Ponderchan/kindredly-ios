import { strings } from "../lib/i18n";

/* THE COURIER'S PLANET — THE WORDS (docs/courier-planet.md; owner sign-off 2026-11-11).
   ────────────────────────────────────────────────────────────────────────
   Her card on Me (the small whole planet, her words, four looks) and the planet page. Most of
   what they say is already the app's: her diary lines (fl.*), Open and Play, DAY OFF, All looks →,
   Track (wren.trackShort), the looks' own names (ws.acc.*, skin.*.name), the slip's rows
   (wren.slip.*), My letters' statuses (ml.*), the desks line (la.out.reads*). These are only
   what is new:

     planet.hint.spin     on the scene until the planet is first turned (mono, drawn in capitals)
     planet.hint.zoom     beside it on the planet page ("DRAG TO SPIN · PINCH TO ZOOM"): the two
                          are parallel in form and fit one line together
     planet.page.*        the planet page's three figures, a label in capitals under a number in a
                          tile a third of the page wide: what she is out with now · every letter
                          she has carried · the strangers who have had one on their desk
     planet.a11y.*        VoiceOver's hints for a look on her shelf and for the two tiles under
                          her card, and its names for the page's two zoom keys

   The plain "on the way" lines the owner approved with this (your letter's out. no one has
   written back yet / i'll bring it the second someone does) replace her old window-hunting ones
   in data/strings.ts itself: fl.exploring, fl.exploring.notime, fl.exploring.sub and the night
   pair fl.night.flying, fl.night.flying.sub (the night aside is the day's: no language promises
   delivery at any hour).

   WRITTEN NATIVELY, NOT TRANSLATED (2026-11-11): one native writer a language from a brief of
   what each string has to do, then a native editor who read only the result. What the editors
   changed, for whoever touches these next:
   - fr: a hint that opens on « Lui » is heard as "he" for a female bird, so the two shelf hints
     name her (« ta messagère »); her aside lost « la première … dans la seconde » (heard as
     first / second).
   - it: « glielo » disagreed with most look names (Sciarpa, Cuffie…), so the hints name the look.
   - id, ja: a bare "desk" in those blocks is the reader's own desk (fl.back.sub); the figure's
     label says whose (Meja orang, 届いた机). ko made the same choice (닿은 책상).
   - de: her day line had no first person (a system status); it now opens "bin mit …" like the
     night line.
   - es, pt, de: no native drag / pinch pair fits 16 characters, so the hints count fingers.
   The shelf hints name no one in most languages because the reader may have renamed her and the
   key takes no {wren}.

   One file, nine blocks (en es pt id fr de it ja ko — pt is pt-BR), every block with the same
   keys: src/data/strings-planet.test.ts checks they agree, that the labels fit where they sit
   and that no "on the way" line went back to windows (node src/data/strings-planet.test.ts).
   Consumers import this file for its side effect. */

strings(
  /* ── en · English ── */
  {
    // on the scene until the planet is first turned; on the planet page the two share one line
    "planet.hint.spin": "Drag to spin",
    "planet.hint.zoom": "Pinch to zoom",
    // the planet page's three figures: a label under a number
    "planet.page.way": "On the way",
    "planet.page.carried": "Carried",
    "planet.page.desks": "On desks",
    // VoiceOver: a look on her shelf, the two tiles under her card, the page's two zoom keys
    "planet.a11y.wear": "Puts it on her",
    "planet.a11y.takeOff": "Takes it off",
    "planet.a11y.opensAlbum": "Opens your stamp album",
    "planet.a11y.opensAura": "Opens your writing aura",
    "planet.a11y.zoomIn": "Zoom in",
    "planet.a11y.zoomOut": "Zoom out",
  },
  /* ── es · Español ── */
  {
    "planet.hint.spin": "Gira con un dedo",
    "planet.hint.zoom": "Haz zoom con dos",
    "planet.page.way": "En camino",
    "planet.page.carried": "Llevadas",
    "planet.page.desks": "Escritorios",
    "planet.a11y.wear": "Se pone este look",
    "planet.a11y.takeOff": "Se quita este look",
    "planet.a11y.opensAlbum": "Abre tu álbum de sellos",
    "planet.a11y.opensAura": "Abre tu aura escritora",
    "planet.a11y.zoomIn": "Acercar",
    "planet.a11y.zoomOut": "Alejar",
  },
  /* ── pt · Português (pt-BR) ── */
  {
    "planet.hint.spin": "Gire com um dedo",
    "planet.hint.zoom": "Dê zoom com dois",
    "planet.page.way": "A caminho",
    "planet.page.carried": "Levadas",
    "planet.page.desks": "Nas mesas",
    "planet.a11y.wear": "Veste este look nela",
    "planet.a11y.takeOff": "Tira este look dela",
    "planet.a11y.opensAlbum": "Abre seu álbum de selos",
    "planet.a11y.opensAura": "Abre sua aura de escrita",
    "planet.a11y.zoomIn": "Mais zoom",
    "planet.a11y.zoomOut": "Menos zoom",
  },
  /* ── id · Bahasa Indonesia ── */
  {
    "planet.hint.spin": "Seret buat putar",
    "planet.hint.zoom": "Cubit buat zoom",
    "planet.page.way": "Di jalan",
    "planet.page.carried": "Dibawa",
    "planet.page.desks": "Meja orang",
    "planet.a11y.wear": "Memakaikan ini padanya",
    "planet.a11y.takeOff": "Melepas ini darinya",
    "planet.a11y.opensAlbum": "Membuka album perangkomu",
    "planet.a11y.opensAura": "Membuka aura tulisanmu",
    "planet.a11y.zoomIn": "Perbesar",
    "planet.a11y.zoomOut": "Perkecil",
  },
  /* ── fr · Français ── */
  {
    "planet.hint.spin": "Glisse et tourne",
    "planet.hint.zoom": "Pince et zoome",
    "planet.page.way": "En route",
    "planet.page.carried": "Portées",
    "planet.page.desks": "Bureaux",
    "planet.a11y.wear": "Met cette tenue à ta messagère",
    "planet.a11y.takeOff": "Enlève cette tenue à ta messagère",
    "planet.a11y.opensAlbum": "Ouvre ton album de timbres",
    "planet.a11y.opensAura": "Ouvre ton aura de plume",
    "planet.a11y.zoomIn": "Zoom avant",
    "planet.a11y.zoomOut": "Zoom arrière",
  },
  /* ── de · Deutsch ── */
  {
    "planet.hint.spin": "1 Finger dreht",
    "planet.hint.zoom": "2 Finger zoomen",
    "planet.page.way": "Unterwegs",
    "planet.page.carried": "Getragen",
    "planet.page.desks": "Auf Tischen",
    "planet.a11y.wear": "Zieht es ihr an",
    "planet.a11y.takeOff": "Zieht es ihr wieder aus",
    "planet.a11y.opensAlbum": "Öffnet dein Markenalbum",
    "planet.a11y.opensAura": "Öffnet deine Schreib-Aura",
    "planet.a11y.zoomIn": "Einzoomen",
    "planet.a11y.zoomOut": "Auszoomen",
  },
  /* ── it · Italiano ── */
  {
    "planet.hint.spin": "Trascina e gira",
    "planet.hint.zoom": "Pizzica e zooma",
    "planet.page.way": "In viaggio",
    "planet.page.carried": "Portate",
    "planet.page.desks": "Scrivanie",
    "planet.a11y.wear": "Le fa indossare questo look",
    "planet.a11y.takeOff": "Le toglie questo look",
    "planet.a11y.opensAlbum": "Apre il tuo album di francobolli",
    "planet.a11y.opensAura": "Apre la tua aura di penna",
    "planet.a11y.zoomIn": "Ingrandisci",
    "planet.a11y.zoomOut": "Riduci",
  },
  /* ── ja · 日本語 ── */
  {
    "planet.hint.spin": "ドラッグで回転",
    "planet.hint.zoom": "ピンチで拡大",
    "planet.page.way": "旅の途中",
    "planet.page.carried": "運んだ手紙",
    "planet.page.desks": "届いた机",
    "planet.a11y.wear": "これを着せます",
    "planet.a11y.takeOff": "これを外します",
    "planet.a11y.opensAlbum": "切手アルバムを開きます",
    "planet.a11y.opensAura": "ことばの似顔絵を開きます",
    "planet.a11y.zoomIn": "拡大",
    "planet.a11y.zoomOut": "縮小",
  },
  /* ── ko · 한국어 ── */
  {
    "planet.hint.spin": "드래그로 회전",
    "planet.hint.zoom": "핀치로 확대",
    "planet.page.way": "배달 중",
    "planet.page.carried": "배달한 편지",
    "planet.page.desks": "닿은 책상",
    "planet.a11y.wear": "이 스타일을 입혀요",
    "planet.a11y.takeOff": "이 스타일을 벗겨요",
    "planet.a11y.opensAlbum": "내 우표 앨범을 열어요",
    "planet.a11y.opensAura": "내 글결을 열어요",
    "planet.a11y.zoomIn": "확대",
    "planet.a11y.zoomOut": "축소",
  },
);
