import { useCallback, useEffect, useRef, useState } from "react";
import { View } from "react-native";
import { usePathname, useRouter } from "expo-router";
import { isKindredlyUIViewAvailable } from "../../../modules/kindredly-ui";
import { swiftReadsFold, useFoldFrame } from "../../lib/fold";
import { useNativeSurface } from "../../lib/surfaces";
import { LettersNative, RoomNative } from "../../screens/chat/ConversationNative";
import { WrenRoomNative } from "../../screens/wren-room/WrenRoomNative";
import { useTheme } from "../../lib/theme";
import { t } from "../../lib/i18n";
import { NativeSurface } from "../../components/NativeSurface";
import { LeaveSheet } from "../../components/LeaveSheet";
import { PlushCelebration } from "../../components/PlushCelebration";
import { useKindredsModel } from "../../screens/kindreds/useKindredsModel";
import { KindredsNative } from "../../screens/kindreds/KindredsNative";
import { KindredsRN } from "../../screens/kindreds/KindredsRN";
import { KindredsEmpty } from "../../screens/kindreds/KindredsEmpty";
import "../../data/strings-step5-kindreds";

/* THE KINDREDS TAB (10a step 5). Kindreds as an orbit: you at the centre,
   correspondents circling in, drawn closer by the letters THEY send; at
   five letters each way names may be traded, and a kindred has landed.
   Under the orbit, the list is where you act: Wren first, then whatever is
   on you, then the newest; their-turn pen pals folded into one row; the
   rooms gone quiet; the accounts that closed.

   This route only chooses who draws it. The model (screens/kindreds:
   useKindredsModel over the pure kindreds-model) knows everything — the
   list, the order, the words, the menus, report and block — and both
   renderers draw exactly its view:
   - KindredsNative: SwiftUI, one Host for the whole screen (KKindredsView);
   - KindredsRN: the React Native screen, the remote switch's fallback.
   NativeSurface picks between them ("kindreds" in app_surfaces, the
   binary having the view, no JS error, no crash strikes) in live mode: a
   flip reaches a running app, but only while the tab isn't on show.

   Nobody yet (a real answer with no one in it — a new account, a guest
   with no session) is the React Native empty state, whoever would draw the
   list. The block question (the shared sheet, as a window-level Modal over
   the floating tab bar) and the Plush moment are React Native overlays
   above either. */
export default function KindredsTab() {
  const router = useRouter();
  const { t: tk } = useTheme();

  /* THE CONVERSATION OPENS ON THE RIGHT PAGE (iPhone Duo's inner screen; the canvas's "Kindreds 里
     回复 · 知己": "左页是名单，右页是这段对话"; owner, 2026-11-12: "逐个做吧"). On a phone a row
     pushes its conversation over everything, so answering three people is in, back, in, back.
     Open, the list keeps the left page (as on a phone: the orbit folded into its band, the eye
     still opens it) and the row's conversation is held here on the right page, its own header
     and composer in it; another row swaps it, its back closes it, and the tab bar never leaves.
     Only where every piece is the Swift one (the list, and the room, the letters or Wren's
     own room), on a binary that reads the fold; anything else pushes as before.
     Folding the phone with one open carries it on, full screen, on the outer one. */
  const frame = useFoldFrame();
  const listNative = useNativeSurface("kindreds");
  const roomNative = useNativeSurface("room");
  const chatNative = useNativeSurface("chat");
  const twoPages = !!frame.pages && listNative && swiftReadsFold() && isKindredlyUIViewAvailable("KConversationView");
  const wrenNative = useNativeSurface("wrenroom") && isKindredlyUIViewAvailable("KWrenRoomView");
  const [pane, setPane] = useState<{ id: string; revealed: boolean; wren?: boolean } | null>(null);
  const can = useRef({ twoPages, roomNative, chatNative, wrenNative });
  can.current = { twoPages, roomNative, chatNative, wrenNative };
  const model = useKindredsModel({
    openInPlace: (th) => {
      const c = can.current;
      if (!c.twoPages || !(th.wren ? c.wrenNative : th.revealed ? c.roomNative : c.chatNative)) return false;
      setPane(th);
      return true;
    },
  });
  const close = useCallback(() => setPane(null), []);
  /* FOLDED AND OPENED AGAIN. One page again (the phone was folded) with a conversation open: it
     goes on as its own screen, on the outer one. Opened again while that screen is still the
     one on top: it comes back here, beside the list, where it was (found walking the simulator:
     it stayed a column in the middle of the inner screen). Once the reader has left that screen
     themself, nothing is carried. */
  const pathname = usePathname();
  const carried = useRef<{ id: string; revealed: boolean; wren?: boolean } | null>(null);
  const hrefOf = (th: { id: string; revealed: boolean }) => (th.revealed ? `/room/${th.id}` : `/chat/${th.id}`);
  useEffect(() => {
    if (!twoPages && pane) {
      carried.current = pane;
      setPane(null);
      router.push(hrefOf(pane));
      return;
    }
    const was = carried.current;
    if (!was) return;
    if (pathname !== hrefOf(was)) {
      // they went somewhere else on the outer screen (and it is not the push still landing)
      if (pathname !== "/kindreds") carried.current = null;
      return;
    }
    if (twoPages) {
      carried.current = null;
      router.back();
      setPane(was);
    }
  }, [twoPages, pane, pathname, router]);
  const open = twoPages && frame.pages ? pane : null;

  return (
    <View style={{ flex: 1, backgroundColor: tk.bg }}>
      {model.empty ? (
        <KindredsEmpty onWrite={() => router.push("/compose")} />
      ) : (
        <View style={{ flex: 1, flexDirection: "row" }}>
          <View style={open && frame.pages ? { width: frame.pages.crease } : { flex: 1 }}>
            <NativeSurface
              surface="kindreds"
              view="KKindredsView"
              mode="live"
              native={() => <KindredsNative model={model} single={!!open} />}
              fallback={() => <KindredsRN model={model} />}
            />
          </View>
          {open ? (
            // keyed by the thread: another row is another conversation, never the last one's state
            <View key={open.id} style={{ flex: 1 }}>
              {open.wren ? (
                <WrenRoomNative onBack={close} paneWidth={frame.pages ? frame.pages.rightEnd - frame.pages.crease : undefined} />
              ) : open.revealed ? (
                <RoomNative id={open.id} onBack={close} />
              ) : (
                <LettersNative id={open.id} onBack={close} />
              )}
            </View>
          ) : null}
        </View>
      )}

      {/* block, asked once — the same sheet the ⋯ in a room raises */}
      <LeaveSheet
        modal
        open={!!model.blocking}
        title={t("rp.blockTitle")}
        body={t("rp.blockBody")}
        actions={[{ label: model.blockBusy ? "…" : t("rp.blockConfirm"), kind: "destructive", onPress: model.act.confirmBlock }]}
        cancelLabel={t("set.neverMind")}
        onCancel={model.act.cancelBlock}
      />

      <PlushCelebration kindreds={model.named} />
    </View>
  );
}
