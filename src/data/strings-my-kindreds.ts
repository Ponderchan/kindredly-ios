import { strings } from "../lib/i18n";

/* MY KINDREDS, REDRAWN — THE ONE NEW LINE (owner, 2026-10-27: the page lists only kindreds).
   ────────────────────────────────────────────────────────────────────────
   Everything else the Swift page says was already there (mk.title, mk.lede, in.sinceChip,
   mm.you, kd.unreadA11y, auth.err.offline). One new line:
   - mk.empty: the page with no kindred on it yet, under Wren. What a kindred is (a pen pal you
     came to know) and how you get one (five letters each way, then you both sign), warm, and
     that they will gather here. Each language uses its own word for a kindred (mk.title) and a
     pen pal (mk.stranger), written in the language, not translated.
   One file, nine blocks (en es pt id fr de it ja ko — pt is pt-BR), every block with the same
   keys: src/data/strings-my-kindreds.test.ts checks they agree
   (node src/data/strings-my-kindreds.test.ts). Consumers import this file for its side effect. */
strings(
  /* ── en · English ── */
  {
    "mk.empty": "A kindred is a pen pal you’ve come to know: five letters each way, then you both sign your names. Yours will gather here.",
  },
  /* ── es · Español ── */
  {
    "mk.empty": "Un afín es un penpal al que llegaste a conocer de verdad: cinco cartas por cada lado y después firman los dos. Aquí se irán juntando los tuyos.",
  },
  /* ── pt · Português (Brasil) ── */
  {
    "mk.empty": "Uma alma afim é um penpal que você chegou a conhecer de verdade: cinco cartas de cada lado, e aí vocês dois assinam. As suas vão se juntar aqui.",
  },
  /* ── id · Bahasa Indonesia ── */
  {
    "mk.empty": "Kerabat adalah penpal yang benar-benar sudah kamu kenal: lima surat dari tiap sisi, lalu kalian berdua menandatangani nama. Kerabatmu akan berkumpul di sini.",
  },
  /* ── fr · Français ── */
  {
    "mk.empty": "Un semblable, c'est un correspondant que tu as vraiment appris à connaître : cinq lettres chacun, puis vous signez tous les deux. Les tiens se retrouveront ici.",
  },
  /* ── de · Deutsch ── */
  {
    "mk.empty": "Seelenverwandte sind Brieffreunde, die du wirklich kennengelernt hast: fünf Briefe auf jeder Seite, dann unterschreibt ihr beide. Deine sammeln sich hier.",
  },
  /* ── it · Italiano ── */
  {
    "mk.empty": "Un'anima affine è un amico di penna che hai imparato a conoscere davvero: cinque lettere a testa, poi firmate tutti e due. Le tue si raccoglieranno qui.",
  },
  /* ── ja · 日本語 ── */
  {
    "mk.empty": "心友とは、文通を重ねて本当に知り合えた相手のこと。お互いに5通ずつ書いて、ふたりとも名前をサインしたら心友です。あなたの心友はここに集まります。",
  },
  /* ── ko · 한국어 ── */
  {
    "mk.empty": "인연은 편지를 주고받으며 진짜로 알게 된 펜팔이에요. 서로 다섯 통씩 쓰고 둘 다 이름을 서명하면 인연이 돼요. 내 인연은 여기에 모여요.",
  },
);
