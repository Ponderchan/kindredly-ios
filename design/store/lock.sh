#!/bin/zsh
# The island and the lock screen, per language. Foreground only: the
# keystrokes into Simulator.app do not land from a background job.
set -e
D=CEF88040-7823-4B58-8349-AEC30649EF03
APP=io.kindredly.app
OUT="$(dirname "$0")/shots"
key() { osascript -e "tell application \"System Events\" to keystroke \"$1\" using {$2}" >/dev/null 2>&1; }
for L in "$@"; do
  xcrun simctl terminate $D $APP 2>/dev/null || true; sleep 1
  xcrun simctl launch $D $APP >/dev/null; sleep 9
  xcrun simctl openurl $D "kindredly:///dev-store?l=$L"; sleep 5
  xcrun simctl openurl $D "kindredly:///activity-preview?run=1"; sleep 5
  osascript -e 'tell application "Simulator" to activate' >/dev/null 2>&1; sleep 0.6
  key h "command down, shift down"; sleep 2.5
  xcrun simctl io $D screenshot "$OUT/$L/11.png" >/dev/null 2>&1
  key l "command down"; sleep 2.5
  xcrun simctl io $D screenshot "$OUT/$L/12.png" >/dev/null 2>&1
  key h "command down, shift down"; sleep 1.5
  echo "locked $L"
done
