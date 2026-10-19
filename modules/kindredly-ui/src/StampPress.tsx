import { requireNativeView } from "expo";
import { forwardRef, type Ref } from "react";
import type { CommonViewModifierProps } from "@expo/ui/swift-ui";
import { createViewModifierEventListener } from "@expo/ui/swift-ui/modifiers";
import type { KInsets, KScreenBaseProps, KScreenHandle } from "./types";

/* THE STAMP PRESS CAMERA, drawn by SwiftUI (custom stamps, the owner's V1 live viewfinder;
   ios/Portable/Kit/KLab.swift KStampPressCamera, adapter ios/Adapters/KLabView.swift
   KStampPressView), for src/screens/stamp-press/StampPressNative.tsx. Swift runs the camera,
   the photo picker, the crop page and the press; it hands back one file: the window's part of
   the picture, 960 × 1200, upright, no EXIF. Every word comes in from TS.

   A whole screen: alone in one @expo/ui <Host style={{flex:1}}> (SurfaceHost), only after
   isKindredlyUIViewAvailable("KStampPressView") says so. Outside a Host it is a RedBox in dev
   and a CRASH in a release build. The page is a dark camera page in every theme. */

export type KStampPressStrings = {
  title: string;
  hint: string;
  upload: string;
  zoom: string;
  close: string;
  flashOn: string;
  flashOff: string;
  /** "{n}" is 1 or 2 */
  zoomA11y: string;
  shutter: string;
  viewfinder: string;
  choosePhoto: string;
  permission: string;
  allow: string;
  openSettings: string;
  instead: string;
  noCamera: string;
  cropHint: string;
  cropA11y: string;
  useThis: string;
  back: string;
  failed: string;
  pressed: string;
};

/** The pressed photo Swift wrote: a file:// JPEG in Caches/stamp-press/. */
export type KPressedPhoto = { uri: string; width: number; height: number; source: "camera" | "library" };

export type KStampPressViewProps = CommonViewModifierProps &
  KScreenBaseProps & {
    strings: KStampPressStrings;
    onClose?: () => void;
    onPressed?: (photo: KPressedPhoto) => void;
    /** the photo couldn't be written (never silent) */
    onError?: (message: string) => void;
  };

type Ev<T> = (e: { nativeEvent: T }) => void;
type None = Ev<Record<string, never>>;

type NativeKStampPressViewProps = Omit<KStampPressViewProps, "letterFont" | "insets" | "rev" | "onClose" | "onPressed" | "onError"> &
  Required<Pick<KStampPressViewProps, "letterFont" | "insets" | "rev">> & {
    ref?: Ref<KScreenHandle>;
    onSpClose?: None;
    onSpPressed?: Ev<KPressedPhoto>;
    onSpError?: Ev<{ message: string }>;
  };

const NO_INSETS: KInsets = { top: 0, bottom: 0, tabBarRoom: 0 };

// the view's JS name is the Swift struct's name (ios/Adapters/KLabView.swift)
const NativeKStampPressView = requireNativeView<NativeKStampPressViewProps>("KindredlyUI", "KStampPressView");

/** The bare SwiftUI page. Only inside an @expo/ui <Host>. */
export const KStampPressView = forwardRef<KScreenHandle, KStampPressViewProps>(function KStampPressView(
  { modifiers, letterFont, insets, rev, onClose, onPressed, onError, ...rest },
  ref,
) {
  return (
    <NativeKStampPressView
      ref={ref}
      modifiers={modifiers}
      {...(modifiers ? createViewModifierEventListener(modifiers) : undefined)}
      {...rest}
      letterFont={letterFont ?? "newsreader"}
      insets={insets ?? NO_INSETS}
      rev={rev ?? 0}
      onSpClose={onClose ? () => onClose() : undefined}
      onSpPressed={onPressed ? (e) => onPressed(e.nativeEvent) : undefined}
      onSpError={onError ? (e) => onError(e.nativeEvent.message) : undefined}
    />
  );
});
