import { requireNativeView } from "expo";
import { forwardRef, type ReactNode, type Ref } from "react";
import type { CommonViewModifierProps } from "@expo/ui/swift-ui";
import { createViewModifierEventListener } from "@expo/ui/swift-ui/modifiers";
import type { KInsets, KScreenBaseProps, KScreenHandle } from "./types";

/* STUB (step 5, batch 0a): a room with a kindred and a pen-pal chat (one view for both), drawn
   by SwiftUI (ios/Adapters/KConversationView.swift), for src/app/room/[id].tsx and
   src/app/chat/[id].tsx. The "chat" slice replaces this file wholesale with the real props and
   events, and keeps the export names KConversationView and KConversationViewProps: index.ts
   already exports them and KindredlyUIModule.swift already registers the view, so no screen
   slice edits either. Until then the Swift side draws a themed placeholder.

   It is a whole screen: put it alone in one @expo/ui <Host style={{flex:1}}> (never
   matchContents on a scroll axis), and only after
   isKindredlyUIViewAvailable("KConversationView") and the screen's NativeSurface switch say so.
   Outside a Host it is a RedBox in dev and a CRASH in a release build. Its ref is a
   KScreenHandle; talk to it through useKCommands (commands.ts). Islands go in as <KIsland>
   children (Slot.tsx). It will hold a KField, so give useKCommands(ref, { blurOnUnmount: true })
   the same ref. */

export type KConversationViewProps = CommonViewModifierProps &
  KScreenBaseProps & {
    /** <KIsland> / <KSlot> children, every one on every render (Slot.tsx) */
    children?: ReactNode;
  };

type NativeKConversationViewProps = Omit<KConversationViewProps, "letterFont" | "insets" | "rev"> &
  Required<Pick<KConversationViewProps, "letterFont" | "insets" | "rev">> & {
    ref?: Ref<KScreenHandle>;
  };

const NO_INSETS: KInsets = { top: 0, bottom: 0, tabBarRoom: 0 };

// the view's JS name is the Swift struct's name (ios/Adapters/KConversationView.swift)
const NativeKConversationView = requireNativeView<NativeKConversationViewProps>("KindredlyUI", "KConversationView");

/** The bare SwiftUI screen. Only inside an @expo/ui <Host>; its ref takes commands. */
export const KConversationView = forwardRef<KScreenHandle, KConversationViewProps>(function KConversationView(
  { modifiers, letterFont, insets, rev, ...rest },
  ref,
) {
  return (
    <NativeKConversationView
      ref={ref}
      modifiers={modifiers}
      // lets event modifiers (onTapGesture, onAppear…) reach this view, as @expo/ui's own views do
      {...(modifiers ? createViewModifierEventListener(modifiers) : undefined)}
      {...rest}
      // always sent, so Swift never sees a base prop go missing
      letterFont={letterFont ?? "newsreader"}
      insets={insets ?? NO_INSETS}
      rev={rev ?? 0}
    />
  );
});
