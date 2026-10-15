import { requireOptionalNativeModule } from "expo";

/* Whether this binary has the KindredlyUI native module at all. It is false on Android, on a
   dev client built before the module existed, and on any build whose pods were not reinstalled
   after the module was added. A screen checks this before it renders a KindredlyUI view and
   falls back to its React Native version when it is false; requireOptionalNativeModule returns
   null instead of throwing (expo-modules-core src/requireNativeModule.ts). */
export function isKindredlyUIAvailable(): boolean {
  return requireOptionalNativeModule("KindredlyUI") != null;
}
