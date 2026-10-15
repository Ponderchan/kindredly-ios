import { requireNativeView } from "expo";
import { forwardRef, type ReactNode, type Ref } from "react";
import type { CommonViewModifierProps } from "@expo/ui/swift-ui";
import { createViewModifierEventListener } from "@expo/ui/swift-ui/modifiers";
import type { KInsets, KScreenBaseProps, KScreenHandle } from "./types";

/* STUB (step 5, batch 0a): the Today tab: the desk, its cards and the reply dock, drawn by
   SwiftUI (ios/Adapters/KTodayView.swift), for src/app/(tabs)/letters.tsx. The "today" slice
   replaces this file wholesale with the real props and events, and keeps the export names
   KTodayView and KTodayViewProps: index.ts already exports them and KindredlyUIModule.swift
   already registers the view, so no screen slice edits either. Until then the Swift side draws a
   themed placeholder.

   It is a whole screen: put it alone in one @expo/ui <Host style={{flex:1}}> (never
   matchContents on a scroll axis), and only after isKindredlyUIViewAvailable("KTodayView") and
   the screen's NativeSurface switch say so. Outside a Host it is a RedBox in dev and a CRASH in
   a release build. Its ref is a KScreenHandle: give it `commands.ref` from useKCommands
   (commands.ts), which sends queued commands the moment the view attaches. Islands go in as
   <KIsland> children (Slot.tsx). It will hold a KField, so call
   useKCommands(ref, { blurOnUnmount: true, onViewAttach }) and reseed the open letter's reply
   draft in onViewAttach. */

export type KTodayViewProps = CommonViewModifierProps &
  KScreenBaseProps & {
    /** <KIsland> / <KSlot> children, every one on every render (Slot.tsx) */
    children?: ReactNode;
  };

type NativeKTodayViewProps = Omit<KTodayViewProps, "letterFont" | "insets" | "rev"> &
  Required<Pick<KTodayViewProps, "letterFont" | "insets" | "rev">> & {
    ref?: Ref<KScreenHandle>;
  };

const NO_INSETS: KInsets = { top: 0, bottom: 0, tabBarRoom: 0 };

// the view's JS name is the Swift struct's name (ios/Adapters/KTodayView.swift)
const NativeKTodayView = requireNativeView<NativeKTodayViewProps>("KindredlyUI", "KTodayView");

/** The bare SwiftUI screen. Only inside an @expo/ui <Host>; its ref takes commands. */
export const KTodayView = forwardRef<KScreenHandle, KTodayViewProps>(function KTodayView(
  { modifiers, letterFont, insets, rev, ...rest },
  ref,
) {
  return (
    <NativeKTodayView
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
