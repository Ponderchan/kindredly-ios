import { useCallback, useMemo, useRef, useState, type ReactNode } from "react";
import { type AccessibilityActionEvent, type AccessibilityActionInfo, type View } from "react-native";
import { initialWindowMetrics } from "react-native-safe-area-context";
import { t } from "../lib/i18n";
import { useReportFlow, type ReportFlow, type ReportStage } from "../lib/report-flow";
import { ReportSheet } from "./ReportMenu";
import "../data/strings-identity2"; // id2.rp.signature

/* TOUCH AND HOLD A SIGNATURE: REPORT IT, OR BLOCK (identity Phase 2, plan §7 "Moderation").
   ────────────────────────────────────────────────────────────────────────
   A signature is drawn by one person for one other person, after at least
   ten letters, and that is exactly where the safety tools must still be
   in reach (Apple 1.2). Wherever one is shown — the ceremony's end state
   and the kindred page's THE NAME THEY SIGNED — a long press (450ms)
   drops the 10a menu card under it: Report this signature
   (id2.rp.signature) and Block this person (rp.menu.block). VoiceOver gets
   the same two as accessibilityActions on the element that says the
   signature, so nobody has to find a gesture.

   The flow is lib/report-flow with context "signature": refId is the
   thread, no snapshot — web 0035 fills the report from the stored strokes
   and points it at the other side of the thread, never trusting the phone.
   A block forgets the thread and runs onBlocked (the caller leaves for
   Kindreds). No one behind it (a gone account): no menu, no actions.

   DEMO THREADS (demo-*, dev only) never reach the server: the card opens
   and answers the same, and nothing is sent — so the dev pages can show the
   whole flow without filing a report about a thread that doesn't exist. */

export type SignatureHold = {
  /** someone can be reported: offer the long press and the actions */
  can: boolean;
  /** open the card under `anchor` (the view that was held) */
  open: (anchor?: View | null) => void;
  /** VoiceOver's two choices, or undefined when there is no one to report */
  actions: AccessibilityActionInfo[] | undefined;
  onAction: (e: AccessibilityActionEvent) => void;
  /** the card and the block sheet: render once, inside whatever modal holds the signature */
  sheet: ReactNode;
};

export function useSignatureHold({
  threadId,
  targetUser,
  onBlocked,
  inSheet = false,
}: {
  threadId?: string | null;
  targetUser?: string | null;
  onBlocked?: () => void;
  /** the signature sits in an iOS page sheet (the Introduction): its measurements start at the
      sheet's top, which hangs from the window's safe top, while the card's Modal starts at the window's */
  inSheet?: boolean;
}): SignatureHold {
  const demo = __DEV__ && (!threadId || threadId.startsWith("demo-"));
  const after = useRef(onBlocked);
  after.current = onBlocked;
  /* inside a sheet, a block's way out waits for the card's own Modal to finish going: closing the
     Introduction in the same tick as the card dismissed neither cleanly — UIKit ignored the page
     sheet's dismiss while the card's was running, and left an empty white sheet on screen. The
     card says when it has gone (onDismiss); a timer covers a Modal that never says. */
  const pending = useRef(false);
  const fire = useCallback(() => {
    if (!pending.current) return;
    pending.current = false;
    after.current?.();
  }, []);
  const blocked = useRef(() => {});
  blocked.current = () => {
    if (!inSheet) {
      after.current?.();
      return;
    }
    pending.current = true;
    setTimeout(fire, 800);
  };
  const real = useReportFlow({ context: "signature", targetUser: targetUser ?? null, refId: threadId ?? null, snapshot: null, onBlocked: () => blocked.current() });
  const pretend = useDemoFlow(!targetUser, blocked);
  const flow = demo ? pretend : real;
  const [top, setTop] = useState<number | undefined>(undefined);

  const open = useCallback(
    (anchor?: View | null) => {
      if (flow.nobody) return;
      if (!anchor) {
        setTop(undefined);
        flow.openMenu();
        return;
      }
      // just under what was held; ReportSheet measures the card and keeps it on screen (it grows with large type)
      anchor.measureInWindow((_x, y, _w, h) => {
        const lift = inSheet ? (initialWindowMetrics?.insets.top ?? 0) : 0;
        setTop(Number.isFinite(y) ? y + lift + h + 6 : undefined);
        flow.openMenu();
      });
    },
    [flow, inSheet],
  );

  const actions = useMemo<AccessibilityActionInfo[] | undefined>(
    () => (flow.nobody ? undefined : [{ name: "report", label: t("id2.rp.signature") }, { name: "block", label: t("rp.menu.block") }]),
    [flow.nobody],
  );
  const onAction = useCallback(
    (e: AccessibilityActionEvent) => {
      if (flow.nobody) return;
      setTop(undefined);
      if (e.nativeEvent.actionName === "report") void flow.report();
      else if (e.nativeEvent.actionName === "block") flow.askBlock();
    },
    [flow],
  );

  return { can: !flow.nobody, open, actions, onAction, sheet: <ReportSheet flow={flow} top={top} reportLabel={t("id2.rp.signature")} onDismiss={inSheet ? fire : undefined} /> };
}

/* the same card on a demo thread, with nothing sent: Report answers "reported", Block closes and
   runs onBlocked, as the real ones do once the server has said yes */
function useDemoFlow(nobody: boolean, after: { current: (() => void) | undefined }): ReportFlow {
  // `after` is the hook's blocked: inside a sheet it too waits for the card to go
  const [stage, setStage] = useState<ReportStage>(null);
  return useMemo<ReportFlow>(
    () => ({
      stage,
      busy: false,
      nobody,
      openMenu: () => setStage("menu"),
      report: async () => {
        console.log("[signature] demo thread: the report is not sent");
        setStage("sent");
        return true;
      },
      askBlock: () => setStage("block"),
      block: async () => {
        console.log("[signature] demo thread: the block is not sent");
        setStage(null);
        after.current?.();
        return true;
      },
      close: () => setStage(null),
    }),
    [stage, nobody, after],
  );
}
