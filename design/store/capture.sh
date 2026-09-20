#!/bin/zsh
# Real screenshots for the store, one language at a time: cold start, store
# mode in that language, six screens. Output: design/store/shots/<lang>/0N.png
set -e
D=CEF88040-7823-4B58-8349-AEC30649EF03
APP=io.kindredly.app
OUT="$(dirname "$0")/shots"
for L in "$@"; do
  mkdir -p "$OUT/$L"
  xcrun simctl terminate $D $APP 2>/dev/null || true; sleep 1
  xcrun simctl launch $D $APP >/dev/null; sleep 10
  xcrun simctl openurl $D "kindredly:///dev-store?l=$L"; sleep 6
  xcrun simctl io $D screenshot "$OUT/$L/01.png" >/dev/null 2>&1
  xcrun simctl openurl $D "kindredly:///kindreds"; sleep 4
  xcrun simctl io $D screenshot "$OUT/$L/05.png" >/dev/null 2>&1
  xcrun simctl openurl $D "kindredly:///room/demo-mira"; sleep 4
  xcrun simctl io $D screenshot "$OUT/$L/03.png" >/dev/null 2>&1
  xcrun simctl openurl $D "kindredly:///room/wren?guide=kindreds"; sleep 5
  xcrun simctl io $D screenshot "$OUT/$L/04.png" >/dev/null 2>&1
  xcrun simctl openurl $D "kindredly:///compose?demo=1"; sleep 5
  xcrun simctl io $D screenshot "$OUT/$L/02.png" >/dev/null 2>&1
  xcrun simctl openurl $D "kindredly:///journal-entry?demo=1"; sleep 5
  xcrun simctl io $D screenshot "$OUT/$L/06.png" >/dev/null 2>&1
  xcrun simctl openurl $D "kindredly:///me"; sleep 4
  xcrun simctl io $D screenshot "$OUT/$L/08.png" >/dev/null 2>&1
  xcrun simctl openurl $D "kindredly:///aura"; sleep 5
  xcrun simctl io $D screenshot "$OUT/$L/07.png" >/dev/null 2>&1
  xcrun simctl openurl $D "kindredly:///courier"; sleep 5
  xcrun simctl io $D screenshot "$OUT/$L/09.png" >/dev/null 2>&1
  xcrun simctl openurl $D "kindredly:///journal"; sleep 5
  xcrun simctl io $D screenshot "$OUT/$L/10.png" >/dev/null 2>&1
  echo "captured $L"
done
