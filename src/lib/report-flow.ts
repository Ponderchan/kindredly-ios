import { useCallback, useMemo, useRef, useState } from "react";
import { blockUser, forgetThread, reportContent } from "./db";

/* REPORT AND BLOCK, WITHOUT ITS BUTTON (10a step 5).
   ────────────────────────────────────────────────────────────────────────
   Report / block is an App Store requirement for anonymous writing, and
   the owner's rule: always reachable. It used to live inside the ⋯ of
   components/ReportMenu, so only that ⋯ could start it. The Swift screens
   start it from their own controls — a SwiftUI menu on a Today card, a
   long-press menu on a Kindreds row or a chat line — so the flow is here,
   headless, and the React Native card and block sheet that show its
   stages are components/ReportMenu's ReportSheet:

     const flow = useReportFlow({ context: "letter", targetUser, refId, snapshot,
                                  onBlocked: () => onBlockedAuthor(targetUser) });
     …  onReport={() => blurThen(() => void flow.report())}
        onBlock={() => blurThen(() => flow.askBlock())}
     <ReportSheet flow={flow} />

   The rules are ReportMenu's, unchanged (owner 2026-09-20 and iOS safety
   gap 3, 2026-10-10): report is one tap and a one-line answer; block asks
   once, in one sentence, because it closes a road both ways; a failure
   says so and leaves you where you were, so you can try again. A block
   that held forgets the thread from the list cache; where to go next is
   the caller's (room, chat, reader and kindred page replace to Kindreds;
   Today drops that author's letters; Kindreds drops the row). */

/** What a report is about. "signature": a kindred's drawn pen name (identity Phase 2), refId = the
    thread — web 0035 fills the report itself from the stored strokes and points it at the other
    side of that thread, so no snapshot is sent. */
export type ReportContext = "letter" | "thread" | "message" | "signature";

/** What a report or a block is about. */
export type ReportTarget = {
  /** what is being reported: a desk letter, a whole correspondence, one line */
  context: ReportContext;
  /** the person; without one there is no one to report or block */
  targetUser?: string | null;
  /** the reported thing's id: the letter, the thread or the message (a
      photo line is reported by its path, as theirLatest carries one) */
  refId?: string | null;
  /** the thread forgotten from the list cache after a block. Defaults to
      refId when the context is "thread" or "signature". */
  threadId?: string | null;
  /** their words, kept with the report (the server keeps 1000 characters).
      A function is called when the report is sent — to fetch the freshest
      copy, as the Kindreds row does. */
  snapshot?: string | null | (() => string | null | undefined | Promise<string | null | undefined>);
};

/** null = nothing showing · menu = the three choices · block = the block
    question · sent / failed / blockFailed = the one-line answer */
export type ReportStage = null | "menu" | "block" | "sent" | "failed" | "blockFailed";

export type ReportFlow = {
  stage: ReportStage;
  /** a report or a block is on its way */
  busy: boolean;
  /** the default target has no one behind it (a correspondence whose other
      side is gone, or not loaded yet): offer no ⋯ at all */
  nobody: boolean;
  /** show the three choices (the React Native ⋯) */
  openMenu: () => void;
  /** Report now, one tap: the default target, or it overridden field by
      field (a Kindreds row, one chat line). Shows the answer and resolves
      true when the report reached the server. */
  report: (target?: Partial<ReportTarget>) => Promise<boolean>;
  /** ask the block question about the default target (or an override) */
  askBlock: (target?: Partial<ReportTarget>) => void;
  /** the block sheet's confirm: blocks whoever askBlock asked about.
      Resolves true when it held (then onBlocked has run). */
  block: () => Promise<boolean>;
  /** dismiss whatever is showing (ignored while busy) */
  close: () => void;
};

export type ReportFlowOptions = ReportTarget & {
  /** after a block held and the thread was forgotten: where to go now */
  onBlocked?: (blocked: ReportTarget) => void;
};

/** The report / block flow for one screen — see the comment above. Draw
    its stages with <ReportSheet flow={…} /> (components/ReportMenu). */
export function useReportFlow(options: ReportFlowOptions): ReportFlow {
  const [stage, setStage] = useState<ReportStage>(null);
  const [busy, setBusy] = useState(false);
  // the latest options and the block's subject, read when a press lands
  const opts = useRef(options);
  opts.current = options;
  const blocking = useRef<ReportTarget | null>(null);
  const busyRef = useRef(false);

  // the default target with any override laid over it, field by field
  const resolve = (o?: Partial<ReportTarget>): ReportTarget => {
    const { context, targetUser, refId, threadId, snapshot } = opts.current;
    return { context, targetUser, refId, threadId, snapshot, ...(o ?? {}) };
  };

  const openMenu = useCallback(() => setStage("menu"), []);
  const close = useCallback(() => {
    if (!busyRef.current) setStage(null);
  }, []);

  const report = useCallback(async (o?: Partial<ReportTarget>): Promise<boolean> => {
    if (busyRef.current) return false;
    const target = resolve(o);
    busyRef.current = true;
    setBusy(true);
    let ok = false;
    try {
      const snap = typeof target.snapshot === "function" ? await target.snapshot() : target.snapshot;
      ok = (await reportContent({ targetUser: target.targetUser, context: target.context, refId: target.refId, reason: "other", snapshot: snap })) === true;
    } catch (e) {
      console.warn("[report] the report didn't go:", e);
      ok = false;
    }
    busyRef.current = false;
    setBusy(false);
    setStage(ok ? "sent" : "failed");
    return ok;
  }, []);

  const askBlock = useCallback((o?: Partial<ReportTarget>) => {
    if (busyRef.current) return;
    blocking.current = resolve(o);
    setStage("block");
  }, []);

  const block = useCallback(async (): Promise<boolean> => {
    if (busyRef.current) return false;
    const target = blocking.current ?? resolve();
    busyRef.current = true;
    setBusy(true);
    let ok = false;
    try {
      ok = !!target.targetUser && (await blockUser(target.targetUser)) === true;
      if (ok) {
        const thread = target.threadId ?? (target.context === "thread" || target.context === "signature" ? target.refId : null);
        if (thread) await forgetThread(thread);
      }
    } catch (e) {
      console.warn("[report] the block didn't go:", e);
      ok = false;
    }
    busyRef.current = false;
    setBusy(false);
    if (!ok) {
      setStage("blockFailed");
      return false;
    }
    blocking.current = null;
    setStage(null);
    opts.current.onBlocked?.(target);
    return true;
  }, []);

  const nobody = (options.context === "thread" || options.context === "signature") && !options.targetUser;
  // the same object until something in it changes, so it can sit in deps
  return useMemo(() => ({ stage, busy, nobody, openMenu, report, askBlock, block, close }), [stage, busy, nobody, openMenu, report, askBlock, block, close]);
}
