// THE SCENE LIFE CYCLE (App Review, 2026-10-25: build 34 "crashed on launch").
// ─────────────────────────────────────────────────────────────────────────
// iOS 27 refuses to launch an app built with the iOS 27 SDK that has not adopted the
// UIScene life cycle: "UIScene life cycle is required for apps built with this SDK" →
// SIGTRAP before the first frame. Builds 32–33 were made with Xcode 26.6 and launched;
// build 34 was made after the Mac updated to Xcode 27 and died on every iOS 27 phone.
//
// Expo SDK 57 ships the scene delegate (expo/ios/AppDelegates/ExpoAppSceneDelegate.swift,
// Obj-C name EXExpoAppSceneDelegate) but its prebuild template still writes the old
// AppDelegate, and EAS regenerates ios/ on every build, so this plugin does the migration
// at prebuild time:
//   · Info.plist gains UIApplicationSceneManifest → one window scene whose delegate is
//     EXExpoAppSceneDelegate.
//   · AppDelegate conforms to ExpoReactNativeFactoryProvider and no longer makes its own
//     window: it still creates the React Native factory in didFinishLaunching, and the
//     scene delegate creates the window from the connecting scene and starts React Native
//     into it (cold-start URLs, user activities and quick actions included), forwarding
//     later URL / activity events back to this AppDelegate.
// Any template it doesn't recognise fails the prebuild loudly: a silent no-op would ship
// the crash again.
const { withAppDelegate, withInfoPlist } = require("expo/config-plugins");

const SCENE_DELEGATE = "EXExpoAppSceneDelegate";

function migrateAppDelegate(src) {
  let out = src;

  // 1 · the provider conformance the scene delegate looks for
  if (!/ExpoReactNativeFactoryProvider/.test(out)) {
    const decl = /class AppDelegate: ExpoAppDelegate\s*\{/;
    if (!decl.test(out)) throw new Error("[with-scene-lifecycle] AppDelegate declaration not found; update the plugin for this template");
    out = out.replace(decl, "class AppDelegate: ExpoAppDelegate, ExpoReactNativeFactoryProvider {");
  }

  // 2 · no window of its own: the scene delegate makes it and starts React Native into it
  const start = /#if os\(iOS\) \|\| os\(tvOS\)\s*\n\s*window = UIWindow\(frame: UIScreen\.main\.bounds\)\s*\n\s*factory\.startReactNative\(\s*\n?\s*withModuleName: "main",\s*\n?\s*in: window,\s*\n?\s*launchOptions: launchOptions\)\s*\n\s*#endif/;
  if (start.test(out)) {
    out = out.replace(
      start,
      "// the window and the React Native start belong to the scene (EXExpoAppSceneDelegate; plugins/with-scene-lifecycle.js)",
    );
  } else if (/window = UIWindow\(frame:/.test(out) || /factory\.startReactNative\(/.test(out)) {
    throw new Error("[with-scene-lifecycle] AppDelegate still starts React Native in a pattern this plugin doesn't know; update the plugin");
  }
  return out;
}

const withSceneLifecycle = (config) => {
  config = withInfoPlist(config, (c) => {
    c.modResults.UIApplicationSceneManifest = {
      UIApplicationSupportsMultipleScenes: false,
      UISceneConfigurations: {
        UIWindowSceneSessionRoleApplication: [
          { UISceneConfigurationName: "Default Configuration", UISceneDelegateClassName: SCENE_DELEGATE },
        ],
      },
    };
    return c;
  });
  config = withAppDelegate(config, (c) => {
    if (c.modResults.language !== "swift") throw new Error("[with-scene-lifecycle] expected a Swift AppDelegate");
    c.modResults.contents = migrateAppDelegate(c.modResults.contents);
    return c;
  });
  return config;
};

module.exports = withSceneLifecycle;
module.exports.migrateAppDelegate = migrateAppDelegate;
