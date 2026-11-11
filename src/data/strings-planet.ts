import { strings } from "../lib/i18n";

/* THE COURIER'S PLANET — THE WORDS (docs/courier-planet.md; owner sign-off 2026-11-11).
   ────────────────────────────────────────────────────────────────────────
   Her card on Me (the small whole planet, her words, four looks) and, later, the planet page.
   Most of what the card says is already the app's: her diary lines (fl.*), Open and Play, DAY
   OFF, All looks →, Track (wren.trackShort), the looks' own names (ws.acc.*, skin.*.name).
   These are only what is new:

     cp.hint.spin        on the scene until the planet is first turned (mono caps, drawn upper-cased)
     cp.a11y.*           VoiceOver's hints for a look and for the two tiles under the card

   ENGLISH ONLY FOR NOW: the other eight languages are written natively in the phase that
   ships this (docs/courier-planet.md, phase 6), with the plain "on the way" lines the owner
   approved. Until then every language falls back to these (lib/i18n strings()), and the
   switch that shows the planet ("meplanet") is off.
   Consumers import this file for its side effect. */

const EN = {
  "cp.hint.spin": "Drag to spin",
  "cp.a11y.wear": "Puts it on her",
  "cp.a11y.takeOff": "Takes it off",
  "cp.a11y.opensAlbum": "Opens your stamp album",
  "cp.a11y.opensAura": "Opens your writing aura",
};

strings(EN, {}, {}, {});
