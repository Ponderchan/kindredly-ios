import { t } from "../../lib/i18n";
import { dShort } from "../../lib/format";
import { dimLabel } from "../../lib/aura-copy";
import { chipsFor, observationState, phaseHeadline, stickerCount, stickerLine, stickerLook, stickerName, titleDesc, titleName, usageGroupLabel, usageLine } from "../../lib/sticker-copy";
import { mosaicMask } from "../../lib/mosaic";
import type { AuraWords, TicketWords } from "./aura-model";
import "../../data/strings-a11y-sheets";
import "../../data/strings-step5-kitrn";
import "../../data/strings-step5-me";

/* The aura model's words (screens/aura/aura-model): the app's i18n, sticker and dimension copy,
   the reader's short date and the face's mask. Its own module so the model stays pure and
   node-tested, as the Me model's are (screens/me/me-format). Called on every render that builds
   a model, so a change of language reaches the next one. */

export function auraWords(): AuraWords {
  return {
    t,
    dimLabel,
    stickerName,
    stickerLine,
    stickerCount,
    observationState,
    usageGroupLabel,
    usageLine,
    stickerLook,
    dateShort: (iso) => dShort(iso),
  };
}

export function ticketWords(): TicketWords {
  return {
    ...auraWords(),
    titleName,
    titleDesc,
    phaseHeadline,
    chipsFor,
    mosaicMask: (seed, develop) => mosaicMask(seed, develop),
  };
}
