import { requireOptionalNativeModule } from "expo";

/* Whether this binary has the KindredlyUI native module at all. It is false on Android, on a
   dev client built before the module existed, and on any build whose pods were not reinstalled
   after the module was added. A screen checks this before it renders a KindredlyUI view and
   falls back to its React Native version when it is false; requireOptionalNativeModule returns
   null instead of throwing (expo-modules-core src/requireNativeModule.ts). */
export function isKindredlyUIAvailable(): boolean {
  return requireOptionalNativeModule("KindredlyUI") != null;
}

/* Whether this binary's KindredlyUI has one particular view. The module being there is not
   enough once views are added to it a step at a time: a dev client built after the module
   arrived but before, say, KTabBarView would have the module and not the view, and rendering a
   view the binary doesn't have is a red screen. This asks the same question requireNativeView
   asks before it draws: expo's own getViewConfig (expo-modules-core ios/Core/Modules/
   CoreModule.swift), which answers null for a view the module doesn't define.

   Asked once per view and remembered: a binary can't gain a view while it runs. */
type ExpoGlobal = { getViewConfig?: (moduleName: string, viewName?: string) => unknown };
const views = new Map<string, boolean>();

export function isKindredlyUIViewAvailable(viewName: string): boolean {
  const known = views.get(viewName);
  if (known !== undefined) return known;
  let there = false;
  if (isKindredlyUIAvailable()) {
    try {
      const expo = (globalThis as { expo?: ExpoGlobal }).expo;
      there = expo?.getViewConfig?.("KindredlyUI", viewName) != null;
    } catch (e) {
      console.log(`[kindredly-ui] could not ask for ${viewName}, using React Native:`, e);
    }
  }
  views.set(viewName, there);
  return there;
}

/* Whether one view of this binary takes one particular prop. Views grow: a page gains a prop that
   changes what it draws (KKindredsEmptyView's `slips`, 2026-11-12), and JavaScript, which travels
   over the air, reaches binaries from before it. A prop a view doesn't declare is dropped without
   a word, so the caller would believe it had drawn something it hadn't; this asks expo's
   getViewConfig, whose validAttributes are the props the Swift view declares. false for a view the
   binary doesn't have, on Android, and when the call fails.

   Asked once per view and prop and remembered: a binary can't gain a prop while it runs. */
const viewProps = new Map<string, boolean>();

export function kindredlyUIViewHasProp(viewName: string, prop: string): boolean {
  const key = viewName + "." + prop;
  const known = viewProps.get(key);
  if (known !== undefined) return known;
  let there = false;
  if (isKindredlyUIViewAvailable(viewName)) {
    try {
      const expo = (globalThis as { expo?: ExpoGlobal }).expo;
      const config = expo?.getViewConfig?.("KindredlyUI", viewName) as { validAttributes?: Record<string, unknown> } | null | undefined;
      there = config?.validAttributes?.[prop] != null;
    } catch (e) {
      console.log(`[kindredly-ui] could not ask whether ${viewName} takes ${prop}, assuming it doesn't:`, e);
    }
  }
  viewProps.set(key, there);
  return there;
}

/* Whether this binary's Swift has the DRAWING of one official stamp (owner's audit, 2026-11-10: the
   birthday stamp). The stamps are drawn from a table compiled into the binary (ios/Portable/Kit/
   KStampArtData.swift), so a stamp added after a binary shipped is, on that binary, an empty frame.
   JavaScript travels over the air and must not OFFER such a stamp in the tray there; it asks the
   module itself (hasStampArt in KindredlyUIModule.swift) instead of comparing version numbers.
   false on a binary from before the function existed, on Android, and when the call fails.

   Asked once per id and remembered: a binary can't gain a drawing while it runs. */
type StampArtNative = { hasStampArt?: (id: string) => boolean };
const stampArt = new Map<string, boolean>();

export function hasKindredlyStampArt(id: string): boolean {
  const known = stampArt.get(id);
  if (known !== undefined) return known;
  let there = false;
  try {
    const native = requireOptionalNativeModule<StampArtNative>("KindredlyUI");
    there = typeof native?.hasStampArt === "function" && native.hasStampArt(id) === true;
  } catch (e) {
    console.log(`[kindredly-ui] could not ask for the ${id} stamp's drawing, not offering it:`, e);
  }
  stampArt.set(id, there);
  return there;
}
