// THE PREBUILT FRAMEWORKS SHIP WITHOUT THEIR LOCAL SYMBOLS (app size, 2026-11-13).
// ─────────────────────────────────────────────────────────────────────────
// React Native, Hermes and the precompiled Expo modules come as prebuilt dynamic frameworks
// (React.framework, hermesvm, ExpoModulesCore, libavif, SDWebImage…). They arrive with their
// full symbol tables and debug-map entries, and CocoaPods' "[CP] Embed Pods Frameworks" only
// thins architectures, so build 42 (1.2.8) carried 31.3 MB of frameworks of which 13.9 MB
// was symbol names nobody on a phone reads. A framework Xcode builds from source is stripped
// of exactly these (STRIP_STYLE = non-global, i.e. `strip -x`) when it's installed; this does
// the same for the prebuilt ones.
//
// How: one Run Script phase in the app target, Release only (the dev client keeps everything
// for the debugger). It runs before "[CP] Embed Pods Frameworks" and strips the copies that
// CocoaPods has made under PODS_XCFRAMEWORKS_BUILD_DIR (in DerivedData; node_modules and
// ios/Pods are never touched). The embed step then copies those into the app and signs them
// as it always does, so nothing is re-signed here.
//   · `strip -x` keeps every exported symbol: dyld, dlsym and the Objective-C and Swift
//     runtimes only ever look those up. Only dynamic libraries are touched; a static one is
//     still to be linked and is left alone.
//   · The UUIDs don't change, so the dSYMs the Expo frameworks ship still match crash reports.
//     React and Hermes come without dSYMs: a crash inside them names exported functions only.
//   · After stripping, the vendor's signature on the copy is no longer valid, so it is
//     removed; the embed step signs the framework with the app's identity, as before.
//
// Order: on a fresh prebuild (EAS) the phase is appended before `pod install` adds
// "[CP] Embed Pods Frameworks" after it. On a project that already has that phase (a local
// prebuild without --clean), the phase is inserted just before it. (After the embed step it
// would strip copies that no longer ship: harmless, but it would save nothing.) The build log
// prints each framework's size before and after; check it, and the built app, after any
// Expo or React Native upgrade.
const { withXcodeProject } = require("expo/config-plugins");

const PHASE_NAME = "[Kindredly] Strip framework symbols (Release)";
const EMBED_NAME = "[CP] Embed Pods Frameworks";

const SCRIPT = `# plugins/with-strip-framework-symbols.js
set -eu
if [ "\${CONFIGURATION}" != "Release" ]; then
  exit 0
fi
DIR="\${PODS_XCFRAMEWORKS_BUILD_DIR:-}"
if [ -z "\${DIR}" ] || [ ! -d "\${DIR}" ]; then
  echo "warning: [strip] no PODS_XCFRAMEWORKS_BUILD_DIR; nothing stripped"
  exit 0
fi
total_before=0
total_after=0
count=0
while IFS= read -r -d '' FW; do
  NAME="$(basename "\${FW}" .framework)"
  BIN="\${FW}/\${NAME}"
  [ -f "\${BIN}" ] || continue
  # dynamic libraries only: a static one is still to be linked
  if ! xcrun otool -hv "\${BIN}" 2>/dev/null | grep -q " DYLIB "; then
    continue
  fi
  BEFORE=$(stat -f %z "\${BIN}")
  if ! OUT=$(xcrun strip -x "\${BIN}" 2>&1); then
    echo "error: [strip] \${NAME}: \${OUT}"
    exit 1
  fi
  xcrun codesign --remove-signature "\${BIN}" 2>/dev/null || true
  AFTER=$(stat -f %z "\${BIN}")
  total_before=$((total_before + BEFORE))
  total_after=$((total_after + AFTER))
  count=$((count + 1))
  echo "[strip] \${NAME}: \${BEFORE} -> \${AFTER} bytes"
done < <(find "\${DIR}" -type d -name '*.framework' -prune -print0)
echo "[strip] \${count} frameworks: \${total_before} -> \${total_after} bytes"
`;

function withStripFrameworkSymbols(config) {
  return withXcodeProject(config, (c) => {
    const project = c.modResults;
    const targetUuid = project.findTargetKey(c.modRequest.projectName);
    if (!targetUuid) throw new Error(`[with-strip-framework-symbols] app target "${c.modRequest.projectName}" not found`);

    const phases = project.hash.project.objects.PBXShellScriptBuildPhase || {};
    const target = project.pbxNativeTargetSection()[targetUuid];
    const listed = target.buildPhases.map((p) => p.value);
    const nameOf = (uuid) => (phases[uuid] && phases[uuid].name ? String(phases[uuid].name).replace(/^"|"$/g, "") : null);

    // already there (a prebuild without --clean ran the plugin before): leave it as it is
    if (listed.some((uuid) => nameOf(uuid) === PHASE_NAME)) return c;

    const { uuid } = project.addBuildPhase([], "PBXShellScriptBuildPhase", PHASE_NAME, targetUuid, {
      shellPath: "/bin/bash",
      shellScript: SCRIPT,
    });
    // runs every Release build: it has no inputs or outputs to compare
    phases[uuid].alwaysOutOfDate = 1;

    // addBuildPhase appends; on a project that already embeds frameworks, go just before that
    const embedAt = target.buildPhases.findIndex((p) => nameOf(p.value) === EMBED_NAME);
    if (embedAt !== -1) {
      const at = target.buildPhases.findIndex((p) => p.value === uuid);
      const [entry] = target.buildPhases.splice(at, 1);
      target.buildPhases.splice(embedAt, 0, entry);
    }
    return c;
  });
}

module.exports = withStripFrameworkSymbols;
