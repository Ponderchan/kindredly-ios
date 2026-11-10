import { strings } from "../lib/i18n";

/* OWNER'S AUDIT, 2026-11-10 — THE KINDREDS TAB'S SEARCH (slice "kindreds").
   ────────────────────────────────────────────────────────────────────────
   The owner walked the tab and found no way to find one correspondent in a
   long list. A magnifier chip now sits after the orbit chip; tapped, the
   chip row becomes a search field and the list narrows as the reader types
   (the rule is kindreds-model's searchKey / searchFields).

   ENGLISH FIRST (the other eight blocks below were written natively on 2026-11-10; this note is how the file began): t() falls back to English, and native writers add
   the other eight blocks after this lands (write them AS the language, as
   every other strings file here was; the comments say where each line sits).

   Imported for its side effect by kindreds-model (the only place these
   keys are read), so both renderers and the dev page get them.

   Reused, no new copy: ml.cancel ("Cancel", the word beside the field) and
   id2.sheet.clear ("Clear", VoiceOver's name for the field's × key). */

strings(
  /* ── en · English ── */
  {
    // VoiceOver's name for the icon-only magnifier chip in the chip row, and for the search field itself; one word
    "kd.search": "Search",
    // the search field's placeholder, system 17 in a field about 230pt wide beside "Cancel": it must fit on one
    // line (at most ~22 characters), sentence case, no full stop. It says what the search reads: a correspondent's
    // name (the courier-given name or the name they signed) or the last line of the correspondence
    "kd.search.ph": "Name or last line",
    // the one quiet line under the field when nothing matches (system 13, mute, where "Not connected." sits);
    // short, plain, no exclamation mark
    "kd.search.none": "Nobody here by that name or line.",
  },
  /* ── es · Español (written natively, then a blind native edit, 2026-11-10) ── */
  {
    "kd.search": "Buscar",
    "kd.search.ph": "Nombre o última línea",
    "kd.search.none": "Nadie por aquí con ese nombre ni esa línea.",
  },
  /* ── pt · Português (Brasil) (written natively, then a blind native edit, 2026-11-10) ── */
  {
    "kd.search": "Buscar",
    "kd.search.ph": "Nome ou última linha",
    "kd.search.none": "Ninguém por aqui com esse nome ou essa linha.",
  },
  /* ── id · Bahasa Indonesia (written natively, then a blind native edit, 2026-11-10) ── */
  {
    "kd.search": "Cari",
    "kd.search.ph": "Nama atau baris akhir",
    "kd.search.none": "Tak ada nama atau baris seperti itu di sini.",
  },
  /* ── fr · Français (written natively, then a blind native edit, 2026-11-10) ── */
  {
    "kd.search": "Rechercher",
    "kd.search.ph": "Nom ou dernière ligne",
    "kd.search.none": "Personne ici avec ce nom ou cette ligne.",
  },
  /* ── de · Deutsch (written natively, then a blind native edit, 2026-11-10) ── */
  {
    "kd.search": "Suchen",
    "kd.search.ph": "Name oder letzte Zeile",
    "kd.search.none": "Dazu passt hier kein Name und keine Zeile.",
  },
  /* ── it · Italiano (written natively, then a blind native edit, 2026-11-10) ── */
  {
    "kd.search": "Cerca",
    "kd.search.ph": "Nome o ultima riga",
    "kd.search.none": "Qui non c'è nessuno con quel nome o quella riga.",
  },
  /* ── ja · 日本語 (written natively, then a blind native edit, 2026-11-10) ── */
  {
    "kd.search": "検索",
    "kd.search.ph": "名前か最後の一行",
    "kd.search.none": "その名前も、その一行も、ここにはありません。",
  },
  /* ── ko · 한국어 (written natively, then a blind native edit, 2026-11-10) ── */
  {
    "kd.search": "검색",
    "kd.search.ph": "이름이나 마지막 한 줄",
    "kd.search.none": "그런 이름도, 그런 한 줄도 여기엔 없어요.",
  },
);
