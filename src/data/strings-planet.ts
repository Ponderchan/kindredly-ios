import { strings } from "../lib/i18n";

/* THE COURIER'S PLANET — THE WORDS (docs/courier-planet.md; owner sign-off 2026-11-11).
   ────────────────────────────────────────────────────────────────────────
   Her card on Me (the small whole planet, her words, four looks) and, later, the planet page.
   Most of what the card says is already the app's: her diary lines (fl.*), Open and Play, DAY
   OFF, All looks →, Track (wren.trackShort), the looks' own names (ws.acc.*, skin.*.name).
   These are only what is new:

     cp.hint.spin        on the scene until the planet is first turned (mono caps, drawn upper-cased)
     cp.hint.zoom        beside it on the planet page ("DRAG TO SPIN · PINCH TO ZOOM")
     cp.page.*           the planet page's three figures (mono caps under a number, so short:
                         what she is out with now · every letter she has carried · the strangers
                         who have had one on their desk)
     cp.a11y.*           VoiceOver's hints for a look and for the two tiles under the card, and
                         its names for the page's two zoom keys

   ENGLISH ONLY FOR NOW: the other eight languages are written natively in the phase that
   ships this (docs/courier-planet.md, phase 6), with the plain "on the way" lines the owner
   approved. Until then every language falls back to these (lib/i18n strings()), and the
   switch that shows the planet ("meplanet") is off.
   Consumers import this file for its side effect. */

const EN = {
  "cp.hint.spin": "Drag to spin",
  "cp.hint.zoom": "Pinch to zoom",
  "cp.page.way": "On the way",
  "cp.page.carried": "Carried",
  "cp.page.desks": "On desks",
  "cp.a11y.zoomIn": "Zoom in",
  "cp.a11y.zoomOut": "Zoom out",
  "cp.a11y.wear": "Puts it on her",
  "cp.a11y.takeOff": "Takes it off",
  "cp.a11y.opensAlbum": "Opens your stamp album",
  "cp.a11y.opensAura": "Opens your writing aura",
};

strings(EN, {}, {}, {});
