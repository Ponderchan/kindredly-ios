#!/bin/sh
# render.sh, without compiling the portable layer every time (seconds instead of minutes).
#   design/courier-planet/checks/render-fast.sh <harness.swift> <out.png>
# The portable layer is built once as a testable library, KPortable, and kept in a cache folder;
# it is rebuilt (about two minutes) only when a Portable file is newer than it. The harness has
# to say, under its imports:
#   #if canImport(KPortable)
#   @testable import KPortable
#   #endif
# so the same file still works with render.sh, which compiles everything together.
set -e
HARNESS="$1"; OUT="$2"
[ -n "$HARNESS" ] && [ -n "$OUT" ] || { echo "usage: $0 <harness.swift> <out.png>"; exit 2; }
ROOT="$(cd "$(dirname "$0")/../../.." && pwd)"
CACHE="${KPORTABLE_CACHE:-${TMPDIR:-/tmp}/kindredly-kportable}"
mkdir -p "$CACHE"
SDK="$(xcrun --sdk macosx --show-sdk-path)"
FLAGS="-Onone -target arm64-apple-ios18.0-macabi -sdk $SDK -Fsystem $SDK/System/iOSSupport/System/Library/Frameworks -L $SDK/System/iOSSupport/usr/lib/swift -I $SDK/System/iOSSupport/usr/lib/swift"
LIB="$CACHE/libKPortable.dylib"
if [ ! -f "$LIB" ] || [ -n "$(find "$ROOT/modules/kindredly-ui/ios/Portable" -name '*.swift' -newer "$LIB" | head -1)" ]; then
  echo "building KPortable (about two minutes)…"
  xcrun swiftc $FLAGS -parse-as-library -enable-testing -emit-module -emit-library -module-name KPortable \
    -emit-module-path "$CACHE/KPortable.swiftmodule" \
    $(find "$ROOT/modules/kindredly-ui/ios/Portable" -name '*.swift') -o "$LIB"
fi
BIN="$(mktemp -d)/shot"
xcrun swiftc $FLAGS -parse-as-library -I "$CACHE" -L "$CACHE" -lKPortable "$HARNESS" -o "$BIN"
DYLD_LIBRARY_PATH="$CACHE" "$BIN" "$OUT"
