#!/bin/sh
# Render a SwiftUI check sheet on this Mac, without building the app.
#   design/courier-planet/checks/render.sh <harness.swift> <out.png>
# The harness is compiled with the whole portable layer for Mac Catalyst and run as a
# command-line tool; it writes the PNG whose path it is given. About two minutes.
set -e
HARNESS="$1"; OUT="$2"
[ -n "$HARNESS" ] && [ -n "$OUT" ] || { echo "usage: $0 <harness.swift> <out.png>"; exit 2; }
ROOT="$(cd "$(dirname "$0")/../../.." && pwd)"
SDK="$(xcrun --sdk macosx --show-sdk-path)"
BIN="$(mktemp -d)/shot"
xcrun swiftc -parse-as-library -Onone -target arm64-apple-ios18.0-macabi -sdk "$SDK" \
  -Fsystem "$SDK/System/iOSSupport/System/Library/Frameworks" \
  -L "$SDK/System/iOSSupport/usr/lib/swift" -I "$SDK/System/iOSSupport/usr/lib/swift" \
  $(find "$ROOT/modules/kindredly-ui/ios/Portable" -name '*.swift') "$HARNESS" -o "$BIN"
"$BIN" "$OUT"
