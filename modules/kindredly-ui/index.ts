/* Kindredly's own SwiftUI views for React Native (the 10a overhaul, iOS 1.3.0). iOS only; each
   view sits inside an @expo/ui <Host> (see src/InkCard.tsx). The app imports this folder by a
   relative path, e.g. "../../modules/kindredly-ui": tsconfig's @/ alias points at src/. */
export { isKindredlyUIAvailable } from "./src/available";
export {
  InkCardHost,
  KInkCard,
  type InkCardHostProps,
  type KInkCardProps,
  type KThemeKey,
} from "./src/InkCard";
export { KGalleryHost, type KGalleryHostProps } from "./src/Gallery";
