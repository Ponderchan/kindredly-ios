#!/bin/sh
# Type-check the WHOLE KindredlyUI module on this Mac without building the app: the portable layer,
# the Expo adapters and the module file together, against the Expo interfaces a previous simulator
# build left in DerivedData (ExpoModulesCore.framework's swiftinterface, ExpoUI.swiftmodule).
#   design/courier-planet/checks/typecheck-module.sh
# About a minute. It compiles nothing to disk and touches nothing under ios/. It needs one earlier
# Debug simulator build of the app in Xcode's DerivedData (any build since the Expo SDK last
# changed); without one it says so. Exit status 0 = no errors.
#
# Why it is here: the adapters import ExpoModulesCore and ExpoUI, so the portable-only check
# (docs/courier-planet.md) cannot see them, and a mistake in one used to wait for a dev build.
set -e
ROOT="$(cd "$(dirname "$0")/../../.." && pwd)"
PRODUCTS="$(ls -d "$HOME"/Library/Developer/Xcode/DerivedData/Kindredly-*/Build/Products/Debug-iphonesimulator 2>/dev/null | head -1)"
[ -n "$PRODUCTS" ] && [ -d "$PRODUCTS/ExpoUI" ] && [ -d "$PRODUCTS/XCFrameworkIntermediates/ExpoModulesCore" ] || {
  echo "no Debug simulator build of the app in DerivedData: build the dev client once, then run this again"; exit 2; }
X="$PRODUCTS/XCFrameworkIntermediates"
cd "$ROOT/modules/kindredly-ui/ios"
OUT="$(mktemp)"
if xcrun -sdk iphonesimulator swiftc -typecheck -target arm64-apple-ios18.0-simulator -module-name KindredlyUI \
  -F "$X/ExpoModulesCore" -F "$X/ExpoModulesJSI" -F "$X/React-Core-prebuilt" -F "$X/ReactNativeDependencies" -F "$X/hermes-engine" \
  -I "$PRODUCTS/ExpoUI" -Xcc -fmodule-map-file="$PRODUCTS/ExpoUI/ExpoUI.modulemap" \
  -Xcc -I"$ROOT/ios/Pods/Headers/Public/ExpoUI" -Xcc -I"$ROOT/ios/Pods/Headers/Public" \
  $(find Portable Adapters -name '*.swift') $(ls *.swift) > "$OUT" 2>&1; then
  echo "the whole module type-checks (portable, adapters, module file)"
else
  grep -A4 "error:" "$OUT" | head -80
  echo "FAILED: $(grep -c 'error:' "$OUT") error line(s)"
  exit 1
fi
