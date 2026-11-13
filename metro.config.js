// Learn more https://docs.expo.dev/guides/customizing-metro
const path = require("path");
const { getDefaultConfig } = require("expo/metro-config");

const config = getDefaultConfig(__dirname);

/* .claude/ holds agent worktrees, each a whole checkout with its own
   node_modules: left in, Metro crawls and watches every copy (and resolves
   duplicate modules from them) until it falls over. Nothing the app ships
   lives there. Only THIS project's .claude/ is blocked, so Metro started
   from inside a worktree (which lives under .claude/worktrees/) still sees
   its own files. */
const escape = (s) => s.replace(/[.*+?^${}()|[\]\\/]/g, "\\$&");
config.resolver.blockList = [...config.resolver.blockList, new RegExp("^" + escape(path.join(__dirname, ".claude")) + "[\\\\/].*")];

/* Started from a worktree (<repo>/.claude/worktrees/<name>), Metro's upward node_modules lookup
   also reaches the outer checkout's node_modules, and a native module bundled twice registers
   its view twice ("Tried to register two views with the same name"). Keep it to this tree's. */
const outer = __dirname.split(path.sep + ".claude" + path.sep + "worktrees" + path.sep)[0];
if (outer !== __dirname) {
  config.resolver.blockList = [...config.resolver.blockList, new RegExp("^" + escape(path.join(outer, "node_modules")) + "[\\\\/].*")];
}

/* react-native-purchases requires its browser mode (a bundled web SDK, 0.84 MB) at the top of
   purchases.js but only uses it in Expo Go, Rork or on the web. On iOS and Android that one
   require is answered with src/lib/revenuecat-browser-off.js; everything the native path uses
   is unchanged. */
const RC_BROWSER_OFF = path.join(__dirname, "src/lib/revenuecat-browser-off.js");
const RC_PURCHASES_JS = /[\\/]react-native-purchases[\\/]dist[\\/]purchases\.js$/;
const upstreamResolve = config.resolver.resolveRequest;
config.resolver.resolveRequest = (context, moduleName, platform) => {
  if (platform !== "web" && moduleName === "./browser/nativeModule" && RC_PURCHASES_JS.test(context.originModulePath)) {
    return { type: "sourceFile", filePath: RC_BROWSER_OFF };
  }
  return upstreamResolve ? upstreamResolve(context, moduleName, platform) : context.resolveRequest(context, moduleName, platform);
};

module.exports = config;
