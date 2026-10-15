import ExpoModulesCore
import ExpoUI

/*
 Kindredly's own SwiftUI views for the 10a overhaul (iOS 1.3.0), registered for React Native.
 Registration only: each view's Expo adapter is in Adapters/, and the views themselves are in
 Portable/, which imports SwiftUI alone so the 1.1.0 pure-Swift app can reuse them.

 Adding a .swift file to this module needs a pod install (or prebuild) before the next native
 build, or the build fails with "cannot find '…' in scope" (extending.md).
 */
public class KindredlyUIModule: Module {
  public func definition() -> ModuleDefinition {
    Name("KindredlyUI")

    ExpoUIView(KInkCardView.self)
    // the 10a tab bar and its composer sheet, one Host for both (src/components/NativeTabBar.tsx)
    ExpoUIView(KTabBarView.self)
    // dev only on the JS side (ui-lab): every Portable piece in one theme
    ExpoUIView(KGalleryView.self)
  }
}
